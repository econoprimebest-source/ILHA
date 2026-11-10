'use strict';
// nucleo-agencia.js — ITEM 4 do plano de execucao (Rafael, 11/10/2026).
// AGENCIA E CURADORIA: gera candidatos de foco a partir do que o proprio Icaro
// sabe que precisa, pontua por sinais separados e ESCOLHE 1 — acao INTERNA.
//
// Pesquisa: Voyager (curriculo automatico a partir do estado atual) para a
// geracao de candidatos; o resto e decisao de design (separar sinais, logar).
//
// Fontes de candidato (todas vivas no estado do Icaro):
//   contradicao  = tensoes abertas do self-model (Item 5)         utilidade 1.0
//   incerteza    = observacoes marcadas incertas (Item 5)          utilidade 0.7
//   pendente     = propostas pendentes / perguntas abertas         utilidade 0.55
//   experiencia  = experiencias recentes (revistar/aproveitar)     utilidade 0.45
//
// Sinais (0..1, separados ANTES de combinar):
//   utilidade  = quanto resolver isso importa
//   evidencia  = quanta evidencia ja existe para agir
//   custo      = custo interno estimado (baixo: e so escolher foco)
//   risco      = risco de acao EXTERNA (0 para foco interno; alto exigiria aval)
// total = +.40 util +.30 evid -.15 custo -.15 risco
// PISO: utilidade>=.40 E evidencia>=.20 — abaixo disso NAO e escolhido
// (o mecanismo nao "inventa" acao inutil).
//
// ACAO INTERNA != ACAO EXTERNA: aqui so se escolhe FOCO (gravado em
// agencia-foco.jsonl, arquivo proprio). Nada entra no prompt nem na conversa.
// Falar/escrever continua exigindo autorizacao. Orcamento: N candidatos/ciclo,
// 1 escolha/ciclo, limite de tempo. Desligavel: ICARO_AGENCIA=0.

const fs = require('fs');
const path = require('path');

const FOCO_PATH = process.env.ICARO_AGENCIA_PATH || path.join(__dirname, 'agencia-foco.jsonl');
const ORCAMENTO = { maxCandidatos: 8, maxEscolhasPorCiclo: 1, tempoLimiteMs: 2000 };
const PISO = { utilidade: 0.40, evidencia: 0.20 };
const PESOS = { utilidade: 0.40, evidencia: 0.30, custo: 0.15, risco: 0.15 };

// BUG 2 (15/10/2026, auditoria do Icaro): 162 ciclos escolhendo SEMPRE o
// mesmo foco, nCandidatos=2, descartados=0. Tres causas:
//   (1) 3 das 4 fontes estavam sem dados (tensoes=0, perguntas=0,
//       propostas=0, obs 'incerto'=0 — so experiencias geravam candidatos);
//   (2) "descartados" so contava o que ficava ABAIXO DO PISO (nunca
//       acontecia com candidatos saudaveis = "0 descartes" eterno);
//   (3) argmax estatico: scores nao mudavam com o tempo -> o mesmo vencia
//       pra sempre.
// Correcoes: FRESHOR — quem venceu nos ultimos N ciclos perde
// PENALIDADE_FRESCOR por vitoria recente (escolha alterna enquanto houver
// outro viavel; se e o unico viavel, vence mesmo — honestidade); DESCARTES
// EXPLICITOS com motivo (abaixo-do-piso / em-cooldown / perdeu); nPorFonte
// no log (visibilidade de fonte vazia). Janela via ICARO_AGENCIA_COOLDOWN
// (padrao 2 ciclos; 0 = comportamento antigo).
const COOLDOWN_PADRAO = 2;
const PENALIDADE_FRESCOR = 0.15;

function cooldownJanela() {
  const v = Number(process.env.ICARO_AGENCIA_COOLDOWN);
  return Number.isInteger(v) && v >= 0 ? v : COOLDOWN_PADRAO;
}

function candidato(id, tipo, texto, extra) {
  return Object.assign({
    id, tipo, texto: String(texto || '').slice(0, 200),
    utilidade: 0.5, evidencia: 0.3, custo: 0.2, risco: 0, acao: 'interna'
  }, extra || {});
}

function gerarCandidatos(fontes) {
  const f = fontes || {};
  const cands = [];
  for (const t of (f.tensoes || [])) {
    cands.push(candidato('tensao:' + t.id, 'contradicao', t.textoAfirmacao || t.texto,
      { utilidade: 1.0, evidencia: t.contraEpisodio ? 0.8 : 0.4, custo: 0.2, risco: 0 }));
  }
  for (const o of (f.incertezas || [])) {
    const eps = (o.episodios || []).length;
    cands.push(candidato('incerteza:' + o.id, 'incerteza', o.texto,
      { utilidade: 0.7, evidencia: Math.min(1, eps / 3), custo: 0.2, risco: 0 }));
  }
  for (const p of (f.pendentes || [])) {
    cands.push(candidato('pendente:' + (p.id || p.ref || p.frase || ''), 'pendente', p.frase || p.texto || p,
      { utilidade: 0.55, evidencia: 0.3, custo: 0.25, risco: 0.05 }));
  }
  for (const x of (f.experiencias || [])) {
    cands.push(candidato('exp:' + (x.id || x.quando || ''), 'experiencia', x.interpretacao || x.texto,
      { utilidade: 0.45, evidencia: (typeof x.confianca === 'number' ? x.confianca : 0.5), custo: 0.2, risco: 0 }));
  }
  return cands.slice(0, ORCAMENTO.maxCandidatos);
}

function pontuar(c) {
  const sinais = {
    utilidade: Number(c.utilidade) || 0,
    evidencia: Number(c.evidencia) || 0,
    custo: Number(c.custo) || 0,
    risco: Number(c.risco) || 0
  };
  const total = PESOS.utilidade * sinais.utilidade + PESOS.evidencia * sinais.evidencia
    - PESOS.custo * sinais.custo - PESOS.risco * sinais.risco;
  const viavel = sinais.utilidade >= PISO.utilidade && sinais.evidencia >= PISO.evidencia;
  const porque = ['utilidade ' + sinais.utilidade.toFixed(2), 'evidencia ' + sinais.evidencia.toFixed(2)];
  if (sinais.risco > 0) porque.push('risco ' + sinais.risco.toFixed(2));
  return { id: c.id, tipo: c.tipo, texto: c.texto, acao: 'interna', sinais, total, viavel, porque };
}

// Fontes vivas do estado do Icaro (self-model, memoria-v2, experiencias).
function coletarFontes() {
  const out = { tensoes: [], incertezas: [], pendentes: [], experiencias: [] };
  try {
    const SM = require('./nucleo-self-model');
    const est = SM.carregar();
    out.tensoes = (est.tensoes || []).filter(t => !t.resolucao);
    out.incertezas = (est.observacoes || []).filter(o => o.status === 'incerto');
    out.pendentes = out.pendentes.concat((est.perguntas_abertas || []).map(q =>
      ({ frase: typeof q === 'string' ? q : (q.texto || ''), ref: 'self-model' })));
  } catch (e) { /* sem self-model */ }
  try {
    const mv = require('./nucleo-memoria-v2').carregar();
    out.pendentes = out.pendentes.concat((mv.propostasPendentes || []).map(p => ({ frase: p.frase, ref: p.at })));
  } catch (e) { /* sem memoria */ }
  try {
    const EXP = require('./nucleo-experiencias');
    out.experiencias = EXP.listar().filter(x => x.status === 'ativa' || x.status === 'revisada').slice(-6);
  } catch (e) { /* sem experiencias */ }
  return out;
}

// Um ciclo: gera, pontua, escolhe 1 (acao interna), loga motivo. Orcamento fixo.
function ciclo(fontes, opts) {
  const o = opts || {};
  const t0 = Date.now();
  const brutos = gerarCandidatos(fontes);
  const pontuados = brutos.map(pontuar);
  // FRESHOR (BUG 2): quem venceu nos ultimos `janela` ciclos leva penalidade
  // -> a escolha passa a alternar enquanto existir outro candidato viavel.
  // opts.historico/opts.cooldown injetaveis (testes); default = ler arquivo.
  const janela = (o.cooldown !== undefined && o.cooldown !== null)
    ? Math.max(0, Number(o.cooldown) || 0)
    : cooldownJanela();
  let historico = Array.isArray(o.historico) ? o.historico : null;
  if (!historico && janela > 0) historico = lerFoco(janela);
  const venceuRecente = {};
  if (janela > 0 && Array.isArray(historico)) {
    for (const h of historico) { // vem do mais recente pro mais antigo
      if (h && h.escolhido && h.escolhido.id) {
        venceuRecente[h.escolhido.id] = (venceuRecente[h.escolhido.id] || 0) + 1;
      }
    }
  }
  const comEfetiva = pontuados.map(p => {
    const frescor = venceuRecente[p.id] || 0;
    return Object.assign({}, p, {
      frescor,
      totalEfetivo: Number((p.total - PENALIDADE_FRESCOR * frescor).toFixed(6))
    });
  });
  const viaveis = comEfetiva.filter(p => p.viavel)
    .sort((a, b) => (b.totalEfetivo - a.totalEfetivo) || String(a.id).localeCompare(String(b.id)));
  const escolha = viaveis.length ? viaveis[0] : null;
  // DESCARTES EXPLICITOS: todo candidato que NAO venceu sai com motivo —
  // acabou o "0 descartes" misterioso.
  const descartes = [];
  for (const p of comEfetiva) {
    if (!p.viavel) {
      descartes.push({
        id: p.id, tipo: p.tipo,
        motivo: 'abaixo-do-piso (utilidade ' + p.sinais.utilidade.toFixed(2) + '/' + PISO.utilidade +
          ' ou evidencia ' + p.sinais.evidencia.toFixed(2) + '/' + PISO.evidencia + ')'
      });
    } else if (escolha && p.id === escolha.id) {
      // o vencedor nao e descarte
    } else if (p.frescor > 0) {
      descartes.push({
        id: p.id, tipo: p.tipo,
        motivo: 'em-cooldown (venceu ha ' + p.frescor + ' ciclo(s); -' + PENALIDADE_FRESCOR.toFixed(2) + ' de frescor)'
      });
    } else {
      descartes.push({
        id: p.id, tipo: p.tipo,
        motivo: 'perdeu (total ' + p.total.toFixed(2) + ' -> ' + p.totalEfetivo.toFixed(2) +
          ' apos frescor; escolhido ' + (escolha ? escolha.totalEfetivo.toFixed(2) : 'nenhum') + ')'
      });
    }
  }
  // Visibilidade de fonte vazia (bug "so 2 candidatos"): quantos vieram de
  // cada fonte — tensoes/incertezas/pendentes vazias aparecem como 0.
  const nPorFonte = {};
  for (const p of pontuados) nPorFonte[p.tipo] = (nPorFonte[p.tipo] || 0) + 1;
  // baseline "recebe foco pronto": 1o da ordem de chegada
  const baseline = pontuados.length ? pontuados[0] : null;
  const ms = Date.now() - t0;
  const reg = {
    id: 'foco-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    quando: new Date().toISOString(),
    escolhido: escolha ? {
      id: escolha.id, tipo: escolha.tipo, texto: escolha.texto,
      total: Number(escolha.total.toFixed(3)),
      totalEfetivo: escolha.totalEfetivo,
      frescor: escolha.frescor,
      porque: escolha.porque
    } : null,
    motivo: escolha
      ? 'maior total ' + (escolha.frescor > 0
        ? '(com penalidade de frescor ' + escolha.frescor + 'x' + PENALIDADE_FRESCOR.toFixed(2) + ': ' + escolha.totalEfetivo.toFixed(2) + ')'
        : '(' + escolha.total.toFixed(2) + ')') + ': ' + escolha.porque.join('; ')
      : 'nada com valor minimo (utilidade>=' + PISO.utilidade + ', evidencia>=' + PISO.evidencia + ')',
    nCandidatos: pontuados.length,
    nPorFonte,
    descartados: descartes.length,
    descartes,
    acao: 'interna',
    ms
  };
  if (o.persistir !== false) {
    try { fs.appendFileSync(FOCO_PATH, JSON.stringify(reg) + '\n', 'utf8'); }
    catch (e) { console.log('[AGENCIA] erro gravar foco:', e.message); }
  }
  return {
    candidatos: pontuados.length, escolhido: escolha, baseline, descartados: descartes, descartes,
    reg, ms,
    dentroDoOrcamento: ms <= ORCAMENTO.tempoLimiteMs && pontuados.length <= ORCAMENTO.maxCandidatos
  };
}

function lerFoco(n) {
  if (!fs.existsSync(FOCO_PATH)) return [];
  const lim = Math.min(Number(n) || 20, 200);
  return fs.readFileSync(FOCO_PATH, 'utf8').split('\n').filter(Boolean).slice(-lim)
    .map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
    .filter(Boolean).reverse();
}

// ===== 3a FOCO NO PROMPT (Rafael, 14/10/2026) — camada OPCIONAL =====
// Rafael autorizou 3a (agencia no prompt) com calibracao por PARAMETRO:
//   ICARO_AGENCIA_MODO (0..3): 0=desligado (padrao, byte-identico)
//     1 = foco entra como pergunta SUAVE ("se quiser, considere...")
//     2 = foco entra como sugestao CLARA
//     3 = foco entra como DIRETRIZ (forte)
//   ICARO_AGENCIA_TROCA (N turnos): mantem o MESMO foco por N turnos e depois
//     troca (evita obsessao no mesmo tema = criterio de aceitabilidade "temas
//     variam"). 0/ausente = segue o ritmo do loop (30 min), sem troca forcada.
// ROLLBACK = tirar ICARO_AGENCIA_MODO (volta a 0). Toca ESCOLHA/expressao: os
// textos por modo sao aprovados por Rafael. Acao continua INTERNA (o foco vai
// ao prompt como contexto, nunca dispara acao externa).
const PROMPT_STATE = process.env.ICARO_AGENCIA_PROMPT_STATE || path.join(__dirname, 'agencia-prompt.json');

function nivelModo() {
  const v = Number(process.env.ICARO_AGENCIA_MODO);
  return (Number.isInteger(v) && v >= 1 && v <= 3) ? v : 0;
}

// Qual foco injetar neste turno. A JANELA de ICARO_AGENCIA_TROCA manda: o foco
// escolhido na ultima troca vale por N turnos (o loop pode gravar outros por
// cima — ignoramos ate a janela fechar; estabilidade = sem flicker). Na troca,
// prefere um foco DIFERENTE do que sai (variedade de temas, criterio do Rafael);
// se so existe um disponivel, fica com o mais recente. O texto e sempre resolvido
// na entrada mais fresca daquele id (estado guarda so o prazo, como fallback).
function focoParaPrompt(turno) {
  const modo = nivelModo();
  if (modo < 1) return { modo: 0, motivo: 'modo=0 (desligado)' };
  const lista = lerFoco(20); // mais recente primeiro
  const atual = lista[0] || null;
  if (!atual || !atual.escolhido) return { modo, foco: null, motivo: 'sem foco escolhido' };
  const legado = { modo, foco: null, motivo: 'foco so em entrada legada sem texto (espera ciclo do loop)' };
  const troca = Number(process.env.ICARO_AGENCIA_TROCA) || 0;
  const t = Number(turno) || 0;
  if (troca <= 0) {
    return (atual.escolhido && atual.escolhido.texto)
      ? { modo, foco: atual.escolhido, motivo: 'foco recente do loop (sem troca forcada)' }
      : legado;
  }
  let st = null;
  try { st = fs.existsSync(PROMPT_STATE) ? JSON.parse(fs.readFileSync(PROMPT_STATE, 'utf8')) : null; } catch (e) { st = null; }
  const desde = st ? Number(st.desdeTurno || 0) : -1;
  // Na janela e o MESMO foco da ultima troca (t < desde = contador reiniciou apos
  // restart -> janela expirada, troca logo).
  const naJanela = !!(st && st.focoId) && t >= desde && (t - desde) < troca;
  if (naJanela) {
    const e = lista.find(x => x.escolhido && x.escolhido.id === st.focoId);
    const foco = e ? e.escolhido : { id: st.focoId, tipo: st.tipo, texto: st.texto };
    if (!foco || !foco.texto) return legado;
    return { modo, foco, motivo: 'foco mantido (' + (t - desde) + '/' + troca + ' turnos)' };
  }
  // Troca: prefere entradas COM texto legivel (as pre-3a nao tinham campo texto);
  // dentre as legiveis, prefere uma DIFERENTE do que sai (variedade de temas).
  // Sem nada legivel: nao injeta e NAO gasta a janela — espera o proximo ciclo
  // do loop gravar foco com texto. Nunca manda id cryptico pro prompt.
  const comTexto = lista.filter(x => x.escolhido && x.escolhido.texto);
  if (!comTexto.length) return legado;
  const outro = st && st.focoId ? comTexto.find(x => x.escolhido.id !== st.focoId) : null;
  const escolhido = (outro || comTexto[0]).escolhido;
  try {
    fs.writeFileSync(PROMPT_STATE, JSON.stringify({ focoId: escolhido.id, tipo: escolhido.tipo, texto: escolhido.texto || '', desdeTurno: t }) + '\n', 'utf8');
  } catch (e) { /* nao derruba o turno */ }
  return { modo, foco: escolhido, motivo: 'novo foco (troca em ' + troca + ' turnos)' };
}

// Texto do bloco injetado no prompt (Rafael aprova as palavras por modo).
function blocoFoco(foco, modo) {
  const t = String((foco && foco.texto) || (foco && foco.id) || '').slice(0, 160);
  const tipo = (foco && foco.tipo) || 'foco';
  if (modo === 1) return 'SE QUISER, e so se fizer sentido: voce tem um foco interno aberto (' + tipo + '): "' + t + '". Se casar com esta conversa, voce pode tocar nele; se nao, ignore e responda a pergunta normalmente.';
  if (modo === 2) return 'SUGESTAO DE FOCO (' + tipo + '): "' + t + '". Quando der, vale puxar esse fio nesta conversa se ele ajudar a resposta.';
  return 'FOCO INTERNO — DIRETRIZ (' + tipo + '): "' + t + '". Trate este foco como prioridade nesta conversa, puxando-o quando for pertinente.';
}

module.exports = {
  FOCO_PATH, ORCAMENTO, PISO, PESOS,
  gerarCandidatos, pontuar, coletarFontes, ciclo, lerFoco,
  nivelModo, focoParaPrompt, blocoFoco
};

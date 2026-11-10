'use strict';
// nucleus-peso.js — ITEM 2 do plano de execucao (Rafael, 11/10/2026).
// PESO E SELECAO DE RELEVANCIA: sinais SEPARADOS antes de combinar, selecao
// com POUCOS itens por decisao, e log OBRIGATORIO do porque cada um entrou.
//
// Pesquisa de referencia (regra de nao construir 2x):
// - Generative Agents (Stanford 2023): score = recencia + relevancia + importancia.
//   Aqui viram: novidade (recencia), relevancia (tarefa), + consequencia e
//   confiabilidade (que eles nao tem) + recorrencia (corroboracao, com cap).
// - baseline JA EXISTENTE: nucleus-selecao-contextual.scoreFato (sobreposição
//   lexical) — REAPROVEITADO como sinal 'relevancia' e como linha de base do
//   comparativo. Nada e reconstruido.
// - Item 1 (proveniencia) fornece a confiabilidade da fonte (origem obrigatoria).
//
// Sinais (cada um 0..1, logados ANTES de combinar; nada se mistura escondido):
//   relevancia    = sobreposicao lexical com as sementes da pergunta (baseline)
//   confiabilidade= de onde veio: usuario/dono 1.0 > verificado 0.95 >
//                   dado_externo 0.9 > icaro 0.7 (x confianca se houver) >
//                   inferencia/modelo 0.55; status 'proposta' abate 0.15
//   consequencia  = participou de correcao observada (erros-contexto.json) ou
//                   experiencia cujo evento e correcao/falha — fato com
//                   consequencia vivida pesa mais que fato decorado
//   novidade      = decaimento exponencial por idade (meia-vida 14d, piso 0.35)
//   recorrencia   = corroboracao: quantos OUTROS itens dizem a mesma coisa
//                   (cap 3 -> 1.0). Repeticao do MESMO item nao conta (eco).
//
// COMBINACAO (fixa e explicita): total = .30*rel + .40*conf + .10*cons
//                                     + .10*nov + .10*rec
// (Item 1 e fundacao: o GATE de relevancia garante que o topico e o da
// pergunta; entre itens do mesmo topico, QUEM DISSE (origem) pesa mais do
// que quantas palavras casaram — e consequencia e covariavel de correcao
// (tanto a afirmacao certa quanto a errada "participaram"), por isso leve.)
// GATE: em pergunta especifica so entra quem tem relevancia >= limiar
// (senao o resto compensa e puxa fato irrelevante). Pergunta generica =
// paridade com o baseline (mesmo fatos, mesma ordem) — quem muda a decisao
// real so muda com ICARO_PESO=1.
//
// MODO SOMBRA: por padrao este modulo NAO decide nada em producao; o call-site
// roda comparar() e loga a divergencia. ICARO_PESO=1 troca a selecao real
// (rollback: tirar a var).

const fs = require('fs');
const path = require('path');
const SEL = require('./nucleo-selecao-contextual'); // baseline — reaproveitado

const MEIA_VIDA_MS = 14 * 24 * 3600 * 1000;
const PISO_NOVIDADE = 0.35;
const LIMIAR_RELEVANCIA = 0.15; // ~ "score >= 1" do baseline com 1 semente
// GATE-VAZIO (12/10/2026): quando o gate reprova TODOBODY, o fallback antigo
// era "joga todos os itens na disputa" — em producao isso significava os 39
// fatos competindo por 8 slots em ~24% dos turnos, contornando o gate por
// completo e tornando o ranking ruidoso. Agora: os TOP_N mais proximos por
// RELEVANCIA (nao por `total`, que inclui confiabilidade e puxaria fato
// confiavel porem irrelevante — exatamente o vicio que o gate evita), e so
// se houver alguma sobreposicao real (> PISO). Sem sobreposicao: nada.
const GATE_FALLBACK_TOP_N = 3;
const GATE_FALLBACK_PISO = 0.01;
const CAP_RECORRENCIA = 3;
const ERROS_PATH = process.env.ICARO_PESO_ERROS_PATH ||
  path.join(__dirname, 'erros-contexto.json');

const PESOS = { relevancia: 0.30, confiabilidade: 0.40, consequencia: 0.10, novidade: 0.10, recorrencia: 0.10 };

function semAcento(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ---- adaptadores: forma canonica interna ----
// { id, texto, chaves[], quando, origem, confianca?, tipoEvento? }
function adaptarFato(f) {
  if (!f) return null;
  const origemInformada = f.origem || f.dono;
  const origemNormalizada = origemInformada == null || String(origemInformada).trim() === ''
    ? 'nao_declarada'
    : (['modelo', 'extrator_llm'].includes(String(origemInformada).trim().toLowerCase())
      ? 'inferencia'
      : String(origemInformada).trim().toLowerCase());
  return {
    id: f.chave || [f.sujeito, f.predicado, f.objeto].filter(Boolean).join(' '),
    texto: [f.sujeito, f.predicado, f.objeto].filter(Boolean).join(' '),
    chaves: Array.isArray(f.chaves) ? f.chaves : [],
    quando: f.at || null,
    origem: origemNormalizada,
    confianca: typeof f.confianca === 'number' ? f.confianca : null,
    status: f.status || 'ativo'
  };
}

function adaptarExperiencia(x) {
  if (!x) return null;
  const tipo = (x.evento && x.evento.tipo) || '';
  const texto = String(x.interpretacao || '');
  return {
    id: x.id || String(x.quando || ''),
    texto,
    chaves: (tipo + ' ' + texto).split(/\s+/).filter(Boolean), // ARRAY de tokens
    quando: x.quando || null,
    origem: x.origem || 'decisao_icaro',
    confianca: typeof x.confianca === 'number' ? x.confianca : null,
    tipoEvento: tipo,
    status: x.status || 'ativa'
  };
}

// ---- sinais (0..1 cada, independentes) ----
function sinalRelevancia(item, sementes) {
  if (!sementes || !sementes.length) return 1; // generica: tudo "relevante"
  const raw = SEL.scoreFato({ chaves: item.chaves, sujeito: item.texto, predicado: '', objeto: '' }, sementes);
  const maxPossivel = 3 * sementes.length;
  return Math.min(1, raw / Math.max(1, maxPossivel * 0.5)); // 50% das sementes com match +3 = teto
}

function sinalConfiabilidade(item) {
  let base;
  switch (item.origem) {
    case 'usuario': case 'dono': base = 1.0; break;
    case 'verificado': base = 0.95; break;
    case 'dado_externo': base = 0.90; break;
    case 'icaro': case 'decisao_icaro': base = 0.70; break;
    default: base = 0.55; // inferencia / nao declarada
  }
  if (typeof item.confianca === 'number') {
    base = 0.65 * base + 0.35 * Math.max(0, Math.min(1, item.confianca));
  }
  if (item.status === 'proposta') base = Math.max(0, base - 0.15);
  return Math.max(0, Math.min(1, base));
}

function lerErros() {
  try {
    if (!fs.existsSync(ERROS_PATH)) return {};
    return JSON.parse(fs.readFileSync(ERROS_PATH, 'utf8')) || {};
  } catch (e) { return {}; }
}

function sinalConsequencia(item, erros) {
  if (erros == null) erros = lerErros(); // padrao: arquivo proprio de erros
  // Participou de correcao observada? (chave do fato entre os topicos corrigidos)
  const chaves = String(item.chaves || '').split(/[ ,]+/).filter(Boolean);
  const topicos = Object.keys(erros || {});
  let houve = false;
  for (const t of topicos) {
    const ta = semAcento(t);
    if (chaves.some(c => { const ca = semAcento(c); return ca && (ca.includes(ta) || ta.includes(ca)); })) houve = true;
  }
  // Experiencia cujo evento e correcao/falha: consequencia vivida direta.
  const evCorrecao = /\b(correcao|erro|falha|contradicao)\b/.test(semAcento(item.tipoEvento || ''));
  if (evCorrecao) return 1;
  if (houve) return 0.8;
  return 0.2; // todo fato tem alguma consequencia minima (foi vivido)
}

function sinalNovidade(item, agora) {
  if (!item.quando) return PISO_NOVIDADE;
  const t = Date.parse(String(item.quando).replace(' ', 'T'));
  if (!isFinite(t)) return PISO_NOVIDADE;
  const idade = Math.max(0, agora - t);
  return PISO_NOVIDADE + (1 - PISO_NOVIDADE) * Math.pow(0.5, idade / MEIA_VIDA_MS);
}

function sinalRecorrencia(item, itens) {
  // corroboracao: outros itens com chave em comum (o MESMO item nao conta — eco)
  const minhas = String(item.chaves || '').split(/[ ,]+/).filter(Boolean).map(semAcento);
  let n = 0;
  for (const o of itens) {
    if (o.id === item.id) continue;
    const outras = String(o.chaves || '').split(/[ ,]+/).filter(Boolean).map(semAcento);
    if (minhas.some(a => a && outras.some(b => b && (a.includes(b) || b.includes(a))))) n++;
  }
  return Math.min(1, n / CAP_RECORRENCIA);
}

function motivos(s) {
  const m = [];
  if (s.relevancia >= 0.5) m.push('relevancia alta (' + s.relevancia.toFixed(2) + ')');
  if (s.confiabilidade >= 0.9) m.push('fonte confiavel (' + s.confiabilidade.toFixed(2) + ')');
  else if (s.confiabilidade < 0.6) m.push('fonte fraca, ranqueada la embaixo (' + s.confiabilidade.toFixed(2) + ')');
  if (s.consequencia >= 0.8) m.push('participou de correcao observada');
  if (s.novidade > 0.7) m.push('recente');
  if (s.recorrencia > 0.3) m.push('corroborado por ' + Math.round(s.recorrencia * CAP_RECORRENCIA) + ' outro(s)');
  if (!m.length) m.push('entrou por soma dos sinais (' + s.total.toFixed(2) + ')');
  return m;
}

// Calcula peso de um item ja adaptado (exportado para teste unitario).
function pesoItem(item, sementes, todos, agora) {
  const sinais = {
    relevancia: sinalRelevancia(item, sementes),
    confiabilidade: sinalConfiabilidade(item),
    consequencia: sinalConsequencia(item, lerErros()),
    novidade: sinalNovidade(item, agora || Date.now()),
    recorrencia: sinalRecorrencia(item, todos || [item])
  };
  let total = 0;
  for (const k of Object.keys(PESOS)) total += PESOS[k] * sinais[k];
  const out = { id: item.id, sinais, total, porque: [] };
  out.porque = motivos({ ...sinais, total });
  return out;
}

function sementesDe(pergunta) {
  return String(pergunta || '').split(/\s+/)
    .filter(w => semAcento(w).length >= 3).slice(0, 5);
}

// SELECAO COMPLETA com log. opts: { maxEspecifica, maxGenerica, adaptar,
// retornarOriginais }
// (adaptar: 'fato' (padrao) | 'experiencia'; retornarOriginais: devolve os
// registros BRUTOS na ordem ranqueada — necessario para trocar a decisao
// real sem quebrar o downstream que le f.sujeito/fraseFato).
// Devolve: { itens[], log[{id, sinais, total, porque}], generica, baseline[] }
function selecionar(pergunta, brutos, opts) {
  const o = opts || {};
  const adaptar = o.adaptar === 'experiencia' ? adaptarExperiencia : adaptarFato;
  const brutosArr = Array.isArray(brutos) ? brutos : [];
  const todos = brutosArr.map(adaptar).filter(Boolean);
  const generica = SEL.ehGenerica(pergunta);
  const maxEspecifica = o.maxEspecifica || 6;  // POUCAS por decisao (espec. 6)
  const maxGenerica = o.maxGenerica || 15;
  const agora = Date.now();

  // baseline (reaproveitado) para o comparativo — em producao continua
  // alimentando o prompt ate ICARO_PESO=1
  const baseline = SEL.selecionar(pergunta, brutosArr, { maxGenerica, maxEspecifica });

  function fim(vencedores) {
    const itensAdapt = vencedores.map(x => x.item);
    const itens = o.retornarOriginais
      ? vencedores.map(x => brutosArr[x.idx]).filter(Boolean)
      : itensAdapt;
    return { itens, log: vencedores.map(x => x.p), generica, baseline };
  }

  if (generica) {
    const vencedores = todos.slice(0, maxGenerica).map((item, idx) => ({
      item, idx,
      p: pesoItem(item, [], todos, agora)
    }));
    return fim(vencedores);
  }

  const sementes = sementesDe(pergunta);
  const pontuados = todos.map((item, idx) => ({ item, idx, p: pesoItem(item, sementes, todos, agora) }));
  // GATE: relevancia minima para entrar na disputa (senao soma compensa)
  const candidatos = pontuados.filter(x => x.p.sinais.relevancia >= LIMIAR_RELEVANCIA);
  // GATE-VAZIO (12/10/2026): antes "sem match: tudo disputa por qualidade" —
  // jogava TODOS os itens na disputa, contornando o gate. Agora: top-N por
  // relevancia, com piso de sobreposicao real; sem sobreposicao, nada entra.
  const fonte = candidatos.length ? candidatos
    : pontuados
      .filter(x => x.p.sinais.relevancia > GATE_FALLBACK_PISO)
      .sort((a, b) => b.p.sinais.relevancia - a.p.sinais.relevancia)
      .slice(0, GATE_FALLBACK_TOP_N);
  fonte.sort((a, b) => b.p.total - a.p.total);
  return fim(fonte.slice(0, maxEspecifica));
}

// SOMBRA: o que o baseline escolheria vs o que o peso escolheria.
function comparar(pergunta, brutos, opts) {
  const r = selecionar(pergunta, brutos, opts);
  const idsBase = (r.baseline || []).map(f => (f.chave || [f.sujeito, f.predicado, f.objeto].filter(Boolean).join(' ')));
  const idsPeso = r.itens.map(i => i.id);
  const soPeso = idsPeso.filter(x => !idsBase.includes(x));
  const soBase = idsBase.filter(x => !idsPeso.includes(x));
  return { ...r, idsBase, idsPeso, divergencia: { soPeso, soBase, houveDivergencia: !!(soPeso.length || soBase.length) } };
}

module.exports = {
  PESOS, LIMIAR_RELEVANCIA, adaptarFato, adaptarExperiencia,
  GATE_FALLBACK_TOP_N, GATE_FALLBACK_PISO,
  sinalRelevancia, sinalConfiabilidade, sinalConsequencia, sinalNovidade, sinalRecorrencia,
  pesoItem, selecionar, comparar, sementesDe
};

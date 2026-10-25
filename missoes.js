'use strict';
// Sistema de Missões da Ilha Aurora (BIBLIA-DO-PROJETO-ICARO.md §2 e §6).
// Puro e determinístico: não chama LLM, não toca disco. O estado vive em
// `estado.missoes` e é avançado por `tick(estado, resultadoDaRodada)`.
const fs = require('fs');
const path = require('path');

const FILA = path.join(__dirname, 'missoes-fila.json');
const LIMITE_LOG = 50;

// acoes: ações do motor que contam como progresso. local: o ser precisa estar lá
// (localFinal) quando executar a ação. meta: progressos necessários.
const CATALOGO = {
  pescar_para_todos:   { titulo: 'Pescar para o grupo',      risco: 'baixo', acoes: ['pescar'],                         local: 'rio',       meta: 2, prazo: 25, recompensa: { satisfacao: 12, confianca: 6 },  penalidade: { frustracao: 8 } },
  buscar_lenha:        { titulo: 'Buscar lenha na floresta', risco: 'baixo', acoes: ['coletar_madeira'], local: 'floresta',  meta: 2, prazo: 25, recompensa: { satisfacao: 10, pertencimento: 6 }, penalidade: { frustracao: 8 } },
  explorar_cachoeira:  { titulo: 'Explorar a cachoeira',     risco: 'baixo', acoes: ['*'],                              local: 'cachoeira', meta: 1, prazo: 30, recompensa: { curiosidade: -20, satisfacao: 8 }, penalidade: { frustracao: 6 } },
  caverna_sombria:     { titulo: 'Caverna Sombria',          risco: 'alto',  acoes: ['*'],                              local: 'caverna',   meta: 2, prazo: 40, recompensa: { satisfacao: 30, confianca: 15, curiosidade: -30 }, penalidade: { saude: -30, medo: 40, confianca: -10 } },
};

function garantir(estado) {
  if (!estado.missoes || typeof estado.missoes !== 'object') estado.missoes = { seq: 0, ativas: [], concluidas: [], falhas: [], log: [] };
  const m = estado.missoes;
  for (const k of ['ativas', 'concluidas', 'falhas', 'log']) if (!Array.isArray(m[k])) m[k] = [];
  if (!Number.isInteger(m.seq)) m.seq = 0;
  return m;
}
const cicloDe = e => (e.mundo && e.mundo.tempo && e.mundo.tempo.ciclo) || 0;
const clamp = v => Math.max(0, Math.min(100, v));
function registrar(m, ciclo, tipo, inst, texto) {
  m.log.push({ ciclo, tipo, missaoId: inst.id, serId: inst.serId, texto });
  if (m.log.length > LIMITE_LOG) m.log.splice(0, m.log.length - LIMITE_LOG);
}
function aplicar(ser, efeitos) {
  for (const [k, v] of Object.entries(efeitos || {})) {
    if (typeof ser.necessidades[k] === 'number') ser.necessidades[k] = clamp(ser.necessidades[k] + v);
  }
}

function enviar(estado, serId, tipoId) {
  const m = garantir(estado), def = CATALOGO[tipoId], ser = estado.seres && estado.seres[serId];
  if (!def) throw new Error('Missão desconhecida: ' + tipoId);
  if (!ser) throw new Error('Ser desconhecido: ' + serId);
  if (ser.status === 'morto') throw new Error(ser.nome + ' está morto e não pode receber missões.');
  if (m.ativas.some(x => x.serId === serId)) throw new Error(ser.nome + ' já está em missão.');
  const ciclo = cicloDe(estado);
  const inst = { id: 'm' + (++m.seq), tipoId, serId, titulo: def.titulo, risco: def.risco, local: def.local, meta: def.meta, progresso: 0, inicio: ciclo, limite: ciclo + def.prazo };
  m.ativas.push(inst);
  registrar(m, ciclo, 'enviada', inst, `${ser.nome} partiu em missão: ${def.titulo}.`);
  return inst;
}

// `rodada.eventos[]`: { serId, decisao:{acao}, localFinal }
function tick(estado, rodada) {
  const m = garantir(estado), ciclo = (rodada && rodada.ciclo) || cicloDe(estado), saidas = [];
  for (const ev of (rodada && rodada.eventos) || []) {
    const inst = m.ativas.find(x => x.serId === ev.serId); if (!inst) continue;
    const def = CATALOGO[inst.tipoId], acao = ev.decisao && ev.decisao.acao;
    const noLocal = !def.local || ev.localFinal === def.local;
    if (noLocal && (def.acoes.includes('*') || def.acoes.includes(acao))) inst.progresso++;
  }
  for (const inst of [...m.ativas]) {
    const ser = estado.seres[inst.serId], def = CATALOGO[inst.tipoId];
    let fim = null;
    if (!ser || ser.status === 'morto') fim = 'falha';
    else if (inst.progresso >= inst.meta) fim = 'sucesso';
    else if (ciclo >= inst.limite) fim = 'falha';
    if (!fim) continue;
    m.ativas.splice(m.ativas.indexOf(inst), 1);
    const nome = ser ? ser.nome : inst.serId;
    if (fim === 'sucesso') {
      if (ser) aplicar(ser, def.recompensa);
      m.concluidas.push({ ...inst, fim: ciclo });
      registrar(m, ciclo, 'concluida', inst, `${nome} concluiu a missão: ${inst.titulo}!`);
    } else {
      if (ser && ser.status !== 'morto') aplicar(ser, def.penalidade);
      m.falhas.push({ ...inst, fim: ciclo });
      registrar(m, ciclo, 'falhou', inst, `${nome} falhou na missão: ${inst.titulo}.`);
    }
    saidas.push({ missaoId: inst.id, resultado: fim });
  }
  for (const k of ['concluidas', 'falhas']) if (m[k].length > LIMITE_LOG) m[k].splice(0, m[k].length - LIMITE_LOG);
  return saidas;
}

// Fila em disco (o visualizador enfileira; o loop aplica — evita corrida na gravação do estado).
function enfileirar(serId, tipoId, arq = FILA) {
  if (!CATALOGO[tipoId]) throw new Error('Missão desconhecida: ' + tipoId);
  let lista = [];
  try { lista = JSON.parse(fs.readFileSync(arq, 'utf8') || '[]'); } catch (e) { lista = []; }
  lista.push({ serId, tipoId });
  fs.writeFileSync(arq, JSON.stringify(lista), 'utf8');
}
function aplicarFila(estado, arq = FILA) {
  let lista;
  try { if (!fs.existsSync(arq)) return []; lista = JSON.parse(fs.readFileSync(arq, 'utf8').trim() || '[]'); fs.writeFileSync(arq, '[]', 'utf8'); } catch (e) { return []; }
  const ok = [];
  for (const p of Array.isArray(lista) ? lista : []) {
    try { ok.push(enviar(estado, p.serId, p.tipoId)); } catch (e) { console.error('[MISSOES] ignorada:', e.message); }
  }
  return ok;
}

module.exports = { CATALOGO, FILA, garantir, enviar, tick, enfileirar, aplicarFila };

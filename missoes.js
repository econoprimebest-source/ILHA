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
  // LETAL: a cada ciclo dentro da caverna o ser sofre dano (determinístico por ser+ciclo, reduzido por
  // resistência/força). Saúde <= 0 = morte (status 'morto'). Sobreviver concede o traço 'corajoso'.
  caverna_sombria:     { titulo: 'Caverna Sombria',          risco: 'alto',  acoes: ['*'],                              local: 'caverna',   meta: 2, prazo: 40, perigo: { min: 12, max: 38 }, recompensa: { satisfacao: 30, confianca: 15, curiosidade: -30 }, penalidade: { saude: -30, medo: 40, confianca: -10 } },
};
const QUASE_MORTE = 20;   // saúde <= isto, e vivo, conta como quase-morte (marco de peso máximo)

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

// ---- CORTEX: memória de peso máximo (marcos) ----
// Gravada em 4 lugares, para não se perder com a rotação normal de memória:
// cortex.marcos (nunca podado), cortex.memoria (texto), ser.memoria ({peso:1}) e, se a
// memória persistente estiver ativa, no chat do personagem. Nenhuma falha aqui derruba a rodada.
function marco(ser, ciclo, tipo, texto) {
  const c = (ser.cortex = ser.cortex || { id: ser.id, nome: ser.nome });
  if (!Array.isArray(c.marcos)) c.marcos = [];
  c.marcos.push({ ciclo, tipo, texto, peso: 1 });
  if (!Array.isArray(c.memoria)) c.memoria = [];
  c.memoria.push(texto);
  if (!Array.isArray(ser.memoria)) ser.memoria = [];
  ser.memoria.push({ ciclo, texto, tipo, peso: 1 });
  try { require('./memoria-personagem').registrarTurno(ser.id, 'system', texto, ciclo); } catch (e) { /* opcional */ }
}
function tracoCoragem(ser) {
  if (!Array.isArray(ser.personalidade)) ser.personalidade = [];
  if (!ser.personalidade.includes('corajoso')) ser.personalidade.push('corajoso');
}
function morrer(ser, ciclo, inst, causa) {
  ser.status = 'morto'; ser.necessidades.saude = 0; ser.acao = 'morto';
  ser.deslocamento = null;
  ser.causaMorte = { ciclo, missaoId: inst.id, texto: causa };
  marco(ser, ciclo, 'morte', `Morri no ciclo ${ciclo}: ${causa}. Nada foi mais definitivo do que isso.`);
}
// Dano determinístico (sem Math.random) para os testes e o replay serem reproduzíveis.
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function danoDe(ser, def, inst, ciclo) {
  const base = def.perigo.min + hash(inst.id + ':' + ser.id + ':' + ciclo) * (def.perigo.max - def.perigo.min);
  const cap = ser.capacidades || {}, defesa = Math.min(0.6, ((cap.resistencia || 0) + (cap.forca || 0)) / 4);
  return Math.round(base * (1 - defesa) * 10) / 10;
}
function ferir(ser, dano, ciclo, inst, causa) {
  ser.necessidades.saude = Math.max(0, (ser.necessidades.saude ?? 100) - dano);
  if (ser.necessidades.saude <= 0) { morrer(ser, ciclo, inst, causa); return true; }
  inst.menorSaude = Math.min(inst.menorSaude ?? 100, ser.necessidades.saude);
  return false;
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
    const def = CATALOGO[inst.tipoId], acao = ev.decisao && ev.decisao.acao, ser = estado.seres[inst.serId];
    const noLocal = !def.local || ev.localFinal === def.local;
    if (noLocal && (def.acoes.includes('*') || def.acoes.includes(acao))) inst.progresso++;
    // perigo letal: dano a cada ciclo passado dentro do local da missão
    if (def.perigo && noLocal && ser && ser.status !== 'morto') {
      ferir(ser, danoDe(ser, def, inst, ciclo), ciclo, inst, 'ferimentos fatais na ' + def.titulo);
    }
  }
  for (const inst of [...m.ativas]) {
    const ser = estado.seres[inst.serId], def = CATALOGO[inst.tipoId];
    const morto = !ser || ser.status === 'morto';
    let fim = null;
    if (morto) fim = ser && ser.causaMorte && ser.causaMorte.missaoId === inst.id ? 'morte' : 'falha';
    else if (inst.progresso >= inst.meta) fim = 'sucesso';
    else if (ciclo >= inst.limite) fim = 'falha';
    if (!fim) continue;
    m.ativas.splice(m.ativas.indexOf(inst), 1);
    const nome = ser ? ser.nome : inst.serId;
    if (fim === 'sucesso') {
      if (ser) {
        aplicar(ser, def.recompensa);
        if (def.perigo) {
          tracoCoragem(ser);
          marco(ser, ciclo, 'coragem', `Entrei na ${def.titulo} e voltei vivo. Descobri que sou mais corajoso do que pensava.`);
          if ((inst.menorSaude ?? 100) <= QUASE_MORTE) marco(ser, ciclo, 'quase_morte', `Quase morri na ${def.titulo} (saúde chegou a ${Math.round(inst.menorSaude)}). Nunca vou esquecer.`);
        }
      }
      m.concluidas.push({ ...inst, fim: ciclo });
      registrar(m, ciclo, 'concluida', inst, `${nome} concluiu a missão: ${inst.titulo}!`);
    } else if (fim === 'morte') {
      m.falhas.push({ ...inst, fim: ciclo, morte: true });
      registrar(m, ciclo, 'morreu', inst, `${nome} morreu na missão: ${inst.titulo}.`);
    } else {
      let morreuAgora = false;
      if (ser && ser.status !== 'morto') {
        const { saude, ...resto } = def.penalidade || {};
        aplicar(ser, resto);
        if (saude) morreuAgora = ferir(ser, -saude, ciclo, inst, 'não resistiu aos ferimentos da ' + def.titulo);
        if (!morreuAgora && def.perigo && inst.menorSaude !== undefined) {
          tracoCoragem(ser);
          marco(ser, ciclo, 'coragem', `Fracassei na ${def.titulo}, mas encarei o escuro e sobrevivi.`);
          if (ser.necessidades.saude <= QUASE_MORTE) marco(ser, ciclo, 'quase_morte', `Quase morri na ${def.titulo} (saúde ${Math.round(ser.necessidades.saude)}).`);
        }
      }
      if (morreuAgora) fim = 'morte';
      m.falhas.push({ ...inst, fim: ciclo, ...(morreuAgora ? { morte: true } : {}) });
      registrar(m, ciclo, morreuAgora ? 'morreu' : 'falhou', inst, morreuAgora ? `${nome} morreu na missão: ${inst.titulo}.` : `${nome} falhou na missão: ${inst.titulo}.`);
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

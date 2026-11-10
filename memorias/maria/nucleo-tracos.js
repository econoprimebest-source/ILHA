// nucleo-tracos.js — two-timescale (FAST crencas / SLOW tracos)
// REGRA ARQUITETURAL: este modulo NAO importa nem escreve memoria-v2.json.
// Conhece apenas: tracos-icaro.json + tracos-icaro.jsonl (proprios).
// MEMORY ECHO impossivel por design.
// Fase 1 (02/10/2026): dual-write append-only. JSON era a fonte oficial.
// FASE-2 (02/10/2026): JSONL e a fonte oficial. carregar() le via replay com cache.
// salvar() continua escrevendo JSON como snapshot (debug/rollback).

const fs = require('fs');
const path = require('path');

const TRACOS_PATH = path.join(__dirname, 'tracos-icaro.json');
const EVENTOS_PATH = path.join(__dirname, 'tracos-icaro.jsonl');

const CONFIG_TRACOS = {
  minObservacoes: 3,
  minDias: 2,
  minConfianca: 0.70,
  minValorAbsoluto: 0.25,
  maxDeltaEpoch: 0.08
};

const ALPHA_VALOR = 0.3;
const ALPHA_CONF  = 0.2;

function normalizarTopico(t) {
  return String(t || '').toLowerCase().trim();
}

function estadoVazio() {
  return { crencas: [], tracos: [] };
}

// FASE-2 (02/10/2026): cache em memoria do estado reconstruido do JSONL.
// Invalidado automaticamente quando appendEvento ocorre ou resetar eh chamado.
let __cacheEstado = null;
let __cacheTotalEventos = -1;
function __invalidarCache() { __cacheEstado = null; __cacheTotalEventos = -1; }

// ---------- leitura (FASE-2: JSONL eh fonte; JSON eh snapshot) ----------
// FASE-2-FIX (02/10/2026): _lerJson e separado para evitar recursao.
function _lerJson() {
  if (!fs.existsSync(TRACOS_PATH)) return estadoVazio();
  try {
    const parsed = JSON.parse(fs.readFileSync(TRACOS_PATH, 'utf8'));
    return {
      crencas: Array.isArray(parsed.crencas) ? parsed.crencas : [],
      tracos: Array.isArray(parsed.tracos) ? parsed.tracos : []
    };
  } catch (e) {
    console.log('[TRACOS] erro leitura json:', e.message);
    return estadoVazio();
  }
}

let __migrandoAgora = false;
function carregar() {
  // Auto-migracao: JSONL ausente -> migra do JSON (uma vez, sem recursao)
  if (!__migrandoAgora && !fs.existsSync(EVENTOS_PATH) && fs.existsSync(TRACOS_PATH)) {
    __migrandoAgora = true;
    try { migrarJsonParaJsonl(); } catch (e) { console.log('[TRACOS] erro auto-migrar:', e.message); }
    finally { __migrandoAgora = false; }
  }
  if (!fs.existsSync(EVENTOS_PATH)) return estadoVazio();
  const total = contarEventos();
  if (__cacheEstado && __cacheTotalEventos === total) {
    return JSON.parse(JSON.stringify(__cacheEstado));
  }
  __cacheEstado = replayFromJsonl();
  __cacheTotalEventos = total;
  return JSON.parse(JSON.stringify(__cacheEstado));
}

function salvar(estado) {
  try {
    fs.writeFileSync(TRACOS_PATH, JSON.stringify(estado, null, 2), 'utf8');
    // FASE-2: salvar() eh snapshot (JSON nao eh fonte); nao invalida cache porque
    // o JSONL continua sendo a referencia. Se o chamador quer refletir, deve usar appendEvento.
    return true;
  } catch (e) {
    console.log('[TRACOS] erro escrita:', e.message);
    return false;
  }
}

// ---------- append-only (Fase 1) ----------
function appendEvento(ev) {
  try {
    fs.appendFileSync(EVENTOS_PATH, JSON.stringify(ev) + '\n', 'utf8');
    __invalidarCache(); // FASE-2: proximo carregar() reconstroi
    return true;
  } catch (e) {
    console.log('[TRACOS] erro append:', e.message);
    return false;
  }
}

function upsertCrenca(estado, crenca) {
  if (!crenca || !crenca.topico) return;
  const idx = estado.crencas.findIndex(c => normalizarTopico(c.topico) === normalizarTopico(crenca.topico));
  if (idx >= 0) estado.crencas[idx] = crenca;
  else estado.crencas.push(crenca);
}

function upsertTraco(estado, traco) {
  if (!traco || !traco.topico) return;
  const idx = estado.tracos.findIndex(t => normalizarTopico(t.topico) === normalizarTopico(traco.topico));
  if (idx >= 0) estado.tracos[idx] = traco;
  else estado.tracos.push(traco);
}

function replayFromJsonl() {
  const estado = estadoVazio();
  if (!fs.existsSync(EVENTOS_PATH)) return estado;
  let linhas;
  try {
    linhas = fs.readFileSync(EVENTOS_PATH, 'utf8').split('\n').filter(l => l.trim());
  } catch (e) {
    console.log('[TRACOS] erro leitura jsonl:', e.message);
    return estado;
  }
  for (const l of linhas) {
    let ev;
    try { ev = JSON.parse(l); } catch (e) { continue; }
    if (!ev || !ev.tipo) continue;
    if (ev.tipo === 'snapshot_crenca' && ev.crenca) upsertCrenca(estado, ev.crenca);
    else if (ev.tipo === 'snapshot_traco' && ev.traco) upsertTraco(estado, ev.traco);
    else if (ev.tipo === 'crenca_add' && ev.crenca) upsertCrenca(estado, ev.crenca);
    else if (ev.tipo === 'crenca_promovida') {
      if (ev.topico) estado.crencas = estado.crencas.filter(c => normalizarTopico(c.topico) !== normalizarTopico(ev.topico));
      if (ev.traco) upsertTraco(estado, ev.traco);
    } else if (ev.tipo === 'traco_reflexao' && ev.topico) {
      const t = estado.tracos.find(x => normalizarTopico(x.topico) === normalizarTopico(ev.topico));
      if (t) { t.reflexao = ev.reflexao; t.reflexaoEm = ev.reflexaoEm || new Date().toISOString(); }
    } else if (ev.tipo === 'crenca_arquivada' && ev.topico) {
      estado.crencas = estado.crencas.filter(c => normalizarTopico(c.topico) !== normalizarTopico(ev.topico));
    }
  }
  return estado;
}

function migrarJsonParaJsonl() {
  if (!fs.existsSync(TRACOS_PATH)) return { migrado: false, motivo: 'sem_json' };
  if (fs.existsSync(EVENTOS_PATH)) {
    try {
      const conteudo = fs.readFileSync(EVENTOS_PATH, 'utf8').trim();
      if (conteudo.length > 0) return { migrado: false, motivo: 'jsonl_existente' };
    } catch (e) {}
  }
  const estado = _lerJson(); // FASE-2-FIX: nao recursa em carregar()
  let n = 0;
  for (const c of (estado.crencas || [])) {
    appendEvento({ tipo: 'snapshot_crenca', crenca: c, quando: new Date().toISOString() });
    n++;
  }
  for (const t of (estado.tracos || [])) {
    appendEvento({ tipo: 'snapshot_traco', traco: t, quando: new Date().toISOString() });
    n++;
  }
  return { migrado: true, eventos: n };
}

// ---------- operacoes ----------
function registrarCrenca(estado, entrada, opts) {
  if (!estado || !entrada) return null;
  const topico = normalizarTopico(entrada.topico);
  if (!topico) return null;
  const valorNovo = Number(entrada.valorNovo);
  if (!isFinite(valorNovo)) return null;
  const peso = Number(entrada.peso);
  if (!isFinite(peso)) return null;
  const quando = entrada.quando || new Date().toISOString();
  const evidenciaRef = String(entrada.evidenciaRef || '');
  const textoEv = String(entrada.textoEvidencia || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  // PROVENIENCIA (04/10/2026): origem e status sao obrigatorios.
  const origem = ['modelo', 'dono', 'sistema'].includes(entrada.origem) ? entrada.origem : 'modelo';
  const status = ['nao_confirmado', 'confirmado', 'ratificado'].includes(entrada.status) ? entrada.status : 'nao_confirmado';

  let c = estado.crencas.find(x => normalizarTopico(x.topico) === topico);
  if (!c) {
    c = {
      topico,
      valor: valorNovo,
      confianca: peso,
      observacoes: 1,
      origem,
      status,
      primeiraEm: quando,
      ultimaEm: quando,
      evidencias: [{ ref: evidenciaRef, quando, valor: valorNovo, peso, texto: textoEv }]
    };
    estado.crencas.push(c);
  } else {
    c.valor = (1 - ALPHA_VALOR) * c.valor + ALPHA_VALOR * valorNovo;
    c.confianca = (1 - ALPHA_CONF) * c.confianca + ALPHA_CONF * peso;
    c.observacoes += 1;
    c.ultimaEm = quando;
    if (origem === 'dono' || origem === 'sistema') c.origem = origem;
    if (status === 'confirmado' || status === 'ratificado') c.status = status;
    c.evidencias.push({ ref: evidenciaRef, quando, valor: valorNovo, peso, texto: textoEv });
  }
  if (!(opts && opts.semAppend)) {
    appendEvento({ tipo: 'crenca_add', crenca: c, quando });
  }
  return c;
}

function diasDistintos(evidencias) {
  const set = new Set();
  for (const e of (evidencias || [])) {
    const d = String(e.quando || '').slice(0, 10);
    if (d) set.add(d);
  }
  return set.size;
}

function clampDelta(delta, max) {
  if (delta > max) return max;
  if (delta < -max) return -max;
  return delta;
}

function checarPromocao(estado, opts) {
  if (!estado) return [];
  const agora = (opts && opts.agora) || new Date().toISOString();
  const semAppend = !!(opts && opts.semAppend);
  const promovidos = [];
  const restantes = [];

  for (const c of (estado.crencas || [])) {
    const dias = diasDistintos(c.evidencias);
    const maduro =
      c.observacoes >= CONFIG_TRACOS.minObservacoes &&
      dias >= CONFIG_TRACOS.minDias &&
      c.confianca >= CONFIG_TRACOS.minConfianca &&
      Math.abs(c.valor) >= CONFIG_TRACOS.minValorAbsoluto &&
      ((c.origem || 'modelo') !== 'modelo' || (c.status || 'nao_confirmado') !== 'nao_confirmado');

    if (!maduro) { restantes.push(c); continue; }

    const existente = (estado.tracos || []).find(t => normalizarTopico(t.topico) === normalizarTopico(c.topico));
    let tracoFinal;
    if (existente) {
      const delta = c.valor - existente.valor;
      existente.valor = existente.valor + clampDelta(delta, CONFIG_TRACOS.maxDeltaEpoch);
      existente.confianca = c.confianca;
      existente.ocorrencias = (existente.ocorrencias || 0) + c.observacoes;
      existente.evidencias = (existente.evidencias || []).concat(c.evidencias);
      existente.atualizadoEm = agora;
      tracoFinal = existente;
    } else {
      tracoFinal = {
        topico: normalizarTopico(c.topico),
        valor: c.valor,
        confianca: c.confianca,
        ocorrencias: c.observacoes,
        dias,
        origem: 'icaro',
        evidencias: c.evidencias.slice(),
        promovidoEm: agora
      };
      estado.tracos.push(tracoFinal);
    }
    promovidos.push(c.topico);
    if (!semAppend) {
      appendEvento({ tipo: 'crenca_promovida', topico: normalizarTopico(c.topico), traco: tracoFinal, quando: agora });
    }
  }
  estado.crencas = restantes;
  return promovidos;
}

function appendReflexao(topico, reflexao, quando) {
  if (!topico || !reflexao) return false;
  return appendEvento({
    tipo: 'traco_reflexao',
    topico: normalizarTopico(topico),
    reflexao: String(reflexao).slice(0, 500),
    reflexaoEm: quando || new Date().toISOString()
  });
}

function lerTracosAtivos(estado, max) {
  if (!estado || !Array.isArray(estado.tracos)) return [];
  const n = max || 3;
  return estado.tracos
    .slice()
    .sort((a, b) => String(b.promovidoEm || '').localeCompare(String(a.promovidoEm || '')))
    .slice(0, n);
}

// ARQUIVAR-MODELO (04/10/2026): remove crencas com origem 'modelo' e status 'nao_confirmado'.
function arquivarCrencasModeloSemConfirmacao(estado) {
  if (!estado || !Array.isArray(estado.crencas)) return [];
  const removidas = [];
  const restantes = [];
  const agora = new Date().toISOString();
  for (const c of estado.crencas) {
    const origem = c.origem || 'modelo';
    const status = c.status || 'nao_confirmado';
    if (origem === 'modelo' && status === 'nao_confirmado') {
      removidas.push(c.topico);
      appendEvento({ tipo: 'crenca_arquivada', topico: c.topico, quando: agora });
    } else {
      restantes.push(c);
    }
  }
  estado.crencas = restantes;
  return removidas;
}

function resetar() {
  const estado = estadoVazio();
  // FASE-2: esvazia o JSONL (fonte oficial) e o JSON (snapshot)
  try { fs.writeFileSync(EVENTOS_PATH, '', 'utf8'); } catch (e) {}
  salvar(estado);
  __invalidarCache();
  return estado;
}

// COMPACT-JSONL (02/10/2026): compaction do tracos-icaro.jsonl.
// Reescreve o jsonl como snapshots do estado atual (JSON = fonte na Fase 1).
// Rotaciona o antigo para .bak com timestamp. Atomico (tmp + rename).
function contarEventos() {
  if (!fs.existsSync(EVENTOS_PATH)) return 0;
  try {
    return fs.readFileSync(EVENTOS_PATH, 'utf8').split('\n').filter(l => l.trim()).length;
  } catch (e) { return 0; }
}

function compactarJsonl(opts) {
  const forcar = !!(opts && opts.forcar);
  const limiar = (opts && opts.limiar) || 1000;
  const total = contarEventos();
  if (!forcar && total < limiar) {
    return { compactado: false, motivo: 'abaixo_do_limiar', eventos: total, limiar };
  }
  // COMPACT-FIX (02/10/2026): reconstroi do proprio jsonl (fonte de eventos),
  // nao do JSON. Assim o snapshot preserva TUDO que aconteceu, mesmo se o JSON
  // estiver atrasado em relacao ao jsonl (ex: reflexao appendada mas ainda nao salva).
  const estado = replayFromJsonl();
  const agora = new Date().toISOString();
  const linhas = [];
  for (const c of (estado.crencas || [])) {
    linhas.push(JSON.stringify({ tipo: 'snapshot_crenca', crenca: c, quando: agora }));
  }
  for (const t of (estado.tracos || [])) {
    linhas.push(JSON.stringify({ tipo: 'snapshot_traco', traco: t, quando: agora }));
  }
  const tmp = EVENTOS_PATH + '.new';
  try {
    fs.writeFileSync(tmp, linhas.join('\n') + (linhas.length ? '\n' : ''), 'utf8');
  } catch (e) {
    console.log('[COMPACT] erro escrita tmp:', e.message);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (e2) {}
    return { compactado: false, motivo: 'erro_escrita', erro: e.message };
  }
  const stamp = agora.replace(/[:.]/g, '-').slice(0, 19);
  const backup = EVENTOS_PATH + '.' + stamp + '.bak';
  try {
    if (fs.existsSync(EVENTOS_PATH)) fs.renameSync(EVENTOS_PATH, backup);
    fs.renameSync(tmp, EVENTOS_PATH);
  } catch (e) {
    console.log('[COMPACT] erro rotacao:', e.message);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (e2) {}
    return { compactado: false, motivo: 'erro_rotacao', erro: e.message };
  }
  console.log('[COMPACT] ' + total + ' eventos -> ' + linhas.length + ' snapshots | backup: ' + backup);
  return { compactado: true, eventosAntes: total, eventosDepois: linhas.length, backup };
}

module.exports = {
  CONFIG_TRACOS,
  TRACOS_PATH,
  EVENTOS_PATH,
  estadoVazio,
  carregar,
  salvar,
  appendEvento,
  contarEventos,
  compactarJsonl,
  replayFromJsonl,
  migrarJsonParaJsonl,
  registrarCrenca,
  checarPromocao,
  appendReflexao,
  lerTracosAtivos,
  resetar,
  arquivarCrencasModeloSemConfirmacao,
  diasDistintos,
  normalizarTopico,
  __invalidarCache
};
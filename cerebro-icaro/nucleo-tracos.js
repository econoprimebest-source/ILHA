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
  // PORTA EMERGENTE (06/10/2026, pedido de Rafael): substitui a regra antiga.
  minObservacoes: 5,
  minDias: 3,
  minConfianca: 0.75,
  minValorAbsoluto: 0.25,
  minContextos: 2,
  minSessoes: 2,
  maxDeltaEpoch: 0.08,
  // reapareceuAposPausa: lacuna >= 24h entre duas evidencias do mesmo topico.
  pausaReaparecimentoMs: 24 * 60 * 60 * 1000,
  // sessao: sequencia de evidencias sem buraco de 2h ou mais.
  intervaloSessaoMs: 2 * 60 * 60 * 1000
};

const ALPHA_VALOR = 0.3;
// ALPHA_CONF era 0.2 (media ponderada de pesos). Removido em 07/10/2026 junto
// com a reforma da confianca: ver calcularConfianca().

function normalizarTopico(t) {
  return String(t || '').toLowerCase().trim();
}

function estadoVazio() {
  // hipoteses (06/10/2026): pares de crencas opostas que nao promoveram.
  return { crencas: [], tracos: [], hipoteses: [] };
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
      tracos: Array.isArray(parsed.tracos) ? parsed.tracos : [],
      hipoteses: Array.isArray(parsed.hipoteses) ? parsed.hipoteses : []
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
    } else if (ev.tipo === 'hipotese_registrada' && ev.hipotese) {
      const chave = ev.hipotese.chave;
      const idx = estado.hipoteses.findIndex(h => h.chave === chave);
      if (idx >= 0) estado.hipoteses[idx] = ev.hipotese;
      else estado.hipoteses.push(ev.hipotese);
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
// CONTEXTO (06/10/2026, regra emergente de Rafael): toda evidencia nasce de
// uma pergunta original; o contexto e extrair dessa pergunta o tipo de intencao
// e o remetente. contextosDistintos e um Set em runtime e um array no disco
// (JSON nao serializa Set); contextoSet() converte quando precisar.
function normalizarContexto(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extrairContexto(pergunta) {
  const t = normalizarContexto(pergunta);
  if (!t) return [];
  let intencao = 'afirmacao';
  if (/\b(errou|erraste|erramos|esta errado|estao errados|voce esta errado|vc esta errado|nao e assim|nao e isso|nao esta certo|estava errado|ta errado)\b/.test(t)) {
    intencao = 'correcao';
  } else if (/\?/.test(t) ||
      /^(que|quem|quando|onde|como|por que|porque|qual|quanto|o que|voce|voces|existe|sabe|lembra|e possivel)/.test(t)) {
    intencao = 'pergunta';
  } else if (/\b(faz|faca|pode fazer|pode me|preciso|quero|manda|busca|pesquis|escrev|crie|criar|mostra|refaz|corrigir|limpa|configura)\b/.test(t)) {
    intencao = 'pedido';
  } else if (/\b(otimo|otima|bom|boa|legal|adorei|gostei|parabens|perfeito|isso mesmo)\b/.test(t)) {
    intencao = 'elogio';
  }
  return ['intencao:' + intencao, 'remetente:dono'];
}

function unirContextos(atuais, novos) {
  const set = new Set();
  for (const x of (atuais || [])) if (x) set.add(String(x));
  for (const x of (novos || [])) if (x) set.add(String(x));
  return [...set];
}

function contextoSet(c) {
  return new Set((c && c.contextosDistintos) || []);
}

function datasEvidencias(evidencias) {
  const out = [];
  for (const e of (evidencias || [])) {
    const t = Date.parse(String((e && e.quando) || '').replace(' ', 'T'));
    if (isFinite(t)) out.push(t);
  }
  return out.sort((a, b) => a - b);
}

function sessoesDistintas(evidencias) {
  const ts = datasEvidencias(evidencias);
  let sessoes = ts.length ? 1 : 0;
  for (let i = 1; i < ts.length; i++) {
    if (ts[i] - ts[i - 1] >= CONFIG_TRACOS.intervaloSessaoMs) sessoes++;
  }
  return sessoes;
}

// FLAGS (regras 1 e 3): reapareceuAposPausa = alguma lacuna >= 24h entre
// evidencias; houveCorrecao = alguma evidencia do dono nega o topico ou o
// sinal virou entre evidencias. So liga, nunca desliga (idempotente).
function garantirCamposNovos(c) {
  if (!Array.isArray(c.contextosDistintos)) c.contextosDistintos = [];
  if (typeof c.reapareceuAposPausa !== 'boolean') c.reapareceuAposPausa = false;
  if (typeof c.houveCorrecao !== 'boolean') c.houveCorrecao = false;
}

function reconstruirFlags(c) {
  garantirCamposNovos(c);
  const evs = (c.evidencias || []).slice().sort((a, b) =>
    Date.parse(String((a && a.quando) || '').replace(' ', 'T')) -
    Date.parse(String((b && b.quando) || '').replace(' ', 'T')));
  let anteriorTs = null;
  let signoAnterior = 0;
  for (const e of evs) {
    const ts = Date.parse(String((e && e.quando) || '').replace(' ', 'T'));
    if (isFinite(ts) && anteriorTs !== null && ts - anteriorTs >= CONFIG_TRACOS.pausaReaparecimentoMs) {
      c.reapareceuAposPausa = true;
    }
    if (isFinite(ts)) anteriorTs = ts;
    const v = Number(e && e.valor);
    if (!isFinite(v) || v === 0) continue;
    if (String((e && e.ref) || '').indexOf('dono:') === 0 && v < 0) c.houveCorrecao = true;
    if (signoAnterior !== 0 && Math.sign(v) !== signoAnterior) c.houveCorrecao = true;
    signoAnterior = Math.sign(v);
  }
}

// REFORMA-CONFIANCA (07/10/2026, regra de Rafael): confianca deixa de ser
// media ponderada de pesos e passa a ser funcao da evidencia acumulada.
//   conf = 0.50
//        + 0.10 * min(obs / 5, 1)
//        + 0.15 * min(contextos / 4, 1)
//        + 0.15 * min(dias / 4, 1)
//        + 0.10 * (temFonteDono ? 1 : 0)
// O peso individual (0.72 modelo / 0.85 dono) deixa de ser teto: ele so
// decide se a crenca conta o bonus de fonte dono.
function temFonteDono(c) {
  if (!c) return false;
  if (c.origem === 'dono' || c.origem === 'sistema') return true;
  if (c.status === 'confirmado' || c.status === 'ratificado') return true;
  return (c.evidencias || []).some(e =>
    /^(dono|ratificacao|sistema):/.test(String((e && e.ref) || '')));
}

function calcularConfianca(c) {
  if (!c) return 0;
  const obs = Number(c.observacoes) || 0;
  const contextos = (c.contextosDistintos || []).length;
  const dias = diasDistintos(c.evidencias);
  const dono = temFonteDono(c) ? 1 : 0;
  return 0.5
    + 0.10 * Math.min(obs / 5, 1)
    + 0.15 * Math.min(contextos / 4, 1)
    + 0.15 * Math.min(dias / 4, 1)
    + 0.10 * dono;
}

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
  // PROVENIENCIA (04/10/2026): origem e status obrigatorios. Continuam gravados
  // para auditoria; deixaram de ser porta de promocao (item 4 da regra emergente).
  const origem = ['modelo', 'dono', 'sistema'].includes(entrada.origem) ? entrada.origem : 'modelo';
  const status = ['nao_confirmado', 'confirmado', 'ratificado'].includes(entrada.status) ? entrada.status : 'nao_confirmado';

  // REGRA 2: contexto vem da pergunta original (+ extras do chamador).
  const extras = [];
  if (Array.isArray(entrada.contextos)) extras.push(...entrada.contextos);
  else if (entrada.contextos instanceof Set) extras.push(...entrada.contextos);
  else if (typeof entrada.contextos === 'string') extras.push(entrada.contextos);
  if (entrada.contexto) extras.push(entrada.contexto);
  if (entrada.remetente) extras.push('remetente:' + normalizarContexto(entrada.remetente));
  extras.push(...extrairContexto(entrada.pergunta));
  const contextosNovos = [...new Set(extras.map(normalizarContexto).filter(Boolean))];

  let c = estado.crencas.find(x => normalizarTopico(x.topico) === topico);

  // IDEMPOTENCIA POR REF: evidencia ja gravada (backfill de contexto) -> so
  // mescla contextos; nao infla observacoes nem valor.
  if (c && evidenciaRef && (c.evidencias || []).some(e => e && e.ref === evidenciaRef)) {
    const antesCtx = (c.contextosDistintos || []).length;
    const antesPausa = !!c.reapareceuAposPausa;
    const antesCorrecao = !!c.houveCorrecao;
    const faltavamCampos = !Array.isArray(c.contextosDistintos) ||
      typeof c.reapareceuAposPausa !== 'boolean' ||
      typeof c.houveCorrecao !== 'boolean';
    const confAntes = c.confianca;
    c.contextosDistintos = unirContextos(c.contextosDistintos, contextosNovos);
    reconstruirFlags(c);
    c.confianca = calcularConfianca(c);
    const mudou = (c.contextosDistintos || []).length !== antesCtx ||
      antesPausa !== !!c.reapareceuAposPausa ||
      antesCorrecao !== !!c.houveCorrecao ||
      faltavamCampos ||
      confAntes !== c.confianca;
    if (mudou && !(opts && opts.semAppend)) {
      appendEvento({ tipo: 'crenca_add', crenca: c, quando });
    }
    return c;
  }

  if (!c) {
    c = {
      topico,
      valor: valorNovo,
      confianca: 0,
      observacoes: 1,
      origem,
      status,
      primeiraEm: quando,
      ultimaEm: quando,
      contextosDistintos: contextosNovos.slice(),
      reapareceuAposPausa: false,
      houveCorrecao: (origem === 'dono' && valorNovo < 0),
      evidencias: [{ ref: evidenciaRef, quando, valor: valorNovo, peso, texto: textoEv }]
    };
    estado.crencas.push(c);
  } else {
    c.valor = (1 - ALPHA_VALOR) * c.valor + ALPHA_VALOR * valorNovo;
    c.observacoes += 1;
    c.ultimaEm = quando;
    if (origem === 'dono' || origem === 'sistema') c.origem = origem;
    if (status === 'confirmado' || status === 'ratificado') c.status = status;
    c.evidencias.push({ ref: evidenciaRef, quando, valor: valorNovo, peso, texto: textoEv });
    c.contextosDistintos = unirContextos(c.contextosDistintos, contextosNovos);
    reconstruirFlags(c);
  }
  garantirCamposNovos(c);
  // REFORMA-CONFIANCA: a confianca nunca mais vem do peso; nasce da evidencia.
  c.confianca = calcularConfianca(c);

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

// REGRA 5: topico que e formula de assistente nunca promove.
function ehFormulaTopico(c) {
  let EC = null;
  try { EC = require('./extrator-crencas'); } catch (e) { EC = null; }
  if (!EC) return false;
  if (EC.ehFormulaAssistente && EC.ehFormulaAssistente(c.topico)) return true;
  if (Array.isArray(EC.FORMULAS_ASSISTENTE)) {
    const t = normalizarContexto(c.topico);
    if (EC.FORMULAS_ASSISTENTE.some(f => t && t.includes(normalizarContexto(f)))) return true;
  }
  return false;
}

// REGRA 6 (auxiliar): dois topicos sao opostos quando um carrega marcador de
// negacao e as bases (sem negacao, sem acento, sem pontuacao) sao iguais.
function temNegacao(t) {
  return /\b(nao|nunca|odeio|detesto|abomino)\b/.test(normalizarContexto(t));
}
function baseTopico(t) {
  return normalizarContexto(t)
    .replace(/\b(nao|nunca|odeio|detesto|abomino)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function topicosOpostos(a, b) {
  if (!a || !b) return false;
  if (temNegacao(a) === temNegacao(b)) return false;
  const baseA = baseTopico(a);
  return !!baseA && baseA === baseTopico(b);
}

// Diagnostico puro da regra emergente: devolve por que a crenca sim ou nao
// pode promover agora. Nao altera estado.
function diagnosticarPromocao(c) {
  const motivos = [];
  const EPS = 1e-9; // evita 0.7499999999999999 < 0.75 por ruido de float
  const obs = Number(c.observacoes) || 0;
  const dias = diasDistintos(c.evidencias);
  const conf = calcularConfianca(c); // REFORMA-CONFIANCA (07/10): nao usa mais o peso
  const valor = Number(c.valor);
  const contextos = (c.contextosDistintos || []).length;
  const sessoes = sessoesDistintas(c.evidencias);

  if (ehFormulaTopico(c)) motivos.push('topico esta em FORMULAS_ASSISTENTE');
  if (obs < CONFIG_TRACOS.minObservacoes) motivos.push('observacoes ' + obs + ' < ' + CONFIG_TRACOS.minObservacoes);
  if (dias < CONFIG_TRACOS.minDias) motivos.push('dias ' + dias + ' < ' + CONFIG_TRACOS.minDias);
  if (!(conf + EPS >= CONFIG_TRACOS.minConfianca)) motivos.push('confianca ' + conf.toFixed(2) + ' < ' + CONFIG_TRACOS.minConfianca);
  if (!(Math.abs(valor) + EPS >= CONFIG_TRACOS.minValorAbsoluto)) motivos.push('valor |' + valor.toFixed(2) + '| < ' + CONFIG_TRACOS.minValorAbsoluto);
  if (contextos < CONFIG_TRACOS.minContextos) motivos.push('contextosDistintos ' + contextos + ' < ' + CONFIG_TRACOS.minContextos);
  if (sessoes < CONFIG_TRACOS.minSessoes) {
    motivos.push('sessoes ' + sessoes + ' < ' + CONFIG_TRACOS.minSessoes + (sessoes === 1 ? ' (so apareceu em 1 sessao)' : ''));
  }
  if (!c.reapareceuAposPausa && !c.houveCorrecao) {
    motivos.push('sem reapareceuAposPausa e sem houveCorrecao');
  }

  return {
    topico: c.topico,
    maduro: motivos.length === 0,
    motivos,
    resumo: {
      obs, dias, conf, valor, contextos, sessoes,
      reapareceuAposPausa: !!c.reapareceuAposPausa,
      houveCorrecao: !!c.houveCorrecao,
      origem: c.origem || 'modelo',
      status: c.status || 'nao_confirmado',
      contextosLista: (c.contextosDistintos || []).slice()
    }
  };
}

function registrarHipotese(estado, a, b, agora, semAppend) {
  if (!Array.isArray(estado.hipoteses)) estado.hipoteses = [];
  const chave = [baseTopico(a.topico), baseTopico(b.topico)].sort().join(' <-> ');
  const jaTem = estado.hipoteses.some(h => h.chave === chave);
  if (jaTem) return null;
  const h = {
    chave,
    topicoA: a.topico,
    topicoB: b.topico,
    motivo: 'crencas_opostas',
    quando: agora,
    valorA: a.valor,
    valorB: b.valor,
    evidenciasA: (a.evidencias || []).length,
    evidenciasB: (b.evidencias || []).length,
    contextosA: (a.contextosDistintos || []).slice(),
    contextosB: (b.contextosDistintos || []).slice(),
    flagsA: { reapareceuAposPausa: !!a.reapareceuAposPausa, houveCorrecao: !!a.houveCorrecao },
    flagsB: { reapareceuAposPausa: !!b.reapareceuAposPausa, houveCorrecao: !!b.houveCorrecao }
  };
  estado.hipoteses.push(h);
  if (!semAppend) appendEvento({ tipo: 'hipotese_registrada', hipotese: h, quando: agora });
  console.log('[TRACOS] CONFLITO -> hipotese, nenhuma promove: ' +
    a.topico + ' (' + Number(a.valor).toFixed(2) + ') <> ' + b.topico + ' (' + Number(b.valor).toFixed(2) + ')');
  return h;
}

// PORTA EMERGENTE (06/10/2026, regra de Rafael): substitui a regra antiga.
// Promove com 5+ obs, 3+ dias, conf 0.75+, |valor| 0.25+, 2+ contextos e
// (reapareceuAposPausa OU houveCorrecao). NAO promove por formula de
// assistente nem por ter aparecido em 1 sessao so. Travas origem/status
// removidas. Conflito entre crencas opostas vira hipotese.
function checarPromocao(estado, opts) {
  if (!estado) return [];
  const agora = (opts && opts.agora) || new Date().toISOString();
  const semAppend = !!(opts && opts.semAppend);
  const promovidos = [];
  const restantes = [];
  if (!Array.isArray(estado.hipoteses)) estado.hipoteses = [];

  const maduros = [];
  for (const c of (estado.crencas || [])) {
    const d = diagnosticarPromocao(c);
    if (d.maduro) maduros.push(c);
    else restantes.push(c);
  }

  // REGRA 6: conflito entre crenca opostas maduras -> nenhuma sobe; vira
  // hipotese (ambas continuam em crencas para crescer com mais evidencia).
  const bloqueados = new Set();
  for (let i = 0; i < maduros.length; i++) {
    for (let j = i + 1; j < maduros.length; j++) {
      const a = maduros[i], b = maduros[j];
      if (Math.sign(Number(a.valor)) === Math.sign(Number(b.valor))) continue;
      if (!topicosOpostos(a.topico, b.topico)) continue;
      bloqueados.add(a);
      bloqueados.add(b);
      registrarHipotese(estado, a, b, agora, semAppend);
    }
  }

  for (const c of maduros) {
    if (bloqueados.has(c)) { restantes.push(c); continue; }

    const dias = diasDistintos(c.evidencias);
    const existente = (estado.tracos || []).find(t => normalizarTopico(t.topico) === normalizarTopico(c.topico));
    let tracoFinal;
    if (existente) {
      const delta = c.valor - existente.valor;
      existente.valor = existente.valor + clampDelta(delta, CONFIG_TRACOS.maxDeltaEpoch);
      existente.confianca = calcularConfianca(c);
      existente.ocorrencias = (existente.ocorrencias || 0) + c.observacoes;
      existente.evidencias = (existente.evidencias || []).concat(c.evidencias);
      existente.atualizadoEm = agora;
      tracoFinal = existente;
    } else {
      tracoFinal = {
        topico: normalizarTopico(c.topico),
        valor: c.valor,
        confianca: calcularConfianca(c),
        ocorrencias: c.observacoes,
        dias,
        origem: 'icaro',
        evidencias: c.evidencias.slice(),
        contextosDistintos: (c.contextosDistintos || []).slice(),
        reapareceuAposPausa: !!c.reapareceuAposPausa,
        houveCorrecao: !!c.houveCorrecao,
        promovidoEm: agora
      };
      estado.tracos.push(tracoFinal);
    }
    // REGRA 7: log da promocao com evidencias, contextos e flags.
    console.log('[TRACOS] PROMOCAO | topico=' + c.topico +
      ' | obs=' + c.observacoes +
      ' dias=' + dias +
      ' sessoes=' + sessoesDistintas(c.evidencias) +
      ' conf=' + Number(c.confianca).toFixed(2) +
      ' valor=' + Number(c.valor).toFixed(2) +
      ' origem=' + (c.origem || 'modelo') +
      ' status=' + (c.status || 'nao_confirmado') +
      ' | contextos=[' + (c.contextosDistintos || []).join('; ') + ']' +
      ' | flags={reapareceuAposPausa:' + !!c.reapareceuAposPausa + ', houveCorrecao:' + !!c.houveCorrecao + '}' +
      ' | evidencias=' + (c.evidencias || []).map(e => e.ref).join(','));
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
  for (const h of (estado.hipoteses || [])) {
    linhas.push(JSON.stringify({ tipo: 'hipotese_registrada', hipotese: h, quando: agora }));
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
  sessoesDistintas,
  calcularConfianca,
  temFonteDono,
  extrairContexto,
  normalizarContexto,
  diagnosticarPromocao,
  topicosOpostos,
  baseTopico,
  registrarHipotese,
  contextoSet,
  normalizarTopico,
  __invalidarCache
};
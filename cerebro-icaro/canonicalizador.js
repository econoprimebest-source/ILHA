// canonicalizador.js — agrupa topicos sinonimos (Re:CAP 2 estagios).
// Stage A: fuzzy match offline (0 LLM). Stage B: Qwen decide ambiguos.
// Isolado: nao toca V2, nao toca tracos-icaro, nao toca prompt.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_PATH = path.join(__dirname, 'cache-canonical.json');
const OLLAMA = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODELO = process.env.ICARO_CANON_MODELO || 'qwen2.5:7b';

const LIMIAR_MESMO = 0.85;

function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      curr[j] = Math.min(curr[j-1] + 1, prev[j] + 1, prev[j-1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function similaridade(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const max = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / max;
}

function hashNovo(topico, existentes) {
  const sorted = [...existentes].sort().join('|');
  return crypto.createHash('sha1').update(topico + '::' + sorted).digest('hex').slice(0, 16);
}

function carregarCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); }
  catch (e) { return {}; }
}

// CANON-LOCK (02/10/2026): fila em memoria + escrita atomica (tmp + rename).
// Reduz risco de cache corrompido em chamadas paralelas ao canonicalizador.
let __cacheFila = Promise.resolve();
function salvarCache(c) {
  const conteudo = JSON.stringify(c, null, 2);
  __cacheFila = __cacheFila.then(() => {
    const tmp = CACHE_PATH + '.tmp';
    try {
      fs.writeFileSync(tmp, conteudo, 'utf8');
      fs.renameSync(tmp, CACHE_PATH);
    } catch (e) {
      console.log('[CANON] cache erro:', e.message);
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (e2) {}
    }
  }).catch(e => console.log('[CANON] fila erro:', e.message));
  return __cacheFila;
}

// STAGE A — fuzzy determinista
function stageA(topico, existentes) {
  let melhor = null;
  let melhorScore = 0;
  for (const e of existentes) {
    const s = similaridade(topico, e);
    if (s > melhorScore) { melhorScore = s; melhor = e; }
  }
  if (melhorScore >= LIMIAR_MESMO) return { decisao: 'merge', canonico: melhor, via: 'fuzzy', score: melhorScore };
  return { decisao: 'ambiguo', melhor, score: melhorScore };
}

// STAGE B — Qwen para ambiguos
const PROMPT_SISTEMA = [
  'Voce decide se um topico NOVO eh equivalente a algum topico EXISTENTE.',
  'Responda SO JSON, sem markdown.',
  '',
  'Formato:',
  '- Se equivalente: {"acao":"merge","canonico":"<topico_existente>"}',
  '- Se distinto: {"acao":"novo"}',
  '',
  'Regras:',
  '- Prefira SEMPRE o topico mais ABRANGENTE como canonico.',
  '- Ex: "cosmos", "estrelas", "universo" sao todos "astronomia".',
  '- Ex: "futebol", "basquete" sao ambos "esporte".',
  '- Se o novo topico eh mais abrangente que os existentes, responda {"acao":"novo"} (ele vira canonico).',
  '- Em duvida, prefira NAO fazer merge.'
].join('\n');

function parsearStageB(txt, topico, existentes) {
  const m = String(txt || '').match(/\{[\s\S]*?\}/);
  if (!m) return { decisao: 'novo', canonico: topico, via: 'llm', erro: 'sem_json' };
  let obj;
  try { obj = JSON.parse(m[0]); }
  catch (e) { return { decisao: 'novo', canonico: topico, via: 'llm', erro: 'json_invalido' }; }
  if (obj.acao === 'merge' && typeof obj.canonico === 'string') {
    const canon = existentes.find(e => normalizar(e) === normalizar(obj.canonico));
    if (canon) return { decisao: 'merge', canonico: canon, via: 'llm' };
  }
  return { decisao: 'novo', canonico: topico, via: 'llm' };
}

async function chamarQwen(topico, existentes) {
  const user = [
    'Topico novo: "' + topico + '"',
    'Topicos existentes: ' + JSON.stringify(existentes),
    '',
    'Decisao:'
  ].join('\n');
  const corpo = {
    model: MODELO,
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: user }
    ],
    stream: false,
    keep_alive: '24h',
    options: { temperature: 0.0, num_predict: 60, num_ctx: 1024 }
  };
  const r = await fetch(OLLAMA + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  return String(d?.message?.content || '').trim();
}

async function stageB(topico, existentes) {
  let bruta;
  try { bruta = await chamarQwen(topico, existentes); }
  catch (e) { return { decisao: 'novo', canonico: topico, via: 'llm', erro: e.message }; }
  return parsearStageB(bruta, topico, existentes);
}

// API publica
async function canonicalizar(topico, existentes, opts) {
  const forcar = opts && opts.semCache;
  const t = String(topico || '').trim();
  if (!t) return null;
  const lista = Array.isArray(existentes) ? existentes.filter(Boolean) : [];

  if (!lista.length) return { canonico: t, via: 'trivial', score: 1 };

  const cache = forcar ? {} : carregarCache();
  const h = hashNovo(t, lista);
  if (!forcar && cache[h]) return { ...cache[h], cache: true };

  const a = stageA(t, lista);
  if (a.decisao !== 'ambiguo') {
    const res = { canonico: a.canonico, via: a.via, score: a.score };
    if (!forcar) { cache[h] = res; salvarCache(cache); }
    return res;
  }

  const b = await stageB(t, lista);
  const res = { canonico: b.canonico, via: b.via, score: a.score };
  if (!forcar) { cache[h] = res; salvarCache(cache); }
  return res;
}

function limparCache() {
  try { fs.writeFileSync(CACHE_PATH, '{}', 'utf8'); return true; }
  catch (e) { return false; }
}

module.exports = {
  canonicalizar, limparCache, normalizar, similaridade, levenshtein,
  stageA, stageB, parsearStageB, hashNovo,
  CACHE_PATH, LIMIAR_MESMO
};
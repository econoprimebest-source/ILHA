// extrator-topico.js — extrai {topico, valor} de uma posicao propria via Qwen.
// Isolado: nao importa memoria-v2, nao escreve em V2, so cache proprio.
// Cache: por hash da posicao. Reduz chamadas Qwen quando a mesma frase reaparece.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_PATH = path.join(__dirname, 'cache-topicos.json');
const OLLAMA = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODELO = process.env.ICARO_TOPICO_MODELO || 'qwen2.5:7b';

const PROMPT_SISTEMA = [
  'Voce e um extrator de topico. Nao converse. Nao explique.',
  'Dado um texto, devolva APENAS JSON com dois campos:',
  '- "topico": 1 a 3 palavras, o assunto principal (lowercase, sem acento)',
  '- "valor": 1 se o autor expressa posicao positiva/afirmacao, -1 se negativa/negacao, 0 se neutro',
  '',
  'Regras:',
  '- Se nao houver posicao clara, responda {"topico": null, "valor": 0}.',
  '- Nunca invente topico que nao esteja implicito no texto.',
  '- Responda SO o JSON. Sem markdown. Sem comentario.'
].join('\n');

function hashPosicao(p) {
  return crypto.createHash('sha1').update(String(p)).digest('hex').slice(0, 16);
}

function carregarCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch (e) { return {}; }
}

function salvarCache(c) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), 'utf8');
  } catch (e) { console.log('[TOPICO] cache erro:', e.message); }
}

function normalizarTopico(t) {
  return String(t || '').toLowerCase().trim();
}

async function chamarQwen(posicao) {
  const corpo = {
    model: MODELO,
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: 'Texto: "' + String(posicao).slice(0, 400) + '"' }
    ],
    stream: false,
    keep_alive: '24h',
    options: { temperature: 0.0, num_predict: 80, num_ctx: 2048 }
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

function parsearResposta(txt) {
  // extrai o primeiro bloco JSON valido da resposta
  const m = String(txt || '').match(/\{[\s\S]*?\}/);
  if (!m) return null;
  let obj;
  try { obj = JSON.parse(m[0]); } catch (e) { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const topico = normalizarTopico(obj.topico);
  const valor = Number(obj.valor);
  if (!topico) return null;
  if (!isFinite(valor)) return null;
  if (valor !== 1 && valor !== -1 && valor !== 0) return null;
  if (valor === 0) return null;
  return { topico, valor };
}

async function extrairTopico(posicao, opts) {
  const forcarSemCache = opts && opts.semCache;
  const p = String(posicao || '').trim();
  if (p.length < 5) return null;

  const cache = forcarSemCache ? {} : carregarCache();
  const h = hashPosicao(p);
  if (!forcarSemCache && cache[h]) {
    return cache[h];
  }

  let bruta;
  try {
    bruta = await chamarQwen(p);
  } catch (e) {
    console.log('[TOPICO] erro qwen:', e.message);
    return null;
  }

  const parsed = parsearResposta(bruta);
  const resultado = parsed || { topico: null, valor: 0 };

  if (!forcarSemCache) {
    cache[h] = resultado;
    salvarCache(cache);
  }
  return parsed;
}

function limparCache() {
  try { fs.writeFileSync(CACHE_PATH, '{}', 'utf8'); return true; }
  catch (e) { return false; }
}

module.exports = {
  extrairTopico,
  limparCache,
  parsearResposta,
  hashPosicao,
  normalizarTopico,
  CACHE_PATH
};
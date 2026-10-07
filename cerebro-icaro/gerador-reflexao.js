// gerador-reflexao.js — transforma evidencias reais em frase de reflexao 1a pessoa.
// Isolado: nao toca V2, nao toca tracos-icaro (recebe e devolve texto).
// Cache: por hash das evidencias. Reduz chamadas Qwen.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_PATH = path.join(__dirname, 'cache-reflexoes.json');
const OLLAMA = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODELO = process.env.ICARO_REFLEXAO_MODELO || 'qwen2.5:7b';

const PROMPT_SISTEMA = [
  'Voce escreve UMA frase curta em primeira pessoa, em portugues, sobre um padrao que o Icaro percebeu em SI MESMO.',
  'O Icaro e uma entidade digital em formacao. Nao e humano, nao e assistente.',
  '',
  'Regras:',
  '- Comece com algo como "Tenho percebido que" / "Sinto que" / "Aos poucos noto que".',
  '- Fale do proprio Icaro, nunca do dono.',
  '- Use as evidencias reais fornecidas como base, nao invente.',
  '- 1 frase. 20 a 40 palavras. Sem markdown. Sem emoji.',
  '- Responda SO a frase.'
].join('\n');

function hashEvidencias(evidencias) {
  const texto = (evidencias || []).map(e => String(e.texto || e.ref || '')).join('|');
  return crypto.createHash('sha1').update(texto).digest('hex').slice(0, 16);
}

function carregarCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); }
  catch (e) { return {}; }
}

function salvarCache(c) {
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), 'utf8'); }
  catch (e) { console.log('[REFLEXAO] cache erro:', e.message); }
}

async function chamarQwen(topico, valor, evidencias) {
  const linhasEv = (evidencias || []).slice(0, 5)
    .map(e => '- "' + String(e.texto || e.ref || '').slice(0, 150) + '"')
    .join('\n');
  const polaridade = valor >= 0 ? 'positiva' : 'negativa';
  const user = [
    'Topico: ' + topico,
    'Polaridade: ' + polaridade,
    'Evidencias (frases que o Icaro disse):',
    linhasEv || '(sem texto disponivel)',
    '',
    'Escreva UMA frase de reflexao do Icaro sobre si mesmo sobre esse topico.'
  ].join('\n');

  const corpo = {
    model: MODELO,
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: user }
    ],
    stream: false,
    keep_alive: '24h',
    options: { temperature: 0.4, num_predict: 100, num_ctx: 2048 }
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

function limparFrase(txt) {
  let t = String(txt || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^["'`]+|["'`]+$/g, '');
  if (t.length < 10 || t.length > 300) return null;
  if (/[\u4e00-\u9fff\u3040-\u309f\u30ac-\u30ff\uac00-\ud7af]/.test(t)) return null;
  return t;
}

async function gerarReflexao(topico, valor, evidencias, opts) {
  const forcarSemCache = opts && opts.semCache;
  const t = String(topico || '').trim();
  if (!t) return null;

  const cache = forcarSemCache ? {} : carregarCache();
  const h = hashEvidencias(evidencias);
  if (!forcarSemCache && cache[h]) return cache[h];

  let bruta;
  try { bruta = await chamarQwen(t, valor, evidencias); }
  catch (e) { console.log('[REFLEXAO] erro qwen:', e.message); return null; }

  const frase = limparFrase(bruta);
  if (!frase) return null;

  if (!forcarSemCache) {
    cache[h] = frase;
    salvarCache(cache);
  }
  return frase;
}

function limparCache() {
  try { fs.writeFileSync(CACHE_PATH, '{}', 'utf8'); return true; }
  catch (e) { return false; }
}

module.exports = { gerarReflexao, limparCache, limparFrase, hashEvidencias, CACHE_PATH };
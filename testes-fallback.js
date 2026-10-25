'use strict';
// Fallback Groq -> Ollama local (cerebro.js). fetch e mockado: nenhuma chamada de rede real.
const assert = require('assert');
const cerebro = require('./cerebro'), { novo } = require('./estado-v2'), { acoes } = require('./motor-v2');
const { montarContexto } = require('./cerebro-personagem');
(async () => {
  const e = novo(), s = e.seres.maria, poss = acoes(e, s), ctx = montarContexto(e, s, poss, null);
  const fetchOrig = global.fetch, env = { ...process.env };
  const restaurar = () => { global.fetch = fetchOrig; for (const k of ['ILHA_LLM_PROVIDER', 'GROQ_API_KEY', 'ILHA_SEM_FALLBACK']) { if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k]; } };
  const resp = j => ({ ok: true, status: 200, json: async () => j });
  const ok = acao => ({ message: { content: JSON.stringify({ acao, motivo: 'teste' }) } });
  let chamadas;
  process.env.ILHA_LLM_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'x';
  try {
    chamadas = []; global.fetch = async (url, o) => { chamadas.push({ url, modelo: JSON.parse(o.body).model }); if (/groq/.test(url)) throw new Error('getaddrinfo ENOTFOUND'); return resp(ok('observar')); };
    const r = await cerebro.decidir(ctx, poss, s);
    assert.equal(r.acao, 'observar'); assert.equal(chamadas.length, 2); assert(/11434/.test(chamadas[1].url)); assert.equal(chamadas[1].modelo, 'qwen3:8b');
    console.log('OK fallback: Groq fora -> decide no Ollama qwen3:8b');

    chamadas = []; global.fetch = async url => { chamadas.push(url); return /groq/.test(url) ? { ok: false, status: 503, json: async () => ({}) } : resp(ok('observar')); };
    assert.equal((await cerebro.decidir(ctx, poss, s)).acao, 'observar'); assert.equal(chamadas.length, 2);
    console.log('OK fallback: Groq HTTP 503 -> Ollama');

    chamadas = []; global.fetch = async () => { chamadas.push(1); throw new Error('tudo fora'); };
    await assert.rejects(() => cerebro.decidir(ctx, poss, s), /tudo fora/); assert.equal(chamadas.length, 2);
    console.log('OK fallback: ambos fora -> erro original propagado');

    chamadas = []; global.fetch = async url => { chamadas.push(url); return resp({ choices: [{ message: { content: JSON.stringify({ acao: 'nao_existe', motivo: 'x' }) } }] }); };
    await assert.rejects(() => cerebro.decidir(ctx, poss, s), /fora das poss/); assert.equal(chamadas.length, 1);
    console.log('OK fallback: erro de conteudo do modelo NAO aciona fallback');

    process.env.ILHA_SEM_FALLBACK = '1'; chamadas = []; global.fetch = async () => { chamadas.push(1); throw new Error('fora'); };
    await assert.rejects(() => cerebro.decidir(ctx, poss, s)); assert.equal(chamadas.length, 1);
    console.log('OK fallback: ILHA_SEM_FALLBACK=1 desliga');
    console.log('RESULTADO FALLBACK 5 testes OK');
  } finally { restaurar(); }
})().catch(e => { console.error('FALHA fallback:', e); process.exit(1); });

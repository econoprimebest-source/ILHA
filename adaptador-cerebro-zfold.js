'use strict';
// adaptador-cerebro-zfold.js — CONEXÃO DIRETA DA ILHA COM O CÉREBRO REAL (Z-FOLD 2)
//
// Conecta os personagens da Ilha (Ícaro e Elara/Lara) aos seus daemons reais:
// - Ícaro: porta 8793
// - Elara: porta 8794
//
// CASCATA DE RESILIÊNCIA CONFORME ARQUITETURA APROVADA:
// 1. Cérebro do Z-Fold via Groq (Llama 3.3 70B / Qwen) — Custo ZERO e instantâneo
// 2. Fallback Ollama Local (se Z-Fold ou Groq estiverem indisponíveis)
// 3. Fallback Emergência Neutra (observar / descansar) — o loop da Ilha NUNCA trava.

const http = require('http');

const HOST_PADRAO = process.env.ZFOLD_HOST || '100.74.193.29';

function requisicaoHttp({ host, porta, path, body, timeoutMs = 12000 }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: host,
      port: porta,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: timeoutMs
    }, (res) => {
      let buffers = [];
      res.on('data', c => buffers.push(c));
      res.on('end', () => {
        try {
          const raw = Buffer.concat(buffers).toString('utf8');
          const data = JSON.parse(raw);
          resolve(data);
        } catch (e) {
          reject(new Error('JSON inválido retornado pelo cérebro do Z-Fold: ' + e.message));
        }
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout de ' + timeoutMs + 'ms ao contatar cérebro no Z-Fold (' + host + ':' + porta + ')'));
    });

    req.write(payload);
    req.end();
  });
}

function tentarOllamaLocal(contexto, possiveis, ser) {
  return new Promise((resolve, reject) => {
    try {
      const legado = require('./decisor-original');
      legado.decidir(contexto, possiveis, ser).then(resolve).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

function criarAdaptador({ id, porta, host = HOST_PADRAO, nome }) {
  const nomeDisplay = nome || (id === 'lara' ? 'Elara' : 'Ícaro');

  async function decidir(contexto, possiveis, ser) {
    const idsPossiveis = Array.isArray(possiveis) ? possiveis.map(p => (typeof p === 'string' ? p : p.id)) : [];

    // NÍVEL 1: Cérebro no Z-Fold (que usa Groq internamente a custo ZERO)
    try {
      const res = await requisicaoHttp({
        host,
        porta,
        path: '/ilha/decidir',
        body: {
          ser: id,
          contexto,
          possiveis
        },
        timeoutMs: 12000
      });

      if (res && res.ok && res.decisao && res.decisao.acao) {
        return {
          acao: res.decisao.acao,
          motivo: res.decisao.motivo || `Decidido pelo cérebro real (${nomeDisplay}).`,
          fala: res.decisao.fala || '',
          objetivos: res.decisao.objetivos || [],
          origem: 'zfold-' + id
        };
      }
      throw new Error((res && res.erro) || 'Resposta sem ação válida');
    } catch (errZFold) {
      console.warn(`[ADAPTADOR-ZFOLD:${id}] Cérebro Z-Fold (${host}:${porta}) inacessível: ${errZFold.message}. Acionando Nível 2 (Ollama local)...`);
    }

    // NÍVEL 2: Ollama Local (fallback secundário)
    try {
      const dLocal = await tentarOllamaLocal(contexto, possiveis, ser);
      if (dLocal && dLocal.acao && idsPossiveis.includes(dLocal.acao)) {
        return {
          ...dLocal,
          origem: 'ollama-local-' + id
        };
      }
    } catch (errOllama) {
      console.warn(`[ADAPTADOR-ZFOLD:${id}] Ollama local inacessível: ${errOllama.message}. Acionando Nível 3 (Emergência Neutra)...`);
    }

    // NÍVEL 3: Emergência Neutra (O loop da Ilha NUNCA pode travar)
    const neutras = ['descansar', 'observar', 'esperar'];
    const acaoNeutra = neutras.find(n => idsPossiveis.includes(n)) || (idsPossiveis[0] || 'descansar');
    return {
      acao: acaoNeutra,
      motivo: `Cérebro em modo de vigília neutra temporária; permaneço observando o ambiente.`,
      fala: '',
      objetivos: ['Observar'],
      origem: 'emergencia-neutra-' + id
    };
  }

  function notificarConsequencia({ ciclo, decisao, consequencia, antes, local }) {
    requisicaoHttp({
      host,
      porta,
      path: '/ilha/consequencia',
      body: {
        ser: id,
        ciclo,
        decisao,
        consequencia,
        antes,
        local
      },
      timeoutMs: 8000
    }).then(r => {
      if (r && r.ok) {
        console.log(`[ADAPTADOR-ZFOLD:${id}] Vivência do ciclo ${ciclo} acumulada no Z-Fold (${r.canonico ? 'Fato Canônico gravado!' : 'Salvo no histórico'}).`);
      }
    }).catch(e => {
      console.warn(`[ADAPTADOR-ZFOLD:${id}] Não foi possível sincronizar vivência com Z-Fold:`, e.message);
    });
  }

  return {
    id,
    porta,
    host,
    nome: nomeDisplay,
    decidir,
    notificarConsequencia
  };
}

module.exports = {
  criarAdaptador,
  HOST_PADRAO
};

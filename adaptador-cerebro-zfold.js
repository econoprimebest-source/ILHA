'use strict';
// adaptador-cerebro-zfold.js — CONEXÃO DA ILHA COM A CENTRAL OFICIAL (S23 + PC)
//
// Conecta os personagens da Ilha (Ícaro e Elara/Lara) aos seus daemons centrais:
// - Ícaro: porta 8793 (Central S23: 100.117.219.66 ou PC: 127.0.0.1)
// - Elara: porta 8794 (Central S23: 100.117.219.66 ou PC: 127.0.0.1)
//
// CASCATA DE RESILIÊNCIA:
// 1. Central Oficial no S23/PC via rota /ilha/decidir (com suporte a failover)
// 2. Fallback Cérebro Local (Groq qwen3.8-27b / Ollama)
// 3. Fallback Emergência Neutra (observar / descansar) — o loop da Ilha NUNCA trava.

const http = require('http');

// A Central Oficial reside no S23 (100.117.219.66). O Z-Fold 2 (100.74.193.29) hospeda a ILHA.
const HOST_CENTRAL_S23 = process.env.CENTRAL_HOST || process.env.ICARO_HOST || '100.117.219.66';
const HOST_PADRAO = HOST_CENTRAL_S23;

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
          reject(new Error('JSON inválido retornado pelo cérebro (' + host + ':' + porta + '): ' + e.message));
        }
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout de ' + timeoutMs + 'ms ao contatar (' + host + ':' + porta + ')'));
    });

    req.write(payload);
    req.end();
  });
}

async function tentarCerebroLocal(contexto, possiveis, ser) {
  const cerebro = require('./cerebro');
  return await cerebro.decidir(contexto, possiveis, ser);
}

function criarAdaptador({ id, porta, host = HOST_PADRAO, nome }) {
  const nomeDisplay = nome || (id === 'lara' || id === 'elara' ? 'Elara' : 'Ícaro');
  const hostsTentativa = [host];
  const pcHost = process.env.PC_HOST || '100.95.183.57';
  if (!hostsTentativa.includes(pcHost)) {
    hostsTentativa.push(pcHost); // Failover direto para PC Tailscale (100.95.183.57) se S23 não responder
  }
  if (!hostsTentativa.includes('127.0.0.1')) {
    hostsTentativa.push('127.0.0.1'); // Fallback para localhost
  }

  async function decidir(contexto, possiveis, ser) {
    const idsPossiveis = Array.isArray(possiveis) ? possiveis.map(p => (typeof p === 'string' ? p : p.id)) : [];

    // NÍVEL 1: Central Oficial (S23 com failover para PC local)
    for (const h of hostsTentativa) {
      try {
        const res = await requisicaoHttp({
          host: h,
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
          // Se o daemon remoto estiver preso em resposta estática de vigília repetitiva, aciona nível 2
          if (typeof res.decisao.motivo === 'string' && res.decisao.motivo.includes('aguardar e observar atentamente')) {
            throw new Error('Central em resposta estática de vigília');
          }
          return {
            acao: res.decisao.acao,
            motivo: res.decisao.motivo || `Decidido pela Central (${nomeDisplay}).`,
            fala: res.decisao.fala || '',
            objetivos: res.decisao.objetivos || [],
            origem: 'central-' + id
          };
        }
        throw new Error((res && res.erro) || 'Resposta sem ação válida');
      } catch (errCentral) {
        console.warn(`[ADAPTADOR-CENTRAL:${id}] Host (${h}:${porta}) ${errCentral.message}.`);
      }
    }

    // NÍVEL 2: Cérebro Local (Groq qwen3.8-27b / Ollama qwen2.5:7b)
    try {
      console.log(`[ADAPTADOR-LOCAL:${id}] Acionando Nível 2 (Cérebro Local)...`);
      const dLocal = await tentarCerebroLocal(contexto, possiveis, ser);
      if (dLocal && dLocal.acao && idsPossiveis.includes(dLocal.acao)) {
        return {
          ...dLocal,
          origem: 'cerebro-local-' + id
        };
      }
    } catch (errLocal) {
      console.warn(`[ADAPTADOR-LOCAL:${id}] Cérebro local falhou: ${errLocal.message}. Acionando Nível 3 (Emergência Neutra)...`);
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

  // FILA DE MEMÓRIAS PENDENTES: vivências de Ícaro/Elara na ilha que ainda não
  // chegaram na Central S23. São reenviadas a cada nova notificação até serem
  // entregues (máx 200 na fila para não crescer indefinidamente).
  const filaMemoria = [];

  function filaPush(registro){
    filaMemoria.push(registro);
    if(filaMemoria.length>200)filaMemoria.shift();
  }

  async function enviarFilaParaCentral(){
    if(filaMemoria.length===0)return false;
    const pendentes=[...filaMemoria];
    filaMemoria.length=0;
    const aindaPendentes=[];
    for(const reg of pendentes){
      let enviado=false;
      const payload = {
        ser: reg.ser || id,
        ciclo: reg.ciclo != null ? reg.ciclo : 0,
        local: reg.local || (reg.antes && reg.antes.local) || 'ilha',
        decisao: (typeof reg.decisao === 'object' && reg.decisao !== null) ? reg.decisao : { acao: reg.decisao || 'observar' },
        consequencia: reg.consequencia || {},
        antes: reg.antes || {}
      };
      for(const h of hostsTentativa){
        try{
          const res = await requisicaoHttp({
            host:h, porta, path:'/ilha/consequencia',
            body: payload,
            timeoutMs:6000
          });
          if (res && (res.ok || res.canonico !== undefined)) {
            enviado=true;
            break;
          }
        }catch(e){}
      }
      if(!enviado)aindaPendentes.push(reg);
    }
    if(aindaPendentes.length)filaMemoria.unshift(...aindaPendentes);
    return aindaPendentes.length===0;
  }

  async function notificarConsequencia(dados = {}) {
    // DESTILAÇÃO EM JSONL ISOLADA: vivências da simulação são salvas localmente
    // Nenhuma sobrescrita concorrente em memoria-v2.json nem memoria-elara.json
    try {
      const fs = require('fs');
      const path = require('path');
      const entidade = (id === 'lara' || id === 'elara') ? 'elara' : 'icaro';
      const arqVivenciasLocal = path.join(__dirname, `vivencias-ilha-${entidade}.jsonl`);
      const arqVivenciasGeral = path.join(__dirname, 'vivencias-ilha.jsonl');

      const registro = {
        timestamp: new Date().toISOString(),
        ser: id,
        entidade,
        ...dados,
        decisao: (typeof dados.decisao === 'object' && dados.decisao !== null) ? { ...dados.decisao } : dados.decisao,
        consequencia: (typeof dados.consequencia === 'object' && dados.consequencia !== null) ? { ...dados.consequencia } : dados.consequencia,
        antes: (typeof dados.antes === 'object' && dados.antes !== null) ? { ...dados.antes } : dados.antes
      };

      // 1) Sempre grava localmente no Z Fold (não perde nada se a Central estiver offline)
      fs.appendFileSync(arqVivenciasLocal, JSON.stringify(registro) + '\n', 'utf8');
      fs.appendFileSync(arqVivenciasGeral, JSON.stringify(registro) + '\n', 'utf8');
      console.log(`[ILHA:VIVENCIA-ISOLADA:${id}] Ciclo ${dados.ciclo != null ? dados.ciclo : '?'} gravado em vivencias-ilha-${entidade}.jsonl.`);

      // 2) Enfia para envio à Central S23 (memória de Ícaro e Elara no S23)
      filaPush(registro);

      // 3) Tenta entregar a fila imediatamente (S23 via Tailscale, ou PC failover)
      try{ await enviarFilaParaCentral(); }catch(e){/* fila mantida para próxima tentativa */}

    } catch (eLocal) {
      console.warn(`[ILHA:VIVENCIA-ISOLADA:${id}] Falha ao gravar vivência local:`, eLocal.message);
    }
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

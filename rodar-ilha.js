'use strict';
require('./memoria-personagem').ativar();
const il = require('./ilha');
const { rodada } = require('./rodada-autonoma');
const { gravar, anexar } = require('./persistencia-v2');
const diretor = require('./diretor-llm');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ARQ = il.ARQ_ESTADO;
const LOG = il.ARQ_LOG;
const INTERVALO = Number(process.env.ILHA_INTERVALO || 5000);

// CAMADA COGNITIVA — OPT-IN (`ILHA_COG=1`)
const COG = process.env.ILHA_COG === '1';
let cogMod = null, cerebros = null, cerebrosIds = '';
if (COG) {
  try {
    cogMod = require('./cerebro-cognitivo');
    require('./cognicao').ativar();
    console.log('[COG] camada cognitiva ON (ILHA_COG=1)');
  } catch (e) {
    console.error('[COG] camada indisponível seguindo sem ela:', e && e.message);
    cogMod = null;
  }
}

function cerebrosDe(estado) {
  if (!cogMod) return undefined;
  const ids = Object.keys(estado.seres || {}).sort().join(',');
  if (!cerebros || cerebrosIds !== ids) {
    cerebros = cogMod.criarTodos(ids.split(',').filter(Boolean));
    cerebrosIds = ids;
  }
  return cerebros;
}

const MARCADOR = path.join(__dirname, 'reinicio.pendente');
const FILA_INTERV = path.join(__dirname, 'intervencoes-fila.json');
const acontecimentos = require('./acontecimentos');
const missoes = require('./missoes');

function aplicarFilaIntervencoes(estado) {
  try {
    if (!fs.existsSync(FILA_INTERV)) return;
    const texto = fs.readFileSync(FILA_INTERV, 'utf8').trim();
    if (!texto) return;
    const lista = JSON.parse(texto);
    fs.writeFileSync(FILA_INTERV, '[]', 'utf8');
    if (Array.isArray(lista)) {
      for (const op of lista) {
        try {
          const ev = acontecimentos.intervir(estado, op);
          console.log('[DIRETOR] Intervenção aplicada no mundo (' + (op.origem || 'espectador') + '): ' + ev.tipo + ' em ' + ev.locais.join(',') + (ev.mensagem ? ' -> "' + ev.mensagem + '"' : ''));
        } catch (e) {
          console.error('[DIRETOR] Intervenção ignorada:', e.message);
        }
      }
    }
  } catch (e) {}
}

function marcadorAtivo() {
  try {
    if (!fs.existsSync(MARCADOR)) return false;
    const idade = Date.now() - fs.statSync(MARCADOR).mtimeMs;
    if (idade > 60000) {
      fs.unlinkSync(MARCADOR);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------------
// TRAVA DE BILOCAÇÃO E AGENDAMENTO NOTURNO / ON-DEMAND (Etapa 3)
// -------------------------------------------------------------
let ultimoMotivoPausa = '';

function checarTravaBilocacao() {
  return new Promise((resolve) => {
    // 1. Tenta checar o arquivo local estado-presenca.json se estiver na mesma máquina
    const arqPresencaLocal = path.join(__dirname, '..', 'icaro-clean', 'estado-presenca.json');
    if (fs.existsSync(arqPresencaLocal)) {
      try {
        const est = JSON.parse(fs.readFileSync(arqPresencaLocal, 'utf8'));
        const agora = Date.now();
        const mins = (agora - (est.ultimaInteracaoExterna || 0)) / 60000;
        let hora = new Date().getHours();
        try {
          const horaStr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', hour: 'numeric', hour12: false }).format(new Date());
          hora = parseInt(horaStr, 10);
        } catch (_) {}
        const ehNoite = (hora >= 23 || hora < 7);

        if (est.modoIlha === 'pausado') return resolve({ autorizado: false, motivo: 'PAUSADO_MANUALMENTE' });
        if (est.estudioAtivo) return resolve({ autorizado: false, motivo: 'PAUSADO_PRESENCA_EXTERNA: Estúdio de podcast em uso ativo.' });
        if (mins < 10) return resolve({ autorizado: false, motivo: `PAUSADO_PRESENCA_EXTERNA: Interação recente no ${est.ultimoTraje || 'aparelho'} há ${Math.round(mins)} min (< 10 min).` });
        if (est.modoIlha === 'on-demand') return resolve({ autorizado: true, modo: 'on-demand' });
        if (ehNoite) return resolve({ autorizado: true, modo: 'noturno' });
        return resolve({ autorizado: false, motivo: `FORA_DA_JANELA_NOTURNA (${hora}:00 em America/Bahia, janela 23:00 - 07:00). Aguardando acionamento On-Demand.` });
      } catch (_) {}
    }

    // 2. Tenta checar via HTTP na Central Oficial (S23 com fallback para PC) se rodando no Z-Fold
    const hostsChecagem = [process.env.CENTRAL_HOST || '100.117.219.66', process.env.PC_HOST || '100.95.183.57', '127.0.0.1'];
    
    (async () => {
      for (const h of hostsChecagem) {
        try {
          const resultado = await new Promise((resProm, rejProm) => {
            const req = http.get({ host: h, port: 8793, path: '/status-presenca', timeout: 3000 }, res => {
              if (res.statusCode >= 400) return rejProm(new Error('Status ' + res.statusCode));
              let b = '';
              res.on('data', d => b += d);
              res.on('end', () => {
                try {
                  const est = JSON.parse(b);
                  resProm(est);
                } catch (e) { rejProm(e); }
              });
            });
            req.on('error', rejProm);
            req.on('timeout', () => { req.destroy(); rejProm(new Error('timeout')); });
          });

          if (resultado && typeof resultado.podeRodarIlha === 'boolean') {
            if (resultado.podeRodarIlha) return resolve({ autorizado: true, modo: resultado.modoIlha });
            return resolve({ autorizado: false, motivo: resultado.motivoPausa || 'Pausado por presença externa.' });
          }
        } catch (_) {}
      }
      resolve({ autorizado: true });
    })();
  });
}

function notificarTrajeIlha(ativo) {
  const hostsNotif = [process.env.CENTRAL_HOST || '100.117.219.66', process.env.PC_HOST || '100.95.183.57', '127.0.0.1'];
  const payload = JSON.stringify({ emSimulacaoIlha: !!ativo });
  hostsNotif.forEach(h => {
    [8793, 8794].forEach(porta => {
      try {
        const req = http.request({
          host: h,
          port: porta,
          path: '/status-presenca',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
          timeout: 2000
        });
        req.on('error', () => {});
        req.write(payload);
        req.end();
      } catch (_) {}
    });
  });
}

let ocupado = false;
async function ciclo() {
  if (ocupado) return;
  ocupado = true;
  try {
    if (marcadorAtivo()) return;

    // Checagem de Trava de Bilocação
    const trava = await checarTravaBilocacao();
    if (!trava.autorizado) {
      if (trava.motivo !== ultimoMotivoPausa) {
        ultimoMotivoPausa = trava.motivo;
        console.log(`[TRAVA-BILOCAÇÃO] ⏸️ Loop da Ilha em pausa: ${trava.motivo}`);
      }
      return;
    }
    if (ultimoMotivoPausa) {
      console.log(`[TRAVA-BILOCAÇÃO] ▶️ Retomando simulação da Ilha (${trava.modo || 'autorizado'}).`);
      ultimoMotivoPausa = '';
    }

    notificarTrajeIlha(true);

    const estado = il.carregarEstado();
    if (diretor && estado.mundo && estado.mundo.tempo) {
      await diretor.agir(estado, estado.mundo.tempo.ciclo || 0).catch(e => console.error('[DIRETOR-LLM]', e.message));
    }
    aplicarFilaIntervencoes(estado);
    try { missoes.aplicarFila(estado); } catch (e) { console.error('[MISSOES]', e.message); }

    const r = await rodada(estado, {
      acontecimentos: true,
      ...(COG && cogMod ? { cerebros: cerebrosDe(estado) } : {})
    });

    if (marcadorAtivo()) return;
    try { missoes.tick(estado, r); } catch (e) { console.error('[MISSOES]', e.message); }

    gravar(ARQ, estado);
    r.eventos.forEach((e, ord) => anexar(LOG, {
      ciclo: r.ciclo,
      ord,
      serId: e.serId,
      nome: e.nome,
      acao: e.decisao.acao,
      motivo: e.decisao.motivo,
      ...(e.decisao.fala ? { fala: e.decisao.fala } : {}),
      local: e.localFinal,
      status: e.statusFinal,
      consequencia: e.consequencia
    }));

    console.log('CICLO ' + r.ciclo);
    for (const e of r.eventos) {
      console.log('  ' + e.nome + ' -> ' + e.decisao.acao + ' | ' + e.localFinal + ' | ' + e.decisao.motivo + (e.decisao.fala ? ' | 💬 "' + e.decisao.fala + '"' : ''));
    }
  } catch (e) {
    console.error('ERRO NA RODADA:', e.stack || e);
  } finally {
    ocupado = false;
  }
}

async function loop() {
  await ciclo();
  setTimeout(loop, INTERVALO);
}

loop();
console.log('ILHA AUTÔNOMA RODANDO — intervalo ' + INTERVALO + ' ms (Trava de Bilocação e Agendamento Noturno ativos)');

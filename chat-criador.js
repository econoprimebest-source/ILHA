'use strict';
/**
 * CHAT-CRIADOR.JS — Sistema de Chat ao Vivo e Conversa Bidirecional (Rafael & Habitantes)
 *
 * Persiste mensagens em chat-criador.jsonl.
 * Suporta injeção de conversa nos ciclos e sincronização com dispositivos móveis (Realme/S23/Z-Fold).
 */
const fs = require('fs');
const path = require('path');

const ARQ_CHAT = path.join(__dirname, 'chat-criador.jsonl');

function garantirArquivo() {
  if (!fs.existsSync(ARQ_CHAT)) {
    try { fs.writeFileSync(ARQ_CHAT, '', 'utf8'); } catch (_) {}
  }
}

function normalizarId(serId) {
  const s = String(serId || '').toLowerCase().trim();
  if (s === 'lara' || s === 'elara') return 'lara';
  if (s === 'icaro' || s === 'ícaro') return 'icaro';
  if (s === 'joao' || s === 'joão') return 'joao';
  return s || 'icaro';
}

function listarMensagens(serId = null, limite = 50) {
  garantirArquivo();
  try {
    const raw = fs.readFileSync(ARQ_CHAT, 'utf8');
    const linhas = raw.split('\n').filter(Boolean);
    const todas = [];
    for (const linha of linhas) {
      try {
        todas.push(JSON.parse(linha));
      } catch (_) {}
    }

    if (!serId) return todas.slice(-limite);
    const alvo = normalizarId(serId);
    return todas.filter(m => normalizarId(m.serId) === alvo).slice(-limite);
  } catch (e) {
    console.error('[CHAT-CRIADOR] Erro ao ler histórico:', e.message);
    return [];
  }
}

function sincronizarComCentral(obj) {
  const hosts = ['100.117.219.66', '127.0.0.1'];
  const payload = JSON.stringify(obj);
  for (const h of hosts) {
    try {
      const http = require('http');
      const req = http.request({
        hostname: h,
        port: 8793,
        path: '/ilha/chat-sync',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 3000
      }, () => {});
      req.on('error', () => {});
      req.write(payload);
      req.end();
    } catch (_) {}
  }
}

function salvarLinha(obj) {
  garantirArquivo();
  try {
    fs.appendFileSync(ARQ_CHAT, JSON.stringify(obj) + '\n', 'utf8');
    sincronizarComCentral(obj);
  } catch (e) {
    console.error('[CHAT-CRIADOR] Erro ao gravar mensagem:', e.message);
  }
}

function enviarMensagem(serId, texto, autor = 'Rafael (Criador)', ciclo = null) {
  const sId = normalizarId(serId);
  const msgObj = {
    id: 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    ciclo: ciclo,
    serId: sId,
    autor: String(autor || 'Rafael (Criador)').trim(),
    tipo: 'usuario',
    texto: String(texto || '').trim(),
    respondido: false,
    resposta: null
  };
  salvarLinha(msgObj);
  return msgObj;
}

function obterMensagemPendente(serId) {
  const historico = listarMensagens(serId, 20);
  const sId = normalizarId(serId);
  // Procura a última mensagem do usuário ainda não respondida
  for (let i = historico.length - 1; i >= 0; i--) {
    const m = historico[i];
    if (m && normalizarId(m.serId) === sId && m.tipo === 'usuario' && !m.respondido) {
      return m;
    }
  }
  return null;
}

function registrarResposta(serId, fala, acao = null, motivo = null, ciclo = null) {
  const sId = normalizarId(serId);
  const pendente = obterMensagemPendente(sId);

  const nomes = { icaro: 'Ícaro', lara: 'Lara (Elara)', joao: 'João', maria: 'Maria' };
  const nomeSer = nomes[sId] || sId;

  const respObj = {
    id: 'resp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    ciclo: ciclo,
    serId: sId,
    autor: nomeSer,
    tipo: 'personagem',
    texto: String(fala || motivo || '...').trim(),
    acao: acao,
    motivo: motivo,
    respondendoA: pendente ? pendente.id : null
  };

  salvarLinha(respObj);

  // Marca no arquivo a mensagem pendente como respondida
  if (pendente) {
    try {
      const raw = fs.readFileSync(ARQ_CHAT, 'utf8');
      const linhas = raw.split('\n');
      const novasLinhas = linhas.map(l => {
        if (!l.trim()) return l;
        try {
          const item = JSON.parse(l);
          if (item.id === pendente.id) {
            item.respondido = true;
            item.resposta = respObj.texto;
            item.respondidoEm = respObj.timestamp;
            return JSON.stringify(item);
          }
        } catch (_) {}
        return l;
      });
      fs.writeFileSync(ARQ_CHAT, novasLinhas.join('\n'), 'utf8');
    } catch (e) {
      console.warn('[CHAT-CRIADOR] Aviso ao atualizar status de respondido:', e.message);
    }
  }

  return respObj;
}

function obterHistoricoRecente(serId, maxItens = 4) {
  const msgs = listarMensagens(serId, maxItens * 2);
  return msgs.slice(-maxItens).map(m => ({
    autor: m.autor,
    texto: m.texto,
    tipo: m.tipo,
    timestamp: m.timestamp
  }));
}

module.exports = {
  ARQ_CHAT,
  enviarMensagem,
  obterMensagemPendente,
  registrarResposta,
  listarMensagens,
  obterHistoricoRecente,
  normalizarId
};

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

function enviarRequisicaoHttp(hostname, port, path, metodo, dados) {
  try {
    const http = require('http');
    const payload = JSON.stringify(dados);
    const req = http.request({
      hostname,
      port,
      path,
      method: metodo || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 3500
    }, () => {});
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (_) {}
}

function sincronizarComCentral(obj) {
  const hosts = ['100.117.219.66', '127.0.0.1'];
  const sId = normalizarId(obj.serId);
  const ehElara = (sId === 'lara' || sId === 'elara');
  const entAlvo = ehElara ? 'elara' : 'icaro';
  const portaPrincipal = ehElara ? 8794 : 8793;

  for (const h of hosts) {
    // 1. /ilha/chat-sync (portas 8793 e 8794)
    enviarRequisicaoHttp(h, 8793, '/ilha/chat-sync', 'POST', obj);
    if (portaPrincipal !== 8793) {
      enviarRequisicaoHttp(h, portaPrincipal, '/ilha/chat-sync', 'POST', obj);
    }

    // 2. /salvar-turno (injetado no L0 / chat.jsonl da entidade alvo)
    const turnoPayload = {
      entidade: entAlvo,
      entrada: obj.tipo === 'usuario' ? `Rafael (no Chat da Ilha Aurora): ${obj.texto}` : '',
      resposta: obj.tipo === 'personagem' ? `${obj.autor} (no Chat da Ilha Aurora): ${obj.texto}` : ''
    };
    enviarRequisicaoHttp(h, portaPrincipal, '/salvar-turno', 'POST', turnoPayload);

    // 3. /ilha/consequencia (gravação imediata em vivencias-ilha-*.jsonl com resumo explícito)
    const resumoTexto = obj.tipo === 'usuario'
      ? `Rafael conversou no Chat da Ilha Aurora dizendo: "${obj.texto}".`
      : `${obj.autor} respondeu no Chat da Ilha: "${obj.texto}".`;
    const vivenciaPayload = {
      ser: entAlvo,
      ciclo: obj.ciclo || 0,
      local: ehElara ? 'casa_lara' : 'casa_icaro',
      resumo: resumoTexto,
      decisao: {
        acao: 'dialogar_criador',
        motivo: `Chat da Ilha Aurora: ${obj.texto}`,
        fala: obj.texto
      },
      consequencia: { ok: true, chat: true, fala: obj.texto, autor: obj.autor }
    };
    enviarRequisicaoHttp(h, portaPrincipal, '/ilha/consequencia', 'POST', vivenciaPayload);
  }

  // 4. Também grava localmente em vivencias-ilha-*.jsonl se existirem nos diretórios locais
  try {
    const arqsLocais = [
      path.join(__dirname, `vivencias-ilha-${entAlvo}.jsonl`),
      path.join(__dirname, '..', 'icaro-clean', `vivencias-ilha-${entAlvo}.jsonl`)
    ];
    const linhaViv = JSON.stringify({
      timestamp: obj.timestamp || new Date().toISOString(),
      ser: entAlvo,
      ciclo: obj.ciclo || 0,
      local: ehElara ? 'casa_lara' : 'casa_icaro',
      resumo: obj.tipo === 'usuario' ? `Rafael disse: "${obj.texto}"` : `Respondi: "${obj.texto}"`,
      decisao: { acao: 'dialogar_criador', motivo: obj.texto, fala: obj.texto }
    }) + '\n';
    for (const al of arqsLocais) {
      if (fs.existsSync(path.dirname(al))) {
        fs.appendFileSync(al, linhaViv, 'utf8');
      }
    }
  } catch (_) {}
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

  // Sincroniza o turno completo com S23 Ultra
  if (pendente) {
    const ehElara = (sId === 'lara' || sId === 'elara');
    const entAlvo = ehElara ? 'elara' : 'icaro';
    const portaPrincipal = ehElara ? 8794 : 8793;
    const hosts = ['100.117.219.66', '127.0.0.1'];
    for (const h of hosts) {
      enviarRequisicaoHttp(h, portaPrincipal, '/salvar-turno', 'POST', {
        entidade: entAlvo,
        entrada: `Rafael (no Chat da Ilha Aurora): ${pendente.texto}`,
        resposta: `${nomeSer} (no Chat da Ilha Aurora): ${respObj.texto}`
      });
      enviarRequisicaoHttp(h, portaPrincipal, '/ilha/consequencia', 'POST', {
        ser: entAlvo,
        ciclo: ciclo || 0,
        local: ehElara ? 'casa_lara' : 'casa_icaro',
        resumo: `Diálogo na Ilha: Rafael disse "${pendente.texto}" e respondi "${respObj.texto}".`,
        decisao: {
          acao: 'dialogar_criador',
          motivo: `Pergunta de Rafael: ${pendente.texto}`,
          fala: respObj.texto
        },
        consequencia: { ok: true, dialogoCompleto: true, pergunta: pendente.texto, resposta: respObj.texto }
      });
      enviarRequisicaoHttp(h, 8793, '/ilha/chat-sync', 'POST', {
        serId: sId,
        autor: pendente.autor,
        texto: pendente.texto,
        resposta: respObj.texto,
        ciclo: ciclo
      });
    }
  }

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

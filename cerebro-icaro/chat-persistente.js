// chat-persistente.js — memoria do Icaro como chat continuo append-only.
// Fonte unica de verdade: chat.jsonl.
// Cada turno tem ID imutavel, remetente, texto, timestamp.
// Nao toca em V2/tracos/canonicalizador.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHAT_PATH = path.join(__dirname, 'chat.jsonl');

function __gerarId(quando) {
  const ts = String(quando || '').replace(/[:.]/g, '-').slice(0, 19);
  const r = crypto.randomBytes(2).toString('hex');
  return 't-' + ts + '-' + r;
}

function appendTurno(quem, texto, quando) {
  if (!quem || !texto) return null;
  const quandoIso = quando || new Date().toISOString();
  const turno = {
    id: __gerarId(quandoIso),
    quem: String(quem).toLowerCase().trim(),
    texto: String(texto).slice(0, 4000),
    quando: quandoIso
  };
  try {
    fs.appendFileSync(CHAT_PATH, JSON.stringify(turno) + '\n', 'utf8');
    return turno;
  } catch (e) {
    console.log('[CHAT] erro append:', e.message);
    return null;
  }
}

function carregarTodos() {
  if (!fs.existsSync(CHAT_PATH)) return [];
  try {
    const linhas = fs.readFileSync(CHAT_PATH, 'utf8').split('\n').filter(l => l.trim());
    const turnos = [];
    for (const l of linhas) {
      try { turnos.push(JSON.parse(l)); } catch (e) {}
    }
    return turnos;
  } catch (e) {
    console.log('[CHAT] erro leitura:', e.message);
    return [];
  }
}

function contar() {
  return carregarTodos().length;
}

// Devolve os ultimos N turnos no formato do Ollama.
// nomePessoa: quem e o interlocutor principal (vai virar role:user)
function montarHistorico(maxTurnos, nomePessoa) {
  const todos = carregarTodos();
  const n = maxTurnos || 20;
  const recentes = todos.slice(-n);
  const nomeP = String(nomePessoa || '').toLowerCase().trim();
  const out = [];
  for (const t of recentes) {
    const quem = String(t.quem || '').toLowerCase();
    if (quem === 'system') {
      out.push({ role: 'system', content: t.texto });
      continue;
    }
    const ehUsuario = quem === nomeP;
    out.push({
      role: ehUsuario ? 'user' : 'assistant',
      content: t.texto
    });
  }
  return out;
}

function resetar() {
  try {
    fs.writeFileSync(CHAT_PATH, '', 'utf8');
    return true;
  } catch (e) {
    console.log('[CHAT] erro reset:', e.message);
    return false;
  }
}

module.exports = {
  CHAT_PATH,
  appendTurno,
  carregarTodos,
  contar,
  montarHistorico,
  resetar,
  __gerarId
};

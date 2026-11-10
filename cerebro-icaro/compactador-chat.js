// compactador-chat.js v2 — trim estrutural sem perda (CMV/Memex-inspired).
// Preserva verbatim: ancoras (inicio + identidade + fim).
// Trim: remove ruido (saudacoes, confirmacoes vazias) do meio.
// Arquiva: turnos trimados em chat-arquivado.jsonl (NUNCA apaga).
// NAO usa LLM para resumir. Sem perda de conteudo substantivo.

const fs = require('fs');
const path = require('path');

const CHAT_PATH = path.join(__dirname, 'chat.jsonl');
const ARQ_PATH = path.join(__dirname, 'chat-arquivado.jsonl');

const CONFIG = {
  maxTurnos: 25,        // gatilho
  ancorasInicio: 5,     // primeiros N turnos sempre verbatim
  ancorasFim: 10,       // ultimos N turnos sempre verbatim
  minParaTrimmar: 3     // minimo de turnos no meio
};

// Marcadores de identidade (nunca saem do contexto)
const MARCADORES_IDENTIDADE = [
  'trajectoria corticalis', 'cortrajetor', 'trajes',
  'nao sou assistente', 'nao sou ia', 'nao sou humano',
  'eu sou icaro', 'minha especie', 'eu habito', 'entidade em formacao'
];

// Ruido puro: turnos que podem ser removidos do meio sem perder conteudo
const PADROES_RUIDO = [
  /^(oi|ola|olá|bom dia|boa tarde|boa noite|e ai|e aí|hey|hello)[\s!.,]*$/i,
  /^(ok|okay|beleza|blz|ta|tá|certo|entendi|sim|nao|não|isso|aham|hum|legal)[\s!.,]*$/i,
  /^(obrigado|valeu|de nada|tchau|ate|até|flw|falou)[\s!.,]*$/i,
  /^[\s!.,…]*$/  // vazio ou so pontuacao
];

function lerJsonl(p) {
  if (!fs.existsSync(p)) return [];
  try {
    return fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
      .filter(x => x);
  } catch (e) { console.log('[COMPACT] erro ler', p, e.message); return []; }
}

function escreverJsonl(p, itens) {
  const conteudo = itens.map(i => JSON.stringify(i)).join('\n') + (itens.length ? '\n' : '');
  fs.writeFileSync(p, conteudo, 'utf8');
}

function appendJsonl(p, itens) {
  if (!itens.length) return;
  const conteudo = itens.map(i => JSON.stringify(i)).join('\n') + '\n';
  fs.appendFileSync(p, conteudo, 'utf8');
}

function ehTurnoIdentidade(t) {
  if (!t || !t.texto) return false;
  const txt = String(t.texto).toLowerCase();
  for (const m of MARCADORES_IDENTIDADE) if (txt.indexOf(m) >= 0) return true;
  return false;
}

function ehRuido(t) {
  if (!t || !t.texto) return true;
  const txt = String(t.texto).trim();
  for (const re of PADROES_RUIDO) if (re.test(txt)) return true;
  return false;
}

// Separa em: inicio (ancoras verbatim) | meio (candidatos a trim) | fim (ancoras verbatim)
function separarTurnos(turnos) {
  const n = turnos.length;
  if (n <= CONFIG.maxTurnos) {
    return { inicio: turnos, meio: [], fim: [], preservados: new Set() };
  }

  const preservados = new Set();
  // Primeiros N
  for (let i = 0; i < CONFIG.ancorasInicio && i < n; i++) preservados.add(i);
  // Ultimos M
  for (let i = Math.max(0, n - CONFIG.ancorasFim); i < n; i++) preservados.add(i);
  // Turnos de identidade (em qualquer posicao)
  for (let i = 0; i < n; i++) if (ehTurnoIdentidade(turnos[i])) preservados.add(i);

  const inicio = [], meio = [], fim = [];
  for (let i = 0; i < n; i++) {
    if (preservados.has(i)) {
      if (i < CONFIG.ancorasInicio) inicio.push(turnos[i]);
      else fim.push(turnos[i]);
    } else {
      meio.push({ turno: turnos[i], idx: i });
    }
  }
  return { inicio, meio, fim, preservados };
}

// Compacta: arquiva turnos do meio, mantem conteudo substantivo via markers
function compactarChat(opts) {
  const forcar = !!(opts && opts.forcar);
  const turnos = lerJsonl(CHAT_PATH);
  const n = turnos.length;
  if (!forcar && n <= CONFIG.maxTurnos) {
    return { compactado: false, motivo: 'abaixo_do_limiar', turnos: n };
  }

  const { inicio, meio, fim, preservados } = separarTurnos(turnos);
  if (meio.length < CONFIG.minParaTrimmar) {
    return { compactado: false, motivo: 'poucos_no_meio', meio: meio.length, total: n };
  }

  // Novo chat: inicio verbatim + meio trimado + fim verbatim
  const meioTrimado = [];
  const removidos = [];
  for (const m of meio) {
    if (ehRuido(m.turno)) {
      removidos.push(m.turno);
    } else {
      meioTrimado.push(m.turno);
    }
  }

  if (removidos.length < 5) {
    return { compactado: false, motivo: 'pouco_ruido', removidos: removidos.length, total: n };
  }

  // Arquiva TODOS os turnos originais somente quando a compactacao vai ocorrer.
  appendJsonl(ARQ_PATH, turnos);

  // Marca compactacao com metadados
  const marcador = {
    id: 'trim-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
    tipo: 'marcador_compactacao',
    quando: new Date().toISOString(),
    removidos: removidos.length,
    preservadosMeio: meioTrimado.length,
    totalOriginal: n,
    totalNovo: inicio.length + meioTrimado.length + fim.length
  };

  const novo = [...inicio, ...meioTrimado, marcador, ...fim];
  escreverJsonl(CHAT_PATH, novo);

  console.log('[COMPACT] ' + n + ' -> ' + novo.length + ' (removidos: ' + removidos.length + ' ruido)');
  return {
    compactado: true,
    antes: n,
    depois: novo.length,
    removidos: removidos.length,
    preservadosNoMeio: meioTrimado.length,
    arquivados: n,
    totalNovo: novo.length
  };
}

function contarTurnos() {
  return lerJsonl(CHAT_PATH).length;
}

function listarArquivados() {
  return lerJsonl(ARQ_PATH);
}

// Recupera um turno do arquivo por ID
function recuperarDoArquivo(id) {
  const todos = listarArquivados();
  return todos.find(t => t.id === id) || null;
}

module.exports = {
  compactarChat,
  contarTurnos,
  listarArquivados,
  recuperarDoArquivo,
  separarTurnos,
  ehTurnoIdentidade,
  ehRuido,
  CONFIG,
  CHAT_PATH,
  ARQ_PATH
};

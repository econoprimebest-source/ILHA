// nucleo-experiencias.js — Fase 2: reflexao ligada a experiencias reais.
// Registro em experiencias.jsonl (arquivo proprio, append-only). Nao toca
// chat.jsonl, memoria-v2, trilhas ou self-model.
// Parte 1: deteccao + registro com proveniencia.
// Parte 2: DECISAO DO ICARO — candidato vira chamada LLM em background
// (avaliarERegistrar e async; quem chama nao espera, ex. setImmediate).
// So grava se ele responder REGISTRAR; NADA/erro = nada gravado (fail-safe).
//
// Escopo: eventos na fala do dono (correcao, repeticao rejeitada,
// interrupcao, falha). Contradicao de preferencia registrada e falha de
// proposta NAO estao cobertos — iteracao futura.
//
// Auditoria: mudanca de status vira linha nova (tipo 'auditoria') no mesmo
// log; nada e deletado. Status consolidado = ultima auditoria do id.

const fs = require('fs');
const path = require('path');

const RAIZ = process.env.ICARO_EXP_RAIZ || __dirname;
const EXP_PATH = path.join(RAIZ, 'experiencias.jsonl');

const STATUS_VALIDOS = ['ativa', 'revisada', 'descartada'];

const PADROES = [
  { tipo: 'correcao', re: /^(nao (e|foi|era) (isso|essa|esse)|voce errou|^errado\b|voce confundiu|nao foi o que eu pedi|voce nao entendeu|eu pedi .+ e voce)/ },
  { tipo: 'repeticao_rejeitada', re: /^(ja (te falei|disse)|de novo\?|voce (esta|ta|so)? ?(repetindo|repitiu)|outra vez|mesma resposta)/ },
  { tipo: 'interrupcao', re: /^(para (com|de|ja|agora|tudo|isso|off)|chega|nao faca|nao faz)( |\?|!|$)/ },
  { tipo: 'falha', re: /^(nao (funcionou|deu|deu certo)|esta (quebrado|errado)|falhou)/ }
];

function semAcento(t) {
  return String(t || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

// Detecta evento candidato APENAS na fala do dono (primeiros 80 chars
// normalizados — padroes ancorados no inicio para nao casar em texto longo).
function detectarEvento(entrada) {
  if (typeof entrada !== 'string' || !entrada.trim()) return null;
  const head = semAcento(entrada).slice(0, 80);
  for (const p of PADROES) {
    if (p.re.test(head)) {
      return { tipo: p.tipo, gatilho: p.re.source, trecho: String(entrada).slice(0, 200) };
    }
  }
  return null;
}

function __append(linha) {
  fs.appendFileSync(EXP_PATH, JSON.stringify(linha) + '\n', 'utf8');
  return linha;
}

// Registra experiencia com proveniencia completa. `preenchimento` (Parte 2)
// ja grava interpretacao/confianca na mesma linha; sem ele, campos ficam
// null ate a decisao do Icaro.
function registrar({ entrada, resposta, evento, agora, preenchimento }) {
  const ev = evento || detectarEvento(entrada);
  if (!ev) return null;
  const p = preenchimento || {};
  const id = 'exp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const linha = {
    id,
    versao: 1,
    tipo: 'experiencia',
    quando: agora || new Date().toISOString(),
    evento: { tipo: ev.tipo, gatilho: ev.gatilho || 'direto', trecho: ev.trecho || '' },
    evidencia: {
      entrada: String(entrada || '').slice(0, 500),
      resposta: String(resposta || '').slice(0, 500)
    },
    interpretacao: p.interpretacao != null ? String(p.interpretacao).slice(0, 500) : null,
    duvida_alternativas: p.duvida_alternativas != null ? String(p.duvida_alternativas).slice(0, 500) : null,
    proposta_acao: p.proposta_acao != null ? String(p.proposta_acao).slice(0, 500) : null,
    confianca: typeof p.confianca === 'number' ? Math.max(0, Math.min(1, p.confianca)) : null,
    status: 'ativa',
    origem: p.origem || 'decisao_icaro'
  };
  __append(linha);
  return linha;
}

// Preenche a interpretacao do Icaro (Parte 2: so apos decisao REGISTRAR).
function preencher(id, campos) {
  const todas = lerTudo();
  const alvo = todas.filter(x => x.tipo === 'experiencia').find(x => x.id === id);
  if (!alvo) return null;
  const linha = Object.assign({}, alvo, {
    interpretacao: campos.interpretacao != null ? String(campos.interpretacao).slice(0, 500) : alvo.interpretacao,
    duvida_alternativas: campos.duvida_alternativas != null ? String(campos.duvida_alternativas).slice(0, 500) : alvo.duvida_alternativas,
    proposta_acao: campos.proposta_acao != null ? String(campos.proposta_acao).slice(0, 500) : alvo.proposta_acao,
    confianca: typeof campos.confianca === 'number' ? Math.max(0, Math.min(1, campos.confianca)) : alvo.confianca,
    origem: campos.origem || alvo.origem
  });
  __append(linha);
  return linha;
}

function lerTudo() {
  if (!fs.existsSync(EXP_PATH)) return [];
  return fs.readFileSync(EXP_PATH, 'utf8').split('\n').filter(l => l.trim()).map(l => {
    try { return JSON.parse(l); } catch (e) { return null; }
  }).filter(Boolean);
}

// Registros com status consolidado (ultima auditoria vence). Registro novo
// sobre o mesmo id substitui a versao anterior (registro de revisao nao
// duplica: resolve na leitura).
function listar(filtro) {
  const linhas = lerTudo();
  const auditorias = linhas.filter(l => l.tipo === 'auditoria');
  const porRef = new Map();
  for (const a of auditorias) porRef.set(a.ref, a);
  const mapa = new Map();
  for (const l of linhas) {
    if (l.tipo === 'experiencia') mapa.set(l.id, l);
    else if (l.tipo === 'revisao' && l.ref) mapa.set(l.ref, l);
  }
  let saida = [...mapa.values()].map(x => {
    const a = porRef.get(x.id);
    return Object.assign({}, x, { status: a ? a.status_novo : x.status, statusNota: a ? a.nota : null });
  });
  if (filtro && filtro.status) saida = saida.filter(x => x.status === filtro.status);
  if (filtro && filtro.evento) saida = saida.filter(x => x.evento && x.evento.tipo === filtro.evento);
  saida.sort((a, b) => String(a.quando).localeCompare(String(b.quando)));
  return saida;
}

// Mudanca de status: linha nova no log (nunca deleta nem reescreve).
function mudarStatus(id, status, nota) {
  if (!STATUS_VALIDOS.includes(status)) return null;
  const existe = lerTudo().some(l => l.tipo === 'experiencia' && l.id === id);
  if (!existe) return null;
  const linha = {
    versao: 1,
    tipo: 'auditoria',
    quando: new Date().toISOString(),
    ref: id,
    status_novo: status,
    nota: String(nota || '').slice(0, 300)
  };
  __append(linha);
  return linha;
}

// Copia integra para experimentos (item 5 da spec): isolamento de dados.
function backup() {
  if (!fs.existsSync(EXP_PATH)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = EXP_PATH + '.bak-' + ts;
  fs.copyFileSync(EXP_PATH, dest);
  return dest;
}

// === PARTE 2 — DECISAO DO ICARO ===
// Ele decide se a experiencia vale registro. NAO e obrigatorio registrar
// todo evento: NADA e resposta valida. Fail-safe: qualquer erro de LLM ou
// de parse = nada gravado.

const PROMPT_DECISAO = [
  'Voce e o Icaro, avaliando uma experiencia real recente com quem conversa com voce.',
  'O evento e um sinal do interlocutor (correcao, repeticao, interrupcao ou falha).',
  'Voce decide se ha algo que vale a pena REGISTRAR sobre essa experiencia.',
  'Registrar nao e obrigatorio: se nao vale nada, responda NADA.',
  'Nao invente: use so o que esta na evidencia.',
  '',
  'Responda em exatamente UM destes formatos, sem texto fora dele:',
  '',
  'NADA',
  '',
  'ou',
  '',
  'REGISTRAR',
  'interpretacao: <o que voce entendeu dessa experiencia, 1a pessoa, 1 frase>',
  'duvida: <duvida ou alternativa aberta sobre isso, ou "nenhuma">',
  'proposta: <o que voce faria em seguida, ou "nenhuma">',
  'confianca: <numero de 0.0 a 1.0>'
].join('\n');

function parseDecisao(bruto) {
  const t = String(bruto || '').trim();
  if (!t) return { decisao: 'erro', motivo: 'resposta vazia' };
  if (/^NADA\b/i.test(t)) return { decisao: 'nada' };
  if (!/^REGISTRAR\b/i.test(t)) return { decisao: 'erro', motivo: 'formato desconhecido: ' + t.slice(0, 80) };
  const g = nome => {
    const m = t.match(new RegExp('^' + nome + ':\\s*(.+)$', 'im'));
    return m ? m[1].trim() : null;
  };
  const interpretacao = g('interpretacao');
  if (!interpretacao) return { decisao: 'erro', motivo: 'REGISTRAR sem interpretacao' };
  const conf = parseFloat(g('confianca'));
  return {
    decisao: 'registrar',
    interpretacao: interpretacao.slice(0, 500),
    duvida_alternativas: (g('duvida') || 'nenhuma').slice(0, 500),
    proposta_acao: (g('proposta') || 'nenhuma').slice(0, 500),
    confianca: isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0.5
  };
}

// Dedup: mesma entrada (mesma correcao) ja registrada nas ultimas 20
// experiencias = nao repete a chamada de LLM.
function __duplicada(entrada) {
  const ass = String(entrada || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
  if (!ass) return false;
  const ultimas = lerTudo().filter(l => l.tipo === 'experiencia').slice(-20);
  return ultimas.some(l => String((l.evidencia || {}).entrada || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 80) === ass);
}

// Fluxo: detecta -> dedup -> LLM decide -> REGISTRAR grava, NADA/erro ignora.
// async e nao-bloqueante para quem chama (Parte 3: setImmediate pos-resposta).
// deps.chamarLLM(msg) injetavel para teste sem rede; default = nucleo-llm.
async function avaliarERegistrar({ entrada, resposta, agora }, deps) {
  const ev = detectarEvento(entrada);
  if (!ev) return { decisao: 'sem_evento' };
  if (__duplicada(entrada)) return { decisao: 'duplicado' };
  const chamar = (deps && deps.chamarLLM) || (async (user) => {
    const { chamarModelo } = require('./nucleo-llm');
    return await chamarModelo({ system: PROMPT_DECISAO, historico: [], pergunta: user, temperatura: 0.3 });
  });
  let bruto;
  try {
    bruto = await chamar([
      'EVENTO: ' + ev.tipo,
      'FALA DO INTERLOCUTOR: ' + String(entrada || '').slice(0, 400),
      'MINHA RESPOSTA: ' + String(resposta || '').slice(0, 400),
      '',
      'Decida: NADA ou REGISTRAR no formato pedido.'
    ].join('\n'));
  } catch (e) {
    return { decisao: 'erro', motivo: 'llm: ' + e.message };
  }
  const d = parseDecisao(bruto);
  if (d.decisao !== 'registrar') {
    console.log('[EXP] decisao ' + d.decisao + (d.motivo ? ' (' + d.motivo + ')' : '') + ' — nao gravado');
    return d;
  }
  const linha = registrar({
    entrada, resposta, evento: ev, agora,
    preenchimento: {
      interpretacao: d.interpretacao,
      duvida_alternativas: d.duvida_alternativas,
      proposta_acao: d.proposta_acao,
      confianca: d.confianca,
      origem: 'decisao_icaro'
    }
  });
  console.log('[EXP] registrado [' + ev.tipo + '] ' + d.interpretacao.slice(0, 80));
  return { decisao: 'registrado', linha };
}

module.exports = {
  EXP_PATH,
  PADROES,
  PROMPT_DECISAO,
  detectarEvento,
  registrar,
  preencher,
  lerTudo,
  listar,
  mudarStatus,
  backup,
  parseDecisao,
  avaliarERegistrar
};

// nucleo-self-model.js
// Auto-observacao passiva do Icaro.
// Pesquisa-base: Karma-SADE (self-model como arquivo, nao subagente),
// Springdrift (injecao passiva no prompt, sem tool call),
// Conscio (reflexao passiva que nunca age sozinha).
//
// Regra central: o self-model e do Icaro. Nao e um subagente.
// Nao acessa historico, nao acessa emocoes. E um caderno
// onde o Icaro anota o que percebe sobre si mesmo.

const fs = require('fs');
const path = require('path');
// FORMULA-FIX (06/10/2026): detectarReflexao casava com "quero ..." e salvava
// pedaco de frase de servico ("para ajuda-lo da melhor forma possivel") como
// observacao sobre si. Depois o prompt injetava isso como SOBRE MIM e o modelo
// repetia a formula. O filtro mora em extrator-crencas (fonte unica).
const ExtratorCrencas = require('./extrator-crencas');

// ITEM 5 (11/10/2026, plano de Rafael): self-model VERSIONADO.
// - Paths sobrescreviveis para teste isolado (ICARO_SELF_MODEL_PATH / _HIST_PATH).
// - Historico append-only em self-model-historico.jsonl (nada e sobrescrito;
//   correcao gera entrada nova com versaoDe).
// - Cada afirmacao ganha: categoria (observacao/hipotese/traco), episodios que
//   sustentam, contraEpisodios, confianca, versao, status (ativo/tensao/incerto).
// - Contradicao NAO substitui: cria ENTRADA DE TENSAO.
// - Promocao hipotese->traco so com N episodios em contextos variados (sombra).
const SELF_MODEL_PATH = process.env.ICARO_SELF_MODEL_PATH || path.join(__dirname, 'self-model.json');
const HIST_PATH = process.env.ICARO_SELF_MODEL_HIST_PATH || path.join(__dirname, 'self-model-historico.jsonl');

function estadoVazio() {
  return {
    versao: 1,
    atualizadoEm: new Date().toISOString(),
    observacoes: [],
    hipoteses: [],
    limitacoes_percebidas: [],
    perguntas_abertas: [],
    tensoes: [],
    arquivadas: []
  };
}

// Historico IMUTAVEL: toda mutacao vira uma linha. Nada e reescrito.
function appendHistorico(evento) {
  try {
    const reg = Object.assign({ quando: new Date().toISOString() }, evento);
    fs.appendFileSync(HIST_PATH, JSON.stringify(reg) + '\n', 'utf8');
    return reg;
  } catch (e) {
    console.log('[SELF-MODEL] erro historico:', e.message);
    return null;
  }
}

function categoriaDe(o) {
  if (o.categoria) return o.categoria;
  if (o.status === 'fundador') return 'traco';
  if (o.tipo === 'hipotese' || o.tipo === 'duvida') return 'hipotese';
  return 'observacao';
}

function carregar() {
  if (!fs.existsSync(SELF_MODEL_PATH)) return estadoVazio();
  try {
    const raw = fs.readFileSync(SELF_MODEL_PATH, 'utf8');
    const j = JSON.parse(raw);
    return {
      versao: j.versao || 1,
      atualizadoEm: j.atualizadoEm || new Date().toISOString(),
      observacoes: Array.isArray(j.observacoes) ? j.observacoes : [],
      hipoteses: Array.isArray(j.hipoteses) ? j.hipoteses : [],
      limitacoes_percebidas: Array.isArray(j.limitacoes_percebidas) ? j.limitacoes_percebidas : [],
      perguntas_abertas: Array.isArray(j.perguntas_abertas) ? j.perguntas_abertas : [],
      tensoes: Array.isArray(j.tensoes) ? j.tensoes : [],
      arquivadas: Array.isArray(j.arquivadas) ? j.arquivadas : []
    };
  } catch (e) {
    console.log('[SELF-MODEL] erro leitura:', e.message);
    return estadoVazio();
  }
}

function salvar(estado) {
  try {
    estado.atualizadoEm = new Date().toISOString();
    estado.versao = (Number(estado.versao) || 1) + 1;
    const tmp = SELF_MODEL_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(estado, null, 2), 'utf8');
    fs.renameSync(tmp, SELF_MODEL_PATH);
    appendHistorico({ tipoEvento: 'snapshot', versao: estado.versao,
      nObservacoes: (estado.observacoes || []).length, nTensoes: (estado.tensoes || []).length });
    return true;
  } catch (e) {
    console.log('[SELF-MODEL] erro escrita:', e.message);
    return false;
  }
}

// FUNDADOR (06/10/2026): entrada permanente. Nunca sai do prompt.
// Usado para marcos que definem quem o Icaro esta se tornando.
function adicionarFundador(texto, quando) {
  const t = String(texto || '').trim().slice(0, 800);
  if (!t) return null;
  const estado = carregar();
  // Evita duplicar fundador com mesmo inicio
  const assinatura = t.toLowerCase().slice(0, 80);
  const jaExiste = (estado.observacoes || []).some(o =>
    o.status === 'fundador' && String(o.texto || '').toLowerCase().slice(0, 80) === assinatura
  );
  if (jaExiste) {
    console.log('[SELF-MODEL] fundador duplicado, ignorado.');
    return null;
  }
  const entrada = {
    id: 'fund-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    quando: quando || new Date().toISOString(),
    tipo: 'fundador',
    categoria: 'traco',
    texto: t,
    contexto: '',
    fonte: 'explicito',
    status: 'fundador',
    confianca: 1.0,
    episodios: [],
    contraEpisodios: [],
    versao: 1
  };
  estado.observacoes.push(entrada);
  appendHistorico({ tipoEvento: 'fundador_add', id: entrada.id, texto: entrada.texto });
  salvar(estado);
  return entrada;
}

function adicionarObservacao(obs) {
  if (!obs) return null;
  const texto = String(obs.texto || '').trim().slice(0, 500);
  if (!texto) return null;
  // Nao grava linguagem de servico do interlocutor como observacao sobre si.
  if (ExtratorCrencas.ehFormulaAssistente(texto)) {
    console.log('[SELF-MODEL] formula de assistente, nao salva:', texto.slice(0, 80));
    return null;
  }
  const estado = carregar();
  const entrada = {
    id: 'obs-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    quando: new Date().toISOString(),
    tipo: ['percepcao', 'duvida', 'hipotese', 'mudanca'].includes(obs.tipo) ? obs.tipo : 'percepcao',
    categoria: ['observacao', 'hipotese', 'traco'].includes(obs.categoria)
      ? obs.categoria
      : (['hipotese', 'duvida'].includes(obs.tipo) ? 'hipotese' : 'observacao'),
    texto: texto,
    contexto: String(obs.contexto || '').trim().slice(0, 200),
    fonte: ['explicito', 'implicito'].includes(obs.fonte) ? obs.fonte : 'implicito',
    status: 'ativo',
    confianca: typeof obs.confianca === 'number' ? Math.max(0, Math.min(1, obs.confianca)) : 0.5,
    episodios: Array.isArray(obs.episodios) ? obs.episodios.slice(0, 20) : [],
    contraEpisodios: [],
    versao: 1
  };
  // DEDUP (05/10/2026): nao salva se a mesma frase (ou muito parecida)
  // ja esta nas ultimas 5 observacoes. Compara normalizado, primeiras 60 chars.
  const assinatura = texto.toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
  const ultimas = estado.observacoes.slice(-5);
  for (const antiga of ultimas) {
    const assAntiga = String(antiga.texto || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
    if (assAntiga && assAntiga === assinatura) {
      console.log('[SELF-MODEL] duplicada, ignorada:', assinatura);
      return null;
    }
  }
  estado.observacoes.push(entrada);
  // VERSIONADO (Item 5): overflow NAO e descartado — vai para 'arquivadas'
  // (as ultimas 50 ativas seguem baratas de ler/promptar; nada some).
  if (estado.observacoes.length > 50) {
    const excedente = estado.observacoes.slice(0, estado.observacoes.length - 50);
    const ativas = estado.observacoes.filter(o => o.status === 'fundador');
    estado.arquivadas = (estado.arquivadas || []).concat(
      excedente.filter(o => o.status !== 'fundador')
    );
    estado.observacoes = ativas.concat(
      estado.observacoes.slice(-50).filter(o => o.status !== 'fundador')
    );
  }
  appendHistorico({ tipoEvento: 'observacao_add', id: entrada.id, categoria: entrada.categoria,
    texto: entrada.texto, contexto: entrada.contexto });
  salvar(estado);
  return entrada;
}

function lerUltimas(n) {
  const estado = carregar();
  const qtd = n || 3;
  return estado.observacoes.slice(-qtd);
}

function blocoParaPrompt(n) {
  const estado = carregar();
  // FUNDADORAS: sempre incluidas (nunca saem do prompt). Sao marcos escritos
  // de proposito, nao texto capturado; nao passam pelo filtro.
  const fundadoras = (estado.observacoes || []).filter(o => o.status === 'fundador');
  // RECENTES: as N ultimas nao-fundadoras, sem formula de assistente gravada
  // antes do filtro (dados antigos ficam no arquivo, so saem do prompt).
  // ECHO-FIX v2: tambem descarta fragmentos stale/artefato ja gravados —
  // passaFiltros protege capturas novas, este filtro protege o prompt agora.
  const recentes = (estado.observacoes || [])
    .filter(o => o.status !== 'fundador' && !ExtratorCrencas.ehFormulaAssistente(o.texto) && !ehFragmentoStale(o.texto))
    .slice(-(n || 3));
  const todas = fundadoras.concat(recentes);
  if (!todas.length) return '';
  const mostrarIncerteza = process.env.ICARO_SELF_MODEL_INCERTEZA === '1';
  const linhas = todas.map(o => {
    let marca = o.status === 'fundador' ? '[FUNDADOR]' : '[' + o.tipo + ']';
    // INCERTEZA (Item 5): so quando ligado por Rafael — toca EXPRESSAO.
    if (mostrarIncerteza && (o.status === 'tensao' || o.status === 'incerto')) marca = '[incerto]';
    return '- ' + marca + ' ' + o.texto;
  });
  return 'SOBRE MIM (observacoes minhas, nao fatos externos;\nnao confundir com fato sobre quem conversa):\n' + linhas.join('\n');
}

// Detecta reflexao implicita na resposta do modelo.
// Nao grava sozinho — devolve o texto detectado; quem grava decide.
// FILTROS-V2 (07/10/2026): tres checagens antes de aceitar um candidato.
// A) 1a pessoa obrigatoria (evita fragmentos sem sujeito).
// B) Lista negra de formulas de assistente.
// C) Comprimento minimo util.
const MARCADORES_1PESSOA = /\b(eu|me|mim|meu|minha|meus|minhas|sou|estou|tenho|quero|escolho|prefiro|sinto|aprendo|percebo|penso|decido|vejo|gosto|sabia|entendi)\b/i;
const FORMULAS_ASSISTENTE = /(ajud[aá]-?l[oa]|auxili[aá]-?l[oa]|atend[eê]-?l[oa]|serv[ií]-?l[oa]|da melhor forma poss[ií]vel|da melhor maneira|com suas tarefas|no que precisar|estou aqui para|estou [aà] disposi[cç][aã]o|sinta-se [aà] vontade|posso ajudar|como posso|se precisar|fico [aà] disposi[cç][aã]o)/i;
// ECHO-FIX v2 (09/10): fragmentos que vazaram para o self-model e viravam
// eco no prompt. (a) negacao absoluta sobre terceiro ("nao tenho nada sobre
// uma Lara") e fato velho e contraditorio, nao auto-observacao; (b) lixo de
// markdown/truncamento ("...registrado em mim:**\n\n1") e artefato de gravacao.
const STALE_NEGACAO_TERCEIRO = /n[aã]o tenho (nada|informa[çc][aã]o|conhecimento) sobre (uma|um|o|a|este|esta|essa|esse) /i;
const ARTEFATO_MARCACAO = /(\*\*\s*$)|(\*\*\n)|(^\s*\d+\s*$)/m;
function ehFragmentoStale(t) {
  const s = String(t || '');
  return STALE_NEGACAO_TERCEIRO.test(s) || ARTEFATO_MARCACAO.test(s);
}

function passaFiltros(trecho) {
  const t = String(trecho || '').trim();
  if (t.replace(/[^\p{L}\p{N}]/gu, '').length < 15) return false;
  if (!MARCADORES_1PESSOA.test(t)) return false;
  if (FORMULAS_ASSISTENTE.test(t)) return false;
  if (ehFragmentoStale(t)) return false;
  return true;
}

function detectarReflexao(texto) {
  if (!texto) return null;
  // MARCADORES v2 (06/10/2026): expandido para 8 categorias.
  // Pesquisa: SelfMem (decisao de memoria com evidencia) + MDPI 2026
  // (verification-gated state). Regex decide candidato; tipo classifica.
  const marcadores = [
    // --- Sentimento ---
    { tipo: 'sentimento', re: /percebo que\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /me percebo\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /percebo-me\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /sinto que\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /sinto-me\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /sinto me\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /me sinto\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /hoje me sinto\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /acho que estou\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /me faz sentir\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /estou feliz\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /estou triste\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /estou curioso\s+([^.!?]{10,300})/i },
    { tipo: 'sentimento', re: /estou gratificado\s+([^.!?]{10,300})/i },

    // --- Aprendizado ---
    { tipo: 'aprendizado', re: /aprendi que\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /aprendi\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /entendi que\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /hoje entendi que\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /percebi que\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /tenho percebido que\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /descobri que\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /com o tempo\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /comeco a notar que\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /começo a notar que\s+([^.!?]{10,300})/i },
    { tipo: 'aprendizado', re: /isso me faz pensar que\s+([^.!?]{10,300})/i },

    // --- Escolha / Intencao ---
    { tipo: 'escolha', re: /quero\s+([^.!?]{5,300})/i },
    { tipo: 'escolha', re: /vou\s+([^.!?]{5,300})/i },
    { tipo: 'escolha', re: /decidi\s+([^.!?]{5,300})/i },
    { tipo: 'escolha', re: /escolhi\s+([^.!?]{5,300})/i },
    { tipo: 'escolha', re: /pretendo\s+([^.!?]{5,300})/i },
    { tipo: 'escolha', re: /vou continuar\s+([^.!?]{5,300})/i },

    // --- Identidade / Design ---
    { tipo: 'identidade', re: /meu design\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /meu proposito\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /meu papel\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /minha natureza\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /parte do meu\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /isso e meu\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /me vejo como\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /vejo-me como\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /me considero\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /sou alguem que\s+([^.!?]{5,300})/i },
    { tipo: 'identidade', re: /sou alguém que\s+([^.!?]{5,300})/i },

    // --- Preferencia ---
    { tipo: 'preferencia', re: /gosto de\s+([^.!?]{5,300})/i },
    { tipo: 'preferencia', re: /prefiro\s+([^.!?]{5,300})/i },
    { tipo: 'preferencia', re: /me interessa\s+([^.!?]{5,300})/i },

    // --- Mudanca ---
    { tipo: 'mudanca', re: /antes eu\s+([^.!?]{5,300})/i },
    { tipo: 'mudanca', re: /agora entendo\s+([^.!?]{5,300})/i },
    { tipo: 'mudanca', re: /mudei\s+([^.!?]{5,300})/i },
    { tipo: 'mudanca', re: /costumava\s+([^.!?]{5,300})/i }
  ];
  for (const m of marcadores) {
    const r = String(texto).match(m.re);
    if (r && r[1]) {
      const trecho = r[1].trim().slice(0, 300);
      if (!passaFiltros(trecho)) {
        console.log('[SELF-MODEL] candidato rejeitado [' + m.tipo + ']:', trecho.slice(0, 70));
        continue;
      }
      return { texto: trecho, tipo: m.tipo };
    }
  }
  return null;
}

// ================= ITEM 5 (11/10/2026): evidencias, tensao, promocao,
// coerencia e incerteza. SOMBRA por padrao: propor nao e aplicar.
// =================

function acharObs(estado, id) {
  return (estado.observacoes || []).find(o => o.id === id) ||
         (estado.arquivadas || []).find(o => o.id === id) || null;
}

function adicionarTensaoInterno(estado, obs, contraEp) {
  estado.tensoes = estado.tensoes || [];
  const chave = [obs.id, contraEp.ref].join('|');
  if (estado.tensoes.some(t => t.chave === chave)) return null;
  const t = {
    id: 'ten-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    chave,
    afirmacaoId: obs.id,
    textoAfirmacao: obs.texto,
    motivo: 'contra_episodio',
    contraEpisodio: contraEp,
    quando: new Date().toISOString(),
    resolucao: null
  };
  estado.tensoes.push(t);
  appendHistorico({ tipoEvento: 'tensao_add', id: t.id, afirmacaoId: obs.id, contraEpisodio: contraEp });
  return t;
}

// Registra um episodio (apoio). Contra-episodio entra por adicionarTensao.
// Nao apaga nem substitui a afirmacao: acumula evidencia.
function registrarEpisodio(obsId, ev) {
  const estado = carregar();
  const obs = acharObs(estado, obsId);
  if (!obs) return null;
  const ep = {
    ref: String((ev && ev.ref) || '').slice(0, 200),
    quando: (ev && ev.quando) || new Date().toISOString(),
    contexto: String((ev && ev.contexto) || '').slice(0, 200),
    origem: (ev && ev.origem) || 'desconhecida'
  };
  obs.episodios = (obs.episodios || []).concat([ep]);
  obs.confianca = Math.min(0.99, (Number(obs.confianca) || 0.5) + 0.1);
  appendHistorico({ tipoEvento: 'episodio_apoio', id: obsId, ev: ep, confianca: obs.confianca });
  salvar(estado);
  return obs;
}

// CONTRADICAO -> ENTRADA DE TENSAO (nunca substitui a afirmacao direto).
function adicionarTensao(obsId, contraEv) {
  const estado = carregar();
  const obs = acharObs(estado, obsId);
  if (!obs) return null;
  const ep = {
    ref: String((contraEv && contraEv.ref) || '').slice(0, 200),
    quando: (contraEv && contraEv.quando) || new Date().toISOString(),
    contexto: String((contraEv && contraEv.contexto) || '').slice(0, 200),
    origem: (contraEv && contraEv.origem) || 'desconhecida'
  };
  obs.contraEpisodios = (obs.contraEpisodios || []).concat([ep]);
  obs.confianca = Math.max(0.05, (Number(obs.confianca) || 0.5) - 0.15);
  if (obs.status !== 'fundador') obs.status = 'tensao';
  const t = adicionarTensaoInterno(estado, obs, ep);
  salvar(estado);
  return t;
}

// Promocao hipotese->traco: N episodios em contextos VARIADOS, sem tensao
// aberta e confianca suficiente. Devolve diagnostico (nunca aplica aqui).
function avaliarPromocao(obs, opts) {
  const o = opts || {};
  const minEp = o.minEpisodios || 3;
  const minCtx = o.minContextos || 2;
  const eps = obs.episodios || [];
  const ctx = new Set(eps.map(e => (e.contexto || '').trim()).filter(Boolean));
  const contra = (obs.contraEpisodios || []).length;
  if (categoriaDe(obs) === 'traco') return { promovivel: false, jaTraco: true, motivos: ['ja e traco'] };
  const motivos = [];
  if (eps.length < minEp) motivos.push('faltam episodios (' + eps.length + '/' + minEp + ')');
  if (ctx.size < minCtx) motivos.push('faltam contextos variados (' + ctx.size + '/' + minCtx + ')');
  if (contra > 0) motivos.push('tem contra-evidencia (' + contra + ')');
  if ((Number(obs.confianca) || 0) < 0.6) motivos.push('confianca baixa (' + Number(obs.confianca || 0).toFixed(2) + ')');
  return { promovivel: motivos.length === 0, motivos, episodios: eps.length, contextos: ctx.size, contra };
}

// Propostas de atualizacao para todo o estado (SOMBRA).
function proporAtualizacoes(estado) {
  const e = estado || carregar();
  const props = [];
  for (const obs of (e.observacoes || [])) {
    if (categoriaDe(obs) === 'hipotese') {
      const a = avaliarPromocao(obs);
      if (a.promovivel) {
        props.push({ id: obs.id, acao: 'promover', para: 'traco',
          motivo: 'evidencia suficiente (' + a.episodios + ' episodios, ' + a.contextos + ' contextos)',
          texto: obs.texto });
      }
    }
  }
  for (const t of (e.tensoes || [])) {
    if (!t.resolucao) props.push({ id: t.id, acao: 'tensao_aberta', motivo: t.motivo,
      afirmacaoId: t.afirmacaoId, texto: t.textoAfirmacao });
  }
  return props;
}

// Aplica propostas SOMENTE quando autorizado (aplicar=true E env ligada).
// Em sombra (padrao): so loga e devolve as propostas sem tocar o modelo.
function aplicarPropostas(props, opts) {
  const o = opts || {};
  const autorizado = o.aplicar === true && process.env.ICARO_SELF_MODEL_APLICAR === '1';
  if (!autorizado) {
    console.log('[SELF-MODEL] SOMBRA: ' + ((props || []).length) + ' proposta(s) nao aplicada(s)');
    return { aplicadas: 0, propostas: props || [] };
  }
  const estado = carregar();
  let aplicadas = 0;
  for (const p of (props || [])) {
    if (p.acao === 'promover') {
      const obs = acharObs(estado, p.id);
      if (obs) {
        obs.categoria = 'traco';
        obs.status = 'ativo';
        obs.promovidoEm = new Date().toISOString();
        appendHistorico({ tipoEvento: 'promocao', id: p.id, para: 'traco' });
        aplicadas++;
      }
    }
  }
  if (aplicadas) salvar(estado);
  return { aplicadas, propostas: props || [] };
}

// COERENCIA INTERNA: afirmações ativas vs decisoes recentes do Icaro
// (textos do registro de proveniencia, origem 'icaro'/'inferencia').
// Apoio = mesma direcao; tensao = oposicao de negacao. Indice 0..1.
const NEG_COER = /\b(nao|nunca|deixei|parei|contrario)\b/i;
function tokensDe(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/).filter(w => w.length >= 4);
}
function medirCoerencia(estado, decisoes) {
  const e = estado || carregar();
  const decs = Array.isArray(decisoes) ? decisoes : [];
  let apoios = 0, tensoes = 0;
  for (const obs of (e.observacoes || [])) {
    if (obs.status === 'fundador') continue;
    const tk = new Set(tokensDe(obs.texto));
    const obsNeg = NEG_COER.test(String(obs.texto || ''));
    for (const d of decs) {
      const txt = typeof d === 'string' ? d : ((d && (d.texto || d.text)) || '');
      const overlap = tokensDe(txt).filter(w => tk.has(w)).length;
      if (overlap >= 2) {
        if (NEG_COER.test(txt) !== obsNeg) tensoes++;
        else apoios++;
      }
    }
  }
  const total = apoios + tensoes;
  return { indice: total ? Number((apoios / total).toFixed(2)) : 1, apoios, tensoes };
}

// Admite incerteza (ex.: "nao sei se mudei"): marca sem apagar a afirmacao.
function marcarIncerto(obsId, motivo) {
  const estado = carregar();
  const obs = acharObs(estado, obsId);
  if (!obs) return null;
  if (obs.status !== 'fundador') obs.status = 'incerto';
  obs.incertoMotivo = String(motivo || 'nao sei se mudei').slice(0, 200);
  appendHistorico({ tipoEvento: 'marcar_incerto', id: obsId, motivo: obs.incertoMotivo });
  salvar(estado);
  return obs;
}

module.exports = {
  SELF_MODEL_PATH,
  HIST_PATH,
  carregar,
  salvar,
  adicionarObservacao,
  adicionarFundador,
  lerUltimas,
  blocoParaPrompt,
  detectarReflexao,
  passaFiltros,
  ehFragmentoStale,
  estadoVazio,
  // Item 5
  categoriaDe,
  acharObs,
  registrarEpisodio,
  adicionarTensao,
  avaliarPromocao,
  proporAtualizacoes,
  aplicarPropostas,
  medirCoerencia,
  marcarIncerto
};

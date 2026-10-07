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

const SELF_MODEL_PATH = path.join(__dirname, 'self-model.json');

function estadoVazio() {
  return {
    versao: 1,
    atualizadoEm: new Date().toISOString(),
    observacoes: [],
    hipoteses: [],
    limitacoes_percebidas: [],
    perguntas_abertas: []
  };
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
      perguntas_abertas: Array.isArray(j.perguntas_abertas) ? j.perguntas_abertas : []
    };
  } catch (e) {
    console.log('[SELF-MODEL] erro leitura:', e.message);
    return estadoVazio();
  }
}

function salvar(estado) {
  try {
    estado.atualizadoEm = new Date().toISOString();
    const tmp = SELF_MODEL_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(estado, null, 2), 'utf8');
    fs.renameSync(tmp, SELF_MODEL_PATH);
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
    texto: t,
    contexto: '',
    fonte: 'explicito',
    status: 'fundador'
  };
  estado.observacoes.push(entrada);
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
    texto: texto,
    contexto: String(obs.contexto || '').trim().slice(0, 200),
    fonte: ['explicito', 'implicito'].includes(obs.fonte) ? obs.fonte : 'implicito',
    status: 'ativo'
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
  if (estado.observacoes.length > 50) {
    estado.observacoes = estado.observacoes.slice(-50);
  }
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
  const recentes = (estado.observacoes || [])
    .filter(o => o.status !== 'fundador' && !ExtratorCrencas.ehFormulaAssistente(o.texto))
    .slice(-(n || 3));
  const todas = fundadoras.concat(recentes);
  if (!todas.length) return '';
  const linhas = todas.map(o => {
    const marca = o.status === 'fundador' ? '[FUNDADOR]' : '[' + o.tipo + ']';
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

function passaFiltros(trecho) {
  const t = String(trecho || '').trim();
  if (t.replace(/[^\p{L}\p{N}]/gu, '').length < 15) return false;
  if (!MARCADORES_1PESSOA.test(t)) return false;
  if (FORMULAS_ASSISTENTE.test(t)) return false;
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

module.exports = {
  SELF_MODEL_PATH,
  carregar,
  salvar,
  adicionarObservacao,
  adicionarFundador,
  lerUltimas,
  blocoParaPrompt,
  detectarReflexao,
  passaFiltros,
  estadoVazio
};

// extrator-crencas.js
// Mecanismo puro de proveniencia para a camada de tracos (nucleo-tracos.js).
// Decide O QUE pode virar evidencia de crenca e COMO ela nasce classificada.
// Nao altera expressao, escolha nem identidade: so classifica evidencia.
//
// PROVENIENCIA (registrada, mas sem porta de promocao desde 06/10/2026):
// - fala de Rafael sobre o Icaro ..... origem 'dono'
// - posicao propria do Icaro ......... origem 'modelo', status 'nao_confirmado'
// A porta de promocao virou a REGRA EMERGENTE em nucleo-tracos.js (checarPromocao):
// 5+ obs, 3+ dias, conf 0.75+, |valor| 0.25+, 2+ contextos e
// (reapareceuAposPausa OU houveCorrecao); formula de assistente nunca promove.
//
// Filtros sao regex puras, sem LLM. A extracao de topico usa extrator-topico
// (Qwen, com cache), injetavel via opts.extrair para teste sem Ollama.

const PESO_DONO = 0.85;   // fala direta de Rafael
const PESO_ICARO = 0.72;  // posicao propria antes de ratificacao
const PESO_RATIFICACAO = 0.85;

const RE_1PESSOA = /\b(eu|me|mim|meu|minha|comigo)\b/i;
const RE_PERSPECTIVA = /\b(para mim|pra mim|na minha visao|na minha opiniao|eu diria|eu considero|eu vejo|eu acho|eu penso|ao meu ver|eu sinto|eu gosto|eu prefiro)\b/i;
const RE_SOBRE_ICARO = /\b(voc[eê]|voce|vc|seu|sua|seus|suas|icaro|ícaro)\b/i;
const RE_SUBJETO_DONO = /\b(voc[eê]|voce|vc|seu|sua|seus|suas|o rafael|rafael)\b/i;
const RE_AUSENCIA = /^(nao|não)\s+(tenho|sei|posso)|^nao tenho registro|^nao sei\b|^nao consigo\b|^nao consegui\b/i;

const MIN_RESP = 20;
const MIN_DONO = 12;
const MAX_DONO = 300;

function normalizarTexto(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// FORMULA-ASSISTENTE: texto que fala do interlocutor em vez de descrever o
// proprio estado. "para ajuda-lo da melhor forma possivel" nao e uma
// observacao sobre o Icaro; e linguagem de servico que o modelo repete.
// Usado para (a) nao gravar essa linguagem no self-model, (b) nao registrar
// essa linguagem como posicao propria de traco e (c) bloquear a promocao de
// um topico que e formula (regra 5 da regra emergente em nucleo-tracos.js).
const FORMULAS_ASSISTENTE = [
  'como posso ajudar', 'em que posso ajudar', 'no que posso ajudar',
  'estou aqui para ajudar', 'estou aqui para', 'a sua disposicao',
  'a disposicao', 'espero ter ajudado', 'espero que tenha ajudado',
  'fique a vontade', 'sinta-se a vontade', 'se precisar', 'me avise',
  'e um prazer ajudar', 'as suas ordens', 'a suas ordens',
  'qualquer coisa, basta pedir', 'estou a disposicao', 'suas perguntas',
  'suas conversas', 'suas necessidades', 'suas duvidas',
  'da melhor forma possivel', 'qualquer tarefa', 'ideia em mente',
  'disponivel para', 'qualquer melhoria', 'alguma ideia'
];

function ehFormulaAssistente(texto) {
  const t = normalizarTexto(texto);
  if (!t) return false;
  if (/ajuda-l[oa]/.test(t)) return true;
  if (FORMULAS_ASSISTENTE.some(f => t.includes(f))) return true;
  // 2a pessoa + linguagem de servico: o assunto e o interlocutor.
  const segundaPessoa = /\b(voce|vc|seu|sua|seus|suas|teu|tua)\b/.test(t);
  const servico = /(ajud|disponi|precis|assist|orient|atend|qualquer coisa|responder)/.test(t);
  return segundaPessoa && servico;
}

// Posicao que o proprio Icaro afirmou sobre si: 1a pessoa, nao fala do dono,
// nao e ausencia ("nao sei"), nao e formula de servico.
function candidatoProprio(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (t.length < MIN_RESP) return false;
  if (RE_AUSENCIA.test(t)) return false;
  if (ehFormulaAssistente(t)) return false;
  if (RE_SUBJETO_DONO.test(t)) return false;
  return RE_1PESSOA.test(t) || RE_PERSPECTIVA.test(t);
}

// Fala de Rafael que descreve o Icaro: segunda pessoa, afirmacao (sem "?"),
// sem "eu ..." (isso seria opiniao do dono sobre si proprio).
function candidatoFalaDoDono(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (t.length < MIN_DONO || t.length > MAX_DONO) return false;
  if (/\?/.test(t)) return false;
  if (!RE_SOBRE_ICARO.test(t)) return false;
  if (RE_1PESSOA.test(t)) return false;
  if (ehFormulaAssistente(t)) return false;
  return true;
}

// Ratificacao: resposta curta de concordancia. So vale quando existe uma
// posicao propria anterior pendente (quem chama decide). Exige que a mensagem
// seja praticamente toda a concordancia: "sim, vamos falar de cinema agora"
// troca de assunto e nao ratifica nada.
const RE_RATIFICACAO = /^(isso mesmo|isso ai|com certeza|exatamente|perfeitamente|concordo|confirmo|confirma|e verdade|eh verdade|esta certo|ta certo|isso|sim|certo|correto|exato|verdade|ok|okay|perfeito|na certa|boa)\b[\s.,;!]*([a-z0-9 ]*)$/;
function ehRatificacao(texto) {
  const t = normalizarTexto(texto);
  if (!t || t.length > 60) return false;
  if (/\?/.test(t)) return false;
  const m = t.match(RE_RATIFICACAO);
  if (!m) return false;
  return String(m[2] || '').trim().length <= 12;
}

function carregarExtrator() {
  try { return require('./extrator-topico').extrairTopico; } catch (e) { return null; }
}

// Registra as evidencias de um turno com proveniencia.
// opts: { entradaDono, respostaIcaro, agora, evidenciaRef, extrair, NT }
async function alimentarCrenca(opts) {
  const o = opts || {};
  const NT = o.NT || require('./nucleo-tracos');
  const extrair = o.extrair || carregarExtrator();
  if (!extrair) return [];
  const agora = o.agora || new Date().toISOString();
  const ref = String(o.evidenciaRef || agora);
  const registros = [];
  const estado = NT.carregar();
  let topicoAdjacente = null;

  if (candidatoFalaDoDono(o.entradaDono)) {
    const e = await extrair(o.entradaDono);
    if (e && e.topico) {
      topicoAdjacente = e.topico;
      const c = NT.registrarCrenca(estado, {
        topico: e.topico,
        valorNovo: e.valor,
        peso: PESO_DONO,
        origem: 'dono',
        status: 'nao_confirmado',
        evidenciaRef: 'dono:' + ref,
        quando: agora,
        textoEvidencia: String(o.entradaDono || ''),
        pergunta: String(o.entradaDono || '')
      });
      if (c) registros.push({ topico: c.topico, origem: 'dono', valor: c.valor });
    }
  }

  if (candidatoProprio(o.respostaIcaro)) {
    const e = await extrair(o.respostaIcaro);
    if (e && e.topico) {
      const contextos = [];
      if (topicoAdjacente) contextos.push('topico_adjacente:' + topicoAdjacente);
      const c = NT.registrarCrenca(estado, {
        topico: e.topico,
        valorNovo: e.valor,
        peso: PESO_ICARO,
        origem: 'modelo',
        status: 'nao_confirmado',
        evidenciaRef: 'icaro:' + ref,
        quando: agora,
        textoEvidencia: String(o.respostaIcaro || ''),
        pergunta: String(o.entradaDono || ''),
        contextos: contextos
      });
      if (c) registros.push({ topico: c.topico, origem: 'modelo', valor: c.valor });
    }
  }

  if (registros.length) NT.salvar(estado);
  return registros;
}

// Ratifica a posicao propria pendente. Vira fato do dono (status 'ratificado'),
// que continua registrado para auditoria; a promocao hoje e a regra emergente
// de nucleo-tracos.js. Devolve a crenca ou null.
function ratificarPendente(topico, opts) {
  const o = opts || {};
  const NT = o.NT || require('./nucleo-tracos');
  if (!topico) return null;
  const estado = NT.carregar();
  const alvo = (estado.crencas || []).find(c =>
    NT.normalizarTopico(c.topico) === NT.normalizarTopico(topico));
  if (!alvo) return null;
  if ((alvo.origem || 'modelo') !== 'modelo') return null;
  if ((alvo.status || 'nao_confirmado') === 'ratificado') return null;
  const quando = o.quando || new Date().toISOString();
  const c = NT.registrarCrenca(estado, {
    topico: alvo.topico,
    valorNovo: alvo.valor,
    peso: PESO_RATIFICACAO,
    origem: 'modelo',
    status: 'ratificado',
    evidenciaRef: 'ratificacao:' + String(o.evidenciaRef || ''),
    quando: quando,
    textoEvidencia: String(o.textoEvidencia || ''),
    pergunta: String(o.textoEvidencia || ''),
    contextos: ['intencao:ratificacao']
  });
  if (c) NT.salvar(estado);
  return c;
}

module.exports = {
  PESO_DONO,
  PESO_ICARO,
  PESO_RATIFICACAO,
  FORMULAS_ASSISTENTE,
  ehFormulaAssistente,
  candidatoProprio,
  candidatoFalaDoDono,
  ehRatificacao,
  alimentarCrenca,
  ratificarPendente,
  normalizarTexto
};

// nucleo-correcao.js — deteccao de correcao do dono + hesitacao por contexto.
// PEDIDO DE RAFAEL (11/10/2026, pos auditoria P0): quando o dono corrige
// ("nao e X", "voce errou"), o sistema registra a correcao contra o CONTEXTO
// (topico canonico) e, a partir de N correcoes no mesmo topico, o prompt
// pede cautela: hesitar, nao afirmar sem certeza, perguntar antes.
//
// Principios:
// - Dado (contador persistido), nao regra de identidade: o bloco do prompt
//   informa um historico de correcoes, nao define quem o Icaro e.
// - Determinista: regex + lista curada de topicos (nucleo-topicos e folha).
// - Arquivo proprio (erros-contexto.json): nao toca chat, V2, tracos ou
//   self-model. Override por env ICARO_CORRECAO_PATH para teste isolado.
// - Limiar ajustavel por env ICARO_LIMIAR_HESITACAO (padrao 3).

const fs = require('fs');
const path = require('path');

const PATH = process.env.ICARO_CORRECAO_PATH || path.join(__dirname, 'erros-contexto.json');
// Pendencias de curadoria: correcoes sem topico curado em NENHUM texto viram
// linha aqui (append-only), nunca balde em erros-contexto.json.
const PEND_PATH = process.env.ICARO_CORRECAO_PENDENTES_PATH || path.join(__dirname, 'erros-pendentes.jsonl');
const LIMIAR = (() => {
  const n = Number(process.env.ICARO_LIMIAR_HESITACAO);
  return (isFinite(n) && n >= 1) ? Math.floor(n) : 3;
})();

function normalizarBase(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// PADROES de correcao. Casa declaracao de correcao do dono; NAO casa pergunta
// (frase terminando em ? e rejeitada antes) nem narrativa neutra.
const PADROES = [
  /\b(nao e|nao era|nao foi|nao aconteceu assim|nao e isso)\b/,
  /\b(voce (esta|estava|errou|engano(u)?|confundiu)|vc (errou|esta errado|estava errado))\b/,
  /\b(errado|errar de novo|de novo errado|tá errado|ta errado)\b/,
  /\b(nada a ver|nem é isso|nem era essa|n e isso)\b/,
  /\b(corrigindo|correcao|para corrigir|o correto e)\b/,
  /\b(você inventou|voce inventou|isso nao e verdade|nao e verdade)\b/
];

// Negacoes dentro da propria frase anulam o gatilho ("voce nao errou nada",
// "isso nao e verdade" dito pelo Icaro como pergunta ja sai pelo guard de ?).
const ANULADORES = [
  /\b(nao errou|nunca errou|voce nao (esta|estava) errado|vc nao errou)\b/
];

function detectarCorrecao(texto) {
  const base = normalizarBase(texto);
  if (base.length < 4) return false;
  // Pergunta nao e correcao: "isso nao e azul?" e duvida, nao correcao.
  if (/\?\s*$/.test(base)) return false;
  if (ANULADORES.some(re => re.test(base))) return false;
  return PADROES.some(re => re.test(base));
}

// Contexto da correcao: onde o topico aparece primeiro? A CORRECAO e o alvo
// mais especifico (ela nomeia o errado); a resposta anterior do Icaro e o
// fallback (a correcao referencia implicitamente o que ele falou).
function __casarTopico(texto) {
  const NTp = require('./nucleo-topicos');
  const base = normalizarBase(texto);
  if (!base) return null;
  for (const entrada of NTp.LISTA) {
    const chaves = [entrada.canonico, ...entrada.sinonimos];
    for (const chave of chaves) {
      const k = normalizarBase(chave);
      if (!k) continue;
      // \b nas bordas: sinonimos com espaco tambem casam inteiro.
      const re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
      if (re.test(base)) return NTp.normalizarTopicoCanonico(entrada.canonico);
    }
  }
  return null;
}

// Topico canonico encontrado num texto (pergunta atual, correcao, resposta).
// null quando nenhum da lista curada aparece.
function topicoDe(texto) { return __casarTopico(texto); }

// (removido em 15/10: as "stopwords minimas" serviam ao fallback de primeiro
// token que inventava topicos — ver extrairContexto, caminho 3.)

// Best-effort: registra a correcao sem topico curado como PENDENTE de
// curadoria (o proximo passo e decidir se o assunto entra em nucleo-topicos).
// Nunca quebra o fluxo de conversa se o arquivo falhar.
function __pendente(correcao, resposta) {
  try {
    const linha = JSON.stringify({
      quando: new Date().toISOString(),
      correcao: String(correcao || '').slice(0, 300),
      resposta: String(resposta || '').slice(0, 300)
    });
    fs.appendFileSync(PEND_PATH, linha + '\n', 'utf8');
  } catch (e) { /* silencio: pendencia nao e critica */ }
}

function extrairContexto(respostaIcaro, correcao) {
  // 1) A correcao nomeia o topico ("nao e xadrez, voce errou" -> jogo)
  const porCorrecao = __casarTopico(correcao);
  if (porCorrecao) return porCorrecao;
  // 2) A resposta anterior do Icaro
  const porResposta = __casarTopico(respostaIcaro);
  if (porResposta) return porResposta;
  // 3) Sem topico curado em lugar nenhum: NAO inventa balde (bug do topico
  //    "quer" — primeiro token significativo virava canonico; corrigido em
  //    15/10 com aval de Rafael). A lista curada de nucleo-topicos e a
  //    unica fonte de topico; a correcao vira pendente de curadoria.
  __pendente(correcao, respostaIcaro);
  return null;
}

function __carregar() {
  if (!fs.existsSync(PATH)) return {};
  try {
    const j = JSON.parse(fs.readFileSync(PATH, 'utf8'));
    return (j && typeof j === 'object') ? j : {};
  } catch (e) { return {}; }
}

function __salvar(estado) {
  fs.writeFileSync(PATH, JSON.stringify(estado, null, 2), 'utf8');
}

// Chave canonica do contexto: "xadrez" e "jogo" sao o MESMO balde (a lista
// curada de nucleo-topicos e a fonte; desconhecido passa inalterado).
function __chave(contexto) {
  const base = normalizarBase(contexto);
  if (!base) return '';
  try { return normalizarBase(require('./nucleo-topicos').normalizarTopicoCanonico(base)); }
  catch (e) { return base; }
}

function registrarErro(contexto) {
  const chave = __chave(contexto);
  if (!chave) return 0;
  const estado = __carregar();
  if (!estado[chave]) estado[chave] = { contador: 0, primeira: null, ultima: null, exemplos: [] };
  const e = estado[chave];
  e.contador = (Number(e.contador) || 0) + 1;
  const agora = new Date().toISOString();
  if (!e.primeira) e.primeira = agora;
  e.ultima = agora;
  __salvar(estado);
  return e.contador;
}

function lerErro(contexto) {
  const chave = __chave(contexto);
  if (!chave) return 0;
  const e = __carregar()[chave];
  return e ? (Number(e.contador) || 0) : 0;
}

// Info completa do balde (contador + datas) — leitura pura, usada pelo
// nucleo-medo pra logar n e diasDesdeUltima na sombra do medo funcional.
function lerErroInfo(contexto) {
  const chave = __chave(contexto);
  const vazio = { chave, contador: 0, primeira: null, ultima: null };
  if (!chave) return vazio;
  const e = __carregar()[chave];
  if (!e) return vazio;
  return { chave, contador: Number(e.contador) || 0, primeira: e.primeira || null, ultima: e.ultima || null };
}

function deveHesitar(contexto) {
  return lerErro(contexto) >= LIMIAR;
}

// Bloco para o system quando o topico da pergunta atual ja foi corrigido
// LIMIAR+ vezes. Dado sobre historico, nao ordem nem definicao de identidade.
function blocoHesitacao(contexto) {
  const chave = __chave(contexto);
  const n = lerErro(chave);
  if (n < LIMIAR) return '';
  return 'HESITACAO SOBRE "' + chave + '": ja houve ' + n +
    ' correcoes sobre este topico. Nao afirme nada que voce nao tenha visto no contexto agora. ' +
    'Se nao tiver certeza, diga que nao tem certeza ou pergunte antes de afirmar. ' +
    'Nao invente detalhe pra agradar.';
}

module.exports = {
  PATH,
  PEND_PATH,
  LIMIAR,
  detectarCorrecao,
  extrairContexto,
  topicoDe,
  registrarErro,
  lerErro,
  lerErroInfo,
  deveHesitar,
  blocoHesitacao,
  normalizarBase
};

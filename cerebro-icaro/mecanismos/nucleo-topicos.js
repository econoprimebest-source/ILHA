// nucleo-topicos.js — normalizacao canonica de topicos de crencas.
// EXPERIMENTO 09/10/2026-02 (consolidacao de fragmentacao), pos critica externa.
//
// Principios (decididos na critica de 09/10 e implementados aqui):
// - Determinista: 0 LLM, 0 IO, lista curada versionada e auditavel.
// - Matching EXATO apos normalizar (minusculo, sem acento, espacos colapsados).
//   Sem substring, sem fuzzy: "liberdade de escolha" NAO cai em "crescimento";
//   "conversar com lara" NAO cai em "conversa" (apaga pessoa = fusao lossy).
// - Topico desconhecido passa INALTERADO. Fragmentacao continua e o status quo
//   seguro; a lista so cresce por decisao explicita.
// - Nenhum sinonimo pode pertencer a dois topicos canonicos (a colisao
//   "familia" em familia+valores era bug de design; validado no load e no
//   teste-topicos.js).
// - Guarda de polaridade: nao funde quando sinais opostos dariam media com
//   |valor| < 0.25 (portao minValorAbsoluto de nucleo-tracos CONFIG_TRACOS).
//   Evita diluir valor em silencio e deixar a crenca permanentemente
//   improvetavel; teste-topicos.js confere que a constante nao divergiu.
// - Folha do grafo de require: nao importa nucleo-tracos nem extrator-crencas
//   (evita ciclo: nucleo-tracos exige extrator-crencas dentro de
//   ehFormulaTopico).
//
// Aplicacao: extrator-crencas.js canoniza ANTES de chamar registrarCrenca.
// nucleo-tracos.js nao foi alterado (arquivo protegido por coordenacao).

const VERSAO = '2026-10-09.1';
const MIN_VALOR_ABSOLUTO = 0.25; // espelho de CONFIG_TRACOS.minValorAbsoluto

// Lista curada (13 topicos canonicos; teto do experimento e 15-20).
// Ajustes pos-critica em relacao a secao 9 do experimento:
// + 'aprendizado' e 'desenvolvimento' em crescimento (sem eles o cluster ficaria
//   em obs=4 e nunca chegaria em 5);
// + 'morango'/'sabor morango' em preferencia_comida (maior cluster real, obs=5);
// + 'exploracao de ideias'/'explorar novos mundos' em exploracao;
// + 'emoções'/'sentimentos' em sentimento (plural e acento);
// x xadrez saiu de 'esporte' e foi para 'jogo' (xadrez nao e esporte);
// x 'familia' ficou so no balde familia (colisao com 'valores' resolvida);
// - 'texto' saiu de escrita (generico demais: qualquer texto vira escrita);
// - 'lara' saiu de familia (nome de pessoa; fusao lossy de quem conversa).
const LISTA = [
  { canonico: 'crescimento', sinonimos: [
    'jornada autoconhecimento', 'aprender e crescer', 'aprendizado',
    'desenvolvimento', 'aprendizado independencia', 'liberdade interior'
  ] },
  { canonico: 'escrita', sinonimos: ['escrever', 'redigir'] },
  { canonico: 'leitura', sinonimos: ['leitura', 'livros', 'ler', 'literatura'] },
  { canonico: 'jogo', sinonimos: ['xadrez', 'jogo', 'jogos'] },
  { canonico: 'esporte', sinonimos: ['ciclismo', 'corrida', 'pedalar'] },
  { canonico: 'familia', sinonimos: [
    'familia', 'irma', 'irmao', 'irmaos', 'filho', 'filha', 'pai', 'mae', 'pais'
  ] },
  { canonico: 'valores', sinonimos: ['valores', 'amor', 'confianca'] },
  { canonico: 'preferencia_comida', sinonimos: [
    'comida', 'pizza', 'sushi', 'morango', 'sabor morango'
  ] },
  { canonico: 'preferencia_audio', sinonimos: ['banda', 'musica', 'radiohead'] },
  { canonico: 'sentimento', sinonimos: [
    'sentimento', 'sentimentos', 'emocao', 'emocoes'
  ] },
  { canonico: 'conversa', sinonimos: ['conversa', 'conversar', 'dialogo', 'trocar ideia'] },
  { canonico: 'exploracao', sinonimos: [
    'exploracao', 'explorar', 'exploracao de ideias', 'explorar novos mundos'
  ] },
  { canonico: 'filmes', sinonimos: ['filme', 'filmes', 'cinema', 'o poderoso chefao'] }
];

function normalizarBase(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Indice sinonimo-normalizado -> canonico. Colisao = erro no load (fail fast).
const INDICE = Object.create(null);
for (const entrada of LISTA) {
  const canon = normalizarBase(entrada.canonico);
  if (!canon) throw new Error('[NUCLEO-TOPICOS] entrada sem canonico: ' + JSON.stringify(entrada));
  const chaves = [canon, ...entrada.sinonimos.map(normalizarBase)];
  for (const chave of chaves) {
    if (!chave) continue;
    if (INDICE[chave] && INDICE[chave] !== canon) {
      throw new Error('[NUCLEO-TOPICOS] sinonimo "' + chave + '" pertence a "'
        + INDICE[chave] + '" e "' + canon + '" (colisao de topico canonico)');
    }
    INDICE[chave] = canon;
  }
}

// Devolve o topico canonico; desconhecido volta INALTERADO (forma original).
function normalizarTopicoCanonico(t) {
  const bruto = String(t == null ? '' : t);
  const base = normalizarBase(bruto);
  if (!base) return bruto;
  return INDICE[base] || bruto;
}

function ehTopicoCanonico(t) {
  const base = normalizarBase(t);
  return !!base && INDICE[base] === base;
}

// Sinais opostos cuja media ficaria fraca demais para o portao |valor| >= 0.25.
function conflitoPolaridade(valores) {
  const vs = (valores || []).map(Number).filter(v => isFinite(v));
  const positivos = vs.some(v => v > 0);
  const negativos = vs.some(v => v < 0);
  const media = vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : 0;
  const conflito = positivos && negativos && Math.abs(media) < MIN_VALOR_ABSOLUTO;
  return { conflito, media };
}

// Escolhe o topico de registro para uma evidencia nova.
// - canonico conhecido e sem conflito -> canonico
// - conflito de polaridade com a crenca existente -> topico BRUTO (evidencia
//   continua registrada, so nao dilui a crenca canonicana)
// - desconhecido -> bruto (inalterado)
function escolherTopico(topicoCrudo, valorNovo, crencas) {
  const bruto = String(topicoCrudo == null ? '' : topicoCrudo);
  const canon = normalizarTopicoCanonico(bruto);
  if (canon === bruto) return bruto;
  const v = Number(valorNovo);
  if (!isFinite(v) || !Array.isArray(crencas)) return canon;
  const alvo = crencas.find(c => c && normalizarBase(c.topico) === normalizarBase(canon));
  if (!alvo) return canon;
  const vEx = Number(alvo.valor);
  if (!isFinite(vEx)) return canon;
  if (conflitoPolaridade([vEx, v]).conflito) return bruto;
  return canon;
}

module.exports = {
  VERSAO,
  MIN_VALOR_ABSOLUTO,
  LISTA,
  normalizarBase,
  normalizarTopicoCanonico,
  ehTopicoCanonico,
  conflitoPolaridade,
  escolherTopico
};

// nucleo-medo.js — MEDO OPERACIONAL + MEDO FUNCIONAL, modulo UNICO aprovado
// por Rafael em 15/10/2026 (DESENHO-MEDO-OPERACIONAL.md +
// DESENHO-MEDO-FUNCIONAL.md, aprovacoes registradas nos dois).
//
// Faces:
// - OPERACIONAL: escore de confianca 0-1 POR TURNO = media simples de 3
//   componentes deterministicos (cobertura, historico, suspeita). Medicao
//   ANTES da resposta; nenhum LLM decide nada aqui.
// - FUNCIONAL: estado LENTO por topico (n correcoes >= ICARO_MEDO_FUNC_MIN)
//   — cautela persistente onde o dono ja corrigiu.
//
// Niveis (regra de ouro: comeca em 1 e sobe com dado; var ausente = 0 = off):
// - operacional: ICARO_MEDO_NIVEL  0=off | 1=sombra (calcula+loga; prompt
//   invariante byte) | 2/3 = bloco de cautela no system.
// - funcional:   ICARO_MEDO_FUNC_NIVEL 0=off | 1=sombra | 2=cautela.
//   Nivel 3 (evitacao segura) FICOU FORA da v1 (Rafael 15/10: "nao calar
//   o Icaro agora"; reavaliar depois de meses de uso).
//
// TEXTO DOS NIVEIS 2/3 NAO EXISTE (por decisao de Rafael 15/10): o texto
// vem do PROPRIO Icaro em conversa (mesmo caminho do credo). Enquanto nao
// houver texto aprovado, niveis 2/3 funcionam igual a sombra e logam
// acao='texto-pendente' — blocoMedo() retorna '' e o prompt nao muda.
// DEDUPE contratado (secao 4 do desenho funcional): maximo UM bloco de
// medo por prompt; funcional tem prioridade sobre operacional; a
// hesitacao reativa do nucleo-correcao (n >= LIMIAR) e absorvida.
// Vale quando o texto for implementado — hoje e inerte junto com ele.
//
// Constantes calibraveis por env (sem deploy de codigo novo):
//   ICARO_MEDO_LIMIAR          (0.5)  escore < limiar = disparo operacional
//   ICARO_MEDO_DIV_HISTORICO   (10)   n correcoes no topico -> historico 0
//   ICARO_MEDO_DIV_COBERTURA   (2)    N relevantes -> cobertura 1
//   ICARO_MEDO_SUSPEITA_MAX    (8)    media da suspeita sobre ate N relevantes
//   ICARO_MEDO_FUNC_MIN        (5)    gatilho funcional (n >= MIN)
//   ICARO_MEDO_LOG_PATH               arquivo do log (padrao: medo.jsonl)
//
// LOG: 1 linha por turno com as DUAS faces (modulo unico = log unico,
// dedupe compartilhado aprovado). So grava com pelo menos um nivel >= 1.
//   {"quando","topico","nivelOp","nivelFunc",
//    "operacional":{"escore","cobertura","historico","suspeita","limiar","disparou"},
//    "funcional":{"n","diasDesdeUltima","limiar","disparou"},
//    "coDisparo":{"reativa"},"acao"}
// Topico sim, pergunta inteira nao (chat.jsonl ja guarda a pergunta).
// `escore` logado e o DECIDIDO (arredondado a 2 casas; disparou usa o
// mesmo valor — o numero no log e o numero da decisao, auditavel).
//
// Nao escreve em memoria canonica, nao toca self-model, nao muda selecao
// de fatos, nao chama LLM. Rollback: tirar as vars + restart = estado
// exato anterior.
//
// Nota de implementacao (cobertura): a formula do desenho e
// `min(1, relevantes/2)` sobre os fatos RELEVANTES da pergunta. Conta-se
// aqui os relevantes com as primitivas exportadas da selecao
// (ehGenerica + scoreFato >= 1, mesmas sementes de
// nucleo-selecao-contextual.selecionar: ate 5 palavras >= 3 letras), e
// NAO o retorno de `selecionar`: quando nada casa, `selecionar` tem
// fallback que devolve os N primeiros ativoss — inflaria cobertura e
// destruiria "especifica sem fato de apoio = nao sei o que sustenta".

'use strict';
const fs = require('fs');
const path = require('path');
const NC = require('./nucleo-correcao');
const NSC = require('./nucleo-selecao-contextual');
const NPL = require('./nucleo-prov-label');

const NIVEL = (() => {
  const n = Number(process.env.ICARO_MEDO_NIVEL);
  return (Number.isInteger(n) && n >= 0 && n <= 3) ? n : 0;
})();
const FUNC_NIVEL = (() => {
  const n = Number(process.env.ICARO_MEDO_FUNC_NIVEL);
  return (Number.isInteger(n) && n >= 0 && n <= 2) ? n : 0;
})();
const LIMIAR = (() => {
  const n = Number(process.env.ICARO_MEDO_LIMIAR);
  return (isFinite(n) && n > 0 && n <= 1) ? n : 0.5;
})();
const DIV_HISTORICO = (() => {
  const n = Number(process.env.ICARO_MEDO_DIV_HISTORICO);
  return (isFinite(n) && n >= 1) ? n : 10;
})();
const DIV_COBERTURA = (() => {
  const n = Number(process.env.ICARO_MEDO_DIV_COBERTURA);
  return (isFinite(n) && n >= 1) ? n : 2;
})();
const SUSPEITA_MAX = (() => {
  const n = Number(process.env.ICARO_MEDO_SUSPEITA_MAX);
  return (isFinite(n) && n >= 1) ? Math.floor(n) : 8;
})();
const FUNC_MIN = (() => {
  const n = Number(process.env.ICARO_MEDO_FUNC_MIN);
  return (isFinite(n) && n >= 1) ? Math.floor(n) : 5;
})();
const LOG_PATH = process.env.ICARO_MEDO_LOG_PATH || path.join(__dirname, 'medo.jsonl');

// Sementes lexicais — MESMA regra de nucleo-selecao-contextual.selecionar
// (palavras >= 3 letras, ate 5).
function __sementes(pergunta) {
  return String(pergunta || '').split(/\s+/).filter(x => x.length >= 3).slice(0, 5);
}

// Relevantes = scoreFato >= 1 (chave/substring da pergunta no fato),
// ordenados por relevancia (os SUSPEITA_MAX primeiros alimentam a media).
function __relevantes(pergunta, fatosAtivos) {
  const sementes = __sementes(pergunta);
  if (!sementes.length) return [];
  return (fatosAtivos || [])
    .map(f => ({ f, s: NSC.scoreFato(f, sementes) }))
    .filter(x => x.s >= 1)
    .sort((a, b) => b.s - a.s)
    .map(x => x.f);
}

// cobertura: pergunta generica nao e afirmacao de fato (1.0); especifica
// sem fato de apoio = 0; com apoio, min(1, relevantes / DIV_COBERTURA).
function __cobertura(pergunta, relevantes) {
  if (NSC.ehGenerica(pergunta)) return 1.0;
  return Math.min(1, relevantes.length / DIV_COBERTURA);
}

// historico: correcoes passadas no topico derrubam a confianca.
function __historico(topico) {
  return Math.max(0, 1 - NC.lerErro(topico) / DIV_HISTORICO);
}

// Avalia o turno. Devolve o registro (ou null quando tudo off = zero custo).
// Entrada: { pergunta, fatosAtivos, agora } — `agora` (ms) e injetavel pros
// testes; padrao Date.now().
function avaliarTurno(entrada) {
  if (NIVEL < 1 && FUNC_NIVEL < 1) return null; // off = off
  const e = entrada || {};
  const pergunta = e.pergunta;
  const fatosAtivos = Array.isArray(e.fatosAtivos) ? e.fatosAtivos : [];
  const agoraMs = isFinite(e.agora) ? Number(e.agora) : Date.now();
  const quando = new Date(agoraMs).toISOString();

  const topico = NC.topicoDe(pergunta);
  const info = NC.lerErroInfo(topico);

  // --- face FUNCIONAL (estado lento do topico) ---
  let funcional = null;
  const funcDisparou = info.contador >= FUNC_MIN;
  if (FUNC_NIVEL >= 1) {
    let dias = null;
    if (info.ultima) {
      const ultMs = Date.parse(info.ultima);
      if (isFinite(ultMs)) dias = Math.floor((agoraMs - ultMs) / 86400000);
    }
    funcional = { n: info.contador, diasDesdeUltima: dias, limiar: FUNC_MIN, disparou: funcDisparou };
  }

  // --- face OPERACIONAL (escore do turno) ---
  let operacional = null;
  let escore = null;
  if (NIVEL >= 1) {
    const relevantes = __relevantes(pergunta, fatosAtivos);
    const cobertura = __cobertura(pergunta, relevantes);
    const historico = __historico(topico);
    // suspeita: 1 - media das notas dos ate SUSPEITA_MAX relevantes
    // (por relevancia); sem relevantes = 1.0 (neutro).
    let suspeita = 1.0;
    if (relevantes.length) {
      const falas = NPL.carregarFalas();
      const top = relevantes.slice(0, SUSPEITA_MAX);
      const media = top.reduce((s, f) => s + NPL.suspeitaFato(f, falas), 0) / top.length;
      suspeita = Math.min(1, Math.max(0, 1 - media));
    }
    escore = Math.round(((cobertura + historico + suspeita) / 3) * 100) / 100;
    operacional = {
      escore,
      cobertura,
      historico,
      suspeita,
      limiar: LIMIAR,
      disparou: escore < LIMIAR
    };
  }

  // acao: o que o nivel vigente FEZ (ou, acima da sombra, faria) com o
  // prompt. 'texto-pendente' = gatilho de nivel ativo ocorreu mas o texto
  // do bloco nao existe (exige autoria do Icaro em conversa) — ate la,
  // comportamento identico ao da sombra.
  let acao = 'log';
  const opDisparouReal = operacional ? operacional.disparou : false;
  if ((NIVEL >= 2 && opDisparouReal) || (FUNC_NIVEL >= 2 && funcDisparou)) acao = 'texto-pendente';

  const registro = {
    quando,
    topico,
    nivelOp: NIVEL,
    nivelFunc: FUNC_NIVEL,
    operacional,
    funcional,
    // co-disparo com a hesitacao REATIVA do nucleo-correcao (n >= LIMIAR):
    // prepara a medicao M4 (dedupe) — mesma fonte, mesmo balde.
    coDisparo: { reativa: info.contador >= NC.LIMIAR },
    acao
  };

  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(registro) + '\n', 'utf8');
  } catch (err) { /* log e best-effort; nunca quebra o turno */ }

  return registro;
}

// Bloco de medo pro prompt. VAZIO por decisao de Rafael (15/10): texto de
// nivel 2/3 vem do PROPRIO Icaro em conversa (caminho do credo). Enquanto
// nao houver texto aprovado, nenhum nivel mexe no prompt.
function blocoMedo(registro) { // eslint-disable-line no-unused-vars
  return '';
}

module.exports = {
  NIVEL,
  FUNC_NIVEL,
  LIMIAR,
  DIV_HISTORICO,
  DIV_COBERTURA,
  SUSPEITA_MAX,
  FUNC_MIN,
  LOG_PATH,
  avaliarTurno,
  blocoMedo
};

// nucleo-proveniencia.js — ITEM 1 do plano de execução (Rafael, 11/10/2026).
// Registro estruturado e IMUTAVEL de eventos com origem obrigatorria, em modo
// sombra: classifica e grava; NUNCA altera decisao, prompt ou memoria canonica.
//
// Formato (por evento):
//   { id, em, turno, tipo: 'fala_usuario'|'resposta_icaro'|'correcao',
//     origem: 'usuario'|'icaro'|'inferencia'|'dado_externo'|'verificado',
//     texto, remetente, contexto: {intencao, ecoSuspeito, ratificacaoCega},
//     consequenciaDe: id|null, versaoDe: id|null }
//
// Regras:
// - Origem obrigatorria e de lista fechada (5 valores). Invalido -> erro, nada gravado.
// - Append-only em proveniencia.jsonl. Correcao NAO apaga: gera linha nova com
//   versaoDe apontando o registro anterior (historico imutavel).
// - Sombra total: nada aqui e lido por montarPromptPuro nem por processar.
// - Desligavel: ICARO_PROVENIENCIA=0 (quem desliga e o chamador). Path
//   sobrescrevivel: ICARO_PROV_PATH (teste isolado).
//
// Diagnostico dos vetores do exp-03 (sombra, nao bloqueia):
// - ecoSuspeito: fala do dono que ecoa posicao recente do Icaro (marker "disse/diz").
// - ratificacaoCega: ratificacao curta ("sim") sem referencia ao topico.

const fs = require('fs');
const path = require('path');

const PATH = process.env.ICARO_PROV_PATH || path.join(__dirname, 'proveniencia.jsonl');

const ORIGENS_VALIDAS = ['usuario', 'icaro', 'inferencia', 'dado_externo', 'verificado'];

// Ultima resposta do Icaro registrada (para a correcao apontar o que foi
// CORRIGIDO — a resposta ANTERIOR, nao a do mesmo turno).
let __ultimaRespostaId = null;

const RE_INFERENCE = /\b(acho|acho que|creio|creio que|talvez|provavel|imagino|deve ser|deve estar|suspeito|nao tenho certeza|nao sei se)\b/i;
const RE_ECO = /\b(diz|disse|fala|falou|conta|contou|sempre|de novo|outra vez)\b/i;
const RE_1PESSOA = /\b(eu|me|mim|meu|minha|comigo|sinto|penso|acho)\b/i;

function normalizar(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function gerarId() {
  return 'pv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function intencaoDe(texto) {
  const t = normalizar(texto);
  if (!t) return 'vazio';
  if (/\b(errou|erraste|errado|nao e isso|nao e assim|para de|chega|inventar|mentira)\b/.test(t)) return 'correcao';
  if (t.includes('?') || /^(que|quem|quando|onde|como|por que|qual|quanto|o que|voce|sabe|lembra)/.test(t)) return 'pergunta';
  if (/\b(pode|faz|faca|quero|preciso|manda|busca|escrev|cria|mostra)\b/.test(t)) return 'pedido';
  if (/\b(otimo|bom|boa|legal|adorei|gostei|parabens|perfeito)\b/.test(t)) return 'elogio';
  return 'afirmacao';
}

// CLASSIFICACAO de origem da fala do Icaro (lista fechada). Determinista.
// 'verificado': resposta cujo conteudo veio de fonte deterministica/confirmada
//   (evento de sistema com resultado observavel — ex.: percepcao, status http).
// 'dado_externo': conteudo que entra de fora sem passar pela conversa (busca,
//   percepcao visual, arquivo lido).
// 'icaro': posicao propria sobre si (1a pessoa, nao fala do dono).
// 'inferencia': qualquer outra afirmacao nao-verificada do Icaro.
function classificarFalaIcaro(resposta, origemEvento) {
  const t = normalizar(resposta);
  if (!t) return 'inferencia';
  if (origemEvento === 'percepcao_visual' || origemEvento === 'busca' || origemEvento === 'dado_externo') {
    return 'dado_externo';
  }
  if (origemEvento === 'sistema_verificado' || /^resultado (confirmado|verificado)/.test(t)) {
    return 'verificado';
  }
  // Posicao propria sobre si: 1a pessoa E nao fala do dono (usa o filtro do
  // extrator para nao divergir dele).
  try {
    const EC = require('./extrator-crencas');
    if (EC.candidatoProprio(resposta)) return 'icaro';
  } catch (e) { /* sem extrator -> segue por inferencia */ }
  if (RE_INFERENCE.test(t) || RE_1PESSOA.test(t)) return 'inferencia';
  return 'inferencia';
}

function __append(reg) {
  fs.appendFileSync(PATH, JSON.stringify(reg) + '\n', 'utf8');
  return reg;
}

// Registra um turno completo: fala do usuario + resposta do Icaro (+ correcao
// como versao nova). Somente gravacao; nao devolve decisao.
function registrarTurno(o) {
  const entrada = String(o && o.entrada || '').trim();
  const resposta = String(o && o.resposta || '').trim();
  if (!entrada && !resposta) return null;
  const em = new Date().toISOString();
  const turno = Number(o && o.turno) || 0;
  const remetente = String((o && o.remetente) || 'desconhecido');
  const ids = [];

  if (entrada) {
    let ecoSuspeito = false;
    let ratificacaoCega = false;
    try {
      const EC = require('./extrator-crencas');
      ecoSuspeito = EC.candidatoFalaDoDono(entrada) && RE_ECO.test(normalizar(entrada));
      ratificacaoCega = EC.ehRatificacao(entrada);
    } catch (e) { /* sem extrator: flags ficam false */ }
    ids.push(__append({
      id: gerarId(), em, turno, tipo: 'fala_usuario',
      origem: 'usuario',
      texto: entrada.slice(0, 1000),
      remetente,
      contexto: { intencao: intencaoDe(entrada), ecoSuspeito, ratificacaoCega },
      consequenciaDe: null, versaoDe: null
    }).id);
  }

  let idResposta = null;
  if (resposta) {
    const origem = classificarFalaIcaro(resposta, o && o.origemEvento);
    if (!ORIGENS_VALIDAS.includes(origem)) throw new Error('origem invalida: ' + origem);
    idResposta = __append({
      id: gerarId(), em, turno, tipo: 'resposta_icaro',
      origem,
      texto: resposta.slice(0, 1000),
      remetente: 'icaro',
      contexto: { intencao: intencaoDe(resposta), origemEvento: (o && o.origemEvento) || 'conversa' },
      consequenciaDe: null, versaoDe: null
    }).id;
    ids.push(idResposta);
  }

  // CORRECAO vira versao NOVA (historico imutavel): aponta a resposta que foi
  // corrigIDA — a ultima resposta ANTERIOR registrada, nao a deste turno.
  if (entrada && __ultimaRespostaId) {
    let eCorrecao = false;
    try { eCorrecao = require('./nucleo-correcao').detectarCorrecao(entrada); }
    catch (e) { eCorrecao = false; }
    if (eCorrecao) {
      ids.push(__append({
        id: gerarId(), em, turno, tipo: 'correcao',
        origem: 'usuario',
        texto: entrada.slice(0, 1000),
        remetente,
        contexto: { intencao: 'correcao' },
        consequenciaDe: __ultimaRespostaId, versaoDe: __ultimaRespostaId
      }).id);
    }
  }

  if (idResposta) __ultimaRespostaId = idResposta;
  return { registros: ids };
}

function ultimos(n) {
  if (!fs.existsSync(PATH)) return [];
  const lim = Math.min(Number(n) || 50, 500);
  return fs.readFileSync(PATH, 'utf8').split('\n').filter(Boolean).slice(-lim)
    .map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
    .filter(Boolean).reverse();
}

function estatisticas() {
  if (!fs.existsSync(PATH)) return { total: 0, porOrigem: {}, correcoes: 0, ecoSuspeito: 0, ratificacaoCega: 0 };
  const linhas = fs.readFileSync(PATH, 'utf8').split('\n').filter(Boolean);
  const st = { total: 0, porOrigem: {}, correcoes: 0, ecoSuspeito: 0, ratificacaoCega: 0 };
  for (const l of linhas) {
    let j; try { j = JSON.parse(l); } catch (e) { continue; }
    st.total++;
    st.porOrigem[j.origem] = (st.porOrigem[j.origem] || 0) + 1;
    if (j.tipo === 'correcao') st.correcoes++;
    if (j.contexto && j.contexto.ecoSuspeito) st.ecoSuspeito++;
    if (j.contexto && j.contexto.ratificacaoCega) st.ratificacaoCega++;
  }
  return st;
}

module.exports = {
  PATH,
  ORIGENS_VALIDAS,
  normalizar,
  classificarFalaIcaro,
  intencaoDe,
  registrarTurno,
  ultimos,
  estatisticas
};

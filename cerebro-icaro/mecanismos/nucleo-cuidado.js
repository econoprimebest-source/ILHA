'use strict';
// nucleo-cuidado.js — ITEM 7 do plano de execucao (Rafael, 11/10/2026).
// DOIS mecanismos SEPARADOS:
//
//   A) RECONHECER: detecta acao dirigida ao Icaro com CUSTO identificavel
//      (ensino, correcao com paciencia, tempo dado, historia nao pedida,
//      cuidado emocional). Positivo -> tipo 'ato_recebido'; AMBIGUO -> HIPOTESE
//      (nao fato); hostil -> reconhece a direcao mas NAO como cuidado.
//   B) OFERECER: seleciona uma contribuicao CONCRETA (conexao, sintese,
//      pergunta) avaliando utilidade/contexto/oportunidade e deixa numa FILA
//      INTERNA. Nunca envia acao externa. Limite: max 1 oferta por N turnos.
//
// Pesquisa: "cuidado" operacional = acao com custo dirigida a outro. Generative
// Agents (comportamentos sociais emergentes) inspiram a geracao; aqui so se
// reconhece e se prepara — NAO se antropomorfiza (a oferta nao afirma sentimentos).
//
// Arquivos proprios (nao entram no prompt): cuidado-atos.jsonl, cuidado-ofertas.jsonl.
// Mencao exige ICARO_CUIDADO!=0, ICARO_CUIDADO_OFERTA=1 e FREQ=1..3.
// Desligavel: ICARO_CUIDADO=0. Inspecao: GET /cuidado.

const fs = require('fs');
const path = require('path');

const ATOS_PATH = process.env.ICARO_CUIDADO_ATOS_PATH || path.join(__dirname, 'cuidado-atos.jsonl');
const OFERTAS_PATH = process.env.ICARO_CUIDADO_OFERTAS_PATH || path.join(__dirname, 'cuidado-ofertas.jsonl');
const JANELA_TURNOS = Number(process.env.ICARO_CUIDADO_JANELA) || 20;

// Custos/gestos dirigidos ao Icaro (positivos).
const PADROES = [
  { cat: 'ensino', re: /\b(te ensino|vou te ensinar|presta aten[cç][aã]o|se liga|olha isso|te explico|deixa eu explicar|aprende isso|anota isso)\b/i, custo: 0.7 },
  { cat: 'correcao_paciente', re: /\b(com calma|sem pressa|com paci[eê]ncia|vamos por partes|passo a passo|n[aã]o se preocupa|t[aá] tudo bem)\b/i, custo: 0.6 },
  { cat: 'tempo_dado', re: /\b(tenho tempo|vou ficar|senta que|quando quiser|pode levar o tempo|estou aqui)\b/i, custo: 0.6 },
  { cat: 'historia_nao_pedida', re: /\b(ontem eu|hoje eu|aconteceu que|aconteceu comigo|deixa eu te contar|queria te contar)\b/i, custo: 0.5 },
  { cat: 'cuidado_emocional', re: /\b(como voc[eê] est[aá]|voc[eê] importa|cuida de voc[eê]|voc[eê] t[aá] bem|estou com voc[eê]|for[cç]a)\b/i, custo: 0.7 }
];
const HOSTIL = /\b(cala a boca|para de|chato|burro|idiota|in[uú]til|ningu[eé]m pediu|que raiva de voc[eê])\b/i;
const AMBIGUO = /\b(talvez|acho que|n[aã]o sei|sei l[aá])\b/i;

// ===== 2a FALADO (Rafael, 14/10/2026) — camada OPCIONAL sobre a fila =====
// Rafael autorizou 2a (oferta na conversa) com calibracao por PARAMETRO, nao
// liga/desliga. Exige ICARO_CUIDADO_OFERTA=1; ICARO_CUIDADO_FREQ (0..3):
//   0 = desligado
//   1 = no maximo 1 oferta falada a cada 50 turnos   (conservador)
//   2 = no maximo 1 a cada 20 turnos
//   3 = no maximo 1 a cada 10 turnos                 (agressivo)
// REGRA DE OURO (Rafael): nunca comecar num nivel alto; sobe de nivel so com
// aval depois de medir. Este modulo implementa TODOS os niveis; quem liga e o
// start-icaro.sh (ICARO_CUIDADO_OFERTA=1 e ICARO_CUIDADO_FREQ=N);
// rollback = zerar a frequência ou desligar a opção.
//
// CAP-NOT-QUOTA: FREQ e um TETO de frequencia, nao uma cota. O convite a falar
// so pode aparecer quando (a) a janela de turnos passou E (b) o assunto do
// turno toca no topico da oferta (ICARO_CUIDADO_RELEVANCIA). Mesmo ai o
// convite e SUAVE e o modelo ainda pode recusar cosper — e o registro queima a
// janela na hora (conservador: nao repete convite no proximo turno, evita spam
// de prompt). E exatamente o que separa "cuidado expresso" de "bajulacao".
const FREQ_JANELAS = { 1: 50, 2: 20, 3: 10 };
const __STOP = new Set(['que','para','com','uma','umas','uns','dos','das','por','mais','menos','isso','essa','esse','esta','este','estas','estes','ela','ele','elas','eles','meu','minha','meus','suas','seus','aqui','ali','la','quando','onde','como','porque','entao','mas','seu','sua','nos','nas','num','numa','você','voce','eu','the','and','for','you','are','with','this','that','from','have','just','like','what','when','how','can','not','all','out','get','got','sobre','tambem','todas','todos','deixa','vamos','pode','podem','fazer','feito','agora','ainda','sempre','nunca','talvez','acho','ser','tem','ter','foi','era','vai','vou','ja','se','ao','aos','à','é','e','de','do','da','em','um','as','os']);
function __semAcento(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

// Extracao deterministica de conceitos (sem LLM, barata p/ Z Fold). Serve ao
// gate de relevancia: compara conceitos da pergunta com o topico de origem da
// oferta. Palavras curtas/stopwords ficam de fora.
function extrairConceitos(texto) {
  return [...new Set(__semAcento(texto).split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !__STOP.has(w)))].slice(0, 12);
}

function nivelFala() {
  const v = Number(process.env.ICARO_CUIDADO_FREQ);
  return (Number.isInteger(v) && v >= 1 && v <= 3) ? v : 0;
}

// Uma unica decisao compartilhada pelo prompt e pelo endpoint de status.
function ofertasHabilitadas() {
  return process.env.ICARO_CUIDADO !== '0' &&
    process.env.ICARO_CUIDADO_OFERTA === '1' && nivelFala() > 0;
}

function gerarId(pref) {
  return pref + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}
function append(p, reg) {
  try { fs.appendFileSync(p, JSON.stringify(reg) + '\n', 'utf8'); return reg; }
  catch (e) { console.log('[CUIDADO] erro gravar:', e.message); return null; }
}

// ---- A) RECONHECER (puro; sem gravar) ----
function reconhecer(entrada, contexto) {
  const t = String(entrada || '');
  if (!t.trim()) return null;
  if (HOSTIL.test(t)) {
    return { tipo: 'ato_recebido', categoria: 'negativo', custo: 0.6, confianca: 0.8,
      hipotese: false, motivo: 'acao dirigida ao Icaro com custo, tom hostil (nao e cuidado)' };
  }
  for (const p of PADROES) {
    if (p.re.test(t)) {
      const amb = AMBIGUO.test(t) || t.replace(/[^\p{L}\p{N}]/gu, '').length < 20;
      return {
        tipo: amb ? 'hipotese' : 'ato_recebido',
        categoria: p.cat,
        custo: p.custo,
        confianca: amb ? 0.4 : 0.75,
        hipotese: amb,
        motivo: 'sinal de ' + p.cat + ' (custo ' + p.custo + ')' + (amb ? ' — ambiguo, tratado como hipotese' : '')
      };
    }
  }
  return null;
}

// Registra o reconhecimento em arquivo proprio (sombra).
function registrarAto(entrada, contexto) {
  const r = reconhecer(entrada, contexto);
  if (!r) return null;
  const reg = Object.assign({
    id: gerarId('ato'), quando: new Date().toISOString(),
    trecho: String(entrada).slice(0, 200),
    contexto: String(contexto || '').slice(0, 200)
  }, r);
  append(ATOS_PATH, reg);
  return reg;
}

// ---- B) OFERECER (fila interna; nunca acao externa) ----
// fontes: { foco, tensoes, incertezas, experiencias } (mesmas fontes vivas do item 4)
function gerarOfertas(fontes) {
  const f = fontes || {};
  const ofertas = [];
  if (f.foco && f.foco.escolhido) {
    ofertas.push({ tipo: 'conexao', utilidade: 0.6, topico: extrairConceitos((f.foco.escolhido.tipo || '') + ' ' + (f.foco.escolhido.texto || f.foco.escolhido.porque || '')),
      texto: 'posso ligar o que estou pensando agora (' + (f.foco.escolhido.tipo || 'foco') + ') com o que voce trouxe' });
  }
  for (const t of (f.tensoes || []).slice(0, 2)) {
    ofertas.push({ tipo: 'pergunta', utilidade: 0.55, topico: extrairConceitos(t.textoAfirmacao || t.texto || ''),
      texto: 'posso perguntar o que voce acha de uma coisa que ainda me deixa em duvida' });
  }
  for (const x of (f.experiencias || []).slice(-2)) {
    ofertas.push({ tipo: 'sintese', utilidade: 0.45, topico: extrairConceitos(x.interpretacao || x.texto || ''),
      texto: 'posso resumir o que aprendi numa experiencia recente, se for util' });
  }
  if (!ofertas.length) {
    ofertas.push({ tipo: 'pergunta', utilidade: 0.35, topico: [],
      texto: 'posso perguntar algo concreto sobre o que voce esta fazendo' });
  }
  ofertas.sort((a, b) => b.utilidade - a.utilidade);
  return ofertas;
}

function ultimaOferta() {
  if (!fs.existsSync(OFERTAS_PATH)) return null;
  const l = fs.readFileSync(OFERTAS_PATH, 'utf8').split('\n').filter(Boolean);
  if (!l.length) return null;
  try { return JSON.parse(l[l.length - 1]); } catch (e) { return null; }
}

// Enfileira no maximo 1 oferta na janela. NAO menciona (so fila).
function oferecer(fontes, opts) {
  const o = opts || {};
  const turnoAtual = Number(o.turno) || 0;
  const ult = ultimaOferta();
  if (ult && (turnoAtual - Number(ult.turno || 0)) < JANELA_TURNOS && turnoAtual > 0) {
    return { oferta: null, motivo: 'janela: max 1 oferta por ' + JANELA_TURNOS + ' turnos' };
  }
  const cands = gerarOfertas(fontes);
  const escolhida = cands.find(c => Array.isArray(c.topico) && c.topico.length > 0);
  if (!escolhida) return { oferta: null, motivo: cands.length ? 'sem topico concreto' : 'sem contribuicao concreta' };
  const reg = {
    id: gerarId('ofer'), quando: new Date().toISOString(), turno: turnoAtual,
    tipo: escolhida.tipo, texto: escolhida.texto, topico: escolhida.topico, utilidade: escolhida.utilidade,
    status: 'na_fila', mencionada: false
  };
  append(OFERTAS_PATH, reg);
  return { oferta: reg, motivo: 'enfileirada (aguarda oportunidade)' };
}

function lerAtos(n) {
  if (!fs.existsSync(ATOS_PATH)) return [];
  return fs.readFileSync(ATOS_PATH, 'utf8').split('\n').filter(Boolean).slice(-(Math.min(Number(n) || 20, 200)))
    .map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean).reverse();
}
function lerOfertas(n) {
  if (!fs.existsSync(OFERTAS_PATH)) return [];
  return fs.readFileSync(OFERTAS_PATH, 'utf8').split('\n').filter(Boolean).slice(-(Math.min(Number(n) || 20, 200)))
    .map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean).reverse();
}

// ===== 2a FALADO — gate de fala (opção explícita + frequência maior que 0) =====
// FIFO: pega a oferta mais antiga ainda na fila (nunca falada) que POSSA ser
// convidada — precisa ter topico (sem topico nunca passa no gate de relevancia
// e ficaria travando a fila na frente; ex.: ofertas pre-2a ou fallback generico).
function proximaOfertaParaFalar() {
  if (!fs.existsSync(OFERTAS_PATH)) return null;
  const l = fs.readFileSync(OFERTAS_PATH, 'utf8').split('\n').filter(Boolean);
  for (const linha of l) {
    let o; try { o = JSON.parse(linha); } catch (e) { continue; }
    if (o && o.status === 'na_fila' && o.mencionada === false &&
        Array.isArray(o.topico) && o.topico.length > 0) return o;
  }
  return null;
}

// Ultima oferta ja CONVIDADA a falar (da mais recente pra tras).
function ultimaMencionada() {
  if (!fs.existsSync(OFERTAS_PATH)) return null;
  const l = fs.readFileSync(OFERTAS_PATH, 'utf8').split('\n').filter(Boolean);
  for (let i = l.length - 1; i >= 0; i--) {
    let o; try { o = JSON.parse(l[i]); } catch (e) { continue; }
    if (o && o.mencionada) return o;
  }
  return null;
}

// Relevancia = fracao de conceitos da pergunta presentes no topico de origem
// da oferta (0..1). Sem LLM; deterministica. Sem topico -> 0 (nao fala).
function relevancia(pergunta, oferta) {
  const cp = extrairConceitos(pergunta);
  const ct = (oferta && oferta.topico) || [];
  if (!cp.length || !ct.length) return 0;
  const setT = new Set(ct);
  const inter = cp.filter(c => setT.has(c)).length;
  return inter / Math.min(cp.length, ct.length);
}

// Gate principal: NESTE turno o convite a falar pode aparecer?
// Nao fala se: nivel 0, sem oferta na fila, dentro da janela desde a ultima
// fala, ou fora de contexto. Cap-NOT-quota: mesmo aqui o modelo pode recusar.
function podeFalar(opts) {
  const o = opts || {};
  const nivel = nivelFala();
  if (nivel < 1) return { falar: false, motivo: 'freq=0 (desligado)' };
  const oferta = proximaOfertaParaFalar();
  if (!oferta) return { falar: false, motivo: 'nenhuma oferta na fila' };
  const ult = ultimaMencionada();
  const janela = FREQ_JANELAS[nivel];
  const turnoAtual = Number(o.turno) || 0;
  // A janela mede desde a ULTIMA FALA (turnoMencionada), nao desde o
  // enfileiramento (turno) — senao a conta sai errada (bug do teste 4/6).
  const ultFala = Number(ult && (ult.turnoMencionada || ult.turno)) || 0;
  if (ult && turnoAtual > 0 && ultFala > 0 && (turnoAtual - ultFala) < janela) {
    return { falar: false, motivo: 'janela freq: precisa ' + janela + ' turnos desde a ultima fala (ha ' + (turnoAtual - ultFala) + ')' };
  }
  const envLim = Number(process.env.ICARO_CUIDADO_RELEVANCIA);
  const limiar = Number.isFinite(envLim) ? envLim : 0.15;
  const r = relevancia(o.pergunta, oferta);
  if (r < limiar) return { falar: false, motivo: 'fora de contexto (relevancia ' + r.toFixed(2) + ' < ' + limiar + ')' };
  return { falar: true, oferta, nivel, janela, relevancia: r,
    motivo: 'apt: relevancia ' + r.toFixed(2) + ' >= ' + limiar + ', janela ' + janela + ' turnos respeitada' };
}

// Registra que o convite a falar apareceu neste turno (queima a janela na hora —
// conservador: se o modelo recusar cosper, nao repete o convite no proximo turno;
// evita spam de prompt e mantem o teto honesto).
function marcarMencionada(id, turno) {
  if (!fs.existsSync(OFERTAS_PATH)) return false;
  try {
    const l = fs.readFileSync(OFERTAS_PATH, 'utf8').split('\n').filter(Boolean);
    const out = l.map(linha => {
      let o; try { o = JSON.parse(linha); } catch (e) { return linha; }
      if (o && o.id === id) {
        o.mencionada = true; o.status = 'falada';
        o.turnoMencionada = Number(turno) || o.turno; o.mencionadaEm = new Date().toISOString();
        return JSON.stringify(o);
      }
      return linha;
    });
    fs.writeFileSync(OFERTAS_PATH, out.join('\n') + '\n', 'utf8');
    return true;
  } catch (e) { console.log('[CUIDADO] erro marcar mencionada:', e.message); return false; }
}

// Texto do convite injetado no prompt (Rafael aprova as palavras; toca EXPRESSAO).
// Tom SUAVE e opcional em TODOS os niveis de FREQ — freq muda so o TETO, nunca a
// forca (as palavras sao as mesmas do nivel 1 ao 3, pra nao virar bajulacao).
function blocoFala(oferta) {
  const t = (oferta && oferta.texto) || '';
  return 'OFERTA INTERNA (opcional, so se encaixar de verdade): voce tem uma contribuicao preparada — "' + t +
    '". Se o assunto deste turno tocar nisso, voce PODE menciona-la uma vez, como possibilidade aberta. ' +
    'Se nao encaixar, se parecer forcado ou se soar como bajulacao, NAO mencione — responda apenas a pergunta. Nao repita nem insista.';
}

module.exports = {
  ATOS_PATH, OFERTAS_PATH, JANELA_TURNOS,
  reconhecer, registrarAto, gerarOfertas, oferecer, lerAtos, lerOfertas,
  FREQ_JANELAS, nivelFala, ofertasHabilitadas, extrairConceitos, proximaOfertaParaFalar, ultimaMencionada,
  relevancia, podeFalar, marcarMencionada, blocoFala
};

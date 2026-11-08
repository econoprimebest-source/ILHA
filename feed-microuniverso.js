'use strict';
// Feed "Microuniverso": transforma eventos técnicos do motor em frases de reality show.
// Puro: recebe o estado e as linhas de log e devolve uma lista pronta para o app.
const LOCAL = { rio: 'no rio', mar: 'no mar', bosque: 'no bosque', floresta: 'na floresta', cachoeira: 'na cachoeira', fazenda: 'na fazenda', fogueira: 'junto à fogueira', acampamento: 'no acampamento', caverna: 'na caverna', arena: 'na arena', barco: 'no barco', ilha_vizinha: 'na ilha vizinha', casa_icaro: 'na casa do Ícaro', casa_joao: 'na casa do João', casa_maria: 'na casa da Maria' };
const ACAO = {
  pescar: n => `${n} está pescando`, beber: n => `${n} está matando a sede`, comer: n => `${n} está comendo`,
  descansar: n => `${n} está descansando`, dormir: n => `${n} caiu no sono`, observar: n => `${n} observa tudo em silêncio`,
  colher_frutas: n => `${n} está colhendo frutas`, coletar_agua: n => `${n} está pegando água`,
  coletar_madeira: n => `${n} está juntando madeira`, acender_fogueira: n => `${n} cuida da fogueira`,
  plantar: n => `${n} está plantando`, melhorar_abrigo: n => `${n} está reforçando o abrigo`,
  esperar: n => `${n} espera, pensativo(a)`, falar: n => `${n} puxou conversa`, conviver: n => `${n} está convivendo com os outros`, praticar_esporte: n => `${n} está praticando esporte e treinando`, planejar_amanha: n => `${n} está planejando o dia de amanhã`, churrasco_fogueira: n => `${n} está assando comida e confraternizando na fogueira`,
};
const ICONE = { praticar_esporte: '🏃', planejar_amanha: '📋', churrasco_fogueira: '🍖', pescar: '🎣', comer: '🍖', beber: '💧', descansar: '😴', dormir: '😴', fala: '💬', missao: '🧭', diretor: '🎬', clima: '🌧️', acao: '🏝️' };
const PERIODOS = ['madrugada', 'manhã', 'tarde', 'noite'];

function fraseEvento(e) {
  const nome = e.nome || e.serId || 'Alguém';
  const lugar = LOCAL[e.local] ? ' ' + LOCAL[e.local] : '';
  if (e.fala) return { tipo: 'fala', icone: ICONE.fala, texto: `${nome} disse: “${e.fala}”`, serId: e.serId };
  const f = ACAO[e.acao];
  if (f) return { tipo: 'acao', icone: ICONE[e.acao] || ICONE.acao, texto: f(nome) + lugar + '.', serId: e.serId };
  if (e.acao && /^ir_/.test(e.acao)) return { tipo: 'acao', icone: '🚶', texto: `${nome} saiu caminhando${lugar}.`, serId: e.serId };
  if (e.acao === 'continuar') return null;                       // ruído: não vira notícia
  if (e.acao) return { tipo: 'acao', icone: ICONE.acao, texto: `${nome} decidiu: ${String(e.acao).replace(/_/g, ' ')}${lugar}.`, serId: e.serId };
  return null;
}

// linhas: eventos de log (ciclo, nome, acao, local, fala, serId). estado: opcional (missões, clima).
function montarFeed(estado, linhas, limite = 40) {
  const itens = [];
  for (const l of linhas || []) {
    const f = fraseEvento(l); if (f) itens.push({ ciclo: l.ciclo, ...f });
  }
  const m = estado && estado.missoes;
  if (m) for (const l of m.log || []) itens.push({ ciclo: l.ciclo, tipo: 'missao', icone: ICONE.missao, texto: l.texto, serId: l.serId });
  const dir = estado && estado.ultimoDiretor;
  if (dir && (dir.mensagem || dir.texto)) itens.push({ ciclo: dir.ciclo || 0, tipo: 'diretor', icone: ICONE.diretor, texto: 'O Diretor IA: ' + (dir.mensagem || dir.texto) });
  itens.sort((a, b) => (b.ciclo || 0) - (a.ciclo || 0));
  return itens.slice(0, limite);
}

function resumo(estado) {
  const t = (estado && estado.mundo && estado.mundo.tempo) || {};
  return { ciclo: t.ciclo || 0, dia: t.dia, periodo: t.periodo, estacao: t.estacao, clima: estado && estado.mundo && estado.mundo.clima };
}
module.exports = { fraseEvento, montarFeed, resumo, PERIODOS };

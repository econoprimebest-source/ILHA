'use strict';
const assert = require('assert'), F = require('./feed-microuniverso'), M = require('./missoes'), { novo } = require('./estado-v2');
let n = 0; function t(nome, fn) { fn(); n++; console.log('OK feed: ' + nome); }
t('ação vira frase com lugar', () => {
  const f = F.fraseEvento({ nome: 'Maria', acao: 'pescar', local: 'rio', serId: 'maria' });
  assert.equal(f.texto, 'Maria está pescando no rio.');
});
t('fala vira citação e tem prioridade sobre a ação', () => {
  const f = F.fraseEvento({ nome: 'João', acao: 'observar', fala: 'Vem chuva', serId: 'joao' });
  assert.equal(f.tipo, 'fala'); assert(f.texto.includes('Vem chuva'));
});
t('ruído (continuar) não vira notícia e ir_ vira caminhada', () => {
  assert.equal(F.fraseEvento({ nome: 'A', acao: 'continuar' }), null);
  assert(F.fraseEvento({ nome: 'A', acao: 'ir_rio', local: 'rio' }).texto.includes('caminhando'));
});
t('montarFeed ordena do mais novo, inclui missões e respeita o limite', () => {
  const e = novo(); M.enviar(e, 'icaro', 'buscar_lenha');
  const linhas = [{ ciclo: 1, nome: 'A', acao: 'comer' }, { ciclo: 9, nome: 'B', acao: 'beber' }, { ciclo: 5, nome: 'C', acao: 'continuar' }];
  const feed = F.montarFeed(e, linhas, 10);
  assert.equal(feed[0].ciclo >= feed[feed.length - 1].ciclo, true);
  assert(feed.some(i => i.tipo === 'missao')); assert.equal(feed.filter(i => i.ciclo === 5).length, 0);
  assert.equal(F.montarFeed(e, linhas, 1).length, 1);
});
t('montarFeed tolera estado vazio', () => { assert.deepEqual(F.montarFeed(null, null), []); assert.equal(F.resumo(null).ciclo, 0); });
console.log('RESULTADO FEED ' + n + ' testes OK');

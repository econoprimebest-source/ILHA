'use strict';
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const M = require('./missoes'), { novo } = require('./estado-v2');
let n = 0; function t(nome, fn) { fn(); n++; console.log('OK missoes: ' + nome); }
const rod = (ciclo, serId, acao, local) => ({ ciclo, eventos: [{ serId, decisao: { acao }, localFinal: local }] });

t('enviar cria missão ativa e registra no log', () => {
  const e = novo(); const i = M.enviar(e, 'icaro', 'pescar_para_todos');
  assert.equal(e.missoes.ativas.length, 1); assert.equal(i.progresso, 0); assert.equal(e.missoes.log[0].tipo, 'enviada');
});
t('não aceita missão desconhecida, ser inexistente, nem missão dupla', () => {
  const e = novo(); assert.throws(() => M.enviar(e, 'icaro', 'x')); assert.throws(() => M.enviar(e, 'fantasma', 'buscar_lenha'));
  M.enviar(e, 'icaro', 'buscar_lenha'); assert.throws(() => M.enviar(e, 'icaro', 'pescar_para_todos'));
});
t('progresso exige ação e local corretos', () => {
  const e = novo(); M.enviar(e, 'icaro', 'pescar_para_todos');
  M.tick(e, rod(1, 'icaro', 'pescar', 'mar')); assert.equal(e.missoes.ativas[0].progresso, 0);
  M.tick(e, rod(2, 'icaro', 'descansar', 'rio')); assert.equal(e.missoes.ativas[0].progresso, 0);
  M.tick(e, rod(3, 'icaro', 'pescar', 'rio')); assert.equal(e.missoes.ativas[0].progresso, 1);
});
t('conclusão aplica recompensa limitada a 0-100 e libera o ser', () => {
  const e = novo(), s = e.seres.icaro; s.necessidades.satisfacao = 95; M.enviar(e, 'icaro', 'pescar_para_todos');
  M.tick(e, rod(1, 'icaro', 'pescar', 'rio')); const r = M.tick(e, rod(2, 'icaro', 'pescar', 'rio'));
  assert.equal(r[0].resultado, 'sucesso'); assert.equal(s.necessidades.satisfacao, 100);
  assert.equal(e.missoes.ativas.length, 0); assert.equal(e.missoes.concluidas.length, 1); M.enviar(e, 'icaro', 'buscar_lenha');
});
t('prazo vencido falha e aplica penalidade da missão de risco', () => {
  const e = novo(), s = e.seres.icaro; s.necessidades.saude = 80; const ini = e.mundo.tempo.ciclo;
  M.enviar(e, 'icaro', 'caverna_sombria'); const r = M.tick(e, { ciclo: ini + 99, eventos: [] });
  assert.equal(r[0].resultado, 'falha'); assert.equal(s.necessidades.saude, 50); assert.equal(e.missoes.falhas.length, 1);
});
t('missão de ser morto falha sem penalizá-lo', () => {
  const e = novo(); M.enviar(e, 'icaro', 'buscar_lenha'); e.seres.icaro.status = 'morto';
  assert.equal(M.tick(e, { ciclo: 1, eventos: [] })[0].resultado, 'falha');
});
t('fila em disco: enfileirar + aplicarFila, tolerando itens inválidos', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'miss-')), f = path.join(d, 'fila.json'), e = novo();
  M.enfileirar('icaro', 'explorar_cachoeira', f); fs.writeFileSync(f, JSON.stringify([...JSON.parse(fs.readFileSync(f, 'utf8')), { serId: 'zzz', tipoId: 'buscar_lenha' }]));
  const ok = M.aplicarFila(e, f); assert.equal(ok.length, 1); assert.equal(fs.readFileSync(f, 'utf8'), '[]'); fs.rmSync(d, { recursive: true, force: true });
});
t('estado com missões continua válido e serializável', () => {
  const e = novo(); M.enviar(e, 'icaro', 'buscar_lenha'); const { validar } = require('./estado-v2');
  validar(JSON.parse(JSON.stringify(e)));
});
console.log('RESULTADO MISSOES ' + n + ' testes OK');

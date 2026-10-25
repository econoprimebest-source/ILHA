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
// ---- Caverna Sombria letal ----
const cav = (c, id = 'icaro') => rod(c, id, 'observar', 'caverna');
t('caverna: dano por ciclo e determinístico (mesma entrada, mesmo dano)', () => {
  const a = novo(), b = novo(); M.enviar(a, 'icaro', 'caverna_sombria'); M.enviar(b, 'icaro', 'caverna_sombria');
  a.mundo.tempo.ciclo = b.mundo.tempo.ciclo = 5; M.tick(a, cav(5)); M.tick(b, cav(5));
  assert.equal(a.seres.icaro.necessidades.saude, b.seres.icaro.necessidades.saude); assert(a.seres.icaro.necessidades.saude < 100);
});
t('caverna: saúde chega a zero => ser morre, estado e CORTEX registram com peso máximo', () => {
  const e = novo(), s = e.seres.icaro; s.necessidades.saude = 1; M.enviar(e, 'icaro', 'caverna_sombria');
  const r = M.tick(e, cav(7));
  assert.equal(r[0].resultado, 'morte'); assert.equal(s.status, 'morto'); assert.equal(s.necessidades.saude, 0);
  assert.equal(s.causaMorte.missaoId, e.missoes.falhas[0].id); assert.equal(e.missoes.falhas[0].morte, true);
  const mc = s.cortex.marcos.find(x => x.tipo === 'morte'); assert(mc && mc.peso === 1 && mc.ciclo === 7);
  assert(s.memoria.some(x => x.tipo === 'morte' && x.peso === 1)); assert(s.cortex.memoria.some(x => /Morri/.test(x)));
  assert.equal(e.missoes.log.at(-1).tipo, 'morreu'); assert.equal(e.missoes.ativas.length, 0);
  assert.throws(() => M.enviar(e, 'icaro', 'buscar_lenha'));
});
t('caverna: sobreviver concede traço corajoso + marco de coragem (sem duplicar o traço)', () => {
  const e = novo(), s = e.seres.icaro; s.necessidades.saude = 100; s.capacidades.resistencia = 1; s.capacidades.forca = 1; M.enviar(e, 'icaro', 'caverna_sombria');
  M.tick(e, cav(1)); const r = M.tick(e, cav(2));
  assert.equal(r[0].resultado, 'sucesso'); assert.equal(s.status, 'vivo'); assert(s.necessidades.saude > 0);
  assert(s.personalidade.includes('corajoso')); assert(s.cortex.marcos.some(x => x.tipo === 'coragem' && x.peso === 1));
  M.enviar(e, 'icaro', 'caverna_sombria'); M.tick(e, cav(3)); M.tick(e, cav(4));
  assert.equal(s.personalidade.filter(x => x === 'corajoso').length, 1);
});
t('caverna: sobreviver por pouco grava também marco de quase-morte', () => {
  const e = novo(), s = e.seres.icaro; s.capacidades.resistencia = 1; s.capacidades.forca = 1; s.necessidades.saude = 22; M.enviar(e, 'icaro', 'caverna_sombria');
  M.tick(e, cav(1)); const r = M.tick(e, cav(2));
  if (r[0].resultado === 'sucesso') assert(s.cortex.marcos.some(x => x.tipo === 'quase_morte') === (s.necessidades.saude <= 20 || (e.missoes.concluidas[0].menorSaude <= 20)));
  else assert.equal(r[0].resultado, 'morte');
});
t('caverna: falhar por prazo com saúde baixa mata (penalidade de saúde pode ser fatal)', () => {
  const e = novo(), s = e.seres.icaro; s.necessidades.saude = 25; M.enviar(e, 'icaro', 'caverna_sombria');
  const r = M.tick(e, { ciclo: e.mundo.tempo.ciclo + 99, eventos: [] });
  assert.equal(r[0].resultado, 'morte'); assert.equal(s.status, 'morto'); assert(s.cortex.marcos.some(x => x.tipo === 'morte'));
});
t('missões de baixo risco nunca causam dano nem morte', () => {
  const e = novo(), s = e.seres.icaro; M.enviar(e, 'icaro', 'explorar_cachoeira'); M.tick(e, rod(1, 'icaro', 'observar', 'cachoeira'));
  assert.equal(s.status, 'vivo'); assert.equal(s.necessidades.saude, 100); assert(!s.cortex || !s.cortex.marcos);
});
console.log('RESULTADO MISSOES ' + n + ' testes OK');

// nucleo-prov-label.js — 1a do OPCOES-WIRING-2026-10-13 (aprovado por Rafael
// em 14/10/2026: "rotular nao-confirmado" implementar primeiro).
//
// O que faz: rotula como "(nao confirmado)" no prompt daqueles FATOS cuja fala
// de origem foi marcada na proveniencia como ecoSuspeito ou ratificacaoCega
// (vetores diagnosticados no exp-03). NAO remove nada — so qualifica, como
// pedido na opcao 1a.
//
// Regras deste wiring (Rafael, 14/10):
// - Flag OFF por padrao: ligada so com ICARO_PROV_LABEL=1 (rollback = tirar a var).
// - SOMBRA DE ESCRITA: este modulo nao altera memoria-v2, proveniencia nem
//   nenhum arquivo canonico; apenas decide o render de uma linha do prompt.
// - Nao toca cortex-engine.js nem nucleo-tracos.js.
// - Teste primeiro em copia isolada (porta 8795+); producao so apos validar.
//
// Regra de match (deterministica, documentada para auditoria):
//   entre as falas de usuario (fala_usuario) registradas, encontra a MAIS
//   PROXIMA do `at` do fato (a extracao acontece no mesmo turno da fala);
//   o fato e rotulado se essa fala mais proxima estiver marcada com
//   ecoSuspeito ou ratificacaoCega, dentro de +/-3 min. Match por
//   proximidade de tempo (e nao por palavras) porque ratificacaoCega e
//   "sim" curto, sem palavras de conteudo. Fato sem fala na janela -> nao
//   rotula.

const fs = require('fs');
const path = require('path');

const JANELA_MS = 3 * 60 * 1000; // +/-3 min entre a fala marcada e a criacao do fato

// ===== 1b PROV-NIVEL (Rafael, 14/10/2026) — remocao calibravel =====
// Rafael autorizou 1b como PARAMETRO (nao flag unica), numeros aprovados
// 14/10 (suspeita 1.0 ratificacaoCega / 0.85 ecoSuspeito / 0.5 nao-ratificado;
// limiares 0.8 e 0.5):
//   ICARO_PROV_NIVEL 0..3:
//     0 = desligado (padrao; sem a var nada muda, byte-identico)
//     1 = so rotulo (1a: ICARO_PROV_LABEL)
//     2 = tira do prompt suspeita >= 0.8 (ratificacaoCega e ecoSuspeito)
//     3 = tira suspeita >= 0.5 (tambem 'proposta'/inferencia sem ratificar)
// Deterministico e auditavel: mesmo match +/-3min do 1a. Nao escreve em
// memoria-v2 nem proveniencia — so decide o que entra no prompt.
// Rollback: tirar ICARO_PROV_NIVEL (volta a 0).
const LIMIARES = { 2: 0.8, 3: 0.5 };

function __pathProv() {
  if (process.env.ICARO_PROV_PATH) return process.env.ICARO_PROV_PATH;
  return path.join(__dirname, 'proveniencia.jsonl');
}

function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

// Carrega TODAS as falas de usuario com as flags. Le o arquivo inteiro
// (append-only, pequeno); falha de leitura -> lista vazia (nao rotula nada;
// erro nunca derruba o turno).
function carregarFalas() {
  try {
    const p = __pathProv();
    if (!fs.existsSync(p)) return [];
    const falas = [];
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!l) continue;
      let j; try { j = JSON.parse(l); } catch (e) { continue; }
      if (!j || j.tipo !== 'fala_usuario') continue;
      const emMs = Date.parse(j.em);
      if (!Number.isFinite(emMs)) continue;
      falas.push({
        emMs,
        eco: !!(j.contexto && j.contexto.ecoSuspeito),
        rat: !!(j.contexto && j.contexto.ratificacaoCega)
      });
    }
    return falas;
  } catch (e) {
    return [];
  }
}

// So as marcadas (inspecao/estatistica; o match usa carregarFalas).
function carregarSuspeitas() {
  return carregarFalas().filter(f => f.eco || f.rat);
}

// Fala de usuario MAIS PROXIMA do fato dentro da janela (+/-3 min), ou null.
function __falaProxima(fato, falas) {
  if (!fato || !falas || !falas.length) return null;
  const atMs = Date.parse(fato && fato.at);
  if (!Number.isFinite(atMs)) return null;
  let melhor = null, melhorDt = Infinity;
  for (const f of falas) {
    const dt = Math.abs(atMs - f.emMs);
    if (dt <= JANELA_MS && dt < melhorDt) { melhor = f; melhorDt = dt; }
  }
  return melhor;
}

// True se a fala de usuario MAIS PROXIMA do fato (dentro de +/-3 min) estava
// marcada com ecoSuspeito ou ratificacaoCega.
function ehNaoConfirmado(fato, falas) {
  const melhor = __falaProxima(fato, falas);
  return !!(melhor && (melhor.eco || melhor.rat));
}

// Nota de suspeita do fato (0..1), deterministica e auditavel:
//   1.0  origem com ratificacaoCega (a mais grave)
//   0.85 origem com ecoSuspeito
//   0.5  ainda nao ratificado: status 'proposta' ou inferencia propria
//        (source assistant) sem status 'ativo'
//   0    fato confirmado/normal
function suspeitaFato(fato, falas) {
  if (!fato) return 0;
  const melhor = __falaProxima(fato, falas);
  if (melhor && melhor.rat) return 1.0;
  if (melhor && melhor.eco) return 0.85;
  if (fato.status === 'proposta') return 0.5;
  if (fato.source === 'assistant' && fato.status !== 'ativo') return 0.5;
  return 0;
}

// 1b: remove este fato do prompt no nivel pedido? Nivel 0/1 = nunca (so rotulo).
function deveRemover(fato, falas, nivel) {
  const lim = LIMIARES[Number(nivel)];
  if (!lim) return false;
  return suspeitaFato(fato, falas) >= lim;
}

// Render de uma linha de fato: frase canonica + rotulo quando aplicavel.
// `ligado` vem do chamador (ICARO_PROV_LABEL === '1'); desligado = render
// identico ao atual, byte a byte.
function fraseRotulada(fato, fraseCanonica, ligado) {
  const base = String(fraseCanonica || '');
  if (!ligado) return base;
  return ehNaoConfirmado(fato, carregarFalas()) ? base + ' (nao confirmado)' : base;
}

module.exports = { JANELA_MS, LIMIARES, carregarFalas, carregarSuspeitas, ehNaoConfirmado, fraseRotulada, suspeitaFato, deveRemover, normalizar };

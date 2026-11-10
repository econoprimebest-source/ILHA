'use strict';
// SELECAO-CONTEXTUAL (08/10/2026): seleciona fatos relevantes por pergunta.
// Baseado em Synapse (ACL 2026) + MemWeave (IEEE 2026).
// Sem embedding: selecao lexical simples primeiro.

const N = require('./nucleo-memoria-v2');

// Detecta se pergunta e generica (puxa tudo) ou especifica (puxa top-K)
function ehGenerica(pergunta) {
  const p = N.semAcento(String(pergunta || '').toLowerCase());
  const genericas = ['resuma', 'resumo', 'tudo', 'geral', 'visao', 'panorama',
                     'quem sou', 'sobre mim', 'me conhece', 'sabe sobre'];
  for (const g of genericas) if (p.includes(g)) return true;
  if (p.split(/\s+/).length <= 3) return true;
  return false;
}

// Score de um fato contra sementes
function scoreFato(fato, sementes) {
  const alvo = N.semAcento(
    ((fato.predicado || '') + ' ' + (fato.objeto || '') + ' ' + (fato.sujeito || '')).toLowerCase()
  );
  const chaves = (fato.chaves || []).map(k => N.semAcento(String(k).toLowerCase()));
  let score = 0;
  for (const s of sementes) {
    const sa = N.semAcento(s.toLowerCase());
    if (chaves.some(k => k.includes(sa) || sa.includes(k))) score += 3;
    else if (alvo.includes(sa)) score += 1;
  }
  return score;
}

// Seleciona fatos relevantes
function selecionar(pergunta, fatos, opcoes) {
  if (!Array.isArray(fatos) || fatos.length === 0) return [];
  const opts = opcoes || {};
  const maxGenerica = opts.maxGenerica || fatos.length;
  const maxEspecifica = opts.maxEspecifica || 8;
  const minScore = opts.minScore || 1;
  if (ehGenerica(pergunta)) return fatos.slice(0, maxGenerica);
  let sementes = [];
  try {
    const A = require('./nucleo-associacoes');
    sementes = String(pergunta).split(/\s+/).filter(x => x.length >= 3).slice(0, 5);
  } catch (e) {
    sementes = String(pergunta).split(/\s+/).filter(x => x.length >= 3).slice(0, 5);
  }
  if (!sementes.length) return fatos.slice(0, maxEspecifica);
  const scored = fatos.map(f => ({ fato: f, score: scoreFato(f, sementes) }));
  scored.sort((a, b) => b.score - a.score);
  const relevantes = scored.filter(x => x.score >= minScore).map(x => x.fato);
  if (!relevantes.length) return fatos.slice(0, maxEspecifica);
  return relevantes.slice(0, maxEspecifica);
}

module.exports = { selecionar, ehGenerica, scoreFato };

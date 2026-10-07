// consolidador.js — Consolida eventos antigos sem perder informação
// Regras:
//   nucleo: nunca consolida (fatos, valores, relações, marcos)
//   ativo: consolida se > 200 eventos
//   trivial: consolida se > 50 eventos
//
// Saída:
//   eventos ativos (recentes) + eventos-consolidados (resumos) + eventos-arquivo (brutos)

const fs = require('fs');
const path = require('path');

// === CLASSIFICADOR DE PRIORIDADE ===
// Decide se um evento é núcleo, ativo ou trivial
function classificar(evento) {
  const entrada = String(evento.entrada || '').toLowerCase();
  const cerne = String(evento.cerne || '').toLowerCase();

  // NÚCLEO — nunca consolida
  // - Fatos sobre pessoas (Lara, Rex, aniversário)
  // - Valores, crenças, mudanças de comportamento
  // - Marcos (primeira vez, descoberta)
  if (/\b(aniversario|irmao|irma|filho|filha|pai|mae)\b/.test(entrada)) return 'nucleo';
  if (/\b(aprenda isso|lembre|grave|nunca esqueca|importante)\b/.test(entrada)) return 'nucleo';
  if (/\b(eu sou|meu nome|eu quero|eu valorizo|eu acredito)\b/.test(entrada)) return 'nucleo';
  if (cerne === 'aspiracao' || cerne === 'valor' || cerne === 'crenca') return 'nucleo';

  // TRIVIAL — consolida cedo
  // - Saudações, monossílabos, perguntas vazias
  if (/^(oi|ola|bom dia|boa tarde|boa noite|tchau|ok|sim|nao|legal|bacana)\b/.test(entrada)) return 'trivial';
  if (entrada.length < 10) return 'trivial';

  // ATIVO — o resto
  return 'ativo';
}

// === CONSOLIDADOR ===
function consolidar(eventos, opcoes = {}) {
  const limiteNucleo = opcoes.limiteNucleo || 999999;   // núcleo nunca consolida
  const limiteAtivo = opcoes.limiteAtivo || 200;         // ativo: mantém 200 mais recentes
  const limiteTrivial = opcoes.limiteTrivial || 50;      // trivial: mantém 50 mais recentes

  // Classifica cada evento
  const comClassificacao = eventos.map((e, i) => ({
    ...e,
    _idx: i,
    _classe: classificar(e)
  }));

  const nucleo = comClassificacao.filter(e => e._classe === 'nucleo');
  const ativos = comClassificacao.filter(e => e._classe === 'ativo');
  const triviais = comClassificacao.filter(e => e._classe === 'trivial');

  // Ordena por timestamp (mais recente primeiro)
  const porData = (a, b) => new Date(b.at || 0) - new Date(a.at || 0);
  nucleo.sort(porData);
  ativos.sort(porData);
  triviais.sort(porData);

  // Separa o que fica ativo e o que vai pro arquivo
  const ativosMantidos = ativos.slice(0, limiteAtivo);
  const ativosArquivados = ativos.slice(limiteAtivo);

  const triviaisMantidos = triviais.slice(0, limiteTrivial);
  const triviaisArquivados = triviais.slice(limiteTrivial);

  // Consolida os arquivados em resumos
  const resumos = [];
  if (ativosArquivados.length > 0) {
    resumos.push(gerarResumo(ativosArquivados, 'ativos'));
  }
  if (triviaisArquivados.length > 0) {
    resumos.push(gerarResumo(triviaisArquivados, 'triviais'));
  }

  // Resultado
  return {
    nucleo,                                           // sempre ativo
    ativos: ativosMantidos,                           // mantidos ativos
    triviais: triviaisMantidos,                       // mantidos ativos
    consolidados: resumos,                            // resumos dos arquivados
    arquivados: [...ativosArquivados, ...triviaisArquivados], // brutos (vão pro arquivo)
    stats: {
      total: eventos.length,
      nucleo: nucleo.length,
      ativos_ativos: ativosMantidos.length,
      ativos_arquivados: ativosArquivados.length,
      triviais_ativos: triviaisMantidos.length,
      triviais_arquivados: triviaisArquivados.length,
      resumos: resumos.length
    }
  };
}

// Gera um resumo descritivo de um conjunto de eventos
function gerarResumo(eventos, tipo) {
  if (eventos.length === 0) return null;

  // Ordena por data (mais antigo primeiro)
  const ordenados = [...eventos].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];

  const dataInicio = primeiro.at ? new Date(primeiro.at).toLocaleDateString('pt-BR') : '?';
  const dataFim = ultimo.at ? new Date(ultimo.at).toLocaleDateString('pt-BR') : '?';

  // Extrai temas (palavras que aparecem em 2+ entradas)
  const palavras = {};
  for (const e of eventos) {
    const texto = String(e.entrada || '').toLowerCase();
    const tokens = texto.match(/\b[a-z]{4,}\b/g) || [];
    for (const t of new Set(tokens)) {
      if (['voce', 'sobre', 'entao', 'porque', 'assim', 'ainda', 'pode', 'quando', 'onde'].includes(t)) continue;
      palavras[t] = (palavras[t] || 0) + 1;
    }
  }
  const temas = Object.entries(palavras)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p]) => p);

  return {
    tipo,
    periodo: `${dataInicio} a ${dataFim}`,
    total_eventos: eventos.length,
    temas_recorrentes: temas,
    resumo: `Entre ${dataInicio} e ${dataFim}, ${eventos.length} interações (${tipo}). Temas: ${temas.join(', ') || 'nenhum recorrente'}.`
  };
}

module.exports = { consolidar, classificar };
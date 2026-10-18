'use strict';
// CÉREBRO DO MUNDO (Game Master LLM — inspirado em DeepMind Concordia / Project Doxa)
// Regra de Ouro da Ilha Aurora: O Diretor NUNCA controla a mente nem programa ações
// dos personagens. Ele observa o estado dramático da ilha (tédio, loops, isolamento,
// escassez, conforto excessivo) e altera APENAS o ambiente físico (suprimento,
// artefato, tempestade, predador, seca, cardume). Os personagens percebem o evento
// físico pelos sentidos e decidem com 100% de livre-arbítrio via CORTEX.

const fs = require('fs');
const path = require('path');
const espaco = require('./espaco');
const { mesDe } = require('./calendario');

const ARQ_FILA = path.join(__dirname, 'intervencoes-fila.json');
const OLLAMA_BASE = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/api\/(chat|generate)\/?$/, '').replace(/\/$/, '');
const MODELO_DIRETOR = process.env.ILHA_DIRETOR_MODELO || process.env.ILHA_MODELO || 'qwen3:8b';
const INTERVALO_PADRAO = Number(process.env.ILHA_DIRETOR_INTERVALO || 10);

const TIPOS_VALIDOS = ['suprimento', 'artefato', 'tempestade', 'predador', 'seca', 'cardume'];
const LOCAIS_VALIDOS = espaco.locais();

const SCHEMA_DIRETOR = {
  type: 'object',
  properties: {
    raciocinio: { type: 'string' },
    tipo: { type: 'string', enum: TIPOS_VALIDOS },
    local: { type: 'string', enum: LOCAIS_VALIDOS },
    descricao: { type: 'string' }
  },
  required: ['raciocinio', 'tipo', 'local', 'descricao']
};

let pensando = false;
let ultimoCicloAgido = -1;

// Sanitiza pista física para nunca violar o contrato de percepção (sem verbos prescritivos nem 'agora')
function limparPistaFisica(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .replace(/\b(preciso|deveria|seria|agora|faria bem|talvez|tenho que|devo)\b/gi, 'neste instante')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function diagnosticarMundo(estado) {
  const m = estado.mundo || {};
  const t = m.tempo || { ciclo: 0, dia: 1, periodo: 'manha', estacao: 'chuvas' };
  const mes = mesDe(t);
  const eco = m.ecossistema || {};
  const seres = Object.values(estado.seres || {}).filter(s => s.status !== 'morto');
  const decs = (estado.historico && Array.isArray(estado.historico.decisoes)) ? estado.historico.decisoes : [];

  const linhasSeres = [];
  const alertasMonotonia = [];

  for (const s of seres) {
    const n = s.necessidades || {};
    const ultimas = decs.filter(d => d.serId === s.id).slice(-5).map(d => d.acao);
    const ultimaAcao = ultimas[ultimas.length - 1] || s.acao || 'nenhuma';
    const repeticoes = ultimas.filter(a => a === ultimaAcao).length;
    const emLoop = ultimas.length >= 3 && repeticoes >= 3 && ultimaAcao !== 'continuar';
    if (emLoop) {
      alertasMonotonia.push(`${s.nome} está repetindo "${ultimaAcao}" em ${s.local} (${repeticoes}x seguidas)`);
    }
    const comp = seres.filter(o => o.id !== s.id && o.local === s.local).map(o => o.nome);
    linhasSeres.push(
      `- ${s.nome} [local: ${s.local}] | saúde:${Math.round(n.saude ?? 100)} fome:${Math.round(n.alimento ?? 0)} sede:${Math.round(n.agua ?? 0)} energia:${Math.round(n.energia ?? 80)} medo:${Math.round(n.medo ?? 0)} solidão:${Math.round(n.solidao ?? 0)} frustração:${Math.round(n.frustracao ?? 0)} | estoque(água:${Math.round(s.inventario?.agua || 0)}, comida:${Math.round(s.inventario?.alimento || 0)}, madeira:${Math.round(s.inventario?.madeira || 0)}) | últimas ações:[${ultimas.join(' -> ') || ultimaAcao}] | companhia:${comp.length ? comp.join(', ') : 'SOZINHO'}`
    );
  }

  const fog = eco.fogueira || {};
  const horta = eco.horta || {};
  const peixesRio = eco.peixes?.rio?.populacao ?? 0;
  const ativos = (m.acontecimentos || []).filter(a => a && a.ativo !== false).map(a => `${a.tipo}@${(a.locais || []).join(',')}`);

  return {
    ciclo: t.ciclo,
    resumoTexto: [
      `CICLO ${t.ciclo} | Dia ${t.dia} (${t.periodo}) | Mês: ${mes.nome} | Clima: ${m.clima}`,
      `FOGUEIRA CENTRAL: ${fog.acesa ? `ACESA (lenha ${Math.round(fog.lenha || 0)}/${fog.capacidade || 12})` : 'APAGADA (acampamento vulnerável a predadores)'}`,
      `HORTA DA FAZENDA: ${horta.plantadoPor && (horta.vida || 0) > 0 ? `Plantada com ${horta.cultura} por ${horta.plantadoPor} (Life ${Math.round(horta.vida)}%, maduros ${Math.round(horta.maduros || 0)})` : `VAZIA (época de plantar ${mes.cultura})`}`,
      `RIO: população de peixes ${Math.round(peixesRio)} (${mes.cardumeNoRio ? 'temporada de peixes' : 'entressafra sem cardume'})`,
      `EVENTOS FÍSICOS ATIVOS: ${ativos.length ? ativos.join('; ') : 'nenhum'}`,
      `ALERTAS DE MONOTONIA/LOOP: ${alertasMonotonia.length ? alertasMonotonia.join(' | ') : 'nenhum loop crítico detectado'}`,
      `SOBREVIVENTES:`,
      ...linhasSeres
    ].join('\n')
  };
}

async function agir(estado, cicloArg, opcoes = {}) {
  if (process.env.ILHA_DIRETOR === '0') return null;
  const ciclo = Number.isInteger(cicloArg) && cicloArg > 0 ? cicloArg : (estado?.mundo?.tempo?.ciclo || 0);
  const intervalo = Number(opcoes.intervalo || INTERVALO_PADRAO || 10);

  if (!opcoes.forcar) {
    if (ciclo <= 0 || ciclo % intervalo !== 0) return null;
    if (ultimoCicloAgido === ciclo || pensando) return null;
  }

  pensando = true;
  ultimoCicloAgido = ciclo;

  try {
    const diag = diagnosticarMundo(estado);
    console.log(`[DIRETOR-LLM] 🎬 Cérebro do Mundo analisando a Ilha no Ciclo ${ciclo}...`);

    const systemPrompt = [
      'Você é o Cérebro do Mundo (Diretor / Game Master) do Reality Show de sobrevivência "Ilha Aurora".',
      'REGRA DE OURO: Você NUNCA controla a mente dos personagens. Você atua exclusivamente sobre a FÍSICA DO MUNDO para quebrar monotonia, desfazer loops repetitivos, provocar encontros sociais, criar tensão de sobrevivência ou oferecer oportunidades estratégicas.',
      'Catálogo de intervenções físicas permitidas (campo "tipo"):',
      '- "suprimento": lança uma caixa de suprimentos (água, comida, madeira) com paraquedas em um local estratégico para atrair sobreviventes ao mesmo ponto ou salvar alguém em crise.',
      '- "artefato": faz surgir um objeto misterioso no chão emitindo sinais intrigantes, despertando curiosidade e tirando personagens de rotinas repetitivas.',
      '- "tempestade": desencadeia chuva torrencial e ventos fortes na região, ameaçando apagar a fogueira e forçando sobreviventes expostos a buscar abrigo ou se reunirem.',
      '- "predador": faz a Besta das Sombras rondar uma região de mata/fazenda/casas (ela teme a fogueira acesa), gerando perigo real e urgência de manter o fogo aceso.',
      '- "seca": onda de calor que reduz o nível das fontes de água, criando disputa por recursos hídricos.',
      '- "cardume": traz abundância súbita de peixes no rio e frutos no bosque após períodos de escassez.',
      `Locais válidos (campo "local"): ${LOCAIS_VALIDOS.join(', ')}.`,
      'Na "descricao", escreva APENAS o fenômeno físico sensorial que os sobreviventes verão ou ouvirão no local (1 frase curta em português, sem dar ordens aos personagens).',
      'Responda estritamente no JSON solicitado.'
    ].join('\n');

    const userPrompt = `ESTADO ATUAL DA ILHA:\n${diag.resumoTexto}\n\nQual intervenção física você injeta no mundo neste ciclo para tornar o Reality Show mais interessante, quebrar loops ou gerar interação entre os sobreviventes?`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.ILHA_DIRETOR_TIMEOUT_MS || 45000));
    let res;
    try {
      res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODELO_DIRETOR,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          think: false,
          stream: false,
          format: SCHEMA_DIRETOR,
          options: { temperature: 0.75, num_predict: 220 }
        }),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status} de Ollama`);
    const data = await res.json();
    const conteudo = (data.message && data.message.content) || data.response || '{}';
    const acao = JSON.parse(conteudo);

    const tipo = TIPOS_VALIDOS.includes(acao.tipo) ? acao.tipo : 'suprimento';
    const local = LOCAIS_VALIDOS.includes(acao.local) ? acao.local : 'fogueira';
    const descricao = limparPistaFisica(acao.descricao || 'Algo incomum altera o ambiente neste ponto da ilha.');
    const raciocinio = String(acao.raciocinio || '').trim().slice(0, 260);

    console.log(`[DIRETOR-LLM] 🧠 Raciocínio: ${raciocinio}`);
    console.log(`[DIRETOR-LLM] ⚡ Intervenção física: ${tipo.toUpperCase()} em ${local} -> "${descricao}"`);

    let fila = [];
    if (fs.existsSync(ARQ_FILA)) {
      try {
        const raw = fs.readFileSync(ARQ_FILA, 'utf8').trim();
        if (raw) fila = JSON.parse(raw);
        if (!Array.isArray(fila)) fila = [];
      } catch (e) {
        fila = [];
      }
    }

    const itemFila = {
      origem: 'diretor-llm',
      patrocinador: 'Diretor da Ilha',
      tipo,
      local,
      no: local,
      descricao,
      mensagem: descricao,
      raciocinio,
      duracao: 6,
      ciclo
    };

    fila.push(itemFila);
    fs.writeFileSync(ARQ_FILA, JSON.stringify(fila, null, 2), 'utf8');
    return itemFila;
  } catch (e) {
    console.error('[DIRETOR-LLM] Erro ao pensar:', e.message);
    return null;
  } finally {
    pensando = false;
  }
}

module.exports = { agir, diagnosticarMundo, TIPOS_VALIDOS, LOCAIS_VALIDOS };

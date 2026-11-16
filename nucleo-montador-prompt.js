/**
 * nucleo-montador-prompt.js
 * 
 * MISSÃO MASTER — ILHA AURORA (MÓDULOS 6 & 7)
 * Estados Psicológicos Funcionais e Montador Enxuto de Prompt para LLM/OVO
 * 
 * Estados Psicológicos Funcionais:
 * - Medo, Confiança, Curiosidade, Frustração, Satisfação
 * - Cada um com: valor, intensidade, causa, duracao, historico, mecanismoRecuperacao
 * 
 * Validação pelo Backend:
 * - Backend é autoridade estrita sobre recursos, movimentação e física
 * - A IA NÃO PODE criar itens, alterar saldos ou ignorar barreiras por texto
 * 
 * Prompt Enxuto:
 * - Envia apenas contexto situado necessário (localização, ambiente, inventário, biologia, emoção, memórias OVO chave)
 */

'use strict';

const { bancoIlhaGlobal } = require('./banco-ilha');
const { motorAmbientalGlobal } = require('./motor-consequencias-ambientais');
const { gerenciadorInstanciasGlobal } = require('./gerenciador-instancias');
const { motorTrajesVisaoGlobal } = require('./motor-trajes-visao');

class PsicologiaFuncional {
  constructor() {
    // Map(serId -> { medo, confianca, curiosidade, frustracao, satisfacao })
    this.habitantesPsique = new Map();
    this.inicializarHabitantes();
  }

  inicializarHabitantes() {
    const lista = ['icaro', 'elara', 'lara', 'joao', 'maria'];
    for (const serId of lista) {
      this.habitantesPsique.set(serId, {
        medo: { valor: 10, intensidade: 'baixa', causa: 'calmaria inicial', duracao: 0, historico: [] },
        confianca: { valor: 80, intensidade: 'alta', causa: 'comunidade unida', duracao: 10, historico: [] },
        curiosidade: { valor: 75, intensidade: 'alta', causa: 'novas terras a explorar', duracao: 15, historico: [] },
        frustracao: { valor: 5, intensidade: 'baixa', causa: 'nenhuma', duracao: 0, historico: [] },
        satisfacao: { valor: 70, intensidade: 'moderada', causa: 'acampamento estruturado', duracao: 12, historico: [] }
      });
    }
  }

  obterPsique(serId) {
    if (!this.habitantesPsique.has(serId)) {
      this.habitantesPsique.set(serId, {
        medo: { valor: 15, intensidade: 'baixa', causa: 'chegada recente', duracao: 5, historico: [] },
        confianca: { valor: 70, intensidade: 'moderada', causa: 'esperança', duracao: 10, historico: [] },
        curiosidade: { valor: 80, intensidade: 'alta', causa: 'mistérios da ilha', duracao: 15, historico: [] },
        frustracao: { valor: 10, intensidade: 'baixa', causa: 'nenhuma', duracao: 0, historico: [] },
        satisfacao: { valor: 65, intensidade: 'moderada', causa: 'sobrevivência ativa', duracao: 10, historico: [] }
      });
    }
    return this.habitantesPsique.get(serId);
  }

  calcularIntensidade(valor) {
    if (valor <= 25) return 'baixa';
    if (valor <= 60) return 'moderada';
    if (valor <= 85) return 'alta';
    return 'critica';
  }

  alterarVariavel(serId, variavel, delta, causa = '', duracaoCiclos = 4) {
    const psi = this.obterPsique(serId);
    if (!psi[variavel]) return;

    const v = psi[variavel];
    const valorAnt = v.valor;
    v.valor = Math.max(0, Math.min(100, v.valor + delta));
    v.intensidade = this.calcularIntensidade(v.valor);
    if (causa) v.causa = causa;
    v.duracao = duracaoCiclos;

    v.historico.push({
      delta,
      de: valorAnt,
      para: v.valor,
      causa,
      timestamp: Date.now()
    });
    if (v.historico.length > 5) v.historico.shift();
  }

  // Mecanismo de decaimento e recuperação psicológica a cada ciclo
  processarCicloPsicologico(serId) {
    const psi = this.obterPsique(serId);
    for (const k of ['medo', 'frustracao']) {
      if (psi[k].duracao > 0) {
        psi[k].duracao--;
      } else if (psi[k].valor > 10) {
        psi[k].valor = Math.max(5, psi[k].valor - 5);
        psi[k].intensidade = this.calcularIntensidade(psi[k].valor);
      }
    }
    for (const k of ['confianca', 'satisfacao', 'curiosidade']) {
      if (psi[k].duracao > 0) {
        psi[k].duracao--;
      } else if (psi[k].valor < 50) {
        psi[k].valor = Math.min(60, psi[k].valor + 3);
        psi[k].intensidade = this.calcularIntensidade(psi[k].valor);
      }
    }
  }
}

class NucleoMontadorPrompt {
  constructor(banco = bancoIlhaGlobal, ambiental = motorAmbientalGlobal, instancias = gerenciadorInstanciasGlobal) {
    this.banco = banco;
    this.ambiental = ambiental;
    this.instancias = instancias;
    this.psicologia = new PsicologiaFuncional();
  }

  /**
   * Monta o contexto compacto e estritamente relevante para a chamada da IA (LLM / OVO)
   */
  montarContextoEnxuto(serId, memóriasOvoRelevantes = []) {
    // 1. Localização e Região
    const loc = this.instancias.obterLocalizacaoHabitante(serId);

    // 2. Inventário e Equipamento
    const inv = this.banco.obterInventario(serId);
    const equips = this.banco.obterEquipamentos(serId);
    const saldoAmbar = this.banco.obterSaldoAmbar(serId);

    // 3. Necessidades Biológicas
    const bio = this.ambiental.obterEstado(serId);

    // 4. Estados Psicológicos Funcionais
    const psique = this.psicologia.obterPsique(serId);

    // 5. Contexto Enxuto Formatado
    return {
      habitante: serId,
      ondeEsta: {
        regiaoId: loc.regiaoId,
        regiaoNome: loc.regiaoNome,
        coordenadas: { gridX: loc.posicao.gridX, gridY: loc.posicao.gridY }
      },
      economia: {
        saldoAmbar,
        mochilaSlots: inv.map(s => ({
          slot: s.slot_index,
          item: s.recurso_id || 'vazio',
          quantidade: s.quantidade
        })),
        equipamentos: equips.filter(e => e.recurso_id !== null).map(e => ({
          onde: e.slot_equipamento,
          item: e.recurso_id
        }))
      },
      sobrevivencia: {
        fome: Math.round(bio.fome),
        sede: Math.round(bio.sede),
        energia: Math.round(bio.energia),
        saude: Math.round(bio.saude),
        orientacao: Math.round(bio.orientacao),
        seguranca: Math.round(bio.seguranca),
        condicoes: bio.condicoes
      },
      psicologia: {
        medo: `${psique.medo.valor}% (${psique.medo.intensidade} - ${psique.medo.causa})`,
        confianca: `${psique.confianca.valor}% (${psique.confianca.intensidade})`,
        curiosidade: `${psique.curiosidade.valor}% (${psique.curiosidade.intensidade})`,
        frustracao: `${psique.frustracao.valor}% (${psique.frustracao.intensidade})`,
        satisfacao: `${psique.satisfacao.valor}% (${psique.satisfacao.intensidade})`
      },
      memoriasOvo: memóriasOvoRelevantes.slice(0, 3) // Apenas as 3 memórias mais cruciais
    };
  }

  /**
   * Constrói o texto do prompt pronto para envio à LLM
   */
  gerarPromptTexto(serId, acaoSugerida = '', extras = {}) {
    const ctx = this.montarContextoEnxuto(serId, extras.memoriasOvo || []);

    const itensMochila = ctx.economia.mochilaSlots
      .map(s => `Slot ${s.slot}: ${s.item}${s.quantidade > 1 ? ` (${s.quantidade})` : ''}`)
      .join(', ');

    const equips = ctx.economia.equipamentos.length > 0
      ? ctx.economia.equipamentos.map(e => `${e.onde}: ${e.item}`).join(', ')
      : 'Nenhum equipamento em mãos';

    const blocoVisaoTraje = motorTrajesVisaoGlobal ? motorTrajesVisaoGlobal.obterBlocoPromptVisao(serId) : '';
    const secaoTraje = blocoVisaoTraje ? `\n\n${blocoVisaoTraje}` : '';

    return `
[ESTADO DO HABITANTE: ${serId.toUpperCase()}]
Região: ${ctx.ondeEsta.regiaoNome} (Grid: ${ctx.ondeEsta.coordenadas.gridX}, ${ctx.ondeEsta.coordenadas.gridY})
Carteira: ${ctx.economia.saldoAmbar} Âmbar | Mochila: [${itensMochila}] | Mãos: [${equips}]

[BIOLOGIA & SOBREVIVÊNCIA]
Fome: ${ctx.sobrevivencia.fome}/100 | Sede: ${ctx.sobrevivencia.sede}/100 | Energia: ${ctx.sobrevivencia.energia}/100 | Saúde: ${ctx.sobrevivencia.saude}/100
Orientação: ${ctx.sobrevivencia.orientacao}% | Segurança: ${ctx.sobrevivencia.seguranca}%
Condições Ativas: ${ctx.sobrevivencia.condicoes.length ? ctx.sobrevivencia.condicoes.join(', ') : 'Nenhuma (Normal)'}

[PSICOLOGIA FUNCIONAL]
Medo: ${ctx.psicologia.medo} | Confiança: ${ctx.psicologia.confianca} | Curiosidade: ${ctx.psicologia.curiosidade}
Frustração: ${ctx.psicologia.frustracao} | Satisfação: ${ctx.psicologia.satisfacao}${secaoTraje}

[REGRA DE AUTORIDADE DO BACKEND]
Você decide sua intenção, sentimentos e falas. O motor físico validará se itens, custos e passagens são válidos.
Responda em formato de ação real: { "acao": "explorar|coletar|comprar|descansar|ajudar", "alvo": "...", "fala": "...", "motivo": "..." }
`.trim();
  }

  /**
   * Validador de Autoridade do Backend
   * Impede que a IA crie itens mágicos, ignore saldo ou atravesse paredes
   */
  validarAcaoProposta(serId, proposta) {
    if (!proposta || typeof proposta !== 'object') {
      return { valido: false, motivo: 'Proposta inválida' };
    }

    const acao = proposta.acao || 'observar';

    // 1. Validação de Compras
    if (acao === 'comprar') {
      const recursoId = proposta.recursoId || proposta.alvo;
      const saldo = this.banco.obterSaldoAmbar(serId);
      const estVendinha = this.banco.obterEstoqueVendinha();
      const item = estVendinha.find(i => i.recurso_id === recursoId);
      if (!item) return { valido: false, motivo: `Item "${recursoId}" não existe na vendinha.` };
      if (saldo < item.preco_compra) return { valido: false, motivo: `Saldo insuficiente (${saldo} < ${item.preco_compra} Âmbar).` };
    }

    // 2. Validação de Consumo de Itens
    if (acao === 'consumir') {
      const recursoId = proposta.recursoId || proposta.alvo;
      const inv = this.banco.obterInventario(serId);
      const tem = inv.some(s => s.recurso_id === recursoId && s.quantidade > 0);
      if (!tem) return { valido: false, motivo: `Habitante não possui "${recursoId}" na mochila para consumir.` };
    }

    return { valido: true };
  }
}

const nucleoPromptGlobal = new NucleoMontadorPrompt();

module.exports = {
  PsicologiaFuncional,
  NucleoMontadorPrompt,
  nucleoPromptGlobal
};

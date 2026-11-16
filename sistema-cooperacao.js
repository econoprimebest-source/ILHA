/**
 * sistema-cooperacao.js
 * 
 * MISSÃO MASTER — ILHA AURORA (MÓDULO 9)
 * Sistema de Cooperação, Ajuda Mútua e Resgate entre Habitantes
 * 
 * - Troca direta de recursos entre mochilas
 * - Pedidos de socorro e ajuda situados
 * - Ações conjuntas (exploração em dupla, resgate com Kit Médico)
 * - Registro persistente das ações compartilhadas no SQLite
 */

'use strict';

const { bancoIlhaGlobal } = require('./banco-ilha');
const { motorAmbientalGlobal } = require('./motor-consequencias-ambientais');
const { gerenciadorInstanciasGlobal } = require('./gerenciador-instancias');

class SistemaCooperacao {
  constructor(banco = bancoIlhaGlobal, ambiental = motorAmbientalGlobal, instancias = gerenciadorInstanciasGlobal) {
    this.banco = banco;
    this.ambiental = ambiental;
    this.instancias = instancias;
    this.pedidosAjudaAtivos = new Map(); // id -> { serId, motivo, regiao, timestamp }
  }

  /**
   * Troca de Recursos entre Habitantes (Transferência Direta)
   */
  trocarRecursos(deSerId, paraSerId, recursoId, quantidade = 1) {
    if (deSerId === paraSerId) throw new Error('Não é possível transferir itens para si mesmo.');

    const invDoador = this.banco.obterInventario(deSerId);
    const slotDoador = invDoador.find(s => s.recurso_id === recursoId && s.quantidade >= quantidade);
    if (!slotDoador) {
      throw new Error(`${deSerId} não possui ${quantidade} unidade(s) de "${recursoId}" na mochila.`);
    }

    const invReceptor = this.banco.obterInventario(paraSerId);
    let slotDestino = null;
    for (const slot of invReceptor) {
      if (slot.recurso_id === recursoId && slot.empilhavel === 1) {
        slotDestino = slot.slot_index;
        break;
      }
    }
    if (slotDestino === null) {
      for (const slot of invReceptor) {
        if (!slot.recurso_id || slot.quantidade === 0) {
          slotDestino = slot.slot_index;
          break;
        }
      }
    }
    if (slotDestino === null) {
      throw new Error(`A mochila de ${paraSerId} está cheia!`);
    }

    const agora = Date.now();
    this.banco.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Remove do doador
      const novaQtdDoador = slotDoador.quantidade - quantidade;
      if (novaQtdDoador === 0) {
        this.banco.db.prepare('UPDATE inventarios_individuais SET recurso_id = NULL, quantidade = 0, durabilidade = NULL WHERE ser_id = ? AND slot_index = ?').run(deSerId, slotDoador.slot_index);
      } else {
        this.banco.db.prepare('UPDATE inventarios_individuais SET quantidade = ? WHERE ser_id = ? AND slot_index = ?').run(novaQtdDoador, deSerId, slotDoador.slot_index);
      }

      // 2. Adiciona ao receptor
      this.banco.db.prepare('UPDATE inventarios_individuais SET recurso_id = ?, quantidade = quantidade + ?, durabilidade = 100 WHERE ser_id = ? AND slot_index = ?').run(recursoId, quantidade, paraSerId, slotDestino);

      // 3. Registra transação no histórico
      this.banco.db.prepare(`
        INSERT INTO transacoes (timestamp, tipo, origem_id, destino_id, recurso_id, quantidade, valor_ambar, motivo)
        VALUES (?, 'transferencia', ?, ?, ?, ?, 0, 'Cooperação e partilha entre sobreviventes')
      `).run(agora, deSerId, paraSerId, recursoId, quantidade);

      this.banco.db.exec('COMMIT;');
      return { sucesso: true, de: deSerId, para: paraSerId, recursoId, quantidade };
    } catch (e) {
      this.banco.db.exec('ROLLBACK;');
      throw e;
    }
  }

  /**
   * Emitir Pedido de Socorro / Ajuda
   */
  emitirPedidoAjuda(serId, motivo = 'ferimento_ou_desorientacao') {
    const loc = this.instancias.obterLocalizacaoHabitante(serId);
    const pedidoId = `ajuda_${serId}_${Date.now()}`;
    const pedido = {
      id: pedidoId,
      serId,
      motivo,
      regiaoId: loc.regiaoId,
      posicao: loc.posicao,
      emitidoEm: Date.now(),
      atendido: false
    };
    this.pedidosAjudaAtivos.set(pedidoId, pedido);
    return pedido;
  }

  /**
   * Resgate de Companheiro Ferido (Socorrista usa Kit Médico na vítima)
   */
  executarResgate(socorristaId, vitimaId, pedidoId = null) {
    const resCura = this.ambiental.aplicarKitMedico(vitimaId, socorristaId);

    if (pedidoId && this.pedidosAjudaAtivos.has(pedidoId)) {
      this.pedidosAjudaAtivos.get(pedidoId).atendido = true;
    }

    return {
      sucesso: true,
      tipo: 'resgate_concluido',
      socorrista: socorristaId,
      vitima: vitimaId,
      novaSaudeVitima: resCura.novaSaude,
      mensagem: `${socorristaId} aplicou o Kit Médico com sucesso em ${vitimaId}, salvando sua vida!`
    };
  }

  /**
   * Expedição Conjunta (Dupla viaja para a mesma região)
   */
  iniciarExpedicaoConjunta(liderId, companheiroId, regiaoDestino) {
    const transLider = this.instancias.transitarHabitante(liderId, regiaoDestino);
    const transComp = this.instancias.transitarHabitante(companheiroId, regiaoDestino);

    return {
      sucesso: true,
      lider: liderId,
      companheiro: companheiroId,
      regiaoDestino,
      status: `Expedição em dupla iniciada com sucesso na região ${regiaoDestino}`
    };
  }
}

const sistemaCooperacaoGlobal = new SistemaCooperacao();

module.exports = {
  SistemaCooperacao,
  sistemaCooperacaoGlobal
};

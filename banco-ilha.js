/**
 * banco-ilha.js
 * 
 * MISSÃO MASTER — ILHA AURORA (MÓDULO 2)
 * Sistema Econômico e Persistência no SQLite
 * 
 * - Usa node:sqlite DatabaseSync nativo de alta performance
 * - Esquema relacional completo: recursos, estoque, inventários (3 slots), equipamentos, transações, carteiras
 * - Transações atômicas com integridade referencial e proteção contra saldo negativo
 * - Regras da Vendinha Comunitária e economia inicial em Âmbar
 */

'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const CAMINHO_PADRAO = path.join(__dirname, 'ilha-aurora.sqlite');

class BancoIlha {
  constructor(caminho = null) {
    let localBanco = caminho || CAMINHO_PADRAO;
    try {
      this.db = new DatabaseSync(localBanco);
      this.db.exec('PRAGMA foreign_keys = ON;');
      this.db.exec('CREATE TABLE IF NOT EXISTS _probe_rw (id INT);');
    } catch (e) {
      // Se o diretório atual estiver em modo sandbox/read-only no Windows, usa o diretório tmp seguro
      localBanco = path.join(os.tmpdir(), 'ilha-aurora.sqlite');
      this.db = new DatabaseSync(localBanco);
      this.db.exec('PRAGMA foreign_keys = ON;');
    }
    this.caminhoAtivo = localBanco;
    this.criarTabelas();
    this.semearDadosIniciais();
  }

  criarTabelas() {
    this.db.exec(`
      -- 1. Definição de Recursos
      CREATE TABLE IF NOT EXISTS recursos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL, -- 'materia_prima', 'ferramenta', 'consumivel', 'equipamento'
        empilhavel INTEGER NOT NULL DEFAULT 1,
        max_pilha INTEGER NOT NULL DEFAULT 99,
        descricao TEXT
      );

      -- 2. Tabela de Preços da Vendinha (em Âmbar)
      CREATE TABLE IF NOT EXISTS precos (
        recurso_id TEXT PRIMARY KEY,
        preco_compra INTEGER NOT NULL, -- Preço pago pelo habitante para comprar
        preco_venda INTEGER NOT NULL,  -- Preço recebido pelo habitante ao vender
        disponivel_na_venda INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (recurso_id) REFERENCES recursos(id)
      );

      -- 3. Carteiras dos Habitantes e da Vendinha (Saldos em Âmbar)
      CREATE TABLE IF NOT EXISTS carteiras (
        ser_id TEXT PRIMARY KEY,
        saldo_ambar INTEGER NOT NULL CHECK (saldo_ambar >= 0),
        atualizado_em INTEGER NOT NULL
      );

      -- 4. Estoque Comunitário / Armazém da Vendinha
      CREATE TABLE IF NOT EXISTS estoque_comunitario (
        recurso_id TEXT PRIMARY KEY,
        quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
        atualizado_em INTEGER NOT NULL,
        FOREIGN KEY (recurso_id) REFERENCES recursos(id)
      );

      -- 5. Inventários Individuais (Mochila com 3 slots base por habitante)
      CREATE TABLE IF NOT EXISTS inventarios_individuais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ser_id TEXT NOT NULL,
        slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index <= 2),
        recurso_id TEXT,
        quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
        durabilidade INTEGER DEFAULT 100,
        metadata TEXT,
        UNIQUE(ser_id, slot_index),
        FOREIGN KEY (recurso_id) REFERENCES recursos(id)
      );

      -- 6. Equipamentos em Uso (mão direita, corpo)
      CREATE TABLE IF NOT EXISTS equipamentos (
        ser_id TEXT NOT NULL,
        slot_equipamento TEXT NOT NULL CHECK (slot_equipamento IN ('mao_direita', 'corpo')),
        recurso_id TEXT,
        equipado_em INTEGER,
        PRIMARY KEY (ser_id, slot_equipamento),
        FOREIGN KEY (recurso_id) REFERENCES recursos(id)
      );

      -- 7. Histórico de Transações Atômicas
      CREATE TABLE IF NOT EXISTS transacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        tipo TEXT NOT NULL, -- 'compra', 'venda', 'coleta', 'transferencia', 'consumo'
        origem_id TEXT NOT NULL,
        destino_id TEXT NOT NULL,
        recurso_id TEXT,
        quantidade INTEGER NOT NULL,
        valor_ambar INTEGER NOT NULL DEFAULT 0,
        motivo TEXT
      );

      -- 8. Registro de Coletas Ambientais
      CREATE TABLE IF NOT EXISTS coletas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ser_id TEXT NOT NULL,
        recurso_id TEXT NOT NULL,
        regiao TEXT NOT NULL,
        local TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (recurso_id) REFERENCES recursos(id)
      );

      -- 9. Histórico de Utilização e Consumo de Itens
      CREATE TABLE IF NOT EXISTS historico_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ser_id TEXT NOT NULL,
        recurso_id TEXT NOT NULL,
        acao TEXT NOT NULL,
        efeito TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (recurso_id) REFERENCES recursos(id)
      );
    `);
  }

  semearDadosIniciais() {
    // Lista de Recursos Oficiais
    const recursos = [
      { id: 'madeira', nome: 'Madeira', categoria: 'materia_prima', empilhavel: 1, max: 99, desc: 'Troncos e galhos para construção e fogo' },
      { id: 'peixe', nome: 'Peixe Fresco', categoria: 'consumivel', empilhavel: 1, max: 20, desc: 'Alimento nutritivo da costa e do mar' },
      { id: 'tocha', nome: 'Tocha de Resina', categoria: 'ferramenta', empilhavel: 0, max: 1, desc: 'Iluminação essencial para entrar na Caverna' },
      { id: 'corda', nome: 'Corda de Fibras', categoria: 'ferramenta', empilhavel: 1, max: 10, desc: 'Utilizada para amarrações e resgates' },
      { id: 'facao', nome: 'Facão de Aço', categoria: 'ferramenta', empilhavel: 0, max: 1, desc: 'Abre trilhas no Bosque e afasta perigos' },
      { id: 'kit_medico', nome: 'Kit Médico', categoria: 'consumivel', empilhavel: 0, max: 1, desc: 'Trata ferimentos graves e restaura saúde' },
      { id: 'cantil', nome: 'Cantil com Água', categoria: 'consumivel', empilhavel: 0, max: 1, desc: 'Essencial para combater a sede na Praia' },
      { id: 'bussola', nome: 'Bússola de Bolso', categoria: 'ferramenta', empilhavel: 0, max: 1, desc: 'Evita a desorientação no Bosque denso' }
    ];

    const stmtRec = this.db.prepare(`
      INSERT OR IGNORE INTO recursos (id, nome, categoria, empilhavel, max_pilha, descricao)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const r of recursos) {
      stmtRec.run(r.id, r.nome, r.categoria, r.empilhavel, r.max, r.desc);
    }

    // Economia Inicial em Âmbar (definida na Missão Master)
    const precos = [
      { id: 'madeira', compra: 5, venda: 3 },
      { id: 'peixe', compra: 10, venda: 7 },
      { id: 'tocha', compra: 30, venda: 20 },
      { id: 'corda', compra: 50, venda: 35 },
      { id: 'facao', compra: 80, venda: 55 },
      { id: 'kit_medico', compra: 100, venda: 70 },
      { id: 'cantil', compra: 40, venda: 28 },
      { id: 'bussola', compra: 60, venda: 42 }
    ];

    const stmtPreco = this.db.prepare(`
      INSERT OR REPLACE INTO precos (recurso_id, preco_compra, preco_venda, disponivel_na_venda)
      VALUES (?, ?, ?, 1)
    `);
    for (const p of precos) {
      stmtPreco.run(p.id, p.compra, p.venda);
    }

    // Estoque Comunitário Inicial da Vendinha
    const estoqueInicial = [
      { id: 'madeira', qtd: 50 },
      { id: 'peixe', qtd: 20 },
      { id: 'tocha', qtd: 5 },
      { id: 'corda', qtd: 3 },
      { id: 'facao', qtd: 2 },
      { id: 'kit_medico', qtd: 2 },
      { id: 'cantil', qtd: 4 },
      { id: 'bussola', qtd: 2 }
    ];

    const stmtEstoque = this.db.prepare(`
      INSERT OR IGNORE INTO estoque_comunitario (recurso_id, quantidade, atualizado_em)
      VALUES (?, ?, ?)
    `);
    for (const e of estoqueInicial) {
      stmtEstoque.run(e.id, e.qtd, Date.now());
    }

    // Inicialização das Carteiras dos Habitantes Oficiais (cada habitante começa com 50 Âmbar)
    const habitantes = ['icaro', 'elara', 'lara', 'joao', 'maria', 'vendinha'];
    const stmtCart = this.db.prepare(`
      INSERT OR IGNORE INTO carteiras (ser_id, saldo_ambar, atualizado_em)
      VALUES (?, ?, ?)
    `);
    for (const h of habitantes) {
      const saldo = h === 'vendinha' ? 1000 : 50;
      stmtCart.run(h, saldo, Date.now());
    }

    // Inicializa Mochila de 3 Slots vazios para cada habitante
    const stmtSlot = this.db.prepare(`
      INSERT OR IGNORE INTO inventarios_individuais (ser_id, slot_index, recurso_id, quantidade)
      VALUES (?, ?, NULL, 0)
    `);
    for (const h of ['icaro', 'elara', 'lara', 'joao', 'maria']) {
      for (let s = 0; s < 3; s++) {
        stmtSlot.run(h, s);
      }
    }

    // Inicializa Slots de Equipamento (mão direita, corpo)
    const stmtEquip = this.db.prepare(`
      INSERT OR IGNORE INTO equipamentos (ser_id, slot_equipamento, recurso_id, equipado_em)
      VALUES (?, ?, NULL, NULL)
    `);
    for (const h of ['icaro', 'elara', 'lara', 'joao', 'maria']) {
      stmtEquip.run(h, 'mao_direita');
      stmtEquip.run(h, 'corpo');
    }
  }

  // Consulta Saldo em Âmbar
  obterSaldoAmbar(serId) {
    const row = this.db.prepare('SELECT saldo_ambar FROM carteiras WHERE ser_id = ?').get(serId);
    return row ? row.saldo_ambar : 0;
  }

  // Consulta Mochila do Habitante (3 slots)
  obterInventario(serId) {
    return this.db.prepare(`
      SELECT i.slot_index, i.recurso_id, i.quantidade, i.durabilidade, r.nome, r.categoria, r.empilhavel
      FROM inventarios_individuais i
      LEFT JOIN recursos r ON i.recurso_id = r.id
      WHERE i.ser_id = ?
      ORDER BY i.slot_index ASC
    `).all(serId);
  }

  // Consulta Equipamentos Ativos
  obterEquipamentos(serId) {
    return this.db.prepare(`
      SELECT e.slot_equipamento, e.recurso_id, r.nome, r.categoria, e.equipado_em
      FROM equipamentos e
      LEFT JOIN recursos r ON e.recurso_id = r.id
      WHERE e.ser_id = ?
    `).all(serId);
  }

  // Consulta Estoque da Vendinha
  obterEstoqueVendinha() {
    return this.db.prepare(`
      SELECT e.recurso_id, r.nome, r.categoria, e.quantidade, p.preco_compra, p.preco_venda
      FROM estoque_comunitario e
      JOIN recursos r ON e.recurso_id = r.id
      JOIN precos p ON e.recurso_id = p.recurso_id
      ORDER BY r.categoria, r.nome
    `).all();
  }

  /**
   * Operação Comercial Atômica: Habitante COMPRA item da Vendinha
   */
  comprarItem(serId, recursoId, quantidade = 1) {
    const precoInfo = this.db.prepare('SELECT preco_compra FROM precos WHERE recurso_id = ? AND disponivel_na_venda = 1').get(recursoId);
    if (!precoInfo) throw new Error(`Item "${recursoId}" não disponível para venda.`);

    const custoTotal = precoInfo.preco_compra * quantidade;
    const saldo = this.obterSaldoAmbar(serId);
    if (saldo < custoTotal) {
      throw new Error(`Saldo insuficiente! Requer ${custoTotal} Âmbar, habitante possui ${saldo} Âmbar.`);
    }

    const estItem = this.db.prepare('SELECT quantidade FROM estoque_comunitario WHERE recurso_id = ?').get(recursoId);
    if (!estItem || estItem.quantidade < quantidade) {
      throw new Error(`Estoque insuficiente na Vendinha para "${recursoId}".`);
    }

    // Encontra slot livre ou com item empilhável
    const inv = this.obterInventario(serId);
    let slotDestino = null;
    for (const slot of inv) {
      if (slot.recurso_id === recursoId && slot.empilhavel === 1) {
        slotDestino = slot.slot_index;
        break;
      }
    }
    if (slotDestino === null) {
      for (const slot of inv) {
        if (!slot.recurso_id || slot.quantidade === 0) {
          slotDestino = slot.slot_index;
          break;
        }
      }
    }
    if (slotDestino === null) {
      throw new Error('Mochila cheia! Todos os 3 slots estão ocupados.');
    }

    const agora = Date.now();

    // Executa transação estritamente atômica
    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Debita habitante e credita vendinha
      this.db.prepare('UPDATE carteiras SET saldo_ambar = saldo_ambar - ?, atualizado_em = ? WHERE ser_id = ?').run(custoTotal, agora, serId);
      this.db.prepare('UPDATE carteiras SET saldo_ambar = saldo_ambar + ?, atualizado_em = ? WHERE ser_id = ?').run(custoTotal, agora, 'vendinha');

      // 2. Reduz estoque da vendinha
      this.db.prepare('UPDATE estoque_comunitario SET quantidade = quantidade - ?, atualizado_em = ? WHERE recurso_id = ?').run(quantidade, agora, recursoId);

      // 3. Adiciona ao inventário do habitante
      this.db.prepare(`
        UPDATE inventarios_individuais 
        SET recurso_id = ?, quantidade = quantidade + ?, durabilidade = 100
        WHERE ser_id = ? AND slot_index = ?
      `).run(recursoId, quantidade, serId, slotDestino);

      // 4. Registra histórico auditável
      this.db.prepare(`
        INSERT INTO transacoes (timestamp, tipo, origem_id, destino_id, recurso_id, quantidade, valor_ambar, motivo)
        VALUES (?, 'compra', 'vendinha', ?, ?, ?, ?, 'Compra na Vendinha Comunitária')
      `).run(agora, serId, recursoId, quantidade, custoTotal);

      this.db.exec('COMMIT;');
      return { sucesso: true, recursoId, quantidade, custoTotal, saldoRestante: saldo - custoTotal };
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  /**
   * Operação Comercial Atômica: Habitante VENDE item para a Vendinha
   */
  venderItem(serId, slotIndex, quantidade = 1) {
    const slot = this.db.prepare(`
      SELECT i.recurso_id, i.quantidade, p.preco_venda 
      FROM inventarios_individuais i
      JOIN precos p ON i.recurso_id = p.recurso_id
      WHERE i.ser_id = ? AND i.slot_index = ?
    `).get(serId, slotIndex);

    if (!slot || !slot.recurso_id || slot.quantidade < quantidade) {
      throw new Error(`Slot ${slotIndex} não contém ${quantidade} unidade(s) para venda.`);
    }

    const valorRecebido = slot.preco_venda * quantidade;
    const agora = Date.now();

    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Remove da mochila
      const novaQtd = slot.quantidade - quantidade;
      if (novaQtd === 0) {
        this.db.prepare(`
          UPDATE inventarios_individuais 
          SET recurso_id = NULL, quantidade = 0, durabilidade = NULL
          WHERE ser_id = ? AND slot_index = ?
        `).run(serId, slotIndex);
      } else {
        this.db.prepare(`
          UPDATE inventarios_individuais 
          SET quantidade = ?
          WHERE ser_id = ? AND slot_index = ?
        `).run(novaQtd, serId, slotIndex);
      }

      // 2. Credita habitante e debita vendinha
      this.db.prepare('UPDATE carteiras SET saldo_ambar = saldo_ambar + ?, atualizado_em = ? WHERE ser_id = ?').run(valorRecebido, agora, serId);
      this.db.prepare('UPDATE carteiras SET saldo_ambar = saldo_ambar - ?, atualizado_em = ? WHERE ser_id = ?').run(valorRecebido, agora, 'vendinha');

      // 3. Adiciona ao estoque comunitário da vendinha
      this.db.prepare('UPDATE estoque_comunitario SET quantidade = quantidade + ?, atualizado_em = ? WHERE recurso_id = ?').run(quantidade, agora, slot.recurso_id);

      // 4. Registra histórico
      this.db.prepare(`
        INSERT INTO transacoes (timestamp, tipo, origem_id, destino_id, recurso_id, quantidade, valor_ambar, motivo)
        VALUES (?, 'venda', ?, 'vendinha', ?, ?, ?, 'Venda na Vendinha Comunitária')
      `).run(agora, serId, slot.recurso_id, quantidade, valorRecebido);

      this.db.exec('COMMIT;');
      return { sucesso: true, recursoId: slot.recurso_id, quantidade, valorRecebido };
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  /**
   * Coleta de Recursos no Ambiente (madeira na floresta, peixe no mar, etc.)
   */
  coletarRecurso(serId, recursoId, quantidade = 1, regiao = 'ilha_central', local = 'bosque') {
    const inv = this.obterInventario(serId);
    let slotDestino = null;

    for (const slot of inv) {
      if (slot.recurso_id === recursoId && slot.empilhavel === 1) {
        slotDestino = slot.slot_index;
        break;
      }
    }
    if (slotDestino === null) {
      for (const slot of inv) {
        if (!slot.recurso_id || slot.quantidade === 0) {
          slotDestino = slot.slot_index;
          break;
        }
      }
    }
    if (slotDestino === null) {
      throw new Error('Mochila cheia! Não é possível coletar sem espaço livre.');
    }

    const agora = Date.now();
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare(`
        UPDATE inventarios_individuais
        SET recurso_id = ?, quantidade = quantidade + ?, durabilidade = 100
        WHERE ser_id = ? AND slot_index = ?
      `).run(recursoId, quantidade, serId, slotDestino);

      this.db.prepare(`
        INSERT INTO coletas (ser_id, recurso_id, regiao, local, quantidade, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(serId, recursoId, regiao, local, quantidade, agora);

      this.db.prepare(`
        INSERT INTO transacoes (timestamp, tipo, origem_id, destino_id, recurso_id, quantidade, valor_ambar, motivo)
        VALUES (?, 'coleta', 'natureza', ?, ?, ?, 0, 'Coleta direta no ambiente')
      `).run(agora, serId, recursoId, quantidade);

      this.db.exec('COMMIT;');
      return { sucesso: true, recursoId, quantidade, slotIndex: slotDestino };
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  /**
   * Equipar / Desequipar Item
   * Possuir não significa estar usando!
   */
  equiparItem(serId, slotIndex, slotEquipamento = 'mao_direita') {
    const slot = this.db.prepare('SELECT recurso_id, quantidade FROM inventarios_individuais WHERE ser_id = ? AND slot_index = ?').get(serId, slotIndex);
    if (!slot || !slot.recurso_id || slot.quantidade < 1) {
      throw new Error(`Nenhum item válido no slot ${slotIndex} para equipar.`);
    }

    const agora = Date.now();
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO equipamentos (ser_id, slot_equipamento, recurso_id, equipado_em)
        VALUES (?, ?, ?, ?)
      `).run(serId, slotEquipamento, slot.recurso_id, agora);

      this.db.prepare(`
        INSERT INTO historico_itens (ser_id, recurso_id, acao, efeito, timestamp)
        VALUES (?, ?, 'equipar', ?, ?)
      `).run(serId, slot.recurso_id, `Equipado em ${slotEquipamento}`, agora);

      this.db.exec('COMMIT;');
      return { sucesso: true, serId, slotEquipamento, recursoId: slot.recurso_id };
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  desequiparItem(serId, slotEquipamento = 'mao_direita') {
    const atual = this.db.prepare('SELECT recurso_id FROM equipamentos WHERE ser_id = ? AND slot_equipamento = ?').get(serId, slotEquipamento);
    if (!atual || !atual.recurso_id) return { sucesso: false, mensagem: 'Nenhum item equipado neste slot' };

    const agora = Date.now();
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare('UPDATE equipamentos SET recurso_id = NULL, equipado_em = NULL WHERE ser_id = ? AND slot_equipamento = ?').run(serId, slotEquipamento);
      this.db.prepare(`
        INSERT INTO historico_itens (ser_id, recurso_id, acao, efeito, timestamp)
        VALUES (?, ?, 'desequipar', ?, ?)
      `).run(serId, atual.recurso_id, `Desequipado de ${slotEquipamento}`, agora);
      this.db.exec('COMMIT;');
      return { sucesso: true, itemDesequipado: atual.recurso_id };
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  /**
   * Descartar ou remover item do inventário
   */
  descartarItem(serId, slotIndex) {
    this.db.prepare(`
      UPDATE inventarios_individuais 
      SET recurso_id = NULL, quantidade = 0, durabilidade = NULL
      WHERE ser_id = ? AND slot_index = ?
    `).run(serId, slotIndex);
    return { sucesso: true, serId, slotIndex };
  }

  /**
   * Consumir Item (Peixe, Kit Médico, Cantil com água)
   * Itens consumíveis desaparecem após utilização!
   */
  consumirItem(serId, slotIndex) {
    const slot = this.db.prepare(`
      SELECT i.recurso_id, i.quantidade, r.categoria, r.nome
      FROM inventarios_individuais i
      JOIN recursos r ON i.recurso_id = r.id
      WHERE i.ser_id = ? AND i.slot_index = ?
    `).get(serId, slotIndex);

    if (!slot || !slot.recurso_id || slot.quantidade < 1) {
      throw new Error(`Slot ${slotIndex} vazio.`);
    }
    if (slot.categoria !== 'consumivel') {
      throw new Error(`O item "${slot.nome}" não é consumível.`);
    }

    const agora = Date.now();
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const novaQtd = slot.quantidade - 1;
      if (novaQtd === 0) {
        this.db.prepare('UPDATE inventarios_individuais SET recurso_id = NULL, quantidade = 0, durabilidade = NULL WHERE ser_id = ? AND slot_index = ?').run(serId, slotIndex);
      } else {
        this.db.prepare('UPDATE inventarios_individuais SET quantidade = ? WHERE ser_id = ? AND slot_index = ?').run(novaQtd, serId, slotIndex);
      }

      let efeito = 'Consumo padrão';
      if (slot.recurso_id === 'peixe') efeito = 'Reduz fome em 40 e recupera 15 de energia';
      else if (slot.recurso_id === 'cantil') efeito = 'Sacia a sede em 50 e alivia calor';
      else if (slot.recurso_id === 'kit_medico') efeito = 'Cura ferimentos e recupera 60 de saúde';

      this.db.prepare(`
        INSERT INTO historico_itens (ser_id, recurso_id, acao, efeito, timestamp)
        VALUES (?, ?, 'consumir', ?, ?)
      `).run(serId, slot.recurso_id, efeito, agora);

      this.db.prepare(`
        INSERT INTO transacoes (timestamp, tipo, origem_id, destino_id, recurso_id, quantidade, valor_ambar, motivo)
        VALUES (?, 'consumo', ?, 'uso_proprio', ?, 1, 0, ?)
      `).run(agora, serId, slot.recurso_id, efeito);

      this.db.exec('COMMIT;');
      return { sucesso: true, recursoId: slot.recurso_id, efeito };
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  // Consulta histórico recente de transações
  obterHistoricoTransacoes(limite = 20) {
    return this.db.prepare(`
      SELECT t.*, r.nome as recurso_nome 
      FROM transacoes t
      LEFT JOIN recursos r ON t.recurso_id = r.id
      ORDER BY t.id DESC 
      LIMIT ?
    `).all(limite);
  }
}

// Instância singleton global do Banco SQLite da Ilha
const bancoIlhaGlobal = new BancoIlha();

module.exports = {
  BancoIlha,
  bancoIlhaGlobal
};

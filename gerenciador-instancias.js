/**
 * gerenciador-instancias.js
 * 
 * MISSÃO MASTER — ILHA AURORA (MÓDULO 3)
 * Gerenciador de Instâncias e Regiões Persistentes
 * 
 * Regiões Iniciais:
 * 1. mapa_global (Vila Aurora / Ilha Central)
 * 2. regiao_caverna (Caverna e Minas)
 * 3. regiao_bosque (Bosque das Frutas e Matas)
 * 4. regiao_praia (Praia e Litoral Sul)
 * 
 * - Terreno, obstáculos, recursos e objetos próprios de cada região
 * - Rastreamento de múltiplos habitantes por instância
 * - Portas de entrada e saída bidirecionais com pontos de spawn exatos
 * - Preservação de estado contínua entre transições
 */

'use strict';

const { MotorNavegacaoGrid, TIPOS_TERRENO } = require('./motor-navegacao-grid');
const { bancoIlhaGlobal } = require('./banco-ilha');

class InstanciaRegiao {
  constructor(dados) {
    this.id = dados.id;
    this.nome = dados.nome;
    this.descricao = dados.descricao;
    this.tipoAmbiente = dados.tipoAmbiente; // 'aberto', 'subterraneo', 'mata', 'litoral'
    this.largura = dados.largura || 30;
    this.altura = dados.altura || 20;

    // Recursos nativos que brotam ou podem ser coletados aqui
    this.recursosDisponiveis = dados.recursosDisponiveis || [];
    // Objetos e POIs específicos
    this.objetos = dados.objetos || [];
    // Obstáculos estáticos
    this.obstaculos = dados.obstaculos || [];

    // Habitantes atualmente presentes nesta instância: Map(serId -> { gridX, gridY, entrouEm })
    this.habitantes = new Map();

    // Eventos ativos nesta instância
    this.eventosAtivos = [];

    // Entradas e Saídas (Portais)
    // portaSaida: { regiaoDestino, spawnX, spawnY }
    this.portais = dados.portais || [];

    // Motor de navegação dedicado da instância
    this.motorNavegacao = new MotorNavegacaoGrid({
      largura: this.largura,
      altura: this.altura,
      tamanhoCelula: 32
    });

    this.aplicarConfiguracaoTerreno(dados);
  }

  aplicarConfiguracaoTerreno(dados) {
    if (this.id === 'regiao_caverna') {
      // Caverna: paredes de rocha no entorno, piso de pedra, estalactites
      for (let y = 0; y < this.altura; y++) {
        for (let x = 0; x < this.largura; x++) {
          if (x <= 1 || x >= this.largura - 2 || y <= 1 || y >= this.altura - 2) {
            this.motorNavegacao.definirCelula(x, y, TIPOS_TERRENO.ROCHA);
          } else {
            this.motorNavegacao.definirCelula(x, y, TIPOS_TERRENO.TRILHA);
          }
        }
      }
      // Estalactites e veios no meio
      this.motorNavegacao.definirCelula(10, 8, TIPOS_TERRENO.ROCHA);
      this.motorNavegacao.definirCelula(11, 8, TIPOS_TERRENO.ROCHA);
      this.motorNavegacao.definirCelula(20, 12, TIPOS_TERRENO.ROCHA);
    } else if (this.id === 'regiao_bosque') {
      // Bosque: mata fechada intercalada com trilhas estreitas
      for (let y = 0; y < this.altura; y++) {
        for (let x = 0; x < this.largura; x++) {
          if ((x + y) % 3 === 0 && x > 2 && y > 2) {
            this.motorNavegacao.definirCelula(x, y, TIPOS_TERRENO.MATA_FECHADA);
          }
        }
      }
    } else if (this.id === 'regiao_praia') {
      // Praia: areia predominante e mar ao sul
      for (let y = 0; y < this.altura; y++) {
        for (let x = 0; x < this.largura; x++) {
          if (y >= this.altura - 4) {
            this.motorNavegacao.definirCelula(x, y, TIPOS_TERRENO.AGUA_PROFUNDA);
          } else {
            this.motorNavegacao.definirCelula(x, y, TIPOS_TERRENO.AREIA);
          }
        }
      }
    }
  }

  adicionarHabitante(serId, x, y) {
    this.habitantes.set(serId, {
      serId,
      gridX: x,
      gridY: y,
      pixelX: x * 32 + 16,
      pixelY: y * 32 + 16,
      entrouEm: Date.now()
    });
    this.motorNavegacao.atualizarPosicaoHabitante(serId, x, y);
  }

  removerHabitante(serId) {
    const dados = this.habitantes.get(serId);
    if (dados) {
      const cel = this.motorNavegacao.obterCelula(dados.gridX, dados.gridY);
      if (cel && cel.ocupante === serId) cel.ocupante = null;
      this.habitantes.delete(serId);
    }
    return dados;
  }

  obterHabitante(serId) {
    return this.habitantes.get(serId) || null;
  }

  listarHabitantes() {
    return Array.from(this.habitantes.values());
  }

  exportarEstado() {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      tipoAmbiente: this.tipoAmbiente,
      habitantes: this.listarHabitantes(),
      recursosDisponiveis: this.recursosDisponiveis,
      objetos: this.objetos,
      eventosAtivos: this.eventosAtivos
    };
  }
}

class GerenciadorInstancias {
  constructor() {
    this.instancias = new Map();
    // Mapeamento rápido: serId -> regiaoId atual
    this.localizacaoHabitantes = new Map();

    this.inicializarRegioes();
  }

  inicializarRegioes() {
    // 1. Mapa Global (Vila Aurora)
    this.registrarInstancia(new InstanciaRegiao({
      id: 'mapa_global',
      nome: '🏝️ Ilha Central (Vila Aurora)',
      descricao: 'O coração da colônia. Acampamento, fogueira central, cabanas, vendinha e caminhos principais.',
      tipoAmbiente: 'aberto',
      largura: 40,
      altura: 28,
      recursosDisponiveis: ['madeira', 'peixe'],
      objetos: [
        { id: 'fogueira_central', nome: 'Fogueira Central', x: 20, y: 14 },
        { id: 'venda_comunitaria', nome: 'Venda Comunitária', x: 16, y: 17 }
      ],
      portais: [
        { portalId: 'portal_para_caverna', x: 34, y: 5, regiaoDestino: 'regiao_caverna', spawnX: 3, spawnY: 10 },
        { portalId: 'portal_para_bosque', x: 13, y: 9, regiaoDestino: 'regiao_bosque', spawnX: 2, spawnY: 10 },
        { portalId: 'portal_para_praia', x: 15, y: 23, regiaoDestino: 'regiao_praia', spawnX: 15, spawnY: 2 }
      ]
    }));

    // 2. Caverna Subterrânea
    this.registrarInstancia(new InstanciaRegiao({
      id: 'regiao_caverna',
      nome: '🪨 Caverna e Minas Sombrias',
      descricao: 'Galgas úmidas e escuras no interior rochoso da ilha. Rica em pedras e minérios.',
      tipoAmbiente: 'subterraneo',
      largura: 28,
      altura: 20,
      recursosDisponiveis: ['pedra', 'ferro', 'cristais'],
      objetos: [
        { id: 'veio_pedra_1', nome: 'Veio de Pedra e Minério', x: 12, y: 5 },
        { id: 'lago_subterraneo', nome: 'Lago de Água Doce Subterrâneo', x: 22, y: 15 }
      ],
      portais: [
        { portalId: 'saida_caverna', x: 2, y: 10, regiaoDestino: 'mapa_global', spawnX: 33, spawnY: 6 }
      ]
    }));

    // 3. Bosque Denso
    this.registrarInstancia(new InstanciaRegiao({
      id: 'regiao_bosque',
      nome: '🌲 Bosque e Floresta Alta',
      descricao: 'Mata densa ao norte e oeste da vila. Árvores frutíferas e trilhas ocultas.',
      tipoAmbiente: 'mata',
      largura: 30,
      altura: 22,
      recursosDisponiveis: ['madeira', 'frutas', 'cipos', 'sucata_tecnologica'],
      objetos: [
        { id: 'arvore_frutifera_1', nome: 'Árvore de Frutas Silvestres', x: 8, y: 7 },
        { id: 'carcaca_antiga', nome: 'Sucata de Antiga Expedição', x: 24, y: 16 }
      ],
      portais: [
        { portalId: 'saida_bosque', x: 2, y: 10, regiaoDestino: 'mapa_global', spawnX: 14, spawnY: 10 }
      ]
    }));

    // 4. Praia e Litoral Sul
    this.registrarInstancia(new InstanciaRegiao({
      id: 'regiao_praia',
      nome: '🏖️ Praia e Litoral Sul',
      descricao: 'Faixa de areia ensolarada, recifes de corais, conchas raras e cais de madeira.',
      tipoAmbiente: 'litoral',
      largura: 32,
      altura: 20,
      recursosDisponiveis: ['peixe', 'conchas', 'perolas'],
      objetos: [
        { id: 'cais_barco', nome: 'Píer de Madeira', x: 15, y: 3 },
        { id: 'banco_corais', nome: 'Recife de Corais', x: 25, y: 14 }
      ],
      portais: [
        { portalId: 'saida_praia', x: 15, y: 1, regiaoDestino: 'mapa_global', spawnX: 16, spawnY: 22 }
      ]
    }));

    // Inicializa habitantes na Vila Global
    const habIniciais = [
      { id: 'icaro', x: 8, y: 13 },
      { id: 'elara', x: 11, y: 13 },
      { id: 'lara', x: 11, y: 13 },
      { id: 'joao', x: 20, y: 14 },
      { id: 'maria', x: 32, y: 13 }
    ];

    const global = this.instancias.get('mapa_global');
    for (const h of habIniciais) {
      global.adicionarHabitante(h.id, h.x, h.y);
      this.localizacaoHabitantes.set(h.id, 'mapa_global');
    }
  }

  registrarInstancia(instancia) {
    this.instancias.set(instancia.id, instancia);
  }

  obterInstancia(regiaoId) {
    return this.instancias.get(regiaoId) || null;
  }

  obterLocalizacaoHabitante(serId) {
    const regiaoId = this.localizacaoHabitantes.get(serId) || 'mapa_global';
    const inst = this.instancias.get(regiaoId);
    const dados = inst ? inst.obterHabitante(serId) : null;
    return {
      regiaoId,
      regiaoNome: inst ? inst.nome : 'Desconhecida',
      tipoAmbiente: inst ? inst.tipoAmbiente : 'aberto',
      posicao: dados || { gridX: 20, gridY: 14, pixelX: 640, pixelY: 448 }
    };
  }

  /**
   * Transição entre Instâncias/Regiões
   * O habitante sai da região atual e entra na nova região no ponto de spawn designado.
   * O estado da região anterior NÃO é resetado!
   */
  transitarHabitante(serId, regiaoDestinoId, spawnX = null, spawnY = null) {
    const instDestino = this.instancias.get(regiaoDestinoId);
    if (!instDestino) {
      throw new Error(`Região de destino "${regiaoDestinoId}" não encontrada.`);
    }

    const regiaoOrigemId = this.localizacaoHabitantes.get(serId) || 'mapa_global';
    const instOrigem = this.instancias.get(regiaoOrigemId);

    let dadosOrigem = null;
    if (instOrigem) {
      dadosOrigem = instOrigem.removerHabitante(serId);
    }

    // Determina ponto de spawn na região de destino
    let finalX = spawnX;
    let finalY = spawnY;

    if (finalX === null || finalY === null) {
      // Procura portal de retorno correspondente
      const portalRetorno = instDestino.portais.find(p => p.regiaoDestino === regiaoOrigemId);
      if (portalRetorno) {
        finalX = portalRetorno.x;
        finalY = portalRetorno.y;
      } else {
        finalX = Math.floor(instDestino.largura / 2);
        finalY = Math.floor(instDestino.altura / 2);
      }
    }

    // Adiciona na nova instância
    instDestino.adicionarHabitante(serId, finalX, finalY);
    this.localizacaoHabitantes.set(serId, regiaoDestinoId);

    return {
      sucesso: true,
      serId,
      de: regiaoOrigemId,
      para: regiaoDestinoId,
      regiaoNome: instDestino.nome,
      novaPosicao: { gridX: finalX, gridY: finalY }
    };
  }

  // Lista todas as regiões e o censo de habitantes
  listarRegioes() {
    const lista = [];
    for (const [id, inst] of this.instancias.entries()) {
      lista.push({
        id,
        nome: inst.nome,
        tipoAmbiente: inst.tipoAmbiente,
        descricao: inst.descricao,
        totalHabitantes: inst.habitantes.size,
        habitantes: Array.from(inst.habitantes.keys())
      });
    }
    return lista;
  }
}

const gerenciadorInstanciasGlobal = new GerenciadorInstancias();

module.exports = {
  InstanciaRegiao,
  GerenciadorInstancias,
  gerenciadorInstanciasGlobal
};

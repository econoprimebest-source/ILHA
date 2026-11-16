/**
 * motor-navegacao-grid.js
 * 
 * MISSÃO MASTER — ILHA AURORA (MÓDULO 1)
 * Motor de Navegação baseado em Grid 2D e Algoritmo A*
 * 
 * - Grid 40x28 (células de 32x32 pixels, mapa 1280x896)
 * - Matriz de acessibilidade, custos de terreno e caixas de colisão
 * - Pathfinding A* 8-direcional com corte de quina seguro
 * - Evitação de sobreposição (dois habitantes na mesma célula)
 * - Integração com POIs de alto nível (espaco.js)
 * - Autoridade de movimentação pelo Backend
 */

'use strict';

const LARGURA_GRID = 40;
const ALTURA_GRID = 28;
const TAMANHO_CELULA = 32;

// Tipos de terreno e custos base de navegação
const TIPOS_TERRENO = {
  TRILHA: { id: 'trilha', custo: 0.8, acessivel: true, nome: 'Trilha Batida' },
  PONTE: { id: 'ponte', custo: 0.9, acessivel: true, nome: 'Ponte de Madeira' },
  GRAMA: { id: 'grama', custo: 1.0, acessivel: true, nome: 'Grama' },
  AREIA: { id: 'areia', custo: 1.3, acessivel: true, nome: 'Areia da Praia' },
  MATA_FECHADA: { id: 'mata_fechada', custo: 2.2, acessivel: true, nome: 'Mata Fechada' },
  AGUA_RASA: { id: 'agua_rasa', custo: 2.5, acessivel: true, nome: 'Água Rasa' },
  AGUA_PROFUNDA: { id: 'agua_profunda', custo: Infinity, acessivel: false, nome: 'Oceano / Água Profunda' },
  ROCHA: { id: 'rocha', custo: Infinity, acessivel: false, nome: 'Paredão de Rocha' },
  CONSTRUCAO: { id: 'construcao', custo: Infinity, acessivel: false, nome: 'Parede de Construção' }
};

class MotorNavegacaoGrid {
  constructor(opcoes = {}) {
    this.largura = opcoes.largura || LARGURA_GRID;
    this.altura = opcoes.altura || ALTURA_GRID;
    this.tamanhoCelula = opcoes.tamanhoCelula || TAMANHO_CELULA;

    // Matriz 2D de células: [y][x]
    this.grade = [];
    // Ocupantes dinâmicos: Map(serId -> { x, y, pixelX, pixelY })
    this.habitantesPos = new Map();
    // Obstáculos estáticos e caixas de colisão
    this.construcoesColisoes = [];
    // Transições de região
    this.pontosTransicao = new Map();

    this.inicializarGrade();
    this.carregarObstaculosPadrao();
  }

  inicializarGrade() {
    this.grade = [];
    for (let y = 0; y < this.altura; y++) {
      const linha = [];
      for (let x = 0; x < this.largura; x++) {
        // Padrão: ilha central com grama e perímetro de água profunda
        let tipo = TIPOS_TERRENO.GRAMA;

        // Borda extrema = oceano (água profunda intransitável)
        if (x <= 1 || x >= this.largura - 2 || y <= 1 || y >= this.altura - 2) {
          tipo = TIPOS_TERRENO.AGUA_PROFUNDA;
        } else if (y >= this.altura - 5 && x >= 8 && x <= 28) {
          // Litoral Sul = Areia da praia
          tipo = TIPOS_TERRENO.AREIA;
        } else if (x >= 21 && x <= 23 && y >= 10 && y <= 22) {
          // Rio cortando o centro-leste
          tipo = TIPOS_TERRENO.AGUA_PROFUNDA;
        } else if (x >= 32 && y <= 8) {
          // Zona montanhosa da caverna
          tipo = TIPOS_TERRENO.ROCHA;
        }

        linha.push({
          x,
          y,
          pixelX: x * this.tamanhoCelula + this.tamanhoCelula / 2,
          pixelY: y * this.tamanhoCelula + this.tamanhoCelula / 2,
          tipo: tipo.id,
          custo: tipo.custo,
          acessivel: tipo.acessivel,
          ocupante: null,
          bloqueioTemporario: false
        });
      }
      this.grade.push(linha);
    }

    // Passagens e Pontes Especiais
    // 1. Ponte de madeira cruzando o rio
    for (let px = 20; px <= 24; px++) {
      this.definirCelula(px, 14, TIPOS_TERRENO.PONTE);
      this.definirCelula(px, 15, TIPOS_TERRENO.PONTE);
    }

    // 2. Trilhas principais batidas (terra e pedra) ligando fogueira a pontos-chave
    // Da fogueira (20, 14) para o Cais/Praia (18, 22)
    for (let ty = 14; ty <= 22; ty++) this.definirCelula(19, ty, TIPOS_TERRENO.TRILHA);
    // Da fogueira (20, 14) para a Venda (16, 17)
    for (let tx = 16; tx <= 20; tx++) this.definirCelula(tx, 16, TIPOS_TERRENO.TRILHA);
    // Da fogueira (20, 14) para o Bosque e Cabanas Oeste (10, 12)
    for (let tx = 10; tx <= 20; tx++) this.definirCelula(tx, 13, TIPOS_TERRENO.TRILHA);
    // Do outro lado da ponte (24, 14) para a Fazenda (34, 16)
    for (let tx = 24; tx <= 34; tx++) this.definirCelula(tx, 15, TIPOS_TERRENO.TRILHA);
    // Para a Caverna (34, 5)
    for (let ty = 5; ty <= 14; ty++) this.definirCelula(33, ty, TIPOS_TERRENO.TRILHA);
    this.definirCelula(34, 5, TIPOS_TERRENO.TRILHA); // Boca transitável da caverna
  }

  carregarObstaculosPadrao() {
    // Caixas de Colisão das Construções (coordenadas em grid)
    // Cabana Ícaro (x: 240, y: 395) -> Grid ~7..8, 12..13
    this.adicionarConstrucaoColisao('casa_icaro', 6, 11, 3, 2, { portaX: 7, portaY: 13 });
    // Cabana Lara (x: 336, y: 395) -> Grid ~10..11, 12..13
    this.adicionarConstrucaoColisao('casa_lara', 10, 11, 3, 2, { portaX: 11, portaY: 13 });
    // Refúgio João (x: 576, y: 192) -> Grid ~17..18, 5..6
    this.adicionarConstrucaoColisao('casa_joao', 17, 5, 3, 2, { portaX: 18, portaY: 7 });
    // Cabana Maria (x: 1024, y: 416) -> Grid ~31..32, 12..13
    this.adicionarConstrucaoColisao('casa_maria', 31, 12, 3, 2, { portaX: 32, portaY: 14 });
    // Venda Comunitária (x: 512, y: 544) -> Grid ~15..16, 16..17
    this.adicionarConstrucaoColisao('venda', 15, 16, 3, 2, { portaX: 16, portaY: 18 });

    // Pontos de Transição entre Regiões (Instâncias)
    this.pontosTransicao.set('caverna', { gridX: 34, gridY: 5, destino: 'regiao_caverna', portaEntrada: { gridX: 4, gridY: 18 } });
    this.pontosTransicao.set('bosque', { gridX: 13, gridY: 9, destino: 'regiao_bosque', portaEntrada: { gridX: 2, gridY: 14 } });
    this.pontosTransicao.set('praia', { gridX: 15, gridY: 23, destino: 'regiao_praia', portaEntrada: { gridX: 12, gridY: 4 } });
  }

  adicionarConstrucaoColisao(id, x, y, larg, alt, opcoes = {}) {
    this.construcoesColisoes.push({ id, x, y, larg, alt, ...opcoes });
    for (let cy = y; cy < y + alt; cy++) {
      for (let cx = x; cx < x + larg; cx++) {
        // Se for a porta de entrada, deixa acessível com custo de trilha
        if (opcoes.portaX === cx && opcoes.portaY === cy) {
          this.definirCelula(cx, cy, TIPOS_TERRENO.TRILHA);
        } else {
          this.definirCelula(cx, cy, TIPOS_TERRENO.CONSTRUCAO);
        }
      }
    }
  }

  definirCelula(x, y, tipoTerreno) {
    if (!this.estaNoLimite(x, y)) return;
    const c = this.grade[y][x];
    c.tipo = tipoTerreno.id;
    c.custo = tipoTerreno.custo;
    c.acessivel = tipoTerreno.acessivel;
  }

  estaNoLimite(x, y) {
    return x >= 0 && x < this.largura && y >= 0 && y < this.altura;
  }

  obterCelula(x, y) {
    if (!this.estaNoLimite(x, y)) return null;
    return this.grade[y][x];
  }

  pixelParaGrid(pixelX, pixelY) {
    const gx = Math.floor(pixelX / this.tamanhoCelula);
    const gy = Math.floor(pixelY / this.tamanhoCelula);
    return {
      gridX: Math.max(0, Math.min(this.largura - 1, gx)),
      gridY: Math.max(0, Math.min(this.altura - 1, gy))
    };
  }

  gridParaPixel(gridX, gridY) {
    return {
      pixelX: gridX * this.tamanhoCelula + this.tamanhoCelula / 2,
      pixelY: gridY * this.tamanhoCelula + this.tamanhoCelula / 2
    };
  }

  // Registra / atualiza a posição oficial de um habitante
  atualizarPosicaoHabitante(serId, gridX, gridY) {
    // Limpa ocupação anterior
    if (this.habitantesPos.has(serId)) {
      const anterior = this.habitantesPos.get(serId);
      const celAnt = this.obterCelula(anterior.gridX, anterior.gridY);
      if (celAnt && celAnt.ocupante === serId) celAnt.ocupante = null;
    }

    const cel = this.obterCelula(gridX, gridY);
    if (cel) {
      cel.ocupante = serId;
      const pix = this.gridParaPixel(gridX, gridY);
      this.habitantesPos.set(serId, {
        gridX,
        gridY,
        pixelX: pix.pixelX,
        pixelY: pix.pixelY,
        atualizadoEm: Date.now()
      });
    }
  }

  // Verifica se uma célula está livre (sem obstáculo e sem outro habitante)
  celulaLivrePara(x, y, serIdIgnorado = null) {
    const c = this.obterCelula(x, y);
    if (!c || !c.acessivel || c.bloqueioTemporario) return false;
    if (c.ocupante && c.ocupante !== serIdIgnorado) return false;
    return true;
  }

  // Vizinhos acessíveis em 8 direções
  obterVizinhos(nodo, serId = null) {
    const vizinhos = [];
    const dirs = [
      { dx: 0, dy: -1, diag: false }, // N
      { dx: 1, dy: 0, diag: false },  // L
      { dx: 0, dy: 1, diag: false },  // S
      { dx: -1, dy: 0, diag: false }, // O
      { dx: 1, dy: -1, diag: true },  // NE
      { dx: 1, dy: 1, diag: true },   // SE
      { dx: -1, dy: 1, diag: true },  // SO
      { dx: -1, dy: -1, diag: true }  // NO
    ];

    for (const d of dirs) {
      const nx = nodo.x + d.dx;
      const ny = nodo.y + d.dy;
      if (!this.estaNoLimite(nx, ny)) continue;

      const cel = this.grade[ny][nx];
      if (!cel.acessivel || cel.bloqueioTemporario) continue;

      // Evita colisão direta com outro habitante
      if (cel.ocupante && cel.ocupante !== serId) continue;

      // Corte de quina seguro em diagonais
      if (d.diag) {
        const cAdj1 = this.grade[nodo.y][nodo.x + d.dx];
        const cAdj2 = this.grade[nodo.y + d.dy][nodo.x];
        if (!cAdj1.acessivel || !cAdj2.acessivel) continue; // Não atravessa quina de parede!
      }

      const pesoDist = d.diag ? 1.414 : 1.0;
      const custoPasso = cel.custo * pesoDist;
      vizinhos.push({ celula: cel, custo: custoPasso });
    }

    return vizinhos;
  }

  // Heurística de distância Octile admissível para 8 direções
  heuristica(x1, y1, x2, y2) {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    const F = 1.414 - 1.0;
    return (dx < dy) ? F * dx + dy : F * dy + dx;
  }

  /**
   * Algoritmo A* Pathfinding Oficial
   * @param {Object} origem { gridX, gridY }
   * @param {Object} destino { gridX, gridY }
   * @param {string} serId Opcional para ignorar a própria ocupação
   * @returns {Array|null} Lista de passos [{ gridX, gridY, pixelX, pixelY, custo }]
   */
  calcularRota(origem, destino, serId = null) {
    const ox = Math.round(origem.gridX);
    const oy = Math.round(origem.gridY);
    let dx = Math.round(destino.gridX);
    let dy = Math.round(destino.gridY);

    if (!this.estaNoLimite(ox, oy) || !this.estaNoLimite(dx, dy)) return null;

    // Se o destino exato for intransitável (ex: parede de cabana), busca célula vizinha livre mais próxima
    const celDestino = this.grade[dy][dx];
    if (!celDestino.acessivel || (celDestino.ocupante && celDestino.ocupante !== serId)) {
      const vizLivre = this.encontrarAdjacenteLivre(dx, dy, ox, oy, serId);
      if (vizLivre) {
        dx = vizLivre.x;
        dy = vizLivre.y;
      } else {
        return null;
      }
    }

    if (ox === dx && oy === dy) return [];

    const chave = (x, y) => `${x},${y}`;
    const openSet = new Map();
    const closedSet = new Set();
    const gScore = new Map();
    const fScore = new Map();
    const veioDe = new Map();

    const startKey = chave(ox, oy);
    gScore.set(startKey, 0);
    const startF = this.heuristica(ox, oy, dx, dy);
    fScore.set(startKey, startF);
    openSet.set(startKey, { x: ox, y: oy, f: startF });

    while (openSet.size > 0) {
      // Pega o nó com menor fScore no openSet
      let menorKey = null;
      let menorF = Infinity;
      for (const [k, item] of openSet.entries()) {
        if (item.f < menorF) {
          menorF = item.f;
          menorKey = k;
        }
      }

      const atual = openSet.get(menorKey);
      if (atual.x === dx && atual.y === dy) {
        // Reconstrução do caminho ótimo
        return this.reconstruirCaminho(veioDe, atual);
      }

      openSet.delete(menorKey);
      closedSet.add(menorKey);

      const vizinhos = this.obterVizinhos(atual, serId);
      for (const { celula: viz, custo } of vizinhos) {
        const vKey = chave(viz.x, viz.y);
        if (closedSet.has(vKey)) continue;

        const tentG = gScore.get(menorKey) + custo;
        if (!gScore.has(vKey) || tentG < gScore.get(vKey)) {
          veioDe.set(vKey, atual);
          gScore.set(vKey, tentG);
          const f = tentG + this.heuristica(viz.x, viz.y, dx, dy);
          fScore.set(vKey, f);
          openSet.set(vKey, { x: viz.x, y: viz.y, f });
        }
      }
    }

    return null; // Rota bloqueada
  }

  encontrarAdjacenteLivre(x, y, prefX, prefY, serId = null) {
    const dirs = [
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 }
    ];

    // Ordena pela menor distância em relação à origem do personagem
    dirs.sort((a, b) => {
      const d1 = Math.hypot((x + a.dx) - prefX, (y + a.dy) - prefY);
      const d2 = Math.hypot((x + b.dx) - prefX, (y + b.dy) - prefY);
      return d1 - d2;
    });

    for (const d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (this.estaNoLimite(nx, ny)) {
        const cel = this.grade[ny][nx];
        if (cel.acessivel && (!cel.ocupante || cel.ocupante === serId)) {
          return cel;
        }
      }
    }
    return null;
  }

  reconstruirCaminho(veioDe, atual) {
    const caminho = [];
    const chave = (x, y) => `${x},${y}`;
    let curr = atual;

    while (curr) {
      const pix = this.gridParaPixel(curr.x, curr.y);
      caminho.unshift({
        gridX: curr.x,
        gridY: curr.y,
        pixelX: pix.pixelX,
        pixelY: pix.pixelY,
        tipo: this.grade[curr.y][curr.x].tipo,
        custo: this.grade[curr.y][curr.x].custo
      });
      const cKey = chave(curr.x, curr.y);
      curr = veioDe.get(cKey) || null;
    }

    // Remove o nó inicial (onde o personagem já está) se houver mais passos
    if (caminho.length > 1) {
      caminho.shift();
    }
    return caminho;
  }

  // Recálculo de rota quando uma célula do caminho estiver repentinamente ocupada
  recalcularSeNecessario(posAtual, rotaOriginal, serId) {
    if (!rotaOriginal || rotaOriginal.length === 0) return [];
    const proximoPasso = rotaOriginal[0];
    if (!this.celulaLivrePara(proximoPasso.gridX, proximoPasso.gridY, serId)) {
      // Caminho obstruído! Recalcula até o destino final
      const destinoFinal = rotaOriginal[rotaOriginal.length - 1];
      return this.calcularRota(posAtual, destinoFinal, serId) || [];
    }
    return rotaOriginal;
  }

  // Exporta estado completo do Grid para sincronização com PixiJS e Observatório
  exportarEstadoNavegacao() {
    return {
      largura: this.largura,
      altura: this.altura,
      tamanhoCelula: this.tamanhoCelula,
      habitantes: Object.fromEntries(this.habitantesPos),
      construcoes: this.construcoesColisoes,
      transicoes: Object.fromEntries(this.pontosTransicao)
    };
  }
}

// Instância singleton do mapa global
const motorGridGlobal = new MotorNavegacaoGrid();

module.exports = {
  MotorNavegacaoGrid,
  motorGridGlobal,
  TIPOS_TERRENO,
  LARGURA_GRID,
  ALTURA_GRID,
  TAMANHO_CELULA
};

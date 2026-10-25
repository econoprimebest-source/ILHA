/**
 * motor-pixi-ilha.js — Motor 2.5D Isométrico Profissional "Evertrail Tribe" para a Ilha Aurora
 * 
 * - Renderização em 30 FPS econômico para mobile / Z-Fold
 * - Câmera livre: Zoom dinâmico (0.7x a 2.8x), Pan/Drag pelo mapa e Foco automático em personagens
 * - Vida e Natureza: Espuma de ondas na costa, riacho translúcido, pássaros voando, vento e folhas da estação
 * - Fauna Selvagem & Marítima: Pantera Negra das Sombras rondando a ilha e Tubarão-dos-recifes nas águas do sul
 * - Curral de Animais: Cabras e galinhas animadas ao lado da fazenda
 * - Plantação Sazonal Viva: Canteiros arados vazios ou com brotos, folhagens e vegetais maduros conforme o plantio
 * - Arena de Lutas em terra firme com ringue de toras, tochas acesas e boneco de treino
 * - Obras e Construções: Andaimes, toras e barra de progresso visual para projetos comunitários
 * - Jangada rústica ancorada no cais balançando no mar, com suporte a pesca no cais
 * - Personagens com túnicas detalhadas, ferramentas nas mãos (machado, vara, tocha, lança) e balões de fala
 * - Hotspots interativos para inspecionar casas (corte sem teto), caverna e moradores
 */
(function() {
  'use strict';

  if (typeof PIXI === 'undefined') {
    console.error('[PIXI] PixiJS não encontrado! Verifique o script /pixi.min.js');
    return;
  }

  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
  PIXI.Ticker.shared.maxFPS = 30; // 30 FPS cravados para máxima economia de bateria

  // Posições normalizadas 0..1 calibradas exatamente com mapa-ilha-evertrail.png
  const LOCAIS_MAPA = {
    fogueira:     { x: 0.490, y: 0.485, nome: 'Fogueira Central' },
    acampamento:  { x: 0.460, y: 0.540, nome: 'Acampamento' },
    casa_icaro:   { x: 0.220, y: 0.480, nome: 'Cabana do Ícaro' },
    casa_lara:    { x: 0.240, y: 0.410, nome: 'Cabana da Lara' },
    casa_joao:    { x: 0.460, y: 0.240, nome: 'Abrigo do João' },
    casa_maria:   { x: 0.820, y: 0.580, nome: 'Cabana da Maria' },
    fazenda:      { x: 0.880, y: 0.560, nome: 'Horta da Fazenda' },
    curral:       { x: 0.890, y: 0.670, nome: 'Curral de Animais' },
    barco:        { x: 0.480, y: 0.840, nome: 'Cais do Barco' },
    mar:          { x: 0.350, y: 0.880, nome: 'Praia do Sul' },
    arena:        { x: 0.660, y: 0.360, nome: 'Arena de Lutas' },
    caverna:      { x: 0.880, y: 0.220, nome: 'Caverna Sombria' },
    bosque:       { x: 0.320, y: 0.320, nome: 'Bosque de Frutas' },
    floresta:     { x: 0.760, y: 0.320, nome: 'Floresta Fechada' },
    rio:          { x: 0.585, y: 0.580, nome: 'Margem do Rio' },
    cachoeira:    { x: 0.650, y: 0.140, nome: 'Cachoeira' },
    ilha_vizinha: { x: 0.080, y: 0.820, nome: 'Ilha Vizinha' }
  };

  const CORES_PERSONAGEM = {
    icaro: { roupa: 0x15803d, pele: 0xf5d0b5, cabelo: 0x451a03, cinto: 0xfbbf24, nome: 'Ícaro' },
    joao:  { roupa: 0x0284c7, pele: 0xfbd0b5, cabelo: 0x1e293b, cinto: 0xffffff, nome: 'João' },
    maria: { roupa: 0xe11d48, pele: 0xfde0cf, cabelo: 0x713f12, cinto: 0xfef08a, nome: 'Maria' },
    lara:  { roupa: 0x9333ea, pele: 0xfde0cf, cabelo: 0xfef08a, cinto: 0xddd6fe, nome: 'Lara' }
  };

  const AURAS_EMOCAO = {
    raiva: 0xef4444, confronto: 0xef4444, medo: 0x38bdf8, frio: 0x0284c7,
    afeto: 0xf472b6, romance: 0xf472b6, satisfacao: 0x10b981, paz: 0x34d399,
    alerta: 0xf59e0b, padrao: 0xfbbf24
  };

  const ICONES_ACAO = {
    descansar: '💤', dormir: '💤', comer: '🍖', beber: '💧', coletar_agua: '💧',
    pescar: '🐟', pescar_cais: '🎣', colher: '🌾', colher_horta: '🥕', plantar: '🌱',
    cuidar_animais: '🐐', cortar_arvore: '🪓', coletar_pedra: '🪨', fabricar_ferramenta: '🔨',
    trabalhar_construcao: '🏗️', minerar_caverna: '⛏️', explorar_caverna: '🔦',
    mergulhar_mar: '🤿', mergulhar: '🏊', acender_fogueira: '🔥', alimentar_fogo: '🔥',
    conversar: '💬', conviver: '🤝', falar: '🗣️', compartilhar_historias: '📖',
    planejar_vila: '🗺️', trocar_recursos: '🎁', afugentar_fera: '🔥', desafiar_luta: '⚔️',
    observar: '👁️', explorar: '🧭', caçar: '🏹'
  };

  class MotorPixiIlha {
    constructor(canvas) {
      this.canvas = canvas;
      this.containerStage = document.getElementById('map-stage') || document.body;
      this.app = null;
      this.mapSprite = null;
      this.carregado = false;
      this.box = { x: 0, y: 0, w: 1376, h: 768, scale: 1 };
      
      // Câmera Dinâmica
      this.camera = {
        x: 0, y: 0,
        targetX: 0, targetY: 0,
        zoom: 1, targetZoom: 1,
        minZoom: 0.75, maxZoom: 2.8,
        followId: null,
        isDragging: false,
        dragStartX: 0, dragStartY: 0,
        camStartX: 0, camStartY: 0
      };

      // Partículas e Efeitos
      this.faiscas = [];
      this.folhasVento = [];
      this.passaros = [];
      this.ondasOceano = [];
      
      // Atores e Hotspots
      this.actorContainers = {};
      this.hotspots = {};
      this.hoveredLocal = null;

      // Posição da Fera e do Tubarão
      this.predadorPos = { x: 0.88, y: 0.22, destX: 0.88, destY: 0.22 };
      this.tubaraoAngulo = 0;

      this.init();
    }

    init() {
      const rect = this.containerStage.getBoundingClientRect();
      const w = Math.max(700, rect.width || 1000);
      const h = Math.max(480, rect.height || 650);

      this.app = new PIXI.Application({
        view: this.canvas,
        width: w,
        height: h,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        backgroundColor: 0x082b45,
        antialias: true,
        powerPreference: 'low-power'
      });

      // Camada Raiz com Transformação da Câmera
      this.cameraContainer = new PIXI.Container();
      this.app.stage.addChild(this.cameraContainer);

      // 1. Chão (Mapa 2.5D Isométrico de Alta Qualidade)
      this.groundContainer = new PIXI.Container();
      this.cameraContainer.addChild(this.groundContainer);

      // 2. Ondas do Mar e Água Viva
      this.waterContainer = new PIXI.Container();
      this.cameraContainer.addChild(this.waterContainer);

      // 3. Estruturas Dinâmicas (Horta, Curral, Jangada, Arena, Obras)
      this.structuresContainer = new PIXI.Container();
      this.cameraContainer.addChild(this.structuresContainer);

      // 4. Fogueira Viva Central
      this.campfireContainer = new PIXI.Container();
      this.cameraContainer.addChild(this.campfireContainer);

      // 5. Hotspots de Interação e Seleção
      this.hotspotsContainer = new PIXI.Container();
      this.cameraContainer.addChild(this.hotspotsContainer);

      // 6. Personagens e Criaturas com Z-Sorting
      this.ySortContainer = new PIXI.Container();
      this.ySortContainer.sortableChildren = true;
      this.cameraContainer.addChild(this.ySortContainer);

      // 7. Fauna Aérea (Pássaros)
      this.birdsContainer = new PIXI.Container();
      this.cameraContainer.addChild(this.birdsContainer);

      // 8. Clima e Partículas da Estação (Chuva, Folhas de Outono, Pétalas de Primavera)
      this.weatherOverlay = new PIXI.Graphics();
      this.cameraContainer.addChild(this.weatherOverlay);

      // 9. Iluminação Dia/Noite com Luz Volumétrica
      this.lightingOverlay = new PIXI.Graphics();
      this.cameraContainer.addChild(this.lightingOverlay);

      this.inicializarParticulas();
      this.configurarEventosCamera();
      this.carregarMapa();

      window.addEventListener('resize', () => this.onResize());
      this.app.ticker.add(() => this.tick());
    }

    inicializarParticulas() {
      // Pássaros cruzando o céu da ilha
      this.passaros = [
        { x: 0.1, y: 0.85, vx: 0.0006, vy: -0.0003, asa: 0 },
        { x: 0.13, y: 0.88, vx: 0.00062, vy: -0.00032, asa: 1 },
        { x: 0.08, y: 0.89, vx: 0.00058, vy: -0.00028, asa: 2 }
      ];

      // Partículas do Vento e Estação
      for (let i = 0; i < 28; i++) {
        this.folhasVento.push({
          x: Math.random(),
          y: Math.random(),
          vx: 0.0004 + Math.random() * 0.0008,
          vy: 0.0002 + Math.random() * 0.0004,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.04,
          tamanho: 2.5 + Math.random() * 3
        });
      }
    }

    configurarEventosCamera() {
      const el = this.canvas;

      // Zoom com a roda do mouse
      el.addEventListener('wheel', ev => {
        ev.preventDefault();
        const rect = el.getBoundingClientRect();
        const mouseX = ev.clientX - rect.left;
        const mouseY = ev.clientY - rect.top;

        const fator = ev.deltaY < 0 ? 1.15 : 0.87;
        const novoZoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, this.camera.targetZoom * fator));
        
        // Ponto de âncora do zoom no cursor
        this.camera.targetX = mouseX - (mouseX - this.camera.targetX) * (novoZoom / this.camera.targetZoom);
        this.camera.targetY = mouseY - (mouseY - this.camera.targetY) * (novoZoom / this.camera.targetZoom);
        this.camera.targetZoom = novoZoom;
        this.camera.followId = null; // Solta o follow se o usuário interagir
      }, { passive: false });

      // Pan / Arrastar mapa com mouse ou touch
      el.addEventListener('pointerdown', ev => {
        if (ev.button === 0 || ev.pointerType === 'touch') {
          this.camera.isDragging = true;
          this.camera.dragStartX = ev.clientX;
          this.camera.dragStartY = ev.clientY;
          this.camera.camStartX = this.camera.targetX;
          this.camera.camStartY = this.camera.targetY;
        }
      });

      window.addEventListener('pointermove', ev => {
        if (this.camera.isDragging) {
          const dx = ev.clientX - this.camera.dragStartX;
          const dy = ev.clientY - this.camera.dragStartY;
          if (Math.hypot(dx, dy) > 4) {
            this.camera.targetX = this.camera.camStartX + dx;
            this.camera.targetY = this.camera.camStartY + dy;
            this.camera.followId = null; // Parar de seguir ao arrastar
          }
        }
      });

      window.addEventListener('pointerup', () => {
        this.camera.isDragging = false;
      });
    }

    // Métodos públicos de Câmera para a UI
    zoomIn() {
      this.camera.targetZoom = Math.min(this.camera.maxZoom, this.camera.targetZoom * 1.3);
    }

    zoomOut() {
      this.camera.targetZoom = Math.max(this.camera.minZoom, this.camera.targetZoom / 1.3);
    }

    resetCamera() {
      this.camera.targetZoom = 1;
      this.camera.targetX = 0;
      this.camera.targetY = 0;
      this.camera.followId = null;
    }

    focarAlvo(id) {
      this.camera.followId = id;
      this.camera.targetZoom = 1.75; // Zoom cinematográfico aproximado
    }

    onResize() {
      if (!this.containerStage || !this.app) return;
      const rect = this.containerStage.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(240, rect.height);
      this.app.renderer.resize(w, h);
      this.recalcularEnquadramento();
    }

    recalcularEnquadramento() {
      const w = this.app.renderer.width / this.app.renderer.resolution;
      const h = this.app.renderer.height / this.app.renderer.resolution;
      const aspecto = 1376 / 768;

      let bw, bh, bx, by, scale;
      if (w / h > aspecto) {
        bh = h;
        bw = h * aspecto;
        by = 0;
        bx = (w - bw) / 2;
        scale = bh / 768;
      } else {
        bw = w;
        bh = w / aspecto;
        bx = 0;
        by = (h - bh) / 2;
        scale = bw / 1376;
      }

      this.box = { x: bx, y: by, w: bw, h: bh, scale };

      if (this.mapSprite) {
        this.mapSprite.x = bx;
        this.mapSprite.y = by;
        this.mapSprite.width = bw;
        this.mapSprite.height = bh;
      }

      this.atualizarHotspots();
    }

    toScreen(normX, normY) {
      return {
        x: this.box.x + this.box.w * normX,
        y: this.box.y + this.box.h * normY
      };
    }

    carregarMapa() {
      const urls = ['/mapa-ilha-evertrail.png', '/mapa-ilha-evertrail.jpg', '/mapa-ilha-nova.png'];
      const tentar = idx => {
        if (idx >= urls.length) return;
        const img = new Image();
        img.src = urls[idx];
        img.onload = () => {
          const tex = PIXI.Texture.from(img);
          this.mapSprite = new PIXI.Sprite(tex);
          this.groundContainer.removeChildren();
          this.groundContainer.addChild(this.mapSprite);
          this.recalcularEnquadramento();
          this.criarHotspots();
          this.carregado = true;
          console.log('[PIXI] Mapa Evertrail Carregado com Sucesso:', urls[idx]);
        };
        img.onerror = () => tentar(idx + 1);
      };
      tentar(0);
    }

    criarHotspots() {
      this.hotspotsContainer.removeChildren();
      this.hotspots = {};

      Object.entries(LOCAIS_MAPA).forEach(([id, info]) => {
        const cont = new PIXI.Container();
        const g = new PIXI.Graphics();
        cont.addChild(g);
        cont.interactive = true;
        cont.cursor = 'pointer';

        cont.on('pointerdown', ev => {
          ev.stopPropagation();
          if (typeof window.abrirPainelLocal === 'function') {
            window.abrirPainelLocal(id);
          }
        });

        cont.on('pointerover', ev => {
          this.hoveredLocal = id;
          this.mostrarTooltip(id, info.nome, ev);
        });

        cont.on('pointerout', () => {
          this.hoveredLocal = null;
          this.esconderTooltip();
        });

        this.hotspotsContainer.addChild(cont);
        this.hotspots[id] = { container: cont, graphics: g, info };
      });

      this.atualizarHotspots();
    }

    atualizarHotspots() {
      Object.entries(this.hotspots).forEach(([id, obj]) => {
        const info = LOCAIS_MAPA[id];
        if (!info) return;
        const pos = this.toScreen(info.x, info.y);
        obj.container.x = pos.x;
        obj.container.y = pos.y;

        const g = obj.graphics;
        g.clear();

        const raio = (id.startsWith('casa_') || id === 'fazenda' || id === 'curral' || id === 'fogueira') ? 34 * this.box.scale : 24 * this.box.scale;

        g.beginFill(0xffffff, 0.001);
        g.drawCircle(0, 0, raio);
        g.endFill();

        const ehHover = this.hoveredLocal === id;
        const ehSelecionado = typeof selectedLocal !== 'undefined' && selectedLocal === id;

        if (ehHover || ehSelecionado) {
          g.lineStyle(2, ehSelecionado ? 0x38bdf8 : 0xfbbf24, 0.85);
          g.drawEllipse(0, 6, raio, raio * 0.5);

          const tagW = Math.max(68, info.nome.length * 6.5);
          g.lineStyle(1, 0x38bdf8, 0.8);
          g.beginFill(0x0f172a, 0.92);
          g.drawRoundedRect(-tagW / 2, -raio - 18, tagW, 18, 5);
          g.endFill();
        }
      });
    }

    // Renderização dos Habitantes com Roupas Tribais e Ferramentas em Mãos
    desenharPersonagem(g, serId, acaoAtual, caminhando, tempo) {
      g.clear();
      const cfg = CORES_PERSONAGEM[serId] || CORES_PERSONAGEM.icaro;
      const s = 1.45 * Math.max(0.80, this.box.scale);

      const bob = caminhando ? -Math.abs(Math.sin(tempo * 0.015)) * 3.5 * s : Math.sin(tempo * 0.004) * 1.2 * s;

      // Sombra projetada no chão
      g.beginFill(0x000000, 0.45);
      g.drawEllipse(0, 0, 13 * s, 6 * s);
      g.endFill();

      // Pernas em passo de caminhada
      g.beginFill(0x1e293b);
      const passoL = caminhando ? Math.sin(tempo * 0.02) * 2.8 : 0;
      const passoR = caminhando ? -Math.sin(tempo * 0.02) * 2.8 : 0;
      g.drawRect(-5 * s + passoL, -6 * s + bob, 4 * s, 6 * s);
      g.drawRect(1 * s + passoR, -6 * s + bob, 4 * s, 6 * s);
      g.endFill();

      // Túnica e Tronco
      g.beginFill(cfg.roupa);
      g.drawRoundedRect(-7.5 * s, -21 * s + bob, 15 * s, 15 * s, 3 * s);
      g.endFill();

      // Cinto de couro
      g.beginFill(cfg.cinto);
      g.drawRect(-7.5 * s, -11 * s + bob, 15 * s, 2.5 * s);
      g.endFill();

      // Cabeça / Rosto
      g.beginFill(cfg.pele);
      g.drawCircle(0, -26 * s + bob, 6 * s);
      g.endFill();

      // Cabelo característico
      g.beginFill(cfg.cabelo);
      g.drawCircle(0, -28 * s + bob, 6 * s);
      if (serId === 'maria' || serId === 'lara') {
        g.drawRect(-6.5 * s, -27 * s + bob, 13 * s, 10 * s); // Trança / Cabelo longo
      }
      g.endFill();

      // Olhos
      g.beginFill(0x0f172a);
      g.drawCircle(-2 * s, -26 * s + bob, 1 * s);
      g.drawCircle(2 * s, -26 * s + bob, 1 * s);
      g.endFill();

      // Ferramenta em mãos baseada na ação
      const acao = (acaoAtual || '').toLowerCase();
      if (acao.includes('cortar') || acao.includes('madeira')) {
        // Machado na mão
        g.lineStyle(1.8 * s, 0x78350f);
        g.moveTo(7 * s, -14 * s + bob);
        g.lineTo(13 * s, -22 * s + bob);
        g.lineStyle(0);
        g.beginFill(0x94a3b8);
        g.drawRect(11 * s, -24 * s + bob, 5 * s, 4 * s);
        g.endFill();
      } else if (acao.includes('pescar')) {
        // Vara de pesca de bambu
        g.lineStyle(1.5 * s, 0xd97706);
        g.moveTo(6 * s, -12 * s + bob);
        g.lineTo(17 * s, -26 * s + bob);
        g.lineStyle(0.8 * s, 0xffffff, 0.7);
        g.lineTo(21 * s, -4 * s + bob); // Linha caindo
      } else if (acao.includes('constru') || acao.includes('fabricar')) {
        // Martelo na mão
        g.lineStyle(1.6 * s, 0x78350f);
        g.moveTo(6 * s, -12 * s + bob);
        g.lineTo(12 * s, -18 * s + bob);
        g.lineStyle(0);
        g.beginFill(0x475569);
        g.drawRect(10 * s, -21 * s + bob, 5 * s, 3.5 * s);
        g.endFill();
      } else if (acao.includes('caverna') || acao.includes('afugentar')) {
        // Tocha flamejante na mão
        g.lineStyle(1.8 * s, 0x78350f);
        g.moveTo(7 * s, -12 * s + bob);
        g.lineTo(11 * s, -22 * s + bob);
        g.lineStyle(0);
        g.beginFill(0xf97316, 0.9);
        g.drawCircle(11 * s, -24 * s + bob, 3.5 * s);
        g.beginFill(0xfef08a, 0.95);
        g.drawCircle(11 * s, -24 * s + bob, 1.8 * s);
        g.endFill();
      }
    }

    // Renderização da Pantera das Sombras (Fera Selvagem)
    desenharPredador(g, tempo) {
      g.clear();
      const s = 1.2 * Math.max(0.75, this.box.scale);
      const respiracao = Math.sin(tempo * 0.005) * 1.5;

      // Sombra furtiva
      g.beginFill(0x000000, 0.6);
      g.drawEllipse(0, 0, 18 * s, 8 * s);
      g.endFill();

      // Corpo esguio felino preto
      g.beginFill(0x09090b);
      g.drawEllipse(0, -9 * s + respiracao, 14 * s, 7 * s);

      // Patas dianteiras e traseiras com garras
      g.drawRect(-10 * s, -5 * s, 4 * s, 6 * s);
      g.drawRect(6 * s, -5 * s, 4 * s, 6 * s);

      // Cabeça felina e orelhas triangulares
      g.drawCircle(12 * s, -12 * s + respiracao, 5.5 * s);
      g.drawPolygon([
        10 * s, -17 * s,
        12 * s, -21 * s,
        14 * s, -17 * s
      ]);

      // Olhos amarelos reluzentes predadores
      g.beginFill(0xfacc15);
      g.drawCircle(13 * s, -13 * s + respiracao, 1.3 * s);
      g.drawCircle(15 * s, -13 * s + respiracao, 1.3 * s);

      // Cauda longa sinuosa
      g.lineStyle(2.2 * s, 0x09090b);
      const chicotada = Math.sin(tempo * 0.01) * 4;
      g.moveTo(-12 * s, -9 * s + respiracao);
      g.bezierCurveTo(-18 * s, -14 * s, -22 * s, -6 * s + chicotada, -25 * s, -12 * s + chicotada);
      g.endFill();
    }

    // Renderização do Tubarão nos Recifes do Oceano Sul
    desenharTubarao(g, tempo) {
      g.clear();
      const s = 1.1 * this.box.scale;

      // Ondulação da água ao redor da barbatana
      const onda = Math.sin(tempo * 0.008) * 3;
      g.lineStyle(1.5, 0xbae6fd, 0.65);
      g.drawEllipse(0, 0, 18 * s + onda, 7 * s);

      // Barbatana dorsal cinzenta cortando a água
      g.lineStyle(0);
      g.beginFill(0x334155, 0.95);
      g.drawPolygon([
        -8 * s, 2 * s,
        -1 * s, -14 * s,
        6 * s, 2 * s
      ]);
      g.endFill();
    }

    // Estruturas Dinâmicas: Horta, Curral, Arena, Jangada e Obras
    atualizarEstruturas(estado, tempo) {
      this.structuresContainer.removeChildren();
      if (!estado || !estado.mundo) return;
      const eco = estado.mundo.ecossistema || {};

      // 1. Horta da Fazenda com fases de crescimento reais
      const posFaz = this.toScreen(LOCAIS_MAPA.fazenda.x, LOCAIS_MAPA.fazenda.y);
      const hortaG = new PIXI.Graphics();
      hortaG.x = posFaz.x;
      hortaG.y = posFaz.y;

      const h = eco.horta || {};
      const totalPlantas = (h.plantados || 0) + (h.crescendo || 0) + (h.maduros || 0);

      // Canteiros de terra arada
      hortaG.beginFill(0x573418, 0.88);
      hortaG.drawRoundedRect(-32, -16, 64, 32, 6);
      hortaG.endFill();
      hortaG.lineStyle(1.2, 0x3d230f, 0.7);
      hortaG.moveTo(-28, -6); hortaG.lineTo(28, -6);
      hortaG.moveTo(-28, 6);  hortaG.lineTo(28, 6);

      if (h.plantadoPor && totalPlantas > 0) {
        if ((h.maduros || 0) > 0.5) {
          // Plantas maduras com vegetais visíveis
          hortaG.beginFill(0x16a34a);
          hortaG.drawCircle(-18, -6, 4.5); hortaG.drawCircle(0, -6, 4.5); hortaG.drawCircle(18, -6, 4.5);
          hortaG.drawCircle(-18, 6, 4.5);  hortaG.drawCircle(0, 6, 4.5);  hortaG.drawCircle(18, 6, 4.5);
          // Frutos maduros
          hortaG.beginFill(0xf59e0b);
          hortaG.drawCircle(-18, -6, 2.5); hortaG.drawCircle(0, -6, 2.5); hortaG.drawCircle(18, -6, 2.5);
          hortaG.drawCircle(-18, 6, 2.5);  hortaG.drawCircle(0, 6, 2.5);  hortaG.drawCircle(18, 6, 2.5);
        } else if ((h.crescendo || 0) > 0.5) {
          // Folhagens crescendo
          hortaG.beginFill(0x22c55e);
          hortaG.drawCircle(-18, -6, 3); hortaG.drawCircle(0, -6, 3); hortaG.drawCircle(18, -6, 3);
          hortaG.drawCircle(-18, 6, 3);  hortaG.drawCircle(0, 6, 3);  hortaG.drawCircle(18, 6, 3);
        } else {
          // Brotos germinando (mounds de terra com pontinhos verdes)
          hortaG.beginFill(0x84cc16);
          hortaG.drawCircle(-18, -6, 1.8); hortaG.drawCircle(0, -6, 1.8); hortaG.drawCircle(18, -6, 1.8);
        }
      }
      this.structuresContainer.addChild(hortaG);

      // 2. Curral de Animais (Cercado de madeira com cabras e galinhas)
      const posCur = this.toScreen(LOCAIS_MAPA.curral.x, LOCAIS_MAPA.curral.y);
      const curralG = new PIXI.Graphics();
      curralG.x = posCur.x;
      curralG.y = posCur.y;

      // Cercado de madeira
      curralG.lineStyle(2, 0x854d0e, 0.95);
      curralG.drawRoundedRect(-28, -18, 56, 36, 4);
      curralG.beginFill(0xfef08a, 0.4); // Palha no chão
      curralG.drawEllipse(0, 0, 24, 14);
      curralG.endFill();

      // Cabra pastando
      const bobCabra = Math.sin(tempo * 0.006) * 1.5;
      curralG.beginFill(0x78350f);
      curralG.drawEllipse(-10, -4 + bobCabra, 6, 4);
      curralG.drawCircle(-15, -7 + bobCabra, 3);
      // Galinha ciscando
      const ciscar = Math.sin(tempo * 0.018) * 2;
      curralG.beginFill(0xffffff);
      curralG.drawCircle(12, 2 + ciscar, 3);
      curralG.beginFill(0xdc2626);
      curralG.drawCircle(14, 0 + ciscar, 1.2);

      this.structuresContainer.addChild(curralG);

      // 3. Jangada Rústica ancorada no cais balançando no mar
      const posCais = this.toScreen(LOCAIS_MAPA.barco.x, LOCAIS_MAPA.barco.y);
      const barcoG = new PIXI.Graphics();
      barcoG.x = posCais.x + 8;
      barcoG.y = posCais.y + 12;

      const balanco = Math.sin(tempo * 0.005) * 2.5;
      barcoG.rotation = Math.sin(tempo * 0.003) * 0.05;

      // Toras da jangada amarradas
      barcoG.beginFill(0x78350f);
      barcoG.drawRoundedRect(-14, -8 + balanco, 28, 16, 3);
      barcoG.lineStyle(1.5, 0x451a03);
      barcoG.moveTo(-14, -3 + balanco); barcoG.lineTo(14, -3 + balanco);
      barcoG.moveTo(-14, 3 + balanco);  barcoG.lineTo(14, 3 + balanco);
      // Mastro com vela recolhida
      barcoG.lineStyle(2, 0x1e293b);
      barcoG.moveTo(0, balanco); barcoG.lineTo(0, -18 + balanco);
      barcoG.beginFill(0xf1f5f9, 0.9);
      barcoG.drawRect(-3, -16 + balanco, 6, 8);
      barcoG.endFill();

      this.structuresContainer.addChild(barcoG);

      // 4. Arena de Lutas em terra firme com Tochas
      const posArena = this.toScreen(LOCAIS_MAPA.arena.x, LOCAIS_MAPA.arena.y);
      const arenaG = new PIXI.Graphics();
      arenaG.x = posArena.x;
      arenaG.y = posArena.y;

      // Círculo de terra batida
      arenaG.beginFill(0x713f12, 0.65);
      arenaG.drawEllipse(0, 0, 32, 18);
      arenaG.endFill();
      arenaG.lineStyle(2, 0x451a03, 0.9);
      arenaG.drawEllipse(0, 0, 32, 18);

      // 4 Tochas nos cantos com chamas animadas
      const tochas = [[-28, -12], [28, -12], [-28, 12], [28, 12]];
      tochas.forEach(([tx, ty]) => {
        arenaG.lineStyle(2, 0x1e293b);
        arenaG.moveTo(tx, ty); arenaG.lineTo(tx, ty - 10);
        arenaG.lineStyle(0);
        const osc = Math.sin(tempo * 0.015 + tx) * 1.5;
        arenaG.beginFill(0xf97316, 0.9);
        arenaG.drawCircle(tx, ty - 12 + osc, 3.5);
        arenaG.beginFill(0xfef08a, 0.95);
        arenaG.drawCircle(tx, ty - 12 + osc, 1.8);
      });
      this.structuresContainer.addChild(arenaG);

      // 5. Obras e Projetos Ativos da Comunidade
      if (Array.isArray(eco.projetos)) {
        eco.projetos.filter(p => !p.concluido).forEach(proj => {
          const loc = LOCAIS_MAPA[proj.local];
          if (!loc) return;
          const posP = this.toScreen(loc.x, loc.y);

          const projG = new PIXI.Graphics();
          projG.x = posP.x;
          projG.y = posP.y - 28;

          // Andaimes e barra de progresso
          projG.lineStyle(1.5, 0xb45309);
          projG.moveTo(-16, 0); projG.lineTo(-16, -16);
          projG.moveTo(16, 0);  projG.lineTo(16, -16);
          projG.moveTo(-16, -12); projG.lineTo(16, -12);

          // Fundo da barra
          projG.lineStyle(0);
          projG.beginFill(0x0f172a, 0.9);
          projG.drawRoundedRect(-22, -26, 44, 7, 3);
          // Preenchimento do progresso
          const progW = (proj.progresso / 100) * 42;
          projG.beginFill(0x38bdf8);
          projG.drawRoundedRect(-21, -25, progW, 5, 2);
          projG.endFill();

          this.structuresContainer.addChild(projG);
        });
      }
    }

    // Ondas do Mar e Água Animada
    atualizarAgua(tempo) {
      this.waterContainer.removeChildren();
      const g = new PIXI.Graphics();

      // Espuma das ondas na costa do sul
      const onda = Math.sin(tempo * 0.003) * 6;
      const posMar = this.toScreen(0.38, 0.91);

      g.lineStyle(2.5, 0xffffff, 0.55 + Math.sin(tempo * 0.003) * 0.25);
      g.arc(posMar.x, posMar.y, 45 + onda, Math.PI * 0.15, Math.PI * 0.85);

      // Riacho de água doce descendo da cachoeira até o mar
      const posRio = this.toScreen(0.61, 0.45);
      g.lineStyle(1.8, 0x7dd3fc, 0.45);
      const corrente = (tempo * 0.05) % 30;
      g.moveTo(posRio.x - 10, posRio.y - 20 + corrente);
      g.lineTo(posRio.x + 8, posRio.y + 10 + corrente);

      this.waterContainer.addChild(g);
    }

    // Pássaros sobrevoando a Ilha
    atualizarPassaros(tempo) {
      this.birdsContainer.removeChildren();
      const g = new PIXI.Graphics();

      this.passaros.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > 1.1 || p.y < -0.1) {
          p.x = -0.05;
          p.y = 0.8 + Math.random() * 0.15;
        }

        const tela = this.toScreen(p.x, p.y);
        const flap = Math.sin(tempo * 0.015 + p.asa) * 4;

        g.lineStyle(1.6, 0xffffff, 0.85);
        g.moveTo(tela.x - 5, tela.y + flap);
        g.lineTo(tela.x, tela.y);
        g.lineTo(tela.x + 5, tela.y + flap);
      });

      this.birdsContainer.addChild(g);
    }

    // Personagens e Atores na Ilha
    atualizarPersonagem(ser, tempo) {
      const id = ser.id;
      let cont = this.actorContainers[id];

      if (!cont) {
        cont = new PIXI.Container();
        cont.name = 'ser_' + id;

        const aura = new PIXI.Graphics();
        aura.name = 'aura';
        cont.addChild(aura);

        const corpo = new PIXI.Graphics();
        corpo.name = 'corpo';
        cont.addChild(corpo);

        const tag = new PIXI.Container();
        tag.name = 'tag';
        cont.addChild(tag);

        const txtNome = new PIXI.Text(ser.nome || id, {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '700',
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 3
        });
        txtNome.anchor.set(0.5, 1);
        tag.addChild(txtNome);

        const txtAcao = new PIXI.Text('', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: 9.5,
          fontWeight: '600',
          fill: 0xfef08a,
          stroke: 0x000000,
          strokeThickness: 2.5
        });
        txtAcao.anchor.set(0.5, 0);
        txtAcao.name = 'txtAcao';
        tag.addChild(txtAcao);

        const balao = new PIXI.Container();
        balao.name = 'balao';
        cont.addChild(balao);

        cont.interactive = true;
        cont.cursor = 'pointer';
        cont.on('pointerdown', ev => {
          ev.stopPropagation();
          if (typeof window.abrirModalCortex === 'function') {
            window.abrirModalCortex(id);
          }
        });

        this.ySortContainer.addChild(cont);
        this.actorContainers[id] = cont;
      }

      // Alvo no mapa com roaming orgânico
      const info = LOCAIS_MAPA[ser.local] || LOCAIS_MAPA.acampamento;
      const alvo = this.toScreen(info.x, info.y);

      // Movimentação suave
      if (cont.x === 0 && cont.y === 0) {
        cont.x = alvo.x;
        cont.y = alvo.y;
      } else {
        const dx = alvo.x - cont.x;
        const dy = alvo.y - cont.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          cont.x += dx * 0.12;
          cont.y += dy * 0.12;
          cont.scale.x = dx < 0 ? -1 : 1;
        } else {
          cont.x = alvo.x;
          cont.y = alvo.y;
        }
      }

      cont.zIndex = Math.round(cont.y);

      const caminhando = Math.hypot(alvo.x - cont.x, alvo.y - cont.y) > 3;
      const corpo = cont.getChildByName('corpo');
      if (corpo) this.desenharPersonagem(corpo, id, ser.acao, caminhando, tempo);

      // Aura CORTEX
      const aura = cont.getChildByName('aura');
      if (aura) {
        aura.clear();
        const emocao = (ser.emocao || (ser.cortex && ser.cortex.emocao) || '').toLowerCase();
        let corAura = AURAS_EMOCAO.padrao;
        for (const [k, c] of Object.entries(AURAS_EMOCAO)) {
          if (emocao.includes(k)) { corAura = c; break; }
        }
        const pulso = Math.sin(tempo * 0.005) * 3;
        aura.beginFill(corAura, 0.32);
        aura.drawEllipse(0, 0, 16 + pulso, 8 + pulso * 0.5);
        aura.endFill();
      }

      // Tag de Nome e Ação
      const tag = cont.getChildByName('tag');
      if (tag) {
        tag.y = -42 * Math.max(0.75, this.box.scale);
        tag.scale.x = cont.scale.x < 0 ? -1 : 1;
        const txtAcao = tag.getChildByName('txtAcao');
        if (txtAcao) {
          const acaoBruta = (ser.acao || '').toLowerCase();
          const icone = ICONES_ACAO[acaoBruta] || '✨';
          txtAcao.text = icone + ' ' + (ser.acao || 'Livre');
        }
      }

      // Balão de fala expressivo
      const balao = cont.getChildByName('balao');
      const fala = ser.fala || ser.ultimaFala;
      if (balao) {
        balao.removeChildren();
        if (fala && typeof fala === 'string' && fala.trim().length > 0) {
          balao.scale.x = cont.scale.x < 0 ? -1 : 1;
          const txtFala = fala.length > 50 ? fala.slice(0, 47) + '...' : fala;
          const texto = new PIXI.Text('“' + txtFala + '”', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: 10,
            fill: 0x0f172a,
            wordWrap: true,
            wordWrapWidth: 120,
            align: 'center'
          });
          texto.anchor.set(0.5, 1);

          const bw = Math.max(60, texto.width + 12);
          const bh = texto.height + 8;
          const yTopo = -64;

          const fundo = new PIXI.Graphics();
          fundo.beginFill(0xffffff, 0.96);
          fundo.lineStyle(1.2, 0x0f172a, 1);
          fundo.drawRoundedRect(-bw / 2, yTopo - bh, bw, bh, 6);
          fundo.moveTo(-3, yTopo);
          fundo.lineTo(0, yTopo + 5);
          fundo.lineTo(3, yTopo);
          fundo.endFill();

          texto.y = yTopo - 4;
          balao.addChild(fundo);
          balao.addChild(texto);
        }
      }
    }

    // Atualização da Pantera das Sombras e do Tubarão
    atualizarCriaturas(estado, tempo) {
      if (!estado || !estado.mundo) return;
      const eco = estado.mundo.ecossistema || {};

      // 1. Pantera das Sombras
      const pred = eco.predador;
      if (pred && pred.status === 'vivo') {
        let pCont = this.actorContainers['pantera'];
        if (!pCont) {
          pCont = new PIXI.Container();
          pCont.name = 'ser_pantera';
          const g = new PIXI.Graphics();
          g.name = 'corpo';
          pCont.addChild(g);

          const tag = new PIXI.Text('🐾 Pantera das Sombras', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: 10,
            fontWeight: 'bold',
            fill: 0xf87171,
            stroke: 0x000000,
            strokeThickness: 3
          });
          tag.anchor.set(0.5, 1);
          tag.y = -30;
          tag.name = 'tag';
          pCont.addChild(tag);

          pCont.interactive = true;
          pCont.cursor = 'pointer';
          pCont.on('pointerdown', ev => {
            ev.stopPropagation();
            if (typeof window.abrirModalPredador === 'function') {
              window.abrirModalPredador();
            }
          });

          this.ySortContainer.addChild(pCont);
          this.actorContainers['pantera'] = pCont;
        }

        const locInfo = LOCAIS_MAPA[pred.local] || LOCAIS_MAPA.caverna;
        const alvo = this.toScreen(locInfo.x, locInfo.y);

        pCont.x += (alvo.x - pCont.x) * 0.08;
        pCont.y += (alvo.y - pCont.y) * 0.08;
        pCont.zIndex = Math.round(pCont.y);

        const corpo = pCont.getChildByName('corpo');
        if (corpo) this.desenharPredador(corpo, tempo);
      }

      // 2. Tubarão nos Recifes
      const tub = eco.tubarao;
      if (tub && tub.status === 'vivo') {
        let tCont = this.actorContainers['tubarao'];
        if (!tCont) {
          tCont = new PIXI.Container();
          tCont.name = 'ser_tubarao';
          const g = new PIXI.Graphics();
          g.name = 'corpo';
          tCont.addChild(g);

          const tag = new PIXI.Text('🦈 Tubarão-dos-Recifes', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: 9.5,
            fontWeight: 'bold',
            fill: 0x38bdf8,
            stroke: 0x000000,
            strokeThickness: 2.5
          });
          tag.anchor.set(0.5, 1);
          tag.y = -22;
          tCont.addChild(tag);

          this.ySortContainer.addChild(tCont);
          this.actorContainers['tubarao'] = tCont;
        }

        this.tubaraoAngulo += 0.008;
        const raioPatrulha = 55 * this.box.scale;
        const centroMar = this.toScreen(0.40, 0.90);

        tCont.x = centroMar.x + Math.cos(this.tubaraoAngulo) * raioPatrulha;
        tCont.y = centroMar.y + Math.sin(this.tubaraoAngulo) * (raioPatrulha * 0.4);
        tCont.zIndex = Math.round(tCont.y);

        const corpo = tCont.getChildByName('corpo');
        if (corpo) this.desenharTubarao(corpo, tempo);
      }
    }

    // Fogueira Viva Central com Chamas e Fagulhas
    atualizarFogueira(tempo) {
      this.campfireContainer.removeChildren();
      const pos = this.toScreen(LOCAIS_MAPA.fogueira.x, LOCAIS_MAPA.fogueira.y);

      const fogueiraCont = new PIXI.Container();
      fogueiraCont.x = pos.x;
      fogueiraCont.y = pos.y;

      const fogo = new PIXI.Graphics();
      const osc = Math.sin(tempo * 0.012) * 3;
      const osc2 = Math.cos(tempo * 0.016) * 2;

      // Toras na base da fogueira
      fogo.beginFill(0x451a03);
      fogo.drawRoundedRect(-12, -3, 24, 6, 2);
      fogo.drawRoundedRect(-4, -5, 8, 10, 2);

      // Chamas
      fogo.beginFill(0xf97316, 0.85);
      fogo.drawEllipse(0, -9 + osc, 8 + osc2, 13 + osc);
      fogo.beginFill(0xfde047, 0.95);
      fogo.drawEllipse(0, -7 + osc, 4 + osc2 * 0.5, 8 + osc * 0.7);
      fogo.beginFill(0xffffff, 0.9);
      fogo.drawCircle(0, -5 + osc, 2.5);
      fogo.endFill();
      fogueiraCont.addChild(fogo);

      // Fagulhas subindo
      if (Math.random() < 0.35) {
        this.faiscas.push({
          x: pos.x + (Math.random() - 0.5) * 10,
          y: pos.y - 8,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.9 - Math.random() * 1.2,
          alpha: 1,
          vida: 30 + Math.random() * 20
        });
      }

      const gFaiscas = new PIXI.Graphics();
      for (let i = this.faiscas.length - 1; i >= 0; i--) {
        const p = this.faiscas[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;
        p.vida--;
        if (p.vida <= 0 || p.alpha <= 0) {
          this.faiscas.splice(i, 1);
        } else {
          gFaiscas.beginFill(0xfbbf24, p.alpha);
          gFaiscas.drawCircle(p.x, p.y, 1.2);
          gFaiscas.endFill();
        }
      }

      this.campfireContainer.addChild(fogueiraCont);
      this.campfireContainer.addChild(gFaiscas);
    }

    // Iluminação e Clima Sazonal
    atualizarIluminacao(estadoMundo, tempo) {
      this.lightingOverlay.clear();
      this.weatherOverlay.clear();
      if (!estadoMundo || !estadoMundo.mundo) return;

      const periodo = (estadoMundo.mundo.tempo && estadoMundo.mundo.tempo.periodo) || 'manha';
      const clima = (estadoMundo.mundo.clima || '').toLowerCase();
      const estacao = (estadoMundo.mundo.tempo && estadoMundo.mundo.tempo.estacao) || 'chuvas';
      const w = this.app.renderer.width;
      const h = this.app.renderer.height;

      let corLuz = 0x000000;
      let alphaLuz = 0;

      if (periodo === 'manha') {
        corLuz = 0xfef08a;
        alphaLuz = 0.02;
      } else if (periodo === 'tarde') {
        corLuz = 0xf97316; // Entardecer dourado
        alphaLuz = 0.16;
      } else if (periodo === 'noite' || periodo === 'madrugada') {
        corLuz = 0x040e24; // Noite azul-marinho
        alphaLuz = 0.65;
      }

      if (clima.includes('chuva') || clima.includes('tempestade')) {
        corLuz = 0x0b192c;
        alphaLuz = Math.max(alphaLuz, 0.38);
      }

      if (alphaLuz > 0) {
        this.lightingOverlay.beginFill(corLuz, alphaLuz);
        this.lightingOverlay.drawRect(0, 0, w, h);
        this.lightingOverlay.endFill();

        // Raio de luz da fogueira à noite
        if (periodo === 'noite' || periodo === 'madrugada') {
          const posFog = this.toScreen(LOCAIS_MAPA.fogueira.x, LOCAIS_MAPA.fogueira.y);
          const pulso = Math.sin(tempo * 0.006) * 6;
          const raioMax = (90 + pulso) * this.box.scale;

          this.lightingOverlay.beginFill(0xfbbf24, 0.22);
          this.lightingOverlay.drawCircle(posFog.x, posFog.y, raioMax);
          this.lightingOverlay.beginFill(0xfef08a, 0.38);
          this.lightingOverlay.drawCircle(posFog.x, posFog.y, raioMax * 0.45);
          this.lightingOverlay.endFill();
        }
      }

      // Efeito de Chuva em 30 FPS econômico
      if (clima.includes('chuva') || clima.includes('tempestade')) {
        this.weatherOverlay.lineStyle(1.1, 0xbae6fd, 0.55);
        for (let i = 0; i < 40; i++) {
          const rx = ((i * 53 + tempo * 0.45) % w);
          const ry = ((i * 79 + tempo * 0.9) % h);
          this.weatherOverlay.moveTo(rx, ry);
          this.weatherOverlay.lineTo(rx - 3, ry + 11);
        }
      } else {
        // Partículas do vento da estação (Folhas douradas ou pétalas de primavera)
        let corParticula = estacao === 'transicao_seca' ? 0xd97706 : (estacao === 'chuvas' ? 0x16a34a : 0xf472b6);
        this.weatherOverlay.lineStyle(0);
        this.folhasVento.forEach(f => {
          f.x += f.vx;
          f.y += f.vy;
          if (f.x > 1) f.x = 0;
          if (f.y > 1) f.y = 0;
          const p = this.toScreen(f.x, f.y);
          this.weatherOverlay.beginFill(corParticula, 0.65);
          this.weatherOverlay.drawEllipse(p.x, p.y, f.tamanho, f.tamanho * 0.5);
          this.weatherOverlay.endFill();
        });
      }
    }

    // Atualização da Câmera com interpolação suave (Lerp)
    atualizarCamera() {
      if (this.camera.followId) {
        let alvoCont = this.actorContainers[this.camera.followId];
        let targetX = 0.5, targetY = 0.5;

        if (alvoCont) {
          targetX = alvoCont.x;
          targetY = alvoCont.y;
        } else if (LOCAIS_MAPA[this.camera.followId]) {
          const pos = this.toScreen(LOCAIS_MAPA[this.camera.followId].x, LOCAIS_MAPA[this.camera.followId].y);
          targetX = pos.x;
          targetY = pos.y;
        }

        const viewW = this.app.renderer.width / this.app.renderer.resolution;
        const viewH = this.app.renderer.height / this.app.renderer.resolution;

        this.camera.targetX = (viewW / 2) - targetX * this.camera.targetZoom;
        this.camera.targetY = (viewH / 2) - targetY * this.camera.targetZoom;
      }

      // Lerp suave
      this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.12;
      this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
      this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;

      this.cameraContainer.scale.set(this.camera.zoom);
      this.cameraContainer.x = this.camera.x;
      this.cameraContainer.y = this.camera.y;
    }

    mostrarTooltip(id, nome, ev) {
      const tooltip = document.getElementById('tooltip');
      if (!tooltip) return;

      const estado = window.stateData || (typeof stateData !== 'undefined' ? stateData : null);
      const presentes = (estado && estado.seres)
        ? Object.values(estado.seres).filter(s => s.status !== 'morto' && s.local === id).map(s => s.nome || s.id)
        : [];

      tooltip.style.display = 'block';
      tooltip.style.left = (ev.data.global.x + 14) + 'px';
      tooltip.style.top = (ev.data.global.y + 14) + 'px';
      tooltip.innerHTML = '<div style="font-weight:700;color:#fde047;font-size:13px;">' + nome + '</div>'
        + (presentes.length ? '<div style="font-size:12px;color:#e2e8f0;margin-top:2px;">Presentes: ' + presentes.join(', ') + '</div>' : '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Ninguém aqui no momento</div>')
        + '<div style="font-size:10px;color:#38bdf8;margin-top:4px;">(Clique para ver interior / detalhes)</div>';
    }

    esconderTooltip() {
      const tooltip = document.getElementById('tooltip');
      if (tooltip) tooltip.style.display = 'none';
    }

    tick() {
      if (!this.carregado) return;
      const tempo = performance.now();
      const estado = window.stateData || (typeof stateData !== 'undefined' ? stateData : null);

      this.atualizarCamera();

      if (estado && estado.seres) {
        const vivos = Object.values(estado.seres).filter(s => s.status !== 'morto');
        vivos.forEach(ser => this.atualizarPersonagem(ser, tempo));

        Object.entries(estado.seres).forEach(([id, ser]) => {
          if (ser.status === 'morto' && this.actorContainers[id]) {
            this.actorContainers[id].destroy();
            delete this.actorContainers[id];
          }
        });
      }

      this.atualizarCriaturas(estado, tempo);
      this.atualizarAgua(tempo);
      this.atualizarPassaros(tempo);
      this.atualizarEstruturas(estado, tempo);
      this.atualizarFogueira(tempo);
      this.atualizarIluminacao(estado, tempo);
      this.atualizarHotspots();
    }
  }

  // Inicialização no DOM
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pixi-game') || document.getElementById('game');
    if (canvas) {
      window.motorPixi = new MotorPixiIlha(canvas);
      console.log('[PIXI] Motor Evertrail Profissional 2.5D ativo!');
    }
  });

})();

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
    ilha_vizinha: { x: 0.080, y: 0.820, nome: 'Ilha Vizinha' },
    floresta_densa: { x: 0.810, y: 0.280, nome: 'Floresta Densa & Misteriosa' },
    ruinas_antigas: { x: 0.920, y: 0.160, nome: 'Ruínas Antigas' },
    santuario_fe:   { x: 0.620, y: 0.080, nome: 'Santuário da Fé e Esperança' }
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
    observar: '👁️', explorar: '🧭', caçar: '🏹',
    explorar_desconhecido: '🧭', erguer_estrutura: '🏛️', momento_de_fe: '🙏'
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
        camStartX: 0, camStartY: 0,
        modoDiretor: false, // Câmera livre por padrão (Visão geral 100% limpa)
        ultimoTrocaDiretor: 0,
        indiceDiretor: 0
      };

      // Partículas e Efeitos
      this.faiscas = [];
      this.folhasVento = [];
      this.passaros = [];
      this.ondasOceano = [];
      this.lightningFlash = 0;
      this.proximoRelampago = 0;
      
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
      const w = Math.max(320, rect.width || window.innerWidth || 360);
      const h = Math.max(320, rect.height || Math.round(window.innerHeight * 0.6) || 480);

      this.app = new PIXI.Application({
        view: this.canvas,
        width: w,
        height: h,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        backgroundColor: 0x082b45,
        antialias: false, // Máxima economia de GPU e bateria no chipset ARM do Z Fold
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
      this.graphicsMar = new PIXI.Graphics();
      this.graphicsCachoeira = new PIXI.Graphics();
      this.waterContainer.addChild(this.graphicsMar);
      this.waterContainer.addChild(this.graphicsCachoeira);
      this.cameraContainer.addChild(this.waterContainer);

      // 2.5 Árvores Interativas e Vegetação com Wind Sway
      this.treesContainer = new PIXI.Container();
      this.cameraContainer.addChild(this.treesContainer);

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

      if (typeof window !== 'undefined' && window.MotorSpritesIlha) {
        window.MotorSpritesIlha.inicializar();
      }

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
      let touchDistanceInicial = 0;
      let zoomInicial = 1;

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

      // Suporte a Touch / Pinch-to-zoom e Drag para Samsung Galaxy Z Fold
      el.addEventListener('touchstart', ev => {
        if (ev.touches.length === 1) {
          const t = ev.touches[0];
          this.camera.isDragging = true;
          this.camera.dragStartX = t.clientX;
          this.camera.dragStartY = t.clientY;
          this.camera.camStartX = this.camera.targetX;
          this.camera.camStartY = this.camera.targetY;
        } else if (ev.touches.length === 2) {
          this.camera.isDragging = false;
          const dx = ev.touches[0].clientX - ev.touches[1].clientX;
          const dy = ev.touches[0].clientY - ev.touches[1].clientY;
          touchDistanceInicial = Math.hypot(dx, dy);
          zoomInicial = this.camera.targetZoom;
        }
      }, { passive: true });

      el.addEventListener('touchmove', ev => {
        if (ev.touches.length === 1 && this.camera.isDragging) {
          const t = ev.touches[0];
          const dx = t.clientX - this.camera.dragStartX;
          const dy = t.clientY - this.camera.dragStartY;
          if (Math.hypot(dx, dy) > 3) {
            this.camera.targetX = this.camera.camStartX + dx;
            this.camera.targetY = this.camera.camStartY + dy;
            this.camera.followId = null;
          }
        } else if (ev.touches.length === 2 && touchDistanceInicial > 0) {
          const dx = ev.touches[0].clientX - ev.touches[1].clientX;
          const dy = ev.touches[0].clientY - ev.touches[1].clientY;
          const distAtual = Math.hypot(dx, dy);
          const ratio = distAtual / touchDistanceInicial;
          this.camera.targetZoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, zoomInicial * ratio));
          this.camera.followId = null;
        }
      }, { passive: true });

      el.addEventListener('touchend', ev => {
        if (ev.touches.length === 0) {
          this.camera.isDragging = false;
          touchDistanceInicial = 0;
        } else if (ev.touches.length === 1) {
          const t = ev.touches[0];
          this.camera.isDragging = true;
          this.camera.dragStartX = t.clientX;
          this.camera.dragStartY = t.clientY;
          this.camera.camStartX = this.camera.targetX;
          this.camera.camStartY = this.camera.targetY;
        }
      }, { passive: true });

      // Pan com mouse
      el.addEventListener('pointerdown', ev => {
        if (ev.pointerType === 'mouse' && ev.button === 0) {
          this.camera.isDragging = true;
          this.camera.dragStartX = ev.clientX;
          this.camera.dragStartY = ev.clientY;
          this.camera.camStartX = this.camera.targetX;
          this.camera.camStartY = this.camera.targetY;
        }
      });

      window.addEventListener('pointermove', ev => {
        if (ev.pointerType === 'mouse' && this.camera.isDragging) {
          const dx = ev.clientX - this.camera.dragStartX;
          const dy = ev.clientY - this.camera.dragStartY;
          if (Math.hypot(dx, dy) > 4) {
            this.camera.targetX = this.camera.camStartX + dx;
            this.camera.targetY = this.camera.camStartY + dy;
            this.camera.followId = null;
          }
        }
      });

      window.addEventListener('pointerup', ev => {
        if (ev.pointerType === 'mouse') this.camera.isDragging = false;
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
      this.camera.modoDiretor = false;
      if (typeof window.atualizarStatusDiretorUI === 'function') window.atualizarStatusDiretorUI(false);
    }

    focarAlvo(id) {
      this.camera.followId = id;
      this.camera.targetZoom = 1.75; // Zoom cinematográfico aproximado
      this.camera.modoDiretor = false; // Foco manual desliga modo diretor temporariamente
      if (typeof window.atualizarStatusDiretorUI === 'function') window.atualizarStatusDiretorUI(false);
    }

    toggleModoDiretor() {
      this.camera.modoDiretor = !this.camera.modoDiretor;
      if (this.camera.modoDiretor) {
        this.camera.ultimoTrocaDiretor = 0;
      }
      if (typeof window.atualizarStatusDiretorUI === 'function') window.atualizarStatusDiretorUI(this.camera.modoDiretor);
      return this.camera.modoDiretor;
    }

    // Navegação Direta por Zonas de Expansão (Pilar 4)
    mudarZona(zonaId) {
      const zonas = (typeof window !== 'undefined' && window.ZONAS_MUNDO) ? window.ZONAS_MUNDO : {};
      const zona = zonas[zonaId] || zonas.ilha_central;
      if (!zona) return;

      this.camera.followId = null;
      this.camera.modoDiretor = false;
      if (typeof window.atualizarStatusDiretorUI === 'function') window.atualizarStatusDiretorUI(false);

      if (zonaId === 'ilha_central') {
        this.resetCamera();
        return;
      }

      const pos = this.toScreen(zona.centro.x, zona.centro.y);
      const viewW = this.app.renderer.width / this.app.renderer.resolution;
      const viewH = this.app.renderer.height / this.app.renderer.resolution;

      this.camera.targetZoom = zona.zoomPadrao;
      this.camera.targetX = (viewW / 2) - pos.x * zona.zoomPadrao;
      this.camera.targetY = (viewH / 2) - pos.y * zona.zoomPadrao;
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

    async instalarArtwork() {
      // O mapa mapa-ilha-evertrail.png já possui arte isométrica completa.
      return;
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

    // Renderização dos Habitantes com Sprites HD (Stardew Valley / RimWorld)
    // PROIBIÇÃO DE BONEQUINHOS COM PIXI.Graphics (CÍRCULOS/ELIPSES)
    desenharPersonagem(g, serId, acaoAtual, caminhando, tempo) {
      if (g && typeof g.clear === 'function') g.clear();
    }

    // Renderização da Pantera das Sombras com Sprite HD Anatômico
    // PROIBIÇÃO DE PREDADOR COMO BOLA PRETA COM OLHOS
    desenharPredador(g, tempo) {
      if (g && typeof g.clear === 'function') g.clear();
    }

    // Renderização do Tubarão com Sprite HD Hidrodinâmico
    desenharTubarao(g, tempo) {
      if (g && typeof g.clear === 'function') g.clear();
    }

    // Estruturas Dinâmicas: Horta, Curral, Arena, Jangada e Obras
    atualizarEstruturas(estado, tempo) {
      this.structuresContainer.removeChildren();
      if (!estado || !estado.mundo) return;
      const eco = estado.mundo.ecossistema || {};
      const cache = (window.MotorSpritesIlha && window.MotorSpritesIlha.cacheSvg) || {};

      // 1. Fazenda e Canteiros Agrícolas Vivos com 4 Estágios Reais (Terra arada, Brotos, Madura com Cenouras, Colhida)
      const posFaz = this.toScreen(LOCAIS_MAPA.fazenda.x, LOCAIS_MAPA.fazenda.y);
      if (typeof window !== 'undefined' && window.MotorSpritesIlha) {
        window.MotorSpritesIlha.atualizarHortaProps(this.structuresContainer, eco, posFaz, this.box.scale);
      }

      // 2. Curral de Animais (Sprite Isométrico com Cabras e Galinhas)
      const posCur = this.toScreen(LOCAIS_MAPA.curral.x, LOCAIS_MAPA.curral.y);
      if (cache.curral) {
        const sprCurral = new PIXI.Sprite(cache.curral);
        sprCurral.anchor.set(0.5, 0.6);
        sprCurral.x = posCur.x;
        sprCurral.y = posCur.y;
        sprCurral.scale.set(0.85 * this.box.scale);
        this.structuresContainer.addChild(sprCurral);
      }

      // 3. Jangada Rústica ancorada no cais (Sprite Isométrico com Ondulação da Maré)
      const posCais = this.toScreen(LOCAIS_MAPA.barco.x, LOCAIS_MAPA.barco.y);
      if (cache.barco) {
        const sprBarco = new PIXI.Sprite(cache.barco);
        sprBarco.anchor.set(0.5, 0.5);
        sprBarco.x = posCais.x + 8;
        sprBarco.y = posCais.y + 12 + Math.sin(tempo * 0.005) * 2;
        sprBarco.rotation = Math.sin(tempo * 0.003) * 0.04;
        sprBarco.scale.set(0.85 * this.box.scale);
        this.structuresContainer.addChild(sprBarco);
      }

      // 4. Arena de Lutas em terra firme (Sprite Isométrico de Ringue com Tochas)
      const posArena = this.toScreen(LOCAIS_MAPA.arena.x, LOCAIS_MAPA.arena.y);
      if (cache.arena) {
        const sprArena = new PIXI.Sprite(cache.arena);
        sprArena.anchor.set(0.5, 0.5);
        sprArena.x = posArena.x;
        sprArena.y = posArena.y;
        sprArena.scale.set(0.88 * this.box.scale);
        this.structuresContainer.addChild(sprArena);
      }

      // 5. Obras e Projetos Ativos da Comunidade
      if (Array.isArray(eco.projetos)) {
        eco.projetos.filter(p => !p.concluido).forEach(proj => {
          const loc = LOCAIS_MAPA[proj.local];
          if (!loc) return;
          const posP = this.toScreen(loc.x, loc.y);

          if (cache.construcao_obras) {
            const sprObra = new PIXI.Sprite(cache.construcao_obras);
            sprObra.anchor.set(0.5, 0.7);
            sprObra.x = posP.x;
            sprObra.y = posP.y;
            sprObra.scale.set(0.8 * this.box.scale);
            this.structuresContainer.addChild(sprObra);
          }

          // Barra de progresso do projeto
          const barraCont = new PIXI.Container();
          barraCont.x = posP.x;
          barraCont.y = posP.y - 28 * this.box.scale;
          const bgBarra = new PIXI.Graphics();
          bgBarra.beginFill(0x0f172a, 0.9);
          bgBarra.drawRoundedRect(-22, -4, 44, 7, 3);
          const progW = Math.max(2, (proj.progresso / 100) * 42);
          bgBarra.beginFill(0x38bdf8);
          bgBarra.drawRoundedRect(-21, -3, progW, 5, 2);
          bgBarra.endFill();
          barraCont.addChild(bgBarra);
          this.structuresContainer.addChild(barraCont);
        });
      }
    }

    // Ondas do Mar e Água Animada (Tidal foam & waterfall spray)
    atualizarAgua(tempo) {
      if (typeof window !== 'undefined' && window.MotorSpritesIlha && this.graphicsMar && this.graphicsCachoeira) {
        window.MotorSpritesIlha.atualizarAguaViva(
          this.graphicsMar,
          this.graphicsCachoeira,
          tempo,
          this.box,
          (x, y) => this.toScreen(x, y)
        );
      }
    }

    // Árvores e Vegetação Interativas com Balanço Orgânico de Vento (Wind Sway)
    atualizarArvores(estado, tempo) {
      if (!this.treesContainer) return;
      const clima = (estado && estado.mundo && estado.mundo.clima) || '';
      const ehTempestade = clima.toLowerCase().includes('tempestade');
      if (typeof window !== 'undefined' && window.MotorSpritesIlha) {
        window.MotorSpritesIlha.atualizarArvoresProps(
          this.treesContainer,
          tempo,
          ehTempestade ? 1.0 : 0.35,
          (x, y) => this.toScreen(x, y)
        );
      }
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

        const corpo = new PIXI.Sprite();
        corpo.name = 'corpo';
        corpo.anchor.set(0.5, 0.9);
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
      let corpo = cont.getChildByName('corpo');
      if (!corpo || !(corpo instanceof PIXI.Sprite)) {
        if (corpo) cont.removeChild(corpo);
        corpo = new PIXI.Sprite();
        corpo.name = 'corpo';
        corpo.anchor.set(0.5, 0.9);
        cont.addChildAt(corpo, 1);
      }
      if (typeof window !== 'undefined' && window.MotorSpritesIlha) {
        const tex = window.MotorSpritesIlha.obterTexturaHabitante(id, ser.acao, caminhando, tempo);
        if (tex) {
          corpo.texture = tex;
          const s = 0.65 * Math.max(0.85, this.box.scale);
          corpo.scale.set(s, s);
        }
      }

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

    // Atualização da Pantera das Sombras e do Tubarão (Sprites HD Anatômicos)
    atualizarCriaturas(estado, tempo) {
      if (!estado || !estado.mundo) return;
      const eco = estado.mundo.ecossistema || {};

      // 1. Pantera das Sombras (Sprite Felino Muscular Animado)
      const pred = eco.predador;
      if (pred && pred.status === 'vivo') {
        let pCont = this.actorContainers['pantera'];
        if (!pCont) {
          pCont = new PIXI.Container();
          pCont.name = 'ser_pantera';
          const spr = new PIXI.Sprite();
          spr.name = 'corpo';
          spr.anchor.set(0.5, 0.7);
          pCont.addChild(spr);

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

        const dx = alvo.x - pCont.x;
        if (Math.abs(dx) > 1) {
          pCont.scale.x = dx < 0 ? -1 : 1;
        }

        pCont.x += (alvo.x - pCont.x) * 0.08;
        pCont.y += (alvo.y - pCont.y) * 0.08;
        pCont.zIndex = Math.round(pCont.y);

        let corpo = pCont.getChildByName('corpo');
        if (!corpo || !(corpo instanceof PIXI.Sprite)) {
          if (corpo) pCont.removeChild(corpo);
          corpo = new PIXI.Sprite();
          corpo.name = 'corpo';
          corpo.anchor.set(0.5, 0.7);
          pCont.addChild(corpo);
        }
        if (typeof window !== 'undefined' && window.MotorSpritesIlha) {
          const tex = window.MotorSpritesIlha.obterTexturaPantera(tempo);
          if (tex) {
            corpo.texture = tex;
            const s = 0.68 * Math.max(0.85, this.box.scale);
            corpo.scale.set(s, s);
          }
        }
      }

      // 2. Tubarão nos Recifes (Sprite Hidrodinâmico com Cauda Animada)
      const tub = eco.tubarao;
      if (tub && tub.status === 'vivo') {
        let tCont = this.actorContainers['tubarao'];
        if (!tCont) {
          tCont = new PIXI.Container();
          tCont.name = 'ser_tubarao';
          const spr = new PIXI.Sprite();
          spr.name = 'corpo';
          spr.anchor.set(0.5, 0.5);
          tCont.addChild(spr);

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

        let corpo = tCont.getChildByName('corpo');
        if (!corpo || !(corpo instanceof PIXI.Sprite)) {
          if (corpo) tCont.removeChild(corpo);
          corpo = new PIXI.Sprite();
          corpo.name = 'corpo';
          corpo.anchor.set(0.5, 0.5);
          tCont.addChild(corpo);
        }
        if (typeof window !== 'undefined' && window.MotorSpritesIlha) {
          const tex = window.MotorSpritesIlha.obterTexturaTubarao(tempo);
          if (tex) {
            corpo.texture = tex;
            const s = 0.72 * this.box.scale;
            corpo.scale.set(s, s);
            corpo.rotation = this.tubaraoAngulo + Math.PI / 2;
          }
        }
      }
    }

    // Fogueira Viva Central com Chamas e Fagulhas (3 Estágios Reais)
    atualizarFogueira(tempo) {
      this.campfireContainer.removeChildren();
      const pos = this.toScreen(LOCAIS_MAPA.fogueira.x, LOCAIS_MAPA.fogueira.y);

      const estado = window.stateData || (typeof stateData !== 'undefined' ? stateData : null);
      const lenha = (estado && estado.mundo && estado.mundo.ecossistema && estado.mundo.ecossistema.recursos && estado.mundo.ecossistema.recursos.lenha) || 15;
      const clima = (estado && estado.mundo && estado.mundo.clima) || 'normal';

      if (typeof window !== 'undefined' && window.MotorSpritesIlha) {
        window.MotorSpritesIlha.atualizarFogueiraProps(this.campfireContainer, lenha, clima, pos, this.box.scale, tempo);
      }

      // Fagulhas subindo organicamente
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

      this.campfireContainer.addChild(gFaiscas);
    }

    // Iluminação 2.5D Suave & Clima (sem manchas opacas sobre o mapa)
    atualizarIluminacao(estadoMundo, tempo) {
      this.lightingOverlay.clear();
      this.weatherOverlay.clear();
      if (!estadoMundo || !estadoMundo.mundo) return;

      const periodo = (estadoMundo.mundo.tempo && estadoMundo.mundo.tempo.periodo) || 'manha';
      const clima = (estadoMundo.mundo.clima || '').toLowerCase();
      const estacao = (estadoMundo.mundo.tempo && estadoMundo.mundo.tempo.estacao) || 'chuvas';
      const ehTempestade = clima.includes('tempestade');
      const ehChuvoso = clima.includes('chuva') || ehTempestade;

      const minX = this.box.x - 400;
      const minY = this.box.y - 400;
      const areaW = this.box.w + 800;
      const areaH = this.box.h + 800;

      let corLuz = 0x000000;
      let alphaLuz = 0;

      if (periodo === 'manha') {
        corLuz = 0xfef08a;
        alphaLuz = 0;
      } else if (periodo === 'tarde') {
        corLuz = 0xf97316; // Entardecer dourado sutil
        alphaLuz = 0.04;
      } else if (periodo === 'noite' || periodo === 'madrugada') {
        corLuz = 0x051329; // Noite azulada suave
        alphaLuz = 0.25;
      }

      if (ehChuvoso) {
        corLuz = 0x071b2e;
        alphaLuz = Math.min(0.18, alphaLuz + (ehTempestade ? 0.08 : 0.04));
      }

      // 1. Atmosfera transparente e suave (mapa sempre perfeitamente visível)
      if (alphaLuz > 0) {
        this.lightingOverlay.beginFill(corLuz, alphaLuz);
        this.lightingOverlay.drawRect(minX, minY, areaW, areaH);
        this.lightingOverlay.endFill();
      }

      // 2. Fogueira Viva Central (Aura de calor suave e orgânica)
      const posFog = this.toScreen(LOCAIS_MAPA.fogueira.x, LOCAIS_MAPA.fogueira.y);
      const flicker = Math.sin(tempo * 0.008) * 3;
      const raioBase = (48 + flicker) * this.box.scale;
      this.lightingOverlay.beginFill(0xf97316, 0.06);
      this.lightingOverlay.drawCircle(posFog.x, posFog.y, raioBase * 1.3);
      this.lightingOverlay.beginFill(0xfbbf24, 0.09);
      this.lightingOverlay.drawCircle(posFog.x, posFog.y, raioBase * 0.65);
      this.lightingOverlay.endFill();

      // 3. Tochas e Lanternas dos Personagens (apenas se noite ou tempestade)
      if (estadoMundo && estadoMundo.seres && (periodo === 'noite' || periodo === 'madrugada')) {
        Object.values(estadoMundo.seres).forEach(ser => {
          if (ser.status !== 'morto' && this.actorContainers[ser.id]) {
            const cont = this.actorContainers[ser.id];
            const raioTocha = 36 * this.box.scale;
            this.lightingOverlay.beginFill(0xfef08a, 0.12);
            this.lightingOverlay.drawCircle(cont.x, cont.y, raioTocha);
            this.lightingOverlay.endFill();
          }
        });
      }

      // 4. Relâmpago Estocástico durante Tempestade
      if (ehTempestade) {
        if (!this.proximoRelampago) {
          this.proximoRelampago = tempo + 4000 + Math.random() * 8000;
        }
        if (tempo >= this.proximoRelampago) {
          this.lightningFlash = 0.85; // Flash iluminando toda a ilha
          this.proximoRelampago = tempo + 7000 + Math.random() * 11000;
        }
        if (this.lightningFlash > 0) {
          this.lightingOverlay.beginFill(0xe0f2fe, this.lightningFlash);
          this.lightingOverlay.drawRect(minX, minY, areaW, areaH);
          this.lightingOverlay.endFill();
          this.lightningFlash -= 0.055; // Fade out suave
          if (this.lightningFlash < 0) this.lightningFlash = 0;
        }
      } else {
        this.lightningFlash = 0;
      }

      // 4.5 Intervenção do Público / Coluna de Luz Dourada
      if (this.milagreAtivo && this.milagreAtivo.alpha > 0) {
        this.lightingOverlay.beginFill(0xfbbf24, this.milagreAtivo.alpha * 0.45);
        this.lightingOverlay.drawCircle(posFog.x, posFog.y, 180 * this.box.scale);
        this.lightingOverlay.beginFill(0xffffff, this.milagreAtivo.alpha * 0.75);
        this.lightingOverlay.drawRect(posFog.x - 24 * this.box.scale, minY, 48 * this.box.scale, areaH);
        this.lightingOverlay.endFill();
        this.milagreAtivo.alpha -= 0.015;
      }

      // 5. Chuva com Inclinação e Partículas de Clima
      if (ehChuvoso) {
        const velChuva = ehTempestade ? 1.4 : 0.85;
        const qtdLinhas = ehTempestade ? 65 : 35;
        this.weatherOverlay.lineStyle(ehTempestade ? 1.4 : 1.0, 0xbae6fd, ehTempestade ? 0.65 : 0.45);
        for (let i = 0; i < qtdLinhas; i++) {
          const rx = minX + ((i * 59 + tempo * 0.65 * velChuva) % areaW);
          const ry = minY + ((i * 83 + tempo * 1.15 * velChuva) % areaH);
          this.weatherOverlay.moveTo(rx, ry);
          this.weatherOverlay.lineTo(rx - (ehTempestade ? 6 : 3), ry + (ehTempestade ? 15 : 10));
        }
      } else {
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

    // Atualização da Câmera (com Câmera Diretora Automática e Lerp Suave)
    atualizarCamera() {
      // 1. Câmera Diretora Automática
      if (this.camera.modoDiretor && !this.camera.isDragging) {
        const agora = performance.now();
        if (agora - this.camera.ultimoTrocaDiretor > 9500 || !this.camera.followId) {
          this.camera.ultimoTrocaDiretor = agora;
          const estado = window.stateData || (typeof stateData !== 'undefined' ? stateData : null);
          if (estado && estado.seres) {
            const vivos = Object.values(estado.seres).filter(s => s.status !== 'morto');
            if (vivos.length > 0) {
              const cicloAtual = (estado.mundo && estado.mundo.tempo && estado.mundo.tempo.ciclo) || 0;
              const falando = vivos.find(s => s.ultimaFalaCiclo && (cicloAtual - s.ultimaFalaCiclo <= 3));
              const acaoDestaque = vivos.find(s => ['beber', 'explorar', 'lutar', 'desafiar_luta', 'afugentar_fera', 'construir'].includes(s.acao));
              const serAlvo = falando || acaoDestaque || vivos[this.camera.indiceDiretor % vivos.length];
              this.camera.indiceDiretor++;
              if (serAlvo) {
                this.camera.followId = serAlvo.id;
                this.camera.targetZoom = 1.70;
              }
            }
          }
        }
      }

      // 2. Cálculo do ponto alvo
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

      // 3. Atualiza Legenda Cinematográfica e Vinheta de Tensão / Batimento Cardíaco
      const elCaption = document.getElementById('cinematic-caption');
      const elTension = document.getElementById('tension-vignette');
      const estado = window.stateData || (typeof stateData !== 'undefined' ? stateData : null);
      if (this.camera.followId && estado && estado.seres && estado.seres[this.camera.followId]) {
        const serFoco = estado.seres[this.camera.followId];
        const nec = serFoco.necessidades || {};
        const saude = Number(nec.saude ?? 100);
        const energia = Number(nec.energia ?? 100);
        const sobTensao = saude < 25 || energia < 25;

        if (elTension) {
          elTension.style.display = sobTensao ? 'block' : 'none';
        }

        if (elCaption) {
          const nomeSer = serFoco.nome || this.camera.followId.toUpperCase();
          const fala = serFoco.ultimaFala || '';
          const acao = serFoco.acao || 'observando';
          const motivo = (serFoco.ultimaDecisao && serFoco.ultimaDecisao.motivo) || serFoco.motivo || '';
          
          let textoLegenda = `<span style="color:#38bdf8;font-weight:700;">[ ${nomeSer} ]</span> `;
          if (fala) {
            textoLegenda += `<span style="color:#fef08a;">"${fala}"</span>`;
          } else if (motivo) {
            textoLegenda += `<span style="font-style:italic;color:#cbd5e1;">(${motivo})</span>`;
          } else {
            textoLegenda += `<span style="color:#94a3b8;">Em atividade: ${acao}</span>`;
          }
          if (sobTensao) {
            textoLegenda += ` <span style="color:#ef4444;font-weight:800;">[⚠️ TENSÃO CRÍTICA: Saúde ${Math.round(saude)}% | Energia ${Math.round(energia)}%]</span>`;
          }
          elCaption.innerHTML = textoLegenda;
          elCaption.style.display = 'block';
        }
      } else {
        if (elCaption) elCaption.style.display = 'none';
        if (elTension) elTension.style.display = 'none';
      }
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
      this.atualizarArvores(estado, tempo);
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

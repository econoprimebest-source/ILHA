/**
 * motor-pixi-ilha.js — Renderizador 2.5D Isométrico "Evertrail Tribe" para a Ilha Aurora
 * Baseado em PixiJS v7:
 * - Sprites de pixel art isométricos (Kenney CC0 landscape/buildings + Clint Bellanger CC-BY/CC0 personagens)
 * - Profundidade com Y-Sorting real (Z-index baseado na base dos pés e tronco das árvores)
 * - Iluminação dinâmica Dia/Noite (aurora matinal, tarde âmbar, noite profunda com fogueira brilhante)
 * - Otimização com cache de texturas do terreno (cacheAsBitmap) e limite de 30 FPS para mobile (Z-Fold)
 * - Auras de emoção CORTEX e balões de fala flutuantes
 * - Suporte a predadores soltos no mundo
 */
(function() {
  'use strict';

  if (typeof PIXI === 'undefined') {
    console.error('[PIXI] PixiJS não encontrado! Verifique a inclusão de /pixi.min.js');
    return;
  }

  // Configurações globais de pixel art e performance
  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
  PIXI.Ticker.shared.maxFPS = 30; // 30 FPS cravados para economizar bateria no Z-Fold / Mobile

  const ASSETS = {
    // Casas e Construções Isométricas
    casa_icaro: '/assets/isometric/buildings/PNG/buildingTiles_002.png',
    casa_joao: '/assets/isometric/buildings/PNG/buildingTiles_014.png',
    casa_maria: '/assets/isometric/buildings/PNG/buildingTiles_027.png',
    fogueira: '/assets/isometric/buildings/PNG/buildingTiles_000.png',
    barco: '/assets/isometric/buildings/PNG/buildingTiles_038.png',
    cais: '/assets/isometric/buildings/PNG/buildingTiles_039.png',
    caverna: '/assets/isometric/landscape/PNG/landscapeTiles_109.png',
    arena: '/assets/isometric/buildings/PNG/buildingTiles_023.png',
    fazenda: '/assets/isometric/buildings/PNG/buildingTiles_015.png',
    
    // Árvores isométricas (Kenney CC0)
    arvores: [
      '/assets/isometric/landscape/PNG/landscapeTiles_005.png',
      '/assets/isometric/landscape/PNG/landscapeTiles_008.png',
      '/assets/isometric/landscape/PNG/landscapeTiles_036.png',
      '/assets/isometric/landscape/PNG/landscapeTiles_098.png',
      '/assets/isometric/landscape/PNG/landscapeTiles_115.png'
    ],

    // Rochas
    rochas: [
      '/assets/isometric/landscape/PNG/landscapeTiles_012.png',
      '/assets/isometric/landscape/PNG/landscapeTiles_017.png',
      '/assets/isometric/landscape/PNG/landscapeTiles_120.png'
    ],

    // Chão / Terreno isométrico
    grama: '/assets/isometric/landscape/PNG/landscapeTiles_000.png',
    grama_flor: '/assets/isometric/landscape/PNG/landscapeTiles_001.png',
    terra: '/assets/isometric/landscape/PNG/landscapeTiles_019.png',
    agua: '/assets/isometric/landscape/PNG/landscapeTiles_027.png',

    // Personagens
    chars: {
      icaro: '/assets/isometric/characters/male_unarmored.png',
      joao: '/assets/isometric/characters/male_light.png',
      maria: '/assets/isometric/characters/magician.png',
      lara: '/assets/isometric/characters/magician.png',
      predador: '/assets/isometric/characters/werewolf.png'
    }
  };

  const NOS_FALLBACK = {
    casa_icaro: { x: .213, y: .493, nome: 'Casa do Ícaro' },
    casa_joao: { x: .477, y: .197, nome: 'Casa do João' },
    casa_maria: { x: .855, y: .568, nome: 'Casa da Maria' },
    acampamento: { x: .450, y: .505, nome: 'Acampamento' },
    fogueira: { x: .492, y: .476, nome: 'Fogueira' },
    arena: { x: .560, y: .390, nome: 'Arena de Lutas' },
    bosque: { x: .310, y: .310, nome: 'Bosque' },
    floresta: { x: .800, y: .290, nome: 'Floresta' },
    rio: { x: .695, y: .580, nome: 'Rio' },
    cachoeira: { x: .655, y: .090, nome: 'Cachoeira' },
    fazenda: { x: .948, y: .561, nome: 'Fazenda' },
    mar: { x: .360, y: .910, nome: 'Mar' },
    barco: { x: .487, y: .860, nome: 'Cais do barco' },
    caverna: { x: .925, y: .175, nome: 'Caverna Sombria' },
    ilha_vizinha: { x: .075, y: .815, nome: 'Ilha Vizinha' }
  };

  const AURAS_EMOCAO = {
    raiva: 0xef4444,
    confronto: 0xef4444,
    medo: 0x3b82f6,
    frio: 0x38bdf8,
    afeto: 0xf472b6,
    romance: 0xf472b6,
    satisfacao: 0x10b981,
    paz: 0x34d399,
    padrao: 0xfbbf24
  };

  const CORES_SER = {
    icaro: 0xfbbf24,
    joao: 0x38bdf8,
    maria: 0xf472b6,
    lara: 0xa855f7
  };

  class MotorPixiIlha {
    constructor(canvasElement) {
      this.canvas = canvasElement;
      this.containerStage = document.getElementById('map-stage') || document.body;
      this.app = null;
      this.texturas = {};
      this.foliageSprites = [];
      this.buildingSprites = {};
      this.actorSprites = {};
      this.predadorSprites = {};
      this.baloesFala = {};
      this.box = { x: 0, y: 0, w: 1000, h: 700, scale: 1 };
      this.carregado = false;
      this.initPixi();
    }

    initPixi() {
      const rect = this.containerStage.getBoundingClientRect();
      const w = Math.max(800, rect.width || 1000);
      const h = Math.max(500, rect.height || 650);

      this.app = new PIXI.Application({
        view: this.canvas,
        width: w,
        height: h,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        backgroundColor: 0x071827,
        antialias: false,
        powerPreference: 'low-power'
      });

      // Camadas em Profundidade 2.5D
      this.rootContainer = new PIXI.Container();
      this.app.stage.addChild(this.rootContainer);

      // 1. Chão (Base / Terreno) - Cacheado como Bitmap para economia de bateria
      this.groundContainer = new PIXI.Container();
      this.rootContainer.addChild(this.groundContainer);

      // 2. Trilhas e Caminhos
      this.pathsGraphics = new PIXI.Graphics();
      this.rootContainer.addChild(this.pathsGraphics);

      // 3. Mundo Isométrico (Y-Sorting para árvores, casas, personagens e predadores)
      this.ySortContainer = new PIXI.Container();
      this.ySortContainer.sortableChildren = true;
      this.rootContainer.addChild(this.ySortContainer);

      // 4. Overlays UI do Mundo (Auras, Balões, Barras)
      this.uiContainer = new PIXI.Container();
      this.uiContainer.sortableChildren = true;
      this.rootContainer.addChild(this.uiContainer);

      // 5. Camada de Iluminação Dia/Noite & Clima
      this.lightingContainer = new PIXI.Container();
      this.rootContainer.addChild(this.lightingContainer);

      this.lightingOverlay = new PIXI.Graphics();
      this.lightingContainer.addChild(this.lightingOverlay);

      this.weatherOverlay = new PIXI.Graphics();
      this.lightingContainer.addChild(this.weatherOverlay);

      // Carrega texturas e monta o cenário
      this.carregarAssets();

      // Hook no redimensionamento da janela
      window.addEventListener('resize', () => this.onResize());

      // Ticker a 30 FPS para mobile leve
      this.app.ticker.add((delta) => this.update(delta));
    }

    onResize() {
      if (!this.containerStage || !this.app) return;
      const rect = this.containerStage.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(240, rect.height);
      this.app.renderer.resize(w, h);
      this.recalcularBox();
      this.atualizarPosicoesEstaticas();
    }

    recalcularBox() {
      const w = this.app.renderer.width / this.app.renderer.resolution;
      const h = this.app.renderer.height / this.app.renderer.resolution;
      const aspect = 1536 / 1024;
      let bw, bh, bx, by, scale;

      if (w / h > aspect) {
        bh = h;
        bw = h * aspect;
        by = 0;
        bx = (w - bw) / 2;
        scale = bh / 1024;
      } else {
        bw = w;
        bh = w / aspect;
        bx = 0;
        by = (h - bh) / 2;
        scale = bw / 1536;
      }
      this.box = { x: bx, y: by, w: bw, h: bh, scale };
    }

    toScreen(normX, normY) {
      return {
        x: this.box.x + this.box.w * normX,
        y: this.box.y + this.box.h * normY
      };
    }

    carregarAssets() {
      const urls = [
        ASSETS.casa_icaro, ASSETS.casa_joao, ASSETS.casa_maria,
        ASSETS.fogueira, ASSETS.barco, ASSETS.cais, ASSETS.caverna,
        ASSETS.arena, ASSETS.fazenda,
        ...ASSETS.arvores, ...ASSETS.rochas,
        ASSETS.grama, ASSETS.grama_flor, ASSETS.terra, ASSETS.agua,
        ASSETS.chars.icaro, ASSETS.chars.joao, ASSETS.chars.maria,
        ASSETS.chars.lara, ASSETS.chars.predador
      ];

      let restantes = urls.length;
      const onAssetLoaded = () => {
        restantes--;
        if (restantes <= 0) {
          this.carregado = true;
          this.construirCenario();
        }
      };

      urls.forEach(url => {
        PIXI.Assets.load(url).then(tex => {
          this.texturas[url] = tex;
          onAssetLoaded();
        }).catch(err => {
          console.warn('[PIXI] Falha ao carregar textura:', url, err);
          onAssetLoaded();
        });
      });
    }

    construirCenario() {
      this.recalcularBox();
      this.construirTerrenoBase();
      this.construirConstrucoes();
      this.construirVegetacaoBosqueEFloresta();
      this.construirFogueira();
    }

    // 1. CHÃO COM CACHE DE TEXTURA (Otimização PixiJS para Mobile)
    construirTerrenoBase() {
      this.groundContainer.removeChildren();
      const texGrama = this.texturas[ASSETS.grama];
      const texGramaFlor = this.texturas[ASSETS.grama_flor];
      const texTerra = this.texturas[ASSETS.terra];

      // Desenha o fundo da Ilha com mar profundo suave
      const bg = new PIXI.Graphics();
      bg.beginFill(0x0e4d75);
      bg.drawRect(0, 0, 3000, 2000);
      bg.endFill();
      this.groundContainer.addChild(bg);

      // Fundo pintado oficial da Ilha como piso base com alta fidelidade geográfica
      const mapaImg = new Image();
      mapaImg.src = '/mapa-ilha-nova.png';
      mapaImg.onload = () => {
        const texMapa = PIXI.Texture.from(mapaImg);
        const mapSprite = new PIXI.Sprite(texMapa);
        mapSprite.x = this.box.x;
        mapSprite.y = this.box.y;
        mapSprite.width = this.box.w;
        mapSprite.height = this.box.h;
        mapSprite.name = 'mapa_base';
        this.groundContainer.addChildAt(mapSprite, 1);

        // Espalha tiles isométricos nas bordas para acabamento 2.5D
        if (texGrama) this.espalharTilesIsometricos(texGrama, texGramaFlor, texTerra);

        // Cacheia como bitmap para consumo zero de GPU a cada frame!
        this.groundContainer.cacheAsBitmap = true;
      };
      mapaImg.onerror = () => {
        if (texGrama) this.espalharTilesIsometricos(texGrama, texGramaFlor, texTerra);
        this.groundContainer.cacheAsBitmap = true;
      };
    }

    espalharTilesIsometricos(texGrama, texFlor, texTerra) {
      const pontosGrama = [
        { x: .46, y: .49 }, { x: .48, y: .52 }, { x: .32, y: .34 },
        { x: .78, y: .32 }, { x: .91, y: .58 }, { x: .23, y: .47 },
        { x: .52, y: .44 }, { x: .62, y: .50 }
      ];

      pontosGrama.forEach((p, idx) => {
        const pos = this.toScreen(p.x, p.y);
        const spr = new PIXI.Sprite(idx % 2 === 0 ? texGrama : (texFlor || texGrama));
        spr.anchor.set(0.5, 0.5);
        spr.scale.set(this.box.scale * 0.7);
        spr.x = pos.x;
        spr.y = pos.y;
        spr.alpha = 0.55;
        this.groundContainer.addChild(spr);
      });
    }

    // 2. CONSTRUÇÕES ISOMÉTRICAS (Y-SORTING)
    construirConstrucoes() {
      const estruturas = [
        { id: 'casa_icaro', tex: ASSETS.casa_icaro, x: .213, y: .493, scale: 1.15, nome: 'Casa do Ícaro' },
        { id: 'casa_joao', tex: ASSETS.casa_joao, x: .477, y: .197, scale: 1.15, nome: 'Casa do João' },
        { id: 'casa_maria', tex: ASSETS.casa_maria, x: .855, y: .568, scale: 1.15, nome: 'Casa da Maria' },
        { id: 'caverna', tex: ASSETS.caverna, x: .925, y: .175, scale: 1.35, nome: 'Caverna Sombria' },
        { id: 'arena', tex: ASSETS.arena, x: .560, y: .390, scale: 1.0, nome: 'Arena de Lutas' },
        { id: 'fazenda', tex: ASSETS.fazenda, x: .948, y: .561, scale: 1.05, nome: 'Horta da Fazenda' },
        { id: 'barco', tex: ASSETS.barco, x: .487, y: .860, scale: 1.1, nome: 'Cais do Barco' }
      ];

      estruturas.forEach(est => {
        const tex = this.texturas[est.tex];
        if (!tex) return;

        const cont = new PIXI.Container();
        const pos = this.toScreen(est.x, est.y);
        cont.x = pos.x;
        cont.y = pos.y;

        // Sombra da construção no chão
        const sombra = new PIXI.Graphics();
        sombra.beginFill(0x000000, 0.35);
        sombra.drawEllipse(0, 4, 38 * est.scale * this.box.scale, 16 * est.scale * this.box.scale);
        sombra.endFill();
        cont.addChild(sombra);

        // Sprite 2.5D Isométrico
        const spr = new PIXI.Sprite(tex);
        spr.anchor.set(0.5, 0.88);
        spr.scale.set(this.box.scale * est.scale);
        cont.addChild(spr);

        // Plaquinha / Tag com o nome
        const txtNome = new PIXI.Text(est.nome, {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: Math.max(10, 11 * this.box.scale),
          fontWeight: '700',
          fill: 0xffffff,
          stroke: 0x071827,
          strokeThickness: 3,
          align: 'center'
        });
        txtNome.anchor.set(0.5, 0);
        txtNome.y = 8 * this.box.scale;
        cont.addChild(txtNome);

        // Profundidade: Y-index na base
        cont.zIndex = Math.round(pos.y);
        cont.interactive = true;
        cont.cursor = 'pointer';

        cont.on('pointerdown', () => {
          if (typeof window.abrirPainelLocal === 'function') {
            window.abrirPainelLocal(est.id);
          }
        });

        cont.on('pointerover', (ev) => {
          const tooltip = document.getElementById('tooltip');
          if (!tooltip) return;
          const estData = window.stateData || (typeof stateData !== 'undefined' ? stateData : null);
          const presentes = (estData && estData.seres)
            ? Object.values(estData.seres).filter(s => s.status !== 'morto' && s.local === est.id).map(s => s.nome || s.id)
            : [];
          tooltip.style.display = 'block';
          tooltip.style.left = (ev.data.global.x + 15) + 'px';
          tooltip.style.top = (ev.data.global.y + 15) + 'px';
          tooltip.innerHTML = '<b>' + est.nome + '</b>' + (presentes.length ? '<br>Presentes: ' + presentes.join(', ') : '<br><i>Ninguém aqui agora</i>');
        });

        cont.on('pointerout', () => {
          const tooltip = document.getElementById('tooltip');
          if (tooltip) tooltip.style.display = 'none';
        });

        this.ySortContainer.addChild(cont);
        this.buildingSprites[est.id] = cont;
      });
    }

    // 3. VEGETAÇÃO ISOMÉTRICA (Árvores no Bosque e Floresta com Profundidade Real)
    construirVegetacaoBosqueEFloresta() {
      this.foliageSprites.forEach(s => s.destroy());
      this.foliageSprites = [];

      const arvoresBosque = [
        { x: .28, y: .27 }, { x: .31, y: .25 }, { x: .34, y: .28 },
        { x: .29, y: .32 }, { x: .33, y: .33 }, { x: .26, y: .35 },
        { x: .35, y: .36 }, { x: .30, y: .38 }, { x: .36, y: .24 }
      ];

      const arvoresFloresta = [
        { x: .77, y: .24 }, { x: .81, y: .22 }, { x: .84, y: .25 },
        { x: .75, y: .28 }, { x: .79, y: .27 }, { x: .83, y: .29 },
        { x: .78, y: .33 }, { x: .82, y: .34 }, { x: .86, y: .31 },
        { x: .73, y: .25 }, { x: .87, y: .26 }, { x: .85, y: .35 }
      ];

      const todasArvores = [
        ...arvoresBosque.map(p => ({ ...p, tipo: 'bosque' })),
        ...arvoresFloresta.map(p => ({ ...p, tipo: 'floresta' }))
      ];

      todasArvores.forEach((p, i) => {
        const texUrl = ASSETS.arvores[i % ASSETS.arvores.length];
        const tex = this.texturas[texUrl];
        if (!tex) return;

        const cont = new PIXI.Container();
        const pos = this.toScreen(p.x, p.y);
        cont.x = pos.x;
        cont.y = pos.y;

        // Sombra suave sob a árvore
        const sombra = new PIXI.Graphics();
        sombra.beginFill(0x000000, 0.3);
        sombra.drawEllipse(0, 0, 22 * this.box.scale, 9 * this.box.scale);
        sombra.endFill();
        cont.addChild(sombra);

        // Árvore isométrica
        const spr = new PIXI.Sprite(tex);
        spr.anchor.set(0.5, 0.90);
        const escalaVar = 0.9 + (i % 3) * 0.15;
        spr.scale.set(this.box.scale * escalaVar);
        cont.addChild(spr);

        // Profundidade Z-Index na base do tronco:
        cont.zIndex = Math.round(pos.y);

        this.ySortContainer.addChild(cont);
        this.foliageSprites.push(cont);
      });
    }

    // Fogueira do Acampamento (Iluminação e Chamas)
    construirFogueira() {
      const tex = this.texturas[ASSETS.fogueira];
      if (!tex) return;

      const cont = new PIXI.Container();
      const pos = this.toScreen(0.492, 0.476);
      cont.x = pos.x;
      cont.y = pos.y;

      const sombra = new PIXI.Graphics();
      sombra.beginFill(0x000000, 0.4);
      sombra.drawEllipse(0, 2, 24 * this.box.scale, 10 * this.box.scale);
      sombra.endFill();
      cont.addChild(sombra);

      const spr = new PIXI.Sprite(tex);
      spr.anchor.set(0.5, 0.75);
      spr.scale.set(this.box.scale * 1.1);
      cont.addChild(spr);

      const chama = new PIXI.Graphics();
      chama.name = 'chama';
      cont.addChild(chama);

      cont.zIndex = Math.round(pos.y);
      this.ySortContainer.addChild(cont);
      this.buildingSprites['fogueira'] = cont;
    }

    atualizarPosicoesEstaticas() {
      const estruturas = [
        { id: 'casa_icaro', x: .213, y: .493 },
        { id: 'casa_joao', x: .477, y: .197 },
        { id: 'casa_maria', x: .855, y: .568 },
        { id: 'caverna', x: .925, y: .175 },
        { id: 'arena', x: .560, y: .390 },
        { id: 'fazenda', x: .948, y: .561 },
        { id: 'barco', x: .487, y: .860 },
        { id: 'fogueira', x: .492, y: .476 }
      ];

      estruturas.forEach(est => {
        const cont = this.buildingSprites[est.id];
        if (cont) {
          const pos = this.toScreen(est.x, est.y);
          cont.x = pos.x;
          cont.y = pos.y;
          cont.zIndex = Math.round(pos.y);
        }
      });
    }

    // 4. PERSONAGENS COM PROFUNDIDADE, SOMBRAS E AURAS CORTEX
    atualizarPersonagem(ser, posNorm, estadoMundo) {
      const id = ser.id;
      let cont = this.actorSprites[id];

      if (!cont) {
        cont = new PIXI.Container();
        cont.name = 'actor_' + id;

        // Aura de emoção CORTEX (círculo pulsante no chão)
        const aura = new PIXI.Graphics();
        aura.name = 'aura';
        cont.addChild(aura);

        // Sombra simples no chão sob o personagem
        const sombra = new PIXI.Graphics();
        sombra.name = 'sombra';
        sombra.beginFill(0x000000, 0.4);
        sombra.drawEllipse(0, 0, 18, 7);
        sombra.endFill();
        cont.addChild(sombra);

        // Sprite 2.5D do personagem (frame 128x128 da spritesheet Flare/Clint)
        const texUrl = ASSETS.chars[id] || ASSETS.chars.icaro;
        const baseTex = this.texturas[texUrl];

        let spriteTex = baseTex;
        if (baseTex && baseTex.width >= 128 && baseTex.height >= 128) {
          spriteTex = new PIXI.Texture(baseTex.baseTexture, new PIXI.Rectangle(0, 0, 128, 128));
        }

        const spr = new PIXI.Sprite(spriteTex);
        spr.name = 'sprite';
        spr.anchor.set(0.5, 0.90);
        spr.scale.set(this.box.scale * 0.55);

        // Identidade visual / Tint de cor
        if (id === 'maria') spr.tint = 0xffc2d4;
        if (id === 'lara') spr.tint = 0xe0c4ff;
        if (id === 'icaro') spr.tint = 0xfff0b3;
        if (id === 'joao') spr.tint = 0xccebff;

        cont.addChild(spr);

        // Tag com Nome
        const txtNome = new PIXI.Text(ser.nome || id, {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '700',
          fill: CORES_SER[id] || 0xffffff,
          stroke: 0x000000,
          strokeThickness: 3
        });
        txtNome.name = 'tag_nome';
        txtNome.anchor.set(0.5, 0);
        txtNome.y = 4;
        cont.addChild(txtNome);

        // Micro-barras flutuantes de necessidades
        const barras = new PIXI.Graphics();
        barras.name = 'barras';
        cont.addChild(barras);

        // Balão de fala flutuante
        const balaoCont = new PIXI.Container();
        balaoCont.name = 'balao_fala';
        cont.addChild(balaoCont);

        // Interatividade: clique abre o CORTEX
        cont.interactive = true;
        cont.cursor = 'pointer';
        cont.on('pointerdown', (ev) => {
          ev.stopPropagation();
          if (typeof window.abrirModalCortex === 'function') {
            window.abrirModalCortex(id);
          }
        });

        cont.on('pointerover', (ev) => {
          const tooltip = document.getElementById('tooltip');
          if (!tooltip) return;
          const emocao = ser.emocao || (ser.cortex && ser.cortex.emocao) || 'Neutro';
          const acao = ser.acao || 'Livre';
          tooltip.style.display = 'block';
          tooltip.style.left = (ev.data.global.x + 15) + 'px';
          tooltip.style.top = (ev.data.global.y + 15) + 'px';
          tooltip.innerHTML = '<b>' + (ser.nome || id) + '</b> (' + (ser.status || 'vivo') + ')<br>'
            + 'Ação: ' + acao + '<br>'
            + 'Sentimento CORTEX: ' + emocao + '<br>'
            + '<span style="font-size:11px;color:#cbd5e1;">(Clique para inspecionar fluxo mental)</span>';
        });

        cont.on('pointerout', () => {
          const tooltip = document.getElementById('tooltip');
          if (tooltip) tooltip.style.display = 'none';
        });

        this.ySortContainer.addChild(cont);
        this.actorSprites[id] = cont;
      }

      // Converte coordenadas normalizadas em tela
      const posTela = this.toScreen(posNorm.x, posNorm.y);
      cont.x = posTela.x;
      cont.y = posTela.y;

      // PROFUNDIDADE REAL (Z-INDEX):
      // A base Y do personagem define se ele fica atrás ou na frente de árvores e casas!
      cont.zIndex = Math.round(posTela.y);

      // Animação de respiração / passos (bobbing)
      const spr = cont.getChildByName('sprite');
      if (spr) {
        const tempo = performance.now();
        const caminhando = ser.acao && (ser.acao.startsWith('ir_') || ser.acao === 'continuar');
        const freq = caminhando ? 0.015 : 0.003;
        const amp = caminhando ? 3 : 1;
        spr.y = -Math.abs(Math.sin(tempo * freq)) * amp;
      }

      // Aura de Emoção baseada no CORTEX
      const aura = cont.getChildByName('aura');
      if (aura) {
        aura.clear();
        const emocao = (ser.emocao || (ser.cortex && ser.cortex.emocao) || '').toLowerCase();
        let corAura = AURAS_EMOCAO.padrao;
        for (const [k, c] of Object.entries(AURAS_EMOCAO)) {
          if (emocao.includes(k)) { corAura = c; break; }
        }
        const t = performance.now() * 0.004;
        const raio = 16 + Math.sin(t) * 3;
        aura.beginFill(corAura, 0.35);
        aura.drawEllipse(0, 0, raio, raio * 0.5);
        aura.endFill();
      }

      // Micro-barras de Necessidades (Saúde, Água, Alimento)
      const barras = cont.getChildByName('barras');
      if (barras && ser.necessidades) {
        barras.clear();
        const saude = Math.max(0, Math.min(100, ser.necessidades.saude ?? 100));
        const agua = Math.max(0, Math.min(100, 100 - (ser.necessidades.agua ?? 0)));
        const comida = Math.max(0, Math.min(100, 100 - (ser.necessidades.alimento ?? 0)));

        const wBarra = 24;
        const hBarra = 3;
        const yBase = -58;

        barras.beginFill(0x000000, 0.6);
        barras.drawRect(-wBarra/2 - 1, yBase - 1, wBarra + 2, hBarra * 3 + 4);
        barras.endFill();

        barras.beginFill(saude < 25 ? 0xef4444 : 0x22c55e);
        barras.drawRect(-wBarra/2, yBase, (saude / 100) * wBarra, hBarra);

        barras.beginFill(0x38bdf8);
        barras.drawRect(-wBarra/2, yBase + hBarra + 1, (agua / 100) * wBarra, hBarra);

        barras.beginFill(0xfb923c);
        barras.drawRect(-wBarra/2, yBase + (hBarra + 1) * 2, (comida / 100) * wBarra, hBarra);
        barras.endFill();
      }

      // Balão de fala flutuante
      const balaoCont = cont.getChildByName('balao_fala');
      const fala = ser.fala || ser.ultimaFala;
      if (balaoCont) {
        balaoCont.removeChildren();
        if (fala && typeof fala === 'string' && fala.trim().length > 0) {
          const txt = fala.length > 55 ? fala.slice(0, 52) + '...' : fala;
          const label = new PIXI.Text('“' + txt + '”', {
            fontFamily: 'Segoe UI, system-ui, sans-serif',
            fontSize: 11,
            fill: 0x0f172a,
            wordWrap: true,
            wordWrapWidth: 140,
            align: 'center'
          });
          label.anchor.set(0.5, 1);

          const bw = Math.max(70, label.width + 16);
          const bh = label.height + 12;

          const bgBalao = new PIXI.Graphics();
          bgBalao.beginFill(0xffffff, 0.95);
          bgBalao.lineStyle(1.5, 0x1e293b, 1);
          bgBalao.drawRoundedRect(-bw/2, -75 - bh, bw, bh, 8);
          bgBalao.moveTo(-4, -75);
          bgBalao.lineTo(0, -68);
          bgBalao.lineTo(4, -75);
          bgBalao.endFill();

          label.y = -75 - 6;

          balaoCont.addChild(bgBalao);
          balaoCont.addChild(label);
        }
      }
    }

    // 5. PREDADORES SOLTOS NO MUNDO
    atualizarPredadores(estado) {
      if (!this.carregado) return;
      const acontecimentos = (estado && estado.mundo && Array.isArray(estado.mundo.acontecimentos))
        ? estado.mundo.acontecimentos.filter(a => a && a.tipo === 'predador' && a.ativo !== false)
        : [];

      const idsAtivos = new Set();
      acontecimentos.forEach(ac => {
        const idPred = 'predador_' + (ac.id || 'lobo');
        idsAtivos.add(idPred);
        let cont = this.predadorSprites[idPred];

        if (!cont) {
          cont = new PIXI.Container();
          cont.name = idPred;

          // Aura vermelha de perigo / predador
          const aura = new PIXI.Graphics();
          aura.name = 'aura';
          aura.beginFill(0xef4444, 0.35);
          aura.drawEllipse(0, 0, 24, 12);
          aura.endFill();
          cont.addChild(aura);

          // Sombra
          const sombra = new PIXI.Graphics();
          sombra.beginFill(0x000000, 0.45);
          sombra.drawEllipse(0, 2, 20, 8);
          sombra.endFill();
          cont.addChild(sombra);

          // Sprite Werewolf / Lobo
          const baseTex = this.texturas[ASSETS.chars.predador];
          let sprTex = baseTex;
          if (baseTex && baseTex.width >= 128 && baseTex.height >= 128) {
            sprTex = new PIXI.Texture(baseTex.baseTexture, new PIXI.Rectangle(0, 0, 128, 128));
          }
          const spr = new PIXI.Sprite(sprTex);
          spr.name = 'sprite';
          spr.anchor.set(0.5, 0.88);
          spr.scale.set(this.box.scale * 0.6);
          spr.tint = 0xff8888;
          cont.addChild(spr);

          const txt = new PIXI.Text('🐺 Predador', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: 11,
            fontWeight: '700',
            fill: 0xf87171,
            stroke: 0x450a0a,
            strokeThickness: 3
          });
          txt.anchor.set(0.5, 0);
          txt.y = 4;
          cont.addChild(txt);

          this.ySortContainer.addChild(cont);
          this.predadorSprites[idPred] = cont;
        }

        const local = ac.no || (Array.isArray(ac.locais) && ac.locais[0]) || 'floresta';
        const pNorm = NOS_FALLBACK[local] || { x: 0.8, y: 0.3 };
        const pos = this.toScreen(pNorm.x, pNorm.y);
        cont.x = pos.x + 18;
        cont.y = pos.y + 12;
        cont.zIndex = Math.round(cont.y);

        const spr = cont.getChildByName('sprite');
        if (spr) {
          spr.y = -Math.abs(Math.sin(performance.now() * 0.008)) * 2;
        }
      });

      for (const [id, cont] of Object.entries(this.predadorSprites)) {
        if (!idsAtivos.has(id)) {
          cont.destroy();
          delete this.predadorSprites[id];
        }
      }
    }

    // 6. ILUMINAÇÃO DINÂMICA DIA/NOITE & CLIMA
    atualizarIluminacaoEClima(estadoMundo) {
      if (!estadoMundo || !estadoMundo.mundo) return;
      const tempo = estadoMundo.mundo.tempo || {};
      const clima = (estadoMundo.mundo.clima || '').toLowerCase();
      const periodo = tempo.periodo || 'manha';
      const w = this.app.renderer.width;
      const h = this.app.renderer.height;

      this.lightingOverlay.clear();

      let corLuz = 0x000000;
      let alphaLuz = 0;

      if (periodo === 'manha') {
        corLuz = 0xfffbeb;
        alphaLuz = 0.04;
      } else if (periodo === 'tarde') {
        corLuz = 0xf97316; // Âmbar do pôr do sol
        alphaLuz = 0.16;
      } else if (periodo === 'noite' || periodo === 'madrugada') {
        corLuz = 0x07112c; // Azul escuro profundo
        alphaLuz = 0.65;
      }

      if (clima.includes('chuva') || clima.includes('tempestade')) {
        corLuz = 0x0f172a;
        alphaLuz = Math.max(alphaLuz, 0.35);
      }

      if (alphaLuz > 0) {
        this.lightingOverlay.beginFill(corLuz, alphaLuz);
        this.lightingOverlay.drawRect(0, 0, w, h);
        this.lightingOverlay.endFill();

        // Se for noite, abre círculo de luz dourada na Fogueira
        if (periodo === 'noite' || periodo === 'madrugada') {
          const fogPos = this.toScreen(0.492, 0.476);
          const t = performance.now() * 0.005;
          const raioFogo = 75 + Math.sin(t) * 6;

          this.lightingOverlay.beginFill(0xfbbf24, 0.22);
          this.lightingOverlay.drawCircle(fogPos.x, fogPos.y, raioFogo);
          this.lightingOverlay.beginFill(0xfef08a, 0.35);
          this.lightingOverlay.drawCircle(fogPos.x, fogPos.y, raioFogo * 0.45);
          this.lightingOverlay.endFill();
        }
      }

      // Efeito de Chuva / Tempestade em 30 FPS leve
      this.weatherOverlay.clear();
      if (clima.includes('chuva') || clima.includes('tempestade')) {
        this.weatherOverlay.lineStyle(1.2, 0xbae6fd, 0.55);
        const agora = performance.now();
        for (let i = 0; i < 45; i++) {
          const rx = ((i * 47 + agora * 0.4) % w);
          const ry = ((i * 83 + agora * 0.8) % h);
          this.weatherOverlay.moveTo(rx, ry);
          this.weatherOverlay.lineTo(rx - 4, ry + 12);
        }
      }

      // Animação da chama da fogueira
      const fog = this.buildingSprites['fogueira'];
      if (fog) {
        const chama = fog.getChildByName('chama');
        if (chama) {
          chama.clear();
          const t = performance.now() * 0.008;
          const fl = Math.sin(t) * 3;
          chama.beginFill(0xf97316, 0.85);
          chama.drawEllipse(0, -6 + fl, 6, 10 + fl);
          chama.beginFill(0xfde047, 0.95);
          chama.drawEllipse(0, -4 + fl, 3, 6);
          chama.endFill();
        }
      }
    }

    update(delta) {
      if (!this.carregado) return;

      const estado = window.stateData || (typeof stateData !== 'undefined' ? stateData : null);
      if (!estado || !estado.seres) return;

      const seres = Object.values(estado.seres);
      seres.forEach(ser => {
        if (ser.status === 'morto') {
          if (this.actorSprites[ser.id]) {
            this.actorSprites[ser.id].destroy();
            delete this.actorSprites[ser.id];
          }
          return;
        }

        let posNorm = { x: 0.5, y: 0.5 };
        if (typeof animatedActors !== 'undefined' && animatedActors[ser.id]) {
          const a = animatedActors[ser.id];
          posNorm.x = (a.x - this.box.x) / (this.box.w || 1);
          posNorm.y = (a.y - this.box.y) / (this.box.h || 1);
        } else if (NOS_FALLBACK[ser.local]) {
          posNorm = NOS_FALLBACK[ser.local];
        }

        this.atualizarPersonagem(ser, posNorm, estado);
      });

      this.atualizarPredadores(estado);
      this.atualizarIluminacaoEClima(estado);
    }
  }

  // Inicializa quando a página carregar
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pixi-game') || document.getElementById('game');
    if (canvas) {
      window.motorPixi = new MotorPixiIlha(canvas);
      console.log('[PIXI] Motor 2.5D Isométrico "Evertrail Tribe" ativado com sucesso!');
    }
  });

})();

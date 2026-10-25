/**
 * motor-pixi-ilha.js — Motor 2.5D Isométrico Puro "Evertrail Tribe" para a Ilha Aurora
 * 
 * Implementação 100% Isométrica em PixiJS:
 * 1. Chão construído exclusivamente com tiles isométricos Kenney (grama, terra batida, areia, oceano).
 *    Fundo 2D antigo completamente desligado.
 * 2. Construções texturizadas com madeira e palha (Kenney Medieval), com escala reduzida em ~50%.
 * 3. Personagens estilizados aumentados em ~30% (proporção humana harmoniosa com a vila).
 * 4. Z-Index / Y-Sorting real: Caverna, floresta, casas e personagens organizados pela base do solo.
 * 5. Fogueira animada, ciclo de iluminação Dia/Noite com halo quente e clima de tempestade leve em 30 FPS.
 */
(function() {
  'use strict';

  if (typeof PIXI === 'undefined') {
    console.error('[PIXI] PixiJS não encontrado! Verifique a inclusão de /pixi.min.js');
    return;
  }

  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
  PIXI.Ticker.shared.maxFPS = 30; // 30 FPS cravados para economia de bateria no Z-Fold

  // Texturas Oficiais do Pacote Kenney Isométrico
  const TILES = {
    grama: '/assets/isometric/landscape/PNG/landscapeTiles_000.png',
    grama_flor: '/assets/isometric/landscape/PNG/landscapeTiles_001.png',
    terra: '/assets/isometric/landscape/PNG/landscapeTiles_019.png',
    agua: '/assets/isometric/landscape/PNG/landscapeTiles_027.png',
    
    // Árvores isométricas Kenney
    arvore_bosque: '/assets/isometric/landscape/PNG/landscapeTiles_005.png',
    arvore_pinho: '/assets/isometric/landscape/PNG/landscapeTiles_008.png',
    arvore_floresta: '/assets/isometric/landscape/PNG/landscapeTiles_036.png',
    arvore_alta: '/assets/isometric/landscape/PNG/landscapeTiles_098.png',
    
    // Rochas / Caverna
    rocha_grande: '/assets/isometric/landscape/PNG/landscapeTiles_012.png',
    rocha_caverna: '/assets/isometric/landscape/PNG/landscapeTiles_017.png',

    // Construções Medievais Texturizadas (Madeira e Palha)
    casa_icaro: '/assets/isometric/medieval/PNG/Retina/Structure/medievalStructure_17.png', // Cabana de madeira com teto de palha
    casa_joao: '/assets/isometric/medieval/PNG/Retina/Structure/medievalStructure_18.png',  // Cabana de toras com chaminé
    casa_maria: '/assets/isometric/medieval/PNG/Retina/Structure/medievalStructure_20.png', // Casa de madeira com base de pedra
    cais: '/assets/isometric/medieval/PNG/Retina/Structure/medievalStructure_21.png',       // Cais de tábuas de madeira
    fazenda: '/assets/isometric/medieval/PNG/Retina/Environment/medievalEnvironment_16.png',// Canteiro de horta arado com cercas
    fogueira_base: '/assets/isometric/medieval/PNG/Retina/Environment/medievalEnvironment_15.png' // Fogueira com toras de lenha
  };

  // Coordenadas na Grade Isométrica (coluna, linha) de 0 a 18
  const GRADE_LOCAIS = {
    fogueira:     { c: 9,  r: 9,  nome: 'Fogueira Central' },
    acampamento:  { c: 8,  r: 10, nome: 'Acampamento' },
    casa_icaro:   { c: 4,  r: 9,  nome: 'Cabana do Ícaro' },
    casa_joao:    { c: 9,  r: 4,  nome: 'Abrigo do João' },
    casa_maria:   { c: 13, r: 10, nome: 'Cabana da Maria' },
    fazenda:      { c: 14, r: 9,  nome: 'Horta da Fazenda' },
    barco:        { c: 9,  r: 15, nome: 'Cais da Jangada' },
    mar:          { c: 6,  r: 14, nome: 'Praia / Mar' },
    arena:        { c: 11, r: 6,  nome: 'Arena de Lutas' },
    caverna:      { c: 14, r: 4,  nome: 'Caverna Sombria' },
    bosque:       { c: 6,  r: 5,  nome: 'Bosque de Frutas' },
    floresta:     { c: 12, r: 7,  nome: 'Floresta Fechada' },
    rio:          { c: 11, r: 9,  nome: 'Riacho de Água Doce' },
    cachoeira:    { c: 11, r: 3,  nome: 'Cachoeira das Rochas' },
    ilha_vizinha: { c: 2,  r: 15, nome: 'Ilha Vizinha' }
  };

  const CORES_PERSONAGEM = {
    icaro: { roupa: 0x16a34a, pele: 0xf5d0b5, cabelo: 0x451a03, cinto: 0xfbbf24, nome: 'Ícaro' },
    joao:  { roupa: 0x0284c7, pele: 0xfbd0b5, cabelo: 0x1e293b, cinto: 0xffffff, nome: 'João' },
    maria: { roupa: 0xe11d48, pele: 0xfde0cf, cabelo: 0x713f12, cinto: 0xfef08a, nome: 'Maria' },
    lara:  { roupa: 0x9333ea, pele: 0xfde0cf, cabelo: 0xfef08a, cinto: 0xddd6fe, nome: 'Lara' }
  };

  const AURAS_EMOCAO = {
    raiva: 0xef4444,
    confronto: 0xef4444,
    medo: 0x38bdf8,
    frio: 0x0284c7,
    afeto: 0xf472b6,
    romance: 0xf472b6,
    satisfacao: 0x10b981,
    paz: 0x34d399,
    alerta: 0xf59e0b,
    padrao: 0xfbbf24
  };

  const ICONES_ACAO = {
    descansar: '💤',
    dormir: '💤',
    comer: '🍖',
    beber: '💧',
    coletar_agua: '💧',
    pescar: '🐟',
    colher: '🌾',
    plantar: '🌱',
    acender_fogueira: '🔥',
    alimentar_fogo: '🔥',
    conversar: '💬',
    observar: '👁️',
    explorar: '🧭',
    caçar: '🏹'
  };

  class MotorPixiIlha {
    constructor(canvas) {
      this.canvas = canvas;
      this.containerStage = document.getElementById('map-stage') || document.body;
      this.app = null;
      this.texturas = {};
      this.carregado = false;
      this.faiscas = [];
      this.actorContainers = {};
      this.predadorContainer = null;
      this.buildingSprites = {};
      this.hotspots = {};

      // Configuração da Grade Isométrica
      this.gridCols = 18;
      this.gridRows = 18;
      this.baseTileW = 132;
      this.baseTileH = 83;
      this.tileHalfW = 66;
      this.tileHalfH = 33;
      this.scale = 1.0;
      this.originX = 0;
      this.originY = 0;

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
        backgroundColor: 0x0a2a47, // Oceano azul profundo da Ilha
        antialias: false,
        powerPreference: 'low-power'
      });

      // Camadas em Profundidade 2.5D
      this.rootContainer = new PIXI.Container();
      this.app.stage.addChild(this.rootContainer);

      // 1. Chão Isométrico (Grama, Areia, Terra, Trilhas) — Cacheado em Bitmap
      this.groundContainer = new PIXI.Container();
      this.rootContainer.addChild(this.groundContainer);

      // 2. Trilhas de Terra conectando a vila
      this.trailsContainer = new PIXI.Container();
      this.rootContainer.addChild(this.trailsContainer);

      // 3. Mundo Isométrico (Casas em madeira/palha, Árvores, Personagens com Y-Sorting)
      this.ySortContainer = new PIXI.Container();
      this.ySortContainer.sortableChildren = true;
      this.rootContainer.addChild(this.ySortContainer);

      // 4. Efeitos de Clima (Chuva)
      this.weatherOverlay = new PIXI.Graphics();
      this.rootContainer.addChild(this.weatherOverlay);

      // 5. Iluminação Dia/Noite com Luz Volumétrica
      this.lightingOverlay = new PIXI.Graphics();
      this.rootContainer.addChild(this.lightingOverlay);

      // 6. UI e Balões
      this.uiContainer = new PIXI.Container();
      this.rootContainer.addChild(this.uiContainer);

      this.carregarAssets();

      window.addEventListener('resize', () => this.onResize());
      this.app.ticker.add(() => this.tick());
    }

    onResize() {
      if (!this.containerStage || !this.app) return;
      const rect = this.containerStage.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(240, rect.height);
      this.app.renderer.resize(w, h);
      this.recalcularEscalaEOrigem();
      if (this.carregado) {
        this.construirTerrenoIsometrico();
        this.posicionarConstrucoesEVegetacao();
      }
    }

    recalcularEscalaEOrigem() {
      const w = this.app.renderer.width / this.app.renderer.resolution;
      const h = this.app.renderer.height / this.app.renderer.resolution;

      // Largura da grade completa: (cols + rows) * halfW
      const totalGridW = (this.gridCols + this.gridRows) * this.tileHalfW;
      const totalGridH = (this.gridCols + this.gridRows) * this.tileHalfH + 120;

      this.scale = Math.min((w * 0.96) / totalGridW, (h * 0.94) / totalGridH);
      this.scale = Math.max(0.48, Math.min(this.scale, 0.95));

      // Centraliza a grade no canvas
      this.originX = w / 2;
      this.originY = Math.max(20, (h - (this.gridCols + this.gridRows) * this.tileHalfH * this.scale) * 0.35);
    }

    gridToScreen(col, row) {
      const hw = this.tileHalfW * this.scale;
      const hh = this.tileHalfH * this.scale;
      return {
        x: this.originX + (col - row) * hw,
        y: this.originY + (col + row) * hh
      };
    }

    carregarAssets() {
      const urls = Object.values(TILES);
      let carregados = 0;

      urls.forEach(url => {
        PIXI.Assets.load(url).then(tex => {
          this.texturas[url] = tex;
          carregados++;
          if (carregados >= urls.length) {
            this.carregado = true;
            this.recalcularEscalaEOrigem();
            this.construirTerrenoIsometrico();
            this.construirConstrucoes();
            this.construirVegetacao();
            console.log('[PIXI] Novo Terreno e Construções Isométricas carregadas com sucesso!');
          }
        }).catch(err => {
          console.warn('[PIXI] Falha textura:', url, err);
          carregados++;
          if (carregados >= urls.length) {
            this.carregado = true;
            this.recalcularEscalaEOrigem();
            this.construirTerrenoIsometrico();
            this.construirConstrucoes();
            this.construirVegetacao();
          }
        });
      });
    }

    // 1. CHÃO ISOMÉTRICO KENNEY (SEM FUNDO 2D PINTADO ANTIGO)
    construirTerrenoIsometrico() {
      this.groundContainer.removeChildren();
      this.groundContainer.cacheAsBitmap = false;

      const texGrama = this.texturas[TILES.grama];
      const texGramaFlor = this.texturas[TILES.grama_flor];
      const texTerra = this.texturas[TILES.terra];
      const texAgua = this.texturas[TILES.agua];

      if (!texGrama) return;

      const centroC = 9;
      const centroR = 9;
      const raioIlha = 7.2;

      // Varredura da grade isométrica regular
      for (let r = 0; r < this.gridRows; r++) {
        for (let c = 0; c < this.gridCols; c++) {
          const dist = Math.hypot(c - centroC, r - centroR);
          let tex = null;

          // Trilhas de terra batida conectando a fogueira central aos pontos
          const ehTrilha = (
            (c === 9 && r >= 4 && r <= 15) || // Trilha Norte-Sul (João -> Fogueira -> Cais)
            (r === 9 && c >= 4 && c <= 14) || // Trilha Oeste-Leste (Ícaro -> Fogueira -> Maria/Fazenda)
            (c + r >= 17 && c + r <= 19 && c >= 9 && r <= 9) // Trilha Caverna / Arena
          );

          if (ehTrilha && dist <= raioIlha) {
            tex = texTerra;
          } else if (dist <= raioIlha - 1.2) {
            // Miolo da ilha: Grama exuberante com flores ocasionais
            tex = ((c + r) % 5 === 0) ? (texGramaFlor || texGrama) : texGrama;
          } else if (dist <= raioIlha) {
            // Praia / Areia na borda da costa
            tex = texTerra;
          } else if (dist <= raioIlha + 1.2 && texAgua) {
            // Água rasa na orla
            tex = texAgua;
          }

          if (tex) {
            const pos = this.gridToScreen(c, r);
            const spr = new PIXI.Sprite(tex);
            spr.anchor.set(0.5, 0.25);
            spr.scale.set(this.scale);
            spr.x = pos.x;
            spr.y = pos.y;
            this.groundContainer.addChild(spr);
          }
        }
      }

      // Cacheia o chão como bitmap para consumo zero de GPU!
      this.groundContainer.cacheAsBitmap = true;
    }

    // 2. CONSTRUÇÕES TEXTURIZADAS EM MADEIRA E PALHA (ESCALA ~50%)
    construirConstrucoes() {
      // Limpa anteriores
      Object.values(this.buildingSprites).forEach(s => s.destroy());
      this.buildingSprites = {};

      const lista = [
        { id: 'casa_icaro', tex: TILES.casa_icaro, c: 4, r: 9, nome: 'Cabana do Ícaro', escala: 0.58 },
        { id: 'casa_joao', tex: TILES.casa_joao, c: 9, r: 4, nome: 'Abrigo do João', escala: 0.58 },
        { id: 'casa_maria', tex: TILES.casa_maria, c: 13, r: 10, nome: 'Cabana da Maria', escala: 0.58 },
        { id: 'fazenda', tex: TILES.fazenda, c: 14, r: 9, nome: 'Horta da Fazenda', escala: 0.55 },
        { id: 'barco', tex: TILES.cais, c: 9, r: 15, nome: 'Cais da Jangada', escala: 0.58 },
        { id: 'fogueira', tex: TILES.fogueira_base, c: 9, r: 9, nome: 'Fogueira Central', escala: 0.65 },
        { id: 'caverna', tex: TILES.rocha_caverna, c: 14, r: 4, nome: 'Caverna Sombria', escala: 0.65 }
      ];

      lista.forEach(item => {
        const tex = this.texturas[item.tex];
        if (!tex) return;

        const cont = new PIXI.Container();
        const pos = this.gridToScreen(item.c, item.r);
        cont.x = pos.x;
        cont.y = pos.y;

        // Sombra de apoio no chão
        const sombra = new PIXI.Graphics();
        sombra.beginFill(0x000000, 0.35);
        sombra.drawEllipse(0, 4, 28 * this.scale * item.escala, 12 * this.scale * item.escala);
        sombra.endFill();
        cont.addChild(sombra);

        // Sprite Texturizado da Construção
        const spr = new PIXI.Sprite(tex);
        spr.name = 'sprite_construcao';
        spr.anchor.set(0.5, 0.88); // Ponto de apoio na base
        spr.scale.set(this.scale * item.escala);
        cont.addChild(spr);

        // Se for a Fogueira Central, adiciona animação viva de chamas
        if (item.id === 'fogueira') {
          const chamas = new PIXI.Graphics();
          chamas.name = 'chamas_fogo';
          cont.addChild(chamas);
        }

        // Tag discreta com Nome
        const txtNome = new PIXI.Text(item.nome, {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: Math.max(9.5, 10 * this.scale),
          fontWeight: '700',
          fill: 0xffffff,
          stroke: 0x071827,
          strokeThickness: 3,
          align: 'center'
        });
        txtNome.anchor.set(0.5, 0);
        txtNome.y = 6 * this.scale;
        cont.addChild(txtNome);

        // Z-Index na base do contato com o solo
        cont.zIndex = Math.round(pos.y);

        // Interação
        cont.interactive = true;
        cont.cursor = 'pointer';
        cont.on('pointerdown', ev => {
          ev.stopPropagation();
          if (typeof window.abrirPainelLocal === 'function') {
            window.abrirPainelLocal(item.id);
          }
        });

        cont.on('pointerover', ev => this.mostrarTooltip(item.id, item.nome, ev));
        cont.on('pointerout', () => this.esconderTooltip());

        this.ySortContainer.addChild(cont);
        this.buildingSprites[item.id] = cont;
      });
    }

    // 3. VEGETAÇÃO ISOMÉTRICA (SEM BLOCOS COBRINDO A FLORESTA)
    construirVegetacao() {
      // Posições de árvores no Bosque (Noroeste) e Floresta (Nordeste)
      const arvores = [
        // Bosque de Frutas
        { c: 6, r: 5, t: TILES.arvore_bosque },
        { c: 5, r: 6, t: TILES.arvore_pinho },
        { c: 7, r: 4, t: TILES.arvore_bosque },
        { c: 6, r: 7, t: TILES.arvore_pinho },
        { c: 7, r: 6, t: TILES.arvore_bosque },

        // Floresta Fechada
        { c: 12, r: 6, t: TILES.arvore_floresta },
        { c: 13, r: 5, t: TILES.arvore_alta },
        { c: 11, r: 7, t: TILES.arvore_floresta },
        { c: 12, r: 8, t: TILES.arvore_alta },
        { c: 13, r: 7, t: TILES.arvore_floresta },
        { c: 12, r: 5, t: TILES.arvore_pinho },

        // Rochas perto da Caverna
        { c: 14, r: 3, t: TILES.rocha_grande },
        { c: 15, r: 4, t: TILES.rocha_caverna }
      ];

      arvores.forEach((item, idx) => {
        const tex = this.texturas[item.t];
        if (!tex) return;

        const cont = new PIXI.Container();
        const pos = this.gridToScreen(item.c, item.r);
        cont.x = pos.x;
        cont.y = pos.y;

        const sombra = new PIXI.Graphics();
        sombra.beginFill(0x000000, 0.32);
        sombra.drawEllipse(0, 0, 16 * this.scale, 7 * this.scale);
        sombra.endFill();
        cont.addChild(sombra);

        const spr = new PIXI.Sprite(tex);
        spr.anchor.set(0.5, 0.90);
        spr.scale.set(this.scale * 0.75);
        cont.addChild(spr);

        // Z-Index na base do tronco: personagens andam atrás e na frente perfeitamente!
        cont.zIndex = Math.round(pos.y);

        this.ySortContainer.addChild(cont);
      });
    }

    posicionarConstrucoesEVegetacao() {
      Object.entries(this.buildingSprites).forEach(([id, cont]) => {
        const coord = GRADE_LOCAIS[id];
        if (coord && cont) {
          const pos = this.gridToScreen(coord.c, coord.r);
          cont.x = pos.x;
          cont.y = pos.y;
          cont.zIndex = Math.round(pos.y);
        }
      });
    }

    // 4. PERSONAGENS COM ESCALA AUMENTADA EM ~30% (PROPORÇÃO HUMANA REAL)
    desenharPersonagem(g, serId, caminhando, tempo) {
      g.clear();
      const cfg = CORES_PERSONAGEM[serId] || CORES_PERSONAGEM.icaro;
      // Escala aumentada em 30% em relação ao padrão para proporção humana com as portas das casas
      const s = 1.35 * Math.max(0.7, this.scale * 1.3);

      const bob = caminhando ? -Math.abs(Math.sin(tempo * 0.015)) * 4 * s : Math.sin(tempo * 0.004) * 1.2 * s;

      // Sombra sob os pés
      g.beginFill(0x000000, 0.45);
      g.drawEllipse(0, 0, 13 * s, 6 * s);
      g.endFill();

      // Pernas
      g.beginFill(0x1e293b);
      const passoL = caminhando ? Math.sin(tempo * 0.02) * 3 : 0;
      const passoR = caminhando ? -Math.sin(tempo * 0.02) * 3 : 0;
      g.drawRect(-5 * s + passoL, -6 * s + bob, 4 * s, 6 * s);
      g.drawRect(1 * s + passoR, -6 * s + bob, 4 * s, 6 * s);
      g.endFill();

      // Tronco e Túnica
      g.beginFill(cfg.roupa);
      g.drawRoundedRect(-8 * s, -22 * s + bob, 16 * s, 16 * s, 3 * s);
      g.endFill();

      // Cinto / Faixa
      g.beginFill(cfg.cinto);
      g.drawRect(-8 * s, -12 * s + bob, 16 * s, 3 * s);
      g.endFill();

      // Cabeça / Rosto
      g.beginFill(cfg.pele);
      g.drawCircle(0, -27 * s + bob, 6.5 * s);
      g.endFill();

      // Cabelo
      g.beginFill(cfg.cabelo);
      g.drawCircle(0, -29 * s + bob, 6.5 * s);
      if (serId === 'maria' || serId === 'lara') {
        g.drawRect(-7 * s, -28 * s + bob, 14 * s, 10 * s);
      }
      g.endFill();

      // Olhos
      g.beginFill(0x0f172a);
      g.drawCircle(-2.2 * s, -27 * s + bob, 1.1 * s);
      g.drawCircle(2.2 * s, -27 * s + bob, 1.1 * s);
      g.endFill();
    }

    atualizarPersonagem(ser, tempo) {
      const id = ser.id;
      let cont = this.actorContainers[id];

      if (!cont) {
        cont = new PIXI.Container();
        cont.name = 'ser_' + id;

        // Aura CORTEX
        const aura = new PIXI.Graphics();
        aura.name = 'aura';
        cont.addChild(aura);

        const corpo = new PIXI.Graphics();
        corpo.name = 'corpo';
        cont.addChild(corpo);

        // Tag Flutuante com Nome e Ação
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

      // Alvo no mapa isométrico
      const coord = GRADE_LOCAIS[ser.local] || GRADE_LOCAIS.acampamento;
      const alvo = this.gridToScreen(coord.c, coord.r);

      // Movimento suave
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

      // Z-Index na base dos pés: caminha na frente/atrás de casas e árvores!
      cont.zIndex = Math.round(cont.y);

      const caminhando = Math.hypot(alvo.x - cont.x, alvo.y - cont.y) > 3;
      const corpo = cont.getChildByName('corpo');
      if (corpo) this.desenharPersonagem(corpo, id, caminhando, tempo);

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
        aura.drawEllipse(0, 0, 18 + pulso, 9 + pulso * 0.5);
        aura.endFill();
      }

      // Atualiza Tag
      const tag = cont.getChildByName('tag');
      if (tag) {
        tag.y = -46 * Math.max(0.7, this.scale);
        tag.scale.x = cont.scale.x < 0 ? -1 : 1;
        const txtAcao = tag.getChildByName('txtAcao');
        if (txtAcao) {
          const acaoBruta = (ser.acao || '').toLowerCase();
          const icone = ICONES_ACAO[acaoBruta] || '✨';
          txtAcao.text = icone + ' ' + (ser.acao || 'Livre');
        }
      }

      // Balão de fala
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
          const yTopo = -70;

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

    // 5. ILUMINAÇÃO DINÂMICA DIA/NOITE & CHAMA DA FOGUEIRA
    atualizarFogueiraEIluminacao(estadoMundo, tempo) {
      // Animação viva das chamas da fogueira
      const fogCont = this.buildingSprites['fogueira'];
      if (fogCont) {
        const chamas = fogCont.getChildByName('chamas_fogo');
        if (chamas) {
          chamas.clear();
          const osc = Math.sin(tempo * 0.012) * 3;
          const osc2 = Math.cos(tempo * 0.016) * 2;
          chamas.beginFill(0xf97316, 0.85);
          chamas.drawEllipse(0, -10 + osc, 7 + osc2, 11 + osc);
          chamas.beginFill(0xfde047, 0.95);
          chamas.drawEllipse(0, -8 + osc, 4 + osc2 * 0.5, 6 + osc * 0.7);
          chamas.beginFill(0xffffff, 0.9);
          chamas.drawCircle(0, -6 + osc, 2);
          chamas.endFill();
        }
      }

      // Iluminação Dia/Noite
      this.lightingOverlay.clear();
      if (!estadoMundo || !estadoMundo.mundo) return;

      const periodo = (estadoMundo.mundo.tempo && estadoMundo.mundo.tempo.periodo) || 'manha';
      const clima = (estadoMundo.mundo.clima || '').toLowerCase();
      const w = this.app.renderer.width;
      const h = this.app.renderer.height;

      let corLuz = 0x000000;
      let alphaLuz = 0;

      if (periodo === 'manha') {
        corLuz = 0xfef08a;
        alphaLuz = 0.03;
      } else if (periodo === 'tarde') {
        corLuz = 0xf97316; // Entardecer dourado suave
        alphaLuz = 0.15;
      } else if (periodo === 'noite' || periodo === 'madrugada') {
        corLuz = 0x040e24; // Noite azul-marinho
        alphaLuz = 0.65;
      }

      if (clima.includes('chuva') || clima.includes('tempestade')) {
        corLuz = 0x0b192c;
        alphaLuz = Math.max(alphaLuz, 0.35);
      }

      if (alphaLuz > 0) {
        this.lightingOverlay.beginFill(corLuz, alphaLuz);
        this.lightingOverlay.drawRect(0, 0, w, h);
        this.lightingOverlay.endFill();

        // À noite, a fogueira central abre um raio de luz quente circular
        if (periodo === 'noite' || periodo === 'madrugada') {
          const posFog = this.gridToScreen(9, 9);
          const pulso = Math.sin(tempo * 0.006) * 6;
          const raioMax = (85 + pulso) * this.scale;

          this.lightingOverlay.beginFill(0xfbbf24, 0.22);
          this.lightingOverlay.drawCircle(posFog.x, posFog.y, raioMax);
          this.lightingOverlay.beginFill(0xfef08a, 0.35);
          this.lightingOverlay.drawCircle(posFog.x, posFog.y, raioMax * 0.45);
          this.lightingOverlay.endFill();
        }
      }

      // Efeito de Chuva / Tempestade em 30 FPS econômico
      this.weatherOverlay.clear();
      if (clima.includes('chuva') || clima.includes('tempestade')) {
        this.weatherOverlay.lineStyle(1.1, 0xbae6fd, 0.55);
        for (let i = 0; i < 40; i++) {
          const rx = ((i * 53 + tempo * 0.45) % w);
          const ry = ((i * 79 + tempo * 0.9) % h);
          this.weatherOverlay.moveTo(rx, ry);
          this.weatherOverlay.lineTo(rx - 3, ry + 11);
        }
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
        + '<div style="font-size:10px;color:#38bdf8;margin-top:4px;">(Clique para ver detalhes do local)</div>';
    }

    esconderTooltip() {
      const tooltip = document.getElementById('tooltip');
      if (tooltip) tooltip.style.display = 'none';
    }

    tick() {
      if (!this.carregado) return;
      const tempo = performance.now();
      const estado = window.stateData || (typeof stateData !== 'undefined' ? stateData : null);

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

      this.atualizarFogueiraEIluminacao(estado, tempo);
    }
  }

  // Inicialização quando o DOM carregar
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pixi-game') || document.getElementById('game');
    if (canvas) {
      window.motorPixi = new MotorPixiIlha(canvas);
      console.log('[PIXI] Motor Isométrico Puro ativado com sucesso!');
    }
  });

})();

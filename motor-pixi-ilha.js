/**
 * motor-pixi-ilha.js — Motor 2.5D Isométrico Profissional "Evertrail Tribe" para a Ilha Aurora
 * 
 * - Base visual em alta definição sobre o novo mapa isométrico (mapa-ilha-evertrail.png)
 * - NENHUM cubo cinza ou sobreposição de blocos sem textura
 * - NENHUMA grade de tiles quebrada ou desalinhada
 * - Fogueira animada no centro com chamas e partículas de brasas
 * - Ciclo de iluminação dia/noite cinematográfico com luz volumétrica quente na fogueira
 * - Chuva atmosférica leve a 30 FPS econômico (otimizado para Z-Fold)
 * - Habitantes estilizados, legíveis e proporcionais à vila, com sombras, auras CORTEX e balões de fala
 * - Hotspots interativos para abrir o painel da casa ou inspecionar o CORTEX
 */
(function() {
  'use strict';

  if (typeof PIXI === 'undefined') {
    console.error('[PIXI] PixiJS não encontrado! Verifique a inclusão de /pixi.min.js');
    return;
  }

  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
  PIXI.Ticker.shared.maxFPS = 30; // 30 FPS cravados para economia de bateria no Z-Fold

  // Posições dos locais no mapa isométrico (coordenadas normalizadas 0..1)
  const LOCAIS_MAPA = {
    fogueira:     { x: 0.50, y: 0.52, nome: 'Fogueira Central' },
    acampamento:  { x: 0.46, y: 0.54, nome: 'Acampamento' },
    casa_icaro:   { x: 0.22, y: 0.48, nome: 'Cabana do Ícaro' },
    casa_joao:    { x: 0.46, y: 0.24, nome: 'Abrigo do João' },
    casa_maria:   { x: 0.80, y: 0.58, nome: 'Cabana da Maria' },
    fazenda:      { x: 0.88, y: 0.56, nome: 'Horta da Fazenda' },
    barco:        { x: 0.48, y: 0.84, nome: 'Cais da Jangada' },
    mar:          { x: 0.35, y: 0.88, nome: 'Praia / Mar' },
    arena:        { x: 0.56, y: 0.38, nome: 'Arena de Lutas' },
    caverna:      { x: 0.88, y: 0.22, nome: 'Caverna Sombria' },
    bosque:       { x: 0.32, y: 0.32, nome: 'Bosque de Frutas' },
    floresta:     { x: 0.76, y: 0.32, nome: 'Floresta Fechada' },
    rio:          { x: 0.64, y: 0.54, nome: 'Riacho de Água Doce' },
    cachoeira:    { x: 0.65, y: 0.14, nome: 'Cachoeira das Rochas' },
    ilha_vizinha: { x: 0.08, y: 0.82, nome: 'Ilha Vizinha' }
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
      this.mapSprite = null;
      this.carregado = false;
      this.box = { x: 0, y: 0, w: 1376, h: 768, scale: 1 };
      this.faiscas = [];
      this.actorContainers = {};
      this.hotspots = {};
      this.hoveredLocal = null;

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
        backgroundColor: 0x0d3c61, // Cor de fundo do oceano
        antialias: true,
        powerPreference: 'low-power'
      });

      // Estrutura de Camadas
      this.rootContainer = new PIXI.Container();
      this.app.stage.addChild(this.rootContainer);

      // 1. Chão (Mapa 2.5D Isométrico de Alta Qualidade)
      this.groundContainer = new PIXI.Container();
      this.rootContainer.addChild(this.groundContainer);

      // 2. Fogueira Viva Central
      this.campfireContainer = new PIXI.Container();
      this.rootContainer.addChild(this.campfireContainer);

      // 3. Hotspots e Anéis de Seleção
      this.hotspotsContainer = new PIXI.Container();
      this.rootContainer.addChild(this.hotspotsContainer);

      // 4. Personagens e Criaturas com Y-Sorting
      this.ySortContainer = new PIXI.Container();
      this.ySortContainer.sortableChildren = true;
      this.rootContainer.addChild(this.ySortContainer);

      // 5. Clima (Chuva)
      this.weatherOverlay = new PIXI.Graphics();
      this.rootContainer.addChild(this.weatherOverlay);

      // 6. Iluminação Dia/Noite com Luz Volumétrica
      this.lightingOverlay = new PIXI.Graphics();
      this.rootContainer.addChild(this.lightingOverlay);

      this.carregarMapa();

      window.addEventListener('resize', () => this.onResize());
      this.app.ticker.add(() => this.tick());
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
      const aspecto = 1376 / 768; // 16:9

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
          console.log('[PIXI] Mapa Isométrico Evertrail carregado:', urls[idx]);
        };
        img.onerror = () => tentar(idx + 1);
      };

      tentar(0);
    }

    // Cria áreas de clique suaves e elegantes para cada local
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

        const raio = (id.startsWith('casa_') || id === 'fazenda' || id === 'fogueira') ? 34 * this.box.scale : 24 * this.box.scale;

        // Área transparente de clique
        g.beginFill(0xffffff, 0.001);
        g.drawCircle(0, 0, raio);
        g.endFill();

        // Anel de foco se estiver sob o mouse ou selecionado
        const ehHover = this.hoveredLocal === id;
        const ehSelecionado = typeof selectedLocal !== 'undefined' && selectedLocal === id;

        if (ehHover || ehSelecionado) {
          g.lineStyle(2, ehSelecionado ? 0x38bdf8 : 0xfbbf24, 0.85);
          g.drawEllipse(0, 6, raio, raio * 0.5);

          // Pílula com o nome no topo
          const tagW = Math.max(65, info.nome.length * 6.5);
          g.lineStyle(1, 0x38bdf8, 0.8);
          g.beginFill(0x0f172a, 0.92);
          g.drawRoundedRect(-tagW / 2, -raio - 18, tagW, 18, 5);
          g.endFill();
        }
      });
    }

    // Personagens estilizados no padrão Evertrail Tribe
    desenharPersonagem(g, serId, caminhando, tempo) {
      g.clear();
      const cfg = CORES_PERSONAGEM[serId] || CORES_PERSONAGEM.icaro;
      const s = 1.15 * Math.max(0.75, this.box.scale);

      const bob = caminhando ? -Math.abs(Math.sin(tempo * 0.015)) * 3.5 * s : Math.sin(tempo * 0.004) * 1.2 * s;

      // Sombra suave sob os pés
      g.beginFill(0x000000, 0.45);
      g.drawEllipse(0, 0, 13 * s, 6 * s);
      g.endFill();

      // Pernas
      g.beginFill(0x1e293b);
      const passoL = caminhando ? Math.sin(tempo * 0.02) * 2.8 : 0;
      const passoR = caminhando ? -Math.sin(tempo * 0.02) * 2.8 : 0;
      g.drawRect(-5 * s + passoL, -6 * s + bob, 4 * s, 6 * s);
      g.drawRect(1 * s + passoR, -6 * s + bob, 4 * s, 6 * s);
      g.endFill();

      // Tronco e Túnica
      g.beginFill(cfg.roupa);
      g.drawRoundedRect(-7.5 * s, -21 * s + bob, 15 * s, 15 * s, 3 * s);
      g.endFill();

      // Cinto tribal
      g.beginFill(cfg.cinto);
      g.drawRect(-7.5 * s, -11 * s + bob, 15 * s, 2.5 * s);
      g.endFill();

      // Cabeça / Rosto
      g.beginFill(cfg.pele);
      g.drawCircle(0, -26 * s + bob, 6 * s);
      g.endFill();

      // Cabelo
      g.beginFill(cfg.cabelo);
      g.drawCircle(0, -28 * s + bob, 6 * s);
      if (serId === 'maria' || serId === 'lara') {
        g.drawRect(-6.5 * s, -27 * s + bob, 13 * s, 9 * s);
      }
      g.endFill();

      // Olhos
      g.beginFill(0x0f172a);
      g.drawCircle(-2 * s, -26 * s + bob, 1 * s);
      g.drawCircle(2 * s, -26 * s + bob, 1 * s);
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

      // Alvo no mapa
      const info = LOCAIS_MAPA[ser.local] || LOCAIS_MAPA.acampamento;
      const alvo = this.toScreen(info.x, info.y);

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

      // Z-Index real pela base dos pés
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

      // Chamas
      fogo.beginFill(0xf97316, 0.85);
      fogo.drawEllipse(0, -8 + osc, 8 + osc2, 12 + osc);
      fogo.beginFill(0xfde047, 0.95);
      fogo.drawEllipse(0, -6 + osc, 4 + osc2 * 0.5, 7 + osc * 0.7);
      fogo.beginFill(0xffffff, 0.9);
      fogo.drawCircle(0, -4 + osc, 2.5);
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

    // Iluminação Dia/Noite e Clima
    atualizarIluminacao(estadoMundo, tempo) {
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
        corLuz = 0x040e24; // Noite azul-marinho cinematográfica
        alphaLuz = 0.62;
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
          const posFog = this.toScreen(LOCAIS_MAPA.fogueira.x, LOCAIS_MAPA.fogueira.y);
          const pulso = Math.sin(tempo * 0.006) * 6;
          const raioMax = (85 + pulso) * this.box.scale;

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

      this.atualizarFogueira(tempo);
      this.atualizarIluminacao(estado, tempo);
      this.atualizarHotspots();
    }
  }

  // Inicialização quando o DOM carregar
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pixi-game') || document.getElementById('game');
    if (canvas) {
      window.motorPixi = new MotorPixiIlha(canvas);
      console.log('[PIXI] Motor Evertrail Profissional ativado com sucesso!');
    }
  });

})();

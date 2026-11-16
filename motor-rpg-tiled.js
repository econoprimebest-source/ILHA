/**
 * MOTOR RPG TILED — Motor Oficial 2D Top-Down RPG (Ilha Aurora)
 *
 * - Proporção 100% preservada (sem distorção/esticamento em nenhuma tela, Z Fold fechado ou aberto)
 * - Casas reais de alvenaria, telhado cerâmico, janelas e chaminé (substituindo antigas cabanas)
 * - 4 Mapas 2D RPG Completos e Interativos:
 *   1. ilha_central (🏝️ Ilha Central / Vila Aurora)
 *   2. bosque       (🌲 Mapa do Bosque & Floresta Alta)
 *   3. caverna      (🪨 Mapa da Caverna & Minas Subterrâneas)
 *   4. praia        (🏖️ Mapa da Praia & Litoral Sul)
 * - Sem menus flutuantes cobrindo o canvas do mapa
 */
(function (window) {
  'use strict';

  const CORES_PERSONAGENS = {
    icaro: '#10b981', // Esmeralda
    lara: '#a855f7',  // Roxo Real
    elara: '#a855f7',
    joao: '#3b82f6',  // Azul Oceano
    maria: '#f59e0b', // Âmbar Dourado
    pantera: '#dc2626'
  };

  // Normaliza qualquer alias de região para um dos 4 mapas canônicos
  function normalizarIdMapa(id) {
    const s = String(id || '').toLowerCase();
    if (s.includes('bosque') || s.includes('floresta')) return 'bosque';
    if (s.includes('caverna') || s.includes('mina') || s.includes('ruina')) return 'caverna';
    if (s.includes('praia') || s.includes('mar') || s.includes('litoral') || s.includes('baia')) return 'praia';
    return 'ilha_central';
  }

  const MAPAS_REGIOES = {
    ilha_central: {
      id: 'ilha_central',
      idBackend: 'mapa_global',
      nome: '🏝️ Ilha Central',
      tituloCompleto: '🏝️ Ilha Central — Vila Aurora',
      descricao: 'Coração da colônia: Casas dos habitantes, Fogueira Central, Venda Comunitária e Horta.'
    },
    bosque: {
      id: 'bosque',
      idBackend: 'regiao_bosque',
      nome: '🌲 Bosque',
      tituloCompleto: '🌲 Mapa do Bosque & Floresta Alta',
      descricao: 'Mata densa ao norte e oeste: árvores frutíferas, corte de lenha, riacho cristalino e ruínas.'
    },
    caverna: {
      id: 'caverna',
      idBackend: 'regiao_caverna',
      nome: '🪨 Caverna',
      tituloCompleto: '🪨 Mapa da Caverna & Minas Sombrias',
      descricao: 'Galerias subterrâneas iluminadas por tochas: veios de ferro, cristais de quartzo, lago e covil.'
    },
    praia: {
      id: 'praia',
      idBackend: 'regiao_praia',
      nome: '🏖️ Praia',
      tituloCompleto: '🏖️ Mapa da Praia & Litoral Sul',
      descricao: 'Enseada de areia dourada: píer de pesca, barco a vela, recife de corais, conchas e mar aberto.'
    }
  };

  // Coordenadas normalizadas (u, v de 0.0 a 1.0) perfeitamente alinhadas à arte de cada mapa
  const ZONAS_POR_MAPA = {
    ilha_central: {
      casa_icaro:  { u: 0.214, v: 0.468, nome: '🏠 Casa do Ícaro' },
      casa_lara:   { u: 0.320, v: 0.486, nome: '🏠 Casa da Lara' },
      casa_joao:   { u: 0.476, v: 0.195, nome: '🏠 Casa do João' },
      casa_maria:  { u: 0.855, v: 0.545, nome: '🏠 Casa da Maria' },
      fogueira:    { u: 0.492, v: 0.476, nome: '🔥 Fogueira Central' },
      acampamento: { u: 0.435, v: 0.495, nome: '⛺ Praça Central' },
      venda:       { u: 0.415, v: 0.585, nome: '🏪 Venda Comunitária' },
      fazenda:     { u: 0.948, v: 0.555, nome: '🌱 Horta Comunitária' },
      curral:      { u: 0.583, v: 0.198, nome: '🐾 Curral da Vila' },
      arena:       { u: 0.560, v: 0.380, nome: '⚔️ Arena' },
      bosque:      { u: 0.235, v: 0.245, nome: '🌲 Entrada do Bosque', portalPara: 'bosque' },
      floresta:    { u: 0.815, v: 0.295, nome: '🌲 Mata Leste', portalPara: 'bosque' },
      caverna:     { u: 0.932, v: 0.175, nome: '🪨 Entrada da Caverna', portalPara: 'caverna' },
      cachoeira:   { u: 0.730, v: 0.115, nome: '💧 Cachoeira' },
      rio:         { u: 0.692, v: 0.420, nome: '🌉 Ponte do Rio' },
      mar:         { u: 0.350, v: 0.825, nome: '🏖️ Acesso à Praia', portalPara: 'praia' },
      barco:       { u: 0.502, v: 0.845, nome: '⛵ Cais do Barco', portalPara: 'praia' }
    },
    bosque: {
      saida_ilha:        { u: 0.14, v: 0.84, nome: '🚪 Voltar à Ilha Central', portalPara: 'ilha_central' },
      clareira_frutas:   { u: 0.28, v: 0.34, nome: '🍎 Pomar das Frutas Silvestres', icone: '🍎', cor: '#22c55e' },
      serraria_lenha:    { u: 0.52, v: 0.52, nome: '🪵 Clareira de Corte de Lenha', icone: '🪵', cor: '#d97706' },
      riacho_bosque:     { u: 0.74, v: 0.30, nome: '💧 Nascente & Riacho do Bosque', icone: '💧', cor: '#38bdf8' },
      ruinas_expedicao:  { u: 0.80, v: 0.72, nome: '🏛️ Ruínas Antigas & Sucata', icone: '🏛️', cor: '#a855f7' },
      acampamento_caca:  { u: 0.38, v: 0.72, nome: '🏹 Posto de Vigília & Caça', icone: '🏹', cor: '#f59e0b' }
    },
    caverna: {
      saida_ilha:        { u: 0.14, v: 0.52, nome: '🚪 Escadaria para a Ilha Central', portalPara: 'ilha_central' },
      veio_ferro:        { u: 0.38, v: 0.26, nome: '⛏️ Veio de Ferro & Pedra', icone: '⛏️', cor: '#f59e0b' },
      galeria_cristais:  { u: 0.64, v: 0.24, nome: '💎 Galeria de Quartzo & Ametista', icone: '💎', cor: '#c084fc' },
      lago_subterraneo:  { u: 0.52, v: 0.72, nome: '🌊 Lago Subterrâneo Cristalino', icone: '🌊', cor: '#38bdf8' },
      altar_ancestral:   { u: 0.82, v: 0.42, nome: '🔮 Altar de Pedra Ancestral', icone: '🔮', cor: '#818cf8' },
      covil_pantera:     { u: 0.84, v: 0.78, nome: '🐾 Covil da Pantera das Sombras', icone: '🐾', cor: '#ef4444' }
    },
    praia: {
      saida_ilha:        { u: 0.50, v: 0.14, nome: '🚪 Trilha para a Ilha Central', portalPara: 'ilha_central' },
      coqueiral:         { u: 0.22, v: 0.32, nome: '🌴 Coqueiral da Costa', icone: '🌴', cor: '#22c55e' },
      banco_conchas:     { u: 0.78, v: 0.34, nome: '🐚 Banco de Conchas & Pérolas', icone: '🐚', cor: '#f472b6' },
      pier_pesca:        { u: 0.50, v: 0.62, nome: '⛵ Píer de Madeira & Barco', icone: '⛵', cor: '#f59e0b' },
      recife_corais:     { u: 0.82, v: 0.74, nome: '🪸 Recife de Corais', icone: '🪸', cor: '#06b6d4' },
      destrocos_baia:    { u: 0.20, v: 0.72, nome: '📦 Destroços & Suprimentos', icone: '📦', cor: '#fbbf24' }
    }
  };

  class MotorRpgTiled {
    constructor() {
      this.container = null;
      this.canvas = null;
      this.ctx = null;
      this.tiledData = null;
      this.estadoAtual = null;
      this.animId = null;
      this.tempo = 0;
      this.carregado = false;
      this.mapaAtivo = 'ilha_central';
      this.personagens = {};
      this.estruturasDinamicas = [];
      this.imgFundo = null;
      this.fundoPronto = false;
      this.sprites = {};
      this.baloes = {};
      this.boxAtual = { x: 0, y: 0, w: 1280, h: 853, escala: 1 };
      this.posicoesLocaisSubmapa = {
        bosque:  { icaro: 'serraria_lenha', lara: 'clareira_frutas', joao: 'acampamento_caca', maria: 'riacho_bosque' },
        caverna: { icaro: 'veio_ferro', lara: 'galeria_cristais', joao: 'saida_ilha', maria: 'lago_subterraneo' },
        praia:   { icaro: 'pier_pesca', lara: 'banco_conchas', joao: 'destrocos_baia', maria: 'coqueiral' }
      };
    }

    async init(containerElement) {
      if (this.canvas && this.container === containerElement) {
        this.redimensionar();
        return;
      }
      this.container = containerElement;

      const antigo = document.getElementById('rpg-tiled-canvas');
      if (antigo) antigo.remove();

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'rpg-tiled-canvas';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.canvas.style.background = '#052238';
      this.canvas.style.cursor = 'pointer';
      this.container.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d');

      window.addEventListener('resize', () => this.redimensionar());
      this.redimensionar();

      this.canvas.addEventListener('click', (e) => this.tratarClique(e));

      this.carregarFundo();
      this.carregarSprites();

      try {
        const resp = await fetch('/mapa-rpg-tiled.json?v=' + Date.now());
        this.tiledData = await resp.json();
        this.carregado = true;
      } catch (err) {
        console.warn('[Motor RPG 2D] Aviso ao carregar mapa-rpg-tiled.json:', err);
      }

      this.iniciarLoop();
    }

    carregarFundo() {
      this.imgFundo = new Image();
      this.imgFundo.onload = () => {
        this.fundoPronto = true;
      };
      this.imgFundo.onerror = () => {
        this.fundoPronto = false;
      };
      this.imgFundo.src = '/mapa-ilha-nova.png?v=20261116_2015';
    }

    carregarSprites() {
      const lista = [
        ['pescar', '/assets/sprites/acao_pescar.svg'],
        ['cortar_lenha', '/assets/sprites/acao_cortar_lenha.svg'],
        ['cacar_onca', '/assets/sprites/acao_cacar_onca.svg'],
        ['plantar', '/assets/sprites/acao_plantar.svg'],
        ['peca_estacas', '/assets/sprites/casa_peca_1_estacas.svg'],
        ['peca_alicerce', '/assets/sprites/casa_peca_2_alicerce.svg'],
        ['peca_paredes', '/assets/sprites/casa_peca_3_paredes.svg'],
        ['peca_telhado', '/assets/sprites/casa_peca_4_telhado.svg'],
        ['casa_nv1', '/assets/sprites/casa_nivel1.svg'],
        ['casa_nv2', '/assets/sprites/casa_nivel2.svg'],
        ['casa_nv3', '/assets/sprites/casa_nivel3.svg'],
        ['casa_nv4', '/assets/sprites/casa_nivel4.svg'],
        ['casa_nv5', '/assets/sprites/casa_nivel5.svg'],
        ['fogueira_alta', '/assets/sprites/fogueira_alta.svg'],
        ['canteiro_arado', '/assets/sprites/canteiro_arado.svg'],
        ['canteiro_broto', '/assets/sprites/canteiro_broto.svg'],
        ['canteiro_maduro', '/assets/sprites/canteiro_maduro.svg'],
        ['canteiro_colhido', '/assets/sprites/canteiro_colhido.svg'],
        ['caverna', '/assets/sprites/caverna_rocha.svg'],
        ['curral', '/assets/sprites/curral.svg'],
        ['barco', '/assets/sprites/barco.svg'],
        ['mercado', '/assets/sprites/mercado.svg'],
        ['arvore_carvalho', '/assets/sprites/arvore_carvalho.svg'],
        ['arvore_pinheiro', '/assets/sprites/arvore_pinheiro.svg'],
        ['palmeira', '/assets/sprites/palmeira.svg']
      ];

      const versao = '20261116_2015';
      lista.forEach(([chave, url]) => {
        const img = new Image();
        img.src = `${url}?v=${versao}`;
        this.sprites[chave] = img;
      });
    }

    redimensionar() {
      if (!this.canvas || !this.container) return;
      const rect = this.container.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
      if (this.ctx) {
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      this.recalcularCaixa(rect.width, rect.height);
    }

    // Calcula a caixa proporcional (sem deformar a arte 3:2)
    recalcularCaixa(w, h) {
      const ar = (this.imgFundo && this.imgFundo.naturalWidth && this.imgFundo.naturalHeight)
        ? (this.imgFundo.naturalWidth / this.imgFundo.naturalHeight)
        : 1.5; // 882x588 = 1.5
      let mw = w;
      let mh = mw / ar;
      if (mh > h) {
        mh = h;
        mw = mh * ar;
      }
      const mx = (w - mw) * 0.5;
      const my = (h - mh) * 0.5;
      const escala = Math.max(0.55, Math.min(1.35, mw / 1100));
      this.boxAtual = { x: mx, y: my, w: mw, h: mh, escala, canvasW: w, canvasH: h };
      return this.boxAtual;
    }

    iniciarLoop() {
      if (this.animId) cancelAnimationFrame(this.animId);
      const step = () => {
        this.tempo += 0.016;
        this.renderizar();
        this.animId = requestAnimationFrame(step);
      };
      this.animId = requestAnimationFrame(step);
    }

    coordZona(nome, mapaId = this.mapaAtivo) {
      const box = this.boxAtual;
      const tabela = ZONAS_POR_MAPA[mapaId] || ZONAS_POR_MAPA.ilha_central;
      const z = tabela[nome] || ZONAS_POR_MAPA.ilha_central[nome] || { u: 0.492, v: 0.476 };
      return {
        x: box.x + z.u * box.w,
        y: box.y + z.v * box.h,
        u: z.u,
        v: z.v,
        info: z
      };
    }

    obterDestinoPersonagem(ser) {
      if (this.mapaAtivo === 'ilha_central') {
        return this.coordZona(ser.local || 'fogueira', 'ilha_central');
      }
      // Nos submapas (bosque, caverna, praia), posiciona os habitantes nos pontos de interesse do mapa
      const subMap = this.posicoesLocaisSubmapa[this.mapaAtivo] || {};
      let poiKey = subMap[ser.id];
      if (!poiKey) {
        const chaves = Object.keys(ZONAS_POR_MAPA[this.mapaAtivo] || {});
        poiKey = chaves[0] || 'saida_ilha';
      }
      return this.coordZona(poiKey, this.mapaAtivo);
    }

    atualizarEstado(stateData) {
      this.estadoAtual = stateData;
      if (!stateData || !stateData.seres) return;

      Object.values(stateData.seres).forEach((ser, idx) => {
        if (ser.status === 'morto') {
          delete this.personagens[ser.id];
          return;
        }

        const dest = this.obterDestinoPersonagem(ser);
        const offsetAng = (idx * Math.PI * 0.5) + 0.3;
        const offX = Math.cos(offsetAng) * 14;
        const offY = Math.sin(offsetAng) * 10;

        let p = this.personagens[ser.id];
        if (!p) {
          p = {
            id: ser.id,
            nome: ser.nome || ser.id,
            x: dest.x + offX,
            y: dest.y + offY,
            targetX: dest.x + offX,
            targetY: dest.y + offY,
            acao: ser.acao || ser.ultimaAcao || 'Observando',
            fala: ser.ultimaFala || '',
            cor: CORES_PERSONAGENS[ser.id] || '#38bdf8',
            passo: 0
          };
          this.personagens[ser.id] = p;
        }

        p.targetX = dest.x + offX;
        p.targetY = dest.y + offY;
        p.acao = ser.acao || ser.ultimaAcao || ser.local || 'Observando';
        p.local = ser.local;

        if (ser.ultimaFala && ser.ultimaFala !== p.fala) {
          p.fala = ser.ultimaFala;
          this.baloes[ser.id] = {
            texto: ser.ultimaFala,
            expiraEm: Date.now() + 8000
          };
        }
      });

      this.estruturasDinamicas = (stateData.mundo && stateData.mundo.estruturas) || [];
    }

    reposicionarPersonagensNoMapaAtivo() {
      if (!this.estadoAtual || !this.estadoAtual.seres) return;
      Object.values(this.estadoAtual.seres).forEach((ser, idx) => {
        const p = this.personagens[ser.id];
        if (!p) return;
        const dest = this.obterDestinoPersonagem(ser);
        const offsetAng = (idx * Math.PI * 0.5) + 0.3;
        const offX = Math.cos(offsetAng) * 14;
        const offY = Math.sin(offsetAng) * 10;
        p.x = dest.x + offX;
        p.y = dest.y + offY;
        p.targetX = p.x;
        p.targetY = p.y;
      });
    }

    renderizar() {
      if (!this.ctx || !this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;
      if (w < 10 || h < 10) return;

      this.recalcularCaixa(w, h);
      const ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);

      // Renderiza o mapa correspondente à região ativa
      if (this.mapaAtivo === 'bosque') {
        this.renderizarMapaBosque(ctx, w, h);
      } else if (this.mapaAtivo === 'caverna') {
        this.renderizarMapaCaverna(ctx, w, h);
      } else if (this.mapaAtivo === 'praia') {
        this.renderizarMapaPraia(ctx, w, h);
      } else {
        this.renderizarMapaIlhaCentral(ctx, w, h);
      }

      // Personagens + Figuras de Ações + Balões de Fala
      this.desenharPersonagensEAcoes(ctx, w, h);
      this.desenharBaloesDialogo(ctx);
    }

    // =========================================================================
    // MAPA 1: ILHA CENTRAL (VILA AURORA) — PROPORÇÃO 3:2 EXATA E CASAS REAIS
    // =========================================================================
    renderizarMapaIlhaCentral(ctx, w, h) {
      const box = this.boxAtual;

      // 1. Oceano preenchendo toda a tela para nunca esticar a ilha
      const gradMar = ctx.createRadialGradient(w * 0.5, h * 0.5, box.w * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      gradMar.addColorStop(0, '#0c689b');
      gradMar.addColorStop(0.65, '#074871');
      gradMar.addColorStop(1, '#042a46');
      ctx.fillStyle = gradMar;
      ctx.fillRect(0, 0, w, h);

      // Ondinhas suaves nas bordas oceânicas
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.16)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 12; i++) {
        const wy = ((i * 73 + this.tempo * 12) % h);
        const wx = ((i * 137) % w);
        ctx.beginPath();
        ctx.moveTo(wx - 18, wy);
        ctx.quadraticCurveTo(wx, wy - 4, wx + 18, wy);
        ctx.stroke();
      }

      // 2. Desenha a arte oficial da Ilha respeitando 100% da proporção (box.x, box.y, box.w, box.h)
      if (this.fundoPronto && this.imgFundo && this.imgFundo.complete) {
        ctx.drawImage(this.imgFundo, box.x, box.y, box.w, box.h);
      } else {
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.44, box.h * 0.40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.40, box.h * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Casas dos Habitantes (Substituindo cabanas por Casas de Alvenaria & Telhado Cerâmico)
      this.desenharCasasIlhaCentral(ctx);

      // 4. Elementos vivos (Fogueira, Horta Comunitária, Curral, Venda e Portais)
      this.desenharElementosIlhaCentral(ctx);
    }

    desenharCasasIlhaCentral(ctx) {
      const box = this.boxAtual;
      const esc = box.escala;
      const casasMundo = (this.estadoAtual && this.estadoAtual.mundo && this.estadoAtual.mundo.casas) || {};

      const listaCasas = [
        { id: 'casa_icaro', dono: 'Casa do Ícaro', cor: '#10b981' },
        { id: 'casa_lara',  dono: 'Casa da Lara',  cor: '#a855f7' },
        { id: 'casa_joao',  dono: 'Casa do João',  cor: '#3b82f6' },
        { id: 'casa_maria', dono: 'Casa da Maria', cor: '#f59e0b' }
      ];

      listaCasas.forEach(c => {
        const p = this.coordZona(c.id, 'ilha_central');
        const info = casasMundo[c.id] || { nivel: 1, bau: {}, obra: null };
        const nivel = Math.max(1, Math.min(5, info.nivel || 1));
        const obra = info.obra;

        ctx.save();

        if (obra && obra.progresso < 100) {
          const prog = obra.progresso || 20;
          const chavePeca = prog < 25 ? 'peca_estacas' : (prog < 50 ? 'peca_alicerce' : (prog < 75 ? 'peca_paredes' : 'peca_telhado'));
          this.desenharSpriteOuFallback(ctx, chavePeca, p.x - 36 * esc, p.y - 28 * esc, 72 * esc, 56 * esc);

          ctx.fillStyle = 'rgba(8, 24, 39, 0.92)';
          ctx.fillRect(p.x - 26 * esc, p.y + 30 * esc, 52 * esc, 7 * esc);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(p.x - 25 * esc, p.y + 31 * esc, (50 * esc * prog) / 100, 5 * esc);
        } else {
          this.desenharCasaVila(ctx, p.x, p.y, nivel, esc);
        }

        // Plaqueta limpa da Casa
        const largPlaca = Math.max(88, 96 * esc);
        const altPlaca = 18;
        ctx.fillStyle = 'rgba(9, 20, 34, 0.90)';
        ctx.strokeStyle = c.cor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(p.x - largPlaca * 0.5, p.y - 46 * esc, largPlaca, altPlaca, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`🏠 ${c.dono}`, p.x, p.y - 46 * esc + 12.5);

        ctx.restore();
      });
    }

    desenharCasaVila(ctx, cx, cy, nivel, esc = 1) {
      const chaveNv = `casa_nv${nivel}`;
      const spr = this.sprites[chaveNv];
      const larg = 78 * esc;
      const alt = 70 * esc;
      if (spr && spr.complete && spr.naturalWidth > 0) {
        ctx.drawImage(spr, cx - larg * 0.5, cy - alt * 0.52, larg, alt);
        return;
      }

      // Renderização procedural de Casa Residencial de Alvenaria e Telhado Cerâmico
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(esc, esc);

      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(0, 26, 36, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chaminé de tijolos
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(14, -30, 9, 20);
      // Fumaça
      for (let i = 0; i < 3; i++) {
        const fy = -34 - ((this.tempo * 18 + i * 10) % 18);
        const fx = 18 + Math.sin(this.tempo * 3 + i) * 3;
        ctx.fillStyle = 'rgba(241, 245, 249, 0.5)';
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5 + i * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Alicerce de pedra
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-30, 14, 60, 10);
      ctx.strokeRect(-30, 14, 60, 10);

      // Paredes claras de alvenaria (creme/marfim) com vigas
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.8;
      ctx.fillRect(-28, -8, 56, 24);
      ctx.strokeRect(-28, -8, 56, 24);

      // Porta em arco
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-7, 2, 14, 20, [5, 5, 0, 0]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(4, 12, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Duas janelas envidraçadas com floreiras
      [-20, 10].forEach(jx => {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(jx, -2, 10, 10);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(jx, -2, 10, 10);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(jx - 1, 8, 12, 3);
      });

      // Telhado cerâmico vermelho em duas águas
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(-34, -6);
      ctx.lineTo(34, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    desenharElementosIlhaCentral(ctx) {
      const esc = this.boxAtual.escala;

      // 1. Brilho vivo e fagulhas na Fogueira Central (já pintada no mapa)
      const pFogo = this.coordZona('fogueira', 'ilha_central');
      ctx.save();
      const pulso = 34 + Math.sin(this.tempo * 6) * 4;
      const gradCalor = ctx.createRadialGradient(pFogo.x, pFogo.y, 3, pFogo.x, pFogo.y, pulso * esc);
      gradCalor.addColorStop(0, 'rgba(251, 146, 60, 0.50)');
      gradCalor.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = gradCalor;
      ctx.beginPath();
      ctx.arc(pFogo.x, pFogo.y, pulso * esc, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 4; i++) {
        const sparkY = pFogo.y - 10 - ((this.tempo * 24 + i * 12) % 26);
        const sparkX = pFogo.x + Math.sin(this.tempo * 5 + i) * 5;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. Horta Comunitária no lote cercado direito
      const pFaz = this.coordZona('fazenda', 'ilha_central');
      ctx.save();
      const eco = (this.estadoAtual && this.estadoAtual.mundo && this.estadoAtual.mundo.ecossistema) || {};
      const horta = eco.horta || { plantados: 4, maduros: 2 };
      const faseHorta = (horta.maduros > 2) ? 'canteiro_maduro' : (horta.plantados > 0 ? 'canteiro_broto' : 'canteiro_arado');
      this.desenharSpriteOuFallback(ctx, faseHorta, pFaz.x - 26 * esc, pFaz.y - 18 * esc, 52 * esc, 36 * esc);
      this.desenharEtiquetaMapa(ctx, pFaz.x, pFaz.y + 24 * esc, '🌱 Horta', '#86efac', '#14532d');
      ctx.restore();

      // 3. Curral Comunitário no lote cercado superior
      const pCurral = this.coordZona('curral', 'ilha_central');
      this.desenharSpriteOuFallback(ctx, 'curral', pCurral.x - 24 * esc, pCurral.y - 18 * esc, 48 * esc, 36 * esc);
      this.desenharEtiquetaMapa(ctx, pCurral.x, pCurral.y + 22 * esc, '🐾 Curral', '#fde68a', '#78350f');

      // 4. Venda Comunitária
      const pVenda = this.coordZona('venda', 'ilha_central');
      this.desenharSpriteOuFallback(ctx, 'mercado', pVenda.x - 28 * esc, pVenda.y - 22 * esc, 56 * esc, 44 * esc);
      this.desenharEtiquetaMapa(ctx, pVenda.x, pVenda.y + 24 * esc, '🏪 Venda', '#fef08a', '#b45309');

      // 5. Placas clicáveis de transição para os outros 3 Mapas (Bosque, Caverna, Praia)
      const pBosque = this.coordZona('bosque', 'ilha_central');
      this.desenharEtiquetaMapa(ctx, pBosque.x, pBosque.y, '🌲 Ir ao Bosque ↗', '#bbf7d0', '#15803d');

      const pCaverna = this.coordZona('caverna', 'ilha_central');
      this.desenharEtiquetaMapa(ctx, pCaverna.x, pCaverna.y + 18 * esc, '🪨 Entrar na Caverna ↗', '#e9d5ff', '#6b21a8');

      const pPraia = this.coordZona('mar', 'ilha_central');
      this.desenharEtiquetaMapa(ctx, pPraia.x, pPraia.y, '🏖️ Ir à Praia ↗', '#bae6fd', '#0369a1');
    }

    // =========================================================================
    // MAPA 2: BOSQUE & FLORESTA ALTA (MAPA DEDICADO 2D TOP-DOWN)
    // =========================================================================
    renderizarMapaBosque(ctx, w, h) {
      const box = this.boxAtual;

      // Fundo florestal profundo nas margens
      ctx.fillStyle = '#072614';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Terreno principal do Bosque dentro da caixa proporcional
      const gradSolo = ctx.createRadialGradient(
        box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.1,
        box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.65
      );
      gradSolo.addColorStop(0, '#1e5631');
      gradSolo.addColorStop(0.6, '#144022');
      gradSolo.addColorStop(1, '#0b2915');
      ctx.fillStyle = gradSolo;
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.w, box.h, 16);
      ctx.fill();

      // Clareiras de grama macia
      const clareiras = [
        { u: 0.28, v: 0.34, rx: 0.13, ry: 0.14, cor: '#2d7a46' },
        { u: 0.52, v: 0.52, rx: 0.15, ry: 0.15, cor: '#34834e' },
        { u: 0.38, v: 0.72, rx: 0.12, ry: 0.11, cor: '#27673b' },
        { u: 0.80, v: 0.72, rx: 0.12, ry: 0.12, cor: '#235c36' }
      ];
      clareiras.forEach(c => {
        ctx.fillStyle = c.cor;
        ctx.beginPath();
        ctx.ellipse(box.x + c.u * box.w, box.y + c.v * box.h, c.rx * box.w, c.ry * box.h, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Riacho Cristalino cortando o nordeste do Bosque
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 28 * box.escala;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(box.x + box.w * 0.68, box.y + 8);
      ctx.quadraticCurveTo(box.x + box.w * 0.74, box.y + box.h * 0.32, box.x + box.w * 0.96, box.y + box.h * 0.48);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 16 * box.escala;
      ctx.stroke();

      // Trilhas de terra batida conectando a saída às clareiras do Bosque
      const rotasBosque = [
        ['saida_ilha', 'acampamento_caca'],
        ['acampamento_caca', 'serraria_lenha'],
        ['serraria_lenha', 'clareira_frutas'],
        ['serraria_lenha', 'riacho_bosque'],
        ['serraria_lenha', 'ruinas_expedicao']
      ];
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 18 * box.escala;
      ctx.lineCap = 'round';
      rotasBosque.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'bosque');
        const pb = this.coordZona(b, 'bosque');
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 10 * box.escala;
      rotasBosque.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'bosque');
        const pb = this.coordZona(b, 'bosque');
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });

      // Árvores densas (Carvalhos e Pinheiros) espalhadas pelo Bosque
      const arvoresFixas = [
        [0.10, 0.16, 'pinheiro'], [0.18, 0.14, 'carvalho'], [0.42, 0.15, 'pinheiro'],
        [0.56, 0.18, 'carvalho'], [0.88, 0.16, 'pinheiro'], [0.12, 0.48, 'carvalho'],
        [0.18, 0.58, 'pinheiro'], [0.64, 0.68, 'carvalho'], [0.90, 0.58, 'pinheiro'],
        [0.62, 0.86, 'carvalho'], [0.92, 0.84, 'pinheiro'], [0.45, 0.32, 'carvalho'],
        [0.24, 0.22, 'carvalho'], [0.33, 0.24, 'carvalho'], [0.22, 0.38, 'carvalho']
      ];
      const esc = box.escala;
      arvoresFixas.forEach(([au, av, tipo], idx) => {
        const ax = box.x + au * box.w;
        const ay = box.y + av * box.h;
        const sprKey = tipo === 'pinheiro' ? 'arvore_pinheiro' : 'arvore_carvalho';
        this.desenharSpriteOuFallback(ctx, sprKey, ax - 28 * esc, ay - 46 * esc, 56 * esc, 64 * esc);
        // Frutinhas vermelhas nas árvores do pomar
        if (au > 0.20 && au < 0.36 && av > 0.20 && av < 0.42) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(ax - 8 * esc, ay - 22 * esc, 3.2 * esc, 0, Math.PI * 2);
          ctx.arc(ax + 7 * esc, ay - 26 * esc, 3.2 * esc, 0, Math.PI * 2);
          ctx.arc(ax + 2 * esc, ay - 16 * esc, 3.2 * esc, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Detalhes visuais das Estações do Bosque
      // 1) Clareira de Corte de Lenha (Troncos e Tocos)
      const pLenha = this.coordZona('serraria_lenha', 'bosque');
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.fillRect(pLenha.x - 28 * esc, pLenha.y - 10 * esc, 36 * esc, 12 * esc);
      ctx.strokeRect(pLenha.x - 28 * esc, pLenha.y - 10 * esc, 36 * esc, 12 * esc);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(pLenha.x + 18 * esc, pLenha.y - 2 * esc, 10 * esc, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2) Ruínas Antigas & Sucata
      const pRuinas = this.coordZona('ruinas_expedicao', 'bosque');
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#1e293b';
      ctx.fillRect(pRuinas.x - 24 * esc, pRuinas.y - 18 * esc, 16 * esc, 28 * esc);
      ctx.fillRect(pRuinas.x + 8 * esc, pRuinas.y - 12 * esc, 16 * esc, 22 * esc);
      ctx.strokeRect(pRuinas.x - 24 * esc, pRuinas.y - 18 * esc, 16 * esc, 28 * esc);

      // Rótulos interativos de todas as zonas do Bosque
      Object.entries(ZONAS_POR_MAPA.bosque).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'bosque');
        const corTexto = z.portalPara ? '#fef08a' : '#dcfce7';
        const corBorda = z.portalPara ? '#eab308' : (z.cor || '#22c55e');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 24 * esc, z.nome, corTexto, corBorda);
      });

      ctx.restore();
    }

    // =========================================================================
    // MAPA 3: CAVERNA & MINAS SOMBRIAS (MAPA DEDICADO 2D TOP-DOWN)
    // =========================================================================
    renderizarMapaCaverna(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      // Fundo abissal subterrâneo
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Salão Principal Rochoso da Caverna
      const gradCav = ctx.createRadialGradient(
        box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.1,
        box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.65
      );
      gradCav.addColorStop(0, '#27272a');
      gradCav.addColorStop(0.7, '#18181b');
      gradCav.addColorStop(1, '#09090b');
      ctx.fillStyle = gradCav;
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.w, box.h, 18);
      ctx.fill();

      // Paredes de Rocha Esculpida no perímetro da Caverna
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 18 * esc;
      ctx.strokeRect(box.x + 9 * esc, box.y + 9 * esc, box.w - 18 * esc, box.h - 18 * esc);

      // Trilhos de Vagão de Mineração e Caminhos de Pedra
      const rotasCaverna = [
        ['saida_ilha', 'veio_ferro'],
        ['veio_ferro', 'galeria_cristais'],
        ['saida_ilha', 'lago_subterraneo'],
        ['galeria_cristais', 'altar_ancestral'],
        ['lago_subterraneo', 'covil_pantera']
      ];
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 16 * esc;
      ctx.lineCap = 'round';
      rotasCaverna.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'caverna');
        const pb = this.coordZona(b, 'caverna');
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });

      // Lago Subterrâneo Cristalino
      const pLago = this.coordZona('lago_subterraneo', 'caverna');
      const gradLago = ctx.createRadialGradient(pLago.x, pLago.y, 8 * esc, pLago.x, pLago.y, 75 * esc);
      gradLago.addColorStop(0, '#38bdf8');
      gradLago.addColorStop(0.6, '#0284c7');
      gradLago.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = gradLago;
      ctx.beginPath();
      ctx.ellipse(pLago.x, pLago.y, 78 * esc, 46 * esc, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cristais Brilhantes de Quartzo e Ametista na Galeria
      const pCris = this.coordZona('galeria_cristais', 'caverna');
      const coresCristal = ['#c084fc', '#38bdf8', '#e879f9', '#67e8f9'];
      for (let i = 0; i < 6; i++) {
        const cx = pCris.x + (i - 2.5) * 18 * esc;
        const cy = pCris.y - 8 * esc + (i % 2) * 10 * esc;
        const cor = coresCristal[i % coresCristal.length];
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 16 * esc);
        ctx.lineTo(cx + 8 * esc, cy);
        ctx.lineTo(cx, cy + 12 * esc);
        ctx.lineTo(cx - 8 * esc, cy);
        ctx.closePath();
        ctx.fill();
      }

      // Veios de Minério de Ferro e Ouro
      const pFerro = this.coordZona('veio_ferro', 'caverna');
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.ellipse(pFerro.x, pFerro.y - 6 * esc, 42 * esc, 24 * esc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(pFerro.x - 20 * esc, pFerro.y - 14 * esc, 12 * esc, 8 * esc);
      ctx.fillRect(pFerro.x + 6 * esc, pFerro.y - 8 * esc, 14 * esc, 9 * esc);

      // Covil da Pantera das Sombras com olhos brilhantes
      const pCovil = this.coordZona('covil_pantera', 'caverna');
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(pCovil.x, pCovil.y - 6 * esc, 38 * esc, 22 * esc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(pCovil.x - 8 * esc, pCovil.y - 8 * esc, 3 * esc, 0, Math.PI * 2);
      ctx.arc(pCovil.x + 8 * esc, pCovil.y - 8 * esc, 3 * esc, 0, Math.PI * 2);
      ctx.fill();

      // Tochas acesas nas paredes projetando halos de luz quente
      const tochas = [[0.24, 0.36], [0.50, 0.22], [0.35, 0.65], [0.72, 0.52]];
      tochas.forEach(([tu, tv], idx) => {
        const tx = box.x + tu * box.w;
        const ty = box.y + tv * box.h;
        const rLuz = (46 + Math.sin(this.tempo * 7 + idx) * 5) * esc;
        const gLuz = ctx.createRadialGradient(tx, ty, 2, tx, ty, rLuz);
        gLuz.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        gLuz.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = gLuz;
        ctx.beginPath();
        ctx.arc(tx, ty, rLuz, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(tx, ty, 4 * esc, 0, Math.PI * 2);
        ctx.fill();
      });

      // Rótulos interativos das Zonas da Caverna
      Object.entries(ZONAS_POR_MAPA.caverna).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'caverna');
        const corTexto = z.portalPara ? '#fef08a' : '#f3e8ff';
        const corBorda = z.portalPara ? '#eab308' : (z.cor || '#a855f7');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 24 * esc, z.nome, corTexto, corBorda);
      });

      ctx.restore();
    }

    // =========================================================================
    // MAPA 4: PRAIA & LITORAL SUL (MAPA DEDICADO 2D TOP-DOWN)
    // =========================================================================
    renderizarMapaPraia(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      // Fundo oceânico
      ctx.fillStyle = '#042f4b';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // 1. Faixa de Vegetação Costeira no Topo (Transição para a Ilha Central)
      ctx.fillStyle = '#15803d';
      ctx.fillRect(box.x, box.y, box.w, box.h * 0.18);

      // 2. Faixa de Areia Dourada Ensolarada
      const gradAreia = ctx.createLinearGradient(0, box.y + box.h * 0.15, 0, box.y + box.h * 0.58);
      gradAreia.addColorStop(0, '#fde68a');
      gradAreia.addColorStop(0.7, '#fcd34d');
      gradAreia.addColorStop(1, '#d97706');
      ctx.fillStyle = gradAreia;
      ctx.fillRect(box.x, box.y + box.h * 0.16, box.w, box.h * 0.42);

      // 3. Águas Rasas Turquesa e Mar Profundo ao Sul
      const gradMar = ctx.createLinearGradient(0, box.y + box.h * 0.54, 0, box.y + box.h);
      gradMar.addColorStop(0, '#38bdf8');
      gradMar.addColorStop(0.35, '#0284c7');
      gradMar.addColorStop(1, '#075985');
      ctx.fillStyle = gradMar;
      ctx.fillRect(box.x, box.y + box.h * 0.54, box.w, box.h * 0.46);

      // Espuma animada das ondas quebrando na areia
      const ondaOffset = Math.sin(this.tempo * 2.5) * 6 * esc;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 4 * esc;
      ctx.beginPath();
      for (let x = box.x; x <= box.x + box.w; x += 24) {
        const y = box.y + box.h * 0.55 + Math.sin((x * 0.03) + this.tempo * 2) * 5 * esc + ondaOffset;
        if (x === box.x) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Píer de Madeira avançando sobre o mar
      const pPier = this.coordZona('pier_pesca', 'praia');
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.fillRect(pPier.x - 24 * esc, box.y + box.h * 0.46, 48 * esc, box.h * 0.22);
      ctx.strokeRect(pPier.x - 24 * esc, box.y + box.h * 0.46, 48 * esc, box.h * 0.22);

      // Barco ancorado ao lado do Píer
      this.desenharSpriteOuFallback(ctx, 'barco', pPier.x + 28 * esc, pPier.y - 18 * esc, 56 * esc, 44 * esc);

      // Palmeira e Coqueiros na Areia
      const palmeiras = [[0.14, 0.28], [0.26, 0.30], [0.34, 0.25], [0.72, 0.26], [0.86, 0.28]];
      palmeiras.forEach(([pu, pv]) => {
        const px = box.x + pu * box.w;
        const py = box.y + pv * box.h;
        this.desenharSpriteOuFallback(ctx, 'palmeira', px - 28 * esc, py - 44 * esc, 56 * esc, 56 * esc);
      });

      // Recife de Corais Coloridos
      const pCorais = this.coordZona('recife_corais', 'praia');
      ['#f43f5e', '#a855f7', '#fbbf24', '#2dd4bf'].forEach((cor, i) => {
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(pCorais.x + (i - 1.5) * 16 * esc, pCorais.y - 6 * esc + (i % 2) * 8 * esc, 7 * esc, 0, Math.PI * 2);
        ctx.fill();
      });

      // Rótulos interativos das Zonas da Praia
      Object.entries(ZONAS_POR_MAPA.praia).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'praia');
        const corTexto = z.portalPara ? '#fef08a' : '#e0f2fe';
        const corBorda = z.portalPara ? '#eab308' : (z.cor || '#0284c7');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 24 * esc, z.nome, corTexto, corBorda);
      });

      ctx.restore();
    }

    desenharEtiquetaMapa(ctx, x, y, texto, corTexto = '#ffffff', corBorda = '#0284c7') {
      ctx.save();
      ctx.font = 'bold 10px system-ui';
      const larg = Math.max(76, ctx.measureText(texto).width + 16);
      const alt = 18;
      ctx.fillStyle = 'rgba(8, 20, 34, 0.88)';
      ctx.strokeStyle = corBorda;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(x - larg * 0.5, y - alt * 0.5, larg, alt, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = corTexto;
      ctx.textAlign = 'center';
      ctx.fillText(texto, x, y + 3.5);
      ctx.restore();
    }

    desenharPersonagensEAcoes(ctx, w, h) {
      const lista = Object.values(this.personagens);
      lista.sort((a, b) => a.y - b.y);
      const esc = Math.max(0.75, Math.min(1.1, this.boxAtual.escala));

      lista.forEach(p => {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          p.x += (dx / dist) * Math.min(dist, 2.6);
          p.y += (dy / dist) * Math.min(dist, 2.6);
          p.passo += 0.22;
        }

        this.desenharPersonagemAnimado(ctx, p, 0.86 * esc);
        this.desenharActionFigure(ctx, p, Math.sin(p.passo || 0) * 2);
      });
    }

    desenharPersonagemAnimado(ctx, p, u = 0.88) {
      const now = performance.now();
      const x = p.x;
      const y = p.y;
      const id = p.id || 'icaro';
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);
      const caminhando = dist > 2;

      const seed = id.charCodeAt(0) * 17 + (id.charCodeAt(1) || 0);
      const camisa = p.cor || '#10b981';
      const pele = id === 'joao' ? '#e5b287' : (id === 'maria' ? '#f3c6a0' : (id === 'lara' ? '#f6ceb0' : '#eac096'));
      const peleSombra = '#c89267';
      const cabelo = (id === 'lara' || id === 'elara') ? { cor: '#451a03', longo: true } :
                     (id === 'maria') ? { cor: '#1c1917', longo: true } :
                     (id === 'joao') ? { cor: '#3a2f28', longo: false } :
                     { cor: '#27201c', longo: false };

      const acaoId = String(p.acao || '').toLowerCase();
      const pescando = acaoId.includes('pesc');
      const cacando = acaoId.includes('caç') || acaoId.includes('fera') || acaoId.includes('onça') || acaoId.includes('pantera');
      const cortando = acaoId.includes('madeira') || acaoId.includes('lenha') || acaoId.includes('arvore') || acaoId.includes('cortar');
      const plantando = acaoId.includes('plant') || acaoId.includes('horta') || acaoId.includes('colher');
      const explorando = acaoId.includes('caverna') || acaoId.includes('explor') || this.mapaAtivo === 'caverna';

      const passo = caminhando ? Math.sin(p.passo || 0) * 5.2 * u : Math.sin(now / 320 + seed) * 0.8 * u;
      const resp = Math.sin(now / 240 + seed) * 1.2 * u;
      const bob = caminhando ? Math.abs(Math.sin(p.passo || 0)) * 2.2 * u : resp * 0.5;
      const F = y + bob;

      ctx.save();

      // Sombra sob os pés
      ctx.fillStyle = 'rgba(10, 18, 14, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x, y + 4, 14 * u, 5.5 * u, 0, 0, Math.PI * 2);
      ctx.fill();

      if (cabelo.longo) {
        const ventoCab = Math.sin(now / 380 + seed) * 2.5 * u;
        ctx.fillStyle = cabelo.cor;
        ctx.strokeStyle = '#1a1c2c';
        ctx.lineWidth = 1.2 * u;
        ctx.beginPath();
        ctx.moveTo(x - 9 * u, F - 36 * u);
        ctx.quadraticCurveTo(x - 13 * u + ventoCab, F - 25 * u, x - 8 * u + ventoCab, F - 17 * u);
        ctx.lineTo(x + 8 * u + ventoCab, F - 17 * u);
        ctx.quadraticCurveTo(x + 13 * u + ventoCab, F - 25 * u, x + 9 * u, F - 36 * u);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      const legL = passo * 0.55;
      const legR = -passo * 0.55;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 5.2 * u;
      ctx.beginPath();
      ctx.moveTo(x - 4.5 * u, F - 14 * u);
      ctx.lineTo(x - 5 * u + legL * 0.4, F - 7 * u);
      ctx.lineTo(x - 5 * u + legL, F - 2 * u);
      ctx.moveTo(x + 4.5 * u, F - 14 * u);
      ctx.lineTo(x + 5 * u + legR * 0.4, F - 7 * u);
      ctx.lineTo(x + 5 * u + legR, F - 2 * u);
      ctx.stroke();

      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#1a1c2c';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.roundRect(x - 8.5 * u + legL, F - 4 * u, 6.5 * u, 4.5 * u, 2 * u);
      ctx.roundRect(x + 2 * u + legR, F - 4 * u, 6.5 * u, 4.5 * u, 2 * u);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#5c3a1e';
      ctx.beginPath();
      ctx.roundRect(x - 10 * u, F - 28 * u, 20 * u, 12 * u, 3 * u);
      ctx.fill();
      ctx.stroke();

      const gradTorso = ctx.createLinearGradient(x - 9 * u, F - 29 * u, x + 9 * u, F - 13 * u);
      gradTorso.addColorStop(0, camisa);
      gradTorso.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradTorso;
      ctx.strokeStyle = '#1a1c2c';
      ctx.lineWidth = 1.4 * u;
      ctx.beginPath();
      ctx.moveTo(x - 8.5 * u, F - 28 * u);
      ctx.quadraticCurveTo(x, F - 30 * u, x + 8.5 * u, F - 28 * u);
      ctx.lineTo(x + 7.5 * u, F - 13 * u);
      ctx.quadraticCurveTo(x, F - 12 * u, x - 7.5 * u, F - 13 * u);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const swing = caminhando ? -passo * 0.6 : Math.sin(now / 280 + seed) * 1.5 * u;
      const maoDirY = (pescando || cacando || cortando || plantando || explorando) ? (F - 22 * u + Math.sin(now / 160) * 2 * u) : (F - 15 * u - swing);
      const maoDirX = (pescando || cacando || cortando || explorando) ? (x + 14 * u) : (x + 10.5 * u);

      ctx.strokeStyle = camisa;
      ctx.lineWidth = 4.4 * u;
      ctx.beginPath();
      ctx.moveTo(x - 8.5 * u, F - 26 * u);
      ctx.lineTo(x - 11 * u, F - 19 * u + swing * 0.5);
      ctx.stroke();
      ctx.strokeStyle = pele;
      ctx.lineWidth = 3.6 * u;
      ctx.beginPath();
      ctx.moveTo(x - 11 * u, F - 19 * u + swing * 0.5);
      ctx.lineTo(x - 10.5 * u, F - 14 * u + swing);
      ctx.stroke();

      ctx.strokeStyle = camisa;
      ctx.lineWidth = 4.4 * u;
      ctx.beginPath();
      ctx.moveTo(x + 8.5 * u, F - 26 * u);
      ctx.lineTo(x + 11 * u, F - 20 * u);
      ctx.stroke();
      ctx.strokeStyle = pele;
      ctx.lineWidth = 3.6 * u;
      ctx.beginPath();
      ctx.moveTo(x + 11 * u, F - 20 * u);
      ctx.lineTo(maoDirX, maoDirY);
      ctx.stroke();

      if (explorando) {
        const fxT = maoDirX + 6 * u, fyT = maoDirY - 13 * u;
        const gT = ctx.createRadialGradient(fxT, fyT, 1, fxT, fyT, 12 * u);
        gT.addColorStop(0, 'rgba(255,214,110,0.95)');
        gT.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = gT;
        ctx.beginPath();
        ctx.arc(fxT, fyT, 12 * u, 0, Math.PI * 2);
        ctx.fill();
      }

      const cy = F - 38 * u + resp * 0.35;
      ctx.fillStyle = pele;
      ctx.strokeStyle = '#1a1c2c';
      ctx.lineWidth = 1.3 * u;
      ctx.beginPath();
      ctx.ellipse(x, cy, 9 * u, 10 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(x - 3.6 * u, cy + 0.2 * u, 2 * u, 1.6 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 3.6 * u, cy + 0.2 * u, 2 * u, 1.6 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e1b18';
      ctx.beginPath(); ctx.arc(x - 3.6 * u, cy + 0.3 * u, 1.2 * u, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 3.6 * u, cy + 0.3 * u, 1.2 * u, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = cabelo.cor;
      ctx.beginPath();
      ctx.arc(x, cy - 1.8 * u, 9.8 * u, Math.PI * 0.92, Math.PI * 2.08);
      ctx.fill();

      // Plaqueta do Personagem
      ctx.fillStyle = 'rgba(8, 24, 39, 0.92)';
      ctx.strokeStyle = camisa;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(x - 42, F - 56, 84, 20, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(p.nome, x, F - 43);

      ctx.restore();
    }

    desenharActionFigure(ctx, p, bob) {
      const acao = String(p.acao || '').toLowerCase();
      let chaveSprite = null;

      if (acao.includes('pesc') || acao.includes('peixe')) {
        chaveSprite = 'pescar';
      } else if (acao.includes('madeira') || acao.includes('lenha') || acao.includes('cortar')) {
        chaveSprite = 'cortar_lenha';
      } else if (acao.includes('caç') || acao.includes('fera') || acao.includes('luta') || acao.includes('onça') || acao.includes('pantera')) {
        chaveSprite = 'cacar_onca';
      } else if (acao.includes('plant') || acao.includes('horta') || acao.includes('colher')) {
        chaveSprite = 'plantar';
      }

      if (chaveSprite && this.sprites[chaveSprite] && this.sprites[chaveSprite].complete) {
        const figX = p.x + 18;
        const figY = p.y - 54 + bob + Math.sin(this.tempo * 4) * 2.5;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(figX + 18, figY + 18, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(this.sprites[chaveSprite], figX, figY, 36, 36);
        ctx.restore();
      }
    }

    desenharBaloesDialogo(ctx) {
      const agora = Date.now();
      Object.keys(this.baloes).forEach(serId => {
        const b = this.baloes[serId];
        if (agora > b.expiraEm) {
          delete this.baloes[serId];
          return;
        }

        const p = this.personagens[serId];
        if (!p) return;

        ctx.save();
        const texto = b.texto.slice(0, 70);
        ctx.font = '11px system-ui';
        const larg = Math.min(210, ctx.measureText(texto).width + 18);

        const bx = p.x - larg * 0.5;
        const by = p.y - 74;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(bx, by, larg, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(texto, p.x, by + 16);
        ctx.restore();
      });
    }

    desenharSpriteOuFallback(ctx, chave, x, y, larg, alt) {
      const spr = this.sprites[chave];
      if (spr && spr.complete && spr.naturalWidth > 0) {
        ctx.drawImage(spr, x, y, larg, alt);
      } else {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x, y, larg, alt);
        ctx.strokeStyle = '#f59e0b';
        ctx.strokeRect(x, y, larg, alt);
      }
    }

    tratarClique(e) {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 1. Checa clique nos Habitantes para abrir o Card Individual
      const listaP = Object.values(this.personagens);
      for (const p of listaP) {
        if (Math.hypot(clickX - p.x, clickY - (p.y - 18)) < 32) {
          if (typeof window.abrirCardHabitanteRPG === 'function') {
            window.abrirCardHabitanteRPG(p.id);
            return;
          }
        }
      }

      // 2. Checa clique nas Zonas / Casas / Portais do mapa ativo
      const zonasMapa = ZONAS_POR_MAPA[this.mapaAtivo] || {};
      for (const [zid, zinfo] of Object.entries(zonasMapa)) {
        const p = this.coordZona(zid, this.mapaAtivo);
        if (Math.hypot(clickX - p.x, clickY - p.y) < 44) {
          if (zinfo.portalPara) {
            if (typeof window.mudarZonaMundo === 'function') {
              window.mudarZonaMundo(zinfo.portalPara);
            } else {
              this.mudarRegiao(zinfo.portalPara);
            }
            return;
          }
          if (zid === 'venda' && typeof window.abrirVendinhaComunitaria === 'function') {
            window.abrirVendinhaComunitaria();
            return;
          }
          if (this.mapaAtivo !== 'ilha_central') {
            // Move o personagem em foco para esta estação do submapa
            this.posicoesLocaisSubmapa[this.mapaAtivo].icaro = zid;
            const pIcaro = this.personagens.icaro;
            if (pIcaro) {
              pIcaro.targetX = p.x;
              pIcaro.targetY = p.y;
              pIcaro.acao = zinfo.nome;
            }
            if (window.mostrarToast) {
              window.mostrarToast(`Explorando ${zinfo.nome}`);
            }
            return;
          }
          this.abrirPainelLocal(zid);
          return;
        }
      }
    }

    mudarRegiao(regiaoId) {
      const idNorm = normalizarIdMapa(regiaoId);
      const cfg = MAPAS_REGIOES[idNorm] || MAPAS_REGIOES.ilha_central;
      this.mapaAtivo = cfg.id;
      this.reposicionarPersonagensNoMapaAtivo();

      // Atualiza o indicador de região no HUD se existir
      const elReg = document.getElementById('hud-regiao');
      if (elReg) elReg.textContent = cfg.tituloCompleto;

      // Sincroniza transição no backend de instâncias (sem travar UI)
      fetch('/api/rpg/regiao/mudar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serId: 'icaro', regiaoDestinoId: cfg.idBackend })
      }).catch(() => {});

      if (window.mostrarToast) {
        window.mostrarToast(`Mapa alterado: ${cfg.tituloCompleto}`);
      }
    }

    abrirPainelLocal(localId) {
      if (typeof window.abrirPainelLocal === 'function') {
        window.abrirPainelLocal(localId);
      }
    }
  }

  window.MotorRpgTiled = MotorRpgTiled;
  window.motorRpgTiled = new MotorRpgTiled();
})(window);

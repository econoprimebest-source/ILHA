/**
 * MOTOR RPG TILED — Motor Oficial 2D RPG Isométrico/Top-Down (Ilha Aurora — Missão K)
 *
 * - Proporção 3:2 exata preservada em qualquer tela (Z Fold 2 fechado/aberto, celular, desktop)
 * - 4 Propriedades Individuais completas (Ícaro, Elara, João, Maria):
 *   * Casa RPG de alvenaria, pedra e telhado cerâmico (sem barracas de camping; casa sempre visível mesmo em obra!)
 *   * Terreno delimitado nivelado + Fazenda Individual fisicamente integrada a cada propriedade
 *   * Indicador visual dos recursos individuais de cada casa/habitante
 * - Praça Comercial nivelada e pavimentada com Mercadinho completo (sem quadrado marrom e sem duplicação)
 * - Oficina de Fabricação e Mirante/Observatório integrados
 * - 5 Regiões e Mapas Independentes Navegáveis:
 *   1. ilha_central (🏝️ Ilha Central / Vila Aurora)
 *   2. caverna      (🪨 Caverna & Ruínas)
 *   3. bosque       (🌲 Floresta & Santuário)
 *   4. praia        (🏖️ Praia)
 *   5. cachoeira    (💧 Cachoeira de Banho)
 * - Movimentação fluida por rota de waypoints quando os habitantes recebem comandos no chat
 */
(function (window) {
  'use strict';

  const CORES_PERSONAGENS = {
    icaro: '#10b981', // Esmeralda
    lara: '#a855f7',  // Roxo Real (Elara)
    elara: '#a855f7',
    joao: '#3b82f6',  // Azul Oceano
    maria: '#f59e0b', // Âmbar Dourado
    pantera: '#dc2626'
  };

  function normalizarIdMapa(id) {
    const s = String(id || '').toLowerCase();
    if (s.includes('cachoeira') || s.includes('banho')) return 'cachoeira';
    if (s.includes('bosque') || s.includes('floresta') || s.includes('santuario')) return 'bosque';
    if (s.includes('caverna') || s.includes('mina') || s.includes('ruina')) return 'caverna';
    if (s.includes('praia') || s.includes('mar') || s.includes('litoral')) return 'praia';
    return 'ilha_central';
  }

  const MAPAS_REGIOES = {
    ilha_central: {
      id: 'ilha_central',
      idBackend: 'mapa_global',
      nome: '🏝️ Ilha Central',
      tituloCompleto: '🏝️ Ilha Central — Vila Aurora'
    },
    caverna: {
      id: 'caverna',
      idBackend: 'regiao_caverna',
      nome: '🪨 Caverna & Ruínas',
      tituloCompleto: '🪨 Caverna & Ruínas Subterrâneas'
    },
    bosque: {
      id: 'bosque',
      idBackend: 'regiao_bosque',
      nome: '🌲 Floresta & Santuário',
      tituloCompleto: '🌲 Floresta & Santuário Antigo'
    },
    praia: {
      id: 'praia',
      idBackend: 'regiao_praia',
      nome: '🏖️ Praia',
      tituloCompleto: '🏖️ Praia & Litoral Sul'
    },
    cachoeira: {
      id: 'cachoeira',
      idBackend: 'regiao_cachoeira',
      nome: '💧 Cachoeira de Banho',
      tituloCompleto: '💧 Cachoeira de Banho & Lago Cristalino'
    }
  };

  const ZONAS_POR_MAPA = {
    ilha_central: {
      casa_icaro:    { u: 0.214, v: 0.445, nome: '🏠 Casa do Ícaro' },
      fazenda_icaro: { u: 0.214, v: 0.542, nome: '🌱 Fazenda do Ícaro' },
      casa_elara:    { u: 0.332, v: 0.455, nome: '🏡 Casa da Elara' },
      fazenda_elara: { u: 0.332, v: 0.548, nome: '🌿 Fazenda da Elara' },
      casa_lara:     { u: 0.332, v: 0.455, nome: '🏡 Casa da Elara' },
      fazenda_lara:  { u: 0.332, v: 0.548, nome: '🌿 Fazenda da Elara' },
      casa_joao:     { u: 0.476, v: 0.185, nome: '🏠 Casa do João' },
      fazenda_joao:  { u: 0.583, v: 0.198, nome: '🌾 Fazenda do João' },
      casa_maria:    { u: 0.855, v: 0.535, nome: '🏡 Casa da Maria' },
      fazenda_maria: { u: 0.948, v: 0.545, nome: '🌻 Fazenda da Maria' },
      fazenda:       { u: 0.948, v: 0.545, nome: '🌻 Fazenda da Maria' },
      fogueira:      { u: 0.492, v: 0.476, nome: '🔥 Fogueira Central' },
      acampamento:   { u: 0.445, v: 0.500, nome: '⛺ Praça Central' },
      venda:         { u: 0.425, v: 0.630, nome: '🏪 Mercadinho (Praça Comercial)' },
      oficina:       { u: 0.568, v: 0.465, nome: '⚒️ Oficina de Fabricação' },
      observatorio:  { u: 0.135, v: 0.205, nome: '🔭 Mirante & Observatório' },
      curral:        { u: 0.855, v: 0.640, nome: '🐾 Curral' },
      arena:         { u: 0.565, v: 0.375, nome: '⚔️ Arena de Treino' },
      bosque:        { u: 0.255, v: 0.245, nome: '🌲 Floresta & Santuário ↗', portalPara: 'bosque' },
      floresta:      { u: 0.815, v: 0.295, nome: '🌲 Floresta Leste ↗', portalPara: 'bosque' },
      caverna:       { u: 0.932, v: 0.175, nome: '🪨 Caverna & Ruínas ↗', portalPara: 'caverna' },
      cachoeira:     { u: 0.730, v: 0.115, nome: '💧 Cachoeira de Banho ↗', portalPara: 'cachoeira' },
      rio:           { u: 0.692, v: 0.420, nome: '🌉 Ponte do Rio' },
      mar:           { u: 0.350, v: 0.825, nome: '🏖️ Ir à Praia ↗', portalPara: 'praia' },
      barco:         { u: 0.502, v: 0.845, nome: '⛵ Porto & Píer ↗', portalPara: 'praia' }
    },
    caverna: {
      saida_ilha:       { u: 0.14, v: 0.52, nome: '🚪 Escadaria → Ilha Central', portalPara: 'ilha_central' },
      veio_ferro:       { u: 0.36, v: 0.26, nome: '⛏️ Jazida de Ferro & Pedra', cor: '#f59e0b', recurso: 'pedra' },
      galeria_cristais: { u: 0.64, v: 0.24, nome: '💎 Galeria de Cristais Luminosos', cor: '#c084fc', recurso: 'pedra' },
      ruinas_ancestrais:{ u: 0.52, v: 0.48, nome: '🏛️ Ruínas Subterrâneas Ancestrais', cor: '#38bdf8' },
      lago_subterraneo: { u: 0.46, v: 0.76, nome: '🌊 Lago Subterrâneo Cristalino', cor: '#0284c7', recurso: 'agua' },
      covil_pantera:    { u: 0.84, v: 0.74, nome: '🐾 Covil das Sombras', cor: '#ef4444' }
    },
    bosque: {
      saida_ilha:       { u: 0.14, v: 0.84, nome: '🚪 Trilha → Ilha Central', portalPara: 'ilha_central' },
      clareira_frutas:  { u: 0.28, v: 0.32, nome: '🍎 Pomar de Frutas Silvestres', cor: '#22c55e', recurso: 'alimento' },
      serraria_lenha:   { u: 0.50, v: 0.54, nome: '🪵 Clareira de Corte de Madeira', cor: '#d97706', recurso: 'madeira' },
      santuario_antigo: { u: 0.78, v: 0.30, nome: '⛩️ Santuário da Fé & Sabedoria', cor: '#a855f7' },
      riacho_bosque:    { u: 0.76, v: 0.72, nome: '💧 Riacho da Floresta', cor: '#38bdf8', recurso: 'agua' },
      acampamento_caca: { u: 0.36, v: 0.74, nome: '🏹 Posto de Exploração', cor: '#f59e0b' }
    },
    praia: {
      saida_ilha:       { u: 0.50, v: 0.14, nome: '🚪 Caminho → Ilha Central', portalPara: 'ilha_central' },
      coqueiral:        { u: 0.22, v: 0.34, nome: '🌴 Coqueiral da Costa', cor: '#22c55e', recurso: 'alimento' },
      banco_conchas:    { u: 0.78, v: 0.34, nome: '🐚 Banco de Conchas & Pérolas', cor: '#f472b6' },
      pier_pesca:       { u: 0.50, v: 0.62, nome: '⛵ Píer de Pesca & Barco', cor: '#f59e0b', recurso: 'alimento' },
      recife_corais:    { u: 0.82, v: 0.74, nome: '🪸 Recife de Corais', cor: '#06b6d4' },
      destrocos_baia:   { u: 0.20, v: 0.72, nome: '📦 Destroços & Suprimentos', cor: '#fbbf24' }
    },
    cachoeira: {
      saida_ilha:          { u: 0.50, v: 0.88, nome: '🚪 Trilha → Ilha Central', portalPara: 'ilha_central' },
      queda_principal:     { u: 0.50, v: 0.22, nome: '💦 Grande Queda d\'Água Pura', cor: '#38bdf8', recurso: 'agua' },
      lago_banho:          { u: 0.50, v: 0.52, nome: '🛁 Lago Natural de Banho', cor: '#06b6d4', recurso: 'banho' },
      pedras_contemplacao: { u: 0.76, v: 0.46, nome: '🧘 Pedras de Sol & Contemplação', cor: '#a855f7' },
      jardim_lirios:       { u: 0.24, v: 0.48, nome: '🎋 Bambuzal & Lírios D\'Água', cor: '#22c55e' },
      nascente_cristalina: { u: 0.28, v: 0.26, nome: '💧 Nascente de Água Doce', cor: '#67e8f9', recurso: 'agua' }
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
      this.imgFundo = null;
      this.fundoPronto = false;
      this.sprites = {};
      this.baloes = {};
      this.boxAtual = { x: 0, y: 0, w: 1280, h: 853, escala: 1 };
      this.posicoesLocaisSubmapa = {
        bosque:    { icaro: 'serraria_lenha', elara: 'santuario_antigo', lara: 'santuario_antigo', joao: 'acampamento_caca', maria: 'clareira_frutas' },
        caverna:   { icaro: 'veio_ferro', elara: 'galeria_cristais', lara: 'galeria_cristais', joao: 'ruinas_ancestrais', maria: 'lago_subterraneo' },
        praia:     { icaro: 'pier_pesca', elara: 'banco_conchas', lara: 'banco_conchas', joao: 'destrocos_baia', maria: 'coqueiral' },
        cachoeira: { icaro: 'lago_banho', elara: 'pedras_contemplacao', lara: 'pedras_contemplacao', joao: 'nascente_cristalina', maria: 'jardim_lirios' }
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
      } catch (err) {}

      try {
        const regParam = new URLSearchParams(window.location.search).get('regiao');
        if (regParam) {
          this.mapaAtivo = normalizarIdMapa(regParam);
        }
      } catch (_) {}

      this.iniciarLoop();
    }

    carregarFundo() {
      this.imgFundo = new Image();
      this.imgFundo.onload = () => { this.fundoPronto = true; };
      this.imgFundo.onerror = () => { this.fundoPronto = false; };
      this.imgFundo.src = '/mapa-ilha-nova.png?v=20261116_2050';
    }

    carregarSprites() {
      const lista = [
        ['pescar', '/assets/sprites/acao_pescar.svg'],
        ['cortar_lenha', '/assets/sprites/acao_cortar_lenha.svg'],
        ['cacar_onca', '/assets/sprites/acao_cacar_onca.svg'],
        ['plantar', '/assets/sprites/acao_plantar.svg'],
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
        ['curral', '/assets/sprites/curral.svg'],
        ['barco', '/assets/sprites/barco.svg'],
        ['mercado', '/assets/sprites/mercado.svg'],
        ['arvore_carvalho', '/assets/sprites/arvore_carvalho.svg'],
        ['arvore_pinheiro', '/assets/sprites/arvore_pinheiro.svg'],
        ['palmeira', '/assets/sprites/palmeira.svg']
      ];

      const versao = '20261116_2055';
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

    recalcularCaixa(w, h) {
      const ar = (this.imgFundo && this.imgFundo.naturalWidth && this.imgFundo.naturalHeight)
        ? (this.imgFundo.naturalWidth / this.imgFundo.naturalHeight)
        : 1.5;
      let mw = w;
      let mh = mw / ar;
      if (mh > h) {
        mh = h;
        mw = mh * ar;
      }
      const mx = (w - mw) * 0.5;
      const my = (h - mh) * 0.5;
      const escala = Math.max(0.55, Math.min(1.30, mw / 1100));
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
      const subMap = this.posicoesLocaisSubmapa[this.mapaAtivo] || {};
      let poiKey = subMap[ser.id];
      if (!poiKey) {
        const chaves = Object.keys(ZONAS_POR_MAPA[this.mapaAtivo] || {});
        poiKey = chaves[1] || chaves[0] || 'saida_ilha';
      }
      return this.coordZona(poiKey, this.mapaAtivo);
    }

    atualizarEstado(stateData) {
      this.estadoAtual = stateData;
      if (!stateData || !stateData.seres) return;

      const vistos = new Set();
      let idx = 0;
      Object.values(stateData.seres).forEach((ser) => {
        if (!ser) return;
        const idCanonico = (ser.id === 'lara' || ser.id === 'elara') ? 'elara' : ser.id;
        if (vistos.has(idCanonico)) return;
        vistos.add(idCanonico);

        if (ser.status === 'morto') {
          delete this.personagens[idCanonico];
          return;
        }

        const nomeDisplay = idCanonico === 'elara' ? 'Elara' : (ser.nome || idCanonico);
        const dest = this.obterDestinoPersonagem(ser);
        const offsetAng = (idx * Math.PI * 0.5) + 0.3;
        idx++;
        const offX = Math.cos(offsetAng) * 12;
        const offY = Math.sin(offsetAng) * 8;

        let p = this.personagens[idCanonico] || (idCanonico === 'elara' ? this.personagens.lara : null);
        if (!p) {
          p = {
            id: idCanonico,
            nome: nomeDisplay,
            x: dest.x + offX,
            y: dest.y + offY,
            targetX: dest.x + offX,
            targetY: dest.y + offY,
            waypoints: [],
            ultimoTrajetoTs: 0,
            acao: ser.acao || ser.ultimaAcao || 'Observando',
            fala: ser.ultimaFala || '',
            cor: CORES_PERSONAGENS[idCanonico] || '#38bdf8',
            passo: 0
          };
        }
        p.id = idCanonico;
        p.nome = nomeDisplay;
        this.personagens[idCanonico] = p;
        if (this.personagens.lara && idCanonico === 'elara') {
          delete this.personagens.lara;
        }

        // Se houve novo trajeto de comando no mapa central, monta a fila de waypoints para caminhar visualmente pela trilha!
        if (this.mapaAtivo === 'ilha_central' && ser.ultimoTrajeto && ser.ultimoTrajeto.timestamp > (p.ultimoTrajetoTs || 0)) {
          const idadeTrajeto = Date.now() - ser.ultimoTrajeto.timestamp;
          p.ultimoTrajetoTs = ser.ultimoTrajeto.timestamp;
          const cam = Array.isArray(ser.ultimoTrajeto.caminho) ? ser.ultimoTrajeto.caminho : [];
          if (cam.length > 1 && idadeTrajeto < 15000) {
            const ptIni = this.coordZona(cam[0], 'ilha_central');
            p.x = ptIni.x + offX;
            p.y = ptIni.y + offY;
            p.rotaPontos = cam.map(noId => {
              const c = this.coordZona(noId, 'ilha_central');
              return { x: c.x + offX, y: c.y + offY, nome: c.info?.nome || noId };
            });
            p.rotaExpiraEm = Date.now() + 10000;
            p.waypoints = p.rotaPontos.slice(1).map(pt => ({ x: pt.x, y: pt.y }));
          }
        }

        if (!p.waypoints || p.waypoints.length === 0) {
          p.targetX = dest.x + offX;
          p.targetY = dest.y + offY;
        }
        p.acao = ser.acao || ser.ultimaAcao || ser.local || 'Observando';
        p.local = ser.local;

        if (ser.ultimaFala && ser.ultimaFala !== p.fala) {
          p.fala = ser.ultimaFala;
          this.baloes[idCanonico] = {
            texto: ser.ultimaFala,
            expiraEm: Date.now() + 9000
          };
        }
      });
    }

    reposicionarPersonagensNoMapaAtivo() {
      if (!this.estadoAtual || !this.estadoAtual.seres) return;
      const vistos = new Set();
      let idx = 0;
      Object.values(this.estadoAtual.seres).forEach((ser) => {
        if (!ser) return;
        const idCanonico = (ser.id === 'lara' || ser.id === 'elara') ? 'elara' : ser.id;
        if (vistos.has(idCanonico)) return;
        vistos.add(idCanonico);
        const p = this.personagens[idCanonico];
        if (!p) return;
        const dest = this.obterDestinoPersonagem(ser);
        const offsetAng = (idx * Math.PI * 0.5) + 0.3;
        idx++;
        p.waypoints = [];
        p.x = dest.x + Math.cos(offsetAng) * 12;
        p.y = dest.y + Math.sin(offsetAng) * 8;
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

      if (this.mapaAtivo === 'bosque') {
        this.renderizarMapaBosque(ctx, w, h);
      } else if (this.mapaAtivo === 'caverna') {
        this.renderizarMapaCaverna(ctx, w, h);
      } else if (this.mapaAtivo === 'praia') {
        this.renderizarMapaPraia(ctx, w, h);
      } else if (this.mapaAtivo === 'cachoeira') {
        this.renderizarMapaCachoeira(ctx, w, h);
      } else {
        this.renderizarMapaIlhaCentral(ctx, w, h);
      }

      this.desenharPersonagensEAcoes(ctx, w, h);
      this.desenharBaloesDialogo(ctx);
    }

    // =========================================================================
    // 1. ILHA CENTRAL — VILA AURORA (CASAS, FAZENDAS INDIVIDUAIS, MERCADINHO)
    // =========================================================================
    renderizarMapaIlhaCentral(ctx, w, h) {
      const box = this.boxAtual;

      const gradMar = ctx.createRadialGradient(w * 0.5, h * 0.5, box.w * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      gradMar.addColorStop(0, '#0c689b');
      gradMar.addColorStop(0.65, '#074871');
      gradMar.addColorStop(1, '#042a46');
      ctx.fillStyle = gradMar;
      ctx.fillRect(0, 0, w, h);

      if (this.fundoPronto && this.imgFundo && this.imgFundo.complete) {
        ctx.drawImage(this.imgFundo, box.x, box.y, box.w, box.h);
      }

      // 1. Propriedades Individuais (Terreno Delimitado + Casa RPG + Fazenda Individual Integrada)
      this.desenharPropriedadesEFazendas(ctx);

      // 2. Praça Comercial Nivelada + Mercadinho
      this.desenharAreaComercialMercadinho(ctx);

      // 3. Oficina, Observatório, Fogueira Central e Portais das 5 Regiões
      this.desenharElementosIlhaCentral(ctx);
    }

    desenharPropriedadesEFazendas(ctx) {
      const esc = this.boxAtual.escala;
      const casasMundo = (this.estadoAtual && this.estadoAtual.mundo && this.estadoAtual.mundo.casas) || {};
      const seresMundo = (this.estadoAtual && this.estadoAtual.seres) || {};

      const propriedades = [
        { casaId: 'casa_icaro', fazendaId: 'fazenda_icaro', serKey: 'icaro', dono: 'Ícaro', rotuloCasa: '🏠 Casa do Ícaro', rotuloFazenda: '🌱 Fazenda do Ícaro', cor: '#10b981', prepararTerreno: true },
        { casaId: 'casa_elara', fazendaId: 'fazenda_elara', serKey: 'elara', dono: 'Elara', rotuloCasa: '🏡 Casa da Elara', rotuloFazenda: '🌿 Fazenda da Elara', cor: '#a855f7', prepararTerreno: true },
        { casaId: 'casa_joao',  fazendaId: 'fazenda_joao',  serKey: 'joao',  dono: 'João',  rotuloCasa: '🏠 Casa do João',  rotuloFazenda: '🌾 Fazenda do João',  cor: '#3b82f6', prepararTerreno: false },
        { casaId: 'casa_maria', fazendaId: 'fazenda_maria', serKey: 'maria', dono: 'Maria', rotuloCasa: '🏡 Casa da Maria', rotuloFazenda: '🌻 Fazenda da Maria', cor: '#f59e0b', prepararTerreno: false }
      ];

      propriedades.forEach(prop => {
        const pCasa = this.coordZona(prop.casaId, 'ilha_central');
        const pFaz = this.coordZona(prop.fazendaId, 'ilha_central');
        const infoCasa = casasMundo[prop.casaId] || (prop.casaId === 'casa_elara' ? casasMundo.casa_lara : null) || { nivel: 1, bau: {}, horta: {}, obra: null };
        const serObj = seresMundo[prop.serKey] || (prop.serKey === 'elara' ? seresMundo.lara : null) || { inventario: {} };
        const nivel = Math.max(1, Math.min(5, infoCasa.nivel || 1));
        const bau = infoCasa.bau || {};
        const inv = serObj.inventario || {};
        const horta = infoCasa.horta || { plantados: 3, maduros: 2, cultura: 'Hortaliças' };

        const comidaProp = Math.round((Number(inv.alimento) || 0) + (Number(bau.alimento) || 0));
        const madeiraProp = Math.round((Number(inv.madeira) || 0) + (Number(bau.madeira) || 0));
        const pedraProp = Math.round((Number(inv.pedra) || 0) + (Number(bau.pedra) || 0));

        ctx.save();

        // A) Terreno delimitado individual (Propriedade do Ícaro e Propriedade da Elara com cercas individuais próprias)
        if (prop.prepararTerreno) {
          ctx.fillStyle = '#b48250';
          ctx.strokeStyle = '#5c3a1e';
          ctx.lineWidth = 2.2 * esc;
          ctx.beginPath();
          ctx.roundRect(pCasa.x - 42 * esc, pCasa.y - 28 * esc, 84 * esc, 118 * esc, 8 * esc);
          ctx.fill();
          ctx.stroke();

          // Cerca de estacas ao redor da Propriedade Individual
          ctx.fillStyle = '#78350f';
          for (let dx = -38; dx <= 38; dx += 12) {
            ctx.fillRect(pCasa.x + dx * esc - 2, pCasa.y - 30 * esc, 4 * esc, 6 * esc);
            ctx.fillRect(pCasa.x + dx * esc - 2, pCasa.y + 86 * esc, 4 * esc, 6 * esc);
          }
        }

        // B) Caminho interno ligando a Casa à sua Fazenda Individual
        ctx.strokeStyle = 'rgba(180, 115, 55, 0.75)';
        ctx.lineWidth = 10 * esc;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pCasa.x, pCasa.y + 18 * esc);
        ctx.lineTo(pFaz.x, pFaz.y - 8 * esc);
        ctx.stroke();

        // C) SEMPRE desenha a Casa RPG completa (mesmo se houver obra de ampliação em curso!)
        this.desenharCasaVila(ctx, pCasa.x, pCasa.y, nivel, esc);

        // Se houver obra de ampliação para o próximo nível, mostra um indicador discreto ao lado sem apagar a casa
        if (infoCasa.obra && infoCasa.obra.progresso < 100) {
          const prog = Math.round(infoCasa.obra.progresso || 20);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(pCasa.x + 22 * esc, pCasa.y + 4 * esc, 46 * esc, 14 * esc, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 8.5px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`🔨+${prog}%`, pCasa.x + 45 * esc, pCasa.y + 14 * esc);
        }

        // D) Plaqueta da Casa com Nome e Estoque Individual da Propriedade (Comida, Madeira, Pedra)
        const largPlaca = Math.max(114, 122 * esc);
        const altPlaca = 28;
        ctx.fillStyle = 'rgba(8, 20, 34, 0.92)';
        ctx.strokeStyle = prop.cor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(pCasa.x - largPlaca * 0.5, pCasa.y - 54 * esc, largPlaca, altPlaca, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${prop.rotuloCasa} (Nv ${nivel})`, pCasa.x, pCasa.y - 54 * esc + 11.5);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 9px system-ui';
        ctx.fillText(`🍖${comidaProp}  🪵${madeiraProp}  🪨${pedraProp}`, pCasa.x, pCasa.y - 54 * esc + 23.5);

        // E) FAZENDA INDIVIDUAL INTEGRADA À PROPRIEDADE
        const faseHorta = (horta.maduros >= 2) ? 'canteiro_maduro' : (horta.plantados > 0 ? 'canteiro_broto' : 'canteiro_arado');
        this.desenharCanteiroFazenda(ctx, pFaz.x, pFaz.y, faseHorta, esc, prop.rotuloFazenda, prop.cor);

        ctx.restore();
      });
    }

    desenharCanteiroFazenda(ctx, fx, fy, chaveSprite, esc, rotuloFazenda, corBorda) {
      ctx.save();
      // Base de solo arado fértil delimitado
      ctx.fillStyle = '#5c3415';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.8 * esc;
      ctx.beginPath();
      ctx.roundRect(fx - 26 * esc, fy - 16 * esc, 52 * esc, 32 * esc, 5 * esc);
      ctx.fill();
      ctx.stroke();

      const spr = this.sprites[chaveSprite];
      if (spr && spr.complete && spr.naturalWidth > 0) {
        ctx.drawImage(spr, fx - 24 * esc, fy - 15 * esc, 48 * esc, 30 * esc);
      } else {
        // Sulcos e brotos verdes
        for (let sy = -10; sy <= 10; sy += 7) {
          ctx.strokeStyle = '#3b1f0b';
          ctx.lineWidth = 2 * esc;
          ctx.beginPath();
          ctx.moveTo(fx - 20 * esc, fy + sy * esc);
          ctx.lineTo(fx + 20 * esc, fy + sy * esc);
          ctx.stroke();
          for (let sx = -14; sx <= 14; sx += 9) {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(fx + sx * esc, fy + sy * esc - 1, 2.8 * esc, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Etiqueta compacta da Fazenda Individual
      ctx.fillStyle = 'rgba(8, 22, 36, 0.90)';
      ctx.strokeStyle = corBorda;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(fx - 46 * esc, fy + 16 * esc, 92 * esc, 14, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 8.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(rotuloFazenda, fx, fy + 16 * esc + 10);
      ctx.restore();
    }

    desenharAreaComercialMercadinho(ctx) {
      const esc = this.boxAtual.escala;
      const pVenda = this.coordZona('venda', 'ilha_central');
      const pFogo = this.coordZona('fogueira', 'ilha_central');

      ctx.save();
      // 1. Caminho pavimentado conectando a Praça Central à Praça Comercial do Mercadinho
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 14 * esc;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pFogo.x - 12 * esc, pFogo.y + 20 * esc);
      ctx.lineTo(pVenda.x, pVenda.y);
      ctx.stroke();

      // 2. Terreno aberto, nivelado e calçado em pedra para a Praça Comercial
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2 * esc;
      ctx.beginPath();
      ctx.ellipse(pVenda.x, pVenda.y + 6 * esc, 48 * esc, 26 * esc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(pVenda.x, pVenda.y + 5 * esc, 42 * esc, 21 * esc, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Estrutura do Mercadinho (usa sprite SVG se carregado, ou desenha o Mercadinho RPG detalhado com toldo listrado)
      const sprMerc = this.sprites['mercado'];
      if (sprMerc && sprMerc.complete && sprMerc.naturalWidth > 0) {
        ctx.drawImage(sprMerc, pVenda.x - 34 * esc, pVenda.y - 28 * esc, 68 * esc, 54 * esc);
      } else {
        // Desenho procedural rico do Mercadinho (NUNCA um quadrado marrom!)
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.8 * esc;
        ctx.fillRect(pVenda.x - 28 * esc, pVenda.y - 12 * esc, 56 * esc, 26 * esc);
        ctx.strokeRect(pVenda.x - 28 * esc, pVenda.y - 12 * esc, 56 * esc, 26 * esc);

        // Balcão de madeira com mercadorias
        ctx.fillStyle = '#92400e';
        ctx.fillRect(pVenda.x - 26 * esc, pVenda.y + 2 * esc, 52 * esc, 10 * esc);

        // Toldo listrado vermelho e dourado
        for (let i = -2; i <= 2; i++) {
          ctx.fillStyle = (i % 2 === 0) ? '#dc2626' : '#facc15';
          ctx.fillRect(pVenda.x + i * 11 * esc - 5.5 * esc, pVenda.y - 22 * esc, 11 * esc, 12 * esc);
        }
      }

      // 4. Placa da Praça Comercial & Mercadinho
      this.desenharEtiquetaMapa(ctx, pVenda.x, pVenda.y + 30 * esc, '🏪 Mercadinho & Praça Comercial', '#fef08a', '#f59e0b');
      ctx.restore();
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

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(esc, esc);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(0, 26, 36, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(14, -30, 9, 20);

      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-30, 14, 60, 10);
      ctx.strokeRect(-30, 14, 60, 10);

      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.8;
      ctx.fillRect(-28, -8, 56, 24);
      ctx.strokeRect(-28, -8, 56, 24);

      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-7, 2, 14, 20, [5, 5, 0, 0]);
      ctx.fill();
      ctx.stroke();

      [-20, 10].forEach(jx => {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(jx, -2, 10, 10);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(jx, -2, 10, 10);
      });

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

      // 1. Brilho vivo na Fogueira Central
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
      ctx.restore();

      // 2. Oficina de Fabricação (Expansão Criativa da Vila)
      const pOfi = this.coordZona('oficina', 'ilha_central');
      ctx.save();
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pOfi.x - 18 * esc, pOfi.y - 10 * esc, 36 * esc, 20 * esc, 4);
      ctx.fill();
      ctx.stroke();
      this.desenharEtiquetaMapa(ctx, pOfi.x, pOfi.y + 18 * esc, '⚒️ Oficina', '#cbd5e1', '#64748b');
      ctx.restore();

      // 3. Mirante & Observatório no Noroeste
      const pObs = this.coordZona('observatorio', 'ilha_central');
      this.desenharEtiquetaMapa(ctx, pObs.x, pObs.y, '🔭 Observatório', '#bae6fd', '#0284c7');

      // 4. Portais Clicáveis para as outras 4 Regiões Independentes
      const pBosque = this.coordZona('bosque', 'ilha_central');
      this.desenharEtiquetaMapa(ctx, pBosque.x, pBosque.y, '🌲 Floresta & Santuário ↗', '#bbf7d0', '#16a34a');

      const pCaverna = this.coordZona('caverna', 'ilha_central');
      this.desenharEtiquetaMapa(ctx, pCaverna.x, pCaverna.y + 18 * esc, '🪨 Caverna & Ruínas ↗', '#e9d5ff', '#9333ea');

      const pCachoeira = this.coordZona('cachoeira', 'ilha_central');
      this.desenharEtiquetaMapa(ctx, pCachoeira.x, pCachoeira.y + 14 * esc, '💧 Cachoeira de Banho ↗', '#cffafe', '#06b6d4');

      const pPraia = this.coordZona('mar', 'ilha_central');
      this.desenharEtiquetaMapa(ctx, pPraia.x, pPraia.y, '🏖️ Praia ↗', '#fef08a', '#0284c7');
    }

    // =========================================================================
    // 2. FLORESTA & SANTUÁRIO (MAPA PRÓPRIO INDEPENDENTE)
    // =========================================================================
    renderizarMapaBosque(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      ctx.fillStyle = '#072614';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
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

      // Clareiras
      const clareiras = [
        { u: 0.28, v: 0.32, rx: 0.13, ry: 0.14, cor: '#2d7a46' },
        { u: 0.50, v: 0.54, rx: 0.15, ry: 0.15, cor: '#34834e' },
        { u: 0.78, v: 0.30, rx: 0.14, ry: 0.13, cor: '#27673b' },
        { u: 0.36, v: 0.74, rx: 0.12, ry: 0.11, cor: '#235c36' }
      ];
      clareiras.forEach(c => {
        ctx.fillStyle = c.cor;
        ctx.beginPath();
        ctx.ellipse(box.x + c.u * box.w, box.y + c.v * box.h, c.rx * box.w, c.ry * box.h, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Riacho da Floresta
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 26 * esc;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(box.x + box.w * 0.65, box.y + box.h * 0.50);
      ctx.quadraticCurveTo(box.x + box.w * 0.76, box.y + box.h * 0.72, box.x + box.w * 0.95, box.y + box.h * 0.88);
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 14 * esc;
      ctx.stroke();

      // Trilhas conectadas
      const rotasBosque = [
        ['saida_ilha', 'acampamento_caca'],
        ['acampamento_caca', 'serraria_lenha'],
        ['serraria_lenha', 'clareira_frutas'],
        ['serraria_lenha', 'santuario_antigo'],
        ['serraria_lenha', 'riacho_bosque']
      ];
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 16 * esc;
      rotasBosque.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'bosque');
        const pb = this.coordZona(b, 'bosque');
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      });

      // Santuário Antigo de Pedra e Fé
      const pSant = this.coordZona('santuario_antigo', 'bosque');
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2 * esc;
      ctx.beginPath();
      ctx.arc(pSant.x, pSant.y, 32 * esc, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(pSant.x, pSant.y, 10 * esc, 0, Math.PI * 2);
      ctx.fill();

      // Árvores
      const arvoresFixas = [
        [0.10, 0.16, 'pinheiro'], [0.18, 0.14, 'carvalho'], [0.42, 0.15, 'pinheiro'],
        [0.56, 0.18, 'carvalho'], [0.90, 0.16, 'pinheiro'], [0.12, 0.48, 'carvalho'],
        [0.18, 0.58, 'pinheiro'], [0.64, 0.78, 'carvalho'], [0.92, 0.52, 'pinheiro'],
        [0.24, 0.22, 'carvalho'], [0.33, 0.24, 'carvalho'], [0.22, 0.36, 'carvalho']
      ];
      arvoresFixas.forEach(([au, av, tipo]) => {
        const ax = box.x + au * box.w;
        const ay = box.y + av * box.h;
        const sprKey = tipo === 'pinheiro' ? 'arvore_pinheiro' : 'arvore_carvalho';
        this.desenharSpriteOuFallback(ctx, sprKey, ax - 28 * esc, ay - 46 * esc, 56 * esc, 64 * esc);
      });

      Object.entries(ZONAS_POR_MAPA.bosque).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'bosque');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 24 * esc, z.nome, z.portalPara ? '#fef08a' : '#dcfce7', z.portalPara ? '#eab308' : (z.cor || '#22c55e'));
      });
      ctx.restore();
    }

    // =========================================================================
    // 3. CAVERNA & RUÍNAS (MAPA PRÓPRIO INDEPENDENTE)
    // =========================================================================
    renderizarMapaCaverna(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
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

      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 18 * esc;
      ctx.strokeRect(box.x + 9 * esc, box.y + 9 * esc, box.w - 18 * esc, box.h - 18 * esc);

      const rotasCaverna = [
        ['saida_ilha', 'veio_ferro'],
        ['veio_ferro', 'ruinas_ancestrais'],
        ['ruinas_ancestrais', 'galeria_cristais'],
        ['saida_ilha', 'lago_subterraneo'],
        ['lago_subterraneo', 'covil_pantera']
      ];
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 16 * esc;
      ctx.lineCap = 'round';
      rotasCaverna.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'caverna');
        const pb = this.coordZona(b, 'caverna');
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      });

      // Ruínas Subterrâneas Ancestrais
      const pRui = this.coordZona('ruinas_ancestrais', 'caverna');
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2 * esc;
      ctx.strokeRect(pRui.x - 36 * esc, pRui.y - 22 * esc, 72 * esc, 44 * esc);
      ctx.fillRect(pRui.x - 32 * esc, pRui.y - 18 * esc, 12 * esc, 36 * esc);
      ctx.fillRect(pRui.x + 20 * esc, pRui.y - 18 * esc, 12 * esc, 36 * esc);

      // Lago Subterrâneo
      const pLago = this.coordZona('lago_subterraneo', 'caverna');
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(pLago.x, pLago.y, 70 * esc, 40 * esc, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cristais
      const pCris = this.coordZona('galeria_cristais', 'caverna');
      ['#c084fc', '#38bdf8', '#e879f9', '#67e8f9'].forEach((cor, i) => {
        const cx = pCris.x + (i - 1.5) * 18 * esc;
        const cy = pCris.y - 6 * esc;
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 16 * esc);
        ctx.lineTo(cx + 8 * esc, cy);
        ctx.lineTo(cx, cy + 12 * esc);
        ctx.lineTo(cx - 8 * esc, cy);
        ctx.closePath();
        ctx.fill();
      });

      // Tochas
      [[0.24, 0.36], [0.50, 0.22], [0.35, 0.65], [0.72, 0.52]].forEach(([tu, tv], idx) => {
        const tx = box.x + tu * box.w;
        const ty = box.y + tv * box.h;
        const rLuz = (46 + Math.sin(this.tempo * 7 + idx) * 5) * esc;
        const gLuz = ctx.createRadialGradient(tx, ty, 2, tx, ty, rLuz);
        gLuz.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        gLuz.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = gLuz;
        ctx.beginPath(); ctx.arc(tx, ty, rLuz, 0, Math.PI * 2); ctx.fill();
      });

      Object.entries(ZONAS_POR_MAPA.caverna).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'caverna');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 24 * esc, z.nome, z.portalPara ? '#fef08a' : '#f3e8ff', z.portalPara ? '#eab308' : (z.cor || '#a855f7'));
      });
      ctx.restore();
    }

    // =========================================================================
    // 4. PRAIA & LITORAL SUL (MAPA PRÓPRIO INDEPENDENTE)
    // =========================================================================
    renderizarMapaPraia(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      ctx.fillStyle = '#042f4b';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(box.x, box.y, box.w, box.h * 0.18);

      const gradAreia = ctx.createLinearGradient(0, box.y + box.h * 0.15, 0, box.y + box.h * 0.58);
      gradAreia.addColorStop(0, '#fde68a');
      gradAreia.addColorStop(0.7, '#fcd34d');
      gradAreia.addColorStop(1, '#d97706');
      ctx.fillStyle = gradAreia;
      ctx.fillRect(box.x, box.y + box.h * 0.16, box.w, box.h * 0.42);

      const gradMar = ctx.createLinearGradient(0, box.y + box.h * 0.54, 0, box.y + box.h);
      gradMar.addColorStop(0, '#38bdf8');
      gradMar.addColorStop(0.35, '#0284c7');
      gradMar.addColorStop(1, '#075985');
      ctx.fillStyle = gradMar;
      ctx.fillRect(box.x, box.y + box.h * 0.54, box.w, box.h * 0.46);

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

      const pPier = this.coordZona('pier_pesca', 'praia');
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.fillRect(pPier.x - 24 * esc, box.y + box.h * 0.46, 48 * esc, box.h * 0.22);
      ctx.strokeRect(pPier.x - 24 * esc, box.y + box.h * 0.46, 48 * esc, box.h * 0.22);

      this.desenharSpriteOuFallback(ctx, 'barco', pPier.x + 28 * esc, pPier.y - 18 * esc, 56 * esc, 44 * esc);

      [[0.14, 0.28], [0.26, 0.30], [0.34, 0.25], [0.72, 0.26], [0.86, 0.28]].forEach(([pu, pv]) => {
        const px = box.x + pu * box.w;
        const py = box.y + pv * box.h;
        this.desenharSpriteOuFallback(ctx, 'palmeira', px - 28 * esc, py - 44 * esc, 56 * esc, 56 * esc);
      });

      Object.entries(ZONAS_POR_MAPA.praia).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'praia');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 24 * esc, z.nome, z.portalPara ? '#fef08a' : '#e0f2fe', z.portalPara ? '#eab308' : (z.cor || '#0284c7'));
      });
      ctx.restore();
    }

    // =========================================================================
    // 5. CACHOEIRA DE BANHO (NOVO MAPA PRÓPRIO INDEPENDENTE — MISSÃO K)
    // =========================================================================
    renderizarMapaCachoeira(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      ctx.fillStyle = '#082f27';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Gramado exuberante do vale da cachoeira
      const gradVale = ctx.createRadialGradient(
        box.x + box.w * 0.5, box.y + box.h * 0.55, box.w * 0.1,
        box.x + box.w * 0.5, box.y + box.h * 0.55, box.w * 0.65
      );
      gradVale.addColorStop(0, '#15803d');
      gradVale.addColorStop(0.7, '#166534');
      gradVale.addColorStop(1, '#064e3b');
      ctx.fillStyle = gradVale;
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.w, box.h, 18);
      ctx.fill();

      // Paredão Rochoso Escarpado ao Norte
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3 * esc;
      ctx.fillRect(box.x, box.y, box.w, box.h * 0.28);
      ctx.strokeRect(box.x, box.y, box.w, box.h * 0.28);

      // Grande Lago Natural Cristalino de Banho no Centro
      const pLago = this.coordZona('lago_banho', 'cachoeira');
      const gradLago = ctx.createRadialGradient(pLago.x, pLago.y, 12 * esc, pLago.x, pLago.y, box.w * 0.26);
      gradLago.addColorStop(0, '#67e8f9');
      gradLago.addColorStop(0.55, '#06b6d4');
      gradLago.addColorStop(1, '#0369a1');
      ctx.fillStyle = gradLago;
      ctx.beginPath();
      ctx.ellipse(pLago.x, pLago.y, box.w * 0.27, box.h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Queda d'Água Animada despencando do Paredão para o Lago
      const pQueda = this.coordZona('queda_principal', 'cachoeira');
      const largQueda = 84 * esc;
      const altQueda = (pLago.y - box.y - box.h * 0.05);
      const gradQueda = ctx.createLinearGradient(0, box.y, 0, pLago.y);
      gradQueda.addColorStop(0, '#e0f2fe');
      gradQueda.addColorStop(0.5, '#38bdf8');
      gradQueda.addColorStop(1, '#bae6fd');
      ctx.fillStyle = gradQueda;
      ctx.fillRect(pQueda.x - largQueda * 0.5, box.y + 10 * esc, largQueda, altQueda - 20 * esc);

      // Linhas verticais animadas da espuma da cachoeira
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 3 * esc;
      for (let i = -3; i <= 3; i++) {
        const lx = pQueda.x + i * 10 * esc;
        const offY = (this.tempo * 90 + Math.abs(i) * 17) % (altQueda * 0.6);
        ctx.beginPath();
        ctx.moveTo(lx, box.y + 14 * esc + offY);
        ctx.lineTo(lx, box.y + 38 * esc + offY);
        ctx.stroke();
      }

      // Espuma borbulhante na base da queda d'água
      for (let i = 0; i < 7; i++) {
        const rx = pQueda.x + (i - 3) * 14 * esc;
        const ry = pLago.y - box.h * 0.12 + Math.sin(this.tempo * 6 + i) * 3 * esc;
        const rr = (9 + Math.sin(this.tempo * 4 + i) * 2.5) * esc;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.beginPath();
        ctx.arc(rx, ry, rr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pedras de Sol e Contemplação à direita do lago
      const pPedras = this.coordZona('pedras_contemplacao', 'cachoeira');
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2 * esc;
      ctx.beginPath();
      ctx.ellipse(pPedras.x, pPedras.y, 38 * esc, 22 * esc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Trilha de acesso sul até a borda do Lago de Banho
      const pSaida = this.coordZona('saida_ilha', 'cachoeira');
      ctx.strokeStyle = '#b48250';
      ctx.lineWidth = 18 * esc;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pSaida.x, pSaida.y);
      ctx.lineTo(pLago.x, pLago.y + box.h * 0.21);
      ctx.stroke();

      // Árvores ao redor do vale da cachoeira
      [[0.12, 0.36], [0.16, 0.68], [0.86, 0.36], [0.84, 0.72]].forEach(([au, av]) => {
        this.desenharSpriteOuFallback(ctx, 'arvore_carvalho', box.x + au * box.w - 28 * esc, box.y + av * box.h - 46 * esc, 56 * esc, 64 * esc);
      });

      Object.entries(ZONAS_POR_MAPA.cachoeira).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'cachoeira');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 24 * esc, z.nome, z.portalPara ? '#fef08a' : '#cffafe', z.portalPara ? '#eab308' : (z.cor || '#06b6d4'));
      });
      ctx.restore();
    }

    desenharEtiquetaMapa(ctx, x, y, texto, corTexto = '#ffffff', corBorda = '#0284c7') {
      ctx.save();
      ctx.font = 'bold 10px system-ui';
      const larg = Math.max(76, ctx.measureText(texto).width + 16);
      const alt = 18;
      ctx.fillStyle = 'rgba(8, 20, 34, 0.90)';
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
        // Desenha trilha iluminada se estiver em deslocamento de comando recente
        if (this.mapaAtivo === 'ilha_central' && p.rotaPontos && p.rotaPontos.length > 1 && Date.now() < (p.rotaExpiraEm || 0)) {
          ctx.save();
          ctx.strokeStyle = p.cor || '#10b981';
          ctx.lineWidth = 3.5 * esc;
          ctx.setLineDash([7 * esc, 5 * esc]);
          ctx.beginPath();
          p.rotaPontos.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Se houver fila de waypoints da rota calculada, avança de ponto em ponto!
        if (p.waypoints && p.waypoints.length > 0) {
          p.targetX = p.waypoints[0].x;
          p.targetY = p.waypoints[0].y;
        }

        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2.5) {
          const vel = (p.waypoints && p.waypoints.length > 0) ? 3.2 : 2.8;
          p.x += (dx / dist) * Math.min(dist, vel);
          p.y += (dy / dist) * Math.min(dist, vel);
          p.passo += 0.25;
        } else if (p.waypoints && p.waypoints.length > 0) {
          p.waypoints.shift();
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
      const caminhando = dist > 2.5;

      const seed = id.charCodeAt(0) * 17 + (id.charCodeAt(1) || 0);
      const camisa = p.cor || '#10b981';
      const pele = id === 'joao' ? '#e5b287' : (id === 'maria' ? '#f3c6a0' : (id === 'lara' ? '#f6ceb0' : '#eac096'));
      const cabelo = (id === 'lara' || id === 'elara') ? { cor: '#451a03', longo: true } :
                     (id === 'maria') ? { cor: '#1c1917', longo: true } :
                     (id === 'joao') ? { cor: '#3a2f28', longo: false } :
                     { cor: '#27201c', longo: false };

      const passo = caminhando ? Math.sin(p.passo || 0) * 5.2 * u : Math.sin(now / 320 + seed) * 0.8 * u;
      const resp = Math.sin(now / 240 + seed) * 1.2 * u;
      const bob = caminhando ? Math.abs(Math.sin(p.passo || 0)) * 2.2 * u : resp * 0.5;
      const F = y + bob;

      ctx.save();

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
      ctx.lineTo(x - 5 * u + legL, F - 2 * u);
      ctx.moveTo(x + 4.5 * u, F - 14 * u);
      ctx.lineTo(x + 5 * u + legR, F - 2 * u);
      ctx.stroke();

      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(x - 8.5 * u + legL, F - 4 * u, 6.5 * u, 4.5 * u, 2 * u);
      ctx.roundRect(x + 2 * u + legR, F - 4 * u, 6.5 * u, 4.5 * u, 2 * u);
      ctx.fill();

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
        const texto = b.texto.slice(0, 72);
        ctx.font = '11px system-ui';
        const larg = Math.min(220, ctx.measureText(texto).width + 18);

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
        if (Math.hypot(clickX - p.x, clickY - p.y) < 46) {
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
            this.posicoesLocaisSubmapa[this.mapaAtivo].icaro = zid;
            const pIcaro = this.personagens.icaro;
            if (pIcaro) {
              pIcaro.targetX = p.x;
              pIcaro.targetY = p.y;
              pIcaro.acao = zinfo.nome;
            }
            if (window.mostrarToast) {
              window.mostrarToast(`Explorando e coletando em: ${zinfo.nome}`);
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

      const elReg = document.getElementById('hud-regiao');
      if (elReg) elReg.textContent = cfg.tituloCompleto;

      fetch('/api/rpg/regiao/mudar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serId: 'icaro', regiaoDestinoId: cfg.idBackend })
      }).catch(() => {});

      if (window.mostrarToast) {
        window.mostrarToast(`Região aberta: ${cfg.tituloCompleto}`);
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

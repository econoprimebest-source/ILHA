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
      saida_ilha:       { u: 0.15, v: 0.50, nome: '🚪 1. Escadaria → Ilha Central', portalPara: 'ilha_central', numSala: 1 },
      veio_ferro:       { u: 0.28, v: 0.21, nome: '⛏️ 2. Mina de Ferro & Quartzo', cor: '#f59e0b', recurso: 'pedra', numSala: 2 },
      galeria_cristais: { u: 0.68, v: 0.21, nome: '💎 3. Santuário dos Cristais', cor: '#c084fc', recurso: 'pedra', numSala: 3 },
      ruinas_ancestrais:{ u: 0.48, v: 0.50, nome: '🏛️ 4. Salão Central das Colunas', cor: '#38bdf8', numSala: 4 },
      camera_tesouro:   { u: 0.84, v: 0.48, nome: '👑 5. Câmara do Baú Ancestral', cor: '#fbbf24', recurso: 'pedra', numSala: 5 },
      lago_subterraneo: { u: 0.32, v: 0.80, nome: '🌊 6. Gruta do Lago Subterrâneo', cor: '#0284c7', recurso: 'agua', numSala: 6 },
      covil_pantera:    { u: 0.74, v: 0.80, nome: '🐾 7. Covil da Pantera das Sombras', cor: '#ef4444', numSala: 7 }
    },
    bosque: {
      saida_ilha:       { u: 0.15, v: 0.84, nome: '🚪 1. Portão Sul → Ilha Central', portalPara: 'ilha_central', numSala: 1 },
      acampamento_caca: { u: 0.35, v: 0.66, nome: '🏹 2. Cabana do Caçador', cor: '#f59e0b', numSala: 2 },
      clareira_frutas:  { u: 0.22, v: 0.28, nome: '🍎 3. Clareira do Pomar Silvestre', cor: '#22c55e', recurso: 'alimento', numSala: 3 },
      serraria_lenha:   { u: 0.50, v: 0.44, nome: '🪵 4. Bosque dos Troncos & Lenha', cor: '#d97706', recurso: 'madeira', numSala: 4 },
      circulo_cogumelos:{ u: 0.54, v: 0.80, nome: '🍄 5. Círculo dos Cogumelos Gigantes', cor: '#f43f5e', recurso: 'alimento', numSala: 5 },
      santuario_antigo: { u: 0.79, v: 0.24, nome: '⛩️ 6. Ruínas do Santuário Antigo', cor: '#a855f7', numSala: 6 },
      riacho_bosque:    { u: 0.82, v: 0.68, nome: '💧 7. Lagoa Escondida & Ponte', cor: '#38bdf8', recurso: 'agua', numSala: 7 }
    },
    praia: {
      saida_ilha:       { u: 0.48, v: 0.14, nome: '🚪 1. Trilha das Dunas → Ilha Central', portalPara: 'ilha_central', numSala: 1 },
      coqueiral:        { u: 0.20, v: 0.34, nome: '🌴 2. Coqueiral & Cabana do Pescador', cor: '#22c55e', recurso: 'alimento', numSala: 2 },
      banco_conchas:    { u: 0.78, v: 0.34, nome: '🐚 3. Enseada das Conchas & Pérolas', cor: '#f472b6', numSala: 3 },
      pier_pesca:       { u: 0.50, v: 0.58, nome: '⛵ 4. Píer de Pesca & Cais do Barco', cor: '#f59e0b', recurso: 'alimento', numSala: 4 },
      destrocos_baia:   { u: 0.19, v: 0.74, nome: '📦 5. Galeão Naufragado & Baús', cor: '#fbbf24', recurso: 'madeira', numSala: 5 },
      recife_corais:    { u: 0.82, v: 0.72, nome: '🪸 6. Gruta Marinha & Corais', cor: '#06b6d4', numSala: 6 }
    },
    cachoeira: {
      saida_ilha:          { u: 0.50, v: 0.88, nome: '🚪 1. Escadaria Sul → Ilha Central', portalPara: 'ilha_central', numSala: 1 },
      queda_principal:     { u: 0.50, v: 0.20, nome: '💦 2. Queda d\'Água & Gruta Secreta', cor: '#38bdf8', recurso: 'agua', numSala: 2 },
      nascente_cristalina: { u: 0.22, v: 0.26, nome: '💧 3. Nascente Pura do Alto', cor: '#67e8f9', recurso: 'agua', numSala: 3 },
      lago_banho:          { u: 0.50, v: 0.54, nome: '🛁 4. Lagoa Termal & Deck de Banho', cor: '#06b6d4', recurso: 'banho', numSala: 4 },
      jardim_lirios:       { u: 0.22, v: 0.58, nome: '🎋 5. Bambuzal & Ponte Vermelha', cor: '#22c55e', numSala: 5 },
      pedras_contemplacao: { u: 0.78, v: 0.48, nome: '🧘 6. Altar de Pedras do Sol', cor: '#a855f7', numSala: 6 }
    }
  };

  // ROTAS DE CORREDORES / TRILHAS INTERNAS DOS SUBMAPAS PARA MOVIMENTAÇÃO REAL SALA A SALA
  const GRAFO_SUBMAPAS = {
    caverna: [
      ['saida_ilha', 'ruinas_ancestrais'],
      ['ruinas_ancestrais', 'veio_ferro'],
      ['ruinas_ancestrais', 'galeria_cristais'],
      ['veio_ferro', 'galeria_cristais'],
      ['ruinas_ancestrais', 'camera_tesouro'],
      ['galeria_cristais', 'camera_tesouro'],
      ['saida_ilha', 'lago_subterraneo'],
      ['ruinas_ancestrais', 'lago_subterraneo'],
      ['lago_subterraneo', 'covil_pantera'],
      ['ruinas_ancestrais', 'covil_pantera']
    ],
    bosque: [
      ['saida_ilha', 'acampamento_caca'],
      ['acampamento_caca', 'clareira_frutas'],
      ['acampamento_caca', 'serraria_lenha'],
      ['acampamento_caca', 'circulo_cogumelos'],
      ['clareira_frutas', 'serraria_lenha'],
      ['serraria_lenha', 'santuario_antigo'],
      ['serraria_lenha', 'riacho_bosque'],
      ['circulo_cogumelos', 'riacho_bosque']
    ],
    praia: [
      ['saida_ilha', 'coqueiral'],
      ['saida_ilha', 'pier_pesca'],
      ['saida_ilha', 'banco_conchas'],
      ['coqueiral', 'destrocos_baia'],
      ['coqueiral', 'pier_pesca'],
      ['pier_pesca', 'banco_conchas'],
      ['banco_conchas', 'recife_corais'],
      ['pier_pesca', 'recife_corais']
    ],
    cachoeira: [
      ['saida_ilha', 'lago_banho'],
      ['saida_ilha', 'jardim_lirios'],
      ['saida_ilha', 'pedras_contemplacao'],
      ['jardim_lirios', 'lago_banho'],
      ['jardim_lirios', 'nascente_cristalina'],
      ['nascente_cristalina', 'queda_principal'],
      ['lago_banho', 'queda_principal'],
      ['lago_banho', 'pedras_contemplacao']
    ]
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

    /**
     * REGRA DE EXCLUSIVIDADE ESPACIAL (RPG):
     * Cada personagem está em EXATAMENTE UM mapa por vez, de acordo com seu `ser.local` real no mundo!
     * Se está em casa ou na fogueira (`ilha_central`), NÃO pode aparecer na Praia, Caverna, Floresta ou Cachoeira.
     * Se entrou na Caverna (`ser.local === 'caverna'`), sai da `ilha_central` e aparece SOMENTE na `caverna`.
     */
    mapaDoLocal(localId) {
      const l = String(localId || 'fogueira').toLowerCase();
      if (l === 'caverna' || ZONAS_POR_MAPA.caverna[l]) return 'caverna';
      if (l === 'bosque' || l === 'floresta' || ZONAS_POR_MAPA.bosque[l]) return 'bosque';
      if (l === 'mar' || l === 'barco' || l === 'praia' || l === 'ilha_vizinha' || ZONAS_POR_MAPA.praia[l]) return 'praia';
      if (l === 'cachoeira' || ZONAS_POR_MAPA.cachoeira[l]) return 'cachoeira';
      return 'ilha_central';
    }

    calcularRotaSubmapa(mapaId, salaOrigem, salaDestino) {
      if (!salaOrigem || !salaDestino || salaOrigem === salaDestino) return [salaDestino || 'saida_ilha'];
      const arestas = GRAFO_SUBMAPAS[mapaId] || [];
      const fila = [[salaOrigem]];
      const visitados = new Set([salaOrigem]);
      while (fila.length > 0) {
        const cam = fila.shift();
        const atual = cam[cam.length - 1];
        if (atual === salaDestino) return cam;
        for (const [a, b] of arestas) {
          const viz = (a === atual) ? b : (b === atual ? a : null);
          if (viz && !visitados.has(viz)) {
            visitados.add(viz);
            fila.push([...cam, viz]);
          }
        }
      }
      return [salaOrigem, salaDestino];
    }

    obterDestinoPersonagem(ser) {
      const idCanonico = (ser.id === 'lara' || ser.id === 'elara') ? 'elara' : ser.id;
      const mapaSer = this.mapaDoLocal(ser.local);
      if (mapaSer === 'ilha_central') {
        return this.coordZona(ser.local || 'fogueira', 'ilha_central');
      }
      const subMap = this.posicoesLocaisSubmapa[mapaSer] || {};
      const salaDefault = mapaSer === 'caverna' ? 'ruinas_ancestrais'
                        : mapaSer === 'bosque' ? (ser.local === 'floresta' ? 'santuario_antigo' : 'serraria_lenha')
                        : mapaSer === 'praia' ? 'pier_pesca'
                        : 'lago_banho';
      const poiKey = ser.salaRegiao || subMap[idCanonico] || salaDefault;
      subMap[idCanonico] = poiKey;
      return this.coordZona(poiKey, mapaSer);
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
        const mapaAnterior = p.mapaAtual;
        const mapaReal = this.mapaDoLocal(ser.local);
        p.mapaAtual = mapaReal;
        p.salaRegiao = ser.salaRegiao || null;
        this.personagens[idCanonico] = p;
        if (this.personagens.lara && idCanonico === 'elara') {
          delete this.personagens.lara;
        }

        // Se o personagem acabou de entrar em outro mapa (ex: saiu da Ilha Central para a Caverna), inicia na entrada do submapa e caminha até a sala!
        if (mapaReal !== 'ilha_central' && mapaAnterior && mapaAnterior !== mapaReal) {
          const ptEntrada = this.coordZona('saida_ilha', mapaReal);
          p.x = ptEntrada.x + offX;
          p.y = ptEntrada.y + offY;
          const salaAlvo = ser.salaRegiao || (this.posicoesLocaisSubmapa[mapaReal] && this.posicoesLocaisSubmapa[mapaReal][idCanonico]) || 'saida_ilha';
          const rotaSalas = this.calcularRotaSubmapa(mapaReal, 'saida_ilha', salaAlvo);
          p.rotaPontos = rotaSalas.map(sId => {
            const c = this.coordZona(sId, mapaReal);
            return { x: c.x + offX, y: c.y + offY, nome: c.info?.nome || sId };
          });
          p.rotaExpiraEm = Date.now() + 10000;
          p.waypoints = p.rotaPontos.slice(1).map(pt => ({ x: pt.x, y: pt.y }));
        }

        // Se houve novo trajeto de comando no mapa central, monta a fila de waypoints para caminhar visualmente pela trilha!
        if (mapaReal === 'ilha_central' && ser.ultimoTrajeto && ser.ultimoTrajeto.timestamp > (p.ultimoTrajetoTs || 0)) {
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
        } else if (mapaReal !== 'ilha_central' && ser.ultimoTrajeto && ser.ultimoTrajeto.timestamp > (p.ultimoTrajetoTs || 0)) {
          p.ultimoTrajetoTs = ser.ultimoTrajeto.timestamp;
          const sOrig = ser.ultimoTrajeto.salaDe || 'saida_ilha';
          const sDest = ser.salaRegiao || ser.ultimoTrajeto.salaPara || 'saida_ilha';
          const rotaSalas = this.calcularRotaSubmapa(mapaReal, sOrig, sDest);
          if (rotaSalas.length > 1) {
            const ptIni = this.coordZona(rotaSalas[0], mapaReal);
            p.x = ptIni.x + offX;
            p.y = ptIni.y + offY;
            p.rotaPontos = rotaSalas.map(sId => {
              const c = this.coordZona(sId, mapaReal);
              return { x: c.x + offX, y: c.y + offY, nome: c.info?.nome || sId };
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

      // 4. Portais Clicáveis para as outras 4 Regiões Independentes (mostrando quem está lá dentro!)
      const presentesPorMapa = { bosque: [], caverna: [], cachoeira: [], praia: [] };
      Object.values(this.personagens).forEach(p => {
        const m = this.mapaDoLocal(p.local);
        if (presentesPorMapa[m]) presentesPorMapa[m].push(p.nome);
      });

      const pBosque = this.coordZona('bosque', 'ilha_central');
      const txtBosque = presentesPorMapa.bosque.length ? `🌲 Floresta (${presentesPorMapa.bosque.join(', ')}) ↗` : '🌲 Floresta & Santuário ↗';
      this.desenharEtiquetaMapa(ctx, pBosque.x, pBosque.y, txtBosque, '#bbf7d0', '#16a34a');

      const pCaverna = this.coordZona('caverna', 'ilha_central');
      const txtCaverna = presentesPorMapa.caverna.length ? `🪨 Caverna (${presentesPorMapa.caverna.join(', ')}) ↗` : '🪨 Caverna & Ruínas ↗';
      this.desenharEtiquetaMapa(ctx, pCaverna.x, pCaverna.y + 18 * esc, txtCaverna, '#e9d5ff', '#9333ea');

      const pCachoeira = this.coordZona('cachoeira', 'ilha_central');
      const txtCachoeira = presentesPorMapa.cachoeira.length ? `💧 Cachoeira (${presentesPorMapa.cachoeira.join(', ')}) ↗` : '💧 Cachoeira de Banho ↗';
      this.desenharEtiquetaMapa(ctx, pCachoeira.x, pCachoeira.y + 14 * esc, txtCachoeira, '#cffafe', '#06b6d4');

      const pPraia = this.coordZona('mar', 'ilha_central');
      const txtPraia = presentesPorMapa.praia.length ? `🏖️ Praia (${presentesPorMapa.praia.join(', ')}) ↗` : '🏖️ Praia & Enseada ↗';
      this.desenharEtiquetaMapa(ctx, pPraia.x, pPraia.y, txtPraia, '#fef08a', '#0284c7');
    }

    // =========================================================================
    // BARRA DE EXPEDIÇÃO / AVENTURA (EXCLUSIVIDADE ESPACIAL DOS SUBMAPAS)
    // =========================================================================
    desenharBarraExpedicaoSubmapa(ctx, tituloMapa, subtituloAventura) {
      const box = this.boxAtual;
      const presentes = Object.values(this.personagens).filter(p => this.mapaDoLocal(p.local) === this.mapaAtivo);
      this.botoesExpedicao = [];

      ctx.save();
      const bx = box.x + 14;
      const by = box.y + 12;
      const bw = Math.min(box.w - 28, 760);
      const bh = 44;

      ctx.fillStyle = 'rgba(10, 18, 28, 0.92)';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 11.5px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(tituloMapa, bx + 12, by + 17);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10.5px system-ui';
      if (presentes.length > 0) {
        const listaNomes = presentes.map(p => `🟢 ${p.nome}`).join('  ');
        ctx.fillText(`Explorando este mapa agora: ${listaNomes}  •  Clique em qualquer sala/área para caminhar e interagir!`, bx + 12, by + 34);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Nenhum habitante neste mapa agora (estão na Ilha Central). Traga alguém para explorar:`, bx + 12, by + 34);
      }

      // Botões rápidos para enviar/trazer habitantes para esta região ou selecionar quem comanda
      const opcoes = [
        { id: 'icaro', nome: 'Ícaro', cor: '#10b981' },
        { id: 'elara', nome: 'Elara', cor: '#a855f7' },
        { id: 'joao',  nome: 'João',  cor: '#3b82f6' },
        { id: 'maria', nome: 'Maria', cor: '#f59e0b' }
      ];
      let btnX = bx + bw - 310;
      opcoes.forEach(op => {
        const p = this.personagens[op.id];
        const estaAqui = p && this.mapaDoLocal(p.local) === this.mapaAtivo;
        const largBtn = 72;
        const altBtn = 24;
        const btnY = by + 10;

        ctx.fillStyle = estaAqui ? op.cor : 'rgba(30, 41, 59, 0.95)';
        ctx.strokeStyle = op.cor;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, largBtn, altBtn, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(estaAqui ? `✓ ${op.nome}` : `🧭 ${op.nome}`, btnX + largBtn * 0.5, btnY + 15.5);

        this.botoesExpedicao.push({
          serId: op.id,
          nome: op.nome,
          estaAqui,
          x: btnX,
          y: btnY,
          w: largBtn,
          h: altBtn
        });
        btnX += largBtn + 5;
      });

      ctx.restore();
    }

    // =========================================================================
    // 2. FLORESTA & SANTUÁRIO (MAPA RPG MODULAR DE TRILHAS E CLAREIRAS)
    // =========================================================================
    renderizarMapaBosque(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      ctx.fillStyle = '#071f10';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Base de grama de floresta com textura de grid sutil estilo RPG
      const gradSolo = ctx.createRadialGradient(
        box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.08,
        box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.70
      );
      gradSolo.addColorStop(0, '#367c39');
      gradSolo.addColorStop(0.65, '#265c29');
      gradSolo.addColorStop(1, '#133616');
      ctx.fillStyle = gradSolo;
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.w, box.h, 16);
      ctx.fill();

      // Grid tático de exploração (estilo mapa RPG de mesa/top-down)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const passoGrid = Math.max(28, Math.round(36 * esc));
      for (let gx = box.x; gx <= box.x + box.w; gx += passoGrid) {
        ctx.beginPath(); ctx.moveTo(gx, box.y); ctx.lineTo(gx, box.y + box.h); ctx.stroke();
      }
      for (let gy = box.y; gy <= box.y + box.h; gy += passoGrid) {
        ctx.beginPath(); ctx.moveTo(box.x, gy); ctx.lineTo(box.x + box.w, gy); ctx.stroke();
      }

      // 1. Clareiras abertas no meio da mata fechada (como no exemplo modular de floresta)
      const clareiras = [
        { id: 'saida_ilha',        rx: 0.085, ry: 0.095, cor: '#4d9142' },
        { id: 'acampamento_caca',  rx: 0.115, ry: 0.115, cor: '#589c49' },
        { id: 'clareira_frutas',   rx: 0.115, ry: 0.120, cor: '#61a64f' },
        { id: 'serraria_lenha',    rx: 0.125, ry: 0.120, cor: '#539445' },
        { id: 'circulo_cogumelos', rx: 0.105, ry: 0.105, cor: '#3c7a44' },
        { id: 'santuario_antigo',  rx: 0.125, ry: 0.125, cor: '#47894b' },
        { id: 'riacho_bosque',     rx: 0.125, ry: 0.125, cor: '#428546' }
      ];

      // 2. Trilhas de Terra Bifurcadas com borda de grama/pedra conectando todas as clareiras
      const rotasBosque = GRAFO_SUBMAPAS.bosque;
      // Borda escura da trilha
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 34 * esc;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      rotasBosque.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'bosque');
        const pb = this.coordZona(b, 'bosque');
        const mx = (pa.x + pb.x) * 0.5 + (pa.y > pb.y ? 14 * esc : -14 * esc);
        const my = (pa.y + pb.y) * 0.5;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.quadraticCurveTo(mx, my, pb.x, pb.y); ctx.stroke();
      });
      // Leito de terra batida clara da trilha
      ctx.strokeStyle = '#b98352';
      ctx.lineWidth = 26 * esc;
      rotasBosque.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'bosque');
        const pb = this.coordZona(b, 'bosque');
        const mx = (pa.x + pb.x) * 0.5 + (pa.y > pb.y ? 14 * esc : -14 * esc);
        const my = (pa.y + pb.y) * 0.5;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.quadraticCurveTo(mx, my, pb.x, pb.y); ctx.stroke();
      });

      // Desenha os pisos abertos das Clareiras
      clareiras.forEach(c => {
        const pt = this.coordZona(c.id, 'bosque');
        ctx.fillStyle = c.cor;
        ctx.strokeStyle = 'rgba(134, 239, 172, 0.28)';
        ctx.lineWidth = 3 * esc;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, c.rx * box.w, c.ry * box.h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // 3. Estruturas de Aventura em cada Clareira:
      // A) Cabana do Caçador (Área 2) — Cerca, cabana com telhado, fogueira de caça
      const pCaca = this.coordZona('acampamento_caca', 'bosque');
      ctx.fillStyle = '#c28d58';
      ctx.fillRect(pCaca.x - 36 * esc, pCaca.y - 22 * esc, 72 * esc, 42 * esc);
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#29170b';
      ctx.lineWidth = 2 * esc;
      ctx.fillRect(pCaca.x - 32 * esc, pCaca.y - 24 * esc, 34 * esc, 26 * esc);
      ctx.strokeRect(pCaca.x - 32 * esc, pCaca.y - 24 * esc, 34 * esc, 26 * esc);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(pCaca.x - 34 * esc, pCaca.y - 26 * esc, 38 * esc, 12 * esc);
      // Fogueira do caçador
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(pCaca.x + 16 * esc, pCaca.y - 4 * esc, 8 * esc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(pCaca.x + 16 * esc, pCaca.y - 4 * esc, 4 * esc, 0, Math.PI * 2); ctx.fill();

      // B) Clareira do Pomar Silvestre (Área 3) — Árvores frutíferas carregadas de maçãs
      const pPomar = this.coordZona('clareira_frutas', 'bosque');
      [[-30, -18], [28, -16], [-24, 18], [26, 16]].forEach(([dx, dy]) => {
        ctx.fillStyle = '#15803d';
        ctx.beginPath(); ctx.arc(pPomar.x + dx * esc, pPomar.y + dy * esc, 18 * esc, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444';
        [[-5, -4], [6, -2], [0, 6]].forEach(([fx, fy]) => {
          ctx.beginPath(); ctx.arc(pPomar.x + (dx + fx) * esc, pPomar.y + (dy + fy) * esc, 3 * esc, 0, Math.PI * 2); ctx.fill();
        });
      });

      // C) Bosque dos Troncos & Lenha (Área 4) — Troncos caídos gigantes e tocos de corte
      const pLenha = this.coordZona('serraria_lenha', 'bosque');
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2 * esc;
      ctx.beginPath();
      ctx.roundRect(pLenha.x - 36 * esc, pLenha.y - 12 * esc, 48 * esc, 14 * esc, 5 * esc);
      ctx.roundRect(pLenha.x - 16 * esc, pLenha.y + 6 * esc, 44 * esc, 12 * esc, 5 * esc);
      ctx.fill(); ctx.stroke();
      // Tocos de árvore cortados com anéis
      [[-28, 12], [26, -12]].forEach(([tx, ty]) => {
        ctx.fillStyle = '#d97706';
        ctx.beginPath(); ctx.arc(pLenha.x + tx * esc, pLenha.y + ty * esc, 9 * esc, 0, Math.PI * 2); ctx.fill();
        ctx.stroke();
      });

      // D) Círculo dos Cogumelos Gigantes (Área 5 — inspirado no End Mushroom do exemplo!)
      const pCog = this.coordZona('circulo_cogumelos', 'bosque');
      ctx.fillStyle = '#14532d';
      ctx.beginPath(); ctx.ellipse(pCog.x, pCog.y, 48 * esc, 36 * esc, 0, 0, Math.PI * 2); ctx.fill();
      [[0, -6, 18], [-24, 8, 13], [24, 10, 14], [-14, -18, 10], [18, -16, 11]].forEach(([mx, my, mr]) => {
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.8 * esc;
        ctx.beginPath(); ctx.arc(pCog.x + mx * esc, pCog.y + my * esc, mr * esc, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Pintinhas brancas do cogumelo gigante
        ctx.fillStyle = '#ffffff';
        [[-0.35, -0.25], [0.3, -0.2], [0, 0.35]].forEach(([px, py]) => {
          ctx.beginPath(); ctx.arc(pCog.x + (mx + mr * px) * esc, pCog.y + (my + mr * py) * esc, mr * 0.22 * esc, 0, Math.PI * 2); ctx.fill();
        });
      });

      // E) Ruínas do Santuário Antigo (Área 6) — Piso de pedra musgosa, colunas e altar rúnico
      const pSant = this.coordZona('santuario_antigo', 'bosque');
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5 * esc;
      ctx.beginPath(); ctx.arc(pSant.x, pSant.y, 38 * esc, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // 4 pilares de pedra ao redor do altar
      [[-24, -20], [24, -20], [-24, 20], [24, 20]].forEach(([px, py]) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath(); ctx.arc(pSant.x + px * esc, pSant.y + py * esc, 7 * esc, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = '#a855f7';
      ctx.beginPath(); ctx.arc(pSant.x, pSant.y, 12 * esc, 0, Math.PI * 2); ctx.fill();

      // F) Lagoa Escondida da Floresta & Ponte de Tronco (Área 7 — inspirado no End Lake do exemplo!)
      const pLagoa = this.coordZona('riacho_bosque', 'bosque');
      const gradLagoa = ctx.createRadialGradient(pLagoa.x, pLagoa.y, 6 * esc, pLagoa.x, pLagoa.y, 46 * esc);
      gradLagoa.addColorStop(0, '#38bdf8');
      gradLagoa.addColorStop(0.7, '#0284c7');
      gradLagoa.addColorStop(1, '#0369a1');
      ctx.fillStyle = gradLagoa;
      ctx.beginPath(); ctx.ellipse(pLagoa.x, pLagoa.y, 48 * esc, 36 * esc, 0, 0, Math.PI * 2); ctx.fill();
      // Ponte de tronco oco sobre a lagoa
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.fillRect(pLagoa.x - 42 * esc, pLagoa.y - 6 * esc, 84 * esc, 12 * esc);
      ctx.strokeRect(pLagoa.x - 42 * esc, pLagoa.y - 6 * esc, 84 * esc, 12 * esc);

      // 4. Paredes densas de copas de árvores cercando as trilhas e clareiras (estilo modular RPG)
      const aneisCopa = [
        [0.05, 0.14], [0.12, 0.10], [0.22, 0.09], [0.34, 0.11], [0.46, 0.10], [0.58, 0.11], [0.70, 0.09], [0.84, 0.09], [0.94, 0.14],
        [0.05, 0.28], [0.06, 0.44], [0.05, 0.60], [0.05, 0.74], [0.05, 0.90],
        [0.95, 0.28], [0.94, 0.44], [0.95, 0.60], [0.95, 0.78], [0.94, 0.92],
        [0.36, 0.22], [0.63, 0.22], [0.36, 0.44], [0.66, 0.44], [0.20, 0.54], [0.68, 0.84], [0.34, 0.90]
      ];
      aneisCopa.forEach(([au, av], i) => {
        const ax = box.x + au * box.w;
        const ay = box.y + av * box.h;
        const r = (28 + (i % 3) * 6) * esc;
        ctx.fillStyle = '#0f391b';
        ctx.beginPath(); ctx.arc(ax, ay + 4 * esc, r * 1.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = (i % 2 === 0) ? '#166534' : '#15803d';
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 2 * esc;
        ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(ax - r * 0.25, ay - r * 0.25, r * 0.45, 0, Math.PI * 2); ctx.fill();
      });

      // Placas interativas das 7 áreas da Floresta
      Object.entries(ZONAS_POR_MAPA.bosque).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'bosque');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 34 * esc, z.nome, z.portalPara ? '#fef08a' : '#dcfce7', z.portalPara ? '#eab308' : (z.cor || '#22c55e'));
      });

      ctx.restore();
      this.desenharBarraExpedicaoSubmapa(ctx, '🌲 MAPA DE AVENTURA: FLORESTA & SANTUÁRIO ANTIGO');
    }

    // =========================================================================
    // 3. CAVERNA & RUÍNAS (MAPA DE MASMORRA / DUNGEON TOP-DOWN RPG DE PEDRA)
    // =========================================================================
    renderizarMapaCaverna(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      // Fundo de rocha subterrânea / pergaminho escuro estilo Dungeon RPG
      ctx.fillStyle = '#14110f';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      const gradRocha = ctx.createRadialGradient(
        box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.1,
        box.x + box.w * 0.5, box.y + box.h * 0.5, box.w * 0.72
      );
      gradRocha.addColorStop(0, '#2b241d');
      gradRocha.addColorStop(0.7, '#1c1713');
      gradRocha.addColorStop(1, '#0e0b09');
      ctx.fillStyle = gradRocha;
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.w, box.h, 16);
      ctx.fill();

      // Definição das 7 Salas de Alvenaria da Masmorra (coordenadas proporcionais no mapa)
      const salasDungeon = [
        { id: 'saida_ilha',        u: 0.15, v: 0.50, w: 0.15, h: 0.20 },
        { id: 'veio_ferro',        u: 0.28, v: 0.21, w: 0.22, h: 0.22 },
        { id: 'galeria_cristais',  u: 0.68, v: 0.21, w: 0.22, h: 0.22 },
        { id: 'ruinas_ancestrais', u: 0.48, v: 0.50, w: 0.24, h: 0.24 },
        { id: 'camera_tesouro',    u: 0.84, v: 0.48, w: 0.18, h: 0.22 },
        { id: 'lago_subterraneo',  u: 0.32, v: 0.80, w: 0.24, h: 0.20 },
        { id: 'covil_pantera',     u: 0.74, v: 0.80, w: 0.22, h: 0.20 }
      ];

      // 1. PAREDES EXTERNAS DOS CORREDORES E SALAS (Camada de Bloco de Pedra Espesso)
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 44 * esc;
      ctx.lineCap = 'square';
      GRAFO_SUBMAPAS.caverna.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'caverna');
        const pb = this.coordZona(b, 'caverna');
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      });

      salasDungeon.forEach(s => {
        const sx = box.x + (s.u - s.w * 0.5) * box.w;
        const sy = box.y + (s.v - s.h * 0.5) * box.h;
        const sw = s.w * box.w;
        const sh = s.h * box.h;
        ctx.fillStyle = '#44403c';
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 4 * esc;
        ctx.fillRect(sx - 8 * esc, sy - 8 * esc, sw + 16 * esc, sh + 16 * esc);
        ctx.strokeRect(sx - 8 * esc, sy - 8 * esc, sw + 16 * esc, sh + 16 * esc);
      });

      // 2. PISO INTERNO DE LAJOTAS DE PEDRA (Corredores + Salas)
      ctx.strokeStyle = '#9a8c76';
      ctx.lineWidth = 28 * esc;
      GRAFO_SUBMAPAS.caverna.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'caverna');
        const pb = this.coordZona(b, 'caverna');
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      });

      salasDungeon.forEach(s => {
        const sx = box.x + (s.u - s.w * 0.5) * box.w;
        const sy = box.y + (s.v - s.h * 0.5) * box.h;
        const sw = s.w * box.w;
        const sh = s.h * box.h;

        // Lajota de pedra iluminada da câmara
        const gradPiso = ctx.createRadialGradient(sx + sw * 0.5, sy + sh * 0.5, 8 * esc, sx + sw * 0.5, sy + sh * 0.5, Math.max(sw, sh) * 0.65);
        gradPiso.addColorStop(0, '#b8a992');
        gradPiso.addColorStop(1, '#7c6f5b');
        ctx.fillStyle = gradPiso;
        ctx.fillRect(sx, sy, sw, sh);

        // Grid de ladrilhos de pedra (24px) dentro de cada sala da dungeon
        ctx.strokeStyle = 'rgba(41, 37, 36, 0.38)';
        ctx.lineWidth = 1;
        const tSize = Math.max(18, Math.round(24 * esc));
        for (let gx = sx + tSize; gx < sx + sw; gx += tSize) {
          ctx.beginPath(); ctx.moveTo(gx, sy); ctx.lineTo(gx, sy + sh); ctx.stroke();
        }
        for (let gy = sy + tSize; gy < sy + sh; gy += tSize) {
          ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx + sw, gy); ctx.stroke();
        }

        // Borda interna chanfrada de blocos de alvenaria
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 3 * esc;
        ctx.strokeRect(sx, sy, sw, sh);
      });

      // 3. ELEMENTOS TÁTICOS E DE AVENTURA DENTRO DE CADA SALA DA MASMORRA:
      // Sala 1: Escadaria de Pedra (Entrada/Saída)
      const pSaida = this.coordZona('saida_ilha', 'caverna');
      for (let deg = -3; deg <= 3; deg++) {
        ctx.fillStyle = (deg % 2 === 0) ? '#57534e' : '#78716c';
        ctx.fillRect(pSaida.x - 28 * esc + (deg + 3) * 8 * esc, pSaida.y - 18 * esc, 7 * esc, 36 * esc);
      }

      // Sala 2: Mina de Ferro & Trilhos de Vagoneta
      const pFerro = this.coordZona('veio_ferro', 'caverna');
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 5 * esc;
      ctx.beginPath(); ctx.moveTo(pFerro.x - 45 * esc, pFerro.y); ctx.lineTo(pFerro.x + 35 * esc, pFerro.y); ctx.stroke();
      // Pepitas de ferro e ouro incrustadas na rocha
      [[-32, -16, '#d97706'], [-10, -20, '#fbbf24'], [18, -16, '#f59e0b'], [32, 6, '#d97706']].forEach(([ox, oy, cor]) => {
        ctx.fillStyle = cor;
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5 * esc;
        ctx.beginPath(); ctx.arc(pFerro.x + ox * esc, pFerro.y + oy * esc, 9 * esc, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });

      // Sala 3: Santuário dos Cristais Luminosos
      const pCris = this.coordZona('galeria_cristais', 'caverna');
      ['#c084fc', '#38bdf8', '#e879f9', '#67e8f9', '#a855f7'].forEach((cor, i) => {
        const cx = pCris.x + (i - 2) * 16 * esc;
        const cy = pCris.y - 6 * esc + (i % 2) * 8 * esc;
        ctx.fillStyle = cor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18 * esc);
        ctx.lineTo(cx + 8 * esc, cy);
        ctx.lineTo(cx, cy + 12 * esc);
        ctx.lineTo(cx - 8 * esc, cy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      });

      // Sala 4: Salão Central das Colunas & Mosaico Rúnico
      const pRui = this.coordZona('ruinas_ancestrais', 'caverna');
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 2 * esc;
      ctx.beginPath(); ctx.arc(pRui.x, pRui.y, 26 * esc, 0, Math.PI * 2); ctx.stroke();
      [[-42, -26], [42, -26], [-42, 26], [42, 26]].forEach(([px, py]) => {
        ctx.fillStyle = '#57534e';
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 2 * esc;
        ctx.beginPath(); ctx.arc(pRui.x + px * esc, pRui.y + py * esc, 9 * esc, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });

      // Sala 5: Câmara do Tesouro Ancestral (Tapete Real Vermelho + Baú Dourado)
      const pTes = this.coordZona('camera_tesouro', 'caverna');
      ctx.fillStyle = '#991b1b';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5 * esc;
      ctx.fillRect(pTes.x - 16 * esc, pTes.y - 26 * esc, 32 * esc, 52 * esc);
      ctx.strokeRect(pTes.x - 16 * esc, pTes.y - 26 * esc, 32 * esc, 52 * esc);
      // Baú de Relíquias
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.2 * esc;
      ctx.fillRect(pTes.x - 14 * esc, pTes.y - 18 * esc, 28 * esc, 20 * esc);
      ctx.strokeRect(pTes.x - 14 * esc, pTes.y - 18 * esc, 28 * esc, 20 * esc);

      // Sala 6: Gruta do Lago Subterrâneo Cristalino
      const pLago = this.coordZona('lago_subterraneo', 'caverna');
      const gradAgua = ctx.createRadialGradient(pLago.x, pLago.y, 6 * esc, pLago.x, pLago.y, 54 * esc);
      gradAgua.addColorStop(0, '#38bdf8');
      gradAgua.addColorStop(0.7, '#0284c7');
      gradAgua.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = gradAgua;
      ctx.beginPath(); ctx.ellipse(pLago.x, pLago.y, 56 * esc, 30 * esc, 0, 0, Math.PI * 2); ctx.fill();

      // Sala 7: Covil da Pantera das Sombras
      const pCovil = this.coordZona('covil_pantera', 'caverna');
      ctx.fillStyle = '#18181b';
      ctx.beginPath(); ctx.ellipse(pCovil.x, pCovil.y, 44 * esc, 26 * esc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(pCovil.x - 7 * esc, pCovil.y - 4 * esc, 3 * esc, 0, Math.PI * 2);
      ctx.arc(pCovil.x + 7 * esc, pCovil.y - 4 * esc, 3 * esc, 0, Math.PI * 2);
      ctx.fill();

      // 4. Tochas de parede acesas iluminando as câmaras
      salasDungeon.forEach((s, idx) => {
        const tx = box.x + s.u * box.w;
        const ty = box.y + (s.v - s.h * 0.35) * box.h;
        const rLuz = (42 + Math.sin(this.tempo * 7 + idx) * 4) * esc;
        const gLuz = ctx.createRadialGradient(tx, ty, 2, tx, ty, rLuz);
        gLuz.addColorStop(0, 'rgba(251, 191, 36, 0.38)');
        gLuz.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = gLuz;
        ctx.beginPath(); ctx.arc(tx, ty, rLuz, 0, Math.PI * 2); ctx.fill();
      });

      // Placas interativas das 7 câmaras da Dungeon
      Object.entries(ZONAS_POR_MAPA.caverna).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'caverna');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 30 * esc, z.nome, z.portalPara ? '#fef08a' : '#f3e8ff', z.portalPara ? '#eab308' : (z.cor || '#a855f7'));
      });

      ctx.restore();
      this.desenharBarraExpedicaoSubmapa(ctx, '🪨 MASMORRA SUBTERRÂNEA: CAVERNA & RUÍNAS ANCESTRAIS');
    }

    // =========================================================================
    // 4. PRAIA & ENSEADA DOS NAUFRÁGIOS (MAPA DE AVENTURA COSTEIRA RPG)
    // =========================================================================
    renderizarMapaPraia(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      ctx.fillStyle = '#042f4b';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Falésia verde ao norte com trilha de descida
      ctx.fillStyle = '#166534';
      ctx.fillRect(box.x, box.y, box.w, box.h * 0.22);

      // Faixa de areia dourada recortada em enseada
      const gradAreia = ctx.createLinearGradient(0, box.y + box.h * 0.16, 0, box.y + box.h * 0.58);
      gradAreia.addColorStop(0, '#fde68a');
      gradAreia.addColorStop(0.7, '#fcd34d');
      gradAreia.addColorStop(1, '#d97706');
      ctx.fillStyle = gradAreia;
      ctx.fillRect(box.x, box.y + box.h * 0.18, box.w, box.h * 0.40);

      // Mar turquesa e recife profundo
      const gradMar = ctx.createLinearGradient(0, box.y + box.h * 0.54, 0, box.y + box.h);
      gradMar.addColorStop(0, '#38bdf8');
      gradMar.addColorStop(0.4, '#0284c7');
      gradMar.addColorStop(1, '#075985');
      ctx.fillStyle = gradMar;
      ctx.fillRect(box.x, box.y + box.h * 0.54, box.w, box.h * 0.46);

      // Trilhas de madeira e areia conectando os pontos de exploração da Praia
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 14 * esc;
      ctx.lineCap = 'round';
      GRAFO_SUBMAPAS.praia.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'praia');
        const pb = this.coordZona(b, 'praia');
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      });

      // Ondas quebrando na costa
      const ondaOffset = Math.sin(this.tempo * 2.5) * 5 * esc;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.80)';
      ctx.lineWidth = 3.5 * esc;
      ctx.beginPath();
      for (let x = box.x; x <= box.x + box.w; x += 24) {
        const y = box.y + box.h * 0.55 + Math.sin((x * 0.03) + this.tempo * 2) * 5 * esc + ondaOffset;
        if (x === box.x) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Área 2: Cabana do Pescador no Coqueiral
      const pCoq = this.coordZona('coqueiral', 'praia');
      this.desenharCasaVila(ctx, pCoq.x - 24 * esc, pCoq.y - 6 * esc, 1, esc * 0.72);

      // Área 4: Píer de Madeira & Barco ancorado
      const pPier = this.coordZona('pier_pesca', 'praia');
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.fillRect(pPier.x - 24 * esc, box.y + box.h * 0.44, 48 * esc, box.h * 0.24);
      ctx.strokeRect(pPier.x - 24 * esc, box.y + box.h * 0.44, 48 * esc, box.h * 0.24);
      this.desenharSpriteOuFallback(ctx, 'barco', pPier.x + 28 * esc, pPier.y - 18 * esc, 56 * esc, 44 * esc);

      // Área 5: Galeão Naufragado no banco de areia (Sudoeste)
      const pNavio = this.coordZona('destrocos_baia', 'praia');
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.ellipse(pNavio.x, pNavio.y, 52 * esc, 26 * esc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2 * esc;
      ctx.beginPath();
      ctx.ellipse(pNavio.x, pNavio.y - 4 * esc, 34 * esc, 14 * esc, -0.2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Área 6: Gruta Marinha dos Contrabandistas & Recife (Sudeste)
      const pRecife = this.coordZona('recife_corais', 'praia');
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5 * esc;
      ctx.beginPath(); ctx.arc(pRecife.x, pRecife.y, 34 * esc, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Palmeiras costeiras
      [[0.12, 0.26], [0.28, 0.28], [0.36, 0.24], [0.70, 0.25], [0.88, 0.27]].forEach(([pu, pv]) => {
        const px = box.x + pu * box.w;
        const py = box.y + pv * box.h;
        this.desenharSpriteOuFallback(ctx, 'palmeira', px - 28 * esc, py - 44 * esc, 56 * esc, 56 * esc);
      });

      Object.entries(ZONAS_POR_MAPA.praia).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'praia');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 28 * esc, z.nome, z.portalPara ? '#fef08a' : '#e0f2fe', z.portalPara ? '#eab308' : (z.cor || '#0284c7'));
      });

      ctx.restore();
      this.desenharBarraExpedicaoSubmapa(ctx, '🏖️ MAPA DE AVENTURA: PRAIA & ENSEADA DOS NAUFRÁGIOS');
    }

    // =========================================================================
    // 5. CACHOEIRA DE BANHO & VALE TERMAL (MAPA DE SANTUÁRIO E REPOUSO RPG)
    // =========================================================================
    renderizarMapaCachoeira(ctx, w, h) {
      const box = this.boxAtual;
      const esc = box.escala;

      ctx.fillStyle = '#082f27';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
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

      // Paredão Rochoso em Terraços ao Norte
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3 * esc;
      ctx.fillRect(box.x, box.y, box.w, box.h * 0.28);
      ctx.strokeRect(box.x, box.y, box.w, box.h * 0.28);

      // Passarelas de pedra e pontes de bambu conectando as 6 áreas do Vale da Cachoeira
      ctx.strokeStyle = '#b48250';
      ctx.lineWidth = 16 * esc;
      ctx.lineCap = 'round';
      GRAFO_SUBMAPAS.cachoeira.forEach(([a, b]) => {
        const pa = this.coordZona(a, 'cachoeira');
        const pb = this.coordZona(b, 'cachoeira');
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      });

      // Grande Lagoa Termal de Banho no Centro
      const pLago = this.coordZona('lago_banho', 'cachoeira');
      const gradLago = ctx.createRadialGradient(pLago.x, pLago.y, 12 * esc, pLago.x, pLago.y, box.w * 0.26);
      gradLago.addColorStop(0, '#67e8f9');
      gradLago.addColorStop(0.55, '#06b6d4');
      gradLago.addColorStop(1, '#0369a1');
      ctx.fillStyle = gradLago;
      ctx.beginPath();
      ctx.ellipse(pLago.x, pLago.y, box.w * 0.26, box.h * 0.21, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deck de Madeira para Banho na margem da Lagoa
      ctx.fillStyle = '#92400e';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2 * esc;
      ctx.fillRect(pLago.x - 36 * esc, pLago.y + 24 * esc, 72 * esc, 18 * esc);
      ctx.strokeRect(pLago.x - 36 * esc, pLago.y + 24 * esc, 72 * esc, 18 * esc);

      // Queda d'Água Principal + Gruta Secreta atrás da cortina d'água
      const pQueda = this.coordZona('queda_principal', 'cachoeira');
      const largQueda = 88 * esc;
      const altQueda = (pLago.y - box.y - box.h * 0.05);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(pQueda.x, pQueda.y + 10 * esc, 30 * esc, Math.PI, 0); ctx.fill();
      const gradQueda = ctx.createLinearGradient(0, box.y, 0, pLago.y);
      gradQueda.addColorStop(0, 'rgba(224, 242, 254, 0.92)');
      gradQueda.addColorStop(0.5, 'rgba(56, 189, 248, 0.85)');
      gradQueda.addColorStop(1, 'rgba(186, 230, 253, 0.90)');
      ctx.fillStyle = gradQueda;
      ctx.fillRect(pQueda.x - largQueda * 0.5, box.y + 10 * esc, largQueda, altQueda - 20 * esc);

      // Espuma animada na base da cachoeira
      for (let i = 0; i < 7; i++) {
        const rx = pQueda.x + (i - 3) * 14 * esc;
        const ry = pLago.y - box.h * 0.12 + Math.sin(this.tempo * 6 + i) * 3 * esc;
        const rr = (9 + Math.sin(this.tempo * 4 + i) * 2.5) * esc;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
      }

      // Altar de Pedras do Sol (Leste)
      const pPedras = this.coordZona('pedras_contemplacao', 'cachoeira');
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.2 * esc;
      ctx.beginPath(); ctx.ellipse(pPedras.x, pPedras.y, 42 * esc, 26 * esc, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Árvores ao redor do vale
      [[0.10, 0.38], [0.14, 0.74], [0.88, 0.34], [0.86, 0.74]].forEach(([au, av]) => {
        this.desenharSpriteOuFallback(ctx, 'arvore_carvalho', box.x + au * box.w - 28 * esc, box.y + av * box.h - 46 * esc, 56 * esc, 64 * esc);
      });

      Object.entries(ZONAS_POR_MAPA.cachoeira).forEach(([id, z]) => {
        const pz = this.coordZona(id, 'cachoeira');
        this.desenharEtiquetaMapa(ctx, pz.x, pz.y + 28 * esc, z.nome, z.portalPara ? '#fef08a' : '#cffafe', z.portalPara ? '#eab308' : (z.cor || '#06b6d4'));
      });

      ctx.restore();
      this.desenharBarraExpedicaoSubmapa(ctx, '💧 SANTUÁRIO TERMAL: CACHOEIRA DE BANHO & NASCENTE');
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
      // REGRA DE OURO: Somente desenha os personagens cujo local real pertence ao mapa ativo!
      // Se estão em casa ou na fogueira (ilha_central), NUNCA aparecem na Caverna, Floresta, Praia ou Cachoeira!
      const lista = Object.values(this.personagens).filter(p => this.mapaDoLocal(p.local) === this.mapaAtivo);
      lista.sort((a, b) => a.y - b.y);
      const esc = Math.max(0.75, Math.min(1.1, this.boxAtual.escala));

      lista.forEach(p => {
        // Desenha trilha iluminada se estiver em deslocamento de comando recente
        if (p.rotaPontos && p.rotaPontos.length > 1 && Date.now() < (p.rotaExpiraEm || 0)) {
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
        if (!p || this.mapaDoLocal(p.local) !== this.mapaAtivo) return;

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

    enviarHabitanteParaSalaSubmapa(serId, salaId) {
      const cmdTexto = `vá para ${salaId}`;
      fetch('/api/comando', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serId, comando: cmdTexto, de: 'Rafael (Exploração RPG)' })
      }).then(r => r.json()).then(res => {
        if (typeof window.fetchState === 'function') window.fetchState();
        if (window.mostrarToast && res && res.mensagem) {
          window.mostrarToast(res.mensagem);
        }
      }).catch(() => {});
    }

    tratarClique(e) {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 0. Se estiver em um Submapa, checa clique na Barra de Expedição (Trazer Ícaro/Elara/João/Maria para este mapa)
      if (this.mapaAtivo !== 'ilha_central' && Array.isArray(this.botoesExpedicao)) {
        for (const btn of this.botoesExpedicao) {
          if (clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h) {
            this.exploradorSelecionado = btn.serId;
            const salaInicial = this.mapaAtivo === 'caverna' ? 'ruinas_ancestrais'
                              : this.mapaAtivo === 'bosque'  ? 'serraria_lenha'
                              : this.mapaAtivo === 'praia'   ? 'pier_pesca'
                              : 'lago_banho';
            this.enviarHabitanteParaSalaSubmapa(btn.serId, salaInicial);
            return;
          }
        }
      }

      // 1. Checa clique nos Habitantes presentes neste mapa para abrir o Card Individual
      const listaP = Object.values(this.personagens).filter(p => this.mapaDoLocal(p.local) === this.mapaAtivo);
      for (const p of listaP) {
        if (Math.hypot(clickX - p.x, clickY - (p.y - 18)) < 32) {
          this.exploradorSelecionado = p.id;
          if (typeof window.abrirCardHabitanteRPG === 'function') {
            window.abrirCardHabitanteRPG(p.id);
            return;
          }
        }
      }

      // 2. Checa clique nas Zonas / Casas / Salas / Portais do mapa ativo
      const zonasMapa = ZONAS_POR_MAPA[this.mapaAtivo] || {};
      for (const [zid, zinfo] of Object.entries(zonasMapa)) {
        const p = this.coordZona(zid, this.mapaAtivo);
        if (Math.hypot(clickX - p.x, clickY - p.y) < 48) {
          if (zinfo.portalPara) {
            // Se clicou no portal de saída de um submapa e há alguém lá dentro, oferece retorno ou muda a câmera
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
            // Move o habitante que já está nesta região (ou o explorador selecionado) pelas trilhas/corredores até a sala clicada!
            const presentesAqui = Object.values(this.personagens).filter(per => this.mapaDoLocal(per.local) === this.mapaAtivo);
            const alvoSerId = (presentesAqui[0] && presentesAqui[0].id) || this.exploradorSelecionado || 'icaro';
            this.enviarHabitanteParaSalaSubmapa(alvoSerId, zid);
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

      if (window.mostrarToast) {
        window.mostrarToast(`Câmera na região: ${cfg.tituloCompleto}`);
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

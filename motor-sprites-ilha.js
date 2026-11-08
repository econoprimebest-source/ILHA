/**
 * motor-sprites-ilha.js — Sistema Profissional de Sprites, Props Dinâmicos e Mundo Vivo
 * 
 * Substitui 100% das primitivas geométricas (círculos/elipses) por:
 * 1. Sprites Humanoides HD estilo RPG (Stardew Valley / RimWorld) com idle, walk e ferramentas.
 * 2. Sprites anatômicos detalhados da Pantera das Sombras e do Tubarão-dos-Recifes.
 * 3. Fazenda Viva com 4 estágios reativos (Terra Arada, Brotos, Madura com Cenouras, Colhida).
 * 4. Árvores interativas com Wind Sway (balanço do vento) e tocos quando cortadas.
 * 5. Fogueira Viva com 3 estágios visuais (Apagada, Brasas, Fogueira Alta).
 * 6. Água e Clima Vivos: Espuma de maré nas praias e spray de cachoeira.
 * 7. Sistema de Zonas Expansíveis (Ilha Central, Caverna & Ruínas, Floresta Norte & Santuário).
 */
(function() {
  'use strict';

  if (typeof PIXI === 'undefined') {
    console.error('[MotorSprites] PixiJS não encontrado.');
    return;
  }

  // Paletas Oficiais de Cores e Identidade Visual
  const PALETA_SERES = {
    icaro: {
      nome: 'Ícaro',
      tunica: '#15803d',
      tunicaEscura: '#166534',
      cinto: '#fbbf24',
      cabelo: '#451a03',
      pele: '#f5d0b5',
      botas: '#292524',
      capa: '#16a34a',
      olhos: '#0284c7'
    },
    lara: {
      nome: 'Lara',
      tunica: '#7c3aed',
      tunicaEscura: '#6d28d9',
      cinto: '#fef08a',
      cabelo: '#facc15', // Trança dourada longa
      pele: '#fde0cf',
      botas: '#3b0764',
      capa: '#a855f7',
      olhos: '#9333ea'
    },
    joao: {
      nome: 'João',
      tunica: '#0284c7',
      tunicaEscura: '#0369a1',
      cinto: '#ffffff',
      cabelo: '#1e293b',
      pele: '#fbd0b5',
      botas: '#1c1917',
      capa: '#38bdf8',
      olhos: '#0f172a'
    },
    maria: {
      nome: 'Maria',
      tunica: '#e11d48',
      tunicaEscura: '#be123c',
      cinto: '#fde047',
      cabelo: '#713f12', // Longo preso
      pele: '#fde0cf',
      botas: '#451a03',
      capa: '#f43f5e',
      olhos: '#451a03'
    }
  };

  // Cache de Texturas Geradas em Alta Resolução
  const cacheTexturas = {
    habitantes: {},
    pantera: [],
    tubarao: [],
    hortaEstagios: [],
    arvores: {},
    fogueiraEstagios: []
  };

  // Cache de Texturas SVG HD Pré-renderizadas (/assets/sprites/)
  const cacheSvg = {};

  /**
   * Helper: Cria canvas offscreen com dimensões dadas
   */
  function criarCanvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Estilo Pixel-Art Nítido
    return { cv, ctx };
  }

  // ========================================================================
  // 1. GERADOR DE SPRITES HUMANOIDES RPG (ESTILO STARDEW VALLEY / RIMWORLD)
  // ========================================================================
  function gerarSpriteHumanoide(serId, acao, frameWalk, caminhando) {
    const cfg = PALETA_SERES[serId] || PALETA_SERES.icaro;
    const W = 40, H = 54;
    const { cv, ctx } = criarCanvas(W, H);

    const cx = W / 2; // Centro horizontal = 20
    const cyPe = H - 6; // Nível dos pés no chão = 48

    // 1. Sombra suave de contato no chão
    const gradSombra = ctx.createRadialGradient(cx, cyPe, 2, cx, cyPe, 14);
    gradSombra.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    gradSombra.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradSombra;
    ctx.beginPath();
    ctx.ellipse(cx, cyPe, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Animação de Caminhada / Bobbing
    const bob = caminhando ? (Math.sin(frameWalk * Math.PI) * 2.2) : 0;
    const passoL = caminhando ? Math.sin(frameWalk * Math.PI * 2) * 4.5 : 0;
    const passoR = caminhando ? -Math.sin(frameWalk * Math.PI * 2) * 4.5 : 0;

    // 3. Pernas e Botas
    ctx.fillStyle = cfg.botas;
    // Perna Esquerda
    ctx.fillRect(cx - 6, cyPe - 10 - bob + passoL, 4.5, 9);
    // Perna Direita
    ctx.fillRect(cx + 1.5, cyPe - 10 - bob + passoR, 4.5, 9);

    // 4. Manto / Capa nas costas (leve esvoaçar)
    ctx.fillStyle = cfg.capa;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cyPe - 25 - bob);
    ctx.lineTo(cx + 7, cyPe - 25 - bob);
    ctx.lineTo(cx + 9, cyPe - 12 - bob);
    ctx.lineTo(cx - 9, cyPe - 12 - bob);
    ctx.closePath();
    ctx.fill();

    // 5. Túnica / Vestimenta Principal
    ctx.fillStyle = cfg.tunica;
    ctx.fillRect(cx - 7, cyPe - 26 - bob, 14, 16);
    // Detalhe de vinco / costura
    ctx.fillStyle = cfg.tunicaEscura;
    ctx.fillRect(cx - 1, cyPe - 26 - bob, 2, 16);
    ctx.fillRect(cx - 7, cyPe - 12 - bob, 14, 2);

    // 6. Cinto de Couro com Fivela
    ctx.fillStyle = cfg.cinto;
    ctx.fillRect(cx - 7.5, cyPe - 18 - bob, 15, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, cyPe - 18.5 - bob, 4, 4);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 1, cyPe - 17.5 - bob, 2, 2);

    // 7. Braços e Mangas
    ctx.fillStyle = cfg.tunica;
    const bracoL = caminhando ? -passoL * 0.7 : 0;
    const bracoR = caminhando ? -passoR * 0.7 : 0;
    ctx.fillRect(cx - 10, cyPe - 25 - bob + bracoL, 3.5, 11);
    ctx.fillRect(cx + 6.5, cyPe - 25 - bob + bracoR, 3.5, 11);
    // Mãos (tom de pele)
    ctx.fillStyle = cfg.pele;
    ctx.fillRect(cx - 10, cyPe - 15 - bob + bracoL, 3.5, 3.5);
    ctx.fillRect(cx + 6.5, cyPe - 15 - bob + bracoR, 3.5, 3.5);

    // 8. Pescoço e Cabeça
    ctx.fillStyle = cfg.pele;
    ctx.fillRect(cx - 2.5, cyPe - 28 - bob, 5, 3); // Pescoço
    ctx.fillRect(cx - 6, cyPe - 40 - bob, 12, 12); // Rosto

    // 9. Cabelos característicos
    ctx.fillStyle = cfg.cabelo;
    ctx.fillRect(cx - 7, cyPe - 42 - bob, 14, 5); // Topo
    ctx.fillRect(cx - 7.5, cyPe - 40 - bob, 3, 9); // Lateral esq
    ctx.fillRect(cx + 4.5, cyPe - 40 - bob, 3, 9); // Lateral dir

    // Detalhe de penteado individual
    if (serId === 'lara') {
      // Trança longa dourada sobre o ombro
      ctx.fillStyle = cfg.cabelo;
      ctx.fillRect(cx + 6, cyPe - 34 - bob, 3.5, 16);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx + 7, cyPe - 32 - bob, 1.5, 14);
    } else if (serId === 'maria') {
      // Coque / trança presa com laço
      ctx.fillStyle = cfg.cabelo;
      ctx.fillRect(cx - 4, cyPe - 44 - bob, 8, 4);
      ctx.fillRect(cx - 8, cyPe - 36 - bob, 3, 14);
    } else if (serId === 'icaro') {
      // Topete arrepiado castanho
      ctx.fillRect(cx - 3, cyPe - 44 - bob, 7, 3);
    }

    // 10. Olhos expressivos e boca sutil
    ctx.fillStyle = cfg.olhos;
    ctx.fillRect(cx - 3.5, cyPe - 35 - bob, 2, 2.5);
    ctx.fillRect(cx + 1.5, cyPe - 35 - bob, 2, 2.5);
    ctx.fillStyle = '#ffffff'; // Brilho no olhar
    ctx.fillRect(cx - 3.5, cyPe - 35 - bob, 1, 1);
    ctx.fillRect(cx + 1.5, cyPe - 35 - bob, 1, 1);

    // 11. Ferramenta nas mãos conforme a Ação
    const a = (acao || '').toLowerCase();
    if (a.includes('cortar') || a.includes('madeira')) {
      // Machado de Aço com cabo de madeira
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx + 8, cyPe - 30 - bob, 2.5, 20); // Cabo
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(cx + 8, cyPe - 32 - bob);
      ctx.lineTo(cx + 16, cyPe - 34 - bob);
      ctx.lineTo(cx + 14, cyPe - 26 - bob);
      ctx.lineTo(cx + 8, cyPe - 28 - bob);
      ctx.closePath();
      ctx.fill();
    } else if (a.includes('pescar')) {
      // Vara de pescar de bambu
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 8, cyPe - 16 - bob);
      ctx.quadraticCurveTo(cx + 14, cyPe - 32 - bob, cx + 22, cyPe - 36 - bob);
      ctx.stroke();
      // Linha de pesca
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 22, cyPe - 36 - bob);
      ctx.lineTo(cx + 26, cyPe - 10);
      ctx.stroke();
      // Boia
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx + 25, cyPe - 12, 3, 3);
    } else if (a.includes('plantar') || a.includes('colher') || a.includes('cuidar')) {
      // Enxada / Cesto de Colheita
      if (a.includes('colher')) {
        // Cesto com cenouras
        ctx.fillStyle = '#92400e';
        ctx.fillRect(cx + 7, cyPe - 18 - bob, 8, 7);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(cx + 8, cyPe - 21 - bob, 2.5, 4);
        ctx.fillRect(cx + 11.5, cyPe - 20 - bob, 2.5, 3.5);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(cx + 8, cyPe - 23 - bob, 2, 2);
      } else {
        // Enxada
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cx + 8, cyPe - 28 - bob, 2, 18);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx + 6, cyPe - 29 - bob, 6, 2.5);
      }
    } else if (a.includes('constru') || a.includes('fabricar') || a.includes('erguer')) {
      // Martelo de Carpinteiro
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx + 8, cyPe - 24 - bob, 2, 12);
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx + 5, cyPe - 27 - bob, 8, 4.5);
    } else if (a.includes('caverna') || a.includes('afugentar') || a.includes('tocha')) {
      // Tocha Flamejante Acesa
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx + 8, cyPe - 22 - bob, 2.5, 12);
      // Fogo vivo
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx + 9, cyPe - 26 - bob, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx + 9, cyPe - 27 - bob, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx + 9, cyPe - 27.5 - bob, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.includes('beber') || a.includes('agua')) {
      // Cuia de cerâmica
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(cx + 8, cyPe - 18 - bob, 4, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx + 6, cyPe - 19 - bob, 4, 1.5);
    }

    return PIXI.Texture.from(cv);
  }

  // ========================================================================
  // 2. GERADOR DE SPRITES ANATÔMICOS DE PREDADORES (PANTERA & TUBARÃO)
  // ========================================================================
  function gerarSpritePantera(frameProwl) {
    const W = 64, H = 38;
    const { cv, ctx } = criarCanvas(W, H);

    const cx = W / 2; // 32
    const cyChao = H - 6; // 32

    // Sombra de espreita no chão
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, cyChao, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const oscProwl = Math.sin(frameProwl * Math.PI * 2);
    const pata1 = Math.sin(frameProwl * Math.PI * 2) * 5;
    const pata2 = -Math.sin(frameProwl * Math.PI * 2) * 5;

    // Patas Traseiras e Dianteiras
    ctx.fillStyle = '#09090b';
    ctx.fillRect(cx - 16 + pata1, cyChao - 8, 4, 8); // Pata traseira esq
    ctx.fillRect(cx - 9 + pata2, cyChao - 8, 4, 8);  // Pata traseira dir
    ctx.fillRect(cx + 7 + pata2, cyChao - 9, 4, 9);  // Pata dianteira esq
    ctx.fillRect(cx + 14 + pata1, cyChao - 9, 4, 9); // Pata dianteira dir

    // Corpo Musculoso da Pantera (curvado na espreita)
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cyChao - 12 + oscProwl * 0.8, 16, 7.5, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Destaque muscular / pelagem acetinada
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cx + 1, cyChao - 14 + oscProwl * 0.8, 11, 4, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça Feline Alerta
    const cabX = cx + 16, cabY = cyChao - 14 + oscProwl;
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(cabX, cabY, 7, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Orelhas pontudas
    ctx.beginPath();
    ctx.moveTo(cabX - 4, cabY - 5);
    ctx.lineTo(cabX - 2, cabY - 9);
    ctx.lineTo(cabX + 1, cabY - 5);
    ctx.moveTo(cabX + 2, cabY - 5);
    ctx.lineTo(cabX + 5, cabY - 9);
    ctx.lineTo(cabX + 6, cabY - 5);
    ctx.fill();

    // Focinho e dentes caninos
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cabX + 4, cabY - 1, 4, 3);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cabX + 6, cabY + 1.5, 1, 1.5); // Canino visível

    // Olhos Dourados Reluzentes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cabX + 2, cabY - 2.5, 2.5, 2);
    ctx.fillStyle = '#000000'; // Pupila felina em fenda
    ctx.fillRect(cabX + 3, cabY - 2.5, 1, 2);

    // Cauda Longa Sinuosa com ponta chicoteando
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cyChao - 13);
    ctx.quadraticCurveTo(cx - 24, cyChao - 20, cx - 27 + oscProwl * 2, cyChao - 11 + oscProwl * 3);
    ctx.stroke();

    return PIXI.Texture.from(cv);
  }

  function gerarSpriteTubarao(frameOnda) {
    const W = 60, H = 34;
    const { cv, ctx } = criarCanvas(W, H);

    const cx = W / 2, cy = H / 2;
    const osc = Math.sin(frameOnda * Math.PI * 2);

    // 1. Rastro de Espuma e Ondulação da Água (Wake)
    ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 24 + osc * 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2. Silhueta Fusiforme do Tubarão sob a superfície
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 18, 5, osc * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 3. Barbatana Dorsal Cortando a Água
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 2);
    ctx.lineTo(cx + 2, cy - 12);
    ctx.lineTo(cx + 8, cy + 2);
    ctx.closePath();
    ctx.fill();

    // Borda afiada da barbatana
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Barbatana Caudal (balançando)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    const tailX = cx - 18, tailY = cy + 1 + osc * 3;
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tailX - 6, tailY - 8);
    ctx.lineTo(tailX - 3, tailY);
    ctx.lineTo(tailX - 7, tailY + 8);
    ctx.closePath();
    ctx.fill();

    // 5. Linha de espuma na frente da barbatana (corte de água)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 6, cy + 2, 4, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    return PIXI.Texture.from(cv);
  }

  // ========================================================================
  // 3. GERADOR DE PROPS DA FAZENDA VIVA (4 ESTÁGIOS REAIS NO MAPA)
  // ========================================================================
  function gerarTexturaCanteiro(estagio) {
    const W = 84, H = 46;
    const { cv, ctx } = criarCanvas(W, H);

    // 1. Moldura de Toras de Madeira Rústica
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(2, 2, W - 4, H - 4);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(4, 4, W - 8, H - 8);

    // 2. Terra Arada Interior (com sulcos agrícolas)
    ctx.fillStyle = estagio === 0 ? '#451a03' : '#3d1d07';
    ctx.fillRect(8, 8, W - 16, H - 16);

    // Sulcos de arado
    ctx.strokeStyle = '#291104';
    ctx.lineWidth = 2;
    for (let y = 14; y < H - 10; y += 7) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(W - 10, y);
      ctx.stroke();
    }

    // 3. Renderização conforme o Estágio
    if (estagio === 0) {
      // ESTÁGIO 1: Terra Arada Fresca (pequenas estacas e pedregulhos)
      ctx.fillStyle = '#78716c';
      ctx.fillRect(16, 12, 3, 2);
      ctx.fillRect(42, 22, 3, 2);
      ctx.fillRect(66, 15, 3, 2);
      // Estaca com barbante de alinhamento
      ctx.fillStyle = '#d97706';
      ctx.fillRect(12, 10, 2, 8);
      ctx.fillRect(W - 14, 10, 2, 8);
    } else if (estagio === 1) {
      // ESTÁGIO 2: Brotos Verdes (plantinhas pequenas saindo do solo)
      ctx.fillStyle = '#4ade80';
      for (let x = 15; x < W - 15; x += 11) {
        for (let y = 13; y < H - 12; y += 7) {
          ctx.beginPath();
          ctx.arc(x, y - 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(x - 0.5, y - 1, 1, 3);
          ctx.fillStyle = '#4ade80';
        }
      }
    } else if (estagio === 2) {
      // ESTÁGIO 3: Plantação Madura (folhagem farta + cenouras laranjas visíveis)
      for (let x = 14; x < W - 14; x += 12) {
        for (let y = 13; y < H - 12; y += 8) {
          // Folhagem densa
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.arc(x, y - 4, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x - 2, y - 5, 3, 0, Math.PI * 2);
          ctx.fill();
          // Raiz / Cenoura pontuda para fora da terra
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(x - 2, y);
          ctx.lineTo(x + 2, y);
          ctx.lineTo(x, y + 5);
          ctx.closePath();
          ctx.fill();
          // Rama verde no topo da cenoura
          ctx.fillStyle = '#15803d';
          ctx.fillRect(x - 1, y - 2, 2, 2);
        }
      }
    } else if (estagio === 3) {
      // ESTÁGIO 4: Lote Recém-Colhido (terra revolvida + cestos de colheita cheios)
      ctx.fillStyle = '#291104';
      ctx.fillRect(12, 12, 14, 8);
      ctx.fillRect(36, 18, 18, 8);
      // Cestos de vime cheios na cabeceira
      ctx.fillStyle = '#92400e';
      ctx.fillRect(W - 22, 10, 10, 8);
      ctx.fillRect(W - 20, 22, 9, 8);
      // Cenouras dentro do cesto
      ctx.fillStyle = '#f97316';
      ctx.fillRect(W - 20, 9, 3, 4);
      ctx.fillRect(W - 16, 8, 3, 5);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(W - 19, 7, 2, 2);
      ctx.fillRect(W - 15, 6, 2, 2);
    }

    return PIXI.Texture.from(cv);
  }

  // ========================================================================
  // 4. GERADOR DE FOGUEIRA VIVA (3 ESTÁGIOS REAIS)
  // ========================================================================
  function gerarTexturaFogueira(nivel) {
    const W = 52, H = 44;
    const { cv, ctx } = criarCanvas(W, H);
    const cx = W / 2, cy = H / 2 + 6;

    // 1. Círculo de Pedras Rústicas
    const pedras = [
      [-16, -3], [-12, -8], [0, -10], [12, -8], [16, -3],
      [14, 5], [4, 8], [-8, 7], [-15, 3]
    ];
    pedras.forEach(([px, py]) => {
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.arc(cx + px, cy + py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.arc(cx + px - 1, cy + py - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    if (nivel === 0) {
      // NÍVEL 1: Apagada / Frio (Cinzas escuras, carvão e fumaça tênue)
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pedaços de carvão
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 5, cy - 2, 4, 3);
      ctx.fillRect(cx + 2, cy - 1, 5, 3);
      // Fumaça cinza fria
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy - 12, 4, 0, Math.PI * 2);
      ctx.arc(cx + 2, cy - 18, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (nivel === 1) {
      // NÍVEL 2: Brasas Baixas (Carvão incandescente avermelhado e pequenas chamas)
      ctx.fillStyle = '#291104';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 11, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Brasas vermelhas e laranjas
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(cx - 7, cy - 3, 14, 5);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(cx - 4, cy - 2, 8, 3);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 1, cy - 4, 3, 4);
    } else {
      // NÍVEL 3: Fogueira Viva Alta (Toras cruzadas ardendo e labaredas volumosas)
      // Toras
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 10, cy - 2, 20, 4);
      ctx.fillRect(cx - 2, cy - 8, 4, 14);

      // Labareda Externa (Vermelha)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.quadraticCurveTo(cx - 12, cy - 18, cx - 2, cy - 24);
      ctx.quadraticCurveTo(cx + 4, cy - 20, cx, cy - 14);
      ctx.quadraticCurveTo(cx + 10, cy - 18, cx + 10, cy);
      ctx.closePath();
      ctx.fill();

      // Labareda Média (Laranja intenso)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.quadraticCurveTo(cx - 8, cy - 14, cx - 1, cy - 19);
      ctx.quadraticCurveTo(cx + 6, cy - 14, cx + 6, cy);
      ctx.closePath();
      ctx.fill();

      // Núcleo Incandescente (Amarelo Dourado / Branco)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy);
      ctx.lineTo(cx, cy - 12);
      ctx.lineTo(cx + 3, cy);
      ctx.closePath();
      ctx.fill();
    }

    return PIXI.Texture.from(cv);
  }

  // ========================================================================
  // 5. GERADOR DE ÁRVORES VIVAS E TOCOS (COM WIND SWAY)
  // ========================================================================
  function gerarTexturaArvore(tipo, cortada) {
    const W = 54, H = 68;
    const { cv, ctx } = criarCanvas(W, H);
    const cx = W / 2, cyChao = H - 6;

    if (cortada) {
      // TOCO DE MADEIRA (Árvore cortada para recurso)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, cyChao, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tronco serrado
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(cx - 6, cyChao - 9, 12, 9);
      // Anéis de crescimento
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.ellipse(cx, cyChao - 9, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8d5b2d';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Lascas de machado
      ctx.fillStyle = '#e9edc9';
      ctx.fillRect(cx + 8, cyChao - 3, 3, 2);
      ctx.fillRect(cx - 10, cyChao - 2, 2.5, 2);
    } else {
      // ÁRVORE INTEIRA (Pinheiro ou Carvalho)
      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, cyChao, 16, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tronco robusto
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 4, cyChao - 20, 8, 20);

      if (tipo === 'pinheiro') {
        // Pinheiro em 3 camadas de agulhas
        const camadas = [
          { y: cyChao - 18, w: 22, h: 16, cor: '#14532d' },
          { y: cyChao - 30, w: 18, h: 14, cor: '#166534' },
          { y: cyChao - 42, w: 14, h: 16, cor: '#15803d' }
        ];
        camadas.forEach(c => {
          ctx.fillStyle = c.cor;
          ctx.beginPath();
          ctx.moveTo(cx - c.w, c.y);
          ctx.lineTo(cx, c.y - c.h);
          ctx.lineTo(cx + c.w, c.y);
          ctx.closePath();
          ctx.fill();
        });
      } else {
        // Carvalho / Frondosa com copas volumosas
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(cx - 9, cyChao - 34, 13, 0, Math.PI * 2);
        ctx.arc(cx + 9, cyChao - 34, 13, 0, Math.PI * 2);
        ctx.arc(cx, cyChao - 44, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(cx - 4, cyChao - 46, 8, 0, Math.PI * 2);
        ctx.arc(cx + 6, cyChao - 40, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return PIXI.Texture.from(cv);
  }

  // ========================================================================
  // 6. GERENCIADOR DO MOTOR DE SPRITES
  // ========================================================================
  const MotorSpritesIlha = {
    carregado: false,

    inicializar() {
      if (this.carregado) return;
      console.log('🎨 [SPRITES-ILHA] Pré-renderizando Atlas de Sprites HD e carregando assets/sprites/ ...');

      // 0. Carregamento Direto das Texturas SVG de Alta Definição
      try {
        const arqs = [
          'icaro', 'icaro_walk', 'lara', 'lara_walk', 'joao', 'joao_walk', 'maria', 'maria_walk',
          'pantera', 'tubarao',
          'canteiro_arado', 'canteiro_broto', 'canteiro_maduro', 'canteiro_colhido',
          'fogueira_apagada', 'fogueira_brasa', 'fogueira_alta',
          'casa_nivel1', 'casa_nivel2', 'casa_nivel3',
          'curral', 'barco', 'arena', 'construcao_obras',
          'arvore_pinheiro', 'arvore_carvalho'
        ];
        arqs.forEach(nome => {
          cacheSvg[nome] = PIXI.Texture.from('/assets/sprites/' + nome + '.svg');
        });
      } catch (errSvg) {
        console.warn('⚠️ [SPRITES-ILHA] Aviso ao pré-carregar SVGs:', errSvg);
      }

      // 1. Texturas dos Habitantes (4 seres x 4 frames de caminhada x 6 ações)
      const seres = ['icaro', 'lara', 'joao', 'maria'];
      const acoes = ['parado', 'cortar_arvore', 'pescar', 'plantar', 'colher', 'construir', 'tocha', 'beber'];

      seres.forEach(sId => {
        cacheTexturas.habitantes[sId] = {};
        acoes.forEach(a => {
          cacheTexturas.habitantes[sId][a] = [
            gerarSpriteHumanoide(sId, a, 0, false),
            gerarSpriteHumanoide(sId, a, 0.25, true),
            gerarSpriteHumanoide(sId, a, 0.50, true),
            gerarSpriteHumanoide(sId, a, 0.75, true)
          ];
        });
      });

      // 2. Texturas da Pantera (4 frames de espreita)
      for (let f = 0; f < 4; f++) {
        cacheTexturas.pantera.push(gerarSpritePantera(f / 4));
      }

      // 3. Texturas do Tubarão (4 frames de ondulação)
      for (let f = 0; f < 4; f++) {
        cacheTexturas.tubarao.push(gerarSpriteTubarao(f / 4));
      }

      // 4. Texturas dos Canteiros da Horta (4 estágios)
      for (let est = 0; est < 4; est++) {
        cacheTexturas.hortaEstagios.push(gerarTexturaCanteiro(est));
      }

      // 5. Texturas da Fogueira (3 níveis)
      for (let n = 0; n < 3; n++) {
        cacheTexturas.fogueiraEstagios.push(gerarTexturaFogueira(n));
      }

      // 6. Texturas de Árvores
      cacheTexturas.arvores = {
        pinheiro: gerarTexturaArvore('pinheiro', false),
        carvalho: gerarTexturaArvore('carvalho', false),
        toco: gerarTexturaArvore('pinheiro', true)
      };

      this.carregado = true;
      console.log('✅ [SPRITES-ILHA] Todos os Sprites e Props Dinâmicos carregados com sucesso!');
    },

    /**
     * Retorna a textura correta do habitante com animação e ferramenta
     */
    obterTexturaHabitante(serId, acaoAtual, caminhando, tempo) {
      if (!this.carregado) this.inicializar();
      const sId = (serId || 'icaro').toLowerCase();

      // PRIORIDADE 1: Textura SVG Rica Pré-renderizada de Alta Definição
      if (cacheSvg[sId]) {
        if (caminhando && cacheSvg[sId + '_walk']) {
          const passo = Math.sin(tempo * 0.009) > 0;
          return passo ? cacheSvg[sId + '_walk'] : cacheSvg[sId];
        }
        return cacheSvg[sId];
      }

      // Fallback: Atlas offscreen
      const tabelaSer = cacheTexturas.habitantes[sId] || cacheTexturas.habitantes.icaro;

      let chaveAcao = 'parado';
      const a = (acaoAtual || '').toLowerCase();
      if (a.includes('cortar') || a.includes('madeira')) chaveAcao = 'cortar_arvore';
      else if (a.includes('pescar')) chaveAcao = 'pescar';
      else if (a.includes('colher')) chaveAcao = 'colher';
      else if (a.includes('plantar') || a.includes('cuidar')) chaveAcao = 'plantar';
      else if (a.includes('constru') || a.includes('fabricar') || a.includes('erguer')) chaveAcao = 'construir';
      else if (a.includes('caverna') || a.includes('afugentar') || a.includes('tocha')) chaveAcao = 'tocha';
      else if (a.includes('beber') || a.includes('agua')) chaveAcao = 'beber';

      const frames = tabelaSer[chaveAcao] || tabelaSer.parado;
      if (!caminhando) return frames[0];

      // Ciclo de caminhada (4 passos/segundo)
      const indiceFrame = Math.floor((tempo * 0.006) % 3) + 1;
      return frames[indiceFrame];
    },

    /**
     * Retorna a textura da Pantera animada em espreita
     */
    obterTexturaPantera(tempo) {
      if (!this.carregado) this.inicializar();
      if (cacheSvg.pantera) return cacheSvg.pantera;
      const idx = Math.floor((tempo * 0.005) % cacheTexturas.pantera.length);
      return cacheTexturas.pantera[idx];
    },

    /**
     * Retorna a textura do Tubarão animado cortando a água
     */
    obterTexturaTubarao(tempo) {
      if (!this.carregado) this.inicializar();
      if (cacheSvg.tubarao) return cacheSvg.tubarao;
      const idx = Math.floor((tempo * 0.004) % cacheTexturas.tubarao.length);
      return cacheTexturas.tubarao[idx];
    },

    /**
     * Atualiza os 3 canteiros da horta em tempo real no mapa conforme o ecossistema
     */
    atualizarHortaProps(container, eco, posFazenda, scale) {
      if (!this.carregado) this.inicializar();
      container.removeChildren();

      const horta = (eco && eco.horta) || {};
      const totalPlantas = (horta.plantados || 0) + (horta.crescendo || 0) + (horta.maduros || 0);

      // Determina o estágio agrícola (0: Terra arada, 1: Brotos, 2: Madura, 3: Colhida)
      let estagioGeral = 0;
      if (horta.plantadoPor && totalPlantas > 0) {
        if ((horta.maduros || 0) > 0.4) estagioGeral = 2; // Madura pronta
        else estagioGeral = 1; // Brotos crescendo
      } else if (horta.ultimaColheitaCiclo) {
        estagioGeral = 3; // Recém colhida
      }

      // Renderiza 3 canteiros bem delimitados na fazenda
      const canteirosOffsets = [
        { dx: -28, dy: -14, est: estagioGeral },
        { dx: 22,  dy: -10, est: Math.max(0, estagioGeral - 1) },
        { dx: -4,  dy: 12,  est: estagioGeral === 2 ? 2 : Math.min(3, estagioGeral + 1) }
      ];

      const chavesEstagios = ['canteiro_arado', 'canteiro_broto', 'canteiro_maduro', 'canteiro_colhido'];
      canteirosOffsets.forEach(c => {
        const tex = cacheSvg[chavesEstagios[c.est]] || cacheTexturas.hortaEstagios[c.est];
        const spr = new PIXI.Sprite(tex);
        spr.anchor.set(0.5, 0.5);
        spr.x = posFazenda.x + c.dx * scale;
        spr.y = posFazenda.y + c.dy * scale;
        spr.scale.set(0.68 * scale);
        container.addChild(spr);
      });
    },

    /**
     * Atualiza a Fogueira nos 3 estados reais
     */
    atualizarFogueiraProps(container, lenha, clima, posFogueira, scale, tempo) {
      if (!this.carregado) this.inicializar();
      container.removeChildren();

      const chuvoso = (clima || '').toLowerCase().includes('tempestade');
      let nivel = 2; // Alta padrão
      if (chuvoso && lenha < 10) nivel = 0; // Apagada na chuva sem lenha
      else if (lenha < 8) nivel = 1; // Brasas fracas

      const chavesFogo = ['fogueira_apagada', 'fogueira_brasa', 'fogueira_alta'];
      const tex = cacheSvg[chavesFogo[nivel]] || cacheTexturas.fogueiraEstagios[nivel];
      const spr = new PIXI.Sprite(tex);
      spr.anchor.set(0.5, 0.7);
      spr.x = posFogueira.x;
      spr.y = posFogueira.y;
      spr.scale.set(0.95 * scale);

      // Leve pulsação térmica de chama
      if (nivel === 2) {
        spr.scale.y = (0.95 + Math.sin(tempo * 0.012) * 0.05) * scale;
      }
      container.addChild(spr);
    },

    /**
     * Renderiza e anima árvores com Wind Sway (balanço do vento)
     */
    atualizarArvoresProps(container, tempo, intensidadeVento, toScreen) {
      if (!this.carregado) this.inicializar();
      container.removeChildren();

      // Conjunto de árvores interativas mapeadas
      const florestaArvores = [
        { x: 0.73, y: 0.28, tipo: 'pinheiro', cortada: false },
        { x: 0.77, y: 0.25, tipo: 'pinheiro', cortada: false },
        { x: 0.82, y: 0.32, tipo: 'carvalho', cortada: false },
        { x: 0.30, y: 0.29, tipo: 'carvalho', cortada: false },
        { x: 0.34, y: 0.33, tipo: 'carvalho', cortada: false },
        { x: 0.26, y: 0.35, tipo: 'toco',     cortada: true } // Árvore cortada recentemente
      ];

      const sway = Math.sin(tempo * 0.003) * (0.04 + intensidadeVento * 0.08);

      florestaArvores.forEach(arv => {
        const pos = toScreen(arv.x, arv.y);
        const tex = (cacheSvg['arvore_' + arv.tipo] || cacheTexturas.arvores[arv.tipo]) || cacheTexturas.arvores.carvalho;
        const spr = new PIXI.Sprite(tex);
        spr.anchor.set(0.5, 0.9);
        spr.x = pos.x;
        spr.y = pos.y;
        spr.scale.set(0.78);
        if (!arv.cortada) {
          spr.skew.x = sway; // Wind Sway orgânico
        }
        container.addChild(spr);
      });
    },

    /**
     * Renderiza o ciclo de ondas do mar na areia e spray na cachoeira
     */
    atualizarAguaViva(graphicsMar, graphicsCachoeira, tempo, box, toScreen) {
      graphicsMar.clear();
      graphicsCachoeira.clear();

      // 1. Espuma da praia na costa sul (maré avançando e recuando)
      const ondaAvanco = Math.sin(tempo * 0.0025) * 6;
      graphicsMar.lineStyle(2.5, 0xffffff, 0.55);

      const shorePontos = [
        [0.10, 0.84], [0.22, 0.88], [0.35, 0.90], [0.48, 0.89], [0.60, 0.86]
      ];

      for (let i = 0; i < shorePontos.length - 1; i++) {
        const p1 = toScreen(shorePontos[i][0], shorePontos[i][1]);
        const p2 = toScreen(shorePontos[i+1][0], shorePontos[i+1][1]);
        graphicsMar.moveTo(p1.x, p1.y + ondaAvanco);
        graphicsMar.quadraticCurveTo((p1.x + p2.x)/2, (p1.y + p2.y)/2 + ondaAvanco * 1.3, p2.x, p2.y + ondaAvanco);
      }

      // 2. Spray e Névoa na Base da Cachoeira
      const pCach = toScreen(0.65, 0.16);
      const sprayOsc = Math.sin(tempo * 0.015) * 3;
      graphicsCachoeira.beginFill(0xffffff, 0.38);
      graphicsCachoeira.drawCircle(pCach.x - 6, pCach.y + sprayOsc, 5);
      graphicsCachoeira.drawCircle(pCach.x + 8, pCach.y - sprayOsc, 6);
      graphicsCachoeira.drawCircle(pCach.x, pCach.y + 4, 8);
      graphicsCachoeira.endFill();
    }
  };

  // ========================================================================
  // 7. DEFINIÇÃO DAS ZONAS DE EXPANSÃO (SAIR DO MAPA ÚNICO)
  // ========================================================================
  const ZONAS_MUNDO = {
    ilha_central: {
      id: 'ilha_central',
      nome: '🏝️ Ilha Central (Superfície)',
      descricao: 'O vilarejo principal com as cabanas, a fogueira sagrada, a fazenda e a praia.',
      zoomPadrao: 1.0,
      centro: { x: 0.5, y: 0.5 },
      locais: ['fogueira', 'acampamento', 'casa_icaro', 'casa_lara', 'casa_joao', 'casa_maria', 'fazenda', 'curral', 'barco', 'mar', 'rio']
    },
    caverna_ruinas: {
      id: 'caverna_ruinas',
      nome: '🪨 Caverna Sombria & Ruínas Antigas',
      descricao: 'Profundezas subterrâneas com minérios de ferro, veios de quartzo e ruínas ancestrais.',
      zoomPadrao: 1.6,
      centro: { x: 0.90, y: 0.19 },
      locais: ['caverna', 'ruinas_antigas']
    },
    floresta_santuario: {
      id: 'floresta_santuario',
      nome: '🌲 Floresta Norte & Santuário da Fé',
      descricao: 'A mata densa setentrional, cachoeira alta e o Santuário da Esperança.',
      zoomPadrao: 1.5,
      centro: { x: 0.65, y: 0.12 },
      locais: ['floresta', 'floresta_densa', 'cachoeira', 'santuario_fe']
    }
  };

  MotorSpritesIlha.cacheSvg = cacheSvg;
  window.MotorSpritesIlha = MotorSpritesIlha;
  window.ZONAS_MUNDO = ZONAS_MUNDO;

})();

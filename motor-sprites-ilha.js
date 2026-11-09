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
  // 3. GERADOR DE PROPS DA FAZENDA VIVA (INTEGRADO À ARTE DO MAPA)
  // ========================================================================
  function gerarTexturaCanteiro(estagio) {
    // Canvas transparente apenas com a vegetação/cultura (sem caixote artificial de madeira)
    const W = 64, H = 36;
    const { cv, ctx } = criarCanvas(W, H);

    if (estagio === 0) {
      // ESTÁGIO 1: Terra fresca arada - pequenas estacas discretas de marcação
      ctx.fillStyle = '#d97706';
      ctx.fillRect(8, 6, 2, 8);
      ctx.fillRect(W - 10, 6, 2, 8);
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(9, 7);
      ctx.lineTo(W - 9, 7);
      ctx.stroke();
    } else if (estagio === 1) {
      // ESTÁGIO 2: Brotos Verdes (mudas delicadas crescendo)
      for (let x = 8; x < W - 8; x += 10) {
        for (let y = 8; y < H - 6; y += 8) {
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x, y - 2, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(x - 0.5, y - 1, 1, 2.5);
        }
      }
    } else if (estagio === 2) {
      // ESTÁGIO 3: Plantação Madura (folhagem volumosa + topos de cenouras)
      for (let x = 8; x < W - 8; x += 11) {
        for (let y = 8; y < H - 6; y += 9) {
          // Folhagem densa
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(x, y - 3, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x - 1, y - 4, 2.2, 0, Math.PI * 2);
          ctx.fill();
          // Raiz / Cenoura pontuda saindo da terra
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(x - 1.5, y);
          ctx.lineTo(x + 1.5, y);
          ctx.lineTo(x, y + 4);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (estagio === 3) {
      // ESTÁGIO 4: Lote Recém-Colhido (pequenos cestos de colheita no canto)
      ctx.fillStyle = '#92400e';
      ctx.fillRect(W - 14, H - 12, 8, 7);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(W - 13, H - 14, 3, 3);
      ctx.fillRect(W - 9, H - 13, 2.5, 3);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(W - 12, H - 15, 2, 2);
    }

    return PIXI.Texture.from(cv);
  }

  // ========================================================================
  // 4. GERADOR DE FOGUEIRA VIVA (INTEGRADA AO CÍRCULO DE PEDRAS DO MAPA)
  // ========================================================================
  function gerarTexturaFogueira(nivel) {
    const W = 48, H = 48;
    const { cv, ctx } = criarCanvas(W, H);
    const cx = W / 2, cy = H / 2 + 6;

    if (nivel === 0) {
      // NÍVEL 1: Apagada / Frio (Cinzas escuras e fumaça tênue)
      ctx.fillStyle = 'rgba(28, 25, 23, 0.7)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fumaça cinza tênue
      ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 3, 0, Math.PI * 2);
      ctx.arc(cx + 1, cy - 14, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (nivel === 1) {
      // NÍVEL 2: Brasas Baixas (Carvão incandescente avermelhado)
      ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(cx - 3, cy - 2, 6, 2.5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 1, cy - 3, 2, 2);
    } else {
      // NÍVEL 3: Fogueira Viva Alta (Toras ardendo e chamas volumosas)
      // Toras centrais
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 8, cy - 1, 16, 3);
      ctx.fillRect(cx - 2, cy - 6, 3, 11);

      // Labareda Externa (Vermelha viva)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.quadraticCurveTo(cx - 10, cy - 14, cx - 2, cy - 20);
      ctx.quadraticCurveTo(cx + 3, cy - 16, cx, cy - 11);
      ctx.quadraticCurveTo(cx + 8, cy - 14, cx + 8, cy);
      ctx.closePath();
      ctx.fill();

      // Labareda Média (Laranja intenso)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.quadraticCurveTo(cx - 6, cy - 11, cx - 1, cy - 15);
      ctx.quadraticCurveTo(cx + 5, cy - 11, cx + 5, cy);
      ctx.closePath();
      ctx.fill();

      // Núcleo Incandescente (Amarelo Dourado / Branco)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(cx - 2.5, cy);
      ctx.lineTo(cx, cy - 9);
      ctx.lineTo(cx + 2.5, cy);
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
          'arvore_pinheiro', 'arvore_carvalho',
          'palmeira', 'ponte_madeira', 'caverna_rocha', 'pier_madeira', 'moinho'
        ];
        const SVG_VER = '20261108_2125';
        arqs.forEach(nome => {
          cacheSvg[nome] = PIXI.Texture.from('/assets/sprites/' + nome + '.svg?v=' + SVG_VER);
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
     * Atualiza os canteiros da horta em tempo real no mapa conforme o ecossistema.
     * REGRA: Se NADA foi plantado pelos personagens, a área fica 100% LIMPA/APAGADA.
     * O solo do mapa fica livre. Quando plantam, a horta surge e cresce acompanhando o cultivo.
     */
    atualizarHortaProps(container, eco, posFazenda, scale) {
      if (!this.carregado) this.inicializar();
      container.removeChildren();

      const horta = (eco && eco.horta) || {};
      const plantados = Number(horta.plantados) || 0;
      const crescendo = Number(horta.crescendo) || 0;
      const maduros = Number(horta.maduros) || 0;
      const totalPlantas = plantados + crescendo + maduros;

      // Se ainda não houve plantio ou a horta está vazia, exibe 1 canteiro de terra arada
      // delimitando a horta e indicando que o solo está pronto para receber sementes
      if (!horta.plantadoPor || totalPlantas <= 0.05) {
        const texArado = cacheSvg['canteiro_arado'] || cacheTexturas.hortaEstagios[0];
        if (texArado) {
          const spr = new PIXI.Sprite(texArado);
          spr.anchor.set(0.5, 0.5);
          spr.x = posFazenda.x;
          spr.y = posFazenda.y;
          spr.scale.set(0.72 * scale);
          spr.alpha = 0.92;
          container.addChild(spr);
        }
        return;
      }

      // Estágio predominante das plantas:
      // 0: recém-plantado (sulcos frescos com sementes/estacas)
      // 1: brotos em crescimento ativo (folhinhas verdes crescendo)
      // 2: maduras prontas para colheita (folhagem densa e legumes/frutos visíveis)
      let estagioGeral = 0;
      if (maduros > 0.4) {
        estagioGeral = 2; // madura
      } else if (crescendo > 0.2) {
        estagioGeral = 1; // crescendo
      } else {
        estagioGeral = 0; // broto inicial
      }

      // A área se expande organicamente conforme a QUANTIDADE plantada:
      // <= 3 plantas: 1 canteiro modesto concentrado
      // 4 a 7 plantas: 2 canteiros orgânicos
      // 8+ plantas: 3 canteiros orgânicos cheios
      let canteirosOffsets = [{ dx: 0, dy: 0, est: estagioGeral }];
      if (totalPlantas > 7) {
        canteirosOffsets = [
          { dx: -18, dy: -6, est: estagioGeral },
          { dx: 14,  dy: -2, est: estagioGeral === 2 && crescendo > 1 ? 1 : estagioGeral },
          { dx: -2,  dy: 10, est: estagioGeral }
        ];
      } else if (totalPlantas > 3) {
        canteirosOffsets = [
          { dx: -14, dy: -4, est: estagioGeral },
          { dx: 12,  dy: 6,  est: estagioGeral }
        ];
      }

      // Escala visual das plantas cresce de acordo com a maturação (plantas crescem em tamanho)
      const fatorCrescimento = estagioGeral === 2 ? 0.75 : (estagioGeral === 1 ? 0.62 : 0.50);
      const chavesEstagios = ['canteiro_arado', 'canteiro_broto', 'canteiro_maduro', 'canteiro_colhido'];

      canteirosOffsets.forEach(c => {
        const tex = cacheSvg[chavesEstagios[c.est]] || cacheTexturas.hortaEstagios[c.est];
        if (tex) {
          const spr = new PIXI.Sprite(tex);
          spr.anchor.set(0.5, 0.5);
          spr.x = posFazenda.x + c.dx * scale;
          spr.y = posFazenda.y + c.dy * scale;
          spr.scale.set(fatorCrescimento * scale);
          container.addChild(spr);
        }
      });
    },

    /**
     * Atualiza a Fogueira nos 3 estados reais (integrada ao círculo de pedras do mapa)
     */
    atualizarFogueiraProps(container, lenha, clima, posFogueira, scale, tempo) {
      if (!this.carregado) this.inicializar();
      container.removeChildren();

      const chuvoso = (clima || '').toLowerCase().includes('tempestade');
      let nivel = 2; // Alta padrão
      if (chuvoso && lenha < 10) nivel = 0; // Apagada na chuva sem lenha
      else if (lenha < 8) nivel = 1; // Brasas fracas

      const tex = cacheTexturas.fogueiraEstagios[nivel] || cacheTexturas.fogueiraEstagios[2];
      if (tex) {
        const spr = new PIXI.Sprite(tex);
        spr.anchor.set(0.5, 0.85);
        spr.x = posFogueira.x;
        spr.y = posFogueira.y + 4 * scale;
        spr.scale.set(0.85 * scale);

        // Leve pulsação térmica de chama
        if (nivel === 2) {
          spr.scale.y = (0.85 + Math.sin(tempo * 0.012) * 0.06) * scale;
        }
        container.addChild(spr);
      }
    },

    /**
     * Árvores da Ilha: O mapa oficial já possui árvores profissionais pintadas à mão.
     * Mantém o container limpo sem sobreposições artificiais redundantes.
     */
    atualizarArvoresProps(container, tempo, intensidadeVento, toScreen) {
      if (!this.carregado) this.inicializar();
      container.removeChildren();
    },

    /**
     * Renderiza a Camada Viva de Superfície da Água:
     * - Cobertura translúcida do oceano tropical com profundidade
     * - Cáusticas solares e reflexos móveis de luz
     * - Rebentação com espuma dupla na praia do sul
     * - Esteira hidrodinâmica em V (V-wake) e barbatana dorsal cortando a água sobre o tubarão
     * - Spray e correnteza viva na cachoeira e foz do rio
     */
    atualizarAguaViva(graphicsMar, graphicsCachoeira, tempo, box, toScreen, tubaraoSurface) {
      graphicsMar.clear();
      graphicsCachoeira.clear();
      if (!box || !toScreen) return;

      const sc = box.scale || 1;

      // 1. Manto Translúcido do Oceano Sul (Profundidade e Tom Turquesa Caribenho)
      // Cobre suavemente a área marítima ao sul e cantos para integrar o tubarão submerso
      const marTop = box.y + box.h * 0.77;
      const marH = box.h * 0.28;
      
      // Camada 1: Profundidade média translúcida
      graphicsMar.beginFill(0x0284c7, 0.22);
      graphicsMar.drawRect(box.x, marTop, box.w, marH);
      graphicsMar.endFill();

      // Camada 2: Abismo profundo na borda inferior
      graphicsMar.beginFill(0x034a78, 0.18);
      graphicsMar.drawRect(box.x, box.y + box.h * 0.89, box.w, box.h * 0.15);
      graphicsMar.endFill();

      // 2. Ondas e Cáusticas Solares Refletindo na Água Tropical (12 células de luz)
      for (let i = 0; i < 12; i++) {
        const u = 0.08 + (i * 0.076);
        const v = 0.83 + ((i % 3) * 0.05);
        const p = toScreen(u, v);
        const fase = tempo * 0.0018 + i * 1.35;
        const dx = Math.cos(fase) * 16 * sc;
        const dy = Math.sin(fase * 1.3) * 5 * sc;
        const alfaC = 0.12 + Math.sin(fase) * 0.08;

        graphicsMar.lineStyle(1.8 * sc, 0xbae6fd, Math.max(0.04, alfaC));
        graphicsMar.drawEllipse(p.x + dx, p.y + dy, (28 + Math.cos(fase)*6) * sc, (8 + Math.sin(fase)*3) * sc);
      }

      // 3. Rebentação Dupla da Costa Sul (Espuma Branca e Maré Viva)
      const ondaAvanco = Math.sin(tempo * 0.0022) * (7 * sc);
      const shorePontos = [
        [0.06, 0.82], [0.16, 0.85], [0.28, 0.89], [0.44, 0.90], [0.58, 0.87], [0.70, 0.83]
      ];

      // 3.1 Sub-espuma turquesa suave avançando na areia
      graphicsMar.lineStyle(4.5 * sc, 0x7dd3fc, 0.35);
      for (let i = 0; i < shorePontos.length - 1; i++) {
        const p1 = toScreen(shorePontos[i][0], shorePontos[i][1]);
        const p2 = toScreen(shorePontos[i+1][0], shorePontos[i+1][1]);
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2 + ondaAvanco * 1.15;
        if (i === 0) graphicsMar.moveTo(p1.x, p1.y + ondaAvanco * 0.9);
        graphicsMar.quadraticCurveTo(mx, my, p2.x, p2.y + ondaAvanco * 0.9);
      }

      // 3.2 Linha de Crista de Espuma Branca Quebrando
      graphicsMar.lineStyle(2.8 * sc, 0xffffff, 0.72);
      for (let i = 0; i < shorePontos.length - 1; i++) {
        const p1 = toScreen(shorePontos[i][0], shorePontos[i][1]);
        const p2 = toScreen(shorePontos[i+1][0], shorePontos[i+1][1]);
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2 + ondaAvanco;
        if (i === 0) graphicsMar.moveTo(p1.x, p1.y + ondaAvanco);
        graphicsMar.quadraticCurveTo(mx, my, p2.x, p2.y + ondaAvanco);

        // Bolhas de espuma espalhadas ao longo da crista
        const oscB = Math.sin(tempo * 0.004 + i);
        graphicsMar.beginFill(0xffffff, 0.65);
        graphicsMar.drawCircle(mx + oscB * 4, my - 2, 2.2 * sc);
        graphicsMar.drawCircle(p1.x + 8, p1.y + ondaAvanco - 3, 1.8 * sc);
        graphicsMar.endFill();
      }

      // 4. Efeito de Superfície do Tubarão: Barbatana Cortando a Água e Esteira em V
      if (tubaraoSurface && tubaraoSurface.ativo) {
        const { x, y, heading } = tubaraoSurface;
        
        // Ponto onde a ponta da barbatana dorsal quebra a linha d'água
        const finX = x;
        const finY = y;

        // V-Wake: dois braços de espuma que abrem para trás
        const wakeLen = 38 * sc;
        const angLeft = heading + Math.PI - 0.45;
        const angRight = heading + Math.PI + 0.45;

        const leftX = finX + Math.cos(angLeft) * wakeLen;
        const leftY = finY + Math.sin(angLeft) * wakeLen;
        const rightX = finX + Math.cos(angRight) * wakeLen;
        const rightY = finY + Math.sin(angRight) * wakeLen;

        // Ondulações concêntricas de água se propagando para trás
        const ondOsc = (tempo * 0.005) % 1;
        const r1 = (8 + ondOsc * 22) * sc;
        const backCenterX = finX + Math.cos(heading + Math.PI) * (14 * sc);
        const backCenterY = finY + Math.sin(heading + Math.PI) * (14 * sc);

        graphicsMar.lineStyle(1.5 * sc, 0xbae6fd, (1 - ondOsc) * 0.55);
        graphicsMar.drawEllipse(backCenterX, backCenterY, r1, r1 * 0.45);

        // Braço Esquerdo do V
        graphicsMar.lineStyle(2.4 * sc, 0xffffff, 0.75);
        graphicsMar.moveTo(finX, finY);
        graphicsMar.lineTo(leftX, leftY);

        // Braço Direito do V
        graphicsMar.lineStyle(2.4 * sc, 0xffffff, 0.75);
        graphicsMar.moveTo(finX, finY);
        graphicsMar.lineTo(rightX, rightY);

        // Espuma turbilhonante na base da barbatana
        graphicsMar.beginFill(0xffffff, 0.85);
        graphicsMar.drawEllipse(finX, finY, 5 * sc, 2.5 * sc);
        graphicsMar.endFill();

        // Pontinha afiada da barbatana dorsal escura projetando-se da água
        graphicsMar.beginFill(0x020617, 0.95);
        graphicsMar.lineStyle(1 * sc, 0x38bdf8, 0.7);
        const fTipX = finX + Math.cos(heading) * (4 * sc);
        const fTipY = finY + Math.sin(heading) * (4 * sc) - (3 * sc);
        const fBase1X = finX + Math.cos(heading + Math.PI * 0.7) * (5 * sc);
        const fBase1Y = finY + Math.sin(heading + Math.PI * 0.7) * (5 * sc);
        const fBase2X = finX + Math.cos(heading - Math.PI * 0.7) * (5 * sc);
        const fBase2Y = finY + Math.sin(heading - Math.PI * 0.7) * (5 * sc);
        graphicsMar.moveTo(fTipX, fTipY);
        graphicsMar.lineTo(fBase1X, fBase1Y);
        graphicsMar.lineTo(fBase2X, fBase2Y);
        graphicsMar.closePath();
        graphicsMar.endFill();
      }

      // 5. Spray e Névoa na Base da Cachoeira + Correnteza do Rio
      const pCach = toScreen(0.65, 0.16);
      const sprayOsc = Math.sin(tempo * 0.015) * (3 * sc);
      graphicsCachoeira.beginFill(0xffffff, 0.45);
      graphicsCachoeira.drawCircle(pCach.x - 7 * sc, pCach.y + sprayOsc, 6 * sc);
      graphicsCachoeira.drawCircle(pCach.x + 9 * sc, pCach.y - sprayOsc, 7 * sc);
      graphicsCachoeira.drawCircle(pCach.x, pCach.y + 4 * sc, 9 * sc);
      graphicsCachoeira.endFill();

      // Correnteza da Foz do Rio desembocando no mar
      const pFoz = toScreen(0.48, 0.84);
      const oscFoz = Math.sin(tempo * 0.005) * 4 * sc;
      graphicsCachoeira.lineStyle(1.8 * sc, 0xe0f2fe, 0.5);
      graphicsCachoeira.moveTo(pFoz.x - 12 * sc, pFoz.y + oscFoz);
      graphicsCachoeira.lineTo(pFoz.x + 12 * sc, pFoz.y + oscFoz + 6 * sc);
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

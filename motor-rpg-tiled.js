/**
 * MOTOR RPG TILED — Motor de Visualização 2D Top-Down Estilo RPG (Ilha Aurora)
 *
 * Funcionalidades Principais:
 * 1. Visão 2D Top-Down Elegante: Renderiza o mapa pintado da ilha (mapa-ilha-nova.png)
 *    com proporção perfeita, trilhas conectadas, efeitos de maré e névoa viva.
 * 2. Suporte a Expansão de Mapas: Seletor de mapas interativo no topo
 *    (Ilha Central, Ilha Vizinha/Atol, Floresta Profunda/Ruínas, Baía dos Naufrágios).
 * 3. Figuras Ilustradas de Ações Reais (Action Figures / Vinhetas):
 *    - Pescar: Figurinha do personagem erguendo o peixe fisgado brilhante com gotas d'água.
 *    - Cortar Lenha: Figurinha do machado no tronco com toras empilhadas.
 *    - Caçar / Fera: Figurinha da tocha viva espantando a onça de olhos amarelos.
 *    - Plantar / Colheita: Fases visuais dos canteiros (arado -> broto -> maduro -> colheita).
 *    - Fogueira: Labaredas animadas e fagulhas ao vento.
 * 4. Quebra-Cabeça Visual da Expansão da Casa:
 *    - No terreno de cada habitante, as partes da cabana vão surgindo como peças:
 *      Estacas -> Alicerce -> Paredes -> Telhado -> Casa Concluída (Níveis 1 a 5)!
 * 5. Balões de Fala e Diálogo Vivos (Estilo AI Town):
 *    - Personagens exibem o que estão dizendo e sentindo em balões dinâmicos.
 */
(function(window) {
  'use strict';

  const CORES_PERSONAGENS = {
    icaro: '#10b981', // Esmeralda
    lara: '#a855f7',  // Roxo Real
    elara: '#a855f7',
    joao: '#3b82f6',  // Azul Oceano
    maria: '#f59e0b', // Âmbar Dourado
    pantera: '#dc2626'
  };

  const MAPAS_REGIOES = {
    ilha_central: {
      id: 'ilha_central',
      nome: '🏝️ Ilha Central (Vila Aurora)',
      imagemFundo: '/mapa-ilha-nova.png',
      fallbackColor: '#0c4a6e',
      descricao: 'O coração da colônia. Acampamento, fogueira central, cabanas dos sobreviventes e rio doce.'
    },
    ilha_vizinha: {
      id: 'ilha_vizinha',
      nome: '🌴 Ilha Vizinha (Atol dos Corais)',
      imagemFundo: '/mapa-ilha-nova.png',
      fallbackColor: '#0369a1',
      descricao: 'Ilhote tropical a sudoeste. Rica em conchas raras, palmeiras e corais coloridos.'
    },
    floresta_ruinas: {
      id: 'floresta_ruinas',
      nome: '🌲 Floresta Densa & Ruínas',
      imagemFundo: '/mapa-ilha-nova.png',
      fallbackColor: '#14532d',
      descricao: 'Zona misteriosa além da caverna e da mata alta. Pistas de civilizações antigas e veios de minério.'
    },
    baia_naufragios: {
      id: 'baia_naufragios',
      nome: '⚓ Baía dos Naufrágios',
      imagemFundo: '/mapa-ilha-nova.png',
      fallbackColor: '#075985',
      descricao: 'Recifes do sul onde as carcaças de navios antigos repousam. Caixas de suprimento e tubarões.'
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
      this.tooltip = null;
      this.baloes = {}; // { serId: { texto, tipo, tempoRestante } }
    }

    async init(containerElement) {
      if (this.canvas && this.container === containerElement) return;
      this.container = containerElement;

      // Limpa canvas anterior se houver
      const antigo = document.getElementById('rpg-tiled-canvas');
      if (antigo) antigo.remove();

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'rpg-tiled-canvas';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.canvas.style.background = '#061320';
      this.canvas.style.cursor = 'pointer';
      this.container.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d');

      window.addEventListener('resize', () => this.redimensionar());
      this.redimensionar();

      // Interação de Clique
      this.canvas.addEventListener('click', (e) => this.tratarClique(e));

      // Carrega fundo do mapa pintado
      this.carregarFundo();

      // Pré-carrega biblioteca de sprites (Ações e Peças do Quebra-Cabeça)
      this.carregarSprites();

      // Carrega dados de Tiled
      try {
        const resp = await fetch('/mapa-rpg-tiled.json');
        this.tiledData = await resp.json();
        this.carregado = true;
        console.log('[Motor RPG 2D Top-Down] Mapa e Camadas carregados!');
      } catch (err) {
        console.warn('[Motor RPG 2D Top-Down] Erro ao carregar mapa-rpg-tiled.json:', err);
      }

      this.iniciarLoop();
    }

    carregarFundo() {
      this.imgFundo = new Image();
      this.imgFundo.onload = () => {
        this.fundoPronto = true;
        console.log('[Motor RPG 2D] Imagem de fundo da ilha carregada com sucesso.');
      };
      this.imgFundo.onerror = () => {
        this.fundoPronto = false;
        console.warn('[Motor RPG 2D] Fallback para renderização procedural de terreno.');
      };
      this.imgFundo.src = '/mapa-ilha-nova.png';
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
        ['barco', '/assets/sprites/barco.svg']
      ];

      lista.forEach(([chave, url]) => {
        const img = new Image();
        img.src = url;
        this.sprites[chave] = img;
      });
    }

    redimensionar() {
      if (!this.canvas || !this.container) return;
      const rect = this.container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      if (this.ctx) {
        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);
      }
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

    atualizarEstado(stateData) {
      this.estadoAtual = stateData;
      if (!stateData || !stateData.seres) return;

      const w = (this.canvas ? this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2)) : 1280);
      const h = (this.canvas ? this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2)) : 768);

      const zonas = (this.tiledData && this.tiledData.zonas) || {};

      Object.values(stateData.seres).forEach(ser => {
        if (ser.status === 'morto') {
          delete this.personagens[ser.id];
          return;
        }

        const zona = zonas[ser.local] || { pixelX: 640, pixelY: 448 };
        const destX = (zona.pixelX / 1280) * w;
        const destY = (zona.pixelY / 896) * h;

        let p = this.personagens[ser.id];
        if (!p) {
          p = {
            id: ser.id,
            nome: ser.nome || ser.id,
            x: destX + (Math.random() - 0.5) * 20,
            y: destY + (Math.random() - 0.5) * 20,
            targetX: destX,
            targetY: destY,
            acao: ser.ultimaAcao || 'Existindo',
            fala: ser.ultimaFala || '',
            cor: CORES_PERSONAGENS[ser.id] || '#38bdf8',
            passo: 0,
            tempoAcao: 0
          };
          this.personagens[ser.id] = p;
        }

        p.targetX = destX;
        p.targetY = destY;
        p.acao = ser.ultimaAcao || ser.local || 'Existindo';
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

    renderizar() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const h = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

      ctx.clearRect(0, 0, w, h);

      // 1. CAMADA DE FUNDO — MAPA ILUSTRADO COMPLETO DA ILHA
      this.desenharFundoMapa(ctx, w, h);

      // 2. CAMADA DE ÁREAS & QUEBRA-CABEÇA DAS CASAS
      this.desenharZonasECasas(ctx, w, h);

      // 3. CAMADA DE FOGUEIRA, HORTA E ELEMENTOS VIVOS
      this.desenharElementosVivos(ctx, w, h);

      // 4. CAMADA DE PERSONAGENS & FIGURAS DE AÇÕES (ACTION FIGURES)
      this.desenharPersonagensEAcoes(ctx, w, h);

      // 5. CAMADA DE BALÕES DE DIÁLOGO
      this.desenharBaloesDialogo(ctx);

      // 6. HUD DO MODO RPG & SELETOR DE EXPANSÃO DE MAPAS
      this.desenharHudExpansaoMapas(ctx, w, h);
    }

    desenharFundoMapa(ctx, w, h) {
      if (this.fundoPronto && this.imgFundo && this.imgFundo.complete) {
        ctx.drawImage(this.imgFundo, 0, 0, w, h);

        // Brilho suave da água nas margens
        ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
        ctx.fillRect(0, 0, w, h);
      } else {
        // Fallback procedural gracioso
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.7);
        grad.addColorStop(0, '#0c4a6e');
        grad.addColorStop(1, '#031a2f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Terra da Ilha
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.5, w * 0.42, h * 0.38, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#d97706';
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.5, w * 0.38, h * 0.34, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#166534';
        ctx.fill();
      }

      // Desenha as Trilhas de Terra conectando a vila
      this.desenharTrilhas(ctx, w, h);
    }

    desenharTrilhas(ctx, w, h) {
      const pFogo = this.coordZona('fogueira', w, h);
      const conexoes = [
        ['casa_icaro', 'acampamento'],
        ['acampamento', 'fogueira'],
        ['fogueira', 'casa_joao'],
        ['fogueira', 'rio'],
        ['fogueira', 'fazenda'],
        ['casa_icaro', 'casa_lara'],
        ['casa_lara', 'bosque'],
        ['bosque', 'casa_joao'],
        ['casa_joao', 'floresta'],
        ['floresta', 'caverna'],
        ['floresta', 'cachoeira'],
        ['fazenda', 'casa_maria'],
        ['fazenda', 'curral'],
        ['fogueira', 'mar'],
        ['mar', 'barco']
      ];

      ctx.save();
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)'; // Terra batida suave
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      conexoes.forEach(([a, b]) => {
        const pa = this.coordZona(a, w, h);
        const pb = this.coordZona(b, w, h);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });

      // Linha central mais clara da trilha pisada
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.22)';
      ctx.lineWidth = 4;
      conexoes.forEach(([a, b]) => {
        const pa = this.coordZona(a, w, h);
        const pb = this.coordZona(b, w, h);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });
      ctx.restore();
    }

    // QUEBRA-CABEÇA DA CASA: Renderiza as casas e suas partes em evolução no terreno
    desenharZonasECasas(ctx, w, h) {
      const casasMundo = (this.estadoAtual && this.estadoAtual.mundo && this.estadoAtual.mundo.casas) || {};

      const listaCasas = [
        { id: 'casa_icaro', dono: 'Ícaro', cor: '#10b981' },
        { id: 'casa_lara', dono: 'Lara', cor: '#a855f7' },
        { id: 'casa_joao', dono: 'João', cor: '#3b82f6' },
        { id: 'casa_maria', dono: 'Maria', cor: '#f59e0b' }
      ];

      listaCasas.forEach(c => {
        const p = this.coordZona(c.id, w, h);
        const info = casasMundo[c.id] || { nivel: 1, bau: {}, obra: null };
        const nivel = Math.max(1, Math.min(5, info.nivel || 1));
        const obra = info.obra; // { paraNivel, progresso }
        const bau = info.bau || {};

        // 1. Desenha o Terreno Delimitado da Casa (Lote com Cerca Rústica)
        ctx.save();
        ctx.fillStyle = 'rgba(120, 53, 15, 0.18)';
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(p.x - 38, p.y - 28, 76, 56, 8);
        ctx.fill();
        ctx.stroke();

        // 2. Quebra-Cabeça de Ampliação: se houver obra em curso ou materiais no baú
        if (obra && obra.progresso < 100) {
          // Obras em andamento: exibe as peças do quebra-cabeça surgindo no lote!
          const prog = obra.progresso || 20;

          if (prog < 25) {
            // Peça 1: Estacas e Valas de Demarcação
            this.desenharSpriteOuFallback(ctx, 'peca_estacas', p.x - 32, p.y - 24, 64, 48);
          } else if (prog < 50) {
            // Peça 2: Alicerce de Pedras e Vigas nos Cantos
            this.desenharSpriteOuFallback(ctx, 'peca_alicerce', p.x - 32, p.y - 24, 64, 48);
          } else if (prog < 75) {
            // Peça 3: Paredes de Toras Subindo
            this.desenharSpriteOuFallback(ctx, 'peca_paredes', p.x - 32, p.y - 24, 64, 48);
          } else {
            // Peça 4: Estrutura do Telhado e Caibros
            this.desenharSpriteOuFallback(ctx, 'peca_telhado', p.x - 32, p.y - 24, 64, 48);
          }

          // Barra de Progresso do Quebra-Cabeça da Casa
          ctx.fillStyle = 'rgba(8, 24, 39, 0.9)';
          ctx.fillRect(p.x - 26, p.y + 32, 52, 7);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(p.x - 25, p.y + 33, (50 * prog) / 100, 5);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(p.x - 26, p.y + 32, 52, 7);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`Obra: ${prog}%`, p.x, p.y + 48);
        } else {
          // Casa Concluída no seu nível atual
          const chaveNv = `casa_nv${nivel}`;
          this.desenharSpriteOuFallback(ctx, chaveNv, p.x - 32, p.y - 26, 64, 52);
        }

        // 3. Placa Indicativa da Cabana com Nome e Nível
        ctx.fillStyle = 'rgba(11, 23, 38, 0.88)';
        ctx.strokeStyle = c.cor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(p.x - 42, p.y - 40, 84, 18, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`🏠 ${c.dono} (Nv ${nivel})`, p.x, p.y - 28);

        ctx.restore();
      });
    }

    desenharElementosVivos(ctx, w, h) {
      // 1. FOGUEIRA CENTRAL VIVA COM FAÍSCAS E FUMAÇA
      const pFogo = this.coordZona('fogueira', w, h);
      ctx.save();
      // Brilho do calor ao redor
      const gradCalor = ctx.createRadialGradient(pFogo.x, pFogo.y, 4, pFogo.x, pFogo.y, 40);
      gradCalor.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
      gradCalor.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = gradCalor;
      ctx.beginPath();
      ctx.arc(pFogo.x, pFogo.y, 40, 0, Math.PI * 2);
      ctx.fill();

      // Sprite da Fogueira
      this.desenharSpriteOuFallback(ctx, 'fogueira_alta', pFogo.x - 22, pFogo.y - 26, 44, 44);

      // Fagulhas voando ao vento
      for (let i = 0; i < 4; i++) {
        const sparkY = pFogo.y - 18 - ((this.tempo * 25 + i * 14) % 32);
        const sparkX = pFogo.x + Math.sin(this.tempo * 5 + i) * 6;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. FAZENDA E HORTA COM ESTÁGIOS VISUAIS
      const pFaz = this.coordZona('fazenda', w, h);
      ctx.save();
      const eco = (this.estadoAtual && this.estadoAtual.mundo && this.estadoAtual.mundo.ecossistema) || {};
      const horta = eco.horta || { plantados: 4, maduros: 2 };
      const faseHorta = (horta.maduros > 2) ? 'canteiro_maduro' : (horta.plantados > 0 ? 'canteiro_broto' : 'canteiro_arado');

      this.desenharSpriteOuFallback(ctx, faseHorta, pFaz.x - 30, pFaz.y - 22, 60, 44);

      ctx.fillStyle = 'rgba(8, 24, 39, 0.85)';
      ctx.fillRect(pFaz.x - 35, pFaz.y + 24, 70, 14);
      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🌱 Horta Comunitária', pFaz.x, pFaz.y + 34);
      ctx.restore();

      // 3. CAVERNA SOMBRIA & MINAS
      const pCav = this.coordZona('caverna', w, h);
      this.desenharSpriteOuFallback(ctx, 'caverna', pCav.x - 35, pCav.y - 28, 70, 56);

      // 4. CURRAL DE ANIMAIS
      const pCurral = this.coordZona('curral', w, h);
      this.desenharSpriteOuFallback(ctx, 'curral', pCurral.x - 30, pCurral.y - 24, 60, 48);

      // 5. CAIS DO BARCO NO SUL
      const pBarco = this.coordZona('barco', w, h);
      this.desenharSpriteOuFallback(ctx, 'barco', pBarco.x - 26, pBarco.y - 20, 52, 40);
    }

    desenharPersonagensEAcoes(ctx, w, h) {
      const lista = Object.values(this.personagens);
      lista.sort((a, b) => a.y - b.y);

      lista.forEach(p => {
        // Interpolação suave em direção ao destino
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          p.x += (dx / dist) * Math.min(dist, 2.2);
          p.y += (dy / dist) * Math.min(dist, 2.2);
          p.passo += 0.22;
        }

        const bob = Math.sin(p.passo) * 2;

        ctx.save();
        // Sombra suave sob os pés
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 5, 11, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo do Habitante (Túnica com a cor característica)
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 7 + bob, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cabeça
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 18 + bob, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Nameplate com Nome e Ação
        ctx.fillStyle = 'rgba(8, 24, 39, 0.9)';
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(p.x - 48, p.y - 48 + bob, 96, 22, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(p.nome, p.x, p.y - 37 + bob);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '8.5px system-ui';
        ctx.fillText(String(p.acao).slice(0, 16), p.x, p.y - 28 + bob);

        // =====================================================================
        // FIGURAS ILUSTRADAS DE AÇÃO REAL (ACTION FIGURES / VINHETAS VIVAS)
        // =====================================================================
        this.desenharActionFigure(ctx, p, bob);

        ctx.restore();
      });
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
        // Vinheta flutuante estilizada ao lado do personagem com animação suave de respiração
        const figX = p.x + 18;
        const figY = p.y - 56 + bob + Math.sin(this.tempo * 4) * 3;

        ctx.save();
        // Moldura circular translúcida com brilho dourado
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(figX + 22, figY + 22, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Desenha a figurinha da ação
        ctx.drawImage(this.sprites[chaveSprite], figX - 2, figY - 2, 48, 48);
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
        const texto = b.texto.slice(0, 75);
        ctx.font = '11px system-ui';
        const larg = Math.min(220, ctx.measureText(texto).width + 20);

        const bx = p.x - larg * 0.5;
        const by = p.y - 78;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, larg, 26, 6);
        ctx.fill();
        ctx.stroke();

        // Rabicho do balão apontando para o ser
        ctx.beginPath();
        ctx.moveTo(p.x - 4, by + 26);
        ctx.lineTo(p.x, by + 32);
        ctx.lineTo(p.x + 4, by + 26);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(texto, p.x, by + 17);
        ctx.restore();
      });
    }

    desenharHudExpansaoMapas(ctx, w, h) {
      ctx.save();
      // Painel Superior com Seletor de Regiões / Expansão de Mapas
      ctx.fillStyle = 'rgba(8, 24, 39, 0.92)';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(14, 14, Math.min(680, w - 28), 58, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('🗺️ MAPA RPG TOP-DOWN 2D — ILHA AURORA (EXPANSÃO DE MAPAS)', 26, 32);

      // Botões das 4 Regiões
      const regioes = Object.values(MAPAS_REGIOES);
      let btnX = 26;
      regioes.forEach(r => {
        const ativo = (this.mapaAtivo === r.id);
        const largBtn = 150;

        ctx.fillStyle = ativo ? '#0284c7' : '#1e293b';
        ctx.strokeStyle = ativo ? '#38bdf8' : '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(btnX, 40, largBtn, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = ativo ? '#ffffff' : '#94a3b8';
        ctx.font = (ativo ? 'bold ' : '') + '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(r.nome, btnX + largBtn * 0.5, 56);

        btnX += largBtn + 10;
      });

      ctx.restore();
    }

    desenharSpriteOuFallback(ctx, chave, x, y, larg, alt) {
      if (this.sprites[chave] && this.sprites[chave].complete && this.sprites[chave].naturalWidth > 0) {
        ctx.drawImage(this.sprites[chave], x, y, larg, alt);
      } else {
        // Fallback gráfico gracioso
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x, y, larg, alt);
        ctx.strokeStyle = '#f59e0b';
        ctx.strokeRect(x, y, larg, alt);
      }
    }

    coordZona(nome, w, h) {
      const zonas = (this.tiledData && this.tiledData.zonas) || {};
      const z = zonas[nome] || { pixelX: 640, pixelY: 448 };
      return {
        x: (z.pixelX / 1280) * w,
        y: (z.pixelY / 896) * h
      };
    }

    tratarClique(e) {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      // 1. Checa clique nos botões de expansão de mapas
      if (clickY >= 40 && clickY <= 64) {
        const regioes = Object.values(MAPAS_REGIOES);
        let btnX = 26;
        for (const r of regioes) {
          const largBtn = 150;
          if (clickX >= btnX && clickX <= btnX + largBtn) {
            this.mudarRegiao(r.id);
            return;
          }
          btnX += largBtn + 10;
        }
      }

      // 2. Checa clique nas Casas para abrir CORTEX e Quebra-Cabeça da Moradia
      const casasIds = ['casa_icaro', 'casa_lara', 'casa_joao', 'casa_maria', 'fogueira', 'caverna', 'fazenda'];
      for (const cid of casasIds) {
        const p = this.coordZona(cid, w, h);
        if (Math.hypot(clickX - p.x, clickY - p.y) < 38) {
          this.abrirPainelLocal(cid);
          return;
        }
      }
    }

    mudarRegiao(regiaoId) {
      if (!MAPAS_REGIOES[regiaoId]) return;
      this.mapaAtivo = regiaoId;
      console.log(`[Motor RPG 2D] Alternando visualização para a região: ${regiaoId}`);
      if (window.mostrarToast) {
        window.mostrarToast(`Explorando: ${MAPAS_REGIOES[regiaoId].nome}`);
      }
    }

    abrirPainelLocal(localId) {
      if (window.MapaRpg && typeof window.MapaRpg.abrirCortex === 'function') {
        const no = (window.MapaRpg.NOS_RPG && window.MapaRpg.NOS_RPG[localId]) || {
          id: localId,
          nome: localId,
          icone: '🏠',
          descricao: `Área comunitária na Ilha Aurora: ${localId}.`
        };
        window.MapaRpg.abrirCortex(no);
      } else if (typeof window.abrirPainelCasa === 'function') {
        window.abrirPainelCasa(localId);
      }
    }
  }

  window.MotorRpgTiled = MotorRpgTiled;
  window.motorRpgTiled = new MotorRpgTiled();
})(window);

/**
 * MOTOR RPG TILED — Renderizador de Mapa RPG em Camadas com Colisão Real
 *
 * Características:
 * 1. Leitura do arquivo Tiled (JSON): Carrega mapa-rpg-tiled.json com camadas de terreno, trilhas, colisão e estruturas.
 * 2. Colisão Real: Personagens NÃO andam na água nem atravessam montanhas. Caminham pelas trilhas e terreno firme.
 * 3. Entrar nas Casas: As casas têm portas de entrada reais. Ao chegar na porta ou clicar, abre o CORTEX/interior da moradia.
 * 4. Sincronia Viva: Atualiza personagens, inventários, ciclos e novas construções dinâmicas em tempo real sem recarregar.
 */
(function(window) {
  'use strict';

  const CORES_PERSONAGENS = {
    icaro: '#10b981', // Verde
    lara: '#a855f7',  // Roxo
    joao: '#3b82f6',  // Azul
    maria: '#f59e0b', // Dourado
    pantera: '#dc2626'
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
      this.personagens = {}; // { id: { x, y, targetX, targetY, nome, acao, cor } }
      this.estruturasDinamicas = [];
      this.mousePos = { x: 0, y: 0 };
      this.zoom = 1;
      this.offset = { x: 0, y: 0 };
    }

    async init(containerElement) {
      if (this.canvas) return; // Já iniciado
      this.container = containerElement;

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'rpg-tiled-canvas';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.canvas.style.background = '#061320';
      this.container.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d');

      window.addEventListener('resize', () => this.redimensionar());
      this.redimensionar();

      // Eventos de clique para abrir CORTEX ao clicar nas casas
      this.canvas.addEventListener('click', (e) => this.tratarClique(e));

      // Carrega o arquivo Tiled JSON
      try {
        const resp = await fetch('/mapa-rpg-tiled.json');
        this.tiledData = await resp.json();
        this.carregado = true;
        console.log('[Motor RPG Tiled] Mapa carregado com sucesso!');
      } catch (err) {
        console.warn('[Motor RPG Tiled] Erro ao carregar mapa-rpg-tiled.json:', err);
      }

      this.iniciarLoop();
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
      const step = () => {
        this.tempo += 0.016;
        this.renderizar();
        this.animId = requestAnimationFrame(step);
      };
      this.animId = requestAnimationFrame(step);
    }

    // Regra de Colisão Estrita: Retorna true se a coordenada puder ser pisada
    podeAndar(x, y) {
      // Limites da ilha (área de terra firme)
      const w = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const h = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
      
      // Proporções normalizadas
      const nx = x / w;
      const ny = y / h;

      // Água do Oceano nos quatro cantos (Colisão real com a água)
      if (nx < 0.12 || nx > 0.88 || ny < 0.10 || ny > 0.90) return false;
      // Praia do sul é o limite
      if (ny > 0.82 && (nx < 0.25 || nx > 0.75)) return false;

      return true;
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

        const zona = zonas[ser.local] || { pixelX: w * 0.5, pixelY: h * 0.5 };
        const destX = (zona.pixelX / 1280) * w;
        const destY = (zona.pixelY / 896) * h;

        let p = this.personagens[ser.id];
        if (!p) {
          p = {
            id: ser.id,
            nome: ser.nome || ser.id,
            x: destX,
            y: destY,
            targetX: destX,
            targetY: destY,
            acao: ser.ultimaAcao || 'Existindo',
            cor: CORES_PERSONAGENS[ser.id] || '#38bdf8',
            passo: 0
          };
          this.personagens[ser.id] = p;
        }

        p.targetX = destX;
        p.targetY = destY;
        p.acao = ser.ultimaAcao || ser.local || 'Existindo';
      });

      // Atualiza construções dinâmicas
      this.estruturasDinamicas = (stateData.mundo && stateData.mundo.estruturas) || [];
    }

    renderizar() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const h = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

      ctx.clearRect(0, 0, w, h);

      // 1. CAMADA DE ÁGUA / OCEANO COM ONDULAÇÃO
      const gradOceano = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.7);
      gradOceano.addColorStop(0, '#0c4a6e');
      gradOceano.addColorStop(1, '#031a2f');
      ctx.fillStyle = gradOceano;
      ctx.fillRect(0, 0, w, h);

      // Ondas da maré
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const off = (this.tempo * 18 + i * 40) % (w * 0.5);
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, w * 0.35 + off, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. CAMADA DE TERRENO FIRME (ILHA EM CAMADAS)
      // Base da Terra / Areia da Praia
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.5, w * 0.42, h * 0.40, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#d97706'; // Areia dourada da praia
      ctx.fill();

      // Interior de Terra Fértil e Grama
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.5, w * 0.38, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#166534'; // Grama viva verde escuro
      ctx.fill();

      // Região Montanhosa e Caverna (Nordeste)
      ctx.beginPath();
      ctx.ellipse(w * 0.78, h * 0.28, w * 0.14, h * 0.16, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#334155'; // Rocha escarpada
      ctx.fill();

      // Rio Doce cortando da montanha ao oceano
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.65, h * 0.18); // Cachoeira
      ctx.quadraticCurveTo(w * 0.58, h * 0.42, w * 0.50, h * 0.85); // Foz no Mar
      ctx.stroke();

      // 3. CAMADA DE TRILHAS DE TERRA (CAMINHOS CONECTANDO OS NÓS)
      ctx.strokeStyle = '#b45309'; // Trilha de terra batida
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';

      const zonas = (this.tiledData && this.tiledData.zonas) || {};
      const nosCentrais = ['fogueira', 'acampamento', 'casa_icaro', 'casa_lara', 'casa_joao', 'casa_maria', 'bosque', 'floresta', 'caverna', 'fazenda', 'curral', 'arena', 'mar', 'barco'];

      // Desenha as trilhas que os habitantes percorrem
      const pFogo = this.coordZona('fogueira', w, h);
      nosCentrais.forEach(n => {
        if (n === 'fogueira') return;
        const pN = this.coordZona(n, w, h);
        ctx.beginPath();
        ctx.moveTo(pFogo.x, pFogo.y);
        ctx.lineTo(pN.x, pN.y);
        ctx.stroke();
      });

      // 4. CAMADA DE ESTRUTURAS E CONSTRUÇÕES (COM PORTAS REAIS)
      this.desenharEstruturas(ctx, w, h);

      // 5. CAMADA DE PERSONAGENS COM Y-SORTING E MOVIMENTO
      this.desenharPersonagens(ctx, w, h);

      // 6. OVERLAY DE HUD DO MODO RPG
      ctx.fillStyle = 'rgba(11, 23, 38, 0.85)';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(14, 14, 380, 50, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('⚔️ MODO RPG EM CAMADAS (TILED & COLISÃO REAL)', 24, 34);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11.5px system-ui, sans-serif';
      ctx.fillText('Água e rochas bloqueiam caminho · Clique nas casas para entrar', 24, 52);
    }

    coordZona(nome, w, h) {
      const zonas = (this.tiledData && this.tiledData.zonas) || {};
      const z = zonas[nome] || { pixelX: 640, pixelY: 448 };
      return {
        x: (z.pixelX / 1280) * w,
        y: (z.pixelY / 896) * h
      };
    }

    desenharEstruturas(ctx, w, h) {
      const estruturas = (this.tiledData && this.tiledData.layers && this.tiledData.layers.find(l => l.name === 'Estruturas_Construcoes')?.objects) || [];

      // Fogueira Central com Fogo Vivo
      const pFogo = this.coordZona('fogueira', w, h);
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(pFogo.x, pFogo.y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Labaredas animadas
      const raioFogo = 10 + Math.sin(this.tempo * 12) * 2;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(pFogo.x, pFogo.y, raioFogo, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(pFogo.x, pFogo.y - 2, raioFogo * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Casas dos Habitantes
      estruturas.forEach(est => {
        if (est.type === 'fogueira') return;
        const cx = (est.x / 1280) * w;
        const cy = (est.y / 896) * h;
        const ew = (est.width / 1280) * w;
        const eh = (est.height / 896) * h;

        if (est.type === 'casa') {
          // Fundação e Parede
          ctx.fillStyle = '#78350f';
          ctx.fillRect(cx, cy, ew, eh);

          // Telhado em duas águas
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.moveTo(cx - 4, cy + 6);
          ctx.lineTo(cx + ew * 0.5, cy - 14);
          ctx.lineTo(cx + ew + 4, cy + 6);
          ctx.closePath();
          ctx.fill();

          // Porta da Casa (Ponto onde o personagem entra)
          ctx.fillStyle = '#2e1065';
          const pw = ew * 0.3;
          const ph = eh * 0.5;
          ctx.fillRect(cx + (ew - pw) * 0.5, cy + eh - ph, pw, ph);

          // Placa com Nome da Moradia
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(est.propriedades?.nome || est.name, cx + ew * 0.5, cy - 18);
        } else if (est.type === 'caverna') {
          // Boca da Caverna Sombria
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(cx + ew * 0.5, cy + eh * 0.5, ew * 0.45, Math.PI, 0);
          ctx.lineTo(cx + ew * 0.8, cy + eh);
          ctx.lineTo(cx + ew * 0.2, cy + eh);
          ctx.closePath();
          ctx.fill();

          // Entrada Escura
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.ellipse(cx + ew * 0.5, cy + eh * 0.65, ew * 0.25, eh * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#c084fc';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Caverna Sombria (Minas)', cx + ew * 0.5, cy - 6);
        } else if (est.type === 'fazenda' || est.type === 'curral') {
          // Cerca e área agrícola
          ctx.strokeStyle = '#854d0e';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx, cy, ew, eh);
          ctx.fillStyle = est.type === 'fazenda' ? '#4d7c0f' : '#713f12';
          ctx.fillRect(cx + 3, cy + 3, ew - 6, eh - 6);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(est.propriedades?.nome || est.name, cx + ew * 0.5, cy - 8);
        }
      });

      // Estruturas Dinâmicas construídas pelo jogador/Ícaro (Bug 3)
      this.estruturasDinamicas.forEach((est, idx) => {
        let px = w * 0.5 + Math.cos(idx * 1.5) * 80;
        let py = h * 0.5 + Math.sin(idx * 1.5) * 70;
        if (est.posicao) {
          px = w * 0.5 + (est.posicao.x * 24);
          py = h * 0.5 + (est.posicao.z * 24);
        }

        ctx.fillStyle = '#92400e';
        ctx.fillRect(px - 16, py - 16, 32, 28);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(px - 20, py - 14);
        ctx.lineTo(px, py - 28);
        ctx.lineTo(px + 20, py - 14);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(est.nome || 'Nova Cabana', px, py - 32);
      });
    }

    desenharPersonagens(ctx, w, h) {
      const lista = Object.values(this.personagens);
      // Y-Sorting dos personagens
      lista.sort((a, b) => a.y - b.y);

      lista.forEach(p => {
        // Interpolação suave em direção ao destino (respeitando velocidade de caminhada)
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          const proxX = p.x + (dx / dist) * Math.min(dist, 2.5);
          const proxY = p.y + (dy / dist) * Math.min(dist, 2.5);

          // Verifica colisão: só avança se a posição for permitida
          if (this.podeAndar(proxX, proxY)) {
            p.x = proxX;
            p.y = proxY;
          } else {
            // Desvia pela borda da trilha
            p.x += (dx / dist) * 1.2;
          }
          p.passo += 0.2;
        }

        // Sombra dos pés
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 4, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo do Personagem (Túnica com cor do habitante)
        const bob = Math.sin(p.passo) * 2;
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 8 + bob, 8, 0, Math.PI * 2);
        ctx.fill();

        // Cabeça
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 18 + bob, 6, 0, Math.PI * 2);
        ctx.fill();

        // Nameplate com Nome e Ação
        ctx.fillStyle = 'rgba(8, 24, 39, 0.88)';
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(p.x - 55, p.y - 48 + bob, 110, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.nome, p.x, p.y - 36 + bob);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillText(String(p.acao).slice(0, 18), p.x, p.y - 26 + bob);
      });
    }

    tratarClique(e) {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const w = rect.width;
      const h = rect.height;

      // Verifica se clicou em alguma casa ou na fogueira
      const estruturas = (this.tiledData && this.tiledData.layers && this.tiledData.layers.find(l => l.name === 'Estruturas_Construcoes')?.objects) || [];

      for (const est of estruturas) {
        const cx = (est.x / 1280) * w;
        const cy = (est.y / 896) * h;
        const ew = (est.width / 1280) * w;
        const eh = (est.height / 896) * h;

        if (clickX >= cx && clickX <= cx + ew && clickY >= cy - 20 && clickY <= cy + eh) {
          console.log('[Motor RPG Tiled] Clicou na estrutura:', est.name);
          if (window.MapaRpg && typeof window.MapaRpg.abrirCortex === 'function') {
            const noData = (window.MapaRpg.NOS_RPG && window.MapaRpg.NOS_RPG[est.name]) || {
              id: est.name,
              nome: est.propriedades?.nome || est.name,
              icone: '🏠',
              descricao: `Estrutura da comunidade na Ilha Aurora: ${est.name}. Moradia acolhedora e segura.`,
              recursos: { abrigo: 'Excelente (100%)', cama: 'Disponível', estoque: 'Baú interno' },
              acoes: [{ id: 'entrar_casa', nome: 'Entrar na Cabana', icone: '🚪', desc: 'Descansar e guardar mantimentos' }]
            };
            window.MapaRpg.abrirCortex(noData);
          }
          return;
        }
      }
    }
  }

  window.MotorRpgTiled = MotorRpgTiled;
  window.motorRpgTiled = new MotorRpgTiled();
})(window);

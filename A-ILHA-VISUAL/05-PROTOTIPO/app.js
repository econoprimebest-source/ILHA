/**
 * A ILHA - PROTÓTIPO NAVEGÁVEL & MOTOR GRÁFICO ISOMÉTRICO 3D
 * 
 * Implementação independente da camada visual da A Ilha.
 * Apresenta o território digital explorável, renderização da ilha isométrica,
 * navegação completa pelas 10 telas e gerenciamento de estado demonstrativo.
 */

// Se MOCK_DATA já estiver disponível globalmente ou fallback embutido
const MOCK_DATA_SOURCE = window.__ILHA_MOCK_DATA__ || {
  island: {
    name: "A Ilha Principal",
    edition: "Enterprise Architecture Preview",
    status: "Seguro · 4 Espaços Ativos",
    systemHealth: 98,
    metrics: {
      allocatedMemory: "3.2 GB",
      totalMemory: "12 GB",
      isolatedStorage: "24.8 GB",
      activeProfiles: 4,
      maxProfiles: 8,
      lastAudit: "Hoje, 17:42"
    }
  },
  districts: [
    {
      id: "dist-work",
      name: "Trabalho & Produção",
      slug: "work",
      type: "corporate",
      description: "Espaço corporativo blindado para ferramentas profissionais e comunicação corporativa.",
      themeColor: "#0284c7",
      themeColorLight: "#38bdf8",
      accentGlow: "rgba(14, 165, 233, 0.45)",
      status: "active",
      biome: "Metrópole Tecnológica",
      biomeDescription: "Torres monolíticas de dados com links holográficos e fluxo contínuo de pacotes.",
      lastAccess: "Há 14 minutos",
      storageUsage: "8.4 GB",
      memoryUsage: "1.1 GB",
      securityLevel: "Alto",
      mapCoordinates: { x: -160, y: 0, z: -80, radius: 100 },
      apps: [
        { id: "app-slack", name: "Slack", icon: "💬", category: "Comunicação", notifications: 3, isolated: true, version: "24.08.1" },
        { id: "app-notion", name: "Notion", icon: "📝", category: "Produtividade", notifications: 0, isolated: true, version: "0.24.1" },
        { id: "app-teams", name: "MS Teams", icon: "👥", category: "Comunicação", notifications: 1, isolated: true, version: "1416/1.0" },
        { id: "app-gmail-corp", name: "Gmail Corp", icon: "✉️", category: "E-mail", notifications: 7, isolated: true, version: "2026.04" },
        { id: "app-jira", name: "Jira Mobile", icon: "🔷", category: "Gerenciamento", notifications: 0, isolated: true, version: "112.0" }
      ],
      rules: [
        { label: "Isolamento de Contatos", enabled: true, note: "Agenda profissional não acessa agenda pessoal" },
        { label: "Acesso à Câmera", enabled: true, note: "Requer confirmação a cada sessão" },
        { label: "Filtragem de Notificações", enabled: true, note: "Oculta prévias sensíveis na tela de bloqueio" }
      ]
    },
    {
      id: "dist-personal",
      name: "Pessoal & Social",
      slug: "personal",
      type: "social",
      description: "Ambiente reservado para lazer, mensagens privadas, redes e streaming diário.",
      themeColor: "#10b981",
      themeColorLight: "#34d399",
      accentGlow: "rgba(16, 185, 129, 0.45)",
      status: "active",
      biome: "Oásis Bioluminescente",
      biomeDescription: "Jardins solares e cúpulas orgânicas com pontes suspensas sobre a lagoa central.",
      lastAccess: "Há 1 hora",
      storageUsage: "11.2 GB",
      memoryUsage: "950 MB",
      securityLevel: "Balanceado",
      mapCoordinates: { x: 140, y: 0, z: -70, radius: 95 },
      apps: [
        { id: "app-whatsapp", name: "WhatsApp", icon: "🟢", category: "Mensagens", notifications: 12, isolated: true, version: "2.26.11" },
        { id: "app-instagram", name: "Instagram", icon: "📷", category: "Social", notifications: 5, isolated: true, version: "340.0" },
        { id: "app-spotify", name: "Spotify", icon: "🎵", category: "Mídia", notifications: 0, isolated: true, version: "8.9.1" },
        { id: "app-photos", name: "Galeria Privada", icon: "🖼️", category: "Mídia", notifications: 0, isolated: true, version: "5.1" }
      ],
      rules: [
        { label: "Galeria Privativa", enabled: true, note: "Armazenamento exclusivo sem sincronização externa" },
        { label: "Localização Aproximada", enabled: true, note: "Reduz precisão para preservação de rota" }
      ]
    },
    {
      id: "dist-finance",
      name: "Cofre Financeiro",
      slug: "finance",
      type: "vault",
      description: "Zona com proteção rigorosa para bancos, corretoras e chaves de segurança.",
      themeColor: "#f59e0b",
      themeColorLight: "#fbbf24",
      accentGlow: "rgba(245, 158, 11, 0.45)",
      status: "active",
      biome: "Cidadela Fortificada",
      biomeDescription: "Bastiões hexagonais de obsidiana protegidos por malhas eletromagnéticas douradas.",
      lastAccess: "Ontem às 21:15",
      storageUsage: "3.6 GB",
      memoryUsage: "520 MB",
      securityLevel: "Máximo",
      mapCoordinates: { x: -110, y: 0, z: 120, radius: 90 },
      apps: [
        { id: "app-bank1", name: "Nubank", icon: "🟣", category: "Finanças", notifications: 0, isolated: true, version: "9.18" },
        { id: "app-bank2", name: "Banco Inter", icon: "🟠", category: "Finanças", notifications: 0, isolated: true, version: "14.2" },
        { id: "app-invest", name: "XP Investimentos", icon: "📊", category: "Investimentos", notifications: 0, isolated: true, version: "8.4" },
        { id: "app-crypto", name: "Crypto Vault", icon: "🪙", category: "Criptoativos", notifications: 0, isolated: true, version: "3.0" }
      ],
      rules: [
        { label: "Autenticação Biométrica Estrita", enabled: true, note: "Exigida a cada retorno ao ambiente" },
        { label: "Bloqueio de Captura de Tela", enabled: true, note: "FLAG_SECURE simulado na visualização" },
        { label: "Área de Transferência Limpa", enabled: true, note: "Expira dados copiados após 30 segundos" }
      ]
    },
    {
      id: "dist-sandbox",
      name: "Laboratório Sandbox",
      slug: "sandbox",
      type: "lab",
      description: "Área experimental para testar builds, utilitários e aplicativos em quarentena.",
      themeColor: "#8b5cf6",
      themeColorLight: "#a78bfa",
      accentGlow: "rgba(139, 92, 246, 0.45)",
      status: "paused",
      biome: "Plataforma Flutuante Alfa",
      biomeDescription: "Plataformas suspensas por feixes antigravitacionais com bobinas de confinamento.",
      lastAccess: "Há 3 dias",
      storageUsage: "1.6 GB",
      memoryUsage: "0 MB (Pausado)",
      securityLevel: "Quarentena",
      mapCoordinates: { x: 120, y: 0, z: 110, radius: 85 },
      apps: [
        { id: "app-test-apk", name: "Custom Build v1.4", icon: "🧪", category: "Desenvolvimento", notifications: 0, isolated: true, version: "1.4-beta" },
        { id: "app-inspector", name: "SQLite Explorer", icon: "🔍", category: "Diagnóstico", notifications: 0, isolated: true, version: "2.1" }
      ],
      rules: [
        { label: "Rede Restrita", enabled: true, note: "Sem acesso a dispositivos locais da rede LAN" },
        { label: "Estado Volátil", enabled: false, note: "Pode resetar dados temporários ao pausar" }
      ]
    },
    {
      id: "dist-expansion",
      name: "Área de Expansão",
      slug: "expansion",
      type: "expansion",
      description: "Território disponível para terraformação e adição de um novo espaço isolado.",
      themeColor: "#06b6d4",
      themeColorLight: "#22d3ee",
      accentGlow: "rgba(6, 182, 212, 0.45)",
      status: "available",
      biome: "Matriz em Construção",
      biomeDescription: "Malha de blueprint holográfica ancorada no oceano esperando novo assentamento digital.",
      lastAccess: "Pronto para fundação",
      storageUsage: "0 GB",
      memoryUsage: "0 MB",
      securityLevel: "Personalizável",
      mapCoordinates: { x: 0, y: 0, z: 180, radius: 75 },
      apps: [],
      rules: []
    }
  ],
  availableAppsCatalog: [
    { id: "cat-slack", name: "Slack", icon: "💬", cat: "Produtividade", desc: "Comunicação para equipes de trabalho", size: "48 MB" },
    { id: "cat-whatsapp", name: "WhatsApp", icon: "🟢", cat: "Mensagens", desc: "Mensagens instantâneas e chamadas", size: "62 MB" },
    { id: "cat-teams", name: "Microsoft Teams", icon: "👥", cat: "Produtividade", desc: "Reuniões e chats colaborativos", size: "75 MB" },
    { id: "cat-notion", name: "Notion", icon: "📝", cat: "Produtividade", desc: "Notas, wikis e gerenciamento de projetos", size: "38 MB" },
    { id: "cat-spotify", name: "Spotify", icon: "🎵", cat: "Lazer", desc: "Músicas e podcasts sob demanda", size: "55 MB" },
    { id: "cat-nubank", name: "Nubank", icon: "🟣", cat: "Finanças", desc: "Cartão de crédito e conta digital", size: "82 MB" },
    { id: "cat-inter", name: "Banco Inter", icon: "🟠", cat: "Finanças", desc: "Super App financeiro e investimentos", size: "90 MB" },
    { id: "cat-telegram", name: "Telegram", icon: "✈️", cat: "Mensagens", desc: "Mensageiro em nuvem com criptografia de ponta", size: "52 MB" },
    { id: "cat-chrome", name: "Navegador Isolado", icon: "🌐", cat: "Navegação", desc: "Sessão web limpa sem cookies compartilhados", size: "98 MB" },
    { id: "cat-keep", name: "Google Keep", icon: "💡", cat: "Utilitários", desc: "Captura de notas rápidas e listas", size: "22 MB" }
  ],
  activityHistory: [
    { id: "act-1", time: "17:42", date: "Hoje", title: "Cofre Financeiro bloqueado", district: "Cofre Financeiro", type: "security", icon: "🛡️", desc: "Ambiente bloqueado por inatividade de 15 minutos." },
    { id: "act-2", time: "16:15", date: "Hoje", title: "Slack aberto no Trabalho", district: "Trabalho & Produção", type: "launch", icon: "💬", desc: "Sessão iniciada com perfil de dados isolado." },
    { id: "act-3", time: "14:30", date: "Hoje", title: "Laboratório Sandbox pausado", district: "Laboratório Sandbox", type: "system", icon: "⏸️", desc: "Economia de memória ativada com sucesso." },
    { id: "act-4", time: "11:02", date: "Ontem", title: "Verificação de Privacidade Concluída", district: "A Ilha Principal", type: "audit", icon: "✅", desc: "Nenhum vazamento detectado entre contêineres." },
    { id: "act-5", time: "09:18", date: "Ontem", title: "Novo app associado ao Pessoal", district: "Pessoal & Social", type: "install", icon: "📦", desc: "Aplicativo 'Galeria Privada' ativado no ambiente." }
  ],
  securityAudit: {
    status: "Blindagem Nominal",
    score: 96,
    activeProtections: [
      { name: "Separação de Armazenamento", status: "Ativa", desc: "Dados de cada perfil ficam em caminhos protegidos" },
      { name: "Isolamento de Contatos", status: "Ativa", desc: "Livros de endereços não se cruzam entre ambientes" },
      { name: "Proteção de Área de Transferência", status: "Ativa", desc: "Expiração periódica de dados copiados" },
      { name: "Auditoria de Câmera e Microfone", status: "Monitorando", desc: "Confirmação explícita ao abrir mídias" }
    ],
    alerts: [
      { id: "alt-1", level: "info", text: "Laboratório Sandbox está pausado e consumindo 0% de CPU." }
    ]
  }
};

class IlhaVisualEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Configurações de Câmera 3D / Isométrica
    this.camera = {
      rotX: 52 * (Math.PI / 180), // Ângulo de inclinação isométrica
      rotZ: 35 * (Math.PI / 180), // Rotação no plano horizontal
      targetRotZ: 35 * (Math.PI / 180),
      zoom: 1.0,
      targetZoom: 1.0,
      panX: 0,
      panY: -20,
      targetPanX: 0,
      targetPanY: -20
    };

    this.isDragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.hoveredDistrict = null;
    this.selectedDistrict = null;
    this.theme = 'dark'; // 'dark' ou 'light'
    this.time = 0;
    this.districts = JSON.parse(JSON.stringify(MOCK_DATA_SOURCE.districts));

    this.initEvents();
    this.resize();
    this.startLoop();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    // Interação com Mouse e Toque (Pan e Rotação da Ilha)
    const onStart = (x, y) => {
      this.isDragging = true;
      this.lastPointer = { x, y };
    };

    const onMove = (x, y) => {
      if (this.isDragging) {
        const dx = x - this.lastPointer.x;
        const dy = y - this.lastPointer.y;
        this.camera.targetRotZ += dx * 0.006;
        this.camera.targetPanY += dy * 0.4;
        this.lastPointer = { x, y };
      } else {
        this.checkHover(x, y);
      }
    };

    const onEnd = (x, y) => {
      if (this.isDragging) {
        this.isDragging = false;
      }
    };

    this.canvas.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      onMove(e.clientX - rect.left, e.clientY - rect.top);
    });
    window.addEventListener('mouseup', () => onEnd());

    // Touch
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        onStart(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        onMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => onEnd());

    // Zoom com Roda do Mouse
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * -0.0012;
      this.camera.targetZoom = Math.min(Math.max(0.65, this.camera.targetZoom + zoomDelta), 1.75);
    }, { passive: false });

    // Clique para selecionar ambiente
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const hit = this.hitTest(clickX, clickY);
      if (hit) {
        this.selectDistrict(hit);
      }
    });
  }

  setTheme(theme) {
    this.theme = theme;
  }

  // Conversão de Coordenadas 3D de Mundo para Tela Isométrica
  project(x, y, z) {
    const cosZ = Math.cos(this.camera.rotZ);
    const sinZ = Math.sin(this.camera.rotZ);
    const cosX = Math.cos(this.camera.rotX);
    const sinX = Math.sin(this.camera.rotX);

    // Rotação em Z
    const rx = x * cosZ - z * sinZ;
    const rz = x * sinZ + z * cosZ;
    const ry = y;

    // Projeção com inclinação X e Zoom
    const scale = this.camera.zoom;
    const screenX = this.width / 2 + (rx * scale) + this.camera.panX;
    const screenY = this.height / 2 + ((-ry * cosX + rz * sinX) * scale) + this.camera.panY;

    return { x: screenX, y: screenY, depth: rz };
  }

  checkHover(screenX, screenY) {
    const hit = this.hitTest(screenX, screenY);
    if (this.hoveredDistrict !== hit) {
      this.hoveredDistrict = hit;
      this.canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
  }

  hitTest(screenX, screenY) {
    for (const dist of this.districts) {
      const p = this.project(dist.mapCoordinates.x, 20, dist.mapCoordinates.z);
      const distPx = Math.hypot(screenX - p.x, screenY - p.y);
      if (distPx < 48 * this.camera.zoom) {
        return dist;
      }
    }
    return null;
  }

  selectDistrict(district) {
    this.selectedDistrict = district;
    
    if (district.type === 'expansion') {
      window.IlhaApp.openNewEnvironmentWizard();
      return;
    }

    // Suave transição de foco de câmera
    this.camera.targetPanX = -district.mapCoordinates.x * 0.4 * this.camera.zoom;
    this.camera.targetPanY = -district.mapCoordinates.z * 0.25 * this.camera.zoom;
    this.camera.targetZoom = 1.15;

    // Abre a gaveta de interior do ambiente
    window.IlhaApp.openDistrictInterior(district);
  }

  resetCamera() {
    this.camera.targetRotZ = 35 * (Math.PI / 180);
    this.camera.targetZoom = 1.0;
    this.camera.targetPanX = 0;
    this.camera.targetPanY = -20;
    this.selectedDistrict = null;
  }

  startLoop() {
    const loop = () => {
      this.time += 0.02;
      this.updateCamera();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updateCamera() {
    // Interpolação suave (Damping)
    this.camera.rotZ += (this.camera.targetRotZ - this.camera.rotZ) * 0.1;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;
    this.camera.panX += (this.camera.targetPanX - this.camera.panX) * 0.1;
    this.camera.panY += (this.camera.targetPanY - this.camera.panY) * 0.1;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const isDark = this.theme === 'dark';

    // 1. Fundo do Oceano Digital
    this.renderDigitalOcean(ctx, isDark);

    // 2. Base da Ilha Principal (Strata e Bastião)
    this.renderIslandBase(ctx, isDark);

    // 3. Conexões e Pontes de Dados entre os Distritos
    this.renderDataBridges(ctx, isDark);

    // 4. Renderização de cada Distrito com suas Estruturas Físicas
    // Ordenar distritos por profundidade Z para oclusão correta
    const sortedDistricts = [...this.districts].sort((a, b) => {
      const pA = this.project(a.mapCoordinates.x, 0, a.mapCoordinates.z);
      const pB = this.project(b.mapCoordinates.x, 0, b.mapCoordinates.z);
      return pA.depth - pB.depth;
    });

    for (const dist of sortedDistricts) {
      this.renderDistrictStructure(ctx, dist, isDark);
    }

    // 5. Núcleo Central de Processamento da Ilha (Nexus)
    this.renderIslandCore(ctx, isDark);

    // 6. Badges e Indicadores Flutuantes 3D
    for (const dist of this.districts) {
      this.renderDistrictBadge(ctx, dist, isDark);
    }
  }

  renderDigitalOcean(ctx, isDark) {
    const w = this.width;
    const h = this.height;

    // Gradiente de profundidade oceânica
    const oceanGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
    if (isDark) {
      oceanGrad.addColorStop(0, '#0c1b33');
      oceanGrad.addColorStop(0.6, '#060a14');
      oceanGrad.addColorStop(1, '#03050a');
    } else {
      oceanGrad.addColorStop(0, '#e0f2fe');
      oceanGrad.addColorStop(0.6, '#cbd5e1');
      oceanGrad.addColorStop(1, '#94a3b8');
    }
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // Malha Isométrica Suave do Oceano (Digital Grid Waves)
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(14, 165, 233, 0.08)';
    ctx.lineWidth = 1;

    const gridSize = 45;
    const gridCount = 9;
    for (let i = -gridCount; i <= gridCount; i++) {
      const p1 = this.project(i * gridSize, -35, -gridCount * gridSize);
      const p2 = this.project(i * gridSize, -35, gridCount * gridSize);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const p3 = this.project(-gridCount * gridSize, -35, i * gridSize);
      const p4 = this.project(gridCount * gridSize, -35, i * gridSize);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // Correntes Oceânicas e Ondas de Energia Flutuantes
    for (let c = 0; c < 3; c++) {
      const r = 240 + c * 60 + Math.sin(this.time + c) * 10;
      ctx.beginPath();
      ctx.arc(w / 2 + this.camera.panX, h / 2 + this.camera.panY, r * this.camera.zoom * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? `rgba(14, 165, 233, ${0.08 - c * 0.02})` : `rgba(14, 165, 233, ${0.12 - c * 0.03})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  renderIslandBase(ctx, isDark) {
    // A Ilha é composta por um platô central e quatro penínsulas
    const baseRadius = 240;
    const segments = 16;
    const ptsTop = [];
    const ptsBottom = [];

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Perfil orgânico com modulações de península
      const r = baseRadius + Math.sin(angle * 4) * 35;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      ptsTop.push(this.project(x, 0, z));
      ptsBottom.push(this.project(x, -45, z));
    }

    // Lados / Strata rochosa e tecnológica
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      ctx.beginPath();
      ctx.moveTo(ptsTop[i].x, ptsTop[i].y);
      ctx.lineTo(ptsTop[next].x, ptsTop[next].y);
      ctx.lineTo(ptsBottom[next].x, ptsBottom[next].y);
      ctx.lineTo(ptsBottom[i].x, ptsBottom[i].y);
      ctx.closePath();

      const sideGrad = ctx.createLinearGradient(ptsTop[i].x, ptsTop[i].y, ptsBottom[i].x, ptsBottom[i].y);
      if (isDark) {
        sideGrad.addColorStop(0, '#101d36');
        sideGrad.addColorStop(0.5, '#0a1222');
        sideGrad.addColorStop(1, '#04070e');
      } else {
        sideGrad.addColorStop(0, '#cbd5e1');
        sideGrad.addColorStop(0.5, '#94a3b8');
        sideGrad.addColorStop(1, '#64748b');
      }
      ctx.fillStyle = sideGrad;
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.15)';
      ctx.stroke();
    }

    // Superfície Superior da Ilha
    ctx.beginPath();
    ctx.moveTo(ptsTop[0].x, ptsTop[0].y);
    for (let i = 1; i < segments; i++) {
      ctx.lineTo(ptsTop[i].x, ptsTop[i].y);
    }
    ctx.closePath();

    const topGrad = ctx.createRadialGradient(
      this.width / 2 + this.camera.panX, this.height / 2 + this.camera.panY, 10,
      this.width / 2 + this.camera.panX, this.height / 2 + this.camera.panY, baseRadius * this.camera.zoom
    );
    if (isDark) {
      topGrad.addColorStop(0, '#1a2744');
      topGrad.addColorStop(0.8, '#131e33');
      topGrad.addColorStop(1, '#0e1726');
    } else {
      topGrad.addColorStop(0, '#f8fafc');
      topGrad.addColorStop(0.8, '#e2e8f0');
      topGrad.addColorStop(1, '#cbd5e1');
    }
    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(14, 165, 233, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  renderDataBridges(ctx, isDark) {
    // Linhas de pulso de dados do Núcleo Central (0, 0) para cada Distrito
    for (const dist of this.districts) {
      const pCore = this.project(0, 8, 0);
      const pDist = this.project(dist.mapCoordinates.x, 8, dist.mapCoordinates.z);

      ctx.beginPath();
      ctx.moveTo(pCore.x, pCore.y);
      ctx.lineTo(pDist.x, pDist.y);
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.15)';
      ctx.lineWidth = 4 * this.camera.zoom;
      ctx.stroke();

      // Pulso luminoso correndo pela ponte
      const pulseT = (this.time * 0.8 + dist.mapCoordinates.x) % 1;
      const pulseX = pCore.x + (pDist.x - pCore.x) * Math.abs(pulseT);
      const pulseY = pCore.y + (pDist.y - pCore.y) * Math.abs(pulseT);

      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 3 * this.camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = dist.themeColor;
      ctx.shadowColor = dist.themeColor;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  renderIslandCore(ctx, isDark) {
    const pCenter = this.project(0, 0, 0);
    const pTop = this.project(0, 36, 0);

    // Bastião Hexagonal do Núcleo
    const hexRadius = 38;
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      hexPts.push(this.project(Math.cos(angle) * hexRadius, 10, Math.sin(angle) * hexRadius));
    }

    ctx.beginPath();
    ctx.moveTo(hexPts[0].x, hexPts[0].y);
    for (let i = 1; i < 6; i++) ctx.lineTo(hexPts[i].x, hexPts[i].y);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Monólito Cristalino Elevado (Coração da Ilha)
    const crystalH = 45;
    const pCrysTop = this.project(0, crystalH + Math.sin(this.time * 2) * 4, 0);
    const pCrysMid1 = this.project(-12, crystalH * 0.5, -12);
    const pCrysMid2 = this.project(12, crystalH * 0.5, -12);
    const pCrysMid3 = this.project(0, crystalH * 0.5, 14);

    ctx.beginPath();
    ctx.moveTo(pCrysTop.x, pCrysTop.y);
    ctx.lineTo(pCrysMid1.x, pCrysMid1.y);
    ctx.lineTo(pCrysMid3.x, pCrysMid3.y);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#00f0ff' : '#0284c7';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(pCrysTop.x, pCrysTop.y);
    ctx.lineTo(pCrysMid2.x, pCrysMid2.y);
    ctx.lineTo(pCrysMid3.x, pCrysMid3.y);
    ctx.closePath();
    ctx.fillStyle = '#6366f1';
    ctx.fill();

    // Beacon Vertical
    ctx.beginPath();
    ctx.moveTo(pCrysTop.x, pCrysTop.y);
    const pBeamEnd = this.project(0, 100, 0);
    ctx.lineTo(pBeamEnd.x, pBeamEnd.y);
    ctx.strokeStyle = isDark ? 'rgba(0, 240, 255, 0.4)' : 'rgba(2, 132, 199, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  renderDistrictStructure(ctx, dist, isDark) {
    const coords = dist.mapCoordinates;
    const isHovered = this.hoveredDistrict === dist;
    const isSelected = this.selectedDistrict === dist;

    // Base do Distrito (Plataforma Elevada)
    const radius = coords.radius * 0.55;
    const pBase = this.project(coords.x, 5, coords.z);

    // Glow de Seleção ou Hover
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(pBase.x, pBase.y, radius * this.camera.zoom * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = dist.accentGlow;
      ctx.fill();
    }

    // Desenho Específico de Arquitetura por Bioma:
    switch (dist.type) {
      case 'corporate': // Trabalho: Arranha-céus cibernéticos
        this.renderSkyscrapers(ctx, coords, dist.themeColor, isDark);
        break;
      case 'social': // Pessoal: Cúpulas orgânicas e jardins
        this.renderOrganicDomes(ctx, coords, dist.themeColor, isDark);
        break;
      case 'vault': // Finanças: Bastião e cofre hexagonal
        this.renderVaultCitadel(ctx, coords, dist.themeColor, isDark);
        break;
      case 'lab': // Sandbox: Pilares flutuantes de quarentena
        this.renderLabPylons(ctx, coords, dist.themeColor, isDark);
        break;
      case 'expansion': // Área de Expansão: Malha de construção
        this.renderExpansionScaffold(ctx, coords, dist.themeColor, isDark);
        break;
    }
  }

  renderSkyscrapers(ctx, coords, color, isDark) {
    // 3 Torres Isométricas com alturas diferentes e detalhes de janelas cibernéticas
    const towers = [
      { ox: -22, oz: -18, w: 26, h: 80, floors: 7 },
      { ox: 16, oz: -10, w: 32, h: 105, floors: 9 },
      { ox: -2, oz: 22, w: 24, h: 65, floors: 5 }
    ];

    for (const t of towers) {
      this.drawIsoBlock(coords.x + t.ox, 0, coords.z + t.oz, t.w, t.h, t.w, color, isDark);
      
      // Janelas Luminosas e Feixe de Antena
      const pTop = this.project(coords.x + t.ox, t.h, coords.z + t.oz);
      const pAntenna = this.project(coords.x + t.ox, t.h + 20, coords.z + t.oz);
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pAntenna.x, pAntenna.y);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pAntenna.x, pAntenna.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  renderOrganicDomes(ctx, coords, color, isDark) {
    // Cúpula Geodésica e Jardins
    const pCenter = this.project(coords.x, 18, coords.z);
    const r = 36 * this.camera.zoom;

    ctx.beginPath();
    ctx.arc(pCenter.x, pCenter.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(52, 211, 153, 0.45)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Malha Interna da Cúpula Geodésica
    ctx.beginPath();
    ctx.ellipse(pCenter.x, pCenter.y, r * 0.8, r * 0.45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.5)' : 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Vegetação / Árvores Estilizadas ao redor
    const trees = [
      { ox: -26, oz: -18 }, { ox: 28, oz: 16 }, { ox: -16, oz: 28 }, { ox: 22, oz: -24 }
    ];
    for (const tr of trees) {
      const pTr = this.project(coords.x + tr.ox, 5, coords.z + tr.oz);
      ctx.beginPath();
      ctx.arc(pTr.x, pTr.y - 14 * this.camera.zoom, 9 * this.camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = isDark ? 6 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(pTr.x, pTr.y);
      ctx.lineTo(pTr.x, pTr.y - 12 * this.camera.zoom);
      ctx.strokeStyle = '#065f46';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  renderVaultCitadel(ctx, coords, color, isDark) {
    // Fortaleza Hexagonal com Núcleo Dourado
    this.drawIsoBlock(coords.x, 0, coords.z, 52, 46, 52, '#f59e0b', isDark, true);

    // Pilares de Muralha Perimetrais
    const corners = [
      { ox: -26, oz: -26 }, { ox: 26, oz: -26 }, { ox: 26, oz: 26 }, { ox: -26, oz: 26 }
    ];
    for (const c of corners) {
      this.drawIsoBlock(coords.x + c.ox, 0, coords.z + c.oz, 14, 54, 14, '#d97706', isDark);
    }

    // Coluna Central de Alta Segurança (Cofre Rúnico)
    const pCofre = this.project(coords.x, 48, coords.z);
    ctx.beginPath();
    ctx.arc(pCofre.x, pCofre.y, 14 * this.camera.zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  renderLabPylons(ctx, coords, color, isDark) {
    // 3 Pilares Flutuantes com Anéis de Plasma
    const pylons = [
      { ox: -22, oz: -6 }, { ox: 20, oz: -16 }, { ox: 6, oz: 24 }
    ];

    for (let i = 0; i < pylons.length; i++) {
      const p = pylons[i];
      const floatY = 28 + Math.sin(this.time * 2.5 + i * 1.5) * 6;
      const pTop = this.project(coords.x + p.ox, floatY + 35, coords.z + p.oz);
      const pBot = this.project(coords.x + p.ox, floatY, coords.z + p.oz);

      // Prisma Flutuante
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pBot.x - 12 * this.camera.zoom, pBot.y);
      ctx.lineTo(pBot.x + 12 * this.camera.zoom, pBot.y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Raio de Confinamento até a Base
      const pGround = this.project(coords.x + p.ox, 0, coords.z + p.oz);
      ctx.beginPath();
      ctx.moveTo(pBot.x, pBot.y);
      ctx.lineTo(pGround.x, pGround.y);
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  renderExpansionScaffold(ctx, coords, color, isDark) {
    // Malha Holográfica em Construção
    const pCenter = this.project(coords.x, 4, coords.z);
    const size = 32 * this.camera.zoom;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.arc(pCenter.x, pCenter.y, size, 0, Math.PI * 2);
    ctx.stroke();

    // Símbolo Plus Holográfico
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pCenter.x - 10 * this.camera.zoom, pCenter.y);
    ctx.lineTo(pCenter.x + 10 * this.camera.zoom, pCenter.y);
    ctx.moveTo(pCenter.x, pCenter.y - 10 * this.camera.zoom);
    ctx.lineTo(pCenter.x, pCenter.y + 10 * this.camera.zoom);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  drawIsoBlock(x, y, z, wx, hy, wz, color, isDark, isCitadel = false) {
    const hwX = wx / 2;
    const hwZ = wz / 2;

    const p0 = this.project(x - hwX, y, z - hwZ);
    const p1 = this.project(x + hwX, y, z - hwZ);
    const p2 = this.project(x + hwX, y, z + hwZ);
    const p3 = this.project(x - hwX, y, z + hwZ);

    const pt0 = this.project(x - hwX, y + hy, z - hwZ);
    const pt1 = this.project(x + hwX, y + hy, z - hwZ);
    const pt2 = this.project(x + hwX, y + hy, z + hwZ);
    const pt3 = this.project(x - hwX, y + hy, z + hwZ);

    const ctx = this.ctx;

    // Face Direita
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#0a101f' : '#cbd5e1';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Face Esquerda
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.lineTo(pt3.x, pt3.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#111c33' : '#e2e8f0';
    ctx.fill();
    ctx.stroke();

    // Topo
    ctx.beginPath();
    ctx.moveTo(pt0.x, pt0.y);
    ctx.lineTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.lineTo(pt3.x, pt3.y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
  }

  renderDistrictBadge(ctx, dist, isDark) {
    const coords = dist.mapCoordinates;
    const p = this.project(coords.x, 70, coords.z);

    const isHovered = this.hoveredDistrict === dist;
    const isSelected = this.selectedDistrict === dist;

    ctx.save();
    ctx.font = '600 11.5px "Plus Jakarta Sans", sans-serif';

    const text = dist.name;
    const subText = dist.type === 'expansion' ? '+ Expandir' : `${dist.apps.length} apps · ${dist.status === 'active' ? 'Ativo' : 'Pausado'}`;
    const textWidth = Math.max(ctx.measureText(text).width, ctx.measureText(subText).width);
    const badgeW = textWidth + 36;
    const badgeH = 34;

    const bX = p.x - badgeW / 2;
    const bY = p.y - badgeH / 2;

    // Linha de Conexão com o Chão
    const pGround = this.project(coords.x, 10, coords.z);
    ctx.beginPath();
    ctx.moveTo(pGround.x, pGround.y);
    ctx.lineTo(p.x, p.y + badgeH / 2);
    ctx.strokeStyle = dist.themeColor;
    ctx.lineWidth = isHovered || isSelected ? 2 : 1;
    ctx.stroke();

    // Ponto no Chão
    ctx.beginPath();
    ctx.arc(pGround.x, pGround.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = dist.themeColor;
    ctx.fill();

    // Fundo do Card Flutuante (Glassmorphism)
    ctx.beginPath();
    ctx.roundRect(bX, bY, badgeW, badgeH, 10);
    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)';
    ctx.fill();
    ctx.strokeStyle = isHovered || isSelected ? dist.themeColor : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)');
    ctx.lineWidth = isHovered || isSelected ? 2 : 1;
    ctx.stroke();

    // Ponto de Status
    ctx.beginPath();
    ctx.arc(bX + 14, bY + 12, 4, 0, Math.PI * 2);
    ctx.fillStyle = dist.status === 'active' ? '#10b981' : (dist.type === 'expansion' ? '#06b6d4' : '#f59e0b');
    ctx.fill();

    // Título do Distrito
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.fillText(text, bX + 24, bY + 15);

    // Subtítulo
    ctx.font = '500 9.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(subText, bX + 24, bY + 27);

    ctx.restore();
  }
}

// Gerenciador Global da Aplicação SPA
class IlhaAppManager {
  constructor() {
    this.engine = null;
    this.activeSheet = null;
    this.theme = 'dark';
    this.isSimulatedMobile = false;
    this.data = JSON.parse(JSON.stringify(MOCK_DATA_SOURCE));
  }

  init() {
    this.engine = new IlhaVisualEngine('island-canvas');
    this.bindDOMEvents();
    this.renderEnvironmentsList();
    this.renderActivityHistory();
    this.renderAppsCatalog();
  }

  bindDOMEvents() {
    // Botão de Splash Screen para entrar no app
    const splashBtn = document.getElementById('splash-enter-btn');
    if (splashBtn) {
      splashBtn.addEventListener('click', () => {
        document.getElementById('splash-screen').classList.add('hidden');
      });
    }

    // Toggle de Tema (Claro / Escuro)
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Toggle de Moldura Mobile vs Tela Cheia
    const frameBtn = document.getElementById('frame-toggle-btn');
    if (frameBtn) {
      frameBtn.addEventListener('click', () => this.toggleDeviceFrame());
    }

    // Botões de Navegação Dock
    document.querySelectorAll('.dock-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // Fechar Gaveta / Sheet
    document.querySelectorAll('.close-sheet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeAllSheets();
      });
    });

    // Reset de Câmera da Ilha
    const resetCamBtn = document.getElementById('cam-reset-btn');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => this.engine.resetCamera());
    }

    // Zoom Buttons
    document.getElementById('cam-zoom-in')?.addEventListener('click', () => {
      this.engine.camera.targetZoom = Math.min(1.7, this.engine.camera.targetZoom + 0.2);
    });
    document.getElementById('cam-zoom-out')?.addEventListener('click', () => {
      this.engine.camera.targetZoom = Math.max(0.65, this.engine.camera.targetZoom - 0.2);
    });

    // Fechar Modais
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      document.getElementById('confirmation-modal').classList.remove('open');
    });
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    this.engine.setTheme(this.theme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = this.theme === 'dark' ? '🌙' : '☀️';
    }
  }

  toggleDeviceFrame() {
    this.isSimulatedMobile = !this.isSimulatedMobile;
    const frame = document.getElementById('main-frame');
    if (frame) {
      frame.classList.toggle('simulated-mobile', this.isSimulatedMobile);
      this.engine.resize();
    }
  }

  switchView(viewName) {
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    const activeBtn = document.querySelector(`.dock-item[data-view="${viewName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    this.closeAllSheets();

    if (viewName === 'island') {
      this.engine.resetCamera();
      return;
    }

    const sheet = document.getElementById(`sheet-${viewName}`);
    if (sheet) {
      sheet.classList.add('open');
      this.activeSheet = sheet;
    }
  }

  closeAllSheets() {
    document.querySelectorAll('.view-sheet, .district-sheet').forEach(s => s.classList.remove('open'));
    this.activeSheet = null;
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.dock-item[data-view="island"]')?.classList.add('active');
  }

  openDistrictInterior(district) {
    const sheet = document.getElementById('district-interior-sheet');
    if (!sheet) return;

    document.getElementById('dist-sheet-title').textContent = district.name;
    document.getElementById('dist-sheet-desc').textContent = district.description;
    document.getElementById('dist-sheet-badge').textContent = district.status === 'active' ? 'Ativo' : 'Pausado';
    document.getElementById('dist-sheet-badge').className = `badge ${district.status === 'active' ? 'badge-active' : 'badge-paused'}`;
    document.getElementById('dist-sheet-storage').textContent = district.storageUsage;
    document.getElementById('dist-sheet-memory').textContent = district.memoryUsage;

    // Renderizar Apps deste distrito
    const appsContainer = document.getElementById('dist-apps-list');
    appsContainer.innerHTML = '';
    district.apps.forEach(app => {
      const chip = document.createElement('div');
      chip.className = 'app-chip';
      chip.innerHTML = `<span>${app.icon}</span> <strong>${app.name}</strong> <span class="text-caption">(${app.version})</span>`;
      appsContainer.appendChild(chip);
    });

    // Renderizar Regras
    const rulesContainer = document.getElementById('dist-rules-list');
    rulesContainer.innerHTML = '';
    district.rules.forEach(rule => {
      const item = document.createElement('div');
      item.style.padding = '8px 0';
      item.style.borderBottom = '1px solid var(--ilh-border-subtle)';
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:13px;">${rule.label}</strong>
          <span class="badge ${rule.enabled ? 'badge-active' : 'badge-paused'}">${rule.enabled ? 'Ativo' : 'Inativo'}</span>
        </div>
        <p class="text-caption" style="margin-top:2px;">${rule.note}</p>
      `;
      rulesContainer.appendChild(item);
    });

    // Ação do Botão Pausar / Retomar
    const pauseBtn = document.getElementById('dist-pause-btn');
    if (pauseBtn) {
      pauseBtn.textContent = district.status === 'active' ? 'Pausar Ambiente' : 'Retomar Ambiente';
      pauseBtn.onclick = () => {
        district.status = district.status === 'active' ? 'paused' : 'active';
        this.openDistrictInterior(district);
        this.renderEnvironmentsList();
      };
    }

    // Ação de Excluir com Confirmação
    const deleteBtn = document.getElementById('dist-delete-btn');
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        this.showConfirmationModal(
          `Remover ${district.name}?`,
          `Esta ação removerá o espaço e seus contêineres demonstrativos associados. Esta operação não pode ser desfeita.`,
          () => {
            this.engine.districts = this.engine.districts.filter(d => d.id !== district.id);
            this.renderEnvironmentsList();
            this.closeAllSheets();
          }
        );
      };
    }

    sheet.classList.add('open');
  }

  openNewEnvironmentWizard() {
    this.switchView('new-env');
  }

  showConfirmationModal(title, text, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-text').textContent = text;

    const confirmBtn = document.getElementById('modal-confirm-btn');
    confirmBtn.onclick = () => {
      modal.classList.remove('open');
      if (onConfirm) onConfirm();
    };

    modal.classList.add('open');
  }

  renderEnvironmentsList() {
    const list = document.getElementById('environments-grid');
    if (!list) return;

    list.innerHTML = '';
    this.engine.districts.forEach(dist => {
      if (dist.type === 'expansion') return;

      const card = document.createElement('div');
      card.className = 'env-card';
      card.style.setProperty('--card-accent', dist.themeColor);
      card.style.setProperty('--card-bg', dist.themeColor + '1a');
      card.style.setProperty('--card-border', dist.themeColor + '40');

      card.innerHTML = `
        <div class="env-card-top">
          <div class="env-card-info">
            <div class="env-icon-box">${dist.apps[0]?.icon || '🏝️'}</div>
            <div>
              <h3 class="text-title-2">${dist.name}</h3>
              <p class="text-caption">${dist.biome} · Acesso: ${dist.lastAccess}</p>
            </div>
          </div>
          <span class="badge ${dist.status === 'active' ? 'badge-active' : 'badge-paused'}">
            ${dist.status === 'active' ? '● Ativo' : '⏸ Pausado'}
          </span>
        </div>

        <p class="text-body" style="font-size:12.5px;">${dist.description}</p>

        <div class="env-apps-row">
          ${dist.apps.map(a => `<span class="app-chip">${a.icon} ${a.name}</span>`).join('')}
        </div>

        <div class="env-card-actions">
          <span class="text-caption">Armazenamento: <strong>${dist.storageUsage}</strong></span>
          <button class="btn btn-primary btn-sm open-env-btn">Explorar Território</button>
        </div>
      `;

      card.querySelector('.open-env-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllSheets();
        this.engine.selectDistrict(dist);
      });

      card.addEventListener('click', () => {
        this.closeAllSheets();
        this.engine.selectDistrict(dist);
      });

      list.appendChild(card);
    });
  }

  renderActivityHistory() {
    const container = document.getElementById('history-timeline');
    if (!container) return;

    container.innerHTML = '';
    this.data.activityHistory.forEach(act => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.gap = '14px';
      item.style.padding = '12px 0';
      item.style.borderBottom = '1px solid var(--ilh-border-subtle)';

      item.innerHTML = `
        <div style="font-size: 20px; width: 34px; height: 34px; border-radius: 50%; background: var(--ilh-bg-input); display:flex; align-items:center; justify-content:center;">
          ${act.icon}
        </div>
        <div style="flex: 1;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:13.5px;">${act.title}</strong>
            <span class="text-caption">${act.time}</span>
          </div>
          <p class="text-caption" style="margin-top:2px;">${act.desc}</p>
          <span class="app-chip" style="margin-top:6px; font-size:11px;">📍 ${act.district}</span>
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderAppsCatalog() {
    const container = document.getElementById('apps-catalog-grid');
    if (!container) return;

    container.innerHTML = '';
    this.data.availableAppsCatalog.forEach(app => {
      const card = document.createElement('div');
      card.className = 'env-card';
      card.style.padding = '14px';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:12px; align-items:center;">
            <span style="font-size:26px;">${app.icon}</span>
            <div>
              <strong style="font-size:14px;">${app.name}</strong>
              <p class="text-caption">${app.cat} · ${app.size}</p>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm install-demo-btn">Instalar em...</button>
        </div>
      `;

      card.querySelector('.install-demo-btn').addEventListener('click', () => {
        alert(`Demonstração: Selecione o ambiente para vincular "${app.name}". Em ambiente de produção nativo, isso aciona o ProfileInstaller.`);
      });

      container.appendChild(card);
    });
  }
}

// Inicializar após carregamento do DOM
window.addEventListener('DOMContentLoaded', () => {
  window.IlhaApp = new IlhaAppManager();
  window.IlhaApp.init();
});

/**
 * A ILHA - CAMADA DE DADOS DEMONSTRATIVOS (MOCK DATA)
 * 
 * ATENÇÃO:
 * Todos os dados contidos neste arquivo são exclusivamente demonstrativos e
 * desacoplados de qualquer lógica de sistema operacional ou chamadas nativas Android.
 * 
 * Para substituir por dados reais, consulte:
 * 00-DOCUMENTACAO/GUIA-DE-TRANSFERENCIA-PARA-A-ILHA-ATUAL.md
 */

export const MOCK_DATA = {
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

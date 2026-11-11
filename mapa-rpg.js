/**
 * MAPA-RPG.JS — Sistema de Mapa Lógico e Tradução 3D da Ilha Aurora
 *
 * Separação estrita entre o Modelo Visual (.glb) e o Mapa Lógico do RPG:
 * 1. O Grid e os Nós Lógicos (Traduz espaco.js para coordenadas 3D exatas X, Y, Z).
 * 2. O Sistema de Movimento pelas Trilhas de Terra (Distância, tempo em ciclos, interpolação suave).
 * 3. Colisão, Oclusão e Profundidade 3D (Depth-testing e Z-sorting natural da cena).
 * 4. Interatividade e Hitboxes 3D com Painel CORTEX do Local (Fogueira, Caverna, Cabanas, etc.).
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports);
  } else {
    factory((root.MapaRpg = {}));
  }
}(this, function(exports) {
  'use strict';

  // 1. BANCO DE DADOS DOS NÓS LÓGICOS DO RPG E COORDENADAS 3D
  // Tradução direta e calibrada do espaco.js para o espaço Three.js do modelo da Ilha
  const NOS_RPG = {
    fogueira: {
      id: 'fogueira',
      nome: 'Fogueira Central',
      icone: '🔥',
      normX: 0.500,
      normY: 0.520,
      pos3D: { x: 0.0, y: 1.25, z: 0.4 },
      hitbox: {
        tipo: 'cylinder',
        raio: 1.8,
        altura: 2.4,
        offsetY: 1.2
      },
      descricao: 'O coração comunitário da ilha. As chamas aquecem os sobreviventes, espantam o frio e as feras da noite.',
      tipoZona: 'social_seguro',
      recursos: {
        calor: 'Forte (85%)',
        lenha: 'Disponível no monte',
        brasa: 'Ativa'
      },
      acoes: [
        { id: 'alimentar_fogueira', nome: 'Alimentar Fogo com Lenha', icone: '🪵', desc: 'Mantém a fogueira alta para a noite (+calor, -medo)' },
        { id: 'cozinhar', nome: 'Assar Alimentos / Cozinhar', icone: '🍗', desc: 'Prepara peixes e raízes na brasa viva' },
        { id: 'descansar', nome: 'Aquecer-se & Descansar', icone: '⛺', desc: 'Recupera energia e reduz o frio do corpo' },
        { id: 'conversar', nome: 'Roda de Conversa Comunitária', icone: '💬', desc: 'Compartilha planos e dissipa a solidão' },
        { id: 'contar_historias', nome: 'Contar Histórias e Mitos', icone: '📖', desc: 'Inspira o grupo e eleva a moral dos sobreviventes' }
      ]
    },

    caverna: {
      id: 'caverna',
      nome: 'Caverna Sombria',
      icone: '🕸️',
      normX: 0.880,
      normY: 0.220,
      pos3D: { x: 11.4, y: 3.2, z: -5.6 },
      hitbox: {
        tipo: 'box',
        largura: 5.5,
        altura: 4.5,
        profundidade: 5.0,
        offsetY: 2.25
      },
      descricao: 'Formação rochosa escarpada no nordeste da ilha. Ecoa sussurros profundos, abriga veios minerais e mistérios ocultos.',
      tipoZona: 'perigo_recurso',
      recursos: {
        mineral: 'Jazida de Pedra e Minério de Ferro',
        seguranca: 'Área escura — tochas recomendadas',
        abrigo: 'Proteção total contra chuva e vento'
      },
      acoes: [
        { id: 'minerar_pedra', nome: 'Extrair Pedras e Cascalho', icone: '⛏️', desc: 'Coleta blocos resistentes para obras e ferramentas' },
        { id: 'explorar_profundezas', nome: 'Explorar Galeria Oculta', icone: '🔦', desc: 'Avança nas sombras em busca de tesouros ou pistas' },
        { id: 'buscar_minerio', nome: 'Garimpar Minério de Ferro', icone: '💎', desc: 'Busca veios metálicos para futuras forjas' },
        { id: 'abrigar_tempestade', nome: 'Proteger-se da Tempestade', icone: '🛡️', desc: 'Usa a caverna como refúgio natural impenetrável' }
      ]
    },

    casa_icaro: {
      id: 'casa_icaro',
      nome: 'Cabana do Ícaro',
      icone: '🏠',
      normX: 0.220,
      normY: 0.480,
      pos3D: { x: -8.4, y: 1.45, z: -0.4 },
      hitbox: { tipo: 'box', largura: 2.8, altura: 2.6, profundidade: 2.6, offsetY: 1.3 },
      morador: 'icaro',
      descricao: 'Cabana de troncos robustos com chaminé de pedra e teto de palha trançada, erguida pelo pioneiro.',
      tipoZona: 'moradia',
      recursos: { bau: 'Estoque pessoal protegido', cama: 'Cama de folhas secas macias' },
      acoes: [
        { id: 'dormir', nome: 'Dormir na Cabana', icone: '🛌', desc: 'Sono profundo e recuperação completa de energia' },
        { id: 'guardar_bau', nome: 'Guardar Mantimentos no Baú', icone: '📦', desc: 'Armazena madeira, peixe e água com segurança' },
        { id: 'retirar_bau', nome: 'Pegar Suprimentos do Baú', icone: '🗳️', desc: 'Retira itens para expedições' },
        { id: 'ampliar_moradia', nome: 'Reforçar / Ampliar Cabana', icone: '🔨', desc: 'Adiciona novos cômodos e melhorias' }
      ]
    },

    casa_lara: {
      id: 'casa_lara',
      nome: 'Cabana da Lara',
      icone: '🏡',
      normX: 0.240,
      normY: 0.410,
      pos3D: { x: -7.8, y: 1.40, z: -1.8 },
      hitbox: { tipo: 'box', largura: 2.6, altura: 2.5, profundidade: 2.5, offsetY: 1.25 },
      morador: 'lara',
      descricao: 'Cabana aconchegante ornada com conchas marinhas, flores do bosque e feixes de ervas aromáticas.',
      tipoZona: 'moradia',
      recursos: { herbario: 'Secagem de folhas medicinais', bau: 'Estoque pessoal' },
      acoes: [
        { id: 'dormir', nome: 'Repousar na Cabana', icone: '🛌', desc: 'Descanso restaurador' },
        { id: 'preparar_ervas', nome: 'Preparar Bálsamos e Remédios', icone: '🌿', desc: 'Macera folhas para curar dores e feridas' }
      ]
    },

    casa_joao: {
      id: 'casa_joao',
      nome: 'Abrigo do João',
      icone: '🛖',
      normX: 0.460,
      normY: 0.240,
      pos3D: { x: -1.2, y: 1.85, z: -5.2 },
      hitbox: { tipo: 'box', largura: 2.8, altura: 2.5, profundidade: 2.6, offsetY: 1.3 },
      morador: 'joao',
      descricao: 'Abrigo rústico de pedra e toras erguido na encosta norte, próximo à nascente de água.',
      tipoZona: 'moradia',
      recursos: { bancada: 'Oficina de talha de madeira' },
      acoes: [
        { id: 'dormir', nome: 'Descansar no Abrigo', icone: '🛌', desc: 'Repouso nas alturas' },
        { id: 'entalhar_madeira', nome: 'Entalhar Ferramentas', icone: '🪓', desc: 'Fabrica cabos, lanças e peças de encaixe' }
      ]
    },

    casa_maria: {
      id: 'casa_maria',
      nome: 'Cabana da Maria',
      icone: '🏕️',
      normX: 0.820,
      normY: 0.580,
      pos3D: { x: 9.6, y: 1.35, z: 1.6 },
      hitbox: { tipo: 'box', largura: 2.8, altura: 2.5, profundidade: 2.5, offsetY: 1.25 },
      morador: 'maria',
      descricao: 'Cabana de terra e madeira localizada junto às plantações e ao curral dos animais.',
      tipoZona: 'moradia',
      recursos: { despensa: 'Frascos de sementes e grãos' },
      acoes: [
        { id: 'dormir', nome: 'Dormir na Cabana', icone: '🛌', desc: 'Descanso após o trabalho do campo' },
        { id: 'separar_sementes', nome: 'Triar Sementes', icone: '🌱', desc: 'Prepara plantios para a próxima estação' }
      ]
    },

    acampamento: {
      id: 'acampamento',
      nome: 'Acampamento Central',
      icone: '⛺',
      normX: 0.460,
      normY: 0.540,
      pos3D: { x: -1.2, y: 1.25, z: 0.8 },
      hitbox: { tipo: 'cylinder', raio: 2.4, altura: 2.0, offsetY: 1.0 },
      descricao: 'Área plana com tendas de folhagem e toras de apoio ao redor da praça central.',
      tipoZona: 'comunitario',
      recursos: { espaco: 'Área para novas obras comunitárias' },
      acoes: [
        { id: 'erguer_abrigo', nome: 'Erguer Novo Abrigo', icone: '🔨', desc: 'Constrói nova moradia para quem chegar' }
      ]
    },

    arena: {
      id: 'arena',
      nome: 'Arena de Lutas & Treino',
      icone: '⚔️',
      normX: 0.660,
      normY: 0.360,
      pos3D: { x: 4.8, y: 1.35, z: -2.8 },
      hitbox: { tipo: 'cylinder', raio: 2.8, altura: 1.8, offsetY: 0.9 },
      descricao: 'Círculo demarcado por estacas de madeira com solo de terra batida para treinos e disputas.',
      tipoZona: 'treino',
      recursos: { bonecos: 'Boneco de palha e alvos de treino' },
      acoes: [
        { id: 'treinar_combate', nome: 'Treinar Golpes e Defesa', icone: '🥊', desc: 'Melhora reflexos e condição física' },
        { id: 'desafiar_duelo', nome: 'Duelo Amistoso de Força', icone: '🤼', desc: 'Disputa de honra entre sobreviventes' }
      ]
    },

    bosque: {
      id: 'bosque',
      nome: 'Bosque de Frutas',
      icone: '🍎',
      normX: 0.320,
      normY: 0.320,
      pos3D: { x: -5.4, y: 1.5, z: -3.6 },
      hitbox: { tipo: 'cylinder', raio: 2.6, altura: 2.4, offsetY: 1.2 },
      descricao: 'Pomar nativo da ilha com árvores frutíferas e arbustos de bagas doces.',
      tipoZona: 'coleta',
      recursos: { frutos: 'Cocos, bagas e frutos silvestres' },
      acoes: [
        { id: 'colher_frutos', nome: 'Colher Frutos Silvestres', icone: '🧺', desc: 'Alimento rápido e suculento' },
        { id: 'buscar_sementes', nome: 'Coletar Mudas e Sementes', icone: '🌱', desc: 'Leva para cultivar na fazenda' }
      ]
    },

    floresta: {
      id: 'floresta',
      nome: 'Floresta Fechada',
      icone: '🌲',
      normX: 0.760,
      normY: 0.320,
      pos3D: { x: 7.8, y: 1.6, z: -3.6 },
      hitbox: { tipo: 'cylinder', raio: 3.2, altura: 3.0, offsetY: 1.5 },
      descricao: 'Mata densa de árvores altas e folhagem espessa. Fonte inesgotável de madeira e cipós.',
      tipoZona: 'extracao',
      recursos: { madeira: 'Troncos pesados e gravetos', cipo: 'Cipós resistentes para amarras' },
      acoes: [
        { id: 'cortar_lenha', nome: 'Cortar Madeira e Troncos', icone: '🪓', desc: 'Madeira para construções e fogueira' },
        { id: 'colher_cipos', nome: 'Colher Fibras e Cipós', icone: '🧶', desc: 'Fios para tecer cordas e armadilhas' }
      ]
    },

    rio: {
      id: 'rio',
      nome: 'Margem do Rio',
      icone: '💧',
      normX: 0.585,
      normY: 0.580,
      pos3D: { x: 2.55, y: 0.95, z: 1.6 },
      hitbox: { tipo: 'box', largura: 4.2, altura: 1.5, profundidade: 4.8, offsetY: 0.75 },
      descricao: 'Águas límpidas que descem da montanha e correm calmas em direção ao mar.',
      tipoZona: 'agua_doce',
      recursos: { agua: 'Água pura potável', peixe: 'Peixes de água doce' },
      acoes: [
        { id: 'beber_agua', nome: 'Beber Água Fresca', icone: '🚰', desc: 'Sacia a sede e renova a vitalidade' },
        { id: 'pescar_rio', nome: 'Pescar com Lança de Bambu', icone: '🎣', desc: 'Captura peixes rápidos do leito do rio' }
      ]
    },

    cachoeira: {
      id: 'cachoeira',
      nome: 'Cachoeira & Nascente',
      icone: '🌊',
      normX: 0.650,
      normY: 0.140,
      pos3D: { x: 4.5, y: 2.6, z: -7.2 },
      hitbox: { tipo: 'cylinder', raio: 2.8, altura: 3.2, offsetY: 1.6 },
      descricao: 'Queda d\'água cristalina entre rochas altas. O som relaxante acalma a mente e purifica a alma.',
      tipoZona: 'santuario',
      recursos: { pureza: 'Água mineral da fonte', argila: 'Barro e argila nas margens' },
      acoes: [
        { id: 'banhar', nome: 'Banho Revigorante', icone: '🚿', desc: 'Limpa a exaustão e traz serenidade' },
        { id: 'coletar_argila', nome: 'Extrair Argila Maleável', icone: '🏺', desc: 'Massa para moldar potes e telhas' }
      ]
    },

    fazenda: {
      id: 'fazenda',
      nome: 'Horta da Fazenda',
      icone: '🌾',
      normX: 0.880,
      normY: 0.560,
      pos3D: { x: 11.4, y: 1.25, z: 1.2 },
      hitbox: { tipo: 'box', largura: 4.0, altura: 1.8, profundidade: 3.6, offsetY: 0.9 },
      descricao: 'Canteiros de terra fértil preparados para plantio de milho, raízes e legumes.',
      tipoZona: 'agricultura',
      recursos: { plantio: 'Canteiros arados e adubados' },
      acoes: [
        { id: 'regar_plantas', nome: 'Regar Canteiros', icone: '🪴', desc: 'Acelera o crescimento das hortaliças' },
        { id: 'colher_safra', nome: 'Colher Vegetais Maduros', icone: '🥕', desc: 'Alimento farto para a comunidade' }
      ]
    },

    curral: {
      id: 'curral',
      nome: 'Curral de Animais',
      icone: '🐑',
      normX: 0.890,
      normY: 0.670,
      pos3D: { x: 11.7, y: 1.15, z: 3.4 },
      hitbox: { tipo: 'box', largura: 3.6, altura: 2.0, profundidade: 3.6, offsetY: 1.0 },
      descricao: 'Cerca de estacas de madeira onde os animais domesticados da ilha pastam em segurança.',
      tipoZona: 'pecuaria',
      recursos: { animais: 'Ovelhas e galinhas silvestres' },
      acoes: [
        { id: 'alimentar_animais', nome: 'Tratar dos Animais', icone: '🌾', desc: 'Fornece capim e grãos frescos' },
        { id: 'coletar_ovos_leite', nome: 'Coletar Ovos e Lã', icone: '🥚', desc: 'Recursos valiosos e nutritivos' }
      ]
    },

    mar: {
      id: 'mar',
      nome: 'Praia do Sul',
      icone: '🏖️',
      normX: 0.350,
      normY: 0.880,
      pos3D: { x: -4.5, y: 0.45, z: 7.6 },
      hitbox: { tipo: 'box', largura: 6.0, altura: 1.5, profundidade: 3.8, offsetY: 0.75 },
      descricao: 'Orla de areia fina acariciada pela arrebentação calma do mar do sul.',
      tipoZona: 'litoral',
      recursos: { mar: 'Sal marinho e conchas' },
      acoes: [
        { id: 'pescar_mar', nome: 'Pesca de Beira de Praia', icone: '🐟', desc: 'Pesca peixes maiores da costa' },
        { id: 'catar_conchas', nome: 'Recolher Conchas e Sal', icone: '🐚', desc: 'Materiais para ornamentos e tempero' }
      ]
    },

    barco: {
      id: 'barco',
      nome: 'Cais do Barco (Jangada)',
      icone: '⛵',
      normX: 0.480,
      normY: 0.840,
      pos3D: { x: -0.6, y: 0.45, z: 6.8 },
      hitbox: { tipo: 'box', largura: 3.5, altura: 2.4, profundidade: 4.8, offsetY: 1.2 },
      descricao: 'Píer rústico de pranchas onde a jangada oceânica repousa ancorada.',
      tipoZona: 'nautico',
      recursos: { barco: 'Pronto para viagens em alto mar' },
      acoes: [
        { id: 'navegar', nome: 'Navegar para a Ilha Vizinha', icone: '🧭', desc: 'Viagem marítima guiada pelas estrelas' },
        { id: 'reparar_casco', nome: 'Inspecionar e Calafetar Casco', icone: '🛠️', desc: 'Garante que a madeira não faça água' }
      ]
    },

    ilha_vizinha: {
      id: 'ilha_vizinha',
      nome: 'Ilha Vizinha (Atol)',
      icone: '🏝️',
      normX: 0.080,
      normY: 0.820,
      pos3D: { x: -12.6, y: 0.60, z: 6.4 },
      hitbox: { tipo: 'cylinder', raio: 3.2, altura: 2.2, offsetY: 1.1 },
      descricao: 'Ilhota isolada a sudoeste, acessível exclusivamente por navegação.',
      tipoZona: 'expansao',
      recursos: { misterio: 'Praia virgem e recifes intocados' },
      acoes: [
        { id: 'explorar_atol', nome: 'Explorar Recifes e Palmeiras', icone: '🗺️', desc: 'Desbrava o novo horizonte' }
      ]
    }
  };

  // 2. CONVERSÃO MATEMÁTICA E CALIBRAÇÃO (NORM 2D -> THREE 3D)
  function traduzir2DPara3D(normX, normY, fallbackY) {
    const worldX = (normX - 0.5) * 30.0;
    const worldZ = (normY - 0.5) * 20.0;
    const worldY = (fallbackY !== undefined) ? fallbackY : 1.2;
    return { x: worldX, y: worldY, z: worldZ };
  }

  // 3. TRILHAS E ARESTAS 3D (Caminhos lógicos do espaco.js convertidos em 3D)
  // Personagens NÃO atravessam paredes nem montanhas: seguem as trilhas!
  const ARESTAS_LOGICAS = [
    { a:'fogueira', b:'casa_icaro', wp:[[.42,.49],[.34,.55],[.27,.56]] },
    { a:'fogueira', b:'acampamento', wp:[] },
    { a:'arena', b:'acampamento', wp:[[.515,.445]] },
    { a:'fogueira', b:'casa_joao', wp:[[.46,.42],[.45,.33],[.47,.27]] },
    { a:'casa_joao', b:'bosque', wp:[[.40,.27],[.35,.29]] },
    { a:'bosque', b:'floresta', wp:[[.42,.33],[.52,.34],[.62,.33],[.72,.31]] },
    { a:'floresta', b:'cachoeira', wp:[[.73,.20],[.69,.13]] },
    { a:'floresta', b:'fazenda', wp:[[.86,.38],[.90,.47],[.935,.53]] },
    { a:'fazenda', b:'casa_maria', wp:[[.85,.57]] },
    { a:'fazenda', b:'curral', wp:[[.885,.62]] },
    { a:'curral', b:'casa_maria', wp:[[.86,.63]] },
    { a:'curral', b:'rio', wp:[[.78,.64],[.68,.62]] },
    { a:'casa_icaro', b:'casa_lara', wp:[[.23,.44]] },
    { a:'casa_lara', b:'bosque', wp:[[.28,.36]] },
    { a:'fazenda', b:'rio', wp:[[.90,.66],[.80,.70],[.73,.66],[.70,.62]] },
    { a:'fogueira', b:'fazenda', wp:[[.56,.47],[.63,.51],[.665,.548],[.76,.62],[.86,.66],[.93,.61]] },
    { a:'fogueira', b:'bosque', wp:[[.44,.43],[.37,.37]] },
    { a:'fogueira', b:'mar', wp:[[.455,.55],[.43,.65],[.40,.76],[.38,.86]] },
    { a:'fogueira', b:'barco', wp:[[.49,.56],[.487,.66],[.487,.77]] },
    { a:'mar', b:'barco', wp:[[.42,.91],[.455,.89]] },
    { a:'casa_icaro', b:'mar', wp:[[.24,.58],[.28,.70],[.32,.82]] },
    { a:'barco', b:'rio', wp:[[.53,.79],[.59,.71],[.645,.64]] },
    { a:'casa_maria', b:'rio', wp:[[.82,.66],[.76,.64],[.72,.61]] },
    { a:'rio', b:'cachoeira', wp:[[.71,.48],[.69,.38],[.675,.27],[.66,.17]] },
    { a:'casa_icaro', b:'bosque', wp:[[.23,.40],[.26,.35]] },
    { a:'bosque', b:'acampamento', wp:[[.36,.36],[.40,.42]] },
    { a:'arena', b:'fogueira', wp:[[.49,.42]] },
    { a:'acampamento', b:'barco', wp:[[.46,.62],[.46,.75]] },
    // Trilha para a Caverna (Entrada a partir da floresta e da encosta leste)
    { a:'floresta', b:'caverna', wp:[[.856,.241],[.895,.203]] },
    // Trilhas de Água (Navegação até a Ilha Vizinha)
    { a:'barco', b:'ilha_vizinha', wp:[[.44,.965],[.34,.985],[.24,.975],[.14,.945]], agua: true },
    { a:'mar', b:'ilha_vizinha', wp:[[.30,.968],[.21,.962],[.13,.925]], agua: true }
  ];

  // Constrói mapa de vizinhança e arestas 3D
  const vizinhos = new Map();
  const arestasMap = new Map();
  const chaveAresta = (u, v) => u < v ? u + '|' + v : v + '|' + u;

  for (const noId of Object.keys(NOS_RPG)) {
    vizinhos.set(noId, []);
  }

  function converterPolilinha3D(aresta) {
    const noA = NOS_RPG[aresta.a];
    const noB = NOS_RPG[aresta.b];
    if (!noA || !noB) return [];

    const pts = [];
    pts.push({ x: noA.pos3D.x, y: noA.pos3D.y, z: noA.pos3D.z });

    for (let i = 0; i < (aresta.wp || []).length; i++) {
      const [nx, ny] = aresta.wp[i];
      // Interpola a altura Y suavemente entre os dois nós
      const t = (i + 1) / ((aresta.wp.length || 0) + 1);
      const yInterp = noA.pos3D.y * (1 - t) + noB.pos3D.y * t;
      const p3d = traduzir2DPara3D(nx, ny, yInterp);
      pts.push(p3d);
    }

    pts.push({ x: noB.pos3D.x, y: noB.pos3D.y, z: noB.pos3D.z });
    return pts;
  }

  function dist3D(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  for (const ar of ARESTAS_LOGICAS) {
    const pts3D = converterPolilinha3D(ar);
    let comp = 0;
    for (let i = 1; i < pts3D.length; i++) {
      comp += dist3D(pts3D[i - 1], pts3D[i]);
    }
    const trecho = {
      a: ar.a,
      b: ar.b,
      pontos3D: pts3D,
      comprimento: comp,
      agua: !!ar.agua
    };
    arestasMap.set(chaveAresta(ar.a, ar.b), trecho);
    if (vizinhos.has(ar.a)) vizinhos.get(ar.a).push({ no: ar.b, trecho });
    if (vizinhos.has(ar.b)) vizinhos.get(ar.b).push({ no: ar.a, trecho });
  }

  // 4. ALGORITMO DIJKSTRA NO GRAFO DE NÓS (SEM TELEPORTE)
  function calcularRota(de, para) {
    if (!NOS_RPG[de] || !NOS_RPG[para]) return null;
    if (de === para) {
      return { caminho: [de], trechos: [], pontos3D: [{ ...NOS_RPG[de].pos3D }], distanciaTotal: 0, ciclosEstimados: 0 };
    }

    const dist = new Map([[de, 0]]);
    const prev = new Map();
    const visitados = new Set();

    while (true) {
      let atual = null, menor = Infinity;
      for (const [no, d] of dist) {
        if (!visitados.has(no) && d < menor) {
          menor = d; atual = no;
        }
      }
      if (atual === null || atual === para) break;
      visitados.add(atual);

      const viz = vizinhos.get(atual) || [];
      for (const { no, trecho } of viz) {
        const nd = menor + trecho.comprimento;
        if (nd < (dist.get(no) ?? Infinity)) {
          dist.set(no, nd);
          prev.set(no, { no: atual, via: trecho });
        }
      }
    }

    if (!dist.has(para)) return null;

    const caminho = [para];
    const trechos = [];
    let cur = para;
    while (cur !== de) {
      const p = prev.get(cur);
      if (!p) return null;
      trechos.unshift(p.via);
      caminho.unshift(p.no);
      cur = p.no;
    }

    // Monta a polilinha 3D contínua pela trilha
    const pontos3D = [];
    for (let i = 0; i < trechos.length; i++) {
      const tr = trechos[i];
      const invertido = (caminho[i] !== tr.a);
      const pts = invertido ? [...tr.pontos3D].reverse() : [...tr.pontos3D];
      if (i > 0 && pts.length > 0) pts.shift(); // Evita duplicar ponto de nó compartilhado
      pontos3D.push(...pts);
    }

    const distTotal = dist.get(para) || 0;
    // Cálculo do tempo de caminhada (RPG):
    // 1 trecho = 1 ciclo; rotas mais longas (ex: Ícaro até Caverna) levam 2 a 4 ciclos
    const ciclosEstimados = Math.max(1, Math.min(6, Math.round(distTotal / 6.0) || (caminho.length - 1)));

    return {
      caminho,
      trechos,
      pontos3D,
      distanciaTotal: distTotal,
      ciclosEstimados
    };
  }

  // 5. GERENCIADOR DE MOVIMENTO SUAVE DOS PERSONAGENS (INTERPOLAÇÃO NA TRILHA)
  class GerenciadorMovimentoRpg {
    constructor() {
      this.personagens = {}; // { icaro: { estado: 'parado'|'caminhando', rota, posAtual, targetPos, progresso, velocidade, ... } }
    }

    iniciarDeslocamento(serId, origemNo, destinoNo, velocidadeCaminhada = 0.05) {
      const rota = calcularRota(origemNo, destinoNo);
      if (!rota || rota.pontos3D.length < 2) return null;

      const pState = {
        serId,
        estado: 'caminhando',
        origem: origemNo,
        destino: destinoNo,
        rota,
        pontos3D: rota.pontos3D,
        progressoTotal: 0.0,      // 0.0 a 1.0 ao longo de toda a trilha
        segmentoAtual: 0,
        tSegmento: 0.0,
        posicaoAtual: { ...rota.pontos3D[0] },
        direcaoAtual: { x: 0, y: 0, z: 1 },
        velocidade: velocidadeCaminhada,
        ciclosRestantes: rota.ciclosEstimados
      };

      this.personagens[serId] = pState;
      return pState;
    }

    atualizar(deltaTempo = 0.016) {
      for (const serId in this.personagens) {
        const p = this.personagens[serId];
        if (p.estado !== 'caminhando') continue;

        const pts = p.pontos3D;
        if (p.segmentoAtual >= pts.length - 1) {
          // Chegou ao destino da trilha!
          p.estado = 'parado';
          p.progressoTotal = 1.0;
          p.posicaoAtual = { ...pts[pts.length - 1] };
          continue;
        }

        const pA = pts[p.segmentoAtual];
        const pB = pts[p.segmentoAtual + 1];
        const segDist = dist3D(pA, pB) || 0.001;

        // Avanço suave proporcional à velocidade
        const passo = (p.velocidade * deltaTempo * 60) / segDist;
        p.tSegmento += passo;

        if (p.tSegmento >= 1.0) {
          p.segmentoAtual++;
          p.tSegmento = 0.0;
        }

        const t = Math.min(1.0, Math.max(0.0, p.tSegmento));
        p.posicaoAtual.x = pA.x + (pB.x - pA.x) * t;
        p.posicaoAtual.y = pA.y + (pB.y - pA.y) * t;
        p.posicaoAtual.z = pA.z + (pB.z - pA.z) * t;

        // Vetor de direção da caminhada
        const dx = pB.x - pA.x;
        const dz = pB.z - pA.z;
        const len = Math.hypot(dx, dz) || 1;
        p.direcaoAtual.x = dx / len;
        p.direcaoAtual.z = dz / len;

        // Progresso geral aproximado
        p.progressoTotal = (p.segmentoAtual + t) / (pts.length - 1);
      }
    }

    obterEstado(serId) {
      return this.personagens[serId] || null;
    }
  }

  // 6. INTEGRADOR THREE.JS — HITBOXES, OCLUSÃO E RAYCASTING
  class IntegradorThreeRpg {
    constructor() {
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.hitboxMeshes = [];
      this.raycaster = null;
      this.mouse = null;
      this.mostrarHitboxesGizmo = false;
      this.onNoClicadoCallback = null;
      this.gerenciadorMov = new GerenciadorMovimentoRpg();
    }

    initThree(scene, camera, renderer, onNoClicado) {
      this.scene = scene;
      this.camera = camera;
      this.renderer = renderer;
      this.onNoClicadoCallback = onNoClicado;

      if (typeof THREE !== 'undefined') {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.criarHitboxesMundo();
        this.configurarEventosClique();
      }
    }

    criarHitboxesMundo() {
      if (!this.scene || typeof THREE === 'undefined') return;

      // Cria hitboxes interativas para todos os nós (especialmente Fogueira e Caverna)
      for (const noId in NOS_RPG) {
        const no = NOS_RPG[noId];
        const hb = no.hitbox;
        let geo;

        if (hb.tipo === 'cylinder') {
          geo = new THREE.CylinderGeometry(hb.raio, hb.raio, hb.altura, 16);
        } else if (hb.tipo === 'box') {
          geo = new THREE.BoxGeometry(hb.largura, hb.altura, hb.profundidade);
        } else {
          geo = new THREE.SphereGeometry(hb.raio || 1.8, 12, 12);
        }

        // Material com depthTest ativado para respeitar a oclusão do modelo 3D
        const mat = new THREE.MeshBasicMaterial({
          color: (noId === 'fogueira') ? 0xf97316 : (noId === 'caverna') ? 0xa855f7 : 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: this.mostrarHitboxesGizmo ? 0.65 : 0.0,
          depthTest: true,
          depthWrite: false
        });

        const mesh = new THREE.Mesh(geo, mat);
        const yOff = hb.offsetY || (hb.altura ? hb.altura / 2 : 1.0);
        mesh.position.set(no.pos3D.x, no.pos3D.y + yOff, no.pos3D.z);
        mesh.userData = { noId: no.id, dadosNo: no, isHitboxRpg: true };
        mesh.name = 'hitbox_' + no.id;

        // Adiciona indicador / runa de chão suave sob a hitbox
        const totem = this.criarIndicadorChao(no);
        mesh.add(totem);

        this.scene.add(mesh);
        this.hitboxMeshes.push(mesh);
      }
    }

    criarIndicadorChao(no) {
      const g = new THREE.Group();
      const cor = (no.id === 'fogueira') ? 0xf97316 : (no.id === 'caverna') ? 0xa855f7 : 0x0284c7;

      // Anel no solo
      const ringGeo = new THREE.RingGeometry(1.2, 1.45, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
        depthTest: true
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -(no.hitbox.offsetY || 1.0) + 0.05;
      g.add(ring);

      return g;
    }

    configurarEventosClique() {
      if (!this.renderer || !this.renderer.domElement) return;

      const dom = this.renderer.domElement;
      let downX = 0, downY = 0;

      dom.addEventListener('pointerdown', (e) => {
        downX = e.clientX;
        downY = e.clientY;
      });

      dom.addEventListener('pointerup', (e) => {
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist > 6) return; // Ignora se foi arraste de câmera / orbit

        const rect = dom.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.hitboxMeshes, true);

        if (hits.length > 0) {
          let target = hits[0].object;
          while (target && !target.userData?.isHitboxRpg && target.parent) {
            target = target.parent;
          }
          if (target && target.userData && target.userData.dadosNo) {
            const no = target.userData.dadosNo;
            console.log(`[CORTEX 3D] Clique no Nó RPG: ${no.nome} (${no.id})`, no.pos3D);
            if (this.onNoClicadoCallback) {
              this.onNoClicadoCallback(no);
            }
          }
        }
      });
    }

    alternarVisualizacaoHitboxes(ativo) {
      this.mostrarHitboxesGizmo = (ativo !== undefined) ? ativo : !this.mostrarHitboxesGizmo;
      this.hitboxMeshes.forEach(m => {
        if (m.material) {
          m.material.opacity = this.mostrarHitboxesGizmo ? 0.65 : 0.0;
          m.material.needsUpdate = true;
        }
      });
      return this.mostrarHitboxesGizmo;
    }
  }

  // 7. COMPONENTE DE INTERFACE: PAINEL CORTEX DO LOCAL
  class PainelCortexUI {
    constructor() {
      this.container = null;
      this.noAtual = null;
      this.criarElementoDOM();
    }

    criarElementoDOM() {
      if (typeof document === 'undefined') return;
      let el = document.getElementById('painel-cortex-local');
      if (!el) {
        el = document.createElement('div');
        el.id = 'painel-cortex-local';
        el.style.cssText = `
          position: absolute;
          right: 20px;
          top: 70px;
          width: 380px;
          max-width: calc(100vw - 40px);
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          background: rgba(8, 20, 34, 0.96);
          backdrop-filter: blur(16px);
          border: 1px solid #38bdf8;
          border-radius: 16px;
          padding: 18px;
          color: #f1f5f9;
          font-family: 'Segoe UI', system-ui, sans-serif;
          z-index: 1000;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 20px rgba(56, 189, 248, 0.25);
          display: none;
          transition: all 0.25s ease;
        `;
        document.body.appendChild(el);
      }
      this.container = el;
    }

    abrir(dadosNo, estadoMundo) {
      if (!this.container) return;
      this.noAtual = dadosNo;

      // Descobre quem está neste nó no estado atual
      const habitantesNo = [];
      if (estadoMundo && estadoMundo.seres) {
        Object.values(estadoMundo.seres).forEach(ser => {
          if (ser.status !== 'morto' && ser.local === dadosNo.id) {
            habitantesNo.push(ser);
          }
        });
      }

      // Renderiza o HTML do CORTEX
      let acoesHtml = '';
      (dadosNo.acoes || []).forEach(ac => {
        acoesHtml += `
          <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
                <span>${ac.icone}</span> <span>${ac.nome}</span>
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${ac.desc}</div>
            </div>
            <button onclick="window.MapaRpg.executarAcaoCortex('${dadosNo.id}', '${ac.id}')" style="background: linear-gradient(135deg, #0284c7, #0369a1); border: 1px solid #38bdf8; color: #fff; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
              Executar
            </button>
          </div>
        `;
      });

      let recursosHtml = '';
      if (dadosNo.recursos) {
        for (const [k, v] of Object.entries(dadosNo.recursos)) {
          recursosHtml += `
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="color: #94a3b8; text-transform: capitalize;">${k}:</span>
              <span style="color: #38bdf8; font-weight: 600;">${v}</span>
            </div>
          `;
        }
      }

      let habitantesHtml = '';
      if (habitantesNo.length > 0) {
        habitantesNo.forEach(h => {
          habitantesHtml += `
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(56, 189, 248, 0.15); border: 1px solid #0284c7; padding: 4px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 700; color: #e0f2fe; margin-right: 6px; margin-top: 4px;">
              <span>👤</span> ${h.nome}
            </div>
          `;
        });
      } else {
        habitantesHtml = '<div style="font-size: 12px; color: #64748b; font-style: italic;">Nenhum sobrevivente aqui no momento.</div>';
      }

      this.container.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 12px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #f59e0b; text-transform: uppercase;">
              Nó Lógico 3D • CORTEX
            </div>
            <div style="font-size: 18px; font-weight: 800; color: #fff; margin-top: 2px; display: flex; align-items: center; gap: 8px;">
              <span>${dadosNo.icone}</span> <span>${dadosNo.nome}</span>
            </div>
            <div style="font-size: 11px; font-family: monospace; color: #7dd3fc; margin-top: 2px;">
              Coord: (${dadosNo.pos3D.x.toFixed(1)}, ${dadosNo.pos3D.y.toFixed(1)}, ${dadosNo.pos3D.z.toFixed(1)})
            </div>
          </div>
          <button onclick="window.MapaRpg.fecharCortex()" style="background: rgba(255,255,255,0.08); border: 1px solid #334155; color: #cbd5e1; width: 28px; height: 28px; border-radius: 8px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            ✕
          </button>
        </div>

        <p style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5; margin-bottom: 14px;">
          ${dadosNo.descricao}
        </p>

        <div style="margin-bottom: 14px; background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 10px; border: 1px solid #1e293b;">
          <div style="font-size: 11px; font-weight: 700; color: #facc15; text-transform: uppercase; margin-bottom: 6px;">
            Sobreviventes Presentes
          </div>
          <div>${habitantesHtml}</div>
        </div>

        <div style="margin-bottom: 14px; background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 10px; border: 1px solid #1e293b;">
          <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px;">
            Recursos & Estado Local
          </div>
          ${recursosHtml}
        </div>

        <div>
          <div style="font-size: 11px; font-weight: 700; color: #a855f7; text-transform: uppercase; margin-bottom: 8px;">
            Ações do Local (Mecânica RPG)
          </div>
          ${acoesHtml}
        </div>
      `;

      this.container.style.display = 'block';
    }

    fechar() {
      if (this.container) this.container.style.display = 'none';
    }
  }

  // Instâncias singleton globais
  const integradorThree = new IntegradorThreeRpg();
  const painelCortex = new PainelCortexUI();

  function abrirCortex(no) {
    let estado = null;
    if (typeof window !== 'undefined' && window.stateData) {
      estado = window.stateData;
    }
    painelCortex.abrir(no, estado);
  }

  function fecharCortex() {
    painelCortex.fechar();
  }

  function executarAcaoCortex(noId, acaoId) {
    console.log(`[CORTEX AÇÃO] Nó: ${noId}, Ação: ${acaoId}`);
    // Integração com rota de intervenção/comando do mundo sem popup bloqueante
    if (typeof fetch !== 'undefined') {
      fetch('/api/comando', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serId: 'icaro',
          comando: `Dirija-se a ${noId} e execute ${acaoId}`,
          de: 'Criador (CORTEX 3D)'
        })
      }).then(r => r.json()).then(res => {
        if (typeof window !== 'undefined' && typeof window.mostrarToast === 'function') {
          window.mostrarToast(`⚡ Ordem enviada ao habitante: ${res.mensagem || 'Ação registrada no mundo.'}`);
        } else {
          console.log(`[CORTEX] Ordem enviada ao habitante:\n${res.mensagem || 'Ação registrada no mundo.'}`);
        }
      }).catch(err => {
        console.warn('Comando via API:', err);
      });
    }
  }

  // Exportações universais
  exports.NOS_RPG = NOS_RPG;
  exports.ARESTAS_LOGICAS = ARESTAS_LOGICAS;
  exports.traduzir2DPara3D = traduzir2DPara3D;
  exports.calcularRota = calcularRota;
  exports.GerenciadorMovimentoRpg = GerenciadorMovimentoRpg;
  exports.IntegradorThreeRpg = IntegradorThreeRpg;
  exports.integradorThree = integradorThree;
  exports.painelCortex = painelCortex;
  exports.abrirCortex = abrirCortex;
  exports.fecharCortex = fecharCortex;
  exports.executarAcaoCortex = executarAcaoCortex;
  exports.gerenciadorMov = integradorThree.gerenciadorMov;
}));

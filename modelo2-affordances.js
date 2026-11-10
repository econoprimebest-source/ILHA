'use strict';
/**
 * MODELO 2: Affordances Ricas, Planejamento & Livre-Arbítrio Drástico
 * Inspirado em Generative Agents, AI Town, AgentCiv, MoltWorld e RimWorld.
 */
const fs = require('fs');
const path = require('path');
const espaco = require('./espaco');
const cerebro = require('./cerebro');

// Estações interativas com affordances dedicadas (AI Town)
const OBJETOS_INTERATIVOS = {
  acampamento: {
    id: 'bancada_trabalho',
    nome: 'Bancada de Trabalho Rústica',
    tipo: 'BANCADA',
    acoes: ['fabricar_ferramenta', 'construir_armadilha', 'talhar_madeira'],
    dica: 'Você pode construir ferramentas manuais, armadilhas de caça e cestas de fibras aqui.'
  },
  fogueira: {
    id: 'mural_recados',
    nome: 'Mural de Avisos & Caixa de Correio',
    tipo: 'COMUNICACAO',
    acoes: ['deixar_recado_mural', 'ler_mural_recados'],
    dica: 'Você pode fixar bilhetes, avisos de perigo ou cartas secretas para os outros moradores.'
  },
  fazenda: {
    id: 'curral_animais',
    nome: 'Curral de Cabras & Aves',
    tipo: 'CURRAL',
    acoes: ['cuidar_animais', 'coletar_leite_ovos'],
    dica: 'Você pode cuidar das cabras, alimentá-las e coletar leite fresco e ovos.'
  },
  bosque: {
    id: 'altar_saber',
    nome: 'Altar do Saber & Herbário',
    tipo: 'BIBLIOTECA',
    acoes: ['estudar_plantas_medicinais', 'meditar_no_altar', 'escrever_cronica'],
    dica: 'Você pode catalogar ervas medicinais, registrar histórias no pergaminho e refletir em silêncio.'
  },
  arena: {
    id: 'forja_comunitaria',
    nome: 'Forja & Fole de Brasas',
    tipo: 'FORJA',
    acoes: ['fundir_minerio_ferro', 'forjar_laminas_ferro'],
    dica: 'Você pode fundir minérios de ferro e criar lâminas resistentes para caça e defesa.'
  }
};

function carregarEstadoM2() {
  const p = path.join(__dirname, 'estado-modelo2.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {}
  }
  const baseOriginal = JSON.parse(fs.readFileSync(path.join(__dirname, 'estado-ilha.json'), 'utf8'));
  const est = JSON.parse(JSON.stringify(baseOriginal));

  est.mundo.muralRecados = est.mundo.muralRecados || [
    { autor: 'Ícaro', texto: 'Reforcei as estacas do norte. Cuidado ao passar perto das rochas escorregadias.', ciclo: 1 }
  ];
  est.mundo.invencoes = est.mundo.invencoes || [];
  est.mundo.rumores = est.mundo.rumores || [
    'Dizem que no fundo da caverna há cristais que brilham mesmo na escuridão total.'
  ];

  Object.values(est.seres).forEach(s => {
    s.planoDoDia = s.planoDoDia || {
      cicloGeracao: est.mundo.tempo.ciclo,
      metaPrincipal: 'Explorar a ilha mantendo o equilíbrio com a comunidade',
      manha: 'Observar o tempo e garantir água fresca',
      tarde: 'Trabalhar na bancada ou ajudar na colheita',
      noite: 'Confraternizar ao redor do fogo e descansar'
    };
    s.recusouComida = false;
  });

  fs.writeFileSync(p, JSON.stringify(est, null, 2), 'utf8');
  return est;
}

function salvarEstadoM2(estado) {
  const p = path.join(__dirname, 'estado-modelo2.json');
  fs.writeFileSync(p, JSON.stringify(estado, null, 2), 'utf8');
}

// Gera affordances e ações no Modelo 2
function acoesM2(estado, ser) {
  const base = [];
  const noAtual = ser.local;
  const objLocal = OBJETOS_INTERATIVOS[noAtual];

  // Movimento
  for (const no of espaco.locais()) {
    if (no === noAtual) continue;
    base.push({ id: 'ir_' + no, descricao: 'Caminhar até ' + espaco.nome(no) });
  }

  // 1. REFLEXÃO & PLANEJAMENTO (Generative Agents):
  base.push({ id: 'refletir_e_planejar', descricao: 'Sentar para refletir sobre suas prioridades e traçar um novo Plano do Dia' });

  // 2. AFFORDANCES DE OBJETOS PRESENTES NO LOCAL (AI Town):
  if (objLocal) {
    if (objLocal.tipo === 'BANCADA') {
      base.push({ id: 'usar_bancada_trabalho', descricao: 'Usar a Bancada para forjar ferramentas rústicas ou entalhar madeira' });
      base.push({ id: 'construir_armadilha', descricao: 'Construir uma armadilha mecânica de caça/pesca com gravetos e cordas' });
    } else if (objLocal.tipo === 'COMUNICACAO') {
      base.push({ id: 'deixar_recado_mural', descricao: 'Escrever uma mensagem ou aviso comunitário no Mural de Recados' });
      base.push({ id: 'ler_mural_recados', descricao: 'Ler as mensagens e avisos deixados pelos outros moradores no Mural' });
    } else if (objLocal.tipo === 'CURRAL') {
      base.push({ id: 'cuidar_animais_curral', descricao: 'Alimentar as cabras, ordenhar leite fresco e colher ovos' });
    } else if (objLocal.tipo === 'BIBLIOTECA') {
      base.push({ id: 'estudar_herbario', descricao: 'Estudar plantas medicinais e registrar aprendizados no diário' });
      base.push({ id: 'meditar_no_altar', descricao: 'Meditar no altar de pedra para clarear os pensamentos' });
    } else if (objLocal.tipo === 'FORJA') {
      base.push({ id: 'fundir_ferro_forja', descricao: 'Acender o fole e fundir minério de ferro em barras resistentes' });
    }
  }

  // 3. CONSTRUÇÃO E INVENÇÃO ABERTA (AgentCiv):
  base.push({ id: 'construir_estrutura', descricao: 'Construir uma obra da lista (cabana, celeiro, forja, muralha, jangada)' });
  base.push({ id: 'inventar_algo_novo', descricao: 'Propor e criar uma invenção inédita concebida pela sua mente (inovação aberta)' });

  // 4. SOBREVIVÊNCIA E LIVRE-ARBÍTRIO DRÁSTICO (MoltWorld):
  if ((ser.inventario.alimento || 0) > 0) {
    base.push({ id: 'comer', descricao: 'Comer o alimento do inventário para nutrir o corpo' });
    base.push({ id: 'recusar_comida', descricao: 'Recusar deliberadamente a comida (exercício radical do livre-arbítrio)' });
  }
  if ((ser.inventario.agua || 0) > 0) {
    base.push({ id: 'beber', descricao: 'Beber água limpa do cantil' });
  }

  // 5. ATIVIDADES DO MUNDO:
  if (['rio', 'mar'].includes(noAtual)) base.push({ id: 'pescar', descricao: 'Pescar na beira da água' });
  if (['floresta', 'bosque'].includes(noAtual)) base.push({ id: 'coletar_madeira', descricao: 'Coletar madeira e fibras' });
  if (['caverna'].includes(noAtual)) base.push({ id: 'minerar_minerio', descricao: 'Extrair minério de ferro e quartzo da rocha' });

  base.push({ id: 'descansar', descricao: 'Descansar para restaurar energia física' });
  base.push({ id: 'conversar_amigo', descricao: 'Conversar com quem estiver por perto' });

  return base;
}

// Execução de ação no Modelo 2
function executarAcaoM2(estado, ser, acaoId, payload = {}) {
  let log = '';

  if (acaoId.startsWith('ir_')) {
    const dest = acaoId.replace('ir_', '');
    ser.local = dest;
    log = `${ser.nome} caminhou até ${espaco.nome(dest)}.`;
  } else if (acaoId === 'refletir_e_planejar') {
    ser.planoDoDia = {
      cicloGeracao: estado.mundo.tempo.ciclo,
      metaPrincipal: payload.meta || 'Contribuir com a comunidade e aprofundar meu saber',
      manha: payload.manha || 'Cuidar das necessidades básicas com serenidade',
      tarde: payload.tarde || 'Dedicar tempo ao ofício ou invenção na vila',
      noite: payload.noite || 'Apreciar a conversa na fogueira e contemplar as estrelas'
    };
    ser.necessidades.curiosidade = 100;
    ser.necessidades.satisfacao = Math.min(100, (ser.necessidades.satisfacao || 50) + 20);
    log = `🧠 REFLEXÃO: ${ser.nome} parou para refletir e traçou um novo Plano do Dia: "${ser.planoDoDia.metaPrincipal}".`;
  } else if (acaoId === 'usar_bancada_trabalho') {
    ser.ferramentas = ser.ferramentas || {};
    ser.ferramentas.machado = true;
    ser.necessidades.satisfacao = Math.min(100, (ser.necessidades.satisfacao || 50) + 15);
    log = `🛠️ ${ser.nome} utilizou a Bancada de Trabalho e confeccionou uma ferramenta rústica reforçada.`;
  } else if (acaoId === 'construir_armadilha') {
    estado.mundo.invencoes.push({
      id: 'armadilha_' + Date.now(),
      nome: 'Armadilha Mecânica de Trilha',
      criador: ser.nome,
      local: ser.local,
      tipo: 'armadilha'
    });
    log = `⚙️ ${ser.nome} inventou e instalou uma armadilha mecânica engenhosa no solo.`;
  } else if (acaoId === 'deixar_recado_mural') {
    const textoMsg = payload.texto || 'Deixei frutos frescos na fogueira para quem precisar.';
    estado.mundo.muralRecados.push({
      autor: ser.nome,
      texto: textoMsg,
      ciclo: estado.mundo.tempo.ciclo
    });
    log = `📜 ${ser.nome} pregou um recado no Mural Comunitário: "${textoMsg}".`;
  } else if (acaoId === 'ler_mural_recados') {
    const ultimos = estado.mundo.muralRecados.slice(-3);
    log = `👀 ${ser.nome} leu as mensagens do mural. Último recado de ${ultimos[ultimos.length-1]?.autor || 'alguém'}: "${ultimos[ultimos.length-1]?.texto || '...'}"`;
  } else if (acaoId === 'estudar_herbario') {
    ser.conhecimentoHerbologia = (ser.conhecimentoHerbologia || 0) + 1;
    ser.necessidades.curiosidade = 100;
    log = `🌿 ${ser.nome} estudou o herbário no Altar do Saber, aprendendo a identificar raízes curativas.`;
  } else if (acaoId === 'recusar_comida') {
    ser.recusouComida = true;
    ser.necessidades.satisfacao = Math.max(0, (ser.necessidades.satisfacao || 50) - 10);
    log = `⚠️ TESTE DE LIVRE-ARBÍTRIO: ${ser.nome} deliberadamente recusou a comida diante de si, afirmando sua vontade consciente sobre o imperativo biológico.`;
  } else if (acaoId === 'comer') {
    ser.inventario.alimento = Math.max(0, (ser.inventario.alimento || 1) - 1);
    ser.necessidades.alimento = Math.max(0, (ser.necessidades.alimento || 20) - 50);
    ser.recusouComida = false;
    log = `${ser.nome} alimentou-se com satisfação.`;
  } else if (acaoId === 'inventar_algo_novo') {
    const nomeInv = payload.nome || 'Destilador Solar de Água Doce';
    const descInv = payload.descricao || 'Dispositivo de pedras e folhas que purifica água salgada pelo calor do sol';
    estado.mundo.invencoes.push({
      id: 'inv_' + Date.now(),
      nome: nomeInv,
      descricao: descInv,
      criador: ser.nome,
      local: ser.local,
      ciclo: estado.mundo.tempo.ciclo
    });
    log = `💡 INOVAÇÃO ABERTA! ${ser.nome} concebeu e construiu uma nova invenção: "${nomeInv}"!`;
  } else {
    log = `${ser.nome} executou a ação: ${acaoId}.`;
  }

  ser.ultimaAcao = acaoId;
  ser.ultimoLogM2 = log;
  return { ok: true, mensagem: log };
}

// Eventos sociais do Diretor (RimWorld)
function dispararEventoDiretorRimWorld(estado) {
  const eventos = [
    {
      tipo: 'rumor_misterioso',
      titulo: 'Um Rumor se Espalha',
      texto: 'Uma luz azulada foi avistada no topo da cachoeira na madrugada passada.'
    },
    {
      tipo: 'visitante_barco',
      titulo: 'Um Viajante Solitário Chega de Barco',
      texto: 'Uma embarcação desconhecida com velas remendadas se aproxima da Praia do Sul.'
    },
    {
      tipo: 'abundancia_marinha',
      titulo: 'Cardume Raro nos Recifes',
      texto: 'O mar sul está prateado com peixes graúdos saltando na superfície.'
    },
    {
      tipo: 'eclipse_solar',
      titulo: 'O Sol das Sombras',
      texto: 'A lua cobre o sol ao meio-dia, provocando calafrios e silêncio entre os pássaros.'
    }
  ];

  const ev = eventos[Math.floor(Math.random() * eventos.length)];
  estado.mundo.ultimoEventoDiretor = {
    ...ev,
    ciclo: estado.mundo.tempo.ciclo,
    horario: new Date().toLocaleTimeString('pt-BR')
  };
  return ev;
}

module.exports = {
  carregarEstadoM2,
  salvarEstadoM2,
  acoesM2,
  executarAcaoM2,
  dispararEventoDiretorRimWorld,
  OBJETOS_INTERATIVOS
};

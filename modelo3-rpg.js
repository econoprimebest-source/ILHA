'use strict';
/**
 * MODELO 3: RPG de Construção e Evolução com Câmera Expandida (RTS / Colony Sim)
 * Economia de 4 recursos (Madeira, Pedra, Ferro, Moedas), grid de expansão e construções modulares.
 */
const fs = require('fs');
const path = require('path');
const espaco = require('./espaco');
const cerebro = require('./cerebro');

const CUSTOS_CONSTRUCAO = {
  construir_cabana: {
    nome: 'Cabana Residencial Rústica',
    madeira: 20,
    pedra: 10,
    ferro: 0,
    moedas: 0,
    beneficio: 'Aumenta a capacidade de moradores e moradia segura da vila.'
  },
  melhorar_muralha: {
    nome: 'Muralha de Pedra Fortificada',
    madeira: 0,
    pedra: 30,
    ferro: 15,
    moedas: 0,
    beneficio: 'Impede invasão de predadores selvagens e resiste a vendavais.'
  },
  construir_torre_vigia: {
    nome: 'Torre de Vigia e Sinalizador',
    madeira: 25,
    pedra: 15,
    ferro: 10,
    moedas: 5,
    beneficio: 'Alerta antecipado de temporais e naus aproximando-se.'
  },
  construir_oficina_forja: {
    nome: 'Oficina de Forja e Fundição',
    madeira: 15,
    pedra: 20,
    ferro: 5,
    moedas: 10,
    beneficio: 'Permite criar ferramentas e armas metálicas de alta durabilidade.'
  }
};

function carregarEstadoM3() {
  const p = path.join(__dirname, 'estado-modelo3.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {}
  }
  const baseOriginal = JSON.parse(fs.readFileSync(path.join(__dirname, 'estado-ilha.json'), 'utf8'));
  const est = JSON.parse(JSON.stringify(baseOriginal));

  // Tesouro comunitário e recursos da Vila (RTS)
  est.mundo.economiaRpg = {
    madeira: 35,
    pedra: 25,
    ferro: 12,
    moedas: 40
  };

  est.mundo.obrasConstruidas = [
    { id: 'cabana_1', tipo: 'cabana', nome: 'Cabana dos Fundadores', x: -3.5, z: 1.2, nivel: 1 },
    { id: 'cabana_2', tipo: 'cabana', nome: 'Abrigo Leste', x: 2.8, z: 2.1, nivel: 1 },
    { id: 'fogueira_rpg', tipo: 'fogueira', nome: 'Fogo Ancestral', x: 0, z: 0, nivel: 1 }
  ];

  est.mundo.missoesMural = [
    { id: 'm1', titulo: 'Explorar o Desfiladeiro Norte', recompensaMoedas: 15, feita: false },
    { id: 'm2', titulo: 'Entregar 10 toras de madeira na Praça', recompensaMoedas: 20, feita: false }
  ];

  fs.writeFileSync(p, JSON.stringify(est, null, 2), 'utf8');
  return est;
}

function salvarEstadoM3(estado) {
  const p = path.join(__dirname, 'estado-modelo3.json');
  fs.writeFileSync(p, JSON.stringify(estado, null, 2), 'utf8');
}

function acoesM3(estado, ser) {
  const base = [];
  const econ = estado.mundo.economiaRpg;
  const noAtual = ser.local;

  // Movimento
  for (const no of espaco.locais()) {
    if (no === noAtual) continue;
    base.push({ id: 'ir_' + no, descricao: 'Mover-se até ' + espaco.nome(no) });
  }

  // 1. EXTRAÇÃO DE RECURSOS (RTS / RPG):
  if (['caverna', 'cachoeira', 'rio'].includes(noAtual)) {
    base.push({ id: 'coletar_pedra', descricao: 'Extrair blocos de pedra resistente nas formações rochosas (+Pedra)' });
  }
  if (noAtual === 'caverna') {
    base.push({ id: 'minerar_ferro', descricao: 'Minerar veios de minério de ferro nas profundezas (+Ferro)' });
  }
  if (['floresta', 'bosque'].includes(noAtual)) {
    base.push({ id: 'cortar_arvore', descricao: 'Derrubar árvores caídas e toras altas com machado (+Madeira)' });
  }
  if (['mar', 'barco'].includes(noAtual)) {
    base.push({ id: 'pescar_mar', descricao: 'Pescar peixes e crustáceos para abastecer o vilarejo' });
  }

  // 2. ECONOMIA E MOEDAS (Comércio & Missões):
  base.push({ id: 'cumprir_missao_recompensa', descricao: 'Cumprir tarefa do mural cívico para ganhar moedas de ouro (+Moedas)' });
  if (econ.moedas >= 10 && ['acampamento', 'fogueira'].includes(noAtual)) {
    base.push({ id: 'comprar_suprimentos', descricao: 'Gastar 10 moedas para comprar rações de viagem e poção revigorante' });
  }

  // 3. CONSTRUÇÕES E OBRAS (Se houver recursos):
  for (const [idConst, info] of Object.entries(CUSTOS_CONSTRUCAO)) {
    if (econ.madeira >= info.madeira && econ.pedra >= info.pedra && econ.ferro >= info.ferro && econ.moedas >= info.moedas) {
      base.push({
        id: idConst,
        descricao: `[CONSTRUÇÃO] ${info.nome} (Custo: ${info.madeira} Madeira, ${info.pedra} Pedra, ${info.ferro} Ferro, ${info.moedas} Moedas) — ${info.beneficio}`
      });
    }
  }

  // 4. Ações pessoais
  base.push({ id: 'apenas_contemplar', descricao: 'Descansar o corpo e contemplar a evolução da vila' });
  base.push({ id: 'treinar_combate', descricao: 'Treinar manobras de espada e esquiva' });

  return base;
}

function executarAcaoM3(estado, ser, acaoId) {
  const econ = estado.mundo.economiaRpg;
  let log = '';

  if (acaoId.startsWith('ir_')) {
    const dest = acaoId.replace('ir_', '');
    ser.local = dest;
    log = `${ser.nome} moveu-se para ${espaco.nome(dest)}.`;
  } else if (acaoId === 'cortar_arvore') {
    const ganho = Math.floor(Math.random() * 5) + 6;
    econ.madeira += ganho;
    log = `🪓 ${ser.nome} cortou madeira resistente na floresta (+${ganho} Madeira). Total: ${econ.madeira}.`;
  } else if (acaoId === 'coletar_pedra') {
    const ganho = Math.floor(Math.random() * 4) + 5;
    econ.pedra += ganho;
    log = `⛏️ ${ser.nome} extraiu blocos de pedra nas rochas (+${ganho} Pedra). Total: ${econ.pedra}.`;
  } else if (acaoId === 'minerar_ferro') {
    const ganho = Math.floor(Math.random() * 3) + 3;
    econ.ferro += ganho;
    log = `⛓️ ${ser.nome} minerou minério puro de ferro na caverna (+${ganho} Ferro). Total: ${econ.ferro}.`;
  } else if (acaoId === 'cumprir_missao_recompensa') {
    const ganho = 15;
    econ.moedas += ganho;
    log = `💰 ${ser.nome} completou uma tarefa cívica e recebeu +${ganho} Moedas de Ouro. Total: ${econ.moedas}.`;
  } else if (acaoId === 'comprar_suprimentos') {
    econ.moedas -= 10;
    ser.necessidades.alimento = Math.max(0, (ser.necessidades.alimento || 20) - 40);
    ser.necessidades.energia = Math.min(100, (ser.necessidades.energia || 50) + 30);
    log = `🛒 ${ser.nome} comprou rações e ferramentas com 10 moedas de ouro.`;
  } else if (CUSTOS_CONSTRUCAO[acaoId]) {
    const c = CUSTOS_CONSTRUCAO[acaoId];
    econ.madeira -= c.madeira;
    econ.pedra -= c.pedra;
    econ.ferro -= c.ferro;
    econ.moedas -= c.moedas;

    const count = estado.mundo.obrasConstruidas.length + 1;
    const angulo = (count * 1.1) % (Math.PI * 2);
    const raio = 4.0 + (count * 0.8);
    const novaObra = {
      id: 'obra_' + count,
      tipo: acaoId.replace('construir_', '').replace('melhorar_', ''),
      nome: c.nome + ' #' + count,
      x: Number((Math.cos(angulo) * raio).toFixed(2)),
      z: Number((Math.sin(angulo) * raio).toFixed(2)),
      criador: ser.nome,
      ciclo: estado.mundo.tempo.ciclo
    };
    estado.mundo.obrasConstruidas.push(novaObra);
    ser.necessidades.satisfacao = 100;
    log = `🏰 EXPANSÃO DO REINO! ${ser.nome} ergueu ${c.nome}! O mapa cresceu com novas estruturas.`;
  } else {
    log = `${ser.nome} realizou a ação: ${acaoId}.`;
  }

  ser.ultimaAcao = acaoId;
  ser.ultimoLogM3 = log;
  return { ok: true, mensagem: log };
}

module.exports = {
  carregarEstadoM3,
  salvarEstadoM3,
  acoesM3,
  executarAcaoM3,
  CUSTOS_CONSTRUCAO
};

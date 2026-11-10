'use strict';
/**
 * MODELO 1: Economia de Estoque, Despensa e Tempo Livre
 * Transição da sobrevivência diária para acúmulo de riqueza, ócio humano e evolução social.
 */
const fs = require('fs');
const path = require('path');
const espaco = require('./espaco');
const cerebro = require('./cerebro');

// Definição de porções e rendimento dos alimentos
const VALOR_ALIMENTAR = {
  peixe: { porcoes: 2, saciedade: 40, desc: 'Peixe assado/fresco (rende 2 refeições)' },
  frutas: { porcoes: 3, saciedade: 30, desc: 'Cesta de frutos da estação (rende 3 refeições)' },
  arroz: { porcoes: 10, saciedade: 45, desc: 'Saco de arroz/grãos colhidos da horta (rende 10 refeições)' },
  carne: { porcoes: 4, saciedade: 50, desc: 'Carne caçada (rende 4 refeições)' },
  leite: { porcoes: 2, saciedade: 25, desc: 'Leite fresco do curral (rende 2 porções)' }
};

// Carrega ou inicializa o estado do Modelo 1
function carregarEstadoM1() {
  const p = path.join(__dirname, 'estado-modelo1.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {}
  }
  // Base inicial importada do estado-ilha
  const baseOriginal = JSON.parse(fs.readFileSync(path.join(__dirname, 'estado-ilha.json'), 'utf8'));
  const est = JSON.parse(JSON.stringify(baseOriginal));

  // Inicializa despensa comunitária e despensas individuais
  est.mundo.despensaComunitaria = {
    peixe: 4,
    frutas: 6,
    arroz: 1,
    agua: 20,
    madeira: 18,
    pedra: 8,
    capacidadeMax: 80
  };

  est.mundo.construcoes = est.mundo.construcoes || [
    { id: 'cabana_icaro', tipo: 'cabana', nome: 'Cabana do Ícaro e Lara', local: 'casa_icaro', x: 0.22, y: 0.48 },
    { id: 'cabana_joao', tipo: 'cabana', nome: 'Abrigo do João e Maria', local: 'casa_joao', x: 0.46, y: 0.24 },
    { id: 'fogueira_central', tipo: 'fogueira', nome: 'Fogueira Central', local: 'fogueira', x: 0.50, y: 0.52 }
  ];

  est.mundo.visitantes = est.mundo.visitantes || [];

  // Configura despensa nas cabanas dos seres
  Object.values(est.seres).forEach(s => {
    s.despensa = s.despensa || { peixe: 2, frutas: 3, agua: 5, refeicoesDisponiveis: 13 };
    s.inventario = s.inventario || { alimento: 1, agua: 2, madeira: 2, pedra: 1 };
  });

  fs.writeFileSync(p, JSON.stringify(est, null, 2), 'utf8');
  return est;
}

function salvarEstadoM1(estado) {
  const p = path.join(__dirname, 'estado-modelo1.json');
  fs.writeFileSync(p, JSON.stringify(estado, null, 2), 'utf8');
}

// Calcula total de refeições guardadas por um personagem
function calcularRefeicoesTotais(ser, despensaComum) {
  const d = ser.despensa || {};
  let total = (d.refeicoesDisponiveis || 0);
  total += (d.peixe || 0) * VALOR_ALIMENTAR.peixe.porcoes;
  total += (d.frutas || 0) * VALOR_ALIMENTAR.frutas.porcoes;
  total += (d.arroz || 0) * VALOR_ALIMENTAR.arroz.porcoes;
  total += (d.carne || 0) * VALOR_ALIMENTAR.carne.porcoes;
  return total;
}

// Cardápio de Ações Especializado no Modelo 1
function acoesM1(estado, ser) {
  const base = [];
  const refeicoes = calcularRefeicoesTotais(ser, estado.mundo.despensaComunitaria);
  const temFartura = refeicoes >= 6; // 3 ou mais dias de comida (2 refeições/dia)
  const naCasa = (ser.local === ser.casa || ser.local.startsWith('casa_'));
  const noAcampamento = (ser.local === 'acampamento' || ser.local === 'fogueira');
  const outrosNoLocal = Object.values(estado.seres).filter(o => o.id !== ser.id && o.status !== 'morto' && o.local === ser.local);
  const temOutro = outrosNoLocal.length > 0;

  // Ações de Movimento
  for (const no of espaco.locais()) {
    if (no === ser.local) continue;
    base.push({ id: 'ir_' + no, descricao: 'Caminhar até ' + espaco.nome(no) });
  }

  // GESTÃO DE ESTOQUE E DESPENSA:
  if (naCasa || noAcampamento) {
    if ((ser.inventario.alimento || 0) > 0 || (ser.inventario.agua || 0) > 0) {
      base.push({ id: 'guardar_mantimentos', descricao: 'Guardar peixes, frutas e mantimentos colhidos no baú da despensa' });
    }
    if (refeicoes > 0) {
      base.push({ id: 'pegar_refeicao_despensa', descricao: 'Pegar uma refeição preparada na despensa e se alimentar com calma' });
    }
  }

  // TEMPO LIVRE & ÓCIO HUMANO (Disponíveis sempre, mas com alto apelo quando há estoque):
  base.push({ id: 'apenas_contemplar', descricao: 'Apenas contemplar: sentar em silêncio e olhar a paisagem, o mar ou o vento (o ócio da mente humana)' });
  base.push({ id: 'pensar_sobre_a_vida', descricao: 'Refletir sobre a vida, seus sentimentos, propósito e existência' });

  if (ser.local === 'fogueira' || naCasa) {
    base.push({ id: 'socializar_na_fogueira', descricao: 'Conversar amenidades, rir e passar o tempo junto dos amigos' });
    if (temOutro) {
      base.push({ id: 'contar_historias', descricao: 'Contar histórias antigas, lendas e partilhar memórias ao redor do fogo' });
    }
  }

  base.push({ id: 'explorar_por_prazer', descricao: 'Caminhar pelas margens e bosques sem obrigação de colheita, apenas pelo prazer de passear' });
  base.push({ id: 'treinar_habilidades', descricao: 'Treinar artesanato, carpintaria ou técnicas de mira nas horas vagas' });

  // CONSTRUÇÃO E EXPANSÃO DA VILA (Longo Prazo):
  const despCom = estado.mundo.despensaComunitaria;
  const madeiraDisp = (ser.inventario.madeira || 0) + (despCom.madeira || 0);
  const pedraDisp = (ser.inventario.pedra || 0) + (despCom.pedra || 0);

  if (madeiraDisp >= 20 && pedraDisp >= 10 && (noAcampamento || ser.local === 'arena')) {
    base.push({ id: 'construir_nova_cabana', descricao: 'Construir Nova Cabana de Madeira e Pedra para expandir a vila (Gasta 20 Madeira, 10 Pedra)' });
  }
  if (madeiraDisp >= 15 && pedraDisp >= 8 && ser.local === 'fazenda') {
    base.push({ id: 'melhorar_celeiro', descricao: 'Melhorar Celeiro e Silo de Grãos da Fazenda (Gasta 15 Madeira, 8 Pedra)' });
  }
  if (pedraDisp >= 25 && madeiraDisp >= 10 && noAcampamento) {
    base.push({ id: 'construir_muralha', descricao: 'Erguer Muralha Protetora de Pedra ao redor do Acampamento (Gasta 25 Pedra, 10 Madeira)' });
  }

  // TRABALHO E COLETA (Necessários apenas se quiser acumular ou suprir escassez):
  if (ser.local === 'mar' || ser.local === 'barco') {
    base.push({ id: 'pescar_mar', descricao: 'Pescar peixes no mar para estocar na despensa' });
  }
  if (ser.local === 'rio') {
    base.push({ id: 'coletar_agua', descricao: 'Encher baldes de água para abastecer a despensa da vila' });
  }
  if (ser.local === 'bosque') {
    base.push({ id: 'colher_frutas', descricao: 'Colher cestas de frutas para armazenar na despensa' });
  }
  if (ser.local === 'floresta') {
    base.push({ id: 'coletar_madeira', descricao: 'Cortar toras de madeira para obras e cabanas' });
  }
  if (ser.local === 'caverna' || ser.local === 'cachoeira') {
    base.push({ id: 'coletar_pedra', descricao: 'Minerar blocos de pedra resistente para as construções da vila' });
  }

  // Ações básicas de sobrevivência imediata
  base.push({ id: 'descansar', descricao: 'Descansar e recuperar o fôlego' });
  base.push({ id: 'banho', descricao: 'Tomar um banho relaxante' });

  return base;
}

// Execução de ação no Modelo 1
function executarAcaoM1(estado, ser, acaoId) {
  const despCom = estado.mundo.despensaComunitaria;
  const serDesp = ser.despensa;
  let logTexto = '';

  if (acaoId.startsWith('ir_')) {
    const destino = acaoId.replace('ir_', '');
    ser.local = destino;
    ser.deslocamento = null;
    logTexto = `${ser.nome} caminhou com calma até ${espaco.nome(destino)}.`;
  } else if (acaoId === 'guardar_mantimentos') {
    const qtdAlimento = ser.inventario.alimento || 0;
    const qtdAgua = ser.inventario.agua || 0;
    const qtdMadeira = ser.inventario.madeira || 0;
    const qtdPedra = ser.inventario.pedra || 0;

    serDesp.peixe = (serDesp.peixe || 0) + qtdAlimento;
    serDesp.agua = (serDesp.agua || 0) + qtdAgua;
    despCom.madeira = (despCom.madeira || 0) + qtdMadeira;
    despCom.pedra = (despCom.pedra || 0) + qtdPedra;

    ser.inventario.alimento = 0;
    ser.inventario.agua = 0;
    ser.inventario.madeira = 0;
    ser.inventario.pedra = 0;
    serDesp.refeicoesDisponiveis = calcularRefeicoesTotais(ser, despCom);

    ser.necessidades.satisfacao = Math.min(100, (ser.necessidades.satisfacao || 50) + 20);
    ser.necessidades.seguranca = Math.min(100, (ser.necessidades.seguranca || 50) + 15);
    logTexto = `${ser.nome} guardou todos os mantimentos no baú da despensa. Estoque agora garante ${serDesp.refeicoesDisponiveis} refeições!`;
  } else if (acaoId === 'pegar_refeicao_despensa') {
    if ((serDesp.peixe || 0) > 0) serDesp.peixe--;
    else if ((serDesp.frutas || 0) > 0) serDesp.frutas--;
    ser.necessidades.alimento = Math.max(0, (ser.necessidades.alimento || 20) - 45);
    ser.necessidades.agua = Math.max(0, (ser.necessidades.agua || 20) - 30);
    ser.necessidades.satisfacao = Math.min(100, (ser.necessidades.satisfacao || 50) + 18);
    serDesp.refeicoesDisponiveis = calcularRefeicoesTotais(ser, despCom);
    logTexto = `${ser.nome} desfrutou de uma refeição nutritiva tirada com fartura de sua despensa.`;
  } else if (acaoId === 'apenas_contemplar') {
    ser.necessidades.satisfacao = Math.min(100, (ser.necessidades.satisfacao || 50) + 25);
    ser.necessidades.energia = Math.min(100, (ser.necessidades.energia || 50) + 15);
    ser.necessidades.curiosidade = Math.min(100, (ser.necessidades.curiosidade || 50) + 20);
    ser.necessidades.medo = Math.max(0, (ser.necessidades.medo || 0) - 20);
    logTexto = `${ser.nome} sentou-se sem pressa, em puro ócio humano, apenas contemplando o horizonte e sentindo a brisa suave.`;
  } else if (acaoId === 'socializar_na_fogueira') {
    ser.necessidades.pertencimento = Math.min(100, (ser.necessidades.pertencimento || 50) + 25);
    ser.necessidades.solidao = Math.max(0, (ser.necessidades.solidao || 0) - 30);
    ser.necessidades.satisfacao = Math.min(100, (ser.necessidades.satisfacao || 50) + 15);
    logTexto = `${ser.nome} passou momentos agradáveis rindo e jogando conversa fora com os amigos ao redor da fogueira.`;
  } else if (acaoId === 'contar_historias') {
    ser.necessidades.pertencimento = Math.min(100, (ser.necessidades.pertencimento || 50) + 20);
    ser.necessidades.curiosidade = Math.min(100, (ser.necessidades.curiosidade || 50) + 25);
    logTexto = `${ser.nome} reuniu os presentes e contou histórias instigantes sobre a terra e as estrelas.`;
  } else if (acaoId === 'pescar_mar') {
    const qtd = Math.floor(Math.random() * 3) + 2;
    ser.inventario.alimento = (ser.inventario.alimento || 0) + qtd;
    logTexto = `${ser.nome} pescou ${qtd} belos peixes no mar para levar à despensa da vila.`;
  } else if (acaoId === 'coletar_madeira') {
    const qtd = Math.floor(Math.random() * 4) + 3;
    ser.inventario.madeira = (ser.inventario.madeira || 0) + qtd;
    logTexto = `${ser.nome} cortou e empilhou ${qtd} toras de madeira para as futuras construções.`;
  } else if (acaoId === 'coletar_pedra') {
    const qtd = Math.floor(Math.random() * 3) + 2;
    ser.inventario.pedra = (ser.inventario.pedra || 0) + qtd;
    logTexto = `${ser.nome} talhou ${qtd} blocos de pedra resistente para erguer muralhas e novas cabanas.`;
  } else if (acaoId === 'construir_nova_cabana') {
    // Desconta recursos da despensa comunitária e inventário
    despCom.madeira = Math.max(0, (despCom.madeira || 0) - 20);
    despCom.pedra = Math.max(0, (despCom.pedra || 0) - 10);
    const num = estado.mundo.construcoes.filter(c => c.tipo === 'cabana').length + 1;
    const novaCabana = {
      id: 'cabana_nova_' + num,
      tipo: 'cabana',
      nome: 'Nova Cabana Colonial ' + num,
      local: ser.local,
      x: 0.38 + (num * 0.08),
      y: 0.46,
      criador: ser.nome,
      ciclo: estado.mundo.tempo.ciclo
    };
    estado.mundo.construcoes.push(novaCabana);
    ser.necessidades.satisfacao = 100;
    logTexto = `🏛️ MARCO DA VILA! ${ser.nome} ergueu uma Nova Cabana Colonial! A vila agora possui espaço para receber novos habitantes!`;
  } else if (acaoId === 'melhorar_celeiro') {
    despCom.madeira = Math.max(0, (despCom.madeira || 0) - 15);
    despCom.pedra = Math.max(0, (despCom.pedra || 0) - 8);
    despCom.capacidadeMax = (despCom.capacidadeMax || 80) + 60;
    logTexto = `🌾 ${ser.nome} expandiu o Celeiro Comunitário da Fazenda! Capacidade aumentada para ${despCom.capacidadeMax} mantimentos.`;
  } else if (acaoId === 'construir_muralha') {
    despCom.pedra = Math.max(0, (despCom.pedra || 0) - 25);
    despCom.madeira = Math.max(0, (despCom.madeira || 0) - 10);
    estado.mundo.muralha = (estado.mundo.muralha || 0) + 1;
    estado.mundo.segurancaGeral = (estado.mundo.segurancaGeral || 50) + 30;
    logTexto = `🛡️ ${ser.nome} construiu uma sólida muralha de pedra ao redor do acampamento, afastando predadores e vendavais!`;
  } else {
    logTexto = `${ser.nome} realizou a ação: ${acaoId}.`;
  }

  ser.ultimaAcao = acaoId;
  ser.ultimoLogM1 = logTexto;
  return { ok: true, mensagem: logTexto };
}

// Evento de Visitante Chegando de Barco
function gerarVisitanteNáufrago(estado) {
  const nomes = ['Gael', 'Luna', 'Caelum', 'Maya', 'Bóris'];
  const nomeEscolhido = nomes[Math.floor(Math.random() * nomes.length)];
  const novoVisitante = {
    id: 'npc_' + Date.now(),
    nome: nomeEscolhido,
    origem: 'Náufrago do Arquipélago Sul',
    motivo: 'A embarcação afundou no arrecife; pede abrigo e promete ajudar na carpintaria e lavoura.',
    status: 'pendente_aprovacao',
    local: 'mar'
  };
  estado.mundo.visitantes.push(novoVisitante);
  return novoVisitante;
}

module.exports = {
  carregarEstadoM1,
  salvarEstadoM1,
  calcularRefeicoesTotais,
  acoesM1,
  executarAcaoM1,
  gerarVisitanteNáufrago,
  VALOR_ALIMENTAR
};

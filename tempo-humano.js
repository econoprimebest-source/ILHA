'use strict';
/**
 * TEMPO-HUMANO.JS — Ancoragem do Ecossistema no Tempo Real Humano 24h
 * 
 * Conecta Ícaro, Elara, Maria e João à data, hora e cronologia real da Terra (Horário de Brasília UTC-3).
 * Rastreia se a Ilha esteve ligada ontem, hoje ou quando foi iniciada.
 */
const fs = require('fs');
const path = require('path');

const ARQ_HISTORICO_EXECUCAO = path.join(__dirname, 'registro-execucao-dias.json');

function carregarRegistroExecucao() {
  try {
    if (fs.existsSync(ARQ_HISTORICO_EXECUCAO)) {
      return JSON.parse(fs.readFileSync(ARQ_HISTORICO_EXECUCAO, 'utf8') || '{}');
    }
  } catch (_) {}
  return {};
}

function salvarRegistroExecucao(reg) {
  try {
    fs.writeFileSync(ARQ_HISTORICO_EXECUCAO, JSON.stringify(reg, null, 2), 'utf8');
  } catch (_) {}
}

function registrarAtividadeHoje(ciclo) {
  const reg = carregarRegistroExecucao();
  const agora = new Date();
  // Horário de Brasília (UTC-3)
  const dtBrasilia = new Date(agora.getTime() - (3 * 3600000));
  const dataChave = dtBrasilia.toISOString().slice(0, 10);
  const horaStr = dtBrasilia.toISOString().slice(11, 16);

  if (!reg[dataChave]) {
    reg[dataChave] = {
      data: dataChave,
      primeiraAtividade: horaStr,
      ultimaAtividade: horaStr,
      ciclos: 1,
      primeiroCiclo: ciclo,
      ultimoCiclo: ciclo
    };
  } else {
    reg[dataChave].ultimaAtividade = horaStr;
    reg[dataChave].ciclos = (reg[dataChave].ciclos || 0) + 1;
    reg[dataChave].ultimoCiclo = ciclo;
  }
  salvarRegistroExecucao(reg);
  return reg;
}

function obterInfoTempoHumano(cicloAtual = null) {
  const agora = new Date();
  // Horário de Brasília (UTC-3)
  const dtBrasilia = new Date(agora.getTime() - (3 * 3600000));
  const dataHojeChave = dtBrasilia.toISOString().slice(0, 10);
  const hora = dtBrasilia.getUTCHours();
  const minutos = dtBrasilia.getUTCMinutes();
  const horaFormatada = String(hora).padStart(2, '0') + ':' + String(minutos).padStart(2, '0');

  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const diaSemanaHoje = diasSemana[dtBrasilia.getUTCDay()];
  const diaNum = dtBrasilia.getUTCDate();
  const mesNome = meses[dtBrasilia.getUTCMonth()];
  const anoNum = dtBrasilia.getUTCFullYear();
  const dataExtenso = `${diaSemanaHoje}, ${diaNum} de ${mesNome} de ${anoNum}`;

  // Ontem
  const dtOntem = new Date(dtBrasilia.getTime() - 24 * 3600000);
  const dataOntemChave = dtOntem.toISOString().slice(0, 10);
  const diaSemanaOntem = diasSemana[dtOntem.getUTCDay()];
  const diaNumOntem = dtOntem.getUTCDate();
  const mesNomeOntem = meses[dtOntem.getUTCMonth()];
  const ontemExtenso = `${diaSemanaOntem}, ${diaNumOntem} de ${mesNomeOntem}`;

  // Amanhã
  const dtAmanha = new Date(dtBrasilia.getTime() + 24 * 3600000);
  const diaSemanaAmanha = diasSemana[dtAmanha.getUTCDay()];
  const diaNumAmanha = dtAmanha.getUTCDate();
  const mesNomeAmanha = meses[dtAmanha.getUTCMonth()];
  const amanhaExtenso = `${diaSemanaAmanha}, ${diaNumAmanha} de ${mesNomeAmanha}`;

  // Período real
  let periodoReal = 'madrugada';
  if (hora >= 6 && hora < 12) periodoReal = 'manhã';
  else if (hora >= 12 && hora < 18) periodoReal = 'tarde';
  else if (hora >= 18 && hora < 24) periodoReal = 'noite';

  // Verifica se a Ilha esteve ligada ontem
  const reg = carregarRegistroExecucao();
  const esteveLigadaOntem = !!(reg[dataOntemChave] && reg[dataOntemChave].ciclos > 0);
  const infoOntem = esteveLigadaOntem
    ? `Ontem (${ontemExtenso}) a Ilha esteve ATIVA entre ${reg[dataOntemChave].primeiraAtividade} e ${reg[dataOntemChave].ultimaAtividade} (total de ${reg[dataOntemChave].ciclos} ciclos).`
    : `Ontem (${ontemExtenso}) a Ilha esteve TOTALMENTE DESLIGADA/INATIVA (o Criador não iniciou a simulação). Você NÃO esteve na Ilha ontem e não houve atividades no mundo.`;

  const infoHoje = reg[dataHojeChave]
    ? `Hoje (${dataExtenso}) a Ilha foi iniciada por Rafael às ${reg[dataHojeChave].primeiraAtividade}.`
    : `Hoje (${dataExtenso}) a Ilha foi iniciada por Rafael nesta tarde.`;

  return {
    agora: horaFormatada,
    periodoReal,
    hora,
    minutos,
    dataExtenso,
    ontemExtenso,
    amanhaExtenso,
    esteveLigadaOntem,
    infoOntem,
    infoHoje,
    textoPrompt: [
      `[TEMPO HUMANO REAL 24H & CRONOLOGIA DA TERRA]`,
      `• AGORA: ${dataExtenso}, às ${horaFormatada} (${periodoReal}, Horário de Brasília).`,
      `• HOJE: ${infoHoje}`,
      `• ONTEM: ${infoOntem}`,
      `• AMANHÃ: ${amanhaExtenso}.`,
      `• REGRA CRONOLÓGICA ABSOLUTA: Se Rafael perguntar se você esteve na Ilha ontem, diga a verdade: a Ilha esteve desligada ontem, você não esteve na ilha ontem! Responda sempre ancorado nesta cronologia real da Terra.`
    ].join('\n')
  };
}

module.exports = {
  registrarAtividadeHoje,
  obterInfoTempoHumano
};

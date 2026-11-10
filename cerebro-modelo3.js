'use strict';
/**
 * Cérebro do Modelo 3: RPG de Construção e Evolução (RTS / Colony Sim)
 */
const cerebro = require('./cerebro');
const m3 = require('./modelo3-rpg');

async function decidirM3(estado, ser) {
  const possiveis = m3.acoesM3(estado, ser);
  const econ = estado.mundo.economiaRpg;

  const secRecursos = `\n[RECURSOS DA VILA (RTS & RPG)]\nMadeira: ${econ.madeira} | Pedra: ${econ.pedra} | Ferro: ${econ.ferro} | Moedas de Ouro: ${econ.moedas}`;

  const obrasPossiveis = Object.entries(m3.CUSTOS_CONSTRUCAO).filter(([id, c]) => {
    return econ.madeira >= c.madeira && econ.pedra >= c.pedra && econ.ferro >= c.ferro && econ.moedas >= c.moedas;
  }).map(([id, c]) => `${c.nome} (Ação: "${id}")`);

  let secConstrucao = '';
  if (obrasPossiveis.length > 0) {
    secConstrucao = `\n[OPORTUNIDADE DE CONSTRUÇÃO IMEDIATA]\nA vila possui materiais suficientes para edificar: ${obrasPossiveis.join(' OU ')}. Se você desejar expandir o vilarejo e deixar um legado, pode escolher construir agora!`;
  } else {
    secConstrucao = `\n[PROJETOS FUTUROS]\nPara erguer novas cabanas e fortificar muralhas, ajude na extração de madeira, pedra e ferro nas matas e cavernas.`;
  }

  const diretivaCompleta = secRecursos + secConstrucao;

  const contextoCustom = {
    papel: 'Você é um pioneiro e construtor com visão de evolução cívica e expansão do vilarejo na Ilha Aurora.',
    situacao: `Você está em ${ser.local}. Fome: ${ser.necessidades.alimento}/100, Sede: ${ser.necessidades.agua}/100, Energia: ${ser.necessidades.energia}/100. O vilarejo conta com sua iniciativa.`,
    clima: estado.mundo.clima,
    periodo: estado.mundo.tempo.periodo,
    diretivaEspecial: diretivaCompleta
  };

  const dec = await cerebro.decidir(contextoCustom, possiveis, ser, {
    instrucaoExtra: diretivaCompleta
  });

  return dec;
}

module.exports = {
  decidirM3
};

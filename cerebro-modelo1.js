'use strict';
/**
 * Cérebro do Modelo 1: Economia de Estoque, Despensa e Tempo Livre
 */
const cerebro = require('./cerebro');
const m1 = require('./modelo1-estoque');

async function decidirM1(estado, ser) {
  const possiveis = m1.acoesM1(estado, ser);
  const refeicoes = m1.calcularRefeicoesTotais(ser, estado.mundo.despensaComunitaria);
  const despCom = estado.mundo.despensaComunitaria;

  let diretivaEstoque = '';
  if (refeicoes >= 6) {
    diretivaEstoque = `\n[DESPENSA ABASTECIDA — TEMPO LIVRE GARANTIDO]\nSua despensa tem mantimentos garantidos para ${Math.floor(refeicoes / 2)} dias (${refeicoes} refeições prontas). Você NÃO precisa caçar, pescar ou coletar comida hoje! Você tem o privilégio humano do TEMPO LIVRE: priorize descansar, sentar para apenas contemplar a natureza, prosear com amigos na fogueira ou planejar melhorias na vila.`;
  } else {
    diretivaEstoque = `\n[ESTADO DA DESPENSA]\nVocê tem ${refeicoes} refeições na despensa. Se puder, quando tiver fartura, guarde mantimentos para garantir dias de folga e tranquilidade para você e seus amigos.`;
  }

  const statusVila = `\n[RECURSOS DA VILA]\nMadeira estocada: ${despCom.madeira || 0} | Pedra estocada: ${despCom.pedra || 0} | Comida comunitária: ${despCom.peixe || 0} peixes, ${despCom.frutas || 0} cestas.`;

  const contextoCustom = {
    papel: 'Você é um habitante livre da Ilha Aurora vivenciando uma economia comunitária e de estoque.',
    situacao: `Você está em ${ser.local}. Fome: ${ser.necessidades.alimento}/100, Sede: ${ser.necessidades.agua}/100, Energia: ${ser.necessidades.energia}/100, Segurança: ${ser.necessidades.seguranca}/100.`,
    clima: estado.mundo.clima,
    periodo: estado.mundo.tempo.periodo,
    diretivaEspecial: diretivaEstoque + statusVila
  };

  const dec = await cerebro.decidir(contextoCustom, possiveis, ser, {
    instrucaoExtra: diretivaEstoque
  });

  return dec;
}

module.exports = {
  decidirM1
};

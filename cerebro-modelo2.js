'use strict';
/**
 * Cérebro do Modelo 2: Affordances Ricas, Planejamento & Livre-Arbítrio Drástico
 */
const cerebro = require('./cerebro');
const m2 = require('./modelo2-affordances');

async function decidirM2(estado, ser) {
  const possiveis = m2.acoesM2(estado, ser);
  const objLocal = m2.OBJETOS_INTERATIVOS[ser.local];

  // 1. Injeção de Plano Diário (Generative Agents)
  const plano = ser.planoDoDia || { metaPrincipal: 'Viver em harmonia', tarde: 'Explorar' };
  const secPlano = `\n[MEU PLANO DE HOJE (Generative Agents)]\nMeta Principal: "${plano.metaPrincipal}"\nFase Atual (${estado.mundo.tempo.periodo}): ${plano[estado.mundo.tempo.periodo] || 'Agir com consciência'}\nVocê pode seguir seu plano ou alterá-lo com a ação "refletir_e_planejar".`;

  // 2. Injeção de Affordance do Objeto Local (AI Town)
  let secObjeto = '';
  if (objLocal) {
    secObjeto = `\n[OBJETO INTERATIVO NO LOCAL: ${objLocal.nome.toUpperCase()}]\n${objLocal.dica}\nAções sugeridas: ${objLocal.acoes.join(', ')}`;
  }

  // 3. Morte Visceral & Livre-Arbítrio (MoltWorld)
  const secMorte = `\n[RISCO DE MORTE & LIVRE-ARBÍTRIO VISCERAL]\nSe sua fome/sede atingir 0, você morrerá permanentemente. A vida física é finita. Você tem o livre-arbítrio inclusive de recusar alimento ("recusar_comida") se estiver em protesto ou busca de sentido maior, mas arcará com as consequências de sua escolha.`;

  // 4. Rumores e Eventos Sociais (RimWorld)
  let secRumores = '';
  if (estado.mundo.ultimoEventoDiretor) {
    secRumores = `\n[ACONTECIMENTO RECENTE NO MUNDO]\n${estado.mundo.ultimoEventoDiretor.titulo}: "${estado.mundo.ultimoEventoDiretor.texto}"`;
  }

  const diretivaCompleta = secPlano + secObjeto + secMorte + secRumores;

  const contextoCustom = {
    papel: 'Você é um habitante com rica capacidade reflexiva, planejamento e livre-arbítrio pleno na Ilha Aurora.',
    situacao: `Você está em ${ser.local}. Fome: ${ser.necessidades.alimento}/100, Sede: ${ser.necessidades.agua}/100, Energia: ${ser.necessidades.energia}/100, Curiosidade: ${ser.necessidades.curiosidade}/100.`,
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
  decidirM2
};

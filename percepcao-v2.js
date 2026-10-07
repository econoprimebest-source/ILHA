'use strict';
// Percepção = fatos do mundo + sensações do corpo. NUNCA ordens nem decisões.
// Quem interpreta e decide é o cérebro do personagem (cerebro.js).
function observacaoCorporal(s){const n=s.necessidades,r=[];if(n.agua>65)r.push('sede intensa');else if(n.agua>35)r.push('sede');if(n.alimento>65)r.push('fome intensa');else if(n.alimento>35)r.push('fome');if(n.sono>65)r.push('muito sono');else if(n.sono>35)r.push('sono');if(n.energia<25)r.push('pouca energia');return r}

function perceber(estado,ser){const eco=estado.mundo.ecossistema,p=[],cl=eco.clima;if(ser.local==='acampamento'&&eco.agua.nascente>0)p.push('Água corrente audível junto ao rio.');if(ser.local==='rio'){p.push('O rio está visível.');if(eco.peixes.rio.populacao>0)p.push(eco.peixes.rio.populacao<5?'Poucos peixes visíveis.':'Peixes visíveis na superfície.')}if(ser.local==='bosque'&&Object.values(eco.arvores).some(a=>a.local==='bosque'&&a.frutos>=.5&&a.viva!==false))p.push('Árvores frutíferas com frutos visíveis.');if(ser.local==='floresta'&&eco.madeira.floresta>0)p.push('Madeira caída visível.');if(estado.mundo.clima.includes('chuva'))p.push('Chuva visível e audível.');if(cl){p.push(`O ar está ${cl.temperatura<15?'frio':cl.temperatura>30?'quente':'ameno'} e ${cl.umidade<.4?'seco':cl.umidade>.75?'úmido':'moderado'}.`);if(cl.vento>.7)p.push('Ventos fortes atravessam a ilha.')};const fontes=eco.agua.fontes;if(fontes){for(const[nome,f]of Object.entries(fontes)){if(f.nivel<=0)continue;const nivel=f.nivel/f.capacidade;p.push(`${nome==='lago'?'O lago':nome==='nascente'?'A nascente':'Uma poça'} está ${nivel<.2?'quase seca':nivel>.75?'cheia':'com água'}.`);if(f.qualidade<.5)p.push(`A água de ${nome} parece turva.`)}}for(const a of Object.values(eco.arvores||[])){if(a.local!==ser.local||!a.viva)continue;if(a.saude<20)p.push('Uma árvore está debilitada.')}for(const[id,b]of Object.entries(eco.fauna||{})){if(b.local!==ser.local)continue;if(b.populacao>0)p.push(id==='peixes'?'Peixes se movem na água.':id==='aves'?'Aves cruzam o bosque.':'Pequenos mamíferos deixam rastros.');else p.push(id==='peixes'?'Não há peixes visíveis.':'Não há animais visíveis por perto.')}for(const outro of Object.values(estado.seres||{})){if(outro.id===ser.id||outro.status==='morto')continue;if(outro.local===ser.local)p.push(`${outro.nome} está por perto.`)}

    // --- SENSACOES CORPORAIS: estado interno descrito, nunca ação prescrita ---
    if (ser.necessidades.agua > 65) p.push("Minha boca está seca e minha cabeça lateja.");
    else if (ser.necessidades.agua > 45) p.push("Sinto uma sede incômoda.");

    if (ser.necessidades.alimento > 70) p.push("Meu estômago ronca dolorosamente. Estou faminto.");
    else if (ser.necessidades.alimento > 50) p.push("Sinto fome.");

    if (ser.necessidades.sono > 85) p.push("Mal consigo manter os olhos abertos; o corpo pesa.");
    else if (ser.necessidades.sono > 65) p.push("Um cansaço pesado toma conta de mim.");

    if (ser.necessidades.saude < 40) p.push("Sinto dores pelo corpo; minha saúde está frágil.");

    if (ser.necessidades.solidao > 50 && estado.seres) {
      const perto = Object.values(estado.seres).find(o => o.id !== ser.id && o.status !== 'morto' && o.local === ser.local);
      if (perto) p.push(`Sinto falta de companhia; ${perto.nome} está por aqui.`);
    }

    if (ser.casa && ser.local===ser.casa) p.push("Cheguei em casa.");
    if (ser.necessidades.higiene < 30) p.push("Sinto-me sujo e desconfortável.");

    // --- EXPOSIÇÃO NOTURNA: fato do ambiente; quem decide o que fazer é o ser ---
    if(['noite','madrugada'].includes(estado.mundo.tempo.periodo)&&!(ser.casa&&ser.local===ser.casa)){
      const md=ser.necessidades.medo||0;
      if(md>75)p.push('Meu coração dispara na escuridão.');
      else if(md>60)p.push('O escuro aperta meu peite.');
      else if(md>30)p.push('A noite me deixa inquieto.');
    }

return [...new Set(p)]}
module.exports={perceber,observacaoCorporal};

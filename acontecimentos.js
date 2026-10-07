'use strict';
// ACONTECIMENTOS DO MUNDO — infraestrutura genérica de eventos (Nova Fase).
// O mundo cria situações COM DURAÇÃO em regiões; quem interpreta e decide é
// o cérebro. Nada aqui decide por personagem; nada aqui teleporta ninguém.
// Ativação: {acontecimentos:true} na rodada (default OFF — regressão determinística).
// Origem: 'mundo' (geração) ou 'espectador' (Fase D — mesma estrutura, depois).
const espaco=require('./espaco');
const PISTAS={
	tempestade:['O céu escurece e trovões rolam ao longe.','Vento forte dobra as árvores da região.'],
	predador:['Rugidos abafados ecoam pela região.','Pegadas grandes e frescas cortam o caminho.']
};
let contador=0;
function novo(tipo,locais,duracao,extra={}){
	return {id:tipo[0]+'-'+(++contador)+'-'+(locais[0]||'x'),tipo,origem:'mundo',locais:[...locais],inicio:0,duracao,idade:0,ativo:true,pistas:PISTAS[tipo]||[],...extra};
}
// Geração determinística — só com a flag ligada; nunca duas do mesmo tipo ativas.
function gerar(estado){
	const m=estado.mundo;
	const ativos=Array.isArray(m.acontecimentos)?m.acontecimentos.filter(a=>a.ativo!==false):[];
	m.acontecimentos=ativos;
	const c=m.tempo.ciclo;
	const z=((c*9301+17)%997)/997;
	const locais=espaco.locais();
	const regiao=no=>[no,...espaco.vizinhosDe(no)];
	if(z<0.10&&!ativos.some(a=>a.tipo==='tempestade')&&['chuvas','transicao_umida'].includes(m.tempo.estacao)){
		ativos.push(novo('tempestade',regiao(locais[(c*31)%locais.length]),3+((c>>2)%4),{efeitoClima:'chuva_forte',vento:.9}));
	}
	if(z>=0.45&&z<0.56&&!ativos.some(a=>a.tipo==='predador')){
		const foco=['bosque','floresta','fazenda'];
		const no0=foco[(c*13)%foco.length];
		ativos.push(novo('predador',regiao(no0),4+(c%4),{ataque:true,movel:true,no:no0}));
	}
}
// Consequências físicas + ciclo de vida. Roda TODA rodada (mesmo com a flag
// desligada: eventos injetados — ex.: do espectador — continuam válidos).
function aplicar(estado){
	const m=estado.mundo,cons=[];
	if(!Array.isArray(m.acontecimentos)||!m.acontecimentos.length)return cons;
	const c=m.tempo.ciclo;
	for(const a of m.acontecimentos){
		if(a.ativo===false)continue;
		a.idade=(a.idade||0)+1;
		if(a.idade>a.duracao){a.ativo=false;cons.push({tipo:'acontecimento',fase:'terminou',evento:a.tipo,locais:a.locais});continue}
		if(a.idade===1){a.inicio=c;cons.push({tipo:'acontecimento',fase:'comecou',evento:a.tipo,locais:a.locais})}
		// Eventos antigos ganham o nó inicial (para exibição); só se movem
		// nasceram móveis — injetados/legados permanecem na própria região.
		if(a.tipo==='predador'&&!a.no)a.no=a.locais[0];
		// PREDADOR MÓVEL: a cada ciclo caminha por uma trilha vizinha (ou para
		// onde está); a região de ataque e as pistas acompanham o deslocamento.
		if(a.tipo==='predador'&&a.movel&&a.no){
			const viz=espaco.vizinhosDe(a.no)||[];
			if(viz.length){
				const h=[...a.id].reduce((x,ch)=>x*31+ch.charCodeAt(0),c*7+13);
				if(Math.abs(h)%10<6){
					a.noAnterior=a.no;
					a.no=viz[Math.abs(h>>3)%viz.length];
					a.locais=[a.no,...espaco.vizinhosDe(a.no)];
					cons.push({tipo:'acontecimento',fase:'mudou',evento:'predador',locais:[...a.locais]});
				}
			}
		}
		if(a.tipo==='predador'&&a.ataque){
			// O ATAQUE acontece SÓ no nó exato onde o predador está (visível no
			// mapa); a região inteira continua espalhando apenas PISTAS (rugidos,
			// pegadas). Assim quem segue os avisos e evita o nó escapa — a região
			// de 5 nós derrubava personagens sem que estivessem junto do bicho.
			for(const ser of Object.values(estado.seres)){
				if(ser.status==='morto'||ser.local!==a.no)continue;
				const h=[...ser.id].reduce((x,ch)=>x*31+ch.charCodeAt(0),7);
				const z=((c*7919+h)%997)/997;
				const dano=10+Math.floor(z*10);
				ser.necessidades.saude=Math.max(0,ser.necessidades.saude-dano);
				cons.push({tipo:'acontecimento',fase:'ataque',evento:'predador',serId:ser.id,nome:ser.nome,local:ser.local,dano});
			}
		}
	}
	m.acontecimentos=m.acontecimentos.filter(a=>a.ativo!==false);
	return cons;
}
// Efeito climático ativo — aplicado DEPOIS do calendário (que manda no resto).
function efeitos(estado){
	const t=(estado.mundo.acontecimentos||[]).find(a=>a.tipo==='tempestade');
	return t?{clima:t.efeitoClima||'chuva_forte',vento:t.vento??0.85}:null;
}
module.exports={gerar,aplicar,efeitos,PISTAS};

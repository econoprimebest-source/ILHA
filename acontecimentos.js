'use strict';
// ACONTECIMENTOS DO MUNDO — infraestrutura genérica de eventos (Nova Fase).
// O mundo cria situações COM DURAÇÃO em regiões; quem interpreta e decide é
// o cérebro. Nada aqui decide por personagem; nada aqui teleporta ninguém.
// Ativação: {acontecimentos:true} na rodada (default OFF — regressão determinística).
// Origem: 'mundo' (geração) ou 'espectador' (Fase D — mesma estrutura, depois).
const espaco=require('./espaco');
const PISTAS={
	tempestade:['O céu escurece e trovões rolam ao longe.','Vento forte dobra as árvores da região.'],
	predador:['Rugidos abafados ecoam pela região.','Pegadas grandes e frescas cortam o caminho.'],
	suprimento:['Uma caixa de madeira lacrada com paraquedas rasgado está caída no chão.','Há suprimentos novos dentro de uma caixa recém-chegada no local.'],
	artefato:['Um artefato metálico misterioso emite um brilho suave e um zumbido baixo no chão.','Símbolos estranhos pulsam em um objeto desconhecido deixado aqui.'],
	seca:['O calor escaldante racha a terra e evapora a água rapidamente.','O ar está extremamente seco e sufocante nesta região.'],
	cardume:['A água fervilha com um imenso cardume de peixes brilhantes e frutos maduros na margem.','Há uma abundância incomum de peixes e alimentos naturais neste local.']
};
let contador=0;
function novo(tipo,locais,duracao,extra={}){
	return {id:tipo[0]+'-'+(++contador)+'-'+(locais[0]||'x'),tipo,origem:extra.origem||'mundo',locais:[...locais],inicio:0,duracao,idade:0,ativo:true,pistas:extra.pistas||PISTAS[tipo]||[],...extra};
}
const ALIAS_TIPO={item:'suprimento',caixa:'suprimento',clima:'tempestade',chuva:'tempestade',evento:'artefato',misterio:'artefato',monstro:'predador',besta:'predador',peixes:'cardume'};
// Intervenção do Diretor / Audiência — manipula APENAS o mundo físico.
// Os personagens percebem as pistas quando estão na região e decidem livremente.
function intervir(estado,opcoes={}){
	const m=estado.mundo;
	m.acontecimentos=Array.isArray(m.acontecimentos)?m.acontecimentos.filter(a=>a&&a.ativo!==false):[];
	const tipoBruto=String(opcoes.tipo||'').toLowerCase().trim();
	const tipo=ALIAS_TIPO[tipoBruto]||tipoBruto;
	const no0=espaco.normalizar(opcoes.no||opcoes.local)||'acampamento';
	const duracao=Math.max(1,Math.min(30,Number(opcoes.duracao)||6));
	const origem=opcoes.origem==='diretor-llm'?'diretor-llm':'espectador';
	const patrocinador=typeof opcoes.patrocinador==='string'&&opcoes.patrocinador.trim()?opcoes.patrocinador.trim().slice(0,40):(origem==='diretor-llm'?'Diretor da Ilha':'Audiência');
	const msgBruta=opcoes.mensagem||opcoes.descricao||'';
	const mensagem=typeof msgBruta==='string'&&msgBruta.trim()?msgBruta.trim().slice(0,180):'';
	const raciocinio=typeof opcoes.raciocinio==='string'&&opcoes.raciocinio.trim()?opcoes.raciocinio.trim().slice(0,260):'';
	let ev;
	if(tipo==='suprimento'){
		const pistas=[...PISTAS.suprimento];
		if(mensagem)pistas.push('Há um detalhe na caixa de suprimentos: "'+mensagem+'" ('+patrocinador+').');
		ev=novo('suprimento',[no0],duracao,{origem,no:no0,patrocinador,mensagem,raciocinio,usosRestantes:Number(opcoes.usos)||2,conteudo:{agua:2,alimento:2,madeira:1},pistas});
	}else if(tipo==='artefato'){
		const pistas=[...PISTAS.artefato];
		if(mensagem)pistas.push('Uma inscrição ou sinal no artefato misterioso revela: "'+mensagem+'" ('+patrocinador+').');
		ev=novo('artefato',[no0],duracao,{origem,no:no0,patrocinador,mensagem,raciocinio,pistas});
	}else if(tipo==='tempestade'){
		const pistas=[...PISTAS.tempestade];
		if(mensagem)pistas.push(mensagem);
		ev=novo('tempestade',[no0,...espaco.vizinhosDe(no0)],duracao,{origem,no:no0,patrocinador,mensagem,raciocinio,efeitoClima:'chuva_forte',vento:.92,pistas});
	}else if(tipo==='predador'){
		const pistas=[...PISTAS.predador];
		if(mensagem)pistas.push(mensagem);
		ev=novo('predador',[no0,...espaco.vizinhosDe(no0)],duracao,{origem,no:no0,patrocinador,mensagem,raciocinio,ataque:true,movel:true,pistas});
	}else if(tipo==='seca'){
		const pistas=[...PISTAS.seca];
		if(mensagem)pistas.push(mensagem);
		ev=novo('seca',espaco.locais(),duracao,{origem,no:no0,patrocinador,mensagem,raciocinio,efeitoClima:'seco',vento:.4,pistas});
	}else if(tipo==='cardume'){
		const alvo=['rio','mar','bosque'].includes(no0)?no0:'rio';
		const pistas=[...PISTAS.cardume];
		if(mensagem)pistas.push(mensagem);
		ev=novo('cardume',[alvo],duracao,{origem,no:alvo,patrocinador,mensagem,raciocinio,pistas});
		const eco=m.ecossistema;
		if(eco){
			if(eco.peixes&&eco.peixes.rio){
				eco.peixes.rio.populacao=Math.min(eco.peixes.rio.capacidade||50,(eco.peixes.rio.populacao||0)+15);
				eco.peixes.rio.pescadosHoje=0;
			}
			for(const a of Object.values(eco.arvores||{}))if(a.viva!==false)a.frutos=Math.min(a.capacidadeFrutos||6,(a.frutos||0)+3);
		}
	}else{
		throw Error('Tipo de intervenção desconhecido: '+tipo);
	}
	ev.inicio=m.tempo?m.tempo.ciclo:0;
	ev.ateCiclo=ev.inicio+duracao;
	m.acontecimentos.push(ev);
	if(origem==='diretor-llm'||raciocinio){
		m.ultimoDiretor={
			ciclo:ev.inicio,
			tipo:ev.tipo,
			local:ev.no||no0,
			descricao:mensagem,
			raciocinio:raciocinio||mensagem,
			patrocinador,
			timestamp:Date.now()
		};
	}
	return ev;
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
		if(a.idade>a.duracao||(a.tipo==='suprimento'&&a.usosRestantes!==undefined&&a.usosRestantes<=0)){
			a.ativo=false;
			cons.push({tipo:'acontecimento',fase:'terminou',evento:a.tipo,origem:a.origem||'mundo',locais:a.locais});
			continue;
		}
		if(a.idade===1){a.inicio=c;cons.push({tipo:'acontecimento',fase:'comecou',evento:a.tipo,origem:a.origem||'mundo',patrocinador:a.patrocinador,mensagem:a.mensagem,locais:a.locais})}
		// Eventos antigos ganham o nó inicial (para exibição); só se movem
		// nasceram móveis — injetados/legados permanecem na própria região.
		if(a.tipo==='predador'&&!a.no)a.no=a.locais[0];
		const fogAcesa=!!(m.ecossistema&&m.ecossistema.fogueira&&m.ecossistema.fogueira.acesa&&(m.ecossistema.fogueira.lenha||0)>0);
		// FOGUEIRA ACESA AFASTA O PREDADOR: se o predador estava na fogueira ou acampamento e o fogo está aceso, ele recua para a mata/bosque!
		if(a.tipo==='predador'&&fogAcesa&&(a.no==='fogueira'||a.no==='acampamento')){
			a.noAnterior=a.no;
			a.no='bosque';
			a.locais=['bosque',...espaco.vizinhosDe('bosque').filter(v=>v!=='fogueira'&&v!=='acampamento')];
			cons.push({tipo:'acontecimento',fase:'afastado_pelo_fogo',evento:'predador',locais:[...a.locais]});
		}
		// PREDADOR MÓVEL: a cada ciclo caminha por uma trilha vizinha (ou para
		// onde está); se a fogueira estiver acesa, evita entrar em fogueira/acampamento.
		if(a.tipo==='predador'&&a.movel&&a.no){
			let viz=espaco.vizinhosDe(a.no)||[];
			if(fogAcesa){
				const seguros=viz.filter(v=>v!=='fogueira'&&v!=='acampamento');
				if(seguros.length)viz=seguros;
			}
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
			// mapa); se estiver na fogueira/acampamento com fogo aceso, o fogo protege!
			for(const ser of Object.values(estado.seres)){
				if(ser.status==='morto'||ser.local!==a.no)continue;
				if(fogAcesa&&(ser.local==='fogueira'||ser.local==='acampamento'))continue;
				const h=[...ser.id].reduce((x,ch)=>x*31+ch.charCodeAt(0),7);
				const z=((c*7919+h)%997)/997;
				const dano=10+Math.floor(z*10);
				ser.necessidades.saude=Math.max(0,ser.necessidades.saude-dano);
				cons.push({tipo:'acontecimento',fase:'ataque',evento:'predador',serId:ser.id,nome:ser.nome,local:ser.local,dano});
			}
		}
		if(a.tipo==='tempestade'){
			if(m.ecossistema&&m.ecossistema.fogueira&&m.ecossistema.fogueira.acesa){
				m.ecossistema.fogueira.lenha=Math.max(0,(m.ecossistema.fogueira.lenha||0)-2.2);
				if(m.ecossistema.fogueira.lenha<=1.5){
					m.ecossistema.fogueira.acesa=false;
					cons.push({tipo:'acontecimento',fase:'fogo_apagado',evento:'tempestade',locais:['fogueira','acampamento']});
				}
			}
			for(const ser of Object.values(estado.seres)){
				if(ser.status==='morto')continue;
				const emCasa=!!(ser.casa&&ser.local===ser.casa);
				if(!emCasa&&Array.isArray(a.locais)&&a.locais.includes(ser.local)){
					ser.necessidades.temperatura=Math.min(100,(ser.necessidades.temperatura||0)+18);
					ser.necessidades.medo=Math.min(100,(ser.necessidades.medo||0)+12);
					ser.necessidades.energia=Math.max(0,(ser.necessidades.energia||0)-8);
				}
			}
		}
		if(a.tipo==='seca'&&m.ecossistema&&m.ecossistema.agua&&m.ecossistema.agua.fontes){
			for(const f of Object.values(m.ecossistema.agua.fontes)){
				f.nivel=Math.max(0,(f.nivel||0)-1.5);
			}
			m.ecossistema.agua.nascente=m.ecossistema.agua.fontes.nascente.nivel;
		}
	}
	m.acontecimentos=m.acontecimentos.filter(a=>a.ativo!==false);
	return cons;
}
// Efeito climático ativo — aplicado DEPOIS do calendário (que manda no resto).
function efeitos(estado){
	const t=(estado.mundo.acontecimentos||[]).find(a=>a.tipo==='tempestade'&&a.ativo!==false);
	if(t)return{clima:t.efeitoClima||'chuva_forte',vento:t.vento??0.85};
	const s=(estado.mundo.acontecimentos||[]).find(a=>a.tipo==='seca'&&a.ativo!==false);
	if(s)return{clima:s.efeitoClima||'seco',vento:s.vento??0.4};
	return null;
}
module.exports={gerar,aplicar,efeitos,intervir,novo,PISTAS};

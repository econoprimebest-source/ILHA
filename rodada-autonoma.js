'use strict';
// Loop unificado do mundo — NOVA FASE (espaço · tempo · linha do tempo):
// Fase 0: o tempo passa para quem está em deslocamento (física do mundo).
// Fase 1: percepção + decisão — o CÉREBRO decide; quem está a caminho só é
//         consultado se o mundo criar situação percebida na região.
// Fase 2: o MOTOR executa e calcula a consequência (nunca substitui decisão).
// Nenhuma necessidade vira ação por regra; nenhum 'ir_*' teleporta.
const {avancar}=require('./estado-v2');
const {horaDe}=require('./calendario');
const eco=require('./ecossistema');
const cortex=require('./cortex');
const {perceber}=require('./percepcao-v2');
const {acoes,executar}=require('./motor-v2');
const {montarContexto,validarDecisao,cerebroDe}=require('./cerebro-personagem');
const {statusDe}=require('./seres');
const {aplicarMetabolismo}=require('./metab');
const acontecimentos=require('./acontecimentos');
const memoria=require('./memoria-personagem');

// CAMPADA COGNITIVA (opt-in `ILHA_COG=1`) — require atrasado: a camada é
// opcional e uma falha dela nunca derruba o ciclo do mundo.
function cog(){
	try{return require('./cognicao')}catch(e){return null}
}

// Contexto de decisão — CONTRATO (FASE B): ver cerebro-personagem.js.
// O contexto é montado por `montarContexto` (só fatos que este ser conhece;
// `acontecimentos` chega apenas como PISTAS indiretas da própria região).
const contextoDecisao=montarContexto;

// LINHA DO TEMPO contínua: estado registra o vivido (append-only, com relógio).
function historicoDe(estado){
	if(!estado.historico)estado.historico={eventos:[],decisoes:[]};
	if(!Array.isArray(estado.historico.eventos))estado.historico.eventos=[];
	if(!Array.isArray(estado.historico.decisoes))estado.historico.decisoes=[];
	return estado.historico;
}
function marcarTempo(estado,entrada){
	const h=historicoDe(estado);
	h.eventos.push({ciclo:estado.mundo.tempo.ciclo,tempo:horaDe(estado.mundo.tempo.ciclo),...entrada});
	if(h.eventos.length>600)h.eventos.splice(0,h.eventos.length-600);
	return h;
}

// PONTO DE INTEGRAÇÃO — acontecimento do mundo na região do ser.
// Quando há evento ativo na região, quem está em trajeto É consultado; hoje
// não há gerador com a flag desligada; a leitura é `mundo.acontecimentos`.
function situacaoNoCaminho(estado,ser){
	if(!Array.isArray(estado.mundo.acontecimentos))return null;
	const ativos=estado.mundo.acontecimentos.filter(a=>a&&a.ativo!==false&&Array.isArray(a.locais)&&a.locais.includes(ser.local));
	return ativos.length?ativos[0]:null;
}

// MEMÓRIA DE PERSONAGEM (M1) — o que o ser viveu vira turno do PRÓPRIO
// personagem (mecanismo ICAROOVO: chat append-only por diretório isolado).
// Quem só anda (origem física) não gera novo evento; falha de memória nunca
// quebra o ciclo do mundo.
function guardarExperiencia(estado,ser,item,antes,con){
	if(!memoria.estaAtivo())return;
	if(!item.decisao||item.decisao.origem==='fisica')return;
	try{
		const pistas=item.situacao&&Array.isArray(item.situacao.pistas)?item.situacao.pistas:[];
		const per=Array.isArray(item.percepcao)?item.percepcao:[];
		const entrada=pistas.length?pistas.join(' '):per.slice(0,2).join(' ');
		const presentes=Object.values(estado.seres||{})
			.filter(o=>o.id!==ser.id&&o.status!=='morto'&&o.local===ser.local)
			.map(o=>({id:o.id,nome:o.nome}));
		memoria.registrarCiclo(ser,{
			ciclo:estado.mundo.tempo.ciclo,
			entrada,
			acao:item.decisao.acao,
			local:ser.local,
			de:antes.local,
			destino:con&&con.deslocamento?con.deslocamento.destino:null,
			presentes
		});
	}catch(e){console.log('[MEM] experiência não guardada:',e&&e.message)}
}

async function rodada(estado,opcoes={}){
	eco.preparar(estado);
	const vivos=Object.values(estado.seres).filter(s=>s.status!=='morto');
	// Eventos do mundo: só a GERAÇÃO exige a flag; consequências rodam sempre.
	if(opcoes.acontecimentos)acontecimentos.gerar(estado);

	// FASE 0 — o mundo não espera: deslocamentos em curso avançam um trecho.
	for(const ser of vivos){
		const d=ser.deslocamento;
		if(!d)continue;
		if(!Array.isArray(d.caminho)||d.caminho.length<2){ser.deslocamento=null;continue}
		const i=Number.isInteger(d.i)&&d.i>=0?Math.min(d.i,d.caminho.length-1):0;
		const de=d.caminho[i];
		d.i=Math.min(i+1,d.caminho.length-1);
		const para=d.caminho[d.i];
		ser.local=para;
		const chegou=d.i>=d.caminho.length-1;
		if(chegou)ser.deslocamento=null;
		marcarTempo(estado,{tipo:'deslocamento',fase:chegou?'chegada':'passo',serId:ser.id,nome:ser.nome,de,para,destino:d.destino,local:para});
	}

	// FASE 0b — consequências do mundo na região (ex.: ataque) — ANTES da
	// decisão: quem sofreu pode escolher fugir ainda neste ciclo.
	for(const cn of acontecimentos.aplicar(estado))marcarTempo(estado,cn);

	// FASE 1 — percepção + decisão. Quem está a caminho segue a decisão já
	// tomada (física da trajetória); sem situação nova ninguém é consultado.
	const decisoes=[];
	for(const ser of vivos){
		if(ser.status==='morto')continue;
		const situacao=situacaoNoCaminho(estado,ser);
		if(ser.deslocamento&&!situacao){
			decisoes.push({ser,decisao:{acao:'continuar',motivo:'segue caminho para '+ser.deslocamento.destino,origem:'fisica'},percepcao:perceber(estado,ser),fisica:true});
			continue;
		}
		const possiveis=acoes(estado,ser);
		const contexto=montarContexto(estado,ser,possiveis,situacao);
		const decidir=cerebroDe(opcoes,ser);
		// TRILHA CAUSAL (cognição): abre ANTES da decisão para registrar o que
		// entrou no contexto; fecha depois com a consequência real do motor.
		const C=cog();
		let trilha=null,itens=null;
		if(C&&C.estaAtivo()){
			try{
				trilha=C.abrirTrilha(ser,contexto,possiveis);
				itens=C.itensDoContexto(contexto);
			}catch(e){trilha=null}
		}
		let d;
		try{d=validarDecisao(await decidir(contexto,possiveis,ser),possiveis,ser)}
		catch(err){
			if(trilha){const C2=cog();if(C2)try{C2.abortarTrilha(trilha,{ser,erro:err})}catch(e){}}
			if(err&&typeof err==='object')err.decisao=true;throw err
		}
		decisoes.push({ser,decisao:d,percepcao:contexto.percepcoes,situacao,trilha,itens});
	}

	const eventos=[];
	for(const item of decisoes){
		const ser=item.ser;
		if(ser.status==='morto')continue;
		const antes={local:ser.local,necessidades:{...ser.necessidades},inventario:{...ser.inventario}};
		const con=executar(estado,ser,item.decisao.acao,undefined,{texto:item.decisao.texto,fala:item.decisao.fala,motivo:item.decisao.motivo});
		// O QUE ESTE SER ESTÁ FAZENDO AGORO — espelho do mundo para o
		// observador (o visualizador mostra a atividade real, não uma regra).
		ser.acao=item.decisao.acao;
		ser.motivo=item.decisao.motivo||'';
		if(item.decisao.acao==='coletar_agua'){
			const q=con.quantidade||0;
			const f=estado.mundo.ecossistema.agua.fontes.nascente;
			f.nivel=Math.max(0,f.nivel-q);
			estado.mundo.ecossistema.agua.nascente=f.nivel;
		}
		const h=historicoDe(estado);
		const falaEfetiva=con.texto||item.decisao.fala||'';
		h.decisoes.push({ciclo:estado.mundo.tempo.ciclo,tempo:horaDe(estado.mundo.tempo.ciclo),serId:ser.id,local:antes.local,acao:item.decisao.acao,motivo:item.decisao.motivo||'',...(falaEfetiva?{fala:falaEfetiva}:{}),origem:item.decisao.origem||'modelo',...(item.situacao?{situacao:item.situacao.tipo}:{})});
		if(h.decisoes.length>600)h.decisoes.splice(0,h.decisoes.length-600);
		if(con.deslocamento)marcarTempo(estado,{tipo:'deslocamento',fase:con.deslocamento.estado,serId:ser.id,nome:ser.nome,destino:con.deslocamento.destino,local:ser.local});
		eventos.push({tipo:'rodada-autonoma',ciclo:estado.mundo.tempo.ciclo,serId:ser.id,nome:ser.nome,percepcao:item.percepcao,decisao:{acao:item.decisao.acao,motivo:item.decisao.motivo,...(falaEfetiva?{fala:falaEfetiva}:{}),origem:item.decisao.origem||'modelo',...(Array.isArray(item.decisao.objetivos)?{objetivos:item.decisao.objetivos}:{}),...(Array.isArray(item.decisao.crencas)?{crencas:item.decisao.crencas}:{})},antes,consequencia:con});
		guardarExperiencia(estado,ser,item,antes,con);
		// CAMPADA COGNITIVA — a verdade é a do MOTOR: só aqui a trilha fecha
		// (com a consequência real) e o pós-turno vira estado dos mecanismos
		// individuais. Tudo em try/catch: mecanismo quebrado não quebra mundo.
		const C=cog();
		if(C&&C.estaAtivo()){
			if(item.trilha)try{
				C.fecharTrilha(item.trilha,{ser,decisao:item.decisao,consequencia:con,itens:item.itens||[]});
			}catch(e){}
			try{
				const entradaC=item.situacao&&Array.isArray(item.situacao.pistas)&&item.situacao.pistas.length
					?item.situacao.pistas.join(' ')
					:(Array.isArray(item.percepcao)?item.percepcao.slice(0,3).join(' '):'');
				C.posConsequencia(ser,{ciclo:estado.mundo.tempo.ciclo,decisao:item.decisao,consequencia:con,
					percepcao:item.percepcao,falasRecebidas:[],entrada:entradaC});
			}catch(e){}
		}
	}
	for(const item of decisoes){
		if(item.ser.status==='morto')continue;
		aplicarMetabolismo(item.ser,item.decisao.acao,estado.mundo.clima);
		eco.atualizarVidaSocial(estado,item.ser,item.decisao.acao);
		item.ser.status=statusDe(item.ser.necessidades);
	}
	const frutas=eventos.some(e=>e.decisao.acao==='colher_frutas');
	avancar(estado.mundo);
	eco.atualizarMundo(estado,frutas?'colher_frutas':null);
	// Tempestade manda no clima do ciclo (depois do calendário, que manda no resto).
	const ef=acontecimentos.efeitos(estado);
	if(ef){estado.mundo.clima=ef.clima;estado.mundo.ecossistema.clima.vento=ef.vento}
	for(const evento of eventos){
		const ser=estado.seres[evento.serId];
		cortex.registrar(ser,{ciclo:estado.mundo.tempo.ciclo,percepcao:evento.percepcao,acao:evento.decisao.acao,motivo:evento.decisao.motivo,consequencia:evento.consequencia,objetivos:evento.decisao.objetivos,crencas:evento.decisao.crencas,experiencia:ser.nome+' realizou '+evento.decisao.acao+'.'});
		ser.memoria=Array.isArray(ser.memoria)?ser.memoria:[];
		const corporal=/^(Minha boca|Sinto |Meu estômago|Mal consigo|Um cansaço|Meu coração|O escuro|A noite me deixa|Cheguei em casa)/;
		for(const texto of evento.percepcao){if(!corporal.test(texto)&&!ser.memoria.some(m=>m.texto===texto))ser.memoria.push({ciclo:estado.mundo.tempo.ciclo,texto,tipo:'ambiente'});}
		ser.memoria=ser.memoria.slice(-120);
		evento.cicloFinal=estado.mundo.tempo.ciclo;
		evento.statusFinal=ser.status;
		evento.localFinal=ser.local;
	}
	eco.validarCompleto(estado);
	return{ciclo:estado.mundo.tempo.ciclo,eventos,mundo:estado.mundo};
}
module.exports={rodada,contextoDecisao,historicoDe,marcarTempo};

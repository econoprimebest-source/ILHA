'use strict';
// CONTRATO DO CHARACTERBRAIN (FASE B/C) — novo modelo da Ilha.
// Fluxo: MUNDO → CORPO/PERCEPÇÃO → MEMÓRIA/EXPERIÊNCIA/CONTEXTO → CÉREBRO →
//        ESCOLHA validada → MOTOR → CONSEQUÊNCIA → EXPERIÊNCIA/MEMÓRIA.
// Este módulo NÃO decide nada. Ele:
//   1. monta o CONTEXTO — só o que ESTE ser pode saber agora (sem verdade alheia);
//   2. VALIDA a devolução do cérebro (ação ∈ possíveis, motivo, origem);
//   3. RESOLVE qual cérebro decide por cada personagem (`opcoes.cerebros`);
//   4. cria INSTÂNCIAS independentes de CharacterBrain (`criarCerebro`) — uma
//      por personagem, com estado interno próprio (FASE D).
// O cérebro real (FASE D/K) entra por `opcoes.cerebros`; até lá o padrão é o
// decisor legado — este contrato NÃO declara nenhum cérebro novo integrado.
const cortex=require('./cortex');
const {perceber,observacaoCorporal}=require('./percepcao-v2');
const {NOME}=require('./biblia-ilha-aurora');

// M2 — MEMÓRIA VIVIDA (adaptador Ilha ↔ ICAROOVO): o que ESTE ser já viveu,
// no formato do próprio cérebro (histórico com papéis + trajetória recente).
// INFORMA a decisão; nunca é verdade alheia — vem do diretório isolado do
// personagem e só existe com o adaptador ativo (`ativar()`); fora disso
// `null`, contexto idêntico ao anterior. Require atrasado: o adaptador é
// opcional e uma falha dele nunca derruba a montagem do contexto.
function memoriaVividaDe(ser){
	try{
		const mem=require('./memoria-personagem');
		return mem&&mem.estaAtivo()?mem.contexto(ser.id):null;
	}catch(e){return null}
}

// Contexto do personagem — fatos percebidos/conhecidos por UM ser neste ciclo.
// Separação: WORLD TRUTH (estado.mundo) nunca entra inteira; só o que este ser
// percebe/sabe. `acontecimentos` chega apenas como PISTAS da própria região;
// `memorias` é SÓ a memória individual do ser (a memória global legada
// `estado.memorias` é arquivo do mundo — observações de terceiros não viram
// conhecimento deste personagem); `relacoes` é a linha do próprio ser.
function montarContexto(estado,ser,possiveis,situacao=null){
	const pessoasPorPerto=Object.values(estado.seres||{})
		.filter(o=>o&&o.id!==ser.id&&o.status!=='morto'&&o.local===ser.local)
		.map(o=>({id:o.id,nome:o.nome||o.id}));
	return {
		tempo:estado.mundo.tempo,
		clima:estado.mundo.clima,
		climaDetalhado:estado.mundo.ecossistema.clima,
		local:ser.local,
		casa:ser.casa,
		acontecimentos:situacao&&Array.isArray(situacao.pistas)?[...situacao.pistas]:[],
		pessoasPorPerto,
		deslocamento:ser.deslocamento?{destino:ser.deslocamento.destino,trecho:ser.deslocamento.i,trechos:ser.deslocamento.caminho.length-1,caminho:[...ser.deslocamento.caminho]}:null,
		status:ser.status,
		necessidades:ser.necessidades,
		sensacoes:observacaoCorporal(ser),
		percepcoes:perceber(estado,ser),
		memorias:(ser.memoria||[]).slice(-12).map(m=>m.texto),
		experiencias:(ser.experiencia||[]).slice(-8),
		relacoes:(estado.relacoes&&estado.relacoes[ser.id])||{},
		// IDENTIDADE INICIAL (nossa): quem este ser JÁ É — insumos do cérebro,
		// nunca regras de comportamento; o futuro pertence ao personagem.
		ilha:NOME,
		personalidade:Array.isArray(ser.personalidade)?[...ser.personalidade]:[],
		historia:ser.historia?JSON.parse(JSON.stringify(ser.historia)):null,
		historicoRelacoes:(estado.relacoesHistoria&&estado.relacoesHistoria[ser.id])?JSON.parse(JSON.stringify(estado.relacoesHistoria[ser.id])):{},
		cortex:cortex.contexto(ser),
		memoriaVivida:memoriaVividaDe(ser),
		acoesPossiveis:possiveis
	};
}

// Toda decisão devolvida por um cérebro passa por aqui — fonte não importa.
// Falha marca `err.decisao=true` (ciclo não aplicado, produção segue de pé).
function validarDecisao(d,possiveis,ser){
	const falha=m=>{const e=new Error('Decisão inválida'+(ser&&ser.id?' de '+ser.id:'')+': '+m);e.decisao=true;return e};
	if(!d||typeof d!=='object')throw falha('cérebro devolveu '+typeof d);
	if(typeof d.acao!=='string'||!d.acao.trim())throw falha('sem ação');
	if(!Array.isArray(possiveis)||!possiveis.some(a=>a.id===d.acao))throw falha('ação fora das possíveis: '+d.acao);
	if(typeof d.motivo!=='string'||!d.motivo.trim())throw falha('sem motivo');
	if(d.origem!==undefined&&(typeof d.origem!=='string'||!d.origem.trim()))throw falha('origem inválida');
	const objetivos=Array.isArray(d.objetivos)?d.objetivos.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):undefined;
	const crencas=Array.isArray(d.crencas)?d.crencas.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):undefined;
	return {...d,acao:d.acao,motivo:d.motivo.trim().slice(0,240),
		origem:typeof d.origem==='string'&&d.origem.trim()?d.origem.trim():'modelo',
		...(objetivos?{objetivos}:{}),
		...(crencas?{crencas}:{})};
}

// Qual cérebro decide por ESTE personagem neste ciclo.
// opcoes.cerebros: mapa {serId: funcao} | {serId: {decidir}} | funcao(ser).
// Sem mapa, cai no decisor legado (compatibilidade com testes e produção).
function cerebroDe(opcoes,ser){
	if(opcoes&&opcoes.cerebros){
		const c=typeof opcoes.cerebros==='function'?opcoes.cerebros(ser):opcoes.cerebros[ser&&ser.id];
		if(typeof c==='function')return c;
		if(c&&typeof c.decidir==='function')return c.decidir.bind(c);
	}
	return (opcoes&&opcoes.decisor)||require('./decisor').decidir;
}

// FASE D — INSTÂNCIA de CharacterBrain: uma por personagem, com estado interno
// próprio. Não é um cérebro global recebendo id: cada `criarCerebro` fecha seu
// próprio estado; duas instâncias nunca compartilham memória nem contador.
// A instância é BOUND ao personagem: decidir com outro ser (ex.: cérebro da
// Maria servindo o Ícaro) é erro — garante que estado mental não atravessa
// personagens. `escolher` é a estratégia da instância (stub hoje; o cérebro
// real entra aqui na FASE K — ponto: criarCerebro({id, escolher})).
let proximaInstancia=1;
function criarCerebro(opcoes={}){
	if(!opcoes.id||typeof opcoes.id!=='string')throw Error('CharacterBrain exige id');
	if(typeof opcoes.escolher!=='function')throw Error('CharacterBrain '+opcoes.id+' exige escolher(contexto,possiveis,ser)');
	const interno={id:opcoes.id,nome:opcoes.nome||opcoes.id,instancia:proximaInstancia++,
		decisoes:0,contextosRecebidos:0,ultima:null,ultimoContexto:null};
	async function decidir(contexto,possiveis,ser){
		if(!contexto||typeof contexto!=='object')throw Error('CharacterBrain '+interno.id+' recebeu contexto inválido');
		if(ser&&ser.id!==interno.id){const e=new Error('CharacterBrain '+interno.id+' recebeu contexto de '+ser.id+' — instâncias são independentes e presas ao personagem');e.decisao=true;throw e}
		interno.contextosRecebidos++;
		interno.ultimoContexto=contexto;
		const d=await opcoes.escolher(contexto,possiveis,ser);
		interno.decisoes++;
		interno.ultima={ciclo:contexto.tempo?contexto.tempo.ciclo:null,local:contexto.local,acao:d&&d.acao};
		return{...d,origem:d.origem||('cérebro-'+interno.id)};
	}
	return{id:interno.id,nome:interno.nome,instancia:interno.instancia,interno,decidir,
		estatisticas:()=>({...interno})};
}

module.exports={montarContexto,validarDecisao,cerebroDe,criarCerebro};

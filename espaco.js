'use strict';
// ESPAÇO da ilha — o sistema fornece locais conectados por trilhas.
// Quem decide para onde ir é o personagem; aqui só existem nós, caminhos e
// distâncias. Coordenadas relativas (0..1) compatíveis com o mapa de referência.
const nos={
	casa_icaro:{x:.214,y:.445,nome:'Casa do Ícaro'},
	casa_lara:{x:.325,y:.455,nome:'Casa da Elara'},
	casa_joao:{x:.476,y:.185,nome:'Casa do João'},
	casa_maria:{x:.855,y:.535,nome:'Casa da Maria'},
	fazenda_icaro:{x:.214,y:.535,nome:'Fazenda do Ícaro'},
	fazenda_lara:{x:.325,y:.545,nome:'Fazenda da Elara'},
	fazenda_joao:{x:.583,y:.198,nome:'Fazenda do João'},
	fazenda_maria:{x:.948,y:.545,nome:'Fazenda da Maria'},
	venda:{x:.425,y:.625,nome:'Mercadinho & Praça Comercial'},
	oficina:{x:.565,y:.465,nome:'Oficina de Fabricação'},
	observatorio:{x:.135,y:.205,nome:'Mirante & Observatório'},
	acampamento:{x:.450,y:.505,nome:'Praça Central'},
	fogueira:{x:.492,y:.476,nome:'Fogueira Central'},
	arena:{x:.565,y:.380,nome:'Arena de Treino'},
	bosque:{x:.235,y:.245,nome:'Bosque & Santuário'},
	floresta:{x:.815,y:.295,nome:'Floresta Alta'},
	rio:{x:.692,y:.420,nome:'Ponte do Rio Doce'},
	cachoeira:{x:.730,y:.115,nome:'Cachoeira de Banho'},
	fazenda:{x:.948,y:.545,nome:'Fazenda da Maria'},
	curral:{x:.855,y:.635,nome:'Curral de Animais'},
	mar:{x:.350,y:.825,nome:'Praia do Sul'},
	barco:{x:.502,y:.845,nome:'Porto & Píer do Barco'},
	caverna:{x:.932,y:.175,nome:'Caverna & Ruínas'},
	ilha_vizinha:{x:.080,y:.820,nome:'Ilha Vizinha'}
};
const aliases={
	pesca_mar:'mar',mar_pesca:'mar',praia:'mar',litoral:'mar',
	floresta_densa:'floresta',santuario:'bosque',floresta_santuario:'bosque',
	ruinas_antigas:'caverna',caverna_ruinas:'caverna',mina:'caverna',ruinas:'caverna',
	santuario_fe:'cachoeira',cachoeira_banho:'cachoeira',
	casa_elara:'casa_lara',fazenda_elara:'fazenda_lara',
	mercadinho:'venda',mercado:'venda',vendinha:'venda',praca_comercial:'venda',loja:'venda',
	porto:'barco',pier:'barco',cais:'barco',praca:'acampamento'
};
const zonasExpansivas={
	floresta_densa:{x:.810,y:.280,nome:'Floresta Densa & Misteriosa',base:'floresta'},
	ruinas_antigas:{x:.920,y:.160,nome:'Ruínas Antigas',base:'caverna'},
	santuario_fe:{x:.620,y:.080,nome:'Santuário da Fé e Esperança',base:'cachoeira'}
};
// Trilhas com waypoints sobre os caminhos pintados do mapa.
const arestas=[
	{a:'fogueira',b:'casa_icaro',wp:[[.42,.49],[.34,.55],[.27,.56]]},
	{a:'fogueira',b:'acampamento',wp:[]},
	{a:'arena',b:'acampamento',wp:[[.515,.445]]},
	{a:'fogueira',b:'casa_joao',wp:[[.46,.42],[.45,.33],[.47,.27]]},
	{a:'casa_joao',b:'bosque',wp:[[.40,.27],[.35,.29]]},
	{a:'bosque',b:'floresta',wp:[[.42,.33],[.52,.34],[.62,.33],[.72,.31]]},
	{a:'floresta',b:'cachoeira',wp:[[.73,.20],[.69,.13]]},
	{a:'floresta',b:'fazenda',wp:[[.86,.38],[.90,.47],[.935,.53]]},
	{a:'fazenda',b:'casa_maria',wp:[[.85,.57]]},
	{a:'fazenda',b:'curral',wp:[[.885,.62]]},
	{a:'curral',b:'casa_maria',wp:[[.86,.63]]},
	{a:'curral',b:'rio',wp:[[.78,.64],[.68,.62]]},
	{a:'casa_icaro',b:'casa_lara',wp:[[.23,.44]]},
	{a:'casa_lara',b:'bosque',wp:[[.28,.36]]},
	{a:'fazenda',b:'rio',wp:[[.90,.66],[.80,.70],[.73,.66],[.70,.62]]},
	{a:'fogueira',b:'fazenda',wp:[[.56,.47],[.63,.51],[.665,.548],[.76,.62],[.86,.66],[.93,.61]]},
	{a:'fogueira',b:'bosque',wp:[[.44,.43],[.37,.37]]},
	{a:'fogueira',b:'mar',wp:[[.455,.55],[.43,.65],[.40,.76],[.38,.86]]},
	{a:'fogueira',b:'barco',wp:[[.49,.56],[.487,.66],[.487,.77]]},
	{a:'mar',b:'barco',wp:[[.42,.91],[.455,.89]]},
	{a:'casa_icaro',b:'mar',wp:[[.24,.58],[.28,.70],[.32,.82]]},
	{a:'barco',b:'rio',wp:[[.53,.79],[.59,.71],[.645,.64]]},
	{a:'casa_maria',b:'rio',wp:[[.82,.66],[.76,.64],[.72,.61]]},
	{a:'rio',b:'cachoeira',wp:[[.71,.48],[.69,.38],[.675,.27],[.66,.17]]},
	// TRILHAS EXTRAS — mais de um caminho para os mesmos destinos: o habitante
	// escolhe por onde andar (loop oeste, corredor do cais, atalho da arena).
	{a:'casa_icaro',b:'bosque',wp:[[.23,.40],[.26,.35]]},
	{a:'bosque',b:'acampamento',wp:[[.36,.36],[.40,.42]]},
	{a:'arena',b:'fogueira',wp:[[.49,.42]]},
	{a:'acampamento',b:'barco',wp:[[.46,.62],[.46,.75]]},
	// Caverna: boca da arte no canto NE, entrada pela floresta.
	{a:'floresta',b:'caverna',wp:[[.856,.241],[.895,.203]]},
	// Propriedades, Fazendas Individuais, Mercadinho, Oficina e Observatório
	{a:'casa_icaro',b:'fazenda_icaro',wp:[]},
	{a:'casa_lara',b:'fazenda_lara',wp:[]},
	{a:'fazenda_icaro',b:'fazenda_lara',wp:[]},
	{a:'fazenda_lara',b:'acampamento',wp:[[.39,.52]]},
	{a:'casa_joao',b:'fazenda_joao',wp:[]},
	{a:'casa_maria',b:'fazenda_maria',wp:[]},
	{a:'fazenda_maria',b:'fazenda',wp:[]},
	{a:'fogueira',b:'venda',wp:[[.46,.55]]},
	{a:'acampamento',b:'venda',wp:[[.44,.56]]},
	{a:'venda',b:'barco',wp:[[.46,.72]]},
	{a:'venda',b:'mar',wp:[[.39,.72]]},
	{a:'fogueira',b:'oficina',wp:[]},
	{a:'bosque',b:'observatorio',wp:[[.18,.22]]},
	{a:'casa_icaro',b:'observatorio',wp:[[.17,.32]]},
	// TRILHAS DE ÁGUA (`agua:true`): trajeto de barco — mesmo mecanismo de
	// deslocamento (um trecho por ciclo), nunca teleporte.
	{a:'barco',b:'ilha_vizinha',wp:[[.44,.965],[.34,.985],[.24,.975],[.14,.945]],agua:true},
	{a:'mar',b:'ilha_vizinha',wp:[[.30,.968],[.21,.962],[.13,.925]],agua:true}
];
const chave=(a,b)=>a<b?a+'|'+b:b+'|'+a;
const mapaAresta=new Map();
const vizinhos=new Map();
for(const no of Object.keys(nos))vizinhos.set(no,[]);
function ponto(no){const n=nos[no];return[n.x,n.y]}
function distPts(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])}
for(const r of arestas){
	const linha=[ponto(r.a),...r.wp,ponto(r.b)];
	let d=0;
	for(let i=1;i<linha.length;i++)d+=distPts(linha[i-1],linha[i]);
	const trecho={a:r.a,b:r.b,linha,comprimento:d,...(r.agua?{agua:true}:{})};
	mapaAresta.set(chave(r.a,r.b),trecho);
	vizinhos.get(r.a).push({no:r.b,trecho});
	vizinhos.get(r.b).push({no:r.a,trecho});
}
function normalizar(local){
	if(!local)return null;
	const t=String(local).toLowerCase();
	if(nos[t])return t;
	return aliases[t]||null;
}
function vizinhosDe(no){const n=normalizar(no);return n?(vizinhos.get(n)||[]).map(v=>v.no):[]}
function nome(local){const n=nos[normalizar(local)];return n?n.nome:null}
function locais(){return Object.keys(nos)}
function distancia(a,b){return mapaAresta.get(chave(a,b))?.comprimento??null}
// Menor rota entre locais (Dijkstra). devolve {caminho:[nós], trechos:[...], comprimento}
function rota(de,para){
	const ini=normalizar(de),fim=normalizar(para);
	if(!ini||!fim)return null;
	if(ini===fim)return{caminho:[ini],trechos:[],comprimento:0};
	const dist=new Map([[ini,0]]),prev=new Map(),visitados=new Set();
	while(true){
		let atual=null,menor=Infinity;
		for(const[no,d]of dist)if(!visitados.has(no)&&d<menor){menor=d;atual=no}
		if(atual===null)break;
		if(atual===fim)break;
		visitados.add(atual);
		for(const {no,trecho}of vizinhos.get(atual)){
			const nd=menor+trecho.comprimento;
			if(nd<(dist.get(no)??Infinity)){dist.set(no,nd);prev.set(no,{no:atual,via:trecho})}
		}
	}
	if(!dist.has(fim))return null;
	const caminho=[fim],trechos=[];
	let atual=fim;
	while(atual!==ini){
		const p=prev.get(atual);
		if(!p)return null;
		trechos.unshift(p.via);
		caminho.unshift(p.no);
		atual=p.no;
	}
	return{caminho,trechos,comprimento:dist.get(fim)};
}
function trechoEntre(a,b){return mapaAresta.get(chave(a,b))||null}
module.exports={nos,arestas,normalizar,nome,locais,vizinhosDe,distancia,rota,trechoEntre,zonasExpansivas};

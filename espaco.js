'use strict';
// ESPAÇO da ilha — o sistema fornece locais conectados por trilhas.
// Quem decide para onde ir é o personagem; aqui só existem nós, caminhos e
// distâncias. Coordenadas relativas (0..1) compatíveis com o mapa de referência.
const nos={
	casa_icaro:{x:.213,y:.493,nome:'Casa do Ícaro'},
	casa_joao:{x:.477,y:.197,nome:'Casa do João'},
	casa_maria:{x:.855,y:.568,nome:'Casa da Maria'},
	acampamento:{x:.450,y:.505,nome:'Acampamento'},
	fogueira:{x:.492,y:.476,nome:'Fogueira'},
	bosque:{x:.310,y:.310,nome:'Bosque'},
	floresta:{x:.800,y:.290,nome:'Floresta'},
	rio:{x:.695,y:.580,nome:'Rio'},
	cachoeira:{x:.655,y:.090,nome:'Cachoeira'},
	fazenda:{x:.948,y:.561,nome:'Fazenda'},
	mar:{x:.360,y:.910,nome:'Mar'},
	barco:{x:.487,y:.860,nome:'Cais do barco'}
};
const aliases={pesca_mar:'mar',mar_pesca:'mar',praia:'mar'};
// Trilhas com waypoints sobre os caminhos pintados do mapa.
const arestas=[
	{a:'fogueira',b:'casa_icaro',wp:[[.42,.49],[.34,.55],[.27,.56]]},
	{a:'fogueira',b:'acampamento',wp:[]},
	{a:'fogueira',b:'casa_joao',wp:[[.46,.42],[.45,.33],[.47,.27]]},
	{a:'casa_joao',b:'bosque',wp:[[.40,.27],[.35,.29]]},
	{a:'bosque',b:'floresta',wp:[[.42,.33],[.52,.34],[.62,.33],[.72,.31]]},
	{a:'floresta',b:'cachoeira',wp:[[.73,.20],[.69,.13]]},
	{a:'floresta',b:'fazenda',wp:[[.86,.38],[.90,.47],[.935,.53]]},
	{a:'fazenda',b:'casa_maria',wp:[[.92,.55]]},
	{a:'fazenda',b:'rio',wp:[[.90,.66],[.80,.70],[.73,.66],[.70,.62]]},
	{a:'fogueira',b:'fazenda',wp:[[.56,.47],[.63,.51],[.665,.548],[.76,.62],[.86,.66],[.93,.61]]},
	{a:'fogueira',b:'bosque',wp:[[.44,.43],[.37,.37]]},
	{a:'fogueira',b:'mar',wp:[[.455,.55],[.43,.65],[.40,.76],[.38,.86]]},
	{a:'fogueira',b:'barco',wp:[[.49,.56],[.487,.66],[.487,.77]]},
	{a:'mar',b:'barco',wp:[[.42,.91],[.455,.89]]},
	{a:'casa_icaro',b:'mar',wp:[[.24,.58],[.28,.70],[.32,.82]]},
	{a:'barco',b:'rio',wp:[[.53,.79],[.59,.71],[.645,.64]]},
	{a:'casa_maria',b:'rio',wp:[[.82,.66],[.76,.64],[.72,.61]]},
	{a:'rio',b:'cachoeira',wp:[[.71,.48],[.69,.38],[.675,.27],[.66,.17]]}
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
	const trecho={a:r.a,b:r.b,linha,comprimento:d};
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
module.exports={nos,arestas,normalizar,nome,locais,vizinhosDe,distancia,rota,trechoEntre};

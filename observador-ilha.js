'use strict';
// OBSERVADOR DA ILHA — arquivo NOVO à parte (visualizador-ilha.* é protegido).
// Somente LEITURA: serve estado, mapa e linha do tempo para espectadores;
// nunca grava, nunca modifica estado, nunca interfere no mundo.
const http=require('http'),fs=require('fs'),path=require('path');
const espaco=require('./espaco');
const {perceber}=require('./percepcao-v2');
const cortex=require('./cortex');
const ROOT=__dirname;
const ARQ=path.join(ROOT,'estado-ilha.json');
function json(res,obj){res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'});res.end(JSON.stringify(obj))}
function lerEstado(){try{return JSON.parse(fs.readFileSync(ARQ,'utf8'))}catch(e){return null}}
// VERDADES separadas: o espectador vê tudo; o painel do personagem mostra o que
// ele percebe (percepção real, não a verdade do mundo).
function resumo(estado){
	if(!estado)return null;
	return {
		tempo:estado.mundo.tempo,
		clima:estado.mundo.clima,
		acontecimentos:(estado.mundo.acontecimentos||[]).map(a=>({id:a.id,tipo:a.tipo,origem:a.origem,locais:a.locais,idade:a.idade,duracao:a.duracao})),
		seres:Object.fromEntries(Object.entries(estado.seres).map(([id,s])=>[id,{
			id,nome:s.nome,status:s.status,local:s.local,casa:s.casa,abrigo:s.abrigo,
			necessidades:s.necessidades,
			deslocamento:s.deslocamento?{destino:s.deslocamento.destino,caminho:[...s.deslocamento.caminho],i:s.deslocamento.i}:null
		}])),
		historico:{
			eventos:(estado.historico&&Array.isArray(estado.historico.eventos)?estado.historico.eventos:[]).slice(-150),
			decisoes:(estado.historico&&Array.isArray(estado.historico.decisoes)?estado.historico.decisoes:[]).slice(-150)
		}
	};
}
function mapaGrafo(){
	return{
		nos:Object.fromEntries(Object.entries(espaco.nos).map(([id,n])=>[id,{x:n.x,y:n.y,nome:n.nome}])),
		arestas:espaco.arestas.map(r=>{const t=espaco.trechoEntre(r.a,r.b);return{a:r.a,b:r.b,linha:t&&t.linha?t.linha:[]}})
	};
}
function servir(porta=Number(process.env.ILHA_OBS_PORT||8811)){
	const servidor=http.createServer((req,res)=>{
		const u=req.url.split('?')[0];
		if(u==='/'||u==='/index.html'){
			try{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(ROOT,'observador-ilha.html')))}
			catch(e){res.writeHead(404);res.end('observador-ilha.html não encontrado')}
			return;
		}
		if(u==='/api/estado')return json(res,resumo(lerEstado()));
		if(u==='/api/mapa')return json(res,mapaGrafo());
		if(u==='/api/percepcao'){
			const id=new URL(req.url,'http://il.local').searchParams.get('ser')||'icaro';
			const e=lerEstado(),ser=e&&e.seres&&e.seres[id];
			return json(res,ser?{serId:id,local:ser.local,percepcoes:perceber(e,ser),cortex:cortex.contexto(ser)}:{serId:id,local:null,percepcoes:[],cortex:null});
		}
		if(u==='/mapa.png'){
			try{res.writeHead(200,{'content-type':'image/png'});res.end(fs.readFileSync(path.join(ROOT,'mapa-ilha-nova.png')))}
			catch(e){res.writeHead(404);res.end()}
			return;
		}
		res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});
		res.end('não encontrado');
	});
	return new Promise(ok=>servidor.listen(porta,()=>ok({servidor,porta:servidor.address().port,fechar:()=>new Promise(r=>servidor.close(r))})));
}
if(require.main===module)servir().then(({porta})=>console.log('OBSERVADOR (somente leitura) em http://localhost:'+porta)).catch(e=>{console.error(e);process.exitCode=1});
module.exports={servir,resumo,mapaGrafo,lerEstado};

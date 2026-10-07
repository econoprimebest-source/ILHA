const http=require('http'),fs=require('fs'),path=require('path');
const espaco=require('./espaco');
const eco=require('./ecossistema');
const PORT=Number(process.env.ILHA_VIS_PORT||8810);
const ROOT=__dirname, STATE=path.join(ROOT,'estado-ilha.json');
const LOGS=[path.join(ROOT,'logs','ilha-v2.jsonl'),path.join(ROOT,'logs','ilha.jsonl')];
// Corrige na exibição strings com UTF-8 duplo-decodificado ("JoÃ£o" → "João")
// que existem no estado gravado. Nenhum arquivo do mundo é alterado: a
// reparação acontece só no payload servido pela API.
function reparaString(s){
  if(typeof s!=='string'||!/[ÃÂâ]/.test(s))return s;
  let t=s.replace(/([ÃÂ])([\u0080-\u00FF])/g,(m,a,b)=>{
    const d=Buffer.from([a.charCodeAt(0),b.charCodeAt(0)]).toString('utf8');
    return d.length===1&&!d.includes('\uFFFD')?d:m;
  });
  t=t.replace(/â([\u0080-\u00FF])([\u0080-\u00FF])/g,(m,x,y)=>{
    const d=Buffer.from([0xE2,x.charCodeAt(0),y.charCodeAt(0)]).toString('utf8');
    return d.length===1&&!d.includes('\uFFFD')?d:m;
  });
  return t;
}
function reparaDeep(v){
  if(typeof v==='string')return reparaString(v);
  if(Array.isArray(v))return v.map(reparaDeep);
  if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v))o[k]=reparaDeep(v[k]);return o}
  return v;
}
function json(res,obj){const s=JSON.stringify(reparaDeep(obj));res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'});res.end(s)}
// Serve o estado como o MUNDO estaria logo após o próximo ciclo: uma cópia em
// memória passa por `preparar` (idempotente) — nada é gravado, nenhum arquivo
// do mundo é tocado. Assim o espectador vê Lara, a moradia do casal e a
// semente do diário sem alterar estado-ilha.json.
function readState(){
  try{
    const bruto=JSON.parse(fs.readFileSync(STATE,'utf8'));
    try{const copia=JSON.parse(JSON.stringify(bruto));eco.preparar(copia);return copia}
    catch(e){bruto.aviso_preparacao=e.message;return bruto}
  }catch(e){return {mundo:{tempo:{ciclo:0}},seres:{},descobertas:[],memorias:[],erro_estado:e.message}}
}
function readEvents(){for(const f of LOGS){try{if(!fs.existsSync(f))continue;const lines=fs.readFileSync(f,'utf8').trim().split(/\r?\n/).slice(-40);return lines.map(x=>{try{return JSON.parse(x)}catch{return {mensagem:x}}}).filter(Boolean)}catch{}}return []}
// REINICIAR O MUNDO — usado pelo botão do visualizador. Ordem importa:
// marcador PRIMEIRO (o loop de rodar-ilha.js para de gravar), backup de estado
// e log, novo mundo gravado de forma atômica, log zerado e marcador por último.
const MARCADOR=path.join(ROOT,'reinicio.pendente');
function reiniciarMundo(){
  const ts=new Date().toISOString().replace(/[:.]/g,'-');
  const dir=path.join(ROOT,'backups','reinicio-'+ts);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(MARCADOR,ts);
  try{
    if(fs.existsSync(STATE))fs.copyFileSync(STATE,path.join(dir,'estado-ilha.json'));
    if(fs.existsSync(LOGS[0]))fs.copyFileSync(LOGS[0],path.join(dir,'ilha-v2.jsonl'));
    const {novo}=require('./estado-v2');
    const {gravar}=require('./persistencia-v2');
    const fresh=novo();
    gravar(STATE,fresh);
    fs.writeFileSync(LOGS[0],'');
    return {ok:true,backup:dir,ciclo:fresh.mundo.tempo.ciclo,seres:Object.values(fresh.seres).map(s=>({id:s.id,status:s.status,local:s.local}))};
  }finally{
    try{if(fs.existsSync(MARCADOR))fs.unlinkSync(MARCADOR)}catch{}
  }
}
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/api/snapshot')return json(res,{estado:readState(),eventos:readEvents()});
  if(u.pathname==='/api/reiniciar'&&req.method==='POST'){
    try{return json(res,reiniciarMundo())}
    catch(e){res.writeHead(500,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({ok:false,erro:e.message}))}
  }
  if(u.pathname==='/api/mapa')return json(res,{nos:espaco.nos,arestas:espaco.arestas});
  if(u.pathname==='/mapa-ilha-referencia.png'){
    try {
      const image=fs.readFileSync(path.join(ROOT,'mapa-ilha-referencia.png'));
      res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});
      return res.end(image);
    } catch(e) { res.writeHead(404); return res.end('Imagem do mapa não encontrada'); }
  }
  if(u.pathname==='/mapa-ilha-nova.png'){
    try {
      const image=fs.readFileSync(path.join(ROOT,'mapa-ilha-nova.png'));
      res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});
      return res.end(image);
    } catch(e) { res.writeHead(404); return res.end('Imagem do mapa nova não encontrada'); }
  }
  if(u.pathname==='/'||u.pathname==='/visualizador-ilha.html'){
    try {
      const html=fs.readFileSync(path.join(ROOT,'visualizador-ilha.html'),'utf8');
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      return res.end(html);
    } catch(e) { res.writeHead(500); return res.end('Erro ao carregar visualizador: '+e.message); }
  }
  res.writeHead(404);res.end('Not found');
}).listen(PORT,'127.0.0.1',()=>console.log('Ilha Observatório: http://localhost:'+PORT));

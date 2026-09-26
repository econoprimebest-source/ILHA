const http=require('http'),fs=require('fs'),path=require('path');
const PORT=Number(process.env.ILHA_VIS_PORT||8810);
const ROOT=__dirname, STATE=path.join(ROOT,'estado-ilha.json');
const LOGS=[path.join(ROOT,'logs','ilha-v2.jsonl'),path.join(ROOT,'logs','ilha.jsonl')];
function json(res,obj){const s=JSON.stringify(obj);res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'});res.end(s)}
function readState(){try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch(e){return {mundo:{tempo:{ciclo:0}},seres:{},descobertas:[],memorias:[],erro_estado:e.message}}}
function readEvents(){for(const f of LOGS){try{if(!fs.existsSync(f))continue;const lines=fs.readFileSync(f,'utf8').trim().split(/\r?\n/).slice(-40);return lines.map(x=>{try{return JSON.parse(x)}catch{return {mensagem:x}}}).filter(Boolean)}catch{}}return []}
const html=fs.readFileSync(path.join(ROOT,'visualizador-ilha.html'),'utf8');
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/api/snapshot')return json(res,{estado:readState(),eventos:readEvents()});
  if(u.pathname==='/'||u.pathname==='/visualizador-ilha.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(html)}
  res.writeHead(404);res.end('Not found');
}).listen(PORT,'127.0.0.1',()=>console.log('Ilha Observatório: http://localhost:'+PORT));

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
function lerFilaInterv(){
  const p=path.join(ROOT,'intervencoes-fila.json');
  try{if(!fs.existsSync(p))return[];return JSON.parse(fs.readFileSync(p,'utf8'))||[]}catch{return[]}
}
function registrarIntervencao(op){
  const acontecimentos=require('./acontecimentos');
  const {gravar}=require('./persistencia-v2');
  const p=path.join(ROOT,'intervencoes-fila.json');
  const fila=lerFilaInterv();
  fila.push(op);
  fs.writeFileSync(p,JSON.stringify(fila),'utf8');
  let ev=null;
  if(fs.existsSync(STATE)&&!fs.existsSync(MARCADOR)){
    try{
      const bruto=JSON.parse(fs.readFileSync(STATE,'utf8'));
      eco.preparar(bruto);
      ev=acontecimentos.intervir(bruto,op);
      gravar(STATE,bruto);
      fs.writeFileSync(p,'[]','utf8');
    }catch(e){}
  }
  return {ok:true,evento:ev||op};
}
function lerCortexProfundo(serId){
  const dir=path.join(ROOT,'memorias',String(serId),'mecanismos');
  const out={serId,disponivel:fs.existsSync(dir),selfModel:[],tracos:[],trilhas:[],proveniencia:[]};
  if(!out.disponivel)return out;
  try{
    const sm=path.join(dir,'self-model.json');
    if(fs.existsSync(sm)){
      const d=JSON.parse(fs.readFileSync(sm,'utf8'));
      out.selfModel=(d.observacoes||d.afirmacoes||[]).slice(-5);
    }
  }catch{}
  try{
    const tr=path.join(dir,'tracos-icaro.json');
    if(fs.existsSync(tr)){
      const d=JSON.parse(fs.readFileSync(tr,'utf8'));
      out.tracos=Object.values(d.tracos||{}).slice(0,5);
    }
  }catch{}
  try{
    const pv=path.join(dir,'proveniencia.jsonl');
    if(fs.existsSync(pv)){
      out.proveniencia=fs.readFileSync(pv,'utf8').trim().split(/\r?\n/).slice(-6).map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean);
    }
  }catch{}
  return out;
}
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/api/snapshot')return json(res,{estado:readState(),eventos:readEvents()});
  if(u.pathname==='/api/feed'){const fm=require('./feed-microuniverso');const est=readState();return json(res,{resumo:fm.resumo(est),itens:fm.montarFeed(est,readEvents(),Number(u.searchParams.get('n'))||40),missoes:{ativas:(est.missoes&&est.missoes.ativas)||[],catalogo:require('./missoes').CATALOGO}})}
  if(u.pathname==='/api/missao'&&req.method==='POST'){let body='';req.on('data',c=>{body+=c;if(body.length>4096)req.destroy()});req.on('end',()=>{try{const o=JSON.parse(body||'{}');if(!readState().seres[o.serId])throw Error('personagem desconhecido');require('./missoes').enfileirar(o.serId,o.tipoId);return json(res,{ok:true,enfileirada:true})}catch(e){res.writeHead(400,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'});return res.end(JSON.stringify({ok:false,erro:e.message}))}});return}
  if(u.pathname==='/feed'||u.pathname==='/feed-microuniverso.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(ROOT,'feed-microuniverso.html')))}
  if(u.pathname==='/api/cortex'){
    const id=u.searchParams.get('ser')||'icaro';
    return json(res,lerCortexProfundo(id));
  }
  if(u.pathname==='/api/intervir'&&req.method==='POST'){
    let body='';
    req.on('data',c=>{body+=c;if(body.length>8192)req.destroy()});
    req.on('end',()=>{
      try{
        const op=JSON.parse(body||'{}');
        return json(res,registrarIntervencao(op));
      }catch(e){
        res.writeHead(400,{'content-type':'application/json; charset=utf-8'});
        return res.end(JSON.stringify({ok:false,erro:e.message}));
      }
    });
    return;
  }
  // FALAR DIRETO COM UM PERSONAGEM (clique no boneco): a mensagem do observador
  // entra na memória individual do ser (mesmo formato da fala entre habitantes)
  // e a RESPOSTA vem do próprio cérebro dele — mesmo caminho de decisão, mesmo
  // LLM, erro honesto se estiver fora. Nada de stand-in fingindo conversa.
  if(u.pathname==='/api/falar'&&req.method==='POST'){
    let body='';
    req.on('data',c=>{body+=c;if(body.length>8192)req.destroy()});
    req.on('end',async()=>{
      try{
        if(fs.existsSync(MARCADOR)){res.writeHead(503,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({ok:false,erro:'mundo reiniciando; tente de novo'}))}
        const o=JSON.parse(body||'{}');
        const msg=String(o.texto||'').trim().slice(0,500);
        if(!o.id||!msg){res.writeHead(400,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({ok:false,erro:'id e texto são obrigatórios'}))}
        const estado=readState();
        const ser=estado.seres&&estado.seres[o.id];
        if(!ser){res.writeHead(404,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({ok:false,erro:'personagem não encontrado: '+o.id}))}
        const {gravar}=require('./persistencia-v2');
        // 1) ENTREGA — a fala entra na memória individual (fonte declarada).
        ser.memoria=Array.isArray(ser.memoria)?ser.memoria:[];
        ser.memoria.push({tipo:'fala',de:'observador',texto:'Rafael te disse: "'+msg+'"',ciclo:estado.mundo.tempo.ciclo});
        ser.memoria=ser.memoria.slice(-200);
        gravar(STATE,estado);
        // 2) RESPOSTA — cérebro do próprio ser, com o contexto dele. Falha de
        //    LLM aqui é honesta: mensagem guardada, sem resposta inventada.
        try{
          const motor=require('./motor-v2');
          const cp=require('./cerebro-personagem');
          const cerebro=require('./cerebro');
          const possiveis=motor.acoes(estado,ser);
          const ctx=cp.montarContexto(estado,ser,possiveis);
          // Enum de UMA opção: o contrato JSON do LLM é reusado só para extrair
          // a "fala" — nada do mundo é executado com esta resposta.
          const dec=await cerebro.decidir(ctx,[{id:'conversar',descricao:'Falar com Rafael, que está aqui com você agora'}],ser,{conversa:
            '[CONVERSA — Rafael está com você AGORA e te chamou pelo nome. Responda somente com o campo "fala", na sua própria voz, como se respondesse em voz alta. Isto NÃO é um ciclo de ação: nada do mundo será executado com esta resposta, então a ação "conversar" é só o envelope da sua fala.]'});
          const resposta=String(dec.fala||dec.motivo||'').trim().slice(0,240);
          if(!resposta)throw Error('cérebro respondeu vazio');
          ser.ultimaFala=resposta;
          ser.ultimaFalaCiclo=estado.mundo.tempo.ciclo;
          ser.memoria.push({tipo:'fala',de:'eu',texto:'Respondi a Rafael: "'+resposta+'"',ciclo:estado.mundo.tempo.ciclo});
          ser.memoria=ser.memoria.slice(-200);
          gravar(STATE,estado);
          return json(res,{ok:true,resposta,modelo:dec.modelo||cerebro.MODELO||null});
        }catch(e){
          return json(res,{ok:false,guardada:true,erro:'Mensagem guardada, mas o cérebro não respondeu agora: '+(e&&e.message?e.message:e)});
        }
      }catch(e){
        res.writeHead(400,{'content-type':'application/json; charset=utf-8'});
        return res.end(JSON.stringify({ok:false,erro:e.message}));
      }
    });
    return;
  }
  if(u.pathname==='/api/reiniciar'&&req.method==='POST'){
    try{return json(res,reiniciarMundo())}
    catch(e){res.writeHead(500,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({ok:false,erro:e.message}))}
  }
  // FRAME DA VISÃO (opt-in `ILHA_VISAO=1` no mundo) — o visualizador manda o
  // canvas como data URL e aqui gravamos `ultimo-frame.json`, único arquivo
  // que `visao.js` lê. Só o frame é escrito; nada do estado é tocado.
  if(u.pathname==='/api/frame'&&req.method==='POST'){
    let body='';
    req.on('data',c=>{body+=c;if(body.length>10*1024*1024){try{res.writeHead(413)}catch(e){}req.destroy()}});
    req.on('end',()=>{
      try{
        const img=JSON.parse(body||'{}').image;
        if(typeof img!=='string'||!img.startsWith('data:image/')){
          res.writeHead(400,{'content-type':'application/json'});
          return res.end(JSON.stringify({ok:false,erro:'image (data URL) ausente'}));
        }
        fs.writeFileSync(path.join(ROOT,'ultimo-frame.json'),JSON.stringify({image:img,quando:new Date().toISOString()}));
        return json(res,{ok:true});
      }catch(e){
        res.writeHead(400,{'content-type':'application/json'});
        return res.end(JSON.stringify({ok:false,erro:e.message}));
      }
    });
    return;
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

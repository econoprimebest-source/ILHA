const http=require('http'),fs=require('fs'),path=require('path');
// Carrega automaticamente variáveis de .env local (se existir)
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const l of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"](.*)['"]$/, '$1').trim();
    }
  }
} catch (e) {}
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
  // ROTA DE COMANDO DIRETO DO CRIADOR (RAFAEL)
  if(u.pathname==='/api/comando'&&req.method==='POST'){
    let body='';
    req.on('data',c=>{body+=c;if(body.length>8192)req.destroy()});
    req.on('end',()=>{
      try{
        const payload=JSON.parse(body||'{}');
        const serId=String(payload.serId||payload.ser||payload.personagem||'elara').toLowerCase();
        const comando=String(payload.comando||payload.ordem||payload.texto||'').trim();
        const de=String(payload.de||payload.autor||'Rafael (Criador)').trim();
        if(!comando)throw new Error('Comando vazio');
        const cc=require('./comandos-criador');
        const cmd=cc.registrarComando(serId,comando,de);
        return json(res,{ok:true,mensagem:`Ordem enviada com sucesso para ${cmd.serId}: "${cmd.comando}"`,comando:cmd});
      }catch(e){
        res.writeHead(400,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'});
        return res.end(JSON.stringify({ok:false,erro:e.message}));
      }
    });
    return;
  }
  if(u.pathname==='/api/comandos'){
    const cc=require('./comandos-criador');
    return json(res,{ok:true,comandos:cc.listarComandos()});
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
  // GATILHO DE INTERVENÇÃO DO PÚBLICO ("Milagre / Suprimento do Espectador")
  if((u.pathname==='/ilha/intervencao'||u.pathname==='/api/intervencao-publico')&&req.method==='POST'){
    let body='';
    req.on('data',c=>{body+=c;if(body.length>8192)req.destroy()});
    req.on('end',()=>{
      try{
        const payload=JSON.parse(body||'{}');
        const espectador=String(payload.espectador||'Espectador Anônimo').trim().slice(0,50);
        const tipo=String(payload.tipo||'lenha_fogueira').toLowerCase();
        const estado=readState();
        const eco=require('./ecossistema');
        eco.preparar(estado);
        const {gravar}=require('./persistencia-v2');

        let msgEfeito='';
        const evento={tipo:'milagre',espectador,subTipo:tipo,quando:new Date().toISOString()};

        if(tipo==='lenha_fogueira'){
          estado.mundo.ecossistema.fogueira=estado.mundo.ecossistema.fogueira||{acesa:true,lenha:20,calor:80};
          estado.mundo.ecossistema.fogueira.acesa=true;
          estado.mundo.ecossistema.fogueira.lenha=Math.min(60,(estado.mundo.ecossistema.fogueira.lenha||10)+20);
          msgEfeito=`${espectador} enviou um feixe de lenha e brasa dourada para a Fogueira Central!`;
        } else if(tipo==='chuva'){
          estado.mundo.clima='chuva';
          if(estado.mundo.ecossistema.agua){
            estado.mundo.ecossistema.agua.nascente=Math.min(estado.mundo.ecossistema.agua.limite||60,(estado.mundo.ecossistema.agua.nascente||30)+15);
          }
          msgEfeito=`${espectador} invocou uma chuva mansa e revigorante sobre as nascentes e plantações!`;
        } else if(tipo==='cura'){
          if(estado.seres){
            Object.values(estado.seres).forEach(ser=>{
              if(ser.status!=='morto'){
                ser.necessidades.saude=Math.min(100,(ser.necessidades.saude||70)+25);
                ser.necessidades.energia=Math.min(100,(ser.necessidades.energia||50)+30);
                ser.necessidades.medo=Math.max(0,(ser.necessidades.medo||0)-20);
                ser.memoria=Array.isArray(ser.memoria)?ser.memoria:[];
                ser.memoria.push({
                  tipo:'milagre',
                  de:espectador,
                  texto:`Uma luz dourada desceu do céu: ${espectador} restaurou suas forças com um milagre de cura!`,
                  ciclo:estado.mundo.tempo.ciclo
                });
                ser.memoria=ser.memoria.slice(-200);
              }
            });
          }
          msgEfeito=`${espectador} emanou um milagre de cura que restaurou a vitalidade de todos os sobreviventes!`;
        } else {
          msgEfeito=`${espectador} enviou uma bênção de esperança aos sobreviventes.`;
        }

        evento.mensagem=msgEfeito;
        estado.mundo.acontecimentos=Array.isArray(estado.mundo.acontecimentos)?estado.mundo.acontecimentos:[];
        estado.mundo.acontecimentos.push({
          id:'intervencao-'+Date.now(),
          tipo:'milagre_publico',
          espectador,
          subTipo:tipo,
          efeito:msgEfeito,
          inicio:estado.mundo.tempo.ciclo,
          duracao:4,
          ativo:true,
          locais:['fogueira','acampamento']
        });

        fs.writeFileSync(path.join(ROOT,'ultimo-milagre.json'),JSON.stringify(evento));
        gravar(STATE,estado);

        return json(res,{ok:true,espectador,tipo,mensagem:msgEfeito});
      }catch(e){
        res.writeHead(500,{'content-type':'application/json; charset=utf-8'});
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
  if(u.pathname==='/api/ondemand'&&req.method==='POST'){
    if(fs.existsSync(MARCADOR)){res.writeHead(503,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({ok:false,erro:'mundo reiniciando'}));}
    (async()=>{
      try{
        const il=require('./ilha');
        const {rodada}=require('./rodada-autonoma');
        const {gravar,anexar}=require('./persistencia-v2');
        const estado=il.carregarEstado();
        const r=await rodada(estado,{acontecimentos:true});
        gravar(STATE,estado);
        if(r&&Array.isArray(r.eventos)){
          r.eventos.forEach((e,ord)=>anexar(LOGS[0],{
            ciclo:r.ciclo,ord,serId:e.serId,nome:e.nome,
            acao:e.decisao.acao,motivo:e.decisao.motivo,
            ...(e.decisao.fala?{fala:e.decisao.fala}:{}),
            local:e.localFinal,status:e.statusFinal,consequencia:e.consequencia
          }));
        }
        return json(res,{ok:true,ciclo:r.ciclo,eventos:r.eventos});
      }catch(err){
        res.writeHead(500,{'content-type':'application/json; charset=utf-8'});
        return res.end(JSON.stringify({ok:false,erro:err.message}));
      }
    })();
    return;
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
  if(u.pathname==='/mapa-ilha-evertrail.png' || u.pathname==='/mapa-ilha-evertrail.jpg'){
    try {
      const p = fs.existsSync(path.join(ROOT,'mapa-ilha-evertrail.png')) ? path.join(ROOT,'mapa-ilha-evertrail.png') : path.join(ROOT,'mapa-ilha-evertrail.jpg');
      const image=fs.readFileSync(p);
      res.writeHead(200,{'content-type':'image/jpeg','cache-control':'no-store'});
      return res.end(image);
    } catch(e) { res.writeHead(404); return res.end('Imagem do mapa evertrail nao encontrada'); }
  }
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
  if(u.pathname.endsWith('.glb')){
    try {
      const fileName = path.basename(decodeURIComponent(u.pathname));
      const p = fs.existsSync(path.join(ROOT, fileName)) ? path.join(ROOT, fileName) : path.join('C:\\Users\\Rafael\\Downloads', fileName);
      if(fs.existsSync(p)){
        const glb = fs.readFileSync(p);
        res.writeHead(200, {'content-type':'model/gltf-binary', 'cache-control':'public, max-age=86400', 'access-control-allow-origin':'*'});
        return res.end(glb);
      }
      res.writeHead(404); return res.end('GLB nao encontrado');
    } catch(e) { res.writeHead(404); return res.end('Erro ao servir GLB: '+e.message); }
  }
  if(u.pathname==='/pixi.min.js'){
    try {
      const js=fs.readFileSync(path.join(ROOT,'pixi.min.js'));
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'public, max-age=86400'});
      return res.end(js);
    } catch(e) { res.writeHead(404); return res.end('pixi.min.js nao encontrado'); }
  }
  if(u.pathname==='/motor-sprites-ilha.js'){
    try {
      const js=fs.readFileSync(path.join(ROOT,'motor-sprites-ilha.js'));
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});
      return res.end(js);
    } catch(e) { res.writeHead(404); return res.end('motor-sprites-ilha.js nao encontrado'); }
  }
  if(u.pathname==='/motor-pixi-ilha.js'){
    try {
      const js=fs.readFileSync(path.join(ROOT,'motor-pixi-ilha.js'));
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});
      return res.end(js);
    } catch(e) { res.writeHead(404); return res.end('motor-pixi-ilha.js nao encontrado'); }
  }
  if(u.pathname==='/motor-three-ilha.js'){
    try {
      const js=fs.readFileSync(path.join(ROOT,'motor-three-ilha.js'));
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});
      return res.end(js);
    } catch(e) { res.writeHead(404); return res.end('motor-three-ilha.js nao encontrado'); }
  }
  if(u.pathname==='/motor-assets-ilha.js'){
    try {
      const js=fs.readFileSync(path.join(ROOT,'motor-assets-ilha.js'));
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});
      return res.end(js);
    } catch(e) { res.writeHead(404); return res.end('motor-assets-ilha.js nao encontrado'); }
  }
  if(u.pathname.startsWith('/assets/')){
    try {
      const seguro = path.normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[\/\\])+/, '');
      const arqPath = path.join(ROOT, seguro);
      if(!arqPath.startsWith(path.join(ROOT, 'assets'))){ res.writeHead(403); return res.end('Acesso proibido'); }
      if(!fs.existsSync(arqPath) || fs.statSync(arqPath).isDirectory()){ res.writeHead(404); return res.end('Arquivo nao encontrado'); }
      const ext = path.extname(arqPath).toLowerCase();
      const mime = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.json':'application/json', '.xml':'application/xml' }[ext] || 'application/octet-stream';
      res.writeHead(200,{'content-type':mime,'cache-control':'public, max-age=86400','access-control-allow-origin':'*'});
      return res.end(fs.readFileSync(arqPath));
    } catch(e) { res.writeHead(404); return res.end('Erro: '+e.message); }
  }
  // --- MODELOS EXPERIMENTAIS (HTML & ASSETS) ---
  if(u.pathname==='/hub'||u.pathname==='/hub-modelos.html'){
    try {
      const html=fs.readFileSync(path.join(ROOT,'hub-modelos.html'),'utf8');
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      return res.end(html);
    } catch(e) { res.writeHead(500); return res.end('Erro: '+e.message); }
  }
  if(u.pathname==='/visualizador-modelo1.html'){
    try {
      const html=fs.readFileSync(path.join(ROOT,'visualizador-modelo1.html'),'utf8');
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      return res.end(html);
    } catch(e) { res.writeHead(500); return res.end('Erro: '+e.message); }
  }
  if(u.pathname==='/visualizador-modelo2.html'){
    try {
      const html=fs.readFileSync(path.join(ROOT,'visualizador-modelo2.html'),'utf8');
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      return res.end(html);
    } catch(e) { res.writeHead(500); return res.end('Erro: '+e.message); }
  }
  if(u.pathname==='/visualizador-modelo3.html'){
    try {
      const html=fs.readFileSync(path.join(ROOT,'visualizador-modelo3.html'),'utf8');
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      return res.end(html);
    } catch(e) { res.writeHead(500); return res.end('Erro: '+e.message); }
  }
  if(u.pathname==='/motor-three-rpg.js'){
    try {
      const js=fs.readFileSync(path.join(ROOT,'motor-three-rpg.js'),'utf8');
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});
      return res.end(js);
    } catch(e) { res.writeHead(404); return res.end('motor-three-rpg.js nao encontrado'); }
  }

  // --- MODELO 1: APIS ---
  if(u.pathname==='/api/modelo1/snapshot'){
    const m1 = require('./modelo1-estoque');
    return json(res, m1.carregarEstadoM1());
  }
  if(u.pathname==='/api/modelo1/ciclo' && req.method==='POST'){
    const m1 = require('./modelo1-estoque');
    const c1 = require('./cerebro-modelo1');
    const est = m1.carregarEstadoM1();
    const ser = est.seres.icaro || Object.values(est.seres)[0];
    c1.decidirM1(est, ser).then(dec => {
      const r = m1.executarAcaoM1(est, ser, dec.acao);
      est.mundo.tempo.ciclo = (est.mundo.tempo.ciclo || 1) + 1;
      m1.salvarEstadoM1(est);
      return json(res, { ok: true, estado: est, decisao: { serNome: ser.nome, acao: dec.acao, motivo: dec.motivo, resultado: r } });
    }).catch(err => {
      const possiveis = m1.acoesM1(est, ser);
      const acaoFallback = possiveis[Math.floor(Math.random() * possiveis.length)].id;
      const r = m1.executarAcaoM1(est, ser, acaoFallback);
      est.mundo.tempo.ciclo = (est.mundo.tempo.ciclo || 1) + 1;
      m1.salvarEstadoM1(est);
      return json(res, { ok: true, estado: est, decisao: { serNome: ser.nome, acao: acaoFallback, motivo: 'Decisão autônoma reflexiva', resultado: r } });
    });
    return;
  }
  if(u.pathname==='/api/modelo1/visitante' && req.method==='POST'){
    const m1 = require('./modelo1-estoque');
    const est = m1.carregarEstadoM1();
    const vis = m1.gerarVisitanteNáufrago(est);
    m1.salvarEstadoM1(est);
    return json(res, { ok: true, visitante: vis });
  }
  if(u.pathname==='/api/modelo1/construir' && req.method==='POST'){
    const m1 = require('./modelo1-estoque');
    const est = m1.carregarEstadoM1();
    const desp = est.mundo.despensaComunitaria;
    if((desp.madeira||0) >= 20 && (desp.pedra||0) >= 10){
      desp.madeira -= 20;
      desp.pedra -= 10;
      const count = (est.mundo.construcoes||[]).length + 1;
      est.mundo.construcoes.push({
        id: 'cabana_' + count,
        tipo: 'cabana',
        nome: 'Cabana Nova #' + count,
        local: 'acampamento',
        x: 0.35 + (count * 0.05),
        y: 0.40 + (count * 0.05)
      });
      m1.salvarEstadoM1(est);
      return json(res, { ok: true, mensagem: `Cabana erguida com sucesso! (Madeira: ${desp.madeira}, Pedra: ${desp.pedra})` });
    } else {
      return json(res, { ok: false, erro: `Recursos insuficientes na despensa. Madeira: ${desp.madeira||0}/20, Pedra: ${desp.pedra||0}/10.` });
    }
  }

  // --- MODELO 2: APIS ---
  if(u.pathname==='/api/modelo2/snapshot'){
    const m2 = require('./modelo2-affordances');
    return json(res, m2.carregarEstadoM2());
  }
  if(u.pathname==='/api/modelo2/ciclo' && req.method==='POST'){
    const m2 = require('./modelo2-affordances');
    const c2 = require('./cerebro-modelo2');
    const est = m2.carregarEstadoM2();
    const ser = est.seres.icaro || Object.values(est.seres)[0];
    c2.decidirM2(est, ser).then(dec => {
      const r = m2.executarAcaoM2(est, ser, dec.acao);
      est.mundo.tempo.ciclo = (est.mundo.tempo.ciclo || 1) + 1;
      m2.salvarEstadoM2(est);
      return json(res, { ok: true, estado: est, decisao: { serNome: ser.nome, acao: dec.acao, motivo: dec.motivo, resultado: r } });
    }).catch(err => {
      const possiveis = m2.acoesM2(est, ser);
      const acaoFallback = possiveis[Math.floor(Math.random() * possiveis.length)].id;
      const r = m2.executarAcaoM2(est, ser, acaoFallback);
      est.mundo.tempo.ciclo = (est.mundo.tempo.ciclo || 1) + 1;
      m2.salvarEstadoM2(est);
      return json(res, { ok: true, estado: est, decisao: { serNome: ser.nome, acao: acaoFallback, motivo: 'Reflexão autônoma espontânea', resultado: r } });
    });
    return;
  }
  if(u.pathname==='/api/modelo2/recado' && req.method==='POST'){
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const m2 = require('./modelo2-affordances');
        const est = m2.carregarEstadoM2();
        est.mundo.muralRecados.push({
          autor: payload.autor || 'Observador',
          texto: payload.texto || 'Aviso para a comunidade.',
          ciclo: est.mundo.tempo.ciclo || 1
        });
        m2.salvarEstadoM2(est);
        return json(res, { ok: true });
      } catch(e) {
        res.writeHead(400); return res.end(JSON.stringify({ ok: false, erro: e.message }));
      }
    });
    return;
  }

  // --- MODELO 3: APIS ---
  if(u.pathname==='/api/modelo3/snapshot'){
    const m3 = require('./modelo3-rpg');
    return json(res, m3.carregarEstadoM3());
  }
  if(u.pathname==='/api/modelo3/ciclo' && req.method==='POST'){
    const m3 = require('./modelo3-rpg');
    const c3 = require('./cerebro-modelo3');
    const est = m3.carregarEstadoM3();
    const ser = est.seres.icaro || Object.values(est.seres)[0];
    c3.decidirM3(est, ser).then(dec => {
      const r = m3.executarAcaoM3(est, ser, dec.acao);
      est.mundo.tempo.ciclo = (est.mundo.tempo.ciclo || 1) + 1;
      m3.salvarEstadoM3(est);
      return json(res, { ok: true, estado: est, decisao: { serNome: ser.nome, acao: dec.acao, motivo: dec.motivo, resultado: r } });
    }).catch(err => {
      const possiveis = m3.acoesM3(est, ser);
      const acaoFallback = possiveis[Math.floor(Math.random() * possiveis.length)].id;
      const r = m3.executarAcaoM3(est, ser, acaoFallback);
      est.mundo.tempo.ciclo = (est.mundo.tempo.ciclo || 1) + 1;
      m3.salvarEstadoM3(est);
      return json(res, { ok: true, estado: est, decisao: { serNome: ser.nome, acao: acaoFallback, motivo: 'Iniciativa direta de pioneiro', resultado: r } });
    });
    return;
  }
  if(u.pathname==='/api/modelo3/construir' && req.method==='POST'){
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const m3 = require('./modelo3-rpg');
        const est = m3.carregarEstadoM3();
        const ser = est.seres.icaro || Object.values(est.seres)[0];
        const r = m3.executarAcaoM3(est, ser, payload.tipo);
        m3.salvarEstadoM3(est);
        return json(res, { ok: true, mensagem: r.mensagem });
      } catch(e) {
        res.writeHead(400); return res.end(JSON.stringify({ ok: false, erro: e.message }));
      }
    });
    return;
  }
  if(u.pathname==='/api/modelo3/mercador' && req.method==='POST'){
    const m3 = require('./modelo3-rpg');
    const est = m3.carregarEstadoM3();
    est.mundo.economiaRpg.moedas = (est.mundo.economiaRpg.moedas || 0) + 25;
    est.mundo.economiaRpg.madeira = (est.mundo.economiaRpg.madeira || 0) + 10;
    est.mundo.economiaRpg.pedra = (est.mundo.economiaRpg.pedra || 0) + 10;
    m3.salvarEstadoM3(est);
    return json(res, { ok: true, mensagem: 'Nau mercante ancorou na baía e realizou comércio de suprimentos (+25 Moedas, +10 Madeira, +10 Pedra)!' });
  }

  if(u.pathname==='/'||u.pathname==='/visualizador-ilha.html'){
    try {
      const html=fs.readFileSync(path.join(ROOT,'visualizador-ilha.html'),'utf8');
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      return res.end(html);
    } catch(e) { res.writeHead(500); return res.end('Erro ao carregar visualizador: '+e.message); }
  }
  res.writeHead(404);res.end('Not found');
}).listen(PORT,'0.0.0.0',()=>console.log('Ilha Observatório: http://0.0.0.0:'+PORT));

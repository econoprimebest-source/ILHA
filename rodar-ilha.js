'use strict';require('./memoria-personagem').ativar();const il=require('./ilha');const {rodada}=require('./rodada-autonoma');const {gravar,anexar}=require('./persistencia-v2');const diretor=require('./diretor-llm');const fs=require('fs');const path=require('path');const ARQ=il.ARQ_ESTADO;const LOG=il.ARQ_LOG;const INTERVALO=Number(process.env.ILHA_INTERVALO||5000);
// CAMPADA COGNITIVA — OPT-IN (`ILHA_COG=1`): sem a flag o loop é EXATAMENTE o
// de antes (sem cérebro cognitivo plugado, sem mecanismos). Com a flag, a
// camada é ativada e cada personagem ganha seu próprio cérebro (instância
// presa ao id, com fallback do cérebro anterior — `ILHA_COG_FALLBACK`).
const COG=process.env.ILHA_COG==='1';let cogMod=null,cerebros=null,cerebrosIds='';
if(COG){try{cogMod=require('./cerebro-cognitivo');require('./cognicao').ativar();console.log('[COG] camada cognitiva ON (ILHA_COG=1)')}catch(e){console.error('[COG] camada indisponível seguindo sem ela:',e&&e.message);cogMod=null}}
function cerebrosDe(estado){if(!cogMod)return undefined;const ids=Object.keys(estado.seres||{}).sort().join(',');if(!cerebros||cerebrosIds!==ids){cerebros=cogMod.criarTodos(ids.split(',').filter(Boolean));cerebrosIds=ids}return cerebros}
// REINÍCIO PELO VISUALIZADOR: o servidor cria `reinicio.pendente` ANTES de
// reescrever estado/log e só apaga depois de terminar. O loop nunca grava por
// cima de um reinício em andamento (nem no início nem antes de gravar).
const MARCADOR=path.join(__dirname,'reinicio.pendente');
const FILA_INTERV=path.join(__dirname,'intervencoes-fila.json');
const acontecimentos=require('./acontecimentos');
function aplicarFilaIntervencoes(estado){
  try{
    if(!fs.existsSync(FILA_INTERV))return;
    const texto=fs.readFileSync(FILA_INTERV,'utf8').trim();
    if(!texto)return;
    const lista=JSON.parse(texto);
    fs.writeFileSync(FILA_INTERV,'[]','utf8');
    if(Array.isArray(lista)){
      for(const op of lista){
        try{
          const ev=acontecimentos.intervir(estado,op);
          console.log('[DIRETOR] Intervenção aplicada no mundo ('+(op.origem||'espectador')+'): '+ev.tipo+' em '+ev.locais.join(',')+(ev.mensagem?' -> "'+ev.mensagem+'"':''));
        }catch(e){console.error('[DIRETOR] Intervenção ignorada:',e.message)}
      }
    }
  }catch(e){}
}
function marcadorAtivo(){try{if(!fs.existsSync(MARCADOR))return false;const idade=Date.now()-fs.statSync(MARCADOR).mtimeMs;if(idade>60000){fs.unlinkSync(MARCADOR);return false}return true}catch(e){return false}}
let ocupado=false;async function ciclo(){if(ocupado)return;ocupado=true;try{if(marcadorAtivo())return;const estado=il.carregarEstado();if(diretor&&estado.mundo&&estado.mundo.tempo){await diretor.agir(estado,estado.mundo.tempo.ciclo||0).catch(e=>console.error('[DIRETOR-LLM]',e.message));}aplicarFilaIntervencoes(estado);const r=await rodada(estado,{acontecimentos:true,...(COG&&cogMod?{cerebros:cerebrosDe(estado)}:{})});if(marcadorAtivo())return;gravar(ARQ,estado);r.eventos.forEach((e,ord)=>anexar(LOG,{ciclo:r.ciclo,ord,serId:e.serId,nome:e.nome,acao:e.decisao.acao,motivo:e.decisao.motivo,...(e.decisao.fala?{fala:e.decisao.fala}:{}),local:e.localFinal,status:e.statusFinal,consequencia:e.consequencia}));console.log('CICLO '+r.ciclo);for(const e of r.eventos)console.log('  '+e.nome+' -> '+e.decisao.acao+' | '+e.localFinal+' | '+e.decisao.motivo+(e.decisao.fala?' | 💬 "'+e.decisao.fala+'"':'')); }catch(e){console.error('ERRO NA RODADA:',e.stack||e)}finally{ocupado=false}}async function loop(){await ciclo();setTimeout(loop,INTERVALO)}loop();console.log('ILHA AUTÔNOMA RODANDO — intervalo '+INTERVALO+' ms');

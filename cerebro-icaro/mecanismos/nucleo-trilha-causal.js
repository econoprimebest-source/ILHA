// nucleo-trilha-causal.js
// TRILHA-CAUSAL (08/10/2026)
'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const TRILHAS_PATH=path.join(__dirname,'trilhas-causais.jsonl');
function gerarId(){return 'decisao-'+Date.now().toString(36)+'-'+crypto.randomBytes(4).toString('hex');}
function agora(){return new Date().toISOString();}
function hashCurto(o){return crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0,16);}
function append(l){fs.appendFileSync(TRILHAS_PATH,JSON.stringify(l)+'\n','utf8');}
function lerTodas(){
  if(!fs.existsSync(TRILHAS_PATH))return [];
  const trilhas=[];
  const patches=new Map();
  for(const linha of fs.readFileSync(TRILHAS_PATH,'utf8').split('\n').filter(Boolean)){
    try{
      const item=JSON.parse(linha);
      if(item&&item.tipo==='patch'&&item.decision_id){
        if(!patches.has(item.decision_id))patches.set(item.decision_id,[]);
        patches.get(item.decision_id).push(item);
      }else if(item&&item.decision_id)trilhas.push(item);
    }catch(e){/* ignora linha inválida sem alterar o arquivo */}
  }
  for(const trilha of trilhas){
    for(const patch of patches.get(trilha.decision_id)||[]){
      for(const [campo,itens] of Object.entries(patch.adicionar||{})){
        if(!Array.isArray(trilha[campo]))trilha[campo]=[];
        for(const item of itens)if(!trilha[campo].includes(item))trilha[campo].push(item);
      }
      for(const [campo,valor] of Object.entries(patch.mesclar||{}))trilha[campo]=Object.assign({},trilha[campo]||{},valor||{});
      Object.assign(trilha,patch.definir||{});
    }
  }
  return trilhas;
}
function appendPatch(id,patch){append(Object.assign({tipo:'patch',decision_id:id,timestamp:agora()},patch));}
function acharIndex(id,t){for(let i=0;i<t.length;i++)if(t[i].decision_id===id)return i;return -1;}
function iniciarTrilha(ctx){const id=gerarId();append({decision_id:id,timestamp_inicio:agora(),timestamp_fim:null,context_hash:hashCurto(ctx||{}),opcoes:(ctx&&ctx.opcoes)||[],retrieved:[],fatos:[],attention_gate:{},associations:[],self_model_used:[],decision:null,confidence:null,outcome:null,resposta:null,fechada:false});return id;}
function anexarLista(d,c,itens){const t=lerTodas();const i=acharIndex(d,t);if(i<0)return false;const existentes=new Set(t[i][c]||[]);const l=[];for(const it of (Array.isArray(itens)?itens:[itens])){const id=(typeof it==='string')?it:(it&&(it.id||it.chave))||String(it);if(!existentes.has(id)){existentes.add(id);l.push(id);}}if(l.length)appendPatch(d,{adicionar:{[c]:l}});return true;}
function anexarRecuperado(id,itens){return anexarLista(id,'retrieved',itens);}
function anexarFatos(id,itens){return anexarLista(id,'fatos',itens);}
function anexarSelfModel(id,itens){return anexarLista(id,'self_model_used',itens);}
function anexarAssociacoes(id,itens){return anexarLista(id,'associations',itens);}
function anexarAttentionGate(d,g){const t=lerTodas();const i=acharIndex(d,t);if(i<0)return false;appendPatch(d,{mesclar:{attention_gate:g||{}}});return true;}
function concluirTrilha(d,o){const t=lerTodas();const i=acharIndex(d,t);if(i<0)return false;o=o||{};const definir={timestamp_fim:agora(),fechada:true};for(const campo of ['decision','confidence','outcome'])if(o[campo]!==undefined)definir[campo]=o[campo];if(o.resposta!==undefined)definir.resposta=String(o.resposta).slice(0,2000);appendPatch(d,{definir});return true;}
function auditarDecisao(id){const t=lerTodas();const i=acharIndex(id,t);if(i<0)return null;const tr=t[i];const rec=tr.retrieved.length;const us=Object.keys(tr.attention_gate).filter(k=>tr.attention_gate[k]&&tr.attention_gate[k].usado).length;return {trilha:tr,resumo:{recuperados:rec,usados:us,taxa_uso:rec>0?(us/rec):0,fechada:tr.fechada}};}
function listarRecentes(n){return lerTodas().slice(-(n||10));}
function estatisticas(){const t=lerTodas();const total=t.length;const fechadas=t.filter(x=>x.fechada).length;const com_recuperados=t.filter(x=>x.retrieved.length>0).length;const com_gate=t.filter(x=>Object.keys(x.attention_gate).length>0).length;let soma=0,n=0;for(const tr of t){const rec=tr.retrieved.length;if(rec===0)continue;const us=Object.keys(tr.attention_gate).filter(k=>tr.attention_gate[k]&&tr.attention_gate[k].usado).length;soma+=(us/rec);n++;}return {total,fechadas,abertas:total-fechadas,com_recuperados,com_gate,taxa_uso_media:n>0?(soma/n):0};}
module.exports={TRILHAS_PATH,iniciarTrilha,anexarRecuperado,anexarFatos,anexarSelfModel,anexarAssociacoes,anexarAttentionGate,concluirTrilha,auditarDecisao,listarRecentes,estatisticas};

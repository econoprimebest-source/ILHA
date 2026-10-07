'use strict';
const {avancar,regenerar,validar}=require('./estado-v2');const {atualizar}=require('./seres');const {perceber}=require('./percepcao-v2');const espaco=require('./espaco');
function acoes(e,s){const x=e.mundo.ecossistema;const base=[['beber','Beber água',s.inventario.agua>=1],['comer','Comer alimento',s.inventario.alimento>=1],['descansar','Descansar',true],['observar','Observar local',true]];
// ESPAÇO: o grafo do mundo conecta os locais por trilhas — escolher para onde
// ir é decisão do personagem; aqui só aparece o caminho possível.
for(const no of espaco.locais()){if(no===s.local)continue;base.push(no===s.casa?['ir_casa','Voltar para casa',true]:['ir_'+no,'Caminhar até '+espaco.nome(no),true])}
base.push(['esperar','Aguardar',true],['conviver','Conversar com alguém',Object.values(e.seres||{}).some(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local)],['falar','Falar com alguém',Object.values(e.seres||{}).some(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local)]);
// VIDA DIÁRIA: banho só existe onde há água de banho; arrumar casa só na
// própria moradia. Ambas são POSSIBILIDADES — o cérebro escolhe se quer.
base.push(['banho','Tomar banho',['rio','cachoeira','mar'].includes(s.local)]);
base.push(['arrumar_casa',s.local==='acampamento'?'Arrumar o acampamento':'Arrumar a casa',!!s.casa&&s.local===s.casa]);
const a=base.filter(v=>v[2]).map(([id,descricao])=>({id,descricao}));if(s.local==='rio'){a.push({id:'coletar_agua',descricao:'Coletar água'});if(x.peixes.rio.populacao>0)a.push({id:'pescar',descricao:'Tentar pescar'})}if(s.local==='bosque'&&Object.values(x.arvores).some(t=>t.local==='bosque'&&t.frutos>=.5))a.push({id:'colher_frutas',descricao:'Colher frutos'});if(s.local==='floresta'&&x.madeira.floresta>0)a.push({id:'coletar_madeira',descricao:'Coletar madeira caída'});
// NOVA AÇÃO: CAÇAR (Alta dificuldade, recompensa potencialmente maior que peixe)
if((s.local==='floresta'||s.local==='bosque')&&Object.values(x.fauna||{}).some(f=>f.populacao>0&&f.local===s.local))a.push({id:'caçar',descricao:'Tentar caçar um animal'});if(s.abrigo<2&&s.inventario.madeira>=2)a.push({id:'melhorar_abrigo',descricao:'Melhorar abrigo'});
// EM TRAJETO: o cérebro pode continuar, rerotear (ir_*) ou agir localmente.
if(s.deslocamento)a.unshift({id:'continuar',descricao:'Continuar a caminhada para '+espaco.nome(s.deslocamento.destino)});
return a}
function executar(e,s,id,permitidas=acoes(e,s),extra={}){if(!permitidas.some(a=>a.id===id))throw Error('Ação inválida ou indisponível: '+id);const x=e.mundo.ecossistema,r={acao:id,quantidade:0};
// DESLOCAMENTO: 'ir_*' NUNCA teletransporta — inicia ou reroteia um trajeto
// no grafo; o avanço físico é um trecho por ciclo (fase 0 da rodada).
if(id==='continuar'){if(!s.deslocamento)throw Error('Ação inválida ou indisponível: continuar');r.deslocamento={estado:'emCurso',destino:s.deslocamento.destino};return r}
if(id==='ir_casa'||id.startsWith('ir_')){const destino=id==='ir_casa'?s.casa:id.slice(3);const no=espaco.normalizar(destino);if(!no||no===s.local)throw Error('Ação inválida ou indisponível: '+id);const caminho=espaco.rota(s.local,no);if(!caminho)throw Error('Sem caminho até '+destino);s.deslocamento={destino:no,caminho:caminho.caminho,i:0,iniciadoNoCiclo:e.mundo.tempo.ciclo};r.deslocamento={estado:'partida',destino:no,trechos:caminho.caminho.length-1};return r}
// AÇÃO LOCAL: o ser assumiu o controle — qualquer ação no meio do caminho
// cancela o trajeto (o mundo não puxa ninguém contra a própria decisão).
if(s.deslocamento){r.deslocamento={estado:'abortado',destino:s.deslocamento.destino};s.deslocamento=null}
switch(id){case'beber':s.inventario.agua--;s.necessidades.agua=0;r.quantidade=1;break;case'comer':s.inventario.alimento--;s.necessidades.alimento=0;r.quantidade=1;break;case'descansar':case'esperar':break;case'observar':r.pistas=perceber(e,s);break;case'banho':s.necessidades.higiene=Math.min(100,(s.necessidades.higiene??0)+60);r.quantidade=1;break;case'arrumar_casa':s.necessidades.frustracao=Math.max(0,(s.necessidades.frustracao??0)-4);s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao??50)+2);r.quantidade=1;break;case'coletar_agua':r.quantidade=Math.min(3,x.agua.nascente,Math.max(.2,s.capacidades.coleta*2));x.agua.nascente-=r.quantidade;s.inventario.agua+=r.quantidade;break;case'pescar':{const p=x.peixes.rio,t=e.mundo.tempo,ch=Math.min(.9,p.populacao/p.capacidade*s.capacidades.pesca*(['manha','tarde'].includes(t.periodo)?1:.55)*(t.estacao==='chuvas'?1.25:t.estacao==='seca'?.7:1)),z=((t.ciclo*9301+17)%997)/997;if(z<ch&&p.populacao>0){r.quantidade=Math.min(p.populacao,Math.max(.25,s.capacidades.pesca*2*p.populacao/p.capacidade));p.populacao-=r.quantidade;s.inventario.alimento+=r.quantidade}r.chance=ch;break}case'colher_frutas':{let rem=s.capacidades.coleta*2;for(const t of Object.values(x.arvores).filter(t=>t.local==='bosque').sort((a,b)=>b.frutos-a.frutos)){const q=Math.min(rem,t.frutos);t.frutos-=q;rem-=q;r.quantidade+=q;if(rem<=0)break}s.inventario.alimento+=r.quantidade;break}case'coletar_madeira':r.quantidade=Math.min(2,x.madeira.floresta,s.capacidades.forca*2);x.madeira.floresta-=r.quantidade;s.inventario.madeira+=r.quantidade;break;case'caçar':{
        const faunas = Object.values(x.fauna||{}).filter(f=>f.local===s.local&&f.populacao>0);
        if(!faunas.length){ r.chance=0; break; }
        const alvo = faunas[0]; // pega primeiro disponível
        // Chance muito menor que pesca (exige habilidade/capacidade forca)
        const chBase = Math.min(.4, (alvo.populacao/alvo.capacidade)*s.capacidades.forca*0.5); 
        const t = e.mundo.tempo;
        const multPeriodo = ['manha','tarde'].includes(t.periodo)?1:.6; // Caçar à noite é ruim
        const chFinal = chBase * multPeriodo;
        
        const z=((t.ciclo*9301+17)%997)/997;
        r.chance = chFinal;
        
        if(z < chFinal && alvo.populacao > 0){
           // Sucesso: ganha carne (alimento bruto, precisa cozinhar? Por enquanto come cru direto para simplificar)
           const qtdCarne = Math.max(1, s.capacidades.forca * 1.5);
           alvo.populacao -= 1; // Mata um bicho
           s.inventario.alimento += qtdCarne;
           r.quantidade = qtdCarne;
           // Risco: ferimento leve se falhar feio (implementado parcialmente abaixo)
        } else if (z >= chFinal && z < chFinal + 0.1) {
           // Falha crítica: lesão leve
           s.necessidades.saude = Math.max(0, s.necessidades.saude - 5);
           r.quantidade = 0;
        }
        break;
      }
case'melhorar_abrigo':s.inventario.madeira-=2;s.abrigo=Math.min(2,s.abrigo+1);r.quantidade=2;break;case'conviver':{const outros=Object.values(e.seres||{}).filter(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);r.com=outros.length?outros[0].id:null;if(r.com){s.necessidades.solidao=Math.max(0,s.necessidades.solidao-15);outros[0].necessidades.solidao=Math.max(0,outros[0].necessidades.solidao-10)}break}case'falar':{const outros=Object.values(e.seres||{}).filter(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);r.com=outros.length?outros[0].id:null;r.texto=typeof extra.texto==='string'&&extra.texto.trim()?extra.texto.trim().slice(0,280):(extra.motivo||'').trim().slice(0,280);if(r.com){const alvo=outros[0];alvo.memoria=Array.isArray(alvo.memoria)?alvo.memoria:[];alvo.memoria.push({tipo:'fala',de:s.id,texto:r.texto,ciclo:e.mundo.tempo.ciclo});alvo.memoria=alvo.memoria.slice(-200)}break}}return r}
function ciclo(e,s,d){validar(e);if(!d||typeof d.acao!=='string'||!acoes(e,s).some(a=>a.id===d.acao))throw Error('Decisão inválida ou ação não permitida; ciclo não aplicado.');const antes={ciclo:e.mundo.tempo.ciclo,local:s.local,necessidades:{...s.necessidades}},pistas=perceber(e,s),con=executar(e,s,d.acao,undefined,{texto:d.texto,motivo:d.motivo});if(con.pistas?.length){for(const texto of con.pistas)if(!e.descobertas.includes(texto)){e.descobertas.push(texto);e.memorias.push({tipo:'observacao',texto,ciclo:e.mundo.tempo.ciclo})}}const ev=avancar(e.mundo);regenerar(e.mundo,ev);atualizar(s,e.mundo,d.acao);const evento={tipo:'ciclo',ciclo:e.mundo.tempo.ciclo,serId:s.id,antes,percepcao:pistas,decisao:{acao:d.acao,motivo:d.motivo||'',origem:d.origem||'decisor'},acao:{id:d.acao,quantidade:con.quantidade},consequencia:con,necessidades:{...s.necessidades},status:s.status,clima:e.mundo.clima};e.historico.eventos.push(evento);if(!Array.isArray(e.rastro))e.rastro=[];if(['ir_casa','melhorar_abrigo','conviver','falar'].includes(d.acao)){e.rastro.push({ciclo:e.mundo.tempo.ciclo,serId:s.id,acao:d.acao,local:s.local,outro:con.com||null});if(e.rastro.length>200)e.rastro.shift();}e.historico.decisoes.push({ciclo:evento.ciclo,serId:s.id,...evento.decisao});validar(e);return evento}
const cicloComAuditoria=ciclo;
function cicloSeguro(e,s,d,opcoes={}){const eco=require('./ecossistema');eco.preparar(e);e.historico=e.historico||{eventos:[],decisoes:[]};e.historico.eventos=Array.isArray(e.historico.eventos)?e.historico.eventos:[];e.historico.decisoes=Array.isArray(e.historico.decisoes)?e.historico.decisoes:[];const estavaMorto=s.status==='morto',r=cicloComAuditoria(e,s,d),nascente=e.mundo.ecossistema.agua.fontes.nascente;if(estavaMorto)s.status='morto';if(d.acao==='coletar_agua')nascente.nivel=Math.max(0,nascente.nivel-(r.consequencia?.quantidade||0));eco.atualizarMundo(e,d.acao);r.agentes=[];if(!estavaMorto)eco.aprender(s,r.percepcao,e.mundo.tempo.ciclo);eco.validarCompleto(e);r.mundo={clima:e.mundo.clima,estacao:e.mundo.tempo.estacao,fauna:Object.fromEntries(Object.entries(e.mundo.ecossistema.fauna).map(([k,v])=>[k,v.populacao]))};return r}
module.exports={acoes,executar,ciclo:cicloSeguro};

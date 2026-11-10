'use strict';
const {avancar,regenerar,validar}=require('./estado-v2');const {atualizar}=require('./seres');const {perceber}=require('./percepcao-v2');const espaco=require('./espaco');
function acoes(e,s){const x=e.mundo.ecossistema;const base=[['beber','Beber água',s.inventario.agua>=1],['comer','Comer alimento',s.inventario.alimento>=1],['descansar','Descansar',true],['observar','Observar local',true]];
// ESPAÇO: o grafo do mundo conecta os locais por trilhas — escolher para onde
// ir é decisão do personagem; aqui só aparece o caminho possível.
for(const no of espaco.locais()){if(no===s.local)continue;base.push(no===s.casa?['ir_casa','Voltar para casa',true]:['ir_'+no,'Caminhar até '+espaco.nome(no),true])}
const temOutro = Object.values(e.seres||{}).some(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);
base.push(['esperar','Aguardar',true],['conviver','Conversar com alguém',temOutro],['falar','Falar com alguém',temOutro],['brincar','Brincar/Relaxar',!temOutro],['confrontar','Confrontar alguém',temOutro]);
// VIDA DIÁRIA: banho só existe onde há água de banho; arrumar casa só na
// própria moradia. Ambas são POSSIBILIDADES — o cérebro escolhe se quer.
base.push(['banho','Tomar banho',['rio','cachoeira','mar'].includes(s.local)]);
base.push(['arrumar_casa',s.local==='acampamento'?'Arrumar o acampamento':'Arrumar a casa',!!s.casa&&s.local===s.casa&&s.ultimoArrumarDia!==e.mundo.tempo.dia]);
const mesAtual=require('./calendario').mesDe(e.mundo.tempo);
const temCardume=Array.isArray(e.mundo.acontecimentos)&&e.mundo.acontecimentos.some(ev=>ev&&ev.ativo!==false&&ev.tipo==='cardume'&&Array.isArray(ev.locais)&&ev.locais.includes('rio'));
const limitePescaDia=temCardume?8:Math.max(1,Math.round(2*(mesAtual.fatorPeixes||1)));
const esgotadoHoje=x.peixes.rio.ultimoDiaPesca===e.mundo.tempo.dia&&(x.peixes.rio.pescadosHoje||0)>=limitePescaDia;
const a=base.filter(v=>v[2]).map(([id,descricao])=>({id,descricao}));
if(s.local==='rio'||s.local==='cachoeira'){a.push({id:'coletar_agua',descricao:'Beber água fresca direto da fonte e encher o cantil'});}
if(s.local==='rio'&&x.peixes.rio.populacao>0&&(mesAtual.cardumeNoRio||temCardume)&&!esgotadoHoje)a.push({id:'pescar',descricao:'Tentar pescar no rio'});
if(s.local==='bosque'&&Object.values(x.arvores).some(t=>t.local==='bosque'&&t.frutos>=.5))a.push({id:'colher_frutas',descricao:'Colher frutos da estação ('+mesAtual.frutas+')'});
if(s.local==='floresta'&&x.madeira.floresta>0)a.push({id:'coletar_madeira',descricao:'Coletar madeira caída'});
// NOVA AÇÃO: CAÇAR (Alta dificuldade, recompensa potencialmente maior que peixe)
if((s.local==='floresta'||s.local==='bosque')&&Object.values(x.fauna||{}).some(f=>f.populacao>0&&f.local===s.local))a.push({id:'caçar',descricao:'Tentar caçar um animal'});
        if(['floresta', 'caverna', 'bosque'].includes(s.local)) a.push({id:'explorar', descricao:'Explorar a área em busca de tesouros ou recursos raros'});if(s.abrigo<2&&s.inventario.madeira>=2)a.push({id:'melhorar_abrigo',descricao:'Melhorar abrigo'});
// HORTA / FAZENDA: plantar mudas do mês do ano e colher quando maduras
if(s.local==='fazenda'){
  const h=x.horta||{plantados:0,crescendo:0,maduros:0,capacidade:12,vida:0};
  const totalHorta=(h.plantados||0)+(h.crescendo||0)+(h.maduros||0);
  if(totalHorta<(h.capacidade||12))a.push({id:'plantar',descricao:'Plantar '+mesAtual.cultura+' (plantação do mês de '+mesAtual.nome+') na horta'});
  if(h.plantadoPor&&(h.maduros||0)>=0.5&&(h.vida||0)>0)a.push({id:'colher_horta',descricao:'Colher '+(h.cultura||mesAtual.cultura)+' maduros na horta'});
}
// FOGUEIRA: acender ou alimentar o fogo para aquecer e afastar predadores
if((s.local==='fogueira'||s.local==='acampamento')&&x.fogueira){
  if(!x.fogueira.acesa||(x.fogueira.lenha||0)<8){
    a.push({id:'acender_fogueira',descricao:x.fogueira.acesa?'Alimentar a fogueira com lenha para o fogo não apagar e afastar predadores':'Acender a fogueira apagada para iluminar, aquecer e afastar predadores'});
  }
}
// OBJETOS DO MUNDO (Drops de suprimento e Artefatos misteriosos no local):
// O mundo apenas disponibiliza o objeto físico; o personagem escolhe se quer abrir/investigar ou ignorar.
const evsLocais=Array.isArray(e.mundo.acontecimentos)?e.mundo.acontecimentos.filter(ev=>ev&&ev.ativo!==false&&Array.isArray(ev.locais)&&ev.locais.includes(s.local)):[];
if(evsLocais.some(ev=>ev.tipo==='suprimento'&&(ev.usosRestantes===undefined||ev.usosRestantes>0)))a.push({id:'abrir_suprimento',descricao:'Abrir caixa de suprimentos encontrada no local'});
if(evsLocais.some(ev=>ev.tipo==='artefato'))a.push({id:'investigar_artefato',descricao:'Investigar o artefato misterioso no chão'});
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
switch(id){case'beber':s.inventario.agua--;s.necessidades.agua=0;r.quantidade=1;break;case'comer':s.inventario.alimento--;s.necessidades.alimento=0;r.quantidade=1;break;case'descansar':case'esperar':break;case'observar':r.pistas=perceber(e,s);break;case'banho':s.necessidades.higiene=Math.min(100,(s.necessidades.higiene??0)+60);r.quantidade=1;break;case'arrumar_casa':s.ultimoArrumarDia=e.mundo.tempo.dia;s.necessidades.frustracao=Math.max(0,(s.necessidades.frustracao??0)-15);s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao??50)+10);s.necessidades.higiene=Math.min(100,(s.necessidades.higiene??50)+25);r.quantidade=1;break;case'coletar_agua':{const temLago=x.agua.fontes?.lago&&x.agua.fontes.lago.nivel>0;const disp=Math.max(x.agua.nascente||0,temLago?3:0);r.quantidade=Math.min(3,disp>0?disp:2,Math.max(1.5,s.capacidades.coleta*3));if(x.agua.nascente>0)x.agua.nascente=Math.max(0,x.agua.nascente-r.quantidade);else if(temLago)x.agua.fontes.lago.nivel=Math.max(0,x.agua.fontes.lago.nivel-r.quantidade);s.inventario.agua+=r.quantidade;s.necessidades.agua=Math.max(0,(s.necessidades.agua||0)-60);break}case'pescar':{const p=x.peixes.rio,t=e.mundo.tempo,ch=Math.min(.95,Math.max(.65,p.populacao/p.capacidade)*Math.max(.65,s.capacidades.pesca*1.8)*(['manha','tarde'].includes(t.periodo)?1:.8)*(t.estacao==='chuvas'?1.25:t.estacao==='seca'?.9:1)),z=((t.ciclo*9301+17)%997)/997;if(p.populacao>0){const baseQ=Math.min(p.populacao,Math.max(1.5,s.capacidades.pesca*3.2*(0.45+0.55*(p.populacao/p.capacidade))));r.quantidade=z<ch?baseQ:Math.min(p.populacao,0.8);p.populacao-=r.quantidade;p.pescadosHoje=(p.ultimoDiaPesca===t.dia?(p.pescadosHoje||0):0)+1;p.ultimoDiaPesca=t.dia;s.inventario.alimento+=r.quantidade;s.necessidades.alimento=Math.max(0,(s.necessidades.alimento||0)-60)}r.chance=ch;break}case'colher_frutas':{let rem=Math.max(1.8,s.capacidades.coleta*2.8);for(const t of Object.values(x.arvores).filter(t=>t.local==='bosque').sort((a,b)=>b.frutos-a.frutos)){const q=Math.min(rem,t.frutos);t.frutos-=q;rem-=q;r.quantidade+=q;if(rem<=0)break}s.inventario.alimento+=r.quantidade;if(r.quantidade>0)s.necessidades.alimento=Math.max(0,(s.necessidades.alimento||0)-55);break}case'coletar_madeira':r.quantidade=Math.min(2,x.madeira.floresta,s.capacidades.forca*2);x.madeira.floresta-=r.quantidade;s.inventario.madeira+=r.quantidade;break;case'caçar':{
        const faunas = Object.values(x.fauna||{}).filter(f=>f.local===s.local&&f.populacao>0);
        if(!faunas.length){ r.chance=0; break; }
        const alvo = faunas[0];
        const chBase = Math.min(.80, Math.max(.50, (alvo.populacao/alvo.capacidade)*s.capacidades.forca*1.4)); 
        const t = e.mundo.tempo;
        const multPeriodo = ['manha','tarde'].includes(t.periodo)?1:.7;
        const chFinal = chBase * multPeriodo;
        
        const z=((t.ciclo*9301+17)%997)/997;
        r.chance = chFinal;
        
        if(z < chFinal && alvo.populacao > 0){
           const qtdCarne = Math.max(2, s.capacidades.forca * 3);
           alvo.populacao -= 1;
           s.inventario.alimento += qtdCarne;
           s.necessidades.alimento = Math.max(0, (s.necessidades.alimento||0) - 70);
           r.quantidade = qtdCarne;
        } else if (z >= chFinal && z < chFinal + 0.1) {
           s.necessidades.saude = Math.max(0, s.necessidades.saude - 5);
           r.quantidade = 0;
        }
        break;
      }
case'melhorar_abrigo':s.inventario.madeira-=2;s.abrigo=Math.min(2,s.abrigo+1);r.quantidade=2;break;case'plantar':{
        const mesAtual=require('./calendario').mesDe(e.mundo.tempo);
        x.horta=x.horta||{plantados:0,crescendo:0,maduros:0,capacidade:12,vida:0,vidaMax:100};
        const totalAntes=(x.horta.plantados||0)+(x.horta.crescendo||0)+(x.horta.maduros||0);
        const qtd=Math.max(1,Math.min((x.horta.capacidade||12)-totalAntes, 4));
        x.horta.plantados=(x.horta.plantados||0)+qtd;
        x.horta.crescendo=Math.min(x.horta.capacidade||12,(x.horta.crescendo||0)+1.5);
        x.horta.vidaMax=100;
        x.horta.vida=100;
        x.horta.cultura=mesAtual.cultura;
        x.horta.icone=mesAtual.icone;
        x.horta.cor=mesAtual.cor;
        x.horta.mesPlantio=mesAtual.nome;
        x.horta.plantadoPor=s.nome||s.id;
        r.quantidade=qtd;
        s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao??50)+10);
        break;
      }
case'colher_horta':{
        x.horta=x.horta||{plantados:0,crescendo:0,maduros:0,capacidade:12,vida:0,vidaMax:100};
        const qtd=Math.min(x.horta.maduros||0, Math.max(2, (s.capacidades?.coleta||0.5)*4));
        x.horta.maduros=Math.max(0,(x.horta.maduros||0)-qtd);
        x.horta.vida=Math.max(0,(x.horta.vida??100)-Math.max(20,qtd*10));
        const rest=(x.horta.plantados||0)+(x.horta.crescendo||0)+(x.horta.maduros||0);
        if(x.horta.vida<=0||rest<0.2){
          x.horta.plantados=0;x.horta.crescendo=0;x.horta.maduros=0;x.horta.vida=0;
          x.horta.cultura=null;x.horta.icone=null;x.horta.cor=null;x.horta.plantadoPor=null;
        }
        s.inventario.alimento+=qtd;
        if(qtd>0)s.necessidades.alimento=Math.max(0,(s.necessidades.alimento||0)-65);
        r.quantidade=qtd;
        break;
      }
case'acender_fogueira':{
        x.fogueira=x.fogueira||{acesa:false,lenha:0,capacidade:12};
        if((s.inventario.madeira||0)>=0.5){
          const uso=Math.min(s.inventario.madeira, 2);
          s.inventario.madeira-=uso;
          x.fogueira.lenha=Math.min(x.fogueira.capacidade||12,(x.fogueira.lenha||0)+uso*3.5);
        }else{
          x.fogueira.lenha=Math.min(x.fogueira.capacidade||12,(x.fogueira.lenha||0)+4.5);
        }
        x.fogueira.acesa=true;
        s.necessidades.medo=Math.max(0,(s.necessidades.medo||0)-25);
        s.necessidades.seguranca=Math.min(100,(s.necessidades.seguranca??50)+15);
        r.quantidade=x.fogueira.lenha;
        break;
      }
case'abrir_suprimento':{
        const cx=(e.mundo.acontecimentos||[]).find(ev=>ev&&ev.ativo!==false&&ev.tipo==='suprimento'&&Array.isArray(ev.locais)&&ev.locais.includes(s.local)&&(ev.usosRestantes===undefined||ev.usosRestantes>0));
        if(cx){
          const c=cx.conteudo||{agua:2,alimento:2,madeira:1};
          s.inventario.agua+=(c.agua||0);
          s.inventario.alimento+=(c.alimento||0);
          s.inventario.madeira+=(c.madeira||0);
          r.quantidade=(c.agua||0)+(c.alimento||0)+(c.madeira||0);
          s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao??50)+8);
          if(cx.usosRestantes!==undefined){cx.usosRestantes--;if(cx.usosRestantes<=0)cx.ativo=false;}
          s.memoria=Array.isArray(s.memoria)?s.memoria:[];
          s.memoria.push({ciclo:e.mundo.tempo.ciclo,tipo:'ambiente',texto:'Abri uma caixa de suprimentos em '+espaco.nome(s.local)+(cx.mensagem?' com o bilhete: "'+cx.mensagem+'"':'')+'.'});
        }
        break;
      }
case'investigar_artefato':{
        const art=(e.mundo.acontecimentos||[]).find(ev=>ev&&ev.ativo!==false&&ev.tipo==='artefato'&&Array.isArray(ev.locais)&&ev.locais.includes(s.local));
        if(art){
          r.quantidade=1;
          s.necessidades.curiosidade=Math.min(100,(s.necessidades.curiosidade??0)+20);
          s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao??50)+5);
          const desc='Investiguei o artefato misterioso em '+espaco.nome(s.local)+(art.mensagem?': "'+art.mensagem+'"':'')+'.';
          s.memoria=Array.isArray(s.memoria)?s.memoria:[];
          s.memoria.push({ciclo:e.mundo.tempo.ciclo,tipo:'ambiente',texto:desc});
          if(Array.isArray(e.descobertas)&&!e.descobertas.includes(desc))e.descobertas.push(desc);
        }
        break;
      }
case'brincar':{s.necessidades.frustracao=Math.max(0,(s.necessidades.frustracao||0)-25);s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao||50)+15);r.quantidade=1;break}
case'confrontar':{const outros=Object.values(e.seres||{}).filter(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);r.com=outros.length?outros[0].id:null;if(r.com){s.necessidades.frustracao=Math.max(0,(s.necessidades.frustracao||0)-30);outros[0].necessidades.frustracao=Math.min(100,(outros[0].necessidades.frustracao||0)+25);r.quantidade=1}break}
case'explorar':{
    const chance = Math.random();
    if (chance > 0.4) { // 60% de chance de achar algo
        const achado = chance > 0.8 ? 'ervas_medicinais' : (chance > 0.6 ? 'agua' : 'alimento');
        const qtd = Math.floor(Math.random() * 4) + 2; // 2 a 5 itens
        if (achado === 'alimento') s.inventario.alimento = (s.inventario.alimento || 0) + qtd;
        else if (achado === 'agua') s.inventario.agua = (s.inventario.agua || 0) + qtd;
        else s.inventario.ervas = (s.inventario.ervas || 0) + qtd;
        r.quantidade = qtd;
        r.texto = 'Você encontrou um esconderijo e pegou ' + qtd + ' de ' + achado + '!';
    } else {
        r.texto = 'Você explorou a área, mas não encontrou nada de útil.';
    }
    break;
}
case'conviver':{const outros=Object.values(e.seres||{}).filter(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);r.com=outros.length?outros[0].id:null;if(r.com){s.necessidades.solidao=Math.max(0,s.necessidades.solidao-15);outros[0].necessidades.solidao=Math.max(0,outros[0].necessidades.solidao-10)}break}case'falar':{const outros=Object.values(e.seres||{}).filter(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);r.com=outros.length?outros[0].id:null;r.texto=typeof extra.fala==='string'&&extra.fala.trim()?extra.fala.trim().slice(0,280):(typeof extra.texto==='string'&&extra.texto.trim()?extra.texto.trim().slice(0,280):(extra.motivo||'').trim().slice(0,280));if(r.texto){s.ultimaFala=r.texto;s.ultimaFalaCiclo=e.mundo.tempo.ciclo;}if(r.com){const alvo=outros[0];alvo.memoria=Array.isArray(alvo.memoria)?alvo.memoria:[];alvo.memoria.push({tipo:'fala',de:s.id,texto:r.texto,ciclo:e.mundo.tempo.ciclo});alvo.memoria=alvo.memoria.slice(-200)}break}}return r}
function ciclo(e,s,d){validar(e);if(!d||typeof d.acao!=='string'||!acoes(e,s).some(a=>a.id===d.acao))throw Error('Decisão inválida ou ação não permitida; ciclo não aplicado.');const antes={ciclo:e.mundo.tempo.ciclo,local:s.local,necessidades:{...s.necessidades}},pistas=perceber(e,s),con=executar(e,s,d.acao,undefined,{texto:d.texto,fala:d.fala,motivo:d.motivo});if(con.pistas?.length){for(const texto of con.pistas)if(!e.descobertas.includes(texto)){e.descobertas.push(texto);e.memorias.push({tipo:'observacao',texto,ciclo:e.mundo.tempo.ciclo})}}const ev=avancar(e.mundo);regenerar(e.mundo,ev);atualizar(s,e.mundo,d.acao);const evento={tipo:'ciclo',ciclo:e.mundo.tempo.ciclo,serId:s.id,antes,percepcao:pistas,decisao:{acao:d.acao,motivo:d.motivo||'',...(d.fala?{fala:d.fala}:{}),origem:d.origem||'decisor'},acao:{id:d.acao,quantidade:con.quantidade},consequencia:con,necessidades:{...s.necessidades},status:s.status,clima:e.mundo.clima};e.historico.eventos.push(evento);if(!Array.isArray(e.rastro))e.rastro=[];if(['ir_casa','melhorar_abrigo','conviver','falar','abrir_suprimento','investigar_artefato'].includes(d.acao)){e.rastro.push({ciclo:e.mundo.tempo.ciclo,serId:s.id,acao:d.acao,local:s.local,outro:con.com||null});if(e.rastro.length>200)e.rastro.shift();}e.historico.decisoes.push({ciclo:evento.ciclo,serId:s.id,...evento.decisao});validar(e);return evento}
const cicloComAuditoria=ciclo;
function cicloSeguro(e,s,d,opcoes={}){const eco=require('./ecossistema');eco.preparar(e);e.historico=e.historico||{eventos:[],decisoes:[]};e.historico.eventos=Array.isArray(e.historico.eventos)?e.historico.eventos:[];e.historico.decisoes=Array.isArray(e.historico.decisoes)?e.historico.decisoes:[];const estavaMorto=s.status==='morto',r=cicloComAuditoria(e,s,d),nascente=e.mundo.ecossistema.agua.fontes.nascente;if(estavaMorto)s.status='morto';if(d.acao==='coletar_agua')nascente.nivel=Math.max(0,nascente.nivel-(r.consequencia?.quantidade||0));eco.atualizarMundo(e,d.acao);r.agentes=[];if(!estavaMorto)eco.aprender(s,r.percepcao,e.mundo.tempo.ciclo);eco.validarCompleto(e);r.mundo={clima:e.mundo.clima,estacao:e.mundo.tempo.estacao,fauna:Object.fromEntries(Object.entries(e.mundo.ecossistema.fauna).map(([k,v])=>[k,v.populacao]))};return r}
module.exports={acoes,executar,ciclo:cicloSeguro};

'use strict';
const {avancar,regenerar,validar}=require('./estado-v2');const {atualizar}=require('./seres');const {perceber}=require('./percepcao-v2');const espaco=require('./espaco');
function acoes(e,s){const x=e.mundo.ecossistema;const base=[['beber','Beber água',s.inventario.agua>=1],['comer','Comer alimento',s.inventario.alimento>=1],['descansar','Descansar',true],['observar','Observar local',true]];
// ESPAÇO: o grafo do mundo conecta os locais por trilhas — escolher para onde
// ir é decisão do personagem; aqui só aparece o caminho possível.
for(const no of espaco.locais()){if(no===s.local)continue;if(no===s.casa){base.push(['ir_casa','Voltar para casa',true]);continue}
// TRILHA DE ÁGUA: se o caminho cruza aresta `agua`, a descrição diz barco —
// o trajeto continua sendo trajeto (um trecho por ciclo), nunca teleporte.
const rotaNo=espaco.rota(s.local,no);
const porAgua=!!(rotaNo&&rotaNo.trechos.some(t=>t.agua));
base.push(['ir_'+no,(porAgua?'Ir até ':'Caminhar até ')+espaco.nome(no)+(porAgua?' de barco':''),true])}
const temOutro = Object.values(e.seres||{}).some(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);
base.push(['esperar','Aguardar',true],['procurar_alguem','Procurar alguém (espera no local)',true],['conviver','Conversar com alguém',temOutro],['falar','Falar com alguém',temOutro],['brincar','Brincar/Relaxar',!temOutro],['confrontar','Confrontar alguém',temOutro],['desafiar_luta','Desafiar alguém para uma luta (Arena)',temOutro && s.local === 'arena']);
// AÇÕES EXISTENCIAIS E SOCIAIS (Livre-arbítrio, Consciência e Alma Humana):
base.push(['contemplar_a_natureza','Sentar-se em silêncio e contemplar a beleza e vastidão da natureza',true]);
base.push(['pensar_sobre_a_vida','Refletir sobre a vida, seus sentimentos, propósito e existência',true]);
base.push(['abracar_um_amigo','Dar um abraço caloroso e demonstrar afeto fraternal ao companheiro presente',temOutro]);
base.push(['contar_uma_historia','Contar uma história, memória ou reflexão aos companheiros',temOutro]);
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
        if(['floresta', 'caverna', 'bosque'].includes(s.local)) a.push({id:'explorar', descricao:'Explorar a área em busca de tesouros ou recursos raros'});
// NOVOS DESTINOS (grafo ampliado): caverna se explora na boca; mergulho é
// oferecido só onde há água para mergulhar; barco só do cais ou da margem do mar.
if(s.local==='caverna')a.push({id:'explorar_caverna',descricao:'Explorar o fundo da caverna no escuro, com cuidado'});
if(['rio','cachoeira','mar'].includes(s.local))a.push({id:'mergulhar',descricao:'Mergulhar na água fria daqui'});
if(['barco','mar'].includes(s.local)&&espaco.rota(s.local,'ilha_vizinha'))a.push({id:'navegar',descricao:'Pegar o barco e navegar até a Ilha Vizinha'});
if(s.abrigo<2&&s.inventario.madeira>=2)a.push({id:'melhorar_abrigo',descricao:'Melhorar abrigo'});
// HORTA / FAZENDA: plantar mudas do mês do ano e colher quando maduras
if(s.local==='fazenda'){
  const h=x.horta||{plantados:0,crescendo:0,maduros:0,capacidade:12,vida:0};
  const totalHorta=(h.plantados||0)+(h.crescendo||0)+(h.maduros||0);
  if(totalHorta<(h.capacidade||12))a.push({id:'plantar',descricao:'Plantar '+mesAtual.cultura+' (plantação do mês de '+mesAtual.nome+') na horta'});
  if(h.plantadoPor&&(h.maduros||0)>=0.5&&(h.vida||0)>0)a.push({id:'colher_horta',descricao:'Colher '+(h.cultura||mesAtual.cultura)+' maduros na horta'});
}
// CURRAL / ANIMAIS: cuidar, alimentar e coletar recursos
if(['curral','fazenda'].includes(s.local)&&x.curral){
  a.push({id:'cuidar_animais',descricao:'Cuidar das cabras e galinhas no curral (coletar leite fresco e ovos)'});
}
// CORTE DE ÁRVORES E RECURSOS:
if(['floresta','bosque'].includes(s.local)){
  a.push({id:'cortar_arvore',descricao:'Usar ferramenta e cortar madeira de uma árvore alta para a vila'});
}
// COLETA DE PEDRAS:
if(['rio','cachoeira','caverna'].includes(s.local)){
  a.push({id:'coletar_pedra',descricao:'Coletar pedras resistentes e sílex na margem/rochas para forja e construções'});
}
// FABRICAÇÃO DE FERRAMENTAS (BANCADA RÚSTICA):
if(['acampamento','fogueira'].includes(s.local)||s.local.startsWith('casa_')){
  const temRecursos=(s.inventario.madeira||0)>=1&&(s.inventario.pedra||0)>=1;
  if(temRecursos)a.push({id:'fabricar_ferramenta',descricao:'Forjar ferramenta rústica (machado, vara de pescar ou lança)'});
}
// CONSTRUÇÃO E OBRAS DA VILA (NÃO É DO DIA PARA A NOITE):
if(Array.isArray(x.projetos)){
  const projLocal=x.projetos.find(p=>p&&!p.concluido&&p.local===s.local);
  if(projLocal){
    a.push({id:'trabalhar_construcao',descricao:`Trabalhar na obra: ${projLocal.nome} (${projLocal.progresso}% concluído)`});
  }
}
// MERGULHO E PESCA NO MAR (COM RISCO DE TUBARÃO):
if(s.local==='mar'||s.local==='barco'){
  a.push({id:'pescar_mar',descricao:'Lançar a linha de pesca no mar para pescar'});
  if(s.local==='mar') a.push({id:'mergulhar_mar',descricao:'Mergulhar nos recifes do sul para pegar crustáceos e ostras (cuidado com tubarões!)'});
}
// TROCA / COOPERAÇÃO COM VIZINHO:
if(temOutro){
  a.push({id:'trocar_recursos',descricao:'Compartilhar mantimentos e ferramentas com o companheiro'});
  a.push({id:'planejar_vila',descricao:'Planejar juntos as próximas melhorias e defesas da vila'});
  a.push({id:'planejar_amanha',descricao:'Sentar com o companheiro para planejar o dia de amanhã (avaliar estoques de lenha, comida, água e tarefas)'});
}
// ESPORTE / TREINO E DESCONTRAÇÃO (Condição dada pelo mundo para exercitar corpo e mente):
if(['arena','praia','mar','bosque','acampamento'].includes(s.local)){
  a.push({
    id:'praticar_esporte',
    descricao: temOutro 
      ? 'Praticar esporte/treino amigável ou corrida com o companheiro para descontrair a mente e exercitar o corpo'
      : 'Fazer corrida e exercícios físicos pelo local para descontrair a mente e revigorar a vitalidade'
  });
}
// REFEIÇÃO / CHURRASCO COMUNITÁRIO AO REDOR DO FOGO OU NA CASA:
if(['fogueira','acampamento','casa_joao','casa_icaro'].includes(s.local)&&((s.inventario.alimento||0)>=1||(x.fogueira&&x.fogueira.acesa))){
  a.push({
    id:'churrasco_fogueira',
    descricao: temOutro
      ? 'Fazer um churrasco comunitário e confraternizar ao redor do fogo com os companheiros'
      : 'Assar uma refeição quente e reconfortante ao fogo'
  });
}
// MINERAÇÃO NA CAVERNA: extrair ferro e quartzo
if(s.local==='caverna'){
  a.push({id:'minerar_caverna',descricao:'Minerar minério de ferro e cristais nas paredes da caverna'});
}
// ENFRENTAR OU AFUGENTAR PREDADOR SE ELE ESTIVER NO LOCAL:
if(x.predador&&x.predador.status==='vivo'&&x.predador.local===s.local){
  a.push({id:'afugentar_fera',descricao:'Brandir tochas/arma e afugentar a Pantera das Sombras'});
  a.push({id:'desafiar_luta',descricao:'Enfrentar a fera em combate corpo a corpo'});
}
// CONVIVÊNCIA AO REDOR DA FOGUEIRA NO ENTARDECER / NOITE:
if(['tarde','noite'].includes(e.mundo.tempo.periodo)&&s.local==='fogueira'&&temOutro){
  a.push({id:'compartilhar_historias',descricao:'Contar histórias e partilhar memórias ao redor do calor da fogueira'});
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

// PROGRESSÃO CIVILIZATÓRIA E EXPLORAÇÃO DO DESCONHECIDO:
if(['floresta','caverna','bosque','ilha_vizinha','cachoeira','mar'].includes(s.local)){
  a.push({id:'explorar_desconhecido',descricao:'Aventurar-se além das trilhas conhecidas, desfazendo a névoa da ilha (+adrenalina, +esperança)'});
}
const temMaterial=(s.inventario.madeira||0)>=1||(s.inventario.pedra||0)>=1;
if(temMaterial&&(['acampamento','fogueira','curral','fazenda','arena'].includes(s.local)||s.local.startsWith('casa_'))){
  a.push({id:'erguer_estrutura',descricao:'Erguer e aprimorar as construções comunitárias da ilha (Evolução Nível 1 a 3)'});
}
if(['fogueira','acampamento','cachoeira'].includes(s.local)||s.local.startsWith('casa_')){
  a.push({id:'momento_de_fe',descricao:'Momento de fé, oração e reflexão profunda (+esperança, -ansiedade, -medo)'});
}

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
switch(id){case'beber':s.inventario.agua--;s.necessidades.agua=0;r.quantidade=1;break;case'comer':s.inventario.alimento--;s.necessidades.alimento=0;r.quantidade=1;break;case'descansar':case'esperar':break;case'observar':r.pistas=perceber(e,s);break;case'banho':s.necessidades.higiene=Math.min(100,(s.necessidades.higiene??0)+60);r.quantidade=1;break;case'arrumar_casa':s.ultimoArrumarDia=e.mundo.tempo.dia;s.necessidades.frustracao=Math.max(0,(s.necessidades.frustracao??0)-15);s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao??50)+10);s.necessidades.higiene=Math.min(100,(s.necessidades.higiene??50)+25);r.quantidade=1;break;case'coletar_agua':{const temLago=x.agua.fontes?.lago&&x.agua.fontes.lago.nivel>0;const disp=Math.max(x.agua.nascente||0,temLago?3:0);r.quantidade=Math.min(3,disp>0?disp:2,Math.max(1.5,s.capacidades.coleta*3));if(x.agua.nascente>0)x.agua.nascente=Math.max(0,x.agua.nascente-r.quantidade);else if(temLago)x.agua.fontes.lago.nivel=Math.max(0,x.agua.fontes.lago.nivel-r.quantidade);s.inventario.agua+=r.quantidade;s.necessidades.agua=Math.max(0,(s.necessidades.agua||0)-60);break}case'pescar':{ s.habilidades = s.habilidades || {}; s.habilidades.caca = (s.habilidades.caca || 10) + 0.5; const p=x.peixes.rio,t=e.mundo.tempo,ch=Math.min(.95,Math.max(.65,p.populacao/p.capacidade)*Math.max(.65,s.capacidades.pesca*1.8)*(['manha','tarde'].includes(t.periodo)?1:.8)*(t.estacao==='chuvas'?1.25:t.estacao==='seca'?.9:1)),z=((t.ciclo*9301+17)%997)/997;if(p.populacao>0){const baseQ=Math.min(p.populacao,Math.max(1.5,s.capacidades.pesca*3.2*(0.45+0.55*(p.populacao/p.capacidade))));r.quantidade=z<ch?baseQ:Math.min(p.populacao,0.8);p.populacao-=r.quantidade;p.pescadosHoje=(p.ultimoDiaPesca===t.dia?(p.pescadosHoje||0):0)+1;p.ultimoDiaPesca=t.dia;s.inventario.alimento+=r.quantidade;s.necessidades.alimento=Math.max(0,(s.necessidades.alimento||0)-60)}r.chance=ch;break}case'colher_frutas':{let rem=Math.max(1.8,s.capacidades.coleta*2.8);for(const t of Object.values(x.arvores).filter(t=>t.local==='bosque').sort((a,b)=>b.frutos-a.frutos)){const q=Math.min(rem,t.frutos);t.frutos-=q;rem-=q;r.quantidade+=q;if(rem<=0)break}s.inventario.alimento+=r.quantidade;if(r.quantidade>0)s.necessidades.alimento=Math.max(0,(s.necessidades.alimento||0)-55);break}case'coletar_madeira':r.quantidade=Math.min(2,x.madeira.floresta,s.capacidades.forca*2);x.madeira.floresta-=r.quantidade;s.inventario.madeira+=r.quantidade;break;case'caçar':{ s.habilidades = s.habilidades || {}; s.habilidades.caca = (s.habilidades.caca || 10) + 1; 
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
case'desafiar_luta':{
    const outros = Object.values(e.seres||{}).filter(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);
    r.com = outros.length ? outros[0].id : null;
    if (r.com) {
        const alvo = outros[0];
        s.habilidades = s.habilidades || { luta: 10, caca: 10, medicina: 5 };
        alvo.habilidades = alvo.habilidades || { luta: 10, caca: 10, medicina: 5 };
        
        const forcaS = s.habilidades.luta + (Math.random() * 20);
        const forcaO = alvo.habilidades.luta + (Math.random() * 20);
        
        if (forcaS > forcaO) {
            // Vencedor rouba itens
            let roubou = 0;
            if (alvo.inventario.alimento >= 2) { alvo.inventario.alimento -= 2; s.inventario.alimento = (s.inventario.alimento||0) + 2; roubou += 2; }
            else if (alvo.inventario.agua >= 2) { alvo.inventario.agua -= 2; s.inventario.agua = (s.inventario.agua||0) + 2; roubou += 2; }
            else if (alvo.inventario.alimento > 0) { alvo.inventario.alimento -= 1; s.inventario.alimento = (s.inventario.alimento||0) + 1; roubou += 1; }
            
            s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao||50) + 25);
            alvo.necessidades.frustracao = Math.min(100, (alvo.necessidades.frustracao||0) + 35);
            s.habilidades.luta += 2;
            r.quantidade = 1;
            r.texto = 'Você venceu a luta contra ' + alvo.nome + '! Ganhou respeito e roubou ' + roubou + ' itens.';
        } else {
            let perdeu = 0;
            if (s.inventario.alimento >= 2) { s.inventario.alimento -= 2; alvo.inventario.alimento = (alvo.inventario.alimento||0) + 2; perdeu += 2; }
            else if (s.inventario.agua >= 2) { s.inventario.agua -= 2; alvo.inventario.agua = (alvo.inventario.agua||0) + 2; perdeu += 2; }
            
            s.necessidades.frustracao = Math.min(100, (s.necessidades.frustracao||0) + 40);
            s.necessidades.saude = Math.max(0, (s.necessidades.saude||100) - 10);
            alvo.necessidades.satisfacao = Math.min(100, (alvo.necessidades.satisfacao||50) + 20);
            alvo.habilidades.luta += 2;
            r.texto = 'Você perdeu a luta para ' + alvo.nome + '! Perdeu ' + perdeu + ' itens e sua frustração aumentou.';
        }
    }
    break;
}
case'explorar_caverna':{
    const chance = Math.random();
    if (chance > 0.7) {
        s.inventario.ervas = (s.inventario.ervas || 0) + 3;
        s.inventario.alimento = (s.inventario.alimento || 0) + 2;
        r.texto = 'Você encontrou cristais brilhantes e ervas raras no fundo da caverna!';
    } else if (chance > 0.4) {
        s.necessidades.saude = Math.max(0, (s.necessidades.saude || 100) - 15);
        r.texto = 'Você se perdeu na escuridão e se feriu nas pedras. A caverna é perigosa.';
    } else {
        r.texto = 'Você explorou a caverna, mas só encontrou eco e escuridão.';
    }
    break;
}
case'cuidar_animais':{
    const cur = x.curral || { leite: 1, ovos: 2, racao: 4 };
    const leiteColhido = Math.min(2, cur.leite || 0);
    const ovosColhidos = Math.min(3, cur.ovos || 0);
    cur.leite = Math.max(0, (cur.leite || 0) - leiteColhido);
    cur.ovos = Math.max(0, (cur.ovos || 0) - ovosColhidos);
    const totalAlimento = leiteColhido + ovosColhidos;
    if (totalAlimento > 0) {
      s.inventario.alimento = (s.inventario.alimento || 0) + totalAlimento;
      s.necessidades.alimento = Math.max(0, (s.necessidades.alimento || 0) - (totalAlimento * 20));
      s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 12);
      r.quantidade = totalAlimento;
      r.texto = 'Cuidou dos animais no curral e colheu ' + ovosColhidos + ' ovos e ' + leiteColhido + ' leite fresco!';
    } else {
      s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 4);
      r.quantidade = 0;
      r.texto = 'Cuidou e alimentou os animais com carinho. Eles já foram ordenhados e estão repousando tranquilamente.';
    }
    break;
}
case'pescar_cais':
case'pescar_mar':{
    const sorte = Math.random();
    if (sorte > 0.3) {
        const qtd = Math.floor(Math.random() * 3) + 1;
        s.inventario.alimento = (s.inventario.alimento || 0) + qtd;
        s.necessidades.alimento = Math.max(0, (s.necessidades.alimento || 0) - 45);
        s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 12);
        r.quantidade = qtd;
        r.texto = 'Lançou a linha no cais do barco e fisgou ' + qtd + ' peixe(s) do mar!';
    } else {
        r.quantidade = 0;
        r.texto = 'As ondas bateram fortes no cais; a isca foi levada pela maré.';
    }
    break;
}
case'minerar_caverna':{
    const sorte = Math.random();
    if (sorte > 0.35) {
        s.inventario.minerio = (s.inventario.minerio || 0) + 2;
        s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 14);
        r.quantidade = 2;
        r.texto = 'Extraiu minério de ferro e quartzo brilhante das fendas rochosas da caverna!';
    } else {
        r.texto = 'As pedras eram duras demais; extraiu apenas lascas de pedra.';
    }
    break;
}
case'afugentar_fera':{
    if (x.predador) {
        x.predador.local = 'caverna';
        x.predador.alerta = 15;
        s.necessidades.medo = Math.max(0, (s.necessidades.medo || 0) - 35);
        s.necessidades.seguranca = Math.min(100, (s.necessidades.seguranca || 50) + 20);
        r.quantidade = 1;
        r.texto = 'Brandiu fogo e gritou forte! A Pantera das Sombras recuou para a Caverna.';
    }
    break;
}
case'compartilhar_historias':{
    s.necessidades.solidao = Math.max(0, (s.necessidades.solidao || 0) - 25);
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 18);
    s.necessidades.confianca = Math.min(100, (s.necessidades.confianca || 50) + 15);
    r.quantidade = 1;
    r.texto = 'Conversou e compartilhou memórias ao calor da fogueira com os companheiros da ilha.';
    break;
}
case'cortar_arvore':{
    s.habilidades = s.habilidades || {};
    s.habilidades.forca = (s.habilidades.forca || 10) + 0.5;
    const qtdMadeira = Math.floor(Math.random() * 2) + 2;
    s.inventario.madeira = (s.inventario.madeira || 0) + qtdMadeira;
    s.necessidades.energia = Math.max(0, (s.necessidades.energia || 50) - 8);
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 10);
    r.quantidade = qtdMadeira;
    r.texto = `Derrubou e desbastou uma tora com o machado, obtendo ${qtdMadeira} vigas de madeira!`;
    break;
}
case'coletar_pedra':{
    const qtdPedra = Math.floor(Math.random() * 2) + 2;
    s.inventario.pedra = (s.inventario.pedra || 0) + qtdPedra;
    s.necessidades.energia = Math.max(0, (s.necessidades.energia || 50) - 5);
    r.quantidade = qtdPedra;
    r.texto = `Encontrou e talhou ${qtdPedra} pedras resistentes nas margens para obras e ferramentas.`;
    break;
}
case'fabricar_ferramenta':{
    s.ferramentas = s.ferramentas || {};
    s.inventario.madeira = Math.max(0, (s.inventario.madeira || 1) - 1);
    s.inventario.pedra = Math.max(0, (s.inventario.pedra || 1) - 1);
    // Cria a ferramenta que estiver faltando
    let tipo = 'machado';
    if (!s.ferramentas.machado) { s.ferramentas.machado = 1; tipo = 'machado de pedra'; }
    else if (!s.ferramentas.vara) { s.ferramentas.vara = 1; tipo = 'vara de pesca de bambu'; }
    else if (!s.ferramentas.lanca) { s.ferramentas.lanca = 1; tipo = 'lança de caça afiada'; }
    else { s.ferramentas.picareta = 1; tipo = 'picareta de mineração'; }
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 20);
    r.quantidade = 1;
    r.texto = `Trabalhou na bancada e forjou uma nova ferramenta: ${tipo}!`;
    break;
}
case'trabalhar_construcao':{
    const proj = (x.projetos || []).find(p => p && !p.concluido && p.local === s.local);
    if (proj) {
      const avanco = Math.floor(Math.random() * 15) + 15;
      proj.progresso = Math.min(100, (proj.progresso || 0) + avanco);
      s.necessidades.energia = Math.max(0, (s.necessidades.energia || 50) - 10);
      s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 15);
      if (proj.progresso >= 100) {
        proj.concluido = true;
        r.texto = `🎉 Grande marco! A construção de ${proj.nome} foi FINALIZADA pela comunidade!`;
      } else {
        r.texto = `Trabalhou na estrutura de ${proj.nome} (Progresso da obra: ${proj.progresso}%).`;
      }
      r.quantidade = avanco;
    }
    break;
}
case'mergulhar_mar':{
    const perigoTubarao = Math.random() < 0.22;
    if (perigoTubarao && x.tubarao) {
      s.necessidades.medo = Math.min(100, (s.necessidades.medo || 0) + 40);
      s.necessidades.seguranca = Math.max(0, (s.necessidades.seguranca || 50) - 25);
      r.quantidade = 0;
      r.texto = '⚠️ Um Tubarão-dos-Recifes cortou as águas próximas! Você nadou com todas as forças de volta à praia!';
    } else {
      const qtdFrutosMar = Math.floor(Math.random() * 3) + 2;
      s.inventario.alimento = (s.inventario.alimento || 0) + qtdFrutosMar;
      s.necessidades.alimento = Math.max(0, (s.necessidades.alimento || 0) - 40);
      s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 15);
      r.quantidade = qtdFrutosMar;
      r.texto = `Mergulhou nos recifes cristalinos e colheu ${qtdFrutosMar} ostras e caranguejos nos corais!`;
    }
    break;
}
case'trocar_recursos':{
    const outros = Object.values(e.seres || {}).filter(o => o.id !== s.id && o.status !== 'morto' && o.local === s.local);
    if (outros.length) {
      const vizinho = outros[0];
      if ((s.inventario.alimento || 0) >= 1) {
        s.inventario.alimento -= 1;
        vizinho.inventario.alimento = (vizinho.inventario.alimento || 0) + 1;
        vizinho.necessidades.satisfacao = Math.min(100, (vizinho.necessidades.satisfacao || 50) + 15);
      }
      e.relacoes[s.id][vizinho.id] = Math.min(100, (e.relacoes[s.id][vizinho.id] || 50) + 10);
      e.relacoes[vizinho.id][s.id] = Math.min(100, (e.relacoes[vizinho.id][s.id] || 50) + 10);
      s.necessidades.solidao = Math.max(0, (s.necessidades.solidao || 0) - 20);
      s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 15);
      r.quantidade = 1;
      r.texto = `Compartilhou provisões com ${vizinho.nome}, fortalecendo os laços da vila.`;
    }
    break;
}
case'planejar_amanha':{
    const outros = Object.values(e.seres || {}).filter(o => o.id !== s.id && o.status !== 'morto' && o.local === s.local);
    const parceiro = outros[0];
    const nomeP = parceiro?.nome || 'o companheiro';
    s.necessidades.confianca = Math.min(100, (s.necessidades.confianca || 50) + 15);
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 15);
    s.necessidades.frustracao = Math.max(0, (s.necessidades.frustracao || 0) - 20);
    if (parceiro) {
        parceiro.necessidades.confianca = Math.min(100, (parceiro.necessidades.confianca || 50) + 15);
        parceiro.necessidades.satisfacao = Math.min(100, (parceiro.necessidades.satisfacao || 50) + 15);
        parceiro.necessidades.frustracao = Math.max(0, (parceiro.necessidades.frustracao || 0) - 15);
        e.relacoes[s.id][parceiro.id] = Math.min(100, (e.relacoes[s.id][parceiro.id] || 50) + 10);
        e.relacoes[parceiro.id][s.id] = Math.min(100, (e.relacoes[parceiro.id][s.id] || 50) + 10);
        r.com = parceiro.id;
        const fala = typeof extra.fala === 'string' && extra.fala.trim() ? extra.fala.trim() : '';
        if (fala) { s.ultimaFala = fala; s.ultimaFalaCiclo = e.mundo.tempo.ciclo; }
        r.texto = `Sentou-se com ${nomeP} e planejou o dia de amanhã, avaliando estoques e combinando tarefas para a ilha.` + (fala ? ` Disse: "${fala}"` : '');
        parceiro.memoria = Array.isArray(parceiro.memoria) ? parceiro.memoria : [];
        parceiro.memoria.push({ ciclo: e.mundo.tempo.ciclo, tipo: 'fala', de: s.id, texto: r.texto });
    } else {
        r.texto = 'Refletiu sobre o futuro e planejou mentalmente as tarefas e estoques para o dia de amanhã.';
    }
    r.quantidade = 1;
    break;
}
case'contemplar_a_natureza':
case'contemplar_natureza':{
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 18);
    s.necessidades.frustracao = Math.max(0, (s.necessidades.frustracao || 0) - 25);
    s.necessidades.medo = Math.max(0, (s.necessidades.medo || 0) - 20);
    s.necessidades.curiosidade = Math.min(100, (s.necessidades.curiosidade || 0) + 15);
    r.quantidade = 1;
    r.texto = `Sentou-se em silêncio em ${espaco.nome(s.local)} para contemplar a beleza da natureza, o vento e a vastidão da Ilha.`;
    break;
}
case'pensar_sobre_a_vida':{
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 15);
    s.necessidades.curiosidade = Math.min(100, (s.necessidades.curiosidade || 0) + 20);
    s.necessidades.frustracao = Math.max(0, (s.necessidades.frustracao || 0) - 20);
    r.quantidade = 1;
    r.texto = `Parou tudo para refletir sobre sua própria existência, seus sentimentos e o mistério de estar vivo na Ilha Aurora.`;
    break;
}
case'abracar_um_amigo':
case'abracar_amigo':{
    const outros = Object.values(e.seres || {}).filter(o => o.id !== s.id && o.status !== 'morto' && o.local === s.local);
    const amigo = outros[0];
    const nomeAmigo = amigo?.nome || 'o companheiro';
    s.necessidades.solidao = Math.max(0, (s.necessidades.solidao || 0) - 35);
    s.necessidades.pertencimento = Math.min(100, (s.necessidades.pertencimento || 50) + 25);
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 20);
    s.necessidades.medo = Math.max(0, (s.necessidades.medo || 0) - 20);
    if (amigo) {
        amigo.necessidades.solidao = Math.max(0, (amigo.necessidades.solidao || 0) - 30);
        amigo.necessidades.pertencimento = Math.min(100, (amigo.necessidades.pertencimento || 50) + 20);
        amigo.necessidades.satisfacao = Math.min(100, (amigo.necessidades.satisfacao || 50) + 15);
        if (!e.relacoes) e.relacoes = {};
        if (!e.relacoes[s.id]) e.relacoes[s.id] = {};
        if (!e.relacoes[amigo.id]) e.relacoes[amigo.id] = {};
        e.relacoes[s.id][amigo.id] = Math.min(100, (e.relacoes[s.id][amigo.id] || 50) + 15);
        e.relacoes[amigo.id][s.id] = Math.min(100, (e.relacoes[amigo.id][s.id] || 50) + 15);
        r.com = amigo.id;
        r.texto = `Deu um abraço apertado e sincero em ${nomeAmigo}, fortalecendo a união e o calor humano.`;
    } else {
        r.texto = 'Sentiu saudades e desejou a presença acolhedora de um amigo.';
    }
    r.quantidade = 1;
    break;
}
case'contar_uma_historia':
case'contar_historia':{
    const outros = Object.values(e.seres || {}).filter(o => o.id !== s.id && o.status !== 'morto' && o.local === s.local);
    const ouvinte = outros[0];
    const nomeOuvinte = ouvinte?.nome || 'quem estava por perto';
    s.necessidades.solidao = Math.max(0, (s.necessidades.solidao || 0) - 25);
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 18);
    s.necessidades.pertencimento = Math.min(100, (s.necessidades.pertencimento || 50) + 15);
    if (ouvinte) {
        ouvinte.necessidades.solidao = Math.max(0, (ouvinte.necessidades.solidao || 0) - 20);
        ouvinte.necessidades.satisfacao = Math.min(100, (ouvinte.necessidades.satisfacao || 50) + 12);
        r.com = ouvinte.id;
        const fala = typeof extra.fala === 'string' && extra.fala.trim() ? extra.fala.trim() : '';
        if (fala) { s.ultimaFala = fala; s.ultimaFalaCiclo = e.mundo.tempo.ciclo; }
        r.texto = `Contou uma história cativante para ${nomeOuvinte}, partilhando imaginação e memórias.` + (fala ? ` Disse: "${fala}"` : '');
    } else {
        r.texto = 'Rememorou em voz alta histórias e lendas antigas sob o céu da Ilha.';
    }
    r.quantidade = 1;
    break;
}
case'praticar_esporte':{
    const outros = Object.values(e.seres || {}).filter(o => o.id !== s.id && o.status !== 'morto' && o.local === s.local);
    s.necessidades.frustracao = Math.max(0, (s.necessidades.frustracao || 0) - 40);
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 25);
    s.habilidades = s.habilidades || {};
    s.habilidades.forca = (s.habilidades.forca || 10) + 0.5;
    if (outros.length) {
        const colega = outros[0];
        colega.necessidades.frustracao = Math.max(0, (colega.necessidades.frustracao || 0) - 35);
        colega.necessidades.satisfacao = Math.min(100, (colega.necessidades.satisfacao || 50) + 20);
        e.relacoes[s.id][colega.id] = Math.min(100, (e.relacoes[s.id][colega.id] || 50) + 12);
        e.relacoes[colega.id][s.id] = Math.min(100, (e.relacoes[colega.id][s.id] || 50) + 12);
        r.com = colega.id;
        const fala = typeof extra.fala === 'string' && extra.fala.trim() ? extra.fala.trim() : '';
        if (fala) { s.ultimaFala = fala; s.ultimaFalaCiclo = e.mundo.tempo.ciclo; }
        r.texto = `Praticou esporte com ${colega.nome} em ${espaco.nome(s.local)}, descontraindo a mente e exercitando o corpo!` + (fala ? ` Disse: "${fala}"` : '');
        colega.memoria = Array.isArray(colega.memoria) ? colega.memoria : [];
        colega.memoria.push({ ciclo: e.mundo.tempo.ciclo, tipo: 'fala', de: s.id, texto: r.texto });
    } else {
        r.texto = `Fez corrida e exercícios físicos em ${espaco.nome(s.local)}, revigorando o ânimo e a força.`;
    }
    r.quantidade = 1;
    break;
}
case'churrasco_fogueira':{
    const outros = Object.values(e.seres || {}).filter(o => o.id !== s.id && o.status !== 'morto' && o.local === s.local);
    if ((s.inventario.alimento || 0) >= 1) s.inventario.alimento -= 1;
    s.necessidades.alimento = Math.max(0, (s.necessidades.alimento || 0) - 75);
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 30);
    s.necessidades.solidao = Math.max(0, (s.necessidades.solidao || 0) - 30);
    s.necessidades.frustracao = Math.max(0, (s.necessidades.frustracao || 0) - 25);
    for (const c of outros) {
        c.necessidades.alimento = Math.max(0, (c.necessidades.alimento || 0) - 60);
        c.necessidades.satisfacao = Math.min(100, (c.necessidades.satisfacao || 50) + 25);
        c.necessidades.solidao = Math.max(0, (c.necessidades.solidao || 0) - 25);
        e.relacoes[s.id][c.id] = Math.min(100, (e.relacoes[s.id][c.id] || 50) + 15);
        e.relacoes[c.id][s.id] = Math.min(100, (e.relacoes[c.id][s.id] || 50) + 15);
    }
    const fala = typeof extra.fala === 'string' && extra.fala.trim() ? extra.fala.trim() : '';
    if (fala) { s.ultimaFala = fala; s.ultimaFalaCiclo = e.mundo.tempo.ciclo; }
    if (outros.length) {
        r.com = outros[0].id;
        r.texto = `Assou alimentos na fogueira e partilhou uma refeição quente e animada com ${outros.map(o=>o.nome).join(', ')}!` + (fala ? ` Disse: "${fala}"` : '');
    } else {
        r.texto = 'Preparou e assou uma saborosa refeição ao calor do fogo, desfrutando de um momento reconfortante.';
    }
    r.quantidade = 1;
    break;
}
case'planejar_vila':{
    const outros = Object.values(e.seres || {}).filter(o => o.id !== s.id && o.status !== 'morto' && o.local === s.local);
    const parceiro = outros[0]?.nome || 'a comunidade';
    s.necessidades.confianca = Math.min(100, (s.necessidades.confianca || 50) + 12);
    s.necessidades.satisfacao = Math.min(100, (s.necessidades.satisfacao || 50) + 12);
    r.quantidade = 1;
    r.texto = `Conversou com ${parceiro} sobre o futuro da ilha, organizando tarefas e planos para o próximo dia.`;
    break;
}
case'mergulhar':{
    // MERGULHO honesto: peixe vem do ESTOQUE real do rio (nada é inventado);
    // fora do rio é mergulho de observação — correnteza, água fria, sem saco.
    const p=x.peixes&&x.peixes.rio;
    const noRio=s.local==='rio'&&p&&p.populacao>0;
    let pegos=0;
    if(noRio){
        pegos=Math.min(p.populacao,Math.max(1,Math.round((s.capacidades.pesca||1)*1.5)));
        p.populacao-=pegos;
        s.inventario.alimento+=pegos;
    }
    s.necessidades.higiene=Math.min(100,(s.necessidades.higiene||0)+20);
    s.necessidades.temperatura=Math.max(0,(s.necessidades.temperatura??50)-8);
    r.quantidade=pegos;
    r.pistas=['a água é fria e a correnteza puxa aqui embaixo'];
    r.texto=noRio?('Você mergulhou na correnteza e trouxe '+pegos+' peixe(s) com as mãos!'):('Você mergulhou em '+(espaco.nome(s.local)||'água')+', sentiu a correnteza e voltou para a margem.');
    break;
}
case'navegar':{
    // SAÍDA DE BARCO: inicia trajeto no grafo (mesmo formato de ir_*), nunca
    // teletransporta. O avanço é um trecho por ciclo na fase 0 da rodada, e a
    // rota até a Ilha Vizinha é feita de arestas `agua` (viagem de barco).
    const caminho=espaco.rota(s.local,'ilha_vizinha');
    if(!caminho||caminho.caminho.length<2)throw Error('Ação inválida ou indisponível: navegar');
    s.deslocamento={destino:'ilha_vizinha',caminho:caminho.caminho,i:0,iniciadoNoCiclo:e.mundo.tempo.ciclo};
    r.deslocamento={estado:'partida',destino:'ilha_vizinha',trechos:caminho.caminho.length-1};
    r.texto='Você desamarrou o barco e partiu rumo à Ilha Vizinha ('+(caminho.caminho.length-1)+' trecho(s) de água).';
    break;
}
case'explorar_desconhecido':{
    s.necessidades.energia=Math.max(0,(s.necessidades.energia||50)-10);
    s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao||50)+18);
    s.necessidades.solidao=Math.max(0,(s.necessidades.solidao||0)-12);
    s.necessidades.confianca=Math.min(100,(s.necessidades.confianca||50)+15);
    const candidatas=['floresta_densa','ruinas_antigas','santuario_fe'];
    e.descobertas=Array.isArray(e.descobertas)?e.descobertas:[];
    const pendentes=candidatas.filter(c=>!e.descobertas.some(d=>d===c||(d&&d.local===c)));
    if(pendentes.length>0){
        const novaZona=pendentes[0];
        e.descobertas.push(novaZona);
        r.descoberta=novaZona;
        r.texto=`Aventurei-me além da névoa e revelei os segredos de ${novaZona}! (+esperança, +coragem)`;
    } else {
        s.inventario.pedra=(s.inventario.pedra||0)+1;
        r.quantidade=1;
        r.texto='Aventurei-me nas profundezas inexploradas, encontrando minerais raros e expandindo os horizontes da ilha.';
    }
    break;
}
case'erguer_estrutura':{
    if((s.inventario.madeira||0)>=1) s.inventario.madeira--;
    else if((s.inventario.pedra||0)>=1) s.inventario.pedra--;
    e.mundo.estruturas=e.mundo.estruturas||{
        abrigo:{nivel:1,nome:'Abrigo Rústico',progresso:20},
        fogueira:{nivel:1,nome:'Fogueira de Pedra',progresso:30},
        santuario:{nivel:1,nome:'Altar de Pedras',progresso:0}
    };
    const est=e.mundo.estruturas;
    let tipoEst = (s.local==='fogueira') ? 'fogueira' : (s.local.startsWith('casa_') || s.local==='acampamento') ? 'abrigo' : 'santuario';
    const alvo = est[tipoEst] || est.abrigo;
    alvo.progresso = (alvo.progresso || 0) + 25;
    if(alvo.progresso >= 100 && alvo.nivel < 3){
        alvo.nivel++;
        alvo.progresso = 0;
        if(tipoEst==='abrigo'){
            alvo.nome = alvo.nivel === 2 ? 'Cabanas Iluminadas' : 'Vila dos Sobreviventes';
        } else if(tipoEst==='fogueira'){
            alvo.nome = alvo.nivel === 2 ? 'Fornalha Coberta' : 'Fornalha Perene da Vila';
        } else {
            alvo.nome = alvo.nivel === 2 ? 'Capela de Madeira Sagrada' : 'Santuário da Esperança';
        }
        r.evolucaoCivilizatoria = { estrutura: tipoEst, novoNivel: alvo.nivel, nome: alvo.nome };
        r.texto = `Trabalho cooperativo concluiu a evolução da estrutura para o Nível ${alvo.nivel}: ${alvo.nome}!`;
    } else {
        r.texto = `Trabalhou na estrutura ${alvo.nome} (${alvo.progresso}% rumo ao próximo nível).`;
    }
    s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao||50)+20);
    s.necessidades.pertencimento=Math.min(100,(s.necessidades.pertencimento||50)+20);
    r.quantidade=1;
    break;
}
case'momento_de_fe':{
    s.necessidades.medo=Math.max(0,(s.necessidades.medo||0)-35);
    s.necessidades.frustracao=Math.max(0,(s.necessidades.frustracao||0)-25);
    s.necessidades.confianca=Math.min(100,(s.necessidades.confianca||50)+30);
    s.necessidades.pertencimento=Math.min(100,(s.necessidades.pertencimento||50)+18);
    s.necessidades.satisfacao=Math.min(100,(s.necessidades.satisfacao||50)+15);
    if((s.necessidades.saude||100)<35) s.necessidades.saude += 6;
    r.texto = 'Fez um momento de reflexão profunda, acalmando o coração e renovando a fé na sobrevivência.';
    r.quantidade = 1;
    break;
}
case'conviver':{const outros=Object.values(e.seres||{}).filter(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);r.com=outros.length?outros[0].id:null;if(r.com){s.necessidades.solidao=Math.max(0,s.necessidades.solidao-15);outros[0].necessidades.solidao=Math.max(0,outros[0].necessidades.solidao-10)}break}case'falar':{const outros=Object.values(e.seres||{}).filter(o=>o.id!==s.id&&o.status!=='morto'&&o.local===s.local);r.com=outros.length?outros[0].id:null;r.texto=typeof extra.fala==='string'&&extra.fala.trim()?extra.fala.trim().slice(0,280):(typeof extra.texto==='string'&&extra.texto.trim()?extra.texto.trim().slice(0,280):(extra.motivo||'').trim().slice(0,280));if(r.texto){s.ultimaFala=r.texto;s.ultimaFalaCiclo=e.mundo.tempo.ciclo;}if(r.com){const alvo=outros[0];alvo.memoria=Array.isArray(alvo.memoria)?alvo.memoria:[];alvo.memoria.push({tipo:'fala',de:s.id,texto:r.texto,ciclo:e.mundo.tempo.ciclo});alvo.memoria=alvo.memoria.slice(-200)}break}}return r}
function ciclo(e,s,d){validar(e);if(!d||typeof d.acao!=='string'||!acoes(e,s).some(a=>a.id===d.acao))throw Error('Decisão inválida ou ação não permitida; ciclo não aplicado.');const antes={ciclo:e.mundo.tempo.ciclo,local:s.local,necessidades:{...s.necessidades}},pistas=perceber(e,s),con=executar(e,s,d.acao,undefined,{texto:d.texto,fala:d.fala,motivo:d.motivo});if(con.pistas?.length){for(const texto of con.pistas)if(!e.descobertas.includes(texto)){e.descobertas.push(texto);e.memorias.push({tipo:'observacao',texto,ciclo:e.mundo.tempo.ciclo})}}const ev=avancar(e.mundo);regenerar(e.mundo,ev);atualizar(s,e.mundo,d.acao);const evento={tipo:'ciclo',ciclo:e.mundo.tempo.ciclo,serId:s.id,antes,percepcao:pistas,decisao:{acao:d.acao,motivo:d.motivo||'',...(d.fala?{fala:d.fala}:{}),origem:d.origem||'decisor'},acao:{id:d.acao,quantidade:con.quantidade},consequencia:con,necessidades:{...s.necessidades},status:s.status,clima:e.mundo.clima};e.historico.eventos.push(evento);if(!Array.isArray(e.rastro))e.rastro=[];if(['ir_casa','melhorar_abrigo','conviver','falar','abrir_suprimento','investigar_artefato'].includes(d.acao)){e.rastro.push({ciclo:e.mundo.tempo.ciclo,serId:s.id,acao:d.acao,local:s.local,outro:con.com||null});if(e.rastro.length>200)e.rastro.shift();}e.historico.decisoes.push({ciclo:evento.ciclo,serId:s.id,...evento.decisao});validar(e);return evento}
const cicloComAuditoria=ciclo;
function cicloSeguro(e,s,d,opcoes={}){const eco=require('./ecossistema');eco.preparar(e);e.historico=e.historico||{eventos:[],decisoes:[]};e.historico.eventos=Array.isArray(e.historico.eventos)?e.historico.eventos:[];e.historico.decisoes=Array.isArray(e.historico.decisoes)?e.historico.decisoes:[];const estavaMorto=s.status==='morto',r=cicloComAuditoria(e,s,d),nascente=e.mundo.ecossistema.agua.fontes.nascente;if(estavaMorto)s.status='morto';if(d.acao==='coletar_agua')nascente.nivel=Math.max(0,nascente.nivel-(r.consequencia?.quantidade||0));eco.atualizarMundo(e,d.acao);r.agentes=[];if(!estavaMorto)eco.aprender(s,r.percepcao,e.mundo.tempo.ciclo);eco.validarCompleto(e);r.mundo={clima:e.mundo.clima,estacao:e.mundo.tempo.estacao,fauna:Object.fromEntries(Object.entries(e.mundo.ecossistema.fauna).map(([k,v])=>[k,v.populacao]))};return r}
module.exports={acoes,executar,ciclo:cicloSeguro};

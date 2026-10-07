'use strict';
const { novo } = require('./estado-v2');
const { preparar, aprender } = require('./ecossistema');
const { acoes, ciclo } = require('./motor-v2');
const { perceber } = require('./percepcao-v2');

// A transparent reference policy for repeatable mechanics runs, not a model of
// Ícaro's personality and not evidence of learning by an LLM.
function decisaoReferencia(ctx, permitidas) {
  const has = id => permitidas.some(a => a.id === id);
  if (ctx.necessidades.agua > 45) {
    if (has('beber')) return { acao:'beber', motivo:'necessidade de água' };
    if (has('coletar_agua')) return { acao:'coletar_agua', motivo:'repor água' };
    if (has('ir_rio')) return { acao:'ir_rio', motivo:'buscar água' };
  }
  if (ctx.necessidades.alimento > 45) {
    if (has('comer')) return { acao:'comer', motivo:'necessidade de alimento' };
    if (has('colher_frutas')) return { acao:'colher_frutas', motivo:'buscar alimento' };
    if (has('pescar')) return { acao:'pescar', motivo:'buscar alimento' };
    if (has('ir_bosque')) return { acao:'ir_bosque', motivo:'buscar alimento' };
    if (has('ir_rio')) return { acao:'ir_rio', motivo:'buscar alimento' };
  }
  if (ctx.necessidades.energia < 25 && has('descansar')) return { acao:'descansar', motivo:'recuperar energia' };
  return { acao:'observar', motivo:'acompanhar o ambiente' };
}

function contexto(estado, condicao) {
  const s=estado.seres.icaro, m=estado.mundo, p=perceber(estado,s);
  return { tempo:m.tempo, clima:m.clima, climaDetalhado:m.ecossistema.clima, local:s.local,
    status:s.status, necessidades:{...s.necessidades}, percepcoes:p,
    memorias:condicao==='acumulada'?(s.memoria||[]).slice(-16).map(x=>x.texto):[],
    experiencias:condicao==='acumulada'?(s.experiencia||[]).slice(-16):[],
    relacoes:estado.relacoes, faunaObservada:p.filter(x=>/peix|ave|mamífer|animais/i.test(x)) };
}

async function executarBraco(ciclos, condicao, decidir=decisaoReferencia) {
  const estado=preparar(novo()), resumo={condicao,ciclosSolicitados:ciclos,acoes:{},mudancasEcologicas:[],decisoesEmContextoEquivalente:[]};
  const s=estado.seres.icaro, baselines={peixes:estado.mundo.ecossistema.fauna.peixes.populacao,agua:estado.mundo.ecossistema.agua.fontes.lago.nivel};
  for(let i=0;i<ciclos&&s.status!=='morto';i++) {
    const permitidas=acoes(estado,s),ctx=contexto(estado,condicao),d=await decidir(ctx,permitidas);
    if(!permitidas.some(a=>a.id===d.acao)) throw Error(`Ação inválida no braço ${condicao}: ${d.acao}`);
    resumo.acoes[d.acao]=(resumo.acoes[d.acao]||0)+1;
    const r=ciclo(estado,s,d);
    aprender(s,r.percepcao,estado.mundo.tempo.ciclo);
    const eco=estado.mundo.ecossistema;
    if(i%Math.max(1,Math.floor(ciclos/12))===0)resumo.mudancasEcologicas.push({ciclo:estado.mundo.tempo.ciclo,peixes:eco.fauna.peixes.populacao,aves:eco.fauna.aves.populacao,mamiferos:eco.fauna.mamiferos.populacao,lago:eco.agua.fontes.lago.nivel,frutos:Object.values(eco.arvores).reduce((a,t)=>a+t.frutos,0)});
    // The audit metric only compares decisions under repeated equivalent
    // current conditions; it does not label a behavior as a personality.
    const key=JSON.stringify([ctx.local,ctx.percepcoes.slice().sort(),Object.keys(ctx.necessidades).filter(k=>ctx.necessidades[k]>45).sort()]);
    resumo.decisoesEmContextoEquivalente.push({chave:key,acao:d.acao,ciclo:estado.mundo.tempo.ciclo});
  }
  resumo.ciclosExecutados=estado.mundo.tempo.ciclo-24;resumo.status=s.status;resumo.baseline=baselines;
  resumo.resultado={tempo:estado.mundo.tempo,seres:Object.fromEntries(Object.entries(estado.seres).map(([id,x])=>[id,{status:x.status,necessidades:x.necessidades,memorias:(x.memoria||[]).length}])),agua:estado.mundo.ecossistema.agua.fontes,fauna:Object.fromEntries(Object.entries(estado.mundo.ecossistema.fauna).map(([id,p])=>[id,{populacao:p.populacao,individuos:p.individuos?.length,local:p.local}])),arvores:Object.keys(estado.mundo.ecossistema.arvores).length};
  return resumo;
}

async function executarExperimento({ciclos=240,decisor=decisaoReferencia}={}) {
  const controle=await executarBraco(ciclos,'controle',decisor), acumulada=await executarBraco(ciclos,'acumulada',decisor);
  const freq=x=>Object.fromEntries(Object.entries(x.acoes).map(([k,v])=>[k,Number((v/Math.max(1,x.ciclosExecutados)).toFixed(3))]));
  return { desenho:{ciclosPorBraco:ciclos,controle:'mesmo mundo-base; memória e experiências não são fornecidas ao decisor',acumulada:'estado, memória e experiências atravessam todos os ciclos',decisor:decisor===decisaoReferencia?'política de referência transparente':'decisor injetado',replicacoes:1},controle,acumulada,comparacao:{frequenciaAcoes:{controle:freq(controle),acumulada:freq(acumulada)},diferencaPeixes:acumulada.resultado.fauna.peixes.populacao-controle.resultado.fauna.peixes.populacao,diferencaLago:acumulada.resultado.agua.lago.nivel-controle.resultado.agua.lago.nivel,memoriasAcumuladas:acumulada.resultado.seres.icaro.memorias,observacao:'Com a política de referência, diferenças comportamentais são esperadas ser zero: ela não consulta memória. A execução valida a mecânica e o controle de contexto, não demonstra aprendizagem de modelo.'} };
}

if(require.main===module)executarExperimento({ciclos:Number(process.argv[2]||240)}).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e);process.exitCode=1});
module.exports={executarExperimento,executarBraco,decisaoReferencia};

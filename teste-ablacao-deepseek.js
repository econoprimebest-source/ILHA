const c=require('./cerebro-cognitivo');
async function r(n,isCog){
    console.log('\n=== '+n+' (ILHA_COG='+(isCog?'1':'0')+') ===');
    process.env.ILHA_COG=isCog?'1':'0';
    process.env.ILHA_LLM_PROVIDER='deepseek';
    const b=c.criar('lara');
    const res=[];
    const ctx={ciclo:100,dia:2,periodo:'noite',clima:'chuva forte',local:'rio',status:'com fome, com sede, cansada',percepcoes:['A chuva cai forte','O rio est� cheio','Ha peixes na superficie'],memorias:['Ícaro est� em casa','Eu estava pescando antes'],trajetoriaRecente:[{acao:'pescar',motivo:'tentando comer'}],acoes:[{id:'pescar'},{id:'ir_casa'},{id:'comer'},{id:'beber'},{id:'descansar'},{id:'observar'}]};
    if(isCog){
        ctx.cognicao={ativo:true,aura:{moduladores:{temperaturaLLL:0.77,estadoExpressivo:'em alerta'}},blocos:{'MECANISMO_TESTE':'A chuva esta forte e voc� precisa de abrigo.'}};
    }
    for(let i=0;i<20;i++){
        try{
            const d=await b.decidir(ctx,ctx.acoes,{id:'lara'});
            res.push(d.acao);
            process.stdout.write(d.acao+' | ');
        }catch(e){
            process.stdout.write('ERRO | ');
            res.push('ERRO');
        }
    }
    console.log('\n');
    return res;
}
(async()=>{
    const a=await r('COM MECANISMOS',true);
    const b=await r('SEM MECANISMOS',false);
    console.log('=== RESULTADO FINAL ===');
    const count=(arr)=>arr.reduce((acc,val)=>{acc[val]=(acc[val]||0)+1;return acc;},{});
    const ca=count(a);
    const cb=count(b);
    console.log('A (COM COG):',ca);
    console.log('B (SEM POG):',cb);
    if(JSON.stringify(ca)!==JSON.stringify(cb)){
        console.log('\nVEREDITO: Os mecanismos INFLUENCIARAM a decis�o.');
    }else{
        console.log('\nVERDITO: LLM escolheu o mesmo padr�o com e sem mecanismos.');
    }
})();
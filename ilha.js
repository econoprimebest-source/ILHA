const fs=require('fs'),path=require('path');const {novo,migrar,validar}=require('./estado-v2');const {tempoDe}=require('./calendario');const {observacaoCorporal}=require('./percepcao-v2');const {rodada}=require('./rodada-autonoma');const {carregar,gravar,anexar}=require('./persistencia-v2');
const ARQ_ESTADO=path.join(__dirname,'estado-ilha.json'),ARQ_LOG=path.join(__dirname,'logs','ilha-v2.jsonl');
function carregarEstado(){const antigo=carregar(ARQ_ESTADO);if(!antigo)return novo();const e=migrar(antigo);if(e!==antigo){const backup=ARQ_ESTADO+'.pre-v5.bak';if(!fs.existsSync(backup))fs.copyFileSync(ARQ_ESTADO,backup);gravar(ARQ_ESTADO,e)}e.mundo.tempo=tempoDe(e.mundo.tempo.ciclo);return validar(e)}
// Loop único: todos os personagens decidem pelo próprio cérebro; o motor
// executa; o mundo avança. Nenhum NPC de regra, nenhum override necessidade→ação.
async function executarCiclos(n=1,o={}){
	if(!Number.isInteger(n)||n<0)throw Error('Número de ciclos deve ser inteiro não negativo.');
	const ecossistema=require('./ecossistema');
	const estado=o.estado||carregarEstado();
	ecossistema.preparar(estado);
	validar(estado);
	if(!estado.seres.icaro)throw Error('Entidade ativa icaro ausente.');
	const arqEstado=o.arquivoEstado||ARQ_ESTADO,arqLog=o.arquivoLog||ARQ_LOG;
	for(let i=0;i<n;i++){
		let r;
		try{r=await rodada(estado,{decisor:o.decisor,cerebros:o.cerebros,acontecimentos:o.acontecimentos})}
		catch(err){if(err&&err.decisao)throw Error('Decisor indisponível; ciclo não aplicado: '+err.message);throw err}
		const timestamp=new Date().toISOString();
		r.eventos.forEach((ev,ord)=>anexar(arqLog,{...ev,ciclo:r.ciclo,ord,timestamp}));
		gravar(arqEstado,estado);
		o.onCycle?.(r);
	}
	return estado;
}
if(require.main===module)executarCiclos(Number(process.argv[2]||1)).then(e=>console.log(JSON.stringify({ciclo:e.mundo.tempo.ciclo,status:e.seres.icaro.status,tempo:e.mundo.tempo,seres:Object.fromEntries(Object.entries(e.seres).map(([id,s])=>[id,{status:s.status,local:s.local,necessidades:s.necessidades}])),ecossistema:{agua:e.mundo.ecossistema.agua.fontes,fauna:Object.fromEntries(Object.entries(e.mundo.ecossistema.fauna).map(([k,v])=>[k,v.populacao]))}},null,2))).catch(e=>{console.error(e);process.exitCode=1});
module.exports={executarCiclos,carregarEstado,ARQ_ESTADO,ARQ_LOG,observacaoCorporal};

'use strict';
// Teste do provedor DeepSeek do cerebro.js — 100% OFFLINE: o fetch é stubado,
// nenhuma chamada sai para a rede e a chave usada aqui é FICTÍCIA (declarada
// neste arquivo, montada por concatenação; a chave real nunca aparece em
// código, teste, log ou Git). Cobre: requisicao OpenAI-compatível, contrato de
// decisão acao/motivo/objetivos, validação das ações, timeout, erros sem
// exposição da chave, ausência de chave, configuração DEEPSEEK_MODEL, o
// provedor Ollama continuando selecionável e byte-compatível, e o FALLBACK
// LEGADO (decisor-original.js) também falando DeepSeek quando selecionado.
const assert=require('assert');
const cerebro=require('./cerebro');
const legado=require('./decisor-original');
const cognitivo=require('./cerebro-cognitivo');

const CHAVE_FALSA='sk-'+'stub-offline-de-teste'; // fictícia, nunca a real
const fetchOriginal=global.fetch;
function restaurar(){global.fetch=fetchOriginal}

const envOriginal={
	ILHA_LLM_PROVIDER:process.env.ILHA_LLM_PROVIDER,
	DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY,
	DEEPSEEK_MODEL:process.env.DEEPSEEK_MODEL,
	ILHA_MODELO:process.env.ILHA_MODELO,
	OLLAMA_URL:process.env.OLLAMA_URL,
	ILHA_LLM_TIMEOUT_MS:process.env.ILHA_LLM_TIMEOUT_MS
};
function restaurarEnv(){
	for(const[k,v]of Object.entries(envOriginal)){
		if(v===undefined)delete process.env[k];else process.env[k]=v;
	}
}

let total=0,falhas=0;
async function t(nome,fn){
	total++;
	try{await fn();console.log('OK   '+nome)}
	catch(e){falhas++;console.log('FAIL '+nome+' -> '+e.message)}
}

// Contexto/ser/ações mínimos no MESMO formato que a Ilha real envia.
const ser={id:'icaro',nome:'Ícaro'};
const possiveis=[{id:'observar',descricao:'olhar ao redor'},{id:'coletar_agua',descricao:'ir à nascente'},{id:'beber',descricao:'beber água limpa'}];
function contextoBase(){
	return {tempo:{ciclo:3,dia:1,periodo:'manhã',estacao:'primavera'},clima:'limpo',local:'rio',status:'vivo',
		necessidades:{sede:.4,fome:.2},percepcoes:['o rio corre calmo'],memorias:['vi a nascente cheia de manhã'],
		cortex:{passado:'cheguei à ilha há pouco',objetivos:['aprender a viver aqui']}};
}
// Stub no formato de resposta da API DeepSeek (choices[0].message.content);
// `{ollama:true}` devolve o formato do Ollama (d.message.content) no lugar.
function stubFetch(conteudo,extra={}){
	let capturado=null;
	global.fetch=async(u,o)=>{capturado={u,o:JSON.parse(o.body),opcoes:o};
		const corpo=extra.corpo!==undefined?extra.corpo
			:(conteudo==null?{}
			:(extra.ollama?{model:'stub',message:{content:conteudo}}
			:{id:'x',choices:[{message:{content:conteudo}}]}));
		return{ok:extra.ok!==false,status:extra.status||200,json:async()=>corpo}};
	return()=>capturado;
}
function respostaValida(){return'{"acao":"coletar_agua","motivo":"sediado depois de caminhar","objetivos":["achar uma fonte limpa","guardar água para a noite","aprender o caminho"]}'}

(async()=>{
	// ------------------------------------------------------------------ 1 --
	await t('1. requisição OpenAI-compatível: endpoint oficial, chave SÓ no Authorization, campos do Ollama ausentes',async()=>{
		process.env.ILHA_LLM_PROVIDER='deepseek';process.env.DEEPSEEK_API_KEY=CHAVE_FALSA;
		delete process.env.DEEPSEEK_MODEL;
		const ctx=contextoBase();
		const cap=stubFetch(respostaValida());
		try{await cerebro.decidir(ctx,possiveis,ser)}finally{restaurar()}
		const c=cap();
		assert(c,'fetch foi chamado');
		assert.equal(c.u,'https://api.deepseek.com/chat/completions','endpoint oficial');
		assert.equal(c.opcoes.method,'POST');
		assert.equal(c.opcoes.headers.authorization,'Bearer '+CHAVE_FALSA,'chave só no cabeçalho Authorization');
		// nenhuma OUTRA parte da requisição pode conter a chave
		assert(!JSON.stringify(c.o).includes(CHAVE_FALSA),'chave fora do corpo da requisição');
		assert(!Object.keys(c.opcoes.headers).some(h=>h!=='authorization'&&h!=='content-type'),'nenhum outro cabeçalho');
		// corpo no formato compatível com a API
		assert.equal(c.o.model,'deepseek-chat','modelo padrão deepseek-chat');
		assert.strictEqual(c.o.stream,false);
		assert.deepStrictEqual(c.o.response_format,{type:'json_object'},'JSON mode da API (substitui o `format` de schema do Ollama)');
		assert.strictEqual(c.o.temperature,.3,'temperatura baseline na raiz');
		// campos específicos do Ollama NÃO podem ir para a DeepSeek
		assert(!('format' in c.o),'sem JSON-Schema do Ollama');
		assert(!('think' in c.o),'sem think');
		assert(!('options' in c.o)&&!('num_predict' in c.o),'sem options do Ollama');
		// mensagens preservadas: system idêntico e prompt cognitivo completo
		assert.equal(c.o.messages.length,2,'duas mensagens, como sempre');
		assert.equal(c.o.messages[0].role,'system');
		assert.equal(c.o.messages[0].content,cerebro.system(ser),'system do próprio personagem');
		const u=c.o.messages[1];
		assert(u.content.includes('[QUEM EU SOU]')&&u.content.includes('[MEU CORPO (fatos)]')&&u.content.includes('[AGORA]')&&u.content.includes('[O QUE EU PERCEBO]')&&u.content.includes('[MINHA MEMÓRIA]'),'contexto da Ilha preservado');
		assert(u.content.includes('[AÇÕES POSSIVEIS]')&&u.content.includes('- observar: olhar ao redor'),'ações possíveis no prompt');
		assert(u.content.includes('[CONTRATO JSON]'),'contrato explícito no prompt (o response_format não impõe schema)');
		for(const p of possiveis)assert(u.content.includes(p.id),'ação '+p.id+' listada no contrato');
	});

	// ------------------------------------------------------------------ 2 --
	await t('2. contrato de decisão intacto: choices[0].message.content vira acao/motivo/origem/modelo/objetivos',async()=>{
		process.env.ILHA_LLM_PROVIDER='deepseek';process.env.DEEPSEEK_API_KEY=CHAVE_FALSA;delete process.env.DEEPSEEK_MODEL;
		const cap=stubFetch(respostaValida());
		try{
			const d=await cerebro.decidir(contextoBase(),possiveis,ser);
			assert.equal(d.acao,'coletar_agua');
			assert.equal(d.motivo,'sediado depois de caminhar');
			assert.equal(d.origem,'modelo');
			assert.equal(d.modelo,'deepseek-chat');
			assert.deepStrictEqual(d.objetivos,['achar uma fonte limpa','guardar água para a noite','aprender o caminho']);
			assert.equal(d.respostaBruta,respostaValida(),'resposta bruta preservada para auditoria');
		}finally{restaurar()}
	});

	// ------------------------------------------------------------------ 3 --
	await t('3. contexto cognitivo (ILHA_COG) e temperatura da AURA chegam à requisição DeepSeek',async()=>{
		process.env.ILHA_LLM_PROVIDER='deepseek';process.env.DEEPSEEK_API_KEY=CHAVE_FALSA;delete process.env.DEEPSEEK_MODEL;
		const ctx=contextoBase();
		ctx.cognicao={ativo:true,aura:{moduladores:{temperaturaLLM:.77,estadoExpressivo:'contido'},gatilho:null},blocos:{cuidado:'a Maria parece cansada hoje'}};
		const cap=stubFetch(respostaValida());
		try{const d=await cerebro.decidir(ctx,possiveis,ser);assert.equal(d.acao,'coletar_agua')}finally{restaurar()}
		const c=cap();
		assert.strictEqual(c.o.temperature,.77,'aura modula a temperatura efetiva (mesma receita da AURA)');
		assert(c.o.messages[1].content.includes('[MECANISMOS]'),'bloco cognitivo no prompt real enviado');
		assert(c.o.messages[1].content.includes('[CUIDADO]'),'mecanismo individual renderizado');
		assert(c.o.messages[1].content.includes('estado agora: contido'),'estado expressivo no prompt');
		// e o montarPrompt CONTINUA sem o contrato (só a mensagem o leva)
		assert(!cerebro.montarPrompt(ctx,possiveis,ser).includes('[CONTRATO JSON]'),'montarPrompt intocado');
	});

	// ------------------------------------------------------------------ 4 --
	await t('4. validação das ações preservada: fora do conjunto, sem motivo, JSON inválido e resposta vazia rejeitam',async()=>{
		process.env.ILHA_LLM_PROVIDER='deepseek';process.env.DEEPSEEK_API_KEY=CHAVE_FALSA;delete process.env.DEEPSEEK_MODEL;
		const casos=[
			['{"acao":"inventar_recurso","motivo":"fora do contrato"}',/Ação fora das possíveis: inventar_recurso/],
			['{"acao":"observar","motivo":"   "}',/Decisão sem motivo/],
			['{"acao":"observar"}',/Decisão sem motivo/],
			['isto não é json',/JSON inválido do modelo: isto não é json/]
		];
		for(const[conteudo,erro]of casos){
			const cap=stubFetch(conteudo);
			try{await assert.rejects(cerebro.decidir(contextoBase(),possiveis,ser),erro)}finally{restaurar()}
		}
		// resposta sem choices (ex.: JSON mode desligado pela API)
		const cap=stubFetch(null,{corpo:{id:'x',choices:[]}});
		try{await assert.rejects(cerebro.decidir(contextoBase(),possiveis,ser),/Resposta vazia do modelo/)}finally{restaurar()}
		// envelope ```json ...``` (defensivo) é aceito
		const cap2=stubFetch('```json\n'+respostaValida()+'\n```');
		try{const d=await cerebro.decidir(contextoBase(),possiveis,ser);assert.equal(d.acao,'coletar_agua')}finally{restaurar()}
	});

	// ------------------------------------------------------------------ 5 --
	await t('5. falha da API: erro rotulado, sem expor a chave; timeout respeita ILHA_LLM_TIMEOUT_MS',async()=>{
		process.env.ILHA_LLM_PROVIDER='deepseek';process.env.DEEPSEEK_API_KEY=CHAVE_FALSA;delete process.env.DEEPSEEK_MODEL;
		// (a) HTTP 401 → mensagem da API, chave jamais presente
		const cap=stubFetch(null,{ok:false,status:401,corpo:{error:{message:'Authentication Fails, Your api key is invalid'}}});
		try{
			await assert.rejects(cerebro.decidir(contextoBase(),possiveis,ser),err=>{
				assert(/^DeepSeek HTTP 401: Authentication Fails/.test(err.message),'status + mensagem: '+err.message);
				assert(!err.message.includes(CHAVE_FALSA),'chave não aparece no erro');
				return true;
			});
		}finally{restaurar()}
		// (b) conexão recusada → indisponibilidade honesta
		global.fetch=async()=>{throw new Error('fetch failed')};
		try{
			await assert.rejects(cerebro.decidir(contextoBase(),possiveis,ser),err=>
				/LLM indisponível: fetch failed/.test(err.message)&&!err.message.includes(CHAVE_FALSA));
		}finally{restaurar()}
		// (c) timeout com o mesmo teto ILHA_LLM_TIMEOUT_MS
		process.env.ILHA_LLM_TIMEOUT_MS='1000';
		global.fetch=(u,o)=>new Promise((_,rej)=>{
			if(o&&o.signal)o.signal.addEventListener('abort',()=>rej(Object.assign(new Error('The operation was aborted'),{name:'AbortError'})));
		});
		const t0=Date.now();
		try{
			await assert.rejects(cerebro.decidir(contextoBase(),possiveis,ser),/LLM indisponível: timeout de 1000ms em deepseek-chat/);
			assert(Date.now()-t0<6000,'timeout dispara em ~1s, não pendura');
		}finally{restaurar();delete process.env.ILHA_LLM_TIMEOUT_MS}
	});

	// ------------------------------------------------------------------ 6 --
	await t('6. sem DEEPSEEK_API_KEY: erro explícito e fetch NUNCA é chamado (sem falso sucesso, sem cair no Ollama)',async()=>{
		process.env.ILHA_LLM_PROVIDER='deepseek';
		delete process.env.DEEPSEEK_API_KEY;
		let chamado=false;
		global.fetch=async()=>{chamado=true;return{ok:true,status:200,json:async()=>({choices:[]})}};
		try{
			await assert.rejects(cerebro.decidir(contextoBase(),possiveis,ser),/DEEPSEEK_API_KEY não configurada/);
			assert.equal(chamado,false,'nenhuma requisição sem chave');
		}finally{restaurar();process.env.DEEPSEEK_API_KEY=CHAVE_FALSA}
	});

	// ------------------------------------------------------------------ 7 --
	await t('7. DEEPSEEK_MODEL configurável (deepseek-reasoner) e provedor desconhecido recusado',async()=>{
		process.env.ILHA_LLM_PROVIDER='deepseek';process.env.DEEPSEEK_API_KEY=CHAVE_FALSA;
		process.env.DEEPSEEK_MODEL='deepseek-reasoner';
		const cap=stubFetch(respostaValida());
		try{
			const d=await cerebro.decidir(contextoBase(),possiveis,ser);
			assert.equal(cap().o.model,'deepseek-reasoner','modelo vem da env');
			assert.equal(d.modelo,'deepseek-reasoner');
		}finally{restaurar();delete process.env.DEEPSEEK_MODEL}
		process.env.ILHA_LLM_PROVIDER='gpt-virtual';
		const cap2=stubFetch(respostaValida());
		try{await assert.rejects(cerebro.decidir(contextoBase(),possiveis,ser),/ILHA_LLM_PROVIDER desconhecido/)}finally{restaurar()}
	});

	// ------------------------------------------------------------------ 8 --
	await t('8. Ollama continua selecionável: mesmo corpo de antes (format schema/think/options), sem Authorization, resposta d.message.content',async()=>{
		delete process.env.ILHA_LLM_PROVIDER;
		process.env.OLLAMA_URL='http://127.0.0.1:11434/api/chat';
		process.env.ILHA_MODELO='qwen3:8b';
		const cap=stubFetch('{"acao":"beber","motivo":"sede forte agora"}',{ollama:true});
		try{
			const d=await cerebro.decidir(contextoBase(),possiveis,ser);
			const c=cap();
			assert.equal(c.u,'http://127.0.0.1:11434/api/chat','endpoint Ollama');
			assert(!('authorization' in c.opcoes.headers),'sem cabeçalho de chave no Ollama');
			assert.equal(c.o.model,'qwen3:8b','ILHA_MODELO como sempre');
			assert(!('response_format' in c.o),'sem JSON mode da DeepSeek');
			assert(!('temperature' in c.o),'temperatura continua dentro de options, não na raiz');
			assert.strictEqual(c.o.options.temperature,.3);
			assert.strictEqual(c.o.options.num_predict,320,'num_predict preservado');
			assert.strictEqual(c.o.think,false,'think preservado');
			assert.equal(c.o.format.type,'object');
			assert.deepStrictEqual(c.o.format.properties.acao.enum,['observar','coletar_agua','beber'],'enum do schema de saída intacto');
			assert.deepStrictEqual(c.o.format.required,['acao','motivo']);
			assert.strictEqual(c.o.format.additionalProperties,false);
			assert.equal(d.acao,'beber');
			assert.equal(d.origem,'modelo');
			assert.equal(d.modelo,'qwen3:8b');
		}finally{restaurar()}
	});

	// ------------------------------------------------------------------ 9 --
	await t('9. exportações compatíveis: MODELO/PROVEDOR/modeloDe respondem à configuração',()=>{
		assert(typeof cerebro.decidir==='function'&&typeof cerebro.montarPrompt==='function'&&typeof cerebro.system==='function','contrato antigo mantido');
		assert(['ollama','deepseek'].includes(cerebro.PROVEDOR),'provedor de carga válido');
		assert.equal(typeof cerebro.MODELO,'string');
		assert.equal(cerebro.modeloDe('deepseek'),process.env.DEEPSEEK_MODEL||'deepseek-chat');
		assert.equal(cerebro.modeloDe('ollama'),process.env.ILHA_MODELO||'qwen3:8b');
	});

	// --------------------------------------------------- 10 (fallback) ----
	await t('10. fallback legado (decisor-original): DeepSeek quando selecionado; contrato acao/motivo intacto; Ollama continua padrão',async()=>{
		// (a) requisição legada no formato DeepSeek
		process.env.ILHA_LLM_PROVIDER='deepseek';process.env.DEEPSEEK_API_KEY=CHAVE_FALSA;delete process.env.DEEPSEEK_MODEL;
		const cap=stubFetch('{"acao":"beber","motivo":"o corpo pede água"}');
		try{
			const d=await legado.decidir(contextoBase(),possiveis,ser);
			const c=cap();
			assert.equal(c.u,'https://api.deepseek.com/chat/completions','endpoint oficial');
			assert.equal(c.opcoes.headers.authorization,'Bearer '+CHAVE_FALSA,'chave só no Authorization');
			assert(!JSON.stringify(c.o).includes(CHAVE_FALSA),'chave fora do corpo');
			assert.deepStrictEqual(c.o.response_format,{type:'json_object'});
			assert(!('format' in c.o)&&!('think' in c.o)&&!('options' in c.o),'campos do Ollama ausentes');
			assert.equal(c.o.model,'deepseek-chat');
			assert(c.o.messages[1].content.includes('"acao"')&&c.o.messages[1].content.includes('observar, coletar_agua, beber'),'contrato de ações no prompt legado');
			assert.equal(d.acao,'beber');assert.equal(d.motivo,'o corpo pede água');
			assert.equal(d.origem,'modelo');assert.equal(d.modelo,'deepseek-chat');
		}finally{restaurar()}
		// (b) sem chave: erro honesto, sem chamada
		delete process.env.DEEPSEEK_API_KEY;
		let chamado=false;global.fetch=async()=>{chamado=true;return{ok:true,status:200,json:async()=>({choices:[]})}};
		try{
			await assert.rejects(legado.decidir(contextoBase(),possiveis,ser),/DEEPSEEK_API_KEY não configurada/);
			assert.equal(chamado,false,'sem chave não há requisição');
		}finally{restaurar();process.env.DEEPSEEK_API_KEY=CHAVE_FALSA}
		// (c) cadeia real de fallback: cerebro falha → legado (DeepSeek) decide → origem marcada
		let n=0;
		global.fetch=async(u,o)=>{n++;
			if(n===1)throw new Error('fetch failed');
			const b=JSON.parse(o.body);
			assert.equal(u,'https://api.deepseek.com/chat/completions','o legado do fallback também fala DeepSeek');
			assert(b.response_format&&b.response_format.type==='json_object');
			return{ok:true,status:200,json:async()=>({choices:[{message:{content:'{"acao":"observar","motivo":"prefiro entender antes de agir"}'}}]})}};
		try{
			const cb=cognitivo.criar('icaro');
			const d=await cb.decidir(contextoBase(),possiveis,ser);
			assert.equal(d.acao,'observar');
			assert.equal(d.origem,'fallback-legado','cascata marcada: base falhou, legado (DeepSeek) decidiu');
			assert.equal(n,2,'duas chamadas: cerebro.js falhou, decisor-original respondeu');
		}finally{restaurar();delete process.env.ILHA_LLM_PROVIDER}
		// (d) provedor Ollama continua o padrão do legado, byte-compatível
		process.env.OLLAMA_URL='http://127.0.0.1:11434/api/chat';process.env.ILHA_MODELO='qwen3:14b';
		const cap3=stubFetch('{"acao":"coletar_agua","motivo":"vou à nascente repor o cantil"}',{ollama:true});
		try{
			const d=await legado.decidir(contextoBase(),possiveis,ser);
			const c=cap3();
			assert.equal(c.u,'http://127.0.0.1:11434/api/chat');
			assert(!('authorization' in c.opcoes.headers),'sem chave no Ollama');
			assert.equal(c.o.model,'qwen3:14b');
			assert.deepStrictEqual(c.o.format.properties.acao.enum,['observar','coletar_agua','beber']);
			assert.strictEqual(c.o.think,false);
			assert.strictEqual(c.o.options.temperature,.3);
			assert.equal(d.acao,'coletar_agua');assert.equal(d.modelo,'qwen3:14b');
		}finally{restaurar()}
	});

	console.log('\n'+(total-falhas)+'/'+total+' testes OK'+(falhas?' — '+falhas+' FALHA(S)':''));
	restaurarEnv();restaurar();
	process.exit(falhas?1:0);
})().catch(e=>{console.error('ERRO NA SUÍTE:',e&&e.stack||e);restaurarEnv();restaurar();process.exit(1)});

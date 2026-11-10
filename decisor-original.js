const cortex=require('./cortex');
// PROVEDOR (17/10/2026): `ILHA_LLM_PROVIDER=deepseek` usa a API oficial
// (chave SÓ no cabeçalho Authorization, modelo via DEEPSEEK_MODEL, padrão
// deepseek-chat); sem a flag segue o Ollama de sempre (ILHA_MODELO, qwen3:14b).
// Mesmo contrato (acao/motivo) e mesmos erros 'LLM indisponível' do cerebro.js:
// este módulo é o FALLBACK DO FALLBACK do cerebro-cognitivo, e com DeepSeek
// selecionado ele também fala DeepSeek — indisponibilidade da API derruba os
// dois cérebros e só então a emergência neutra, marcada, entra.
function provedor(){return (process.env.ILHA_LLM_PROVIDER||'ollama').toLowerCase()==='deepseek'?'deepseek':'ollama'}
function modeloDe(p){return p==='deepseek'?(process.env.DEEPSEEK_MODEL||'deepseek-chat'):(process.env.ILHA_MODELO||'qwen3:14b')}
const PROVEDOR=provedor();
const MODELO=modeloDe(PROVEDOR);
function identidade(ser){if(!ser)return{nome:'Ícaro',papel:'habitante da ilha'};return{nome:ser.nome||ser.id||'Habitante',papel:ser.especie==='humano'?'habitante humano da ilha':'habitante da ilha'}}
function prompt(c,a,ser){const id=identidade(ser);const system=`Você é ${id.nome}, ${id.papel} em uma simulação. Escolha uma ação possível para ${id.nome}. Não preveja resultados. Declare um motivo curto, em uma frase, na voz de ${id.nome}.`;return[{role:'system',content:system},{role:'user',content:JSON.stringify({...c,vida:cortex.contexto(ser),acoesPossiveis:a})}]}
function interpretar(txt,a){const o=JSON.parse(txt.trim());if(!a.some(x=>x.id===o.acao)||typeof o.motivo!=='string'||!o.motivo.trim())throw Error('Decisão inválida ou sem motivo');return{acao:o.acao,motivo:o.motivo.trim()}}
async function decidir(c,a,ser){
	const p=provedor(),modelo=modeloDe(p),msgs=prompt(c,a,ser);
	// `formato` é o JSON-Schema de saída do Ollama; a API DeepSeek não o aceita —
	// lá vira response_format json_object + contrato de ações no prompt.
	let url,cab={'content-type':'application/json'},corpo;
	if(p==='deepseek'){
		const chave=process.env.DEEPSEEK_API_KEY;
		if(!chave||!chave.trim())throw Error('LLM indisponível: DEEPSEEK_API_KEY não configurada (ILHA_LLM_PROVIDER=deepseek)');
		cab.authorization='Bearer '+chave; // ÚNICA menção da chave
		msgs[1].content+='\nResponda SOMENTE com JSON no formato {"acao":"<uma das ações permitidas>","motivo":"<frase curta>"} escolhendo entre: '+a.map(x=>x.id).join(', ');
		url='https://api.deepseek.com/chat/completions';
		corpo={model:modelo,stream:false,temperature:.3,response_format:{type:'json_object'},messages:msgs};
	}else{
		const formato={type:'object',properties:{acao:{type:'string',enum:a.map(x=>x.id)},motivo:{type:'string'}},required:['acao','motivo'],additionalProperties:false};
		url=process.env.OLLAMA_URL||'http://127.0.0.1:11434/api/chat';
		corpo={model:modelo,stream:false,think:false,format:formato,options:{temperature:.3,num_predict:256},messages:msgs};
	}
	// Timeout (antes inexistente aqui): sem teto a indisponibilidade pendurava o
	// fallback; o cerebro-cognitivo também tem o dele (comPrazo), camadas somam.
	const teto=Math.max(1000,Number(process.env.ILHA_LLM_TIMEOUT_MS)||60000);
	const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
	const cron=ctrl?setTimeout(()=>ctrl.abort(),teto):null;
	let r;
	try{r=await fetch(url,{method:'POST',headers:cab,body:JSON.stringify(corpo),signal:ctrl?ctrl.signal:undefined})}
	catch(e){
		if(cron)clearTimeout(cron);
		if(e&&(e.name==='AbortError'||e.code==='ABORT_ERR'))throw Error('LLM indisponível: timeout de '+teto+'ms em '+modelo);
		throw Error('LLM indisponível: '+(e&&e.message?e.message:e));
	}
	if(cron)clearTimeout(cron);
	if(!r.ok){
		if(p==='deepseek'){
			let d='';try{const j=await r.json();if(j&&j.error&&j.error.message)d=': '+String(j.error.message).slice(0,200)}catch(e){}
			throw Error('DeepSeek HTTP '+r.status+d);
		}
		throw Error('Ollama HTTP '+r.status);
	}
	const d=await r.json(),txt=p==='deepseek'?(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content):(d.message&&d.message.content);
	if(!txt)throw Error('Resposta vazia do modelo');
	const bruto=p==='deepseek'?String(txt).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''):String(txt).trim();
	let dec;try{dec=interpretar(bruto,a)}catch(e){throw Error('JSON inválido do modelo: '+txt.slice(0,400)+' ('+e.message+')')}
	return{...dec,origem:'modelo',modelo,respostaBruta:txt}
}
module.exports={decidir,interpretar,prompt,identidade,MODELO,PROVEDOR,modeloDe};

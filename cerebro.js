'use strict';
// Cérebro dos personagens da Ilha — arquitetura: perceber → interpretar → decidir.
// Recebe condições do mundo, corpo, memória, experiências e objetivos; INTERPRETA;
// ESCOLHE uma ação entre as possíveis. Nenhuma necessidade vira ação por regra
// ("sede → beber" não existe aqui). O motor rejeita o impossível e nunca substitui.
const orig=require('./decisor-original');
// PROVEDOR LLM configurável (17/10/2026) — `ILHA_LLM_PROVIDER`:
//   'ollama'  (padrão) → endpoint local /api/chat, no FORMATO DO OLLAMA
//                        (`format` JSON-Schema, `think:false`, `options`).
//   'deepseek'         → API oficial https://api.deepseek.com/chat/completions
//                        (OpenAI-compatível). A chave viaja SÓ no cabeçalho
//                        `Authorization: Bearer ...` e nunca aparece em prompt,
//                        erro, log ou no objeto de decisão devolvido.
// O contrato de decisão (acao/motivo/objetivos), a validação das ações, o
// timeout `ILHA_LLM_TIMEOUT_MS` e os erros 'LLM indisponível: ...' são os
// MESMOS nos dois provedores: trocar de provedor não muda o contrato
// cognitivo nem a política de fallback (falha continua sendo falha honesta).
function provedor(){
	const p=String(process.env.ILHA_LLM_PROVIDER||'ollama').toLowerCase();
	if(p!=='ollama'&&p!=='deepseek')throw Error('ILHA_LLM_PROVIDER desconhecido: "'+p+'" (use "ollama" ou "deepseek")');
	return p;
}
function modeloDe(p){
	// DeepSeek: `DEEPSEEK_MODEL`, padrão `deepseek-chat`. Ollama: `ILHA_MODELO`,
	// padrão `qwen3:8b` — como sempre foi.
	return p==='deepseek'?(process.env.DEEPSEEK_MODEL||'deepseek-chat'):(process.env.ILHA_MODELO||'qwen3:8b');
}
const PROVEDOR=provedor();
const MODELO=modeloDe(PROVEDOR); // resolução de carga, mantida exportada (compat)

function system(ser){
	const nome=(ser&&(ser.nome||ser.id))||'Ícaro';
	const idade=ser&&ser.cortex&&ser.cortex.idade;
	return 'Você é '+nome+(idade?', '+idade+' anos':'')+', habitante da ilha. Você decide por você.\n'+
		'- Escolha UMA ação entre as AÇÕES POSSIVEIS. Não invente ações.\n'+
		'- Declare um motivo curto (uma frase), na sua voz, ligado ao seu corpo, à sua memória, aos seus objetivos e ao que você percebe agora.\n'+
		'- Se escolher falar ou conviver com alguém presente, pode incluir opcionalmente o campo "fala" com o que diz na sua própria voz.\n'+
		'- Você pode ignorar uma necessidade se fizer sentido para o que está vivendo; também pode agir por curiosidade, por outra pessoa, por risco ou por algo que quer.\n'+
		'- Se o corpo estiver em risco real (sede ou fome altíssimas, saúde baixa, estado crítico), considerar cuidar disso faz parte de continuar vivendo na ilha — ainda assim, quem decide é você.\n'+
		'- Opcionalmente: "objetivos" (até 3 frases curtas) do que você passou a querer agora; mantenha os que ainda importam.\n'+
		'- Não preveja resultados. Não fale por outros personagens.';
}

function montarPrompt(c,a,ser){
	const partes=[];
	const cx=c.cortex||{};
	partes.push('[QUEM EU SOU]');
	partes.push('passado: '+(cx.passado||'—'));
	const objs=(cx.objetivos||[]).map(o=>typeof o==='string'?o:o.texto);
	partes.push('objetivos atuais: '+(objs.length?objs.join('; '):'nenhum ainda'));
	partes.push('[MEU CORPO (fatos — necessidades de 0=saciado/pleno a 100=falta crítica)]');
	const n=c.necessidades||{};
	const rotulo={agua:'sede(falta_agua)',alimento:'fome(falta_alimento)',sono:'cansaco(falta_sono)'};
	partes.push(Object.entries(n).map(([k,v])=>(rotulo[k]||k)+': '+(Math.round(Number(v)*10)/10)).join(', '));
	if(c.inventario)partes.push('meu inventário carregado: água='+(Math.round((Number(c.inventario.agua)||0)*10)/10)+', alimento='+(Math.round((Number(c.inventario.alimento)||0)*10)/10)+', madeira='+(Math.round((Number(c.inventario.madeira)||0)*10)/10));
	if(c.sensacoes&&c.sensacoes.length)partes.push('sensações: '+c.sensacoes.join(', '));
	partes.push('[AGORA]');
	const t=c.tempo||{};
	partes.push('ciclo '+(t.ciclo!=null?t.ciclo:'—')+', dia '+(t.dia!=null?t.dia:'—')+', '+(t.periodo||'—')+', '+(t.estacao||'—')+' | clima: '+String(c.clima||'—')+' | local: '+c.local+' | estado: '+c.status);
	partes.push('[O QUE EU PERCEBO]');
	partes.push(c.percepcoes&&c.percepcoes.length?c.percepcoes.join('\n'):'(nada chamou minha atenção)');
	partes.push('[MINHA MEMÓRIA]');
	const mem=(c.memorias||[]).slice(-8);
	if(mem.length)partes.push(mem.map(x=>'- '+String(x)).join('\n'));
	if(cx.trajetoriaRecente&&cx.trajetoriaRecente.length)partes.push('últimas ações: '+cx.trajetoriaRecente.slice(-5).map(x=>x.acao+(x.consequencia>0?' [+'+x.consequencia+']':'')+(x.motivo?' ('+String(x.motivo).slice(0,80)+')':'')).join('; '));
	if(cx.diario&&cx.diario.length)partes.push('diário: '+cx.diario.slice(-3).join(' | '));
	if(c.experiencias&&c.experiencias.length)partes.push('experiências: '+c.experiencias.join('; '));
	if(c.relacoes){
		const rel=Object.entries(c.relacoes).filter(([k])=>!(ser&&k===ser.id));
		if(rel.length)partes.push('[RELACÕES] '+rel.map(([k,v])=>k+': '+Math.round(v)).join(', '));
	}
	// F3/f3 — MECANISMOS (camada cognitiva opt-in, `ILHA_COG=1`): renderiza no
	// prompt REAL os blocos que `cognicao.influencia` anexou ao contexto. Sem
	// `c.cognicao` esta seção não existe — prompt byte-idêntico ao anterior.
	// Aqui é a prova material de "chegou ao contexto efetivo do LLM": se a
	// trilha cognitiva marcar `presenteNoPrompt`, foi por este `partes.push`.
	const cog=c.cognicao;
	if(cog&&cog.ativo){
		const linhas=[];
		if(cog.aura&&cog.aura.moduladores&&cog.aura.moduladores.estadoExpressivo)
			linhas.push('estado agora: '+cog.aura.moduladores.estadoExpressivo+(cog.aura.gatilho?' (gatilho: '+cog.aura.gatilho+')':''));
		for(const k of Object.keys(cog.blocos||{}).sort()){
			const b=cog.blocos[k];
			if(typeof b==='string'&&b.trim())linhas.push('['+k.toUpperCase()+'] '+b.trim());
		}
		if(linhas.length){
			partes.push('[MECANISMOS]');
			partes.push(...linhas);
			partes.push('(insumos opcionais — quem decide é você, sempre)');
		}
	}
	partes.push('[AÇÕES POSSIVEIS]');
	partes.push(a.map(x=>'- '+x.id+': '+(x.descricao||x.id)).join('\n'));
	return partes.join('\n');
}

// Temperatura efetiva: a fórmula da AURA vale quando ela está no contexto
// (mesma receita do ICARO: `moduladores.temperaturaLLM`); fora do escopo ou
// inválida, o baseline .3 de sempre.
function temperaturaDe(c){
	const base=.3;
	try{
		const t=c&&c.cognicao&&c.cognicao.aura&&Number(c.cognicao.aura.moduladores&&c.cognicao.aura.moduladores.temperaturaLLM);
		return Number.isFinite(t)?Math.min(1.5,Math.max(0,t)):base;
	}catch(e){return base}
}

async function decidir(c,a,ser){
	const p=provedor(),modelo=modeloDe(p); // resolvido por chamada (runtime/testes)
	// CAMPO `formato` — JSON-Schema do Ollama (structured output): o Ollama
	// garante o `enum` de ações. A API DeepSeek NÃO aceita este campo: lá o
	// suporte a JSON é `response_format:{type:'json_object'}`, que NÃO impõe
	// schema nem enum — por isso o contrato (forma exata do objeto + lista de
	// ações permitidas) vai EXPLÍCITO no prompt, abaixo, substituindo o schema.
	const formato={type:'object',properties:{acao:{type:'string',enum:a.map(x=>x.id)},motivo:{type:'string'},fala:{type:'string'},objetivos:{type:'array',items:{type:'string'},maxItems:3}},required:['acao','motivo'],additionalProperties:false};
	const messages=[{role:'system',content:system(ser)},{role:'user',content:montarPrompt(c,a,ser)}];
	let url,cabecalhos={'content-type':'application/json'},corpo;
	if(p==='deepseek'){
		const chave=process.env.DEEPSEEK_API_KEY;
		// Sem chave não há chamada: erro honesto e explícito — nunca cai no
		// outro provedor nem finge sucesso; o fallback é decisão do chamador
		// (cerebro-cognitivo: legado → emergência, marcadas na origem).
		if(!chave||!chave.trim())throw Error('LLM indisponível: DEEPSEEK_API_KEY não configurada (ILHA_LLM_PROVIDER=deepseek)');
		cabecalhos.authorization='Bearer '+chave; // ÚNICA menção da chave
		// A palavra "json" no prompt também é exigida pelo JSON mode da API.
		messages[1].content+='\n[CONTRATO JSON]\nResponda SOMENTE com um objeto JSON (sem markdown, sem texto fora dele) no formato:\n'+
			'{"acao":"<exatamente uma das AÇÕES POSSIVEIS acima>","motivo":"<uma frase curta, na sua voz>","fala":"<opcional: frase dita em voz alta a outro sobrevivente>","objetivos":["<frase curta>","<frase curta>","<frase curta>"]}\n'+
			'"acao" e "motivo" são obrigatórios; "fala" e "objetivos" são opcionais. Ações permitidas: '+a.map(x=>x.id).join(', ');
		url='https://api.deepseek.com/chat/completions';
		// Sem `think`/`format`/`options`/`num_predict`: campos do Ollama. O
		// DeepSeek usa `temperature` na raiz e não tem teto de saída análogo —
		// o contrato curto é garantido pelo prompt, não por truncamento.
		corpo={model:modelo,stream:false,temperature:temperaturaDe(c),response_format:{type:'json_object'},messages};
	}else{
		url=process.env.OLLAMA_URL||'http://127.0.0.1:11434/api/chat';
		corpo={model:modelo,stream:false,think:false,format:formato,options:{temperature:temperaturaDe(c),num_predict:320},messages};
	}
	// TIMEOUT (risco apontado na auditoria: fetch sem teto podia pendurar o
	// ciclo inteiro). AbortController com teto configurável; no timeout o
	// chamador trata como indisponibilidade do LLM (regra dos testes).
	const teto=Math.max(1000,Number(process.env.ILHA_LLM_TIMEOUT_MS)||60000);
	const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
	const cron=ctrl?setTimeout(()=>ctrl.abort(),teto):null;
	let r;
	try{
		r=await fetch(url,{method:'POST',headers:cabecalhos,body:JSON.stringify(corpo),signal:ctrl?ctrl.signal:undefined});
	}catch(e){
		if(e&&(e.name==='AbortError'||e.code==='ABORT_ERR'))throw Error('LLM indisponível: timeout de '+teto+'ms em '+modelo);
		throw Error('LLM indisponível: '+(e&&e.message?e.message:e));
	}finally{if(cron)clearTimeout(cron)}
	if(!r.ok){
		if(p==='deepseek'){
			// Só a mensagem de erro da API, truncada — o corpo de erro não
			// contém a chave e o cabeçalho Authorization nunca é propagado.
			let d='';
			try{const j=await r.json();if(j&&j.error&&j.error.message)d=': '+String(j.error.message).slice(0,200)}catch(e){}
			throw Error('DeepSeek HTTP '+r.status+d);
		}
		throw Error('Ollama HTTP '+r.status);
	}
	const d=await r.json(); if(p==='deepseek'&&d.usage){console.log('[API-USO] '+JSON.stringify({model:modelo,prompt_tokens:d.usage.prompt_tokens,completion_tokens:d.usage.completion_tokens,total_tokens:d.usage.total_tokens}));} const txt=p==='deepseek'
		?(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)
		:(d.message&&d.message.content);
	if(!txt)throw Error('Resposta vazia do modelo');
	// JSON puro do DeepSeek; envelope defensivo ```json ...``` aceito (o Ollama
	// com `format` nunca manda — contrato dele intacto).
	const corpoTxt=p==='deepseek'?String(txt).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''):String(txt).trim();
	let o;try{o=JSON.parse(corpoTxt)}catch(e){throw Error('JSON inválido do modelo: '+txt.slice(0,400))}
	if(!o||!a.some(x=>x.id===o.acao))throw Error('Ação fora das possíveis: '+(o&&o.acao));
	if(typeof o.motivo!=='string'||!o.motivo.trim())throw Error('Decisão sem motivo');
	const objetivos=Array.isArray(o.objetivos)?o.objetivos.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):undefined;
	const fala=typeof o.fala==='string'&&o.fala.trim()?o.fala.trim().slice(0,240):undefined;
	return {acao:o.acao,motivo:o.motivo.trim().slice(0,240),...(fala?{fala}:{}),origem:'modelo',modelo,respostaBruta:txt,objetivos};
}

module.exports={decidir,montarPrompt,system,MODELO,PROVEDOR,modeloDe};

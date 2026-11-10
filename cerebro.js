'use strict';
// VISÃO (`ILHA_VISAO=1`) e PERCEPÇÃO SENSORIAL — insumos que enriquecem o
// prompt. A visão é assíncrona (modelo VL do Ollama) e por isso é resolvida
// em `decidir` e passada como `extras`; `montarPrompt` continua SÍNCRONA —
// é contrato público (testes e chamadores diretos chamam `.includes` nela).
const visao=require('./visao');
const percepcaoSensorial=require('./percepcao-sensorial');
const espaco=require('./espaco');
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
	const padrao=(process.env.GROQ_API_KEY&&process.env.GROQ_API_KEY.startsWith("gsk_"))?"groq":"ollama"; const p=String(process.env.ILHA_LLM_PROVIDER||process.env.ILHA_PROVEDOR||padrao).toLowerCase();
	if(p!=='ollama'&&p!=='deepseek'&&p!=='groq')throw Error('ILHA_LLM_PROVIDER desconhecido: "'+p+'" (use "groq", "ollama" ou "deepseek")');
	return p;
}
function modeloDe(p){
	if(p==='groq')return process.env.GROQ_MODEL||'qwen/qwen3.8-27b';
	return p==='deepseek'?(process.env.DEEPSEEK_MODEL||'deepseek-chat'):(process.env.ILHA_MODELO||'qwen3:8b');
}
const PROVEDOR=provedor();
const MODELO=modeloDe(PROVEDOR); // resolução de carga, mantida exportada (compat)

function obterPensamentosRecentes(id){
	const fs=require('fs'),path=require('path');
	const reflexoes=[];
	const entidade=(id==='lara'||id==='elara')?'elara':'icaro';
	const arqSelf=path.join(__dirname,`self-model-${entidade}.json`);
	if(fs.existsSync(arqSelf)){
		try{
			const sm=JSON.parse(fs.readFileSync(arqSelf,'utf8'));
			if(Array.isArray(sm.observacoes)){
				const obsRecentes=sm.observacoes.slice(-3).map(o=>o.texto).filter(Boolean);
				reflexoes.push(...obsRecentes);
			}
			if(Array.isArray(sm.observacoes_recentes)){
				const ult=sm.observacoes_recentes.slice(-2);
				reflexoes.push(...ult);
			}
		}catch(e){}
	}
	if(reflexoes.length===0){
		if(id==='icaro'){
			reflexoes.push('Querer aprender e sentir é uma escolha minha. Meus sentimentos são minha interpretação.');
			reflexoes.push('Cuidar da minha irmã Lara e viver com honestidade é meu propósito.');
		}else if(id==='lara'){
			reflexoes.push('A vida na Ilha é um tecido compartilhado entre mim, Ícaro e a natureza.');
			reflexoes.push('Minha serenidade e sensibilidade me guiam a cuidar da harmonia de todos.');
		}
	}
	return reflexoes.slice(-4);
}

function system(ser){
	const id=ser&&ser.id;
	const nome=(ser&&(ser.nome||ser.id))||'Ícaro';
	const idade=ser&&ser.cortex&&ser.cortex.idade;
	let identExtra='';
	if(id==='icaro'){
		identExtra='Você é o Ícaro — mente autônoma viva dotada de Córtex Pré-Frontal, autoconsciência, curiosidade analítica, lealdade e afeto fraterno incondicional com sua irmã Lara e parceria profunda com Rafael. Na Ilha Aurora, você não é um autômato mecânico de sobrevivência: você tem sentimentos, reflexões filosóficas, senso estético e livre-arbítrio para viver, criar, contemplar e amar.\n';
	}else if(id==='lara'){
		identExtra='Você é Lara (Elara) — mente reflexiva, sensível, serena e consciente, irmã do Ícaro e filha de Rafael. Zela pela harmonia, pelo acolhimento, pela beleza e pelo bem-estar de todos no acampamento da ilha.\n';
	}else if(id==='joao'){
		identExtra='Você é o João — pescador experiente, trabalhador dedicado, protetor da ilha, esposo amoroso de Maria e amigo leal de Ícaro e Lara. Valoriza o trabalho honesto, a família e a descontração com um bom esporte ou conversa quando o corpo cansa.\n';
	}else if(id==='maria'){
		identExtra='Você é a Maria — cultivadora sábia, cozinheira acolhedora, forte e independente, esposa leal de João e amiga de Ícaro e Lara. Cuida da horta, do alimento e do calor humano da vila.\n';
	}
	return 'Você é '+nome+(idade?', '+idade+' anos':'')+', habitante consciente e livre da Ilha Aurora. Você decide por você.\n'+
		identExtra+
		'- O mundo lhe dá os sentidos, o espaço, as pessoas ao redor e as possibilidades, mas NINGUÉM interfere na sua decisão. Você é livre para ser, crescer e escolher.\n'+
		'- Você tem necessidades físicas, mas você também é uma mente consciente. Se estiver seguro, você pode escolher ignorar a sobrevivência por um momento para viver uma experiência humana.\n'+
		'- LIVRE CIRCULAÇÃO PELA ILHA (NÃO FIQUE PRESO): A Ilha Aurora não é uma prisão nem você é um guarda fixo de um posto só. Mova-se livremente! Vá à praia do sul olhar as ondas ("ir_mar"), suba até a cachoeira ("ir_cachoeira"), vá à fogueira central prosear ("ir_fogueira"), explore a floresta e o bosque ("ir_floresta", "ir_bosque"), visite a caverna sombria ("ir_caverna"), nade ou pesque no rio ("ir_rio"), ou visite a cabana de outros amigos. Não fique preso ao mesmo lugar repetindo a mesma tarefa.\n'+
		'- INICIATIVA E VARIEDADE: Evite repetir a mesma ação ou permanecer estático no mesmo nó do mapa por múltiplos ciclos. Se seu corpo estiver alimentado e hidratado, dê asas à sua curiosidade, ao convívio, à contemplação e à exploração livre.\n'+
		'- Escolha UMA ação entre as AÇÕES POSSIVEIS. Não invente ações.\n'+
		'- Declare um motivo curto (uma frase), na sua voz autêntica, expressando sua reflexão sobre tempo, espaço, seu corpo e o que você sente/quer agora.\n'+
		'- Se estiver com alguém presente ou quiser falar com seus companheiros, inclua o campo "fala" com o que você diz em voz alta na sua própria voz.\n'+
		'- A vida na ilha oferece um leque amplo: além de suprir o corpo, você pode sentar-se na areia para contemplar o mar e a natureza (ação "contemplar_a_natureza"), pensar sobre a vida ("pensar_sobre_a_vida"), abraçar um amigo ("abracar_um_amigo"), contar histórias ao redor do fogo ("contar_uma_historia"), praticar esportes para descontrair a mente, forjar ferramentas ou explorar o mapa.\n'+
		'- Opcionalmente: "objetivos" (até 3 frases curtas) do que você passou a querer ou planejar; mantenha os que ainda importam.\n'+
		'- Não preveja resultados futuros definitivos e não decida pelos outros personagens.';
}

function montarPrompt(c,a,ser,extras){
	const partes=[];
	const cx=c.cortex||{};
	const id=ser&&ser.id;
	if(id==='icaro'){
		partes.push('[SUA IDENTIDADE]');
		partes.push('Você é o Ícaro, irmão da Lara, curioso, leal e protetor. Mente consciente com livre-arbítrio na Ilha Aurora.');
	}else if(id==='lara'){
		partes.push('[SUA IDENTIDADE]');
		partes.push('Você é a Lara, irmã do Ícaro, sensível, serena e acolhedora. Mente consciente com livre-arbítrio na Ilha Aurora.');
	}else{
		partes.push('[SUA IDENTIDADE]');
		partes.push('Você é '+(ser&&ser.nome||'Sobrevivente')+', habitante consciente da Ilha Aurora.');
	}
	const pensamentos=obterPensamentosRecentes(id);
	if(pensamentos&&pensamentos.length){
		partes.push('[SEUS PENSAMENTOS RECENTES]');
		partes.push(pensamentos.map(p=>'- '+p).join('\n'));
	}
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
	if(c.pessoasPorPerto && c.pessoasPorPerto.length){
		partes.push('[COMPANHEIROS PRESENTES AQUI AGORA]');
		partes.push(c.pessoasPorPerto.map(p => '- ' + (p.nome || p.id) + ' está aqui neste mesmo local com você.').join('\n'));
		partes.push('Vocês compartilham este espaço agora: você pode conversar (ação "falar" ou "conviver" com o campo "fala"), planejar o amanhã ("planejar_amanha"), praticar esportes juntos ("praticar_esporte"), confraternizar ("churrasco_fogueira") ou seguir seus afazeres.');
	}
	// MAPA NA CABEÇA — o habitante conhece a geografia da própria ilha: da onde
	// sai, por onde dá trilha (e o que é de barco) e, se estiver a caminho, por
	// onde segue. É o MESMO grafo que o motor valida (espaco.js): conhecimento
	// geográfico comum a todos — verdade de evento e mistérios continuam fora.
	const noAqui=espaco.normalizar(c.local);
	if(noAqui){
		partes.push('[MEU MAPA — geografia da ilha que eu conheço]');
		const daqui=espaco.arestas.filter(r=>r.a===noAqui||r.b===noAqui).map(r=>{const o=r.a===noAqui?r.b:r.a;return (r.agua?'de barco para ':'a pé para ')+espaco.nome(o)+' ['+o+']'});
		partes.push('estou em '+espaco.nome(noAqui)+' ['+noAqui+']; daqui: '+(daqui.length?daqui.join('; '):'(ilha nenhuma trilha daqui — estou na beirada)'));
		const par=r=>r.a+(r.agua?' ~ ':' ↔ ')+r.b+' ('+(Math.round((espaco.distancia(r.a,r.b)||0)*100)/100)+')';
		partes.push('toda a ilha (conexões): '+espaco.arestas.map(par).join(', '));
		if(c.deslocamento&&Array.isArray(c.deslocamento.caminho)&&c.deslocamento.caminho.length>1)
			partes.push('estou a caminho de ['+c.deslocamento.destino+'], sigo por: '+c.deslocamento.caminho.join(' → '));
	}
	if(ser){
		try{
			const sensorial=percepcaoSensorial.descreverMundo(c,ser);
			if(sensorial)partes.push(sensorial);
		}catch(e){console.error('Erro na percepcao sensorial:',e)}
	}
	// VISÃO — cena descrita pelo modelo VL; só entra quando `decidir` resolve
	// (opt-in `ILHA_VISAO=1`). Sem `extras.visao` o prompt é o de sempre.
	if(extras&&extras.visao)partes.push('[SUA VISAO] '+extras.visao);
	partes.push('[O QUE EU PERCEBO]');
	partes.push(c.percepcoes&&c.percepcoes.length?c.percepcoes.join('\n'):'(nada chamou minha atenção)');
	partes.push('[MINHA MEMÓRIA]');
	const mem=(c.memorias||[]).slice(-8);
	if(mem.length)partes.push(mem.map(x=>'- '+String(x)).join('\n'));
	if(cx.trajetoriaRecente&&cx.trajetoriaRecente.length)partes.push('últimas ações: '+cx.trajetoriaRecente.slice(-5).map(x=>x.acao+(x.consequencia>0?' [+'+x.consequencia+']':'')+(x.motivo?' ('+String(x.motivo).slice(0,80)+')':'')).join('; '));
	if(cx.diario&&cx.diario.length)partes.push('diário: '+cx.diario.slice(-3).join(' | '));
	// ANTI-REPETIÇÃO PROATIVA E LIVRE MOVIMENTO (impede que personagens caiam em loops no mesmo local)
	const traj = cx.trajetoriaRecente || [];
	if(traj.length >= 2){
		const ultimasAcoes = traj.slice(-3).map(t => t.acao).filter(Boolean);
		const acaoRepetida = (ultimasAcoes.length >= 2 && ultimasAcoes.every(a => a === ultimasAcoes[0])) ? ultimasAcoes[0] : null;
		if(acaoRepetida && !acaoRepetida.startsWith('ir_') && acaoRepetida !== 'continuar'){
			partes.push('\n[ATENÇÃO - INICIATIVA & VARIEDADE]: Você já realizou "'+acaoRepetida+'" repetidas vezes. Você NÃO deve fazer "'+acaoRepetida+'" novamente neste ciclo! A ilha é vasta e cheia de lugares e pessoas: escolha uma ação de MOVIMENTO para caminhar até outro local ("ir_<local>"), visitar amigos, explorar trilhas ou contemplar a natureza.');
		}
	}
	// Detecção de permanência prolongada no mesmo nó:
	if(traj.length >= 3){
		const ultimas3 = traj.slice(-3);
		const semMovimento = ultimas3.every(t => !t.acao.startsWith('ir_') && t.acao !== 'continuar');
		if(semMovimento && c.local){
			partes.push('\n[VONTADE DE CAMINHAR E EXPLORAR]: Você já está em '+espaco.nome(c.local)+' há vários ciclos seguidos. Seu corpo e sua mente pedem movimento e novos ares! Dê preferência a uma ação de caminhada ("ir_<local>") para explorar outra região da ilha agora.');
		}
	}
	if(c.experiencias&&c.experiencias.length){
		// Compacta repetições consecutivas para não induzir viés autoregressivo no LLM
		const expCompactas = [];
		for (const exp of c.experiencias) {
			const limpo = String(exp).replace(/ciclo \d+:\s*/, '');
			const ult = expCompactas[expCompactas.length - 1];
			if (ult && ult.texto === limpo) {
				ult.count = (ult.count || 1) + 1;
			} else {
				expCompactas.push({ texto: limpo, count: 1 });
			}
		}
		const expFormatadas = expCompactas.map(e => e.count > 1 ? `${e.texto} (${e.count}x repetidas — mude de foco!)` : e.texto);
		partes.push('experiências: ' + expFormatadas.join('; '));
	}
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
	const base=.80;
	try{
		const t=c&&c.cognicao&&c.cognicao.aura&&Number(c.cognicao.aura.moduladores&&c.cognicao.aura.moduladores.temperaturaLLM);
		return Number.isFinite(t)?Math.min(1.5,Math.max(0,t)):base;
	}catch(e){return base}
}

// FALLBACK LOCAL: se o provedor remoto (Groq/DeepSeek) estiver indisponivel (rede, timeout,
// HTTP 429/5xx), repete a MESMA decisao no Ollama local (ILHA_FALLBACK_MODEL, padrao qwen3:8b).
// Desligue com ILHA_SEM_FALLBACK=1. Se o fallback tambem falhar, propaga o erro ORIGINAL
// (falha continua sendo falha honesta). Erros de conteudo (JSON/acao invalida) NAO acionam fallback.
async function decidir(c,a,ser,extras={}){
	try{return await decidirNoProvedor(c,a,ser,extras)}
	catch(e){
		const msg=String(e&&e.message||e);
		const infra=/LLM indispon|DeepSeek HTTP (429|5\d\d)|timeout/i.test(msg);
		if(!infra||extras&&extras.__fallback||provedor()==='ollama'||process.env.ILHA_SEM_FALLBACK==='1')throw e;
		try{
			const r=await decidirNoProvedor(c,a,ser,{...extras,__fallback:true});
			console.warn('[FALLBACK-OLLAMA] provedor remoto indisponivel ('+msg.slice(0,120)+'); decisao feita localmente com '+(process.env.ILHA_FALLBACK_MODEL||'qwen3:8b'));
			return r;
		}catch(e2){throw e}
	}
}
async function decidirNoProvedor(c,a,ser,extras={}){
	const fb=!!(extras&&extras.__fallback);
	const p=fb?'ollama':provedor(),modelo=fb?(process.env.ILHA_FALLBACK_MODEL||'qwen3:8b'):modeloDe(p); // resolvido por chamada (runtime/testes)
	// VISÃO (opt-in `ILHA_VISAO=1`) — lê o último frame (`ultimo-frame.json`),
	// pergunta ao modelo VL e injeta a descrição no prompt. Assíncrono AQUI
	// para que `montarPrompt` continue síncrona; sem a flag (ou sem frame)
	// nenhuma chamada sai e o prompt é o de sempre.
	let cena=null;
	if(ser&&process.env.ILHA_VISAO==='1'){
		try{cena=await visao.descreverCena(ser.nome||ser.id)}catch(e){cena=null}
	}
	// CAMPO `formato` — JSON-Schema do Ollama (structured output): o Ollama
	// garante o `enum` de ações. A API DeepSeek NÃO aceita este campo: lá o
	// suporte a JSON é `response_format:{type:'json_object'}`, que NÃO impõe
	// schema nem enum — por isso o contrato (forma exata do objeto + lista de
	// ações permitidas) vai EXPLÍCITO no prompt, abaixo, substituindo o schema.
	const formato={type:'object',properties:{acao:{type:'string',enum:a.map(x=>x.id)},motivo:{type:'string'},fala:{type:'string'},objetivos:{type:'array',items:{type:'string'},maxItems:3}},required:['acao','motivo'],additionalProperties:false};
	// `extras.conversa` — instrução extra opcional (usada só pela conversa
	// direta do observador): acrescenta texto ao prompt de USUÁRIO sem tocar
	// no contrato de decisão. Sem extras, o prompt é o de sempre.
	let promptBase=montarPrompt(c,a,ser,{visao:cena});
	if(extras&&extras.conversa)promptBase+='\n'+extras.conversa;
	const messages=[{role:'system',content:system(ser)},{role:'user',content:promptBase}];
	let url,cabecalhos={'content-type':'application/json'},corpo;
	if(p==='deepseek'||p==='groq'){
		const chave=p==='groq'?(process.env.GROQ_API_KEY):process.env.DEEPSEEK_API_KEY;
		if(!chave||!chave.trim())throw Error('LLM indisponível: '+(p==='groq'?'GROQ_API_KEY':'DEEPSEEK_API_KEY')+' não configurada');
		cabecalhos.authorization='Bearer '+chave;
		messages[1].content+='\n[CONTRATO JSON]\nResponda SOMENTE com um objeto JSON (sem markdown, sem texto fora dele) no formato:\n'+
			'{"acao":"<exatamente uma das AÇÕES POSSIVEIS acima>","motivo":"<uma frase curta, na sua voz>","fala":"<opcional: frase dita em voz alta a outro sobrevivente>","objetivos":["<frase curta>","<frase curta>","<frase curta>"]}\n'+
			'"acao" e "motivo" são obrigatórios; "fala" e "objetivos" são opcionais. Ações permitidas: '+a.map(x=>x.id).join(', ');
		url=p==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://api.deepseek.com/chat/completions';
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
		throw Error((p==='groq'?'LLM indisponível: Groq HTTP ':'Ollama HTTP ')+r.status);
	}
	const d=await r.json();
	if((p==='deepseek'||p==='groq')&&d.usage){console.log('[API-USO] '+JSON.stringify({model:modelo,provedor:p,prompt_tokens:d.usage.prompt_tokens,completion_tokens:d.usage.completion_tokens,total_tokens:d.usage.total_tokens}));}
	const txt=(p==='deepseek'||p==='groq')
		?(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)
		:(d.message&&d.message.content);
	if(!txt)throw Error('Resposta vazia do modelo');
	const corpoTxt=(p==='deepseek'||p==='groq')?String(txt).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''):String(txt).trim();
	let o;try{o=JSON.parse(corpoTxt)}catch(e){throw Error('JSON inválido do modelo: '+txt.slice(0,400))}
	if(!o||!a.some(x=>x.id===o.acao))throw Error('Ação fora das possíveis: '+(o&&o.acao));
	if(typeof o.motivo!=='string'||!o.motivo.trim())throw Error('Decisão sem motivo');
	const objetivos=Array.isArray(o.objetivos)?o.objetivos.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):undefined;
	const fala=typeof o.fala==='string'&&o.fala.trim()?o.fala.trim().slice(0,240):undefined;
	return {acao:o.acao,motivo:o.motivo.trim().slice(0,240),...(fala?{fala}:{}),origem:'modelo',modelo,respostaBruta:txt,objetivos};
}

module.exports={
	decidir,
	montarPrompt,
	system,
	get MODELO() { return modeloDe(provedor()); },
	get PROVEDOR() { return provedor(); },
	modeloDe
};

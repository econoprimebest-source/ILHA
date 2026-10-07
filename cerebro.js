'use strict';
// Cérebro dos personagens da Ilha — arquitetura: perceber → interpretar → decidir.
// Recebe condições do mundo, corpo, memória, experiências e objetivos; INTERPRETA;
// ESCOLHE uma ação entre as possíveis. Nenhuma necessidade vira ação por regra
// ("sede → beber" não existe aqui). O motor rejeita o impossível e nunca substitui.
const orig=require('./decisor-original');
const MODELO=process.env.ILHA_MODELO||'qwen3:8b';

function system(ser){
	const nome=(ser&&(ser.nome||ser.id))||'Ícaro';
	const idade=ser&&ser.cortex&&ser.cortex.idade;
	return 'Você é '+nome+(idade?', '+idade+' anos':'')+', habitante da ilha. Você decide por você.\n'+
		'- Escolha UMA ação entre as AÇÕES POSSIVEIS. Não invente ações.\n'+
		'- Declare um motivo curto (uma frase), na sua voz, ligado ao seu corpo, à sua memória, aos seus objetivos e ao que você percebe agora.\n'+
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
	partes.push('[MEU CORPO (fatos)]');
	const n=c.necessidades||{};
	partes.push(Object.entries(n).map(([k,v])=>k+': '+(Math.round(Number(v)*10)/10)).join(', '));
	if(c.sensacoes&&c.sensacoes.length)partes.push('sensações: '+c.sensacoes.join(', '));
	partes.push('[AGORA]');
	const t=c.tempo||{};
	partes.push('ciclo '+(t.ciclo!=null?t.ciclo:'—')+', dia '+(t.dia!=null?t.dia:'—')+', '+(t.periodo||'—')+', '+(t.estacao||'—')+' | clima: '+String(c.clima||'—')+' | local: '+c.local+' | estado: '+c.status);
	partes.push('[O QUE EU PERCEBO]');
	partes.push(c.percepcoes&&c.percepcoes.length?c.percepcoes.join('\n'):'(nada chamou minha atenção)');
	partes.push('[MINHA MEMÓRIA]');
	const mem=(c.memorias||[]).slice(-8);
	if(mem.length)partes.push(mem.map(x=>'- '+String(x)).join('\n'));
	if(cx.trajetoriaRecente&&cx.trajetoriaRecente.length)partes.push('últimas ações: '+cx.trajetoriaRecente.slice(-5).map(x=>x.acao+(x.motivo?' ('+String(x.motivo).slice(0,80)+')':'')).join('; '));
	if(cx.diario&&cx.diario.length)partes.push('diário: '+cx.diario.slice(-3).join(' | '));
	if(c.experiencias&&c.experiencias.length)partes.push('experiências: '+c.experiencias.join('; '));
	if(c.relacoes){
		const rel=Object.entries(c.relacoes).filter(([k])=>!(ser&&k===ser.id));
		if(rel.length)partes.push('[RELACÕES] '+rel.map(([k,v])=>k+': '+Math.round(v)).join(', '));
	}
	partes.push('[AÇÕES POSSIVEIS]');
	partes.push(a.map(x=>'- '+x.id+': '+(x.descricao||x.id)).join('\n'));
	return partes.join('\n');
}

async function decidir(c,a,ser){
	const formato={type:'object',properties:{acao:{type:'string',enum:a.map(x=>x.id)},motivo:{type:'string'},objetivos:{type:'array',items:{type:'string'},maxItems:3}},required:['acao','motivo'],additionalProperties:false};
	const messages=[{role:'system',content:system(ser)},{role:'user',content:montarPrompt(c,a,ser)}];
	const r=await fetch(process.env.OLLAMA_URL||'http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:MODELO,stream:false,think:false,format:formato,options:{temperature:.3,num_predict:320},messages})});
	if(!r.ok)throw Error('Ollama HTTP '+r.status);
	const d=await r.json(),txt=d.message&&d.message.content;
	if(!txt)throw Error('Resposta vazia do modelo');
	let o;try{o=JSON.parse(txt.trim())}catch(e){throw Error('JSON inválido do modelo: '+txt.slice(0,400))}
	if(!o||!a.some(x=>x.id===o.acao))throw Error('Ação fora das possíveis: '+(o&&o.acao));
	if(typeof o.motivo!=='string'||!o.motivo.trim())throw Error('Decisão sem motivo');
	const objetivos=Array.isArray(o.objetivos)?o.objetivos.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):undefined;
	return {acao:o.acao,motivo:o.motivo.trim().slice(0,240),origem:'modelo',modelo:MODELO,respostaBruta:txt,objetivos};
}

module.exports={decidir,montarPrompt,system,MODELO};

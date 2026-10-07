'use strict';
// Cortex v2 — ambiente interno de cada personagem: trajetória, memória,
// diário de bordo e objetivos próprios. Semente neutra, sem personalidade
// programada: quem ele foi/é vem da trajetória real; quem ele será é
// construído pelo próprio cérebro (decisões), nunca por nós.
function criar(id,nome){return{id,nome,idade:{icaro:32,maria:30,joao:34,lara:28}[id]||30,biografia:{passado:'Iniciou sua trajetória na ilha.',conhecimentos:[]},diario:[],memoria:[],trajetoria:[],objetivos:[],crencas:[],criadoNoCiclo:0}}
function garantir(s,c){
	if(!s.cortex)s.cortex=this.criar(s.id,s.nome);
	if(!Array.isArray(s.cortex.diario))s.cortex.diario=[];
	if(!Array.isArray(s.cortex.memoria))s.cortex.memoria=[];
	if(!Array.isArray(s.cortex.trajetoria))s.cortex.trajetoria=[];
	if(!Array.isArray(s.cortex.objetivos))s.cortex.objetivos=[];
	if(!Array.isArray(s.cortex.crencas))s.cortex.crencas=[];
	s.cortex.criadoNoCiclo??=c||0;
	return s.cortex;
}
function registrar(s,e){
	const c=this.garantir(s);
	c.trajetoria.push({ciclo:e.ciclo,acao:e.acao,motivo:e.motivo,consequencia:e.consequencia?{quantidade:e.consequencia.quantidade||0}:null});
	c.trajetoria=c.trajetoria.slice(-500);
	if(e.experiencia)c.memoria.push(e.experiencia);
	c.memoria=c.memoria.slice(-200);
	// Diário de bordo: o que este ser viveu neste ciclo.
	if(e.acao){
		c.diario.push({ciclo:e.ciclo,acao:e.acao,motivo:String(e.motivo||'').slice(0,180),consequencia:e.consequencia?{quantidade:e.consequencia.quantidade||0}:null});
		c.diario=c.diario.slice(-400);
		s.experiencia=Array.isArray(s.experiencia)?s.experiencia:[];
		s.experiencia.push('ciclo '+e.ciclo+': '+e.acao);
		if(s.experiencia.length>40)s.experiencia.shift();
	}
	// Objetivos: propostos pelo próprio cérebro na decisão (nunca por regra externa).
	if(Array.isArray(e.objetivos)){
		for(const o of e.objetivos){const t=String(o||'').trim().slice(0,160);if(t&&!c.objetivos.some(x=>x.texto===t))c.objetivos.push({texto:t,ciclo:e.ciclo})}
		if(c.objetivos.length>8)c.objetivos=c.objetivos.slice(-8);
	}
	// Crenças: reflexões propostas pelo próprio cérebro (espaço de FASE G):
	// experiência → reflexão → crença. Guardadas só no proponente.
	if(Array.isArray(e.crencas)){
		for(const o of e.crencas){const t=String(o||'').trim().slice(0,200);if(t&&!c.crencas.some(x=>x.texto===t))c.crencas.push({texto:t,ciclo:e.ciclo})}
		if(c.crencas.length>8)c.crencas=c.crencas.slice(-8);
	}
	return c;
}
function contexto(s){
	const c=this.garantir(s);
	return{identidade:{nome:c.nome,idade:c.idade},
		passado:c.biografia.passado,
		conhecimentos:c.biografia.conhecimentos,
		diario:c.diario.slice(-6).map(d=>'ciclo '+d.ciclo+': '+d.acao+(d.motivo?' — '+d.motivo:'')),
		memoria:c.memoria.slice(-12),
		trajetoriaRecente:c.trajetoria.slice(-8).map(t=>({ciclo:t.ciclo,acao:t.acao,motivo:String(t.motivo||'').slice(0,120),consequencia:t.consequencia?t.consequencia.quantidade:null})),
		objetivos:c.objetivos.slice(-6),
		crencas:c.crencas.slice(-6)};
}
module.exports={criar,garantir,registrar,contexto};

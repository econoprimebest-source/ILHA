'use strict';
// ADAPTADOR MÍNIMO — ponto de integração do "novo cérebro do Ícaro".
//
// ESTADO HONESTO: o cérebro novo (pasta inerte cerebro-icaro/) NÃO está
// integrado. Este adaptador NÃO chama Llama/Ollama, NÃO altera modelo e NÃO
// decide nada por personagem. Ele existe para:
//   1. mapear o CONTEXTO da Ilha para o formato de fatos do cérebro novo
//      (função pura, testável — mapearContextoParaIcaro);
//   2. declarar EXATAMENTE onde ele entra quando desbloqueado;
//   3. falhar com clareza se alguém tentar usá-lo antes da hora.
//
// SITUAÇÃO APÓS O M1 (2026-10-03 — memoria-personagem.js):
//   [x] módulos de memória presentes e sincronizados byte-idênticos de
//       icaro-clean@fc915b7 (chat-persistente, compactador-chat,
//       checkpoint-identidade + nucleo-memoria-v2, nucleo-tracos);
//   [x] estado POR PERSONAGEM em memorias/<id>/ (isolamento da FASE D
//       preservado) — a memória vivida chega ao contexto via
//       `contexto.memoriaVivida` (M2).
// BLOQUEIOS RESTANTES (auditados em cerebro-icaro/):
//   - depende de Ollama (fetch /api/chat) — proibido até a FASE K;
//   - icaro-hibrido.js é daemon (HTTP 8793, sem exports, exit(1) sem o
//     próprio estado): expõe chat/reflexão com o dono, não
//     decidir(contexto,possiveis,ser).
//
// PONTO DE INTEGRAÇÃO (quando desbloqueado — FASE K):
//   const {criarCerebro}=require('./cerebro-personagem');
//   const adaptador=require('./adaptador-cerebro-icaro');
//   const icaro=criarCerebro({id:'icaro',escolher:adaptador.decidir});
//   // e em produção: rodada(estado,{cerebros:{icaro,...}})
// Até lá: PRODUÇÃO USA O DECISOR LEGADO COMO FALLBACK — este arquivo não é o
// cérebro definitivo e não pode ser apresentado como tal.
const PONTO_INTEGRACAO='criarCerebro({id:"icaro", escolher: adaptador.decidir})';

// Contexto da Ilha → fatos do cérebro novo. Só fatos (nunca ordens).
function mapearContextoParaIcaro(contexto){
	if(!contexto||typeof contexto!=='object')throw Error('mapearContextoParaIcaro: contexto inválido');
	const fatos=[];
	const nome=contexto.cortex&&contexto.cortex.identidade&&contexto.cortex.identidade.nome;
	if(nome)fatos.push('Quem fala se chama '+nome+'.');
	if(contexto.local)fatos.push('Agora estou em '+contexto.local+'.');
	const t=contexto.tempo||{};
	if(t.ciclo!=null)fatos.push('Ciclo '+t.ciclo+', dia '+t.dia+', período '+t.periodo+'.');
	if(contexto.clima)fatos.push('Clima: '+contexto.clima+'.');
	if(contexto.status)fatos.push('Estado do corpo: '+contexto.status+'.');
	const n=contexto.necessidades||{};
	if(n.agua!=null)fatos.push('Sede em '+Math.round(n.agua)+' de 100.');
	if(n.alimento!=null)fatos.push('Fome em '+Math.round(n.alimento)+' de 100.');
	if(contexto.sensacoes&&contexto.sensacoes.length)fatos.push('Sensações: '+contexto.sensacoes.join(', ')+'.');
	for(const p of contexto.pessoasPorPerto||[])fatos.push(p.nome+' está por perto.');
	const rel=contexto.relacoes||{};
	for(const[k,v]of Object.entries(rel))fatos.push('Vínculo com '+k+': '+Math.round(v)+' de 100.');
	for(const p of contexto.percepcoes||[])fatos.push('Percebo: '+p);
	for(const p of contexto.acontecimentos||[])fatos.push('Pista: '+p);
	const objs=(contexto.cortex&&contexto.cortex.objetivos)||[];
	for(const o of objs.slice(-3))fatos.push('Objeto atual: '+(typeof o==='string'?o:o.texto)+'.');
	// M2 — experiência vivida do próprio personagem (memoria-personagem):
	// fatos sobre o que JÁ aconteceu, nunca ordens nem resumo editorial.
	const viv=contexto.memoriaVivida;
	for(const r of ((viv&&viv.trajetoriaRecente)||[]).slice(-3)){
		if(r&&r.resposta_icaro)fatos.push('Vivi: '+r.resposta_icaro);
	}
	return{fatos,origem:'adaptador-cerebro-icaro'};
}

// Única porta de decisão — HOJE: falha honesta (err.decisao=true ⇒ ciclo não
// aplicado; produção nunca chega aqui porque usa o decisor legado).
function decidir(){
	const e=new Error('Cérebro novo do Ícaro não está conectado. Ponto de integração: '+PONTO_INTEGRACAO+'. Bloqueios: Ollama (FASE K) e icaro-hibrido é daemon sem decidir(contexto,possiveis,ser) — a memória por personagem e a experiência vivida no contexto já existem (M1/M2).');
	e.decisao=true;
	throw e;
}

module.exports={mapearContextoParaIcaro,decidir,PONTO_INTEGRACAO,CONEXAO_NAO_FEITA:true};

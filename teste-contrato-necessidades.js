'use strict';
// Teste de contrato: sede/fome CRESCEM, zero nao ressuscita, status recalculado
// apos cada ciclo, necessidades sociais nao zeram, e NENHUMA necessidade vira
// acao automatica (sem overrides corpo/social/NPC — o cerebro decide, o motor
// apenas executa e rejeita o impossivel). Roda contra copia em memoria do
// estado real; nunca grava estado nem log.
process.env.OLLAMA_URL='http://127.0.0.1:1/';
process.env.ILHA_MODELO='stub-contrato';

const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const Module=require('module');

const ARQ_ESTADO=path.join(__dirname,'estado-ilha.json');
const ARQ_LOG=path.join(__dirname,'logs','ilha-v2.jsonl');

function assinatura(f){const b=fs.readFileSync(f);return{sha256:crypto.createHash('sha256').update(b).digest('hex').toUpperCase(),bytes:b.length,mtime:fs.statSync(f).mtimeMs}}
const INICIAL={estado:assinatura(ARQ_ESTADO),log:assinatura(ARQ_LOG)};

// --- stub do decisor: devolve o plano do teste por ciclo, sem rede ---
let planoIcaro=[];
let cicloInicial=0;
const stubDecisor={decidir:async(c,a,ser)=>{
	const k=(c&&c.tempo?c.tempo.ciclo:0)-cicloInicial;
	const acao=(ser&&ser.id==='icaro')?(planoIcaro[k]||'esperar'):'esperar';
	if(!a.some(x=>x.id===acao))throw Error('plano invalido: '+acao+' indisponivel para '+ser.id+' no ciclo '+k);
	return{acao,motivo:'plano de teste',origem:'stub'};
}};

const caminhoDecisor=require.resolve('./decisor.js');
const decisorReal=require('./decisor');
const moduloStub=new Module(caminhoDecisor);
moduloStub.filename=caminhoDecisor;
moduloStub.loaded=true;
moduloStub.exports=stubDecisor;
require.cache[caminhoDecisor]=moduloStub;

const {rodada}=require('./rodada-autonoma');
const eco=require('./ecossistema');
const {novo}=require('./estado-v2');
const {aplicarMetabolismo}=require('./metab');
const {statusDe}=require('./seres');
const {perceber}=require('./percepcao-v2');
const {executar:executarMotor}=require('./motor-v2');
const {observacaoCorporal}=require('./ilha');

let total=0;
const falhas=[];
function check(inv,desc,fn){total++;try{fn();console.log('OK  '+inv+' '+desc)}catch(e){falhas.push(inv+' '+desc+' -> '+e.message);console.log('FAIL '+inv+' '+desc+' -> '+e.message)}}

function clonar(x){return JSON.parse(JSON.stringify(x))}
function foto(e){const o={};for(const[id,s]of Object.entries(e.seres))o[id]={status:s.status,local:s.local,n:{...s.necessidades},inv:{...s.inventario}};return o}
function garante(x,erro,bloco){if(erro)throw Error(bloco+' abortado: '+erro.message);return x}

async function rodarBloco(nome,estado,ciclos){
	cicloInicial=estado.mundo.tempo.ciclo;
	const linhas=[{foto:foto(estado),atores:new Set(),acoes:{}}];
	const origens=[];
	for(let k=0;k<ciclos;k++){
		const r=await rodada(estado);
		const atores=new Set(),acoes={};
		for(const ev of r.eventos){atores.add(ev.serId);acoes[ev.serId]=ev.decisao.acao;origens.push(ev.decisao.origem)}
		linhas.push({foto:foto(estado),atores,acoes});
	}
	const mortos=Object.entries(linhas[linhas.length-1].foto).filter(([,f])=>f.status==='morto').map(([id])=>id);
	console.log('BLOCO '+nome+': '+ciclos+' ciclos; mortos ao final: '+(mortos.join(',')||'nenhum'));
	return{linhas,origens};
}

function paresEsperar(linhas){
	const p=[];
	for(let i=1;i<linhas.length;i++)
		for(const id of Object.keys(linhas[i].foto))
			if(linhas[i].atores.has(id)&&linhas[i-1].atores.has(id)&&linhas[i].acoes[id]==='esperar'&&linhas[i-1].acoes[id]==='esperar')
				p.push({id,ciclo:i-1,antes:linhas[i-1].foto[id],depois:linhas[i].foto[id]});
	return p;
}

function conferirStatus(linhas,bloco){
	for(let i=1;i<linhas.length;i++)
		for(const[id,f]of Object.entries(linhas[i].foto)){
			const esperado=statusDe(f.n);
			if(f.status!==esperado)throw Error(bloco+' apos ciclo '+(i-1)+': '+id+' status='+f.status+' mas statusDe='+esperado);
		}
}

(async()=>{
	const bruto=JSON.parse(fs.readFileSync(ARQ_ESTADO,'utf8'));

	let regA1=null,erroA1=null;
	try{
		const estado=clonar(bruto);
		planoIcaro=new Array(55).fill('esperar');
		regA1=await rodarBloco('A1 (estado bruto, tudo esperar)',estado,55);
	}catch(e){erroA1=e;console.error('A1 abortado: '+(e.stack||e))}

	let regA2=null,erroA2=null;
	try{
		const estado=clonar(bruto);
		for(const s of Object.values(estado.seres)){
			s.local='rio';
			s.deslocamento=null;
			s.abrigo=s.abrigo||1;
			Object.assign(s.necessidades,{agua:30,alimento:30,saude:90,sono:0,energia:80,higiene:50,temperatura:25,abrigo:50,medo:0,solidao:20,seguranca:60,confianca:50,pertencimento:30,frustracao:0,satisfacao:50,curiosidade:0,tristeza:0});
			s.inventario={agua:5,alimento:5,madeira:1};
			s.status='vivo';
			s.memoria=Array.isArray(s.memoria)?s.memoria:[];
			s.experiencia=Array.isArray(s.experiencia)?s.experiencia:[];
		}
		estado.seres.icaro.status='critico'; // status propositalmente desatualizado
		planoIcaro=new Array(50).fill('esperar');
		planoIcaro[5]='comer';
		planoIcaro[7]='coletar_agua';
		planoIcaro[8]='beber';
		planoIcaro[10]='conviver';
		regA2=await rodarBloco('A2 (estado normalizado, roteiro)',estado,50);
	}catch(e){erroA2=e;console.error('A2 abortado: '+(e.stack||e))}

	// A3: necessidades altíssimas + medo altíssimo; a escolha continua livre do
	// cérebro (stub escolhe observar) e NADA transforma necessidade em ação.
	let regA3=null,erroA3=null;
	try{
		const estado=eco.preparar(novo());
		estado.seres.icaro.local='rio';
		estado.seres.icaro.necessidades.agua=90;
		estado.seres.icaro.necessidades.alimento=90;
		estado.seres.icaro.inventario={agua:3,alimento:3,madeira:0};
		estado.seres.maria.necessidades.medo=99;
		cicloInicial=estado.mundo.tempo.ciclo;
		planoIcaro=new Array(3).fill('observar');
		regA3=await rodarBloco('A3 (sede 90/fome 90/medo 99; escolha livre = observar)',estado,3);
	}catch(e){erroA3=e;console.error('A3 abortado: '+(e.stack||e))}

	const origens=[...(regA1?regA1.origens:[]),...(regA2?regA2.origens:[]),...(regA3?regA3.origens:[])];
	check('0','todas as decisoes vieram do stub (sem Ollama)',()=>{
		assert(origens.length>0,'nenhuma decisao registrada');
		for(const o of origens)if(o!=='stub')throw Error('origem inesperada: '+o);
	});

	check('1a','sede cresce a cada ciclo vivo (A1)',()=>{
		const p=paresEsperar(garante(regA1,erroA1,'A1').linhas);
		assert(p.length>0,'nenhum par medido');
		for(const x of p){const d=x.depois.n.agua-x.antes.n.agua;if(!(d>0))throw Error(x.id+' apos ciclo '+x.ciclo+': agua '+x.antes.n.agua+' -> '+x.depois.n.agua)}
	});
	check('1b','fome cresce a cada ciclo vivo (A1)',()=>{
		const p=paresEsperar(garante(regA1,erroA1,'A1').linhas);
		assert(p.length>0,'nenhum par medido');
		for(const x of p){const d=x.depois.n.alimento-x.antes.n.alimento;if(!(d>0))throw Error(x.id+' apos ciclo '+x.ciclo+': alimento '+x.antes.n.alimento+' -> '+x.depois.n.alimento)}
	});

	check('2a','zero de sede/fome nao ressuscita no metabolismo',()=>{
		const s1={necessidades:{agua:0,alimento:50,energia:80,sono:0,temperatura:25,medo:0,higiene:50,saude:80,curiosidade:0}};
		aplicarMetabolismo(s1,'esperar','nublado');
		assert(s1.necessidades.agua>=0&&s1.necessidades.agua<=5,'agua 0 -> '+s1.necessidades.agua);
		const s2={necessidades:{agua:50,alimento:0,energia:80,sono:0,temperatura:25,medo:0,higiene:50,saude:80,curiosidade:0}};
		aplicarMetabolismo(s2,'esperar','nublado');
		assert(s2.necessidades.alimento>=0&&s2.necessidades.alimento<=3,'alimento 0 -> '+s2.necessidades.alimento);
	});
	check('2b','sede alta derruba a saude e sede baixa nao derruba',()=>{
		const s1={necessidades:{agua:90,alimento:30,energia:80,sono:0,temperatura:25,medo:0,higiene:50,saude:80,curiosidade:0}};
		aplicarMetabolismo(s1,'esperar','nublado');
		assert(s1.necessidades.saude<80,'saude '+80+' -> '+s1.necessidades.saude+' sem dano com sede 90');
		const s2={necessidades:{agua:10,alimento:30,energia:80,sono:0,temperatura:25,medo:0,higiene:50,saude:80,curiosidade:0}};
		aplicarMetabolismo(s2,'esperar','nublado');
		assert(s2.necessidades.saude>=80,'saude caiu com sede baixa: '+s2.necessidades.saude);
	});

	check('3','status igual ao statusDe apos cada ciclo (A1+A2+A3)',()=>{
		conferirStatus(garante(regA1,erroA1,'A1').linhas,'A1');
		conferirStatus(garante(regA2,erroA2,'A2').linhas,'A2');
		conferirStatus(garante(regA3,erroA3,'A3').linhas,'A3');
	});

	check('4a','preparar preserva solidao/pertencimento existentes',()=>{
		const e=eco.preparar(novo());
		e.seres.icaro.necessidades.solidao=40;
		e.seres.icaro.necessidades.pertencimento=77;
		eco.preparar(e);
		assert.equal(e.seres.icaro.necessidades.solidao,40);
		assert.equal(e.seres.icaro.necessidades.pertencimento,77);
	});
	check('4b','sem reset social nos ciclos k=0..4 (A2)',()=>{
		const L=garante(regA2,erroA2,'A2').linhas;
		for(let i=1;i<=5;i++){
			const dS=L[i].foto.icaro.n.solidao-L[i-1].foto.icaro.n.solidao;
			if(Math.abs(dS-0.12)>0.01)throw Error('solidao delta do ciclo '+(i-1)+' = '+dS+' (esperado 0.12)');
			const dP=L[i].foto.icaro.n.pertencimento-L[i-1].foto.icaro.n.pertencimento;
			if(Math.abs(dP+0.015)>0.01)throw Error('pertencimento delta do ciclo '+(i-1)+' = '+dP+' (esperado -0.015)');
		}
	});
	check('4c','conviver reduz solidao e eleva pertencimento',()=>{
		const e=eco.preparar(novo());
		const s=e.seres.icaro;
		s.local='acampamento';
		s.necessidades.solidao=40;
		s.necessidades.pertencimento=30;
		eco.atualizarVidaSocial(e,s,'conviver');
		assert(s.necessidades.solidao<40,'solidao '+s.necessidades.solidao);
		assert(s.necessidades.pertencimento>30,'pertencimento '+s.necessidades.pertencimento);
	});

	check('5a','sem overrides: corpo/social/NPC de regra nao existem mais',()=>{
		assert.strictEqual(decisorReal.corpo,undefined,'decisor.corpo ainda existe');
		assert.strictEqual(decisorReal.social,undefined,'decisor.social ainda existe');
		assert(typeof decisorReal.decidir==='function','decidir ausente');
		assert.strictEqual(eco.decidirAgente,undefined,'decidirAgente ainda existe');
		assert.strictEqual(eco.cicloSocial,undefined,'cicloSocial ainda existe');
	});
	check('5b','sede/fome altas nao viram acao: escolha livre do cerebro e respeitada',()=>{
		const L=garante(regA3,erroA3,'A3').linhas;
		assert(L.length>1,'A3 sem ciclos');
		for(let i=1;i<L.length;i++){
			if(!L[i].atores.has('icaro'))throw Error('icaro deixou de agir em ciclo '+(i-1));
			assert.equal(L[i].acoes.icaro,'observar','ciclo '+(i-1)+' virou '+L[i].acoes.icaro);
			const d=L[i].foto.icaro.n.agua-L[i-1].foto.icaro.n.agua;
			if(!(d>0))throw Error('sede nao cresceu enquanto observava: '+d);
		}
		const fim=L[L.length-1].foto.icaro;
		assert.equal(fim.inv.agua,3,'inventario de agua consumido sem decisao de beber');
		assert.equal(fim.inv.alimento,3,'inventario de alimento consumido sem decisao de comer');
	});
	check('5c','motor rejeita acao impossivel sem escolher substituta',()=>{
		const e=eco.preparar(novo());
		const s=e.seres.icaro;
		s.local='acampamento';s.inventario.agua=0;
		const antes=JSON.stringify(s);
		assert.throws(()=>executarMotor(e,s,'beber'),/inválida|invalida/);
		assert.equal(JSON.stringify(s),antes,'motor alterou o ser ao rejeitar');
	});

	check('6a','nenhum salto >=50 em sede/fome entre ciclos (A1+A2)',()=>{
		const p=[...paresEsperar(garante(regA1,erroA1,'A1').linhas),...paresEsperar(garante(regA2,erroA2,'A2').linhas)];
		assert(p.length>0,'nenhum par medido');
		for(const x of p)for(const k of['agua','alimento']){
			const d=Math.abs(x.depois.n[k]-x.antes.n[k]);
			if(d>=50)throw Error(x.id+' apos ciclo '+x.ciclo+': '+k+' '+x.antes.n[k]+' -> '+x.depois.n[k]);
		}
	});
	check('6b','comer zera a fome e o metabolismo recomeça devagar (A2 k=5)',()=>{
		const v=garante(regA2,erroA2,'A2').linhas[6].foto.icaro.n.alimento;
		assert(v>=0&&v<=2.5,'alimento apos comer = '+v);
	});
	check('6c','beber zera a sede e o metabolismo recomeça devagar (A2 k=8)',()=>{
		const v=garante(regA2,erroA2,'A2').linhas[9].foto.icaro.n.agua;
		assert(v>=0&&v<=2.5,'agua apos beber = '+v);
	});

	check('7a','percepcao traduz sede alta em aviso corporal',()=>{
		const e=eco.preparar(novo());
		const s=e.seres.icaro;
		s.local='rio';
		s.necessidades.agua=90;
		const alta=perceber(e,s).join(' ');
		assert(/Minha boca está seca/i.test(alta),alta);
		s.necessidades.agua=10;
		const baixa=perceber(e,s).join(' ');
		assert(!/Minha boca está seca/i.test(baixa),baixa);
	});
	check('7b','observacao corporal marca sede intensa acima de 65',()=>{
		assert(observacaoCorporal({necessidades:{agua:90,alimento:20,sono:10,energia:80}}).includes('sede intensa'));
		assert(!observacaoCorporal({necessidades:{agua:30,alimento:20,sono:10,energia:80}}).includes('sede intensa'));
	});
	check('7c','percepcao descreve estado sem prescrever acao',()=>{
		const e=eco.preparar(novo());
		const s=e.seres.icaro;
		s.local='rio';
		s.casa='casa_icaro';
		Object.assign(s.necessidades,{agua:99,alimento:99,sono:99,medo:99,solidao:99,higiene:0,saude:10});
		const txt=perceber(e,s).join(' ');
		assert(!/preciso|deveria|seria|agora|faria bem|talvez|tenho que|devo /i.test(txt),'imperativo na percepcao: '+txt);
	});
	check('7d','beber consome estoque e zera a sede',()=>{
		const e=eco.preparar(novo());
		const s=e.seres.icaro;
		s.inventario.agua=3;
		s.necessidades.agua=80;
		executarMotor(e,s,'beber');
		assert.equal(s.inventario.agua,2);
		assert.equal(s.necessidades.agua,0);
	});
	check('7e','comer consome estoque e zera a fome',()=>{
		const e=eco.preparar(novo());
		const s=e.seres.icaro;
		s.inventario.alimento=4;
		s.necessidades.alimento=70;
		executarMotor(e,s,'comer');
		assert.equal(s.inventario.alimento,3);
		assert.equal(s.necessidades.alimento,0);
	});
	check('7f','beber sem estoque e acao invalida',()=>{
		const e=eco.preparar(novo());
		const s=e.seres.icaro;
		s.inventario.agua=0;
		assert.throws(()=>executarMotor(e,s,'beber'),/inválida|invalida/);
	});

	check('8','arquivos do mundo intactos (hash, tamanho e data)',()=>{
		const e=assinatura(ARQ_ESTADO),l=assinatura(ARQ_LOG);
		assert.equal(e.sha256,INICIAL.estado.sha256,'estado-ilha.json mudou');
		assert.equal(e.bytes,INICIAL.estado.bytes,'tamanho de estado-ilha.json mudou');
		assert.equal(e.mtime,INICIAL.estado.mtime,'data de estado-ilha.json mudou');
		assert.equal(l.sha256,INICIAL.log.sha256,'logs/ilha-v2.jsonl mudou');
		assert.equal(l.bytes,INICIAL.log.bytes,'tamanho de logs/ilha-v2.jsonl mudou');
		assert.equal(l.mtime,INICIAL.log.mtime,'data de logs/ilha-v2.jsonl mudou');
	});

	console.log('RESULTADO '+(total-falhas.length)+'/'+total+' checks OK');
	if(falhas.length){
		console.log('FALHAS:');
		for(const f of falhas)console.log(' - '+f);
		process.exitCode=1;
	}else console.log('CONTRATO DE NECESSIDADES OK');
})().catch(e=>{console.error(e&&e.stack||e);process.exitCode=1});

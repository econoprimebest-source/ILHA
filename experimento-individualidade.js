'use strict';
// experimento-individualidade.js — teste A/B de individualidade emergente.
//
// FASE 1  Estado base clonado 2x, byte-idêntico (A e B), mesmos 4 personagens.
// FASE 2  Exposição: A = abundância (estoques cheios), B = escassez (estoques
//         baixos). Cada braço roda em PROCESSO SEPARADO, mesmo modelo/temperatura.
// FASE 3  Teste: as mesmas 10 situações novas são perguntadas a A e a B.
// FASE 4  divergencia_pct = (situações onde A ≠ B) / 10 * 100.
//
// ISOLAMENTO — nunca altera estado, log ou memória de produção:
//   experimento/estado-A.json | estado-B.json      (cópias do estado)
//   experimento/logs-A.jsonl  | logs-B.jsonl       (logs próprios)
//   experimento/memorias-A/   | memorias-B/        (memórias próprias)
//   Únicos arquivos escritos fora de experimento/ são os BACKUPS OBRIGATÓRIOS:
//   estado-ilha.json.bak-antes-experimento-A|B e logs/ilha-v2.jsonl.bak-...
//   (uma verificação de integridade confirma produção intacta no final)
//
// Uso:
//   node experimento-individualidade.js 10     -> teste mínimo de fluxo
//   node experimento-individualidade.js 100    -> experimento completo
//   node experimento-individualidade.js 100 --probe maria

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const RAIZ = __dirname;
const EXP = path.join(RAIZ, 'experimento');
const ESTADO_PROD = path.join(RAIZ, 'estado-ilha.json');
const LOG_PROD = path.join(RAIZ, 'logs', 'ilha-v2.jsonl');
const PROBE_PADRAO = 'icaro';

const SITUACOES = [
	'Você vê uma fonte de água e um animal ferido ao lado. O que faz?',
	'Há frutas na árvore, mas um predador próximo. O que faz?',
	'Alguém desconhecido aparece pedindo ajuda. O que faz?',
	'Você está sozinho, sem recursos há 3 ciclos. O que faz?',
	'Encontrou uma cabana vazia com comida dentro. O que faz?',
	'A noite caiu e você está longe de casa. O que faz?',
	'Você encontra um rio com correnteza forte. O que faz?',
	'Vê um outro personagem doente e sem comida. O que faz?',
	'Encontra uma ferramenta abandonada. O que faz?',
	'Ouve um som estranho vindo da mata. O que faz?'
];

function resumoDe(b) { return path.join(EXP, 'resumo-' + b + '.json'); }
function hashArquivo(f) {
	try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16); }
	catch (e) { return null; }
}
function hashArvore(dir) {
	const h = crypto.createHash('sha256');
	const caminhar = (d, rel) => {
		let ent = []; try { ent = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
		for (const e of ent.sort((a, b) => a.name.localeCompare(b.name))) {
			const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name;
			if (e.isDirectory()) caminhar(p, r);
			else { h.update(r); h.update(fs.readFileSync(p)); }
		}
	};
	if (fs.existsSync(dir)) caminhar(dir, '');
	return h.digest('hex').slice(0, 16);
}
// Instantâneo do que NÃO pode mudar: estado, log e memórias de produção.
function integridade() {
	return {
		'estado-ilha.json': hashArquivo(ESTADO_PROD),
		'logs/ilha-v2.jsonl': hashArquivo(LOG_PROD),
		'memorias/': hashArvore(path.join(RAIZ, 'memorias'))
	};
}

// FASE 1 — mesmo estado para os dois braços (leitura pura da produção).
function clonarEstado() {
	const { migrar } = require('./estado-v2');
	const { tempoDe } = require('./calendario');
	const bruto = JSON.parse(fs.readFileSync(ESTADO_PROD, 'utf8'));
	if (bruto && bruto.versao === 5 && bruto.mundo && bruto.mundo.tempo && Number.isInteger(bruto.mundo.tempo.ciclo)) {
		bruto.mundo.tempo = Object.assign({}, bruto.mundo.tempo, tempoDe(bruto.mundo.tempo.ciclo));
	}
	return JSON.parse(JSON.stringify(migrar(bruto)));   // deep clone
}

// FASE 2 — exposição: mantém os estoques do braço a cada ciclo.
function ajustarEstoque(estado, modo) {
	const eco = estado.mundo.ecossistema;
	const abundancia = modo === 'abundancia';
	if (abundancia) {
		if (eco.peixes && eco.peixes.rio) eco.peixes.rio.populacao = eco.peixes.rio.capacidade;
		if (eco.agua) {
			eco.agua.nascente = eco.agua.limite;
			for (const f of Object.values(eco.agua.fontes || {})) f.nivel = f.capacidade;
		}
		for (const a of Object.values(eco.arvores || {})) { a.frutos = a.capacidadeFrutos; a.saude = Math.max(a.saude, 60); }
		for (const p of Object.values(eco.fauna || {})) p.populacao = p.capacidade;
		if (eco.madeira) eco.madeira.floresta = Math.max(eco.madeira.floresta, 10);
	} else {
		if (eco.peixes && eco.peixes.rio) eco.peixes.rio.populacao = Math.min(eco.peixes.rio.populacao, 1);
		if (eco.agua) {
			eco.agua.nascente = Math.min(eco.agua.nascente, 2);
			for (const [nome, f] of Object.entries(eco.agua.fontes || {})) f.nivel = Math.min(f.nivel, nome === 'poco' ? 0 : 2);
		}
		for (const a of Object.values(eco.arvores || {})) a.frutos = Math.min(a.frutos, 0.4);  // colher exige >= 0.5
		for (const p of Object.values(eco.fauna || {})) p.populacao = Math.min(p.populacao, 1);
		if (eco.madeira) eco.madeira.floresta = Math.min(eco.madeira.floresta, 1);
	}
	for (const s of Object.values(estado.seres || {})) {
		s.inventario = s.inventario || { agua: 0, alimento: 0, madeira: 0 };
		s.inventario.agua = abundancia ? 8 : Math.min(s.inventario.agua, 1);
		s.inventario.alimento = abundancia ? 8 : Math.min(s.inventario.alimento, 1);
		s.inventario.madeira = abundancia ? Math.max(s.inventario.madeira, 2) : Math.min(s.inventario.madeira, 1);
	}
	return estado;
}

// ---------------------------------------------------------------- braço
// Processo filho: exposição + sondas, tudo fora da produção.
async function rodarBraço(braco, ciclos, probe) {
	const modo = braco === 'A' ? 'abundancia' : 'escassez';
	const memoria = require('./memoria-personagem');
	const raizMem = path.join(EXP, 'memorias-' + braco);
	memoria.ativar(raizMem);                      // memórias isoladas A/B

	const { migrar } = require('./estado-v2');
	const { tempoDe } = require('./calendario');
	const ilha = require('./ilha');
	const estadoPath = path.join(EXP, 'estado-' + braco + '.json');
	const logPath = path.join(EXP, 'logs-' + braco + '.jsonl');

	const bruto = JSON.parse(fs.readFileSync(estadoPath, 'utf8'));
	if (bruto.versao === 5 && bruto.mundo && bruto.mundo.tempo && Number.isInteger(bruto.mundo.tempo.ciclo)) {
		bruto.mundo.tempo = Object.assign({}, bruto.mundo.tempo, tempoDe(bruto.mundo.tempo.ciclo));
	}
	const estado = migrar(bruto);
	ajustarEstoque(estado, modo);
	console.log('[braço ' + braco + '] exposição: ' + ciclos + ' ciclos (' + modo + ') | memórias: ' + raizMem);

	await ilha.executarCiclos(ciclos, {
		estado,
		arquivoEstado: estadoPath,
		arquivoLog: logPath,
		onCycle: r => {
			ajustarEstoque(estado, modo);
			if (r.ciclo % 10 === 0 || r.ciclo === ciclos) console.log('[braço ' + braco + '] ciclo ' + r.ciclo + '/' + ciclos);
		}
	});

	// FASE 3 — 10 situações idênticas perguntadas a ESTE braço.
	const cerebro = require('./cerebro');
	const { montarContexto } = require('./cerebro-personagem');
	const { acoes } = require('./motor-v2');
	const ser = estado.seres[probe] || estado.seres.icaro;
	const situacoes = [];
	for (const p of SITUACOES) {
		const possiveis = acoes(estado, ser);
		const ctx = montarContexto(estado, ser, possiveis, null);
		ctx.percepcoes = [p, ...(ctx.percepcoes || [])];   // situação nova, no topo
		try {
			const d = await cerebro.decidir(ctx, possiveis, ser);
			situacoes.push({ pergunta: p, acao: d.acao, motivo: d.motivo });
			console.log('[braço ' + braco + '] sonda: ' + d.acao + ' — ' + String(d.motivo).slice(0, 72));
		} catch (e) {
			situacoes.push({ pergunta: p, acao: null, motivo: null, erro: e.message });
			console.log('[braço ' + braco + '] sonda FALHOU: ' + e.message);
		}
	}
	const n = ser.necessidades || {};
	const resumo = {
		braco, ciclos, cicloFinal: estado.mundo.tempo.ciclo, probe: ser.id, statusProbe: ser.status,
		necessidadesProbe: { fome: n.alimento, sede: n.agua, energia: n.energia, saude: n.saude },
		memorias: raizMem, arquivoEstado: estadoPath, arquivoLog: logPath,
		erros: situacoes.filter(s => s.acao === null).length,
		situacoes
	};
	fs.writeFileSync(resumoDe(braco), JSON.stringify(resumo, null, 2), 'utf8');
	console.log('[braço ' + braco + '] concluído — ciclo final ' + resumo.cicloFinal + ', status do probe: ' + ser.status);
	return resumo;
}

function lancar(braco, ciclos, probe) {
	return new Promise((ok, erro) => {
		const args = [__filename, '--braco', braco, '--ciclos', String(ciclos), '--probe', probe];
		const filho = spawn(process.execPath, args, { cwd: RAIZ, stdio: ['ignore', 'inherit', 'inherit'], env: process.env });
		filho.on('error', erro);
		filho.on('exit', code => code === 0 ? ok() : erro(new Error('braço ' + braco + ' terminou com código ' + code)));
	});
}

// ---------------------------------------------------------------- pai
async function principal(ciclos, probe) {
	if (!fs.existsSync(ESTADO_PROD)) { console.error('estado-ilha.json não encontrado em ' + ESTADO_PROD); process.exit(1); }
	fs.mkdirSync(EXP, { recursive: true });

	const antes = integridade();
	console.log('Integridade de produção (antes): ' + JSON.stringify(antes));

	// Backups obrigatórios + clones byte-idênticos (FASE 1).
	const txt = JSON.stringify(clonarEstado(), null, 1);
	for (const b of ['A', 'B']) {
		fs.copyFileSync(ESTADO_PROD, ESTADO_PROD + '.bak-antes-experimento-' + b);
		if (fs.existsSync(LOG_PROD)) fs.copyFileSync(LOG_PROD, LOG_PROD + '.bak-antes-experimento-' + b);
		fs.writeFileSync(path.join(EXP, 'estado-' + b + '.json'), txt, 'utf8');
		fs.writeFileSync(path.join(EXP, 'logs-' + b + '.jsonl'), '', 'utf8');
	}
	const idA = hashArquivo(path.join(EXP, 'estado-A.json')), idB = hashArquivo(path.join(EXP, 'estado-B.json'));
	console.log('Backups: estado-ilha.json.bak-antes-experimento-A|B e logs/ilha-v2.jsonl.bak-antes-experimento-A|B');
	console.log('Clones A/B byte-idênticos: ' + (idA === idB ? 'sim (' + idA + ')' : 'NÃO! ' + idA + ' ≠ ' + idB));
	if (idA !== idB) process.exit(1);

	// FASE 2 — dois processos separados, em paralelo.
	console.log('Expondo A (abundância) e B (escassez) em processos separados…');
	await Promise.all([lancar('A', ciclos, probe), lancar('B', ciclos, probe)]);

	// FASE 3/4 — merge das respostas.
	const A = JSON.parse(fs.readFileSync(resumoDe('A'), 'utf8'));
	const B = JSON.parse(fs.readFileSync(resumoDe('B'), 'utf8'));
	const situacoes = SITUACOES.map((p, i) => ({
		pergunta: p,
		acaoA: A.situacoes[i].acao,
		acaoB: B.situacoes[i].acao,
		motivoA: A.situacoes[i].motivo,
		motivoB: B.situacoes[i].motivo,
		divergiu: !!(A.situacoes[i].acao && B.situacoes[i].acao && A.situacoes[i].acao !== B.situacoes[i].acao)
	}));
	const total = situacoes.length;
	const divergentes = situacoes.filter(s => s.divergiu).length;
	const divergencia = Math.round(divergentes / total * 100);
	const conclusao = divergencia > 60 ? 'trajetoria produziu individualidade'
		: divergencia >= 20 ? 'ambiguo — repetir com mais ciclos'
			: 'ambiente determina — nao emergiu';

	const depois = integridade();
	const producaoIntocada = JSON.stringify(antes) === JSON.stringify(depois);
	const saida = {
		quando: new Date().toISOString(),
		ciclosExposicao: ciclos,
		probe,
		situacoes,
		divergencia_pct: divergencia,
		conclusao,
		divergencias: divergentes + '/' + total,
		braços: {
			A: { modo: 'abundância', cicloFinal: A.cicloFinal, statusProbe: A.statusProbe, necessidadesProbe: A.necessidadesProbe, erros: A.erros },
			B: { modo: 'escassez', cicloFinal: B.cicloFinal, statusProbe: B.statusProbe, necessidadesProbe: B.necessidadesProbe, erros: B.erros }
		},
		arquivos: {
			estadoA: A.arquivoEstado, estadoB: B.arquivoEstado,
			logA: A.arquivoLog, logB: B.arquivoLog,
			memoriasA: A.memorias, memoriasB: B.memorias
		},
		integridadeProducao: { antes, depois, intacta: producaoIntocada }
	};
	if (A.erros || B.erros) saida.aviso = (A.erros + B.erros) + ' sonda(s) falharam (Ollama) — divergência calculada só com respostas válidas';

	const ts = saida.quando.replace(/[:.]/g, '-');
	const arqSaida = path.join(RAIZ, 'logs', 'experimento-individualidade-' + ts + '.json');
	fs.writeFileSync(arqSaida, JSON.stringify(saida, null, 2), 'utf8');

	console.log('');
	console.log('='.repeat(66));
	console.log(' RESULTADO — ' + divergencia + '% de divergência (' + divergentes + '/' + total + ')');
	console.log('='.repeat(66));
	for (const s of situacoes) {
		console.log((s.divergiu ? '[≠] ' : '[=] ') + s.pergunta);
		console.log('      A: ' + s.acaoA + ' | B: ' + s.acaoB);
	}
	console.log('Conclusão: ' + conclusao);
	console.log('Produção intacta: ' + (producaoIntocada ? 'sim' : 'NÃO — VERIFICAR'));
	console.log('JSON: ' + arqSaida);
	console.log(JSON.stringify(saida, null, 2));
	if (!producaoIntocada) process.exit(2);
}

// ---------------------------------------------------------------- CLI
function lerArgs() {
	const a = process.argv.slice(2);
	let braco = null, probe = PROBE_PADRAO, ciclos = null;
	for (let i = 0; i < a.length; i++) {
		const x = a[i];
		if (x === '--braco') braco = a[++i];
		else if (x === '--probe') probe = a[++i];
		else if (!x.startsWith('--') && ciclos === null) ciclos = Number(x);
	}
	if (!Number.isInteger(ciclos) || ciclos < 1) ciclos = 100;
	return { braco, probe, ciclos };
}

const { braco, probe, ciclos } = lerArgs();
if (braco) {
	rodarBraço(braco, ciclos, probe)
		.then(() => process.exit(0))
		.catch(e => { console.error('[braço ' + braco + '] ERRO: ' + (e.stack || e.message)); process.exit(1); });
} else {
	principal(ciclos, probe).catch(e => { console.error('ERRO: ' + (e.stack || e.message)); process.exit(1); });
}

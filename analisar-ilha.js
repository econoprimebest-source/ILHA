'use strict';
// analisar-ilha.js — relatório de saúde comportamental a partir do log da Ilha.
//
// SOMENTE LEITURA: não grava, não modifica e não apaga log, estado, memória
// nem nenhum arquivo do projeto.
//
// Uso:
//   node analisar-ilha.js [rodadas] [arquivo.log]
//     rodadas : quantos ciclos analisar, contando de trás pra frente (padrão 200)
//     arquivo : log alternativo (padrão: logs/ilha-v2.jsonl; se estiver vazio,
//               cai para o .jsonl mais recente que tenha conteúdo e avisa)
//
// Relatório:
//   1. Frequência de ações por personagem (janela dos últimos N ciclos)
//   2. Ciclos de risco consecutivos por personagem (todo o log)  -> ALERTA se > 5
//   3. Distribuição de motivos (top 10 agrupados pelo verbo inicial)
//   4. Mudança de motivos por faixa de 100 ciclos
//   5. Status final (fome, sede, energia, saúde) por personagem

const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const LOG_PADRAO = path.join(RAIZ, 'logs', 'ilha-v2.jsonl');
const LIMITE_RISCO = 5;   // mais de 5 ciclos consecutivos em risco => ALERTA
const BLOCO = 100;        // faixas de comparação de motivos

// O que já cuida do risco no próprio ciclo (fome = necessidades.alimento,
// sede = necessidades.agua; "coletar" = coleta de ALIMENTO: colher/pescar/caçar).
const RISCOS = [
	{ id: 'fome', campo: 'alimento', nome: 'fome > 70', resolve: new Set(['comer', 'colher_frutas', 'pescar', 'caçar']) },
	{ id: 'sede', campo: 'agua', nome: 'sede > 70', resolve: new Set(['beber', 'coletar_agua']) },
	{ id: 'energia', campo: 'energia', nome: 'energia < 20', resolve: new Set(['descansar']) }
];

function titulo(n, t) {
	console.log('');
	console.log('='.repeat(66));
	console.log(' ' + n + '. ' + t);
	console.log('='.repeat(66));
}

// ---------------------------------------------------------------- log

function existeComConteudo(arq) {
	try { return fs.statSync(arq).isFile() && fs.statSync(arq).size > 0; } catch (e) { return false; }
}

function candidatos() {
	const lista = [];
	const add = f => { if (existeComConteudo(f) && !lista.includes(f)) lista.push(f); };
	add(LOG_PADRAO);
	const dirLogs = path.join(RAIZ, 'logs');
	try {
		for (const n of fs.readdirSync(dirLogs)) if (n.endsWith('.jsonl')) add(path.join(dirLogs, n));
	} catch (e) { /* sem logs/ */ }
	const dirBk = path.join(RAIZ, 'backups');
	const caminhar = (d, prof) => {
		if (prof > 3) return;
		let ent = []; try { ent = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
		for (const e of ent) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) caminhar(p, prof + 1);
			else if (e.name.endsWith('.jsonl')) add(p);
		}
	};
	if (fs.existsSync(dirBk)) caminhar(dirBk, 0);
	return lista.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function escolherArquivo(arg) {
	if (arg) {
		const a = path.resolve(arg);
		if (!existeComConteudo(a)) { console.error('Arquivo vazio ou inexistente: ' + a); process.exit(1); }
		return { arquivo: a, fallback: false };
	}
	if (existeComConteudo(LOG_PADRAO)) return { arquivo: LOG_PADRAO, fallback: false };
	const alt = candidatos()[0];
	if (!alt) {
		console.error('Nenhum log com conteúdo encontrado (' + LOG_PADRAO + ' vazio, sem backups).');
		process.exit(1);
	}
	return { arquivo: alt, fallback: true };
}

function lerLinhas(arq) {
	const bruto = fs.readFileSync(arq, 'utf8');
	const linhas = bruto.split(/\r?\n/).filter(l => l.trim());
	const regs = [], invalidas = [];
	for (const l of linhas) {
		try { regs.push(JSON.parse(l)); } catch (e) { invalidas.push(l.slice(0, 80)); }
	}
	return { regs, invalidas, bruto };
}

// Normaliza os formatos que já passaram pelo log:
//   a) tipo 'ciclo' (motor)          -> decisao.acao/motivo + antes.necessidades
//   b) tipo 'rodada-autonoma' (ilha) -> decisao.acao/motivo + antes.necessidades
//   c) linha reduzida (rodar-ilha)   -> acao/motivo soltos, SEM necessidades
function normalizar(l) {
	const acao = typeof l.acao === 'object' && l.acao ? l.acao.id : l.acao;
	return {
		ciclo: Number(l.ciclo),
		serId: String(l.serId || l.nome || '?'),
		nome: consertar(String(l.nome || l.serId || '?')),
		acao: String(acao || (l.decisao && l.decisao.acao) || '?'),
		motivo: consertar(String(l.motivo || (l.decisao && l.decisao.motivo) || '')),
		antesNec: (l.antes && l.antes.necessidades) || null,   // estado ANTES da ação
		nec: l.necessidades || null,                            // estado DEPOIS (formato antigo)
		status: l.statusFinal || l.status || null,
		local: l.localFinal || l.local || null,
		timestamp: l.timestamp || null
	};
}

// Últimos N ciclos (rodadas), contando de trás pra frente.
function janela(regs, N) {
	const vistos = new Set(), alvo = new Set();
	for (let i = regs.length - 1; i >= 0; i--) {
		const c = regs[i].ciclo;
		if (vistos.has(c)) continue;
		vistos.add(c);
		if (vistos.size > N) break;
		alvo.add(c);
	}
	return regs.filter(r => alvo.has(r.ciclo));
}

function porPersonagem(regs) {
	const mapa = new Map();
	for (const r of regs) {
		const k = r.serId;
		if (!mapa.has(k)) mapa.set(k, { id: k, nome: r.nome, eventos: [] });
		mapa.get(k).eventos.push(r);
	}
	return [...mapa.values()];
}

function pct(n, total) { return total ? Math.round(n / total * 100) : 0; }

// Nominais que abrem frase mas não são o verbo ("A sede me apertam" → "sede";
// "Preciso conversar" → "preciso"). O grupo é o PRIMEIRO termo real da frase.
const SEM_VERBO = new Set(['a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da',
	'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'e', 'mas', 'ou', 'se', 'que', 'pra', 'pro',
	'por', 'pelo', 'pela', 'entre', 'ate', 'sem']);

function verboDe(m) {
	const limpo = consertar(m).trim().toLowerCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
	for (const t of limpo) if (!SEM_VERBO.has(t)) return t;
	return limpo[0] || '(sem motivo)';
}

// Log antigo gravado em bytes trocados ("JoÃ£o" por "João"): recupera só quando
// a reconstrução produz acentos reais e nenhum byte inválido.
function consertar(s) {
	if (typeof s !== 'string' || !/[ÃÂ]/.test(s)) return s;
	try {
		const t = Buffer.from(s, 'latin1').toString('utf8');
		if (/[\u0080-\u009F\uFFFD]/.test(t)) return s;
		if (!/[áéíóúãõâêçÁÉÍÓÚÃÕÂÊÇ]/.test(t)) return s;
		return t;
	} catch (e) { return s; }
}
function cortar(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ---------------------------------------------------------------- main

function main() {
	const N = Math.max(1, Number(process.argv[2]) || 200);
	const escolha = escolherArquivo(process.argv[3]);
	const { regs: brutos, invalidas } = lerLinhas(escolha.arquivo);
	if (!brutos.length) { console.error('Log sem registros JSON válidos: ' + escolha.arquivo); process.exit(1); }

	const todos = brutos.map(normalizar).filter(r => Number.isFinite(r.ciclo));
	// Linhas antigas do motor ('tipo: ciclo') não têm serId/nome: não dá pra
	// atribuir a ninguém — ficam fora das seções por personagem.
	const semId = todos.filter(r => r.serId === '?').length;
	const regs = todos.filter(r => r.serId !== '?');
	if (!regs.length) { console.error('Log sem registros identificados por personagem: ' + escolha.arquivo); process.exit(1); }
	const janelaRegs = janela(regs, N);
	const ciclos = [...new Set(janelaRegs.map(r => r.ciclo))];
	const todosCiclos = [...new Set(regs.map(r => r.ciclo))];
	const temNecessidades = regs.some(r => r.antesNec || r.nec);

	console.log('='.repeat(66));
	console.log(' ANALISAR ILHA — saúde comportamental (somente leitura)');
	console.log('='.repeat(66));
	console.log('Log      : ' + escolha.arquivo + (escolha.fallback ? '  [FALLBACK: logs/ilha-v2.jsonl vazio]' : ''));
	console.log('Registros: ' + regs.length + '  |  inválidos: ' + invalidas.length +
		(semId ? '  |  sem personagem: ' + semId : '') +
		'  |  ciclos: ' + todosCiclos[0] + '–' + todosCiclos[todosCiclos.length - 1]);
	console.log('Janela   : últimos ' + N + ' ciclos = ' + (ciclos[0] || '—') + '–' + (ciclos[ciclos.length - 1] || '—') +
		' (' + janelaRegs.length + ' registros)');
	if (!temNecessidades) console.log('Aviso    : este trecho do log não tem necessidades (formato reduzido) — seções 2 e 5 sem dados.');

	// ---- 1. frequência de ações
	titulo(1, 'Frequência de ações por personagem (últimos ' + N + ' ciclos)');
	const pessoas = porPersonagem(janelaRegs);
	if (!pessoas.length) console.log('(sem registros na janela)');
	for (const p of pessoas) {
		const total = p.eventos.length;
		const cont = new Map();
		for (const e of p.eventos) cont.set(e.acao, (cont.get(e.acao) || 0) + 1);
		const lista = [...cont.entries()].sort((a, b) => b[1] - a[1]);
		const partes = lista.map(([a, c]) => a + '=' + pct(c, total) + '%');
		console.log(p.nome.padEnd(8) + ': ' + partes.join(', ') + '   (' + total + ' ações)');
	}

	// ---- 2. ciclos de risco (todo o log, para preservar a consecutividade)
	titulo(2, 'Ciclos de risco consecutivos por personagem (todo o log; ALERTA se > ' + LIMITE_RISCO + ')');
	let algumaBase = false;
	for (const p of porPersonagem(regs)) {
		console.log(p.nome + ':');
		for (const r of RISCOS) {
			let streak = 0, inicio = 0, maior = 0, mi = 0, mf = 0, semDados = 0, totalRisco = 0;
			for (const e of p.eventos) {
				const n = e.antesNec;
				if (!n || typeof n[r.campo] !== 'number') { semDados++; streak = 0; continue; }
				const v = n[r.campo];
				const emRisco = r.id === 'energia' ? v < 20 : v > 70;
				if (emRisco && !r.resolve.has(e.acao)) {
					totalRisco++;
					if (streak === 0) inicio = e.ciclo;
					streak++;
					if (streak > maior) { maior = streak; mi = inicio; mf = e.ciclo; }
				} else streak = 0;
			}
			if (semDados === p.eventos.length) {
				console.log('  ' + r.id.padEnd(7) + ': sem dados de necessidades neste log');
				continue;
			}
			algumaBase = true;
			const alerta = maior > LIMITE_RISCO ? '  << ALERTA' : '';
			console.log('  ' + r.id.padEnd(7) + ': maior sequência = ' + maior + ' ciclo(s) em risco (' + r.nome + ')' +
				(mi ? ' nos ciclos ' + mi + '–' + mf : '') + '  | total em risco: ' + totalRisco + alerta);
		}
	}
	if (!algumaBase) console.log('(nenhuma linha do log carrega antes.necessidades — impossível avaliar risco)');

	// ---- 3. motivos (top 10 agrupados pelo verbo inicial)
	titulo(3, 'Distribuição de motivos (top 10 por personagem, agrupados pelo verbo inicial)');
	for (const p of pessoas) {
		console.log(p.nome + ':');
		const grupos = new Map();
		for (const e of p.eventos) {
			if (!e.motivo) continue;
			const v = verboDe(e.motivo);
			if (!grupos.has(v)) grupos.set(v, { verbo: v, n: 0, frases: new Map() });
			const g = grupos.get(v);
			g.n++;
			g.frases.set(e.motivo, (g.frases.get(e.motivo) || 0) + 1);
		}
		const ordenados = [...grupos.values()].sort((a, b) => b.n - a.n).slice(0, 10);
		if (!ordenados.length) { console.log('  (sem motivos no log)'); continue; }
		for (const g of ordenados) {
			let rep = '', repN = 0;
			for (const [f, c] of g.frases) if (c > repN) { rep = f; repN = c; }
			console.log('  - "' + cortar(rep, 64) + '" x ' + repN +
				'   (grupo "' + g.verbo + '": ' + g.n + ' no total, ' + g.frases.size + ' frase(s))');
		}
	}

	// ---- 4. motivos por faixa de 100 ciclos
	titulo(4, 'Mudança de motivos por faixa de ' + BLOCO + ' ciclos');
	for (const p of pessoas) {
		const blocos = new Map();
		for (const e of p.eventos) {
			const ini = Math.floor((e.ciclo - 1) / BLOCO) * BLOCO + 1;
			if (!blocos.has(ini)) blocos.set(ini, new Map());
			const m = blocos.get(ini);
			const v = verboDe(e.motivo);
			m.set(v, (m.get(v) || 0) + 1);
		}
		const chaves = [...blocos.keys()].sort((a, b) => a - b);
		console.log(p.nome + ':');
		if (!chaves.length) { console.log('  (sem motivos)'); continue; }
		if (chaves.length === 1) console.log('  (1 faixa apenas — sem comparação)');
		let liderAnterior = null;
		for (const k of chaves) {
			const m = blocos.get(k);
			const total = [...m.values()].reduce((s, c) => s + c, 0);
			const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
			const lider = top[0][0];
			const faixa = String(k) + '–' + String(k + BLOCO - 1);
			const txt = top.map(([v, c]) => v + '=' + pct(c, total) + '%').join(', ');
			let nota = '';
			if (liderAnterior && lider !== liderAnterior) nota = '   << MUDANÇA de vocabulário: "' + liderAnterior + '" → "' + lider + '"';
			else if (liderAnterior) nota = '   (mesmo líder de tema)';
			console.log('  ciclos ' + faixa.padEnd(11) + ': ' + txt + nota);
			liderAnterior = lider;
		}
	}

	// ---- 5. status final
	titulo(5, 'Status final (último registro de cada personagem)');
	for (const p of porPersonagem(regs)) {
		const ultimo = p.eventos[p.eventos.length - 1];
		const n = ultimo.nec || ultimo.antesNec;
		const base = p.nome.padEnd(8) + ': ciclo ' + ultimo.ciclo +
			'  | status: ' + (ultimo.status || '—') + '  | local: ' + (ultimo.local || '—');
		if (!n) { console.log(base + '\n         fome/sede/energia/saúde: — (log sem necessidades)'); continue; }
		console.log(base);
		console.log('         fome(alimento)=' + Math.round(n.alimento) +
			'  sede(agua)=' + Math.round(n.agua) +
			'  energia=' + Math.round(n.energia) +
			'  saúde=' + Math.round(n.saude));
	}

	console.log('');
	console.log('='.repeat(66));
	console.log(' Fim do relatório — nenhum arquivo foi modificado.');
	console.log('='.repeat(66));
}

main();

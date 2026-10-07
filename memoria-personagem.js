'use strict';
// memoria-personagem.js — M1 · ADAPTADOR DE MEMÓRIA ILHA ↔ ICAROOVO.
//
// PRINCÍPIO (obrigatório, ver condições do M1):
//   Não otimizar a memória para a aparência de um diário humano. Otimizá-la
//   para continuidade comportamental verificável: aquilo que o personagem
//   viveu deve poder modificar o contexto cognitivo de uma decisão futura.
//
// As 12 condições do M1:
//  1. sem segunda arquitetura — os mecanismos são os do ICAROOVO; o adaptador
//     só os direcciona para um personagem (cópias byte-idênticas do fonte).
//  2. sem conversa artificial — só ação, mundo e social viram turno;
//     `system` é identidade (não é conversa).
//  3. nunca copiar identidade/memória do Ícaro — o seed vem de historia-previa
//     e da bíblia; os textos do ICAROOVO ('Rafael', 'cortrajetor') nunca
//     entram em chat nenhum.
//  4. diretório + estado isolados por personagem (memorias/<id>/).
//  5. usar os mecanismos reais via adaptador (chat append-only, papéis,
//     checkpoint de identidade, compactador).
//  6. não alterar icaro-clean (somente leitura) nem cerebro-icaro.
//  7. não tocar estado de produção (estado-ilha.json / logs da ilha).
//  8. testar restart (reabrir).
//  9. testar experiência reaparece no contexto do MESMO personagem.
// 10. testar João ≠ memória de Maria, e vice-versa.
// 11. testar compactação sem perda (arquiva tudo, preserva âncoras).
// 12. nada de agricultura/economia/construção no M1 — o adaptador não decide
//     nem prioriza nada: só registra o que já aconteceu.
//
// Isolamento: cada módulo do ICAROOVO resolve seus arquivos por `__dirname`,
// então copiar os módulos para memorias/<id>/ e requerer as CÓPIAS dá estado
// isolado por personagem sem nenhuma alteração no código de origem.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { HISTORIAS } = require('./historia-previa');
const { NOME } = require('./biblia-ilha-aurora');
// Mecanismo real do ICAROOVO (checkpoint de identidade). Módulo puro, sem
// estado e sem I/O — só a regra "antes da décima". A CONSTANTE dele nunca é
// injetada aqui: o texto do checkpoint é a identidade DESTE personagem (cond. 3).
const CKPT = require('./cerebro-icaro/checkpoint-identidade');

const FONTE = path.join(__dirname, 'cerebro-icaro');
const RAIZ_PADRAO = path.join(__dirname, 'memorias');
const MODULOS = ['chat-persistente.js', 'compactador-chat.js', 'nucleo-memoria-v2.js', 'nucleo-tracos.js'];
const NOMES = { joao: 'João', maria: 'Maria', icaro: 'Ícaro', lara: 'Lara', mundo: 'Mundo' };
const CICLO_MS = 4 * 60 * 60 * 1000;                 // 1 ciclo do mundo = 4h
const BASE_MS = Date.UTC(2026, 9, 3, 5, 0, 0);       // 03/10/2026 05:00 UTC

let RAIZ = RAIZ_PADRAO;
let ATIVO = false;
const INSTANCIAS = new Map();
const DIRS_REQ = new Set();

function dirDe(id) { return path.join(RAIZ, String(id)); }
function nomeDe(id) { return NOMES[String(id)] || String(id); }
function nomeDeQuem(q) { const k = String(q || '').toLowerCase(); return NOMES[k] || String(q || ''); }
function raizAtual() { return RAIZ; }
function estaAtivo() { return ATIVO; }

// Momento determinístico do mundo: mesmo ciclo = mesmo timestamp em qualquer
// processo (assim restart não reescreve a história com "agora").
function quandoDoCiclo(ciclo) {
	const c = Number.isFinite(Number(ciclo)) ? Number(ciclo) : 0;
	return new Date(BASE_MS + c * CICLO_MS).toISOString();
}

// Identidade da versão da fonte: se cerebro-icaro mudar, as cópias são
// regravadas e os módulos re-requiren (nunca fica mistura de versões).
function fonteHash() {
	const h = crypto.createHash('sha256');
	for (const m of MODULOS) h.update(fs.readFileSync(path.join(FONTE, m)));
	return h.digest('hex');
}

function limparCache(dir) {
	for (const m of MODULOS) {
		try { delete require.cache[require.resolve(path.join(dir, m))]; } catch (e) { /* ainda não requerido */ }
	}
}

function garantirModulos(id) {
	const dir = dirDe(id);
	fs.mkdirSync(dir, { recursive: true });
	const h = fonteHash();
	const marca = path.join(dir, '_versao.json');
	let atual = null;
	try { atual = JSON.parse(fs.readFileSync(marca, 'utf8')).hash; } catch (e) { atual = null; }
	if (atual === h) return false;
	for (const m of MODULOS) fs.copyFileSync(path.join(FONTE, m), path.join(dir, m));
	fs.writeFileSync(marca, JSON.stringify({ hash: h, fonte: 'cerebro-icaro' }), 'utf8');
	limparCache(dir);
	return true;
}

function instanciar(id) {
	const mudou = garantirModulos(id);
	if (mudou) INSTANCIAS.delete(String(id));
	let inst = INSTANCIAS.get(String(id));
	if (!inst) {
		const dir = dirDe(id);
		inst = {
			id: String(id),
			dir,
			chat: require(path.join(dir, 'chat-persistente.js')),
			compactador: require(path.join(dir, 'compactador-chat.js')),
			v2: require(path.join(dir, 'nucleo-memoria-v2.js')),
			tracos: require(path.join(dir, 'nucleo-tracos.js'))
		};
		DIRS_REQ.add(dir);
		INSTANCIAS.set(String(id), inst);
	}
	return inst;
}

// Restart real: esquece as cópias em memória e relê tudo do disco.
function reabrir(id) {
	limparCache(dirDe(id));
	INSTANCIAS.delete(String(id));
	return instanciar(id);
}

function resetarInstancias() {
	for (const dir of DIRS_REQ) limparCache(dir);
	INSTANCIAS.clear();
}

function ativar(raiz) {
	if (raiz) RAIZ = path.resolve(raiz);
	resetarInstancias();
	ATIVO = true;
	return RAIZ;
}

function desligar() {
	ATIVO = false;
	resetarInstancias();
	return false;
}

// Identidade PRÓPRIA do personagem (fonte: historia-previa + bíblia).
// Nunca o texto do ICAROOVO.
function textoIdentidade(id) {
	const nome = nomeDe(id);
	const h = HISTORIAS[id];
	if (!h) return 'Sou ' + nome + ', morador da ' + NOME + '.';
	return 'Sou ' + nome + ', morador da ' + NOME + '. ' + h.passado +
		' Ocupação: ' + h.ocupacao + '. Personalidade: ' + h.personalidade.join(', ') +
		'. Onde moro: ' + h.residencia + '.';
}

// Papéis: identidade = system; o que vem do mundo ou de outros = user;
// o que o próprio personagem viveu/falou = assistant.
function tipoDe(t, id) {
	const q = String((t && t.quem) || '').toLowerCase();
	if (q === 'system') return 'system';
	return q === String(id).toLowerCase() ? 'assistant' : 'user';
}

// Semente idempotente: só grava se o personagem ainda não tem nenhum turno.
function semear(id) {
	const inst = instanciar(id);
	if (inst.chat.carregarTodos().length > 0) return { id, semeado: false, motivo: 'ja_tem_turnos' };
	const turno = inst.chat.appendTurno('system', textoIdentidade(id), quandoDoCiclo(0));
	return { id, semeado: !!turno };
}

function semearSeres(estado) {
	if (!ATIVO) return { semeados: [] };
	const semeados = [];
	for (const id of Object.keys(estado && estado.seres ? estado.seres : {})) {
		if (!HISTORIAS[id]) continue;
		try {
			const r = semear(id);
			if (r && r.semeado) semeados.push(id);
		} catch (e) { console.log('[MEM] seed falhou em ' + id + ':', e.message); }
	}
	return { semeados };
}

function lerLinhas(p) {
	if (!fs.existsSync(p)) return [];
	try {
		return fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim())
			.map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
			.filter(x => x);
	} catch (e) { return []; }
}

// Um turno: entradas do mundo/outsiders e a própria ação, com o checkpoint
// de identidade MECHANISMO ICAROOVO injetado antes da décima entrada.
function registrarTurno(id, quem, texto, ciclo) {
	if (!ATIVO || !texto) return null;
	try {
		const inst = instanciar(id);
		const quando = quandoDoCiclo(ciclo);
		const tipo = tipoDe({ quem: quem }, id);
		if (tipo === 'user') {
			const n = inst.chat.carregarTodos().filter(t => tipoDe(t, id) === 'user').length;
			if (CKPT.deveInjetarCheckpoint(n + 1, 10)) {
				inst.chat.appendTurno('system', textoIdentidade(id), quando);
			}
		}
		const turno = inst.chat.appendTurno(quem, texto, quando);
		compactarSePrecisar(id);
		return turno;
	} catch (e) {
		console.log('[MEM] turno não gravado:', e.message);
		return null;
	}
}

const LEGENDAS = {
	beber: i => 'Bebi água em ' + i.local + '.',
	comer: i => 'Comi o que tinha comigo em ' + i.local + '.',
	descansar: i => 'Descansei um tempo em ' + i.local + '.',
	dormir: i => 'Dormi em ' + i.local + ' até o próximo dia.',
	observar: i => 'Observei com atenção o que havia ao redor em ' + i.local + '.',
	esperar: i => 'Fiquei em ' + i.local + ' aguardando o que viesse.',
	conviver: i => i.outro ? 'Conversei com ' + i.outro + ' em ' + i.local + '.' : 'Conversei em ' + i.local + ' com quem estava por perto.',
	falar: i => i.outro ? 'Falei com ' + i.outro + ' em ' + i.local + '.' : 'Falei em ' + i.local + ' com quem estava por perto.',
	pescar: i => 'Pesquei em ' + i.local + ' e vi o que a água me deu.',
	colher_frutas: i => 'Colhi frutos maduros em ' + i.local + '.',
	coletar_agua: i => 'Coletei água em ' + i.local + ' para guardar.',
	coletar_madeira: i => 'Juntei madeira caída em ' + i.local + '.',
	'caçar': i => 'Tentei caçar perto de ' + i.local + '.',
	melhorar_abrigo: i => 'Melhorei meu abrigo com o que encontrei em ' + i.local + '.',
	continuar: i => 'Continuei a caminho de ' + (i.destino || 'destino') + ' saindo de ' + i.de + '.'
};

// Factual, primeira pessoa, sem imperativo, nunca vazio (>= 15 caracteres).
function fraseDaAcao(acao, info) {
	info = info || {};
	const local = info.local || info.de || 'perto';
	const f = LEGENDAS[acao];
	if (f) return f(Object.assign({}, info, { local: local }));
	if (/^ir_/.test(acao)) return 'Saí de ' + local + ' a caminho de ' + (info.destino || acao.slice(3)) + '.';
	const nome = String(acao || 'ação').replace(/_/g, ' ');
	return 'Realizei ' + nome + ' em ' + local + ' nesta hora.';
}

function registrarDiario(id, entrada, resposta, quando) {
	try {
		const inst = instanciar(id);
		const p = path.join(dirDe(id), 'diario.jsonl');
		const reg = {
			sessao: String(id),
			turno: inst.chat.carregarTodos().length,
			quando: quando,
			tipo: 'experiencia',
			entrada_dono: entrada || '',
			resposta_icaro: resposta
		};
		fs.appendFileSync(p, JSON.stringify(reg) + '\n', 'utf8');
		return reg;
	} catch (e) {
		console.log('[MEM] diário não gravado:', e.message);
		return null;
	}
}

// Um ciclo de vida do personagem = entrada do mundo (user) + o que os
// presentes ouviram (user, nas memórias DELES) + a própria ação (assistant)
// + linha de experiência no diário. Nada aqui conversa com ninguém.
function registrarCiclo(ser, info) {
	if (!ATIVO || !ser || !ser.id) return null;
	try {
		const id = ser.id;
		info = info || {};
		const quando = quandoDoCiclo(info.ciclo);
		const local = info.local || ser.local || '';
		const entrada = info.entrada ? String(info.entrada) : '';
		const acao = info.acao || 'observar';
		const presentes = Array.isArray(info.presentes) ? info.presentes : [];
		if (entrada) registrarTurno(id, 'mundo', entrada, info.ciclo);
		if ((acao === 'conviver' || acao === 'falar') && presentes.length) {
			const frase = acao === 'conviver' ? 'Conversou comigo em ' + local + '.' : 'Falou comigo em ' + local + '.';
			for (const p of presentes) {
				if (!p || !p.id || p.id === id || !HISTORIAS[p.id]) continue;
				registrarTurno(p.id, id, frase, info.ciclo);
			}
		}
		const outro = presentes.filter(p => p && p.id !== id).map(p => p.nome || nomeDe(p.id)).join(' e ');
		const resposta = fraseDaAcao(acao, { local: local, de: info.de, destino: info.destino, outro: outro });
		registrarTurno(id, id, resposta, info.ciclo);
		registrarDiario(id, entrada, resposta, quando);
		return { id: id, acao: acao, resposta: resposta };
	} catch (e) {
		console.log('[MEM] ciclo não registrado:', e.message);
		return null;
	}
}

function compactarSePrecisar(id) {
	try {
		const inst = instanciar(id);
		const limiar = inst.compactador.CONFIG.maxTurnos;
		const n = inst.chat.contar();
		if (n <= limiar) return { compactado: false, turnos: n };
		return inst.compactador.compactarChat({});
	} catch (e) { return { compactado: false, erro: e.message }; }
}

function compactar(id, forcar) {
	return instanciar(id).compactador.compactarChat({ forcar: !!forcar });
}

// Recuperação: mesma convenção do ICAROOVO (system puro, o resto com rótulo
// '[Nome] texto'), com os papéis espelhados no personagem: o dele é
// assistant; o mundo e os outros são user.
function historico(id, max) {
	const inst = instanciar(id);
	const n = (Number.isInteger(max) && max > 0) ? max : 20;
	return inst.chat.carregarTodos().slice(-n).map(t => {
		const tipo = tipoDe(t, id);
		if (tipo === 'system') return { role: 'system', content: String(t.texto || '') };
		return { role: tipo, content: '[' + nomeDeQuem(t.quem) + '] ' + String(t.texto || '') };
	});
}

function entradasDiario(id, n) {
	const linhas = lerLinhas(path.join(dirDe(id), 'diario.jsonl'));
	const vistas = new Set(), out = [];
	for (const l of linhas) {
		const k = String((l.entrada_dono || '') + '|' + (l.resposta_icaro || '')).slice(0, 120);
		if (vistas.has(k)) continue;
		vistas.add(k);
		out.push(l);
	}
	const q = (Number.isInteger(n) && n > 0) ? n : 3;
	return out.slice(-q);
}

// O que o cérebro vai receber: o vivido (histórico) + a trajetória recente
// (diário). Costura para o M2 (prompt/gates por personagem).
function contexto(id) {
	return { historico: historico(id, 20), trajetoriaRecente: entradasDiario(id, 12) };
}

module.exports = {
	MODULOS, FONTE, CICLO_MS, BASE_MS, NOMES,
	ativar, desligar, estaAtivo, raizAtual, dirDe, nomeDe, quandoDoCiclo, fonteHash,
	instanciar, reabrir,
	textoIdentidade, semear, semearSeres,
	registrarTurno, registrarCiclo, fraseDaAcao, registrarDiario,
	historico, entradasDiario, contexto, compactar, compactarSePrecisar
};

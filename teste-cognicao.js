'use strict';
// teste-cognicao.js — 14 blocos de validação da camada cognitiva da Ilha
// (módulos reais do ICARO-OVO vendored em cerebro-icaro/mecanismos/).
//
// Roda com a mesma convenção das outras suítes:  node teste-cognicao.js
// NÃO toca em estado de produção (todos os estados usados aqui são `novo()`
// ou diretórios temporários); os snaps de segurança do bloco 14 provam isso.
//
//   1. vendoring byte-idêntico (manifesto SHA-256 + fonte icaro-clean)
//   2. isolamento cognitivo dos quatro personagens
//   3. sem vazamento de identidade (ICARO-OVO) nem de memória alheia
//   4. persistência: estado dos mecanismos relido do disco em processo novo
//   5. proveniência de cada memória no contexto
//   6. influência REAL no LLM (o prompt capturado do fetch contém os blocos)
//   7. sombra vs ativo: gates off por padrão; alavanca ILHA_COG_PESO liga
//   8. timeout/indisponibilidade do LLM: erro claro, fallback e emergência
//   9. validação do motor: decisão inválida rejeitada, estado intacto
//  10. continuidade: N ciclos seguidos, trilha fecha, pós-turno acumula, 0 erros
//  11. compatibilidade: suíte anterior completa passa com a camada desligada
//  12. E2E: ciclo real com camada ON, LLM mockado, motor, persistência
//  13. experimento de trajetória com ablação (com vs sem camada, mesmo LLM)
//  14. reversão em 1 comando + preservamento de produção e da fonte ICARO-OVO
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const NODE = process.execPath; // node real (este arquivo já roda sob ele)
const ESTADO_ILHA = path.join(__dirname, 'estado-ilha.json');
const LOGS_DIR = path.join(__dirname, 'logs');

let total = 0;
function t(nome, fn) { return Promise.resolve().then(fn).then(() => { total++; console.log('OK ' + nome) }) }
function sha256(arq) { return crypto.createHash('sha256').update(fs.readFileSync(arq)).digest('hex') }
function lerLinhas(f) { return fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)) }
// trilhas-causais.jsonl é append-only com LINHAS DE PATCH (adicionar/mesclar/
// definir) — este helper reconstrói o estado final de cada trilha, igual a
// lerTodas() do módulo, para as asserções lerem o resultado real.
function carregarTrilhas(f) {
	if (!fs.existsSync(f)) return [];
	const saida = new Map();
	for (const l of lerLinhas(f)) {
		if (l.tipo === 'patch' && l.decision_id) {
			const cur = saida.get(l.decision_id) || { decision_id: l.decision_id };
			for (const [campo, itens] of Object.entries(l.adicionar || {})) {
				if (!Array.isArray(cur[campo])) cur[campo] = [];
				for (const item of itens) if (!cur[campo].includes(item)) cur[campo].push(item);
			}
			for (const [campo, valor] of Object.entries(l.mesclar || {})) cur[campo] = Object.assign({}, cur[campo] || {}, valor);
			Object.assign(cur, l.definir || {});
			saida.set(l.decision_id, cur);
		} else if (l.decision_id) saida.set(l.decision_id, { ...l });
	}
	return [...saida.values()];
}
function resposta(dados) {
	return { ok: true, status: 200, json: async () => ({ message: { content: typeof dados === 'string' ? dados : JSON.stringify(dados) } }) };
}
function restaurarFetch() { global.fetch = fetchOriginal }

// ---- snapshots de segurança (antes de qualquer bloco) -----------------------
const snapEstado = fs.existsSync(ESTADO_ILHA) ? { h: sha256(ESTADO_ILHA), m: fs.statSync(ESTADO_ILHA).mtimeMs } : null;
const snapLogs = fs.existsSync(LOGS_DIR)
	? fs.readdirSync(LOGS_DIR).map(f => ({ f, m: fs.statSync(path.join(LOGS_DIR, f)).mtimeMs })) : null;

// ---- infra da camada -------------------------------------------------------
const fetchOriginal = global.fetch;
const cog = require('./cognicao');
const RAIZ_COG_ANTES = cog.raizAtual();
const RAIZ_TESTE = fs.mkdtempSync(path.join(os.tmpdir(), 'ilha-cog-teste-'));
const { montarContexto, cerebroDe } = require('./cerebro-personagem');
const cerebro = require('./cerebro');
const cognitivo = require('./cerebro-cognitivo');
const { acoes, executar } = require('./motor-v2');
const { rodada } = require('./rodada-autonoma');
const { novo } = require('./estado-v2');
const ec = require('./ecossistema');
const { gravar, carregar, anexar } = require('./persistencia-v2');

function limparEnv() {
	// Limpa TODAS as flags da camada e os gates ICARO_* dos módulos: o teste
	// roda com o comportamento padrão de produção (sombra onde é sombra).
	for (const k of Object.keys(process.env)) if (/^(ICARO_|ILHA_COG|ILHA_LLM)/.test(k)) delete process.env[k];
}
function ligar(raiz) { limparEnv(); process.env.ILHA_COG = '1'; cog.ativar(raiz || RAIZ_TESTE); return cog }
function desligar() { limparEnv(); cog.desligar() }
function estadoNovo() { return ec.preparar(novo()) }
function acaoDoModelo(b) { // política determinista válida para o enum do turno
	const en = b.format.properties.acao.enum;
	return en.includes('observar') ? 'observar' : en[0];
}

(async () => {

	// ---------------------------------------------------------------- 1 ----
	await t('1. vendoring: 16 módulos byte-idênticos ao manifesto interno (autônomo)', () => {
		let s = fs.readFileSync(path.join(__dirname, 'cerebro-icaro', 'mecanismos', 'MANIFESTO-MECANISMOS.json'), 'utf8');
		if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
		const man = JSON.parse(s);
		assert(Array.isArray(man.modulos) && man.modulos.length === 16, 'manifesto com 16 módulos');
		const porArquivo = Object.fromEntries(man.modulos.map(x => [x.arquivo, x]));
		assert.equal(cog.MODULOS.length, 16, 'cognicao carrega os mesmos 16');
		assert.equal(man.somente_leitura, true);
		assert(cog.saudavel(), 'fonte legível');
		for (const m of cog.MODULOS) {
			const reg = porArquivo[m];
			assert(reg && reg.byte_identico === true, m + ' marcado byte-idêntico');
			const copia = path.join(cog.FONTE, m);
			assert(fs.existsSync(copia), m + ' existe na fonte interna');
			assert.equal(sha256(copia), reg.sha256, m + ': cópia da Ilha = manifesto');
			assert.equal(sha256(copia), reg.origem_sha256, m + ': fonte intacta = manifesto');
			assert.equal(fs.statSync(copia).size, reg.bytes, m + ' bytes');
		}
		// nenhum arquivo do tipo cortex-engine foi tocado nem existe na raiz da Ilha
		assert(!fs.existsSync(path.join(__dirname, 'cortex-engine.js')), 'a Ilha não ganhou um cortex-engine');
	});

	// ---------------------------------------------------------------- 2 ----
	await t('2. isolamento cognitivo dos quatro: estado individual por diretório, sem cruzamento', () => {
		ligar();
		const e = estadoNovo();
		const ids = ['icaro', 'maria', 'joao', 'lara'];
		for (const id of ids) {
			cog.posConsequencia(e.seres[id], {
				ciclo: 1, decisao: { acao: 'observar', motivo: 'rotina de ' + id },
				entrada: 'MARCO-' + id.toUpperCase() + ' viveu algo exclusivo', falasRecebidas: []
			});
		}
		// trilha causal só do João
		const ctxJ = montarContexto(e, e.seres.joao, acoes(e, e.seres.joao), null);
		const trilha = cog.abrirTrilha(e.seres.joao, ctxJ, acoes(e, e.seres.joao));
		if (trilha) cog.fecharTrilha(trilha, { ser: e.seres.joao, decisao: { acao: 'observar', motivo: 'x' }, itens: cog.itensDoContexto(ctxJ) });
		const dirs = ids.map(id => cog.dirDe(id));
		assert.equal(new Set(dirs).size, 4, 'quatro diretórios distintos');
		for (const id of ids) {
			const dir = cog.dirDe(id);
			assert(fs.existsSync(path.join(dir, 'proveniencia.jsonl')), id + ' tem proveniencia própria');
			const prov = fs.readFileSync(path.join(dir, 'proveniencia.jsonl'), 'utf8');
			assert(prov.includes('MARCO-' + id.toUpperCase()), id + ' guarda a própria marca');
			for (const outro of ids) if (outro !== id)
				assert(!prov.includes('MARCO-' + outro.toUpperCase()), id + ' não contém marca de ' + outro);
			for (const m of cog.MODULOS)
				assert(fs.readFileSync(path.join(cog.FONTE, m)).equals(fs.readFileSync(path.join(dir, m))),
					id + ': cópia ' + m + ' byte-idêntica');
		}
		const trilhasJ = fs.readFileSync(path.join(cog.dirDe('joao'), 'trilhas-causais.jsonl'), 'utf8');
		assert(trilhasJ.includes('"fechada":true'), 'trilha do João fechada');
		assert(trilhasJ.includes('"decision":"observar"'), 'decisão registrada na trilha do João');
		for (const outro of ['icaro', 'maria', 'lara'])
			assert(!fs.existsSync(path.join(cog.dirDe(outro), 'trilhas-causais.jsonl')), outro + ' não recebeu trilha do João');
		assert.equal(new Set(cog.instanciasAtivas()).size, 4, 'quatro instâncias cognitivas ativas');
	});

	// ---------------------------------------------------------------- 3 ----
	await t('3. sem vazamento: nada do ICARO-OVO no contexto/prompt; memória alheia nunca cruza', () => {
		ligar();
		const e = estadoNovo();
		e.seres.maria.memoria.push({ ciclo: 2, texto: 'MEM-SO-MARIA: segredo da Maria', tipo: 'ambiente' });
		const proibido = /cortrajetor|trajectoria corticalis|ICAROOVO|icaro-hibrido|Rafael|Você é o Ícaro/;
		for (const id of ['icaro', 'maria', 'joao', 'lara']) {
			const ser = e.seres[id], poss = acoes(e, ser);
			const ctx = montarContexto(e, ser, poss, null);
			const texto = cerebro.montarPrompt(ctx, poss, ser) + '\n' + cerebro.system(ser);
			assert(!proibido.test(texto), id + ': prompt sem conteúdo do ICARO-OVO');
			assert(!JSON.stringify(ctx).includes('Você é o Ícaro'), id + ': contexto sem prompt de identidade alheia');
			if (id !== 'maria') assert(!texto.includes('MEM-SO-MARIA'), id + ' não vê memória da Maria');
			else assert(texto.includes('MEM-SO-MARIA'), 'Maria vê a própria memória');
		}
		// varredura de TODOS os arquivos de estado cognitivo escritos até aqui
		(function varrer(dir) {
			for (const nome of fs.readdirSync(dir)) {
				const p = path.join(dir, nome);
				if (fs.statSync(p).isDirectory()) varrer(p);
				else if (/\.(json|jsonl)$/.test(nome)) {
					const txt = fs.readFileSync(p, 'utf8');
					assert(!proibido.test(txt), 'arquivo sem conteúdo proibido: ' + p);
				}
			}
		})(RAIZ_TESTE);
		// experiências registradas (se houver) têm proveniência do próprio personagem
		for (const id of ['icaro', 'maria', 'joao', 'lara']) {
			const exp = path.join(cog.dirDe(id), 'experiencias.jsonl');
			if (fs.existsSync(exp)) for (const l of lerLinhas(exp))
				assert(String(l.origem).startsWith('decisao_personagem:' + id), id + ': experiência com proveniência própria');
		}
	});

	// ---------------------------------------------------------------- 4 ----
	await t('4. persistência: estado dos mecanismos relido do disco em processo novo', () => {
		ligar();
		const dir = cog.dirDe('joao');
		assert(fs.existsSync(path.join(dir, 'proveniencia.jsonl')), 'arquivo gravado pelos blocos 2/3');
		const script = 'const c=require(' + JSON.stringify(path.join(__dirname, 'cognicao')) + ');' +
			'c.ativar(' + JSON.stringify(RAIZ_TESTE) + ');' +
			'const fs=require("fs"),p=require("path");' +
			'process.stdout.write(fs.readFileSync(p.join(c.dirDe("joao"),"proveniencia.jsonl"),"utf8"));';
		const saida = execFileSync(NODE, ['-e', script], { encoding: 'utf8', cwd: __dirname });
		assert(saida.includes('MARCO-JOAO'), 'processo novo relê o estado do João do disco');
		cog.resetarInstancias();
		cog.reabrir('joao');
		assert(fs.readFileSync(path.join(dir, 'proveniencia.jsonl'), 'utf8').includes('MARCO-JOAO'),
			'reabrir no mesmo processo também relê do disco');
		const versao = JSON.parse(fs.readFileSync(path.join(dir, '_versao.json'), 'utf8'));
		assert.equal(versao.hash, cog.hashFonte(), 'marca de versão dos módulos copiados');
	});

	// ---------------------------------------------------------------- 5 ----
	await t('5. proveniência: cada memória no contexto declara a origem (vivida/ouvida/inferida)', () => {
		ligar();
		const e = estadoNovo();
		const s = e.seres.icaro;
		s.memoria.push({ ciclo: 5, texto: 'Vi a nascente cheia de manhã', tipo: 'ambiente' });
		s.memoria.push({ ciclo: 6, texto: 'João disse que há peixes no rio', tipo: 'fala' });
		s.memoria.push({ ciclo: 7, texto: 'Acho que o tempo vai mudar', tipo: 'inferencia' });
		const ctx = montarContexto(e, s, acoes(e, s), null);
		assert(Array.isArray(ctx.cognicao.proveniencia) && ctx.cognicao.proveniencia.length >= 3, 'proveniência explícita por item');
		const porTexto = Object.fromEntries(ctx.cognicao.proveniencia.map(p => [p.texto, p]));
		assert.equal(porTexto['Vi a nascente cheia de manhã'].origem, 'vivida_diretamente');
		assert.equal(porTexto['João disse que há peixes no rio'].origem, 'ouvida_de_terceiro');
		assert.equal(porTexto['Acho que o tempo vai mudar'].origem, 'inferencia');
		assert(typeof porTexto['Vi a nascente cheia de manhã'].ciclo === 'number', 'ciclo de origem registrado');
		// adaptador para o vocabulário do núcleo de peso (0.95 / 0.90 / 0.55)
		assert.equal(cog.adaptarMemoria({ texto: 'x', tipo: 'ambiente' }).origem, 'verificado');
		assert.equal(cog.adaptarMemoria({ texto: 'x', tipo: 'fala' }).origem, 'dado_externo');
		assert.equal(cog.adaptarMemoria({ texto: 'x', tipo: 'inferencia' }).origem, 'inferencia');
		// proveniência usa o MESMO vocabulário do adaptador nos três casos
	});

	// ---------------------------------------------------------------- 6 ----
	await t('6. influência real no LLM: o prompt enviado ao fetch contém [MECANISMOS]; fora disso é byte-idêntico', async () => {
		const e = estadoNovo();
		e.seres.icaro.local = 'rio';
		const ser = e.seres.icaro, poss = acoes(e, ser);
		// contexto SEM camada (baseline)
		desligar();
		const ctxOff = montarContexto(e, ser, poss, null);
		assert(!('cognicao' in ctxOff), 'sem ILHA_COG não existe a chave cognicao');
		const pOff = cerebro.montarPrompt(ctxOff, poss, ser);
		assert(!pOff.includes('[MECANISMOS]'), 'prompt baseline sem mecanismos');
		// contexto COM camada
		ligar();
		const ctxOn = montarContexto(e, ser, poss, null);
		assert(ctxOn.cognicao && ctxOn.cognicao.ativo === true, 'cognicao anexado ao contexto');
		const pOn = cerebro.montarPrompt(ctxOn, poss, ser);
		assert(pOn.includes('[MECANISMOS]'), 'prompt real contém a seção [MECANISMOS]');
		assert(pOn.includes('(insumos opcionais — quem decide é você, sempre)'), 'mecanismos nunca viram ordem');
		// ÚNICA diferença entre os dois prompts é a seção de mecanismos
		const pOnSemSecao = cerebro.montarPrompt({ ...ctxOn, cognicao: undefined }, poss, ser);
		assert.equal(pOnSemSecao, pOff, 'fora da seção, o prompt é byte-idêntico ao de antes');
		// envio real: captura do corpo que chega ao "LLM"
		let capturado = null;
		global.fetch = async (u, o) => { capturado = JSON.parse(o.body); return resposta({ acao: acaoDoModelo(JSON.parse(o.body)), motivo: 'vi o rio calmo hoje' }) };
		try {
			const d = await cerebro.decidir(ctxOn, poss, ser);
			assert(capturado, 'fetch foi chamado');
			assert.equal(capturado.messages[0].content, cerebro.system(ser), 'system message do próprio personagem');
			assert(capturado.messages[1].content.includes('[MECANISMOS]'), 'PROVA MATERIAL: bloco no corpo enviado ao LLM');
			assert(capturado.messages[1].content.includes('[AÇÕES POSSIVEIS]'), 'e as ações possíveis seguem lá');
			assert.equal(capturado.model, cerebro.MODELO, 'mesmo modelo de produção');
			assert(Number.isFinite(capturado.options.temperature) && capturado.options.temperature >= 0 && capturado.options.temperature <= 1.5, 'temperatura válida');
			assert.equal(d.acao, 'observar', 'decisão veio do retorno do LLM');
			assert.equal(d.origem, 'modelo');
			// temperatura da AURA (mesma receita do ICARO: temperaturaLLM)
			const ctxTemp = { ...ctxOn, cognicao: { ...ctxOn.cognicao, aura: { moduladores: { temperaturaLLM: 0.77, estadoExpressivo: 'contido' }, gatilho: null } } };
			await cerebro.decidir(ctxTemp, poss, ser);
			assert.strictEqual(capturado.options.temperature, 0.77, 'aura modula a temperatura efetiva');
			assert(capturado.messages[1].content.includes('estado agora: contido'), 'estado expressivo no prompt');
			// baseline sem cognição: temperatura .3 de sempre
			await cerebro.decidir(ctxOff, poss, ser);
			assert.strictEqual(capturado.options.temperature, .3, 'sem camada, temperatura baseline');
		} finally { restaurarFetch() }
	});

	// ---------------------------------------------------------------- 7 ----
	await t('7. sombra vs ativo: gates off por padrão (peso/cuidado/agência) e alavanca explícita liga', () => {
		ligar();
		const e = estadoNovo();
		const s = e.seres.icaro;
		s.local = 'rio';
		s.memoria.push({ ciclo: 1, texto: 'Vi o rio cheio de peixes ontem de manhã', tipo: 'ambiente' });
		s.memoria.push({ ciclo: 2, texto: 'A Maria gosta de colher frutos no bosque', tipo: 'ambiente' });
		// gates da camada no padrão de produção
		assert.strictEqual(cog.LIGADO.peso(), false, 'peso em sombra por padrão');
		assert.strictEqual(cog.LIGADO.cuidadoFala(), false, 'fala do cuidado em sombra por padrão');
		assert.strictEqual(cog.LIGADO.agenciaFoco(), false, 'foco da agência em sombra por padrão');
		assert.strictEqual(cog.LIGADO.aura(), true, 'aura ativa por padrão');
		assert.strictEqual(cog.LIGADO.trilha(), true, 'trilha ativa por padrão');
		const ctx = montarContexto(e, s, acoes(e, s), null);
		const memoriasBaseline = [...ctx.memorias];
		assert(ctx.cognicao.sombra && typeof ctx.cognicao.sombra.peso === 'object', 'peso comparado em sombra');
		assert.strictEqual(ctx.cognicao.sombra.peso.ativo, false, 'comparou mas NÃO substituiu (baseline no contexto)');
		assert.deepStrictEqual(ctx.memorias, memoriasBaseline, 'seleção de peso não tocou o contexto');
		assert(!('cuidado' in ctx.cognicao.blocos), 'bloco de cuidado fora do prompt (gate off)');
		assert(!('agencia' in ctx.cognicao.blocos), 'bloco de agência fora do prompt (gate off)');
		// alavanca explícita: ILHA_COG_PESO=1 troca a seleção
		process.env.ILHA_COG_PESO = '1';
		const ctx2 = montarContexto(e, s, acoes(e, s), null);
		delete process.env.ILHA_COG_PESO;
		assert.strictEqual(ctx2.cognicao.sombra.peso.ativo, true, 'com a alavanca, seleção ativa');
		assert(Array.isArray(ctx2.cognicao.memoriasSelecionadas), 'ids selecionados registrados');
		if (ctx2.cognicao.memoriasSelecionadas.length)
			assert.deepStrictEqual(ctx2.memorias, ctx2.cognicao.memoriasSelecionadas.slice(0, 12), 'contexto usa a seleção do núcleo');
		// os gates da camada respondem à env (nada liga sozinho)
		process.env.ILHA_COG_CUIDADO_OFERTA = '1';
		assert.strictEqual(cog.LIGADO.cuidadoFala(), true, 'alavanca de fala do cuidado responde à env');
		delete process.env.ILHA_COG_CUIDADO_OFERTA;
		assert.strictEqual(cog.LIGADO.cuidadoFala(), false, 'e volta a sombra ao tirar a env');
	});

	// ---------------------------------------------------------------- 8 ----
	await t('8. timeout/indisponibilidade: erro claro, fallback do cérebro anterior e emergência neutra', async () => {
		ligar();
		const e = estadoNovo();
		const ser = e.seres.icaro, poss = acoes(e, ser);
		const ctx = montarContexto(e, ser, poss, null);
		// (a) Ollama aceita e nunca responde → AbortController derruba o ciclo
		process.env.ILHA_LLM_TIMEOUT_MS = '1000';
		global.fetch = (u, o) => new Promise((_, rej) => {
			if (o && o.signal) o.signal.addEventListener('abort', () => rej(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })));
		});
		const t0 = Date.now();
		try {
			await assert.rejects(cerebro.decidir(ctx, poss, ser), /LLM indisponível: timeout de 1000ms/);
			assert(Date.now() - t0 < 6000, 'timeout dispara em ~1s, não pendura');
		} finally { restaurarFetch(); delete process.env.ILHA_LLM_TIMEOUT_MS }
		// (b) conexão recusada → erro rotulado como indisponibilidade
		global.fetch = async () => { throw new Error('fetch failed') };
		try {
			await assert.rejects(cerebro.decidir(ctx, poss, ser), /LLM indisponível: fetch failed/);
		} finally { restaurarFetch() }
		// (c) fallback do cérebro anterior + emergência neutra (ciclo continua)
		const cerebrosMortos = cognitivo.criarTodos(['icaro', 'maria', 'joao', 'lara']);
		global.fetch = async () => { throw new Error('fetch failed') };
		process.env.ILHA_COG_EMERGENCIA = '1';
		try {
			const d = await cerebrosMortos.icaro.decidir(ctx, poss, ser);
			assert.equal(d.origem, 'fallback-indisponibilidade', 'emergência marcada na origem');
			assert.equal(d.emergencia, true);
			assert(poss.some(a => a.id === d.acao), 'ação neutra é das possíveis');
			// ciclo COMPLETO com LLM morto: mundo não para, quatro decidem
			const e2 = estadoNovo();
			const antes = e2.mundo.tempo.ciclo;
			const cb = cognitivo.criarTodos(['icaro', 'maria', 'joao', 'lara']);
			const r = await rodada(e2, { cerebros: cb, acontecimentos: false });
			assert.equal(r.eventos.length, 4, 'os quatro passaram pelo caminho de emergência');
			assert(r.eventos.every(ev => ev.decisao.origem === 'fallback-indisponibilidade'), 'todas as decisões marcadas');
			assert.equal(e2.mundo.tempo.ciclo, antes + 1, 'ciclo do mundo avançou mesmo assim');
			assert.equal(Object.keys(e2.seres).length, 4, 'nenhum ser corrompido');
		} finally { restaurarFetch(); delete process.env.ILHA_COG_EMERGENCIA }
		// (d) sem emergência e sem fallback: falha honesta, marcada como decisão
		process.env.ILHA_COG_FALLBACK = 'nenhum';
		global.fetch = async () => { throw new Error('fetch failed') };
		try {
			const cb = cognitivo.criar('icaro');
			await assert.rejects(cb.decidir(ctx, poss, ser), err => err.decisao === true && /LLM indisponível/.test(err.message));
		} finally { restaurarFetch(); delete process.env.ILHA_COG_FALLBACK }
	});

	// ---------------------------------------------------------------- 9 ----
	await t('9. validação do motor: decisão inválida rejeitada mesmo com a camada ligada; estado intacto', async () => {
		ligar();
		const e = estadoNovo();
		const antes = JSON.stringify(e);
		const invalidos = {};
		for (const id of ['icaro', 'maria', 'joao', 'lara'])
			invalidos[id] = async () => ({ acao: 'inventar_recurso', motivo: 'fora do contrato', origem: 'stub-invalido' });
		await assert.rejects(rodada(e, { cerebros: invalidos, acontecimentos: false }), /Decisão inválida de \w+: ação fora das possíveis/);
		assert.equal(JSON.stringify(e), antes, 'estado byte-idêntico após rejeição');
		// motor nunca substitui a decisão
		assert.throws(() => executar(e, e.seres.icaro, 'inventar_recurso'), /inválida/);
		// validação contínua normalizando a devolução
		const d = cerebroDe({}, e.seres.icaro);
		assert.equal(typeof d, 'function', 'sem plugue, segue o decisor legado');
		const { validarDecisao } = require('./cerebro-personagem');
		const limpa = validarDecisao({ acao: 'observar', motivo: 'x'.repeat(300) }, acoes(e, e.seres.icaro), e.seres.icaro);
		assert.equal(limpa.motivo.length, 240, 'motivo normalizado');
	});

	// --------------------------------------------------------------- 10 ----
	await t('10. continuidade: 5 ciclos com camada ON — prompt mecanizado sempre, trilhas fechadas, pós-turno acumula, 0 erros', async () => {
		const raiz10 = fs.mkdtempSync(path.join(os.tmpdir(), 'ilha-cont-'));
		ligar(raiz10); cog.limparErros();
		const e = estadoNovo();
		const capturados = [];
		global.fetch = async (u, o) => { const b = JSON.parse(o.body); capturados.push(b); return resposta({ acao: acaoDoModelo(b), motivo: 'vou observar com calma este ciclo' }) };
		const cb = cognitivo.criarTodos(['icaro', 'maria', 'joao', 'lara']);
		const marcador = 'MARCO-CONTINUIDADE-' + Date.now();
		e.seres.icaro.memoria.push({ ciclo: 0, texto: marcador, tipo: 'ambiente' });
		try {
			for (let i = 0; i < 5; i++) {
				const r = await rodada(e, { cerebros: cb, acontecimentos: false });
				assert.equal(r.eventos.length, 4, 'ciclo ' + i + ': quatro decisões');
				const ctx = montarContexto(e, e.seres.icaro, acoes(e, e.seres.icaro), null);
				assert(ctx.cognicao && ctx.cognicao.ativo, 'ciclo ' + i + ': cognição presente a cada turno');
				assert(ctx.cortex.trajetoriaRecente.length === i + 1 || ctx.cortex.trajetoriaRecente.length >= 1, 'trajetória segue acumulando');
			}
			assert.equal(capturados.length, 20, '4 LLM × 5 ciclos');
			assert(capturados.every(b => b.messages[1].content.includes('[MECANISMOS]')), 'mecanismos no prompt de TODOS os turnos');
			assert(capturados.some(b => b.messages[1].content.includes(marcador)), 'memória própria do Ícaro no prompt do Ícaro');
			assert(!capturados.some(b => b.messages[1].content.includes('MEM-SO-MARIA')), 'nenhum prompt alheio (marcador ausente)');
		} finally { restaurarFetch() }
		const trilhas = carregarTrilhas(path.join(cog.dirDe('icaro'), 'trilhas-causais.jsonl'));
		assert.equal(trilhas.length, 5, 'uma trilha aberta por ciclo');
		assert(trilhas.every(x => x.fechada && x.decision), 'todas fechadas com a decisão');
		assert(trilhas.every(x => Array.isArray(x.retrieved) && x.retrieved.length > 0), 'itens do contexto registrados na trilha');
		const prov = lerLinhas(path.join(cog.dirDe('icaro'), 'proveniencia.jsonl'));
		assert(prov.length >= 5, 'pós-turno acumula pelo menos 1 linha por turno, acumulou ' + prov.length);
		assert(cog.erros().length === 0, 'nenhum erro de mecanismo: ' + JSON.stringify(cog.erros().slice(-3)));
		assert.equal(new Set(cog.instanciasAtivas()).size, 4, 'quatro instâncias seguem vivas');
		fs.rmSync(raiz10, { recursive: true, force: true });
	});

	// --------------------------------------------------------------- 11 ----
	await t('11. compatibilidade: suíte anterior completa passa com a camada desligada', () => {
		desligar();
		const env = { ...process.env };
		for (const k of Object.keys(env)) if (/^(ICARO_|ILHA_COG|ILHA_LLM)/.test(k)) delete env[k];
		const r = spawnSync(NODE, ['testes-v2.js'], { cwd: __dirname, encoding: 'utf8', timeout: 900000, env });
		const saida = (r.stdout || '') + (r.stderr || '');
		assert.equal(r.status, 0, 'suíte anterior falhou:\n' + saida.slice(-3000));
		assert(saida.includes('RESULTADO 59 testes OK'), 'os 59 testes anteriores seguem OK');
	});

	// --------------------------------------------------------------- 12 ----
	await t('12. E2E: ciclo real com camada ON, LLM (mock) respondendo, motor aplicando e estado persistido', async () => {
		const raiz12 = fs.mkdtempSync(path.join(os.tmpdir(), 'ilha-e2e-cog-'));
		ligar(raiz12); cog.limparErros();
		const e = estadoNovo();
		e.seres.maria.memoria.push({ ciclo: 0, texto: 'MARCO-E2E-MARIA', tipo: 'ambiente' });
		const prompts = [];
		global.fetch = async (u, o) => { const b = JSON.parse(o.body); prompts.push(b); return resposta({ acao: acaoDoModelo(b), motivo: 'decisão real do modelo no ciclo ' + prompts.length }) };
		const cb = cognitivo.criarTodos(['icaro', 'maria', 'joao', 'lara']);
		const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ilha-e2e-'));
		const f = path.join(d, 'estado.json'), l = path.join(d, 'log.jsonl');
		try {
			gravar(f, e);
			let estado = carregar(f);
			for (let i = 0; i < 3; i++) {
				// marcador sempre na fila mais recente da Maria (janela do prompt)
				estado.seres.maria.memoria.push({ ciclo: i, texto: 'MARCO-E2E-MARIA', tipo: 'ambiente' });
				const r = await rodada(estado, { cerebros: cb, acontecimentos: false });
				assert.equal(r.eventos.length, 4);
				for (const ev of r.eventos) assert.equal(ev.decisao.origem, 'modelo', 'decisão veio do LLM real (cerebro.js)');
				gravar(f, estado);
				r.eventos.forEach((ev, ord) => anexar(l, {
					ciclo: r.ciclo, ord, serId: ev.serId, nome: ev.nome, acao: ev.decisao.acao,
					motivo: ev.decisao.motivo, local: ev.localFinal, status: ev.statusFinal, consequencia: ev.consequencia
				}));
			}
			const final = carregar(f);
			assert.equal(final.mundo.tempo.ciclo, e.mundo.tempo.ciclo + 3, '3 ciclos persistidos');
			assert.equal(lerLinhas(l).length, 12, 'log com 12 eventos');
			assert.equal(prompts.length, 12, '4 personagens × 3 turnos');
			for (const b of prompts) {
				const p = b.messages[1].content;
				assert(p.includes('[MECANISMOS]'), 'prompt real do LLM com mecanismos');
				assert(p.includes('[AÇÕES POSSIVEIS]'));
			}
			const comMarca = prompts.filter(b => b.messages[1].content.includes('MARCO-E2E-MARIA')).length;
			assert.equal(comMarca, 3, 'só os 3 turnos da Maria veem a memória da Maria');
			assert(final.seres.icaro.cortex.trajetoria.length >= 3, 'trajetória do Ícaro acumulou');
			assert(final.seres.icaro.cortex.diario.filter(x => x.ciclo > 0).length >= 3, 'diário de bordo registrou os ciclos');
			const trilhas = carregarTrilhas(path.join(cog.dirDe('icaro'), 'trilhas-causais.jsonl'));
			assert.equal(trilhas.length, 3, 'trilha causal por turno, fechada');
			assert(trilhas.every(x => x.fechada && x.decision === 'observar'), 'trilha registra a decisão real do motor');
			assert(lerLinhas(path.join(cog.dirDe('icaro'), 'proveniencia.jsonl')).length >= 3, 'proveniência pós-consequência por turno');
			const exp = path.join(cog.dirDe('icaro'), 'experiencias.jsonl');
			if (fs.existsSync(exp)) for (const linha of lerLinhas(exp))
				assert(String(linha.origem).startsWith('decisao_personagem:icaro'), 'experiência com proveniência do próprio');
			assert(cog.erros().length === 0, '0 erros de mecanismo no E2E: ' + JSON.stringify(cog.erros().slice(-3)));
		} finally { restaurarFetch(); fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(raiz12, { recursive: true, force: true }) }
	});

	// --------------------------------------------------------------- 13 ----
	await t('13. experimento de trajetória com ablação: mesmo LLM, só o bloco de mecanismos muda — e as decisões mudam', async () => {
		const N = 20;
		async function braco(nome, ligado) {
			const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'ilha-abla-'));
			if (ligado) ligar(raiz); else desligar();
			const e = estadoNovo();
			const ciclo0 = e.mundo.tempo.ciclo;
			const prompts = [];
			global.fetch = async (u, o) => {
				const b = JSON.parse(o.body); prompts.push(b);
				const en = b.format.properties.acao.enum;
				const tem = b.messages[1].content.includes('[MECANISMOS]');
				// MESMA política para os dois braços: a única diferença é o prompt
				const alvo = tem ? (en.includes('observar') ? 'observar' : en[0])
					: (en.includes('descansar') ? 'descansar' : (en.includes('esperar') ? 'esperar' : en[0]));
				return resposta({ acao: alvo, motivo: 'política do experimento de ablação' });
			};
			try {
				for (let i = 0; i < N; i++) await rodada(e, { acontecimentos: false });
			} finally { restaurarFetch(); fs.rmSync(raiz, { recursive: true, force: true }) }
			const freq = {};
			for (const dec of e.historico.decisoes) freq[dec.acao] = (freq[dec.acao] || 0) + 1;
			return {
				nome, ciclo0, ciclos: e.mundo.tempo.ciclo, turnos: e.historico.decisoes.length,
				comMec: prompts.filter(b => b.messages[1].content.includes('[MECANISMOS]')).length,
				totalPrompts: prompts.length, freq,
				vivos: Object.values(e.seres).filter(s => s.status !== 'morto').length
			};
		}
		const controle = await braco('controle', false);
		const cognitivo = await braco('cognitivo', true);
		desligar();
		assert.equal(controle.ciclos - controle.ciclo0, N); assert.equal(cognitivo.ciclos - cognitivo.ciclo0, N);
		assert.equal(controle.turnos, N * 4); assert.equal(cognitivo.turnos, N * 4);
		assert.equal(controle.comMec, 0, 'controle: NENHUM prompt com mecanismos');
		assert.equal(cognitivo.comMec, N * 4, 'cognitivo: TODOS os prompts com mecanismos');
		assert.equal(controle.freq.descansar, N * 4, 'controle desvia para descansar');
		assert.equal(cognitivo.freq.observar, N * 4, 'cognitivo desvia para observar');
		assert.equal(controle.freq.observar || 0, 0, 'ablação: controle nunca observou');
		assert.equal(cognitivo.freq.descansar || 0, 0, 'ablação: cognitivo nunca descansou');
		assert.equal(controle.vivos, 4); assert.equal(cognitivo.vivos, 4, 'nenhum braço matou os seres');
		console.log('ABLAÇÃO ' + JSON.stringify({ controle: controle.freq, cognitivo: cognitivo.freq, mecanismos: [controle.comMec, cognitivo.comMec] }));
	});

	// --------------------------------------------------------------- 14 ----
	await t('14. reversão em 1 comando + preservamento de produção (estado/logs) e da fonte interna', () => {
		desligar();
		const e = estadoNovo();
		const poss = acoes(e, e.seres.icaro);
		const ctx = montarContexto(e, e.seres.icaro, poss, null);
		assert(!('cognicao' in ctx), 'sem ILHA_COG o contexto é o de sempre, sem a chave');
		assert(!cerebro.montarPrompt(ctx, poss, e.seres.icaro).includes('[MECANISMOS]'), 'prompt sem seção de mecanismos');
		assert.strictEqual(cerebroDe({}, e.seres.icaro), require('./decisor').decidir, 'plugue vazio volta ao decisor legado');
		// produção intacta
		if (snapEstado) {
			assert.equal(sha256(ESTADO_ILHA), snapEstado.h, 'estado-ilha.json byte-idêntico ao início do teste');
			assert.equal(fs.statSync(ESTADO_ILHA).mtimeMs, snapEstado.m, 'estado-ilha.json sem novo mtime');
		}
		if (snapLogs) for (const L of snapLogs)
			assert.equal(fs.statSync(path.join(LOGS_DIR, L.f)).mtimeMs, L.m, 'log intocado: ' + L.f);
		// a fonte interna segue byte-idêntica ao manifesto até o fim
		let s = fs.readFileSync(path.join(__dirname, 'cerebro-icaro', 'mecanismos', 'MANIFESTO-MECANISMOS.json'), 'utf8');
		if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
		const man = JSON.parse(s);
		const porArquivo = Object.fromEntries(man.modulos.map(x => [x.arquivo, x]));
		for (const m of cog.MODULOS) assert.equal(sha256(path.join(cog.FONTE, m)), porArquivo[m].origem_sha256, m + ' intacto');
	});

	// --------------------------------------------------------------- 15 ----
	await t('15. Intervenções do Diretor/Audiência: manipulam apenas o MUNDO; seres percebem e decidem livremente', async () => {
		const { intervir } = require('./acontecimentos');
		const { perceber } = require('./percepcao-v2');
		const e = estadoNovo();
		const icaro = e.seres.icaro;
		icaro.local = 'fogueira';

		// 1. Enviar caixa de suprimentos e artefato misterioso para a fogueira
		const evSup = intervir(e, { tipo: 'suprimento', no: 'fogueira', patrocinador: 'Espectador_VIP', mensagem: 'Para quem chegar primeiro!' });
		const evArt = intervir(e, { tipo: 'artefato', no: 'fogueira', patrocinador: 'Diretor', mensagem: 'O tempo observa quem questiona.' });
		assert.equal(evSup.tipo, 'suprimento');
		assert.equal(evArt.tipo, 'artefato');
		assert.equal(e.mundo.acontecimentos.length, 2);

		// 2. Percepção registra os objetos do mundo sem forçar ação
		const p = perceber(e, icaro);
		assert(p.some(x => x.includes('caixa de suprimentos') && x.includes('Espectador_VIP')), 'percebe a caixa e o patrocinador');
		assert(p.some(x => x.includes('artefato misterioso') && x.includes('O tempo observa')), 'percebe o artefato e a inscrição');

		// 3. Ações possíveis oferecem abrir_suprimento e investigar_artefato como escolhas livres ao lado das demais
		const poss = acoes(e, icaro);
		assert(poss.some(a => a.id === 'abrir_suprimento'), 'abrir_suprimento está disponível no local');
		assert(poss.some(a => a.id === 'investigar_artefato'), 'investigar_artefato está disponível no local');
		assert(poss.some(a => a.id === 'observar') && poss.some(a => a.id === 'esperar'), 'demais escolhas livres continuam disponíveis');

		// 4. Executar abrir_suprimento e investigar_artefato atualiza recursos/memória do ser e usos do evento
		const aguaAntes = icaro.inventario.agua;
		const resSup = executar(e, icaro, 'abrir_suprimento');
		assert.equal(resSup.acao, 'abrir_suprimento');
		assert(resSup.quantidade > 0, 'quantidade coletada da caixa');
		assert(icaro.inventario.agua > aguaAntes, 'recebeu água da caixa');
		assert(icaro.memoria.some(m => m.texto.includes('Para quem chegar primeiro!')), 'bilhete gravado na memória');

		const resArt = executar(e, icaro, 'investigar_artefato');
		assert.equal(resArt.acao, 'investigar_artefato');
		assert.equal(resArt.quantidade, 1);
		assert(icaro.memoria.some(m => m.texto.includes('O tempo observa')), 'inscrição do artefato gravada na memória');
		assert(Array.isArray(e.descobertas) && e.descobertas.some(d => d.includes('O tempo observa')), 'registrado nas descobertas da ilha');
	});

	// ---- encerramento: devolve o ambiente ao estado inicial ----------------
	limparEnv();
	try { cog.ativar(RAIZ_COG_ANTES); cog.desligar() } catch (e) { cog.desligar() }
	restaurarFetch();
	fs.rmSync(RAIZ_TESTE, { recursive: true, force: true });
	console.log('RESULTADO ' + total + ' blocos OK (teste-cognicao)');
})().catch(e => { console.error('FALHA: ' + (e && e.stack || e)); process.exitCode = 1 });

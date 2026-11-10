'use strict';
// cognicao.js — CAMADA COGNITIVA AUTÔNOMA DA ILHA AURORA.
//
// PRINCÍPIOS:
//  1. Os 16 módulos em `cerebro-icaro/mecanismos/` pertencem integralmente à
//     Ilha Aurora (ver MANIFESTO-MECANISMOS.json com SHA-256).
//  2. Isolamento por personagem = cada módulo resolve seus arquivos por
//     `__dirname`, então copiar para `memorias/<id>/mecanismos/` e requerer
//     as CÓPIAS dá estado 100 % individual por habitante.
//  3. Identidade 100% autônoma de cada habitante: vem de
//     `historia-previa.js` + `biblia-ilha-aurora.js`.
//  4. Os GATES controlam mecanismos em sombra vs ativos por padrão.
//  5. NENHUM mecanismo decide nada. Estes módulos só:
//       (a) produzem BLOCOS de contexto que o LLM recebe;
//       (b) registram estado pós-consequência;
//       (c) auditam a trilha causal da decisão.
//     A ação continua saindo do LLM e o MOTOR continua validando e aplicando.
//  6. Falha de mecanismo NUNCA quebra o ciclo: toda chamada passa por
//     `seguro()` e cai para padrão.
//
// SAÍDA DE CONTEXTOS: `influencia(ser, ctx)` devolve o objeto `ctx.cognicao`
// que `cerebro-personagem.montarContexto` anexa e que `cerebro.js` renderiza.
// Com a camada DESLIGADA o contexto é byte-idêntico ao anterior.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ----------------------------------------------------------------------------
// 1. VENDORING — fonte (somente leitura) -> cópia por personagem
// ----------------------------------------------------------------------------
const FONTE = path.join(__dirname, 'cerebro-icaro', 'mecanismos');
const RAIZ_PADRAO = path.join(__dirname, 'memorias');
const MODULOS = [
	'nucleo-aura.js', 'nucleo-self-model.js', 'extrator-crencas.js',
	'nucleo-topicos.js', 'nucleo-tracos.js', 'nucleo-correcao.js',
	'nucleo-proveniencia.js', 'nucleo-prov-label.js', 'nucleo-peso.js',
	'nucleo-selecao-contextual.js', 'nucleo-memoria-v2.js', 'nucleo-medo.js',
	'nucleo-cuidado.js', 'nucleo-agencia.js', 'nucleo-experiencias.js',
	'nucleo-trilha-causal.js'
];

let RAIZ = RAIZ_PADRAO;
// Opt-in por ambiente: `ILHA_COG=1` já liga a camada no load (produção e
// experimento); `ativar()`/`desligar()` continuam disponíveis para teste.
let ATIVO = process.env.ILHA_COG === '1';
const INSTANCIAS = new Map();
const DIRS_REQ = new Set();
const TURNOS = new Map();
const ERROS = [];
const MAX_ERROS = 200;

function dirDe(id) { return path.join(RAIZ, String(id), 'mecanismos'); }
function raizAtual() { return RAIZ; }
function estaAtivo() { return ATIVO; }

// Saúde da camada: fonte dos 16 módulos legível (cópia por personagem é
// garantida por `garantirModulos` a cada instanciar).
function saudavel() {
	try { for (const m of MODULOS) fs.readFileSync(path.join(FONTE, m)); return true; }
	catch (e) { return false; }
}

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
	fs.writeFileSync(marca, JSON.stringify({ hash: h, fonte: 'cerebro-icaro/mecanismos' }), 'utf8');
	limparCache(dir);
	return true;
}

// Nomes de export de cada módulo (cópia exigida = isolamento).
const EXPORTS = {
	'nucleo-aura.js': ['motorAfetivo'],
	'nucleo-self-model.js': ['carregar', 'blocoParaPrompt', 'lerUltimas', 'detectarReflexao', 'adicionarObservacao'],
	'extrator-crencas.js': ['ehFormulaAssistente'],
	'nucleo-topicos.js': ['normalizarTopicoCanonico'],
	'nucleo-tracos.js': ['carregar', 'lerTracosAtivos', 'registrarCrenca', 'checarPromocao'],
	'nucleo-correcao.js': ['topicoDe', 'detectarCorrecao', 'extrairContexto', 'registrarErro', 'lerErro', 'blocoHesitacao', 'LIMIAR'],
	'nucleo-proveniencia.js': ['registrarTurno', 'ultimos', 'estatisticas'],
	'nucleo-prov-label.js': ['carregarFalas', 'suspeitaFato'],
	'nucleo-peso.js': ['comparar', 'selecionar', 'adaptarFato', 'adaptarExperiencia', 'pesoItem'],
	'nucleo-selecao-contextual.js': ['selecionar', 'ehGenerica', 'scoreFato'],
	'nucleo-memoria-v2.js': ['carregar', 'salvar', 'fatosAtivos'],
	'nucleo-medo.js': ['avaliarTurno', 'blocoMedo'],
	'nucleo-cuidado.js': ['registrarAto', 'oferecer', 'ofertasHabilitadas', 'podeFalar', 'blocoFala', 'lerAtos'],
	'nucleo-agencia.js': ['ciclo', 'coletarFontes', 'focoParaPrompt', 'blocoFoco', 'lerFoco'],
	'nucleo-experiencias.js': ['listar', 'registrar', 'detectarEvento'],
	'nucleo-trilha-causal.js': ['iniciarTrilha', 'anexarRecuperado', 'anexarFatos', 'anexarSelfModel',
		'anexarAttentionGate', 'concluirTrilha', 'auditarDecisao', 'estatisticas']
};

function instanciar(id) {
	const mudou = garantirModulos(id);
	if (mudou) INSTANCIAS.delete(String(id));
	let inst = INSTANCIAS.get(String(id));
	if (!inst) {
		const dir = dirDe(id);
		inst = { id: String(id), dir, mods: {} };
		for (const m of MODULOS) {
			try { inst.mods[m] = require(path.join(dir, m)); }
			catch (e) { inst.mods[m] = null; registrarErro('cognicao', m, e); }
		}
		// Dependências cruzadas que os módulos resolvem por `./` precisam
		// existir no mesmo diretório — por isso TODOS os 16 são copiados.
		DIRS_REQ.add(dir);
		INSTANCIAS.set(String(id), inst);
	}
	return inst;
}

// ----------------------------------------------------------------------------
// 2. SEGURANÇA — nenhuma falha de mecanismo quebra o ciclo
// ----------------------------------------------------------------------------
function registrarErro(fonte, nome, e) {
	ERROS.push({ quando: new Date().toISOString(), fonte, nome, erro: String((e && e.message) || e) });
	if (ERROS.length > MAX_ERROS) ERROS.shift();
}
function seguro(fonte, nome, fn, padrao) {
	try { return fn(); } catch (e) { registrarErro(fonte, nome, e); return padrao; }
}
function erros() { return ERROS.slice(); }
function limparErros() { ERROS.length = 0; }

// ----------------------------------------------------------------------------
// 3. FLAGS — gate NOMEADO da Ilha. Os módulos continuam lendo ICARO_* (são
//    byte-idênticos); aqui só controlamos a NOSSA camada.
// ----------------------------------------------------------------------------
function flag(nome, padrao) {
	const v = process.env[nome];
	if (v === undefined || v === '') return padrao;
	return v === '1' || v === 'true';
}
function nivel(nome, padrao) {
	const n = Number(process.env[nome]);
	return Number.isFinite(n) ? n : padrao;
}
const LIGADO = {
	aura: () => flag('ILHA_COG_AURA', true),
	selfModel: () => flag('ILHA_COG_SELF_MODEL', true),
	tracos: () => flag('ILHA_COG_TRACOS', true),
	hesitacao: () => flag('ILHA_COG_HESITACAO', true),
	experiencias: () => flag('ILHA_COG_EXPERIENCIAS', true),
	// SOMBRA por padrão (= default do ICAROOVO):
	peso: () => flag('ILHA_COG_PESO', false),          // ICARO_PESO=1 troca a seleção
	cuidadoFala: () => flag('ILHA_COG_CUIDADO_OFERTA', false), // ICARO_CUIDADO_OFERTA=1
	agenciaFoco: () => nivel('ILHA_COG_AGENCIA_MODO', 0) >= 1, // ICARO_AGENCIA_MODO>=1
	trilha: () => flag('ILHA_COG_TRILHA', true)
};

// ----------------------------------------------------------------------------
// 4. ADAPTAÇÕES MÍNIMAS (mecanismo real, dados da Ilha)
// ----------------------------------------------------------------------------
// Proveniência das memórias da Ilha -> vocabulário de `nucleo-peso`:
//   vivido/percebido diretamente  -> 'verificado'   (0.95)
//   ouvido de terceiro (fala)     -> 'dado_externo' (0.90)
//   inferido pelo personagem      -> 'inferencia'   (0.55)
function tokens(t) {
	return String(t || '').toLowerCase().normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '').split(/\s+/)
		.filter(x => x.length >= 4).slice(0, 12);
}
function adaptarMemoria(m) {
	if (!m) return null;
	const texto = String(m.texto || m || '').trim();
	if (!texto) return null;
	const tipo = m.tipo === 'fala' ? 'dado_externo'
		: (m.tipo === 'inferencia' ? 'inferencia' : 'verificado');
	return {
		chave: texto, sujeito: texto, predicado: '', objeto: '',
		chaves: tokens(texto), origem: tipo,
		at: m.ciclo != null ? 'ciclo ' + m.ciclo : null,
		proveniencia: m.tipo === 'fala' ? 'ouvida' : 'vivida'
	};
}
function candidatosDe(ser, ctx) {
	const base = (ser && Array.isArray(ser.memoria) ? ser.memoria : []);
	const extra = (ctx && Array.isArray(ctx.memoriasBrutas) ? ctx.memoriasBrutas : []);
	return base.concat(extra).map(adaptarMemoria).filter(Boolean);
}

// Texto de ENTRADA do turno (análogo da "pergunta" do ICAROOVO): só o que
// ESTE ser percebe agora. Nunca verdade global do mundo.
function entradaDoTurno(ctx) {
	if (!ctx) return '';
	const p = [];
	if (Array.isArray(ctx.percepcoes)) p.push(...ctx.percepcoes);
	if (Array.isArray(ctx.acontecimentos)) p.push(...ctx.acontecimentos);
	if (Array.isArray(ctx.sensacoes)) p.push(...ctx.sensacoes);
	return p.join(' ').replace(/\s+/g, ' ').trim().slice(0, 900);
}

// ----------------------------------------------------------------------------
// 5. INFLUÊNCIA — blocos que entram no contexto da decisão
// ----------------------------------------------------------------------------
function influencia(ser, ctx) {
	if (!ATIVO || !ser || !ser.id) return null;
	const inst = instanciar(ser.id);
	const id = ser.id;
	const saida = { personagem: id, ativo: true, aura: null, blocos: {}, sombra: {}, fontes: {}, proveniencia: [], erros: [] };
	const entrada = seguro('cognicao', 'entradaDoTurno', () => entradaDoTurno(ctx), '');

	// --- AURA (puro, sem arquivo; muda prompt E temperatura) ---------------
	if (LIGADO.aura()) {
		const aura = inst.mods['nucleo-aura.js'];
		if (aura && aura.motorAfetivo) {
			const r = seguro('aura', 'processarTexto', () => aura.motorAfetivo.processarTexto(entrada), null);
			if (r && r.moduladores) {
				saida.aura = {
					vetor: r.vetor,
					moduladores: r.moduladores,
					gatilho: r.classificacao ? r.classificacao.gatilhoDetectado : null,
					regulacaoAprendida: !!r.regulacaoAprendida
				};
				saida.fontes.aura = r.moduladores.estadoExpressivo || null;
			}
		}
	}

	// --- TRAÇOS PROPRIOS (bloco ativo) -------------------------------------
	if (LIGADO.tracos()) {
		const NT = inst.mods['nucleo-tracos.js'];
		if (NT) seguro('tracos', 'bloco', () => {
			const estado = NT.carregar();
			const ativos = NT.lerTracosAtivos(estado, 3) || [];
			if (!ativos.length) return;
			const linhas = ativos.map(t => {
				if (t.reflexao) return '- ' + t.reflexao;
				const pol = t.valor >= 0 ? 'positiva' : 'negativa';
				return '- Sobre ' + t.topico + ', tenho tendência ' + pol +
					' (conf ' + Number(t.confianca).toFixed(2) + ', ' + t.ocorrencias + ' evidências)';
			});
			saida.blocos.tracos = 'TRACOS PROPRIOS (padrões que eu consolidei sobre mim; ' +
				'não confundir com fato sobre quem conversa comigo):\n' + linhas.join('\n');
			saida.fontes.tracos = ativos.map(t => t.topico).slice(0, 3);
		}, null);
	}

	// --- SELF-MODEL (bloco ativo) ------------------------------------------
	if (LIGADO.selfModel()) {
		const SM = inst.mods['nucleo-self-model.js'];
		if (SM) seguro('selfModel', 'bloco', () => {
			const b = SM.blocoParaPrompt(3);
			if (b) saida.blocos.selfModel = b;
			const ult = (SM.lerUltimas && SM.lerUltimas(3)) || [];
			saida.fontes.selfModel = ult.map(o => (o && (o.id || o.texto)) || String(o)).slice(0, 3);
		}, null);
	}

	// --- HESITAÇÃO (bloco ativo, condicional ao limiar do módulo) ----------
	if (LIGADO.hesitacao()) {
		const NC = inst.mods['nucleo-correcao.js'];
		if (NC) seguro('hesitacao', 'bloco', () => {
			const t = NC.topicoDe(entrada);
			if (!t) return;
			const b = NC.blocoHesitacao(t);
			if (b) {
				saida.blocos.hesitacao = b;
				saida.fontes.hesitacao = { topico: t, erros: NC.lerErro(t) };
			}
		}, null);
	}

	// --- EXPERIÊNCIAS REGISTRADAS (bloco ativo, leitura) -------------------
	if (LIGADO.experiencias()) {
		const EXP = inst.mods['nucleo-experiencias.js'];
		if (EXP) seguro('experiencias', 'bloco', () => {
			const vivas = (EXP.listar() || []).filter(x =>
				(x.status === 'ativa' || x.status === 'revisada') && x.interpretacao).slice(-3);
			if (!vivas.length) return;
			saida.blocos.experiencias = 'EXPERIENCIAS QUE JÁ REGISTREI (minha leitura de acontecimentos ' +
				'reais; não são ordens):\n' + vivas.map(x => '- ' + x.interpretacao).join('\n');
			saida.fontes.experiencias = vivas.map(x => x.id);
		}, null);
	}

	// --- PESO / RELEVÂNCIA (SOMBRA por padrão) -----------------------------
	// Em sombra: compara e registra a divergência, o contexto continua no
	// baseline. ILHA_COG_PESO=1 troca a seleção (é a alavanca de ativação).
	seguro('peso', 'comparar', () => {
		const PESO = inst.mods['nucleo-peso.js'];
		if (!PESO) return;
		const brutos = candidatosDe(ser, ctx);
		if (!brutos.length) return;
		const r = PESO.comparar(entrada || '.', brutos, { maxEspecifica: 8, maxGenerica: 15 });
		saida.sombra.peso = {
			ativo: LIGADO.peso(),
			idsPeso: r.idsPeso, idsBase: r.idsBase,
			divergencia: r.divergencia,
			log: (r.log || []).map(l => ({ id: l.id, total: l.total, porque: l.porque }))
		};
		if (LIGADO.peso()) saida.memoriasSelecionadas = r.idsPeso;
	}, null);

	// --- MEDO OPERACIONAL (SOMBRA; nível 0 = off = custo zero) -------------
	seguro('medo', 'avaliarTurno', () => {
		const NM = inst.mods['nucleo-medo.js'];
		if (!NM) return;
		const reg = NM.avaliarTurno({ pergunta: entrada, fatosAtivos: [] });
		if (reg) saida.sombra.medo = reg;
	}, null);

	// --- CUIDADO (atos gravados sempre; fala no prompt só com gate) ---------
	seguro('cuidado', 'leitura', () => {
		const CUID = inst.mods['nucleo-cuidado.js'];
		if (!CUID) return;
		saida.sombra.cuidado = { ofertasHabilitadas: !!CUID.ofertasHabilitadas() };
		if (LIGADO.cuidadoFala()) {
			const pf = CUID.podeFalar({ pergunta: entrada, turno: turnoDe(id) });
			if (pf && pf.falar) {
				saida.blocos.cuidado = CUID.blocoFala(pf.oferta);
				saida.fontes.cuidado = pf.oferta && pf.oferta.id;
				seguro('cuidado', 'marcarMencionada', () => CUID.marcarMencionada(pf.oferta.id, turnoDe(id)), null);
			}
		}
	}, null);

	// --- AGENCIA (ciclo roda sempre; FOCO no prompt só com gate) -----------
	seguro('agencia', 'foco', () => {
		const AG = inst.mods['nucleo-agencia.js'];
		if (!AG) return;
		const fp = AG.focoParaPrompt(turnoDe(id));
		if (fp && fp.foco) saida.sombra.agencia = { foco: fp.foco.id, modo: fp.modo, motivo: fp.motivo };
		if (LIGADO.agenciaFoco() && fp && fp.foco) saida.blocos.agencia = AG.blocoFoco(fp.foco, fp.modo);
	}, null);

	// --- PROVENIÊNCIA das memórias no contexto (explícita, por item) --------
	seguro('cognicao', 'proveniencia', () => {
		saida.proveniencia = (ser.memoria || []).slice(-12).map(m => ({
			texto: String(m.texto || '').slice(0, 120),
			origem: m.tipo === 'fala' ? 'ouvida_de_terceiro'
				: (m.tipo === 'inferencia' ? 'inferencia' : 'vivida_diretamente'),
			ciclo: m.ciclo
		}));
	}, null);

	saida.erros = ERROS.slice(-5);
	return saida;
}

function turnoDe(id) {
	const n = (TURNOS.get(String(id)) || 0) + 1;
	TURNOS.set(String(id), n);
	return n;
}

// ----------------------------------------------------------------------------
// 6. TRILHA CAUSAL — evidência do que ENTROU no contexto e do que a decisão USOU
// ----------------------------------------------------------------------------
// Itens que ENTRARAM no contexto deste turno (mesma lista usada no gate):
// é o que a trilha compara com a fala da decisão para provar uso.
function itensDoContexto(ctx) {
	const cog = ctx && ctx.cognicao;
	const recuperados = [];
	if (cog) {
		if (cog.blocos) for (const k of Object.keys(cog.blocos)) if (cog.blocos[k]) recuperados.push('bloco:' + k);
		if (cog.aura) recuperados.push('aura:' + (cog.fontes && cog.fontes.aura));
		if (Array.isArray(cog.proveniencia)) for (const p of cog.proveniencia) recuperados.push('mem:' + p.texto.slice(0, 40));
	}
	if (Array.isArray(ctx && ctx.memorias)) for (const m of ctx.memorias) recuperados.push('ctxmem:' + String(m).slice(0, 40));
	return recuperados;
}

function abrirTrilha(ser, ctx, possiveis) {
	if (!ATIVO || !LIGADO.trilha() || !ser) return null;
	const inst = instanciar(ser.id);
	const T = inst.mods['nucleo-trilha-causal.js'];
	if (!T) return null;
	return seguro('trilha', 'iniciar', () => {
		const id = T.iniciarTrilha({
			pergunta: entradaDoTurno(ctx).slice(0, 200),
			remetente: 'mundo:' + (ctx && ctx.local ? ctx.local : '?'),
			personagem: ser.id,
			opcoes: (possiveis || []).map(p => p.id)
		});
		const cog = ctx && ctx.cognicao;
		const recuperados = itensDoContexto(ctx);
		if (recuperados.length) T.anexarRecuperado(id, recuperados);
		if (cog && cog.fontes && cog.fontes.selfModel && cog.fontes.selfModel.length) T.anexarSelfModel(id, cog.fontes.selfModel);
		if (cog && cog.fontes && cog.fontes.tracos && cog.fontes.tracos.length) T.anexarFatos(id, cog.fontes.tracos);
		return id;
	}, null);
}

// ATTENTION GATE mínimo (o gate real do ICAROOVO mora dentro de
// icaro-hibrido.js e não é módulo exportável — adaptação documentada):
// item entrou no prompt e aparece na fala da decisão -> usado.
function gate(trilhaId, inst, itens, resposta) {
	const T = inst && inst.mods['nucleo-trilha-causal.js'];
	if (!T || !trilhaId) return null;
	const alvo = String(resposta || '').toLowerCase();
	const g = {};
	for (const it of itens || []) {
		const chave = String(it);
		const base = chave.toLowerCase().replace(/^(bloco:|aura:|mem:|ctxmem:)/, '');
		const ts = base.split(/\s+/).filter(t => t.length >= 4);
		let v = 0;
		if (base && alvo.includes(base)) v = 1;
		else if (ts.length) {
			const usados = ts.filter(t => alvo.includes(t)).length;
			if (usados / ts.length >= 0.5) v = 0.5;
		}
		g[chave] = { usado: v > 0, peso: v };
	}
	return g;
}

function fecharTrilha(trilhaId, info) {
	if (!trilhaId || !info || !info.ser) return null;
	const inst = instanciar(info.ser.id);
	return seguro('trilha', 'fechar', () => {
		const T = inst.mods['nucleo-trilha-causal.js'];
		if (!T) return null;
		const resposta = String((info.decisao && (info.decisao.motivo + ' ' + info.decisao.acao)) || '');
		const itens = info.itens || [];
		const g = gate(trilhaId, inst, itens, resposta);
		if (g && Object.keys(g).length) T.anexarAttentionGate(trilhaId, g);
		T.concluirTrilha(trilhaId, {
			decision: info.decisao ? String(info.decisao.acao) : null,
			resposta: resposta.slice(0, 500),
			outcome: info.consequencia ? { acao: info.consequencia.acao, quantidade: info.consequencia.quantidade } : null
		});
		return T.auditarDecisao(trilhaId);
	}, null);
}

function abortarTrilha(trilhaId, info) {
	if (!trilhaId || !info || !info.ser) return null;
	return seguro('trilha', 'abortar', () => {
		const T = instanciar(info.ser.id).mods['nucleo-trilha-causal.js'];
		if (!T) return null;
		T.concluirTrilha(trilhaId, { decision: 'abortada', resposta: String((info.erro && info.erro.message) || '').slice(0, 300) });
		return true;
	}, null);
}

// ----------------------------------------------------------------------------
// 7. PÓS-CONSEQUÊNCIA — o que o motor produziu vira experiência dos mecanismos
//    Chamado SÓ depois de `motor-v2.executar` (a verdade é a do motor).
// ----------------------------------------------------------------------------
function posConsequencia(ser, info) {
	if (!ATIVO || !ser || !ser.id) return null;
	const inst = instanciar(ser.id);
	const id = ser.id;
	const out = { personagem: id, registros: {}, erros: [] };
	info = info || {};
	const motivo = String((info.decisao && info.decisao.motivo) || '').slice(0, 500);
	const acao = (info.decisao && info.decisao.acao) || '';
	const falas = Array.isArray(info.falasRecebidas) ? info.falasRecebidas : [];
	const entrada = falas.length ? falas.map(f => String(f.texto || '')).join(' ')
		: String(info.entrada || '').slice(0, 500);

	// 1) SELF-MODEL: reflexão implícita nas palavras PRÓPRIAS do personagem.
	if (LIGADO.selfModel()) seguro('selfModel', 'pos', () => {
		const SM = inst.mods['nucleo-self-model.js'];
		if (!SM) return;
		const r = SM.detectarReflexao(motivo);
		if (r && r.texto) {
			const salva = SM.adicionarObservacao({ texto: r.texto, tipo: r.tipo || 'percepcao', fonte: 'implicito' });
			if (salva) out.registros.selfModel = r.texto.slice(0, 120);
		}
	}, null);

	// 2) CORREÇÃO/HESITAÇÃO: só quando OUTRO personagem de fato corrige.
	seguro('correcao', 'pos', () => {
		const NC = inst.mods['nucleo-correcao.js'];
		if (!NC || !falas.length) return;
		for (const f of falas) {
			if (!NC.detectarCorrecao(String(f.texto || ''))) continue;
			const ctx = NC.extrairContexto(motivo, String(f.texto || ''));
			if (ctx) {
				const n = NC.registrarErro(ctx);
				out.registros.correcao = { topico: ctx, erros: n, de: f.de || null };
			}
		}
	}, null);

	// 3) PROVENIÊNCIA (sombra ativa por padrão, como no ICAROOVO).
	seguro('proveniencia', 'pos', () => {
		const PV = inst.mods['nucleo-proveniencia.js'];
		if (!PV) return;
		PV.registrarTurno({
			entrada: entrada || '(sem entrada)',
			resposta: motivo || acao,
			remetente: falas.length ? falas[0].de : 'mundo',
			origemEvento: 'ciclo_ilha',
			turno: turnoDe(id)
		});
		out.registros.proveniencia = true;
	}, null);

	// 4) CUIDADO: ato dirigido a ESTE personagem (reconhecimento em sombra).
	seguro('cuidado', 'pos', () => {
		const CUID = inst.mods['nucleo-cuidado.js'];
		if (!CUID || !entrada) return;
		const ato = CUID.registrarAto(entrada, 'ciclo:' + (info.ciclo || 0));
		if (ato) out.registros.cuidado = ato.tipo + '/' + ato.categoria;
		try {
			const AG = inst.mods['nucleo-agencia.js'];
			if (AG) CUID.oferecer(AG.coletarFontes(), { turno: turnoDe(id) });
		} catch (e) { /* sem fontes ainda */ }
	}, null);

	// 5) EXPERIÊNCIA REGISTRADA (nucleo-experiencias): só com evento real
	//    detectado. Sem a Parte 2 do ICAROOVO (juízo LLM "Você é o Ícaro" —
	//    identidade pessoal, portanto NÃO copiada): a interpretação é a
	//    própria fala do personagem sobre o que decidiu viver.
	seguro('experiencias', 'pos', () => {
		const EXP = inst.mods['nucleo-experiencias.js'];
		if (!EXP || !entrada) return;
		const ev = EXP.detectarEvento(entrada);
		if (!ev) return;
		const linha = EXP.registrar({
			entrada, resposta: motivo || acao, evento: ev,
			preenchimento: {
				interpretacao: motivo ? motivo.slice(0, 500) : null,
				confianca: null,
				origem: 'decisao_personagem:' + id
			}
		});
		if (linha) out.registros.experiencia = linha.id;
	}, null);

	// 6) AGENCIA: um ciclo por consequência (no ICAROOVO é periódico).
	seguro('agencia', 'pos', () => {
		const AG = inst.mods['nucleo-agencia.js'];
		if (!AG) return;
		const r = AG.ciclo(AG.coletarFontes());
		if (r && r.escolhido) out.registros.agencia = r.escolhido.id || r.escolhido.tipo || null;
	}, null);

	out.erros = ERROS.slice(-5);
	return out;
}

// ----------------------------------------------------------------------------
// 8. CICLO DE VIDA
// ----------------------------------------------------------------------------
function ativar(raiz) {
	if (raiz) RAIZ = path.resolve(raiz);
	resetarInstancias();
	ATIVO = true;
	return RAIZ;
}
function desligar() { ATIVO = false; resetarInstancias(); return false; }
function reabrir(id) { limparCache(dirDe(id)); INSTANCIAS.delete(String(id)); return instanciar(id); }
function resetarInstancias() {
	for (const dir of DIRS_REQ) limparCache(dir);
	INSTANCIAS.clear(); TURNOS.clear();
}
function instanciasAtivas() { return [...INSTANCIAS.keys()]; }
function hashFonte() { return fonteHash(); }

module.exports = {
	MODULOS, FONTE, EXPORTS, raizAtual, dirDe, estaAtivo, saudavel, ativar, desligar,
	instanciar, instanciasAtivas, reabrir, resetarInstancias, hashFonte,
	influencia, posConsequencia, abrirTrilha, fecharTrilha, abortarTrilha,
	entradaDoTurno, adaptarMemoria, candidatosDe, itensDoContexto,
	seguro, registrarErro, erros, limparErros, flag, nivel, LIGADO, turnoDe
};

'use strict';
// cerebro-cognitivo.js — CÉREBRO DA ILHA com a camada cognitiva do ICAROOVO.
//
// Este módulo NÃO decide sozinho: ele orquestra o mesmo caminho que a Ilha
// já usa (`cerebro.js` → LLM) e acrescenta três garantias exigidas pela
// missão:
//   1. o cérebro ANTERIOR continua disponível como fallback configurável
//      (`ILHA_COG_FALLBACK = legado | nenhum`, padrão `legado`);
//   2. indisponibilidade/timeout do LLM não corrompem estado nem interrompem
//      a simulação (`ILHA_COG_EMERGENCIA=1` devolve uma ação neutra e marcada);
//   3. a instância é PRESA ao personagem: decidir com outro ser é erro —
//      estado cognitivo nunca atravessa habitantes.
//
// Plugue (produção/experimento):
//   const cog=require('./cerebro-cognitivo');
//   rodada(estado,{acontecimentos:true, cerebros:{
//     icaro: cog.criar('icaro'), lara: cog.criar('lara'),
//     maria: cog.criar('maria'), joao: cog.criar('joao')
//   }})
const base = require('./cerebro');
const legado = require('./decisor-original');

function neutralizar(possiveis) {
	// Ação NEUTRA: não é "necessidade vira regra" — é a ausência de decisão
	// cognitiva, explícita na origem e no motivo. Prefere observar a agir.
	const pref = ['observar', 'esperar', 'descansar'];
	for (const p of pref) if (possiveis.some(a => a.id === p)) return p;
	return possiveis && possiveis.length ? possiveis[0].id : null;
}

// O cérebro anterior (decisor-original) NÃO tem timeout próprio: sem isto a
// indisponibilidade do Ollama no fallback penduraria o ciclo do mundo.
function comPrazo(fn, ms) {
	return new Promise((resolve, reject) => {
		const cron = setTimeout(() => reject(new Error('fallback sem resposta em ' + ms + 'ms')), ms);
		Promise.resolve().then(fn).then(
			v => { clearTimeout(cron); resolve(v); },
			e => { clearTimeout(cron); reject(e); }
		);
	});
}

function criar(id, opcoes = {}) {
	if (!id || typeof id !== 'string') throw Error('cerebro-cognitivo exige id');
	const interno = {
		id, nome: opcoes.nome || id, decisoes: 0, falhas: 0, fallbacks: 0,
		emergencias: 0, contextosRecebidos: 0, cooldown: 0, ultima: null
	};
	const baseDe = opcoes.base || (c => base.decidir(c.acao ? c : c.contexto, c.acao ? c : c.possiveis, c.acao ? c : c.ser));

	async function decidirComBase(contexto, possiveis, ser) {
		return base.decidir(contexto, possiveis, ser);
	}

	function precisaAcordar(ctx) {
                const st = String(ctx.status || '').toLowerCase();
                const pc = (ctx.percepcoes || []).join(' ').toLowerCase();
                return st.includes('critico') || st.includes('perigo') || st.includes('ferido') || pc.includes('predador') || pc.includes('tempestade') || pc.includes('atacado');
        }

        async function decidir(contexto, possiveis, ser) {
		if (!contexto || typeof contexto !== 'object') {
			const e = new Error('cerebro-cognitivo ' + id + ' recebeu contexto inválido');
			e.decisao = true; throw e;
		}
		if (ser && ser.id !== id) {
			const e = new Error('cerebro-cognitivo ' + id + ' recebeu contexto de ' + ser.id +
				' — instâncias são independentes e presas ao personagem');
			e.decisao = true; throw e;
		}
		interno.contextosRecebidos++;

		try {
			const d = await decidirComBase(contexto, possiveis, ser);
			interno.decisoes++;
			interno.ultima = d; if (['descansar', 'continuar', 'pescar', 'beber', 'comer', 'coletar_agua', 'banho'].includes(d.acao)) { interno.cooldown = 5; }
			return { ...d, origem: (d && d.origem) || ('cognitivo-' + id) };
		} catch (err) {
			interno.falhas++;
			const fallbackLigado = (process.env.ILHA_COG_FALLBACK || 'legado') !== 'nenhum';
			// 1º fallback: o cérebro ANTERIOR (prompt antigo, mesmo provedor).
			if (fallbackLigado) {
				try {
					const teto = Math.max(1000, Number(process.env.ILHA_LLM_TIMEOUT_MS) || 60000);
					const d = await comPrazo(() => legado.decidir(contexto, possiveis, ser), teto);
					interno.fallbacks++;
					return { ...d, origem: 'fallback-legado' };
				} catch (e2) { /* segue para a emergência */ }
			}
			// 2º fallback (opt-in): ação neutra — mantém o mundo rodando.
			if (process.env.ILHA_COG_EMERGENCIA === '1') {
				const acao = neutralizar(possiveis);
				if (acao) {
					interno.emergencias++;
					return {
						acao,
						motivo: 'O modelo não respondeu neste ciclo; fiquei observando o que há ao redor.',
						origem: 'fallback-indisponibilidade',
						emergencia: true
					};
				}
			}
			if (err && typeof err === 'object') err.decisao = true;
			throw err;
		}
	}

	return {
		id, nome: interno.nome, decidir,
		estatisticas: () => ({ ...interno })
	};
}

// Mapa pronto para `opcoes.cerebros` (um por personagem).
function criarTodos(ids, opcoes) {
	const mapa = {};
	for (const id of ids) mapa[id] = criar(id, opcoes);
	return mapa;
}

module.exports = { criar, criarTodos, neutralizar };

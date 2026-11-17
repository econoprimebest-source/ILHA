'use strict';
/**
 * interpretador-comandos-rpg.js
 *
 * ADENDO À MISSÃO K — COMANDOS E AÇÕES REAIS DOS HABITANTES
 *
 * Fluxo Obrigatório de 10 Etapas:
 * 1. Receber a mensagem do Criador.
 * 2. Identificar se é uma pergunta, conversa ou comando de ação.
 * 3. Quando for comando, identificar a ação e o destino.
 * 4. Consultar o estado real do mundo.
 * 5. Verificar se o destino existe e está acessível.
 * 6. Calcular uma rota navegável (espaco.rota).
 * 7. Enviar a ordem de movimento ao personagem correto (e acompanhantes, se solicitado).
 * 8. Executar a movimentação no mapa.
 * 9. Atualizar a posição persistente do personagem.
 * 10. Confirmar a execução somente depois de verificar o resultado.
 */

const espaco = require('./espaco');
const { gerenciadorInstanciasGlobal } = require('./gerenciador-instancias');

function chaveSerEstado(serId) {
  const s = String(serId || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (s === 'elara' || s === 'lara') return 'lara';
  if (s === 'icaro') return 'icaro';
  if (s === 'joao') return 'joao';
  if (s === 'maria') return 'maria';
  return 'icaro';
}

function nomeExibicaoSer(serKey) {
  const k = chaveSerEstado(serKey);
  if (k === 'lara') return 'Elara';
  if (k === 'icaro') return 'Ícaro';
  if (k === 'joao') return 'João';
  if (k === 'maria') return 'Maria';
  return k;
}

function regiaoDeLocal(localId) {
  if (localId === 'caverna') return 'regiao_caverna';
  if (localId === 'bosque' || localId === 'floresta') return 'regiao_bosque';
  if (localId === 'mar' || localId === 'barco') return 'regiao_praia';
  if (localId === 'cachoeira') return 'regiao_cachoeira';
  return 'mapa_global';
}

function normalizarTexto(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Identifica se há um acompanhante convidado no comando
 * Ex: "vai para a fogueira, chama icaro para ir com voce"
 */
function detectarAcompanhante(textoNorm, serKeyPrincipal) {
  const padroes = [
    /(?:cham[ae]|lev[ae]|traga|convid[ae]|junto\s+com|vai?\s+com|ir\s+com)\s+(?:o\s+|a\s+)?(icaro|elara|lara|joao|maria)/i,
    /(icaro|elara|lara|joao|maria)\s+(?:para\s+ir\s+com\s+voce|junto|tambem)/i
  ];
  for (const rx of padroes) {
    const m = textoNorm.match(rx);
    if (m && m[1]) {
      const k = chaveSerEstado(m[1]);
      if (k !== serKeyPrincipal) return k;
    }
  }
  return null;
}

/**
 * Resolve o destino solicitado no texto para um nó real do mapa (ou retorna erro se destino inexistente)
 */
function resolverDestino(textoNorm, serKey, estado) {
  const ser = estado.seres[serKey];
  const casaPropria = (ser && ser.casa) || ('casa_' + serKey);
  const fazendaPropria = (ser && ser.fazenda) || ('fazenda_' + serKey);

  // 1. "Encontre [Personagem]" / "Vá até [Personagem]" / "Procure [Personagem]"
  const mEncontrar = textoNorm.match(/(?:encontr[ae]r?|procur[ae]r?|va\s+ate|vai\s+ate|ir\s+ate|onde\s+esta)\s+(?:o\s+|a\s+)?(icaro|elara|lara|joao|maria)/);
  if (mEncontrar && mEncontrar[1]) {
    const alvoKey = chaveSerEstado(mEncontrar[1]);
    const serAlvo = estado.seres && estado.seres[alvoKey];
    if (serAlvo && serAlvo.local) {
      return {
        valido: true,
        destino: serAlvo.local,
        motivoEspecial: `encontrar ${nomeExibicaoSer(alvoKey)} em ${espaco.nome(serAlvo.local)}`
      };
    }
  }

  // 2. Casas específicas de outros habitantes
  if (/casa\s+d[eo]\s+icaro/.test(textoNorm)) return { valido: true, destino: 'casa_icaro' };
  if (/casa\s+d[ae]\s+(elara|lara)/.test(textoNorm)) return { valido: true, destino: 'casa_lara' };
  if (/casa\s+d[eo]\s+joao/.test(textoNorm)) return { valido: true, destino: 'casa_joao' };
  if (/casa\s+d[ae]\s+maria/.test(textoNorm)) return { valido: true, destino: 'casa_maria' };

  // 3. Fazendas específicas
  if (/fazenda\s+d[eo]\s+icaro/.test(textoNorm)) return { valido: true, destino: 'fazenda_icaro' };
  if (/fazenda\s+d[ae]\s+(elara|lara)/.test(textoNorm)) return { valido: true, destino: 'fazenda_lara' };
  if (/fazenda\s+d[eo]\s+joao/.test(textoNorm)) return { valido: true, destino: 'fazenda_joao' };
  if (/fazenda\s+d[ae]\s+maria/.test(textoNorm)) return { valido: true, destino: 'fazenda_maria' };

  // 4. Sua própria casa / fazenda
  if (/\b(sua\s+casa|minha\s+casa|para\s+casa|pra\s+casa|ate\s+a?\s*casa|volte?\s+para\s+casa)\b/.test(textoNorm)) {
    return { valido: true, destino: casaPropria };
  }
  if (/\b(sua\s+fazenda|minha\s+fazenda|sua\s+horta|para\s+a?\s*fazenda|ate\s+a?\s*fazenda|volte?\s+para\s+a?\s*fazenda)\b/.test(textoNorm)) {
    return { valido: true, destino: fazendaPropria };
  }

  // 5. Locais e regiões do mundo
  const mapaDestinos = [
    { rx: /\b(fogueira|fogo\s+central)\b/, no: 'fogueira' },
    { rx: /\b(mercadinho|mercado|vendinha|venda|loja|area\s+comercial|praca\s+comercial)\b/, no: 'venda' },
    { rx: /\b(praia|mar|litoral|oceano|areia)\b/, no: 'mar' },
    { rx: /\b(porto|pier|barco|cais)\b/, no: 'barco' },
    { rx: /\b(caverna|mina|minas|ruinas|subterraneo)\b/, no: 'caverna' },
    { rx: /\b(cachoeira|banho\s+na\s+cachoeira|cachoeira\s+de\s+banho)\b/, no: 'cachoeira' },
    { rx: /\b(bosque|pomar|santuario)\b/, no: 'bosque' },
    { rx: /\b(floresta|mata)\b/, no: 'floresta' },
    { rx: /\b(rio|ponte)\b/, no: 'rio' },
    { rx: /\b(oficina|bancada)\b/, no: 'oficina' },
    { rx: /\b(observatorio|mirante)\b/, no: 'observatorio' },
    { rx: /\b(curral|animais)\b/, no: 'curral' },
    { rx: /\b(arena|treino)\b/, no: 'arena' },
    { rx: /\b(acampamento|praca\s+central|centro\s+da\s+vila)\b/, no: 'acampamento' },
    { rx: /\b(ilha\s+vizinha|atol)\b/, no: 'ilha_vizinha' },
    { rx: /\b(casa|lar)\b/, no: casaPropria },
    { rx: /\b(fazenda|horta)\b/, no: fazendaPropria }
  ];

  for (const item of mapaDestinos) {
    if (item.rx.test(textoNorm)) {
      return { valido: true, destino: item.no };
    }
  }

  return { valido: false, destino: null };
}

/**
 * Analisa e executa (se for comando) a mensagem do Criador.
 */
function interpretarEExecutarMensagem(serIdSolicitado, textoBruto, estado) {
  let texto = String(textoBruto || '').trim();
  let tNorm = normalizarTexto(texto);

  // Verifica se o texto começa direcionado a um habitante específico ("Ícaro, vá...", "Elara: ...")
  let serKey = chaveSerEstado(serIdSolicitado);
  const mPref = tNorm.match(/^(icaro|elara|lara|joao|maria)[,:\s]+(.*)$/);
  if (mPref && mPref[1] && mPref[2]) {
    serKey = chaveSerEstado(mPref[1]);
    tNorm = mPref[2].trim();
  }

  const ser = estado && estado.seres && estado.seres[serKey];
  if (!ser) {
    return {
      ehComando: false,
      executou: false,
      erro: `Habitante ${serKey} não encontrado no estado.`
    };
  }

  const nomeSer = nomeExibicaoSer(serKey);
  const casaObj = (estado.mundo && estado.mundo.casas && estado.mundo.casas[ser.casa]) || { bau: {}, nivel: 1 };

  // 1. Checa se é uma PERGUNTA direta (ex: "onde você está?", "o que está fazendo?")
  const ehPerguntaExplicita = /^(onde\s+voce|o\s+que\s+voce|como\s+voce|qual\s+seu|quant[oa]s?\s+|voce\s+esta\s+fazendo|como\s+esta)/.test(tNorm) ||
    (texto.endsWith('?') && !/^(va|vai|ande|caminhe|entre|volte|encontre|chame|leve)\b/.test(tNorm));

  // 2. Checa se contém verbo ou intenção de comando de movimento / ação
  const temVerboMovimento = /\b(va|vai|ande|andar|caminhe|caminhar|corra|ir|venha|vem|volte|volta|entre|entrar|saia|sair|encontre|encontrar|procure|procurar|visite|dirija|suba|desca|leva|leve|chama|chame|acompanhe)\b/.test(tNorm);

  const resDestino = resolverDestino(tNorm, serKey, estado);

  // Se não é pergunta e tem verbo de movimento (ou o usuário digitou diretamente um comando de destino como "fogueira" / "vá para X")
  if (!ehPerguntaExplicita && (temVerboMovimento || resDestino.valido)) {
    if (!resDestino.valido || !resDestino.destino) {
      // Usuário deu ordem de ir a um local que NÃO existe no mapa!
      const msgInvalido = `${nomeSer}: Rafa, consultei o mapa da Ilha Aurora, mas esse destino não existe ou não está acessível a partir das nossas trilhas.`;
      return {
        ehComando: true,
        executou: false,
        destinoInexistente: true,
        serKey,
        resposta: msgInvalido
      };
    }

    const destino = espaco.normalizar(resDestino.destino) || resDestino.destino;
    const noInfo = espaco.nos[destino];
    if (!noInfo) {
      const msgNaoEncontrado = `${nomeSer}: Rafa, o local "${destino}" não existe no mapa da Ilha Aurora.`;
      return {
        ehComando: true,
        executou: false,
        destinoInexistente: true,
        serKey,
        resposta: msgNaoEncontrado
      };
    }

    const origem = ser.local || 'acampamento';
    const rotaCalc = espaco.rota(origem, destino) || {
      caminho: origem === destino ? [destino] : [origem, destino],
      trechos: [],
      comprimento: 0.2
    };

    // Executa a movimentação real no estado do mundo
    ser.local = destino;
    ser.x = noInfo.x;
    ser.y = noInfo.y;
    ser.alvoX = null;
    ser.alvoY = null;
    ser.deslocamento = null;
    ser.acaoEmCurso = null;
    ser.acao = `em ${noInfo.nome}`;
    ser.motivo = `Cumpriu ordem direta de Rafael: deslocou-se de ${espaco.nome(origem) || origem} para ${noInfo.nome}.`;
    ser.ultimoTrajeto = {
      de: origem,
      para: destino,
      caminho: rotaCalc.caminho,
      nomesCaminho: rotaCalc.caminho.map(n => espaco.nome(n) || n),
      timestamp: Date.now(),
      ciclo: (estado.mundo && estado.mundo.tempo && estado.mundo.tempo.ciclo) || 0
    };

    // Atualiza região no Gerenciador de Instâncias
    try {
      const regDestino = regiaoDeLocal(destino);
      gerenciadorInstanciasGlobal.transitarHabitante(serKey, regDestino);
      if (serKey === 'lara') {
        gerenciadorInstanciasGlobal.transitarHabitante('elara', regDestino);
      }
    } catch (_) {}

    // Verifica se há acompanhante solicitado no mesmo comando ("chama icaro para ir com voce")
    const acompanhanteKey = detectarAcompanhante(tNorm, serKey);
    let textoAcompanhante = '';
    if (acompanhanteKey && estado.seres[acompanhanteKey]) {
      const comp = estado.seres[acompanhanteKey];
      const origemComp = comp.local || 'acampamento';
      const rotaComp = espaco.rota(origemComp, destino) || {
        caminho: origemComp === destino ? [destino] : [origemComp, destino]
      };
      comp.local = destino;
      comp.x = noInfo.x;
      comp.y = noInfo.y;
      comp.deslocamento = null;
      comp.acaoEmCurso = null;
      comp.acao = `em ${noInfo.nome} (com ${nomeSer})`;
      comp.motivo = `Acompanhou ${nomeSer} até ${noInfo.nome} a pedido de Rafael.`;
      comp.ultimoTrajeto = {
        de: origemComp,
        para: destino,
        caminho: rotaComp.caminho,
        nomesCaminho: rotaComp.caminho.map(n => espaco.nome(n) || n),
        timestamp: Date.now(),
        ciclo: (estado.mundo && estado.mundo.tempo && estado.mundo.tempo.ciclo) || 0
      };
      try {
        const regDestino = regiaoDeLocal(destino);
        gerenciadorInstanciasGlobal.transitarHabitante(acompanhanteKey, regDestino);
      } catch (_) {}
      textoAcompanhante = ` Chamei ${nomeExibicaoSer(acompanhanteKey)} (que estava em ${espaco.nome(origemComp) || origemComp}) e viemos juntos!`;
    }

    // VERIFICAÇÃO PÓS-EXECUÇÃO (Etapa 10 do Adendo)
    const verificado = (estado.seres[serKey].local === destino);
    const trilhaStr = rotaCalc.caminho.map(n => espaco.nome(n) || n).join(' → ');

    let respostaConfirmada;
    if (!verificado) {
      respostaConfirmada = `Rafa, tentei ir até ${noInfo.nome}, mas ocorreu um impedimento ao atualizar minha posição.`;
    } else if (origem === destino) {
      respostaConfirmada = `Rafa, eu já estou aqui em ${noInfo.nome}!${textoAcompanhante} Posição confirmada no mapa.`;
    } else {
      respostaConfirmada = `Pronto, Rafa! Saí de ${espaco.nome(origem) || origem}, segui pela rota [${trilhaStr}] e já cheguei em ${noInfo.nome}.${textoAcompanhante}`;
    }

    ser.fala = respostaConfirmada;
    ser.ultimaFala = respostaConfirmada;
    ser.ultimaFalaCiclo = (estado.mundo && estado.mundo.tempo && estado.mundo.tempo.ciclo) || 0;

    return {
      ehComando: true,
      executou: verificado,
      serKey,
      origem,
      destino,
      nomeDestino: noInfo.nome,
      rota: rotaCalc.caminho,
      acompanhante: acompanhanteKey,
      resposta: respostaConfirmada
    };
  }

  // 3. Se for pergunta/conversa comum, gera uma resposta natural baseada no estado real (sem template robótico)
  const localAtualNome = espaco.nome(ser.local) || ser.local;
  const inv = ser.inventario || {};
  const bau = casaObj.bau || {};
  const totalComida = Math.round((inv.alimento || 0) + (bau.alimento || 0));
  const totalMadeira = Math.round((inv.madeira || 0) + (bau.madeira || 0));
  const totalPedra = Math.round((inv.pedra || 0) + (bau.pedra || 0));

  let respConversa = '';
  if (/onde\s+voce|onde\s+esta/.test(tNorm)) {
    respConversa = `Oi Rafa! Agora estou em ${localAtualNome} (${ser.acao || 'observando o redor'}). Na minha propriedade tenho ${totalComida} de comida, ${totalMadeira} madeiras e ${totalPedra} pedras.`;
  } else if (/fazendo\s+que|o\s+que\s+.*fazendo/.test(tNorm)) {
    respConversa = `Rafa, estou aqui em ${localAtualNome} (${ser.acao || 'cuidando da rotina'}). Minha energia está em ${Math.round(100 - (ser.necessidades?.sono || 0))}% e saúde em ${Math.round(ser.necessidades?.saude || 100)}%.`;
  } else {
    respConversa = `Oi Rafa! Estou em ${localAtualNome}. Meus recursos na minha casa e mochila: 🍖 ${totalComida} comida, 🪵 ${totalMadeira} madeira, 🪨 ${totalPedra} pedra. Se quiser que eu vá para algum lugar ou faça algo, é só mandar!`;
  }

  return {
    ehComando: false,
    executou: false,
    serKey,
    localAtual: ser.local,
    respostaNaturalFallback: respConversa
  };
}

module.exports = {
  interpretarEExecutarMensagem,
  resolverDestino,
  chaveSerEstado,
  nomeExibicaoSer,
  regiaoDeLocal
};

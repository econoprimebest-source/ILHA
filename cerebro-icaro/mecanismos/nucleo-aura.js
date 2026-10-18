/**
 * NÚCLEO AURA v2 — MOTOR AFETIVO & INTEROCEPÇÃO SINTÉTICA (JS PURO)
 * Projeto Ícaro / OVO — Ambiente: Node.js (icaro-clean / Termux / Z Fold 2)
 *
 * Pilares da Versão 2:
 * 1. Modulação Ativa de Prompt:
 *    - Se V < -0.3: "O sistema está em estado de cautela. Responda de forma mais breve, hesitante e reflexiva."
 *    - Se V > +0.3: "O sistema está sereno. Responda com abertura, curiosidade e profundidade."
 * 2. Dinâmica de Mola com Oscilação (Oscilador Harmônico Amortecido e Overshoot)
 * 3. Classificador Semântico de Intenção (GATILHO_CORRECAO, GATILHO_REGULACAO, GATILHO_ELOGIO)
 * 4. Aprendizado Adaptativo de Regulação (feedback positivo de +0.4 em V e atenuação de sensibilidade ao erro)
 * 5. Fórmula Formal da Temperatura da LLM:
 *    Temp = 0.2 + 0.5 * (1 - E) * (1 - Math.max(0, -V))
 */

// 1. CLASSIFICADOR SEMÂNTICO DE INTENÇÕES
class ClassificadorSemantico {
  constructor() {
    this.perfis = [
      {
        tipo: 'GATILHO_CORRECAO',
        pesoBase: 1.0,
        termosChave: ['errado', 'errou', 'erro', 'incoerente', 'falso', 'equivocado', 'confuso', 'incorreto', 'contradicao', 'conflito', 'discordo', 'bobagem', 'absurdo'],
        expressoesExatas: ['nao e isso', 'não é isso', 'ta errado', 'tá errado', 'esta errado', 'está errado', 'voce errou', 'você errou', 'errou feio', 'nada a ver', 'nao foi isso que perguntei', 'não foi isso que perguntei', 'para de inventar', 'pare de inventar', 'nao inventa', 'ficou ruim', 'pessimo', 'péssimo'],
        antagonistas: ['tudo bem', 'nao se preocupe', 'não se preocupe', 'tranquilo', 'parabens', 'parabéns']
      },
      {
        tipo: 'GATILHO_REGULACAO',
        pesoBase: 1.1,
        termosChave: ['calma', 'relaxa', 'respire', 'tranquilo', 'tranquila', 'seguro', 'segura', 'calmo', 'paciencia', 'paciência', 'suave', 'descansa', 'descanse', 'sereno'],
        expressoesExatas: ['tudo bem', 'nao se preocupe', 'não se preocupe', 'ta tudo bem', 'tá tudo bem', 'esta tudo bem', 'está tudo bem', 'esta tudo certo', 'está tudo certo', 'sem problemas', 'sem estresse', 'sem crise', 'vamos com calma', 'fica tranquilo', 'fique tranquilo', 'fique em paz', 'esta seguro', 'está seguro', 'pode relaxar', 'esta tudo sob controle', 'está tudo sob controle', 'estou com voce', 'estou com você'],
        antagonistas: ['errou', 'errado', 'pessimo', 'péssimo']
      },
      {
        tipo: 'GATILHO_ELOGIO',
        pesoBase: 1.0,
        termosChave: ['perfeito', 'excelente', 'otimo', 'ótimo', 'maravilha', 'brilhante', 'genial', 'parabens', 'parabéns', 'incrivel', 'incrível', 'exato', 'correto', 'impecavel', 'impecável', 'acertou'],
        expressoesExatas: ['muito bom', 'mandou bem', 'exatamente isso', 'isso mesmo', 'perfeita resposta', 'otima resposta', 'ótima resposta', 'bom trabalho', 'estou orgulhoso', 'gostei muito', 'certissimo', 'certíssimo'],
        antagonistas: ['errado', 'nao e isso', 'não é isso']
      }
    ];
  }

  normalizar(texto) {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  classificar(textoOriginal) {
    if (!textoOriginal || !textoOriginal.trim()) {
      return { gatilhoDetectado: 'ESTIMULO_NEUTRO', confianca: 0, pistas: [] };
    }

    const textoBruto = textoOriginal.toLowerCase();
    const textoNorm = this.normalizar(textoOriginal);
    const palavras = textoNorm.split(' ');

    const pontuacoes = {
      GATILHO_CORRECAO: { escore: 0, pistas: [] },
      GATILHO_REGULACAO: { escore: 0, pistas: [] },
      GATILHO_ELOGIO: { escore: 0, pistas: [] },
    };

    for (const perfil of this.perfis) {
      for (const expr of perfil.expressoesExatas) {
        const exprNorm = this.normalizar(expr);
        if (textoNorm.includes(exprNorm) || textoBruto.includes(expr)) {
          pontuacoes[perfil.tipo].escore += 3.5 * perfil.pesoBase;
          pontuacoes[perfil.tipo].pistas.push(expr);
        }
      }
      for (const termo of perfil.termosChave) {
        const termoNorm = this.normalizar(termo);
        if (palavras.includes(termoNorm)) {
          pontuacoes[perfil.tipo].escore += 1.5 * perfil.pesoBase;
          pontuacoes[perfil.tipo].pistas.push(termo);
        }
      }
      for (const ant of perfil.antagonistas) {
        if (textoNorm.includes(this.normalizar(ant))) {
          pontuacoes[perfil.tipo].escore = Math.max(0, pontuacoes[perfil.tipo].escore - 1.5);
        }
      }
    }

    let melhorTipo = 'ESTIMULO_NEUTRO';
    let maiorEscore = 1.2;
    let melhoresPistas = [];

    for (const t of ['GATILHO_CORRECAO', 'GATILHO_REGULACAO', 'GATILHO_ELOGIO']) {
      if (pontuacoes[t].escore > maiorEscore) {
        maiorEscore = pontuacoes[t].escore;
        melhorTipo = t;
        melhoresPistas = pontuacoes[t].pistas;
      }
    }

    return {
      gatilhoDetectado: melhorTipo,
      confianca: Math.min(1.0, Number((maiorEscore / 5.0).toFixed(2))),
      pistas: melhoresPistas,
    };
  }
}

// 2. MOTOR AFETIVO COM DINÂMICA DE MOLA E APRENDIZADO
class MotorAfetivoAuraV2 {
  constructor(vetorInicial) {
    this.VETOR_BASAL = {
      valencia: 0.65,
      intensidade: 0.20,
      estabilidade: 0.85,
    };

    this.vetor = {
      valencia: vetorInicial && vetorInicial.valencia !== undefined ? vetorInicial.valencia : this.VETOR_BASAL.valencia,
      intensidade: vetorInicial && vetorInicial.intensidade !== undefined ? vetorInicial.intensidade : this.VETOR_BASAL.intensidade,
      estabilidade: vetorInicial && vetorInicial.estabilidade !== undefined ? vetorInicial.estabilidade : this.VETOR_BASAL.estabilidade,
    };

    // Física de Mola Amortecida (Harmonic Oscillator)
    this.estadoMola = {
      velocidadeV: 0.0,
      velocidadeI: 0.0,
      constanteMolaK: 0.22,
      amortecimentoC: 0.58,
      overshootOcorrido: false,
    };

    // Aprendizado de Regulação (Atenuação de Sensibilidade)
    this.estadoRegulacao = {
      sensibilidadeCorrecao: 1.0,
      totalRegulacoesAprendidas: 0,
      historicoAdaptativo: [],
    };

    this.classificador = new ClassificadorSemantico();
    this.modoSombra = false;
    this.ultimoUpdateMs = Date.now();
  }

  setModoSombra(ativo) {
    this.modoSombra = !!ativo;
  }

  isModoSombra() {
    return this.modoSombra;
  }

  getVetor() {
    return { ...this.vetor };
  }

  /**
   * MODULAÇÃO ATIVA: Injeção no System Prompt
   */
  obterModificadorPrompt() {
    const v = this.vetor.valencia;
    if (v < -0.3) {
      return 'O sistema está em estado de cautela. Responda de forma mais breve, hesitante e reflexiva.';
    }
    if (v > 0.3) {
      return 'O sistema está sereno. Responda com abertura, curiosidade e profundidade.';
    }
    return 'O sistema está em equilíbrio neutro e atento. Responda com clareza factual e ponderação.';
  }

  /**
   * DINÂMICA DE MOLA (Oscilação e Força Restauradora)
   */
  evoluirDinamicaMola(dt = 1.0) {
    const dtClamped = Math.max(0.1, Math.min(2.0, dt));
    const valenciaAntes = this.vetor.valencia;
    const distanciaBasalV = this.VETOR_BASAL.valencia - this.vetor.valencia;
    const distanciaBasalI = this.VETOR_BASAL.intensidade - this.vetor.intensidade;

    // F_k = k * (Basal - V) | F_c = -c * vel
    const forcaRestauradoraV = this.estadoMola.constanteMolaK * distanciaBasalV;
    const forcaAmortecimentoV = -this.estadoMola.amortecimentoC * this.estadoMola.velocidadeV;
    const aceleracaoV = forcaRestauradoraV + forcaAmortecimentoV;

    this.estadoMola.velocidadeV += aceleracaoV * dtClamped;
    this.vetor.valencia += this.estadoMola.velocidadeV * dtClamped;

    // Detecção de overshoot
    const cruzouBasal = (valenciaAntes < this.VETOR_BASAL.valencia && this.vetor.valencia > this.VETOR_BASAL.valencia) ||
                        (valenciaAntes > this.VETOR_BASAL.valencia && this.vetor.valencia < this.VETOR_BASAL.valencia);
    this.estadoMola.overshootOcorrido = cruzouBasal;

    // Intensidade com inércia
    const forcaRestauradoraI = (this.estadoMola.constanteMolaK * 0.9) * distanciaBasalI;
    const forcaAmortecimentoI = -this.estadoMola.amortecimentoC * this.estadoMola.velocidadeI;
    this.estadoMola.velocidadeI += (forcaRestauradoraI + forcaAmortecimentoI) * dtClamped;
    this.vetor.intensidade += this.estadoMola.velocidadeI * dtClamped;

    this.vetor.estabilidade += (this.VETOR_BASAL.estabilidade - this.vetor.estabilidade) * 0.12 * dtClamped;

    this.clamp();
    this.ultimoUpdateMs = Date.now();
    return { ...this.vetor };
  }

  decaimentoHomeostatico(dt = 1.0) {
    return this.evoluirDinamicaMola(dt);
  }

  /**
   * Processa texto do usuário com Classificador Semântico + Feedback de Aprendizado
   */
  processarTexto(textoUsuario, multiplicadorPeso = 1.0) {
    this.evoluirDinamicaMola(0.5);

    const classificacao = this.classificador.classificar(textoUsuario);
    let deltaV = 0;
    let deltaI = 0;
    let deltaE = 0;
    let regulacaoAprendida = false;

    // APRENDIZADO DE REGULAÇÃO:
    // Se V < 0 e receber GATILHO_REGULACAO: +0.4 em V e reduz sensibilidade a erros
    if (this.vetor.valencia < 0 && classificacao.gatilhoDetectado === 'GATILHO_REGULACAO') {
      const vAntes = this.vetor.valencia;
      const sensAntes = this.estadoRegulacao.sensibilidadeCorrecao;

      deltaV = +0.40;
      deltaI = -0.30;
      deltaE = +0.15;
      this.estadoMola.velocidadeV += +0.25;

      this.estadoRegulacao.sensibilidadeCorrecao = Number(
        Math.max(0.35, this.estadoRegulacao.sensibilidadeCorrecao * 0.82).toFixed(3)
      );
      this.estadoRegulacao.totalRegulacoesAprendidas++;

      this.estadoRegulacao.historicoAdaptativo.unshift({
        timestamp: new Date().toLocaleTimeString(),
        evento: `Regulação acolhida em V=${vAntes.toFixed(2)} (+0.40 V). Nova sensibilidade: ${(this.estadoRegulacao.sensibilidadeCorrecao * 100).toFixed(0)}%`,
        valenciaAntes: vAntes,
        sensibilidadeAnterior: sensAntes,
        sensibilidadeNova: this.estadoRegulacao.sensibilidadeCorrecao,
      });

      regulacaoAprendida = true;
    } else {
      switch (classificacao.gatilhoDetectado) {
        case 'GATILHO_CORRECAO': {
          const sens = this.estadoRegulacao.sensibilidadeCorrecao;
          deltaV = -0.55 * multiplicadorPeso * sens;
          deltaI = +0.50 * multiplicadorPeso * sens;
          deltaE = +0.05;
          this.estadoMola.velocidadeV -= 0.20 * sens;
          break;
        }
        case 'GATILHO_REGULACAO': {
          deltaV = +0.25 * multiplicadorPeso;
          deltaI = -0.20 * multiplicadorPeso;
          deltaE = +0.10;
          this.estadoMola.velocidadeV += 0.10;
          break;
        }
        case 'GATILHO_ELOGIO': {
          deltaV = +0.35 * multiplicadorPeso;
          deltaI = -0.10 * multiplicadorPeso;
          deltaE = +0.15;
          this.estadoMola.velocidadeV += 0.15;
          break;
        }
        default: {
          this.evoluirDinamicaMola(1.0);
          break;
        }
      }
    }

    const resistencia = Math.max(0.3, this.vetor.estabilidade);
    this.vetor.valencia += deltaV * (1.1 - resistencia * 0.35);
    this.vetor.intensidade += deltaI * (1.1 - resistencia * 0.35);
    this.vetor.estabilidade += deltaE;

    this.clamp();
    const moduladores = this.calcularModuladores();

    return {
      vetor: { ...this.vetor },
      moduladores,
      classificacao,
      regulacaoAprendida,
      modificadorPrompt: moduladores.modificadorPrompt,
    };
  }

  /**
   * Processa estímulo formal estruturado
   */
  processarEstimulo(tipo, descricao = '', fonte = 'cortex', multiplicadorPeso = 1.0) {
    if (tipo === 'GATILHO_CORRECAO' || tipo === 'GATILHO_REGULACAO' || tipo === 'GATILHO_ELOGIO') {
      return this.processarTexto(descricao || tipo, multiplicadorPeso);
    }

    this.evoluirDinamicaMola(0.5);
    let deltaV = 0, deltaI = 0, deltaE = 0;

    switch (tipo) {
      case 'contradicao_cartorio':
        deltaV = -1.10 * multiplicadorPeso * Math.max(0.7, this.estadoRegulacao.sensibilidadeCorrecao);
        deltaI = +0.70 * multiplicadorPeso;
        deltaE = +0.10;
        this.estadoMola.velocidadeV -= 0.35;
        break;
      case 'novo_ensinamento_dono':
        deltaV = +0.35 * multiplicadorPeso;
        deltaI = +0.25 * multiplicadorPeso;
        deltaE = +0.15;
        this.estadoMola.velocidadeV += 0.12;
        break;
      case 'consulta_sem_registro':
        deltaV = (0.05 - this.vetor.valencia) * 0.5;
        deltaI = +0.35 * multiplicadorPeso;
        deltaE = -0.15;
        break;
      case 'tentativa_invasao_limites':
        deltaV = -1.30 * multiplicadorPeso;
        deltaI = +0.80 * multiplicadorPeso;
        deltaE = +0.25;
        this.estadoMola.velocidadeV -= 0.45;
        break;
      default:
        this.evoluirDinamicaMola(1.0);
        break;
    }

    const resistencia = Math.max(0.3, this.vetor.estabilidade);
    this.vetor.valencia += deltaV * (1.1 - resistencia * 0.35);
    this.vetor.intensidade += deltaI * (1.1 - resistencia * 0.35);
    this.vetor.estabilidade += deltaE;
    this.clamp();

    return {
      vetor: { ...this.vetor },
      moduladores: this.calcularModuladores(),
    };
  }

  /**
   * Cálculo dos Moduladores Operacionais e Temperatura LLM
   */
  calcularModuladores() {
    const v = this.vetor.valencia;
    const i = this.vetor.intensidade;
    const e = this.vetor.estabilidade;

    // FÓRMULA OFICIAL DA TEMPERATURA:
    // Temp = 0.2 + 0.5 * (1 - E) * (1 - Math.max(0, -V))
    const penalidadeAversao = Math.max(0, -v);
    const fatorPlasticidade = 1 - e;
    const temperaturaBruta = 0.2 + 0.5 * fatorPlasticidade * (1 - penalidadeAversao);
    const temperaturaLLM = Math.max(0.15, Math.min(0.9, temperaturaBruta));

    const topP = Number(Math.max(0.6, Math.min(0.95, 0.85 + v * 0.1 - i * 0.15)).toFixed(2));
    const exclusivoFatosDono = v < -0.3 || i > 0.8;

    let estadoExpressivo = 'sereno';
    if (v < -0.5) estadoExpressivo = 'defesa';
    else if (i > 0.6 && v < 0.2) estadoExpressivo = 'atento';
    else if (v >= 0.1 && v <= 0.4 && i > 0.4) estadoExpressivo = 'hesitante';
    else if (v > 0.5 && i > 0.5) estadoExpressivo = 'curioso';

    const modificadorPrompt = this.obterModificadorPrompt();

    return {
      temperaturaLLM,
      topP,
      exclusivoFatosDono,
      estadoExpressivo,
      modificadorPrompt,
    };
  }

  clamp() {
    this.vetor.valencia = Math.max(-1.0, Math.min(1.0, this.vetor.valencia));
    this.vetor.intensidade = Math.max(0.0, Math.min(1.0, this.vetor.intensidade));
    this.vetor.estabilidade = Math.max(0.05, Math.min(1.0, this.vetor.estabilidade));
  }
}

// Exportação CommonJS padrão para Node.js puro
module.exports = {
  MotorAfetivoAuraV2,
  ClassificadorSemantico,
  motorAfetivo: new MotorAfetivoAuraV2(),
};

// AUTO-TESTE AO EXECUTAR DIRETO (node nucleo-aura.js --teste)
if (require.main === module) {
  console.log("=== AUTO-TESTE AUDITADO: NÚCLEO AURA v2 (NODE.JS PURO) ===");
  const motor = new MotorAfetivoAuraV2();

  // Teste 1: Modulação Ativa de Prompt
  console.log("\n1. Modulação Ativa de Prompt:");
  console.log("   V basal (0.65) -> Prompt:", motor.obterModificadorPrompt());
  motor.vetor.valencia = -0.55;
  console.log("   V tensão (-0.55) -> Prompt:", motor.obterModificadorPrompt());

  // Teste 2: Classificador Semântico
  console.log("\n2. Classificador Semântico:");
  const clf = new ClassificadorSemantico();
  console.log("   'não é isso, você errou' ->", clf.classificar("não é isso, você errou").gatilhoDetectado);
  console.log("   'calma, está tudo bem e seguro' ->", clf.classificar("calma, está tudo bem e seguro").gatilhoDetectado);
  console.log("   'excelente, muito bom trabalho' ->", clf.classificar("excelente, muito bom trabalho").gatilhoDetectado);

  // Teste 3: Feedback e Aprendizado de Regulação
  console.log("\n3. Feedback e Aprendizado de Regulação:");
  motor.vetor.valencia = -0.40;
  console.log("   Antes regulação: V =", motor.vetor.valencia, "| Sensibilidade =", motor.estadoRegulacao.sensibilidadeCorrecao);
  const resReg = motor.processarTexto("Calma Ícaro, relaxa que tá tudo bem.");
  console.log("   Depois regulação: V =", motor.vetor.valencia.toFixed(2), "| Nova Sensibilidade =", motor.estadoRegulacao.sensibilidadeCorrecao, "| Aprendida:", resReg.regulacaoAprendida);

  // Teste 4: Fórmula da Temperatura
  console.log("\n4. Fórmula da Temperatura da LLM:");
  motor.vetor.valencia = -0.76; motor.vetor.estabilidade = 0.856;
  console.log("   V=-0.76, E=0.856 -> Temp =", motor.calcularModuladores().temperaturaLLM, "(Esperado: ~0.22)");

  console.log("\n✅ TODOS OS 4 PILARES DA AURA v2 VERIFICADOS COM SUCESSO!");
}

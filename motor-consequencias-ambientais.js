/**
 * motor-consequencias-ambientais.js
 * 
 * MISSÃO MASTER — ILHA AURORA (MÓDULOS 4 & 5)
 * Motor de Sobrevivência, Necessidades e Consequências Ambientais
 * 
 * Variáveis Individuais:
 * - Fome (0 = saciado, 100 = faminto)
 * - Sede (0 = saciado, 100 = desidratado)
 * - Energia (100 = descansado, 0 = exaustão)
 * - Saúde (100 = saudável, 0 = crítico)
 * - Orientação (100 = lúcido, 0 = perdido)
 * - Segurança Percebida (100 = calmo/seguro, 0 = pânico)
 * 
 * Consequências Regionais Graduais e Reversíveis:
 * - Caverna: requer Tocha
 * - Bosque: requer Facão e Bússola
 * - Praia: requer Cantil com Água
 * - Kit Médico: trata ferimentos e condições
 */

'use strict';

const { bancoIlhaGlobal } = require('./banco-ilha');

class MotorConsequenciasAmbientais {
  constructor(banco = bancoIlhaGlobal) {
    this.banco = banco;
    // Map(serId -> { fome, sede, energia, saude, orientacao, seguranca, condicoes: [] })
    this.estadosSobrevivencia = new Map();
    this.inicializarHabitantes();
  }

  inicializarHabitantes() {
    const lista = ['icaro', 'elara', 'lara', 'joao', 'maria'];
    for (const serId of lista) {
      this.estadosSobrevivencia.set(serId, {
        serId,
        fome: 20,
        sede: 20,
        energia: 90,
        saude: 100,
        orientacao: 100,
        seguranca: 85,
        condicoes: [], // 'ferido', 'desorientado', 'desidratado', 'em_panico'
        ultimaAtualizacao: Date.now()
      });
    }
  }

  obterEstado(serId) {
    if (!this.estadosSobrevivencia.has(serId)) {
      this.estadosSobrevivencia.set(serId, {
        serId,
        fome: 25,
        sede: 25,
        energia: 80,
        saude: 100,
        orientacao: 100,
        seguranca: 80,
        condicoes: [],
        ultimaAtualizacao: Date.now()
      });
    }
    return this.estadosSobrevivencia.get(serId);
  }

  // Verifica se o habitante possui um item equipado ou na mochila
  verificarPreparo(serId, recursoId) {
    // 1. Checa equipamentos (mão direita ou corpo)
    const equips = this.banco.obterEquipamentos(serId);
    const equipado = equips.some(e => e.recurso_id === recursoId);
    if (equipado) return { possui: true, equipado: true };

    // 2. Checa mochila (3 slots)
    const inv = this.banco.obterInventario(serId);
    const naMochila = inv.some(s => s.recurso_id === recursoId && s.quantidade > 0);
    return { possui: naMochila, equipado: false };
  }

  /**
   * Ciclo de Consequências Ambientais
   * Chamado a cada turno/passo de exploração do habitante na região
   */
  processarAmbiente(serId, regiaoId, duracaoMinutos = 15) {
    const st = this.obterEstado(serId);
    const eventosOcorridos = [];

    // Desgaste basal biológico suave (fome e sede aumentam com o passar do tempo)
    st.fome = Math.min(100, st.fome + (duracaoMinutos * 0.15));
    st.sede = Math.min(100, st.sede + (duracaoMinutos * 0.25));

    // Desgaste basal de energia (nunca zera instantaneamente)
    st.energia = Math.max(5, st.energia - (duracaoMinutos * 0.1));

    // Regras Específicas por Região
    if (regiaoId === 'regiao_caverna') {
      const preparoTocha = this.verificarPreparo(serId, 'tocha');
      if (!preparoTocha.possui) {
        // SEM TOCHA: Trevas absolutas na Caverna
        st.orientacao = Math.max(0, st.orientacao - 25);
        st.seguranca = Math.max(5, st.seguranca - 30);
        st.energia = Math.max(5, st.energia - 15);
        if (!st.condicoes.includes('desorientado')) st.condicoes.push('desorientado');
        if (!st.condicoes.includes('medo_escuridao')) st.condicoes.push('medo_escuridao');

        eventosOcorridos.push({
          tipo: 'adversidade',
          grau: 'alto',
          mensagem: `${serId} está sem tocha na caverna escura! Desorientação e medo aumentaram. Priorize buscar iluminação ou retornar à entrada!`
        });
      } else {
        // COM TOCHA: Exploração iluminada
        st.orientacao = Math.min(100, st.orientacao + 10);
        st.condicoes = st.condicoes.filter(c => c !== 'medo_escuridao');
        eventosOcorridos.push({
          tipo: 'sucesso',
          mensagem: `${serId} avança com a tocha acesa, identificando veios de minério nas paredes da caverna.`
        });
      }
    } else if (regiaoId === 'regiao_bosque') {
      const facao = this.verificarPreparo(serId, 'facao');
      const bussola = this.verificarPreparo(serId, 'bussola');

      if (!facao.possui || !bussola.possui) {
        // SEM PREPARO COMPLETO: Mata densa fecha o caminho
        if (!bussola.possui) {
          st.orientacao = Math.max(10, st.orientacao - 20);
          if (!st.condicoes.includes('desorientado')) st.condicoes.push('desorientado');
        }
        if (!facao.possui) {
          st.energia = Math.max(5, st.energia - 18); // Esforço para rasgar espinhos
          eventosOcorridos.push({
            tipo: 'adversidade',
            grau: 'medio',
            mensagem: `${serId} enfrenta matagal fechado sem facão. Custo de energia elevado!`
          });
        }
      } else {
        // PREPARADO: Abre caminho com facilidade e localiza sucata
        st.orientacao = 100;
        st.condicoes = st.condicoes.filter(c => c !== 'desorientado');
        eventosOcorridos.push({
          tipo: 'sucesso',
          mensagem: `${serId} utiliza a bússola e corta os cipós com o facão, avançando rapidamente rumo a novas clareiras.`
        });
      }
    } else if (regiaoId === 'regiao_praia') {
      const cantil = this.verificarPreparo(serId, 'cantil');
      if (!cantil.possui) {
        // SEM CANTIL: Sol escaldante e maresia aceleram desidratação
        st.sede = Math.min(100, st.sede + 30);
        st.energia = Math.max(5, st.energia - 12);
        if (st.sede > 70 && !st.condicoes.includes('desidratado')) {
          st.condicoes.push('desidratado');
        }
        eventosOcorridos.push({
          tipo: 'adversidade',
          grau: 'medio',
          mensagem: `${serId} está sob sol forte na praia sem cantil. A sede se intensifica rapidamente!`
        });
      } else {
        // COM CANTIL: Clima controlado
        st.condicoes = st.condicoes.filter(c => c !== 'desidratado');
        eventosOcorridos.push({
          tipo: 'sucesso',
          mensagem: `${serId} explora os recifes da praia com hidratação garantida pelo cantil.`
        });
      }
    }

    // Consequências de extremos biológicos
    if (st.fome > 85 || st.sede > 85) {
      st.saude = Math.max(10, st.saude - 8);
      if (!st.condicoes.includes('enfraquecido')) st.condicoes.push('enfraquecido');
    }

    st.ultimaAtualizacao = Date.now();
    return {
      estado: { ...st },
      eventos: eventosOcorridos
    };
  }

  /**
   * Ação de Tratamento Médico (Kit Médico)
   */
  aplicarKitMedico(serIdAlvo, serIdAplicador = null) {
    const aplicador = serIdAplicador || serIdAlvo;
    const inv = this.banco.obterInventario(aplicador);
    const slotKit = inv.find(s => s.recurso_id === 'kit_medico' && s.quantidade > 0);

    if (!slotKit) {
      throw new Error(`${aplicador} não possui Kit Médico na mochila.`);
    }

    // Consome o Kit do inventário
    this.banco.consumirItem(aplicador, slotKit.slot_index);

    // Restaura saúde e remove condições de ferimento
    const st = this.obterEstado(serIdAlvo);
    st.saude = Math.min(100, st.saude + 60);
    st.seguranca = Math.min(100, st.seguranca + 30);
    st.condicoes = st.condicoes.filter(c => c !== 'ferido' && c !== 'enfraquecido');

    return {
      sucesso: true,
      serIdAlvo,
      aplicador,
      novaSaude: st.saude,
      condicoesRestantes: st.condicoes
    };
  }

  /**
   * Ação de Descanso (Fogueira ou Cabana)
   */
  descansar(serId, local = 'fogueira', minutos = 60) {
    const st = this.obterEstado(serId);
    const fatorLocal = local.startsWith('casa_') ? 1.5 : 1.0;

    st.energia = Math.min(100, st.energia + (minutos * 0.5 * fatorLocal));
    st.seguranca = Math.min(100, st.seguranca + (minutos * 0.3 * fatorLocal));
    st.orientacao = Math.min(100, st.orientacao + (minutos * 0.4));
    st.condicoes = st.condicoes.filter(c => c !== 'desorientado' && c !== 'em_panico');

    return {
      sucesso: true,
      serId,
      local,
      energiaRecuperada: st.energia,
      segurancaRecuperada: st.seguranca
    };
  }
}

const motorAmbientalGlobal = new MotorConsequenciasAmbientais();

module.exports = {
  MotorConsequenciasAmbientais,
  motorAmbientalGlobal
};

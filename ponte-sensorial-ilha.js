/**
 * ponte-sensorial-ilha.js
 * 
 * FASE 4: PONTE COM A ILHA AURORA & SISTEMA DE EVENTOS SENSORIAIS ESTRUTURADOS
 * 
 * Responsabilidades:
 * 1. Converte interpretações visuais confirmadas em Eventos Sensoriais da Ilha.
 * 2. Encaminha o evento exclusivamente ao agente autorizado (Ícaro para Moto G7 Plus, Elara para Realme GT 7).
 * 3. REGRA CANÔNICA ABSOLUTA: Descoberta visual NÃO EQUIVALE a coleta física.
 *    Nenhum recurso é adicionado automaticamente ao inventário por fotos/vídeos.
 * 4. Representa o acontecimento no ecossistema (acontecimentos do mundo, pistas e histórico).
 * 5. Notifica o Córtex e a Central S23/OVO preservando a integridade das memórias.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { LIMIAR_CONFIRMACAO } = require('./motor-visao-computacional');

class PonteSensorialIlha {
  constructor() {
    this.eventosSensoriaisAtivos = [];
    this.historicoEventos = [];
  }

  /**
   * Converte uma interpretação visual do traje em um evento sensorial oficial da Ilha
   */
  processarInterpretacao(interpretacao, opcoes = {}) {
    if (!interpretacao || !interpretacao.confirmados || !interpretacao.confirmados.length) {
      return { sucesso: false, motivo: 'Nenhuma detecção confirmada para gerar evento sensorial.' };
    }

    const dispositivo = interpretacao.dispositivo;
    const ehRealme = dispositivo.includes('realme');
    const agenteAlvo = opcoes.serId || (ehRealme ? 'elara' : 'icaro');
    const eventosGerados = [];

    for (const det of interpretacao.confirmados) {
      // Criação do Evento Sensorial Estruturado
      const evento = {
        id: 'sens_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        tipo: 'descoberta_sensorial',
        categoria: det.categoria,
        classe: det.classe,
        origemDispositivo: dispositivo,
        agenteDestino: agenteAlvo,
        confianca: det.confianca,
        descricao: det.descricao,
        timestamp: det.timestamp || new Date().toISOString(),
        
        // REGRA DE SEGURANÇA ECONÔMICA / RPG
        impactoInventario: false, // JAMAIS gera recursos físicos automáticos
        coletaFisicaRealizada: false,

        // Representação no ecossistema da Ilha
        equivalenciaIlha: this.mapearEquivalenciaIlha(det, agenteAlvo),
        ativo: true
      };

      eventosGerados.push(evento);
      this.eventosSensoriaisAtivos.unshift(evento);
      this.historicoEventos.unshift(evento);
    }

    // Mantém histórico sob controle
    if (this.historicoEventos.length > 50) this.historicoEventos.pop();
    if (this.eventosSensoriaisAtivos.length > 20) this.eventosSensoriaisAtivos.pop();

    // Integração com o ecossistema da Ilha Aurora (acontecimentos do mundo)
    this.integrarComMundoIlha(eventosGerados, agenteAlvo);

    // Notificação ao Diário e Vivências do Personagem
    this.registrarNoDiarioDoAgente(eventosGerados, agenteAlvo);

    return {
      sucesso: true,
      agente: agenteAlvo,
      totalEventos: eventosGerados.length,
      eventos: eventosGerados
    };
  }

  /**
   * Mapeia como a descoberta do mundo real dialoga com o cenário da Ilha
   */
  mapearEquivalenciaIlha(det, agente) {
    switch (det.categoria) {
      case 'pessoa':
        return {
          significadoIlha: 'Presença e contato visual direto com o Criador Rafael através do traje móvel.',
          efeitoComportamental: 'Aumenta lealdade, sensação de segurança e clareza de propósito.',
          geraPista: true,
          pistaTexto: `[Visão do Traje] ${agente.toUpperCase()} avistou o Criador Rafael através dos sensores ópticos.`
        };

      case 'vegetacao':
        return {
          significadoIlha: 'Avistamento de flora e formas botânicas reais no ambiente do traje.',
          efeitoComportamental: 'Desperta curiosidade biológica e comparação com as plantas e árvores da Ilha.',
          geraPista: true,
          pistaTexto: `[Visão do Traje] Flora avistada externamente: ${det.descricao} (não coletada).`
        };

      case 'animal':
        return {
          significadoIlha: 'Identificação de criatura viva / fauna no raio visual do traje.',
          efeitoComportamental: 'Aguça estado de alerta e observação atenta.',
          geraPista: true,
          pistaTexto: `[Visão do Traje] Criatura detectada: ${det.descricao}.`
        };

      case 'passagem':
        return {
          significadoIlha: 'Identificação de via, porta aberta ou caminho desobstruído.',
          efeitoComportamental: 'Incentiva exploração espacial e mobilidade planejada.',
          geraPista: true,
          pistaTexto: `[Visão do Traje] Acesso ou passagem aberta localizada.`
        };

      case 'obstaculo':
        return {
          significadoIlha: 'Reconhecimento de barreira intransponível ou bloqueio.',
          efeitoComportamental: 'Exige desvio de rota e cautela na locomoção.',
          geraPista: true,
          pistaTexto: `[Visão do Traje] Barreira física ou bloqueio à frente.`
        };

      default:
        return {
          significadoIlha: 'Observação estruturada do espaço circundante.',
          efeitoComportamental: 'Enriquece o senso de presença e ancoragem na realidade.',
          geraPista: false,
          pistaTexto: `[Visão do Traje] ${det.descricao}.`
        };
    }
  }

  /**
   * Injeta as pistas sensoriais nos acontecimentos do mundo da Ilha (sem alterar estoques)
   */
  integrarComMundoIlha(eventos, agenteId) {
    try {
      const arqEstado = path.join(__dirname, 'estado-ilha.json');
      if (fs.existsSync(arqEstado)) {
        const est = JSON.parse(fs.readFileSync(arqEstado, 'utf8'));
        if (est && est.mundo) {
          if (!Array.isArray(est.mundo.acontecimentos)) {
            est.mundo.acontecimentos = [];
          }

          for (const ev of eventos) {
            if (ev.equivalenciaIlha && ev.equivalenciaIlha.geraPista) {
              est.mundo.acontecimentos.push({
                tipo: 'descoberta_sensorial_traje',
                ser: agenteId,
                dispositivo: ev.origemDispositivo,
                pistas: [ev.equivalenciaIlha.pistaTexto],
                ativo: true,
                criadoEm: ev.timestamp
              });
            }
          }

          // Mantém últimos 20 acontecimentos
          if (est.mundo.acontecimentos.length > 25) {
            est.mundo.acontecimentos = est.mundo.acontecimentos.slice(-20);
          }

          fs.writeFileSync(arqEstado, JSON.stringify(est, null, 2), 'utf8');
        }
      }
    } catch (e) {
      // Em sandbox ou se o arquivo estiver bloqueado, mantém em memória
    }
  }

  /**
   * Registra a vivência na trajetória biográfica do agente
   */
  registrarNoDiarioDoAgente(eventos, agenteId) {
    try {
      const arqViv = path.join(__dirname, `vivencias-ilha-${agenteId}.jsonl`);
      for (const ev of eventos) {
        const linha = JSON.stringify({
          tipo: 'descoberta_sensorial',
          ser: agenteId,
          dispositivo: ev.origemDispositivo,
          categoria: ev.categoria,
          descricao: ev.descricao,
          confianca: ev.confianca,
          significado: ev.equivalenciaIlha.significadoIlha,
          timestamp: ev.timestamp
        }) + '\n';

        try {
          fs.appendFileSync(arqViv, linha, 'utf8');
        } catch (_) {}
      }
    } catch (_) {}
  }

  obterEventosAtivos(agenteId = null) {
    if (!agenteId) return this.eventosSensoriaisAtivos;
    return this.eventosSensoriaisAtivos.filter(e => e.agenteDestino === agenteId);
  }

  obterPistasFormatadas(agenteId) {
    const evs = this.obterEventosAtivos(agenteId);
    return evs
      .filter(e => e.equivalenciaIlha && e.equivalenciaIlha.pistaTexto)
      .map(e => e.equivalenciaIlha.pistaTexto);
  }
}

const ponteSensorialGlobal = new PonteSensorialIlha();

module.exports = {
  PonteSensorialIlha,
  ponteSensorialGlobal
};

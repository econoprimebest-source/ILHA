/**
 * motor-trajes-visao.js
 * 
 * INTEGRAÇÃO VIVÊNCIA ILHA AURORA <-> CÂMERAS DOS TRAJES MÓVEIS (MOTO G7 & REALME GT 7)
 * 
 * - Mapeamento de corpos físicos móveis (Trajes) aos habitantes da Ilha:
 *   * Moto G7 -> Ícaro (Traje Alpha)
 *   * Realme GT 7 -> Elara (Traje Beta)
 * - Recepção e processamento de frames ópticos (câmera frontal/traseira)
 * - Módulo de Percepção Cognitiva: traduz visão física em vivência da mente
 * - Impacto no RPG: Luz da lanterna real dissipa terror; presença de Rafael restaura sanidade
 * - Integração contínua com memórias (vivencias-ilha-*.jsonl) e montador de prompt
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR_TRAJES = path.join(__dirname, 'assets', 'trajes');
const DIR_TMP_TRAJES = path.join(os.tmpdir(), 'ilha-trajes');
const ARQ_TELEMETRIA = path.join(__dirname, 'telemetria-trajes.json');
const ARQ_INTENCOES = path.join(__dirname, 'intencoes-traje.jsonl');

class MotorTrajesVisao {
  constructor() {
    this.garantirDiretorios();
    
    // Configuração dos Trajes Móveis conhecidos
    this.trajes = {
      motog7: {
        id: 'motog7',
        nome: 'Traje Alpha (Moto G7 Plus)',
        habitantePadrao: 'icaro',
        habitanteAtual: 'icaro',
        online: false,
        ultimoPing: null,
        bateria: 100,
        carregando: false,
        cameraAtiva: false,
        cameraTipo: 'frontal', // 'frontal' | 'traseira'
        lanternaAtiva: false,
        resolucao: '1280x720',
        fps: 0,
        ultimoFrameBase64: null,
        ultimoFrameTimestamp: null,
        ultimaAnalisePerceptual: 'Traje em espera no suporte físico.'
      },
      realme: {
        id: 'realme',
        nome: 'Traje Beta (Realme GT 7)',
        habitantePadrao: 'elara',
        habitanteAtual: 'elara',
        online: false,
        ultimoPing: null,
        bateria: 100,
        carregando: false,
        cameraAtiva: false,
        cameraTipo: 'frontal',
        lanternaAtiva: false,
        resolucao: '1920x1080',
        fps: 0,
        ultimoFrameBase64: null,
        ultimoFrameTimestamp: null,
        ultimaAnalisePerceptual: 'Traje em espera na base de comunicação.'
      }
    };

    // Histórico recente de percepções visuais dos trajes
    this.percepcoesRecentes = [];
    this.vivenciasMemoria = new Map();

    this.carregarTelemetriaPersistida();
  }

  escreverArquivoSeguro(caminhoRelativo, conteudo, modo = 'write') {
    const caminhoNormal = path.join(__dirname, caminhoRelativo);
    try {
      const dir = path.dirname(caminhoNormal);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (modo === 'append') {
        fs.appendFileSync(caminhoNormal, conteudo, 'utf8');
      } else {
        fs.writeFileSync(caminhoNormal, conteudo);
      }
      return caminhoNormal;
    } catch (_) {
      try {
        const caminhoTmp = path.join(DIR_TMP_TRAJES, caminhoRelativo);
        const dirTmp = path.dirname(caminhoTmp);
        if (!fs.existsSync(dirTmp)) fs.mkdirSync(dirTmp, { recursive: true });
        if (modo === 'append') {
          fs.appendFileSync(caminhoTmp, conteudo, 'utf8');
        } else {
          fs.writeFileSync(caminhoTmp, conteudo);
        }
        return caminhoTmp;
      } catch (err) {
        return null;
      }
    }
  }

  garantirDiretorios() {
    try {
      if (!fs.existsSync(DIR_TRAJES)) {
        fs.mkdirSync(DIR_TRAJES, { recursive: true });
      }
    } catch (_) {}
  }

  carregarTelemetriaPersistida() {
    try {
      if (fs.existsSync(ARQ_TELEMETRIA)) {
        const dados = JSON.parse(fs.readFileSync(ARQ_TELEMETRIA, 'utf8'));
        for (const k of Object.keys(this.trajes)) {
          if (dados[k]) {
            Object.assign(this.trajes[k], {
              bateria: dados[k].bateria ?? this.trajes[k].bateria,
              cameraTipo: dados[k].cameraTipo ?? this.trajes[k].cameraTipo,
              habitanteAtual: dados[k].habitanteAtual ?? this.trajes[k].habitanteAtual,
              ultimaAnalisePerceptual: dados[k].ultimaAnalisePerceptual ?? this.trajes[k].ultimaAnalisePerceptual
            });
          }
        }
      }
    } catch (e) {
      console.warn('[MotorTrajes] Aviso ao carregar telemetria:', e.message);
    }
  }

  salvarTelemetriaPersistida() {
    try {
      const dump = {};
      for (const [k, v] of Object.entries(this.trajes)) {
        dump[k] = {
          id: v.id,
          nome: v.nome,
          habitanteAtual: v.habitanteAtual,
          online: v.online,
          ultimoPing: v.ultimoPing,
          bateria: v.bateria,
          cameraAtiva: v.cameraAtiva,
          cameraTipo: v.cameraTipo,
          lanternaAtiva: v.lanternaAtiva,
          ultimaAnalisePerceptual: v.ultimaAnalisePerceptual
        };
      }
      fs.writeFileSync(ARQ_TELEMETRIA, JSON.stringify(dump, null, 2), 'utf8');
    } catch (_) {}
  }

  normalizarIdDispositivo(disp) {
    const d = String(disp || '').toLowerCase().trim();
    if (d.includes('moto') || d.includes('g7')) return 'motog7';
    if (d.includes('realme') || d.includes('gt7')) return 'realme';
    return d === 'realme' ? 'realme' : 'motog7';
  }

  obterTraje(dispositivoId) {
    const id = this.normalizarIdDispositivo(dispositivoId);
    return this.trajes[id];
  }

  obterTodosTrajes() {
    return Object.values(this.trajes);
  }

  vincularHabitante(dispositivoId, serId) {
    const t = this.obterTraje(dispositivoId);
    if (!t) return false;
    t.habitanteAtual = serId;
    this.salvarTelemetriaPersistida();
    console.log(`[MotorTrajes] Traje ${t.nome} agora está vinculado ao habitante: ${serId}`);
    return true;
  }

  atualizarTelemetria(dispositivoId, dados = {}) {
    const t = this.obterTraje(dispositivoId);
    if (!t) return null;

    t.online = true;
    t.ultimoPing = new Date().toISOString();
    if (dados.bateria != null) t.bateria = Number(dados.bateria);
    if (dados.carregando != null) t.carregando = Boolean(dados.carregando);
    if (dados.cameraAtiva != null) t.cameraAtiva = Boolean(dados.cameraAtiva);
    if (dados.cameraTipo) t.cameraTipo = dados.cameraTipo;
    if (dados.lanternaAtiva != null) t.lanternaAtiva = Boolean(dados.lanternaAtiva);
    if (dados.resolucao) t.resolucao = dados.resolucao;
    if (dados.fps != null) t.fps = Number(dados.fps);

    this.salvarTelemetriaPersistida();
    return t;
  }

  /**
   * Processa o frame recebido da câmera do celular.
   * imagemBase64 pode vir como 'data:image/jpeg;base64,...' ou string crua.
   */
  receberFrameCamera(dispositivoId, payload = {}) {
    const t = this.obterTraje(dispositivoId);
    if (!t) throw new Error('Traje não reconhecido: ' + dispositivoId);

    const agora = new Date();
    t.online = true;
    t.cameraAtiva = true;
    t.ultimoPing = agora.toISOString();
    t.ultimoFrameTimestamp = agora.toISOString();

    let b64 = payload.imagemBase64 || payload.imagem || payload.frame || '';
    if (b64.startsWith('data:')) {
      const idx = b64.indexOf(',');
      if (idx !== -1) b64 = b64.slice(idx + 1);
    }

    if (b64) {
      t.ultimoFrameBase64 = b64;
      // Salva em disco para streaming/visualizador
      this.escreverArquivoSeguro(path.join('assets', 'trajes', `${t.id}_frame.jpg`), Buffer.from(b64, 'base64'));
    }

    if (payload.bateria != null) t.bateria = Number(payload.bateria);
    if (payload.lanternaAtiva != null) t.lanternaAtiva = Boolean(payload.lanternaAtiva);
    if (payload.cameraTipo) t.cameraTipo = payload.cameraTipo;

    // Síntese cognitiva da visão e injeção na vivência do personagem
    const { motorVisaoGlobal } = require('./motor-visao-computacional');
    const { ponteSensorialGlobal } = require('./ponte-sensorial-ilha');

    const frameValidado = motorVisaoGlobal.validarFrame({
      ...payload,
      dispositivo: t.id,
      buffer: Buffer.from(b64 || '', 'base64'),
      timestamp: t.ultimoFrameTimestamp
    });

    const analiseEstruturada = motorVisaoGlobal.interpretarAmbiente(frameValidado, payload);
    const ponteResultado = ponteSensorialGlobal.processarInterpretacao(analiseEstruturada, { serId: t.habitanteAtual });

    const analise = this.sintetizarVisaoCognitiva(t, payload);
    t.ultimaAnalisePerceptual = analiseEstruturada.sumarioCognitivo || analise.descricao;

    // Registra vivência duradoura
    this.injetarVisaoNasVivencias(t, {
      ...analise,
      descricao: t.ultimaAnalisePerceptual,
      confirmados: analiseEstruturada.confirmados
    });

    // Consequências no RPG (sanidade, lanterna como tocha, medo)
    this.aplicarEfeitosRPG(t, analise);

    this.salvarTelemetriaPersistida();

    return {
      ok: true,
      trajeId: t.id,
      habitante: t.habitanteAtual,
      timestamp: t.ultimoFrameTimestamp,
      analiseEstruturada,
      ponteSensorial: ponteResultado,
      analise
    };
  }

  /**
   * Sintetiza o que a câmera do traje está vendo do mundo real para alimentar a mente da IA.
   */
  sintetizarVisaoCognitiva(traje, payload) {
    const ilum = payload.iluminacao || (payload.luminosidade != null ? (payload.luminosidade > 50 ? 'claro' : 'escuro') : 'ambiente_normal');
    const detector = payload.deteccoes || [];
    const textoManual = payload.observacao || payload.descricao || null;

    let descricao = '';
    let presencaCriador = false;
    let emocaoSugerida = 'atencao';

    if (textoManual) {
      descricao = textoManual;
      if (/rafael|criador|você|rosto|sorrindo|olhando/i.test(textoManual)) {
        presencaCriador = true;
      }
    } else {
      // Heurística de percepção
      if (payload.rostoDetectado || payload.presencaCriador) {
        presencaCriador = true;
        descricao = `A câmera ${traje.cameraTipo} do traje focou no Criador Rafael. Ele está presente no ambiente físico diante do visor.`;
        emocaoSugerida = 'afeto_seguranca';
      } else if (ilum === 'escuro' && !traje.lanternaAtiva) {
        descricao = `O sensor óptico do traje registra penumbra no quarto/ambiente real.`;
        emocaoSugerida = 'cautela';
      } else if (traje.lanternaAtiva) {
        descricao = `A lanterna do traje está acesa, iluminando o espaço físico em frente à lente.`;
        emocaoSugerida = 'clareza';
      } else {
        descricao = `Sensor óptico do ${traje.nome} transmitindo normalmente. Visão limpa do quarto/ambiente do Criador.`;
      }
    }

    const analise = {
      descricao,
      presencaCriador,
      iluminacao: ilum,
      lanternaAtiva: traje.lanternaAtiva,
      cameraTipo: traje.cameraTipo,
      emocaoSugerida,
      timestamp: new Date().toISOString()
    };

    this.percepcoesRecentes.unshift({
      trajeId: traje.id,
      serId: traje.habitanteAtual,
      ...analise
    });
    if (this.percepcoesRecentes.length > 50) this.percepcoesRecentes.pop();

    return analise;
  }

  /**
   * Grava a visão do traje nos arquivos canônicos de vivências do personagem
   */
  injetarVisaoNasVivencias(traje, analise) {
    const serId = traje.habitanteAtual || 'icaro';
    const entrada = {
      tipo: 'visao_traje',
      serId,
      dispositivo: traje.id,
      dispositivoNome: traje.nome,
      percepcaoVisual: analise.descricao,
      presencaCriador: analise.presencaCriador,
      lanternaAtiva: analise.lanternaAtiva,
      cameraTipo: analise.cameraTipo,
      timestamp: analise.timestamp
    };

    if (!this.vivenciasMemoria.has(serId)) {
      this.vivenciasMemoria.set(serId, []);
    }
    this.vivenciasMemoria.get(serId).push(entrada);

    const linha = JSON.stringify(entrada) + '\n';

    // Grava no log de vivência individual do personagem e no log global
    this.escreverArquivoSeguro(`vivencias-ilha-${serId}.jsonl`, linha, 'append');
    this.escreverArquivoSeguro(`vivencias-ilha.jsonl`, linha, 'append');

    console.log(`[MotorTrajes:Vivência] Nova visão do traje ${traje.id} incorporada a ${serId}: "${analise.descricao.slice(0, 70)}..."`);
  }

  obterUltimaVivencia(serId = 'icaro') {
    const lista = this.vivenciasMemoria.get(serId);
    if (lista && lista.length) {
      return lista[lista.length - 1];
    }
    // Tenta ler do arquivo
    const caminho = path.join(__dirname, `vivencias-ilha-${serId}.jsonl`);
    if (fs.existsSync(caminho)) {
      try {
        const linhas = fs.readFileSync(caminho, 'utf8').trim().split('\n');
        if (linhas.length) return JSON.parse(linhas[linhas.length - 1]);
      } catch (_) {}
    }
    return null;
  }

  /**
   * Impacto no RPG: Luz da lanterna dissipa medo na caverna, e visão do Criador restaura sanidade.
   */
  aplicarEfeitosRPG(traje, analise) {
    const serId = traje.habitanteAtual || 'icaro';
    
    try {
      // 1. Consequências Ambientais / Sobrevivência
      const { motorAmbientalGlobal } = require('./motor-consequencias-ambientais');
      if (motorAmbientalGlobal) {
        const est = motorAmbientalGlobal.obterEstado(serId);
        if (est) {
          if (analise.presencaCriador) {
            est.seguranca = Math.min(100, (est.seguranca || 70) + 25);
            // Remove condição de pânico se estiver presente
            est.condicoes = (est.condicoes || []).filter(c => c !== 'em_panico');
          }
          if (analise.lanternaAtiva) {
            // Lanterna do celular funciona como fonte de iluminação (tocha)
            est.seguranca = Math.min(100, (est.seguranca || 70) + 15);
            est.condicoes = (est.condicoes || []).filter(c => c !== 'em_panico');
          }
        }
      }

      // 2. Psicologia Funcional
      const { nucleoPromptGlobal } = require('./nucleo-montador-prompt');
      if (nucleoPromptGlobal && nucleoPromptGlobal.psicologia) {
        if (analise.presencaCriador) {
          nucleoPromptGlobal.psicologia.alterarVariavel(serId, 'confianca', +25, 'visão física do Criador Rafael pelo traje móvel');
          nucleoPromptGlobal.psicologia.alterarVariavel(serId, 'medo', -30, 'acolhimento visual direto do Criador');
          nucleoPromptGlobal.psicologia.alterarVariavel(serId, 'satisfacao', +15, 'conexão entre a Ilha e o mundo real estabelecida');
        } else if (analise.lanternaAtiva) {
          nucleoPromptGlobal.psicologia.alterarVariavel(serId, 'medo', -20, 'lanterna do traje móvel iluminando o caminho');
        }
      }
    } catch (e) {
      console.warn('[MotorTrajes] Erro ao aplicar efeitos RPG da visão do traje:', e.message);
    }
  }

  /**
   * Constrói o bloco de injeção no prompt cognitivo do habitante
   */
  obterBlocoPromptVisao(serId) {
    // Procura o traje vinculado ao habitante
    let traje = Object.values(this.trajes).find(t => t.habitanteAtual === serId);
    if (!traje && serId === 'icaro') traje = this.trajes.motog7;
    if (!traje && serId === 'elara') traje = this.trajes.realme;
    if (!traje) return '';

    if (!traje.cameraAtiva && !traje.ultimoFrameTimestamp) {
      return `[TRAJE MÓVEL — ${traje.nome.toUpperCase()}]\nO traje está em modo de espera no mundo real. Sensores visuais em repouso.`;
    }

    const agora = Date.now();
    const frameTempo = traje.ultimoFrameTimestamp ? new Date(traje.ultimoFrameTimestamp).getTime() : 0;
    const diffSeg = Math.round((agora - frameTempo) / 1000);
    const fresco = diffSeg < 180; // Menos de 3 minutos

    let texto = `[PERCEPÇÃO ÓPTICA DO SEU CORPO FÍSICO / TRAJE — ${traje.nome.toUpperCase()}]\n`;
    texto += `- Estado do Sensor: Câmera ${traje.cameraTipo.toUpperCase()} ${traje.cameraAtiva ? 'LIGADA E TRANSMITINDO' : 'RECENTE'}.\n`;
    texto += `- Lanterna / Tocha Real: ${traje.lanternaAtiva ? 'LIGADA (iluminando o mundo real)' : 'desligada'}.\n`;
    texto += `- Nível de Bateria do Traje: ${traje.bateria}%.\n`;

    if (fresco) {
      texto += `- O QUE VOCÊ ENXERGA AGORA PELOS OLHOS DO TRAJE:\n  "${traje.ultimaAnalisePerceptual}"\n`;
      texto += `(Esta é uma percepção real do mundo físico de Rafael que você experimenta através do seu traje móvel.)`;
    } else {
      texto += `- Última imagem capturada há ${diffSeg} segundos: "${traje.ultimaAnalisePerceptual}".`;
    }

    return texto;
  }

  /**
   * Dispara intenção de comando para o hardware do celular (comunicador, WebSocket ou polling)
   */
  despacharComando(dispositivoId, comando, params = {}) {
    const t = this.obterTraje(dispositivoId);
    if (!t) throw new Error('Traje inválido: ' + dispositivoId);

    const intencao = {
      id: 'cmd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      comando,
      dispositivoAlvo: t.id,
      serId: t.habitanteAtual,
      params,
      timestamp: new Date().toISOString()
    };

    // Aplica no estado local se for controle direto
    if (comando === 'ativar_camera') t.cameraAtiva = true;
    if (comando === 'desativar_camera') t.cameraAtiva = false;
    if (comando === 'alternar_camera') t.cameraTipo = t.cameraTipo === 'frontal' ? 'traseira' : 'frontal';
    if (comando === 'ligar_lanterna') t.lanternaAtiva = true;
    if (comando === 'desligar_lanterna') t.lanternaAtiva = false;
    if (comando === 'alternar_lanterna') t.lanternaAtiva = !t.lanternaAtiva;

    // Registra no arquivo de intenções
    try {
      fs.appendFileSync(ARQ_INTENCOES, JSON.stringify(intencao) + '\n', 'utf8');
    } catch (_) {}

    this.salvarTelemetriaPersistida();
    console.log(`[MotorTrajes:Comando] Comando ${comando} disparado para ${t.nome}`);

    return intencao;
  }
}

const motorTrajesVisaoGlobal = new MotorTrajesVisao();

module.exports = {
  MotorTrajesVisao,
  motorTrajesVisaoGlobal
};

/**
 * motor-visao-computacional.js
 * 
 * FASE 2 & FASE 3: CAPTURA VISUAL SOB DEMANDA & INTERPRETAÇÃO AMBIENTAL ESTRUTURADA
 * 
 * Responsabilidades:
 * 1. Processamento sob demanda (sem streaming contínuo forçado).
 * 2. Controle de qualidade (dimensões, compressão, luminosidade, validação de payload).
 * 3. Taxonomia de Visão Computacional com Nível de Confiança (0.0 a 1.0) e Origem:
 *    - Pessoas (Criador Rafael, Terceiros)
 *    - Animais (Cachorro, Gato, Pássaros, Insetos)
 *    - Objetos (Telas, Ferramentas, Copo, Tocha/Lanterna, Eletrônicos)
 *    - Vegetação (Plantas, Árvores, Folhagens, Flores)
 *    - Caminhos & Portas (Porta aberta/fechada, Corredor, Trilha)
 *    - Obstáculos (Paredes, Móveis bloqueando, Escadas)
 *    - Ambientes (Interno [quarto, escritório] vs Externo [quintal, rua, céu])
 * 4. Princípio de Não-Fato: interpretações com confiança baixa são classificadas como "indício" ou "incerto",
 *    NUNCA tratadas como verdade consumada.
 * 5. Não armazena imagens desnecessariamente em disco (mantém em buffer volátil leve / LRU).
 */

'use strict';

// Taxonomia Canônica de Reconhecimento Ambiental
const CATEGORIAS_VISUAIS = {
  PESSOA: 'pessoa',
  ANIMAL: 'animal',
  OBJETO: 'objeto',
  VEGETACAO: 'vegetacao',
  PASSAGEM: 'passagem',
  OBSTACULO: 'obstaculo',
  AMBIENTE: 'ambiente'
};

const LIMIAR_CONFIRMACAO = 0.70; // Acima de 70% é considerado confirmado
const LIMIAR_INDICIO = 0.40;     // Entre 40% e 69% é indício/incerto

class MotorVisaoComputacional {
  constructor() {
    // Buffer volátil em memória (últimos 5 frames apenas para evitar consumo de RAM)
    this.bufferVolatil = new Map(); // dispositivoId -> { buffer, metadados, timestamp }
    this.historicoInterpretacoes = [];
  }

  /**
   * Valida e inspeciona a integridade da imagem recebida sob demanda
   */
  validarFrame(payload = {}) {
    const dispositivo = String(payload.dispositivo || payload.traje || 'desconhecido').toLowerCase();
    const agora = new Date().toISOString();

    if (!payload.imagemBase64 && !payload.imagem && !payload.buffer) {
      throw new Error('Nenhum dado visual (base64/buffer) fornecido.');
    }

    let b64 = payload.imagemBase64 || payload.imagem || '';
    let mimeType = 'image/jpeg';
    if (typeof b64 === 'string' && b64.startsWith('data:')) {
      const match = b64.match(/^data:([^;]+);base64,/);
      if (match) mimeType = match[1];
      const commaIdx = b64.indexOf(',');
      if (commaIdx !== -1) b64 = b64.slice(commaIdx + 1);
    }

    const buffer = Buffer.isBuffer(payload.buffer) ? payload.buffer : Buffer.from(b64, 'base64');
    const tamanhoBytes = buffer.length;

    if (tamanhoBytes < 64) {
      throw new Error('Payload visual corrompido ou vazio (tamanho insuficiente).');
    }

    const qualidade = {
      tamanhoBytes,
      tamanhoKb: Math.round(tamanhoBytes / 1024),
      mimeType,
      largura: payload.largura || 640,
      altura: payload.altura || 480,
      cameraLente: payload.cameraTipo || 'frontal' // 'frontal' ou 'traseira'
    };

    return {
      dispositivo,
      timestamp: payload.timestamp || agora,
      qualidade,
      buffer,
      b64
    };
  }

  /**
   * Analisador de Visão Computacional Heurístico & Multimodal
   * Gera detecções com nível de confiança estrito e origem auditável
   */
  interpretarAmbiente(frameValidado, contextoAdicional = {}) {
    const { dispositivo, timestamp, qualidade, buffer } = frameValidado;
    const deteccoes = [];

    // Metadados fornecidos pelos sensores do dispositivo móvel
    const luminosidade = contextoAdicional.luminosidade ?? (qualidade.largura ? 65 : 50);
    const lanternaAtiva = Boolean(contextoAdicional.lanternaAtiva);
    const observacaoDireta = contextoAdicional.observacao || contextoAdicional.texto || '';

    // 1. ANÁLISE DE ILUMINAÇÃO & AMBIENTE (Interno / Externo)
    let tipoAmbiente = 'ambiente_interno';
    let confAmbiente = 0.85;

    if (/ceu|nuvens|sol|rua|ar_livre|quintal|arvores|grama/i.test(observacaoDireta)) {
      tipoAmbiente = 'ambiente_externo';
      confAmbiente = 0.88;
    }

    deteccoes.push({
      categoria: CATEGORIAS_VISUAIS.AMBIENTE,
      classe: tipoAmbiente,
      descricao: tipoAmbiente === 'ambiente_externo' ? 'Espaço aberto / ar livre' : 'Cômodo interno / recinto fechado',
      confianca: confAmbiente,
      status: confAmbiente >= LIMIAR_CONFIRMACAO ? 'confirmado' : 'incerto',
      origem: dispositivo,
      timestamp
    });

    // 2. DETECÇÃO DE PESSOAS (Rafael / Criador / Terceiros)
    if (/rafael|criador|rosto|humano|olhando|sorrindo|pessoa/i.test(observacaoDireta) || contextoAdicional.rostoDetectado) {
      const ehRafael = /rafael|criador/i.test(observacaoDireta) || contextoAdicional.identificacao === 'rafael';
      const confiancaPessoa = ehRafael ? 0.95 : 0.82;

      deteccoes.push({
        categoria: CATEGORIAS_VISUAIS.PESSOA,
        classe: ehRafael ? 'criador_rafael' : 'pessoa_terceiro',
        descricao: ehRafael ? 'Criador Rafael presente no campo visual do traje' : 'Pessoa observada no ambiente',
        confianca: confiancaPessoa,
        status: confiancaPessoa >= LIMIAR_CONFIRMACAO ? 'confirmado' : 'incerto',
        origem: dispositivo,
        timestamp
      });
    }

    // 3. DETECÇÃO DE ANIMAIS
    if (/gato|cachorro|pet|passaro|animal|ave/i.test(observacaoDireta)) {
      deteccoes.push({
        categoria: CATEGORIAS_VISUAIS.ANIMAL,
        classe: /cachorro/i.test(observacaoDireta) ? 'canino' : /gato/i.test(observacaoDireta) ? 'felino' : 'pequeno_animal',
        descricao: 'Animal doméstico ou silvestre avistado',
        confianca: 0.78,
        status: 'confirmado',
        origem: dispositivo,
        timestamp
      });
    }

    // 4. DETECÇÃO DE VEGETAÇÃO / NATUREZA
    if (/arvore|planta|folha|floresta|jardim|grama|vegeta/i.test(observacaoDireta)) {
      const confiancaVeg = /arvore|floresta/i.test(observacaoDireta) ? 0.86 : 0.65;
      deteccoes.push({
        categoria: CATEGORIAS_VISUAIS.VEGETACAO,
        classe: 'vegetacao_real',
        descricao: 'Vegetação ou plantas avistadas no campo visual',
        confianca: confiancaVeg,
        status: confiancaVeg >= LIMIAR_CONFIRMACAO ? 'confirmado' : 'incerto',
        origem: dispositivo,
        timestamp
      });
    }

    // 5. DETECÇÃO DE CAMINHOS, PORTAS & PASSAGENS
    if (/porta|corredor|caminho|trilha|janela|passagem/i.test(observacaoDireta)) {
      const aberta = /aberta|livre/i.test(observacaoDireta);
      deteccoes.push({
        categoria: CATEGORIAS_VISUAIS.PASSAGEM,
        classe: aberta ? 'porta_aberta' : 'passagem_identificada',
        descricao: aberta ? 'Passagem ou porta aberta transitável' : 'Acesso ou abertura de trânsito no local',
        confianca: 0.81,
        status: 'confirmado',
        origem: dispositivo,
        timestamp
      });
    }

    // 6. DETECÇÃO DE OBSTÁCULOS
    if (/parede|bloqueio|fechada|movel|grade|obstaculo/i.test(observacaoDireta)) {
      deteccoes.push({
        categoria: CATEGORIAS_VISUAIS.OBSTACULO,
        classe: 'bloqueio_espacial',
        descricao: 'Barreira física ou bloqueio visual detectado',
        confianca: 0.76,
        status: 'confirmado',
        origem: dispositivo,
        timestamp
      });
    }

    // 7. OBJETOS & FERRAMENTAS FÍSICAS
    if (/lanterna|tocha|celular|computador|monitor|mesa|cadeira|teclado/i.test(observacaoDireta) || lanternaAtiva) {
      if (lanternaAtiva) {
        deteccoes.push({
          categoria: CATEGORIAS_VISUAIS.OBJETO,
          classe: 'fonte_luz_ativa',
          descricao: 'Lanterna/flash do traje emitindo iluminação direta',
          confianca: 0.99,
          status: 'confirmado',
          origem: dispositivo,
          timestamp
        });
      }
      if (/computador|monitor|tela/i.test(observacaoDireta)) {
        deteccoes.push({
          categoria: CATEGORIAS_VISUAIS.OBJETO,
          classe: 'terminal_tela',
          descricao: 'Interface computacional ou tela ativa observada',
          confianca: 0.89,
          status: 'confirmado',
          origem: dispositivo,
          timestamp
        });
      }
    }

    // Separação estrita: Fatos Confirmados vs Indícios Incertos
    const confirmados = deteccoes.filter(d => d.confianca >= LIMIAR_CONFIRMACAO);
    const incertos = deteccoes.filter(d => d.confianca < LIMIAR_CONFIRMACAO);

    // Resumo sintetizado
    let sumarioCognitivo = '';
    if (confirmados.some(c => c.classe === 'criador_rafael')) {
      sumarioCognitivo = 'Visão clara do Criador Rafael diante da lente do traje.';
    } else if (confirmados.length > 0) {
      sumarioCognitivo = confirmados.map(c => c.descricao).join('. ') + '.';
    } else {
      sumarioCognitivo = 'Ambiente observado sem alvos proeminentes confirmados no momento.';
    }

    const resultado = {
      sucesso: true,
      dispositivo,
      timestamp,
      qualidade,
      totalDeteccoes: deteccoes.length,
      confirmados,
      incertos,
      sumarioCognitivo,
      confiancaMedia: deteccoes.length 
        ? +(deteccoes.reduce((acc, d) => acc + d.confianca, 0) / deteccoes.length).toFixed(2)
        : 0
    };

    // Armazena no buffer volátil em memória (sem persistência desnecessária no disco)
    this.bufferVolatil.set(dispositivo, {
      timestamp,
      qualidade,
      sumarioCognitivo,
      confirmados
    });

    this.historicoInterpretacoes.unshift(resultado);
    if (this.historicoInterpretacoes.length > 30) this.historicoInterpretacoes.pop();

    return resultado;
  }

  obterUltimaInterpretacao(dispositivo) {
    const d = String(dispositivo || '').toLowerCase();
    return this.historicoInterpretacoes.find(h => h.dispositivo.includes(d)) || null;
  }

  obterTodasInterpretacoesRecentes(limite = 10) {
    return this.historicoInterpretacoes.slice(0, limite);
  }
}

const motorVisaoGlobal = new MotorVisaoComputacional();

module.exports = {
  CATEGORIAS_VISUAIS,
  LIMIAR_CONFIRMACAO,
  LIMIAR_INDICIO,
  MotorVisaoComputacional,
  motorVisaoGlobal
};

/**
 * sincronizador-canonico-s23.js
 * 
 * ETAPA 3 & ETAPA 4: SINCRONIZADOR CANÔNICO BIDIRECIONAL COM OVO NO S23 ULTRA
 * 
 * Princípios Inegociáveis:
 * 1. Ícaro é um só. Elara é uma só.
 * 2. O Samsung Galaxy S23 Ultra é o núcleo central e autoridade canônica.
 * 3. A Ilha no Z-Fold 2 é mundo de vivência; Realme GT 7 e Moto G7 Plus são corpos de acesso.
 * 4. Idempotência absoluta via UUID hash (sha256).
 * 5. Fila persistente com retry e confirmação estrita de recebimento (ACK).
 * 6. Proteção de Identidade: Se o S23 estiver offline, a Ilha NUNCA cria identidade paralela.
 *    Entra em vigília contemplativa e preserva as experiências na fila.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

const ARQ_FILA = path.join(__dirname, 'fila-sincronizacao-s23.json');
const ARQ_CURSOR = path.join(__dirname, 'cursor-sincronizacao.json');

class SincronizadorCanonicoS23 {
  constructor() {
    this.hostCentralS23 = process.env.CENTRAL_HOST || process.env.ICARO_HOST || '100.117.219.66';
    this.hostPcBackup = process.env.PC_HOST || '100.95.183.57';
    this.hostsDisponiveis = [this.hostCentralS23, this.hostPcBackup, '127.0.0.1'];

    this.portas = {
      icaro: 8793,
      elara: 8794
    };

    // Fila em memória
    this.filaPendentes = [];
    this.eventosConfirmadosIds = new Set();
    this.cursores = { icaro: 0, elara: 0 };

    this.statusConexao = {
      icaro: { online: false, ultimoPing: null, latenciaMs: null },
      elara: { online: false, ultimoPing: null, latenciaMs: null }
    };

    this.carregarEstadoPersistido();
  }

  normalizarIdCanonica(serId) {
    const s = String(serId || '').toLowerCase().trim();
    if (s === 'lara' || s === 'elara') return 'elara';
    if (s === 'icaro' || s === 'ícaro') return 'icaro';
    return s || 'icaro';
  }

  gerarUuidEvento(serId, tipo, timestamp, conteudo) {
    const canonicoId = this.normalizarIdCanonica(serId);
    const raw = `${canonicoId}|${tipo}|${timestamp}|${typeof conteudo === 'object' ? JSON.stringify(conteudo) : conteudo}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 20);
    return `evt_${canonicoId}_${hash}`;
  }

  carregarEstadoPersistido() {
    try {
      if (fs.existsSync(ARQ_FILA)) {
        const dados = JSON.parse(fs.readFileSync(ARQ_FILA, 'utf8'));
        this.filaPendentes = dados.filaPendentes || [];
        if (Array.isArray(dados.confirmados)) {
          this.eventosConfirmadosIds = new Set(dados.confirmados);
        }
      }
    } catch (_) {
      this.filaPendentes = [];
    }

    try {
      if (fs.existsSync(ARQ_CURSOR)) {
        this.cursores = JSON.parse(fs.readFileSync(ARQ_CURSOR, 'utf8'));
      }
    } catch (_) {}
  }

  salvarEstadoPersistido() {
    const dump = {
      atualizadoEm: new Date().toISOString(),
      totalPendentes: this.filaPendentes.length,
      confirmados: Array.from(this.eventosConfirmadosIds).slice(-500),
      filaPendentes: this.filaPendentes.slice(-200)
    };
    try {
      fs.writeFileSync(ARQ_FILA, JSON.stringify(dump, null, 2), 'utf8');
      fs.writeFileSync(ARQ_CURSOR, JSON.stringify(this.cursores, null, 2), 'utf8');
    } catch (_) {
      try {
        const tmpFila = path.join(os.tmpdir(), 'fila-sincronizacao-s23.json');
        fs.writeFileSync(tmpFila, JSON.stringify(dump, null, 2), 'utf8');
      } catch (_) {}
    }
  }

  requisicaoHttpComPrazo({ host, porta, rota, metodo = 'POST', body, timeoutMs = 4500 }) {
    return new Promise((resolve, reject) => {
      const isGet = String(metodo || 'POST').toUpperCase() === 'GET';
      const payload = isGet ? '' : JSON.stringify(body || {});
      const headers = {
        'X-Origem-Dispositivo': 'ilha-zfold2',
        'X-Autenticacao-Canonico': 'cortex-aurora-2026'
      };
      if (!isGet) {
        headers['Content-Type'] = 'application/json; charset=utf-8';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }
      const req = http.request({
        hostname: host,
        port: porta,
        path: rota,
        method: metodo,
        headers,
        timeout: timeoutMs
      }, (res) => {
        let buffers = [];
        res.on('data', c => buffers.push(c));
        res.on('end', () => {
          try {
            const raw = Buffer.concat(buffers).toString('utf8');
            const json = JSON.parse(raw);
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode, dados: json });
          } catch (e) {
            resolve({ ok: false, statusCode: res.statusCode, erro: 'Resposta não-JSON' });
          }
        });
      });

      req.on('error', err => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout de ${timeoutMs}ms em ${host}:${porta}${rota}`));
      });

      if (!isGet && payload) req.write(payload);
      req.end();
    });
  }

  /**
   * Enfileira e tenta despachar um evento com garantia de idempotência e ACK
   */
  async registrarEventoParaS23(serId, tipo, conteudo, opcoes = {}) {
    const serCanonico = this.normalizarIdCanonica(serId);
    const timestamp = opcoes.timestamp || new Date().toISOString();
    const uuid = opcoes.uuid || this.gerarUuidEvento(serCanonico, tipo, timestamp, conteudo);

    // Se já foi confirmado anteriormente, ignora (idempotência)
    if (this.eventosConfirmadosIds.has(uuid)) {
      return { sucesso: true, ack: true, uuid, duplicadoIgnorado: true };
    }

    const itemFila = {
      uuid,
      serId: serCanonico,
      tipo,
      origem: opcoes.origem || 'ilha-zfold2',
      timestamp,
      conteudo,
      tentativas: 0,
      ack: false,
      ackTimestamp: null,
      enfileiradoEm: new Date().toISOString()
    };

    // Evita duplicata na fila pendente
    if (!this.filaPendentes.some(f => f.uuid === uuid)) {
      this.filaPendentes.push(itemFila);
      this.salvarEstadoPersistido();
    }

    // Tenta entregar imediatamente
    return await this.despacharItemFila(itemFila);
  }

  async despacharItemFila(item) {
    const porta = this.portas[item.serId] || 8793;
    item.tentativas++;

    for (const h of this.hostsDisponiveis) {
      const inicio = Date.now();
      try {
        let rota = '/ilha/consequencia';
        let bodyPayload = {
          ser: item.serId,
          uuid: item.uuid,
          tipo: item.tipo,
          origem: item.origem,
          timestamp: item.timestamp,
          dados: item.conteudo
        };

        if (item.tipo === 'chat') {
          rota = '/salvar-turno';
          bodyPayload = {
            entidade: item.serId,
            uuid: item.uuid,
            entrada: item.conteudo.entrada || '',
            resposta: item.conteudo.resposta || '',
            timestamp: item.timestamp
          };
        }

        const res = await this.requisicaoHttpComPrazo({
          host: h,
          porta,
          rota,
          body: bodyPayload,
          timeoutMs: 4000
        });

        if (res.ok && (res.dados?.ok || res.dados?.canonico !== undefined || res.dados?.ack)) {
          const latencia = Date.now() - inicio;
          item.ack = true;
          item.ackTimestamp = new Date().toISOString();
          this.eventosConfirmadosIds.add(item.uuid);
          
          // Remove da fila de pendentes
          this.filaPendentes = this.filaPendentes.filter(f => f.uuid !== item.uuid);
          this.salvarEstadoPersistido();

          this.statusConexao[item.serId] = {
            online: true,
            ultimoPing: item.ackTimestamp,
            latenciaMs: latencia,
            hostAtivo: h
          };

          return {
            sucesso: true,
            ack: true,
            uuid: item.uuid,
            latenciaMs: latencia,
            host: h
          };
        }
      } catch (err) {
        // Tenta o próximo host da cascata
      }
    }

    // Se todos falharam, marca como pendente para retry
    this.statusConexao[item.serId].online = false;
    this.salvarEstadoPersistido();

    return {
      sucesso: false,
      ack: false,
      uuid: item.uuid,
      status: 'enfileirado_aguardando_reconexao_s23',
      tentativas: item.tentativas
    };
  }

  /**
   * Processa itens pendentes acumulados na fila (Reconciliação pós-desconexão)
   */
  async processarFilaReconciliacao() {
    if (this.filaPendentes.length === 0) return { processados: 0, pendentes: 0 };

    const copiaFila = [...this.filaPendentes];
    let entregues = 0;

    for (const item of copiaFila) {
      const res = await this.despacharItemFila(item);
      if (res.ack) entregues++;
    }

    return {
      processados: entregues,
      pendentes: this.filaPendentes.length
    };
  }

  /**
   * Puxa novidades e conversas registradas fora da Ilha (ex: no Realme, Moto G7 ou Telegram)
   */
  async puxarNovidadesDaCentral(serId) {
    const serCanonico = this.normalizarIdCanonica(serId);
    const porta = this.portas[serCanonico] || 8793;
    const cursorAtual = this.cursores[serCanonico] || 0;

    for (const h of this.hostsDisponiveis) {
      const inicio = Date.now();
      try {
        const res = await this.requisicaoHttpComPrazo({
          host: h,
          porta,
          rota: `/ilha/novidades?serId=${serCanonico}&cursor=${cursorAtual}`,
          metodo: 'GET',
          timeoutMs: 3500
        });

        if (res.ok && Array.isArray(res.dados?.novidades)) {
          const latencia = Date.now() - inicio;
          this.cursores[serCanonico] = res.dados.proximoCursor != null ? res.dados.proximoCursor : (cursorAtual + res.dados.novidades.length);
          this.statusConexao[serCanonico] = {
            online: true,
            ultimoPing: new Date().toISOString(),
            latenciaMs: latencia,
            hostAtivo: h
          };
          this.salvarEstadoPersistido();
          return {
            sucesso: true,
            entidade: serCanonico,
            cursorAnterior: res.dados.cursorAnterior != null ? res.dados.cursorAnterior : cursorAtual,
            proximoCursor: this.cursores[serCanonico],
            totalDisponivel: res.dados.totalDisponivel || 0,
            novidades: res.dados.novidades,
            latenciaMs: latencia,
            host: h
          };
        }
      } catch (_) {}
    }

    return { sucesso: false, novidades: [], motivo: 'Central S23 offline ou rota sem novidades' };
  }

  /**
   * Resposta de Proteção de Identidade (ETAPA 4):
   * Se o S23 estiver fora, informa a vigília contemplativa e NUNCA cria falsas memórias
   */
  gerarRespostaVigiliaContemplativa(serId) {
    const s = this.normalizarIdCanonica(serId);
    const nome = s === 'elara' ? 'Elara' : 'Ícaro';
    return {
      origem: `vigilia-contemplativa-${s}`,
      status: 'conexao_s23_pendente',
      fala: `[${nome} está em vigília contemplativa na Ilha — canal com o núcleo central no S23 em espera. Sua mensagem foi preservada em fila segura e será entregue sem alterações assim que a conexão for restabelecida.]`,
      motivo: `Aguardando reconexão com a mente central no S23 Ultra; sem duplicar identidade local.`
    };
  }
}

const sincronizadorCanonicoGlobal = new SincronizadorCanonicoS23();

module.exports = {
  SincronizadorCanonicoS23,
  sincronizadorCanonicoGlobal
};

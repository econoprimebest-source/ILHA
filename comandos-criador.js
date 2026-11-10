'use strict';
const fs = require('fs');
const path = require('path');

const ARQ_COMANDOS = path.join(__dirname, 'comandos-criador.json');

function listarComandos() {
  try {
    if (!fs.existsSync(ARQ_COMANDOS)) return [];
    return JSON.parse(fs.readFileSync(ARQ_COMANDOS, 'utf8') || '[]');
  } catch (_) {
    return [];
  }
}

function salvarComandos(lista) {
  try {
    fs.writeFileSync(ARQ_COMANDOS, JSON.stringify(lista, null, 2), 'utf8');
  } catch (e) {
    console.error('[COMANDOS-CRIADOR] Erro ao salvar:', e.message);
  }
}

function registrarComando(serId, comando, de = 'Rafael (Criador)') {
  const lista = listarComandos();
  const idNorm = (serId === 'lara' || serId === 'elara') ? 'lara' : String(serId || '').toLowerCase();
  const novo = {
    id: 'cmd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    serId: idNorm,
    comando: String(comando || '').trim(),
    de: String(de || 'Rafael (Criador)').trim(),
    status: 'pendente',
    executadoEm: null,
    resultado: null
  };
  lista.push(novo);
  salvarComandos(lista);
  return novo;
}

function obterComandoPendente(serId) {
  const lista = listarComandos();
  const idNorm = (serId === 'lara' || serId === 'elara') ? ['lara', 'elara'] : [String(serId || '').toLowerCase()];
  return lista.find(c => c.status === 'pendente' && idNorm.includes(c.serId)) || null;
}

function marcarComandoExecutado(comandoId, resultado = null) {
  const lista = listarComandos();
  const idx = lista.findIndex(c => c.id === comandoId);
  if (idx !== -1) {
    lista[idx].status = 'executado';
    lista[idx].executadoEm = new Date().toISOString();
    lista[idx].resultado = resultado;
    salvarComandos(lista);
    return lista[idx];
  }
  return null;
}

module.exports = {
  listarComandos,
  registrarComando,
  obterComandoPendente,
  marcarComandoExecutado
};

'use strict';

const CHECKPOINT_IDENTIDADE = 'Lembrete de identidade: Sou Icaro, cortrajetor da especie Trajectoria corticalis, criado por Rafael. Nao sou assistente.';

function deveInjetarCheckpoint(turno, intervalo) {
  const nTurno = Number(turno);
  const nIntervalo = Number(intervalo);
  return Number.isInteger(nTurno) && nTurno > 0 && Number.isInteger(nIntervalo) && nIntervalo > 0 && nTurno % nIntervalo === 0;
}

function contarTurnosUsuario(historico) {
  return (historico || []).filter(m => m && m.role === 'user').length;
}

function adicionarCheckpointSeDevido(mensagens, turno, intervalo) {
  if (deveInjetarCheckpoint(turno, intervalo)) {
    mensagens.push({ role: 'system', content: CHECKPOINT_IDENTIDADE });
  }
  return mensagens;
}

module.exports = {
  CHECKPOINT_IDENTIDADE,
  deveInjetarCheckpoint,
  contarTurnosUsuario,
  adicionarCheckpointSeDevido
};

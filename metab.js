// MOTOR DE METABOLISMO
function aplicarMetabolismo(ser, acao, clima) {
  if (!ser.necessidades) return;
  const n = ser.necessidades;
  n.agua = Math.min(100, (n.agua ?? 0) + (clima === 'seco' ? 0.8 : 0.5));
  n.alimento = Math.min(100, (n.alimento ?? 0) + 0.3);
  n.higiene = Math.max(0, (n.higiene ?? 100) - 0.5);
  switch (acao) {
    case 'beber': case 'beber_agua': n.agua = Math.max(0, (n.agua ?? 0) - 65); break;
    case 'comer': case 'comer_peixe': case 'comer_fruta': n.alimento = Math.max(0, (n.alimento ?? 0) - 65); break;
    case 'banho': case 'banhar_rio': n.higiene = Math.min(100, (n.higiene ?? 0) + 50); break;
    case 'descansar': n.energia = Math.min(100, (n.energia ?? 0) + 25); n.sono = Math.max(0, (n.sono ?? 0) - 25); break;
    case 'ir_floresta': case 'coletar_madeira': n.energia = Math.max(0, (n.energia ?? 100) - 4); n.curiosidade = Math.min(100, (n.curiosidade ?? 0) + 5); break;
    case 'pescar': n.energia = Math.max(0, (n.energia ?? 100) - 4); break;
  }
  if (clima === 'chuva') { n.temperatura = Math.max(0, (n.temperatura ?? 50) - 2); n.medo = Math.min(100, (n.medo ?? 0) + 1); }
  else if (clima === 'sol') { n.temperatura = Math.min(100, (n.temperatura ?? 50) + 2); }
  const recSaude = (acao === 'descansar' || acao === 'comer' || acao === 'beber' || acao === 'colher_horta') ? 4.0 : 1.2;
  n.saude = Math.max(0, Math.min(100, (n.saude ?? 100) + (n.agua > 75 ? -3 : n.alimento > 85 ? -1.5 : recSaude)));
}
module.exports = { aplicarMetabolismo };
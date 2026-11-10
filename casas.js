'use strict';
// MORADIAS, BAÚS E AMPLIAÇÃO DAS CASAS
// ---------------------------------------------------------------------------
// Inspirado em mecânicas de jogos de sobrevivência/colônia:
//  - Stardew Valley / Animal Crossing: a casa sobe de nível pagando materiais e
//    cada nível muda a casa por fora (anexos, telhado, segundo andar).
//  - Valheim / Don't Starve: baú de estoque em casa, conforto que melhora o
//    descanso ("rested"), obra que exige várias sessões de trabalho.
//  - RimWorld / Banished: estoque físico (pilha de toras/pedras) visível em
//    frente à moradia, e a obra só começa quando o material está no local.
// O mundo só oferece POSSIBILIDADES: guardar, pegar, iniciar e trabalhar na
// ampliação. Quem decide se quer (e sair para juntar madeira e pedra) é o
// próprio habitante.
const NIVEIS = [
  null,
  { nivel: 1, nome: 'Cabana de Palha', capacidadeBau: 40, conforto: 0,
    visual: 'cabana simples de palha' },
  { nivel: 2, nome: 'Cabana de Toras', custo: { madeira: 10, pedra: 4 }, trabalho: 2, capacidadeBau: 70, conforto: 1,
    visual: 'anexo lateral de toras + depósito de lenha coberto' },
  { nivel: 3, nome: 'Casa de Pedra com Chaminé', custo: { madeira: 16, pedra: 12 }, trabalho: 3, capacidadeBau: 110, conforto: 2,
    visual: 'base de pedra, chaminé fumegante e cerca' },
  { nivel: 4, nome: 'Sobrado com Varanda', custo: { madeira: 26, pedra: 18 }, trabalho: 4, capacidadeBau: 160, conforto: 3,
    visual: 'segundo andar, varanda e lampiões' },
  { nivel: 5, nome: 'Casarão da Vila', custo: { madeira: 40, pedra: 28 }, trabalho: 5, capacidadeBau: 240, conforto: 4,
    visual: 'torre de vigia, jardim e bandeira' }
];
const NIVEL_MAX = NIVEIS.length - 1;
const MATERIAIS = ['madeira', 'pedra'];
const RESERVA_PESSOAL = 4; // alimento/água que a pessoa mantém consigo ao guardar
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r1 = v => Math.round(num(v) * 10) / 10;

function nomePadrao(id) {
  try { return require('./espaco').nome(id); } catch (_) { return id; }
}

function idsDeCasas(estado) {
  const ids = new Set();
  try { for (const n of require('./espaco').locais()) if (String(n).startsWith('casa_')) ids.add(n); } catch (_) {}
  for (const s of Object.values(estado.seres || {})) if (s && typeof s.casa === 'string' && s.casa.startsWith('casa_')) ids.add(s.casa);
  return [...ids];
}

// Idempotente: cria/normaliza mundo.casas sem nunca rebaixar nível ou apagar baú.
function preparar(estado) {
  if (!estado || !estado.mundo) return estado;
  const casas = (estado.mundo.casas && typeof estado.mundo.casas === 'object') ? estado.mundo.casas : {};
  for (const id of idsDeCasas(estado)) {
    const c = casas[id] || {};
    c.id = id;
    c.nome ||= nomePadrao(id);
    c.nivel = Math.max(1, Math.min(NIVEL_MAX, Math.floor(num(c.nivel) || 1)));
    c.bau = c.bau && typeof c.bau === 'object' ? c.bau : {};
    for (const k of ['madeira', 'pedra', 'alimento', 'agua']) c.bau[k] = Math.max(0, num(c.bau[k]));
    if (c.obra && !(c.obra.paraNivel > c.nivel)) c.obra = null;
    if (c.obra) c.obra.progresso = Math.max(0, Math.min(100, num(c.obra.progresso)));
    c.obra ||= null;
    c.historico = Array.isArray(c.historico) ? c.historico.slice(-30) : [];
    casas[id] = c;
  }
  estado.mundo.casas = casas;
  return estado;
}

function moradoresDe(estado, casaId) {
  return Object.values(estado.seres || {}).filter(s => s && s.casa === casaId && s.status !== 'morto');
}

function infoNivel(n) { return NIVEIS[Math.max(1, Math.min(NIVEL_MAX, n))]; }

// Quanto falta (somando o que a pessoa carrega + o que está no baú).
function faltaPara(estado, casaId, ser) {
  const c = estado.mundo.casas && estado.mundo.casas[casaId];
  if (!c || c.nivel >= NIVEL_MAX) return null;
  const prox = NIVEIS[c.nivel + 1];
  const falta = {};
  for (const m of MATERIAIS) {
    const tem = num(c.bau[m]) + num(ser && ser.inventario && ser.inventario[m]);
    falta[m] = Math.max(0, Math.ceil(num(prox.custo[m]) - tem));
  }
  return { proximo: prox, falta, completo: MATERIAIS.every(m => falta[m] <= 0) };
}

function ehMinhaCasa(estado, ser) {
  return !!(ser && ser.casa && ser.local === ser.casa && estado.mundo.casas && estado.mundo.casas[ser.casa]);
}

// Ações oferecidas ao habitante dentro da própria casa.
function acoes(estado, ser) {
  const out = [];
  if (!ehMinhaCasa(estado, ser)) return out;
  const c = estado.mundo.casas[ser.casa];
  const inv = ser.inventario || {};
  const f = faltaPara(estado, ser.casa, ser);
  const meta = f ? ` (para a ${f.proximo.nome}: faltam ${f.falta.madeira} madeira e ${f.falta.pedra} pedra)` : '';
  const levaMaterial = num(inv.madeira) >= 1 || num(inv.pedra) >= 1;
  const sobraComida = num(inv.alimento) > RESERVA_PESSOAL + 1 || num(inv.agua) > RESERVA_PESSOAL + 1;
  const capN = infoNivel(c.nivel).capacidadeBau;
  const total = Object.values(c.bau).reduce((s, v) => s + num(v), 0);
  const podeMat = levaMaterial && total < capN - 0.5;
  const podeComida = sobraComida && total < capN - 0.5 && num(c.bau.alimento) + num(c.bau.agua) < capN / 2 - 0.5;
  if (podeMat || podeComida) out.push({ id: 'guardar_no_bau', descricao: 'Guardar madeira, pedra e mantimentos extras no baú da casa' + meta });
  if ((num(c.bau.alimento) >= 1 && num(inv.alimento) < 2) || (num(c.bau.agua) >= 1 && num(inv.agua) < 2))
    out.push({ id: 'pegar_do_bau', descricao: 'Pegar comida e água guardadas no baú da casa' });
  if (!c.obra && f && f.completo)
    out.push({ id: 'iniciar_ampliacao', descricao: `Iniciar a ampliação da casa para o Nível ${f.proximo.nivel}: ${f.proximo.nome} (${f.proximo.visual})` });
  if (c.obra)
    out.push({ id: 'trabalhar_ampliacao', descricao: `Trabalhar na obra de ampliação da casa (${Math.round(c.obra.progresso)}% rumo à ${infoNivel(c.obra.paraNivel).nome})` });
  return out;
}

const IDS = ['guardar_no_bau', 'pegar_do_bau', 'iniciar_ampliacao', 'trabalhar_ampliacao'];

function executar(estado, ser, id, r) {
  const c = estado.mundo.casas[ser.casa];
  const inv = ser.inventario;
  const ciclo = estado.mundo.tempo.ciclo;
  const cap = infoNivel(c.nivel).capacidadeBau;
  const totalBau = () => Object.values(c.bau).reduce((a, b) => a + num(b), 0);
  switch (id) {
    case 'guardar_no_bau': {
      const movido = {};
      const mover = (k, qtd) => {
        let espaco = Math.max(0, cap - totalBau());
        // mantimentos ocupam no máximo metade do baú: sempre sobra lugar p/ material de obra
        if (!MATERIAIS.includes(k)) espaco = Math.min(espaco, Math.max(0, cap / 2 - num(c.bau.alimento) - num(c.bau.agua)));
        const q = Math.min(Math.floor(qtd), Math.floor(espaco));
        if (q <= 0) return;
        inv[k] = num(inv[k]) - q; c.bau[k] = num(c.bau[k]) + q; movido[k] = q;
      };
      for (const m of MATERIAIS) mover(m, num(inv[m]));
      mover('alimento', num(inv.alimento) - RESERVA_PESSOAL);
      mover('agua', num(inv.agua) - RESERVA_PESSOAL);
      const partes = Object.entries(movido).map(([k, v]) => v + ' ' + k);
      r.quantidade = Object.values(movido).reduce((a, b) => a + b, 0);
      const f = faltaPara(estado, ser.casa, ser);
      r.texto = partes.length
        ? `Guardou no baú da casa: ${partes.join(', ')}.` + (f ? (f.completo ? ` Já há material para ampliar para ${f.proximo.nome}!` : ` Para ampliar ainda faltam ${f.falta.madeira} madeira e ${f.falta.pedra} pedra.`) : '')
        : 'O baú está cheio; não coube mais nada.';
      ser.necessidades.satisfacao = Math.min(100, num(ser.necessidades.satisfacao) + 4);
      r.casa = { id: c.id, bau: { ...c.bau } };
      break;
    }
    case 'pegar_do_bau': {
      const pegou = {};
      for (const k of ['alimento', 'agua']) {
        const q = Math.min(3, Math.floor(num(c.bau[k])));
        if (q > 0) { c.bau[k] -= q; inv[k] = num(inv[k]) + q; pegou[k] = q; }
      }
      r.quantidade = Object.values(pegou).reduce((a, b) => a + b, 0);
      r.texto = 'Pegou do baú: ' + (Object.entries(pegou).map(([k, v]) => v + ' ' + k).join(', ') || 'nada');
      break;
    }
    case 'iniciar_ampliacao': {
      const prox = NIVEIS[c.nivel + 1];
      for (const m of MATERIAIS) {
        let resta = num(prox.custo[m]);
        const daMao = Math.min(resta, num(inv[m])); inv[m] = num(inv[m]) - daMao; resta -= daMao;
        c.bau[m] = Math.max(0, num(c.bau[m]) - resta);
      }
      c.obra = { paraNivel: prox.nivel, progresso: 0, inicioCiclo: ciclo, iniciadaPor: ser.id, trabalhadores: [ser.id] };
      ser.necessidades.satisfacao = Math.min(100, num(ser.necessidades.satisfacao) + 10);
      r.quantidade = 1;
      r.texto = `Separou ${prox.custo.madeira} madeira e ${prox.custo.pedra} pedra e marcou o terreno: começou a obra da ${prox.nome}!`;
      r.casa = { id: c.id, obra: { ...c.obra } };
      break;
    }
    case 'trabalhar_ampliacao': {
      const alvo = infoNivel(c.obra.paraNivel);
      const ajudantes = Object.values(estado.seres || {}).filter(o => o.id !== ser.id && o.status !== 'morto' && o.local === ser.local).length;
      const avanco = Math.round((100 / alvo.trabalho) * (0.8 + Math.random() * 0.4) + ajudantes * 8);
      c.obra.progresso = Math.min(100, num(c.obra.progresso) + avanco);
      if (!c.obra.trabalhadores.includes(ser.id)) c.obra.trabalhadores.push(ser.id);
      ser.necessidades.energia = Math.max(0, num(ser.necessidades.energia) - 10);
      r.quantidade = avanco;
      if (c.obra.progresso >= 100) {
        c.nivel = alvo.nivel;
        c.historico.push({ ciclo, nivel: alvo.nivel, nome: alvo.nome, por: [...c.obra.trabalhadores] });
        c.obra = null;
        ser.necessidades.satisfacao = Math.min(100, num(ser.necessidades.satisfacao) + 30);
        if (ser.necessidades.pertencimento != null) ser.necessidades.pertencimento = Math.min(100, num(ser.necessidades.pertencimento) + 20);
        r.texto = `🏠 A casa cresceu! Agora é a ${alvo.nome} (Nível ${alvo.nivel}): ${alvo.visual}.`;
        r.casaAmpliada = { id: c.id, nivel: alvo.nivel, nome: alvo.nome };
      } else {
        ser.necessidades.satisfacao = Math.min(100, num(ser.necessidades.satisfacao) + 8);
        r.texto = `Ergueu paredes e encaixou vigas na ampliação (${Math.round(c.obra.progresso)}% da ${alvo.nome}).`;
      }
      break;
    }
  }
  return r;
}

// Conforto: descansar numa casa maior recupera mais e dá mais segurança.
function bonusDescanso(estado, ser) {
  if (!ehMinhaCasa(estado, ser)) return;
  const conf = infoNivel(estado.mundo.casas[ser.casa].nivel).conforto;
  if (!conf) return;
  const n = ser.necessidades;
  if (n.sono != null) n.sono = Math.max(0, num(n.sono) - conf * 4);
  if (n.energia != null) n.energia = Math.min(100, num(n.energia) + conf * 3);
  if (n.seguranca != null) n.seguranca = Math.min(100, num(n.seguranca) + conf * 3);
}

// Texto curto para o prompt do cérebro (o que o habitante sabe da própria casa).
function resumo(estado, ser) {
  const c = estado.mundo.casas && ser && estado.mundo.casas[ser.casa];
  if (!c) return null;
  const n = infoNivel(c.nivel);
  const linhas = [`minha casa: ${c.nome} [${c.id}] — Nível ${c.nivel} (${n.nome})`,
    `baú da casa: madeira=${r1(c.bau.madeira)}, pedra=${r1(c.bau.pedra)}, alimento=${r1(c.bau.alimento)}, água=${r1(c.bau.agua)} (capacidade ${n.capacidadeBau})`];
  if (c.obra) linhas.push(`obra em andamento: ${Math.round(c.obra.progresso)}% rumo à ${infoNivel(c.obra.paraNivel).nome} — trabalhar nela só em casa ("trabalhar_ampliacao")`);
  else {
    const f = faltaPara(estado, c.id, ser);
    if (f) linhas.push(`ampliar para Nível ${f.proximo.nivel} (${f.proximo.nome}: ${f.proximo.visual}) custa ${f.proximo.custo.madeira} madeira + ${f.proximo.custo.pedra} pedra. ` +
      (f.completo ? 'JÁ TEMOS o material: dá para "iniciar_ampliacao" em casa.' : `Faltam ${f.falta.madeira} madeira e ${f.falta.pedra} pedra — madeira se corta na floresta/bosque, pedra se coleta no rio/cachoeira/caverna; depois "guardar_no_bau" em casa.`));
    else linhas.push('a casa já está no nível máximo.');
  }
  return linhas.join('\n');
}

module.exports = { NIVEIS, NIVEL_MAX, IDS, preparar, acoes, executar, faltaPara, resumo, bonusDescanso, moradoresDe, infoNivel };

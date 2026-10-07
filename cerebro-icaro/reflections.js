const fs = require('fs');
const path = require('path');

const DIARIO = path.join(__dirname, 'diario.jsonl');
const OUT = path.join(__dirname, 'reflections.json');

const STOP = new Set([
  'ainda','alias','algo','algum','alguma','alguem','aqui','aquilo','assim','ate',
  'bem','bom','cada','coisa','coisas','comigo','como','conosco','contra','depois',
  'desde','dessa','desse','desta','deste','disso','disto','dizer','entao','entre',
  'essa','essas','esse','esses','esta','estao','estar','estas','estes','estou',
  'fazer','foram','fosse','hoje','isso','isto','junto','lugar','mais','maneira',
  'menos','mesmo','modo','muito','muita','muitas','muitos','nada','nossa','nosso',
  'nunca','outra','outro','outras','outros','para','parece','parte','pela','pelo',
  'pode','podem','poder','pois','porque','primeiro','qual','quando','quanto','quase',
  'quer','queria','sempre','sobre','talvez','tambem','tanto','tinha','toda','todas',
  'todo','todos','tudo','vezes','voce','voces',
  'tenho','tem','teve','gosta','gostar','gostaria','gosto','trabalha','trabalhar',
  'compartilhar','compartilha','disse','digo','falar','fala','falou','preciso','precisa',
  'quero','querer','faz','fez','vai','vem','vim','posso','poderia','sabe','sabia',
  'conhece','conheco','conhecia','entendi','aprendido','gravado',
  'claro','perfeito','verdade','certeza','exemplo','agora','apos','antes'
]);

// POS v2: cobertura morfologica (radicais + flexoes de genero/numero)
const POS = /\b(?:gosto|adoro|amo|prefiro|gostaria|aprecio)\b|bonit[oa]s?|interessant[ei]s?|fascinant[ei]s?|incr[ií]ve(l|is)|[oó]tim[oa]s?|lega(l|is)|divertid[oa]s?|valios[oa]s?|[uú]t(eis|il)|important[ei]s?|maravilhos[oa]s?|extraordin[áa]ri[oa]s?|bacana(s)?/i;
const ABSENCE = /^(nao|não)\s+(tenho|sei|posso)|^nao tenho registro|^nao sei\b|^nao consigo\b|^nao consegui\b/i;
const CJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;

function semAcento(s) {
  return String(s || '').toLowerCase().normalize('NFD').split('').filter(c => {
    const x = c.charCodeAt(0);
    return !(x >= 768 && x <= 879);
  }).join('');
}

function tokens(texto) {
  const norm = semAcento(texto);
  return [...new Set(norm.match(/[a-z]{5,}/g) || [])].filter(t => !STOP.has(t));
}

if (!fs.existsSync(DIARIO)) {
  console.log('ERRO: diario.jsonl nao existe');
  process.exit(1);
}

const linhas = fs.readFileSync(DIARIO, 'utf8').split('\n').filter(l => l.trim());
const entradas = [];

// REFINO 02/10/2026 v2: posicao propria = 1a pessoa como SUJEITO da opiniao
const TEM_1PESSOA = /\b(eu|me|mim|meu|minha)\b/i;
const TEM_PERSPECTIVA = /\b(para mim|na minha visao|na minha visão|na minha opiniao|na minha opinião|eu diria|eu considero|eu vejo|eu acho|eu penso|ao meu ver)\b/i;
const SUJEITO_DONO = /\b(voc[eê]\s+(gosta|tem|mora|trabalha|faz|ama|prefere|adora|e|é)|seu\s+\w+|sua\s+\w+|voc[eê]\s+\w+\s+(gosta|tem|mora|trabalha|faz))/i;

for (const l of linhas) {
  try {
    const e = JSON.parse(l);
    if (!e.resposta_icaro || !e.entrada_dono) continue;
    const r = String(e.resposta_icaro).trim();
    if (r.length < 15) continue;
    if (CJK.test(r)) continue;
    if (ABSENCE.test(r)) continue;
    const tem1 = TEM_1PESSOA.test(r);
    const temPersp = TEM_PERSPECTIVA.test(r);
    if (!tem1 && !temPersp) continue;
    if (SUJEITO_DONO.test(r)) continue;
    entradas.push({
      quando: e.quando || '',
      dia: String(e.quando || '').slice(0, 10),
      resposta: r,
      tokens: tokens(r),
      afirmativa: POS.test(r)
    });
  } catch (err) {}
}

console.log('Entradas validas: ' + entradas.length);

const mapa = new Map();
for (let i = 0; i < entradas.length; i++) {
  for (const t of entradas[i].tokens) {
    if (!mapa.has(t)) mapa.set(t, new Set());
    mapa.get(t).add(i);
  }
}

const candidatos = [];
for (const [tok, idxs] of mapa) {
  if (idxs.size >= 2) candidatos.push({ topico: tok, idxs });
}

candidatos.sort((a, b) => b.idxs.size - a.idxs.size);
const mantidos = [];
for (const c of candidatos) {
  let overlap = false;
  for (const m of mantidos) {
    let inter = 0;
    for (const i of c.idxs) if (m.idxs.has(i)) inter++;
    const ratio = inter / Math.min(c.idxs.size, m.idxs.size);
    if (ratio >= 0.7) { overlap = true; break; }
  }
  if (!overlap) mantidos.push(c);
}

const out = [];
for (const c of mantidos) {
  const idxs = [...c.idxs];
  const dias = new Set(idxs.map(i => entradas[i].dia)).size;
  const positivas = idxs.filter(i => entradas[i].afirmativa).length;
  const confianca = Number((positivas / idxs.length).toFixed(2));
  const threshold = idxs.length >= 3 && dias >= 2 && confianca >= 0.7;
  out.push({
    topico: c.topico,
    ocorrencias: idxs.length,
    dias_distintos: dias,
    confianca,
    nivel: threshold ? 'reflection' : 'candidate',
    threshold_satisfeito: threshold,
    primeira: entradas[Math.min(...idxs)].quando,
    ultima: entradas[Math.max(...idxs)].quando,
    afirmacoes: idxs.slice(0, 5).map(i => entradas[i].resposta.replace(/\s+/g, ' ').slice(0, 150))
  });
}

out.sort((a, b) => b.ocorrencias - a.ocorrencias);
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

console.log('Reflections (threshold): ' + out.filter(o => o.threshold_satisfeito).length);
console.log('Candidates: ' + out.filter(o => !o.threshold_satisfeito).length);
console.log('Total topicos: ' + out.length);
console.log('Arquivo: ' + OUT);
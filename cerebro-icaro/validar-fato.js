// validar-fato.js — Validação na entrada de fatos
// Impede lixo de entrar na memória

function normalizar(t) {
  return String(t || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Palavras que NUNCA podem ser nome de pessoa
const NOMES_PROIBIDOS = [
  'voce', 'voces', 'sim', 'nao', 'talvez', 'ok', 'oqoue',
  'isso', 'aquilo', 'ele', 'ela', 'nos', 'eu', 'me', 'mim',
  'o', 'a', 'os', 'as', 'um', 'uma'
];

// Frases vazias ou genéricas que não podem virar fato
const FRASES_PROIBIDAS = [
  'ensinado pelo dono: ,',
  'ensinado pelo dono: .',
  'so um modelo sim',
  'eu sou a lara',
  'eu sou o rafael'
];

function validarFato(fato) {
  const problemas = [];

  // 1. Estrutura mínima
  if (!fato || typeof fato !== 'object') {
    return { ok: false, problemas: ['nao_objeto'] };
  }
  if (!fato.texto || typeof fato.texto !== 'string') {
    return { ok: false, problemas: ['sem_texto'] };
  }

  const texto = fato.texto.trim();
  const textoNorm = normalizar(texto);

  // 2. Texto mínimo
  const minLen = (String(fato.origem || '').toLowerCase() === 'dono') ? 8 : 15;
  if (texto.length < minLen) {
    problemas.push('texto_curto');
  }

  // 3. Frase proibida
  for (const fp of FRASES_PROIBIDAS) {
    if (textoNorm.includes(normalizar(fp))) {
      problemas.push('frase_proibida:' + fp);
    }
  }

  // 4. Nome proibido (extrair nomes próprios capitalizados)
  //    Se tem capitalizado no final e é palavra genérica → rejeita
  const nomes = texto.match(/\b[A-ZÀ-Ú][a-zà-ú]+\b/g) || [];
  for (const nome of nomes) {
    if (NOMES_PROIBIDOS.includes(normalizar(nome))) {
      problemas.push('nome_proibido:' + nome);
    }
  }

  // 5. Origem obrigatória
  const origem = String(fato.origem || '').toLowerCase();
  if (!origem) {
    problemas.push('sem_origem');
  }
  // Só 'dono' grava fato direto
  if (origem && origem !== 'dono' && origem !== 'deteccao_ensinamento') {
    problemas.push('origem_nao_autorizada:' + origem);
  }

  // 6. Inversão de sujeito (Ícaro dizendo que é o dono, etc.)
  if (/\b(eu sou o usuario|meu nome e o usuario|me chamo o usuario)\b/.test(textoNorm)) {
    problemas.push('inversao_sujeito');
  }
  if (/\bo dono (e|eh) minha (irma|filha|mae|esposa)\b/.test(textoNorm)) {
    problemas.push('inversao_relacao');
  }

  return {
    ok: problemas.length === 0,
    problemas
  };
}

module.exports = { validarFato };
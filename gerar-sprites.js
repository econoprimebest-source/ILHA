/**
 * GERADOR DE SPRITES SVG RICOS E DETALHADOS PARA A ILHA AURORA
 * Cria os assets vetoriais de alta definição em assets/sprites/
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'assets', 'sprites');
fs.mkdirSync(DIR, { recursive: true });

function salvar(nome, svg) {
  const p = path.join(DIR, nome);
  fs.writeFileSync(p, svg.trim(), 'utf8');
  console.log(`[SPRITE] Criado: ${nome} (${svg.length} bytes)`);
}

// ============================================================================
// 1. HABITANTES (HUMANOIDES RPG TOP-DOWN / ISOMÉTRICO)
// ============================================================================
function svgHumanoide({ nome, tunica, tunicaEscura, cinto, cabelo, pele, botas, capa, ferramenta, walk = false }) {
  const passoL = walk ? 4 : 0;
  const passoR = walk ? -4 : 0;
  const bob = walk ? 2 : 0;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80" width="64" height="80">
  <defs>
    <radialGradient id="sombra" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="peleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${pele}"/>
      <stop offset="100%" stop-color="#d49a7a"/>
    </linearGradient>
    <linearGradient id="tunicaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${tunica}"/>
      <stop offset="100%" stop-color="${tunicaEscura}"/>
    </linearGradient>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Sombra no Chão -->
  <ellipse cx="32" cy="74" rx="20" ry="6" fill="url(#sombra)"/>

  <!-- Capa nas Costas -->
  <path d="M22,${26 - bob} Q32,${24 - bob} 42,${26 - bob} L46,${58 - bob} Q32,${63 - bob} 18,${58 - bob} Z" fill="${capa}" opacity="0.9" filter="url(#drop)"/>

  <!-- Pernas e Botas -->
  <!-- Perna Esquerda -->
  <rect x="23" y="${52 - bob + passoL}" width="7" height="18" rx="3" fill="${botas}"/>
  <!-- Perna Direita -->
  <rect x="34" y="${52 - bob + passoR}" width="7" height="18" rx="3" fill="${botas}"/>
  <!-- Solas -->
  <rect x="21" y="${67 - bob + passoL}" width="9" height="4" rx="2" fill="#111827"/>
  <rect x="34" y="${67 - bob + passoR}" width="9" height="4" rx="2" fill="#111827"/>

  <!-- Túnica Principal -->
  <path d="M20,${28 - bob} Q32,${26 - bob} 44,${28 - bob} L46,${54 - bob} Q32,${58 - bob} 18,${54 - bob} Z" fill="url(#tunicaGrad)" filter="url(#drop)"/>
  <line x1="32" y1="${28 - bob}" x2="32" y2="${55 - bob}" stroke="${tunicaEscura}" stroke-width="2"/>

  <!-- Cinto de Couro -->
  <rect x="18" y="${40 - bob}" width="28" height="6" rx="2" fill="${cinto}"/>
  <rect x="29" y="${39 - bob}" width="6" height="8" rx="1.5" fill="#fef08a" stroke="#b45309" stroke-width="1"/>

  <!-- Braço Esquerdo -->
  <rect x="14" y="${30 - bob - passoL * 0.5}" width="6" height="16" rx="3" fill="url(#tunicaGrad)"/>
  <circle cx="17" cy="${48 - bob - passoL * 0.5}" r="3.5" fill="url(#peleGrad)"/>

  <!-- Braço Direito (com Ferramenta se houver) -->
  <rect x="44" y="${30 - bob - passoR * 0.5}" width="6" height="16" rx="3" fill="url(#tunicaGrad)"/>
  <circle cx="47" cy="${48 - bob - passoR * 0.5}" r="3.5" fill="url(#peleGrad)"/>

  <!-- Ferramenta na Mão Direita -->
  ${ferramenta === 'machado' ? `
    <!-- Cabo do Machado -->
    <rect x="49" y="${22 - bob}" width="3.5" height="34" rx="1" fill="#78350f" transform="rotate(15 49 38)"/>
    <!-- Lâmina de Bronze -->
    <path d="M47,${22 - bob} L58,${16 - bob} Q62,${24 - bob} 56,${30 - bob} L48,${26 - bob} Z" fill="#d97706" stroke="#78350f" stroke-width="1"/>
  ` : ferramenta === 'lanca' ? `
    <!-- Lança de Madeira e Ponta de Pedra -->
    <rect x="49" y="${12 - bob}" width="3" height="48" rx="1" fill="#78350f" transform="rotate(8 49 36)"/>
    <polygon points="50,${10 - bob} 46,${20 - bob} 54,${20 - bob}" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  ` : ferramenta === 'enxada' ? `
    <!-- Cabo da Enxada -->
    <rect x="49" y="${20 - bob}" width="3.5" height="38" rx="1" fill="#78350f" transform="rotate(-12 49 38)"/>
    <rect x="42" y="${18 - bob}" width="14" height="4" rx="1" fill="#64748b"/>
  ` : `
    <!-- Tocha Rústica Acesa -->
    <rect x="49" y="${32 - bob}" width="4" height="22" rx="1" fill="#78350f"/>
    <ellipse cx="51" cy="${28 - bob}" rx="5" ry="7" fill="#f59e0b"/>
    <ellipse cx="51" cy="${27 - bob}" rx="3" ry="5" fill="#fef08a"/>
  `}

  <!-- Pescoço -->
  <rect x="29" y="${22 - bob}" width="6" height="7" rx="2" fill="url(#peleGrad)"/>

  <!-- Cabeça e Rosto -->
  <ellipse cx="32" cy="${18 - bob}" rx="10" ry="11" fill="url(#peleGrad)" filter="url(#drop)"/>

  <!-- Cabelo Detalhado -->
  <path d="M22,${16 - bob} Q32,${6 - bob} 42,${16 - bob} Q44,${24 - bob} 42,${20 - bob} Q32,${14 - bob} 22,${20 - bob} Z" fill="${cabelo}"/>
  ${nome === 'Lara' ? `
    <!-- Trança Longa Lateral Dourada -->
    <path d="M22,${18 - bob} Q16,${28 - bob} 20,${38 - bob} Q18,${46 - bob} 22,${52 - bob}" stroke="${cabelo}" stroke-width="4" stroke-linecap="round" fill="none"/>
    <circle cx="22" cy="${52 - bob}" r="2.5" fill="#a855f7"/>
  ` : nome === 'Maria' ? `
    <!-- Coque / Cabelo Preso -->
    <circle cx="32" cy="${7 - bob}" r="5" fill="${cabelo}"/>
  ` : ''}

  <!-- Olhos e Expressão -->
  <ellipse cx="28" cy="${18 - bob}" rx="1.5" ry="2" fill="#0f172a"/>
  <ellipse cx="36" cy="${18 - bob}" rx="1.5" ry="2" fill="#0f172a"/>
  <circle cx="28.5" cy="${17.5 - bob}" r="0.5" fill="#ffffff"/>
  <circle cx="36.5" cy="${17.5 - bob}" r="0.5" fill="#ffffff"/>

  <!-- Boca Expressiva -->
  <path d="M30,${23 - bob} Q32,${25 - bob} 34,${23 - bob}" stroke="#991b1b" stroke-width="1" fill="none"/>
</svg>
`;
}

// Gera os 4 Habitantes (Idle + Walk)
const HABITANTES_DATA = {
  icaro: { nome: 'Ícaro', tunica: '#15803d', tunicaEscura: '#166534', cinto: '#fbbf24', cabelo: '#451a03', pele: '#f5d0b5', botas: '#292524', capa: '#16a34a', ferramenta: 'machado' },
  lara:  { nome: 'Lara', tunica: '#7c3aed', tunicaEscura: '#6d28d9', cinto: '#fef08a', cabelo: '#facc15', pele: '#fde0cf', botas: '#3b0764', capa: '#a855f7', ferramenta: 'tocha' },
  joao:  { nome: 'João', tunica: '#0284c7', tunicaEscura: '#0369a1', cinto: '#ffffff', cabelo: '#1e293b', pele: '#fbd0b5', botas: '#1c1917', capa: '#38bdf8', ferramenta: 'lanca' },
  maria: { nome: 'Maria', tunica: '#e11d48', tunicaEscura: '#be123c', cinto: '#fde047', cabelo: '#713f12', pele: '#fde0cf', botas: '#451a03', capa: '#f43f5e', ferramenta: 'enxada' }
};

Object.entries(HABITANTES_DATA).forEach(([id, data]) => {
  salvar(`${id}.svg`, svgHumanoide({ ...data, walk: false }));
  salvar(`${id}_walk.svg`, svgHumanoide({ ...data, walk: true }));
});

// ============================================================================
// 2. PREDADORES: PANTERA DAS SOMBRAS & TUBARÃO DOS RECIFES
// ============================================================================
// Pantera Anatômica (Felino muscular esgueirando-se)
const svgPantera = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 50" width="90" height="50">
  <defs>
    <radialGradient id="sombraPantera" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="peloPele" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>

  <!-- Sombra no Chão -->
  <ellipse cx="45" cy="44" rx="34" ry="5.5" fill="url(#sombraPantera)"/>

  <!-- Pata Traseira Direita -->
  <path d="M22,26 Q18,36 14,44 L19,44 Q24,36 27,28 Z" fill="#090d16"/>
  <!-- Pata Dianteira Direita -->
  <path d="M58,26 Q60,35 64,44 L68,44 Q65,34 62,24 Z" fill="#090d16"/>

  <!-- Cauda Longa Sinuosa com Curva Fina -->
  <path d="M14,24 Q6,20 4,12 Q2,4 8,2 Q12,2 10,8 Q8,16 18,22 Z" fill="#090d16"/>

  <!-- Tronco Muscular Arqueado -->
  <path d="M18,22 Q24,14 42,16 Q58,16 66,20 Q68,26 62,32 Q44,36 26,32 Q18,28 18,22 Z" fill="url(#peloPele)"/>

  <!-- Pata Traseira Esquerda (Primeiro plano) -->
  <path d="M26,24 Q20,32 22,44 L27,44 Q28,34 32,28 Z" fill="url(#peloPele)"/>
  <ellipse cx="25" cy="44" rx="3.5" ry="2" fill="#020617"/>

  <!-- Pata Dianteira Esquerda (Primeiro plano) -->
  <path d="M54,24 Q52,34 54,44 L60,44 Q60,34 60,24 Z" fill="url(#peloPele)"/>
  <ellipse cx="57" cy="44" rx="3.5" ry="2" fill="#020617"/>

  <!-- Pescoço e Cabeça de Felino Predador -->
  <path d="M64,18 Q72,12 80,18 Q84,24 78,28 Q70,30 64,24 Z" fill="url(#peloPele)"/>

  <!-- Focinho -->
  <path d="M78,19 Q86,21 82,26 Q77,27 76,23 Z" fill="#090d16"/>
  <circle cx="82" cy="22" r="1.5" fill="#f43f5e"/> <!-- Nariz -->

  <!-- Orelhas Afiadas de Pantera -->
  <polygon points="72,14 74,8 78,14" fill="#090d16"/>
  <polygon points="74,13 75,10 77,13" fill="#f43f5e"/>
  <polygon points="68,16 69,11 73,16" fill="#1e293b"/>

  <!-- Olhos Dourados Brilhantes -->
  <ellipse cx="76" cy="19" rx="2.5" ry="2" fill="#fbbf24"/>
  <line x1="76" y1="17.5" x2="76" y2="20.5" stroke="#000000" stroke-width="1.2"/>
</svg>
`;
salvar('pantera.svg', svgPantera);

// Tubarão Hidrodinâmico Anatômico (vista lateral com barbatanas elegantes)
const svgTubarao = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 46" width="100" height="46">
  <defs>
    <linearGradient id="tubaraoCorpo" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="55%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="marReflexo" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Ondulação de Água ao Redor -->
  <ellipse cx="50" cy="24" rx="46" ry="16" fill="url(#marReflexo)"/>

  <!-- Barbatana Caudal (Rabo em foice clássico) -->
  <path d="M18,22 Q10,12 2,4 Q10,20 16,23 Q10,28 4,40 Q12,32 18,26 Z" fill="#1e293b"/>

  <!-- Barbatana Dorsal Secundária -->
  <polygon points="26,20 22,14 30,20" fill="#1e293b"/>

  <!-- Corpo Hidrodinâmico do Tubarão -->
  <path d="M18,24 Q28,14 56,14 Q80,16 96,24 Q86,34 56,34 Q28,32 18,24 Z" fill="url(#tubaraoCorpo)"/>

  <!-- Barbatana Dorsal Triangular Icônica -->
  <path d="M46,14 Q52,2 58,2 Q56,10 64,14 Z" fill="#0f172a"/>

  <!-- Barbatana Peitoral -->
  <path d="M52,28 Q44,42 36,44 Q42,34 58,30 Z" fill="#1e293b"/>

  <!-- Guelras Laterais (3 ranhuras curvas) -->
  <path d="M68,20 Q67,24 68,28" stroke="#0f172a" stroke-width="1.2" fill="none"/>
  <path d="M71,20 Q70,24 71,28" stroke="#0f172a" stroke-width="1.2" fill="none"/>
  <path d="M74,21 Q73,24 74,27" stroke="#0f172a" stroke-width="1.2" fill="none"/>

  <!-- Olho Frio do Predador -->
  <circle cx="86" cy="21" r="2" fill="#020617"/>
  <circle cx="86.5" cy="20.5" r="0.6" fill="#ffffff"/>

  <!-- Linha da Boca -->
  <path d="M84,27 Q89,28 92,26" stroke="#0f172a" stroke-width="1.2" fill="none"/>
</svg>
`;
salvar('tubarao.svg', svgTubarao);

// ============================================================================
// 3. CANTEIROS DA FAZENDA (4 ESTÁGIOS REAIS E VIVOS)
// ============================================================================
// Estágio 1: Canteiro Arado (Terra preta fértil com sulcos profundos)
const svgCanteiroArado = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50">
  <defs>
    <linearGradient id="terraArada" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3e2112"/>
      <stop offset="100%" stop-color="#241207"/>
    </linearGradient>
  </defs>
  <!-- Borda do Canteiro de Madeira Rústica -->
  <rect x="4" y="4" width="92" height="42" rx="4" fill="#5c2e0b" stroke="#381a05" stroke-width="2"/>
  <!-- Camada de Terra Fértil Úmida -->
  <rect x="7" y="7" width="86" height="36" rx="2" fill="url(#terraArada)"/>
  <!-- 4 Sulcos de Plantio com Sombra -->
  <path d="M12,14 L88,14" stroke="#170a03" stroke-width="4" stroke-linecap="round"/>
  <path d="M12,22 L88,22" stroke="#170a03" stroke-width="4" stroke-linecap="round"/>
  <path d="M12,30 L88,30" stroke="#170a03" stroke-width="4" stroke-linecap="round"/>
  <path d="M12,38 L88,38" stroke="#170a03" stroke-width="4" stroke-linecap="round"/>
  <!-- Destaques de Terra Escavada -->
  <line x1="12" y1="12" x2="88" y2="12" stroke="#5a3118" stroke-width="1"/>
  <line x1="12" y1="20" x2="88" y2="20" stroke="#5a3118" stroke-width="1"/>
  <line x1="12" y1="28" x2="88" y2="28" stroke="#5a3118" stroke-width="1"/>
  <line x1="12" y1="36" x2="88" y2="36" stroke="#5a3118" stroke-width="1"/>
</svg>
`;
salvar('canteiro_arado.svg', svgCanteiroArado);

// Estágio 2: Canteiro com Brotos (Pequenas folhas verdes brotando dos sulcos)
const svgCanteiroBroto = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50">
  ${svgCanteiroArado.replace('</svg>', '')}
  <!-- Pequenos Brotos Verdes de Folhagem Emergente -->
  <g fill="#4ade80" stroke="#15803d" stroke-width="0.8">
    <!-- Linha 1 -->
    <path d="M20,13 Q18,9 15,11 Q17,14 20,13 Q22,9 25,11 Q23,14 20,13 Z"/>
    <path d="M38,13 Q36,9 33,11 Q35,14 38,13 Q40,9 43,11 Q41,14 38,13 Z"/>
    <path d="M56,13 Q54,9 51,11 Q53,14 56,13 Q58,9 61,11 Q59,14 56,13 Z"/>
    <path d="M74,13 Q72,9 69,11 Q71,14 74,13 Q76,9 79,11 Q77,14 74,13 Z"/>
    <!-- Linha 2 -->
    <path d="M26,21 Q24,17 21,19 Q23,22 26,21 Q28,17 31,19 Q29,22 26,21 Z"/>
    <path d="M44,21 Q42,17 39,19 Q41,22 44,21 Q46,17 49,19 Q47,22 44,21 Z"/>
    <path d="M62,21 Q60,17 57,19 Q59,22 62,21 Q64,17 67,19 Q65,22 62,21 Z"/>
    <path d="M80,21 Q78,17 75,19 Q77,22 80,21 Q82,17 85,19 Q83,22 80,21 Z"/>
    <!-- Linha 3 -->
    <path d="M20,29 Q18,25 15,27 Q17,30 20,29 Q22,25 25,27 Q23,30 20,29 Z"/>
    <path d="M38,29 Q36,25 33,27 Q35,30 38,29 Q40,25 43,27 Q41,30 38,29 Z"/>
    <path d="M56,29 Q54,25 51,27 Q53,30 56,29 Q58,25 61,27 Q59,30 56,29 Z"/>
    <path d="M74,29 Q72,25 69,27 Q71,30 74,29 Q76,25 79,27 Q77,30 74,29 Z"/>
    <!-- Linha 4 -->
    <path d="M26,37 Q24,33 21,35 Q23,38 26,37 Q28,33 31,35 Q29,38 26,37 Z"/>
    <path d="M44,37 Q42,33 39,35 Q41,38 44,37 Q46,33 49,35 Q47,38 44,37 Z"/>
    <path d="M62,37 Q60,33 57,35 Q59,38 62,37 Q64,33 67,35 Q65,38 62,37 Z"/>
    <path d="M80,37 Q78,33 75,35 Q77,38 80,37 Q82,33 85,35 Q83,38 80,37 Z"/>
  </g>
</svg>
`;
salvar('canteiro_broto.svg', svgCanteiroBroto);

// Estágio 3: Canteiro Maduro (Folhagem verde densa + Cenouras e Raízes laranjas despontando)
const svgCanteiroMaduro = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50">
  ${svgCanteiroArado.replace('</svg>', '')}
  <!-- Vegetais Maduros Despontando da Terra -->
  <g>
    <!-- Cenouras visíveis na terra -->
    <ellipse cx="20" cy="14" rx="4" ry="3" fill="#ea580c"/>
    <ellipse cx="38" cy="14" rx="4.5" ry="3.5" fill="#f97316"/>
    <ellipse cx="56" cy="14" rx="4" ry="3" fill="#ea580c"/>
    <ellipse cx="74" cy="14" rx="4.5" ry="3.5" fill="#f97316"/>

    <ellipse cx="26" cy="22" rx="4.5" ry="3.5" fill="#f97316"/>
    <ellipse cx="44" cy="22" rx="4" ry="3" fill="#ea580c"/>
    <ellipse cx="62" cy="22" rx="4.5" ry="3.5" fill="#f97316"/>
    <ellipse cx="80" cy="22" rx="4" ry="3" fill="#ea580c"/>

    <ellipse cx="20" cy="30" rx="4" ry="3" fill="#ea580c"/>
    <ellipse cx="38" cy="30" rx="4.5" ry="3.5" fill="#f97316"/>
    <ellipse cx="56" cy="30" rx="4" ry="3" fill="#ea580c"/>
    <ellipse cx="74" cy="30" rx="4.5" ry="3.5" fill="#f97316"/>

    <ellipse cx="26" cy="38" rx="4.5" ry="3.5" fill="#f97316"/>
    <ellipse cx="44" cy="38" rx="4" ry="3" fill="#ea580c"/>
    <ellipse cx="62" cy="38" rx="4.5" ry="3.5" fill="#f97316"/>
    <ellipse cx="80" cy="38" rx="4" ry="3" fill="#ea580c"/>
  </g>

  <!-- Folhagem Exuberante das Cenouras -->
  <g fill="#15803d" stroke="#166534" stroke-width="0.8">
    <!-- Ramas Densas Linha 1 -->
    <path d="M20,12 Q14,4 10,7 Q16,11 20,12 Q20,3 24,5 Q22,10 20,12 Q28,6 26,11 Z"/>
    <path d="M38,12 Q32,4 28,7 Q34,11 38,12 Q38,3 42,5 Q40,10 38,12 Q46,6 44,11 Z"/>
    <path d="M56,12 Q50,4 46,7 Q52,11 56,12 Q56,3 60,5 Q58,10 56,12 Q64,6 62,11 Z"/>
    <path d="M74,12 Q68,4 64,7 Q70,11 74,12 Q74,3 78,5 Q76,10 74,12 Q82,6 80,11 Z"/>
    <!-- Ramas Densas Linha 2 -->
    <path d="M26,20 Q20,12 16,15 Q22,19 26,20 Q26,11 30,13 Q28,18 26,20 Q34,14 32,19 Z"/>
    <path d="M44,20 Q38,12 34,15 Q40,19 44,20 Q44,11 48,13 Q46,18 44,20 Q52,14 50,19 Z"/>
    <path d="M62,20 Q56,12 52,15 Q58,19 62,20 Q62,11 66,13 Q64,18 62,20 Q70,14 68,19 Z"/>
    <path d="M80,20 Q74,12 70,15 Q76,19 80,20 Q80,11 84,13 Q82,18 80,20 Q88,14 86,19 Z"/>
    <!-- Ramas Densas Linha 3 -->
    <path d="M20,28 Q14,20 10,23 Q16,27 20,28 Q20,19 24,21 Q22,26 20,28 Q28,22 26,27 Z"/>
    <path d="M38,28 Q32,20 28,23 Q34,27 38,28 Q38,19 42,21 Q40,26 38,28 Q46,22 44,27 Z"/>
    <path d="M56,28 Q50,20 46,23 Q52,27 56,28 Q56,19 60,21 Q58,26 56,28 Q64,22 62,27 Z"/>
    <path d="M74,28 Q68,20 64,23 Q70,27 74,28 Q74,19 78,21 Q76,26 74,28 Q82,22 80,27 Z"/>
  </g>
</svg>
`;
salvar('canteiro_maduro.svg', svgCanteiroMaduro);

// Estágio 4: Canteiro Colhido (Terra revolvida + Cestos de vime com cenouras colhidas)
const svgCanteiroColhido = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50">
  ${svgCanteiroArado.replace('</svg>', '')}
  <!-- Buracos da Colheita Recente -->
  <ellipse cx="22" cy="15" rx="5" ry="3" fill="#140702"/>
  <ellipse cx="40" cy="22" rx="6" ry="3.5" fill="#140702"/>
  <ellipse cx="26" cy="32" rx="5.5" ry="3" fill="#140702"/>
  <ellipse cx="58" cy="28" rx="6" ry="3" fill="#140702"/>

  <!-- Dois Cestos de Vime Rústico Cheios de Colheita Fresca -->
  <!-- Cesto 1 -->
  <ellipse cx="76" cy="22" rx="12" ry="7" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
  <path d="M64,22 Q76,34 88,22" fill="#78350f"/>
  <!-- Cenouras empilhadas no cesto -->
  <polygon points="70,18 78,16 75,24" fill="#ea580c"/>
  <polygon points="76,16 84,18 80,25" fill="#f97316"/>
  <circle cx="73" cy="18" r="2" fill="#16a34a"/>
  <circle cx="81" cy="17" r="2" fill="#16a34a"/>

  <!-- Cesto 2 -->
  <ellipse cx="50" cy="14" rx="9" ry="5" fill="#92400e" stroke="#78350f" stroke-width="1.2"/>
  <path d="M41,14 Q50,24 59,14" fill="#78350f"/>
  <polygon points="46,11 52,10 50,16" fill="#f97316"/>
  <circle cx="48" cy="11" r="1.5" fill="#16a34a"/>
</svg>
`;
salvar('canteiro_colhido.svg', svgCanteiroColhido);

// ============================================================================
// 4. FOGUEIRA DINÂMICA (APAGADA, BRASA, ALTA)
// ============================================================================
function svgFogueira(estagio) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 64" width="80" height="64">
  <defs>
    <radialGradient id="fogoGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#ea580c" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="brasaGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Brilho no Chão -->
  ${estagio === 'alta' ? '<ellipse cx="40" cy="42" rx="34" ry="18" fill="url(#fogoGlow)"/>' : estagio === 'brasa' ? '<ellipse cx="40" cy="42" rx="24" ry="12" fill="url(#brasaGlow)"/>' : ''}

  <!-- Círculo de Pedras Rústicas de Proteção -->
  <g fill="#57534e" stroke="#292524" stroke-width="1.5">
    <ellipse cx="20" cy="40" rx="6" ry="4"/>
    <ellipse cx="26" cy="48" rx="7" ry="4.5"/>
    <ellipse cx="38" cy="52" rx="8" ry="5"/>
    <ellipse cx="52" cy="50" rx="7.5" ry="4.5"/>
    <ellipse cx="60" cy="42" rx="6.5" ry="4"/>
    <ellipse cx="56" cy="34" rx="6" ry="3.5"/>
    <ellipse cx="44" cy="30" rx="7" ry="4"/>
    <ellipse cx="28" cy="32" rx="6.5" ry="3.5"/>
  </g>

  <!-- Cinzas e Carvão de Base -->
  <ellipse cx="40" cy="42" rx="16" ry="8" fill="#1c1917"/>

  <!-- Toras de Lenha Cruzadas -->
  <g stroke="#180c05" stroke-width="1">
    <rect x="26" y="38" width="28" height="6" rx="2" fill="#78350f" transform="rotate(-18 40 41)"/>
    <rect x="26" y="38" width="28" height="6" rx="2" fill="#5c2e0b" transform="rotate(22 40 41)"/>
    <rect x="28" y="38" width="24" height="5" rx="1.5" fill="#451a03"/>
  </g>

  ${estagio === 'apagada' ? `
    <!-- Fumaça Tênue Subindo -->
    <path d="M38,36 Q34,26 40,18 Q44,12 40,6" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.4"/>
  ` : estagio === 'brasa' ? `
    <!-- Brasas Incandescentes -->
    <ellipse cx="40" cy="41" rx="8" ry="4" fill="#ef4444"/>
    <circle cx="36" cy="40" r="2" fill="#facc15"/>
    <circle cx="44" cy="42" r="2.5" fill="#f97316"/>
    <!-- Fagulhas Pequenas -->
    <circle cx="38" cy="32" r="1.2" fill="#fde047"/>
    <circle cx="43" cy="28" r="1" fill="#f97316"/>
  ` : `
    <!-- Labaredas de Fogo Alto (Camadas Amarela, Laranja e Branca) -->
    <path d="M40,10 Q48,22 52,38 Q40,46 28,38 Q32,22 40,10 Z" fill="#ea580c"/>
    <path d="M40,16 Q46,26 48,39 Q40,44 32,39 Q34,26 40,16 Z" fill="#f59e0b"/>
    <path d="M40,24 Q44,30 44,40 Q40,43 36,40 Q36,30 40,24 Z" fill="#fef08a"/>
    <!-- Labaredas Secundárias Dançantes -->
    <path d="M32,28 Q36,34 33,40 Q28,38 32,28 Z" fill="#f59e0b"/>
    <path d="M48,26 Q52,34 47,40 Q44,38 48,26 Z" fill="#ea580c"/>
    <!-- Fagulhas Subindo -->
    <circle cx="37" cy="8" r="1.5" fill="#fef08a"/>
    <circle cx="44" cy="4" r="1.2" fill="#f59e0b"/>
    <circle cx="32" cy="14" r="1.2" fill="#facc15"/>
  `}
</svg>
`;
}

salvar('fogueira_apagada.svg', svgFogueira('apagada'));
salvar('fogueira_brasa.svg', svgFogueira('brasa'));
salvar('fogueira_alta.svg', svgFogueira('alta'));

// ============================================================================
// 5. ESTRUTURAS EVOLUTIVAS (NÍVEIS 1, 2 E 3)
// ============================================================================
// Nível 1: Abrigo Rústico / Tenda de Peles e Folhagens
const svgCasaNivel1 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 80" width="90" height="80">
  <ellipse cx="45" cy="72" rx="36" ry="7" fill="#000" opacity="0.4"/>
  <!-- Toras de Estrutura em A -->
  <line x1="16" y1="70" x2="45" y2="16" stroke="#451a03" stroke-width="6" stroke-linecap="round"/>
  <line x1="74" y1="70" x2="45" y2="16" stroke="#451a03" stroke-width="6" stroke-linecap="round"/>
  <line x1="45" y1="16" x2="45" y2="70" stroke="#78350f" stroke-width="4"/>
  <!-- Cobertura de Peles e Sapê -->
  <polygon points="45,18 18,68 72,68" fill="#854d0e" stroke="#3d2105" stroke-width="2"/>
  <polygon points="45,22 24,66 45,66" fill="#a16207"/>
  <!-- Entrada do Abrigo com interior escuro -->
  <polygon points="45,34 32,68 58,68" fill="#1c1917"/>
</svg>
`;
salvar('casa_nivel1.svg', svgCasaNivel1);

// Nível 2: Cabana de Madeira Trabalhada com Janela Iluminada
const svgCasaNivel2 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90" width="100" height="90">
  <ellipse cx="50" cy="84" rx="42" ry="6" fill="#000" opacity="0.4"/>
  <!-- Paredes de Toras Encaixadas -->
  <rect x="20" y="44" width="60" height="38" rx="3" fill="#78350f" stroke="#381a05" stroke-width="2"/>
  <!-- Linhas das Toras Horizontais -->
  <line x1="20" y1="52" x2="80" y2="52" stroke="#451a03" stroke-width="2"/>
  <line x1="20" y1="60" x2="80" y2="60" stroke="#451a03" stroke-width="2"/>
  <line x1="20" y1="68" x2="80" y2="68" stroke="#451a03" stroke-width="2"/>
  <line x1="20" y1="76" x2="80" y2="76" stroke="#451a03" stroke-width="2"/>
  <!-- Porta de Madeira Reforçada -->
  <rect x="42" y="56" width="16" height="26" rx="2" fill="#381a05"/>
  <circle cx="55" cy="70" r="1.5" fill="#facc15"/>
  <!-- Janela com Luz Interior Acolhedora -->
  <rect x="64" y="54" width="10" height="10" rx="1.5" fill="#fef08a" stroke="#381a05" stroke-width="1.5"/>
  <line x1="69" y1="54" x2="69" y2="64" stroke="#381a05" stroke-width="1"/>
  <line x1="64" y1="59" x2="74" y2="59" stroke="#381a05" stroke-width="1"/>
  <!-- Telhado de Palha e Madeira com Beiral -->
  <polygon points="50,14 10,48 90,48" fill="#b45309" stroke="#451a03" stroke-width="2"/>
  <polygon points="50,16 16,46 50,46" fill="#d97706"/>
</svg>
`;
salvar('casa_nivel2.svg', svgCasaNivel2);

// Nível 3: Casa Nobre de Pedra, Madeira e Chaminé Fumegante
const svgCasaNivel3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 100" width="110" height="100">
  <ellipse cx="55" cy="94" rx="46" ry="6" fill="#000" opacity="0.45"/>
  <!-- Chaminé de Pedra à Esquerda -->
  <rect x="24" y="14" width="12" height="34" fill="#57534e" stroke="#292524" stroke-width="2"/>
  <rect x="22" y="12" width="16" height="4" fill="#292524"/>
  <!-- Fumaça Saindo da Chaminé -->
  <circle cx="30" cy="8" r="4" fill="#cbd5e1" opacity="0.6"/>
  <circle cx="34" cy="3" r="5" fill="#94a3b8" opacity="0.4"/>
  <!-- Fundação de Pedras Talhadas -->
  <rect x="18" y="70" width="74" height="22" rx="2" fill="#57534e" stroke="#292524" stroke-width="2"/>
  <line x1="18" y1="80" x2="92" y2="80" stroke="#292524" stroke-width="1.5"/>
  <!-- Paredes Nobres de Vigas de Carvalho -->
  <rect x="20" y="46" width="70" height="26" fill="#854d0e" stroke="#3d2105" stroke-width="2"/>
  <!-- Porta de Carvalho com Arco -->
  <path d="M46,92 L46,68 Q55,62 64,68 L64,92 Z" fill="#381a05" stroke="#1c1917" stroke-width="1.5"/>
  <circle cx="61" cy="78" r="1.5" fill="#facc15"/>
  <!-- Duas Janelas Iluminadas -->
  <rect x="26" y="52" width="12" height="12" rx="2" fill="#fef08a" stroke="#292524" stroke-width="1.5"/>
  <rect x="72" y="52" width="12" height="12" rx="2" fill="#fef08a" stroke="#292524" stroke-width="1.5"/>
  <!-- Telhado Nobre com Telhas Vermelhas Rústicas -->
  <polygon points="55,16 12,48 98,48" fill="#991b1b" stroke="#450a0a" stroke-width="2.5"/>
  <polygon points="55,18 18,46 55,46" fill="#b91c1c"/>
</svg>
`;
salvar('casa_nivel3.svg', svgCasaNivel3);

console.log('[SPRITES] Todos os assets foram gerados com sucesso!');

// ============================================================================
// 6. ESTRUTURAS ADICIONAIS ISOMÉTRICAS LIVRES DE PRIMITIVAS GEOMÉTRICAS
// ============================================================================
// Curral de Animais Isométrico
const svgCurral = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="90" height="60">
  <defs>
    <radialGradient id="palhaChao" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#ca8a04" stop-opacity="0.1"/>
    </radialGradient>
  </defs>
  <ellipse cx="45" cy="35" rx="40" ry="18" fill="url(#palhaChao)"/>
  <g fill="#78350f" stroke="#451a03" stroke-width="1.5">
    <rect x="8" y="24" width="6" height="24" rx="2"/>
    <rect x="30" y="32" width="6" height="24" rx="2"/>
    <rect x="54" y="32" width="6" height="24" rx="2"/>
    <rect x="76" y="24" width="6" height="24" rx="2"/>
    <rect x="20" y="16" width="5" height="20" rx="1.5"/>
    <rect x="65" y="16" width="5" height="20" rx="1.5"/>
  </g>
  <line x1="10" y1="30" x2="78" y2="30" stroke="#92400e" stroke-width="3" stroke-linecap="round"/>
  <line x1="10" y1="40" x2="78" y2="40" stroke="#92400e" stroke-width="3" stroke-linecap="round"/>
  <line x1="22" y1="22" x2="67" y2="22" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Cabra Pastando -->
  <ellipse cx="32" cy="34" rx="10" ry="6" fill="#78350f"/>
  <circle cx="24" cy="30" r="4.5" fill="#5c2e0b"/>
  <polygon points="21,27 20,22 23,26" fill="#fde047"/>
  <rect x="26" y="38" width="3" height="8" rx="1" fill="#451a03"/>
  <rect x="34" y="38" width="3" height="8" rx="1" fill="#451a03"/>
  <!-- Galinha Ciscando -->
  <ellipse cx="58" cy="38" rx="5" ry="4" fill="#ffffff"/>
  <circle cx="62" cy="35" r="2.5" fill="#f8fafc"/>
  <polygon points="64,35 67,36 64,37" fill="#f59e0b"/>
  <polygon points="61,33 63,31 63,33" fill="#dc2626"/>
  <rect x="57" y="41" width="1.5" height="4" fill="#f59e0b"/>
</svg>
`;
salvar('curral.svg', svgCurral);

// Barco / Jangada do Cais
const svgBarco = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="90" height="60">
  <defs>
    <radialGradient id="aguaOndulacao" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="45" cy="35" rx="42" ry="16" fill="url(#aguaOndulacao)"/>
  <g fill="#78350f" stroke="#451a03" stroke-width="1.5">
    <rect x="12" y="16" width="66" height="7" rx="3"/>
    <rect x="10" y="22" width="70" height="8" rx="3.5" fill="#854d0e"/>
    <rect x="8" y="29" width="74" height="9" rx="4" fill="#92400e"/>
    <rect x="10" y="37" width="70" height="8" rx="3.5" fill="#854d0e"/>
    <rect x="12" y="44" width="66" height="7" rx="3"/>
  </g>
  <line x1="24" y1="14" x2="24" y2="52" stroke="#fef08a" stroke-width="2.5" stroke-dasharray="3,2"/>
  <line x1="66" y1="14" x2="66" y2="52" stroke="#fef08a" stroke-width="2.5" stroke-dasharray="3,2"/>
  <rect x="42" y="8" width="5" height="36" rx="2" fill="#5c2e0b"/>
  <rect x="36" y="12" width="18" height="6" rx="2" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="22" y1="46" x2="68" y2="20" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"/>
  <polygon points="64,18 72,15 70,24" fill="#78350f"/>
</svg>
`;
salvar('barco.svg', svgBarco);

// Arena de Lutas / Ringue de Treino
const svgArena = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70" width="100" height="70">
  <defs>
    <radialGradient id="arenaChao" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#d97706" stop-opacity="0.8"/>
      <stop offset="70%" stop-color="#b45309" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#78350f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="40" rx="46" ry="24" fill="url(#arenaChao)"/>
  <ellipse cx="50" cy="40" rx="44" ry="22" fill="none" stroke="#78350f" stroke-width="3" stroke-dasharray="6,3"/>
  <!-- 4 Tochas nos Cantos -->
  <rect x="49" y="16" width="3" height="12" rx="1" fill="#451a03"/>
  <circle cx="50.5" cy="14" r="3" fill="#f59e0b"/>
  <circle cx="50.5" cy="13" r="1.5" fill="#fef08a"/>
  <rect x="49" y="52" width="3" height="12" rx="1" fill="#451a03"/>
  <circle cx="50.5" cy="50" r="3" fill="#f59e0b"/>
  <rect x="8" y="34" width="3" height="12" rx="1" fill="#451a03"/>
  <circle cx="9.5" cy="32" r="3" fill="#f59e0b"/>
  <rect x="89" y="34" width="3" height="12" rx="1" fill="#451a03"/>
  <circle cx="90.5" cy="32" r="3" fill="#f59e0b"/>
  <!-- Boneco de Treino de Palha -->
  <rect x="62" y="28" width="4" height="20" rx="1.5" fill="#78350f"/>
  <ellipse cx="64" cy="32" rx="6" ry="7" fill="#ca8a04"/>
  <circle cx="64" cy="24" r="4" fill="#eab308"/>
  <line x1="56" y1="30" x2="72" y2="30" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`;
salvar('arena.svg', svgArena);

// Canteiro de Obras
const svgConstrucao = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70" width="90" height="70">
  <ellipse cx="45" cy="56" rx="38" ry="10" fill="#000000" opacity="0.35"/>
  <rect x="14" y="46" width="30" height="6" rx="2" fill="#78350f" stroke="#381a05" stroke-width="1"/>
  <rect x="16" y="41" width="26" height="6" rx="2" fill="#854d0e" stroke="#381a05" stroke-width="1"/>
  <rect x="18" y="36" width="22" height="6" rx="2" fill="#92400e" stroke="#381a05" stroke-width="1"/>
  <line x1="48" y1="18" x2="48" y2="58" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
  <line x1="78" y1="18" x2="78" y2="58" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
  <line x1="44" y1="34" x2="82" y2="34" stroke="#92400e" stroke-width="3"/>
  <line x1="44" y1="48" x2="82" y2="48" stroke="#92400e" stroke-width="3"/>
  <rect x="42" y="31" width="42" height="4" rx="1" fill="#b45309" stroke="#451a03" stroke-width="1"/>
  <line x1="48" y1="34" x2="78" y2="48" stroke="#5c2e0b" stroke-width="2"/>
  <line x1="48" y1="48" x2="78" y2="34" stroke="#5c2e0b" stroke-width="2"/>
</svg>
`;
salvar('construcao_obras.svg', svgConstrucao);

// Árvore Pinheiro
const svgPinheiro = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90" width="70" height="90">
  <ellipse cx="35" cy="82" rx="22" ry="6" fill="#000" opacity="0.4"/>
  <rect x="31" y="58" width="8" height="26" rx="2" fill="#5c2e0b" stroke="#291204" stroke-width="1.5"/>
  <polygon points="35,10 14,42 56,42" fill="#15803d" stroke="#14532d" stroke-width="1.5"/>
  <polygon points="35,26 10,58 60,58" fill="#166534" stroke="#0f3b1e" stroke-width="1.5"/>
  <polygon points="35,42 6,72 64,72" fill="#14532d" stroke="#052e16" stroke-width="1.5"/>
</svg>
`;
salvar('arvore_pinheiro.svg', svgPinheiro);

// Árvore Carvalho
const svgCarvalho = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90" width="80" height="90">
  <ellipse cx="40" cy="82" rx="26" ry="6" fill="#000" opacity="0.4"/>
  <path d="M36,82 L34,54 Q38,48 42,46 Q46,48 44,54 L44,82 Z" fill="#5c2e0b" stroke="#291204" stroke-width="1.5"/>
  <circle cx="40" cy="38" r="28" fill="#15803d" stroke="#166534" stroke-width="1.5"/>
  <circle cx="28" cy="42" r="18" fill="#166534"/>
  <circle cx="52" cy="40" r="18" fill="#16a34a"/>
  <circle cx="38" cy="26" r="20" fill="#22c55e"/>
</svg>
`;
salvar('arvore_carvalho.svg', svgCarvalho);

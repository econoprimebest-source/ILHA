const S=['chuvas','transicao_umida','seca','transicao_seca'],P=['madrugada','manha','tarde','noite'];
const CATALOGO_MESES=[
  {mes:1,nome:'Janeiro',cultura:'Milho & Mandioca',icone:'🌽',cor:'#facc15',frutas:'Manga & Mamão',fatorFrutas:1.35,fatorPeixes:1.3, fAnimais:1.15,diasComPeixe:10},
  {mes:2,nome:'Fevereiro',cultura:'Abóbora & Inhame',icone:'🎃',cor:'#f97316',frutas:'Maracujá & Goiaba',fatorFrutas:1.4,fatorPeixes:1.25,fAnimais:1.2,diasComPeixe:10},
  {mes:3,nome:'Março',cultura:'Feijão-Verde & Batata-Doce',icone:'🫘',cor:'#84cc16',frutas:'Banana & Coco',fatorFrutas:1.1,fatorPeixes:0.5,fAnimais:1.0,diasComPeixe:6},
  {mes:4,nome:'Abril',cultura:'Tomate & Pimentão',icone:'🍅',cor:'#ef4444',frutas:'Caju & Acerola',fatorFrutas:1.0,fatorPeixes:0.8,fAnimais:1.1,diasComPeixe:7},
  {mes:5,nome:'Maio',cultura:'Cenoura & Raízes',icone:'🥕',cor:'#fb923c',frutas:'Abacate & Fruta-Pão',fatorFrutas:0.8,fatorPeixes:0.3,fAnimais:1.1,diasComPeixe:4},
  {mes:6,nome:'Junho',cultura:'Couve & Ervas Medicinais',icone:'🥬',cor:'#22c55e',frutas:'Laranja Brava',fatorFrutas:0.5,fatorPeixes:0.0,fAnimais:0.9,diasComPeixe:0},
  {mes:7,nome:'Julho',cultura:'Trigo Rústico & Alho',icone:'🌾',cor:'#eab308',frutas:'Coco Seco',fatorFrutas:0.3,fatorPeixes:0.45,fAnimais:0.7,diasComPeixe:5},
  {mes:8,nome:'Agosto',cultura:'Grão-de-Bico & Cebola',icone:'🧅',cor:'#a855f7',frutas:'Entressafra Seca (sem frutos)',fatorFrutas:0.0,fatorPeixes:0.0,fAnimais:0.6,diasComPeixe:0},
  {mes:9,nome:'Setembro',cultura:'Lentilha & Tubérculos',icone:'🥔',cor:'#d97706',frutas:'Início de Florada',fatorFrutas:0.15,fatorPeixes:0.35,fAnimais:0.85,diasComPeixe:4},
  {mes:10,nome:'Outubro',cultura:'Morangos & Lavanda',icone:'🍓',cor:'#f43f5e',frutas:'Pitanga & Jabuticaba',fatorFrutas:1.15,fatorPeixes:0.95,fAnimais:1.3,diasComPeixe:8},
  {mes:11,nome:'Novembro',cultura:'Melancia & Pepino',icone:'🍉',cor:'#10b981',frutas:'Caju & Manga',fatorFrutas:1.25,fatorPeixes:0.6,fAnimais:1.25,diasComPeixe:6},
  {mes:12,nome:'Dezembro',cultura:'Milho-Doce & Tomate',icone:'🌽',cor:'#f59e0b',frutas:'Mamão & Maracujá',fatorFrutas:1.3,fatorPeixes:0.75,fAnimais:1.2,diasComPeixe:6}
];
function mesDe(t){
  const d=Math.max(1,Number(t&&t.dia)||1);
  const diaDoAno=(d-1)%120;
  const idx=Math.min(11,Math.max(0,Math.floor(diaDoAno/10)));
  const diaDoMes=(diaDoAno%10)+1;
  const info=CATALOGO_MESES[idx];
  const cardumeNoRio=diaDoMes<=info.diasComPeixe;
  return {...info,diaDoMes,cardumeNoRio};
}
function tempoDe(c){const DP=6,N0=3;let d=Math.floor(c/DP),n=d%120,b=c%DP;return{dia:d+1,periodo:b<N0?P[b]:P[3],periodoIndex:b<N0?b:3,estacao:S[Math.floor(n/30)],diaDaEstacao:n%30+1,ano:Math.floor(d/120)+1,ciclo:c}}function eventos(t){const m=mesDe(t);return{chuva:t.estacao==='chuvas'?(t.diaDaEstacao%3?'chuva':'chuva_forte'):t.estacao==='seca'?(t.diaDaEstacao%12?'seco':'chuva_fraca'):t.estacao==='transicao_umida'?(t.diaDaEstacao%5?'nublado':'chuva'):'nublado',frutificacao:m.fatorFrutas>=0.4,reproducaoPeixes:m.cardumeNoRio&&m.fatorPeixes>=0.5,regeneracaoVegetal:t.periodo==='madrugada',mes:m}}// Relógio da linha do tempo: 6 ciclos por dia → 4h cada, começando madrugada (05:00).
function horaDe(c){return['05:00','08:00','14:00','19:00','22:00','01:00'][((c%6)+6)%6]}module.exports={tempoDe,eventos,horaDe,mesDe,CATALOGO_MESES,ESTACOES:S};
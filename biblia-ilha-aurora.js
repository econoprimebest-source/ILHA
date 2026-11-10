'use strict';
// BÍBLIA DO MUNDO — ILHA AURORA (definição canônica, somente descrição).
// Ela DESCREVE o mundo; não controla decisão de ninguém.
// Geografia indexada pelos MESMOS nós de espaco.js (teste exige correspondência
// exata nome a nome). Elementos que só existem no visual ficam em `pendencias`
// — nunca fingimos que existem no motor.
const NOME='Ilha Aurora';

const biblia={
	identidade:{
		nome:NOME,
		descricao:'Ilha habitada no oceano, de dimensões percorridas a pé num dia, com bosque, floresta, rio, cachoeira, fazenda, praias e um cais antigo.',
		natureza:'Mundo físico que continua acontecendo — clima, fauna, água e eventos seguem mesmo quando ninguém observa.'
	},
	geografia:{
		locais:{
			casa_icaro:{nome:'Casa do Ícaro',tipo:'abrigo',descricao:'Cabana simples do Ícaro, perto da fogueira e do acampamento.'},
			casa_joao:{nome:'Casa do João',tipo:'abrigo',descricao:'Casa no alto, de onde se vê o bosque; morada de João e Maria, que moram juntos.'},
			casa_maria:{nome:'Casa da Maria',tipo:'abrigo',descricao:'Casa da família de Maria, perto da fazenda; guarda panelas e sementes. O casal mora perto do bosque, então aqui ela aparece para guardar colheita e conversar.'},
			acampamento:{nome:'Acampamento',tipo:'abrigo',descricao:'Área aberta coberta entre a fogueira e a casa do Ícaro; ponto de encontro comum.'},
			fogueira:{nome:'Fogueira',tipo:'estrutura',descricao:'Fogueira construída por João e Maria; referência segura no escuro.'},
			bosque:{nome:'Bosque',tipo:'exploração',descricao:'Bosque de frutíferas e aves, entre a casa do João e a floresta.'},
			floresta:{nome:'Floresta',tipo:'exploração',descricao:'Floresta densa com madeira caída, animais e regiões de risco.'},
			rio:{nome:'Rio',tipo:'recurso',descricao:'Rio que corta a ilha; água, pesca e travessia pela trilha da fazenda.'},
			cachoeira:{nome:'Cachoeira',tipo:'recurso',descricao:'Queda d\'água no fim da trilha da floresta; água limpa e rochedos.'},
			fazenda:{nome:'Fazenda',tipo:'exploração',descricao:'Área aberta com plantações antigas entre a casa da Maria e o rio.'},
			mar:{nome:'Mar',tipo:'oceano',descricao:'Praia e oceano na borda sul; ondas, conchas e fundo rochoso perto do cais.'},
			barco:{nome:'Cais do barco',tipo:'estrutura',descricao:'Cais de madeira com um barco amarrado; saída possível para o mar.'}
		},
		trilhas:'Conectadas como em espaco.js: fogueira articula o lado oeste (casas, bosque, mar, cais); fazenda articula o lado leste (rio, floresta, casa da Maria).'
	},
	clima:{
		normal:'Ar ameno; estações definem umidade e chuva (seca, transição, chuvas).',
		chuva:'Chuva fraca regenera a nascente; chuva forte alaga trilhas baixas.',
		tempestades:'Tempestades duram poucos ciclos, levam vento forte e trovões; a fogueira e os abrigos viram refúgio.',
		variacoes:['seca prolongada baixa as fontes','vento forte do lado do mar','noites escuras fora do abrigo']
	},
	recursos:{
		agua:['nascente','lago','poço','rio','cachoeira'],
		alimentos:['frutos do bosque','peixes do rio','animais da floresta','plantas da fazenda'],
		madeira:['floresta (madeira caída)','árvores velhas'],
		pesca:['rio','mar (futuro — ver pendencias)'],
		outros:['sementes da fazenda','conchas na praia (futuro)']
	},
	fauna:{
		animais:[
			{nome:'aves',habitat:'bosque',comportamento:'cruzam o bosque e cantam de manhã',risco:'nenhum'},
			{nome:'roedores',habitat:'floresta',comportamento:'deixam rastros e fogem de barulho',risco:'nenhum'},
			{nome:'peixes',habitat:'rio',comportamento:'aglomeram perto da correnteza',risco:'nenhum'}
		],
		perigosos:[
			{nome:'predador da floresta',habitat:['floresta','bosque','fazenda'],comportamento:'caça à toa, ataca quem entra no seu alcance',risco:'ferimento'}
		]
	},
	perigos:[
		{tipo:'predador',regioes:['floresta','bosque','fazenda'],regra:'só existe para o cérebro como pistas (ruídos, pegadas) — nunca é anunciado pronto'},
		{tipo:'clima',regioes:['mar','fogueira','acampamento'],regra:'noite e tempestade pressionam quem está exposto'},
		{tipo:'terreno',regioes:['mar','cachoeira'],regra:'rochedos e ondas pressionam quem se aproxima do fim da trilha'}
	],
	estruturas:[
		{estado:'existe',itens:['Casa do Ícaro','Casa do João (do casal João–Maria)','Casa da Maria','Fogueira','Cais do barco','Acampamento coberto','Banho no rio, na cachoeira e no mar','Arrumar a casa e o acampamento']},
		{estado:'futuro',itens:['pesca no mar','plantação ativa na fazenda','navegação do barco','objetos na praia'],nota:'existem no mapa/visual, mas o motor ainda não oferece essas ações — marcado, não fingido'}
	],
	sociedade:{
		habitantes:[
			{id:'joao',relacao:'marido de Maria; pescador — moram juntos na casa perto do bosque'},
			{id:'maria',relacao:'esposa de João; cozinha e cultiva — moram juntos na casa perto do bosque'},
			{id:'icaro',relacao:'irmão da Lara; vive na casa junto ao acampamento'},
			{id:'lara',relacao:'irmã do Ícaro; mora na mesma casa com ele'}
		],
		relacoesIniciais:'Casal João–Maria na mesma casa perto do bosque; Ícaro e Lara são irmãos e moram na casa junto ao acampamento; todos se conhecem desde que chegaram à ilha.',
		estruturas:'Não há governo nem loja; a convivência gira na fogueira, nas casas e nas trocas de pesca e comida.'
	},
	historia:{
		passadoConhecido:'A ilha já foi habitada por mais famílias; restos de plantação na fazenda e o cais antigo lembram tempos mais movimentados.'
	},
	misterios:[
		{descricao:'Existe um claro na floresta onde os predadores não costumam entrar; ninguém sabe o motivo.',conhecidoPor:[]},
		{descricao:'Há algo afundado perto do cais que só aparece na maré baixa.',conhecidoPor:[]},
		{descricao:'Uma trilha velha parte da cachoeira para um lugar que não está no mapa.',conhecidoPor:[]}
	],
	eventosPossiveis:[
		{evento:'tempestade',infra:'acontecimentos.js (tempestade)',status:'ativo'},
		{evento:'predador',infra:'acontecimentos.js (predador)',status:'ativo'},
		{evento:'encontro entre personagens',infra:'posições + trilhas',status:'ativo (consequência, não roteiro)'},
		{evento:'descoberta / pista',infra:'percepção + observar',status:'ativo'},
		{evento:'objeto encontrado / pedido de ajuda / oportunidade',infra:'missões (FASE H)',status:'futuro'},
		{evento:'intervenção do jogador',infra:'poderes do espectador (FASE J)',status:'futuro'}
	]
};

module.exports={NOME,biblia};

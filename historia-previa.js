'use strict';
// HISTÓRIA PRÉVIA + PERSONALIDADE INICIAL — ILHA AURORA.
//
// PRINCÍPIO: O PASSADO É NOSSO. A IDENTIDADE INICIAL É NOSSA. A
// PERSONALIDADE INICIAL É NOSSA. O MUNDO É NOSSO. AS ESCOLHAS FUTURAS SÃO
// DELES. A TRAJETÓRIA FUTURA É DELES.
//
// Isto são FATOS biográficos e TRAÇOS de quem a pessoa JÁ É — insumos do
// cérebro, nunca regras de comportamento. Proibido aqui: "protetor → sempre
// protege", "corajosa → sempre enfrenta". O cérebro interpreta a situação
// concreta e decide; a transformação futura da personalidade é consequência
// da vida do personagem (não nossa).
//
// Idempotente: só aplica onde ainda não existe; nunca reescreve o que já é
// do personagem (teste de não-reescrita cobre isto).
const {NOME}=require('./biblia-ilha-aurora');

const HISTORIAS={
	joao:{
		personalidade:['adulto','trabalhador','responsável','determinado','protetor','valoriza a família'],
		residencia:'casa_joao',
		ocupacao:'pescador',
		passado:'João cresceu na Ilha Aurora com o pai, que lhe ensinou a pescar. É marido de Maria e os dois moram juntos na casa perto do bosque. Trabalha com pesca desde a juventude e conhece bem os caminhos entre a casa, o bosque e a floresta.',
		conhecimentos:[
			NOME+' é a ilha onde vivo.',
			'Maria, minha esposa, e eu moramos juntos na casa perto do bosque.',
			'O Ícaro vive no acampamento, perto da fogueira, com a irmã Lara.',
			'A trilha entre a casa, o bosque e a floresta é familiar para mim.',
			'A floresta guarda madeira e animais; os predadores evitam a fogueira.',
			'O mar e o rio são bons lugares para pescar.'
		],
		habilidades:[
			{texto:'Aprendeu a pescar com o pai quando era jovem.',origem:'família'},
			{texto:'Conserta redes, cabos e o cais de madeira.',origem:'trabalho'}
		],
		pertences:[
			{id:'anzol_do_pai',nome:'Anzol do pai',tipo:'ferramenta',sentimental:true,descricao:'Anzol herdado do pai; ele nunca o empresta.'},
			{id:'rede',nome:'Rede de pesca',tipo:'ferramenta',descricao:'Rede que ele mesmo conserta e dependura na casa.'}
		],
		preocupacoes:['Tempestades fortes podem danificar o cais e o barco.'],
		lembrancas:[
			'Construiu a fogueira do acampamento junto com Maria.',
			'Perdeu um tio num ano de grandes tempestades.'
		],
		relacoes:{
			maria:{texto:'Maria é minha esposa; moramos na mesma casa e construímos juntos a fogueira do acampamento.',momentos:['Casamento na ilha, antes de começarmos a observar.','Construíram a fogueira do acampamento juntos.','Passaram a dividir a casa perto do bosque.']},
			icaro:{texto:'Conheço o Ícaro desde que ele chegou ao acampamento; já trocamos peixes por ferramentas.',momentos:['O Ícaro ajudou a remender minha rede uma vez.']},
			lara:{texto:'A Lara, irmã do Ícaro, mora no acampamento; troca lenha por peixe quando precisa.',momentos:['A Lara trouxe lenha seca num ano de chuva.']}
		}
	},
	maria:{
		personalidade:['adulta','trabalhadora','sonhadora','corajosa','forte','independente'],
		residencia:'casa_joao',
		ocupacao:'cozinheira e cultivadora',
		passado:'Maria cresceu na ilha, na casa da família perto da fazenda, e é casada com João. Os dois moram juntos na casa perto do bosque. Ela cozinha e cultiva o que a ilha oferece, guarda a casa do casal e conhece o caminho entre a fazenda, o rio e o bosque.',
		conhecimentos:[
			NOME+' é a ilha onde vivo.',
			'João é meu marido; moramos juntos na casa perto do bosque.',
			'O Ícaro e a irmã Lara vivem no acampamento.',
			'As árvores do bosque dão frutos sazonais; sei onde encontrá-los.',
			'A água da nascente e do rio é potável; já vi o lago quase seco.'
		],
		habilidades:[
			{texto:'Aprendeu a cozinhar e a plantar com a mãe e as vizinhas.',origem:'família'},
			{texto:'Reconhece plantas comestíveis do bosque.',origem:'experiência'}
		],
		pertences:[
			{id:'panela_de_ferro',nome:'Panela de ferro',tipo:'utensílio',descricao:'Panela herdada da família; aguenta qualquer chuva.'},
			{id:'sementes_guardadas',nome:'Sementes guardadas',tipo:'alimento',descricao:'Sementes que ela mesma recolheu e separou.'}
		],
		preocupacoes:['Uma seca longa pode comprometer a colheita da fazenda.'],
		lembrancas:[
			'Encontrou um animal perto da floresta uma vez e aprendeu a respeitar o limite delas.',
			'Foi ela quem organizou a primeira comida na fogueira.'
		],
		relacoes:{
			joao:{texto:'João é meu marido; dividimos a mesma casa perto do bosque e a vida entre a casa e a fazenda.',momentos:['Casamento na ilha, antes de começarmos a observar.','Passaram a dividir as colheitas.','Passaram a dividir a mesma casa.']},
			icaro:{texto:'O Ícaro é um conhecido da ilha; ele já trocou peixes por comida conosco.',momentos:['O Ícaro trouxe peixe quando faltou alimento aqui em casa.']},
			lara:{texto:'A Lara é irmã do Ícaro; trocou plantas comigo algumas vezes na trilha da fazenda.',momentos:['A Lara me deu erva que curei em casa dela junto ao acampamento.']}
		}
	},
	icaro:{
		personalidade:['adulto','curioso','inquieto','autossuficiente','desconfiado'],
		residencia:'casa_icaro',
		ocupacao:'vive do que a ilha oferece',
		passado:'Ícaro vive na Ilha Aurora há anos, depois de chegar pelo mar com a irmã Lara. Dorme na casa junto ao acampamento, perto da fogueira, ao lado da irmã, e conhece melhor o caminho da casa ao mar, ao rio e à cachoeira. Fica pouco tempo na casa dos outros; prefere observar antes de se aproximar.',
		conhecimentos:[
			NOME+' é a ilha onde vivo.',
			'A Lara é minha irmã; moramos juntos na casa junto ao acampamento.',
			'Maria e João moram na ilha; somos conhecidos.',
			'O caminho do acampamento até o mar é o que conheço melhor.',
			'O rio dá água e a cachoeira fica depois da floresta.',
			'À noite a ilha fica escura; a fogueira é o ponto seguro do acampamento.'
		],
		habilidades:[
			{texto:'Aprendeu a seguir a costa sem se perder.',origem:'exploração'},
			{texto:'Faz acampamento e mantém a fogueira acesa.',origem:'experiência'}
		],
		pertences:[
			{id:'faca_de_uso',nome:'Faca de uso diário',tipo:'ferramenta',descricao:'Serve para cortar corda, fruta e lenha.'},
			{id:'capa_de_chuva',nome:'Capa de chuva',tipo:'roupa',descricao:'O acompanha desde que ele chegou à ilha.'}
		],
		preocupacoes:['A casa é simples; numa noite de chuva o telhado ainda deixa entrar água perto da fogueira.'],
		lembrancas:[
			'Atravessou o mar até chegar à ilha.',
			'Já pernoitou na floresta e aprendeu a reconhecer sons à noite.'
		],
		relacoes:{
			joao:{texto:'João me recebeu quando cheguei; troco pesca pelas ferramentas dele.',momentos:['João me emprestou uma faca quando eu ainda não tinha nada.']},
			maria:{texto:'Maria já me alimentou quando faltou peixe; sou grato, mas mantenho minha distância.',momentos:['Maria me deu comida num dia em que não consegui pescar.']},
			lara:{texto:'Lara é minha irmã; cuidamos um do outro na casa junto ao acampamento.',momentos:['Chegamos juntos à ilha e montamos o acampamento juntos.','Ela segurou a fogueira acesa enquanto eu dormia.']}
		}
	},
	lara:{
		personalidade:['adulta','observadora','prática','independente','leal'],
		residencia:'casa_icaro',
		ocupacao:'reúne água e lenha para o acampamento',
		passado:'Lara é irmã do Ícaro e chegou à Ilha Aurora com ele, pelo mar. Dorme na casa junto ao acampamento, perto da fogueira, ao lado do irmão, e conhece bem o caminho entre a casa, o rio e a cachoeira. Gosta de observar antes de falar e mantém a casa e o acampamento em ordem.',
		conhecimentos:[
			NOME+' é a ilha onde vivo.',
			'O Ícaro é meu irmão; moramos juntos na casa junto ao acampamento.',
			'Maria e João moram casados na casa perto do bosque.',
			'Água limpa se acha no rio, na nascente e na cachoeira.',
			'À noite a fogueira é o ponto seguro do acampamento.'
		],
		habilidades:[
			{texto:'Aprendeu com o irmão a achar água limpa e plantas comestíveis.',origem:'família'},
			{texto:'Mantém o acampamento organizado e a fogueira acesa.',origem:'experiência'}
		],
		pertences:[
			{id:'cantil_de_lata',nome:'Cantil de lata',tipo:'ferramenta',descricao:'Leva água do rio para o acampamento; arranhado nas laterais.'},
			{id:'corda_de_sisal',nome:'Corda de sisal',tipo:'ferramenta',descricao:'Corda que ela mesma torce para amarrar lenha e tenda.'}
		],
		preocupacoes:['A casa é simples; numa noite de chuva o telhado ainda deixa entrar água perto da fogueira.'],
		lembrancas:[
			'Atravessou o mar com o irmão até chegar à ilha.',
			'Já subiu até a cachoeira para buscar água antes do amanhecer.'
		],
		relacoes:{
			icaro:{texto:'Ícaro é meu irmão; cuidamos um do outro na casa junto ao acampamento.',momentos:['Chegaram juntos à ilha e montaram o acampamento juntos.','Ela segurou a fogueira acesa enquanto ele dormia.']},
			joao:{texto:'João troca peixe por ferramentas; conversamos na fogueira de vez em quando.',momentos:['João me emprestou o anzol quando precisei.']},
			maria:{texto:'Maria troca plantas comigo e já me ensinou a reconhecer ervas.',momentos:['A Maria me ensinou a reconhecer uma erva na trilha da fazenda.']}
		}
	}
};

// Fatos de moradia escritos UMA vez pelo autor do mundo e guardados no
// diário de bordo de cada personagem (passado/presente, nunca futuro
// decidido). Idempotente: se já está lá, não se repete.
const MORADIA_DIARIO={
	joao:'Moro na mesma casa com Maria, minha esposa, perto do bosque.',
	maria:'Moro na mesma casa com João, meu esposo, perto do bosque.',
	icaro:'Minha irmã Lara mora na mesma casa comigo, perto da fogueira do acampamento.',
	lara:'Moro na mesma casa com meu irmão Ícaro, perto da fogueira do acampamento.'
};

// Aplica a identidade inicial (autores) sem nunca reescrever o que já é do
// personagem. Preenche: traços, história, conhecimentos no cortex e a
// história de cada relação (visões por lado).
function aplicar(estado){
	estado.relacoesHistoria=estado.relacoesHistoria||{};
	const ciclo=estado.mundo&&estado.mundo.tempo?estado.mundo.tempo.ciclo:0;
	for(const[id,ser]of Object.entries(estado.seres||{})){
		const h=HISTORIAS[id];
		if(!h)continue;
		if(!ser.personalidade)ser.personalidade=[...h.personalidade];
		if(!ser.historia)ser.historia={ocupacao:h.ocupacao,residencia:h.residencia,preocupacoes:[...h.preocupacoes],habilidades:h.habilidades.map(x=>({...x})),pertences:h.pertences.map(x=>({...x})),lembrancas:[...h.lembrancas]};
		const cx=require('./cortex').garantir(ser,ciclo);
		cx.biografia=cx.biografia||{};
		if(!cx.biografia.previa){
			cx.biografia.passado=h.passado;
			cx.biografia.conhecimentos=(cx.biografia.conhecimentos||[]).length?cx.biografia.conhecimentos:[...h.conhecimentos];
			cx.biografia.previa=true;
		}
		if(!estado.relacoesHistoria[id])estado.relacoesHistoria[id]=JSON.parse(JSON.stringify(h.relacoes));
		// DIÁRIO DE BORDO: quem mora com quem é fato da vida do personagem,
		// escrito no próprio diário (ciclo 0). Depois disso o diário é só o
		// que o ser viveu — nada de destino programado.
		const moradia=MORADIA_DIARIO[id];
		if(moradia&&!cx.diario.some(d=>d.ciclo===0&&d.acao==='moradia'))cx.diario.unshift({ciclo:0,acao:'moradia',motivo:moradia,consequencia:null});
	}
	return estado;
}

module.exports={aplicar,HISTORIAS};

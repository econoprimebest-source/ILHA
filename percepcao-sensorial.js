'use strict';
const fs = require('fs');

function descreverMundo(estado, ser) {
    const partes = [];
    const local = ser.local;
    const mundo = estado.mundo || {};
    const clima = mundo.clima || 'ameno';
    const periodo = mundo.periodo || 'dia';

    // 1. Clima e horário
    const climaTexto = {
        'chuva_forte': 'Uma chuva torrencial cai sem parar, encharcando tudo ao redor.',
        'nublado': 'O céu está carregado de nuvens escuras.',
        'sol': 'O sol brilha forte no céu.',
        'tempestade': 'Uma tempestade violenta ruge no céu, com ventos que cortam a pele.'
    }[clima] || 'O clima está ' + clima + '.';
    partes.push(`[PERCEPÇÃO SENSORIAL] ${climaTexto} É ${periodo}.`);

    // 2. Personagens no mesmo local
    const outros = Object.values(estado.seres || {}).filter(o => o.id !== ser.id && o.status !== 'morto' && o.local === local);
    if (outros.length) {
        for (const o of outros) {
            let desc = `${o.nome} está aqui ao seu lado.`;
            if (o.necessidades) {
                const fome = o.necessidades.alimento || 0;
                const sede = o.necessidades.agua || 0;
                const medo = o.necessidades.medo || 0;
                if (fome < 30) desc += ' Parece faminto, com o estômago roncando.';
                if (sede < 30) desc += ' A boca está seca, os lábios rachados.';
                if (medo > 60) desc += ' Os olhos estão arregalados de medo, as mãos tremem.';
            }
            if (o.acao) desc += ` Ele(a) está ${o.acao}.`;
            partes.push(desc);
        }
    } else {
        partes.push('Você está sozinho(a) neste local.');
    }

    // 3. Fogueira (se no acampamento ou perto)
    if (['acampamento', 'fogueira'].includes(local)) {
        const fogueira = estado.mundo && estado.mundo.fogueira;
        if (fogueira && fogueira.acesa) {
            partes.push('A fogueira estala e crepita, o calor aquece seu rosto. As chamas dançam.');
        } else {
            partes.push('A fogueira está apagada. Restam apenas cinzas frias e carvão molhado.');
        }
    }

    // 4. Rio (se no rio ou perto)
    if (local === 'rio' || local === 'mar') {
        partes.push('Você ouve o som da água correndo. O rio está cheio e a correnteza é forte.');
    }

    // 5. Predador (se estiver na mesma região ou adjacente)
    const predador = estado.mundo && estado.mundo.predador;
    if (predador && predador.state !== 'morto') {
        if (predador.local === local) {
            partes.push(`[PERIGO] O predador está AQUI, a poucos metros. Você vê os olhos vermelhos brilhando na escuridão. O cheiro de carne podre preenche o ar.`);
        } else if (predador.local && predador.local !== local) {
            // Se estiver em local adjacente, descreve sons
            partes.push('Você ouve um rosnado distante, grave e profundo, vindo de longe. Algo grande está se movendo.');
        }
    }

    // 6. Itens no chão (caixas, artefatos)
    if (estado.mundo && estado.mundo.itensNoChao) {
        const itens = estado.mundo.itensNoChao.filter(i => i.local === local && !i.coletado);
        for (const item of itens) {
            if (item.tipo === 'caixa') partes.push('Há uma caixa de suprimentos dourada no chão, com um bilhete preso na tampa.');
            if (item.tipo === 'artefato') partes.push('Um artefato misterioso pulsa com uma luz fraca, coberto de inscrições antigas.');
        }
    }

    
    // Percepção Situada: o que você vê depende de ONDE você está
    if (local === 'caverna') {
        partes.push('A escuridão é quase total. Você ouve o eco de suas próprias pegadas e o som de gotas caindo. O cheiro é de terra molhada e pedra fria.');
    } else if (local === 'bosque') {
        partes.push('Você está cercado por árvores altas. O sol mal passa pelas folhas. Você ouve o canto de pássaros e o farfalhar de pequenos animais na vegetação.');
    } else if (local === 'floresta') {
        partes.push('A floresta é densa. Você vê pegadas no chão e ouve galhos quebrando ao longe. A luz é escassa.');
    } else if (local === 'mar' || local === 'barco') {
        partes.push('O som das ondas é constante. O horizonte se estende até onde a vista alcança. O cheiro de sal está no ar.');
    } else if (local === 'rio') {
        partes.push('A água corrente é límpida e você vê pedras no fundo. Peixes pequenos nadam próximos à superfície.');
    } else if (local === 'casa_joao' || local === 'casa_icaro' || local === 'casa_maria') {
        partes.push('Você está dentro de uma casa. O cheiro de madeira e fumaça de fogueira preenche o ambiente. Há utensílios e mantimentos guardados.');
    }

return partes.join('\n');
}

module.exports = { descreverMundo };

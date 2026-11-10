'use strict';
const fs = require('fs');

function carregarPsicologia() {
    // Se o arquivo de psicologia não existir, ele cria com base no JSON do AI Studio
    const p = 'psicologia-ilha.json';
    if (!fs.existsSync(p)) {
        const base = {
            lara: { trust: { icaro: 92, joao: 58, maria: 65 }, paranoia: 10, jealousy: 15, pacts: ['icaro'], vote: { targetId: 'joao', reason: 'Nível de confiança caiu para 58%.', certainty: 42 }, confession: 'No confessionário sou sincera: se o João não dividir o trigo, meu voto é direto nele.' },
            icaro: { trust: { lara: 95, joao: 40, maria: 55 }, paranoia: 10, jealousy: 20, pacts: ['lara'], vote: { targetId: 'joao', reason: 'Nível de confiança caiu para 40%.', certainty: 60 }, confession: 'A Maria acha que é a dona da ilha. O público tá vendo que sou eu quem defende todo mundo.' },
            joao: { trust: { lara: 60, icaro: 45, maria: 80 }, paranoia: 18, jealousy: 30, pacts: ['maria'], vote: { targetId: 'icaro', reason: 'Nível de confiança caiu para 45%.', certainty: 55 }, confession: 'Eu vim pra esse reality pra jogar limpo, mas eles tão armando complô contra o meu celeiro.' },
            maria: { trust: { lara: 75, icaro: 50, joao: 85 }, paranoia: 13, jealousy: 25, pacts: ['joao'], vote: { targetId: 'icaro', reason: 'Nível de confiança caiu para 50%.', certainty: 50 }, confession: 'Liderar quatro personalidades fortes numa ilha com um monstro à solta é um teste psicológico diário.' }
        };
        fs.writeFileSync(p, JSON.stringify(base, null, 2), 'utf8');
        return base;
    }
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function atualizarConfianca(ser, alvo, valor) {
    const psi = carregarPsicologia();
    if(psi[ser] && psi[ser].trust[alvo] !== undefined) {
        psi[ser].trust[alvo] = Math.max(0, Math.min(100, psi[ser].trust[alvo] + valor));
        fs.writeFileSync('psicologia-ilha.json', JSON.stringify(psi, null, 2), 'utf8');
    }
}

module.exports = { carregarPsicologia, atualizarConfianca };

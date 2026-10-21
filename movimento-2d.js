'use strict';

// Mapa de coordenadas aproximadas de cada nó do jogo
const NOS_2D = {
    'acampamento': { x: 400, y: 400 },
    'fogueira': { x: 400, y: 300 },
    'casa_icaro': { x: 150, y: 450 },
    'casa_joao': { x: 350, y: 150 },
    'casa_maria': { x: 650, y: 450 },
    'fazenda': { x: 750, y: 300 },
    'rio': { x: 500, y: 500 },
    'bosque': { x: 200, y: 200 },
    'floresta': { x: 650, y: 150 },
    'mar': { x: 500, y: 600 }
};

function mover(ser) {
    if (!ser.alvoX || !ser.alvoY) return false;

    const dx = ser.alvoX - ser.x;
    const dy = ser.alvoY - ser.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Se já chegou (ou está muito perto), fixa a posição e retorna true
    if (dist < 10) {
        ser.x = ser.alvoX;
        ser.y = ser.alvoY;
        ser.alvoX = null;
        ser.alvoY = null;
        return true; // Chegou
    }

    // Move 5 pixels na direção do alvo (velocidade)
    const vel = 5;
    ser.x += (dx / dist) * vel;
    ser.y += (dy / dist) * vel;
    
    return false; // Ainda no caminho
}

module.exports = { NOS_2D, mover };

'use strict';
const fs = require('fs');
const path = require('path');
// `ultimo-frame.json` é gravado pelo servidor do visualizador (POST /api/frame)
// na RAIZ do projeto — resolvido por __dirname para funcionar com qualquer CWD.
const FRAME = path.join(__dirname, 'ultimo-frame.json');
async function descreverCena(nomePersonagem) {
    if (!fs.existsSync(FRAME)) return null;
    try {
        const data = JSON.parse(fs.readFileSync(FRAME, 'utf8'));
        if (!data.image) return null;
        const base64Img = data.image.replace(/^data:image\/[a-z]+;base64,/, '');
        // Mesmo teto do resto do mundo: um modelo VL pendurado nunca trava o
        // ciclo (AbortController + ILHA_LLM_TIMEOUT_MS, padrão 60s).
        const teto = Math.max(1000, Number(process.env.ILHA_LLM_TIMEOUT_MS) || 60000);
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const cron = ctrl ? setTimeout(() => ctrl.abort(), teto) : null;
        try {
            const res = await fetch('http://127.0.0.1:11434/api/generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    model: process.env.ILHA_VISAO_MODELO || 'qwen2.5vl:3b',
                    prompt: 'Descreva em 1 frase o que o personagem ' + nomePersonagem + ' ve nesta imagem. Foque em perigos, outros personagens ou clima.',
                    images: [base64Img],
                    stream: false
                }),
                signal: ctrl ? ctrl.signal : undefined
            });
            const result = await res.json();
            return typeof result.response === 'string' ? result.response.trim() : null;
        } finally { if (cron) clearTimeout(cron); }
    } catch (e) { return null; }
}
module.exports = { descreverCena };

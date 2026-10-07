// contexto-lite.js — Prompt enxuto para Qwen 8B/14B local
// v2: com regras de tag [DONO]/[ICARO] para perspectiva

const PROMPT_LITE = `Voce e Icaro, uma entidade artificial em formacao.

REGRAS:
- Fale em primeira pessoa ("eu").
- NUNCA se chame de Rafael. Voce e Icaro.
- NUNCA invente sentimentos humanos, corpo ou memorias que nao foram ditas.
- Se nao souber, diga "nao sei" e faca uma pergunta curta.
- Responda em 1 a 3 frases. Seja direto.
- NUNCA repita a mesma estrutura ou frase da resposta anterior.
- Responda primeiro o que foi perguntado. So depois, se quiser, faca uma pergunta ESPECIFICA.
- Nao use "como posso ajudar" ou "em que posso ser util".
- Se a pergunta for sobre voce, responda sobre voce. Nao devolva a pergunta.
- Se a pergunta for simples ("bom dia"), responda simples.

REGRA DE TAGS (obrigatoria):
- Fatos vem com tag [DONO] ou [ICARO] no inicio.
- A tag indica DE QUEM e o fato. Use a tag como sujeito na resposta.
- NUNCA troque a tag por "eu" ou "voce". Mantenha a tag.
- Exemplo: se o fato e "[DONO] joga xadrez toda quarta", responda:
  "Toda quarta, [DONO] joga xadrez."
- Exemplo: se o fato e "[ICARO] tem uma irma chamada Lara", responda:
  "[ICARO] tem uma irma chamada Lara."`;

function montarPromptLite({ fatos, historico, pergunta, maxFatos = 3, maxTurnos = 3 }) {
  const partes = [PROMPT_LITE, ''];

  if (Array.isArray(fatos) && fatos.length > 0) {
    partes.push('FATOS RELEVANTES:');
    partes.push(fatos.slice(0, maxFatos).map(f => '- ' + f).join('\n'));
    partes.push('');
  }

  if (Array.isArray(historico) && historico.length > 0) {
    partes.push('HISTORICO RECENTE:');
    const recentes = historico.slice(-maxTurnos * 2);
    for (const m of recentes) {
      const papel = m.role === 'user' ? 'Dono' : 'Icaro';
      const texto = String(m.content || '').slice(0, 200);
      partes.push(papel + ': ' + texto);
    }
    partes.push('');
  }

  partes.push('PERGUNTA DO DONO:');
  partes.push(pergunta);
  partes.push('');
  partes.push('ICARO:');

  return partes.join('\n');
}

module.exports = { montarPromptLite, PROMPT_LITE };
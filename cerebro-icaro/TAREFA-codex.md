# Tarefa v2: rastrear onde V2 entra no prompt em modo chat puro

## Contexto

Bug observado: string `relacao_com_rafael` apareceu no output do Ícaro.
Investigação anterior achou a chave em `memoria-v2.json:171`, como predicado de fato ativo.

O modo `chat-puro.flag` está ATIVO. Nesse modo, o `montarPrompt` desvia para `montarPromptPuro`, que NÃO deveria consultar V2.

## Pergunta a responder

Onde no código a V2 ainda é consultada ANTES do `montarPromptPuro` ser chamado?

## Passos

1. Ler a função `processar(texto, origemEvento, temperatura)` em `icaro-hibrido.js` do início ao fim.

2. Listar TODAS as chamadas que consultam V2 (`nucleo-memoria-v2`, `NucleoV2`, `mv2`) antes de chegar em `montarPrompt`.

3. Verificar:
   - `detectarEnsinamento` → `salvarEnsinamento` → chama V2?
   - `detectarFatoNatural` → chama V2?
   - `gravarPropostaV2` → chama V2?
   - `confirmarProposta` → chama V2?
   - Rota determinística (`rota_disse`) → chama V2?
   - Relação determinística → chama V2?
   - `selecionarFatosRelevantes` → chama V2 (sim, sempre)?
   - `montarBlocosGavetas` → chama V2?
   - `gerarPosicaoAtual` → chama V2?

4. Para cada chamada, reportar:
   - Arquivo:linha
   - Se está protegida por `if (CHAT_PURO)` ou não
   - O que ela devolve que pode chegar ao prompt

5. Reportar a rota exata que produziu `relacao_com_rafael` no output.

## Restrições

- NÃO modificar nada ainda. Só investigar e reportar.
- Reportar com arquivo:linha, trecho de código, e conclusão.
- Se não encontrar a rota, dizer "não consegui reproduzir".

## Formato esperado do relatório

Para cada ponto:
# Checkpoint — ilha e mapa (2026-10-01)

## Estado deste encerramento

- Nenhum ciclo da simulação foi avançado neste turno.
- Não foi criado commit nem feito `git checkout`/`stash`: o repositório já tinha muitas alterações locais e arquivos não rastreados, inclusive de outras tarefas. Agrupá-los ou descartá-los poderia apagar trabalho do Rafael.
- A tentativa de conferir os arquivos e processos nesta sessão falhou antes da execução (`apply deny-read ACLs`). Portanto, não consegui confirmar se há algum processo de simulação rodando nem encerrá-lo com segurança. O processo servidor do visualizador e o processo que avança ciclos não devem ser confundidos.

## Onde está o trabalho

- Repositório: `C:\Users\Rafael\ilha`.
- Visualizador principal: `visualizador-ilha.html`.
- Servidor do visualizador: `visualizador-ilha.js`.
- Arte de referência: `mapa-ilha-referencia.png`, servida pelo endpoint `/mapa-ilha-referencia.png`.
- Regras de escopo: `INVENTARIO-VISUALIZADOR.md`.
- Existem cópias anteriores do visualizador `visualizador-ilha.html.backup-layout-*`.

## O que foi feito no visualizador

- A arte fornecida da ilha foi conectada ao canvas como mapa, com ajuste proporcional à área disponível.
- O servidor foi ajustado para reler o HTML em cada requisição e servir a imagem de referência; na sessão anterior os endpoints HTML e PNG responderam HTTP 200.
- O canvas tenta cobrir os personagens, os nomes, a fogueira e o barco que já vêm impressos na arte, para desenhar depois elementos ligados ao estado da simulação.
- Foram implementados marcadores de casas, personagens desenhados pelo visualizador, rotas entre casa e posição, e animações visuais de água, cachoeira, barco, fogo e plantação.
- As casas de Ícaro e Maria foram aumentadas (escala 2,5) após o relato de que estavam minúsculas comparadas à casa ilustrada de João.
- A atualização visual foi limitada a cerca de 10 quadros por segundo e pausada quando a aba fica oculta para reduzir uso da GPU.
- Foi adicionado fallback para mostrar a arte original se o processamento que remove os elementos impressos falhar ou ainda não estiver pronto.

## Limites e pendências

- Ainda falta validar o resultado em um navegador real após recarga forçada (`Ctrl+F5`), especialmente o tamanho das casas e a qualidade das áreas cobertas na imagem.
- As áreas/funções novas (fazenda, pesca no mar, banho na cachoeira, barco e fogueira) são indicações visuais no mapa. Não foram adicionadas ao Qwen nem ao motor da simulação; essa integração deve esperar suporte real do backend.
- Confirmar no próximo início se o servidor local continua ativo. Se o mapa estiver desatualizado, recarregar com `Ctrl+F5`.
- Confirmar separadamente se existe um processo que avança ciclos. Encerrar apenas esse processo, se existir e estiver identificado; manter o servidor visualizador não faz a simulação avançar por si só.
- Rever as máscaras sobre os elementos impressos e posicionamento das casas/personagens com uma captura real do navegador.
- Preservar todas as alterações já existentes no repositório. Não usar `git checkout`, `reset`, `clean` ou `stash` global para preparar o próximo trabalho.

## Próxima retomada

1. Ler este checkpoint e `INVENTARIO-VISUALIZADOR.md`.
2. Conferir `git status --short` antes de editar; não assumir que alterações não relacionadas pertencem ao mapa.
3. Abrir o visualizador, recarregar com `Ctrl+F5` e capturar o resultado.
4. Ajustar desenho, casas e posições conforme a captura e o mapa de referência.
5. Verificar com Rafael antes de integrar novas ações ao Qwen/motor, respeitando o suporte existente.

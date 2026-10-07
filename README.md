# Ilha V2 experimental

## Fluxo oficial após consolidação

O executável oficial é `node ilha.js N`. Ele usa `estado-v2.js`, `motor-v2.js`, `percepcao-v2.js`, `decisor.js` e `persistencia-v2.js`. Os módulos `mundo.js`, `motor.js`, `percepcao.js` e `persistencia.js` são compatibilidade/histórico do protótipo anterior; não participam do fluxo oficial. `ilha-v0-*.js` são backups V0 preservados.

### Contrato do estado

`estado-ilha.json` tem `versao: 5`. `mundo.tempo.ciclo` é o único contador lógico do calendário; dia, período, estação e ano são derivados dele. `mundo.ecossistema` é a fonte de verdade dos estoques naturais; cada entidade em `seres` mantém necessidades, capacidades e inventário próprios. `descobertas`, `memorias` e `historico` são listas distintas. A carga valida versão, calendário, entidades, números, limites de estoque e estrutura de auditoria; estados inválidos param com erro explícito.

### Ciclo e consequência

Percepção observável e sensações qualitativas são apresentadas ao decisor junto às ações permitidas. O decisor escolhe um identificador e fornece motivo; `motor-v2.js` revalida a ação e calcula seu resultado a partir dos estoques reais, depois atualiza ecologia, necessidades e calendário. Texto do modelo não define consequências. Falha do decisor ou ação inválida não avança nem salva o ciclo. Recursos esgotados não se regeneram espontaneamente: água só recupera com chuva (e fluxo de nascente enquanto houver nascente), peixes só se reproduzem se a população for maior que zero, e árvores vivas podem frutificar na estação apropriada.

### Persistência e migração

O estado é gravado em arquivo temporário e renomeado após validação; os registros novos são eventos compactos em `logs/ilha-v2.jsonl`, sem snapshots completos. O histórico legado `logs/ilha.jsonl` permanece byte a byte intacto. A migração reconhece V2, V3, V4 e o formato V0 conhecido, mantém estoques, descobertas, memórias e auditoria, elimina o contador redundante e valida antes de sobrescrever. Antes da migração automática, cria `estado-ilha.json.pre-v5.bak`; formato desconhecido ou inválido causa erro, sem sobrescrita.

O ciclo do estado é a chave de retomada. O registro é acrescentado antes do estado; a escrita de log é idempotente por ciclo para reduzir duplicações em interrupção entre as duas gravações. Reiniciar parte do último estado confirmado.

### Módulos, testes e limites

`calendario.js` define calendário/estações; `estado-v2.js` contém o contrato e migração; `ecossistema.js` executa dinâmica ambiental e agentes sociais; `percepcao-v2.js` filtra pistas observáveis; `motor-v2.js` valida ações e atualiza o mundo; `decisor.js` integra com Ollama; `persistencia-v2.js` grava estado e eventos; `ilha.js` orquestra. Execute `node testes.js` para a suíte de contrato V5, migração, ações, falhas, persistência, retomada, ecologia, agentes sociais e trajetória. Requer Node.js 18+ e Ollama para execução com o decisor padrão.

Limitações: um agente ativo (Ícaro), populações animais agregadas, descoberta explícita ainda sem regra própria além de preservar legado, sem doenças/qualidade da água/reprodução humana; estados emocionais antigos são preservados, sem dinâmica subjetiva inventada. O comportamento do decisor é experimental e não é evidência de consciência. Não existe conexão configurada com `icaro-pc` ou memória de produção.

Execução: `node ilha.js 1` (um ciclo) ou `node ilha.js 30`. Requer Node.js 18+ e Ollama em `127.0.0.1:11434`; por padrão usa `qwen3:8b`. `ILHA_MODELO` e `OLLAMA_URL` podem selecionar modelo e endpoint. Falha de conexão ou resposta inválida interrompe o ciclo; não há decisor substituto.

## Fluxo

`calendario.js` comprime quatro períodos por dia, 30 dias por estação e quatro estações por ano. `mundo.js` conserva estoques e processos ecológicos; `seres.js` contém necessidades/capacidades; `percepcao.js` filtra pistas observáveis; `decisor.js` solicita escolha e justificativa ao modelo; `motor.js` verifica e resolve ações sobre estoques; `persistencia.js` grava estado atômico e histórico JSONL; `ilha.js` integra os ciclos.

O estado completo fica em `estado-ilha.json`; cada ciclo novo é acrescentado em `logs/ilha.jsonl`. A primeira execução migra os estoques conhecidos da V0 para o inventário de Ícaro e mantém descobertas. Backups V0 são mantidos sem alterações.

## Mundo persistente, seres e trajetória

`ecossistema.js` prepara estados antigos sem descartar estoques e atualiza o ambiente a cada ciclo, inclusive quando Ícaro não coleta nada. Água possui lago, nascente e poço com nível, capacidade, qualidade, chuva, recarga e evaporação. Árvores persistem por espécie, idade, saúde, frutos e sementes; populações de peixes, aves e mamíferos respondem a alimento, clima, reprodução, mortalidade e migração. Aves e mamíferos têm indivíduos com idade, sexo, saúde, energia e localização; peixes seguem como população agregada. A percepção traduz essas condições em pistas qualitativas, sem expor o estado numérico completo.

Maria e João fazem parte do estado persistido, têm necessidades, inventário, experiências, memória e vínculos. A cada ciclo, regras gerais de necessidade selecionam ações de sobrevivência e convívio; isso não atribui personalidade ou preferências estáveis. A memória individual de Ícaro registra percepções ao longo da trajetória e entra no contexto enviado ao decisor. Memórias, relações, população, clima e estoques sobrevivem à retomada do JSON.

Execute `node experimento-trajetoria.js 240` para comparar um controle que oculta memória/experiência do decisor com uma trajetória que fornece essas informações, ambos iniciados do mesmo mundo. O experimento usa por padrão uma política de referência transparente para validar ciclos longos e mecânica; por construção ela ignora memória, portanto comportamento igual nos dois braços não demonstra aprendizagem. A API aceita um decisor substituto para estudos com modelo. Para inferir aprendizagem, rode várias réplicas pareadas com sementes/exposições controladas e compare ações em situações perceptivas equivalentes; um único ensaio não estabelece adaptação causal.

## Limites experimentais

A ilha inicial contém nascente, rio, bosque e floresta com estoques agregados de peixes, frutos, madeira e animais. O protótipo já aplica consumo, chuva, crescimento e reprodução sazonal e mortalidade por envelhecimento para populações/árvores. Não modela ainda indivíduo animal, qualidade/contaminação da água, doenças ou reprodução humana. Estados emocionais estão disponíveis no esquema, sem atribuir traços de personalidade ou declarar consciência.

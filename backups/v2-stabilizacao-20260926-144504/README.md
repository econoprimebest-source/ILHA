# Ilha V2 experimental

Execução: `node ilha.js 1` (um ciclo) ou `node ilha.js 30`. Requer Node.js 18+ e Ollama em `127.0.0.1:11434`; por padrão usa `qwen3:8b`. `ILHA_MODELO` e `OLLAMA_URL` podem selecionar modelo e endpoint. Falha de conexão ou resposta inválida interrompe o ciclo; não há decisor substituto.

## Fluxo

`calendario.js` comprime quatro períodos por dia, 30 dias por estação e quatro estações por ano. `mundo.js` conserva estoques e processos ecológicos; `seres.js` contém necessidades/capacidades; `percepcao.js` filtra pistas observáveis; `decisor.js` solicita escolha e justificativa ao modelo; `motor.js` verifica e resolve ações sobre estoques; `persistencia.js` grava estado atômico e histórico JSONL; `ilha.js` integra os ciclos.

O estado completo fica em `estado-ilha.json`; cada ciclo novo é acrescentado em `logs/ilha.jsonl`. A primeira execução migra os estoques conhecidos da V0 para o inventário de Ícaro e mantém descobertas. Backups V0 são mantidos sem alterações.

## Limites experimentais

A ilha inicial contém nascente, rio, bosque e floresta com estoques agregados de peixes, frutos, madeira e animais. O protótipo já aplica consumo, chuva, crescimento e reprodução sazonal e mortalidade por envelhecimento para populações/árvores. Não modela ainda indivíduo animal, qualidade/contaminação da água, doenças ou reprodução humana. Estados emocionais estão disponíveis no esquema, sem atribuir traços de personalidade ou declarar consciência.
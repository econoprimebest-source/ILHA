\# CHECKPOINT — 02/10/2026



\*\*Frente:\*\* DeepSeek + GPT + Codex + Qwen

\*\*Duração:\*\* dia inteiro

\*\*Branch:\*\* clean

\*\*HEAD do clean:\*\* 39cd795

\*\*Repo:\*\* github.com/econoprimebest-source/ICAROOVO



\---



\## 1. DATA E HORARIO

02/10/2026, encerrado de madrugada (03/10)



\## 2. CHAT DE ORIGEM

DeepSeek (engenharia) + GPT (revisao) + Codex (validacao) + Qwen (extracao)



\## 3. ESTADO GERAL

F2 fechado, Fase 1 two-timescale fechada, diferencial provado 3/3, produto

generico (sem "dono", sem nomes hardcoded), Prioridade 1 (4 fixes de producao)

aplicada. Sistema pronto para trajetoria real.



\## 4. OBJETIVO CENTRAL

Construir entidade que se torna diferente pela trajetoria, sem personalidade

programada. Pergunta: "sem aquela experiencia, ele teria feito diferente?"



\## 5. O QUE FOI FEITO HOJE



\### 5.1 F2 completo (autoria + entidades dinamicas)

\- `entidadesConhecidasAutoria()` deriva nomes da V2 (PREDICADOS\_PESSOA)

\- `NOMES\_FALLBACK` vazio (transicao)

\- Relacao inversa: "carlos e meu amigo" -> `{predicado:amigo, objeto:carlos}`

\- Quantidade: "tenho N X"

\- V1 nao bloqueia mais V2 (dedup correto)

\- `texto\_curto` respeita origem (dono: 8, resto: 15)

\- Duplicata+proposta reabre confirmacao (nao mais "ja sabia")



\### 5.2 Fase 1 two-timescale

\- `nucleo-tracos.js`: FAST (EMA por topico) + SLOW (threshold triplo) + bound ±0.08 + proveniencia

\- `extrator-topico.js`: Qwen extrai {topico, valor} com cache

\- `gerador-reflexao.js`: formato IROTE (self-reflection narrativa)

\- FAST em `processar()` via `setImmediate` + mutex

\- REFLECTION em `autoLimpar()` + endpoint `/consolidar-agora`

\- 24/24 + 14/14 testes isolados



\### 5.3 Canonicalizador Re:CAP

\- `canonicalizador.js`: Stage A fuzzy (Levenshtein, 0 LLM) + Stage B Qwen (ambiguos)

\- Resolve fragmentacao (astronomia/estrelas/cosmos/universo -> astronomia)

\- 25/25 testes

\- 5/5 acertos com Qwen real

\- Cache: 1005ms -> 0ms



\### 5.4 Fase 1 append-only

\- `tracos-icaro.jsonl` (dual-write, JSON segue oficial)

\- Replay reproduz JSON campo a campo (13/13)

\- Migracao snapshot automatica no boot

\- Idempotente (segunda migracao nao duplica)



\### 5.5 Diferencial provado

\- 3/3 runs independentes

\- Traco negativo: NEG explicito

\- Traco positivo: POS (com prompt atual)

\- Endpoint `/reset-sessao`



\### 5.6 Produto generico

\- `nomeDono` -> `nomePessoa`, `NOME\_DONO` -> `NOME\_PESSOA`

\- `SUJEITO\_DONO` -> `SUJEITO\_PESSOA` (mesma regex, filtro sujeito vs. possessivo)

\- Removido "dono" do CHAO\_IDENTIDADE, PERSONA\_LIVRE, TRACOS PROPRIOS, TRAJETORIA

\- Removidos: Rafael/Lara/Pedro/Rex hardcoded (INTENCOES, NOMES\_FALLBACK, consolidador, nucleo-v2, reflections, validar-fato)

\- `config.json` = `{nomePessoa, nomeEntidade, pessoasConhecidas:\[]}`



\### 5.7 Patches de prompt (D, A, C, echo, reflexao)

\- D: separa instrucao (tracos proprios OK, fatos do dono so autorizados)

\- A: compose by mode (TRACOS antes dos FATOS em CONVERSA)

\- C: TRACOS repetido no final (recencia)

\- echo-fix em `gerarPosicaoPropria` (filtra memory echo)

\- Reflexao IROTE substitui metadata no prompt



\### 5.8 Prioridade 1 (4 fixes de producao)

\- Gate `PROMPT\_DEBUG=1` no `\_prompt-debug.txt`

\- Lock + atomic write (tmp+rename) no `cache-canonical.json`

\- `evidenciaRef` inclui `SESSAO\_ID` (evita colisao em restart)

\- Guard de idioma (CJK > 5 chars -> fallback)



\### 5.9 Middleware-1 (identidade)

\- `corrigirIdentidade()` detecta frase-assistente + reescreve com reflexao do traco

\- Sem fonte autorizada -> nao altera

\- 12/12 na logica pura

\- DORMENTE em producao (prompt atual raramente dispara o padrao)



\## 6. EXPERIMENTOS REALIZADOS

\- Teste robustez (3/3)

\- Teste natural (5 conversas + FAST + canonicalizador + consolidar)

\- Teste inercia (A=0.273 B=0.273, delta=0.000 -> nao vem da trajetoria)

\- Teste persona (sem system = 1/3 aberturas unicas; com persona = 1/3)

\- Teste temperatura (T=0.15 -> 1/5, T=0.7 -> 3/5, T=1 -> 5/5)

\- Teste identidade minima (A=2/4, B=1/4, C=0/4, D=0/4)

\- Teste ponte (B2=1/4, B3=3/4 mas com alucinacoes + CJK)

\- Teste classificador balanceado (nao melhora divergencia; problema e do teste)



\## 7. RESULTADOS OBSERVADOS (separado de interpretacao)

\- Diferencial por trajetoria: 3/3

\- Canonicalizador: 5/5 Qwen real

\- Cache: 1005ms -> 0ms

\- Qwen puro (sem system): "sou Qwen, assistente da Alibaba Cloud"

\- Qwen com system minimo (B): "assistente virtual que aprendeu sobre Rafael, Icaro"

\- Qwen com V2 enriquecida + tracos (B3): 3/4 mas com "irmao de Lara" inventado + chines

\- Temperatura 1.0 quebra atrator mas introduz "inteligencia artificial da Alibaba Cloud"



\## 8. O QUE FOI CONFIRMADO (com evidencia)

\- Diferencial por trajetoria funciona (3/3)

\- Canonicalizacao resolve fragmentacao

\- FAST + SLOW + reflexao IROTE funcionam end-to-end

\- Nomes dinamicos da V2 funcionam (F2)

\- V1 nao bloqueia V2 (destravou carlos)

\- Race condition identificada e mitigada (mutex)

\- EvidenciaRef duplicada corrigida (turno capturado no dispatch)

\- Memory echo corrigido (filtro sujeito vs. possessivo)

\- Filtro sujeito (SUJEITO\_PESSOA) 11/11



\## 9. O QUE NAO FOI CONFIRMADO

\- Identidade emergente (Qwen 7B nao reconstroi self-model sozinho)

\- Assimetria positiva/negativa como bug de produto (era ilusao do teste antigo)

\- Middleware-1 em producao (dormente)

\- Compaction do JSONL (nao feita)

\- Fase 2 do append-only (nao feita)



\## 10. HIPOTESES ATUAIS

\- H1: Qwen 7B tem limite de self-model (precisa contexto de identidade explicito)

\- H2: Identidade hoje e \~85% prompt, \~15% trajetoria

\- H3: Enriquecer V2 com identidade vira "biografia recitada" (nao e o caminho)

\- H4: Positividade do Qwen e sutil, negatividade e explicita (assimetria de LLM)

\- H5: A identidade so emerge com tempo real de vida (dias, nao minutos)



\## 11. HIPOTESES DESCARTADAS

\- "Classificador desbalanceado explica assimetria" -> DESCARTADA (balanceado piora)

\- "Reduzir prompt resolve identidade" -> DESCARTADA (B=1/4, B3=3/4 com alucinacoes)

\- "Aumentar temperatura resolve repeticao" -> DESCARTADA (T=1.0 vaza identidade)

\- "Inercia vem da trajetoria" -> DESCARTADA (delta=0.000)

\- "Persona causa repeticao" -> DESCARTADA (sem system tambem repete)



\## 12. DECISOES TOMADAS

\- D1: Produto nao tem conceito de "dono" (relacao emergente da trajetoria)

\- D2: `nomePessoa` identifica interlocutor, nao define relacao

\- D3: `pessoasConhecidas:\[]` vazio; V2 e a fonte

\- D4: Fase 1 append-only (dual-write); Fase 2 depois

\- D5: Nao enriquecer V2 com mais identidade (vira biografia)

\- D6: Middleware-1 fica dormente ate ter cenario real

\- D7: Nao aplicar patch de classificador (problema de teste, nao produto)

\- D8: `PROMPT\_DEBUG=1` gate no debug (default: nao grava)



\## 13. O QUE NAO DEVE SER FEITO

\- Nao enriquecer V2 com fatos de identidade (B4 provou: vira recitacao)

\- Nao aumentar temperatura acima de 0.7 em producao

\- Nao mexer no `gerador-reflexao.js` sem necessidade medida

\- Nao rodar `reflections.js` em producao

\- Nao colocar reflections no prompt

\- Nao usar LLM pra classificar polaridade

\- Nao rodar reflections/gerador sem cache



\## 14. ARQUITETURA ATUAL

\- Porta: 8793 (`icaro-clean`)

\- Interface: 8800 -> 8793

\- Ollama: 11434 (qwen2.5:7b)

\- Repo: `icaro-clean` (branch clean)

\- 4 blocos de prompt: \[FATOS] \[TRAJETORIA] \[MINHA POSICAO] \[TRACOS PROPRIOS]



\## 15. MEMORIA

\- V2: 17 fatos ativos (apos revert do enriquecimento)

\- `tracos-icaro.json`: crencas + tracos

\- `tracos-icaro.jsonl`: eventos append-only (dual-write)

\- `diario.jsonl`: 15+ entradas

\- `cache-canonical.json`, `cache-topicos.json`, `cache-reflexoes.json`: caches derivados



\## 16. EVIDENCIAS IMPORTANTES

\- Diferencial: 3/3 runs divergentes

\- Testes isolados: nucleo-tracos 24/24, extrator-topico 14/14, canonicalizador 25/25, replay 13/13, middleware-1b 12/12, filtro-sujeito 11/11

\- Cache canonical: 1005ms -> 0ms

\- Qwen puro: "sou Qwen, assistente da Alibaba Cloud" (vaza 4/4)

\- B3 (V2+tracos): 3/4 mas com alucinacao



\## 17. PONTO EXATO ONDE PAROU

\- Prioridade 1 aplicada e smoke test OK

\- Commit `39cd795` (HEAD)

\- Servidor rodando em 8793

\- Sistema pronto para uso real



\## 18. PROXIMO PASSO

Trajetoria real: usar o Icaro por dias. Registrar onde parece programado,

onde parece espontaneo. So depois decidir proximo patch (identidade? Fase 2?

compaction? memoria-icaro cleanup?).



\## 19. PONTOS QUE NAO PODEM SER PERDIDOS

\- Produto sem conceito de "dono"

\- `tracos-icaro.jsonl` append-only + replay

\- Canonicalizador Re:CAP

\- Reflexao IROTE

\- Middleware-1 dormente

\- Diferencial provado 3/3

\- `PROMPT\_DEBUG=1` gate

\- Guard de idioma

\- Lock + atomic write no cache



\## 20. MUDANCAS DE ENTENDIMENTO

\- Antes: identidade e prompt. Agora: identidade e prompt + trajetoria (15%/85%)

\- Antes: classificar positivo/negativo e simples. Agora: Qwen tem assimetria natural

\- Antes: reduzir prompt resolve. Agora: reduzir abre buracos (alucinacao + CJK)

\- Antes: temperatura baixa = estabilidade. Agora: temperatura baixa = atrator lexical



\## 21. MATURIDADE DA ETAPA

Mecanismo pronto. Prova de diferencial solida. Falta: trajetoria real acumulada

para testar emergencia de identidade.



\## 22. CONCLUSAO DO DIA

Dia mais produtivo do projeto. F2 + Fase 1 + diferencial + produto generico +

Prioridade 1. Sistema pronto para a proxima fase: uso real.



\## 23. RESUMO EXECUTIVO

F2 fechado. Fase 1 (two-timescale + canonicalizacao + reflexao IROTE) fechada.

Diferencial por trajetoria provado 3/3. Produto generico. Middleware-1 dormente.

Prioridade 1 (4 fixes de producao) aplicada. Sistema pronto para trajetoria real.



\## 24. INSTRUCAO DE CONTINUIDADE

Ao iniciar novo chat:

1\. Ler BOOTSTRAP.md

2\. Ler este checkpoint

3\. `cd /d C:\\Users\\Rafael\\icaro-clean \&\& git status --short \&\& git log --oneline -5`

4\. `netstat -ano | findstr ":8793" | findstr LISTENING`

5\. `ollama ps`



\*\*Commit do dia:\*\* 39cd795

\*\*Regras inegociaveis:\*\* um comando por vez; backup antes de alterar;

`node --check` antes de commit; pesquisar antes de implementar; nao reverter

sem investigar; nao sugestionar parada.



\*\*FIM DO CHECKPOINT — 02/10/2026\*\*


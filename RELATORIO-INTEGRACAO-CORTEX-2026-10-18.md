# RELATÓRIO DE ARQUITETURA — INTEGRAÇÃO DO CORTEX E DOS MECANISMOS COGNITIVOS DO ICAROOVO À ILHA AURORA

Data: 2026-10-18 · Escopo: auditoria somente-leitura + plano de integração.
Nenhum arquivo foi alterado na fase de auditoria.

---

## 1. REPOSITÓRIOS CONFIRMADOS

| Projeto | Caminho | Repo git | Branch | HEAD |
|---|---|---|---|---|
| **Ilha Aurora** | `C:\Users\Rafael\ilha` | `econoprimebest-source/ILHA.git` | `visualizacao-ilha` | `9b21222` |
| **ICARO-OVO** (canônico) | `C:\Users\Rafael\icaro-clean` | `econoprimebest-source/ICAROOVO.git` | `clean` | `fda55f3` + diffs locais preservados |
| ICARO-OVO (cópias antigas) | `icaro-pc` (master), `icaro-A`, `icaro-B` | mesmo remoto | — | 02/10 e 03/10 |

Confirmação do nome "ICARO-OVO": `git remote -v` em `icaro-clean` →
`git@github.com:econoprimebest-source/ICAROOVO.git`. O doc
`icaro-clean/ARQUITETURA-ATUAL.md` intitula-se "ARQUITETURA ATUAL — ICARO / OVO".

**Correção de premissa da missão:** `C:\Users\Rafael\icaro-clean\cortex-engine.js`
**não existe**. O `cortex-engine.js` (188 KB) está em `C:\Users\Rafael\icaro-pc\`
e em cópias (`ovo-v1`, `pacote-ovo`). Restrição tratada no sentido mais estrito:
**nenhum `cortex-engine.js` de nenhum caminho foi ou será alterado.**

Outras cópias detectadas e **não usadas** como fonte:
`icaro-cortex-sem-llm` (frente GPT/Qwen, sem remoto), `lara-cortex-v0`, `icaro-A/B`.

---

## 2. DIAGNÓSTICO DA ARQUITETURA ANTERIOR (ILHA)

### 2.1 Caminho real da decisão

```
rodar-ilha.js:7  →  rodada-autonoma.js:74 rodada(estado, opcoes)
  FASE 0   deslocamentos em curso                       (:81-93)
  FASE 0b  consequências do mundo na região             (:97)
  FASE 1   por ser vivo:                                (:102-116)
             acoes(estado,ser)            motor-v2.js:3
             montarContexto(...)          cerebro-personagem.js:36
             cerebroDe(opcoes,ser)        cerebro-personagem.js:88
             validarDecisao(await decidir) cerebro-personagem.js:70
  FASE 2   executar(estado,ser,acao)      motor-v2.js:18
  FASE 3   metabolismo/status/eco                        (:141-149)
  FASE 4   cortex.registrar + ser.memoria                (:153-162)
```

- `opcoes.cerebros` **só é usado nos testes** (`testes-v2.js:35,38-40,42,43,45,49`).
  Produção (`rodar-ilha.js:7`) não passa cérebros → sempre
  `decisor.js → cerebro.js → Ollama` (modelo `ILHA_MODELO || qwen3:8b`).
- **Ponto de plugue já existente e testado:** `criarCerebro({id, escolher})`
  (`cerebro-personagem.js:105`) consumido por `cerebroDe` (`rodada-autonoma.js:111`).
- Validação: `validarDecisao` exige `acao ∈ possíveis`, `motivo` não vazio ≤240,
  `origem` string; violação = `err.decisao=true`, ciclo não aplicado.
- Motor: `motor-v2.executar(:18)` recusa ação fora das possíveis; **o texto do
  modelo nunca define consequência**.

### 2.2 Cortex, memória e cérebro já existentes

| Arquivo | O que é | Estado |
|---|---|---|
| `cortex.js` (55 linhas) | Cortex por personagem: `criar/garantir/registrar/contexto`; biografia, diário, memória, trajetória, objetivos, crenças. Semente neutra. | ativo, isolado por `ser.cortex` |
| `memoria-personagem.js` (346) | **M1** adaptador Ilha↔ICAROOVO: cópias byte-idênticas de 4 módulos em `memorias/<id>/`, papéis (system/user/assistant), checkpoint de identidade, compactador. | ativo (`ativar()` em `rodar-ilha.js:1`) |
| `cerebro-personagem.js` (124) | Contrato: contexto individual, validação, resolução de cérebro, `criarCerebro` (FASE D). | ativo |
| `rodada-autonoma.js` (166) | Loop unificado; registra experiência pós-consequência (`guardarExperiencia` com try/catch). | ativo |
| `adaptador-cerebro-icaro.js` (73) | Mapeia contexto→fatos; `decidir()` = falha honesta (`CONEXAO_NAO_FEITA`). | inerte, corretamente |
| `cerebro-icaro/` (20 arquivos) | Cópia de `icaro-clean`; só 4 módulos + `checkpoint-identidade` são requeridos. | parcial; **working tree dessincronizado do HEAD** (ver §6) |

### 2.3 Lacunas reais encontradas

1. **Nenhum mecanismo cognitivo do ICAROOVO participa da decisão na Ilha.**
2. `cerebro.js:55` **não tem timeout** → Ollama que aceita conexão e não responde
   pendura `rodada()` para sempre (`ocupado=true` no loop, sem watchdog).
3. Falha de **um** ser aborta o ciclo inteiro — `decisoes[]` é coletado em loop
   antes da execução (`rodada-autonoma.js:101-116`).
4. Não há teste de timeout nem teste que rode `cerebro.js` real sem mock.
5. `experimento-trajetoria.js` não usa `rodada`, nem LLM, nem cérebros individuais.

---

## 3. DIAGNÓSTICO DOS MECANISMOS DO ICAROOVO (33 `nucleo-*`)

Classificação por zona de atuação no runtime `icaro-hibrido.js`:

- **(a) entra no prompt/decisão** — `montarPromptPuro` 878–1165, AURA 2094–2099,
  LLM 2130;
- **(b) pós-turno, só escreve estado** — 2166–2308;
- **(c) agendado** — `iniciarAutoLimpar` 3111–3240;
- **(d) nunca roda** — `nucleo-contrato`, `nucleo-guardrail`, `consolidar.js`.

### 3.1 Tabela-mestre (resumo executivo)

| Mecanismo | Zona | Estado no ICAROOVO | Desacoplável? |
|---|---|---|---|
| `nucleo-aura` | a | **ativa por padrão** (sem env); muda prompt **e** temperatura | **sim — puro, 0 deps, 0 identidade** |
| `nucleo-self-model` | a+b+c | **ativa** (bloco `SOBRE MIM` no SYSTEM de todo turno) | sim (dep: `extrator-crencas`) |
| `nucleo-tracos` | a+c | **ativa** (3 traços no prompt; promoção a cada 30 min) | sim, **path fixo** → resolve por cópia |
| `nucleo-correcao` | a+b | **ativa** (hesitação ≥3 correções no tópico) | sim |
| `nucleo-experiencias` | a+b | **ativa** (3 experiências no prompt) | sim |
| `nucleo-memoria-v2` + `selecao-contextual` | a | **ativa** (fatos no prompt) | sim, **path fixo** |
| `nucleo-peso` | a | **SOMBRA** (compara e loga; só troca com `ICARO_PESO=1`) | sim |
| `nucleo-medo` | a | **SOMBRA** (nível 0 = off; `blocoMedo()` devolve `''`) | sim |
| `nucleo-prov-label` | a | **SOMBRA** (off sem `ICARO_PROV_LABEL=1`) | sim |
| `nucleo-cuidado` | a(cond)+b | atos **sempre gravados**; fala no prompt só com `ICARO_CUIDADO_OFERTA=1` | sim |
| `nucleo-agencia` | c+a(cond) | ciclo **sempre liga**; foco no prompt só com `ICARO_AGENCIA_MODO≥1` | sim |
| `nucleo-proveniencia` | b | **ativa em sombra** (grava; desliga só com `ICARO_PROVENIENCIA=0`) | sim |
| `nucleo-trilha-causal` | b | **ativa** (auditoria do turno; nunca entra no prompt) | **sim — puro, 0 deps** |
| `nucleo-associacoes` + `canonicalizador` | a+b | **ativa**, porém **exige LLM** (`extrator-topico`, `nucleo-llm` → `require('./config.json')` em módulo) | **não neste ciclo** |
| `nucleo-iniciativa`, `nucleo-proatividade` | b/c | sombra; **texto literal "Ícaro…"/"Rafael"** acoplado ao chat do dono | **não — identidade pessoal** |
| `nucleo-sono`, `nucleo-pensamento`, `nucleo-presenca`, `nucleo-direcoes`, `nucleo-gavetas`, `nucleo-continuidade` | c/sombra | fora do prompt ativo (`chat-puro.flag`) ou acoplados (`config.json.nomePessoa`, fuso, "Você é o Ícaro") | **não neste ciclo** |
| `consolidar.js` | d (CLI) | **prompt "Sujeito sempre: 'Rafael'"**, guarda `rafael\|icaro` | **não — identidade pessoal** |
| `nucleo-contrato`, `nucleorail` | d | sem `require` no runtime | — |

### 3.2 Dependências de identidade pessoal do Ícaro (a NÃO copiar)

- `config.json` (`nomePessoa`/`nomeEntidade`) — lido por `nucleo-llm` e `nucleo-presenca`.
- Prompts "Você é o Ícaro" — `nucleo-sono`, `nucleo-pensamento`, `nucleo-espacos`.
- `Rafael` literal — `consolidar.js:17,109,135`, `nucleo-fila-extracao:22`,
  `nucleo-proatividade:167`, rota `/iniciativa` (`^\s*rafael\b`).
- Regex `rafael|icaro` — `extrator-crencas.js:29-30`, `remetente:dono` em `nucleo-tracos:206`.
- Lista curada pessoal — `nucleo-topicos.js` (xadrez, banda, filme, família).
- UA `IcaroBusca/1.0`, fuso `America/Bahia`, `memoria-icaro.json`, `chat.jsonl` canônico.

### 3.3 Cadeia de dependências dos módulos escolhidos

```
nucleo-aura                       → (sem deps)
nucleo-trilha-causal              → (sem deps)
nucleo-cuidado                    → (sem deps)
nucleo-topicos                    → (sem deps)
nucleo-memoria-v2                 → (sem deps)
nucleo-experiencias               → (sem deps)
nucleo-prov-label                 → (sem deps)
nucleo-correcao                   → nucleo-topicos
nucleo-proveniencia               → extrator-crencas, nucleo-correcao
nucleo-self-model                 → extrator-crencas
extrator-crencas                  → nucleo-topicos, nucleo-tracos (+ extrator-topico em try/catch → null)
nucleo-selecao-contextual         → nucleo-memoria-v2 (+ nucleo-associacoes em try/catch)
nucleo-peso                       → nucleo-selecao-contextual
nucleo-medo                       → nucleo-correcao, nucleo-selecao-contextual, nucleo-prov-label
nucleo-agencia                    → nucleo-self-model, nucleo-memoria-v2, nucleo-experiencias
nucleo-tracos                     → (sem deps)
```

**Cadeia evitada de propósito:** `nucleo-associacoes → canonicalizador →
nucleo-llm → require('./config.json')` em nível de módulo (lança se não houver
`config.json`) e `extrator-topico` (LLM). Nenhum dos módulos escolhidos chama
LLM internamente — **todos são determinísticos**.

---

## 4. RISCOS IDENTIFICADOS

| # | Risco | Miteração no plano |
|---|---|---|
| R1 | Importar identidade autobiográfica do Ícaro | Cópia só de módulos sem identidade; estado em `memorias/<id>/mecanismos/`; teste de vazamento por grep de termos pessoais |
| R2 | Mecanismo em sombra virar influência não validada | Gates idênticos aos do ICAROOVO (`ICARO_*`): peso/medo/cuidado-oferta/agência-foco **off por padrão** |
| R3 | Caminho fixo de estado (`tracos-icaro.json` etc.) compartilhado entre personagens | Isolamento por cópia do módulo em diretório próprio (mesma técnica já validada do M1) |
| R4 | `estado-ilha.json` / `logs/` de produção sobrescritos | Nenhuma escrita fora de `memorias/<id>/mecanismos/`; testes usam raiz própria |
| R5 | LLM fora do ar travar o loop | `AbortController` + `ILHA_LLM_TIMEOUT_MS` em `cerebro.js` |
| R6 | Bug na nova camada derrubar a simulação | Fallback configurável para o cérebro anterior (`ILHA_COG_FALLBACK`) |
| R7 | Alterar `icaro-clean` por engano | Fonte somente leitura; manifesto com SHA-256 antes/depois |
| R8 | Alterações locais não rastreadas da Ilha | `git status` registrado; backups antes de editar; nada restaurado/apagado |
| R9 | Módulo exigir `config.json`/LLM | Smoke-test de `require` de cada módulo antes de integrar |
| R10 | Dupla escrita de estado (`memorias/<id>/nucleo-tracos.js` legado vs. novo) | Diretórios distintos (`/mecanismos`); legado intocado |

---

## 5. PLANO DE INTEGRAÇÃO

### Fase A — Vender módulos reais (byte-idênticos)
`cerebro-icaro/mecanismos/` ← `icaro-clean` (16 arquivos) +
`MANIFESTO-MECANISMOS.json` (SHA-256, HEAD de origem, data).

### Fase B — Instância cognitiva por personagem
`cognicao.js`: copia `cerebro-icaro/mecanismos/*` → `memorias/<id>/mecanismos/`
por hash (mesmo padrão do M1), `require` das cópias → **estado 100 % individual**.
API: `ativar/desligar/estaAtivo`, `instanciar`, `influencia`, `posDecisao`,
`posConsequencia`. Toda chamada de mecanismo em `try/catch` (falha de mecanismo
nunca quebra o ciclo).

### Fase C — Enrichimento do contexto + prompt
`cerebro-personagem.montarContexto` acrescenta `cognicao` **só se ativo**
(contexto byte-idêntico quando desligado). `cerebro.js.montarPrompt` renderiza
os blocos; `cerebro.js.decidir` aplica a temperatura da AURA.

Blocos **ativos por padrão** (= mesmo default do ICAROOVO): AURA (prompt+temp),
`TRACOS PROPRIOS`, `SOBRE MIM`, `HESITACAO` (≥3 correções), `EXPERIENCIAS`.
Sombra por padrão (registram, não influenciam): proveniência, cuidado-atos,
medo, peso, agência (ciclo), trilha causal.

### Fase D — Cérebro cognitivo plugável
`cerebro-cognitivo.js`: abre trilha → enriquece → chama o cérebro base →
anexa `retrieved`/`attention_gate` → fecha trilha. Fallback:
`ILHA_COG_FALLBACK=legado|nenhum` e `ILHA_COG_EMERGENCIA=1` (ação neutra
`observar`/`esperar` quando o LLM estiver indisponível).

### Fase E — Ciclo pós-consequência
`rodada-autonoma.js` chama `cognicao.posConsequencia(...)` **depois** do motor,
com: decisão tomada, consequência efetiva, percepção do ser, proveniência
(direta vs. de terceiros). Alimenta self-model, correção, proveniência,
cuidado, medo, agência.

### Fase F — Testes
`teste-cognicao.js` (14 blocos exigidos pela missão) + compatibilidade
(`node testes-v2.js`, `node testes.js`, `node teste-contrato-necessidades.js`).
E2E: contexto → mecanismos → LLM → decisão → motor → consequência → memória →
próxima decisão, com evidências gravadas. Experimento de trajetória comparando
os **contextos realmente enviados ao LLM**.

---

## 6. SITUAÇÃO DO WORKING TREE DA ILHA (preservada, nada restaurado)

```
 D analisar-ilha.js                       (existe no HEAD)
 D cerebro-icaro/extrator-crencas.js       (existe no HEAD)
 D cerebro-icaro/nucleo-self-model.js      (existe no HEAD)
 M cerebro-icaro/nucleo-tracos.js          (revertido 07/10 → 04/10)
 D experimento-individualidade.js          (existe no HEAD)
 M memorias/{icaro,joao,lara,maria}/nucleo-tracos.js
```
Essas alterações são **do usuário** e serão preservadas. A integração usa um
diretório novo (`cerebro-icaro/mecanismos/`) e não sobrescreve nenhum desses
arquivos.

---

## STATUS (2026-10-18, pós-implementação)
Plano executado na íntegra. Entrega final, testes, evidências, classificações
e instruções de início/interrupção/reversão: ENTREGA-COGNICAO-2026-10-18.md.
Resultados: teste-cognicao 14/14 · testes-v2 59 · testes 59+11 · contrato 22/22 ·
ablação (controle descansar:80 vs cognitivo observar:80, mecanismos [0,80]).

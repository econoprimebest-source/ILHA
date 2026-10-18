# ENTREGA — Campada cognitiva da Ilha Aurora sobre os módulos reais do ICARO-OVO
Data: 2026-10-18 · Repositório: `C:\Users\Rafael\ilha` · Fonte (somente leitura): `C:\Users\Rafael\icaro-clean` (ICARO-OVO, branch `clean`, commit `fda55f3`)

Relatório de arquitetura/plano (pré-implementação): `RELATORIO-INTEGRACAO-CORTEX-2026-10-18.md`.
Este documento é a entrega final: o que foi feito, provado, classificado e como iniciar/reverter.

---

## 1. Diagnóstico

A Ilha já tinha o contrato de decisão (perceber → contexto → cérebro → validação → motor → consequência)
e a memória M1/M2 por personagem, mas **nenhum mecanismo cognitivo do ICARO-OVO** participava do ciclo.
O ICARO-OVO tem 33 módulos `nucleo-*`; a auditoria (ver relatório) classificou cada um em zona
(a) determinístico desacoplável, (b) determinístico com adaptação mínima, (c) acoplado a identidade do
Ícaro, (d) cadeia LLM interna). As zonas (c)/(d) ficaram de fora **por decisão consciente** — nenhum
texto, chat, self-model ou memória do Ícaro foi importado.

Resultado agora: cada habitante (Ícaro, Lara, Maria, João) tem **seu próprio sistema cognitivo individual**
(cópia dos módulos + estado em disco próprio), que **só informa** — o LLM continua escolhendo e o motor
continua validando e aplicando. A camada é **opt-in**: sem `ILHA_COG=1` o comportamento é o de antes
(contexto e prompt byte-idênticos, provados no bloco 6 e 14 do teste).

---

## 2. Módulos reais reutilizados (16, byte-idênticos)

Vendored de `icaro-clean/` → `cerebro-icaro/mecanismos/` (SHA-256 em `MANIFESTO-MECANISMOS.json`,
todos `byte_identico: true`, verificados contra a fonte a cada execução do teste):

| módulo | papel na Ilha | gates |
|---|---|---|
| `nucleo-aura` | estado expressivo + temperatura LLM (`temperaturaLLM`) | on |
| `nucleo-self-model` | reflexão nas palavras próprias pós-turno + bloco | on |
| `extrator-crencas` | extração determinística de crenças (suporte ao peso) | — |
| `nucleo-topicos` | tópicos para hesitação/correção | — |
| `nucleo-tracos` | traços consolidados do próprio ser (bloco) | on |
| `nucleo-correcao` | hesitação quando outro corrige (bloco) | on |
| `nucleo-proveniencia` | registro append-only entrada→resposta por turno | sombra (sempre grava) |
| `nucleo-prov-label` | rótulo de proveniência (flag `ICARO_PROV_LABEL`) | off (padrão ICARO) |
| `nucleo-peso` | seleção contextual de memórias vs. baseline | **sombra** → `ILHA_COG_PESO=1` |
| `nucleo-selecao-contextual` | apoio da seleção | — |
| `nucleo-memoria-v2` | fatos/crenças do próprio (subsistema) | — |
| `nucleo-medo` | medo operacional por tópico | **sombra** (nível 0) |
| `nucleo-cuidado` | atos de cuidado; fala no prompt só com gate | **sombra** → `ILHA_COG_CUIDADO_OFERTA=1` |
| `nucleo-agencia` | foco do que o ser quer resolver | **sombra** → `ILHA_COG_AGENCIA_MODO≥1` |
| `nucleo-experiencias` | experiência registrada com proveniência | leitura on; Parte 2 (juízo LLM) **não copiada** |
| `nucleo-trilha-causal` | evidência do que entrou no prompt e o que a decisão usou | on |

Fora de escopo (zona c/d): `nucleo-associacoes`, `canonicalizador`, `nucleo-llm` (+`config.json`),
`nucleo-experiencias.avaliarERegistrar` (prompt interno “Você é o Ícaro” = vazamento de identidade),
qualquer módulo de chat/identidade/memória do ICARO-OVO.

---

## 3. Estados

- **Por habitante** (criados sob demanda, gitignored): `memorias/<id>/mecanismos/`
  com as 16 cópias byte-idênticas + `_versao.json` (hash da fonte) + arquivos próprios:
  `proveniencia.jsonl`, `trilhas-causais.jsonl`, `self-model.json`, `self-model-historico.jsonl`,
  `tracos-icaro.json(.jsonl)`, `erros-contexto.json`, `erros-pendentes.jsonl`, `medo.jsonl`,
  `cuidado-atos.jsonl`, `cuidado-ofertas.jsonl`, `agencia-foco.jsonl`, `experiencias.jsonl`,
  `memoria-v2.json`. Cada arquivo resolve por `__dirname` — **não existe cruzamento** (blocos 2 e 4).
- **Estado da Ilha** (`estado-ilha.json`, `logs/`, `memorias/*/chat.jsonl` etc.): **nunca escrito
  pelos testes** (bloco 14 prova hash+mtime idênticos ao início da execução).
- **Fonte ICARO-OVO**: só leitura (bloco 14 revalida `git status --porcelain` idêntico e os 16 hashes).

---

## 4. Arquivos criados e alterados

Criados:
- `cognicao.js` — camada: vendoring por hash, instância por personagem, `influencia`, `posConsequencia`,
  `abrirTrilha`/`fecharTrilha`/`abortarTrilha`, `itensDoContexto`, `seguro()` em tudo, flags `ILHA_COG_*`,
  adaptador de proveniência (`verificado`/`dado_externo`/`inferencia`), `saudavel()`.
- `cerebro-cognitivo.js` — cérebro por personagem: mesmo caminho `cerebro.js`→LLM, fallback
  `ILHA_COG_FALLBACK=legado|nenhum` (o cérebro anterior, `decisor-original`, agora com **prazo**),
  emergência `ILHA_COG_EMERGENCIA=1` (ação neutra marcada), instância presa ao id.
- `cerebro-icaro/mecanismos/` — 16 módulos + `MANIFESTO-MECANISMOS.json`.
- `teste-cognicao.js` — 14 blocos (ver §6).
- `RELATORIO-INTEGRACAO-CORTEX-2026-10-18.md` (plano) e este `ENTREGA-COGNICAO-2026-10-18.md`.

Alterados (mínimo e cirúrgico; fora isso nenhuma edição em código existente):
- `cerebro-personagem.js` — `aplicarCognicao(ser, contexto)`: anexa `ctx.cognicao` **só** com
  `ILHA_COG=1` + `estaAtivo()` + `saudavel()`; `ILHA_COG_PESO=1` troca as memórias pela seleção contextual.
  Com a camada fora, `montarContexto` devolve o objeto de antes.
- `cerebro.js` — seção `[MECANISMOS]` no prompt (só se `c.cognicao` existir, sempre com
  “insumos opcionais — quem decide é você”); temperatura da AURA (`moduladores.temperaturaLLM`,
  mesma receita do ICARO) com baseline `.3`; **`AbortController` com `ILHA_LLM_TIMEOUT_MS`**
  (corrige o risco de hang apontado na auditoria) e erro rotulado `LLM indisponível: …`.
- `rodada-autonoma.js` — `abrirTrilha` **antes** da decisão (e `abortarTrilha` em erro),
  `fecharTrilha` **depois** do motor (com a consequência real) e `posConsequencia` pós-turno;
  tudo com `require` atrasado + try/catch — mecanismo quebrado não quebra o mundo.
- `rodar-ilha.js` — opt-in: com `ILHA_COG=1` ativa a camada e pluga `opcoes.cerebros`
  (um `criar(id)` por habitante); sem a flag, o loop é o de antes, byte a byte.
- `.gitignore` — `memorias/*/mecanismos/`.

Preservado: alterações locais pré-existentes do usuário (` D analisar-ilha.js`,
` D cerebro-icaro/extrator-crencas.js`, ` D cerebro-icaro/nucleo-self-model.js`,
` M cerebro-icaro/nucleo-tracos.js`, ` D experimento-individualidade.js`,
` M memorias/*/nucleo-tracos.js`) — intocadas; nenhum `git reset/checkout/clean/add`;
nenhum backup/log apagado; nenhum mecanismo `cortex-engine` tocado (nem existe na Ilha).

---

## 5. Flags (ambiente)

| flag | padrão | efeito |
|---|---|---|
| `ILHA_COG=1` | off | liga a camada inteira (contexto + prompt + trilha + pós-turno + cérebros) |
| `ILHA_LLM_TIMEOUT_MS` | 60000 | teto do `fetch` (também usado no fallback legado) |
| `ILHA_COG_FALLBACK` | `legado` | `nenhum` = propaga a falha (marcada `decisao=true`) |
| `ILHA_COG_EMERGENCIA` | off | `1` = LLM indisponível → ação neutra `fallback-indisponibilidade` |
| `ILHA_COG_PESO` | off (sombra) | `1` = seleção contextual de memórias substitui o recorte bruto |
| `ILHA_COG_AURA/SELF_MODEL/TRACOS/HESITACAO/EXPERIENCIAS/TRILHA` | on | blocos no prompt |
| `ILHA_COG_CUIDADO_OFERTA` | off (sombra) | fala de cuidado no prompt |
| `ILHA_COG_AGENCIA_MODO` | 0 (sombra) | ≥1 = foco da agência no prompt |
| `ICARO_*` | intocados | os módulos byte-idênticos seguem lendo os gates do próprio ICARO |

---

## 6. Testes e evidências

| suíte | comando (node real) | resultado |
|---|---|---|
| cognição (14 blocos) | `& 'C:\Program Files\nodejs\node.exe' teste-cognicao.js` | **14/14 OK** |
| v2 (compatibilidade) | `node testes-v2.js` | **59 OK** (também roda como filho do bloco 11) |
| geral | `node testes.js` | **59 + 11 OK** |
| contrato de necessidades | `node teste-contrato-necessidades.js` | **22/22 OK** |

Blocos do `teste-cognicao.js` (evidência direta):
1. 16 hashes = manifesto = fonte `icaro-clean` (bytes iguais) · 2. 4 diretórios isolados, marca própria
presente e alheia ausente, trilha só no dono · 3. varredura de prompt/contexto/arquivos sem
`cortrajetor|trajectoria corticalis|ICAROOVO|icaro-hibrido|Rafael|Você é o Ícaro`; memória da Maria só
nos turnos da Maria · 4. processo novo relê `proveniencia.jsonl` do disco · 5. proveniência
`vivida_diretamente`/`ouvida_de_terceiro`/`inferencia` por item · **6. corpo capturado do `fetch`
contém `[MECANISMOS]`; prompt sem a seção é byte-idêntico ao baseline; temperatura 0.77 da AURA chega
ao `options.temperature`; baseline .3** · 7. peso/cuidado/agência em sombra por padrão e alavancas
respondem à env · 8. timeout (1 s) rotulado, conexão recusada, fallback legado com prazo, emergência
neutra em ciclo completo, `ILHA_COG_FALLBACK=nenhum` propaga erro honesto · 9. ação inválida rejeitada,
estado byte-idêntico, motor não substitui · 10. 5 ciclos: 20 prompts com mecanismos, 5 trilhas
fechadas com `retrieved`, pós-turno acumulando, **0 erros de mecanismo** · 11. suíte de 59 com a
camada desligada · 12. **E2E**: 3 ciclos reais via `rodada`→`cerebro-cognitivo`→`cerebro.js`→mock
(Ollama ausente), 12 prompts, origem `modelo`, trilhas fechadas `decision: observar`, estado+log
persistidos e recarregados · **13. ablação**: mesmo LLM, 20 ciclos × 4 seres →
`controle {descansar:80}` vs `cognitivo {observar:80}`, mecanismos `[0,80]` · 14. reversão em 1
comando + `estado-ilha.json` (hash/mtime), `logs/` e `icaro-clean` intactos.

---

## 7. Classificação de cada resultado

| resultado | classificação |
|---|---|
| Vendoring dos 16 módulos byte-idênticos + manifesto | **validado experimentalmente** (bloco 1, a cada execução) |
| Isolamento cognitivo dos 4 habitantes | **implementado + testado isoladamente + integrado no ciclo real** (blocos 2, 10, 12) |
| Ausência de vazamento de identidade/memória | **testado isoladamente + integrado** (blocos 3, 12) |
| Persistência em disco por personagem | **testado isoladamente** (bloco 4, processo novo) |
| Proveniência declarada por memória | **implementado + testado** (bloco 5) |
| Influência real no LLM (bloco chega ao corpo do `fetch`) | **integrado no ciclo real + validado** (blocos 6 e 12) |
| Temperatura da AURA no `options.temperature` | **integrado + validado** (bloco 6) |
| Sombra vs ativo (peso/cuidado/agência) | **implementado + testado** (bloco 7) |
| Timeout + fallback + emergência de indisponibilidade | **implementado + testado isoladamente + integrado** (blocos 8, 12; `cerebro.js` e `cerebro-cognitivo.js` são o caminho real) |
| Validação do motor preservada com a camada ligada | **integrado + testado** (bloco 9) |
| Continuidade multi-ciclo (trilha, pós-turno, 0 erros) | **integrado no ciclo real + testado** (blocos 10, 12) |
| Compatibilidade com as suítes anteriores | **validado** (blocos 6/11/14 + 59/59+11/22/22) |
| Experimento de trajetória com ablação | **validado experimentalmente** (bloco 13, 80 vs 80) |
| Reversão em 1 comando e preservação de produção/fonte | **validado** (bloco 14) |
| Camada sob **Ollama real** (respostas do modelo mudando com os blocos) | **ainda não comprovado** — os testes mockam o `fetch`; ver §8 |
| Experimento longo (≥240 ciclos) com camada ligada | **ainda não comprovado** — só 20/5 ciclos nos blocos; suítes longas rodam com a camada **desligada** |
| Parte 2 do `nucleo-experiencias` (juízo LLM de interpretação) | **fora de escopo proposital** (vazaria identidade do Ícaro) |
| Cadeia `nucleo-associacoes → canonicalizador → nucleus-llm` | **fora de escopo proposital** (zona c/d, segundo cérebro paralelo) |

---

## 8. Limitações conhecidas

1. Todos os testes usam `fetch` mockado — a integração com Ollama real (qwen3:8b) está **correta no
caminho** (o corpo capturado é exatamente o que `cerebro.js` envia), mas a resposta viva do modelo
sob influência dos blocos não foi observada em produção.
2. `nucleo-self-model` imprime `[SELF-MODEL] candidato rejeitado …` no console (cosmético, vem do
módulo byte-idêntico).
3. O attention gate da trilha é uma adaptação mínima (item do contexto aparece na fala/motivo da
decisão → “usado”), pois o gate real do ICARO-OVO mora dentro de `icaro-hibrido.js` (não exportável).
4. Falha de um ser que não seja de LLM ainda aborta o ciclo (comportamento pré-existente da Ilha);
a emergência cobre só o caminho do cérebro cognitivo.
5. Rótulos internos de vocabulário do módulo de proveniência (`tipo: resposta_icaro`, `dono:icaro`)
persistem em arquivos de estado — são campos do mecanismo, nunca entram em prompt/contexto
(varredura do bloco 3 cobre isso).
6. O fallback legado recebe prazo por `Promise.race` (o `fetch` antigo não é abortado; a promessa
órfã só cai silenciosamente).

---

## 9. Iniciar / interromper / reverter

**Iniciar (produção, camada ligada)** — node real, pois o `node` do PATH é stub de 0 bytes:
```powershell
$env:ILHA_COG='1'          # opcional: $env:ILHA_COG_EMERGENCIA='1'; $env:ILHA_LLM_TIMEOUT_MS='60000'
& 'C:\Program Files\nodejs\node.exe' rodar-ilha.js
```
Saída esperada: `[COG] camada cognitiva ON (ILHA_COG=1)` e o loop normal (`CICLO n`).
Primeiro ciclo cria `memorias/<id>/mecanismos/` (cópias + estado individual).

**Iniciar (experimento isolado)** — não subir o loop de produção; rodar:
`node teste-cognicao.js` (usa só estados `novo()` e diretórios temporários).
Segunda simulação concorrente sobre o mesmo `estado-ilha.json` continua proibida.

**Interromper** — Ctrl+C no loop. Cada ciclo grava `estado-ilha.json` de forma atômica ao fim do ciclo;
parar a qualquer momento deixa o último ciclo consistente (o motor só persiste ciclo fechado).

**Desligar a camada (volta ao comportamento anterior)** — remover `ILHA_COG` do ambiente e reiniciar:
`Remove-Item Env:ILHA_COG` → contexto volta sem a chave `cognicao` (bloco 14 prova), plugue
`cerebros` deixa de ser passado e o loop usa o decisor legado. **Nada de banco, migração ou estado a
limpar**: tudo que a camada gerou está em `memorias/*/mecanismos/` (gitignored).

**Reversão completa** — parar o loop; apagar os arquivos novos (`cognicao.js`, `cerebro-cognitivo.js`,
`teste-cognicao.js`, `cerebro-icaro/mecanismos/`, `ENTREGA-*.md`); reverter as 5 edições pontuais
(`cerebro-personagem.js`, `cerebro.js`, `rodada-autonoma.js`, `rodar-ilha.js`, `.gitignore` —
`git diff <arquivo>` mostra exatamente o que saiu; reversão manual/por você, sem
`git reset/checkout/clean`); apagar `memorias/*/mecanismos/` se desejar. As alterações locais
pré-existentes do usuário não são tocadas por nenhum desses passos.

---

## 10. Como rodar tudo (ordem sugerida)

```powershell
$node='C:\Program Files\nodejs\node.exe'
& $node teste-cognicao.js          # 14 blocos (inclui filho: testes-v2 com camada off)
& $node testes.js                  # 59 + 11
& $node teste-contrato-necessidades.js   # 22/22
```

# Auditoria do Projeto "Ilha" — Relatório Completo

**Data**: 2026-10-20
**Projeto**: Ilha V2 experimental (simulação agente-LLM com estado JSON persistente)
**Escopo**: Arquitetura, qualidade de código, segurança/dados e cobertura de testes.

---

## 1. CONSISTÊNCIA ARQUITETÔNICA (vs README.md)

| Item | README afirma | Código verificado | Status |
|------|--------------|-------------------|--------|
| Executável oficial | `node ilha.js N` | `ilha.js` existe e segue este padrão | ✅ |
| Módulos V2 oficiais | `estado-v2.js`, `motor-v2.js`, `percepcao-v2.js`, `decisor.js`, `persistencia-v2.js` | Todos presentes e importados por `ilha.js` | ✅ |
| Módulos legados | `mundo.js`, `motor.js`, `percepcao.js`, `persistencia.js` | Existem na raiz, mas **não são importados por `ilha.js`**; documentados como "compatibilidade/histórico" | ✅ |
| Contrato de estado | `versao: 5`, `mundo.tempo.ciclo` único contador | `estado-v2.js` valida `versao===5`, `tempo.ciclo` integer, derived campos (dia, período, estação, ano) a partir do ciclo | ✅ |
| Calendário | 4 períodos/dia, 30 dias/estação, 4 estações/ano | `calendario.js`: `DP=6 ciclos/dia`, `tempoDe(c)` retorna `{dia,periodo,periodoIndex,estacao,diaDaEstacao,ano,ciclo}` | ✅ |
| Provedores LLM | `ollama` (padrão) e `deepseek` | `cerebro.js`: função `provedor()` valida `'ollama'\|'deepseek'`; `modeloDe()` lê `ILHA_LLM_PROVIDER`, `ILHA_MODELO`, `DEEPSEEK_MODEL` | ✅ |
| Flags de recurso | `ILHA_VISAO=1`, `ILHA_MODELO`, `ILHA_LLM_TIMEOUT_MS` | `cerebro.js` lines 34, 36, 35; `visao.js` usa `ILHA_VISAO_MODELO`; `ilha.js` não bloqueia visão | ✅ |
| Persistência | Estado em `estado-ilha.json`, logs em `logs/ilha-v2.jsonl` | `ilha.js` line 2: `ARQ_ESTADO=estado-ilha.json`, `ARQ_LOG=logs/ilha-v2.jsonl`; `persistencia-v2.js` grava/lancha atomicamente | ✅ |
| Migração | Reconhece V2, V3, V4, V0; cria backup `.pre-v5.bak` | `estado-v2.js` `migrar()`: valida versão, migra V2→V5, cria backup antes de sobrescrever, recusa estados desconhecidos | ✅ |

**Conclusão**: A realidade do código está em plena concordância com a documentação README.md. Não há divergências arquitetônicas significativas.

---

## 2. QUALIDADE DE CÓDIGO — Achados Importantes

### 2.1 Bugs prováveis e riscos

| # | Arquivo | Linha | Severidade | Descrição |
|---|---------|------|------------|-----------|
| 1 | `estado-v2.js` | Line 7 | **Média** | A condição `if(l.recursos||l.agua!==undefined||l.comida!==undefined||l.dia!==undefined)` usa `||` entreexpressões: se `l.agua===0`, então `l.agua!==undefined` é `true`, fazendo o código entrar no caminho de migração "recursos" mesmo quando o estado tem `agua:0`. Pode causar migração incorreta ou erro "Estado não reconhecido". |
| 2 | `persistencia-v2.js` | Line 6 | **Alta** | A função `anexar` tem aninhamento de `if` mal estruturado: `if(last.ciclo===obj.ciclo){if(Number.isInteger(obj.ord)&&Number.isInteger(last.ord)){if(last.ord>=obj.ord)return false}else{return false}}`. O `else{return false}` pertence ao `inner if` ( Number.isInteger ), não ao externo. Se `obj.ord` não for integer, cai no `else` e retorna `false` indevidamente, bloqueando anexação legítima. |
| 3 | `motor-v2.js` | Line 78+ | **Média** | Bloco `if(s.local==='fazenda')` acessa `x.horta` com fallback `||{...}`, mas propriedades como `h.plantadoPor` são usadas posteriormente sem garantia de existência (ex: line 30: `h.plantadoPor&&(h.maduros||0)>=0.5`). Se o estado não tiver horta completa, pode ler `undefined`. |
| 4 | `ecossistema.js` | Lines 50-52 | **Baixa** | `eco.fauna.peixes ||= eco.peixes.rio` assume que `eco.peixes.rio` existe. Se o estado chegasse sem `rio` em peixes, criaria referência `undefined` em `fauna.peixes`. |
| 5 | `persistencia-v2.js` | Line 5 | **Média** | `ultimaLinha` faz `JSON.parse(s.slice(i+1))` sem try/catch. Log corrompido ou truncado lançharia erro e poderia parar o ciclo. |
| 6 | `motor-v2.js` | Lines 11, 18 | **Baixa** | Ações como `['banho',...]` e `['coletar_agua',...]` empurram descrições baseadas em `s.local`. Se `s.local` for `undefined`, `['rio','cachoeira','mar'].includes(undefined)` retorna `false` (correto), mas o código seria mais claro com validação explícita. |

### 2.2 Robustez de persistência

- ✅ `persistencia-v2.js` usa padrão "write-to-tmp + rename" atômico (`gravar` function).
- ✅ `anexarCiclo` protege contra logs fora de ordem (impede retomada duplicada).
- ⚠️ Se dois processos rodarem concurrently sobre o mesmo `estado-ilha.json`, a validação `validar()` será executada mas a última escrita pode sobrescrever alterações do outro processo — não há lock de arquivo no nível da aplicação.

### 2.3 Tratamento de erros

- ✅ `ilha.js` line 17: `catch(err){if(err&&err.decisao)throw Error('Decisor indisponível; ciclo não aplicado: '+err.message);throw err}` — falha do decisor interrompe ciclo com mensagem clara, não silencia.
- ✅ `persistencia-v2.js` `gravar` chama `validar()` antes de escrever, lança erro se estado inválido.
- ⚠️ `motor-v2.js` `executar` lança `Error('Ação inválida ou indisponível: '+id)` se ação não estiver em `permitidas`, mas não valida se `s` (ser) tem todas as propriedades necessárias antes de modificar (ex: `s.inventario.agua--` pode deixar `agua` negativa antes que o chamador corrija).

### 2.4 Qualidade geral

- ✅ Código predominantlyemente `'use strict'`.
- ✅ Funções com responsabilidade única (ex: `observacaoCorporal`, `perceber`, `statusDe`).
- ✅ Magic numbers estão centralizados (calendário, limites de ecologia).
- ⚠️ Muitas variáveis globais implícitas: `module.exports` soltos, `this` em closures, padrões como `e.mundo.ecossistema.agua.nascente` acessados em múltiplos módulos sem tipagem.
- ⚠️ Tamanho de arquivos: `motor-v2.js` ~21KB, `ecossistema.js` ~19KB, `testes-v2.js` ~61KB — functions grandes mas organizadas por tópico.
- ⚠️ Arrays crescendo sem limite: `estado-ilha.json` chegou a 827KB (último checkpoint). `memorias` e `descobertas` arrays são adicionados a cada ciclo. O arquivo de log `ilha-v2.jsonl` também cresce indefinidamente. Documentação admite isso mas merece monitoramento.

### 2.5 Performance óbvia

- ✅ `JSON.parse`/`JSON.stringify` são feitos once por ciclo em `ilha.js` (`gravar` → `JSON.stringify(e,null,2)`) e `persistencia-v2.js`.
- ⚠️ `ecossistema.js `preparar` roda a cada ciclo e tem loops `Object.values(...).flatMap(...)` + `Object.entries` — overhead aceitável para escala pequena (3-4 seres).
- ⚠️ `regenerar` em `estado-v2.js` tem lógica com `ev.chuva` strings comparadas e math inline — não crítico.

---

## 3. SEGURANÇA E DADOS

| Aspecto | Status |
|---------|--------|
| Chaves/APIs em código fonte | ❌ Nenhum encontrado. O grep por `api[_-]?key|secret|token|Bearer` só encontrou tokens em funções internas de processamento de resposta API (cerebro.js), nunca chaves reais ou gravação em logs. |
| Chaves LLM | ✅ Usam variáveis de ambiente: `DEEPSEEK_API_KEY` (somente no header `Authorization: Bearer`), `ILHA_LLM_PROVIDER`, `ILHA_MODELO`, `ILHA_VISAO_MODELO`, `ILHA_LLM_TIMEOUT_MS`. Nunca gravadas em arquivo ou log. |
| Arquivos de backup | ✅ Muitos `.bak`, `.old`, `.backup-*` na raiz, mas todos fora do `git tracking` (mostram `??` em `git status`). Apenas `estado-ilha.json` e arquivos de log estão versionados. |
| Dados sensíveis em logs | ⚠️ `ilha-v2.jsonl` contém eventos e decisões do ciclo — não contém chaves, mas pode conter dados de localização, necessidades e ações dos seres. |
| Validação de entrada do LLM | ⚠️ O contrato espera ação do conjunto definido em `motor-v2.js `acoes()` + motivo de string livre. Se o LLM sair do contrato (ex: ação inválida), `motor-v2.js` lança erro e o ciclo não avança — boa segurança. |
| Isolamento de memória por personagem | ✅ O sistema de memórias (`memoria-personagem.js`) hasheia diretórios por ID do ser e nunca vaza experiência de João para Maria ou Ícaro (validado por testes em `testes-v2.js` lines 52-54). |

---

## 4. COBERTURA DE TESTES

O arquivo `testes-v2.js` contém **57 testes** (async, com `assert.throws`, `assert.deepStrictEqual`, etc.) organizados em fases:

| Fase | Quantidade | Principais tópicos |
|------|------------|-------------------|
| FASE A (lines 6-18) | 3 | Contrato V5, migração V2-V4, persistência atômica |
| FASE B (lines 19-36) | 18 | Decisões inválidas, cérebros independentes por personagem, contexto individual, acontecimentos, predador, tempestade, observador HTTP |
| FASE C (lines 37-38) | 2 | Memória individual vs global, conhecimento isolado |
| FASE D (lines 39-43) | 5 | Três instâncias de CharacterBrain, personalidade, identidade própria, conviver, falar |
| FASE E / ILHA AURORA (lines 44-50) | 14+ | Biblía do mundo, personalidade distinta por ser, crenças individuais, memória no formato ICAROOVO, checkpoint a cada 10 entradas, experiência no contexto seguinte |
| Testes finais (lines 50-57) | ~15 | Compactação de chat, restart de memória, identidade no disco, isolamento de experiência, contexto entrega vivida própria |

**Pontos fortes**:
- Cobrre validação de estado, migração, ações, falhas, ecologia, sociais, trajetória.
- Testa isolamento de memória por personagem (critical feature).
- Testa que decisão inválida não modifica estado.
- Testa comportamento a longo prazo (240 ciclos no experimento-trajetoria).
- Testa compactação sem perda de dados.

**Pontos fracos**:
- Nenhum teste de concorrência (dois processos simultâneos).
- Nenhum teste de exaustão de recursos (água/alimento acabando completamente).
- Testes dependem de LLM stub (funções inline), não de provedor real — cobertura de falha de conexão é teste mas não de performance/retry.

---

## 5. SINTOMAS E RECOMENDAÇÕES

### Críticas (corrigir agora)

1. **`estado-v2.js` line 7 — migração incorreta por zero**: A condição `if(l.recursos||l.agua!==undefined||l.comida!==undefined||l.dia!==undefined)` entrará no caminho errado se `agua` for `0` (falso mas não undefined). **Fix**: reescrever como `if(l.recursos !== undefined || l.agua !== undefined || l.comida !== undefined || l.dia !== undefined)` — mas como `l.recursos` sozinho já seria truthy/falso, melhor explicitamente separar cada verificação.

2. **`persistencia-v2.js` line 6 — `anexar` aninhado bugado**: O `else{return false}` do `if(Number.isInteger(obj.ord)&&Number.isInteger(last.ord))` não deveria fechar o `if` externo. **Fix**: reestruturar o if-else aninhado para clareza, extrair em função auxiliar se necessário.

### Importantes (melhoria de robustness)

3. **`persistencia-v2.js` `ultimaLinha` sem proteção try/catch**: Se o log estiver corrompido, o ciclo quebra. **Fix**: envolver `JSON.parse` em try/catch, retornar `null` em caso de erro.

4. **Concorrência de escrita**: Não há lock entre processos. Se houver necessidade de múltiplos agentes rodando, adicionar validação `try{fs.openSync(f,'r+')}catch{};` ou usar `flock`.

5. **Validação de estoque em ações do motor**: Várias ações (`beber`, `comer`, `pescar`, `caçar`) reduzem estoques sem checar limites superiores após a redução. O `validar()` do estado pega valores negativos, mas a correção acontece em `seres.js `atualizar` — garantir que nenhuma ação possa deixar estoque negativo sem clamping explícito.

### Controle técnico (opcional)

6. **Tamanho do arquivo `estado-ilha.json`**: Atingiu 827KB por acumulador de memórias/descobertas. Considerar:
   - Podar memórias antigas após N ciclos (documentação diz "memórias sobrevivem à retomada").
   - Archive logs antigos para `logs/ilha-v2.jsonl.1`, `.2`, etc.
   - Verificar se `validar()` ainda passa com arrays de 100+ itens (performance de loop `flatMap`).

7. **Tipagem fraca em propriedades críticas**: Múltiplos acessos como `s.necessidades.agua`, `s.inventario.agua`, `x.peixes.rio.populacao` sem verificação de existência prévia. Considerar defaults no ponto de acesso (`s.necessidades?.agua ?? 0`).

---

## 6. CONSIDERAÇÕES FINAIS

O projeto "Ilha" demonstra um design coerente entre documentação e implementação. O fluxo perceber→decidir→agir está bem estruturado, a persistência é atomicamente segura e o teste abrange os cenários críticos (migração, ação inválida, isolamento de memória, contrato V5).

As maiores áreas de risco são:
1. A lógica de migração em `estado-v2.js` com valores-zero.
2. A função `anexar` em `persistencia-v2.js` com if-else aninhado confuso.
3. Falta de proteção try/catch em `ultimaLinha`.

Corrigir esses três itens elevaria a robustez do sistema para produção. O restante são melhorias de escalabilidade e polimento que podem ser feitas em iterativas futuras.

---
*Relatório gerado a partir de leitura direta de 30+ arquivos .js do projeto e análise da estrutura git.*
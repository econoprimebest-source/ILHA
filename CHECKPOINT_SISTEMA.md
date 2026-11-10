# 📍 CHECKPOINT DE DESENVOLVIMENTO — ILHA AURORA (Evertrail 2.5D & Modelos Experimentais 3D)

> **PROPÓSITO DESTE ARQUIVO:**  
> O PC reinicia com frequência. Qualquer nova sessão ou instância de IA **DEVE LER ESTE ARQUIVO PRIMEIRO** para saber imediatamente o estado da sessão anterior, o que estava sendo feito e quais os próximos passos.  
> **REGRA DE OURO:** Atualizar este arquivo e rodar `git commit` a cada alteração significativa para evitar perda de progresso.

---

## 🕒 Última Atualização
* **Data/Hora:** 2026-11-10 18:10 (Horário Local)
* **Branch Git:** `visualizacao-ilha` (Sincronizada no GitHub `origin/visualizacao-ilha`)
* **Status:** Tudo commitado e enviado para o GitHub. A Ilha roda de forma autônoma no Z Fold (Termux) na porta 8810, com o PC desligado.

---

## 🎯 Resolução do Bug: Por que as IAs ficavam presas em um só local?

### 🔍 Diagnóstico Realizado:
1. **Falha na Detecção Anti-Repetição (`cerebro.js`)**:
   - A rotina comparava strings completas de `diario` (que continham o número do ciclo e motivo, e.g. `"ciclo 989: cuidar_animais..."`). Como os números dos ciclos diferiam, `ultimas.every(x => x === ultimas[0])` era SEMPRE falso.
   - Além disso, a lista de ações bloqueadas só incluía `['observar', 'descansar', 'esperar']`. Qualquer ação repetitiva ativa (`cuidar_animais`, `comer`, `beber`, `falar`) passava direto sem nenhum bloqueio.
2. **Exploit de Comida Infinita no Curral (`motor-v2.js`)**:
   - `cuidar_animais` usava `Math.max(1, leiteColhido + ovosColhidos)`. Mesmo com zero leite e zero ovos, gerava 1 de comida e reduzia 35 de fome a custo zero. O curral virou um "buraco negro" de atração onde os agentes nunca precisavam sair.
3. **Paralisia por Medo e Clima (`metab.js`)**:
   - `medo` aumentava com a chuva forte e chegava a 100/100, mas não tinha taxa de decaimento natural. Com medo em 100 e percepções de "vento gelado cortando a pele longe de um abrigo", as IAs entravam em pânico e não tinham coragem de caminhar pelas trilhas.
4. **Viés Autoregressivo no Prompt**:
   - O prompt listava 8 vezes seguidas `cuidar_animais (obteve +1 e saciou necessidade)`, induzindo o LLM a prever a mesma ação como única solução comprovada.

### 🛠️ Correções Aplicadas:
1. **Livre Circulação & Vontade de Caminhar (`cerebro.js`)**:
   - Anti-repetição agora inspeciona `cx.trajetoriaRecente` e proíbe repetir QUALQUER ação mais de 2x seguidas.
   - Injetada a diretiva `[VONTADE DE CAMINHAR E EXPLORAR]` quando o personagem permanece no mesmo nó do mapa por 3 ciclos seguidos sem se mover.
   - Compressão de experiências repetidas no prompt para eliminar o viés de imitação.
   - Elevação da temperatura base do LLM para `0.80` para maior criatividade, variação e autonomia expressiva.
2. **Correção do Curral (`motor-v2.js`)**:
   - `cuidar_animais` só fornece alimento se houver ovos/leite reais para colher (`r.quantidade = totalAlimento`). Se o curral já foi ordenhado, não gera comida infinita.
3. **Dissipação Natural do Medo (`metab.js`)**:
   - Alívio progressivo do medo (-2 por ciclo; -18 com contemplação, conversa, esporte ou descanso), restaurando a serenidade dos personagens para se aventurarem pelas trilhas da ilha.

---

## 🎯 O Que Foi Feito Recentemente: Os 3 Modelos Experimentais & Hub

A pedido do usuário, foram criados 3 modelos experimentais independentes para teste e comparação lado a lado antes de aplicar na versão principal:

### 🧩 Hub Comparador Geral
* **URL:** `http://localhost:8810/hub-modelos.html` (ou `/hub`)
* Central que apresenta e conecta todos os modelos com um clique.

### 📦 Modelo 1 — Economia de Estoque, Despensa & Ócio Humano
* **URL:** `http://localhost:8810/visualizador-modelo1.html`
* **Arquivos:** `modelo1-estoque.js`, `cerebro-modelo1.js`, `visualizador-modelo1.html`, `estado-modelo1.json`
* **Conceito:** A comida tem rendimento de múltiplas refeições (peixe x2, frutas x3, arroz x10). Quando a despensa comunitária está abastecida para dias, os seres ganham o privilégio do TEMPO LIVRE (ócio humano), deixando de pescar/caçar e focando em prosear, contemplar e expandir a vila.

### 🧠 Modelo 2 — Affordances Ricas & Simulação Social (AI Town / Generative Agents)
* **URL:** `http://localhost:8810/visualizador-modelo2.html`
* **Arquivos:** `modelo2-affordances.js`, `cerebro-modelo2.js`, `visualizador-modelo2.html`, `estado-modelo2.json`
* **Conceito:** 5 Estações interativas no mapa (Bancada de ferramentas, Mural de recados comunitário, Curral de animais, Altar do saber e Forja de ferro). Agentes possuem Plano do Dia reflexivo (Manhã, Tarde, Noite) e livre-arbítrio visceral.

### 🏰 Modelo 3 — RPG RTS de Construção & Expansão de Vila (Colony Sim)
* **URL:** `http://localhost:8810/visualizador-modelo3.html`
* **Arquivos:** `modelo3-rpg.js`, `cerebro-modelo3.js`, `motor-three-rpg.js`, `visualizador-modelo3.html`, `estado-modelo3.json`
* **Conceito:** Câmera tática expandida controlada com WASD + Q/E (FOV 60°), tesouro cívico com 4 recursos (Madeira, Pedra, Ferro, Moedas de Ouro), fila de obras modulares que adicionam construções 3D no mapa e missões cívicas de mural.

---

## 📂 Arquivos Integrados no Servidor (visualizador-ilha.js)
* Rotas estáticas para `/hub`, `/visualizador-modelo1.html`, `/visualizador-modelo2.html`, `/visualizador-modelo3.html` e `/motor-three-rpg.js`.
* Rotas de API completas:
  - `GET /api/modelo1/snapshot` & `POST /api/modelo1/ciclo`, `/api/modelo1/visitante`, `/api/modelo1/construir`
  - `GET /api/modelo2/snapshot` & `POST /api/modelo2/ciclo`, `/api/modelo2/recado`
  - `GET /api/modelo3/snapshot` & `POST /api/modelo3/ciclo`, `/api/modelo3/construir`, `/api/modelo3/mercador`

---

## 🎯 O Que Estava Sendo Feito & Contexto Recente

### 1. Água em Camadas e Tubarão Submerso Realista
* **Problema anterior:** O tubarão era um sprite de peixe 2D visto de lado, flutuava por cima de tudo e ficava girando estaticamente em falso sobre o mar. A água do mapa era estática.
* **Solução implementada:**
  - **Camada Subaquática (`underwaterContainer` em `motor-pixi-ilha.js`)**: Inserida entre o mapa de fundo e a camada de superfície da água. O tubarão nada submerso nessa camada com opacidade subaquática (`0.80`).
  - **Novo Sprite Top-Down (`assets/sprites/tubarao.svg`)**: Silhueta hidrodinâmica vista de cima com contra-sombreamento, dorso cáustico e cauda oscilante.
  - **Orientação Hidrodinâmica**: A rotação acompanha o vetor tangente real da trajetória elíptica (`heading = Math.atan2(vy, vx)`) com ondulação de cauda (`Math.sin(tempo * 0.006) * 0.06`).
  - **Camada de Superfície da Água (`graphicsMar` em `motor-sprites-ilha.js`)**:
    - Desenha a ponta da barbatana dorsal cortando a linha d'água exatamente acima do tubarão.
    - Esteira de espuma branca em V (*V-wake*) se abrindo para trás da barbatana.
    - Ondulações concêntricas de água se propagando para trás.
    - Rebentações espumosas com ciclo de maré na praia do sul.

### 2. A Fazenda Dinâmica (Horta Viva)
* **Problema anterior:** A horta estática pintada no mapa original foi apagada (a pedido do usuário), mas quando os personagens não haviam plantado nada (`plantados: 0`), o código simplesmente ocultava tudo (`return`). O usuário abria o mapa e perguntava "Onde está a fazenda?". Além disso, as coordenadas no código estavam em `(0.880, 0.560)`, longe da clareira real.
* **Solução implementada:**
  - **Coordenadas corrigidas**: `fazenda` agora aponta para `{ x: 0.796, y: 0.651 }` (a clareira real ao lado da cabana da Maria e curral).
  - **Canteiro base quando vazia**: Se não há cultivo ativo, exibe 1 canteiro de terra arada fértil com estacas (`assets/sprites/canteiro_arado.svg`), delimitando a horta comunitária.
  - **Expansão dinâmica**: Conforme os personagens plantam, a horta cresce dinamicamente (1, 2 ou 3 canteiros) com brotos, plantas maduras (cenouras) ou pós-colheita.
  - **Fundo limpo**: O mapa `mapa-ilha-evertrail.png` e `.jpg` teve a plantação estática antiga substituída por grama perfeita via OpenCV/seamless cloning.

### 3. Cache-Busting no Navegador
* Adicionado versionamento (`?v=20261108_2125`) nos scripts em `visualizador-ilha.html`, no carregamento da imagem do mapa e no carregador de texturas SVG de `motor-sprites-ilha.js`.

---

## 📂 Arquivos Modificados Recentemente
1. `CHECKPOINT_SISTEMA.md` *(este arquivo)*: Registro permanente para continuidade.
2. `motor-pixi-ilha.js`: Criação do `underwaterContainer`, cálculo do heading do tubarão, integração com `tubaraoSurface`, coordenadas da fazenda em `(0.796, 0.651)`.
3. `motor-sprites-ilha.js`: `atualizarHortaProps` com canteiro arado quando vazio, `atualizarAguaViva` com barbatana e esteira em V, cache-busting nos SVGs.
4. `visualizador-ilha.html`: Cache-busting nas tags `<script>`.
5. `assets/sprites/tubarao.svg`: Novo modelo top-down hidrodinâmico.
6. `assets/sprites/canteiro_*.svg`: Canteiros de terra orgânica transparente sem bordas artificiais de madeira.
7. `mapa-ilha-evertrail.png` & `.jpg`: Fundo sem plantação estática.

---

## 📋 O Que Falta / Próximos Passos
1. **Feedback do Usuário**: Verificar no visualizador ([http://localhost:8810](http://localhost:8810)) se a água, o tubarão cortando a superfície e a horta estão com o visual desejado.
2. **Ciclo de Cultivo dos Personagens**: Garantir que as decisões cognitivas dos personagens (especialmente Maria ou João) priorizem semear e cuidar da horta para que o usuário veja a transição entre estágios (brotos -> maduros -> colheita).
3. **Commit Regular no Git**: Sempre comitar antes de pausas ou turnos longos para não corromper arquivos durante desligamentos abruptos.

---

## 🚀 Como Retomar Rapidamente Após Reinício do PC
1. No terminal do VS Code / Antigravity na pasta `C:\Users\Rafael\ilha`:
   ```powershell
   # 1. Verificar se o node está rodando o visualizador
   Get-Process node -ErrorAction SilentlyContinue

   # 2. Se o visualizador não estiver ativo, iniciar:
   node visualizador-ilha.js
   ```
2. Abrir o navegador em `http://localhost:8810` (com Ctrl+Shift+R para limpar cache residual).
3. Ler este arquivo (`CHECKPOINT_SISTEMA.md`) para prosseguir com a próxima demanda.

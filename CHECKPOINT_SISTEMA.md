# 📍 CHECKPOINT DE DESENVOLVIMENTO — ILHA AURORA (Evertrail 2.5D)

> **PROPÓSITO DESTE ARQUIVO:**  
> O PC reinicia com frequência. Qualquer nova sessão ou instância de IA **DEVE LER ESTE ARQUIVO PRIMEIRO** para saber imediatamente o estado da sessão anterior, o que estava sendo feito e quais os próximos passos.  
> **REGRA DE OURO:** Atualizar este arquivo e rodar `git commit` a cada alteração significativa para evitar perda de progresso.

---

## 🕒 Última Atualização
* **Data/Hora:** 2026-11-08 21:30 (Horário Local)
* **Branch Git:** `visualizacao-ilha`
* **Status do Servidor:** `node visualizador-ilha.js` rodando em `http://localhost:8810` (ou `http://0.0.0.0:8810`).

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

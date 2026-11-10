# GUIA DE TRANSFERÊNCIA PARA A ILHA ATUAL

Este documento é o manual oficial de engenharia para transportar, integrar e conectar este pacote visual (`A-ILHA-VISUAL`) à aplicação existente **A Ilha**, sem quebrar ou reescrever a arquitetura atual do projeto.

---

## 1. Visão Geral do Que Foi Desenvolvido

Foi criada a experiência visual e interativa completa da **A ILHA**, estruturada como um território digital tridimensional/isométrico auto-suficiente:
1. **Motor Isométrico 3D (`IlhaVisualEngine`)**: Renderizador em Canvas 2D/WebGL puro, sem dependências de pesadas bibliotecas externas, garantindo taxa de quadros a 60 FPS estáveis mesmo em dispositivos móveis Android modestos.
2. **Design System Completo**: Tokens universais de cores, tipografia, espaçamentos, bordas, sombras e curvas de interpolação em formatos JSON e CSS.
3. **10 Telas Funcionais e Seus Estados**:
   - Tela A: Abertura (Splash / Boot do Kernel).
   - Tela B: Tela Principal (A Ilha 3D com navegação orbital, zoom e hit-testing).
   - Tela C: Meus Ambientes (Cartões modulares de status).
   - Tela D: Criar Novo Ambiente (Wizard de 4 etapas para terraformação e expansão).
   - Tela E: Interior de um Ambiente (Gaveta deslizante com métricas e apps).
   - Tela F: Central de Aplicativos (Catálogo com pesquisa e associação).
   - Tela G: Central de Privacidade e Segurança (Auditoria e escudos ativos).
   - Tela H: Configurações Gerais (Temas, telemetria e preferências).
   - Tela I: Histórico e Atividades (Linha do tempo filtrável).
   - Tela J: Ajuda e Orientações (Boas práticas de isolamento legítimo).
4. **Protótipo 100% Desacoplado**: Totalmente navegável utilizando uma camada de dados demonstrativos limpos (`mock-data.js`).

---

## 2. Tecnologias Utilizadas

- **Linguagens**: HTML5 Semântico, CSS3 Moderno (Variáveis CSS, Backdrop Filters, Flexbox, Grid), JavaScript ECMAScript 2026 nativo (ES Modules e compatibilidade direta via script).
- **Gráficos**: Canvas 2D com Projeção Isométrica Matricial (Rotação Yaw/Pitch, Projeção em Profundidade Z, Iluminação em Tempo Real).
- **Vetorização**: SVG para ícones, logos e brasões dos distritos.
- **Tipografia**: *Plus Jakarta Sans* e *JetBrains Mono*.

---

## 3. Mapeamento de Arquivos por Tela

| Tela | Arquivo do Protótipo | Componentes Envolvidos |
| :--- | :--- | :--- |
| **A. Abertura** | `05-PROTOTIPO/index.html` (`#splash-screen`) | `.splash-logo-container`, `.splash-loader-bar` |
| **B. Tela Principal** | `05-PROTOTIPO/index.html` (`#island-canvas`) | `IlhaVisualEngine` em `app.js`, `.top-hud`, `.bottom-dock` |
| **C. Meus Ambientes** | `05-PROTOTIPO/index.html` (`#sheet-environments`) | `.env-card`, `.badge`, `.app-chip` |
| **D. Criar Ambiente** | `05-PROTOTIPO/index.html` (`#sheet-new-env`) | `.form-group`, `.form-input`, seletor de bioma |
| **E. Interior do Distrito**| `05-PROTOTIPO/index.html` (`#district-interior-sheet`) | `.district-sheet`, `.district-drag-handle`, `.demo-banner` |
| **F. Central de Apps** | `05-PROTOTIPO/index.html` (`#sheet-apps`) | Grade de catálogo, chips de aplicativos |
| **G. Privacidade/Segurança**| `05-PROTOTIPO/index.html` (`#sheet-security`) | Cards de escudo, banner de conformidade |
| **H. Configurações** | `05-PROTOTIPO/index.html` (`#sheet-settings`) | Alternador de temas, controles gerais |
| **I. Histórico** | `05-PROTOTIPO/index.html` (`#sheet-history`) | `#history-timeline`, itens cronológicos |
| **J. Ajuda** | `05-PROTOTIPO/index.html` (`#sheet-help`) | Cards informativos e diretrizes legítimas |

---

## 4. Transporte de Componentes Individuais

Cada componente da pasta `03-COMPONENTES/` e `01-DESIGN-SYSTEM/` pode ser copiado individualmente:

1. **Tokens de Estilo**:
   - Para Web/Cordova/Capacitor: importe `01-DESIGN-SYSTEM/tokens/tokens.css`.
   - Para Android Nativo (Jetpack Compose): consulte os valores mapeados em `06-INTEGRACAO/tokens/Tokens.kt`.
2. **Ícones SVG**:
   - O arquivo `02-ASSETS/icones/icons.svg` contém símbolos vetoriais padronizados com `viewBox="0 0 24 24"`.
   - Podem ser convertidos para `VectorDrawable` no Android Studio via *Right Click no res/drawable -> New -> Vector Asset*.
3. **Motor Gráfico da Ilha**:
   - A classe `IlhaVisualEngine` em `05-PROTOTIPO/app.js` é auto-contida.
   - Ela requer apenas um elemento `<canvas id="island-canvas">` e um objeto de dados no formato de `MOCK_DATA.districts`.

---

## 5. Como Substituir os Dados Demonstrativos por Dados Reais

No protótipo atual, os dados são lidos de `05-PROTOTIPO/mock-data.js`. Para conectar à lógica real da A Ilha:

1. **Localize o Ponto de Entrada**:
   No arquivo `app.js`, a classe `IlhaAppManager` inicializa o estado através de:
   ```javascript
   this.data = JSON.parse(JSON.stringify(MOCK_DATA_SOURCE));
   ```
2. **Substituição por Serviço Real**:
   Crie uma ponte assíncrona (Bridge/Repository):
   ```javascript
   // Exemplo de integração com API nativa ou backend local
   async function carregarAmbientesReais() {
     // Se estiver rodando dentro de um WebView Android com interface Javascript:
     if (window.AndroidBridge && window.AndroidBridge.getProfiles) {
       const jsonString = await window.AndroidBridge.getProfiles();
       return JSON.parse(jsonString);
     }
     // Fallback para chamada HTTP/REST existente:
     const response = await fetch('/api/ambientes');
     return await response.json();
   }
   ```
3. **Mapeamento de Campos**:
   Garanta que cada ambiente retornado forneça:
   - `id`: identificador único (string).
   - `name`: nome visível do ambiente.
   - `status`: `'active'` ou `'paused'`.
   - `themeColor`: cor hexadecimal para a iluminação do distrito no mapa 3D.
   - `mapCoordinates`: `{ x, y, z, radius }` (posicionamento no platô da Ilha).
   - `apps`: lista de aplicativos instalados no respectivo perfil Android.

---

## 6. Distinção Crucial: Visual vs. Implementação Nativa

Para manter integridade arquitetural e segurança, a tabela abaixo detalha o que este pacote visual resolve e o que precisa ser tratado no código nativo Android:

| Funcionalidade | Papel da Camada Visual (`A-ILHA-VISUAL`) | Dependência Nativa do Android (SO) |
| :--- | :--- | :--- |
| **Renderização da Ilha** | 100% implementada no Canvas. Rotação, zoom, iluminação e seleção de distritos. | Nenhuma (roda inteiramente no cliente gráfico). |
| **Pausar / Retomar Espaço** | Atualiza badges, atenua iluminação do distrito e altera botões. | Requer chamada a `UserManager.setQuietModeEnabled(userId)` em perfis de trabalho. |
| **Isolamento de Contatos/Storage** | Interface exibe status da regra e telemetria de armazenamento. | Depende das políticas de contêiner e permissões nativas (`DevicePolicyManager`). |
| **Instalação de Apps no Ambiente**| Interface cataloga apps e exibe diálogo demonstrativo. | Requer `PackageInstaller` direcionado ao `UserHandle` correto do perfil. |
| **Modo Escuro / Claro** | 100% implementado via tokens CSS e renderização gráfica da água/céu. | Pode ser sincronizado com `Configuration.UI_MODE_NIGHT_MASK`. |

---

## 7. Passos para a Integração

1. Copie a pasta `A-ILHA-VISUAL` para dentro do repositório da aplicação principal.
2. Não altere os arquivos de lógica legada de A Ilha imediatamente.
3. Se a aplicação atual for híbrida (WebView/Capacitor):
   - Aponte a rota inicial para `A-ILHA-VISUAL/05-PROTOTIPO/index.html`.
   - Conecte o `AndroidBridge` às ações dos botões.
4. Se a aplicação atual for nativa (Kotlin / Jetpack Compose):
   - Utilize a documentação de tokens em `01-DESIGN-SYSTEM/tokens/tokens.json`.
   - O canvas interativo da Ilha pode rodar dentro de um `AndroidView(factory = { WebView(...) })` ultraleve com aceleração de hardware ativada, enquanto as telas secundárias podem ser Compose nativo espelhando o design system aqui entregue.

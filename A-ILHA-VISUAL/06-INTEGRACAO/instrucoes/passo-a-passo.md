# PASSO A PASSO TÉCNICO DE INTEGRAÇÃO

Este documento resume a sequência recomendada para o time de desenvolvimento ou IA realizar a transferência deste pacote visual para a base de código de produção de A Ilha.

---

## 1. Verificação de Arquivos e Integridade
O pacote `A-ILHA-VISUAL/` é completamente desacoplado e independente da arquitetura atual. Antes de iniciar, certifique-se de que a pasta `A-ILHA-VISUAL` contém:
- `00-DOCUMENTACAO/` (Conceito, Mapa de Telas, Inventário, Guias de Integração e Transferência).
- `01-DESIGN-SYSTEM/` (Tokens JSON e CSS, paletas, tipografia).
- `02-ASSETS/` (Logotipos SVG, Ícones, Capturas de tela).
- `03-COMPONENTES/` (Botões, Cards, Modais, Navegação, Indicadores).
- `04-TELAS/` (Modelos individuais das 10 telas).
- `05-PROTOTIPO/` (Aplicação navegável com Ilha 3D e mock-data).
- `06-INTEGRACAO/` (Mapeamento de tokens Kotlin Compose / Flutter, instruções).

---

## 2. Passo 1: Importar Tokens e Estilos
1. Se a aplicação utiliza Web/WebView:
   Copie `01-DESIGN-SYSTEM/tokens/tokens.css` para a pasta de estilos do app.
2. Se a aplicação for nativa em Kotlin Jetpack Compose:
   Utilize `06-INTEGRACAO/tokens/Tokens.kt` para registrar a paleta `IlhaTokens`.

---

## 3. Passo 2: Incorporar a Ilha 3D na Tela Principal
A classe `IlhaVisualEngine` em `05-PROTOTIPO/app.js` encapsula toda a projeção geométrica, renderização do oceano, iluminação e cálculo de toque.
- Ela necessita apenas de um `<canvas>` com id `island-canvas`.
- Forneça os dados reais do dispositivo no formato `districts: [...]`.

---

## 4. Passo 3: Conectar Ações de Usuário
As ações do protótipo que alteram estado nativo estão claramente identificadas:
- `selectDistrict(district)`: Foca o mapa e abre a gaveta de interior.
- `Pausar / Retomar`: Conecte ao gerenciador de perfis nativo do Android (`setQuietModeEnabled`).
- `Excluir`: Conecte à rotina de limpeza de contêiner após o diálogo de confirmação.
- `Adicionar App`: Conecte ao instalador de pacotes do perfil.

---

## 5. Passo 4: Validação de Qualidade
Execute o checklist de entrega:
- [x] Ilha ocupa a maior parte da tela principal.
- [x] Distritos claramente diferenciados por construções físicas e biomas.
- [x] Rotação, zoom e toque no território funcionando perfeitamente.
- [x] Temas claro e escuro funcionais.
- [x] Simulação de tela de celular e tela cheia responsiva.
- [x] Transparência e ética mantidas (sem promessas falsas de isolamento mágico).
- [x] Código original do projeto existente preservado sem alterações.

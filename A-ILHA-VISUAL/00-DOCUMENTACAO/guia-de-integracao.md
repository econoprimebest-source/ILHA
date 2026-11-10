# GUIA GERAL DE INTEGRAÇÃO — A ILHA

Este documento descreve como conectar o pacote visual a diferentes plataformas de destino (Android Nativo, Web/PWA e Flutter).

---

## 1. Abordagem de Integração em Camadas

O pacote visual foi desenhado com base no princípio de **Inversão de Dependência**:
```
┌────────────────────────────────────────────────────────┐
│             CAMADA VISUAL (A-ILHA-VISUAL)              │
│  - Ilha 3D Canvas Isométrico                           │
│  - HUD, Modais, Gavetas e Design System                 │
└───────────────────────────▲────────────────────────────┘
                            │ Dispara eventos / Lê estados
┌───────────────────────────┴────────────────────────────┐
│              CAMADA DE ADAPTAÇÃO (BRIDGE)              │
│  - IlhaBridge (TypeScript / JavaScript / Kotlin)        │
└───────────────────────────▲────────────────────────────┘
                            │ Executa comandos de SO
┌───────────────────────────┴────────────────────────────┐
│           CAMADA DE SISTEMA ANDROID / BACKEND          │
│  - UserManager, DevicePolicyManager, LauncherApps      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Integração em Aplicações Android (Kotlin / Jetpack Compose)

Se o aplicativo existente utilizar Jetpack Compose:
1. **Renderização do Território da Ilha**:
   O canvas interativo da Ilha pode ser incorporado sem custo de reescrita em C++/Vulkan através de uma `WebView` otimizada:
   ```kotlin
   @Composable
   fun IslandVisualView(
       modifier: Modifier = Modifier,
       onDistrictSelected: (String) -> Unit
   ) {
       AndroidView(
           modifier = modifier,
           factory = { context ->
               WebView(context).apply {
                   settings.javaScriptEnabled = true
                   settings.domStorageEnabled = true
                   addJavascriptInterface(object {
                       @JavascriptInterface
                       fun onDistrictClick(districtId: String) {
                           onDistrictSelected(districtId)
                       }
                   }, "NativeBridge")
                   loadUrl("file:///android_asset/A-ILHA-VISUAL/05-PROTOTIPO/index.html?skipSplash=1")
               }
           }
       )
   }
   ```
2. **Tokens de Design em Compose**:
   Importe as cores e raios do arquivo `06-INTEGRACAO/tokens/Tokens.kt`.

---

## 3. Integração em Aplicações Web / PWA / Electron

Se a aplicação rodar em ambiente Web:
1. Copie a pasta `01-DESIGN-SYSTEM`, `02-ASSETS` e `05-PROTOTIPO` para seu diretório público ou de assets estáticos.
2. Invoque `new IlhaVisualEngine('island-canvas')` apontando para o contêiner canvas de sua escolha.
3. Substitua o objeto `MOCK_DATA` pelo seu store reativo (Redux, Pinia, Zustand ou Signals).

---

## 4. Integração em Flutter

Se a aplicação existente estiver em Flutter:
1. Adicione a pasta `A-ILHA-VISUAL` em `assets/ilha_visual/`.
2. Utilize o pacote `webview_flutter` para renderizar o motor da Ilha ou utilize CustomPainter espelhando as rotinas de projeção isométrica descritas na classe `IlhaVisualEngine` de `app.js`.

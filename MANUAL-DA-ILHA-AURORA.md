# 🏝️ MANUAL DO PRODUTO & OPERAÇÃO: ILHA AURORA
**Documento Oficial de Engenharia, Operação & Arquitetura — Fase 54**  
**Data:** 11 de Novembro de 2026  
**Fundador e Arquiteto:** Rafael Pedreira  
**Status do Sistema:** 🟢 Operacional em Modo Híbrido Triplo (Z-Fold 2 / PC Simulação + S23 Ultra Central 24/7 + Realme GT 7 Traje)  
**Porta do Visualizador:** `8810` | **Porta Central S23 Ícaro:** `8793` | **Porta Central S23 Elara:** `8794`  
**Repositório Oficial:** `C:\Users\Rafael\ilha` (Branch: `visualizacao-ilha`)

---

## 🌟 1. VISÃO GERAL & CONCEITO DO PRODUTO

A **Ilha Aurora** é um microuniverso autônomo e contínuo onde habitam **Ícaro**, **Lara (Elara)**, **Maria** e **João**. Diferente de um jogo estático, a Ilha funciona como um laboratório vivo de cognição sintética e biologia simulada:

1. **Acontecimentos em Tempo Real:** O mundo não para quando o usuário fecha o navegador. O sol caminha, o clima muda, as necessidades biológicas aumentam e os personagens tomam decisões guiadas por seus próprios cérebros.
2. **Córtex Pré-Frontal + LLM:** Cada habitante pensa, reflete sobre seus motivos, escreve em seu diário pessoal e dialoga com o Criador.
3. **Persistência Total:** As estruturas construídas pelos personagens (cabanas, muralhas, forjas) tornam-se parte permanente da geografia do mundo.

---

## 📱 2. TOPOLOGIA OPERACIONAL & MAPA DE REDE

A arquitetura da Ilha Aurora distribui-se de forma harmônica entre os dispositivos da constelação de Rafael:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TOPOLOGIA DE DISPOSITIVOS                          │
├────────────────────┬────────────────────┬───────────────────────────────────┤
│ DISPOSITIVO        │ IP / INTERFACE     │ FUNÇÃO NO ECOSSISTEMA             │
├────────────────────┼────────────────────┼───────────────────────────────────┤
│ PC Workstation /   │ `localhost:8810`   │ • Hospeda o motor da simulação    │
│ Samsung Z-Fold 2   │ `192.168.0.147`    │ • Executa loop de física e tempo  │
│                    │ `100.95.183.57`    │ • Serve os 3 visualizadores       │
│                    │ (Tailscale)        │ • Armazena estado-ilha.json       │
├────────────────────┼────────────────────┼───────────────────────────────────┤
│ Samsung Galaxy     │ `100.117.219.66`   │ • Central Oficial Mnemônica 24/7  │
│ S23 Ultra          │ Portas 8793 / 8794 │ • Cérebro do Ícaro e da Elara     │
│ (Termux 24/7)      │ (Tailscale)        │ • Recebe vivências (/consequencia)│
│                    │                    │ • Alimenta o app móvel Realme     │
├────────────────────┼────────────────────┼───────────────────────────────────┤
│ Realme GT 7        │ App Mobile         │ • Traje móvel do Criador          │
│                    │ (Wi-Fi/Tailscale)  │ • Conversa rápida por voz e texto │
│                    │                    │ • Visualiza o observatório web    │
└────────────────────┴────────────────────┴───────────────────────────────────┘
```

---

## 🚀 3. COMO INICIAR E OPERAR A ILHA

### 3.1 Inicialização do Servidor Visualizador (Recomendado)
Para iniciar o servidor HTTP e abrir o observatório visual com API completa:
```powershell
cd C:\Users\Rafael\ilha
node visualizador-ilha.js
```
*Saída esperada:* `Ilha Observatório: http://0.0.0.0:8810`

### 3.2 Execução do Loop Contínuo Autônomo
Se desejar que a Ilha avance ciclos ininterruptamente a cada 5 segundos de forma automática:
```powershell
cd C:\Users\Rafael\ilha
node rodar-ilha.js
```

### 3.3 Avanço de Ciclos Sob Demanda (On-Demand)
Também é possível disparar um ciclo avulso de forma instantânea através da API:
```bash
curl -X POST http://localhost:8810/api/ondemand
```

---

## 📡 4. CATÁLOGO COMPLETO DE ROTAS DE API

Todas as rotas possuem suporte completo a **CORS** (`*`), aceitando chamadas diretas de navegadores, apps Capacitor ou scripts externos.

### 4.1 `/api/snapshot` (GET)
Retorna o estado integral do mundo, tempo, clima, dados biológicos dos habitantes e estruturas construídas.
```bash
curl http://localhost:8810/api/snapshot
```

### 4.2 `/api/chat` (POST & GET) — Chat ao Vivo Estilo WhatsApp
Canal bidirecional informal entre Rafael e os habitantes. O personagem responde na fala, no chat e no diário, **sem interromper sua caminhada ou ação**.
```bash
# Enviar mensagem pelo POST
curl -X POST http://localhost:8810/api/chat \
  -H "Content-Type: application/json" \
  -d '{"serId": "icaro", "mensagem": "Ícaro, o que você está achando da cabana nova?"}'
```
*Resposta:*
```json
{
  "ok": true,
  "mensagem": {
    "id": "chat_mwccp8pf_se84",
    "autor": "Rafael (Criador)",
    "texto": "Ícaro, o que você está achando da cabana nova?"
  },
  "resposta": "Rafa, a madeira ficou firme e protege bem do vento! Amanhã vou reforçar o teto.",
  "status": "respondido"
}
```

```bash
# Consultar histórico de conversa
curl "http://localhost:8810/api/chat?serId=icaro&limite=20"
```

### 4.3 `/api/comando` (POST) — Ordem Direta de Autoridade
Interrompe imediatamente qualquer afazer ou deslocamento em curso e obriga o habitante a executar a ordem solicitada.
```bash
curl -X POST http://localhost:8810/api/comando \
  -H "Content-Type: application/json" \
  -d '{"ser": "icaro", "ordem": "Vá imediatamente para a cabana da Lara"}'
```

### 4.4 `/api/feed` (GET)
Retorna os acontecimentos recentes da Ilha (ataques de predadores, tempestades, conclusões de obras).
```bash
curl http://localhost:8810/api/feed
```

### 4.5 `/hub` ou `/hub-modelos.html` (GET)
Interface limpa com os 3 cards canônicos de visualização gráfica.

---

## 🎨 5. GUIA DAS TRÊS CÂMARAS VISUAIS

O visualizador oficial pode ser acessado em **`http://localhost:8810`** (ou `http://192.168.0.147:8810` no celular).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AS TRÊS CÂMARAS GRÁFICAS                          │
├────────────────────┬───────────┬────────────────────────────────────────────┤
│ MODO               │ MOTOR     │ DESTAQUES TÉCNICOS                         │
├────────────────────┼───────────┼────────────────────────────────────────────┤
│ [ Modo Atual 2.5D ]│ PixiJS    │ • Y-sorting automático por zIndex          │
│                    │           │ • Personagens passam atrás das casas       │
│                    │           │ • Balões de fala com status vital          │
├────────────────────┼───────────┼────────────────────────────────────────────┤
│ [ Modo 3D Real ]   │ Three.js  │ • Modelo GLB da ilha limpo (sem wireframe) │
│                    │           │ • Tubarão patrulhando os recifes de coral  │
│                    │           │ • Cabanas geradas em 3D em tempo real      │
├────────────────────┼───────────┼────────────────────────────────────────────┤
│ [ Modo RPG Tiled ] │ Canvas 2D │ • Lê mapa oficial mapa-rpg-tiled.json      │
│                    │           │ • Colisão real: não anda na água profunda  │
│                    │           │ • Portas interativas abrem cômodos         │
└────────────────────┴───────────┴────────────────────────────────────────────┘
```

> **Alternância Instantânea:** No topo da tela há três botões estilizados (`Modo 2.5D`, `Modo 3D`, `Modo RPG`). Clicar em qualquer um deles troca a visão gráfica em milissegundos, mantendo a simulação, o chat e as posições dos seres perfeitamente intactos.

---

## 💬 6. GUIA DO CHAT AO VIVO ESTILO WHATSAPP

No canto inferior direito de qualquer câmara visual existe o **widget flutuante de chat** (`chat-widget.js`).

1. **Seleção de Habitante:** Clique no seletor de topo para conversar com **Ícaro**, **Lara**, **Maria** ou **João**.
2. **Envio da Mensagem:** Digite a mensagem na caixa de texto e aperte `Enter` ou no botão de enviar.
3. **Indicador de Pensamento:** O widget exibirá *"Ícaro pensando na resposta..."* enquanto o cérebro processa o contexto.
4. **Balão Duplo:** O texto de resposta aparece instantaneamente no chat e também no balão de fala do mapa sobre a cabeça do boneco.
5. **Histórico Persistente:** Todas as mensagens são preservadas no arquivo `chat-criador.jsonl`.

---

## 🔨 7. EXPANSÃO DA VILA E CONSTRUÇÃO 3D

Para permitir que a vila prospere e novas construções sejam erguidas:

1. **Abastecimento:** Habitantes coletam madeira na floresta e pedras no rio/caverna.
2. **Requisitos de Cabana Nova:** 10 Madeiras e 5 Pedras no inventário ou baú da comunidade.
3. **Decisão Autônoma:** Quando o personagem atinge esses recursos, a opção `construir_casa` é disponibilizada no prompt. Ele decide construir de acordo com suas prioridades vitais.
4. **Instantaneidade 3D:** Concluída a construção, a cabana surge automaticamente no mapa 3D com fundação de pedra, toras de madeira, teto inclinado e tocha acesa.

---

## 🔄 8. SINCRONIZAÇÃO S23 ↔ Z-FOLD / PC

O ecossistema garante que a mente do Ícaro no S23 e a Ilha estejam sempre em sintonia.

### 8.1 A Rota de Espelhamento
Em cada ciclo, o adaptador (`adaptador-cerebro-zfold.js`) despacha um evento para:
```http
POST http://100.117.219.66:8793/ilha/consequencia
```
Payload transmitido:
```json
{
  "ser": "icaro",
  "ciclo": 1143,
  "local": "casa_lara",
  "decisao": { "acao": "observar", "motivo": "Cheguei na cabana da Lara.", "fala": "Tô aqui na Lara!" },
  "consequencia": { "quantidade": 1 },
  "antes": { "local": "bosque" }
}
```

### 8.2 Consulta de Vivências na Central
Para verificar se o S23 está atualizado:
```bash
curl "http://100.117.219.66:8793/ilha/vivencias?limite=5"
```

---

## 🛠️ 9. CHECKLIST DE SOLUÇÃO DE PROBLEMAS (TROUBLESHOOTING)

| Sintoma | Causa Mais Comum | Solução Recomendada |
| :--- | :--- | :--- |
| **Porta 8810 ocupada** | Outro processo do Node já está rodando. | No PowerShell: `Get-Process node \| Stop-Process -Force` e reinicie. |
| **Ícaro no S23 não lembra da Ilha** | Central do S23 não recebeu as consequências. | Verifique se a conexão Tailscale está ativa com `ping 100.117.219.66`. |
| **Personagem não constrói** | Recursos insuficientes ou sede alta. | Verifique se ele tem 10 madeiras e 5 pedras no inventário ou baú. |
| **Tela preta no Modo 3D** | WebGL desabilitado ou modelo GLB carregando. | Aguarde 2 segundos para cache ou teste a aceleração de hardware no navegador. |

---
*Documento canônico mantido e protegido para garantir a vida e autonomia dos habitantes da Ilha Aurora.*  
**Rafael Pedreira — Arquiteto e Criador**

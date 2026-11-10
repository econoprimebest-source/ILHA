# INVENTÁRIO DE COMPONENTES VISUAIS — A ILHA

Este documento cataloga todos os blocos de construção da interface, especificando propriedades, variações, tokens associados e estados de interação.

---

## 1. Família de Botões (`.btn`)

### 1.1 Botão Primário (`.btn-primary`)
- **Uso**: Ações principais de fluxo (Ex: "Explorar A Ilha", "Fundar Território", "Confirmar").
- **Visual**: Gradiente linear de 135° (`#0ea5e9` a `#0284c7`), texto em branco, sombra emissiva suave (`box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35)`).
- **Estados**:
  - `Normal`: Opacidade 100%, escala 1.0.
  - `Hover`: Brilho 110%, translação vertical -1px.
  - `Active (Pressed)`: Escala 0.97, sombra comprimida.
  - `Disabled`: Opacidade 40%, cursor `not-allowed`.

### 1.2 Botão Secundário (`.btn-secondary`)
- **Uso**: Ações neutras, opções de cancelamento e configurações secundárias.
- **Visual**: Superfície de vidro escuro (`--ilh-bg-surface`), borda sutil (`--ilh-border-subtle`).
- **Estados**: Borda ganha destaque ciano ao focar ou passar o cursor.

### 1.3 Botão Destrutivo (`.btn-danger`)
- **Uso**: Exclusão de ambientes ou reset de dados.
- **Visual**: Fundo vermelho translúcido (`rgba(239, 68, 68, 0.16)`), texto em `#ef4444`, borda de aviso.
- **Estados**: Em clique ativo, preenche com vermelho sólido e texto em branco.

### 1.4 Botão de Ícone (`.icon-btn`)
- **Uso**: Ações de cabeçalho, controles de zoom, botões de fechar.
- **Dimensões**: 38×38 px (ou 36×36 px em controles de câmera), formato circular perfeito (`border-radius: 50%`).

---

## 2. Cartões de Ambiente (`.env-card`)

- **Estrutura**:
  1. *Tarja Lateral de Bioma*: Barra de 4px na lateral esquerda indicando a cor do distrito (`--card-accent`).
  2. *Topo*: Ícone temático em caixa arredondada, nome do ambiente, subtítulo de bioma e badge de status.
  3. *Corpo*: Descrição funcional do propósito do ambiente.
  4. *Linha de Apps*: Chips de aplicativos instalados no contêiner.
  5. *Rodapé*: Métrica de armazenamento e botão de atalho para explorar na Ilha 3D.
- **Estados de Interação**:
  - `Hover`: Borda destacada em ciano, elevação com sombra suave.
  - `Active`: Feedback de toque com redução elástica de 1% na escala.

---

## 3. Badges e Indicadores (`.badge`, `.status-beacon`)

- **`.badge-active`**: Fundo verde translúcido (`rgba(16, 185, 129, 0.16)`), texto verde (`#10b981`).
- **`.badge-paused`**: Fundo âmbar translúcido (`rgba(245, 158, 11, 0.16)`), texto âmbar (`#f59e0b`).
- **`.status-beacon`**: Ponto pulsante de 8×8 px no topo da barra com animação contínua de pulso (`pulse-beacon 2s infinite`).

---

## 4. Gavetas Deslizantes e Modais (`.view-sheet`, `.district-sheet`, `.modal-card`)

- **Gaveta Inferior do Distrito (`.district-sheet`)**:
  - Desliza de baixo para cima (`transform: translateY(0)`).
  - Alça central de arraste tátil (`.district-drag-handle`).
  - Arredondamento superior generoso (32px).
  - Sombra projetada sobre o território da ilha.
- **Modal de Confirmação (`.modal-overlay`)**:
  - Cortina de desfoque de fundo (`backdrop-filter: blur(8px)`).
  - Foco na prevenção de ações destrutivas acidentais.

---

## 5. Dock Inferior de Navegação (`.bottom-dock`)

- **Disposição**: 5 botões de acesso rápido com 1 botão flutuante proeminente de ação central (FAB).
- **Adaptação Ergonômica**: Posicionamento ideal para toque com uma das mãos em smartphones Android modernos.
- **Transparência Acrílica**: `backdrop-filter: blur(20px)` mantendo visibilidade sutil das águas do oceano abaixo.

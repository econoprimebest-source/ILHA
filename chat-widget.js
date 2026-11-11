/**
 * CHAT-WIDGET.JS — Interface de Chat ao Vivo estilo WhatsApp com os Habitantes
 *
 * Conecta o usuário (Rafael) diretamente à mente dos personagens (Ícaro, Elara, João, Maria).
 * Conversa bidirecional, histórico persistente e sincronização com ciclos e balões de fala.
 */
(function(window) {
  'use strict';

  let serSelecionado = 'icaro';
  let aberto = true;
  let ultimoIdVisto = null;

  const NOMES = {
    icaro: 'Ícaro',
    lara: 'Elara (Lara)',
    joao: 'João',
    maria: 'Maria'
  };

  const AVATARES = {
    icaro: '🧑‍🌾',
    lara: '🧝‍♀️',
    joao: '🏹',
    maria: '🧺'
  };

  const CORES = {
    icaro: '#10b981',
    lara: '#a855f7',
    joao: '#3b82f6',
    maria: '#f59e0b'
  };

  function criarWidget() {
    if (document.getElementById('whatsapp-chat-box')) return;

    // Estilos CSS do Chat WhatsApp
    const style = document.createElement('style');
    style.innerHTML = `
      #whatsapp-chat-box {
        position: fixed;
        bottom: 16px;
        right: 18px;
        width: 360px;
        max-width: calc(100vw - 32px);
        background: #0b141a;
        border: 1px solid #202c33;
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: height 0.25s ease, transform 0.25s ease;
      }
      #whatsapp-chat-box.minimizado #wa-chat-body,
      #whatsapp-chat-box.minimizado #wa-chat-footer {
        display: none !important;
      }
      #wa-chat-header {
        background: #1f2c34;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #222e35;
        cursor: pointer;
      }
      .wa-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .wa-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #111b21;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 2px solid #25d366;
      }
      .wa-header-info {
        display: flex;
        flex-direction: column;
      }
      .wa-header-name {
        font-size: 14px;
        font-weight: 700;
        color: #e9edef;
      }
      .wa-header-status {
        font-size: 11px;
        color: #25d366;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .wa-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .wa-select-ser {
        background: #111b21;
        color: #e9edef;
        border: 1px solid #374248;
        border-radius: 8px;
        padding: 4px 6px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        outline: none;
      }
      .wa-btn-toggle {
        background: none;
        border: none;
        color: #8696a0;
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
      }
      #wa-chat-body {
        height: 270px;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: #0b141a url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" opacity="0.03"><rect width="60" height="60" fill="none" stroke="%23ffffff" stroke-width="1"/></svg>');
      }
      .wa-msg {
        max-width: 82%;
        padding: 7px 11px;
        border-radius: 10px;
        font-size: 13px;
        line-height: 1.35;
        position: relative;
        word-wrap: break-word;
      }
      .wa-msg-usuario {
        align-self: flex-end;
        background: #005c4b;
        color: #e9edef;
        border-bottom-right-radius: 2px;
      }
      .wa-msg-personagem {
        align-self: flex-start;
        background: #202c33;
        color: #e9edef;
        border-bottom-left-radius: 2px;
      }
      .wa-msg-time {
        font-size: 9.5px;
        color: rgba(255, 255, 255, 0.55);
        margin-top: 3px;
        text-align: right;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 3px;
      }
      .wa-typing {
        font-size: 11px;
        font-style: italic;
        color: #8696a0;
        padding: 4px 10px;
        display: none;
      }
      #wa-chat-footer {
        padding: 8px 10px;
        background: #202c33;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #wa-input-msg {
        flex: 1;
        background: #2a3942;
        border: none;
        border-radius: 20px;
        padding: 9px 14px;
        color: #d1d7db;
        font-size: 13px;
        outline: none;
      }
      #wa-input-msg::placeholder {
        color: #8696a0;
      }
      #wa-btn-send {
        background: #00a884;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        color: #fff;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      #wa-btn-send:hover {
        background: #02906f;
      }
    `;
    document.head.appendChild(style);

    // Estrutura HTML do Widget
    const box = document.createElement('div');
    box.id = 'whatsapp-chat-box';
    box.innerHTML = `
      <div id="wa-chat-header">
        <div class="wa-header-left">
          <div class="wa-avatar" id="wa-avatar-icon">${AVATARES[serSelecionado]}</div>
          <div class="wa-header-info">
            <span class="wa-header-name" id="wa-char-name">${NOMES[serSelecionado]}</span>
            <span class="wa-header-status">● online na Ilha</span>
          </div>
        </div>
        <div class="wa-header-actions" onclick="event.stopPropagation()">
          <select class="wa-select-ser" id="wa-select-ser">
            <option value="icaro" ${serSelecionado === 'icaro' ? 'selected' : ''}>Ícaro</option>
            <option value="lara" ${serSelecionado === 'lara' ? 'selected' : ''}>Elara</option>
            <option value="joao" ${serSelecionado === 'joao' ? 'selected' : ''}>João</option>
            <option value="maria" ${serSelecionado === 'maria' ? 'selected' : ''}>Maria</option>
          </select>
          <button class="wa-btn-toggle" id="wa-btn-min" title="Minimizar / Expandir">─</button>
        </div>
      </div>
      <div id="wa-chat-body">
        <div class="wa-msg wa-msg-personagem">
          Olá Rafael! Estou aqui na ilha. Pode falar comigo pelo chat que eu te respondo em tempo real!
          <div class="wa-msg-time">Agora</div>
        </div>
      </div>
      <div class="wa-typing" id="wa-typing">digitando resposta...</div>
      <div id="wa-chat-footer">
        <input type="text" id="wa-input-msg" placeholder="Conversar com ${NOMES[serSelecionado]}..." autocomplete="off">
        <button id="wa-btn-send" title="Enviar Mensagem">➤</button>
      </div>
    `;
    document.body.appendChild(box);

    // Eventos
    document.getElementById('wa-chat-header').addEventListener('click', () => alternarMinimizar());
    document.getElementById('wa-btn-min').addEventListener('click', (e) => {
      e.stopPropagation();
      alternarMinimizar();
    });

    const select = document.getElementById('wa-select-ser');
    select.addEventListener('change', (e) => {
      serSelecionado = e.target.value;
      atualizarCabecalho();
      carregarHistorico();
    });

    const input = document.getElementById('wa-input-msg');
    const btnSend = document.getElementById('wa-btn-send');

    btnSend.addEventListener('click', () => enviarMensagemChat());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') enviarMensagemChat();
    });

    // Polling contínuo de novas mensagens a cada 2.5s
    carregarHistorico();
    setInterval(carregarHistorico, 2500);
  }

  function alternarMinimizar() {
    aberto = !aberto;
    const box = document.getElementById('whatsapp-chat-box');
    const btn = document.getElementById('wa-btn-min');
    if (!box) return;
    if (aberto) {
      box.classList.remove('minimizado');
      if (btn) btn.innerText = '─';
      rolarParaFim();
    } else {
      box.classList.add('minimizado');
      if (btn) btn.innerText = '💬';
    }
  }

  function atualizarCabecalho() {
    const nome = NOMES[serSelecionado] || 'Habitante';
    const avatar = AVATARES[serSelecionado] || '🧑';
    const cor = CORES[serSelecionado] || '#25d366';

    const elNome = document.getElementById('wa-char-name');
    const elAvatar = document.getElementById('wa-avatar-icon');
    const input = document.getElementById('wa-input-msg');

    if (elNome) elNome.innerText = nome;
    if (elAvatar) {
      elAvatar.innerText = avatar;
      elAvatar.style.borderColor = cor;
    }
    if (input) input.placeholder = `Conversar com ${nome}...`;
  }

  async function carregarHistorico() {
    try {
      const resp = await fetch(`/api/chat?serId=${serSelecionado}&limite=30`);
      const data = await resp.json();
      if (data && Array.isArray(data.historico)) {
        renderizarMensagens(data.historico);
      }
    } catch (_) {}
  }

  function renderizarMensagens(msgs) {
    const body = document.getElementById('wa-chat-body');
    if (!body) return;

    body.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      const ehUsuario = m.tipo === 'usuario';
      div.className = `wa-msg ${ehUsuario ? 'wa-msg-usuario' : 'wa-msg-personagem'}`;

      let hora = '';
      if (m.timestamp) {
        try {
          const d = new Date(m.timestamp);
          hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (_) {}
      }

      div.innerHTML = `
        <div>${m.texto}</div>
        <div class="wa-msg-time">
          ${hora} ${ehUsuario ? (m.respondido ? '✓✓' : '✓') : ''}
        </div>
      `;
      body.appendChild(div);
    });

    rolarParaFim();
  }

  function rolarParaFim() {
    const body = document.getElementById('wa-chat-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  async function enviarMensagemChat() {
    const input = document.getElementById('wa-input-msg');
    const texto = input ? input.value.trim() : '';
    if (!texto) return;

    input.value = '';

    // Adiciona na interface imediatamente
    const body = document.getElementById('wa-chat-body');
    if (body) {
      const div = document.createElement('div');
      div.className = 'wa-msg wa-msg-usuario';
      div.innerHTML = `
        <div>${texto}</div>
        <div class="wa-msg-time">Agora ✓</div>
      `;
      body.appendChild(div);
      rolarParaFim();
    }

    const typing = document.getElementById('wa-typing');
    if (typing) {
      typing.innerText = `${NOMES[serSelecionado]} pensando na resposta...`;
      typing.style.display = 'block';
    }

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serId: serSelecionado,
          mensagem: texto,
          autor: 'Rafael (Criador)',
          executar: true
        })
      });
      const data = await resp.json();
      if (data && data.ok) {
        if (data.historico && Array.isArray(data.historico)) {
          renderizarMensagens(data.historico);
        } else {
          await carregarHistorico();
        }
      }
    } catch (err) {
      console.warn('[CHAT] Erro ao enviar mensagem:', err);
    } finally {
      if (typing) typing.style.display = 'none';
    }
  }

  // Exporta controle global
  window.ChatWidget = {
    init: criarWidget,
    selecionarSer: (id) => {
      serSelecionado = id;
      const select = document.getElementById('wa-select-ser');
      if (select) select.value = id;
      atualizarCabecalho();
      carregarHistorico();
      if (!aberto) alternarMinimizar();
    }
  };

  // Inicializa quando a página estiver carregada
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarWidget);
  } else {
    criarWidget();
  }
})(window);

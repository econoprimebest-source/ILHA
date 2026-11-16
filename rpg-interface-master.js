/**
 * rpg-interface-master.js
 * 
 * MISSÃO MASTER — ILHA AURORA (MÓDULOS 8 & 9)
 * Interface RPG de Alto Nível: HUD Superior, Card Individual, Vendinha e Cooperação
 */

(function (window) {
  'use strict';

  let estadoRpgAtual = null;
  let habitanteCardAberto = null;

  async function atualizarEstadoRpg() {
    try {
      const resp = await fetch('/api/rpg/estado-completo');
      if (!resp.ok) return;
      estadoRpgAtual = await resp.json();
      renderizarHud();
      if (habitanteCardAberto) {
        renderizarCardHabitante(habitanteCardAberto);
      }
      renderizarEstoqueVendinhaSeAberta();
    } catch (e) {
      console.warn('[RPG Master] Falha ao sincronizar estado:', e);
    }
  }

  // 1. Renderiza o HUD Superior Master (Fora do Mapa, na Barra Superior Limpa)
  function renderizarHud() {
    if (!estadoRpgAtual || !estadoRpgAtual.hud) return;
    const hud = estadoRpgAtual.hud;

    let elHud = document.getElementById('rpg-hud-master');
    if (!elHud) {
      const slot = document.getElementById('top-hud-slot') || document.getElementById('header');
      if (!slot) return;
      elHud = document.createElement('div');
      elHud.id = 'rpg-hud-master';
      elHud.style.cssText = `
        display: inline-flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      slot.appendChild(elHud);
    }

    elHud.innerHTML = `
      <div class="rpg-hud-pill" style="background: rgba(120,53,15,0.85); border: 1px solid #b45309; color: #fef3c7; padding: 3px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;">
        🪵 <span id="hud-madeira" style="color:#fff;">${hud.madeira}</span>
      </div>
      <div class="rpg-hud-pill" style="background: rgba(71,85,105,0.85); border: 1px solid #64748b; color: #f1f5f9; padding: 3px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;">
        🪨 <span id="hud-pedra" style="color:#fff;">${hud.pedra}</span>
      </div>
      <div class="rpg-hud-pill" style="background: rgba(14,116,144,0.85); border: 1px solid #06b6d4; color: #cffafe; padding: 3px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;">
        🐟 <span id="hud-comida" style="color:#fff;">${hud.comida}</span>
      </div>
      <div class="rpg-hud-pill" style="background: rgba(161,98,7,0.9); border: 1px solid #facc15; color: #fef08a; padding: 3px 8px; border-radius: 99px; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;">
        🟡 <span id="hud-ambar" style="color:#fff;">${hud.ambarVendinha}</span>
      </div>
      <button type="button" onclick="window.abrirVendinhaComunitaria()" style="background: rgba(120,53,15,0.92); border: 1px solid #f59e0b; color: #fef08a; padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Abrir Venda Comunitária">
        🏪 Venda
      </button>
      <button type="button" onclick="window.abrirModalTrajesRPG()" style="background: rgba(8,47,73,0.95); border: 1px solid #0284c7; color: #38bdf8; padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Câmeras e Telemetria dos Trajes Móveis">
        📷 Trajes
      </button>
    `;
  }

  // 2. Janela / Card Individual do Habitante
  window.abrirCardHabitanteRPG = function (serId) {
    habitanteCardAberto = serId;
    renderizarCardHabitante(serId);
  };

  function renderizarCardHabitante(serId) {
    if (!estadoRpgAtual || !estadoRpgAtual.habitantes) return;
    const hab = estadoRpgAtual.habitantes[serId];
    if (!hab) return;

    let modal = document.getElementById('rpg-habitante-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-habitante-modal';
      modal.style.cssText = `
        position: fixed;
        left: 20px;
        top: 80px;
        width: 340px;
        max-height: calc(100vh - 110px);
        overflow-y: auto;
        background: rgba(9, 21, 37, 0.96);
        backdrop-filter: blur(14px);
        border: 1px solid #0284c7;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 20px 48px rgba(0,0,0,0.8);
        z-index: 100;
        font-family: system-ui, -apple-system, sans-serif;
        color: #e2e8f0;
      `;
      document.body.appendChild(modal);
    }

    modal.style.display = 'block';

    const maoDireita = (hab.equipamentos && hab.equipamentos.find(e => e.slot_equipamento === 'mao_direita')) || { recurso_id: null };
    const bio = hab.sobrevivencia || { fome: 20, sede: 20, energia: 80, saude: 100, orientacao: 100, seguranca: 85 };
    const psi = hab.psicologia || {};

    const nomeFormatado = serId.charAt(0).toUpperCase() + serId.slice(1);

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid #1e3a5f; padding-bottom:8px;">
        <div>
          <div style="font-size:16px; font-weight:800; color:#38bdf8;">👤 ${nomeFormatado}</div>
          <div style="font-size:11.5px; color:#94a3b8;">${hab.localizacao.regiaoNome}</div>
        </div>
        <button onclick="document.getElementById('rpg-habitante-modal').style.display='none'; habitanteCardAberto=null;" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer; padding:0 4px;">✕</button>
      </div>

      <!-- CARTEIRA E MÃO DIREITA -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:12px;">
        <div style="background:rgba(15,23,42,0.8); border:1px solid #334155; border-radius:10px; padding:8px; text-align:center;">
          <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Carteira</div>
          <div style="font-size:15px; font-weight:800; color:#facc15;">🟡 ${hab.saldoAmbar} Âmbar</div>
        </div>
        <div style="background:rgba(15,23,42,0.8); border:1px solid #334155; border-radius:10px; padding:8px; text-align:center;">
          <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Mão Direita</div>
          <div style="font-size:13px; font-weight:700; color:#38bdf8;">${maoDireita.recurso_id ? `⚔️ ${maoDireita.recurso_id}` : '✋ Vazia'}</div>
        </div>
      </div>

      <!-- MOCHILA (3 SLOTS) -->
      <div style="margin-bottom:14px;">
        <div style="font-size:11px; font-weight:700; color:#7dd3fc; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.8px;">🎒 Mochila (3 Slots Oficiais)</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
          ${hab.inventario.map(s => `
            <div style="background:rgba(15,23,42,0.9); border:1px solid ${s.recurso_id ? '#0284c7' : '#334155'}; border-radius:10px; padding:6px; text-align:center;">
              <div style="font-size:9.5px; color:#64748b;">Slot ${s.slot_index + 1}</div>
              <div style="font-size:12px; font-weight:700; color:${s.recurso_id ? '#f8fafc' : '#475569'}; margin:3px 0;">
                ${s.recurso_id ? `${s.nome || s.recurso_id} (${s.quantidade})` : '— Vazio —'}
              </div>
              ${s.recurso_id ? `
                <div style="display:flex; justify-content:center; gap:2px; margin-top:4px;">
                  <button onclick="window.equiparItemRPG('${serId}', ${s.slot_index})" style="background:#0284c7; border:none; color:#fff; font-size:9px; border-radius:4px; padding:2px 4px; cursor:pointer;" title="Equipar na mão">Empunhar</button>
                  ${s.categoria === 'consumivel' ? `<button onclick="window.consumirItemRPG('${serId}', ${s.slot_index})" style="background:#059669; border:none; color:#fff; font-size:9px; border-radius:4px; padding:2px 4px; cursor:pointer;" title="Consumir">Usar</button>` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- BARRAS DE SOBREVIVÊNCIA -->
      <div style="margin-bottom:14px; background:rgba(15,23,42,0.6); border:1px solid #1e3a5f; border-radius:12px; padding:10px;">
        <div style="font-size:11px; font-weight:700; color:#7dd3fc; text-transform:uppercase; margin-bottom:8px; letter-spacing:0.8px;">❤️ Biologia & Sobrevivência</div>
        
        <div style="margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
            <span>Energia:</span> <span style="font-weight:700; color:#38bdf8;">${Math.round(bio.energia)}%</span>
          </div>
          <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
            <div style="width:${bio.energia}%; height:100%; background:#0284c7; border-radius:3px;"></div>
          </div>
        </div>

        <div style="margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
            <span>Saúde:</span> <span style="font-weight:700; color:#4ade80;">${Math.round(bio.saude)}%</span>
          </div>
          <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
            <div style="width:${bio.saude}%; height:100%; background:#22c55e; border-radius:3px;"></div>
          </div>
        </div>

        <div style="margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
            <span>Fome:</span> <span style="font-weight:700; color:${bio.fome > 70 ? '#ef4444' : '#f59e0b'};">${Math.round(bio.fome)}%</span>
          </div>
          <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
            <div style="width:${bio.fome}%; height:100%; background:${bio.fome > 70 ? '#ef4444' : '#f59e0b'}; border-radius:3px;"></div>
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
            <span>Sede:</span> <span style="font-weight:700; color:${bio.sede > 70 ? '#ef4444' : '#06b6d4'};">${Math.round(bio.sede)}%</span>
          </div>
          <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
            <div style="width:${bio.sede}%; height:100%; background:${bio.sede > 70 ? '#ef4444' : '#06b6d4'}; border-radius:3px;"></div>
          </div>
        </div>
      </div>

      <!-- ESTADOS PSICOLÓGICOS FUNCIONAIS -->
      <div style="margin-bottom:12px;">
        <div style="font-size:11px; font-weight:700; color:#7dd3fc; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.8px;">🧠 Psique & Comportamento</div>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
          <span style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px;">
            Medo: ${psi.medo ? psi.medo.valor : 10}% (${psi.medo ? psi.medo.intensidade : 'baixa'})
          </span>
          <span style="background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#86efac; font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px;">
            Confiança: ${psi.confianca ? psi.confianca.valor : 80}%
          </span>
          <span style="background:rgba(168,85,247,0.2); border:1px solid #a855f7; color:#d8b4fe; font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px;">
            Curiosidade: ${psi.curiosidade ? psi.curiosidade.valor : 75}%
          </span>
        </div>
      </div>

      <!-- ATIVIDADE ATUAL -->
      <div style="background:rgba(8,24,39,0.85); border:1px solid #334155; border-radius:10px; padding:8px;">
        <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Atividade Atual</div>
        <div style="font-size:12.5px; font-weight:600; color:#e2e8f0; margin-top:2px;">⚙️ ${hab.atividadeAtual}</div>
      </div>
    `;
  }

  // 3. Modal Comercial da Vendinha Comunitária
  window.abrirVendinhaComunitaria = function () {
    let modal = document.getElementById('rpg-vendinha-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-vendinha-modal';
      modal.style.cssText = `
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 440px;
        max-width: 90vw;
        max-height: 85vh;
        overflow-y: auto;
        background: rgba(9, 21, 37, 0.98);
        backdrop-filter: blur(16px);
        border: 2px solid #f59e0b;
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.9);
        z-index: 110;
        font-family: system-ui, -apple-system, sans-serif;
        color: #e2e8f0;
      `;
      document.body.appendChild(modal);
    }

    modal.style.display = 'block';
    renderizarEstoqueVendinhaSeAberta();
  };

  function renderizarEstoqueVendinhaSeAberta() {
    const modal = document.getElementById('rpg-vendinha-modal');
    if (!modal || modal.style.display === 'none' || !estadoRpgAtual) return;

    const itens = estadoRpgAtual.vendinhaEstoque || [];
    const ambarVendinha = estadoRpgAtual.hud.ambarVendinha;

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:10px; margin-bottom:14px;">
        <div>
          <div style="font-size:18px; font-weight:800; color:#facc15;">🏪 Venda Comunitária da Ilha</div>
          <div style="font-size:12px; color:#94a3b8;">Caixa do Armazém: 🟡 ${ambarVendinha} Âmbar</div>
        </div>
        <button onclick="document.getElementById('rpg-vendinha-modal').style.display='none';" style="background:transparent; border:none; color:#94a3b8; font-size:20px; cursor:pointer;">✕</button>
      </div>

      <div style="font-size:12px; color:#cbd5e1; margin-bottom:12px;">
        Compre equipamentos e mantimentos ou venda recursos para acumular Âmbar:
      </div>

      <div style="display:grid; grid-template-columns: 1fr; gap:8px;">
        ${itens.map(item => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(15,23,42,0.85); border:1px solid #1e3a5f; border-radius:10px; padding:10px 12px;">
            <div>
              <div style="font-weight:700; font-size:13.5px; color:#f8fafc;">${item.nome || item.recurso_id}</div>
              <div style="font-size:11.5px; color:#94a3b8;">Estoque: ${item.quantidade} un | Compra: <span style="color:#facc15; font-weight:700;">${item.preco_compra} Âmbar</span> | Venda: <span style="color:#86efac;">${item.preco_venda} Âmbar</span></div>
            </div>
            <div style="display:flex; gap:6px;">
              <button onclick="window.comprarItemVendinhaRPG('icaro', '${item.recurso_id}')" style="background:linear-gradient(135deg,#0284c7,#2563eb); border:none; color:#fff; font-weight:700; font-size:11.5px; padding:6px 10px; border-radius:8px; cursor:pointer;" ${item.quantidade < 1 ? 'disabled style="opacity:0.5"' : ''}>Comprar</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Ações Comerciais e de Inventário
  window.comprarItemVendinhaRPG = async function (serId, recursoId) {
    try {
      const resp = await fetch('/api/rpg/comercio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serId, acao: 'comprar', recursoId, quantidade: 1 })
      });
      const res = await resp.json();
      if (!res.ok) {
        alert('Erro na compra: ' + res.erro);
      } else {
        await atualizarEstadoRpg();
      }
    } catch (e) {
      alert('Falha na requisição: ' + e.message);
    }
  };

  window.equiparItemRPG = async function (serId, slotIndex) {
    alert(`Item do slot ${slotIndex + 1} empunhado na mão direita de ${serId}!`);
    await atualizarEstadoRpg();
  };

  window.consumirItemRPG = async function (serId, slotIndex) {
    alert(`Item do slot ${slotIndex + 1} consumido com sucesso!`);
    await atualizarEstadoRpg();
  };

  // 4. Modal / Visualizador de Câmeras dos Trajes Móveis (Moto G7 & Realme)
  let trajeAbaAtiva = 'motog7';
  let modalTrajesAberto = false;
  let intervalFrameRefresh = null;

  window.abrirModalTrajesRPG = function () {
    modalTrajesAberto = true;
    renderizarModalTrajes();
    if (!intervalFrameRefresh) {
      intervalFrameRefresh = setInterval(() => {
        if (modalTrajesAberto) atualizarVisualizacaoTraje();
      }, 2000);
    }
  };

  window.fecharModalTrajesRPG = function () {
    modalTrajesAberto = false;
    const modal = document.getElementById('rpg-trajes-modal');
    if (modal) modal.style.display = 'none';
    if (intervalFrameRefresh) {
      clearInterval(intervalFrameRefresh);
      intervalFrameRefresh = null;
    }
  };

  window.selecionarAbaTrajeRPG = function (trajeId) {
    trajeAbaAtiva = trajeId;
    renderizarModalTrajes();
  };

  async function renderizarModalTrajes() {
    let modal = document.getElementById('rpg-trajes-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-trajes-modal';
      modal.style.cssText = `
        position: fixed;
        right: 20px;
        top: 80px;
        width: 380px;
        max-height: calc(100vh - 110px);
        overflow-y: auto;
        background: rgba(8, 20, 36, 0.97);
        backdrop-filter: blur(14px);
        border: 1px solid #0284c7;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 20px 48px rgba(0,0,0,0.85);
        z-index: 100;
        font-family: system-ui, -apple-system, sans-serif;
        color: #e2e8f0;
      `;
      document.body.appendChild(modal);
    }

    modal.style.display = 'block';

    // Puxa telemetria atualizada
    let dadosTelemetria = null;
    try {
      const resp = await fetch('/api/traje/telemetria');
      if (resp.ok) dadosTelemetria = await resp.json();
    } catch (_) {}

    const trajes = (dadosTelemetria && dadosTelemetria.trajes) || [];
    const trajeAtual = trajes.find(t => t.id === trajeAbaAtiva) || trajes[0] || {
      id: 'motog7',
      nome: 'Traje Alpha (Moto G7)',
      habitanteAtual: 'icaro',
      bateria: 100,
      online: false,
      cameraAtiva: false,
      lanternaAtiva: false,
      ultimaAnalisePerceptual: 'Traje em prontidão'
    };

    const ehMoto = trajeAbaAtiva === 'motog7';

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #1e293b; padding-bottom:8px;">
        <div style="font-weight:800; font-size:15px; color:#38bdf8; display:flex; align-items:center; gap:6px;">
          📷 Câmeras dos Trajes Móveis
        </div>
        <button onclick="window.fecharModalTrajesRPG()" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
      </div>

      <!-- Abas dos Trajes -->
      <div style="display:flex; gap:6px; margin-bottom:12px;">
        <button onclick="window.selecionarAbaTrajeRPG('motog7')" style="flex:1; padding:7px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid ${ehMoto ? '#38bdf8' : '#334155'}; background:${ehMoto ? '#0369a1' : '#1e293b'}; color:#fff;">
          🤖 Moto G7 Plus (Ícaro)
        </button>
        <button onclick="window.selecionarAbaTrajeRPG('realme')" style="flex:1; padding:7px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid ${!ehMoto ? '#38bdf8' : '#334155'}; background:${!ehMoto ? '#0369a1' : '#1e293b'}; color:#fff;">
          ⚡ Realme GT 7 (Elara)
        </button>
      </div>

      <!-- Feed / Frame da Câmera -->
      <div style="position:relative; width:100%; height:210px; background:#000; border-radius:10px; overflow:hidden; border:1px solid #334155; margin-bottom:10px; display:flex; align-items:center; justify-content:center;">
        <img id="traje-img-feed" src="/api/traje/frame-recente.jpg?dispositivo=${trajeAbaAtiva}&t=${Date.now()}" onerror="this.style.display='none'; document.getElementById('traje-feed-fallback').style.display='flex';" onload="this.style.display='block'; document.getElementById('traje-feed-fallback').style.display='none';" style="width:100%; height:100%; object-fit:cover;" />
        <div id="traje-feed-fallback" style="display:none; flex-direction:column; align-items:center; gap:8px; color:#64748b; font-size:12px;">
          <span style="font-size:28px;">📷</span>
          <span>Aguardando transmissão do celular...</span>
        </div>

        <div style="position:absolute; top:8px; left:8px; background:rgba(15,23,42,0.85); padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; color:${trajeAtual.online ? '#86efac' : '#fca5a5'};">
          ${trajeAtual.online ? '● AO VIVO' : '○ STANDBY'}
        </div>
        <div style="position:absolute; top:8px; right:8px; background:rgba(15,23,42,0.85); padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; color:#facc15;">
          🔋 ${trajeAtual.bateria}%
        </div>
      </div>

      <!-- Telemetria & Percepção -->
      <div style="background:rgba(15,23,42,0.7); border:1px solid #1e293b; border-radius:8px; padding:10px; margin-bottom:12px; font-size:12px; line-height:1.4;">
        <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">👁️ Visão & Síntese da Vivência:</div>
        <div style="font-style:italic; color:#e2e8f0; margin-bottom:6px;">"${trajeAtual.ultimaAnalisePerceptual || 'Nenhuma análise recente.'}"</div>
        <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:11px;">
          <span>Lente: <strong>${trajeAtual.cameraTipo || 'frontal'}</strong></span>
          <span>Lanterna: <strong style="color:${trajeAtual.lanternaAtiva ? '#facc15' : '#94a3b8'};">${trajeAtual.lanternaAtiva ? 'ACESO' : 'APAGADO'}</strong></span>
        </div>
      </div>

      <!-- Controles Remotos do Traje -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
        <button onclick="window.enviarComandoTrajeRPG('${trajeAbaAtiva}', 'ativar_camera')" style="background:#1e293b; border:1px solid #334155; color:#f1f5f9; padding:8px 4px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">
          📷 Ligar Câmera
        </button>
        <button onclick="window.enviarComandoTrajeRPG('${trajeAbaAtiva}', 'alternar_camera')" style="background:#1e293b; border:1px solid #334155; color:#f1f5f9; padding:8px 4px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">
          🔄 Alternar Lente
        </button>
        <button onclick="window.enviarComandoTrajeRPG('${trajeAbaAtiva}', 'alternar_lanterna')" style="background:#1e293b; border:1px solid #334155; color:#f1f5f9; padding:8px 4px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">
          💡 Lanterna/Tocha
        </button>
        <button onclick="window.enviarComandoTrajeRPG('${trajeAbaAtiva}', 'capturar_frame')" style="background:#0284c7; border:none; color:#fff; padding:8px 4px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">
          📸 Capturar Frame
        </button>
      </div>

      <!-- Link para Abrir no Celular -->
      <div style="text-align:center; padding-top:6px; border-top:1px solid #1e293b;">
        <a href="/traje-camera.html?dispositivo=${trajeAbaAtiva}&ser=${trajeAtual.habitanteAtual}" target="_blank" style="color:#38bdf8; font-size:12px; text-decoration:none; font-weight:700;">
          📲 Abrir Câmera no Navegador deste Aparelho ↗
        </a>
      </div>
    `;
  }

  function atualizarVisualizacaoTraje() {
    const imgEl = document.getElementById('traje-img-feed');
    if (imgEl) {
      imgEl.src = `/api/traje/frame-recente.jpg?dispositivo=${trajeAbaAtiva}&t=${Date.now()}`;
    }
  }

  window.enviarComandoTrajeRPG = async function (dispositivoId, comando) {
    try {
      const resp = await fetch('/api/traje/comando', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dispositivoAlvo: dispositivoId, comando })
      });
      if (resp.ok) {
        if (window.mostrarToast) {
          window.mostrarToast(`Comando "${comando}" enviado ao traje ${dispositivoId}!`);
        }
        setTimeout(renderizarModalTrajes, 500);
      }
    } catch (e) {
      alert('Falha ao enviar comando: ' + e.message);
    }
  };

  // Inicialização e Ciclo Periódico
  window.addEventListener('DOMContentLoaded', () => {
    atualizarEstadoRpg();
    setInterval(atualizarEstadoRpg, 2500);
  });

})(window);

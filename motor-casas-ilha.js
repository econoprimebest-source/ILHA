/**
 * MOTOR DE CASAS — crescimento visual das moradias (Pixi, 2.5D)
 * ---------------------------------------------------------------------------
 * As casas pintadas no mapa são o Nível 1. Cada ampliação ACRESCENTA
 * construção ao redor da casa pintada, como em Stardew/Animal Crossing:
 *   Nv2 Cabana de Toras ......... anexo lateral de toras + depósito de lenha
 *   Nv3 Casa de Pedra ........... base de pedra, chaminé com fumaça, cerca
 *   Nv4 Sobrado com Varanda ..... segundo andar no anexo, varanda e lampião
 *   Nv5 Casarão da Vila ......... torre de vigia com bandeira e jardim
 * Na frente da casa ficam as PILHAS DO BAÚ (toras e pedras) que crescem com o
 * estoque real, e durante uma obra aparecem andaimes + barra de progresso.
 * Coordenadas em pixels da arte do mapa (1376x768).
 */
(function () {
  'use strict';
  const W_MAPA = 1376, H_MAPA = 768;

  // Contorno das casas pintadas no mapa (pixels da imagem).
  const ANCORAS = {
    casa_icaro: { cx: 341, base: 393, left: 257, right: 425, top: 262 },
    casa_joao:  { cx: 521, base: 212, left: 472, right: 570, top: 112 },
    casa_maria: { cx: 1110, base: 380, left: 1030, right: 1175, top: 250 },
    // Sem casa pintada: nasce como cabana própria no ponto da trilha.
    casa_lara:  { cx: 330, base: 318, left: 306, right: 354, top: 280, semPintura: true }
  };

  const COR = {
    contorno: 0x2b1708, tora: 0x8a5a2b, toraEsc: 0x5e3b1a, toraClara: 0xa8743d,
    palha: 0xe2b84a, palhaEsc: 0xb48a2c, telha: 0x8b3a1e, telhaEsc: 0x5f2512,
    pedra: 0x9ca3af, pedraEsc: 0x6b7280, pedraClara: 0xd1d5db,
    janela: 0xfde68a, porta: 0x3b200c, folha: 0x4d7c0f, flor: [0xf472b6, 0xfacc15, 0xf8fafc, 0xa78bfa]
  };

  // ---------- primitivas 2.5D ----------
  function caixa(g, x, yBase, w, h, d, corF, corL) {
    const dx = d * 0.62, dy = -d * 0.42;
    g.lineStyle(1.6, COR.contorno, 1);
    g.beginFill(corL); // lateral
    g.drawPolygon([x + w, yBase, x + w + dx, yBase + dy, x + w + dx, yBase + dy - h, x + w, yBase - h]);
    g.endFill();
    g.beginFill(corF); // frente
    g.drawRect(x, yBase - h, w, h);
    g.endFill();
    return { dx, dy };
  }
  function toras(g, x, yBase, w, h, passo) {
    g.lineStyle(1, COR.toraEsc, 0.85);
    for (let y = yBase - passo; y > yBase - h + 1; y -= passo) { g.moveTo(x + 1, y); g.lineTo(x + w - 1, y); }
  }
  function telhadoDuasAguas(g, x, yTopo, w, d, alt, cor, corEsc) {
    const dx = d * 0.62, dy = -d * 0.42, meio = x + w / 2, cume = yTopo - alt;
    g.lineStyle(1.6, COR.contorno, 1);
    g.beginFill(corEsc); // água lateral
    g.drawPolygon([meio, cume, meio + dx, cume + dy, x + w + dx + 3, yTopo + dy + 2, x + w + 3, yTopo + 2]);
    g.endFill();
    g.beginFill(cor); // empena frontal
    g.drawPolygon([x - 3, yTopo + 2, meio, cume, x + w + 3, yTopo + 2]);
    g.endFill();
    g.lineStyle(1, corEsc, 0.7);
    for (let i = 1; i < 4; i++) { const t = i / 4; g.moveTo(meio + dx * t, cume + dy * t); g.lineTo(x + w + 3 + dx * t, yTopo + 2 + dy * t); }
  }
  function janela(g, x, y, w, h, acesa) {
    g.lineStyle(1.4, COR.contorno, 1);
    g.beginFill(acesa ? COR.janela : 0x334155); g.drawRect(x, y, w, h); g.endFill();
    g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2);
  }
  function pilhaToras(g, x, y, n) {
    for (let i = 0; i < n; i++) {
      const fila = Math.floor(i / 4), col = i % 4;
      const px = x + col * 7 + fila * 3.5, py = y - fila * 5.5;
      g.lineStyle(1, COR.contorno, 1);
      g.beginFill(COR.tora); g.drawRoundedRect(px - 3, py - 3, 10, 6, 2.5); g.endFill();
      g.beginFill(COR.toraClara); g.drawCircle(px - 3, py, 2.8); g.endFill();
    }
  }
  function pilhaPedras(g, x, y, n) {
    for (let i = 0; i < n; i++) {
      const fila = Math.floor(i / 4), col = i % 4;
      const px = x + col * 6.5 + fila * 3, py = y - fila * 4.5;
      g.lineStyle(1, COR.contorno, 1);
      g.beginFill(i % 2 ? COR.pedra : COR.pedraEsc); g.drawEllipse(px, py, 4, 3); g.endFill();
    }
  }
  function bau(g, x, y) {
    g.lineStyle(1.3, COR.contorno, 1);
    g.beginFill(0x7c4a1e); g.drawRect(x - 7, y - 9, 14, 9); g.endFill();
    g.beginFill(0x92582a); g.drawRoundedRect(x - 7.5, y - 13, 15, 5, 2); g.endFill();
    g.beginFill(0xfacc15); g.drawRect(x - 1.2, y - 9, 2.4, 3); g.endFill();
  }

  // ---------- partes por nível ----------
  function anexo(g, a, nivel, noite) {
    // Nv2+: quarto anexo de toras encostado à direita da casa pintada.
    const w = 44, d = 26, x = a.right - 8, yb = a.base - 4;
    const h1 = 30;
    if (nivel >= 3) { // base de pedra
      g.lineStyle(1.4, COR.contorno, 1); g.beginFill(COR.pedraEsc);
      g.drawPolygon([x - 2, yb + 4, x + w + 2, yb + 4, x + w + 2 + d * 0.62, yb + 4 - d * 0.42, x + w + d * 0.62, yb - 6, x - 2, yb - 6]); g.endFill();
      g.lineStyle(1, COR.pedraClara, 0.8);
      for (let i = 0; i < 6; i++) g.drawEllipse(x + 4 + i * 7.5, yb - 1, 3, 2);
    }
    const yBaseParede = nivel >= 3 ? yb - 6 : yb;
    caixa(g, x, yBaseParede, w, h1, d, COR.tora, COR.toraEsc);
    toras(g, x, yBaseParede, w, h1, 5);
    janela(g, x + 8, yBaseParede - 22, 10, 9, noite);
    g.lineStyle(1.4, COR.contorno, 1); g.beginFill(COR.porta); g.drawRect(x + 27, yBaseParede - 18, 10, 18); g.endFill();
    let topo = yBaseParede - h1;
    if (nivel >= 4) { // segundo andar
      caixa(g, x + 2, topo, w - 4, 24, d - 2, COR.toraClara, COR.tora);
      toras(g, x + 2, topo, w - 4, 24, 6);
      janela(g, x + 8, topo - 18, 9, 9, noite); janela(g, x + 25, topo - 18, 9, 9, noite);
      topo -= 24;
    }
    const tel = nivel >= 3 ? [COR.telha, COR.telhaEsc] : [COR.palha, COR.palhaEsc];
    telhadoDuasAguas(g, x + (nivel >= 4 ? 2 : 0), topo, w - (nivel >= 4 ? 4 : 0), d, 18, tel[0], tel[1]);
    return { x, w, d, topo, yBaseParede };
  }
  function chamine(g, ax, topo) {
    g.lineStyle(1.4, COR.contorno, 1); g.beginFill(COR.pedra);
    g.drawRect(ax, topo - 26, 9, 22); g.endFill();
    g.lineStyle(1, COR.pedraEsc, 0.9);
    for (let y = topo - 22; y < topo - 4; y += 5) { g.moveTo(ax, y); g.lineTo(ax + 9, y); }
    return { x: ax + 4.5, y: topo - 28 };
  }
  function deposito(g, a) {
    // Nv2+: telheiro de lenha encostado à esquerda.
    const x = a.left - 34, yb = a.base - 2, w = 30, h = 20;
    g.lineStyle(1.4, COR.contorno, 1);
    g.beginFill(COR.toraEsc); g.drawRect(x, yb - h, 3, h); g.drawRect(x + w - 3, yb - h - 4, 3, h + 4); g.endFill();
    pilhaToras(g, x + 4, yb - 3, 8);
    g.beginFill(COR.palhaEsc); g.drawPolygon([x - 4, yb - h + 2, x + w + 4, yb - h - 8, x + w + 6, yb - h - 3, x - 2, yb - h + 7]); g.endFill();
  }
  function cerca(g, a) {
    g.lineStyle(1.3, COR.contorno, 1);
    const y0 = a.base + 18, x0 = a.left - 40, x1 = a.right + 60;
    for (let x = x0; x <= x1; x += 12) { g.beginFill(COR.toraClara); g.drawRect(x, y0 - 11, 3.5, 12); g.endFill(); }
    g.lineStyle(2.2, COR.tora, 1); g.moveTo(x0, y0 - 8); g.lineTo(x1 + 3, y0 - 8); g.moveTo(x0, y0 - 3); g.lineTo(x1 + 3, y0 - 3);
  }
  function varanda(g, an, noite) {
    const x = an.x - 2, y = an.yBaseParede + 9, w = an.w + 8;
    g.lineStyle(1.3, COR.contorno, 1);
    g.beginFill(COR.toraClara); g.drawPolygon([x, y, x + w, y, x + w + 6, y - 6, x + 6, y - 6]); g.endFill();
    for (const px of [x + 2, x + w - 4]) { g.beginFill(COR.toraEsc); g.drawRect(px, y - 30, 3, 26); g.endFill(); }
    g.beginFill(COR.tora); g.drawRect(x, y - 33, w + 2, 4); g.endFill();
    g.beginFill(noite ? 0xfbbf24 : 0xfde68a); g.drawCircle(x + w - 2, y - 24, 3); g.endFill(); // lampião
  }
  function torre(g, a) {
    const x = a.left - 66, yb = a.base + 2, h = 74;
    g.lineStyle(1.4, COR.contorno, 1);
    g.beginFill(COR.toraEsc);
    g.drawPolygon([x, yb, x + 4, yb, x + 9, yb - h, x + 6, yb - h]);
    g.drawPolygon([x + 22, yb, x + 26, yb, x + 20, yb - h, x + 17, yb - h]);
    g.endFill();
    g.lineStyle(1.2, COR.tora, 1);
    for (let y = yb - 12; y > yb - h + 10; y -= 16) { g.moveTo(x + 3, y); g.lineTo(x + 22, y - 10); g.moveTo(x + 22, y); g.lineTo(x + 4, y - 10); }
    g.lineStyle(1.4, COR.contorno, 1);
    g.beginFill(COR.toraClara); g.drawRect(x + 2, yb - h - 4, 24, 6); g.endFill();
    g.beginFill(COR.telha); g.drawPolygon([x - 1, yb - h - 4, x + 14, yb - h - 22, x + 29, yb - h - 4]); g.endFill();
    g.lineStyle(1.4, COR.contorno, 1); g.moveTo(x + 14, yb - h - 22); g.lineTo(x + 14, yb - h - 40);
    return { x: x + 14, y: yb - h - 40 };
  }
  function jardim(g, a) {
    const y = a.base + 8;
    for (let i = 0; i < 12; i++) {
      const px = a.cx - 40 + i * 8 + (i % 2) * 3, py = y + (i % 3) * 3;
      g.lineStyle(0); g.beginFill(COR.folha); g.drawEllipse(px, py, 4, 2.5); g.endFill();
      g.beginFill(COR.flor[i % COR.flor.length]); g.drawCircle(px, py - 2, 1.8); g.endFill();
    }
  }
  function cabanaPropria(g, a, nivel, noite) {
    // Casa sem pintura no mapa (ex.: casa_lara) — desenha o corpo principal.
    const w = a.right - a.left, x = a.left, h = 26 + (nivel >= 3 ? 4 : 0);
    caixa(g, x, a.base, w, h, 22, nivel >= 3 ? COR.pedra : COR.tora, nivel >= 3 ? COR.pedraEsc : COR.toraEsc);
    if (nivel < 3) toras(g, x, a.base, w, h, 5);
    janela(g, x + 6, a.base - h + 6, 9, 8, noite);
    g.lineStyle(1.4, COR.contorno, 1); g.beginFill(COR.porta); g.drawRect(x + w - 16, a.base - 16, 9, 16); g.endFill();
    telhadoDuasAguas(g, x, a.base - h, w, 22, 16, nivel >= 3 ? COR.telha : COR.palha, nivel >= 3 ? COR.telhaEsc : COR.palhaEsc);
  }
  function andaime(g, a, nivelAlvo, progresso) {
    const x = a.right - 8, yb = a.base - 4, w = 48, h = 26 + nivelAlvo * 6;
    const fracH = h * Math.max(0.15, progresso / 100);
    // paredes subindo conforme o progresso
    g.lineStyle(1.3, COR.contorno, 1); g.beginFill(COR.toraClara, 0.95); g.drawRect(x, yb - fracH, w - 6, fracH); g.endFill();
    toras(g, x, yb, w - 6, fracH, 5);
    g.lineStyle(2, 0xcaa472, 1);
    for (const px of [x - 3, x + w / 2 - 3, x + w - 4]) { g.moveTo(px, yb + 2); g.lineTo(px, yb - h - 8); }
    for (let y = yb - 10; y > yb - h - 6; y -= 12) { g.moveTo(x - 5, y); g.lineTo(x + w - 2, y); }
    g.lineStyle(1.2, 0xcaa472, 0.9); g.moveTo(x - 3, yb); g.lineTo(x + w / 2 - 3, yb - h); g.moveTo(x + w / 2 - 3, yb); g.lineTo(x + w - 4, yb - h);
  }

  function rotulo(texto, cor) {
    const t = new PIXI.Text(texto, { fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: 10, fontWeight: '800', fill: cor || 0xfef3c7, stroke: 0x1c1007, strokeThickness: 3 });
    t.anchor.set(0.5, 1);
    return t;
  }

  // ---------- cache por casa ----------
  const cache = {};
  function assinatura(c, noite) {
    const b = c.bau || {};
    return [c.nivel, Math.ceil((b.madeira || 0) / 3), Math.ceil((b.pedra || 0) / 3), c.obra ? Math.round(c.obra.progresso / 5) : -1, noite ? 1 : 0].join('|');
  }
  function construir(id, c, a, noite) {
    const cont = new PIXI.Container();
    const g = new PIXI.Graphics();
    cont.addChild(g);
    const n = c.nivel || 1;
    const pontos = {};
    if (a.semPintura) cabanaPropria(g, a, n, noite);
    if (n >= 5) pontos.bandeira = torre(g, a);
    if (n >= 2) deposito(g, a);
    if (n >= 2 && !a.semPintura) {
      const an = anexo(g, a, n, noite);
      if (n >= 3) pontos.fumaca = chamine(g, an.x + an.w - 14, an.topo - 4);
      if (n >= 4) varanda(g, an, noite);
    } else if (n >= 3 && a.semPintura) {
      pontos.fumaca = chamine(g, a.right - 14, a.base - 34);
    }
    if (n >= 3) cerca(g, a);
    if (n >= 5) jardim(g, a);
    if (c.obra) andaime(g, n >= 2 && !a.semPintura ? { ...a, right: a.right + 52 } : a, c.obra.paraNivel, c.obra.progresso || 0);
    // estoque físico do baú na frente da casa
    const b = c.bau || {};
    const nt = Math.min(12, Math.ceil((b.madeira || 0) / 3)), np = Math.min(12, Math.ceil((b.pedra || 0) / 3));
    const yFrente = a.base + 10;
    if (nt) pilhaToras(g, a.left + 6, yFrente, nt);
    if (np) pilhaPedras(g, a.left + 44, yFrente + 1, np);
    bau(g, a.left + 78, yFrente + 2);
    // selo de nível
    const nomes = ['', 'Cabana de Palha', 'Cabana de Toras', 'Casa de Pedra', 'Sobrado', 'Casarão'];
    const selo = rotulo('★'.repeat(n) + '  Nv ' + n + ' · ' + nomes[n], n >= 4 ? 0xfde047 : 0xfef3c7);
    selo.x = a.cx + (n >= 2 && !a.semPintura ? 20 : 0); selo.y = Math.min(a.top, a.base - 60) - (n >= 4 ? 30 : 8);
    cont.addChild(selo);
    if (c.obra) {
      const barra = new PIXI.Graphics();
      const bx = a.right + 12, by = a.top - 4;
      barra.lineStyle(1, 0x000000, 0.8); barra.beginFill(0x0f172a, 0.9); barra.drawRoundedRect(bx - 26, by - 5, 52, 8, 3); barra.endFill();
      barra.lineStyle(0); barra.beginFill(0xf59e0b); barra.drawRoundedRect(bx - 25, by - 4, Math.max(2, 50 * (c.obra.progresso || 0) / 100), 6, 2); barra.endFill();
      cont.addChild(barra);
      const t = rotulo('🔨 obra ' + Math.round(c.obra.progresso || 0) + '%', 0xfbbf24); t.x = bx; t.y = by - 6; cont.addChild(t);
    }
    const anim = new PIXI.Graphics(); anim.name = 'anim'; cont.addChild(anim);
    return { cont, anim, pontos };
  }

  function animar(item, tempo) {
    const g = item.anim; g.clear();
    const f = item.pontos.fumaca;
    if (f) {
      for (let i = 0; i < 4; i++) {
        const t = ((tempo * 0.0004) + i / 4) % 1;
        g.lineStyle(0); g.beginFill(0xe5e7eb, 0.55 * (1 - t));
        g.drawCircle(f.x + Math.sin(t * 6 + i) * 4 + t * 10, f.y - t * 30, 3 + t * 6); g.endFill();
      }
    }
    const b = item.pontos.bandeira;
    if (b) {
      const o = Math.sin(tempo * 0.006) * 2;
      g.lineStyle(1, 0x2b1708, 1); g.beginFill(0xdc2626);
      g.drawPolygon([b.x, b.y, b.x + 16, b.y + 3 + o, b.x + 14, b.y + 7 + o * 0.5, b.x, b.y + 10]); g.endFill();
    }
  }

  const MotorCasasIlha = {
    ANCORAS,
    /**
     * Desenha as ampliações de todas as casas.
     * @param container  PIXI.Container (estruturas)
     * @param estado     snapshot do mundo
     * @param toScreen   (fx,fy)->{x,y} (frações da arte do mapa)
     * @param escala     pixels de tela por pixel da arte
     */
    desenhar(container, estado, toScreen, escala, tempo) {
      const casas = estado && estado.mundo && estado.mundo.casas;
      if (!casas) return;
      const p = (estado.mundo.tempo && estado.mundo.tempo.periodo) || '';
      const noite = p === 'noite' || p === 'madrugada';
      for (const [id, c] of Object.entries(casas)) {
        const a = ANCORAS[id];
        if (!a || !c) continue;
        if (a.semPintura && (c.nivel || 1) < 2 && !c.obra) continue; // casa sem morador ativo
        const sig = assinatura(c, noite);
        let item = cache[id];
        if (!item || item.sig !== sig) {
          if (item) item.cont.destroy({ children: true });
          item = construir(id, c, a, noite); item.sig = sig; cache[id] = item;
        }
        const o = toScreen(0, 0);
        item.cont.x = o.x; item.cont.y = o.y;
        item.cont.scale.set(escala);
        animar(item, tempo);
        container.addChild(item.cont);
      }
    }
  };
  window.MotorCasasIlha = MotorCasasIlha;
})();

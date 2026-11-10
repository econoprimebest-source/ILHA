# INVENTARIO DO VISUALIZADOR DA ILHA

Gerado em: 2026-10-01T22:49:35.485Z

## REGRAS PARA A FRENTE DO CORTEX
- Melhorar APENAS desenho, CSS e layout (canvas, cores, formas, posicoes, paineis).
- NAO alterar contratos de dados (o que o visualizador le do estado/log).
- NAO renomear funcoes nem ids sem atualizar todos os usos no mesmo arquivo.
- NAO tocar em: ecossistema.js, motor-v2.js, decisor.js, percepcao-v2.js, persistencia-v2.js, rodar-ilha.js, estado-ilha.json, log.
- Fazer backup antes: visualizador-ilha.html.backup-layout-<timestamp>.
- Dado que nao existir no estado/log: nao inventar; listar e perguntar.

## CONTRATOS DE DADOS (NAO QUEBRAR)
207: const res = await fetch('/api/snapshot');
208: const data = await res.json();

## FUNCOES (manter assinaturas)
106: resize
114: noise
119: smoothNoise
152: generateIsland
205: fetchState
219: updateUI
261: getBarHTML
283: getCycleTimeLabel
298: drawScene
422: screenFromLocal
427: getScreenPosition
440: drawHouse
450: drawHut
473: drawCharacter

## IDS DE DOM/CANVAS
#game
#tooltip
#cycle-info
#time-display
#list-seres
#list-eventos

## LINHAS DE DESENHO (PODE MELHORAR A VONTADE)
Total: 59
298: function drawScene() {
299: if(!islandMap.length) return requestAnimationFrame(drawScene);
308: ctx.fillStyle = isNight ? '#020617' : (isEvening ? '#0c4a6e' : '#0ea5e9');
309: ctx.fillRect(0, 0, w, h);
312: ctx.strokeStyle = isNight ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.1)';
319: ctx.stroke();
332: ctx.fillStyle = isNight ? '#0f172a' : PALETTE.deepWater;
335: ctx.fillStyle = isNight ? '#1e293b' : PALETTE.shallowWater;
338: ctx.fillStyle = isNight ? '#78716c' : PALETTE.sand;
341: ctx.fillStyle = isNight ? '#14532d' : PALETTE.grassLight;
344: ctx.fillStyle = isNight ? '#052e16' : PALETTE.forestFloor;
347: ctx.fillRect(px, py, tileSize, tileSize);
351: ctx.fillStyle = 'rgba(255,255,255,0.1)';
352: ctx.fillRect(px, py, tileSize, tileSize);
371: ctx.fillStyle = 'rgba(0,0,0,0.2)';
374: ctx.fillStyle = isNight ? '#451a03' : PALETTE.treeTrunk;
375: ctx.fillRect(ox + tileSize/2 - 2, oy, 4, tileSize);
377: ctx.fillStyle = isNight ? '#064e3b' : PALETTE.treeCanopy;
378: ctx.beginPath(); ctx.arc(ox + tileSize/2, oy - tileSize/2, tileSize * obj.size, 
380: ctx.fillStyle = 'rgba(255,255,255,0.1)';
381: ctx.beginPath(); ctx.arc(ox + tileSize/2 - 2, oy - tileSize/2 - 2, tileSize * ob
384: ctx.fillStyle = isNight ? '#334155' : PALETTE.rock;
385: ctx.beginPath(); ctx.arc(ox + tileSize/2, oy + tileSize/2, tileSize * obj.size *
386: ctx.fillStyle = 'rgba(255,255,255,0.2)';
387: ctx.beginPath(); ctx.arc(ox + tileSize/2 - 1, oy + tileSize/2 - 1, tileSize * ob
390: ctx.fillStyle = isNight ? '#14532d' : '#22c55e';
391: ctx.beginPath(); ctx.arc(ox + tileSize/2, oy + tileSize/2, tileSize * obj.size *
398: drawHut(ctx, campPos.x, campPos.y, isNight);
399: const _ci=screenFromLocal('casa_icaro',w,h);drawHouse(ctx,_ci.x,_ci.y,'#fbbf24',
400: const _cm=screenFromLocal('casa_maria',w,h);drawHouse(ctx,_cm.x,_cm.y,'#f472b6',
401: const _cj=screenFromLocal('casa_joao',w,h);drawHouse(ctx,_cj.x,_cj.y,'#2dd4bf',i
415: drawCharacter(ctx, pos.x, pos.y, s, isNight);
419: requestAnimationFrame(drawScene);
440: function drawHouse(ctx, x, y, color, isNight) {
441: ctx.fillStyle='rgba(0,0,0,0.25)';
443: ctx.fillStyle=isNight?'#3f3f46':'#e7e5e4';
444: ctx.fillRect(x-10,y-6,20,14);
445: ctx.fillStyle=color;
447: ctx.fillStyle='#1c1917';
448: ctx.fillRect(x-3,y+1,6,7);
450: function drawHut(ctx, x, y, isNight) {
455: ctx.fillStyle = 'rgba(0,0,0,0.3)';
459: ctx.fillStyle = wallColor;
460: ctx.fillRect(x - 12, y - 8, 24, 16);
462: ctx.fillStyle = roofColor;
469: ctx.fillStyle = '#000';
470: ctx.fillRect(x - 4, y + 2, 8, 6);
473: function drawCharacter(ctx, x, y, ser, isNight) {
483: ctx.fillStyle = color;
485: ctx.arc(x, y, 6, 0, Math.PI*2);
489: ctx.strokeStyle = isNight ? '#fff' : '#000';
491: ctx.stroke();
496: ctx.fillStyle = '#fff';
499: ctx.fillText(ser.nome, x, y - 12);
503: ctx.fillStyle = '#cbd5e1';
504: ctx.fillText(ser.acao || '', x, y + 14);
508: ctx.strokeStyle = '#fff';
511: ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI*2); ctx.stroke();
527: drawScene();

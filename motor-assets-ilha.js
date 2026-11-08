/**
 * motor-assets-ilha.js — Camada de assets isométricos para a Ilha Aurora
 *
 * Responsabilidade única: transformar o manifesto declarativo
 * (assets/isometric/manifest.json) em Containers prontos para o mapa.
 *
 * FILOSOFIA
 *  - O motor NÃO conhece nomes de arquivo. Só conhece prefabs e locais.
 *  - Toda falha é VISÍVEL (retângulo magenta rotulado). Nunca falha silenciosa.
 *  - Toda composição é DADO (dx/dy/ancora no JSON), não código.
 *  - Este arquivo é INERTE: não roda nada ao carregar, só expõe APIs globais.
 *
 * API PÚBLICA
 *  window.ArteIlha.carregar()                 -> Promise<manifesto>
 *  window.ArteIlha.construirPrefab(nome)      -> PIXI.Container
 *  window.ArteIlha.criarNoLocal(motor, id, nx, ny) -> PIXI.Container|null
 *  window.ArteIlha.sincronizarEscala(motor)   -> void   (chamar no resize)
 *  window.ArteIlha.definirCasaAberta(container, aberta) -> void (corte de telhado)
 *  window.ArteIlha.diagnostico()              -> object
 *  window.ArteIlha.instalarNoPixiDeTeste(stage) -> Promise<void>  (modo bancada)
 *
 * Requer PixiJS 7.x (testado contra o bundle local v7.4.2).
 */
(function () {
  'use strict';

  if (typeof PIXI === 'undefined') {
    console.error('[ArteIlha] PIXI ausente. Carregue /pixi.min.js antes deste arquivo.');
    return;
  }

  // Mantenha em sincronia com "versao" em manifest.json.
  // Bump este número sempre que editar o manifest: /assets/ é servido com
  // cache-control: max-age=86400 (visualizador-ilha.js, rota /assets/).
  const MANIFEST_V = 3;
  const MANIFEST_URL = '/assets/isometric/manifest.json';

  // Pixi 7: API correta de filtro (PIXI.settings.SCALE_MODE está deprecada).
  PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.LINEAR;

  const estado = {
    manifesto: null,
    texturas: Object.create(null),
    falhas: [],
    aliasesRegistrados: new Set(),
    carregando: null
  };

  // ---------------------------------------------------------------------------
  // Fallback visível
  // ---------------------------------------------------------------------------

  /**
   * Textura magenta rotulada. Serve para que um asset ausente apareça como
   * BUG ÓBVIO, não como "o jogo é assim mesmo".
   */
  function texturaFalha(rotulo) {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 62, 62);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FALTA', 32, 26);
    ctx.font = '9px monospace';
    ctx.fillText(String(rotulo).slice(0, 10), 32, 42);

    return PIXI.Texture.from(cv);
  }

  // ---------------------------------------------------------------------------
  // Manifesto
  // ---------------------------------------------------------------------------

  function urlDaPeca(catalogoId, pecaId) {
    const cat = estado.manifesto.catalogo[catalogoId];
    if (!cat) throw new Error('[ArteIlha] catálogo inexistente: ' + catalogoId);
    const arquivo = cat.arquivos[pecaId];
    if (!arquivo) {
      throw new Error('[ArteIlha] peça inexistente: ' + catalogoId + '/' + pecaId);
    }
    return cat.base + arquivo;
  }

  function coletarAliases() {
    const pedidos = new Map(); // alias -> src

    Object.entries(estado.manifesto.prefabs).forEach(function (par) {
      const nome = par[0];
      const prefab = par[1];
      const catId = prefab.catalogo || 'medieval';

      (prefab.pecas || []).forEach(function (peca) {
        const alias = catId + '_' + peca.id;
        try {
          if (!pedidos.has(alias)) {
            pedidos.set(alias, urlDaPeca(catId, peca.id));
          }
        } catch (erro) {
          console.error('[ArteIlha] prefab "' + nome + '":', erro.message);
          estado.falhas.push(alias);
        }
      });
    });

    return pedidos;
  }

  async function carregar() {
    if (estado.carregando) return estado.carregando;

    estado.carregando = (async function () {
      const url = MANIFEST_URL + '?v=' + MANIFEST_V;
      const resposta = await fetch(url, { cache: 'no-cache' });

      if (!resposta.ok) {
        throw new Error('[ArteIlha] manifest indisponível: HTTP ' + resposta.status + ' em ' + url);
      }

      estado.manifesto = await resposta.json();

      if (estado.manifesto.versao !== MANIFEST_V) {
        console.warn(
          '[ArteIlha] divergência de versão: manifest=' + estado.manifesto.versao +
          ' MANIFEST_V=' + MANIFEST_V + '. Bump MANIFEST_V para furar o cache.'
        );
      }

      const pedidos = coletarAliases();
      const aliases = Array.from(pedidos.keys());

      aliases.forEach(function (alias) {
        if (!estado.aliasesRegistrados.has(alias)) {
          PIXI.Assets.add({ alias: alias, src: pedidos.get(alias) });
          estado.aliasesRegistrados.add(alias);
        }
      });

      const resultados = await Promise.allSettled(
        aliases.map(function (alias) { return PIXI.Assets.load(alias); })
      );

      resultados.forEach(function (resultado, i) {
        const alias = aliases[i];
        if (resultado.status === 'fulfilled') {
          estado.texturas[alias] = resultado.value;
        } else {
          estado.falhas.push(alias);
          estado.texturas[alias] = texturaFalha(alias);
          console.error('[ArteIlha] falha ao carregar ' + alias + ':', resultado.reason);
        }
        // PEÇA É DADO, NÃO TILEMAP: nada aqui gera terreno procedural.
      });

      // Telhados Terracota: recoloriza cada peça usada como "telhado" em
      // QUALQUER prefab (a mesma peça pode ser corpo num prefab e telhado em
      // outro — por isso a chave é catálogo|id e o resultado vai para "@telhado").
      const usadosComoTelhado = new Set();
      Object.keys(estado.manifesto.prefabs).forEach(function (nome) {
        const pref = estado.manifesto.prefabs[nome];
        (pref.pecas || []).forEach(function (peca) {
          if (peca.camada === 'telhado') usadosComoTelhado.add((pref.catalogo || 'medieval') + '|' + peca.id);
        });
      });
      const hexTelhado = corTelhado();
      await Promise.all(Array.from(usadosComoTelhado).map(async function (chave) {
        const partes = chave.split('|');
        const catId = partes[0], pecaId = partes[1];
        const alias = catId + '_' + pecaId;
        try {
          estado.texturas[alias + '@telhado'] = await recolorarTelhado(urlDaPeca(catId, pecaId), hexTelhado);
        } catch (erro) {
          if (estado.falhas.indexOf(alias + '@telhado') === -1) estado.falhas.push(alias + '@telhado');
          console.error('[ArteIlha] recolor de telhado falhou (' + alias + ', usando tint):', erro.message);
        }
      }));

      console.log(
        '[ArteIlha] manifest v' + estado.manifesto.versao +
        ' | texturas ' + (aliases.length - estado.falhas.length) + '/' + aliases.length +
        ' | falhas ' + estado.falhas.length
      );

      return estado.manifesto;
    })();

    try {
      return await estado.carregando;
    } finally {
      estado.carregando = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Prefabs
  // ---------------------------------------------------------------------------

  function texturaDe(catId, pecaId, camada) {
    const alias = catId + '_' + pecaId;
    if (camada === 'telhado' && estado.texturas[alias + '@telhado']) {
      return estado.texturas[alias + '@telhado'];
    }
    if (!estado.texturas[alias]) {
      estado.texturas[alias] = texturaFalha(alias);
      if (estado.falhas.indexOf(alias) === -1) estado.falhas.push(alias);
    }
    return estado.texturas[alias];
  }

  function corTelhado() {
    const p = estado.manifesto.paleta && estado.manifesto.paleta.telhado;
    return (p && p[0]) || '#B5563A';
  }

  /**
   * Recolor de telhado. `sprite.tint` MULTIPLICA os canais: na arte escura do
   * Kenney isso vira vinho-escuro, não terracota. O blend 'color' do canvas
   * faz o contrario — pega matiz+saturação do alvo e mantém a luminância
   * original (sombreamento, telhas, contorno), que é o que o olho lê como
   * "o mesmo desenho, pintado de terracota".
   * Falhou? Devolve null e quem chama cai no tint (fallback visível).
   */
  function recolorarTelhado(url, hex) {
    return new Promise(function (res, rej) {
      const img = new Image();
      img.onload = function () {
        try {
          const cv = document.createElement('canvas');
          cv.width = img.naturalWidth || img.width;
          cv.height = img.naturalHeight || img.height;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // 1) matiz/saturação do alvo, luminância da arte.
          ctx.globalCompositeOperation = 'color';
          ctx.fillStyle = hex;
          ctx.fillRect(0, 0, cv.width, cv.height);

          // 2) O fill é OPACO em todo o canvas e destrói a silhueta (fica um
          //    retângulo sólido). destination-in recorta de volta pela máscara
          //    de alfa ORIGINAL da peça.
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(img, 0, 0);

          ctx.globalCompositeOperation = 'source-over';
          res(PIXI.Texture.from(cv));
        } catch (erro) { rej(erro); }
      };
      img.onerror = function () { rej(new Error('imagem não carregou: ' + url)); };
      img.src = url;
    });
  }

  function desenharSombra(def) {
    const s = def.sombra;
    if (!s || estado.manifesto.qualidade.sombraDeContato === false) return null;

    const g = new PIXI.Graphics();
    g.beginFill(0x0b1a12, s.alpha != null ? s.alpha : 0.28);
    g.drawEllipse(0, 0, s.rx, s.ry);
    g.endFill();
    g.label = 'sombra';
    return g;
  }

  /**
   * Monta o prefab em unidades de CANVAS (0..64). A escala fica no container,
   * aplicada por quem posiciona no mundo. Isso torna a calibração barata:
   * mudar dx/dy/ancora no JSON reposiciona tudo sem tocar em código.
   */
  function construirPrefab(nomePrefab) {
    if (!estado.manifesto) {
      throw new Error('[ArteIlha] chamar carregar() antes de construirPrefab().');
    }

    const def = estado.manifesto.prefabs[nomePrefab];
    if (!def) throw new Error('[ArteIlha] prefab inexistente: ' + nomePrefab);

    const catId = def.catalogo || 'medieval';
    const cont = new PIXI.Container();
    cont.label = nomePrefab;

    const sombra = desenharSombra(def);
    if (sombra) cont.addChild(sombra);

    // Telhado Terracota (#B5563A) — decisão de paleta do manifesto.
    // O caminho principal é a textura RECOLORIDA (blend 'color', feito em
    // carregar()); o tint aqui é só o fallback se o recolor falhar.
    const telhadoHex = corTelhado();
    const telhadoCor = parseInt(String(telhadoHex).replace('#', ''), 16);

    (def.pecas || []).forEach(function (peca) {
      const alias = catId + '_' + peca.id;
      const ehTelhado = peca.camada === 'telhado';
      const sprite = new PIXI.Sprite(texturaDe(catId, peca.id, peca.camada));
      sprite.anchor.set(0, 0);
      // Canvases 64x64 do Kenney são pre-alinhados: (0,0) é o padrão correto.
      // dx/dy existem para o Gate 0 corrigir o que o olho humano apontar.
      sprite.position.set(peca.dx || 0, peca.dy || 0);
      sprite.label = ehTelhado ? 'telhado' : 'corpo';
      if (ehTelhado && !estado.texturas[alias + '@telhado']) sprite.tint = telhadoCor;
      cont.addChild(sprite);
    });

    // Âncora em unidades de canvas (0..64): [32, 64] = base-centro do canvas.
    // Se o kit ancorar no centro, basta trocar y para 32 no JSON.
    const ancora = def.ancora || { x: 32, y: 64 };
    cont.pivot.set(ancora.x, ancora.y);

    cont.__prefab = nomePrefab;
    cont.__def = def;
    return cont;
  }

  // ---------------------------------------------------------------------------
  // Colocação no mundo
  // ---------------------------------------------------------------------------

  function containerDeMundo(motor) {
    // Ordem de preferência: camada nova > camada sortable existente.
    // ySortContainer já tem sortableChildren = true; usá-lo desde já conserta
    // a oclusão personagem/casa SEM refatorar a árvore de camadas.
    return motor.worldContainer || motor.ySortContainer || motor.structuresContainer;
  }

  function escalaDe(motor, defLocal) {
    const base = estado.manifesto.escalaBase;
    const local = defLocal && defLocal.escala != null ? defLocal.escala : 1.0;
    return base * local * motor.box.scale;
  }

  /**
   * Cria o prefab de um local e o insere no mundo com Y-sorting correto.
   * nx/ny vêm de LOCAIS_MAPA (o motor é dono dessa verdade; não duplicamos).
   */
  function criarNoLocal(motor, idLocal, nx, ny) {
    if (!estado.manifesto) {
      console.warn('[ArteIlha] criarNoLocal antes de carregar() — ignorado.');
      return null;
    }

    const defLocal = estado.manifesto.locais[idLocal];
    if (!defLocal) return null; // local sem arte própria: plate + VFX, por design

    const cont = construirPrefab(defLocal.prefab);
    const alvo = motor.toScreen(nx, ny);

    const k = escalaDe(motor, defLocal);
    cont.scale.set(defLocal.espelhar ? -k : k, k);

    const dyPx = (defLocal.dy || 0) * motor.box.scale;
    cont.position.set(alvo.x, alvo.y + dyPx);

    // Y-sort: base do objeto, não centro. -0.5 evita que um ator
    // exatamente na mesma linha pisque entre frente e fundo.
    cont.zIndex = cont.position.y - 0.5;

    const pai = containerDeMundo(motor);
    pai.addChild(cont);

    cont.__local = idLocal;
    cont.__defLocal = defLocal;
    cont.__nx = nx;   // normalizado 0..1: guarda a VERDADE de mundo, não o pixel
    cont.__ny = ny;   // sem isso o resize só reescalava e deixava o sprite no lugar errado
    return cont;
  }

  /**
   * Reaplica posição, escala e Y-sort após qualquer mudança de `box`
   * (resize, zoom de enquadramento). Sprites NÃO se auto-corrigem no resize
   * (diferente dos Graphics, que se redesenham a cada tick).
   * Chamar no fim de MotorPixiIlha.recalcularEnquadramento().
   */
  function sincronizarEscala(motor) {
    if (!estado.manifesto) return;
    const pai = containerDeMundo(motor);
    if (!pai) return;

    pai.children.forEach(function (obj) {
      if (!obj.__prefab) return;

      const defLocal = obj.__defLocal || {};
      const k = escalaDe(motor, defLocal);
      obj.scale.set(defLocal.espelhar ? -k : k, k);

      // Reposição completa: box.x/box.w mudam no resize, então a posição em
      // espaço de tela NÃO sobrevive sozinha. O normalizado (nx/ny) sim.
      if (typeof obj.__nx === 'number' && typeof obj.__ny === 'number') {
        const alvo = motor.toScreen(obj.__nx, obj.__ny);
        const dyPx = (defLocal.dy || 0) * motor.box.scale;
        obj.position.set(alvo.x, alvo.y + dyPx);
      }

      // Y-sort: base do objeto, não centro. -0.5 evita que um ator
      // exatamente na mesma linha pisque entre frente e fundo.
      obj.zIndex = obj.position.y - 0.5;
    });
  }

  /** Corte sem teto: esconde as camadas marcadas como "telhado". */
  function definirCasaAberta(container, aberta) {
    if (!container) return;
    container.children.forEach(function (filho) {
      if (filho.label === 'telhado') filho.visible = !aberta;
    });
  }

  function diagnostico() {
    return {
      manifestoCarregado: !!estado.manifesto,
      versao: estado.manifesto ? estado.manifesto.versao : null,
      texturasOk: Object.keys(estado.texturas).filter(function (a) {
        return estado.falhas.indexOf(a) === -1;
      }).length,
      falhas: estado.falhas.slice(),
      prefabs: estado.manifesto ? Object.keys(estado.manifesto.prefabs) : [],
      locais: estado.manifesto ? Object.keys(estado.manifesto.locais) : []
    };
  }

  // ---------------------------------------------------------------------------
  // Bancada de calibração (Gate 0 dentro do jogo)
  // ---------------------------------------------------------------------------

  /**
   * Modo bancada: desenha todos os prefabs em grade sobre fundo neutro,
   * com uma silhueta humana de referência ao lado para medir a porta.
   * Requer um PIXI.Container (ou stage) vazio.
   *
   * Uso: ArteIlha.instalarNoPixiDeTeste(app.stage)
   */
  async function instalarNoPixiDeTeste(stage) {
    await carregar();

    const raiz = new PIXI.Container();
    raiz.label = 'bancada';
    stage.addChild(raiz);

    const fundo = new PIXI.Graphics();
    fundo.beginFill(0x1b2430).drawRect(0, 0, 1600, 900).endFill();
    raiz.addChild(fundo);

    const grade = new PIXI.Graphics();
    grade.lineStyle(1, 0x2f3f52, 1);
    for (let x = 0; x <= 1600; x += 64) grade.moveTo(x, 0).lineTo(x, 900);
    for (let y = 0; y <= 900; y += 64) grade.moveTo(0, y).lineTo(1600, y);
    raiz.addChild(grade);

    // Silhueta de referência: 49 px = altura de um personagem em box.scale 1.
    const humano = new PIXI.Graphics();
    humano.beginFill(0xfacc15, 0.25).drawRect(0, -49, 16, 49).endFill();
    humano.lineStyle(1, 0xfacc15, 0.9).drawRect(0, -49, 16, 49);
    humano.position.set(90, 200);
    raiz.addChild(humano);

    const nomes = Object.keys(estado.manifesto.prefabs);
    nomes.forEach(function (nome, i) {
      const col = i % 5;
      const lin = Math.floor(i / 5);

      const casa = construirPrefab(nome);
      casa.scale.set(2);
      casa.position.set(220 + col * 260, 200 + lin * 220);
      raiz.addChild(casa);

      const rotulo = new PIXI.Text(nome, { fontSize: 14, fill: 0xe2e8f0 });
      rotulo.position.set(220 + col * 260 - 60, 250 + lin * 220);
      raiz.addChild(rotulo);
    });

    console.log('[ArteIlha] bancada montada com ' + nomes.length + ' prefabs.');
  }

  window.ArteIlha = {
    MANIFEST_V: MANIFEST_V,
    carregar: carregar,
    construirPrefab: construirPrefab,
    criarNoLocal: criarNoLocal,
    sincronizarEscala: sincronizarEscala,
    definirCasaAberta: definirCasaAberta,
    diagnostico: diagnostico,
    instalarNoPixiDeTeste: instalarNoPixiDeTeste
  };

  console.log('[ArteIlha] módulo pronto (inerte). Chame ArteIlha.carregar().');
})();

/**
 * Motor Three.js — Ilha Aurora 3D Real (Renderizador do Modelo GLB e Personagens)
 * Integração procedural de A_ILHA_V2_COMPLETA.glb com estado-ilha.json e MapaRpg
 */
(function(window) {
  'use strict';

  // Cores de túnica / aura dos sobreviventes
  const CORES_SERES = {
    icaro: 0x10b981, // Verde Esmeralda
    lara: 0xa855f7,  // Roxo Ametista
    joao: 0x3b82f6,  // Azul Safira
    maria: 0xf59e0b  // Dourado Âmbar
  };

  // Coordenadas padrão dos nós caso não venha no nó
  const NOS_DEFAULT = {
    casa_icaro: { x: 0.220, y: 0.480 },
    casa_lara: { x: 0.240, y: 0.410 },
    casa_joao: { x: 0.460, y: 0.240 },
    casa_maria: { x: 0.820, y: 0.580 },
    acampamento: { x: 0.460, y: 0.540 },
    fogueira: { x: 0.500, y: 0.520 },
    arena: { x: 0.660, y: 0.360 },
    bosque: { x: 0.320, y: 0.320 },
    floresta: { x: 0.760, y: 0.320 },
    rio: { x: 0.585, y: 0.580 },
    cachoeira: { x: 0.650, y: 0.140 },
    fazenda: { x: 0.880, y: 0.560 },
    curral: { x: 0.890, y: 0.670 },
    mar: { x: 0.350, y: 0.880 },
    barco: { x: 0.480, y: 0.840 },
    caverna: { x: 0.880, y: 0.220 },
    ilha_vizinha: { x: 0.080, y: 0.820 }
  };

  class MotorThreeIlha {
    constructor() {
      this.container = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.islandModel = null;
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.downMouse = new THREE.Vector2();
      this.characters = {}; // { icaro: { group, targetPos, currentPos, serData, ... } }
      this.isRunning = false;
      this.animId = null;
      this.lastState = null;
      this.clock = new THREE.Clock();
      this.hoveredSerId = null;
      this.mapaRpgIniciado = false;
    }

    init(containerElement) {
      if (this.scene) return; // Já inicializado
      this.container = containerElement;

      // 1. Cena, Neblina e Iluminação
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x071524);
      this.scene.fog = new THREE.FogExp2(0x071524, 0.012);

      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;

      this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      this.camera.position.set(28, 24, 34);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(w, h);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);

      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 160;
      this.controls.minDistance = 4;
      this.controls.target.set(0, 0, 0);

      // Luzes
      const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x064e3b, 0.75);
      this.scene.add(hemiLight);

      const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.3);
      sunLight.position.set(40, 60, 30);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 150;
      const d = 35;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      this.scene.add(sunLight);

      const ambLight = new THREE.AmbientLight(0x38bdf8, 0.25);
      this.scene.add(ambLight);

      // 2. Integração com MapaRpg (Hitboxes dos Nós 3D e Painel CORTEX)
      this.iniciarMapaRpg();

      // 3. Oceano e Vida Marinha 3D (Profundidade correta - Sem tubarão voando)
      this.criarOceano3D();
      this.criarTubarao3D();

      // 4. Carregar GLB da Ilha
      this.carregarModelo();

      // Eventos de clique e redimensionamento
      window.addEventListener('resize', () => this.onResize());
      this.renderer.domElement.addEventListener('pointerdown', (e) => {
        this.downMouse.x = e.clientX;
        this.downMouse.y = e.clientY;
      });
      this.renderer.domElement.addEventListener('pointerup', (e) => this.onPointerClick(e));
      this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    }

    iniciarMapaRpg() {
      if (this.mapaRpgIniciado) return;
      if (window.MapaRpg && window.MapaRpg.integradorThree) {
        window.MapaRpg.integradorThree.initThree(this.scene, this.camera, this.renderer, (dadosNo) => {
          window.MapaRpg.abrirCortex(dadosNo);
        });
        this.mapaRpgIniciado = true;
        console.log('[Motor 3D] MapaRpg conectado: Hitboxes e CORTEX ativos.');
      }
    }

    criarOceano3D() {
      // Plano de água oceânica translúcida cobrindo o entorno da ilha (Y = 0.18)
      const geo = new THREE.PlaneGeometry(160, 160, 16, 16);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.2,
        depthWrite: false, // Permite enxergar a criatura subaquática
        depthTest: true
      });
      const water = new THREE.Mesh(geo, mat);
      water.position.y = 0.18; // Nível real da lâmina d'água 3D
      water.name = 'oceano_agua_3d';
      this.scene.add(water);
      this.oceanMesh = water;
    }

    criarTubarao3D() {
      const g = new THREE.Group();
      g.name = 'tubarao_3d';

      // Material cinza ardósia com depthTest ativo para respeitar a água e a ilha
      const tubMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.4,
        metalness: 0.1,
        depthTest: true,
        depthWrite: true
      });

      // 1. Corpo fusiforme hidrodinâmico do tubarão
      const corpoGeo = new THREE.ConeGeometry(0.35, 2.2, 12);
      corpoGeo.rotateX(Math.PI / 2);
      const corpo = new THREE.Mesh(corpoGeo, tubMat);
      corpo.position.z = 0.2;
      g.add(corpo);

      // 2. Barbatana Dorsal (triangular, corta a superfície d'água)
      const dorsalGeo = new THREE.ConeGeometry(0.12, 0.45, 4);
      dorsalGeo.rotateZ(0.2);
      const dorsal = new THREE.Mesh(dorsalGeo, tubMat);
      dorsal.position.set(0, 0.26, -0.1);
      g.add(dorsal);

      // 3. Nadadeiras Peitorais (laterais)
      const peitoralGeo = new THREE.BoxGeometry(1.1, 0.04, 0.25);
      peitoralGeo.rotateY(0.2);
      const peitoral = new THREE.Mesh(peitoralGeo, tubMat);
      peitoral.position.set(0, -0.05, 0.3);
      g.add(peitoral);

      // 4. Cauda / Barbatana Caudal (ondula ao nadar)
      const caudaGeo = new THREE.BoxGeometry(0.06, 0.6, 0.35);
      const cauda = new THREE.Mesh(caudaGeo, tubMat);
      cauda.position.set(0, 0.05, -1.0);
      g.add(cauda);
      this.tubaraoCauda = cauda;

      // 5. Runa / esteira sutil na água sobre o tubarão
      const esteiraGeo = new THREE.RingGeometry(0.4, 0.7, 16);
      esteiraGeo.rotateX(-Math.PI / 2);
      const esteiraMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.35,
        depthTest: true
      });
      const esteira = new THREE.Mesh(esteiraGeo, esteiraMat);
      esteira.position.y = 0.19;
      g.add(esteira);

      // Profundidade Z/Y exata:
      // Centro submerso em Y = 0.02 (abaixo de 0.18 da água).
      // Apenas a barbatana dorsal (+0.26) corta suavemente a lâmina da água!
      g.position.set(-4.5, 0.02, 7.6);
      this.scene.add(g);
      this.tubarao3D = g;
      this.tubaraoAngulo = 0;
    }

    carregarModelo() {
      const loader = new THREE.GLTFLoader();
      const glbUrl = '/A_ILHA_V2_COMPLETA.glb';

      loader.load(glbUrl, (gltf) => {
        this.islandModel = gltf.scene;
        // O trimesh exporta com Z-up; em Three.js viramos X em -90 graus
        this.islandModel.rotation.x = -Math.PI / 2;

        this.islandModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Profundidade ativada para oclusão correta
            if (child.material) {
              child.material.depthTest = true;
              child.material.depthWrite = true;
            }
            if (child.geometry && child.geometry.attributes.color) {
              child.material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.8,
                metalness: 0.1,
                flatShading: true
              });
            }
          }
        });

        this.scene.add(this.islandModel);
        console.log('[Motor 3D] Modelo da Ilha carregado com sucesso!');

        // Centralizar câmera na ilha
        const box = new THREE.Box3().setFromObject(this.islandModel);
        const center = box.getCenter(new THREE.Vector3());
        this.controls.target.copy(center);
        this.controls.update();

        // Se já havia estado esperando, atualiza personagens
        if (this.lastState) {
          this.atualizarEstado(this.lastState);
        }
      }, undefined, (err) => {
        console.warn('[Motor 3D] Erro ao carregar A_ILHA_V2_COMPLETA.glb, tentando A_ILHA_V2.glb...', err);
        loader.load('/A_ILHA_V2.glb', (gltf2) => {
          this.islandModel = gltf2.scene;
          this.islandModel.rotation.x = -Math.PI / 2;
          this.islandModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.depthTest = true;
                child.material.depthWrite = true;
              }
              if (child.geometry && child.geometry.attributes.color) {
                child.material = new THREE.MeshStandardMaterial({
                  vertexColors: true,
                  roughness: 0.8,
                  metalness: 0.1,
                  flatShading: true
                });
              }
            }
          });
          this.scene.add(this.islandModel);
          if (this.lastState) this.atualizarEstado(this.lastState);
        });
      });
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.clock.start();
      const loop = () => {
        if (!this.isRunning) return;
        this.animId = requestAnimationFrame(loop);
        this.render();
      };
      loop();
      this.onResize();
    }

    stop() {
      this.isRunning = false;
      if (this.animId) cancelAnimationFrame(this.animId);
    }

    onResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    render() {
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Atualiza controles
      if (this.controls) this.controls.update();

      // 1. Atualiza gerenciador de movimento RPG nas trilhas (Sem Teleporte)
      if (window.MapaRpg && window.MapaRpg.gerenciadorMov) {
        window.MapaRpg.gerenciadorMov.atualizar(delta);
      }

      // 2. Interpolação de posição e animação dos personagens
      for (const id in this.characters) {
        const char = this.characters[id];
        if (char && char.group) {
          const movRpg = (window.MapaRpg && window.MapaRpg.gerenciadorMov)
            ? window.MapaRpg.gerenciadorMov.obterEstado(id)
            : null;

          if (movRpg && movRpg.estado === 'caminhando') {
            // Caminha suavemente ao longo dos waypoints da trilha
            char.group.position.set(movRpg.posicaoAtual.x, movRpg.posicaoAtual.y, movRpg.posicaoAtual.z);

            // Orientação do olhar/corpo na direção do movimento
            if (movRpg.direcaoAtual && (movRpg.direcaoAtual.x !== 0 || movRpg.direcaoAtual.z !== 0)) {
              const targetAngle = Math.atan2(movRpg.direcaoAtual.x, movRpg.direcaoAtual.z);
              char.group.rotation.y = targetAngle;
            }

            // Animação de passada (bounce rítmico)
            const bounce = Math.sin(elapsed * 12) * 0.08;
            if (char.meshCorpo) {
              char.meshCorpo.position.y = 0.45 + Math.abs(bounce);
            }
          } else {
            // Parado no nó de destino
            char.group.position.lerp(char.targetPos, 0.08);

            // Respiração ociosa (idle breathing)
            const breath = Math.sin(elapsed * 3 + (id.charCodeAt(0) % 5)) * 0.03;
            if (char.meshCorpo) {
              char.meshCorpo.position.y = 0.45 + breath;
            }
          }

          // Orientação do Nameplate sempre de frente para a câmera (Billboard)
          if (char.nameplate) {
            char.nameplate.quaternion.copy(this.camera.quaternion);
          }
          if (char.balaoFala) {
            char.balaoFala.quaternion.copy(this.camera.quaternion);
          }
        }
      }

      // 3. Atualiza nado do Tubarão 3D na profundidade correta (submerso, sem voar)
      if (this.tubarao3D) {
        this.tubaraoAngulo = (this.tubaraoAngulo || 0) + delta * 0.45;
        const raioX = 4.2;
        const raioZ = 2.8;
        const centroX = -4.5;
        const centroZ = 7.6;

        const tx = centroX + Math.cos(this.tubaraoAngulo) * raioX;
        const tz = centroZ + Math.sin(this.tubaraoAngulo) * raioZ;

        // Submerso em Y entre -0.01 e 0.05
        const waveY = 0.02 + Math.sin(elapsed * 2) * 0.03;
        this.tubarao3D.position.set(tx, waveY, tz);

        // Orientação tangencial à curva de nado
        const tangX = -Math.sin(this.tubaraoAngulo) * raioX;
        const tangZ = Math.cos(this.tubaraoAngulo) * raioZ;
        this.tubarao3D.rotation.y = Math.atan2(tangX, tangZ);

        // Batimento realista da cauda
        if (this.tubaraoCauda) {
          this.tubaraoCauda.rotation.y = Math.sin(elapsed * 6) * 0.4;
        }
      }

      this.renderer.render(this.scene, this.camera);
    }

    // Converte (normX, normY) para coordenadas de mundo Three.js
    coordenadaParaMundo(normX, normY) {
      const x_3d = (normX - 0.5) * 30.0;
      const y_3d = (0.5 - normY) * 20.0;
      const worldX = x_3d;
      const worldZ = -y_3d;

      // Detecta a altura do solo via raycast para o personagem não afundar nem levitar
      let worldY = 0.8;
      if (this.islandModel) {
        this.raycaster.set(new THREE.Vector3(worldX, 40, worldZ), new THREE.Vector3(0, -1, 0));
        const hits = this.raycaster.intersectObject(this.islandModel, true);
        if (hits.length > 0) {
          worldY = hits[0].point.y;
        }
      }
      // Se for ambiente marinho / água (litoral sul ou ilha vizinha), limita estritamente à lâmina d'água (0.18)
      if (normY > 0.8 || (normX < 0.2 && normY > 0.75)) {
        worldY = Math.min(worldY, 0.18);
      }
      return new THREE.Vector3(worldX, worldY, worldZ);
    }

    criarAvatarPersonagem(id, nome) {
      const group = new THREE.Group();
      group.name = 'char_' + id;
      const cor = CORES_SERES[id] || 0x38bdf8;

      // 1. Base / Sombra dos pés (com profundidade para respeitar o solo)
      const sombraGeo = new THREE.CircleGeometry(0.35, 16);
      sombraGeo.rotateX(-Math.PI / 2);
      const sombraMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        depthTest: true,
        depthWrite: false
      });
      const sombra = new THREE.Mesh(sombraGeo, sombraMat);
      sombra.position.y = 0.02;
      group.add(sombra);

      // 2. Corpo / Túnica (Cone arredondado / Cilindro estilizado com oclusão 3D)
      const corpoGeo = new THREE.CylinderGeometry(0.18, 0.32, 0.8, 12);
      const corpoMat = new THREE.MeshStandardMaterial({
        color: cor,
        roughness: 0.5,
        metalness: 0.1,
        flatShading: true,
        depthTest: true,
        depthWrite: true
      });
      const corpo = new THREE.Mesh(corpoGeo, corpoMat);
      corpo.position.y = 0.45;
      corpo.castShadow = true;
      group.add(corpo);

      // 3. Cabeça
      const cabecaGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const cabecaMat = new THREE.MeshStandardMaterial({
        color: 0xffdfba, // Tom de pele
        roughness: 0.6,
        depthTest: true,
        depthWrite: true
      });
      const cabeca = new THREE.Mesh(cabecaGeo, cabecaMat);
      cabeca.position.y = 0.95;
      cabeca.castShadow = true;
      group.add(cabeca);

      // 4. Faixa / Acessório distintivo (Cabelo / Capuz / Bandana)
      const acessorioGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.12, 12);
      const acessorioMat = new THREE.MeshStandardMaterial({
        color: cor,
        depthTest: true,
        depthWrite: true
      });
      const acessorio = new THREE.Mesh(acessorioGeo, acessorioMat);
      acessorio.position.y = 1.05;
      group.add(acessorio);

      // 5. Nameplate 3D com Nome e Ação
      const nameplate = this.criarNameplateSprite(nome, 'Existindo');
      nameplate.position.y = 1.5;
      group.add(nameplate);

      this.scene.add(group);

      return {
        id,
        nome,
        group,
        meshCorpo: corpo,
        nameplate,
        balaoFala: null,
        targetPos: new THREE.Vector3(0, 0, 0),
        ultimoLocal: null
      };
    }

    criarNameplateSprite(nome, status) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      // Fundo arredondado
      ctx.fillStyle = 'rgba(8, 24, 39, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      this.roundRect(ctx, 4, 4, 248, 56, 12, true, true);

      // Nome
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(nome, 128, 28);

      // Ação
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(String(status).slice(0, 24), 128, 50);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.8, 0.45, 1);
      sprite.userData = { canvas, ctx, texture };
      return sprite;
    }

    atualizarNameplate(char, status) {
      if (!char.nameplate || !char.nameplate.userData) return;
      const { canvas, ctx, texture } = char.nameplate.userData;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(8, 24, 39, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      this.roundRect(ctx, 4, 4, 248, 56, 12, true, true);

      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(char.nome, 128, 28);

      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(String(status || 'Existindo').slice(0, 24), 128, 50);

      texture.needsUpdate = true;
    }

    roundRect(ctx, x, y, w, h, r, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    }

    atualizarEstado(stateData) {
      this.lastState = stateData;
      if (!stateData || !stateData.seres) return;

      const seresList = Object.values(stateData.seres);

      seresList.forEach((s) => {
        if (s.status === 'morto') {
          if (this.characters[s.id]) {
            this.scene.remove(this.characters[s.id].group);
            delete this.characters[s.id];
          }
          return;
        }

        let char = this.characters[s.id];
        if (!char) {
          char = this.criarAvatarPersonagem(s.id, s.nome);
          this.characters[s.id] = char;
          char.ultimoLocal = s.local;
        }

        // Se mudou de nó no RPG, inicia caminhada real ao longo das trilhas sem teleporte
        if (s.local && char.ultimoLocal && s.local !== char.ultimoLocal) {
          if (window.MapaRpg && window.MapaRpg.gerenciadorMov) {
            window.MapaRpg.gerenciadorMov.iniciarDeslocamento(s.id, char.ultimoLocal, s.local);
          }
          char.ultimoLocal = s.local;
        } else if (!char.ultimoLocal && s.local) {
          char.ultimoLocal = s.local;
        }

        // Posicionamento no nó lógico do RPG
        const pos3d = (window.MapaRpg && window.MapaRpg.NOS_RPG && window.MapaRpg.NOS_RPG[s.local])
          ? window.MapaRpg.NOS_RPG[s.local].pos3D
          : null;

        let targetWorld;
        if (pos3d) {
          targetWorld = new THREE.Vector3(pos3d.x, pos3d.y, pos3d.z);
        } else {
          let nx = (typeof s.x === 'number') ? s.x : (NOS_DEFAULT[s.local]?.x ?? 0.5);
          let ny = (typeof s.y === 'number') ? s.y : (NOS_DEFAULT[s.local]?.y ?? 0.5);
          targetWorld = this.coordenadaParaMundo(nx, ny);
        }

        // Pequeno offset individual se mais de um personagem estiver no mesmo local
        const mesmoLocal = seresList.filter(o => o.local === s.local && o.status !== 'morto');
        if (mesmoLocal.length > 1) {
          const idx = mesmoLocal.findIndex(o => o.id === s.id);
          const angle = (idx / mesmoLocal.length) * Math.PI * 2;
          targetWorld.x += Math.cos(angle) * 0.45;
          targetWorld.z += Math.sin(angle) * 0.45;
        }

        char.targetPos.copy(targetWorld);

        // Se for o primeiro posicionamento no mundo, coloca direto no nó de origem
        if (char.group.position.lengthSq() < 0.01) {
          char.group.position.copy(targetWorld);
        }

        // Atualiza Nameplate com última ação / motivo
        const actText = s.ultimaAcao || s.local || 'Existindo';
        this.atualizarNameplate(char, actText);
      });
    }

    onPointerMove(e) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const objects = [];
      for (const id in this.characters) {
        if (this.characters[id] && this.characters[id].group) {
          objects.push(this.characters[id].group);
        }
      }

      const intersects = this.raycaster.intersectObjects(objects, true);
      if (intersects.length > 0) {
        this.renderer.domElement.style.cursor = 'pointer';
        let root = intersects[0].object;
        while (root.parent && root.parent !== this.scene && !root.name.startsWith('char_')) {
          root = root.parent;
        }
        this.hoveredSerId = root.name.replace('char_', '');
      } else {
        this.renderer.domElement.style.cursor = 'default';
        this.hoveredSerId = null;
      }
    }

    onPointerClick(e) {
      // Ignora se foi arrasto (orbit/pan)
      const dist = Math.hypot(e.clientX - this.downMouse.x, e.clientY - this.downMouse.y);
      if (dist > 6) return;

      if (this.hoveredSerId && this.characters[this.hoveredSerId]) {
        const char = this.characters[this.hoveredSerId];
        const msg = prompt(`[Ilha 3D] Digite o que você diz a ${char.nome}:`);
        if (msg && msg.trim()) {
          fetch('/api/falar', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: this.hoveredSerId, texto: msg.trim() })
          }).then(r => r.json()).then(data => {
            if (typeof window.mostrarToast === 'function') {
              window.mostrarToast(`💬 ${char.nome} respondeu: "${data.resposta || '...'}"`);
            } else {
              console.log(`[Ilha 3D] ${char.nome}: "${data.resposta}"`);
            }
          }).catch(err => console.warn('Erro ao falar:', err));
        }
      }
    }

    focarAlvo(target) {
      if (!this.controls) return;
      if (this.characters[target]) {
        const p = this.characters[target].group.position;
        this.controls.target.copy(p);
        this.camera.position.set(p.x + 8, p.y + 7, p.z + 8);
        this.controls.update();
        return;
      }

      // Consulta nós do MapaRpg
      const noRpg = window.MapaRpg && window.MapaRpg.NOS_RPG && window.MapaRpg.NOS_RPG[target];
      if (noRpg && noRpg.pos3D) {
        const p = noRpg.pos3D;
        this.controls.target.set(p.x, p.y, p.z);
        this.camera.position.set(p.x + 8, p.y + 7, p.z + 8);
        this.controls.update();
        return;
      }

      // Locais clássicos de fallback
      const LOCAIS_FOCUS = {
        vila: { x: 0, y: 1.25, z: 0.4, off: [14, 10, 12] },
        fogueira: { x: 0, y: 1.25, z: 0.4, off: [10, 8, 10] },
        caverna: { x: 11.4, y: 3.2, z: -5.6, off: [8, 6, 8] },
        mar: { x: -4.5, y: 0.45, z: 7.6, off: [10, 8, 10] },
        barco: { x: -0.6, y: 0.45, z: 6.8, off: [10, 8, 10] },
        fazenda: { x: 11.4, y: 1.25, z: 1.2, off: [10, 8, 10] }
      };

      const loc = LOCAIS_FOCUS[target];
      if (loc) {
        this.controls.target.set(loc.x, loc.y, loc.z);
        this.camera.position.set(loc.x + loc.off[0], loc.y + loc.off[1], loc.z + loc.off[2]);
        this.controls.update();
      }
    }

    resetCamera() {
      if (!this.islandModel || !this.controls) return;
      const box = new THREE.Box3().setFromObject(this.islandModel);
      const center = box.getCenter(new THREE.Vector3());
      this.controls.target.copy(center);
      this.camera.position.set(center.x + 30, center.y + 26, center.z + 36);
      this.controls.update();
    }
  }

  window.motorThreeIlha = new MotorThreeIlha();
})(window);

/**
 * Motor Three.js — Ilha Aurora 3D Real (Renderizador do Modelo GLB e Personagens)
 * Integração procedural de A_ILHA_V2_COMPLETA.glb com estado-ilha.json
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

      // Carregar GLB da Ilha
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

      // Interpolação de posição e animação sutil dos personagens (idle breathing / bounce)
      for (const id in this.characters) {
        const char = this.characters[id];
        if (char && char.group) {
          // Lerp suave para targetPos
          char.group.position.lerp(char.targetPos, 0.08);

          // Efeito sutil de flutuação / caminhada
          const bounce = Math.sin(elapsed * 3 + (id.charCodeAt(0) % 5)) * 0.04;
          if (char.meshCorpo) {
            char.meshCorpo.position.y = 0.5 + bounce;
          }

          // Orientação do Nameplate sempre de frente para a câmera
          if (char.nameplate) {
            char.nameplate.quaternion.copy(this.camera.quaternion);
          }
          if (char.balaoFala) {
            char.balaoFala.quaternion.copy(this.camera.quaternion);
          }
        }
      }

      this.renderer.render(this.scene, this.camera);
    }

    // Converte (normX, normY) para coordenadas de mundo Three.js
    coordenadaParaMundo(normX, normY) {
      const x_3d = (normX - 0.5) * 30.0;
      const y_3d = (0.5 - normY) * 20.0;
      // Trimesh Z-up com rotação X = -90 graus vira:
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
      return new THREE.Vector3(worldX, worldY, worldZ);
    }

    criarAvatarPersonagem(id, nome) {
      const group = new THREE.Group();
      group.name = 'char_' + id;
      const cor = CORES_SERES[id] || 0x38bdf8;

      // 1. Base / Sombra dos pés
      const sombraGeo = new THREE.CircleGeometry(0.35, 16);
      sombraGeo.rotateX(-Math.PI / 2);
      const sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
      const sombra = new THREE.Mesh(sombraGeo, sombraMat);
      sombra.position.y = 0.02;
      group.add(sombra);

      // 2. Corpo / Túnica (Cone arredondado / Cilindro estilizado)
      const corpoGeo = new THREE.CylinderGeometry(0.18, 0.32, 0.8, 12);
      const corpoMat = new THREE.MeshStandardMaterial({
        color: cor,
        roughness: 0.5,
        metalness: 0.1,
        flatShading: true
      });
      const corpo = new THREE.Mesh(corpoGeo, corpoMat);
      corpo.position.y = 0.45;
      corpo.castShadow = true;
      group.add(corpo);

      // 3. Cabeça
      const cabecaGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const cabecaMat = new THREE.MeshStandardMaterial({
        color: 0xffdfba, // Tom de pele
        roughness: 0.6
      });
      const cabeca = new THREE.Mesh(cabecaGeo, cabecaMat);
      cabeca.position.y = 0.95;
      cabeca.castShadow = true;
      group.add(cabeca);

      // 4. Faixa / Acessório distintivo (Cabelo / Capuz / Bandana)
      const acessorioGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.12, 12);
      const acessorioMat = new THREE.MeshStandardMaterial({ color: cor });
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
        targetPos: new THREE.Vector3(0, 0, 0)
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
      ctx.fillText(status.slice(0, 24), 128, 50);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
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
        }

        // Determinar coordenadas (x, y)
        let nx = 0.5, ny = 0.5;
        if (typeof s.x === 'number' && typeof s.y === 'number') {
          nx = s.x; ny = s.y;
        } else if (s.local && NOS_DEFAULT[s.local]) {
          nx = NOS_DEFAULT[s.local].x;
          ny = NOS_DEFAULT[s.local].y;
        } else if (window.nos && window.nos()[s.local]) {
          nx = window.nos()[s.local].x;
          ny = window.nos()[s.local].y;
        }

        // Pequeno offset individual se mais de um personagem estiver no mesmo local
        const mesmoLocal = seresList.filter(o => o.local === s.local && o.status !== 'morto');
        if (mesmoLocal.length > 1) {
          const idx = mesmoLocal.findIndex(o => o.id === s.id);
          const angle = (idx / mesmoLocal.length) * Math.PI * 2;
          nx += Math.cos(angle) * 0.025;
          ny += Math.sin(angle) * 0.025;
        }

        const worldPos = this.coordenadaParaMundo(nx, ny);
        char.targetPos.copy(worldPos);

        // Se for o primeiro posicionamento, teleporta direto
        if (char.group.position.lengthSq() < 0.01) {
          char.group.position.copy(worldPos);
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
            if (data.ok) {
              alert(`Mensagem entregue no mundo 3D!\n${char.nome} respondeu: "${data.resposta}"`);
            } else {
              alert(`Mensagem guardada, mas cérebro ocupado: ${data.erro || 'sem resposta'}`);
            }
          }).catch(err => alert('Erro ao falar: ' + err.message));
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

      // Locais
      const LOCAIS_FOCUS = {
        vila: { x: 0, y: 1.2, z: 0, off: [14, 10, 12] },
        fogueira: { x: 0, y: 1.2, z: 0, off: [14, 10, 12] },
        caverna: { x: 11.4, y: 3.2, z: 5.6, off: [8, 6, 8] },
        mar: { x: -0.6, y: 0.4, z: -6.8, off: [10, 8, 10] },
        barco: { x: -0.6, y: 0.4, z: -6.8, off: [10, 8, 10] },
        fazenda: { x: 11.5, y: 1.5, z: -2.5, off: [12, 10, 12] }
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

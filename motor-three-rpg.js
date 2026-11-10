/**
 * Motor Three.js RPG / RTS — Ilha Aurora (Câmera Expandida, WASD, Q/E, FOV 60°, Construções Dinâmicas)
 */
(function(window) {
  'use strict';

  class MotorThreeRpg {
    constructor() {
      this.container = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.islandModel = null;
      this.raycaster = new THREE.Raycaster();
      this.characters = {};
      this.buildingMeshes = {};
      this.isRunning = false;
      this.animId = null;
      this.targetFollow = null; // serId para seguir com lerp
      this.clock = new THREE.Clock();

      // Teclas pressionadas para controle WASD + Q/E
      this.keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false, KeyQ: false, KeyE: false };
      this.camSpeed = 18.0; // velocidade de movimento da câmera
      this.rotSpeed = 1.6;  // velocidade de rotação Q/E
    }

    init(containerElement) {
      if (this.scene) return;
      this.container = containerElement;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x06111e);
      this.scene.fog = new THREE.FogExp2(0x06111e, 0.010);

      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;

      // 1. CÂMERA RPG / RTS COM FOV 60°
      this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
      this.camera.position.set(0, 28, 32);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(w, h);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);

      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxDistance = 150;
      this.controls.minDistance = 6;
      this.controls.target.set(0, 1, 0);

      // Luzes
      const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x064e3b, 0.8);
      this.scene.add(hemiLight);

      const sun = new THREE.DirectionalLight(0xfff7ed, 1.35);
      sun.position.set(45, 65, 35);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      const d = 36;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      this.scene.add(sun);

      const amb = new THREE.AmbientLight(0x38bdf8, 0.28);
      this.scene.add(amb);

      // Carregar GLB da Ilha
      this.carregarModelo();

      // Controles do Teclado WASD + Q/E
      window.addEventListener('keydown', (e) => {
        if (this.keys[e.code] !== undefined) this.keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => {
        if (this.keys[e.code] !== undefined) this.keys[e.code] = false;
      });
      window.addEventListener('resize', () => this.onResize());
    }

    carregarModelo() {
      const loader = new THREE.GLTFLoader();
      loader.load('/A_ILHA_V2_COMPLETA.glb', (gltf) => {
        this.islandModel = gltf.scene;
        this.islandModel.rotation.x = -Math.PI / 2;
        this.islandModel.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            if (c.geometry && c.geometry.attributes.color) {
              c.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
            }
          }
        });
        this.scene.add(this.islandModel);
        console.log('[Motor RPG] Ilha 3D carregada com sucesso.');
      }, undefined, () => {
        loader.load('/A_ILHA_V2.glb', (gltf2) => {
          this.islandModel = gltf2.scene;
          this.islandModel.rotation.x = -Math.PI / 2;
          this.scene.add(this.islandModel);
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
      const dt = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Processa movimentação de câmera com WASD
      this.processarTeclado(dt);

      // Modo Seguir Personagem com interpolação suave (lerp)
      if (this.targetFollow && this.characters[this.targetFollow]) {
        const charPos = this.characters[this.targetFollow].group.position;
        this.controls.target.lerp(charPos, 0.08);
      }

      if (this.controls) this.controls.update();

      // Atualiza interpolação e nameplates dos sobreviventes
      for (const id in this.characters) {
        const c = this.characters[id];
        if (c && c.group) {
          c.group.position.lerp(c.targetPos, 0.09);
          if (c.nameplate) c.nameplate.quaternion.copy(this.camera.quaternion);
        }
      }

      this.renderer.render(this.scene, this.camera);
    }

    processarTeclado(dt) {
      if (!this.controls || !this.camera) return;

      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, this.camera.up).normalize();

      const move = new THREE.Vector3();
      if (this.keys.KeyW) move.add(forward);
      if (this.keys.KeyS) move.sub(forward);
      if (this.keys.KeyD) move.add(right);
      if (this.keys.KeyA) move.sub(right);

      if (move.lengthSq() > 0) {
        this.targetFollow = null; // Teclado desativa follow automático
        move.normalize().multiplyScalar(this.camSpeed * dt);
        this.camera.position.add(move);
        this.controls.target.add(move);
      }

      // Rotação com Q / E
      if (this.keys.KeyQ) {
        this.controls.targetFollow = null;
        this.camera.position.sub(this.controls.target);
        this.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotSpeed * dt);
        this.camera.position.add(this.controls.target);
      }
      if (this.keys.KeyE) {
        this.camera.position.sub(this.controls.target);
        this.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.rotSpeed * dt);
        this.camera.position.add(this.controls.target);
      }
    }

    seguirPersonagem(serId) {
      this.targetFollow = serId;
    }

    atualizarEstado(stateData) {
      if (!stateData) return;

      // 1. Atualizar Personagens
      if (stateData.seres) {
        const seres = Object.values(stateData.seres);
        seres.forEach(s => {
          if (s.status === 'morto') return;
          let c = this.characters[s.id];
          if (!c) {
            c = this.criarAvatarPersonagem(s.id, s.nome);
            this.characters[s.id] = c;
          }
          // Posição no mundo
          let nx = s.x || 0.5, ny = s.y || 0.5;
          if (s.local && window.nos && window.nos[s.local]) {
            nx = window.nos[s.local].x;
            ny = window.nos[s.local].y;
          }
          const wx = (nx - 0.5) * 30.0;
          const wz = (ny - 0.5) * 20.0;
          c.targetPos.set(wx, 1.2, wz);
          if (c.group.position.lengthSq() < 0.01) c.group.position.copy(c.targetPos);
        });
      }

      // 2. Atualizar Construções Dinâmicas do Vilarejo (RTS)
      if (stateData.mundo && stateData.mundo.obrasConstruidas) {
        stateData.mundo.obrasConstruidas.forEach(obra => {
          if (!this.buildingMeshes[obra.id]) {
            const mesh = this.criarMalhaConstrucao(obra);
            this.scene.add(mesh);
            this.buildingMeshes[obra.id] = mesh;
          }
        });
      }
    }

    criarMalhaConstrucao(obra) {
      const g = new THREE.Group();
      g.position.set(obra.x || 0, 1.0, obra.z || 0);

      if (obra.tipo.includes('cabana')) {
        // Paredes de tora
        const wallsGeo = new THREE.BoxGeometry(2.4, 1.6, 2.0);
        const wallsMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
        const walls = new THREE.Mesh(wallsGeo, wallsMat);
        walls.position.y = 0.8;
        walls.castShadow = true;
        walls.receiveShadow = true;
        g.add(walls);

        // Telhado de palha/telha
        const roofGeo = new THREE.ConeGeometry(2.2, 1.1, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 2.1;
        roof.castShadow = true;
        g.add(roof);
      } else if (obra.tipo.includes('muralha')) {
        // Muralha de pedra com ameias
        const wallGeo = new THREE.BoxGeometry(3.5, 2.0, 0.8);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.y = 1.0;
        wall.castShadow = true;
        g.add(wall);
      } else {
        // Estrutura genérica (Torre de vigia / Oficina)
        const postGeo = new THREE.CylinderGeometry(0.8, 1.1, 3.2, 8);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.3 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 1.6;
        post.castShadow = true;
        g.add(post);
      }
      return g;
    }

    criarAvatarPersonagem(id, nome) {
      const group = new THREE.Group();
      const cor = (id === 'icaro') ? 0x10b981 : (id === 'lara') ? 0xa855f7 : (id === 'joao') ? 0x3b82f6 : 0xf59e0b;

      // Corpo
      const bGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.9, 10);
      const bMat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5 });
      const b = new THREE.Mesh(bGeo, bMat);
      b.position.y = 0.5;
      b.castShadow = true;
      group.add(b);

      // Cabeça
      const hGeo = new THREE.SphereGeometry(0.24, 10, 10);
      const hMat = new THREE.MeshStandardMaterial({ color: 0xffdfba });
      const h = new THREE.Mesh(hGeo, hMat);
      h.position.y = 1.05;
      h.castShadow = true;
      group.add(h);

      // Nameplate
      const nameplate = this.criarNameplate(nome);
      nameplate.position.y = 1.65;
      group.add(nameplate);

      this.scene.add(group);
      return { id, nome, group, nameplate, targetPos: new THREE.Vector3() };
    }

    criarNameplate(nome) {
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(6, 17, 30, 0.85)';
      ctx.fillRect(0, 0, 180, 48);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, 176, 44);
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(nome, 90, 30);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(1.5, 0.4, 1);
      return sp;
    }
  }

  window.motorThreeRpg = new MotorThreeRpg();
})(window);

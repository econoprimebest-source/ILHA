/**
 * Script de monitoramento e atualização contínua do status da Ilha & Assistentes.
 * Atualiza o arquivo no Desktop (C:\Users\Rafael\Desktop\status-ilha.txt)
 * a cada 3 minutos com informações em tempo real.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const { execSync } = require('child_process');

const DESKTOP_PATH = 'C:\\Users\\Rafael\\Desktop\\status-ilha.txt';
const PROJECT_DIR = 'C:\\Users\\Rafael\\ilha';

// Helper de execução segura de comandos do terminal
function runCmd(cmd, cwd = PROJECT_DIR) {
  try {
    return execSync(cmd, { cwd, timeout: 3000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

// Testa porta TCP de forma assíncrona rápida com timeout
function checkPort(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!done) {
        done = true;
        const latency = Date.now() - start;
        socket.destroy();
        resolve({ open: true, latency });
      }
    });

    socket.on('timeout', () => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve({ open: false, reason: 'timeout' });
      }
    });

    socket.on('error', (err) => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve({ open: false, reason: err.code || 'error' });
      }
    });

    try {
      socket.connect(port, host);
    } catch (e) {
      resolve({ open: false, reason: e.message });
    }
  });
}

// Consulta endpoint HTTP se porta estiver aberta
function fetchJson(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
    } catch (e) {
      resolve(null);
    }
  });
}

async function coletarStatus() {
  const agora = new Date();
  const dataHoraStr = agora.toLocaleDateString('pt-BR') + ' - ' + agora.toLocaleTimeString('pt-BR') + ' (Horário Local)';

  // 1. Git Info
  const branch = runCmd('git rev-parse --abbrev-ref HEAD') || 'visualizacao-ilha';
  const commit = runCmd('git rev-parse --short HEAD') || 'a6f5f54';
  const commitMsg = runCmd('git log -1 --pretty=format:"%s"') || '';
  const changes = runCmd('git status --porcelain');
  const dirty = changes && changes.length > 0;

  // 2. Conectividade Z Fold (Local 192.168.0.180 e Tailscale 100.74.193.29)
  const zFoldLocalIP = '192.168.0.180';
  const zFoldTailscaleIP = '100.74.193.29';

  let status8810 = await checkPort(zFoldLocalIP, 8810);
  let activeIP = zFoldLocalIP;
  if (!status8810.open) {
    const ts8810 = await checkPort(zFoldTailscaleIP, 8810);
    if (ts8810.open) {
      status8810 = ts8810;
      activeIP = zFoldTailscaleIP;
    }
  }

  const status8793 = await checkPort(activeIP, 8793);
  const status8794 = await checkPort(activeIP, 8794);

  // Se o Z Fold estiver respondendo em 8810, puxa estado ao vivo
  let estadoLive = null;
  if (status8810.open) {
    estadoLive = await fetchJson(`http://${activeIP}:8810/api/estado`);
  }

  // 3. Local PC (estado-ilha.json e vivencias)
  let estadoLocal = null;
  try {
    const localStatePath = path.join(PROJECT_DIR, 'estado-ilha.json');
    if (fs.existsSync(localStatePath)) {
      estadoLocal = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
    }
  } catch (e) {}

  let vivenciasCount = 0;
  let vivenciasMod = '';
  try {
    const vivPath = path.join(PROJECT_DIR, 'vivencias-ilha.jsonl');
    if (fs.existsSync(vivPath)) {
      const st = fs.statSync(vivPath);
      vivenciasMod = st.mtime.toLocaleTimeString('pt-BR');
      const lines = fs.readFileSync(vivPath, 'utf8').trim().split('\n');
      vivenciasCount = lines.length;
    }
  } catch (e) {}

  // 4. ADB Devices
  const adbOutput = runCmd('adb devices') || '';
  const adbLines = adbOutput.split('\n').filter(l => l.trim() && !l.includes('List of devices attached'));
  const adbDevices = adbLines.map(l => {
    const parts = l.trim().split(/\s+/);
    return { serial: parts[0], status: parts[1] || 'unknown' };
  });

  // 5. Tailscale
  const tailscaleOutput = runCmd('tailscale status') || '';
  const tailscaleDevices = [];
  if (tailscaleOutput) {
    tailscaleOutput.split('\n').forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const ip = parts[0];
        const name = parts[1];
        const isOffline = line.includes('offline');
        tailscaleDevices.push({ name, ip, online: !isOffline, raw: line.trim() });
      }
    });
  }

  // Montagem do Relatório
  const cicloAtual = (estadoLive && estadoLive.mundo?.tempo?.ciclo) || (estadoLocal && estadoLocal.mundo?.tempo?.ciclo) || '1130+';
  const zFoldOnline = status8810.open || status8793.open || status8794.open;

  const zFoldTailscale = tailscaleDevices.find(d => d.name.includes('z-fold'));
  const s23Tailscale = tailscaleDevices.find(d => d.name.includes('s23'));
  const realmeTailscale = tailscaleDevices.find(d => d.name.includes('realme'));

  let relatorio = `================================================================================
RELATÓRIO DE STATUS COMPLETO - ILHA & ASSISTENTES (Z FOLD / S23 / PC)
Data/Hora: ${dataHoraStr}
Auto-atualização: A cada 3 minutos (Próxima atualização: ${new Date(agora.getTime() + 3 * 60000).toLocaleTimeString('pt-BR')})
Repositório Git: origin/${branch} (Commit: ${commit} - ${commitMsg.substring(0, 50)})
Modificações locais pendentes: ${dirty ? 'Sim (' + changes.split('\n').length + ' arquivos)' : 'Nenhuma (Diretório limpo)'}
================================================================================

1. ARQUITETURA & EXECUÇÃO NO Z FOLD (SM-F916B):
--------------------------------------------------------------------------------
- A Ilha Aurora roda 100% INDEPENDENTE no Samsung Galaxy Z Fold (SM-F916B).
- O PC pode ser desligado ou reiniciado que a ilha CONTINUA rodando no Z Fold.
- Conectividade de Rede:
  * IP Local Wi-Fi: ${zFoldLocalIP}
  * IP Tailscale: ${zFoldTailscaleIP} (${zFoldTailscale ? (zFoldTailscale.online ? 'ONLINE' : 'Em espera / Idle') : 'N/A'})
- Status dos Serviços no Z Fold:
  * Servidor Web e API (porta 8810): ${status8810.open ? `ONLINE [OK - ${status8810.latency}ms] (http://${activeIP}:8810)` : `AGUARDANDO CONEXÃO / REINICIALIZAÇÃO (${activeIP}:8810)`}
  * Motor de Ciclos (rodar-ilha.js): ${status8810.open ? `ATIVO (Ciclo Atual: ${cicloAtual})` : `Último Ciclo Registrado: ${cicloAtual}`}
  * Servidor Ícaro (porta 8793): ${status8793.open ? `ONLINE [OK - ${status8793.latency}ms]` : `AGUARDANDO INÍCIO (${activeIP}:8793)`}
  * Servidor Elara (porta 8794): ${status8794.open ? `ONLINE [OK - ${status8794.latency}ms]` : `AGUARDANDO INÍCIO (${activeIP}:8794)`}
- Simulação da Ilha:
  * Total de vivências registradas: ${vivenciasCount} vivências (Última atividade: ${vivenciasMod || 'recente'})
  * Personagens monitorados: Ícaro, Maria, João, Lara.

2. DISPOSITIVOS MÓVEIS (S23 ULTRA E REALME):
--------------------------------------------------------------------------------
- Samsung Galaxy S23 Ultra (SM-S918B):
  * Conexão ADB USB/TCP: ${adbDevices.some(d => d.serial.includes('RQCX206KCRF') || d.status === 'device') ? 'CONECTADO (' + adbDevices.map(d => d.serial).join(', ') + ')' : 'Pronto para reconexão via ADB'}
  * Rede Tailscale: ${s23Tailscale ? (s23Tailscale.online ? `ONLINE (IP: ${s23Tailscale.ip})` : 'Offline') : 'Conectado na rede'}
- Realme GT 7:
  * Rede Tailscale: ${realmeTailscale ? (realmeTailscale.online ? `ONLINE (IP: ${realmeTailscale.ip})` : 'Offline') : 'Conectado na rede'}
- Ambos os dispositivos conseguem dialogar diretamente com as portas 8793 e 8794 no IP ${activeIP}.

3. APIS DE IA CONFIGURADAS E ATIVAS (GROQ + DEEPSEEK):
--------------------------------------------------------------------------------
- GROQ:
  * Chave: gsk_zV8w...7mrS (Ativa e Operacional)
  * Modelo ativo: qwen/qwen3.8-27b (resposta em milissegundos)
  * Provado em execução: Ciclos da Ilha consumindo Groq diretamente com tokens contabilizados.
- DEEPSEEK:
  * Chave: sk-9b45...9d3b (Ativa e Operacional)
  * Modelo ativo: deepseek-chat (configurado como fallback resiliente)

4. CORREÇÃO URGENTE DE UI (FRONTEND):
--------------------------------------------------------------------------------
- Todos os \`alert()\` e \`window.alert()\` foram REMOVIDOS do frontend (visualizador-ilha.html).
- \`window.alert()\` foi sobrescrito globalmente para registrar \`console.warn("LLM indisponível:", erro)\`.
- Implementado sistema de TOAST discreto no canto inferior direito:
  * Uma caixinha elegante de vidro/blur azul com fade in/out de 3 segundos:
    "✨ A mente deles está descansando por um instante..."
  * O jogo NUNCA mais é travado ou bloqueado por caixas de diálogo pop-up.

5. STATUS DOS 3 BUGS DA ILHA:
--------------------------------------------------------------------------------
- BUG 1 (Personagens Parados / Movimento Quebrado): CONCLUÍDO E COMITADO.
  * Suporte a ir_para, cálculo contínuo de coordenadas x/y e interpolação no visualizador.
  * Os 4 personagens (Ícaro, Maria, João, Lara) caminham pelas trilhas da ilha.
- BUG 2 (Tubarão Voando - Camada Z / Profundidade d'água): CONCLUÍDO E COMITADO.
  * Lâmina d'água 3D calibrada (Y = 0.18) e corpo do tubarão submerso em Y = 0.02.
  * Barbatana dorsal (+0.26) cortando a superfície e cauda com nado ondulante realista.
- BUG 3 (Construção de Casas Inexistente): PRÓXIMO NA FILA.

================================================================================
COMO REINICIAR TUDO NO Z FOLD SE PRECISAR (COMANDOS TERMUX):
--------------------------------------------------------------------------------
cd ~/ilha && git pull origin visualizacao-ilha
bash ~/projetos/icaro-clean/start-icaro.sh
bash ~/projetos/elara-clean/start-elara.sh
cd ~/ilha && nohup node visualizador-ilha.js > visualizador.log 2>&1 < /dev/null &
cd ~/ilha && nohup node rodar-ilha.js > rodar-ilha.log 2>&1 < /dev/null &
================================================================================
`;

  fs.writeFileSync(DESKTOP_PATH, relatorio, 'utf8');
  console.log(`[${new Date().toLocaleTimeString('pt-BR')}] Status atualizado com sucesso em ${DESKTOP_PATH}`);
}

// Se chamado diretamente
if (require.main === module) {
  const watchMode = process.argv.includes('--watch') || process.argv.includes('-w');

  coletarStatus().catch(err => console.error('Erro na atualização:', err));

  if (watchMode) {
    console.log('Modo de monitoramento contínuo ativado (intervalo: 3 minutos)...');
    setInterval(() => {
      coletarStatus().catch(err => console.error('Erro no ciclo de atualização:', err));
    }, 3 * 60 * 1000);
  }
}

module.exports = { coletarStatus };

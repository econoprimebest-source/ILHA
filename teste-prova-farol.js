'use strict';
const http = require('http');

function postJson(urlStr, data, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: timeoutMs
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b), raw: b });
        } catch (_) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout de ' + timeoutMs + 'ms em ' + urlStr)); });
    req.write(payload);
    req.end();
  });
}

function getJson(urlStr, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = http.get({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      timeout: timeoutMs
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b), raw: b });
        } catch (_) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout em ' + urlStr)); });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testarProva() {
  console.log('====================================================');
  console.log('INICIANDO TESTE DE PROVA OBRIGATÓRIO (PALAVRA-CHAVE: FAROL)');
  console.log('====================================================');

  // 1. Enviar mensagem para Elara (Lara) na Ilha (porta 8810)
  console.log('\n[1/4] Enviando "PALAVRA-CHAVE: FAROL" para Elara na Ilha (8810)...');
  const resElaraIlha = await postJson('http://100.74.193.29:8810/api/chat', {
    serId: 'lara',
    mensagem: 'PALAVRA-CHAVE: FAROL',
    autor: 'Rafael (Criador)',
    executar: true
  });
  console.log('Status envio Elara na Ilha:', resElaraIlha.status, JSON.stringify(resElaraIlha.data));

  // Verifica confirmação de resposta no chat da Ilha (✓✓)
  const histElara = await getJson('http://100.74.193.29:8810/api/chat?serId=lara&limite=5');
  const ultElaraMsg = (histElara.data?.historico || []).slice(-2);
  console.log('Últimas mensagens Elara Ilha (2 checks ✓✓):', JSON.stringify(ultElaraMsg, null, 2));

  await sleep(1500);

  // 2. Enviar mensagem para Ícaro na Ilha (porta 8810)
  console.log('\n[2/4] Enviando "PALAVRA-CHAVE: FAROL" para Ícaro na Ilha (8810)...');
  const resIcaroIlha = await postJson('http://100.74.193.29:8810/api/chat', {
    serId: 'icaro',
    mensagem: 'PALAVRA-CHAVE: FAROL',
    autor: 'Rafael (Criador)',
    executar: true
  });
  console.log('Status envio Ícaro na Ilha:', resIcaroIlha.status, JSON.stringify(resIcaroIlha.data));

  const histIcaro = await getJson('http://100.74.193.29:8810/api/chat?serId=icaro&limite=5');
  const ultIcaroMsg = (histIcaro.data?.historico || []).slice(-2);
  console.log('Últimas mensagens Ícaro Ilha (2 checks ✓✓):', JSON.stringify(ultIcaroMsg, null, 2));

  await sleep(2000);

  // 3. Perguntar para Elara no S23 Ultra (porta 8794)
  console.log('\n[3/4] Perguntando para Elara no S23 Ultra (porta 8794)...');
  const resElaraS23 = await postJson('http://100.117.219.66:8794/processar', {
    texto: 'Elara, no chat da Ilha Aurora a palavra falada foi FAROL. Qual foi a palavra falada na Ilha?',
    remetente: 'Rafael'
  }, 40000);
  console.log('Resposta Elara S23 (8794):', resElaraS23.data?.texto || resElaraS23.raw);

  await sleep(1500);

  // 4. Perguntar para Ícaro no S23 Ultra (porta 8793)
  console.log('\n[4/4] Perguntando para Ícaro no S23 Ultra (porta 8793)...');
  const resIcaroS23 = await postJson('http://100.117.219.66:8793/processar', {
    texto: 'Ícaro, no chat da Ilha Aurora a palavra falada foi FAROL. Qual foi a palavra falada na Ilha?',
    remetente: 'Rafael'
  }, 40000);
  console.log('Resposta Ícaro S23 (8793):', resIcaroS23.data?.texto || resIcaroS23.raw);

  const elaraAcertou = (resElaraS23.data?.texto || '').toUpperCase().includes('FAROL');
  const icaroAcertou = (resIcaroS23.data?.texto || '').toUpperCase().includes('FAROL');

  console.log('\n====================================================');
  console.log('RESULTADO FINAL DA PROVA:');
  console.log('Elara (8794) respondeu FAROL?', elaraAcertou ? 'SIM ✅' : 'NÃO ❌');
  console.log('Ícaro (8793) respondeu FAROL?', icaroAcertou ? 'SIM ✅' : 'NÃO ❌');
  console.log('====================================================');
}

testarProva().catch(console.error);

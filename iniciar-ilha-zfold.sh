#!/data/data/com.termux/files/usr/bin/bash
DIR="/data/data/com.termux/files/home/projetos/ilha"
cd "$DIR" || exit 1

echo "[ILHA-ZFOLD] Parando processos anteriores..."
pkill -f "visualizador-ilha.js" 2>/dev/null
pkill -f "rodar-ilha.js" 2>/dev/null
sleep 1

echo "[ILHA-ZFOLD] Iniciando Visualizador na porta 8810..."
nohup node visualizador-ilha.js > /data/data/com.termux/files/home/ilha-visualizador-8810.log 2>&1 &

echo "[ILHA-ZFOLD] Iniciando Motor Autonomo da Ilha..."
nohup node rodar-ilha.js > /data/data/com.termux/files/home/ilha-motor.log 2>&1 &

sleep 2
echo "[ILHA-ZFOLD] Processos ativos:"
pgrep -fl "node.*(visualizador|rodar)" || ps aux | grep node

echo "[ILHA-ZFOLD] Testando endpoint /api/snapshot..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8810/api/snapshot)
echo "[ILHA-ZFOLD] HTTP Status da porta 8810: $STATUS"

if [ "$STATUS" = "200" ]; then
  echo "[ILHA-ZFOLD] 🟢 SUCESSO: ILHA AURORA RODANDO 100% NO Z FOLD NA PORTA 8810!"
else
  echo "[ILHA-ZFOLD] AVISO: Porta 8810 retornou $STATUS"
fi

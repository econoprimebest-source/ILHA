const fs=require('fs'),path=require('path'),P=path.join(__dirname,'memoria-v2.json');function carregar(){return fs.existsSync(P)?JSON.parse(fs.readFileSync(P,'utf8')):{fatos:[],eventos:[],hipoteses:[],criacoes:[],tracos:[]}}function salvar(m){fs.writeFileSync(P,JSON.stringify(m,null,2),'utf8')}function fatosAtivos(m){return(m.fatos||[]).filter(f=>f.status==='ativo')}function fatosSobre(m,s){return fatosAtivos(m).filter(f=>f.sujeito===s)}function fraseFato(f){const s=f.sujeito||'';const p=f.predicado||'';const o=f.objeto||'';const par=f.parente||null;if(par){const rel=par==='irma'||par==='irmã'?'O '+par+' de '+s:'O '+par+' de '+s;if(p==='nome')return rel+' se chama '+o+'.';if(p==='mora em')return rel+' mora em '+o+'.';if(p==='idade')return rel+' tem '+o+' anos.';if(p==='gosta de')return rel+' gosta de '+o+'.';return rel+' - '+p+': '+o+'.';}const k=(f.chaves||[]).filter(x=>x&&!p.toLowerCase().includes(x)&&!o.toLowerCase().includes(x)&&!s.toLowerCase().includes(x));const extras=k.length?' (relacionado: '+k.slice(0,4).join(', ')+')':'';function comExtras(txt){return txt+extras}if(p==='nome')return comExtras(s+' se chama '+o+'.');if(p==='aniversario')return comExtras(s+' faz aniversario em '+o+'.');if(p==='cachorro')return comExtras(s+' tem um cachorro chamado '+o+'.');if(p==='jogo favorito')return comExtras('O jogo favorito de '+s+' e '+o+'.');if(p==='mora em')return comExtras(s+' mora em '+o+'.');if(p==='idade')return comExtras(s+' tem '+o+'.');if(p==='profissao')return comExtras(s+' trabalha com '+o+'.');if(p==='irma')return comExtras(s+' tem uma irma chamada '+o+'.');if(p==='filho')return comExtras(s+' tem um filho chamado '+o+'.');if(p==='esporte favorito')return comExtras('O esporte favorito de '+s+' e '+o+'.');if(p==='receita de feijao')return comExtras(s+' tem uma receita de feijao: '+o+'.');if(p==='identidade')return comExtras(s+' e '+o+'.');if(p==='criacao')return o;return p+' de '+s+': '+o+'.'}function registrarEvento(m,e){const a=new Date(),exp=new Date(a.getTime()+(e.ttlDias||7)*864e5);(m.eventos=m.eventos||[]).push({role:e.role,content:e.content,origem:e.origem,at:a.toISOString(),expiraEm:exp.toISOString()})}function limparEventosExpirados(m){const a=new Date();m.eventos=(m.eventos||[]).filter(e=>new Date(e.expiraEm)>a)}function registrarHipotese(m,h){const hh=(m.hipoteses=m.hipoteses||[]),ex=hh.find(x=>x.sinal===h.sinal);ex?(ex.ocorrencias=(ex.ocorrencias||1)+1,ex.ultimaVez=new Date().toISOString()):hh.push({sinal:h.sinal,contexto:h.contexto,ocorrencias:1,at:new Date().toISOString(),ultimaVez:new Date().toISOString()})}function registrarCriacao(m,c){(m.criacoes=m.criacoes||[]).push({texto:c.texto,at:new Date().toISOString(),dono:'icaro',status:'criacao'})}function semAcento(s){return String(s||"").toLowerCase().normalize("NFD").split("").filter(function(c){var x=c.charCodeAt(0);return !(x>=768&&x<=879)}).join("")}

// === TRACOS (30/09/2026) ===
// Traco = padrao recorrente. Nao e programado. Nao e irreversivel. Sem auto-reforco.
const CLUSTERS_SEMANTICOS = {
  'interesses': ['jogo favorito', 'esporte favorito', 'hobby', 'receita de feijao'],
  'vinculos': ['filho', 'filha', 'irma', 'pai', 'mae', 'cachorro'],
  'localidade': ['mora em', 'cidade', 'bairro'],
  'identidade': ['nome', 'idade', 'aniversario', 'profissao']
};

// @deprecated 02/10/2026 — SUBSTITUIDO por nucleo-tracos.js (two-timescale).
// Nao chamar em codigo novo. Mantido apenas para referencia historica.
// Sera removido em versao futura. Ver CHECKPOINT-2026-10-02.md secao 15.
function detectarTracos(m) {
  const out = [];
  m.tracos = m.tracos || [];
  const fatos = (m.fatos || []).filter(f => f && f.status === 'ativo' && semAcento(f.sujeito || '') !== 'icaro');
  for (const cluster of Object.keys(CLUSTERS_SEMANTICOS)) {
    const preds = CLUSTERS_SEMANTICOS[cluster];
    const noCluster = fatos.filter(f => preds.indexOf(semAcento(f.predicado || '')) >= 0);
    if (noCluster.length < 3) continue;
    const datas = new Set();
    for (const f of noCluster) {
      const d = String(f.at || '').slice(0, 10);
      if (d) datas.add(d);
    }
    if (datas.size < 2) continue;
    const sujeito = noCluster[0].sujeito;
    const evidencias = noCluster.map(f => ({ predicado: f.predicado, objeto: f.objeto, at: f.at }));
    const forca = Math.min(1, noCluster.length / 5);
    const existente = m.tracos.find(t => t && t.cluster === cluster && semAcento(t.sujeito || '') === semAcento(sujeito));
    if (existente) {
      existente.evidencias = evidencias;
      existente.forca = forca;
      existente.ultimaAtualizacao = new Date().toISOString();
      existente.status = forca >= 0.4 ? 'ativo' : 'enfraquecido';
      out.push({ atualizado: true, traco: existente });
    } else {
      const novo = {
        tipo: 'traco',
        cluster: cluster,
        sujeito: sujeito,
        padrao: sujeito + ' tem ' + cluster + ' recorrente (' + evidencias.slice(0,3).map(e => e.objeto).join(', ') + ')',
        evidencias: evidencias,
        forca: forca,
        formadoEm: new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString(),
        status: 'ativo'
      };
      m.tracos.push(novo);
      out.push({ criado: true, traco: novo });
    }
  }
  return out;
}

function lerTracosAtivos(m) {
  return (m.tracos || []).filter(t => t && t.status === 'ativo' && t.forca >= 0.4);
}

function fraseTraco(t) {
  return String(t.padrao || '');
}

module.exports={semAcento,P,carregar,salvar,fatosAtivos,fatosSobre,fraseFato,registrarEvento,limparEventosExpirados,registrarHipotese,registrarCriacao, detectarTracos, lerTracosAtivos, fraseTraco };
'use strict';
const cortex=require('./cortex');
const {statusDe}=require('./seres');

// Ecology runs once per world cycle, regardless of which being acts.
const { eventos } = require('./calendario');

const LIMITES = { agua: 1000, lago: 800 };

// MORADIA (condição inicial do mundo, não escolha de comportamento):
// o casal João–Maria divide a casa perto do bosque; a Lara, irmã do Ícaro,
// mora na mesma casa do irmão (Casa do Ícaro, junto ao acampamento).
const MORADIA = { joao:'casa_joao', maria:'casa_joao', lara:'casa_icaro' };

function preparar(estado) {
  const mundo = estado.mundo;
  const eco = mundo.ecossistema;
  eco.ecologiaCompleta = true;
  eco.agua.fontes ||= {};
  eco.agua.fontes.nascente ||= { nivel: eco.agua.nascente, capacidade: eco.agua.limite, qualidade: .94, recarga: 0 };
  eco.agua.fontes.lago ||= { nivel: 800, capacidade: LIMITES.lago, qualidade: .88, recarga: 0 };
  eco.agua.fontes.poco ||= { nivel: 0, capacidade: 180, qualidade: .72, recarga: 0 };
  for (const f of Object.values(eco.agua.fontes)) {
    f.nivel = Math.max(0, Math.min(f.capacidade, Number(f.nivel) || 0));
    f.qualidade = Math.max(0, Math.min(1, Number(f.qualidade) || 0));
    f.recarga = Math.max(0, Number(f.recarga) || 0);
  }
  eco.vegetacao ||= { sementes: 0, bancoSementes: {} };
  eco.vegetacao.bancoSementes ||= {};
  eco.arvores ||= {};
  for (const [id, a] of Object.entries(eco.arvores)) {
    a.id ||= id; a.especie ||= id === 'c' ? 'madeireira' : 'frutifera';
    a.crescimento ??= .02; a.sementes ??= 0; a.viva ??= a.saude > 0;
    a.frutos ??= 0; a.capacidadeFrutos ??= 0; a.saude ??= 0; a.idade ??= 0;
  }
  eco.fauna ||= {};
  eco.fauna.peixes ||= eco.peixes.rio;
  eco.fauna.aves ||= eco.animais.aves;
  eco.fauna.mamiferos ||= eco.animais.roedores;
  for (const [id, p] of Object.entries(eco.fauna)) {
    p.local ||= id === 'peixes' ? 'lago' : id === 'mamiferos' ? 'floresta' : 'bosque';
    p.alimento ||= id === 'peixes' ? 'vegetacao_aquatica' : 'frutos';
    p.reproducao ??= id === 'peixes' ? .025 : .012;
    p.mortalidade ??= .003; p.migracao ??= 0;
    if (id !== 'peixes') {
      p.individuos ||= Array.from({ length: Math.min(60, Math.floor(p.populacao)) }, (_, i) => ({
        id: `${id}-${i + 1}`, idade: (i * 7 + 3) % 36, sexo: i % 2 ? 'femea' : 'macho',
        saude: 70 + (i * 13) % 31, energia: 60 + (i * 11) % 41, local: p.local,
        necessidades: { alimento: 0, agua: 0, seguranca: 10 }
      }));
    }
  }
  eco.clima ||= { tipo: mundo.clima, temperatura: 22, umidade: .65, vento: .2 };
  estado.seres ||= {};
  for (const [id, nome] of [['maria', 'Maria'], ['joao', 'João'], ['lara', 'Lara']]) {
    if (!estado.seres[id]) estado.seres[id] = criarSer(id, nome);
  }
  for (const ser of Object.values(estado.seres)) {
  cortex.garantir(ser, estado.mundo.tempo.ciclo);
    ser.necessidades ||= {};
    ser.necessidades.solidao ??= 0;
    ser.necessidades.seguranca ??= 25;
    ser.necessidades.confianca ??= 50;
    ser.necessidades.pertencimento ??= 30;
    ser.necessidades.frustracao ??= 0;
    ser.necessidades.satisfacao ??= 50;
    ser.inventario ||= { agua: 2, alimento: 2, madeira: 0 };
    ser.capacidades ||= { coleta: .5, pesca: .25, forca: .4, resistencia: .5 };
    ser.experiencia ||= [];
    ser.memoria ||= [];
    ser.local ||= 'acampamento';
    ser.status ||= 'vivo';
    ser.vinculos ||= {};
    ser.casa ||= 'casa_'+ser.id;
    // MORADIA DO MUNDO: João e Maria são casados e moram na MESMA casa; a
    // Lara mora na casa do irmão. Normaliza o padrão antigo ('casa_'+id) e o
    // antigo default da Lara ('acampamento' — ainda sem mecanismo de escolha
    // própria); uma moradia escolhida depois nunca é reescrita.
    const moradia=MORADIA[ser.id];
    if(moradia&&ser.casa==='casa_'+ser.id&&ser.casa!==moradia)ser.casa=moradia;
    if(ser.id==='lara'&&ser.casa==='acampamento')ser.casa='casa_icaro';
  }
  estado.rastro ||= [];
  estado.relacoes ||= {};
  for (const a of Object.keys(estado.seres)) for (const b of Object.keys(estado.seres)) {
    if (a !== b) estado.relacoes[a] ||= {}, estado.relacoes[a][b] ??= 50;
  }
  // IDENTIDADE INICIAL (autores do mundo): passado, história, personalidade,
  // conhecimentos e relações iniciais — idempotente, nunca reescreve.
  require('./historia-previa').aplicar(estado);
  // Estado existente carregava a residência antiga da Lara; alinha à moradia
  // vigente sem tocar em nada mais (aplicar continua idempotente).
  const lara=estado.seres.lara;
  if(lara&&lara.historia&&lara.historia.residencia==='acampamento')lara.historia.residencia='casa_icaro';
  // MEMÓRIA DE PERSONAGEM (M1): cada personagem nasce com a própria
  // identidade na memória (chat do ICAROOVO isolado). Inerte fora dos testes
  // e fora da produção: só roda com o adaptador ativo.
  require('./memoria-personagem').semearSeres(estado);
  return validarCompleto(estado);
}

function validarCompleto(estado) {
  const fail = m => { throw Error('Mundo V5 invÃ¡lido: '+m); }, eco=estado.mundo?.ecossistema;
  if(!estado.seres?.icaro||!estado.seres?.maria||!estado.seres?.joao||!estado.seres?.lara)fail('seres participantes ausentes');
  for(const [nome,f] of Object.entries(eco?.agua?.fontes||{}))if(!Number.isFinite(f.nivel)||!Number.isFinite(f.capacidade)||f.nivel<0||f.nivel>f.capacidade||!Number.isFinite(f.qualidade)||f.qualidade<0||f.qualidade>1)fail(`fonte de Ã¡gua ${nome}`);
  for(const [id,a] of Object.entries(eco?.arvores||{}))if(!Number.isFinite(a.idade)||a.idade<0||!Number.isFinite(a.saude)||a.saude<0||a.saude>100||!Number.isFinite(a.frutos)||a.frutos<0||a.frutos>a.capacidadeFrutos)fail(`Ã¡rvore ${id}`);
  for(const [id,p] of Object.entries(eco?.fauna||{})){if(!Number.isFinite(p.populacao)||p.populacao<0||p.populacao>p.capacidade)fail(`populaÃ§Ã£o ${id}`);for(const a of p.individuos||[])if(!Number.isFinite(a.idade)||a.idade<0||!Number.isFinite(a.saude)||a.saude<0||a.saude>100||!Number.isFinite(a.energia)||a.energia<0||a.energia>100)fail(`indivÃ­duo ${a.id}`)}
  for(const [id,s] of Object.entries(estado.seres)){if(!Array.isArray(s.memoria)||!Array.isArray(s.experiencia)||!['vivo','critico','morto'].includes(s.status))fail(`agente ${id}`);for(const [k,v] of Object.entries(s.necessidades))if(!Number.isFinite(v)||v<0||v>100)fail(`necessidade ${id}.${k}`);for(const [k,v] of Object.entries(s.inventario))if(!Number.isFinite(v)||v<0)fail(`inventÃ¡rio ${id}.${k}`)}
  for(const [a,rel] of Object.entries(estado.relacoes||{}))for(const [b,v] of Object.entries(rel))if(a===b||!Number.isFinite(v)||v<0||v>100)fail(`relaÃ§Ã£o ${a}/${b}`);
  return estado;
}

function criarSer(id, nome) {
  return { id, nome, especie: 'humano', status: 'vivo', local: 'acampamento',
    necessidades: { agua: 8, alimento: 10, sono: 10, energia: 75, temperatura: 0, abrigo: 0, higiene: 0, saude: 100, seguranca: 25, medo: 0, solidao: 20, frustracao: 0, satisfacao: 50, curiosidade: 0, tristeza: 0, confianca: 50, pertencimento: 30 },
    capacidades: { coleta: .5, pesca: .25, forca: .4, resistencia: .5 }, inventario: { agua: 2, alimento: 2, madeira: 0 }, abrigo: 1,
    experiencia: [], memoria: [], vinculos: {} };
}

function climaDoCiclo(mundo) {
  const tempo = mundo.tempo, sazonal = eventos(tempo);
  let tipo = sazonal.chuva, temperatura = 22, umidade = .58;
  if (tempo.estacao === 'seca') { temperatura += 8; umidade -= .22; }
  if (tempo.estacao === 'chuvas') { temperatura += 2; umidade += .28; }
  if (tipo.includes('chuva')) temperatura -= tipo === 'chuva_forte' ? 4 : 2;
  if (tipo === 'seco') temperatura += 2;
  return { tipo, temperatura, umidade: Math.max(.05, Math.min(.98, umidade)), vento: tipo === 'chuva_forte' ? .85 : .25 };
}

function atualizarMundo(estado, acaoHumana = null) {
  const m = estado.mundo, e = m.ecossistema, ev = eventos(m.tempo), clima = climaDoCiclo(m);
  e.clima = clima; m.clima = clima.tipo;
  const chuva = clima.tipo === 'chuva_forte' ? 12 : clima.tipo === 'chuva' ? 6 : clima.tipo === 'chuva_fraca' ? 2 : 0;
  for (const [nome, f] of Object.entries(e.agua.fontes)) {
    const evap = (nome === 'lago' ? .8 : .12) * (clima.temperatura / 22) * (1 - clima.umidade);
    const recarga = chuva * (nome === 'lago' ? .7 : nome === 'nascente' ? .2 : .1) + f.recarga;
    f.nivel = Math.max(0, Math.min(f.capacidade, f.nivel + recarga - evap));
    f.recarga = 0;
  }
  e.agua.nascente = e.agua.fontes.nascente.nivel;
  e.agua.chuvaAcumulada += chuva;

  let pressaoColeta = acaoHumana === 'colher_frutas' ? .12 : 0;
  for (const a of Object.values(e.arvores)) {
    if (!a.viva || a.saude <= 0) {
      a.viva = false; e.vegetacao.bancoSementes[a.especie] = (e.vegetacao.bancoSementes[a.especie] || 0) + (a.sementes || 0); a.sementes=0;
      continue;
    }
    const seca = clima.umidade < .5 ? (clima.umidade < .38 ? .35 : .12) : 0;
    const crescimento = (ev.regeneracaoVegetal ? a.crescimento : a.crescimento * .25) * (clima.umidade > .6 ? 1.3 : .7);
    a.saude = Math.max(0, Math.min(100, a.saude + crescimento - seca));
    a.idade += 1 / 120;
    if (ev.frutificacao && a.especie === 'frutifera' && a.saude > 15) a.frutos = Math.min(a.capacidadeFrutos, a.frutos + Math.max(.03, a.saude / 100 * (clima.umidade > .5 ? .28 : .08)));
    else a.frutos = Math.max(0, a.frutos - .025 - pressaoColeta);
    if (a.frutos >= a.capacidadeFrutos * .8) a.sementes = Math.min(20, a.sementes + .08);
    if (a.idade > 80 && a.saude < 30) a.saude = Math.max(0, a.saude - .15);
    if (a.saude === 0) a.viva = false;
  }
  if (ev.regeneracaoVegetal && clima.umidade > .45) {
    const seeds = e.vegetacao.bancoSementes.frutifera || 0;
    const count = Object.keys(e.arvores).length;
    if (seeds >= 1 && count < 24) {
      const id = `natural-${m.tempo.ciclo}`;
      e.arvores[id] = { id, especie: 'frutifera', local: 'bosque', idade: 0, saude: 25, viva: true, frutos: 0, capacidadeFrutos: 6, crescimento: .03, sementes: 0 };
      e.vegetacao.bancoSementes.frutifera -= 1;
    }
  }

  let frutosDisponiveis=Object.values(e.arvores).reduce((n,a)=>n+(a.viva?a.frutos:0),0);
  for (const [id, p] of Object.entries(e.fauna)) {
    let alimento;
    if(id==='peixes') alimento=Math.max(.1,e.agua.fontes.lago.nivel/e.agua.fontes.lago.capacidade);
    else {
      const demanda=p.populacao*(id==='aves'?.012:.018),consumo=Math.min(frutosDisponiveis,demanda);
      alimento=demanda>0?consumo/demanda:1;frutosDisponiveis-=consumo;
      let restante=consumo;for(const arvore of Object.values(e.arvores).filter(a=>a.viva).sort((a,b)=>b.frutos-a.frutos)){const q=Math.min(restante,arvore.frutos);arvore.frutos-=q;restante-=q;if(restante<=0)break;}
    }
    const secaImpacto = clima.umidade < .4 ? .012 : 0;
    const reproducao = (ev.reproducaoPeixes || ev.frutificacao ? p.reproducao : p.reproducao * .2) * alimento;
    const mortalidade = p.mortalidade + secaImpacto + Math.max(0, .55 - alimento) * .02;
    p.populacao = Math.max(0, Math.min(p.capacidade, p.populacao * (1 + reproducao - mortalidade)));
    p.idadeMedia = Math.max(0, (p.idadeMedia || 0) + .005 - (reproducao > .01 ? .002 : 0));
    p.migracao = Math.max(0, Math.min(1, .15 + Math.max(0, .55 - alimento)));
    p.local = id === 'peixes' ? 'rio' : alimento < .25 && clima.umidade < .5 ? 'rio' : id === 'mamiferos' && alimento > .5 ? 'bosque' : (id === 'mamiferos' ? 'floresta' : 'bosque');
    if (id !== 'peixes') {
      const alvo = Math.min(60, Math.floor(p.populacao));
      while (p.individuos.length > alvo) {
        const pior = p.individuos.reduce((ix, a, i, xs) => a.saude < xs[ix].saude ? i : ix, 0);
        p.individuos.splice(pior, 1);
      }
      while (p.individuos.length < alvo) {
        const i = p.individuos.length, serial = m.tempo.ciclo * 100 + i;
        p.individuos.push({ id: `${id}-n${serial}`, idade: 0, sexo: i % 2 ? 'femea' : 'macho', saude: 80, energia: 80, local: p.local, necessidades: { alimento: 0, agua: 0, seguranca: 10 } });
      }
      for (const animal of p.individuos) {
        animal.idade += 1 / 120; animal.local = p.local;
        animal.energia = Math.max(0, animal.energia - (alimento < .35 ? 1.2 : .35));
        animal.saude = Math.max(0, Math.min(100, animal.saude + (alimento > .65 ? .08 : -.12) - (animal.idade>80?.2:0)));
        animal.necessidades.alimento = Math.min(100, animal.necessidades.alimento + (alimento < .35 ? 1.2 : .35));
        animal.necessidades.agua = Math.min(100, animal.necessidades.agua + (clima.umidade<.4?1:.2));
        animal.necessidades.seguranca = Math.max(0,Math.min(100,animal.necessidades.seguranca+(clima.vento>.7?1:.05)));
      }
      p.individuos = p.individuos.filter(a => a.saude > 0 && a.energia > 0);
      p.populacao = p.individuos.length;
    }
  }
  e.peixes.rio = e.fauna.peixes;
  e.animais.aves = e.fauna.aves; e.animais.roedores = e.fauna.mamiferos;
  return { chuva, clima, estacao: m.tempo.estacao };
}

function atualizarVidaSocial(estado,ser,acao){
  const n=ser.necessidades,cl=estado.mundo.ecossistema.clima,vivos=Object.values(estado.seres).filter(x=>x.id!==ser.id&&x.status!=='morto'),presentes=vivos.filter(x=>x.local===ser.local);
  n.solidao=Math.max(0,Math.min(100,(n.solidao??0)+(acao==='conviver'&&presentes.length?-8:.12)));
  n.pertencimento=Math.max(0,Math.min(100,(n.pertencimento??30)+(acao==='conviver'&&presentes.length?1.5:-.015)));
  n.seguranca=Math.max(0,Math.min(100,(n.seguranca??30)+(cl.vento>.7?1:-.05)));
  const resolveu=['beber','comer','conviver','colher_frutas','pescar','coletar_agua'].includes(acao);
  n.frustracao=Math.max(0,Math.min(100,(n.frustracao??0)+(resolveu?-0.4:(n.agua>60||n.alimento>60?.15:0))));
  n.satisfacao=Math.max(0,Math.min(100,(n.satisfacao??50)+(resolveu?.2:-.025)));
  if(acao==='conviver'&&presentes.length){for(const outro of presentes){estado.relacoes[ser.id][outro.id]=Math.min(100,estado.relacoes[ser.id][outro.id]+.3);ser.vinculos[outro.id]=estado.relacoes[ser.id][outro.id];outro.memoria.push({ciclo:estado.mundo.tempo.ciclo,tipo:'social',texto:ser.nome+' conversou com você.'})}ser.memoria.push({ciclo:estado.mundo.tempo.ciclo,tipo:'social',texto:`Conversou com ${presentes.map(x=>x.nome).join(' e ')}.`})}
  // FASE G — a fala também é consequência social: o falante lembra que falou
  // e os dois lados do vínculo se aproximam um pouco.
  if(acao==='falar'&&presentes.length){const alvo=presentes[0],r1=estado.relacoes[ser.id],r2=estado.relacoes[alvo.id];r1[alvo.id]=Math.min(100,(r1[alvo.id]||0)+.2);r2[ser.id]=Math.min(100,(r2[ser.id]||0)+.2);ser.vinculos[alvo.id]=r1[alvo.id];ser.memoria.push({ciclo:estado.mundo.tempo.ciclo,tipo:'social',texto:'Falou com '+alvo.nome+'.'})}
  const vals=Object.values(estado.relacoes[ser.id]||{});if(vals.length)n.confianca=Math.max(0,Math.min(100,n.confianca+(vals.reduce((a,b)=>a+b,0)/vals.length-n.confianca)*.05));
  // DEGRAU 2b: MEDO COM GRADIENTE (mundo pressiona; agente escolhe)
  const escuro=['noite','madrugada'].includes(estado.mundo.tempo.periodo);
  const protegido=(ser.casa&&ser.local===ser.casa)||(ser.abrigo||0)>=2;
  if(escuro&&!protegido)n.medo=Math.min(100,(n.medo||0)+4);
  else if(escuro&&protegido)n.medo=Math.max(0,(n.medo||0)-6);
  else n.medo=Math.max(0,(n.medo||0)-4);
}

function aprender(ser, observacoes, ciclo) {
  ser.memoria ||= [];
  for (const texto of observacoes) if (!ser.memoria.some(m => m.texto === texto)) ser.memoria.push({ ciclo, texto, tipo:'ambiente' });
  if (ser.memoria.length>120) ser.memoria.splice(0,ser.memoria.length-120);
  ser.experiencia ||= [];
}

module.exports = { preparar, validarCompleto, atualizarMundo, atualizarVidaSocial, aprender, climaDoCiclo };



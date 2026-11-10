'use strict';
// Compatibilidade: mantém o contrato antigo (prompt/interpretar para os testes
// de mecânica), mas o CAMINHO de decisão é o cerebro.js — sem overrides
// "corpo"/"social": necessidade nenhuma vira ação automaticamente.
const orig=require('./decisor-original');
const cerebro=require('./cerebro');
async function decidir(c,a,ser){return cerebro.decidir(c,a,ser)}
module.exports=Object.assign({},orig,{decidir});

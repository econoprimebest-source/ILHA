'use strict';
const fs=require('fs'),path=require('path');const {validar}=require('./estado-v2');
function carregar(f){if(!fs.existsSync(f))return null;let v;try{v=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){throw Error('Não foi possível ler '+f+': '+e.message)}return v}
function gravar(f,e){validar(e);fs.mkdirSync(path.dirname(f),{recursive:true});const tmp=f+'.tmp';fs.writeFileSync(tmp,JSON.stringify(e,null,2)+'\n',{encoding:'utf8',flag:'w'});try{const fd=fs.openSync(tmp,'r+');fs.fsyncSync(fd);fs.closeSync(fd);fs.renameSync(tmp,f)}catch(err){try{fs.unlinkSync(tmp)}catch{}throw err}}
function ultimaLinha(f){if(!fs.existsSync(f))return null;const s=fs.readFileSync(f,'utf8').trimEnd();if(!s)return null;const i=s.lastIndexOf('\n');return JSON.parse(s.slice(i+1))}
function anexar(f,obj){fs.mkdirSync(path.dirname(f),{recursive:true});if(Number.isInteger(obj.ciclo)){const last=ultimaLinha(f);if(last&&last.ciclo>=obj.ciclo)return false}fs.appendFileSync(f,JSON.stringify(obj)+'\n',{encoding:'utf8',flag:'a'});return true}
function anexarCiclo(f,obj){const last=ultimaLinha(f);if(last&&last.ciclo>obj.ciclo)throw Error('Log V2 está à frente do estado; retomada interrompida para evitar duplicação.');return anexar(f,obj)}
module.exports={carregar,gravar,anexar,anexarCiclo,ultimaLinha};

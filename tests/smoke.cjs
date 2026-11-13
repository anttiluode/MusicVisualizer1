// Zero-dependency smoke tests for the vendored Korva inference engine and page wiring.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const name of ['korva-engine.js','weights.js','core.js','audio.js','renderer.js','app.js','classic/app.js']){
  new vm.Script(read(name),{filename:name});
}
const html=read('index.html'),app=read('app.js');
for(const match of app.matchAll(/\$\('([a-zA-Z][a-zA-Z0-9]*)'\)/g)){
  const id=match[1];
  assert(html.includes('id="'+id+'"'), 'Missing HTML element #'+id);
}
const sandbox={window:{},Buffer,console};
vm.createContext(sandbox);
vm.runInContext(read('korva-engine.js'),sandbox,{filename:'korva-engine.js'});
vm.runInContext(read('weights.js'),sandbox,{filename:'weights.js'});
const {Organ,Tiny}=sandbox.window.RingOrgan;
const organ=new Organ(true);
const network=new Tiny(sandbox.window.KORVA_WEIGHTS.organ,true);
let selected=[],pred;
for(let t=0;t<160;t++){
  const x=Uint8Array.from({length:8},(_,b)=>b<7&&t%32===b*4?1:0);
  const o=organ.step(x);
  pred=network.step(Array.from(x),o);
  assert.equal(pred.length,8);
  pred.forEach((p,b)=>assert(Number.isFinite(p)&&p>=0&&p<=1,'Invalid probability band '+b));
  selected=o.laps;
}
assert(selected.includes(32),'The 32-tick rhythm should select its true lap: '+selected);
assert(selected.includes(64),'The harmonic 64-tick lap should also appear: '+selected);
assert(network.share.every(v=>v>=0&&v<=1),'Organ attention should be a fraction');
console.log('PASS: scripts parse, DOM wiring exists, 160-step inference valid, selected '+selected.join('/'));

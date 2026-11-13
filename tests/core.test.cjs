const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const box={};vm.createContext(box);
if(fs.existsSync('core.js'))vm.runInContext(fs.readFileSync('core.js','utf8'),box);
const C=box.WorldCore;
test('core is available offline as a classic script',()=>assert.ok(C));
test('visual settings roundtrip and reject unknown/unsafe input',()=>{
 const s=C.parseSettings('#scene=3&palette=2&energy=1.4&motion=0.2&detail=0.7&auto=0');
 assert.equal(s.scene,3);assert.equal(s.energy,1.4);assert.equal(s.auto,false);
 assert.equal(C.parseSettings(C.encodeSettings(s)).motion,.2);
 const bad=C.parseSettings('#scene=999&palette=-1&energy=Infinity&motion=-1&detail=NaN&auto=wat');
 assert.equal(bad.scene,0);assert.equal(bad.palette,0);assert.ok(Number.isFinite(bad.energy));assert.ok(bad.motion>=0);assert.ok(Number.isFinite(bad.detail));
});
test('silence has no onsets, a transient triggers, and sustained tones settle',()=>{
 const f=new C.Features(48000,2048);const bins=new Float32Array(1024).fill(-100),wave=new Float32Array(2048);
 for(let i=0;i<40;i++)f.update(bins,wave,.125);
 assert.equal(f.tick().reduce((a,b)=>a+b),0);assert.equal(f.rms,0);
 bins.fill(-20,3,7);wave.fill(.2);f.update(bins,wave,.125);
 assert.ok(f.tick()[0]||f.tick()[1]);
 for(let i=0;i<100;i++){f.update(bins,wave,.125);f.tick();}
 assert.equal(f.tick().reduce((a,b)=>a+b),0);
 assert.ok(Array.from(f.bands).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
});
test('phase coordinates are delayed real samples and remain finite in silence',()=>{
 const a=Float32Array.from({length:100},(_,i)=>Math.sin(i*.2));
 const p=C.phasePoint(a,4,8);assert.equal(p[0],a[4]);assert.equal(p[1],a[12]);assert.equal(p[2],a[20]);
 assert.ok(C.phasePoint(new Float32Array(64),0,8).every(Number.isFinite));
});
test('automatic render size is bounded on 4K and portrait screens',()=>{
 for(const [w,h] of [[3840,2160],[390,844],[1,1]]){
  const s=C.renderSize(w,h,2,1);assert.ok(s[0]*s[1]<=1200000);assert.ok(s[0]>=1&&s[1]>=1);
 }
 const q=new C.Quality();for(let i=0;i<400;i++)q.update(.08);
 assert.ok(q.scale>=.35&&q.scale<1);
});
test('clock discontinuities reset rather than compress missing audio history',()=>{
 assert.equal(C.tickAction(12,12),'none');assert.equal(C.tickAction(12,13),'step');assert.equal(C.tickAction(12,92),'reset');assert.equal(C.tickAction(92,0),'reset');assert.equal(C.tickAction(-1,200),'step');
});
test('cinema shortcuts work on focused buttons without stealing activation or typing',()=>{
 assert.equal(C.acceptShortcut('BUTTON','h',false),true);assert.equal(C.acceptShortcut('BUTTON',' ',false),false);assert.equal(C.acceptShortcut('INPUT','h',false),false);assert.equal(C.acceptShortcut('BODY','h',true),false);
});
test('shared settings include listening rings and gentle response',()=>{
 const s=C.parseSettings('#scene=4&orbits=1&gentle=1');assert.equal(s.orbits,true);assert.equal(s.gentle,true);const restored=C.parseSettings(C.encodeSettings(s));assert.equal(restored.orbits,true);assert.equal(restored.gentle,true);
});

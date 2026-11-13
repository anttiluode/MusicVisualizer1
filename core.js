/* Pure signal and settings utilities. No DOM, network, or audio side effects. */
(function(root){
'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const defaults={scene:0,palette:0,energy:1.15,motion:.45,detail:.75,auto:false,orbits:false,gentle:false};
function parseSettings(hash){
 const out={...defaults},parts=String(hash||'').replace(/^#/,'').split('&');
 for(const part of parts){const [k,v]=part.split('=');if(!Object.prototype.hasOwnProperty.call(defaults,k))continue;
  if(typeof defaults[k]==='boolean'){out[k]=v==='1';continue;}
  if(v===undefined||v==='')continue;const n=Number(v);if(!Number.isFinite(n))continue;
  if(k==='scene'||k==='palette'){if(Number.isInteger(n)&&n>=0&&n<(k==='scene'?6:5))out[k]=n;}
  else out[k]=clamp(n,k==='energy'?.25:0,k==='energy'?2:1);
 }return out;
}
function encodeSettings(s){return '#'+Object.keys(defaults).map(k=>k+'='+(typeof defaults[k]==='boolean'?(s[k]?1:0):s[k])).join('&');}
class Features{
 constructor(sr,n){this.sr=sr;this.n=n;this.bands=new Float32Array(8);this.old=new Float32Array(8);this.mean=new Float32Array(8).fill(.025);this.pending=new Uint8Array(8);this.rms=0;this.flux=0;this.pulse=0;this.centroid=0;this.cuts=[30,100,220,500,1100,2400,5000,10000,20000];}
 update(db,wave,dt){
  let power=0;for(const v of wave)power+=v*v;this.rms=Math.sqrt(power/Math.max(1,wave.length));
  let weighted=0,total=0,flux=0;
  for(let b=0;b<8;b++){
   const lo=Math.max(1,Math.floor(this.cuts[b]*this.n/this.sr)),hi=Math.min(db.length,Math.max(lo+1,Math.ceil(this.cuts[b+1]*this.n/this.sr)));
   let p=0;for(let i=lo;i<hi;i++)p+=Math.pow(10,db[i]/10);
   const raw=this.rms<.0001?0:clamp((10*Math.log10(p/Math.max(1,hi-lo)+1e-12)+80)/65);
   const diff=Math.max(0,raw-this.old[b]);this.old[b]=raw;
   if(diff>Math.max(.035,this.mean[b]*2.4)&&raw>.12)this.pending[b]=1;
   this.mean[b]+=(diff-this.mean[b])*(1-Math.exp(-dt*1.2));
   this.bands[b]+=(raw-this.bands[b])*(1-Math.exp(-dt*(raw>this.bands[b]?22:5)));
   flux+=diff;weighted+=b*this.bands[b];total+=this.bands[b];
  }
  this.flux=flux/8;this.pulse=Math.max(this.pulse*Math.exp(-dt*6),clamp(flux*.9));this.centroid=total?weighted/(7*total):0;
 }
 tick(){const x=this.pending.slice();this.pending.fill(0);return x;}
}
function phasePoint(a,i,d){const n=a.length;return [a[i%n]||0,a[(i+d)%n]||0,a[(i+2*d)%n]||0];}
function renderSize(w,h,dpr,scale){const f=Math.min(dpr,1.5)*clamp(scale,.25,1);const cap=Math.min(1,Math.sqrt(1200000/Math.max(1,w*h*f*f)));return [Math.max(1,Math.floor(w*f*cap)),Math.max(1,Math.floor(h*f*cap))];}
class Quality{
 constructor(){this.scale=.8;this.avg=1/60;this.frames=0;}
 update(dt){this.avg+=(clamp(dt,.001,.15)-this.avg)*.04;if(++this.frames%90===0){if(this.avg>.027)this.scale=Math.max(.35,this.scale-.1);else if(this.avg<.019)this.scale=Math.min(1,this.scale+.025);}return this.scale;}
}
function tickAction(previous,current){if(previous===current)return 'none';return previous>=0&&(current<previous||current>previous+1)?'reset':'step';}
function acceptShortcut(tag,key,dialogOpen){return !dialogOpen&&!['INPUT','SELECT','TEXTAREA'].includes(tag)&&!(['BUTTON','A'].includes(tag)&&[' ','Enter'].includes(key));}
root.WorldCore={tickAction,acceptShortcut,clamp,defaults,parseSettings,encodeSettings,Features,phasePoint,renderSize,Quality};
})(globalThis);

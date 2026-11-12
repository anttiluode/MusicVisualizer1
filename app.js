/* Korva Dream Garden: offline browser audiovisual instrument.
   Predictor: unmodified Korva Organ + Tiny (weights vendored from the linked Korva project).
   Visual mapping: original Fourier-inspired Canvas2D geometry, not FourierFlower's renderer.
*/
(() => {
'use strict';
const { Organ, Tiny, LAPS } = window.RingOrgan;
const TICK = 0.125, C = 8, TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const canvas = $('stage'), g = canvas.getContext('2d', {alpha:false});
const bc = $('bands').getContext('2d');
const modeTitles = {
  flower: ['A flower of frequencies', 'Rhythm shapes the petals; predicted beats shimmer in advance. Every musical passage leaves a visible trace.'],
  orrery: ['The clockwork of listening', 'All 52 delay rings compare the present against a different past. The three lowest-surprise rings shine brightest.'],
  ghost: ['What the organ expects', 'Transparent lights show predictions for the next tick. Solid pulses show the actual events. Mismatches leave a scattering of light.']
};
const colors = ['#58e4df','#ec8cff','#ffc977'];
const clamp = (x,a=0,b=1) => Math.min(b,Math.max(a,x));
const lerp = (a,b,t) => a+(b-a)*t;
let dpr=1,w=1,h=1,mode='flower',source='demo',playing=false,playBase=0,started=0,clock=0;
let frames=null, duration=Infinity, audioEl=null, audioUrl=null, soundCtx=null, fileLoading=false;
let organ,model,processed=-1,pred=null,previousComparison=null,laps=[13,14,15],Z=new Float64Array(52);
let actual=new Uint8Array(C),smooth=new Float64Array(C),amp=0,beatFlash=0,err=0,attention=0,expect=0;
let phaseFree=0, lastDraw=0, lastHud=0, sensitivity=1.25, showGhosts=true, particles=[], memoryPetals=[];
let fileToken=0, headless=false;
let randSeed=0xafe291;
const rnd=()=>{randSeed^=randSeed<<13;randSeed^=randSeed>>>17;randSeed^=randSeed<<5;return (randSeed>>>0)/4294967296;};
const stars=Array.from({length:190},()=>({x:rnd(),y:rnd(),z:.2+rnd()*.8,phase:rnd()*TAU}));

function status(msg){$('status').textContent=msg;}
function format(sec){if(!Number.isFinite(sec))return '∞';const m=Math.floor(sec/60),s=Math.floor(sec%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function hideHint(){const e=$('hint');e.style.opacity='0';setTimeout(()=>{e.hidden=true;},1100);}
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#070b17';g.fillRect(0,0,w,h);}
window.addEventListener('resize',resize);resize();

function resetMachine(){
  organ=new Organ(true);
  model=new Tiny(window.KORVA_WEIGHTS.organ,true);
  processed=-1;pred=null;previousComparison=null;laps=[13,14,15];Z=new Float64Array(52);
  actual=new Uint8Array(C);smooth.fill(0);amp=0;beatFlash=0;err=0;attention=0;expect=0;
  particles=[];memoryPetals=[];
}
resetMachine();

function demoFrame(t){
  const p=t%32,section=Math.floor(t/(32*8))%4;
  const x=new Uint8Array(C);
  x[0]=+(p%4===0);
  x[1]=+(p%8===4);
  x[2]=+(p%2===0);
  x[3]=+(p%8===6 || p===30);
  x[4]=+([0,5,11,16,22,27].includes(p));
  x[5]=+(section%2===0 ? [0,8,16,24].includes(p) : [0,6,12,16,24,30].includes(p));
  x[6]=+(p%16===0 || p===31);
  x[7]=+(p===28 || p===30 || (section===3 && p>=24 && p%2===0));
  const levels=new Float32Array(C);
  for(let c=0;c<C;c++) levels[c]=.075+.10*Math.sin(t*.02+c*.7)**2 + x[c]*(c<2?.87:.50);
  const amount=Array.from(x).reduce((a,b)=>a+b,0);
  return {x,bands:levels,amp:clamp(.11+amount*.14)};
}

function processTick(i,silent=false){
  const f=source==='demo'?demoFrame(i):frames[i];
  if(!f)return;
  const x=f.x;
  const before=pred;
  const o=organ.step(x);
  pred=model.step(Array.from(x),o);
  Z=Float64Array.from(o.Z);laps=o.laps.slice();
  actual=x;
  attention=(model.share[0]+model.share[1])*.5;
  expect=pred.reduce((sum,p)=>sum+p,0);
  let diff=0;
  if(before) for(let b=0;b<C;b++)diff+=Math.abs(before[b]-x[b]);
  err=before?diff/C:0;
  previousComparison={prior:before ? before.slice():null,x:Uint8Array.from(x),next:pred.slice()};
  const active=x.reduce((s,v)=>s+v,0);
  if(active && !silent){
    beatFlash=Math.max(beatFlash,Math.min(.9,.12+active*.115));
    const surprise=Math.max(0,err-.20);
    if(surprise>.03) spawnBurst(surprise,Math.min(6,active+1));
    if(i%8===0) memoryPetals.push({tick:i,section:Math.floor(i/32)%12,seed:rnd(),intensity:active/C});
    if(memoryPetals.length>95)memoryPetals.shift();
  }
  if(source==='demo'&&playing&&!silent)playDemoSound(x);
  processed=i;
}
function advanceTo(target){
 if(target<processed){rehydrate(target);return;}
 // Avoid freezing the page if returning from a suspended background tab.
 const limit=Math.min(target,processed+240);
 for(let t=processed+1;t<=limit;t++)processTick(t,false);
}
function rehydrate(target){
  resetMachine();
  const start=Math.max(0,target-320);
  // The 12-tick attention history and 64-tick rings are rebuilt from a bounded warm-up.
  // A seek can differ from uninterrupted playback because older organ state is discarded.
  for(let t=start;t<=target;t++)processTick(t,true);
  status('Seek rebuilt the last 40 seconds of Korva memory (approximate state).');
}
function getTime(){
  if(source==='file'&&audioEl)return audioEl.currentTime;
  return playing?Math.max(0,performance.now()/1000-started):playBase;
}
function setPlaying(next){
 if(fileLoading)return;
 if(next===playing)return;
 playing=next;
 if(playing){
   hideHint();
   if(source==='demo'){
     started=performance.now()/1000-playBase;
     ensureSound();
     if(soundCtx&&soundCtx.state==='suspended')soundCtx.resume().catch(()=>{});
   }else if(audioEl){
     audioEl.play().catch(e=>{playing=false;status('Playback blocked: '+e.message);refreshPlay();});
   }
 }else{
   playBase=getTime();
   if(audioEl)audioEl.pause();
 }
 refreshPlay();
}
function refreshPlay(){$('play').textContent=playing?'Ⅱ Pause':'▶ Play';$('live').classList.toggle('on',playing);}
function ensureSound(){
 if(soundCtx)return;
 try{soundCtx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){status('Demo animation active; browser audio unavailable.');}
}
function playDemoSound(x){
 if(!soundCtx||soundCtx.state!=='running')return;
 const time=soundCtx.currentTime+.016;
 const tone=(frequency,duration,volume,type,down=0)=>{
   const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();
   osc.type=type;osc.frequency.setValueAtTime(frequency,time);
   if(down)osc.frequency.exponentialRampToValueAtTime(Math.max(25,frequency*down),time+duration*.9);
   gain.gain.setValueAtTime(.001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.005);
   gain.gain.exponentialRampToValueAtTime(.001,time+duration);
   osc.connect(gain).connect(soundCtx.destination);osc.start(time);osc.stop(time+duration+.01);
 };
 if(x[0])tone(120,.19,.21,'sine',.36);
 if(x[1])tone(210,.10,.08,'triangle',.47);
 if(x[2])tone(1500,.027,.018,'square');
 if(x[3])tone(530,.048,.025,'sawtooth',.58);
 if(x[4])tone(220,.16,.032,'sine');
 if(x[5])tone(330,.14,.025,'triangle');
 if(x[6])tone(440,.26,.027,'sine');
 if(x[7])tone(820,.09,.032,'sine');
}

function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){
   let bit=n>>1;
   for(;j&bit;bit>>=1)j^=bit;
   j^=bit;
   if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}
 }
 for(let len=2;len<=n;len<<=1){
   const theta=-TAU/len,cs=Math.cos(theta),sn=Math.sin(theta);
   for(let i=0;i<n;i+=len){
     let cr=1,ci=0;
     for(let j=0;j<len/2;j++){
       const a=i+j,b=a+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;
       re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;
       const nc=cr*cs-ci*sn;ci=cr*sn+ci*cs;cr=nc;
     }
   }
 }
}
const asyncYield=()=>new Promise(r=>setTimeout(r,0));
async function analyzeAudio(buffer,token){
 const n=2048,sr=buffer.sampleRate,hop=Math.round(sr*TICK);
 const length=Math.floor(buffer.length/hop),bands=8;
 if(length<2)throw new Error('Audio too short to analyze.');
 const channels=Array.from({length:buffer.numberOfChannels},(_,k)=>buffer.getChannelData(k));
 const cuts=[60,150,300,600,1200,2400,4800,9600,16000].map(f=>clamp(Math.round(f*n/sr),0,n/2|0));
 const energy=new Float32Array(length*bands),rms=new Float32Array(length);
 const re=new Float64Array(n),im=new Float64Array(n),window=new Float32Array(n);
 for(let i=0;i<n;i++)window[i]=.5-.5*Math.cos(TAU*i/(n-1));
 for(let t=0;t<length;t++){
   if(token!==fileToken)throw new Error('Analysis was replaced by another file.');
   const start=t*hop,tot=new Float64Array(bands);let power=0;
   for(let pass=0;pass<3;pass++){
     const offset=start+Math.max(0,Math.floor(pass*(hop-n)/2));
     for(let j=0;j<n;j++){
       const at=offset+j;let sample=0;
       if(at<buffer.length)for(const ch of channels)sample+=ch[at]/channels.length;
       power+=sample*sample;
       re[j]=sample*window[j];im[j]=0;
     }
     fft(re,im);
     for(let b=0;b<bands;b++)for(let k=Math.max(1,cuts[b]);k<Math.max(cuts[b]+1,cuts[b+1]);k++){
       if(k<n/2)tot[b]+=re[k]*re[k]+im[k]*im[k];
     }
   }
   for(let b=0;b<bands;b++)energy[t*bands+b]=Math.log1p(tot[b]/(3*n));
   rms[t]=Math.sqrt(power/(3*n));
   if(t%48===0){status('Listening to your song… '+Math.floor(100*t/length)+'%');await asyncYield();}
 }
 const output=new Array(length);const flux=new Float32Array(length*bands);
 for(let t=0;t<length;t++)for(let b=0;b<bands;b++)flux[t*bands+b]=t?Math.max(0,energy[t*bands+b]-energy[(t-1)*bands+b]):0;
 const lo=new Float64Array(bands),hi=new Float64Array(bands),fmean=new Float64Array(bands),fsd=new Float64Array(bands);
 for(let b=0;b<bands;b++){
   const values=[];let fm=0;
   for(let t=0;t<length;t++){values.push(energy[t*bands+b]);fm+=flux[t*bands+b];}
   values.sort((a,z)=>a-z);lo[b]=values[Math.floor(length*.08)];hi[b]=Math.max(lo[b]+.03,values[Math.floor(length*.95)]);
   fm/=length;fmean[b]=fm;let ss=0;
   for(let t=0;t<length;t++)ss+=(flux[t*bands+b]-fm)**2;
   fsd[b]=Math.sqrt(ss/length);
 }
 const maxRms=Math.max(.001,Array.from(rms).sort((a,b)=>a-b)[Math.floor(length*.96)]||0);
 for(let t=0;t<length;t++){
   const x=new Uint8Array(bands),levels=new Float32Array(bands);
   for(let b=0;b<bands;b++){
     const a=energy[t*bands+b];
     levels[b]=clamp((a-lo[b])/(hi[b]-lo[b]));
     x[b]=+(flux[t*bands+b]>fmean[b]+1.25*fsd[b]&&flux[t*bands+b]>.005);
   }
   output[t]={x,bands:levels,amp:clamp(rms[t]/maxRms)};
 }
 return output;
}
async function loadFile(file){
 if(!file||fileLoading)return;
 fileLoading=true;const token=++fileToken,wasPlaying=playing;setPlaying(false);
 $('play').disabled=true;
 status('Decoding '+file.name+'…');
 try{
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)throw new Error('Web Audio API is unavailable.');
   const context=new AC();
   const decoded=await context.decodeAudioData(await file.arrayBuffer());
   const built=await analyzeAudio(decoded,token);
   await context.close();
   if(audioEl){audioEl.pause();audioEl.src='';}
   if(audioUrl)URL.revokeObjectURL(audioUrl);
   source='file';frames=built;duration=decoded.duration;
   audioUrl=URL.createObjectURL(file);audioEl=new Audio(audioUrl);audioEl.preload='auto';audioEl.onended=()=>{playing=false;refreshPlay();};
   audioEl.onpause=()=>{if(playing && !audioEl.ended){playing=false;refreshPlay();}};
   playBase=0;clock=0;playing=false;
   resetMachine();$('trackTitle').textContent=file.name;
   status('Loaded '+format(duration)+' · '+built.length+' audio ticks · local-only analysis · trained Korva prediction');
   $('play').disabled=false;refreshPlay();hideHint();
   if(wasPlaying)setPlaying(true);
 }catch(e){status('Could not load file: '+e.message);$('play').disabled=false;}
 finally{fileLoading=false;$('play').disabled=false;}
}
function activateDemo(){
 fileToken++;
 if(audioEl){audioEl.pause();audioEl.src='';audioEl=null;}
 if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}
 source='demo';frames=null;duration=Infinity;playing=false;playBase=0;started=0;clock=0;
 resetMachine();refreshPlay();
 $('trackTitle').textContent='Original generative demo · 120 BPM';
 status('Original synthesized rhythm · Korva predicts its recurring phrases. Press Play to hear it.');
}
$('upload').addEventListener('change',e=>{if(e.target.files[0])loadFile(e.target.files[0]);e.target.value='';});
$('demo').addEventListener('click',activateDemo);
$('play').addEventListener('click',()=>setPlaying(!playing));
$('snapshot').addEventListener('click',()=>{const a=document.createElement('a');a.download='korva-dream-garden.png';a.href=canvas.toDataURL('image/png');a.click();});
$('fullscreen').addEventListener('click',()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();});
$('sensitivity').addEventListener('input',e=>sensitivity=Number(e.target.value));
$('showGhosts').addEventListener('change',e=>showGhosts=e.target.checked);
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
 mode=btn.dataset.mode;
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
 $('modeTitle').textContent=modeTitles[mode][0];$('modeDesc').textContent=modeTitles[mode][1];
 $('eyebrow').textContent=mode==='orrery'?'The past has an address':mode==='ghost'?'The future is only a guess':'The music that remembers';
}));
$('timeline').addEventListener('change',e=>{
 if(source!=='file'||!audioEl)return;
 const target=duration*Number(e.target.value)/1000;
 audioEl.currentTime=Math.max(0,Math.min(duration-.001,target));clock=audioEl.currentTime;
 rehydrate(Math.min(frames.length-1,Math.floor(clock/TICK)));
});
document.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement)return;
 if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}
 if(e.key==='1')document.querySelector('[data-mode="flower"]').click();
 if(e.key==='2')document.querySelector('[data-mode="orrery"]').click();
 if(e.key==='3')document.querySelector('[data-mode="ghost"]').click();
});
document.addEventListener('dragenter',e=>{e.preventDefault();document.body.classList.add('dragging');});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)document.body.classList.remove('dragging');});
document.addEventListener('drop',e=>{
 e.preventDefault();document.body.classList.remove('dragging');
 if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0]);
});

function spawnBurst(force,count){
 const radius=Math.min(w,h)*.24, cx=w*.5,cy=h*.55;
 for(let j=0;j<count*7;j++){
   const a=rnd()*TAU,r=radius*(.6+rnd()*.5);
   particles.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.72,
     vx:Math.cos(a)*(16+100*rnd()),vy:Math.sin(a)*(16+85*rnd()),
     life:.5+1.5*rnd(),age:0,color:colors[j%3],strength:clamp(force*3)});
 }
 if(particles.length>380)particles.splice(0,particles.length-380);
}
function lineCircle(cx,cy,rx,ry,angle,col,alpha,thick=1){
 g.beginPath();g.ellipse(cx,cy,Math.max(1,rx),Math.max(1,ry),angle,0,TAU);
 g.strokeStyle=col;g.globalAlpha=alpha;g.lineWidth=thick;g.stroke();g.globalAlpha=1;
}
function backdrop(time){
 const cx=w*.5,cy=h*.54, R=Math.min(w,h)*.53;
 const halo=g.createRadialGradient(cx,cy,1,cx,cy,R*1.7);
 halo.addColorStop(0,'rgba(19,48,70,.26)');halo.addColorStop(.42,'rgba(24,14,61,.11)');halo.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=halo;g.fillRect(0,0,w,h);
 for(const star of stars){
   const twinkle=.28+.34*Math.sin(time*.5+star.phase)**2;
   g.fillStyle='rgba(162,212,238,'+(twinkle*star.z)+')';
   g.fillRect(star.x*w,star.y*h,star.z*1.5,star.z*1.5);
 }
}
function drawFlower(time,dt){
 const cx=w*.5,cy=h*(w<700?.51:.53),s=Math.min(w,h),base=s*(mode==='ghost'?.19:.205);
 const total=mode==='ghost'?7:13, sampled=230;
 const centerRotation=time*.065, breathing=1+beatFlash*.09*sensitivity;
 g.save();g.globalCompositeOperation='lighter';
 for(let layer=total-1;layer>=0;layer--){
   const depth=layer/(total-1), scale=breathing*(.59+depth*.54), tint=layer%3;
   const hue=tint===0?174:tint===1?286:38,alpha=(mode==='ghost'?.12:.10)+depth*.24;
   g.beginPath();
   for(let i=0;i<=sampled;i++){
     const a=i/sampled*TAU,phi=a+centerRotation;
     let modulation=0;
     for(let c=0;c<8;c++) modulation+=(.012+smooth[c]*.018*sensitivity)*Math.cos((c+2)*a+time*(.05+c*.012)+c*1.73);
     const petal=.24*Math.cos(a*8-layer*.23+time*.11) +.09*Math.sin(a*13+layer*.27-time*.16);
     const r=base*scale*(1+petal+modulation);
     const z=Math.sin(a*5+layer*.42+time*.13)*(16+base*.11)*scale;
     const tilt=.60+.08*Math.cos(time*.16+layer*.14);
     const x=cx+Math.cos(phi)*r+Math.sin(a*3+time*.12)*z*.18;
     const y=cy+Math.sin(phi)*r*tilt+z*.4+(layer-total/2)*2;
     if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
   }
   g.closePath();g.strokeStyle='hsla('+hue+',95%,73%,'+alpha+')';g.lineWidth=.7+depth*1.8;
   g.shadowBlur=layer%3===0?16:5;g.shadowColor='hsla('+hue+',95%,70%,.7)';g.stroke();
 }
 g.shadowBlur=0;
 // Major music-driven petals. Lower register = broad, upper = sharp.
 for(let c=0;c<8;c++){
   const a=c*TAU/8+time*.07,r=base*(.45+smooth[c]*.95);
   const pX=cx+Math.cos(a)*r,pY=cy+Math.sin(a)*r*.69;
   const grad=g.createRadialGradient(pX,pY,0,pX,pY,7+smooth[c]*15);
   const hue=175+c*25;grad.addColorStop(0,'hsla('+hue+',99%,80%,'+(.3+smooth[c]*.6)+')');
   grad.addColorStop(1,'hsla('+hue+',99%,60%,0)');
   g.fillStyle=grad;g.beginPath();g.arc(pX,pY,7+smooth[c]*15,0,TAU);g.fill();
 }
 // Slowly retained visuals from earlier song phrases.
 for(const m of memoryPetals){
   const age=processed-m.tick;if(age<0||age>700)continue;
   const a=(m.section/12)*TAU+time*.009;
   const r=base*(.23+Math.log1p(age)*.15);
   const fade=(1-age/700)*.14;
   g.fillStyle='rgba(137,232,255,'+fade+')';
   g.beginPath();g.arc(cx+r*Math.cos(a),cy+r*Math.sin(a)*.70,1+3*m.intensity,0,TAU);g.fill();
 }
 g.restore();
}
function drawOrrery(time){
 const cx=w*.5,cy=h*.535,s=Math.min(w,h);
 const all=mode==='orrery',radiusMin=s*(all?.12:.255),radiusSpan=s*(all?.27:.13);
 g.save();g.globalCompositeOperation='lighter';
 if(all){
   for(let j=0;j<LAPS.length;j++){
     const L=LAPS[j],r=radiusMin+radiusSpan*j/(LAPS.length-1);
     const selected=laps.indexOf(L),hot=selected>=0;
     lineCircle(cx,cy,r,r*(.55+.22*Math.sin(j*.16+time*.05)**2),.09*Math.sin(j*.41),
       hot?colors[selected]:'#4782a7',hot?.42:.075,hot?1.8:.7);
   }
 }
 for(let k=2;k>=0;k--){
   const L=laps[k],r=all?radiusMin+radiusSpan*(L-13)/51:radiusMin+radiusSpan*k/2;
   const angle=.2*Math.sin(time*.18+k*.7)+k*.48;
   const tilt=.60+.09*Math.sin(time*.11+k);
   lineCircle(cx,cy,r,r*tilt,angle,colors[k],all?.80:.56,all?2.4:2);
   const sub=(Math.max(0,clock/TICK)%L)/L,theta=sub*TAU-Math.PI/2;
   const x=r*Math.cos(theta),y=r*tilt*Math.sin(theta);
   const px=cx+x*Math.cos(angle)-y*Math.sin(angle),py=cy+x*Math.sin(angle)+y*Math.cos(angle);
   const halo=g.createRadialGradient(px,py,0,px,py,15);
   halo.addColorStop(0,colors[k]);halo.addColorStop(.22,colors[k]+'9f');halo.addColorStop(1,colors[k]+'00');
   g.fillStyle=halo;g.beginPath();g.arc(px,py,15,0,TAU);g.fill();
   g.fillStyle=colors[k];g.beginPath();g.arc(px,py,2.7+beatFlash*2,0,TAU);g.fill();
 }
 g.restore();
}
function drawGhosts(time){
 if(!showGhosts||!previousComparison)return;
 const cx=w*.5,cy=h*.535,s=Math.min(w,h),r=s*(mode==='ghost'?.35:.345);
 const pr=previousComparison.next,old=previousComparison.prior,x=previousComparison.x;
 g.save();g.globalCompositeOperation='lighter';
 for(let b=0;b<C;b++){
   const a=-Math.PI/2+b*TAU/8+time*.027;
   const px=cx+r*Math.cos(a),py=cy+r*.75*Math.sin(a);
   const p=pr[b];
   // A predicted future event, drawn before it arrives, even when probability is small.
   const rad=2+Math.sqrt(p)*15;
   g.strokeStyle='#b1a1ff';g.lineWidth=1.4;
   g.globalAlpha=clamp(.08+p*.86);
   g.beginPath();g.arc(px,py,rad,0,TAU);g.stroke();
   if(mode==='ghost'){
     const was=old?old[b]:0,hit=x[b];
     const x2=cx+(r-22)*Math.cos(a),y2=cy+(r-22)*.75*Math.sin(a);
     if(hit){
       g.globalAlpha=.42+.58*hit;
       g.fillStyle=was>.45?'#5cf7dd':'#fbc17b';
       g.beginPath();g.arc(x2,y2,3+5*hit,0,TAU);g.fill();
     }
     if(old&&Math.abs(was-hit)>.48){
       g.strokeStyle='#fa9b9d';g.globalAlpha=.2+.45*Math.abs(was-hit);
       g.beginPath();g.moveTo(px,py);g.lineTo(x2,y2);g.stroke();
     }
   }
 }
 g.globalAlpha=1;g.restore();
}
function drawParticles(dt){
 g.save();g.globalCompositeOperation='lighter';
 for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];p.age+=dt;
   if(p.age>=p.life){particles.splice(i,1);continue;}
   p.x+=p.vx*dt;p.y+=p.vy*dt;
   p.vx*=Math.exp(-.7*dt);p.vy*=Math.exp(-.7*dt);
   const fade=(1-p.age/p.life)*p.strength;
   g.fillStyle=p.color;g.globalAlpha=fade;
   g.beginPath();g.arc(p.x,p.y,1+2.2*fade,0,TAU);g.fill();
 }
 g.restore();
}
function drawBands(){
 const cn=$('bands');bc.setTransform(1,0,0,1,0,0);bc.clearRect(0,0,cn.width,cn.height);
 const barW=30,base=132,spacing=49;
 for(let b=0;b<C;b++){
   const x=13+b*spacing,level=clamp(smooth[b]*sensitivity);
   bc.fillStyle='rgba(138,177,205,.12)';bc.fillRect(x,14,barW,118);
   const height=level*115;
   const hue=173+b*24;
   const grad=bc.createLinearGradient(0,base-height,0,base);
   grad.addColorStop(0,'hsl('+hue+' 95% 79%)');grad.addColorStop(1,'hsl('+hue+' 75% 42%)');
   bc.fillStyle=grad;bc.fillRect(x,base-height,barW,height);
   bc.fillStyle='rgba(223,240,250,.65)';bc.font='16px monospace';bc.fillText(String(b+1),x+8,148);
 }
}
function updateHud(){
 for(let i=0;i<3;i++){
   const L=laps[i]||'-';
   $('lap'+i).textContent=L+' t';
   const z=Z[L-13]||0;
   $('z'+i).textContent=z.toFixed(1);
   $('phase'+i).style.width=(100*((clock/TICK)%L)/L).toFixed(1)+'%';
 }
 $('attention').textContent=(attention*100).toFixed(0)+'%';
 $('surprise').textContent=(err*100).toFixed(0)+'%';
 $('tick').textContent=String(Math.max(0,processed));
 $('expected').textContent=expect.toFixed(1);
 $('clock').textContent=format(clock)+' / '+format(duration);
 if(source==='file'&&duration>0&&document.activeElement!==$('timeline'))$('timeline').value=String(clamp(clock/duration)*1000);
 if(source==='demo')$('timeline').value=0;
 drawBands();
}
function render(nowMs){
 const now=nowMs/1000,dt=Math.min(.05,lastDraw?now-lastDraw:.016);lastDraw=now;phaseFree+=dt;
 let target=0;
 if(playing){
   clock=getTime();
   if(source==='file'&&clock>=duration-.06){playing=false;refreshPlay();}
   target=source==='file'&&frames?Math.min(frames.length-1,Math.floor(clock/TICK)):Math.floor(clock/TICK);
   advanceTo(Math.max(0,target));
 }else clock=getTime();
 const fr=source==='demo'?demoFrame(Math.max(0,Math.floor(clock/TICK))):
   frames?frames[Math.min(frames.length-1,Math.max(0,Math.floor(clock/TICK)))]:null;
 if(fr){
   for(let b=0;b<C;b++)smooth[b]=lerp(smooth[b],fr.bands[b],1-Math.exp(-dt*(fr.bands[b]>smooth[b]?10:4)));
   amp=lerp(amp,fr.amp,1-Math.exp(-dt*6));
 }
 beatFlash*=Math.exp(-dt*5);
 g.setTransform(dpr,0,0,dpr,0,0);
 g.globalAlpha=1;g.globalCompositeOperation='source-over';
 // Mostly opaque clearing gives us subtle luminous history without smearing forever.
 g.fillStyle='rgba(6,10,23,'+(mode==='ghost'?.31:.23)+')';g.fillRect(0,0,w,h);
 backdrop(phaseFree);
 if(mode!=='orrery')drawFlower(phaseFree,dt);
 drawOrrery(phaseFree);
 drawGhosts(phaseFree);
 drawParticles(dt);
 if(now-lastHud>.12){updateHud();lastHud=now;}
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
status('Ready · full Korva trained engine + weights are available locally. Play the demo or load audio.');
})();

/* Korva / Worlds — browser-local orchestration. No network requests. */
(() => {
'use strict';
const $=id=>document.getElementById(id),C=WorldCore;
const SCENES=[
 ['Crystal<br>Cathedral','CRYSTAL / LIGHT','A monument made of sound.<br>Bass gives the crystal its breath.'],
 ['Fourier<br>Bloom','HARMONICS / FORM','A flower with no final shape.<br>Every frequency opens another fold.'],
 ['Tidal<br>Silk','INTERFERENCE / FLOW','Currents woven out of color.<br>Let the high frequencies unravel.'],
 ['Phase<br>Loom','SIGNAL / GEOMETRY','The waveform, folded into space.<br>This is the shape of what you hear.'],
 ['Resonant<br>Cortex','CONNECTION / LIGHT','A constellation that listens.<br>Eight bands. A hundred connections.'],
 ['Event<br>Horizon','DEPTH / REPETITION','Follow the sound further in.<br>There is always another doorway.']
];
let stored='';try{stored=localStorage.getItem('korva-worlds')||'';}catch{}
let settings=C.parseSettings(location.hash||stored);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!location.hash&&!stored&&reduced){settings.motion=0;settings.energy=.65;}
let gentle=settings.gentle||(!location.hash&&!stored&&reduced),orbits=settings.orbits,cinema=false,everStarted=false,sourceBusy=false,lastSourceToken=0;
let organ,model,pred,laps=[13,14,15],Z=new Float64Array(52),error=0,attention=0,processed=-1,lastAudioTick=-1;
let visualTime=0,lastFrame=0,lastHud=0,journeyAge=0,transition=null,seed=0,fade=1;
let recorder=null,recordTimer=null,recordStream=null,recordStarted=0;
const renderer=new WorldRenderer($('stage'));
const audio=new WorldAudio(refreshTransport);
const meterEls=Array.from({length:8},()=>{const el=document.createElement('i');$('meters').append(el);return el;});
function notice(message,ms=5000){$('notice').textContent=message;$('notice').classList.add('show');clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('notice').classList.remove('show'),ms);}
function saveSettings(){settings.gentle=gentle;settings.orbits=orbits;try{localStorage.setItem('korva-worlds',C.encodeSettings(settings));}catch{}}
function resetMachine(){organ=new RingOrgan.Organ(true);model=new RingOrgan.Tiny(KORVA_WEIGHTS.organ,true);pred=null;laps=[13,14,15];Z.fill(0);error=0;attention=0;processed=-1;lastAudioTick=-1;}
resetMachine();
function processTick(x){const o=organ.step(x);if(pred){error=pred.reduce((n,p,b)=>n+Math.abs(p-x[b]),0)/8;seed=seed*.985+error*.015*2;}pred=model.step(Array.from(x),o);laps=o.laps;Z=o.Z;attention=(model.share[0]+model.share[1])*.5;processed++;}
function syncSettings(){
 document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.scene===settings.scene)));
 const m=SCENES[settings.scene];$('sceneTitle').innerHTML=m[0];$('sceneFamily').textContent=m[1];$('sceneDesc').innerHTML=m[2];$('sceneIndex').textContent=String(settings.scene+1).padStart(2,'0');
 for(const k of ['energy','motion','detail']){$(k).value=settings[k];$(k+'Value').textContent=settings[k].toFixed(2);}
 document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.palette===settings.palette)));
 $('paletteName').textContent=WORLD_PALETTES[settings.palette].name;$('journey').setAttribute('aria-pressed',String(settings.auto));$('calm').checked=gentle;$('orbits').checked=orbits;
 saveSettings();
}
function changeScene(scene,automatic=false){
 journeyAge=0;
 if(automatic){transition={age:0,next:scene,switched:false};return;}
 transition=null;fade=1;settings.scene=(scene+6)%6;syncSettings();
 const b=document.querySelector('[data-scene="'+settings.scene+'"]');if(innerWidth<700)b.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
}
for(let i=0;i<WORLD_PALETTES.length;i++){
 const pal=WORLD_PALETTES[i],b=document.createElement('button');b.dataset.palette=i;b.setAttribute('aria-label',pal.name);b.title=pal.name;b.style.setProperty('--swatch',`linear-gradient(125deg,${pal.hex[0]},${pal.hex[1]},${pal.hex[2]})`);b.onclick=()=>{settings.palette=i;syncSettings();};$('palettes').append(b);
}
syncSettings();
function refreshTransport(){
 $('play').innerHTML=audio.playing?(audio.kind==='mic'||audio.kind==='tab'?'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5h10v10H5z"/></svg>':'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4h3v12H5zm7 0h3v12h-3z"/></svg>'):'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3l10 7-10 7z"/></svg>';
 $('play').setAttribute('aria-label',audio.playing?(audio.kind==='mic'||audio.kind==='tab'?'Stop live capture':'Pause audio'):'Play audio');$('liveDot').classList.toggle('on',audio.playing);
 $('sourceBadge').textContent=audio.playing?({demo:'GENERATIVE SESSION',file:'LISTENING LOCALLY',mic:'MICROPHONE LIVE',tab:'TAB AUDIO LIVE'}[audio.kind]):everStarted?'PAUSED':'VISUAL PREVIEW';
 $('timeline').disabled=!audio.duration;
 if(everStarted){$('start').hidden=true;document.querySelector('.scene-caption').classList.add('listening');}
 if(audio.kind==='demo'){$('trackTitle').textContent='Glasshouse';$('trackDetail').textContent='Original generative session · 112 BPM';}
 if(audio.kind==='mic'){$('trackTitle').textContent='Microphone / live input';$('trackDetail').textContent='Local capture · speaker monitoring off';}
 if(audio.kind==='tab'){$('trackTitle').textContent='Shared browser tab';$('trackDetail').textContent='Local capture · stop to release sharing';}
 if(audio.media?.error)notice('Audio playback failed. Try another file or format.');
}
async function togglePlay(){
 if(sourceBusy)return;
 try{if(audio.playing){audio.pause();if(recorder)stopRecording();}else{await audio.play();everStarted=true;}refreshTransport();}
 catch(e){notice(e.message||'Playback could not start.');refreshTransport();}
}
$('play').onclick=togglePlay;$('start').onclick=togglePlay;
function open(id){$(id).showModal();}
$('source').onclick=()=>open('sources');$('customize').onclick=()=>open('settings');$('help').onclick=()=>open('about');$('instrument').onclick=()=>open('science');
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
function setBusy(v){sourceBusy=v;for(const id of ['mic','tabAudio','demo','filePick','source','play','start'])$(id).disabled=v;}
async function switchSource(kind,file){
 if(sourceBusy)return;const token=++lastSourceToken;setBusy(true);
 try{
  let ok=true;
  if(kind==='file')ok=await audio.file(file);
  else if(kind==='demo')await audio.demo();
  else ok=await audio.live(kind);
  if(!ok||token!==lastSourceToken)return;
  resetMachine();everStarted=true;
  if(kind==='file'){$('trackTitle').textContent=file.name;$('trackDetail').textContent='Your music · analyzed live · never uploaded';}
  if($('sources').open)$('sources').close();
  notice(kind==='file'?'Your song is now shaping this world.':kind==='mic'?'Microphone connected. Press Stop to release it.':kind==='tab'?'Tab audio connected. Press Stop to release sharing.':'Glasshouse · an original generative session.');
 }catch(e){notice(e.name==='NotAllowedError'?'Capture was cancelled or permission was not granted.':e.message||'Could not open audio.');}
 finally{setBusy(false);refreshTransport();}
}
$('filePick').onclick=()=>$('upload').click();$('upload').onchange=e=>{const f=e.target.files[0];if(f)switchSource('file',f);e.target.value='';};
$('demo').onclick=()=>switchSource('demo');$('mic').onclick=()=>switchSource('mic');$('tabAudio').onclick=()=>switchSource('tab');
let dragDepth=0;
document.addEventListener('dragenter',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();dragDepth++;document.body.classList.add('dragging');}});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('dragleave',e=>{e.preventDefault();if(--dragDepth<=0){dragDepth=0;document.body.classList.remove('dragging');}});
document.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;document.body.classList.remove('dragging');const f=e.dataTransfer.files[0];if(f)switchSource('file',f);});
$('volume').oninput=e=>audio.setVolume(+e.target.value);
$('timeline').oninput=e=>{audio.seek(+e.target.value/1000);resetMachine();};
$('timeline').onchange=()=>notice('Moved in the song. Korva is listening afresh.',2500);
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>changeScene(+b.dataset.scene));
for(const k of ['energy','motion','detail'])$(k).oninput=e=>{settings[k]=+e.target.value;$(k+'Value').textContent=settings[k].toFixed(2);saveSettings();};
$('orbits').onchange=e=>{orbits=e.target.checked;saveSettings();};$('calm').onchange=e=>{gentle=e.target.checked;saveSettings();};
$('journey').onclick=()=>{settings.auto=!settings.auto;journeyAge=0;syncSettings();notice(settings.auto?'Auto journey on · a new world every 45 seconds.':'Auto journey off.');};
const presets=[{scene:0,palette:0,motion:.25,energy:1.1},{scene:1,palette:1,motion:.3,energy:.8},{scene:2,palette:2,motion:.55,energy:1.2},{scene:4,palette:3,motion:.3,energy:1.2}];
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const i=+b.dataset.preset;settings={...settings,...presets[i]};gentle=i===1;orbits=i===3;journeyAge=0;syncSettings();notice('Combination loaded.');});
$('reset').onclick=()=>{settings={...C.defaults};gentle=reduced;if(reduced)settings.motion=0;orbits=false;syncSettings();};
function setCinema(next){cinema=next;document.body.classList.toggle('cinematic',next);$('exitCinema').hidden=!next;if(next)$('exitCinema').focus();else $('cinema').focus();}
$('cinema').onclick=()=>setCinema(true);$('exitCinema').onclick=()=>setCinema(false);
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else notice('Fullscreen is not supported here. Try Cinema.');}catch{notice('Fullscreen is unavailable. Cinema still hides the controls.');}}
$('fullscreen').onclick=fullscreen;
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function snapshot(){try{$('stage').toBlob(b=>{if(b){download(b,'korva-'+SCENES[settings.scene][0].replace('<br>','-').toLowerCase()+'.png');notice('Picture saved.');}else notice('Picture could not be captured.');},'image/png');}catch(e){notice('Capture failed: '+e.message);}}
$('snapshot').onclick=snapshot;
$('share').onclick=()=>{
 const hash=C.encodeSettings(settings),base=location.protocol==='file:'?'https://anttiluode.github.io/MusicVisualizer1/':location.href.split('#')[0],url=base+hash;
 // Always expose a selectable URL: clipboard permissions can remain pending indefinitely.
 const d=document.createElement('dialog'),h=document.createElement('h2'),p=document.createElement('p'),field=document.createElement('input'),copy=document.createElement('button'),close=document.createElement('button');
 h.textContent='Your world, ready to share.';p.textContent='The link keeps your visual settings. Your audio stays with you.';field.value=url;field.readOnly=true;field.style.cssText='width:100%;padding:12px;background:#0a111a;border:1px solid #82998a55;color:#cde2d3;border-radius:4px';field.setAttribute('aria-label','Shareable visual settings link');
 copy.textContent='Copy link';copy.className='source-btn wide';copy.onclick=()=>{field.select();if(!navigator.clipboard){p.textContent='Press Ctrl+C (or long-press the selected link) to copy.';return;}navigator.clipboard.writeText(url).then(()=>p.textContent='Copied. Send someone a little universe.').catch(()=>p.textContent='Press Ctrl+C (or long-press the selected link) to copy.');};
 close.textContent='Done';close.className='quiet wide';close.onclick=()=>d.close();d.append(h,p,field,copy,close);document.body.append(d);d.onclose=()=>d.remove();d.showModal();field.focus();field.select();
};
window.addEventListener('hashchange',()=>{settings=C.parseSettings(location.hash);gentle=settings.gentle;orbits=settings.orbits;syncSettings();});
function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();}
async function record(){
 if(recorder){stopRecording();return;}
 if(!window.MediaRecorder||!$('stage').captureStream){notice('Video recording is unavailable in this browser. Save a picture instead.');return;}
 try{
  if(!audio.playing){await audio.play();everStarted=true;refreshTransport();}
  const video=$('stage').captureStream(30),tracks=[...video.getVideoTracks(),...audio.record.stream.getAudioTracks().map(t=>t.clone())];recordStream=new MediaStream(tracks);
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw Error('This browser cannot record WebM video.');
  const r=new MediaRecorder(recordStream,{mimeType:mime,videoBitsPerSecond:6000000}),chunks=[];let bytes=0,failed=false;
  recorder=r;recordStarted=performance.now();$('record').classList.add('active');$('record').setAttribute('aria-label','Stop video recording');$('record').querySelector('span').textContent='Stop 0s';
  r.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>100*1024*1024)stopRecording();}};
  r.onerror=()=>{failed=true;notice('Recording failed. Try a lower detail setting.');stopRecording();};
  r.onstop=()=>{
   clearTimeout(recordTimer);recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;recorder=null;$('record').classList.remove('active');$('record').setAttribute('aria-label','Start video recording');$('record').querySelector('span').textContent='Record';
   if(!failed&&chunks.length){download(new Blob(chunks,{type:mime}),'korva-worlds.webm');notice('Clip saved with audio.');}
  };
  r.start(1000);recordTimer=setTimeout(stopRecording,60000);notice('Recording the world + audio. Click Record again to finish; 60-second maximum.');
 }catch(e){recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;recorder=null;notice('Could not record: '+e.message);}
}
$('record').onclick=record;
document.addEventListener('keydown',e=>{
 if(e.target.isContentEditable||!C.acceptShortcut(e.target.closest('input,select,textarea,button,a')?.tagName||e.target.tagName,e.key,!!document.querySelector('dialog[open]')))return;
 if(e.code==='Space'){e.preventDefault();togglePlay();}
 if(/^[1-6]$/.test(e.key))changeScene(+e.key-1);
 if(e.key==='ArrowRight'){e.preventDefault();changeScene(settings.scene+1);}
 if(e.key==='ArrowLeft'){e.preventDefault();changeScene(settings.scene-1);}
 if(e.key.toLowerCase()==='h')setCinema(!cinema);
 if(e.key.toLowerCase()==='f')fullscreen();if(e.key.toLowerCase()==='s')snapshot();
});
let pointerDrag=null;
$('stage').addEventListener('pointerdown',e=>{pointerDrag=[e.clientX,e.clientY,...renderer.pointer];$('stage').setPointerCapture(e.pointerId);});
$('stage').addEventListener('pointermove',e=>{if(pointerDrag){renderer.pointer[0]=C.clamp(pointerDrag[2]+(e.clientX-pointerDrag[0])/innerWidth*2,-2,2);renderer.pointer[1]=C.clamp(pointerDrag[3]+(e.clientY-pointerDrag[1])/innerHeight*2,-1,1);}});
$('stage').addEventListener('pointerup',()=>pointerDrag=null);$('stage').addEventListener('pointercancel',()=>pointerDrag=null);
const preview={bands:new Float32Array([.3,.25,.25,.2,.25,.2,.15,.1]),pulse:0,rms:.15,centroid:.4,wave:new Float32Array(2048)};
const quiet={bands:new Float32Array(8),pulse:0,rms:0,centroid:0,wave:new Float32Array(2048)};
function clock(sec){const s=Math.max(0,Math.floor(sec||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function hud(a){
 $('elapsed').textContent=clock(audio.time);$('duration').textContent=audio.duration?clock(audio.duration):'LIVE';$('timeline').disabled=!audio.duration;
 if(audio.duration&&document.activeElement!==$('timeline'))$('timeline').value=String(1000*audio.time/audio.duration);
 for(let i=0;i<8;i++)meterEls[i].style.height=(3+a.bands[i]*19)+'px';
 $('laps').textContent=laps.join(' / ');$('error').textContent=processed<1?'—':Math.round(error*100)+'%';$('attention').textContent=processed<0?'—':Math.round(attention*100)+'%';
 if($('science').open){const g=$('ringMap').getContext('2d');g.clearRect(0,0,480,115);for(let i=0;i<52;i++){g.fillStyle=laps.includes(i+13)?'#b8e9c9':'#395560';const h=3+Math.min(100,Z[i]);g.fillRect(i*9.2,110-h,5,h);}}
 $('performance').textContent=renderer.gl?Math.round(1/Math.max(.001,renderer.quality.avg))+' FPS · AUTO '+Math.round(renderer.quality.scale*100)+'%':'CANVAS FALLBACK';
 if(recorder)$('record').querySelector('span').textContent='Stop '+Math.floor((performance.now()-recordStarted)/1000)+'s';
}
function render(now){
 const rawDt=lastFrame?(now-lastFrame)/1000:1/60,dt=Math.min(.05,rawDt);lastFrame=now;
 visualTime+=dt*settings.motion*(gentle?.35:1);let a;
 if(audio.playing){
  a=audio.read(dt)||quiet;a.wave=audio.wave;
  const tick=Math.floor(audio.time/.125);
  const action=C.tickAction(lastAudioTick,tick);
  if(action==='reset')resetMachine();
  if(action!=='none'){processTick(a.tick?a.tick():new Uint8Array(8));lastAudioTick=tick;}
  journeyAge+=dt;
 }else if(!everStarted){
  a=preview;
  for(let b=0;b<8;b++)preview.bands[b]=.16+.12*Math.sin(visualTime*.4+b*.7)**2;
  for(let i=0;i<2048;i++)preview.wave[i]=.2*Math.sin(i*.042)+.07*Math.sin(i*.071+visualTime*.2);
 }else a=quiet;
 if(settings.auto&&audio.playing&&journeyAge>45&&!transition)changeScene((settings.scene+1)%6,true);
 if(transition){transition.age+=dt;fade=.25+.75*Math.abs(transition.age-.8)/.8;if(transition.age>=.8&&!transition.switched){settings.scene=transition.next;transition.switched=true;syncSettings();}if(transition.age>=1.6){transition=null;fade=1;}}
 const drawSettings=gentle?{...settings,energy:Math.min(settings.energy,.65)}:settings;
 renderer.draw(drawSettings,a,visualTime,rawDt,{laps,tick:Math.max(0,processed)+(audio.time%.125)/.125,error,orbits,seed,fade});
 if(now-lastHud>200){hud(a);lastHud=now;}
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
refreshTransport();
if(renderer.error)notice('WebGL unavailable. The lightweight Canvas world is active.',8000);
window.addEventListener('pagehide',()=>{stopRecording();audio.clear();});
})();

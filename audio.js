/* Shared audio graph: analysis + recording always; speakers only for file/demo. */
(function(root){
'use strict';
class WorldAudio{
 constructor(onState){this.onState=onState;this.kind='demo';this.playing=false;this.generation=0;this.nodes=new Set();this.position=0;this.media=null;this.stream=null;this.url=null;this.volume=.65;this.step=0;this.timer=null;this.features=null;}
 async init(){
  if(!this.ctx){
   const AC=root.AudioContext||root.webkitAudioContext;if(!AC)throw Error('Web Audio is unavailable in this browser.');
   this.ctx=new AC();this.input=this.ctx.createGain();this.input.gain.value=.8;
   this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=.4;
   this.speakers=this.ctx.createGain();this.speakers.gain.value=this.volume;
   this.record=this.ctx.createMediaStreamDestination();
   this.input.connect(this.analyser);this.input.connect(this.record);this.input.connect(this.speakers);this.speakers.connect(this.ctx.destination);
   this.freq=new Float32Array(this.analyser.frequencyBinCount);this.wave=new Float32Array(this.analyser.fftSize);
   this.features=new WorldCore.Features(this.ctx.sampleRate,this.analyser.fftSize);
   const length=this.ctx.sampleRate;this.noise=this.ctx.createBuffer(1,length,this.ctx.sampleRate);const a=this.noise.getChannelData(0);let seed=12345;
   for(let i=0;i<length;i++){seed=(1664525*seed+1013904223)>>>0;a[i]=seed/2147483648-1;}
  }
  await this.ctx.resume();
 }
 notify(){this.onState?.();}
 async play(){
  await this.init();
  this.setVolume(this.volume);
  if(this.kind==='file'){if(this.media.ended)this.media.currentTime=0;await this.media.play();}
  if(this.playing)return;
  this.playing=true;
  if(this.kind==='demo'){this.origin=this.ctx.currentTime-this.position;this.next=this.ctx.currentTime+.04;this.timer=setInterval(()=>this.schedule(),25);this.schedule();}
  this.notify();
 }
 pause(){
  if(this.kind==='mic'||this.kind==='tab'){this.clear();this.kind='demo';this.position=0;this.step=0;this.notify();return;}
  if(this.playing&&this.kind==='demo')this.position=this.time;
  this.playing=false;clearInterval(this.timer);this.timer=null;
  if(this.media)this.media.pause();
  for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();this.notify();
 }
 clear(){
  ++this.generation;this.pauseNonRecursive();
  if(this.media){this.media.onended=null;this.media.onerror=null;this.media.onpause=null;this.media.pause();this.media.removeAttribute('src');this.media.load();this.media=null;}
  if(this.mediaNode){this.mediaNode.disconnect();this.mediaNode=null;}
  if(this.stream){this.stream.getTracks().forEach(t=>{t.onended=null;t.stop();});this.stream=null;}
  if(this.url){URL.revokeObjectURL(this.url);this.url=null;}
  if(this.features)this.features=new WorldCore.Features(this.ctx.sampleRate,2048);
 }
 pauseNonRecursive(){this.playing=false;clearInterval(this.timer);this.timer=null;for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();}
 async demo(){this.clear();this.kind='demo';this.position=0;this.step=0;await this.init();this.speakers.gain.value=this.volume;await this.play();}
 async file(file){
  await this.init();this.clear();const token=this.generation;this.kind='file';this.speakers.gain.value=this.volume;
  this.url=URL.createObjectURL(file);this.media=new Audio();this.media.preload='auto';this.media.src=this.url;
  this.mediaNode=this.ctx.createMediaElementSource(this.media);this.mediaNode.connect(this.input);
  this.media.onended=()=>{this.playing=false;this.notify();};
  this.media.onpause=()=>{this.playing=false;this.notify();};
  this.media.onerror=()=>{this.playing=false;this.notify();};
  try{await this.media.play();if(token!==this.generation)return false;this.playing=true;this.notify();return true;}
  catch(e){if(token===this.generation){this.clear();this.kind='demo';this.position=0;this.step=0;this.notify();}throw e;}
 }
 async live(kind){
  await this.init();const token=++this.generation;
  let stream;
  if(kind==='mic'){
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone needs HTTPS or localhost and browser support.');
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  }else{
   if(!navigator.mediaDevices?.getDisplayMedia)throw Error('Tab audio sharing is unavailable here. Try desktop Chrome or Edge.');
   stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
  }
  if(token!==this.generation){stream.getTracks().forEach(t=>t.stop());return false;}
  if(!stream.getAudioTracks().length){stream.getTracks().forEach(t=>t.stop());throw Error('No audio was shared. Choose a browser tab and enable “Share tab audio”.');}
  this.clear();this.kind=kind;this.stream=stream;this.origin=this.ctx.currentTime;this.position=0;
  this.mediaNode=this.ctx.createMediaStreamSource(stream);this.mediaNode.connect(this.input);this.speakers.gain.value=0;
  this.playing=true;
  stream.getTracks().forEach(t=>t.onended=()=>{this.clear();this.kind='demo';this.position=0;this.step=0;this.notify();});
  this.notify();return true;
 }
 setVolume(v){this.volume=v;if(this.speakers)this.speakers.gain.value=(this.kind==='mic'||this.kind==='tab')?0:v;}
 get time(){if(this.kind==='file')return this.media?.currentTime||0;return this.playing?Math.max(0,this.ctx.currentTime-this.origin):this.position;}
 get duration(){return this.kind==='file'&&Number.isFinite(this.media?.duration)?this.media.duration:0;}
 seek(fraction){if(this.duration)this.media.currentTime=WorldCore.clamp(fraction)*this.duration;}
 read(dt){if(!this.analyser)return null;this.analyser.getFloatFrequencyData(this.freq);this.analyser.getFloatTimeDomainData(this.wave);this.features.update(this.freq,this.wave,dt);return this.features;}
 voice(freq,time,duration,volume,type='sine',slide=0){
  const osc=this.ctx.createOscillator(),g=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,time);
  if(slide)osc.frequency.exponentialRampToValueAtTime(slide,time+duration*.8);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(g);g.connect(this.input);this.nodes.add(osc);osc.onended=()=>{osc.disconnect();g.disconnect();this.nodes.delete(osc);};osc.start(time);osc.stop(time+duration+.02);
 }
 hiss(time,duration,volume,cut){
  const n=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();n.buffer=this.noise;f.type='highpass';f.frequency.value=cut;
  g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+duration);n.connect(f);f.connect(g);g.connect(this.input);
  this.nodes.add(n);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();this.nodes.delete(n);};n.start(time);n.stop(time+duration);
 }
 schedule(){
  if(!this.playing||this.kind!=='demo')return;
  const now=this.ctx.currentTime,stepDuration=60/112/4;
  // Never replay a burst of stale notes after background throttling.
  if(this.next<now-.1){const skip=Math.ceil((now-this.next)/stepDuration);this.step+=skip;this.next+=skip*stepDuration;}
  while(this.next<now+.12){
   const s=this.step++,t=this.next,p=s%16,bar=Math.floor(s/16),root=[55,65.406,43.654,49][Math.floor(bar/2)%4];
   if(p%4===0)this.voice(135,t,.28,.48,'sine',42);
   if(p===4||p===12){this.hiss(t,.13,.11,1400);this.voice(180,t,.12,.1,'triangle',65);}
   if(p%2===0)this.hiss(t,.035,p%4===2?.055:.025,6500);
   if(p===0||p===6||p===10)this.voice(root,t,.35,.2,'triangle');
   const notes=[0,7,12,15,19,12,7,10],pitch=root*4*Math.pow(2,notes[Math.floor(s/2)%8]/12);
   if(s%2===0)this.voice(pitch,t,.48,.035,'sine');
   if(p===0)for(const semitone of [0,7,15])this.voice(root*2*Math.pow(2,semitone/12),t,1.9,.023,'sine');
   this.next+=stepDuration;
  }
 }
}
root.WorldAudio=WorldAudio;
})(window);

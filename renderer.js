/* Original procedural art inspired by Antti's visual experiments.
   Bounded ray marching; no imported renderer, neural light transport or voxel simulation. */
(function(root){
'use strict';
const VERT='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG=`precision highp float;
uniform vec2 res;uniform float time, bass, mid, high, pulse, surprise, energy, detail, fade, seed;
uniform vec2 pointer;uniform int scene;uniform vec3 ca,cb,cc;
#define PI 3.14159265
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
vec3 palette(float t){return mix(mix(ca,cb,.5+.5*sin(t*3.1)),cc,pow(.5+.5*cos(t*2.3),3.)*.7);}
float crystal(vec3 p,float height,float width){
 p=abs(p);return max(max(p.x*.866025+p.z*.5,p.z)-width*(1.-p.y/height),p.y-height)*.66;
}
float map(vec3 p){
 if(scene==0){
  p.xz=rot(time*.055+seed)*p.xz;
  float a=atan(p.z,p.x),sector=6.2831853/7.;
  vec3 q=p;q.xz=rot(-floor(a/sector+.5)*sector)*q.xz;q.x-=1.7+.12*bass;
  float d=crystal(q-vec3(0.,-.12,0.),1.15+.23*mid,.47);
  d=min(d,crystal(p-vec3(0.,.25,0.),1.75+.12*bass,.66));
  vec3 r=p;r.xz=rot(.45)*r.xz;a=atan(r.z,r.x);r.xz=rot(-floor(a/sector+.5)*sector)*r.xz;r.x-=2.75;r.y+=.7;
  d=min(d,crystal(r,.7,.3));return min(d,p.y+1.65);
 }
 if(scene==1){
  p.yz=rot(-.42+pointer.y*.25)*p.yz;p.xz=rot(time*.08)*p.xz;
  float a=atan(p.z,p.x),r=length(p.xz);
  float petal=1.18+.36*cos(a*7.+time*.13)+.12*mid*cos(a*14.-time*.2);
  float y=.24*sin(a*7.+time*.1);
  float d=length(vec2(r-petal,p.y-y))-(.12+.07*bass);
  d=min(d,length(vec2(r-petal*.65,p.y+y*.7))-.085);
  d=min(d,length(vec2(r-petal*1.37,p.y-y*.5))-.055);
  return min(d,length(p)-.22-.07*bass)*.45;
 }
 // Event Horizon: an endless sequence of twisted, rounded portals.
 vec3 q=p;q.z+=time*.7;float id=floor((q.z+1.)/2.);q.z=mod(q.z+1.,2.)-1.;
 q.xy=rot(id*.18+time*.08)*q.xy;
 float a=atan(q.y,q.x),r=length(q.xy);
 float radius=1.9+.17*cos(a*6.+id*.35)+.1*bass;
 return length(vec2(r-radius,q.z))-(.08+.035*mid);
}
vec3 normal(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
vec3 sky(vec3 rd){
 float f=pow(max(0.,1.-abs(rd.y+.04)),5.);
 vec3 c=mix(vec3(.006,.009,.02),ca*.05,f);
 c+=cb*.009/(.13+abs(rd.y+.16));
 vec3 cell=floor(rd*390.);float star=step(.9987,hash(cell));
 c+=star*pow(max(0.,1.-length(fract(rd*390.)-.5)),8.)*.7;
 return c;
}
vec3 worlds(vec2 uv){
 vec3 ro,ta=vec3(0.);
 if(scene==5){ro=vec3(.18*sin(time*.13),.15*cos(time*.1),-4.);ta=vec3(0.,0.,1.);}
 else{float orbit=time*.045+pointer.x*.45;ro=vec3(sin(orbit)*(scene==1?6.7:8.5),scene==1?4.6:2.8,cos(orbit)*(scene==1?6.7:8.5));ta=vec3(0.,scene==1?0.:-.12,0.);}
 vec3 ww=normalize(ta-ro),uu=normalize(cross(ww,vec3(0.,1.,0.))),vv=cross(uu,ww);
 vec3 rd=normalize(uv.x*uu+uv.y*vv+1.65*ww);
 float t=0.,glow=0.,d=0.;vec3 pos=ro;bool hit=false;
 for(int i=0;i<96;i++){
  if(float(i)>mix(60.,95.,detail))break;
  pos=ro+rd*t;d=map(pos);
  glow+=exp(-max(d,0.)*20.)*.007;
  if(d<.003){hit=true;break;}t+=max(.002,d*.78);if(t>24.)break;
 }
 vec3 col=sky(rd);
 if(hit){
  vec3 n=normal(pos),l=normalize(vec3(-3.,5.,4.)),v=-rd;
  float diffuse=max(0.,dot(n,l)),rim=pow(1.-max(0.,dot(n,v)),3.);
  vec3 base=palette(pos.y*.7+length(pos.xz)*.6+time*.035+seed);
  float spec=pow(max(0.,dot(reflect(-l,n),v)),44.);
  vec3 reflected=sky(reflect(rd,n));
  col=base*(.12+diffuse*.48)+reflected*1.5+spec*vec3(1.,.94,.83)*1.5+rim*base*.9;
  if(scene==0){
   float facets=pow(abs(sin(pos.y*13.+pos.x*8.+pos.z*11.)),16.);
   col+=base*facets*.1;
   if(pos.y< -1.63){
    float ring=pow(.5+.5*cos(length(pos.xz)*7.-time*.2),35.);
    col=reflected*.8+ca*.04+ring*ca*.11;
    col+=cb*.16/(.35+dot(pos.xz,pos.xz));
   }else col+=cc*pow(max(0.,-dot(n,l)),2.)*.22;
  }
  if(scene==1)col+=base*pow(.5+.5*sin(atan(pos.z,pos.x)*70.+pos.y*12.),9.)*(.2+.25*high);
  if(scene==5)col=base*(.45+diffuse*.4+rim*.8)+spec*.5;
  col=mix(col,sky(rd),1.-exp(-t*t*.007));
 }
 col+=palette(t*.12+seed)*glow*(scene==5?1.2:.23);
 return col;
}
vec3 tides(vec2 uv){
 uv=rot(-.22+pointer.x*.1)*uv;vec3 c=vec3(.006,.012,.022);
 float wave=0.;
 for(int i=0;i<28;i++){
  float k=float(i)/27.;
  float y=(k-.5)*1.85;
  y+=.26*sin(uv.x*1.8+time*.22+k*4.)+.12*sin(uv.x*3.-time*.15+k*7.)+.09*mid*sin(uv.x*8.+time*.2+k*4.);
  float d=abs(uv.y-y);float width=.001+.002*bass;
  vec3 col=palette(k*1.9+uv.x*.12+seed);
  c+=col*width/(d+.012)*(.22+.25*sin(k*PI));
  c+=col*.00018/(d*d+.0002)*(.08+.06*high);
  wave+=exp(-d*10.);
 }
 c+=cb*.015*wave;return c;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*res)/res.y;
 // Keep the hero comfortably inside a portrait screen.
 if(res.x<res.y)uv*=mix(1.,1.65,clamp(1.-res.x/res.y,0.,1.));
 vec3 c;
 if(scene==2)c=tides(uv);
 else if(scene==3||scene==4){
  float r=length(uv);c=vec3(.005,.009,.018)+ca*.018/(.08+r*r);
  c+=cb*.008/(.04+abs(r-.56-.015*sin(time*.2)));
  c+=palette(seed+uv.x)*.012*pow(.5+.5*sin(uv.x*3.+uv.y*4.+time*.08),4.);
 }else c=worlds(uv);
 float vignette=1.-.33*smoothstep(.25,1.2,length(uv));
 c*=vignette*(.85+.32*energy+.18*pulse);
 c=vec3(1.)-exp(-c*1.25);c=pow(max(c,vec3(0.)),vec3(.88));
 c+=((hash(vec3(gl_FragCoord.xy,0.))-.5)/255.);
 gl_FragColor=vec4(c*fade,1.);
}`;
const PALETTES=[
 {name:'Opal',a:[.18,.85,.81],b:[.65,.38,.95],c:[1.,.67,.3],hex:['#52d9cf','#b28bfa','#ffcc83']},
 {name:'Ember',a:[1.,.22,.065],b:[.85,.06,.23],c:[1.,.75,.3],hex:['#ff773d','#e84d78','#ffe0a0']},
 {name:'Glacier',a:[.12,.5,.95],b:[.15,.85,.9],c:[.75,.9,1.],hex:['#559cff','#67e5e9','#e2f6ff']},
 {name:'Orchid',a:[.68,.15,.95],b:[1.,.22,.5],c:[.3,.55,1.],hex:['#c272ff','#ff79ad','#88aaff']},
 {name:'Gold',a:[.8,.58,.22],b:[.95,.8,.45],c:[.9,.96,.8],hex:['#cea253','#ffe4a3','#f6ffe4']}
];
class WorldRenderer{
 constructor(canvas){
  this.canvas=canvas;this.layer=document.createElement('canvas');this.ink=document.createElement('canvas');this.ctx=canvas.getContext('2d',{alpha:false});this.ic=this.ink.getContext('2d');this.quality=new WorldCore.Quality();this.pointer=[0,0];this.lastScene=-1;this.error=null;
  try{this.gl=this.layer.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGL unavailable');this.build();}
  catch(e){this.error=e.message;console.warn("Korva renderer:",e.message);this.gl=null;}
  this.layer.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.error='Graphics context lost. Canvas fallback active.';});
  this.layer.addEventListener('webglcontextrestored',()=>{try{this.gl=this.layer.getContext('webgl');this.build();this.error=null;}catch(e){this.gl=null;this.error=e.message;}});
  this.stars=Array.from({length:100},(_,i)=>({x:this.random(i*3),y:this.random(i*3+1),s:this.random(i*3+2)}));
 }
 random(n){return Math.abs(Math.sin(n*127.1+91.2)*43758.5453)%1;}
 build(){
  const gl=this.gl,compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram(),v=compile(gl.VERTEX_SHADER,VERT),f=compile(gl.FRAGMENT_SHADER,FRAG);gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.deleteShader(v);gl.deleteShader(f);this.program=program;gl.useProgram(program);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  this.u={};for(const k of ['res','time','bass','mid','high','pulse','surprise','energy','detail','fade','seed','pointer','scene','ca','cb','cc'])this.u[k]=gl.getUniformLocation(program,k);
 }
 resize(w,h,detail){
  this.w=w;this.h=h;
  const display=Math.min(devicePixelRatio||1,1.5),cw=Math.max(1,Math.floor(w*display)),ch=Math.max(1,Math.floor(h*display));
  if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;this.ink.width=cw;this.ink.height=ch;}
  this.dpr=display;
  const size=WorldCore.renderSize(w,h,devicePixelRatio||1,this.quality.scale*(.55+.45*detail));
  if(this.layer.width!==size[0]||this.layer.height!==size[1]){this.layer.width=size[0];this.layer.height=size[1];if(this.gl)this.gl.viewport(0,0,...size);}
 }
 draw(s,a,t,dt,meta){
  this.quality.update(dt);this.resize(innerWidth,innerHeight,s.detail);const g=this.ctx,pal=PALETTES[s.palette];
  if(this.lastScene!==s.scene){this.ic.clearRect(0,0,this.ink.width,this.ink.height);this.lastScene=s.scene;}
  const bands=a.bands,bass=(bands[0]+bands[1])*.5*s.energy,mid=(bands[2]+bands[3]+bands[4])/3*s.energy,high=(bands[5]+bands[6]+bands[7])/3*s.energy;
  if(this.gl){
   const gl=this.gl,u=this.u;gl.useProgram(this.program);gl.uniform2f(u.res,this.layer.width,this.layer.height);gl.uniform1i(u.scene,s.scene);gl.uniform1f(u.time,t);gl.uniform1f(u.seed,meta.seed||0);gl.uniform2fv(u.pointer,this.pointer);
   for(const [k,v] of Object.entries({bass,mid,high,pulse:a.pulse,surprise:meta.error,energy:s.energy,detail:s.detail,fade:meta.fade??1}))gl.uniform1f(u[k],v||0);
   gl.uniform3fv(u.ca,pal.a);gl.uniform3fv(u.cb,pal.b);gl.uniform3fv(u.cc,pal.c);gl.drawArrays(gl.TRIANGLES,0,6);g.drawImage(this.layer,0,0,this.canvas.width,this.canvas.height);
  }else{g.fillStyle='#050a13';g.fillRect(0,0,this.canvas.width,this.canvas.height);}
  g.save();g.scale(this.dpr,this.dpr);
  if(s.scene===3)this.phase(s,a,t,pal,meta);
  if(s.scene===4)this.cortex(s,a,t,pal,meta);
  if(!this.gl&&s.scene!==3&&s.scene!==4)this.fallback(s,a,t,pal);
  if(meta.orbits)this.orbits(s,a,t,pal,meta);
  g.save();g.globalCompositeOperation='lighter';for(let i=0;i<this.stars.length;i++){const p=this.stars[i];g.globalAlpha=.08+a.bands[i%8]*.2;g.fillStyle=pal.hex[i%3];const x=(p.x*this.w+Math.sin(t*.12+p.y*6)*15),y=p.y*this.h;g.fillRect(x,y,.6+p.s,.6+p.s);}g.restore();
  g.restore();
 }
 project(x,y,z,t,scale){
  const c=Math.cos(t*.12+this.pointer[0]*.5),sn=Math.sin(t*.12+this.pointer[0]*.5);let X=x*c-z*sn,Z=x*sn+z*c;
  const angle=.25+this.pointer[1]*.3,Y=y*Math.cos(angle)-Z*Math.sin(angle);Z=y*Math.sin(angle)+Z*Math.cos(angle);
  const perspective=3.8/(3.8+Z);return [this.w*.5+X*scale*perspective,this.h*.49+Y*scale*perspective,perspective];
 }
 phase(s,a,t,pal,meta){
  const c=this.ic,w=this.w,h=this.h,scale=Math.min(w*.37,h*.30);c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.14)';c.fillRect(0,0,w,h);c.globalCompositeOperation='lighter';
  const wave=a.wave,delay=18+Math.floor(a.centroid*42),gain=Math.min(5, .42/Math.max(.06,a.rms))*s.energy;
  if(wave)for(let strand=0;strand<3;strand++){
   c.beginPath();for(let i=0;i<900;i+=2){const p=WorldCore.phasePoint(wave,i+strand*7,delay);const q=this.project(p[0]*gain,p[1]*gain,p[2]*gain,t,scale);if(i===0)c.moveTo(q[0],q[1]);else c.lineTo(q[0],q[1]);}
   c.strokeStyle=pal.hex[strand];c.globalAlpha=strand===0?.8:.3;c.lineWidth=strand===0?1.3:.6;c.shadowColor=pal.hex[strand];c.shadowBlur=7;c.stroke();
  }
  c.restore();this.ctx.save();this.ctx.setTransform(1,0,0,1,0,0);this.ctx.drawImage(this.ink,0,0);this.ctx.restore();
 }
 cortex(s,a,t,pal,meta){
  const g=this.ctx,scale=Math.min(this.w*.30,this.h*.29),points=[],count=120;
  for(let i=0;i<count;i++){
   const y=1-2*(i+.5)/count,angle=i*2.39996323+t*.08,r=Math.sqrt(1-y*y)*(1+.08*Math.sin(i*.7+t)+a.bands[i%8]*.18*s.energy);
   points.push(this.project(Math.cos(angle)*r,y,Math.sin(angle)*r,t,scale));
  }
  g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<count;i++)for(let k=1;k<=4;k++){
   const j=(i+[8,13,21,34][k-1])%count,p=points[i],q=points[j],distance=Math.hypot(p[0]-q[0],p[1]-q[1]);if(distance>scale*.75)continue;
   const band=a.bands[i%8];g.globalAlpha=(.04+.18*band)*Math.min(1,p[2]);g.strokeStyle=pal.hex[i%3];g.lineWidth=.65;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();
   const f=(t*.12+i*.037)%1;g.globalAlpha=.25*band;g.beginPath();g.arc(p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f,1.5,0,Math.PI*2);g.fillStyle=pal.hex[i%3];g.fill();
  }
  for(let i=0;i<count;i++){const p=points[i],level=a.bands[i%8];g.globalAlpha=.35+level*.55;g.fillStyle=pal.hex[i%3];g.shadowColor=g.fillStyle;g.shadowBlur=8;g.beginPath();g.arc(p[0],p[1],(.8+level*2.5)*p[2],0,Math.PI*2);g.fill();}
  g.restore();
 }
 orbits(s,a,t,pal,meta){
  const g=this.ctx,scale=Math.min(this.w*.39,this.h*.37);g.save();g.globalCompositeOperation='lighter';
  for(let j=0;j<3;j++){
   const L=meta.laps[j],r=1+j*.12;g.beginPath();for(let k=0;k<=120;k++){const angle=k/120*Math.PI*2,p=this.project(Math.cos(angle)*r,Math.sin(angle)*r*.5,Math.sin(angle)*r*.55+j*.12,t*.4,scale);if(!k)g.moveTo(...p.slice(0,2));else g.lineTo(...p.slice(0,2));}
   g.globalAlpha=.18;g.strokeStyle=pal.hex[j];g.lineWidth=.8;g.stroke();const angle=(meta.tick%L)/L*Math.PI*2,p=this.project(Math.cos(angle)*r,Math.sin(angle)*r*.5,Math.sin(angle)*r*.55+j*.12,t*.4,scale);g.globalAlpha=.85;g.fillStyle=pal.hex[j];g.shadowColor=pal.hex[j];g.shadowBlur=12;g.beginPath();g.arc(p[0],p[1],2.4,0,Math.PI*2);g.fill();
  }g.restore();
 }
 fallback(s,a,t,pal){
  const g=this.ctx,cx=this.w/2,cy=this.h*.47,r=Math.min(this.w*.34,this.h*.29);
  const haze=g.createRadialGradient(cx,cy,0,cx,cy,r*1.7);haze.addColorStop(0,pal.hex[0]+'12');haze.addColorStop(.6,pal.hex[1]+'08');haze.addColorStop(1,'#00000000');g.fillStyle=haze;g.fillRect(0,0,this.w,this.h);
  g.save();
  if(s.scene===0){
   const crystals=[];
   for(let j=0;j<8;j++){const angle=j/7*Math.PI*2+t*.09,rad=j===7?0:1.15;crystals.push({x:Math.cos(angle)*rad,y:j===7?-.22:.1,z:Math.sin(angle)*rad,height:j===7?1.4:.65+a.bands[j%8]*.38,width:j===7?.45:.25});}
   crystals.sort((a,b)=>b.z-a.z);
   for(let j=0;j<crystals.length;j++){
    const k=crystals[j],top=this.project(k.x,k.y-k.height,k.z,t,r*.64),bottom=this.project(k.x,k.y+k.height*.75,k.z,t,r*.64),ring=[];
    for(let n=0;n<6;n++){const angle=n/6*Math.PI*2;ring.push(this.project(k.x+Math.cos(angle)*k.width,k.y,k.z+Math.sin(angle)*k.width,t,r*.64));}
    for(let n=0;n<6;n++)for(let side=0;side<2;side++){
     const a=ring[n],b=ring[(n+1)%6],p=side?bottom:top;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.closePath();const grad=g.createLinearGradient(p[0],p[1],a[0],a[1]);grad.addColorStop(0,pal.hex[(j+n)%3]+'c0');grad.addColorStop(1,side?'#101c3044':pal.hex[(j+n+1)%3]+'38');g.fillStyle=grad;g.fill();g.strokeStyle=pal.hex[n%3]+'55';g.lineWidth=.6;g.stroke();
    }
   }
  }else if(s.scene===2){
   g.globalCompositeOperation='lighter';for(let j=0;j<30;j++){
    g.beginPath();for(let i=0;i<=120;i++){const u=i/120,x=this.w*u,y=cy+(j-15)*r*.06+Math.sin(u*6+t*.22+j*.09)*r*.37+Math.sin(u*11-t*.1+j*.17)*r*.14+a.bands[j%8]*Math.sin(u*17+j)*r*.06;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}
    g.strokeStyle=pal.hex[j%3];g.lineWidth=.8;g.globalAlpha=.25+Math.sin(j/30*Math.PI)*.25;g.shadowColor=g.strokeStyle;g.shadowBlur=6;g.stroke();
   }
  }else if(s.scene===5){
   g.globalCompositeOperation='lighter';for(let j=20;j>=0;j--){
    const depth=(j+(t*.6)%1)/21,rr=r*.12/(.10+depth),rotation=j*.12+t*.05;g.beginPath();for(let i=0;i<=100;i++){const angle=i/100*Math.PI*2,rad=rr*(1+.08*Math.cos(angle*6)+a.bands[j%8]*.06),x=cx+Math.cos(angle+rotation)*rad,y=cy+Math.sin(angle+rotation)*rad;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}
    g.strokeStyle=pal.hex[j%3];g.globalAlpha=.1+.5*(1-depth);g.lineWidth=1.5+2*(1-depth);g.shadowBlur=9;g.shadowColor=g.strokeStyle;g.stroke();
   }
  }else{
   g.globalCompositeOperation='lighter';
   for(let layer=0;layer<22;layer++){
    g.beginPath();for(let i=0;i<=280;i++){const angle=i/280*Math.PI*2,rad=r*(.35+layer*.032)*(1+.25*Math.cos(angle*7+layer*.15+t*.1)+a.bands[layer%8]*.16*s.energy);const x=cx+Math.cos(angle+t*.05)*rad,y=cy+Math.sin(angle+t*.05)*rad*.65+Math.sin(angle*3+t*.2)*rad*.18;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}
    g.strokeStyle=pal.hex[layer%3];g.globalAlpha=.25;g.lineWidth=1.2;g.shadowColor=g.strokeStyle;g.shadowBlur=6;g.stroke();
   }
  }
  g.restore();

 }
}
root.WorldRenderer=WorldRenderer;root.WORLD_PALETTES=PALETTES;
})(window);

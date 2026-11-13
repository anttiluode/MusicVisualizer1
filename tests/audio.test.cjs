const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm'),fs=require('node:fs');
function make(){
 const box={window:{},navigator:{mediaDevices:{}},setInterval:()=>1,clearInterval(){},URL:{revokeObjectURL(){}}};vm.createContext(box);vm.runInContext(fs.readFileSync('audio.js','utf8'),box);
 const a=new box.window.WorldAudio();a.ctx={currentTime:10,resume:async()=>{}};a.speakers={gain:{value:0}};a.schedule=()=>{};return {a,box};
}
test('playing demo after stopped live capture restores speaker gain',async()=>{
 const {a}=make();a.kind='mic';a.playing=true;a.pause();assert.equal(a.kind,'demo');await a.play();assert.equal(a.speakers.gain.value,a.volume);
});
test('natural end of sharing releases all tracks and subsequent demo is audible',async()=>{
 const {a,box}=make();let stopped=0,disconnected=0;const tracks=[{stop(){stopped++}},{stop(){stopped++}}];
 const stream={getTracks:()=>tracks,getAudioTracks:()=>[tracks[0]]};box.navigator.mediaDevices.getDisplayMedia=async()=>stream;a.ctx.createMediaStreamSource=()=>({connect(){},disconnect(){disconnected++}});
 await a.live('tab');assert.equal(a.speakers.gain.value,0);tracks[1].onended();assert.equal(stopped,2);assert.equal(disconnected,1);await a.play();assert.equal(a.speakers.gain.value,.65);
});
test('permission denial preserves current source and playback',async()=>{
 const {a,box}=make();a.kind='demo';a.playing=true;box.navigator.mediaDevices.getUserMedia=async()=>{throw Error('denied')};
 await assert.rejects(a.live('mic'),/denied/);assert.equal(a.kind,'demo');assert.equal(a.playing,true);
});
test('a late permission result is stopped after clear',async()=>{
 const {a,box}=make();let resolve,stopped=0;box.navigator.mediaDevices.getUserMedia=()=>new Promise(r=>resolve=r);
 const pending=a.live('mic');await new Promise(setImmediate);a.clear();resolve({getTracks:()=>[{stop(){stopped++}}],getAudioTracks:()=>[{}]});assert.equal(await pending,false);assert.equal(stopped,1);
});
test('sharing without audio releases video track and leaves old source',async()=>{
 const {a,box}=make();let stopped=0;box.navigator.mediaDevices.getDisplayMedia=async()=>({getTracks:()=>[{stop(){stopped++}}],getAudioTracks:()=>[]});await assert.rejects(a.live('tab'),/No audio/);assert.equal(stopped,1);assert.equal(a.kind,'demo');
});

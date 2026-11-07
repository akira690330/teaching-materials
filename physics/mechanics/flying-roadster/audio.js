/**
 * 音效：以 Web Audio API 即時合成（不使用音檔），每格由模擬狀態驅動。
 * 冷氣體推進器噴的是壓縮空氣，所以是「嘶——」的氣流聲，不是燃燒的轟隆聲。
 * 依賴：sim.js（clamp）、draw2d.js（$）；由 ui.js 每格呼叫 audioUpdate()
 */
const AU_TAU=0.05, AU_FADE=0.07, AU_VOL=0.55, AU_KEY='roadster-muted';
let AU=null, muted=false, auLastT=-1, auLastShk=0;
try{muted=localStorage.getItem(AU_KEY)==='1';}catch(e){muted=false;}

/* ---- 建立音訊節點 ---- */
function auFilter(ctx,type,freq,Q=0.7){const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=Q;return f;}
function auNoise(A){const s=A.ctx.createBufferSource();s.buffer=A.noise;s.loop=true;s.start(0,Math.random()*1.9);A.noiseSrcs.push(s);return s;}
function auOsc(A,type,freq){const o=A.ctx.createOscillator();o.type=type;o.frequency.value=freq;o.start();return o;}
function auLayer(A,src,filters){
  const g=A.ctx.createGain();g.gain.value=0;
  let p=src;for(const f of filters){p.connect(f);p=f;}
  p.connect(g);g.connect(A.bus);return g;
}
function auBuild(ctx){
  const n=ctx.sampleRate*2, noise=ctx.createBuffer(1,n,ctx.sampleRate), d=noise.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  const A={ctx,noise,noiseSrcs:[]};
  const comp=ctx.createDynamicsCompressor();comp.connect(ctx.destination);
  A.master=ctx.createGain();A.master.gain.value=0;A.master.connect(comp);
  A.bus=auFilter(ctx,'lowpass',18000,0.5);A.bus.connect(A.master);   // 慢動作時調低截止頻率 → 聲音變悶
  A.fanAir=auLayer(A,auNoise(A),[auFilter(ctx,'bandpass',380,0.9)]);  // 吸地風扇氣流
  A.fanOsc=auOsc(A,'sawtooth',210);A.fanWhine=auLayer(A,A.fanOsc,[auFilter(ctx,'lowpass',1200,1)]);
  A.hiss=auLayer(A,auNoise(A),[auFilter(ctx,'highpass',1800),auFilter(ctx,'lowpass',9000)]); // 主推進器、向下噴嘴
  A.puff=auLayer(A,auNoise(A),[auFilter(ctx,'bandpass',2600,1.4)]);   // 姿態推進器
  A.motOsc=auOsc(A,'triangle',120);A.motor=auLayer(A,A.motOsc,[auFilter(ctx,'lowpass',2500)]);
  A.tire=auLayer(A,auNoise(A),[auFilter(ctx,'lowpass',180)]);
  A.windF=auFilter(ctx,'bandpass',600,0.6);A.wind=auLayer(A,auNoise(A),[A.windF]);
  return A;
}
function audioInit(){
  if(AU){if(AU.ctx.state==='suspended')AU.ctx.resume().catch(e=>console.warn('音效無法恢復',e));return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{AU=auBuild(new AC());}catch(e){console.warn('音效初始化失敗，改為無聲',e);AU=null;}
}

/* ---- 衝擊聲：彈射、落地 ---- */
function auThump(A,amp,k){
  const c=A.ctx,t=c.currentTime,a=clamp(amp,0.1,1);
  const o=c.createOscillator(),g=c.createGain();
  o.type='sine';o.frequency.setValueAtTime(90*k,t);o.frequency.exponentialRampToValueAtTime(32*k,t+0.35);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(a,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+0.5);
  o.connect(g);g.connect(A.bus);o.start(t);o.stop(t+0.55);
  const n=c.createBufferSource(),ng=c.createGain(),lp=auFilter(c,'lowpass',500*k);
  n.buffer=A.noise;ng.gain.setValueAtTime(0.5*a,t);ng.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
  n.connect(lp);lp.connect(ng);ng.connect(A.bus);n.start(t,Math.random());n.stop(t+0.3);
}

/* ---- 每格更新 ---- */
function auSet(param,v){param.setTargetAtTime(v,AU.ctx.currentTime,AU_TAU);}
function auLayers(s,k){
  const A=AU, v=Math.hypot(s.vx,s.vy), ground=s.contact?1:0, w=Math.min(1,(v/27)**2);
  auSet(A.fanAir.gain,0.5*s.fanV); auSet(A.fanWhine.gain,0.05*s.fanV); auSet(A.fanOsc.frequency,(150+90*s.fanV)*k);
  auSet(A.hiss.gain,0.45*Math.min(1,s.mainV)+0.3*Math.min(1,s.downV/2));
  auSet(A.puff.gain,0.25*s.attV);
  auSet(A.motor.gain,ground*Math.min(0.06,0.004*v)); auSet(A.motOsc.frequency,(90+24*v)*k);
  auSet(A.tire.gain,ground*Math.min(0.35,0.015*v));
  auSet(A.wind.gain,0.35*w); auSet(A.windF.frequency,400+900*w);   // 風切聲 ∝ v²，與空氣阻力同步
}
function audioUpdate(s,rate,playing){
  if(!AU)return;
  const on=playing&&!muted;
  AU.master.gain.setTargetAtTime(on?AU_VOL*(1-0.6*s.fade):0,AU.ctx.currentTime,AU_FADE);
  if(!on){auLastT=-1;return;}
  const r=clamp(rate,0,1.5), k=clamp(r,0.25,1.2);                   // k：音高係數，慢動作變低沉
  auSet(AU.bus.frequency,300+17700*Math.min(1,r)**2);
  for(const n of AU.noiseSrcs)auSet(n.playbackRate,k);
  auLayers(s,k);
  // 只有連續播放時才觸發衝擊聲；拖曳時間軸、跳關鍵點不補放
  const contiguous=auLastT>=0&&s.t>=auLastT&&s.t-auLastT<0.25;
  if(contiguous&&s.shake>auLastShk+0.01)auThump(AU,s.shake/0.1,k);
  auLastT=s.t; auLastShk=s.shake||0;
}

/* ---- 靜音開關 ---- */
function auButton(){const b=$('bSnd');if(b)b.textContent=muted?'🔇 靜音':'🔊 音效';}
function toggleMute(){
  muted=!muted; audioInit(); auButton();
  try{localStorage.setItem(AU_KEY,muted?'1':'0');}catch(e){console.warn('無法記住音效設定',e);}
}

/**
 * 介面：HUD、解說卡、時間軸、播放控制、鍵盤操作，以及啟動。
 * 依賴：以上全部（必須最後載入）
 */
/* ================= 介面 ================= */
let simT=0, playing=false, speed=1, autoStop=true, last=null, curStop=-1, ended=false, resumeAt=0, gDisp=1;
const lamps=[...document.querySelectorAll('.lamp')];
function updateHUD(s){
  $('hSpd').textContent=Math.round(Math.hypot(s.vx,s.vy)*3.6);
  $('hAlt').textContent=n1(Math.max(0,s.y-hc));
  gDisp+= (s.G-gDisp)*0.35; $('hG').textContent=n1(playing?gDisp:s.G);
  $('hGas').textContent=Math.round(s.gas);
  $('hGasBar').style.width=(100*s.gas/tank0)+'%';
  const on={fan:s.fan>0.05,main:s.main>0,down:s.down>0,att:s.att>0};
  lamps.forEach(l=>l.classList.toggle('on',on[l.dataset.k]));
  const sm=$('slowmo'); if(playing&&s.slow<0.9){sm.textContent=s.slow*speed<0.2?`子彈時間 ×${n2(s.slow*speed)}`:`慢動作 ×${n1(s.slow*speed)}`;sm.style.opacity=1;}else sm.style.opacity=0;
  const cap=$('caption');
  if(!playing&&curStop>=0&&Math.abs(stops[curStop].t-simT)<1e-6){cap.textContent=`⏸ 關鍵點 ${curStop+1}：${CARDS[stops[curStop].id].title}`;cap.classList.add('stop');}
  else{cap.textContent=s.cap;cap.classList.remove('stop');}
  $('fill').style.width=(100*simT/Tend)+'%';
}
function chipsFor(s){
  const C=[['fan','吸地風扇',s.fan>0.05,`S ≈ ${n1(s.fan)}mg`],['main','主推進器（後）',s.main>0,`T ≈ ${n1(s.main)}mg`],
    ['down','向下噴嘴',s.down>0,`T ≈ ${n1(s.down)}mg`],['att','姿態推進器',s.att>0,s.couple?'力偶':'微調']];
  return C.map(([k,n,on,v])=>`<span class="chip ${k} ${on?'on':''}">${n}${on?'　'+v:'　關'}</span>`).join('');
}
function showCard(i){
  curStop=i; const id=stops[i].id, c=CARDS[id], s=at(stops[i].t);
  $('card').innerHTML=`<div class="c-head"><span class="c-num">關鍵點 ${i+1} / ${stops.length}</span><span class="c-act">${c.act}</span></div>
  <h2>${c.title}</h2><div class="event">${c.event}</div><div class="chips">${chipsFor(s)}</div>
  <div class="tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
  <div class="body">${c.body}</div><div class="formula">${c.formula}</div>
  <details class="calc"><summary>展開計算（代入數字）</summary>${c.calc}</details>
  <div class="think"><b>想一想：</b>${c.q}<details><summary>看提示</summary>${c.a}</details></div>
  <div class="c-foot"><button id="cPrev">‹ 上一個</button><button class="primary" id="cGo">繼續播放 ▶</button></div>`;
  $('cGo').onclick=play; $('cPrev').onclick=prev;
  marks();
}
function showIntro(){
  curStop=-1;
  $('card').innerHTML=`<div class="c-head"><span class="c-num">使用說明</span><span class="c-act">共 ${stops.length} 個關鍵點</span></div>
  <h2>這台車怎麼「飛」？</h2>
  <div class="body"><p>它沒有翅膀，也沒有螺旋槳，靠的是三套系統：</p>
  <p><span class="k" style="background:var(--S)"></span><b>地面效應吸地風扇</b>：把車吸在地面或牆面上，加大正向力和摩擦力。</p>
  <p><span class="k" style="background:var(--T)"></span><b>冷氣體推進器</b>：噴出高壓空氣，用反作用力直接推車。</p>
  <p><span class="k" style="background:#e0a400"></span><b>主動式姿態控制</b>：小噴嘴產生力矩，在空中翻正、微調車身。</p>
  <p>動畫分成三段：<b>彈射起步 → 彎曲坡道與空中翻轉 → 跳越車列</b>。前兩段是 3D 夜間測試場、一鏡到底的連續動作，關鍵時刻會自動放慢，車子騰空時會進入子彈時間、鏡頭繞到車子前方；每到關鍵點會停下，右側說明當下的力學原理。畫面上的箭頭是即時受力圖。</p>
  <p class="note">鍵盤：空白鍵＝播放／暫停，← → ＝上一個／下一個關鍵點。數字中有一部分是教學假設（見頁尾）。</p></div>
  <div class="c-foot"><span></span><button class="primary" id="cGo">開始播放 ▶</button></div>`;
  $('cGo').onclick=play; marks();
}
function showSummary(){
  curStop=-1; ended=true;
  $('card').innerHTML=`<div class="c-head"><span class="c-num">總結</span><span class="c-act">展示結束</span></div>
  <h2>一趟展示，用到哪些力學？</h2>
  <table class="sum"><tr><th>#</th><th>關鍵點</th><th>力學概念</th></tr>
  ${SUMMARY.map(([id,n,k],i)=>`<tr><td>${i+1}</td><td><a href="#" data-i="${i}">${n}</a></td><td>${k}</td></tr>`).join('')}</table>
  <div class="body"><p><b>一句話總結：</b>它是一台用壓縮空氣做反作用推進、用風扇負壓增加抓地力的車。能在空中翻滾和短跳，但受限於冷氣體的低效率和氣瓶容量，不可能像電影裡那樣長時間飛行。</p>
  <p class="note">展示現場是無人駕駛的原型車，不是量產車；量產預計要到 2028 年。</p></div>
  <div class="c-foot"><span></span><button class="primary" id="cGo">↺ 從頭再看一次</button></div>`;
  $('cGo').onclick=replay;
  $('card').querySelectorAll('a[data-i]').forEach(a=>a.onclick=e=>{e.preventDefault();jump(+a.dataset.i);});
  marks();
}
function marks(){
  const box=$('marks');
  if(!box.childElementCount){let pl=-99,up=false;stops.forEach((s,i)=>{const b=document.createElement('button');b.textContent=i+1;const L=100*s.t/Tend;b.style.left=L+'%';
    up=(L-pl<2.8)?!up:false;if(up)b.classList.add('up');pl=L;
    b.title=CARDS[s.id].title;b.onclick=e=>{e.stopPropagation();jump(i);};box.appendChild(b);});}
  [...box.children].forEach((b,i)=>{b.classList.toggle('done',stops[i].t<=simT+1e-6);b.classList.toggle('cur',i===curStop);});
}
function btn(){const b=$('bPlay');b.textContent=playing?'❚❚ 暫停':(ended||simT>=Tend?'↺ 重播':(simT===0?'▶ 開始':'▶ 繼續'));}
function play(){if(simT>=Tend){replay();return;}playing=true;ended=false;resumeAt=performance.now()/1000;btn();}
function pause(){playing=false;btn();}
function prewarm(t){parts=[];acc={};for(let k=Math.max(0,t-0.5);k<t;k+=DT*2)stepParticles(DT*2,at(k));}
function jump(i){simT=stops[i].t;playing=false;ended=false;prewarm(simT);showCard(i);btn();draw();}
function next(){const i=stops.findIndex(s=>s.t>simT+1e-6);if(i>=0)jump(i);}
function prev(){let j=-1;stops.forEach((s,i)=>{if(s.t<simT-1e-6)j=i;});if(j>=0)jump(j);else{simT=0;parts=[];pause();showIntro();draw();}}
function replay(){simT=0;parts=[];acc={};ended=false;curStop=-1;marks();playing=true;resumeAt=performance.now()/1000;btn();}
$('bPlay').onclick=()=>playing?pause():play();
$('bNext').onclick=next;$('bPrev').onclick=prev;$('bReplay').onclick=replay;
$('sel').onchange=e=>speed=+e.target.value;
$('cForce').onchange=e=>{showForces=e.target.checked;draw();};
$('cAuto').onchange=e=>autoStop=e.target.checked;
$('timeline').onclick=e=>{const b=e.currentTarget.getBoundingClientRect();simT=Math.max(0,Math.min(Tend,(e.clientX-b.left)/b.width*Tend));
  playing=false;prewarm(simT);curStop=-1;marks();btn();draw();};
document.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT'||e.target.tagName==='INPUT')return;
  if(e.code==='Space'){e.preventDefault();playing?pause():play();}else if(e.key==='ArrowRight'){next();}else if(e.key==='ArrowLeft'){prev();}});

function tick(ts){
  if(last==null)last=ts;const rdt=Math.min(0.05,(ts-last)/1000);last=ts;
  if(playing){
    const s=at(simT), nowS=ts/1000;
    let rate=speed*s.slow;
    rate*=0.15+0.85*smooth((nowS-resumeAt)/0.6);            // 繼續時漸快
    let hit=null;
    if(autoStop){for(const q of stops){if(q.t>simT+1e-9){hit=q;break;}}}
    if(hit){const dReal=(hit.t-simT)/(speed*s.slow);rate*=0.1+0.9*smooth(dReal/0.45);} // 停格前漸慢
    let nt=simT+rdt*rate;
    let stopNow=false;
    if(hit&&nt>=hit.t){nt=hit.t;stopNow=true;}
    if(nt>=Tend)nt=Tend;
    // 以小步更新粒子，避免跳格
    const d=nt-simT; const steps=Math.max(1,Math.ceil(d/(DT*2)));
    for(let k=1;k<=steps;k++)stepParticles(d/steps,at(simT+d*k/steps));
    simT=nt;
    if(stopNow){playing=false;showCard(hit.i);}
    else if(simT>=Tend){playing=false;showSummary();}
    else marks();
    btn();
  }
  draw(); requestAnimationFrame(tick);
}
try{R3=init3D();}catch(e){console.warn('3D 初始化失敗，改用 2D',e);R3=null;}
new ResizeObserver(resize).observe($('wrap'));
showIntro(); resize(); btn(); requestAnimationFrame(tick);
window.__dbg={stops,F,Tend,jump,K:{GB,gasEnd,gasAfter2,apexB,tb,tP,rollEnd,w0}};

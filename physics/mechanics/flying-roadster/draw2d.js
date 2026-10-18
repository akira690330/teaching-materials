/**
 * 2D 畫布繪圖：天空、地面、坡道、車列、車身、粒子、受力箭頭。第三段與 3D 失敗時使用。
 * 依賴：sim.js、cards.js
 */
/* ================= 繪圖 ================= */
const $=id=>document.getElementById(id);
const cv=$('cv'), ctx=cv.getContext('2d');
let W=800,H=450,DPR=1, sc=1, cam={cx:0,cy:3.4,w:20};
function resize(){const b=cv.getBoundingClientRect();if(!b.width)return;DPR=Math.min(2,window.devicePixelRatio||1);W=b.width;H=b.height;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);
  if(R3){const PR=Math.min(DPR,1.5);R3.renderer.setPixelRatio(PR);R3.renderer.setSize(W,H,false);R3.camera.aspect=W/H;R3.camera.updateProjectionMatrix();
    const u=H*PR/(2*Math.tan(14*Math.PI/180));R3.gasP.material.uniforms.uS.value=u;R3.dustP.material.uniforms.uS.value=u;R3.car.suck.material.uniforms.uS.value=u;}
  draw();}
const sx=x=>W/2+(x-cam.cx)*sc, sy=y=>H/2-(y-cam.cy)*sc;
const COL={mg:'#3a6db5',N:'#23935a',S:'#8b4fd0',f:'#de7f12',T:'#0e97ad'};
const LAB={mg:'mg',N:'N',S:'S 吸力',f:'f 摩擦',T:'T 推力'};
const CLOUDS=Array.from({length:14},(_,i)=>({x:i*23+((i*37)%11),y:16+((i*53)%26),s:3+((i*29)%5)}));

function drawSky(s){
  const gy=sy(0);
  const gr=ctx.createLinearGradient(0,0,0,Math.max(H*0.35,Math.min(H,gy)));
  if(s.scene==='A'){gr.addColorStop(0,'#6f97bf');gr.addColorStop(0.65,'#c9d3d6');gr.addColorStop(1,'#f1d4ad');}
  else{gr.addColorStop(0,'#86a9cc');gr.addColorStop(1,'#efe1c9');}
  ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
  // 太陽光暈
  const sg=ctx.createRadialGradient(W*0.82,Math.min(gy,H)-H*0.18,0,W*0.82,Math.min(gy,H)-H*0.18,H*0.5);
  sg.addColorStop(0,'rgba(255,236,200,.55)');sg.addColorStop(1,'rgba(255,236,200,0)');ctx.fillStyle=sg;ctx.fillRect(0,0,W,H);
  // 雲（視差）
  const p=0.45;
  for(const c of CLOUDS){
    const k=W/70, span=320, wx=((c.x-cam.cx*p)%span+span)%span-span/2;
    const X=W/2+wx*k, Y=H*0.3+(cam.cy*p-(c.y-20))*k;
    if(X<-200||X>W+200||Y<-100||Y>H+60)continue;
    ctx.fillStyle='rgba(255,255,255,.55)';
    for(let q=0;q<4;q++){ctx.beginPath();ctx.ellipse(X+(q-1.5)*c.s*k*0.45,Y+(q%2)*c.s*k*0.08,c.s*k*0.5,c.s*k*0.22,0,0,Math.PI*2);ctx.fill();}
  }
  if(gy<H+40){
    [[0.004,'#b9a68e',0.13,0.6],[0.012,'#9e8a72',0.08,0.35]].forEach(([par,col,amp,base],li)=>{
      ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,gy);
      for(let px=0;px<=W+8;px+=8){const xp=px/W*5+cam.cx*par+li*3;
        const h=(base*amp+amp*0.5*Math.sin(xp*1.7+0.5)+amp*0.3*Math.sin(xp*4.1+2)+amp*0.15*Math.sin(xp*9.3))*H;ctx.lineTo(px,gy-Math.max(0,h));}
      ctx.lineTo(W,gy);ctx.closePath();ctx.fill();});
  }
}
function drawGround(s){
  const gy=sy(0); if(gy>H+5)return;
  ctx.fillStyle='#c8b391';ctx.fillRect(0,gy-Math.max(2,0.15*sc),W,Math.max(2,0.15*sc));
  const gg=ctx.createLinearGradient(0,gy,0,H);gg.addColorStop(0,'#4a4e55');gg.addColorStop(1,'#2c2f34');
  ctx.fillStyle=gg;ctx.fillRect(0,gy,W,H-gy);
  ctx.fillStyle='rgba(255,255,255,.6)';
  const x0=Math.floor((cam.cx-cam.w)/6)*6;
  for(let x=x0;x<cam.cx+cam.w;x+=6){ctx.fillRect(sx(x),gy+0.35*sc,2.2*sc,Math.max(1.5,0.1*sc));}
  ctx.fillStyle='rgba(255,255,255,.08)';
  for(let x=Math.floor((cam.cx-cam.w)/1.3)*1.3;x<cam.cx+cam.w;x+=1.3){ctx.fillRect(sx(x),gy+1.1*sc,Math.max(1,0.05*sc),Math.max(1,0.6*sc));}
}
function line(a,b){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
function drawRamp(){
  const C=[xL,r], R1=r, R2=r+0.75;
  ctx.save();ctx.strokeStyle='rgba(64,76,92,.55)';ctx.lineWidth=Math.max(1,0.14*sc);
  let prev=null;
  for(let d=12;d<=150;d+=9.2){const th=d*Math.PI/180;const px=C[0]+R2*Math.sin(th), py=C[1]-R2*Math.cos(th);
    const a=[sx(px),sy(py)], b=[sx(px),sy(0)];line(a,b);if(prev){line(prev,b);}prev=a;}
  ctx.restore();
  const band=ctx.createLinearGradient(sx(C[0]),sy(C[1]+r),sx(C[0]+r),sy(0));band.addColorStop(0,'#8d98a4');band.addColorStop(1,'#646e7a');
  ctx.beginPath();
  for(let d=0;d<=150;d+=1.5){const th=d*Math.PI/180;const X=sx(C[0]+R1*Math.sin(th)),Y=sy(C[1]-R1*Math.cos(th));d?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}
  for(let d=150;d>=0;d-=1.5){const th=d*Math.PI/180;ctx.lineTo(sx(C[0]+R2*Math.sin(th)),sy(C[1]-R2*Math.cos(th)));}
  ctx.closePath();ctx.fillStyle=band;ctx.fill();
  ctx.beginPath();
  for(let d=0;d<=150;d+=1.5){const th=d*Math.PI/180;const X=sx(C[0]+R1*Math.sin(th)),Y=sy(C[1]-R1*Math.cos(th));d?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}
  ctx.strokeStyle='#e8ebef';ctx.lineWidth=Math.max(1.5,0.14*sc);ctx.stroke();
  // 面板接縫
  ctx.strokeStyle='rgba(40,48,58,.35)';ctx.lineWidth=1;
  for(let d=6;d<150;d+=6){const th=d*Math.PI/180;line([sx(C[0]+R1*Math.sin(th)),sy(C[1]-R1*Math.cos(th))],[sx(C[0]+R2*Math.sin(th)),sy(C[1]-R2*Math.cos(th))]);}
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.font=`${Math.max(10,0.6*sc)}px sans-serif`;ctx.textAlign='center';
  [[90,'90°'],[150,'150°']].forEach(([d,t])=>{const th=d*Math.PI/180;const R=R2+1.1;ctx.fillText(t,sx(C[0]+R*Math.sin(th)),sy(C[1]-R*Math.cos(th))+4);});
  [-5,7].forEach(x=>{ctx.fillStyle='#ef7b23';ctx.beginPath();ctx.moveTo(sx(x-0.2),sy(0));ctx.lineTo(sx(x+0.2),sy(0));ctx.lineTo(sx(x),sy(0.7));ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(sx(x-0.12),sy(0.38),0.24*sc,0.08*sc);});
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function drawVehicles(){
  VEH.forEach((v,vi)=>{
    const L=sx(v.x-v.w/2), R=sx(v.x+v.w/2), B=sy(0.05), Tp=sy(v.h), w=R-L, h=B-Tp;
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(sx(v.x),sy(0),w*0.6,Math.max(2,0.12*sc),0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1d2126';ctx.fillRect(L+w*0.04,B-h*0.18,w*0.18,h*0.18);ctx.fillRect(R-w*0.22,B-h*0.18,w*0.18,h*0.18);
    ctx.fillStyle=v.c;
    if(v.t==='semi'){rr(L,Tp,w,h*0.9,w*0.12);ctx.fill();ctx.fillStyle='rgba(30,40,55,.55)';rr(L+w*0.12,Tp+h*0.12,w*0.76,h*0.22,4);ctx.fill();}
    else if(v.t==='truck'){ctx.beginPath();ctx.moveTo(L,B-h*0.15);ctx.lineTo(L+w*0.04,B-h*0.62);ctx.lineTo(sx(v.x),Tp);ctx.lineTo(R-w*0.04,B-h*0.62);ctx.lineTo(R,B-h*0.15);ctx.closePath();ctx.fill();}
    else{rr(L,B-h*0.68,w,h*0.53,h*0.12);ctx.fill();ctx.beginPath();ctx.moveTo(L+w*0.12,B-h*0.66);ctx.lineTo(L+w*0.26,Tp);ctx.lineTo(R-w*0.26,Tp);ctx.lineTo(R-w*0.12,B-h*0.66);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(30,40,55,.5)';ctx.beginPath();ctx.moveTo(L+w*0.2,B-h*0.7);ctx.lineTo(L+w*0.3,Tp+h*0.08);ctx.lineTo(R-w*0.3,Tp+h*0.08);ctx.lineTo(R-w*0.2,B-h*0.7);ctx.closePath();ctx.fill();}
    ctx.fillStyle='#d23a2b';ctx.fillRect(L+w*0.03,B-h*0.42,w*0.12,Math.max(2,h*0.05));ctx.fillRect(R-w*0.15,B-h*0.42,w*0.12,Math.max(2,h*0.05));
    ctx.fillStyle='rgba(255,255,255,.85)';ctx.font=`${Math.max(9,0.5*sc)}px sans-serif`;ctx.textAlign='center';ctx.fillText(v.n,sx(v.x),sy(0)+Math.max(12,0.75*sc)*(vi%2?2.1:1));
  });
}

/* ---- 原創超跑造型（側視，可擬立體滾轉） ---- */
const PU=[[-2.16,-0.27],[-2.22,-0.06],[-2.2,0.16],[-2.08,0.25],[-1.75,0.27],[-1.25,0.31],[-0.78,0.47],[-0.32,0.585],[0.18,0.6],[0.6,0.53],[1.02,0.35],[1.5,0.21],[1.92,0.09],[2.17,-0.03],[2.22,-0.17]];
const PL=[[2.12,-0.3],[1.75,-0.35],[-1.75,-0.36],[-2.1,-0.32]];
const PROF=PU.concat(PL);
const GLS=[[-0.72,0.42],[-0.3,0.545],[0.16,0.56],[0.55,0.5],[0.92,0.33],[0.25,0.31],[-0.45,0.33]];
const INTAKE=[[-1.22,0.1],[-0.72,0.15],[-0.6,-0.02],[-0.86,-0.16],[-1.28,-0.13]];
const SKIRT=[[-1.0,-0.2],[0.95,-0.2],[0.95,-0.33],[-1.0,-0.33]];
function spath(pts,proj,closed=true){
  const P=pts.map(proj); ctx.beginPath();
  const n=P.length; const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  let m0=closed?mid(P[n-1],P[0]):P[0]; ctx.moveTo(m0[0],m0[1]);
  for(let i=0;i<(closed?n:n-1);i++){const a=P[i],b=P[(i+1)%n],mm=mid(a,b);ctx.quadraticCurveTo(a[0],a[1],mm[0],mm[1]);}
  if(!closed)ctx.lineTo(P[n-1][0],P[n-1][1]);
  if(closed)ctx.closePath();
}
function drawCar(s,now){
  const X=sx(s.x),Y=sy(s.y);
  const c=Math.cos(s.rho), sn=Math.sin(s.rho), hw=0.96;
  const ti=s.tilt||0, ct=Math.cos(ti), st_=Math.sin(ti), so=s.sink||0;
  const front=c>=0?hw:-hw, back=-front;
  // 車身點：先套懸吊（俯仰＋下沉），再做滾轉投影
  const tp=x=>1-0.28*Math.pow(Math.min(1,Math.abs(x)/2.22),5);
  const B=(z)=>p=>{const x=p[0]*ct-p[1]*st_, y=p[0]*st_+p[1]*ct+so; return [x, y*c - z*tp(p[0])*sn];};
  const Wp=(z)=>p=>[p[0], p[1]*c - z*sn];
  ctx.save();ctx.translate(X,Y);ctx.rotate(-s.phi);ctx.scale(sc,-sc);
  // 吸地風扇
  if(s.fanV>0.03){
    const yy=(-0.42+so)*c;
    ctx.fillStyle=`rgba(170,120,255,${0.5*s.fanV})`;ctx.beginPath();ctx.ellipse(0,yy,1.7,0.09+0.6*Math.abs(sn),0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=`rgba(195,160,255,${0.85*s.fanV})`;ctx.lineWidth=0.045;
    for(let k=0;k<6;k++){const ph=((now*1.6+k*0.17)%1);const xx=-1.3+k*0.52;const y0=(-0.42+so-0.55*(1-ph))*c, y1=(-0.42+so-0.55*(1-ph)+0.16)*c;
      ctx.beginPath();ctx.moveTo(xx*(1+0.25*(1-ph)),y0);ctx.lineTo(xx,y1);ctx.stroke();}
  }
  // 1) 背面
  spath(PROF,B(back));ctx.fillStyle='#5a1414';ctx.fill();
  // 2) 車頂帶與底盤帶：先畫背向觀者的那一面，再畫朝向觀者的那一面
  if(Math.abs(sn)>0.02){
    const poly=pts=>{ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();};
    const drawTop=()=>{
      poly(PU.map(B(hw*0.92)).concat(PU.map(B(-hw*0.92)).reverse()));ctx.fillStyle='#b62c26';ctx.fill();
      poly(PU.slice(6,11).map(B(hw*0.7)).concat(PU.slice(6,11).map(B(-hw*0.7)).reverse()));ctx.fillStyle='#18202a';ctx.fill();
      ctx.beginPath();PU.slice(1,15).map(B(0)).forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle='rgba(255,210,200,.35)';ctx.lineWidth=0.03;ctx.stroke();
    };
    const drawBot=()=>{
      poly(PL.map(B(hw)).concat(PL.map(B(-hw)).reverse()));ctx.fillStyle='#34373c';ctx.fill();
      const fc=B(0)([0,-0.36]);ctx.fillStyle='rgba(150,110,220,.45)';ctx.beginPath();ctx.ellipse(fc[0],fc[1],1.2,0.55*Math.abs(sn),0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#0d0e10';
      for(const xx of [-1.36,1.38])for(const zz of [hw-0.16,-(hw-0.16)]){const a=B(zz+0.14)([xx,-0.4]),b2=B(zz-0.14)([xx,-0.4]);
        ctx.fillRect(xx-RW,Math.min(a[1],b2[1]),RW*2,Math.max(0.02,Math.abs(a[1]-b2[1])));}
    };
    if(sn>0){drawBot();drawTop();}else{drawTop();drawBot();}
  }
  // 3) 輪拱（車身上的暗色）
  const wheels=[[-1.36],[1.38]];
  // 4) 正面車身
  const bp=B(front);
  const gTop=bp([0,0.6])[1], gBot=bp([0,-0.36])[1];
  const grd=ctx.createLinearGradient(0,gTop,0,gBot);
  grd.addColorStop(0,'#f06a5a');grd.addColorStop(0.28,'#d33a30');grd.addColorStop(0.62,'#a5221d');grd.addColorStop(1,'#5e1110');
  spath(PROF,bp);ctx.fillStyle=grd;ctx.fill();ctx.lineWidth=0.025;ctx.strokeStyle='rgba(60,8,6,.7)';ctx.stroke();
  // 腰線高光
  ctx.beginPath();[[-2.05,0.17],[-1.2,0.2],[0,0.18],[1.2,0.12],[2.0,0.02]].map(bp).forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
  ctx.strokeStyle='rgba(255,220,210,.55)';ctx.lineWidth=0.035;ctx.stroke();
  // 側裙、進氣口
  spath(SKIRT,bp);ctx.fillStyle='#24262a';ctx.fill();
  spath(INTAKE,bp);ctx.fillStyle='#17191c';ctx.fill();
  ctx.beginPath();[[-1.15,0.06],[-0.75,0.1]].map(bp).forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=0.03;ctx.stroke();
  // 車窗
  spath(GLS,bp);const gg=ctx.createLinearGradient(bp([-0.7,0.5])[0],0,bp([0.9,0.3])[0],0);gg.addColorStop(0,'#141a22');gg.addColorStop(0.5,'#2c3a4a');gg.addColorStop(1,'#10151c');
  ctx.fillStyle=gg;ctx.fill();
  ctx.beginPath();[[-0.25,0.5],[0.35,0.5]].map(bp).forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=0.03;ctx.stroke();
  // 車門縫
  ctx.beginPath();[[0.95,0.3],[0.85,0.0],[0.9,-0.2]].map(bp).forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
  ctx.strokeStyle='rgba(50,6,6,.5)';ctx.lineWidth=0.02;ctx.stroke();
  // 頭燈、尾燈、後擾流
  spath([[1.88,0.05],[2.16,-0.02],[2.14,-0.06],[1.86,0.0]],bp);ctx.fillStyle='#fff6d8';ctx.fill();
  spath([[-2.21,0.12],[-2.16,0.2],[-2.12,0.19],[-2.17,0.1]],bp);ctx.fillStyle='#ff3b30';ctx.fill();
  spath([[-2.2,-0.28],[-1.8,-0.36],[-1.8,-0.3],[-2.18,-0.2]],bp);ctx.fillStyle='#1c1e21';ctx.fill();
  // 輪拱與輪子（輪子不跟車身下沉，貼地）
  const gap=s.gap, wy=-gap+RW;
  wheels.forEach(([wx])=>{
    const ap=bp([wx,wy-so+0.02]);ctx.fillStyle='#120d0d';ctx.beginPath();ctx.ellipse(ap[0],ap[1],RW+0.07,(RW+0.07)*Math.max(0.05,Math.abs(c)),0,0,Math.PI*2);ctx.fill();
  });
  wheels.forEach(([wx])=>{
    const ctr=Wp(front)([wx,wy]), ac=Math.max(0.04,Math.abs(c));
    // 胎面（滾轉時看得到輪胎寬度）
    if(Math.abs(sn)>0.05){const ctr2=Wp(front-Math.sign(front)*0.28)([wx,wy]);
      ctx.fillStyle='#0e0f11';ctx.beginPath();ctx.ellipse(ctr2[0],ctr2[1],RW,RW*ac,0,0,Math.PI*2);ctx.fill();
      ctx.fillRect(ctr[0]-RW,Math.min(ctr[1],ctr2[1]),RW*2,Math.abs(ctr2[1]-ctr[1]));}
    ctx.fillStyle='#111214';ctx.beginPath();ctx.ellipse(ctr[0],ctr[1],RW,RW*ac,0,0,Math.PI*2);ctx.fill();
    const rimR=RW*0.68;
    const rg=ctx.createRadialGradient(ctr[0],ctr[1],0,ctr[0],ctr[1],rimR);rg.addColorStop(0,'#d7dbe0');rg.addColorStop(0.75,'#8e959d');rg.addColorStop(1,'#4c5157');
    ctx.fillStyle=rg;ctx.beginPath();ctx.ellipse(ctr[0],ctr[1],rimR,rimR*ac,0,0,Math.PI*2);ctx.fill();
    // 卡鉗（不轉）
    ctx.fillStyle='#e0a400';ctx.beginPath();ctx.ellipse(ctr[0]+rimR*0.45*(wx>0?1:-1),ctr[1]+rimR*0.3*ac,0.07,0.12*ac,0,0,Math.PI*2);ctx.fill();
    // 輪輻（依車速轉動）
    ctx.strokeStyle='#2a2d31';ctx.lineWidth=0.055;
    for(let k=0;k<5;k++){const a=-(s.wa||0)+k*2*Math.PI/5;
      for(const d of [-0.12,0.12]){const aa=a+d;ctx.beginPath();ctx.moveTo(ctr[0]+Math.cos(aa)*0.06,ctr[1]+Math.sin(aa)*0.06*ac);ctx.lineTo(ctr[0]+Math.cos(aa)*rimR*0.95,ctr[1]+Math.sin(aa)*rimR*0.95*ac);ctx.stroke();}}
    ctx.fillStyle='#3a3e44';ctx.beginPath();ctx.ellipse(ctr[0],ctr[1],0.07,0.07*ac,0,0,Math.PI*2);ctx.fill();
  });
  // 噴嘴
  ctx.fillStyle='#22272e';
  const np=bp([-2.22,0.0]);ctx.fillRect(np[0]-0.06,np[1]-0.06,0.08,0.12);
  ctx.restore();
}
// 粒子：噴氣與塵土
let parts=[], acc={};
function pw(s,lx,ly){const {fw,up}=vecs(s.phi,s.rho);return[s.x+fw[0]*lx+up[0]*ly,s.y+fw[1]*lx+up[1]*ly];}
function emit(s,dt){
  const {fw,up}=vecs(s.phi,s.rho);
  const add=(key,px,py,dx,dy,rate,o={})=>{acc[key]=(acc[key]||0)+rate*dt;while(acc[key]>=1){acc[key]-=1;
    const spd=(o.sp||18)*(0.75+Math.random()*0.5),a=(Math.random()-0.5)*(o.spread||0.32);
    const ca=Math.cos(a),sa=Math.sin(a);const ddx=dx*ca-dy*sa,ddy=dx*sa+dy*ca;
    parts.push({x:px+(Math.random()-0.5)*0.15,y:py+(Math.random()-0.5)*0.15,vx:ddx*spd+s.vx*(o.inh??0.5),vy:ddy*spd+s.vy*(o.inh??0.5),life:0,max:(o.life||0.4)*(0.7+Math.random()*0.6),sz:o.sz||1,dust:!!o.dust});}};
  if(s.mainV>0.03){const p=pw(s,-2.3,0);add('m',p[0],p[1],-fw[0],-fw[1],340*Math.min(1,s.mainV*1.2));}
  if(s.downV>0.03){[-1.1,1.1].forEach((o,i)=>{const p=pw(s,o,-0.42);add('d'+i,p[0],p[1],-up[0],-up[1],170*Math.min(1.6,s.downV/2));});}
  if(s.attV>0.03){const k=s.attV;const p1=pw(s,0.3,0.5),p2=pw(s,-0.3,-0.5);add('a1',p1[0],p1[1],up[0],up[1],80*k,{sz:0.45,sp:10,life:0.3});add('a2',p2[0],p2[1],-up[0],-up[1],80*k,{sz:0.45,sp:10,life:0.3});}
  if(s.dust>0){[-1.36,1.38].forEach((o,i)=>{const p=pw(s,o,-0.5);add('u'+i,p[0],0.1,-fw[0]*0.6,0.5,90*s.dust,{dust:true,sp:4,spread:1.4,life:1.1,sz:1.3,inh:0.15});});}
  if(s.downV>0.5&&s.y<6){const k=(6-s.y)/6;add('gd',s.x,0.1,0,1,60*k*s.downV,{dust:true,sp:6,spread:3,life:0.9,sz:1.5,inh:0.1});}
}
let lastScene='A';
function stepParticles(dt,s){
  if(s.scene!==lastScene){parts=[];acc={};lastScene=s.scene;}
  if(dt<=0)return; R3?emit3D(s,dt):emit(s,dt);
  for(const p of parts){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const d=Math.max(0,1-(p.dust?2:4)*dt);p.vx*=d;p.vy*=d;
    if(p.dust)p.vy+=0.6*dt;
    if(p.vz!==undefined){p.z+=p.vz*dt;p.vz*=d;}
    if(p.y<0.05&&(p.z!==undefined||!s.onLoop)){p.y=0.05;const q=Math.abs(p.vy)*0.7;p.vx+=(p.vx>=0?1:-1)*q;if(p.z!==undefined)p.vz+=(Math.random()-0.5)*q*2;p.vy=0;}}
  parts=parts.filter(p=>p.life<p.max);
}
function drawParticles(){
  for(const p of parts){const u=p.life/p.max;
    if(p.dust){ctx.fillStyle=`rgba(196,176,146,${0.45*(1-u)})`;}else{ctx.fillStyle=`rgba(228,245,255,${0.75*(1-u)})`;}
    ctx.beginPath();ctx.arc(sx(p.x),sy(p.y),Math.max(1.5,(0.15+0.7*u)*sc*p.sz),0,Math.PI*2);ctx.fill();}
}
function jetCone(s,lx,ly,dx,dy,k,len){
  if(k<0.03)return;const p=pw(s,lx,ly);const X=sx(p[0]),Y=sy(p[1]);const L=len*sc*k*(0.9+0.2*Math.random()),wd=0.16*sc;
  const ux=dx,uy=-dy;const g2=ctx.createLinearGradient(X,Y,X+ux*L,Y+uy*L);g2.addColorStop(0,'rgba(255,255,255,.95)');g2.addColorStop(0.35,'rgba(170,235,255,.6)');g2.addColorStop(1,'rgba(170,235,255,0)');
  ctx.fillStyle=g2;ctx.beginPath();ctx.moveTo(X-uy*wd*0.5,Y+ux*wd*0.5);ctx.lineTo(X+ux*L-uy*wd*1.6,Y+uy*L+ux*wd*1.6);ctx.lineTo(X+ux*L+uy*wd*1.6,Y+uy*L-ux*wd*1.6);ctx.lineTo(X+uy*wd*0.5,Y-ux*wd*0.5);ctx.closePath();ctx.fill();
}
function drawJets(s){
  const {fw,up}=vecs(s.phi,s.rho);
  ctx.save();ctx.globalCompositeOperation='lighter';
  jetCone(s,-2.3,0,-fw[0],-fw[1],Math.min(1,s.mainV*1.1),2.2);
  if(s.downV>0.03){[-1.1,1.1].forEach(o=>jetCone(s,o,-0.42,-up[0],-up[1],Math.min(1,s.downV/2.5),1.8));}
  if(s.attV>0.03){jetCone(s,0.3,0.5,up[0],up[1],s.attV,0.8);jetCone(s,-0.3,-0.5,-up[0],-up[1],s.attV,0.8);}
  ctx.restore();
}
function drawShadow(s){
  if(s.onLoop||sy(0)>H+5)return;const h=Math.max(0,s.y-hc);const a=0.42*Math.exp(-h/6);if(a<0.02)return;
  const k=1+h*0.05;ctx.fillStyle=`rgba(0,0,0,${a})`;ctx.beginPath();ctx.ellipse(sx(s.x),sy(0)+1,2.3*sc*k,Math.max(2,0.22*sc*k),0,0,Math.PI*2);ctx.fill();
}
function drawSpeedLines(s,now){
  const v=Math.hypot(s.vx,s.vy);if(v<11)return;const a=Math.min(0.45,(v-11)/30);
  const ux=-s.vx/v,uy=s.vy/v;const X=sx(s.x),Y=sy(s.y);
  ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=Math.max(1,0.04*sc);
  for(let k=0;k<6;k++){const off=((k*0.37+s.t*1.7)%1);const o=(k-2.5)*0.28*sc;const st0=(2.6+off*1.5)*sc, L=(0.8+v*0.06)*sc;
    const x0=X+ux*st0-uy*o, y0=Y+uy*st0+ux*o;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x0+ux*L,y0+uy*L);ctx.stroke();}
}
function drawArrow(x0,y0,x1,y1,col,lw){
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy);if(L<2)return;const ux=dx/L,uy=dy/L,hl=Math.min(12,L*0.45)*lw/3;
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=lw;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1-ux*hl*0.8,y1-uy*hl*0.8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-ux*hl-uy*hl*0.55,y1-uy*hl+ux*hl*0.55);ctx.lineTo(x1-ux*hl+uy*hl*0.55,y1-uy*hl-ux*hl*0.55);ctx.closePath();ctx.fill();
}
function drawForces(s){
  const U=Math.max(0.65,Math.min(1.3,W/900)), lw=3*U;
  ctx.font=`600 ${Math.round(12*U)}px -apple-system,"PingFang TC",sans-serif`;
  for(const f of s.forces){
    const len=Math.max(14*U,Math.min(175*U,f.mag*28*U));
    const dx=f.dir[0],dy=-f.dir[1];let x0=sx(f.at[0]),y0=sy(f.at[1]),x1,y1;
    if(f.mode==='from'){x1=x0+dx*len;y1=y0+dy*len;}else{x1=x0;y1=y0;x0=x1-dx*len;y0=y1-dy*len;}
    ctx.save();ctx.shadowColor='rgba(255,255,255,.9)';ctx.shadowBlur=4;drawArrow(x0,y0,x1,y1,COL[f.k],lw);ctx.restore();
    const lx=(f.mode==='from'?x1:x0)+dx*10*U, ly=(f.mode==='from'?y1:y0)+dy*10*U+4;
    const txt=f.k==='mg'?'mg':`${LAB[f.k]} ${n1(f.mag)}mg`;
    ctx.textAlign=dx>0.3?'left':dx<-0.3?'right':'center';
    ctx.lineWidth=3.5;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.strokeText(txt,lx,ly);ctx.fillStyle=COL[f.k];ctx.fillText(txt,lx,ly);
  }
  if(s.couple){const X=sx(s.x),Y=sy(s.y),R=Math.max(30,2.8*sc);ctx.strokeStyle='#e0a400';ctx.lineWidth=lw;
    const a0=-0.6,a1=-2.5;ctx.beginPath();ctx.arc(X,Y,R,a0,a1,true);ctx.stroke();
    const ex=X+R*Math.cos(a1),ey=Y+R*Math.sin(a1);ctx.fillStyle='#e0a400';ctx.beginPath();ctx.arc(ex,ey,lw*1.6,0,Math.PI*2);ctx.fill();
    ctx.textAlign='center';ctx.lineWidth=3.5;ctx.strokeStyle='rgba(255,255,255,.92)';const t=s.couple>0?'力偶：開始滾轉':'反向力偶：停止滾轉';
    ctx.strokeText(t,X,Y-R-8);ctx.fillStyle='#9a7400';ctx.fillText(t,X,Y-R-8);}
}
let showForces=true;
function drawFade(s){if(s.fade>0){ctx.fillStyle=`rgba(4,6,10,${s.fade})`;ctx.fillRect(0,0,W,H);
    if(s.title){ctx.fillStyle=`rgba(255,255,255,${s.fade})`;ctx.textAlign='center';ctx.font=`700 ${Math.round(W/28)}px -apple-system,"PingFang TC",sans-serif`;ctx.fillText(s.title,W/2,H/2);}}}
function draw(){
  const s=at(simT), now=performance.now()/1000;
  if(R3){cv3.style.visibility='visible';render3D(s);ctx.clearRect(0,0,W,H);drawVehLabels3D(s);if(showForces)drawForces3D(s);drawFade(s);updateHUD(s);return;}
  if(R3)cv3.style.visibility='hidden';
  const sh=s.shake||0;
  cam={cx:s.cx+sh*Math.sin(s.t*97),cy:s.cy+sh*Math.cos(s.t*83),w:s.cw}; sc=W/cam.w;
  drawSky(s);
  if(s.scene==='A')drawRamp();
  drawGround(s);
  if(s.scene==='B')drawVehicles();
  drawShadow(s);
  drawSpeedLines(s,now);
  drawParticles();
  drawCar(s,now);
  drawJets(s);
  if(showForces)drawForces(s);
  if(s.fade>0){ctx.fillStyle=`rgba(18,22,28,${s.fade})`;ctx.fillRect(0,0,W,H);
    if(s.title){ctx.fillStyle=`rgba(255,255,255,${s.fade})`;ctx.textAlign='center';ctx.font=`700 ${Math.round(W/28)}px -apple-system,"PingFang TC",sans-serif`;ctx.fillText(s.title,W/2,H/2);}}
  updateHUD(s);
}

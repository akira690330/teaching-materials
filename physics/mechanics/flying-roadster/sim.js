/**
 * 物理常數、教學假設，以及逐格模擬出的整段時間軸（F 每格狀態、stops 關鍵點）。
 * 依賴：無（純計算，不碰 DOM）
 */
/* ================= 物理常數與假設 ================= */
const m=2000, g=9.8, mg=m*g, mu=1.2, S1=1.0, ve=700, hc=0.55, tank0=180, RW=0.35;
const v60=26.82, tL=0.81, aL=v60/tL, aTire=mu*(1+S1)*g, aT=aL-aTire, TL=m*aT, mdotL=TL/ve;
const vIn=18, aBr=8, tBr=(v60-vIn)/aBr, tCr=0.8;
const r=11.5, thE=150*Math.PI/180, vE=9;
const aD=(vE*vE-vIn*vIn+2*g*r*(1-Math.cos(thE)))/(2*r*thE);
const vTh=th=>Math.sqrt(Math.max(0.01,vIn*vIn+2*aD*r*th-2*g*r*(1-Math.cos(th))));
const vC=vE*(r-hc)/r, Vx=vC*Math.cos(thE), Vy=vC*Math.sin(thE);
const dL=0.5*aL*tL*tL, dBr=(v60*v60-vIn*vIn)/(2*aBr);
const xL=dL+dBr+vIn*tCr;
const Ex=xL+(r-hc)*Math.sin(thE), Ey=r-(r-hc)*Math.cos(thE);
const yb=6.5+hc, vLand=1.5, Tsus=0.2, dip=vLand*2*Tsus/Math.PI;
const tb=(Vy+Math.sqrt(Vy*Vy+2*g*(Ey-yb)))/g, vyb=Vy-g*tb;
const aB=(vyb*vyb-vLand*vLand)/(2*6.5), tBurn=(-vyb-vLand)/aB, TB=m*(g+aB), GB=(g+aB)/g, mdotB=TB/ve;
const apexCM=Ey+Vy*Vy/(2*g), apexB=apexCM-hc, fallH=apexCM-yb;
const Iroll=m*(2.0**2+1.2**2)/12, Ipitch=m*(4.5**2+1.2**2)/12;
// 離開坡道時車身帶著的角速度（跟著圓弧轉）
const w0=vE/r, dPitch=Math.PI-thE, alphaP=w0*w0/(2*dPitch), tP=w0/alphaP, tauP=Ipitch*alphaP, Fp=tauP/3.6, mdotP=2*Fp/ve;
const rollStart=0.35, rollAcc=0.3, rollCoast=0.7, rollW=Math.PI/(rollAcc+rollCoast), rollAlpha=rollW/rollAcc;
const rollEnd=rollStart+2*rollAcc+rollCoast, rollTau=Iroll*rollAlpha, coupleD=1.8, rollF=rollTau/coupleD, mdotAtt=2*rollF/ve;
const gasRoll=mdotAtt*2*rollAcc, gasPitch=mdotP*tP, gasLaunch=mdotL*tL, gasLand=mdotB*tBurn;
// 第三段
const vx3=12, t1=0.7, T1=2*mg, mdot1=T1/ve, vy1=g*t1, h1=0.5*g*t1*t1, apex3=h1+vy1*vy1/(2*g);
const tc=(vy1+Math.sqrt(vy1*vy1+2*g*(h1-2)))/g, vy2=vy1-g*tc, a2=(vy2*vy2-vLand*vLand)/(2*2), tB2=(-vy2-vLand)/a2, T2=m*(g+a2), mdot2=T2/ve;
const gasJ1=mdot1*t1, gasJ2=mdot2*tB2;
const hoverMdot=mg/ve, hoverTime=tank0/hoverMdot;
const v90=vTh(Math.PI/2), N90=v90*v90/(g*r)+S1, at90=aD-g;
const an150=vE*vE/r, N150=an150/g+S1+Math.cos(thE), N150no=an150/g+Math.cos(thE), vcrit=Math.sqrt(-g*r*Math.cos(thE));
const Gbot=1+vIn*vIn/(g*r), G60=1+v60*v60/(g*r);
const Fsus=m*vLand/Tsus, Gsus=1+vLand/(Tsus*g);
const VEH=[{n:'Cybercab',w:2.0,h:1.5,c:'#d9d9d4',t:'car'},{n:'Cybertruck',w:2.2,h:1.9,c:'#a9adb3',t:'truck'},
           {n:'Semi',w:2.6,h:4.0,c:'#eef0f2',t:'semi'},{n:'Model Y',w:2.1,h:1.62,c:'#2f3338',t:'suv'},{n:'Model 3',w:2.0,h:1.44,c:'#3c5e8f',t:'car'}];
VEH.forEach((v,i)=>v.x=10.7+3*i);

const smooth=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const lerp=(a,b,k)=>a+(b-a)*k;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

const n0=x=>Math.round(x).toLocaleString('en-US'), n1=x=>(Math.round(x*10)/10).toFixed(1), n2=x=>x.toFixed(2);

/* ================= 建立整段時間軸（逐格模擬） ================= */
const DT=1/240, F=[], stops=[];
let T=0, gas=tank0;
function stop(id,off){stops.push({id,t:T+off});}
function pushS(s){gas-=(s.mdot||0)*DT;s.gas=gas;s.t=T;F.push(s);T+=DT;}
function seg(dur,fn){const n=Math.max(1,Math.round(dur/DT));for(let i=0;i<n;i++)pushS(fn(i*DT,i/n));}
function st(o){return Object.assign({scene:'A',x:0,y:hc,phi:0,rho:0,vx:0,vy:0,G:1,fan:0,main:0,down:0,att:0,mdot:0,
  forces:[],cap:'',fade:0,couple:0,title:'',contact:true,load:1,gap:hc,onLoop:false,dust:0,shk:0,slowT:1,camT:null,aj:AJ0,orbT:0,yawT:0,pitT:0,dT:12},o);}
const AJ0=[0,0,0,0,0,0];
function vecs(phi,rho){const c=Math.cos(rho);return{fw:[Math.cos(phi),Math.sin(phi)],up:[-Math.sin(phi)*c,Math.cos(phi)*c]};}
function forces(p,o){
  const {fw,up}=vecs(p.phi||0,p.rho||0);
  const cx=p.x-up[0]*hc, cy=p.y-up[1]*hc;
  const out=[{k:'mg',mag:1,dir:[0,-1],at:[p.x,p.y],mode:'from'}];
  if(o.N>0.02) out.push({k:'N',mag:o.N,dir:up,at:[cx+fw[0]*0.9,cy+fw[1]*0.9],mode:'from'});
  if(o.S>0.02) out.push({k:'S',mag:o.S,dir:[-up[0],-up[1]],at:[cx-fw[0]*0.9+up[0]*0.25,cy-fw[1]*0.9+up[1]*0.25],mode:'from'});
  if(o.f&&Math.abs(o.f)>0.02) out.push({k:'f',mag:Math.abs(o.f),dir:o.f>0?fw:[-fw[0],-fw[1]],at:[cx,cy],mode:'from'});
  if(o.T) out.push({k:'T',mag:o.T,dir:fw,at:[p.x-fw[0]*2.3,p.y-fw[1]*2.3],mode:'to'});
  if(o.Td) out.push({k:'T',mag:o.Td,dir:up,at:[p.x-up[0]*0.45+fw[0]*1.2,p.y-up[1]*0.45+fw[1]*1.2],mode:'to'});
  return out;
}
const CY=w=>0.16875*w;
const camA1=x=>[x+1.5,CY(20),20], camF=(x,y,vx)=>[x+clamp(vx*0.18,-3,3),Math.max(CY(30),y+0.4),30], camB=x=>[Math.min(x+8,16),CY(40),40];
const blendCam=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];

// ---- 第一段：彈射起步 ----
stop('s1',0.6);
seg(1.2,()=>st({x:0,camT:camA1(0),forces:forces({x:0,y:hc},{N:1}),cap:'靜止待命：只受重力與正向力'}));
seg(1.0,(tau,u)=>{const S=smooth(u);return st({x:0,fan:S,load:1+S,camT:camA1(0),forces:forces({x:0,y:hc},{N:1+S,S}),cap:'吸地風扇啟動中……車身被往下壓'});});
stop('s2',0.02);
seg(0.5,()=>st({x:0,fan:1,load:2,camT:camA1(0),forces:forces({x:0,y:hc},{N:2,S:1}),cap:'吸地風扇全開：車被壓向地面'}));
const tLa0=T;
stop('s3',0.03); stop('s4',tL-2*DT);
seg(tL,(tau)=>{const x=0.5*aL*tau*tau;return st({x,vx:aL*tau,fan:1,load:2,main:aT/g,mdot:mdotL,G:Math.hypot(aL,g)/g,camT:camA1(x),
  dust:tau<0.45?1:0,shk:tau<DT*1.5?0.07:0,slowT:0.4,forces:forces({x,y:hc},{N:2,S:1,f:aTire/g,T:aT/g}),cap:'吸地風扇＋主推進器：全力彈射'});});
const tB0=T;
seg(tBr,(tau)=>{const x=dL+v60*tau-0.5*aBr*tau*tau, vx=v60-aBr*tau;const k=smooth((T-tB0)/(tBr+tCr));
  return st({x,vx,fan:1,load:2,G:Math.hypot(aBr,g)/g,camT:blendCam(camA1(x),camF(x,hc,vx),k),
  forces:forces({x,y:hc},{N:2,S:1,f:-aBr/g}),cap:'推進器關閉，煞車減速到約 65 km/h，準備進入彎曲坡道'});});
seg(tCr,(tau)=>{const x=dL+dBr+vIn*tau;const k=smooth((T-tB0)/(tBr+tCr));
  return st({x,vx:vIn,fan:1,load:2,camT:blendCam(camA1(x),camF(x,hc,vIn),k),forces:forces({x,y:hc},{N:2,S:1}),cap:'以 18 m/s（約 65 km/h）駛向坡道'});});

// ---- 第二段：彎曲坡道 ----
{
  let th=0; const mk=[[6,'s5'],[90,'s6'],[149,'s7']]; let mi=0;
  while(th<thE){
    if(mi<mk.length&&th>=mk[mi][0]*Math.PI/180){stops.push({id:mk[mi][1],t:T});mi++;}
    const v=vTh(th), ct=Math.cos(th), sn=Math.sin(th);
    const x=xL+(r-hc)*sn, y=r-(r-hc)*ct;
    const at=aD-g*sn, an=v*v/r;
    const ax=at*ct-an*sn, ay=at*sn+an*ct;
    const N=(an+S1*g+g*ct)/g, vc=v*(r-hc)/r;
    pushS(st({x,y,phi:th,vx:vc*ct,vy:vc*sn,fan:1,load:N,onLoop:true,G:Math.hypot(ax,ay+g)/g,camT:camF(x,y,vc*ct),slowT:th>2.53?0.2:(th>2.3?0.4:0.7),
      forces:forces({x,y,phi:th},{N,S:1,f:aD/g}),cap:th<1.2?'進入彎曲坡道：圓周運動開始':(th<2.2?'貼著垂直牆面往上爬':'接近倒立：吸地風扇把車貼在牆上')}));
    th+=v/r*DT;
  }
}
// ---- 飛行（角動量延續 + 姿態控制） ----
function rollAt(tau){const t=tau-rollStart;if(t<=0)return 0;const A=rollAcc,C=rollCoast,a=rollAlpha,w=rollW;
  if(t<A)return 0.5*a*t*t; if(t<A+C)return 0.5*a*A*A+w*(t-A);
  if(t<2*A+C){const u=t-A-C;return 0.5*a*A*A+w*C+w*u-0.5*a*u*u;}
  const u=t-2*A-C; return Math.PI+0.05*Math.exp(-6*u)*Math.sin(11*u);}
const tEx=T, tdX=tb+tBurn;
// 子彈時間運鏡：離開坡道後鏡頭繞到車子斜前下方，落地後再轉回側面
function orbitAt(tau){
  const orb=tau<tdX+0.05?smooth(tau/0.3):1-smooth((tau-tdX-0.05)/0.85);
  const k1=smooth((tau-0.3)/1.4), k2=smooth((tau-1.7)/0.4);
  const yaw=lerp(lerp(-0.9,-1.15,k1),-0.62,k2), pit=lerp(-0.22,-0.1,k2), d=lerp(lerp(10.5,12.5,k1),14,k2);
  let slow=1; if(tau<0.35)slow=0.12; else if(tau<1.75)slow=0.3; else if(tau<tb-0.05)slow=0.5; else if(tau<tdX+0.3)slow=0.3; else if(tau<tdX+1.0)slow=0.55;
  return {orbT:orb,yawT:yaw,pitT:pit,dT:d,slowT:slow};
}
stop('s8',rollStart+0.02); stop('s9',rollEnd+0.02);
seg(tb,(tau)=>{
  const x=Ex+Vx*tau, y=Ey+Vy*tau-0.5*g*tau*tau;
  let phi=Math.PI, att=0, mdot=0, couple=0;
  if(tau<tP){phi=thE+w0*tau-0.5*alphaP*tau*tau;att=0.35;mdot+=mdotP;}
  const rho=rollAt(tau), t=tau-rollStart, aj=[0,0,0,0,0,0];
  if(t>0&&t<rollAcc){couple=1;mdot+=mdotAtt;att=1;aj[0]=aj[1]=1;}
  else if(t>rollAcc+rollCoast&&t<2*rollAcc+rollCoast){couple=-1;mdot+=mdotAtt;att=1;aj[2]=aj[3]=1;}
  else if(t>=2*rollAcc+rollCoast&&t<2*rollAcc+rollCoast+0.4){att=Math.max(att,0.35);const tm=t-2*rollAcc-rollCoast;aj[(Math.floor(tm*14)%2)?0:2]=0.4*Math.max(0,Math.sin(tm*60));aj[(Math.floor(tm*14)%2)?1:3]=0.4*Math.max(0,Math.sin(tm*60));}
  if(tau<tP){aj[4]=aj[5]=0.45;}
  let cap='離開坡道：拋體運動，車身還帶著轉動（角動量）';
  if(tau>rollStart&&tau<rollEnd) cap='姿態推進器：力偶讓車空中滾轉翻正';
  else if(tau>=rollEnd&&tau<rollEnd+0.45) cap='主動式姿態微調：壓平車頭、調正左右';
  else if(tau>=rollEnd+0.45) cap='自由落體下墜中……';
  return st({x,y,phi,rho,vx:Vx,vy:Vy-g*tau,G:0,att,mdot,couple,aj,contact:false,gap:hc+0.06,camT:camF(x,y,Vx),
    ...orbitAt(tau),forces:forces({x,y,phi,rho},{}),cap});
});
stop('s10',0.02);
seg(tBurn,(tau)=>{const x=Ex+Vx*(tb+tau), y=yb+vyb*tau+0.5*aB*tau*tau;
  return st({x,y,phi:Math.PI,rho:Math.PI,vx:Vx,vy:vyb+aB*tau,G:GB,down:GB,mdot:mdotB,contact:false,gap:hc+0.06,camT:camF(x,y,Vx),...orbitAt(tb+tau),
  forces:forces({x,y,phi:Math.PI,rho:Math.PI},{Td:GB}),cap:'離地 6.5 m：向下噴嘴全力煞住下墜'});});
const xTD=Ex+Vx*(tb+tBurn);
seg(Tsus,(tau)=>{const q=Math.PI*tau/(2*Tsus);const x=xTD+Vx*tau, y=hc-dip*Math.sin(q);const a=vLand*(Math.PI/(2*Tsus))*Math.sin(q);
  return st({x,y,phi:Math.PI,rho:Math.PI,vx:Vx,vy:-vLand*Math.cos(q),G:1+a/g,load:1+a/g,gap:y,dust:tau<0.08?2:0,shk:tau<DT*1.5?0.1:0,camT:camF(x,y,Vx),...orbitAt(tdX+tau),
  forces:forces({x,y,phi:Math.PI,rho:Math.PI},{N:1+a/g}),cap:'四輪著地：懸吊壓縮吸收衝擊'});});
const xTD2=xTD+Vx*Tsus, tBrk2=-Vx/5;
stop('s11',0.9);
seg(tBrk2,(tau)=>{const x=xTD2+Vx*tau+2.5*tau*tau, y=hc-dip*(1-smooth(tau/0.4));const fan=smooth(tau/0.4), vx=Vx+5*tau;
  return st({x,y,phi:Math.PI,rho:Math.PI,vx,fan,load:1+fan,gap:y,G:Math.hypot(5,g)/g,camT:camF(x,y,vx),...orbitAt(tdX+Tsus+tau),
  forces:forces({x,y,phi:Math.PI,rho:Math.PI},{N:1+fan,S:fan,f:-5/g}),cap:'吸地風扇重新介入：加大正向力來煞車'});});
const xEnd2=xTD2+Vx*tBrk2+2.5*tBrk2*tBrk2;
seg(1.0,()=>st({x:xEnd2,phi:Math.PI,rho:Math.PI,fan:1,load:2,camT:camF(xEnd2,hc,0),forces:forces({x:xEnd2,y:hc,phi:Math.PI,rho:Math.PI},{N:2,S:1}),cap:'第一、二段完成'}));
const gasAfter2=gas;
seg(0.7,(tau,u)=>st({x:xEnd2,phi:Math.PI,rho:Math.PI,fan:1,load:2,camT:camF(xEnd2,hc,0),fade:u,title:'第三段：跳越車列',forces:[]}));
seg(0.6,()=>st({scene:'B',x:-36,fan:1,load:2,camT:camB(-36),fade:1,title:'第三段：跳越車列',forces:[]}));

// ---- 第三段：跳越車列 ----
const camBNear=(x,y)=>[x+1.2,Math.max(CY(14.5),y+0.15),14.5];
const camBLand=(x,y,w=15)=>[x+1.2,Math.max(CY(w),y+0.1),w];
seg(3.0,(tau)=>{const x=-36+vx3*tau;const fan=tau<2.58?1:Math.max(0,1-(tau-2.58)/0.3);
  const kz=smooth((tau-1.25)/0.9);
  return st({scene:'B',x,vx:vx3,fan,load:1+fan,camT:blendCam(camB(x),camBNear(x,hc),kz),fade:tau<0.7?1-tau/0.7:0,title:'第三段：跳越車列',
  forces:forces({x,y:hc},{N:1+fan,S:fan}),cap:tau<2.2?'以 12 m/s（約 43 km/h）接近車列':'鏡頭拉近：起跳前先關閉吸地風扇'});});
stop('s12',0.03);
seg(t1,(tau)=>{const x=vx3*tau, y=hc+0.5*g*tau*tau;
  return st({scene:'B',x,y,vx:vx3,vy:g*tau,G:2,down:2,mdot:mdot1,contact:false,gap:hc+0.06,camT:camBNear(x,y),slowT:0.55,
  forces:forces({x,y},{Td:2}),cap:'向下噴嘴推力 2mg：向上加速起跳'});});
stop('s13',vy1/g);
seg(tc,(tau)=>{const x=vx3*(t1+tau), y=hc+h1+vy1*tau-0.5*g*tau*tau;
  const tApex=vy1/g;
  // 最高點下墜前拉遠（看越過車列全景）→ 落地噴射出來前（tau 接近 tc）再次拉近
  const kOut=smooth((tau-(tApex-0.32))/0.42), kIn=smooth((tau-(tc-0.52))/0.42);
  const cMid=blendCam(camBNear(x,y),[18.5,CY(38),38],kOut);
  const camT=blendCam(cMid,camBLand(x,y,15),kIn);
  const cap=tau<tApex?'推進器關閉：靠慣性繼續上升（鉛直上拋）':(tau<tc-0.4?'最高點拉遠：越過車列，開始下墜':'準備煞降：噴射前鏡頭拉近');
  return st({scene:'B',x,y,vx:vx3,vy:vy1-g*tau,G:0,contact:false,gap:hc+0.06,camT,slowT:0.55,forces:forces({x,y},{}),cap});});
seg(tB2,(tau)=>{const x=vx3*(t1+tc+tau), y=hc+2+vy2*tau+0.5*a2*tau*tau;
  return st({scene:'B',x,y,vx:vx3,vy:vy2+a2*tau,G:(g+a2)/g,down:(g+a2)/g,mdot:mdot2,contact:false,gap:hc+0.06,camT:camBLand(x,y,15),slowT:0.5,
  forces:forces({x,y},{Td:(g+a2)/g}),cap:'最後 2 m：向下噴嘴噴射煞降'});});
const xT3=vx3*(t1+tc+tB2);
stop('s14',0.15);
seg(Tsus,(tau)=>{const q=Math.PI*tau/(2*Tsus);const x=xT3+vx3*tau, y=hc-dip*Math.sin(q);const a=vLand*(Math.PI/(2*Tsus))*Math.sin(q);
  return st({scene:'B',x,y,vx:vx3,vy:-vLand*Math.cos(q),G:1+a/g,load:1+a/g,gap:y,dust:tau<0.08?2:0,shk:tau<DT*1.5?0.08:0,camT:camBLand(x,hc,15.5),slowT:0.55,
  forces:forces({x,y},{N:1+a/g}),cap:'落地！'});});
const xT4=xT3+vx3*Tsus;
seg(2.4,(tau)=>{const x=xT4+vx3*tau-2.5*tau*tau, y=hc-dip*(1-smooth(tau/0.4));const fan=smooth(tau/0.4), vx=vx3-5*tau;
  const w=lerp(15.5,20,smooth(tau/1.6));
  return st({scene:'B',x,y,vx,fan,load:1+fan,gap:y,G:Math.hypot(5,g)/g,camT:[x+1.2*(1-smooth(tau/2.2)),CY(w),w],forces:forces({x,y},{N:1+fan,S:fan,f:-5/g}),cap:'吸地風扇＋煞車：鏡頭跟隨直到停車'});});
const xFin=xT4+vx3*2.4-2.5*2.4*2.4;
seg(1.2,()=>st({scene:'B',x:xFin,fan:1,load:2,camT:[xFin,CY(20),20],forces:forces({x:xFin,y:hc},{N:2,S:1}),cap:'展示結束'}));
const gasEnd=gas, Tend=T-DT;
stops.forEach((s,i)=>s.i=i);

/* ---- 後處理：讓畫面「像動畫」的平滑量 ---- */
{
  const n=F.length, aF=tau=>1-Math.exp(-DT/tau);
  // 1) 噴氣強度漸強漸弱、輪子轉角、懸吊彈簧
  let mv=0,dv=0,av=0,fv=0,wa=0,wAir=0,tilt=0,tiltV=0,sink=0,sinkV=0;
  const om=2*Math.PI*1.8, ze=0.38;
  for(let i=0;i<n;i++){
    const s=F[i], p=F[Math.max(0,i-1)];
    mv+=(s.main-mv)*aF(0.05); dv+=(s.down-dv)*aF(0.05); av+=(s.att-av)*aF(0.04); fv+=(s.fan-fv)*aF(0.08);
    s.mainV=mv; s.downV=dv; s.attV=av; s.fanV=fv;
    const fw=[Math.cos(s.phi),Math.sin(s.phi)], vf=s.vx*fw[0]+s.vy*fw[1];
    if(s.contact&&s.scene===p.scene){wa+=vf/RW*DT;wAir=vf/RW;}else{wa+=wAir*DT;wAir*=Math.exp(-0.5*DT);}
    s.wa=wa;
    const pf=p.vx*fw[0]+p.vy*fw[1], aLong=s.scene===p.scene?(vf-pf)/DT:0;
    const tT=s.contact?clamp(0.016*aLong/g,-0.06,0.06):0, sT=s.contact?-clamp(0.045*(s.load-1),-0.03,0.17):0.03;
    tiltV+=(-om*om*(tilt-tT)-2*ze*om*tiltV)*DT; tilt+=tiltV*DT;
    sinkV+=(-om*om*(sink-sT)-2*ze*om*sinkV)*DT; sink+=sinkV*DT;
    if(s.scene!==p.scene){tilt=0;sink=0;tiltV=0;sinkV=0;}
    s.tilt=tilt; s.sink=sink;
  }
  // 2) 鏡頭：雙向平滑（不會落後、也不會跳）＋震動包絡
  const sm=(get,set,tauA,tauB=tauA)=>{let start=0;
    for(let i=1;i<=n;i++){ if(i===n||F[i].scene!==F[i-1].scene||(F[i].fade===1&&F[i-1].fade<1)){
      const tau=F[start].scene==='B'?tauB:tauA;
      let v=get(F[start]);for(let j=start;j<i;j++){v+=(get(F[j])-v)*aF(tau);F[j]._f=v;}
      v=F[i-1]._f;for(let j=i-1;j>=start;j--){v+=(F[j]._f-v)*aF(tau);set(F[j],v);} start=i;}}};
  sm(s=>s.camT[0],(s,v)=>s.cx=v,0.32,0.16); sm(s=>s.camT[1],(s,v)=>s.cy=v,0.32,0.16); sm(s=>s.camT[2],(s,v)=>s.cw=v,0.4,0.16);
  sm(s=>s.slowT,(s,v)=>s.slow=v,0.1);
  {let aj=[0,0,0,0,0,0];for(let i=0;i<n;i++){const s=F[i];for(let k=0;k<6;k++)aj[k]+=(s.aj[k]-aj[k])*aF(0.035);s.ajV=aj.slice();s.orb=s.orbT;s.yaw=s.yawT;s.pit=s.pitT;s.dO=s.dT;}}
  let env=0;for(let i=0;i<n;i++){env=Math.max(env*Math.exp(-DT/0.22),F[i].shk);F[i].shake=env;}
}
const at=t=>F[Math.min(F.length-1,Math.max(0,Math.round(t/DT)))];

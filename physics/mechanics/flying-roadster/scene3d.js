/**
 * Three.js 3D 夜間測試場（第一、二段）。
 * 依賴：three.min.js、sim.js、draw2d.js
 */
/* ================= 3D 場景（第一、二段：夜間測試場） ================= */
const cv3=$('cv3'); let R3=null;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const NOZ_MAIN=[[-2.27,0.0,0.38],[-2.27,0.0,-0.38]];
const NOZ_DOWN=[[1.15,-0.4,0.62],[1.15,-0.4,-0.62],[-1.15,-0.4,0.62],[-1.15,-0.4,-0.62]];
// [x,y,z,方向]：方向 +1 向上噴、-1 向下噴（車身座標）
const NOZ_ATT=[[0.35,0.32,0.99,1],[0.35,-0.3,-0.99,-1],[-0.35,-0.3,0.99,-1],[-0.35,0.32,-0.99,1],[1.9,0.17,0,1],[-1.95,-0.28,0,-1]];
const CANOPY=[[-0.86,0.42],[-0.34,0.6],[0.18,0.615],[0.62,0.545],[1.06,0.345],[0.95,0.29],[-0.62,0.3]];
function radialTex(c0,c1,size=128){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
  const g=x.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);g.addColorStop(0,c0);g.addColorStop(1,c1);x.fillStyle=g;x.fillRect(0,0,size,size);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
function shapeFrom(pts){const s=new THREE.Shape();const n=pts.length;const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const m0=mid(pts[n-1],pts[0]);s.moveTo(m0[0],m0[1]);
  for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n],mm=mid(a,b);s.quadraticCurveTo(a[0],a[1],mm[0],mm[1]);}return s;}
function taperGeo(geo,k){const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);
    const f=(1-0.24*clamp((y-0.18)/0.44,0,1))*(1-0.2*Math.pow(Math.min(1,Math.abs(x)/2.32),4));p.setZ(i,p.getZ(i)*f*k);}
  p.needsUpdate=true;}
function smoothN(geo,thr=0.55){geo.computeVertexNormals();const pos=geo.attributes.position,nor=geo.attributes.normal,n=pos.count;
  const map=new Map();for(let i=0;i<n;i++){const k=Math.round(pos.getX(i)*500)+','+Math.round(pos.getY(i)*500)+','+Math.round(pos.getZ(i)*500);
    let a=map.get(k);if(!a){a=[];map.set(k,a);}a.push(i);}
  const out=new Float32Array(n*3);
  for(const idx of map.values())for(const i of idx){let ax=0,ay=0,az=0;const nx=nor.getX(i),ny=nor.getY(i),nz=nor.getZ(i);
    for(const j of idx){const mx=nor.getX(j),my=nor.getY(j),mz=nor.getZ(j);if(nx*mx+ny*my+nz*mz>thr){ax+=mx;ay+=my;az+=mz;}}
    const l=Math.hypot(ax,ay,az)||1;out[i*3]=ax/l;out[i*3+1]=ay/l;out[i*3+2]=az/l;}
  geo.setAttribute('normal',new THREE.BufferAttribute(out,3));}
const jetMat=(col,op)=>new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color(col)},uO:{value:op}},
  vertexShader:`varying float vY;varying vec3 vN;varying vec3 vV;void main(){vY=position.y;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uC;uniform float uO;varying float vY;varying vec3 vN;varying vec3 vV;void main(){float a=pow(clamp(1.+vY,0.,1.),1.5);float f=pow(abs(dot(vN,vV)),1.2);gl_FragColor=vec4(uC*1.5,uO*a*f);}`,
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
function makeJet(lp,dir,len,rad){
  const g=new THREE.Group();
  const outer=new THREE.ConeGeometry(rad,1,20,1,true);outer.translate(0,-0.5,0);
  const core=new THREE.ConeGeometry(rad*0.35,1,14,1,true);core.translate(0,-0.5,0);
  g.add(new THREE.Mesh(outer,jetMat(0x7fc6ff,0.75)));const cm=new THREE.Mesh(core,jetMat(0xe8f6ff,1.0));cm.scale.set(1,0.7,1);g.add(cm);
  g.position.set(lp[0],lp[1],lp[2]);g.quaternion.setFromUnitVectors(V3(0,-1,0),V3(dir[0],dir[1],dir[2]).normalize());
  g.userData.len=len;g.visible=false;return g;}
function setJet(j,k){if(k<0.02){j.visible=false;return;}j.visible=true;const L=j.userData.len*k*(0.88+0.24*Math.random());const w=0.55+0.45*Math.min(1,k);j.scale.set(w,L,w);}
function makeCar(){
  const root=new THREE.Group(), body=new THREE.Group();root.add(body);
  const paint=new THREE.MeshPhysicalMaterial({color:0xa30f18,metalness:0.6,roughness:0.3,clearcoat:1,clearcoatRoughness:0.06,envMapIntensity:0.75});
  const carbon=new THREE.MeshStandardMaterial({color:0x131417,roughness:0.55,metalness:0.3});
  const glass=new THREE.MeshPhysicalMaterial({color:0x080d13,metalness:0.4,roughness:0.06,clearcoat:1,envMapIntensity:1.6});
  const ext={depth:1.76,bevelEnabled:true,bevelThickness:0.1,bevelSize:0.07,bevelSegments:5,curveSegments:10};
  const bg=new THREE.ExtrudeGeometry(shapeFrom(PROF),ext);bg.translate(0,0,-0.88);taperGeo(bg,1);smoothN(bg);
  const bm=new THREE.Mesh(bg,paint);bm.castShadow=true;body.add(bm);
  const gg=new THREE.ExtrudeGeometry(shapeFrom(CANOPY),{...ext,bevelSize:0.06,bevelSegments:4});gg.translate(0,0,-0.88);taperGeo(gg,1.025);smoothN(gg);
  const gm=new THREE.Mesh(gg,glass);gm.castShadow=true;body.add(gm);
  const add=(geo,mat,x,y,z,rz=0)=>{const mm=new THREE.Mesh(geo,mat);mm.position.set(x,y,z);mm.rotation.z=rz;body.add(mm);return mm;};
  add(new THREE.BoxGeometry(3.55,0.12,1.98),carbon,0,-0.31,0);                 // 側裙
  add(new THREE.BoxGeometry(4.1,0.04,1.7),new THREE.MeshStandardMaterial({color:0x2a2d32,roughness:0.8}),0,-0.385,0); // 底盤
  [1,-1].forEach(sd=>{add(new THREE.BoxGeometry(0.62,0.2,0.06),carbon,-0.95,0.0,sd*0.985,0.12);});  // 側進氣
  const lightM=new THREE.MeshBasicMaterial({color:0xfff4dc});
  [1,-1].forEach(sd=>add(new THREE.BoxGeometry(0.34,0.045,0.42),lightM,1.97,0.035,sd*0.52,-0.24));    // 頭燈
  add(new THREE.BoxGeometry(0.05,0.05,1.55),new THREE.MeshBasicMaterial({color:0xff1e1e}),-2.24,0.15,0); // 尾燈
  add(new THREE.BoxGeometry(0.45,0.12,1.6),carbon,-2.0,-0.3,0);                 // 擴散器
  add(new THREE.BoxGeometry(0.5,0.05,1.9),carbon,-2.02,0.29,0);                 // 尾翼
  const arch=new THREE.CylinderGeometry(0.41,0.41,1.95,32);arch.rotateX(Math.PI/2);
  [-1.37,1.37].forEach(x=>add(arch,new THREE.MeshStandardMaterial({color:0x07080a,roughness:1}),x,-0.2,0));
  const noz=new THREE.CylinderGeometry(0.07,0.09,0.08,12);
  NOZ_DOWN.forEach(p=>add(noz,carbon,p[0],p[1]+0.02,p[2]));
  // 吸地風扇光暈
  const fan=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.8),new THREE.MeshBasicMaterial({map:radialTex('rgba(190,140,255,1)','rgba(120,60,255,0)'),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  fan.rotation.x=-Math.PI/2;fan.position.y=-0.45;body.add(fan);
  const fanLight=new THREE.PointLight(0xa070ff,0,5,2);fanLight.position.set(0,-0.6,0);root.add(fanLight);
  const head=new THREE.SpotLight(0xfff1dd,1.3,45,0.42,0.6,1.2);head.position.set(2.1,0,0);head.target.position.set(10,-0.8,0);body.add(head,head.target);
  // 輪子
  const tireM=new THREE.MeshStandardMaterial({color:0x111214,roughness:0.92}), faceM=new THREE.MeshStandardMaterial({color:0x1c1e21,metalness:0.6,roughness:0.35}),
        spokeM=new THREE.MeshStandardMaterial({color:0xc9cdd3,metalness:1,roughness:0.22}), calM=new THREE.MeshStandardMaterial({color:0xe0a400,roughness:0.4});
  const tireG=new THREE.CylinderGeometry(RW,RW,0.28,36);tireG.rotateX(Math.PI/2);
  const faceG=new THREE.CylinderGeometry(0.25,0.25,0.02,32);faceG.rotateX(Math.PI/2);
  const lipG=new THREE.TorusGeometry(0.25,0.018,8,40);
  const spG=new THREE.BoxGeometry(0.21,0.045,0.03);
  const wheels=[];
  for(const wx of [-1.37,1.37])for(const sd of [1,-1]){
    const g=new THREE.Group();g.position.set(wx,-hc+RW,sd*0.86);
    const t=new THREE.Mesh(tireG,tireM);t.castShadow=true;g.add(t);
    const f=new THREE.Mesh(faceG,faceM);f.position.z=sd*0.135;g.add(f);
    const l=new THREE.Mesh(lipG,spokeM);l.position.z=sd*0.142;g.add(l);
    for(let k=0;k<5;k++){const sp=new THREE.Mesh(spG,spokeM);const a=k*2*Math.PI/5;sp.position.set(Math.cos(a)*0.13,Math.sin(a)*0.13,sd*0.15);sp.rotation.z=a;g.add(sp);}
    const cal=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.17,0.05),calM);cal.position.set(wx+(wx>0?0.12:-0.12),-hc+RW+0.07,sd*0.95);
    root.add(g,cal);wheels.push({g,cal});
  }
  const jMain=NOZ_MAIN.map(p=>makeJet(p,[-1,0,0],3.2,0.3)), jDown=NOZ_DOWN.map(p=>makeJet(p,[0,-1,0],3.8,0.32)), jAtt=NOZ_ATT.map(p=>makeJet(p.slice(0,3),[0,p[3],0],1.3,0.16));
  [...jMain,...jDown,...jAtt].forEach(j=>root.add(j));
  // 吸氣氣流（只要吸地風扇有在吸就會出現）
  const NS=90, NT=6, sGeo=new THREE.BufferGeometry();
  sGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(NS*NT*3),3));
  sGeo.setAttribute('alpha',new THREE.BufferAttribute(new Float32Array(NS*NT),1));
  sGeo.setAttribute('psize',new THREE.BufferAttribute(new Float32Array(NS*NT),1));
  const suck=new THREE.Points(sGeo,new THREE.ShaderMaterial({uniforms:{uS:{value:400},uC:{value:new THREE.Color(0xc8a2ff)}},
    vertexShader:`attribute float alpha;attribute float psize;uniform float uS;varying float vA;void main(){vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=psize*uS/max(0.1,-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);if(r>.5)discard;gl_FragColor=vec4(uC,vA*smoothstep(.5,0.,r));}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  suck.frustumCulled=false;root.add(suck);
  const gapTex=(()=>{const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,256,0);g.addColorStop(0,'rgba(170,110,255,0)');g.addColorStop(0.2,'rgba(190,140,255,1)');g.addColorStop(0.8,'rgba(190,140,255,1)');g.addColorStop(1,'rgba(170,110,255,0)');
    x.fillStyle=g;x.fillRect(0,0,256,64);const v=x.getImageData(0,0,256,64);for(let yy=0;yy<64;yy++){const f=Math.sin(Math.PI*yy/63);for(let xx=0;xx<256;xx++)v.data[(yy*256+xx)*4+3]*=f;}x.putImageData(v,0,0);
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;})();
  const gapGlow=[];
  [1,-1].forEach(sd=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(4.0,1),new THREE.MeshBasicMaterial({map:gapTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    m.position.z=sd*1.06;m.renderOrder=5;root.add(m);gapGlow.push(m);});
  const seeds=Array.from({length:NS},(_,i)=>({a:i/NS*Math.PI*2+Math.sin(i*7.1)*0.08,p:(i*0.618)%1,sp:0.75+((i*37)%10)/25}));
  return {root,body,wheels,jMain,jDown,jAtt,fan,fanLight,suck,seeds,NT,gapGlow};
}
function updateSuck(car,fanV,gap,t){
  const P=car.suck.geometry.attributes, pos=P.position.array, al=P.alpha.array, sz=P.psize.array, NT=car.NT;
  const pulse=0.75+0.25*Math.sin(t*9);
  car.gapGlow.forEach(m=>{m.visible=fanV>0.03;m.material.opacity=0.85*fanV*pulse;const h=Math.max(0.16,gap-0.34);m.scale.set(1,h+0.1,1);m.position.y=-gap+h/2;});
  car.suck.visible=fanV>0.03; if(!car.suck.visible)return;
  car.seeds.forEach((sd,i)=>{
    const ca=Math.cos(sd.a), sa=Math.sin(sd.a);
    const sx0=ca*3.0, sz0=sa*1.75, ex=Math.sign(ca)*0.75, ez=sa*0.15;   // 起點在車身外圍、終點在兩個風扇進氣口
    for(let k=0;k<NT;k++){
      const u=((t*0.55*sd.sp+sd.p)%1)-k*0.035, uu=Math.max(0,u), e=uu*uu*(3-2*uu);
      const x=lerp(sx0,ex,e), z=lerp(sz0,ez,e);
      const rise=uu>0.72?smooth((uu-0.72)/0.28)*(gap-0.4):0;           // 最後一段往上被吸進車底
      const j=(i*NT+k);
      pos[j*3]=x;pos[j*3+1]=-gap+0.05+rise;pos[j*3+2]=z;
      al[j]=u<0?0:Math.min(1,fanV*1.3)*Math.sin(Math.PI*Math.min(1,uu))*(1-k/NT);
      sz[j]=0.4*(1-k/(NT+1))*(0.7+0.6*e);
    }});
  P.position.needsUpdate=true;P.alpha.needsUpdate=true;P.psize.needsUpdate=true;
}
const PMAX=3200;
function makePoints(additive,col){const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(PMAX*3),3));geo.setAttribute('alpha',new THREE.BufferAttribute(new Float32Array(PMAX),1));
  geo.setAttribute('psize',new THREE.BufferAttribute(new Float32Array(PMAX),1));geo.setDrawRange(0,0);
  const mat=new THREE.ShaderMaterial({uniforms:{uS:{value:400},uC:{value:new THREE.Color(col)}},
    vertexShader:`attribute float alpha;attribute float psize;uniform float uS;varying float vA;void main(){vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=psize*uS/max(0.1,-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);if(r>.5)discard;gl_FragColor=vec4(uC,vA*smoothstep(.5,0.,r));}`,
    transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});
  const p=new THREE.Points(geo,mat);p.frustumCulled=false;return p;}
function init3D(){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:cv3,antialias:true,powerPreference:'high-performance'});}catch(e){return null;}
  if(!renderer.getContext())return null;
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.85;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x04060b);scene.fog=new THREE.Fog(0x04060b,90,320);
  const camera=new THREE.PerspectiveCamera(28,16/9,0.1,900);
  // 環境反射（讓烤漆有反光）
  const pm=new THREE.PMREMGenerator(renderer);const es=new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(40,40,40),new THREE.MeshBasicMaterial({color:0x0a0d14,side:THREE.BackSide})));
  [[0,18,0,26,1,26,2],[17,6,0,1,8,22,1.1],[-17,7,6,1,6,12,0.8],[0,5,-17,18,6,1,0.6],[0,4,17,10,3,1,0.5]].forEach(([x,y,z,w,h,d,k])=>{
    const mm=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:new THREE.Color(k,k,k*1.05)}));mm.position.set(x,y,z);es.add(mm);});
  scene.environment=pm.fromScene(es,0.04).texture;
  // 燈光
  scene.add(new THREE.HemisphereLight(0x2b3b5c,0x050505,0.22));
  const moon=new THREE.DirectionalLight(0xb0c0e8,0.4);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);
  Object.assign(moon.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:90});moon.shadow.bias=-0.0006;scene.add(moon,moon.target);
  const metal=new THREE.MeshStandardMaterial({color:0x3b4048,metalness:0.75,roughness:0.42});
  const beam=(a,b,t,parent=scene)=>{const d=new THREE.Vector3().subVectors(b,a);const L=d.length();const mm=new THREE.Mesh(new THREE.BoxGeometry(t,L,t),metal);
    mm.position.copy(a).addScaledVector(d,0.5);mm.quaternion.setFromUnitVectors(V3(0,1,0),d.clone().normalize());mm.castShadow=true;parent.add(mm);return mm;};
  // 地面與跑道
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),new THREE.MeshStandardMaterial({color:0x0a0b0d,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const rc=document.createElement('canvas');rc.width=512;rc.height=256;const r2=rc.getContext('2d');
  r2.fillStyle='#26282c';r2.fillRect(0,0,512,256);
  for(let i=0;i<5000;i++){const v=Math.random()<0.5?255:0;r2.fillStyle=`rgba(${v},${v},${v},0.05)`;r2.fillRect(Math.random()*512,Math.random()*256,2,2);}
  r2.fillStyle='#a9a9a9';r2.fillRect(0,8,512,7);r2.fillRect(0,241,512,7);r2.fillStyle='#b8b8b8';r2.fillRect(0,124,240,8);
  const rt=new THREE.CanvasTexture(rc);rt.wrapS=THREE.RepeatWrapping;rt.repeat.set(260/8,1);rt.encoding=THREE.sRGBEncoding;rt.anisotropy=8;
  const road=new THREE.Mesh(new THREE.PlaneGeometry(260,12),new THREE.MeshStandardMaterial({map:rt,roughness:0.82}));
  road.rotation.x=-Math.PI/2;road.position.set(40,0.01,0);road.receiveShadow=true;scene.add(road);
  // 起跑線
  const sl=new THREE.Mesh(new THREE.PlaneGeometry(0.4,12),new THREE.MeshStandardMaterial({color:0xeeeeee,roughness:0.8}));sl.rotation.x=-Math.PI/2;sl.position.set(2.5,0.02,0);scene.add(sl);
  // 星空與遠方燈光
  {const sp=[];for(let i=0;i<1000;i++){const th=Math.random()*Math.PI*2,ph=0.04+Math.random()*0.5*Math.PI;sp.push(40+500*Math.cos(ph)*Math.cos(th),500*Math.sin(ph),500*Math.cos(ph)*Math.sin(th));}
   const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
   scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xa8b4cc,size:1.3,sizeAttenuation:false,fog:false})));
   const lp=[];for(let i=0;i<160;i++){const th=Math.random()*Math.PI*2;lp.push(40+280*Math.cos(th),0.5+Math.random()*2,280*Math.sin(th));}
   const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));
   scene.add(new THREE.Points(lg,new THREE.PointsMaterial({color:0xffc985,size:2.2,sizeAttenuation:false,fog:false})));}
  // 第一、二段專用：彎曲坡道
  const grpA=new THREE.Group();scene.add(grpA);
  {const band=[];for(let d=0;d<=150;d+=1.5){const t=d*Math.PI/180;band.push(new THREE.Vector2(xL+r*Math.sin(t),r-r*Math.cos(t)));}
   for(let d=150;d>=0;d-=1.5){const t=d*Math.PI/180;band.push(new THREE.Vector2(xL+(r+0.55)*Math.sin(t),r-(r+0.55)*Math.cos(t)));}
   const rg=new THREE.ExtrudeGeometry(new THREE.Shape(band),{depth:6,bevelEnabled:false,curveSegments:1});rg.translate(0,0,-3);
   const ramp=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({color:0x7a8088,roughness:0.75,metalness:0.05}));ramp.receiveShadow=true;grpA.add(ramp);
   const arc=(R,z)=>new THREE.CatmullRomCurve3(Array.from({length:121},(_,i)=>{const t=i/120*thE;return V3(xL+R*Math.sin(t),r-R*Math.cos(t),z);}));
   [-1.1,1.1].forEach(z=>grpA.add(new THREE.Mesh(new THREE.TubeGeometry(arc(r-0.02,z),240,0.035,6),new THREE.MeshStandardMaterial({color:0xdedede,emissive:0x2a2a2a}))));
   [-2.97,2.97].forEach(z=>{grpA.add(new THREE.Mesh(new THREE.TubeGeometry(arc(r-0.03,z),240,0.05,6),new THREE.MeshBasicMaterial({color:0xff2626})));
     grpA.add(new THREE.Mesh(new THREE.TubeGeometry(arc(r-0.03,z),240,0.22,8),new THREE.MeshBasicMaterial({color:0xff2020,transparent:true,opacity:0.16,blending:THREE.AdditiveBlending,depthWrite:false})));});
   const rl1=new THREE.PointLight(0xff3030,0.8,14,2);rl1.position.set(xL+r*Math.sin(2.2),r-r*Math.cos(2.2),3.3);grpA.add(rl1);
   let prev=null;
   for(let d=12;d<=150;d+=9.2){const t=d*Math.PI/180,R=r+0.75;const px=xL+R*Math.sin(t),py=r-R*Math.cos(t);
     for(const z of [-3.3,3.3]){if(z>0&&d>92)continue;beam(V3(px,0,z),V3(px,py,z),0.22,grpA);if(prev&&!(z>0&&d>92))beam(V3(prev[0],prev[1],z),V3(px,0.05,z),0.1,grpA);}
     beam(V3(px,py,-3.3),V3(px,py,3.3),0.14,grpA);prev=[px,py];}}
  // 第三段專用：5 台停放車列（3D 模型）
  const grpB=new THREE.Group();grpB.visible=false;scene.add(grpB);
  {const wMat=new THREE.MeshStandardMaterial({color:0x141619,roughness:0.9}), rMat=new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:0.8,roughness:0.3}),
         gMat=new THREE.MeshPhysicalMaterial({color:0x0c131c,metalness:0.3,roughness:0.08,clearcoat:1,envMapIntensity:1.5}),
         hlMat=new THREE.MeshBasicMaterial({color:0xfff6e0}), rlMat=new THREE.MeshBasicMaterial({color:0xff2a20});
   VEH.forEach(v=>{
     const vg=new THREE.Group();vg.position.set(v.x,0,0);grpB.add(vg);
     const w=v.w, h=v.h, L=v.t==='semi'?5.6:(v.t==='truck'?4.9:4.3);
     const mat=new THREE.MeshPhysicalMaterial({color:v.c,metalness:v.t==='truck'?0.85:0.45,roughness:v.t==='truck'?0.26:0.32,clearcoat:v.t==='truck'?0.2:0.9,envMapIntensity:0.9});
     const rw=v.t==='semi'?0.48:(v.t==='truck'?0.42:0.34), wg=new THREE.CylinderGeometry(rw,rw,0.26,24);wg.rotateZ(Math.PI/2);
     const rg2=new THREE.CylinderGeometry(rw*0.62,rw*0.62,0.27,18);rg2.rotateZ(Math.PI/2);
     const zs=v.t==='semi'?[L*0.32,-L*0.18,-L*0.36]:[L*0.31,-L*0.31];
     for(const sx2 of [-w/2+0.12,w/2-0.12])for(const sz of zs){
       const wm=new THREE.Mesh(wg,wMat);wm.position.set(sx2,rw,sz);wm.castShadow=true;vg.add(wm);
       const rm=new THREE.Mesh(rg2,rMat);rm.position.set(sx2,rw,sz);vg.add(rm);
     }
     let pts;
     if(v.t==='semi'){
       pts=[[-L/2,0.38],[L/2,0.38],[L/2,1.25],[L*0.38,2.55],[L*0.1,3.95],[-L*0.28,4.0],[-L/2,3.95]];
     }else if(v.t==='truck'){
       pts=[[-L/2,0.4],[L/2,0.4],[L/2,0.98],[L*0.06,h],[-L/2,1.26]];
     }else{
       pts=[[-L/2,0.3],[L/2,0.3],[L/2,h*0.52],[L*0.24,h*0.58],[L*0.08,h],[-L*0.26,h],[-L*0.42,h*0.64],[-L/2,h*0.56]];
     }
     const sh=v.t==='truck'?(()=>{const s=new THREE.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();return s;})():shapeFrom(pts);
     const eg=new THREE.ExtrudeGeometry(sh,{depth:w-0.14,bevelEnabled:true,bevelThickness:0.06,bevelSize:0.05,bevelSegments:v.t==='truck'?1:4});
     eg.translate(0,0,-(w-0.14)/2);eg.rotateY(Math.PI/2);
     const bm=new THREE.Mesh(eg,mat);bm.castShadow=true;bm.receiveShadow=true;vg.add(bm);
     // 前擋風玻璃與車燈（朝向鏡頭 +Z）
     const wy=v.t==='semi'?2.05:(v.t==='truck'?1.38:h*0.76), wh=v.t==='semi'?0.95:(v.t==='truck'?0.52:h*0.32), wz=v.t==='semi'?L*0.41:(v.t==='truck'?L*0.28:L*0.18);
     const wm=new THREE.Mesh(new THREE.BoxGeometry(w*0.82,wh,0.12),gMat);wm.position.set(0,wy,wz);wm.rotation.x=v.t==='semi'?-0.38:(v.t==='truck'?-0.85:-0.62);vg.add(wm);
     const sw=new THREE.Mesh(new THREE.BoxGeometry(w+0.03,wh*0.78,L*0.42),gMat);sw.position.set(0,wy,-L*0.04);vg.add(sw);
     if(v.t==='truck'){
       const lb=new THREE.Mesh(new THREE.BoxGeometry(w*0.9,0.06,0.08),hlMat);lb.position.set(0,0.95,L/2+0.02);vg.add(lb);
     }else{
       for(const sx2 of [-w*0.33,w*0.33]){const hl=new THREE.Mesh(new THREE.BoxGeometry(w*0.2,0.09,0.08),hlMat);hl.position.set(sx2,0.68,L/2+0.02);vg.add(hl);}
     }
     for(const sx2 of [-w*0.34,w*0.34]){const rl=new THREE.Mesh(new THREE.BoxGeometry(w*0.18,0.07,0.06),rlMat);rl.position.set(sx2,0.52,L/2+0.02);vg.add(rl);}
   });
   const lB=new THREE.PointLight(0xfff2dd,0.7,28,1.8);lB.position.set(16.7,9,9);grpB.add(lB);}
  // 照明燈塔
  const glowTex=radialTex('rgba(255,246,228,1)','rgba(255,220,170,0)');
  [[xL-30,17,17,xL-10,4],[xL+20,19,15,xL+4,10],[-10,13,15,4,0],[xL-8,15,-20,xL,10]].forEach(([x,y,z,tx,ty])=>{
    beam(V3(x,0,z),V3(x,y,z),0.32);
    const sp=new THREE.SpotLight(0xfff0d8,0.85,95,0.55,0.6,1.6);sp.position.set(x,y,z);sp.target.position.set(tx,ty,0);scene.add(sp,sp.target);
    const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));gl.position.set(x,y+0.2,z);gl.scale.set(3.5,3.5,1);scene.add(gl);
    const hd=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.7,0.4),new THREE.MeshBasicMaterial({color:0xfff7ea}));hd.position.set(x,y,z);hd.lookAt(tx,ty,0);scene.add(hd);});
  // 交通錐
  [[-5,5],[-5,-5],[7,5],[7,-5]].forEach(([x,z])=>{const c=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.72,16),new THREE.MeshStandardMaterial({color:0xff6a10,roughness:0.6}));c.position.set(x,0.36,z);c.castShadow=true;scene.add(c);});
  // 車與粒子
  const car=makeCar();scene.add(car.root);
  const ljDown=new THREE.PointLight(0x8fd0ff,0,14,2), ljMain=new THREE.PointLight(0x8fd0ff,0,12,2);scene.add(ljDown,ljMain);
  const gasP=makePoints(true,0x9fd6ff), dustP=makePoints(false,0x8c7d68);scene.add(gasP,dustP);
  return {renderer,scene,camera,car,moon,ljDown,ljMain,gasP,dustP,grpA,grpB};
}
const _q1=new THREE.Quaternion(),_q2=new THREE.Quaternion(),_v=new THREE.Vector3(),_d=new THREE.Vector3();
const AXZ=V3(0,0,1), AXX=V3(1,0,0);
function carQuat(s,q){_q1.setFromAxisAngle(AXZ,s.phi);_q2.setFromAxisAngle(AXX,s.rho);return q.copy(_q1).multiply(_q2);}
const _qc=new THREE.Quaternion();
function emit3D(s,dt){
  carQuat(s,_qc);
  const add=(key,lp,ld,rate,o={})=>{acc[key]=(acc[key]||0)+rate*dt;if(acc[key]<1)return;
    _v.set(lp[0],lp[1],lp[2]).applyQuaternion(_qc);_d.set(ld[0],ld[1],ld[2]).applyQuaternion(_qc);
    while(acc[key]>=1){acc[key]-=1;const spd=(o.sp||18)*(0.75+Math.random()*0.5),sp=o.spread||0.18,inh=o.inh??0.5;
      parts.push({x:s.x+_v.x,y:s.y+_v.y,z:_v.z,vx:(_d.x+(Math.random()-0.5)*sp*2)*spd+s.vx*inh,vy:(_d.y+(Math.random()-0.5)*sp*2)*spd+s.vy*inh,vz:(_d.z+(Math.random()-0.5)*sp*2)*spd,
        life:0,max:(o.life||0.45)*(0.7+Math.random()*0.6),sz:o.sz||1,dust:!!o.dust});}};
  if(s.mainV>0.03)NOZ_MAIN.forEach((p,i)=>add('m'+i,p,[-1,0,0],220*Math.min(1,s.mainV*1.2)));
  if(s.downV>0.03)NOZ_DOWN.forEach((p,i)=>add('d'+i,p,[0,-1,0],120*Math.min(1.5,s.downV/2)));
  NOZ_ATT.forEach((p,i)=>{const k=s.ajV[i];if(k>0.04)add('a'+i,p,[0,p[3],0],70*k,{sz:0.45,sp:10,life:0.35});});
  if(s.dust>0)[-1.37,1.37].forEach((x,i)=>[0.86,-0.86].forEach((z,j)=>add('u'+i+j,[x,-s.gap+0.05,z],[-0.5,0.4,0],50*s.dust,{dust:true,sp:4,spread:0.9,life:1.2,sz:1.4,inh:0.15})));
  if(s.downV>0.4&&s.y<7){const k=(7-s.y)/7;acc.gd=(acc.gd||0)+70*k*s.downV*dt;
    while(acc.gd>=1){acc.gd-=1;const a=Math.random()*Math.PI*2,sp=5+Math.random()*6;parts.push({x:s.x+Math.cos(a)*0.8,y:0.15,z:Math.sin(a)*0.8,vx:Math.cos(a)*sp+s.vx*0.2,vy:1+Math.random()*1.5,vz:Math.sin(a)*sp,life:0,max:1.0+Math.random()*0.6,sz:1.6,dust:true});}}
}
function fillPoints(P,dust){const pos=P.geometry.attributes.position.array,al=P.geometry.attributes.alpha.array,sz=P.geometry.attributes.psize.array;let n=0;
  for(const p of parts){if(p.dust!==dust)continue;if(n>=PMAX)break;const u=p.life/p.max;
    pos[n*3]=p.x;pos[n*3+1]=p.y;pos[n*3+2]=p.z||0;al[n]=dust?0.42*(1-u):0.55*(1-u);sz[n]=(0.3+1.4*u)*p.sz;n++;}
  P.geometry.setDrawRange(0,n);P.geometry.attributes.position.needsUpdate=true;P.geometry.attributes.alpha.needsUpdate=true;P.geometry.attributes.psize.needsUpdate=true;}
function render3D(s){
  const {renderer,scene,camera,car,moon,ljDown,ljMain,grpA,grpB}=R3;
  grpA.visible=s.scene==='A'; grpB.visible=s.scene==='B';
  carQuat(s,car.root.quaternion);car.root.position.set(s.x,s.y,0);
  car.body.position.y=s.sink;car.body.rotation.z=s.tilt;
  car.wheels.forEach(w=>{w.g.position.y=-s.gap+RW;w.g.rotation.z=-s.wa;w.cal.position.y=-s.gap+RW+0.07;});
  car.jMain.forEach(j=>setJet(j,s.mainV));
  car.jDown.forEach(j=>setJet(j,Math.min(1.2,s.downV/2.6)));
  car.jAtt.forEach((j,i)=>setJet(j,s.ajV[i]));
  car.fan.material.opacity=0.6*s.fanV;car.fanLight.intensity=1.8*s.fanV;
  updateSuck(car,s.fanV,s.gap,performance.now()/1000);
  _v.set(0,-1.4,0).applyQuaternion(car.root.quaternion);ljDown.position.set(s.x+_v.x,s.y+_v.y,_v.z);ljDown.intensity=2.6*Math.min(1,s.downV/2.5);
  _v.set(-3.2,0,0).applyQuaternion(car.root.quaternion);ljMain.position.set(s.x+_v.x,s.y+_v.y,_v.z);ljMain.intensity=2.2*Math.min(1,s.mainV*1.2);
  moon.position.set(s.x-10,s.y+26,16);moon.target.position.set(s.x,s.y,0);
  // 鏡頭：側視（教學用）與環繞運鏡（子彈時間）之間平滑切換
  const asp=W/H, D=s.cw/(2*Math.tan(14*Math.PI/180)*asp), k=s.orb;
  const tx=lerp(s.cx,s.x,k), ty=lerp(s.cy,s.y,k), dist=lerp(D,s.dO,k), yaw=lerp(0,s.yaw,k), pit=lerp(0.06,s.pit,k);
  const sh=s.shake||0;
  let cx=tx+dist*Math.sin(yaw)*Math.cos(pit), cy=ty+dist*Math.sin(pit), cz=dist*Math.cos(yaw)*Math.cos(pit);
  cy=Math.max(0.35,cy);
  camera.position.set(cx+sh*Math.sin(s.t*97),cy+sh*Math.cos(s.t*83),cz);camera.lookAt(tx,ty,0);
  fillPoints(R3.gasP,false);fillPoints(R3.dustP,true);
  renderer.render(scene,camera);
}
function P3(x,y,z=0){_v.set(x,y,z).project(R3.camera);return[(_v.x+1)/2*W,(1-_v.y)/2*H,_v.z];}
function drawVehLabels3D(s){
  if(s.scene!=='B')return;
  const U=Math.max(0.65,Math.min(1.3,W/900));
  ctx.font=`600 ${Math.round(11*U)}px -apple-system,"PingFang TC",sans-serif`;
  ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(6,8,12,.85)';ctx.fillStyle='rgba(235,240,248,.9)';
  VEH.forEach((v,vi)=>{
    const p=P3(v.x,0,2.5);if(p[2]>1||p[0]<-60||p[0]>W+60)return;
    const py=p[1]+(vi%2?22:10)*U;
    ctx.strokeText(v.n,p[0],py);ctx.fillText(v.n,p[0],py);
  });
}
function drawForces3D(s){
  const U=Math.max(0.65,Math.min(1.3,W/900)), lw=3*U, Lw=1.15;
  ctx.font=`600 ${Math.round(12*U)}px -apple-system,"PingFang TC",sans-serif`;
  for(const f of s.forces){
    const len=Math.max(0.5,Math.min(6.3,f.mag*Lw));
    let a=[f.at[0],f.at[1]],b;
    if(f.mode==='from')b=[a[0]+f.dir[0]*len,a[1]+f.dir[1]*len];else{b=a;a=[b[0]-f.dir[0]*len,b[1]-f.dir[1]*len];}
    const pa=P3(a[0],a[1]),pb=P3(b[0],b[1]);if(pa[2]>1||pb[2]>1)continue;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=5;drawArrow(pa[0],pa[1],pb[0],pb[1],COL3[f.k],lw);ctx.restore();
    const dx=pb[0]-pa[0],dy=pb[1]-pa[1],L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;
    const tip=f.mode==='from'?pb:pa, sg=f.mode==='from'?1:-1;
    const lx=tip[0]+sg*ux*10*U, ly=tip[1]+sg*uy*10*U+4;
    const txt=f.k==='mg'?'mg':`${LAB[f.k]} ${n1(f.mag)}mg`;
    ctx.textAlign=ux*sg>0.3?'left':ux*sg<-0.3?'right':'center';
    ctx.lineWidth=3.5;ctx.strokeStyle='rgba(8,10,14,.85)';ctx.strokeText(txt,lx,ly);ctx.fillStyle=COL3[f.k];ctx.fillText(txt,lx,ly);
  }
  if(s.couple){const c=P3(s.x,s.y);const R=Math.max(34,0.06*W);ctx.strokeStyle='#ffc93a';ctx.lineWidth=lw;
    const a0=-0.6,a1=-2.5;ctx.beginPath();ctx.arc(c[0],c[1],R,a0,a1,true);ctx.stroke();
    ctx.fillStyle='#ffc93a';ctx.beginPath();ctx.arc(c[0]+R*Math.cos(a1),c[1]+R*Math.sin(a1),lw*1.6,0,Math.PI*2);ctx.fill();
    ctx.textAlign='center';ctx.lineWidth=3.5;ctx.strokeStyle='rgba(8,10,14,.85)';const t=s.couple>0?'力偶：開始滾轉':'反向力偶：停止滾轉';
    ctx.strokeText(t,c[0],c[1]-R-8);ctx.fillStyle='#ffd766';ctx.fillText(t,c[0],c[1]-R-8);}
}
const COL3={mg:'#7fb0ff',N:'#4fd88a',S:'#c49bff',f:'#ffaa44',T:'#4fe3f5'};

import {createWell} from './well.js';
/** The walkable mela. All coordinates are world-space metres. */
export function createWorld(THREE, scene, partners=[]) {
  const root = new THREE.Group(); scene.add(root);
  const interactables = [], colliders = [], animations = [];
  const palettes = { red:0xce4251, pink:0xe77596, cream:0xffe4b4, gold:0xffb945, teal:0x219e96, blue:0x365da1, wood:0x573b30, dark:0x172526 };
  const mats = {};
  // Real generated photographic/painterly artwork enriches the physical stalls.
  // Each cropped texture shares one atlas image, while preserving independent UVs.
  const artworkTextures=[];
  const stallAtlas=typeof window!=='undefined'?new THREE.TextureLoader().load('/assets/mela-stall-atlas.webp',loaded=>{artworkTextures.forEach(texture=>{texture.image=loaded.image;texture.needsUpdate=true;});}):new THREE.Texture();
  stallAtlas.colorSpace=THREE.SRGBColorSpace;
  function stallArtwork(tile,section='back'){const texture=stallAtlas.clone(),left=tile%2*.5,bottom=tile<2?.5:0;texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.repeat.set(.498,section==='back'?.348:.147);texture.offset.set(left+.001,bottom+(section==='back'?.151:.001));texture.anisotropy=4;if(texture.image)texture.needsUpdate=true;artworkTextures.push(texture);return new THREE.MeshStandardMaterial({map:texture,color:0xffffff,roughness:.8,emissive:0xffb35e,emissiveMap:texture,emissiveIntensity:.52,side:THREE.DoubleSide});}
  const artworkMaterials=Array.from({length:4},(_,tile)=>({back:stallArtwork(tile),counter:stallArtwork(tile,'counter')}));
  const mat = (color, emissive = false) => { const key = `${color}-${emissive}`; return mats[key] ||= new THREE.MeshStandardMaterial({color, roughness:.83, flatShading:true, ...(emissive ? {emissive:color,emissiveIntensity:1.5}: {})}); };
  const geo = { box:new THREE.BoxGeometry(1,1,1), sphere:new THREE.SphereGeometry(1,8,6), cylinder:new THREE.CylinderGeometry(1,1,1,10), cone:new THREE.ConeGeometry(1,1,7) };
  geo.pennant=new THREE.BufferGeometry();geo.pennant.setAttribute('position',new THREE.Float32BufferAttribute([-.24,0,0,.24,0,0,0,-.55,0],3));geo.pennant.computeVertexNormals();
  function mesh(shape,color,x,y,z,sx=1,sy=sx,sz=sx,parent=root,glow=false) { const m=new THREE.Mesh(geo[shape],mat(color,glow)); m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  function box(c,x,y,z,sx,sy,sz,p=root){return mesh('box',c,x,y,z,sx,sy,sz,p);}
  function ball(c,x,y,z,r,p=root,glow=false){return mesh('sphere',c,x,y,z,r,r,r,p,glow);}
  function rod(a,b,color,r=.05,parent=root){let v=new THREE.Vector3().subVectors(b,a);const m=mesh('cylinder',color,0,0,0,r,v.length(),r,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
  function label(text,width=512,bg='#5b2229',fg='#ffe4a0') {const canvas=document.createElement('canvas');canvas.width=width;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,width,128);c.strokeStyle='#efb653';c.lineWidth=7;c.strokeRect(5,5,width-10,118);c.fillStyle=fg;c.font=`bold ${text.length>20?29:39}px Georgia, serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,width/2,66,width-24);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});}
  function sign(text,x,y,z,w,h=1,parent=root){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),label(text));m.position.set(x,y,z);parent.add(m);return m;}
  function interact(id,type,name,x,z,mesh,dialogue,radius=5.5) {interactables.push({id,type,name,x,z,radius,mesh,heading:Math.atan2(x-mesh.position.x,z-mesh.position.z),dialogue});}
  function bulb(x,y,z,color=0xffba58,parent=root){return ball(color,x,y,z,.095,parent,true);}
  function garland(a,b,n=24,depth=.8,parent=root){let prev=a.clone();for(let i=1;i<=n;i++){let t=i/n;let p=a.clone().lerp(b,t);p.y-=Math.sin(t*Math.PI)*depth;rod(prev,p,0x3d3021,.025,parent);if(i%2===0)bulb(p.x,p.y,p.z,i%4?0xffc15b:0xffe6a0,parent);prev=p;}}
  function pennants(a,b,n=15){for(let i=0;i<n;i++){let t=i/(n-1),p=a.clone().lerp(b,t);p.y-=Math.sin(t*Math.PI)*.5;const cloth=mat([0xe55352,0xf5b743,0x238d87,0xe97798][i%4]);cloth.side=THREE.DoubleSide;const m=new THREE.Mesh(geo.pennant,cloth);m.position.copy(p);root.add(m);}}
  // A procedural, repeatable dirt surface, with footpath dust and flecks.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#6b5643';ctx.fillRect(0,0,256,256);let seed=183;for(let i=0;i<6000;i++){seed=(seed*16807)%2147483647;let x=seed%256;seed=(seed*16807)%2147483647;let y=seed%256;ctx.fillStyle=i%2?'#79634d':'#594a3b';ctx.fillRect(x,y,i%4+1,1);}const dirt=new THREE.CanvasTexture(canvas);dirt.wrapS=dirt.wrapT=THREE.RepeatWrapping;dirt.repeat.set(28,38);dirt.colorSpace=THREE.SRGBColorSpace;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(125,145),new THREE.MeshStandardMaterial({map:dirt,roughness:1,color:0xb6a48b}));ground.rotation.x=-Math.PI/2;ground.position.z=-15;ground.receiveShadow=true;root.add(ground);
  const path=box(0x8e7558,0,.012,-13,15,.025,100);path.material=new THREE.MeshStandardMaterial({color:0x9d8264,roughness:1,transparent:true,opacity:.4});
  // The grand entrance sits behind the player and frames the whole street.
  const gate=new THREE.Group();gate.position.set(0,0,32);root.add(gate);
  [-9,9].forEach(x=>{box(0xd68546,x,4.4,0,2,8.8,2,gate);box(0xf5c579,x,1,0,2.6,2,2.6,gate);box(0xe6b265,x,8.6,0,2.8,.5,2.8,gate);mesh('cone',0xd69046,x,9.7,0,1.8,2,1.8,gate);ball(0xffcb63,x,10.8,0,.25,gate,true);for(let j=0;j<10;j++)ball(j%2?0xf8bc29:0xeb8020,x-.8+j*.18,8,1.08,.15,gate);});
  box(0x882b37,0,8,0,17,2.3,1.4,gate);sign('मेरा DUSSEHRA MELA',0,8.05, .76,14,1.7,gate);sign('मेरा DUSSEHRA MELA',0,8.05,-.76,14,1.7,gate).rotation.y=Math.PI;
  sign('Mela chaloge mere sath? ♥',0,5.8,.82,11,.95,gate);sign('Mela chaloge mere sath? ♥',0,5.8,-.82,11,.95,gate).rotation.y=Math.PI;
  for(let x=-7;x<=7;x+=.45){let y=6.8-Math.sin((x+7)/14*Math.PI)*1.5;ball(0xf49b24,x,y,.9,.19,gate);ball(0xe8791b,x,y-.3,.9,.15,gate);}
  // Rich layers of orange and yellow flowers, glittering festoons and lanterns.
  for(let layer=0;layer<3;layer++)for(let i=0;i<=68;i++){const x=-8+i*16/68,y=7.05-layer*.27-Math.abs(Math.sin((x+8)/16*Math.PI*3))*(.55+layer*.2);ball(i%3?0xffb927:0xee6420,x,y,1.05+layer*.09,.115,gate);}
  for(let x of [-8.9,8.9])for(let y=1.7;y<8.2;y+=.27){ball(y%1>.5?0xffbc32:0xf28a20,x-.55,y,1.18,.14,gate);ball(0xffd14b,x+.55,y,1.18,.12,gate);}
  for(let i=0;i<=30;i++){let x=-8+i*16/30;bulb(x,9.4-Math.abs(x)*.035,1.05,0xffcf65,gate);}for(let x of [-8.1,8.1])for(let y=1.2;y<8;y+=.5)bulb(x,y,1.2,0xffc458,gate);
  for(let y of [2.1,4.1,6.1,8.5])for(let x of [-9,9]){box(0xe8af49,x,y,1.3,.65,.95,.5,gate);box(0xffbd54,x,y,1.58,.44,.64,.03,gate).material=mat(0xffc56a,true);mesh('cone',0xc68436,x,y+.64,1.3,.5,.4,.4,gate);}
  for(let z of [29,35,40]){garland(new THREE.Vector3(-11,8.8,z),new THREE.Vector3(11,8.8,z),44,1.35);pennants(new THREE.Vector3(-11,8.1,z+.5),new THREE.Vector3(11,8.1,z+.5),27);}
  const gateWash=new THREE.PointLight(0xffa941,105,30,2);gateWash.position.set(0,6,36);root.add(gateWash);const entryWash=new THREE.PointLight(0xffbb68,65,21,2);entryWash.position.set(0,3,26);root.add(entryWash);
  for(let z=26;z>=-55;z-=13){[-9,9].forEach(x=>{mesh('cylinder',0x714932,x,3.9,z,.09,7.8,.09);box(0x352b23,x,7.8,z,.3,.15,.3);});garland(new THREE.Vector3(-9,7.5,z),new THREE.Vector3(9,7.5,z),30,1.2);if(z%2===0)pennants(new THREE.Vector3(-9,7,z+1),new THREE.Vector3(9,7,z+1));}
  // Low-poly people share simple geometry and face the pedestrian lanes.
  function person(x,z,color=0xe6ad55,scale=1,parent=root){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);box(color,0,1.05,0,.55,.85,.35,g);ball(0xb67d55,0,1.7,0,.25,g);ball(0x211b21,0,1.84,-.025,.23,g);[-1,1].forEach(s=>{const leg=box(0x303c49,s*.16,.37,0,.18,.72,.2,g);box(color,s*.37,1.05,0,.16,.7,.2,g);box(0x211e22,s*.16,.07,.08,.2,.13,.37,g);});return g;}
  function stall(name,x,z,color,type='food',id=name){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=x<0?Math.PI/2:-Math.PI/2;root.add(g);
    box(palettes.wood,0,.45,0,5,.9,3,g);box(color,0,1.05,1.23,5,1.1,.25,g);box(0x754633,0,1.55,.9,5.4,.2,1.2,g);box(0x553d32,0,2,-1.35,5,3.8,.22,g);
    [-2.4,2.4].forEach(s=>rod(new THREE.Vector3(s,0,1.25),new THREE.Vector3(s,4.3,1.25),0x9e7146,.07,g));
    for(let i=0;i<10;i++){const roof=box(i%2?0xffe5ba:color,-2.7+i*.6,4.15,0,.6,.15,3.8,g);roof.rotation.x=-.12;box(i%2?0xffe5ba:color,-2.7+i*.6,3.85,1.85,.6,.55,.1,g);bulb(-2.6+i*.58,3.48,1.55,0xffcc74,g);}
    sign(name,0,3,-1.18,4.5,.75,g);person(.45,-.3,0xf3d293,1,g);
    const tile=type==='toy'||type==='balloon'||type==='ring'?2:/JALEBI|KULFI|CANDY|POPCORN/.test(name)?1:/MOMO|CHOWMEIN/.test(name)?3:0;
    const backArt=new THREE.Mesh(new THREE.PlaneGeometry(4.95,2.7),artworkMaterials[tile].back);backArt.position.set(0,2.36,-1.205);g.add(backArt);
    const counterArt=new THREE.Mesh(new THREE.PlaneGeometry(4.96,1.12),artworkMaterials[tile].counter);counterArt.position.set(0,1.05,1.367);g.add(counterArt);
    // Bloom is baked into the artwork; small genuine golden bulbs sell its depth.
    for(let k=0;k<9;k++){const xx=-2.4+k*.6;ball(k%2?0xf5a620:0xffc645,xx,3.55-Math.sin(k/8*Math.PI)*.25,1.5,.105,g);}
    if(type==='food'){for(let i=-1;i<=1;i++){mesh('cylinder',0xa8a399,i*1.3,1.77,1.05,.48,.25,.48,g);ball([0xf3a53c,0x8bad45,0xe6c272][i+1],i*1.3,1.94,1.05,.38,g);}for(let i=0;i<4;i++)ball(0xefb057,-1.8+i*.3,1.95,.4,.15,g);}
    if(type==='toy'){for(let row=0;row<3;row++)for(let col=0;col<7;col++){ball([0xe66d85,0x72b4a3,0xf5c666][col%3],-1.9+col*.62,1.7+row*.5,-1,.18,g);box(0xf3c359,-1.9+col*.62,1.46+row*.5,-1,.26,.3,.2,g);}}
    if(type==='balloon'){for(let row=0;row<3;row++)for(let col=0;col<7;col++)mesh('sphere',[0xe74364,0x3eb1bd,0xf7ca46,0xac76d4][(row+col)%4],-1.9+col*.62,1.8+row*.56,-1,.23,.28,.21,g);}
    if(type==='ring'){for(let i=0;i<9;i++)mesh('cylinder',[0x4fb6b1,0xe4654e,0xe4b542][i%3],-1.7+i%3*1.3,1.9,Math.floor(i/3)*.42,.12,.65,.12,g);for(let i=0;i<4;i++){let r=new THREE.Mesh(new THREE.TorusGeometry(.29,.04,6,16),mat(0xffd471));r.rotation.x=-Math.PI/2;r.position.set(-1.5+i*.8,1.71,1.6);g.add(r);}}
    colliders.push({x,z,hx:2.05,hz:3.25});const ix=x+(x<0?4:-4);interact(id,type,name,ix,z,g,type==='food'?'Garma garam! ₹20 ka hai. Virtual treat, real mela memories.':'Aao ji, aao! Ek baar khel ke toh dekho.');return g;
  }
  const foods=[['SHARMA JI KI CHAAT',-14,18,0xc64e54],['GARAM JALEBI',14,18,0xda8c36],['GOLGAPPE',-14,7,0x248b83],['CHOWMEIN',14,7,0xc76049],['STEAMING MOMOS',-14,-5,0xd57a39],['MALAI KULFI',14,-5,0x765e9b],['GARAM POPCORN',-24,-18,0xc64a48],['CANDY FLOSS',23,-13,0xca658d]];
  foods.forEach((f,i)=>{
    const partner=partners[i];if(!partner){stall(...f,'food',`food-${i}`);return;}
    const colour={kesari:0xdc9239,gulabi:0xce5278,neela:0x318d99}[partner.theme];
    const group=stall(partner.name,f[1],f[2],colour,'partner',partner.id);
    const item=interactables.at(-1);Object.assign(item,{partner,dialogue:partner.greeting});
    sign(partner.plan==='featured'?'★ FEATURED BRAND ★':'✦ MELA PARTNER',0,4.85,1.8,5.6,.65,group);
    sign(partner.name,0,3.05,1.9,4.7,.7,group);
    for(const side of [-1,1]){rod(new THREE.Vector3(side*2.8,.15,1.8),new THREE.Vector3(side*2.8,4.55,1.8),0xe9c77a,.07,group);for(let y=.6;y<4.5;y+=.4)bulb(side*2.8,y,1.8,partner.plan==='featured'?0xffdc79:0x8ee4dc,group);}
    if(partner.plan==='featured')garland(new THREE.Vector3(-2.6,5.45,1.8),new THREE.Vector3(2.6,5.45,1.8),22,.4,group);
  });
  stall('KHILONE KI DUKAAN',-25,18,0x468d99,'toy','toy');stall('NISHANA LAGAO',25,18,0xbb495c,'balloon','balloon');stall('RING TOSS',25,6,0xe7a135,'ring','ring');
  // Wheel plane is XY: the rotor spins on Z, gondolas counter-rotate.
  const wheelGroup=new THREE.Group();wheelGroup.position.set(28,0,-29);root.add(wheelGroup);const wheelCenter=new THREE.Vector3(28,10,-29),radius=8.2;
  [-2.2,2.2].forEach(z=>{rod(new THREE.Vector3(-4,0,z),new THREE.Vector3(0,10,z),0xa14c43,.3,wheelGroup);rod(new THREE.Vector3(4,0,z),new THREE.Vector3(0,10,z),0xa14c43,.3,wheelGroup);});
  const rotor=new THREE.Group();rotor.position.y=10;wheelGroup.add(rotor);let gondolas=[];
  for(let side of [-.35,.35]){const rim=new THREE.Mesh(new THREE.TorusGeometry(radius,.11,6,64),mat(0xdba767));rim.position.z=side;rotor.add(rim);}
  for(let i=0;i<12;i++){let angle=i/12*Math.PI*2;let x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;rod(new THREE.Vector3(0,0,0),new THREE.Vector3(x,y,0),0xe1b46d,.055,rotor);for(let j=0;j<5;j++)bulb(Math.cos(angle+j/60*Math.PI*2)*radius,Math.sin(angle+j/60*Math.PI*2)*radius,.4,0xffc258,rotor);const gond=new THREE.Group();gond.position.set(x,y,0);rotor.add(gond);box([0xcb5f65,0x38a69b,0xe4ad40][i%3],0,-.65,0,1.35,.8,1.2,gond);box(0xffdb9a,0,.6,0,1.6,.14,1.4,gond);[-.58,.58].forEach(s=>rod(new THREE.Vector3(s,-.25,.5),new THREE.Vector3(s,.6,.5),0xd1ac75,.035,gond));gondolas.push(gond);}
  ball(0xf5c45c,0,10,.8,.65,wheelGroup,true);sign('CHAND TAK CHALOGE?',0,2,3.1,7,1,wheelGroup);colliders.push({x:28,z:-29,hx:4.7,hz:3});interact('wheel','ride','Chand wala jhoola',20,-25,wheelGroup,'Ek chakkar? Upar se poora mela dikhega!',5.5);
  animations.push((dt,t)=>{rotor.rotation.z=t*.09;gondolas.forEach(g=>g.rotation.z=-rotor.rotation.z);});
  // Ram Leela theatre: open front, carpet, curtain wings, actors and gold canopy.
  const stageGroup=new THREE.Group();stageGroup.position.set(-27,0,-43);stageGroup.rotation.y=.55;root.add(stageGroup);box(0x693e35,0,.65,0,14,1.3,9,stageGroup);box(0x9b3142,0,1.32,0,13,.05,8,stageGroup);box(0x57273e,0,5,-4,14,7.5,.4,stageGroup);[-6,6].forEach(s=>{box(0xac344b,s,4.8,-.5,1.5,7,7,stageGroup);rod(new THREE.Vector3(s,1.3,4),new THREE.Vector3(s,9,4),0xe4a34d,.13,stageGroup);});box(0xe4a34d,0,8.5,0,15,.6,10,stageGroup);sign('RAM LEELA • राम लीला',0,8.5,5.1,11,1,stageGroup);garland(new THREE.Vector3(-6,7.8,4.3),new THREE.Vector3(6,7.8,4.3),24,.6,stageGroup);const ram=person(-2,1,0xf9bc50,1.3,stageGroup);ram.position.y=1.35;const sita=person(1,1,0xe77068,1.25,stageGroup);sita.position.y=1.35;colliders.push({x:-27,z:-43,hx:8,hz:5});interact('ramleela','stage','Ram Leela ground',-18,-36,stageGroup,'Aaiye, Ram Leela shuru hone wali hai.',6);
  // A seated audience leaves an aisle down the middle of the Ram Leela ground.
  for(let row=0;row<3;row++)for(let col=0;col<8;col++){const x=-5.4+col*1.52+(col>3?.7:0),z=6.5+row*1.55;box(0x714845,x,.55,z,.74,.15,.77,stageGroup);box(0x714845,x,1,z+.36,.74,.9,.12,stageGroup);[-.27,.27].forEach(dx=>box(0x50382b,x+dx,.25,z,.09,.5,.65,stageGroup));if((row+col)%5!==0){const c=[0xb95168,0xe0a34e,0x458c8a,0x9e83ad,0xc5bd94][col%5];box(c,x,1,z,.48,.7,.3,stageGroup);ball(0xb7845f,x,1.59,z,.22,stageGroup);ball(0x2b2327,x,1.73,z+.02,.2,stageGroup);[-.14,.14].forEach(dx=>{box(0x394351,x+dx,.6,z-.28,.16,.17,.56,stageGroup);box(0x394351,x+dx,.31,z-.5,.16,.5,.16,stageGroup);});}}
  [-7.3,7.3].forEach(x=>{box(0x20252a,x,2.3,3,1.2,2.5,1.1,stageGroup);for(let y of [1.75,2.8])ball(0x414349,x,y,3.57,.4,stageGroup);rod(new THREE.Vector3(x,0,3),new THREE.Vector3(x,1.2,3),0x292b2c,.09,stageGroup);});
  // Small fairground generators and power leads, behind the food counters.
  for(let [x,z] of [[-19,9],[19,-4],[-29,-21]]){box(0x34524b,x,.8,z,2.1,1.4,1.2);box(0x253732,x,1.54,z,2.2,.12,1.3);box(0x111e21,x,.95,z+.63,1.2,.6,.05);for(let i=0;i<7;i++)box(0x8c9b86,x-.5+i*.16,.95,z+.68,.04,.5,.03);mesh('cylinder',0x373633,x+.7,1.9,z,.07,.75,.07);bulb(x-.8,1.1,z+.66,0x8bc879);}
  // Ten individually crowned, mustachioed Ravana heads.
  const ravana=new THREE.Group();ravana.position.set(2,0,-60);root.add(ravana);box(0x8a3045,0,1,0,11,2,8,ravana);box(0xb5393e,0,8,0,5.5,10,2.7,ravana);box(0xf0ac45,0,7.1,1.4,5.7,.65,.18,ravana);box(0x236c68,0,10.7,1.4,4.6,3,.15,ravana);[-1,1].forEach(s=>{box(0xad343a,s*1.6,2.9,0,1.5,4,1.8,ravana);box(0x3a2b2c,s*1.6,1.2,1,1.9,.8,3.4,ravana);const arm=box(0xc34b44,s*4.2,10.1,0,3.6,1.5,1.8,ravana);arm.rotation.z=s*.25;ball(0xdd9a55,s*6,10.6,0,.75,ravana);});
  for(let i=0;i<10;i++){const x=(i-4.5)*1.57,y=14.2-Math.abs(i-4.5)*.15;ball(0xd78d47,x,y,0,.91,ravana);box(0xf3ba4e,x,y+.87,0,1.5,.7,1.3,ravana);mesh('cone',0xffce58,x,y+1.65,0,.67,1.25,.67,ravana);ball(0xe74a54,x,y+2.3,0,.13,ravana,true);[-1,1].forEach(s=>{box(0xffe9bb,x+s*.28,y+.16,.79,.3,.16,.12,ravana);ball(0x211d23,x+s*.28,y+.16,.87,.06,ravana);const moust=box(0x241e24,x+s*.26,y-.34,.82,.55,.15,.12,ravana);moust.rotation.z=s*.21;});box(0xb73032,x,y+.48,.85,.1,.21,.08,ravana);}
  for(let y=5;y<12;y+=1.1)ball(0xffcc5d,0,y,1.55,.2,ravana,true);colliders.push({x:2,z:-60,hx:9,hz:4});interact('ravana','finale','Ravana Dahan',2,-51,ravana,'Burai par achchai ki jeet. Ready for the grand finale?',6);
  // Keep the roof still; only the deck and individually bobbing horses rotate.
  const carousel=new THREE.Group();carousel.position.set(-29,0,-8);root.add(carousel);
  mesh('cylinder',0xa24c50,0,.4,0,4.5,.8,4.5,carousel);mesh('cone',0xe1a154,0,5.5,0,5,2,5,carousel);mesh('cylinder',0xd9ae68,0,2.6,0,.3,5,.3,carousel);
  const carouselDeck=new THREE.Group();carousel.add(carouselDeck);const horses=[];
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.cos(a)*3.2,z=Math.sin(a)*3.2;
    rod(new THREE.Vector3(x,.6,z),new THREE.Vector3(x,5,z),0xe0b16b,.055,carouselDeck);
    const horse=new THREE.Group();horse.position.set(x,2,z);horse.rotation.y=Math.PI/2-a;carouselDeck.add(horse);horses.push(horse);
    const color=i%2?0xf0dfba:0xc57d58;box(color,0,0,0,1.35,.55,.48,horse);box(0x9e3550,0,.34,0,.65,.15,.56,horse);box(color,.53,.35,0,.27,.7,.3,horse);ball(color,.68,.66,0,.28,horse);box(color,.91,.59,0,.42,.23,.3,horse);
    for(const side of [-1,1]){box(color,-.42,-.48,side*.17,.16,.8,.14,horse);box(color,.42,-.43,side*.17,.16,.7,.14,horse);mesh('cone',color,.56,1.01,side*.13,.1,.3,.09,horse);}box(0x442c26,-.79,-.04,0,.35,.15,.12,horse);ball(0x211b24,.79,.74,.23,.045,horse);
    bulb(Math.cos(a)*4.6,4.5,Math.sin(a)*4.6,0xffc55a,carousel);
  }
  const carouselSeat=new THREE.Object3D(),carouselLook=new THREE.Object3D();carouselSeat.position.set(-.1,1.05,0);carouselLook.position.set(8,1.05,0);horses[0].add(carouselSeat,carouselLook);
  sign('GHODE WALA JHOOLA',0,6.8,0,7,.8,carousel);colliders.push({x:-29,z:-8,hx:5,hz:5});interact('carousel','ride','Ghode wala jhoola',-22,-8,carousel,'Ghode pe baitho! Bachpan ka ek aur chakkar?',5.5);
  animations.push((dt,t)=>{carouselDeck.rotation.y=t*.28;horses.forEach((horse,i)=>horse.position.y=2+Math.sin(t*2.1+i*Math.PI/4)*.28)});
  // A swinging pirate ship, with its camera attached to a bench in the hull.
  const shipFrame=new THREE.Group();shipFrame.position.set(32,0,-3);root.add(shipFrame);
  for(const z of [-2.1,2.1])for(const side of [-1,1])rod(new THREE.Vector3(side*4,0,z),new THREE.Vector3(0,8,z),0x27998f,.25,shipFrame);
  rod(new THREE.Vector3(0,8,-2.5),new THREE.Vector3(0,8,2.5),0xe3b66e,.22,shipFrame);
  const shipPivot=new THREE.Group();shipPivot.position.y=8;shipFrame.add(shipPivot);
  for(const z of [-1.35,1.35])for(const side of [-1,1])rod(new THREE.Vector3(0,0,z),new THREE.Vector3(side*3,-5,z),0xe6b35d,.09,shipPivot);
  box(0x733c32,0,-5.15,0,8,.75,2.8,shipPivot);box(0xb95743,0,-4.67,1.4,8,.65,.16,shipPivot);box(0xb95743,0,-4.67,-1.4,8,.65,.16,shipPivot);
  for(const side of [-1,1]){const prow=box(0xd8a356,side*4,-4.65,0,1.4,.5,2.8,shipPivot);prow.rotation.z=side*.45;ball(0xffcd67,side*4.65,-4.15,0,.18,shipPivot,true);}
  for(let x=-2.6;x<=2.6;x+=1.3){box(0xe3b76c,x,-4.58,0,.75,.2,2.4,shipPivot);rod(new THREE.Vector3(x,-4.4,-1.15),new THREE.Vector3(x,-4.4,1.15),0xe4c997,.045,shipPivot);}
  const shipSeat=new THREE.Object3D(),shipLook=new THREE.Object3D();shipSeat.position.set(.6,-3.5,.45);shipLook.position.set(-8,-3.5,.45);shipPivot.add(shipSeat,shipLook);
  sign('SAMUNDARI JHOOLA',0,9.35,0,8,.9,shipFrame);for(let x=-4;x<=4;x+=.5)bulb(x,8.9,0,0xffc45b,shipFrame);
  colliders.push({x:32,z:-3,hx:6,hz:3.3});interact('pirate-ship','ride','Samundari jhoola',23,-3,shipFrame,'Kashti taiyaar hai! Ek mazedaar aage-peechhe ka jhoola?',5.5);
  animations.push((dt,t)=>shipPivot.rotation.z=Math.sin(t*.85)*.62);
  const well=createWell(THREE,root,sign);colliders.push(well.collider);interact('well','well','Maut ka Kuan',-23,-27,well.root,'Dhol baje, bike ghoome! Gallery se show dekho ya virtual rider ban kar golden rings pakdo.',5.5);animations.push((dt,t)=>well.update(dt,t));
  // Photobooth is a frame, with an empty opening to step into.
  const photo=new THREE.Group();photo.position.set(10,0,-43);root.add(photo);[-2,2].forEach(s=>box(0xe5aa43,s,1.8,0,.3,3.6,.35,photo));box(0xe5aa43,0,3.5,0,4.3,.3,.35,photo);sign('MELA CHALOGE MERE SATH?',0,4.3,.1,5.5,.8,photo);for(let i=0;i<9;i++)bulb(-2+i*.5,3.5,.25,0xffd171,photo);interact('photo','photo','Mela memories',10,-39,photo,'Ek photo toh banti hai!',5);
  const fireworks=new THREE.Group();fireworks.position.set(23,0,-48);root.add(fireworks);box(0x583841,0,.5,0,7,1,4,fireworks);sign('ROSHNI KA JASHN',0,3.5,.2,7,1,fireworks);[-3,3].forEach(x=>{rod(new THREE.Vector3(x,0,0),new THREE.Vector3(x,4,0),0x967142,.07,fireworks);bulb(x,4,0,0xffaf52,fireworks);});sign('VIRTUAL FIREWORKS • LIGHT ONLY',0,1.7,2.1,6,.65,fireworks);colliders.push({x:23,z:-48,hx:4,hz:2.5});interact('fireworks','fireworks','Roshni ka jashn',23,-43,fireworks,'Sirf roshni, sirf khushi. A virtual sky full of colour.',5.5);
  // Lantern-lit seating at the edge, trees and village silhouettes beyond.
  for(let z=20;z>-49;z-=12){[-37,37].forEach((x,i)=>{box(0x603e2c,x,.65,z,3,.22,1.1);box(0x603e2c,x,.3,z,.18,.6,.9);mesh('cylinder',0x59422d,x+2,3,z,.07,6,.07);bulb(x+2,5.9,z);});}
  let rng=713;function random(){rng=(rng*16807)%2147483647;return rng/2147483647;}
  for(let i=0;i<58;i++){const side=i%2?-1:1,x=side*(43+random()*15),z=40-random()*118;mesh('cylinder',0x4f3c2c,x,2.5,z,.45,5,.45);for(let j=0;j<3;j++)mesh('sphere',[0x213d39,0x294a3f,0x1c3432][j],x+(random()-.5)*2,5+j*1.3,z,2.4,2.8,2.4);}
  for(let i=0;i<18;i++){const x=-60+i*7;box([0x293a40,0x324048,0x2a3540][i%3],x,2.5,-79,5+random()*3,5+random()*4,6);mesh('cone',0x3f3b43,x,6,-79,4,2,4);}
  const moon=ball(0xffedc1,-43,45,-75,3.6,root,true);moon.material=new THREE.MeshBasicMaterial({color:0xffedc1});
  const stars=new THREE.BufferGeometry(),starPositions=[];for(let i=0;i<260;i++)starPositions.push((random()-.5)*230,35+random()*60,-80+random()*140);stars.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));root.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xdde8dc,size:.13,transparent:true,opacity:.8})));
  [[0,7,20],[0,7,-8],[0,7,-36],[-27,6,-39],[28,9,-25],[2,12,-55]].forEach(([x,y,z])=>{let light=new THREE.PointLight(0xffae58,30,24,2);light.position.set(x,y,z);root.add(light);});
  // A transparent radial texture gives lanterns a soft halo without post effects.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const glowContext=glowCanvas.getContext('2d'),gradient=glowContext.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,223,156,0.9)');gradient.addColorStop(.13,'rgba(255,184,77,0.65)');gradient.addColorStop(.38,'rgba(255,150,47,0.2)');gradient.addColorStop(.72,'rgba(255,132,31,0.045)');gradient.addColorStop(1,'rgba(255,132,31,0)');glowContext.fillStyle=gradient;glowContext.fillRect(0,0,128,128);const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;
  const haloMaterial=new THREE.SpriteMaterial({map:glowTexture,color:0xffc37a,transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  function halo(x,y,z,size=1.5,parent=root){const sprite=new THREE.Sprite(haloMaterial);sprite.position.set(x,y,z);sprite.scale.set(size,size,1);parent.add(sprite);return sprite;}
  for(let z=26;z>=-39;z-=13)for(let x of [-6,0,6])halo(x,7.5-Math.sin((x+9)/18*Math.PI)*1.2,z,2.2);
  foods.forEach(f=>halo(f[1]+(f[1]<0?1.8:-1.8),3.5,f[2],2.5));
  [-6,0,6].forEach(x=>halo(x,6.2,32,2.6));halo(28,10,-28.4,3.8);halo(22,15.6,-28.4,2.8);halo(34,15.6,-28.4,2.8);
  for(let x of [-9,-5,0,5,9]){halo(x,8.1,32.9,2.4);halo(x,7.9,36,2.1);}halo(-9,4.1,33.6,2.3);halo(9,4.1,33.6,2.3);
  const floorGlowMaterial=new THREE.MeshBasicMaterial({map:glowTexture,color:0xffbe7a,transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});const floorGlowGeometry=new THREE.PlaneGeometry(10,10);
  for(let z of [18,7,-5,-18])for(let x of [-10,10]){const pool=new THREE.Mesh(floorGlowGeometry,floorGlowMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(x,.045,z);root.add(pool);}
  for(let [x,z] of [[-5,34],[5,34],[0,28]]){const pool=new THREE.Mesh(floorGlowGeometry,floorGlowMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(x,.048,z);pool.scale.setScalar(1.45);root.add(pool);}
  // Instanced crowd: six render calls, animated walking limbs, predictable paths.
  const count=68,dummy=new THREE.Object3D(),crowd=[];
  const body=new THREE.InstancedMesh(geo.box,mat(0xffffff),count),heads=new THREE.InstancedMesh(geo.sphere,mat(0xbe8a66),count),hair=new THREE.InstancedMesh(geo.sphere,mat(0x2c2527),count),legs=new THREE.InstancedMesh(geo.box,mat(0x394457),count*2),arms=new THREE.InstancedMesh(geo.box,mat(0xffffff),count*2);
  [body,heads,hair,legs,arms].forEach(m=>{m.castShadow=true;m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(m);});
  for(let i=0;i<count;i++){let x=(random()-.5)*11,z=-49+random()*76; if(i>46)x=(i%2?-1:1)*(18+random()*15);const color=new THREE.Color([0xe7a354,0xb85569,0x328f8a,0xd8c49b,0x7588ae,0xa57893][i%6]);body.setColorAt(i,color);arms.setColorAt(i*2,color);arms.setColorAt(i*2+1,color);crowd.push({x,z,scale:.72+random()*.33,speed:.32+random()*.35,phase:random()*Math.PI*2,dir:i%2?1:-1});}
  crowd.forEach(p=>p.laneX=p.x);
  const carriedBalloons=new THREE.InstancedMesh(geo.sphere,mat(0xffffff),8),balloonStrings=new THREE.InstancedMesh(geo.cylinder,mat(0xdacbb2),8);[carriedBalloons,balloonStrings].forEach(m=>{m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;root.add(m);});for(let i=0;i<8;i++)carriedBalloons.setColorAt(i,new THREE.Color([0xf35b86,0xf6c548,0x51c8bd,0xab83df][i%4]));
  function instance(m,index,x,y,z,sx,sy,sz,rx=0,ry=0){dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();m.setMatrixAt(index,dummy.matrix);}
  function updateCrowd(dt,t,player){crowd.forEach((p,i)=>{if(player&&Number.isFinite(player.x)){const dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz);if(d<1.6)p.x+=(dx>=0?1:-1)*dt*(1.6-d)*1.6;else p.x+=(p.laneX-p.x)*Math.min(dt*.35,1);}p.z+=dt*p.speed*p.dir;if(p.z>27)p.z=-49;if(p.z< -49)p.z=27;let s=p.scale,walk=Math.sin(t*4+p.phase)*.35;if(i<8){const bob=Math.sin(t*1.5+p.phase)*.08;instance(carriedBalloons,i,p.x+.4,2.7*s+bob,p.z,.22,.3,.22);instance(balloonStrings,i,p.x+.4,2.1*s+bob*.5,p.z,.009,1.05*s,.009);}instance(body,i,p.x,1.05*s,p.z,.5*s,.75*s,.32*s,0,p.dir<0?Math.PI:0);instance(heads,i,p.x,1.67*s,p.z,.23*s,.27*s,.23*s);instance(hair,i,p.x,1.82*s,p.z-.02,.235*s,.15*s,.235*s);for(let j=0;j<2;j++){let side=j?1:-1;instance(legs,i*2+j,p.x+side*.14*s,.38*s,p.z,.17*s,.72*s,.2*s,walk*side);instance(arms,i*2+j,p.x+side*.34*s,1.02*s,p.z,.15*s,.68*s,.18*s,-walk*side);}});[body,heads,hair,legs,arms,carriedBalloons,balloonStrings].forEach(m=>m.instanceMatrix.needsUpdate=true);}
  updateCrowd(0,0);
  // Food steam uses one transparent instanced draw call, never DOM or sprites.
  const steam=new THREE.InstancedMesh(geo.sphere,new THREE.MeshStandardMaterial({color:0xc9c7ba,transparent:true,opacity:.13,depthWrite:false,roughness:1}),foods.length*5);steam.frustumCulled=false;steam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(steam);
  animations.push((dt,t)=>{foods.forEach((food,f)=>{for(let j=0;j<5;j++){const phase=(t*.17+j*.2+f*.11)%1,size=.16+phase*.6;instance(steam,f*5+j,food[1]+Math.sin(t*.4+f)*phase*.6,4.1+phase*2.8,food[2]-.6+Math.sin(phase*4+f)*.25,size,size*1.45,size);}});steam.instanceMatrix.needsUpdate=true;});
  // Static geometry is grouped by shared geometry/material. Animation roots keep
  // their own batches, so a wheel ride and Ravana's finale still transform safely.
  root.updateMatrixWorld(true);
  const batchStats={sourceMeshes:0,batches:0};
  function batchScope(scope,excluded=[]){const buckets=new Map(),inverse=new THREE.Matrix4().copy(scope.matrixWorld).invert(),shared=new Set(Object.values(geo));scope.traverse(object=>{if(!object.isMesh||object.isInstancedMesh||!shared.has(object.geometry))return;let ancestor=object;while(ancestor&&ancestor!==scope){if(excluded.includes(ancestor))return;ancestor=ancestor.parent;}const key=object.geometry.uuid+object.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(object);});for(const objects of buckets.values()){if(objects.length<2)continue;const source=objects[0],batch=new THREE.InstancedMesh(source.geometry,source.material,objects.length),matrix=new THREE.Matrix4();batch.castShadow=true;batch.receiveShadow=true;objects.forEach((object,i)=>{matrix.multiplyMatrices(inverse,object.matrixWorld);batch.setMatrixAt(i,matrix);});batch.computeBoundingSphere();scope.add(batch);objects.forEach(object=>object.parent.remove(object));batchStats.sourceMeshes+=objects.length;batchStats.batches++;}}
  batchScope(root,[wheelGroup,carousel,shipFrame,ravana]);batchScope(wheelGroup,[rotor]);batchScope(rotor,gondolas);gondolas.forEach(g=>batchScope(g));batchScope(carousel,[carouselDeck]);batchScope(carouselDeck,horses);horses.forEach(h=>batchScope(h));batchScope(shipFrame,[shipPivot]);batchScope(shipPivot);batchScope(ravana);
  let estimatedDrawCalls=0;root.traverse(o=>{if(o.isMesh||o.isPoints||o.isSprite)estimatedDrawCalls++;});batchStats.estimatedDrawCalls=estimatedDrawCalls;root.userData.performance=batchStats;
  return {interactables,colliders,well,rides:{carousel:{seat:carouselSeat,look:carouselLook},'pirate-ship':{seat:shipSeat,look:shipLook}},wheel:{group:wheelGroup,rotor,center:wheelCenter,radius},ravana,spawn:{x:0,z:28},stage:{x:-27,z:-43},root,update(dt,time,player){animations.forEach(fn=>fn(dt,time,player));updateCrowd(dt,time,player);},dispose(){scene.remove(root);root.traverse(o=>{if(o.geometry && !Object.values(geo).includes(o.geometry))o.geometry.dispose();});Object.values(geo).forEach(g=>g.dispose());Object.values(mats).forEach(m=>m.dispose());}};
}

import {clamp} from './logic.js';
export const wellDuration=30;
const lanes=[2.2,4.2,3.1,4.8,2.6,4.5,3.2,2.1,4.7,3.5];
export const newWellRun=()=>({elapsed:0,angle:0,height:3,target:lanes[0],score:0,gates:0,combo:0,energy:100,done:false,message:'Follow the golden ring. Up/down to line up!'});
export function stepWellRun(run,dt,{vertical=0,boost=false}={}){
  if(run.done)return run;
  dt=clamp(Number(dt)||0,0,.05);const boosting=boost&&run.energy>0;
  run.elapsed=Math.min(wellDuration,run.elapsed+dt);run.height=clamp(run.height+clamp(vertical,-1,1)*dt*2.1,1.4,5.5);
  run.energy=clamp(run.energy+(boosting?-30:18)*dt,0,100);run.angle+=dt*(boosting?2.1:1.45);
  const passed=Math.min(10,Math.floor((run.elapsed+1e-7)/3));
  if(passed>run.gates){const hit=Math.abs(run.height-run.target)<1;run.combo=hit?run.combo+1:0;if(hit)run.score+=100+Math.min(4,run.combo-1)*20+(boosting?25:0);run.message=hit?`Ring cleared! ${run.combo>1?`${run.combo}× streak`:'Shabaash, rider!'}`:'Thoda upar/neeche. Agla ring tumhara hai!';run.gates=passed;run.target=lanes[passed%lanes.length];}
  run.done=run.elapsed>=wellDuration;return run;
}

export function createWell(THREE,parent,sign){
  const root=new THREE.Group();root.position.set(-33,0,-28);parent.add(root);
  const material=(color,glow=false)=>new THREE.MeshStandardMaterial({color,roughness:.75,...(glow?{emissive:color,emissiveIntensity:1.6,toneMapped:false}:{})});
  const wood=document.createElement('canvas');wood.width=512;wood.height=256;const c=wood.getContext('2d');c.fillStyle='#735136';c.fillRect(0,0,512,256);for(let i=0;i<48;i++){c.fillStyle=i%3?'#9d7850':'#5e402b';c.fillRect(i*11,0,9,256);c.fillStyle='#413024';for(let j=0;j<4;j++)c.fillRect(i*11+2,j*70+18,2,3);}
  const texture=new THREE.CanvasTexture(wood);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.repeat.x=4;
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(6.6,6.6,7,64,1,true),new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,roughness:.9}));wall.position.y=3.5;root.add(wall);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(6.6,6.6,.2,48),material(0x4b382b));root.add(floor);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(6.75,.38,6,64),material(0x9b6839));rim.rotation.x=Math.PI/2;rim.position.y=7.05;root.add(rim);
  const gold=material(0xffca68,true),railMaterial=material(0xdec18b),poleGeo=new THREE.CylinderGeometry(.045,.045,1.2,5),bulbGeo=new THREE.SphereGeometry(.12,6,5);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,x=Math.cos(a)*6.9,z=Math.sin(a)*6.9;const pole=new THREE.Mesh(poleGeo,railMaterial);pole.position.set(x,7.7,z);root.add(pole);const bulb=new THREE.Mesh(bulbGeo,gold);bulb.position.set(x,8.35,z);root.add(bulb);}
  const rail=new THREE.Mesh(new THREE.TorusGeometry(6.9,.055,5,64),railMaterial);rail.rotation.x=Math.PI/2;rail.position.y=8.2;root.add(rail);
  const band=new THREE.Mesh(new THREE.TorusGeometry(6.3,.085,6,64),gold);band.rotation.x=Math.PI/2;band.position.y=2.2;root.add(band);
  // The gallery crowd shares two draw calls, including their colourful clothes.
  const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(.34,.6,.28),material(0xffffff),20),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.17,6,5),material(0xc78f64),20),dummy=new THREE.Object3D();
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2,x=Math.cos(a)*6.95,z=Math.sin(a)*6.95;dummy.position.set(x,7.45,z);dummy.rotation.y=-a;dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color([0xe77a55,0x47b6ac,0xe6bc63,0xc477a4][i%4]));dummy.position.y=7.95;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);}root.add(bodies,heads);
  const stairsMaterial=material(0x755138);for(let i=0;i<9;i++){const stair=new THREE.Mesh(new THREE.BoxGeometry(1.5,(i+1)*.78,.75),stairsMaterial);stair.position.set(8.2,(i+1)*.39,5-i*.74);root.add(stair);}
  sign('MAUT KA KUAN',0,9.4,0,11,1.1,root);sign('WATCH THE SHOW · RIDE THE WALL',0,8.45,.1,8,.6,root);
  const entrySign=sign('MAUT KA KUAN →',8.2,3.7,1.1,6,.85,root);entrySign.rotation.y=Math.PI/2;
  function motorcycle(color){const group=new THREE.Group(),frame=material(color),dark=material(0x162129),metal=material(0xc2c8bd),skin=material(0xd49b70);
    const part=(geometry,mat,x,y,z)=>{const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);group.add(mesh);return mesh};
    for(const x of [-.64,.64]){const wheel=part(new THREE.TorusGeometry(.33,.105,6,12),dark,x,-.34,0);wheel.rotation.y=0;part(new THREE.CylinderGeometry(.13,.13,.18,6),metal,x,-.34,0).rotation.x=Math.PI/2;}
    part(new THREE.BoxGeometry(1,.22,.4),frame,0,.02,0);part(new THREE.BoxGeometry(.65,.14,.32),dark,-.25,.25,0);part(new THREE.BoxGeometry(.15,.8,.14),metal,.62,.05,0).rotation.z=-.3;part(new THREE.BoxGeometry(.15,.1,.8),metal,.68,.5,0);
    const torso=part(new THREE.BoxGeometry(.4,.65,.45),frame,-.13,.68,0);torso.rotation.z=-.25;part(new THREE.SphereGeometry(.27,8,6),frame,.02,1.18,0);part(new THREE.BoxGeometry(.25,.13,.4),dark,.23,1.18,0);for(const z of [-.25,.25]){part(new THREE.BoxGeometry(.55,.14,.13),skin,.25,.76,z).rotation.z=-.3;part(new THREE.BoxGeometry(.3,.6,.15),dark,-.33,.24,z).rotation.z=.4;}
    const headlight=part(new THREE.BoxGeometry(.12,.16,.3),gold,.78,.28,0);root.add(group);return group;
  }
  const bike=motorcycle(0xe95a4f),rival=motorcycle(0x39b4cb);let performance=null;
  function pose(group,angle,height){group.position.set(Math.cos(angle)*5.92,height,Math.sin(angle)*5.92);group.rotation.set(Math.PI/2,-angle-Math.PI/2,0,'YXZ');}
  const light=new THREE.PointLight(0xffd17d,55,22,2);light.position.set(0,7,0);root.add(light);
  return {root,bike,rival,band,x:-33,z:-28,collider:{x:-33,z:-28,hx:7.4,hz:7.4},setPerformance(value){performance=value},update(dt,time){pose(bike,performance?.angle??time*1.45,performance?.height??3.5+Math.sin(time*.65)*1.2);pose(rival,-time*1.2+Math.PI,2.4+Math.sin(time*.55)*.6);band.position.y=performance?.target??3.3+Math.sin(time*.6);},camera(angle,height,chase=false){if(!chase)return {position:new THREE.Vector3(-23,13.8,-18),target:new THREE.Vector3(-33,2.8,-28)};return {position:new THREE.Vector3(-33+Math.cos(angle-.6)*3.1,height+2.1,-28+Math.sin(angle-.6)*3.1),target:new THREE.Vector3(-33+Math.cos(angle+.4)*5.8,height,-28+Math.sin(angle+.4)*5.8)};}};
}

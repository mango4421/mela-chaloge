const PALETTE = [[1,.62,.12],[1,.22,.49],[.17,.83,1],[.28,1,.52],[1,.84,.36],[.69,.4,1]];

/** A fixed particle pool: rockets, shell trails and anaar share one additive draw call. */
export class FestivalFireworks {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;
    this.capacity = 3000;
    this.cursor = 0;
    this.disposed = false;
    this.time = 0;
    this.nextLaunch = .1;
    this.launchSide = 1;
    this.reducedMotion = false;
    const n = this.capacity;
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.sizes = new Float32Array(n);
    this.alphas = new Float32Array(n);
    this.velocity = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.gravity = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.seeds = new Float32Array(n);
    this.kinds = new Uint8Array(n);
    this.trailClock = new Float32Array(n);
    this.geometry = new THREE.BufferGeometry();
    for (const [name, array, size] of [
      ['position', this.positions, 3], ['aColor', this.colors, 3],
      ['aSize', this.sizes, 1], ['aAlpha', this.alphas, 1]
    ]) {
      const attribute = new THREE.BufferAttribute(array, size);
      if (attribute.setUsage) attribute.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute(name, attribute);
    }
    this.material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {pixelRatio: {value: Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 1.5)}},
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
        uniform float pixelRatio; varying vec3 vColor; varying float vAlpha;
        void main(){vColor=aColor;vAlpha=aAlpha;vec4 view=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*view;gl_PointSize=clamp(aSize*pixelRatio*270./max(1.,-view.z),1.,76.);}`,
      fragmentShader: `varying vec3 vColor; varying float vAlpha;
        void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||vAlpha<.002)discard;
        float glow=exp(-r*r*5.5)*.48;float core=pow(max(0.,1.-r*2.8),2.);
        gl_FragColor=vec4(vColor*1.8+vec3(core*.7),(glow+core)*vAlpha);}`
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
    this.fountains = [
      {x: -10, z: 26, phase: 0}, {x: 10, z: 26, phase: 1.8},
      {x: -18, z: -20, phase: 3.2}, {x: 18, z: -20, phase: 4.7}
    ];
    this.fountainClock = [0,0,0,0];
    this.rockets = Array.from({length: 10}, () => ({active: false, x: 0,y: 0,z: 0,vx: 0,vy: 0,vz: 0,target: 0,trail: 0,color: 0,power: 1}));
    this.lights = [new THREE.PointLight(0xffaa44,0,13,2),new THREE.PointLight(0xffbb66,0,13,2)];
    this.lights.forEach((light,i) => {light.position.set(this.fountains[i].x,1.2,this.fountains[i].z);scene.add(light);});
  }

  particle(x,y,z,vx,vy,vz,color,life,size,gravity=2.2,kind=0,drag=.12) {
    const i = this.cursor;
    this.cursor = (i + 1) % this.capacity;
    const p = i * 3;
    this.positions[p]=x;this.positions[p+1]=y;this.positions[p+2]=z;
    this.velocity[p]=vx;this.velocity[p+1]=vy;this.velocity[p+2]=vz;
    this.colors[p]=color[0];this.colors[p+1]=color[1];this.colors[p+2]=color[2];
    this.life[i]=life;this.maxLife[i]=life;this.sizes[i]=size;
    this.gravity[i]=gravity;this.kinds[i]=kind;this.drag[i]=drag;
    this.alphas[i]=1;this.seeds[i]=Math.random()*6.28;this.trailClock[i]=0;
  }

  launch(x,z,power=1) {
    const rocket = this.rockets.find(item => !item.active);
    if (!rocket) return;
    Object.assign(rocket,{active:true,x,y:.7,z,vx:(Math.random()-.5)*1.2,vy:22+Math.random()*4,vz:-1.5-Math.random()*2,target:18+Math.random()*15,trail:0,color:Math.floor(Math.random()*PALETTE.length),power});
  }

  shell(x,y,z,power=1,colorIndex=0) {
    const color = PALETTE[colorIndex % PALETTE.length];
    const count = Math.min(170,Math.round(88*power));
    const speed = 5.8+Math.random()*2.8;
    // Evenly distributed rays read as a full shell rather than a random puff.
    const goldenAngle = Math.PI*(3-Math.sqrt(5));
    for(let i=0;i<count;i++) {
      const up=1-2*(i+.5)/count, radius=Math.sqrt(1-up*up), angle=i*goldenAngle;
      const velocity=speed*(.8+Math.random()*.3);
      this.particle(x,y,z,Math.cos(angle)*radius*velocity,up*velocity,Math.sin(angle)*radius*velocity,
        i%7===0?PALETTE[4]:color,2.3+Math.random()*1.8,1.2+Math.random()*.6,1.5,1,.22);
    }
    for(let i=0;i<15;i++) this.particle(x,y,z,(Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2,PALETTE[4],.3+Math.random()*.3,2.5,1,0,.2);
  }

  burst(position, intensity=1) {
    if(this.disposed) return;
    const x=Number.isFinite(position?.x)?position.x:(Math.random()>.5?1:-1)*16;
    const z=Number.isFinite(position?.z)?position.z:-12;
    const power=Math.max(.4,Math.min(2,intensity));
    if(this.reducedMotion) {
      for(let i=0;i<12;i++)this.particle(x+(Math.random()-.5)*4,3+Math.random()*3,z,0,.15,0,PALETTE[4],3,1.1,0);
    } else this.launch(x,z,power);
  }

  update(dt,time,player,{finale=false,reducedMotion=false}={}) {
    if(this.disposed) return;
    dt=Math.max(0,Math.min(Number(dt)||0,.065));
    this.time=Number.isFinite(time)?time:this.time+dt;
    if(reducedMotion && !this.reducedMotion) {
      this.life.fill(0);this.alphas.fill(0);this.rockets.forEach(rocket=>rocket.active=false);
    }
    this.reducedMotion=reducedMotion;
    const now=this.time;
    if(!reducedMotion && now>=this.nextLaunch) {
      this.launchSide*=-1;
      this.launch(this.launchSide*(14+Math.random()*9),this.launchSide>0?-18:5,finale?1.65:1.1);
      this.nextLaunch=now+(finale?.55:1.35)+Math.random()*.65;
    }
    for(let f=0;f<this.fountains.length;f++) {
      const source=this.fountains[f];
      const cycle=(now+source.phase)%7.5;
      const active=cycle<5.6;
      const strength=active?Math.min(1,cycle/.5,(5.6-cycle)/.8):0;
      const interval=reducedMotion?.3:.022;
      this.fountainClock[f]+=dt;
      let emitted=0;
      while(active && this.fountainClock[f]>=interval && emitted<5) {
        this.fountainClock[f]-=interval;emitted++;
        const spread=reducedMotion?.18:1.6;
        this.particle(source.x,.2+Math.random()*.25,source.z,(Math.random()-.5)*spread,
          reducedMotion?.25:4+Math.random()*5*strength,(Math.random()-.5)*spread,
          Math.random()>.2?PALETTE[4]:PALETTE[0],reducedMotion?2.8:.75+Math.random()*.8,
          reducedMotion?1:1+Math.random()*.5,reducedMotion?0:5.2,0,.1);
      }
      if(!active)this.fountainClock[f]=0;
      if(f<2)this.lights[f].intensity=reducedMotion?.8:strength*(5.5+Math.sin(now*7+f)*.8);
    }
    for(const rocket of this.rockets) {
      if(!rocket.active)continue;
      rocket.x+=rocket.vx*dt;rocket.y+=rocket.vy*dt;rocket.z+=rocket.vz*dt;
      rocket.vy-=6*dt;rocket.trail+=dt;
      while(rocket.trail>=.018) {
        rocket.trail-=.018;
        this.particle(rocket.x,rocket.y,rocket.z,(Math.random()-.5)*.5,-1.4-Math.random(),(Math.random()-.5)*.5,PALETTE[4],.65+Math.random()*.3,1.2,1,0,.5);
      }
      // A small bright head keeps the rising rocket distinct from its wake.
      this.particle(rocket.x,rocket.y,rocket.z,0,0,0,PALETTE[4],.055,3.1,0);
      if(rocket.y>=rocket.target||rocket.vy<=0) {
        rocket.active=false;this.shell(rocket.x,rocket.y,rocket.z,rocket.power,rocket.color);
      }
    }
    for(let i=0;i<this.capacity;i++) {
      if(this.life[i]<=0)continue;
      this.life[i]-=dt;
      if(this.life[i]<=0){this.alphas[i]=0;continue;}
      const p=i*3,drag=Math.exp(-this.drag[i]*dt);
      this.velocity[p]*=drag;this.velocity[p+2]*=drag;this.velocity[p+1]-=this.gravity[i]*dt;
      this.positions[p]+=this.velocity[p]*dt;this.positions[p+1]+=this.velocity[p+1]*dt;this.positions[p+2]+=this.velocity[p+2]*dt;
      const age=1-this.life[i]/this.maxLife[i];
      // Slow shimmer only; no hard strobe or full-screen exposure changes.
      this.alphas[i]=Math.min(1,this.life[i]*2.4)*(1-age*.4)*(reducedMotion? .65:.82+Math.sin(now*5+this.seeds[i])*.18);
      if(this.positions[p+1]<.08){this.life[i]=0;this.alphas[i]=0;continue;}
      if(this.kinds[i]===1 && age<.72) {
        this.trailClock[i]+=dt;
        if(this.trailClock[i]>.11) {
          this.trailClock[i]=0;
          // Copy scalar color components before writing into the circular pool.
          const next=this.cursor,q=next*3;
          const r=this.colors[p],g=this.colors[p+1],b=this.colors[p+2];
          this.positions[q]=this.positions[p];this.positions[q+1]=this.positions[p+1];this.positions[q+2]=this.positions[p+2];
          this.velocity[q]=this.velocity[p]*.1;this.velocity[q+1]=-.2;this.velocity[q+2]=this.velocity[p+2]*.1;
          this.colors[q]=r;this.colors[q+1]=g;this.colors[q+2]=b;
          this.life[next]=.55;this.maxLife[next]=.55;this.sizes[next]=.85;this.gravity[next]=.8;this.drag[next]=.2;this.kinds[next]=0;this.alphas[next]=.7;this.seeds[next]=this.seeds[i];this.trailClock[next]=0;
          this.cursor=(next+1)%this.capacity;
        }
      }
    }
    for(const name of ['position','aColor','aSize','aAlpha'])this.geometry.attributes[name].needsUpdate=true;
  }

  dispose() {
    if(this.disposed)return;
    this.disposed=true;
    this.scene.remove(this.points);
    this.lights.forEach(light=>{this.scene.remove(light);light.dispose?.();});
    this.geometry.dispose();this.material.dispose();
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FestivalFireworks} from './fireworks.js';
test('Roshni rockets launch in front of the show area, with two local fountains',()=>{
  const scene=new THREE.Scene(),fireworks=new FestivalFireworks(THREE,scene);fireworks.update(.05,.2,{x:23,z:-43},{show:true});
  const rocket=fireworks.rockets.find(item=>item.active);assert.ok(rocket);assert.ok(rocket.x>10&&rocket.x<36);assert.ok(rocket.z< -60);assert.equal(fireworks.fountains.filter(item=>item.z===-46).length,2);
  fireworks.shell(23,17,-64,1.8,2);assert.ok(fireworks.life.some(value=>value>0));assert.ok(fireworks.alphas.some(value=>value>0));fireworks.dispose();assert.equal(scene.children.length,0);
});
test('reduced-motion fireworks stop rockets and keep the fixed particle pool finite',()=>{
  const fireworks=new FestivalFireworks(THREE,new THREE.Scene());fireworks.launch(23,-64);fireworks.update(.05,1,{x:23,z:-43},{show:true,reducedMotion:true});assert.equal(fireworks.rockets.some(item=>item.active),false);
  for(let i=0;i<60;i++)fireworks.update(.05,1+i*.05,{x:23,z:-43},{show:true,reducedMotion:true});assert.ok(fireworks.positions.every(Number.isFinite));assert.equal(fireworks.positions.length,fireworks.capacity*3);fireworks.dispose();
});

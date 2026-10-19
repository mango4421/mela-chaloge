import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MelaEngine} from './engine.js';

test('Dahan moves through countdown, arrow, burning, celebration and a clean finish',()=>{
  const e=Object.create(MelaEngine.prototype),phases=[],volleys=[];
  let completed=0;
  Object.assign(e,{elapsed:0,scene:new THREE.Scene(),world:{ravana:new THREE.Group()},camera:new THREE.PerspectiveCamera(),stats:{items:[],food:[]},audio:{speak(){},effect(){}},fireworks:{burst:(p)=>volleys.push(p)},events:{onCinematic:c=>phases.push(c?.phase),onFinale:()=>completed++},burst(){},updateFire(){},skyFirework(){},reducedMotion:true});
  e.startFinale();
  for(const t of [0,5,8,22,29]){e.elapsed=t;e.updateFinale(.016)}
  assert.deepEqual(phases,['countdown','arrow','burn','celebrate',undefined]);
  assert.equal(completed,1);assert.equal(e.stats.finale,true);assert.equal(e.mode,'walk');
  assert.equal(e.world.ravana.visible,false);assert.equal(e.arrow,null);assert.equal(e.ram,null);
  assert.ok(volleys.length>=4);assert.ok(volleys.every(p=>p.z===-54||Number.isFinite(p.z)));
});

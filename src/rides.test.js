import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {seatedRidePose,rideDuration} from './rides.js';
import {MelaEngine} from './engine.js';
test('carousel camera follows the actual rotating and bobbing horse seat',()=>{
  const root=new THREE.Group(),deck=new THREE.Group(),horse=new THREE.Group(),seat=new THREE.Object3D(),look=new THREE.Object3D();
  root.position.set(-29,0,-8);root.add(deck);deck.add(horse);horse.position.set(3.2,2,0);horse.add(seat,look);seat.position.set(0,1.1,0);look.position.set(8,1.1,0);
  const before=seatedRidePose(THREE,{seat,look});deck.rotation.y=Math.PI/2;horse.position.y=2.3;
  const after=seatedRidePose(THREE,{seat,look});
  assert.ok(before.position.distanceTo(after.position)>4);assert.ok(Math.abs(after.position.y-3.4)<1e-6);
  assert.ok(Math.abs(after.position.distanceTo(after.target)-8)<1e-6);
});
test('pirate ship seat follows its outward and return swing',()=>{
  assert.equal(rideDuration('pirate-ship'),20);assert.equal(rideDuration('carousel'),16);assert.equal(rideDuration('wheel'),22);
  const pivot=new THREE.Group(),seat=new THREE.Object3D(),look=new THREE.Object3D();pivot.position.y=8;seat.position.set(0,-4,0);look.position.set(6,-4,0);pivot.add(seat,look);
  const rest=seatedRidePose(THREE,{seat,look});pivot.rotation.z=.6;const swing=seatedRidePose(THREE,{seat,look});assert.ok(swing.position.y>rest.position.y);assert.ok(swing.position.x>2);
});
test('all rides finish once, record the correct ride and return to walking',()=>{
  for(const id of ['carousel','pirate-ship','wheel']){
    const engine=Object.create(MelaEngine.prototype),seat=new THREE.Object3D(),look=new THREE.Object3D();look.position.z=-10;
    let finished=0,progress=0;
    Object.assign(engine,{elapsed:100,stats:{ride:false,items:[],food:[]},keys:new Set(['w']),move:{x:1,y:1},audio:{effect(){}},camera:new THREE.PerspectiveCamera(),world:{rides:{carousel:{seat,look},'pirate-ship':{seat,look}},wheel:{center:new THREE.Vector3(28,10,-29),radius:8.2}},events:{onRideProgress:p=>progress=p,onStats:()=>finished++},leaveActivity(){this.mode='walk'}});
    engine.ride({id});assert.equal(engine.keys.size,0);assert.deepEqual(engine.move,{x:0,y:0});
    engine.elapsed+=rideDuration(id);engine.updateRide();assert.equal(engine.mode,'walk');assert.equal(progress,100);assert.equal(finished,1);assert.equal(id==='wheel'?engine.stats.ride:engine.stats[id],true);
  }
});

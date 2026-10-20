import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newWellRun,stepWellRun} from './well.js';
import {MelaEngine} from './engine.js';
test('well bike height and boost remain bounded under sustained controls',()=>{
  const run=newWellRun();for(let i=0;i<200;i++)stepWellRun(run,.05,{vertical:1,boost:true});assert.equal(run.height,5.5);assert.ok(run.energy>=0&&run.energy<=100);
  for(let i=0;i<200;i++)stepWellRun(run,.05,{vertical:-1});assert.equal(run.height,1.4);assert.ok(run.energy<=100);
});
test('well awards each easy ring once, ends at 30 seconds and freezes its score',()=>{
  const run=newWellRun();let frames=0;while(!run.done&&frames++<700){run.height=run.target;stepWellRun(run,.05)}assert.equal(run.gates,10);assert.ok(run.score>=1000);assert.equal(run.elapsed,30);
  const score=run.score;stepWellRun(run,50,{boost:true});assert.equal(run.score,score);assert.equal(run.gates,10);
});
test('spectator mode does not score, and exiting clears the bike controls',()=>{
  const engine=Object.create(MelaEngine.prototype);let performance=null,updates=[];
  Object.assign(engine,{elapsed:3,keys:new Set(['w']),move:{x:1,y:1},camera:new THREE.PerspectiveCamera(),world:{well:{setPerformance:value=>performance=value,camera:()=>({position:new THREE.Vector3(-23,14,-18),target:new THREE.Vector3(-33,3,-28)})}},audio:{effect(){}},events:{onMode(){},onGame:value=>updates.push(value)},renderer:{domElement:{focus(){}}},cleanupGame(){}});
  engine.startWell(false);engine.updateWell(.05);assert.equal(engine.wellRun.score,0);assert.equal(performance,null);assert.ok(updates.at(-1).spectator);
  engine.startWell(true);engine.updateWell(.05);assert.ok(performance);engine.wellControl=1;engine.wellBoost=true;engine.leaveActivity();assert.equal(engine.mode,'walk');assert.equal(engine.wellControl,0);assert.equal(engine.wellBoost,false);assert.equal(performance,null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {MelaEngine} from './engine.js';
test('a local preview visit starts next to its chosen store without publishing or charging',()=>{
  const engine=Object.create(MelaEngine.prototype),modes=[];
  Object.assign(engine,{elapsed:1,world:{interactables:[{id:'demo',type:'partner',x:-10,z:18,mesh:{position:{x:-14}}}]},audio:{start:async()=>{}},events:{onMode:mode=>modes.push(mode)},renderer:{domElement:{focus(){}}}});
  engine.enter('demo');assert.equal(engine.mode,'walk');assert.deepEqual(engine.player,{x:-8,z:18});assert.equal(engine.yaw,Math.PI/2);assert.equal(modes.at(-1),'walk');
  engine.enter('missing');assert.equal(engine.mode,'entering');
});

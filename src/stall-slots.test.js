import test from 'node:test';
import assert from 'node:assert/strict';
import {slotAvailable,reserveSlot,slotCollection,slotHoldMs} from '../server/stall-slots.js';
test('location holds reject a different active owner, expire and isolate test payments',async()=>{
  const now=1000;assert.equal(slotAvailable({stallId:'a',expiresAt:2000},'b',now),false);assert.equal(slotAvailable({stallId:'a',expiresAt:2000},'a',now),true);assert.equal(slotAvailable({stallId:'a',expiresAt:999},'b',now),true);assert.notEqual(slotCollection('test'),slotCollection('live'));
  const db={collection:()=>({doc:id=>({id})})};
  await assert.rejects(()=>reserveSlot(db,{get:async()=>({data:()=>({stallId:'other',expiresAt:2000})})},'live',{slotId:'entrance-west'},'mine',now),/just reserved/);
  const held=await reserveSlot(db,{get:async()=>({data:()=>undefined})},'live',{slotId:'entrance-west'},'mine',now);assert.equal(held.value.expiresAt,now+slotHoldMs);assert.equal(held.value.stallId,'mine');
});

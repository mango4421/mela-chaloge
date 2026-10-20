import test from 'node:test';
import assert from 'node:assert/strict';
import {publicDemo} from './public-demo.js';
import {selectStalls} from './stalls.js';
import {randomUUID} from 'node:crypto';
import {supportLink} from '../public/support.js';
import {funnelInput,once} from '../server/funnel.js';

test('browser funnel excludes payment claims and deduplicates by session and IST day',()=>{
  const session=randomUUID(),time=Date.parse('2026-10-20T18:29:00Z');
  assert.equal(funnelInput({event:'form_opened',session},time).id,funnelInput({event:'form_opened',session},time+1000).id);
  assert.notEqual(funnelInput({event:'form_opened',session},time).id,funnelInput({event:'form_opened',session},time+120000).id);
  assert.throws(()=>funnelInput({event:'paid',session}));assert.throws(()=>funnelInput({event:'form_opened',session:'email@example.com'}));
});
test('duplicate tracking is ignored but database failures propagate',async()=>{
  await once({create:async()=>{throw {code:6}}},{});
  await assert.rejects(()=>once({create:async()=>{throw Error('offline')}},{}),/offline/);
});

test('same-phone support preserves the original QR recipient and restricts amounts',()=>{
  const link=new URL(supportLink(21));assert.equal(link.protocol,'upi:');assert.equal(link.hostname,'pay');assert.ok(link.searchParams.get('pa'));assert.equal(link.searchParams.get('am'),'21');assert.equal(link.searchParams.get('cu'),'INR');
  assert.equal(new URL(supportLink(51)).searchParams.get('pa'),link.searchParams.get('pa'));for(const amount of [0,1,151,'21',21.5])assert.throws(()=>supportLink(amount));
});

test('public 3D demo passes the real stall renderer validation',()=>{assert.equal(selectStalls([publicDemo])[0]?.id,publicDemo.id)});

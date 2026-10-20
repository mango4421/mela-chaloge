import test from 'node:test';
import assert from 'node:assert/strict';
import {publicDemo} from './public-demo.js';
import {selectStalls} from './stalls.js';
import {randomUUID} from 'node:crypto';
import {supportInput,assertSupportPayment} from '../server/support-payments.js';
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

test('public 3D demo passes the real stall renderer validation',()=>{assert.equal(selectStalls([publicDemo])[0]?.id,publicDemo.id)});

test('support checkout validates exact amounts and captured unrefunded provider payments',()=>{
 const id=randomUUID();for(const amount of [0,1,15100,'2100'])assert.throws(()=>supportInput({id,amount}));assert.equal(supportInput({id,amount:2100}).amount,2100);
 const order={id:'order_1',amount:2100,currency:'INR',notes:{mela_support_id:id}},payment={order_id:'order_1',amount:2100,currency:'INR',status:'captured',amount_refunded:0};assertSupportPayment(order,payment);
 for(const patch of [{amount:5100},{order_id:'other'},{currency:'USD'},{status:'authorized'},{amount_refunded:1}])assert.throws(()=>assertSupportPayment(order,{...payment,...patch}));assert.throws(()=>assertSupportPayment({...order,notes:{}},payment));
});

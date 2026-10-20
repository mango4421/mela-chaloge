import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validSignature,assertCaptured,orderInput,publicationUpdate,liveListing} from '../server/stall-payments.js';
import {emptyStall} from './stalls.js';
test('payment signatures must authenticate the stored order and exact payment',()=>{
  const signature=createHmac('sha256','test-secret').update('order_123|pay_456').digest('hex');
  assert.ok(validSignature('order_123|pay_456',signature,'test-secret'));
  assert.equal(validSignature('order_other|pay_456',signature,'test-secret'),false);
  assert.equal(validSignature('order_123|pay_456','fake','test-secret'),false);
});
test('unpaid, wrong-currency, wrong-order, underpaid and refunded payments cannot publish',()=>{
  const good={order_id:'order_123',amount:20000,currency:'INR',status:'captured',amount_refunded:0};
  assert.doesNotThrow(()=>assertCaptured(good,'order_123','basic'));
  for(const change of [{amount:1},{currency:'USD'},{order_id:'order_other'},{status:'authorized'},{status:'failed'},{amount_refunded:20000}])assert.throws(()=>assertCaptured({...good,...change},'order_123','basic'));
  assert.throws(()=>assertCaptured(good,'order_123','featured'));
});
test('checkout session validates draft and never accepts caller supplied paid flags',()=>{
  const clean=orderInput({id:'29b2c71c-0f30-4ef2-b659-ad717bc18ca1',token:'d975b84f-ea41-4d8e-8d15-62f0ba64b932',stall:{...emptyStall,name:'Sample',instagram:'@sample',paid:true},accepted:true});
  assert.equal(clean.stall.paid,undefined);assert.equal(clean.tokenHash.length,64);
  assert.throws(()=>orderInput({...clean,token:'bad',accepted:true}));
});
test('publication expires after seven days and duplicate callbacks never extend it',()=>{
  const now=1800000000000,data={orderId:'order_123',stall:{plan:'basic'}},payment={id:'pay_456',order_id:'order_123',amount:20000,currency:'INR',status:'captured',amount_refunded:0};
  const first=publicationUpdate(data,payment,now),again=publicationUpdate({...data,...first},payment,now+3600000);
  assert.equal(first.expiresAt,now+7*86400000);assert.deepEqual(again,first);
  assert.equal(liveListing(first,first.expiresAt-1),true);assert.equal(liveListing(first,first.expiresAt),false);
  assert.equal(publicationUpdate({...data,...first,suppressed:true},payment,now+1000),null);
  assert.equal(liveListing({...first,suppressed:true},now),false);
});

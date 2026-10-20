import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStall,validateStall,publicLink,stallPlans,selectStalls} from './stalls.js';
const draft={...emptyStall,name:'Meera’s Shop',instagram:'@meeras.shop'};
test('stall pricing is fixed in paise and client supplied amounts are discarded',()=>{
  assert.equal(stallPlans.basic.amount,20000);assert.equal(stallPlans.featured.amount,50000);
  const result=validateStall({...draft,amount:1,paid:true,approved:true});
  assert.equal(result.instagram,'https://www.instagram.com/meeras.shop/');assert.equal(result.paid,undefined);assert.equal(result.amount,undefined);
});
test('unsafe links, markup, unsupported plans and oversized dialogue are rejected',()=>{
  for(const link of ['javascript:alert(1)','http://shop.com','https://user:pass@shop.com','https://127.0.0.1','https://localhost/a','https://test.local'])assert.throws(()=>publicLink(link));
  assert.throws(()=>validateStall({...draft,plan:'free'}));assert.throws(()=>validateStall({...draft,greeting:'<script>alert(1)</script>'}));assert.throws(()=>validateStall({...draft,answer:'x'.repeat(241)}));
  assert.throws(()=>validateStall({...draft,instagram:'',productUrl:''}));
  assert.throws(()=>validateStall({...draft,instagram:'https://fakeinstagram.com/meera'}));
});
test('stall dialogue supports Hindi and links stay plain public HTTPS',()=>{
  const result=validateStall({...draft,greeting:'आइए जी! हमारी दुकान में आपका स्वागत है।',productUrl:'https://shop.example.com/p?id=20'});
  assert.ok(result.greeting.includes('आइए'));assert.equal(result.productUrl,'https://shop.example.com/p?id=20');
});
test('paid booth selection highlights featured stalls and always includes direct-link owner',()=>{
  const rows=Array.from({length:12},(_,i)=>({...draft,id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,plan:i<8?'featured':'basic'}));
  const picked=selectStalls(rows,rows[11].id,()=>.5);
  assert.equal(picked.length,8);assert.equal(picked[0].id,rows[11].id);assert.ok(picked.slice(1,5).every(item=>item.plan==='featured'));assert.ok(picked.some(item=>item.plan==='basic'));
  assert.equal(selectStalls([{...draft,productUrl:'javascript:alert(1)',id:rows[0].id}]).length,0);
});

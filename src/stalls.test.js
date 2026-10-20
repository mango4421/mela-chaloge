import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStall,validateStall,publicLink,stallPlans,selectStalls,stallSlots,backdropImage,contactLinks} from './stalls.js';
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
  const rows=Array.from({length:12},(_,i)=>({...draft,slotId:stallSlots[i%8].id,id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,plan:i<8?'featured':'basic'}));
  const picked=selectStalls(rows,rows[11].id,()=>.5);
  assert.equal(picked.length,8);assert.equal(picked[0].id,rows[11].id);assert.ok(picked.slice(1,5).every(item=>item.plan==='featured'));assert.ok(picked.some(item=>item.plan==='basic'));
  assert.equal(selectStalls([{...draft,productUrl:'javascript:alert(1)',id:rows[0].id}]).length,0);
});

test('custom backdrops and contacts are validated and old drafts remain supported',()=>{
  const stall=validateStall({...draft,backdrop:'https://images.example.com/banner.jpg',whatsapp:'+91 98765 43210',email:'hello@example.com',contactUrl:'https://example.com/contact',slotId:'wheel-east'});
  assert.equal(stall.whatsapp,'919876543210');assert.equal(contactLinks(stall).length,4);assert.equal(stall.slotId,'wheel-east');
  assert.ok(contactLinks(stall).some(link=>link.href==='mailto:hello@example.com'));
  for(const backdrop of ['javascript:alert(1)','data:image/svg+xml,<svg/>','x'.repeat(200001)])assert.throws(()=>backdropImage(backdrop));
  assert.throws(()=>validateStall({...draft,email:'hi@example.com\r\nBcc:bad@example.com'}));
  assert.throws(()=>validateStall({...draft,whatsapp:'javascript:alert(1)'}));assert.throws(()=>validateStall({...draft,slotId:'middle-of-road'}));
  assert.equal(validateStall({...draft,instagram:'',email:'hello@example.com'}).email,'hello@example.com');
});
test('store locations are distinct and duplicate claims never render overlapping stores',()=>{
  const rows=stallSlots.map((slot,i)=>({...draft,id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,slotId:slot.id}));
  const selected=selectStalls([...rows,{...rows[0],id:'00000000-0000-4000-8000-999999999999'}]);assert.equal(selected.length,8);assert.equal(new Set(selected.map(s=>s.slotId)).size,8);
  for(const a of stallSlots)for(const b of stallSlots)if(a!==b)assert.ok(Math.abs(a.x-b.x)>6.5||Math.abs(a.z-b.z)>6.5);
});

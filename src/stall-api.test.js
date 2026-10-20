import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../api/stalls.js';
import {GET as adminGET,POST as adminPOST} from '../api/admin.js';
test('unconfigured checkout fails closed and never advertises active payments',async()=>{
  const prior=process.env.ENABLE_STALL_CHECKOUT;delete process.env.ENABLE_STALL_CHECKOUT;
  try{
    const response=await GET(new Request('https://melachaloge.online/api/stalls?action=config'));
    assert.equal((await response.json()).enabled,false);
    const pay=await POST(new Request('https://melachaloge.online/api/stalls?action=order',{method:'POST',headers:{Origin:'https://melachaloge.online','Content-Type':'application/json'},body:'{}'}));
    assert.equal(pay.status,503);
    const bypass=await POST(new Request('https://melachaloge.online/api/stalls?action=preview',{method:'POST',headers:{Origin:'https://melachaloge.online'},body:'{}'}));assert.equal(bypass.status,503);
    const foreign=await POST(new Request('https://melachaloge.online/api/stalls?action=order',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}));
    assert.equal(foreign.status,403);
  }finally{if(prior!==undefined)process.env.ENABLE_STALL_CHECKOUT=prior;}
});
test('admin store access and removal require authentication and same-origin requests',async()=>{
  const list=await adminGET(new Request('https://melachaloge.online/api/admin?action=list'));
  assert.equal(list.status,401);
  const remove=await adminPOST(new Request('https://melachaloge.online/api/admin?action=remove',{method:'POST',headers:{Origin:'https://attacker.example'},body:'{}'}));
  assert.equal(remove.status,403);
});

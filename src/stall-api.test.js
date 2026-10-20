import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../api/stalls.js';
test('unconfigured checkout fails closed and never advertises active payments',async()=>{
  const prior=process.env.ENABLE_STALL_CHECKOUT;delete process.env.ENABLE_STALL_CHECKOUT;
  try{
    const response=await GET(new Request('https://melachaloge.online/api/stalls?action=config'));
    assert.equal((await response.json()).enabled,false);
    const pay=await POST(new Request('https://melachaloge.online/api/stalls?action=order',{method:'POST',headers:{Origin:'https://melachaloge.online','Content-Type':'application/json'},body:'{}'}));
    assert.equal(pay.status,503);
    const foreign=await POST(new Request('https://melachaloge.online/api/stalls?action=order',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}));
    assert.equal(foreign.status,403);
  }finally{if(prior!==undefined)process.env.ENABLE_STALL_CHECKOUT=prior;}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {orderState,recoverOrder} from '../server/order-recovery.js';
const request={amount:15100,currency:'INR',receipt:'saved-stall',notes:{mela_stall_id:'saved-stall'}};
test('old failed orders retry, active work waits, and saved orders are reused',()=>{
  assert.equal(orderState({status:'creating'},100),'retry');assert.equal(orderState({orderLeaseUntil:200},100),'busy');assert.equal(orderState({orderLeaseUntil:99},100),'retry');assert.equal(orderState({orderId:'order_1'},100),'existing');
});
test('retry reconciles a provider order instead of creating a second checkout',async()=>{
  let creates=0;const found={...request,id:'order_recovered'};const client={orders:{all:async()=>({items:[found]}),create:async()=>{creates++;return {id:'new'}}}};
  assert.equal((await recoverOrder(client,request)).id,'order_recovered');assert.equal(creates,0);
  client.orders.all=async()=>({items:[]});assert.equal((await recoverOrder(client,request)).id,'new');assert.equal(creates,1);
  client.orders.all=async()=>({items:[{...found,amount:1}]});await assert.rejects(()=>recoverOrder(client,request),/does not match/);assert.equal(creates,1);
  client.orders.all=async()=>{throw {statusCode:401}};await assert.rejects(()=>recoverOrder(client,request),error=>error.statusCode===401);assert.equal(creates,1);
});

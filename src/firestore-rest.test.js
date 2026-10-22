import test from 'node:test';
import assert from 'node:assert/strict';
import {createRestDatabase,encodeValue,decodeValue} from '../server/firestore-rest.js';

test('Firestore REST preserves exact amounts, nested stall data and TTL dates',()=>{
  const value={amount:15100,expiresAt:1793000000000,logo:null,enabled:true,stall:{name:'दिवाली',tags:['one',2.5]},ttl:new Date('2026-10-22T00:00:00Z')};
  assert.deepEqual(decodeValue(encodeValue(value)),value);
  for(const bad of [undefined,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>encodeValue(bad));
  assert.throws(()=>decodeValue({integerValue:'9007199254740993'}));
});

function fixture(responder){
  const calls=[];
  const db=createRestDatabase('migration-test',async()=>'private-token',async(url,options)=>{
    const body=options.body?JSON.parse(options.body):undefined;calls.push({url,options,body});
    assert.equal(new URL(url).hostname,'firestore.googleapis.com');assert.equal(options.headers.Authorization,'Bearer private-token');
    return responder({url,options,body,calls});
  });
  return {db,calls};
}
const json=(value,status=200)=>Response.json(value,{status});
const document=(name,data)=>({name,fields:encodeValue(data).mapValue.fields});

test('Firestore writes enforce create/update preconditions and retain field masks',async()=>{
  const {db,calls}=fixture(()=>json({writeResults:[]}));const ref=db.collection('mela_stall_tests').doc('draft');
  await ref.create({amount:15100});await ref.update({status:'published'});await ref.set({count:1});
  assert.deepEqual(calls[0].body.writes[0].currentDocument,{exists:false});
  assert.deepEqual(calls[1].body.writes[0].currentDocument,{exists:true});
  assert.deepEqual(calls[1].body.writes[0].updateMask,{fieldPaths:['status']});
  assert.equal(calls[2].body.writes[0].currentDocument,undefined);
});

test('Firestore queries and aggregate counts use server-side filters, ordering and limits',async()=>{
  const {db,calls}=fixture(({url})=>url.endsWith(':runAggregationQuery')?json([{result:{aggregateFields:{count:{integerValue:'3'}}}}]):json([{document:document('projects/migration-test/databases/(default)/documents/mela_stalls/one',{expiresAt:200})}]));
  const query=db.collection('mela_stalls').where('expiresAt','>',100).orderBy('createdAt','desc').limit(100);
  const rows=await query.get();assert.equal(rows.docs[0].id,'one');assert.deepEqual(rows.docs[0].data(),{expiresAt:200});
  assert.equal(calls[0].body.structuredQuery.where.fieldFilter.op,'GREATER_THAN');assert.equal(calls[0].body.structuredQuery.limit,100);
  assert.equal(calls[0].body.structuredQuery.orderBy[0].direction,'DESCENDING');
  assert.equal((await query.count().get()).data().count,3);
});

test('Firestore missing documents and duplicate creates retain SDK-compatible behavior',async()=>{
  const {db}=fixture(({options})=>options.method==='GET'?json({error:{status:'NOT_FOUND'}},404):json({error:{status:'ALREADY_EXISTS'}},409));
  const ref=db.collection('mela_stall_tests').doc('missing');const row=await ref.get();assert.equal(row.exists,false);assert.equal(row.data(),undefined);
  await assert.rejects(ref.create({count:1}),error=>error.code===6);
});

test('Firestore aborted transactions rerun all reads and only commit writes with a transaction token',async()=>{
  let starts=0,commits=0,callbacks=0;
  const {db,calls}=fixture(({url,body})=>{
    if(url.endsWith(':beginTransaction'))return json({transaction:'token-'+ ++starts});
    if(url.endsWith(':batchGet'))return json([{found:document(body.documents[0],{count:starts})}]);
    if(url.endsWith(':commit')){commits++;return commits===1?json({error:{status:'ABORTED'}},409):json({writeResults:[]});}
    return json({});
  });
  const ref=db.collection('mela_slot_tests').doc('slot');
  const result=await db.runTransaction(async tx=>{callbacks++;const row=await tx.get(ref);tx.update(ref,{count:row.data().count+1});return row.data().count;});
  assert.equal(result,2);assert.equal(callbacks,2);assert.equal(commits,2);
  assert.equal(calls.filter(call=>call.url.endsWith(':rollback')).length,1);
  for(const call of calls.filter(call=>call.url.endsWith(':commit')))assert.ok(call.body.transaction);
  assert.deepEqual(calls.filter(call=>call.url.endsWith(':beginTransaction'))[1].body.options.readWrite,{retryTransaction:'token-1'});
});

test('Firestore rolls back application failures and never retries an ambiguous commit failure',async()=>{
  let commits=0;
  const {db,calls}=fixture(({url})=>{
    if(url.endsWith(':beginTransaction'))return json({transaction:'transaction'});
    if(url.endsWith(':commit')){commits++;throw Error('Network disconnected');}
    return json({});
  });
  await assert.rejects(db.runTransaction(async()=>{throw Error('Slot already held');}),/Slot already held/);
  assert.equal(commits,0);
  await assert.rejects(db.runTransaction(async tx=>{tx.create(db.collection('mela_slot_tests').doc('slot'),{count:1});}),/Network disconnected/);
  assert.equal(commits,1);assert.equal(calls.filter(call=>call.url.endsWith(':rollback')).length,2);
});

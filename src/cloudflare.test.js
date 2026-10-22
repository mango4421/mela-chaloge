import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudflareApi} from '../server/cloudflare.js';

test('Cloudflare preserves response bodies, trusts its own IP, and rejects unknown routes and methods',async()=>{
  let ip;
  const routes={'/api/stalls':{GET:request=>{ip=request.headers.get('x-vercel-forwarded-for');return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})}}};
  const call=(path,options={})=>cloudflareApi({request:new Request('https://mela.pages.dev'+path,options)},routes,null);
  const response=await call('/api/stalls',{headers:{'cf-connecting-ip':'203.0.113.1','x-vercel-forwarded-for':'spoof'}});
  assert.deepEqual(await response.json(),{ok:true});assert.equal(ip,'203.0.113.1');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal((await call('/api/unknown')).status,404);
  const denied=await call('/api/stalls',{method:'DELETE'});assert.equal(denied.status,405);assert.equal(denied.headers.get('allow'),'GET');
});

test('Cloudflare caches only healthy public listings, canonicalizes query keys, and excludes private traffic',async()=>{
  let calls=0;const entries=new Map(),tasks=[];
  const cache={match:async key=>entries.get(key.url)?.clone(),put:async(key,value)=>entries.set(key.url,value)};
  let result={stalls:[]};
  const routes={'/api/stalls':{GET:()=>{calls++;return Response.json(result,{headers:{'Cache-Control':'public, max-age=15, s-maxage=30'}})},POST:()=>Response.json({paid:false},{headers:{'Cache-Control':'no-store'}})}};
  const call=async(path,options={})=>{const response=await cloudflareApi({request:new Request('https://mela.pages.dev'+path,options),waitUntil:task=>tasks.push(task)},routes,cache);await Promise.all(tasks);return response};
  await call('/api/stalls?action=list&utm_source=one');await call('/api/stalls?utm_source=two&action=list');assert.equal(calls,1);assert.equal(entries.size,1);
  await call('/api/stalls?action=list',{headers:{cookie:'mela_admin=private'}});assert.equal(calls,2);
  await call('/api/stalls?action=list&preview=anything');assert.equal(calls,3);
  entries.clear();result={stalls:[],unavailable:true};await call('/api/stalls?action=list');assert.equal(entries.size,0);
  result={error:'Database unavailable'};await call('/api/stalls?action=config');assert.equal(entries.size,0);
  await call('/api/stalls?action=order',{method:'POST',body:'{}'});assert.equal(entries.size,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyticsSample} from './analytics-sample.js';
import {publicRead} from '../server/public-cache.js';
import {HindiVoicePlayer} from './speech.js';
import {media} from './media.js';
test('analytics sampling is sticky, exactly follows the approved threshold, and handles blocked storage',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(analyticsSample(storage,()=>.099),true);assert.equal(analyticsSample(storage,()=>.99),true);
  values.clear();assert.equal(analyticsSample(storage,()=>.1),false);assert.equal(analyticsSample(storage,()=>0),false);
  assert.equal(analyticsSample({getItem(){throw Error('blocked')}},()=>.5),false);
});
test('concurrent public reads share one query, expire promptly, and back off on errors',async()=>{
  let reads=0;const load=async()=>++reads;
  assert.deepEqual(await Promise.all([publicRead('test-one',load,30,0),publicRead('test-one',load,30,0)]),[1,1]);
  assert.equal(await publicRead('test-one',load,30,29),1);assert.equal(await publicRead('test-one',load,30,31),2);
  let failures=0;const fail=()=>{failures++;throw Error('quota')};await assert.rejects(publicRead('test-error',fail,30,0),/quota/);await assert.rejects(publicRead('test-error',fail,30,1),/quota/);assert.equal(failures,1);await assert.rejects(publicRead('test-error',fail,30,31),/quota/);assert.equal(failures,2);
});
test('voices make no initial network requests and download only a requested clip',async()=>{
  const priorAudio=globalThis.Audio,priorFetch=globalThis.fetch;let fetches=0,plays=0;
  globalThis.Audio=class{preload='';src='';pause(){}load(){}removeAttribute(){this.src=''}play(){plays++;return Promise.resolve()}};
  globalThis.fetch=async()=>{fetches++;return {ok:true,json:async()=>({clips:{hello:{audio:'/hello.mp3'}}})}};
  try{const player=new HindiVoicePlayer();assert.equal(fetches,0);assert.equal(player.audio.preload,'none');await player.speak('hello');assert.equal(fetches,1);assert.equal(player.audio.src,'/hello.mp3');await player.speak('hello');assert.equal(fetches,1);assert.equal(plays,2);player.dispose();await player.speak('hello');assert.equal(plays,2);}finally{globalThis.Audio=priorAudio;globalThis.fetch=priorFetch;}
});
test('every optimized image and voice is versioned and deployed',()=>{
  for(const file of Object.values(media))assert.ok(fs.existsSync('public'+file));
  const voices=JSON.parse(fs.readFileSync('public'+media.voices));assert.equal(Object.keys(voices.clips).length,27);
  for(const clip of Object.values(voices.clips)){assert.match(clip.audio,/voice-[a-f0-9]{12}\.mp3$/);assert.ok(fs.statSync('public'+clip.audio).size>1000)}
  assert.ok(fs.statSync('public'+media.panorama).size<200000);assert.ok(fs.statSync('public'+media.supportQR).size<100000);
  const headers=JSON.parse(fs.readFileSync('vercel.json')).headers;assert.ok(headers.some(rule=>rule.source==='/assets/optimized/:path*'&&rule.headers.some(header=>header.value.includes('immutable'))));
});

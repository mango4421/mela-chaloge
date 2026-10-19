import test from 'node:test';
import assert from 'node:assert/strict';
import {tracks} from './bhajans.js';
test('bhajan playlist includes five distinct playable YouTube selections',()=>{
  assert.ok(tracks.length>=5);
  assert.equal(new Set(tracks.map(t=>t.id)).size,tracks.length);
  assert.ok(tracks.every(t=>/^[\w-]{11}$/.test(t.id)&&t.name&&t.artist));
});

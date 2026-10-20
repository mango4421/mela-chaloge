import test from 'node:test';
import assert from 'node:assert/strict';
import {adminPasswordValid,adminSession,adminSessionValid} from '../server/admin.js';
test('admin requires a strong server secret and signed unexpired sessions',()=>{
  const secret='test-only-admin-secret-with-32-plus-characters',now=1800000000000;
  assert.ok(adminPasswordValid(secret,secret));assert.equal(adminPasswordValid('wrong',secret),false);assert.equal(adminPasswordValid('short','short'),false);
  const session=adminSession(secret,now);assert.ok(adminSessionValid(session,secret,now+100));assert.equal(adminSessionValid(session,'different-server-secret',now+100),false);assert.equal(adminSessionValid(session,secret,now+9*3600000),false);assert.equal(adminSessionValid(session.slice(0,-1)+'x',secret,now+100),false);
});

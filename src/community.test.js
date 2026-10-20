import test from 'node:test';
import assert from 'node:assert/strict';
import {stallEmail,stallMailto} from './community.js';
test('stall enquiry uses the approved email and a readable prefilled draft',()=>{
  const link=new URL(stallMailto);
  assert.equal(link.protocol,'mailto:');assert.equal(link.pathname,stallEmail);
  assert.equal(stallEmail,'checkfacecard@gmail.com');
  assert.ok(link.searchParams.get('subject').includes('stall'));
  assert.ok(link.searchParams.get('body').includes('Brand / shop name:\n'));
});

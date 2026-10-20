import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {stallPlans,stallDurationMs,validateStall} from '../src/stalls.js';

export const digest=value=>createHash('sha256').update(value).digest('hex');
export function validSignature(message,signature,secret){
  if(!secret||typeof signature!=='string'||! /^[a-f0-9]{64}$/i.test(signature))return false;
  return timingSafeEqual(Buffer.from(createHmac('sha256',secret).update(message).digest('hex'),'hex'),Buffer.from(signature,'hex'));
}
export function assertCaptured(payment,orderId,plan){
  if(payment.order_id!==orderId||payment.currency!=='INR'||payment.amount!==stallPlans[plan]?.amount||payment.status!=='captured'||payment.amount_refunded!==0)throw Error('Payment is not a captured, unrefunded payment for this stall.');
}
export function publicationUpdate(current,payment,now=Date.now()){
  assertCaptured(payment,current.orderId,current.stall.plan);
  if(current.suppressed)return null;
  if(current.paymentId&&current.paymentId!==payment.id)throw Error('This stall already has a different payment.');
  const publishedAt=current.publishedAt||now;
  return {status:'published',paymentId:payment.id,publishedAt,expiresAt:current.expiresAt||publishedAt+stallDurationMs};
}
export const liveListing=(data,now=Date.now())=>data.status==='published'&&!data.suppressed&&data.expiresAt>now;
export function orderInput(input){
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  if(!uuid.test(input?.id)||!uuid.test(input?.token))throw Error('Invalid checkout session.');
  if(input.accepted!==true)throw Error('Please confirm the placement terms.');
  const stall=validateStall(input.stall);
  if(input.amount!==undefined&&(!Number.isInteger(input.amount)||input.amount<100||input.amount!==stallPlans[stall.plan].amount))throw Error('Amount must match the selected plan and be at least 100 paise.');
  if(input.currency!==undefined&&input.currency!=='INR')throw Error('Only INR is supported.');
  return {id:input.id,tokenHash:digest(input.token),stall};
}

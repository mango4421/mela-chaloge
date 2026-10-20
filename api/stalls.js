import {stallDatabase} from '../server/firebase.js';
import {digest,validSignature,assertCaptured,orderInput,publicationUpdate,liveListing} from '../server/stall-payments.js';
import {stallPlans,stallTerms,stallSlots} from '../src/stalls.js';

import {razorpayClient,paymentMode,paymentCollection,providerStatus,providerMessage,stallCapture} from '../server/razorpay.js';
import {orderState,orderLeaseMs,recoverOrder} from '../server/order-recovery.js';
import {slotCollection,slotAvailable,reserveSlot} from '../server/stall-slots.js';
function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
function ready(){return process.env.ENABLE_STALL_CHECKOUT==='true'&&Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON&&process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&(paymentMode()==='test'||process.env.RAZORPAY_WEBHOOK_SECRET))}
async function publish(db,ref,data,payment){
  assertCaptured(payment,data.orderId,data.stall.plan);
  return db.runTransaction(async tx=>{
    const block=await tx.get(db.collection('mela_payment_blocks').doc(payment.id));
    const current=(await tx.get(ref)).data(),update=publicationUpdate(current,payment);
    if(block.exists||!update)return false;
    const slotRef=current.stall.slotId?db.collection(slotCollection(paymentMode())).doc(current.stall.slotId):null;
    const slot=slotRef?(await tx.get(slotRef)).data():null;
    if(slotRef&&slot?.stallId!==ref.id){tx.update(ref,{status:'placement_review',paymentId:payment.id,placementError:'Location reservation expired; owner review required.'});return false;}
    if(paymentMode()==='test'){tx.update(ref,{status:'test_verified',testMode:true,paymentId:payment.id,verifiedAt:current.verifiedAt||Date.now()});if(slotRef)tx.set(slotRef,{stallId:ref.id,expiresAt:0});return true;}
    if(slotRef)tx.set(slotRef,{stallId:ref.id,expiresAt:update.expiresAt});tx.update(ref,update);return true;
  });
}
async function webhook(request,raw){
  if(!validSignature(raw,request.headers.get('x-razorpay-signature'),process.env.RAZORPAY_WEBHOOK_SECRET))return json({error:'Invalid signature.'},401);
  const event=JSON.parse(raw),db=stallDatabase();
  if(['order.paid','payment.captured'].includes(event.event)){
    const entity=event.payload?.payment?.entity;if(!/^pay_[a-zA-Z0-9]+$/.test(entity?.id||''))return json({received:true});
    const payment=await razorpayClient().payments.fetch(entity.id),order=await razorpayClient().orders.fetch(payment.order_id),id=order.notes?.mela_stall_id;
    if(!/^[a-f0-9-]{36}$/.test(id||''))return json({received:true});
    const ref=db.collection(paymentCollection()).doc(id),data=(await ref.get()).data();if(!data)return json({error:'Stall record not ready.'},503);
    if(data.orderId!==order.id)return json({error:'Order mismatch.'},409);
    if(payment.amount_refunded>0)return json({received:true});
    await publish(db,ref,data,payment);
  }else if(['refund.processed','payment.dispute.created','payment.dispute.lost'].includes(event.event)){
    const paymentId=event.payload?.refund?.entity?.payment_id||event.payload?.dispute?.entity?.payment_id;
    if(/^pay_[a-zA-Z0-9]+$/.test(paymentId||'')){await db.collection('mela_payment_blocks').doc(paymentId).set({reason:event.event,createdAt:Date.now()});const found=await db.collection(paymentCollection()).where('paymentId','==',paymentId).get();for(const row of found.docs)await db.runTransaction(async tx=>{const current=(await tx.get(row.ref)).data();const slotRef=current.stall.slotId?db.collection(slotCollection(paymentMode())).doc(current.stall.slotId):null;const slot=slotRef?(await tx.get(slotRef)).data():null;if(slot?.stallId===row.id)tx.set(slotRef,{stallId:row.id,expiresAt:0});tx.update(row.ref,{status:'removed',suppressed:true});});}
  }
  return json({received:true});
}
export async function GET(request){
  const action=new URL(request.url).searchParams.get('action');
  if(action==='config'){
    let availableSlots=[];
    if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON){try{const rows=await stallDatabase().collection(slotCollection(paymentMode())).get(),taken=new Map(rows.docs.map(row=>[row.id,row.data()]));availableSlots=stallSlots.filter(slot=>slotAvailable(taken.get(slot.id),'')).map(slot=>slot.id);}catch{return json({enabled:false,mode:paymentMode(),terms:stallTerms,plans:stallPlans,availableSlots:[],error:'Location availability is temporarily unavailable.'},503)}}
    return json({enabled:ready(),mode:paymentMode(),terms:stallTerms,plans:stallPlans,availableSlots});
  }
  if(action!=='list')return json({error:'Not found.'},404);
  if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)return json({stalls:[]});
  try{const snapshot=await stallDatabase().collection('mela_stalls').where('status','==','published').get();return json({stalls:snapshot.docs.filter(row=>liveListing(row.data())).map(row=>({id:row.id,...row.data().stall,expiresAt:row.data().expiresAt})).sort((a,b)=>(b.plan==='featured')-(a.plan==='featured')||a.name.localeCompare(b.name))});}catch{return json({error:'Stalls could not be loaded.'},503)}
}
export async function POST(request){
  const action=new URL(request.url).searchParams.get('action');
  if(Number(request.headers.get('content-length')||0)>230000)return json({error:'Request too large.'},413);
  const raw=await request.text();if(Buffer.byteLength(raw)>230000)return json({error:'Request too large.'},413);
  if(action==='webhook'){
    if(!process.env.RAZORPAY_WEBHOOK_SECRET||!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)return json({error:'Webhook is not configured.'},503);
    try{return await webhook(request,raw)}catch{return json({error:'Webhook processing failed. Please retry.'},503)}
  }
  const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  if(!ready())return json({error:'Checkout is not open yet. Your draft is saved; no payment has been taken.'},503);
  let input;try{input=JSON.parse(raw)}catch{return json({error:'Invalid request.'},400)}
  const db=stallDatabase();
  if(action==='order'){
    let clean;try{clean=orderInput(input)}catch(error){return json({error:error.message},400)}
    const ref=db.collection(paymentCollection()).doc(clean.id);let preparing=false;
    try{
      // Claim the immutable draft before calling Razorpay. Retries reuse its order.
      const existing=await db.runTransaction(async tx=>{
        const current=await tx.get(ref);if(current.exists){const data=current.data();
          if(data.tokenHash!==clean.tokenHash||data.stallHash!==digest(JSON.stringify(clean.stall)))throw Error('Checkout session does not match this draft.');
          if(['removed','placement_review'].includes(data.status)){const error=Error('This listing is no longer active.');error.statusCode=409;throw error;}
          if(orderState(data)==='busy'){const error=Error('Order creation is still running. Please retry in two minutes; your draft is saved.');error.statusCode=409;throw error;}
          if(!['published','test_verified','removed','placement_review'].includes(data.status)){const reservation=await reserveSlot(db,tx,paymentMode(),clean.stall,clean.id);tx.set(reservation.ref,reservation.value);}
          if(orderState(data)==='retry'){tx.update(ref,{orderLeaseUntil:Date.now()+orderLeaseMs,status:'creating'});return {...data,needsOrder:true};}
          return data;
        }
        const reservation=await reserveSlot(db,tx,paymentMode(),clean.stall,clean.id);
        const ip=request.headers.get('x-vercel-forwarded-for')||'unknown';
        const rate=db.collection('mela_stall_rate_limits').doc(digest(`${ip}:${Math.floor(Date.now()/3600000)}`));
        const rateData=(await tx.get(rate)).data();if((rateData?.count||0)>=10)throw Error('Too many checkout attempts. Please try later.');
        tx.set(reservation.ref,reservation.value);tx.set(rate,{count:(rateData?.count||0)+1,expiresAt:new Date(Date.now()+86400000)});
        tx.create(ref,{stall:clean.stall,stallHash:digest(JSON.stringify(clean.stall)),tokenHash:clean.tokenHash,status:'creating',orderLeaseUntil:Date.now()+orderLeaseMs,createdAt:Date.now(),terms:stallTerms});return null;
      });
      if(existing&&!existing.needsOrder){
        if(existing.tokenHash!==clean.tokenHash||existing.stallHash!==digest(JSON.stringify(clean.stall)))return json({error:'Checkout session does not match this draft.'},409);
        
        if(['removed','placement_review'].includes(existing.status))return json({error:'This listing is no longer active.'},409);
        return json({order_id:existing.orderId,key:process.env.RAZORPAY_KEY_ID,amount:stallPlans[existing.stall.plan].amount,currency:'INR',mode:paymentMode(),published:liveListing(existing),verified:existing.status==='test_verified',expired:Boolean(existing.expiresAt&&existing.expiresAt<=Date.now())});
      }
      preparing=true;const client=razorpayClient(),orderRequest={amount:stallPlans[clean.stall.plan].amount,currency:'INR',receipt:clean.id,notes:{mela_stall_id:clean.id},payment:stallCapture};
      const order=existing?.needsOrder?await recoverOrder(client,orderRequest):await client.orders.create(orderRequest);
      await ref.update({orderId:order.id,status:'awaiting_payment',orderLeaseUntil:0});
      return json({order_id:order.id,key:process.env.RAZORPAY_KEY_ID,amount:stallPlans[clean.stall.plan].amount,currency:'INR',mode:paymentMode()});
    }catch(error){if(preparing&&[400,401].includes(Number(error.statusCode))){try{await ref.update({status:'order_failed',orderLeaseUntil:0})}catch{}}return json({error:error.statusCode===409?error.message:providerMessage(error)},error.statusCode===409?409:providerStatus(error))}
  }
  if(action==='verify'){
    if(!input.razorpay_payment_id||!input.razorpay_order_id||!input.razorpay_signature)return json({error:'Payment ID, order ID and signature are required.'},400);
    if(!/^[a-f0-9-]{36}$/.test(input.id||'')||typeof input.token!=='string'||input.token.length>100)return json({error:'Invalid checkout session.'},400);
    try{
      const ref=db.collection(paymentCollection()).doc(input.id),data=(await ref.get()).data();
      if(!data||data.tokenHash!==digest(input.token))return json({error:'Checkout session not found.'},403);
      if(data.suppressed)return json({published:false});
      if(!/^pay_[a-zA-Z0-9]+$/.test(input.razorpay_payment_id||'')||input.razorpay_order_id!==data.orderId||!validSignature(`${data.orderId}|${input.razorpay_payment_id}`,input.razorpay_signature,process.env.RAZORPAY_KEY_SECRET))return json({error:'Payment verification failed.'},400);
      const payment=await razorpayClient().payments.fetch(input.razorpay_payment_id);
      if(payment.status==='authorized')return json({published:false});
      const published=await publish(db,ref,data,payment);if(!published)return json({error:'Your payment needs owner review because the location reservation is no longer available. Do not pay again. Contact checkfacecard@gmail.com.'},409);return json({success:true,verified:true,published:paymentMode()==='live'&&published,mode:paymentMode()});
    }catch{return json({error:'Payment confirmation is pending. Please do not pay again.'},503)}
  }
  return json({error:'Not found.'},404);
}

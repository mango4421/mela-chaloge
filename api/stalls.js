import {stallDatabase} from '../server/firebase.js';
import {digest,validSignature,assertCaptured,orderInput,publicationUpdate,liveListing} from '../server/stall-payments.js';
import {stallPlans,stallTerms} from '../src/stalls.js';

const collection='mela_stalls';
function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
function ready(){return process.env.ENABLE_STALL_CHECKOUT==='true'&&Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON&&process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&process.env.RAZORPAY_WEBHOOK_SECRET)}
async function razorpay(path,body){
  const response=await fetch(`https://api.razorpay.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Payment provider is temporarily unavailable.');return response.json();
}
async function publish(db,ref,data,payment){
  assertCaptured(payment,data.orderId,data.stall.plan);
  return db.runTransaction(async tx=>{const block=await tx.get(db.collection('mela_payment_blocks').doc(payment.id));const current=(await tx.get(ref)).data(),update=publicationUpdate(current,payment);if(block.exists||!update)return false;tx.update(ref,update);return true;});
}
async function webhook(request,raw){
  if(!validSignature(raw,request.headers.get('x-razorpay-signature'),process.env.RAZORPAY_WEBHOOK_SECRET))return json({error:'Invalid signature.'},401);
  const event=JSON.parse(raw),db=stallDatabase();
  if(['order.paid','payment.captured'].includes(event.event)){
    const entity=event.payload?.payment?.entity;if(!/^pay_[a-zA-Z0-9]+$/.test(entity?.id||''))return json({received:true});
    const payment=await razorpay(`payments/${entity.id}`),order=await razorpay(`orders/${payment.order_id}`),id=order.notes?.mela_stall_id;
    if(!/^[a-f0-9-]{36}$/.test(id||''))return json({received:true});
    const ref=db.collection(collection).doc(id),data=(await ref.get()).data();if(!data)return json({error:'Stall record not ready.'},503);
    if(data.orderId!==order.id)return json({error:'Order mismatch.'},409);
    if(payment.amount_refunded>0)return json({received:true});
    await publish(db,ref,data,payment);
  }else if(['refund.processed','payment.dispute.created','payment.dispute.lost'].includes(event.event)){
    const paymentId=event.payload?.refund?.entity?.payment_id||event.payload?.dispute?.entity?.payment_id;
    if(/^pay_[a-zA-Z0-9]+$/.test(paymentId||'')){await db.collection('mela_payment_blocks').doc(paymentId).set({reason:event.event,createdAt:Date.now()});const found=await db.collection(collection).where('paymentId','==',paymentId).get();for(const row of found.docs)await row.ref.update({status:'removed',suppressed:true});}
  }
  return json({received:true});
}
export async function GET(request){
  const action=new URL(request.url).searchParams.get('action');
  if(action==='config')return json({enabled:ready(),terms:stallTerms,plans:stallPlans});
  if(action!=='list')return json({error:'Not found.'},404);
  if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)return json({stalls:[]});
  try{const snapshot=await stallDatabase().collection(collection).where('status','==','published').get();return json({stalls:snapshot.docs.filter(row=>liveListing(row.data())).map(row=>({id:row.id,...row.data().stall,expiresAt:row.data().expiresAt})).sort((a,b)=>(b.plan==='featured')-(a.plan==='featured')||a.name.localeCompare(b.name))});}catch{return json({error:'Stalls could not be loaded.'},503)}
}
export async function POST(request){
  const action=new URL(request.url).searchParams.get('action');
  if(Number(request.headers.get('content-length')||0)>8192)return json({error:'Request too large.'},413);
  const raw=await request.text();if(Buffer.byteLength(raw)>8192)return json({error:'Request too large.'},413);
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
    const ref=db.collection(collection).doc(clean.id);
    try{
      // Claim the immutable draft before calling Razorpay. Retries reuse its order.
      const existing=await db.runTransaction(async tx=>{
        const current=await tx.get(ref);if(current.exists)return current.data();
        const ip=request.headers.get('x-vercel-forwarded-for')||'unknown';
        const rate=db.collection('mela_stall_rate_limits').doc(digest(`${ip}:${Math.floor(Date.now()/3600000)}`));
        const rateData=(await tx.get(rate)).data();if((rateData?.count||0)>=10)throw Error('Too many checkout attempts. Please try later.');
        tx.set(rate,{count:(rateData?.count||0)+1,expiresAt:new Date(Date.now()+86400000)});
        tx.create(ref,{stall:clean.stall,stallHash:digest(JSON.stringify(clean.stall)),tokenHash:clean.tokenHash,status:'creating',createdAt:Date.now(),terms:stallTerms});return null;
      });
      if(existing){
        if(existing.tokenHash!==clean.tokenHash||existing.stallHash!==digest(JSON.stringify(clean.stall)))return json({error:'Checkout session does not match this draft.'},409);
        if(!existing.orderId)return json({error:'Your checkout is being prepared. Please wait before trying again.'},409);
        if(existing.status==='removed')return json({error:'This listing is no longer active.'},409);
        return json({orderId:existing.orderId,key:process.env.RAZORPAY_KEY_ID,amount:stallPlans[existing.stall.plan].amount,published:existing.status==='published'});
      }
      const order=await razorpay('orders',{amount:stallPlans[clean.stall.plan].amount,currency:'INR',receipt:clean.id,notes:{mela_stall_id:clean.id}});
      await ref.update({orderId:order.id,status:'awaiting_payment'});
      return json({orderId:order.id,key:process.env.RAZORPAY_KEY_ID,amount:stallPlans[clean.stall.plan].amount});
    }catch{return json({error:'Checkout could not be prepared. No payment was requested. Please try later.'},503)}
  }
  if(action==='verify'){
    if(!/^[a-f0-9-]{36}$/.test(input.id||'')||typeof input.token!=='string'||input.token.length>100)return json({error:'Invalid checkout session.'},400);
    try{
      const ref=db.collection(collection).doc(input.id),data=(await ref.get()).data();
      if(!data||data.tokenHash!==digest(input.token))return json({error:'Checkout session not found.'},403);
      if(data.status==='published')return json({published:true});if(data.suppressed)return json({published:false});
      if(!/^pay_[a-zA-Z0-9]+$/.test(input.razorpay_payment_id||'')||input.razorpay_order_id!==data.orderId||!validSignature(`${data.orderId}|${input.razorpay_payment_id}`,input.razorpay_signature,process.env.RAZORPAY_KEY_SECRET))return json({error:'Payment verification failed.'},400);
      const payment=await razorpay(`payments/${input.razorpay_payment_id}`);
      if(payment.status==='authorized')return json({published:false});
      return json({published:await publish(db,ref,data,payment)});
    }catch{return json({error:'Payment confirmation is pending. Please do not pay again.'},503)}
  }
  return json({error:'Not found.'},404);
}

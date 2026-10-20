import {razorpayClient,paymentMode,providerStatus,providerMessage,stallCapture} from '../server/razorpay.js';
import {digest,validSignature} from '../server/stall-payments.js';
import {supportInput,assertSupportPayment} from '../server/support-payments.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// Support grants no access or goods; Razorpay keeps the payment record without a database dependency.
const requests=new Map();
export async function POST(request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
  const raw=await request.text();if(raw.length>2048)return json({error:'Request too large.'},413);
  let input;try{input=JSON.parse(raw)}catch{return json({error:'Invalid request.'},400)}
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)return json({error:'Online support is unavailable. Please use the QR below.'},503);
  const action=new URL(request.url).searchParams.get('action'),client=razorpayClient();
  if(action==='order'){
    let clean;try{clean=supportInput(input)}catch(error){return json({error:error.message},400)}
    const now=Date.now(),ip=digest(request.headers.get('x-vercel-forwarded-for')||'unknown');for(const [key,value] of requests)if(value.until<now)requests.delete(key);
    const rate=requests.get(ip)||{count:0,until:now+3600000};if(rate.count>=20||requests.size>=2000&&!requests.has(ip))return json({error:'Too many requests. Please try later or use the QR.'},429);rate.count++;requests.set(ip,rate);
    try{
      const orders=await client.orders.all({receipt:clean.id,count:100}),matches=(orders.items||[]).filter(order=>order.receipt===clean.id);
      if(matches.length>1)return json({error:'Please contact support before trying again.'},409);
      let order=matches[0];if(order&&(order.amount!==clean.amount||order.currency!=='INR'||order.notes?.mela_support_id!==clean.id))return json({error:'Checkout session mismatch.'},409);
      order||=await client.orders.create({amount:clean.amount,currency:'INR',receipt:clean.id,notes:{mela_support_id:clean.id},payment:stallCapture});
      return json({order_id:order.id,amount:order.amount,currency:order.currency,key:process.env.RAZORPAY_KEY_ID,mode:paymentMode(),paid:order.status==='paid'});
    }catch(error){return json({error:providerMessage(error)},providerStatus(error))}
  }
  if(action==='verify'){
    if(!/^pay_[a-zA-Z0-9]+$/.test(input.razorpay_payment_id||'')||!/^order_[a-zA-Z0-9]+$/.test(input.razorpay_order_id||'')||!validSignature(`${input.razorpay_order_id}|${input.razorpay_payment_id}`,input.razorpay_signature,process.env.RAZORPAY_KEY_SECRET))return json({error:'Payment verification failed.'},400);
    try{const [order,payment]=await Promise.all([client.orders.fetch(input.razorpay_order_id),client.payments.fetch(input.razorpay_payment_id)]);assertSupportPayment(order,payment);return json({paid:true,mode:paymentMode()})}catch{return json({error:'Confirmation is pending. If you paid, do not pay again. Your payment is recorded by Razorpay; contact checkfacecard@gmail.com for help.'},503)}
  }
  return json({error:'Not found.'},404);
}

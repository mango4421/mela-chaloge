import {stallDatabase} from '../server/firebase.js';
import {funnelInput} from '../server/funnel.js';
import {digest} from '../server/stall-payments.js';
export async function POST(request){
  const reply=(data,status)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin.'},403);
  const raw=await request.text();if(raw.length>256)return reply({error:'Too large.'},413);
  let event;try{event=funnelInput(JSON.parse(raw))}catch{return reply({error:'Invalid event.'},400)}
  try{
    const db=stallDatabase(),ref=db.collection(event.collection).doc(event.id),ip=request.headers.get('x-vercel-forwarded-for')||'unknown',rate=db.collection('mela_funnel_rates').doc(digest(`${ip}:${Math.floor(Date.now()/3600000)}`));
    const allowed=await db.runTransaction(async tx=>{if((await tx.get(ref)).exists)return true;const count=(await tx.get(rate)).data()?.count||0;if(count>=120)return false;tx.set(rate,{count:count+1,expiresAt:new Date(Date.now()+86400000)});tx.create(ref,{createdAt:event.createdAt});return true});
    return reply(allowed?{ok:true}:{error:'Too many events.'},allowed?200:429);
  }catch{return reply({error:'Unavailable.'},503)}
}

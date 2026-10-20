import {stallDatabase} from '../server/firebase.js';
import {funnelInput,once} from '../server/funnel.js';
import {digest} from '../server/stall-payments.js';
// shortcut: per-instance abuse guard; use a shared limiter if this analytics endpoint attracts bots.
const requests=new Map();
export async function POST(request){
  const reply=(data,status)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin.'},403);
  const raw=await request.text();if(raw.length>256)return reply({error:'Too large.'},413);
  let event;try{event=funnelInput(JSON.parse(raw))}catch{return reply({error:'Invalid event.'},400)}
  try{
    const now=Date.now(),ip=digest(request.headers.get('x-vercel-forwarded-for')||'unknown');
    for(const [key,value] of requests)if(value.until<now)requests.delete(key);
    const rate=requests.get(ip)||{count:0,until:now+3600000};if(rate.count>=120||requests.size>=2000&&!requests.has(ip))return reply({error:'Too many events.'},429);
    rate.count++;requests.set(ip,rate);
    await once(stallDatabase().collection(event.collection).doc(event.id),{createdAt:event.createdAt});return reply({ok:true},200);
  }catch{return reply({error:'Unavailable.'},503)}
}

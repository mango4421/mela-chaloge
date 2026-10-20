import {stallDatabase} from '../server/firebase.js';
import {adminPasswordValid,adminSession,authenticatedAdmin} from '../server/admin.js';
import {digest} from '../server/stall-payments.js';
function json(data,status=200,headers={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})}
const configured=()=>Boolean(process.env.MELA_ADMIN_SECRET?.length>=32&&process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
function cookie(request,value,age=28800){return `mela_admin=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function GET(request){
  if(!authenticatedAdmin(request))return json({authenticated:false,configured:configured()},401);
  if(new URL(request.url).searchParams.get('action')==='session')return json({authenticated:true});
  const mode=new URL(request.url).searchParams.get('mode')==='test'?'test':'live';
  try{const rows=await stallDatabase().collection(mode==='test'?'mela_stall_tests':'mela_stalls').orderBy('createdAt','desc').limit(100).get();return json({stalls:rows.docs.map(row=>{const data=row.data();return {id:row.id,stall:data.stall,status:data.status,createdAt:data.createdAt,expiresAt:data.expiresAt||null,paymentId:data.paymentId||null,suppressed:Boolean(data.suppressed)}})});}catch{return json({error:'Could not load stalls.'},503)}
}
export async function POST(request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  const raw=await request.text();if(raw.length>2048)return json({error:'Request too large.'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid request.'},400)}
  const action=new URL(request.url).searchParams.get('action');
  if(action==='logout')return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
  if(!configured())return json({error:'Admin access has not been configured.'},503);
  if(action==='login'){
    try{
      const db=stallDatabase(),ip=request.headers.get('x-vercel-forwarded-for')||'local',rate=db.collection('mela_admin_attempts').doc(digest(`${ip}:${Math.floor(Date.now()/3600000)}`));
      const allowed=await db.runTransaction(async tx=>{const count=(await tx.get(rate)).data()?.count||0;if(count>=12)return false;tx.set(rate,{count:count+1,expiresAt:new Date(Date.now()+86400000)});return true});
      if(!allowed)return json({error:'Too many login attempts. Please try later.'},429);
      if(!adminPasswordValid(body.password))return json({error:'Incorrect admin password.'},401);
      return json({authenticated:true},200,{'Set-Cookie':cookie(request,adminSession())});
    }catch{return json({error:'Admin login is temporarily unavailable.'},503)}
  }
  if(!authenticatedAdmin(request))return json({error:'Please sign in.'},401);
  if(action!=='remove'||! /^[a-f0-9-]{36}$/.test(body.id||'')||!['test','live'].includes(body.mode))return json({error:'Invalid action or stall.'},400);
  try{
    const db=stallDatabase(),ref=db.collection(body.mode==='test'?'mela_stall_tests':'mela_stalls').doc(body.id);
    const removed=await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(!existing.exists)return false;tx.update(ref,{status:'removed',suppressed:true,removedAt:Date.now()});return true;});
    return removed?json({removed:true}):json({error:'Stall not found.'},404);
  }catch{return json({error:'Stall could not be removed.'},503)}
}

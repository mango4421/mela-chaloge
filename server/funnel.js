import {digest} from './stall-payments.js';
export const browserStages=['form_opened','review_opened','checkout_opened'];
export function funnelInput(input,now=Date.now()){
  if(!browserStages.includes(input?.event)||! /^[a-f0-9-]{36}$/.test(input.session||''))throw Error('Invalid event.');
  const day=new Date(now+19800000).toISOString().slice(0,10);
  return {collection:`mela_funnel_${input.event}`,id:digest(`${day}:${input.session}`),createdAt:now};
}
export async function once(ref,data){try{await ref.create(data)}catch(error){if(error.code!==6&&error.code!=='already-exists')throw error}}
export async function paymentAttempt(db,orderId){await once(db.collection('mela_payment_attempts').doc(orderId),{createdAt:Date.now()})}
export async function funnelReport(db){
  const since=Date.now()-7*86400000;
  const count=async(collection,field='createdAt')=>(await db.collection(collection).where(field,'>=',since).count().get()).data().count;
  const values=await Promise.all([...browserStages.map(stage=>count(`mela_funnel_${stage}`)),count('mela_payment_attempts'),count('mela_stalls','publishedAt')]);
  return {since,stages:Object.fromEntries([...browserStages,'payment_attempted','paid'].map((stage,index)=>[stage,values[index]]))};
}

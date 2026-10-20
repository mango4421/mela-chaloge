export function trackFunnel(event){
  if(location.hostname!=='melachaloge.online')return;
  try{let session=sessionStorage.getItem('mela-funnel-session');if(!session){session=crypto.randomUUID();sessionStorage.setItem('mela-funnel-session',session)}fetch('/api/funnel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,session}),keepalive:true}).catch(()=>{})}catch{}
}

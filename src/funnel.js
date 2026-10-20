const pending=new Set();
export function trackFunnel(event){
  if(location.hostname!=='melachaloge.online')return;
  try{const day=new Date(Date.now()+19800000).toISOString().slice(0,10),key=`mela-funnel:${day}:${event}`;if(pending.has(key)||sessionStorage.getItem(key))return;
    let session=sessionStorage.getItem('mela-funnel-session');if(!session){session=crypto.randomUUID();sessionStorage.setItem('mela-funnel-session',session)}
    pending.add(key);fetch('/api/funnel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,session}),keepalive:true}).then(response=>{if(response.ok)try{sessionStorage.setItem(key,'sent')}catch{}}).catch(()=>{}).finally(()=>pending.delete(key));
  }catch{}
}

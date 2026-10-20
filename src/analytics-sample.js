export function analyticsSample(storage,random=Math.random){
  try{storage??=window.sessionStorage;let value=storage.getItem('mela-analytics-10pct-v1');if(value===null){value=random()<.1?'yes':'no';storage.setItem('mela-analytics-10pct-v1',value)}return value==='yes'}catch{return random()<.1}
}

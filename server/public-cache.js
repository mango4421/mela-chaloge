const entries=new Map();
// Only public GET data belongs here. Payments and admin responses always stay uncached.
export function publicRead(key,load,ttl=30000,now=Date.now()){
  const current=entries.get(key);if(current&&current.until>now)return current.promise;
  const entry={until:now+ttl,promise:Promise.resolve().then(load)};entries.set(key,entry);
  entry.promise.catch(()=>{if(entries.get(key)===entry)entry.until=now+Math.min(ttl,30000)});
  return entry.promise;
}

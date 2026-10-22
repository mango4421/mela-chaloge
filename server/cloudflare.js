const security={
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};
export async function cloudflareApi({request,waitUntil},routes,cache=globalThis.caches?.default){
  const url=new URL(request.url),route=routes[url.pathname];
  const reply=(data,status,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...security,...headers}});
  if(!route)return reply({error:'Not found.'},404);
  const handler=route[request.method];
  if(!handler)return reply({error:'Method not allowed.'},405,{Allow:Object.keys(route).join(', ')});
  // Normalize public cache keys so tracking parameters cannot multiply database reads.
  const action=url.searchParams.get('action');
  const publicRead=request.method==='GET'&&url.pathname==='/api/stalls'&&['list','config'].includes(action)&&!url.searchParams.has('preview')&&!request.headers.has('authorization')&&!request.headers.has('cookie');
  const cacheKey=new Request(`${url.origin}/api/stalls?action=${action}`);
  if(publicRead&&cache){const hit=await cache.match(cacheKey);if(hit)return hit;}
  const headers=new Headers(request.headers);
  // Existing rate limiters expect Vercel's trusted IP header; never trust a client-supplied one here.
  headers.set('x-vercel-forwarded-for',request.headers.get('cf-connecting-ip')||'unknown');
  try{
    const original=await handler(new Request(request,{headers}));
    const response=new Response(original.body,original);
    for(const [key,value] of Object.entries(security))response.headers.set(key,value);
    if(publicRead&&cache&&response.ok&&!response.headers.has('set-cookie')&&/s-maxage=\d+/.test(response.headers.get('cache-control')||'')){
      const data=await response.clone().json();
      if(!data.unavailable&&!data.error)waitUntil(cache.put(cacheKey,response.clone()));
    }
    return response;
  }catch{return reply({error:'Temporarily unavailable. Please try again.'},503);}
}

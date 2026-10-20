import {createHash,createHmac,timingSafeEqual,randomBytes} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest();
export function adminPasswordValid(value,secret=process.env.MELA_ADMIN_SECRET){return typeof value==='string'&&value.length<=200&&Boolean(secret?.length>=32)&&timingSafeEqual(hash(value),hash(secret));}
export function adminSession(secret=process.env.MELA_ADMIN_SECRET,now=Date.now()){
  const payload=`${now+8*3600000}.${randomBytes(16).toString('hex')}`;return `${payload}.${createHmac('sha256',secret).update(payload).digest('hex')}`;
}
export function adminSessionValid(cookie,secret=process.env.MELA_ADMIN_SECRET,now=Date.now()){
  if(!secret||typeof cookie!=='string'||cookie.length>180)return false;
  const [expires,nonce,signature]=cookie.split('.');if(!/^\d{13}$/.test(expires||'')||! /^[a-f0-9]{32}$/.test(nonce||'')||! /^[a-f0-9]{64}$/.test(signature||'')||Number(expires)<=now||Number(expires)>now+9*3600000)return false;
  const expected=createHmac('sha256',secret).update(`${expires}.${nonce}`).digest('hex');return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex'));
}
export function authenticatedAdmin(request){const match=request.headers.get('cookie')?.match(/(?:^|;\s*)mela_admin=([^;]+)/);return adminSessionValid(match?.[1]);}

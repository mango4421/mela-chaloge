export const stallPlans={basic:{name:'Mela stall',amount:20000},featured:{name:'Featured stall',amount:50000}};
export const stallDurationMs=7*24*60*60*1000;
export const stallTerms='7-day virtual advertising placement, starting after payment is verified. One-time payment, no automatic renewal. Stalls rotate through the bazaar; featured placements receive priority. No visitor count or sales are guaranteed. Products are purchased directly from the linked seller. For listing support, removal or refund requests, contact checkfacecard@gmail.com.';
export const stallThemes={gulabi:'#ce5278',kesari:'#dc9239',neela:'#318d99'};
export const emptyStall={name:'',instagram:'',productUrl:'',category:'shop',theme:'kesari',greeting:'Aaiye ji! Hamari dukaan mein aapka swagat hai.',question:'Aapke paas kya khaas hai?',answer:'Hamare products dekhiye—kuch pasand aaye toh link par milte hain!',plan:'basic'};

function text(value,max,label,required=true){
  if(typeof value!=='string'||value.length>max||/[\u0000-\u001f<>]/.test(value))throw Error(`${label}: please use plain text, up to ${max} characters.`);
  const result=value.trim();if(required&&!result)throw Error(`${label} is required.`);return result;
}
export function publicLink(value,instagram=false){
  const raw=text(value,300,instagram?'Instagram':'Product link',false);if(!raw)return '';
  const input=instagram&&/^@?[\w.]{1,30}$/.test(raw)?`https://www.instagram.com/${raw.replace(/^@/,'')}/`:raw;
  let url;try{url=new URL(input)}catch{throw Error('Use a full https:// link, or an Instagram @handle.');}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port||!host.includes('.')||host.endsWith('.local')||host==='localhost'||/^\d/.test(host)||host.startsWith('['))throw Error('Use a public HTTPS website link.');
  if(instagram&&!['instagram.com','www.instagram.com'].includes(host))throw Error('Please use an instagram.com profile link.');
  return url.href;
}
export function validateStall(input){
  if(!input||typeof input!=='object'||!Object.hasOwn(stallPlans,input.plan)||!Object.hasOwn(stallThemes,input.theme)||!['shop','food','creator'].includes(input.category))throw Error('Choose a valid stall plan, colour and category.');
  const stall={name:text(input.name,36,'Stall name'),instagram:publicLink(input.instagram,true),productUrl:publicLink(input.productUrl),category:input.category,theme:input.theme,greeting:text(input.greeting,180,'Welcome line'),question:text(input.question,65,'Visitor question'),answer:text(input.answer,240,'Shopkeeper reply'),plan:input.plan};
  if(!stall.instagram&&!stall.productUrl)throw Error('Add your Instagram or product link so visitors can find you.');
  return stall;
}

export function selectStalls(stalls,selectedId='',random=Math.random){
  // All partners remain discoverable. Eight rotating spaces replace demo booths.
  const valid=stalls.flatMap(stall=>{try{return [{...validateStall(stall),id:stall.id}]}catch{return []}}).filter(stall=>/^[a-f0-9-]{36}$/.test(stall.id||''));
  const shuffled=valid.map(stall=>({stall,score:random()})).sort((a,b)=>a.score-b.score).map(item=>item.stall);
  const selected=shuffled.find(stall=>stall.id===selectedId),chosen=selected?[selected]:[];
  const remaining=shuffled.filter(stall=>stall.id!==selectedId),featured=remaining.filter(stall=>stall.plan==='featured'),basic=remaining.filter(stall=>stall.plan==='basic');
  chosen.push(...featured.slice(0,4),...basic.slice(0,8-chosen.length-Math.min(featured.length,4)));
  const ids=new Set(chosen.map(stall=>stall.id));return [...chosen,...remaining.filter(stall=>!ids.has(stall.id))].slice(0,8);
}

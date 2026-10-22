import {JWT} from 'google-auth-library';

const operators={'==':'EQUAL','>':'GREATER_THAN','>=':'GREATER_THAN_OR_EQUAL'};
const identifier=value=>{if(typeof value!=='string'||! /^[a-zA-Z0-9_-]+$/.test(value))throw Error('Invalid database identifier.');return value;};
export function encodeValue(value){
  if(value===null)return {nullValue:null};
  if(value instanceof Date)return {timestampValue:value.toISOString()};
  if(typeof value==='string')return {stringValue:value};
  if(typeof value==='boolean')return {booleanValue:value};
  if(typeof value==='number'&&Number.isFinite(value)){
    if(Number.isInteger(value)){if(!Number.isSafeInteger(value))throw Error('Unsafe integer.');return {integerValue:String(value)};}
    return {doubleValue:value};
  }
  if(Array.isArray(value))return {arrayValue:{values:value.map(encodeValue)}};
  if(value&&Object.getPrototypeOf(value)===Object.prototype)return {mapValue:{fields:encodeFields(value)}};
  throw Error('Unsupported database value.');
}
const encodeFields=value=>Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encodeValue(item)]));
export function decodeValue(value){
  if('nullValue' in value)return null;
  for(const key of ['stringValue','booleanValue','doubleValue'])if(key in value)return value[key];
  if('integerValue' in value){const number=Number(value.integerValue);if(!Number.isSafeInteger(number))throw Error('Unsafe integer.');return number;}
  if('timestampValue' in value)return new Date(value.timestampValue);
  if('arrayValue' in value)return (value.arrayValue.values||[]).map(decodeValue);
  if('mapValue' in value)return decodeFields(value.mapValue.fields||{});
  throw Error('Unsupported database value.');
}
const decodeFields=fields=>Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,decodeValue(value)]));

// This adapter covers the queries and atomic writes used by the mela APIs. Add other SDK operations explicitly.
export function createRestDatabase(projectId,accessToken,fetcher=fetch){
  identifier(projectId);
  const parent=`projects/${projectId}/databases/(default)/documents`,base=`https://firestore.googleapis.com/v1/${parent}`;
  async function request(suffix,body,method='POST'){
    const token=await accessToken();
    const response=await fetcher(base+suffix,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(!response.ok){const error=Error('Database request failed.');error.status=result.error?.status;error.code={ALREADY_EXISTS:6,ABORTED:10,NOT_FOUND:5}[error.status]||response.status;throw error;}
    return result;
  }
  function snapshot(document,ref){return {id:ref.id,ref,exists:Boolean(document),data:()=>document?decodeFields(document.fields||{}):undefined};}
  function write(ref,data,kind){
    const result={update:{name:ref.name,fields:encodeFields(data)}};
    if(kind==='create')result.currentDocument={exists:false};
    if(kind==='update'){
      result.currentDocument={exists:true};
      result.updateMask={fieldPaths:Object.keys(data).map(identifier)};
    }
    return result;
  }
  function reference(collection,id){
    const ref={id:identifier(id),name:`${parent}/${collection}/${id}`};
    ref.get=async()=>{try{return snapshot(await request(`/${collection}/${id}`,undefined,'GET'),ref)}catch(error){if(error.code===5)return snapshot(null,ref);throw error;}};
    for(const kind of ['set','create','update'])ref[kind]=data=>request(':commit',{writes:[write(ref,data,kind)]});
    return ref;
  }
  function query(collection,structuredQuery={from:[{collectionId:collection}]}){
    return {
      doc:id=>reference(collection,id),
      where(field,operator,value){if(!operators[operator])throw Error('Unsupported query operator.');return query(collection,{...structuredQuery,where:{fieldFilter:{field:{fieldPath:identifier(field)},op:operators[operator],value:encodeValue(value)}}});},
      orderBy(field,direction='asc'){if(!['asc','desc'].includes(direction))throw Error('Invalid sort direction.');return query(collection,{...structuredQuery,orderBy:[{field:{fieldPath:identifier(field)},direction:direction==='desc'?'DESCENDING':'ASCENDING'}]});},
      limit(value){if(!Number.isSafeInteger(value)||value<1||value>1000)throw Error('Invalid query limit.');return query(collection,{...structuredQuery,limit:value});},
      async get(){const rows=await request(':runQuery',{structuredQuery});const docs=rows.filter(row=>row.document).map(row=>snapshot(row.document,reference(collection,row.document.name.split('/').at(-1))));return {docs,size:docs.length,empty:!docs.length};},
      count(){return {get:async()=>{const rows=await request(':runAggregationQuery',{structuredAggregationQuery:{structuredQuery,aggregations:[{alias:'count',count:{}}]}});const value=rows.find(row=>row.result)?.result.aggregateFields.count;return {data:()=>({count:value?decodeValue(value):0})};}};}
    };
  }
  return {
    collection:name=>query(identifier(name)),
    async runTransaction(callback){
      let previous;
      for(let attempt=0;attempt<5;attempt++){
        const {transaction}=await request(':beginTransaction',{options:{readWrite:previous?{retryTransaction:previous}:{}}});
        const writes=[];
        const tx={
          async get(ref){if(writes.length)throw Error('Transaction reads must precede writes.');const rows=await request(':batchGet',{documents:[ref.name],transaction});const row=rows.find(row=>row.found?.name===ref.name||row.missing===ref.name);if(!row)throw Error('Missing transaction read.');return snapshot(row.found,ref);}
        };
        for(const kind of ['set','create','update'])tx[kind]=(ref,data)=>{writes.push(write(ref,data,kind));return tx;};
        try{const result=await callback(tx);await request(':commit',{transaction,writes});return result;}
        catch(error){await request(':rollback',{transaction}).catch(()=>{});if(error.code!==10||attempt===4)throw error;previous=transaction;await new Promise(resolve=>setTimeout(resolve,50*2**attempt+Math.random()*50));}
      }
    }
  };
}

let database;
export function stallDatabase(){
  if(!database){
    const account=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    const auth=new JWT({email:account.client_email,key:account.private_key,scopes:['https://www.googleapis.com/auth/datastore']});
    database=createRestDatabase(account.project_id,async()=>{const {token}=await auth.getAccessToken();if(!token)throw Error('Database authentication unavailable.');return token;});
  }
  return database;
}

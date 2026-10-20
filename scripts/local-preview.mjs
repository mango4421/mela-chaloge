import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateStall,stallSlots} from '../src/stalls.js';
const previews=new Map();
import {GET as stallGET,POST as stallPOST} from '../api/stalls.js';
import {GET as adminGET,POST as adminPOST} from '../api/admin.js';
const root=path.resolve('dist');
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:4180');
  try{
    if(['/api/stalls','/api/admin'].includes(url.pathname)){
      const body=[];for await(const chunk of req)body.push(chunk);
      const request=new Request(url,{method:req.method,headers:req.headers,...(body.length?{body:Buffer.concat(body)}:{})});
      const handler=url.pathname==='/api/admin'?(req.method==='POST'?adminPOST:adminGET):(req.method==='POST'?stallPOST:stallGET);
      if(url.pathname==='/api/stalls'&&url.searchParams.get('action')==='preview'&&req.method==='POST'){
        if(req.headers.origin!==url.origin||Buffer.concat(body).length>230000){res.writeHead(403).end();return;}
        try{const stall=validateStall(JSON.parse(Buffer.concat(body).toString()).stall),id=randomUUID();previews.set(id,{...stall,id});res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({previewUrl:`/?preview=${id}`}));}catch(error){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:error.message}));}return;
      }
      if(url.pathname==='/api/stalls'&&url.searchParams.get('action')==='list'&&url.searchParams.has('preview')){const demo=previews.get(url.searchParams.get('preview'));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({stalls:demo?[demo]:[]}));return;}
      const response=await handler(request);
      if(url.pathname==='/api/stalls'&&url.searchParams.get('action')==='config'){const config=await response.json();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({...config,previewEnabled:true,availableSlots:stallSlots.map(slot=>slot.id)}));return;}res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    const name=url.pathname==='/'?'/index.html':url.pathname==='/admin'?'/admin.html':url.pathname;
    const file=path.resolve(root,`.${decodeURIComponent(name)}`);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const body=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.jpeg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(500).end('Local test request failed');}
}).listen(4180,'127.0.0.1',()=>console.log('Local test checkout server ready on port 4180'));

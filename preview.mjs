import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ready:false,siteKey:''}));return;}
 if(url.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Preview only. Run the Cloudflare Worker to enable submission.'}));return;}
 const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
 const file=path.resolve(root,name);
 if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
 try{const content=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);}catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173'));
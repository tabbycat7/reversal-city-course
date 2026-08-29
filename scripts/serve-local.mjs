import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve,extname,sep } from 'node:path';

const root=resolve(fileURLToPath(new URL('../dist-offline/',import.meta.url)));
const port=Number(process.env.REVERSAL_CITY_PORT||3004);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('REVERSAL_CITY_PORT 必须是有效端口号。');
if(!existsSync(resolve(root,'index.html'))){
 console.error('未找到本地构建。请先运行 npm install 和 npm run build:offline。');
 process.exit(1);
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405);res.end();return;}
  const pathname=decodeURIComponent(new URL(req.url||'/','http://localhost').pathname);
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const info=await stat(file);
  if(!info.isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('没有找到这个本地资源。');}
});
server.on('error',error=>{
 console.error(error.code==='EADDRINUSE'?'端口'+port+'已被占用。请检查已启动的课程窗口，或设置 REVERSAL_CITY_PORT 为其他端口。':error.message);
 process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>{
 console.log('\n反转之城 · 本地成品\n打开 http://127.0.0.1:'+port+'/\n仅本机访问；不上传答卷；按 Ctrl+C 结束。\n');
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));


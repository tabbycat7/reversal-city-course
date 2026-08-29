import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// Run after npm start. This checker only connects to this computer.
const project=resolve(fileURLToPath(new URL('..',import.meta.url)));
const root=resolve(project,'dist-offline');
const base=new URL(process.env.REVERSAL_CITY_TEST_URL||'http://127.0.0.1:3004/');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname),'Only a local test URL is allowed.');
async function collect(dir){
 const entries=await readdir(dir,{withFileTypes:true});
 const groups=await Promise.all(entries.map(e=>e.isDirectory()?collect(resolve(dir,e.name)):[resolve(dir,e.name)]));
 return groups.flat();
}
const files=await collect(root),checks=[];
for(const file of files){
 const pathname='/'+relative(root,file).split(sep).join('/');
 const response=await fetch(new URL(pathname,base),{method:'HEAD'});
 const info=await stat(file);
 assert.equal(response.status,200,pathname);
 assert.equal(Number(response.headers.get('content-length')),info.size,pathname+' size');
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 checks.push({path:pathname,status:response.status,bytes:info.size});
}
const cssFiles=files.filter(f=>extname(f)==='.css');
let cssAssets=0;
for(const file of cssFiles){
 const css=await readFile(file,'utf8');
 const cssURL=new URL('/'+relative(root,file).split(sep).join('/'),base);
 for(const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)){
  const value=match[1].trim();
  if(value.startsWith('data:')||value.startsWith('#'))continue;
  const url=new URL(value,cssURL);
  assert.equal(url.origin,base.origin,'External CSS dependency: '+url.href);
  assert.equal((await fetch(url,{method:'HEAD'})).status,200,url.pathname);
  cssAssets++;
 }
}
const fonts=files.filter(f=>/\.(woff2?|ttf)$/.test(f));
assert.ok(fonts.length>=20,'KaTeX fonts must be included in the build.');
const index=await (await fetch(base)).text();
assert.match(index,/\u53cd\u8f6c\u4e4b\u57ce/);
assert.doesNotMatch(index,/<script[^>]+src=["']https?:\/\//i);
const missing=await fetch(new URL('/not-a-course-resource',base));
const post=await fetch(base,{method:'POST'});
const traversal=await fetch(new URL('/%2e%2e%2fpackage.json',base));
assert.equal(missing.status,404);
assert.equal(post.status,405);
assert.ok([403,404].includes(traversal.status),'Paths outside dist-offline must be inaccessible.');
const report={date:new Date().toISOString(),base:base.href,totalFiles:files.length,fontFiles:fonts.length,cssAssetReferences:cssAssets,bytes:checks.reduce((sum,c)=>sum+c.bytes,0),checks,guards:{missing:missing.status,unsupportedMethod:post.status,traversal:traversal.status},passed:true};
await writeFile(resolve(project,'qa/build-asset-check.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,totalFiles:files.length,fontFiles:fonts.length,cssAssetReferences:cssAssets,guards:report.guards},null,2));

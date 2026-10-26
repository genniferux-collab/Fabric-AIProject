#!/usr/bin/env node
// Export the generated prototype as one offline HTML file, including fonts,
// libraries and the assets used by dynamically constructed React/SVG URLs.
import fs from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2),option=name=>args[args.indexOf(name)+1];
const dir=path.resolve(option('--dir')||process.cwd()),out=path.resolve(option('--out')||'FabricAI-standalone.html');
const revision=args.includes('--revision')?option('--revision'):'working-tree';
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.otf':'font/otf','.json':'application/json'};
const assets={};
async function walk(root){for(const entry of await fs.readdir(root,{withFileTypes:true})){const file=path.join(root,entry.name);if(entry.isDirectory())await walk(file);else if(mime[path.extname(file).toLowerCase()]){const bytes=await fs.readFile(file);assets[path.relative(dir,file).split(path.sep).join('/')]=[mime[path.extname(file).toLowerCase()],bytes.toString('base64')];}}}
await walk(path.join(dir,'assets/uploads'));await walk(path.join(dir,'assets/font'));
const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const bootstrap=`<script>\n(function(){\nconst assets=${safeJson(assets)},cache=Object.create(null);\nfunction resolve(value){if(typeof value!=='string'||/^(?:data:|blob:|#)/.test(value))return value;let key=value.split(/[?#]/)[0].replace(/^\\.\\//,'').replace(/^\\//,'');const at=key.indexOf('/assets/');if(at>=0)key=key.slice(at+1);try{key=decodeURI(key);}catch{}const item=assets[key];if(!item)return value;if(!cache[key]){const binary=atob(item[1]),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);cache[key]=URL.createObjectURL(new Blob([bytes],{type:item[0]}));}return cache[key];}\nwindow.__fabricOfflineResolve=resolve;\nwindow.__fabricOfflineCss=css=>css.replace(/url\\(\\s*(['\"]?)([^'\"\\)]+)\\1\\s*\\)/g,(whole,quote,url)=>'url(\"'+resolve(url)+'\")');\n})();\n</script>`;
let html=await fs.readFile(path.join(dir,'index.page.html'),'utf8');
const scriptPattern=/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi;
const scripts=[...html.matchAll(scriptPattern)];
for(const match of scripts){const file=path.resolve(dir,match[2]);if(!file.startsWith(dir+path.sep))throw Error('Script outside project: '+match[2]);const code=(await fs.readFile(file,'utf8')).replace(/<\/script/gi,'<\\/script');html=html.replace(match[0],'<script>\n'+code+'\n</script>');}
html=html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi,(_,attributes,css)=>'<script>document.write('+safeJson('<style'+attributes+'>')+'+window.__fabricOfflineCss('+safeJson(css)+')+'+safeJson('</style>')+');</script>');
html=html.replace(/(<meta\s+charset=["'][^"']+["']\s*\/?>)/i,'$1\n'+bootstrap);
const hooks=`<script>\n(function(){\nconst resolve=window.__fabricOfflineResolve,css=window.__fabricOfflineCss,create=React.createElement;\nReact.createElement=function(type,props,...children){if(props){props=Object.assign({},props);for(const name of ['src','href','xlinkHref','poster'])if(typeof props[name]==='string')props[name]=resolve(props[name]);if(props.style){props.style=Object.assign({},props.style);for(const key of Object.keys(props.style))if(typeof props.style[key]==='string'&&props.style[key].includes('url('))props.style[key]=css(props.style[key]);}}return create.call(this,type,props,...children);};\nconst src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');if(src&&src.set)Object.defineProperty(HTMLImageElement.prototype,'src',Object.assign({},src,{set(value){src.set.call(this,resolve(value));}}));\nconst set=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){return set.call(this,name,/^(?:src|href|poster)$/i.test(name)?resolve(value):value);};\nconst setNS=Element.prototype.setAttributeNS;Element.prototype.setAttributeNS=function(ns,name,value){return setNS.call(this,ns,/(?:^|:)href$/i.test(name)?resolve(value):value);};\nconst fetchOriginal=window.fetch;window.fetch=function(input,options){const url=typeof input==='string'?input:input?.url,mapped=resolve(url);return fetchOriginal.call(this,mapped!==url?mapped:input,options);};\n})();\n</script>`;
html=html.replace('<script type="text/babel"',hooks+'\n<script type="text/babel"');
html=html.replace(/<title>[^<]*<\/title>/i,'<title>Fabric AI · 交互原型（离线版）</title>');
html=html.replace('<!DOCTYPE html>','<!DOCTYPE html>\n<!-- Fabric AI standalone export; source revision: '+revision.replace(/[^a-zA-Z0-9._-]/g,'')+' -->');
if(/^<script\b[^>]*\bsrc=/im.test(html))throw Error('External script remains');
await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,html);
console.log(JSON.stringify({file:out,bytes:Buffer.byteLength(html),embeddedAssets:Object.keys(assets).length,inlineLibraries:scripts.length,revision},null,2));

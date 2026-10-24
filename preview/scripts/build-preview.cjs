// Rebuild the standalone preview from the React modules using the bundled Babel.
// No package installation or external network access is required.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const Babel=require(path.join(root,'assets/library/babel.min.js'));
const modules=new Map(),styles=new Set();
const externals={react:'React','react-dom':'ReactDOM','react-dom/client':'ReactDOM',antd:'antd','react-intl':'ReactIntl',dayjs:'dayjs'};
function visit(id){
 if(id.endsWith('.css')){styles.add(id);return}
 if(modules.has(id))return;
 const source=fs.readFileSync(path.join(root,id),'utf8');
 const code=Babel.transform(source,{filename:id,presets:[['react',{runtime:'classic'}]],plugins:['transform-modules-commonjs'],sourceType:'module',comments:true}).code;
 // Syntax verification also covers UC2, which is retained unchanged.
 new vm.Script('(function(require,module,exports){'+code+'\n})',{filename:id});
 modules.set(id,{code,deps:{}});
 for(const match of code.matchAll(/\brequire\(["']([^"']+)["']\)/g)){
  const spec=match[1];
  if(spec.startsWith('.')){const dep=path.posix.normalize(path.posix.join(path.posix.dirname(id),spec));modules.get(id).deps[spec]=dep;visit(dep)}
  else if(!externals[spec])throw Error('Unsupported external '+spec+' in '+id);
 }
}
visit('app.jsx');
const baseStyles=['base','light','theme','dark','ant'].map(name=>fs.readFileSync(path.join(root,'assets/style/'+name+'.css'),'utf8')).join('\n');
const css=baseStyles+'\n'+[...styles].map(id=>'/* '+id+' */\n'+fs.readFileSync(path.join(root,id),'utf8')).join('\n');
const lucide=fs.readFileSync(path.join(root,'assets/library/lucide-icon-nodes.json'),'utf8');
const bundle=`const LUCIDE=${lucide};\n(function(){\nconst modules={},cache={};\nconst external={${Object.entries(externals).map(([id,value])=>JSON.stringify(id)+':'+value).join(',')}};\n`+
 [...modules].map(([id,m])=>'modules['+JSON.stringify(id)+']={deps:'+JSON.stringify(m.deps)+',run:function(require,module,exports){\n'+m.code+'\n}};').join('\n')+
 `\nfunction load(id){if(Object.hasOwn(external,id))return external[id];if(id.endsWith('.css'))return {};if(cache[id])return cache[id].exports;const record=modules[id];if(!record)throw Error('Missing module '+id);const module={exports:{}};cache[id]=module;record.run(spec=>load(record.deps[spec]||spec),module,module.exports);return module.exports;}\nconst App=load('app.jsx').default;ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));\n})();`;
new vm.Script(bundle,{filename:'preview-bundle.js'});
const libs=['react.production.min.js','react-dom.production.min.js','dayjs.min.js','antd.min.js','echarts.min.js','hui-charts.umd.js','react-intl.umd.js'];
const html='<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ICT页面 · UC4 基线合规检查</title>\n'+libs.map(file=>'<script src="./assets/library/'+file+'"></script>').join('\n')+'\n<style>\n'+css+'\n</style></head><body><div id="root"></div><script>\n'+bundle.replace(/<\/script/gi,'<\\/script')+'\n</script></body></html>\n';
// Vendored assets may use CRLF; keep the generated document consistent for Git.
fs.writeFileSync(path.join(root,'index.page.html'),html.replace(/\r\n?/g,'\n').replace(/[\t ]+$/gm,''));
console.log('Built '+modules.size+' modules and '+styles.size+' styles into index.page.html.');
module.exports={modules,root};

const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../preview'),out=path.join(root,'assets/library/generative-loaders');
// Dependencies still belong to preview/package.json after the tools move.
const requirePreview=createRequire(path.join(root,'package.json')),esbuild=requirePreview('esbuild');
fs.mkdirSync(out,{recursive:true});
esbuild.buildSync({stdin:{contents:'export {InlineLoader} from "generative-loaders";',resolveDir:root,sourcefile:'generative-loaders-entry.js'},bundle:true,format:'cjs',platform:'browser',target:'es2020',external:['react','react/jsx-runtime','react-dom'],outfile:path.join(out,'index.cjs'),minify:true,legalComments:'inline'});
const pkg=path.join(root,'node_modules/generative-loaders');fs.copyFileSync(path.join(pkg,'dist/styles.css'),path.join(out,'styles.css'));fs.copyFileSync(path.join(pkg,'LICENSE'),path.join(out,'LICENSE'));console.log('Vendored generative-loaders InlineLoader.');

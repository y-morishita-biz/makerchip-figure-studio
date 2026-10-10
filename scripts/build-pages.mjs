// Assemble the GitHub Pages layout: site/ -> /, the Studio build -> /app/.
// Usage: node scripts/build-pages.mjs [--skip-app-build]   (output: _site/, not tracked)
import {cp,rm,mkdir,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// The Studio lives in generator/ in the development repository and in app/ in the public repository.
const root=fileURLToPath(new URL('..',import.meta.url)),out=root+'_site/',generator=root+(existsSync(root+'app/package.json')?'app/':'generator/');
if(!process.argv.includes('--skip-app-build'))execFileSync('npm',['run','build'],{cwd:generator,stdio:'inherit'});
await stat(generator+'dist/index.html');
await rm(out,{recursive:true,force:true});
await cp(root+'site/',out,{recursive:true,filter:src=>!src.endsWith('/README.md')});
await cp(generator+'dist/',out+'app/',{recursive:true});
// The page loads Three.js from the generator's locked dependency, so both stay on one version.
const three=generator+'node_modules/three/';await mkdir(out+'assets/vendor/addons/utils',{recursive:true});
for(const f of ['three.module.min.js','three.core.min.js'])await cp(three+'build/'+f,out+'assets/vendor/'+f);
await cp(three+'examples/jsm/utils/BufferGeometryUtils.js',out+'assets/vendor/addons/utils/BufferGeometryUtils.js');
await cp(three+'LICENSE',out+'assets/vendor/LICENSE-three.txt');
console.log('Pages assembled in _site/');

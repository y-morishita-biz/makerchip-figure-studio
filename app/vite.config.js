import {defineConfig} from 'vite';
import {cp,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
// Studio is fixed to v11. Dev serves all of public/, but the published build only ships what the Studio loads.
// Legacy meshes and illustrations stay in public/ for the CLI, tests and history.
export const PUBLIC_ASSETS=['assets/outfits-v11','assets/illustrations/registered-v2'];
const publicAssets=()=>{let config;return {name:'makerchip-public-assets',apply:'build',configResolved(c){config=c;},async writeBundle(){
 for(const dir of PUBLIC_ASSETS){const from=resolve(config.publicDir,dir);if(!(await stat(from).catch(()=>null))?.isDirectory())throw Error(`公開に必要な資産がありません: ${dir}`);await cp(from,resolve(config.root,config.build.outDir,dir),{recursive:true});}
}};};
export default defineConfig({base:'./',plugins:[publicAssets()],worker:{format:'es'},build:{target:'es2022',copyPublicDir:false}});

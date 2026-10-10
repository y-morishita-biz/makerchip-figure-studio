import fs from 'node:fs/promises';
import path from 'node:path';
import Module from 'manifold-3d';
import {studioConfig,validateConfig,configText,isOutfitSet,V11_ID,V10_ID} from '../src/config.js';
import {parseMesh,createGeometryEngine} from '../src/geometry.js';
import {generateOutfit} from '../src/outfit-engine.js';
import {exportBundle,export3MF} from '../src/export.js';
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?null:args[i+1];};
if(!get('--out'))throw Error('Usage: node scripts/generate.mjs --out NEW_DIRECTORY [--config settings.json]');
const destination=path.resolve(get('--out'));
const config=get('--config')?validateConfig(JSON.parse(await fs.readFile(get('--config'),'utf8'))):studioConfig();
await fs.mkdir(destination); // Refuse existing directories: never overwrite a previous print batch.
const readJSON=async url=>JSON.parse(await fs.readFile(url,'utf8'));
const assets={};let layout;
if(isOutfitSet(config.assetSet)){
 const version=config.assetSet===V11_ID?'outfits-v11':config.assetSet===V10_ID?'outfits-v10':'outfits-v9';
 const base=new URL(`../public/assets/${version}/`,import.meta.url),catalog=await readJSON(new URL('index.json',base));layout=catalog.layout;
 for(const [part,category] of Object.entries({'upper-body':'upper','lower-body':'lower','shoe-left':'shoes','shoe-right':'shoes'})){
  const entry=catalog.outfits.find(e=>e.outfit===config.outfit[category]);if(!entry)throw Error('衣装が見つかりません');
  const url=new URL(entry.manifest,base),manifest=await readJSON(url);
  if(manifest.interface!==layout.id)throw Error('配置版が一致しません');
  const file=manifest.files.find(f=>f.part===part);if(!file)throw Error(`部品が見つかりません: ${part}`);
  assets[part]=parseMesh(await fs.readFile(new URL(file.file,url)));
 }
 for(const part of ['ring-front','ring-back','chip'])assets[part]=parseMesh(await fs.readFile(new URL(`head-r01/${part}.mesh`,base)));
}else{
 const manifest=await readJSON(new URL('../public/assets/manifest.json',import.meta.url));
 for(const f of manifest.files)assets[f.id]=parseMesh(await fs.readFile(new URL('../public/assets/'+f.file,import.meta.url)));
}
const wasm=await Module();wasm.setup();const engine=layout?null:createGeometryEngine(wasm,assets);
try{const models=layout?generateOutfit(wasm,assets,layout,config):engine.generate(config);await fs.writeFile(path.join(destination,'parts.zip'),exportBundle(models,config));await fs.writeFile(path.join(destination,'figure.3mf'),export3MF(models,config));await fs.writeFile(path.join(destination,'settings.json'),configText(config));await fs.writeFile(path.join(destination,'summary.json'),JSON.stringify(models.map(({id,volume,bounds,triangles})=>({id,volumeMm3:volume,bounds,triangles})),null,2)+'\n');console.log(`${models.length} parts written to ${destination}`);}finally{engine?.dispose();}

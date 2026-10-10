import Module from 'manifold-3d';
import wasmURL from 'manifold-3d/manifold.wasm?url';
import {createGeometryEngine,parseMesh} from './geometry.js';
import {generateOutfit} from './outfit-engine.js';
import {validateConfig,V9_ID,V10_ID,V11_ID,isOutfitSet} from './config.js';
let engine,wasm;const cache=new Map();
async function read(url,type='json') {const key=url.href;if(cache.has(key))return cache.get(key);const r=await fetch(url);if(!r.ok)throw Error('部品を読み込めません。接続を確認して再試行してください。');const data=type==='mesh'?parseMesh(await r.arrayBuffer()):await r.json();cache.set(key,data);return data;}
self.onmessage=async({data})=>{
 const {id,assetBase}=data;
 try{
  const config=validateConfig(data.config);
  if(!wasm){wasm=await Module({locateFile:()=>wasmURL});wasm.setup();}
  let models;
  if(isOutfitSet(config.assetSet)){
   const base=new URL(config.assetSet===V11_ID?'outfits-v11/':config.assetSet===V10_ID?'outfits-v10/':'outfits-v9/',assetBase),catalog=await read(new URL('index.json',base)),assets={};
   await Promise.all(Object.entries({'upper-body':'upper','lower-body':'lower','shoe-left':'shoes','shoe-right':'shoes'}).map(async([part,category])=>{const entry=catalog.outfits.find(e=>e.outfit===config.outfit[category]);if(!entry)throw Error('衣装が見つかりません');const url=new URL(entry.manifest,base),manifest=await read(url);if(manifest.interface!==catalog.layout.id)throw Error('配置版が一致しません');const file=manifest.files.find(f=>f.part===part);assets[part]=await read(new URL(file.file,url),'mesh');}));
   await Promise.all(['ring-front','ring-back','chip'].map(async part=>assets[part]=await read(new URL(`head-r01/${part}.mesh`,base),'mesh')));
   models=generateOutfit(wasm,assets,catalog.layout,config);
  }else{
   if(!engine){const manifest=await read(new URL('manifest.json',assetBase)),assets={};await Promise.all(manifest.files.map(async a=>assets[a.id]=await read(new URL(a.file,assetBase),'mesh')));engine=createGeometryEngine(wasm,assets);}
   models=engine.generate(config);
  }
  self.postMessage({id,models},models.flatMap(m=>[m.positions.buffer,m.indices.buffer]));
 }catch(e){self.postMessage({id,error:e.message||'形状生成に失敗しました'});}
};

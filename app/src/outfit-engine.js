import {validateConfig,V9_ID,V10_ID,isOutfitSet} from './config.js';
import {createOutfitStockFitter} from '../scripts/outfit-stock-interface.mjs';
// Source stocks are already in final assembly coordinates. Never apply legacy transforms.
export function generateOutfit(w,assets,layout,input){
 const config=validateConfig(input);if(!isOutfitSet(config.assetSet))throw Error('衣装の配置版が必要です');if(layout.appearanceBasis!==config.assetSet)throw Error('部品と設定の配置版が一致しません');
 const owned=[],own=m=>(owned.push(m),m),shape=d=>own(new w.Manifold(new w.Mesh({numProp:3,vertProperties:d.positions,triVerts:d.indices})));
 try{
  const stocks=Object.fromEntries(['upper-body','lower-body','shoe-left','shoe-right'].map(id=>[id,shape(assets[id])]));
  const fitted=createOutfitStockFitter(w,own,{...layout,waistClearance:config.clearances.waist,footLeftClearance:config.clearances.footLeft,footRightClearance:config.clearances.footRight,neckClearance:config.clearances.neckPin})(stocks);
  for(const id of ['ring-front','ring-back','chip'])if(config.parts.includes(id))fitted[id]=shape(assets[id]);
  return config.parts.map(id=>{const m=fitted[id];if(!m||m.status()!=='NoError'||m.isEmpty())throw Error(`${id}を生成できません`);const pieces=m.decompose(),n=pieces.length;pieces.forEach(p=>p.delete());if(n!==1)throw Error(`${id}が分離しました`);const mesh=m.getMesh();return {id,positions:mesh.vertProperties.slice(),indices:mesh.triVerts.slice(),bounds:m.boundingBox(),volume:m.volume(),triangles:m.numTri()};});
 }finally{for(const m of owned.reverse())m.delete();}
}

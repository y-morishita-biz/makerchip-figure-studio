// Appearance layout is separate from fit clearance. Coordinates are assembly mm.
// v1 remains reproducible through settings.assetSet. v2 is an unprinted visual correction.
export const ALIGNED_ASSEMBLY = Object.freeze({
  id:'figure-v2-aligned-01',
  footPlane:10,waistPlane:19,footX:11,footY:0,
  lowerWidthScale:1.1,lowerHeightScale:2/3,lowerZOffset:3,
  cuffSpread:1.65,cuffTransitionTop:16,
  shoeWidthScale:1.1,shoeYOffset:-3,
  upperZOffset:-5,
});
export const V11_ASSEMBLY=Object.freeze({id:'outfits-v11-final-14',label:'v11 · 確定モデル'});
export const V10_ASSEMBLY=Object.freeze({id:'outfits-v10-neutral-14',label:'v10 · 20衣装 / 自然な立ち姿'});
export const V9_ASSEMBLY=Object.freeze({id:'outfits-v9-relaxed-14',label:'v9 · 20衣装 / 外向き14度'});
export const ASSEMBLIES = [
  V11_ASSEMBLY,
  V10_ASSEMBLY,
  V9_ASSEMBLY,
  {id:ALIGNED_ASSEMBLY.id,label:'v2 · 比率・接続位置調整'},
  {id:'figure-v1-neutral-01',label:'v1 · 調整前'},
];

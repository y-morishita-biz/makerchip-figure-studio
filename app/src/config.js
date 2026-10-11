import {ASSEMBLIES,ALIGNED_ASSEMBLY,V9_ASSEMBLY,V10_ASSEMBLY,V11_ASSEMBLY} from './assembly.js';
export const SCHEMA_VERSION = 5;
export const V9_ID=V9_ASSEMBLY.id;
export const V10_ID=V10_ASSEMBLY.id;
export const V11_ID=V11_ASSEMBLY.id;
export const isOutfitSet=id=>[V9_ID,V10_ID,V11_ID].includes(id);
export const OUTFITS=[
 ['original','パーカー'],['pocket-01','ポケットTシャツ'],['02-work-jacket','ワークジャケット'],['03-varsity-jacket','スタジャン'],['04-chef','コックコート'],['05-tailored-suit','テーラードスーツ'],['06-cable-knit','ケーブルニット'],['07-sailor','セーラー'],['08-tech-vest','テックベスト'],['09-casual-shirt','カジュアルシャツ'],['10-recruit-suit-men','リクルートスーツ(男性)'],['11-recruit-suit-women','リクルートスーツ(女性)'],['12-school-uniform-men','学生服(男性)'],['13-school-uniform-women','学生服(女性)'],['14-astronaut','宇宙飛行士'],['15-knight','騎士'],['16-pirate','海賊'],['17-festival-happi','お祭り法被'],['18-dinosaur','恐竜衣装'],['19-clown','ピエロ']
].map(([id,label])=>({id,label}));
export const CATEGORIES=[{id:'upper',label:'上着',parts:['upper-body']},{id:'lower',label:'ボトムス',parts:['lower-body']},{id:'shoes',label:'靴',parts:['shoe-left','shoe-right']}];
export const DEFAULT_COLORS={'upper-body':'#d8d4c9','lower-body':'#6d7972','shoe-left':'#eee9df','shoe-right':'#eee9df','ring-front':'#eee9df','ring-back':'#eee9df',spring:'#c7794c',chip:'#eee9df'};
export const availableParts=c=>PARTS.filter(p=>!isOutfitSet(c.assetSet)||p.id!=='spring');
export const activeConnections=c=>CONNECTIONS.filter(x=>isOutfitSet(c.assetSet)?['waist','footLeft','footRight','neckPin'].includes(x.id):x.id!=='neckPin');
export function studioConfig(){const c=presetConfig();c.assetSet=V11_ID;c.outfit={upper:'pocket-01',lower:'pocket-01',shoes:'pocket-01'};c.parts=PARTS.filter(p=>p.id!=='spring').map(p=>p.id);return c;}

export const PARTS = [
  {id:'upper-body',label:'パーカー',variant:'01',color:'#9caaa6'},
  {id:'lower-body',label:'ズボン',variant:'01',color:'#444f58'},
  {id:'shoe-left',label:'左の靴',variant:'スニーカー 01',color:'#e0d9c9'},
  {id:'shoe-right',label:'右の靴',variant:'スニーカー 01',color:'#e0d9c9'},
  {id:'ring-front',label:'前リング',variant:'リング v1',color:'#dad5c8'},
  {id:'ring-back',label:'後リング',variant:'リング v1',color:'#c2bcac'},
  {id:'spring',label:'蛇行バネ',variant:'交換式',color:'#c7794c'},
  {id:'chip',label:'ダミーチップ',variant:'40 × 3 mm',color:'#c6a652'},
];
export const CONNECTIONS = [
  {id:'neckPin',label:'首の六角ピン',group:'body',male:[6],unit:'片側',max:.4,description:'頭部の六角ピン → 上着の六角穴'},
  {id:'waist',label:'腰',group:'body',male:[14,10],unit:'片側',max:.5,description:'下半身の凸部 → 上半身の穴'},
  {id:'footLeft',label:'左足',group:'body',male:[4],unit:'片側',max:.5,description:'左靴のピン → 左脚の穴'},
  {id:'footRight',label:'右足',group:'body',male:[4],unit:'片側',max:.5,description:'右靴のピン → 右脚の穴'},
  {id:'springBottom',label:'バネ下端',group:'spring',male:[8,2.4],unit:'片側',max:.5,description:'バネの下端 → 襟の内側の固定穴'},
  {id:'springTop',label:'バネ上端',group:'spring',male:[6,2.4],unit:'片側',max:.5,description:'バネの上端 → 前リングの固定穴'},
  {id:'ringPins',label:'リング接合ピン',group:'ring',male:[1.6],unit:'片側',max:.3,description:'後リングの4本のピン → 前リング'},
  {id:'chipRadial',label:'チップの径方向',group:'ring',male:[40],unit:'片側',max:.4,description:'直径40 mmのチップ → 受け径'},
  {id:'chipAxial',label:'チップの厚み方向',group:'ring',male:[3],unit:'全体差',max:1,description:'厚み3 mmに加える空間'},
];
export const PRESETS = {
  local:{name:'標準 · 0.075 mm',note:'腰と左右の足を片側0.075 mmにします。Bambu Lab A1 miniで調整中の値です。',clearances:{neckPin:0,waist:.075,footLeft:.075,footRight:.075,springBottom:.2,springTop:.2,ringPins:.075,chipRadial:.2,chipAxial:.4},springWidth:.8},
  v1:{name:'ゆるめ · 0.2 mm',note:'腰と左右の足を片側0.2 mmにします。差し込みがきついときに使います。',clearances:{neckPin:0,waist:.2,footLeft:.2,footRight:.2,springBottom:.2,springTop:.2,ringPins:.2,chipRadial:.2,chipAxial:.4},springWidth:1},
};
export function presetConfig(id='local') {
  const p=PRESETS[id];if(!p)throw Error('不明なプリセットです');
  return {schemaVersion:SCHEMA_VERSION,outfit:{upper:'original',lower:'original',shoes:'original'},colors:{...DEFAULT_COLORS},assetSet:ALIGNED_ASSEMBLY.id,preset:id,parts:PARTS.filter(p=>p.id!=='chip').map(p=>p.id),springWidth:p.springWidth,clearances:{...p.clearances}};
}
export function validateConfig(input) {
  if(!input || typeof input!=='object' || Array.isArray(input))throw Error('設定JSONの形式が正しくありません');
  if(input.schemaVersion===1){input=structuredClone(input);input.schemaVersion=5;input.outfit={upper:'original',lower:'original',shoes:'original'};input.colors={...DEFAULT_COLORS};if(input.clearances)input.clearances.neckPin=0;}
  // v1/v2 part sets were renamed; settings saved under an earlier prefix read as the same set.
  if(typeof input.assetSet==='string'&&/^[a-z]+-v(1-neutral|2-aligned)-01$/.test(input.assetSet)&&!input.assetSet.startsWith('figure-'))input={...input,assetSet:input.assetSet.replace(/^[a-z]+-/,'figure-')};
  const allowed=['schemaVersion','assetSet','preset','parts','springWidth','clearances','outfit','colors'];
  if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('設定JSONに未対応の項目があります');
  if(input.schemaVersion!==SCHEMA_VERSION || !ASSEMBLIES.some(a=>a.id===input.assetSet))throw Error('未対応の設定バージョンまたは部品セットです');
  if(!input.outfit||Object.keys(input.outfit).length!==3||CATEGORIES.some(c=>!OUTFITS.some(o=>o.id===input.outfit[c.id])))throw Error('未対応の衣装です');
  if(!isOutfitSet(input.assetSet)&&Object.values(input.outfit).some(x=>x!=='original'))throw Error('衣装に対応していない部品セットです');
  if(!input.colors||Object.keys(input.colors).length!==PARTS.length||PARTS.some(p=>!/^#[0-9a-f]{6}$/i.test(input.colors[p.id])))throw Error('色の設定が正しくありません');
  if(isOutfitSet(input.assetSet)&&input.parts?.includes('spring'))throw Error('衣装モデルの頭部は六角ピン式です');
  if(!Array.isArray(input.parts) || !input.parts.length || new Set(input.parts).size!==input.parts.length || input.parts.some(id=>!PARTS.some(p=>p.id===id)))throw Error('部品を1つ以上、重複せず選択してください');
  if(![.8,1,1.2].includes(input.springWidth))throw Error('バネ線幅は0.8 / 1.0 / 1.2 mmから選択してください');
  if(!input.clearances || Object.keys(input.clearances).length!==CONNECTIONS.length)throw Error('クリアランスの項目が不足または過剰です');
  for(const c of CONNECTIONS){const v=input.clearances[c.id];if(typeof v!=='number'|| !Number.isFinite(v)||v<0||v>c.max)throw Error(`${c.label}は0〜${c.max} mmで指定してください`);}
  if(typeof input.preset!=='string' || input.preset.length>40)throw Error('プリセット名が正しくありません');
  return structuredClone(input);
}
export function socketDimensions(c,config){return c.male.map(v=>v+config.clearances[c.id]*(c.unit==='片側'?2:1));}
export function configText(config){return JSON.stringify(validateConfig(config),null,2)+'\n';}

// The interactive Studio always uses the finalized model; archival validation stays lossless.
export function toStudioConfig(input){
 const config=validateConfig(input);config.assetSet=V11_ID;config.parts=config.parts.filter(id=>id!=='spring');
 if(!config.parts.length)throw Error('バネのみの旧設定はv11で使用できません');
 return validateConfig(config);
}

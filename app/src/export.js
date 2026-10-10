import {zipSync,strToU8} from 'fflate';
import {validateConfig,V9_ID,V10_ID,isOutfitSet} from './config.js';
export function printMesh(model){
  const p=model.positions,positions=new Float32Array(p.length),min=[Infinity,Infinity,Infinity];
  for(let i=0;i<p.length;i+=3){let v=[p[i],p[i+1],p[i+2]];
    if(['ring-front','spring','chip'].includes(model.id))v=[v[0],-v[2],v[1]];
    if(model.id==='ring-back')v=[v[0],v[2],-v[1]];
    for(let j=0;j<3;j++){positions[i+j]=v[j];min[j]=Math.min(min[j],v[j]);}}
  for(let i=0;i<positions.length;i++)positions[i]-=min[i%3];
  return {...model,positions};
}
export function binarySTL(model){
  const {positions:p,indices:t}=printMesh(model),bytes=new Uint8Array(84+t.length/3*50),v=new DataView(bytes.buffer);
  bytes.set(strToU8('MakerChip Generator; millimetres'));v.setUint32(80,t.length/3,true);
  for(let f=0;f<t.length/3;f++){
    const a=t[f*3]*3,b=t[f*3+1]*3,c=t[f*3+2]*3,u=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],w=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]];
    let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],len=Math.hypot(...n)||1;
    const values=[...n.map(x=>x/len),...p.subarray(a,a+3),...p.subarray(b,b+3),...p.subarray(c,c+3)];
    values.forEach((x,i)=>v.setFloat32(84+f*50+i*4,x,true));
  }return bytes;
}
export function exportBundle(models,input){
  const config=validateConfig(input),files={};
  for(const m of models)files[`${m.id}.stl`]=binarySTL(m);
  files['settings.json']=strToU8(JSON.stringify(config,null,2)+'\n');
  const note=isOutfitSet(config.assetSet)?'六角ピン式。腰・左右足・首の穴のみ設定値を適用。採用済み頭部のねじ・チップ嵌合寸法は固定です。色はsettings.jsonに保存され、STLには含まれません。\n':'';
  files['README.txt']=strToU8(note+'MakerChip Generator\n単位: mm。100%の縮尺で読み込んでください。各STLは造形向きで底面をZ=0へ配置済みです。\nクリアランスはsettings.jsonに記録。片側量は穴の幅・径へ2倍を加算し、チップ厚みは全体差を加算しています。\nこの出力は未スライスです。プリンタ・材料・積層・サポートの設定はお使いの環境に合わせて見直し、嵌合を確認してください(確認環境: Bambu Lab A1 mini / PLA / 0.4 mm)。\n');
  return zipSync(files,{level:6});
}

// Colored 3MF (core + materials extension colorgroup): one object per part, one color per distinct color,
// laid out in print orientation on the A1 mini plate. Bambu Studio reads only m:colorgroup (not basematerials)
// from third-party 3MF, with the literal "m:" prefix, and then offers to map each color to a filament.
export const PLATE=Object.freeze({width:180,depth:180,gap:6});
const PART_NAMES={'upper-body':'上着','lower-body':'ボトムス','shoe-left':'左の靴','shoe-right':'右の靴','ring-front':'前リング','ring-back':'後リング',spring:'バネ',chip:'チップ'};
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Seven decimals keep float32 detail, so rounding never merges two corners of a face (six still merged a few).
const num=v=>{const s=v.toFixed(7);return s.includes('.')?s.replace(/\.?0+$/,''):s;};
function extent(p){const max=[0,0,0];for(let i=0;i<p.length;i++)max[i%3]=Math.max(max[i%3],p[i]);return max;}
// Shelf packing, tallest footprint first, then centered on the plate. Parts that cannot fit still get a slot past the edge.
export function layoutPlate(sizes,plate=PLATE){
  const order=sizes.map((s,i)=>i).sort((a,b)=>sizes[b][1]-sizes[a][1]||sizes[b][0]-sizes[a][0]),pos=[];let x=0,y=0,row=0,width=0;
  for(const i of order){const [w,d]=sizes[i];if(x>0&&x+w>plate.width){y+=row+plate.gap;x=0;row=0;}pos[i]=[x,y];x+=w+plate.gap;row=Math.max(row,d);width=Math.max(width,x-plate.gap);}
  const ox=(plate.width-width)/2,oy=(plate.depth-(y+row))/2;
  return {positions:pos.map(([x,y])=>[x+ox,y+oy]),fits:width<=plate.width&&y+row<=plate.depth};
}
export function build3MF(models,input){
  const config=validateConfig(input),meshes=models.map(printMesh),sizes=meshes.map(m=>extent(m.positions)),{positions,fits}=layoutPlate(sizes);
  const colors=[...new Set(models.map(m=>config.colors[m.id].toUpperCase()))];
  const group=colors.map(c=>`<m:color color="${c}FF"/>`).join('');
  const objects=meshes.map((m,i)=>{const p=m.positions,t=m.indices,v=[],f=[];
    for(let j=0;j<p.length;j+=3)v.push(`<vertex x="${num(p[j])}" y="${num(p[j+1])}" z="${num(p[j+2])}"/>`);
    for(let j=0;j<t.length;j+=3)f.push(`<triangle v1="${t[j]}" v2="${t[j+1]}" v3="${t[j+2]}"/>`);
    return `<object id="${i+2}" type="model" name="${xml(PART_NAMES[m.id]||m.id)}" pid="1" pindex="${colors.indexOf(config.colors[m.id].toUpperCase())}"><mesh><vertices>${v.join('')}</vertices><triangles>${f.join('')}</triangles></mesh></object>`;}).join('');
  const items=meshes.map((m,i)=>`<item objectid="${i+2}" transform="1 0 0 0 1 0 0 0 1 ${num(positions[i][0])} ${num(positions[i][1])} 0"/>`).join('');
  const model=`<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="ja-JP" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02"><metadata name="Title">MakerChip Figure</metadata><metadata name="Application">MakerChip Figure Studio</metadata><resources><m:colorgroup id="1">${group}</m:colorgroup>${objects}</resources><build>${items}</build></model>\n`;
  const bytes=zipSync({
    '[Content_Types].xml':strToU8('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>\n'),
    '_rels/.rels':strToU8('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>\n'),
    '3D/3dmodel.model':strToU8(model),
  },{level:6});
  return {bytes,fits};
}
export const export3MF=(models,input)=>build3MF(models,input).bytes;

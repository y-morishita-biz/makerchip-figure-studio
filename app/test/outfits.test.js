import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {existsSync} from 'node:fs';
import Module from 'manifold-3d';
import {unzipSync,strFromU8} from 'fflate';
import {studioConfig,presetConfig,validateConfig,configText,OUTFITS,V11_ID,toStudioConfig} from '../src/config.js';
import {parseMesh,createGeometryEngine} from '../src/geometry.js';
import {generateOutfit} from '../src/outfit-engine.js';
import {exportBundle,binarySTL,export3MF,PLATE,printMesh} from '../src/export.js';
// The public repository ships only the v11 assets; history checks run where the older sets exist.
const hasV9=existsSync(new URL('../public/assets/outfits-v9/index.json',import.meta.url)),hasV1=existsSync(new URL('../public/assets/manifest.json',import.meta.url));
const folder=new URL('../public/assets/outfits-v11/',import.meta.url),catalog=JSON.parse(await fs.readFile(new URL('index.json',folder))),w=await Module();w.setup();
const head={};for(const p of ['ring-front','ring-back','chip'])head[p]=parseMesh(await fs.readFile(new URL(`head-r01/${p}.mesh`,folder)));
async function assetsFor(config){const a={...head};for(const [part,cat] of Object.entries({'upper-body':'upper','lower-body':'lower','shoe-left':'shoes','shoe-right':'shoes'})){const item=catalog.outfits.find(x=>x.outfit===config.outfit[cat]);a[part]=parseMesh(await fs.readFile(new URL(part+'.mesh',new URL(item.manifest,folder))));}return a;}
function solid(m){return new w.Manifold(new w.Mesh({numProp:3,vertProperties:m.positions,triVerts:m.indices}));}
const config=studioConfig(),assets=await assetsFor(config),models=generateOutfit(w,assets,catalog.layout,config);
test('schema 5 outfit/color roundtrip and legacy schema 1 migration preserve assetSet',()=>{assert.deepEqual(validateConfig(JSON.parse(configText(config))),config);const legacy=createGeometryEngine(w,{});assert.throws(()=>legacy.generate(config),/v9/);legacy.dispose();const c=presetConfig();c.schemaVersion=1;delete c.colors;delete c.outfit;delete c.clearances.neckPin;const original=structuredClone(c),v=validateConfig(c);assert.equal(v.schemaVersion,5);assert.equal(v.assetSet,c.assetSet);assert.deepEqual(c,original);for(const change of [c=>c.outfit.upper='missing',c=>c.colors.chip='red',c=>c.parts.push('spring'),c=>c.clearances.neckPin=.5]){const c=structuredClone(config);change(c);assert.throws(()=>validateConfig(c));}});
test('catalog registration matches all 20 v11 stock IDs; every outfit generates seven closed solids',async()=>{assert.deepEqual(OUTFITS.map(x=>x.id),catalog.outfits.map(x=>x.outfit));for(const o of OUTFITS){const c=studioConfig();c.outfit={upper:o.id,lower:o.id,shoes:o.id};const ms=generateOutfit(w,await assetsFor(c),catalog.layout,c);assert.equal(ms.length,7);for(const m of ms){assert.ok(m.volume>0,`${o.id}/${m.id}`);assert.ok(m.triangles>0);}}});
test('v11 nominal assembly has no pairwise penetration and correct vertical layout',()=>{const solids=models.map(solid);try{for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++){const m=solids[i].intersect(solids[j]);assert.ok(Math.abs(m.volume())<.0001,`${models[i].id}/${models[j].id}`);m.delete();}}finally{solids.forEach(x=>x.delete());}assert.equal(models.find(x=>x.id==='upper-body').bounds.min[2],24);assert.equal(models.find(x=>x.id==='lower-body').bounds.min[2],9);assert.ok(Math.abs(models.find(x=>x.id==='ring-front').bounds.max[2]-97.4)<.001);});
test('left foot clearance changes only its hole and leaves right hole and head unchanged',()=>{const c=studioConfig();c.clearances.footLeft=.25;const ms=generateOutfit(w,assets,catalog.layout,c),lower=solid(ms.find(x=>x.id==='lower-body')),slice=lower.slice(11),polys=slice.toPolygons();const width=x=>{const p=polys.map(p=>({min:Math.min(...p.map(v=>v[0])),max:Math.max(...p.map(v=>v[0]))})).find(p=>Math.abs((p.min+p.max)/2-x)<.01&&p.max-p.min<6);assert.ok(p);return p.max-p.min;};assert.ok(Math.abs(width(-11)-4.5)<.001);assert.ok(Math.abs(width(11)-4.15)<.001);slice.delete();lower.delete();assert.deepEqual(ms.find(x=>x.id==='ring-front').positions,models.find(x=>x.id==='ring-front').positions);});
test('v11 supported clearance endpoints generate closed solids without changing external source',()=>{for(const value of [0,.4,.5]){const c=studioConfig();c.clearances.waist=value;c.clearances.footLeft=value;c.clearances.footRight=value;c.clearances.neckPin=Math.min(.4,value);for(const m of generateOutfit(w,assets,catalog.layout,c))assert.ok(m.volume>0);}});
test('mixed outfit ZIP matches individual STL bytes, configuration and requested subset',async()=>{const c=studioConfig();c.outfit={upper:'02-work-jacket',lower:'13-school-uniform-women',shoes:'14-astronaut'};c.parts=['upper-body','shoe-right','ring-front'];c.colors['upper-body']='#cd8171';const ms=generateOutfit(w,await assetsFor(c),catalog.layout,c),zip=unzipSync(exportBundle(ms,c));assert.deepEqual(JSON.parse(strFromU8(zip['settings.json'])),c);assert.equal(ms.length,3);for(const m of ms)assert.deepEqual(zip[m.id+'.stl'],binarySTL(m));});
test('fixed head provenance hashes and every registered illustration exist',async()=>{const manifest=JSON.parse(await fs.readFile(new URL('head-r01/manifest.json',folder)));for(const f of manifest.files){const b=await fs.readFile(new URL('head-r01/'+f.file,folder));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}for(const o of OUTFITS)await fs.access(new URL(`../public/assets/illustrations/registered-v2/source/${o.id}.png`,import.meta.url));});

test('schema 5 preserves explicit v9 assetSet for saved settings',()=>{const c=studioConfig();c.assetSet='outfits-v9-relaxed-14';assert.equal(validateConfig(JSON.parse(configText(c))).assetSet,c.assetSet);});

test('v9 saved settings use original v9 meshes, reject mixed layout versions',{skip:!hasV9&&'v9 assets are not in this checkout'},async()=>{const old=structuredClone(config);old.assetSet='outfits-v9-relaxed-14';const oldFolder=new URL('../public/assets/outfits-v9/',import.meta.url),oldCatalog=JSON.parse(await fs.readFile(new URL('index.json',oldFolder))),a={...head};for(const [part,cat] of Object.entries({'upper-body':'upper','lower-body':'lower','shoe-left':'shoes','shoe-right':'shoes'})){const e=oldCatalog.outfits.find(o=>o.outfit===old.outfit[cat]);a[part]=parseMesh(await fs.readFile(new URL(part+'.mesh',new URL(e.manifest,oldFolder))));}const legacy=generateOutfit(w,a,oldCatalog.layout,old);assert.equal(legacy.length,7);assert.notEqual(legacy.find(m=>m.id==='lower-body').volume,models.find(m=>m.id==='lower-body').volume);assert.throws(()=>generateOutfit(w,a,oldCatalog.layout,config),/配置版/);});

test('Studio locks restored and imported settings to v11 without mutating the original',()=>{for(const assetSet of ['outfits-v9-relaxed-14','outfits-v10-neutral-14',V11_ID]){const old=studioConfig();old.assetSet=assetSet;old.outfit.shoes='19-clown';old.clearances.footLeft=.125;old.colors['shoe-left']='#123456';const original=structuredClone(old),migrated=toStudioConfig(old);assert.equal(migrated.assetSet,V11_ID);assert.equal(migrated.outfit.shoes,old.outfit.shoes);assert.equal(migrated.clearances.footLeft,.125);assert.equal(migrated.colors['shoe-left'],'#123456');assert.deepEqual(old,original);}const legacy=presetConfig();assert.ok(legacy.parts.includes('spring'));assert.ok(!toStudioConfig(legacy).parts.includes('spring'));legacy.parts=['spring'];assert.throws(()=>toStudioConfig(legacy),/バネのみ/);});

test('CLI defaults to v11 and reproduces Studio STL bytes from mixed saved settings',async()=>{
 const {execFile}=await import('node:child_process'),{promisify}=await import('node:util'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const run=promisify(execFile),dir=await fs.mkdtemp(join(tmpdir(),'makerchip-cli-')),script=new URL('../scripts/generate.mjs',import.meta.url).pathname;
 try{
  const output=join(dir,'default');await run(process.execPath,[script,'--out',output]);
  const saved=JSON.parse(await fs.readFile(join(output,'settings.json'),'utf8'));assert.deepEqual(saved,studioConfig());
  const bundle=unzipSync(await fs.readFile(join(output,'parts.zip')));for(const m of models)assert.deepEqual(bundle[m.id+'.stl'],binarySTL(m));
  await assert.rejects(run(process.execPath,[script,'--out',output]),/EEXIST/);
  const c=studioConfig();c.outfit={upper:'02-work-jacket',lower:'11-recruit-suit-women',shoes:'19-clown'};c.parts=['lower-body','shoe-left','shoe-right'];c.clearances.footLeft=.125;
  const input=join(dir,'input.json');await fs.writeFile(input,configText(c));
  const mixed=join(dir,'mixed');await run(process.execPath,[script,'--out',mixed,'--config',input]);
  const zip=unzipSync(await fs.readFile(join(mixed,'parts.zip')));assert.deepEqual(JSON.parse(strFromU8(zip['settings.json'])),c);
  const expected=generateOutfit(w,await assetsFor(c),catalog.layout,c);assert.equal(Object.keys(zip).filter(p=>p.endsWith('.stl')).length,3);
  for(const m of expected)assert.deepEqual(zip[m.id+'.stl'],binarySTL(m));
  if(!hasV1)return;
  const old=presetConfig();old.parts=['shoe-left'];await fs.writeFile(input,configText(old));const legacy=join(dir,'legacy');await run(process.execPath,[script,'--out',legacy,'--config',input]);
  assert.deepEqual(JSON.parse(await fs.readFile(join(legacy,'settings.json'),'utf8')),old);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('colored 3MF holds every part once, one colorgroup entry per color, laid out inside the A1 mini plate without overlap',()=>{
 const c=studioConfig();Object.assign(c.colors,{'upper-body':'#eee9df','lower-body':'#668598','shoe-left':'#cd8171','shoe-right':'#cd8171','ring-front':'#dda54f','ring-back':'#dda54f',chip:'#444647'});
 const files=unzipSync(export3MF(models,c));assert.deepEqual(Object.keys(files).sort(),['3D/3dmodel.model','[Content_Types].xml','_rels/.rels']);
 assert.match(strFromU8(files['_rels/.rels']),/Target="\/3D\/3dmodel.model"/);
 const xml=strFromU8(files['3D/3dmodel.model']);assert.match(xml,/<model unit="millimeter"/);
 assert.match(xml,/xmlns:m="http:\/\/schemas.microsoft.com\/3dmanufacturing\/material\/2015\/02"/);assert.doesNotMatch(xml,/basematerials/);
 const bases=[...xml.matchAll(/<m:color color="(#[0-9A-F]{8})"\/>/g)].map(m=>m[1]);assert.deepEqual(bases,['#EEE9DFFF','#668598FF','#CD8171FF','#DDA54FFF','#444647FF'].filter(h=>models.some(m=>c.colors[m.id].toUpperCase()+'FF'===h)));
 const objects=[...xml.matchAll(/<object id="(\d+)" type="model" name="[^"]*" pid="1" pindex="(\d+)"><mesh><vertices>(.*?)<\/vertices><triangles>(.*?)<\/triangles>/g)];assert.equal(objects.length,models.length);
 const ids=[...xml.matchAll(/<(?:m:colorgroup|object) id="(\d+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'resource ids are unique');assert.equal((xml.match(/<item /g)||[]).length,models.length);
 const items=Object.fromEntries([...xml.matchAll(/<item objectid="(\d+)" transform="1 0 0 0 1 0 0 0 1 ([\d.-]+) ([\d.-]+) 0"\/>/g)].map(m=>[m[1],[+m[2],+m[3]]]));
 const boxes=objects.map(([,id,pindex,vertices,triangles],i)=>{
  assert.equal(bases[+pindex],c.colors[models[i].id].toUpperCase()+'FF');
  const t=[...triangles.matchAll(/v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)].flatMap(m=>m.slice(1).map(Number));assert.deepEqual(t,[...models[i].indices],'faces keep source order and winding');
  const raw=[...vertices.matchAll(/x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)].map(m=>m.slice(1)),v=raw.map(p=>p.map(Number)),[tx,ty]=items[id];assert.equal(v.length*3,models[i].positions.length);
  // Rounding must not merge two corners of a face that were distinct in the float32 source.
  const src=printMesh(models[i]).positions,same=(a,b,k)=>k?raw[a].join()===raw[b].join():src[a*3]===src[b*3]&&src[a*3+1]===src[b*3+1]&&src[a*3+2]===src[b*3+2];
  for(let f=0;f<t.length;f+=3)for(const [a,b] of [[t[f],t[f+1]],[t[f+1],t[f+2]],[t[f],t[f+2]]])if(same(a,b,true))assert.ok(same(a,b,false),'no rounding-induced degenerate face');
  const min=[0,1,2].map(k=>Math.min(...v.map(p=>p[k]))),max=[0,1].map(k=>Math.max(...v.map(p=>p[k])));assert.ok(Math.abs(min[2])<1e-3,'part rests on Z=0');
  return [min[0]+tx,min[1]+ty,max[0]+tx,max[1]+ty];
 });
 for(const [x0,y0,x1,y1] of boxes)assert.ok(x0>=0&&y0>=0&&x1<=PLATE.width&&y1<=PLATE.depth,'inside plate');
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1],'no overlap');}
});

test('v1/v2 settings saved under an earlier part-set prefix read as the renamed set',()=>{
 for(const [old,next] of [['proto-v1-neutral-01','figure-v1-neutral-01'],['proto-v2-aligned-01','figure-v2-aligned-01']]){const c=presetConfig();c.assetSet=old;assert.equal(validateConfig(c).assetSet,next);assert.equal(c.assetSet,old,'input is not mutated');}
 const c=presetConfig();c.assetSet='proto-v3-neutral-01';assert.throws(()=>validateConfig(c),/未対応/);
});

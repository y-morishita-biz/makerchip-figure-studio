import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import {studioConfig,presetConfig} from '../../src/config.js';
const ready=async page=>{await page.locator('#make').click();await expect(page.locator('main')).toHaveAttribute('data-state','edit',{timeout:60000});await expect(page.locator('#download')).toBeEnabled();};
const settings=async page=>{await page.locator('#open-settings').click();await expect(page.locator('#settings')).toBeVisible();};
test('image-first montage, keyboard catalog and same-stage reveal with color persistence',async({page},info)=>{
 const requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));await page.goto('./');await expect(page.locator('#make')).toBeEnabled();await expect(page.locator('canvas')).toHaveCount(0);expect(requests.some(x=>x.endsWith('.mesh'))).toBe(false);await expect(page.locator('.montage')).toBeVisible();await page.screenshot({path:info.outputPath('choose-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'次の上着',exact:true}).click();await expect(page.locator('[data-summary="upper"]')).toHaveText('ワークジャケット');await expect(page.locator('.montage')).toBeVisible();await page.locator('#browse').click();await expect(page.locator('[data-outfit]')).toHaveCount(20);await page.getByRole('tab',{name:'ボトムス'}).click();await page.locator('[data-outfit="06-cable-knit"]').click();await expect(page.locator('#catalog')).not.toBeVisible();
 await page.locator('#make').click();await expect(page.locator('#make')).toBeDisabled();await expect(page.locator('main')).toHaveAttribute('data-state','reveal',{timeout:60000});await page.screenshot({path:info.outputPath('reveal-front.png')});await expect(page.locator('main')).toHaveAttribute('data-state','edit');await expect(page.locator('#artwork')).not.toBeVisible();await expect(page.locator('canvas')).toBeVisible();await page.getByRole('button',{name:'クレイ',exact:true}).click();await expect(page.locator('#custom-color')).toHaveValue('#cd8171');await page.screenshot({path:info.outputPath('edit-desktop.png'),fullPage:true});
 await page.locator('#back').click();await expect(page.locator('#make')).toBeVisible();await page.getByRole('button',{name:'次の靴',exact:true}).click();await ready(page);await expect(page.locator('#custom-color')).toHaveValue('#cd8171');expect(errors).toEqual([]);expect(requests.filter(x=>x.startsWith('http')).filter(x=>new URL(x).hostname!==new URL(page.url()).hostname)).toEqual([]);
});
test('color chips and 3D taps select the part to paint, drags do not, shoes link and unlink',async({page})=>{
 await page.goto('./');await page.evaluate(()=>localStorage.clear());await page.reload();await ready(page);
 const selected=()=>page.locator('#color-parts [aria-pressed=true]').getAttribute('data-target'),colors=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('makerchip.studio.v7')).colors);
 await expect(page.locator('#color-parts button')).toHaveText(['上着','ボトムス','靴','リング','チップ']);
 await page.locator('[data-target="lower-body"]').click();await page.getByRole('button',{name:'クレイ',exact:true}).click();expect((await colors())['lower-body']).toBe('#cd8171');await expect(page.locator('[data-target="lower-body"] .chip-dot')).toHaveAttribute('style',/#cd8171/);
 await page.locator('[data-view="front"]').click();await page.waitForTimeout(800);const box=await page.locator('canvas').boundingBox(),x=box.x+box.width/2,y=box.y+box.height*.55;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+60,y,{steps:5});await page.mouse.up();expect(await selected()).toBe('lower-body');
 await page.locator('[data-view="front"]').click();await page.waitForTimeout(800);await page.mouse.click(x,y);expect(await selected()).not.toBe('lower-body');expect(['upper-body','head']).toContain(await selected());
 await page.locator('#link-shoes').uncheck();await expect(page.locator('#color-parts button')).toHaveText(['上着','ボトムス','左の靴','右の靴','リング','チップ']);
 await page.locator('[data-target="shoe-right"]').click();await page.getByRole('button',{name:'ブルー',exact:true}).click();let c=await colors();expect(c['shoe-right']).toBe('#668598');expect(c['shoe-left']).not.toBe('#668598');
 await page.locator('#link-shoes').check();await expect(page.locator('[data-target="shoes"]')).toBeVisible();c=await colors();expect(c['shoe-right']).toBe(c['shoe-left']);
 await page.locator('#back').click();await page.locator('#make').click();await expect(page.locator('main')).toHaveAttribute('data-state','edit',{timeout:60000});await expect(page.locator('#link-shoes')).toBeChecked();
});

test('introduction page link opens its outfits and colors once, then clears the hash',async({page})=>{
 await page.goto('./#upper=16-pirate&lower=04-chef&shoes=19-clown&colors=dda54f,668598,cd8171,444647');
 await expect(page.locator('[data-summary="upper"]')).toHaveText('海賊');await expect(page.locator('#notice')).toHaveText('紹介ページの組み合わせを開きました。');expect(new URL(page.url()).hash).toBe('');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('makerchip.studio.v7')));expect(saved.outfit).toEqual({upper:'16-pirate',lower:'04-chef',shoes:'19-clown'});expect([saved.colors['shoe-left'],saved.colors['shoe-right'],saved.colors['ring-front']]).toEqual(['#cd8171','#cd8171','#444647']);
 await page.goto('about:blank');await page.goto('./#upper=not-an-outfit');await expect(page.locator('[data-summary="upper"]')).toHaveText('海賊');await expect(page.locator('#notice')).toContainText('リンクの組み合わせを読めなかった');
 await expect(page.locator('#step-home')).toHaveAttribute('href','../');
});

test('colored 3MF download matches the shown parts and current colors, and is blocked while regenerating',async({page})=>{
 await page.goto('./');await page.evaluate(()=>localStorage.clear());await page.reload();await expect(page.locator('#download-3mf')).toBeHidden();await ready(page);
 await page.locator('[data-target="lower-body"]').click();await page.getByRole('button',{name:'ブルー',exact:true}).click();
 const [file]=await Promise.all([page.waitForEvent('download'),page.locator('#download-3mf').click()]);expect(file.suggestedFilename()).toBe('makerchip-figure.3mf');
 const files=unzipSync(await fs.readFile(await file.path())),xml=strFromU8(files['3D/3dmodel.model']);
 expect((xml.match(/<object /g)||[]).length).toBe(await page.locator('#single-part option').count());
 const lower=xml.match(/<object id="\d+" type="model" name="ボトムス" pid="1" pindex="(\d+)"/)[1],bases=[...xml.matchAll(/<m:color color="(#[0-9A-F]{8})"/g)].map(m=>m[1]);expect(bases[+lower]).toBe('#668598FF');
 await settings(page);await page.locator('#c-waist').fill('0.1');await expect(page.locator('#download-3mf')).toBeDisabled();await expect(page.locator('#download-3mf')).toBeEnabled({timeout:60000});
});

test('independent clearance, invalid input guard, subset and ZIP/individual STL agreement',async({page})=>{
 await page.goto('./');await ready(page);await settings(page);await page.locator('#c-footLeft').fill('0.125');await expect(page.locator('#download')).toBeEnabled();await expect(page.locator('#d-footLeft')).toContainText('4.25');await expect(page.locator('#c-footRight')).toHaveValue('0.075');
 await page.locator('#c-waist').fill('');await expect(page.locator('#download')).toBeDisabled();await expect(page.locator('#download-single')).toBeDisabled();await expect(page.locator('#notice')).toContainText('数値');await page.locator('#c-waist').fill('0.075');await expect(page.locator('#download')).toBeEnabled();
 for(const id of ['lower-body','shoe-left','shoe-right','ring-back','chip'])await page.locator(`[data-part="${id}"]`).uncheck();await expect(page.locator('#part-count')).toHaveText('2 / 7');await expect(page.locator('#download-single')).toBeEnabled();await page.locator('#single-part').selectOption('upper-body');const singleEvent=page.waitForEvent('download');await page.locator('#download-single').click();const single=await singleEvent,singleBytes=await fs.readFile(await single.path());
 await page.locator('[data-close="settings"]').click();const zipEvent=page.waitForEvent('download');await page.locator('#download').click();const file=await zipEvent,zip=unzipSync(await fs.readFile(await file.path()));expect(Object.keys(zip).sort()).toEqual(['README.txt','ring-front.stl','settings.json','upper-body.stl']);expect(zip['upper-body.stl']).toEqual(new Uint8Array(singleBytes));const c=JSON.parse(strFromU8(zip['settings.json']));expect(c.clearances.footLeft).toBe(.125);expect(c.outfit.upper).toBe('pocket-01');expect(c.schemaVersion).toBe(5);
});
test('valid import, invalid import preserves settings; persistence opens illustration first',async({page})=>{
 await page.goto('./');const c=studioConfig();c.outfit.upper='14-astronaut';c.colors['upper-body']='#668598';await page.locator('#settings-file').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(c))});await expect(page.locator('[data-summary="upper"]')).toHaveText('宇宙飛行士');await page.locator('#settings-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":99}')});await expect(page.locator('#notice')).toContainText('未対応');await expect(page.locator('[data-summary="upper"]')).toHaveText('宇宙飛行士');await ready(page);await expect(page.locator('#custom-color')).toHaveValue('#668598');await page.reload();await expect(page.locator('canvas')).toHaveCount(0);await expect(page.locator('[data-summary="upper"]')).toHaveText('宇宙飛行士');await ready(page);await expect(page.locator('#custom-color')).toHaveValue('#668598');
});
test('mobile, keyboard focus, reduced motion and scrollable settings',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('mobile-choose.png'),fullPage:true});await ready(page);await expect(page.locator('#color-parts [aria-pressed=true]')).toBeFocused();await page.locator('#explode').click();await expect(page.locator('#explode')).toHaveAttribute('aria-pressed','true');await page.screenshot({path:info.outputPath('mobile-edit.png'),fullPage:true});await settings(page);await page.locator('#c-waist').fill('0.1');await expect(page.locator('#download-single')).toBeEnabled();await page.keyboard.press('Escape');await expect(page.locator('#settings')).not.toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Studio uses v11 with no model selector and preserves the original saved record',async({page},info)=>{
 const old=presetConfig();old.schemaVersion=1;old.assetSet='figure-v1-neutral-01';old.clearances.footLeft=.125;delete old.colors;delete old.outfit;delete old.clearances.neckPin;
 await page.addInitScript(c=>{if(!localStorage.getItem('makerchip.generator.v1'))localStorage.setItem('makerchip.generator.v1',JSON.stringify(c));},old);
 const meshes=[];page.on('request',r=>{if(r.url().endsWith('.mesh'))meshes.push(r.url());});await page.goto('./');await ready(page);await settings(page);await expect(page.locator('#assembly-version')).toHaveCount(0);await expect(page.locator('#model-version')).toHaveText('モデル: v11');await expect(page.locator('#c-footLeft')).toHaveValue('0.125');expect(meshes.length).toBeGreaterThan(0);expect(meshes.every(u=>u.includes('/outfits-v11/'))).toBe(true);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('makerchip.generator.v1')).schemaVersion)).toBe(1);await expect(page.locator('#spring-field')).not.toBeVisible();await page.screenshot({path:info.outputPath('v11-fixed-settings.png'),fullPage:true,animations:'disabled'});
 await page.keyboard.press('Escape');const legacy=studioConfig();legacy.assetSet='outfits-v10-neutral-14';legacy.outfit.shoes='11-recruit-suit-women';await page.locator('#settings-file').setInputFiles({name:'v10.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await expect(page.locator('#notice')).toContainText('設定を読み込みました');await ready(page);expect(meshes.every(u=>u.includes('/outfits-v11/'))).toBe(true);
});
test('failed asset load can retry without stale export',async({page})=>{
 let block=true;await page.route('**/outfits-v11/**/upper-body.mesh',route=>block?route.abort():route.continue());await page.goto('./');await page.locator('#make').click();await expect(page.locator('#make span')).toHaveText('もう一度つくる',{timeout:60000});await expect(page.locator('#download')).toBeDisabled();block=false;await ready(page);await expect(page.locator('canvas')).toBeVisible();
});

test('failed illustration load retries on the next selection',async({page})=>{
 let block=true;await page.route('**/registered-v2/registration.json',route=>block?route.abort():route.continue());await page.goto('./');await expect(page.locator('.montage [data-error="true"]')).toHaveCount(3);block=false;await page.locator('[data-cycle="upper"][data-direction="1"]').click();await page.locator('[data-cycle="upper"][data-direction="-1"]').click();await expect.poll(()=>page.locator('.montage [data-ready="true"]').count()).toBe(3);await expect.poll(()=>page.locator('.ink-head').evaluate(i=>i.naturalWidth)).toBe(1000);
});

test('retina narrow viewport fits its canvas, pans, and recenters after resize',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
 const page=await context.newPage();await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');await ready(page);
 const canvas=page.locator('#viewport canvas');
 async function canvasFits(){const sizes=await canvas.evaluate(c=>({buffer:[c.width,c.height],canvas:[c.clientWidth,c.clientHeight],parent:[c.parentElement.clientWidth,c.parentElement.clientHeight],dpr:devicePixelRatio}));expect(sizes.canvas).toEqual(sizes.parent);expect(sizes.buffer[0]).toBe(Math.floor(sizes.parent[0]*Math.min(sizes.dpr,2)));expect(sizes.buffer[1]).toBe(Math.floor(sizes.parent[1]*Math.min(sizes.dpr,2)));}
 await canvasFits();await page.locator('[data-view="front"]').click();await page.screenshot({path:info.outputPath('retina-centered.png'),fullPage:true});
 const before=await canvas.screenshot();const bounds=await canvas.boundingBox();await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.45);await page.mouse.down({button:'right'});await page.mouse.move(bounds.x+bounds.width*.5+55,bounds.y+bounds.height*.45+25,{steps:12});await page.mouse.up({button:'right'});
 await page.waitForTimeout(350);const panned=await canvas.screenshot();expect(panned.equals(before)).toBe(false);await page.screenshot({path:info.outputPath('retina-panned.png'),fullPage:true});
 await page.locator('[data-view="front"]').click();await page.waitForTimeout(350);await page.screenshot({path:info.outputPath('retina-reset.png'),fullPage:true});
 await page.setViewportSize({width:680,height:900});await expect(async()=>{await canvasFits();}).toPass();await page.screenshot({path:info.outputPath('retina-resized.png'),fullPage:true});
 await page.setViewportSize({width:320,height:740});await expect(async()=>{await canvasFits();}).toPass();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});

test('all twenty clean illustrations load with stable montage proportions',async({page},info)=>{
 await page.goto('./');const {OUTFITS}=await import('../../src/config.js');
 for(const outfit of OUTFITS){const c=studioConfig();c.outfit={upper:outfit.id,lower:outfit.id,shoes:outfit.id};await page.locator('#settings-file').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(c))});
  await expect(page.locator('[data-summary="upper"]')).toHaveText(outfit.label);
  await expect.poll(()=>page.locator('.montage img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth===1000))).toBe(true);
  if(outfit.id!=='pocket-01'){const bounds=await page.locator('.montage').boundingBox();expect(bounds.width/bounds.height).toBeCloseTo(2/3,2);}
  await page.locator('.stage').screenshot({path:info.outputPath(`${outfit.id}.png`)});
 }
 await expect(page.locator('canvas')).toHaveCount(0);
});

test('registered ink preserves transparency and all 400 ankle pairings',async({page},info)=>{
 await page.goto('./');const {OUTFITS}=await import('../../src/config.js');const records=[];const registration=JSON.parse(await fs.readFile(new URL('../../public/assets/illustrations/registered-v2/registration.json',import.meta.url)));
 for(const outfit of OUTFITS){const c=studioConfig();c.outfit={upper:outfit.id,lower:outfit.id,shoes:outfit.id};await page.locator('#settings-file').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(c))});
  await expect.poll(()=>page.locator('.montage [data-ready="true"]').count()).toBe(3);
  records.push(await page.locator('.montage').evaluate((el,{id,hemY})=>{
   const output={id};for(const category of ['upper','lower','shoes']){const im=el.querySelector(`[data-ink-category="${category}"]`),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let opaque=0,nonblack=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>32){opaque++;if(d[i]||d[i+1]||d[i+2])nonblack++;}
    const edge=(left,right,y0,y1)=>{let min=1000,max=0;for(let y=y0;y<y1;y++)for(let x=left;x<right;x++)if(d[(y*c.width+x)*4+3]>64){min=Math.min(min,x);max=Math.max(max,x);}return [min,max];};
    output[category]={nonblack,opaque,backgroundAlpha:d[3],width:c.width,height:c.height};
    if(category==='upper'){const nearest=anchor=>{const xs=[];for(let y=Math.max(0,Math.floor(hemY)-2);y<Math.min(c.height,Math.ceil(hemY)+3);y++)for(let x=anchor-20;x<=anchor+20;x++)if(d[(y*c.width+x)*4+3]>64)xs.push(x);if(!xs.length)throw Error('Missing hem outline');return xs.sort((a,b)=>Math.abs(a-anchor)-Math.abs(b-anchor))[0];};output.hem=[nearest(265),nearest(735)];}
    if(category==='lower')output.waist=edge(220,780,0,20);
    if(category==='lower')output.ankles=[edge(180,490,c.height-30,c.height),edge(510,820,c.height-30,c.height)];
    if(category==='shoes')output.collars=[edge(180,490,0,20),edge(510,820,0,20)];
   }return output;
  },{id:outfit.id,hemY:(registration.outfits[outfit.id].upper.hemY-registration.outfits[outfit.id].upper.box[1])/(registration.outfits[outfit.id].upper.box[3]-registration.outfits[outfit.id].upper.box[1])*registration.rig.upperHeight}));
 }
 for(const r of records)for(const category of ['upper','lower','shoes']){expect(r[category].nonblack).toBe(0);expect(r[category].backgroundAlpha).toBe(0);expect(r[category].opaque).toBeGreaterThan(1000);expect(r[category].width).toBe(1000);}
 const pairings=[];for(const lower of records)for(const shoes of records){const delta=Math.max(...lower.ankles.flat().map((x,i)=>Math.abs(x-shoes.collars.flat()[i])));pairings.push({lower:lower.id,shoes:shoes.id,delta});}
 const waistPairings=[];for(const upper of records)for(const lower of records)waistPairings.push({upper:upper.id,lower:lower.id,delta:Math.max(...upper.hem.map((x,i)=>Math.abs(x-lower.waist[i])))});
 await fs.writeFile(info.outputPath('ink-registration.json'),JSON.stringify({records,pairings,waistPairings},null,2));
 expect(Math.max(...pairings.map(p=>p.delta))).toBeLessThanOrEqual(12);
 expect(Math.max(...waistPairings.map(p=>p.delta))).toBeLessThanOrEqual(8);
});

import {test,expect} from '@playwright/test';
// Introduction page assembled by scripts/build-pages.mjs. Run with PAGES_URL=http://127.0.0.1:4175/ (site root, app at app/).
const root=process.env.PAGES_URL;
test.skip(!root,'PAGES_URL is not set');
test('introduction page shows the 3D figure, dresses it, and links into the Studio',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(root);await expect(page.locator('#hero-stage')).toHaveAttribute('data-ready','true',{timeout:30000});
 await expect(page.locator('#lineup-grid .look')).toHaveCount(20);
 const before=await page.locator('#hero-make').getAttribute('href');await page.locator('#hero-shuffle').click();
 await expect.poll(()=>page.locator('#hero-make').getAttribute('href')).not.toBe(before);await expect(page.locator('#hero-stage')).not.toHaveAttribute('data-error','true');
 const href=await page.locator('#hero-make').getAttribute('href'),upper=new URLSearchParams(href.split('#')[1]).get('upper');
 await page.locator('#hero-make').click();await expect(page).toHaveURL(/\/app\/$/);await expect(page.locator('#notice')).toHaveText('紹介ページの組み合わせを開きました。');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('makerchip.studio.v7')).outfit.upper)).toBe(upper);
 await page.locator('#step-home').click();await expect(page.locator('#hero-title')).toBeVisible();
 for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);}
 expect(errors).toEqual([]);
});

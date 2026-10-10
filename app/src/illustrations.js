// High-resolution ink assets registered to shared garment seams.
// Source pixels remain immutable. Canvas only composes the raster assets.
const root=import.meta.env.BASE_URL+'assets/illustrations/registered-v2/';
// Failed loads are not cached, so the next repaint retries after a network error.
let registration;
function metadata(){return registration??=fetch(root+'registration.json').then(r=>{if(!r.ok)throw Error('線画の登録情報を読み込めません');return r.json();}).catch(e=>{registration=null;throw e;});}
const sources=new Map(),parts=new Map();
function source(file){if(!sources.has(file))sources.set(file,new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>{sources.delete(file);reject(Error('線画を読み込めません'));};image.src=root+file;}));return sources.get(file);}
function canvas(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function inkOnly(c){const ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<data.data.length;i+=4){const alpha=data.data[i+3],luma=(data.data[i]+data.data[i+1]+data.data[i+2])/3;data.data[i+3]=alpha<16?0:Math.round(alpha*(1-luma/255));data.data[i]=data.data[i+1]=data.data[i+2]=0;}ctx.putImageData(data,0,0);return c.toDataURL('image/png');}
async function registered(category,id){
 const {rig,outfits}=await metadata(),m=outfits[id];if(!m)throw Error('衣装の線画が未登録です: '+id);
 const image=await source(m.file),height=rig[category+'Height'],c=canvas(rig.width,height),ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';
 if(category==='upper'){
  const {box,hem}=m.upper,scale=(rig.waist[1]-rig.waist[0])/(hem[1]-hem[0]);
  ctx.drawImage(image,box[0],box[1],box[2]-box[0],box[3]-box[1],rig.waist[0]+(box[0]-hem[0])*scale,0,(box[2]-box[0])*scale,height);
  // Occlude the neckline behind the common head while retaining transparent interiors.
  ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(rig.head[0]+rig.head[2]/2,rig.head[1]+rig.head[3]/2-rig.upperY,rig.head[2]/2-2,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
 }else if(category==='lower'){
  const {box,waist,ankles}=m.lower,scale=(rig.waist[1]-rig.waist[0])/(waist[1]-waist[0]);
  const xs=[box[0],...ankles.flat(),box[2]],bottom=[rig.waist[0]+(box[0]-waist[0])*scale,...rig.ankles.flat(),rig.waist[0]+(box[2]-waist[0])*scale];
  // Smoothly register all four ankle edges, independently from the waist width.
  for(let y=0;y<height;y++){
   const t=smooth((y/height-.32)/.68),sy=box[1]+y/height*(box[3]-box[1]),sh=(box[3]-box[1])/height;
   const dst=xs.map((x,i)=>mix(rig.waist[0]+(x-waist[0])*scale,bottom[i],t));
   for(let i=0;i<xs.length-1;i++)if(xs[i+1]>xs[i]&&dst[i+1]>dst[i])ctx.drawImage(image,xs[i],sy,xs[i+1]-xs[i],sh,dst[i],y,dst[i+1]-dst[i],1);
  }
 }else{
  m.shoes.feet.forEach((box,i)=>{
   const collar=m.shoes.collars[i],ankle=rig.ankles[i],scale=(ankle[1]-ankle[0])/(collar[1]-collar[0]);
   const xs=[box[0],collar[0],collar[1],box[2]],soleLeft=i===0?190:510,soleWidth=300;
   for(let y=0;y<height;y++){
    const t=smooth((y/height-.12)/.7),sy=box[1]+y/height*(box[3]-box[1]),sh=(box[3]-box[1])/height;
    const dst=xs.map(x=>mix(ankle[0]+(x-collar[0])*scale,soleLeft+(x-box[0])/(box[2]-box[0])*soleWidth,t));
    for(let j=0;j<xs.length-1;j++)if(xs[j+1]>xs[j])ctx.drawImage(image,xs[j],sy,xs[j+1]-xs[j],sh,dst[j],y,dst[j+1]-dst[j],1);
   }
  });
 }
 return inkOnly(c);
}
function part(category,id){const key=category+'/'+id;if(!parts.has(key))parts.set(key,registered(category,id).catch(e=>{parts.delete(key);throw e;}));return parts.get(key);}
export function illustration(category,id,base,thumbnail=false){return `<img class="registered-ink ${thumbnail?'ink-thumb':''}" data-ink-category="${category}" data-ink-id="${id}" alt="" draggable="false">`;}
export async function paintIllustrations(container){
 const images=[...container.querySelectorAll('[data-ink-id]')];
 await Promise.all(images.map(async image=>{const {inkCategory:category,inkId:id}=image.dataset;try{const src=await part(category,id);if(image.isConnected){image.src=src;await image.decode();image.dataset.ready='true';}}catch(e){image.dataset.error='true';image.alt=e.message;}}));
}
let headPixels;
export async function paintHead(image){try{if(headPixels){image.src=await headPixels;return;}headPixels=(async()=>{const m=await metadata();const raw=await source(m.head.file),box=m.head.box,c=canvas(1000,1000),ctx=c.getContext('2d');ctx.drawImage(raw,...[box[0],box[1],box[2]-box[0],box[3]-box[1]],0,0,1000,1000);return inkOnly(c);})();image.src=await headPixels;}catch(e){headPixels=null;image.alt=e.message;}}

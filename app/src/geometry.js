import {ALIGNED_ASSEMBLY as layout} from './assembly.js';
import {validateConfig,CONNECTIONS,socketDimensions,V9_ID,V10_ID,isOutfitSet} from './config.js';
export function parseMesh(buffer){
  const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
  if(new TextDecoder().decode(bytes.subarray(0,8))!=='MCMESH01')throw Error('部品データの形式が不正です');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),nv=view.getUint32(8,true),nt=view.getUint32(12,true);
  if(16+nv*12+nt*12!==bytes.byteLength)throw Error('部品データが破損しています');
  const positions=new Float32Array(nv*3),indices=new Uint32Array(nt*3);
  for(let i=0;i<positions.length;i++){positions[i]=view.getFloat32(16+i*4,true);if(!Number.isFinite(positions[i]))throw Error('不正な座標です');}
  for(let i=0;i<indices.length;i++){indices[i]=view.getUint32(16+nv*12+i*4,true);if(indices[i]>=nv)throw Error('不正な面です');}
  return {positions,indices};
}
export function createGeometryEngine(wasm,assets){
  const {Manifold,Mesh}=wasm;
  const bases=new Map();
  for(const [id,data] of Object.entries(assets))bases.set(id,new Manifold(new Mesh({numProp:3,vertProperties:data.positions,triVerts:data.indices})));
  function generate(input){
    const config=validateConfig(input),c=config.clearances,owned=[];
    if(isOutfitSet(config.assetSet))throw Error('v9は完成組立座標用の生成処理を使用してください');
    const own=m=>(owned.push(m),m);
    const cube=(size,center)=>own(own(Manifold.cube(size,true)).translate(center));
    const cylinder=(radius,height,center,axis='Z',segments=128)=>{let m=own(Manifold.cylinder(height,radius,radius,segments,true));if(axis==='Y')m=own(m.rotate([90,0,0]));return own(m.translate(center));};
    const diff=(a,b)=>own(a.subtract(b)),add=(a,b)=>own(a.add(b));
    const base=id=>{const m=bases.get(id);if(!m)throw Error(`部品が見つかりません: ${id}`);return m;};
    const hole=id=>socketDimensions(CONNECTIONS.find(x=>x.id===id),config);
    const models={};
    const aligned=config.assetSet===layout.id;
    const footX=aligned?layout.footX:8.5,footY=aligned?layout.footY:2,footZ=(aligned?layout.footPlane:10.5)+2.05;
    try{
      if(config.parts.includes('upper-body')){
        let m=diff(base('upper-body'),cube([...hole('waist'),4.5],[0,0,26.05]));
        m=diff(m,cube([...hole('springBottom'),4.5],[0,-.7,32.95]));
        if(aligned){m=diff(m,cube([200,200,100],[0,0,-26]));m=diff(m,cube([16,10,35],[0,-.7,52.5]));}
        models['upper-body']=m;
      }
      if(config.parts.includes('lower-body')){
        let stock=base('lower-body');
        if(aligned){
          stock=diff(stock,cube([200,200,100],[0,0,74])); // Remove old waist peg before appearance scaling.
          stock=own(own(stock.scale([layout.lowerWidthScale,1,layout.lowerHeightScale])).translate([0,0,layout.lowerZOffset])); // 10.5..24 -> 10..19 mm.
          stock=own(stock.warp(v=>{v[0]+=Math.max(-1,Math.min(1,v[0]/2))*layout.cuffSpread*Math.max(0,Math.min(1,(layout.cuffTransitionTop-v[2])/(layout.cuffTransitionTop-layout.footPlane)));}));
          stock=diff(stock,cube([200,200,100],[0,0,layout.footPlane-50]));
          stock=add(stock,cube([14,10,4.3],[0,0,layout.waistPlane+1.85]));
        }
        let m=diff(stock,cylinder(hole('footLeft')[0]/2,4.5,[-footX,footY,footZ]));
        models['lower-body']=diff(m,cylinder(hole('footRight')[0]/2,4.5,[footX,footY,footZ]));
      }
      for(const id of ['shoe-left','shoe-right'])if(config.parts.includes(id)){
        let m=base(id);
        if(aligned){
          const sign=id==='shoe-left'?-1:1;
          m=diff(m,cube([200,200,100],[0,0,layout.footPlane+50])); // Remove old pin and uneven collar lip above z=10.
          m=own(own(own(m.translate([-sign*10,0,0])).scale([layout.shoeWidthScale,1,1])).translate([sign*footX,layout.shoeYOffset,0]));
          m=add(m,cylinder(2,4.3,[sign*footX,footY,layout.footPlane+1.85]));
        }
        models[id]=m;
      }
      const end=1.2+c.chipAxial,depth=end+3,mid=(end-3)/2;
      if(config.parts.includes('ring-front')){
        let m=cylinder(24,depth,[0,mid,77],'Y',256);
        m=diff(m,cylinder(19.2,12,[0,0,77],'Y',256));
        m=diff(m,cylinder(hole('chipRadial')[0]/2,3+c.chipAxial+.02,[0,(-1.8+end+.02)/2,77],'Y',256));
        m=add(m,cube([10,depth,7.6],[0,mid,52.8]));
        m=diff(m,cube([...hole('springTop'),4.5],[0,-.7,51.05]));
        for(const angle of [45,135,225,315]){const a=angle*Math.PI/180;m=diff(m,cylinder(hole('ringPins')[0]/2,2.4,[22.1*Math.cos(a),end-1,77+22.1*Math.sin(a)],'Y',48));}
        models['ring-front']=m;
      }
      if(config.parts.includes('ring-back')){
        let m=diff(cylinder(24,1.2,[0,end+.6,77],'Y',256),cylinder(19.2,5,[0,end+.6,77],'Y',256));
        for(const angle of [45,135,225,315]){const a=angle*Math.PI/180;m=add(m,cylinder(.8,2.2,[22.1*Math.cos(a),end-.9,77+22.1*Math.sin(a)],'Y',48));}
        models['ring-back']=m;
      }
      if(config.parts.includes('spring'))models.spring=base(`spring-${String(config.springWidth.toFixed(1)).replace('.','p')}`);
      if(config.parts.includes('chip'))models.chip=cylinder(20,3,[0,-.3,77],'Y',256);
      if(aligned)for(const id of ['upper-body','spring','ring-front','ring-back','chip'])if(models[id])models[id]=own(models[id].translate([0,0,layout.upperZOffset]));
      const output=[];
      for(const [id,m] of Object.entries(models)){
        if(m.status()!=='NoError'||m.isEmpty())throw Error(`${id}の形状生成に失敗しました`);
        const components=m.decompose();const count=components.length;components.forEach(x=>x.delete());
        if(count!==1)throw Error(`${id}が分離しました。設定を確認してください`);
        const mesh=m.getMesh();
        output.push({id,positions:mesh.vertProperties.slice(),indices:mesh.triVerts.slice(),volume:m.volume(),bounds:m.boundingBox(),triangles:m.numTri()});
      }
      return output;
    }finally{for(let i=owned.length-1;i>=0;i--)owned[i].delete();}
  }
  return {generate,dispose(){for(const m of bases.values())m.delete();bases.clear();}};
}

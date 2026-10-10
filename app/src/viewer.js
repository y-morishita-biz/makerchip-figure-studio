import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
export function createViewer(container,{onPick,groupOf=id=>[id]}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;container.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','フィギュアの3D表示');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(28,1,.1,2000);camera.up.set(0,0,1);camera.position.set(0,-250,49);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=true;controls.screenSpacePanning=true;controls.minDistance=90;controls.maxDistance=600;controls.target.set(0,0,49);
 scene.add(new THREE.HemisphereLight(0xffffff,0x77766f,2.6));for(const [color,intensity,p] of [[0xfffaf0,3,[-90,-120,160]],[0xe6edff,2,[70,40,130]]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...p);scene.add(l);}
 const root=new THREE.Group();scene.add(root);const meshes=new Map();let tween=null,exploded=false,active=true;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const offsets={'upper-body':[0,0,12],'lower-body':[0,0,0],'shoe-left':[-12,0,-4],'shoe-right':[12,0,-4],'ring-front':[0,-12,28],'ring-back':[0,14,28],spring:[0,0,18],chip:[0,-25,28]};
 function target(direction){
  root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root);if(box.isEmpty())return;
  const center=box.getCenter(new THREE.Vector3()),directionUnit=new THREE.Vector3(...direction).normalize();
  const right=new THREE.Vector3().crossVectors(directionUnit,camera.up).normalize(),up=new THREE.Vector3().crossVectors(right,directionUnit).normalize();
  const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),horizontal=vertical*camera.aspect;
  let distance=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const corner=new THREE.Vector3(x,y,z).sub(center),depth=corner.dot(directionUnit);
   distance=Math.max(distance,depth+Math.abs(corner.dot(right))/horizontal,depth+Math.abs(corner.dot(up))/vertical);
  }
  distance=Math.max(controls.minDistance,distance*1.12);
  return {center,position:center.clone().addScaledVector(directionUnit,distance)};
 }
 function move(direction,duration=700){resize(false);const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;const to=target(direction);if(!to)return;const from=camera.position.clone(),start=controls.target.clone();tween={time:performance.now(),duration:reduced()?0:duration,from,start,...to};if(!duration||reduced()){camera.position.copy(to.position);controls.target.copy(to.center);controls.update();tween=null;}}
 // CSS dimensions must stay independent from the DPR-scaled drawing buffer.
 // client dimensions also exclude the reveal animation's scale transform.
 let width=0,height=0;
 function resize(refit=true){const w=container.clientWidth,h=container.clientHeight;if(!w||!h||w===width&&h===height)return;width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(refit&&meshes.size){const direction=(tween?tween.position.clone().sub(tween.center):camera.position.clone().sub(controls.target)).toArray();move(direction,0);}}
 const observer=new ResizeObserver(()=>resize());observer.observe(container);resize();
 controls.addEventListener('start',()=>{tween=null;});
 // A short tap (not an orbit drag) picks a part. Mouse hover shows which group a tap would select.
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),canvas=renderer.domElement,pulses=new Map();let hovered=[],down=null,hoverFrame=0;const touches=new Set();
 function pick(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects([...meshes.values()],false)[0]?.object.userData.id;}
 function hover(ids){hovered=ids;canvas.style.cursor=ids.length?'pointer':'';}
 canvas.addEventListener('pointerdown',e=>{touches.add(e.pointerId);down=touches.size===1&&e.button===0?{x:e.clientX,y:e.clientY,time:performance.now()}:null;});
 canvas.addEventListener('pointerup',e=>{const tap=down&&touches.size===1&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6&&performance.now()-down.time<600;down=null;if(!tap||!controls.enabled)return;const id=pick(e);if(id)onPick?.(id);});
 const release=e=>{touches.delete(e.pointerId);if(!touches.size)down=null;};addEventListener('pointerup',release);addEventListener('pointercancel',release);
 canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||e.buttons||!controls.enabled){if(hovered.length)hover([]);return;}if(hoverFrame)return;hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;const id=pick(e);hover(id?groupOf(id):[]);});});
 canvas.addEventListener('pointerleave',()=>hover([]));
 function emphasis(now){for(const [id,m] of meshes){let v=hovered.includes(id)?.08:0;const start=pulses.get(id);if(start!==undefined){const t=(now-start)/700;if(t>=1)pulses.delete(id);else v+=.3*(1-t)*(1-t);}m.material.emissive.setScalar(v);}}
 renderer.setAnimationLoop(()=>{if(!active)return;if(tween){const t=Math.min(1,(performance.now()-tween.time)/Math.max(1,tween.duration)),k=t*t*(3-2*t);camera.position.lerpVectors(tween.from,tween.position,k);controls.target.lerpVectors(tween.start,tween.center,k);if(t===1)tween=null;}emphasis(performance.now());controls.update();renderer.render(scene,camera);});
 function display(models,colors){tween=null;for(const m of meshes.values()){root.remove(m);m.geometry.dispose();m.material.dispose();}meshes.clear();hover([]);pulses.clear();for(const model of models){let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(model.positions,3));g.setIndex(new THREE.BufferAttribute(model.indices,1));g.computeVertexNormals();if(['ring-front','ring-back','spring','chip'].includes(model.id)){const smooth=toCreasedNormals(g,Math.PI/4);g.dispose();g=smooth;}const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:colors[model.id],roughness:.76,metalness:.02}));m.userData.id=model.id;m.position.fromArray(exploded?offsets[model.id]:[0,0,0]);root.add(m);meshes.set(model.id,m);}resize();}
 return {display,move,setActive(v){active=v;controls.enabled=v;if(!v)hover([]);if(v)resize();},setInteractive(v){controls.enabled=v;if(!v)hover([]);},pulse(ids){if(reduced())return;const now=performance.now();for(const id of ids)if(meshes.has(id))pulses.set(id,now);},setColors(colors){for(const [id,m] of meshes)m.material.color.set(colors[id]);},explode(value){exploded=value;for(const [id,m] of meshes)m.position.fromArray(value?offsets[id]:[0,0,0]);move([130,-190,82]);},dispose(){observer.disconnect();removeEventListener('pointerup',release);removeEventListener('pointercancel',release);renderer.setAnimationLoop(null);renderer.dispose();controls.dispose();}};
}

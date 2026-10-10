// Builds the colored 3MF off the main thread; large figures take a second or more.
import {build3MF} from './export.js';
self.onmessage=({data:{models,config}})=>{
 try{const {bytes,fits}=build3MF(models,config);self.postMessage({bytes,fits},[bytes.buffer]);}
 catch(e){self.postMessage({error:e.message||'3MFを書き出せません'});}
};

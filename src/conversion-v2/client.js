/* Request/revision gate shared by every lab operation. No source buffer cache. */
(function(root){
'use strict';
class Client{
 constructor(events={}){this.events=events;this.sequence=0;this.pending=null;this.worker=new Worker('./v2-worker.js');this.worker.onmessage=e=>this.receive(e.data);this.worker.onerror=e=>{const pending=this.pending;this.pending=null;if(pending)pending.reject(Error('WORKER_FAILED'));this.events.failure?.(e.message);};}
 receive(m){if(m.type==='loupe'){this.events.loupe?.(m);return;}const p=this.pending;if(!p||p.id!==m.id)return;
  if(m.type==='quick'){this.events.quick?.(m);return;}
  if(m.type==='state'){this.events.state?.(m.snapshot);return;}
  if(m.type==='progress'){this.events.progress?.(m);return;}
  if(m.type==='jpeg-stripe'){this.events.stripe?.(m);return;}
  this.pending=null;if(m.type==='done')p.resolve(m);else p.reject(Object.assign(Error(m.error||'Avbrutet'),{name:m.type==='cancelled'?'AbortError':'Error'}));
 }
 cancel(){const p=this.pending;if(!p)return;this.pending=null;this.worker.postMessage({type:'cancel',id:p.id});p.reject(Object.assign(Error('Avbrutet'),{name:'AbortError'}));}
 run(type,args={},transfer=[]){this.cancel();const id=++this.sequence;return new Promise((resolve,reject)=>{this.pending={id,resolve,reject};this.worker.postMessage({id,type,...args},transfer);});}
 close(){this.cancel();this.worker.onmessage=null;this.worker.onerror=null;this.worker.terminate();}
}
root.NSV2Client=Client;
})(globalThis);

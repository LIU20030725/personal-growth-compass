export interface HealthMediaStore {
  put(id:string,blob:Blob):Promise<void>;
  get(id:string):Promise<Blob|undefined>;
  remove(id:string):Promise<void>;
  exportAll():Promise<Array<{id:string;type:string;blob:Blob}>>;
}
export function createMemoryHealthMediaStore():HealthMediaStore {
  const data=new Map<string,Blob>();
  return {async put(id,blob){data.set(id,blob)},async get(id){return data.get(id)},async remove(id){data.delete(id)},async exportAll(){return [...data].map(([id,blob])=>({id,type:blob.type,blob}))}};
}
export function createIndexedDbHealthMediaStore():HealthMediaStore {
  const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{
    const pending=indexedDB.open('dice-life-health-media',1);
    pending.onupgradeneeded=()=>pending.result.createObjectStore('photos');
    pending.onsuccess=()=>resolve(pending.result);
    pending.onerror=()=>reject(pending.error);
  });
  const request=<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>)=>open().then(db=>new Promise<T>((resolve,reject)=>{
    const tx=db.transaction('photos',mode);
    const pending=run(tx.objectStore('photos'));
    pending.onsuccess=()=>resolve(pending.result);
    pending.onerror=()=>reject(pending.error);
    tx.oncomplete=()=>db.close();
  }));
  return {
    async put(id,blob){await request('readwrite',store=>store.put(blob,id));},
    get(id){return request('readonly',store=>store.get(id));},
    async remove(id){await request('readwrite',store=>store.delete(id));},
    async exportAll(){
      const db=await open();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('photos','readonly');
        const store=tx.objectStore('photos');
        const keys=store.getAllKeys();
        const values=store.getAll();
        tx.oncomplete=()=>{
          db.close();
          resolve(keys.result.map((key,index)=>({id:String(key),type:(values.result[index] as Blob).type,blob:values.result[index] as Blob})));
        };
        tx.onerror=()=>reject(tx.error);
      });
    }
  };
}

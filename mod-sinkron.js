/* Ordela — modul sinkron: database lokal, sinkron online, penggabungan.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
/* ---------- database: cadangan IndexedDB, snapshot harian, file tertaut ---------- */
var IDBP=null,MIRROR_T=0,MIRROR_ERR=false,LSFAIL=false,WARNED=false,FH=null,FHST='',FILE_T=0,MT=null,FT=null,SNAP_DAY='';
function idbOpen(){
  if(!IDBP)IDBP=new Promise((res,rej)=>{const r=indexedDB.open('sushi_pos_db',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  return IDBP;
}
function idbReq(mode,fn){return idbOpen().then(d=>new Promise((res,rej)=>{const t=d.transaction('kv',mode),q=fn(t.objectStore('kv'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)}))}
function idbGet(k){return idbReq('readonly',s=>s.get(k))}
function idbSet(k,v){return idbReq('readwrite',s=>s.put(v,k))}
function idbDel(k){return idbReq('readwrite',s=>s.delete(k))}
function idbKeys(){return idbReq('readonly',s=>s.getAllKeys())}
function dbJson(){return JSON.stringify(db)}
function schedMirror(){
  clearTimeout(MT);MT=setTimeout(mirror,400);
  if(FH){clearTimeout(FT);FT=setTimeout(writeFile,1500)}
}
async function mirror(){
  try{
    await idbSet('main',dbJson());MIRROR_T=Date.now();MIRROR_ERR=false;
    if(SNAP_DAY!==dkey(Date.now()))await ensureDaily();
    if(LSFAIL&&!WARNED){WARNED=true;toast('Penyimpanan browser penuh, data tetap aman di cadangan database')}
  }catch(e){
    MIRROR_ERR=true;
    if(LSFAIL){toast('Penyimpanan penuh — kurangi gambar atau hapus data lama')}
  }
}
async function snapNow(key,prune){
  await idbSet(key,{t:Date.now(),json:dbJson(),n:db.orders.length,i:db.items.length});
  if(prune){const ks=(await idbKeys()).filter(k=>/^snap-\d{4}/.test(k)).sort();for(const k of ks.slice(0,-14))await idbDel(k)}
}
async function ensureDaily(){
  const k='snap-'+dkey(Date.now());SNAP_DAY=dkey(Date.now());
  if(!(await idbGet(k)))await snapNow(k,true);
}
async function writeFile(){
  if(!FH)return;
  try{
    if((await FH.queryPermission({mode:'readwrite'}))!=='granted'){FHST='perm';return}
    const w=await FH.createWritable();await w.write(dbJson());await w.close();FHST='ok';FILE_T=Date.now();
  }catch(e){FHST='err'}
}
async function linkFile(){
  try{
    const h=await window.showSaveFilePicker({suggestedName:'sushi-pos-database.json',types:[{description:'Database POS',accept:{'application/json':['.json']}}]});
    FH=h;await idbSet('fh',h);await writeFile();toast('File database tertaut');
  }catch(e){if(e&&e.name!=='AbortError')toast('Gagal menautkan file')}
  renderDb();
}
async function allowFile(){try{if(FH&&(await FH.requestPermission({mode:'readwrite'}))==='granted')await writeFile()}catch(e){}renderDb()}
async function unlinkFile(){FH=null;FHST='';try{await idbDel('fh')}catch(e){}renderDb()}
async function askPersist(){try{await navigator.storage.persist()}catch(e){}renderDb()}
function applyDb(d){db=fixDb(d);S.cart={};S.sel.clear();save();applyBrand();go(S.view);toast('Data dipulihkan')}
async function snapRestore(k){
  let sn;try{sn=await idbGet(k)}catch(e){}
  if(!sn){toast('Snapshot tidak ditemukan');return}
  ask('Pulihkan snapshot?','Data saat ini akan ditimpa. Kondisi saat ini disimpan dulu sebagai snapshot "Sebelum pemulihan".','Pulihkan',()=>{
    snapNow('snap-prerestore').catch(()=>{});applyDb(JSON.parse(sn.json));
  });
}
async function dbBoot(){
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
  try{
    const raw=await idbGet('main');
    if(raw){
      const d=JSON.parse(raw);
      if(d&&d.items&&d.set&&(!globalThis.__lsok||(d._ts||0)>(db._ts||0))){
        const had=globalThis.__lsok;
        db=fixDb(d);try{localStorage.setItem(KEY,dbJson())}catch(e){}
        S.cart={};applyBrand();go(S.view);
        toast(had?'Data diperbarui dari cadangan database':'Data dipulihkan dari cadangan database');
      }
    }else if(globalThis.__lsok)await idbSet('main',dbJson());
    await ensureDaily();
    const h=await idbGet('fh');
    if(h){FH=h;try{FHST=(await h.queryPermission({mode:'readwrite'}))==='granted'?'ok':'perm'}catch(e){FHST='err'}}
  }catch(e){MIRROR_ERR=true}
  if(S.view==='set')renderDb();
  if(db.orders.length&&!CL.on&&FHST!=='ok'&&Date.now()-(db.set.lastBackup||0)>7*864e5)setTimeout(()=>toast('Sudah lebih dari 7 hari belum unduh file database (Pengaturan)'),2500);
}
async function renderDb(){
  const el=$('#dbForm');if(!el)return;
  if(CL.on&&!isOwner()){
    el.innerHTML=`<h3>Sinkron Online</h3><div class="dbr"><span>Status</span><b class="${CL.st==='ok'?'ok':'warn'}">${({ok:'Tersinkron',sync:'Menyinkronkan…',offline:'Offline',auth:'Perlu login',err:'Gagal sinkron'})[CL.st]||''}</b></div>
    <div class="acts" style="margin-top:12px"><button class="btn sm" onclick="syncNow()"><i class="ic" data-ic="cloud"></i>Sinkron Sekarang</button></div>
`;
    return;
  }
  let per=null,est=null,snaps=[],idbOk=true,hasMain=false;
  try{if(navigator.storage&&navigator.storage.persisted)per=await navigator.storage.persisted()}catch(e){}
  try{if(navigator.storage&&navigator.storage.estimate)est=await navigator.storage.estimate()}catch(e){}
  try{
    hasMain=!!(await idbGet('main'));
    const ks=(await idbKeys()).filter(k=>/^snap-/.test(k)).sort().reverse();
    for(const k of ks)snaps.push([k,await idbGet(k)]);
  }catch(e){idbOk=false}
  const row=(l,v,c)=>`<div class="dbr"><span>${l}</span><b class="${c||''}">${v}</b></div>`;
  const kb=Math.round(dbJson().length/1024),fs=typeof window!=='undefined'&&typeof window.showSaveFilePicker==='function';
  const lb=db.set.lastBackup,old=!CL.on&&(!lb||Date.now()-lb>7*864e5);
  const mb=n=>(n/1048576).toFixed(n>1e8?0:1)+' MB';
  const fileRow=!fs?row('File database tertaut','Tidak didukung di perangkat ini','warn'):
    FH?row('File database tertaut',FHST==='ok'?'Tertulis otomatis':FHST==='perm'?'Perlu izin <button class="chip" onclick="allowFile()">Izinkan</button>':'Gagal',FHST==='ok'?'ok':'warn')+'':row('File database tertaut','Belum ditautkan','warn');
  let srv=[];
  if(CL.on&&CL.tok){try{srv=(await (await api('/api/snapshots')).json()).snapshots||[]}catch(e){}}
  const cloudRows=CL.on?row('Sinkron online',({ok:'Tersinkron',sync:'Menyinkronkan…',offline:'Offline',auth:'Perlu login',err:'Gagal sinkron'})[CL.st]+(CL.st==='ok'&&CL.last?' · '+new Date(CL.last).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}):''),CL.st==='ok'?'ok':'warn')+row('Server',(globalThis.POS_SB?'Database Supabase':'Database SQLite di server'),'ok'):'';
  const cloudBtns=CL.on?'<button class="btn sm" onclick="syncNow()"><i class="ic" data-ic="cloud"></i>Sinkron Sekarang</button><button class="btn sm sec" onclick="downloadServerExport()"><i class="ic" data-ic="download"></i>Unduh dari Server</button><button class="btn sm sec" onclick="doLogout()">Keluar</button>':'';
  const srvSnaps=CL.on&&srv.length?'<label class="fl" style="margin-top:12px">Snapshot Server</label>'+srv.map(x=>`<div class="dbs"><span>${new Date(x.created_at).toLocaleString(dloc(),{day:'2-digit',month:'short',year:'numeric'})} · ${Math.round(x.size/1024)} KB</span><button class="chip" onclick="srvSnapRestore('${x.day}')">Pulihkan</button></div>`).join('')+'':'';
  el.innerHTML=`<h3>Database & Penyimpanan</h3>
  ${cloudRows}
  ${row('Penyimpanan utama (browser)','Aktif · '+kb+' KB','ok')}
  ${row('Cadangan database (IndexedDB)',!idbOk?'Tidak tersedia':(hasMain||MIRROR_T)?'Aktif':'Menunggu data pertama',idbOk?'ok':'warn')}
  ${row('Penyimpanan permanen',per?'Ya':'Belum'+(per===false?' <button class="chip" onclick="askPersist()">Minta</button>':''),per?'ok':'warn')}
  ${est&&est.quota?row('Ruang terpakai',mb(est.usage||0)+' / '+mb(est.quota)):''}
  ${fileRow}
  ${row('Backup terakhir',lb?new Date(lb).toLocaleString(dloc(),{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Belum pernah',old?'warn':'ok')}
  <div class="acts" style="flex-wrap:wrap;margin-top:12px">
    ${cloudBtns}
    <button class="btn sm" onclick="backup()"><i class="ic" data-ic="download"></i>Unduh File Database</button>
    <button class="btn sm sec" onclick="$('#restoreF').click()"><i class="ic" data-ic="upload"></i>Pulihkan dari File</button>
    ${fs?(FH?'<button class="btn sm sec" onclick="unlinkFile()">Putuskan File</button>':'<button class="btn sm sec" onclick="linkFile()"><i class="ic" data-ic="link"></i>Tautkan File Database</button>'):''}
    <button class="btn sm red" onclick="resetAll()">Reset Semua</button>
    <input type="file" id="restoreF" accept=".json,application/json" hidden onchange="restore(this)">
  </div>
  ${srvSnaps}
  <label class="fl" style="margin-top:12px">Snapshot Otomatis</label>
  ${snaps.length?snaps.map(([k,v])=>v?`<div class="dbs"><span>${k==='snap-prerestore'?'<b>Sebelum pemulihan</b> · ':''}${new Date(v.t).toLocaleString(dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · <span>${v.i}</span> <span>Item</span> · <span>${v.n}</span> <span>Transaksi</span></span><button class="chip" onclick="snapRestore('${k}')">Pulihkan</button></div>`:'').join(''):''}
`;
}
function devTag(){let d='';try{d=localStorage.getItem('pos_dev')||''}catch(e){}if(!d){d=Math.random().toString(36).replace(/[^a-z0-9]/g,'').slice(0,3).toUpperCase().padEnd(3,'X');try{localStorage.setItem('pos_dev',d)}catch(e){}}return d}
function persistMeta(){try{localStorage.setItem('pos_sync',JSON.stringify({ver:CL.ver,dirty:CL.dirty}))}catch(e){}}
function schedSync(){clearTimeout(CL.t);CL.t=setTimeout(syncNow,700)}
function setSt(s){
  CL.st=s;
  const d=$('#cdot');if(d)d.className='cdot '+(CL.on?s:'off');
  const r=$('#cloudRow'),t=$('#cloudSt'),tm=$('#cloudT');
  if(r)r.hidden=!CL.on;if(t)t.textContent=CL_TXT[s]||'';
  if(tm)tm.textContent=s==='ok'&&CL.last?new Date(CL.last).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}):'';
}
async function api(p,o){
  o=o||{};const h={'Content-Type':'application/json'};if(CL.tok)h.Authorization='Bearer '+CL.tok;
  const r=await fetch(p,{...o,headers:h,cache:'no-store'});
  if(r.status===401){
    let why='';try{why=((await r.clone().json())||{}).error||''}catch(e){}
    CL.tok='';setMe(null);try{localStorage.removeItem('pos_tok')}catch(e){}ssWarnHide();setSt('auth');applyAccess();showLogin(why==='kicked'?'Akun ini baru saja login di perangkat lain, jadi Anda dikeluarkan dari perangkat ini. Masuk lagi bila perlu.':why==='expired'?'Sesi Anda berakhir karena lama tidak dipakai. Masuk lagi untuk melanjutkan.':'');throw new Error('auth')}
  return r;
}
/* ----- penggabungan 3 arah (dasar = salinan terakhir yang tersinkron) ----- */
function sj(v){if(v&&typeof v==='object'){if(Array.isArray(v))return'['+v.map(sj).join(',')+']';return'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+sj(v[k])).join(',')+'}'}return JSON.stringify(v)}
const eqv=(a,b)=>sj(a)===sj(b);
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function m3(b,l,s){
  if(isObj(l)&&isObj(s)){
    const o={},bb=isObj(b)?b:{};
    for(const k of new Set([...Object.keys(l),...Object.keys(s)])){
      if(!(k in l)){o[k]=s[k];continue}
      if(!(k in s)){o[k]=l[k];continue}
      o[k]=m3(bb[k],l[k],s[k]);
    }
    return o;
  }
  return eqv(l,b)?s:l;
}
function merge3(base,L,S){
  const B=base||{items:[],orders:[],cats:[],log:[],set:{}};
  const mapBy=(a,k)=>{const m={};(a||[]).forEach(x=>m[x[k]]=x);return m};
  const bi=mapBy(B.items,'id'),li=mapBy(L.items,'id'),si=mapBy(S.items,'id');
  let items=[];
  S.items.forEach(s=>{
    const b=bi[s.id],l=li[s.id];
    if(!l){if(b&&eqv(s,b))return;items.push(s);return}      // dihapus di sini & server tidak mengubahnya: hapus
    if(!b){items.push(s);return}                              // baru di kedua sisi: server menang
    const m={...s};
    for(const k of new Set([...Object.keys(l),...Object.keys(b)])){
      if(k==='stock')m.stock=Math.max(0,(+s.stock||0)+((+l.stock||0)-(+b.stock||0)));   // stok digabung sebagai selisih
      else if(!eqv(l[k],b[k]))m[k]=l[k];
    }
    items.push(m);
  });
  L.items.forEach(l=>{if(!si[l.id]&&!bi[l.id])items.push(l)});   // item baru dari sini
  if(eqv(S.items.map(x=>x.id),(B.items||[]).map(x=>x.id))){     // urutan menu diubah hanya di sini: pakai urutan lokal
    const pos={};L.items.forEach((x,i)=>pos[x.id]=i);
    items=items.map((x,i)=>[x,i]).sort((a,b)=>((pos[a[0].id]??1e9)-(pos[b[0].id]??1e9))||a[1]-b[1]).map(z=>z[0]);
  }
  const om=new Map(),lo=new Set(L.orders.map(o=>o.no)),bo=new Map((B.orders||[]).map(o=>[o.no,o]));
  S.orders.forEach(o=>{if(!lo.has(o.no)&&bo.has(o.no)&&eqv(o,bo.get(o.no)))return;om.set(o.no,o)});   // dihapus di sini & server tidak mengubahnya: hapus
  L.orders.forEach(o=>{if(!om.has(o.no))om.set(o.no,o)});
  const orders=[...om.values()].sort((a,b)=>a.t<b.t?1:a.t>b.t?-1:0);
  const seen=new Set(),log=[...(S.log||[]),...(L.log||[])].filter(x=>{const k=sj(x);if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.t<b.t?1:a.t>b.t?-1:0).slice(0,LOG_MAX);
  const bc=new Set(B.cats||[]),lc=new Set(L.cats||[]),sc=new Set(S.cats||[]);
  const cats=(S.cats||[]).filter(c=>!(bc.has(c)&&!lc.has(c)));(L.cats||[]).forEach(c=>{if(!sc.has(c)&&!bc.has(c))cats.push(c)});
  const vs=new Set(),voided=[...(S.voided||[]),...(L.voided||[])].filter(x=>{const k=sj(x);if(vs.has(k))return false;vs.add(k);return true}).sort((a,b)=>a.at<b.at?1:a.at>b.at?-1:0).slice(0,200);
  const colM=k=>{const m=new Map();(S[k]||[]).forEach(x=>m.set(x.id,x));(L[k]||[]).forEach(x=>{const y=m.get(x.id);if(!y||(+x.u||0)>(+y.u||0))m.set(x.id,x)});return [...m.values()]};
  const cols={};['holds','members','promos','shifts','exps','sups','buys','kds','occ','gifts','rsv'].forEach(k=>{cols[k]=colM(k)});
  return {...S,...cols,items,orders,log,voided,cats,set:m3(B.set,L.set,S.set),seq:Math.max(+L.seq||0,+S.seq||0),_ts:Math.max(+L._ts||0,+S._ts||0)};
}
/* ----- sinkron ----- */
async function getBase(){try{const x=await idbGet('base');return x?JSON.parse(x):null}catch(e){return null}}
function setBase(js){idbSet('base',js).catch(()=>{})}
function adopt(data,version,dirty){
  const raw=JSON.stringify(data);
  db=fixDb(data);db._ts=Date.now();
  try{localStorage.setItem(KEY,dbJson())}catch(e){}
  schedMirror();
  CL.ver=version;CL.dirty=!!dirty;if(!dirty)setBase(raw);persistMeta();
  applyBrand();render();
}
async function push(bv){
  const ts=db._ts,snap=dbJson();
  const r=await api('/api/data',{method:'PUT',body:'{"baseVersion":'+bv+',"data":'+snap+'}'});
  if(r.status===409)return false;
  if(r.status===403){let m='';try{m=(await r.json()).error}catch(e){}CL.deniedMsg=m||'Tidak ada izin';return 'denied'}
  if(!r.ok)throw new Error('http '+r.status);
  const j=await r.json();CL.ver=j.version;setBase(snap);
  if(db._ts===ts)CL.dirty=false;else CL.again=true;
  persistMeta();return true;
}
async function refreshMe(){ // izin/peran bisa diubah owner kapan saja: perbarui menu tanpa menunggu sinkron data
  if(!CL.tok)return;
  try{const m=await (await api('/api/me')).json();if(m&&m.username&&JSON.stringify(m)!==JSON.stringify(CL.me)){setMe(m);applyAccess()}}catch(e){}
}
async function syncNow(){
  if(!CL.on)return;
  if(CL.busy){CL.again=true;return}
  if(!CL.tok){setSt('auth');const lw=$('#login');if(!lw||lw.hidden)showLogin();return}
  CL.busy=true;setSt('sync');let ok=false;
  try{
    try{const m=await (await api('/api/me')).json();if(m&&m.username&&JSON.stringify(m)!==JSON.stringify(CL.me)){setMe(m);applyAccess()}}catch(e){if(e.message==='auth')throw e}
    for(let i=0;i<5&&!ok;i++){
      CL.again=false;
      const j=await (await api('/api/data')).json();
      if(j.data==null){                                              // server masih kosong: owner mengunggah data perangkat ini
        if(!isOwner()){toast('Server belum berisi data. Minta owner login lebih dulu.');break}
        ok=(await push(0))===true;continue}
      if(j.version===CL.ver){
        if(!CL.dirty){ok=true;continue}
        const pr=await push(CL.ver);
        if(pr==='denied'){                                           // server menolak perubahan di luar izin: batalkan bagian itu
          const m2=restrictToServer(merge3(CL.ver>0?await getBase():null,db,j.data),j.data);
          adopt(m2,j.version,true);{const dm=CL.deniedMsg||'';if(dm!==CL.deniedLast||Date.now()-(CL.deniedAt||0)>120000){CL.deniedLast=dm;CL.deniedAt=Date.now();toast('Perubahan di luar izin Anda dibatalkan: '+dm)}}   // jangan spam pesan yang sama
          ok=(await push(j.version))===true;
        }else ok=pr===true;
        continue}
      const fresh=CL.ver===0&&!CL.dirty&&!db.orders.length;           // perangkat baru tanpa transaksi: pakai data server
      if((!CL.dirty&&CL.ver>0)||fresh){adopt(j.data,j.version,false);ok=true;continue}
      const merged=restrictToServer(merge3(CL.ver>0?await getBase():null,db,j.data),j.data);  // ada perubahan di dua sisi
      adopt(merged,j.version,true);
      ok=(await push(j.version))===true;if(ok)toast('Data dari perangkat lain digabung');
    }
    if(ok){CL.last=Date.now();setSt('ok')}else setSt('err');
  }catch(e){if(e.message!=='auth')setSt(navigator.onLine===false?'offline':'offline')}
  CL.busy=false;
  if(CL.again&&CL.tok&&CL.st!=='auth'){CL.again=false;schedSync()}
  if(S.view==='set')renderDb();
}
async function srvSnapRestore(day){
  ask('Pulihkan snapshot server?','Data saat ini akan diganti dengan snapshot ini, lalu disinkronkan ke semua perangkat.','Pulihkan',async()=>{
    try{const j=await (await api('/api/snapshots/'+day)).json();if(j.data)applyDb(j.data)}catch(e){toast('Gagal mengambil snapshot')}
  });
}
async function downloadServerExport(){
  try{
    const r=await api('/api/export');const b=await r.blob(),a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download='ordela-server-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  }catch(e){toast('Gagal mengunduh')}
}
function cloudStart(){
  setSt(CL.on?(CL.tok?'sync':'auth'):'off');
  if(!CL.on)return;
  ssStart();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow()});
  window.addEventListener('online',syncNow);window.addEventListener('offline',()=>setSt('offline'));
  CL.pt=setInterval(async()=>{
    if(!CL.tok||CL.busy||document.hidden)return;
    if(CL.dirty){syncNow();return}
    try{const j=await (await api('/api/version')).json();if(j.version!==CL.ver)syncNow()}catch(e){}
    refreshMe();
  },12000);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  syncNow();
}

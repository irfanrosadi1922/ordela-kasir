/* Ordela — modul pesanan online & Ambil Pesanan.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
/* cetak otomatis hanya di perangkat berizin Printer (perangkat printer); akun server yang cuma mengambil pesanan tidak ikut mencetak */
const coHere=()=>!window.POS_APP||window.POS_APP==='kasir';
   // pesanan online hanya diterima & dicetak aplikasi Kasir
function coAuto(){return coHere()&&can('prn')&&coPref('auto',true)}
function coPref(k,d){try{const p=JSON.parse(localStorage.getItem('pos_co')||'{}');return p[k]==null?d:p[k]}catch(e){return d}}
function coSetPref(k,v){let p={};try{p=JSON.parse(localStorage.getItem('pos_co')||'{}')}catch(e){}p[k]=v;try{localStorage.setItem('pos_co',JSON.stringify(p))}catch(e){}}
const coNew=()=>CO.list.filter(o=>o.status==='new');
const isOnl=o=>!!o&&(o.pay==='qris'||o.pay==='duitnow');
   /* 'duitnow' = pesanan lama sebelum QRIS */
/* alamat publik untuk QR: pengaturan manual > alamat dari build APK > alamat halaman ini (bukan localhost) */
function pubBase(){
  let b=String(db.set.pubUrl||'').trim()||String(window.POS_PUBLIC_URL||'').trim();
  if(b){
    if(!/^https?:\/\//i.test(b))b='https://'+b;
    b=b.split('#')[0].split('?')[0].replace(/order(\.html)?$/i,'');
    if(!b.endsWith('/'))b+='/';
    try{const u=new URL('order.html',b);if(u.hostname==='ordela.my.id'||u.hostname==='www.ordela.my.id')u.hostname='app.ordela.my.id';return u.href}catch(e){}
  }
  return new URL('order.html',location.href).href.split('#')[0];
}
const urlLocal=()=>{try{return /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(new URL(pubBase()).hostname)||!/^https?:$/.test(new URL(pubBase()).protocol)}catch(e){return true}};
const storeCode=()=>{const s=CL&&CL.me&&CL.me.store;return s&&s.code?s.code:''};
const coUrl=t=>{const q=[];if(storeCode())q.push('s='+encodeURIComponent(storeCode()));if(t)q.push('t='+encodeURIComponent(t));return pubBase()+(q.length?'?'+q.join('&'):'')};
function coSetPub(v){db.set.pubUrl=String(v||'').trim();save();coQrDraw()}
function ago(t){const s=Math.max(0,(Date.now()-new Date(t))/1000|0);if(s<60)return'baru saja';if(s<3600)return Math.floor(s/60)+' mnt lalu';if(s<86400)return Math.floor(s/3600)+' jam lalu';return new Date(t).toLocaleDateString(dloc())}
/* bunyi, notifikasi sistem, layar tetap menyala */
function coAudio(){try{if(!CO.aud){const C=window.AudioContext||window.webkitAudioContext;if(C)CO.aud=new C()}if(CO.aud&&CO.aud.state==='suspended')CO.aud.resume()}catch(e){}return CO.aud}
function coBeep(){
  if(!coPref('sound',true))return;
  const a=coAudio();if(!a||a.state!=='running')return;
  const t=a.currentTime;
  [[880,0],[1175,.18],[880,.45],[1175,.63]].forEach(([f,d])=>{
    const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.4,t+d+.02);g.gain.exponentialRampToValueAtTime(.001,t+d+.17);
    o.connect(g);g.connect(a.destination);o.start(t+d);o.stop(t+d+.2);
  });
}
async function coNotify(title,body,tag){
  if(!coPref('notif',true))return;
  if(window.nativeNotify){try{await nativeNotify.show(title,body)}catch(e){}return}
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{
    const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration(),o={body,tag:tag||'co',renotify:true,icon:'icon-ordela-dark.svg',badge:'icon-ordela-dark.svg',vibrate:[200,100,200]};
    if(reg&&reg.showNotification)await reg.showNotification(title,o);else new Notification(title,o);
  }catch(e){}
}
function ntCfg(ev){const c=((CO.set&&CO.set.nt)||{})[ev]||{},d=NT_EV[ev];return{on:c.on!==false,t:c.t||d.t,b:c.b||d.b}}
function ntFmt(tpl,o){
  const m={no:o.num,nama:o.name,meja:o.tbl?'Meja '+o.tbl:'',total:money(o.total),tipe:tr(o.type),item:(o.lines||[]).map(l=>l.qty+'x '+l.name).join(', ')};
  return String(tpl).replace(/\{(\w+)\}/g,(x,k)=>m[k]==null?x:m[k]).replace(/\s+/g,' ').replace(/^[\s·]+|[\s·]+$/g,'');
}
function coEvents(evs){
  const act=evs.filter(([ev])=>ntCfg(ev).on);if(!act.length)return;
  act.forEach(([ev,o])=>{
    const c=ntCfg(ev),t=ntFmt(c.t,o),b=ntFmt(c.b,o);
    toast(t+' — '+b);clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').classList.remove('on'),7000);
    if(document.hidden)coNotify(t,b,'co-'+ev+'-'+o.id);
  });
  CO.ring=0;coBeep();
  try{if(coPref('vib',true)&&navigator.vibrate)navigator.vibrate([200,100,200])}catch(e){}
}
async function coSaveNt(){
  const nt={};
  for(const ev of Object.keys(NT_EV)){
    const g=k=>$('#nt_'+ev+'_'+k);if(!g('on'))return;
    nt[ev]={on:g('on').checked,t:g('t').value.trim(),b:g('b').value.trim()};
  }
  try{
    const r=await api('/api/co/settings',{method:'PUT',body:JSON.stringify({on:!!(($('#coOn')||{checked:CO.set.on}).checked),msg:($('#coMsg')||{value:CO.set.msg||''}).value,nt})});
    if(!r.ok)throw 0;CO.set=await r.json();toast('Pengaturan notifikasi disimpan');
  }catch(e){toast('Gagal menyimpan notifikasi')}
}
function ntReset(){for(const ev of Object.keys(NT_EV)){$('#nt_'+ev+'_on').checked=true;$('#nt_'+ev+'_t').value='';$('#nt_'+ev+'_b').value=''}coSaveNt()}
function ntTest(){
  const o={num:'#012',name:'Budi',tbl:'5',type:'Dine In',total:45,lines:[{qty:2,name:'Sate Ayam'},{qty:1,name:'Es Teh'}]};
  Object.keys(NT_EV).forEach((ev,i)=>setTimeout(()=>{const c=ntCfg(ev),t=ntFmt(c.t,o),b=ntFmt(c.b,o);toast(t+' — '+b);coNotify(t,b,'test-'+ev)},i*1500));
  coBeep();
}
function ntForm(){
  const row=ev=>{const d=NT_EV[ev],c=ntCfg(ev),cur=((CO.set&&CO.set.nt)||{})[ev]||{};
    return`<div class="ntr" style="margin:10px 0"><label class="tgl"><input type="checkbox" id="nt_${ev}_on" ${c.on?'checked':''} onchange="coSaveNt()"><span>${d.l}</span></label>
    <input class="fi" id="nt_${ev}_t" value="${esc(cur.t||'')}" placeholder="${esc(d.t)}" maxlength="80" onchange="coSaveNt()" aria-label="Judul">
    <input class="fi" id="nt_${ev}_b" value="${esc(cur.b||'')}" placeholder="${esc(d.b)}" maxlength="160" onchange="coSaveNt()" aria-label="Isi" style="margin-top:6px"></div>`};
  return`<h3 style="margin-top:18px">Notifikasi</h3>${Object.keys(NT_EV).map(row).join('')}
  <p class="hint">Kosongkan kolom untuk memakai teks bawaan. Kode: {no} {nama} {meja} {total} {tipe} {item}</p>
  <div class="cob"><button class="btn sec" onclick="ntTest()"><i class="ic" data-ic="bell"></i>Tes notifikasi</button><button class="btn sec" onclick="ntReset()">Kembalikan bawaan</button></div>`;
}
/* langganan push ke server: pesanan online masuk membangunkan perangkat ini walau aplikasi ditutup */
const b64ToU8=b=>{const p='='.repeat((4-b.length%4)%4),r=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(r,c=>c.charCodeAt(0))};
async function coPushSync(){
  try{
    if(window.nativePush&&CL.on&&CL.tok&&can('co')){await nativePush.sync(api,coPref('notif',true));return}
    if(!CL.on||!CL.tok||!can('co')||!('PushManager' in window)||!navigator.serviceWorker)return;
    const reg=await navigator.serviceWorker.getRegistration();if(!reg)return;
    const want=coPref('notif',true)&&'Notification' in window&&Notification.permission==='granted';
    let sub=await reg.pushManager.getSubscription();
    if(!want){if(sub){try{await api('/api/push/sub',{method:'DELETE',body:JSON.stringify({endpoint:sub.endpoint})})}catch(e){}try{await sub.unsubscribe()}catch(e){}}return}
    const kr=await api('/api/push/key');if(!kr.ok)return;const k=(await kr.json()).key;if(!k)return;
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(k)});
    const j=sub.toJSON();
    await api('/api/push/sub',{method:'POST',body:JSON.stringify({subscription:{endpoint:j.endpoint,keys:j.keys}})});
  }catch(e){}
}
async function coSetNotif(on){
  if(on){
    if(window.nativeNotify){if(!(await nativeNotify.ask())){toast('Izin notifikasi ditolak. Aktifkan di pengaturan HP.');on=false}}
    else if(!('Notification' in window)){toast('Browser ini tidak mendukung notifikasi sistem');on=false}
    else{const p=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(p!=='granted'){toast('Izin notifikasi ditolak. Aktifkan di pengaturan browser.');on=false}}
  }
  coSetPref('notif',on);coPushSync();renderCo(true);
}
async function coWake(){
  try{if(!coPref('awake',true)||!CL.on||!CL.tok||!navigator.wakeLock||document.hidden||CO.wl)return;CO.wl=await navigator.wakeLock.request('screen');CO.wl.addEventListener('release',()=>{CO.wl=null})}catch(e){CO.wl=null}
}
function coSetAwake(on){coSetPref('awake',on);if(on)coWake();else if(CO.wl){try{CO.wl.release()}catch(e){}CO.wl=null}}
/* lencana + judul tab */
function coBadge(){
  const n=coNew().length,on=CL.on&&can('co');
  const b=$('#coBell'),nv=$('#coNav');if(b)b.hidden=!on;if(nv)nv.hidden=!on;
  ['coBellN','coNavN'].forEach(id=>{const e=$('#'+id);if(e){e.hidden=!n;e.textContent=n}});
  document.title=(n?'('+n+') ':'')+CO.title;
  navGroups();
}
/* polling panjang: pesanan masuk langsung muncul */
async function coLoop(){
  if(CO.run)return;CO.run=true;
  for(;;){
    if(!CL.on||!CL.tok||!can('co')||!coHere()){await sleep(3000);continue}
    try{
      const r=await api('/api/co?rev='+CO.rev+'&wait=25');
      if(!r.ok)throw new Error('http');
      const j=await r.json();
      if(CO.err){CO.err=false;if(S.view==='co')renderCo(false)}
      CO.rev=j.rev;
      if(!j.unchanged)coApply(j);
      if(globalThis.POS_SB)await sleep(3000); // Supabase: polling biasa (tanpa long-poll)
    }catch(e){
      if(!CO.err){CO.err=true;if(S.view==='co')renderCo(false)}
      await sleep(e&&e.message==='auth'?5000:4000);
    }
  }
}
function coApply(j){
  const prev=new Map(CO.list.map(o=>[o.id,o]));
  CO.list=j.orders||[];CO.set=j.set||CO.set;
  if(S.view==='set'&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#coForm')))renderCoSet();
  const fresh=CO.list.filter(o=>o.status==='new'&&!CO.seen.has(o.id));
  fresh.forEach(o=>CO.seen.add(o.id));
  const evs=fresh.map(o=>['new',o]);
  CO.list.forEach(o=>{const p=prev.get(o.id);if(!p||CO.mine.has(o.id))return;
    if(p.pst!==1&&o.pst===1)evs.push(['pay',o]);
    if(p.status!=='cancelled'&&o.status==='cancelled')evs.push(['cancel',o]);
  });
  coEvents(evs);
  coBadge();
  if(fresh.length&&CL.on&&can('co')&&coPref('open',true)&&!$('#mw').classList.contains('on')&&!document.hidden){
    CO.tab='prep';CO.spot=new Set(fresh.map(o=>o.id));
    if(S.view!=='co')go('co');else renderCo(false);
  }else if(S.view==='co')renderCo(false);
  coAutoPrint();
}
/* tiket pesanan (dapur) */
function ticketModel(o){
  const m=[],hr=()=>m.push({t:'hr'});
  m.push({t:'text',x:o.kt?'TIKET DAPUR':o.by?'PESANAN SERVER':'PESANAN ONLINE',a:'center',b:true});
  m.push({t:'text',x:o.num,a:'center',b:true,big:true});
  hr();
  if(o.name)m.push({t:'row',l:'Nama',r:o.name,b:true});
  if(o.tbl)m.push({t:'text',x:'MEJA '+o.tbl,a:'center',b:true,huge:3});
  m.push({t:'row',l:'Tipe',r:tr(o.type)});
  if(o.by)m.push({t:'row',l:'Server',r:o.by});
  m.push({t:'row',l:'Waktu',r:fmtDT(o)});
  hr();
  if(o.stn)m.splice(2,0,{t:'text',x:'== '+o.stn.toUpperCase()+' ==',a:'center',b:true,big:true});
  {const g={};o.lines.forEach(l=>{const k=(find(l.id)||{}).stn||'';(g[k]=g[k]||[]).push(l)});const ks=Object.keys(g);
   ks.forEach(k=>{if(ks.length>1&&!o.stn)m.push({t:'text',x:'['+(k||'Umum')+']',a:'left',b:true});g[k].forEach(l=>m.push({t:'text',x:l.qty+'x '+l.name,a:'left',b:true}))})}
  if(o.note){hr();m.push({t:'text',x:'Catatan: '+o.note,a:'left'})}
  if(!o.kt){hr();
  m.push({t:'row',l:'TOTAL',r:money(o.total),b:true});
  m.push({t:'text',x:'BELUM DIBAYAR',a:'center',b:true})}
  return m;
}
const ticketOf=o=>({...o,ticket:true});
async function printTicket(o){
  const ex=(db.set.prns||[]).filter(x=>(x.stations||[]).length);
  if(!o.stn&&(db.set.stSplit||ex.length)){
    const stOf=l=>String((find(l.id)||{}).stn||'').trim();
    const B=new Map();   // tujuan → baris
    o.lines.forEach(l=>{
      const k=stOf(l),pr=prnForStation(k);
      if(o.kt&&!pr&&!db.set.stSplit)return;   // tiket dapur: baris tanpa stasiun tidak dicetak di printer kasir
      const key=pr?pr.id:(db.set.stSplit?'main:'+(k||'Umum'):'main');
      if(!B.has(key))B.set(key,{pr:pr||mainPrn(),st:pr?pr.name:(db.set.stSplit?(k||'Umum'):''),lines:[]});
      B.get(key).lines.push(l);
    });
    if(!B.size)return true;   // tidak ada baris yang perlu dicetak
    if(B.size>1||[...B.values()][0].pr.id!=='main'||db.set.stSplit){
      let all=true;
      for(const g of B.values()){const ok=await printTicketTo(g.pr,{...o,lines:g.lines,stn:g.st||undefined});if(!ok)all=false;await sleep(400)}
      return all;
    }
  }
  if(o.kt)return true;   // tiket dapur tanpa printer stasiun: tidak mencetak apa pun di printer kasir
  return printTicketTo(mainPrn(),o);
}
/* Tiket dapur/bar otomatis untuk transaksi di toko (bukan pesanan online). Hidup bila perangkat punya printer stasiun atau 'Pisah per stasiun'; bisa dimatikan per perangkat. */
function ktOn(){const hasSt=(db.set.prns||[]).some(x=>(x.stations||[]).length)||!!db.set.stSplit;try{const v=localStorage.getItem('pos_kt');return v==null?hasSt:v==='1'}catch(e){return hasSt}}
function ktSet(v){try{localStorage.setItem('pos_kt',v?'1':'0')}catch(e){}}
async function kitchenAuto(o){
  if(!ktOn()||!o||!o.lines||!o.lines.length)return;
  const t={no:o.no,num:o.no,name:o.cust||'',tbl:o.tbl||'',type:o.type,t:o.t,lines:o.lines.map(l=>({id:l.id,name:l.name,qty:l.qty})),note:o.note||'',kt:true};
  try{const ok=await printTicket(t);if(!ok)toast('Tiket dapur gagal dicetak: '+(CO.perr||'printer belum terhubung'))}
  catch(e){toast('Tiket dapur gagal dicetak')}
}
async function printTicketTo(pr,o){
  const t=ticketOf(o);CO.perr='';
  try{
    if(pr.id==='main'&&pr.mode==='browser'){
      if($('#mw').classList.contains('on')){CO.perr='layar sedang dipakai';return false}
      showReceipt(t,false);await sleep(350);
      await new Promise(res=>{const d=()=>{window.removeEventListener('afterprint',d);res()};window.addEventListener('afterprint',d);window.print();setTimeout(d,90000)});
      closeModal();return true;
    }
    const data=await buildEscPos(t,pr);
    await sendTo(pr,data);
    return true;
  }catch(e){console.error(e);CO.perr=(pr.id==='main'?'':pr.name+': ')+((e&&e.name==='NotFoundError')?'pemilihan printer dibatalkan':((e&&e.message)||String(e)));return false}
}
async function coAutoPrint(){
  if(CO.pr||!CL.on||!CL.tok||!coAuto())return;
  const now=Date.now();
  const todo=CO.list.filter(o=>{
    if(!(o.status==='new'||o.status==='accepted')||o.printed!==0)return false;
    const x=CO.tries[o.id];return !x||now-x.t>=(x.n>=3?120000:15000);
  }).sort((a,b)=>a.id-b.id);
  if(!todo.length)return;
  CO.pr=true;
  try{
    for(const o of todo){
      const x=CO.tries[o.id]||(CO.tries[o.id]={n:0,t:0});
      let c;
      try{c=await (await api('/api/co/'+o.id+'/print',{method:'POST',body:JSON.stringify({action:'claim'})})).json()}catch(e){break}
      if(!c.ok)continue; // perangkat lain yang mencetak
      x.t=Date.now();
      const ok=await printTicket(o);
      x.n=ok?0:x.n+1;
      try{await api('/api/co/'+o.id+'/print',{method:'POST',body:JSON.stringify({action:ok?'done':'release'})})}catch(e){}
      if(ok){o.printed=2;toast('Tiket '+o.num+' tercetak')}
    }
  }finally{CO.pr=false;if(S.view==='co')renderCo(false)}
}
function noView(v){NO.v=v;try{localStorage.setItem('pos_nov',v)}catch(e){}noList()}
function noOpen(tbl){
  if(!can('co')){toast('Tidak punya izin Pesanan Online');return}
  NO.q={};NO.s='';NO.busy=false;NO.key='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  openModal(`<h3>Ambil Pesanan</h3>
  <div class="two"><div><label class="fl">Nama pelanggan *</label><input class="fi" id="noN" maxlength="40" autocomplete="off"></div>
  <div><label class="fl">Meja</label><input class="fi" id="noT" maxlength="12" autocomplete="off" value="${esc(tbl||'')}"></div></div>
  <div class="two"><div><label class="fl">Tipe</label><select class="fi" id="noTy"><option>Dine In</option><option>Takeaway</option></select></div>
  <div><label class="fl">Cari menu</label><input class="fi" id="noS" placeholder="Cari…" oninput="NO.s=this.value;noList()"></div></div>
  <div class="gtool"><span class="lb">Tampilan</span><button type="button" class="chip" id="noVl" onclick="noView('list')">Daftar</button><button type="button" class="chip" id="noVg" onclick="noView('grid')">Grid</button></div>
  <div id="noL" class="nol grid"></div>
  <label class="fl">Catatan</label><input class="fi" id="noC" maxlength="200" placeholder="Mis. tanpa pedas">
  <div class="nof"><b id="noTot"></b><button class="btn" id="noGo" onclick="noSend()">Kirim ke Printer</button></div>
  <button class="btn sec" onclick="closeModal()">Batal</button>`);
  noList();
}
function noList(){
  const q=NO.s.trim().toLowerCase(),l=$('#noL');if(!l)return;
  l.className='nol grid '+(NO.v==='list'?'list':'fd');{const a=$('#noVl'),b=$('#noVg');if(a)a.classList.toggle('on',NO.v==='list');if(b)b.classList.toggle('on',NO.v!=='list')}
  const its=db.items.filter(i=>!i.ns&&(!q||i.name.toLowerCase().includes(q)||(i.cat||'').toLowerCase().includes(q)));
  l.innerHTML=its.map(i=>{const n=NO.q[i.id]||0,out=i.stock<=0;
    return`<div class="p ${out?'out':''}"><div class="im tap${n?' has':''}" onclick="noQ('${i.id}',1)">${thumb(i)}${out?'<div class="sold">HABIS</div>':''}${n?`<div class="qov">${n}</div>`:''}</div>
    <div class="nm">${esc(i.name)}</div>${NO.v==='list'?`<div class="sub">${esc(i.cat)}</div><div class="stk ${i.stock<=i.min?'low':''}">Stok: ${i.stock}</div>`:''}
    <div class="row"><span class="pr">${money(i.price)}</span><span class="qty"><button type="button" onclick="noQ('${i.id}',-1)" ${n?'':'disabled'}>−</button><span>${n}</span><button type="button" onclick="noQ('${i.id}',1)" ${out||n>=(+i.stock||0)?'disabled':''}>+</button></span></div></div>`}).join('')||'<div class="empty">Menu tidak ditemukan.</div>';
  noTot();
}
function noQ(id,d){const i=find(id);if(!i)return;if(d>0&&i.stock<=0){toast('Stok habis');return}const n=Math.max(0,Math.min(99,(NO.q[id]||0)+d));if(n>(+i.stock||0)&&d>0){toast('Stok '+i.name+' tinggal '+i.stock);return}if(n)NO.q[id]=n;else delete NO.q[id];noList()}
function noTot(){const t=Object.keys(NO.q).reduce((a,id)=>{const i=find(id);return a+(i?i.price*NO.q[id]:0)},0),n=Object.values(NO.q).reduce((a,b)=>a+b,0),e=$('#noTot');if(e)e.textContent=n+' item · '+money(t)}
async function noSend(){
  if(NO.busy)return;
  const name=$('#noN').value.trim(),items=Object.keys(NO.q).map(id=>({id,qty:NO.q[id]}));
  if(!name){toast('Nama pelanggan wajib diisi');return}
  if(!items.length){toast('Pilih minimal 1 menu');return}
  NO.busy=true;$('#noGo').disabled=true;
  try{
    const r=await api('/api/co/new',{method:'POST',body:JSON.stringify({name,table:$('#noT').value.trim(),type:$('#noTy').value,note:$('#noC').value.trim(),items,key:NO.key})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){toast(j.error||'Gagal mengirim pesanan');NO.busy=false;$('#noGo').disabled=false;return}
    closeModal();toast('Pesanan terkirim ke printer');
    CO.rev=0;try{const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}}catch(e){}
  }catch(e){toast('Tidak bisa terhubung');NO.busy=false;const g=$('#noGo');if(g)g.disabled=false}
}
async function coPrint(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  if(db.set.prn.mode==='browser')showReceipt(ticketOf(o),false);
  else{const ok=await printTicket(o);toast(ok?'Tiket dikirim ke printer':'Gagal cetak: '+(CO.perr||'printer belum terhubung'))}
  api('/api/co/'+id+'/print',{method:'POST',body:JSON.stringify({action:'done'})}).catch(()=>{});
}
function coTestPrint(){
  const o={id:0,num:'#000',name:'Contoh',tbl:'5',type:'Dine In',note:'Tes cetak tiket',lines:[{id:'x',name:'Contoh Menu',price:10000,qty:2}],total:20000,t:new Date().toISOString()};
  if(db.set.prn.mode==='browser')showReceipt(ticketOf(o),false);
  else printTicket(o).then(ok=>toast(ok?'Tiket contoh dikirim':'Gagal cetak: '+(CO.perr||'printer belum terhubung')));
}
/* aksi kasir */
async function coAct(id,action,extra){
  try{
    const r=await api('/api/co/'+id,{method:'POST',body:JSON.stringify({action,...(extra||{})})});
    if(r.status===409){toast('Pesanan sudah diproses');return false}
    if(!r.ok)throw 0;
    if(action==='cancel')CO.mine.add(id);
    return true;
  }catch(e){toast('Gagal menghubungi server');return false}
}
function coConfirmPay(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  if(confirm('Sudah cek mutasi/notifikasi bank atau TNG? Pembayaran '+money(o.total)+' dari '+o.name+' benar-benar masuk?'))coAct(id,'paid');
}
async function coProof(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  openModal(`<h3>Bukti bayar · ${esc(o.num)}</h3><p style="color:var(--mu)" id="pfInfo">Memuat foto…</p>`);
  let d='';
  try{const r=await api('/api/co/'+id+'/proof');d=r.ok?((await r.json()).proof||''):''}catch(e){}
  const open=o.status==='new'||o.status==='accepted';
  openModal(`<h3>Bukti bayar · ${esc(o.num)}</h3>
  <p style="color:var(--mu);margin:0 0 8px">${esc(o.name)} · tagihan <b>${money(o.total)}</b>. Cocokkan jumlah dan waktu di foto dengan mutasi bank/TNG Anda.</p>
  ${d?`<a href="${d}" target="_blank" rel="noopener"><img src="${d}" alt="Bukti pembayaran pelanggan" style="display:block;max-width:100%;max-height:55vh;margin:0 auto 12px;border-radius:12px;border:1px solid #ddd"></a>`:'<p style="color:var(--mu)">Foto tidak tersedia.</p>'}
  ${o.pst===2?'<div class="chg"><span><i class="ic" data-ic="check"></i>Sudah Anda setujui.</span></div>':open?`<button class="btn" onclick="closeModal();coConfirmPay(${o.id})"><i class="ic" data-ic="check"></i>Setujui, pembayaran diterima</button><button class="btn sec" onclick="coRejectPay(${o.id})"><i class="ic" data-ic="x"></i>Tolak bukti</button>`:''}
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
function coRejectPay(id){if(confirm('Tolak bukti ini? Pelanggan akan diminta mengunggah ulang.')){closeModal();coAct(id,'reject')}}
function coCancel(id){const o=CO.list.find(x=>x.id===id);if(o&&confirm('Batalkan pesanan '+o.num+' atas nama '+o.name+'?'+(isOnl(o)&&(o.pst===1||o.pst===2)?'\n\nPelanggan sudah membayar lewat QRIS. Kembalikan uangnya secara manual.':'')))coAct(id,'cancel')}
function scanEnter(el){
  const v=el.value.trim();if(!v||S.view!=='pos')return;
  const it=db.items.find(i=>!i.ns&&String(i.bc||'')===v);
  if(it){gridAdd(it.id);el.value='';S.q='';renderGrid();toast(it.name+' ditambahkan')}
}
/* kamera: pemindai barcode bila peramban mendukung (BarcodeDetector); pemindai Bluetooth/USB cukup mengetik ke kolom cari lalu Enter */
function scanCam(){
  P2.scan(code=>{const it=db.items.find(i=>!i.ns&&String(i.bc||'')===code);
    if(it){gridAdd(it.id);toast(it.name+' ditambahkan');return true}toast('Barcode '+code+' belum terdaftar');return false});
}
function coPay(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  if(Object.keys(S.cart).length&&!confirm('Keranjang kasir saat ini akan diganti dengan pesanan '+o.num+'. Lanjutkan?'))return;
  const cart={},warn=[];
  o.lines.forEach(l=>{const i=find(l.id);if(!i){warn.push(l.name+' (tidak ada)');return}if(i.stock<l.qty)warn.push(l.name+' (stok '+i.stock+')');cart[l.id]=l.qty});
  if(!Object.keys(cart).length){toast('Menu pesanan sudah tidak ada di daftar');return}
  S.cart=cart;S.cm={};S.promoId=null;S.dType='%';S.dVal=0;S.type=o.type==='Dine In'?'Dine In':'Takeaway';
  S.coId=id;S.coSig=JSON.stringify(cart);S.coCust=o.name;S.coTbl=o.tbl||'';
  if(o.status==='new')coAct(id,'accept');
  go('pos');renderGrid();renderInvoice();payForm();
  const c=$('#pCust');if(c)c.value=S.coCust;const tb=$('#pTbl');if(tb)tb.value=S.coTbl||'';
  if(warn.length)toast('Perhatian: '+warn.join(', '));
}
function coLink(no){
  if(!S.coId)return;
  const id=S.coId,same=JSON.stringify(S.cart)===S.coSig;S.coId=null;
  if(same)coDone(id,no);
}
async function coDone(id,no){
  try{const r=await api('/api/co/'+id,{method:'POST',body:JSON.stringify({action:'done',saleNo:no})});if(r.ok||r.status===409||r.status===404)return}catch(e){}
  CO.pend.push({id,no});try{localStorage.setItem('pos_co_pend',JSON.stringify(CO.pend))}catch(e){}
}
async function coFlush(){
  if(!CO.pend.length||!CL.tok)return;
  const left=[];
  for(const p of CO.pend){try{const r=await api('/api/co/'+p.id,{method:'POST',body:JSON.stringify({action:'done',saleNo:p.no})});if(!(r.ok||r.status===409||r.status===404))left.push(p)}catch(e){left.push(p)}}
  CO.pend=left;try{localStorage.setItem('pos_co_pend',JSON.stringify(left))}catch(e){}
}
async function coSetOpen(on){
  try{
    const r=await api('/api/co/settings',{method:'PUT',body:JSON.stringify({on,msg:($('#coMsg')||{}).value||''})});
    if(!r.ok)throw 0;CO.set=await r.json();toast(on?'Pemesanan QR dibuka':'Pemesanan QR ditutup');
  }catch(e){toast('Gagal menyimpan');renderCoSet()}
}
/* QR */
function coQr(){
  openModal(`<h3>QR Pesanan</h3><div class="qrbox" id="qrBox"></div>
  <label class="fl">Nomor meja (opsional, pesanan otomatis tahu mejanya)</label>
  <input class="fi" id="qrT" value="${esc(S.coT||'')}" maxlength="12" oninput="coQrDraw()" placeholder="mis. 5">
  <label class="fl">Alamat website pelanggan (untuk QR)</label>
  <input class="fi" id="qrPub" value="${esc(db.set.pubUrl||window.POS_PUBLIC_URL||'')}" placeholder="https://namaanda.com/" inputmode="url" autocapitalize="none" onchange="coSetPub(this.value)">
  <p class="hint" id="qrWarn" style="color:#d33;display:none">Alamat QR masih localhost, pelanggan tidak bisa membukanya. Isi alamat website Anda di atas.</p>
  <p class="hint" id="qrU" style="word-break:break-all"></p>
  <button class="btn" onclick="coQrPrint()"><i class="ic" data-ic="print"></i>Cetak kartu QR</button>
  <button class="btn sec" onclick="coQrPng()"><i class="ic" data-ic="download"></i>Unduh gambar (PNG)</button>
  <button class="btn sec" onclick="coCopy()"><i class="ic" data-ic="copy"></i>Salin tautan</button>
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
  coQrDraw();
}
function coQrDraw(){if(!storeCode()&&!coQrDraw.busy){coQrDraw.busy=1;api('/api/me').then(r=>r.json()).then(m=>{if(m&&m.username){setMe(m)}}).catch(()=>{}).finally(()=>{coQrDraw.busy=0;if(storeCode()&&$('#qrBox'))coQrDraw()})}const t=($('#qrT').value||'').trim();S.coT=t;const u=coUrl(t);$('#qrBox').innerHTML=qrSvg(u,260);$('#qrU').textContent=u;const w=$('#qrWarn');if(w)w.style.display=urlLocal()?'':'none'}
function coQrPrint(){
  const t=S.coT||'',u=coUrl(t);
  $('#pageStyle').textContent='@media print{@page{size:auto;margin:8mm}}';
  openModal(`<h3>Kartu QR</h3><div class="rc-wrap"><div id="receipt" class="rcpt" style="text-align:center;font-size:14px;width:auto;max-width:340px;margin:auto;font-family:system-ui,sans-serif">
  <b style="font-size:22px">${esc(db.set.store)}</b><div style="margin:6px 0 2px">Scan untuk memesan</div>${qrSvg(u,260)}
  ${t?`<div style="font-size:28px;font-weight:800">MEJA ${esc(t)}</div>`:''}<div style="font-size:11px;margin-top:4px;word-break:break-all">${esc(u)}</div></div></div>
  <button class="btn" onclick="window.print()"><i class="ic" data-ic="print"></i>Cetak</button><button class="btn sec" onclick="coQr()">Kembali</button>`);
}
function coQrPng(){
  const t=S.coT||'',u=coUrl(t),M=qrMatrix(u),n=M.length,sc=Math.max(4,Math.floor(900/(n+8))),W=(n+8)*sc,H=W+260,c=document.createElement('canvas');
  c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.fillStyle='#000';
  for(let r=0;r<n;r++)for(let q=0;q<n;q++)if(M[r][q])x.fillRect((q+4)*sc,(r+4)*sc+90,sc,sc);
  x.textAlign='center';x.fillStyle='#111';x.font='bold 60px sans-serif';x.fillText(db.set.store||'Ordela',W/2,70,W-40);
  x.font='38px sans-serif';x.fillText('Scan untuk memesan',W/2,W+135);
  if(t){x.font='bold 70px sans-serif';x.fillText('MEJA '+t,W/2,W+225,W-40)}
  c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='qr-pesan'+(t?'-meja-'+t:'')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)});
}
async function coCopy(){
  const u=coUrl(S.coT||'');
  try{await navigator.clipboard.writeText(u);toast('Tautan disalin')}catch(e){prompt('Salin tautan ini:',u)}
}
/* halaman Pesanan Online */
function coReady(){
  const okP=pr=>{const m=pr.mode;return m==='browser'||m==='rawbt'||prnStatusOf(pr).ok};
  return okP(mainPrn())&&(db.set.prns||[]).filter(x=>(x.stations||[]).length).every(okP);
}
function renderCo(full){
  if(!$('#coList'))return;
  const st=CO.set||{on:true,msg:''};
  if(full||!$('#coTop').innerHTML){
    const ck=(k,d,l,fn)=>`<label class="tgl"><input type="checkbox" ${coPref(k,d)?'checked':''} onchange="${fn||`coSetPref('${k}',this.checked)`}"><span>${l}</span></label>`;
    $('#coTop').innerHTML=`<div class="tgls">${ck('auto',true,'Cetak tiket otomatis')}${ck('open',true,'Buka halaman ini saat pesanan masuk')}${ck('sound',true,'Bunyi saat pesanan masuk')}${ck('vib',true,'Getar saat pesanan masuk')}${ck('notif',true,'Notifikasi sistem',"coSetNotif(this.checked)")}${ck('awake',true,'Layar tetap menyala',"coSetAwake(this.checked)")}</div>
    <div class="cob"><button class="btn sec" onclick="coBeep()"><i class="ic" data-ic="bell"></i>Tes bunyi</button><button class="btn sec" onclick="coTestPrint()"><i class="ic" data-ic="print"></i>Tes tiket</button><button class="btn sec" onclick="prnConnect().then(()=>renderCo(false))"><i class="ic" data-ic="plug"></i>Sambungkan printer</button></div>`;
  }
  const gear=$('#coGear');if(gear)gear.hidden=!can('set');
  {const o=$('#coOn');if(o&&document.activeElement!==o)o.checked=!!st.on}
  const un=CO.list.filter(o=>(o.status==='new'||o.status==='accepted')&&o.printed===0).length,msgs=[];
  msgs.push(CO.err?['neg','<i class="ic" data-ic="alert"></i>Server tidak terhubung']:['','<i class="ic" data-ic="dot"></i>Terhubung']);
  if(coPref('notif',true)&&'Notification' in window){
    if(Notification.permission==='default')msgs.push(['neg','<i class="ic" data-ic="bell"></i>Notifikasi belum aktif <button class="tag" type="button" onclick="coSetNotif(true)">Aktifkan</button>']);
    else if(Notification.permission==='denied')msgs.push(['neg','<i class="ic" data-ic="bell"></i>Notifikasi diblokir di browser']);
  }
  if(!CO.aud||CO.aud.state!=='running')msgs.push(['neg','<i class="ic" data-ic="mute"></i>Ketuk layar untuk aktifkan bunyi']);
  if(coAuto()&&!coReady())msgs.push(['neg','<i class="ic" data-ic="print"></i>Printer belum terhubung']);
  if(un&&coAuto())msgs.push(['neg','<i class="ic" data-ic="clock"></i>'+un+' tiket belum tercetak']);
  $('#coStat').innerHTML=msgs.map(m=>`<div class="chg ${m[0]}" style="margin:0 0 8px"><span>${m[1]}</span></div>`).join('');
  const L=CO.list,act=L.filter(o=>o.status==='new'||o.status==='accepted').sort((a,b)=>a.id-b.id),
    fin=L.filter(o=>o.status==='done'||o.status==='cancelled').sort((a,b)=>b.id-a.id).slice(0,40);
  const isR=o=>(o.status==='new'||o.status==='accepted')&&(+o.kds||0)>=2,isP=o=>(o.status==='new'||o.status==='accepted')&&(+o.kds||0)<2;
  const lp=L.filter(isP).sort((a,b)=>a.id-b.id),lr=L.filter(isR).sort((a,b)=>a.id-b.id),
    ld=L.filter(o=>o.status==='done').sort((a,b)=>b.id-a.id).slice(0,40),lc=L.filter(o=>o.status==='cancelled').sort((a,b)=>b.id-a.id).slice(0,40);
  const tab=CO.tab||'prep',tabs=[['prep','Disiapkan',lp],['ready','Siap',lr],['done','Selesai',ld],['cancel','Batal',lc]];
  const card=o=>{
    const pb=isOnl(o)?(o.pst===2?'<span class="pst ok"><i class="ic" data-ic="card"></i>QRIS · diterima</span>':o.pst===1?'<span class="pst w"><i class="ic" data-ic="card"></i>'+(o.hp?'bukti masuk, perlu dicek':'klaim sudah bayar')+'</span>':o.pst===3?'<span class="pst">bukti ditolak</span>':'<span class="pst w"><i class="ic" data-ic="card"></i>QRIS · belum dibayar</span>'):'<span class="pst">Bayar di kasir</span>';
    const nitem=o.lines.reduce((a,l)=>a+l.qty,0);
    const btn=tab==='prep'?`<button class="btn" onclick="event.stopPropagation();coReadyAct(${o.id})"><i class="ic" data-ic="check"></i>Siap</button>`
      :tab==='ready'?`<button class="btn" onclick="event.stopPropagation();coPay(${o.id})"><i class="ic" data-ic="check"></i>Selesai</button><button class="btn sec" onclick="event.stopPropagation();coUnready(${o.id})" aria-label="Kembali disiapkan"><i class="ic" data-ic="undo"></i></button>`:'';
    const mins=Math.floor((Date.now()-new Date(o.t))/6e4),urg=(tab==='prep'||tab==='ready')?(mins>=20?' late':mins>=10?' warn':''):'';
    const prev=o.lines.slice(0,2).map(l=>`<li><b>${l.qty}×</b><span>${esc(l.name)}</span></li>`).join('')+(o.lines.length>2?`<li class="more">+${o.lines.length-2} item lainnya</li>`:'');
    return`<div class="coc cosm ${o.status}${CO.spot&&CO.spot.has(o.id)?' cospot':''}" data-id="${o.id}" onclick="coDet(${o.id})">
      <div class="coh"><span class="no">${esc(o.num)}</span><span class="cn">${esc(o.name)}</span><time class="${urg}">${ago(o.u&&tab!=='prep'?o.u:o.t)}</time></div>
      <div class="cos">${o.status==='new'?'<b class="nw">BARU</b>':''}<span>${o.tbl?'Meja '+esc(o.tbl):''}${o.tbl?' · ':''}${esc(o.type==='Dine In'?'Dine In':'Takeaway')}</span>${pb}</div>
      <ul class="cil">${prev}</ul>
      ${o.note?`<div class="nt"><i class="ic" data-ic="note"></i>${esc(o.note)}</div>`:''}
      <div class="cof"><span class="ctot">${money(o.total)}<small>${o.lines.reduce((a,l)=>a+l.qty,0)} item</small></span>${btn?`<span class="act">${btn}</span>`:'<span class="ch">›</span>'}</div></div>`;
  };
  {const td=new Date().toDateString(),nNew=act.filter(o=>o.status==='new').length,nAcc=act.filter(o=>o.status==='accepted').length,nDone=L.filter(o=>o.status==='done'&&new Date(o.u||o.t).toDateString()===td).length,vAct=act.reduce((a,o)=>a+(+o.total||0),0);
   const kc=(t,v,ic,bg)=>`<div class="kc"><div class="kt"><span>${t}</span></div><div class="kv"><span class="ki" style="background:${bg}"><i class="ic" data-ic="${ic}"></i></span>${v}</div></div>`;
   $('#coKp').innerHTML=kc('Pesanan baru',nNew,'bell','#f7c244')+kc('Diproses',nAcc,'clock','#3b9d6e')+kc('Selesai hari ini',nDone,'check','#6b7280')+kc('Nilai pesanan aktif',money(vAct),'card','#EF4444');}
  const cur=(tabs.find(x=>x[0]===tab)||tabs[0])[2];
  $('#coList').innerHTML=`<div class="cotabs" role="tablist">${tabs.map(x=>`<button role="tab" class="${x[0]===tab?'on':''}" onclick="coTab('${x[0]}')">${x[1]}${x[0]==='prep'||x[0]==='ready'?(x[2].length?`<i class="cnt">${x[2].length}</i>`:''):''}</button>`).join('')}</div>`
    +(cur.length?`<div class="cog">${cur.map(card).join('')}</div>`:`<div class="empty" style="padding:30px 10px">${tab==='prep'?'Belum ada pesanan baru.<br><small>Pesanan dari QR akan muncul di sini.</small>':tab==='ready'?'Belum ada pesanan siap diambil.':'Belum ada.'}</div>`);
  coSpotlight();
}
function coTab(t){CO.tab=t;renderCo(false)}
async function coReadyAct(id){
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  if(o.status==='new'&&!(await coAct(id,'accept')))return;
  if(await coAct(id,'ready')){o.status='accepted';o.kds=2;if(CO.spot)CO.spot.delete(id);CO.tab='ready';renderCo(false);coBadge();toast(o.num+' siap diambil')}
}
async function coUnready(id){closeModal();const o=CO.list.find(x=>x.id===id);if(o&&await coAct(id,'unready')){o.kds=0;CO.tab='prep';renderCo(false)}}
/* pesanan baru: kartu disorot (latar redup + denyut) sampai disentuh atau 12 detik */
function coSpotEnd(){CO.spot=null;clearTimeout(coSpotEnd.t);const b=$('#coSpotBg');if(b)b.remove();document.querySelectorAll('.cospot').forEach(e=>e.classList.remove('cospot'))}
function coSpotlight(){
  if(!CO.spot||!CO.spot.size||S.view!=='co')return;
  const el=[...document.querySelectorAll('#coList .cospot')][0];if(!el){return}
  if(!$('#coSpotBg')){const b=document.createElement('div');b.id='coSpotBg';b.onclick=coSpotEnd;document.body.appendChild(b)}
  try{el.scrollIntoView({block:'center',behavior:'smooth'})}catch(e){}
  clearTimeout(coSpotEnd.t);coSpotEnd.t=setTimeout(coSpotEnd,12000);
}
function coDet(id){coSpotEnd();
  const o=CO.list.find(x=>x.id===id);if(!o)return;
  const tm=t=>new Date(t).toLocaleString(dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  openModal(`<h3>${esc(o.num)} · ${esc(o.name)}</h3>
  <table class="dl"><tr><td>Status</td><td>${o.status==='cancelled'?'Dibatalkan':o.status==='done'?'Selesai':(+o.kds||0)>=2?'Siap diambil':o.status==='accepted'?'Disiapkan':'Baru'}</td></tr>
  <tr><td>Dilayani oleh</td><td>${o.by?esc(o.by):'Pelanggan (pesan sendiri)'}</td></tr>
  <tr><td>Masuk</td><td>${tm(o.t)}</td></tr>${o.u&&o.u!==o.t?`<tr><td>Terakhir diubah</td><td>${tm(o.u)}</td></tr>`:''}
  <tr><td>Tipe</td><td>${o.tbl?'Meja '+esc(o.tbl)+' · ':''}${o.type==='Dine In'?'Dine In':'Takeaway'}</td></tr>
  ${o.saleNo?`<tr><td>Invoice</td><td>${esc(o.saleNo)}</td></tr>`:''}
  <tr><td>Pembayaran</td><td>${isOnl(o)?'QRIS · '+(o.pst===2?'diterima':o.pst===1?(o.hp?'bukti masuk, menunggu persetujuan':'pelanggan klaim sudah bayar'):o.pst===3?'bukti ditolak':'belum dibayar'):'Bayar di kasir'}</td></tr>
  <tr><td>Tiket</td><td>${o.printed===2?'tercetak':'belum tercetak'}</td></tr></table>
  <table class="dl">${o.lines.map(l=>`<tr><td>${l.qty}× ${esc(l.name)}<br><small>${money(l.price)}</small></td><td>${money(l.price*l.qty)}</td></tr>`).join('')}
  <tr><td>Subtotal</td><td>${money(o.sub)}</td></tr>${o.tax?`<tr><td>Pajak</td><td>${money(o.tax)}</td></tr>`:''}<tr class="tt"><td>Total</td><td>${money(o.total)}</td></tr></table>
  ${o.note?`<div class="nt"><i class="ic" data-ic="note"></i>${esc(o.note)}</div>`:''}
  ${o.saleNo&&db.orders.some(x=>x.no===o.saleNo)?`<button class="btn" onclick="histOpen('${esc(o.saleNo)}')">Lihat transaksi ${esc(o.saleNo)}</button>`:''}
  ${o.hp?`<button class="btn" onclick="coProof(${o.id})"><i class="ic" data-ic="image"></i>Lihat bukti bayar</button>`:''}
  ${(o.status==='new'||o.status==='accepted')?`<div class="cob">${(+o.kds||0)>=2?`<button class="btn" onclick="closeModal();coPay(${o.id})"><i class="ic" data-ic="check"></i>Selesai</button><button class="btn sec" onclick="coUnready(${o.id})"><i class="ic" data-ic="undo"></i>Kembali disiapkan</button>`:`<button class="btn" onclick="closeModal();coReadyAct(${o.id})"><i class="ic" data-ic="check"></i>Siap</button>`}${isOnl(o)&&o.pst===2?`<button class="btn sec" onclick="closeModal();coAct(${o.id},'unpaid')"><i class="ic" data-ic="undo"></i>Batalkan konfirmasi bayar</button>`:''}${can('pos')&&(+o.kds||0)<2?`<button class="btn sec" onclick="closeModal();coPay(${o.id})"><i class="ic" data-ic="card"></i>Bayar</button>`:''}<button class="btn sec" onclick="closeModal();coCancel(${o.id})"><i class="ic" data-ic="x"></i>Batalkan pesanan</button></div>`:''}
  <button class="btn sec" onclick="coPrint(${o.id});closeModal()"><i class="ic" data-ic="print"></i>Cetak ulang tiket</button>
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
function setPay(k,v){db.set.pay[k]=v;save();renderPay()}
/* simpan kode QRIS statis toko (teks). Diperiksa dulu: format, CRC, dan harus QRIS Indonesia. */
function payQrisSave(txt){
  txt=String(txt||'').replace(/[\r\n\t]+/g,'').trim();
  if(!txt){db.set.pay.qris='';db.set.pay.on=false;save();renderPay();return}
  const c=QRIS.check(txt);
  if(!c.ok){toast(c.err);renderPay();return}
  if(c.dynamic||c.hasAmount){toast('Ini QRIS dinamis (sudah ada nominal). Pakai QRIS statis dari aplikasi merchant Anda.');renderPay();return}
  db.set.pay.qris=txt;if(!db.set.pay.name)db.set.pay.name=c.name||db.set.store||'';
  save();renderPay();toast('QRIS tersimpan: '+(c.name||'merchant'))
}
async function payQrisImg(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  try{
    const t=await QRIS.decodeImage(f);
    if(!t){toast('QR tidak terbaca dari foto itu. Coba foto yang lebih jelas, atau tempel kodenya.');return}
    payQrisSave(t);
  }catch(e){toast(e&&e.message==='nosupport'?'Browser ini belum bisa membaca QR dari foto. Tempel kode QRIS-nya (lihat petunjuk).':'Foto tidak bisa dibaca')}
}
/* uji coba: tampilkan QRIS dinamis Rp 1.000 supaya owner bisa memindainya dengan aplikasi bank sendiri */
function payQrisTest(){
  const y=db.set.pay;let q='';
  try{q=QRIS.dynamic(y.qris,1000)}catch(e){toast(e.message);return}
  openModal(`<h3>Uji QRIS dinamis</h3><p class="mu" style="margin:0 0 8px">Pindai dengan aplikasi e-wallet/m-banking. Nominal harus muncul otomatis <b>${money(1000)}</b>. Kalau tidak muncul, QRIS statis Anda tidak mendukung nominal dinamis; hubungi penyedia QRIS Anda.</p><div style="text-align:center;background:#fff;padding:10px;border-radius:12px">${qrSvg(q,260)}</div><button class="btn sec" style="margin-top:12px" onclick="closeModal()">Tutup</button>`);
}
function renderPay(){
  const p=$('#payForm');if(!p)return;
  if(!(CL.on&&can('co')&&can('set'))){p.hidden=true;applySetTab();return}
  p.hidden=false;const y=db.set.pay,c=y.qris?QRIS.check(y.qris):null,ok=!!(c&&c.ok);
  p.innerHTML=`<h3>Pembayaran Online (QRIS dinamis)</h3>
    <label class="tgl"><input type="checkbox" ${y.on&&ok?'checked':''} ${ok?'':'disabled'} onchange="setPay('on',this.checked)"><span>Tawarkan bayar online saat pelanggan memesan lewat QR</span></label>
    <p class="mu" style="margin:6px 0 10px">Aplikasi mengubah QRIS statis toko Anda menjadi <b>QRIS dinamis</b>: nominal pesanan terisi otomatis di aplikasi bank pelanggan. Pembayaran tetap Anda konfirmasi lewat bukti bayar atau mutasi.</p>
    <label class="fl">Kode QRIS statis toko</label>
    <textarea class="fi" rows="3" maxlength="520" spellcheck="false" placeholder="Tempel kode QRIS yang diawali 000201…" onchange="payQrisSave(this.value)">${esc(y.qris||'')}</textarea>
    ${y.qris?(ok?`<div class="chg" style="margin:8px 0"><span><i class="ic" data-ic="check"></i>QRIS valid · ${esc(c.name||'merchant')}</span></div>`:`<div class="chg neg" style="margin:8px 0"><span>${esc((c&&c.err)||'Kode tidak valid')}</span></div>`):''}
    <div class="cob"><button class="btn sm sec" onclick="$('#pqF').click()"><i class="ic" data-ic="image"></i>Baca dari foto QRIS</button>
    ${ok?`<button class="btn sm" onclick="payQrisTest()"><i class="ic" data-ic="qr"></i>Uji QR dinamis</button><button class="mini" style="color:var(--bt)" onclick="if(confirm('Hapus QRIS toko?'))payQrisSave('')">Hapus</button>`:''}
    <input type="file" id="pqF" accept="image/*" hidden onchange="payQrisImg(this)"></div>
    <details style="margin:8px 0"><summary>Cara mendapatkan kode QRIS</summary><p class="mu" style="margin:6px 0">Pindai stiker QRIS toko Anda dengan aplikasi pemindai QR apa pun (atau tombol baca foto di atas pada Chrome Android), lalu salin teks hasilnya. Teks itu panjang dan diawali <code>000201</code>. Gunakan QRIS <b>statis</b> milik toko Anda sendiri; QRIS dari pelanggan atau yang sudah ada nominalnya akan ditolak.</p></details>
    <label class="fl">Nama penerima (tampil ke pelanggan)</label>
    <input class="fi" value="${esc(y.name||'')}" maxlength="60" placeholder="mis. Ordela" onchange="setPay('name',this.value.trim())">
    <label class="fl">Petunjuk tambahan (opsional)</label>
    <textarea class="fi" rows="2" maxlength="300" placeholder="mis. Tulis nomor pesanan di kolom catatan" onchange="setPay('note',this.value.trim())">${esc(y.note||'')}</textarea>
`;
}
function renderCoSet(){
  const p=$('#coForm');if(!p)return;
  if(!(CL.on&&can('co')&&can('set'))){p.hidden=true;applySetTab();return}
  p.hidden=false;const st=CO.set||{on:true,msg:''};
  p.innerHTML=`<h3>Pesan lewat QR</h3>
    <label class="tgl"><input type="checkbox" id="coOn" ${st.on?'checked':''} onchange="coSetOpen(this.checked)"><span>Terima pesanan dari pelanggan</span></label>
    <label class="fl">Pesan saat ditutup (tampil ke pelanggan)</label>
    <input class="fi" id="coMsg" value="${esc(st.msg||'')}" maxlength="200" placeholder="mis. Dapur tutup, silakan pesan ke kasir" onchange="coSetOpen($('#coOn').checked)">
    <div class="cob"><button class="btn" onclick="coQr()"><i class="ic" data-ic="qr"></i>Tampilkan / Cetak QR</button><button class="btn sec" onclick="coCopy()"><i class="ic" data-ic="copy"></i>Salin tautan</button></div>
${ntForm()}`;
}
function coStart(){
  if(!CL.on)return;
  CO.title=document.title;
  try{CO.pend=JSON.parse(localStorage.getItem('pos_co_pend')||'[]')}catch(e){CO.pend=[]}
  coBadge();coLoop();coWake();coPushSync();
  setInterval(()=>{
    if(!CL.tok||!can('co'))return;
    if(S.view==='co')renderCo(false);
    coAutoPrint();coFlush();
    if(CO.ring<3&&S.view!=='co'&&coNew().length){CO.ring++;coBeep()}
  },10000);
}

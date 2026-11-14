/* Ordela — modul pengaturan: riwayat, pengaturan, alamat GPS, backup, mata uang, tema, bahasa.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
/* ---------- history ---------- */
const dkey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
/* periode Beranda: preset dihitung ulang tiap render (supaya "Hari ini" ikut berganti saat lewat tengah malam); 'custom' memakai tanggal yang dipilih */
function hrSync(){
  const k=S.hr;if(k==='custom')return;
  const now=new Date(),off=n=>{const d=new Date(now);d.setDate(d.getDate()-n);return dkey(d)};
  if(k==='today')S.hf=S.ht=off(0);
  else if(k==='yest')S.hf=S.ht=off(1);
  else if(k==='7'){S.hf=off(6);S.ht=off(0)}
  else if(k==='month'){S.hf=dkey(new Date(now.getFullYear(),now.getMonth(),1));S.ht=off(0)}
  else{S.hf=S.ht=''}
}
function setHR(k){S.hr=k;S.hn=25;hrSync();renderHome()}
function histOpen(no){
  const x=db.orders.find(o=>o.no===no);if(!x)return;
  const cost=x.lines.reduce((a,l)=>a+(l.cost||0)*l.qty,0);
  openModal(`<h3>${esc(x.no)}</h3>
  <div class="hint" style="margin:-6px 0 6px">${new Date(x.t).toLocaleString(dloc(),{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
  <table class="dl">
  <tr><td>Tipe</td><td>${esc(x.type)}</td></tr>
  <tr><td>Metode bayar</td><td>${esc(x.method)}</td></tr>
  ${x.cashier?`<tr><td>Kasir</td><td>${esc(x.cashier)}</td></tr>`:''}${x.cust?`<tr><td>Pelanggan</td><td style="white-space:normal">${esc(x.cust)}</td></tr>`:''}</table>
  <table class="dl">${x.lines.map(l=>`<tr><td>${l.qty}× ${esc(l.name)}<br><small>${money(l.price)}</small>${Array.isArray(l.bd)&&l.bd.length?`<br><small>Isi: ${esc(bdLbl(l.bd))}</small>`:''}</td><td>${money(l.price*l.qty)}</td></tr>`).join('')}</table>
  <table class="dl">
  <tr><td>Subtotal</td><td>${money(x.sub)}</td></tr>
  ${x.disc?`<tr><td>Diskon</td><td>−${money(x.disc)}</td></tr>`:''}${x.tax?`<tr><td>Pajak</td><td>${money(x.tax)}</td></tr>`:''}
  <tr class="tt"><td>Total</td><td>${money(x.total)}</td></tr>
  ${x.method==='Tunai'?`<tr><td>Diterima</td><td>${money(x.paid)}</td></tr><tr><td>Kembalian</td><td>${money(x.change||0)}</td></tr>`:''}
  ${isOwner()?`<tr><td>Estimasi laba</td><td>${money(x.total-x.tax-cost)}</td></tr>`:''}</table>
  <button class="btn" onclick="showReceipt(db.orders.find(o=>o.no==='${esc(x.no)}'))"><i class="ic" data-ic="print"></i>Lihat / Cetak Struk</button>
  ${isOwner()?`<button class="btn sec" style="color:var(--bad)" onclick="histDel('${esc(x.no)}')"><i class="ic" data-ic="trash"></i>Hapus transaksi</button>`:''}
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
function histDel(no){
  const x=db.orders.find(o=>o.no===no);if(!x||!isOwner())return;
  openModal(`<h3>Hapus transaksi?</h3>
  <label class="tgl"><input type="checkbox" id="hdBack" checked><span>Kembalikan stok item ke inventori</span></label>
  <button class="btn" style="background:var(--bad)" onclick="histDelDo('${esc(x.no)}')">Ya, hapus</button>
  <button class="btn sec" onclick="histOpen('${esc(x.no)}')">Batal</button>`);
}
function histDelDo(no){
  if(!isOwner())return;
  const i=db.orders.findIndex(o=>o.no===no);if(i<0){closeModal();return}
  const o=db.orders[i],back=!!($('#hdBack')||{}).checked,now=new Date().toISOString();
  if(back)o.lines.forEach(l=>{if(Array.isArray(l.bd)&&l.bd.length){l.bd.forEach(c=>{const x=find(c.id);if(x&&!isB(x)){const d=c.q*l.qty;x.stock+=d;logAdd(x.name,d,'Hapus transaksi '+no,x.stock,now)}});return}const it=l.id&&find(l.id);if(it&&!isB(it)){it.stock+=l.qty;logAdd(it.name,l.qty,'Hapus transaksi '+no,it.stock,now)}});
  db.log=db.log.slice(0,LOG_MAX);
  db.voided=[{no,t:o.t,total:o.total,method:o.method,by:(CL.me&&CL.me.name)||'Owner',at:now,back},...(db.voided||[])].slice(0,200);
  if(o.mem){const mm=(db.members||[]).find(x=>x.id===o.mem.id);if(mm){mm.pts=Math.max(0,(+mm.pts||0)-(o.mem.earn||0)+(o.mem.used||0));mm.visits=Math.max(0,(+mm.visits||1)-1);mm.spent=Math.max(0,rnd((+mm.spent||0)-o.total));mm.u=Date.now()}}
  db.orders.splice(i,1);save();closeModal();toast('Transaksi dihapus');render();
}
function setHD(){
  let f=$('#hFrom').value,t=$('#hTo').value;
  if(f&&t&&f>t){const x=f;f=t;t=x}
  S.hn=25;S.hf=f;S.ht=t;S.hr=(f||t)?'custom':'all';renderHome();
}
/* daftar transaksi pada periode terpilih (bagian bawah Beranda) */
function renderHist(){
  const hb=$('#histBody');if(!hb)return;
  const o=db.orders,rows=[];
  o.forEach((x,i)=>{const k=dkey(x.t);if((!S.hf||k>=S.hf)&&(!S.ht||k<=S.ht))rows.push({x,i,k})});
  const sum=l=>l.reduce((a,b)=>a+b.total,0);
  const n=S.hn||25,tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
  let h='',cur='';
  for(const r of rows.slice(0,n)){
    if(r.k!==cur){
      cur=r.k;const g=rows.filter(z=>z.k===cur).map(z=>z.x);
      h+=`<div class="dhd"><b>${new Date(r.x.t).toLocaleDateString(dloc(),{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}</b> · ${g.length} Transaksi · <b>${money(sum(g))}</b></div>`;
    }
    const x=r.x;
    h+=`<button class="li" data-no="${esc(x.no)}" onclick="histOpen(this.dataset.no)"><span class="l"><b>${esc(x.no)}</b><small>${tm(x.t)} · ${esc(x.type)}${x.tbl?' · Meja '+esc(x.tbl):''}${x.cashier?' · '+esc(x.cashier):''}</small></span><span class="pm ${/tunai|cash/i.test(x.method)?'c':/debit|kartu|card/i.test(x.method)?'d':'w'}">${esc(x.method)}</span><span class="r"><b>${money(x.total)}</b>${x.cust?`<small>${esc(x.cust)}</small>`:''}</span><span class="ch">›</span></button>`;
  }
  $('#histBody').innerHTML=h||'<div style="color:var(--mu);padding:6px 4px">'+(o.length?'Tidak ada transaksi pada periode ini.':'Belum ada transaksi.')+'</div>';
  $('#histMore').hidden=rows.length<=n;
  const vb=$('#voidBox'),vd=db.voided||[];
  if(vb){const was=!!(vb.querySelector('details')||{}).open;vb.hidden=!(isOwner()&&vd.length);if(!vb.hidden)vb.innerHTML=`<details${was?' open':''}><summary style="font-weight:700;cursor:pointer">Transaksi yang dihapus (${vd.length})</summary><div class="vdl" style="margin-top:8px">${vd.slice(0,50).map(v=>`<div><b>${esc(v.no)}</b> · ${money(v.total)} · ${esc(v.method||'')}<br>Dihapus ${new Date(v.at).toLocaleString(dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} oleh ${esc(v.by||'')}${v.back?' · stok dikembalikan':''}</div>`).join('')}</div></details>`}
}
function setTab(k){S.setSub=({toko:'setForm',co:'coForm',tampil:'themeForm',data:'dbForm'})[k]||null;applySetTab()}
function setOpen(id){S.setSub=id;applySetTab();const m=$('main');if(m&&m.scrollTo)m.scrollTo(0,0);window.scrollTo(0,0)}
function setHubList(){
  const box=$('#setHubList');if(!box)return;
  const q=(($('#setQ')||{}).value||'').trim().toLowerCase();
  const its=SETP.filter(p=>p[6]==='#owner'?isOwner():can(p[6]||'set')).filter(p=>{if(p[0]==='rc'||p[0]==='prn'||p[0]==='invSet'||p[0]==='voiceSet')return true;const e=$('#'+p[0]);return e&&!e.hidden}).filter(p=>!q||(p[3]+' '+p[4]+' '+p[5]+' '+p[1]).toLowerCase().includes(q));
  if(!its.length){box.innerHTML=`<p class="pfhint" style="text-align:center;padding:28px 0">Tidak ada pengaturan yang cocok dengan “${esc(q)}”.</p>`;return}
  let h='',g='';
  its.forEach(p=>{
    if(p[1]!==g){if(g)h+='</div>';g=p[1];h+=`<div class="pfgl">${esc(g)}</div><div class="pfgrp">`}
    h+=`<button type="button" onclick="${p[0]==='invSet'?'P2.invSet()':p[0]==='voiceSet'?'P2.voiceSet()':p[0]==='rc'||p[0]==='prn'?`go('${p[0]}')`:`setOpen('${p[0]}')`}"><span class="ib2">${pfi(p[2],20)}</span><span class="tx"><b>${esc(p[3])}</b><small>${esc(p[4])}</small></span><span class="chev">${pfi('chev',18)}</span></button>`;
  });
  box.innerHTML=h+'</div>';
}
function applySetTab(){
  const sec=$('#v-set');if(!sec||!sec.querySelectorAll)return;
  const hub=$('#setHub'),sb=$('#setSubBar');if(!hub||!sb)return;
  let sub=S.setSub;const sp=SETP.find(p=>p[0]===sub),pe=sp&&$('#'+sub);
  if(!pe||pe.hidden){sub=S.setSub=null}
  if(!hub.dataset.built){hub.dataset.built='1';hub.innerHTML=`<div class="pfin pfsrch" style="margin:0 0 4px">${pfi('search',18)}<input class="fi" id="setQ" type="search" placeholder="Cari pengaturan" autocomplete="off" oninput="setHubList()" aria-label="Cari pengaturan"></div><div id="setHubList"></div>`}
  if(sub==='attForm'){if(!pe.dataset.built){pe.dataset.built='1';attCfgDraw()}}else{const af=$('#attForm');if(af)af.dataset.built=''}
  hub.hidden=!!sub;sb.hidden=!sub;
  sec.querySelectorAll('.panel[data-g]').forEach(p=>p.classList.toggle('gh',p.id!==sub));
  if(sub)sb.innerHTML=pfSub(esc(sp[3]),"setOpen(null)");
  if(!sub)setHubList();
}
function renderSet(){
  const s=db.set;
  $('#setForm').innerHTML=`<h3>Toko</h3>
  <label class="fl">Nama toko</label><input class="fi" id="sN" value="${esc(s.store)}">
  <label class="fl">Alamat / telepon (tampil di struk)</label><input class="fi" id="sA" value="${esc(s.addr)}">
  <div class="chips" style="margin:6px 0 2px"><button class="chip" type="button" onclick="addrGps()">📍 Isi alamat dari GPS</button></div>
  <div class="two"><div><label class="fl">Pajak (%)</label><input class="fi" id="sT" type="number" min="0" step="0.1" value="${s.tax}"></div>
  <div></div></div>
  <div class="two"><div><label class="fl">Batas stok menipis (default)</label><input class="fi" id="sL" type="number" min="0" value="${s.low}"></div><div></div></div>
  <button class="btn" onclick="saveSet()">Simpan Pengaturan</button>`;
  renderTheme();
  renderLogo();
  renderDb();
  renderLang();
  renderCur();
  renderSec();
  renderCoSet();renderPay();applySetTab();
  $('#catMgr').innerHTML=db.cats.map(c=>`<span class="chip" style="display:inline-flex;gap:8px;margin:0 6px 6px 0">${esc(c)} <button style="color:var(--bad)" onclick="delCat('${esc(c).replace(/'/g,"\\'")}')"><i class="ic solo" data-ic="x"></i></button></span>`).join('')||'<span style="color:var(--mu)">Belum ada kategori</span>';
}
/* ---------- alamat toko dari GPS: layanan gratis OpenStreetMap Nominatim (tanpa kunci API) ---------- */
function addrFrom(j){
  const a=(j&&j.address)||{},road=[a.road||a.pedestrian||a.footway,a.house_number].filter(Boolean).join(' No. ');
  const parts=[road,a.neighbourhood||a.quarter,a.suburb||a.village||a.city_district,a.city||a.town||a.municipality||a.county,a.state,a.postcode].filter(Boolean);
  const out=parts.length>=2?parts.join(', '):String((j&&j.display_name)||'');
  return out.slice(0,160);
}
async function addrFetch(la,lo){
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),9000);
  try{
    const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=id&lat='+la+'&lon='+lo,{signal:ac.signal,headers:{Accept:'application/json'}});
    if(!r.ok)throw 0;const t=addrFrom(await r.json());if(!t)throw 0;return t;
  }catch(e){return ''}finally{clearTimeout(tm)}
}
function addrGps(){
  if(!navigator.geolocation){toast('Perangkat ini tidak mendukung lokasi');return}
  toast('Mencari lokasi…');
  navigator.geolocation.getCurrentPosition(async p=>{
    const t=await addrFetch(p.coords.latitude.toFixed(6),p.coords.longitude.toFixed(6)),a=$('#sA');
    if(t&&a){a.value=t;toast('Alamat terisi. Periksa lalu tekan Simpan Pengaturan.')}
    else toast('Alamat tidak bisa diambil (butuh internet).');
  },er=>toast(er&&er.code===1?'Izin lokasi ditolak. Aktifkan di pengaturan browser.':'Lokasi tidak ditemukan'),{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
}
function saveSet(){
  Object.assign(db.set,{store:$('#sN').value.trim()||'Toko',addr:$('#sA').value,tax:Math.max(0,+$('#sT').value||0),low:Math.max(0,+$('#sL').value||0)});
  save();applyBrand();toast('Pengaturan disimpan');render();
}
function addCat(){const v=$('#newCat').value.trim();if(!v)return;if(!db.cats.includes(v))db.cats.push(v);$('#newCat').value='';save();renderSet()}
function delCat(c){
  const n=db.items.filter(i=>i.cat===c).length;
  if(n){toast(`Masih ada ${n} item di kategori ini`);return}
  db.cats=db.cats.filter(x=>x!==c);if(S.cat===c)S.cat='all';save();renderSet()
}
function histExportData(){
  const pad=n=>String(n).padStart(2,'0'),rows=db.orders.filter(x=>{const k=dkey(x.t);return(!S.hf||k>=S.hf)&&(!S.ht||k<=S.ht)}).slice().sort((a,b)=>a.t<b.t?-1:a.t>b.t?1:0);
  const d=t=>{const x=new Date(t);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())},h=t=>{const x=new Date(t);return pad(x.getHours())+':'+pad(x.getMinutes())};
  const ds=t=>{const x=new Date(t);return{n:Math.round(Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())/86400000)+25569,d:1}},I=v=>({n:+v||0,i:1}),Cc=v=>({t:v==null?'':String(v),c:1});
  const cost=x=>x.lines.reduce((a,l)=>a+(l.cost||0)*l.qty,0),n=rows.length;
  const tx=[['No Invoice','Tanggal','Jam','Tipe','Kasir','Pelanggan','Metode','Subtotal','Diskon','Pajak','Total','Diterima','Kembalian','Modal (HPP)','Estimasi Laba']];
  rows.forEach(x=>tx.push([x.no,ds(x.t),Cc(h(x.t)),Cc(x.type||''),x.cashier||'',x.cust||'',Cc(x.method||''),+x.sub||0,+x.disc||0,+x.tax||0,+x.total||0,+x.paid||0,+x.change||0,cost(x),(+x.total||0)-(+x.tax||0)-cost(x)]));
  const sum=k=>rows.reduce((a,x)=>a+(+k(x)||0),0),C=i=>String.fromCharCode(65+i);
  if(n){const r=['TOTAL','','','','','','',...[7,8,9,10].map(i=>({f:`SUM(${C(i)}2:${C(i)}${n+1})`,v:sum(x=>[x.sub,x.disc,x.tax,x.total][i-7])})),'','',{f:`SUM(N2:N${n+1})`,v:sum(cost)},{f:`SUM(O2:O${n+1})`,v:sum(x=>x.total-x.tax-cost(x))}];r[0]={t:'TOTAL',b:1};tx.push(r)}
  const it=[['No Invoice','Tanggal','Item','Qty','Harga','Subtotal','Modal / unit','Total Modal']];
  rows.forEach(x=>x.lines.forEach(l=>it.push([x.no,ds(x.t),l.name,I(l.qty),+l.price||0,(+l.price||0)*(+l.qty||0),+l.cost||0,(+l.cost||0)*(+l.qty||0)])));
  const by={},pr={};
  rows.forEach(x=>{const m=x.method||'-';(by[m]=by[m]||[0,0])[0]++;by[m][1]+=+x.total||0;x.lines.forEach(l=>{const p=pr[l.bn||l.name]=pr[l.bn||l.name]||[0,0];p[0]+=+l.qty||0;p[1]+=(+l.price||0)*(+l.qty||0)})});
  const per=(S.hf||S.ht)?(S.hf||'…')+' s/d '+(S.ht||'…'):'Semua tanggal';
  const sm=[[{t:'Ringkasan Penjualan',title:1}],[{t:'Toko',b:1},db.set.store||''],[{t:'Periode',b:1},per],[{t:'Diekspor',b:1},d(new Date())+' '+h(new Date())],[''],[{t:'Jumlah transaksi',b:1},I(n)],[{t:'Penjualan (total)',b:1},sum(x=>x.total)],[{t:'Rata-rata per transaksi',b:1},n?Math.round(sum(x=>x.total)/n):0],[{t:'Pajak',b:1},sum(x=>x.tax)],[{t:'Diskon',b:1},sum(x=>x.disc)],[{t:'Estimasi laba',b:1},sum(x=>x.total-x.tax-cost(x))],[''],
    [{t:'Per metode bayar',b:1},{t:'Jumlah',b:1},{t:'Total',b:1}],...Object.entries(by).map(([m,v])=>[m,I(v[0]),v[1]]),[''],
    [{t:'Item terlaris',b:1},{t:'Qty',b:1},{t:'Omzet',b:1}],...Object.entries(pr).sort((a,b)=>b[1][0]-a[1][0]).slice(0,30).map(([m,v])=>[m,I(v[0]),v[1]])];
  return{n,sheets:[{name:'Ringkasan',rows:sm,w:[28,22,18],grid:1},{name:'Transaksi',rows:tx,head:1,total:n?1:0,w:[26,13,8,11,14,18,12,13,11,11,13,13,12,13,14]},{name:'Detail Item',rows:it,head:1,w:[26,13,28,7,12,13,13,13]}]};
}
function exportXlsx(){
  if(!db.orders.length){toast('Belum ada transaksi');return}
  const x=histExportData();if(!x.n){toast('Tidak ada transaksi pada tanggal ini');return}
  const a=document.createElement('a'),dd=dkey(new Date());
  a.href=URL.createObjectURL(xlsxBuild(x.sheets,dec()));
  a.download='riwayat-penjualan-'+(S.hf||S.ht?(S.hf||'awal')+'_sd_'+(S.ht||dd):dd)+'.xlsx';
  document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},4000);
  toast('Excel diunduh ('+x.n+' transaksi)');
}
function backup(){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db)],{type:'application/json'}));
  a.download='sushi-pos-database-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  db.set.lastBackup=Date.now();save();if(S.view==='set')renderDb();
}
function exportCSV(){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  const rows=[['Nama','Kategori','Harga','Modal','Stok']].concat(db.items.map(i=>[i.name,i.cat,i.price,i.cost||0,i.stock]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='inventori.csv';a.click();
}
/* ---------- backup / reset (tanpa confirm()) ---------- */
function restore(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    let d;
    try{d=JSON.parse(e.target.result);if(!d.items||!d.set)throw 0}catch(x){toast('File backup tidak valid');return}
    ask('Pulihkan backup?','Semua data saat ini akan ditimpa dengan isi file backup.','Pulihkan',()=>{
      snapNow('snap-prerestore').catch(()=>{});applyDb(d);
    });
  };
  r.readAsText(f);inp.value='';
}
function resetAll(){
  ask('Reset semua data?','Semua item, riwayat, dan pengaturan dihapus lalu kembali ke data contoh.','Reset',()=>{
    db=fixDb(seed());S.cart={};S.sel.clear();S.cat='all';save();
    applyBrand();go('pos');toast('Data direset');
  });
}
function quickAmts(){
  const code=Object.keys(CURS).find(k=>CURS[k][0]===db.set.cur&&CURS[k][1]===dec())||db.set.curCode||'CUSTOM';
  const presets={
    IDR:[20000,50000,100000,200000,500000],
    MYR:[1,5,10,20,50,100],
    USD:[1,5,10,20,50,100],
    SGD:[2,5,10,50,100],
    EUR:[5,10,20,50,100,200],
    GBP:[5,10,20,50],
    AUD:[5,10,20,50,100],
    JPY:[1000,5000,10000],
    THB:[20,50,100,500,1000],
    SAR:[5,10,50,100,500],
    AED:[5,10,50,100,500]
  };
  if(presets[code])return presets[code];
  return dec()?[5,10,20,50,100,200]:[1000,5000,10000,50000];
}
function amtLbl(v){return (db.set.curCode==='IDR'||(db.set.cur==='Rp'&&dec()===0))?(v>=1000?(v/1000)+'rb':fmtNum(v)):fmtNum(v)}
function matchCur(){
  const s=db.set;
  const k=Object.keys(CURS).find(c=>{const[a,b,l,p]=CURS[c];return a===s.cur&&b===+s.dec&&l===s.loc&&p===s.curPos});
  s.curCode=k||'CUSTOM';
}
function curEx(){const e=$('#curEx');if(e)e.textContent=money(1234.56)+'  ·  '+money(0.5)}
function pickCur(c){
  const s=db.set;
  if(CURS[c]){const[sym,dc,loc,pos]=CURS[c];Object.assign(s,{cur:sym,dec:dc,loc,curPos:pos,curCode:c})}
  else s.curCode='CUSTOM';
  save();renderCur();
}
function setCur(k,v,re){db.set[k]=v;matchCur();save();if(re)renderCur();else curEx()}
function renderCur(){
  const s=db.set,el=$('#curForm');if(!el)return;
  const op=(v,t,cur)=>`<option value="${v}" ${String(cur)===String(v)?'selected':''}>${t}</option>`;
  el.innerHTML=`<h3>Mata Uang &amp; Harga</h3>
  <label class="fl">Mata uang</label>
  <select class="fi" onchange="pickCur(this.value)">${Object.keys(CURS).map(c=>op(c,c+' ('+CURS[c][0]+')',s.curCode)).join('')}${op('CUSTOM','Lainnya (atur manual)',s.curCode)}</select>
  <div class="two"><div><label class="fl">Simbol</label><input class="fi" value="${esc(s.cur)}" oninput="setCur('cur',this.value)"></div>
  <div><label class="fl">Posisi simbol</label><select class="fi" onchange="setCur('curPos',this.value,1)">${op('before','Di depan (Rp 1.000)',s.curPos)}${op('after','Di belakang (1.000 Rp)',s.curPos)}</select></div></div>
  <div class="two"><div><label class="fl">Angka desimal</label><select class="fi" onchange="setCur('dec',+this.value,1)">${[0,1,2,3,4].map(n=>op(n,n+(n?' desimal':' (bulat)'),s.dec)).join('')}</select></div>
  <div><label class="fl">Format angka</label><select class="fi" onchange="setCur('loc',this.value,1)">${op('id-ID','1.234,56 (titik ribuan)',s.loc)}${op('en-US','1,234.56 (koma ribuan)',s.loc)}</select></div></div>
  <div class="chg" style="background:var(--chip);color:var(--tx)"><span>Contoh</span><span id="curEx"></span></div>
`;
  curEx();
}
const lang=()=>db.set.lang||'id';
const dloc=()=>DATE_LOC[lang()]||'id-ID';
function tr(s){
  const L=lang();
  if(L==='id'||!s)return s;
  const D=TRD[L]||{};
  const pre=(s.match(/^[\s\p{S}\p{M}]*/u)||[''])[0],rest=s.slice(pre.length);
  const tail=(rest.match(/\s*$/)||[''])[0],body=rest.slice(0,rest.length-tail.length);
  if(!body)return s;
  if(D[body]!==undefined)return pre+D[body]+tail;
  const post=(body.match(/[\p{P}\p{S}\p{M}]*$/u)||[''])[0],core=body.slice(0,body.length-post.length);
  if(core&&D[core]!==undefined)return pre+D[core]+post+tail;
  for(const [re,o] of TR_RULES){
    const r=o[L];
    if(r!==undefined&&re.test(body))return pre+body.replace(re,r)+tail;
  }
  return s;
}
function trText(n){
  const p=n.parentNode;
  if(!p||/^(SCRIPT|STYLE)$/.test(p.nodeName)||!/\S/.test(n.nodeValue))return;
  let o=I18N_ORIG.get(n);
  if(o===undefined||(n.nodeValue!==o&&n.nodeValue!==tr(o)))o=n.nodeValue;
  I18N_ORIG.set(n,o);
  const v=tr(o);
  if(n.nodeValue!==v)n.nodeValue=v;
}
function trEl(e){
  if(!e.getAttribute)return;
  for(const a of I18N_ATTRS){
    const v=e.getAttribute(a);
    if(v==null)continue;
    const k='data-o-'+a;
    let o=e.getAttribute(k);
    if(o===null||(v!==o&&v!==tr(o)))o=v;
    e.setAttribute(k,o);
    const t=tr(o);
    if(t!==v)e.setAttribute(a,t);
  }
}
function walkTr(root){
  if(!root)return;
  if(root.nodeType===3){trText(root);return}
  if(root.nodeType!==1)return;
  trEl(root);
  const w=document.createTreeWalker(root,5);
  let n;
  while((n=w.nextNode())){if(n.nodeType===3)trText(n);else trEl(n)}
}
function applyLang(){document.documentElement.lang=lang();walkTr(document.body)}
function initI18n(){
  if(lang()!=='id')applyLang();
  if(I18N_MO)I18N_MO.observe(document.body,{childList:true,subtree:true,characterData:true});
}
function setLang(v){
  db.set.lang=v;save();
  tick();render();applyLang();
}
function renderLang(){
  const el=$('#langForm');if(!el)return;
  el.innerHTML=`<h3>Bahasa / Language</h3><label class="fl">Bahasa aplikasi</label>
  <select class="fi" onchange="setLang(this.value)">${Object.keys(LANGS).map(k=>`<option value="${k}" ${lang()===k?'selected':''}>${LANGS[k]}</option>`).join('')}</select>
`;
}
/* ---------- tema: Terang / Gelap / Otomatis (disimpan per perangkat, dipakai juga oleh dashboard) ---------- */
const themePref=()=>{try{return localStorage.getItem('pos_theme')||'light'}catch(e){return 'light'}};
function applyTheme(){
  const d=false;   /* tema gelap dihapus; warna dipilih lewat skin.js */
  document.documentElement.setAttribute('data-theme',d?'dark':'light');
  var c=document.querySelector('meta[name=color-scheme]');if(c)c.setAttribute('content','only light');
  const ic=d?'icon-ordela-dark.svg':'icon-ordela-red.svg';document.querySelectorAll('link[rel=icon]').forEach(l=>{if(l.getAttribute('href')!==ic)l.setAttribute('href',ic)});const touch=document.querySelector('link[rel=apple-touch-icon]');if(touch){const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=180;c.getContext('2d').drawImage(im,0,0,180,180);touch.href=c.toDataURL('image/png')}catch(e){touch.href=ic}};im.onerror=()=>{touch.href=ic};im.src=ic+'?v=33'}
}
function setTheme(v){try{localStorage.setItem('pos_theme',v)}catch(e){}applyTheme();renderTheme()}
function renderTheme(){
  const el=$('#themeForm');if(!el)return;const t=themePref(),auto=t==='auto';
  const eff=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
  const card=(v,l)=>{const on=!auto&&t===v||auto&&eff===v;
    return `<div class="thc ${v}"><button type="button" class="thp" onclick="setTheme('${v}')" aria-label="Tema ${l}"><span class="tpb"><i></i><i></i><i></i></span><span class="tpc"><b></b><em></em></span><span class="tpc"><b></b><em></em></span><span class="tpg"></span></button>
    <b class="thn">${l}</b><button type="button" class="thk ${on?'on':''}" onclick="setTheme('${v}')" aria-label="Pakai tema ${l}" aria-pressed="${on}">${pfi('tick',18)}</button></div>`};
  el.innerHTML=`<h3>Tema</h3><p class="pfhint" style="margin:0 0 12px">Pilih tampilan yang nyaman untuk mata Anda.</p>
  <div class="thg">${card('light','Terang')}${card('dark','Gelap')}</div>
  <label class="tgl prm" style="margin-top:10px"><input type="checkbox" ${auto?'checked':''} onchange="setTheme(this.checked?'auto':'${eff}')"><span><b>Ikuti pengaturan perangkat</b><small>Otomatis terang atau gelap sesuai perangkat Anda.</small></span></label>`;
}
  /* sekali saat awal: menyamakan favicon/apple-touch dengan tema (skrip di <head> berjalan sebelum tag ikon ada) */
function setupPwa(){
  try{
    if(globalThis.POS_CLOUD)return;
    if(!/^https?:/.test(location.protocol)||!document.head)return;
    const im=new Image();
    im.onload=()=>{try{
      const mk=n=>{const c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');x.fillStyle='#242426';x.fillRect(0,0,n,n);const k=Math.min(n/im.width,n/im.height),w=im.width*k,h=im.height*k;x.drawImage(im,(n-w)/2,(n-h)/2,w,h);return c.toDataURL('image/png')};
      const i1=mk(192),i2=mk(512),nm=db.set.store||'Ordela';
      const m={name:nm,short_name:nm,start_url:location.href.split('#')[0],display:'fullscreen',display_override:['fullscreen','standalone'],background_color:'#ffffff',theme_color:'#ffffff',icons:[{src:i1,sizes:'192x192',type:'image/png'},{src:i2,sizes:'512x512',type:'image/png',purpose:'any'}]};
      const l=document.createElement('link');l.rel='manifest';l.href=URL.createObjectURL(new Blob([JSON.stringify(m)],{type:'application/manifest+json'}));document.head.appendChild(l);
      const a=document.createElement('link');a.rel='apple-touch-icon';a.href=i1;document.head.appendChild(a);
    }catch(e){}};
    im.src=db.set.logo||DEF_LOGO;
  }catch(e){}
}

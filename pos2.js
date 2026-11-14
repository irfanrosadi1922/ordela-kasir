/* Ordela: fitur operasional tambahan — Shift Kasir, Pengeluaran, Pembelian & Pemasok, Member, Promo, Layar Dapur.
   Data tersimpan di db (db.shifts, db.exps, db.buys, db.sups, db.members, db.promos) dan ikut sinkron seperti data lain. */
(function(){
'use strict';
const V={};window.P2={views:V,t:{}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const nowIso=()=>new Date().toISOString();
const live=a=>(a||[]).filter(x=>!x.del);
const myUid=()=>(CL.on&&CL.me)?String(CL.me.id):'local';
const myName=()=>(CL.on&&CL.me)?CL.me.name:'Owner';
const dstr=t=>{const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')};
const num=v=>Math.max(0,+v||0);
const bar=(t,btn)=>`<div class="bar"><h2>${t}</h2>${btn||''}</div>`;
const kc=(t,v,cls)=>`<div class="kc"><div class="kt"><span>${t}</span></div><div class="kv"><span class="${cls||''}">${v}</span></div></div>`;
function dayStart(d){const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()}
function periodRange(p){
  const n=new Date(),t0=dayStart(n);
  if(p==='today')return[t0,Infinity];
  if(p==='7d')return[t0-6*864e5,Infinity];
  if(p==='month')return[new Date(n.getFullYear(),n.getMonth(),1).getTime(),Infinity];
  return[0,Infinity];
}
const PER=[['today','Hari ini'],['7d','7 hari'],['month','Bulan ini'],['all','Semua']];
const perChips=(cur,fn)=>`<div class="chips" style="margin:0 0 10px">${PER.map(([k,l])=>`<button class="chip ${cur===k?'on':''}" onclick="${fn}('${k}')">${l}</button>`).join('')}</div>`;
const inR=(t,r)=>{const x=+new Date(t);return x>=r[0]&&x<r[1]};

/* ================= SHIFT KASIR ================= */
window.shiftCur=function(){return live(db.shifts).find(s=>!s.close&&s.uid===myUid())||null};
function shiftStats(sh){
  const os=db.orders.filter(o=>o.sh===sh.id);
  let cashIn=0,tips=0,disc=0,total=0;const by={};
  os.forEach(o=>{
    const c=(o.cashIn!=null)?+o.cashIn:(o.method==='Tunai'?+o.total:0);cashIn+=c;tips+=+o.tip||0;disc+=+o.disc||0;total+=+o.total||0;
    if(Array.isArray(o.pays))o.pays.forEach(p=>{by[p.m]=(by[p.m]||0)+p.amt});else{const m=o.method||'-';by[m]=(by[m]||0)+(+o.total||0)+(+o.tip||0)}
  });
  const ex=live(db.exps).filter(e=>e.sh===sh.id&&e.src==='kas'),out=ex.filter(e=>e.dir!=='in').reduce((a,e)=>a+e.amt,0),inn=ex.filter(e=>e.dir==='in').reduce((a,e)=>a+e.amt,0);
  const bp=live(db.buys).reduce((a,b)=>a+((b.pays||[]).filter(p=>p.sh===sh.id&&p.src==='kas').reduce((x,p)=>x+p.amt,0)),0);
  const expected=rnd((+sh.open.cash||0)+cashIn+inn-out-bp);
  return{n:os.length,total:rnd(total),cashIn:rnd(cashIn),tips:rnd(tips),disc:rnd(disc),by,out:rnd(out),inn:rnd(inn),bp:rnd(bp),expected};
}
V.shift=function(){
  const el=$('#v-shift');if(!el)return;
  const cur=shiftCur(),own=isOwner();
  const hist=live(db.shifts).filter(s=>s.close&&(own||s.uid===myUid())).sort((a,b)=>b.open.t<a.open.t?-1:1).slice(0,40);
  let top;
  if(cur){const st=shiftStats(cur);
    top=`<div class="panel"><h3>Shift berjalan</h3><p class="hint" style="margin:0 0 8px">Dibuka ${esc(dstr(cur.open.t))} oleh ${esc(cur.by)} · modal awal ${money(cur.open.cash)}</p>
    <div class="kp">${kc('Transaksi',st.n)}${kc('Penjualan',money(st.total))}${kc('Tunai masuk',money(st.cashIn))}${kc('Kas diharapkan',money(st.expected))}</div>
    <div class="acts" style="flex-wrap:wrap;margin-top:10px"><button class="btn sm" onclick="shiftCloseForm()">Tutup Shift</button><button class="btn sm sec" onclick="cashMoveForm('out')">Kas keluar</button><button class="btn sm sec" onclick="cashMoveForm('in')">Kas masuk</button></div></div>`;
  }else{
    top=`<div class="panel"><h3>Belum ada shift berjalan</h3><p class="hint" style="margin:0 0 10px">Buka shift dengan modal awal laci. Saat tutup shift, uang fisik dihitung dan selisihnya dicatat.</p><button class="btn" onclick="shiftOpenForm()">Buka Shift</button></div>`;
  }
  el.innerHTML=bar('<i class="ic" data-ic="clock"></i>Shift Kasir')+top
   +(own?`<div class="panel" style="margin-top:12px"><label class="tgl"><input type="checkbox" ${db.set.shiftReq?'checked':''} onchange="db.set.shiftReq=this.checked;save()"><span>Wajib buka shift sebelum transaksi<small>Kasir tidak bisa membayar bila belum membuka shift.</small></span></label></div>`:'')
   +`<div class="panel" style="margin-top:12px"><h3>Riwayat Shift</h3>${hist.length?hist.map(s=>{const d=s.close.diff;return`<button class="li" onclick="shiftDetail('${s.id}')"><span class="l"><b>${esc(s.by)} · ${esc(dstr(s.open.t))}</b><small>${s.close.n||0} transaksi · penjualan ${money(s.close.total||0)}</small></span><span class="r"><b class="${d===0?'':(d<0?'neg':'pos')}">${d===0?'Pas':(d>0?'+':'−')+money(Math.abs(d))}</b><small>${d===0?'':(d<0?'kurang':'lebih')}</small></span></button>`}).join(''):'<p class="hint">Belum ada shift yang ditutup.</p>'}</div>`;
};
window.shiftOpenForm=function(){
  if(shiftCur()){toast('Shift sudah berjalan');return}
  openModal(`<h3>Buka Shift</h3><label class="fl">Modal awal di laci</label><input class="fi" id="shCash" type="number" min="0" step="any" value="0" inputmode="decimal">
  <button class="btn" onclick="shiftOpen()">Mulai Shift</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.shiftOpen=function(){
  if(shiftCur())return;const c=num($('#shCash').value);
  db.shifts.unshift({id:'s'+uid(),uid:myUid(),by:myName(),open:{t:nowIso(),cash:c},close:null,u:Date.now()});
  save();closeModal();toast('Shift dibuka');go('shift');
};
window.shiftCloseForm=function(){
  const cur=shiftCur();if(!cur)return;const st=shiftStats(cur);
  openModal(`<h3>Tutup Shift</h3><table class="dl"><tr><td>Modal awal</td><td>${money(cur.open.cash)}</td></tr><tr><td>Penjualan tunai</td><td>${money(st.cashIn)}</td></tr>
  ${st.inn?`<tr><td>Kas masuk</td><td>${money(st.inn)}</td></tr>`:''}${st.out||st.bp?`<tr><td>Kas keluar</td><td>−${money(st.out+st.bp)}</td></tr>`:''}<tr class="tt"><td>Seharusnya di laci</td><td>${money(st.expected)}</td></tr></table>
  <table class="dl">${Object.keys(st.by).map(m=>`<tr><td>${esc(m)}</td><td>${money(st.by[m])}</td></tr>`).join('')}${st.tips?`<tr><td>Tip (di luar penjualan)</td><td>${money(st.tips)}</td></tr>`:''}</table>
  <label class="fl">Uang di laci (hasil hitung)</label><input class="fi" id="shCount" type="number" min="0" step="any" inputmode="decimal" oninput="shiftDiff()">
  <div class="chg" id="shDiff"><span>Selisih</span><span>—</span></div>
  <label class="fl">Catatan</label><input class="fi" id="shNote" maxlength="200" placeholder="Opsional">
  <button class="btn" onclick="shiftClose()">Tutup Shift</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.shiftDiff=function(){
  const cur=shiftCur();if(!cur)return;const st=shiftStats(cur),v=$('#shCount').value;if(v===''){$('#shDiff').innerHTML='<span>Selisih</span><span>—</span>';return}
  const d=rnd(num(v)-st.expected);$('#shDiff').classList.toggle('neg',d<0);
  $('#shDiff').innerHTML=`<span>${d===0?'Pas':d<0?'Kurang':'Lebih'}</span><span>${money(Math.abs(d))}</span>`;
};
window.shiftClose=function(){
  const cur=shiftCur();if(!cur)return;const v=$('#shCount').value;if(v===''){toast('Isi uang di laci');return}
  const st=shiftStats(cur),cnt=num(v);
  cur.close={t:nowIso(),cash:cnt,exp:st.expected,diff:rnd(cnt-st.expected),n:st.n,total:st.total,cashIn:st.cashIn,tips:st.tips,by:st.by,note:($('#shNote').value||'').trim()};
  cur.u=Date.now();save();closeModal();toast('Shift ditutup');go('shift');
};
window.shiftDetail=function(id){
  const s=db.shifts.find(x=>x.id===id);if(!s||!s.close)return;const c=s.close;
  openModal(`<h3>Shift ${esc(s.by)}</h3><table class="dl"><tr><td>Buka</td><td>${esc(dstr(s.open.t))}</td></tr><tr><td>Tutup</td><td>${esc(dstr(c.t))}</td></tr><tr><td>Modal awal</td><td>${money(s.open.cash)}</td></tr>
  <tr><td>Transaksi</td><td>${c.n||0}</td></tr><tr><td>Penjualan</td><td>${money(c.total||0)}</td></tr><tr><td>Tunai masuk</td><td>${money(c.cashIn||0)}</td></tr><tr><td>Seharusnya di laci</td><td>${money(c.exp)}</td></tr><tr><td>Hasil hitung</td><td>${money(c.cash)}</td></tr>
  <tr class="tt"><td>Selisih</td><td>${c.diff===0?'Pas':(c.diff>0?'+':'−')+money(Math.abs(c.diff))}</td></tr></table>${c.note?`<div class="nt">${esc(c.note)}</div>`:''}<button class="btn sec" onclick="closeModal()">Tutup</button>`);
};
window.cashMoveForm=function(dir){
  const cur=shiftCur();if(!cur){toast('Buka shift dulu');return}
  openModal(`<h3>Kas ${dir==='in'?'Masuk':'Keluar'}</h3><label class="fl">Jumlah</label><input class="fi" id="cmAmt" type="number" min="0" step="any" inputmode="decimal"><label class="fl">Keterangan</label><input class="fi" id="cmNote" maxlength="80" placeholder="${dir==='in'?'Mis. tambah uang kembalian':'Mis. beli es batu'}">
  <button class="btn" onclick="cashMove('${dir}')">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.cashMove=function(dir){
  const cur=shiftCur();if(!cur)return;const a=num($('#cmAmt').value);if(!a){toast('Isi jumlah');return}
  db.exps.unshift({id:'e'+uid(),t:nowIso(),by:myName(),cat:dir==='in'?'Kas masuk':'Kas keluar',amt:a,note:($('#cmNote').value||'').trim(),src:'kas',dir,sh:cur.id,u:Date.now()});
  save();closeModal();toast('Tersimpan');V.shift();
};

/* ================= PENGELUARAN & LABA ================= */
const EXP_CATS=['Belanja bahan','Gaji','Sewa','Listrik/Air/Gas','Transport','Perawatan','Marketing','Lainnya'];
const EP={per:'month'};
window.expPer=function(p){EP.per=p;V.exp()};
function profit(r){
  let rev=0,cogs=0,n=0;db.orders.forEach(o=>{if(!inR(o.t,r))return;n++;rev+=+o.total||0;(o.lines||[]).forEach(l=>{cogs+=(+l.cost||0)*(+l.qty||0)})});
  const exs=live(db.exps).filter(e=>inR(e.t,r)&&e.dir!=='in'&&e.cat!=='Kas keluar');
  const opex=exs.reduce((a,e)=>a+e.amt,0);
  return{rev:rnd(rev),cogs:rnd(cogs),opex:rnd(opex),gross:rnd(rev-cogs),net:rnd(rev-cogs-opex),n};
}
V.exp=function(){
  const el=$('#v-exp');if(!el)return;const r=periodRange(EP.per),p=profit(r),own=isOwner();
  const list=live(db.exps).filter(e=>inR(e.t,r)&&e.dir!=='in').sort((a,b)=>b.t<a.t?-1:1);
  el.innerHTML=bar('<i class="ic" data-ic="card"></i>Pengeluaran &amp; Laba','<button class="btn sm" style="width:auto;margin:0" onclick="expForm()">+ Catat Pengeluaran</button>')+perChips(EP.per,'expPer')
  +`<div class="kp">${kc('Pendapatan',money(p.rev))}${kc('Modal barang (HPP)','−'+money(p.cogs))}${kc('Pengeluaran','−'+money(p.opex))}${kc('Laba bersih',money(p.net),p.net<0?'neg':'pos')}</div>
  <p class="hint" style="margin:6px 2px 12px">Laba bersih = pendapatan − modal barang terjual − pengeluaran operasional. Pembelian stok tidak dihitung sebagai pengeluaran karena modalnya sudah masuk ke modal barang.</p>
  <div class="panel"><h3>Daftar Pengeluaran</h3>${list.length?list.map(e=>`<div class="li" style="cursor:default"><span class="l"><b>${esc(e.cat)}${e.note?' · '+esc(e.note):''}</b><small>${esc(dstr(e.t))} · ${esc(e.by||'')}${e.src==='kas'?' · dari kas laci':''}</small></span><span class="r"><b>${money(e.amt)}</b>${own?`<small><a href="#" onclick="expDel('${e.id}');return false" style="color:var(--bad)">hapus</a></small>`:''}</span></div>`).join(''):'<p class="hint">Belum ada pengeluaran pada periode ini.</p>'}</div>`;
};
window.expForm=function(){
  const cur=shiftCur();
  openModal(`<h3>Catat Pengeluaran</h3><label class="fl">Kategori</label><select class="fi" id="exCat">${EXP_CATS.map(c=>`<option>${c}</option>`).join('')}</select>
  <label class="fl">Jumlah</label><input class="fi" id="exAmt" type="number" min="0" step="any" inputmode="decimal"><label class="fl">Keterangan</label><input class="fi" id="exNote" maxlength="80" placeholder="Opsional">
  <label class="fl">Dibayar dari</label><select class="fi" id="exSrc"><option value="lain">Transfer / sumber lain</option>${cur?'<option value="kas">Kas laci (shift berjalan)</option>':''}</select>
  <button class="btn" onclick="expSave()">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.expSave=function(){
  const a=num($('#exAmt').value);if(!a){toast('Isi jumlah');return}const cur=shiftCur(),src=$('#exSrc').value;
  db.exps.unshift({id:'e'+uid(),t:nowIso(),by:myName(),cat:$('#exCat').value,amt:a,note:($('#exNote').value||'').trim(),src,sh:(src==='kas'&&cur)?cur.id:null,u:Date.now()});
  save();closeModal();toast('Pengeluaran dicatat');V.exp();
};
window.expDel=function(id){if(!isOwner())return;const e=db.exps.find(x=>x.id===id);if(!e||!confirm('Hapus pengeluaran ini?'))return;e.del=1;e.u=Date.now();save();V.exp()};

/* ================= PEMBELIAN & PEMASOK ================= */
const BP={tab:'buy',lines:[],sup:'',pay:'lunas'};
window.buyTab=function(t){BP.tab=t;V.buy()};
const debtOf=b=>Math.max(0,rnd((+b.total||0)-(b.pays||[]).reduce((a,p)=>a+p.amt,0)));
V.buy=function(){
  const el=$('#v-buy');if(!el)return;
  const sups=live(db.sups),buys=live(db.buys).sort((a,b)=>b.t<a.t?-1:1),debts=buys.filter(b=>debtOf(b)>0);
  const tabs=`<div class="itabs">${[['buy','Pembelian',buys.length],['sup','Pemasok',sups.length],['debt','Hutang',debts.length]].map(([k,l,n])=>`<button class="${BP.tab===k?'on':''}" onclick="buyTab('${k}')">${l} <b>${n}</b></button>`).join('')}</div>`;
  let body='';
  if(BP.tab==='buy')body=`<div class="panel"><h3>Riwayat Pembelian</h3>${buys.length?buys.slice(0,60).map(b=>{const d=debtOf(b);return`<button class="li" onclick="buyDetail('${b.id}')"><span class="l"><b>${esc(supName(b.sup))}</b><small>${esc(dstr(b.t))} · ${(b.lines||[]).length} item</small></span><span class="r"><b>${money(b.total)}</b><small style="color:${d?'var(--bad)':'var(--ok)'}">${d?'hutang '+money(d):'lunas'}</small></span></button>`}).join(''):'<p class="hint">Belum ada pembelian. Catat pembelian agar stok bertambah otomatis.</p>'}</div>`;
  if(BP.tab==='sup')body=`<div class="panel"><h3>Pemasok</h3>${sups.length?sups.map(s=>`<button class="li" onclick="supForm('${s.id}')"><span class="l"><b>${esc(s.name)}</b><small>${esc(s.phone||'')}${s.note?' · '+esc(s.note):''}</small></span><span class="r"><small>${(() => {const d=buys.filter(b=>b.sup===s.id).reduce((a,b)=>a+debtOf(b),0);return d?'hutang '+money(d):''})()}</small></span></button>`).join(''):'<p class="hint">Belum ada pemasok.</p>'}<button class="btn sec" onclick="supForm()">+ Tambah Pemasok</button></div>`;
  if(BP.tab==='debt')body=`<div class="panel"><h3>Hutang ke Pemasok</h3>${debts.length?debts.map(b=>`<button class="li" onclick="buyDetail('${b.id}')"><span class="l"><b>${esc(supName(b.sup))}</b><small>${esc(dstr(b.t))}</small></span><span class="r"><b style="color:var(--bad)">${money(debtOf(b))}</b><small>dari ${money(b.total)}</small></span></button>`).join('')+`<div class="tbt"><span>Total hutang</span><b>${money(debts.reduce((a,b)=>a+debtOf(b),0))}</b></div>`:'<p class="hint">Tidak ada hutang.</p>'}</div>`;
  el.innerHTML=bar('<i class="ic" data-ic="download"></i>Pembelian &amp; Pemasok','<button class="btn sm" style="width:auto;margin:0" onclick="buyForm()">+ Catat Pembelian</button>')+tabs+body;
};
const supName=id=>{const s=db.sups.find(x=>x.id===id);return s?s.name:'Tanpa pemasok'};
window.supForm=function(id){
  const s=id?db.sups.find(x=>x.id===id):{name:'',phone:'',note:''};
  openModal(`<h3>${id?'Ubah':'Tambah'} Pemasok</h3><label class="fl">Nama</label><input class="fi" id="spN" maxlength="60" value="${esc(s.name)}"><label class="fl">No. HP</label><input class="fi" id="spP" maxlength="30" value="${esc(s.phone||'')}" inputmode="tel"><label class="fl">Catatan</label><input class="fi" id="spC" maxlength="120" value="${esc(s.note||'')}">
  <button class="btn" onclick="supSave('${id||''}')">Simpan</button>${id?`<button class="btn sec" onclick="supDel('${id}')">Hapus</button>`:''}<button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.supSave=function(id){
  const n=($('#spN').value||'').trim();if(!n){toast('Nama wajib diisi');return}
  if(id){const s=db.sups.find(x=>x.id===id);Object.assign(s,{name:n,phone:$('#spP').value.trim(),note:$('#spC').value.trim(),u:Date.now()})}
  else db.sups.unshift({id:'p'+uid(),name:n,phone:$('#spP').value.trim(),note:$('#spC').value.trim(),u:Date.now()});
  save();closeModal();V.buy();if($('#bySup'))buySupOpts();
};
window.supDel=function(id){const s=db.sups.find(x=>x.id===id);if(!s||!confirm('Hapus pemasok ini?'))return;s.del=1;s.u=Date.now();save();closeModal();V.buy()};
function buyItems(){return db.items.filter(i=>!isB(i))}
window.buyForm=function(){
  BP.lines=[{id:'',q:1,c:0}];BP.pay='lunas';
  openModal(`<h3>Catat Pembelian</h3><label class="fl">Pemasok</label><div class="spr"><select class="fi" id="bySup"></select><button type="button" class="mini" onclick="supForm()">+ Baru</button></div>
  <label class="fl">Barang dibeli</label><div id="byRows"></div><button type="button" class="mini" onclick="BP_add()">+ Tambah barang</button>
  <div class="tbt"><span>Total</span><b id="byTot"></b></div>
  <label class="fl">Pembayaran</label><select class="fi" id="byPay" onchange="BP.pay=this.value;byPayUI()"><option value="lunas">Lunas (transfer / sumber lain)</option><option value="kas">Lunas dari kas laci</option><option value="hutang">Hutang (bayar nanti)</option><option value="dp">Bayar sebagian</option></select>
  <div id="byDpW" hidden><label class="fl">Dibayar sekarang</label><input class="fi" id="byDp" type="number" min="0" step="any"></div>
  <label class="fl">Catatan</label><input class="fi" id="byNote" maxlength="120" placeholder="Opsional">
  <button class="btn" onclick="buySave()">Simpan Pembelian</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
  buySupOpts();BP_render();
};
function buySupOpts(){const e=$('#bySup');if(!e)return;const cur=e.value;e.innerHTML='<option value="">Tanpa pemasok</option>'+live(db.sups).map(s=>`<option value="${s.id}" ${s.id===cur?'selected':''}>${esc(s.name)}</option>`).join('')}
window.byPayUI=function(){$('#byDpW').hidden=BP.pay!=='dp'};
window.BP_add=function(){BP.lines.push({id:'',q:1,c:0});BP_render()};
window.BP_del=function(i){BP.lines.splice(i,1);if(!BP.lines.length)BP.lines.push({id:'',q:1,c:0});BP_render()};
window.BP_set=function(i,f,v){const l=BP.lines[i];if(f==='pu'){l.pu=v==='1';BP_render();return}if(f==='id'){l.id=v;l.pu=false;const it=find(v);if(it&&!l.c)l.c=it.cost||0;BP_render()}else{l[f]=num(v);BP_tot()}};
function BP_render(){
  const e=$('#byRows');if(!e)return;
  e.innerHTML=BP.lines.map((l,i)=>`<div class="bpr"><select class="fi" onchange="BP_set(${i},'id',this.value)"><option value="">Pilih barang…</option>${buyItems().map(x=>`<option value="${esc(x.id)}" ${x.id===l.id?'selected':''}>${esc(x.name)}${x.ns?' (bahan)':''}</option>`).join('')}</select>
  ${(find(l.id)||{}).pu?`<select class="fi" aria-label="Satuan" onchange="BP_set(${i},'pu',this.value)" style="width:auto;flex:none"><option value="0">satuan</option><option value="1" ${l.pu?'selected':''}>${esc(find(l.id).pu.n)}</option></select>`:''}<input class="fi" type="number" min="0" step="any" value="${l.q}" aria-label="Jumlah" oninput="BP_set(${i},'q',this.value)"><input class="fi" type="number" min="0" step="any" value="${l.c||''}" placeholder="Harga satuan" aria-label="Harga satuan" oninput="BP_set(${i},'c',this.value)"><button type="button" class="mini" onclick="BP_del(${i})">✕</button></div>`).join('');
  BP_tot();
}
function BP_tot(){const t=rnd(BP.lines.reduce((a,l)=>a+(+l.q||0)*(+l.c||0),0));const e=$('#byTot');if(e)e.textContent=money(t);return t}
window.buySave=function(){
  const ls=BP.lines.filter(l=>l.id&&l.q>0);if(!ls.length){toast('Pilih barang yang dibeli');return}
  const total=BP_tot(),cur=shiftCur(),pay=BP.pay;let paid=0;
  if(pay==='lunas'||pay==='kas')paid=total;else if(pay==='dp')paid=Math.min(total,num($('#byDp').value));
  if(pay==='kas'&&!cur){toast('Buka shift dulu untuk membayar dari kas laci');return}
  const sup=$('#bySup').value,now=nowIso(),id='b'+uid();
  const b={id,t:now,by:myName(),sup,lines:ls.map(l=>({id:l.id,name:(find(l.id)||{}).name||'',q:l.q,c:l.c,un:(l.pu&&(find(l.id)||{}).pu)?find(l.id).pu.n:'',bq:Math.round(l.q*((l.pu&&(find(l.id)||{}).pu)?find(l.id).pu.f:1)*1000)/1000})),total,note:($('#byNote').value||'').trim(),pays:[],u:Date.now()};
  if(paid>0)b.pays.push({t:now,amt:paid,src:pay==='kas'?'kas':'lain',sh:pay==='kas'&&cur?cur.id:null});
  ls.forEach(l=>{const it=find(l.id);if(!it)return;const f=(l.pu&&it.pu)?it.pu.f:1,q=Math.round(l.q*f*1000)/1000;it.stock=Math.round(((+it.stock||0)+q)*1000)/1000;logAdd(it.name,q,'Pembelian '+supName(sup)+(f>1?' ('+l.q+' '+it.pu.n+')':''),it.stock,now);if(isOwner()&&l.c>0)it.cost=Math.round(l.c/f*100)/100});
  db.buys.unshift(b);db.log=db.log.slice(0,LOG_MAX);save();closeModal();toast('Pembelian dicatat, stok bertambah');V.buy();
};
window.buyDetail=function(id){
  const b=db.buys.find(x=>x.id===id);if(!b)return;const d=debtOf(b);
  openModal(`<h3>${esc(supName(b.sup))}</h3><p class="hint" style="margin:0 0 6px">${esc(dstr(b.t))} · oleh ${esc(b.by||'')}</p><table class="dl">${(b.lines||[]).map(l=>`<tr><td>${l.q}${l.un?' '+esc(l.un):'×'} ${esc(l.name)}<br><small>${money(l.c)}</small></td><td>${money(l.q*l.c)}</td></tr>`).join('')}<tr class="tt"><td>Total</td><td>${money(b.total)}</td></tr></table>
  ${(b.pays||[]).length?`<table class="dl">${b.pays.map(p=>`<tr><td>Bayar ${esc(dstr(p.t))}${p.src==='kas'?' (kas laci)':''}</td><td>${money(p.amt)}</td></tr>`).join('')}</table>`:''}
  ${d?`<div class="chg neg"><span>Sisa hutang</span><span>${money(d)}</span></div><label class="fl">Bayar hutang</label><input class="fi" id="dbAmt" type="number" min="0" step="any" value="${d}"><select class="fi" id="dbSrc"><option value="lain">Transfer / sumber lain</option>${shiftCur()?'<option value="kas">Kas laci</option>':''}</select><button class="btn" onclick="debtPay('${b.id}')">Bayar</button>`:'<div class="chg"><span>Lunas</span><span></span></div>'}
  ${b.note?`<div class="nt">${esc(b.note)}</div>`:''}<button class="btn sec" onclick="closeModal()">Tutup</button>`);
};
window.debtPay=function(id){
  const b=db.buys.find(x=>x.id===id);if(!b)return;const a=Math.min(debtOf(b),num($('#dbAmt').value));if(!a){toast('Isi jumlah');return}
  const src=$('#dbSrc').value,cur=shiftCur();b.pays=b.pays||[];b.pays.push({t:nowIso(),amt:a,src,sh:src==='kas'&&cur?cur.id:null});b.u=Date.now();save();closeModal();toast('Pembayaran hutang dicatat');V.buy();
};

/* ================= MEMBER ================= */
const MP={q:''};
V.mem=function(){
  const el=$('#v-mem');if(!el)return;const q=MP.q.trim().toLowerCase();
  const l=live(db.members).filter(m=>!q||(m.name||'').toLowerCase().includes(q)||String(m.phone||'').includes(q)).sort((a,b)=>(b.spent||0)-(a.spent||0));
  el.innerHTML=bar('<i class="ic" data-ic="users"></i>Member','<button class="btn sm" style="width:auto;margin:0" onclick="memForm()">+ Member Baru</button>')
  +`<div class="panel"><input class="fi" placeholder="Cari nama / no. HP" value="${esc(MP.q)}" oninput="MP_q(this.value)">
  ${isOwner()?`<div class="two" style="margin-top:10px"><div><label class="fl">Belanja per 1 poin (Rp)</label><input class="fi" type="number" min="0" value="${+db.set.ptsPer||0}" onchange="db.set.ptsPer=Math.max(0,+this.value||0);save()"></div><div><label class="fl">Nilai 1 poin saat ditukar (Rp)</label><input class="fi" type="number" min="0" value="${+db.set.ptsVal||0}" onchange="db.set.ptsVal=Math.max(0,+this.value||0);save()"></div></div><small class="hint">Contoh: Rp10.000 per poin dan 1 poin = Rp100 berarti cashback 1%. Isi 0 untuk mematikan poin.</small>`:''}</div>
  <div class="panel" style="margin-top:12px"><h3>${l.length} member</h3>${l.length?l.map(m=>`<button class="li" onclick="memDetail('${m.id}')"><span class="l"><b>${esc(m.name)}</b><small>${esc(m.phone||'-')} · ${m.visits||0}× belanja</small></span><span class="r"><b>${m.pts||0} poin</b><small>${money(m.spent||0)}</small></span></button>`).join(''):'<p class="hint">Belum ada member. Daftarkan dari sini atau langsung saat pembayaran.</p>'}</div>`;
};
window.MP_q=function(v){MP.q=v;const p=document.activeElement;V.mem();const i=document.querySelector('#v-mem input.fi');if(i){i.focus();try{i.setSelectionRange(v.length,v.length)}catch(e){}}};
window.memForm=function(id){
  const m=id?db.members.find(x=>x.id===id):{name:'',phone:'',note:''};
  openModal(`<h3>${id?'Ubah':'Member Baru'}</h3><label class="fl">Nama *</label><input class="fi" id="mbN" maxlength="60" value="${esc(m.name)}"><label class="fl">No. HP</label><input class="fi" id="mbP" maxlength="30" value="${esc(m.phone||'')}" inputmode="tel"><label class="fl">Catatan</label><input class="fi" id="mbC" maxlength="120" value="${esc(m.note||'')}">
  <button class="btn" onclick="memSave('${id||''}')">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.memSave=function(id){
  const n=($('#mbN').value||'').trim();if(!n){toast('Nama wajib diisi');return}const ph=$('#mbP').value.trim();
  if(ph&&live(db.members).some(m=>m.phone===ph&&m.id!==id)){toast('No. HP sudah terdaftar');return}
  if(id){Object.assign(db.members.find(x=>x.id===id),{name:n,phone:ph,note:$('#mbC').value.trim(),u:Date.now()})}
  else db.members.unshift({id:'m'+uid(),name:n,phone:ph,note:$('#mbC').value.trim(),pts:0,visits:0,spent:0,t:nowIso(),u:Date.now()});
  save();closeModal();V.mem();
};
window.memDetail=function(id){
  const m=db.members.find(x=>x.id===id);if(!m)return;const os=db.orders.filter(o=>o.mem&&o.mem.id===id).slice(0,8);
  openModal(`<h3>${esc(m.name)}</h3><p class="hint" style="margin:0 0 6px">${esc(m.phone||'-')}${m.note?' · '+esc(m.note):''}</p>
  <div class="kp">${kc('Poin',m.pts||0)}${kc('Belanja',m.visits||0+'×')}${kc('Total belanja',money(m.spent||0))}</div>
  <h4 style="margin:12px 0 4px">Transaksi terakhir</h4>${os.length?os.map(o=>`<div class="li" style="cursor:default"><span class="l"><b>${esc(o.no)}</b><small>${esc(dstr(o.t))}</small></span><span class="r"><b>${money(o.total)}</b><small>+${o.mem.earn||0}${o.mem.used?' / −'+o.mem.used:''} poin</small></span></div>`).join(''):'<p class="hint">Belum ada.</p>'}
  <div class="acts" style="flex-wrap:wrap;margin-top:10px"><button class="btn sm" onclick="memForm('${id}')">Ubah</button>${isOwner()?`<button class="btn sm sec" onclick="memAdj('${id}')">Atur poin</button><button class="btn sm sec" onclick="memDel('${id}')">Hapus</button>`:''}<button class="btn sm sec" onclick="closeModal()">Tutup</button></div>`);
};
window.memAdj=function(id){const m=db.members.find(x=>x.id===id);const v=prompt('Poin baru untuk '+m.name+':',m.pts||0);if(v===null)return;m.pts=Math.max(0,Math.floor(+v||0));m.u=Date.now();save();closeModal();V.mem()};
window.memDel=function(id){const m=db.members.find(x=>x.id===id);if(!m||!confirm('Hapus member '+m.name+'?'))return;m.del=1;m.u=Date.now();save();closeModal();V.mem()};

/* ================= PROMO & VOUCHER (owner) ================= */
const DAYS=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
V.promo=function(){
  const el=$('#v-promo');if(!el)return;const l=live(db.promos);
  el.innerHTML=bar('<i class="ic" data-ic="bolt"></i>Promo &amp; Voucher','<button class="btn sm" style="width:auto;margin:0" onclick="promoForm()">+ Promo Baru</button>')
  +`<p class="hint" style="margin:0 2px 10px">Promo otomatis berlaku sendiri (mis. happy hour). Promo dengan kode dipakai kasir lewat kolom Kode promo. Hanya satu promo (yang paling hemat) dipakai per transaksi.</p>
  <div class="panel">${l.length?l.map(p=>{const u=promoUsed(p.id),w=[p.auto?'otomatis':'kode '+(p.code||'-'),p.type==='%'?p.val+'%':money(p.val),+p.min?'min '+money(p.min):'',p.days&&p.days.length?p.days.map(d=>DAYS[d]).join(','):'',p.h1&&p.h2?p.h1+'–'+p.h2:'',p.d1||p.d2?(p.d1||'')+' s/d '+(p.d2||''):''].filter(Boolean).join(' · ');
    return`<button class="li" onclick="promoForm('${p.id}')"><span class="l"><b>${esc(p.name)}</b><small>${esc(w)}</small></span><span class="r"><b class="${p.on===false?'neg':'pos'}">${p.on===false?'mati':'aktif'}</b><small>${u}× dipakai</small></span></button>`}).join(''):'<p class="hint">Belum ada promo.</p>'}</div>`;
};
window.promoForm=function(id){
  if(!isOwner()){toast('Hanya owner yang boleh mengatur promo');return}
  const p=id?db.promos.find(x=>x.id===id):{name:'',code:'',type:'%',val:10,min:0,cap:0,max:0,days:[],h1:'',h2:'',d1:'',d2:'',auto:false,on:true};
  window.PF={days:[...(p.days||[])]};
  openModal(`<h3>${id?'Ubah':'Promo Baru'}</h3><label class="fl">Nama promo *</label><input class="fi" id="prN" maxlength="40" value="${esc(p.name)}" placeholder="Mis. Happy Hour">
  <div class="two"><div><label class="fl">Tipe</label><select class="fi" id="prT"><option value="%" ${p.type==='%'?'selected':''}>Persen (%)</option><option value="n" ${p.type!=='%'?'selected':''}>Potongan Rp</option></select></div><div><label class="fl">Nilai</label><input class="fi" id="prV" type="number" min="0" step="any" value="${p.val}"></div></div>
  <div class="two"><div><label class="fl">Min. belanja</label><input class="fi" id="prM" type="number" min="0" value="${p.min||0}"></div><div><label class="fl">Maks. potongan (untuk %)</label><input class="fi" id="prC" type="number" min="0" value="${p.cap||0}"></div></div>
  <label class="tgl"><input type="checkbox" id="prA" ${p.auto?'checked':''} onchange="$('#prCodeW').hidden=this.checked"><span>Berlaku otomatis (tanpa kode)</span></label>
  <div id="prCodeW" ${p.auto?'hidden':''}><label class="fl">Kode voucher</label><input class="fi" id="prK" maxlength="20" value="${esc(p.code||'')}" style="text-transform:uppercase" placeholder="Mis. HEMAT10"></div>
  <label class="fl">Hari berlaku (kosong = tiap hari)</label><div class="chips" id="prD">${DAYS.map((d,i)=>`<button type="button" class="chip ${PF.days.includes(i)?'on':''}" onclick="PF_day(${i},this)">${d}</button>`).join('')}</div>
  <div class="two"><div><label class="fl">Jam mulai</label><input class="fi" id="prH1" type="time" value="${esc(p.h1||'')}"></div><div><label class="fl">Jam selesai</label><input class="fi" id="prH2" type="time" value="${esc(p.h2||'')}"></div></div>
  <div class="two"><div><label class="fl">Tanggal mulai</label><input class="fi" id="prD1" type="date" value="${esc(p.d1||'')}"></div><div><label class="fl">Tanggal selesai</label><input class="fi" id="prD2" type="date" value="${esc(p.d2||'')}"></div></div>
  <div class="two"><div><label class="fl">Batas pemakaian (0 = tak terbatas)</label><input class="fi" id="prX" type="number" min="0" value="${p.max||0}"></div><div></div></div>
  <label class="tgl"><input type="checkbox" id="prO" ${p.on===false?'':'checked'}><span>Aktif</span></label>
  <button class="btn" onclick="promoSave('${id||''}')">Simpan</button>${id?`<button class="btn sec" onclick="promoDel('${id}')">Hapus</button>`:''}<button class="btn sec" onclick="closeModal()">Batal</button>`);
};
window.PF_day=function(i,b){const k=PF.days.indexOf(i);if(k>=0)PF.days.splice(k,1);else PF.days.push(i);b.classList.toggle('on',k<0)};
window.promoSave=function(id){
  const name=($('#prN').value||'').trim();if(!name){toast('Nama promo wajib diisi');return}
  const auto=$('#prA').checked,code=($('#prK').value||'').trim().toUpperCase();
  if(!auto&&!code){toast('Isi kode voucher atau pilih otomatis');return}
  if(code&&live(db.promos).some(p=>p.id!==id&&String(p.code||'').toUpperCase()===code)){toast('Kode sudah dipakai promo lain');return}
  const v=num($('#prV').value);if(!v){toast('Isi nilai promo');return}
  const d={name,type:$('#prT').value==='%'?'%':'n',val:v,min:num($('#prM').value),cap:num($('#prC').value),auto,code:auto?'':code,days:[...PF.days].sort(),h1:$('#prH1').value,h2:$('#prH2').value,d1:$('#prD1').value,d2:$('#prD2').value,max:num($('#prX').value),on:$('#prO').checked,u:Date.now()};
  if(id)Object.assign(db.promos.find(x=>x.id===id),d);else db.promos.unshift({id:'r'+uid(),...d});
  save();closeModal();V.promo();renderInvoice();
};
window.promoDel=function(id){const p=db.promos.find(x=>x.id===id);if(!p||!confirm('Hapus promo ini?'))return;p.del=1;p.u=Date.now();save();closeModal();V.promo();renderInvoice()};

/* ================= LAYAR DAPUR ================= */
const KS={0:'Baru',1:'Dimasak',2:'Siap'};
const KF={s:''};
P2.kdsStn=s=>{KF.s=s;V.kds()};
V.kds=function(){
  const el=$('#v-kds');if(!el)return;
  const on=(typeof CO!=='undefined'&&CO.list?CO.list:[]).filter(o=>o.status==='new'||o.status==='accepted').map(o=>({src:'co',id:o.id,k:o.kds||0,t:o.t,title:o.tbl?'Meja '+o.tbl:o.num,sub:o.name,lines:o.lines,note:o.note,from:o.by?'Server: '+o.by:'Pesanan pelanggan'}));
  const lo=live(db.kds).filter(k=>(k.st||0)<3).map(k=>({src:'loc',id:k.id,k:k.st||0,t:k.t,title:k.tbl?'Meja '+k.tbl:k.no,sub:k.cust||'',lines:k.lines,note:k.note,from:'Kasir'}));
  const act=on.concat(lo).sort((a,b)=>a.t<b.t?-1:1);
  const sts=[...new Set(act.flatMap(o=>o.lines.map(l=>(find(l.id)||{}).stn||'')).filter(Boolean))];
  if(KF.s&&!sts.includes(KF.s))KF.s='';
  const stOf=l=>(find(l.id)||{}).stn||'';
  const act2=KF.s?act.map(o=>({...o,lines:o.lines.filter(l=>stOf(l)===KF.s)})).filter(o=>o.lines.length):act;
  const col=k=>act2.filter(o=>o.k===k);
  const q=o=>`'${o.src}','${String(o.id).replace(/'/g,"")}'`;
  const card=o=>{const mins=Math.max(0,Math.floor((Date.now()-new Date(o.t))/60000));return`<div class="kdc ${mins>=15?'late':mins>=8?'warn':''}"><div class="kdh"><b>${esc(o.title)}</b><span>${esc(o.sub)}</span><small>${mins} mnt</small></div>
    <ul>${o.lines.map(l=>`<li><b>${l.qty}×</b> ${esc(l.name)}</li>`).join('')}</ul>${o.note?`<div class="nt">${esc(o.note)}</div>`:''}<small class="hint">${esc(o.from)}</small>
    <div class="acts" style="margin-top:8px">${o.k===0?`<button class="btn sm" onclick="kdsSet(${q(o)},1)">Mulai masak</button>`:''}${o.k===1?`<button class="btn sm" onclick="kdsSet(${q(o)},2)">Siap saji</button>`:''}${o.k===2?`<button class="btn sm sec" onclick="kdsSet(${q(o)},0)">Batal siap</button>${o.src==='loc'?`<button class="btn sm" onclick="kdsSet(${q(o)},3)">Selesai</button>`:''}`:''}</div></div>`};
  const own=isOwner();
  el.innerHTML=bar('<i class="ic" data-ic="cook"></i>Layar Dapur')+(own?`<div class="panel" style="margin-bottom:10px"><label class="tgl"><input type="checkbox" ${db.set.kdsOn?'checked':''} onchange="db.set.kdsOn=this.checked;save()"><span>Kirim pesanan kasir ke dapur<small>Setiap transaksi di kasir otomatis muncul di layar ini.</small></span></label><label class="tgl"><input type="checkbox" ${db.set.stSplit?'checked':''} onchange="db.set.stSplit=this.checked;save()"><span>Cetak tiket terpisah per stasiun<small>Item Dapur dan Bar dicetak di slip berbeda (atur stasiun di data menu).</small></span></label></div>`:'')+(sts.length?`<div class="itabs"><button class="${KF.s===''?'on':''}" onclick="P2.kdsStn('')">Semua</button>${sts.map(s=>`<button class="${KF.s===s?'on':''}" onclick="P2.kdsStn('${esc(s).replace(/'/g,"")}')">${esc(s)}</button>`).join('')}</div>`:'')+`<div class="kdg">${[0,1,2].map(k=>`<div class="kdcol"><h3>${KS[k]} <b>${col(k).length}</b></h3>${col(k).map(card).join('')||'<p class="hint">Kosong</p>'}</div>`).join('')}</div>`;
};

/* ================= ASISTEN ORDELA (berbasis aturan, berjalan di perangkat, tanpa API key) ================= */
const AI={msgs:[],busy:0,why:'',uid:'',loaded:false,loading:false,saveChain:Promise.resolve()};
const aiN=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const aiHas=(q,...w)=>w.some(x=>q.includes(x));
function aiRange(q){
  const d=n=>dkey(Date.now()-n*864e5),t=dkey(Date.now());
  if(aiHas(q,'kemarin'))return{k:'yest',l:'kemarin',f:d(1),t:d(1),need:1};
  if(aiHas(q,'minggu','7 hari','tujuh hari'))return{k:'w',l:'7 hari terakhir',f:d(6),t:t,need:1};
  if(aiHas(q,'bulan','30 hari'))return{k:'m',l:'30 hari terakhir',f:d(29),t:t,need:1};
  if(aiHas(q,'tahun'))return{k:'y',l:'365 hari terakhir',f:d(364),t:t,need:1};
  return{k:'t',l:'hari ini',f:t,t:t,need:0};
}
const aiOrders=r=>db.orders.filter(x=>{const k=dkey(x.t);return k>=r.f&&k<=r.t});
function aiTop(os,by){const m={};os.forEach(o=>(o.lines||[]).forEach(l=>{const n=l.bn||l.name;if(!n)return;const e=m[n]||(m[n]={n,q:0,v:0});e.q+=+l.qty||0;e.v+=(+l.qty||0)*(+l.price||0)}));return Object.values(m).sort((a,b)=>by==='v'?b.v-a.v:b.q-a.q)}
const AIH={ // bantuan memakai aplikasi: [kata kunci, jawaban]
 split:[['split','pisah tagihan','bagi tagihan','patungan'],'Split bill: di layar Bayar tekan <b>Pisah tagihan per item</b>, pilih item untuk tamu pertama, bayar, lalu sisanya muncul otomatis untuk dibayar berikutnya.'],
 shift:[['shift','laci','buka kasir','tutup kasir','kas awal'],'Shift: buka menu <b>Shift Kasir</b> → isi kas awal → <b>Mulai Shift</b>. Saat selesai, hitung uang laci dan tutup shift; selisih kas dihitung otomatis.'],
 menu:[['tambah menu','tambah item','menu baru','produk baru','tambah produk'],'Tambah menu: buka <b>Inventori</b> → tombol tambah item → isi nama, harga, modal, stok, kategori (opsional foto, stasiun Dapur/Bar, satuan beli) → Simpan.'],
 opname:[['opname','hitung stok','cek stok fisik'],'Stok opname: menu <b>Stok Opname</b> → masukkan atau scan hitungan fisik tiap item → <b>Tinjau</b> selisih → Terapkan. Perubahan tercatat di riwayat stok.'],
 gift:[['kartu hadiah','gift','voucher'],'Kartu hadiah: menu <b>Kartu Hadiah</b> → <b>Jual Kartu</b> (kode + nominal). Saat pembayaran, masukkan kode kartu di kolom kartu hadiah; saldo terpotong otomatis.'],
 rsv:[['reservasi','booking meja','pesan meja'],'Reservasi: menu <b>Reservasi</b> → tambah (nama, meja, jam, jumlah orang). Meja yang dipesan tampil biru di halaman Meja.'],
 cabang:[['cabang','hapus cabang','toko baru'],'Cabang: <b>Menu Utama → Cabang</b>. Tiap cabang punya menu, stok, dan karyawan sendiri. Owner pusat bisa pindah cabang, melihat laporan gabungan, transfer stok, dan menghapus cabang (wajib sandi).'],
 print:[['printer','cetak','struk','bluetooth'],'Printer: menu <b>Printer</b> → sambungkan printer Bluetooth/USB → tes cetak. Tiket dapur bisa dipisah per stasiun di Layar Dapur.'],
 meja:[['meja','dine in','pindah meja'],'Meja: isi nomor meja saat mengambil pesanan di kasir; meja otomatis tampil terisi di halaman <b>Meja</b> sampai dikosongkan.'],
 online:[['gofood','grabfood','shopeefood','ojol','online food','integrasi'],'Online food: <b>Menu Utama → Integrasi</b> → Connect platform → salin URL penerima → daftarkan di platform/mitra Anda. Pesanan masuk di <b>Pesanan Online</b>.'],
 promo:[['promo','diskon','kode promo'],'Promo: menu <b>Promo</b> (owner) → buat promo persen/nominal, periode dan kode. Dipakai di layar Bayar.'],
 absen:[['absen','absensi','payroll','gaji'],'Absensi: menu <b>Absensi</b> untuk clock in/out (lokasi dan foto). Gaji dihitung di <b>Payroll</b> (owner).']};
function aiAnswer(raw){
  const q=aiN(raw);if(!q)return'Silakan tulis pertanyaan Anda.';
  if(aiHas(q,'kenapa','mengapa','penyebab','analisis','analisa','rekomendasi','sarankan','strategi','menu apa','menu mana','cocok didiskon','omzet turun','omset turun','penjualan turun')&&aiHas(q,'omzet','omset','penjualan','transaksi','menu','diskon','promo','stok','laba','toko'))return null;
  const own=isOwner(),H=can('hist')||own;const r=aiRange(q);
  const gate=()=>r.need&&!H?'Data '+r.l+' butuh izin <b>Riwayat</b>. Saya bisa menjawab untuk <b>hari ini</b>.':'';
  const os=aiOrders(r),rev=os.reduce((a,b)=>a+(+b.total||0),0);
  if(aiHas(q,'halo','hai','hello','selamat')&&q.split(' ').length<4)return'Halo! Saya asisten Ordela. Tanya omzet, menu terlaris, stok menipis, jam ramai, atau cara memakai fitur.';
  if(aiHas(q,'terlaris','laris','best seller','paling banyak','populer','sering dibeli')&&!aiHas(q,'kategori','bayar','pembayaran','metode','qris','tunai')){const g=gate();if(g)return g;const t=aiTop(os,aiHas(q,'omzet','pendapatan')?'v':'q').slice(0,5);
    return t.length?`Menu terlaris ${r.l}:<br>`+t.map((x,i)=>`${i+1}. <b>${esc(x.n)}</b> — ${x.q} terjual · ${money(x.v)}`).join('<br>'):'Belum ada penjualan '+r.l+'.'}
  if(aiHas(q,'kurang laku','paling sepi','tidak laku','jarang')){const g=gate();if(g)return g;const m={};db.items.filter(i=>!i.bundle).forEach(i=>m[i.name]=0);aiTop(os).forEach(x=>{if(x.n in m)m[x.n]=x.q});
    const l=Object.entries(m).sort((a,b)=>a[1]-b[1]).slice(0,5);return l.length?`Menu paling sepi ${r.l}:<br>`+l.map(([n,v],i)=>`${i+1}. <b>${esc(n)}</b> — ${v} terjual`).join('<br>')+'<br><small>Pertimbangkan promo atau ubah posisi menu.</small>':'Belum ada menu.'}
  if(aiHas(q,'kategori')){const g=gate();if(g)return g;const m={};os.forEach(o=>(o.lines||[]).forEach(l=>{const it=find(l.id),c=(it&&it.cat)||'Lainnya';m[c]=(m[c]||0)+(+l.qty||0)*(+l.price||0)}));
    const l=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);return l.length?`Pendapatan per kategori ${r.l}:<br>`+l.map(([n,v])=>`• <b>${esc(n)}</b> — ${money(v)}`).join('<br>'):'Belum ada penjualan '+r.l+'.'}
  if(aiHas(q,'jam ramai','ramai','sepi jam','jam sibuk','peak')){const g=gate();if(g)return g;const h=Array(24).fill(0);os.forEach(o=>h[new Date(o.t).getHours()]++);const mx=Math.max(...h);if(!mx)return'Belum ada transaksi '+r.l+'.';
    const top=h.map((n,i)=>[i,n]).filter(z=>z[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([i,n])=>`<b>${String(i).padStart(2,'0')}.00–${String(i+1).padStart(2,'0')}.00</b> (${n} transaksi)`);return`Jam paling ramai ${r.l}: `+top.join(', ')}
  if(aiHas(q,'metode','bayar','qris','tunai','cash')&&aiHas(q,'berapa','paling','dominan','pembayaran','metode','qris','tunai')&&!aiHas(q,'cara')){const g=gate();if(g)return g;const m={};os.forEach(o=>{const k=o.method||'Lainnya';m[k]=(m[k]||0)+(+o.total||0)});const l=Object.entries(m).sort((a,b)=>b[1]-a[1]);
    return l.length?`Pembayaran ${r.l}:<br>`+l.map(([n,v])=>`• <b>${esc(n)}</b> — ${money(v)}`).join('<br>'):'Belum ada transaksi '+r.l+'.'}
  if(aiHas(q,'stok','habis','menipis','hampir')&&!aiHas(q,'opname')){if(!(can('inv')||own))return'Informasi stok butuh izin <b>Inventori</b>.';
    const it=db.items.filter(i=>!i.bundle&&!i.ns),out=it.filter(i=>i.stock<=0),low=it.filter(i=>i.stock>0&&i.stock<=i.min);
    if(!out.length&&!low.length)return'Semua stok aman 👍';return(out.length?`<b>Habis (${out.length}):</b> ${out.slice(0,10).map(i=>esc(i.name)).join(', ')}<br>`:'')+(low.length?`<b>Menipis (${low.length}):</b> ${low.slice(0,10).map(i=>esc(i.name)+' ('+i.stock+')').join(', ')}`:'')}
  if(aiHas(q,'laba','untung','profit','margin')){if(!own&&!can('hist'))return'Laba hanya untuk owner atau yang punya izin Riwayat.';const g=gate();if(g)return g;
    const cost=os.reduce((a,o)=>a+(o.lines||[]).reduce((z,l)=>z+(+l.cost||0)*(+l.qty||0),0),0);return`Laba kotor ${r.l}: <b>${money(rev-cost)}</b> (omzet ${money(rev)} − modal ${money(cost)}${rev?' · margin '+Math.round((rev-cost)/rev*100)+'%':''}).`}
  if(aiHas(q,'pengeluaran','biaya','kas keluar')){if(!(can('exp')||own))return'Pengeluaran butuh izin <b>Pengeluaran</b>.';const g=gate();if(g)return g;const e=(db.exps||[]).filter(x=>!x.del&&x.dir!=='in'&&x.cat!=='Kas masuk'&&dkey(x.t)>=r.f&&dkey(x.t)<=r.t);return`Pengeluaran ${r.l}: <b>${money(e.reduce((a,b)=>a+(+b.amt||0),0))}</b> (${e.length} catatan).`}
  if(aiHas(q,'member','pelanggan setia','langganan')){if(!(can('mem')||own))return'Data member butuh izin <b>Member</b>.';const m={};db.orders.forEach(o=>{if(o.mem&&o.mem.name)m[o.mem.name]=(m[o.mem.name]||0)+(+o.total||0)});const l=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return l.length?'Member teratas (belanja):<br>'+l.map(([n,v],i)=>`${i+1}. <b>${esc(n)}</b> — ${money(v)}`).join('<br>'):'Belum ada transaksi dengan member.'}
  if(aiHas(q,'omzet','pendapatan','penjualan','pemasukan','transaksi','rata rata','rata2','turun','naik')){const g=gate();if(g)return g;
    let s=`Penjualan ${r.l}: <b>${money(rev)}</b> dari <b>${os.length}</b> transaksi${os.length?' · rata-rata '+money(rev/os.length)+' per transaksi':''}.`;
    if(r.k==='t'||r.k==='yest'){const p=aiOrders({f:dkey(Date.now()-(r.k==='t'?1:2)*864e5),t:dkey(Date.now()-(r.k==='t'?1:2)*864e5)});const pr=p.reduce((a,b)=>a+(+b.total||0),0);if(H&&pr)s+=`<br>Dibanding hari sebelumnya (${money(pr)}): <b>${rev>=pr?'naik ':'turun '}${Math.abs(Math.round((rev-pr)/pr*100))}%</b>.`}
    return s}
  if(aiHas(q,'shift')&&aiHas(q,'berjalan','aktif','sekarang','status')){const c=shiftCur();return c?'Shift sedang berjalan sejak '+esc(dstr(c.t||c.start)):'Tidak ada shift yang berjalan.'}
  if(aiHas(q,'upsell','rekomendasi','tawarkan','paket','sering bareng','berpasangan','pasangan')){const g=gate();if(g)return g;const pair={};db.orders.slice(0,400).forEach(o=>{const n=[...new Set((o.lines||[]).map(l=>l.bn||l.name).filter(Boolean))];for(let i=0;i<n.length;i++)for(let j=i+1;j<n.length;j++){const k=[n[i],n[j]].sort().join(' + ');pair[k]=(pair[k]||0)+1}});
    const l=Object.entries(pair).sort((a,b)=>b[1]-a[1]).slice(0,5);return l.length?'Pasangan menu yang sering dibeli bersama — tawarkan saat melayani:<br>'+l.map(([n,c])=>`• <b>${esc(n)}</b> (${c}×)`).join('<br>'):'Belum cukup data transaksi untuk melihat pasangan menu.'}
  const dm=raw.match(/deskripsi(?: menu)?\s+(.+)/i);
  if(dm&&aiHas(q,'deskripsi')){const n=dm[1].trim().slice(0,40);return`Contoh deskripsi untuk <b>${esc(n)}</b>:<br>“${esc(n)} dibuat segar setiap hari dengan bahan pilihan — gurih, pas di lidah, dan cocok dinikmati kapan saja.”<br><small>Sesuaikan dengan rasa dan bahan asli menu Anda.</small>`}
  for(const k in AIH)if(aiHas(q,...AIH[k][0])){
     // Pertanyaan rekomendasi menu diskon adalah analisis sales, bukan panduan membuat promo.
     if(k==='promo'&&aiHas(q,'menu apa','menu mana','rekomendasi','sarankan','sebaiknya','harus didiskon','perlu didiskon','cocok didiskon','yang didiskon','menu untuk diskon'))continue;
     return AIH[k][1];
   }
  return null;
}
const AIMISS='Maaf, saya belum paham pertanyaan itu. Coba: “omzet hari ini”, “menu terlaris minggu ini”, “stok menipis”, “jam ramai”, “laba bulan ini”, “cara split bill”, atau “pasangan menu untuk upsell”.';
/* ringkasan data (hanya angka agregat, tanpa nama/HP pelanggan) untuk AI cloud, sesuai hak akses */
function aiCtx(){
  const own=isOwner(),H=can('hist')||own,L=[];
  const d=n=>dkey(Date.now()-n*864e5),t=dkey(Date.now());
  const orders=r=>aiOrders(r),total=os=>os.reduce((a,o)=>a+(+o.total||0),0);
  const cogs=os=>os.reduce((a,o)=>a+(o.lines||[]).reduce((z,l)=>z+(+l.cost||0)*(+l.qty||0),0),0);
  const stat=os=>({n:os.length,v:total(os),avg:os.length?total(os)/os.length:0,cost:cogs(os)});
  const fmt=x=>x.n+' transaksi; omzet '+Math.round(x.v)+'; rata-rata transaksi '+Math.round(x.avg);
  const this7=orders({f:d(6),t}),prev7=orders({f:d(13),t:d(7)});
  const this30=orders({f:d(29),t}),prev30=orders({f:d(59),t:d(30)});
  L.push('TOKO AKTIF: '+(db.set&&db.set.store||'-')+'. Semua angka hanya untuk toko/cabang yang sedang aktif. Mata uang: '+((db.set&&db.set.cur)||'Rp')+'.');
  L.push('Tanggal lokal hari ini: '+t);
  L.push('Hari ini: '+fmt(stat(orders({f:t,t}))));
  if(H){
    L.push('7 hari terakhir ('+d(6)+' s.d. '+t+'): '+fmt(stat(this7)));
    L.push('7 hari sebelumnya ('+d(13)+' s.d. '+d(7)+'): '+fmt(stat(prev7)));
    L.push('30 hari terakhir: '+fmt(stat(this30)));
    L.push('30 hari sebelumnya: '+fmt(stat(prev30)));
    const daily=[];for(let i=6;i>=0;i--){const day=d(i),os=orders({f:day,t:day});daily.push(day+': '+os.length+' transaksi, omzet '+Math.round(total(os)));}
    L.push('RINCIAN HARIAN 7 HARI TERAKHIR: '+daily.join(' | '));
    const top7=aiTop(this7,'v').slice(0,12),topPrev=aiTop(prev7,'v').slice(0,8);
    L.push('MENU 7 HARI TERAKHIR (urut omzet): '+(top7.length?top7.map(x=>x.n+' ('+x.q+' terjual; omzet '+Math.round(x.v)+')').join('; '):'belum ada'));
    L.push('MENU 7 HARI SEBELUMNYA: '+(topPrev.length?topPrev.map(x=>x.n+' ('+x.q+' terjual; omzet '+Math.round(x.v)+')').join('; '):'belum ada'));
    const top30=aiTop(this30,'v').slice(0,10);
    L.push('MENU TERLARIS 30 HARI: '+(top30.length?top30.map(x=>x.n+' ('+x.q+'x; '+Math.round(x.v)+')').join('; '):'belum ada'));
    const sold={};this30.forEach(o=>(o.lines||[]).forEach(l=>{const n=l.bn||l.name;if(n)sold[n]=(sold[n]||0)+(+l.qty||0)}));
    const slow=db.items.filter(i=>!i.bundle&&!i.ns).map(i=>({n:i.name,q:sold[i.name]||0,p:+i.price||0})).sort((a,b)=>a.q-b.q).slice(0,10);
    L.push('MENU PENJUALAN TERENDAH 30 HARI: '+(slow.length?slow.map(x=>x.n+' ('+x.q+' terjual; harga '+Math.round(x.p)+')').join('; '):'tidak tersedia'));
    const h=Array(24).fill(0);this30.forEach(o=>h[new Date(o.t).getHours()]++);L.push('TRANSAKSI PER JAM 30 HARI (jam 0-23): '+h.join(','));
    const pm={};this30.forEach(o=>{pm[o.method||'Lainnya']=(pm[o.method||'Lainnya']||0)+(+o.total||0)});L.push('METODE BAYAR 30 HARI: '+Object.entries(pm).map(([k,v])=>k+' '+Math.round(v)).join('; '));
    const ty={};this30.forEach(o=>{ty[o.type||'-']=(ty[o.type||'-']||0)+1});L.push('TIPE PESANAN 30 HARI: '+Object.entries(ty).map(([k,v])=>k+' '+v).join('; '));
    if(own){const ex=(db.exps||[]).filter(x=>!x.del&&x.dir!=='in'&&x.cat!=='Kas keluar'&&dkey(x.t)>=d(29)&&dkey(x.t)<=t);L.push('PENGELUARAN 30 HARI: '+Math.round(ex.reduce((a,x)=>a+(+x.amt||0),0))+' dari '+ex.length+' catatan.');}
    L.push('HPP 7 HARI: '+Math.round(cogs(this7))+'; laba kotor 7 hari: '+Math.round(total(this7)-cogs(this7)));
    L.push('HPP 7 HARI SEBELUMNYA: '+Math.round(cogs(prev7))+'; laba kotor periode sebelumnya: '+Math.round(total(prev7)-cogs(prev7)));
  }
  if(own||can('inv')){
    const it=db.items.filter(i=>!i.bundle&&!i.ns);
    L.push('JUMLAH ITEM STOK: '+it.length+'; stok habis: '+it.filter(i=>+i.stock<=0).length+'; stok menipis: '+it.filter(i=>+i.stock>0&&+i.stock<=+i.min).length);
    L.push('STOK HABIS: '+(it.filter(i=>+i.stock<=0).map(i=>i.name).slice(0,15).join(', ')||'-'));
    L.push('STOK MENIPIS: '+(it.filter(i=>+i.stock>0&&+i.stock<=+i.min).map(i=>i.name+' ('+i.stock+')').slice(0,15).join('; ')||'-'));
  }
  if(own){
    const activeSh=(db.shifts||[]).filter(x=>!x.del&&!x.close);
    L.push('SHIFT KASIR: '+activeSh.length+' shift sedang berjalan.');
    const promos=(db.promos||[]).filter(x=>!x.del);
    L.push('PROMO TERCATAT: '+promos.length+' promo (AI tidak boleh mengubah promo tanpa persetujuan owner).');
  }
  L.push('MENU & HARGA: '+db.items.filter(i=>!i.bundle&&!i.ns).slice(0,50).map(i=>i.name+' harga '+i.price+' modal '+(i.cost??'tidak diisi')+' stok '+(i.stock??'tidak diisi')).join('; '));
  return L.join('\\n').slice(0,5900);
}
function aiFormat(raw){
  const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>');
  const lines=String(raw||'').replace(/\r/g,'').split('\n');
  const out=[];let list='',items=[];
  const flush=()=>{if(!items.length)return;out.push('<'+list+' style="margin:6px 0 10px;padding-left:22px">'+items.map(x=>'<li style="margin:4px 0">'+inline(x)+'</li>').join('')+'</'+list+'>');items=[];list='';};
  for(const rawLine of lines){
    const line=rawLine.trim();if(!line){flush();continue;}let m;
    if((m=line.match(/^#{1,3}\s+(.+)$/))){flush();out.push('<div style="font-weight:750;font-size:1.04em;margin:12px 0 5px">'+inline(m[1])+'</div>');continue;}
    if((m=line.match(/^[-•*]\s+(.+)$/))){if(list!=='ul'){flush();list='ul';}items.push(m[1]);continue;}
    if((m=line.match(/^\d+[.)]\s+(.+)$/))){if(list!=='ol'){flush();list='ol';}items.push(m[1]);continue;}
    flush();out.push('<p style="margin:5px 0 8px;line-height:1.55">'+inline(line)+'</p>');
  }
  flush();return out.join('');
}
/* ===== Agen AI: AI mengusulkan aksi, aplikasi meminta konfirmasi lalu menjalankannya dengan hak akses pengguna ===== */
const AG={pend:{}};
const agN=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const agNum=v=>{if(typeof v==='number')return v;const n=parseFloat(String(v??'').replace(/[^0-9.,-]/g,'').replace(',','.'));return Number.isFinite(n)?n:NaN};
function agMenu(name){
  const q=agN(name);if(!q)return{err:'Nama menu kosong'};
  const ex=db.items.filter(i=>agN(i.name)===q);if(ex.length===1)return{it:ex[0]};
  const sc=db.items.map(i=>{const n=agN(i.name);let s=0;if(n===q)s=100;else if(n.includes(q)||q.includes(n))s=50+Math.min(n.length,q.length);else{const a=new Set(q.split(' '));s=n.split(' ').filter(w=>a.has(w)).length*10}return{i,s}}).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
  if(!sc.length)return{err:'Menu "'+name+'" tidak ditemukan'};
  if(sc.length>1&&sc[0].s===sc[1].s)return{err:'"'+name+'" cocok dengan beberapa menu ('+sc.slice(0,4).map(x=>x.i.name).join(', ')+'). Sebutkan lebih jelas'};
  return{it:sc[0].i};
}
const agOwn=()=>isOwner(),agInv=()=>isOwner()||can('inv');
const agCat=n=>{const t=String(n||'').trim().slice(0,30);return db.cats.find(c=>agN(c)===agN(t))||t};
const AG_PAGES={beranda:'home',laporan:'home',kasir:'pos',riwayat:'riw',inventori:'inv',stok:'inv',menu:'inv',stok_opname:'opname',pesanan_online:'co',meja:'table',promo:'promo',pengeluaran:'exp',pembelian:'buy',member:'mem',shift:'shift',pengaturan:'set',dapur:'kds',pengguna:'usr',absensi:'att',kartu_hadiah:'gift',reservasi:'rsv',integrasi:'integ',gaji:'pyr',asisten:'ai'};
const P=(o,r)=>({type:'object',properties:o,required:r||Object.keys(o)});
const S_=d=>({type:'string',description:d}),N_=d=>({type:'number',description:d});
const AGT=[
 {name:'adjust_stock',desc:'Ubah stok satu menu: tambah, kurangi, atau atur ke jumlah tertentu.',perm:agInv,params:P({menu:S_('Nama menu persis'),qty:N_('Jumlah (>=0)'),mode:{type:'string',enum:['tambah','kurangi','atur'],description:'tambah=stok+qty, kurangi=stok-qty, atur=stok jadi qty'}}),
  prep(a){const m=agMenu(a.menu);if(m.err)return m;const i=m.it;if(isB(i))return{err:i.name+' adalah paket; stoknya mengikuti isi paket'};if(i.ns)return{err:i.name+' tidak melacak stok'};
    const q=agNum(a.qty);if(!(q>=0))return{err:'Jumlah stok tidak valid'};const o=+i.stock||0,mode=a.mode||'tambah',n=Math.round((mode==='atur'?q:mode==='kurangi'?Math.max(0,o-q):o+q)*1000)/1000;
    return{text:`Stok ${i.name}: ${o} → ${n}`+(mode==='atur'?'':' ('+(mode==='kurangi'?'−':'+')+q+')'),run(){i.stock=n;logAdd(i.name,n-o,'Diubah via Asisten AI',n);save();return`Stok ${i.name} sekarang ${n}`}}}},
 {name:'set_price',desc:'Ubah harga jual satu menu.',perm:agOwn,params:P({menu:S_('Nama menu persis'),price:N_('Harga baru')}),
  prep(a){const m=agMenu(a.menu);if(m.err)return m;const p=rnd(agNum(a.price));if(!(p>=0))return{err:'Harga tidak valid'};const i=m.it;return{text:`Harga ${i.name}: ${money(i.price)} → ${money(p)}`,run(){i.price=p;save();return`Harga ${i.name} sekarang ${money(p)}`}}}},
 {name:'set_cost',desc:'Ubah modal (HPP) satu menu.',perm:agOwn,params:P({menu:S_('Nama menu persis'),cost:N_('Modal baru')}),
  prep(a){const m=agMenu(a.menu);if(m.err)return m;const c=rnd(agNum(a.cost));if(!(c>=0))return{err:'Modal tidak valid'};const i=m.it;return{text:`Modal ${i.name}: ${money(i.cost||0)} → ${money(c)}`,run(){i.cost=c;save();return`Modal ${i.name} sekarang ${money(c)}`}}}},
 {name:'set_min_stock',desc:'Ubah batas stok menipis satu menu.',perm:agInv,params:P({menu:S_('Nama menu persis'),min:N_('Batas minimum')}),
  prep(a){const m=agMenu(a.menu);if(m.err)return m;const v=Math.max(0,Math.floor(agNum(a.min)));if(!Number.isFinite(v))return{err:'Batas tidak valid'};const i=m.it;return{text:`Batas stok menipis ${i.name}: ${i.min??0} → ${v}`,run(){i.min=v;save();return`Batas stok ${i.name} jadi ${v}`}}}},
 {name:'rename_menu',desc:'Ganti nama satu menu.',perm:agOwn,params:P({menu:S_('Nama menu sekarang'),new_name:S_('Nama baru')}),
  prep(a){const m=agMenu(a.menu);if(m.err)return m;const nn=String(a.new_name||'').trim().slice(0,60);if(nn.length<2)return{err:'Nama baru terlalu pendek'};if(db.items.some(x=>x!==m.it&&agN(x.name)===agN(nn)))return{err:'Sudah ada menu bernama "'+nn+'"'};const i=m.it,old=i.name;return{text:`Ganti nama "${old}" → "${nn}"`,run(){i.name=nn;save();return`"${old}" diganti jadi "${nn}"`}}}},
 {name:'set_menu_category',desc:'Pindahkan satu menu ke kategori lain (dibuat bila belum ada).',perm:agOwn,params:P({menu:S_('Nama menu persis'),category:S_('Nama kategori')}),
  prep(a){const m=agMenu(a.menu);if(m.err)return m;const c=agCat(a.category);if(!c)return{err:'Kategori kosong'};const i=m.it;return{text:`Pindahkan ${i.name}: ${i.cat} → ${c}`,run(){if(!db.cats.includes(c))db.cats.push(c);i.cat=c;save();return`${i.name} dipindah ke ${c}`}}}},
 {name:'add_menu',desc:'Tambah menu baru. Isi stock hanya bila stok ingin dilacak.',perm:agOwn,params:P({name:S_('Nama menu'),price:N_('Harga jual'),category:S_('Kategori'),cost:N_('Modal (opsional)'),stock:N_('Stok awal (opsional)')},['name','price']),
  prep(a){const nm=String(a.name||'').trim().slice(0,60),p=rnd(agNum(a.price));if(nm.length<2)return{err:'Nama menu terlalu pendek'};if(!(p>=0))return{err:'Harga tidak valid'};if(db.items.some(x=>agN(x.name)===agN(nm)))return{err:'Menu "'+nm+'" sudah ada'};
    const c=agCat(a.category)||db.cats[0]||'Lainnya',cost=a.cost==null?0:rnd(agNum(a.cost)),st=a.stock==null?null:Math.max(0,agNum(a.stock));
    return{text:`Tambah menu "${nm}" · ${money(p)} · kategori ${c}`+(st!=null&&st===st?` · stok ${st}`:' · tanpa pelacakan stok'),run(){if(!db.cats.includes(c))db.cats.push(c);const it={id:uid(),emoji:'🍽️',name:nm,cat:c,price:p,cost:cost>=0?cost:0,stock:0,min:db.set.low,img:''};if(st!=null&&st===st){it.stock=st;if(st)logAdd(nm,st,'Stok awal',st)}else it.ns=1;db.items.push(it);save();return`Menu "${nm}" ditambahkan`}}}},
 {name:'delete_menu',desc:'Hapus satu menu dari daftar.',perm:agOwn,params:P({menu:S_('Nama menu persis')}),
  prep(a){const m=agMenu(a.menu);if(m.err)return m;const i=m.it,u=bdUsedBy(i.id);if(u)return{err:i.name+' dipakai di paket "'+u.name+'"; ubah paketnya dulu'};return{text:`HAPUS menu "${i.name}" (riwayat penjualan tidak terpengaruh)`,danger:1,run(){db.items=db.items.filter(x=>x.id!==i.id);delete S.cart[i.id];if(i.stock&&!isB(i))logAdd(i.name,-i.stock,'Item dihapus',0);save();return`Menu "${i.name}" dihapus`}}}},
 {name:'add_category',desc:'Tambah kategori menu baru.',perm:agOwn,params:P({name:S_('Nama kategori')}),
  prep(a){const c=String(a.name||'').trim().slice(0,30);if(!c)return{err:'Nama kategori kosong'};if(db.cats.some(x=>agN(x)===agN(c)))return{err:'Kategori "'+c+'" sudah ada'};return{text:`Tambah kategori "${c}"`,run(){db.cats.push(c);save();return`Kategori "${c}" ditambahkan`}}}},
 {name:'rename_category',desc:'Ganti nama kategori (semua menu di dalamnya ikut pindah).',perm:agOwn,params:P({old_name:S_('Nama lama'),new_name:S_('Nama baru')}),
  prep(a){const o=db.cats.find(x=>agN(x)===agN(a.old_name));if(!o)return{err:'Kategori "'+a.old_name+'" tidak ditemukan'};const n=String(a.new_name||'').trim().slice(0,30);if(!n)return{err:'Nama baru kosong'};if(db.cats.some(x=>x!==o&&agN(x)===agN(n)))return{err:'Kategori "'+n+'" sudah ada'};return{text:`Ganti nama kategori "${o}" → "${n}"`,run(){db.cats=db.cats.map(x=>x===o?n:x);db.items.forEach(i=>{if(i.cat===o)i.cat=n});if(S.cat===o)S.cat=n;save();return`Kategori "${o}" jadi "${n}"`}}}},
 {name:'delete_category',desc:'Hapus kategori yang sudah kosong (tidak ada menunya).',perm:agOwn,params:P({name:S_('Nama kategori')}),
  prep(a){const c=db.cats.find(x=>agN(x)===agN(a.name));if(!c)return{err:'Kategori "'+a.name+'" tidak ditemukan'};const n=db.items.filter(i=>i.cat===c).length;if(n)return{err:`Kategori "${c}" masih berisi ${n} menu; pindahkan dulu`};return{text:`Hapus kategori "${c}"`,danger:1,run(){db.cats=db.cats.filter(x=>x!==c);if(S.cat===c)S.cat='all';save();return`Kategori "${c}" dihapus`}}}},
 {name:'add_expense',desc:'Catat pengeluaran operasional.',perm:()=>isOwner()||can('exp'),params:P({amount:N_('Jumlah'),category:{type:'string',enum:EXP_CATS,description:'Kategori pengeluaran'},note:S_('Keterangan singkat (opsional)')},['amount','category']),
  prep(a){const v=rnd(agNum(a.amount));if(!(v>0))return{err:'Jumlah pengeluaran tidak valid'};const c=EXP_CATS.includes(a.category)?a.category:'Lainnya',nt=String(a.note||'').trim().slice(0,80);return{text:`Catat pengeluaran ${c}: ${money(v)}`+(nt?' · '+nt:''),run(){db.exps.unshift({id:'e'+uid(),t:nowIso(),by:myName(),cat:c,amt:v,note:nt,src:'lain',sh:null,u:Date.now()});save();return`Pengeluaran ${c} ${money(v)} dicatat`}}}},
 {name:'order_action',desc:'Proses pesanan online: tandai siap, buka pembayaran untuk menyelesaikan, atau batalkan.',perm:()=>can('co'),params:P({order_number:S_('Nomor pesanan, mis. 001'),action:{type:'string',enum:['siap','selesai','batal']}}),
  prep(a){const d=String(a.order_number||'').replace(/\D/g,'');const o=(window.CO&&CO.list||[]).find(x=>String(x.num).replace(/\D/g,'')===d&&d);if(!o)return{err:'Pesanan online #'+(d||'?')+' tidak ditemukan di daftar aktif'};
    if(a.action==='siap'){if(o.status!=='new'&&o.status!=='accepted')return{err:'Pesanan '+o.num+' sudah '+(o.status==='done'?'selesai':'dibatalkan')};return{text:`Tandai pesanan ${o.num} (${o.name}) siap diambil`,run(){coReadyAct(o.id);return`Pesanan ${o.num} ditandai siap`}}}
    if(a.action==='selesai')return{text:`Selesaikan pesanan ${o.num} (${o.name}) — membuka pembayaran`,run(){coPay(o.id);return`Membuka pembayaran ${o.num}`}};
    return{text:`BATALKAN pesanan ${o.num} (${o.name})`,danger:1,run(){coCancel(o.id);return`Membuka konfirmasi pembatalan ${o.num}`}}}},
 {name:'open_page',desc:'Buka halaman di aplikasi.',perm:()=>true,auto:1,params:P({page:{type:'string',enum:Object.keys(AG_PAGES)}}),
  prep(a){const v=AG_PAGES[a.page];if(!v)return{err:'Halaman tidak dikenal'};if(!can(v==='inv'?'inv':v==='home'?'hist':v)&&!['home','pos','ai'].includes(v)&&!isOwner())return{err:'Anda tidak punya akses ke halaman itu'};return{text:'Buka halaman '+a.page.replace(/_/g,' '),run(){go(v);return'Membuka '+a.page.replace(/_/g,' ')}}}},
];
const agTools=()=>AGT.filter(t=>{try{return t.perm()}catch(e){return false}}).map(t=>({name:t.name,description:t.desc,parameters:t.params}));
function agPlan(calls){
  const items=[],errs=[],auto=[];
  (calls||[]).forEach(c=>{const t=AGT.find(x=>x.name===c.name);if(!t||!t.perm()){errs.push('Tidak diizinkan untuk akun ini: '+(c.name||'?'));return}
    let r;try{r=t.prep(c.args||{})}catch(e){r={err:'Gagal menyiapkan aksi'}}
    if(r.err){errs.push(r.err);return}(t.auto?auto:items).push(r)});
  let msg='';
  auto.forEach(r=>{try{msg+=(msg?' · ':'')+r.run()}catch(e){errs.push('Gagal: '+(e&&e.message||e))}});
  let html='';
  if(items.length){const id='ag'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);AG.pend[id]=items;
    html+=`<div class="agc" data-ag="${id}"><b>Konfirmasi aksi</b><ul>${items.map(r=>`<li${r.danger?' class="dg"':''}>${esc(r.text)}</li>`).join('')}</ul><p class="agb"><button type="button" class="btn sm" onclick="P2.agRun('${id}')">Jalankan</button><button type="button" class="btn sm sec" onclick="P2.agNo('${id}')">Batal</button></p></div>`}
  if(msg)html+=`<p class="agm">✓ ${esc(msg)}</p>`;
  if(errs.length)html+=`<p class="agm w">⚠ ${errs.map(esc).join('<br>⚠ ')}</p>`;
  return html;
}
function agFinish(id,html){
  const re=new RegExp('<div class="agc" data-ag="'+id+'">[\\s\\S]*?</div>');
  AI.msgs.forEach(m=>{if(!m.me&&m.t&&m.t.includes('data-ag="'+id+'"'))m.t=m.t.replace(re,html)});
  document.querySelectorAll('.agc[data-ag="'+id+'"]').forEach(e=>{e.outerHTML=html});
  delete AG.pend[id];aiHistorySave();
}
P2.agRun=function(id){
  const items=AG.pend[id];if(!items){agFinish(id,'<p class="agm w">⚠ Aksi ini sudah kedaluwarsa. Minta lagi ke asisten.</p>');return}
  const ok=[],bad=[];
  items.forEach(r=>{try{ok.push(r.run())}catch(e){bad.push(e&&e.message||'gagal')}});
  agFinish(id,(ok.length?`<p class="agm">✓ ${ok.map(esc).join('<br>✓ ')}</p>`:'')+(bad.length?`<p class="agm w">⚠ ${bad.map(esc).join('<br>⚠ ')}</p>`:''));
  try{render()}catch(e){}
};
P2.agNo=function(id){agFinish(id,'<p class="agm">Dibatalkan, tidak ada yang diubah.</p>')};
async function aiCloud(q){
  const C=window.POS_SB;if(!(C&&C.url)||!(CL.on&&CL.tok))return null;
  // AI.msgs sudah berisi pesan pengguna terbaru. Bersihkan markup tampilan
  // sebelum mengirim riwayat agar model hanya menerima teks percakapan.
  const history=AI.msgs.slice(-20).map(m=>{
    let content=String(m.t||'');
    if(!m.me){const el=document.createElement('div');el.innerHTML=content;content=el.textContent||el.innerText||'';content=content.replace(/dijawab AI\s*$/i,'').trim();}
    return {role:m.me?'user':'assistant',content:content.slice(0,2000)};
  }).filter(m=>m.content);
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),35000);
  try{const r=await fetch(C.url+'/functions/v1/ai-chat',{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json',apikey:C.key||''},body:JSON.stringify({t:CL.tok,q,ctx:aiCtx(),messages:history,tools:agTools()})});
    const j=await r.json().catch(()=>({}));
    if(r.ok&&((typeof j.answer==='string'&&j.answer.trim())||(j.calls&&j.calls.length))){const card=agPlan(j.calls);return (j.answer&&j.answer.trim()?aiFormat(j.answer):'')+card+'<small style="display:block;opacity:.58;margin-top:8px">✦ Ordela AI</small>'}
    AI.why=r.status===404?'fungsi ai-chat belum di-deploy (404)':r.status===501?'secret AI_API_KEY belum diisi':'';
    if(r.status===404||r.status===501)return null;
    if(r.status===401&&/jwt/i.test(JSON.stringify(j))){AI.why='Verify JWT pada fungsi ai-chat masih menyala';return null}
    if(r.status>=500){AI.why=String(j.error||'AI tidak merespons').slice(0,160);return null}
    return esc(j.error||'Maaf, jawaban AI kosong. Coba kirim sekali lagi.')}catch(e){AI.why=e&&e.name==='AbortError'?'permintaan melewati batas waktu 35 detik':'fungsi ai-chat tidak terjangkau (periksa koneksi atau CORS)';return null}finally{clearTimeout(timer)}
}

/* ngobrol lewat AI Cashier: jawaban singkat tanpa format untuk dibacakan; tanpa alat (tidak mengubah data) */
const VCH=[];
P2.voiceChat=async function(q){
  const C=window.POS_SB;if(!(C&&C.url)||!(CL.on&&CL.tok))return null;
  const now=Date.now();while(VCH.length&&now-VCH[0].t>600000)VCH.shift();
  const messages=VCH.slice(-8).map(m=>({role:m.r,content:m.c})).concat([{role:'user',content:String(q).slice(0,500)}]);
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),25000);
  try{const r=await fetch(C.url+'/functions/v1/ai-chat',{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json',apikey:C.key||''},body:JSON.stringify({t:CL.tok,q:String(q).slice(0,500)+'\n(Ini percakapan suara. Jawab seperti kasir ramah yang ngobrol santai: 1-2 kalimat pendek, bahasa lisan yang natural (boleh “ya”, “nih”, “kok”, “wah”, “hmm”, “haha”), beri emosi sesuai konteks lewat tanda seru, tanda tanya, dan jeda “…”, sesuai bahasa lawan bicara, tanpa emoji, tanpa tanda format, angka dan uang ditulis seperti diucapkan. Awali jawaban dengan SATU tag emosi sesuai perasaanmu: [senang], [kaget], [bingung], [sedih], [tertawa] atau [santai], lalu kalimatnya; bereaksilah seperti manusia (kaget bila diprank, tertawa bila lucu). Kamu hanya menjawab, tidak mengubah data.)',ctx:aiCtx(),messages})});
    const j=await r.json().catch(()=>({}));
    const a=r.ok&&typeof j.answer==='string'?j.answer.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu,'').replace(/[*_#`>]+/g,'').replace(/\s+/g,' ').trim():'';
    if(!a)return null;VCH.push({r:'user',c:String(q).slice(0,500),t:now},{r:'assistant',c:a.replace(/^\s*\[[a-z]+\]\s*/i,'').slice(0,500),t:now});return a}catch(e){return null}finally{clearTimeout(timer)}
};

const aiTm=()=>new Date().toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
const aiBub=m=>`<div class="cr ${m.me?'me':''}"><div class="cbw"><div class="cb">${m.me?esc(m.t):m.t}</div></div></div>`;
const AISUG=['Omzet hari ini','Menu terlaris minggu ini','Stok menipis','Jam ramai','Laba bulan ini','Pasangan menu untuk upsell','Cara split bill','Cara buka shift'];
function aiScroll(){const l=$('#aiLog');if(l)l.scrollTop=l.scrollHeight}
async function aiHistoryRequest(action,messages){
  const C=window.POS_SB;if(!(C&&C.url)||!(CL.on&&CL.tok))throw new Error('Sesi cloud tidak tersedia');
  const r=await fetch(C.url+'/functions/v1/ai-chat',{method:'POST',headers:{'Content-Type':'application/json',apikey:C.key||''},body:JSON.stringify({t:CL.tok,action,messages})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Riwayat chat gagal diproses');return j;
}
async function aiHistoryLoad(uid){
  try{
    const j=await aiHistoryRequest('history_load');
    if(AI.uid!==uid)return;
    AI.msgs=Array.isArray(j.messages)?j.messages.slice(-60):[];
  }catch(e){AI.msgs=[]}
  AI.loaded=true;AI.loading=false;
  const log=$('#aiLog');if(log){
    log.innerHTML=AI.msgs.length?AI.msgs.map(aiBub).join(''):aiBub({t:'Halo! 👋 Saya asisten toko Ordela. Selain menjawab soal penjualan dan stok, saya bisa membantu mengubah stok, harga, menu, kategori, mencatat pengeluaran, memproses pesanan online, dan membuka halaman. Setiap perubahan saya minta konfirmasi dulu.',ts:aiTm()});
    aiScroll();
  }
  const input=$('#aiIn'),go=$('#aiGo');if(input)input.disabled=false;if(go)go.disabled=false;
}
function aiHistorySave(){
  if(!AI.uid||!AI.loaded||!CL.tok)return;
  const snapshot=AI.msgs.slice(-60);AI.saveChain=AI.saveChain.then(()=>aiHistoryRequest('history_save',snapshot)).catch(()=>{});
}
V.ai=function(){
  const el=$('#v-ai');if(!el)return;
  const uid=CL.on&&CL.tok&&CL.me&&CL.me.id?String(CL.me.id):'';
  if(AI.uid!==uid){AI.uid=uid;AI.msgs=[];AI.loaded=!uid;AI.loading=false;}
  const load=!!uid&&!AI.loaded&&!AI.loading;if(load)AI.loading=true;
  const mic=!!(window.VC&&VC.canDictate&&VC.canDictate());
  const svg=(p,w)=>`<svg viewBox="0 0 24 24" width="${w||22}" height="${w||22}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  el.innerHTML=`<div class="chat gx" id="aiChat"><div class="chh"><button class="cbk" type="button" onclick="go('pos')" aria-label="Kembali">${svg('<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>')}</button><b class="ctt">Asisten Ordela</b><button class="cclr" type="button" onclick="P2.aiClear()" aria-label="Hapus percakapan" title="Hapus percakapan">${svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',22)}</button></div>
  <div class="clog" id="aiLog" onscroll="P2.aiOnScroll()">${AI.loading?'<p class="hint">Memuat riwayat percakapan…</p>':AI.msgs.length?AI.msgs.map(aiBub).join(''):aiBub({t:'Halo! 👋 Saya asisten toko Ordela. Selain menjawab soal penjualan dan stok, saya bisa membantu mengubah stok, harga, menu, kategori, mencatat pengeluaran, memproses pesanan online, dan membuka halaman. Setiap perubahan saya minta konfirmasi dulu.',ts:aiTm()})}</div>
  <button class="cdn" id="aiDn" type="button" hidden onclick="P2.aiDown()" aria-label="Ke pesan terbaru">${svg('<path d="M12 5v14"/><path d="M5 12l7 7 7-7"/>',20)}</button>
  <div class="csg" id="aiSug">${AISUG.map(x=>`<button type="button" onclick="P2.aiAsk(this.textContent)">${x}</button>`).join('')}</div>
  <form class="cin" id="aiForm" onsubmit="event.preventDefault();P2.aiSend();return false"><input id="aiIn" ${AI.loading?'disabled':''} placeholder="Tulis balasan…" autocomplete="off" maxlength="200" enterkeyhint="send" oninput="P2.aiTgl()"><button class="csend cmic" id="aiMic" type="button" ${mic?'':'hidden'} onclick="P2.aiMic()" aria-label="Bicara">${svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',22)}</button><button class="csend" id="aiGo" ${AI.loading?'disabled':''} type="submit" aria-label="Kirim" ${mic?'hidden':''}>${svg('<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',20)}</button></form>
  <div class="cdis">Asisten AI bisa saja keliru. Periksa kembali sebelum bertindak.</div></div>`;
  aiScroll();if(load)aiHistoryLoad(uid);
};
/* ===== Scan menu dari gambar: AI membaca foto menu, pemilik mengecek, lalu dimasukkan ke menu ===== */
const SC={rows:[]};
P2.scanOpen=function(){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  if(!(window.POS_SB&&POS_SB.url&&CL.on&&CL.tok)){toast('Scan menu butuh login dan koneksi internet');return}
  openModal(`<h3>Scan menu dengan AI</h3>
  <p class="hint">Foto buku menu, papan menu, atau daftar harga. AI membaca nama, harga, dan kategori; Anda cek dulu sebelum dimasukkan.</p>
  <div class="two"><button class="btn" onclick="$('#scCam').click()"><i class="ic" data-ic="camera"></i>Ambil foto</button><button class="btn sec" onclick="$('#scPick').click()">Pilih gambar</button></div>
  <input type="file" id="scCam" accept="image/*" capture="environment" hidden onchange="P2.scanFile(this)"><input type="file" id="scPick" accept="image/*" hidden onchange="P2.scanFile(this)">
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
};
function scanShrink(file){return new Promise((ok,no)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{try{
    let side=1600,q=.82,out='';
    for(let k=0;k<4;k++){const sc=Math.min(1,side/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*sc));c.height=Math.max(1,Math.round(img.height*sc));
      const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);out=c.toDataURL('image/jpeg',q);
      if(out.length<2.8e6)break;side=Math.round(side*.75);q=Math.max(.6,q-.08)}
    URL.revokeObjectURL(url);ok(out)}catch(e){no(e)}};
  img.onerror=()=>{URL.revokeObjectURL(url);no(new Error('Gambar tidak bisa dibaca'))};img.src=url})}
P2.scanFile=async function(inp){
  const f=inp.files&&inp.files[0];inp.value='';if(!f)return;
  openModal(`<h3>Membaca menu…</h3><div class="aiscan"><div class="aiscan-bar"><i></i></div><p class="hint">AI sedang membaca gambar. Biasanya 5–20 detik.</p></div>`);
  try{
    const image=await scanShrink(f);
    const C=window.POS_SB,ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),60000);
    let j;try{
      const r=await fetch(C.url+'/functions/v1/menu-scan',{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json',apikey:C.key||''},body:JSON.stringify({t:CL.tok,image,cur:db.set.cur||'',cats:db.cats.slice(0,30)})});
      j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('Gagal ('+r.status+')'));
    }finally{clearTimeout(to)}
    const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const ex={};db.items.forEach(i=>{ex[norm(i.name)]=i});
    SC.rows=(j.items||[]).map(x=>{const e=ex[norm(x.name)];return{name:x.name,price:x.price==null?'':String(x.price),cat:x.category||'Lainnya',ex:e?e.id:null,exPrice:e?e.price:null,on:!e&&x.price!=null}});
    P2.scanReview();
  }catch(e){
    openModal(`<h3>Scan gagal</h3><p class="hint">${esc(e&&e.name==='AbortError'?'AI terlalu lama merespons. Coba lagi dengan foto yang lebih kecil.':(e&&e.message)||'Terjadi kesalahan')}</p><button class="btn" onclick="P2.scanOpen()">Coba lagi</button><button class="btn sec" onclick="closeModal()">Tutup</button>`);
  }
};
P2.scanReview=function(){
  const R=SC.rows;
  if(!R.length){openModal(`<h3>Tidak ada menu terbaca</h3><p class="hint">Pastikan foto jelas, terang, dan memperlihatkan nama beserta harga.</p><button class="btn" onclick="P2.scanOpen()">Coba foto lain</button><button class="btn sec" onclick="closeModal()">Tutup</button>`);return}
  const n=R.filter(r=>r.on).length;
  openModal(`<h3>Hasil scan (${R.length} menu)</h3>
  <p class="hint">Periksa dan perbaiki bila perlu. Menu yang sudah ada tidak dicentang; mencentangnya memperbarui harganya. Menu baru ditambahkan tanpa pelacakan stok (bisa diatur nanti).</p>
  <datalist id="scCats">${db.cats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
  <div class="scl">${R.map((r,i)=>`<div class="scr${r.on?' on':''}${r.ex?' ex':''}">
    <label class="scc"><input type="checkbox" ${r.on?'checked':''} onchange="P2.scanTog(${i},this.checked)"><span class="scn"><input class="fi" value="${esc(r.name)}" oninput="SC.rows[${i}].name=this.value" aria-label="Nama"></span></label>
    <div class="two"><input class="fi" inputmode="decimal" placeholder="Harga" value="${esc(r.price)}" oninput="P2.scanPrice(${i},this.value)" aria-label="Harga"><input class="fi" list="scCats" value="${esc(r.cat)}" oninput="SC.rows[${i}].cat=this.value" aria-label="Kategori"></div>
    ${r.ex?`<small class="scx">Sudah ada${r.exPrice!=null?' · harga sekarang '+esc(money(r.exPrice)):''}</small>`:''}${r.price===''?'<small class="scx w">Harga tidak terbaca, isi manual</small>':''}</div>`).join('')}</div>
  <div class="scf"><button class="btn" id="scGo" onclick="P2.scanAdd()" ${n?'':'disabled'}>Masukkan ${n} menu</button><button class="btn sec" onclick="closeModal()">Batal</button></div>`);
};
P2.scanTog=function(i,v){SC.rows[i].on=!!v;P2.scanCnt()};
P2.scanPrice=function(i,v){const r=SC.rows[i];r.price=v;if(v!==''&&!r.ex&&!r.on){r.on=true;const cb=document.querySelectorAll('.scr input[type=checkbox]')[i];if(cb)cb.checked=true}P2.scanCnt()};
P2.scanCnt=function(){const n=SC.rows.filter(r=>r.on).length,b=$('#scGo');if(b){b.disabled=!n;b.textContent='Masukkan '+n+' menu'}};
P2.scanAdd=function(){
  if(!isOwner())return;
  let add=0,upd=0,bad=0;
  SC.rows.filter(r=>r.on).forEach(r=>{
    const name=String(r.name||'').trim().slice(0,60),p=r.price===''?NaN:rnd(String(r.price).replace(',','.'));
    if(!name||!(p>=0)){bad++;return}
    const cat=String(r.cat||'').trim().slice(0,30)||'Lainnya';
    if(r.ex){const it=find(r.ex);if(it&&it.price!==p){it.price=p;upd++}return}
    if(db.items.some(x=>String(x.name).toLowerCase()===name.toLowerCase())){bad++;return}
    if(!db.cats.includes(cat))db.cats.push(cat);
    db.items.push({id:uid(),emoji:'🍽️',name,cat,price:p,cost:0,stock:0,min:db.set.low,img:'',ns:1});add++;
  });
  if(!add&&!upd){toast(bad?'Periksa nama dan harga yang dicentang':'Tidak ada perubahan');return}
  save();closeModal();render();toast((add?add+' menu ditambahkan':'')+(add&&upd?', ':'')+(upd?upd+' harga diperbarui':''));
};
P2.aiTgl=function(){const i=$('#aiIn'),m=$('#aiMic'),g=$('#aiGo');if(!i||!g)return;const has=!!i.value.trim(),canMic=!!(window.VC&&VC.canDictate&&VC.canDictate());if(m)m.hidden=!canMic||has;g.hidden=canMic&&!has};
P2.aiOnScroll=function(){const l=$('#aiLog'),d=$('#aiDn');if(l&&d)d.hidden=l.scrollHeight-l.scrollTop-l.clientHeight<140};
P2.aiDown=function(){const l=$('#aiLog');if(l)l.scrollTo({top:l.scrollHeight,behavior:'smooth'})};
let aiDic=null;
P2.aiMic=function(){
  const b=$('#aiMic'),i=$('#aiIn');if(!b||!i)return;
  if(aiDic){aiDic.stop();return}
  b.classList.add('rec');
  aiDic=VC.dictate({text:t=>{i.value=String(t||'').slice(0,200);P2.aiTgl()},end:err=>{aiDic=null;const m=$('#aiMic');if(m)m.classList.remove('rec');if(err)toast(err);const x=$('#aiIn');if(x&&x.value.trim()&&!err)x.focus()}});
  if(!aiDic){b.classList.remove('rec');toast('Mikrofon tidak tersedia')}
};
P2.aiSend=function(){const i=$('#aiIn');if(!i)return;const v=i.value;i.value='';P2.aiAsk(v)};
P2.aiAsk=async function(t){
  t=String(t||'').trim().slice(0,200);if(!t||AI.busy||AI.loading)return;
  const log=$('#aiLog');if(!log){return}
  if(!AI.msgs.length)log.innerHTML='';
  const add=m=>{m.ts=aiTm();AI.msgs.push(m);log.insertAdjacentHTML('beforeend',aiBub(m));aiScroll()};
  add({me:1,t});let a=null;
  /* semua pertanyaan dijawab AI (asisten toko, memakai data toko + riwayat percakapan); aturan lokal hanya cadangan bila AI tidak terjangkau */
  const cloud=!!(window.POS_SB&&POS_SB.url&&CL.on&&CL.tok);
  if(cloud){AI.busy=1;const go=$('#aiGo');if(go)go.disabled=true;
    log.insertAdjacentHTML('beforeend','<div class="cr" id="aiTyp"><div class="cbw"><div class="cb typ"><i></i><i></i><i></i></div></div></div>');aiScroll();
    AI.why='';try{a=await aiCloud(t)}catch(e){AI.why='terjadi kesalahan saat menghubungi AI';a=null}finally{const ty=$('#aiTyp');if(ty)ty.remove();AI.busy=0;if($('#aiGo'))$('#aiGo').disabled=false}}
  if(a===null){let loc=null;try{loc=aiAnswer(t)}catch(e){loc=null}
    a=loc!==null?loc+(cloud?'<small style="display:block;opacity:.58;margin-top:8px">Jawaban dasar (AI sedang tidak terjangkau)'+(AI.why&&isOwner()?' · '+esc(AI.why):'')+'</small>':''):'Maaf, aku belum berhasil menghubungi AI. Coba kirim lagi sebentar ya.'+(AI.why&&isOwner()?'<br><small style="opacity:.65">Detail: '+esc(AI.why)+'.</small>':'')}
  add({t:a});if(AI.msgs.length>60)AI.msgs.splice(0,AI.msgs.length-60);aiHistorySave();
  const i=$('#aiIn');if(i&&matchMedia('(hover:hover)').matches)i.focus();
};
P2.aiClear=function(){AI.msgs=[];if(AI.uid)aiHistoryRequest('history_clear').catch(()=>{});V.ai()};
P2.aiAnswer=aiAnswer;P2.aiCtx=aiCtx;

/* ================= RIWAYAT PESANAN ================= */
const RW={r:'today',q:'',n:30};
V.riw=function(){
  const el=$('#v-riw');if(!el)return;const H=can('hist');if(!H)RW.r='today';
  const now=Date.now(),days={today:0,'7':6,'30':29,all:9999},from=RW.r==='all'?'':dkey(now-days[RW.r]*864e5);
  const q=RW.q.trim().toLowerCase();
  const rows=db.orders.filter(x=>(!from||dkey(x.t)>=from)&&(!q||[x.no,x.cust,x.tbl,x.type,x.cashier,x.method].some(v=>String(v||'').toLowerCase().includes(q))));
  const tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
  let h='',cur='';const show=rows.slice(0,RW.n);
  for(const x of show){const k=dkey(x.t);
    if(k!==cur){cur=k;const g=rows.filter(z=>dkey(z.t)===k);h+=`<div class="dhd"><b>${new Date(x.t).toLocaleDateString(dloc(),{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}</b> · ${g.length} Transaksi · <b>${money(g.reduce((a,b)=>a+(+b.total||0),0))}</b></div>`}
    h+=`<button class="li" data-no="${esc(x.no)}" onclick="histOpen(this.dataset.no)"><span class="l"><b>${esc(x.no)}${x.cust?' · '+esc(x.cust):''}</b><small>${tm(x.t)} · ${esc(x.type)}${x.tbl?' · Meja '+esc(x.tbl):''}${x.cashier?' · '+esc(x.cashier):''}</small></span><span class="r"><b>${money(x.total)}</b><small>${esc(x.method||'')}</small></span></button>`}
  const chip=(k,l)=>`<button class="tag ${RW.r===k?'pos':''}" type="button" onclick="P2.riwSet('${k}')">${l}</button>`;
  el.innerHTML=bar('<i class="ic" data-ic="receipt"></i>Riwayat Pesanan')+`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${chip('today','Hari ini')}${H?chip('7','7 hari')+chip('30','30 hari')+chip('all','Semua'):''}</div>
  <input class="fi" id="riwQ" type="search" placeholder="Cari no. struk, nama, meja…" value="${esc(RW.q)}" oninput="P2.riwQ(this.value)" autocomplete="off">
  <div class="panel hp" style="margin-top:8px"><div class="ph"><h3>Transaksi</h3><small class="pl">${rows.length} transaksi · ${money(rows.reduce((a,b)=>a+(+b.total||0),0))}</small></div><div class="lst">${h||'<div class="rwempty"><i class="ic" data-ic="receipt"></i><b>'+(db.orders.length?'Tidak ada transaksi':'Belum ada transaksi')+'</b><small>'+(db.orders.length?'Coba ubah rentang waktu atau kata pencarian.':'Transaksi yang sudah dibayar akan muncul di sini.')+'</small></div>'}</div>
  ${rows.length>RW.n?'<button class="btn sec morebtn" onclick="P2.riwMore()">Tampilkan lebih banyak</button>':''}</div>`;
};
P2.riwSet=function(r){RW.r=r;RW.n=30;V.riw()};
P2.riwMore=function(){RW.n+=30;V.riw()};
let riwT=0;P2.riwQ=function(v){RW.q=v;RW.n=30;clearTimeout(riwT);riwT=setTimeout(()=>{V.riw();const e=$('#riwQ');if(e){e.focus();e.setSelectionRange(v.length,v.length)}},180)};

/* ================= INTEGRASI CENTER (online food) ================= */
const IG={gofood:{n:'GoFood',d:'Pesanan dari GoFood masuk otomatis ke Pesanan & Layar Dapur.',c:'#00aa13',food:1,f:[['merchant','Merchant / Store ID dari GoBiz',0],['key','API key / Client secret (opsional)',1]]},
  grabfood:{n:'GrabFood',d:'Pesanan dari GrabFood masuk otomatis ke Pesanan & Layar Dapur.',c:'#00b14f',food:1,f:[['merchant','Merchant ID dari GrabMerchant',0],['key','API key / Client secret (opsional)',1]]},
  shopeefood:{n:'ShopeeFood',d:'Pesanan dari ShopeeFood masuk otomatis ke Pesanan & Layar Dapur.',c:'#ee4d2d',food:1,f:[['merchant','Merchant / Store ID',0],['key','API key / Partner key (opsional)',1]]},
  webhook:{n:'Webhook Keluar',d:'Kirim setiap transaksi/pesanan baru ke sistem Anda (JSON, ditandatangani HMAC-SHA256 bila Secret diisi).',c:'#0ea5e9',f:[['url','URL https',1],['secret','Secret tanda tangan (opsional)',1]]}};
let IGL=null,IGERR='';
const igUrl=t=>((window.POS_SB&&window.POS_SB.url)||'https://PROJECT.supabase.co')+'/functions/v1/food-hook?k='+t;
V.integ=async function(){
  const el=$('#v-integ');if(!el)return;const H=bar('<i class="ic" data-ic="plug"></i>Integrasi Center');
  if(!(CL.on&&CL.me)){el.innerHTML=H+'<div class="panel"><p class="hint">Integrasi hanya tersedia dalam mode server (login akun). Masuk dulu untuk menyambungkan layanan.</p></div>';return}
  if(!IGL){el.innerHTML=H+'<div class="panel"><p class="hint">Memuat…</p></div>';
    try{const r=await api('/api/integrations');const j=await r.json();if(!r.ok)throw new Error(j.error||'');IGL=j.items;IGERR=''}catch(e){IGL=null;IGERR=e.message||'Gagal memuat';el.innerHTML=H+`<div class="panel"><p class="hint">${esc(IGERR)}</p><button class="btn sec" onclick="P2.igReload()">Coba lagi</button></div>`;return}}
  const by={};IGL.forEach(x=>by[x.kind]=x);
  const card=k=>{const m=IG[k],x=by[k];
    const st=!x?'Belum tersambung':!x.enabled?'Dijeda':m.food?(x.status==='aktif'?'Pesanan terakhir · '+esc(dstr(x.last_at)):'Menunggu pesanan pertama'):x.status==='gagal'?'Terakhir gagal':x.http&&x.http>=400?'Ditolak ('+x.http+')':x.status==='terkirim'?'Terkirim'+(x.last_at?' · '+esc(dstr(x.last_at)):''):'Tersambung';
    const bad=x&&(x.status==='gagal'||(x.http&&x.http>=400));
    return `<div class="igc"><div class="igh"><span class="igd" style="background:${m.c}"></span><b>${m.n}</b><span class="tag ${x?(bad?'neg':'pos'):''}">${st}</span></div><p class="hint">${m.d}</p>
    <div class="two">${x?`<button class="btn sm" onclick="P2.igForm('${k}')">Ubah</button>${m.food?`<button class="btn sm sec" onclick="P2.igHook('${k}')">URL penerima</button><button class="btn sm sec" style="grid-column:1/-1" onclick="P2.igTest('${k}')">Buat pesanan contoh</button>`:`<button class="btn sm sec" onclick="P2.igTest('${k}')">Kirim tes</button>`}`:`<button class="btn sm" style="grid-column:1/-1" onclick="P2.igForm('${k}')">Connect</button>`}</div></div>`};
  el.innerHTML=H+`<p class="hint" style="margin:0 0 10px">Sambungkan akun online food restoran ini. Pesanan yang masuk otomatis menjadi pesanan bertipe GoFood/GrabFood/ShopeeFood di halaman Pesanan dan Layar Dapur. Kunci disimpan terenkripsi di server dan tidak pernah ditampilkan lagi.</p>
  <div class="igg">${['gofood','grabfood','shopeefood'].map(card).join('')}</div>
  <div class="panel" style="margin-top:12px"><h3>Cara kerja</h3><p class="hint" style="margin:0">Setiap restoran punya <b>URL penerima</b> sendiri. Platform atau mitra integrasi Anda (aggregator, GoBiz/GrabMerchant partner, Zapier/Make/n8n) mengirim pesanan ke URL itu dengan POST JSON, misalnya <code>{"id":"GF-123","customer_name":"Budi","items":[{"name":"Nasi Goreng","qty":2,"price":25000}],"total":50000}</code>. Akses API resmi GoFood/GrabFood/ShopeeFood diberikan platform kepada mitra terdaftar; Ordela tidak menggantikan proses pendaftaran itu.</p></div>
  <h3 style="margin:14px 0 6px">Lanjutan</h3><div class="igg">${card('webhook')}</div>`;
};
P2.igForm=function(k){
  const m=IG[k],x=(IGL||[]).find(i=>i.kind===k),ev=x?x.events:['sale','order'];
  openModal(`<h3>${m.n}</h3><p class="hint" style="margin:0 0 6px">${m.d}</p>
  ${m.f.map(([n,l,sec])=>{const cur=x&&x.fields[n],set=sec&&cur&&cur.set;return `<label class="fl" for="ig_${n}">${l}</label><input class="fi" id="ig_${n}" autocomplete="off" autocapitalize="off" spellcheck="false" ${sec?'type="password"':''} value="${sec?'':esc((cur||'')+'')}" placeholder="${set?'Tersimpan — kosongkan untuk tetap memakai':''}">`}).join('')}
  ${m.food?'':`<label class="tgl"><input type="checkbox" id="ig_sale" ${ev.includes('sale')?'checked':''}><span>Transaksi baru</span></label><label class="tgl"><input type="checkbox" id="ig_order" ${ev.includes('order')?'checked':''}><span>Pesanan online</span></label>`}
  <label class="tgl"><input type="checkbox" id="ig_on" ${!x||x.enabled?'checked':''}><span>Aktif</span></label>
  <button class="btn" onclick="P2.igSave('${k}')">${x?'Simpan':'Sambungkan'}</button>${x?`<button class="btn sec" style="color:var(--bad)" onclick="P2.igDel('${k}')">Putuskan</button>`:''}<button class="btn sec" onclick="closeModal()">Batal</button>`);
};
async function igCall(path,body){const r=await api(path,{method:path==='/api/integrations'?'PUT':'POST',body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Gagal');IGL=j.items;return j}
P2.igSave=async function(k){
  const m=IG[k],b={kind:k,enabled:$('#ig_on').checked,events:m.food?[]:['sale','order'].filter(e=>$('#ig_'+e).checked)};m.f.forEach(([n])=>b[n]=$('#ig_'+n).value.trim());
  try{const j=await igCall('/api/integrations',b);closeModal();toast('Tersimpan');V.integ();if(j.hook)P2.igShow(k,j.hook)}catch(e){toast(e.message)}
};
P2.igShow=function(k,t){const u=igUrl(t);openModal(`<h3>URL penerima ${IG[k].n}</h3><p class="hint" style="margin:0 0 6px">Salin dan simpan sekarang — token ini <b>hanya ditampilkan sekali</b>. Daftarkan URL ini di platform/mitra integrasi Anda sebagai tujuan pesanan (POST JSON).</p><textarea class="fi" id="igU" rows="3" readonly onfocus="this.select()">${esc(u)}</textarea>
  <button class="btn" onclick="P2.igCopy()">Salin URL</button><p class="hint" style="margin:6px 0">Fungsi penerima perlu di-deploy sekali di Supabase (<code>food-hook</code>, lihat panduan di repo). Tombol “Buat pesanan contoh” menguji alur tanpa platform.</p><button class="btn sec" onclick="closeModal()">Selesai</button>`)};
P2.igCopy=function(){const e=$('#igU');e.select();try{navigator.clipboard.writeText(e.value);toast('URL disalin')}catch(x){document.execCommand('copy');toast('URL disalin')}};
P2.igHook=function(k){openModal(`<h3>URL penerima ${IG[k].n}</h3><p class="hint" style="margin:0 0 8px">Demi keamanan, URL lama tidak bisa ditampilkan lagi. Buat token baru bila hilang — URL lama otomatis berhenti berlaku.</p><button class="btn" onclick="P2.igRegen('${k}')">Buat URL baru</button><button class="btn sec" onclick="closeModal()">Batal</button>`)};
P2.igRegen=async function(k){try{const j=await igCall('/api/integrations/hook',{kind:k});closeModal();P2.igShow(k,j.hook);V.integ()}catch(e){toast(e.message)}};
P2.igReload=function(){IGL=null;V.integ()};
P2.igTest=async function(k){try{await igCall('/api/integrations/test',{kind:k});toast(IG[k].food?'Pesanan contoh dibuat — cek halaman Pesanan':'Tes terkirim');V.integ()}catch(e){toast(e.message)}};
P2.igDel=async function(k){if(!confirm('Putuskan '+IG[k].n+'? Kredensial dan URL penerima dihapus.'))return;try{await igCall('/api/integrations/delete',{kind:k});closeModal();toast('Diputuskan');V.integ()}catch(e){toast(e.message)}};


/* ================= PAKET & LANGGANAN ================= */
const PLN_FEAT={ai_manager:'Asisten AI',ai_sales_analysis:'Analisis penjualan AI',ai_recommendations:'Rekomendasi AI',promotions:'Promo',loyalty:'Member & poin',kds:'Layar Dapur',multi_outlet:'Multi-outlet',staff_attendance:'Absensi',inventory_advanced:'Stok lanjutan',supplier_management:'Pembelian & pemasok',api_integrations:'Integrasi',advanced_reports:'Laporan lanjutan',exports:'Ekspor data',qr_ordering:'Pesan via QR',audit_log:'Log audit',advanced_permissions:'Izin lanjutan',central_dashboard:'Dasbor pusat',priority_support:'Dukungan prioritas'};
const PLN_ST={active:['Aktif','ok'],trialing:['Masa uji coba','w'],past_due:['Menunggu pembayaran','bad'],grandfathered:['Akses khusus','ok'],cancelled:['Dibatalkan','bad'],expired:['Berakhir','bad'],suspended:['Ditangguhkan','bad'],none:['Belum ada langganan','w']};
P2.planIv=P2.planIv||'monthly';
function plnLim(v){return v==null?'—':v<0?'Tanpa batas':String(v)}
function plnDate(x){try{return new Date(x).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}catch(e){return ''}}
function plnMoney(cur,minor){try{return new Intl.NumberFormat('id-ID',{style:'currency',currency:cur||'USD'}).format((+minor||0)/100)}catch(e){return (minor/100)+' '+cur}}
function plnBar(label,used,lim){
  const unl=lim==null||lim<0,pct=unl||!lim?0:Math.min(100,Math.round(used/lim*100));
  return `<div class="plb"><div class="plbh"><span>${esc(label)}</span><b>${used}${unl?'':' / '+lim}${unl&&lim<0?' · tanpa batas':''}</b></div>${unl?'':`<div class="plbt"><i class="${pct>=100?'full':pct>=80?'hi':''}" style="width:${pct}%"></i></div>`}</div>`}
/* hitung transaksi hari ini / bulan ini dari data perangkat (penjualan kasir tidak pernah ditolak server; batasnya diperiksa di sini saat bayar) */
function planOrderCounts(){
  const n=new Date(),d0=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime(),m0=new Date(n.getFullYear(),n.getMonth(),1).getTime();
  let d=0,m=0;(db.orders||[]).forEach(o=>{const t=new Date(o.t).getTime();if(t>=m0){m++;if(t>=d0)d++}});return{d,m}}
function planLimitMsg(){
  const p=CL.on&&CL.me&&CL.me.plan;if(!p||!p.limits)return'';
  const L=p.limits,c=planOrderCounts();
  if(L.daily_orders>=0&&c.d>=L.daily_orders)return `Batas transaksi harian paket ${p.name} (${L.daily_orders}) sudah tercapai.`;
  if(L.monthly_orders>=0&&c.m>=L.monthly_orders)return `Batas transaksi bulanan paket ${p.name} (${L.monthly_orders}) sudah tercapai.`;
  return''}
function planLimitDlg(msg){
  const old=$('#upDlg');if(old)old.remove();
  const d=document.createElement('div');d.id='upDlg';d.className='updlg';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  const own=isOwner();
  d.innerHTML=`<div class="upbox"><h3>Batas paket tercapai</h3><p>${esc(msg)}</p><p>${own?'Upgrade paket untuk melanjutkan transaksi.':'Hubungi owner untuk upgrade paket.'}</p>${own?'<button type="button" class="upok" id="upGo">Lihat paket</button>':''}<button type="button" class="upok sec" id="upX">Tutup</button></div>`;
  document.body.append(d);const close=()=>d.remove();
  d.addEventListener('click',e=>{if(e.target===d)close()});d.querySelector('#upX').onclick=close;
  const g=d.querySelector('#upGo');if(g)g.onclick=()=>{close();P2.plan()}}
window.planLimitMsg=planLimitMsg;window.planLimitDlg=planLimitDlg;

P2.plan=async function(){
  closeAll();
  let j;try{j=await (await api('/api/plan')).json();if(!j.plan)throw 0}catch(e){toast('Gagal memuat paket (perlu koneksi)');return}
  const pl=j.plan,L=pl.limits||{},U=j.usage||{},oc=planOrderCounts(),st=PLN_ST[pl.status]||['','w'],sub=j.sub||{};
  const idx=j.plans.findIndex(x=>x.code===pl.code),iv=P2.planIv,pend=j.request;
  let exp='';if(pl.status==='trialing'&&sub.trial)exp=`Uji coba sampai ${plnDate(sub.trial)}`;else if(sub.end&&pl.status!=='grandfathered')exp=`${sub.cancel?'Berakhir':'Berlaku sampai'} ${plnDate(sub.end)}`;
  const prevFeat=i=>{const f={};for(let k=0;k<i;k++)Object.entries(j.plans[k].features||{}).forEach(([a,b])=>{if(b)f[a]=1});return f};
  const cards=j.plans.map((x,i)=>{
    const pf=prevFeat(i),add=Object.entries(x.features||{}).filter(([k,v])=>v&&!pf[k]&&PLN_FEAT[k]).map(([k])=>PLN_FEAT[k]);
    const pr=(x.prices||[]).find(r=>r.interval===iv)||(x.prices||[])[0],lm=x.limits||{};
    const cur=x.code===pl.code,up=idx>=0?i>idx:true,asked=pend&&pend.plan===x.code;
    return `<div class="plc${cur?' cur':''}"><div class="plh"><b>${esc(x.name)}</b>${cur?'<span class="pst ok">Paket Anda</span>':''}</div>
      <div class="plp">${pr?esc(pr.label||plnMoney(pr.currency,pr.amount)):'Gratis'}</div>
      <ul class="pll"><li>${plnLim(lm.staff)} karyawan · ${plnLim(lm.outlets)} outlet</li><li>${plnLim(lm.daily_orders)} transaksi/hari</li>${(lm.ai_messages_month>0||lm.ai_messages_month<0)?`<li>${plnLim(lm.ai_messages_month)} pesan AI/bulan</li>`:''}${i>0?`<li class="mu">${j.plans[i-1]?'Semua di '+esc(j.plans[i-1].name)+', plus:':''}</li>`:''}${add.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>
      ${cur?'':up?(asked?`<button class="btn sec" disabled>Permintaan dikirim ${esc(plnDate(pend.at))}</button>`:`<button class="btn" onclick="P2.planReq('${x.code}')">Ajukan ${esc(x.name)}</button>`):''}</div>`}).join('');
  const inv=(j.invoices||[]).map(i=>`<div class="pli"><div><b>${esc(i.no)}</b><small>${i.paid?'Dibayar '+esc(plnDate(i.paid)):i.due?'Jatuh tempo '+esc(plnDate(i.due)):''}</small></div><div class="plr"><b>${esc(plnMoney(i.currency,i.total))}</b><span class="pst ${i.status==='paid'?'ok':i.status==='open'?'w':''}">${esc({paid:'Lunas',open:'Belum dibayar',draft:'Draf',void:'Batal',refunded:'Dikembalikan',uncollectible:'Gagal'}[i.status]||i.status)}</span>${i.url&&i.status==='open'?`<a class="lnk" href="${esc(i.url)}" target="_blank" rel="noopener">Bayar</a>`:''}</div></div>`).join('');
  openModal(`<h3>Paket &amp; langganan</h3>
  <div class="pln"><div class="plcur"><div><small>Paket saat ini</small><h4>${esc(pl.name)}</h4></div><div class="plsr"><span class="pst ${st[1]}">${esc(st[0])}</span>${exp?`<small>${esc(exp)}</small>`:''}</div></div>
  ${pend?`<p class="hint" style="margin:8px 0 0;color:var(--ad)">Permintaan upgrade ke <b>${esc((j.plans.find(x=>x.code===pend.plan)||{}).name||pend.plan)}</b> sudah dikirim (${esc(plnDate(pend.at))}). Tim Ordela akan menghubungi Anda untuk tagihan.</p>`:''}
  <div class="plu"><h5>Pemakaian</h5>${plnBar('Karyawan',U.staff||0,L.staff)}${plnBar('Outlet',U.outlets||1,L.outlets)}${plnBar('Transaksi hari ini',oc.d,L.daily_orders)}${plnBar('Transaksi bulan ini',oc.m,L.monthly_orders)}${(L.ai_messages_month!=null&&L.ai_messages_month!==0)?plnBar('Pesan AI bulan ini',U.ai||0,L.ai_messages_month):''}</div>
  <div class="plt"><h5>Pilih paket</h5><div class="pliv"><button class="${iv==='monthly'?'on':''}" onclick="P2.planIv='monthly';P2.plan()">Bulanan</button><button class="${iv==='yearly'?'on':''}" onclick="P2.planIv='yearly';P2.plan()">Tahunan</button></div></div>
  <div class="plg">${cards}</div>
  ${inv?`<div class="plu"><h5>Tagihan</h5>${inv}</div>`:''}
  <p class="hint" style="margin:10px 0 0">Setelah Anda mengajukan paket, tim Ordela mengirim tagihan dan mengaktifkannya. Pembayaran otomatis dalam aplikasi belum tersedia.</p></div>
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
};
P2.planReq=async function(code){
  if(!confirm('Ajukan upgrade paket ini? Tim Ordela akan menghubungi Anda untuk tagihan.'))return;
  try{const r=await api('/api/plan/request',{method:'POST',body:JSON.stringify({plan:code,interval:P2.planIv})});const j=await r.json();if(!r.ok)throw new Error(j.error||'gagal');toast('Permintaan dikirim');P2.plan()}catch(e){toast(e.message||'Gagal mengirim permintaan')}
};


/* ================= PENGATURAN INVOICE & PEMBAYARAN ================= */
P2.invSet=function(){
  closeAll();
  const c=invCfg();
  const T=(k,t,d)=>`<label class="tgl"><input type="checkbox" ${c[k]?'checked':''} onchange="P2.invTog('${k}',this.checked)"><span>${t}${d?`<small>${d}</small>`:''}</span></label>`;
  openModal(`<h3>Invoice &amp; pembayaran</h3>
  <h5 class="invh">Kolom utama</h5>
  ${T('cust','Nama pelanggan')}${T('tbl','No. meja')}${T('note','Catatan pesanan')}
  <h5 class="invh">Opsi tambahan (dilipat)</h5>
  ${T('gift','Kartu hadiah')}${T('mem','Member &amp; poin')}${T('tip','Tip')}${T('split','Bagi rata &amp; pisah tagihan')}
  ${T('more','Buka opsi tambahan otomatis')}
  <h5 class="invh">Struk</h5>
  ${T('noteRc','Cetak catatan di struk')}
  <label class="tgl"><input type="checkbox" ${(db.set.prn||{}).auto?'checked':''} onchange="setOpt('prn','auto',this.checked)"><span>Cetak struk otomatis setelah bayar<small>Hanya di perangkat ini</small></span></label>
  <h5 class="invh">Metode bawaan</h5>
  <div class="chips" id="invPm">${PAY_M.map(m=>`<button class="chip ${m===c.pm?'on':''}" onclick="P2.invPm('${m}')">${m}</button>`).join('')}</div>
  <h5 class="invh">Catatan cepat</h5>
  <div class="inv-qn" id="invQn"></div>
  <div style="display:flex;gap:8px"><input class="fi" id="invQnI" maxlength="30" placeholder="Tambah catatan cepat" style="flex:1;min-width:0;margin:0" onkeydown="if(event.key==='Enter'){event.preventDefault();P2.invQnAdd()}"><button class="btn sec" style="width:auto;margin:0" onclick="P2.invQnAdd()">Tambah</button></div>
  <button class="btn" style="margin-top:14px" onclick="closeModal()">Selesai</button>`);
  P2.invQnPaint();
};
P2.invSave=function(c){db.set.inv=c;save()};
P2.invTog=function(k,v){const c=invCfg();c[k]=v?1:0;P2.invSave(c)};
P2.invPm=function(m){const c=invCfg();c.pm=m;P2.invSave(c);document.querySelectorAll('#invPm .chip').forEach(b=>b.classList.toggle('on',b.textContent===m))};
P2.invQnPaint=function(){const e=$('#invQn');if(!e)return;e.innerHTML=invCfg().qn.map((q,i)=>`<span class="chip">${esc(q)}<b onclick="P2.invQnDel(${i})" role="button" aria-label="Hapus">✕</b></span>`).join('')||'<small class="hint">Belum ada.</small>'};
P2.invQnAdd=function(){const i=$('#invQnI'),v=(i.value||'').trim().slice(0,30);if(!v)return;const c=invCfg();if(c.qn.some(x=>x.toLowerCase()===v.toLowerCase())){i.value='';return}if(c.qn.length>=20){toast('Maksimal 20 catatan cepat');return}c.qn=c.qn.concat(v);P2.invSave(c);i.value='';P2.invQnPaint()};
P2.invQnDel=function(i){const c=invCfg();c.qn=c.qn.filter((_,j)=>j!==i);P2.invSave(c);P2.invQnPaint()};


/* ================= PENGATURAN AI CASHIER (db.set.vc) ================= */
P2.vcCfg=function(){const c=Object.assign({on:1,lang:'auto',speak:1,pay:1,confirm:0,always:0,wake:1,wakeWord:'ordela',direct:1,learn:1,ai:1,stt:0,fab:1,chat:1,tts:1,al:[]},(db.set&&db.set.vc)||{});if(!Array.isArray(c.al))c.al=[];return c};
P2.voiceSet=function(){
  closeAll();
  const c=P2.vcCfg(),sup=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
  const T=(k,t,d)=>`<label class="tgl"><input type="checkbox" ${c[k]?'checked':''} onchange="P2.vcTog('${k}',this.checked)"><span>${t}${d?`<small>${d}</small>`:''}</span></label>`;
  const items=(db.items||[]).filter(i=>!i.ns).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  openModal(`<h3>AI Cashier</h3>
  ${sup?'':'<p class="hint" style="margin:0 0 6px">Perangkat ini tidak mendukung suara, kasir memakai kolom ketik.</p>'}
  ${T('on','Aktifkan AI Cashier')}
  <h5 class="invh">Bahasa</h5>
  <div class="chips" id="vcLg">${[['auto','Ikuti bahasa aplikasi'],['id','Indonesia'],['en','English'],['ms','Melayu']].map(([k,n])=>`<button class="chip ${c.lang===k?'on':''}" onclick="P2.vcLang('${k}')">${n}</button>`).join('')}</div>
  <h5 class="invh">Mode suara</h5>
  ${T('fab','Tombol suara melayang','Tahan untuk bicara, lepas untuk selesai')}
  ${T('always','Selalu mendengarkan','Tanpa menekan tombol')}
  ${T('wake','Pakai kata panggil','Mis. “Ordela, tambah dua nasi goreng”')}
  <input class="fi" id="vcWord" maxlength="20" placeholder="Kata panggil" value="${esc(c.wakeWord||'ordela')}" onchange="P2.vcWord(this.value)" style="margin:2px 0 6px">
  ${T('direct','Bayar langsung satu kalimat','Tanpa membuka layar bayar')}
  ${T('chat','Ngobrol dengan AI','Pertanyaan biasa dijawab AI dan dibacakan')}
  <details class="adv"><summary>Perilaku <small>suara balasan, pembayaran suara</small></summary>
  ${T('speak','Suara balasan')}
  ${T('tts','Suara AI (natural)','Lebih manusiawi; cadangan suara HP')}
  <button type="button" class="btn sec" style="margin:4px 0 8px" onclick="P2.vcSpeakTest()">Tes suara balasan</button><p class="hint" id="vcSpkR" style="margin:0 0 6px"></p>
  ${T('pay','Boleh membayar dengan suara')}
  ${T('confirm','Boleh konfirmasi pembayaran dengan suara')}
  </details>
  <details class="adv"><summary>Nama panggilan menu <small>mis. nasgor = Nasi Goreng</small></summary>
  <div class="inv-qn" id="vcAl"></div>
  <input class="fi" id="vcAlA" maxlength="30" placeholder="Ucapan, mis. nasgor" style="margin-bottom:8px">
  <div style="display:flex;gap:8px"><select class="fi" id="vcAlI" style="flex:1;min-width:0;margin:0">${items.map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</select><button class="btn sec" style="width:auto;margin:0" onclick="P2.vcAlAdd()">Tambah</button></div>
  </details>
  <details class="adv"><summary>Pelajaran &amp; AI <small>belajar koreksi, bantuan AI</small></summary>
  ${T('learn','Belajar dari koreksi')}
  ${T('ai','Bantuan AI','Hanya untuk ucapan yang tidak dikenal')}
  ${T('stt','Pengenalan suara AI')}
  <div id="vcLn"></div>
  </details>
  <details class="adv" ontoggle="if(this.open)P2.vcDgPaint()"><summary>Diagnostik mikrofon</summary>
  <div id="vcDg"></div>
  </details>
  <div class="stkb"><button class="btn" onclick="closeModal()">Selesai</button></div>`);
  P2.vcAlPaint();P2.vcLnPaint();P2.vcDgPaint();
};
P2.vcLnPaint=function(){
  const e=$('#vcLn');if(!e||!window.VC||!VC.L)return;const d=VC.L.data(),nm=id=>{const it=(db.items||[]).find(y=>y.id===id);return it?it.name:'(menu dihapus)'};
  const al=Object.keys(d.al),ms=Object.keys(d.miss).sort((a,b)=>d.miss[b].n-d.miss[a].n),vw=Object.keys(d.vw),L={add:'tambah',remove:'hapus',reduce:'kurangi'};
  const opts=(db.items||[]).filter(i=>!i.ns).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('');
  e.innerHTML=`<p class="hint" style="margin:6px 0 2px"><b>Sudah dipelajari</b></p><div class="inv-qn">${al.map(k=>`<span class="chip">“${esc(d.al[k].p)}” → ${esc(nm(d.al[k].id))}<b onclick="P2.vcLnDel('al','${esc(k)}')" role="button" aria-label="Hapus">✕</b></span>`).join('')||'<small class="hint">Belum ada.</small>'}</div>
  ${vw.length?`<p class="hint" style="margin:8px 0 2px"><b>Kata perintah baru</b></p><div class="inv-qn">${vw.map(w=>`<span class="chip">“${esc(w)}” = ${L[d.vw[w]]}<b onclick="P2.vcLnDel('vw','${esc(w)}')" role="button" aria-label="Hapus">✕</b></span>`).join('')}</div>`:''}
  <p class="hint" style="margin:8px 0 2px"><b>Belum dikenal</b> (ucapan yang gagal, ajari di sini)</p>
  ${ms.map(k=>`<div style="display:flex;gap:6px;align-items:center;margin:4px 0"><span style="flex:0 0 auto;max-width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">“${esc(d.miss[k].p)}”${d.miss[k].n>1?` ×${d.miss[k].n}`:''}</span><select class="fi" style="flex:1;min-width:0;margin:0" onchange="P2.vcLnAs('${esc(k)}',this.value)"><option value="">Pilih menu…</option>${opts}</select><b class="chip" onclick="P2.vcLnDel('miss','${esc(k)}')" role="button" aria-label="Abaikan" style="cursor:pointer">✕</b></div>`).join('')||'<small class="hint">Belum ada.</small>'}
  ${(al.length||ms.length||vw.length)?`<button class="btn sec" style="margin-top:10px" onclick="P2.vcLnClear()">Hapus semua pelajaran</button>`:''}`;
};
P2.vcDgPaint=function(){
  const e=$('#vcDg');if(!e||!window.VC||!VC.D)return;const b=VC.D.bg(),l=VC.D.log().slice().reverse().slice(0,10),now=Date.now();
  e.innerHTML=`<p class="hint" style="margin:4px 0">${b.live?'● Mikrofon latar menyala':b.blocked?'○ Izin mikrofon ditolak, ketuk layar sekali':b.wanted?'○ Menyambung ulang…':'○ Tidak aktif (buka halaman Kasir dan nyalakan Selalu mendengarkan)'}${b.fail?` · galat beruntun ${b.fail}`:''}</p>
  <div style="font-size:12.5px;line-height:1.7">${l.map(x=>`<div><span style="color:var(--mu)">${Math.max(0,Math.round((now-x.t)/1000))} dtk lalu</span> · <b>${esc(x.k)}</b>${x.x?' · '+esc(x.x):''}</div>`).join('')||'<small class="hint">Belum ada aktivitas.</small>'}</div>
  <button class="btn sec" style="margin-top:8px" onclick="P2.vcDgPaint()">Segarkan</button>`;
};
P2.vcLnDel=function(t,k){const f={al:'delAlias',vw:'delVerb',miss:'delMiss'}[t];if(f)VC.L[f](k);P2.vcLnPaint()};
P2.vcLnAs=function(k,id){if(id){VC.L.assign(k,id);toast('Diingat');P2.vcLnPaint()}};
P2.vcLnClear=function(){if(!confirm('Hapus semua pelajaran suara di perangkat ini?'))return;VC.L.clear();P2.vcLnPaint()};
P2.vcSave=function(c){db.set.vc=c;save();if(window.VC&&VC.refresh)VC.refresh()};
P2.vcTog=function(k,v){const c=P2.vcCfg();c[k]=v?1:0;P2.vcSave(c)};
P2.vcWord=function(v){const w=String(v||'').trim().toLowerCase().replace(/[^a-z0-9 ]/g,'').slice(0,20)||'ordela';const c=P2.vcCfg();c.wakeWord=w;P2.vcSave(c);const e=$('#vcWord');if(e)e.value=w};
P2.vcLang=function(l){const c=P2.vcCfg();c.lang=l;P2.vcSave(c);document.querySelectorAll('#vcLg .chip').forEach(b=>b.classList.toggle('on',b.getAttribute('onclick')==="P2.vcLang('"+l+"')"))};
P2.vcAlPaint=function(){const e=$('#vcAl');if(!e)return;e.innerHTML=P2.vcCfg().al.map((x,i)=>{const it=(db.items||[]).find(y=>y.id===x.id);return `<span class="chip">“${esc(x.a)}” → ${esc(it?it.name:'(menu dihapus)')}<b onclick="P2.vcAlDel(${i})" role="button" aria-label="Hapus">✕</b></span>`}).join('')||'<small class="hint">Belum ada.</small>'};
P2.vcAlAdd=function(){
  const a=$('#vcAlA'),sel=$('#vcAlI'),v=(a.value||'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,30);
  if(!v){toast('Tulis ucapannya dulu');return}if(!sel||!sel.value){toast('Pilih menu');return}
  const c=P2.vcCfg();if(c.al.length>=60){toast('Maksimal 60 nama panggilan');return}
  c.al=c.al.filter(x=>x.a!==v).concat({a:v,id:sel.value});P2.vcSave(c);a.value='';P2.vcAlPaint()
};
P2.vcAlDel=function(i){const c=P2.vcCfg();c.al=c.al.filter((_,j)=>j!==i);P2.vcSave(c);P2.vcAlPaint()};

/* ================= CABANG ================= */
P2.branch=async function(){
  closeAll();
  try{
    const j=await (await api('/api/branches')).json();if(!j.list)throw 0;
    if(j.locked&&j.list.length<2){upgradeDlg('branch');return}   // paket tidak mencakup multi-outlet dan belum ada cabang
    openModal(`<h3>Cabang</h3><p class="hint" style="margin:0 0 8px">Tiap cabang punya menu, stok, laporan, dan karyawan sendiri. Ketuk untuk berpindah.</p>${j.locked?`<p class="hint" style="margin:0 0 8px;color:var(--ad)"><b>Paket toko pusat belum mencakup multi-outlet.</b> Cabang yang ada tetap bisa dibuka atau dihapus; menambah cabang butuh paket ${esc(j.need||'yang lebih tinggi')}.</p>`:''}
    <div class="brl">${j.list.map(x=>`<div class="brw"><button class="brb ${x.id===j.active?'on':''}" onclick="P2.brSwitch(${x.id})"><b>${esc(x.name)}</b><small>${x.id===j.hq?'Pusat':'Cabang'}${x.id===j.active?' · aktif':''}</small></button>${j.canDel&&x.id!==j.hq?`<button class="brx" aria-label="Hapus cabang" onclick="P2.brDel(${x.id},'${esc(x.name).replace(/'/g,"\\'")}',${x.id===j.active},${j.hq})"><i class="ic solo" data-ic="trash"></i></button>`:''}</div>`).join('')}</div>
    ${j.canAdd?`<label class="fl" for="brN">Tambah cabang baru</label><input class="fi" id="brN" maxlength="60" placeholder="Nama cabang"><button class="btn" onclick="P2.brAdd()">Buat &amp; buka cabang</button>`:''}
    ${j.canAdd&&j.list.length>1?`<div class="two"><button class="btn sec" onclick="P2.brRep('today')">Laporan Gabungan</button><button class="btn sec" onclick="P2.brTr()">Transfer Stok</button></div>`:''}
    <button class="btn sec" onclick="closeModal()">Tutup</button>`);
    P2.brList=j.list;
  }catch(e){toast('Gagal memuat cabang (perlu koneksi)')}
};
async function brApply(j){
  CL.me.store={code:j.code,name:j.name};setMe(CL.me);
  await localOwnerGuard(CL.me);closeModal();
  try{await syncNow()}catch(e){}
  applyBrand();applyAccess();go('pos');toast('Cabang aktif: '+j.name);
}
P2.brSwitch=async function(id){
  try{const r=await api('/api/branches/switch',{method:'POST',body:JSON.stringify({id})});const j=await r.json();if(!r.ok)throw 0;await brApply(j)}catch(e){toast('Gagal berpindah cabang')}
};
P2.brRep=async function(per){
  const now=new Date(),t0=dayStart(now);const from=per==='today'?t0:per==='7d'?t0-6*864e5:new Date(now.getFullYear(),now.getMonth(),1).getTime();
  try{const r=await api('/api/branches/report',{method:'POST',body:JSON.stringify({from:new Date(from).toISOString()})});const j=await r.json();if(!r.ok)throw 0;
    const T=j.rows.reduce((a,x)=>({n:a.n+x.n,t:a.t+x.total,g:a.g+x.gp}),{n:0,t:0,g:0});
    openModal(`<h3>Laporan Gabungan</h3><div class="itabs">${[['today','Hari ini'],['7d','7 hari'],['month','Bulan ini']].map(([k,l])=>`<button class="${k===per?'on':''}" onclick="P2.brRep('${k}')">${l}</button>`).join('')}</div>
    <div class="panel" style="padding:6px 4px">${j.rows.map(x=>`<div class="li" style="cursor:default"><span class="l"><b>${esc(x.name)}${x.hq?' <small>(pusat)</small>':''}</b><small>${x.n} transaksi · est. laba kotor ${money(x.gp)}</small></span><span class="r"><b>${money(x.total)}</b></span></div>`).join('')}
    <div class="li" style="cursor:default;border-top:1px solid var(--ln)"><span class="l"><b>Total semua cabang</b><small>${T.n} transaksi · est. laba kotor ${money(T.g)}</small></span><span class="r"><b>${money(T.t)}</b></span></div></div>
    <p class="hint" style="margin:8px 2px">Laba kotor = penjualan − modal barang. Data tiap cabang sesuai yang sudah tersinkron ke server.</p>
    <button class="btn sec" onclick="P2.branch()">Kembali</button>`);
  }catch(e){toast('Gagal memuat laporan (perlu koneksi)')}
};
P2.brTr=function(){
  const o=(P2.brList||[]).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  openModal(`<h3>Transfer Stok</h3><p class="hint" style="margin:0 0 8px">Pindahkan stok satu item antar cabang. Item harus sudah ada di kedua cabang (cocok lewat barcode atau nama yang sama).</p>
  <div class="two"><div><label class="fl">Dari</label><select class="fi" id="trF">${o}</select></div><div><label class="fl">Ke</label><select class="fi" id="trT">${o}</select></div></div>
  <label class="fl">Nama item atau barcode</label><input class="fi" id="trN" placeholder="Mis. Kopi Susu / 8999..." autocomplete="off">
  <label class="fl">Jumlah</label><input class="fi" id="trQ" type="number" min="0" step="any" inputmode="decimal">
  <button class="btn" onclick="P2.brTrGo()">Transfer</button><button class="btn sec" onclick="P2.branch()">Kembali</button>`);
  const l=P2.brList||[];if(l[1])$('#trT').value=l[1].id;
};
P2.brTrGo=async function(){
  const f=+$('#trF').value,t=+$('#trT').value,n=$('#trN').value.trim(),q=+$('#trQ').value;
  if(f===t){toast('Pilih dua cabang yang berbeda');return}if(!n||!(q>0)){toast('Isi item dan jumlah');return}
  const body={from:f,to:t,qty:q};if(/^\d{6,}$/.test(n))body.bc=n;else body.name=n;
  try{const r=await api('/api/branches/transfer',{method:'POST',body:JSON.stringify(body)});const j=await r.json();
    if(!r.ok){toast(j.error||'Transfer gagal');return}
    toast('Transfer '+j.name+' ×'+j.qty+' berhasil');closeModal();try{await syncNow()}catch(e){}
  }catch(e){toast('Transfer gagal (perlu koneksi)')}
};
P2.brDel=async function(id,name,isActive,hq){
  if(!confirm('Hapus cabang "'+name+'"?\n\nSemua data cabang ini (menu, stok, transaksi, karyawan, pesanan) akan dihapus permanen dan tidak bisa dikembalikan.'))return;
  const pw=prompt('Masukkan kata sandi Anda untuk menghapus cabang "'+name+'"');if(!pw)return;
  try{const r=await api('/api/branches/delete',{method:'POST',body:JSON.stringify({id,password:pw})});const j=await r.json();
    if(!r.ok){toast(j.error||'Gagal menghapus cabang');return}
    toast('Cabang dihapus');
    if(isActive){const l=await (await api('/api/branches')).json();const h=l.list.find(x=>x.id===hq)||l.list[0];await brApply(h)}else P2.branch()
  }catch(e){toast('Gagal menghapus cabang')}
};
P2.brAdd=async function(){
  const n=($('#brN').value||'').trim();if(n.length<2){toast('Isi nama cabang');return}
  try{const r=await api('/api/branches',{method:'POST',body:JSON.stringify({name:n})});const j=await r.json();if(!r.ok)throw j;await brApply(j)}catch(e){toast((e&&e.error)||'Gagal membuat cabang')}
};

/* ================= PISAH TAGIHAN PER ITEM ================= */
const SP={sel:{}};
P2.splitForm=function(){
  SP.sel={};for(const k in S.cart)SP.sel[k]=S.cart[k];
  const rows=Object.keys(S.cart).filter(k=>find(bid(k))).map(k=>{const i=find(bid(k)),sx=lineSfx(k);
    return`<div class="chg"><span>${esc(i.name)}${sx?' <small>('+esc(sx)+')</small>':''}<br><small>${money(linePrice(k))} · ada ${S.cart[k]}</small></span><span class="qs"><button type="button" onclick="P2.spQ('${k.replace(/'/g,"\\'")}',-1)">−</button><b id="sp_${btoa(unescape(encodeURIComponent(k))).replace(/=/g,'')}">${S.cart[k]}</b><button type="button" onclick="P2.spQ('${k.replace(/'/g,"\\'")}',1)">+</button></span></div>`}).join('');
  openModal(`<h3>Pisah Tagihan</h3><p class="hint" style="margin:0 0 8px">Atur jumlah item yang dibayar sekarang. Sisanya tetap di keranjang untuk dibayar berikutnya.</p>${rows}<div class="chg"><span><b>Dibayar sekarang</b></span><b id="spT">${money(spTotal())}</b></div>
  <button class="btn" onclick="P2.spGo()">Bayar yang dipilih</button><button class="btn sec" onclick="payForm()">Kembali</button>`);
};
function spTotal(){let t=0;for(const k in SP.sel)t+=linePrice(k)*SP.sel[k];return rnd(t)}
P2.spQ=function(k,d){
  const n=Math.max(0,Math.min(S.cart[k],(SP.sel[k]||0)+d));SP.sel[k]=n;
  const e=document.getElementById('sp_'+btoa(unescape(encodeURIComponent(k))).replace(/=/g,''));if(e)e.textContent=n;$('#spT').textContent=money(spTotal());
};
P2.spGo=function(){
  const pay={},payM={},rest={},restM={};
  for(const k in S.cart){const a=SP.sel[k]||0,b=S.cart[k]-a;
    if(a>0){pay[k]=a;if(S.cm[k])payM[k]=S.cm[k]}
    if(b>0){rest[k]=b;if(S.cm[k])restM[k]=JSON.parse(JSON.stringify(S.cm[k]))}}
  if(!Object.keys(pay).length){toast('Pilih minimal satu item');return}
  if(Object.keys(rest).length){if(S.rest){for(const k in rest){S.rest.cart[k]=(S.rest.cart[k]||0)+rest[k];if(restM[k]&&!S.rest.cm[k])S.rest.cm[k]=restM[k]}}else S.rest={cart:rest,cm:restM,meta:S.holdMeta||null}}
  S.cart=pay;S.cm=payM;renderInvoice();renderGrid();payForm();
};
window.addEventListener('load',()=>{const cm0=window.closeModal;window.closeModal=function(){
  if(S.rest){for(const k in S.rest.cart){S.cart[k]=(S.cart[k]||0)+S.rest.cart[k];if(S.rest.cm[k]&&!S.cm[k])S.cm[k]=S.rest.cm[k]}S.rest=null;try{renderGrid();renderInvoice();renderCats()}catch(e){}toast('Pisah tagihan dibatalkan')}
  return cm0.apply(this,arguments)}});


/* ================= SCANNER BARCODE (kamera / alat) ================= */
let H5=null;
function loadH5(){return H5||(H5=new Promise((res,rej)=>{if(window.Html5Qrcode)return res();const sc=document.createElement('script');sc.src='html5-qrcode.min.js';sc.onload=()=>res();sc.onerror=()=>{H5=null;rej()};document.head.appendChild(sc)}))}
P2.scan=async function(onCode,o){
  o=o||{};let stop=()=>{},on=true,last='',lastT=0;
  const done=c=>{const now=Date.now();if(c===last&&now-lastT<1800)return;last=c;lastT=now;const r=onCode(c);if(o.once||(o.keep&&r))stop()};
  openModal('<h3>Scan Barcode</h3><div id="scBox"></div><p class="hint" style="margin:8px 0">Arahkan kamera ke barcode. Alat scanner (USB/Bluetooth) cukup dipakai di kolom cari.</p><button class="btn sec" id="scX">Tutup</button>');
  stop=()=>{if(!on)return;on=false;try{if(window.__scQ){const q=window.__scQ;window.__scQ=null;q.stop().then(()=>q.clear()).catch(()=>{})}}catch(e){}closeModal()};
  $('#scX').onclick=stop;
  try{await loadH5();
    const q=new Html5Qrcode('scBox',{verbose:false,useBarCodeDetectorIfSupported:true});window.__scQ=q;
    await q.start({facingMode:'environment'},{fps:10,qrbox:(w,h)=>({width:Math.floor(Math.min(w,320)*.9),height:Math.floor(Math.min(h,240)*.6)})},t=>{if(on)done(String(t).trim())},()=>{});
  }catch(e){stop();toast('Kamera tidak bisa dibuka. Izinkan akses kamera, atau pakai alat scanner / ketik kodenya.')}
};

/* ================= STOK OPNAME (halaman sendiri) ================= */
const OPN={q:'',cnt:{},only:'all',hl:''};
P2.opnReset=function(){OPN.cnt={};OPN.hl='';const el=$('#v-opname');if(el)el.dataset.built='';if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();if(S.view==='opname')V.opname()};
const opItems=()=>db.items.filter(i=>!isB(i));
V.opname=function(){
  const el=$('#v-opname');if(!el)return;if(el.dataset.built&&document.activeElement&&el.contains(document.activeElement)&&document.activeElement.tagName==='INPUT'&&document.activeElement.id!=='opQ')return;
  const q=OPN.q.trim().toLowerCase(),emp=isStaffMode();
  let l=opItems().filter(i=>!q||i.name.toLowerCase().includes(q)||String(i.bc||'').includes(q)||(i.cat||'').toLowerCase().includes(q));
  const cnt=id=>OPN.cnt[id],has=id=>cnt(id)!==undefined&&cnt(id)!=='';
  const n=opItems().filter(i=>has(i.id)).length,dif=opItems().filter(i=>has(i.id)&&+cnt(i.id)!==+i.stock).length;
  if(OPN.only==='todo')l=l.filter(i=>!has(i.id));else if(OPN.only==='diff')l=l.filter(i=>has(i.id)&&+cnt(i.id)!==+i.stock);
  const row=i=>{const c=cnt(i.id),d=has(i.id)?Math.round((+c-i.stock)*1000)/1000:null;
    return`<div class="opr ${OPN.hl===i.id?'hl':''}" id="opr_${i.id}"><div class="th" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:var(--bg2);flex:none">${thumb(i)}</div><div class="on"><b>${esc(i.name)}${i.ns?' <small>· Bahan</small>':''}</b><small>Sistem: ${i.stock}${i.bc?' · '+esc(i.bc):''}</small></div>
    <input type="number" inputmode="decimal" step="any" min="0" placeholder="Fisik" value="${has(i.id)?c:''}" data-id="${i.id}" oninput="P2.opSet('${i.id}',this.value)"><span class="df ${d>0?'gu':d<0?'gd':''}" id="opd_${i.id}">${d===null?'':d===0?'✓':(d>0?'+':'')+d}</span></div>`};
  const first=!el.dataset.built;
  el.innerHTML=`<div class="bar"><h2><i class="ic" data-ic="check"></i>Stok Opname</h2></div>
  <p class="hint" style="margin:-4px 2px 10px">Hitung stok fisik dengan scan barcode, ketik manual, atau lewat Excel. Selisih ditinjau dulu sebelum stok berubah.</p>
  <div class="bar"><input class="fi pill" id="opQ" placeholder="Cari atau scan barcode" value="${esc(OPN.q)}" oninput="OPN_q(this.value)" onkeydown="if(event.key==='Enter')P2.opEnter(this)" autocomplete="off" style="flex:1;min-width:160px"><button class="btn sm" onclick="P2.opScan()"><i class="ic" data-ic="camera"></i>Scan</button></div>
  <div class="opact"><button class="btn sec" onclick="opnOpen()"><i class="ic" data-ic="download"></i>Excel</button><button class="btn" id="opGo" onclick="P2.opReview()" ${n?'':'disabled'}>Tinjau &amp; Terapkan (${n})</button></div>
  <div class="itabs"><button class="${OPN.only==='all'?'on':''}" onclick="P2.opF('all')">Semua <b>${opItems().length}</b></button><button class="${OPN.only==='todo'?'on':''}" onclick="P2.opF('todo')">Belum dihitung <b>${opItems().length-n}</b></button><button class="${OPN.only==='diff'?'on':''}" onclick="P2.opF('diff')">Selisih <b>${dif}</b></button></div>
  <div id="opList">${l.map(row).join('')||'<div class="empty" style="padding:24px 0">Tidak ada item.</div>'}</div>
`;
  el.dataset.built='1';
  if(first||!document.activeElement||document.activeElement===document.body){}
};
window.OPN_q=function(v){OPN.q=v;clearTimeout(OPN.t);OPN.t=setTimeout(()=>{const el=$('#v-opname');const f=document.activeElement;const pos=f&&f.selectionStart;V.opname();const q=$('#opQ');if(q&&f&&f.id==='opQ'){q.focus();try{q.setSelectionRange(pos,pos)}catch(e){}}},150)};
P2.opF=function(f){OPN.only=f;V.opname()};
P2.opSet=function(id,v){
  OPN.cnt[id]=v;const i=find(id),d=v===''?null:Math.round((+v-i.stock)*1000)/1000,e=document.getElementById('opd_'+id);
  if(e){e.textContent=d===null?'':d===0?'✓':(d>0?'+':'')+d;e.className='df '+(d>0?'gu':d<0?'gd':'')}
  const n=opItems().filter(x=>OPN.cnt[x.id]!==undefined&&OPN.cnt[x.id]!=='').length,g=$('#opGo');if(g){g.disabled=!n;g.innerHTML='Tinjau &amp; Terapkan ('+n+')'}
};
function opFocus(it){
  OPN.q='';OPN.only='all';OPN.hl=it.id;V.opname();
  const r=document.getElementById('opr_'+it.id);if(r){r.scrollIntoView({block:'center'});const inp=r.querySelector('input');if(inp){inp.focus();inp.select()}}
  toast(it.name+' · stok sistem '+it.stock);
}
P2.opEnter=function(el){
  const v=el.value.trim();if(!v)return;
  const it=opItems().find(i=>String(i.bc||'')===v)||opItems().find(i=>i.name.toLowerCase()===v.toLowerCase());
  if(it){opFocus(it)}else toast('Barcode/nama tidak ditemukan di inventori');
};
P2.opScan=function(){
  P2.scan(code=>{const it=opItems().find(i=>String(i.bc||'')===code);if(!it){toast('Barcode '+code+' belum terdaftar');return false}
    closeModal();setTimeout(()=>opFocus(it),50);return true},{keep:true});
};
P2.opReview=function(){
  OP.rows=[];OP.miss=[];OP.bad=[];OP.skip=0;OP.name='Hitung langsung';
  for(const i of opItems()){const c=OPN.cnt[i.id];if(c===undefined||c==='')continue;const n=parseFloat(String(c).replace(',','.'));
    if(!isFinite(n)||n<0){OP.bad.push(i.name+' ('+c+')');continue}const fis=Math.round(n*1000)/1000;OP.rows.push({id:i.id,name:i.name,fis,note:'',on:fis!==i.stock})}
  opnReview();
};


/* ================= KARTU HADIAH ================= */
const gcode=()=>{const c='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let r='GC-';for(let i=0;i<6;i++)r+=c[Math.floor(Math.random()*c.length)];return r};
P2.giftUse=function(){
  const code=($('#pGift').value||'').trim().toUpperCase(),e=$('#pGiftR');if(!code)return;
  const g=live(db.gifts).find(x=>String(x.code).toUpperCase()===code);
  if(!g){e.textContent='Kartu tidak ditemukan';return}
  if(!(+g.bal>0)){e.textContent='Saldo kartu habis';return}
  S.pay.gift=g.id;const pp=$('#pPaid');if(pp&&S.pay.m==='Tunai')pp.value=payTotals().payable;
  e.innerHTML='Saldo '+money(g.bal)+' · <a href="#" onclick="P2.giftClear();return false">lepas</a>';payRefresh();
};
P2.giftClear=function(){S.pay.gift=null;$('#pGiftR').textContent='';$('#pGift').value='';const pp=$('#pPaid');if(pp&&S.pay.m==='Tunai')pp.value=payTotals().payable;payRefresh()};
V.gift=function(){
  const el=$('#v-gift');if(!el)return;const l=live(db.gifts).sort((a,b)=>b.t<a.t?-1:1);const tot=l.reduce((a,g)=>a+(+g.bal||0),0);
  el.innerHTML=bar('<i class="ic" data-ic="gift"></i>Kartu Hadiah','<button class="btn sm" style="width:auto;margin:0" onclick="P2.giftForm()">+ Jual Kartu</button>')
  +`<div class="kp">${kc('Kartu aktif',l.filter(g=>g.bal>0).length)}${kc('Saldo belum terpakai',money(tot))}</div>
  <div class="panel"><h3>Daftar Kartu</h3>${l.length?l.map(g=>`<button class="li" onclick="P2.giftDetail('${g.id}')"><span class="l"><b>${esc(g.code)}</b><small>${esc(g.name||'Tanpa nama')} · ${esc(dstr(g.t))}</small></span><span class="r"><b>${money(g.bal)}</b><small>dari ${money(g.init)}</small></span></button>`).join(''):'<div class="mt">Belum ada kartu hadiah.</div>'}</div>`;
};
P2.giftForm=function(){
  openModal(`<h3>Jual Kartu Hadiah</h3><label class="fl">Kode kartu</label><input class="fi" id="gcC" value="${gcode()}" maxlength="20" autocapitalize="characters"><label class="fl">Nominal</label><input class="fi" id="gcA" type="number" min="0" step="any" inputmode="decimal"><label class="fl">Nama pemilik (opsional)</label><input class="fi" id="gcN" maxlength="40">
  <p class="hint" style="margin:6px 0">Uang diterima tunai: bila shift berjalan, otomatis dicatat sebagai kas masuk. Penjualan kartu bukan pendapatan; pendapatan dihitung saat kartu dipakai belanja.</p>
  <button class="btn" onclick="P2.giftSave()">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
P2.giftSave=function(){
  const c=($('#gcC').value||'').trim().toUpperCase(),a=num($('#gcA').value);if(!c||!a){toast('Isi kode dan nominal');return}
  if(live(db.gifts).some(g=>String(g.code).toUpperCase()===c)){toast('Kode sudah dipakai');return}
  const now=nowIso(),cur=shiftCur();
  db.gifts.unshift({id:'g'+uid(),code:c,name:($('#gcN').value||'').trim(),init:a,bal:a,t:now,by:myName(),hist:[{t:now,d:a,note:'Penjualan kartu'}],u:Date.now()});
  if(cur)db.exps.unshift({id:'e'+uid(),t:now,by:myName(),cat:'Kas masuk',amt:a,note:'Jual kartu hadiah '+c,src:'kas',dir:'in',sh:cur.id,u:Date.now()});
  save();closeModal();toast('Kartu hadiah dibuat');V.gift();
};
P2.giftDetail=function(id){
  const g=db.gifts.find(x=>x.id===id);if(!g)return;
  openModal(`<h3>${esc(g.code)}</h3><p class="hint" style="margin:0 0 6px">${esc(g.name||'Tanpa nama')} · saldo <b>${money(g.bal)}</b></p><table class="dl">${(g.hist||[]).map(h=>`<tr><td>${esc(dstr(h.t))}<br><small>${esc(h.note)}</small></td><td class="${h.d<0?'neg':'pos'}">${h.d<0?'−':'+'}${money(Math.abs(h.d))}</td></tr>`).join('')}</table>
  <label class="fl">Isi ulang saldo</label><input class="fi" id="gcT" type="number" min="0" step="any" inputmode="decimal" placeholder="Nominal"><button class="btn" onclick="P2.giftTop('${id}')">Isi Ulang</button>
  ${isOwner()?`<button class="btn sec" style="color:var(--bad)" onclick="P2.giftDel('${id}')">Hapus kartu</button>`:''}<button class="btn sec" onclick="closeModal()">Tutup</button>`);
};
P2.giftTop=function(id){const g=db.gifts.find(x=>x.id===id),a=num($('#gcT').value);if(!g||!a)return;const now=nowIso(),cur=shiftCur();
  g.bal=rnd((+g.bal||0)+a);g.init=rnd((+g.init||0)+a);g.hist.unshift({t:now,d:a,note:'Isi ulang'});g.u=Date.now();
  if(cur)db.exps.unshift({id:'e'+uid(),t:now,by:myName(),cat:'Kas masuk',amt:a,note:'Isi ulang kartu '+g.code,src:'kas',dir:'in',sh:cur.id,u:Date.now()});
  save();closeModal();V.gift();toast('Saldo ditambah')};
P2.giftDel=function(id){const g=db.gifts.find(x=>x.id===id);if(!g||!confirm('Hapus kartu '+g.code+'? Sisa saldo hilang.'))return;g.del=1;g.u=Date.now();save();closeModal();V.gift()};

/* ================= RESERVASI MEJA ================= */
const RS={};
const rsAct=()=>live(db.rsv).filter(r=>r.st==='res');
P2.rsvFor=function(k){const now=Date.now();return rsAct().filter(r=>tkey(r.tbl)===tkey(k)&&new Date(r.t).getTime()<now+3*36e5&&new Date(r.t).getTime()>now-45*6e4)};
V.rsv=function(){
  const el=$('#v-rsv');if(!el)return;const l=rsAct().sort((a,b)=>a.t<b.t?-1:1),past=live(db.rsv).filter(r=>r.st!=='res').sort((a,b)=>b.t<a.t?-1:1).slice(0,8);
  const tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':');
  const dy=t=>{const d=new Date(t),n=new Date();return d.toDateString()===n.toDateString()?'Hari ini':d.toLocaleDateString(dloc(),{weekday:'short',day:'numeric',month:'short'})};
  const row=r=>`<div class="rsr"><span class="tm">${tm(r.t)}</span><span class="in"><b>${esc(r.name)}</b> · Meja ${esc(r.tbl||'-')}<small>${esc(dy(r.t))} · ${r.pax||1} orang${r.phone?' · '+esc(r.phone):''}${r.note?' · '+esc(r.note):''}</small></span>${r.st==='res'?`<span class="ac"><button class="go" onclick="P2.rsvSet('${r.id}','seated')">Datang</button><button onclick="P2.rsvSet('${r.id}','cancel')">Batal</button></span>`:`<small>${r.st==='seated'?'datang':'batal'}</small>`}</div>`;
  el.innerHTML=bar('<i class="ic" data-ic="cal"></i>Reservasi Meja','<button class="btn sm" style="width:auto;margin:0" onclick="P2.rsvForm()">+ Reservasi</button>')+(l.length?l.map(row).join(''):'<div class="panel"><div class="mt">Belum ada reservasi aktif.</div></div>')+(past.length?'<div class="mgh" style="margin:14px 2px 8px">Riwayat terakhir</div>'+past.map(row).join(''):'');
};
P2.rsvForm=function(){
  const d=new Date(Date.now()+36e5);const pad=n=>String(n).padStart(2,'0');const v=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':00';
  openModal(`<h3>Reservasi Meja</h3><label class="fl">Nama</label><input class="fi" id="rvN" maxlength="40"><div class="two"><div><label class="fl">No. meja</label><input class="fi" id="rvT" maxlength="12" inputmode="text" autocapitalize="characters"></div><div><label class="fl">Jumlah orang</label><input class="fi" id="rvP" type="number" min="1" value="2"></div></div>
  <label class="fl">Waktu</label><input class="fi" id="rvW" type="datetime-local" value="${v}"><label class="fl">No. HP (opsional)</label><input class="fi" id="rvH" inputmode="tel" maxlength="20"><label class="fl">Catatan (opsional)</label><input class="fi" id="rvC" maxlength="80">
  <button class="btn" onclick="P2.rsvSave()">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
};
P2.rsvSave=function(){
  const n=($('#rvN').value||'').trim(),t=($('#rvT').value||'').trim().slice(0,12),w=$('#rvW').value;if(!n||!t||!w){toast('Isi nama, meja, dan waktu');return}
  const at=new Date(w);if(isNaN(at)){toast('Waktu tidak valid');return}
  if(rsAct().some(r=>tkey(r.tbl)===tkey(t)&&Math.abs(new Date(r.t)-at)<2*36e5)){if(!confirm('Meja '+t+' sudah dipesan dalam rentang 2 jam. Tetap simpan?'))return}
  db.rsv.unshift({id:'v'+uid(),name:n,tbl:t,pax:Math.max(1,+$('#rvP').value||1),t:at.toISOString(),phone:$('#rvH').value.trim(),note:$('#rvC').value.trim(),st:'res',by:myName(),u:Date.now()});
  save();closeModal();toast('Reservasi disimpan');V.rsv();
};
P2.rsvSet=function(id,st){const r=db.rsv.find(x=>x.id===id);if(!r)return;r.st=st;r.u=Date.now();save();V.rsv();if(S.view==='table')renderTable()};
const tkey=t=>String(t==null?'':t).trim().toUpperCase();

/* ================= LAYAR PELANGGAN (layar kedua) ================= */
const CDCH=('BroadcastChannel' in window)?new BroadcastChannel('ordela-cd'):null;
P2.cdPush=function(){
  if(!CDCH||window.__isCD)return;
  try{const lines=Object.keys(S.cart).filter(k=>find(bid(k))).map(k=>{const i=find(bid(k)),sx=lineSfx(k);return{n:i.name+(sx?' ('+sx+')':''),q:S.cart[k],p:linePrice(k)*S.cart[k],e:i.emoji||''}});
    const c=calc();CDCH.postMessage({lines,sub:c.sub,disc:c.disc,tax:c.tax,total:c.total,store:db.set.store||'Ordela',cur:{cur:db.set.cur,dec:db.set.dec,loc:db.set.loc,pos:db.set.curPos},qris:(db.set.pay&&db.set.pay.on&&db.set.pay.qris)||''})}catch(e){}
};
P2.cdOpen=function(){const w=window.open(location.pathname+'#cd','ordela-cd','width=900,height=700');if(!w)toast('Izinkan pop-up untuk membuka layar pelanggan');else setTimeout(P2.cdPush,800)};
if(location.hash==='#cd'){
  window.__isCD=true;
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.innerHTML='<div id="cdv" style="min-height:100vh;display:flex;flex-direction:column;font-family:Plus Jakarta Sans,system-ui,sans-serif;background:#111;color:#fff;padding:28px"><h1 id="cdS" style="margin:0 0 18px;font-size:28px">Ordela</h1><div id="cdL" style="flex:1"></div><div id="cdT" style="border-top:2px solid #444;padding-top:16px"></div></div>';
    const fm=(v,c)=>{const d=+c.dec||0,n=(+v||0).toLocaleString(c.loc||'id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});return c.pos==='after'?n+' '+(c.cur||''):(c.cur||'Rp')+' '+n};
    const draw=m=>{const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
      document.getElementById('cdS').textContent=m.store;
      document.getElementById('cdL').innerHTML=m.lines.length?m.lines.map(l=>`<div style="display:flex;gap:14px;font-size:24px;padding:8px 0;border-bottom:1px solid #2a2a2a"><span>${e(l.e)}</span><span style="flex:1">${l.q}× ${e(l.n)}</span><b>${fm(l.p,m.cur)}</b></div>`).join(''):'<p style="font-size:28px;opacity:.6;margin-top:40px">Selamat datang! Silakan pilih menu.</p>';
      document.getElementById('cdT').innerHTML=m.lines.length?`${m.disc?`<div style="display:flex;justify-content:space-between;font-size:20px;opacity:.8"><span>Diskon</span><span>−${fm(m.disc,m.cur)}</span></div>`:''}${m.tax?`<div style="display:flex;justify-content:space-between;font-size:20px;opacity:.8"><span>Pajak</span><span>${fm(m.tax,m.cur)}</span></div>`:''}<div style="display:flex;justify-content:space-between;font-size:40px;font-weight:800;margin-top:8px"><span>Total</span><span>${fm(m.total,m.cur)}</span></div>`:''};
    draw({store:'Ordela',lines:[],cur:{}});
    if(CDCH)CDCH.onmessage=ev=>draw(ev.data);
    document.title='Layar Pelanggan';
  });
}

/* ================= MENU UTAMA ================= */
V.menu=function(){
  const el=$('#v-menu');if(!el)return;
  const h=new Date().getHours(),g=h>=4&&h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam';
  const nm=(CL.on&&CL.me&&CL.me.name)||'Owner';
  const G=[['Operasional',[['pos','Kasir','receipt','#ef4444'],['table','Meja','grid','#f59e0b'],['riw','Riwayat Pesanan','list','#8b5cf6'],['ai','Asisten','bolt','#7c3aed'],['co','Pesanan Online','cart','#0ea5e9'],['kds','Layar Dapur','cook','#f97316'],['rsv','Reservasi','cal','#0ea5e9'],['gift','Kartu Hadiah','gift','#f43f5e'],['cd','Layar Pelanggan','dash','#0891b2'],['shift','Shift Kasir','clock','#8b5cf6'],['alert','Notifikasi','bell','#ec4899']]],
   ['Penjualan & Pelanggan',[['home','Beranda & Laporan','dash','#10b981'],['mem','Member','users','#14b8a6'],['promo','Promo','bolt','#eab308'],['exp','Pengeluaran','card','#64748b']]],
   ['Produk & Stok',[['inv','Inventori','box','#3b82f6'],['opname','Stok Opname','check','#0d9488'],['buy','Pembelian','download','#6366f1']]],
   ['Tim & Toko',[['att','Absensi','clock','#06b6d4'],['usr','Pengguna','users','#a855f7'],['pyr','Payroll','card','#22c55e'],['branch','Cabang','bank','#d946ef'],['integ','Integrasi','plug','#0ea5e9'],['prn','Printer','print','#475569'],['set','Pengaturan','sliders','#6b7280'],['acc','Akun Saya','key','#111827']]]];
  const nb=(typeof CO!=='undefined'&&CO.list)?CO.list.filter(o=>o.status==='new').length:0;
  const tile=([v,t,ic,c])=>{const act=v==='branch'?'P2.branch()':v==='cd'?'P2.cdOpen()':`go('${v}')`;
    return`<button class="mgi" onclick="${act}"><span class="mic" style="--g:${c};--g1:color-mix(in srgb,${c} 70%,#fff)"><i class="ic" data-ic="${ic}"></i>${v==='co'&&nb?`<b class="mb">${nb}</b>`:''}</span><span class="t">${esc(t)}</span></button>`};
  const secs=G.map(([t,l])=>{const x=l.filter(([v])=>v==='acc'||canView(v));return x.length?`<div class="mgc"><div class="mgh">${t}</div><div class="mgrid">${x.map(tile).join('')}</div></div>`:''}).join('');
  let st='';
  if(canView('home')){const t0=dayStart(Date.now()),os=(db.orders||[]).filter(o=>new Date(o.t).getTime()>=t0);
    st=`<div class="mst"><div><b>${money(os.reduce((a,o)=>a+(+o.total||0),0))}</b><span>Penjualan hari ini</span></div><div><b>${os.length}</b><span>Transaksi</span></div></div>`}
  el.innerHTML=`<div class="mhero"><small>${g},</small><h2>${esc(nm)}</h2><p>${esc(db.set.store||'Ordela')} · ${new Date().toLocaleDateString(dloc(),{weekday:'long',day:'numeric',month:'long'})}</p>${st}</div>${secs}`;
};
P2.t={get shiftStats(){return shiftStats},get debtOf(){return debtOf},get BP(){return BP}};
window.kdsSet=async function(src,id,st){
  if(src==='loc'){const k=db.kds.find(x=>x.id===id);if(k){k.st=st;k.u=Date.now();save()}V.kds();return}
  try{const r=await api('/api/co/'+id,{method:'POST',body:JSON.stringify({action:st===1?'cook':st===2?'ready':'unready'})});if(!r.ok)throw 0;
    const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}if(S.view==='kds')V.kds()}catch(e){toast('Gagal mengubah status')}
};
setInterval(()=>{if(!document.hidden&&S.view==='kds')V.kds()},20000);
})();

P2.vcSpeakTest=async function(){const e=document.getElementById('vcSpkR');if(e){e.textContent='Menguji…';e.style.color=''}const r=window.VC&&VC.speakTest?await VC.speakTest():{ok:false,msg:'Fitur suara belum siap.'};const e2=document.getElementById('vcSpkR');if(e2){e2.textContent=r.msg;e2.style.color=r.ok?'':'#b45309'}};

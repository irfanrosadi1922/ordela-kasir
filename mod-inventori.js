/* Ordela — modul inventori: item, paket, stok opname, pangkas gambar, urutan menu.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
/* ---------- item paket / set: stok paket dihitung otomatis dari stok isinya ---------- */
function isB(i){return !!i&&Array.isArray(i.bundle)&&i.bundle.length>0}
function bdStock(i,by){let m=Infinity;for(const c of i.bundle){const x=by[c.id];if(!x||isB(x)||!(c.q>0))return 0;m=Math.min(m,Math.floor((+x.stock||0)/c.q+1e-9))}return m===Infinity?0:Math.max(0,m)}
function syncBundles(d){if(!d||!Array.isArray(d.items))return;const by={};d.items.forEach(i=>{by[i.id]=i});d.items.forEach(i=>{if(isB(i)){const v=bdStock(i,by);if(i.stock!==v)i.stock=v}})}
const bdLbl=b=>(b||[]).map(c=>{const x=find(c.id);return c.q+'× '+(c.name||(x?x.name:'?'))}).join(' + ');
/* baris keranjang: kunci = id menu, atau id@pilihan bila menu punya varian/tambahan */
const bid=k=>String(k).split('@')[0];
const hasMods=i=>!!i&&Array.isArray(i.mods)&&i.mods.length>0;
function modKey(id,sel){return sel&&sel.length?id+'@'+sel.map(x=>x.g+':'+x.n).join('|'):id}
function linePrice(k){const i=find(bid(k));if(!i)return 0;const m=S.cm[k];return i.price+(m?m.sel.reduce((a,x)=>a+(+x.p||0),0):0)}
function lineSfx(k){const m=S.cm[k];return m&&m.sel.length?m.sel.map(x=>x.n).join(', '):''}
function cartQtyOf(id){let n=0;for(const k in S.cart)if(bid(k)===id)n+=S.cart[k];return n}
function cartUse(skip){const u={};for(const id0 in S.cart){if(id0===skip)continue;const id=bid(id0);const i=find(id);if(!i)continue;const q=S.cart[id0];if(isB(i))i.bundle.forEach(c=>{u[c.id]=(u[c.id]||0)+c.q*q});else u[id]=(u[id]||0)+q}for(const k in u)u[k]=Math.round(u[k]*1000)/1000;return u}
function maxQty(i,sk){const u=cartUse(sk===undefined?i.id:sk);if(isB(i)){let m=Infinity;for(const c of i.bundle){const x=find(c.id);if(!x||isB(x)||!(c.q>0))return 0;m=Math.min(m,Math.floor(((+x.stock||0)-(u[c.id]||0))/c.q+1e-9))}return Math.max(0,m===Infinity?0:m)}return Math.max(0,Math.round((i.stock-(u[i.id]||0))*1000)/1000)}
function bdUsedBy(id,skip){return db.items.find(x=>isB(x)&&!(skip&&skip.has(x.id))&&x.bundle.some(c=>c.id===id))}
const thumb=i=>i.img?`<img src="${imgSrc(i.img)}" alt="">`:emo(i);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2200)}
function applyBrand(){
  const s=db.set,b=$('#brand');if(!b)return;
  b.innerHTML=(s.logo&&s.logoApp!==false&&imgSrc(s.logo)?'<img class="blogo" alt="" src="'+imgSrc(s.logo)+'">':'<i class="ic solo" data-ic="food"></i>')+'<span>'+esc(s.store)+'</span>';
  if(typeof applyLang==='function'&&lang()!=='id'){}
  if(typeof railBrand==='function')railBrand();
}
function tick(){const d=new Date();$('#dt').textContent=d.toLocaleDateString(dloc(),{weekday:'short',day:'2-digit',month:'short',year:'numeric'});$('#tm').textContent=d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')}
/* ---------- inventory ---------- */
function status(i){return i.stock<=0?['out','Habis']:i.stock<=i.min?['low','Menipis']:['ok','Aman']}
const isStaffMode=()=>CL.on&&!isOwner();
function renderInv(){
  const it=db.items,emp=isStaffMode(),val=it.reduce((a,i)=>a+(isB(i)?0:i.stock*(i.cost||0)),0);
  document.querySelectorAll('#v-inv .own-only').forEach(b=>b.hidden=emp);
  $('#invStats').innerHTML=[['Total Item',it.length],...(emp?[]:[['Nilai Stok (modal)',money(val)]]),['Stok Menipis',it.filter(i=>i.stock>0&&i.stock<=i.min).length],['Habis',it.filter(i=>i.stock<=0).length]].map(([a,b])=>`<div class="st"><small>${a}</small><b>${b}</b></div>`).join('');
  renderInvTable();
  renderLog();
}
const LOG_ROWS=[10,15,25,50,100];
function logRowsN(){let n=15;try{n=+localStorage.getItem('pos_logrows')||15}catch(e){}return LOG_ROWS.includes(n)?n:15}
function setLogRows(v){try{localStorage.setItem('pos_logrows',String(+v))}catch(e){}S.ln=0;renderLog()}
function logUsers(){const m=new Map();let anon=false;db.log.forEach(l=>{if(l.u)m.set(l.u,l.by||l.u);else anon=true});return{list:[...m.entries()].sort((a,b)=>a[1].localeCompare(b[1])),anon}}
function logRows(){
  let rows=db.log.map((l,i)=>({l,i}));
  if(isStaffMode()){const me=CL.me&&CL.me.username;return rows.filter(r=>r.l.u===me)}
  if(CL.on&&S.logU&&S.logU!=='all')rows=rows.filter(r=>S.logU==='-'?!r.l.u:r.l.u===S.logU);
  return rows;
}
function renderLog(){
  if(!$('#logBody'))return;
  const emp=isStaffMode(),showU=CL.on&&!emp,n=S.ln||logRowsN(),tm=t=>new Date(t).toLocaleString(dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const sel=$('#logUser');
  if(sel){sel.hidden=!showU;if(showU){const u=logUsers();sel.innerHTML='<option value="all">Semua pengguna</option>'+u.list.map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join('')+(u.anon?'<option value="-">Tidak tercatat</option>':'');sel.value=[...sel.options].some(o=>o.value===(S.logU||'all'))?(S.logU||'all'):'all'}}
  const hint=$('#logHint');if(hint){hint.hidden=!emp;hint.textContent=emp?'Hanya perubahan stok yang Anda lakukan sendiri yang ditampilkan.':''}
  const vis=LOG_COLS.filter(([k])=>k!=='u'||showU);
  const rs=$('#logRows');if(rs)rs.innerHTML=LOG_ROWS.map(x=>`<option value="${x}" ${x===logRowsN()?'selected':''}>${x}</option>`).join('');
  $('#logHead').innerHTML='<tr>'+vis.map(([k,l])=>`<th${k==='d'||k==='s'?' class="num"':''}>${l}</th>`).join('')+'</tr>';
  const rows=logRows(),cell={
    t:l=>tm(l.t),name:l=>`<b>${esc(l.name)}</b>`,
    d:l=>`<span class="chgp ${l.d<0?'gd':'gu'}">${l.d>0?'+':''}${l.d}</span>`,
    s:l=>l.s!=null?l.s:'-',u:l=>l.by||l.u?esc(l.by||l.u):'<span class="nu">Tidak tercatat</span>',note:l=>esc(l.note||'')};
  $('#logBody').innerHTML=rows.slice(0,n).map(r=>`<tr onclick="logOpen(${r.i})">`+vis.map(([k])=>`<td class="c-${k==='name'?'name':k}${k==='d'||k==='s'?' num':''}">${cell[k](r.l)}</td>`).join('')+'</tr>').join('')||`<tr><td colspan="${Math.max(1,vis.length)}" style="color:var(--mu)">Belum ada perubahan.</td></tr>`;
  $('#logMore').hidden=rows.length<=n;
  const cn=$('#logCnt');if(cn)cn.textContent=rows.length?`Menampilkan ${Math.min(n,rows.length)} dari ${rows.length} catatan`:'';
}
function logOpen(i){
  const l=db.log[i];if(!l)return;
  const m=/^(?:Penjualan|Hapus transaksi) (\S+)/.exec(l.note||''),o=m&&db.orders.find(x=>x.no===m[1]);
  openModal(`<h3>Perubahan Stok</h3><table class="dl">
  <tr><td>Item</td><td>${esc(l.name)}</td></tr>
  <tr><td>Perubahan</td><td style="color:${l.d<0?'var(--bad)':'var(--ok)'}">${l.d>0?'+':''}${l.d}</td></tr>
  ${l.s!=null?`<tr><td>Stok akhir</td><td>${l.s}</td></tr>`:''}${CL.on?`<tr><td>Pengguna</td><td>${esc(l.by||l.u||'Tidak tercatat')}</td></tr>`:''}
  <tr><td>Keterangan</td><td style="white-space:normal">${esc(l.note)}</td></tr>
  <tr><td>Waktu</td><td style="white-space:normal">${new Date(l.t).toLocaleString(dloc(),{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td></tr></table>
  ${o?`<button class="btn" onclick="histOpen('${esc(o.no)}')">Lihat transaksi ${esc(o.no)}</button>`:''}
  <button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
/* catatan riwayat stok: siapa, kapan, berapa, stok akhir */
function logAdd(name,d,note,stock,t){
  const e={t:t||new Date().toISOString(),name,d,note};
  if(stock!=null)e.s=stock;
  if(CL.on&&CL.me){e.u=CL.me.username;e.by=CL.me.name}
  db.log.unshift(e);
}
function setStock(id,v){
  const i=find(id);if(!i||isB(i))return;v=Math.max(0,Math.floor(+v||0));
  if(v!==i.stock){const d=v-i.stock;i.stock=v;logAdd(i.name,d,'Penyesuaian manual',v);db.log=db.log.slice(0,LOG_MAX);save()}
  renderInv();
}
function dlBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function opnTemplate(){
  const its=db.items.filter(i=>!isB(i));
  if(!its.length){toast('Belum ada item untuk dihitung');return}
  const rows=[['Kode','Nama','Kategori','Stok Sistem','Stok Fisik','Catatan']].concat(its.map(i=>[{t:i.id,c:1},i.name,i.cat||'',{n:+i.stock||0,i:1},{t:'',in:1},{t:'',in:1}]));
  dlBlob(xlsxBuild([{name:'Stok Opname',rows,head:1,w:[14,30,16,13,13,28]}],0),'stok-opname-'+dkey(new Date())+'.xlsx');
  toast('Template diunduh. Isi kolom Stok Fisik lalu unggah kembali.');
}
function opnOpen(){
  S.opnDone=null;
  openModal(`<h3>Stok Opname</h3>
  <p style="margin:0 0 12px;color:var(--mu);font-size:13px;line-height:1.55">Hitung stok fisik di Excel, lalu unggah hasilnya. Selisih ditinjau dulu sebelum stok diubah, dan setiap perubahan tercatat di Riwayat Perubahan Stok.</p>
  <div class="opn-step"><b>1</b><div><strong>Unduh template Excel</strong><small>Berisi semua item beserta stok sistem saat ini.</small></div></div>
  <button class="btn sec" type="button" onclick="opnTemplate()"><i class="ic" data-ic="download"></i>Unduh Template (.xlsx)</button>
  <div class="opn-step"><b>2</b><div><strong>Isi kolom “Stok Fisik”</strong><small>Kosongkan baris yang tidak dihitung, barisnya akan dilewati.</small></div></div>
  <div class="opn-step"><b>3</b><div><strong>Unggah file hasil hitung</strong><small>Format .xlsx atau .csv. Item dicocokkan lewat Kode, atau Nama bila kolom Kode dihapus.</small></div></div>
  <label class="btn" style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">Pilih File Excel<input type="file" id="opnFile" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onchange="opnLoad(this)"></label>
  <button class="btn sec" type="button" onclick="closeModal()">Tutup</button>`);
}
async function opnLoad(inp){
  const f=inp.files&&inp.files[0];inp.value='';if(!f)return;
  if(f.size>8e6){toast('File terlalu besar');return}
  let rows;
  try{
    const buf=await f.arrayBuffer();
    rows=(/\.csv$/i.test(f.name)||f.type==='text/csv')?csvRead(new TextDecoder().decode(buf)):await xlsxRead(buf);
  }catch(e){toast('File tidak bisa dibaca: '+(e&&e.message||'format salah'));return}
  const norm=x=>String(x==null?'':x).trim().toLowerCase();
  let hi=rows.findIndex(r=>r&&r.some(c=>/fisik/.test(norm(c))));
  if(hi<0){toast('Kolom “Stok Fisik” tidak ditemukan. Pakai template dari aplikasi.');return}
  const h=rows[hi].map(norm),col=re=>h.findIndex(x=>re.test(x));
  const cK=col(/^(kode|id|sku)$/),cN=col(/^(nama|name|item|menu)/),cF=col(/fisik/),cC=col(/catatan|keterangan|note/);
  if(cK<0&&cN<0){toast('Kolom Kode atau Nama tidak ditemukan');return}
  OP.rows=[];OP.miss=[];OP.bad=[];OP.skip=0;const seen=new Set();
  const byName=new Map();db.items.forEach(i=>{if(!isB(i)){const k=norm(i.name);if(!byName.has(k))byName.set(k,i)}});
  rows.slice(hi+1).forEach((r,ix)=>{
    if(!r)return;const raw=r[cF],label=norm(r[cN])?String(r[cN]).trim():String(r[cK]||'').trim()||('baris '+(hi+ix+2));
    if(raw===''||raw==null||norm(raw)==='')return OP.skip++;
    let it=cK>=0&&norm(r[cK])?db.items.find(i=>i.id===String(r[cK]).trim()):null;
    if(!it&&cN>=0)it=byName.get(norm(r[cN]));
    if(!it||isB(it))return OP.miss.push(label);
    const n=typeof raw==='number'?raw:parseFloat(String(raw).replace(',','.'));
    if(!isFinite(n)||n<0)return OP.bad.push(label+' ('+raw+')');
    if(seen.has(it.id)){OP.bad.push(label+' (dobel)');return}seen.add(it.id);
    const fis=Math.round(n*1000)/1000;OP.rows.push({id:it.id,name:it.name,fis,note:cC>=0?String(r[cC]==null?'':r[cC]).trim().slice(0,60):'',on:fis!==it.stock});
  });
  OP.name=f.name;opnReview();
}
function opnReview(){
  const emp=isStaffMode(),rs=OP.rows.map(r=>({r,i:find(r.id)})).filter(x=>x.i);
  const diff=rs.filter(x=>x.r.fis!==x.i.stock),same=rs.length-diff.length;
  const sel=diff.filter(x=>x.r.on),qty=sel.reduce((a,x)=>a+(x.r.fis-x.i.stock),0),val=sel.reduce((a,x)=>a+(x.r.fis-x.i.stock)*(+x.i.cost||0),0);
  const warn=(t,a)=>a.length?`<details class="opn-w"><summary>${t} (${a.length})</summary><div>${a.slice(0,50).map(esc).join('<br>')}${a.length>50?'<br>…':''}</div></details>`:'';
  openModal(`<h3>Tinjau Selisih</h3>
  <p style="margin:0 0 10px;color:var(--mu);font-size:13px">${esc(OP.name)} · ${rs.length} item terbaca · ${same} sama dengan sistem · ${OP.skip} baris kosong dilewati</p>
  ${diff.length?`<div class="tw opn-tw"><table class="opn-t"><thead><tr><th></th><th>Item</th><th class="num">Sistem</th><th class="num">Fisik</th><th class="num">Selisih</th></tr></thead><tbody>${diff.map(x=>{const d=x.r.fis-x.i.stock;
    return`<tr><td><input type="checkbox" ${x.r.on?'checked':''} onchange="OP.rows.find(q=>q.id==='${x.r.id}').on=this.checked;opnSum()" aria-label="Terapkan"></td><td><b>${esc(x.i.name)}</b>${x.r.note?`<small>${esc(x.r.note)}</small>`:''}</td><td class="num">${x.i.stock}</td><td class="num"><input class="fi opn-in" type="number" min="0" step="1" value="${x.r.fis}" oninput="opnEdit('${x.r.id}',this)"></td><td class="num"><span class="chgp ${d<0?'gd':'gu'}" id="opd_${x.r.id}">${d>0?'+':''}${d}</span></td></tr>`}).join('')}</tbody></table></div>
  <div class="opn-sum" id="opnSum"></div>
  <label class="fl" for="opnNote">Catatan opname (opsional)</label><input class="fi" id="opnNote" maxlength="40" placeholder="Mis. Opname akhir bulan">`
  :`<div class="empty" style="padding:22px 0">Tidak ada selisih. Stok fisik sama dengan stok sistem.</div>`}
  ${warn('Tidak ditemukan di inventori',OP.miss)}${warn('Angka tidak valid / dobel',OP.bad)}
  ${diff.length?`<button class="btn" id="opnGo" type="button" onclick="opnApply()">Terapkan Selisih</button>`:''}
  <button class="btn sec" type="button" onclick="${diff.length&&OP.name!=='Hitung langsung'?'opnOpen()':'closeModal()'}">${diff.length&&OP.name!=='Hitung langsung'?'Kembali':'Tutup'}</button>`);
  if(diff.length)opnSum();
}
function opnEdit(id,el){
  const r=OP.rows.find(q=>q.id===id),i=find(id);if(!r||!i)return;
  r.fis=Math.max(0,Math.round((+el.value||0)*1000)/1000);const d=r.fis-i.stock,e=$('#opd_'+id);
  if(e){e.textContent=(d>0?'+':'')+d;e.className='chgp '+(d<0?'gd':'gu')}
  opnSum();
}
function opnSum(){
  const emp=isStaffMode(),sel=OP.rows.map(r=>({r,i:find(r.id)})).filter(x=>x.i&&x.r.on&&x.r.fis!==x.i.stock);
  const q=sel.reduce((a,x)=>a+(x.r.fis-x.i.stock),0),v=sel.reduce((a,x)=>a+(x.r.fis-x.i.stock)*(+x.i.cost||0),0);
  const b=$('#opnSum');if(b)b.innerHTML=`<span><small>Item diubah</small><b>${sel.length}</b></span><span><small>Selisih total</small><b>${q>0?'+':''}${q}</b></span>${emp?'':`<span><small>Nilai selisih (modal)</small><b class="${v<0?'neg':''}">${v<0?'− ':''}${money(Math.abs(v))}</b></span>`}`;
  const g=$('#opnGo');if(g)g.disabled=!sel.length;
}
function opnApply(){
  const note=(($('#opnNote')||{}).value||'').trim(),tag='Stok opname '+new Date().toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+(note?' · '+note:'');
  const done=[];
  OP.rows.forEach(r=>{
    if(!r.on)return;const i=find(r.id);if(!i||isB(i)||i.stock===r.fis)return;
    const before=i.stock,d=r.fis-before;i.stock=r.fis;logAdd(i.name,d,tag+(r.note?' ('+r.note+')':''),r.fis);
    done.push([i.name,i.cat||'',before,r.fis,d,+i.cost||0,r.note]);
  });
  if(!done.length){closeModal();return}
  db.log=db.log.slice(0,LOG_MAX);save();renderInv();if(window.P2&&P2.opnReset)P2.opnReset();
  S.opnDone={rows:done,tag};
  const q=done.reduce((a,x)=>a+x[4],0);
  openModal(`<div class="lgo"><div class="lgi" style="background:var(--greenbg);color:var(--ok)"><i class="ic" data-ic="check"></i></div><h3>Stok opname selesai</h3>
  <p>${done.length} item disesuaikan (selisih total ${q>0?'+':''}${q}). Perubahan tercatat di Riwayat Perubahan Stok.</p>
  <button class="btn" type="button" onclick="opnReport()">Unduh Laporan Hasil (Excel)</button>
  <button class="btn sec" type="button" onclick="closeModal()">Selesai</button></div>`);
}
function opnReport(){
  const o=S.opnDone;if(!o)return;const emp=isStaffMode();
  const head=['Item','Kategori','Stok Sistem','Stok Fisik','Selisih'].concat(emp?[]:['Modal / unit','Nilai Selisih']).concat(['Catatan']);
  const rows=[head].concat(o.rows.map((x,k)=>{const n=k+2,r=[x[0],x[1],{n:+x[2]||0,i:1},{n:+x[3]||0,i:1},{n:+x[4]||0,diff:1}];if(!emp){r.push(x[5]);r.push({f:`E${n}*F${n}`,v:x[4]*x[5],diff:1})}r.push(x[6]||'');return r}));
  const n=o.rows.length+1,tq=o.rows.reduce((a,x)=>a+x[4],0);
  rows.push(emp?['TOTAL','','','',{f:`SUM(E2:E${n})`,v:tq,diff:1},''] :['TOTAL','','','',{f:`SUM(E2:E${n})`,v:tq,diff:1},'',{f:`SUM(G2:G${n})`,v:o.rows.reduce((a,x)=>a+x[4]*x[5],0),diff:1},'']);
  dlBlob(xlsxBuild([{name:'Hasil Opname',rows,head:1,total:1,w:[30,16,13,13,11,13,15,26]}],dec()),'hasil-stok-opname-'+dkey(new Date())+'.xlsx');
}
/* ---------- add / edit item ---------- */
/* karyawan: hanya boleh menambah stok (tidak bisa kurangi/hapus/ubah item) */
function stockForm(id){
  const i=find(id);if(!i||isB(i))return;
  openModal(`<h3>${esc(i.name)}</h3>
  <div class="stkadd"><span>Stok sekarang</span><b>${i.stock}</b></div>
  <label class="fl" for="sAdd">Tambah stok</label><input class="fi" id="sAdd" type="number" inputmode="numeric" min="1" step="1" placeholder="0" autofocus>
  <p class="hint" id="sAddE" style="color:var(--bad);min-height:16px;margin:4px 0"></p>
  <button class="btn" onclick="stockAdd('${id}')">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
  setTimeout(()=>{const e=$('#sAdd');if(e)e.focus()},60);
}
function stockAdd(id){
  const i=find(id);if(!i||isB(i))return;const n=Math.floor(+$('#sAdd').value||0);
  if(n<1){$('#sAddE').textContent='Isi jumlah stok yang ditambah';return}
  const v=i.stock+n;i.stock=v;logAdd(i.name,n,'Tambah stok',v);db.log=db.log.slice(0,LOG_MAX);save();closeModal();renderInv();toast('Stok +'+n);
}
function itemForm(id,ns){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  const i=id?find(id):{name:'',cat:db.cats[0]||'',price:'',cost:'',stock:0,min:db.set.low,img:'',emoji:'🍽️',ns:ns?1:0};
  S.edit={id:id||null,img:i.img,rc:!!i.rc,bd:isB(i)?i.bundle.map(c=>({id:c.id,q:c.q})):[]};
  openModal(`<h3>${id?'Edit':'Tambah'} Item</h3>
  <div class="up"><div class="pv" id="pv">${i.img?`<img src="${imgSrc(i.img)}" alt="">`:emo(i)}</div>
  <div><button class="btn sm sec" onclick="$('#imgF').click()"><i class="ic" data-ic="camera"></i>Upload Gambar</button>
  <button class="mini" onclick="S.edit.img='';$('#pv').innerHTML=emo({})">Hapus</button>
  <input type="file" id="imgF" accept="image/*" hidden onchange="pickImg(this)"></div></div>
  <label class="fl">Nama item *</label><input class="fi" id="fN" value="${esc(i.name)}">
  <div class="two"><div><label class="fl">Kategori</label><select class="fi" id="fC">${db.cats.map(c=>`<option ${c===i.cat?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
  <div><label class="fl">Kategori baru</label><input class="fi" id="fC2" placeholder="Bila perlu"></div></div>
  <div class="two"><div><label class="fl">Harga jual *</label><input class="fi" id="fP" type="number" step="any" min="0" value="${i.price}"></div>
  <div><label class="fl">Harga modal</label><input class="fi" id="fK" type="number" step="any" min="0" value="${i.cost||''}"></div></div>
  <div id="stkRow" style="${isB(i)?'display:none':''}"><div class="two"><div><label class="fl">Stok</label><input class="fi" id="fS" type="number" min="0" step="any" value="${isB(i)?0:i.stock}"></div>
  <div><label class="fl">Batas stok menipis</label><input class="fi" id="fM" type="number" min="0" value="${i.min}"></div></div></div>
  <label class="tgl"><input type="checkbox" id="fNS" ${i.ns?'checked':''} onchange="nsToggle()"><span>Bahan (tidak dijual, hanya stok)</span></label>
  <label class="tgl" id="fBL" ${i.ns?'hidden':''}><input type="checkbox" id="fB" ${isB(i)?'checked':''} onchange="bdToggle()"><span>Paket / resep (isi beberapa item)</span></label>
  <div id="bdTypeW" ${isB(i)?'':'hidden'}><label class="fl">Jenis isi</label><select class="fi" id="fBT" onchange="S.edit.rc=this.value==='rc';bdRender()"><option value="pk" ${i.rc?'':'selected'}>Paket: beberapa menu dijual jadi satu</option><option value="rc" ${i.rc?'selected':''}>Resep: kurangi bahan otomatis saat terjual</option></select></div>
  <div id="bdBox" ${isB(i)?'':'hidden'}>  <div id="bdRows"></div><button class="btn sm sec" type="button" onclick="bdAdd()">+ Tambah isi</button></div>
  <details class="adv" ${(i.bc||i.stn||(i.pu&&i.pu.n)||(i.mods&&i.mods.length))?'open':''}><summary>Opsi lainnya <small>barcode, varian, stasiun, satuan beli</small></summary>
  <div class="two"><div><label class="fl">Barcode (opsional)</label><input class="fi" id="fBC" value="${esc(i.bc||'')}" inputmode="text" autocomplete="off" placeholder="Scan / ketik"></div><div class="scanwrap"><button type="button" class="btn sec scanbtn" onclick="P2.scan(c=>{$('#fBC').value=c;return true},{once:true,keep:true})"><i class="ic" data-ic="camera"></i><span>Scan kamera</span></button></div></div>
  <label class="fl">Varian &amp; tambahan (opsional)</label><textarea class="fi modsta" id="fMods" rows="3" placeholder="Level pedas (wajib): Sedang, Pedas +2000&#10;Topping (banyak): Keju +5000, Telur +4000">${esc(modsText(i.mods))}</textarea>
  <small class="hint">Satu baris satu grup. (wajib) = harus pilih, (banyak) = boleh lebih dari satu, +harga = biaya tambahan.</small>
  <div class="two"><div><label class="fl">Stasiun (opsional)</label><input class="fi" id="fSt" list="stL" maxlength="20" placeholder="Dapur / Bar" value="${esc(i.stn||'')}"><datalist id="stL"><option>Dapur</option><option>Bar</option><option>Dessert</option></datalist></div>
  <div><label class="fl">Satuan beli (opsional)</label><div style="display:flex;gap:6px"><input class="fi" id="fPuN" maxlength="12" placeholder="karung" value="${esc((i.pu||{}).n||'')}" style="flex:1;min-width:0"><input class="fi" id="fPuF" type="number" min="0" step="any" inputmode="decimal" placeholder="isi" value="${(i.pu||{}).f||''}" style="width:72px"></div></div></div>
  <small class="hint" style="display:block;margin:-2px 0 6px">Satuan beli: 1 karung = 25000 → stok naik otomatis saat Pembelian.</small>
  </details>
  <button class="btn" onclick="saveItem()">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>${id?`<button class="btn red" onclick="delItem('${id}')">Hapus Item</button>`:''}`);
  bdRender();
}
function bdOpts(sel){const me=S.edit.id;return '<option value="">Pilih item…</option>'+db.items.filter(x=>!isB(x)&&(S.edit.rc||!x.ns)&&x.id!==me).map(x=>`<option value="${esc(x.id)}" ${x.id===sel?'selected':''}>${esc(x.name)}</option>`).join('')}
function bdRender(){const e=$('#bdRows');if(!e)return;e.innerHTML=S.edit.bd.map((c,k)=>`<div class="bdr"><input class="fi" type="number" min="0.001" step="any" inputmode="decimal" value="${c.q}" aria-label="Jumlah isi" onchange="bdSet(${k},'q',this.value)"><span>×</span><select class="fi" aria-label="Item isi" onchange="bdSet(${k},'id',this.value)">${bdOpts(c.id)}</select><button class="mini" type="button" onclick="bdDel(${k})">Hapus</button></div>`).join('')}
function bdSet(k,f,v){const c=S.edit.bd[k];if(!c)return;if(f==='q')c.q=Math.max(.001,Math.round((+v||1)*1000)/1000);else c.id=v}
function bdAdd(){S.edit.bd.push({id:'',q:1});bdRender()}
function bdDel(k){S.edit.bd.splice(k,1);bdRender()}
function nsToggle(){const on=$('#fNS').checked;if(on){if(S.edit.id&&bdUsedBy(S.edit.id)){$('#fNS').checked=false;toast('Item ini jadi isi paket, tidak bisa dijadikan bahan');return}$('#fB').checked=false;bdToggle()}$('#fBL').hidden=on}
function bdToggle(){const on=$('#fB').checked;if(on&&bdUsedBy(S.edit.id)){$('#fB').checked=false;toast('Item ini sudah jadi isi paket lain, tidak bisa dijadikan paket');return}$('#bdBox').hidden=!on;{const w=$('#bdTypeW');if(w)w.hidden=!on}$('#stkRow').style.display=on?'none':'';if(on&&!S.edit.bd.length)S.edit.bd.push({id:'',q:1});bdRender()}
/* ---------- pangkas (crop) gambar: dipakai untuk logo dan gambar menu ---------- */
function cropImg(file,o){
  const rd=new FileReader();
  rd.onload=e=>{const im=new Image();im.onload=()=>cropUi(im,o);im.onerror=()=>toast('Gambar tidak valid');im.src=e.target.result};
  rd.onerror=()=>toast('Gambar tidak bisa dibaca');rd.readAsDataURL(file);
}
function cropUi(im,o){
  const old=document.getElementById('cropOv');if(old)old.remove();
  const asp=(o.aspects||[['1:1',1]]).map(a=>a[1]==='img'?[a[0],im.width/im.height]:a);
  const ov=document.createElement('div');ov.id='cropOv';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:#111;display:flex;flex-direction:column;color:#fff;font-family:system-ui,sans-serif;touch-action:none';
  ov.innerHTML=`<div style="padding:14px 16px;font-weight:700;font-size:18px">${esc(o.title||'Pangkas gambar')}</div>
  <div id="crStage" style="flex:1;position:relative;overflow:hidden;touch-action:none"><canvas id="crC" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
  <div style="padding:10px 16px 6px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center" id="crAsp"></div>
  <div style="padding:4px 20px;display:flex;align-items:center;gap:10px"><span style="font-size:13px;opacity:.7">Zoom</span><input id="crZ" type="range" min="1" max="4" step="0.01" value="1" style="flex:1"></div>
  <div style="padding:10px 16px calc(14px + var(--sab));display:flex;gap:10px"><button id="crNo" type="button" style="flex:1;padding:14px;border:0;border-radius:14px;background:#333;color:#fff;font-size:16px">Batal</button><button id="crOk" type="button" style="flex:2;padding:14px;border:0;border-radius:14px;background:#111;color:#fff;font-weight:700;font-size:16px">Pakai gambar</button></div>`;
  document.body.appendChild(ov);
  const cv=ov.querySelector('#crC'),st=ov.querySelector('#crStage'),zr=ov.querySelector('#crZ'),ab=ov.querySelector('#crAsp');
  let ai=0,W=0,H=0,fx=0,fy=0,fw=0,fh=0,base=1,z=1,ox=0,oy=0;
  const clamp=()=>{const s=base*z,iw=im.width*s,ih=im.height*s;ox=Math.min(fx,Math.max(fx+fw-iw,ox));oy=Math.min(fy,Math.max(fy+fh-ih,oy))};
  const frame=()=>{
    const r=st.getBoundingClientRect();W=Math.max(50,r.width);H=Math.max(50,r.height);
    const dpr=window.devicePixelRatio||1;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
    const a=asp[ai][1],pad=20;let w=W-pad*2,h=w/a;if(h>H-pad*2){h=H-pad*2;w=h*a}
    fw=w;fh=h;fx=(W-w)/2;fy=(H-h)/2;base=Math.max(fw/im.width,fh/im.height);
  };
  const draw=()=>{
    clamp();const x=cv.getContext('2d'),dpr=cv.width/W,s=base*z;
    x.setTransform(dpr,0,0,dpr,0,0);x.fillStyle='#111';x.fillRect(0,0,W,H);
    x.drawImage(im,ox,oy,im.width*s,im.height*s);
    x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,0,W,fy);x.fillRect(0,fy+fh,W,H-fy-fh);x.fillRect(0,fy,fx,fh);x.fillRect(fx+fw,fy,W-fx-fw,fh);
    x.strokeStyle='#fff';x.lineWidth=2;x.strokeRect(fx,fy,fw,fh);
    x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=1;x.beginPath();
    for(let i=1;i<3;i++){x.moveTo(fx+fw*i/3,fy);x.lineTo(fx+fw*i/3,fy+fh);x.moveTo(fx,fy+fh*i/3);x.lineTo(fx+fw,fy+fh*i/3)}x.stroke();
  };
  const center=()=>{z=1;zr.value=1;const s=base;ox=fx+(fw-im.width*s)/2;oy=fy+(fh-im.height*s)/2};
  const setZ=(nz,cx,cy)=>{
    nz=Math.min(4,Math.max(1,nz));const s0=base*z,s1=base*nz;
    if(cx==null){cx=fx+fw/2;cy=fy+fh/2}
    ox=cx-(cx-ox)*s1/s0;oy=cy-(cy-oy)*s1/s0;z=nz;zr.value=z;draw();
  };
  const chips=()=>{ab.innerHTML=asp.map((a,i)=>`<button type="button" data-i="${i}" style="padding:8px 14px;border:0;border-radius:999px;font-size:14px;background:${i===ai?'#111':'#555'};color:#fff">${esc(a[0])}</button>`).join('')};
  ab.onclick=e=>{const b=e.target.closest('button');if(!b)return;ai=+b.dataset.i;frame();center();chips();draw()};
  if(asp.length<2)ab.style.display='none';
  zr.oninput=()=>setZ(+zr.value);
  const P=new Map();let pd=0;
  const pos=e=>{const r=st.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  st.onpointerdown=e=>{try{st.setPointerCapture(e.pointerId)}catch(x){}P.set(e.pointerId,pos(e));pd=0};
  st.onpointermove=e=>{
    if(!P.has(e.pointerId))return;const [nx,ny]=pos(e),[px,py]=P.get(e.pointerId);
    if(P.size===1){ox+=nx-px;oy+=ny-py;P.set(e.pointerId,[nx,ny]);draw()}
    else{
      const o2=[...P.entries()].find(([k])=>k!==e.pointerId)[1],d0=Math.hypot(px-o2[0],py-o2[1]),d1=Math.hypot(nx-o2[0],ny-o2[1]);
      P.set(e.pointerId,[nx,ny]);if(d0>0)setZ(z*d1/d0,(nx+o2[0])/2,(ny+o2[1])/2);
    }
  };
  st.onpointerup=st.onpointercancel=e=>{P.delete(e.pointerId)};
  st.onwheel=e=>{e.preventDefault();const [x,y]=pos(e);setZ(z*(e.deltaY<0?1.1:1/1.1),x,y)};
  const close=()=>{window.removeEventListener('resize',rs);ov.remove()};
  const rs=()=>{frame();center();draw()};window.addEventListener('resize',rs);
  ov.querySelector('#crNo').onclick=close;
  ov.querySelector('#crOk').onclick=()=>{
    clamp();const s=base*z,sx=(fx-ox)/s,sy=(fy-oy)/s,sw=fw/s,sh=fh/s;
    const k=Math.min(1,(o.max||480)/Math.max(sw,sh)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(sw*k));c.height=Math.max(1,Math.round(sh*k));
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);
    const d=c.toDataURL('image/jpeg',o.q||.85);close();o.cb(d);
  };
  chips();frame();center();draw();
}
function pickImg(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  cropImg(f,{title:'Pangkas gambar menu',aspects:[['1:1',1],['4:3',4/3],['3:4',3/4]],max:480,q:.8,cb:d=>{S.edit.img=d;const pv=$('#pv');if(pv)pv.innerHTML=`<img src="${d}">`}});
}
function modsParse(t){return String(t||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const ix=l.indexOf(':');if(ix<1)return null;let n=l.slice(0,ix).trim(),req=0,multi=0;const fl=/\(([^)]*)\)\s*$/.exec(n);if(fl){const f=fl[1].toLowerCase();req=/wajib/.test(f)?1:0;multi=/banyak/.test(f)?1:0;n=n.slice(0,fl.index).trim()}const o=l.slice(ix+1).split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const m=/^(.*?)(?:\s*\+\s*([\d.]+))?$/.exec(x);return{n:m[1].trim(),p:+m[2]||0}}).filter(x=>x.n);return n&&o.length?{n,req,multi,o}:null}).filter(Boolean).slice(0,8)}
function modsText(m){return (m||[]).map(g=>g.n+(g.req||g.multi?' ('+[g.req?'wajib':'',g.multi?'banyak':''].filter(Boolean).join(', ')+')':'')+': '+g.o.map(o=>o.n+(o.p?' +'+o.p:'')).join(', ')).join('\n')}
function saveItem(){
  const ns=$('#fNS').checked,name=$('#fN').value.trim(),price=rnd(+$('#fP').value);
  if(!name){toast('Nama wajib diisi');return}
  if(!(price>=0)||($('#fP').value===''&&!ns)){toast('Harga wajib diisi');return}
  let cat=$('#fC2').value.trim()||$('#fC').value;
  if(!cat){toast('Pilih / isi kategori');return}
  if(!db.cats.includes(cat))db.cats.push(cat);
  let bundle=null;
  if(!ns&&$('#fB').checked){
    const m=new Map();(S.edit.bd||[]).forEach(c=>{if(c.id&&find(c.id)&&c.id!==S.edit.id)m.set(c.id,Math.round(((m.get(c.id)||0)+Math.max(.001,+c.q||1))*1000)/1000)});
    bundle=[...m].map(([id,q])=>({id,q}));
    if(!bundle.length){toast('Pilih minimal 1 isi paket');return}
    if(bundle.some(c=>isB(find(c.id)))){toast('Isi paket tidak boleh berupa paket lain');return}
  }
  const stock=bundle?0:Math.round(Math.max(0,+$('#fS').value||0)*1000)/1000;
  let cost=rnd(+$('#fK').value||0);
  if(bundle&&!cost)cost=rnd(bundle.reduce((a,c)=>a+c.q*((find(c.id)||{}).cost||0),0));
  const d={name,cat,price,cost,stock,min:Math.max(0,Math.floor(+($('#fM')||{}).value||0)),img:S.edit.img||''};
  {const bc=($('#fBC').value||'').trim();if(bc){if(db.items.some(x=>x.bc===bc&&x.id!==S.edit.id)){toast('Barcode sudah dipakai menu lain');return}d.bc=bc}const mods=modsParse($('#fMods').value);if(mods.length)d.mods=mods;if(bundle&&S.edit.rc)d.rc=1}
  {const st=($('#fSt').value||'').trim().slice(0,20);if(st)d.stn=st;const pn=($('#fPuN').value||'').trim().slice(0,12),pf=+$('#fPuF').value;if(pn&&pf>0&&!bundle)d.pu={n:pn,f:pf}}
  if(ns)d.ns=1;
  if(S.edit.id){const i=find(S.edit.id);if(!isB(i)&&!bundle&&stock!==i.stock)logAdd(name,stock-i.stock,'Edit item',stock);if(bundle&&!isB(i)&&i.stock)logAdd(name,-i.stock,'Dijadikan item paket',0);Object.assign(i,d);if(!ns)delete i.ns;if(!d.mods)delete i.mods;if(!d.bc)delete i.bc;if(!d.rc)delete i.rc;if(!d.stn)delete i.stn;if(!d.pu)delete i.pu;if(bundle)i.bundle=bundle;else delete i.bundle}
  else{const ni={id:uid(),emoji:'🍽️',...d};if(bundle)ni.bundle=bundle;db.items.push(ni);if(!bundle&&stock)logAdd(name,stock,'Stok awal',stock)}
  save();closeModal();render();toast('Item disimpan');
}
/* ---------- hapus item (tunggal & massal) ---------- */
function delItem(id){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  const i=find(id);if(!i)return;
  {const u=bdUsedBy(id);if(u){toast('Tidak bisa dihapus: dipakai di paket "'+u.name+'". Ubah paketnya dulu.');return}}
  ask('Hapus item?',`"${i.name}" akan dihapus dari menu dan inventori. Riwayat penjualan tidak terpengaruh.`,'Hapus',()=>{
    db.items=db.items.filter(x=>x.id!==id);delete S.cart[id];S.sel.delete(id);
    if(i.stock&&!isB(i))logAdd(i.name,-i.stock,'Item dihapus',0);
    save();render();toast('Item dihapus');
  });
}
function invList(){
  const q=S.q.trim().toLowerCase();
  return db.items.filter(i=>(S.itab==='all'||(S.itab==='ns')===!!i.ns)&&(!q||i.name.toLowerCase().includes(q)||i.cat.toLowerCase().includes(q)));
}
function invTabs(){
  const n=db.items.filter(i=>i.ns).length,t=[['sale','Menu Dijual',db.items.length-n],['ns','Bahan / Tidak Dijual',n],['all','Semua',db.items.length]];
  $('#invTabs').innerHTML=t.map(x=>`<button class="${S.itab===x[0]?'on':''}" onclick="S.itab='${x[0]}';S.sel.clear();renderInvTable()">${x[1]} <b>${x[2]}</b></button>`).join('');
}
function renderInvTable(){
  if(S.view!=='inv')return;
  invTabs();
  const emp=isStaffMode(),ids=new Set(db.items.map(i=>i.id));
  [...S.sel].forEach(id=>{if(!ids.has(id))S.sel.delete(id)});
  $('#invHead').innerHTML=emp?'<th></th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th><th></th>':'<th><input type="checkbox" id="selAllCk" onchange="selAll(this.checked)"></th><th></th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Modal</th><th>Stok</th><th>Status</th><th></th>';
  $('#invBody').innerHTML=invList().map(i=>{const[s,t]=status(i);
    const stk=isB(i)?`<td class="i-s"><span class="stkc"><b>${i.stock}</b></span></td>`:`<td class="i-s"><span class="stkc"><b>${i.stock}</b></span></td>`;
    return emp?`<tr><td class="i-th"><div class="th">${thumb(i)}</div></td><td class="i-n"><b>${esc(i.name)}</b>${i.ns?' <span class="tag bhn">Bahan</span>':''}${isB(i)?`<br><small class="bdl">${i.rc?'Resep':'Isi'}: ${esc(bdLbl(i.bundle))}</small>`:''}</td><td class="i-c">${esc(i.cat)}</td><td class="i-p">${money(i.price)}</td>${stk}<td class="i-st"><span class="tag ${s}">${t}</span></td><td class="i-a">${isB(i)?'':`<button class="ib" onclick="stockForm('${i.id}')">Edit</button>`}</td></tr>`
    :`<tr><td class="i-ck"><input type="checkbox" ${S.sel.has(i.id)?'checked':''} onchange="selOne('${i.id}',this.checked)"></td><td class="i-th"><div class="th">${thumb(i)}</div></td><td class="i-n"><b>${esc(i.name)}</b>${i.ns?' <span class="tag bhn">Bahan</span>':''}${isB(i)?`<br><small class="bdl">${i.rc?'Resep':'Isi'}: ${esc(bdLbl(i.bundle))}</small>`:''}</td><td class="i-c">${esc(i.cat)}</td><td class="i-p">${money(i.price)}</td><td class="i-m">${money(i.cost||0)}</td>
    ${stk}
    <td class="i-st"><span class="tag ${s}">${t}</span></td>
    <td class="i-a" style="white-space:nowrap"><button class="ib" onclick="itemForm('${i.id}')">Edit</button><button class="ib d" onclick="delItem('${i.id}')">Hapus</button></td></tr>`}).join('')||`<tr><td colspan="${emp?7:9}" style="color:var(--mu)">Tidak ada item.</td></tr>`;
  updateBulk();
}
function selOne(id,on){if(on)S.sel.add(id);else S.sel.delete(id);updateBulk()}
function selAll(on){invList().forEach(i=>{if(on)S.sel.add(i.id);else S.sel.delete(i.id)});renderInvTable()}
function updateBulk(){
  const b=$('#bulkDel');if(!b)return;
  const n=S.sel.size;b.hidden=!n;b.innerHTML='<i class="ic" data-ic="trash"></i>Hapus terpilih ('+n+')';
  const a=$('#selAllCk');if(a){const l=invList();a.checked=l.length>0&&l.every(i=>S.sel.has(i.id))}
}
function bulkDel(){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  const n=S.sel.size;if(!n)return;
  {for(const id of S.sel){const u=bdUsedBy(id,S.sel);if(u){const x=find(id);toast('Tidak bisa dihapus: '+(x?x.name:'item')+' dipakai di paket "'+u.name+'"');return}}}
  ask('Hapus item terpilih?',`${n} item akan dihapus dari menu dan inventori.`,'Hapus',()=>{
    db.items=db.items.filter(i=>!S.sel.has(i.id));
    S.sel.forEach(id=>delete S.cart[id]);S.sel.clear();
    save();render();toast(n+' item dihapus');
  });
}
/* ---------- tampilan grid menu ---------- */
function applyGridView(){
  const g=db.set.gv,el=$('#grid'),cd=g.colsD,cm=g.colsM;
  el.className='grid'+(g.mode==='list'?' list':'')+(cd>0?' fd':'')+' fm'+(g.stock?'':' nostock');
  /* jarak, padding, dan lengkung sudut kartu mengecil saat kolom bertambah */
  const pick=(n,t)=>{for(const [min,v] of t)if(n>=min)return v;return t[t.length-1][1]};
  const GAP=[[8,6],[6,8],[4,10],[0,14]],PAD=[[8,4],[6,5],[4,6],[0,8]],RAD=[[8,12],[6,16],[4,20],[0,28]];
  const MGAP=[[4,5],[3,7],[0,10]],MPAD=[[4,4],[3,5],[0,8]],MRAD=[[4,14],[3,18],[0,26]];
  el.style.cssText='--cd:'+cd+';--cm:'+cm+';--gd:'+pick(cd,GAP)+'px;--pdd:'+pick(cd,PAD)+'px;--radd:'+pick(cd,RAD)+'px;--gm:'+pick(cm,MGAP)+'px;--pdm:'+pick(cm,MPAD)+'px;--radm:'+pick(cm,MRAD)+'px';
  $('#cats').style.display=g.cats?'':'none';
  const b=(on,t,fn)=>`<button class="chip ${on?'on':''}" onclick="${fn}">${t}</button>`;
  $('#gtool').innerHTML='<span class="lb">Tampilan</span>'
    +b(g.mode==='grid','<i class="ic" data-ic="grid"></i>Grid',"setGV('mode','grid')")+b(g.mode==='list','<i class="ic" data-ic="list"></i>Daftar',"setGV('mode','list')")
    +'<button class="chip" onclick="gridForm()"><i class="ic" data-ic="sliders"></i>Atur</button>'+('BarcodeDetector' in window?'<button class="chip" onclick="scanCam()">Scan</button>':'');
}
function setGV(k,v,re){db.set.gv[k]=v;save();applyGridView();if(k==='tap')renderGrid();if(re)gridForm()}
function gridForm(){
  const g=db.set.gv;
  const row=(k,opts)=>`<div class="chips">${opts.map(([v,t])=>`<button class="chip ${g[k]===v?'on':''}" onclick="setGV('${k}',${typeof v==='number'?v:`'${v}'`},1)">${t}</button>`).join('')}</div>`;
  const ck=(k,l)=>`<label class="tgl"><input type="checkbox" ${g[k]?'checked':''} onchange="setGV('${k}',this.checked)"><span>${l}</span></label>`;
  openModal(`<h3>Atur Tampilan Menu</h3>
  <label class="fl">Mode</label>${row('mode',[['grid','<i class="ic" data-ic="grid"></i>Grid'],['list','<i class="ic" data-ic="list"></i>Daftar']])}
  <label class="fl">Saat gambar menu diketuk</label>${row('tap',[['add','<i class="ic" data-ic="bolt"></i>Tambah 1 langsung'],['qty','<i class="ic" data-ic="hash"></i>Pilih jumlah'],['detail','<i class="ic" data-ic="search"></i>Lihat detail'],['none','<i class="ic" data-ic="ban"></i>Tanpa aksi']])}
  <label class="fl">Jumlah kolom: layar besar (PC / tablet)</label>${row('colsD',[[0,'Auto'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6'],[8,'8']])}
  <label class="fl">Jumlah kolom: HP</label>${row('colsM',[[1,'1'],[2,'2'],[3,'3'],[4,'4']])}
  <div class="tgls" style="margin-top:6px">${ck('stock','Tampilkan stok')}${ck('cats','Tampilkan bar kategori')}</div>
  <button class="btn" onclick="closeModal()">Selesai</button>`);
}
/* ---------- atur urutan menu (inventori) ---------- */
function roList(){const c=(S.ro&&S.ro.cat)||'all';return db.items.filter(i=>c==='all'||i.cat===c)}
function orderForm(cat){
  if(!isOwner()){toast('Hanya owner yang boleh mengubah data menu');return}
  S.ro=S.ro||{cat:'all'};if(cat!==undefined)S.ro.cat=cat;
  const c=S.ro.cat,l=roList(),mb=$('#modal'),ml=$('#rlist'),sc=ml?ml.scrollTop:0,ms=mb?mb.scrollTop:0;
  const chip=(k,t)=>`<button class="chip ${c===k?'on':''}" onclick="orderForm('${esc(k).replace(/'/g,"\\'")}')">${esc(t)}</button>`;
  openModal(`<h3>Atur Urutan Menu</h3>
  <div class="chips" style="margin-bottom:8px">${chip('all','Semua')}${db.cats.map(k=>chip(k,k)).join('')}</div>
  <div class="chips" style="margin-bottom:8px"><button class="chip" onclick="orderSort('name')">A–Z</button><button class="chip" onclick="orderSort('price')">Harga ↑</button><button class="chip" onclick="orderSort('stock')">Stok ↓</button></div>
  <div class="rlist" id="rlist">${l.map((i,n)=>`<div class="rrow" data-id="${esc(i.id)}"><span class="rn">${n+1}</span><div class="th">${thumb(i)}</div><div class="rnm"><b>${esc(i.name)}</b><small>${esc(i.cat)}</small></div><button class="rmv" onclick="orderMove('${i.id}',-1)">▲</button><button class="rmv" onclick="orderMove('${i.id}',1)">▼</button><span class="rh" onpointerdown="orderDrag(event)">⠿</span></div>`).join('')||''}</div>
  <button class="btn" onclick="closeModal()">Selesai</button>`);
  const nl=$('#rlist'),nm=$('#modal');if(nl)nl.scrollTop=sc;if(nm)nm.scrollTop=ms;
}
function orderCommit(ids){
  const set=new Set(ids),slots=[];db.items.forEach((it,i)=>{if(set.has(it.id))slots.push(i)});
  const by={};db.items.forEach(i=>by[i.id]=i);
  if(slots.length!==ids.length||ids.some(id=>!by[id]))return;
  slots.forEach((pos,k)=>{db.items[pos]=by[ids[k]]});
  save();renderGrid();if(S.view==='inv')renderInv();
}
function orderMove(id,d){
  const ids=roList().map(i=>i.id),i=ids.indexOf(id),j=i+d;
  if(i<0||j<0||j>=ids.length)return;
  [ids[i],ids[j]]=[ids[j],ids[i]];orderCommit(ids);orderForm();
}
function orderSort(k){
  const l=roList().slice();
  if(k==='name')l.sort((a,b)=>a.name.localeCompare(b.name));
  else if(k==='price')l.sort((a,b)=>a.price-b.price);
  else l.sort((a,b)=>b.stock-a.stock);
  orderCommit(l.map(i=>i.id));orderForm();
}
function orderDrag(e){
  e.preventDefault();
  const h=e.currentTarget,row=h.closest('.rrow'),list=row.parentNode;
  row.classList.add('drag');
  let y=e.clientY;
  const tm=setInterval(()=>{const r=list.getBoundingClientRect();if(y<r.top+36)list.scrollTop-=10;else if(y>r.bottom-36)list.scrollTop+=10},16);
  const mv=ev=>{
    y=ev.clientY;
    const t=document.elementFromPoint(ev.clientX,ev.clientY),tr=t&&t.closest&&t.closest('.rrow');
    if(tr&&tr!==row&&tr.parentNode===list){const b=tr.getBoundingClientRect();list.insertBefore(row,ev.clientY<b.top+b.height/2?tr:tr.nextSibling)}
  };
  const up=()=>{
    clearInterval(tm);document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);
    row.classList.remove('drag');
    const rows=[...list.querySelectorAll('.rrow')];
    rows.forEach((r,i)=>{const n=r.querySelector('.rn');if(n)n.textContent=i+1});
    orderCommit(rows.map(r=>r.dataset.id));
  };
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
}

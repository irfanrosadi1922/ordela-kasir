/* Ordela — modul kasir: POS, tahan pesanan, member, pembayaran.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
/* ---------- POS ---------- */
function renderCats(){
  const sale=db.items.filter(i=>!i.ns);
  const list=[{k:'all',n:'Semua Menu',c:sale.length,img:null}].concat(db.cats.filter(c=>sale.some(i=>i.cat===c)||!db.items.some(i=>i.cat===c)).map(c=>({k:c,n:c,c:sale.filter(i=>i.cat===c).length})));
  $('#cats').innerHTML=list.map(c=>{
    return`<button class="cat ${S.cat===c.k?'on':''}" onclick="S.cat='${esc(c.k).replace(/'/g,"\\'")}';renderCats();renderGrid()"><div class="t"><b>${esc(c.n)}</b><small>${c.c} Items</small></div></button>`
  }).join('');
}
function filtered(){
  const q=S.q.trim().toLowerCase();
  return db.items.filter(i=>!i.ns&&(S.cat==='all'||i.cat===S.cat)&&(!q||i.name.toLowerCase().includes(q)||i.cat.toLowerCase().includes(q)||String(i.bc||'')===q));
}
function renderPop(){
  const w=$('#popW'),l=$('#popL');if(!w||!l)return;
  const key=db.orders.length+'|'+((db.orders[0]||{}).no||'')+'|'+db.items.length;
  if(S._pk!==key){
    const cnt={};db.orders.slice(0,400).forEach(o=>(o.lines||[]).forEach(x=>{cnt[x.bn||x.name]=(cnt[x.bn||x.name]||0)+(+x.qty||0)}));
    S._pt=Object.keys(cnt).filter(n=>cnt[n]>0).sort((a,b)=>cnt[b]-cnt[a]).slice(0,8);S._pk=key;
  }
  const items=S._pt.map(n=>db.items.find(i=>i.name===n&&!i.ns)).filter(Boolean);
  const show=S.view==='pos'&&S.cat==='all'&&!S.q.trim()&&items.length>0;
  w.hidden=!show;if(!show)return;
  l.innerHTML=items.map(i=>{const out=i.stock<=0||(!hasMods(i)&&(S.cart[i.id]||0)>=maxQty(i));return`<div class="pc"><div class="pi">${thumb(i)}</div><div class="pt"><div class="pn">${esc(i.name)}</div><div class="pp">${money(i.price)}</div></div><button class="pa" onclick="gridAdd('${i.id}')" ${out?'disabled':''}>+</button></div>`}).join('');
}
/* simpan & pulihkan posisi scroll agar daftar tidak lompat ke atas saat di-render ulang (iOS) */
function keepScroll(fn,els){
  const els2=els.map(e=>$(e)).filter(Boolean),pos=els2.map(e=>e.scrollTop);
  fn();
  const back=()=>els2.forEach((e,i)=>{if(pos[i]&&e.scrollTop!==pos[i])e.scrollTop=pos[i]});
  back();if(typeof requestAnimationFrame==="function")requestAnimationFrame(back);setTimeout(back,60);
}
function renderGrid(){
  if(S.view!=='pos')return;keepScroll(renderGrid0,['.main'])
}
function renderGrid0(){
  applyGridView();renderPop();
  const l=filtered(),tapOn=db.set.gv.tap!=='none';
  $('#grid').innerHTML=l.length?l.map(i=>{
    const q=cartQtyOf(i.id),out=i.stock<=0;
    return`<div class="p"><div class="im${tapOn?' tap':''}${q?' has':''}"${tapOn?` onclick="tapItem('${i.id}')"`:''}>${thumb(i)}${out?'<div class="sold">HABIS</div>':''}${q?`<div class="qov">${q}</div>`:''}</div>
    <div class="nm">${esc(i.name)}</div>
    <div class="sub">${esc(i.cat)}</div>${isB(i)?`<div class="bdl">Isi: ${esc(bdLbl(i.bundle))}</div>`:''}
    <div class="stk ${i.stock<=i.min?'low':''}">Stok: ${i.stock}</div>
    <div class="row"><span class="pr">${money(i.price)}</span>
    <span class="qty"><button onclick="gridSub('${i.id}')" ${q?'':'disabled'}>−</button><span>${q}</span><button onclick="gridAdd('${i.id}')" ${out||(!hasMods(i)&&q>=maxQty(i))?'disabled':''}>+</button></span></div></div>`
  }).join(''):'<div class="empty">Menu tidak ditemukan. Tambahkan lewat menu Inventori.</div>';
}
/* ---------- aksi ketuk gambar menu ---------- */
function tapItem(id){
  const it=find(id);if(!it)return;
  if(it.stock<=0){toast('Stok habis');return}
  const mode=db.set.gv.tap;
  if(mode==='add'&&!hasMods(it)){chg(id,1);return}
  if(!hasMods(it)&&(S.cart[id]||0)>=maxQty(it)){toast('Stok tidak mencukupi');return}
  S.pop={id,q:1,info:mode==='detail',sel:{}};popForm(S.pop.info);
}
function gridAdd(id){const it=find(id);if(!it)return;if(hasMods(it)){if(it.stock<=0){toast('Stok habis');return}S.pop={id,q:1,info:false,sel:{}};popForm(false)}else chg(id,1)}
function gridSub(id){const ks=Object.keys(S.cart).filter(k=>bid(k)===id);if(ks.length)chg(ks[ks.length-1],-1)}
function popSel(){const p=S.pop,it=find(p.id),out=[];if(!it||!hasMods(it))return out;it.mods.forEach((g,gi)=>{((p.sel||{})[gi]||[]).forEach(oi=>{const o=g.o[oi];if(o)out.push({g:g.n,n:o.n,p:+o.p||0})})});return out}
function popPick(gi,oi,multi){const p=S.pop;p.sel=p.sel||{};const a=p.sel[gi]||[];if(multi){const k=a.indexOf(oi);if(k>=0)a.splice(k,1);else a.push(oi);p.sel[gi]=a}else p.sel[gi]=(a[0]===oi?[]:[oi]);popForm(p.info)}
function popForm(info){
  const p=S.pop,it=find(p.id);if(!it)return;
  const room=maxQty(it)-(S.cart[p.id]||0);
  const modH=hasMods(it)?it.mods.map((g,gi)=>`<div class="mg"><label class="fl">${esc(g.n)}${g.req?' <span class="rq1">wajib</span>':''}${g.multi?' <small>(boleh lebih dari satu)</small>':''}</label><div class="chips">${g.o.map((o,oi)=>`<button type="button" class="chip ${((p.sel||{})[gi]||[]).includes(oi)?'on':''}" onclick="popPick(${gi},${oi},${g.multi?1:0})">${esc(o.n)}${o.p?' +'+money(o.p):''}</button>`).join('')}</div></div>`).join(''):'';
  const extra=popSel().reduce((a,x)=>a+x.p,0);
  openModal(`${info?`<div class="pop-im">${thumb(it)}</div>`:''}
  <h3 style="margin:${info?'14px':'0'} 0 2px;font-size:20px">${esc(it.name)}</h3>
  ${info?`<div style="color:var(--mu);font-size:13px">${esc(it.cat)} · <span>Stok: ${it.stock}</span></div>`:''}
  <div class="pp-price">${money(it.price+extra)}</div>${modH}
  <label class="fl" style="text-align:center">Jumlah</label>
  <div class="pop-q"><span class="qty"><button onclick="popQ(-1)" ${p.q<=1?'disabled':''}>−</button><span>${p.q}</span><button onclick="popQ(1)" ${p.q>=room?'disabled':''}>+</button></span></div>
  <div class="chg" style="background:var(--chip);color:var(--tx)"><span>Subtotal</span><span>${money(rnd((it.price+extra)*p.q))}</span></div>
  <button class="btn" onclick="popAdd()">Tambah ke Pesanan</button>
  <button class="btn sec" onclick="closeModal()">Batal</button>`);
}
function popQ(d){
  const p=S.pop,it=find(p.id);if(!it)return;
  p.q=Math.max(1,Math.min(maxQty(it)-(S.cart[p.id]||0),p.q+d));popForm(p.info);
}
function popAdd(){
  const p=S.pop;if(!p)return;const it=find(p.id);if(!it)return;
  if(hasMods(it)){
    for(let gi=0;gi<it.mods.length;gi++){const g=it.mods[gi];if(g.req&&!(((p.sel||{})[gi]||[]).length)){toast('Pilih '+g.n+' dulu');return}}
    const sel=popSel(),k=modKey(p.id,sel);if(sel.length)S.cm[k]={sel};chg(k,p.q);
  }else chg(p.id,p.q);
  S.pop=null;closeModal()}
function chg(id,d){
  const it=find(bid(id));if(!it)return;
  let n=(S.cart[id]||0)+d;
  const mx=maxQty(it,id);if(n>mx){n=mx;toast('Stok tidak mencukupi')}
  if(n<=0)delete S.cart[id];else S.cart[id]=n;
  renderGrid();renderInvoice();
}
/* promo & voucher: otomatis (jam/hari/minimal belanja) atau memakai kode */
function promoOk(p,sub,now){
  if(!p||p.del||p.on===false)return false;
  if(+p.min>0&&sub<+p.min)return false;
  const d=now||new Date(),day=d.getDay(),hm=d.getHours()*60+d.getMinutes(),iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if(Array.isArray(p.days)&&p.days.length&&!p.days.includes(day))return false;
  if(p.d1&&iso<p.d1)return false;if(p.d2&&iso>p.d2)return false;
  const tm=v=>{const m=/^(\d{1,2}):(\d{2})$/.exec(v||'');return m?(+m[1])*60+(+m[2]):null},a=tm(p.h1),b=tm(p.h2);
  if(a!=null&&b!=null){if(a<=b){if(hm<a||hm>=b)return false}else if(hm<a&&hm>=b)return false}
  if(+p.max>0&&promoUsed(p.id)>=+p.max)return false;
  return true;
}
function promoUsed(id){let n=0;for(const o of db.orders)if(o.promo&&o.promo.id===id)n++;return n}
function promoAmt(p,sub){let v=p.type==='%'?sub*(+p.val||0)/100:(+p.val||0);if(+p.cap>0&&p.type==='%')v=Math.min(v,+p.cap);return Math.max(0,Math.min(sub,rnd(v)))}
function promoPick(sub){
  if(S.promoId){const p=db.promos.find(x=>x.id===S.promoId);return promoOk(p,sub)?p:null}
  let best=null,bv=0;for(const p of db.promos){if(!p.auto||!promoOk(p,sub))continue;const v=promoAmt(p,sub);if(v>bv){bv=v;best=p}}
  return best;
}
function calc(){
  let sub=0;for(const id in S.cart){if(find(bid(id)))sub+=linePrice(id)*S.cart[id]}
  sub=rnd(sub);
  let disc=S.dType==='%'?sub*S.dVal/100:S.dVal;disc=Math.max(0,Math.min(sub,rnd(disc)));
  const pr=sub>0?promoPick(sub-disc):null,pd=pr?promoAmt(pr,sub-disc):0;disc=rnd(disc+pd);
  const base=rnd(sub-disc),tax=rnd(base*db.set.tax/100);
  return{sub,disc,tax,total:rnd(base+tax),pd,promo:pr};
}
function renderInvoice(){keepScroll(renderInvoice0,['#lines','#invoice'])}
function renderInvoice0(){
  const ids=Object.keys(S.cart).filter(id=>find(bid(id)));
  $('#lines').innerHTML=ids.length?ids.map(id=>{const i=find(bid(id)),q=S.cart[id],sx=lineSfx(id);
    return`<div class="ln"><div class="th">${thumb(i)}</div><div class="in"><div>${esc(i.name)}</div><small>x ${q}${sx?' · '+esc(sx):''}${isB(i)?' · '+esc(bdLbl(i.bundle)):''}</small><b>${money(linePrice(id)*q)}</b></div>
    <span class="qty"><button onclick="chg('${esc(id).replace(/'/g,"\\'")}',-1)">−</button><span>${q}</span><button onclick="chg('${esc(id).replace(/'/g,"\\'")}',1)" ${q>=maxQty(i,id)?'disabled':''}>+</button></span></div>`}).join('')
    :'<div class="empty" style="padding:30px 0">Keranjang kosong.<br>Pilih menu untuk memulai.</div>';
  {const ot=$('#otype');if(![...ot.options].some(x=>x.value===S.type))S.type='Takeaway';ot.value=S.type}
  $('#otype').value=S.type;$('#dType').value=S.dType;$('#dVal').value=S.dVal;
  totals();
}
function totals(){
  const c=calc(),n=Object.values(S.cart).reduce((a,b)=>a+b,0);
  $('#sSub').textContent=money(c.sub);$('#sTaxL').textContent=`Pajak (${db.set.tax}%)`;$('#sTax').textContent=money(c.tax);
  $('#sDisc').textContent='− '+money(c.disc);$('#sTot').textContent=money(c.total);
  {const r=$('#sPromoR');if(r){r.hidden=!c.promo;if(c.promo){$('#sPromoN').textContent='Promo: '+c.promo.name+(c.promo.code?' ('+c.promo.code+')':'');$('#sPromoV').textContent='− '+money(c.pd)}}
   const hb=$('#holdBtn');if(hb){const h=holdsOpen().length;hb.textContent='Tahanan'+(h?' ('+h+')':'')}}
  if(window.P2&&P2.cdPush)P2.cdPush();
  noteUI();
  $('#placeBtn').disabled=!n;$('#fabN').innerHTML=`<i class="ic" data-ic="cart"></i>${n} item`;$('#fabT').textContent=money(c.total);
}
function clearCart(){S.cart={};S.cm={};S.note='';S.dVal=0;S.promoId=null;{const e=$('#pcode');if(e)e.value=''}renderGrid();renderInvoice()}
/* ---------- payment & receipt ---------- */
/* ---------- tahan pesanan ---------- */
const holdsOpen=()=>(db.holds||[]).filter(h=>!h.del);
function holdAsk(){
  if(!Object.keys(S.cart).length){toast('Keranjang kosong');return}
  openModal(`<h3>Tahan Pesanan</h3><p class="hint" style="margin:0 0 8px">Pesanan disimpan dulu dan bisa dilanjutkan dari perangkat mana pun.</p>
  <div class="two"><div><label class="fl">Nama pelanggan</label><input class="fi" id="hCust" maxlength="40" placeholder="Opsional"></div>
  <div><label class="fl">No. meja</label><input class="fi" id="hTbl" maxlength="12" autocapitalize="characters" placeholder="Mis. 7" style="font-weight:700"></div></div>
  <button class="btn" onclick="holdSave()">Simpan Tahanan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
}
function holdSave(){
  const now=Date.now();
  db.holds.unshift({id:'h'+now.toString(36)+Math.random().toString(36).slice(2,5),t:new Date(now).toISOString(),u:now,by:(CL.on&&CL.me)?CL.me.name:'',tbl:($('#hTbl').value||'').trim().slice(0,12),cust:$('#hCust').value.trim(),type:S.type,cart:{...S.cart},cm:JSON.parse(JSON.stringify(S.cm||{})),dType:S.dType,dVal:S.dVal,pid:S.promoId||null,note:S.note||''});
  S.cart={};S.cm={};S.note='';S.dVal=0;S.promoId=null;save();closeModal();renderGrid();renderInvoice();renderCats();toast('Pesanan ditahan')
}
function holdTotal(h){let t=0;for(const k in h.cart){const i=find(bid(k));if(!i)continue;const m=(h.cm||{})[k];t+=(i.price+(m?m.sel.reduce((a,x)=>a+(+x.p||0),0):0))*h.cart[k]}return t}
function holdList(){
  const l=holdsOpen();
  openModal(`<h3>Pesanan Ditahan</h3>`+(l.length?l.map(h=>`<div class="tbo"><div class="tbh"><b>${h.tbl?'Meja '+esc(h.tbl)+' · ':''}${esc(h.cust||'Tanpa nama')}</b><span class="pst w">${Object.values(h.cart).reduce((a,b)=>a+b,0)} item</span></div>
    <small>${esc(ago(h.t))}${h.by?' · '+esc(h.by):''} · ${money(holdTotal(h))}</small>
    <div class="acts" style="margin-top:8px"><button class="btn sm" onclick="holdResume('${h.id}')">Lanjutkan</button><button class="btn sm sec" onclick="holdDel('${h.id}')">Hapus</button></div></div>`).join(''):'<p class="hint">Belum ada pesanan yang ditahan.</p>')+`<button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
function holdResume(id){
  const h=db.holds.find(x=>x.id===id);if(!h||h.del)return;
  if(Object.keys(S.cart).length&&!confirm('Keranjang saat ini akan diganti dengan pesanan tahanan. Lanjutkan?'))return;
  S.cart={...h.cart};S.cm=JSON.parse(JSON.stringify(h.cm||{}));S.type=h.type||S.type;S.dType=h.dType||'%';S.dVal=h.dVal||0;S.promoId=h.pid||null;S.note=h.note||'';{const e=$('#pcode');const p=h.pid&&db.promos.find(x=>x.id===h.pid);if(e)e.value=p&&p.code||''}S.holdMeta={tbl:h.tbl,cust:h.cust};
  h.del=1;h.u=Date.now();save();closeModal();go('pos');renderGrid();renderInvoice();renderCats();toast('Pesanan dilanjutkan')
}
function holdDel(id){const h=db.holds.find(x=>x.id===id);if(!h)return;if(!confirm('Hapus pesanan tahanan ini?'))return;h.del=1;h.u=Date.now();save();holdList();renderInvoice()}
function applyCode(v){
  v=String(v||'').trim().toUpperCase();const e=$('#pcode');
  if(!v){S.promoId=null;renderInvoice();return}
  const c=calc(),p=db.promos.find(x=>!x.del&&x.code&&String(x.code).toUpperCase()===v);
  if(!p){toast('Kode promo tidak dikenal');S.promoId=null;if(e)e.value='';renderInvoice();return}
  if(!promoOk(p,c.sub+c.pd)){toast('Promo tidak berlaku saat ini / belanja belum cukup');S.promoId=null;if(e)e.value='';renderInvoice();return}
  S.promoId=p.id;renderInvoice();toast('Promo dipakai: '+p.name)
}
/* ---------- member ---------- */
const memOpen=()=>(db.members||[]).filter(m=>!m.del);
function memSearch(q){
  q=String(q||'').trim().toLowerCase();const r=$('#pMemR');if(!r)return;
  if(!q){r.innerHTML='';return}
  const l=memOpen().filter(m=>(m.name||'').toLowerCase().includes(q)||String(m.phone||'').includes(q)).slice(0,5);
  r.innerHTML=l.map(m=>`<button type="button" class="li" onclick="memPick('${m.id}')"><span class="l"><b>${esc(m.name)}</b><small>${esc(m.phone||'')} · ${m.pts||0} poin</small></span></button>`).join('')||`<button type="button" class="li" onclick="memQuickNew()"><span class="l"><b>+ Daftarkan "${esc(q)}" sebagai member baru</b></span></button>`;
}
function memQuickNew(){
  const q=($('#pMemQ').value||'').trim();if(!q)return;const ph=/^[0-9+\\-\\s]{6,}$/.test(q);
  const m={id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:ph?'Member '+q:q,phone:ph?q:'',pts:0,visits:0,spent:0,t:new Date().toISOString(),u:Date.now()};
  db.members.unshift(m);save();memPick(m.id)
}
function memPick(id){
  const m=db.members.find(x=>x.id===id);if(!m)return;S.pay.mem=id;S.pay.redeem=false;S.pay.rd=0;
  $('#pMemR').innerHTML='';$('#pMemQ').value='';payMemUI();payRefresh()
}
function memClear(){S.pay.mem=null;S.pay.redeem=false;S.pay.rd=0;payMemUI();payRefresh()}
function memRedeem(on){S.pay.redeem=!!on;payRefresh()}
function payMemUI(){
  const e=$('#pMemSel');if(!e)return;const m=S.pay.mem&&db.members.find(x=>x.id===S.pay.mem);
  if(!m){e.innerHTML='';return}
  const pv=+db.set.ptsVal||0;
  e.innerHTML=`<div class="chg" style="margin:6px 0"><span><b>${esc(m.name)}</b> · ${m.pts||0} poin</span><button type="button" class="mini" onclick="memClear()">Ganti</button></div>${(m.pts>0&&pv>0)?`<label class="tgl"><input type="checkbox" id="pRd" ${S.pay.redeem?'checked':''} onchange="memRedeem(this.checked)"><span>Tukar poin (1 poin = ${money(pv)})<small id="pRdT"></small></span></label>`:''}`;
}
/* ---------- pembayaran ---------- */
const PAY_M=['Tunai','Kartu','QRIS','E-Wallet'];
function payTotals(){
  const c=calc(),P=S.pay||{};let rd=0,pts=0;
  const m=P.mem&&db.members.find(x=>x.id===P.mem),pv=+db.set.ptsVal||0;
  if(m&&P.redeem&&pv>0){pts=Math.min(+m.pts||0,Math.floor(c.total/pv));rd=rnd(pts*pv)}
  const total=rnd(Math.max(0,c.total-rd)),tip=rnd(Math.max(0,+P.tip||0));
  const gc=P.gift&&(db.gifts||[]).find(g=>g.id===P.gift&&!g.del),gv=gc?Math.min(+gc.bal||0,rnd(total+tip)):0;
  return{c,rd,pts,total,tip,gv,gc:gc||null,payable:rnd(total+tip-gv),mem:m||null};
}
function invCfg(){const c=Object.assign({},INV_DEF,(db.set&&db.set.inv)||{});if(!Array.isArray(c.qn))c.qn=INV_DEF.qn;return c}
function noteUI(){
  const r=$('#noteR'),b=$('#noteB');if(!r||!b)return;const c=invCfg();r.hidden=!c.note;
  const n=(S.note||'').trim();b.textContent=n?n:'+ Tambah';b.classList.toggle('has',!!n);
}
function noteEdit(){
  const c=invCfg();
  openModal(`<h3>Catatan pesanan</h3>
  ${c.qn.length?`<div class="chips qn">${c.qn.map((q,i)=>`<button type="button" class="chip" onclick="noteChip(${i})">${esc(q)}</button>`).join('')}</div>`:''}
  <textarea class="fi" id="nTxt" rows="3" maxlength="120" placeholder="Mis. tambah saus, tanpa es" style="height:auto;padding:12px 14px">${esc(S.note||'')}</textarea>
  <button class="btn" onclick="noteSave()">Simpan</button>
  <div class="two2"><button class="btn sec" onclick="closeModal()">Batal</button>${S.note?'<button class="btn sec" onclick="S.note=\'\';noteSave(1)">Hapus</button>':''}</div>`);
  setTimeout(()=>{const e=$('#nTxt');if(e)e.focus()},60);
}
function noteChip(i){
  const e=$('#nTxt'),q=invCfg().qn[i];if(!e||!q)return;
  const v=e.value.trim();if(v.toLowerCase().split(/,\s*/).includes(q.toLowerCase()))return;
  e.value=(v?v.replace(/[,\s]+$/,'')+', ':'')+q;e.focus()
}
function noteSave(clr){
  if(!clr)S.note=(($('#nTxt')||{}).value||'').trim().slice(0,120);
  closeModal();noteUI()
}
function payForm(){
  if(db.set.shiftReq&&can('shift')&&window.shiftCur&&!shiftCur()){toast('Buka shift kasir dulu');go('shift');return}
  const co=S.coId?CO.list.find(x=>x.id===S.coId):null,cf=invCfg(),isO=isOnl(co);
  const pre=isO?'QRIS':(PAY_M.includes(cf.pm)?cf.pm:'Tunai');
  S.pay={m:pre,paid:0,split:false,parts:[],tip:0,mem:null,redeem:false,rd:0};
  const t=payTotals();S.pay.paid=t.payable;
  const multi=Object.keys(S.cart).length>1||Object.values(S.cart).some(q=>q>1);
  const ex=[];
  if(cf.gift)ex.push(`<label class="fl">Kartu hadiah</label><div style="display:flex;gap:8px"><input class="fi" id="pGift" placeholder="Kode kartu" autocapitalize="characters" autocomplete="off" style="flex:1;min-width:0"><button type="button" class="btn sec" style="width:auto;margin:0" onclick="P2.giftUse()">Pakai</button></div><div id="pGiftR" class="hint"></div>`);
  if(cf.mem)ex.push(`<label class="fl">Member</label><input class="fi" id="pMemQ" placeholder="Cari nama / no. HP member" oninput="memSearch(this.value)" autocomplete="off"><div id="pMemR"></div><div id="pMemSel"></div>`);
  if(cf.tip||cf.split)ex.push(`<div class="two">${cf.tip?`<div><label class="fl">Tip</label><input class="fi" id="pTip" type="number" step="any" min="0" oninput="S.pay.tip=+this.value||0;payRefresh()"></div>`:''}${cf.split?`<div><label class="fl">Bagi rata</label><input class="fi" id="pSplitN" type="number" min="1" max="30" placeholder="Orang" oninput="payRefresh()"></div>`:''}</div>`);
  if(cf.split&&multi)ex.push(`<button type="button" class="btn sec sm" style="margin:8px 0 0;width:100%" onclick="P2.splitForm()">Pisah tagihan per item</button>`);
  const names=[cf.gift&&'Kartu hadiah',cf.mem&&'Member',cf.tip&&'Tip',cf.split&&'Bagi rata'].filter(Boolean).join(' · ');
  const hm=S.holdMeta||{};
  openModal(`<div class="payw"><div class="pbody"><h3>Pembayaran</h3><div class="big" id="pTot">${money(t.payable)}</div><small class="hint" id="pSub" style="display:block;text-align:center;min-height:14px"></small>
  ${(cf.cust||cf.tbl)?`<div class="two">${cf.cust?`<input class="fi" id="pCust" aria-label="Nama pelanggan" placeholder="Pelanggan" value="${esc(hm.cust||'')}">`:''}${cf.tbl?`<input class="fi" id="pTbl" aria-label="No. meja" maxlength="12" inputmode="text" autocapitalize="characters" placeholder="No. meja" style="font-weight:700" value="${esc(hm.tbl||'')}">`:''}</div>`:''}
  ${cf.note?`<input class="fi" id="pNote" aria-label="Catatan" maxlength="120" placeholder="Catatan (mis. tambah saus)" value="${esc(S.note||'')}" oninput="S.note=this.value.trim().slice(0,120);noteUI()">`:''}
  ${ex.length?`<details class="pmore"${cf.more?' open':''}><summary>Opsi tambahan<small>${esc(names)}</small></summary><div class="pmb">${ex.join('')}</div></details>`:''}
  <div class="chips pmeth" id="pM">${PAY_M.map(m=>`<button class="chip ${m===pre?'on':''}" data-m="${m}" onclick="setM('${m}')">${m}</button>`).join('')}<button class="chip" id="pSplitB" onclick="paySplit(!S.pay.split)">Gabungan</button></div>
  ${isO?`<div class="chg ${co.pst===2?'':'neg'}" style="margin:8px 0"><span>${co.pst===2?'<i class="ic" data-ic="card"></i>Pelanggan membayar lewat QRIS, sudah Anda konfirmasi.':co.pst===1?'<i class="ic" data-ic="card"></i>Pelanggan mengaku sudah bayar lewat QRIS. Cek mutasi dulu sebelum lanjut.':'<i class="ic" data-ic="card"></i>Pelanggan memilih QRIS tetapi belum menandai sudah bayar.'}</span></div>`:''}
  <div id="cashBox" style="${pre==='Tunai'?'':'display:none'}"><input class="fi" id="pPaid" type="number" step="any" min="0" aria-label="Uang diterima" placeholder="Uang diterima" value="${t.payable}" oninput="payRefresh()">
  <div class="chips qk"><button class="chip" onclick="quick(payTotals().payable)">Uang Pas</button>${quickAmts().map(v=>`<button class="chip" onclick="quick(${v})">${amtLbl(v)}</button>`).join('')}</div></div>
  <div id="splitBox" style="display:none"></div></div>
  <div class="payf"><div class="chg" id="pChg"><span>Kembalian</span><span>${money(0)}</span></div>
  <div class="pbtn"><button class="btn sec" onclick="closeModal()">Batal</button><button class="btn" id="payOk" onclick="checkout()">Bayar & Cetak Struk</button></div></div></div>`);
  payRefresh();
}
function setM(m){S.pay.m=m;if(S.pay.split)paySplit(false);document.querySelectorAll('#pM .chip[data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===m));$('#cashBox').style.display=m==='Tunai'?'':'none';if(m!=='Tunai')S.pay.paid=payTotals().payable;payRefresh()}
function quick(v){$('#pPaid').value=v;payRefresh()}
function paySplit(on){
  S.pay.split=!!on;
  document.querySelectorAll('#pM .chip[data-m]').forEach(b=>b.classList.toggle('on',!on&&b.dataset.m===S.pay.m));$('#pSplitB').classList.toggle('on',!!on);
  $('#cashBox').style.display=(!on&&S.pay.m==='Tunai')?'':'none';$('#splitBox').style.display=on?'':'none';
  if(on&&!S.pay.parts.length)S.pay.parts=[{m:'Tunai',amt:0},{m:'QRIS',amt:0}];
  if(on)splitRows();payRefresh()
}
function splitRows(){
  $('#splitBox').innerHTML=S.pay.parts.map((p,i)=>`<div class="spr"><select class="fi" onchange="S.pay.parts[${i}].m=this.value;payRefresh()">${PAY_M.map(m=>`<option ${m===p.m?'selected':''}>${m}</option>`).join('')}</select><input class="fi" type="number" step="any" min="0" value="${p.amt||''}" placeholder="Jumlah" oninput="S.pay.parts[${i}].amt=+this.value||0;payRefresh()">${S.pay.parts.length>2?`<button type="button" class="mini" onclick="S.pay.parts.splice(${i},1);splitRows();payRefresh()">✕</button>`:''}</div>`).join('')+`<button type="button" class="mini" onclick="S.pay.parts.push({m:'Tunai',amt:0});splitRows()">+ Tambah metode</button><button type="button" class="mini" onclick="splitFill()">Isi sisa ke baris terakhir</button>`;
}
function splitFill(){const t=payTotals(),P=S.pay.parts;if(!P.length)return;const o=P.slice(0,-1).reduce((a,p)=>a+(+p.amt||0),0);P[P.length-1].amt=Math.max(0,rnd(t.payable-o));splitRows();payRefresh()}
function payCalc(){
  const t=payTotals(),P=S.pay;let paid,change,cash=0,valid=true,pays=null,method=P.m;
  if(P.split){
    pays=P.parts.filter(p=>+p.amt>0).map(p=>({m:p.m,amt:rnd(+p.amt)}));paid=rnd(pays.reduce((a,p)=>a+p.amt,0));
    const cs=pays.filter(p=>p.m==='Tunai').reduce((a,p)=>a+p.amt,0),nc=paid-cs;change=rnd(paid-t.payable);
    valid=pays.length>0&&paid>=t.payable&&nc<=t.payable&&change<=cs;cash=rnd(cs-Math.max(0,change));
    method=new Set(pays.map(p=>p.m)).size===1?pays[0].m:'Gabungan';
  }else{
    paid=P.m==='Tunai'?(+($('#pPaid')||{}).value||0):t.payable;change=rnd(paid-t.payable);valid=change>=0;cash=P.m==='Tunai'?t.payable:0;
  }
  return{t,paid,change,cash,valid,pays,method};
}
function payRefresh(){
  if(!S.pay||!$('#pTot'))return;
  const r=payCalc(),t=r.t;S.pay.paid=r.paid;
  $('#pTot').textContent=money(t.payable);
  const sub=[];if(t.rd)sub.push('Tukar poin −'+money(t.rd));if(t.tip)sub.push('Tip '+money(t.tip));if(t.gv)sub.push('Kartu hadiah −'+money(t.gv));const n=+(($('#pSplitN')||{}).value)||0;if(n>1)sub.push('Bagi '+n+' orang: '+money(Math.ceil(t.payable/n))+'/orang');
  $('#pSub').textContent=sub.join(' · ');
  const rt=$('#pRdT');if(rt){const m=t.mem;rt.textContent=m?' — memakai '+t.pts+' poin':''}
  const el=$('#pChg');el.classList.toggle('neg',!r.valid);
  el.innerHTML=r.change<0?`<span>Kurang</span><span>${money(-r.change)}</span>`:(r.valid?`<span>Kembalian</span><span>${money(Math.max(0,r.change))}</span>`:`<span>Periksa jumlah pembayaran</span><span></span>`);
  $('#payOk').disabled=!r.valid;
}
function calcChange(){payRefresh()}
function checkout(){
  const ids=Object.keys(S.cart).filter(id=>find(bid(id)));
  if(!ids.length)return;
  const r=payCalc(),t=r.t,c=t.c;
  if(!r.valid){toast('Pembayaran belum sesuai');return}
  {const u=cartUse();for(const k in u){const x=find(k);if(!x||u[k]>x.stock){toast((x?x.name:'Item')+': stok tidak cukup');return}}}
  {const lm=(typeof planLimitMsg==='function')?planLimitMsg():'';if(lm){planLimitDlg(lm);return}}   // batas transaksi paket
  const now=new Date(),pad=n=>String(n).padStart(2,'0');
  const no=`INV-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${CL.on?devTag()+'-':''}${String(db.seq).padStart(4,'0')}`;
  const mem=t.mem,earn=mem&&(+db.set.ptsPer>0)?Math.floor(t.total/(+db.set.ptsPer)):0;
  const o={no,t:now.toISOString(),type:S.type,cust:((($('#pCust')||{}).value||'').trim())||(mem?mem.name:''),tbl:((($('#pTbl')||{}).value||'')).trim().slice(0,12),cashier:(CL.on&&CL.me)?CL.me.name:'',
    lines:ids.map(id=>{const i=find(bid(id)),sx=lineSfx(id),l={id:bid(id),name:i.name+(sx?' ('+sx+')':''),bn:i.name,price:linePrice(id),cost:i.cost||0,qty:S.cart[id]};if(sx)l.mods=(S.cm[id]||{}).sel;if(isB(i))l.bd=i.bundle.map(c=>{const x=find(c.id);return{id:c.id,q:c.q,name:x?x.name:''}});return l}),
    sub:c.sub,disc:rnd(c.disc+t.rd),tax:c.tax,taxRate:db.set.tax,total:t.total,method:r.method,paid:r.paid,change:Math.max(0,r.change),cashIn:r.cash};
  {const nt=(S.note||'').trim().slice(0,120);if(nt)o.note=nt}
  if(t.tip)o.tip=t.tip;if(r.pays&&r.pays.length>1)o.pays=r.pays;
  if(c.promo)o.promo={id:c.promo.id,name:c.promo.name,code:c.promo.code||'',amt:c.pd};
  if(mem)o.mem={id:mem.id,name:mem.name,earn,used:t.pts};
  if(t.gv&&t.gc){o.gift={id:t.gc.id,code:t.gc.code,amt:t.gv};if(t.payable===0)o.method='Kartu Hadiah';t.gc.bal=rnd((+t.gc.bal||0)-t.gv);t.gc.hist=t.gc.hist||[];t.gc.hist.unshift({t:o.t,d:-t.gv,note:'Belanja '+no});t.gc.u=Date.now()}
  const sh=(typeof shiftCur==='function')?shiftCur():null;if(sh)o.sh=sh.id;
  ids.forEach(id=>{const i=find(bid(id)),q=S.cart[id];
    if(isB(i))i.bundle.forEach(c=>{const x=find(c.id);if(x){const d=Math.round(c.q*q*1000)/1000;x.stock=Math.round((x.stock-d)*1000)/1000;logAdd(x.name,-d,(i.rc?'Resep ':'Penjualan ')+no+' ('+q+'× '+i.name+')',x.stock,o.t)}});
    else{i.stock-=q;logAdd(i.name,-q,'Penjualan '+no,i.stock,o.t)}});
  if(mem){mem.pts=Math.max(0,(+mem.pts||0)-t.pts+earn);mem.visits=(+mem.visits||0)+1;mem.spent=rnd((+mem.spent||0)+t.total);mem.last=o.t;mem.u=Date.now()}
  if(o.tbl){const lim2=Date.now()-3*864e5;db.occ=db.occ.filter(x=>(+x.u||0)>lim2);db.occ.unshift({id:'t'+no,tbl:o.tbl,no,total:o.total,by:o.cashier||'',cust:o.cust||'',t:o.t,u:Date.now()})}
  if(db.set.kdsOn){const lim=Date.now()-2*864e5;db.kds=db.kds.filter(k=>(+k.u||0)>lim);db.kds.unshift({id:'k'+no,no,t:o.t,tbl:o.tbl,cust:o.cust,lines:o.lines.map(l=>({id:l.id,name:l.name,qty:l.qty})),note:o.note||'',st:0,u:Date.now()})}
  db.log=db.log.slice(0,LOG_MAX);db.orders.unshift(o);db.seq++;save();
  coLink(no);
  S.cart={};S.cm={};S.note='';S.dVal=0;S.promoId=null;S.holdMeta=null;{const e=$('#pcode');if(e)e.value=''}
  if(S.rest){S.cart=S.rest.cart;S.cm=S.rest.cm;S.holdMeta=S.rest.meta;S.rest=null;setTimeout(()=>toast('Sisa tagihan kembali ke keranjang'),600)}
  renderGrid();renderInvoice();renderCats();
  showReceipt(o,true);
  kitchenAuto(o);   // tiket dapur/bar (tidak menghalangi struk)
}
function fmtDT(o){const d=new Date(o.t);return d.toLocaleDateString(dloc())+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')}
/* Model struk: satu sumber untuk tampilan HTML (preview/print browser) dan ESC/POS (printer thermal) */
/* nama kasir di struk: otomatis nama akun yang melakukan transaksi; teks manual hanya cadangan (atau pengganti bila otomatis dimatikan) */
function rcCashier(o,r){return r.cashierAuto===false?(r.cashier||o.cashier||''):(o.cashier||r.cashier||'')}
function receiptModel(o){
  if(o.ticket)return ticketModel(o);
  const s=db.set,r=s.rc,m=[],n=fmtNum;
  const hr=()=>{if(r.divider!=='none')m.push({t:'hr'})};
  if(r.showLogo&&db.set.logo)m.push({t:'logo'});
  m.push({t:'text',x:s.store,a:r.align,b:true,big:true});
  if(r.showAddr&&s.addr)m.push({t:'text',x:s.addr,a:r.align});
  if(r.line1)m.push({t:'text',x:r.line1,a:r.align});
  hr();
  if(r.showTable!==false&&o.tbl){m.push({t:'text',x:tr('MEJA')+' '+o.tbl,a:'center',b:true,huge:r.tableSize==='l'?2:3});hr()}
  const cash=rcCashier(o,r),hasInfo=r.showNo||r.showDate||r.showType||(r.showCust&&o.cust)||(r.showCashier&&cash);
  if(r.showNo)m.push({t:'row',l:'No',r:o.no});
  if(r.showDate)m.push({t:'row',l:tr('Tanggal'),r:fmtDT(o)});
  if(r.showType)m.push({t:'row',l:tr('Tipe'),r:tr(o.type)});
  if(r.showCust&&o.cust)m.push({t:'row',l:tr('Pelanggan'),r:o.cust});
  if(r.showCashier&&cash)m.push({t:'row',l:tr('Kasir'),r:cash});
  if(hasInfo)hr();
  o.lines.forEach(l=>{
    if(r.itemLayout==='one')m.push({t:'row',l:l.qty+'x '+l.name,r:n(l.qty*l.price)});
    else{m.push({t:'text',x:l.name,a:'left'});m.push({t:'row',l:'  '+l.qty+' x '+n(l.price),r:n(l.qty*l.price)})}
  });
  hr();
  if(o.note&&invCfg().noteRc){m.push({t:'text',x:tr('Catatan')+': '+o.note,a:'left'});hr()}
  m.push({t:'row',l:tr('Subtotal'),r:money(o.sub)});
  if(r.showDisc&&o.disc)m.push({t:'row',l:tr('Diskon'),r:'-'+money(o.disc)});
  if(r.showTax)m.push({t:'row',l:tr('Pajak ('+o.taxRate+'%)'),r:money(o.tax)});
  m.push({t:'row',l:tr('TOTAL'),r:money(o.total),b:true,big:r.bigTotal});
  if(o.tip)m.push({t:'row',l:'Tip',r:money(o.tip)});
  if(r.showPay){hr();if(Array.isArray(o.pays))o.pays.forEach(p=>m.push({t:'row',l:tr('Bayar ('+p.m+')'),r:money(p.amt)}));else m.push({t:'row',l:tr('Bayar ('+o.method+')'),r:money(o.paid)});m.push({t:'row',l:tr('Kembali'),r:money(o.change)})}
  if(o.mem){hr();m.push({t:'text',x:'Member: '+o.mem.name,a:'center'});m.push({t:'text',x:'Poin +'+(o.mem.earn||0)+(o.mem.used?' / dipakai '+o.mem.used:''),a:'center'})}
  if((r.showFooter&&s.foot)||r.line2||r.showQr){
    hr();
    if(r.showFooter&&s.foot)m.push({t:'text',x:s.foot,a:'center'});
    if(r.line2)m.push({t:'text',x:r.line2,a:'center'});
    if(r.showQr)m.push({t:'qr',x:coUrl(''),cap:r.qrText});
  }
  return m;
}
function receiptHTML(o,prev){
  const s=db.set,r=s.rc,fs={small:11,normal:12,large:14}[r.font]||12;
  const h=receiptModel(o).map(e=>{
    if(e.t==='logo')return`<img src="${imgSrc(db.set.logo)}" alt="" style="width:${r.logoW}px;max-width:90%">`;
    if(e.t==='hr')return`<hr class="${r.divider==='equal'?'equal':''}">`;
    if(e.t==='qr')return`<div class="rq">${e.cap?`<div class="rqc">${esc(e.cap)}</div>`:''}${qrSvg(e.x,150)}</div>`;
    if(e.t==='text'&&e.huge){const em=Math.min(e.huge===3?3.4:2.3,Math.max(1.3,(e.huge===3?26:17)/Math.max(6,String(e.x).length)));return`<div class="rtb" style="font-size:${em.toFixed(2)}em">${esc(e.x)}</div>`}
    if(e.t==='text')return`<div style="text-align:${e.a||'left'};${e.b?'font-weight:700;':''}${e.big?'font-size:1.3em;':''}">${esc(e.x)}</div>`;
    return`<div class="r${e.b?' b':''}${e.big?' big':''}"><span>${esc(e.l)}</span><span>${esc(e.r)}</span></div>`;
  }).join('');
  return`<div ${prev?'':'id="receipt" '}class="rcpt ${s.paper==='58'?'p58':''}" style="font-size:${fs}px">${h}</div>`;
}
function showReceipt(o,fresh){
  S.rcOrder=o;S.rcFresh=!!fresh;setPageSize();
  openModal(`<h3>Struk</h3><div class="rc-wrap">${receiptHTML(o)}</div>
  <div class="rcb"><button class="btn sec" onclick="${fresh?'newTx()':'closeModal()'}">${fresh?'Selesai':'Tutup'}</button>
  <button class="btn" onclick="printReceipt(S.rcOrder)"><i class="ic" data-ic="print"></i>Cetak Struk</button></div>`);
  if(fresh&&db.set.prn.auto)setTimeout(()=>printReceipt(o),250);
}
function setPageSize(){$('#pageStyle').textContent=`@media print{@page{size:${db.set.paper}mm auto;margin:0}}`}
/* ---------- konfirmasi kustom (confirm() bawaan diblokir di banyak sandbox/webview) ---------- */
function ask(title,msg,yes,fn){
  S.askFn=fn;
  openModal(`<h3>${esc(title)}</h3><p style="margin:0 0 6px;color:var(--mu);line-height:1.5">${esc(msg)}</p>
  <button class="btn del" onclick="askYes()">${esc(yes||'Ya')}</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
}
function askYes(){const f=S.askFn;S.askFn=null;closeModal();if(f)f()}
/* ---------- alur transaksi baru ---------- */
function backToPos(){S.q='';const q=$('#q');if(q)q.value='';closeModal();go('pos')}
function afterPrint(){
  if(S.rcFresh&&db.set.prn.autoNew){S.rcFresh=false;backToPos();toast('Transaksi selesai. Siap untuk transaksi baru.')}
}
function newTx(){S.rcFresh=false;backToPos()}

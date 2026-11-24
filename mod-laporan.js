/* ---------- Laporan harian ke WhatsApp (ringkasan teks + Excel) lewat Edge Function daily-report ---------- */
const RPT={busy:0};
const rptCfg=()=>Object.assign({on:false,time:'22:00',last:''},db.set.rpt||{},{phone:db.set.wa||''});
function rptSet(k,v){db.set.rpt=Object.assign(rptCfg(),{[k]:v});save();if(k==='on')rptDraw()}
/* data satu hari: ringkasan, rincian pesanan, produk terlaris, stok menipis */
function rptData(day){
  const l=db.orders.filter(o=>dkey(o.t)===day),sum=a=>a.reduce((x,y)=>x+y,0),rev=sum(l.map(o=>+o.total||0));
  const by={},pm={};l.forEach(o=>{pm[o.method||'-']=(pm[o.method||'-']||0)+(+o.total||0);(o.lines||[]).forEach(x=>{const k=x.bn||x.name;by[k]=by[k]||{q:0,r:0};by[k].q+=+x.qty||0;by[k].r+=(+x.price||0)*(+x.qty||0)})});
  const top=Object.keys(by).map(k=>[k,by[k].q,by[k].r]).sort((a,b)=>b[1]-a[1]);
  const low=db.items.filter(i=>!isB(i)&&(+i.stock||0)<=(+i.min>=0&&i.min!==''&&i.min!=null?+i.min:+db.set.low||0));
  return{l,rev,pm,top,low,cost:sum(l.map(o=>sum((o.lines||[]).map(x=>(+x.cost||0)*(+x.qty||0)))))};
}
function rptText(day){
  const d=rptData(day),m=money,s=db.set;
  let t=`*Laporan ${s.store||'Toko'}* — ${day}\n\nTransaksi: ${d.l.length}\nOmzet: ${m(d.rev)}\nLaba kotor: ${m(d.rev-d.cost)}\n`;
  const pk=Object.keys(d.pm);if(pk.length)t+='\nPer metode bayar:\n'+pk.map(k=>`• ${k}: ${m(d.pm[k])}`).join('\n')+'\n';
  if(d.top.length)t+='\nTerlaris:\n'+d.top.slice(0,5).map((x,i)=>`${i+1}. ${x[0]} ×${x[1]}`).join('\n')+'\n';
  if(d.low.length)t+=`\nStok menipis (${d.low.length}):\n`+d.low.slice(0,10).map(i=>`• ${i.name}: ${+i.stock||0}`).join('\n')+'\n';
  return t.trim();
}
function rptXlsx(day){
  const d=rptData(day),n=v=>({n:+v||0}),H=a=>a;
  const sales=[['No','Waktu','Tipe','Pelanggan','Kasir','Metode','Total']].concat(d.l.map(o=>[o.no,new Date(o.t).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),o.type||'',o.cust||'',o.cashier||'',o.method||'',n(o.total)]));
  const top=[['Menu','Jumlah','Penjualan']].concat(d.top.map(x=>[x[0],n(x[1]),n(x[2])]));
  const stok=[['Nama','Kategori','Stok','Minimum']].concat(db.items.filter(i=>!isB(i)).map(i=>[i.name,i.cat||'',n(i.stock),n(i.min)]));
  const X=(nm,rows,w)=>[nm,xlsxBuild([{name:nm,rows,head:1,w}],dec())];
  return[X('penjualan',H(sales),[12,9,10,18,14,12,14]),X('terlaris',top,[30,10,14]),X('stok',stok,[30,16,10,10])];
}
const rptB64=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(String(f.result).split(',')[1]||'');f.readAsDataURL(b)});
async function rptSend(auto){
  const c=rptCfg(),C=window.POS_SB;
  if(RPT.busy)return;
  if(!/^\+?\d{8,15}$/.test(c.phone.replace(/[\s-]/g,''))){if(!auto)toast('Isi Nomor WhatsApp toko dulu');return}
  if(!(C&&C.url&&CL.on&&CL.tok)){if(!auto)toast('Perlu login online');return}
  RPT.busy=1;const day=dkey(new Date());
  try{
    const files=[];for(const x of rptXlsx(day))files.push({name:x[0]+'-'+day+'.xlsx',file:await rptB64(x[1])});
    const r=await fetch(C.url+'/functions/v1/daily-report',{method:'POST',headers:{'Content-Type':'application/json',apikey:C.key||''},body:JSON.stringify({t:CL.tok,phone:c.phone,text:rptText(day),files})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||'Gagal mengirim');
    rptSet('last',day);if(!auto)toast('Laporan terkirim ke WhatsApp');
  }catch(e){if(!auto)toast(e instanceof TypeError?'Fungsi daily-report belum di-deploy atau tidak ada koneksi':e.message||'Gagal mengirim')}
  RPT.busy=0;rptDraw();
}
/* kirim otomatis sekali per hari setelah jam tutup, selama aplikasi terbuka (shortcut: tidak jalan saat aplikasi ditutup, upgrade: pg_cron di server) */
setInterval(()=>{const c=rptCfg(),n=new Date();if(!c.on||!window.CL||!CL.on||!CL.tok)return;if(c.last!==dkey(n)&&/^\d\d:\d\d$/.test(c.time)&&n.getHours()*60+n.getMinutes()>=(+c.time.slice(0,2))*60+(+c.time.slice(3)))rptSend(1)},60000);
function rptDraw(){
  const b=document.getElementById('rptBox');if(!b)return;const c=rptCfg();
  b.innerHTML=`<h3 style="margin-top:18px">Laporan WhatsApp</h3>
  <label class="tgl"><input type="checkbox" ${c.on?'checked':''} onchange="rptSet('on',this.checked)"><span>Kirim otomatis setelah jam tutup</span></label>
  <p class="hint">Dikirim ke: ${c.phone?esc(c.phone):'isi Nomor WhatsApp toko di atas lalu Simpan'}</p>
  <label class="fl">Jam tutup</label><input class="fi" type="time" value="${esc(c.time)}" onchange="rptSet('time',this.value)">
  <button class="btn sec" type="button" onclick="rptSend()">Kirim sekarang</button>${c.last?`<p class="hint">Terakhir terkirim: ${esc(c.last)}</p>`:''}`;
}

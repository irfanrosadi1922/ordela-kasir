/* Ordela — modul printer: ESC/POS, koneksi, editor struk.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
/* ---------- ESC/POS builder ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ascii=t=>String(t==null?'':t).replace(/€/g,'EUR').replace(/£/g,'GBP').replace(/¥/g,'JPY').replace(/฿/g,'THB').replace(/[\u00a0\u202f]/g,' ').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\x20-\x7e]/g,'');
function wrapTxt(t,n){
  const out=[];
  String(t).split('\n').forEach(para=>{
    let line='';
    para.split(' ').forEach(w=>{
      if(line&&(line+' '+w).length>n){out.push(line);line=w}
      else line=line?line+' '+w:w;
      while(line.length>n){out.push(line.slice(0,n));line=line.slice(n)}
    });
    out.push(line);
  });
  return out;
}
function rowTxt(l,r,n){
  l=ascii(l);r=ascii(r);
  const max=n-r.length-1;
  if(l.length>max)l=l.slice(0,Math.max(0,max));
  return l+' '.repeat(Math.max(1,n-l.length-r.length))+r;
}
function imgToRaster(src,dots,w){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{
      try{
        const h=Math.max(1,Math.round(im.height*w/im.width)),c=document.createElement('canvas');
        c.width=dots;c.height=h;
        const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,dots,h);x.drawImage(im,Math.round((dots-w)/2),0,w,h);
        const img=x.getImageData(0,0,dots,h),d=img.data,bpr=dots/8,o=[0x1d,0x76,0x30,0,bpr&255,bpr>>8,h&255,h>>8];
        // Logo ber-background gelap: buang warna latar yang tersambung ke tepi,
        // agar latar menjadi putih dan simbol merah tetap tercetak hitam.
        const lum=i=>d[i]*.3+d[i+1]*.59+d[i+2]*.11;
        const corners=[0,(dots-1)*4,((h-1)*dots)*4,((h*dots)-1)*4];
        let bg=corners[0];for(const i of corners)if(lum(i)<lum(bg))bg=i;
        if(lum(bg)<100){
          const br=d[bg],bgc=d[bg+1],bb=d[bg+2],seen=new Uint8Array(dots*h),q=new Int32Array(dots*h);
          let head=0,tail=0;
          const addBg=(p)=>{if(p<0||p>=dots*h||seen[p])return;const i=p*4,dr=d[i]-br,dg=d[i+1]-bgc,db=d[i+2]-bb;if(dr*dr+dg*dg+db*db>75*75)return;seen[p]=1;q[tail++]=p};
          for(let xx=0;xx<dots;xx++){addBg(xx);addBg((h-1)*dots+xx)}
          for(let yy=1;yy<h-1;yy++){addBg(yy*dots);addBg(yy*dots+dots-1)}
          while(head<tail){const p=q[head++],i=p*4;d[i]=d[i+1]=d[i+2]=255;const xx=p%dots,yy=(p/dots)|0;if(xx)addBg(p-1);if(xx<dots-1)addBg(p+1);if(yy)addBg(p-dots);if(yy<h-1)addBg(p+dots)}
        }
        for(let y=0;y<h;y++)for(let b=0;b<bpr;b++){
          let v=0;
          for(let k=0;k<8;k++){const i=(y*dots+b*8+k)*4;if(d[i]*.3+d[i+1]*.59+d[i+2]*.11<140)v|=0x80>>k}
          o.push(v);
        }
        res(o);
      }catch(e){res([])}
    };
    im.onerror=()=>res([]);
    im.src=src;
  });
}
function qrRaster(text,dots){
  try{
    const M=qrMatrix(text),n=M.length,q=4,sc=Math.max(2,Math.floor(Math.min(dots,264)/(n+2*q))),W=(n+2*q)*sc,c=document.createElement('canvas');
    c.width=W;c.height=W;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,W);x.fillStyle='#000';
    for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(M[r][k])x.fillRect((k+q)*sc,(r+q)*sc,sc,sc);
    return imgToRaster(c.toDataURL('image/png'),dots,W);
  }catch(e){return Promise.resolve([])}
}
async function buildEscPos(o,pr){
  const s=db.set,p=pr||s.prn,r=s.rc,small=r.font==='small',large=r.font==='large',pap=(pr&&pr.paper)||s.paper;
  const dots=pap==='58'?384:576,cols=pap==='58'?(small?42:32):(small?64:48);
  const base=(small?1:0)|(large?0x10:0),out=[];
  const add=a=>{for(let i=0;i<a.length;i++)out.push(a[i])};
  const line=t=>{const a=ascii(t);for(let i=0;i<a.length;i++)out.push(a.charCodeAt(i));out.push(0x0a)};
  const mode=x=>add([0x1b,0x21,base|x]);
  const align=a=>add([0x1b,0x61,a==='center'?1:a==='right'?2:0]);
  add([0x1b,0x40,0x1b,0x4d,small?1:0]);
  for(const e of receiptModel(o)){
    if(e.t==='logo'){
      align('center');
      add(await imgToRaster(db.set.logo,dots,Math.min(r.logoW,dots)));
      out.push(0x0a);
    }else if(e.t==='qr'){
      align('center');mode(0);
      if(e.cap)wrapTxt(ascii(e.cap),cols).forEach(line);
      add(await qrRaster(e.x,dots));
      out.push(0x0a);
    }else if(e.t==='hr'){
      align('left');mode(0);line((r.divider==='equal'?'=':'-').repeat(cols));
    }else if(e.t==='text'&&e.huge){
      const t=ascii(e.x);let k=e.huge;while(k>1&&t.length*k>cols)k--;
      align('center');mode(0x08);add([0x1d,0x21,((k-1)<<4)|(k-1)]);
      wrapTxt(t,Math.max(1,Math.floor(cols/k))).forEach(line);
      add([0x1d,0x21,0]);
    }else if(e.t==='text'){
      const n=e.big?Math.floor(cols/2):cols;
      align(e.a);mode((e.b?0x08:0)|(e.big?0x30:0));
      wrapTxt(ascii(e.x),n).forEach(line);
    }else{
      align('left');mode((e.b?0x08:0)|(e.big?0x10:0));
      line(rowTxt(e.l,e.r,cols));
    }
  }
  align('left');mode(0);
  for(let i=0;i<(r.feed||0);i++)out.push(0x0a);
  if(p.drawer)add([0x1b,0x70,0x00,0x19,0xfa]);
  if(p.cut)add([0x1d,0x56,0x42,0x00]);
  return new Uint8Array(out);
}
const psOf=id=>PRNS[id||'main']||(PRNS[id]={dev:null,ch:null,port:null,writer:null,st:''});
const BLE_UUIDS=['000018f0-0000-1000-8000-00805f9b34fb','0000ff00-0000-1000-8000-00805f9b34fb','0000fee7-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','0000fff0-0000-1000-8000-00805f9b34fb','0000ae30-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455'];
const lsGet=k=>{try{return localStorage.getItem(k)||''}catch(e){return ''}};
const lsSet=(k,v)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}};
const mainPrn=()=>({...db.set.prn,id:'main',name:'Printer Kasir',paper:db.set.paper});
const prnById=id=>(!id||id==='main')?mainPrn():((db.set.prns||[]).find(x=>x.id===id)||null);
const prnKey=(pr,k)=>pr.id==='main'?'pos_'+k:'pos_'+k+'_'+pr.id;
function bleBind(dev,pr){
  const s=psOf(pr.id);s.dev=dev;s.ch=null;
  if(PRN_BOUND.has(dev))return;PRN_BOUND.add(dev);
  dev.addEventListener('gattserverdisconnected',()=>{s.ch=null;s.st='';updatePrnStatus();bleAutoSoon(1500)});
}
/* buka koneksi GATT + cari karakteristik tulis; ingat printer ini untuk sambung otomatis berikutnya */
async function bleOpen(dev,pr){
  const s=psOf(pr.id);bleBind(dev,pr);s.st='connecting';updatePrnStatus();
  try{
    const srv=await dev.gatt.connect(),cands=[];
    for(const sv of await srv.getPrimaryServices()){
      for(const c of await sv.getCharacteristics()){
        if(c.properties.writeWithoutResponse||c.properties.write)cands.push(c);
      }
    }
    const ch=cands.find(c=>c.properties.writeWithoutResponse)||cands[0];
    if(!ch)throw new Error('Karakteristik tulis printer tidak ditemukan. Isi UUID service printer di opsi lanjutan.');
    s.ch=ch;lsSet(prnKey(pr,'bleid'),dev.id);lsSet(prnKey(pr,'blename'),dev.name||'');lsSet(prnKey(pr,'bleoff'),null);
  }finally{s.st='';updatePrnStatus()}
}
async function bleSaved(pr){
  const id=lsGet(prnKey(pr,'bleid'));if(!id||!navigator.bluetooth||!navigator.bluetooth.getDevices)return null;
  try{return (await navigator.bluetooth.getDevices()).find(d=>d.id===id)||null}catch(e){return null}
}
const bleUp=s=>!!(s.dev&&s.dev.gatt.connected&&s.ch);
async function bleConnect(pr,pick){
  pr=pr||mainPrn();const s=psOf(pr.id);
  if(!navigator.bluetooth)throw new Error('Web Bluetooth tidak didukung di browser ini. Pakai Chrome (Android/Windows/Mac) atau Bluefy (iPhone).');
  for(let n=0;bleBusy&&n<100;n++)await sleep(100);
  if(!pick&&bleUp(s))return;
  if(pick&&s.dev&&s.dev.gatt.connected){lsSet(prnKey(pr,'bleoff'),'1');s.dev.gatt.disconnect()}
  let dev=pick?null:(s.dev||await bleSaved(pr));
  if(!dev){
    const opt=BLE_UUIDS.slice(),u=String(pr.uuid||'').trim().toLowerCase();
    if(u)opt.push(/^[0-9a-f]{4}$/.test(u)?parseInt(u,16):u);
    dev=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:opt});
  }
  await bleOpen(dev,pr);
}
/* sambung otomatis ke printer sebelumnya (saat aplikasi dibuka, kembali ke aplikasi, atau koneksi putus) */
let bleBusy=false,bleTry=0,bleTm=null;
async function bleAuto(){
  if(bleBusy||document.hidden||!navigator.bluetooth||!navigator.bluetooth.getDevices)return;
  const list=[mainPrn(),...(db.set.prns||[])].filter(p=>p.mode==='ble'&&p.autoConn!==false);
  bleBusy=true;let again=false;
  try{
    for(const pr of list){
      const s=psOf(pr.id);
      if(bleUp(s)||!lsGet(prnKey(pr,'bleid'))||lsGet(prnKey(pr,'bleoff')))continue;
      try{
        const dev=await bleSaved(pr);
        if(!dev)continue;                    /* izin tidak tersimpan: perlu Cari & Hubungkan sekali lagi */
        await bleOpen(dev,pr);
      }catch(e){s.ch=null;again=true}
    }
  }finally{
    bleBusy=false;updatePrnStatus();
    if(again){if(++bleTry<=3&&!document.hidden){clearTimeout(bleTm);bleTm=setTimeout(bleAuto,[0,3000,8000,20000][bleTry])}else bleTry=0}
    else bleTry=0;
  }
}
function bleAutoSoon(ms){clearTimeout(bleTm);bleTm=setTimeout(()=>{bleTry=0;bleAuto()},ms||0)}
async function sendBLE(pr,data){
  await bleConnect(pr,false);
  const s=psOf(pr.id);let size=Math.max(20,+pr.chunk||100);
  for(let i=0;i<data.length;){
    const part=data.slice(i,i+size);
    try{
      if(s.ch.properties.writeWithoutResponse)await s.ch.writeValueWithoutResponse(part);
      else await s.ch.writeValue(part);
      i+=part.length;
    }catch(e){
      if(size>20){size=20;continue}
      throw e;
    }
    await sleep(+pr.delay||15);
  }
}
async function serialClose(pr){
  const s=psOf((pr||{}).id);
  try{if(s.writer)s.writer.releaseLock()}catch(e){}
  try{if(s.port)await s.port.close()}catch(e){}
  s.port=null;s.writer=null;
}
async function serialConnect(pr,pick){
  pr=pr||mainPrn();const s=psOf(pr.id);
  if(!navigator.serial)throw new Error('Web Serial tidak didukung. Pakai Chrome/Edge di komputer (Windows/Mac/Linux).');
  if(!pick&&s.port&&s.writer)return;
  if(s.port)await serialClose(pr);
  const port=await navigator.serial.requestPort(pick?{}:{auto:true});
  await port.open({baudRate:+pr.baud||9600});
  s.port=port;s.writer=port.writable.getWriter();updatePrnStatus();
}
async function sendSerial(pr,data){
  await serialConnect(pr,false);
  await psOf(pr.id).writer.write(data);
}
function sendRawBT(data){
  let bin='';
  for(let i=0;i<data.length;i+=8192)bin+=String.fromCharCode.apply(null,data.subarray(i,i+8192));
  location.href='intent:base64,'+btoa(bin)+'#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
}
async function sendTo(pr,data){
  if(pr.mode==='ble')await sendBLE(pr,data);else if(pr.mode==='serial')await sendSerial(pr,data);else sendRawBT(data);
}
async function printReceipt(o){
  const p=mainPrn();
  if(p.mode==='browser'){const done=()=>{window.removeEventListener('afterprint',done);afterPrint()};window.addEventListener('afterprint',done);setPageSize();window.print();return}
  try{
    const data=await buildEscPos(o);
    await sendTo(p,data);
    toast('Struk dikirim ke printer');
    afterPrint();
  }catch(e){
    console.error(e);
    toast(e&&e.name==='NotFoundError'?'Pemilihan printer dibatalkan':'Gagal cetak: '+((e&&e.message)||e));
  }
  updatePrnStatus();
}
function prnForget(id){
  const pr=prnById(id);if(!pr)return;const s=psOf(pr.id);
  lsSet(prnKey(pr,'bleid'),null);lsSet(prnKey(pr,'blename'),null);lsSet(prnKey(pr,'bleoff'),null);
  try{if(s.dev&&s.dev.gatt.connected)s.dev.gatt.disconnect()}catch(e){}
  s.dev=null;s.ch=null;updatePrnStatus();toast('Printer yang tersimpan dilupakan');
}
async function prnConnect(id){
  const pr=prnById(id);if(!pr)return;
  try{
    if(pr.mode==='ble'){await bleConnect(pr,true);toast('Terhubung ke '+(psOf(pr.id).dev.name||'printer'))}
    else if(pr.mode==='serial'){await serialConnect(pr,true);toast('Port serial terhubung')}
    else toast('Mode ini tidak perlu koneksi manual');
  }catch(e){
    toast(e&&e.name==='NotFoundError'?'Pemilihan printer dibatalkan':'Gagal: '+((e&&e.message)||e));
  }
  updatePrnStatus();
}
async function prnDisconnect(id){
  const pr=prnById(id);if(!pr)return;const s=psOf(pr.id);
  lsSet(prnKey(pr,'bleoff'),'1');
  try{if(s.dev&&s.dev.gatt.connected)s.dev.gatt.disconnect()}catch(e){}
  s.ch=null;
  await serialClose(pr);
  updatePrnStatus();toast('Koneksi printer diputus');
}
function prnStatusOf(pr){
  const s=psOf(pr.id),m=pr.mode;let ok=true,t='';
  if(m==='browser')t='Memakai dialog cetak browser';
  else if(m==='rawbt')t='Dikirim lewat aplikasi RawBT';
  else if(m==='ble'){
    ok=bleUp(s);const sv=lsGet(prnKey(pr,'blename'));
    t=ok?'Terhubung: '+(s.dev.name||'printer BLE'):s.st==='connecting'?'Menyambung ke '+(sv||'printer')+'…':'Belum terhubung'+(sv?' (tersimpan: '+sv+')':'');
  }
  else{ok=!!s.writer;t=ok?'Terhubung: port serial':'Belum terhubung'}
  return{ok,t};
}
function updatePrnStatus(){
  [mainPrn(),...(db.set.prns||[])].forEach(pr=>{
    const el=$(pr.id==='main'?'#prnStat':'#prnStat_'+pr.id);if(!el)return;
    const r=prnStatusOf(pr);
    el.className='chg'+(r.ok?'':' neg');
    el.innerHTML='<span>Status</span><span>'+esc(r.t)+'</span>';
  });
}
/* printer tambahan (Dapur, Bar, dst.): tersimpan di perangkat ini, tiket dibagi menurut Stasiun menu */
const stKey=s=>String(s||'').trim().toLowerCase();
function prnAdd(){
  const n=(db.set.prns||[]).length+1;
  db.set.prns=[...(db.set.prns||[]),{id:'p'+Date.now().toString(36),name:n===1?'Dapur':n===2?'Bar':'Printer '+(n+1),mode:'ble',stations:[],paper:'80',cut:true,baud:9600,chunk:100,delay:15,uuid:'',autoConn:true}];
  save();renderPrn();
}
function prnDel(id){
  if(!confirm('Hapus printer ini dari perangkat?'))return;
  const pr=prnById(id);if(pr)prnForget(id);
  db.set.prns=(db.set.prns||[]).filter(x=>x.id!==id);save();renderPrn();
}
function prnSet(id,k,v){
  const pr=(db.set.prns||[]).find(x=>x.id===id);if(!pr)return;
  if(k==='stations')v=String(v).split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  else if(['baud','chunk','delay'].includes(k))v=+v;
  else if(k==='name')v=String(v).trim().slice(0,20)||pr.name;
  pr[k]=v;save();
  if(k==='mode'||k==='stations'||k==='name')renderPrn();
  if(k==='mode')bleAutoSoon(200);
}
async function prnTest(id){
  const pr=prnById(id);if(!pr)return;
  if(pr.id==='main'){testPrint();return}
  const ok=await printTicketTo(pr,{...sampleOrder(),no:'TES-'+pr.name.toUpperCase(),stn:pr.name});
  toast(ok?'Tiket contoh dikirim ke '+pr.name:'Gagal cetak: '+(CO.perr||'printer belum terhubung'));
  updatePrnStatus();
}
/* printer tujuan untuk satu stasiun menu (kosong/tidak dipetakan → printer utama) */
function prnForStation(k){
  k=stKey(k);if(!k)return null;
  return (db.set.prns||[]).find(x=>(x.stations||[]).some(s=>stKey(s)===k))||null;
}
function sampleOrder(){
  const k=db.set.cur==='Rp'?10000:(dec()===0?100:1),pr=[2.5*k,4.5*k,3*k];
  const sub=rnd(2*pr[0]+pr[1]+3*pr[2]),disc=rnd(k),base=rnd(sub-disc),tax=rnd(base*db.set.tax/100),total=rnd(base+tax),paid=Math.ceil(total/(5*k))*5*k;
  return{no:'INV-CONTOH-0001',t:new Date().toISOString(),type:'Takeaway',cust:'Budi',tbl:'7',cashier:(CL.on&&CL.me)?CL.me.name:'',
    lines:[{name:'Edamame',price:pr[0],qty:2},{name:'Bang Bang Shrimp',price:pr[1],qty:1},{name:'Salmon Nigiri',price:pr[2],qty:3}],
    sub,disc,tax,taxRate:db.set.tax,total,method:'Tunai',paid,change:rnd(paid-total)};
}
function testPrint(){
  const o=sampleOrder();
  if(db.set.prn.mode==='browser')showReceipt(o);else printReceipt(o);
}
/* ---------- opsi (struk & printer) ---------- */
function setFoot(v){db.set.foot=v;save();renderRcPrev()}
function setOpt(obj,key,val){
  if(['logoW','feed','baud','chunk','delay'].includes(key))val=+val;
  db.set[obj][key]=val;save();
  if(obj==='rc')renderRcPrev();
  if(obj==='prn'&&(key==='mode'||key==='autoConn')){if(key==='mode')renderPrn();bleAutoSoon(200)}
}
function setPaper(v){db.set.paper=v;save();setPageSize();if(S.view==='rc')renderRcPrev()}
/* ---------- editor tampilan struk ---------- */
function renderRcPrev(){const el=$('#rcPrev');if(el)el.innerHTML=receiptHTML(sampleOrder(),true)}
function renderRc(){
  const r=db.set.rc;
  const ck=(k,l)=>`<label class="tgl"><input type="checkbox" ${r[k]?'checked':''} onchange="setOpt('rc','${k}',this.checked)"><span>${l}</span></label>`;
  const sel=(k,l,o)=>`<label class="fl">${l}</label><select class="fi" onchange="setOpt('rc','${k}',this.value)">${o.map(([v,t])=>`<option value="${v}" ${String(r[k])===v?'selected':''}>${t}</option>`).join('')}</select>`;
  const tx=(k,l,ph)=>`<label class="fl">${l}</label><input class="fi" value="${esc(r[k])}" placeholder="${esc(ph||'')}" oninput="setOpt('rc','${k}',this.value)">`;
  $('#rcForm').innerHTML=`
  <div class="panel"><h3>Logo</h3>
    <div class="up"><div class="pv logo">${db.set.logo?`<img src="${imgSrc(db.set.logo)}" alt="">`:'<i class="ic solo" data-ic="image"></i>'}</div>
    <div><button class="btn sm sec" onclick="go('set')">Ubah logo di Pengaturan</button></div></div>
    <div class="tgls" style="margin-top:8px">${ck('showLogo','Tampilkan logo di struk')}</div>
    ${sel('logoW','Ukuran logo',[['100','Kecil'],['160','Sedang'],['240','Besar'],['320','Sangat besar']])}
</div>
  <div class="panel"><h3>Header</h3>
    <div class="tgls">${ck('showAddr','Alamat toko')}</div>
    ${tx('line1','Baris tambahan di header','mis. Telp 0812-xxxx / @instagram')}
</div>
  <div class="panel"><h3>Info Transaksi</h3>
    <div class="tgls">${ck('showNo','No. invoice')}${ck('showDate','Tanggal &amp; jam')}${ck('showType','Tipe order')}${ck('showCust','Nama pelanggan')}${ck('showCashier','Nama kasir')}</div>
    <div class="tgls">${ck('showTable','No. meja (besar)')}</div>
    ${sel('tableSize','Ukuran nomor meja',[['xl','Sangat besar'],['l','Besar']])}
    <label class="tgl"><input type="checkbox" ${r.cashierAuto!==false?'checked':''} onchange="setOpt('rc','cashierAuto',this.checked)"><span>Nama kasir otomatis dari akun yang login</span></label>
    ${tx('cashier','Nama kasir manual (cadangan bila tidak login, atau dipakai bila otomatis dimatikan)','mis. Rina')}</div>
  <div class="panel"><h3>Rincian &amp; Pembayaran</h3>
    <div class="tgls">${ck('showDisc','Baris diskon')}${ck('showTax','Baris pajak')}${ck('showPay','Bayar &amp; kembalian')}${ck('bigTotal','Total dengan huruf besar')}</div></div>
  <div class="panel"><h3>Footer &amp; Baris Tambahan</h3>
    <div class="tgls">${ck('showFooter','Tampilkan pesan di bawah struk')}${ck('showQr','QR untuk pesan online')}</div>
    <label class="fl">Pesan di bawah struk</label><input class="fi" value="${esc(db.set.foot)}" oninput="setFoot(this.value)">
    ${tx('line2','Baris tambahan di footer','mis. WiFi: tokoku123')}
    ${tx('qrText','Tulisan di atas QR','mis. Scan untuk memesan')}
</div>
  <div class="panel"><h3>Tampilan</h3>
    ${sel('align','Perataan header',[['left','Kiri'],['center','Tengah'],['right','Kanan']])}
    ${sel('font','Ukuran huruf',[['small','Kecil'],['normal','Normal'],['large','Besar']])}
    ${sel('itemLayout','Format daftar item',[['two','2 baris (nama, lalu qty x harga)'],['one','1 baris (qty nama ... total)']])}
    ${sel('divider','Garis pemisah',[['dashed','Putus-putus (- - -)'],['equal','Sama dengan (=====)'],['none','Tanpa garis']])}
    ${sel('feed','Spasi kosong di akhir struk',[['0','0 baris'],['2','2 baris'],['3','3 baris'],['5','5 baris'],['8','8 baris']])}
  </div>
  <button class="btn sec" onclick="resetRc()">Kembalikan desain default</button>`;
  renderRcPrev();
}
function pickLogo(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  cropImg(f,{title:'Pangkas logo',aspects:[['Bebas',"img"],['1:1',1],['2:1',2],['3:1',3]],max:360,q:.85,cb:d=>setLogo(d)});
}
function setLogo(d){db.set.logo=d;if(d)db.set.rc.showLogo=true;save();applyBrand();renderLogo();renderRc()}
function setLogoApp(v){db.set.logoApp=v;save();applyBrand()}
function renderLogo(){
  const el=$('#logoForm');if(!el)return;const s=db.set;
  el.innerHTML=`<h3>Logo Perusahaan</h3>
  <div class="up"><div class="pv logo">${s.logo?`<img src="${imgSrc(s.logo)}" alt="">`:'<i class="ic solo" data-ic="image"></i>'}</div>
  <div><button class="btn sm sec" onclick="$('#lgF').click()">Upload Logo</button> <button class="mini" style="color:var(--bt)" onclick="setLogo(DEF_LOGO)">Kembali ke Default</button>
  <input type="file" id="lgF" accept="image/*" hidden onchange="pickLogo(this)"></div></div>
  <div class="tgls" style="margin-top:8px">
  <label class="tgl"><input type="checkbox" ${s.logoApp!==false?'checked':''} onchange="setLogoApp(this.checked)"><span>Tampilkan logo di aplikasi</span></label>
  <label class="tgl"><input type="checkbox" ${s.rc.showLogo?'checked':''} onchange="setOpt('rc','showLogo',this.checked)"><span>Tampilkan logo di struk</span></label></div>
`;
}
function resetRc(){
  ask('Reset desain struk?','Semua pengaturan tampilan struk kembali ke default.','Reset',()=>{db.set.rc={...RC_DEF};save();renderRc();renderLogo()});
}
/* ---------- halaman printer ---------- */
const IOSN=()=>!!(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()==='ios');
function renderPrn(){
  const p=db.set.prn;
  if(IOSN()&&(p.mode==='serial'||p.mode==='rawbt')){p.mode='ble';save()}   // iPhone tidak mendukung Bluetooth klasik/RawBT
  const ck=(k,l)=>`<label class="tgl"><input type="checkbox" ${p[k]?'checked':''} onchange="setOpt('prn','${k}',this.checked)"><span>${l}</span></label>`;
  const help={
    browser:'Memakai dialog cetak bawaan browser. Cocok untuk printer USB / Wi-Fi / yang sudah terpasang di komputer atau HP. Pilih ukuran kertas yang sama dengan printer.',
    ble:IOSN()?'Untuk printer thermal Bluetooth BLE (Bluetooth 4.0+). Nyalakan printer, tekan Cari & Hubungkan, lalu pilih printer. iPhone tidak bisa memakai printer Bluetooth klasik (SPP); pakai printer yang mendukung BLE.':'Untuk printer thermal Bluetooth BLE (Bluetooth 4.0+). Klik Cari &amp; Hubungkan lalu pilih printer. Perlu Chrome (Android/Windows/Mac) atau Bluefy di iPhone; Safari tidak mendukung. Buka halaman ini sebagai file atau lewat https.',
    serial:'Untuk printer Bluetooth klasik (SPP) yang sudah di-pair di komputer (muncul sebagai port COM) atau printer USB. Hanya Chrome/Edge desktop. Atur baud rate sesuai printer (umumnya 9600 atau 115200).',
    rawbt:'Untuk HP Android dengan printer Bluetooth klasik: pasang aplikasi gratis RawBT dari Play Store, pair printer di RawBT, lalu cetak dari sini. Struk dikirim ke RawBT.'
  }[p.mode];
  const o=(v,t)=>`<option value="${v}" ${p.mode===v?'selected':''}>${t}</option>`;
  $('#prnForm').innerHTML=`
  <div class="panel"><h3>Koneksi</h3>
    <label class="fl">Mode cetak</label>
    <select class="fi" onchange="setOpt('prn','mode',this.value)">
      ${o('browser',IOSN()?'AirPrint / dialog cetak iPhone':'Dialog browser (USB / Wi-Fi / driver)')}${o('ble',IOSN()?'Bluetooth BLE':'Bluetooth BLE (Web Bluetooth)')}${IOSN()?'':o('serial','Bluetooth klasik / USB (Web Serial, desktop)')+o('rawbt','Android: aplikasi RawBT')}
    </select>
    <div class="tgls" style="margin-top:8px">${ck('autoConn','Sambung otomatis ke printer sebelumnya')}</div>
    <div class="chg" id="prnStat"></div>
    <div class="acts" style="margin-top:10px;flex-wrap:wrap">
      <button class="btn sm" onclick="prnConnect()"><i class="ic" data-ic="search"></i>Cari &amp; Hubungkan</button>
      <button class="btn sm sec" onclick="prnDisconnect()">Putuskan</button>
      <button class="btn sm sec" onclick="prnForget()">Lupakan printer</button>
      <button class="btn sm sec" onclick="testPrint()"><i class="ic" data-ic="print"></i>Tes Cetak</button>
    </div></div>
  <div class="panel"><h3>Printer Dapur / Bar</h3>
    <p class="mu" style="font-size:13px;line-height:1.5;margin:0 0 8px">Pengaturan printer tersimpan <b>di perangkat dan aplikasi ini saja</b>. Pesanan online hanya masuk ke aplikasi Kasir; tiketnya dibagi otomatis menurut <b>Stasiun</b> menu (diisi di Inventori → edit item) ke printer yang memuat stasiun itu. Menu tanpa stasiun / stasiun yang belum dipetakan dicetak di printer utama (Kasir).</p>
    <label class="sw" style="display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:14px"><input type="checkbox" ${ktOn()?'checked':''} onchange="ktSet(this.checked);toast(this.checked?'Tiket dapur otomatis: hidup':'Tiket dapur otomatis: mati')"> <span><b>Cetak tiket dapur otomatis</b> untuk transaksi di toko (perangkat ini)</span></label>
    ${(db.set.prns||[]).map(x=>{const so=(a,v,t)=>`<option value="${v}" ${a===v?'selected':''}>${t}</option>`;return `
    <div class="panel" style="margin:8px 0;box-shadow:none;border:1px solid var(--ln)">
      <div class="two"><div><label class="fl">Nama printer</label><input class="fi" maxlength="20" value="${esc(x.name)}" onchange="prnSet('${x.id}','name',this.value)"></div>
      <div><label class="fl">Koneksi</label><select class="fi" onchange="prnSet('${x.id}','mode',this.value)">${so(x.mode,'ble','Bluetooth BLE')}${IOSN()?'':so(x.mode,'serial','Bluetooth klasik / USB (desktop)')}</select></div></div>
      <label class="fl">Stasiun yang dicetak di sini (pisahkan dengan koma)</label>
      <input class="fi" value="${esc((x.stations||[]).join(', '))}" placeholder="mis. Dapur, Makanan" onchange="prnSet('${x.id}','stations',this.value)">
      <div class="two" style="margin-top:8px"><div><label class="fl">Kertas</label><select class="fi" onchange="prnSet('${x.id}','paper',this.value)">${so(x.paper,'80','80 mm')}${so(x.paper,'58','58 mm')}</select></div>
      <div><label class="fl">Potong kertas</label><select class="fi" onchange="prnSet('${x.id}','cut',this.value==='1')">${so(x.cut?'1':'0','1','Ya')}${so(x.cut?'1':'0','0','Tidak')}</select></div></div>
      <div class="chg" id="prnStat_${x.id}"></div>
      <div class="acts" style="margin-top:8px;flex-wrap:wrap">
        <button class="btn sm" onclick="prnConnect('${x.id}')"><i class="ic" data-ic="search"></i>Cari &amp; Hubungkan</button>
        <button class="btn sm sec" onclick="prnDisconnect('${x.id}')">Putuskan</button>
        <button class="btn sm sec" onclick="prnTest('${x.id}')"><i class="ic" data-ic="print"></i>Tes Cetak</button>
        <button class="btn sm sec" onclick="prnDel('${x.id}')">Hapus</button>
      </div>
    </div>`}).join('')||'<p class="mu" style="font-size:13px;margin:4px 0 8px">Belum ada printer tambahan.</p>'}
    <button class="btn sm sec" onclick="prnAdd()"><i class="ic" data-ic="plus"></i>Tambah printer</button>
    ${(()=>{const sts=[...new Set(db.items.map(i=>String(i.stn||'').trim()).filter(Boolean))];if(!sts.length)return'';return `<div class="chg" style="margin-top:10px;display:block"><span style="display:block;font-weight:600;margin-bottom:4px">Rute stasiun</span>${sts.map(k=>{const pr=prnForStation(k);return `<span style="display:flex;justify-content:space-between;gap:8px"><span>${esc(k)}</span><span>→ ${esc(pr?pr.name:'Printer Kasir')}</span></span>`}).join('')}</div>`})()}
  </div>
  <div class="panel"><h3>Opsi Cetak</h3>
    <label class="fl">Ukuran kertas</label>
    <select class="fi" onchange="setPaper(this.value)"><option value="80" ${db.set.paper==='80'?'selected':''}>Thermal 80 mm (48 karakter)</option><option value="58" ${db.set.paper==='58'?'selected':''}>Thermal 58 mm (32 karakter)</option></select>
    <div class="tgls" style="margin-top:8px">${ck('auto','Cetak otomatis setelah pembayaran')}${ck('autoNew','Kembali ke kasir otomatis setelah struk tercetak')}${ck('cut','Potong kertas otomatis')}${ck('drawer','Buka laci kasir (port RJ11)')}</div></div>
  <div class="panel"><h3>Lanjutan</h3>
    <div class="two"><div><label class="fl">Baud rate (serial)</label><input class="fi" type="number" value="${p.baud}" onchange="setOpt('prn','baud',this.value)"></div>
    <div><label class="fl">Ukuran paket BLE (byte)</label><input class="fi" type="number" min="20" max="512" value="${p.chunk}" onchange="setOpt('prn','chunk',this.value)"></div></div>
    <div class="two"><div><label class="fl">Jeda antar paket (ms)</label><input class="fi" type="number" min="0" value="${p.delay}" onchange="setOpt('prn','delay',this.value)"></div>
    <div><label class="fl">UUID service printer (opsional)</label><input class="fi" value="${esc(p.uuid)}" placeholder="mis. ffe0" onchange="setOpt('prn','uuid',this.value)"></div></div>
</div>`;
  updatePrnStatus();
}

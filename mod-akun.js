/* Ordela — modul akun: login, sesi, profil, keamanan, hapus akun.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
function setMe(m){CL.me=m||null;try{if(m)localStorage.setItem('pos_me',JSON.stringify(m));else localStorage.removeItem('pos_me')}catch(e){}if(m&&m.theme&&window.OrdelaSkin)window.OrdelaSkin.applyOwnerColor(m.theme)}
/* tanpa server (mode offline/standalone) tidak ada akun: semua terbuka */
function isOwner(){return !CL.on||(!!CL.me&&CL.me.role==='owner')}
function tierOf(k){return(CL.me&&CL.me.tiers&&CL.me.tiers[k])||FEAT_TIER[k]||null}
function lockNeed(k){
  if(!CL.on||!CL.me)return null;
  if(CL.me.locks&&CL.me.locks[k])return CL.me.locks[k];
  if(CL.me.plan&&CL.me.locks)return null;   // server mengirim paket toko → server yang menentukan, tidak ada tebakan klien
  return null}
   // server belum mengirim paket (setup.sql belum dijalankan) → jangan mengunci apa pun
function viewLock(v){const k=VIEW_LOCK[v];return k&&lockNeed(k)?k:null}
function upgradeDlg(v){
  const k=VIEW_LOCK[v],need=lockNeed(k)||'yang lebih tinggi',nm=LOCK_NAME[k]||'Fitur ini',cur=(CL.me&&CL.me.plan&&CL.me.plan.name)||'saat ini';
  const old=$('#upDlg');if(old)old.remove();
  const d=document.createElement('div');d.id='upDlg';d.className='updlg';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','upT');
  const box=document.createElement('div');box.className='upbox';
  const ic=document.createElement('div');ic.className='uplk';ic.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const t=document.createElement('h3');t.id='upT';t.textContent=nm+' belum termasuk di paket '+cur;
  const m=document.createElement('p');m.textContent='Fitur ini tersedia mulai paket '+need+'. Hubungi Ordela untuk upgrade paket langganan Anda.';
  const b=document.createElement('button');b.type='button';b.className='upok';b.textContent='Mengerti';
  const close=()=>{d.remove();document.removeEventListener('keydown',esc)};
  const esc=e=>{if(e.key==='Escape')close()};
  b.addEventListener('click',close);d.addEventListener('click',e=>{if(e.target===d)close()});document.addEventListener('keydown',esc);
  b.textContent=isOwner()?'Tutup':'Mengerti';
  box.append(ic,t,m);
  if(isOwner()&&typeof P2!=='undefined'&&P2.plan){const g=document.createElement('button');g.type='button';g.className='upok';g.textContent='Lihat paket';g.addEventListener('click',()=>{d.remove();document.removeEventListener('keydown',esc);P2.plan()});box.append(g);b.classList.add('sec')}
  box.append(b);d.append(box);document.body.append(d);b.focus();
}
function can(p){return !CL.on||(!!CL.me&&(CL.me.role==='owner'?!lockNeed(p):(CL.me.perms||[]).includes(p)))}
/* karyawan yang HANYA punya izin Absensi: tidak boleh memakai Kasir, Meja, Beranda, atau Notifikasi (tidak ada transaksi) */
function attOnly(){const m=CL.on&&CL.me;if(!m||m.role==='owner')return false;const p=m.perms||[];return p.length>0&&p.every(x=>x==='att')}
function appOk(v){const a=window.POS_APP;if(!a||!APP_VIEWS[a])return true;return ACCV.includes(v)||APP_VIEWS[a].includes(v)}
function landing(){if(window.POS_APP&&APP_VIEWS[POS_APP]){const h=APP_HOME[POS_APP];return canView(h)&&!viewLock(h)?h:(CL.on&&CL.me?'menu':'acc')}
  if(CL.on&&CL.me)return 'menu';return ['pos','home','co','inv','att','set','prn'].find(v=>canView(v)&&!viewLock(v))||'acc'}
function canView(v){
  if(!appOk(v))return false;
  if(isOwner()&&viewLock(v))return true;   // terkunci paket: menu tampil dengan gembok, go() menampilkan ajakan upgrade
  if(v==='table'&&can('co'))return true;   // server/pelayan melihat status meja dari antrean pesanan
  if(v==='home'&&can('hist'))return true;   // Rekap & Riwayat tampil di Beranda
  if(v==='riw')return can('pos')||can('hist')||can('co');
  if(v==='acc')return true;
  if(v==='att')return CL.on&&can('att');
  if(v==='branch')return CL.on&&isOwner();
  if(v==='menu')return true;
  if(v==='pyr')return CL.on&&isOwner();
  if(v==='set'&&can('prn'))return true;   // pemakai berizin Printer saja tetap bisa membuka Pengaturan > Printer
  const p=VIEW_PERM[v];if(p===undefined||p===null)return true;
  if(v==='co'||v==='usr')return CL.on&&(p==='#owner'?isOwner():can(p));
  return p==='#owner'?isOwner():can(p);
}
function navGroups(){
  document.querySelectorAll('.drawer .dg').forEach(g=>{
    let n=g.nextElementSibling,any=false;
    while(n&&!n.classList.contains('dg')){if(n.matches('button[data-v]')&&!n.hidden)any=true;n=n.nextElementSibling}
    g.hidden=!any;
  });
}
function openDash(){closeAll();location.href='dashboard.html'}
function applyAccess(){
  document.querySelectorAll('.drawer button[data-v],.bnav button[data-v],.rail button[data-v]').forEach(b=>{
    const ok=b.dataset.v==='acc'||canView(b.dataset.v);
    b.classList.toggle('lk',!!(isOwner()&&viewLock(b.dataset.v)));
    if(b.closest('.bnav'))b.style.display=ok?'':'none';else b.hidden=!ok;
  });
  {const bn=$('#bnav');if(bn){const n=[...bn.querySelectorAll('button[data-v]')].filter(b=>b.style.display!=='none').length;bn.style.gridTemplateColumns='repeat('+Math.max(1,n)+',1fr)';
    if(typeof navDot==='function')setTimeout(()=>{const o=bn.querySelector('button.on');navDot(o?o.dataset.v:null,true)},0)}}
  const dn=$('#dashNav');if(dn)dn.hidden=!isOwner();   // Dashboard ada di halaman sendiri (dashboard.html), hanya untuk owner
  if(typeof coBadge==='function')coBadge();
  navGroups();
  renderAcct();
  document.body.classList.toggle('attonly',attOnly());
  if(S.view&&(!canView(S.view)||(isOwner()&&viewLock(S.view))))go(landing());
}
function renderAcct(){
  const ba=$('#bnAcc'),lo=$('#lgout'),an=$('#accNav'),on=!!(CL.on&&CL.me);
  if(ba)ba.innerHTML=on?avHtml(CL.me,'nv'):'<i class="ic" data-ic="sliders"></i>';
  const rA=$('#rlAcc');if(rA)rA.innerHTML=on?avHtml(CL.me,'nv'):RAIL_USER;
  if(an){an.hidden=!on;if(on)an.innerHTML=avHtml(CL.me,'dv')+'<span class="anm">Akun</span>'}
  if(lo)lo.hidden=!on;
  if(typeof renderSec==='function')renderSec();
  if(ACCV.includes(S.view)&&!on)go('set');
}
/* ----- halaman login ----- */
function togglePw(){const i=$('#loginPw'),b=$('#loginEye');const s=i.type==='password';i.type=s?'text':'password';b.textContent=s?'Sembunyikan':'Tampilkan'}
function showLogin(msg){
  const w=$('#login');if(!w)return;
  closeModal&&closeModal();
  $('#loginLogo').src=db.set.logo||DEF_LOGO;$('#loginName').textContent=db.set.store||'Ordela';
  $('#loginErr').textContent=msg||'';$('#loginPw').value='';$('#loginPw').type='password';$('#loginEye').textContent='Tampilkan';
  let u='';try{u=localStorage.getItem('pos_user')||''}catch(e){}
  $('#loginUser').value=u;w.hidden=false;
  setTimeout(()=>{const i=u?$('#loginPw'):$('#loginUser');if(i)i.focus()},60);
}
/* Data lokal (menu, pesanan, pengaturan, cadangan) milik satu toko. Bila yang login berasal dari toko lain, data toko sebelumnya dibuang
   sebelum sinkron pertama, supaya tidak tertulis ke toko ini. Login ulang ke toko yang sama tidak menghapus apa pun. */
async function localOwnerGuard(m){
  const code=m&&m.store&&m.store.code;if(!code)return false;
  let prev=null;try{prev=localStorage.getItem('pos_dbstore')}catch(e){}
  if(prev===code)return false;
  try{localStorage.setItem('pos_dbstore',code)}catch(e){}
  if(prev===null&&CL.dirty)return false;     // perangkat lama tanpa penanda dan ada perubahan belum tersinkron: dipakai apa adanya agar tidak hilang
  try{localStorage.removeItem(KEY)}catch(e){}
  db=fixDb(seed());S.cart={};S.sel.clear();CL.ver=0;CL.dirty=false;persistMeta();
  try{await idbReq('readwrite',s=>s.clear());await idbSet('main',dbJson())}catch(e){}   // salinan, dasar penggabungan, dan snapshot toko sebelumnya
  applyBrand();return true;
}
async function doLogin(){
  const un=$('#loginUser').value.trim().toLowerCase(),pw=$('#loginPw').value,err=$('#loginErr'),btn=$('#loginBtn');
  if(!un||!pw){err.textContent='Isi username dan kata sandi';return}
  err.textContent='';btn.disabled=true;btn.textContent='Memeriksa…';
  try{
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:un,password:pw})});
    const j=await r.json().catch(()=>({}));
    if(r.status===401){err.textContent='Username/email atau kata sandi salah';return}
    if(r.status===403){err.textContent=j.error||'Akun tidak aktif';return}
    if(r.status===429){err.textContent='Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';return}
    if(!r.ok)throw 0;
    CL.tok=j.token;setMe(j.me);await localOwnerGuard(j.me);
    try{localStorage.setItem('pos_tok',CL.tok);localStorage.setItem('pos_user',un)}catch(e){}
    $('#loginPw').value='';$('#login').hidden=true;ssStamp();ssWarnHide();
    applyAccess();if(!canView(S.view)||S.view==='acc')go(landing());else render();
    syncNow();
  }catch(e){err.textContent='Tidak bisa terhubung ke server'}
  finally{btn.disabled=false;btn.textContent='Masuk'}
}
function doLogout(){logoutAsk()}
/* keluar: sesi di server ikut dimatikan, jadi token yang tersisa di perangkat tidak bisa dipakai lagi */
function serverLogout(){
  const t=CL.tok;if(!t)return;
  try{fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:'{}',keepalive:true}).catch(()=>{})}catch(e){}
}
async function coPushOff(tok){
  try{const reg=await navigator.serviceWorker.getRegistration(),sub=reg&&await reg.pushManager.getSubscription();if(!sub)return;
    try{await fetch('/api/push/sub',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({endpoint:sub.endpoint})})}catch(e){}
    await sub.unsubscribe()}catch(e){}
}
function cloudLogout(msg){
  try{if(window.nativePush&&CL.tok)nativePush.off((p,o)=>fetch(p,{...o,headers:{'Content-Type':'application/json',Authorization:'Bearer '+CL.tok}}))}catch(e){}
  try{if(CL.tok&&'PushManager' in window)coPushOff(CL.tok)}catch(e){}
  serverLogout();ssWarnHide();
  CL.tok='';setMe(null);try{localStorage.removeItem('pos_tok');localStorage.removeItem('pos_act')}catch(e){}
  CO.list=[];CO.rev=0;CO.seen.clear();
  setSt('auth');closeAll();closeModal();applyAccess();go('pos');showLogin(typeof msg==='string'?msg:'');
}
function idleMin(){const v=db&&db.set?db.set.idle:null;return v==null?30:Math.max(0,+v||0)}
   // menit; 0 = tidak pernah
function fmtIdle(m){return m<60||m%60?m+' menit':(m/60)+' jam'}
function ssStamp(){SS.last=Date.now();try{localStorage.setItem('pos_act',String(SS.last))}catch(e){}}
function ssWarnHide(){if(!SS.warn)return;SS.warn=false;const w=$('#sesw');if(w)w.hidden=true}
function ssWarnShow(sec){SS.warn=true;const w=$('#sesw');if(w)w.hidden=false;const t=$('#seswT');if(t)t.textContent=sec}
function ssExempt(){return S.view==='co'&&can('co')&&coAuto()}
   // layar dapur yang menerima & mencetak pesanan tidak ikut keluar
function ssCheck(){
  if(!CL.on||!CL.tok){ssWarnHide();return}
  const m=idleMin();if(!m){ssWarnHide();return}
  try{const a=+localStorage.getItem('pos_act')||0;if(a>SS.last)SS.last=a}catch(e){}
  if(ssExempt()){if(Date.now()-SS.last>20000)ssStamp();ssWarnHide();return}
  const left=m*60000-(Date.now()-SS.last);
  if(left<=0){cloudLogout('Anda keluar otomatis karena tidak ada aktivitas selama '+fmtIdle(m)+'. Masuk lagi untuk melanjutkan.');return}
  if(left<=Math.min(60000,m*30000))ssWarnShow(Math.ceil(left/1000));else ssWarnHide();
}
function ssAct(){
  if(!CL.tok)return;
  if(Date.now()-SS.last<3000&&!SS.warn)return;
  ssStamp();ssWarnHide();
}
function ssStart(){
  if(SS.on)return;SS.on=true;
  let a=0;try{a=+localStorage.getItem('pos_act')||0}catch(e){}
  SS.last=a||Date.now();if(!a&&CL.tok)ssStamp();
  ['pointerdown','keydown','touchstart','wheel','scroll'].forEach(e=>document.addEventListener(e,ssAct,{passive:true,capture:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)ssCheck()});
  window.addEventListener('pageshow',ssCheck);
  setInterval(ssCheck,1000);
  ssCheck();
}
function renderSec(){
  const p=$('#secForm');if(!p)return;
  if(!(CL.on&&isOwner())){p.hidden=true;applySetTab();return}
  p.hidden=false;const m=idleMin();
  const opts=[[5,'5 menit'],[15,'15 menit'],[30,'30 menit'],[60,'1 jam'],[120,'2 jam'],[240,'4 jam'],[480,'8 jam'],[0,'Tidak pernah']];
  p.innerHTML=`<h3>Keamanan Sesi</h3>
  <label class="fl">Keluar otomatis bila tidak dipakai</label>
  <select class="fi" id="secIdle" onchange="secSet(this.value)">${opts.map(o=>`<option value="${o[0]}"${o[0]===m?' selected':''}>${o[1]}</option>`).join('')}</select>
`;
}
function secSet(v){db.set.idle=Math.max(0,+v||0);save();ssStamp();toast('Pengaturan keamanan disimpan')}
/* ----- akun saya ----- */
function avHtml(m,cls){const ph=m&&m.photo;return `<span class="av ${cls||''}">${ph?`<img src="${esc(ph)}" alt="">`:esc(((m&&m.name)||'?').trim().charAt(0).toUpperCase())}</span>`}
function accTap(){go(CL.on&&CL.me?'acc':'set')}
function openAcct(){go('acc')}
function accRow(l,v,id){return `<label class="fl">${l}</label><p class="accv"${id?` id="${id}"`:''}>${v}</p>`}
function accDate(iso,withTime){
  if(!iso)return '';const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso)?iso+'T00:00:00':iso);if(Number.isNaN(d.getTime()))return '';
  const o={day:'2-digit',month:'long',year:'numeric'};if(withTime){o.hour='2-digit';o.minute='2-digit'}
  return d.toLocaleDateString('id-ID',o)
}
/* nama & telepon toko: salinan sinkron di pengaturan toko (db.set), nama cadangan dari data akun */
function accStore(m){
  const n=String(db&&db.set&&db.set.store||'').trim(),sn=String(m&&m.store&&m.store.name||'').trim();
  return{name:n||sn,phone:String(db&&db.set&&db.set.phone||'').trim(),code:String(m&&m.store&&m.store.code||'')};
}
const APP_VER='1.0.0';
const pfi=(n,z)=>`<svg class="pfi" width="${z||22}" height="${z||22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PFI[n]||''}</svg>`;
const pfSub=(t,to)=>`<div class="subh"><button class="bk" type="button" onclick="${to}" aria-label="Kembali">${pfi('back',22)}</button><h2>${t}</h2></div>`;
const NONE='<span class="mu">Belum diisi</span>';
function accVerState(m){
  if(m.active===false)return{k:'bad',t:'Dinonaktifkan'};
  if(!m.hasAuth)return m.email?{k:'warn',t:'Email belum terhubung'}:{k:'ok',t:'Aktif'};
  return m.emailVerified?{k:'ok',t:'Terverifikasi'}:{k:'warn',t:'Belum diverifikasi'};
}
/* ----- halaman Profil ----- */
function renderAccPage(){
  const m=CL.me,box=$('#accPage');if(!m||!box)return;ACC.photo=m.photo||'';
  const vs=accVerState(m);
  box.innerHTML=`<div class="pfw">
    <div class="pfhero"><button class="pfav" type="button" onclick="accSheet('view')" aria-label="Ubah foto profil"><span id="accAvV"></span><i class="cam">${pfi('camera',16)}</i></button>
      <b class="pfn">${esc(m.name||'Pengguna')}</b><small class="pfr">${esc(usrRoleLabel(m.role))}</small></div>
    <div class="pfcard">
      <div class="pfrow">${pfi('mail',20)}<div class="tx"><small>Email</small><b>${m.email?esc(m.email):NONE}</b></div></div>
      <div class="pfrow">${pfi('phone',20)}<div class="tx"><small>Nomor Telepon</small><b>${m.phone?esc(m.phone):NONE}</b></div></div>
      <div class="pfrow">${pfi('check',20)}<div class="tx"><small>Status Akun</small><b class="${vs.k}">${esc(vs.t)}</b></div></div>
    </div>
    <button class="pfbtn" type="button" onclick="go('editacc')">${pfi('pencil',18)}Edit Profil</button>
    <button class="pfbtn out" type="button" onclick="go('accset')">${pfi('user',20)}Pengaturan Akun<span class="chev">${pfi('chev',18)}</span></button>
  </div>`;
  accAvDraw();
}
/* ----- Pengaturan Akun ----- */
function accSetItems(){
  const m=CL.me,vs=accVerState(m);
  const sub=!m.hasAuth?(m.email?'Email belum terhubung ke akun':'Tambahkan email akun Anda'):m.pendingEmail?'Menunggu verifikasi email baru':m.emailVerified?'Email Anda sudah terverifikasi':'Email belum diverifikasi';
  const ok=vs.k==='ok'&&m.hasAuth&&!m.pendingEmail;
  return[
   {g:'Akun',ic:'user',t:'Informasi Profil',d:'Lihat data diri, kontak, dan informasi toko.',to:"go('accinfo')",kw:'nama username telepon alamat tanggal lahir toko'},
   {g:'Akun',ic:'shield',t:'Keamanan Akun',d:'Ubah kata sandi untuk menjaga akun tetap aman.',to:"go('pw')",kw:'password sandi kunci',key:1},
   {g:'Akun',ic:'mail',t:'Verifikasi Email',d:sub,to:"go('accver')",kw:'email surel verifikasi',key:1,ok},
   {g:'Aplikasi',ic:'bell',t:'Notifikasi',d:'Atur notifikasi, bunyi, dan getar pesanan masuk.',to:"go('accnt')",kw:'suara bunyi getar pesanan'},
   {g:'Aplikasi',ic:'info',t:'Tentang Ordela',d:'Versi aplikasi, pembaruan, dan muat ulang versi terbaru.',to:"go('accabout')",kw:'versi update perbarui'},
   {g:'Sesi & Privasi',ic:'logout',t:'Keluar',d:'Akhiri sesi di perangkat ini.',to:'logoutAsk()',kw:'logout sign out',bad:1},
   {g:'Sesi & Privasi',ic:'trash',t:'Hapus Akun',d:'Hapus akun Anda secara permanen.',to:"go('accdel')",kw:'delete hapus akun privasi',bad:1}
  ];
}
function accSetList(){
  const box=$('#accSetList');if(!box||!CL.me)return;
  const q=(($('#accSetQ')||{}).value||'').trim().toLowerCase();
  const its=accSetItems().filter(i=>!q||(i.t+' '+i.d+' '+i.kw+' '+i.g).toLowerCase().includes(q));
  if(!its.length){box.innerHTML=`<p class="pfhint" style="text-align:center;padding:28px 0">Tidak ada pengaturan yang cocok dengan “${esc(q)}”.</p>`;return}
  let h='',g='';
  its.forEach(i=>{
    if(i.g!==g){if(g)h+='</div>';g=i.g;h+=`<div class="pfgl">${esc(g)}</div><div class="pfgrp">`}
    h+=`<button type="button" class="${i.key?'key':''}${i.bad?' bad':''}" onclick="${i.to}"><span class="ib2">${pfi(i.ic,i.key?24:20)}</span><span class="tx"><b>${i.t}</b><small>${esc(i.d)}</small></span>${i.ok?`<span class="okc">${pfi('check',22)}</span>`:''}${i.bad&&i.ic==='logout'?'':`<span class="chev">${pfi('chev',18)}</span>`}</button>`;
  });
  box.innerHTML=h+'</div>';
}
function renderAccSet(){
  const m=CL.me,box=$('#accSetPage');if(!m||!box)return;
  if(box.dataset.built==='1'&&box.querySelector('#accSetQ')){accSetList();return}   /* jangan hapus kata pencarian yang sedang diketik */
  box.dataset.built='1';
  box.innerHTML=`${pfSub('Pengaturan Akun',"go('acc')")}<div class="pfw">
    <div class="pfin pfsrch">${pfi('search',18)}<input class="fi" id="accSetQ" type="search" placeholder="Cari pengaturan" autocomplete="off" oninput="accSetList()" aria-label="Cari pengaturan"></div>
    <div id="accSetList"></div></div>`;
  accSetList();
}
/* ----- Informasi Profil (semua data, hanya baca) ----- */
function renderAccInfo(){
  const m=CL.me,box=$('#accInfoPage');if(!m||!box)return;
  const role=usrRoleLabel(m.role),st=accStore(m),own=m.role==='owner',vs=accVerState(m);
  const mu=t=>`<span class="mu">${t}</span>`;
  const row=(ic,l,v)=>`<div class="pfrow">${pfi(ic,20)}<div class="tx"><small>${l}</small><b>${v}</b></div></div>`;
  box.innerHTML=`${pfSub('Informasi Profil',"go('accset')")}<div class="pfw">
    <div class="pfcard">
      ${row('user','Nama lengkap',esc(m.name||'—'))}${row('at','Username','@'+esc(m.username||'—'))}
      ${row('mail','Alamat email',m.email?esc(m.email):NONE)}${row('phone','Nomor telepon',m.phone?esc(m.phone):NONE)}
      ${row('cal','Tanggal lahir',accDate(m.birth)?esc(accDate(m.birth)):NONE)}${row('pin','Alamat',m.address?esc(m.address):NONE)}
    </div>
    <div class="pfcard" style="margin-top:14px">
      ${row('shield','Peran / jabatan',esc(role))}
      ${row('store','Nama toko',st.name?esc(st.name):mu('Belum diatur'))}
      ${row('phone','Nomor telepon toko',st.phone?esc(st.phone):NONE)}
      ${own&&st.code?row('id','Kode toko',`<code>${esc(st.code)}</code>`):''}
      ${row('cal','Tanggal bergabung',accDate(m.createdAt)?esc(accDate(m.createdAt)):mu('Belum tersedia'))}
      ${row('clock','Login terakhir',accDate(m.lastLogin,1)?esc(accDate(m.lastLogin,1)):mu('Belum tersedia'))}
      ${row('check','Status akun',`<span class="${vs.k}">${esc(m.active===false?'Dinonaktifkan':'Aktif')}</span>`)}
      ${row('cloud','Koneksi',(CL.on&&CL.tok)?(navigator.onLine===false?'Tidak ada internet':'Terhubung ke server'):'Mode offline')}
    </div>
    <button class="pfbtn" type="button" onclick="go('editacc')">${pfi('pencil',18)}Edit Profil</button></div>`;
}
/* ----- Edit Profil ----- */
function renderEditAccPage(force){
  const m=CL.me,box=$('#editAccPage');if(!m||!box)return;
  /* render() jalan tiap sinkron data; jangan hapus isian/foto yang sedang diubah */
  if(!force&&box.dataset.built==='1'&&box.querySelector('#accName'))return;
  ACC.photo=m.photo||'';box.dataset.built='1';
  const own=m.role==='owner',st=accStore(m),today=new Date().toISOString().slice(0,10);
  const sp=phSplit(st.phone);
  box.innerHTML=`${pfSub('Edit Profil','accCancel()')}<div class="accp pfwrap">
  <div class="pfhero"><button class="pfav" type="button" onclick="accSheet('edit')" aria-label="Ubah foto profil"><span id="accAv"></span><i class="cam">${pfi('camera',16)}</i></button>
    <button class="pfpill" type="button" onclick="accSheet('edit')">${pfi('camera',18)}Ubah Foto</button>
    <button class="lnk" type="button" id="accRm" onclick="accPhotoDel()">Hapus foto</button></div>
  <label class="fl" for="accName">Nama Lengkap</label><div class="pfin">${pfi('user',20)}<input class="fi" id="accName" maxlength="60" value="${esc(m.name)}" autocomplete="name" oninput="accAvDraw()"></div>
  <label class="fl" for="accUser">Username</label><div class="pfin">${pfi('at',20)}<input class="fi" id="accUser" maxlength="24" value="${esc(m.username)}" autocomplete="username" autocapitalize="none" spellcheck="false" ${own?'':'readonly'}></div>
  <p class="hint">${own?'Dipakai untuk masuk. Huruf kecil, angka, titik, strip, garis bawah (3-24 karakter).':'Username karyawan hanya bisa diubah oleh owner (dipakai untuk login dan jadwal shift).'}</p>
  <label class="fl" for="accEmail">Email</label><div class="pfin">${pfi('mail',20)}<input class="fi" id="accEmail" type="email" value="${esc(m.email||'')}" placeholder="Belum diisi" readonly></div>
  <div id="accVst" class="vst"></div>
  <label class="fl">Nomor Telepon</label><div class="phr"><select class="fi" id="accCc" aria-label="Kode negara">${phCcOpts(phSplit(m.phone).cc)}</select><input class="fi" id="accPhone" type="tel" inputmode="tel" maxlength="14" placeholder="812 3456 7890" value="${esc(phSplit(m.phone).num)}" autocomplete="tel-national"></div>
  <label class="fl" for="accBirth">Tanggal Lahir</label><input class="fi" id="accBirth" type="date" min="1900-01-01" max="${today}" value="${esc(m.birth||'')}">
  <label class="fl" for="accAddr">Alamat</label><textarea class="fi" id="accAddr" rows="2" maxlength="300" placeholder="Alamat tempat tinggal">${esc(m.address||'')}</textarea>
  ${own?`<h3 class="acch">Toko</h3>
  <label class="fl" for="accStore">Nama Toko</label><div class="pfin">${pfi('store',20)}<input class="fi" id="accStore" maxlength="60" value="${esc(st.name)}" placeholder="Nama toko Anda"></div>
  <label class="fl">Nomor Telepon Toko</label><div class="phr"><select class="fi" id="accSCc" aria-label="Kode negara toko">${phCcOpts(sp.cc)}</select><input class="fi" id="accSPhone" type="tel" inputmode="tel" maxlength="14" placeholder="812 3456 7890" value="${esc(sp.num)}"></div>`:''}
  <p class="hint" id="accErr" style="color:var(--bad);min-height:16px;margin:10px 0 0" role="alert"></p>
  <button class="pfbtn" id="accSave" type="button" onclick="accSave()" style="margin-top:8px">${pfi('pencil',18)}Simpan Perubahan</button></div>`;
  accAvDraw();
  try{window.renderAccVerif&&window.renderAccVerif()}catch(e){}
}
function accCancel(){const b=$('#editAccPage');if(b)b.dataset.built='';go('acc')}
/* ----- Ubah Kata Sandi ----- */
function renderPwPage(){
  const box=$('#pwPage');if(!box)return;
  if(box.dataset.built==='1'&&box.querySelector('#pwOld'))return;   /* jangan hapus yang sedang diketik */
  box.dataset.built='1';
  const f=(id,l,ph,ac)=>`<label class="fl" for="${id}">${l}</label><div class="pfin pe">${pfi('lock',20)}<input class="fi" id="${id}" type="password" placeholder="${ph}" autocomplete="${ac}" maxlength="72"><button class="eyeb" type="button" aria-label="Tampilkan atau sembunyikan kata sandi" onclick="accEye('${id}',this)">${pfi('eye',20)}</button></div>`;
  box.innerHTML=`${pfSub('Ubah Kata Sandi',"go('accset')")}<div class="accp pfwrap">
    ${f('pwOld','Kata Sandi Lama','Masukkan kata sandi lama','current-password')}
    ${f('pwNew','Kata Sandi Baru','Masukkan kata sandi baru','new-password')}<p class="pfhint">Minimal 6 karakter.</p>
    ${f('pwNew2','Konfirmasi Kata Sandi Baru','Ulangi kata sandi baru','new-password')}
    <p class="hint" id="pwErr" style="color:var(--bad);min-height:16px"></p>
    <button class="pfbtn" type="button" onclick="changePw()" style="margin-top:8px">${pfi('check',18)}Simpan</button></div>`;
}
function accEye(id,b){const i=$('#'+id);if(!i)return;const sh=i.type==='password';i.type=sh?'text':'password';b.innerHTML=pfi(sh?'eyeoff':'eye',20)}
/* ----- layar sukses ----- */
function accDone(title,desc){
  const b=$('#accOkPage');
  if(b)b.innerHTML=`<div class="pfdone"><div class="big">${pfi('tick',46).replace('stroke-width="1.9"','stroke-width="2.4"')}</div><h2>${esc(title)}</h2><p>${esc(desc)}</p><button class="pfbtn" type="button" onclick="go('acc')">Kembali ke Profil</button></div>`;
  go('accok');
}
/* ----- Verifikasi Email ----- */
function accVerRender(){
  const m=CL.me,box=$('#accVerPage');if(!m||!box)return;
  const left=(window.authCdLeft&&authCdLeft())||0,em=esc(m.email||''),pe=esc(m.pendingEmail||'');
  const ob=(fn,ic,lbl,dis)=>`<button class="pfbtn out" type="button" style="justify-content:center" ${dis?'disabled':''} onclick="${fn}()">${pfi(ic,18)}${lbl}</button>`;
  let warn=true,title,txt,acts='';
  if(!m.hasAuth){title=m.email?'Email Belum Terhubung':'Belum Ada Email';txt=m.email?'Hubungkan email ke akun Anda agar bisa diverifikasi dan dipakai untuk reset kata sandi.':'Tambahkan email agar akun bisa diverifikasi dan dipakai untuk reset kata sandi.';acts=ob('authAddEmail','mail',m.email?'Hubungkan &amp; Verifikasi Email':'Tambah Email')}
  else if(m.pendingEmail){title='Menunggu Verifikasi Email Baru';txt=`Kami mengirim tautan ke <b>${pe}</b>. Buka tautan itu untuk menyelesaikan. Email lama (${em}) tetap dipakai sampai saat itu.`;acts=ob('authResendChange','refresh',left?`Kirim Ulang Tautan (${left} dtk)`:'Kirim Ulang Tautan',left)}
  else if(!m.emailVerified){title='Email Belum Diverifikasi';txt=`Buka tautan verifikasi yang kami kirim ke <b>${em}</b>. Belum menerima? Cek folder spam atau kirim ulang.`;acts=ob('authResend','refresh',left?`Kirim Ulang Email Verifikasi (${left} dtk)`:'Kirim Ulang Email Verifikasi',left)}
  else{warn=false;title='Email Terverifikasi';txt='Email Anda sudah terverifikasi.<br>Terima kasih telah mengamankan akun Anda.'}
  if(m.hasAuth)acts+=ob('authChangeEmail','pencil','Ubah Email');
  box.innerHTML=`${pfSub('Verifikasi Email',"go('accset')")}<div class="pfdone" style="padding-top:28px"><div class="pfenv">${pfi('mail',46)}<i class="bdg ${warn?'w':''}">${pfi(warn?'warn':'tick',16)}</i></div><h2>${title}</h2><p>${txt}</p>
    <div style="max-width:520px;margin:6px auto 0">${acts}<button class="pfbtn" type="button" onclick="go('acc')">Kembali ke Profil</button></div></div>`;
  clearTimeout(ACC.vt);if(left)ACC.vt=setTimeout(()=>{if(S.view==='accver')accVerRender()},1000);
}
/* ----- Notifikasi ----- */
function renderAccNt(){
  const box=$('#accNtPage');if(!box)return;
  const sw=(k,t,d,fn)=>`<label class="pfsw"><span class="tx"><b>${t}</b><small>${d}</small></span><span class="tgl"><input type="checkbox" ${coPref(k,true)?'checked':''} onchange="${fn||`coSetPref('${k}',this.checked)`}"></span></label>`;
  let ps='Tidak didukung di perangkat ini';
  if(window.nativeNotify)ps='Aplikasi Android';
  else if('Notification' in window)ps={granted:'Diizinkan',denied:'Diblokir di pengaturan browser',default:'Belum diminta'}[Notification.permission]||ps;
  box.innerHTML=`${pfSub('Notifikasi',"go('accset')")}<div class="pfw">
    <div class="pfcard">
      ${sw('notif','Notifikasi sistem','Tampilkan notifikasi saat ada pesanan online baru',"coSetNotif(this.checked).then(renderAccNt)")}
      ${sw('sound','Bunyi pesanan masuk','Putar bunyi saat pesanan online masuk')}
      ${sw('vib','Getar pesanan masuk','Getarkan perangkat saat pesanan online masuk')}
    </div>
    <p class="pfhint">Izin notifikasi perangkat: <b>${esc(ps)}</b></p>
    <button class="pfbtn out" type="button" style="justify-content:center" onclick="ntTest()">${pfi('bell',18)}Tes notifikasi</button>
    <button class="pfbtn out" type="button" style="justify-content:center" onclick="coBeep()">${pfi('bell',18)}Tes bunyi</button></div>`;
}
/* ----- Tentang Ordela ----- */
function renderAccAbout(){
  const m=CL.me,box=$('#accAboutPage');if(!m||!box)return;
  const st=accStore(m),own=m.role==='owner';
  const row=(ic,l,v)=>`<div class="pfrow">${pfi(ic,20)}<div class="tx"><small>${l}</small><b>${v}</b></div></div>`;
  box.innerHTML=`${pfSub('Tentang Ordela',"go('accset')")}<div class="pfw">
    <div class="pfhero"><img src="icon-192.png" alt="" width="84" height="84" style="border-radius:22px;box-shadow:0 8px 20px rgba(0,0,0,.12)"><b class="pfn">Ordela</b><small class="pfr">Aplikasi kasir dan pesanan untuk toko Anda</small></div>
    <div class="pfcard">
      ${row('info','Versi aplikasi',`<span id="abVer">${esc(APP_VER)}</span>`)}${row('globe','Versi web','<span id="abWeb">…</span>')}
      ${window.OrdelaUpdate?row('refresh','Pembaruan','<span id="abUpd">Memeriksa…</span>'):''}${row('globe','Situs','ordela.my.id')}
      ${st.name?row('store','Toko',esc(st.name)):''}${own&&st.code?row('id','Kode toko',`<code>${esc(st.code)}</code>`):''}
      ${row('cloud','Koneksi',(CL.on&&CL.tok)?(navigator.onLine===false?'Tidak ada internet':'Terhubung ke server'):'Mode offline')}
    </div>
    ${window.OrdelaBg?`<div class="pfcard" id="abBg"><div class="pfrow">${pfi('refresh',20)}<div class="tx"><small>Berjalan di latar belakang</small><b id="abBgT">…</b></div><button class="pfbtn" type="button" id="abBgB" style="width:auto;padding:8px 14px" onclick="accBgToggle()">…</button></div>
      <div class="pfrow">${pfi('globe',20)}<div class="tx"><small>Gelembung saat diminimalkan</small><b id="abOvT">…</b></div><button class="pfbtn out" type="button" id="abOvB" style="width:auto;padding:8px 14px;display:none" onclick="OrdelaBg.overlay()">Izinkan</button></div>
      <p class="pfhint" id="abOvH" style="display:none;margin:0 16px 12px">Muncul “App was denied access”? Buka <a href="#" onclick="OrdelaBg.info();return false">Info aplikasi</a> › menu ⋮ › <b>Izinkan setelan terbatas</b>, lalu izinkan lagi.</p>
      <div class="pfrow">${pfi('info',20)}<div class="tx"><small>Penghemat baterai</small><b id="abBtT">…</b></div><button class="pfbtn out" type="button" id="abBtB" style="width:auto;padding:8px 14px;display:none" onclick="OrdelaBg.battery()">Izinkan</button></div></div>`:''}
    ${window.OrdelaUpdate?`<button class="pfbtn" type="button" id="abUpdBtn" style="justify-content:center" onclick="OrdelaUpdate.open()">${pfi('refresh',18)}Periksa pembaruan aplikasi</button>`:''}
    <button class="pfbtn out" type="button" style="justify-content:center" onclick="accRefreshApp()">${pfi('refresh',18)}Muat ulang versi terbaru</button></div>`;
  accAboutVer();accBgPaint();
}
async function accBgPaint(){
  if(!window.OrdelaBg)return;const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t};
  try{const s=await OrdelaBg.status();set('abBgT',s.on?(s.running?'Aktif':'Menyalakan…'):'Mati');set('abBgB',s.on?'Matikan':'Nyalakan');
    set('abOvT',s.overlay?'Diizinkan':'Belum diizinkan');const o=document.getElementById('abOvB');if(o)o.style.display=s.overlay?'none':'';const oh=document.getElementById('abOvH');if(oh)oh.style.display=s.overlay?'none':'';
    set('abBtT',s.battery?'Tidak dibatasi':'Dibatasi sistem');const b=document.getElementById('abBtB');if(b)b.style.display=s.battery?'none':'';
    if(!window.__abBgL){window.__abBgL=1;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.view==='accabout')accBgPaint()})}}catch(e){}
}
async function accBgToggle(){try{const s=await OrdelaBg.status();await OrdelaBg.set(!s.on)}catch(e){}setTimeout(accBgPaint,600)}
/* versi APK terpasang (nomor build), versi web (dari sw.js), dan status pembaruan; ikut berubah tiap build */
async function accAboutVer(){
  const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t};
  try{const r=await fetch('sw.js',{cache:'no-store'});const m=(await r.text()).match(/ordela-v(\d+)/);set('abWeb',m?'v'+m[1]:'-')}catch(e){set('abWeb','-')}
  const U=window.OrdelaUpdate;if(!U)return;
  const paint=()=>{const s=U.state(),i=s.info;if(i)set('abVer',i.version+(i.build?' (build '+i.build+')':''));
    const b=document.getElementById('abUpdBtn');
    if(!s.done)set('abUpd','Memeriksa…');else if(s.avail){set('abUpd','Tersedia: '+(s.meta&&s.meta.version||''));if(b)b.lastChild.textContent='Unduh pembaruan'}else set('abUpd','Sudah versi terbaru')};
  await U.info();paint();if(window.__abPaint)window.removeEventListener('ordela-update',window.__abPaint);window.__abPaint=paint;window.addEventListener('ordela-update',paint);U.check(false).then(paint);
}
/* ----- Hapus Akun ----- */
async function accDelLoad(){
  if(!CL.me||CL.me.role!=='owner'){ACC.delSole=false;return}
  try{const r=await api('/api/users');if(r.ok){const j=await r.json();ACC.delSole=!(j.users||[]).some(u=>u.role==='owner'&&u.active&&u.id!==CL.me.id)}else ACC.delSole=true}catch(e){ACC.delSole=true}
  if(S.view==='accdel'){const b=$('#accDelPage');if(b)b.dataset.built='';renderAccDel()}
}
function renderAccDel(){
  const m=CL.me,box=$('#accDelPage');if(!m||!box)return;
  if(box.dataset.built==='1'&&box.querySelector('#delPw'))return;
  if(ACC.delSole===undefined){ACC.delSole=null;accDelLoad()}
  const wipe=ACC.delSole===true,own=m.role==='owner';
  box.dataset.built='1';
  const li=t=>`<li>${t}</li>`;
  box.innerHTML=`${pfSub('Hapus Akun',"go('accset')")}<div class="pfw">
    <div class="deli">${pfi('warn',46).replace('stroke-width="1.9"','stroke-width="2.2"')}</div>
    <h2 class="delh">Yakin ingin menghapus akun?</h2>
    <p class="delp">${wipe?'Anda adalah satu-satunya owner. Menghapus akun ini akan <b>menghapus seluruh toko beserta semua datanya</b> secara permanen.':'Akun Anda akan dihapus dari toko ini dan tidak bisa dipakai masuk lagi. Tindakan ini tidak bisa dibatalkan.'}</p>
    <ul class="dell">${wipe?li('Semua menu, transaksi, dan pesanan online toko dihapus')+li('Semua akun karyawan toko ikut dihapus')+li('Kode toko dan tautan pemesanan tidak berlaku lagi'):li('Anda langsung keluar dari semua perangkat')+(own?li('Owner lain tetap bisa mengelola toko'):li('Riwayat transaksi toko tetap tersimpan'))}${li('Data tidak bisa dipulihkan')}</ul>
    <label class="fl" for="delPw">Masukkan kata sandi untuk melanjutkan</label>
    <div class="pfin pe">${pfi('lock',20)}<input class="fi" id="delPw" type="password" placeholder="Kata sandi Anda" autocomplete="current-password" maxlength="72" oninput="accDelChk()"><button class="eyeb" type="button" aria-label="Tampilkan atau sembunyikan kata sandi" onclick="accEye('delPw',this)">${pfi('eye',20)}</button></div>
    <label class="delck"><input type="checkbox" id="delOk" onchange="accDelChk()"><span>Saya mengerti bahwa akun${wipe?' dan seluruh data toko':''} akan dihapus permanen.</span></label>
    <p class="hint" id="delErr" style="color:var(--bad);min-height:16px"></p>
    <button class="pfbtn delbtn" id="delGo" type="button" disabled onclick="accDelAsk()">Ya, hapus akun saya</button>
    <button class="pfbtn out" type="button" style="justify-content:center" onclick="go('accset')">Batal</button>
    <p class="pfhint" style="text-align:center;margin-top:14px">${wipe?'Ingin mengganti kepemilikan dulu? Jadikan karyawan sebagai owner di menu Pengguna sebelum menghapus akun.':''}</p></div>`;
}
function accDelChk(){const g=$('#delGo');if(!g)return;g.disabled=!(($('#delPw')||{}).value&&($('#delOk')||{}).checked);const e=$('#delErr');if(e)e.textContent=''}
function accDelAsk(){
  const wipe=ACC.delSole===true;
  openModal(`<div class="lgo"><div class="lgi">${pfi('warn',30)}</div><h3>Hapus akun Anda?</h3>
  <p>${wipe?'Seluruh toko dan datanya akan dihapus permanen.':'Tindakan ini tidak bisa dibatalkan dan Anda tidak akan bisa memulihkan akun.'}</p>
  <div class="dlg2"><button class="btn del" type="button" onclick="accDelDo()">Hapus</button><button class="btn sec" type="button" onclick="closeModal()">Batal</button></div></div>`);
}
async function accDelDo(){
  const pw=($('#delPw')||{}).value||'';closeModal();
  const e=$('#delErr'),g=$('#delGo');if(g)g.disabled=true;
  try{
    const r=await api('/api/me',{method:'DELETE',body:JSON.stringify({password:pw})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){if(e)e.textContent=j.error||'Gagal menghapus akun';if(g)g.disabled=false;return}
    cloudLogout('Akun Anda telah dihapus.');
  }catch(x){if(e)e.textContent='Tidak ada koneksi. Coba lagi.';if(g)g.disabled=false}
}
function accRefreshApp(){
  ask('Muat ulang aplikasi?',CL.dirty?'Ada perubahan yang belum tersinkron. Tunggu sampai tersinkron dulu supaya tidak hilang.':'Aplikasi akan mengambil versi terbaru lalu dimuat ulang. Data Anda tidak dihapus.','Muat ulang',async()=>{
    try{const rs=await (navigator.serviceWorker&&navigator.serviceWorker.getRegistrations?navigator.serviceWorker.getRegistrations():[]);await Promise.all(rs.map(r=>r.unregister()));
      if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}}catch(e){}
    location.reload();
  });
}
function accAvDraw(){
  const m=CL.me||{};
  /* halaman profil (accAvV) dan halaman edit (accAv) memakai id berbeda: dua elemen berid sama membuat foto tidak berubah */
  const nm=(($('#accName')||{}).value||m.name||'?').trim().charAt(0).toUpperCase();
  const v=$('#accAvV');if(v)v.innerHTML=(m.photo?`<img src="${esc(m.photo)}" alt="">`:esc(String(m.name||'?').trim().charAt(0).toUpperCase()));
  const e=$('#accAv');if(e)e.innerHTML=ACC.photo?`<img src="${esc(ACC.photo)}" alt="">`:esc(nm);
  const r=$('#accRm');if(r)r.hidden=!ACC.photo;
}
let ACC_CROP=null;
function accSheet(ctx){
  ACC.ctx=ctx||'edit';
  openModal(`<div class="shh"><h3>Pilih Foto</h3><button class="x" type="button" onclick="closeModal()" aria-label="Tutup">${pfi('x',18)}</button></div>
  <button class="shr" type="button" onclick="accPick('cam')">${pfi('camera',22)}Ambil Foto</button>
  <button class="shr" type="button" onclick="accPick('gal')">${pfi('image',22)}Pilih dari Galeri</button>
  <button class="shr" type="button" onclick="closeModal()">${pfi('x',22)}Batal</button>`);
  $('#mw').classList.add('sheetm');
}
function accPick(k){closeModal();const i=$(k==='cam'?'#accFileCam':'#accFile');if(i)i.click()}
function accPhoto(inp){
  const f=inp.files&&inp.files[0];inp.value='';if(!f)return;
  if(!ACC.ctx)ACC.ctx=S.view==='editacc'?'edit':'view';
  if(!/^image\//.test(f.type)){toast('Pilih file gambar');return}
  if(f.size>12*1024*1024){toast('Ukuran foto maksimal 12 MB');return}
  const rd=new FileReader();
  rd.onload=()=>{const im=new Image();im.onload=()=>openAccCrop(im);im.onerror=()=>toast('Foto tidak bisa dibaca');im.src=rd.result};
  rd.onerror=()=>toast('Foto tidak bisa dibaca');rd.readAsDataURL(f);
}
function openAccCrop(im){
  ACC_CROP={im,zoom:1,x:0,y:0,drag:null};
  const opt=(ic,t,d,fn)=>`<button type="button" onclick="${fn}"><span class="ib2">${pfi(ic,20)}</span><span class="tx"><b>${t}</b><small>${d}</small></span></button>`;
  $('#accPhotoPage').innerHTML=`${pfSub('Ubah Foto Profil','accPhotoBack()')}<div class="pfw pcrop">
    <div class="cropstage" id="cropStage"><canvas id="cropCanvas" width="320" height="320"></canvas><i class="cframe"></i></div>
    <div class="cropcontrols"><label for="cropZoom"><span>Perbesar foto</span><b id="cropZoomVal">100%</b></label><input id="cropZoom" type="range" min="1" max="3" step=".01" value="1" oninput="accCropZoom(this.value)"></div>
    <div class="pfmenu">${opt('camera','Ambil Foto','Gunakan kamera',"accPick('cam')")}${opt('image','Pilih dari Galeri','Pilih foto yang sudah ada',"accPick('gal')")}${opt('trash','Hapus Foto','Hapus foto profil saat ini','accPhotoRemove()')}</div>
    <button class="pfbtn" type="button" id="accPhSave" onclick="saveAccCrop()">Simpan Foto</button></div>`;
  go('accphoto');
  const c=$('#cropCanvas');c.onpointerdown=accCropDown;c.onpointermove=accCropMove;c.onpointerup=accCropUp;c.onpointercancel=accCropUp;c.onpointerleave=accCropUp;accCropDraw();
}
function accPhotoBack(){ACC_CROP=null;go(ACC.ctx==='edit'?'editacc':'acc')}
/* simpan foto langsung ke akun (dari halaman Profil, bukan dari form Edit Profil) */
async function accPhotoApply(photo){
  const m=CL.me;if(!m)return false;
  try{
    const r=await api('/api/me',{method:'PUT',body:JSON.stringify({name:m.name,phone:m.phone||'',photo,birth:m.birth||'',address:m.address||''})}),j=await r.json();
    if(!r.ok){toast(j.error||'Gagal menyimpan foto');return false}
    setMe(j);renderAcct();return true;
  }catch(x){if(x.message!=='auth')toast('Tidak bisa terhubung ke server');return false}
}
async function accPhotoRemove(){
  ACC_CROP=null;
  if(ACC.ctx==='edit'){ACC.photo='';go('editacc');accAvDraw();return}
  if(await accPhotoApply('')){go('acc');toast('Foto profil dihapus')}
}
function accCropDraw(){
  const q=ACC_CROP,c=$('#cropCanvas');if(!q||!c)return;const x=c.getContext('2d'),w=c.width,h=c.height,im=q.im;
  const base=Math.max(w/im.width,h/im.height),sc=base*q.zoom,iw=im.width*sc,ih=im.height*sc;
  const maxX=Math.max(0,(iw-w)/2),maxY=Math.max(0,(ih-h)/2);q.x=Math.max(-maxX,Math.min(maxX,q.x));q.y=Math.max(-maxY,Math.min(maxY,q.y));
  x.clearRect(0,0,w,h);x.fillStyle='#171717';x.fillRect(0,0,w,h);x.drawImage(im,(w-iw)/2+q.x,(h-ih)/2+q.y,iw,ih);
}
function accCropZoom(v){if(!ACC_CROP)return;ACC_CROP.zoom=Number(v)||1;const e=$('#cropZoomVal');if(e)e.textContent=Math.round(ACC_CROP.zoom*100)+'%';accCropDraw()}
function accCropDown(e){if(!ACC_CROP)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);ACC_CROP.drag={x:e.clientX,y:e.clientY,ox:ACC_CROP.x,oy:ACC_CROP.y}}
function accCropMove(e){const q=ACC_CROP;if(!q||!q.drag)return;e.preventDefault();const r=e.currentTarget.getBoundingClientRect(),scale=320/r.width;q.x=q.drag.ox+(e.clientX-q.drag.x)*scale;q.y=q.drag.oy+(e.clientY-q.drag.y)*scale;accCropDraw()}
function accCropUp(){if(ACC_CROP)ACC_CROP.drag=null}
function cancelAccCrop(){accPhotoBack()}
async function saveAccCrop(){
  const q=ACC_CROP;if(!q)return;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),im=q.im,w=320,h=320,base=Math.max(w/im.width,h/im.height),sc=base*q.zoom,iw=im.width*sc,ih=im.height*sc;
  x.fillStyle='#fff';x.fillRect(0,0,256,256);x.drawImage(im,((w-iw)/2+q.x)/w*256,((h-ih)/2+q.y)/h*256,iw/w*256,ih/h*256);
  let url;try{url=c.toDataURL('image/jpeg',.84)}catch(e){toast('Foto tidak bisa diproses');return}
  ACC_CROP=null;
  if(ACC.ctx==='edit'){ACC.photo=url;go('editacc');accAvDraw();return}
  const b=$('#accPhSave');if(b)b.disabled=true;
  if(await accPhotoApply(url)){go('acc');toast('Foto profil diperbarui')}else if(b)b.disabled=false;
}
function phDefCc(){let z='';try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}return /Kuala_Lumpur|Kuching/.test(z)?'60':/Singapore/.test(z)?'65':/Brunei/.test(z)?'673':'62'}
function phSplit(v){
  v=String(v||'').trim();const dg=v.replace(/\D/g,'');
  if(!dg)return{cc:phDefCc(),num:''};
  if(v[0]==='+'){const c=PH_CC.map(x=>x[0]).sort((a,b)=>b.length-a.length).find(c=>dg.startsWith(c));if(c)return{cc:c,num:phFmt(dg.slice(c.length))};return{cc:phDefCc(),num:phFmt(dg)}}
  return{cc:phDefCc(),num:phFmt(dg.replace(/^0+/,''))};
}
function phFmt(d){d=String(d).replace(/\D/g,'');return d.replace(/^(\d{3})(\d{1,4})?(\d{1,4})?(\d*)$/,(m,a,b,c,r)=>[a,b,c,r].filter(Boolean).join(' '))}
function phCcOpts(sel){return PH_CC.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${n} (+${c})</option>`).join('')}
function accPhotoDel(){ACC.photo='';accAvDraw()}
async function accSave(){
  const e=$('#accErr'),btn=$('#accSave'),m=CL.me,own=m&&m.role==='owner',name=$('#accName').value.trim().replace(/\s+/g,' ');
  const num=x=>x.replace(/\D/g,'').replace(/^0+/,''),fmt=(cc,n)=>n?'+'+cc+' '+phFmt(n):'';
  const pn=num($('#accPhone').value),phone=fmt($('#accCc').value,pn),birth=$('#accBirth').value,addr=$('#accAddr').value.trim();
  if(!name){e.textContent='Nama lengkap wajib diisi';return}
  if(pn&&(pn.length<6||phone.length>20)){e.textContent='Nomor telepon tidak valid';return}
  if(birth&&(birth>new Date().toISOString().slice(0,10)||birth<'1900-01-01')){e.textContent='Tanggal lahir tidak valid';return}
  const body={name,phone,photo:ACC.photo||'',birth,address:addr};
  let sName='',sPhone='';
  if(own){
    const un=$('#accUser').value.trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(un)){e.textContent='Username 3-24 karakter: huruf kecil, angka, titik, strip, garis bawah';return}
    body.username=un;
    sName=($('#accStore').value||'').trim().replace(/\s+/g,' ');
    if(sName.length<2){e.textContent='Nama toko minimal 2 karakter';return}
    body.storeName=sName;
    const sn=num($('#accSPhone').value);if(sn&&sn.length<6){e.textContent='Nomor telepon toko tidak valid';return}
    sPhone=fmt($('#accSCc').value,sn);
  }
  btn.disabled=true;e.textContent='';
  try{
    const r=await api('/api/me',{method:'PUT',body:JSON.stringify(body)}),j=await r.json();
    if(!r.ok){e.textContent=j.error||'Gagal menyimpan';return}
    setMe(j);
    if(own){db.set.store=sName;db.set.phone=sPhone;save();try{applyBrand()}catch(x){}}
    const b=$('#editAccPage');if(b)b.dataset.built='';
    renderAcct();accDone('Profil Berhasil Diperbarui','Informasi profil Anda telah berhasil disimpan.');
  }catch(x){if(x.message!=='auth')e.textContent='Tidak bisa terhubung ke server'}
  finally{btn.disabled=false}
}
async function changePw(){
  const o=$('#pwOld').value,n=$('#pwNew').value,n2=$('#pwNew2').value,e=$('#pwErr');
  if(!o||!n){e.textContent='Isi password saat ini dan password baru';return}
  if(n.length<6){e.textContent='Password baru minimal 6 karakter';return}
  if(n!==n2){e.textContent='Pengulangan password tidak sama';return}
  try{
    const r=await api('/api/me/password',{method:'POST',body:JSON.stringify({old:o,new:n})});
    const j=await r.json();
    if(!r.ok){e.textContent=j.error||'Gagal';return}
    CL.tok=j.token;try{localStorage.setItem('pos_tok',CL.tok)}catch(x){}
    ['pwOld','pwNew','pwNew2'].forEach(i=>{const e=$('#'+i);if(e)e.value=''});$('#pwErr').textContent='';const pb=$('#pwPage');if(pb)pb.dataset.built='';accDone('Kata Sandi Berhasil Diubah','Gunakan kata sandi baru saat Anda masuk berikutnya.');
  }catch(x){if(x.message!=='auth')e.textContent='Tidak bisa terhubung ke server'}
}
/* dialog keluar: hanya dua pilihan, Keluar atau Batal */
function logoutAsk(){
  openModal(`<div class="lgo"><div class="lgi"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></div>
  <h3>Keluar dari akun?</h3><p>${CL.dirty?'Ada perubahan yang belum tersinkron dan bisa hilang kalau Anda keluar sekarang.':'Anda perlu masuk lagi untuk memakai aplikasi.'}</p>
  <button class="btn red" onclick="closeModal();cloudLogout()">Keluar</button>
  <button class="btn sec" onclick="closeModal()">Batal</button></div>`);
}
/* ----- pembatasan saat sinkron: karyawan tidak mengirim perubahan di luar izinnya ----- */
const SET_FREE_KEYS=['gv','lang','fsAuto','logoInit','logoApp','prn','prns','paper','vcl'];
   // vcl: pelajaran Voice Cashier, dipakai semua kasir   // prn/prns/paper: printer per perangkat
function restrictToServer(M,S){
  const me=CL.me;if(!me||me.role==='owner')return M;
  const has=k=>(me.perms||[]).includes(k),out={...M};
  out.items=S.items.map(si=>{const m=M.items.find(x=>x.id===si.id);return m?{...si,stock:m.stock}:si});   // karyawan: hanya stok yang boleh berubah
  out.cats=S.cats;
  const om=new Map(S.orders.map(o=>[o.no,o]));
  out.orders=M.orders.map(o=>om.get(o.no)||o);
  const set={...M.set};
  for(const k of Object.keys(S.set||{})){
    if(SET_FREE_KEYS.includes(k)||has('set')||(k==='prn'&&has('prn')))continue;
    set[k]=S.set[k];
  }
  out.set=set;return out;
}

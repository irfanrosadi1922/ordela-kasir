/* Ordela — modul inti: navigasi, beranda, meja, notifikasi, modal & boot.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
const $=s=>document.querySelector(s);
const KEY='sushi_pos_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Hanya izinkan URL gambar yang diperlukan aplikasi; escape atribut untuk mencegah injeksi HTML.
const imgSrc=s=>{const v=String(s??'').trim();return (/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(v)||/^https?:\/\//i.test(v))?esc(v):''};
const emo=i=>i.emoji&&i.emoji!=='🍽️'?esc(i.emoji):'<i class="ic solo" data-ic="food"></i>';
 // item tanpa gambar: emoji pilihan, atau ikon bawaan
const uid=()=>'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function seed(){
  const it=(name,cat,price,cost,stock,emoji)=>({id:uid(),name,cat,price,cost,stock,min:5,img:'',emoji});
  return{
    cats:['Appetizer','Salad','Sashimi','Nigiri','Sushi Roll','Minuman'],
    items:[
      it('Edamame','Appetizer',25000,10000,40,'🫛'),
      it('Bang Bang Shrimp','Appetizer',45000,22000,30,'🍤'),
      it('Enoki Tempura','Appetizer',32000,13000,25,'🍄'),
      it('Chicken Karaage','Appetizer',38000,17000,22,'🍗'),
      it('Okonomiyaki','Appetizer',42000,19000,18,'🥞'),
      it('Seaweed Salad','Salad',28000,11000,20,'🥗'),
      it('Salmon Salad','Salad',48000,24000,15,'🥗'),
      it('Salmon Sashimi','Sashimi',65000,38000,12,'🍣'),
      it('Tuna Sashimi','Sashimi',70000,42000,10,'🐟'),
      it('Salmon Nigiri','Nigiri',30000,16000,30,'🍣'),
      it('Ebi Nigiri','Nigiri',28000,14000,3,'🍤'),
      it('Tempura Maki','Sushi Roll',46000,21000,20,'🍱'),
      it('California Roll','Sushi Roll',44000,20000,24,'🍣'),
      it('Ocha Panas','Minuman',12000,3000,60,'🍵'),
      it('Es Teh Lemon','Minuman',15000,4000,0,'🍋'),
    ],
    orders:[],log:[],seq:1,
    set:{store:'Ordela',addr:'Jl. Contoh No. 1, Kota',tax:10,paper:'80',cur:'Rp',foot:'Terima kasih atas kunjungan Anda!',low:5}
  };
}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.items){globalThis.__lsok=true;return d}}catch(e){}globalThis.__lsok=false;return seed()}
const LOG_MAX=1000;
const DEF_LOGO='icon-192.png';
/* pengaturan printer disimpan per perangkat/aplikasi (tidak ikut tersinkron ke perangkat lain) */
const LP_KEY='pos_prn_local';
function lpRead(){try{return JSON.parse(localStorage.getItem(LP_KEY)||'null')}catch(e){return null}}
function lpSeed(main,paper){try{localStorage.setItem(LP_KEY,JSON.stringify({main,list:[],paper:paper||'80'}))}catch(e){}}
function lpWrite(){try{localStorage.setItem(LP_KEY,JSON.stringify({main:db.set.prn,list:db.set.prns||[],paper:db.set.paper}))}catch(e){}}
function fixDb(d){d.set=d.set||{};if(d.set.fsAuto==null)d.set.fsAuto=true;if(d.set.logoApp==null)d.set.logoApp=true;if(d.set.rc&&d.set.rc.logo&&!d.set.logo){d.set.logo=d.set.rc.logo;d.set.rc.logo=''}d.set.logo=d.set.logo||'';d.set.gv={...GV_DEF,...(d.set.gv||{})};delete d.set.gv.size;d.set.lang=d.set.lang||'id';if(d.set.dec==null)d.set.dec=0;d.set.loc=d.set.loc||'id-ID';d.set.curPos=d.set.curPos||'before';d.set.cur=d.set.cur||'Rp';d.set.curCode=d.set.curCode||(d.set.cur==='Rp'?'IDR':'CUSTOM');d.set.rc={...RC_DEF,...(d.set.rc||{})};d.set.pay={on:false,qris:'',name:'',note:'',...(d.set.pay&&typeof d.set.pay==='object'?d.set.pay:{})};delete d.set.pay.qr;{const L=lpRead();d.set.prn={...PRN_DEF,...((L&&L.main)||d.set.prn||{})};d.set.prns=Array.isArray(L&&L.list)?L.list:[];d.set._lp=L&&L.paper||'';if(!L)lpSeed(d.set.prn,d.set.paper)}d.set.att={on:false,tz:'',lat:'',lng:'',radius:100,strict:false,shifts:[],assign:{},...(d.set.att&&typeof d.set.att==='object'?d.set.att:{})};d.set.paper=d.set._lp||d.set.paper||'80';delete d.set._lp;for(const k of ['shifts','exps','buys','sups','members','promos','occ','gifts','rsv'])if(!Array.isArray(d[k]))d[k]=[];d.log=d.log||[];d.orders=d.orders||[];d.cats=d.cats||[];
  if(d.set.store==='Sushi POS'||d.set.store==='Octocat')d.set.store='Ordela';
  if(d.set.logo&&((d.set.logo.length===9895&&d.set.logo.slice(0,40)==='data:image/jpeg;base64,/9j/4AAQSkZJRgABA')||(d.set.logo.length===22538&&d.set.logo.slice(-24)==='YWBpBFcIAAAAAElFTkSuQmCC')))d.set.logo=DEF_LOGO; /* ganti logo bawaan lama */
  if(/^https?:\/\/raw\.githubusercontent\.com\/[^?#]*\/(icon|brand)[^?#]*$/i.test(String(d.set.logo||'')))d.set.logo=DEF_LOGO;   // logo bawaan lama di alamat luar -> file lokal
  if(!d.set.logo){d.set.logo=DEF_LOGO;if(!d.set.logoInit)d.set.rc.showLogo=false}
  d.set.logoInit=true;
  delete d.set.map;if(d.set.rc){delete d.set.rc.showMapQr;delete d.set.rc.mapQrText}
  ['holds','members','promos','shifts','exps','sups','buys','kds','occ','gifts','rsv'].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});
  if(d.set.ptsPer==null)d.set.ptsPer=10000;if(d.set.ptsVal==null)d.set.ptsVal=100;
  {const cut=Date.now()-3*864e5;d.holds=d.holds.filter(h=>!(h.del&&(h.u||0)<cut))}
  syncBundles(d);
  return d}
function save(){lpWrite();syncBundles(db);db._ts=Date.now();LSFAIL=false;try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){LSFAIL=true}schedMirror();if(CL.on){CL.dirty=true;persistMeta();schedSync()}}
const dec=()=>Math.max(0,Math.min(4,+db.set.dec||0));
const rnd=v=>{const f=Math.pow(10,dec());return Math.round((+v+Number.EPSILON)*f)/f};
const fmtNum=n=>Number(n).toLocaleString(db.set.loc||'id-ID',{minimumFractionDigits:dec(),maximumFractionDigits:dec()});
const money=n=>{const s=db.set,v=fmtNum(n);return s.curPos==='after'?v+' '+s.cur:s.cur+' '+v};
const find=id=>db.items.find(i=>i.id===id);
/* ---------- navigation ---------- */
function toggleDrawer(){$('#drawer').classList.toggle('open');$('#scrim').classList.toggle('on',$('#drawer').classList.contains('open'))}
function closeAll(){$('#drawer').classList.remove('open');$('#scrim').classList.remove('on')}
const P2V=['ai','riw','integ','gift','rsv','opname','menu','shift','exp','buy','mem','promo','kds'];
const ACCV=['acc','accset','accinfo','editacc','accphoto','pw','accver','accnt','accabout','accdel','accok'];
function go(v){
  if(v!=='co'&&document.getElementById('coSpotBg'))coSpotEnd();
  if(S.view==='set'&&v!=='set')S.setSub=null;
  if(v==='hist'||v==='rep')v='home';   // Riwayat & Laporan sudah menyatu di Beranda
  if(ACCV.includes(v)&&!(CL.on&&CL.me))v='set';
  if(!canView(v)){if(v!=='pos')toast('Anda tidak punya akses ke halaman itu');v=landing()}
  if(isOwner()&&viewLock(v)){upgradeDlg(v);return}
  if(v==='editacc'&&S.view!=='editacc'&&S.view!=='accphoto'){const eb=$('#editAccPage');if(eb)eb.dataset.built=''}
  if(v==='pyr'&&S.view!=='pyr'){PY.built=false;PY.d=null;PY.rowsKey=''}
  if(v==='accdel'&&S.view!=='accdel'){const db_=$('#accDelPage');if(db_)db_.dataset.built='';ACC.delSole=undefined}
  if(v==='accset'&&S.view!=='accset'){const qb=$('#accSetPage');if(qb)qb.dataset.built=''}
  if(v==='pw'&&S.view!=='pw'){const pb=$('#pwPage');if(pb)pb.dataset.built=''}
  S.view=v;closeAll();toggleInv(false);
  ['pos','home','table','alert','inv','rc','prn','set','co','usr','att','pyr'].concat(P2V,ACCV).forEach(x=>$('#v-'+x).hidden=x!==v);
  if(v==='rc'||v==='prn'){const h=$('#'+v+'Head');if(h)h.innerHTML=pfSub(v==='rc'?'Desain Struk':'Printer',"go('set')")}
  const nv=ACCV.includes(v)?'acc':(v==='rc'||v==='prn')?'set':v;   // semua halaman profil menyalakan menu Akun
  document.querySelectorAll('.drawer button,.bnav button,.rail button').forEach(b=>b.classList.toggle('on',b.dataset.v===nv));
  navDot(nv);
  $('#invoice').style.display=v==='pos'?'':'none';
  $('#fab').classList.toggle('hide',v!=='pos');
  $('.search').style.visibility=(v==='pos'||v==='inv')?'visible':'hidden';
  render();
}
function navDraw(x){
  const n=$('#bnav'),h=$('#bnhole'),r=$('#bnrect'),d=$('#bndot');if(!n||!h||!r||!d)return;
  NAV.x=x;const W=n.clientWidth,H=n.clientHeight;
  r.setAttribute('width',W);r.setAttribute('height',H+40);
  d.style.transform='translateX('+x+'px)';
  if(NAV.none){h.setAttribute('d','');return}
  /* lengkung mulus mengelilingi lingkaran (pusat y=20, jari-jari 29 + celah 8) */
  const R=37,cy=20,t=20*Math.PI/180,ax=R*Math.cos(t),ay=cy+R*Math.sin(t),k=14,tx=Math.sin(t)*k,ty=Math.cos(t)*k;
  const f=n=>n.toFixed(1);
  h.setAttribute('d','M'+f(x-62)+',-40L'+f(x-62)+',0C'+f(x-46)+',0 '+f(x-ax-tx)+','+f(ay-ty)+' '+f(x-ax)+','+f(ay)+'A'+R+','+R+' 0 0 0 '+f(x+ax)+','+f(ay)+'C'+f(x+ax+tx)+','+f(ay-ty)+' '+f(x+46)+',0 '+f(x+62)+',0L'+f(x+62)+',-40Z');
}
function navDot(v,instant){
  const n=$('#bnav');if(!n||!n.querySelectorAll||!n.clientWidth)return;
  const bs=Array.from(n.querySelectorAll('button')),b=bs.find(b=>b.dataset.v===v);
  n.classList.toggle('none',!b);NAV.none=!b;
  if(!b){navDraw(NAV.x==null?n.clientWidth/2:NAV.x);return}
  const to=b.offsetLeft+b.offsetWidth/2,from=NAV.x==null||instant?to:NAV.x;
  cancelAnimationFrame(NAV.raf);
  if(from===to){navDraw(to);return}
  const t0=performance.now(),D=420,c1=1.9;
  const ease=u=>{u-=1;return u*u*((c1+1)*u+c1)+1};  /* easeOutBack */
  (function step(now){const u=Math.min(1,(now-t0)/D);navDraw(from+(to-from)*ease(u));if(u<1)NAV.raf=requestAnimationFrame(step)})(t0);
}
/* Setelah rotasi, ukur ulang indikator sekali setelah layout stabil.
   Hindari listener visualViewport/keyboard yang ikut mengubah posisi tombol. */
function refreshNavAfterRotation(){
  const n=$('#bnav');
  if(!n||!n.clientWidth)return;
  cancelAnimationFrame(NAV.raf);
  NAV.raf=0;
  NAV.x=null;
  const active=n.querySelector('button.on');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    navDot(active?active.dataset.v:null,true);
  }));
}
function toggleInv(open){$('#invoice').classList.toggle('open',open);$('#fab').classList.toggle('hide',!!open||S.view!=='pos')}
/* ---------- modal & boot ---------- */
/* tombol aksi di bagian bawah modal ditempel (tidak ikut scroll): bungkus deretan tombol terakhir dengan .stkb */
function stickFoot(){
  const m=$('#modal');if(!m||m.querySelector('.stkb'))return;
  const isAct=e=>e&&e.nodeType===1&&(e.matches('button,.btn')||(e.children.length&&[...e.children].every(c=>c.matches('button,.btn'))&&!e.matches('table,ul,ol,select')));
  const k=[...m.children];let i=k.length;while(i>0&&isAct(k[i-1]))i--;
  if(i===k.length)return;
  const w=document.createElement('div');w.className='stkb';k[i].before(w);k.slice(i).forEach(e=>w.appendChild(e));
}
function openModal(h){$('#modal').innerHTML=h;$('#mw').classList.remove('sheetm');$('#mw').classList.add('on');try{stickFoot()}catch(e){}}
function closeModal(){attStop();$('#mw').classList.remove('on')}
function render(){
  renderCats();renderGrid();renderInvoice();
  if(window.P2&&P2.views[S.view])P2.views[S.view]();
  if(S.view==='home')renderHome();
  if(S.view==='table')renderTable();
  if(S.view==='alert')renderAlert();
  if(S.view==='inv')renderInv();
  if(S.view==='set')renderSet();
  if(S.view==='rc')renderRc();
  if(S.view==='prn')renderPrn();
  if(S.view==='co')renderCo(true);
  if(S.view==='usr')renderUsr();
  if(S.view==='acc')renderAccPage();
  if(S.view==='accset')renderAccSet();
  if(S.view==='accinfo')renderAccInfo();
  if(S.view==='editacc')renderEditAccPage();   /* tidak menimpa isian yang sedang diubah */
  if(S.view==='pw')renderPwPage();
  if(S.view==='accver')accVerRender();
  if(S.view==='accnt')renderAccNt();
  if(S.view==='accabout')renderAccAbout();
  if(S.view==='accdel')renderAccDel();
  if(S.view==='att')renderAtt();else ATT.built=false;
  if(S.view==='pyr')pyRender();
}
const RAIL_USER='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>';
/* ---------- Beranda (rekap + riwayat) / Meja / Notifikasi ---------- */
const sumT=l=>l.reduce((a,b)=>a+(+b.total||0),0);
const cmp=n=>{try{return new Intl.NumberFormat(db.set.loc||'id-ID',{notation:'compact',maximumFractionDigits:1}).format(n)}catch(e){return String(Math.round(n))}};
const cmpM=n=>{const s=db.set,v=cmp(n);return s.curPos==='after'?v+' '+s.cur:s.cur+' '+v};
/* deret penjualan untuk grafik: per jam (satu hari) atau per hari (rentang tanggal) */
function salesSeries(list,f,t){
  if(f&&f===t){
    const hs=list.map(x=>new Date(x.t).getHours());
    const lo=Math.min(9,...hs),hi=Math.max(20,...hs),labels=[],vals=[];
    for(let h=lo;h<=hi;h++){labels.push(String(h).padStart(2,'0')+':00');vals.push(0)}
    list.forEach(x=>{vals[new Date(x.t).getHours()-lo]+=+x.total||0});
    return{labels,vals,note:''};
  }
  const now=new Date(),day=k=>new Date(k+'T00:00:00');
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let end=t?day(t):today;if(end>today)end=today;   // tanggal akhir di masa depan dipotong sampai hari ini
  let start=f?day(f):new Date(end.getFullYear(),end.getMonth(),end.getDate()-29),note=f?'':' (30 hari terakhir)';
  let n=Math.round((end-start)/864e5)+1;
  if(n>62){start=new Date(end.getFullYear(),end.getMonth(),end.getDate()-61);n=62;note=' (62 hari terakhir)'}
  if(n<1)n=1;
  const multi=start.getMonth()!==end.getMonth()||start.getFullYear()!==end.getFullYear(),labels=[],vals=[],idx={};
  for(let i=0;i<n;i++){
    const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
    idx[dkey(d)]=i;vals.push(0);
    labels.push(n<=7?d.toLocaleDateString(dloc(),{weekday:'short'}):multi?d.getDate()+'/'+(d.getMonth()+1):String(d.getDate()));
  }
  list.forEach(x=>{const j=idx[dkey(x.t)];if(j!=null)vals[j]+=+x.total||0});
  return{labels,vals,note};
}
const inR=(x,f,t)=>{const k=dkey(x.t);return(!f||k>=f)&&(!t||k<=t)};
/* periode sebelumnya dengan panjang yang sama (untuk panah naik/turun); 'Semua' tidak punya pembanding */
function hrPrev(){
  if(!S.hf||!S.ht)return null;
  const a=new Date(S.hf+'T00:00:00'),b=new Date(S.ht+'T00:00:00'),n=Math.round((b-a)/864e5)+1;
  return[dkey(new Date(a.getFullYear(),a.getMonth(),a.getDate()-n)),dkey(new Date(a.getFullYear(),a.getMonth(),a.getDate()-1))];
}
function hrLabel(){
  const m={today:'Hari ini',yest:'Kemarin','7':'7 hari terakhir',month:'Bulan ini',all:'Semua waktu'};
  if(m[S.hr])return m[S.hr];
  const f=d=>d?new Date(d+'T00:00:00').toLocaleDateString(dloc(),{day:'2-digit',month:'short',year:'numeric'}):'…';
  return S.hf===S.ht?f(S.hf):f(S.hf)+' – '+f(S.ht);
}
function niceMax(mx){if(!(mx>0))return 4;const e=Math.pow(10,Math.floor(Math.log10(mx))),m=mx/e;return(m<=1?1:m<=2?2:m<=4?4:m<=5?5:10)*e}
function areaChart(labels,vals){
  const PH=innerWidth<700,W=PH?360:600,H=PH?210:230,L=PH?40:46,R=12,T=30,B=28,n=vals.length;
  if(!n)return'';
  const yM=niceMax(Math.max(...vals,0)),X=i=>L+(n>1?i*(W-L-R)/(n-1):(W-L-R)/2),Y=v=>T+(H-T-B)*(1-v/yM);
  const P=vals.map((v,i)=>[X(i),Y(v)]);
  let d='M'+P[0][0].toFixed(1)+','+P[0][1].toFixed(1);
  for(let i=0;i<n-1;i++){
    const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2;
    let c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6,c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6;
    const lo=Math.min(p1[1],p2[1]),hi=Math.max(p1[1],p2[1]);
    c1y=Math.min(hi,Math.max(lo,c1y));c2y=Math.min(hi,Math.max(lo,c2y));
    d+=' C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
  }
  const base=H-B,area=d+' L'+P[n-1][0].toFixed(1)+','+base+' L'+P[0][0].toFixed(1)+','+base+' Z';
  let g='';
  for(let k=0;k<=4;k++){const v=yM*k/4,y=Y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--ln)" stroke-dasharray="3 4"/><text x="${L-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${cmp(v)}</text>`}
  const st=Math.ceil(n/9);let xl='';
  labels.forEach((t,i)=>{if(i%st===0)xl+=`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle">${esc(t)}</text>`});
  let pk=-1,mv=0;vals.forEach((v,i)=>{if(v>mv){mv=v;pk=i}});
  let tip='';
  if(pk>=0){const x=X(pk),y=Y(mv),w=Math.max(46,cmpM(mv).length*7+16),bx=Math.min(W-R-w,Math.max(L,x-w/2));
    tip=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#fff" stroke="var(--b)" stroke-width="2.5"/><rect x="${bx.toFixed(1)}" y="${(y-30).toFixed(1)}" width="${w}" height="20" rx="10" fill="var(--tx)" opacity=".92"/><text class="tp" x="${(bx+w/2).toFixed(1)}" y="${(y-16).toFixed(1)}" text-anchor="middle" style="fill:var(--card)">${esc(cmpM(mv))}</text>`}
  const hit=P.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="11" fill="transparent"><title>${esc(labels[i])}: ${esc(money(vals[i]))}</title></circle>`).join('');
  return`<div class="chw"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik penjualan"><defs><linearGradient id="agr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFCB74" stop-opacity=".75"/><stop offset="1" stop-color="#FFCB74" stop-opacity="0"/></linearGradient></defs>${g}${xl}<path d="${area}" fill="url(#agr)"/><path d="${d}" fill="none" stroke="#111111" stroke-width="2.2" stroke-linecap="round"/>${tip}${hit}</svg></div>`;
}
function donutSvg(parts,center){
  const r=52,C=2*Math.PI*r,tot=parts.reduce((a,b)=>a+b.v,0);let off=0,seg='';
  if(tot>0)parts.forEach(p=>{const len=p.v/tot*C;if(len>0){seg+=`<circle cx="70" cy="70" r="${r}" fill="none" stroke="${p.c}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${Math.max(0,len-5).toFixed(1)} ${(C-Math.max(0,len-5)).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 70 70)"/>`}off+=len});
  return`<svg viewBox="0 0 140 140" role="img" aria-label="Pendapatan per kategori"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--ln)" stroke-width="13"/>${seg}<text class="dc" x="70" y="76" text-anchor="middle">${esc(center)}</text></svg>`;
}
const DNC=['#4cc38a','#ef4444','#f7b538','#9ca3af'];
const catOf=l=>{const i=find(l.id);return(i&&i.cat)||'Lainnya'};
function dl(a,b){if(!b)return a?'<span class="dlt up">▲ baru</span>':'<span class="dlt">—</span>';const p=(a-b)/b*100;return`<span class="dlt ${p>=0?'up':'dn'}">${p>=0?'▲':'▼'} ${Math.abs(p).toFixed(0)}%</span>`}
const KI=(c,p)=>`<span class="ki" style="background:${c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${p}</svg></span>`;
function histJump(){const e=$('#histPanel');if(e)e.scrollIntoView({behavior:'smooth',block:'start'})}
function renderHome(){
  const el=$('#homeBox');if(!el)return;
  const s=db.set,H=can('hist');
  if(!H&&S.hr!=='today'){S.hr='today';S.hn=25}   // tanpa izin Riwayat, Beranda hanya menampilkan hari ini
  hrSync();
  const l=db.orders.filter(x=>inR(x,S.hf,S.ht)),pr=hrPrev(),pl=pr?db.orders.filter(x=>inR(x,pr[0],pr[1])):null;
  const D=(a,b)=>pl?dl(a,b):'';
  const isD=x=>x.type==='Dine In',dn=l.filter(isD).length,tk=l.length-dn,dnP=pl?pl.filter(isD).length:0,tkP=pl?pl.length-dnP:0;
  const ser=salesSeries(l,S.hf,S.ht),per=hrLabel();
  const sm=f=>l.reduce((a,b)=>a+(+f(b)||0),0);
  const rev=sumT(l),gross=sm(o=>o.sub),disc=sm(o=>o.disc),tax=sm(o=>o.tax);
  const cost=l.reduce((a,o)=>a+o.lines.reduce((z,x)=>z+(+x.cost||0)*(+x.qty||0),0),0);
  const qty=l.reduce((a,o)=>a+o.lines.reduce((z,x)=>z+(+x.qty||0),0),0),avg=l.length?rev/l.length:0;
  const pm={};l.forEach(o=>{const k=o.method||'-',z=pm[k]=pm[k]||{n:0,v:0};z.n++;z.v+=+o.total||0});
  const pms=Object.entries(pm).sort((a,b)=>b[1].v-a[1].v);
  const cat={};
  l.forEach(o=>o.lines.forEach(x=>{const c=catOf(x);cat[c]=(cat[c]||0)+(+x.price||0)*(+x.qty||0)}));
  const cs=Object.entries(cat).sort((a,b)=>b[1]-a[1]),top=cs.slice(0,3).map(([n,v],i)=>({n,v,c:DNC[i]})),rest=cs.slice(3).reduce((a,b)=>a+b[1],0);
  if(rest>0)top.push({n:'Lainnya',v:rest,c:DNC[3]});
  const cnt={};
  l.forEach(o=>o.lines.forEach(x=>{const k=x.id||x.name;(cnt[k]=cnt[k]||{id:x.id,name:x.name,q:0}).q+=+x.qty||0}));
  const tr4=Object.values(cnt).sort((a,b)=>b.q-a.q).slice(0,4);
  const lowN=+s.low||5,oos=db.items.filter(i=>(+i.stock||0)<=Math.max(0,+i.min>=0?+i.min:lowN)).sort((a,b)=>(+a.stock||0)-(+b.stock||0)).slice(0,4);
  const th=x=>{const i=x.id&&find(x.id);return i?thumb(i):esc((x.name||'?').charAt(0).toUpperCase())};
  const pTerlaris=`<div class="panel"><div class="ph"><h3>Menu Terlaris</h3><small class="pl">${esc(per)}</small></div>${tr4.length?`<div class="tl">${tr4.map(x=>`<div class="ti"><span class="tt">${th(x)}</span><div><b>${esc(x.name)}</b><small>Terjual: ${x.q}</small></div></div>`).join('')}</div>`:'<div class="mt">Belum ada penjualan pada periode ini.</div>'}</div>`;
  const pStok=`<div class="panel"><div class="ph"><h3>Stok Habis / Menipis</h3><a onclick="go('inv')">Lihat semua ›</a></div>${oos.length?`<div class="tl">${oos.map(i=>`<div class="ti"><span class="tt">${thumb(i)}</span><div><b>${esc(i.name)}</b><small class="o">${(+i.stock||0)<=0?'Habis':'Sisa '+i.stock}</small></div></div>`).join('')}</div>`:'<div class="mt">Semua stok aman.</div>'}</div>`;
  const rr=(a,b,c)=>`<div class="rr${c?' '+c:''}"><span>${a}</span><b>${b}</b></div>`;
  const pRekap=`<div class="panel rk"><div class="ph"><h3>Rekap Penjualan</h3><small class="pl">${esc(per)}</small></div>
    ${rr('Penjualan Kotor',money(gross))}${rr('Diskon','− '+money(disc))}${rr('Penjualan Bersih',money(gross-disc))}${rr('Pajak',money(tax))}${rr('Total Diterima',money(rev),'t')}
    <h4>Ringkasan</h4>
    ${rr('Transaksi',l.length)}${rr('Item terjual',qty)}${rr('Rata-rata / transaksi',money(avg))}${rr('Estimasi laba',money(rev-tax-cost))}
    <h4>Metode Bayar</h4>
    ${pms.length?`<div class="mb">${pms.map(([n,z])=>`<div class="m"><span>${esc(n)} <small>· ${z.n} transaksi</small></span><b>${money(z.v)}</b><div class="bar2"><i style="width:${rev>0?Math.max(3,Math.round(z.v/rev*100)):0}%"></i></div></div>`).join('')}</div>`:'<div class="mt">Belum ada transaksi.</div>'}
  </div>`;
  el.innerHTML=`
  <div class="hm-h"><div><h2>${esc(s.store)}</h2><small>${new Date().toLocaleDateString(dloc(),{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</small></div>
    ${H?`<button class="btn sm" style="width:auto;margin:0" onclick="exportXlsx()" aria-label="Ekspor Excel"><i class="ic" data-ic="download"></i><span class="ex">Ekspor </span>Excel</button>`:''}</div>
  ${H?`<div class="panel hfil"><div class="chips">${HR_PRE.map(([k,t])=>`<button class="chip ${S.hr===k?'on':''}" onclick="setHR('${k}')">${t}</button>`).join('')}</div>
    <div class="hdates"><label><span>Dari</span><input class="fi" type="date" id="hFrom" value="${esc(S.hf)}" onchange="setHD()"></label><label><span>Sampai</span><input class="fi" type="date" id="hTo" value="${esc(S.ht)}" onchange="setHD()"></label></div></div>`:''}
  <div class="kp">
    <div class="kc"><div class="kt"><span>Pendapatan</span>${D(rev,pl?sumT(pl):0)}</div><div class="kv">${KI('var(--ad)','<path d="M7 17L17 7M9 7h8v8"/>')}<span>${money(rev)}</span></div></div>
    <div class="kc"><div class="kt"><span>Pesanan</span>${D(l.length,pl?pl.length:0)}</div><div class="kv">${KI('#34c27a','<circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/><path d="M2 3h3l2.5 12h11l2-8H6"/>')}<span>${l.length}</span></div></div>
    <div class="kc"><div class="kt"><span>Dine In</span>${D(dn,dnP)}</div><div class="kv">${KI('#ef4444','<path d="M6 6l12 12M18 6L6 18"/>')}<span>${dn}</span></div></div>
    <div class="kc"><div class="kt"><span>Take Away</span>${D(tk,tkP)}</div><div class="kv">${KI('#f7b538','<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>')}<span>${tk}</span></div></div>
  </div>
  ${pl?'<div class="kpn">▲▼ dibanding periode sebelumnya yang sama panjang</div>':''}
  <div class="hg">
    <div class="panel"><div class="ph"><h3>Grafik Penjualan</h3><small class="pl">${esc(per)}${esc(ser.note)}</small></div>${areaChart(ser.labels,ser.vals)}</div>
    <div class="panel"><div class="ph"><h3>Pendapatan per Kategori</h3><small class="pl">${esc(per)}</small></div><div class="dnw">${donutSvg(top,cmpM(top.reduce((a,b)=>a+b.v,0)))}<div class="lg">${top.length?top.map(x=>`<span><i style="background:${x.c}"></i>${esc(x.n)}</span>`).join(''):'<span>Belum ada penjualan</span>'}</div></div></div>
  </div>
  ${H?`<div class="hg2">${pRekap}<div class="hcol">${pTerlaris}${pStok}</div></div>
  <div class="panel hp" id="histPanel"><div class="ph"><h3>Riwayat Transaksi</h3><small class="pl">${l.length} transaksi · ${esc(per)}</small></div><div class="lst" id="histBody"></div><button class="btn sec morebtn" id="histMore" hidden onclick="S.hn=(S.hn||25)+25;renderHist()">Tampilkan lebih banyak</button></div>
  <div class="panel" id="voidBox" hidden></div>`:`<div class="hg2">${pTerlaris}${pStok}</div>`}`;
  renderHist();
}
/* ---------- Meja ---------- */
const tkey=t=>String(t==null?'':t).trim().toUpperCase();
/* meja yang diisi lewat kasir: pesanan ditahan (belum bayar) dan transaksi kasir (sudah bayar) yang belum dikosongkan */
function locTbl(k){const o=[];
  (db.holds||[]).filter(h=>!h.del&&h.tbl&&(!k||tkey(h.tbl)===tkey(k))).forEach(h=>o.push({kind:'hold',tbl:h.tbl,id:h.id,t:h.t,by:h.by,cust:h.cust,n:Object.values(h.cart).reduce((a,b)=>a+b,0),total:holdTotal(h)}));
  (db.occ||[]).filter(x=>!x.del&&(!k||tkey(x.tbl)===tkey(k))).forEach(x=>o.push({kind:'occ',tbl:x.tbl,id:x.id,t:x.t,by:x.by,cust:x.cust,no:x.no,total:x.total}));
  return o}
function tblStep(d){db.set.tblN=Math.max(1,Math.min(60,(+db.set.tblN||9)+d));save();renderTable()}
function renderTable(){
  const el=$('#tableBox');if(!el)return;
  const act=(typeof CO!=='undefined'&&CO.list?CO.list:[]).filter(o=>tkey(o.tbl)&&(o.status==='new'||o.status==='accepted'));
  const n=Math.max(1,Math.min(60,+db.set.tblN||9)),names=[];
  for(let i=1;i<=n;i++)names.push(String(i));
  act.forEach(o=>{const k=tkey(o.tbl);if(!names.includes(k))names.push(k)});
  const LT=locTbl();LT.forEach(x=>{const k=tkey(x.tbl);if(!names.includes(k))names.push(k)});
  const lt=k=>LT.filter(x=>tkey(x.tbl)===k);
  const by=k=>act.filter(o=>tkey(o.tbl)===k);
  const st=k=>{const a=by(k),l=lt(k);return(a.some(o=>o.status==='accepted')||l.some(x=>x.kind==='occ'))?'p':(a.length||l.length)?'n':(window.P2&&P2.rsvFor(k).length?'r':'f')};
  const c={f:0,n:0,p:0,r:0};names.forEach(k=>c[st(k)]++);
  const lbl={f:'Kosong',n:'Baru · belum bayar',p:'Diproses',r:'Dipesan'};
  const rv=k=>{const q=window.P2?P2.rsvFor(k)[0]:null;return q?'<small>'+new Date(q.t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')+' · '+esc(q.name)+'</small>':''};
  const paid=o=>o.pst===2,pl=k=>{const a=by(k),l=lt(k);if(!a.length&&!l.length)return '';return(a.every(paid)&&!l.some(x=>x.kind==='hold'))?'Sudah bayar':'Belum bayar'};
  el.innerHTML=`
  <div class="hm-h"><div><h2>Meja</h2></div>
    ${isOwner()||can('set')?`<span class="stp">Jumlah meja <button onclick="tblStep(-1)" aria-label="Kurangi">−</button>${n}<button onclick="tblStep(1)" aria-label="Tambah">+</button></span>`:''}</div>
  <div class="tbg">
    <div class="panel"><div class="tbs">${names.map(k=>{const s=st(k),a=by(k),l=lt(k);return`<button type="button" class="tbc ${s==='f'?'':s}" onclick="tblOpen('${esc(k).replace(/'/g,"\\'")}')"><b>${esc(k)}</b><small>${s==='p'?'Diproses · '+pl(k):lbl[s]}</small>${rv(k)}${l.length&&!a.length?`<small>${l.length} pesanan kasir${[...new Set(l.map(x=>x.by).filter(Boolean))].length?' · '+esc([...new Set(l.map(x=>x.by).filter(Boolean))].join(', ')):''}</small>`:''}${a.length?`<small>${a.length} pesanan${[...new Set(a.map(o=>o.by).filter(Boolean))].length?' · '+esc([...new Set(a.map(o=>o.by).filter(Boolean))].join(', ')):''}</small>`:''}</button>`}).join('')}</div>
      <div class="tlg"><span><i style="background:#6fd6a0"></i>Kosong: ${c.f}</span><span><i style="background:#f7c244"></i>Pesanan baru: ${c.n}</span><span><i style="background:var(--b)"></i>Diproses: ${c.p}</span><span><i style="background:#60a5fa"></i>Dipesan: ${c.r}</span></div></div>
    <div class="panel"><h3>Pesanan Aktif</h3>${act.length?act.map(o=>`<button class="li" onclick="coDet(${o.id})"><span class="l"><b>Meja ${esc(o.tbl)} · ${esc(o.name)}</b><small>${o.lines.reduce((a,l)=>a+l.qty,0)} item · ${esc(ago(o.t))}${o.by?' · '+esc(o.by):''}</small></span><span class="r"><b>${money(o.total)}</b><small>${o.status==='new'?'baru':'diproses'}</small></span><span class="ch">›</span></button>`).join(''):'<div class="mt">Belum ada pesanan online aktif dengan nomor meja.</div>'}${LT.map(x=>`<button class="li" onclick="tblOpen('${esc(tkey(x.tbl)).replace(/'/g,"\\'")}')"><span class="l"><b>Meja ${esc(x.tbl)} · ${esc(x.cust||'Kasir')}</b><small>${x.kind==='hold'?x.n+' item · ditahan':esc(x.no)} · ${esc(ago(x.t))}${x.by?' · '+esc(x.by):''}</small></span><span class="r"><b>${money(x.total)}</b><small>${x.kind==='hold'?'belum bayar':'sudah bayar'}</small></span><span class="ch">›</span></button>`).join('')}</div>
  </div>`;
}
async function tblClear(k){
  const a=(CO.list||[]).filter(o=>tkey(o.tbl)===tkey(k)&&(o.status==='new'||o.status==='accepted'));const oc=(db.occ||[]).filter(x=>!x.del&&tkey(x.tbl)===tkey(k));
  if(!a.length){if(oc.length&&confirm('Pelanggan di meja '+k+' sudah pergi? Meja jadi kosong.')){oc.forEach(x=>{x.del=1;x.u=Date.now()});save();toast('Meja '+k+' dikosongkan');renderTable()}closeModal();return}
  const unp=a.filter(o=>o.pst!==2),tot=unp.reduce((x,o)=>x+o.total,0);
  if(unp.length&&!can('pos')){toast('Ada pesanan belum dibayar, minta kasir');return}
  const msg=unp.length?'Meja '+k+' dikosongkan.\n\n'+unp.length+' pesanan BELUM DIBAYAR ('+money(tot)+') akan dibatalkan dan tidak masuk penjualan. Lanjutkan?':'Pelanggan di meja '+k+' sudah pergi? Pesanan ditandai selesai dan meja jadi kosong.';
  if(!confirm(msg))return;
  let ok=true;for(const o of a){const r=await coAct(o.id,o.pst===2?'done':'cancel');if(!r)ok=false}
  oc.forEach(x=>{x.del=1;x.u=Date.now()});if(oc.length)save();
  closeModal();toast(ok?'Meja '+k+' dikosongkan':'Sebagian pesanan gagal diubah');
  try{const x=await (await api('/api/co?rev=0')).json();if(!x.unchanged){CO.rev=x.rev;coApply(x)}}catch(e){}
  if(S.view==='table')renderTable();
}
function tblOpen(k){
  const a=(CO.list||[]).filter(o=>tkey(o.tbl)===tkey(k)&&(o.status==='new'||o.status==='accepted')),tm=t=>new Date(t).toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'});
  const sl=o=>o.status==='new'?'Menunggu diterima':'Sedang diproses',pay=o=>o.pst===2?'Sudah bayar':'Belum bayar';
  const lc=locTbl(k);
  openModal(`<h3>Meja ${esc(k)}</h3>`+(a.length||lc.length?lc.map(x=>`<div class="tbo"><div class="tbh"><b>${x.kind==='hold'?'Pesanan ditahan':esc(x.no)}${x.cust?' · '+esc(x.cust):''}</b><span class="pst ${x.kind==='occ'?'ok':'w'}">${x.kind==='occ'?'Sudah bayar':'Belum bayar'}</span></div><small>Kasir: <b>${esc(x.by||'-')}</b> · ${tm(x.t)}</small><div class="tbt"><span>Total</span><b>${money(x.total)}</b></div>${x.kind==='hold'&&can('pos')?'<button class="btn sec" onclick="closeModal();holdList()">Buka pesanan ditahan</button>':''}</div>`).join('')+a.map(o=>`<div class="tbo"><div class="tbh"><b>${esc(o.num)} · ${esc(o.name)}</b><span class="pst ${o.pst===2?'ok':'w'}">${pay(o)}</span></div>
    <small>${sl(o)} · ${tm(o.t)} · Dilayani: <b>${o.by?esc(o.by):'Pelanggan (pesan sendiri)'}</b></small>
    <div class="tbl">${o.lines.map(l=>`<div><span>${l.qty}× ${esc(l.name)}</span><span>${money(l.price*l.qty)}</span></div>`).join('')}</div>
    ${o.note?`<small>Catatan: ${esc(o.note)}</small>`:''}<div class="tbt"><span>Total</span><b>${money(o.total)}</b></div>
    <button class="btn sec" onclick="closeModal();coDet(${o.id})">Detail pesanan</button></div>`).join(''):'<p class="hint">Meja ini kosong, belum ada pesanan aktif.</p>')
  +((a.length||lc.some(x=>x.kind==='occ'))&&(can('co')||can('pos'))?(a.every(o=>o.pst===2)||can('pos')?`<button class="btn sec" onclick="tblClear('${esc(k).replace(/'/g,"\\'")}')"><i class="ic" data-ic="check"></i>Kosongkan Meja ${esc(k)}</button>`:'<p class="hint">Ada pesanan belum dibayar. Hanya kasir yang bisa mengosongkan meja ini.</p>'):'')
  +(can('co')?`<button class="btn" onclick="closeModal();noOpen('${esc(k).replace(/'/g,"\\'")}')">+ Ambil Pesanan di Meja ${esc(k)}</button>`:'')+`<button class="btn sec" onclick="closeModal()">Tutup</button>`);
}
/* ---------- Notifikasi ---------- */
function renderAlert(){
  const el=$('#alertBox');if(!el)return;
  const f=[],lowN=+db.set.low||5;
  (typeof CO!=='undefined'&&CO.list?CO.list:[]).filter(o=>o.status==='new').forEach(o=>f.push({t:o.t,k:'warn',ic:'!',h:'Pesanan online '+esc(o.num)+' dari '+esc(o.name),s:o.lines.map(x=>x.qty+'× '+esc(x.name)).join(', '),amt:money(o.total),go:'co'}));
  db.items.filter(i=>(+i.stock||0)<=Math.max(0,+i.min>=0?+i.min:lowN)).slice(0,8).forEach(i=>f.push({t:null,k:(+i.stock||0)<=0?'bad':'warn',ic:(+i.stock||0)<=0?'×':'!',h:esc(i.name)+((+i.stock||0)<=0?' habis':' stok menipis'),s:'Sisa stok: '+(+i.stock||0),go:'inv'}));
  db.orders.slice(0,12).forEach(o=>f.push({t:o.t,k:'ok',ic:'✓',h:'Pesanan '+esc(o.no)+' berhasil dibayar',s:esc(o.method)+' · '+esc(o.type)+(o.tbl?' · Meja '+esc(o.tbl):''),amt:money(o.total),o}));
  (db.voided||[]).slice(0,5).forEach(v=>f.push({t:v.at||v.t,k:'bad',ic:'×',h:'Transaksi '+esc(v.no)+' dibatalkan',s:'oleh '+esc(v.by||'-'),amt:money(v.total)}));
  f.sort((a,b)=>(b.t?+new Date(b.t):9e15)-(a.t?+new Date(a.t):9e15));
  el.innerHTML=`<div class="bar"><h2><i class="ic" data-ic="bell"></i>Notifikasi</h2></div>
  <div class="panel">${f.length?f.map(x=>`<div class="al"><span class="ai ${x.k}">${x.ic}</span><div class="am"><b>${x.h}</b><small>${x.s||''}</small>${x.o?`<details><summary>Lihat detail</summary><div class="dtl">${x.o.lines.map(l=>`<div><span>${l.qty}× ${esc(l.name)}</span><span>${money(l.price*l.qty)}</span></div>`).join('')}</div></details>`:''}${x.go?`<button class="go" onclick="go('${x.go}')">Buka ›</button>`:''}</div><div class="ar">${x.amt?'<b>'+x.amt+'</b>':''}${x.t?esc(ago(x.t)):''}</div></div>`).join(''):'<div class="mt">Belum ada notifikasi.</div>'}</div>`;
}
function railBrand(){
  const e=$('#railLogo'),s=db.set;if(!e)return;
  e.innerHTML=s.logo&&s.logoApp!==false&&imgSrc(s.logo)?'<img alt="" src="'+imgSrc(s.logo)+'">':'<i class="ic solo" data-ic="food"></i>';
}

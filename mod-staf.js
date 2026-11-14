/* Ordela — modul staf: absensi, payroll, halaman Pengguna.
   Dimuat sebelum skrip utama di index.html; hanya berisi deklarasi (tanpa kode yang jalan saat dimuat). */
function attC(){return db.set.att||{}}
function attTzv(){return ATT.tz||attC().tz||undefined}
function attT(iso){try{return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:attTzv()})}catch(e){return ''}}
function attD(day){try{return new Date(day+'T00:00:00Z').toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})}catch(e){return day}}
function attAdd(day,n){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function attMn(n){n=Math.round(n);return n>=60?Math.floor(n/60)+' jam '+(n%60?n%60+' mnt':''):n+' mnt'}
function attDist(a,b,c,d){const R=6371000,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b),h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return Math.round(2*R*Math.asin(Math.min(1,Math.sqrt(h))))}
function attStore(){const c=attC(),la=parseFloat(c.lat),ln=parseFloat(c.lng);return(Number.isFinite(la)&&Number.isFinite(ln)&&String(c.lat)!==''&&String(c.lng)!=='')?{lat:la,lng:ln,rad:Math.max(20,+c.radius||100),strict:!!c.strict}:null}
function attBadge(r){
  if(r.type==='in')return r.status==='late'?`<span class="pst bad">Terlambat ${esc(attMn(r.mins))}</span>`:r.status==='ontime'?'<span class="pst ok">Tepat waktu</span>':'<span class="pst">Tanpa shift</span>';
  return r.status==='early'?`<span class="pst w">Pulang cepat ${esc(attMn(r.mins))}</span>`:r.status==='ok'?'<span class="pst ok">Pulang sesuai jadwal</span>':'<span class="pst">Pulang</span>';
}
function attLocChip(r){
  const st=attStore(),co=(r.lat!=null?`<small>${(+r.lat).toFixed(5)}, ${(+r.lng).toFixed(5)}${r.acc?' (±'+r.acc+' m)':''}</small>`:'');
  if(r.dist==null||!st)return co;
  return (r.dist<=st.rad?`<span class="pst ok">${r.dist} m dari toko</span>`:`<span class="pst bad">Di luar area toko · ${r.dist} m</span>`)+co;
}
function attRowHtml(r){
  return `<div class="atr"><span class="av">${esc((r.name||'?').trim().charAt(0).toUpperCase())}</span><div class="atm"><b>${esc(r.name)}</b> <small style="display:inline">${esc(attD(r.day))}</small><br>
    ${r.type==='in'?'Masuk':'Pulang'} <b>${esc(attT(r.t))}</b>${r.shift?` · ${esc(r.shift)} ${esc(r.sstart)}–${esc(r.send)}`:''}<br>${attBadge(r)}${attLocChip(r)}
    ${r.hp?`<br><button class="lnk" type="button" onclick="attPhoto(${r.id})">Lihat foto selfie</button>`:''}</div></div>`;
}
function attFiltered(){
  const from=ATT.range==='today'?ATT.today:ATT.range==='30'?attAdd(ATT.today,-29):attAdd(ATT.today,-6);
  const me=(CL.me||{}).username;return ATT.rows.filter(r=>r.day>=from&&(!me||r.uname===me));
}
function attDraw(){
  const st=$('#attStat'),hs=$('#attHist');if(!st||!hs)return;
  const c=attC(),me=CL.me||{},m=ATT.me||{},shs=(c.shifts||[]).filter(x=>x.id),asg=(c.assign||{})[me.username],ash=shs.find(x=>x.id===asg);
  let h=`<div class="attclk" id="attClock"></div><div class="attdt" id="attDate"></div>`;
  if(!c.on)h+=`<div class="attst"><b>Absensi belum aktif</b>${isOwner()?'Aktifkan di Pengaturan → Absensi & Shift.':'Hubungi owner untuk mengaktifkannya.'}</div>`;
  else{
    const cur=m.open?shs.find(x=>x.id===m.shiftId):ash;
    if(m.open)h+=`<div class="attst"><b>Sedang bertugas sejak ${esc(attT(m.since))}</b>${cur?esc(cur.name)+' · '+esc(cur.start)+'–'+esc(cur.end):'Tanpa shift'}${m.last?'<br>'+attBadge(m.last):''}</div><button class="btn red" onclick="attOpen('out')"><i class="ic" data-ic="clock"></i>Absen Pulang</button>`;
    else{
      h+=`<div class="attst"><b>${m.last&&m.last.type==='out'?'Terakhir pulang '+esc(attD(m.last.day))+' '+esc(attT(m.last.t)):'Belum absen masuk'}</b>`;
      if(ash)h+=`Shift Anda: ${esc(ash.name)} · ${esc(ash.start)}–${esc(ash.end)} (toleransi ${ash.grace||0} mnt)`;
      else if(shs.length)h+=`<label class="fl" for="attShift" style="margin-top:6px">Pilih shift</label><select class="fi" id="attShift"><option value="">— pilih shift —</option>${shs.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} · ${esc(x.start)}–${esc(x.end)}</option>`).join('')}</select>`;
      else h+='Owner belum mengatur shift, kehadiran dicatat tanpa jam shift.';
      h+=`</div><button class="btn" onclick="attOpen('in')"><i class="ic" data-ic="clock"></i>Absen Masuk</button>`;
    }
  }
  st.innerHTML=h;attClock();
  const rows=attFiltered(),ins=rows.filter(r=>r.type==='in'),late=ins.filter(r=>r.status==='late').length,ont=ins.filter(r=>r.status==='ontime').length;
  const akc=(t,v,bg)=>`<div class="kc"><div class="kt"><span>${t}</span></div><div class="kv"><span class="ki" style="background:${bg}"><i class="ic" data-ic="check"></i></span>${v}</div></div>`;
  hs.innerHTML=`<h3>Riwayat Absensi Saya</h3>
  <div class="chips">${[['today','Hari ini'],['7','7 hari'],['30','30 hari']].map(x=>`<button type="button" class="chip ${ATT.range===x[0]?'on':''}" onclick="ATT.range='${x[0]}';attDraw()">${x[1]}</button>`).join('')}</div>
  <div class="chips atsum"><span class="pst ok">Tepat waktu: ${ont}</span><span class="pst bad">Terlambat: ${late}</span><span class="pst">Masuk: ${ins.length}</span></div>
  <div class="kp wkp atkp">${akc('Tepat waktu',ont,'#3b9d6e')}${akc('Terlambat',late,'#EF4444')}${akc('Total masuk',ins.length,'#6b7280')}</div>
  ${rows.length?rows.map(attRowHtml).join(''):'<div class="empty">Belum ada data absensi</div>'}`;
}
function attClock(){
  const e=$('#attClock');if(!e)return;
  try{const n=new Date(),z=attTzv();e.textContent=n.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:z});$('#attDate').textContent=n.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:z})}catch(x){}
}
async function attLoad(force){
  if(ATT.busy||(!force&&Date.now()-ATT.last<4000))return;
  ATT.busy=1;
  try{
    const r=await api('/api/att'),j=await r.json();
    if(r.ok){ATT.rows=j.rows||[];ATT.me=j.me||null;ATT.today=j.today||'';ATT.tz=j.tz||'';ATT.last=Date.now();if(!ATT.xman&&ATT.today){ATT.xf=ATT.today.slice(0,8)+'01';ATT.xt=ATT.today;const a=$('#axF'),b=$('#axT');if(a)a.value=ATT.xf;if(b)b.value=ATT.xt}}
  }catch(e){}
  finally{ATT.busy=0}
  if(S.view==='att')attDraw();
}
function renderAtt(){
  const box=$('#attBox');if(!box)return;
  if(!ATT.built||!$('#attStat')){
    ATT.built=true;
    box.innerHTML=`<div class="panel attp" id="attStat"></div><div class="panel attp" id="attHist"></div>`;
    ATT.last=0;
  }
  if(!ATT.today)ATT.today=new Date().toISOString().slice(0,10);
  attDraw();attLoad();
}
const pyNorm=j=>{j=j&&typeof j==='object'?j:{};const o=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};return{rev:+j.rev||0,cfg:{lateRate:0,workDays:26,...o(j.cfg)},emp:o(j.emp),runs:o(j.runs)}};
function pyMonthNow(){const t=(typeof ATT!=='undefined'&&ATT.today)||dkey(new Date());return t.slice(0,7)}
function pyRange(m){const [y,mo]=m.split('-').map(Number),last=new Date(Date.UTC(y,mo,0)).getUTCDate();return[m+'-01',m+'-'+String(last).padStart(2,'0')]}
function pyMonthLbl(m){try{const [y,mo]=m.split('-').map(Number);return new Date(Date.UTC(y,mo-1,1)).toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'UTC'})}catch(e){return m}}
async function pyLoad(){
  PY.err='';
  try{
    const [r,u]=await Promise.all([api('/api/payroll'),api('/api/users')]);
    const j=await r.json(),uj=await u.json();
    if(!r.ok){PY.err=j.error||'Gagal memuat payroll';return}
    PY.d=pyNorm(j);PY.mail=!!j.mail;PY.users=(uj.users||[]).filter(x=>x.role!=='owner');
  }catch(e){if(e.message!=='auth')PY.err='Tidak bisa terhubung ke server'}
}
async function pySave(){
  if(!PY.d)return false;
  try{
    const r=await api('/api/payroll',{method:'PUT',body:JSON.stringify(PY.d)}),j=await r.json();
    if(r.status===409){toast('Data payroll berubah di perangkat lain. Dimuat ulang, coba lagi.');PY.d=pyNorm(j.current||j);return false}
    if(!r.ok){toast(j.error||'Gagal menyimpan payroll');return false}
    PY.d=pyNorm(j);return true;
  }catch(e){if(e.message!=='auth')toast('Tidak bisa terhubung ke server');return false}
}
async function pyAttLoad(from,to){
  const k=from+'|'+to;if(PY.rowsKey===k)return;
  const r=await api('/api/att?from='+from+'&to='+to),j=await r.json();
  if(!r.ok)throw new Error(j.error||'Gagal mengambil data absensi');
  if(j.tz)ATT.tz=j.tz;PY.rows=j.rows||[];PY.rowsKey=k;
}
/* pasangkan masuk → pulang per karyawan */
function attPair(rows){
  rows=rows.slice().sort((a,b)=>a.t<b.t?-1:a.t>b.t?1:0);const open={},days=[];
  rows.forEach(r=>{
    if(r.type==='in'){const d={day:r.day,name:r.name,uname:r.uname,shift:r.shift||'',sched:r.shift?r.sstart+'–'+r.send:'',in:r,out:null};open[r.uname]=d;days.push(d)}
    else{const d=open[r.uname];if(d&&!d.out){d.out=r;delete open[r.uname]}else days.push({day:r.day,name:r.name,uname:r.uname,shift:r.shift||'',sched:r.shift?r.sstart+'–'+r.send:'',in:null,out:r})}
  });
  return days.sort((a,b)=>a.day<b.day?-1:a.day>b.day?1:a.name<b.name?-1:a.name>b.name?1:0);
}
function attSumm(days){
  const by={};
  days.forEach(d=>{const k=d.uname,e=by[k]=by[k]||{name:d.name,n:0,ot:0,late:0,lm:0,early:0,ns:0,work:0,set:new Set()};
    if(d.in){if(!e.set.has(d.day)){e.set.add(d.day);e.n++}if(d.in.status==='late'){e.late++;e.lm+=+d.in.mins||0}else if(d.in.status==='ontime')e.ot++;else e.ns++}
    if(d.out&&d.out.status==='early')e.early++;
    if(d.in&&d.out)e.work+=Math.max(0,Math.round((new Date(d.out.t)-new Date(d.in.t))/60000))});
  return by;
}
function pyCalc(e,s,adj){
  const cfg=PY.d.cfg;e=e||{};s=s||{n:0,late:0,lm:0,early:0,work:0};adj=adj||{};
  const type=e.type||'monthly',base=+e.base||0,days=s.n,wd=Math.max(1,+cfg.workDays||26);
  const basic=type==='monthly'?base:type==='daily'?base*days:base*s.work/60;
  const meal=(+e.meal||0)*days,allow=+e.allow||0,bonus=+adj.bonus||0,other=+adj.other||0;
  const late=(+cfg.lateRate||0)*s.lm,abs=type==='monthly'&&e.cutAbsent?Math.max(0,wd-days):0,absAmt=abs?base/wd*abs:0;
  const gross=basic+meal+allow+bonus,ded=late+absAmt+other;
  return{type,days,work:s.work,lateN:s.late,lateMin:s.lm,basic:rnd(basic),meal:rnd(meal),allow:rnd(allow),bonus:rnd(bonus),gross:rnd(gross),late:rnd(late),abs,absAmt:rnd(absAmt),other:rnd(other),ded:rnd(ded),net:Math.max(0,rnd(gross-ded)),set:!!(e.base||e.meal||e.allow)};
}
function pyRun(m){const r=PY.d.runs[m]=PY.d.runs[m]||{items:{}};r.items=r.items||{};return r}
function pyItem(m,u){const r=PY.d.runs[m];return(r&&r.items&&r.items[u])||{}}
function pyRowFor(m,u){
  const it=pyItem(m,u);
  if(it.paid&&it.snap)return{...it.snap,paid:1,paidAt:it.paidAt,note:it.note||''};
  const by=attSumm(attPair(PY.rows));
  return{...pyCalc(PY.d.emp[u],by[u],it),paid:0,note:it.note||''};
}
async function pyRender(force){
  const box=$('#pyrBox');if(!box)return;
  if(!force&&PY.built&&$('#pyBody'))return;
  PY.built=true;
  if(!PY.d){box.innerHTML='<div class="empty">Memuat payroll…</div>';await pyLoad();
    if(!PY.d){box.innerHTML=`<div class="empty">${esc(PY.err||'Payroll tidak tersedia')}<br><button class="btn sm" style="width:auto;margin-top:10px" onclick="PY.built=false;pyRender(true)">Coba lagi</button></div>`;return}}
  if(!PY.month)PY.month=pyMonthNow();
  box.innerHTML=`<div class="chips" id="pyTabs">${[['gaji','Gaji'],['kar','Karyawan'],['absen','Rekap Absensi']].map(([k,l])=>`<button type="button" class="chip ${PY.tab===k?'on':''}" onclick="PY.tab='${k}';pyRender(true)">${l}</button>`).join('')}</div><div id="pyBody"></div>`;
  const b=$('#pyBody');
  try{
    if(PY.tab==='gaji')await pyGaji(b);else if(PY.tab==='kar')pyKar(b);else await pyAbsen(b);
  }catch(e){b.innerHTML=`<div class="empty">${esc(e.message||'Gagal memuat')}</div>`}
}
/* ----- tab Gaji ----- */
async function pyGaji(b){
  const [from,to]=pyRange(PY.month);
  b.innerHTML='<div class="empty">Memuat absensi…</div>';await pyAttLoad(from,to);
  const rows=PY.users.map(u=>({u,r:pyRowFor(PY.month,u.username)}));
  const tot=rows.reduce((a,x)=>a+x.r.net,0),paid=rows.filter(x=>x.r.paid).reduce((a,x)=>a+x.r.net,0);
  const attOn=!!attC().on;
  b.innerHTML=`<div class="panel pyw"><div class="pyhd"><div class="pyper">
    <label class="fl" for="pyMonth">Periode gaji</label><input class="fi" type="month" id="pyMonth" value="${esc(PY.month)}" onchange="if(this.value){PY.month=this.value;pyRender(true)}"></div>
    <div class="opn-sum" style="margin-top:12px"><span><small>Total gaji bersih</small><b>${money(tot)}</b></span><span><small>Sudah dibayar</small><b>${money(paid)}</b></span><span><small>Belum dibayar</small><b>${money(tot-paid)}</b></span></div></div>
    ${attOn?'':'<p class="pfhint">Absensi belum aktif, jadi hari hadir tercatat 0. Aktifkan di Pengaturan → Absensi &amp; Shift, atau isi penyesuaian manual.</p>'}
    ${PY.users.length?'':'<div class="empty">Belum ada karyawan. Tambahkan di menu Pengguna.</div>'}
    <div class="pyg">${rows.map(({u,r})=>`<button type="button" class="pyc" onclick="pySlip('${esc(u.username)}')"><span class="av">${esc((u.name||'?').trim().charAt(0).toUpperCase())}</span><span class="tx"><b>${esc(u.name)}</b><small>${r.set?esc(PY_TLBL[r.type])+' · '+r.days+' hari hadir'+(r.lateMin?' · telat '+r.lateMin+' mnt':''):'Gaji belum diatur'}</small></span><span class="rt"><b>${money(r.net)}</b><span class="pst ${r.paid?'ok':'w'}">${r.paid?'Dibayar':'Belum'}</span>${pyItem(PY.month,u.username).mailAt?'<small>✉ terkirim</small>':''}</span></button>`).join('')}</div>
    <div class="pyac">${PY.users.length?`<button class="btn" type="button" onclick="pyXlsx()"><i class="ic" data-ic="download"></i>Unduh Payroll (Excel)</button>`:''}
    ${rows.some(x=>x.r.paid)?`<button class="btn sec" type="button" onclick="pyMailAll()">Kirim Semua Slip ke Email</button>`:''}</div>
  </div>`;
}
function pySlip(un){
  const u=PY.users.find(x=>x.username===un);if(!u)return;
  const it=pyItem(PY.month,un),r=pyRowFor(PY.month,un),paid=!!r.paid;
  const dis=paid?'disabled':'';
  openModal(`<h3>Slip Gaji</h3><p style="margin:0 0 10px;color:var(--mu);font-size:13px">${esc(u.name)} · ${esc(pyMonthLbl(PY.month))}</p>
  <div id="pySlipB"></div>
  <div class="two"><div><label class="fl" for="pyBonus">Bonus / lembur</label><input class="fi" id="pyBonus" type="number" inputmode="decimal" min="0" step="any" value="${+it.bonus||''}" placeholder="0" ${dis} oninput="pySlipUpd('${esc(un)}')"></div>
  <div><label class="fl" for="pyOther">Potongan lain / kasbon</label><input class="fi" id="pyOther" type="number" inputmode="decimal" min="0" step="any" value="${+it.other||''}" placeholder="0" ${dis} oninput="pySlipUpd('${esc(un)}')"></div></div>
  <label class="fl" for="pyNote">Catatan</label><input class="fi" id="pyNote" maxlength="80" value="${esc(it.note||'')}" ${dis} placeholder="Opsional">
  ${paid?`<p class="pfhint">Dibayar ${esc(it.paidAt?new Date(it.paidAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'')}. Buka lagi untuk mengubah.</p>`:''}
  ${paid?`<p class="pfhint">${u.email?'Email: '+esc(u.email)+(it.mailAt?' · terkirim '+esc(new Date(it.mailAt).toLocaleDateString('id-ID',{day:'numeric',month:'short'})):''):'Karyawan ini belum punya email (diisi sendiri di Akun → Edit Profil), slip belum bisa dikirim.'}</p>${u.email?`<button class="btn" type="button" onclick="pyMail('${esc(un)}')"><i class="ic" data-ic="note"></i>${it.mailAt?'Kirim Ulang Slip ke Email':'Kirim Slip ke Email'}</button>`:''}<button class="btn sec" type="button" onclick="pyPaid('${esc(un)}',0)">Buka Lagi (batalkan status dibayar)</button>`
   :`<button class="btn sec" type="button" onclick="pySlipSave('${esc(un)}',0)">Simpan Penyesuaian</button><button class="btn" type="button" onclick="pySlipSave('${esc(un)}',1)">Simpan &amp; Tandai Dibayar</button>`}
  <button class="btn sec" type="button" onclick="closeModal()">Tutup</button>`);
  pySlipUpd(un);
}
function pySlipUpd(un){
  const b=$('#pySlipB');if(!b)return;const m=PY.month,it=pyItem(m,un);
  let r;
  if(it.paid&&it.snap)r={...it.snap};
  else{const by=attSumm(attPair(PY.rows));r=pyCalc(PY.d.emp[un],by[un],{bonus:+($('#pyBonus')||{}).value||0,other:+($('#pyOther')||{}).value||0})}
  const e=PY.d.emp[un]||{},ln=(t,v,sub,neg)=>v||sub?`<div class="pyl"><span>${t}${sub?`<small>${sub}</small>`:''}</span><b class="${neg?'neg':''}">${neg&&v?'− ':''}${money(v)}</b></div>`:'';
  b.innerHTML=`<div class="pyslip">
   ${ln('Gaji pokok ('+esc(PY_TLBL[r.type])+')',r.basic,r.type==='daily'?r.days+' hari × '+money(+e.base||0):r.type==='hourly'?attMn(r.work)+' × '+money(+e.base||0)+'/jam':'')}
   ${ln('Uang makan / transport',r.meal,(+e.meal?r.days+' hari × '+money(+e.meal):''))}
   ${ln('Tunjangan tetap',r.allow)}${ln('Bonus / lembur',r.bonus)}
   <div class="pyl tot"><span>Total pendapatan</span><b>${money(r.gross)}</b></div>
   ${ln('Potongan terlambat',r.late,r.lateMin?r.lateMin+' mnt × '+money(+PY.d.cfg.lateRate||0):'',1)}
   ${ln('Potongan tidak hadir',r.absAmt,r.abs?r.abs+' hari':'',1)}${ln('Potongan lain / kasbon',r.other,'',1)}
   <div class="pyl tot"><span>Total potongan</span><b class="neg">${r.ded?'− ':''}${money(r.ded)}</b></div>
   <div class="pyl net"><span>Gaji bersih</span><b>${money(r.net)}</b></div>
   <small class="pfhint">Hadir ${r.days} hari${r.lateN?' · terlambat '+r.lateN+'×':''} · jam kerja ${esc(attMn(r.work)||'0 mnt')}</small></div>`;
}
async function pySlipSave(un,paid){
  const m=PY.month,run=pyRun(m),it=run.items[un]=run.items[un]||{};
  it.bonus=Math.max(0,+($('#pyBonus')||{}).value||0);it.other=Math.max(0,+($('#pyOther')||{}).value||0);it.note=(($('#pyNote')||{}).value||'').trim().slice(0,80);
  if(paid){const by=attSumm(attPair(PY.rows));it.snap=pyCalc(PY.d.emp[un],by[un],it);it.paid=1;it.paidAt=new Date().toISOString()}
  if(await pySave()){closeModal();toast(paid?'Ditandai dibayar':'Penyesuaian disimpan');
    if(paid&&PY.d.cfg.autoMail){const u=PY.users.find(x=>x.username===un);if(u&&u.email)await pyMail(un,1);else if(u)toast('Ditandai dibayar. Slip tidak dikirim: karyawan belum punya email.')}
    pyRender(true)}
  else{await pyLoad();pyRender(true)}
}
async function pyPaid(un,v){
  const it=pyRun(PY.month).items[un];if(it){delete it.paid;delete it.snap;delete it.paidAt}
  if(await pySave()){closeModal();toast('Status dibayar dibatalkan')}
  pyRender(true);
}
async function pyMail(un,quiet){
  if(!PY.mail){toast('Email slip belum diaktifkan di server. Lihat README (pos.admin_mail).');return false}
  try{
    const r=await api('/api/payroll/slip',{method:'POST',body:JSON.stringify({username:un,month:PY.month})}),j=await r.json();
    if(!r.ok){toast(j.error||'Gagal mengirim slip');return false}
    await pyLoad();if(!quiet)toast('Slip dikirim ke '+(j.to||'email karyawan'));else toast('Dibayar & slip dikirim ke email');
    if(!quiet)pyRender(true);return true;
  }catch(e){if(e.message!=='auth')toast('Tidak bisa terhubung ke server');return false}
}
async function pyMailAll(){
  if(!PY.mail){toast('Email slip belum diaktifkan di server. Lihat README (pos.admin_mail).');return}
  const todo=PY.users.filter(u=>pyItem(PY.month,u.username).paid&&u.email),skip=PY.users.filter(u=>pyItem(PY.month,u.username).paid&&!u.email).length;
  if(!todo.length){toast('Tidak ada slip dibayar yang punya email tujuan');return}
  ask('Kirim semua slip?',todo.length+' slip periode '+pyMonthLbl(PY.month)+' akan dikirim ke email karyawan'+(skip?' ('+skip+' karyawan tanpa email dilewati)':'')+'.','Kirim',async()=>{
    let ok=0;for(const u of todo){const r=await api('/api/payroll/slip',{method:'POST',body:JSON.stringify({username:u.username,month:PY.month})}).catch(()=>null);if(r&&r.ok)ok++}
    await pyLoad();toast(ok+' dari '+todo.length+' slip terkirim');pyRender(true)});
}
/* ----- tab Karyawan: pengaturan gaji ----- */
function pyKar(b){
  const c=PY.d.cfg;
  b.innerHTML=`<div class="pyk"><div class="panel"><h3>Aturan umum</h3>
   <div class="two"><div><label class="fl" for="pyLate">Potongan terlambat (per menit)</label><input class="fi" id="pyLate" type="number" inputmode="decimal" min="0" step="any" value="${+c.lateRate||''}" placeholder="0"></div>
   <div><label class="fl" for="pyWd">Hari kerja per bulan</label><input class="fi" id="pyWd" type="number" inputmode="numeric" min="1" max="31" value="${+c.workDays||26}"></div></div>
   <p class="pfhint">Hari kerja dipakai untuk menghitung potongan tidak hadir pada gaji bulanan (gaji ÷ hari kerja per hari).</p>
   <label class="tgl"><input type="checkbox" id="pyAuto" ${c.autoMail?'checked':''}><span>Kirim slip ke email karyawan otomatis saat ditandai dibayar</span></label>
   ${PY.mail?'':'<p class="pfhint" style="color:var(--bad)">Pengiriman email belum diaktifkan di server (jalankan pos.admin_mail di SQL Editor, lihat README).</p>'}
   <button class="btn sec" type="button" onclick="pyCfgSave()">Simpan Aturan</button></div>
  <div class="panel"><h3>Gaji karyawan</h3><div class="pyg">${PY.users.length?PY.users.map(u=>{const e=PY.d.emp[u.username]||{};
   return`<button type="button" class="pyc" onclick="pyEmp('${esc(u.username)}')"><span class="av">${esc((u.name||'?').trim().charAt(0).toUpperCase())}</span><span class="tx"><b>${esc(u.name)}${u.active?'':' (nonaktif)'}</b><small>${e.base?esc(PY_TLBL[e.type||'monthly'])+' · '+money(+e.base)+({monthly:'/bulan',daily:'/hari',hourly:'/jam'})[e.type||'monthly']:'Belum diatur'}${u.email?'':' · tanpa email'}</small></span><span class="rt">${pfi('chev',18)}</span></button>`}).join(''):'<div class="empty">Belum ada karyawan. Tambahkan di menu Pengguna.</div>'}</div></div></div>`;
}
async function pyCfgSave(){
  PY.d.cfg.lateRate=Math.max(0,+$('#pyLate').value||0);PY.d.cfg.workDays=Math.max(1,Math.min(31,Math.round(+$('#pyWd').value||26)));PY.d.cfg.autoMail=$('#pyAuto').checked;
  if(await pySave())toast('Aturan payroll disimpan');pyRender(true);
}
function pyEmp(un){
  const u=PY.users.find(x=>x.username===un);if(!u)return;const e=PY.d.emp[un]||{type:'monthly'};
  openModal(`<h3>Gaji ${esc(u.name)}</h3>
  <label class="fl" for="peT">Jenis gaji</label><select class="fi" id="peT" onchange="pyEmpHint()">${PY_TYPES.map(([k,l])=>`<option value="${k}" ${(e.type||'monthly')===k?'selected':''}>${l}</option>`).join('')}</select>
  <label class="fl" for="peB" id="peBL">Nominal</label><input class="fi" id="peB" type="number" inputmode="decimal" min="0" step="any" value="${+e.base||''}" placeholder="0">
  <div class="two"><div><label class="fl" for="peM">Uang makan/transport per hari hadir</label><input class="fi" id="peM" type="number" inputmode="decimal" min="0" step="any" value="${+e.meal||''}" placeholder="0"></div>
  <div><label class="fl" for="peA">Tunjangan tetap per bulan</label><input class="fi" id="peA" type="number" inputmode="decimal" min="0" step="any" value="${+e.allow||''}" placeholder="0"></div></div>
  <label class="tgl" id="peCW"><input type="checkbox" id="peC" ${e.cutAbsent?'checked':''}><span>Potong gaji bila tidak hadir (gaji bulanan)</span></label>
  <button class="btn" type="button" onclick="pyEmpSave('${esc(un)}')">Simpan</button><button class="btn sec" type="button" onclick="closeModal()">Batal</button>`);
  pyEmpHint();
}
function pyEmpHint(){const t=$('#peT').value,l=$('#peBL');if(l)l.textContent=t==='monthly'?'Gaji pokok per bulan':t==='daily'?'Upah per hari hadir':'Upah per jam kerja';const w=$('#peCW');if(w)w.style.display=t==='monthly'?'':'none'}
async function pyEmpSave(un){
  PY.d.emp[un]={type:$('#peT').value,base:Math.max(0,+$('#peB').value||0),meal:Math.max(0,+$('#peM').value||0),allow:Math.max(0,+$('#peA').value||0),cutAbsent:$('#peT').value==='monthly'&&$('#peC').checked};
  if(await pySave()){closeModal();toast('Gaji karyawan disimpan')}
  pyRender(true);
}
/* ----- tab Rekap Absensi ----- */
async function pyAbsen(b){
  const t=ATT.today||dkey(new Date());if(!ATT.xf)ATT.xf=t.slice(0,8)+'01';if(!ATT.xt)ATT.xt=t;
  let by={},days=[],msg='';
  if(/^\d{4}-\d{2}-\d{2}$/.test(ATT.xf)&&/^\d{4}-\d{2}-\d{2}$/.test(ATT.xt)&&ATT.xf<=ATT.xt){
    await pyAttLoad(ATT.xf,ATT.xt);days=attPair(PY.rows);by=attSumm(days)}
  else msg='Rentang tanggal tidak valid';
  const ks=Object.keys(by).sort((a,c)=>by[a].name<by[c].name?-1:1);
  b.innerHTML=`<div class="pya"><div class="panel"><h3>Rekap Absensi Karyawan</h3>
   <div class="atx">
   <div class="acll"><div><label for="axF">Dari tanggal</label><input class="fi" type="date" id="axF" value="${esc(ATT.xf)}" onchange="ATT.xf=this.value;ATT.xman=1;pyRender(true)"></div><div><label for="axT">Sampai tanggal</label><input class="fi" type="date" id="axT" value="${esc(ATT.xt)}" onchange="ATT.xt=this.value;ATT.xman=1;pyRender(true)"></div></div>
   <div class="chips"><button type="button" class="chip" onclick="attXr('month');pyRender(true)">Bulan ini</button><button type="button" class="chip" onclick="attXr('last');pyRender(true)">Bulan lalu</button><button type="button" class="chip" onclick="attXr('7');pyRender(true)">7 hari</button></div></div>
   ${msg?`<p class="pfhint" style="color:var(--bad)">${msg}</p>`:''}
   ${ks.length?`<div class="tw opn-tw"><table class="opn-t"><thead><tr><th>Karyawan</th><th class="num">Hadir</th><th class="num">Tepat</th><th class="num">Telat</th><th class="num">Jam kerja</th></tr></thead><tbody>${ks.map(k=>{const e=by[k];return`<tr onclick="pyWho('${esc(k)}')" style="cursor:pointer"><td><b>${esc(e.name)}</b>${e.lm?`<small>telat total ${e.lm} mnt</small>`:''}</td><td class="num">${e.n}</td><td class="num">${e.ot}</td><td class="num">${e.late}</td><td class="num">${esc(attMn(e.work)||'0')}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Belum ada data absensi pada rentang ini</div>'}
   ${ks.length?`<button class="btn" type="button" onclick="attXlsx()"><i class="ic" data-ic="download"></i>Unduh Rekap Absensi (Excel)</button>`:''}
  </div>
  ${ks.length?`<div class="panel"><h3>Catatan absensi</h3><select class="fi" onchange="PY.who=this.value;pyRender(true)" aria-label="Filter karyawan"><option value="">Semua karyawan</option>${ks.map(k=>`<option value="${esc(k)}" ${PY.who===k?'selected':''}>${esc(by[k].name)}</option>`).join('')}</select>
   ${(()=>{const rs=PY.rows.filter(r=>!PY.who||r.uname===PY.who).slice().sort((a,c)=>a.t<c.t?1:-1);return rs.slice(0,60).map(attRowHtml).join('')+(rs.length>60?`<p class="pfhint">Menampilkan 60 dari ${rs.length} catatan. Unduh Excel untuk semuanya.</p>`:'')})()}</div>`:''}</div>`;
}
function pyWho(k){PY.who=PY.who===k?'':k;pyRender(true)}
/* ----- ekspor payroll ----- */
async function pyXlsx(){
  const m=PY.month,[from,to]=pyRange(m);
  try{await pyAttLoad(from,to)}catch(e){toast(e.message);return}
  const days=attPair(PY.rows),by=attSumm(days);
  const head=['Karyawan','Jenis gaji','Hari hadir','Telat (mnt)','Jam kerja','Gaji pokok','Uang makan/transport','Tunjangan','Bonus/lembur','Total pendapatan','Potongan telat','Potongan tidak hadir','Potongan lain','Total potongan','Gaji bersih','Status','Catatan'];
  const rs=PY.users.map(u=>({u,r:pyRowFor(m,u.username)}));
  const rows=[head].concat(rs.map(({u,r})=>[u.name,PY_TLBL[r.type]||'',r.days,r.lateMin,attMn(r.work)||'0 mnt',r.basic,r.meal,r.allow,r.bonus,r.gross,r.late,r.absAmt,r.other,r.ded,r.net,r.paid?'Dibayar':'Belum dibayar',r.note||'']));
  const n=rs.length,C=i=>String.fromCharCode(65+i),sm=i=>({f:`SUM(${C(i)}2:${C(i)}${n+1})`,v:rs.reduce((a,x)=>a+(+[0,0,x.r.days,x.r.lateMin,0,x.r.basic,x.r.meal,x.r.allow,x.r.bonus,x.r.gross,x.r.late,x.r.absAmt,x.r.other,x.r.ded,x.r.net][i]||0),0)});
  if(n)rows.push([{t:'TOTAL',b:1},'',sm(2),sm(3),'',sm(5),sm(6),sm(7),sm(8),sm(9),sm(10),sm(11),sm(12),sm(13),sm(14),'','']);
  rows.push(['']);rows.push([{t:'Periode',b:1},pyMonthLbl(m)]);rows.push([{t:'Toko',b:1},db.set.store||'']);rows.push([{t:'Diekspor',b:1},new Date().toLocaleString('id-ID')]);
  const ks=Object.keys(by).sort((a,c)=>by[a].name<by[c].name?-1:1);
  const ab=[['Karyawan','Hari masuk','Tepat waktu','Terlambat','Total telat (mnt)','Pulang cepat','Tanpa shift','Total jam kerja (mnt)','Total jam kerja']].concat(ks.map(k=>{const e=by[k];return[e.name,e.n,e.ot,e.late,e.lm,e.early,e.ns,e.work,attMn(e.work)]}));
  dlBlob(xlsxBuild([{name:'Payroll',rows,head:1,w:[24,12,11,11,14,14,16,13,13,16,14,16,13,14,15,15,24]},{name:'Rekap Absensi',rows:ab,head:1,w:[24,12,12,11,16,13,12,20,18]}],dec()),'payroll-'+m+'.xlsx');
  toast('Payroll diunduh');
}
/* --- rekap absensi ke Excel (owner): rentang tanggal bebas, ringkasan per karyawan + harian + semua catatan --- */
function attXlsxBox(){
  const t=ATT.today||new Date().toISOString().slice(0,10);
  if(!ATT.xf)ATT.xf=t.slice(0,8)+'01';if(!ATT.xt)ATT.xt=t;
  return `<div class="atx"><b style="font-size:14px">Rekap Excel</b>
  <div class="acll"><div><label for="axF">Dari tanggal</label><input class="fi" type="date" id="axF" value="${esc(ATT.xf)}" onchange="ATT.xf=this.value;ATT.xman=1"></div><div><label for="axT">Sampai tanggal</label><input class="fi" type="date" id="axT" value="${esc(ATT.xt)}" onchange="ATT.xt=this.value;ATT.xman=1"></div></div>
  <div class="chips"><button type="button" class="chip" onclick="attXr('month')">Bulan ini</button><button type="button" class="chip" onclick="attXr('last')">Bulan lalu</button><button type="button" class="chip" onclick="attXr('7')">7 hari</button></div>
  <button class="btn" type="button" id="axBtn" onclick="attXlsx()"><i class="ic" data-ic="download"></i>Unduh Rekap Excel</button>
  </div>`;
}
function attXr(k){
  const t=ATT.today||new Date().toISOString().slice(0,10);let f=t,to=t;
  if(k==='month')f=t.slice(0,8)+'01';
  else if(k==='7')f=attAdd(t,-6);
  else if(k==='last'){const d=new Date(t.slice(0,8)+'01T00:00:00Z');d.setUTCDate(0);to=d.toISOString().slice(0,10);f=to.slice(0,8)+'01'}
  ATT.xf=f;ATT.xt=to;ATT.xman=1;const a=$('#axF'),b=$('#axT');if(a)a.value=f;if(b)b.value=to;
}
function attXlsxData(rows,from,to){
  const lbl=r=>r.type==='in'?(r.status==='late'?'Terlambat':r.status==='ontime'?'Tepat waktu':'Tanpa shift'):(r.status==='early'?'Pulang cepat':r.status==='ok'?'Sesuai jadwal':'Pulang');
  rows=rows.slice().sort((a,b)=>a.t<b.t?-1:a.t>b.t?1:0);
  const all=[['Tanggal','Karyawan','Username','Jenis','Jam','Shift','Jadwal','Keterangan','Selisih (mnt)','Jarak dari toko (m)','Latitude','Longitude','Akurasi GPS (m)']];
  rows.forEach(r=>all.push([r.day,r.name,r.uname,r.type==='in'?'Masuk':'Pulang',attT(r.t),r.shift||'',r.shift?r.sstart+'–'+r.send:'',lbl(r),+r.mins||0,r.dist==null?'':+r.dist,r.lat==null?'':+r.lat,r.lng==null?'':+r.lng,r.acc==null?'':+r.acc]));
  const days=attPair(rows);
  const dh=[['Tanggal','Karyawan','Shift','Jadwal','Masuk','Ket. Masuk','Telat (mnt)','Pulang','Ket. Pulang','Pulang cepat (mnt)','Durasi kerja (mnt)','Durasi kerja']];
  days.forEach(d=>{const mn=d.in&&d.out?Math.max(0,Math.round((new Date(d.out.t)-new Date(d.in.t))/60000)):'';
    dh.push([d.day,d.name,d.shift,d.sched,d.in?attT(d.in.t):'',d.in?lbl(d.in):'',d.in&&d.in.status==='late'?+d.in.mins||0:0,d.out?attT(d.out.t):'',d.out?lbl(d.out):'',d.out&&d.out.status==='early'?+d.out.mins||0:0,mn,mn===''?'':attMn(mn)])});
  // ringkasan per karyawan
  const by={};
  days.forEach(d=>{const k=d.uname,e=by[k]=by[k]||{name:d.name,n:0,ot:0,late:0,lm:0,early:0,ns:0,work:0};
    if(d.in){e.n++;if(d.in.status==='late'){e.late++;e.lm+=+d.in.mins||0}else if(d.in.status==='ontime')e.ot++;else e.ns++}
    if(d.out&&d.out.status==='early')e.early++;
    if(d.in&&d.out)e.work+=Math.max(0,Math.round((new Date(d.out.t)-new Date(d.in.t))/60000))});
  const names=Object.keys(by).sort((a,b)=>by[a].name<by[b].name?-1:1),n=names.length;
  const sm=[['Karyawan','Hari masuk','Tepat waktu','Terlambat','Total telat (mnt)','Pulang cepat','Tanpa shift','Total jam kerja (mnt)','Total jam kerja']];
  names.forEach(k=>{const e=by[k];sm.push([e.name,e.n,e.ot,e.late,e.lm,e.early,e.ns,e.work,attMn(e.work)])});
  if(n){const C=i=>String.fromCharCode(65+i),f=i=>({f:`SUM(${C(i)}2:${C(i)}${n+1})`,v:names.reduce((a,k)=>a+[0,by[k].n,by[k].ot,by[k].late,by[k].lm,by[k].early,by[k].ns,by[k].work][i],0)});
    sm.push([{t:'TOTAL',b:1},f(1),f(2),f(3),f(4),f(5),f(6),f(7),''])}
  sm.push(['']);sm.push([{t:'Toko',b:1},db.set.store||'']);sm.push([{t:'Periode',b:1},from+' s/d '+to]);sm.push([{t:'Diekspor',b:1},new Date().toLocaleString('id-ID',{timeZone:attTzv()})]);
  return{n:rows.length,sheets:[{name:'Ringkasan',rows:sm,head:1,w:[24,12,12,11,16,13,12,20,18]},{name:'Harian',rows:dh,head:1,w:[12,20,14,13,9,13,12,9,15,18,17,15]},{name:'Semua Catatan',rows:all,head:1,w:[12,20,14,9,8,14,13,14,13,17,12,12,14]}]};
}
async function attXlsx(){
  if(!isOwner())return;
  const from=ATT.xf,to=ATT.xt;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')){toast('Pilih tanggal dulu');return}
  if(from>to){toast('Tanggal awal harus sebelum tanggal akhir');return}
  const b=$('#axBtn');if(b)b.disabled=true;
  try{
    const r=await api('/api/att?from='+from+'&to='+to),j=await r.json();
    if(!r.ok){toast(j.error||'Gagal mengambil data absensi');return}
    if(j.tz)ATT.tz=j.tz;
    let rows=j.rows||[];if(ATT.who)rows=rows.filter(x=>x.uname===ATT.who);
    if(!rows.length){toast('Tidak ada data absensi pada tanggal ini');return}
    const x=attXlsxData(rows,from,to),a=document.createElement('a');
    a.href=URL.createObjectURL(xlsxBuild(x.sheets,0));a.download='rekap-absensi-'+from+'_sd_'+to+'.xlsx';
    document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},4000);
    toast('Excel diunduh ('+x.n+' catatan)');
  }catch(e){if(e.message!=='auth')toast('Tidak bisa terhubung ke server')}
  finally{const b2=$('#axBtn');if(b2)b2.disabled=false}
}
/* --- kamera + GPS --- */
function attStop(){try{if(ATT.stream){ATT.stream.getTracks().forEach(t=>t.stop());ATT.stream=null}}catch(e){}}
function attOpen(type){
  const c=attC(),sh=$('#attShift');
  if(type==='in'&&sh&&!sh.value){toast('Pilih shift dulu');return}
  ATT.mode=type;ATT.photo='';ATT.pos=null;ATT.shiftSel=sh?sh.value:'';
  openModal(`<h3>${type==='in'?'Absen Masuk':'Absen Pulang'}</h3>
  <div class="attcam"><video id="attVid" playsinline muted autoplay></video><img id="attSnap" alt="Foto selfie" hidden></div>
  <div class="attloc" id="attLoc">Mencari lokasi…</div>
  <p class="hint" id="attErr" style="color:var(--bad);min-height:16px;margin:4px 0"></p>
  <button class="btn" id="attShot" onclick="attShot()" disabled>Ambil Foto</button>
  <button class="btn sec" id="attRetake" onclick="attRetake()" hidden>Ulangi Foto</button>
  <button class="btn" id="attSend" onclick="attSend()" hidden disabled>Kirim Absen</button>
  <button class="btn sec" onclick="closeModal()">Batal</button>`);
  attCam();attGps();
}
async function attCam(){
  const er=$('#attErr');
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw {name:window.isSecureContext===false?'Insecure':'NoApi'};
    const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:640}},audio:false});
    if(!$('#attVid')){st.getTracks().forEach(t=>t.stop());return}
    ATT.stream=st;const v=$('#attVid');v.srcObject=st;try{await v.play()}catch(e){}
    const b=$('#attShot');if(b)b.disabled=false;
  }catch(e){
    if(er)er.textContent=e&&e.name==='NotAllowedError'?'Kamera diblokir. Izinkan akses kamera di pengaturan browser, lalu buka absen lagi.':e&&e.name==='Insecure'?'Kamera hanya bisa dipakai lewat alamat https.':'Kamera tidak ditemukan atau tidak bisa dibuka.';
  }
}
function attGps(){
  const el=$('#attLoc');
  if(!navigator.geolocation){if(el){el.className='attloc bad';el.textContent='Perangkat ini tidak mendukung GPS'}return}
  if(el){el.className='attloc';el.textContent='Mencari lokasi…'}
  navigator.geolocation.getCurrentPosition(p=>{
    ATT.pos={lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy||0)};
    const e=$('#attLoc');if(!e)return;const st=attStore();let t='Lokasi terdeteksi · akurasi ±'+ATT.pos.acc+' m',cls='ok';
    if(st){const d=attDist(ATT.pos.lat,ATT.pos.lng,st.lat,st.lng);ATT.pos.d=d;if(d<=st.rad)t+=' · '+d+' m dari toko';else{t='Di luar area toko: '+d+' m (maks. '+st.rad+' m)';cls='bad'}}
    e.className='attloc '+cls;e.textContent=t;attReadySend();
  },err=>{
    const e=$('#attLoc');if(!e)return;e.className='attloc bad';
    e.innerHTML=(err&&err.code===1?'Izin lokasi ditolak. Aktifkan GPS/lokasi untuk browser ini. ':'Lokasi belum didapat. ')+'<button class="lnk" type="button" onclick="attGps()">Coba lagi</button>';
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
function attShot(){
  const v=$('#attVid');if(!v||!v.videoWidth){$('#attErr').textContent='Kamera belum siap';return}
  const W=320,H=Math.round(v.videoHeight*W/v.videoWidth),c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(v,0,0,W,H);
  ATT.photo=c.toDataURL('image/jpeg',.65);
  const im=$('#attSnap');im.src=ATT.photo;im.hidden=false;v.hidden=true;$('#attShot').hidden=true;$('#attRetake').hidden=false;$('#attSend').hidden=false;$('#attErr').textContent='';attReadySend();
}
function attRetake(){ATT.photo='';$('#attSnap').hidden=true;$('#attVid').hidden=false;$('#attShot').hidden=false;$('#attRetake').hidden=true;$('#attSend').hidden=true;const v=$('#attVid');if(v&&(!ATT.stream||!ATT.stream.active))attCam();else if(v){try{v.play()}catch(e){}}}
function attReadySend(){const b=$('#attSend');if(!b)return;const st=attStore(),out=st&&st.strict&&ATT.pos&&ATT.pos.d!=null&&ATT.pos.d>st.rad;b.disabled=!(ATT.photo&&ATT.pos)||!!out}
async function attSend(){
  if(!ATT.photo||!ATT.pos)return;const b=$('#attSend'),er=$('#attErr');b.disabled=true;b.textContent='Mengirim…';er.textContent='';
  try{
    const r=await api('/api/att',{method:'POST',body:JSON.stringify({type:ATT.mode,photo:ATT.photo,lat:ATT.pos.lat,lng:ATT.pos.lng,acc:ATT.pos.acc,shift:ATT.shiftSel||''})}),j=await r.json();
    if(!r.ok){er.textContent=j.error||'Gagal mengirim absen';b.disabled=false;b.textContent='Kirim Absen';return}
    const rec=j.rec;closeModal();
    toast((rec.type==='in'?'Absen masuk ':'Absen pulang ')+'tercatat'+(rec.status==='late'?' · Terlambat '+attMn(rec.mins):rec.status==='ontime'?' · Tepat waktu':rec.status==='early'?' · Pulang cepat '+attMn(rec.mins):''));
    attLoad(true);
  }catch(e){if(e.message!=='auth'){er.textContent='Tidak bisa terhubung ke server';b.disabled=false;b.textContent='Kirim Absen'}}
}
async function attPhoto(id){
  const r0=ATT.rows.find(x=>x.id===id)||{};
  openModal(`<h3>${esc(r0.name||'Foto absen')}</h3><div class="hint">Memuat foto…</div><button class="btn sec" onclick="closeModal()">Tutup</button>`);
  try{
    const r=await api('/api/att/photo?id='+id),j=await r.json();
    if(!r.ok||!j.photo){openModal(`<h3>${esc(r0.name||'Foto absen')}</h3><div class="hint">Foto tidak tersedia (foto lama otomatis dihapus setelah 60 hari).</div><button class="btn sec" onclick="closeModal()">Tutup</button>`);return}
    openModal(`<h3>${esc(r0.name||'Foto absen')}</h3><div class="hint">${r0.type==='in'?'Masuk':'Pulang'} ${esc(attD(r0.day))} ${esc(attT(r0.t))}</div><img src="${esc(j.photo)}" alt="Foto selfie absen" style="width:100%;border-radius:20px;margin:8px 0"><button class="btn sec" onclick="closeModal()">Tutup</button>`);
  }catch(e){}
}
/* --- pengaturan (khusus owner): jam shift, lokasi toko, pembagian shift --- */
async function attCfgDraw(){
  const b=$('#attForm');if(!b||!isOwner())return;
  const c=attC();
  try{const j=await (await api('/api/users')).json();ATT.users=(j.users||[]).filter(u=>u.active)}catch(e){}
  b.innerHTML=`<h3>Pengaturan Absensi &amp; Shift <span class="pst w">khusus owner</span></h3>
  <label class="tgl"><input type="checkbox" id="acOn" ${c.on?'checked':''}><span>Aktifkan absensi karyawan</span></label>
  <label class="fl" for="acTz">Zona waktu toko</label><select class="fi" id="acTz">${ATT_TZ.map(z=>`<option value="${z[0]}" ${(c.tz||'')===z[0]?'selected':''}>${z[1]}</option>`).join('')}</select>
  <label class="fl">Lokasi toko (untuk cek jarak absen)</label>
  <div class="acll"><input class="fi" id="acLat" inputmode="decimal" placeholder="Latitude" value="${esc(String(c.lat==null?'':c.lat))}"><input class="fi" id="acLng" inputmode="decimal" placeholder="Longitude" value="${esc(String(c.lng==null?'':c.lng))}"></div>
  <button class="btn sec" type="button" onclick="acHere()">📍 Pakai lokasi saya sekarang (GPS)</button>
  <label class="fl" for="acRad">Radius area toko (meter)</label><input class="fi" id="acRad" type="number" min="20" max="5000" value="${+c.radius||100}">
  <label class="tgl"><input type="checkbox" id="acStrict" ${c.strict?'checked':''}><span>Absen hanya boleh dari dalam area toko</span></label>
  <label class="fl">Shift</label><div id="acShifts">${(c.shifts||[]).map(acShiftRow).join('')}</div>
  <button class="btn sec" type="button" onclick="acAdd()">+ Tambah shift</button>
  <label class="fl">Shift tiap karyawan</label><div id="acAssign"></div>
  <p class="hint" id="acErr" style="color:var(--bad);min-height:16px"></p>
  <button class="btn" onclick="acSave()">Simpan Pengaturan Absensi</button>`;
  acAssignDraw();
}
function acShiftRow(x){
  return `<div class="acs" data-id="${esc(x.id)}"><div class="nm"><label>Nama shift</label><input class="fi acn" maxlength="30" placeholder="Mis. Pagi" value="${esc(x.name||'')}" oninput="acAssignDraw()"></div>
  <div><label>Mulai</label><input class="fi act1" type="time" value="${esc(x.start||'')}"></div><div><label>Selesai</label><input class="fi act2" type="time" value="${esc(x.end||'')}"></div>
  <div><label title="Toleransi telat, dalam menit">Toleransi mnt</label><input class="fi acg" type="number" inputmode="numeric" min="0" max="120" value="${+x.grace||0}"></div>
  <button class="btn sec acdel" type="button" onclick="this.closest('.acs').remove();acAssignDraw()">Hapus shift</button></div>`;
}
function acAdd(){const id='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);$('#acShifts').insertAdjacentHTML('beforeend',acShiftRow({id,name:'',start:'08:00',end:'16:00',grace:10}));acAssignDraw()}
function acRead(){return [...document.querySelectorAll('#acShifts .acs')].map((e,i)=>({id:e.dataset.id,name:e.querySelector('.acn').value.trim()||('Shift '+(i+1)),start:e.querySelector('.act1').value,end:e.querySelector('.act2').value,grace:Math.max(0,Math.min(120,Math.round(+e.querySelector('.acg').value||0)))}))}
function acAssignDraw(){
  const box=$('#acAssign');if(!box)return;const shs=acRead(),cur={...(attC().assign||{})};
  box.querySelectorAll('select[data-u]').forEach(s=>{cur[s.dataset.u]=s.value});
  box.innerHTML=ATT.users.length?ATT.users.map(u=>`<div class="asg"><span>${esc(u.name)} <small style="color:var(--mu)">@${esc(u.username)}</small></span><select class="fi" data-u="${esc(u.username)}"><option value="">Pilih sendiri</option>${shs.map(x=>`<option value="${esc(x.id)}" ${cur[u.username]===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>`).join(''):'<div class="hint">Belum ada karyawan.</div>';
}
function acHere(){
  if(!navigator.geolocation){toast('GPS tidak didukung perangkat ini');return}
  toast('Mencari lokasi…');
  navigator.geolocation.getCurrentPosition(p=>{$('#acLat').value=p.coords.latitude.toFixed(6);$('#acLng').value=p.coords.longitude.toFixed(6);toast('Lokasi toko diisi dari GPS')},()=>toast('Lokasi tidak didapat. Izinkan akses lokasi.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
function acSave(){
  if(!isOwner())return;const er=$('#acErr'),shs=acRead();
  for(const x of shs){if(!x.start||!x.end){er.textContent='Isi jam mulai dan selesai untuk setiap shift';return}if(x.start===x.end){er.textContent='Jam mulai dan selesai tidak boleh sama ('+x.name+')';return}}
  const la=$('#acLat').value.trim().replace(',','.'),ln=$('#acLng').value.trim().replace(',','.');
  if((la||ln)&&(!(Math.abs(+la)<=90)||!(Math.abs(+ln)<=180)||!la||!ln)){er.textContent='Latitude/longitude tidak valid';return}
  const assign={};document.querySelectorAll('#acAssign select[data-u]').forEach(s=>{if(s.value&&shs.some(x=>x.id===s.value))assign[s.dataset.u]=s.value});
  db.set.att={on:$('#acOn').checked,tz:$('#acTz').value,lat:la?+la:'',lng:ln?+ln:'',radius:Math.max(20,Math.min(5000,Math.round(+$('#acRad').value||100))),strict:$('#acStrict').checked,shifts:shs,assign};
  er.textContent='';save();toast('Pengaturan absensi disimpan');attDraw();
}
function fmtLast(t){if(!t)return 'belum pernah masuk';const d=new Date(t);return d.toLocaleDateString(dloc(),{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString(dloc(),{hour:'2-digit',minute:'2-digit'}).replace('.',':')}
async function renderUsr(){
  const el=$('#usrList');if(!el)return;
  try{
    const j=await (await api('/api/users')).json();USR.list=j.users||[];
    const a=await (await api('/api/audit')).json();USR.log=a.log||[];
  }catch(e){if(e.message!=='auth')el.innerHTML='<div class="empty">Gagal memuat pengguna</div>';return}
  const me=CL.me?CL.me.id:0;
  el.innerHTML=USR.list.map(u=>{const own=u.role==='owner',pr=own?[]:Object.keys(PERM_SHORT).filter(p=>u.perms.includes(p));
    return `<div class="coc usr ${u.active?'':'cancelled'}" style="border-left-color:${own?'var(--b)':'#d4d4d4'}">
    <div class="coh"><span class="av">${esc((u.name||'?').trim().charAt(0).toUpperCase())}</span><span class="cn">${esc(u.name)}</span><span class="ct">@${esc(u.username)}${u.id===me?' · Anda':''}</span><time>${esc(fmtLast(u.lastLogin))}</time></div>
    <div class="cof" style="justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-top:8px"><span class="pst ${own?'w':'ok'}">${esc(usrRoleLabel(u.role))}</span>${u.active?'':'<span class="pst">nonaktif</span>'}${u.single?'<span class="pst">1 perangkat</span>':''}
      ${own?'<span class="pchip on">Semua fitur</span>':pr.map(p=>`<span class="pchip on">${PERM_SHORT[p]}</span>`).join('')||'<span class="pchip">Tanpa izin</span>'}</div>
    <div class="cob"><button class="btn sec" onclick="usrForm(${u.id})"><i class="ic" data-ic="edit"></i>Ubah</button><button class="btn sec" onclick="usrPw(${u.id})"><i class="ic" data-ic="key"></i>Reset sandi</button>
      ${u.id!==me?`<button class="btn sec" onclick="usrToggle(${u.id})">${u.active?'<i class="ic" data-ic="pause"></i>Nonaktifkan':'<i class="ic" data-ic="play"></i>Aktifkan'}</button><button class="btn sec" onclick="usrDel(${u.id})"><i class="ic" data-ic="trash"></i>Hapus</button>`:''}</div></div>`}).join('')||'<div class="empty">Belum ada pengguna</div>';
  usrLogDraw();
}
function usrLogPage(p){ULOG.page=Math.max(0,p);usrLogDraw()}
function usrLogDraw(){
  const bar=$('#usrLogBar'),el=$('#usrLog');if(!bar||!el)return;
  const acts=[...new Set(USR.log.map(x=>x.action))].sort((a,b)=>(ACT_LBL[a]||a).localeCompare(ACT_LBL[b]||b)),us=[...new Set(USR.log.map(x=>x.uname).filter(Boolean))].sort();
  bar.innerHTML=`<select class="logsel" aria-label="Urutkan" onchange="ULOG.sort=this.value;ULOG.page=0;usrLogDraw()">${[['new','Terbaru'],['old','Terlama'],['user','Pengguna A–Z'],['act','Aksi A–Z']].map(([v,t])=>`<option value="${v}" ${ULOG.sort===v?'selected':''}>${t}</option>`).join('')}</select>
  <select class="logsel" aria-label="Filter aksi" onchange="ULOG.act=this.value;ULOG.page=0;usrLogDraw()"><option value="">Semua aksi</option>${acts.map(a=>`<option value="${esc(a)}" ${ULOG.act===a?'selected':''}>${esc(ACT_LBL[a]||a)}</option>`).join('')}</select>
  <select class="logsel" aria-label="Filter pengguna" onchange="ULOG.user=this.value;ULOG.page=0;usrLogDraw()"><option value="">Semua pengguna</option>${us.map(u=>`<option value="${esc(u)}" ${ULOG.user===u?'selected':''}>@${esc(u)}</option>`).join('')}</select>`;
  let l=USR.log.filter(x=>(!ULOG.act||x.action===ULOG.act)&&(!ULOG.user||x.uname===ULOG.user));
  const tm=x=>String(x.t||''),nm=x=>String(x.uname||'').toLowerCase(),ac=x=>String(ACT_LBL[x.action]||x.action).toLowerCase();
  l=l.slice().sort(ULOG.sort==='old'?(a,b)=>tm(a)<tm(b)?-1:tm(a)>tm(b)?1:0:ULOG.sort==='user'?(a,b)=>nm(a)<nm(b)?-1:nm(a)>nm(b)?1:(tm(a)<tm(b)?1:-1):ULOG.sort==='act'?(a,b)=>ac(a)<ac(b)?-1:ac(a)>ac(b)?1:(tm(a)<tm(b)?1:-1):(a,b)=>tm(a)<tm(b)?1:tm(a)>tm(b)?-1:0);
  const pages=Math.max(1,Math.ceil(l.length/ULOG.size));ULOG.page=Math.min(ULOG.page,pages-1);const start=ULOG.page*ULOG.size;
  el.innerHTML=l.length?l.slice(start,start+ULOG.size).map(x=>`<div class="dbs"><span><b>${esc(ACT_LBL[x.action]||x.action)}</b>${x.uname?' · @'+esc(x.uname):''}${x.detail?' · <span style="color:var(--mu)">'+esc(x.detail)+'</span>':''}</span><span style="color:var(--mu);white-space:nowrap">${esc(fmtLast(x.t))}</span></div>`).join(''):'<div class="empty">Tidak ada aktivitas</div>';
  if(l.length)el.innerHTML+=`<div class="cob" style="align-items:center;justify-content:space-between;gap:8px;margin-top:10px"><span style="color:var(--mu);font-size:12px">${start+1}–${Math.min(start+ULOG.size,l.length)} dari ${l.length} aktivitas</span><span style="display:flex;gap:6px"><button class="btn sec sm" onclick="usrLogPage(${ULOG.page-1})" ${ULOG.page===0?'disabled':''}>Sebelumnya</button><button class="btn sec sm" onclick="usrLogPage(${ULOG.page+1})" ${ULOG.page>=pages-1?'disabled':''}>Berikutnya</button></span></div>`;
}
const permRow=(p,on,extra,cls)=>`<label class="tgl prm"><input type="checkbox" ${cls?'class="'+cls+'"':''} value="${p}" ${on?'checked':''} ${extra||''}><span><b>${PERM_LBL[p]}</b><small>${PERM_DESC[p]}</small></span></label>`;
function permBoxes(sel){return Object.keys(PERM_LBL).map(p=>permRow(p,sel.includes(p),'','upm')).join('')}
/* jabatan bawaan yang disembunyikan owner (per toko, db.set.hiddenRoles = array kunci). Owner dan Staf tidak bisa disembunyikan. */
function jbHidden(){return Array.isArray(db.set.hiddenRoles)?db.set.hiddenRoles:[]}
function usrRoleList(){const d=Array.isArray(db.set.staffRoles)?db.set.staffRoles:[],hid=jbHidden();return [...new Set(['Owner',...JB_BASE.filter(r=>jbKey(r)==='staff'||!hid.includes(jbKey(r))),...d].map(x=>String(x||'').trim()).filter(Boolean))].slice(0,30)}
function rolePermsOf(k){const o=db.set.rolePerms&&db.set.rolePerms[k];return Array.isArray(o)?o:ROLE_PERMS[k]}
/* panel Kelola Jabatan: tambah, ubah nama, hapus jabatan buatan sendiri, dan atur izin awal tiap jabatan (per toko) */
const JB_BASE=['Kasir','Pelayan','Koki','Barista','Manajer','Admin Gudang','Server','Kitchen','Staf'];
function jbKey(n){const k=usrRoleKey(n);return k==='staf'?'staff':k}
function jbCount(k){return (USR.list||[]).filter(u=>usrRoleKey(u.role)===k).length}
function jbOpen(msg,bad){
  if(!isOwner())return;
  const list=usrRoleList().filter(r=>usrRoleKey(r)!=='owner');
  openModal(`<h3>Jabatan</h3><p class="hint" style="margin:0 0 10px">Izin di jabatan dipakai sebagai izin awal saat jabatan dipilih untuk karyawan. Izin tiap karyawan tetap bisa diubah sendiri.</p>
  ${msg?`<p class="hint" style="${bad?'color:var(--bad)':'color:var(--ok)'}">${esc(msg)}</p>`:''}
  <div class="jbl">${list.map(r=>{const k=jbKey(r),pm=rolePermsOf(k)||['co'];return `<button type="button" class="jbr" onclick="jbEdit('${esc(k)}')"><span class="tx"><b>${esc(usrRoleLabel(r))}</b><small>${jbCount(k)} karyawan · ${pm.length} izin</small></span>${pfi('chev',18)}</button>`}).join('')}</div>
  <button class="btn" type="button" onclick="jbNew()">+ Jabatan Baru</button><button class="btn sec" type="button" onclick="closeModal()">Tutup</button>`);
}
function jbNew(msg){
  openModal(`<h3>Jabatan Baru</h3><label class="fl" for="jbNew">Nama jabatan</label><input class="fi" id="jbNew" maxlength="32" placeholder="Mis. Kepala Dapur" autocomplete="off">
  <p class="hint" id="jbMsg" style="min-height:16px;color:var(--bad)">${esc(msg||'')}</p><button class="btn" type="button" onclick="jbAdd()">Tambah</button><button class="btn sec" type="button" onclick="jbOpen()">Batal</button>`);
  const i=$('#jbNew');if(i)i.focus();
}
function jbEdit(k,msg){
  const r=usrRoleList().find(x=>jbKey(x)===k);if(!r)return jbOpen();
  const cus=usrRoleCustom().some(x=>usrRoleKey(x)===usrRoleKey(r)),pm=rolePermsOf(k)||['co'],n=jbCount(k),canDel=cus||(k!=='staff'&&JB_BASE.some(x=>jbKey(x)===k));
  openModal(`<h3>${esc(usrRoleLabel(r))}</h3><p class="hint" style="margin:0 0 6px">${n} karyawan memakai jabatan ini.${msg?' <b style="color:var(--ok)">'+esc(msg)+'</b>':''}</p>
  ${cus?`<label class="fl" for="jbRn">Nama jabatan</label><input class="fi" id="jbRn" maxlength="32" value="${esc(usrRoleLabel(r))}" onchange="jbRename('${esc(k)}',this.value)">`:''}
  <label class="fl">Izin awal</label><div class="prms">${Object.keys(PERM_LBL).map(pk=>permRow(pk,pm.includes(pk),`onchange="jbPerm('${esc(k)}','${pk}',this.checked)"`)).join('')}</div>
  ${canDel?`<button class="btn sec" type="button" style="color:var(--bad)" onclick="${cus?`jbDel('${esc(k)}')`:`jbHide('${esc(k)}')`}"><i class="ic" data-ic="trash"></i>Hapus jabatan</button>`:''}
  <button class="btn" type="button" onclick="jbOpen()">Selesai</button>`);
}
function jbCheck(v,except){
  v=(v||'').trim().replace(/\s+/g,' ');if(!v)return['Isi nama jabatan dulu'];if(v.length>32)return['Maksimal 32 karakter'];
  if(['owner','new'].includes(usrRoleKey(v)))return['Nama ini khusus sistem'];
  if(usrRoleList().some(x=>usrRoleKey(x)===usrRoleKey(v)&&usrRoleKey(x)!==except))return['Jabatan sudah ada'];
  return[null,v]}
function jbAdd(){
  const raw=$('#jbNew').value,hidBase=JB_BASE.find(r=>jbKey(r)===jbKey(raw)&&jbHidden().includes(jbKey(r)));
  if(hidBase){db.set.hiddenRoles=jbHidden().filter(x=>x!==jbKey(hidBase));save();return jbEdit(jbKey(hidBase),'Jabatan ditambahkan kembali')}   // nama jabatan bawaan yang pernah dihapus = dipulihkan
  const [er,v]=jbCheck(raw);if(er)return jbNew(er);
  if(usrRoleList().length>=30)return jbNew('Maksimal 30 jabatan');
  db.set.staffRoles=[...usrRoleCustom(),v];db.set.rolePerms=Object.assign({},db.set.rolePerms,{[jbKey(v)]:['co']});save();jbEdit(jbKey(v),'Jabatan ditambahkan. Atur izinnya.');
}
function jbPerm(k,pk,on){
  const cur=(rolePermsOf(k)||['co']).filter(x=>x!==pk);if(on)cur.push(pk);
  db.set.rolePerms=Object.assign({},db.set.rolePerms,{[k]:Object.keys(PERM_LBL).filter(x=>cur.includes(x))});save();
}
async function jbRename(k,nv){
  const [er,v]=jbCheck(nv,k);if(er)return jbEdit(k,er);
  const nk=jbKey(v),users=(USR.list||[]).filter(u=>usrRoleKey(u.role)===k);
  try{for(const u of users){const r=await api('/api/users/'+u.id,{method:'PUT',body:JSON.stringify({role:nk})});if(!r.ok){const j=await r.json().catch(()=>({}));return jbOpen(j.error||'Gagal mengubah nama',true)}}}catch(e){return}
  db.set.staffRoles=usrRoleCustom().map(x=>usrRoleKey(x)===k?v:x);
  const rp=Object.assign({},db.set.rolePerms);if(rp[k]){rp[nk]=rp[k];if(nk!==k)delete rp[k]}db.set.rolePerms=rp;save();
  await renderUsr();jbEdit(nk,'Nama diubah'+(users.length?' ('+users.length+' karyawan ikut diperbarui)':''));
}
function jbHide(k){
  if(k==='staff'||k==='owner'||!JB_BASE.some(r=>jbKey(r)===k))return;
  const n=jbCount(k);db.set.hiddenRoles=[...new Set([...jbHidden(),k])];save();   // izin awal di rolePerms sengaja dibiarkan agar pulih sama
  jbOpen('Jabatan '+usrRoleLabel(k)+' dihapus dari daftar'+(n?' ('+n+' karyawan tetap memakainya)':''));
}
function jbRestore(k){db.set.hiddenRoles=jbHidden().filter(x=>x!==k);save();jbOpen('Jabatan '+usrRoleLabel(k)+' dipulihkan');}
function jbRestoreAll(){const n=jbHidden().length;db.set.hiddenRoles=[];save();jbOpen(n+' jabatan dipulihkan');}
function jbDel(k){
  const n=jbCount(k);
  db.set.staffRoles=usrRoleCustom().filter(x=>usrRoleKey(x)!==k);const rp=Object.assign({},db.set.rolePerms);delete rp[k];db.set.rolePerms=rp;save();
  jbOpen('Jabatan dihapus dari daftar'+(n?' ('+n+' karyawan tetap memakainya)':''));
}
function usrRolePick(){
  usrRoleSw();const k=usrRoleKey($('#uRole').value),pr=rolePermsOf(k);
  if(pr&&k!=='owner')document.querySelectorAll('.upm').forEach(x=>x.checked=pr.includes(x.value));
  usrRoleDelShow();
}
function usrRoleCustom(){return Array.isArray(db.set.staffRoles)?db.set.staffRoles:[]}
function usrRoleDelShow(){const b=$('#uRoleDel');if(!b)return;const k=usrRoleKey($('#uRole').value);b.style.display=usrRoleCustom().some(x=>usrRoleKey(x)===k)?'':'none'}
function usrRoleDel(){
  const k=usrRoleKey($('#uRole').value);if(!usrRoleCustom().some(x=>usrRoleKey(x)===k))return;
  db.set.staffRoles=usrRoleCustom().filter(x=>usrRoleKey(x)!==k);save();
  $('#uRole').innerHTML=usrRoleOptions('staff');usrRolePick();$('#uRoleErr').textContent='Jabatan dihapus dari daftar (karyawan lama tetap memakainya)';
}
function usrRoleKey(s){return String(s||'').trim().toLowerCase()}
function usrRoleLabel(s){const k=usrRoleKey(s);if(k==='owner')return 'Owner';if(k==='staff'||k==='staf')return 'Staf';const b={kasir:'Kasir',server:'Server',kitchen:'Kitchen'};return b[k]||String(s||'').replace(/(^|\s)\S/g,x=>x.toUpperCase())}
function usrRoleOptions(selected){const L=usrRoleList();if(selected&&!L.some(r=>(usrRoleKey(r)==='staf'?'staff':usrRoleKey(r))===selected))L.push(selected);return L.map(r=>{const v=usrRoleKey(r)==='staf'?'staff':usrRoleKey(r);return `<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(usrRoleLabel(r))}</option>`}).join('')}
function usrAddRole(){const i=$('#uNewRole'),e=$('#uRoleErr'),v=(i.value||'').trim().replace(/\s+/g,' ');if(!v){e.textContent='Isi nama jabatan dulu';return}if(v.length>32){e.textContent='Maksimal 32 karakter';return}if(['owner','new'].includes(usrRoleKey(v))){e.textContent='Nama ini khusus sistem';return}const roles=usrRoleList();if(roles.some(x=>usrRoleKey(x)===usrRoleKey(v))){e.textContent='Jabatan sudah ada';return}if(roles.length>=30){e.textContent='Maksimal 30 jabatan';return}db.set.staffRoles=[...roles,v];save();const sel=$('#uRole');sel.innerHTML=usrRoleOptions(usrRoleKey(v));i.value='';e.textContent='Jabatan disimpan';usrRolePick()}
function usrRoleSw(){const o=$('#uRole').value.trim().toLowerCase()==='owner';const sg=$('#uSingle');if(sg&&sg.dataset.t!=='1')sg.checked=!o;$('#uPerms').style.display=o?'none':''}
function usrForm(id){
  const u=id?USR.list.find(x=>x.id===id):null;
  openModal(`<h3>${u?'Ubah Pengguna':'Tambah Pengguna'}</h3>
  <label class="fl">Nama</label><input class="fi" id="uName" maxlength="40" value="${esc(u?u.name:'')}" placeholder="mis. Siti">
  <label class="fl">Username (untuk login)</label><input class="fi" id="uUser" maxlength="24" value="${esc(u?u.username:'')}" ${u?'disabled':''} autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="huruf kecil/angka, mis. siti">
  ${u?'':`<label class="fl">Kata sandi awal</label><input class="fi" id="uPw" type="text" autocomplete="off" placeholder="minimal 6 karakter">`}
  <label class="fl" for="uRole">Jabatan</label>
  <select class="fi" id="uRole" onchange="usrRolePick()" ${u&&u.id===(CL.me||{}).id?'disabled':''}>${usrRoleOptions(u?usrRoleKey(u.role):'staff')}</select>
  <p class="hint" style="margin:6px 2px 0">Memilih jabatan mengisi izin di bawah secara otomatis. Atur jabatan lewat tombol Jabatan di halaman Pengguna.</p>
  <div id="uPerms"><label class="fl">Hak akses</label><div class="prms">${permBoxes(u?(u.perms||[]):['pos','co','prn'])}</div>
    <p class="hint" style="margin:6px 2px 0">Menu Pengguna, Payroll, dan Absensi &amp; Shift hanya untuk owner.</p></div>
  <label class="tgl prm" style="margin-top:10px"><input type="checkbox" id="uSingle" data-t="${u?'1':''}" ${u?(u.single?'checked':''):'checked'} onchange="this.dataset.t='1'"><span><b>Satu perangkat saja</b><small>Karyawan hanya bisa masuk di satu perangkat sekaligus.</small></span></label>
  <p class="hint" id="uErr" style="color:var(--bad);min-height:16px"></p>
  <button class="btn" onclick="usrSave(${id||0})">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
  usrRoleSw();usrRoleDelShow();
}
async function usrSave(id){
  const rawRole=$('#uRole').value.trim();const role=usrRoleKey(rawRole)==='owner'?'owner':usrRoleKey(rawRole)==='staf'?'staff':usrRoleKey(rawRole);const body={name:$('#uName').value.trim(),role,perms:[...document.querySelectorAll('.upm:checked')].map(x=>x.value),single:$('#uSingle').checked};
  if(!id){body.username=$('#uUser').value.trim().toLowerCase();body.password=$('#uPw').value}
  if(!body.name){$('#uErr').textContent='Nama wajib diisi';return}
  try{
    const r=await api(id?'/api/users/'+id:'/api/users',{method:id?'PUT':'POST',body:JSON.stringify(body)}),j=await r.json();
    if(!r.ok){$('#uErr').textContent=j.error||'Gagal menyimpan';return}
    closeModal();toast(id?'Pengguna diperbarui':'Pengguna ditambahkan');renderUsr();
  }catch(e){if(e.message!=='auth')$('#uErr').textContent='Tidak bisa terhubung ke server'}
}
function usrPw(id){
  const u=USR.list.find(x=>x.id===id);
  openModal(`<h3>Reset Sandi</h3><div class="hint">Pengguna <b>${esc(u.name)}</b> (@${esc(u.username)})</div>
  <label class="fl">Sandi baru</label><input class="fi" id="rPw" type="text" autocomplete="off" placeholder="minimal 6 karakter">
  <p class="hint" id="rErr" style="color:var(--bad);min-height:16px"></p>
  <button class="btn" onclick="usrPwSave(${id})">Simpan</button><button class="btn sec" onclick="closeModal()">Batal</button>`);
}
async function usrPwSave(id){
  const pw=$('#rPw').value;if(pw.length<6){$('#rErr').textContent='Minimal 6 karakter';return}
  try{const r=await api('/api/users/'+id,{method:'PUT',body:JSON.stringify({password:pw})}),j=await r.json();if(!r.ok){$('#rErr').textContent=j.error||'Gagal';return}closeModal();toast('Sandi direset');renderUsr()}catch(e){if(e.message!=='auth')$('#rErr').textContent='Tidak bisa terhubung ke server'}
}
async function usrToggle(id){
  const u=USR.list.find(x=>x.id===id);if(!u)return;
  try{const r=await api('/api/users/'+id,{method:'PUT',body:JSON.stringify({active:!u.active})}),j=await r.json();if(!r.ok){toast(j.error||'Gagal');return}toast(u.active?'Akun dinonaktifkan':'Akun diaktifkan');renderUsr()}catch(e){}
}
function usrDel(id){
  const u=USR.list.find(x=>x.id===id);if(!u)return;
  ask('Hapus pengguna?','Akun "'+u.name+'" (@'+u.username+') dihapus permanen. Riwayat penjualan tidak terpengaruh.','Hapus',async()=>{
    try{const r=await api('/api/users/'+id,{method:'DELETE'}),j=await r.json();if(!r.ok){toast(j.error||'Gagal');return}toast('Pengguna dihapus');renderUsr()}catch(e){}
  });
}

/* Jembatan Android (APK): membuat navigator.bluetooth memakai Bluetooth asli Android
   dan menjaga layar tetap menyala. Di browser biasa file ini tidak melakukan apa-apa. */
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
  try{if(C.getPlatform&&C.getPlatform()==='android')document.documentElement.classList.add('cap-android')}catch(e){}   /* APK Android: nav bawah dinaikkan agar tidak menempel ke tepi/gesture bar */
  var P={};
  function setNav(k,v){try{Object.defineProperty(navigator,k,{value:v,configurable:true,writable:true})}catch(e){try{navigator[k]=v}catch(e2){}}}
  ['PushNotifications','LocalNotifications','BluetoothLe','ClassicBt','OrdelaBg'].forEach(function(n){
    try{P[n]=(C.Plugins&&C.Plugins[n])||(C.registerPlugin&&C.registerPlugin(n))||null}catch(e){P[n]=null}
  });

  /* notifikasi sistem Android (WebView tidak punya Notification API) */
  var CH={id:'orders',name:'Pesanan online',description:'Pesanan dan pembayaran dari pelanggan',importance:5,visibility:1,vibration:true,lights:true};
  if(P.LocalNotifications){
    var LN=P.LocalNotifications;
    try{LN.createChannel(CH).catch(function(){})}catch(e){}
    window.nativeNotify={
      ask:async function(){try{var r=await LN.requestPermissions();return r.display==='granted'}catch(e){return false}},
      show:async function(title,body){
        try{
          var p=await LN.checkPermissions();
          if(p.display!=='granted'){p=await LN.requestPermissions();if(p.display!=='granted')return false}
          await LN.schedule({notifications:[{id:Math.floor(Date.now()%2000000000),title:String(title),body:String(body),channelId:'orders'}]});
          return true;
        }catch(e){return false}
      }
    };
  }
  /* notifikasi native (FCM) — aktif bila APK dibuat dengan google-services.json (window.POS_FCM) */
  if(P.OrdelaBg)window.OrdelaBg={status:function(){return P.OrdelaBg.status()},set:function(on){return P.OrdelaBg.setEnabled({on:!!on})},overlay:function(){return P.OrdelaBg.requestOverlay()},battery:function(){return P.OrdelaBg.requestBattery()},info:function(){return P.OrdelaBg.openAppInfo()}};   /* layanan latar belakang + gelembung (APK) */
  /* unduhan file (blob:/data:) tidak jalan di WebView: simpan lewat plugin ke folder Unduhan/Ordela */
  if(P.OrdelaBg&&P.OrdelaBg.saveFile){
    var dlSave=function(a){
      var href=a.href,name=a.getAttribute('download')||'ordela-file';
      fetch(href).then(function(r){return r.blob()}).then(function(b){return new Promise(function(ok,no){
        var fr=new FileReader();fr.onload=function(){ok({b:b,d:String(fr.result).split(',')[1]||''})};fr.onerror=no;fr.readAsDataURL(b)})})
      .then(function(x){return P.OrdelaBg.saveFile({name:name,mime:x.b.type||'application/octet-stream',data:x.d})})
      .then(function(r){try{window.toast(name+' tersimpan di '+(r&&r.where||'Unduhan'))}catch(e){}})
      .catch(function(){try{window.toast('Gagal menyimpan file')}catch(e){}});
    };
    var isDl=function(a){return a&&a.hasAttribute&&a.hasAttribute('download')&&/^(blob:|data:)/.test(a.href||'')};
    var oc=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){if(isDl(this)){dlSave(this);return}return oc.apply(this,arguments)};
    document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[download]'):null;if(isDl(a)){e.preventDefault();dlSave(a)}},true);
  }
  var fcmReady=(P.ClassicBt&&P.ClassicBt.hasFcm)?P.ClassicBt.hasFcm().then(function(r){return !!(r&&r.fcm)}).catch(function(){return !!window.POS_FCM}):Promise.resolve(!!window.POS_FCM);
  if(P.PushNotifications){
    var PN=P.PushNotifications,cur='',hooked=false;
    fcmReady.then(function(ok){if(ok)try{PN.createChannel(CH).catch(function(){})}catch(e){}});
    window.nativePush={
      async sync(api,want){
        try{
          if(!(await fcmReady))return;
          if(!want){await this.off(api);return}
          var pr=await PN.requestPermissions();if(pr.receive!=='granted')return;
          if(!hooked){hooked=true;
            PN.addListener('registration',function(t){cur=t.value;try{localStorage.setItem('pos_fcm',cur)}catch(e){};
              api('/api/push/fcm',{method:'POST',body:JSON.stringify({token:cur})}).catch(function(){})})}
          await PN.register();
          if(cur)api('/api/push/fcm',{method:'POST',body:JSON.stringify({token:cur})}).catch(function(){});
        }catch(e){}
      },
      async off(api){
        var t=cur;try{t=t||localStorage.getItem('pos_fcm')||''}catch(e){}
        if(t)try{await api('/api/push/fcm',{method:'DELETE',body:JSON.stringify({token:t})})}catch(e){}
      }
    };
  }

  /* Pembaruan aplikasi (APK): membandingkan nomor build terpasang dengan rilis "apk-latest" di GitHub.
     Android tidak mengizinkan pemasangan senyap di luar Play Store, jadi pengguna tinggal menekan "Perbarui" lalu "Pasang". */
  if(P.ClassicBt&&P.ClassicBt.appInfo){
    var REPO=window.POS_UPDATE_REPO||'irfanrosadi1922/Ordela',info=null,meta=null,lastChk=0;
    var note=function(t,b,fn,label){try{if(window.OrdelaSkin)OrdelaSkin.island({kind:'new',title:t,body:b,ms:12000,action:fn?{label:label||'Perbarui',fn:fn}:null})}catch(e){}};
    var urlFor=function(){return meta&&info?(/\.admin$/.test(info.id)?meta.admin:meta.kasir):''};
    var download=function(){var u=urlFor();if(u)window.open(u,'_blank')};
    var avail=false,done=false;
    var fire=function(){try{window.dispatchEvent(new Event('ordela-update'))}catch(e){}};
    var check=async function(manual){
      try{
        if(!info)info=await P.ClassicBt.appInfo();
        var r=await fetch('https://api.github.com/repos/'+REPO+'/releases/tags/apk-latest',{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
        if(!r.ok){if(manual)note('Gagal memeriksa','Periksa sambungan internet.');return}
        var rel=await r.json();meta=JSON.parse(rel.body||'{}');lastChk=Date.now();avail=+meta.build>+info.build;done=true;fire();
        if(+meta.build>+info.build){
          var k='pos_upd_n',seen='';try{seen=localStorage.getItem(k)||''}catch(e){}
          /* pemberitahuan hanya SEKALI per build (tidak berulang tiap buka aplikasi); tombol Pembaruan di Tentang tetap bisa dipakai kapan saja */
          if(manual||seen!==String(meta.build))note('Pembaruan tersedia','Ordela '+meta.version+' siap diunduh. Versi Anda '+info.version+'.',download);
          if(seen!==String(meta.build)){try{localStorage.setItem(k,String(meta.build))}catch(e){}
            if(window.nativeNotify)window.nativeNotify.show('Pembaruan Ordela tersedia','Versi '+meta.version+' siap diunduh. Buka aplikasi lalu tekan Perbarui.')}
        }else if(manual)note('Sudah terbaru','Ordela '+info.version+' adalah versi terakhir.');
      }catch(e){if(manual)note('Gagal memeriksa','Coba lagi nanti.')}
    };
    window.OrdelaUpdate={check:check,info:async function(){if(!info)try{info=await P.ClassicBt.appInfo()}catch(e){}return info},state:function(){return{info:info,meta:meta,avail:avail,done:done}},open:function(){
      if(meta&&info&&+meta.build>+info.build)download();else check(true);
    }};
    setTimeout(function(){check(false)},6000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-lastChk>6*36e5)check(false)});
  }

  /* Bluetooth KLASIK (printer thermal yang dipasangkan di pengaturan Bluetooth HP) -> dipakai lewat mode "Bluetooth klasik / USB" */
  var CB=P.ClassicBt;
  if(CB){
    var chooseDevice=function(){
      return CB.list().then(function(r){
        var list=r.devices||[];
        return new Promise(function(res,rej){
          var ov=document.createElement('div');
          ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
          var box=document.createElement('div');
          box.style.cssText='background:#fff;color:#111;border-radius:18px;max-width:420px;width:100%;max-height:80vh;overflow:auto;padding:18px;font:15px system-ui,sans-serif';
          var h=document.createElement('div');h.style.cssText='font-weight:700;font-size:17px;margin-bottom:10px';h.textContent='Pilih printer';box.appendChild(h);
          if(!list.length){var e=document.createElement('div');e.style.cssText='color:#666;margin-bottom:12px';e.textContent='Belum ada printer yang dipasangkan. Pasangkan dulu di Pengaturan Bluetooth HP (PIN 0000 atau 1234), lalu kembali ke sini.';box.appendChild(e)}
          list.forEach(function(d){
            var b=document.createElement('button');b.type='button';
            b.style.cssText='display:block;width:100%;text-align:left;padding:14px;margin:6px 0;border:1px solid #ddd;border-radius:12px;background:#f6f6f6;font-size:15px';
            b.textContent=(d.name||'Tanpa nama')+'  ·  '+d.address;
            b.onclick=function(){document.body.removeChild(ov);res(d)};box.appendChild(b)});
          var c=document.createElement('button');c.type='button';c.textContent='Batal';
          c.style.cssText='display:block;width:100%;padding:12px;margin-top:8px;border:0;border-radius:12px;background:#eee;font-size:15px';
          c.onclick=function(){document.body.removeChild(ov);var er=new Error('Dibatalkan');er.name='NotFoundError';rej(er)};
          box.appendChild(c);ov.appendChild(box);document.body.appendChild(ov);
        });
      });
    };
    var b64=function(u){var s='';for(var i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)};
    var mkPort=function(d){
      var port={_d:d,
        open:function(){return CB.connect({address:d.address}).then(function(){
          try{localStorage.setItem('pos_cbt',JSON.stringify(d))}catch(e){}
          port.writable={getWriter:function(){return{
            write:function(data){return CB.write({data:b64(data instanceof Uint8Array?data:new Uint8Array(data))})},
            releaseLock:function(){}}}}})},
        close:function(){port.writable=null;return CB.disconnect()}};
      return port;
    };
    setNav('serial',{requestPort:function(o){
      var saved=null;try{saved=JSON.parse(localStorage.getItem('pos_cbt')||'null')}catch(e){}
      if(o&&o.auto&&saved&&saved.address)return Promise.resolve(mkPort(saved));
      return chooseDevice().then(mkPort);
    }});
  }
  var BLE=P.BluetoothLe;
  if(!BLE){setNav('bluetooth',{requestDevice:async function(){throw new Error('Plugin Bluetooth tidak ada di APK ini. Buat ulang APK dengan package.json terbaru.')},getDevices:async function(){return[]}});return}
  var ready=null,devs={};
  var PRIO=['49535343-fe7d-4ae5-8fa9-9fafd205e455','e7810a71-73ae-499d-8c15-faa9aef0c3f2','0000ff00-0000-1000-8000-00805f9b34fb','000018f0-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','0000fff0-0000-1000-8000-00805f9b34fb','0000ae30-0000-1000-8000-00805f9b34fb','0000fee7-0000-1000-8000-00805f9b34fb'];
  function init(){return ready||(ready=BLE.initialize({androidNeverForLocation:true}))}
  function hex(u){var s='';u=u instanceof Uint8Array?u:new Uint8Array(u.buffer||u);for(var i=0;i<u.length;i++)s+=(u[i]<16?'0':'')+u[i].toString(16);return s}
  function make(id,name){
    if(devs[id])return devs[id];
    var d={id:id,name:name||'',_ls:[],_con:false,_h:null};
    d.addEventListener=function(t,f){if(t==='gattserverdisconnected')d._ls.push(f)};
    d.removeEventListener=function(){};
    d.gatt={
      get connected(){return d._con},
      connect:async function(){
        await init();
        if(!d._h){d._h=await BLE.addListener('disconnected|'+id,function(){d._con=false;d._ls.forEach(function(f){try{f()}catch(e){}})})}
        await BLE.connect({deviceId:id,timeout:10000});
        d._con=true;
        try{await BLE.requestMtu({deviceId:id,mtu:247})}catch(e){}
        return{getPrimaryServices:async function(){
          var r=await BLE.getServices({deviceId:id});
          var all=(r.services||[]).map(function(sv){return{sv:sv,k:String(sv.uuid).toLowerCase()}});
          var known=all.filter(function(x){return PRIO.indexOf(x.k)>=0})
            .sort(function(a,b){return PRIO.indexOf(a.k)-PRIO.indexOf(b.k)});
          var use=known.length?known:all;
          return use.map(function(x){var sv=x.sv;return{
            uuid:sv.uuid,
            getCharacteristics:async function(){return (sv.characteristics||[]).map(function(ch){
              var pr=ch.properties||{},tag=' ['+String(sv.uuid).slice(4,8)+'/'+String(ch.uuid).slice(4,8)+']';
              var wr=function(v){return BLE.write({deviceId:id,service:sv.uuid,characteristic:ch.uuid,value:hex(v)})};
              var wn=function(v){return BLE.writeWithoutResponse({deviceId:id,service:sv.uuid,characteristic:ch.uuid,value:hex(v)})};
              var fail=function(e){throw new Error(((e&&e.message)||String(e))+tag)};
              return{uuid:ch.uuid,properties:{write:!!pr.write,writeWithoutResponse:!!pr.writeWithoutResponse},
                writeValue:function(v){return wr(v).catch(function(e){return pr.writeWithoutResponse?wn(v).catch(fail):fail(e)})},
                writeValueWithoutResponse:function(v){return wn(v).catch(function(e){return pr.write?wr(v).catch(fail):fail(e)})}};
            })}
          }});
        }};
      },
      disconnect:function(){d._con=false;try{BLE.disconnect({deviceId:id})}catch(e){}}
    };
    return devs[id]=d;
  }
  setNav('bluetooth',{
    requestDevice:async function(o){
      await init();
      var r;try{r=await BLE.requestDevice({optionalServices:(o&&o.optionalServices||[]).map(function(u){return typeof u==='number'?('0000'+u.toString(16)).slice(-4).padStart(8,'0')+'-0000-1000-8000-00805f9b34fb':u})})}catch(err){var e2=new Error(err&&err.message||'Dibatalkan');e2.name='NotFoundError';throw e2}
      var x=r.device||r;
      if(!x||!x.deviceId){var e=new Error('Tidak ada printer dipilih');e.name='NotFoundError';throw e}
      return make(x.deviceId,x.name);
    },
    getDevices:async function(){
      var id='',nm='';try{id=localStorage.getItem('pos_bleid')||'';nm=localStorage.getItem('pos_blename')||''}catch(e){}
      return id?[make(id,nm)]:[];
    }
  });
})();

/* iOS: saat aplikasi pertama kali dibuka, minta izin fitur yang dipakai (kamera, lokasi, notifikasi, Bluetooth) satu per satu.
   Teks penjelasan izin ada di Info.plist (dibuat oleh workflow Build iOS). Hanya sekali; sisanya bisa diatur di Pengaturan iPhone. */
(function(){
  var C=window.Capacitor;
  if(!C||!C.getPlatform||C.getPlatform()!=='ios')return;
  var K='pos_perm_ios';try{if(localStorage.getItem(K))return}catch(e){}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
  function plug(n){try{return (C.Plugins&&C.Plugins[n])||(C.registerPlugin&&C.registerPlugin(n))||null}catch(e){return null}}
  (async function(){
    await sleep(1800);
    try{var s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});s.getTracks().forEach(function(t){t.stop()})}catch(e){}
    await sleep(500);
    try{await new Promise(function(res){navigator.geolocation.getCurrentPosition(res,res,{timeout:20000})})}catch(e){}
    await sleep(500);
    try{var LN=plug('LocalNotifications');if(LN)await LN.requestPermissions()}catch(e){}
    await sleep(500);
    try{var BLE=plug('BluetoothLe');if(BLE)await BLE.initialize()}catch(e){}
    try{localStorage.setItem(K,'1')}catch(e){}
  })();
})();

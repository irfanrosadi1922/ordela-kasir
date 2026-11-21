/* Ordela — SSO antar aplikasi (kasir / admin / dapur).
   Pusat identitas (IdP) = aplikasi penuh di alamat utama (POS_IDP). Aplikasi terbatas (POS_APP = kasir|admin|dapur) tidak punya layar login sendiri:
   bila belum punya sesi, ia mengirim pengguna ke IdP; IdP (setelah login) meminta kode sekali pakai ke server (60 detik, terikat ke aplikasi tujuan)
   dan mengembalikan pengguna ke aplikasi dengan kode di fragmen URL (#sso=...), yang kemudian ditukar menjadi sesi terbatas.
   Dimuat paling akhir, setelah auth.js. Tidak ada rahasia di sini. */
(function () {
  'use strict';
  var APP = window.POS_APP || '';
  var IDP = String(window.POS_IDP || 'https://app.ordela.my.id').replace(/\/+$/, '');
  var AUDS = { kasir: 'Kasir', admin: 'Admin', dapur: 'Dapur' };
  var ALLOW_RET = /^https:\/\/(kasir|admin|dapur)\.ordela\.my\.id(\/|$)/;
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function clean() { return location.origin + location.pathname; }
  function banner(t) {
    var b = document.getElementById('ssoB');
    if (!b) { b = document.createElement('div'); b.id = 'ssoB'; b.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:99999;background:#111;color:#fff;padding:10px 16px;border-radius:14px;font:600 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.25)'; document.body.appendChild(b); }
    b.textContent = t;
  }
  function retOk(u) {
    try { var x = new URL(u); if (ALLOW_RET.test(x.origin + '/')) return x.protocol === 'https:'; if (isLocal && /^(localhost|127\.0\.0\.1)$/.test(x.hostname)) return true; } catch (e) {}
    return false;
  }

  /* ---------- aplikasi terbatas ---------- */
  /* Mode default: tiap aplikasi punya layar login sendiri (login langsung, sesi hanya untuk aplikasi itu; hak tiap jabatan tetap berlaku).
     Mode SSO lewat pusat login hanya aktif bila config.js memasang window.POS_SSO = true. */
  if (APP && window.POS_SSO !== true) {
    var _f = window.fetch;
    window.fetch = function (input, o) {
      try {
        if (input === '/api/login' && o && typeof o.body === 'string') { var j = JSON.parse(o.body); j.aud = APP; o = Object.assign({}, o, { body: JSON.stringify(j) }); }
      } catch (e) {}
      return _f.call(this, input, o);
    };
    document.title = AUDS[APP] + ' · ' + document.title.replace(/^.*?·\s*/, '');
    return;
  }

  if (APP) {
    var toIdp = function (fresh) {
      var u = IDP + '/?sso=' + APP + '&return=' + encodeURIComponent(clean()) + (fresh ? '&fresh=1' : '');
      location.replace(u);
    };
    window.ssoToIdp = toIdp;
    var h = location.hash.match(/[#&]sso=([A-Za-z0-9]{20,100})/);
    if (h) {
      var code = h[1];
      try { history.replaceState(null, '', clean() + location.search); } catch (e) {}
      banner('Masuk ke ' + AUDS[APP] + '…');
      fetch('/api/sso/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code, aud: APP }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (r) {
          if (r.ok && r.j.token) { lsSet('pos_tok', r.j.token); location.replace(clean()); }
          else { banner((r.j && r.j.error) || 'Gagal masuk'); setTimeout(toIdp, 2500); }
        }).catch(function () { banner('Tidak dapat terhubung. Coba lagi.'); });
      return;
    }
    if (!lsGet('pos_tok')) { toIdp(); return; }
    /* login lokal tidak dipakai di aplikasi terbatas: arahkan ke IdP */
    var _sl = window.showLogin;
    window.showLogin = function (msg) { if (typeof msg === 'string' && /dinonaktifkan|tidak punya akses/i.test(msg)) return _sl.apply(this, arguments); toIdp(false); };
    var _cl = window.cloudLogout;
    window.cloudLogout = function (msg) {
      var t = lsGet('pos_tok'), forced = typeof msg === 'string' && msg;
      /* keluar manual = keluar dari semua aplikasi; sesi habis/dikeluarkan = cukup masuk ulang lewat IdP (mulus bila IdP masih punya sesi) */
      try { if (t) fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ all: !forced }) }); } catch (e) {}
      lsDel('pos_tok'); lsDel('pos_act'); toIdp(!forced);
    };
    document.title = AUDS[APP] + ' · ' + document.title.replace(/^.*?·\s*/, '');
    return;
  }

  /* ---------- pusat identitas (aplikasi penuh) ---------- */
  var q = new URLSearchParams(location.search), aud = q.get('sso'), ret = q.get('return') || '';
  /* keluar di salah satu aplikasi = keluar dari semua */
  var _cl2 = window.cloudLogout;
  if (typeof _cl2 === 'function') window.cloudLogout = function (msg) {
    if (!(typeof msg === 'string' && msg)) {   // hanya keluar manual yang menutup semua aplikasi
      try { var t = lsGet('pos_tok'); if (t) fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ all: true }) }); } catch (e) {}
    }
    return _cl2.apply(this, arguments);
  };
  if (q.get('fresh') === '1') {
    var tk = lsGet('pos_tok');
    var done = function () { lsDel('pos_tok'); lsDel('pos_act'); q.delete('fresh'); var s = q.toString(); location.replace(location.pathname + (s ? '?' + s : '')); };
    if (tk) fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ all: true }) }).then(done, done); else done();
    return;
  }
  if (!aud || !AUDS[aud]) return;
  if (!retOk(ret)) { banner('Alamat tujuan tidak diizinkan'); return; }
  var tries = 0, busy = false;
  banner('Masuk untuk membuka ' + AUDS[aud] + '…');
  var iv = setInterval(function () {
    if (++tries > 900) { clearInterval(iv); return; }   // ±6 menit
    if (busy || !(window.CL && CL.on && CL.me && CL.tok)) return;
    busy = true;
    fetch('/api/sso/issue', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CL.tok }, body: JSON.stringify({ aud: aud }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, s: r.status, j: j }; }); })
      .then(function (r) {
        if (r.ok && r.j.code) { clearInterval(iv); banner('Mengalihkan…'); location.replace(ret.split('#')[0] + '#sso=' + r.j.code); }
        else if (r.s === 403) { clearInterval(iv); banner((r.j && r.j.error) || 'Akun tidak punya akses ke aplikasi ini'); }
        else { busy = false; }
      }).catch(function () { busy = false; });
  }, 400);
})();

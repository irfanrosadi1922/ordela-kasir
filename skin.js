/* Ordela Skin — tampilan bersama semua aplikasi: pilihan warna (tanpa tema gelap), notifikasi Dynamic Island,
   dan (hanya di aplikasi kasir) tab bawah + menu bergrup per aplikasi. Dimuat oleh index.html dan order.html. */
(function () {
  'use strict';
  var H = document.documentElement;
  var PAL = [['biru', 'Biru', '#2f6bff', '#eaf1ff'], ['hijau', 'Hijau', '#16a34a', '#e9f7ee'], ['ungu', 'Ungu', '#7c3aed', '#f1ebff'], ['oranye', 'Oranye', '#f97316', '#fff1e5'], ['mawar', 'Mawar', '#e11d48', '#ffeaef'], ['teal', 'Teal', '#0d9488', '#e5f6f4'], ['slate', 'Abu Gelap', '#334155', '#eef1f5']];
  function getColor() { var c = 'biru'; try { c = localStorage.getItem('pos_color') || 'biru'; } catch (e) {} return PAL.some(function (p) { return p[0] === c; }) ? c : 'biru'; }
  function applyColor(c) {
    H.setAttribute('data-skin', '1'); H.setAttribute('data-theme', 'light'); H.setAttribute('data-color', c);
    var p = PAL.filter(function (x) { return x[0] === c; })[0] || PAL[0];
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', p[3]);
  }
  function setColor(c) {
    if (!PAL.some(function (p) { return p[0] === c; })) return;
    try { localStorage.setItem('pos_color', c); } catch (e) {}
    applyColor(c);
    if (typeof window.renderTheme === 'function') window.renderTheme();
    var tok = ''; try { tok = localStorage.getItem('pos_tok') || ''; } catch (e) {}
    if (tok) {
      fetch('/api/theme', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ color: c }), cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('save'); })
        .catch(function () { if (typeof window.toast === 'function') window.toast('Warna belum tersimpan ke akun. Coba lagi.', 'warn'); });
    }
  }
  function applyOwnerColor(c) {
    if (!PAL.some(function (p) { return p[0] === c; })) c = 'biru';
    try { localStorage.setItem('pos_color', c); } catch (e) {}
    applyColor(c);
    if (typeof window.renderTheme === 'function') window.renderTheme();
  }
  applyColor(getColor());
  /* tema lain (mis. dari kode lama) tidak boleh mengembalikan mode gelap atau warna status bar lama */
  try { new MutationObserver(function () { if (H.getAttribute('data-theme') !== 'light') H.setAttribute('data-theme', 'light'); }).observe(H, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) {}

  /* ======================= Dynamic Island ======================= */
  var ISV = {
    ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5h.01"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/></svg>',
    new: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/></svg>'
  };
  var isl, tHide = 0, tShow = 0, tOff = 0, act = null;
  function build() {
    if (isl || !document.body) return;
    isl = document.createElement('div'); isl.id = 'isl'; isl.setAttribute('role', 'status'); isl.setAttribute('aria-live', 'polite');
    isl.innerHTML = '<div class="isb"><div class="isc"><span class="isi"></span><div class="ist"><b></b><span></span></div><button class="isa" type="button" hidden></button></div></div>';
    document.body.appendChild(isl);
    isl.querySelector('.isb').addEventListener('click', function (e) {
      if (!isl.classList.contains('full')) return;
      var a = act; hide();
      if (a && a.fn && (e.target.closest('.isa') || a.tap)) { try { a.fn(); } catch (x) {} }
    });
  }
  function hide() {
    clearTimeout(tHide); clearTimeout(tShow); if (!isl) return;
    isl.classList.remove('full');
    clearTimeout(tOff); tOff = setTimeout(function () { isl.classList.remove('pill'); }, 420);
  }
  function island(o) {
    build(); if (!isl) return;
    o = o || {}; act = o.action || null;
    var k = o.kind || 'info';
    isl.setAttribute('data-k', k);
    isl.querySelector('.isi').innerHTML = ISV[k] || ISV.info;
    isl.querySelector('.ist b').textContent = o.title || '';
    var sp = isl.querySelector('.ist span'); sp.textContent = o.body || ''; sp.style.display = o.body ? '' : 'none';
    var ab = isl.querySelector('.isa'); ab.hidden = !(act && act.label); ab.textContent = act ? act.label || '' : '';
    var was = isl.classList.contains('full');
    clearTimeout(tHide); clearTimeout(tShow); clearTimeout(tOff);
    var il = isl.querySelector('.isc');
    isl.style.setProperty('--ih', Math.max(50, Math.min(il.scrollHeight, 110)) + 'px');
    var go = function () {
      isl.classList.add('full');
      if (was) { isl.classList.remove('bump'); void isl.offsetWidth; isl.classList.add('bump'); }
    };
    if (was) go(); else { isl.classList.add('pill'); tShow = setTimeout(go, 140); }
    tHide = setTimeout(hide, o.ms || (o.body ? 5200 : 2800) + 600);
    try { if (o.vibrate !== false && k === 'new' && navigator.vibrate) navigator.vibrate([40, 40, 40]); } catch (e) {}
  }
  var BAD = /gagal|error|salah|ditolak|tidak (bisa|dapat|ada|valid|boleh|punya)|tolak|dibatalkan|terlalu banyak|kedaluwarsa|kadaluarsa/i;
  var WARN = /isi |pilih |wajib|harus|kosong|habis|minimal|maksimal|belum|perlu|lengkapi|masukkan|periksa|cek /i;
  var OK = /berhasil|tersimpan|disimpan|sukses|terkirim|dihapus|selesai|siap|ditambah|dibuka|ditutup|dicetak|disalin|diperbarui|diubah|lunas|dibayar|aktif/i;
  function toastIsland(m) {
    m = String(m == null ? '' : m); var parts = m.split(' — '), title = parts[0], body = parts.slice(1).join(' — ');
    var kind = body && /pesanan|order/i.test(title) ? 'new' : BAD.test(m) ? 'bad' : WARN.test(m) ? 'warn' : OK.test(m) ? 'ok' : 'info';
    var action = null;
    if (kind === 'new' && typeof window.canView === 'function' && window.canView('co') && typeof window.go === 'function') action = { label: 'Lihat', tap: true, fn: function () { window.go('co'); } };
    island({ title: title, body: body, kind: kind, action: action, ms: kind === 'new' ? 7000 : 0 });
  }
  /* keyboard terbuka: tab bawah disembunyikan agar area kerja (mis. chat) tidak terhimpit */
  (function () {
    var t = 0;
    function typing() { var a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !/^(checkbox|radio|button|submit|file|range|color)$/.test(a.type || ''); }
    function upd() {
      /* kb hanya aktif saat kolom input benar-benar fokus; ukuran viewport saja (mis. saat rotasi) tidak boleh menyembunyikan tombol */
      H.classList.toggle('kb', typing());
    }
    function sched() { clearTimeout(t); t = setTimeout(upd, 60); }
    function rot() { H.classList.remove('kb'); sched(); setTimeout(upd, 350); setTimeout(upd, 900); }
    document.addEventListener('focusin', sched); document.addEventListener('focusout', sched);
    window.addEventListener('resize', sched); window.addEventListener('orientationchange', rot); window.addEventListener('pageshow', rot);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) rot(); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', sched);
  })();
  window.OrdelaSkin = { island: island, setColor: setColor, applyOwnerColor: applyOwnerColor, palette: PAL, color: getColor };
  /* semua toast() lama otomatis tampil sebagai Dynamic Island */
  function hook() {
    if (typeof window.toast === 'function' && !window.toast._isl) { var t = function (m) { toastIsland(m); }; t._isl = 1; window.toast = t; }
  }
  hook();

  /* ======================= bagian khusus aplikasi POS ======================= */
  function pos() {
    if (typeof window.go !== 'function' || !window.P2 || !P2.views) return;
    var APP = window.POS_APP || 'all';
    var $ = function (s) { return document.querySelector(s); };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var ICO = {
      home: '<path class="d" d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
      chart: '<rect class="d" x="3.5" y="12" width="4" height="8" rx="1.2"/><rect class="d" x="10" y="4" width="4" height="16" rx="1.2"/><rect class="d" x="16.5" y="9" width="4" height="11" rx="1.2"/>',
      mic: '<rect class="d" x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.5M3 12.5v3M21 12.5v3M9.5 16.5h5"/><circle cx="12" cy="3.5" r="1"/><circle cx="9.5" cy="12.5" r=".9" fill="currentColor"/><circle cx="14.5" cy="12.5" r=".9" fill="currentColor"/>',
      receipt: '<path class="d" d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
      bag: '<path class="d" d="M5 8h14l-1 12H6z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
      timer: '<circle class="d" cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 3h5M12 3v3"/>',
      wallet: '<rect class="d" x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.2" fill="currentColor"/>',
      idcard: '<rect class="d" x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.6 1.7-2.3 2.5-2.3s1.9.7 2.5 2.3M14 10h4M14 14h3"/>',
      tag: '<path class="d" d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3" fill="currentColor"/>',
      gift: '<rect class="d" x="3.5" y="9" width="17" height="11" rx="2"/><path d="M3.5 13h17M12 9v11"/><path d="M12 9C9 9 7.5 7.5 8 6s3-1 4 3c1-4 3.5-4.5 4-3s-1 3-4 3"/>',
      cal: '<rect class="d" x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
      box: '<path class="d" d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
      clip: '<rect class="d" x="5" y="4.5" width="14" height="17" rx="3"/><path d="M9 3h6v3H9z"/><path d="M9 14l2.2 2.2L15.5 12"/>',
      truck: '<path class="d" d="M2.5 7h11v9h-11z"/><path d="M13.5 10h4l3 3v3h-7"/><circle class="d" cx="7" cy="17.5" r="1.9"/><circle class="d" cx="17" cy="17.5" r="1.9"/>',
      usercheck: '<circle class="d" cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5 1 0 1.9.2 2.7.5"/><path d="M15 17.5l2 2 4-4"/>',
      users: '<circle class="d" cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.5-3.3 3-5 6-5s5.5 1.7 6 5"/><path d="M16 5.5a3 3 0 0 1 0 6M18.5 14.8c1.6.6 2.6 2 2.9 4.2"/>',
      cash: '<rect class="d" x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
      store: '<path class="d" d="M5 12v8h14v-8"/><path d="M3 9.5L4.5 4.5h15L21 9.5a2.8 2.8 0 0 1-5.5 0 2.8 2.8 0 0 1-5.5 0 2.8 2.8 0 0 1-5.5 0z"/><path d="M10 20v-4h4v4"/>',
      nodes: '<circle class="d" cx="6" cy="12" r="2.8"/><circle class="d" cx="18" cy="6" r="2.8"/><circle class="d" cx="18" cy="18" r="2.8"/><path d="M8.6 10.8l6.8-3.6M8.6 13.2l6.8 3.6"/>',
      dl: '<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5"/><path class="d" d="M4.5 19.5h15"/>',
      printer: '<rect class="d" x="3.5" y="9" width="17" height="8" rx="2.5"/><path d="M7 9V3.5h10V9M7 14h10v6.5H7z"/>',
      set: '<path d="M4 7h8M16 7h4M4 17h4M12 17h8"/><circle class="d" cx="14" cy="7" r="2.3"/><circle class="d" cx="10" cy="17" r="2.3"/>',
      spark: '<path class="d" d="M10 4l1.8 4.7L16.5 10.5l-4.7 1.8L10 17l-1.8-4.7L3.5 10.5l4.7-1.8z"/><path d="M18 3v4M16 5h4M18.5 14v3.5M16.8 15.8h3.4"/>',
      term: '<rect class="d" x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8h8M8 12h3M8 16h3M14.5 14h1.5M14.5 17h1.5"/>',
      table: '<rect class="d" x="3" y="9" width="18" height="5" rx="2"/><path d="M6 14v6M18 14v6M5 9V5M19 9V5"/>',
      cook: '<path class="d" d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.3 1 2 2 2 0-3-.5-5 1-8z"/>',
      apps: '<rect class="d" x="3.5" y="3.5" width="7" height="7" rx="2"/><rect class="d" x="13.5" y="3.5" width="7" height="7" rx="2"/><rect class="d" x="3.5" y="13.5" width="7" height="7" rx="2"/><rect class="d" x="13.5" y="13.5" width="7" height="7" rx="2"/>',
      tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
    };
    function ico(k) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + (ICO[k] || '') + '</svg>'; }
    function ok(v) { return typeof canView === 'function' ? canView(v) : true; }
    /* paket langganan: fitur di luar paket terkunci untuk owner (ajakan upgrade) dan disembunyikan untuk staf */
    function lockOf(v) { return typeof viewLock === 'function' && viewLock(v) ? (lockNeed(VIEW_LOCK[v]) || 'yang lebih tinggi') : null; }
    function isOwn() { return typeof isOwner === 'function' ? isOwner() : true; }
    function show(v) { return ok(v) && (isOwn() || !lockOf(v)); }
    function tierBadge(k) { var t = typeof tierOf === 'function' ? tierOf(k) : null; return t ? '<em class="tier t' + String(t).toLowerCase().replace(/[^a-z]/g, '') + '">' + t + '</em>' : ''; }
    var LOCKSVG = '<svg class="lksv" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>';

    /* tab bawah per aplikasi */
    var TABS = {
      kasir: [['pos', 'Kasir', 'term'], ['table', 'Meja', 'table'], ['co', 'Pesanan', 'bag'], ['riw', 'Riwayat', 'receipt'], ['menu', 'Menu', 'apps']],
      dapur: [['kds', 'Dapur', 'cook'], ['att', 'Absen', 'usercheck'], ['menu', 'Menu', 'apps']],
      admin: [['menu', 'Beranda', 'home'], ['home', 'Laporan', 'chart'], ['inv', 'Produk', 'box'], ['riw', 'Riwayat', 'receipt'], ['set', 'Pengaturan', 'set']],
      all: [['pos', 'Kasir', 'term'], ['table', 'Meja', 'table'], ['riw', 'Riwayat', 'receipt'], ['home', 'Laporan', 'chart'], ['menu', 'Menu', 'apps']]
    };
    function buildNav() {
      var n = $('#bnav'); if (!n) return;
      var vis = (TABS[APP] || TABS.all).filter(function (t) { return ok(t[0]); });
      if (!vis.some(function (t) { return t[0] === 'menu'; })) vis.push(['menu', 'Menu', 'apps']);
      n.innerHTML = vis.map(function (t) {
        return '<button data-v="' + t[0] + '" onclick="go(\'' + t[0] + '\')" aria-label="' + t[1] + '"><span class="bi">' + ico(t[2]) + '</span>' + t[1] + '</button>';
      }).join('');
      n.classList.add('none');
      var v = (typeof S !== 'undefined' && S.view) || 'menu';
      n.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
      lens(true);
    }
    /* lensa kaca: bergeser ke tab aktif; ditekan-tahan lalu digeser = lensa membesar dan mengikuti jari */
    var lensX = null, drag = null;
    function lensEl(n) {
      var l = n.querySelector(':scope > .lens');
      if (!l) {
        l = document.createElement('i'); l.className = 'lens';
        l.innerHTML = '<span class="lc"><span class="lm"></span></span>';
        n.insertBefore(l, n.firstChild);
      }
      return l;
    }
    function lens(instant) {
      var n = $('#bnav'); if (!n) return;
      var fresh = !n.querySelector(':scope > .lens'), l = lensEl(n);
      if (fresh) instant = true;
      if (drag) return;
      var b = n.querySelector(':scope > button.on');
      if (!b || !b.offsetWidth) { l.style.opacity = 0; return; }
      var w = b.offsetWidth, x = b.offsetLeft;
      l.style.opacity = 1;
      if (instant) { l.style.transition = 'none'; }
      l.style.width = w + 'px'; l.style.transform = 'translate3d(' + x + 'px,0,0)';
      if (instant) { void l.offsetWidth; l.style.transition = ''; }
      else if (lensX !== null && lensX !== x) { l.classList.remove('go'); void l.offsetWidth; l.classList.add('go'); }
      lensX = x;
    }
    /* isi lensa = salinan tab yang diperbesar (efek kaca pembesar) */
    function lensFill(n, l) {
      var lm = l.querySelector('.lm'), cs = getComputedStyle(n);
      lm.innerHTML = '';
      lm.style.cssText = 'width:' + n.clientWidth + 'px;height:' + n.clientHeight + 'px;display:flex;align-items:stretch;gap:' + cs.columnGap + ';padding:' + cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft;
      n.querySelectorAll(':scope > button').forEach(function (b) { var c = b.cloneNode(true); c.removeAttribute('onclick'); c.classList.remove('on', 'hot'); c.tabIndex = -1; lm.appendChild(c); });
    }
    function lensMove(n, l, cx) {
      var btns = n.querySelectorAll(':scope > button'); if (!btns.length) return null;
      var w = btns[0].offsetWidth + 26, nw = n.clientWidth, nh = n.clientHeight;
      var x = Math.max(2, Math.min(nw - w - 2, cx - w / 2));
      l.style.width = w + 'px'; l.style.transform = 'translate3d(' + x + 'px,0,0)';
      var lc = l.querySelector('.lc'), lm = l.querySelector('.lm');
      lc.style.transform = 'translate(' + (-x) + 'px,' + (-(-7)) + 'px)';
      lm.style.transformOrigin = (x + w / 2) + 'px ' + (nh / 2) + 'px';
      var hit = null;
      var best = 1e9;
      btns.forEach(function (b) { var d = Math.abs(cx - (b.offsetLeft + b.offsetWidth / 2)); if (d < best) { best = d; hit = b; } });
      return hit;
    }
    (function () {
      var n = $('#bnav'); if (!n) return;
      var sup = false;
      new MutationObserver(function (m) {
        if (drag) return;
        for (var i = 0; i < m.length; i++) { var t = m[i].target; if (t.tagName === 'BUTTON' && t.parentNode === n) { lens(false); return; } }
      }).observe(n, { attributes: true, subtree: true, attributeFilter: ['class'] });
      window.addEventListener('ordela:viewportchange', function () { lens(true); });
      window.addEventListener('resize', function () { lens(true); });
      function xOf(e) { return e.clientX - n.getBoundingClientRect().left; }
      n.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        if (drag) { clearTimeout(drag.t); drag = null; }
        sup = false;
        var l = lensEl(n); if (!n.querySelector(':scope > button')) return;
        drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: Date.now(), moved: false, hit: null, t: setTimeout(function () { abort(); }, 6000) };
        lensFill(n, l); l.classList.add('press'); n.classList.add('held');
        l.style.opacity = 1; l.style.transition = 'transform .28s cubic-bezier(.2,.9,.3,1),width .28s,opacity .2s,scale .4s cubic-bezier(.3,1.5,.5,1)';
        drag.hit = lensMove(n, l, xOf(e));
      });
      window.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var mdx = Math.abs(e.clientX - drag.x0), mdy = Math.abs(e.clientY - drag.y0);
        if (mdx > 6) drag.moved = true;
        if (Math.max(mdx, mdy) > 10) drag.far = true;   /* gerak jauh (termasuk vertikal) = bukan ketukan */
        var l = lensEl(n), h = lensMove(n, l, xOf(e));
        if (h !== drag.hit) { drag.hit = h; try { navigator.vibrate && navigator.vibrate(6); } catch (_) {} }
        if (drag.moved) { l.style.transition = 'width .22s,scale .4s cubic-bezier(.3,1.5,.5,1),opacity .2s'; if (e.cancelable) e.preventDefault(); }
      }, { passive: false, capture: true });
      function abort() { if (!drag) return; var l = lensEl(n); clearTimeout(drag.t); drag = null; l.classList.remove('press'); n.classList.remove('held'); l.style.transition = ''; lens(true); }
      function end(e, cancel) {
        if (!drag || (e && e.pointerId !== drag.id)) return;
        var d = drag, l = lensEl(n); clearTimeout(d.t); drag = null;
        l.classList.remove('press'); n.classList.remove('held'); l.style.transition = '';
        var rc = n.getBoundingClientRect(), out = e && (e.clientY < rc.top - 50 || e.clientY > rc.bottom + 50);   /* dilepas jauh di luar nav = batal */
        /* ketukan (jari tidak bergeser jauh) dan geseran sama-sama berpindah tab di sini; klik bawaan browser bisa hilang di iOS bila jari sedikit bergeser atau sentuhan dibatalkan */
        var tap = !d.moved && !d.far && (Date.now() - d.t0) < 700;
        var go = !out && d.hit && (cancel ? tap : (d.moved || tap));
        sup = false;
        if (go && !d.hit.classList.contains('on')) d.hit.click();
        lens(false);
        if (go) { sup = true; setTimeout(function () { sup = false; }, 350); }
      }
      /* dengarkan di window supaya jari/mouse yang lepas di luar nav, atau nav yang dibangun ulang saat digeser, tidak membuat status geser tersangkut */
      window.addEventListener('pointerup', function (e) { end(e, false); }, true);
      window.addEventListener('pointercancel', function (e) { end(e, true); }, true);
      window.addEventListener('blur', abort);
      document.addEventListener('visibilitychange', function () { if (document.hidden) abort(); });
      window.addEventListener('ordela:viewportchange', abort);
      n.addEventListener('lostpointercapture', function (e) { if (drag && e.pointerId === drag.id) end(e, false); });
      n.addEventListener('click', function (e) { if (sup) { e.stopPropagation(); e.preventDefault(); sup = false; } }, true);
      n.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    })();
    function setAvatar() {
      var b = $('#adav'); if (!b) return;
      var me = typeof CL !== 'undefined' && CL.on && CL.me, nm = (me && me.name) || 'A', ph = me && me.photo, key = (ph ? 'p' + ph.length + ph.slice(-24) : 'n' + nm);
      if (b.dataset.k === key) return; b.dataset.k = key;
      if (ph) { b.textContent = ''; var im = document.createElement('img'); im.alt = ''; im.src = ph; b.appendChild(im); b.classList.add('ph'); }
      else { b.classList.remove('ph'); b.textContent = String(nm).trim().charAt(0).toUpperCase() || 'A'; }
    }
    function buildAvatar() {
      var top = $('.top'); if (!top || $('#adav')) return;
      var b = document.createElement('button'); b.id = 'adav'; b.className = 'adav'; b.setAttribute('aria-label', 'Akun'); b.onclick = function () { accTap(); };
      top.appendChild(b); setAvatar();
    }

    /* menu bergrup (dipakai semua aplikasi; baris hanya muncul bila jabatan berhak dan aplikasinya mengizinkan) */
    var G = [
      ['Operasional', 'Kerja harian', [
        ['pos', 'Kasir', 'Transaksi & pembayaran', 'term', 'var(--ad)'],
        ['table', 'Meja', 'Denah & status meja', 'table', '#0ea5e9'],
        ['kds', 'Layar Dapur', 'Antrian pesanan dapur', 'cook', '#f97316'],
        ['co', 'Pesanan Online', 'Pesanan pelanggan & GoFood/Grab', 'bag', '#06b6d4'],
        ['shift', 'Shift Kasir', 'Buka-tutup kas per shift', 'timer', '#14b8a6']]],
      ['Penjualan', 'Omzet dan riwayat', [
        ['home', 'Beranda & Laporan', 'Omzet, grafik, ekspor Excel', 'chart', 'var(--ad)'],
        ['riw', 'Riwayat Pesanan', 'Semua transaksi & struk', 'receipt', '#8b5cf6'],
        ['exp', 'Pengeluaran', 'Catat biaya operasional', 'wallet', '#64748b']]],
      ['Pelanggan & Promosi', 'Bangun loyalitas', [
        ['mem', 'Member', 'Poin & data pelanggan', 'idcard', '#14b8a6'],
        ['promo', 'Promo', 'Diskon & voucher', 'tag', '#eab308'],
        ['gift', 'Kartu Hadiah', 'Saldo & penukaran', 'gift', '#ec4899'],
        ['rsv', 'Reservasi', 'Booking meja', 'cal', '#f59e0b']]],
      ['Produk & Stok', 'Menu dan persediaan', [
        ['inv', 'Inventori', 'Menu, harga, modal, stok', 'box', '#3b82f6'],
        ['opname', 'Stok Opname', 'Cocokkan stok fisik', 'clip', '#0d9488'],
        ['buy', 'Pembelian & Pemasok', 'Belanja bahan & utang', 'truck', '#6366f1']]],
      ['Tim', 'Staf dan jabatan', [
        ['att', 'Absensi', 'Jam masuk & pulang', 'usercheck', '#06b6d4'],
        ['usr', 'Pengguna', 'Akun & hak tiap jabatan', 'users', '#a855f7'],
        ['pyr', 'Payroll', 'Gaji & slip', 'cash', '#22c55e']]],
      ['Toko', 'Pengaturan dan koneksi', [
        ['branch', 'Cabang', 'Pindah stok antar cabang', 'store', '#d946ef'],
        ['integ', 'Integrasi', 'GoFood, GrabFood, ShopeeFood, webhook', 'nodes', '#0ea5e9'],
        ['voice', 'AI Cashier', 'Bahasa, suara balasan, nama panggilan', 'mic', '#e11d48'],
        ['invset', 'Invoice & pembayaran', 'Kolom bayar, catatan cepat, struk', 'receipt', '#8b5cf6'],
        ['prn', 'Printer', 'Struk & printer', 'printer', '#475569'],
        ['plan', 'Paket & langganan', 'Paket, kuota & tagihan', 'wallet', 'var(--ad)'],
        ['upd', 'Pembaruan aplikasi', 'Periksa & unduh versi terbaru', 'dl', 'var(--ad)'],
        ['set', 'Pengaturan', 'Toko, pajak, pembayaran, warna', 'set', 'var(--ad)']]]
    ];
    var CHEV = '<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
    function dayStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
    function sales(a, b) { return (db.orders || []).filter(function (o) { var t = new Date(o.t).getTime(); return t >= a && t < b; }); }
    function sum(l) { return l.reduce(function (s, o) { return s + (+o.total || 0); }, 0); }
    var LBL = { kasir: 'Kasir', dapur: 'Dapur', admin: 'Admin', all: 'Ordela' };
    var CTA = { kasir: ['pos', 'Mulai transaksi', 'term'], dapur: ['kds', 'Buka layar dapur', 'cook'], admin: ['home', 'Lihat laporan lengkap', 'chart'], all: ['pos', 'Mulai transaksi', 'term'] };

    function menu() {
      var el = $('#v-menu'); if (!el) return;
      try {
        var h = new Date().getHours(), g = h >= 4 && h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
        var nm = (typeof CL !== 'undefined' && CL.on && CL.me && CL.me.name) || 'Owner';
        var store = (db.set && db.set.store) || 'Ordela';
        var d0 = dayStart(Date.now()), D = 864e5;
        var today = sales(d0, d0 + D), tsum = sum(today), wk = sales(d0 - 7 * D, d0), avg = sum(wk) / 7;
        var pct = avg > 0 ? Math.min(1, tsum / avg) : (tsum > 0 ? 1 : 0);
        var C = 2 * Math.PI * 24, low = (db.items || []).filter(function (i) { return !i.ns && +i.stock <= +i.min; }).length;
        var nb = (typeof CO !== 'undefined' && CO.list) ? CO.list.filter(function (o) { return o.status === 'new'; }).length : 0;
        var canRep = ok('home');
        var cta = CTA[APP] || CTA.all; if (!ok(cta[0])) cta = ok('home') ? CTA.admin : null;
        var planNm = (typeof CL !== 'undefined' && CL.on && CL.me && CL.me.plan && CL.me.plan.name) || '';
        var hero = '<div class="adh">' + (planNm ? '<span class="adplan" title="Paket langganan ' + esc(planNm) + '">' + esc(planNm) + '</span>' : '<span class="adplan" title="Paket langganan">Starter</span>') + '<div class="adchips"><span class="adchip"><i>' + ico('spark') + '</i>' + (LBL[APP] || 'Ordela') + '</span><span class="adchip g">' + esc(store) + '</span></div>' +
          '<small>' + g + ', ' + esc(nm) + '</small><h2>' + (canRep ? esc(money(tsum)) : (LBL[APP] || 'Ringkasan')) + '</h2>' +
          '<p class="sub">' + (canRep ? 'Penjualan hari ini · ' + today.length + ' transaksi' : new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })) + '</p>' +
          (cta ? '<button class="adbtn" onclick="go(\'' + cta[0] + '\')">' + ico(cta[2]) + cta[1] + '</button>' : '') + '</div>';
        var stats = canRep ? '<div class="adst"><div class="adc"><h4>Target harian</h4><div class="adring"><svg viewBox="0 0 60 60"><circle class="tr" cx="30" cy="30" r="24"/><circle class="pg" cx="30" cy="30" r="24" stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><div><b>' + Math.round(pct * 100) + '%</b><span>dari rata-rata 7 hari</span></div></div></div>' +
          '<div class="adc w ' + (low ? '' : 'ok') + '"><h4>Stok</h4><div class="big"><i><i class="ic" data-ic="' + (low ? 'alert' : 'check') + '"></i></i>' + low + '</div><small>' + (low ? 'item menipis' : 'semua aman') + '</small></div></div>' : '';
        var secs = G.map(function (gr) {
          var rows = gr[2].filter(function (r) { return r[0] === 'upd' ? !!window.OrdelaUpdate : r[0] === 'voice' ? ((isOwn() || (typeof can === 'function' && can('set'))) && !!window.P2 && !!P2.voiceSet) : r[0] === 'invset' ? ((isOwn() || (typeof can === 'function' && can('set'))) && !!window.P2 && !!P2.invSet) : r[0] === 'plan' ? (isOwn() && typeof CL !== 'undefined' && CL.on && !!window.P2 && !!P2.plan) : show(r[0]); });
          if (!rows.length) return '';
          return '<div class="adgt"><h3>' + gr[0] + '</h3><span>' + gr[1] + '</span></div><div class="adl">' + rows.map(function (r) {
            var act = r[0] === 'branch' ? 'P2.branch()' : r[0] === 'voice' ? 'P2.voiceSet()' : r[0] === 'invset' ? 'P2.invSet()' : r[0] === 'plan' ? 'P2.plan()' : r[0] === 'upd' ? 'OrdelaUpdate.open()' : "go('" + r[0] + "')";
            var lk = lockOf(r[0]);
            return '<button class="adr' + (lk ? ' lkd' : '') + '" onclick="' + act + '"><span class="ti" style="--c:' + r[4] + '">' + ico(r[3]) + (r[0] === 'co' && nb ? '<b class="nb">' + nb + '</b>' : '') + '</span><span class="tx"><b>' + esc(r[1]) + tierBadge(VIEW_LOCK[r[0]] || '') + '</b><span>' + esc(lk ? 'Mulai paket ' + lk : r[2]) + '</span></span>' + (lk ? LOCKSVG : CHEV) + '</button>';
          }).join('') + '</div>';
        }).join('');
        var aiLk = lockOf('ai');
        var ai = show('ai') ? '<div class="adgt"><h3>Asisten</h3><span>Tanya data toko</span></div><div class="adl"><button class="adr' + (aiLk ? ' lkd' : '') + '" onclick="go(\'ai\')"><span class="ti" style="--c:#7c3aed">' + ico('spark') + '</span><span class="tx"><b>Asisten Ordela' + tierBadge('ai') + '</b><span>' + esc(aiLk ? 'Mulai paket ' + aiLk : 'Tanya omzet, menu terlaris, stok menipis') + '</span></span>' + (aiLk ? LOCKSVG : CHEV) + '</button></div>' : '';
        el.innerHTML = hero + stats + ai + secs;
      } catch (e) { /* biarkan tampilan lama bila data belum siap */ }
    }

    /* halaman Pengaturan → Warna (menggantikan pilihan tema terang/gelap) */
    window.renderTheme = function () {
      var el = $('#themeForm'); if (!el) return; var cur = getColor();
      el.innerHTML = '<h3>Warna aplikasi</h3><p class="pfhint" style="margin:0 0 12px">Pilih warna aksen. Tersimpan di akun pemilik dan berlaku untuk semua toko milik Anda.</p><div class="clg">' +
        PAL.map(function (p) { return '<button type="button" class="clo' + (p[0] === cur ? ' on' : '') + '" style="--c:' + p[2] + '" onclick="OrdelaSkin.setColor(\'' + p[0] + '\')" aria-pressed="' + (p[0] === cur) + '"><i>' + ico('tick') + '</i><b>' + p[1] + '</b></button>'; }).join('') + '</div>';
    };
    window.setTheme = function () {};

    function fixTop() {
      var a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'radio';
      var v = H.style.getPropertyValue('--vvTop');
      if (!typing && v && v !== '0px') H.style.setProperty('--vvTop', '0px');
    }
    P2.views.menu = menu;
    buildNav(); buildAvatar(); fixTop(); setInterval(fixTop, 400);
    var last = '';
    setInterval(function () {
      var k = (typeof CL !== 'undefined' && CL.me ? JSON.stringify(CL.me.perms || '') + CL.me.role : '') + (typeof CL !== 'undefined' && CL.on);
      if (k !== last) { last = k; buildNav(); setAvatar(); if (typeof S !== 'undefined' && S.view === 'menu' && typeof render === 'function') render(); }
      setAvatar();
    }, 600);
    /* pesanan baru dari coEvents: toast(...) sudah otomatis menjadi Dynamic Island (judul — isi) */
  }
  function start() { build(); hook(); pos(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  /* toast() dideklarasikan skrip utama; pasang ulang setelah semua skrip selesai dimuat */
  window.addEventListener('load', hook);
})();

/* AI Cashier Ordela: perintah suara tanpa AI/LLM.
   Pengenalan suara memakai SpeechRecognition bawaan peramban (bila ada); hasilnya dibaca parser aturan
   (Indonesia, Inggris, Melayu) lalu memakai fungsi keranjang & pembayaran yang sudah ada di Ordela.
   Bila peramban/WebView tidak mendukung, panel tetap bisa dipakai lewat kolom ketik (atau mikrofon keyboard). */
(function (root) {
  'use strict';

  /* ---------- kosakata ---------- */
  var UNITS = { nol: 0, sifar: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, lapan: 8, sembilan: 9,
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  var TEENS = { sepuluh: 10, sebelas: 11, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, seratus: 100 };
  var TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  var MULT = { belas: 1, puluh: 1, ratus: 1, hundred: 1 };
  var UNIT_WORDS = { porsi: 1, piring: 1, gelas: 1, cangkir: 1, mangkok: 1, bungkus: 1, buah: 1, biji: 1, pcs: 1, pc: 1, pieces: 1, piece: 1, portion: 1, portions: 1, plate: 1, plates: 1, glass: 1, glasses: 1, cup: 1, cups: 1, bowl: 1, bowls: 1, orang: 1, keping: 1, potong: 1, ekor: 1, botol: 1, bottle: 1, bottles: 1, pinggan: 1, cawan: 1, mangkuk: 1, unit: 1, units: 1, tusuk: 1, stick: 1, sticks: 1 };
  var FILLER = { tolong: 1, please: 1, dong: 1, ya: 1, yah: 1, yuk: 1, aja: 1, saja: 1, lah: 1, kak: 1, mas: 1, mbak: 1, bang: 1, kakak: 1, ke: 1, to: 1, the: 1, my: 1, saya: 1, aku: 1, i: 1, want: 1, would: 1, like: 1, can: 1, you: 1, could: 1, nak: 1, mahu: 1, tambahan: 1, lagi: 1, juga: 1, a: 1, an: 1, of: 1, some: 1, sebuah: 1, seporsi: 1, segelas: 1, sebiji: 1, keranjang: 1, cart: 1, troli: 1, bakul: 1, basket: 1, pesanan: 1, order: 1, dalam: 1, into: 1, in: 1, pada: 1, di: 1, buat: 1, untuk: 1, for: 1, yang: 1, itu: 1, ini: 1, this: 1, that: 1, satunya: 1, kan: 1, deh: 1, sih: 1, nih: 1, sama: 0, ada: 1, kayak: 1, seperti: 1, misalnya: 1, atau: 1 };
  /* sinonim token nama menu → bentuk baku (supaya "teh ais", "es teh", "iced tea" sama) */
  var SYN = { ais: 'es', ice: 'es', iced: 'es', cold: 'es', dingin: 'es', sejuk: 'es', tea: 'teh', tehh: 'teh', coffee: 'kopi', milk: 'susu', fried: 'goreng', rice: 'nasi', chicken: 'ayam', satay: 'sate', satey: 'sate', saté: 'sate', noodle: 'mie', noodles: 'mie', mee: 'mie', mi: 'mie', orange: 'jeruk', oren: 'jeruk', water: 'air', mineral: 'mineral', beef: 'sapi', lembu: 'sapi', daging: 'daging', egg: 'telur', telor: 'telur', fish: 'ikan', soup: 'sup', sop: 'sup', juice: 'jus', jush: 'jus', burger: 'burger', fries: 'kentang', potato: 'kentang', hot: 'panas', lemon: 'lemon', sweet: 'manis', black: 'hitam', green: 'hijau', pedas: 'pedas', spicy: 'pedas' };

  var V_ADD = ['tambah', 'tambahkan', 'tambahin', 'menambah', 'menambahkan', 'masukkan', 'masukan', 'masuk', 'pesan', 'pesankan', 'memesan', 'order', 'beli', 'mau', 'minta', 'ambil', 'add', 'put', 'give', 'get', 'bagi', 'beri', 'berikan', 'bawa'];
  var V_REDUCE = ['kurangi', 'kurangkan', 'kurang', 'minus', 'subtract', 'reduce', 'kurangin'];
  var V_REMOVE = ['hapus', 'hapuskan', 'menghapus', 'buang', 'buangkan', 'batal', 'batalkan', 'remove', 'delete', 'cancel', 'padam', 'padamkan', 'singkirkan', 'keluarkan', 'cabut', 'drop'];
  var V_SET = ['ubah', 'ubahlah', 'ubahkan', 'ganti', 'gantikan', 'jadikan', 'set', 'change', 'update', 'edit', 'tukar', 'tukarkan', 'revisi', 'sesuaikan'];
  var METHODS = [[/\b(tunai|cash|kontan|tunai)\b/, 'Tunai'], [/\b(kartu|kad|card|debit|kredit|credit)\b/, 'Kartu'], [/\b(qris|duitnow|duit now|qr)\b/, 'QRIS'], [/\b(e wallet|ewallet|dompet digital|dompet|ovo|gopay|dana|shopeepay|tng|touch n go)\b/, 'E-Wallet']];

  function has(list, w) { return list.indexOf(w) > -1; }

  /* ---------- nominal uang: "lima puluh ribu", "50k", "seratus ribu", "sepuluh ringgit lima puluh sen" ---------- */
  var MONEYW = { ribu: 1e3, rb: 1e3, k: 1e3, thousand: 1e3, juta: 1e6, jt: 1e6, million: 1e6 };
  var CUR_W = { ringgit: 1, rm: 1, rupiah: 1, rp: 1, dollar: 1, dollars: 1, bucks: 1, idr: 1, myr: 1, usd: 1 };
  function readMoney(t, i) {
    var total = 0, j = i, got = false, m;
    while (j < t.length) {
      var w = t[j];
      if (w === 'seribu') { total += 1000; j++; got = true; continue; }
      if (w === 'sejuta') { total += 1e6; j++; got = true; continue; }
      if ((m = /^(?:rm|rp)(\d+)$/.exec(w))) { total += +m[1]; j++; got = true; continue; }
      if ((m = /^(\d+)(k|rb|jt)$/.exec(w))) { total += +m[1] * (m[2] === 'jt' ? 1e6 : 1e3); j++; got = true; continue; }
      var r = readNum(t, j);
      if (!r) { if (got && CUR_W[w]) { j++; continue; } break; }
      var nx = t[j + r.len];
      if (nx in MONEYW) { total += r.n * MONEYW[nx]; j += r.len + 1; got = true; continue; }
      if (nx === 'sen' || nx === 'cent' || nx === 'cents') { total += r.n / 100; j += r.len + 1; got = true; continue; }
      total += r.n; j += r.len; got = true;
      if (CUR_W[t[j]]) j++;
    }
    return got ? { v: Math.round(total * 100) / 100, len: j - i } : null;
  }
  var PAYV = { bayar: 1, bayarkan: 1, membayar: 1, checkout: 1, pay: 1, lunas: 1, lunaskan: 1, settle: 1 };
  function parsePayClause(tk) {
    var s = tk.join(' '), amount = null;
    for (var i = 0; i < tk.length; i++) { var r = readMoney(tk, i); if (r) { amount = r.v; break; } }
    var method = detectMethod(s);
    if (!method && amount !== null) method = 'Tunai';
    return { method: method, amount: amount, exact: /\b(pas|exact|lunas|pass)\b/.test(s) };
  }
  function leftOk(w) { return w.length && (has(V_ADD, w[0]) || has(V_REMOVE, w[0]) || has(V_REDUCE, w[0]) || isNumTok(w[0])); }

  /* ---------- normalisasi ---------- */
  function deaccent(s) { try { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { return String(s); } }
  function clean(s) {
    s = deaccent(String(s == null ? '' : s).toLowerCase());
    s = s.replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2');          // 1.000 → 1000
    s = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
  }
  function toks(s) { s = clean(s); return s ? s.split(' ') : []; }

  /* ---------- angka (kata & digit) ---------- */
  function isNumTok(t) {
    return /^\d+$/.test(t) || /^\d+x$/.test(t) || /^x\d+$/.test(t) || t in UNITS || t in TEENS || t in TENS || t in MULT;
  }
  /* baca angka mulai indeks i; kembalikan {n, len} atau null */
  function readNum(t, i) {
    var x = t[i];
    if (x === undefined) return null;
    var m = /^(\d+)x$|^x(\d+)$/.exec(x);
    if (m) return { n: +(m[1] || m[2]), len: 1 };
    if (/^\d+$/.test(x)) return { n: +x, len: 1 };
    if (!(x in UNITS || x in TEENS || x in TENS || x in MULT)) return null;
    var acc = 0, u = 0, j = i, used = false;
    for (; j < t.length; j++) {
      var w = t[j];
      if (w === 'se' && t[j + 1] in MULT) { u = 1; used = true; continue; }
      if (w in TEENS) { if (u) break; acc += TEENS[w]; used = true; continue; }
      if (w in TENS) { if (u || acc % 100 >= 10) break; acc += TENS[w]; used = true; continue; }
      if (w in UNITS && w !== 'se') {
        var v = UNITS[w];
        if (u) break;
        if (acc > 0 && acc % 10 === 0 && acc % 100 !== 0 && !(j > i && t[j - 1] in MULT && t[j - 1] !== 'puluh')) { acc += v; used = true; continue; }
        if (acc > 0 && acc % 100 === 0) { u = v; used = true; continue; }
        u = v; used = true; continue;
      }
      if (w === 'belas') { if (!u && !acc) break; acc += 10 + u; u = 0; used = true; continue; }
      if (w === 'puluh') { acc += (u || 1) * 10; u = 0; used = true; continue; }
      if (w === 'ratus' || w === 'hundred') { acc += (u || 1) * 100; u = 0; used = true; continue; }
      break;
    }
    if (!used) return null;
    return { n: acc + u, len: j - i };
  }

  /* ---------- pencocokan nama menu ---------- */
  function normTok(w) { return SYN[w] || w; }
  var NT_CACHE = {}, NT_N = 0;
  function nameToks(s) {
    var k = String(s); if (NT_CACHE[k]) return NT_CACHE[k];
    var v = toks(s).map(normTok).filter(function (w) { return w && !FILLER[w]; });
    if (NT_N > 5000) { NT_CACHE = {}; NT_N = 0; } NT_CACHE[k] = v; NT_N++; return v;
  }
  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    var p = [], c = [], i, j;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) {
      c[0] = i;
      for (j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      var t = p; p = c; c = t;
    }
    return p[n];
  }
  /* kemiripan satu kata (0..1) */
  function tokSim(q, t) {
    if (q === t) return 1;
    var L = Math.max(q.length, t.length);
    if (q.length >= 3 && t.length >= 3 && (t.indexOf(q) === 0 || q.indexOf(t) === 0)) return 0.9;
    if (L < 4) return 0;
    var d = lev(q, t), lim = L <= 6 ? 1 : 2;
    return d <= lim ? 1 - d / (L + 1) : 0;
  }
  /* skor kecocokan kueri terhadap satu nama menu */
  function scoreName(Q, T) {
    if (!Q.length || !T.length) return 0;
    var qs = Q.slice().sort().join(' '), ts = T.slice().sort().join(' ');
    if (qs === ts) return 1;
    var used = {}, tot = 0, i, j;
    for (i = 0; i < Q.length; i++) {
      var best = 0, bj = -1;
      for (j = 0; j < T.length; j++) { if (used[j]) continue; var s = tokSim(Q[i], T[j]); if (s > best) { best = s; bj = j; } }
      if (bj > -1 && best > 0) { used[bj] = 1; tot += best; }
    }
    var qCover = tot / Q.length, tCover = tot / T.length;
    if (qCover >= 0.99) return 0.8 + 0.18 * tCover;            // semua kata kueri ada di nama menu
    if (tCover >= 0.99) return 0.7 * qCover + 0.2;              // nama menu penuh disebut, ada kata lebih
    return 0.65 * qCover * (0.5 + 0.5 * tCover);
  }
  /* kembalikan {item, score, alts[]} dari daftar item */
  function matchItem(phrase, items) {
    var Q = nameToks(phrase);
    if (!Q.length) return { item: null, score: 0, alts: [] };
    var sc = [];
    items.forEach(function (it) {
      var s = scoreName(Q, nameToks(it.name));
      if (s > 0) sc.push({ item: it, score: s });
    });
    sc.sort(function (a, b) { return b.score - a.score; });
    var top = sc[0];
    if (!top || top.score < 0.55) return { item: null, score: top ? top.score : 0, alts: sc.slice(0, 4).filter(function (x) { return x.score >= 0.4; }).map(function (x) { return x.item; }) };
    var close = sc.filter(function (x) { return x.item !== top.item && top.score - x.score < 0.08 && top.score < 1; });
    return { item: close.length ? null : top.item, score: top.score, alts: close.length ? [top.item].concat(close.slice(0, 3).map(function (x) { return x.item; })) : [] };
  }

  /* ---------- parser perintah ---------- */
  var SEPW = { dan: 1, lalu: 1, kemudian: 1, terus: 1, then: 1, and: 1, sama: 1, plus: 1, serta: 1, n: 1, also: 1, dengan: 1 };
  var SEP = /\s+(?:dan|sama|serta|lalu|kemudian|terus|plus|and|then|also|dengan|n)\s+|\s*,\s*/;

  function detectMethod(n) { for (var i = 0; i < METHODS.length; i++) if (METHODS[i][0].test(n)) return METHODS[i][1]; return null; }

  /* "dua nasi goreng tiga mie goreng" atau "nasi goreng 2 mie goreng 3" → beberapa segmen (tanpa kata sambung) */
  function splitQty(w) {
    var g = [], i = 0;
    while (i < w.length) {
      var r = readNum(w, i);
      if (r) { var e = i + r.len; if (UNIT_WORDS[w[e]]) e++; g.push({ s: i, e: e }); i = e; } else i++;
    }
    if (g.length < 2) return [w];
    var parts = [], k;
    if (g[0].s === 0) { for (k = 0; k < g.length; k++) parts.push(w.slice(g[k].s, k + 1 < g.length ? g[k + 1].s : w.length)); }
    else { var st = 0; g.forEach(function (x) { parts.push(w.slice(st, x.e)); st = x.e; }); if (st < w.length) parts.push(w.slice(st)); }
    return parts.filter(function (x) { return x.length; });
  }
  /* ubah satu segmen "[jumlah] nama [jumlah]" → {qty, explicit, name} */
  function parseSeg(words) {
    var t = words.filter(function (w) { return !FILLER[w] || w === 'a' && false; });
    var out = [], qty = null, i = 0, n;
    // jumlah di depan
    n = readNum(t, 0);
    if (n) { qty = n.n; i = n.len; if (UNIT_WORDS[t[i]]) i++; }
    var rest = t.slice(i);
    // jumlah di belakang ("nasi goreng dua", "nasi goreng 2 porsi")
    if (qty === null) {
      for (var k = rest.length - 1; k >= 1; k--) {
        var r = readNum(rest, k);
        if (r && k + r.len === rest.length || r && UNIT_WORDS[rest[k + r.len]] && k + r.len + 1 === rest.length) { qty = r.n; rest = rest.slice(0, k); break; }
      }
    }
    rest = rest.filter(function (w) { return !UNIT_WORDS[w] || rest.length === 1; });
    return { qty: qty === null ? 1 : qty, explicit: qty !== null, name: rest.join(' ') };
  }

  /* parse satu ucapan → {intent, ...} */
  function parse(text) {
    lload();
    var n = clean(text);
    if (!n) return { intent: 'empty' };
    var T = n.split(' ');

    // jawapan pilihan untuk nomor yang disebut tanpa konteks
    if (/^(meja|nomor meja|table)$/.test(n)) return { intent: 'tableMeja' };
    if (/^(pesanan|nomor pesanan|order)$/.test(n)) return { intent: 'tableOrder' };

    // jawaban konfirmasi
    if (/^(ya|iya|yes|yup|ok|oke|okay|betul|benar|boleh|setuju|confirm|konfirmasi|sure|ya betul|baik)$/.test(n)) return { intent: 'yes' };
    if (/^(tidak|nggak|gak|ga|no|nope|jangan|batal|tak|tidak jadi|ga jadi|cancel)$/.test(n)) return { intent: 'no' };

    // tutup panel
    if (/^(tutup|close|selesai bicara|stop|berhenti|keluar suara|tutup suara)$/.test(n)) return { intent: 'close' };

    // keranjang kosongkan
    if (/\b(kosongkan|bersihkan|clear|empty|reset|kosongkan)\b/.test(n) && /\b(keranjang|cart|pesanan|order|troli|bakul|semua|all|basket)\b/.test(n)) return { intent: 'clear' };
    if (/\b(hapus|buang|batalkan|remove|delete|padam|cancel)\b/.test(n) && /\b(semua|semuanya|all|everything|keseluruhan)\b/.test(n)) return { intent: 'clear' };

    // tampilkan keranjang
    if (/\b(tampilkan|tunjukkan|tunjuk|lihat|buka|show|view|open|papar|display|cek|periksa|check|baca)\b/.test(n) && /\b(keranjang|cart|pesanan|order|troli|bakul|basket|isi)\b/.test(n)) return { intent: 'cart' };
    if (/^(keranjang|cart|troli|bakul|basket|isi keranjang)$/.test(n)) return { intent: 'cart' };

    // total
    if (/\b(berapa|how much|total|jumlah bayar|jumlah semua|jumlah keseluruhan|tagihan|bill|amount due|grand total|harganya|harga semua|semua berapa|all together|altogether|berapa semuanya)\b/.test(n) && !startsWithVerb(T)) return { intent: 'total' };

    // catatan
    var mn = /^(?:tambah(?:kan)?\s+)?(?:catatan|catat|note|notes|nota)\s+(.+)$/.exec(n);
    if (mn) return { intent: 'note', text: mn[1] };

    // konfirmasi / uang pas (saat layar bayar sudah terbuka)
    if (/^(uang pas|pas|exact|exact amount|wang pas)$/.test(n)) return { intent: 'exact' };
    if (/^(konfirmasi pembayaran|konfirmasi bayar|proses|process|bayar sekarang|confirm payment|selesaikan pembayaran|sudah dibayar|done)$/.test(n)) return { intent: 'confirmpay' };
    // buka layar bayar saja
    if (/^(?:buka|open|tampilkan|show|ke)\s+(?:layar|halaman|menu)?\s*(?:pembayaran|bayar|payment|bayaran)\b/.test(n) || /^(pembayaran|payment|selesai|selesaikan|proses bayar|lanjut bayar|lanjutkan pembayaran)$/.test(n)) {
      var oc = parsePayClause(T); return { intent: 'pay', method: oc.method, amount: oc.amount, exact: oc.exact, direct: false };
    }
    // bayar: "bayar tunai lima puluh ribu", "tambah 2 nasi goreng bayar qris"
    var pv = -1;
    for (var pi = 0; pi < T.length; pi++) { if (PAYV[T[pi]]) { pv = pi; break; } }
    if (pv >= 0) {
      var pc = parsePayClause(T.slice(pv + 1)), left = T.slice(0, pv);
      while (left.length && (SEPW[left[left.length - 1]] || FILLER[left[left.length - 1]])) left.pop();
      var payI = { intent: 'pay', method: pc.method, amount: pc.amount, exact: pc.exact, direct: true };
      if (leftOk(left)) { var lp = parse(left.join(' ')); if (lp.intent === 'add' || lp.intent === 'remove' || lp.intent === 'reduce') return { intent: 'seq', parts: [lp, payI] }; }
      return payI;
    }
    // uang diterima: "uang diterima lima puluh ribu", "customer paid fifty"
    if (/\b(diterima|terima|menerima|received|tendered|paid|dibayar|dikasih|dikasi|kasih|memberi|gave|given|wang diterima)\b/.test(n)) {
      var tc = parsePayClause(T);
      if (tc.amount !== null) return { intent: 'tender', amount: tc.amount, method: tc.method || 'Tunai' };
    }

    // verba utama
    var verb = null, vi = 0;
    for (var i = 0; i < Math.min(T.length, 4); i++) {
      var w = T[i];
      if (has(V_SET, w)) { verb = 'set'; vi = i + 1; break; }
      if (has(V_REDUCE, w)) { verb = 'reduce'; vi = i + 1; break; }
      if (has(V_REMOVE, w)) { verb = 'remove'; vi = i + 1; break; }
      if (has(V_ADD, w)) { verb = 'add'; vi = i + 1; break; }
      if (!FILLER[w] && !(w in UNITS) && !/^\d+$/.test(w) && i === 0 && !has(V_ADD.concat(V_SET, V_REDUCE, V_REMOVE), w)) break;
    }
    var body = T.slice(vi).join(' ');

    if (verb === 'set') {
      // "ubah jumlah [menu] menjadi N" / "jadikan N" / "set [menu] to N"
      var s = body.replace(/\b(jumlah|kuantitas|kuantiti|quantity|qty|banyak|banyaknya|amount)\b/g, ' ').replace(/\b(menjadi|jadi|ke|kepada|to|into|become)\b/g, ' | ').replace(/\s+/g, ' ').trim();
      var parts = s.split('|').map(function (x) { return x.trim(); }).filter(Boolean);
      var numPart = null, namePart = '';
      parts.forEach(function (p) { var q = readNum(p.split(' '), 0); if (q && q.len === p.split(' ').length) numPart = q.n; else namePart += ' ' + p; });
      if (numPart === null) {                                  // "jadikan nasi goreng 4"
        var sg = parseSeg(s.split(' '));
        if (sg.explicit) { numPart = sg.qty; namePart = sg.name; }
      }
      if (numPart === null) return { intent: 'unknown', text: n };
      return { intent: 'set', qty: numPart, name: namePart.trim() };
    }

    var segs = body.split(SEP).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!segs.length && verb) return { intent: 'unknown', text: n };
    if (!verb) {                                                // tanpa kata kerja: "dua nasi goreng" = tambah
      segs = n.split(SEP).map(function (x) { return x.trim(); }).filter(Boolean);
      verb = 'add';
    }
    var lines = [];
    segs.forEach(function (sg) {
      var w0 = sg.split(' '), v = null;
      // segmen dengan kata kerja sendiri ("tambah 2 kopi dan hapus teh")
      if (has(V_REDUCE, w0[0])) v = 'reduce'; else if (has(V_REMOVE, w0[0])) v = 'remove'; else if (has(V_ADD, w0[0])) v = 'add';
      if (v) w0 = w0.slice(1);
      splitQty(w0.filter(function (x) { return !FILLER[x]; })).forEach(function (w) {
        var p = parseSeg(w);
        if (p.name) { if (v) p.v = v; lines.push(p); }
      });
    });
    if (!lines.length) return { intent: 'unknown', text: n };
    return { intent: verb, lines: lines };
  }
  function startsWithVerb(T) { var w = T[0]; return has(V_ADD, w) || has(V_REMOVE, w) || has(V_SET, w) || has(V_REDUCE, w); }

  /* ---------- pesan multi-bahasa ---------- */
  var MSG = {
    id: { listen: 'Mendengarkan…', proc: 'Memproses…', idle: 'Ketuk mikrofon, lalu bicara', nosr: 'Perangkat ini belum mendukung pengenalan suara. Ketik perintah di bawah, atau pakai mikrofon di keyboard.',
      added: 'Ditambah', removed: 'Dikurangi', removedAll: 'Dihapus', set: 'Jumlah diubah', notfound: 'Menu tidak ditemukan', ambiguous: 'Maksud Anda yang mana?', total: 'Total pesanan', empty: 'Keranjang kosong', cart: 'Keranjang dibuka',
      stock: 'Stok tidak cukup', nomatch: 'Perintah belum dipahami. Contoh: “tambah dua nasi goreng”', notInCart: 'Menu itu belum ada di keranjang', noLast: 'Sebut nama menu yang diubah', mods: 'Menu ini punya pilihan, lengkapi di layar',
      clearAsk: 'Kosongkan keranjang? Ucapkan “ya”.', payOff: 'Pembayaran lewat suara dinonaktifkan di pengaturan', confirmOff: 'Selesaikan pembayaran dengan tombol Bayar. Suara dinonaktifkan di pengaturan.', cleared: 'Keranjang dikosongkan', cancelled: 'Dibatalkan', pay: 'Pembayaran dibuka', payNeed: 'Keranjang masih kosong', confirmNo: 'Buka layar pembayaran dulu', exact: 'Uang pas diisi', noted: 'Catatan disimpan',
      denied: 'Izin mikrofon ditolak. Izinkan di pengaturan peramban.', nospeech: 'Tidak ada suara terdengar. Coba lagi.', neterr: 'Pengenalan suara perlu koneksi internet.', err: 'Pengenalan suara gagal. Coba lagi atau ketik perintah.', each: 'item', hint: 'Coba: “tambah dua nasi goreng”, “berapa total?”', speakOn: 'Suara balasan', typeHolder: 'Ketik perintah…', send: 'Kirim', close: 'Tutup', mic: 'Perintah suara', heard: 'Terdengar', unsold: 'Menu tidak dijual' },
    en: { listen: 'Listening…', proc: 'Processing…', idle: 'Tap the mic, then speak', nosr: 'Speech recognition is not supported on this device. Type a command below, or use the keyboard microphone.',
      added: 'Added', removed: 'Reduced', removedAll: 'Removed', set: 'Quantity changed', notfound: 'Item not found', ambiguous: 'Which one did you mean?', total: 'Order total', empty: 'Cart is empty', cart: 'Cart opened',
      stock: 'Not enough stock', nomatch: 'Command not understood. Example: “add two fried rice”', notInCart: 'That item is not in the cart', noLast: 'Say which item to change', mods: 'This item has options, finish on screen',
      clearAsk: 'Clear the cart? Say “yes”.', payOff: 'Voice payment is turned off in settings', confirmOff: 'Finish payment with the Pay button. Voice is turned off in settings.', cleared: 'Cart cleared', cancelled: 'Cancelled', pay: 'Payment opened', payNeed: 'The cart is empty', confirmNo: 'Open the payment screen first', exact: 'Exact amount filled', noted: 'Note saved',
      denied: 'Microphone permission denied. Allow it in browser settings.', nospeech: 'No speech heard. Try again.', neterr: 'Speech recognition needs an internet connection.', err: 'Speech recognition failed. Try again or type the command.', each: 'items', hint: 'Try: “add two fried rice”, “what is the total?”', speakOn: 'Spoken replies', typeHolder: 'Type a command…', send: 'Send', close: 'Close', mic: 'Voice command', heard: 'Heard', unsold: 'Item not for sale' },
    ms: { listen: 'Mendengar…', proc: 'Memproses…', idle: 'Ketik mikrofon, kemudian cakap', nosr: 'Peranti ini tidak menyokong pengecaman suara. Taip arahan di bawah, atau guna mikrofon papan kekunci.',
      added: 'Ditambah', removed: 'Dikurangkan', removedAll: 'Dipadam', set: 'Kuantiti diubah', notfound: 'Menu tidak dijumpai', ambiguous: 'Yang mana satu?', total: 'Jumlah pesanan', empty: 'Bakul kosong', cart: 'Bakul dibuka',
      stock: 'Stok tidak mencukupi', nomatch: 'Arahan tidak difahami. Contoh: “tambah dua nasi goreng”', notInCart: 'Menu itu belum ada dalam bakul', noLast: 'Sebut nama menu yang hendak diubah', mods: 'Menu ini ada pilihan, lengkapkan di skrin',
      clearAsk: 'Kosongkan bakul? Sebut “ya”.', payOff: 'Pembayaran melalui suara dimatikan dalam tetapan', confirmOff: 'Selesaikan pembayaran dengan butang Bayar. Suara dimatikan dalam tetapan.', cleared: 'Bakul dikosongkan', cancelled: 'Dibatalkan', pay: 'Pembayaran dibuka', payNeed: 'Bakul masih kosong', confirmNo: 'Buka skrin pembayaran dahulu', exact: 'Wang pas diisi', noted: 'Catatan disimpan',
      denied: 'Kebenaran mikrofon ditolak. Benarkan dalam tetapan pelayar.', nospeech: 'Tiada suara didengar. Cuba lagi.', neterr: 'Pengecaman suara memerlukan sambungan internet.', err: 'Pengecaman suara gagal. Cuba lagi atau taip arahan.', each: 'item', hint: 'Cuba: “tambah dua nasi goreng”, “berapa jumlah?”', speakOn: 'Suara balasan', typeHolder: 'Taip arahan…', send: 'Hantar', close: 'Tutup', mic: 'Arahan suara', heard: 'Didengar', unsold: 'Menu tidak dijual' }
  };
  var EXTRA = {
    id: { bigAsk: 'jumlah besar, ucapkan “ya” untuk menambah', short: 'Uang kurang', paid: 'Lunas', change: 'Kembalian', received: 'Diterima', wakeNeed: 'Sebut “Ordela” di awal kalimat untuk membayar', seqStop: 'Periksa pesanan dulu, belum dibayar', permNeed: 'Ketuk layar sekali untuk mengaktifkan mikrofon', ready: 'Ya, silakan', live: 'Selalu mendengarkan' },
    en: { bigAsk: 'large quantity, say “yes” to add', short: 'Not enough cash', paid: 'Paid', change: 'Change', received: 'Received', wakeNeed: 'Say “Ordela” first to pay', seqStop: 'Check the order first, not paid yet', permNeed: 'Tap the screen once to enable the microphone', ready: 'Yes, go ahead', live: 'Always listening' },
    ms: { bigAsk: 'kuantiti besar, sebut “ya” untuk tambah', short: 'Wang tidak cukup', paid: 'Selesai', change: 'Baki', received: 'Diterima', wakeNeed: 'Sebut “Ordela” dahulu untuk membayar', seqStop: 'Semak pesanan dahulu, belum dibayar', permNeed: 'Ketik skrin sekali untuk mengaktifkan mikrofon', ready: 'Ya, sila', live: 'Sentiasa mendengar' }
  };
  Object.keys(EXTRA).forEach(function (l) { Object.keys(EXTRA[l]).forEach(function (k) { MSG[l][k] = EXTRA[l][k]; }); });
  var BIGQTY = 50;
  var SRLANG = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

  var API = { readMoney: readMoney, parse: parse, matchItem: matchItem, readNum: readNum, clean: clean, nameToks: nameToks, scoreName: scoreName, MSG: MSG, SRLANG: SRLANG };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof window === 'undefined') return;

  /* =====================================================================
     Bagian peramban: UI + SpeechRecognition + integrasi keranjang Ordela
     ===================================================================== */
  var S0 = root;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var SRN = root.SpeechRecognition || root.webkitSpeechRecognition, SR = SRN;
  var st = { open: false, listening: false, rec: null, lang: 'id', speak: true, last: null, pending: null, busy: false, timer: 0, heard: '', hist: [] };
  try { st.speak = localStorage.getItem('ordela_vc_speak') !== '0'; } catch (e) { /* abaikan */ }
  function pickLang() { var l = null; try { l = localStorage.getItem('ordela_vc_lang'); } catch (e) { /* abaikan */ } if (l && MSG[l]) return l; var cl = cfg().lang; if (MSG[cl]) return cl; try { if (typeof lang === 'function' && MSG[lang()]) return lang(); } catch (e) { /* abaikan */ } return 'id'; }
  st.lang = pickLang();

  var LM = {
    id: { learned: 'Diingat', pttHint: 'Tahan, bicara, lepas', aiAsk: 'Menanyakan AI…', wakeMiss: 'Diabaikan, awali dengan', searchMenu: 'Cari menu…', vAdd: 'Tambah', vRemove: 'Hapus', vReduce: 'Kurangi' },
    en: { learned: 'Remembered', pttHint: 'Hold, speak, release', aiAsk: 'Asking AI…', wakeMiss: 'Ignored, start with', searchMenu: 'Search menu…', vAdd: 'Add', vRemove: 'Remove', vReduce: 'Reduce' },
    ms: { learned: 'Diingati', pttHint: 'Tahan, cakap, lepas', aiAsk: 'Bertanya AI…', wakeMiss: 'Diabaikan, mulakan dengan', searchMenu: 'Cari menu…', vAdd: 'Tambah', vRemove: 'Padam', vReduce: 'Kurangkan' }
  };
  Object.keys(LM).forEach(function (l) { Object.keys(LM[l]).forEach(function (k) { MSG[l][k] = LM[l][k]; }); });
  function cfg() { var c = (typeof db !== 'undefined' && db.set && db.set.vc) || {}; return { on: c.on !== 0 && c.on !== false, lang: c.lang || 'auto', speak: c.speak !== 0 && c.speak !== false, pay: c.pay !== 0 && c.pay !== false, confirm: c.confirm === 1 || c.confirm === true, al: Array.isArray(c.al) ? c.al : [], always: c.always === 1 || c.always === true, wake: c.wake !== 0 && c.wake !== false, wakeWord: String(c.wakeWord || 'ordela'), direct: c.direct !== 0 && c.direct !== false, learn: c.learn !== 0 && c.learn !== false, ai: c.ai !== 0 && c.ai !== false, stt: c.stt === 1 || c.stt === true, fab: c.fab !== 0 && c.fab !== false, chat: c.chat !== 0 && c.chat !== false, tts: c.tts !== 0 && c.tts !== false }; }
  function M(k) { return (MSG[st.lang] || MSG.id)[k] || MSG.id[k] || ''; }
  function money2(v) { return typeof money === 'function' ? money(v) : String(v); }
  function sellable() { return (typeof db !== 'undefined' && db.items ? db.items : []).filter(function (i) { return !i.ns; }); }
  function bidOf(k) { return typeof bid === 'function' ? bid(k) : String(k).split('@')[0]; }
  function linesOf(id) { return Object.keys(S.cart).filter(function (k) { return bidOf(k) === id; }); }
  function qtyOf(id) { return linesOf(id).reduce(function (a, k) { return a + (S.cart[k] || 0); }, 0); }

  /* ---------- aksi keranjang (memakai fungsi Ordela yang ada) ---------- */
  function pushHist(id, d) { if (!d) return; st.hist.push({ id: id, d: d }); if (st.hist.length > 40) st.hist.shift(); }
  function actAdd(it, qty) {
    var hasM = typeof hasMods === 'function' && hasMods(it);
    if (it.stock <= 0) return { ok: false, msg: it.name + ': ' + M('stock') };
    if (hasM) {                                              // menu berpilihan: buka form pilihan dengan jumlah terisi
      S.pop = { id: it.id, q: Math.max(1, qty), info: false, sel: {} };
      if (typeof popForm === 'function') popForm(false);
      return { ok: true, msg: it.name + ' · ' + M('mods'), warn: true };
    }
    var before = qtyOf(it.id);
    chg(it.id, qty);
    var got = qtyOf(it.id) - before;
    if (got <= 0) return { ok: false, msg: it.name + ': ' + M('stock') };
    st.last = it.id; pushHist(it.id, got);
    return { ok: true, msg: M('added') + ' ' + got + '× ' + it.name + (got < qty ? ' (' + M('stock').toLowerCase() + ')' : ''), warn: got < qty };
  }
  function actReduce(it, qty, all) {
    var ks = linesOf(it.id);
    if (!ks.length) return { ok: false, msg: it.name + ': ' + M('notInCart') };
    var have = qtyOf(it.id), left = all ? have : Math.min(qty, have), done = left;
    while (left > 0 && ks.length) {
      var k = ks[ks.length - 1], c = S.cart[k] || 0, d = Math.min(c, left);
      chg(k, -d); left -= d;
      if (!S.cart[k]) ks.pop();
    }
    st.last = qtyOf(it.id) > 0 ? it.id : null; pushHist(it.id, qtyOf(it.id) - have);
    return { ok: true, msg: (qtyOf(it.id) > 0 ? M('removed') + ' ' + done + '× ' : M('removedAll') + ' ') + it.name };
  }
  function actSet(it, qty) {
    var ks = linesOf(it.id);
    if (!ks.length) return qty > 0 ? actAdd(it, qty) : { ok: false, msg: it.name + ': ' + M('notInCart') };
    var k = ks[ks.length - 1], cur = S.cart[k] || 0;
    // jika ada beberapa varian, jumlah total dipusatkan di baris terakhir
    var others = ks.slice(0, -1).reduce(function (a, x) { return a + (S.cart[x] || 0); }, 0);
    var want = Math.max(0, qty - others);
    chg(k, want - cur);
    var now = qtyOf(it.id);
    st.last = now > 0 ? it.id : null; pushHist(it.id, now - (others + cur));
    return { ok: true, msg: M('set') + ': ' + it.name + ' × ' + now, warn: now !== qty };
  }

  /* ---------- belajar dari koreksi (per perangkat & per toko, tanpa AI) ---------- */
  var LS = null, LSK = '', LV = { add: V_ADD, remove: V_REMOVE, reduce: V_REDUCE };
  function lkey() {
    var s = ''; try { s = (typeof CL !== 'undefined' && CL.me && (CL.me.store_id || CL.me.sid)) || (typeof storeId !== 'undefined' && storeId) || ''; } catch (e) { /* abaikan */ }
    return 'ordela_vcl_' + s;
  }
  var LSrc = null, saveT = 0;
  function lnorm(d) { d = d && typeof d === 'object' ? d : {}; d.al = d.al || {}; d.use = d.use || {}; d.vw = d.vw || {}; d.miss = d.miss || {}; return d; }
  /* sumber utama: db.set.vcl (ikut tersinkron ke semua perangkat toko); cadangan: localStorage perangkat ini */
  function lload() {
    var k = lkey(), dbs = (typeof db !== 'undefined' && db.set) ? db.set : null;
    if (LS && LSK === k && (!dbs || LSrc === dbs.vcl)) return LS;
    LSK = k;
    if (dbs && dbs.vcl && typeof dbs.vcl === 'object') LS = lnorm(dbs.vcl);
    else { var d = null; try { d = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { d = null; } LS = lnorm(d); }
    LSrc = dbs ? (dbs.vcl && typeof dbs.vcl === 'object' ? dbs.vcl : null) : null;
    applyVerbs(); return LS;
  }
  function lsave() {
    try { localStorage.setItem(LSK, JSON.stringify(LS)); } catch (e) { /* abaikan */ }
    if (typeof db === 'undefined' || !db.set) return;
    var u = Object.keys(LS.use).sort(function (a, b) { return LS.use[b] - LS.use[a]; }).slice(200); u.forEach(function (x) { delete LS.use[x]; });
    db.set.vcl = LS; LSrc = LS;
    clearTimeout(saveT); saveT = setTimeout(function () { try { if (typeof save === 'function') save(); } catch (e) { /* abaikan */ } }, 3000);
  }
  function learnOn() { return !!cfg().learn; }
  function akey(ph) { return nameToks(ph).slice().sort().join(' '); }
  function applyVerbs() { Object.keys(LS.vw).forEach(function (w) { var a = LV[LS.vw[w]]; if (a && !has(a, w)) a.push(w); }); }
  function learnAlias(ph, id, amb) {
    if (!learnOn()) return; var L = lload(), k = akey(ph); if (!k) return;
    var e = L.al[k];
    if (e && e.id === id) { e.n++; e.t = Date.now(); if (!amb) e.amb = 0; } else L.al[k] = { id: id, n: 1, amb: amb ? 1 : 0, p: String(ph).slice(0, 60), t: Date.now() };
    delete L.miss[k];
    var ks = Object.keys(L.al); if (ks.length > 300) { ks.sort(function (a, b) { return L.al[a].t - L.al[b].t; }); delete L.al[ks[0]]; }
    lsave();
  }
  function noteUse(id) { if (!learnOn()) return; var L = lload(); L.use[id] = (L.use[id] || 0) + 1; lsave(); }
  function noteMiss(ph) {
    if (!learnOn()) return; var L = lload(), k = akey(ph); if (!k || L.al[k]) return;
    var e = L.miss[k] || { p: String(ph).slice(0, 60), n: 0 }; e.n++; e.t = Date.now(); L.miss[k] = e;
    var ks = Object.keys(L.miss); if (ks.length > 40) { ks.sort(function (a, b) { return L.miss[a].t - L.miss[b].t; }); delete L.miss[ks[0]]; }
    lsave();
  }
  function learnVerb(w, intent) { if (!learnOn() || !LV[intent] || !/^[a-z]{3,}$/.test(w)) return; var L = lload(); L.vw[w] = intent; applyVerbs(); lsave(); }
  function learnedItem(name, items) {
    if (!learnOn()) return null;
    var L = lload(), k = akey(name), e = L.al[k], Q = nameToks(name);
    if (!e || (e.amb && e.n < 2)) { e = null; var best = 0; Object.keys(L.al).forEach(function (kk) { var a = L.al[kk]; if (a.amb && a.n < 2) return; var s = scoreName(Q, kk.split(' ')); if (s >= 0.9 && s > best) { best = s; e = a; } }); }
    if (!e) return null;
    return items.filter(function (i) { return i.id === e.id; })[0] || null;
  }
  function popular(alts) {
    var L = lload(); if (!learnOn() || !alts || alts.length < 2) return null;
    var a = alts.slice().sort(function (x, y) { return (L.use[y.id] || 0) - (L.use[x.id] || 0); });
    var u1 = L.use[a[0].id] || 0, u2 = L.use[a[1].id] || 0;
    return u1 >= 3 && u1 >= 2 * u2 ? a[0] : null;
  }
  function topUsed(n) {
    var L = lload(); if (!learnOn()) return [];
    return sellable().filter(function (i) { return L.use[i.id]; }).sort(function (a, b) { return L.use[b.id] - L.use[a.id]; }).slice(0, n);
  }

  /* ---------- eksekusi hasil parse ---------- */
  function resolve(name) {
    var items = sellable(), key = clean(name), al = cfg().al;
    for (var ai = 0; ai < al.length; ai++) { if (al[ai] && clean(al[ai].a) === key) { var hit = items.filter(function (i) { return i.id === al[ai].id; })[0]; if (hit) return { item: hit, score: 1, alts: [] }; } }
    var li = learnedItem(name, items); if (li) return { item: li, score: 1, alts: [], learned: true };
    var r = matchItem(name, items);
    if (!r.item && r.alts.length > 1 && r.score >= 0.55) { var pp = popular(r.alts); if (pp) return { item: pp, score: r.score, alts: [], pop: true }; }
    if (!r.item && !r.alts.length) { var any = (db.items || []).filter(function (i) { return i.ns; }); var r2 = matchItem(name, any); if (r2.item) return { unsold: r2.item }; }
    return r;
  }
  /* gambar ulang UI sekali saja per kalimat, bukan sekali per item (menu ribuan tetap cepat) */
  function batched(fn) {
    var g = root.renderGrid, iv = root.renderInvoice, hg = 0, hi = 0;
    if (typeof g !== 'function' || typeof iv !== 'function') return fn();
    root.renderGrid = function () { hg = 1; }; root.renderInvoice = function () { hi = 1; };
    try { return fn(); }
    finally { root.renderGrid = g; root.renderInvoice = iv; if (hg) g(); if (hi) iv(); }
  }
  function run(p) { return batched(function () { return run0(p); }); }
  function run0(p) {
    var res = [], chips = null, show = null; st.unres = [];
    if (p.intent === 'empty') return { msg: M('hint') };
    if (p.intent === 'unknown') return { msg: M('nomatch'), warn: true, noop: true };
    if (st.pending && st.pending.kind === 'naturalPay' && ['yes', 'no', 'total', 'cart', 'tableMeja', 'tableOrder', 'close'].indexOf(p.intent) < 0) { st.pending = null; if ($('#payOk') && typeof closeModal === 'function') closeModal(); }   // pesanan berubah: konfirmasi lama batal
    if (p.intent === 'close') { setTimeout(closePanel, 50); return { msg: '' }; }
    if (p.intent === 'yes' || p.intent === 'no') {
      var pd = st.pending; st.pending = null;
      if (!pd) return { msg: M('nomatch'), warn: true, noop: true };
      if (p.intent === 'no') {
        if (pd.kind === 'naturalPay') { if ($('#payOk') && typeof closeModal === 'function') closeModal(); return { msg: 'Konfirmasi dibatalkan. Keranjang tetap tersimpan dan pembayaran belum diproses.' }; }
        return { msg: M('cancelled') };
      }
      if (pd.kind === 'naturalPay') {
        var payButton = $('#payOk');
        if (Date.now() - (pd.at || 0) > 120000) { if (payButton && typeof closeModal === 'function') closeModal(); return { msg: 'Konfirmasi kedaluwarsa. Ucapkan perintah bayar lagi.', warn: true }; }
        if (!payButton || payButton.disabled) { st.pending = pd; return { msg: 'Pembayaran belum valid. Periksa jumlah yang diterima di layar.', warn: true }; }
        if (st.paying) return { msg: '', noop: true };                                 // satu transaksi hanya diproses sekali
        st.paying = true; setTimeout(function () { st.paying = false; }, 3000);
        var n1 = db.orders.length, tt = payTotals();
        closePanel(); checkout();
        if (db.orders.length <= n1) { st.paying = false; return { msg: 'Transaksi gagal diproses. Periksa layar pembayaran.', warn: true }; }
        st.last = null; st.hist = [];
        var no1 = db.orders[0] && db.orders[0].no;
        return { msg: 'Transaksi berhasil' + (no1 ? ' · ' + no1 : '') + ' · ' + money2(tt.payable) + '. Struk dicetak sekali.', say: 'Transaksi berhasil', big: true, paid: true };
      }
      if (pd.kind === 'clear') { clearCart(); st.last = null; return { msg: M('cleared') }; }
      if (pd.kind === 'add') { var bi = find(pd.id); if (bi) { var ba = actAdd(bi, pd.qty); return { msg: ba.msg, warn: !ba.ok || ba.warn }; } }
      return { msg: M('cancelled') };
    }
    if (p.intent === 'tableMeja' || p.intent === 'tableOrder') {
      var td = st.pending;
      if (!td || td.kind !== 'tableClarify') return { msg: M('nomatch'), warn: true };
      st.pending = null;
      if (p.intent === 'tableMeja') td.natural.tableAmbiguous = false;
      else { td.natural.table = null; td.natural.tableAmbiguous = false; td.natural.orderNo = td.table; }
      return runNatural(td.natural);
    }
    if (p.intent === 'clear') {
      if (!Object.keys(S.cart).length) return { msg: M('empty') };
      st.pending = { kind: 'clear' };
      return { msg: M('clearAsk'), warn: true };
    }
    if (p.intent === 'cart') { if (typeof toggleInv === 'function') toggleInv(true); return { msg: Object.keys(S.cart).length ? M('cart') + ' · ' + cartCount() + ' ' + M('each') + ' · ' + money2(calc().total) : M('empty') }; }
    if (p.intent === 'total') {
      if (!Object.keys(S.cart).length) return { msg: M('empty') };
      var c = calc();
      return { msg: M('total') + ': ' + money2(c.total), say: M('total') + ' ' + spokenMoney(c.total), big: true };
    }
    if (p.intent === 'note') {
      S.note = ((S.note ? S.note + ', ' : '') + p.text).slice(0, 120); if (typeof noteUI === 'function') noteUI();
      var ni = $('#pNote'); if (ni) ni.value = S.note;
      return { msg: M('noted') + ': ' + S.note };
    }
    if (p.intent === 'seq') {
      var r1 = run(p.parts[0]);
      if (r1.warn || r1.chips) { r1.msg = (r1.msg ? r1.msg + '\n' : '') + M('seqStop'); r1.warn = true; return r1; }
      var r2 = run(p.parts[1]); r2.msg = (r1.msg ? r1.msg + '\n' : '') + (r2.msg || ''); return r2;
    }
    if ((p.intent === 'pay' || p.intent === 'exact' || p.intent === 'tender') && !cfg().pay) return { msg: M('payOff'), warn: true };
    if (p.intent === 'confirmpay' && !cfg().confirm) return { msg: M('confirmOff'), warn: true };
    if (p.intent === 'pay') {
      if (!Object.keys(S.cart).length) return { msg: M('payNeed'), warn: true };
      if (!$('#payOk')) { if (typeof closeModal === 'function' && $('#mw.on')) closeModal(); payForm(); }
      if (p.method && typeof setM === 'function' && $('#pM')) setM(p.method);
      if (p.amount != null && $('#pPaid')) { if (p.method && p.method !== 'Tunai') return { msg: 'Jumlah uang diterima hanya bisa diisi untuk pembayaran Tunai.', warn: true }; setM('Tunai'); quick(p.amount); }
      if ($('#payOk') && !$('#payOk').disabled) {
        st.pending = { kind: 'naturalPay', at: Date.now() };
        var paySum = payTotals().payable;
        return { msg: M('total') + ': ' + money2(paySum) + '. Ucapkan “Ya” untuk memproses pembayaran dan mencetak struk, atau “Tidak” untuk membatalkan.', big: true };
      }
      return { msg: M('pay') + (p.method ? ' · ' + p.method : '') + ' · ' + money2(calc().total) + '. Lengkapi jumlah pembayaran sebelum konfirmasi.' };
    }
    if (p.intent === 'tender') {
      if (!Object.keys(S.cart).length) return { msg: M('payNeed'), warn: true };
      if (!$('#payOk')) { if (typeof closeModal === 'function' && $('#mw.on')) closeModal(); payForm(); }
      setM(p.method || 'Tunai');
      var tt = payTotals(), chg = Math.round((p.amount - tt.payable) * 100) / 100;
      quick(p.amount);
      return chg >= 0 ? { msg: M('received') + ' ' + money2(p.amount) + ' · ' + M('change') + ' ' + money2(chg), say: M('received') + ' ' + spokenMoney(p.amount) + '. ' + M('change') + ' ' + spokenMoney(chg), big: true }
                      : { msg: M('short') + ': ' + money2(-chg), warn: true };
    }
    if (p.intent === 'exact') {
      if (!$('#payOk')) return { msg: M('confirmNo'), warn: true };
      if (typeof setM === 'function') setM('Tunai');
      if (typeof quick === 'function') quick(payTotals().payable);
      return { msg: M('exact') };
    }
    if (p.intent === 'confirmpay') {
      var ok = $('#payOk');
      if (!ok || ok.disabled) return { msg: M('confirmNo'), warn: true };
      closePanel(); ok.click();                                   // alur pembayaran Ordela yang sama dengan tombol
      return { msg: '' };
    }
    if (p.intent === 'set') {
      var it = null;
      if (p.name) { var r = resolve(p.name); if (r.unsold) return { msg: r.unsold.name + ': ' + M('unsold'), warn: true }; if (!r.item) { if (st.ctxMiss && !(r.alts && r.alts.length)) noteMiss(p.name); return ambiguous(r, p.name, p.qty, 'set'); } it = r.item; }
      else { var ids = []; Object.keys(S.cart).forEach(function (k) { var b = bidOf(k); if (ids.indexOf(b) < 0) ids.push(b); }); var id = st.last && qtyOf(st.last) > 0 ? st.last : (ids.length === 1 ? ids[0] : null); if (!id) return { msg: M('noLast'), warn: true }; it = find(id); }
      if (!it) return { msg: M('notfound'), warn: true };
      var a = actSet(it, p.qty); return { msg: a.msg, warn: !a.ok || a.warn };
    }
    // add / remove / reduce (boleh beberapa baris)
    var out = [], warn = false, hit = 0, allChips = [];
    for (var i = 0; i < p.lines.length; i++) {
      var ln = p.lines[i], lv = leadVerb(ln, p);
      if (lv) { allChips = allChips.concat(lv.chips); out.push(lv.msg); warn = true; continue; }
      var r = resolve(ln.name);
      if (r.unsold) { out.push(r.unsold.name + ': ' + M('unsold')); warn = true; continue; }
      if (!r.item) {
        if (r.alts && r.alts.length) { var amb = ambiguous(r, ln.name, ln.qty, ln.v || p.intent, ln.explicit); allChips = allChips.concat(amb.chips); out.push(amb.msg + ' “' + ln.name + '”'); warn = true; continue; }
        var vt = verbTeach(ln, p, p.lines[i + 1]);
        if (vt && vt.skip) i++;
        if (vt) { allChips = allChips.concat(vt.chips); out.push(vt.msg); warn = true; continue; }
        if (!(r.alts && r.alts.length)) st.unres.push({ name: ln.name, qty: ln.qty, intent: ln.v || p.intent, explicit: ln.explicit });
        if (st.ctxMiss) noteMiss(ln.name);
        var am2 = ambiguous(r, ln.name, ln.qty, ln.v || p.intent, ln.explicit);
        if (am2.chips) allChips = allChips.concat(am2.chips);
        out.push((am2.chips ? am2.msg + ' ' : M('notfound') + ': ') + '“' + ln.name + '”'); warn = true; continue;
      }
      var res2, vb = ln.v || p.intent;
      if (vb === 'add' && ln.qty > BIGQTY) { st.pending = { kind: 'add', id: r.item.id, qty: ln.qty }; out.push(ln.qty + '× ' + r.item.name + ' — ' + M('bigAsk')); warn = true; continue; }
      if (vb === 'add') { res2 = actAdd(r.item, ln.qty); if (res2.ok) noteUse(r.item.id); }
      else if (vb === 'reduce') res2 = actReduce(r.item, ln.qty, false);
      else res2 = actReduce(r.item, ln.qty, !ln.explicit);
      out.push(res2.msg); hit++; if (!res2.ok || res2.warn) warn = true;
    }
    return { msg: out.join('\n'), warn: warn, chips: allChips.length ? allChips.slice(0, 8) : null, noop: hit === 0 && !allChips.length };
  }
  /* bayar langsung: satu kalimat, tanpa menampilkan layar bayar (semua dalam satu tugas JS, tidak sempat tergambar) */
  function directPay(p) {
    if (st.paying) return { msg: '', noop: true };
    var m = p.method || 'Tunai', opened = !!$('#payOk');
    if (!opened) { if (typeof closeModal === 'function' && $('#mw.on')) closeModal(); payForm(); }
    if (!$('#payOk')) return { msg: M('err'), warn: true };
    setM(m);
    var t = payTotals(), paid = t.payable;
    if (m === 'Tunai' && !p.exact && p.amount != null) paid = p.amount;
    if (paid + 1e-9 < t.payable) { if (!opened) closeModal(); return { msg: M('short') + ': ' + money2(t.payable - paid), warn: true }; }
    var pi = $('#pPaid'); if (pi) pi.value = paid;
    payRefresh();
    var ok = $('#payOk');
    if (!ok || ok.disabled) { if (!opened) closeModal(); return { msg: M('err'), warn: true }; }
    st.paying = true; setTimeout(function () { st.paying = false; }, 1500);
    var n0 = db.orders.length;
    checkout();
    if (db.orders.length <= n0) { return { msg: M('err'), warn: true }; }
    var ch = Math.max(0, Math.round((paid - t.payable) * 100) / 100);
    st.last = null;
    setTimeout(function () { if (!st.listening) closePanel(); }, 2600);
    return { msg: M('paid') + ' · ' + m + ' · ' + money2(t.payable) + (m === 'Tunai' ? ' · ' + M('change') + ' ' + money2(ch) : ''),
      say: M('paid') + (m === 'Tunai' && ch > 0 ? '. ' + M('change') + ' ' + spokenMoney(ch) : ''), big: true, paid: true };
  }
  function ambiguous(r, name, qty, intent, explicit) {
    var alts = (r.alts || []).slice(0, 4), sug = !alts.length;
    if (sug) alts = topUsed(3);
    var base = { qty: qty, intent: intent, explicit: explicit, ph: name, amb: sug ? 0 : 1 };
    var chips = alts.map(function (it) { return { id: it.id, name: it.name, qty: qty, intent: intent, explicit: explicit, ph: name, amb: sug ? 0 : 1 }; });
    chips.push({ pick: 1, name: M('searchMenu'), qty: qty, intent: intent, explicit: explicit, ph: name, amb: 0 });
    return { msg: sug ? M('notfound') : M('ambiguous'), warn: true, chips: chips };
  }
  /* kata kerja tidak dikenal di depan kalimat ("tmbhin 2 kopi"): tawarkan untuk diajarkan */
  /* "tmbhn dua sate ayam": kata asing + angka + menu yang dikenal */
  function leadVerb(ln, p) {
    if (!learnOn() || ln.v || ln.explicit || p.intent !== 'add') return null;
    var w = clean(ln.name).split(' ');
    if (w.length < 3 || !/^[a-z]{3,}$/.test(w[0])) return null;
    var n = readNum(w, 1); if (!n || n.len >= w.length - 1) return null;
    var first = matchItem(w[0], sellable()); if (first.item || first.alts.length) return null;
    var r3 = resolve(w.slice(1 + n.len).join(' ')); if (!r3.item) return null;
    var mk = function (lab, t, x) { return { id: r3.item.id, name: lab, qty: n.n, intent: t, explicit: x, vw: w[0], plain: 1 }; };
    return { msg: '“' + w[0] + '” = ?  ' + n.n + '× ' + r3.item.name, chips: [mk(M('vAdd'), 'add', 0), mk(M('vRemove'), 'rm', 0), mk(M('vReduce'), 'rm', 1)] };
  }
  function verbTeach(ln, p, nx) {
    if (!learnOn() || ln.v || p.intent !== 'add') return null;
    var w = clean(ln.name).split(' '), word, rest, qty = ln.qty, skip = false;
    if (w.length >= 2) { word = w[0]; rest = w.slice(1).join(' '); }
    else if (w.length === 1 && ln.explicit && nx && !nx.explicit && !nx.v) { word = w[0]; rest = nx.name; skip = true; }   // "tmbhn dua sate ayam"
    else return null;
    if (!/^[a-z]{3,}$/.test(word)) return null;
    var r3 = resolve(rest); if (!r3.item) return null;
    var mk = function (lab, t, x) { return { id: r3.item.id, name: lab, qty: qty, intent: t, explicit: x, vw: word, plain: 1 }; };
    return { skip: skip, msg: '“' + word + '” = ?  ' + r3.item.name, chips: [mk(M('vAdd'), 'add', 0), mk(M('vRemove'), 'rm', 0), mk(M('vReduce'), 'rm', 1)] };
  }
  function cartCount() { return Object.keys(S.cart).reduce(function (a, k) { return a + (S.cart[k] || 0); }, 0); }
  function spokenMoney(v) { try { return new Intl.NumberFormat(SRLANG[st.lang] || 'id-ID', { maximumFractionDigits: 2 }).format(v) + (typeof curWord === 'function' && curWord() ? ' ' + curWord() : ''); } catch (e) { return String(v); } }

  /* ---------- UI ---------- */
  var ICON_MIC = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.5M3 12.5v3M21 12.5v3M9.5 16.5h5"/><circle class="bt-an" cx="12" cy="3.5" r="1"/><circle class="bt-ey" cx="9.5" cy="12.5" r=".9" fill="currentColor"/><circle class="bt-ey" cx="14.5" cy="12.5" r=".9" fill="currentColor"/></svg>';

  /* ---------- wajah robot: ekspresi mengikuti keadaan (mendengar, berpikir, bicara) dan emosi jawaban ---------- */
  var bot = { emo: 'idle', talk: '0', tmp: null, last: Date.now(), pokes: [], on: false };
  function botFace(cls) {
    return '<span class="bf ' + (cls || '') + '" data-emo="' + bot.emo + '" data-talk="' + bot.talk + '"><svg viewBox="0 0 100 70" aria-hidden="true">' +
      '<ellipse class="bf-sh" cx="50" cy="65" rx="34" ry="4"/><rect class="bf-bd" x="6" y="6" width="88" height="52" rx="26"/>' +
      '<g class="bf-ey"><ellipse class="bf-e bf-el" cx="36" cy="30" rx="4.6" ry="6.4"/><ellipse class="bf-e bf-er" cx="64" cy="30" rx="4.6" ry="6.4"/></g>' +
      '<g class="bf-ha"><path d="M30 33q6-10 12 0"/><path d="M58 33q6-10 12 0"/></g><g class="bf-sl"><path d="M30 31h12"/><path d="M58 31h12"/></g>' +
      '<g class="bf-mo"><rect class="m-dash" x="44" y="41" width="12" height="4" rx="2"/><rect class="m-o" x="42" y="39" width="16" height="11" rx="5"/>' +
      '<path class="m-smile" d="M40 40q10 10 20 0"/><path class="m-sad" d="M41 47q9-8 18 0"/><path class="m-wave" d="M40 44q5-5 10 0t10 0"/><path class="m-open" d="M38 38h24a12 11 0 0 1-24 0z"/></g></svg></span>';
  }
  function botBase() {
    if (st.listening) return 'listen';
    if (st.busy) return 'think';
    return Date.now() - bot.last > 60000 ? 'sleep' : 'idle';
  }
  function botTick() {
    if (root.document && document.hidden) return;
    var now = Date.now(), e;
    if (st.listening || st.busy || st.speaking) bot.last = now;
    if (bot.tmp && (now < bot.tmp.until || (bot.tmp.sticky && st.speaking))) e = bot.tmp.emo; else { bot.tmp = null; e = botBase(); }
    var tk = st.speaking ? '1' : '0';
    if (e === bot.emo && tk === bot.talk) return;
    bot.emo = e; bot.talk = tk;
    var els = document.querySelectorAll('.bf'); for (var i = 0; i < els.length; i++) { els[i].dataset.emo = e; els[i].dataset.talk = tk; }
  }
  function emote(emo, ms, sticky) { bot.tmp = { emo: emo, until: Date.now() + (ms || 1800), sticky: !!sticky }; bot.last = Date.now(); botTick(); }
  /* emosi dari isi kalimat (cadangan bila AI tidak memberi tag) */
  function emoOf(t) {
    t = String(t || '').toLowerCase();
    if (/\b(wk(wk)+|haha+|hehe+|hihi+|ngakak|lucu banget|kocak)\b/.test(t)) return 'laugh';
    if (/\b(hah\??|astaga|ya ampun|waduh|serius\??|kaget|wah\b|busyet|ya allah)\b|\?\!|\!\?/.test(t)) return 'surprise';
    if (/\b(maaf|sayang sekali|sedih|belum bisa|gagal|tidak bisa|ga bisa|nggak bisa)\b/.test(t)) return 'sad';
    if (/\b(bingung|kurang jelas|tidak paham|nggak paham|ga paham|ulangi|maksudnya|hmm+)\b/.test(t)) return 'confused';
    if (/\b(terima kasih|makasih|siap|oke|berhasil|selamat|senang|sama-sama|ditambah|sudah)\b|!/.test(t)) return 'happy';
    return null;
  }
  var EMOMAP = { senang: 'happy', kaget: 'surprise', bingung: 'confused', sedih: 'sad', tertawa: 'laugh', santai: null };
  function botReact(r) {
    if (r.emo) { emote(r.emo, 2600, true); return; }
    var e = emoOf(r.msg || r.say);
    if (r.chat) { if (e) emote(e, 3000, true); return; }
    if (r.warn) emote('confused', 2200);
    else if ((r.chips || []).length) emote('think', 2200);
    else if (r.msg && !st.busy) emote(e === 'laugh' || e === 'sad' ? e : 'happy', 1700);
  }
  function botStart() {
    if (bot.on) return; bot.on = true;
    setInterval(botTick, 200);
    var loop = function () {
      setTimeout(function () {
        var els = document.querySelectorAll('.bf');
        if (!document.hidden && bot.emo !== 'sleep' && bot.emo !== 'happy' && bot.emo !== 'laugh') {
          var side = Math.random() < .25 && bot.emo === 'idle' ? (Math.random() < .5 ? 'lk-l' : 'lk-r') : '';
          for (var i = 0; i < els.length; i++) { els[i].classList.add('blink'); if (side) els[i].classList.add(side); }
          setTimeout(function () { for (var j = 0; j < els.length; j++) els[j].classList.remove('blink'); }, 140);
          if (side) setTimeout(function () { for (var k = 0; k < els.length; k++) els[k].classList.remove('lk-l', 'lk-r'); }, 900);
        }
        loop();
      }, 2200 + Math.random() * 3600);
    };
    loop();
  }
  /* disentuh: kaget lalu senang; ditoel berkali-kali jadi tertawa */
  function botPoke() {
    var now = Date.now(); bot.pokes = bot.pokes.filter(function (t) { return now - t < 4000; }); bot.pokes.push(now);
    if (bot.pokes.length >= 3) { emote('laugh', 1800); return; }
    emote('surprise', 550); setTimeout(function () { if (!bot.tmp || bot.tmp.emo === 'surprise') emote('happy', 1300); }, 560);
  }
  function ensureUI() {
    if ($('#vcP')) return;
    var p = document.createElement('div'); p.id = 'vcP'; p.hidden = true;
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-live', 'polite');
    p.innerHTML = '<div class="vc-h"><span class="vc-ind" id="vcInd" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><b id="vcSt"></b><span class="vc-sp"></span>' +
      '<div class="vc-lg" id="vcLg" role="group"></div><button type="button" class="vc-b" id="vcKb" aria-label="Ketik perintah">⌨</button><button type="button" class="vc-b" id="vcSp2" aria-pressed="true" aria-label="Suara balasan">🔊</button><button type="button" class="vc-x" id="vcX" aria-label="Tutup">✕</button></div>' +
      '<div class="vc-stage" id="vcStage">' + botFace('bf-l') + '</div><div class="vc-bd"><div class="vc-tx" id="vcTx"></div><div class="vc-res" id="vcRes"></div><div class="vc-ch" id="vcCh"></div>' +
      '<form class="vc-f" id="vcF" autocomplete="off"><input class="fi" id="vcIn" enterkeyhint="send" autocapitalize="none" spellcheck="false"><button type="button" class="vc-go" id="vcMic2" aria-label="Mikrofon">' + ICON_MIC + '</button><button class="vc-send" type="submit" id="vcSend"></button></form>' +
      '<label class="vc-sw"><input type="checkbox" id="vcSpk"><span id="vcSpkL"></span></label></div>';
    document.body.appendChild(p);
    var tt = document.createElement('div'); tt.id = 'vcT'; tt.hidden = true; tt.setAttribute('role', 'status'); tt.setAttribute('aria-live', 'polite'); document.body.appendChild(tt);
    $('#vcX').onclick = closePanel; $('#vcStage').onclick = botPoke; botStart();
    p.addEventListener('click', function (e) { if (e.target === p && Date.now() - (st.openAt || 0) > 600) closePanel(); });   // ketuk di luar wajah = tutup
    $('#vcKb').onclick = function () { var pp = $('#vcP'); pp.classList.toggle('kb'); clearTimeout(bub.hide); if (pp.classList.contains('kb')) setTimeout(function () { try { $('#vcIn').focus(); } catch (e) { /* abaikan */ } }, 60); };
    $('#vcSp2').onclick = function () { var c = $('#vcSpk'); c.checked = !c.checked; c.onchange(); paint(); };
    $('#vcF').onsubmit = function (e) { e.preventDefault(); var v = $('#vcIn').value; $('#vcIn').value = ''; submit(v); };
    $('#vcMic2').onclick = toggleListen;
    $('#vcSpk').onchange = function () { st.speak = this.checked; try { localStorage.setItem('ordela_vc_speak', this.checked ? '1' : '0'); } catch (e) { /* abaikan */ } if (!this.checked) stopSay(); };
    $('#vcLg').onclick = function (e) { var b = e.target.closest('button[data-l]'); if (!b) return; st.lang = b.dataset.l; try { localStorage.setItem('ordela_vc_lang', st.lang); } catch (x) { /* abaikan */ } if (st.listening) stopListen(true); paint(); };
    $('#vcCh').onclick = function (e) {
      var b = e.target.closest('button[data-i],button[data-pk]'); if (!b) return;
      if (b.dataset.pk) { openPicker(b.dataset); return; }
      var it = find(b.dataset.i); if (!it) return;
      var q = +b.dataset.q || 1, a = b.dataset.t === 'add' ? actAdd(it, q) : b.dataset.t === 'set' ? actSet(it, q) : actReduce(it, q, b.dataset.x !== '1');
      var note = '';
      if (b.dataset.vw) { learnVerb(b.dataset.vw, b.dataset.t === 'add' ? 'add' : b.dataset.x === '1' ? 'reduce' : 'remove'); note = '\n' + M('learned') + ': “' + b.dataset.vw + '”'; }
      else if (b.dataset.ph && a.ok !== false && learnOn()) { learnAlias(b.dataset.ph, it.id, b.dataset.a === '1'); note = '\n' + M('learned') + ': “' + b.dataset.ph + '” = ' + it.name; }
      if (a.ok !== false && b.dataset.t === 'add') noteUse(it.id);
      $('#vcCh').innerHTML = ''; showResult({ msg: a.msg + note, warn: !a.ok || a.warn });
    };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.open) closePanel(); });
  }
  function injectMic() {
    var host = $('.pill.search'); if (!host || $('#vcMic')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'vcMic'; b.className = 'vc-mic'; b.innerHTML = ICON_MIC;
    b.setAttribute('aria-label', 'Perintah suara'); b.title = 'Perintah suara';
    b.onclick = function () { openPanel(true); };
    host.appendChild(b); applyCfg();
  }
  /* tombol suara melayang: tahan = bicara (lepas untuk selesai), ketuk = buka panel */
  function injectFab() {
    var host = $('#v-pos'); if (!host || $('#vcFab')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'vcFab'; b.className = 'vc-fab'; b.innerHTML = botFace('bf-s') + '<i class="vcw"></i>'; botStart();
    b.setAttribute('aria-label', 'Perintah suara (tahan untuk bicara)'); b.title = M('pttHint');
    try { localStorage.removeItem('ordela_vc_fab'); } catch (e) { /* abaikan */ }   // posisi tetap (fitur geser dihapus)
    var timer = 0, down = false, held = false;
    b.oncontextmenu = function (e) { e.preventDefault(); };
    b.ondragstart = function (e) { e.preventDefault(); };
    b.onpointerdown = function (e) {
      if (!cfg().on) return; down = true; held = false;
      try { b.setPointerCapture(e.pointerId); } catch (x) { /* abaikan */ }
      b.classList.add('press');
      timer = setTimeout(function () {
        if (!down) return; held = true; if (!SR) { openPanel(false); return; }
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (x) { /* abaikan */ }
        st.ptt = true; st.pttHeld = true; st.pttAcc = []; b.classList.add('hold'); toastMsg('🎙 ' + M('pttHint'), false); startListen();
      }, 300);
    };
    var end = function () {
      if (!down) return; down = false; clearTimeout(timer); b.classList.remove('hold'); b.classList.remove('press');
      if (held) { held = false; st.pttHeld = false; if (st.ptt) stopListen(false); } else if (st.open) closePanel(); else openPanel(true);
    };
    b.onpointerup = end;
    b.onpointercancel = function () { if (!down) return; if (held && st.ptt) { down = false; held = false; st.pttHeld = false; b.classList.remove('hold'); b.classList.remove('press'); stopListen(false); } else end(); };
    host.appendChild(b); applyCfg();
  }
  function paint() {
    var p = $('#vcP'); if (!p) return;
    var fb = $('#vcFab'); if (fb) fb.classList.toggle('rec', st.listening);
    botTick();
    p.classList.toggle('on', st.listening);
    var fab0 = $('#vcFab'); p.classList.toggle('nofab', !fab0 || fab0.hidden);
    var sp2 = $('#vcSp2'); if (sp2) { sp2.textContent = st.speak ? '🔊' : '🔇'; sp2.setAttribute('aria-pressed', st.speak ? 'true' : 'false'); }
    $('#vcSt').textContent = st.listening ? M('listen') : st.busy ? M('proc') : (SR ? M('idle') : M('nosr'));
    $('#vcIn').placeholder = M('typeHolder'); $('#vcSend').textContent = M('send');
    $('#vcSpkL').textContent = M('speakOn'); $('#vcSpk').checked = !!st.speak;
    $('#vcX').setAttribute('aria-label', M('close'));
    $('#vcMic2').hidden = !SR; $('#vcMic2').classList.toggle('rec', st.listening);
    $('#vcLg').innerHTML = ['id', 'en', 'ms'].map(function (l) { return '<button type="button" data-l="' + l + '" aria-pressed="' + (st.lang === l) + '">' + l.toUpperCase() + '</button>'; }).join('');
    var m = $('#vcMic'); if (m) { m.classList.toggle('rec', st.listening); m.setAttribute('aria-label', M('mic')); }
    if (!st.heard && !$('#vcRes').textContent) $('#vcRes').textContent = '';
  }
  function showResult(r) {
    if (!st.open && root.document && !st.listening) { if ((r.chips || []).length) openPanel(false); else if (r.msg) toastMsg(r.msg, !!r.warn); }
    try { botReact(r); } catch (e) { /* abaikan */ }
    bub.full = r.msg || ''; bub.on = 0; bub.tok++;
    var el = $('#vcRes'); el.textContent = r.msg || ''; el.classList.toggle('warn', !!r.warn); el.classList.toggle('big', !!r.big); popEl(el);
    var ch = $('#vcCh');
    ch.innerHTML = (r.chips || []).map(function (c) { return chipHtml(c); }).join('');
    if (r.msg && st.speak && cfg().speak && canSpeak() && !st.listening && !st.busy) say(r.say || r.msg.split('\n')[0]);   // pesan "menanyakan AI…" tidak dibacakan
    bubIdle();
  }
  function chipHtml(c) {
    var t = c.intent === 'add' ? 'add' : c.intent === 'set' ? 'set' : 'rm';
    if (c.pick) return '<button type="button" class="chip" data-pk="1" data-q="' + (c.qty || 1) + '" data-t="' + t + '" data-x="' + (c.explicit ? '1' : '0') + '" data-ph="' + esc(c.ph || '') + '">🔍 ' + esc(c.name) + '</button>';
    return '<button type="button" class="chip" data-i="' + esc(c.id) + '" data-q="' + (c.qty || 1) + '" data-t="' + t + '" data-x="' + (c.explicit ? '1' : '0') + '" data-ph="' + esc(c.plain ? '' : c.ph || '') + '" data-a="' + (c.amb ? '1' : '0') + '"' + (c.vw ? ' data-vw="' + esc(c.vw) + '"' : '') + '>' + (!c.vw && (c.qty || 1) > 1 ? esc(c.qty + '× ') : '') + esc(c.name) + '</button>';
  }
  function openPicker(ds) {
    var ch = $('#vcCh'); if (!ch) return;
    ch.innerHTML = '<input class="fi" id="vcPk" placeholder="' + esc(M('searchMenu')) + '" autocomplete="off" style="width:100%;margin-bottom:6px"><div id="vcPl"></div>';
    var fill = function () {
      var q = $('#vcPk').value, items = sellable(), list;
      if (q.trim()) { var Q = nameToks(q); list = items.map(function (i) { return { i: i, s: Math.max(scoreName(Q, nameToks(i.name)), clean(i.name).indexOf(clean(q)) > -1 ? 0.7 : 0) }; }).filter(function (x) { return x.s > 0.3; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.i; }); }
      else list = topUsed(8).concat(items).filter(function (i, k, a) { return a.indexOf(i) === k; });
      $('#vcPl').innerHTML = list.slice(0, 8).map(function (it) { return chipHtml({ id: it.id, name: it.name, qty: +ds.q || 1, intent: ds.t === 'add' ? 'add' : ds.t === 'set' ? 'set' : 'rm', explicit: ds.x === '1', ph: ds.ph, amb: 0 }); }).join('');
    };
    $('#vcPk').oninput = fill; fill(); $('#vcPk').focus();
  }
  /* suara balasan: pilih suara terbaik yang ada di perangkat (jaringan/neural/Google lebih natural), kalimat dipecah agar jeda terdengar wajar */
  var voiceCache = {};
  function pickVoice(lang) {
    var ss = root.speechSynthesis; if (!ss || !ss.getVoices) return null;
    var vs = ss.getVoices() || [], key = lang; if (voiceCache[key] && vs.length === voiceCache[key].n) return voiceCache[key].v;
    var pre = lang.slice(0, 2).toLowerCase(), best = null, bs = -1;
    vs.forEach(function (v) {
      var vl = String(v.lang || '').replace('_', '-').toLowerCase(); if (vl.slice(0, 2) !== pre) return;
      var sc = vl === lang.toLowerCase() ? 4 : 0, nm = String(v.name || '');
      if (/natural|neural|online|wavenet|premium|enhanced/i.test(nm)) sc += 6;
      if (/google/i.test(nm)) sc += 4;
      if (v.localService === false) sc += 2;
      if (/compact|espeak/i.test(nm)) sc -= 3;
      if (sc > bs || (sc === bs && best && String(v.name) < String(best.name))) { bs = sc; best = v; }
    });
    voiceCache[key] = { n: vs.length, v: best }; return best;
  }
  try { if (root.speechSynthesis) { root.speechSynthesis.getVoices(); if (root.speechSynthesis.addEventListener) root.speechSynthesis.addEventListener('voiceschanged', function () { voiceCache = {}; }); } } catch (e) { /* abaikan */ }
  function speakParts(t) {
    var txt = String(t).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ').replace(/[×·*_#`]/g, ' ').replace(/\s+/g, ' ').trim();
    var parts = txt.match(/[^.!?;\n]+[.!?;]*/g) || [txt], out = [], cur = '';
    parts.forEach(function (p) { p = p.trim(); if (!p) return; if ((cur + ' ' + p).length > 170 && cur) { out.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p; });
    if (cur) out.push(cur); return out;
  }
  /* ---------- gelembung bicara: teks tampil per kalimat, sinkron dengan suara ---------- */
  var bub = { sent: [], tok: 0, idx: -1, on: 0, full: '', hide: 0 };
  function popEl(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  function sentenceParts(t) {
    var txt = String(t).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ').replace(/[×·*_#`]/g, ' ').replace(/\s+/g, ' ').trim();
    var raw = txt.match(/[^.!?;\n]+[.!?;]*/g) || [txt], out = [];
    raw.forEach(function (p) {
      p = p.trim(); if (!p) return;
      while (p.length > 150) { var k = p.lastIndexOf(',', 140); if (k < 40) k = p.lastIndexOf(' ', 140); if (k < 20) k = 140; out.push(p.slice(0, k + 1).trim()); p = p.slice(k + 1).trim(); }
      if (p) { if (out.length && p.length < 14 && out[out.length - 1].length + p.length < 150) out[out.length - 1] += ' ' + p; else out.push(p); }
    });
    return out.length ? out : [txt];
  }
  function bubShow(s) {
    var p = $('#vcP');
    if (st.open && p && !p.hidden) { var el = $('#vcRes'); if (el) { el.textContent = s; el.classList.remove('warn', 'big'); popEl(el); } return; }
    var t = $('#vcT'); if (!t) return; t.textContent = s; t.classList.remove('warn'); t.hidden = false; popEl(t); clearTimeout(toastT); toastT = 0;
  }
  function bubStart(text) { bub.sent = sentenceParts(text); bub.tok++; bub.idx = -1; bub.on = 1; bubS(bub.tok, 0); return bub.tok; }
  function bubS(tk, i) { if (tk !== bub.tok || i === bub.idx || !bub.sent[i]) return; bub.idx = i; bubShow(bub.sent[i]); }
  function bubEnd(tk) {
    if (tk !== bub.tok || !bub.on) return; bub.on = 0;
    if (st.open) { var el = $('#vcRes'); if (el && bub.full) el.textContent = bub.full; }
    else { var t = $('#vcT'); if (t && !t.hidden) { if (bub.full) t.textContent = bub.full; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3500); } }
    bubIdle();
  }
  /* gelembung hilang sendiri bila tidak ada yang perlu dijawab */
  function bubIdle() {
    clearTimeout(bub.hide); var p = $('#vcP'); if (!p || p.hidden || !st.open) return;
    bub.hide = setTimeout(function () {
      var q = $('#vcP'); if (!q || q.hidden) return;
      if (st.speaking || st.listening || st.busy || st.pending || q.classList.contains('kb') || $('#vcCh').children.length || (document.activeElement && q.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) return;
      closePanel();
    }, Math.max(5000, 2500 + (bub.full || '').length * 55));
  }
  function sayLocal(t, opt) {
    try {
      var nb = opt && opt.nobub, ss = root.speechSynthesis, lang = SRLANG[st.lang] || 'id-ID', parts = nb ? speakParts(t) : sentenceParts(t); if (!ss || !parts.length) return false;
      var tk = nb ? 0 : bubStart(t); if (!nb) parts = bub.sent;
      var v = pickVoice(lang), total = parts.join(' ').length;
      bgStop(); st.speaking = true;
      var done = function () { st.speaking = false; bg.pausedUntil = Date.now() + 250; if (tk) bubEnd(tk); }, n = 0;
      ss.cancel();
      parts.forEach(function (p, i) {
        var u = new SpeechSynthesisUtterance(p); u.lang = v ? v.lang : lang; if (v) u.voice = v; u.rate = opt && opt.rate || 1; u.pitch = 1;
        u.onstart = function () { if (tk) bubS(tk, i); }; u.onend = function () { if (++n >= parts.length) done(); }; u.onerror = function () { n = parts.length; done(); };
        ss.speak(u);
      });
      setTimeout(function () { if (st.speaking) done(); }, Math.min(40000, 2500 + total * 85));
      return true;
    } catch (e) { st.speaking = false; return false; }
  }
  /* suara AI cloud (ElevenLabs lewat fungsi voice-tts): natural dan berekspresi. Bila belum diaktifkan/gagal -> suara bawaan perangkat */
  var tts = { bad: 0, cur: null, seq: 0, hist: [], why: '' };
  function ttsOk() { var C = root.POS_SB; return !!(cfg().tts && C && C.url && typeof CL !== 'undefined' && CL.on && CL.tok && Date.now() > tts.bad && root.navigator && navigator.onLine !== false && root.Audio); }
  function canSpeak() { return !!(root.speechSynthesis || ttsOk()); }
  function stopSay() {
    tts.seq++; if (tts.cur) { try { tts.cur.pause(); } catch (e) { /* abaikan */ } tts.cur = null; }
    try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) { /* abaikan */ }
    st.speaking = false;
  }
  function ttsText(t) { return String(t).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ').replace(/[×·*_#`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 450); }
  function ttsFetch(text) {
    var C = root.POS_SB;
    return fetch(C.url + '/functions/v1/voice-tts', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: C.key || '' }, body: JSON.stringify({ t: CL.tok, text: text, lang: st.lang === 'en' ? 'en' : 'id' }) }).then(function (r) {
      if (r.ok && /audio/.test(r.headers.get('content-type') || '')) return r.blob();
      return r.json().catch(function () { return {}; }).then(function (j) { throw { status: r.status, msg: String(j && j.error || '') }; });
    });
  }
  function ttsBadFor(e) { var s = e && e.status; tts.why = (e && e.msg) || 'tidak terjangkau'; tts.bad = Date.now() + (s === 501 ? 30 * 60000 : s === 429 ? 10 * 60000 : s === 401 || s === 402 || s === 404 || s === 502 ? 5 * 60000 : 60000); }
  /* iPhone/Safari: suara hanya boleh dibunyikan setelah ada sentuhan pengguna. Elemen audio dibuka (di-"unlock") pada sentuhan pertama lalu dipakai ulang untuk semua balasan. */
  function silentWav() {
    var n = 800, b = new Uint8Array(44 + n * 2), dv = new DataView(b.buffer), w = function (o, s) { for (var i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 16000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function unlockAudio() {
    if (st.speaking) return;
    try {
      if (!tts.unl && !tts.unlP && root.Audio) {
        if (!tts.el) { tts.el = new Audio(); try { tts.el.setAttribute('playsinline', ''); } catch (e) { /* abaikan */ } }
        tts.el.src = tts.sil || (tts.sil = silentWav()); tts.el.muted = false; tts.el.volume = 1;
        var p = tts.el.play(); if (p && p.then) { tts.unlP = 1; p.then(function () { tts.unl = 1; tts.unlP = 0; try { tts.el.pause(); } catch (e) { /* abaikan */ } }, function () { tts.unlP = 0; /* belum diizinkan: coba lagi di sentuhan berikutnya */ }); }
        else tts.unl = 1;
      }
      var ss = root.speechSynthesis;
      if (ss && !tts.ssu) { tts.ssu = 1; var u = new SpeechSynthesisUtterance(' '); u.volume = 0; ss.speak(u); }
    } catch (e) { /* abaikan */ }
  }
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) { try { document.addEventListener(ev, unlockAudio, { capture: true, passive: true }); } catch (e) { /* abaikan */ } });
  function playBlob(blob, token, fallback, tk) {
    var url = URL.createObjectURL(blob), a = tts.el || (tts.el = new Audio()); try { a.setAttribute('playsinline', ''); } catch (e) { /* abaikan */ } a.src = url; a.muted = false; a.volume = 1; tts.cur = a;
    var done = function () { try { URL.revokeObjectURL(url); } catch (e) { /* abaikan */ } a.ontimeupdate = null; if (token === tts.seq) { tts.cur = null; st.speaking = false; bg.pausedUntil = Date.now() + 250; if (tk) bubEnd(tk); } };
    a.ontimeupdate = tk ? function () { if (tk !== bub.tok || !a.duration) return; var f = a.currentTime / a.duration, len = bub.sent.join('').length || 1, cum = 0; for (var i = 0; i < bub.sent.length; i++) { cum += bub.sent[i].length / len; if (f <= cum + 0.0001) { bubS(tk, i); break; } } } : null;
    a.onended = done; a.onerror = function () { done(); if (token === tts.seq && fallback) fallback(); };
    var pr = a.play(); if (pr && pr.catch) pr.catch(function (err) { done(); if (!tts.warned && err && err.name === 'NotAllowedError') { tts.warned = 1; try { toastMsg('🔇 Suara diblokir oleh perangkat. Ketuk layar sekali lalu coba lagi', true); } catch (e) { /* abaikan */ } } if (token === tts.seq && fallback) fallback(); });
  }
  function say(t, opt) {
    var txt = ttsText(t); if (!txt) return false;
    var now = Date.now(); tts.hist = tts.hist.filter(function (x) { return now - x < 3600000; });
    if (!ttsOk() || tts.hist.length >= 60) return sayLocal(t, opt);
    tts.hist.push(now); stopSay(); var token = tts.seq; bgStop(); st.speaking = true; var tk = bubStart(txt);
    var tryCloud = function (again) {
      ttsFetch(txt).then(function (b) { if (token === tts.seq) playBlob(b, token, function () { sayLocal(t, opt); }, tk); }, function (e) {
        if (token !== tts.seq) return;
        var cs = e && e.status; if (again && (!cs || cs === 504 || cs === 429)) { setTimeout(function () { if (token === tts.seq) tryCloud(false); }, 700); return; }   // gangguan sesaat: coba sekali lagi agar suara tidak berganti
        ttsBadFor(e); st.speaking = false; sayLocal(t, opt);
      });
    };
    tryCloud(true);
    return true;
  }
  /* uji suara dari Pengaturan: melaporkan suara AI aktif, atau alasan jatuh ke suara perangkat */
  function speakTest() {
    var sample = 'Halo! Saya asisten kasir Ordela. Gimana, suaraku enak didengar, kan?'; unlockAudio();
    return new Promise(function (res) {
      var local = function (why) {
        var ss = root.speechSynthesis; if (!ss) { res({ ok: false, msg: (why ? why + '. ' : '') + 'Perangkat ini tidak punya mesin suara.' }); return; }
        var v = pickVoice(SRLANG[st.lang] || 'id-ID'), n = (ss.getVoices() || []).length;
        if (!n) { res({ ok: false, msg: (why ? why + '. ' : '') + 'Tidak ada mesin suara. Aktifkan “Speech Services by Google” di pengaturan HP.' }); return; }
        sayLocal(sample, { nobub: 1 }); res({ ok: !why, msg: (why ? why + '. ' : '') + 'Memakai suara perangkat' + (v ? ': ' + v.name : '') });
      };
      var C = root.POS_SB;
      if (!(cfg().tts && C && C.url && typeof CL !== 'undefined' && CL.on && CL.tok && root.Audio)) { local(cfg().tts ? 'Belum login' : 'Suara AI dimatikan'); return; }
      tts.bad = 0; stopSay(); var token = tts.seq;
      ttsFetch(sample).then(function (b) { playBlob(b, token, null); res({ ok: true, msg: 'Suara AI aktif' }); }, function (e) { ttsBadFor(e); local(e && e.status === 501 ? 'Suara AI belum diaktifkan di server' : (e && e.msg) || 'Suara AI tidak terjangkau'); });
    });
  }
  function applyCfg() {
    var on = cfg().on, fab = cfg().fab, m = $('#vcMic'); if (m) m.hidden = !on || fab;
    var f = $('#vcFab'); if (f) f.hidden = !on || !fab;
    if (!on && st.open) closePanel();
    if (!on) try { stopSay(); } catch (e) { /* abaikan */ }
  }
  function openPanel(autoListen) {
    if (!cfg().on) return;
    ensureUI();
    if (typeof S !== 'undefined' && S.view !== 'pos' && typeof go === 'function') { try { go('pos'); } catch (e) { /* abaikan */ } }
    var p = $('#vcP'); st.openAt = Date.now(); p.hidden = false; document.documentElement.classList.add('vc-open'); p.classList.remove('kb'); clearTimeout(bub.hide); st.open = true; $('#vcTx').textContent = ''; $('#vcRes').textContent = ''; $('#vcCh').innerHTML = '';
    var mm = $('#vcMic'); if (mm) mm.setAttribute('aria-expanded', 'true');
    paint();
    if (autoListen && SR) startListen(); else if (!SR) { p.classList.add('kb'); setTimeout(function () { try { $('#vcIn').focus(); } catch (e) { /* abaikan */ } }, 80); showResult({ msg: M('nosr') }); }
  }
  function closePanel() {
    stopListen(true); st.open = false; st.pending = null; clearTimeout(bub.hide);
    var p = $('#vcP'); document.documentElement.classList.remove('vc-open'); if (p) { p.hidden = true; p.classList.remove('kb'); }
    var mm = $('#vcMic'); if (mm) { mm.setAttribute('aria-expanded', 'false'); mm.classList.remove('rec'); }
    try { stopSay(); } catch (e) { /* abaikan */ }
  }
  function toggleListen() { if (st.listening) stopListen(false); else startListen(); }

  /* ---------- pengenalan suara ---------- */
  /* ---------- Mesin suara AI: rekam mikrofon + deteksi bicara (VAD) + transkripsi Whisper via voice-ai ----------
     Dipakai otomatis bila perangkat tidak punya SpeechRecognition (WebView APK), atau bila "Pengenalan suara AI" dinyalakan.
     Berperan sebagai pengganti SpeechRecognition (AiRec) sehingga tahan-bicara, ketuk, dan mode selalu mendengarkan tetap sama. */
  var Cap = { stream: null, ctx: null, node: null, src: null, sinks: [], opening: false, queue: [], rel: 0, fake: false };
  function capSupported() { return !!(root.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (root.AudioContext || root.webkitAudioContext)); }
  function useAi() { return !SRN || !!cfg().stt; }
  function newRec() { return (useAi() && capSupported()) ? new AiRec() : new SRN(); }
  function aiSttReady() { var C = root.POS_SB; return !!(cfg().ai && C && C.url && typeof CL !== 'undefined' && CL.on && CL.tok && root.navigator && navigator.onLine !== false); }
  function capAttach(sink, cb) {
    clearTimeout(Cap.rel);
    var add = function (x) { if (Cap.sinks.indexOf(x) < 0) Cap.sinks.push(x); };
    if (Cap.fake) { add(sink); return cb(null); }
    if (Cap.stream && Cap.ctx && Cap.ctx.state !== 'closed') { try { if (Cap.ctx.state === 'suspended') Cap.ctx.resume(); } catch (e) { /* abaikan */ } add(sink); return cb(null); }
    if (Cap.opening) { Cap.queue.push([sink, cb]); return; }
    Cap.opening = true;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      var AC = root.AudioContext || root.webkitAudioContext, ctx = new AC(), src = ctx.createMediaStreamSource(stream), node = ctx.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = function (e) { capFrame(e.inputBuffer.getChannelData(0), ctx.sampleRate); };
      src.connect(node); node.connect(ctx.destination);
      Cap.stream = stream; Cap.ctx = ctx; Cap.node = node; Cap.src = src; Cap.opening = false;
      try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) { /* abaikan */ }
      add(sink); cb(null);
      Cap.queue.splice(0).forEach(function (x) { add(x[0]); x[1](null); });
    }).catch(function (err) { Cap.opening = false; cb(err || new Error('mic')); Cap.queue.splice(0).forEach(function (x) { x[1](err); }); });
  }
  function capDetach(sink) { var i = Cap.sinks.indexOf(sink); if (i > -1) Cap.sinks.splice(i, 1); if (!Cap.sinks.length && !Cap.fake) { clearTimeout(Cap.rel); Cap.rel = setTimeout(capClose, 6000); } }
  function capClose() {
    if (Cap.sinks.length) return;
    try { if (Cap.node) { Cap.node.onaudioprocess = null; Cap.node.disconnect(); } if (Cap.src) Cap.src.disconnect(); if (Cap.stream) Cap.stream.getTracks().forEach(function (t) { t.stop(); }); if (Cap.ctx) Cap.ctx.close(); } catch (e) { /* abaikan */ }
    Cap.stream = Cap.ctx = Cap.node = Cap.src = null;
  }
  function capFrame(data, sr) {
    if (st.speaking) return;                                      // jangan merekam suara balasan Ordela sendiri
    var f = res16(data, sr); Cap.sinks.slice().forEach(function (s) { s(f); });
  }
  function res16(d, sr) {
    if (sr === 16000) return new Float32Array(d);
    var ratio = sr / 16000, n = Math.floor(d.length / ratio), o = new Float32Array(n);
    for (var i = 0; i < n; i++) { var a = Math.floor(i * ratio), b = Math.max(a + 1, Math.floor((i + 1) * ratio)), s = 0; for (var k = a; k < b && k < d.length; k++) s += d[k]; o[i] = s / (b - a); }
    return o;
  }
  function rmsOf(f) { var s = 0; for (var i = 0; i < f.length; i++) s += f[i] * f[i]; return Math.sqrt(s / (f.length || 1)); }
  function wavB64(f) {
    var n = f.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var x = Math.max(-1, Math.min(1, f[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    var u = new Uint8Array(buf), s = '';
    for (var j = 0; j < u.length; j += 0x8000) s += String.fromCharCode.apply(null, u.subarray(j, j + 0x8000));
    return btoa(s);
  }
  function sttMenu() { var out = [], seen = {}; topUsed(8).concat(sellable()).forEach(function (i) { if (i && !seen[i.id] && out.length < 12) { seen[i.id] = 1; out.push(i.name); } }); return out; }
  function cleanStt(t) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (t.length < 2 || /^(terima kasih( telah menonton| kerana menonton)?|thank you( for watching)?|thanks for watching|subtitles? by.*|amara\.org.*|you|bye|[.\s]+)[.!]*$/i.test(t)) return '';
    return t;
  }
  var sttHist = [];
  function aiTranscribe(pcm, lang, cb) {
    var now = Date.now(); sttHist = sttHist.filter(function (t) { return now - t < 3600000; });
    if (sttHist.length >= 100) return cb({ message: 'Batas pengenalan suara AI per jam hampir tercapai. Coba lagi nanti atau ketik perintah.', fatal: true });
    sttHist.push(now);
    var C = root.POS_SB, ctrl = root.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 16000);
    fetch(C.url + '/functions/v1/voice-ai', { method: 'POST', signal: ctrl ? ctrl.signal : undefined, headers: { 'Content-Type': 'application/json', apikey: C.key || '' },
      body: JSON.stringify({ t: CL.tok, mode: 'stt', audio: wavB64(pcm), lang: String(lang || 'id').slice(0, 2), menu: sttMenu() }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, s: r.status, j: j }; }); })
      .then(function (x) {
        clearTimeout(to);
        if (!x.ok) { var fatal = [401, 403, 429, 501, 404].indexOf(x.s) > -1; if (fatal) aiBad = Date.now() + (x.s === 429 ? 120000 : 600000); return cb({ message: (x.j && x.j.error) || 'Transkripsi gagal', fatal: fatal, status: x.s }); }
        cb(null, (x.j && x.j.text) || '');
      }).catch(function () { clearTimeout(to); cb({ message: M('neterr'), fatal: false }); });
  }
  /* pengganti SpeechRecognition */
  function AiRec() { this.lang = 'id-ID'; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this.manual = false; }
  AiRec.prototype.start = function () {
    var me = this; if (me._on) throw new Error('already started');
    me._on = true; me._ended = false; me._results = []; me._pending = 0; me._pre = []; me._preN = 0; me._seg = null; me._segMs = 0; me._speech = 0; me._sil = 0; me._voiced = 0; me._noise = 0.004; me._t0 = Date.now(); me._stopping = false; me._live = false;
    me._sink = function (f) { me._frame(f); };
    capAttach(me._sink, function (err) {
      if (!me._on) { capDetach(me._sink); return; }
      if (err) { me._end('not-allowed'); return; }
      if (!aiSttReady()) { me._end('ai-fatal', 'Pengenalan suara AI perlu login dan fitur AI aktif di paket toko.'); return; }
      me._live = true;
      setTimeout(function () { if (me._on) { if (me.onstart) me.onstart(); if (me.onaudiostart) me.onaudiostart(); } }, 0);
      if (me.manual) { me._seg = []; me._segMs = 0; }
      me._beat = setInterval(function () { if (me.onbeat) me.onbeat(); }, 15000);
    });
  };
  AiRec.prototype._frame = function (f) {
    if (!this._live || this._stopping) return;
    var rms = rmsOf(f), ms = f.length / 16;
    if (this.manual) { if (this._seg) { this._seg.push(f); this._segMs += ms; if (this._segMs >= 25000) this._cut(); } return; }
    var thr = Math.max(0.018, this._noise * 3);
    if (!this._seg) {
      this._pre.push(f); this._preN += ms; while (this._preN > 400 && this._pre.length > 1) this._preN -= this._pre.shift().length / 16;
      if (rms > thr) { this._speech += ms; if (this._speech >= 120) { this._seg = this._pre.splice(0); this._segMs = this._preN; this._preN = 0; this._sil = 0; this._voiced = this._speech; } }
      else { this._speech = 0; this._noise = this._noise * 0.97 + rms * 0.03; }
      if (!this.continuous && Date.now() - this._t0 > 8000) this._end('no-speech');
      return;
    }
    this._seg.push(f); this._segMs += ms;
    if (rms > Math.max(0.012, this._noise * 1.8)) { this._sil = 0; this._voiced += ms; } else this._sil += ms;
    if (this._sil >= 900 || this._segMs >= 12000) this._cut();
  };
  AiRec.prototype._cut = function () {
    var me = this, seg = me._seg, voiced = me._voiced, tot = 0, o = 0; me._seg = null; me._speech = 0; me._sil = 0;
    if (!seg) { if (me._stopping && !me._pending) me._end(me.manual ? 'no-speech' : ''); return; }
    seg.forEach(function (a) { tot += a.length; });
    if ((me.manual ? tot < 4000 : voiced < 300)) { if (me._stopping && !me._pending) me._end('no-speech'); return; }   // terlalu pendek: bukan ucapan
    var pcm = new Float32Array(tot); seg.forEach(function (a) { pcm.set(a, o); o += a.length; });
    me._pending++; if (!me.continuous) me._stopping = true;
    aiTranscribe(pcm, me.lang, function (err, text) {
      me._pending--; if (!me._on) return;
      if (err) { if (err.fatal || !me.continuous || me.manual) { me._end(err.fatal ? 'ai-fatal' : 'network', err.message, err.fatal); } else if (me.onerror) me.onerror({ error: 'network', message: err.message }); return; }
      text = cleanStt(text);
      if (text) { var r = [{ transcript: text }]; r.isFinal = true; var idx = me._results.length; me._results.push(r); if (me.onresult) me.onresult({ resultIndex: idx, results: me._results.slice() }); }
      if (me._stopping && !me._pending) me._end(text ? '' : 'no-speech');
    });
  };
  AiRec.prototype._end = function (code, msg, permanent) {
    var me = this; if (me._ended) return; me._ended = true; me._on = false; me._live = false;
    clearInterval(me._beat); capDetach(me._sink);
    setTimeout(function () { if (code && me.onerror) me.onerror({ error: code, message: msg, permanent: permanent }); if (me.onend) me.onend(); }, 0);
  };
  AiRec.prototype.stop = function () { var me = this; if (!me._on || me._stopping && !me._seg) return; me._stopping = true; if (me._seg) me._cut(); else if (!me._pending) me._end(''); };
  AiRec.prototype.abort = function () { var me = this; if (!me._on) return; me._seg = null; me._end(''); };
  if (!SRN && capSupported()) SR = AiRec;

  /* dikte untuk kolom teks (Asisten): satu ucapan -> teks. cb.text(t) saat ada hasil, cb.end(pesanErr) saat selesai */
  function canDictate() { return !!(SRN || capSupported()); }
  function dictate(cb) {
    if (!canDictate()) return null;
    var rec; try { rec = newRec(); } catch (e) { return null; }
    var done = false, err = '', got = '';
    rec.lang = SRLANG[st.lang] || 'id-ID'; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onresult = function (ev) { var t = ''; for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript + ' '; t = t.trim(); if (t) { got = t; cb.text(t); } };
    rec.onerror = function (ev) { var e = ev && ev.error; if (e === 'not-allowed' || e === 'service-not-allowed') err = 'Izin mikrofon ditolak'; else if (e === 'ai-fatal') err = (ev && ev.message) || 'Pengenalan suara AI tidak tersedia'; else if (e === 'network') err = 'Tidak ada koneksi'; else if (e === 'no-speech') err = got ? '' : 'Tidak ada suara terdengar'; };
    rec.onend = function () { if (done) return; done = true; cb.end(err); };
    try { rec.start(); } catch (e) { return null; }
    return { stop: function () { try { rec.stop(); } catch (e) { /* abaikan */ } } };
  }
  function startListen() {
    if (!SR) { showResult({ msg: M('nosr') }); return; }
    if (st.listening) return;
    bgStop(); bg.pausedUntil = Date.now() + 1200;
    try { stopSay(); } catch (e) { /* abaikan */ }
    var rec;
    try { rec = newRec(); } catch (e) { showResult({ msg: M('err'), warn: true }); return; }
    rec.manual = !!st.ptt;
    rec.lang = SRLANG[st.lang] || 'id-ID'; rec.continuous = !!st.ptt; rec.interimResults = true; rec.maxAlternatives = 3;
    var finalAlts = null, gotErr = false, acc = st.ptt ? (st.pttAcc = st.pttAcc || []) : [];
    rec.onstart = function () { st.listening = true; st.heard = ''; $('#vcTx').textContent = ''; paint(); };
    rec.onresult = function (ev) {
      var interim = '', fin = null;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var r = ev.results[i];
        if (r.isFinal) { fin = []; for (var j = 0; j < r.length; j++) fin.push(r[j].transcript); }
        else interim = r[0].transcript;
      }
      if (fin) { if (st.ptt) { acc[0] = mergeT(acc[0], fin[0]); finalAlts = [acc[0]]; } else finalAlts = fin; $('#vcTx').textContent = '“' + (st.ptt ? acc[0] : fin[0]) + '”'; }
      else $('#vcTx').textContent = '“' + (st.ptt ? mergeT(acc[0], interim) : interim) + '”';
      if (st.ptt && !st.open) toastMsg('🎙 ' + mergeT(acc[0], interim), false);
    };
    rec.onerror = function (ev) {
      gotErr = true; var e = ev && ev.error;
      if (st.ptt && st.pttHeld && (e === 'no-speech' || e === 'aborted')) { gotErr = false; return; }   // ditahan: jeda sunyi bukan galat
      st.listening = false; paint();
      if (e === 'not-allowed' || e === 'service-not-allowed') showResult({ msg: M('denied'), warn: true });
      else if (e === 'no-speech') showResult({ msg: M('nospeech'), warn: true });
      else if (e === 'network') showResult({ msg: M('neterr'), warn: true });
      else if (e === 'ai-fatal') showResult({ msg: (ev && ev.message) || M('err'), warn: true });
      else if (e !== 'aborted') showResult({ msg: M('err'), warn: true });
    };
    rec.onend = function () {
      if (st.ptt && st.pttHeld && !gotErr) {                         // peramban menghentikan sesi sendiri (jeda/batas waktu) padahal tombol masih ditahan: sambung lagi
        st.listening = false; st.rec = null; var keep = finalAlts; finalAlts = null; setTimeout(function () { if (st.ptt && st.pttHeld) startListen(); }, 60); return;
      }
      var wasPtt = st.ptt; st.ptt = false; st.pttHeld = false; if (wasPtt) bg.pausedUntil = Date.now() + 600;
      var ptAcc = st.pttAcc; st.pttAcc = null;
      st.listening = false; st.rec = null; paint();
      if (wasPtt && ptAcc && ptAcc[0]) finalAlts = [ptAcc[0]];
      if (finalAlts) { var alts = finalAlts; finalAlts = null; submit(alts); }
      else if (!gotErr && st.open && !$('#vcTx').textContent) showResult({ msg: M('nospeech'), warn: true });
    };
    st.rec = rec;
    try { rec.start(); } catch (e) { st.rec = null; showResult({ msg: M('err'), warn: true }); }
  }
  function stopListen(abort) {
    var r = st.rec; if (!r) { st.listening = false; return; }
    try { abort ? r.abort() : r.stop(); } catch (e) { /* abaikan */ }
  }

  /* terima teks (atau beberapa alternatif) → pilih interpretasi terbaik → jalankan */
  /* ---------- bantuan AI (opsional, hanya untuk frasa yang tidak dikenal parser) ---------- */
  var aiBad = 0;
  function aiCands(unres) {
    var items = sellable(), seen = {}, out = [];
    unres.forEach(function (u) {
      var Q = nameToks(u.name);
      items.map(function (i) { return { i: i, s: scoreName(Q, nameToks(i.name)) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 15).forEach(function (x) { if (!seen[x.i.id]) { seen[x.i.id] = 1; out.push(x.i); } });
    });
    topUsed(10).forEach(function (i) { if (!seen[i.id]) { seen[i.id] = 1; out.push(i); } });
    return out.slice(0, 50);
  }
  function aiOn() {
    var C = root.POS_SB; return !!(cfg().ai && C && C.url && typeof CL !== 'undefined' && CL.on && CL.tok && Date.now() > aiBad && root.navigator && navigator.onLine !== false);
  }
  /* ngobrol: ucapan yang bukan pesanan dijawab AI (teks saja, tanpa data pembayaran) dan dibacakan. Tidak mengubah data apa pun. */
  var chatHist = [];
  function chatOn() { return cfg().chat && aiOn() && !!(root.P2 && root.P2.voiceChat); }
  function chatWorthy(bp, out, text) { return !!(out && (out.warn || String(out.msg || '').indexOf(M('notfound')) === 0) && !looksLikeOrder(text) && (!bp || bp.intent === 'unknown' || bp.intent === 'empty' || out.msg === M('nomatch') || String(out.msg || '').indexOf(M('notfound')) === 0)); }
  function chatAsk(text, done) {
    var now = Date.now(); chatHist = chatHist.filter(function (t) { return now - t < 3600000; });
    if (chatHist.length >= 30) { done(null); return; }
    chatHist.push(now);
    var fin = false, to = setTimeout(function () { if (!fin) { fin = true; done(null); } }, 30000);
    Promise.resolve(root.P2.voiceChat(text)).then(function (a) { if (fin) return; fin = true; clearTimeout(to); var tx = a ? String(a) : '', m = /^\s*\[(senang|kaget|bingung|sedih|tertawa|santai)\]\s*/i.exec(tx); st.nextEmo = null; if (m) { tx = tx.slice(m[0].length); st.nextEmo = EMOMAP[m[1].toLowerCase()] || null; } done(tx ? tx.slice(0, 400) : null); }, function () { if (fin) return; fin = true; clearTimeout(to); done(null); });
  }
  /* kirim frasa yang gagal ke fungsi voice-ai; hasilnya hanya dipakai bila cocok persis dengan menu yang ada */
  function aiResolve(unres, done) {
    var C = root.POS_SB, cands = aiCands(unres), ctrl = root.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 9000);
    if (!cands.length) { clearTimeout(to); return done([]); }
    fetch(C.url + '/functions/v1/voice-ai', { method: 'POST', signal: ctrl ? ctrl.signal : undefined, headers: { 'Content-Type': 'application/json', apikey: C.key || '' },
      body: JSON.stringify({ t: CL.tok, phrases: unres.map(function (u) { return u.name; }), menu: cands.map(function (i) { return i.name; }) }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, s: r.status, j: j }; }); })
      .then(function (x) {
        clearTimeout(to);
        if (!x.ok) { if ([401, 403, 429, 501, 404].indexOf(x.s) > -1) aiBad = Date.now() + (x.s === 429 ? 120000 : 600000); return done([], x.j && x.j.error); }
        var map = (x.j && x.j.map) || [], res = [];
        unres.forEach(function (u, k) {
          var m = map.filter(function (z) { return clean(z.ph || '') === clean(u.name); })[0] || map[k];
          if (!m || !m.menu) return;
          var it = cands.filter(function (i) { return clean(i.name) === clean(m.menu); })[0];
          if (it) res.push({ u: u, it: it });
        });
        done(res);
      }).catch(function () { clearTimeout(to); aiBad = Date.now() + 60000; done([]); });
  }
  function aiApply(res) {
    var msgs = [];
    res.forEach(function (x) {
      var a = x.u.intent === 'add' ? actAdd(x.it, x.u.qty) : x.u.intent === 'set' ? actSet(x.it, x.u.qty) : actReduce(x.it, x.u.qty, !x.u.explicit);
      if (a.msg) msgs.push(a.msg);
      if (a.ok !== false) { learnAlias(x.u.name, x.it.id, false); if (x.u.intent === 'add') noteUse(x.it.id); }
    });
    return msgs;
  }
  /* ---------- penafsir ucapan AI: dipakai hanya bila aturan lokal tidak paham. Hanya teks pesanan yang dikirim, tidak pernah data pembayaran ---------- */
  var intHist = [];
  function looksLikeOrder(t) {
    var w = clean(t).split(' ').filter(Boolean); if (w.length < 2) return false;
    return w.some(function (x) { return isNumTok(x) || /\d/.test(x) || has(V_ADD, x) || has(V_REMOVE, x) || has(V_SET, x) || has(V_REDUCE, x) || !!N_NEG[x] || N_AFTER[x] || x === 'meja' || x === 'table'; });
  }
  function aiInterpret(text, done) {
    var C = root.POS_SB, now = Date.now(); intHist = intHist.filter(function (t) { return now - t < 3600000; });
    if (intHist.length >= 40 || !aiOn()) return done(null);
    intHist.push(now);
    var items = sellable(), seen = {}, menu = [], Q = nameToks(text);
    items.map(function (i) { return { i: i, s: scoreName(Q, nameToks(i.name)) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 30).forEach(function (x) { if (!seen[x.i.id]) { seen[x.i.id] = x.i; menu.push(x.i); } });
    topUsed(10).forEach(function (i) { if (!seen[i.id] && menu.length < 40) { seen[i.id] = i; menu.push(i); } });
    var types = []; var ts = typeof $ === 'function' ? $('#otype') : null; if (ts) Array.prototype.forEach.call(ts.options, function (o) { if (o.value) types.push(o.value); });
    var ctrl = root.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 10000);
    fetch(C.url + '/functions/v1/voice-ai', { method: 'POST', signal: ctrl ? ctrl.signal : undefined, headers: { 'Content-Type': 'application/json', apikey: C.key || '' },
      body: JSON.stringify({ t: CL.tok, mode: 'interpret', text: String(text).slice(0, 300), menu: menu.map(function (i) { return i.name; }), types: types }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, s: r.status, j: j }; }); })
      .then(function (x) {
        clearTimeout(to);
        if (!x.ok) { if ([401, 403, 429, 501, 404].indexOf(x.s) > -1) aiBad = Date.now() + (x.s === 429 ? 120000 : 600000); return done(null); }
        done(x.j || null, menu);
      }).catch(function () { clearTimeout(to); aiBad = Date.now() + 60000; done(null); });
  }
  /* terapkan hasil penafsir; kembalikan { msg, warn } atau null bila tidak ada yang bisa dipakai */
  function aiInterpApply(r, menu) {
    if (!r) return null;
    if (r.undo) return undoLast();
    var msgs = [], did = false, warn = false;
    (r.items || []).forEach(function (z) {
      var it = menu.filter(function (i) { return clean(i.name) === clean(z.menu); })[0]; if (!it) return;
      var a = z.op === 'set' ? actSet(it, z.qty) : z.op === 'remove' ? actReduce(it, z.qty, false) : actAdd(it, z.qty);
      did = true; if (a.msg) msgs.push(a.msg); if (a.warn || a.ok === false) warn = true;
      if (a.ok !== false && z.op === 'add') noteUse(it.id);
    });
    var nat = { type: r.type || null, table: r.table || null, note: (r.notes || []).join(', ') || null };
    if (nat.type || nat.table || nat.note) {
      var o = runNatural(nat); did = true; if (o && o.msg && o.msg !== M('nomatch')) msgs.push(o.msg); if (o && o.warn) warn = true;
    }
    return did ? { msg: msgs.join('\n'), warn: warn } : null;
  }
  /* ---------- Voice Checkout Natural v2: ucapan bebas -> field invoice Ordela ---------- */
  var N_NEG = { jangan: 1, jgn: 1, tanpa: 1, tidak: 1, tak: 1, ga: 1, gak: 1, nggak: 1, enggak: 1, no: 1, without: 1, dont: 1 };
  var N_SKIP = { pakai: 1, pake: 1, pakek: 1, usah: 1, perlu: 1, mau: 1, ada: 1, use: 1, add: 1, ditambah: 1 };
  var N_AFTER = { lebih: 1, extra: 1, banyak: 1, sedikit: 1, dikit: 1, kurang: 1, secukupnya: 1, more: 1, less: 1 };
  var N_SEP = { dipisah: 1, terpisah: 1, dipisahkan: 1, separate: 1, separately: 1 };
  var N_SEP_PRE = { pisah: 1, pisahkan: 1 };
  var N_ADJ2 = { goreng: 1, putih: 1, merah: 1, hijau: 1, kacang: 1, kecap: 1, manis: 1, asin: 1, bombay: 1, mentah: 1, rawit: 1, cabai: 1, cabe: 1, mayo: 1, tomat: 1 };
  var N_PEDAS = { sedang: 1, banget: 1, sekali: 1, biasa: 1, medium: 1, hot: 1, mild: 1, level: 1 };
  var N_EDGE = { terus: 1, lalu: 1, kemudian: 1, dan: 1, sama: 1, juga: 1, serta: 1, then: 1, and: 1, dengan: 1, plus: 1, ya: 1, yah: 1, dong: 1, deh: 1, aja: 1, saja: 1, lah: 1, kak: 1, mas: 1, mbak: 1, bang: 1, tolong: 1, please: 1, nih: 1, untuk: 1, buat: 1, yang: 1, tadi: 1, saya: 1, aku: 1, mau: 0 };
  function nStem(w) { return (w.length >= 6 && /nya$/.test(w) && !isNumTok(w)) ? w.slice(0, -3) : w; }
  function nIsTrig(w) { return !!(N_NEG[w] || N_AFTER[w] || N_SEP[w] || N_SEP_PRE[w] || N_PEDAS[w]); }
  function nIsVerb(w) { return has(V_ADD, w) || has(V_REMOVE, w) || has(V_SET, w) || has(V_REDUCE, w) || !!FILLER[w] || !!N_EDGE[w]; }
  function nOkX(w) { return w !== undefined && w !== null && !isNumTok(w) && !nIsTrig(w) && !nIsVerb(w) && !/^\d/.test(w); }
  function nTrim(words) {
    var a = 0, b = words.length;
    while (a < b && N_EDGE[words[a]]) a++;
    while (b > a && N_EDGE[words[b - 1]]) b--;
    return words.slice(a, b);
  }
  /* ekstrak catatan (jangan pedas, kuah lebih, sambal dipisah, tanpa bawang, ...) -> { notes, words } */
  function extractNotes(words) {
    var notes = [], used = [], i, j;
    var mark = function (a, b) { for (var k = a; k < b; k++) used[k] = true; };
    for (i = 0; i < words.length; i++) {
      if (used[i]) continue;
      var w = words[i], x1, x2, endX;
      if (N_NEG[w]) {                                                       // jangan pedas / tidak pakai bawang / tanpa bawang goreng
        j = i + 1; while (words[j] && N_SKIP[words[j]]) j++;
        if (nOkX(words[j]) && !used[j]) {
          endX = j + 1; if (N_ADJ2[words[endX]] && !used[endX]) endX++;
          notes.push(words.slice(i, endX).join(' ')); mark(i, endX); i = endX - 1; continue;
        }
        continue;
      }
      if (N_SEP_PRE[w]) {                                                   // pisahkan sambal
        if (nOkX(words[i + 1]) && !used[i + 1]) { notes.push(words[i + 1] + ' dipisah'); mark(i, i + 2); i++; }
        continue;
      }
      if (N_SEP[w]) {                                                       // sambal dipisah / bungkus terpisah
        if (i > 0 && !used[i - 1] && nOkX(words[i - 1])) { notes.push(words[i - 1] + ' ' + w); mark(i - 1, i + 1); }
        continue;
      }
      if ((w === 'extra' || w === 'more') && nOkX(words[i + 1]) && !used[i + 1]) {   // extra bawang
        notes.push('extra ' + words[i + 1]); mark(i, i + 2); i++; continue;
      }
      if (N_AFTER[w]) {                                                     // kuah lebih / bawang goreng sedikit
        if (i > 0 && !used[i - 1] && nOkX(words[i - 1]) && !(w === 'kurang' && isNumTok(words[i + 1] || ''))) {
          var s = i - 1;
          if (N_ADJ2[words[i - 1]] && i > 1 && !used[i - 2] && nOkX(words[i - 2])) s = i - 2;
          notes.push(words.slice(s, i + 1).join(' ')); mark(s, i + 1);
        }
        continue;
      }
      if (w === 'pedas') {                                                  // pedas sedang / pedas banget
        j = i + 1;
        if (N_PEDAS[words[j]] && !used[j]) {
          endX = j + 1; if (words[j] === 'level' && words[endX] && isNumTok(words[endX])) endX++;
          notes.push(words.slice(i, endX).join(' ')); mark(i, endX); i = endX - 1;
        }
      }
    }
    return { notes: notes, words: words.filter(function (_, k) { return !used[k]; }) };
  }
  function addNote(text) {
    var cur = (S.note || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    String(text || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (n) { if (cur.map(function (c) { return c.toLowerCase(); }).indexOf(n.toLowerCase()) < 0) cur.push(n); });
    S.note = cur.join(', ').slice(0, 120);
    if (typeof noteUI === 'function') noteUI();
    var ni = $('#pNote'); if (ni) ni.value = S.note;
  }
  function payMethods() { return (typeof PAY_M !== 'undefined' && PAY_M && PAY_M.length) ? PAY_M : ['Tunai', 'Kartu', 'QRIS', 'E-Wallet']; }
  function methodFrom(words) {
    var s = words.join(' ');
    var pm = payMethods(), k;
    for (k = 0; k < pm.length; k++) { var mc = clean(pm[k]); if (mc && new RegExp('(^| )' + mc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( |$)').test(s)) return { method: pm[k] }; }
    var dm = detectMethod(s);
    if (dm) return { method: dm };
    var bad = /\b(transfer|tf|bank|cicilan|paylater|va|virtual account)\b/.exec(s);
    return bad ? { unknown: bad[1] } : {};
  }
  function lastAddedName() { var it = st.last && typeof find === 'function' ? find(st.last) : null; return it ? it.name : ''; }
  function parseNatural(raw) {
    var words = clean(raw).split(' ').filter(Boolean).map(nStem);
    var nat = { items: '', type: null, typeConflict: false, table: null, tableAmbiguous: false, orderNo: null, note: '', pay: null, undo: false };
    var changed = false, i, r;
    if (!words.length) return null;

    // "batalkan pesanan yang terakhir" -> batalkan item yang terakhir ditambahkan (bukan transaksi yang sudah selesai)
    var REF = { terakhir: 1, tadi: 1, barusan: 1, baru: 1, last: 1, sebelumnya: 1, previous: 1 }, CANC = function (w) { return has(V_REMOVE, w); };
    if (CANC(words[0]) || (words[1] && CANC(words[1]) && N_EDGE[words[0]])) {
      var left = words.filter(function (w) { return !CANC(w) && !REF[w] && !N_EDGE[w] && !FILLER[w] && w !== 'pesanan' && w !== 'item' && w !== 'menu' && w !== 'order' && w !== 'yang' && w !== 'paling' && w !== 'itu' && w !== 'the' && w !== 'one' && w !== 'that' && w !== 'saja' && w !== 'akhir'; });
      if (!left.length && words.some(function (w) { return REF[w]; })) { nat.undo = true; return nat; }
    }

    // catatan eksplisit: "catatan kuah lebih" -> sisa ucapan jadi catatan
    var ni = words.findIndex(function (w) { return w === 'catatan' || w === 'note' || w === 'notes' || w === 'permintaan'; });
    var explicitNote = '';
    if (ni >= 0) { explicitNote = words.slice(ni + 1).join(' ').slice(0, 120); words = words.slice(0, ni); changed = true; }

    // nomor meja / nomor pesanan
    for (i = 0; i < words.length; i++) {
      var start = -1, kind = '', w0 = words[i], w1 = words[i + 1], w2 = words[i + 2];
      var isNo = (w0 === 'nomor' || w0 === 'nomer' || w0 === 'nombor' || w0 === 'no' || w0 === 'number');
      if (isNo && (w1 === 'meja' || w1 === 'table')) { start = i + 2; kind = 'table'; }
      else if ((w0 === 'meja' || w0 === 'table') && (w1 === 'nomor' || w1 === 'nomer' || w1 === 'nombor' || w1 === 'no' || w1 === 'number')) { start = i + 2; kind = 'table'; }
      else if (w0 === 'meja' || w0 === 'table') { start = i + 1; kind = 'table'; }
      else if (isNo && (w1 === 'pesanan' || w1 === 'order' || w1 === 'antrian' || w1 === 'antrean')) { start = i + 2; kind = 'order'; }
      else if ((w0 === 'pesanan' || w0 === 'order') && (w1 === 'nomor' || w1 === 'nomer' || w1 === 'no' || w1 === 'number' || w1 === 'nombor')) { start = i + 2; kind = 'order'; }
      else if (isNo && w1 !== undefined) { start = i + 1; kind = 'ambiguous'; }
      if (start < 0 || start >= words.length) continue;
      r = readNum(words, start);
      var val = r ? String(r.n) : (/^[a-z]?\d{1,3}[a-z]?$/.test(words[start]) ? words[start] : '');
      if (!val) continue;
      var end = start + (r ? r.len : 1);
      if (kind === 'table') nat.table = val; else if (kind === 'order') nat.orderNo = val; else { nat.table = val; nat.tableAmbiguous = true; }
      words.splice(i, end - i); changed = true; i--;
    }

    // catatan bebas
    var en = extractNotes(words);
    if (en.notes.length) { words = en.words; changed = true; }
    nat.note = en.notes.concat(explicitNote ? [explicitNote] : []).join(', ').slice(0, 120);

    // jenis / sumber pesanan: persis pilihan #otype yang tersedia
    var typeRules = [
      { words: ['takeaway'], value: 'Takeaway' }, { words: ['take', 'away'], value: 'Takeaway' }, { words: ['take', 'out'], value: 'Takeaway' }, { words: ['takeout'], value: 'Takeaway' }, { words: ['to', 'go'], value: 'Takeaway' },
      { words: ['bungkus'], value: 'Takeaway' }, { words: ['dibungkus'], value: 'Takeaway' }, { words: ['tapau'], value: 'Takeaway' }, { words: ['bawa', 'pulang'], value: 'Takeaway' }, { words: ['bawa', 'balik'], value: 'Takeaway' },
      { words: ['dine', 'in'], value: 'Dine In' }, { words: ['makan', 'sini'], value: 'Dine In' }, { words: ['makan', 'di', 'sini'], value: 'Dine In' }, { words: ['makan', 'ditempat'], value: 'Dine In' }, { words: ['makan', 'di', 'tempat'], value: 'Dine In' }, { words: ['eat', 'in'], value: 'Dine In' },
      { words: ['delivery'], value: 'Delivery' }, { words: ['antar'], value: 'Delivery' }, { words: ['diantar'], value: 'Delivery' },
      { words: ['gofood'], value: 'GoFood' }, { words: ['go', 'food'], value: 'GoFood' }, { words: ['gojek'], value: 'GoFood' },
      { words: ['grabfood'], value: 'GrabFood' }, { words: ['grab', 'food'], value: 'GrabFood' }, { words: ['shopeefood'], value: 'ShopeeFood' }, { words: ['shopee', 'food'], value: 'ShopeeFood' }
    ];
    var types = [];
    for (i = 0; i < words.length; i++) {
      for (var tr = 0; tr < typeRules.length; tr++) {
        var rule = typeRules[tr], ok = true;
        for (var z = 0; z < rule.words.length; z++) if (words[i + z] !== rule.words[z]) { ok = false; break; }
        if (ok) { if (types.indexOf(rule.value) < 0) types.push(rule.value); words.splice(i, rule.words.length); changed = true; i--; break; }
      }
    }
    nat.type = types.length === 1 ? types[0] : null; nat.typeConflict = types.length > 1;

    // pembayaran: dari kata "bayar/dibayar/lunas" sampai akhir
    for (i = 0; i < words.length; i++) {
      var pw = words[i];
      if (PAYV[pw] || /^(dibayar|dibayarkan|bayarnya|pembayaran)$/.test(pw)) {
        var tail = words.slice(i + 1), pc = parsePayClause(tail), mf = methodFrom(tail);
        if (mf.method) pc.method = mf.method;
        if (mf.unknown) pc.unknown = mf.unknown;
        if (pc.amount !== null || pc.method || pc.unknown || pc.exact) { nat.pay = pc; words = words.slice(0, i); changed = true; }
        break;
      }
    }

    // koreksi: "yang tadi ganti jadi 15 sate ayam" -> "ganti sate ayam jadi 15" (tanpa nama = menu terakhir)
    words = nTrim(words);
    var v0 = words.findIndex(function (w) { return has(V_SET, w); });
    if (v0 === 0) {
      var j = 1; if (words[j] === 'jadi' || words[j] === 'menjadi' || words[j] === 'to' || words[j] === 'into') j++;
      var rn = readNum(words, j);
      if (rn && j > 1) {
        var rest = nTrim(words.slice(j + rn.len)), numT = words.slice(j, j + rn.len);
        var nm = rest.length ? rest : nameToks(lastAddedName());
        if (nm.length) { words = [words[0]].concat(nm, ['jadi'], numT); changed = true; }
      }
    }
    nat.items = words.join(' ').trim();
    return changed ? nat : null;
  }

  /* batalkan operasi keranjang terakhir (tambah / kurangi / ubah jumlah), bukan transaksi yang sudah selesai */
  function undoLast() {
    while (st.hist.length) {
      var h = st.hist.pop(), it = typeof find === 'function' ? find(h.id) : null; if (!it || !h.d) continue;
      if (h.d > 0) {
        var have = qtyOf(it.id); if (!have) continue;
        var q = Math.min(h.d, have), n0 = st.hist.length; actReduce(it, q, false); st.hist.length = n0; st.last = qtyOf(it.id) > 0 ? it.id : null;
        return { msg: 'Dibatalkan: tambah ' + q + '× ' + it.name + '. Pesanan yang sudah selesai tidak diubah.' };
      }
      var n1 = st.hist.length, back = actAdd(it, -h.d); st.hist.length = n1;
      return { msg: 'Dibatalkan: ' + it.name + ' dikembalikan ' + (-h.d) + '×' + (back.warn ? ' (' + M('stock').toLowerCase() + ')' : '') + '.', warn: !back.ok };
    }
    return { msg: 'Belum ada perubahan terakhir di keranjang yang bisa dibatalkan.', warn: true };
  }
  function curWord() { var s = String(money2(0)).replace(/[\d.,\s]/g, ''); return { RM: 'ringgit', Rp: 'rupiah', IDR: 'rupiah', MYR: 'ringgit' }[s] || s; }
  function cartNames() { return Object.keys(S.cart).filter(function (k) { return S.cart[k] > 0; }).map(function (k) { var it = typeof find === 'function' ? find(bidOf(k)) : null; return S.cart[k] + '× ' + (it ? it.name : k); }); }
  function curNote() { return (S.note || '').trim(); }

  function runNatural(nat) {
    if (st.pending && st.pending.kind === 'naturalPay') { st.pending = null; if ($('#payOk') && typeof closeModal === 'function') closeModal(); }   // ucapan baru mengubah pesanan: konfirmasi lama batal
    if (nat.undo) return undoLast();
    if (nat.tableAmbiguous) {
      st.pending = { kind: 'tableClarify', natural: nat, table: nat.table };
      return { msg: 'Nomor ' + nat.table + ' maksudnya nomor meja atau nomor pesanan? Jawab “meja” atau “pesanan”.', say: 'Nomor ' + nat.table + ' maksudnya nomor meja atau nomor pesanan?', warn: true };
    }
    if (nat.typeConflict) return { msg: 'Dalam satu invoice hanya bisa ada satu tipe pesanan. Sebutkan satu saja: Takeaway, Dine In, Delivery, GoFood, GrabFood, atau ShopeeFood.', warn: true };

    // 1) menu / perubahan keranjang
    var out = { msg: '' }, stop = false, itemTouched = false;
    var parsed = nat.items ? parse(nat.items) : null;
    if (parsed && parsed.intent !== 'unknown' && parsed.intent !== 'empty' && parsed.intent !== 'yes' && parsed.intent !== 'no') {
      out = run(parsed); itemTouched = true;
      if (out.warn || out.chips || out.noop) stop = true;
    } else if (nat.items && !nat.table && !nat.type && !nat.note && !nat.pay && !nat.orderNo) {
      return { msg: M('nomatch'), warn: true };
    }
    var lines = out.msg ? [out.msg] : [];

    // 2) jenis pesanan, meja, nomor pesanan, catatan: selalu masuk field yang sesuai
    if (nat.type) {
      var typeSelect = $('#otype');
      if (typeSelect && Array.prototype.some.call(typeSelect.options, function (o) { return o.value === nat.type; })) { S.type = nat.type; typeSelect.value = nat.type; }
      else { lines.push('Tipe pesanan ' + nat.type + ' tidak tersedia di invoice ini.'); stop = true; }
    }
    if (nat.table) S.holdMeta = Object.assign({}, S.holdMeta || {}, { tbl: nat.table });
    if (nat.orderNo) addNote('No. pesanan ' + nat.orderNo);
    if (nat.note) addNote(nat.note);
    if (typeof renderInvoice === 'function') renderInvoice();

    var hasCart = !!Object.keys(S.cart).length, tblNow = (S.holdMeta && S.holdMeta.tbl) || '';
    var det = [];
    if (nat.type) det.push(nat.type); if (nat.table) det.push('Meja ' + nat.table); if (nat.orderNo) det.push('No. pesanan ' + nat.orderNo); if (nat.note) det.push('Catatan: ' + nat.note);
    if (!nat.pay) {
      if (!itemTouched && !det.length) return { msg: M('nomatch'), warn: true };
      var base = lines.filter(Boolean).join('\n');
      var extra = det.length ? 'Invoice diperbarui · ' + det.join(' · ') : '';
      return { msg: [base, extra, stop ? '' : (hasCart ? 'Pembayaran belum diproses.' : '')].filter(Boolean).join('\n'), warn: stop && !!out.warn };
    }

    // 3) pembayaran: selalu lewat konfirmasi
    if (stop) return { msg: lines.concat(['Pembayaran belum diproses karena pesanan perlu dicek dulu.']).join('\n'), warn: true, chips: out.chips };
    if (!cfg().pay) return { msg: M('payOff'), warn: true };
    if (!hasCart) return { msg: M('payNeed'), warn: true };
    if (nat.pay.unknown) return { msg: 'Metode pembayaran “' + nat.pay.unknown + '” belum tersedia di Ordela. Pilihan: ' + payMethods().join(', ') + '.', warn: true };
    if (typeof closeModal === 'function' && $('#mw.on')) closeModal();
    payForm();
    if (!$('#payOk')) return { msg: M('err'), warn: true };
    var tbl = $('#pTbl');
    if (tblNow) { if (tbl) tbl.value = tblNow; else if (!/meja/i.test(S.note || '')) { addNote('Meja ' + tblNow); lines.push('Field Nomor Meja nonaktif di pengaturan pembayaran; meja dicatat di catatan pesanan.'); } }
    var method = nat.pay.method || (nat.pay.amount != null || nat.pay.exact ? 'Tunai' : (payMethods().indexOf('Tunai') > -1 ? 'Tunai' : payMethods()[0]));
    if (payMethods().indexOf(method) < 0) { closeModal(); return { msg: 'Metode ' + method + ' tidak tersedia. Pilihan: ' + payMethods().join(', ') + '.', warn: true }; }
    setM(method);
    var totals = payTotals(), received = null;
    if (method === 'Tunai') {
      if (nat.pay.exact || nat.pay.amount == null) { if (nat.pay.amount == null && !nat.pay.exact) { /* belum ada nominal: tunai pas */ } received = totals.payable; }
      else received = nat.pay.amount;
      if (received + 1e-9 < totals.payable) { st.pending = null; return { msg: lines.concat([M('short') + ': ' + money2(totals.payable - received) + ' (total ' + money2(totals.payable) + '). Sebutkan nominal yang cukup.']).join('\n'), warn: true }; }
      quick(received);
    }
    if ($('#payOk').disabled) return { msg: 'Lengkapi pembayaran di layar sebelum konfirmasi.', warn: true };
    st.pending = { kind: 'naturalPay', at: Date.now() };
    var change = received == null ? 0 : Math.max(0, Math.round((received - totals.payable) * 100) / 100);
    var info = [S.type];
    if (tblNow) info.push('Meja ' + tblNow); if (nat.orderNo) info.push('No. pesanan ' + nat.orderNo); if (curNote()) info.push('Catatan: ' + curNote());
    var pay = 'Total ' + money2(totals.payable) + ' · ' + method + (received != null ? ' · Diterima ' + money2(received) + ' · Kembalian ' + money2(change) : '');
    var say = 'Total belanja ' + spokenMoney(totals.payable) + (received != null ? '. Uang diterima ' + spokenMoney(received) + '. Kembalian ' + spokenMoney(change) : '. Metode ' + method) + '. Apakah transaksi ingin diproses?';
    return { msg: ['Pesanan: ' + cartNames().join(', '), info.join(' · '), pay, 'Proses transaksi? Ucapkan “Ya”, “Tidak”, atau “Ubah”.'].join('\n'), say: say, big: true };
  }
  /* jawaban "ubah" saat menunggu konfirmasi pembayaran: kembali mengedit transaksi */
  function pendingReply(t) {
    var pd = st.pending; if (!pd || pd.kind !== 'naturalPay') return null;
    if (/^(ubah|ubah dulu|edit|edit dulu|koreksi|revisi|ralat|change|modify|sebentar|tunggu|tunggu dulu)$/.test(clean(t))) {
      st.pending = null; if ($('#payOk') && typeof closeModal === 'function') closeModal();
      return { msg: 'Silakan ubah pesanan. Sebutkan perubahannya, mis. “ganti jadi 15 sate ayam”, “tambah 2 teh ais”, atau “meja 9”. Pembayaran belum diproses.' };
    }
    return null;
  }

  function submit(input) {
    var alts = Array.isArray(input) ? input : [input];
    alts = alts.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
    if (!alts.length) return;
    lload(); st.ctxMiss = true;
    st.busy = true; paint(); $('#vcTx').textContent = '“' + alts[0] + '”';
    if (/\b(wk(wk)+|haha+|hehe+|hihi+)\b/i.test(alts[0])) emote('laugh', 1400);
    var pr0 = alts.length === 1 ? pendingReply(alts[0]) : null;
    if (pr0) { st.busy = false; paint(); showResult(pr0); return; }
    if (alts.length === 1) {
      var natural = null;
      try { natural = parseNatural(alts[0]); } catch (e) { console.error('voice natural parse', e); }
      if (natural) {
        var naturalOut;
        try { naturalOut = runNatural(natural); } catch (e) { console.error('voice natural checkout', e); naturalOut = { msg: M('err'), warn: true }; }
        if (chatWorthy(null, naturalOut, alts[0]) && chatOn()) {
          showResult({ msg: M('aiAsk') });
          chatAsk(alts[0], function (ans) { st.busy = false; paint(); showResult(ans ? { msg: ans, say: ans, chat: 1, emo: st.nextEmo || undefined } : naturalOut); });
          return;
        }
        st.busy = false; paint(); showResult(naturalOut);
        var unN = (st.unres || []).slice();
        if (unN.length && aiOn()) { st.busy = true; paint(); showResult({ msg: (naturalOut.msg ? naturalOut.msg + '\n' : '') + M('aiAsk') }); aiResolve(unN, function (res) { st.busy = false; paint(); if (!res.length) { showResult(naturalOut); return; } showResult({ msg: aiApply(res).join('\n'), warn: res.length < unN.length }); }); }
        return;
      }
    }
    var bestP = null, bestS = -1;
    alts.forEach(function (a, idx) {
      var p = parse(a), sc = intentScore(p) - idx * 0.01;
      if (sc > bestS) { bestS = sc; bestP = p; }
    });
    var out;
    try { out = run(bestP); } catch (e) { console.error('voice', e); out = { msg: M('err'), warn: true }; }
    st.busy = false; paint();
    var unW = (st.unres || []).slice(), willAI = (alts.length === 1 && ((out.warn && (!bestP || bestP.intent === 'unknown' || out.msg === M('nomatch')) && aiOn() && looksLikeOrder(alts[0])) || (chatWorthy(bestP, out, alts[0]) && chatOn()))) || (unW.length && aiOn());
    if (!willAI) showResult(out);   // bila AI akan menjawab, hasil "tidak ditemukan" tidak ditampilkan/dibacakan dulu
    if (alts.length === 1 && out.warn && (!bestP || bestP.intent === 'unknown' || out.msg === M('nomatch')) && aiOn() && looksLikeOrder(alts[0])) {
      st.busy = true; paint(); showResult({ msg: M('aiAsk') });
      aiInterpret(alts[0], function (r, menu) { st.busy = false; paint(); var ap = null; try { ap = aiInterpApply(r, menu || []); } catch (e) { console.error('voice interp', e); } showResult(ap || out); });
      return;
    }
    if (alts.length === 1 && chatWorthy(bestP, out, alts[0]) && chatOn()) {
      st.busy = true; paint(); showResult({ msg: M('aiAsk') });
      chatAsk(alts[0], function (ans) { st.busy = false; paint(); showResult(ans ? { msg: ans, say: ans, chat: 1, emo: st.nextEmo || undefined } : out); });
      return;
    }
    var un = (st.unres || []).slice(); if (un.length && aiOn()) {
      st.busy = true; paint(); showResult({ msg: (out.msg ? out.msg + '\n' : '') + M('aiAsk') });
      aiResolve(un, function (res) {
        st.busy = false; paint();
        if (!res.length) { showResult(out); return; }
        var got = res.map(function (x) { return '“' + x.u.name + '”'; }), m = aiApply(res); showResult({ msg: ((out.msg || '').split('\n').filter(function (l) { return !got.some(function (g) { return l.indexOf(g) > -1 && l.indexOf(M('notfound')) === 0; }); }).concat(m)).join('\n'), warn: res.length < un.length });
      });
    }
  }
  /* seberapa yakin sebuah hasil parse (menu cocok > tidak dikenal) */
  function intentScore(p) {
    if (p.intent === 'unknown' || p.intent === 'empty') return 0;
    if (p.lines) {
      var items = sellable(), tot = 0;
      p.lines.forEach(function (l) { var r = matchItem(l.name, items); tot += r.item ? 1 + r.score : (r.alts && r.alts.length ? 0.5 : 0); });
      return 1 + tot / p.lines.length;
    }
    if (p.intent === 'set' && p.name) { var r2 = matchItem(p.name, sellable()); return 1 + (r2.item ? 1 + r2.score : 0); }
    return 2;
  }

  /* ---------- mode selalu mendengarkan (tanpa menekan mikrofon) ---------- */
  var bg = { rec: null, run: false, fail: 0, blocked: false, pausedUntil: 0, next: 0, lastDone: '', lastDoneAt: 0 };
  function setLive(on) { var fb = $('#vcFab'); if (fb) fb.classList.toggle('live', !!on); var m = $('#vcMic'); if (m) { m.classList.toggle('live', !!on); m.title = on ? M('live') : M('mic'); } }
  function bgWanted() {
    var c = cfg();
    return !!(SR && c.on && c.always && !document.hidden && !st.listening && !st.speaking && !bg.blocked && Date.now() >= bg.pausedUntil && typeof S !== 'undefined' && S.view === 'pos');
  }
  /* Android Chrome (mode continuous) sering mengirim hasil KUMULATIF ("5", "5 sate", "5 sate ayam" masing-masing final):
     gabungkan dengan menimpa bila hasil baru memperpanjang yang lama, bukan menambahkan, supaya tidak terduplikasi. */
  function nk(w) { return /^\d+$/.test(w) ? w : (w in UNITS ? String(UNITS[w]) : w); }   // “lima” = “5”
  function sameW(p, q) { p = nk(p); q = nk(q); return p === q || tokSim(p, q) >= 0.8; }
  function wl(s) { return clean(s).split(' ').filter(Boolean); }
  function lead(aw, xw) { var k = 0; while (k < aw.length && k < xw.length && sameW(aw[k], xw[k])) k++; return k; }
  function mergeT(acc, t) {
    var a = String(acc || '').trim(), x = String(t || '').trim(); if (!a) return x; if (!x) return a;
    var aw = wl(a), xw = wl(x); if (!aw.length) return x; if (!xw.length) return a;
    var k = lead(aw, xw);
    if (k === aw.length) return x;                              // hasil baru memperpanjang/merevisi yang lama
    if (k === xw.length) return a;                              // hasil lama sudah memuat yang baru
    for (var s0 = 1; s0 + xw.length <= aw.length; s0++) { if (lead(aw.slice(s0), xw) === xw.length) return a; }   // termuat di tengah
    for (var o = Math.min(aw.length, xw.length) - 1; o >= 1; o--) {                // tumpang tindih ujung-awal
      var ok = true; for (var i = 0; i < o; i++) if (!sameW(aw[aw.length - o + i], xw[i])) { ok = false; break; }
      if (ok) return a + ' ' + xw.slice(o).join(' ');
    }
    return a + ' ' + x;
  }
  /* sisa ucapan yang belum diproses setelah `done` (hasil kumulatif yang datang terlambat tidak diproses ulang) */
  function restAfter(done, t) {
    var dw = wl(done), xw = wl(t); if (!dw.length || !xw.length) return t;
    var k = lead(dw, xw);
    if (k === xw.length) return '';                             // sudah pernah diproses
    if (k === dw.length) return xw.slice(k).join(' ');          // lanjutan dari yang sudah diproses
    return t;
  }
  /* catatan diagnostik mode latar (untuk Pengaturan > Voice Cashier > Diagnostik) */
  var DG = [];
  function dg(type, txt) { DG.push({ t: Date.now(), k: type, x: String(txt || '').slice(0, 90) }); if (DG.length > 14) DG.shift(); bg.last = Date.now(); }
  function bgStart() {
    var rec;
    try { rec = newRec(); } catch (e) { bg.fail++; dg('gagal', 'tidak bisa membuat sesi'); return; }
    rec.onbeat = function () { bg.last = Date.now(); };
    rec.lang = SRLANG[st.lang] || 'id-ID'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    var buf = '', alt = [], tm = 0;
    var flush = function (how) {                               // proses satu ucapan utuh sekali saja
      clearTimeout(tm); if (!buf) return; var t = buf, a = [t].concat(alt.slice(1)); buf = ''; alt = [];
      if (bg.lastDone && Date.now() - bg.lastDoneAt < 3500) {                // hasil kumulatif terlambat: jangan proses ulang yang sama
        var rest = restAfter(bg.lastDone, t);
        if (!rest) { dg('abaikan', t); bg.lastDoneAt = Date.now(); return; }
        if (rest !== t) { dg('sisa', rest); bg.lastDone = mergeT(bg.lastDone, t); a = [rest]; t = rest; } else bg.lastDone = t;
      } else bg.lastDone = t;
      bg.lastDoneAt = Date.now();
      dg(how, t); try { heardBg(a); } catch (e) { console.error('voice-bg', e); }
    };
    rec.onstart = function () { bg.run = true; bg.t0 = Date.now(); setLive(true); dg('mulai', rec.lang); };
    rec.onaudiostart = function () { dg('audio', ''); };
    rec.onresult = function (ev) {
      bg.fail = 0; bg.last = Date.now(); var anyFinal = false;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var r = ev.results[i], alts = []; for (var j = 0; j < r.length; j++) alts.push(r[j].transcript);
        buf = mergeT(buf, alts[0]); alt = alts; if (r.isFinal) anyFinal = true;
      }
      clearTimeout(tm); tm = setTimeout(function () { if (bg.rec === rec) flush(anyFinal ? 'final' : 'tenang'); }, anyFinal ? 700 : 1800);   // jeda singkat agar hasil kumulatif tergabung
    };
    rec.onerror = function (ev) {
      var e = ev && ev.error; dg('galat', e);
      if (e === 'ai-fatal') { bg.pausedUntil = Date.now() + (ev.permanent ? 600000 : 120000); toastMsg(ev.message || M('err'), true); }
      else if (e === 'not-allowed' || e === 'service-not-allowed') { bg.blocked = true; setLive(false); toastMsg(M('permNeed'), true); waitGesture(); }
      else if (e !== 'no-speech' && e !== 'aborted') bg.fail++;
    };
    rec.onend = function () { var mine = bg.rec === rec; if (mine) flush('selesai'); clearTimeout(tm); if (!mine) return; dg('selesai', Math.round((Date.now() - (bg.t0 || Date.now())) / 1000) + ' dtk'); if (bg.t0 && Date.now() - bg.t0 > 3000) bg.fail = 0; bg.run = false; bg.rec = null; setLive(false); bg.next = Math.min(bg.next, Date.now() + 150); };
    bg.rec = rec;
    try { rec.start(); } catch (e) { bg.rec = null; bg.fail++; dg('gagal', e && e.message); }
  }
  function bgStop() { var r = bg.rec; bg.rec = null; if (r) { try { r.onend = null; r.abort(); } catch (e) { /* abaikan */ } } bg.run = false; setLive(false); }
  function waitGesture() {
    var h = function () { document.removeEventListener('pointerdown', h, true); bg.blocked = false; bg.fail = 0; bg.next = 0; };
    document.addEventListener('pointerdown', h, true);
  }
  function supervise() {
    var want = bgWanted();
    if (want && !bg.rec && Date.now() >= bg.next) { bg.next = Date.now() + Math.min(6000, 300 + 400 * bg.fail); bgStart(); }
    else if (!want && bg.rec) bgStop();
    else if (want && bg.rec && bg.run && Date.now() - (bg.last || bg.t0 || Date.now()) > 50000) { dg('segarkan', 'tanpa aktivitas 50 dtk'); bgStop(); bg.next = Date.now() + 200; }   // sesi macet diam-diam
  }
  /* ucapan latar: wajib kata panggil (bila diaktifkan); tanpa kata panggil hanya perintah yang dikenali yang dijalankan */
  function heardBg(alts) {
    var c = cfg(), ww = clean(c.wakeWord || 'ordela'), woke = false, cand = [];
    alts.forEach(function (a) {
      var t = clean(a).split(' ').filter(Boolean), k = -1, used = 1;
      for (var i = 0; i < Math.min(3, t.length); i++) {
        if (tokSim(t[i], ww) >= 0.75) { k = i; used = 1; break; }
        if (t[i + 1] && tokSim(t[i] + t[i + 1], ww) >= 0.75) { k = i; used = 2; break; }
        if (t[i + 2] && tokSim(t[i] + t[i + 1] + t[i + 2], ww) >= 0.75) { k = i; used = 3; break; }
      }
      if (k > -1) { woke = true; cand.push(t.slice(k + used).join(' ')); } else cand.push(t.join(' '));
    });
    var inWin = !woke && Date.now() < (bg.awake || 0);            // lanjutan percakapan aktif tidak perlu kata panggil
    if (inWin) { woke = true; cand = alts.map(function (a) { return clean(a); }); }
    cand = cand.filter(Boolean);
    if (!cand.length) { if (woke) toastMsg(M('ready')); return; }

    // Voice Checkout Natural dipakai juga oleh Listening latar, bukan hanya kolom ketik/tap-tahan.
    // Kasir boleh berbicara alami tanpa menyebut "Ordela"; pembayaran tetap wajib konfirmasi Ya/Tidak.
    var natural = null, naturalText = '';
    var prB = cand.length ? pendingReply(cand[0]) : null;
    if (prB) { bg.awake = Date.now() + 20000; toastMsg(prB.msg, false, prB); if (st.speak && c.speak && canSpeak() && !st.listening) say(String(prB.msg).split('\n')[0]); return; }
    for (var ni = 0; ni < cand.length; ni++) {
      try { natural = parseNatural(cand[ni]); } catch (e) { console.error('voice natural parse', e); natural = null; }
      if (natural) { naturalText = cand[ni]; break; }
    }
    if (natural) {
      st.ctxMiss = true;
      var naturalOut;
      try { naturalOut = runNatural(natural); } catch (e) { console.error('voice natural checkout', e); naturalOut = { msg: M('err'), warn: true }; }
      if (chatWorthy(null, naturalOut, naturalText) && (woke || inWin) && chatOn()) {
        bg.awake = Date.now() + 25000;
        chatAsk(naturalText, function (ans) { bg.awake = Date.now() + 20000; if (!ans) { toastMsg(('“' + naturalText + '”\n' + (naturalOut.msg || '')).trim(), !!naturalOut.warn, naturalOut); return; } toastMsg(ans, false, { chat: 1, emo: st.nextEmo || undefined }); if (st.speak && c.speak && canSpeak()) say(ans); });
        return;
      }
      toastMsg(('“' + naturalText + '”\n' + (naturalOut.msg || '')).trim(), !!naturalOut.warn, naturalOut);
      if (naturalOut.msg && st.speak && c.speak && canSpeak() && !st.listening) say(naturalOut.say || String(naturalOut.msg).split('\n')[0]);
      return;
    }

    var bestP = null, bestS = -1;
    cand.forEach(function (a, idx) { var p = parse(a), sc = intentScore(p) - idx * 0.01; if (sc > bestS) { bestS = sc; bestP = p; } });
    st.ctxMiss = true;
    var out;
    try { out = run(bestP); } catch (e) { console.error('voice', e); return; }
    if (chatWorthy(bestP, out, cand[0]) && (woke || inWin) && chatOn()) {
      bg.awake = Date.now() + 25000;
      chatAsk(cand[0], function (ans) { bg.awake = Date.now() + 20000; if (!ans) { toastMsg(((cand[0] ? '“' + cand[0] + '”\n' : '') + (out.msg || '')).trim(), true, out); return; } toastMsg(ans, false, { chat: 1, emo: st.nextEmo || undefined }); if (st.speak && c.speak && canSpeak()) say(ans); });
      return;
    }
    if (out.noop) return;
    if (out.warn && (!bestP || bestP.intent === 'unknown' || out.msg === M('nomatch')) && (woke || inWin) && aiOn() && looksLikeOrder(cand[0])) {
      bg.awake = Date.now() + 20000;
      aiInterpret(cand[0], function (r, menu) { var ap = null; try { ap = aiInterpApply(r, menu || []); } catch (e) { console.error('voice interp', e); } var o2 = ap || out; toastMsg(('“' + cand[0] + '”\n' + (o2.msg || '')).trim(), !!o2.warn, o2); });
      return;
    }
    bg.awake = Date.now() + 20000;
    toastMsg(((cand[0] ? '“' + cand[0] + '”\n' : '') + (out.msg || '')).trim(), !!out.warn, out);
    var un = (st.unres || []).slice();
    if (un.length && aiOn()) aiResolve(un, function (res) { if (res.length) { var m = aiApply(res); toastMsg(m.join('\n'), false); } });
    if (out.msg && st.speak && c.speak && canSpeak() && !st.listening) say(out.say || String(out.msg).split('\n')[0]);
  }
  var toastT = 0;
  function toastMsg(text, warn, out) {
    ensureUI(); var t = $('#vcT'); if (!t) return;
    bub.full = text; bub.on = 0; bub.tok++;
    t.textContent = text; t.classList.toggle('warn', !!warn); t.hidden = false; popEl(t);
    try { if (out && out.chat) botReact({ msg: text, say: text, chat: 1, emo: out.emo }); else if (warn) botReact({ msg: text, warn: true }); } catch (e) { /* abaikan */ }
    clearTimeout(toastT); var hideT = function () { if (st.speaking) { toastT = setTimeout(hideT, 1200); return; } t.hidden = true; }; toastT = setTimeout(hideT, warn ? 6000 : 4200);
  }
  function localStorageLang() { try { return localStorage.getItem('ordela_vc_lang'); } catch (e) { return null; } }
  /* ---------- pasang ---------- */
  /* tombol headset / mic eksternal (dikirim APK sebagai event 'ordela-headset'): tekan sekali = mulai bicara, tekan lagi = berhenti */
  var hsAt = 0;
  addEventListener('ordela-headset', function () {
    if (!cfg().on || Date.now() - hsAt < 500) return; hsAt = Date.now();
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) { /* abaikan */ }
    if (st.listening) { stopListen(false); return; }
    st.ptt = false; st.pttHeld = false; startListen();
  });
  function init() {
    ensureUI(); injectMic(); injectFab(); setInterval(supervise, 300);
    var n = 0, t = setInterval(function () { injectMic(); injectFab(); if (($('#vcMic') && $('#vcFab')) || ++n > 40) clearInterval(t); }, 500);
  }
  root.VC = { emote: emote, botPoke: botPoke, bot: bot, speakTest: speakTest, canDictate: canDictate, dictate: dictate, refresh: function () { applyCfg(); if (!cfg().always) bgStop(); else { bg.blocked = false; bg.next = 0; } if (!localStorageLang()) { st.lang = pickLang(); if (st.open) paint(); } }, parse: parse, run: run, submit: submit, open: openPanel, close: closePanel, matchItem: matchItem, state: st, D: { interp: function (t, cb) { aiInterpret(t, function (r, m) { cb(aiInterpApply(r, m || [])); }); }, capFake: function (v) { Cap.fake = !!v; }, capFeed: function (f) { Cap.sinks.slice().forEach(function (s) { s(f); }); }, useAi: useAi, tr: function (fn) { aiTranscribe = fn; }, log: function () { return DG.slice(); }, bg: function () { return { live: !!bg.run, blocked: !!bg.blocked, fail: bg.fail, wanted: bgWanted() }; } }, L: {
    data: function () { var L = lload(); return JSON.parse(JSON.stringify(L)); },
    delAlias: function (k) { var L = lload(); delete L.al[k]; lsave(); },
    delMiss: function (k) { var L = lload(); delete L.miss[k]; lsave(); },
    delVerb: function (w) { var L = lload(), a = LV[L.vw[w]]; delete L.vw[w]; if (a && a.indexOf(w) > -1) a.splice(a.indexOf(w), 1); lsave(); },
    assign: function (k, id) { var L = lload(), m = L.miss[k]; if (m) learnAlias(m.p, id, false); },
    clear: function () { var L = lload(); Object.keys(L.vw).forEach(function (w) { root.VC.L.delVerb(w); }); LS = { al: {}, use: {}, vw: {}, miss: {} }; lsave(); }
  }, supported: !!SR };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);

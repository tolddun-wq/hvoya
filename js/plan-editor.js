/* Генератор «Дом по вашему чертежу»: обводка плана, масштаб, окна и двери → 3D и смета.
   Файл чертежа остаётся в браузере, на сервер ничего не отправляется. */
(function () {
  var H = window.HVOYA, $ = function (id) { return document.getElementById(id); };
  var cv = $('pcv'), ctx = cv.getContext('2d'), wrap = $('pwrap');
  var img = null, imgW = 1100, imgH = 900;      // без чертежа — сетка «1 клетка = 1 м»
  var pts = [], closed = false, open = [], mode = 'draw', mpp = 1 / 70;
  var view = { k: 1, ox: 0, oy: 0 }, drag = -1, hover = null, history = [];
  var GRID = 70;                                   // пикселей «бумаги» на метр, пока нет масштаба

  /* ——— пример ——— */
  var EX = {
    pts: [[130, 120], [970, 120], [970, 470], [690, 470], [690, 750], [130, 750]],
    open: [[0, .157, 'win'], [0, .364, 'win'], [0, .657, 'win'], [0, .871, 'win'], [1, .377, 'win'], [2, .625, 'door'],
           [3, .471, 'win'], [4, .764, 'win'], [4, .371, 'win'], [5, .727, 'win'], [5, .235, 'win']],
    mpp: 1 / 70
  };

  function snapshot() { history.push(JSON.stringify({ pts: pts, closed: closed, open: open, mpp: mpp })); if (history.length > 60) history.shift(); }
  function undo() {
    if (!history.length) return;
    var s = JSON.parse(history.pop()); pts = s.pts; closed = s.closed; open = s.open; mpp = s.mpp;
    if (!closed) setMode('draw'); changed();
  }

  /* ——— вид ——— */
  function fit() {
    var r = wrap.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pad = 16, k = Math.min((r.width - pad * 2) / imgW, (r.height - pad * 2) / imgH);
    view = { k: k, ox: (r.width - imgW * k) / 2, oy: (r.height - imgH * k) / 2, w: r.width, h: r.height };
    draw();
  }
  function toS(p) { return [view.ox + p[0] * view.k, view.oy + p[1] * view.k]; }
  function toI(x, y) { return [(x - view.ox) / view.k, (y - view.oy) / view.k]; }
  function len(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
  function edgeN() { return closed ? pts.length : pts.length - 1; }
  function E(i) { return [pts[i], pts[(i + 1) % pts.length]]; }
  function m(v) { return (Math.round(v * 100) / 100).toLocaleString('ru-RU'); }

  /* ——— рисование ——— */
  function draw() {
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#FBF9F4'; ctx.fillRect(0, 0, view.w, view.h);
    if (img) { ctx.globalAlpha = .85; ctx.drawImage(img, view.ox, view.oy, imgW * view.k, imgH * view.k); ctx.globalAlpha = 1; }
    else {
      ctx.strokeStyle = 'rgba(31,36,28,.08)'; ctx.lineWidth = 1; ctx.beginPath();
      for (var x = 0; x <= imgW; x += GRID) { var a = toS([x, 0]), b = toS([x, imgH]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      for (var y = 0; y <= imgH; y += GRID) { var c = toS([0, y]), d = toS([imgW, y]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); }
      ctx.stroke();
    }
    if (!pts.length) return;
    var S = pts.map(toS);
    ctx.beginPath(); ctx.moveTo(S[0][0], S[0][1]);
    for (var i = 1; i < S.length; i++) ctx.lineTo(S[i][0], S[i][1]);
    if (closed) { ctx.closePath(); ctx.fillStyle = 'rgba(201,138,62,.16)'; ctx.fill(); }
    ctx.strokeStyle = '#C98A3E'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    if (!closed && hover && mode === 'draw') {
      ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(S[S.length - 1][0], S[S.length - 1][1]);
      var hs = toS(hover); ctx.lineTo(hs[0], hs[1]); ctx.stroke(); ctx.setLineDash([]);
      var lm = len(pts[pts.length - 1], hover) * mpp; label(hs[0] + 12, hs[1] - 12, m(lm) + ' м', '#1F241C');
    }
    // длины стен
    for (var e = 0; e < edgeN(); e++) {
      var ab = E(e), A = toS(ab[0]), B = toS(ab[1]), L = len(ab[0], ab[1]) * mpp;
      var mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, nx = -(B[1] - A[1]), ny = B[0] - A[0], nl = Math.hypot(nx, ny) || 1;
      var sg = closed && centroidSide(mx, my, nx / nl, ny / nl) ? -1 : 1;
      label(mx + sg * nx / nl * 18, my + sg * ny / nl * 18, m(L) + ' м', mode === 'scale' ? '#9C3A26' : '#4A5145', true);
    }
    // проёмы
    open.forEach(function (o, idx) {
      if (o.e >= edgeN()) return;
      var ab = E(o.e), A = toS(ab[0]), B = toS(ab[1]), L = len(ab[0], ab[1]) * mpp;
      var w = (o.type === 'door' ? 1.0 : 1.2) / L, t1 = Math.max(0, o.t - w / 2), t2 = Math.min(1, o.t + w / 2);
      var p1 = [A[0] + (B[0] - A[0]) * t1, A[1] + (B[1] - A[1]) * t1], p2 = [A[0] + (B[0] - A[0]) * t2, A[1] + (B[1] - A[1]) * t2];
      ctx.lineWidth = 7; ctx.strokeStyle = o.bad ? '#C0392B' : (o.type === 'door' ? '#1F241C' : '#3D7EA6');
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      if (o.type === 'door') { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p1[0], p1[1], len(p1, p2), Math.atan2(p2[1] - p1[1], p2[0] - p1[0]), Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) + (o.flip ? -1 : 1) * Math.PI / 2, !!o.flip); ctx.stroke(); }
    });
    // узлы
    S.forEach(function (p, i) {
      ctx.beginPath(); ctx.arc(p[0], p[1], i === 0 && !closed ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 && !closed ? '#C98A3E' : '#FBF9F4'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1F241C'; ctx.stroke();
    });
  }
  function centroidSide(x, y, nx, ny) {
    var c = pts.reduce(function (s, p) { return [s[0] + p[0], s[1] + p[1]]; }, [0, 0]); c = toS([c[0] / pts.length, c[1] / pts.length]);
    return (c[0] - x) * nx + (c[1] - y) * ny < 0 ? false : true;
  }
  function label(x, y, t, col, box) {
    ctx.font = '600 12px "Golos Text", sans-serif'; var w = ctx.measureText(t).width + 10;
    if (box) { ctx.fillStyle = 'rgba(251,249,244,.92)'; ctx.fillRect(x - w / 2, y - 10, w, 20); }
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
  }

  /* ——— ввод ——— */
  function nearPoint(I, r) { r = r / view.k; for (var i = 0; i < pts.length; i++) if (len(pts[i], I) < r) return i; return -1; }
  function nearEdge(I, r) {
    r = r / view.k; var best = null;
    for (var e = 0; e < edgeN(); e++) {
      var ab = E(e), a = ab[0], b = ab[1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      var t = Math.max(0, Math.min(1, ((I[0] - a[0]) * dx + (I[1] - a[1]) * dy) / L2));
      var d = len(I, [a[0] + dx * t, a[1] + dy * t]);
      if (d < r && (!best || d < best.d)) best = { e: e, t: t, d: d };
    }
    return best;
  }
  function ortho(prev, I) {
    var dx = I[0] - prev[0], dy = I[1] - prev[1], ang = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
    if (ang < 9 || ang > 171) return [I[0], prev[1]];
    if (Math.abs(ang - 90) < 9) return [prev[0], I[1]];
    return I;
  }
  function evt(e) { var r = cv.getBoundingClientRect(); return toI(e.clientX - r.left, e.clientY - r.top); }

  cv.addEventListener('pointerdown', function (e) {
    var I = evt(e);
    if (mode === 'draw') {
      if (pts.length >= 3 && nearPoint(I, 16) === 0) { snapshot(); closed = true; setMode('win'); changed(); return; }
      var pi = nearPoint(I, 12);
      if (pi >= 0) { drag = pi; snapshot(); cv.setPointerCapture(e.pointerId); return; }
      snapshot(); pts.push(pts.length ? ortho(pts[pts.length - 1], I) : I); changed(); return;
    }
    var pi2 = nearPoint(I, 12);
    if (pi2 >= 0 && (mode === 'win' || mode === 'door' || mode === 'edit')) { drag = pi2; snapshot(); cv.setPointerCapture(e.pointerId); return; }
    var ne = nearEdge(I, 16);
    if (mode === 'scale' && ne) { askScale(ne.e, e); return; }
    if ((mode === 'win' || mode === 'door') && ne) {
      var L = len(E(ne.e)[0], E(ne.e)[1]) * mpp, hit = -1;
      open.forEach(function (o, k) { if (o.e === ne.e && Math.abs(o.t - ne.t) * L < .6) hit = k; });
      snapshot();
      if (hit >= 0) open.splice(hit, 1); else open.push({ e: ne.e, t: ne.t, type: mode });
      changed();
    }
  });
  cv.addEventListener('pointermove', function (e) {
    var I = evt(e);
    if (drag >= 0) {
      var p = I, n = pts.length, a = pts[(drag - 1 + n) % n], b = pts[(drag + 1) % n], tol = 8 / view.k;
      if (a && Math.abs(p[0] - a[0]) < tol) p = [a[0], p[1]]; if (a && Math.abs(p[1] - a[1]) < tol) p = [p[0], a[1]];
      if (b && Math.abs(p[0] - b[0]) < tol) p = [b[0], p[1]]; if (b && Math.abs(p[1] - b[1]) < tol) p = [p[0], b[1]];
      pts[drag] = p; changed(true); return;
    }
    if (mode === 'draw' && pts.length) { hover = ortho(pts[pts.length - 1], I); draw(); }
    cv.style.cursor = nearPoint(I, 12) >= 0 ? 'move' : (mode === 'win' || mode === 'door' || mode === 'scale') && nearEdge(I, 16) ? 'pointer' : mode === 'draw' ? 'crosshair' : 'default';
  });
  cv.addEventListener('pointerup', function () { if (drag >= 0) { drag = -1; changed(); } });
  cv.addEventListener('pointerleave', function () { hover = null; draw(); });

  /* масштаб: длина выбранной стены */
  var sc = $('pscale');
  function askScale(ei, e) {
    var r = wrap.getBoundingClientRect();
    sc.hidden = false; sc.style.left = Math.min(r.width - 230, Math.max(8, e.clientX - r.left - 110)) + 'px'; sc.style.top = Math.max(8, e.clientY - r.top - 90) + 'px';
    var inp = sc.querySelector('input'); inp.value = m(len(E(ei)[0], E(ei)[1]) * mpp).replace(/\s/g, ''); inp.focus(); inp.select();
    sc.dataset.e = ei;
  }
  sc.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = parseFloat(sc.querySelector('input').value.replace(',', '.'));
    var err = sc.querySelector('.err');
    if (!(v > .5 && v < 60)) { err.textContent = 'Введите длину от 0,5 до 60 м'; return; }
    err.textContent = ''; snapshot();
    var ab = E(+sc.dataset.e); mpp = v / len(ab[0], ab[1]); sc.hidden = true; setMode('win'); changed();
  });
  sc.querySelector('[data-cancel]').addEventListener('click', function () { sc.hidden = true; });

  /* ——— инструменты ——— */
  var HINT = {
    draw: 'Кликайте по углам дома по порядку. Стены выравниваются по горизонтали и вертикали. Чтобы замкнуть контур, кликните по первой точке.',
    win: 'Кликните по стене — появится окно 1,2 × 1,5 м. Клик по окну убирает его. Углы можно двигать.',
    door: 'Кликните по стене, где будет вход: дверь, крыльцо и навес встанут сами.',
    scale: 'Кликните по стене, длину которой знаете, и введите её в метрах — остальные размеры пересчитаются.'
  };
  function setMode(md) {
    mode = md;
    [].forEach.call(document.querySelectorAll('[data-tool]'), function (b) { b.setAttribute('aria-pressed', b.dataset.tool === md); b.disabled = b.dataset.tool !== 'draw' && !closed; });
    $('phint').textContent = HINT[md] || '';
    sc.hidden = true; draw();
  }
  document.querySelector('.p-tools').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tool) {
      if (b.dataset.tool === 'draw' && closed) { snapshot(); pts = []; open = []; closed = false; changed(); }
      setMode(b.dataset.tool);
    }
    if (b.id === 'pundo') undo();
    if (b.id === 'pclear') { snapshot(); pts = []; open = []; closed = false; setMode('draw'); changed(); }
  });
  $('pfile').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { $('pmsg').textContent = 'Нужна картинка: фото или скан чертежа (JPG, PNG). PDF пока не читаем.'; return; }
    var rd = new FileReader();
    rd.onload = function () { loadImg(rd.result, false); };
    rd.readAsDataURL(f);
  });
  $('pexample').addEventListener('click', function () { loadImg('img/plan-example.svg', true); });
  function loadImg(src, example) {
    var im = new Image();
    im.onload = function () {
      img = im; imgW = im.naturalWidth || 1100; imgH = im.naturalHeight || 900;
      snapshot();
      if (example) {
        pts = EX.pts.map(function (p) { return p.slice(); }); closed = true; mpp = EX.mpp;
        open = EX.open.map(function (o) { return { e: o[0], t: o[1], type: o[2] }; });
        setMode('win'); $('pmsg').textContent = 'Пример уже обведён: двигайте углы, добавляйте окна или нажмите «Обвести заново».';
      } else {
        pts = []; open = []; closed = false; mpp = 12 / (imgW * .75);
        setMode('draw'); $('pmsg').textContent = 'Чертёж загружен. Обведите наружные стены, потом задайте длину одной стены.';
      }
      $('pempty').hidden = true; fit(); changed();
    };
    im.onerror = function () { $('pmsg').textContent = 'Не получилось открыть файл. Попробуйте другую картинку.'; };
    im.src = src;
  }
  $('pblank').addEventListener('click', function () {
    img = null; imgW = 1100; imgH = 900; mpp = 1 / GRID; snapshot(); pts = []; open = []; closed = false;
    $('pempty').hidden = true; setMode('draw'); fit(); changed();
    $('pmsg').textContent = 'Рисуем по сетке: одна клетка — 1 метр.';
  });

  /* ——— модель для 3D и сметы ——— */
  function model() {
    if (!closed || pts.length < 3) return null;
    var c = pts.reduce(function (s, p) { return [s[0] + p[0], s[1] + p[1]]; }, [0, 0]); c = [c[0] / pts.length, c[1] / pts.length];
    var P = pts.map(function (p) { return [(p[0] - c[0]) * mpp, (p[1] - c[1]) * mpp]; });
    var A = 0; for (var i = 0; i < P.length; i++) { var a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; }
    var rev = A < 0, N = P.length, ops = [];
    if (rev) P.reverse();
    // проёмы: в метрах вдоль стены, с проверкой, что помещаются и не наезжают
    var per = {};
    open.forEach(function (o) {
      o.bad = false;
      if (o.e >= N) { o.bad = true; return; }
      var e = rev ? (N - 2 - o.e + N) % N : o.e, t = rev ? 1 - o.t : o.t;
      var a = P[e], b = P[(e + 1) % N], L = Math.hypot(b[0] - a[0], b[1] - a[1]), w = o.type === 'door' ? 1.0 : 1.2, s = t * L;
      if (L < w + .7 || s < w / 2 + .3 || s > L - w / 2 - .3) { o.bad = true; return; }
      (per[e] = per[e] || []).forEach(function (q) { if (Math.abs(q.s - s) < (q.w + w) / 2 + .35) o.bad = true; });
      if (o.bad) return;
      per[e].push({ s: s, w: w }); ops.push({ e: e, s: s, type: o.type });
    });
    var area = Math.abs(A) / 2;
    var perim = 0; for (var j = 0; j < N; j++) perim += Math.hypot(P[(j + 1) % N][0] - P[j][0], P[(j + 1) % N][1] - P[j][1]);
    return { pts: P, open: ops, fp: area, perim: perim };
  }
  var tmr = null;
  function changed(quick) {
    draw();
    var md = model();
    $('pstat').innerHTML = md ? 'Пятно застройки <b>' + m(md.fp) + '&nbsp;м²</b> · периметр ' + m(md.perim) + '&nbsp;м · ' + pts.length + ' ' + H.pl(pts.length, 'угол', 'угла', 'углов') : (pts.length ? 'Контур не замкнут: кликните по первой точке' : 'Контур ещё не нарисован');
    draw();
    clearTimeout(tmr); tmr = setTimeout(function () { document.dispatchEvent(new CustomEvent('plan:change', { detail: md })); }, quick ? 120 : 0);
  }

  new ResizeObserver(fit).observe(wrap);
  window.PlanEditor = { model: model };
  setMode('draw'); fit(); changed();
})();

/* Страница «Дом по чертежу»: параметры, смета из контура, запуск 3D */
(function () {
  var H = window.HVOYA, $ = function (id) { return document.getElementById(id); };
  var st = { floors: '1', roofShape: 'gable', roofMat: 'falz', facade: 'plank', found: 'piles' }, md = null, P3 = null, loading = false;
  var view = $('view3d');

  [].forEach.call(document.querySelectorAll('#popts .k-chips'), function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      st[g.dataset.k] = b.dataset.v; sync(); recalc();
    });
  });
  function sync() {
    [].forEach.call(document.querySelectorAll('#popts .k-chips'), function (g) {
      [].forEach.call(g.children, function (b) { b.type = 'button'; b.setAttribute('aria-pressed', st[g.dataset.k] === b.dataset.v); });
    });
    $('pRoofMat').hidden = st.roofShape === 'flat';
  }

  /* та же геометрия, что строит 3D, — для сметы */
  function geom(m) {
    var P = m.pts, N = P.length, xs = P.map(function (p) { return p[0]; }), zs = P.map(function (p) { return p[1]; });
    var w = Math.max.apply(0, xs) - Math.min.apply(0, xs), d = Math.max.apply(0, zs) - Math.min.apply(0, zs);
    var span = Math.min(w, d), eave = st.floors === '2' ? 6.1 : st.floors === '1.5' ? 4.0 : st.roofShape === 'flat' ? 3.3 : 3.0;
    var pitch = (st.roofShape === 'flat' ? 0 : st.roofShape === 'shed' ? 12 : st.floors === '1.5' ? 40 : st.floors === '2' ? 25 : 30) * Math.PI / 180;
    var gableH = st.roofShape === 'gable' ? span / 2 * Math.tan(pitch) : st.roofShape === 'shed' ? span * Math.tan(pitch) : 0;
    var avgH = eave + (st.roofShape === 'shed' ? gableH / 2 : 0);
    var nW = m.open.filter(function (o) { return o.type !== 'door'; }).length, nD = m.open.length - nW;
    if (st.floors === '2') nW *= 2;
    if (st.floors === '1.5' && st.roofShape === 'gable') nW += 4;
    var facade = m.perim * avgH + (st.roofShape === 'gable' ? span * gableH : 0) - nW * 1.8 - nD * 2.2;
    var ov = st.roofShape === 'flat' ? .15 : .5, roofFp = m.fp + m.perim * ov + 4 * ov * ov;
    return { fp: m.fp, w: w, d: d, roof: roofFp / Math.cos(pitch) * (st.roofShape === 'flat' ? 1.08 : 1), facade: Math.max(10, facade), win: nW, door: nD };
  }

  function recalc() {
    var lines = $('plines');
    if (!md) {
      $('ptotal').textContent = '—'; $('pfacts').textContent = 'Обведите контур дома'; lines.innerHTML = ''; $('psend').disabled = true;
      return;
    }
    var g = geom(md), c = H.cfgFor('');
    c.area = Math.round(md.fp * (st.floors === '2' ? 1.9 : st.floors === '1.5' ? 1.6 : 1));
    c.floors = st.floors; c.facade = st.facade; c.found = st.found; c.terrace = 0; c.glass = false;
    c.roof = st.roofShape === 'flat' ? 'flat' : st.roofMat;
    var R = H.calc(c, g);
    $('ptotal').textContent = H.rub(R.total);
    $('pfacts').innerHTML = 'Площадь дома ≈ ' + c.area + '&nbsp;м² · ' + g.win + ' ' + H.pl(g.win, 'окно', 'окна', 'окон') + ' · срок ' + R.weeks + '&nbsp;нед.';
    lines.innerHTML = R.lines.map(function (l) { return '<li><span>' + l.n + '</span><span>' + H.rub(l.sum) + '</span></li>'; }).join('');
    $('psend').disabled = false;
    if (P3) P3.update(Object.assign({}, md, st));
  }

  document.addEventListener('plan:change', function (e) {
    md = e.detail;
    $('pwait').hidden = !!md && (autoload() || !!P3);
    if (md && !P3 && !autoload()) $('pwait').textContent = 'Контур готов — нажмите «Собрать в 3D»';
    $('go3d').hidden = !md || !!P3 || autoload();
    if (md && autoload()) start();
    recalc();
  });
  function autoload() { return window.matchMedia('(min-width: 981px)').matches && !(navigator.connection && navigator.connection.saveData); }
  function start() {
    if (P3 || loading) return; loading = true; view.classList.add('loading'); $('go3d').hidden = true;
    import('./plan3d.js').then(function (m) {
      return m.mount(view).then(function () { P3 = m; $('pwait').hidden = true; view.classList.remove('loading'); view.classList.add('live'); if (md) m.update(Object.assign({}, md, st)); });
    }).catch(function () { loading = false; view.classList.remove('loading'); view.classList.add('fail'); $('go3d').hidden = false; });
  }
  $('go3d').addEventListener('click', start);
  $('psend').addEventListener('click', function () { window.showDemo(); });
  sync(); recalc();
})();

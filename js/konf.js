/* Конфигуратор: параметры → чертёж дома → смета-документ */
(function () {
  var H = window.HVOYA, O = H.opt, $ = function (id) { return document.getElementById(id); };
  var rub = H.rub;

  /* ——— Начальное состояние: из ссылки, из проекта или из быстрого расчёта на главной ——— */
  var q = new URLSearchParams(location.search), c, fromProject = null, baseP = null;
  if (q.get('p') && H.cfgs[q.get('p')]) { c = H.cfgFor(q.get('p')); fromProject = baseP = q.get('p'); }
  else c = H.cfgFor('');
  if (q.get('area')) c.area = clamp(+q.get('area'), 50, 240);
  if (q.get('floors') && O.floors[q.get('floors')]) c.floors = q.get('floors');
  var lv = q.get('level');
  if (lv === 'contour') { c.finish = 'none'; c.eng = []; }
  if (lv === 'rough') { c.finish = 'rough'; c.eng = ['elec', 'water', 'heat']; }
  ['wall', 'roof', 'found', 'facade', 'finish'].forEach(function (k) { if (q.get(k) && O[k][q.get(k)]) c[k] = q.get(k); });
  if (q.has('eng')) c.eng = q.get('eng').split(',').filter(function (k) { return O.eng[k]; });
  if (q.has('glass')) c.glass = q.get('glass') === '1';
  if (q.has('terrace')) c.terrace = clamp(+q.get('terrace'), 0, 60);
  if (O.roof[c.roof].flat && c.floors !== '1') c.roof = 'falz';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, isNaN(v) ? a : v)); }
  function nb(s) { return String(s).replace(/(^|\s)(в|и|с|к|у|о|а|на|по|за|до|от|не|из|под|без|для) /gi, '$1$2 ').replace(/ —/g, ' —'); }
  function signed(n) { n = Math.round(n / 1000) * 1000; return n === 0 ? 'та же цена' : (n > 0 ? '+' : '−') + rub(Math.abs(n)); }

  /* ——— Пресеты-проекты ——— */
  $('presets').innerHTML = H.projects.map(function (p) {
    return '<button type="button" class="chip" data-p="' + p.id + '" aria-pressed="' + (p.id === fromProject) + '">' + p.name + ' · ' + p.area + '&nbsp;м²</button>';
  }).join('');
  $('presets').addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) return;
    c = H.cfgFor(b.dataset.p); fromProject = baseP = b.dataset.p; syncInputs(); update();
  });

  /* ——— Опции ——— */
  var groups = ['floors', 'wall', 'roof', 'found', 'facade', 'finish', 'eng'];
  function optionList(g) { return g === 'floors' ? ['1', '1.5', '2'] : Object.keys(g === 'eng' ? O.eng : O[g]); }
  function priceWith(g, k) {
    var t = JSON.parse(JSON.stringify(c));
    if (g === 'eng') { var i = t.eng.indexOf(k); i < 0 ? t.eng.push(k) : t.eng.splice(i, 1); }
    else { t[g] = k; if (g === 'floors' && k !== '1' && O.roof[t.roof].flat) t.roof = 'falz'; }
    return H.calc(t).total;
  }
  function renderOpts() {
    var base = H.calc(c).total;
    groups.forEach(function (g) {
      $('o-' + g).innerHTML = optionList(g).map(function (k) {
        var o = (g === 'eng' ? O.eng : O[g])[k];
        var on = g === 'eng' ? c.eng.indexOf(k) >= 0 : c[g] === k;
        var off = g === 'roof' && o.flat && c.floors !== '1';
        var d = on ? (g === 'eng' ? 'включено' : 'выбрано') : off ? 'только для одноэтажных' : signed(priceWith(g, k) - base);
        return '<button type="button" class="opt" data-g="' + g + '" data-k="' + k + '" aria-pressed="' + on + '"' + (off ? ' disabled' : '') + '>' +
          '<span class="on">' + o.n + '</span><span class="od">' + nb(o.d) + (g === 'wall' ? ', теплопередача ' + o.u : '') + '</span>' +
          '<span class="op' + (on ? ' sel' : '') + '">' + d + '</span></button>';
      }).join('');
    });
  }
  $('form').addEventListener('click', function (e) {
    var b = e.target.closest('.opt'); if (!b || b.disabled) return;
    var g = b.dataset.g, k = b.dataset.k;
    if (g === 'eng') { var i = c.eng.indexOf(k); i < 0 ? c.eng.push(k) : c.eng.splice(i, 1); }
    else { c[g] = k; if (g === 'floors' && k !== '1' && O.roof[c.roof].flat) c.roof = 'falz'; }
    fromProject = null; update();
  });
  $('area').addEventListener('input', function () { c.area = +this.value; fromProject = null; update(); });
  $('terrace').addEventListener('input', function () { c.terrace = +this.value; update(); });
  $('glass').addEventListener('change', function () { c.glass = this.checked; update(); });
  function syncInputs() { $('area').value = c.area; $('terrace').value = c.terrace; $('glass').checked = !!c.glass; }

  /* ——— 3D-модель ——— */
  var view = $('view3d'), H3 = null, loading3d = false, lastR = null;
  function shapeOf() { return c.floors === '1' ? (c.roof === 'flat' ? 'f1' : 'g1') : c.floors === '1.5' ? 'g15' : 'g2'; }
  /* своя модель проекта, пока площадь, этажность и кровля как в проекте */
  function projModel() {
    if (!baseP) return null; var p = H.cfgFor(baseP);
    return p.area === c.area && p.floors === c.floors && p.roof === c.roof ? baseP : null;
  }
  /* какой дом показывать: всегда один из проектов каталога — выбранный или ближайший по этажности, кровле и площади,
     слегка увеличенный или уменьшенный под площадь. Общая модель — только для одноэтажного со скатной кровлей (такого проекта нет). */
  function viewModel() {
    var pid = projModel(); if (pid) return { pid: pid, s: 1 };
    var flat = !!O.roof[c.roof].flat;
    var list = H.projects.filter(function (p) { var q = H.cfgFor(p.id); return q.floors === c.floors && !!O.roof[q.roof].flat === flat; });
    if (!list.length) return { pid: null, s: 1 };
    list.sort(function (a, b) {
      var ra = H.cfgFor(a.id).roof === c.roof ? 0 : 1, rb = H.cfgFor(b.id).roof === c.roof ? 0 : 1;
      if (baseP) { ra -= a.id === baseP ? .5 : 0; rb -= b.id === baseP ? .5 : 0; }
      return ra - rb || Math.abs(a.area - c.area) - Math.abs(b.area - c.area);
    });
    var p = list[0]; return { pid: p.id, s: Math.sqrt(c.area / p.area) };
  }
  function draw(R) {
    lastR = R; var v = viewModel(), pid = v.pid;
    if (H3) { H3.update(c, R.g, pid, v.s); return; }
    var src = pid ? 'img/3d/p_' + pid + '.jpg' : 'img/3d/' + shapeOf() + (c.glass ? '_glass' : '_plain') + '.jpg';
    if ($('poster').getAttribute('src') !== src) $('poster').src = src;
  }
  function start3d() {
    if (H3 || loading3d) return; loading3d = true; view.classList.add('loading');
    import('./house3d.js').then(function (m) {
      m.mount(view); H3 = m;
      var v = viewModel(); return m.update(c, lastR.g, v.pid, v.s);
    }).then(function () {
      view.classList.remove('loading'); view.classList.add('live');
    }).catch(function () { loading3d = false; H3 = null; view.classList.remove('loading'); view.classList.add('fail'); });
  }
  $('go3d').addEventListener('click', start3d);
  /* на компьютере модель грузится сама, на телефоне — по нажатию */
  if (window.matchMedia('(min-width: 981px)').matches && !(navigator.connection && navigator.connection.saveData) && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start3d(); } }); io.observe(view);
  }

  /* ——— Смета ——— */
  function update() {
    var R = H.calc(c);
    $('areaOut').innerHTML = c.area + '&nbsp;м²';
    $('terOut').innerHTML = c.terrace ? c.terrace + '&nbsp;м²' : 'нет';
    var near = H.projects.slice().sort(function (a, b) { return Math.abs(a.area - c.area) - Math.abs(b.area - c.area); })[0];
    $('areaHint').innerHTML = 'Пятно застройки ' + (Math.round(R.g.w * 10) / 10).toLocaleString('ru-RU') + '&nbsp;×&nbsp;' + (Math.round(R.g.d * 10) / 10).toLocaleString('ru-RU') + '&nbsp;м. Ближе всего проект <a href="proekt.html?id=' + near.id + '">«' + near.name + '», ' + near.area + '&nbsp;м²</a>';
    [$('area'), $('terrace')].forEach(function (r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); });
    renderOpts(); draw(R);
    [].forEach.call(document.querySelectorAll('#presets .chip'), function (b) { b.setAttribute('aria-pressed', b.dataset.p === fromProject); });

    $('total').textContent = rub(R.total);
    $('barTotal').textContent = rub(R.total);
    $('fMat').textContent = H.short(R.mat); $('fWork').textContent = H.short(R.work);
    $('fWeeks').textContent = R.weeks + ' нед.';
    $('lines').innerHTML = R.lines.map(function (l) { return '<li><span>' + l.n + '</span><span>' + rub(l.sum) + '</span></li>'; }).join('');

    var hash = 0, js = JSON.stringify(c); for (var i = 0; i < js.length; i++) hash = (hash * 31 + js.charCodeAt(i)) % 9000;
    $('docNo').textContent = 'Смета № ХВ-' + (1000 + hash) + '/26';
    $('docDate').textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    $('docSub').innerHTML = (fromProject ? 'По проекту «' + H.projects.filter(function (p) { return p.id === fromProject; })[0].name + '». ' : '') +
      c.area + '&nbsp;м², ' + O.floors[c.floors].n.toLowerCase() + ', ' + O.wall[c.wall].n.toLowerCase() + ', ' + O.finish[c.finish].n.toLowerCase() + (c.terrace ? ', терраса ' + c.terrace + '&nbsp;м²' : '') + '.';
    $('docRows').innerHTML = R.lines.map(function (l) {
      var m = Math.round(l.sum * l.mat / 1000) * 1000;
      return '<div class="tr" role="row"><span role="cell"><b>' + l.n + '</b><small>' + nb(l.d) + '</small></span><span role="cell" data-l="Материалы">' + (m ? rub(m) : '—') + '</span><span role="cell" data-l="Работа">' + rub(l.sum - m) + '</span><span role="cell" data-l="Итого">' + rub(l.sum) + '</span></div>';
    }).join('');
    $('dMat').textContent = rub(R.mat); $('dWork').textContent = rub(R.work); $('dTotal').textContent = rub(R.total);
    $('dWeeks').textContent = R.weeks + ' недель';
    $('pays').innerHTML = H.payments(R).map(function (p) { return '<li><span>' + p[0] + '</span><b>' + rub(p[1]) + '</b></li>'; }).join('');

    var u = new URLSearchParams({ area: c.area, floors: c.floors, wall: c.wall, roof: c.roof, found: c.found, facade: c.facade, finish: c.finish, eng: c.eng.join(','), glass: c.glass ? 1 : 0, terrace: c.terrace });
    if (fromProject || projModel()) u.set('p', fromProject || baseP);
    history.replaceState(null, '', '?' + u.toString());
  }

  /* ——— Действия ——— */
  $('send').addEventListener('click', function () { window.showDemo(); });
  $('print').addEventListener('click', function () { window.print(); });
  $('copy').addEventListener('click', function () {
    var done = function () { $('copied').textContent = 'Ссылка скопирована — по ней откроется эта же смета'; setTimeout(function () { $('copied').textContent = ''; }, 3500); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () { prompt('Скопируйте ссылку:', location.href); });
    else prompt('Скопируйте ссылку:', location.href);
  });

  /* Нижняя плашка на телефоне прячется, когда смета на экране */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { $('bar').classList.toggle('hide', e.isIntersecting); }); }, { rootMargin: '0px 0px -30% 0px' }).observe($('doc'));
  }

  syncInputs(); update();
})();

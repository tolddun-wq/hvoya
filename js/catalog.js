/* Каталог проектов и страница проекта */
(function () {
  var H = window.HVOYA, O = H.opt, $ = function (id) { return document.getElementById(id); };
  var FLN = { '1': '1 этаж', '1.5': 'с мансардой', '2': '2 этажа' };
  function info(p) { var c = H.cfgFor(p.id), R = H.calc(c); return { c: c, R: R }; }
  function card(p) {
    var x = info(p);
    return '<a class="c-card" href="proekt.html?id=' + p.id + '">' +
      '<span class="c-img"><img src="img/ph/' + p.img + '-800.jpg" loading="lazy" alt="Проект «' + p.name + '»: ' + p.kind.toLowerCase() + '" width="800" height="600"><span class="c-tag">фото для примера</span></span>' +
      '<span class="c-body"><span class="c-top"><b class="c-name">' + p.name + '</b><span class="c-price">' + H.short(x.R.total) + '</span></span>' +
      '<span class="c-kind">' + p.kind + '</span>' +
      '<span class="c-facts"><span><b>' + p.area + '&nbsp;м²</b>площадь</span><span><b>' + p.bedrooms + '</b>' + H.pl(p.bedrooms, 'спальня', 'спальни', 'спален') + '</span><span><b>' + FLN[x.c.floors] + '</b>этажность</span><span><b>' + x.R.weeks + '&nbsp;нед.</b>срок</span></span>' +
      '<span class="c-mat">' + O.facade[x.c.facade].n + ' · ' + O.roof[x.c.roof].n.toLowerCase() + '</span></span></a>';
  }

  /* ——— каталог ——— */
  if ($('grid')) {
    var f = { floors: 'all', size: 'all', bed: 'all' };
    var q = new URLSearchParams(location.search); ['floors', 'size', 'bed'].forEach(function (k) { if (q.get(k)) f[k] = q.get(k); });
    function sync() {
      [].forEach.call(document.querySelectorAll('[data-f]'), function (g) {
        [].forEach.call(g.children, function (b) { b.setAttribute('aria-pressed', f[g.dataset.f] === b.dataset.v); });
      });
    }
    function render() {
      var list = H.projects.filter(function (p) {
        var c = H.cfgFor(p.id);
        if (f.floors !== 'all' && c.floors !== f.floors) return false;
        if (f.size === 's' && p.area >= 100) return false;
        if (f.size === 'm' && (p.area < 100 || p.area > 150)) return false;
        if (f.size === 'l' && p.area < 150) return false;
        if (f.bed !== 'all' && (f.bed === '4' ? p.bedrooms < 4 : p.bedrooms !== +f.bed)) return false;
        return true;
      });
      var s = $('sort').value;
      list.sort(function (a, b) { return s === 'price' ? a.price - b.price : s === 'price-d' ? b.price - a.price : s === 'area' ? a.area - b.area : a.weeks - b.weeks; });
      $('grid').innerHTML = list.map(card).join('');
      $('empty').hidden = list.length > 0;
      $('count').textContent = list.length ? 'Показано ' + list.length + ' ' + H.pl(list.length, 'проект', 'проекта', 'проектов') + ' из ' + H.projects.length : '';
      var u = new URLSearchParams(); ['floors', 'size', 'bed'].forEach(function (k) { if (f[k] !== 'all') u.set(k, f[k]); });
      history.replaceState(null, '', u.toString() ? '?' + u : location.pathname);
    }
    $('filters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      f[b.parentNode.dataset.f] = b.dataset.v; sync(); render();
    });
    $('sort').addEventListener('change', render);
    $('reset').addEventListener('click', function () { f = { floors: 'all', size: 'all', bed: 'all' }; sync(); render(); });
    sync(); render();
  }

  /* ——— страница проекта ——— */
  if ($('plans')) {
    var id = new URLSearchParams(location.search).get('id'), p = H.projects.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      ['hero', 'plans'].forEach(function () {});
      [].forEach.call(document.querySelectorAll('main > section, .pr-crumbs'), function (s) { if (s.id !== 'missing') s.hidden = true; });
      $('missing').hidden = false; document.title = 'Проект не найден — Хвоя'; return;
    }
    var x = info(p), c = x.c, R = x.R, g = R.g;
    document.title = 'Проект «' + p.name + '», ' + p.area + ' м² — каркасный дом под ключ — Хвоя';
    $('crumb').textContent = p.name;
    $('photo').src = 'img/ph/' + p.img + '-1600.jpg'; $('photo').alt = 'Проект «' + p.name + '»: ' + p.kind.toLowerCase();
    $('kind').textContent = p.kind;
    $('name').innerHTML = '«' + p.name + '»<br><em>' + p.area + '&nbsp;м²</em>';
    $('text').textContent = p.text;
    var roomsSum = p.rooms.filter(function (r) { return !r[2]; }).reduce(function (s, r) { return s + r[1]; }, 0);
    var mm = function (v) { return (Math.round(v * 10) / 10).toLocaleString('ru-RU'); };
    var facts = [
      ['Общая площадь', p.area + '&nbsp;м²'], ['Пятно застройки', mm(g.w) + '&nbsp;×&nbsp;' + mm(g.d) + '&nbsp;м'],
      ['Этажность', FLN[c.floors]], ['Спальни', p.bedrooms], ['Санузлы', p.baths],
      ['Терраса', c.terrace ? c.terrace + '&nbsp;м²' : 'нет'], ['Стены', O.wall[c.wall].n.toLowerCase()], ['Срок', R.weeks + '&nbsp;недель']
    ];
    $('facts').innerHTML = facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>'; }).join('');
    $('price').textContent = H.rub(R.total);
    $('pricenote').textContent = H.short(R.mat) + ' материалы, ' + H.short(R.work) + ' работа';
    ['toKonf', 'toKonf2'].forEach(function (k) { $(k).href = 'konfigurator.html?p=' + p.id; });

    /* схема планировки: комнаты пропорционально площади, по этажам */
    var living = p.rooms.filter(function (r) { return !r[2]; }), terrace = p.rooms.filter(function (r) { return r[2]; });
    var floorsN = c.floors === '1' ? 1 : 2, f1 = [], f2 = [], acc = 0, lim = roomsSum * (c.floors === '2' ? .5 : .6);
    var ground = /Кухн|Прихож|Холл|Котельн|Постироч|Тамбур|Гостин/;
    living.forEach(function (r) { if (floorsN === 1 || ground.test(r[0])) { f1.push(r); acc += r[1]; } });
    var rest = living.filter(function (r) { return floorsN > 1 && !ground.test(r[0]); }), wc = false;
    /* внизу — гостевая или кабинет и один санузел, остальное наверх */
    rest = rest.filter(function (r) { if (/Гостев|Кабинет/.test(r[0]) || (!wc && /Санузел/.test(r[0]) && (wc = true))) { f1.push(r); acc += r[1]; return false; } return true; });
    rest.forEach(function (r) { if (acc < lim * .8) { f1.push(r); acc += r[1]; } else f2.push(r); });
    if (floorsN === 2 && !f2.length) f2.push(f1.pop());
    function layout(items, x0, y0, w, h, out) {
      if (!items.length) return;
      if (items.length === 1) { out.push({ r: items[0], x: x0, y: y0, w: w, h: h }); return; }
      var tot = items.reduce(function (s, r) { return s + r[1]; }, 0), acc2 = 0, k = 0;
      while (k < items.length - 1 && acc2 + items[k][1] < tot / 2) { acc2 += items[k][1]; k++; }
      if (k === 0) { acc2 = items[0][1]; k = 1; }
      var a = items.slice(0, k), b = items.slice(k), t = acc2 / tot;
      if (w >= h) { layout(a, x0, y0, w * t, h, out); layout(b, x0 + w * t, y0, w * (1 - t), h, out); }
      else { layout(a, x0, y0, w, h * t, out); layout(b, x0, y0 + h * t, w, h * (1 - t), out); }
    }
    function planSvg(rooms, title, withTer) {
      var W = 560, sc = Math.min((W - 40) / g.w, 320 / g.d), pw = g.w * sc, ph = g.d * sc, ox = 20 + (withTer && terrace.length ? 0 : 0), oy = 40;
      var terW = withTer && terrace.length ? Math.min(120, terrace[0][1] / g.d * sc) : 0;
      ox = 20 + terW; var Wt = pw + terW + 40, Ht = ph + 80;
      var cells = []; layout(rooms.slice().sort(function (a, b) { return b[1] - a[1]; }), ox, oy, pw, ph, cells);
      var s = '<figure class="pr-fig"><figcaption><b>' + title + '</b> · ' + mm(rooms.reduce(function (s2, r) { return s2 + r[1]; }, 0)) + '&nbsp;м²</figcaption>' +
        '<svg viewBox="0 0 ' + Wt + ' ' + Ht + '" role="img" aria-label="' + title + ': схема планировки">';
      s += '<defs><pattern id="hatch' + title.length + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v6" stroke="rgba(31,36,28,.25)" stroke-width="1"/></pattern></defs>';
      if (terW) s += '<rect x="' + (ox - terW) + '" y="' + oy + '" width="' + terW + '" height="' + ph + '" fill="url(#hatch' + title.length + ')" stroke="#1F241C" stroke-width="1" stroke-dasharray="5 4"/><text x="' + (ox - terW / 2) + '" y="' + (oy + ph / 2) + '" class="pl-t" text-anchor="middle" transform="rotate(-90 ' + (ox - terW / 2) + ' ' + (oy + ph / 2) + ')">Терраса ' + terrace[0][1] + ' м²</text>';
      cells.forEach(function (q) {
        s += '<rect x="' + q.x + '" y="' + q.y + '" width="' + q.w + '" height="' + q.h + '" fill="#FBF9F4" stroke="#1F241C" stroke-width="2"/>';
        var big = q.w > 70 && q.h > 34, name = q.r[0];
        if (q.w > 46 && q.h > 26) {
          var fs = big ? 13 : 11, maxCh = Math.floor(q.w / (fs * .56));
          var nm = name.length > maxCh ? name.slice(0, Math.max(3, maxCh - 1)) + '…' : name;
          s += '<text x="' + (q.x + q.w / 2) + '" y="' + (q.y + q.h / 2 - 2) + '" class="pl-t" font-size="' + fs + '" text-anchor="middle">' + nm + '</text>';
          s += '<text x="' + (q.x + q.w / 2) + '" y="' + (q.y + q.h / 2 + fs) + '" class="pl-a" font-size="' + (fs - 1) + '" text-anchor="middle">' + q.r[1] + ' м²</text>';
        }
      });
      s += '<rect x="' + ox + '" y="' + oy + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="#1F241C" stroke-width="5"/>';
      s += '<g class="pl-d"><path d="M' + ox + ' ' + (oy - 18) + 'H' + (ox + pw) + 'M' + ox + ' ' + (oy - 24) + 'v12M' + (ox + pw) + ' ' + (oy - 24) + 'v12"/><text x="' + (ox + pw / 2) + '" y="' + (oy - 24) + '" text-anchor="middle">' + mm(g.w) + ' м</text>' +
        '<path d="M' + (ox + pw + 18) + ' ' + oy + 'V' + (oy + ph) + 'M' + (ox + pw + 12) + ' ' + oy + 'h12M' + (ox + pw + 12) + ' ' + (oy + ph) + 'h12"/><text x="' + (ox + pw + 24) + '" y="' + (oy + ph / 2) + '" transform="rotate(90 ' + (ox + pw + 24) + ' ' + (oy + ph / 2) + ')" text-anchor="middle">' + mm(g.d) + ' м</text></g>';
      return s + '</svg></figure>';
    }
    var html = planSvg(f1, floorsN === 2 ? '1 этаж' : 'План', true);
    if (floorsN === 2) html += planSvg(f2, c.floors === '1.5' ? 'Мансарда' : '2 этаж', false);
    html += '<div class="pr-rooms"><h3 class="pr-h3">Состав</h3><ul>' + p.rooms.map(function (r) { return '<li><span>' + r[0] + (r[2] ? ' <small>' + r[2] + '</small>' : '') + '</span><b>' + r[1] + '&nbsp;м²</b></li>'; }).join('') +
      '</ul><p class="small">' + (p.area - roomsSum > 2 ? 'Комнаты&nbsp;— ' + roomsSum + '&nbsp;м², общая площадь ' + p.area + '&nbsp;м²: остальное&nbsp;— стены, лестница и тамбур.' : 'Общая площадь ' + p.area + '&nbsp;м², терраса в неё не входит.') + '</p></div>';
    $('plans').innerHTML = html;

    /* смета */
    $('lines').innerHTML = R.lines.map(function (l) { return '<li><span>' + l.n + '<small>' + l.d + '</small></span><span>' + H.rub(l.sum) + '</span></li>'; }).join('');
    $('total').textContent = H.rub(R.total);
    $('matwork').textContent = 'Из них материалы с доставкой ' + H.rub(R.mat) + ', работа ' + H.rub(R.work) + '.';
    $('pays').innerHTML = H.payments(R).map(function (q) { return '<li><span>' + q[0] + '</span><b>' + H.rub(q[1]) + '</b></li>'; }).join('');

    /* 3D */
    $('poster').src = 'img/3d/p_' + p.id + '.jpg';
    $('mat3d').innerHTML = 'Фасад&nbsp;— ' + O.facade[c.facade].n.toLowerCase() + ', кровля&nbsp;— ' + O.roof[c.roof].n.toLowerCase() + ', фундамент&nbsp;— ' + O.found[c.found].n.toLowerCase() + (c.glass ? ', витраж во всю высоту' : '') + '. Поверните модель и посмотрите дом со всех сторон.';
    var view = $('view3d'), busy = false;
    function start() {
      if (busy) return; busy = true; view.classList.add('loading');
      import('./house3d.js').then(function (m) { m.mount(view); return m.update(c, g, p.id); }).then(function () { view.classList.remove('loading'); view.classList.add('live'); })
        .catch(function () { busy = false; view.classList.remove('loading'); view.classList.add('fail'); });
    }
    $('go3d').addEventListener('click', start);
    if (window.matchMedia('(min-width: 981px)').matches && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '200px' }); io.observe(view);
    }

    /* соседние проекты */
    var i = H.projects.indexOf(p), others = [1, 2, 3].map(function (k) { return H.projects[(i + k) % H.projects.length]; });
    $('more').innerHTML = others.map(card).join('');
  }
})();

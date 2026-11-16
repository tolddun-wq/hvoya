/* Страницы «Что входит» и «Этапы и сроки»: цифры из общей модели цен (price.js) */
(function () {
  var H = window.HVOYA, $ = function (id) { return document.getElementById(id); };
  var rub = H.rub;
  function proj(id) { return H.projects.filter(function (p) { return p.id === id; })[0]; }
  function chips(el, cur, on) {
    el.innerHTML = H.projects.map(function (p) {
      return '<button type="button" class="chip" data-p="' + p.id + '" aria-pressed="' + (p.id === cur) + '">' + p.name + ' · ' + p.area + '&nbsp;м²</button>';
    }).join('');
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]'); if (!b) return;
      [].forEach.call(el.children, function (x) { x.setAttribute('aria-pressed', x === b); });
      on(b.dataset.p);
    });
  }
  function startId(def) { var q = new URLSearchParams(location.search).get('p'); return proj(q) ? q : def; }

  /* ——— Что входит ——— */
  var LEVEL = {
    contour: function (c) { c.finish = 'none'; c.eng = []; return c; },
    rough: function (c) { c.finish = 'rough'; c.eng = ['elec', 'water', 'heat']; return c; },
    key: function (c) { if (c.finish === 'none' || c.finish === 'rough') c.finish = 'std'; return c; }
  };
  var RANK = { contour: 0, rough: 1, key: 2 };
  /* слои дома: [название, статьи сметы, [пункт, с какого уровня]] */
  var LAYERS = [
    ['Фундамент', ['found'], [['сваи или плита по грунту', 0], ['обвязка из лиственницы', 0], ['гидроизоляция', 0], ['разметка вместе с вами', 0]]],
    ['Каркас, стены и кровля', ['frame', 'roof'], [['сухая строганая доска', 0], ['утеплитель 150–250 мм', 0], ['пароизоляция и ветрозащита', 0], ['кровля с водостоками', 0], ['снегозадержатели', 0]]],
    ['Окна, двери, фасад', ['windows', 'glass', 'facade'], [['окна с тёплым монтажом', 0], ['входная дверь', 0], ['фасад и наличники', 0], ['подшивка свесов', 0]]],
    ['Инженерия', ['eng'], [['электрощит и проводка', 1], ['вода и канализация', 1], ['котёл и радиаторы', 1], ['розетки и свет', 2], ['сантехника', 2]]],
    ['Внутренняя отделка', ['finish'], [['стяжка и черновые полы', 1], ['стены и потолки под отделку', 1], ['чистовые полы', 2], ['покраска стен', 2], ['плитка в санузлах', 2], ['межкомнатные двери', 2]]],
    ['Терраса', ['terrace'], [['лиственница на сваях', 0], ['ступени', 0]]],
    ['Доставка и уборка', ['log'], [['своя машина и кран', 0], ['бытовка для бригады', 0], ['вывоз мусора', 0]]]
  ];
  function initScope() {
    var pid = startId('shuya'), lvl = 'key';
    chips($('vhProj'), pid, function (id) { pid = id; draw(); });
    $('vhLevel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-l]'); if (!b) return; lvl = b.dataset.l;
      [].forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', x === b); }); draw();
    });
    function draw() {
      var p = proj(pid), c = LEVEL[lvl](H.cfgFor(pid)), R = H.calc(c), r = RANK[lvl], left = 0;
      var by = {}; R.lines.forEach(function (l) { by[l.k] = l.sum; });
      $('vhLayers').innerHTML = LAYERS.map(function (L) {
        var sum = L[1].reduce(function (s, k) { return s + (by[k] || 0); }, 0);
        if (L[0] === 'Терраса' && !c.terrace) return '';
        var items = L[2].map(function (it) { var on = r >= it[1]; if (!on) left++; return '<li class="' + (on ? '' : 'no') + '">' + it[0] + '</li>'; }).join('');
        return '<div class="i-layer' + (sum ? '' : ' off') + '"><h3>' + L[0] + '</h3><span class="i-sumc">' + (sum ? rub(sum) : 'делаете сами') + '</span><ul>' + items + '</ul></div>';
      }).join('');
      $('vhImg').src = 'img/ph/' + p.img + '-800.jpg'; $('vhImg').alt = 'Дом по проекту «' + p.name + '»';
      $('vhName').innerHTML = '«' + p.name + '», ' + p.area + '&nbsp;м² · ' + { contour: 'тёплый контур', rough: 'под чистовую', key: 'под ключ' }[lvl];
      $('vhTotal').textContent = rub(R.total);
      $('vhSplit').textContent = 'материалы ' + rub(R.mat) + ', работа ' + rub(R.work);
      $('vhWeeks').textContent = R.weeks + ' ' + H.pl(R.weeks, 'неделя', 'недели', 'недель');
      $('vhLeft').textContent = left ? left + ' ' + H.pl(left, 'пункт', 'пункта', 'пунктов') : 'ничего';
      var u = new URLSearchParams({ p: pid }); if (lvl !== 'key') u.set('level', lvl);
      $('vhGo').href = 'konfigurator.html?' + u.toString();
    }
    draw();
  }

  /* ——— Этапы и сроки ——— */
  var STAGES = [
    { n: 'Фундамент', img: 'stage-foundation', d: 'Проба грунта, разметка с вами, сваи или плита, обвязка.' },
    { n: 'Каркас и кровля', img: 'stage-frame', d: 'Стены собираем на участке, ставим стропила и кровлю. В конце Иван принимает каркас.' },
    { n: 'Тёплый контур', img: 'stage-membrane', d: 'Утеплитель, мембраны, окна, двери и фасад. С этого момента дом можно греть.' },
    { n: 'Инженерия', img: 'stage-contour', d: 'Электрика, вода, канализация, отопление. Всё до закрытия стен, по схеме из проекта.' },
    { n: 'Отделка и сдача', img: 'int-light', d: 'Полы, стены, санузлы, двери, терраса. Уборка, акт, ключи.' }
  ];
  function plan(c, R) {
    var W = R.weeks, fi = H.opt.finish[c.finish];
    var w = [2 + (c.found === 'slab' ? 1 : 0), Math.max(3, Math.round(c.area / 40) + 2), Math.max(2, Math.round(c.area / 60) + 1),
      c.eng.length ? Math.max(1, Math.round(c.area / 70)) : 0, 0];
    var used = w.reduce(function (s, x) { return s + x; }, 0);
    w[4] = Math.max(c.finish === 'none' ? 0 : 1, W - used);
    if (c.finish === 'none') w[2] += W - used;   /* без отделки остаток уходит в контур */
    return w;
  }
  function initPlan() {
    var pid = startId('onego');
    chips($('etProj'), pid, function (id) { pid = id; draw(); });
    function draw() {
      var p = proj(pid), c = H.cfgFor(pid), R = H.calc(c), w = plan(c, R), N = w.reduce(function (s, x) { return s + x; }, 0);
      var pays = H.payments(R), payBy = {};
      pays.forEach(function (q) { payBy[q[0]] = q[1]; });
      var payName = ['После фундамента', 'После каркаса и кровли', 'После тёплого контура', 'После инженерии', 'При сдаче дома'];
      var rows = document.querySelector('.i-plan'); rows.style.setProperty('--n', N);
      $('etTotal').innerHTML = N + '&nbsp;' + H.pl(N, 'неделя', 'недели', 'недель');
      $('etSub').innerHTML = '«' + p.name + '», ' + p.area + '&nbsp;м², под ключ · ' + rub(R.total) + ' · аванс при подписании ' + rub(pays[0][1]);
      var ax = ''; for (var i = 1; i <= N; i++) ax += '<span>' + i + '</span>';
      $('etAxis').innerHTML = '<div class="ax" style="--n:' + N + '">' + ax + '</div>';
      var at = 0;
      $('etRows').innerHTML = STAGES.map(function (s, k) {
        if (!w[k]) return '';
        var a = at + 1, b = at + w[k]; at = b;
        var pay = payBy[payName[k]];
        return '<li class="i-row"><div class="lab"><img src="img/ph/' + s.img + '-800.jpg" width="72" height="56" loading="lazy" alt=""><div><b>' + s.n + '</b><span>' +
          (a === b ? 'неделя ' + a : 'недели ' + a + '–' + b) + ' · ' + w[k] + '&nbsp;' + H.pl(w[k], 'неделя', 'недели', 'недель') + '</span></div></div>' +
          '<div class="track" style="--n:' + N + '"><span class="bar" style="grid-column:' + a + '/' + (b + 1) + ';animation-delay:' + (k * .08) + 's">' + w[k] + '&nbsp;нед.</span>' +
          (pay ? '<span class="pay" style="grid-column:' + Math.max(1, Math.min(b, N - 3)) + '/span 4">' + rub(pay) + '</span>' : '') + '</div>' +
          '<p class="det">' + s.d + '</p></li>';
      }).join('');
    }
    draw();
  }

  if ($('vhLayers')) initScope();
  if ($('etRows')) initPlan();
})();

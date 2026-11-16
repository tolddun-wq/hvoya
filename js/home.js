/* Главная: точки на фото, ползунок «до и после», быстрый расчёт, проекты */
(function () {
  var H = window.HVOYA;
  /* Неразрывные пробелы: «4,2 м», «в доме», «— ниже» */
  function nb(t) {
    return t.replace(/(\d) (?=(м²|м|мм|кг|₽|%|дн|недел|сва|раз))/g, '$1 ')
      .replace(/(^|[\s(«])(в|и|с|к|у|о|а|на|по|за|до|от|не|из|под|без|для|что|это) /gi, '$1$2 ')
      .replace(/ —/g, ' —');
  }

  /* ——— Точки на доме ——— */
  var SPOTS = {
    glass: { t: 'Витраж во всю высоту', d: 'Тёплый алюминиевый профиль, двухкамерный стеклопакет с энергосберегающим стеклом. 4,2 м по высоте, ставим краном за один день.', p: 486000 },
    roof:  { t: 'Кровля, фальц', d: 'Стальной фальц с полимерным покрытием по сплошной обрешётке, утепление 250 мм. Снег сходит сам, ничего не гремит под дождём.', p: 612000 },
    deck:  { t: 'Терраса 24 м²', d: 'Лиственница 28 мм на отдельных сваях, ограждение из тросов. Входит в комплектацию «Под ключ», можно убрать и сэкономить.', p: 318000 },
    piles: { t: 'Винтовые сваи', d: '32 сваи Ø 108 мм с оголовками, глубина 2,5 м — ниже промерзания. Ставим за два дня, в любое время года.', p: 312000 }
  };
  var RO = H.calc(H.cfgFor('onego')), TOTAL = RO.total;
  RO.lines.forEach(function (l) { var m = { glass: 'glass', roof: 'roof', terrace: 'deck', found: 'piles' }[l.k]; if (m) SPOTS[m].p = l.sum; });
  var hp = document.getElementById('hcPrice'); if (hp) hp.textContent = 'от ' + H.rub(TOTAL);
  var hw = document.getElementById('hcWeeks'); if (hw) hw.textContent = RO.weeks + ' недель';
  var hero = document.getElementById('hero');
  var img = document.getElementById('heroImg');
  var pop = document.getElementById('pop');
  var spots = [].slice.call(document.querySelectorAll('.spot'));

  function hostRect() {
    var r = img.parentElement.getBoundingClientRect();
    return r.width ? r : hero.getBoundingClientRect();
  }
  function place() {
    var box = img.getBoundingClientRect(), host = hostRect();
    var nw = 2400, nh = 1600, s = Math.max(box.width / nw, box.height / nh);
    var w = nw * s, h = nh * s;
    var pos = getComputedStyle(img).objectPosition.split(' ');
    var px = parseFloat(pos[0]) / 100, py = parseFloat(pos[1]) / 100;
    var ox = (box.width - w) * px, oy = (box.height - h) * py;
    var card = hero.querySelector('.hcard'), over = window.innerWidth <= 980 ? Math.max(0, -parseFloat(getComputedStyle(card).marginTop) || 0) : 0;
    var bottomGap = window.innerWidth <= 980 ? over + 22 : 8;
    var blockers = [].map.call(hero.querySelectorAll(window.innerWidth > 980 ? 'h1, .intro, .meta, .hcard' : 'h1, .meta'), function (el) { return el.getBoundingClientRect(); })
      .filter(function (r) { return r.width > 0; });
    spots.forEach(function (sp) {
      var ix = ox + sp.dataset.x * w, iy = oy + sp.dataset.y * h;   /* внутри фото */
      var x = ix + box.left - host.left, y = iy + box.top - host.top;
      sp.style.left = x + 'px'; sp.style.top = y + 'px';
      var cx = ix + box.left, cy = iy + box.top;
      var onTitle = blockers.some(function (r) { return cx > r.left - 20 && cx < r.right + 20 && cy > r.top - 20 && cy < r.bottom + 20; });
      sp.hidden = ix < 16 || ix > box.width - 16 || iy < 80 || iy > box.height - bottomGap || onTitle;
    });
  }
  function closePop() {
    pop.hidden = true;
    spots.forEach(function (s) { s.setAttribute('aria-expanded', 'false'); });
  }
  function openPop(sp) {
    var d = SPOTS[sp.dataset.spot], share = Math.round(d.p / TOTAL * 1000) / 10;
    pop.innerHTML = '<button class="x" type="button" aria-label="Закрыть">×</button><h3>' + d.t + '</h3><p>' + nb(d.d) + '</p>' +
      '<div class="row"><span>В смете «Онего»</span><b>' + H.rub(d.p) + '</b></div>' +
      '<div class="bar"><i style="width:' + share * 3 + '%"></i></div><p class="cap" style="margin-top:6px">' + String(share).replace('.', ',') + '&nbsp;% от стоимости дома</p>';
    pop.hidden = false;
    spots.forEach(function (s) { s.setAttribute('aria-expanded', s === sp ? 'true' : 'false'); });
    if (window.innerWidth > 640) {
      var x = parseFloat(sp.style.left) + 24, y = parseFloat(sp.style.top) - 20;
      var host = hostRect();
      if (x + 320 > host.width) x = parseFloat(sp.style.left) - 324;
      var maxY = host.height - pop.offsetHeight - 16;
      pop.style.left = x + 'px'; pop.style.top = Math.max(80, Math.min(y, maxY)) + 'px';
    }
    pop.querySelector('.x').addEventListener('click', closePop);
  }
  var hoverable = window.matchMedia('(hover:hover)');
  var leaveT = null;
  function leaveSoon() { clearTimeout(leaveT); leaveT = setTimeout(closePop, 180); }
  spots.forEach(function (sp) {
    sp.addEventListener('click', function (e) {
      e.stopPropagation();
      if (hoverable.matches && sp.getAttribute('aria-expanded') === 'true') return;
      sp.getAttribute('aria-expanded') === 'true' ? closePop() : openPop(sp);
    });
    sp.addEventListener('mouseenter', function () { if (hoverable.matches) { clearTimeout(leaveT); openPop(sp); } });
    sp.addEventListener('mouseleave', function () { if (hoverable.matches) leaveSoon(); });
    sp.addEventListener('focus', function () { openPop(sp); });
    sp.addEventListener('blur', function () { leaveSoon(); });
  });
  pop.addEventListener('mouseenter', function () { clearTimeout(leaveT); });
  pop.addEventListener('mouseleave', function () { if (hoverable.matches) leaveSoon(); });
  document.addEventListener('click', function (e) { if (!pop.contains(e.target)) closePop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });
  if (img.complete) place(); else img.addEventListener('load', place);
  window.addEventListener('resize', place);
  if (document.fonts) { document.fonts.ready.then(place); document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', place); }
  place();

  /* ——— До / после ——— */
  var ba = document.getElementById('ba');
  var range = ba.querySelector('input');
  function setX(v) {
    v = Math.max(0, Math.min(100, v));
    ba.style.setProperty('--x', v + '%');
    range.value = Math.round(v);
    ba.classList.toggle('far', v > 62);
  }
  range.addEventListener('input', function () { setX(+range.value); ba.classList.add('used'); });
  var dragging = false;
  function fromEvent(e) { var r = ba.getBoundingClientRect(); setX((e.clientX - r.left) / r.width * 100); }
  ba.addEventListener('pointerdown', function (e) {
    dragging = true; ba.classList.add('drag', 'used');
    try { ba.setPointerCapture(e.pointerId); } catch (er) {}
    fromEvent(e);
  });
  ba.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) {
    ba.addEventListener(n, function () { dragging = false; ba.classList.remove('drag'); });
  });
  ba.addEventListener('dragstart', function (e) { e.preventDefault(); });
  var STAGES = {
    foundation: { img: 'stage-foundation', tag: 'Неделя 1 · фундамент', note: 'размечаем участок вместе с вами', t: 'Фундамент: сваи или плита — по грунту', x: 'Перед стройкой берём пробу грунта. На торфе и глине ставим винтовые сваи, на песке можно утеплённую плиту. Иван приезжает на разметку, чтобы дом стоял так, как вы хотели смотреть из окна.' },
    frame: { img: 'stage-frame', tag: 'Неделя 4 · каркас', note: 'доска камерной сушки, 12 % влажности', t: 'Каркас: обвязка, перекрытие и стойки', x: 'Обвязка на гидроизоляции, перекрытие из клеёных балок. Доска строганая, сухая — поэтому дом не «поведёт» через год, а стены останутся ровными.' },
    walls: { img: 'stage-walls', tag: 'Неделя 6 · стены', note: 'стены собираем прямо на участке — за три дня', t: 'Стены: панели собираем на участке и поднимаем вручную', x: 'Каркас из сухой строганой доски 50×200, шаг стоек 600 мм. В эту неделю Иван приезжает на приёмку: проверяет узлы, крепёж и геометрию, и только после этого бригада ставит утеплитель.' },
    roof: { img: 'stage-roof', tag: 'Неделя 8 · кровля', note: 'фермы считаем под снег Карелии', t: 'Кровля: стропила, мембрана, металл', x: 'Стропильная система рассчитана на снеговую нагрузку 180 кг/м² — с запасом для северных зим. После кровли дом закрыт от дождя, внутри можно работать в любую погоду.' },
    contour: { img: 'stage-contour', tag: 'Неделя 11 · контур', note: 'окна, двери, ветрозащита — дом закрыт', t: 'Тёплый контур: окна, двери, утепление', x: 'Ставим окна в тёплый монтаж, закрываем стены ветрозащитой и утеплителем 200 мм. На этом этапе можно остановиться и доделывать дом самим — это комплектация «Тёплый контур».' }
  };
  var before = document.getElementById('baStage');
  [].forEach.call(document.querySelectorAll('[data-stage]'), function (b) {
    b.addEventListener('click', function () {
      var s = STAGES[b.dataset.stage];
      before.srcset = 'img/ph/' + s.img + '-800.jpg 800w, img/ph/' + s.img + '-1600.jpg 1600w';
      before.src = 'img/ph/' + s.img + '-1600.jpg';
      document.getElementById('baTag').textContent = s.tag;
      document.getElementById('baNote').textContent = nb(s.note);
      document.getElementById('stTitle').textContent = nb(s.t);
      document.getElementById('stText').textContent = nb(s.x);
      [].forEach.call(document.querySelectorAll('[data-stage]'), function (o) { o.setAttribute('aria-pressed', o === b); });
    });
  });

  /* ——— Быстрый расчёт ——— */
  var st = { area: 120, floors: '1.5', level: 'turnkey' };
  var area = document.getElementById('cArea');
  function nearest(a) {
    var ps = H.projects.slice().sort(function (x, y) { return Math.abs(x.area - a) - Math.abs(y.area - a); });
    return ps[0];
  }
  function calc() {
    var L = H.levels[st.level], F = H.floors[st.floors];
    var total = Math.round(st.area * L.rate * F.k / 10000) * 10000;
    var parts = st.level === 'contour' ? [['Фундамент на сваях', .12], ['Каркас, стены, перекрытия', .5], ['Кровля', .18], ['Окна и двери', .2]]
      : st.level === 'rough' ? [['Фундамент на сваях', .08], ['Каркас, стены, кровля', .5], ['Окна и двери', .14], ['Инженерия', .28]]
      : [['Фундамент и коробка', .45], ['Окна, двери, фасад', .17], ['Инженерия', .18], ['Внутренняя отделка', .2]];
    document.getElementById('cAreaOut').innerHTML = st.area + '&nbsp;м²';
    var n = nearest(st.area);
    document.getElementById('cAreaHint').textContent = 'ближе всего «' + n.name + '», ' + n.area + ' м²: ' + n.bedrooms + ' ' + (n.bedrooms < 5 ? 'спальни' : 'спален');
    document.getElementById('cLevelHint').textContent = L.note;
    document.getElementById('cTotal').innerHTML = H.rub(total);
    var mat = Math.round(total * .58 / 1000) * 1000;
    document.getElementById('cLines').innerHTML = parts.map(function (p) { return '<li><span>' + p[0] + '</span><span>' + H.rub(Math.round(total * p[1] / 1000) * 1000) + '</span></li>'; }).join('') +
      '<li class="mat"><span>В том числе материалы с доставкой</span><span>' + H.rub(mat) + '</span></li>';
    document.getElementById('cGo').href = 'konfigurator.html?area=' + st.area + '&floors=' + st.floors + '&level=' + st.level;
    area.style.setProperty('--p', ((st.area - 60) / 160 * 100) + '%');
  }
  area.addEventListener('input', function () { st.area = +area.value; calc(); });
  [].forEach.call(document.querySelectorAll('#calc [data-floors],#calc [data-level]'), function (b) {
    b.addEventListener('click', function () {
      var key = b.dataset.floors ? 'floors' : 'level';
      st[key] = b.dataset[key];
      [].forEach.call(document.querySelectorAll('#calc [data-' + key + ']'), function (o) { o.setAttribute('aria-pressed', o === b); });
      calc();
    });
  });
  calc();

  /* ——— Обещания основателя: на телефоне раскрываются ——— */
  [].forEach.call(document.querySelectorAll('.promises > div'), function (d) {
    var b = d.querySelector('b');
    b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0');
    function t() {
      if (window.innerWidth > 640) return;
      var o = !d.classList.contains('open');
      [].forEach.call(document.querySelectorAll('.promises > div.open'), function (x) { x.classList.remove('open'); x.querySelector('b').setAttribute('aria-expanded', 'false'); });
      d.classList.toggle('open', o); b.setAttribute('aria-expanded', o);
    }
    b.addEventListener('click', t);
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } });
  });

  /* ——— Проекты ——— */
  var order = ['onego', 'kizhi', 'shuya', 'kivach', 'suna'], cls = ['a', 'b', 'c', 'd', 'e'];
  var html = order.map(function (id, i) {
    var p = H.projects.filter(function (x) { return x.id === id; })[0];
    return '<a class="pcard ' + cls[i] + '" href="proekt.html?id=' + p.id + '">' +
      '<img src="img/ph/' + (i === 0 ? 'int-onego-1600' : p.img + '-800') + '.jpg" loading="lazy" alt="Проект «' + p.name + '»: ' + (i === 0 ? 'кухня-гостиная со вторым светом и витражом' : p.kind.toLowerCase()) + '">' +
      '<span class="tg">' + p.kind + '</span>' +
      '<span class="info"><span class="nm">' + p.name + '<small>' + p.area + ' м² · ' + p.bedrooms + ' спальни · ' + p.weeks + ' недель</small></span>' +
      '<span class="pr">под ключ<b>' + H.short(p.price) + '</b></span></span></a>';
  }).join('');
  html += '<a class="all" href="proekty.html"><span class="kick" style="color:rgba(241,238,230,.6)">Ещё три: «Выг», «Ладога», «Сегозеро»</span><b>Все<br><em>проекты</em> →</b></a>';
  document.getElementById('pgrid').innerHTML = html;
})();

/* Модель цены «Хвоя». Одна на весь сайт: конфигуратор, проекты и главная берут цифры отсюда.
   Цены ориентировочные: Карелия, осень 2026, работа + материалы с доставкой. */
(function (H) {
  var O = {
    floors: {
      '1':   { n: 'Одноэтажный', d: 'всё на одном уровне, без лестниц', fp: 1,    roof: 1.35, h: 3.1 },
      '1.5': { n: 'С мансардой', d: 'спальни под крышей, второй свет', fp: 1.55, roof: 1.75, h: 4.3 },
      '2':   { n: 'Два этажа',   d: 'меньше пятно застройки и кровля', fp: 2,    roof: 1.3,  h: 6.0 }
    },
    wall: {
      w150: { n: 'Каркас 150 мм', d: 'для дачи и межсезонья', rate: 14600, u: '0,29' },
      w200: { n: 'Каркас 200 мм', d: 'круглый год, наш стандарт', rate: 16400, u: '0,22' },
      w250: { n: 'Каркас 250 мм', d: 'почти пассивный дом, отопление дешевле', rate: 18700, u: '0,17' }
    },
    roof: {
      tile:  { n: 'Металлочерепица', d: 'недорого, служит 25–30 лет', rate: 3300 },
      soft:  { n: 'Гибкая черепица', d: 'тихая, для сложных крыш', rate: 4300 },
      falz:  { n: 'Фальцевая кровля', d: 'без видимого крепежа, 50 лет', rate: 5650 },
      flat:  { n: 'Плоская кровля', d: 'мембрана ПВХ, для одноэтажных', rate: 4600, flat: true }
    },
    found: {
      piles: { n: 'Винтовые сваи', d: 'Ø 108 мм, ниже промерзания, любой грунт', rate: 5000 },
      strip: { n: 'Мелкозаглублённая лента', d: 'для плотных грунтов и цоколя', rate: 6900 },
      slab:  { n: 'Утеплённая плита (УШП)', d: 'плита с тёплым полом внутри', rate: 8600 }
    },
    facade: {
      imit:  { n: 'Имитация бруса', d: 'привычный «деревенский» вид', rate: 2700 },
      panel: { n: 'Фиброцементные панели', d: 'не красить 20 лет', rate: 4300 },
      plank: { n: 'Планкен из лиственницы', d: 'ровные доски, сереют благородно', rate: 5200 },
      char:  { n: 'Обожжённая доска', d: 'тёмная, по японской технике, не гниёт', rate: 5600 }
    },
    finish: {
      none:  { n: 'Без отделки', d: 'тёплый контур, доделываете сами', rate: 0, wk: 0 },
      rough: { n: 'Черновая', d: 'стяжка, ГКЛ, разводка — под вашу чистовую', rate: 5200, wk: 2 },
      std:   { n: 'Под ключ', d: 'полы, стены, сантехника, двери — можно жить', rate: 10400, wk: 4 },
      prem:  { n: 'Под ключ, дерево', d: 'массив дуба, деревянные потолки, кухня', rate: 16800, wk: 6 }
    },
    eng: {
      elec:  { n: 'Электрика', d: 'щит, кабель в гофре, розетки и свет', rate: 2300, per: 'area' },
      water: { n: 'Вода и канализация', d: 'разводка, бойлер, сантехника', rate: 1800, per: 'area' },
      heat:  { n: 'Отопление', d: 'электрокотёл и радиаторы', rate: 2100, per: 'area' },
      floor: { n: 'Тёплый пол', d: 'на первом этаже, водяной', rate: 1900, per: 'fp' },
      vent:  { n: 'Вентиляция с рекуперацией', d: 'свежий воздух без сквозняков', rate: 2600, per: 'area' },
      well:  { n: 'Скважина и септик', d: 'на участке, под ключ', rate: 420000, per: 'fix' }
    }
  };
  H.opt = O;

  H.defaults = { area: 120, floors: '1.5', wall: 'w200', roof: 'falz', found: 'piles', facade: 'plank', finish: 'std',
    eng: ['elec', 'water', 'heat', 'well'], glass: false, terrace: 16 };

  H.cfgs = {   /* у каждого проекта свой набор материалов — дома не похожи друг на друга */
    onego:    { area: 96,  floors: '1.5', facade: 'plank', roof: 'falz', glass: true, terrace: 24 },
    suna:     { area: 84,  floors: '1', roof: 'flat', facade: 'char', terrace: 18 },
    vyg:      { area: 118, floors: '2', roof: 'tile', facade: 'imit', terrace: 0 },
    shuya:    { area: 128, floors: '1.5', facade: 'plank', roof: 'tile', found: 'strip', terrace: 30, eng: ['elec', 'water', 'heat', 'floor', 'well'] },
    kizhi:    { area: 142, floors: '2', facade: 'char', roof: 'falz', terrace: 12, eng: ['elec', 'water', 'heat', 'floor', 'well'] },
    kivach:   { area: 154, floors: '1.5', roof: 'soft', facade: 'imit', terrace: 36 },
    ladoga:   { area: 176, floors: '2', wall: 'w250', facade: 'plank', roof: 'falz', glass: true, terrace: 48, eng: ['elec', 'water', 'heat', 'floor', 'vent', 'well'] },
    segozero: { area: 196, floors: '2', roof: 'falz', facade: 'plank', found: 'strip', terrace: 24 }
  };
  H.cfgFor = function (id) {
    var c = JSON.parse(JSON.stringify(H.defaults)), o = H.cfgs[id] || {};
    for (var k in o) c[k] = Array.isArray(o[k]) ? o[k].slice() : o[k];
    return c;
  };

  /* Геометрия: пятно застройки, кровля, фасад */
  H.geom = function (c) {
    var F = O.floors[c.floors], fp = c.area / F.fp;
    var flat = O.roof[c.roof].flat;
    var w = Math.sqrt(fp * 1.3), d = fp / w;
    return { fp: fp, w: w, d: d, roof: fp * (flat ? 1.08 : F.roof), facade: (2 * (w + d)) * F.h * 0.82 };
  };

  /* Смета: строки [ключ, название, описание, сумма, доля материалов, этап] */
  /* custom — геометрия из своего чертежа: { fp, w, d, roof, facade, win, door } */
  H.calc = function (c, custom) {
    var g = custom || H.geom(c), L = [];
    function add(k, n, d, sum, mat, st) { if (sum > 0) L.push({ k: k, n: n, d: d, sum: Math.round(sum / 1000) * 1000, mat: mat, st: st }); }
    var f = O.found[c.found], w = O.wall[c.wall], r = O.roof[c.roof], fa = O.facade[c.facade], fi = O.finish[c.finish];
    add('found', 'Фундамент', f.n + ', ' + fmt(g.fp) + ' м² пятна', f.rate * g.fp, .62, 1);
    add('frame', 'Каркас, стены, перекрытия', w.n + ', сухая доска, утеплитель', w.rate * c.area, .6, 2);
    add('roof', 'Кровля', r.n + ', ' + fmt(g.roof) + ' м²', r.rate * g.roof, .66, 2);
    if (custom) add('windows', 'Окна и двери', custom.win + ' ' + pl(custom.win, 'окно', 'окна', 'окон') + ', ' + custom.door + ' ' + pl(custom.door, 'дверь', 'двери', 'дверей') + ', крыльцо с навесом', custom.win * 46000 + custom.door * 165000, .72, 3);
    else add('windows', 'Окна и двери', 'тёплый монтаж, двухкамерный стеклопакет', 4800 * c.area, .72, 3);
    if (c.glass) add('glass', 'Витраж во всю высоту', 'алюминиевый профиль, 4,2 м', 486000, .78, 3);
    add('facade', 'Фасад', fa.n + ', ' + fmt(g.facade) + ' м²', fa.rate * g.facade, .6, 3);
    var eng = 0, en = [];
    (c.eng || []).forEach(function (k) {
      var e = O.eng[k]; if (!e) return;
      eng += e.per === 'fix' ? e.rate : e.rate * (e.per === 'fp' ? g.fp : c.area); en.push(e.n.toLowerCase());
    });
    add('eng', 'Инженерия', en.length ? cap(en.join(', ')) : '', eng, .5, 4);
    add('finish', 'Внутренняя отделка', fi.n + ': ' + fi.d, fi.rate * c.area, .55, 5);
    add('terrace', 'Терраса', fmt(c.terrace) + ' м², лиственница на сваях', 13250 * c.terrace, .58, 5);
    var sub = L.reduce(function (s, l) { return s + l.sum; }, 0);
    add('log', 'Доставка, бытовка, вывоз мусора', 'своя машина, кран на витраж и фермы', sub * .02, 0, 1);
    var total = L.reduce(function (s, l) { return s + l.sum; }, 0);
    var mat = L.reduce(function (s, l) { return s + l.sum * l.mat; }, 0);
    var weeks = Math.round(6 + c.area / 12 + fi.wk + (c.found === 'slab' ? 1 : 0));
    return { lines: L, total: total, mat: Math.round(mat / 1000) * 1000, work: total - Math.round(mat / 1000) * 1000, weeks: weeks, g: g };
  };

  /* Оплата: аванс 10 %, остальное — по этапам пропорционально сделанному */
  H.payments = function (R) {
    var names = ['Аванс при подписании', 'После фундамента', 'После каркаса и кровли', 'После тёплого контура', 'После инженерии', 'При сдаче дома'];
    var by = [0, 0, 0, 0, 0, 0];
    R.lines.forEach(function (l) { by[l.st] += l.sum; });
    var adv = Math.round(R.total * .1 / 1000) * 1000, rest = R.total - adv, out = [[names[0], adv]], acc = adv;
    for (var i = 1; i < 6; i++) {
      if (!by[i]) continue;
      var v = Math.round(rest * by[i] / (R.total) / 1000) * 1000;
      out.push([names[i], v]); acc += v;
    }
    out[out.length - 1][1] += R.total - acc;
    return out;
  };

  function pl(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
  H.pl = pl;
  function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString('ru-RU'); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Цены и сроки проектов — из той же модели */
  H.projects.forEach(function (p) { var R = H.calc(H.cfgFor(p.id)); p.price = R.total; p.weeks = R.weeks; });
})(window.HVOYA);

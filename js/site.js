/* Общее для всех страниц: плашка пробного сайта, меню на телефоне */
(function () {
  var demo = document.getElementById('demo');
  var last = null;
  function open(e) {
    if (e) e.preventDefault();
    last = document.activeElement;
    demo.hidden = false;
    var b = demo.querySelector('.btn');
    if (b) b.focus();
  }
  function close() {
    demo.hidden = true;
    if (last) last.focus();
  }
  window.showDemo = open;
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-demo]');
    if (t) open(e);
    if (e.target.closest('[data-close]') || e.target === demo) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && demo && !demo.hidden) close();
  });

  var nav = document.getElementById('nav');
  var burger = nav && nav.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () {
    var o = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', o);
  });
})();

/* Плавное появление: блок всплывает, когда доходит до экрана; соседние — с небольшой задержкой друг за другом */
(function () {
  var html = document.documentElement;
  if (!html.classList.contains('rv')) return;
  var SEL = '.hero h1,.hero .intro,.hero .hcard,.k-head>*,.sec-head>*,.pr-crumbs,.founder>*,.terms .side,.clauses li,.ba,.stages,.stage-text,.calc,.pgrid,.people,.review>*,.final,.c-filters,.c-grid>*,.pr-plan>*,.pr-3d-grid>*,.pr-est>*,.i-pick,.i-layers,.i-sum,.i-not li,.i-own>*,.i-plan,.i-meet li,.i-winter>*,.i-years,.i-bars li,.i-steps li,.i-ex>*,.i-doc>*,.i-404>*';
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  function scan() {
    [].forEach.call(document.querySelectorAll(SEL), function (el) {
      if (el.dataset.rv) return; el.dataset.rv = 1;
      var sib = [].filter.call(el.parentNode.children, function (x) { return x.matches(SEL); });
      el.style.setProperty('--rvd', Math.min(sib.indexOf(el), 5) * .08 + 's');
      io.observe(el);
    });
  }
  function start() { scan(); new MutationObserver(scan).observe(document.querySelector('main') || document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

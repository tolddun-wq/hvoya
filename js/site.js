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

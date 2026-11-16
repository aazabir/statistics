(function () {
  var GC = 'https://statisticsbook.goatcounter.com';
  function hit(path, title) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: path, title: title, event: true });
      }
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/\.pdf($|[?#])/i.test(h)) hit('pdf-download', 'PDF download');
    else if (h.indexOf('play.google.com') > -1) hit('app-click', 'App link click');
  }, true);
  var box = document.getElementById('dlCount');
  if (box && window.fetch) {
    fetch(GC + '/counter/pdf-download.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.count) return;
        var n = String(d.count).replace(/\s/g, ',');
        if (n === '0') return;
        box.textContent = n + ' downloads so far';
        box.hidden = false;
      })
      .catch(function () {});
  }
})();

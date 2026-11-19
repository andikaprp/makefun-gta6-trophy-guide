// Leonida Legend - router and wiring.
// Loads the two data files that ship inside app/, builds the tracker,
// and renders one of four hash routes: the board, a trophy detail,
// the roadmap, and the method page. Everything runs from local files;
// there are no network calls beyond the same-folder data reads.
(function () {
  'use strict';

  var tracker = window.LeonidaTracker.create();
  var views = window.LeonidaViews;

  var state = {
    trophies: [],
    roadmap: [],
    tracker: tracker,
    filters: { kind: 'all', grade: 'all', query: '' }
  };

  var rootEl = document.getElementById('app');
  var dialogEl = document.getElementById('io-dialog');
  var dialogTitleEl = document.getElementById('io-title');
  var dialogTextEl = document.getElementById('io-text');
  var dialogMode = 'export';

  function parseRoute() {
    var hash = window.location.hash || '#/board';
    var parts = hash.replace(/^#\//, '').split('/');
    if (parts[0] === 'trophy' && parts[1]) {
      return { name: 'detail', id: Number(parts[1]) };
    }
    if (parts[0] === 'roadmap') return { name: 'roadmap' };
    if (parts[0] === 'method') return { name: 'method' };
    return { name: 'board' };
  }

  function render() {
    var route = parseRoute();
    var body = '';
    if (route.name === 'detail') {
      var trophy = null;
      state.trophies.forEach(function (t) { if (t.id === route.id) trophy = t; });
      body = trophy ? views.detail(state, trophy)
        : '<p class="empty-note">That trophy is not in the verified list. <a href="#/board">Back to the board</a></p>';
    } else if (route.name === 'roadmap') {
      body = views.roadmap(state);
    } else if (route.name === 'method') {
      body = views.method(state);
    } else {
      body = views.board(state);
    }
    rootEl.innerHTML = views.header(state.trophies, tracker, route.name) +
      '<main class="page">' + body + '</main>' + views.footer();
    wirePage();
    window.scrollTo(0, 0);
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function openExport() {
    dialogMode = 'export';
    dialogTitleEl.textContent = 'Export progress';
    dialogTextEl.value = tracker.exportJSON();
    dialogTextEl.readOnly = true;
    if (typeof dialogEl.showModal === 'function') dialogEl.showModal();
  }

  function openImport() {
    dialogMode = 'import';
    dialogTitleEl.textContent = 'Import progress';
    dialogTextEl.value = '';
    dialogTextEl.readOnly = false;
    if (typeof dialogEl.showModal === 'function') dialogEl.showModal();
  }

  function wirePage() {
    rootEl.querySelectorAll('[data-action="toggle"]').forEach(function (el) {
      el.addEventListener('change', function () {
        tracker.setDone(Number(el.getAttribute('data-id')), el.checked);
        render();
      });
      el.addEventListener('click', function () {
        if (el.tagName === 'BUTTON') {
          tracker.toggle(Number(el.getAttribute('data-id')));
          render();
        }
      });
    });
    rootEl.querySelectorAll('[data-action="export"]').forEach(function (el) {
      el.addEventListener('click', openExport);
    });
    rootEl.querySelectorAll('[data-action="import"]').forEach(function (el) {
      el.addEventListener('click', openImport);
    });
    rootEl.querySelectorAll('[data-action="spoilers"]').forEach(function (el) {
      el.addEventListener('change', function () {
        tracker.setSetting('hideSpoilers', el.checked);
        render();
      });
    });
    rootEl.querySelectorAll('[data-filter]').forEach(function (el) {
      var key = el.getAttribute('data-filter');
      var eventName = el.tagName === 'INPUT' ? 'input' : 'change';
      el.addEventListener(eventName, function () {
        state.filters[key] = el.value;
        if (eventName === 'input') {
          // Keep the caret: re-render only the results region by
          // re-running the board render without scrolling.
          var y = window.scrollY;
          render();
          window.scrollTo(0, y);
          var again = rootEl.querySelector('[data-filter="query"]');
          if (again) {
            again.focus();
            again.setSelectionRange(again.value.length, again.value.length);
          }
        } else {
          render();
        }
      });
    });
  }

  document.getElementById('io-apply').addEventListener('click', function () {
    if (dialogMode === 'export') {
      download('leonida-legend-progress.json', dialogTextEl.value);
      dialogEl.close();
      return;
    }
    try {
      var count = tracker.importJSON(dialogTextEl.value);
      dialogEl.close();
      render();
      window.alert('Imported: ' + count + ' trophies marked earned.');
    } catch (err) {
      window.alert('Import failed: ' + err.message);
    }
  });
  document.getElementById('io-close').addEventListener('click', function () {
    dialogEl.close();
  });

  function boot() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      tracker.seedDemo();
    }
    Promise.all([
      fetch('data/trophies.json').then(function (r) { return r.json(); }),
      fetch('data/roadmap.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
      state.trophies = results[0].trophies || [];
      state.roadmap = results[1].steps || [];
      render();
    }).catch(function (err) {
      rootEl.innerHTML = '<main class="page"><p class="empty-note">The guide data could not be loaded (' +
        String(err) + '). Leonida Legend needs its data files beside the page; make sure the whole app folder was kept together.</p></main>';
    });
  }

  window.addEventListener('hashchange', render);
  boot();
})();

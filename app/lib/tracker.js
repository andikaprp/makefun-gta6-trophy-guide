// Leonida Legend - progress store.
// All state lives in localStorage on this device only. Nothing is sent
// anywhere: the guide works fully offline and the tracker is private
// by construction. Progress can be carried between devices with the
// export / import JSON pair below.
(function (global) {
  'use strict';

  var STORAGE_KEY = 'leonida-legend-progress-v1';
  var SETTINGS_KEY = 'leonida-legend-settings-v1';

  // The honest demo sample: ten trophies a player plausibly holds a
  // few hours in - the prologue, Chapter 1, two campaign missions,
  // two strand finales, and four early activities. Used only when the
  // page is opened with ?demo=1 (screenshots and first-look tours).
  var DEMO_IDS = [1, 2, 7, 8, 15, 19, 20, 21, 24, 54];

  function readJSON(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Storage full or blocked: the session still works in memory.
    }
  }

  function createTracker() {
    var done = readJSON(STORAGE_KEY, {});
    var settings = readJSON(SETTINGS_KEY, { hideSpoilers: true });

    function persist() {
      writeJSON(STORAGE_KEY, done);
    }

    function persistSettings() {
      writeJSON(SETTINGS_KEY, settings);
    }

    return {
      isDone: function (id) {
        return done[String(id)] === true;
      },
      setDone: function (id, value) {
        if (value) done[String(id)] = true;
        else delete done[String(id)];
        persist();
      },
      toggle: function (id) {
        var next = !this.isDone(id);
        this.setDone(id, next);
        return next;
      },
      countDone: function () {
        return Object.keys(done).length;
      },
      doneIds: function () {
        return Object.keys(done).map(function (k) { return Number(k); });
      },
      clearAll: function () {
        done = {};
        persist();
      },
      getSetting: function (name) {
        return settings[name];
      },
      setSetting: function (name, value) {
        settings[name] = value;
        persistSettings();
      },
      exportJSON: function () {
        return JSON.stringify({
          app: 'leonida-legend',
          version: 1,
          exported: 'local tracker export',
          done: this.doneIds().sort(function (a, b) { return a - b; }),
          settings: settings
        }, null, 2);
      },
      importJSON: function (text) {
        var data = JSON.parse(text);
        if (!data || !Array.isArray(data.done)) {
          throw new Error('That file does not look like a Leonida Legend export.');
        }
        var next = {};
        data.done.forEach(function (id) {
          if (Number.isInteger(id)) next[String(id)] = true;
        });
        done = next;
        if (data.settings && typeof data.settings === 'object') {
          settings = Object.assign({}, settings, data.settings);
          persistSettings();
        }
        persist();
        return Object.keys(done).length;
      },
      seedDemo: function () {
        var next = {};
        DEMO_IDS.forEach(function (id) { next[String(id)] = true; });
        done = next;
        persist();
        return DEMO_IDS.length;
      },
      demoIds: DEMO_IDS.slice()
    };
  }

  global.LeonidaTracker = { create: createTracker, DEMO_IDS: DEMO_IDS.slice() };
})(typeof window !== 'undefined' ? window : this);

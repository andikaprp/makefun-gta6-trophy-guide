// Leonida Legend - view renderers.
// Pure string builders: each function takes the loaded data plus the
// tracker and returns the HTML for one route. app.js owns the DOM,
// the router and every event listener; nothing here touches storage.
(function (global) {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var GRADE_LABEL = {
    platinum: 'Platinum',
    gold: 'Gold',
    silver: 'Silver',
    bronze: 'Bronze'
  };

  var KIND_LABEL = {
    story: 'Story',
    activities: 'Activities',
    collectibles: 'Collectibles',
    completion: 'Completion',
    platinum: 'Platinum'
  };

  function gradeChip(trophy) {
    return '<span class="chip chip-grade chip-' + esc(trophy.grade) + '">' +
      esc(GRADE_LABEL[trophy.grade] || trophy.grade) + '</span>';
  }

  function flagChips(trophy) {
    var out = '';
    if (trophy.hidden) out += '<span class="chip chip-flag">Hidden</span>';
    if (trophy.missable) out += '<span class="chip chip-watch">Missable watch</span>';
    if (trophy.count) out += '<span class="chip chip-count">' + esc(trophy.count) + '</span>';
    return out;
  }

  // Spoiler rule: a hidden trophy that is story-kind stays masked
  // (name and description) until the player has earned it, unless
  // the player turned the spoiler shield off in the board controls.
  function isMasked(trophy, tracker) {
    if (!tracker.getSetting('hideSpoilers')) return false;
    return trophy.hidden === true && trophy.type === 'story' && !tracker.isDone(trophy.id);
  }

  function displayName(trophy, tracker) {
    return isMasked(trophy, tracker) ? 'Hidden trophy' : trophy.name;
  }

  function displayDescription(trophy, tracker) {
    if (isMasked(trophy, tracker)) {
      return 'Spoiler shield on: the name and description stay covered until you earn this one.';
    }
    return trophy.description;
  }

  function progressSummary(trophies, tracker) {
    var total = trophies.length;
    var doneCount = 0;
    var perGrade = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
    trophies.forEach(function (t) {
      perGrade[t.grade][1] += 1;
      if (tracker.isDone(t.id)) {
        doneCount += 1;
        perGrade[t.grade][0] += 1;
      }
    });
    var pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
    return { total: total, done: doneCount, pct: pct, perGrade: perGrade };
  }

  function headerHTML(trophies, tracker, activeRoute) {
    var s = progressSummary(trophies, tracker);
    var gradeBits = ['platinum', 'gold', 'silver', 'bronze'].map(function (g) {
      return '<span class="tally tally-' + g + '">' + GRADE_LABEL[g] + ' ' +
        s.perGrade[g][0] + '/' + s.perGrade[g][1] + '</span>';
    }).join('');
    var nav = [
      ['board', 'Trophy board'],
      ['roadmap', 'Roadmap'],
      ['method', 'How this was verified']
    ].map(function (item) {
      var cls = item[0] === activeRoute ? ' class="nav-link is-active"' : ' class="nav-link"';
      return '<a' + cls + ' href="#/' + item[0] + '">' + item[1] + '</a>';
    }).join('');
    return '' +
      '<header class="masthead">' +
        '<div class="masthead-top">' +
          '<div>' +
            '<p class="kicker">State of Leonida &middot; PlayStation 5</p>' +
            '<h1 class="brand">Leonida Legend</h1>' +
            '<p class="tagline">The offline GTA VI trophy guide and tracker, built on the verified 55-trophy list.</p>' +
          '</div>' +
          '<div class="ledger-card" aria-label="Overall progress">' +
            '<div class="ledger-pct">' + s.pct + '%</div>' +
            '<div class="ledger-count">' + s.done + ' of ' + s.total + ' trophies</div>' +
            '<div class="ledger-bar"><span style="width:' + s.pct + '%"></span></div>' +
            '<div class="ledger-grades">' + gradeBits + '</div>' +
          '</div>' +
        '</div>' +
        '<nav class="main-nav">' + nav + '</nav>' +
        '<div class="io-row">' +
          '<button type="button" class="btn btn-io" data-action="export">Export progress</button>' +
          '<button type="button" class="btn btn-io" data-action="import">Import progress</button>' +
          '<span class="io-note">Progress lives only in this browser. Export makes a small JSON file you can keep or move.</span>' +
        '</div>' +
      '</header>';
  }

  function trophyCard(trophy, tracker) {
    var done = tracker.isDone(trophy.id);
    var masked = isMasked(trophy, tracker);
    return '' +
      '<article class="card' + (done ? ' is-done' : '') + (masked ? ' is-masked' : '') + '">' +
        '<div class="card-top">' +
          '<label class="check">' +
            '<input type="checkbox" data-action="toggle" data-id="' + trophy.id + '"' + (done ? ' checked' : '') + '>' +
            '<span class="check-box" aria-hidden="true"></span>' +
            '<span class="check-label">' + (done ? 'Earned' : 'Mark earned') + '</span>' +
          '</label>' +
          '<span class="card-step">Step ' + trophy.roadmap_step + '</span>' +
        '</div>' +
        '<h3 class="card-name"><a href="#/trophy/' + trophy.id + '">' + esc(displayName(trophy, tracker)) + '</a></h3>' +
        '<p class="card-desc">' + esc(displayDescription(trophy, tracker)) + '</p>' +
        '<div class="chip-row">' + gradeChip(trophy) +
          '<span class="chip chip-kind">' + esc(KIND_LABEL[trophy.type] || trophy.type) + '</span>' +
          flagChips(trophy) +
        '</div>' +
      '</article>';
  }

  function boardView(state) {
    var trophies = state.trophies;
    var tracker = state.tracker;
    var filters = state.filters;
    var shieldOn = tracker.getSetting('hideSpoilers') !== false;

    var kindOptions = [
      ['all', 'All kinds'],
      ['story', 'Story'],
      ['missable', 'Missable watch'],
      ['collectibles', 'Collectibles'],
      ['activities', 'Activities'],
      ['completion', 'Completion']
    ].map(function (o) {
      return '<option value="' + o[0] + '"' + (filters.kind === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
    var gradeOptions = [
      ['all', 'All grades'],
      ['platinum', 'Platinum'],
      ['gold', 'Gold'],
      ['silver', 'Silver'],
      ['bronze', 'Bronze']
    ].map(function (o) {
      return '<option value="' + o[0] + '"' + (filters.grade === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');

    var visible = trophies.filter(function (t) {
      if (filters.kind === 'missable' && !t.missable) return false;
      if (filters.kind !== 'all' && filters.kind !== 'missable' && t.type !== filters.kind) return false;
      if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
      if (filters.query) {
        var hay = (t.name + ' ' + t.description + ' ' + t.type + ' ' + t.grade).toLowerCase();
        if (hay.indexOf(filters.query.toLowerCase()) === -1) return false;
      }
      return true;
    });

    var groups = [];
    var byStep = {};
    visible.forEach(function (t) {
      if (!byStep[t.roadmap_step]) {
        byStep[t.roadmap_step] = [];
        groups.push(t.roadmap_step);
      }
      byStep[t.roadmap_step].push(t);
    });
    groups.sort(function (a, b) { return a - b; });

    var stepTitles = {};
    state.roadmap.forEach(function (s) { stepTitles[s.step] = s.title; });

    var sections = groups.map(function (step) {
      var cards = byStep[step].map(function (t) { return trophyCard(t, tracker); }).join('');
      var earnedHere = byStep[step].filter(function (t) { return tracker.isDone(t.id); }).length;
      return '<section class="board-group">' +
        '<h2 class="group-title">Step ' + step + ' &middot; ' + esc(stepTitles[step] || '') +
        ' <span class="group-count">' + byStep[step].length + ' shown &middot; ' + earnedHere + ' earned</span></h2>' +
        '<div class="card-grid">' + cards + '</div></section>';
    }).join('');

    if (!visible.length) {
      sections = '<p class="empty-note">No trophies match those filters. Loosen the search or pick another kind.</p>';
    }

    return '' +
      '<section class="controls" aria-label="Board controls">' +
        '<label class="ctl">Kind <select data-filter="kind">' + kindOptions + '</select></label>' +
        '<label class="ctl">Grade <select data-filter="grade">' + gradeOptions + '</select></label>' +
        '<label class="ctl ctl-search">Search <input type="search" data-filter="query" placeholder="Name, mission, activity..." value="' + esc(filters.query) + '"></label>' +
        '<label class="ctl ctl-check"><input type="checkbox" data-action="spoilers"' + (shieldOn ? ' checked' : '') + '> Spoiler shield: cover hidden story trophies until earned</label>' +
      '</section>' +
      '<p class="board-note">' + visible.length + ' of ' + trophies.length + ' trophies shown. ' +
        'One trophy is on missable watch: <a href="#/trophy/27">Positive Mental Attitude</a>.</p>' +
      sections;
  }

  function detailView(state, trophy) {
    var tracker = state.tracker;
    var done = tracker.isDone(trophy.id);
    var masked = isMasked(trophy, tracker);
    var sourceNames = trophy.sources.map(function (s) { return s.name; }).join(', ');
    var missableBlock = '';
    if (trophy.missable) {
      missableBlock = '<div class="watch-box">' +
        '<h2>Missable watch</h2>' +
        '<p>' + esc(trophy.missable_note || '') + '</p>' +
        '<p>The safe habit: meditate at each meditation spot the first time you reach it, especially the Chapter 1 spots, instead of saving them all for the endgame.</p>' +
        '</div>';
    }
    var step = null;
    state.roadmap.forEach(function (s) { if (s.step === trophy.roadmap_step) step = s; });
    return '' +
      '<p class="crumb"><a href="#/board">&larr; Back to the board</a></p>' +
      '<article class="detail">' +
        '<div class="detail-head">' +
          '<h1>' + esc(displayName(trophy, tracker)) + '</h1>' +
          '<div class="chip-row">' + gradeChip(trophy) +
            '<span class="chip chip-kind">' + esc(KIND_LABEL[trophy.type] || trophy.type) + '</span>' +
            flagChips(trophy) + '</div>' +
        '</div>' +
        '<p class="detail-desc">' + esc(displayDescription(trophy, tracker)) + '</p>' +
        (masked ? '<p class="masked-note">This is a hidden story trophy and the spoiler shield is on. Its guide stays covered here too; mark it earned on the board once it unlocks, or switch the shield off on the board.</p>' : '') +
        missableBlock +
        '<h2>Guide</h2>' +
        '<p class="guide-text">' + (masked ? 'Covered by the spoiler shield.' : esc(trophy.guide)) + '</p>' +
        '<p class="sources-line">Sources for this entry: ' + esc(sourceNames) + '.</p>' +
        (step ? '<p class="step-line">Roadmap placement: Step ' + step.step + ' &middot; ' + esc(step.title) +
          ' &mdash; <a href="#/roadmap">see the roadmap</a></p>' : '') +
        '<div class="detail-actions">' +
          '<button type="button" class="btn btn-toggle" data-action="toggle" data-id="' + trophy.id + '">' +
            (done ? 'Earned &mdash; tap to undo' : 'Mark as earned') + '</button>' +
        '</div>' +
      '</article>';
  }

  function roadmapView(state) {
    var tracker = state.tracker;
    var byId = {};
    state.trophies.forEach(function (t) { byId[t.id] = t; });
    var steps = state.roadmap.map(function (step) {
      var rows = step.trophy_ns.map(function (id) {
        var t = byId[id];
        if (!t) return '';
        var done = tracker.isDone(t.id);
        return '<li class="road-row' + (done ? ' is-done' : '') + '">' +
          '<span class="road-state">' + (done ? 'Earned' : 'Open') + '</span>' +
          '<a href="#/trophy/' + t.id + '">' + esc(displayName(t, tracker)) + '</a>' +
          '<span class="road-meta">' + esc(GRADE_LABEL[t.grade] || t.grade) + ' &middot; ' +
            esc(KIND_LABEL[t.type] || t.type) + (t.missable ? ' &middot; missable watch' : '') + '</span>' +
          '</li>';
      }).join('');
      var doneCount = step.trophy_ns.filter(function (id) { return tracker.isDone(id); }).length;
      return '<section class="road-step">' +
        '<h2>Step ' + step.step + ' &middot; ' + esc(step.title) +
          ' <span class="group-count">' + doneCount + '/' + step.trophy_ns.length + ' earned</span></h2>' +
        '<p class="road-summary">' + esc(step.summary) + '</p>' +
        '<ul class="road-list">' + rows + '</ul></section>';
    }).join('');
    return '' +
      '<div class="watch-box watch-box-road">' +
        '<h2>Missable watch: Positive Mental Attitude</h2>' +
        '<p>One trophy carries a live warning. Meditate at every spot across Leonida asks for all 18 meditation spots, and its missable status is still under investigation at launch (per PowerPyx and U7Buy): a Chapter 1 spot may not be reachable again later.</p>' +
        '<p><strong>The habit that keeps you safe:</strong> meditate at each spot the first time you reach it, starting in Chapter 1, rather than saving the sweep for the endgame. Full entry: <a href="#/trophy/27">Positive Mental Attitude</a>.</p>' +
      '</div>' +
      '<h1 class="view-title">Roadmap to the platinum</h1>' +
      '<p class="view-lede">Seven steps, in the order a first playthrough should meet them. Every one of the 55 trophies sits in exactly one step.</p>' +
      steps;
  }

  function methodView(state) {
    return '' +
      '<h1 class="view-title">How this list was verified</h1>' +
      '<div class="prose">' +
      '<p>Leonida Legend does not copy a single site and hope. The 55-trophy list was verified on 2026-11-19 by cross-checking two independent platform pipelines:</p>' +
      '<ul>' +
        '<li><strong>PlayStation side:</strong> PSN trophy data as published by Exophase.</li>' +
        '<li><strong>Xbox side:</strong> the Xbox catalog data as published by XCT.live, with TrueAchievements as a second Xbox-side read.</li>' +
      '</ul>' +
      '<p>The two pipelines agreed on every one of the 55 names, descriptions and grades: 1 platinum, 2 gold, 6 silver and 46 bronze, with 28 hidden trophies. Where guide sites were used, each trophy guide names its basis in its own text - PowerPyx for roadmap order and the missable investigation, Output Lag for the hidden-trophy readings, Press Start, Push Square, GTABase and U7Buy where they corroborated a detail.</p>' +
      '<h2>The honesty note</h2>' +
      '<p>Five hidden trophies are cryptic by design, and at launch no confirmed unlock method was in print for them. Their guides in this app begin <strong>METHOD UNCONFIRMED</strong> and say exactly what is known - the official description and the most careful reading of it - instead of inventing a method. They are: In The Beginning&hellip;, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, and Ten Pin (whose description is concrete but whose setup is unproven).</p>' +
      '<p>One more open question is flagged rather than buried: Positive Mental Attitude is listed as the game&rsquo;s only possible missable, with its status still under investigation. This guide treats it as a watch item from Step 1 onward.</p>' +
      '<h2>Sources named in this guide</h2>' +
      '<p>Exophase (PSN), XCT.live (Xbox catalog), TrueAchievements, PowerPyx, Output Lag, Press Start, Push Square, GTABase, U7Buy, and PSNProfiles list data for tracked counts. Every trophy page names the sources behind its own entry.</p>' +
      '<h2>About this app</h2>' +
      '<p>Leonida Legend is an original, unofficial fan guide. It runs fully offline, stores progress only in your browser, and uses no Rockstar artwork or logos. Grand Theft Auto VI is a trademark of its respective owner; this guide is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.</p>' +
      '</div>';
  }

  function footerHTML() {
    return '<footer class="site-foot">' +
      '<p>Leonida Legend &middot; an original offline guide &middot; the verified 55: 1 platinum, 2 gold, 6 silver, 46 bronze &middot; 28 hidden, 1 on missable watch.</p>' +
      '</footer>';
  }

  global.LeonidaViews = {
    header: headerHTML,
    board: boardView,
    detail: detailView,
    roadmap: roadmapView,
    method: methodView,
    footer: footerHTML,
    isMasked: isMasked
  };
})(typeof window !== 'undefined' ? window : this);

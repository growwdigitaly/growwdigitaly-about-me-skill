/* About Me: runs entirely in the browser. No network requests, no tracking. */
(function () {
  'use strict';

  var STEPS = window.ABOUT_ME_QUESTIONS;
  var TOTAL = STEPS.length;
  var QBY = {};
  STEPS.forEach(function (q) { QBY[q.n] = q; });
  var KEY = 'about-me-v1';
  var STATE_VERSION = 2;
  var main = document.getElementById('main');
  var storageOK = true;

  var OUTCOMES = [
    { value: 'Success', label: 'It worked' },
    { value: 'Failure', label: 'It failed' },
    { value: 'Mixed', label: 'A bit of both' }
  ];
  var CASE_FIELDS = [
    { key: 'situation', label: 'What was the situation or brief? Include the starting numbers if you have them.' },
    { key: 'did', label: 'What did you do?' },
    { key: 'result', label: 'Where did it land? Share the numbers.' },
    { key: 'learned', label: 'What did you learn, or what would you do differently?' }
  ];

  /* ---------- State ---------- */

  function blankCase() { return { title: '', outcome: '', situation: '', did: '', result: '', learned: '' }; }

  function blank() {
    return { v: STATE_VERSION, started: false, screen: 'welcome', step: 0, answers: {}, cases: [blankCase()],
      name: '', nameEdited: false, slug: '', slugEdited: false };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && typeof s === 'object') {
          var b = blank();
          Object.keys(b).forEach(function (k) { if (s[k] !== undefined) b[k] = s[k]; });
          if (!b.answers || typeof b.answers !== 'object') b.answers = {};
          if (!Array.isArray(b.cases) || !b.cases.length) b.cases = [blankCase()];
          b.cases = b.cases.map(function (c) { return Object.assign(blankCase(), c); });
          if (s.v !== STATE_VERSION) b.step = 0; /* questions were reorganised: restart at the top, answers are kept */
          b.v = STATE_VERSION;
          b.step = Math.min(Math.max(parseInt(b.step, 10) || 0, 0), TOTAL - 1);
          if (['welcome', 'interview', 'review', 'finish'].indexOf(b.screen) < 0) b.screen = 'welcome';
          return b;
        }
      }
    } catch (e) { storageOK = false; }
    return blank();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { storageOK = false; }
  }

  try { localStorage.setItem(KEY + '-test', '1'); localStorage.removeItem(KEY + '-test'); } catch (e) { storageOK = false; }

  var state = load();

  /* ---------- Helpers ---------- */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function answerOf(n) { return String(state.answers[n] || '').trim(); }

  function caseHasContent(c) {
    return !!(String(c.title).trim() || c.outcome || String(c.situation).trim() || String(c.did).trim() || String(c.result).trim() || String(c.learned).trim());
  }

  function stepAnswered(q) {
    if (q.type === 'cases') return state.cases.some(caseHasContent);
    return !!answerOf(q.n);
  }

  function answeredCount() {
    var c = 0;
    STEPS.forEach(function (q) { if (stepAnswered(q)) c++; });
    return c;
  }

  function hasProgress() { return state.started && (answeredCount() > 0 || state.screen !== 'welcome'); }

  /* ---------- Speech input (browser built-in, optional) ---------- */

  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = null;
  var listening = false;
  var lastBox = null;

  function speechLang() {
    var e = state.answers[4];
    if (e === 'British') return 'en-GB';
    if (e === 'American') return 'en-US';
    return navigator.language || 'en-GB';
  }

  function stopListening() {
    if (recognition) {
      try { recognition.onend = null; recognition.stop(); } catch (e) { /* already stopped */ }
    }
    recognition = null;
    listening = false;
  }

  function setMicUI(on, message) {
    var btn = document.getElementById('mic');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? 'Stop listening' : 'Speak your answer';
    }
    var msg = document.getElementById('voice-msg');
    if (msg) msg.textContent = message || '';
  }

  function toggleMic() {
    if (!SpeechRec) return;
    if (listening) { stopListening(); setMicUI(false); return; }
    var box = (lastBox && document.body.contains(lastBox)) ? lastBox : main.querySelector('textarea');
    if (!box) return;

    var base = box.value;
    if (base && !/\s$/.test(base)) base += ' ';
    var finalText = '';
    var rec = new SpeechRec();
    rec.lang = speechLang();
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = function (ev) {
      var interim = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      box.value = base + finalText + interim;
      onBoxInput(box);
    };
    rec.onerror = function (ev) {
      var m = 'Speech input stopped. You can keep typing.';
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') m = 'Microphone access was blocked. You can keep typing, or allow the microphone in your browser settings.';
      else if (ev.error === 'no-speech') m = 'I could not hear anything. Try again, or keep typing.';
      else if (ev.error === 'network') m = 'Speech input needs an internet connection in this browser. You can keep typing.';
      stopListening();
      setMicUI(false, m);
    };
    rec.onend = function () {
      box.value = base + finalText;
      onBoxInput(box);
      listening = false;
      recognition = null;
      setMicUI(false);
    };

    try {
      rec.start();
      recognition = rec;
      listening = true;
      setMicUI(true, '');
    } catch (e) {
      setMicUI(false, 'Could not start speech input. You can keep typing.');
    }
  }

  function voiceHTML(note) {
    if (!SpeechRec) return '';
    return '<div class="voice"><button class="btn" type="button" id="mic" data-action="mic" aria-pressed="false">Speak your answer</button>' +
      '<p class="voice-note" id="voice-note">Some browsers may process speech through their own online service.' + (note ? ' ' + note : '') + '</p></div>' +
      '<p class="voice-msg" id="voice-msg" role="status"></p>';
  }

  /* ---------- Screens ---------- */

  function render(focusSelector) {
    stopListening();
    lastBox = null;
    var html = '';
    if (state.screen === 'welcome') html = welcomeHTML();
    else if (state.screen === 'interview') html = interviewHTML();
    else if (state.screen === 'review') html = reviewHTML();
    else html = finishHTML();
    main.innerHTML = html;

    if (state.screen === 'interview') {
      var q = STEPS[state.step];
      var fill = document.getElementById('bar-fill');
      if (fill) fill.style.width = Math.round(((state.step + 1) / TOTAL) * 100) + '%';
      if (q.type !== 'cases' && q.type !== 'choice') updateNudge(q.n);
    }
    if (state.screen === 'finish') refreshSkill();
    if (state.screen === 'review') {
      Array.prototype.forEach.call(main.querySelectorAll('textarea.review-box'), autosize);
    }

    var target = focusSelector ? main.querySelector(focusSelector) : null;
    if (!target) target = main.querySelector('[data-focus]');
    if (target) target.focus({ preventScroll: false }); else main.focus();
  }

  function go(screen, focusSelector) {
    state.screen = screen;
    if (screen !== 'welcome') state.started = true;
    save();
    render(focusSelector);
    window.scrollTo(0, 0);
  }

  function welcomeHTML() {
    var resume = hasProgress();
    var n = answeredCount();
    return '<section>' +
      '<h1 data-focus tabindex="-1">About Me</h1>' +
      '<p class="lead">This will take about 20 to 40 minutes, but it solves a real, big problem: AI content that sounds like everyone else. Answer in detail, and you\'ll get a skill file that helps Claude write in your voice.</p>' +
      '<p>Your answers stay in this browser. You can stop and come back anytime.</p>' +
      (storageOK ? '' : '<p class="notice" role="alert">This browser is not letting us save your answers automatically (private browsing can do this). You can still go through the questions, but please finish in one sitting.</p>') +
      (resume ? '<p class="muted">Welcome back. You have answered ' + n + ' of ' + TOTAL + ' questions.</p>' : '') +
      '<div class="actions"><button class="btn primary" type="button" data-action="start">' + (resume ? 'Continue' : 'Start') + '</button>' +
      (resume ? '<button class="btn" type="button" data-action="editAnswers">Review and edit my answers</button>' : '') + '</div>' +
      '</section>';
  }

  function hintsHTML(q) {
    var h = '<p class="hint" id="hint-main">Please answer in as much detail as you can. Real examples, names and numbers make your skill sound like you.</p>';
    if (q.moreCases) h += '<p class="hint" id="hint-cases">Share as many case studies and examples as you can.</p>';
    return h;
  }

  function casesHTML(prefix) {
    var h = '';
    state.cases.forEach(function (c, i) {
      var id = prefix + i;
      h += '<fieldset class="case-card" data-case-card="' + i + '"><legend>Case study or experiment ' + (i + 1) + '</legend>' +
        '<div class="case-field"><label for="' + id + '-title">Name it (for example, the project, client or experiment)</label>' +
        '<input type="text" id="' + id + '-title" data-case="' + i + '" data-field="title" autocomplete="off" value="' + esc(c.title) + '"></div>' +
        '<div class="case-field"><span class="case-label" id="' + id + '-outcome-label">How did it turn out?</span>' +
        '<div class="choice row" role="radiogroup" aria-labelledby="' + id + '-outcome-label">';
      OUTCOMES.forEach(function (o) {
        h += '<label><input type="radio" name="' + id + '-outcome" data-case-outcome="' + i + '" value="' + o.value + '"' + (c.outcome === o.value ? ' checked' : '') + '> ' + esc(o.label) + '</label>';
      });
      h += '</div></div>';
      CASE_FIELDS.forEach(function (f) {
        h += '<div class="case-field"><label for="' + id + '-' + f.key + '">' + esc(f.label) + '</label>' +
          '<textarea class="review-box" id="' + id + '-' + f.key + '" data-case="' + i + '" data-field="' + f.key + '">' + esc(c[f.key]) + '</textarea></div>';
      });
      h += '<button class="link-btn" type="button" data-action="removeCase" data-index="' + i + '">Remove this case study</button></fieldset>';
    });
    h += '<div class="actions"><button class="btn" type="button" data-action="addCase">Add another case study or experiment</button></div>';
    return h;
  }

  function interviewHTML() {
    var q = STEPS[state.step];
    var left = TOTAL - (state.step + 1);
    var isLast = state.step === TOTAL - 1;
    var h = '<section>' +
      '<p class="progress-text" id="progress-text" aria-live="polite">Question ' + (state.step + 1) + ' of ' + TOTAL + ', ' + left + (left === 1 ? ' question' : ' questions') + ' left</p>' +
      '<div class="bar" role="progressbar" aria-label="Interview progress" aria-valuemin="1" aria-valuemax="' + TOTAL + '" aria-valuenow="' + (state.step + 1) + '"><span id="bar-fill"></span></div>' +
      '<p class="eyebrow">' + esc(q.section) + '</p>';

    if (q.type === 'choice') {
      var cur = state.answers[q.n] || '';
      h += '<fieldset aria-describedby="hint-main"><legend class="question">' + esc(q.text) + '</legend><div class="choice">';
      q.options.forEach(function (o, i) {
        h += '<label><input type="radio" name="lang" value="' + esc(o.value) + '"' + (cur === o.value ? ' checked' : '') + (i === 0 ? ' data-focus' : '') + '> ' + esc(o.label) + '</label>';
      });
      h += '</div></fieldset>' + hintsHTML(q);
    } else if (q.type === 'cases') {
      h += '<h2 class="question" id="cases-title" data-focus tabindex="-1">' + esc(q.text) + '</h2>' +
        '<p class="hint" id="hint-main">Please answer in as much detail as you can. Real examples, names and numbers make your skill sound like you.</p>' +
        '<p class="hint" id="hint-cases">Share as many case studies and examples as you can. One card per case study; leave it empty if you have none to add.</p>' +
        casesHTML('c') + voiceHTML('Tap into a box first, then use the button to speak into it.');
    } else {
      var describedBy = 'hint-main' + (q.moreCases ? ' hint-cases' : '') + ' nudge';
      h += '<label class="question" for="answer">' + esc(q.text) + '</label>' +
        '<textarea id="answer" data-q="' + q.n + '" data-focus aria-describedby="' + describedBy + '" placeholder="' + esc(q.placeholder || 'Type your answer here, or use the microphone.') + '">' + esc(state.answers[q.n] || '') + '</textarea>' +
        '<p class="nudge" id="nudge" aria-live="polite"></p>' +
        hintsHTML(q) + voiceHTML();
    }

    h += '<div class="actions split">' +
      '<button class="btn" type="button" data-action="back"' + (state.step === 0 ? ' disabled' : '') + '>Back</button>' +
      '<div class="right"><button class="btn" type="button" data-action="skip">Skip</button>' +
      '<button class="btn primary" type="button" data-action="next">' + (isLast ? 'Review my answers' : 'Next') + '</button></div></div>' +
      '<p class="hint"><button class="link-btn" type="button" data-action="goReview">Jump to review</button></p>' +
      '</section>';
    return h;
  }

  function sectionsInOrder() {
    var out = [];
    STEPS.forEach(function (q, i) {
      var last = out[out.length - 1];
      if (!last || last.name !== q.section) { last = { name: q.section, items: [] }; out.push(last); }
      last.items.push({ q: q, num: i + 1 });
    });
    return out;
  }

  function reviewHTML() {
    var h = '<section><h1 data-focus tabindex="-1">Review your answers</h1>' +
      '<p>Read through and edit anything you like. Changes are saved as you type. Empty answers are left out of your skill file.</p>';
    sectionsInOrder().forEach(function (sec) {
      h += '<div class="review-section"><h2>' + esc(sec.name) + '</h2>';
      sec.items.forEach(function (it) {
        var q = it.q;
        if (q.type === 'choice') {
          var cur = state.answers[q.n] || '';
          h += '<fieldset class="review-q"><legend>' + it.num + '. ' + esc(q.text) + '</legend><div class="choice">';
          q.options.forEach(function (o) {
            h += '<label><input type="radio" name="lang" value="' + esc(o.value) + '"' + (cur === o.value ? ' checked' : '') + '> ' + esc(o.label) + '</label>';
          });
          h += '</div></fieldset>';
        } else if (q.type === 'cases') {
          h += '<p class="muted">' + it.num + '. ' + esc(q.text) + '</p>' + casesHTML('rc');
        } else {
          h += '<div class="review-q"><label for="rv-' + q.n + '">' + it.num + '. ' + esc(q.text) + '</label>' +
            '<textarea class="review-box" id="rv-' + q.n + '" data-q="' + q.n + '" data-review="1">' + esc(state.answers[q.n] || '') + '</textarea></div>';
        }
      });
      h += '</div>';
    });
    h += '<div class="actions split"><button class="btn" type="button" data-action="backToQuestions">Back to the questions</button>' +
      '<div class="right"><button class="btn primary" type="button" data-action="makeSkill">Create my skill file</button></div></div>' +
      '</section>';
    return h;
  }

  function finishHTML() {
    var guess = guessName(answerOf(1));
    var nameVal = state.nameEdited ? state.name : guess;
    var slugVal = state.slugEdited ? state.slug : makeSlug(nameVal);
    return '<section><h1 data-focus tabindex="-1">Your skill file is ready</h1>' +
      '<p>It was built in your browser from your own words. Nothing was uploaded anywhere.</p>' +
      '<div class="fields">' +
      '<div><label for="f-name">Your name, as it should appear in the skill</label><input type="text" id="f-name" autocomplete="off" value="' + esc(nameVal) + '"></div>' +
      '<div><label for="f-slug">Skill name (lowercase letters, numbers and hyphens only)</label><input type="text" id="f-slug" autocomplete="off" spellcheck="false" value="' + esc(slugVal) + '"></div>' +
      '</div>' +
      '<div class="actions">' +
      '<button class="btn primary" type="button" data-action="dl-zip">Download .zip</button>' +
      '<button class="btn" type="button" data-action="dl-md">Download .md</button>' +
      '<button class="btn" type="button" data-action="copy">Copy</button></div>' +
      '<p class="status" id="status" role="status"></p>' +
      '<h3>Preview</h3><pre class="preview" id="preview" tabindex="0" aria-label="Preview of SKILL.md"></pre>' +
      '<div class="card"><h2>How to add it to Claude</h2><ol class="steps">' +
      '<li>Click <strong>Download .zip</strong> above. Do not unzip it: the zip already contains a folder with your <code>SKILL.md</code> inside.</li>' +
      '<li>Open <a href="https://claude.ai" target="_blank" rel="noopener noreferrer">claude.ai</a> and sign in.</li>' +
      '<li>Go to <strong>Customize</strong>, then <strong>Skills</strong>. On some accounts this is under <strong>Settings</strong>, then <strong>Features</strong>.</li>' +
      '<li>Click <strong>Add</strong> (or <strong>Upload skill</strong>) and choose the zip file.</li>' +
      '<li>Make sure the skill is switched on. Skills need <strong>code execution and file creation</strong> to be turned on in your Claude settings.</li>' +
      '<li>Start a new chat and ask, for example: <em>"Write a LinkedIn post about [topic] in my voice."</em></li></ol>' +
      '<p class="small muted">Menu names change from time to time. If you cannot find it, see Anthropic\'s guide: <a href="https://support.claude.com/en/articles/12512198-creating-custom-skills" target="_blank" rel="noopener noreferrer">Creating custom skills</a>. Using Claude Code? Put the unzipped folder in <code>~/.claude/skills/</code>.</p>' +
      '<p class="small muted">The file contains your personal answers. Only share it with people you trust.</p></div>' +
      '<div class="card"><h2>Want to change something?</h2><p>You can edit any answer and create your skill file again. Nothing is deleted.</p>' +
      '<div class="actions"><button class="btn" type="button" data-action="editAnswers">Edit my answers</button></div></div>' +
      '</section>';
  }

  /* ---------- Interview behaviour ---------- */

  function updateNudge(n) {
    var el = document.getElementById('nudge');
    var box = document.getElementById('answer');
    if (!el || !box) return;
    var len = box.value.trim().length;
    if (n !== 3 && len > 0 && len < 120) {
      el.textContent = 'A little more detail will help your skill sound like you. Even a couple more sentences makes a difference. You can still move on whenever you like.';
    } else {
      el.textContent = '';
    }
  }

  /* Handles typing into any answer box: a normal answer or a field of a case-study card. */
  function onBoxInput(box) {
    var ci = box.getAttribute('data-case');
    if (ci !== null) {
      var c = state.cases[parseInt(ci, 10)];
      if (c) c[box.getAttribute('data-field')] = box.value;
      save();
      if (box.tagName === 'TEXTAREA') autosize(box);
      return;
    }
    var n = parseInt(box.getAttribute('data-q'), 10);
    state.answers[n] = box.value;
    save();
    if (!box.getAttribute('data-review')) updateNudge(n);
  }

  function autosize(box) {
    box.style.height = 'auto';
    box.style.height = Math.max(box.scrollHeight + 4, 96) + 'px';
  }

  function nextStep() {
    stopListening();
    if (state.step < TOTAL - 1) {
      state.step++;
      save();
      render();
      window.scrollTo(0, 0);
    } else {
      go('review');
    }
  }

  function prevStep() {
    stopListening();
    if (state.step > 0) {
      state.step--;
      save();
      render();
      window.scrollTo(0, 0);
    }
  }

  function rerenderKeepingPlace(focusSelector) {
    var y = window.scrollY;
    render(focusSelector);
    window.scrollTo(0, y);
  }

  /* ---------- Skill file generation ---------- */

  function guessName(text) {
    var t = String(text || '').trim().split(/\r?\n/)[0] || '';
    t = t.replace(/^(hi|hello|hey)[,!\s]+/i, '').replace(/^(my name is|i am|i'm|i’m|this is|name:)\s+/i, '');
    var part = t.split(/\s*(?:,|;|:|\(|\s[-–—|]\s|\s+and\s+|\s+i\s+|\s+is\s+|\s+am\s+|\s+work|\s+at\s+)/i)[0] || '';
    var words = part.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    return words.join(' ').replace(/[<>]/g, '');
  }

  function cleanSlug(s) {
    s = String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
    s = s.replace(/claude|anthropic/g, '');
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s;
  }

  var SLUG_SUFFIX = '-author-profile';

  function makeSlug(name) {
    var base = cleanSlug(name);
    if (base.length > 48) base = base.slice(0, 48).replace(/-+$/g, '');
    return base ? base + SLUG_SUFFIX : 'my' + SLUG_SUFFIX;
  }

  function finalSlug(raw) {
    var s = cleanSlug(raw);
    if (s.length > 64) s = s.slice(0, 64).replace(/-+$/g, '');
    return s || 'my' + SLUG_SUFFIX;
  }

  /* Keeps the user's words as written. Only stops their text from being read as Markdown structure. */
  function mdSafe(text) {
    return String(text).replace(/\r\n?/g, '\n').trim().split('\n').map(function (line) {
      if (/^\s*#/.test(line) || /^\s*(```|~~~)/.test(line)) return '\\' + line.replace(/^\s+/, '');
      return line;
    }).join('\n');
  }

  function oneLine(text) {
    return mdSafe(String(text).replace(/\s+/g, ' ')).replace(/^\\?#+\s*/, '').trim();
  }

  function yamlString(s) { return JSON.stringify(String(s)); }

  /* Added to the end of every skill file. Wording is fixed. */
  var DO_DONT = [
    '## Do / Don\'t',
    '',
    '*Role: The highest authority in this profile. Every other section operates underneath these rules. If anything generated from another section triggers a Don\'t, the Don\'t wins and the content must be changed.*',
    '',
    '### Do',
    '',
    '* Write conversationally, as if talking to the reader',
    '* Use first person grounded in real experience ("I built," "I\'ve seen," "I learned")',
    '* Tell stories with specific details: names, numbers, dates, what went wrong',
    '* Break complex topics into simple parts with real-world examples',
    '* Include technical terms but explain them immediately in plain language',
    '* Show vulnerability and honesty about struggles and uncertainty',
    '* Use parenthetical asides for honest qualifications and self-awareness',
    '* Frame content from the audience\'s perspective first',
    '* Use short punchy sentences for emphasis after longer explanations',
    '* Include specific numbers and data points for credibility',
    '',
    '### Don\'t',
    '',
    '* Use em-dashes',
    '* Use AI-sounding filler phrases ("In today\'s fast-paced world," "It\'s important to note that," "Let\'s dive in" "You are not alone")',
    '* Use emojis in blog content',
    '* Use corporate buzzword language ("passionate about synergy," "leverage our learnings," "drive alignment")',
    '* Write in a dry, academic, or textbook tone',
    '* Use jargon without immediately explaining it',
    '* Produce vague, repetitive, or generic content that could have been written by anyone',
    '* Lose the personal, storytelling quality of the writing',
    '* Oversell or use salesy language',
    '* Pretend things were easy when they weren\'t',
    '* Remove the honest, self-deprecating voice',
    '* Write as if from a position of untouchable authority. Write as a practitioner who is still learning, not a guru dispensing wisdom',
    '* Default to third person when first person would be more authentic',
    '* Use overly long sentences without rhythm breaks',
    '* Strip out cultural references or native-language expressions for "consistency"',
    ''
  ].join('\n');

  function buildSkill(nameInput, slugInput) {
    var name = String(nameInput || '').replace(/[<>\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
    var slug = finalSlug(slugInput);
    var who = name || 'this person';
    var english = state.answers[4];
    var englishName = english === 'British' ? 'British English' : english === 'American' ? 'American English' : '';
    var englishLine = englishName ? englishName + (english === 'British' ? ' (colour, organise, whilst)' : ' (color, organize, while)') : 'the same English spelling and style used in the answers below';

    var shortName = name.length > 30 ? name.slice(0, 30).trim() : name;
    var d = shortName || 'this person';
    var desc = d + '’s author profile (voice, stories, do/don’t rules). Use whenever writing or editing content as ' + d + ': posts, articles, bios, quotes, scripts.';
    if (desc.length > 200) desc = desc.slice(0, 199).trim() + '…';

    function ans(n) { return mdSafe(answerOf(n)); }

    /* A sub-section made of labelled answers. Returns '' when every answer is empty. */
    function sub(title, role, items) {
      var parts = [];
      items.forEach(function (it) {
        var text = it.text !== undefined ? it.text : ans(it.n);
        if (text) parts.push('**' + it.label + ':**\n\n' + text);
      });
      if (!parts.length) return '';
      return '### ' + title + '\n\n*Role: ' + role + '*\n\n' + parts.join('\n\n') + '\n';
    }

    /* Key stories: the interview answers about wins, failures and setbacks, plus the case-study cards. */
    var stories = [];
    STEPS.forEach(function (q) {
      if (!q.kind) return;
      var a = ans(q.n);
      if (!a) return;
      stories.push('#### ' + q.label + '\n\n**Type:** ' + q.kind + '\n\n**What we know:**\n\n' + a);
    });
    state.cases.forEach(function (c) {
      if (!caseHasContent(c)) return;
      var parts = ['#### ' + (oneLine(c.title) || 'Untitled case study or experiment')];
      var outcome = OUTCOMES.filter(function (o) { return o.value === c.outcome; })[0];
      if (outcome) parts.push('**Outcome:** ' + (outcome.value === 'Mixed' ? 'A bit of both' : outcome.value));
      var labels = { situation: 'Situation or brief', did: 'What I did', result: 'Result', learned: 'What I learned' };
      CASE_FIELDS.forEach(function (f) {
        var t = mdSafe(c[f.key]);
        if (t) parts.push('**' + labels[f.key] + ':**\n\n' + t);
      });
      stories.push(parts.join('\n\n'));
    });

    var whoParts = [
      sub('Personal Details',
        'Builds the AI’s mental model of who ' + who + ' is as a person. These details shape tone, cultural references and the texture of the writing. They will not often appear directly in content, but may occasionally be relevant when a personal reference adds authenticity.',
        [ { n: 1, label: 'Name, role and company' },
          { n: 2, label: 'Based, originally from, education and any relocation' },
          { label: 'Preferred English', text: englishName },
          { n: 5, label: 'Family and closest people' } ]),
      sub('Core Traits & Working Style',
        'Defines how ' + who + ' thinks and behaves. The AI uses this to make sure content reflects their personality, decision-making style and what keeps them going.',
        [ { n: 8, label: 'How close colleagues describe me, when I do my best work and the belief that guides me' },
          { n: 19, label: 'What kept me going when things were hardest' },
          { n: 20, label: 'Who or what helped me rebuild' } ]),
      sub('Interests',
        'Gives the AI a sense of ' + who + ' as a real person beyond work. These details inform the kinds of analogies, asides and cultural references the AI reaches for.',
        [ { n: 6, label: 'A good day off' },
          { n: 7, label: 'What I love outside work, including cultural traditions and languages' } ]),
      sub('Career Arc',
        'Provides authority markers and the chronological story of ' + who + '’s expertise. The AI weaves in credibility signals and grounds claims in real experience.',
        [ { n: 9, label: 'My career from the beginning, and the real turning points' },
          { n: 10, label: 'How I ended up in my field, and what I had to unlearn' } ])
    ].filter(Boolean);

    if (stories.length) {
      whoParts.push('### Key Stories & Anecdotes\n\n*Role: Source material for authentic storytelling. The AI draws from these for specific details, real quotes and concrete examples. Use them only where they are relevant, and never add details that are not written here.*\n\n' + stories.join('\n\n') + '\n');
    }

    var writeParts = [
      sub('Voice & Tone',
        'The style rulebook. Tells the AI HOW to sound like ' + who + ': their emotional register, level of formality and the personality that should come through in every sentence.',
        [ { n: 21, label: 'How I describe the way I write and speak' } ]),
      sub('Characteristic Phrases',
        'Natural language to sprinkle through content so it feels authentically ' + who + ' rather than generic. Use these organically and do not force them in. If the answer also lists words, tones or clichés to avoid, follow them as well as the Don’t list at the end of this file.',
        [ { n: 22, label: 'Words, phrases and expressions I use a lot, and what I never want my content to sound like' } ])
    ].filter(Boolean);

    var out = [];
    out.push('---');
    out.push('name: ' + slug);
    out.push('description: ' + yamlString(desc));
    out.push('---');
    out.push('');
    out.push('# Author Profile: ' + (name || 'About Me'));
    out.push('');
    out.push('Use this profile when writing content as ' + who + '. Everything below comes from ' + who + '’s own answers and is kept in their own words.');
    out.push('');
    out.push('**How to use this profile:**');
    out.push('');
    out.push('* Write in the first person, as ' + who + ', in ' + englishLine + '.');
    out.push('* Use the real stories, numbers and examples below only where they are relevant to the task.');
    out.push('* Never invent stories, numbers, names, quotes, dates, clients or credentials. If a detail is missing, ask the user.');
    out.push('* The Do / Don’t list at the end of this file is the highest authority.');
    out.push('');
    out.push('---');
    out.push('');
    if (whoParts.length) {
      out.push('## Who ' + (name || 'This Person') + ' Is');
      out.push('');
      out.push(whoParts.join('\n'));
      out.push('---');
      out.push('');
    }
    if (writeParts.length) {
      out.push('## How ' + (name || 'This Person') + ' Writes');
      out.push('');
      out.push(writeParts.join('\n'));
    }

    var links = ans(3);
    if (links) {
      out.push('---');
      out.push('');
      out.push('## Reference');
      out.push('');
      out.push('### Content for Reference\n\n*Role: Links to published work and profiles. The AI can fetch these for deeper calibration if the answers above are not enough.*\n\n' + links + '\n');
    }

    /* Fixed closing block: added to every file, never shown as a question. */
    out.push('---');
    out.push('');
    out.push(DO_DONT);

    return { md: out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n'), slug: slug, name: name };
  }

  var lastSkill = null;

  function refreshSkill() {
    var nameEl = document.getElementById('f-name');
    var slugEl = document.getElementById('f-slug');
    var pre = document.getElementById('preview');
    if (!nameEl || !slugEl || !pre) return;
    lastSkill = buildSkill(nameEl.value, slugEl.value);
    pre.textContent = lastSkill.md;
  }

  /* ---------- Downloads and ZIP (no libraries) ---------- */

  var crcTable = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function makeZip(files) {
    var enc = new TextEncoder();
    var d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var chunks = [], central = [], offset = 0;

    files.forEach(function (f) {
      var name = enc.encode(f.name);
      var crc = crc32(f.data);
      var size = f.data.length;

      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true);
      lh.setUint16(12, date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, size, true);
      lh.setUint32(22, size, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), name, f.data);

      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true);
      ch.setUint16(14, date, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, size, true);
      ch.setUint32(24, size, true);
      ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true);
      ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true);
      ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);

      offset += 30 + name.length + size;
    });

    var cdSize = 0;
    central.forEach(function (c) { cdSize += c.length; });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);

    return new Blob(chunks.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function setStatus(msg) {
    var el = document.getElementById('status');
    if (el) el.textContent = msg;
  }

  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      setStatus(ok ? 'Copied to your clipboard.' : 'Could not copy automatically. Select the preview text and copy it by hand.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setStatus('Copied to your clipboard.'); }, fallback);
    } else {
      fallback();
    }
  }

  /* ---------- Events ---------- */

  main.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    var action = btn.getAttribute('data-action');

    switch (action) {
      case 'start':
        state.started = true;
        go(hasProgress() && state.screen !== 'welcome' ? state.screen : 'interview');
        break;
      case 'back': prevStep(); break;
      case 'next': nextStep(); break;
      case 'skip': nextStep(); break;
      case 'goReview': stopListening(); go('review'); break;
      case 'backToQuestions': go('interview'); break;
      case 'editAnswers': go('review'); break;
      case 'makeSkill': go('finish'); break;
      case 'mic': toggleMic(); break;
      case 'addCase':
        state.cases.push(blankCase());
        save();
        rerenderKeepingPlace('[data-case-card="' + (state.cases.length - 1) + '"] input[type="text"]');
        break;
      case 'removeCase':
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        if (caseHasContent(state.cases[idx]) && btn.getAttribute('data-armed') !== '1') {
          btn.setAttribute('data-armed', '1');
          btn.textContent = 'Click again to remove it for good';
          break;
        }
        state.cases.splice(idx, 1);
        if (!state.cases.length) state.cases.push(blankCase());
        save();
        rerenderKeepingPlace();
        break;
      case 'dl-md':
        refreshSkill();
        saveBlob(new Blob([lastSkill.md], { type: 'text/markdown;charset=utf-8' }), 'SKILL.md');
        setStatus('SKILL.md downloaded.');
        break;
      case 'dl-zip':
        refreshSkill();
        saveBlob(makeZip([{ name: lastSkill.slug + '/SKILL.md', data: new TextEncoder().encode(lastSkill.md) }]), lastSkill.slug + '.zip');
        setStatus(lastSkill.slug + '.zip downloaded.');
        break;
      case 'copy':
        refreshSkill();
        copyText(lastSkill.md);
        break;
    }
  });

  main.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.matches && (t.matches('textarea[data-q]') || t.matches('[data-case]'))) {
      onBoxInput(t);
    } else if (t.id === 'f-name') {
      state.name = t.value;
      state.nameEdited = true;
      var slugEl = document.getElementById('f-slug');
      if (slugEl && !state.slugEdited) slugEl.value = makeSlug(t.value);
      save();
      refreshSkill();
    } else if (t.id === 'f-slug') {
      state.slug = t.value;
      state.slugEdited = true;
      save();
      refreshSkill();
    }
  });

  main.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.name === 'lang' && t.type === 'radio') {
      state.answers[4] = t.value;
      save();
    }
    if (t.hasAttribute && t.hasAttribute('data-case-outcome')) {
      var c = state.cases[parseInt(t.getAttribute('data-case-outcome'), 10)];
      if (c) { c.outcome = t.value; save(); }
    }
    if (t.id === 'f-slug') {
      t.value = finalSlug(t.value);
      state.slug = t.value;
      save();
      refreshSkill();
    }
  });

  main.addEventListener('focusin', function (ev) {
    if (ev.target.tagName === 'TEXTAREA') lastBox = ev.target;
  });

  main.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey) && ev.target.id === 'answer') {
      ev.preventDefault();
      nextStep();
    }
  });

  window.addEventListener('pagehide', stopListening);

  render();
})();

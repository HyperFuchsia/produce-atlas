/* Whole Man — adult well-being check-in.
   No-account, browser-only. No network calls of any kind: no fetch, no XHR,
   no WebSocket, no beacon, no analytics. Selections are processed in this
   browser and stored only in this browser, only with a separate storage choice.

   Storage keys (all removable from the journal controls on check-in.html):
     wm-checkin-entries  localStorage    saved journal entries (full / summary)
     wm-checkin-session  sessionStorage  the current session-only response
     wm-checkin-consent  localStorage    participation consent (18+ confirmed)
     wm-checkin-topics   localStorage    permitted-topic preferences
     wm-checkin-invite   localStorage    "ask me later" invitation preference */

(function () {
  "use strict";

  /* ================= configuration ================= */

  var KEYS = {
    entries: "wm-checkin-entries",
    session: "wm-checkin-session",
    consent: "wm-checkin-consent",
    topics: "wm-checkin-topics",
    invite: "wm-checkin-invite"
  };
  var MAX_ENTRIES = 100;

  /* Seven topics, two questions each. Answer values: 3 = highest support,
     2 = middle, 1 = lowest support. Values drive the deterministic result
     rule only; they are never summed, weighted, or shown as numbers. */
  var TOPICS = [
    { id: "sleep", name: "Sleep & physical energy", questions: [
      { id: "s1", text: "Over the past two weeks, how has your sleep been?",
        options: [{ v: 3, label: "Mostly restful" }, { v: 2, label: "Uneven" }, { v: 1, label: "Poor most nights" }] },
      { id: "s2", text: "How is your physical energy for an ordinary day?",
        options: [{ v: 3, label: "Usually enough" }, { v: 2, label: "It comes and goes" }, { v: 1, label: "Regularly run down" }] }
    ] },
    { id: "mood", name: "Mood & emotional condition", questions: [
      { id: "m1", text: "How would you describe your mood on most recent days?",
        options: [{ v: 3, label: "Mostly steady" }, { v: 2, label: "Up and down" }, { v: 1, label: "Heavy or flat most days" }] },
      { id: "m2", text: "When something good happens, can you feel it?",
        options: [{ v: 3, label: "Usually, yes" }, { v: 2, label: "Sometimes" }, { v: 1, label: "Rarely or not at all" }] }
    ] },
    { id: "stress", name: "Stress & psychological pressure", questions: [
      { id: "p1", text: "How much pressure are you carrying right now?",
        options: [{ v: 3, label: "A manageable amount" }, { v: 2, label: "Heavy, but I am holding it" }, { v: 1, label: "More than I can keep carrying" }] },
      { id: "p2", text: "Do you get real breaks from that pressure?",
        options: [{ v: 3, label: "Regularly" }, { v: 2, label: "Occasionally" }, { v: 1, label: "Almost never" }] }
    ] },
    { id: "connection", name: "Connection & support", questions: [
      { id: "c1", text: "Is there someone you could speak to honestly about your life?",
        options: [{ v: 3, label: "Yes, and I do" }, { v: 2, label: "Yes, but I rarely do" }, { v: 1, label: "No one comes to mind" }] },
      { id: "c2", text: "How connected to other people have you felt lately?",
        options: [{ v: 3, label: "Genuinely connected" }, { v: 2, label: "Somewhat isolated" }, { v: 1, label: "Deeply isolated" }] }
    ] },
    { id: "safety", name: "Safety", questions: [
      { id: "f1", text: "Do you feel physically and emotionally safe where you live and spend your time?",
        options: [{ v: 3, label: "Yes" }, { v: 2, label: "Mostly, with exceptions" }, { v: 1, label: "No" }] },
      { id: "f2", text: "Is anyone currently hurting, threatening, controlling, or coercing you?",
        options: [{ v: 3, label: "No" }, { v: 2, label: "I am not sure" }, { v: 1, label: "Yes" }] }
    ] },
    { id: "work", name: "Work & practical load", questions: [
      { id: "w1", text: "How is the practical load — work, money, obligations — sitting on you?",
        options: [{ v: 3, label: "Under control" }, { v: 2, label: "Straining" }, { v: 1, label: "Overwhelming" }] },
      { id: "w2", text: "Is there any room in your life that is not obligation?",
        options: [{ v: 3, label: "Yes, regularly" }, { v: 2, label: "A little" }, { v: 1, label: "None" }] }
    ] },
    { id: "boundaries", name: "Boundaries & self-respect", questions: [
      { id: "b1", text: "Can you say no where you need to?",
        options: [{ v: 3, label: "Usually" }, { v: 2, label: "Sometimes" }, { v: 1, label: "Rarely" }] },
      { id: "b2", text: "How have you been treating yourself in your own judgment lately?",
        options: [{ v: 3, label: "With basic respect" }, { v: 2, label: "Harshly at times" }, { v: 1, label: "With contempt most days" }] }
    ] }
  ];

  /* Four deterministic result states. Lowest-response priority:
     none -> attention (any 1) -> mixed (any 2) -> supported (all 3). */
  var RESULTS = {
    none: {
      title: "No questions answered",
      body: "You previewed, skipped, or declined every question. That is a legitimate way to use this tool — the controls exist so that they can be used. Nothing was recorded."
    },
    attention: {
      title: "At least one area may need real attention",
      body: "One or more of your answers described low support. This is not a diagnosis and not a score — it is a prompt. Consider naming the area that needs attention to yourself first, and then consider one concrete support: a trusted person, a clinician, a practical service, a safety resource, or a boundary."
    },
    mixed: {
      title: "Some areas feel steady; some are under pressure",
      body: "Your answers described a mix of support and strain. Nothing here interprets that further — you know which pressures are temporary and which are structural. If one of them keeps surfacing, it may deserve a trusted person, a clinician, a practical service, a safety resource, or a boundary."
    },
    supported: {
      title: "The areas you chose to answer look supported right now",
      body: "Every answer you gave described the higher-support option. That describes only the limited selections you made today: it cannot establish safety, health, the absence of abuse, the absence of suicide risk, or the absence of any condition this check-in never asked about."
    }
  };

  var RULE_TEXT = "How this result was chosen: not by a score. A fixed rule picks one of four states — no answered questions; any lowest-support answer (which takes priority); otherwise any middle answer; otherwise all highest-support answers. “Non-scored” does not mean “no interpretation”; this is the entire interpretation.";

  /* ================= storage helpers ================= */

  function storeOK(storage) {
    try {
      var k = "wm-checkin-test";
      storage.setItem(k, "1");
      storage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  function localOK() { try { return storeOK(window.localStorage); } catch (e) { return false; } }
  function sessionOK() { try { return storeOK(window.sessionStorage); } catch (e) { return false; } }

  function lsGet(key) {
    try { var raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }
    catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function lsRemove(key) { try { localStorage.removeItem(key); return true; } catch (e) { return false; } }
  function ssGet(key) {
    try { var raw = sessionStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }
    catch (e) { return null; }
  }
  function ssSet(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function ssRemove(key) { try { sessionStorage.removeItem(key); return true; } catch (e) { return false; } }

  /* ================= data helpers ================= */

  function topicById(id) {
    for (var i = 0; i < TOPICS.length; i++) { if (TOPICS[i].id === id) return TOPICS[i]; }
    return null;
  }
  function questionByIds(topicId, qId) {
    var t = topicById(topicId);
    if (!t) return null;
    for (var i = 0; i < t.questions.length; i++) { if (t.questions[i].id === qId) return t.questions[i]; }
    return null;
  }
  function optionLabel(topicId, qId, v) {
    var q = questionByIds(topicId, qId);
    if (!q) return "";
    for (var i = 0; i < q.options.length; i++) { if (q.options[i].v === v) return q.options[i].label; }
    return "";
  }

  function computeResultKey(answers) {
    var values = [], k;
    for (k in answers) {
      if (Object.prototype.hasOwnProperty.call(answers, k) && typeof answers[k] === "number") { values.push(answers[k]); }
    }
    if (values.length === 0) return "none";
    if (values.indexOf(1) !== -1) return "attention";
    if (values.indexOf(2) !== -1) return "mixed";
    return "supported";
  }

  function attentionAreas(answers) {
    var names = [], i, j, t, key;
    for (i = 0; i < TOPICS.length; i++) {
      t = TOPICS[i];
      for (j = 0; j < t.questions.length; j++) {
        key = t.id + "." + t.questions[j].id;
        if (answers[key] === 1 && names.indexOf(t.name) === -1) { names.push(t.name); }
      }
    }
    return names;
  }

  /* Resilience: filter malformed stored entries against expected topics,
     questions, and values; cap the loaded journal at MAX_ENTRIES. */
  function validateEntry(x) {
    var i, k, parts, t, q, ok;
    if (!x || typeof x !== "object") return null;
    if (x.mode !== "full" && x.mode !== "summary") return null;
    if (typeof x.date !== "string" || isNaN(Date.parse(x.date))) return null;
    if (!RESULTS[x.result]) return null;
    if (!(x.topics instanceof Array)) return null;
    for (i = 0; i < x.topics.length; i++) { if (!topicById(x.topics[i])) return null; }
    var entry = {
      id: (typeof x.id === "string" && x.id) ? x.id : ("e" + Date.now() + Math.floor(Math.random() * 100000)),
      date: x.date,
      mode: x.mode,
      topics: x.topics.slice(),
      result: x.result
    };
    if (x.mode === "full") {
      if (!x.answers || typeof x.answers !== "object") return null;
      entry.answers = {};
      for (k in x.answers) {
        if (!Object.prototype.hasOwnProperty.call(x.answers, k)) continue;
        parts = k.split(".");
        if (parts.length !== 2) return null;
        t = topicById(parts[0]);
        q = questionByIds(parts[0], parts[1]);
        if (!t || !q) return null;
        ok = (x.answers[k] === 1 || x.answers[k] === 2 || x.answers[k] === 3 || x.answers[k] === "skip");
        if (!ok) return null;
        entry.answers[k] = x.answers[k];
      }
    }
    return entry;
  }

  function loadEntries() {
    var raw = lsGet(KEYS.entries);
    var out = [], i, v;
    if (!(raw instanceof Array)) return out;
    for (i = 0; i < raw.length && out.length < MAX_ENTRIES; i++) {
      v = validateEntry(raw[i]);
      if (v) out.push(v);
    }
    return out;
  }
  function saveEntries(entries) { return lsSet(KEYS.entries, entries.slice(0, MAX_ENTRIES)); }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) +
        ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) { return iso; }
  }

  /* ================= DOM helper ================= */

  function el(tag, attrs, children) {
    var n = document.createElement(tag), k, i, c;
    if (attrs) {
      for (k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === "text") { n.textContent = attrs[k]; }
        else if (k === "class") { n.className = attrs[k]; }
        else if (k === "for") { n.htmlFor = attrs[k]; }
        else { n.setAttribute(k, attrs[k]); }
      }
    }
    if (children) {
      for (i = 0; i < children.length; i++) {
        c = children[i];
        if (typeof c === "string") { n.appendChild(document.createTextNode(c)); }
        else if (c) { n.appendChild(c); }
      }
    }
    return n;
  }
  function btn(label, cls, onClick) {
    var b = el("button", { type: "button", "class": cls, text: label });
    b.addEventListener("click", onClick);
    return b;
  }
  function clearNode(n) { while (n.firstChild) { n.removeChild(n.firstChild); } }

  function crisisBlock() {
    return el("div", { "class": "callout crisis" }, [
      el("span", { "class": "label", text: "If you are in danger or thinking about suicide" }),
      el("p", null, [
        "In the United States, call or text ",
        el("a", { href: "tel:988", text: "988" }),
        " (Suicide & Crisis Lifeline — call, text, or chat, with Deaf and hard-of-hearing access). Veterans: call 988, then press 1. In immediate danger, call ",
        el("a", { href: "tel:911", text: "911" }),
        ". Free, 24/7, and never behind membership, sign-in, payment, or any AI gate. ",
        el("a", { href: "care.html", text: "All care and crisis resources" }),
        "."
      ])
    ]);
  }

  /* ================= page elements ================= */

  var dialog = document.getElementById("wm-dialog");
  var dialogTitle = document.getElementById("wm-dialog-title");
  var dialogBody = document.getElementById("wm-body");
  var dialogFoot = document.getElementById("wm-foot");
  var closeBtn = document.getElementById("wm-close");
  var launchBtn = document.getElementById("wm-launch");
  var inviteNote = document.getElementById("wm-invite-note");
  var clearInviteBtn = document.getElementById("wm-clear-invite");
  var pageStatus = document.getElementById("wm-page-status");
  var journalBody = document.getElementById("wm-journal-body");
  if (!dialog || !dialogBody || !launchBtn || !journalBody) { return; }

  /* ================= state ================= */

  var state = {
    step: "invite",
    permitted: [],       /* topic ids permitted this run */
    queue: [],           /* [{topicId, qId, topicName, qText, options, num}] */
    qIndex: 0,
    answers: {},         /* "topicId.qId" -> 1|2|3|"skip" */
    resultKey: null,
    savedThisRun: false,
    opener: null,
    lastDeleted: null    /* {entry, index} for undo */
  };

  function setPageStatus(msg) {
    if (!pageStatus) return;
    pageStatus.textContent = msg;
    pageStatus.hidden = !msg;
  }

  /* ================= invitation preference (panel) ================= */

  function syncInvitePanel() {
    var pref = lsGet(KEYS.invite);
    if (pref && pref.choice === "later") {
      inviteNote.textContent = "You previously chose “ask me later.” That recorded only a preference in this browser — nothing was scheduled, and no one will contact you, because Whole Man operates no outreach or reminder system. The invitation reappears only when you open this page, exactly as it has now.";
      inviteNote.hidden = false;
      clearInviteBtn.hidden = false;
    } else {
      inviteNote.hidden = true;
      clearInviteBtn.hidden = true;
    }
  }
  if (clearInviteBtn) {
    clearInviteBtn.addEventListener("click", function () {
      lsRemove(KEYS.invite);
      syncInvitePanel();
      setPageStatus("Your “ask me later” preference was cleared from this browser.");
    });
  }

  /* ================= dialog open/close, focus ================= */

  var supportsShowModal = (typeof dialog.showModal === "function");

  function focusTitle() {
    if (dialogTitle) { try { dialogTitle.focus(); } catch (e) { /* no-op */ } }
  }

  function setStepTitle(text) {
    if (dialogTitle) { dialogTitle.textContent = text; }
  }

  function openDialog(opener) {
    state.opener = opener || null;
    state.step = "invite";
    state.permitted = [];
    state.queue = [];
    state.qIndex = 0;
    state.answers = {};
    state.resultKey = null;
    state.savedThisRun = false;
    if (supportsShowModal) {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "open");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
    }
    renderStep("invite");
    /* Initial focus moves synchronously to the dialog heading, not a button. */
    focusTitle();
  }

  function closeDialog() {
    var msg;
    if (state.savedThisRun) {
      msg = "Check-in closed. Your storage choice was applied — your journal below reflects it.";
    } else if (state.step === "questions" || state.step === "result" || state.step === "storage") {
      msg = "Check-in closed. Nothing you selected in the dialog was saved.";
    } else {
      msg = "Check-in closed. Nothing was recorded.";
    }
    if (supportsShowModal) {
      try { dialog.close(); } catch (e) { dialog.removeAttribute("open"); }
    } else {
      dialog.removeAttribute("open");
    }
    afterClose(msg);
  }

  function afterClose(msg) {
    setPageStatus(msg);
    /* Focus returns to the initiating control on every closure path. */
    if (state.opener && typeof state.opener.focus === "function") {
      try { state.opener.focus(); } catch (e) { /* no-op */ }
    }
    state.step = "closed";
  }

  if (supportsShowModal) {
    /* Escape produces a native cancel -> close; route through our cleanup. */
    dialog.addEventListener("cancel", function () { /* allow native close */ });
    dialog.addEventListener("close", function () {
      if (state.step !== "closed") {
        var msg;
        if (state.savedThisRun) { msg = "Check-in closed. Your storage choice was applied — your journal below reflects it."; }
        else if (state.step === "questions" || state.step === "result" || state.step === "storage") { msg = "Check-in closed. Nothing you selected in the dialog was saved."; }
        else { msg = "Check-in closed. Nothing was recorded."; }
        afterClose(msg);
      }
    });
  }

  /* Focus trap (also covers the non-showModal fallback) and Escape closure. */
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !supportsShowModal) {
      e.preventDefault();
      closeDialog();
      return;
    }
    if (e.key !== "Tab") return;
    var focusables = dialog.querySelectorAll(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogTitle)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  if (closeBtn) { closeBtn.addEventListener("click", closeDialog); }
  launchBtn.addEventListener("click", function () { openDialog(launchBtn); });
  launchBtn.hidden = false;

  /* ================= step rendering ================= */

  function renderStep(step) {
    state.step = step;
    clearNode(dialogBody);
    clearNode(dialogFoot);
    if (step === "invite") { renderInvite(); }
    else if (step === "preview") { renderPreview(); }
    else if (step === "topics") { renderTopics(); }
    else if (step === "questions") { renderQuestions(); }
    else if (step === "result") { renderResult(); }
    else if (step === "storage") { renderStorage(); }
    else if (step === "saved") { renderSaved(); }
    if (step !== "invite") { focusTitle(); }
  }

  /* ---------- step: invitation & adult confirmation ---------- */

  function renderInvite() {
    setStepTitle("An invitation, not an obligation");
    dialogBody.appendChild(el("p", { text:
      "This is a short well-being check-in for adults: seven topics, two questions each, plain answers. It is not a screening instrument, not a diagnosis, not therapy, and not a monitored emergency request. No one reads your answers. Your selections are processed in this browser only, and nothing is saved unless you make a separate storage choice at the end." }));
    dialogBody.appendChild(el("p", { text:
      "You can preview every question before agreeing to anything. Inside, you choose which topics are permitted, you can skip any question, and you can stop at any moment with the Close button or the Escape key." }));

    if (!localOK()) {
      dialogBody.appendChild(el("div", { "class": "notice error", role: "alert", text:
        "Browser storage is unavailable (private browsing or blocked storage). The check-in still works, but consent preferences and saved responses cannot be kept: only the “session only” and “do not save” choices may work at the end." }));
    }

    var fs = el("fieldset", null, [ el("legend", { text: "Adult confirmation" }) ]);
    var cb = el("input", { type: "checkbox", id: "wm-adult" });
    var lb = el("label", { "for": "wm-adult" }, [cb, " I confirm that I am eighteen years of age or older."]);
    fs.appendChild(lb);
    fs.appendChild(el("p", { "class": "small" }, [
      "The check-in is designed for adults. Under eighteen? You keep full access to every article and to urgent resources without entering personal information — ",
      el("a", { href: "care.html", text: "go to Find Care & Crisis" }),
      "."
    ]));
    dialogBody.appendChild(fs);

    var continueBtn = btn("Continue", "btn btn-primary", function () {
      /* Participation consent is recorded separately from any journal entry. */
      lsSet(KEYS.consent, { participation: true, adultConfirmed: true, at: new Date().toISOString() });
      renderStep("topics");
    });
    continueBtn.disabled = true;
    cb.addEventListener("change", function () { continueBtn.disabled = !cb.checked; });

    dialogFoot.appendChild(btn("Preview all questions", "btn btn-quiet", function () { renderStep("preview"); }));
    dialogFoot.appendChild(btn("Ask me later", "btn btn-quiet", function () {
      var ok = lsSet(KEYS.invite, { choice: "later", at: new Date().toISOString() });
      state.step = "invite";
      if (supportsShowModal) { try { dialog.close(); } catch (e) { dialog.removeAttribute("open"); } } else { dialog.removeAttribute("open"); }
      afterClose(ok
        ? "“Ask me later” recorded — as a preference in this browser only. Nothing is scheduled and no one will contact you; the invitation reappears the next time you open this page. A control to clear the preference is now visible in the panel above."
        : "Browser storage is unavailable, so the “ask me later” preference could not be kept. Nothing else changed.");
      syncInvitePanel();
    }));
    dialogFoot.appendChild(btn("Not now", "btn btn-quiet", closeDialog));
    dialogFoot.appendChild(continueBtn);
  }

  /* ---------- step: full question preview ---------- */

  function renderPreview() {
    setStepTitle("Every question, previewed");
    dialogBody.appendChild(el("p", { text:
      "These are all fourteen questions and every possible answer. Nothing is recorded during preview, and previewing commits you to nothing." }));
    var i, j, k, t, q, ul, opts;
    for (i = 0; i < TOPICS.length; i++) {
      t = TOPICS[i];
      dialogBody.appendChild(el("h3", { text: t.name }));
      ul = el("ul", null, []);
      for (j = 0; j < t.questions.length; j++) {
        q = t.questions[j];
        opts = [];
        for (k = 0; k < q.options.length; k++) { opts.push(q.options[k].label); }
        ul.appendChild(el("li", null, [
          q.text + " ",
          el("span", { "class": "small", text: "(" + opts.join(" / ") + " — or skip)" })
        ]));
      }
      dialogBody.appendChild(ul);
    }
    dialogFoot.appendChild(btn("Back to the invitation", "btn btn-secondary", function () { renderStep("invite"); }));
    dialogFoot.appendChild(btn("Close", "btn btn-quiet", closeDialog));
  }

  /* ---------- step: topic-by-topic permission ---------- */

  function renderTopics() {
    setStepTitle("Which topics are permitted?");
    dialogBody.appendChild(el("p", { text:
      "Permission is granted topic by topic. A topic you do not permit is never asked about. Permitting a topic is still not an obligation to answer everything in it — every question keeps a skip control." }));

    var saved = lsGet(KEYS.topics);
    var savedIds = (saved && saved.ids instanceof Array) ? saved.ids : [];
    var fs = el("fieldset", null, [ el("legend", { text: "Permitted topics" }) ]);
    var boxes = [];
    var i, t, cb, lb;
    for (i = 0; i < TOPICS.length; i++) {
      t = TOPICS[i];
      cb = el("input", { type: "checkbox", id: "wm-topic-" + t.id, value: t.id });
      if (savedIds.indexOf(t.id) !== -1) { cb.checked = true; }
      lb = el("label", { "for": "wm-topic-" + t.id }, [cb, " " + t.name]);
      fs.appendChild(lb);
      boxes.push(cb);
    }
    dialogBody.appendChild(fs);
    dialogBody.appendChild(el("p", { "class": "small", text:
      "Your topic permissions are remembered in this browser (separately from any saved response) so they can be prefilled next time. They are cleared by “Withdraw check-in consent” or “Erase everything” in the journal." }));

    dialogFoot.appendChild(btn("Back", "btn btn-quiet", function () { renderStep("invite"); }));
    dialogFoot.appendChild(btn("Continue", "btn btn-primary", function () {
      var ids = [], j;
      for (j = 0; j < boxes.length; j++) { if (boxes[j].checked) ids.push(boxes[j].value); }
      state.permitted = ids;
      lsSet(KEYS.topics, { ids: ids, at: new Date().toISOString() });
      buildQueue();
      if (state.queue.length === 0) {
        state.resultKey = "none";
        renderStep("result");
      } else {
        state.qIndex = 0;
        renderStep("questions");
      }
    }));
  }

  function buildQueue() {
    state.queue = [];
    var i, j, t;
    for (i = 0; i < TOPICS.length; i++) {
      t = TOPICS[i];
      if (state.permitted.indexOf(t.id) === -1) continue;
      for (j = 0; j < t.questions.length; j++) {
        state.queue.push({ topicId: t.id, topicName: t.name, q: t.questions[j] });
      }
    }
  }

  /* ---------- step: questions (topic tabs + one question at a time) ---------- */

  var tabsEl = null, panelEl = null;

  function renderQuestions() {
    setStepTitle("The check-in");
    dialogBody.appendChild(el("p", { "class": "small", text:
      "One question at a time. Answer, skip, or go back. The topic tabs jump between your permitted topics (arrow keys move between tabs). Close or Escape stops everything at any moment." }));
    tabsEl = el("div", { "class": "tabs", role: "tablist", "aria-label": "Permitted topics" });
    var seen = {}, i, item, tab;
    for (i = 0; i < state.queue.length; i++) {
      item = state.queue[i];
      if (seen[item.topicId]) continue;
      seen[item.topicId] = true;
      tab = el("button", {
        type: "button", role: "tab", id: "wm-tab-" + item.topicId,
        "aria-selected": "false", tabindex: "-1", text: item.topicName,
        "data-topic": item.topicId
      });
      tab.addEventListener("click", (function (topicId) {
        return function () { jumpToTopic(topicId); };
      })(item.topicId));
      tabsEl.appendChild(tab);
    }
    tabsEl.addEventListener("keydown", tabKeydown);
    dialogBody.appendChild(tabsEl);
    panelEl = el("div", { id: "wm-qpanel", role: "tabpanel" });
    dialogBody.appendChild(panelEl);
    renderQuestionPanel(false);
  }

  function currentTopicId() {
    var item = state.queue[state.qIndex];
    return item ? item.topicId : null;
  }

  function jumpToTopic(topicId) {
    for (var i = 0; i < state.queue.length; i++) {
      if (state.queue[i].topicId === topicId) { state.qIndex = i; break; }
    }
    renderQuestionPanel(false);
  }

  function tabKeydown(e) {
    var tabs = tabsEl.querySelectorAll("[role='tab']");
    if (!tabs.length) return;
    var idx = -1, i;
    for (i = 0; i < tabs.length; i++) { if (tabs[i] === document.activeElement) { idx = i; break; } }
    if (idx === -1) return;
    var next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { next = (idx + 1) % tabs.length; }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { next = (idx - 1 + tabs.length) % tabs.length; }
    else if (e.key === "Home") { next = 0; }
    else if (e.key === "End") { next = tabs.length - 1; }
    if (next === null) return;
    e.preventDefault();
    tabs[next].focus();
    jumpToTopic(tabs[next].getAttribute("data-topic"));
    /* selection follows focus; roving tabindex is updated in syncTabs() */
  }

  function syncTabs() {
    if (!tabsEl) return;
    var current = currentTopicId();
    var tabs = tabsEl.querySelectorAll("[role='tab']"), i, is;
    for (i = 0; i < tabs.length; i++) {
      is = (tabs[i].getAttribute("data-topic") === current);
      tabs[i].setAttribute("aria-selected", is ? "true" : "false");
      tabs[i].setAttribute("tabindex", is ? "0" : "-1");
    }
    if (panelEl && current) { panelEl.setAttribute("aria-labelledby", "wm-tab-" + current); }
  }

  function renderQuestionPanel(moveFocus) {
    syncTabs();
    clearNode(panelEl);
    var item = state.queue[state.qIndex];
    if (!item) { finishQuestions(); return; }
    var key = item.topicId + "." + item.q.id;
    var head = el("p", { "class": "small", tabindex: "-1", id: "wm-qhead",
      text: item.topicName + " — question " + (state.qIndex + 1) + " of " + state.queue.length });
    panelEl.appendChild(head);

    var fs = el("fieldset", null, [ el("legend", { text: item.q.text }) ]);
    var i, opt, rid, radio, lb;
    var radios = [];
    for (i = 0; i < item.q.options.length; i++) {
      opt = item.q.options[i];
      rid = "wm-opt-" + item.topicId + "-" + item.q.id + "-" + opt.v;
      radio = el("input", { type: "radio", name: "wm-answer", id: rid, value: String(opt.v) });
      if (state.answers[key] === opt.v) { radio.checked = true; }
      lb = el("label", { "for": rid }, [radio, " " + opt.label]);
      fs.appendChild(lb);
      radios.push(radio);
    }
    panelEl.appendChild(fs);

    clearNode(dialogFoot);
    var backBtn = btn("Back", "btn btn-quiet", function () {
      if (state.qIndex === 0) { renderStep("topics"); }
      else { state.qIndex -= 1; renderQuestionPanel(true); }
    });
    var skipBtn = btn("Skip this question", "btn btn-quiet", function () {
      state.answers[key] = "skip";
      advance();
    });
    var isLast = (state.qIndex === state.queue.length - 1);
    var nextBtn = btn(isLast ? "See the result" : "Next", "btn btn-primary", function () {
      var v = null, j;
      for (j = 0; j < radios.length; j++) { if (radios[j].checked) { v = parseInt(radios[j].value, 10); break; } }
      if (v !== null) { state.answers[key] = v; advance(); }
    });
    nextBtn.disabled = (typeof state.answers[key] !== "number");
    for (i = 0; i < radios.length; i++) {
      radios[i].addEventListener("change", function () { nextBtn.disabled = false; });
    }
    dialogFoot.appendChild(backBtn);
    dialogFoot.appendChild(skipBtn);
    dialogFoot.appendChild(btn("Stop & close", "btn btn-quiet", closeDialog));
    dialogFoot.appendChild(nextBtn);

    if (moveFocus) { try { head.focus(); } catch (e) { /* no-op */ } }
  }

  function advance() {
    if (state.qIndex >= state.queue.length - 1) { finishQuestions(); }
    else { state.qIndex += 1; renderQuestionPanel(true); }
  }

  function finishQuestions() {
    state.resultKey = computeResultKey(state.answers);
    renderStep("result");
  }

  /* ---------- step: result (non-diagnostic, non-scored) ---------- */

  function renderResult() {
    var key = state.resultKey || computeResultKey(state.answers);
    state.resultKey = key;
    var meta = RESULTS[key];
    setStepTitle("Your result — not a score, not a diagnosis");

    dialogBody.appendChild(crisisBlock());
    dialogBody.appendChild(el("h3", { text: meta.title }));
    dialogBody.appendChild(el("p", { text: meta.body }));

    if (key === "attention") {
      var areas = attentionAreas(state.answers);
      if (areas.length) {
        dialogBody.appendChild(el("p", null, [
          el("strong", { text: "Where your answers pointed: " }),
          areas.join("; ") + "."
        ]));
      }
      dialogBody.appendChild(el("p", { "class": "small" }, [
        "If what you are carrying exceeds educational reflection — symptoms, risk, or a situation this tool cannot hold — the next step is qualified care: ",
        el("a", { href: "care.html", text: "Find Care & Crisis" }),
        "."
      ]));
    }

    /* Reflect answers back, without numbers. */
    if (key !== "none") {
      dialogBody.appendChild(el("h3", { text: "What you said, reflected back" }));
      var i, j, t, q, akey, val, ul;
      for (i = 0; i < TOPICS.length; i++) {
        t = TOPICS[i];
        if (state.permitted.indexOf(t.id) === -1) continue;
        dialogBody.appendChild(el("p", null, [ el("strong", { text: t.name }) ]));
        ul = el("ul", null, []);
        for (j = 0; j < t.questions.length; j++) {
          q = t.questions[j];
          akey = t.id + "." + q.id;
          val = state.answers[akey];
          if (typeof val === "number") {
            ul.appendChild(el("li", null, [q.text + " — ", el("em", { text: optionLabel(t.id, q.id, val) })]));
          } else {
            ul.appendChild(el("li", null, [q.text + " — ", el("em", { text: "Skipped" })]));
          }
        }
        dialogBody.appendChild(ul);
      }
    }

    dialogBody.appendChild(el("p", { "class": "small", text: RULE_TEXT }));
    dialogBody.appendChild(el("p", { "class": "small", text:
      "This check-in is not a screening instrument, diagnosis, therapy, or a monitored emergency request. No one is notified of anything you selected." }));

    if (state.queue.length > 0) {
      dialogFoot.appendChild(btn("Back to the questions", "btn btn-quiet", function () {
        state.qIndex = state.queue.length - 1;
        renderStep("questions");
      }));
    }
    dialogFoot.appendChild(btn("Close without saving", "btn btn-quiet", closeDialog));
    dialogFoot.appendChild(btn("Choose what to store", "btn btn-primary", function () { renderStep("storage"); }));
  }

  /* ---------- step: separate storage decision ---------- */

  function renderStorage() {
    setStepTitle("A separate decision: what should be stored?");
    dialogBody.appendChild(el("p", { text:
      "Answering was one consent; storing is another. Choose one. “On this device” means this browser profile — not encrypted storage, not a clinical record, not a cloud backup, not cross-device sync. Nothing is uploaded in any case." }));

    var lOK = localOK(), sOK = sessionOK();
    if (!lOK) {
      dialogBody.appendChild(el("div", { "class": "notice error", role: "alert", text:
        "Browser local storage is unavailable, so “Full response” and “Summary only” cannot work right now." }));
    }
    if (!sOK) {
      dialogBody.appendChild(el("div", { "class": "notice error", role: "alert", text:
        "Browser session storage is unavailable, so “Session only” cannot work right now." }));
    }

    var choices = [
      { id: "full", label: "Full response", desc: "Topics, individual answer values, result, and date — in browser local storage. Readable by anyone with access to this browser profile.", ok: lOK },
      { id: "summary", label: "Summary only", desc: "Result summary and topic names, without individual answers — in browser local storage. Still sensitive, and not encrypted by Whole Man.", ok: lOK },
      { id: "session", label: "Session only", desc: "The current response, in browser session storage. Session persistence varies with browser behavior and crash restoration — this is not a guarantee of deletion when the tab closes.", ok: sOK },
      { id: "none", label: "Do not save", desc: "No journal entry. The interaction stays in memory only and is discarded when the dialog closes.", ok: true }
    ];

    var fs = el("fieldset", null, [ el("legend", { text: "Storage choice" }) ]);
    var radios = [], i, c, radio, lb;
    for (i = 0; i < choices.length; i++) {
      c = choices[i];
      radio = el("input", { type: "radio", name: "wm-store", id: "wm-store-" + c.id, value: c.id });
      if (!c.ok) { radio.disabled = true; }
      lb = el("label", { "for": "wm-store-" + c.id }, [
        radio, " ", el("strong", { text: c.label }), " — " + c.desc + (c.ok ? "" : " (unavailable in this browser right now)")
      ]);
      fs.appendChild(lb);
      radios.push(radio);
    }
    dialogBody.appendChild(fs);
    dialogBody.appendChild(el("p", { "class": "small", text:
      "Whichever you choose, your consent preferences are stored under separate keys from journal entries, and every key can be deleted from the journal controls on this page." }));

    var applyBtn = btn("Apply my storage choice", "btn btn-primary", function () {
      var mode = null, j;
      for (j = 0; j < radios.length; j++) { if (radios[j].checked) { mode = radios[j].value; break; } }
      if (!mode) return;
      applyStorage(mode);
    });
    applyBtn.disabled = true;
    for (i = 0; i < radios.length; i++) {
      radios[i].addEventListener("change", function () { applyBtn.disabled = false; });
    }
    dialogFoot.appendChild(btn("Back to the result", "btn btn-quiet", function () { renderStep("result"); }));
    dialogFoot.appendChild(applyBtn);
  }

  function buildEntry(mode) {
    var entry = {
      id: "e" + Date.now() + Math.floor(Math.random() * 100000),
      date: new Date().toISOString(),
      mode: mode === "summary" ? "summary" : "full",
      topics: state.permitted.slice(),
      result: state.resultKey || computeResultKey(state.answers)
    };
    if (entry.mode === "full") {
      entry.answers = {};
      for (var k in state.answers) {
        if (Object.prototype.hasOwnProperty.call(state.answers, k)) { entry.answers[k] = state.answers[k]; }
      }
    }
    return entry;
  }

  function applyStorage(mode) {
    var ok = true, text;
    if (mode === "full" || mode === "summary") {
      var entries = loadEntries();
      entries.unshift(buildEntry(mode));
      ok = saveEntries(entries);
      text = ok
        ? (mode === "full"
          ? "Saved: your full response (topics, answer values, result, date) is in this browser's local storage. It will stay until you delete it — there is no automatic expiry."
          : "Saved: a summary (result and topic names, without individual answers) is in this browser's local storage. It will stay until you delete it — there is no automatic expiry.")
        : "Saving failed: browser local storage refused the write. Nothing was stored.";
    } else if (mode === "session") {
      ok = ssSet(KEYS.session, buildEntry("full"));
      text = ok
        ? "Kept for this session: your response is in browser session storage. Session persistence varies with browser behavior and crash restoration."
        : "Saving failed: browser session storage refused the write. Nothing was stored.";
    } else {
      text = "Nothing was saved. Your selections were discarded from memory, and no analytics exist that could reconstruct them.";
    }
    state.savedThisRun = ok && mode !== "none";
    renderSavedWith(text, ok);
    renderJournal();
  }

  function renderSaved() { renderSavedWith("Done.", true); }

  function renderSavedWith(text, ok) {
    state.step = "saved";
    clearNode(dialogBody);
    clearNode(dialogFoot);
    setStepTitle("Storage choice applied");
    dialogBody.appendChild(el("div", { "class": ok ? "notice ok" : "notice error", role: "status", text: text }));
    dialogBody.appendChild(el("p", { "class": "small", text:
      "Review, edit, export, and delete controls — including delete-all and full erasure — are in the journal panel on the check-in page, under “Your journal on this device.”" }));
    dialogFoot.appendChild(btn("Close", "btn btn-primary", closeDialog));
    focusTitle();
  }

  /* ================= journal ================= */

  var journalStatus = null;

  function jStatus(msg, withUndo) {
    if (!journalStatus) return;
    clearNode(journalStatus);
    journalStatus.hidden = !msg;
    if (!msg) return;
    journalStatus.appendChild(document.createTextNode(msg + " "));
    if (withUndo && state.lastDeleted) {
      journalStatus.appendChild(btn("Undo", "btn-small", function () {
        var entries = loadEntries();
        var idx = Math.min(state.lastDeleted.index, entries.length);
        entries.splice(idx, 0, state.lastDeleted.entry);
        saveEntries(entries);
        state.lastDeleted = null;
        renderJournal();
        jStatus("The deleted response was restored.");
      }));
    }
    try { journalStatus.focus(); } catch (e) { /* no-op */ }
  }

  function renderJournal() {
    clearNode(journalBody);
    journalStatus = el("div", { "class": "notice", role: "status", tabindex: "-1" });
    journalStatus.hidden = true;

    if (!localOK()) {
      journalBody.appendChild(el("div", { "class": "notice error", role: "alert", text:
        "Browser local storage is unavailable (private browsing or blocked storage). Saved responses cannot be stored or displayed in this browser. Session-only storage may still work while the tab is open." }));
    }

    var entries = loadEntries();
    var sessionEntry = validateEntry(ssGet(KEYS.session));
    var consent = lsGet(KEYS.consent);

    var countText = entries.length === 1 ? "1 saved response" : entries.length + " saved responses";
    journalBody.appendChild(el("p", null, [
      el("strong", { text: countText }),
      " in this browser's local storage" + (sessionEntry ? ", plus 1 session response in browser session storage." : ". No session response is present."),
      " Saved entries never expire automatically — they stay until you delete them. The journal lists at most " + MAX_ENTRIES + " valid entries; malformed stored data is filtered out rather than displayed."
    ]));
    journalBody.appendChild(el("p", { "class": "small", text:
      consent && consent.participation
        ? "Participation consent: recorded in this browser (separately from entries). Withdrawing it below does not delete stored entries — withdrawal and deletion are separate controls."
        : "Participation consent: none recorded in this browser." }));
    journalBody.appendChild(journalStatus);

    var i;
    for (i = 0; i < entries.length; i++) {
      journalBody.appendChild(renderEntry(entries[i], i, false));
    }
    if (sessionEntry) {
      journalBody.appendChild(renderEntry(sessionEntry, -1, true));
    }

    /* global journal controls */
    var controls = el("div", { "class": "entry" }, [
      el("div", { "class": "entry-meta", text: "Journal controls" })
    ]);
    var actions = el("div", { "class": "entry-actions" });
    var confirmZone = el("div", null, []);

    actions.appendChild(btn("Export my check-in data (JSON)", "btn-small", function () {
      stageConfirm(confirmZone,
        "The exported file is plain, unencrypted text. Anyone who can open the file can read everything in it — answers, results, dates, and preferences. Store or delete it accordingly.",
        "Download unencrypted JSON", false, function () {
          exportData(entries, sessionEntry);
          jStatus("Export downloaded. Remember: the file is unencrypted and outside this site's deletion controls.");
        });
    }));

    if (entries.length) {
      actions.appendChild(btn("Delete all saved responses", "btn-small danger", function () {
        stageConfirm(confirmZone,
          "Delete all " + entries.length + " saved response" + (entries.length === 1 ? "" : "s") + " from this browser's local storage? Your session response, consent preferences, topic permissions, and invitation preference are not touched by this action. Exported files and backups are unaffected.",
          "Delete all saved responses", true, function () {
            lsRemove(KEYS.entries);
            state.lastDeleted = null;
            renderJournal();
            jStatus("All saved responses were deleted from this browser's local storage.");
          });
      }));
    }

    if (consent && consent.participation) {
      actions.appendChild(btn("Withdraw check-in consent", "btn-small danger", function () {
        stageConfirm(confirmZone,
          "Withdraw participation consent and clear topic permissions from this browser? Your " + entries.length + " saved response" + (entries.length === 1 ? "" : "s") + " will remain until you delete " + (entries.length === 1 ? "it" : "them") + " separately — withdrawal and deletion are deliberately separate controls.",
          "Withdraw consent", true, function () {
            lsRemove(KEYS.consent);
            lsRemove(KEYS.topics);
            renderJournal();
            jStatus("Participation consent withdrawn and topic permissions cleared. Stored entries were not deleted.");
          });
      }));
    }

    actions.appendChild(btn("Erase everything", "btn-small danger", function () {
      stageConfirm(confirmZone,
        "Erase every piece of check-in information this site keeps in this browser: " + entries.length + " saved response" + (entries.length === 1 ? "" : "s") + ", any session response, participation consent, topic permissions, and the invitation preference. This removes the site's known browser-storage keys. It cannot remove operating-system backups, browser sync histories, forensic traces, exported files, screenshots, or copies elsewhere.",
        "Erase everything", true, function () {
          lsRemove(KEYS.entries);
          lsRemove(KEYS.consent);
          lsRemove(KEYS.topics);
          lsRemove(KEYS.invite);
          ssRemove(KEYS.session);
          state.lastDeleted = null;
          syncInvitePanel();
          renderJournal();
          jStatus("Everything was erased: responses, session response, consent, topic permissions, and the invitation preference.");
        });
    }));

    controls.appendChild(actions);
    controls.appendChild(confirmZone);
    journalBody.appendChild(controls);
  }

  function resultTitleFor(entry) {
    return RESULTS[entry.result] ? RESULTS[entry.result].title : entry.result;
  }

  function renderEntry(entry, index, isSession) {
    var wrap = el("div", { "class": "entry" });
    var modeLabel = isSession ? "Session only (browser session storage)"
      : (entry.mode === "full" ? "Full response" : "Summary only");
    wrap.appendChild(el("div", { "class": "entry-meta", text: formatDate(entry.date) + " · " + modeLabel }));
    wrap.appendChild(el("p", null, [ el("strong", { text: "Result: " }), resultTitleFor(entry) ]));

    var detail = el("div", null, []);
    var confirmZone = el("div", null, []);
    var actions = el("div", { "class": "entry-actions" });

    var reviewBtn = el("button", { type: "button", "class": "btn-small", "aria-expanded": "false", text: "Review answers" });
    reviewBtn.addEventListener("click", function () {
      var open = reviewBtn.getAttribute("aria-expanded") === "true";
      reviewBtn.setAttribute("aria-expanded", open ? "false" : "true");
      clearNode(detail);
      if (!open) { detail.appendChild(reviewView(entry)); }
    });
    actions.appendChild(reviewBtn);

    if (!isSession && entry.mode === "full") {
      var editBtn = el("button", { type: "button", "class": "btn-small", "aria-expanded": "false", text: "Edit answers" });
      editBtn.addEventListener("click", function () {
        var open = editBtn.getAttribute("aria-expanded") === "true";
        editBtn.setAttribute("aria-expanded", open ? "false" : "true");
        clearNode(detail);
        if (!open) { detail.appendChild(editView(entry, index)); }
      });
      actions.appendChild(editBtn);
    }

    if (isSession) {
      actions.appendChild(btn("Delete session response", "btn-small danger", function () {
        stageConfirm(confirmZone,
          "Delete the session response from browser session storage? Saved local-storage responses and consent preferences are not touched.",
          "Delete session response", true, function () {
            ssRemove(KEYS.session);
            renderJournal();
            jStatus("The session response was deleted from browser session storage.");
          });
      }));
    } else {
      actions.appendChild(btn("Delete", "btn-small danger", function () {
        stageConfirm(confirmZone,
          "Delete this one saved response (" + formatDate(entry.date) + ", " + modeLabel.toLowerCase() + ") from this browser's local storage? Other saved responses, the session response, and consent preferences are not touched. A brief undo will be offered.",
          "Delete this response", true, function () {
            var entries = loadEntries();
            for (var i = 0; i < entries.length; i++) {
              if (entries[i].id === entry.id) {
                state.lastDeleted = { entry: entries[i], index: i };
                entries.splice(i, 1);
                break;
              }
            }
            saveEntries(entries);
            renderJournal();
            jStatus("The response was deleted from this browser's local storage.", true);
          });
      }));
    }

    wrap.appendChild(actions);
    wrap.appendChild(confirmZone);
    wrap.appendChild(detail);
    return wrap;
  }

  function reviewView(entry) {
    var box = el("div", null, []);
    if (entry.mode === "summary") {
      box.appendChild(el("p", { "class": "small", text:
        "Summary entry — individual answers were not stored, by your choice. Topics covered: " +
        entryTopicNames(entry).join("; ") + ". Result: " + resultTitleFor(entry) + "." }));
      return box;
    }
    var i, j, t, q, key, val, ul;
    for (i = 0; i < TOPICS.length; i++) {
      t = TOPICS[i];
      if (entry.topics.indexOf(t.id) === -1) continue;
      box.appendChild(el("p", null, [ el("strong", { text: t.name }) ]));
      ul = el("ul", null, []);
      for (j = 0; j < t.questions.length; j++) {
        q = t.questions[j];
        key = t.id + "." + q.id;
        val = entry.answers ? entry.answers[key] : undefined;
        if (typeof val === "number") {
          ul.appendChild(el("li", null, [q.text + " — ", el("em", { text: optionLabel(t.id, q.id, val) })]));
        } else {
          ul.appendChild(el("li", null, [q.text + " — ", el("em", { text: "Skipped" })]));
        }
      }
      box.appendChild(ul);
    }
    return box;
  }

  function entryTopicNames(entry) {
    var names = [], i, t;
    for (i = 0; i < entry.topics.length; i++) {
      t = topicById(entry.topics[i]);
      if (t) names.push(t.name);
    }
    return names;
  }

  function editView(entry, index) {
    var box = el("div", null, []);
    box.appendChild(el("p", { "class": "small", text:
      "Change any stored answer value. The result title is recalculated from the fixed four-state rule after an edit — no score is created." }));
    var controls = [], i, j, t, q, key, val, fs, k, opt, rid, radio, lb, sid, sradio, slb;
    for (i = 0; i < TOPICS.length; i++) {
      t = TOPICS[i];
      if (entry.topics.indexOf(t.id) === -1) continue;
      for (j = 0; j < t.questions.length; j++) {
        q = t.questions[j];
        key = t.id + "." + q.id;
        val = entry.answers ? entry.answers[key] : undefined;
        fs = el("fieldset", null, [ el("legend", { text: t.name + ": " + q.text }) ]);
        var group = "wm-edit-" + entry.id + "-" + key;
        var groupRadios = [];
        for (k = 0; k < q.options.length; k++) {
          opt = q.options[k];
          rid = group + "-" + opt.v;
          radio = el("input", { type: "radio", name: group, id: rid, value: String(opt.v) });
          if (val === opt.v) { radio.checked = true; }
          lb = el("label", { "for": rid }, [radio, " " + opt.label]);
          fs.appendChild(lb);
          groupRadios.push(radio);
        }
        sid = group + "-skip";
        sradio = el("input", { type: "radio", name: group, id: sid, value: "skip" });
        if (typeof val !== "number") { sradio.checked = true; }
        slb = el("label", { "for": sid }, [sradio, " Marked skipped"]);
        fs.appendChild(slb);
        groupRadios.push(sradio);
        controls.push({ key: key, radios: groupRadios });
        box.appendChild(fs);
      }
    }
    box.appendChild(btn("Save changes to this entry", "btn btn-secondary", function () {
      var entries = loadEntries(), e = null, i2, j2, c, v;
      for (i2 = 0; i2 < entries.length; i2++) { if (entries[i2].id === entry.id) { e = entries[i2]; break; } }
      if (!e) { jStatus("This entry no longer exists in local storage."); renderJournal(); return; }
      e.answers = e.answers || {};
      for (i2 = 0; i2 < controls.length; i2++) {
        c = controls[i2];
        v = "skip";
        for (j2 = 0; j2 < c.radios.length; j2++) {
          if (c.radios[j2].checked) { v = c.radios[j2].value; break; }
        }
        e.answers[c.key] = (v === "skip") ? "skip" : parseInt(v, 10);
      }
      e.result = computeResultKey(e.answers);
      saveEntries(entries);
      renderJournal();
      jStatus("Entry updated. The result title was recalculated: “" + resultTitleFor(e) + "”.");
    }));
    return box;
  }

  /* Staged confirmation naming the exact scope of a destructive action. */
  function stageConfirm(zone, scopeText, actionLabel, danger, onConfirm) {
    clearNode(zone);
    var note = el("div", { "class": "notice", role: "alert", tabindex: "-1" }, [
      el("p", { text: scopeText })
    ]);
    var row = el("div", { "class": "entry-actions" });
    row.appendChild(btn(actionLabel, danger ? "btn-small danger" : "btn-small", function () {
      clearNode(zone);
      onConfirm();
    }));
    row.appendChild(btn("Cancel", "btn-small", function () { clearNode(zone); }));
    note.appendChild(row);
    zone.appendChild(note);
    try { note.focus(); } catch (e) { /* no-op */ }
  }

  /* ================= export (Blob download, no network) ================= */

  function exportData(entries, sessionEntry) {
    var payload = {
      exportedAt: new Date().toISOString(),
      source: "Whole Man adult well-being check-in (no-account, browser-only)",
      warning: "This file is plain, unencrypted text. Anyone who can open it can read it. It is outside the site's deletion controls once downloaded.",
      consent: lsGet(KEYS.consent),
      topicPermissions: lsGet(KEYS.topics),
      invitationPreference: lsGet(KEYS.invite),
      savedResponses: entries,
      sessionResponse: sessionEntry || null
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var d = new Date();
    var stamp = d.getFullYear() + "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
      ("0" + d.getDate()).slice(-2);
    a.href = url;
    a.download = "whole-man-checkin-export-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ================= init ================= */

  syncInvitePanel();
  renderJournal();
})();

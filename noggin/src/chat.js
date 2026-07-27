/* NOGGIN — the chat surface.

   His replies type out one character at a time with the same blip voice as his
   idle rambling, so the panel reads as him speaking rather than as a log
   printing. Queued lines drain in order, and pressing send while he is still
   going makes him finish the current line instantly — he will not be told to
   hurry up twice. */
(function (NG) {
  'use strict';

  const CHARS_PER_SEC = 90;
  const LINE_GAP = 0.18;

  function Chat(audio, brain, els) {
    this.audio = audio;
    this.brain = brain;
    this.log = els.log;
    this.input = els.input;
    this.form = els.form;

    this.queue = [];
    this.typingEl = null;
    this.full = '';
    this.shown = 0;
    this.gap = 0;
    this.lastActivity = -1e9;
    this._blip = 0;
    this.onSpawn = null;
    this.onClear = null;

    const self = this;
    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      self.send(self.input.value);
      self.input.value = '';
    });
    /* Typing in the box must not trigger the game's single-key shortcuts. */
    this.input.addEventListener('keydown', function (e) { e.stopPropagation(); });
  }

  Chat.prototype.busy = function () {
    return !!this.typingEl || this.queue.length > 0;
  };

  Chat.prototype._append = function (cls, text) {
    const row = document.createElement('div');
    row.className = 'msg ' + cls;
    row.textContent = text || '';
    this.log.appendChild(row);
    /* Keep the transcript from growing without bound over a long session. */
    while (this.log.childNodes.length > 60) this.log.removeChild(this.log.firstChild);
    this.log.scrollTop = this.log.scrollHeight;
    return row;
  };

  /* Queue entries carry an optional callback that fires the moment that line
     finishes typing, which is how the specimen arrives *after* he has said he
     will fetch it rather than materialising while he is still offering. */
  Chat.prototype.say = function (lines, afterFirstLine) {
    for (let i = 0; i < lines.length; i++) {
      this.queue.push({ text: lines[i], after: i === 0 ? (afterFirstLine || null) : null });
    }
  };

  Chat.prototype.send = function (raw) {
    const text = String(raw || '').trim();
    if (!text) return;
    this.lastActivity = 0;

    /* A second send finishes the current line rather than stacking up. Run its
       pending callback too, or an interrupted line would swallow its spawn. */
    if (this.typingEl) {
      this.typingEl.textContent = this.full;
      this.typingEl.classList.remove('typing');
      this.typingEl = null;
      this._runAfter();
    }

    this._append('you', text);
    if (this.onSend) this.onSend();
    const reply = this.brain.respond(text);
    if (reply.clear && this.onClear) this.onClear();
    const self = this;
    this.say(reply.lines, reply.spawn ? function () {
      if (self.onSpawn) self.onSpawn(reply.spawn);
    } : null);
  };

  Chat.prototype.update = function (dt) {
    this.lastActivity += dt;

    if (!this.typingEl) {
      if (this.gap > 0) { this.gap -= dt; return; }
      if (!this.queue.length) return;
      const item = this.queue.shift();
      this.full = item.text;
      this._after = item.after;
      this.shown = 0;
      this.typingEl = this._append('him typing', '');
      return;
    }

    const before = Math.floor(this.shown);
    this.shown = Math.min(this.full.length, this.shown + CHARS_PER_SEC * dt);
    const now = Math.floor(this.shown);
    if (now !== before) {
      this.typingEl.textContent = this.full.slice(0, now);
      this.log.scrollTop = this.log.scrollHeight;
      for (let i = before; i < now; i++) {
        const ch = this.full.charAt(i);
        if (ch === ' ' || ch === '\n') continue;
        if (++this._blip % 5 === 0) this.audio.blip(ch.charCodeAt(0));
      }
    }
    if (this.shown >= this.full.length) {
      this.typingEl.classList.remove('typing');
      this.typingEl = null;
      this.gap = LINE_GAP;
      this._runAfter();
    }
  };

  Chat.prototype._runAfter = function () {
    const fn = this._after;
    this._after = null;
    if (fn) fn();
  };

  NG.Chat = Chat;
})(window.NG = window.NG || {});

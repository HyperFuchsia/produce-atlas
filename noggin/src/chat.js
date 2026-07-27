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

  Chat.prototype.say = function (lines) {
    for (let i = 0; i < lines.length; i++) this.queue.push(lines[i]);
  };

  Chat.prototype.send = function (raw) {
    const text = String(raw || '').trim();
    if (!text) return;
    this.lastActivity = 0;

    /* A second send finishes the current line rather than stacking up. */
    if (this.typingEl) {
      this.typingEl.textContent = this.full;
      this.typingEl.classList.remove('typing');
      this.typingEl = null;
    }

    this._append('you', text);
    const reply = this.brain.respond(text);
    if (reply.clear && this.onClear) this.onClear();
    if (reply.spawn && this.onSpawn) this.onSpawn(reply.spawn);
    this.say(reply.lines);
  };

  Chat.prototype.update = function (dt) {
    this.lastActivity += dt;

    if (!this.typingEl) {
      if (this.gap > 0) { this.gap -= dt; return; }
      if (!this.queue.length) return;
      this.full = this.queue.shift();
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
    }
  };

  NG.Chat = Chat;
})(window.NG = window.NG || {});

/* NOGGIN — the mouth.

   He talks whenever he is left alone, one unsolicited botany fact after
   another, and he does not read the room. Grabbing his face cuts him off
   mid-word; letting go makes him start the exact same fact over from the
   beginning, which is the entire joke. */
(function (NG) {
  'use strict';

  const M = NG.M;

  /* Every fact here is true. He is annoying, not wrong. */
  const FACTS = [
    'a banana is botanically a berry, and a strawberry is not a berry at all.',
    'broccoli, cauliflower, kale, cabbage, kohlrabi and brussels sprouts are all the same species. Brassica oleracea. One plant. Six haircuts.',
    'a peanut is not a nut. It is a legume, and it grows underground, which nuts have the decency not to do.',
    'the cashew grows dangling off the bottom of a fleshy false fruit called a cashew apple, like an afterthought.',
    'almonds are the seeds of a drupe. They are close relatives of peaches. You have been eating peach cousins.',
    'vanilla comes from the seed pod of an orchid. The only orchid we bother to eat.',
    'the strawberry wears its seeds on the outside, and technically those are not even seeds. They are tiny fruits called achenes.',
    'orange carrots are a recent fashion. For most of their history carrots were purple, white, and yellow.',
    'a pineapple plant takes around two years to produce one single pineapple. One. In two years.',
    'the cacao pods grow straight out of the trunk of the tree, not the branches. It is called cauliflory and it looks deeply wrong.',
    'nutmeg and mace are two different spices harvested from the same fruit. Same fruit! Two spices! Value!',
    'cinnamon is just bark. You are seasoning your breakfast with bark.',
    'the chilli burn comes from capsaicin, and birds cannot taste it at all. The plant is spicy specifically at mammals. At us.',
    'apples do not grow true from seed. Plant a seed from your favourite apple and you get a stranger. Every named variety is a cutting of one original tree.',
    'the Cavendish banana you buy is a sterile clone. Wild bananas are packed with hard black seeds and are frankly unpleasant.',
    'rhubarb stalks are a dessert and rhubarb leaves are poisonous. Same plant. Choose carefully.',
    'maize was domesticated from a scrawny grass called teosinte with about a dozen kernels on it.',
    'potatoes were domesticated in the Andes, and there are still thousands of varieties there in colours you would not accept in a shop.',
    'an avocado is a berry. One enormous seed, one berry. I do not make the rules.',
    'saffron is the dried stigma of a crocus flower, and each flower gives you three. That is why it costs what it costs.',
    'cucumbers, pumpkins, courgettes, melons and watermelons are all one family. The gourds. A big damp family.',
    'lettuce is in the daisy family. You are eating an unopened flower relative in your sandwich.',
    'most wasabi served outside Japan is horseradish with green colouring. Real wasabi is a fussy riverside plant that hates being farmed.',
    'black pepper and chilli peppers are completely unrelated. Columbus got confused and the name stuck for five centuries.',
    'the kiwifruit was called the Chinese gooseberry until New Zealand exporters decided that was bad for business.',
    'pineapple contains bromelain, an enzyme that digests protein. When you eat pineapple, the pineapple is also eating you.',
    'watermelon is about ninety two percent water, which really should have been obvious from the name.',
    'onions make you cry using a gas they build on purpose the moment you cut them. It is a chemical alarm. You triggered it.',
    'brazil nuts mostly still come from wild rainforest trees, because the trees refuse to cooperate on plantations.',
    'a tomato is a fruit, a berry in fact, and the reason it sits in the savoury aisle is entirely cultural.',
    'figs are not really a fruit, they are an inside-out cluster of flowers. You are eating a bouquet.',
    'asparagus can grow around ten centimetres in a single day, which means it is faster than it looks and it knows it.',
    'garlic and onions and leeks and chives are all the same genus. Allium. The whole pungent gang.',
    'the durian is banned on public transport in parts of Southeast Asia. That is a fruit with a criminal record.',
    'oats, wheat, rice, maize, barley and sugarcane are all grasses. Most of what humanity eats is grass.',
    'a coconut is not a nut either. It is a drupe. Nothing is a nut. I have looked into it and almost nothing is a nut.'
  ];

  const OPENERS = [
    'Oh! Oh! Did you know?',
    'Okay okay okay, but did you know',
    'HEY. Hey. Hey. Did you know',
    'Right, so, anyway, did you know',
    'This one is important. Did you know',
    'I have been saving this one. Did you know',
    'Not to interrupt myself, but did you know',
    'You are going to love this. Did you know',
    'Wait wait wait. Did you know',
    'Nobody ever asks me this, but did you know'
  ];

  /* Trailing neediness, appended once he has been ignored for a while. */
  const TAGS = [
    ' ...Anyway. Anyway! What were we doing.',
    ' I could go on. I am going to go on.',
    ' Are you even listening to me.',
    ' No, don\'t answer. I will just keep talking.',
    ' That is the kind of thing I know.',
    ' Take your time. Absorb it.',
    ' I have four hundred more of these.',
    ' You are welcome, by the way.',
    ' I said what I said.'
  ];

  const INTERRUPTS = ['MMPH!', 'GHK—', 'hey—', 'excuse me—', 'ow ow ow—', 'MMF—', 'not the face—'];

  const RESUMPTIONS = [
    'As I was SAYING.',
    'Rude.',
    'You could have just asked me to stop.',
    'Where was I. Right.',
    'I am not even mad. I am going to keep talking.',
    'Unbelievable. Anyway.',
    'We are not done here.',
    'I will start again. From the top.'
  ];

  const CHARS_PER_SEC = 34;
  const HOLD_AFTER_LINE = 1.9;
  const GAP_BETWEEN_LINES = 0.55;
  const INTERRUPT_FLASH = 1.0;
  const RESUME_DELAY = 0.7;

  function Chatter(audio, bubbleEl, textEl) {
    this.audio = audio;
    this.bubble = bubbleEl;
    this.text = textEl;
    this.enabled = true;

    this.mode = 'waiting';     /* waiting | typing | holding | flash | muted */
    this.timer = 0.9;
    this.full = '';
    this.shown = 0;
    this.pendingFact = null;   /* the fact he was cut off during */
    this.lineCount = 0;
    this.rand = M.rng(0x1f2e3d4c);
    this._lastBlip = 0;
    this._visible = false;
  }

  Chatter.prototype._pick = function (list) {
    return list[Math.floor(this.rand() * list.length) % list.length];
  };

  Chatter.prototype._compose = function () {
    /* Reuse the interrupted fact so that cutting him off costs you the whole
       thing over again. */
    const fact = this.pendingFact || this._pick(FACTS);
    this.pendingFact = null;
    let line = this._pick(OPENERS) + ' ' + fact;
    /* The longer he goes unbothered, the needier the sign-off. */
    if (this.lineCount >= 1 && this.rand() < 0.75) line += this._pick(TAGS);
    return { line: line, fact: fact };
  };

  Chatter.prototype._show = function (visible) {
    if (this._visible === visible) return;
    this._visible = visible;
    this.bubble.classList.toggle('show', visible);
  };

  Chatter.prototype.setEnabled = function (on) {
    this.enabled = on;
    if (!on) {
      this._show(false);
      this.mode = 'waiting';
      this.timer = 1.2;
      this.shown = 0;
    }
  };

  /* Grabbing his face cuts him off wherever he happens to be. */
  Chatter.prototype.interrupt = function () {
    if (!this.enabled) return;
    if (this.mode === 'typing' || this.mode === 'holding') {
      this.pendingFact = this.currentFact || null;
      const cut = this.full.slice(0, Math.max(1, this.shown)) + '—' + this._pick(INTERRUPTS);
      this.text.textContent = cut;
      this.mode = 'flash';
      this.timer = INTERRUPT_FLASH;
      this.lineCount = 0;
    } else {
      this._show(false);
      this.mode = 'muted';
    }
  };

  /* Let go and he restarts the same fact, prefaced with a complaint. */
  Chatter.prototype.resume = function () {
    if (!this.enabled) return;
    this.mode = 'waiting';
    this.timer = RESUME_DELAY;
    this.resumeWith = this._pick(RESUMPTIONS);
  };

  Chatter.prototype.silence = function () {
    this._show(false);
    this.mode = 'muted';
    this.shown = 0;
  };

  Chatter.prototype.update = function (dt, busy) {
    this._update(dt, busy);
    /* The caret only belongs there while he is actually mid-sentence. */
    this.bubble.classList.toggle('done', this.mode !== 'typing');
  };

  Chatter.prototype._update = function (dt, busy) {
    if (!this.enabled) return;

    if (busy) {
      /* Stay out of the way while his face is being handled, except for the
         brief indignant squawk. */
      if (this.mode === 'flash') {
        this.timer -= dt;
        this._show(true);
        if (this.timer <= 0) { this._show(false); this.mode = 'muted'; }
      } else if (this.mode !== 'muted') {
        this.interrupt();
      }
      return;
    }

    if (this.mode === 'flash') {
      this.timer -= dt;
      if (this.timer <= 0) { this._show(false); this.mode = 'waiting'; this.timer = GAP_BETWEEN_LINES; }
      return;
    }

    if (this.mode === 'muted') {
      this.mode = 'waiting';
      this.timer = RESUME_DELAY;
    }

    if (this.mode === 'waiting') {
      this.timer -= dt;
      if (this.timer > 0) return;
      const composed = this._compose();
      this.full = this.resumeWith ? this.resumeWith + ' ' + composed.line : composed.line;
      this.currentFact = composed.fact;
      this.resumeWith = null;
      this.shown = 0;
      this.text.textContent = '';
      this.mode = 'typing';
      this._show(true);
      return;
    }

    if (this.mode === 'typing') {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.full.length, this.shown + CHARS_PER_SEC * dt);
      const now = Math.floor(this.shown);
      if (now !== before) {
        this.text.textContent = this.full.slice(0, now);
        /* One blip every few characters, skipping whitespace, so it reads as
           speech rather than a machine gun. */
        for (let i = before; i < now; i++) {
          const ch = this.full.charAt(i);
          if (ch === ' ' || ch === '\n') continue;
          if (++this._lastBlip % 3 === 0) this.audio.blip(ch.charCodeAt(0));
        }
      }
      if (this.shown >= this.full.length) {
        this.mode = 'holding';
        this.timer = HOLD_AFTER_LINE;
        this.lineCount++;
      }
      return;
    }

    if (this.mode === 'holding') {
      this.timer -= dt;
      if (this.timer <= 0) { this.mode = 'waiting'; this.timer = GAP_BETWEEN_LINES; }
    }
  };

  Chatter.FACTS = FACTS;
  NG.Chatter = Chatter;
})(window.NG = window.NG || {});

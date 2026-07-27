/* NOGGIN — the mouth.

   He never stops. He talks through the sandbox, he talks through your timed
   run, he talks over himself. Grabbing his face cuts him off mid-word, and
   letting go makes him restart the exact same fact from the beginning, which
   means interrupting him is strictly worse than letting him finish.

   Two counters drive the escalation: how many lines he has delivered without
   being interrupted (he gets needier), and how many times you have cut him off
   (he gets wounded). Both feed the tier tables below. */
(function (NG) {
  'use strict';

  const M = NG.M;

  /* Every fact here is true. He is obnoxious, not wrong. */
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
    'Nobody ever asks me this, but did you know',
    'Sorry, sorry, one more. Did you know',
    'I will be quick, I promise. Did you know',
    'Before you do anything else. Did you know',
    'You did not ask. Did you know'
  ];

  /* Joins that let him bolt a second fact onto a sentence he was finishing. */
  const CHAINS = [
    ' AND ANOTHER THING.',
    ' Oh! And this is related.',
    ' Which reminds me.',
    ' No wait, this is the good one.',
    ' Hang on, hang on, hang on.',
    ' I am not finished.'
  ];

  /* Sign-offs, escalating with how long he has been ignored. */
  const TAGS = [
    [ /* tier 0: mildly pleased with himself */
      ' That is the kind of thing I know.',
      ' You are welcome, by the way.',
      ' Take your time. Absorb it.',
      ' I said what I said.'
    ],
    [ /* tier 1: fishing for a reaction */
      ' Are you even listening to me.',
      ' ...Anyway. Anyway! What were we doing.',
      ' No, don\'t answer. I will just keep talking.',
      ' You could react. At any point. To any of this.',
      ' I could go on. I am going to go on.'
    ],
    [ /* tier 2: openly needy */
      ' I have four hundred more of these and nowhere to put them.',
      ' Say something. Say ANYTHING. I will take a grunt.',
      ' Is this thing on. Is my mouth working. It feels like it is working.',
      ' You are just going to sit there. Fine. FINE.',
      ' I am going to keep doing this until one of us changes.'
    ],
    [ /* tier 3: unhinged */
      ' I HAVE BEEN TALKING FOR A WHILE NOW AND I AM NOT SLOWING DOWN.',
      ' At this point I am not even sure you are real. I am fine with that.',
      ' We live here now. This is our life. Facts about plants, forever.',
      ' I could stop. I have chosen not to. There is a difference and it is important.'
    ]
  ];

  const INTERRUPTS = [
    'MMPH!', 'GHK—', 'hey—', 'excuse me—', 'ow ow ow—', 'MMF—',
    'not the face—', 'I WAS TALKING—', 'urgh—', 'RUDE—'
  ];

  /* Complaints on release, escalating with how many times you have done it. */
  const RESUMPTIONS = [
    [ /* tier 0 */
      'As I was SAYING.',
      'Rude.',
      'Where was I. Right.',
      'You could have just asked me to stop.'
    ],
    [ /* tier 1 */
      'Okay. We are doing this again apparently.',
      'I will start over. From the top. Because of you.',
      'Unbelievable. Anyway.',
      'That is twice now. I am counting.'
    ],
    [ /* tier 2 */
      'You know I have to start the whole thing over, right? That is how this works.',
      'Every time you do that, the fact gets longer. That is a real rule.',
      'I am not even mad. I am going to keep talking. Forever.',
      'We are not done here. We are so far from done.'
    ],
    [ /* tier 3 */
      'GRAB ME AGAIN. SEE WHAT HAPPENS. I WILL SIMPLY BEGIN AGAIN.',
      'You cannot skip these. There is no skip button. I checked. I built the thing.',
      'This is my whole personality and you are making it worse.',
      'At this point the interrupting IS the conversation and I am thriving.'
    ]
  ];

  /* Barked over whatever he was mid-way through when something happens. */
  const REACTIONS = {
    pop: [
      'OH, you liked THAT did you.',
      'Sure. Ignore me, hit the ring. Cool. Great.',
      'Nice. Genuinely. Now back to the plants.',
      'You are good at this and bad at listening.',
      'A ring! Amazing! Do you want to hear about legumes now?'
    ],
    miss: [
      'You missed. I saw it. I was watching the whole time.',
      'Oh no. Anyway.',
      'That one got away. Like my train of thought. Which you did that to.',
      'Missed! Would you like a fact instead? I have facts.'
    ],
    combo: [
      'Okay that was actually impressive and I hate that I said it.',
      'A COMBO. Meanwhile I am over here with a cashew fact nobody wants.',
      'Fine! Fine. You are having fun. I will just narrate.'
    ],
    over: [
      'Time! And you did not learn a single thing about brassicas.',
      'And THAT is why you should have been listening to me.',
      'Round over. My round never ends. I am still going.'
    ],
    start: [
      'Oh we are doing rings now? Fine. I will talk THROUGH it.',
      'Go ahead. Chase your little hoops. I will be right here. Talking.'
    ]
  };

  const CHARS_PER_SEC = 44;
  const HOLD_AFTER_LINE = 0.5;
  const GAP_BETWEEN_LINES = 0.12;
  const INTERRUPT_FLASH = 0.9;
  const RESUME_DELAY = 0.45;

  function tier(n, table) {
    return table[Math.min(n, table.length - 1)];
  }

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
    this.queue = [];           /* barked reactions jump ahead of new facts */
    this.lineCount = 0;        /* lines delivered since last interruption */
    this.interruptCount = 0;   /* times you have grabbed him mid-sentence */
    this.rand = M.rng((Date.now() & 0x7fffffff) || 1);
    this._lastBlip = 0;
    this._visible = false;
  }

  Chatter.prototype._pick = function (list) {
    return list[Math.floor(this.rand() * list.length) % list.length];
  };

  Chatter.prototype._compose = function () {
    /* Reuse the interrupted fact so cutting him off costs you the whole thing
       over again. */
    const fact = this.pendingFact || this._pick(FACTS);
    this.pendingFact = null;
    let line = this._pick(OPENERS) + ' ' + fact;

    /* The longer he goes unbothered, the needier the sign-off — and the more
       likely he is to staple a second fact on before you can leave. */
    const t = Math.floor(this.lineCount / 2);
    if (this.lineCount >= 1) line += this._pick(tier(t, TAGS));
    if (this.lineCount >= 2 && this.rand() < 0.45) {
      line += this._pick(CHAINS) + ' ' + this._pick(FACTS);
    }
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
      this.queue.length = 0;
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
      this.interruptCount++;
    } else {
      this._show(false);
      this.mode = 'muted';
    }
  };

  /* Let go and he restarts the same fact, prefaced with a complaint whose
     bitterness scales with how often you have done this. */
  Chatter.prototype.resume = function () {
    if (!this.enabled) return;
    this.mode = 'waiting';
    this.timer = RESUME_DELAY;
    this.resumeWith = this._pick(tier(Math.floor((this.interruptCount - 1) / 2), RESUMPTIONS));
  };

  /* Something happened in the game and he has an opinion about it. He will
     talk over his own sentence to deliver it, then go back to the fact. */
  Chatter.prototype.react = function (kind) {
    if (!this.enabled) return;
    const pool = REACTIONS[kind];
    if (!pool) return;
    this.queue.push(this._pick(pool));
    if (this.mode === 'typing' || this.mode === 'holding') {
      if (!this.pendingFact) this.pendingFact = this.currentFact || null;
      this.mode = 'waiting';
      this.timer = 0.05;
    }
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
      if (this.queue.length) {
        this.full = this.queue.shift();
      } else {
        const composed = this._compose();
        this.full = this.resumeWith ? this.resumeWith + ' ' + composed.line : composed.line;
        this.currentFact = composed.fact;
      }
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
  Chatter.REACTIONS = REACTIONS;
  NG.Chatter = Chatter;
})(window.NG = window.NG || {});

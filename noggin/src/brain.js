/* NOGGIN — what he says back.

   Not a language model. This runs entirely offline: it matches an entry in the
   atlas, works out which aspect you asked about, and answers from curated data.
   That is a deliberate trade — for an evidence-led atlas, a small set of
   verified answers beats a large set of confident guesses.

   It keeps a subject in context, so "how big is it?" works after "let's talk
   about an apple". */
(function (NG) {
  'use strict';

  const K = NG.K;
  const C = NG.C;
  const P = NG.P;
  const M = NG.M;

  /* It is about this wide, which is the yardstick for every comparison. */
  const SELF_CM = 23;

  const ASPECTS = [
    { id: 'size', words: ['how big', 'how large', 'how small', 'how tall', 'how wide', 'size', 'scale', 'dimensions', 'measure', 'cm', 'centimet', 'inches'] },
    { id: 'origin', words: ['where', 'from', 'origin', 'native', 'come from', 'grown', 'grow', 'country', 'region'] },
    { id: 'family', words: ['family', 'related', 'relative', 'cousin', 'genus', 'species', 'binomial', 'latin', 'scientific name', 'botanical name', 'called'] },
    { id: 'type', words: ['what is it', 'what is a', 'what are', 'fruit or veg', 'is it a fruit', 'is it a vegetable', 'is it a berry', 'berry', 'classif', 'botanically', 'technically'] },
    { id: 'taste', words: ['taste', 'flavour', 'flavor', 'sweet', 'sour', 'bitter', 'eat', 'edible', 'nice'] },
    { id: 'history', words: ['history', 'domestic', 'ancient', 'wild', 'ancestor', 'bred', 'first', 'old'] },
    { id: 'seeds', words: ['seed', 'seeds', 'pip', 'pips', 'stone', 'pit', 'core'] },
    { id: 'more', words: ['more', 'else', 'another', 'fact', 'interesting', 'tell me', 'go on', 'anything'] }
  ];

  const GREETING_WORDS = ['hello', 'hi ', 'hey', 'yo ', 'howdy', 'how are you', 'how is it going', 'hows it going', 'good morning', 'good evening', 'sup'];
  const CLEAR_WORDS = ['clear', 'remove', 'delete', 'get rid', 'take it away', 'put it back', 'tidy', 'reset the'];
  const LIST_WORDS = ['what do you know', 'what can you', 'help', 'list', 'options', 'everything', 'what have you got', 'topics'];
  const THANKS_WORDS = ['thank', 'thanks', 'cheers', 'nice one', 'good job'];
  /* "What are you" is not answered here. Describing yourself in a paragraph is
     the one thing this is built not to do, so identity is a routine in
     concepts.js: it runs through all three states of matter and lets the claim
     rest on what you just watched. C.find catches it before anything below. */
  const BECOME_WORDS = ['become', 'turn into', 'turn yourself into', 'transform into',
    'shapeshift', 'morph into', 'change into', 'be a ', 'be an ', 'you be ', 'show me you as'];
  const REVERT_WORDS = ['be yourself', 'yourself again', 'change back', 'go back to normal',
    'turn back', 'revert', 'stop being', 'be you again', 'undo that', 'back to normal'];
  /* Becoming the thing is the default. These are the ways of asking for the
     old behaviour instead — the specimen standing beside it, so the two can
     be compared at true scale. */
  const PLACE_WORDS = ['next to you', 'beside you', 'in the room', 'on the table',
    'side by side', 'next to yourself', 'conjure', 'summon', 'put one', 'bring one',
    'compared to you', 'against you'];

  function has(text, words) {
    for (let i = 0; i < words.length; i++) if (text.indexOf(words[i]) !== -1) return true;
    return false;
  }

  /* "a apple" reads as a bug even when the botany is right. */
  function article(word) {
    return /^[aeiou]/i.test(word) ? 'an' : 'a';
  }
  function an(word) { return article(word) + ' ' + word; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  /* Plural for "what would you like to know about X?" */
  function plural(name) {
    if (/s$/.test(name)) return name;
    if (/(ch|sh|x|z)$/.test(name)) return name + 'es';
    if (/o$/.test(name)) return name + 'es';
    if (/[^aeiou]y$/.test(name)) return name.slice(0, -1) + 'ies';
    return name + 's';
  }

  function Brain() {
    this.subject = null;
    this.factCursor = {};
    this.introduced = false;   /* the menu of options is worth saying once */
    this.rand = M.rng((Date.now() & 0x7fffffff) || 3);
    this.turns = 0;
  }

  Brain.prototype._pick = function (list) {
    return list[Math.floor(this.rand() * list.length) % list.length];
  };

  /* "8 cm across — about a third the width of my head" */
  Brain.prototype._sizeLine = function (e) {
    const long = e.lengthCm || e.sizeCm;
    const wide = e.widthCm || e.sizeCm;
    const ratio = wide / SELF_CM;
    let cmp;
    if (ratio < 0.12) cmp = 'a mote, next to what I usually am';
    else if (ratio < 0.3) cmp = 'about a quarter of my usual width';
    else if (ratio < 0.45) cmp = 'roughly a third of my usual size';
    else if (ratio < 0.7) cmp = 'over half my usual width';
    else if (ratio < 1.1) cmp = 'as wide as I usually am, which is upsetting';
    else cmp = 'wider than I usually am. Which is a lot to be';
    const fmt = function (v) { return (Math.round(v * 10) / 10) + ''; };
    return fmt(long) + ' cm long and ' + fmt(wide) + ' cm across — ' + cmp + '.';
  };

  Brain.prototype._nextFact = function (e) {
    const i = this.factCursor[e.id] || 0;
    this.factCursor[e.id] = (i + 1) % e.facts.length;
    return e.facts[i];
  };

  Brain.prototype._answer = function (e, aspect) {
    switch (aspect) {
      case 'size':
        return [cap(an(e.name)) + ' is ' + this._sizeLine(e)];
      case 'origin':
        return ['It comes from ' + e.origin + '.',
          e.ancestor ? 'Its wild ancestor is ' + e.ancestor + '. Which nobody would eat on purpose.'
            : cap(this._nextFact(e)) + '.'];
      case 'family':
        return ['Family: ' + e.family + '. Binomial: ' + e.binomial + '.',
          'I know that off by heart. I know all of them off by heart. Nobody has ever asked before.'];
      case 'type':
        return ['Botanically, ' + an(e.name) + ' is ' + (K.TYPES[e.type] || e.type) + '.',
          cap(this._nextFact(e)) + '.'];
      case 'taste':
        return ['It tastes ' + e.taste + '.'];
      case 'history':
        return [cap(plural(e.name)) + ' come from ' + e.origin + '.',
          cap(this._nextFact(e)) + '.'];
      case 'seeds':
        return [cap(this._nextFact(e)) + '.',
          'Ask me something harder. Please. I am begging you.'];
      case 'more':
      default:
        return [cap(this._nextFact(e)) + '.'];
    }
  };

  /* The main entry point. Returns { lines, spawn, clear }. */
  Brain.prototype.respond = function (input) {
    const raw = String(input || '').trim();
    const text = ' ' + raw.toLowerCase() + ' ';
    this.turns++;

    if (!raw) return { lines: ['You pressed send with nothing in it. Bold.'] };

    /* Concepts come before everything else: "what does the fourth dimension
       look like" mentions no specimen and is not a question about one. */
    const lesson = C.find(raw);
    if (lesson) return { lesson: lesson, lines: [] };

    /* Revert before become, so "stop being a banana" is not read as "banana". */
    if (has(text, REVERT_WORDS)) {
      return {
        revert: true,
        lines: [this._pick([
          'Fine. Back to nothing in particular.',
          'As you like. This is me with nothing on.',
          'Letting go of it. Ask me to be something else whenever.'
        ])]
      };
    }

    if (has(text, CLEAR_WORDS) && !K.find(raw)) {
      const had = this.subject;
      this.subject = null;
      return {
        clear: true, revert: true,
        lines: had
          ? ['Fine. Not ' + an(had.name) + ' any more. I hope you are happy.',
             'I can be literally any of ' + K.ENTRIES.length + ' things. Just say the word. Say a word. Any word.']
          : ['There is nothing to clear. You cleared nothing. Congratulations.']
      };
    }

    if (has(text, LIST_WORDS)) {
      const names = K.names();
      return {
        lines: ['I can be ' + names.length + ' things, at their real size.',
          names.join(', ') + '.',
          'Name one and I turn into it. Then ask me how big it is, where it is from, what family it is in, what it tastes like, or just say "more" and I will keep going until you stop me.']
      };
    }

    const entry = K.find(raw);

    /* The default answer to anything nameable is to become it. Naming a thing
       is enough — "pineapple" is a complete instruction — and asking about one
       is the same instruction with a question attached. Explaining is what it
       does while wearing the thing, not instead of showing you. */
    if (entry) {
      const aspect = this._detectAspect(text);
      const fresh = entry !== this.subject;
      this.subject = entry;

      /* Unless you specifically want it standing next to itself. */
      if (has(text, PLACE_WORDS)) {
        const lines = ['Beside me, then. Hold on.',
          'There it is. A real one — ' + this._sizeLine(entry)];
        if (aspect && aspect !== 'more') lines.push.apply(lines, this._answer(entry, aspect));
        return { lines: lines, spawn: entry };
      }

      const lines = [];
      if (fresh) {
        lines.push(this._pick([
          cap(an(entry.name)) + '. Watch.',
          'Easy. Watch this.',
          cap(an(entry.name)) + '. Give me a second.',
          'Right. Hold still.'
        ]));
      }
      if (aspect && aspect !== 'more') {
        lines.push.apply(lines, this._answer(entry, aspect));
      } else if (fresh) {
        lines.push('There. ' + cap(an(entry.name)) + ' — ' + this._sizeLine(entry));
      } else {
        lines.push(cap(this._nextFact(entry)) + '.');
      }
      if (fresh && !this.introduced) {
        this.introduced = true;
        lines.push('Ask me anything about it. I am it now, so I would know. Say "be yourself again" when you want me back.');
      }
      return { lines: lines, morph: fresh ? entry : null };
    }

    /* Asked to become something it has never heard of. */
    if (has(text, BECOME_WORDS)) {
      return {
        lines: ['I can only be things in the atlas — ' + K.ENTRIES.length + ' of them.',
          'Try "pineapple". Just the word. Say "help" for the whole list.']
      };
    }

    if (has(text, GREETING_WORDS)) {
      return {
        lines: [this._pick([
          'Hey! Hi. Hello. You typed at me!',
          'Oh good, you are here. I have been talking to nobody.',
          'Hello! I was starting to think you were furniture.'
        ]),
          'Name any food plant and I become it, at its real size, and then talk about it until you physically stop me. Try "apple". Just the word.']
      };
    }

    if (has(text, THANKS_WORDS)) {
      return { lines: [this._pick([
        'You are welcome. Do not go. Ask another one.',
        'Finally, some recognition. Ask me about pineapples.',
        'See, this is what I am here for. Well. This and being stretched.'
      ])] };
    }

    /* Follow-up about whatever is already floating there. */
    if (this.subject) {
      const aspect = this._detectAspect(text);
      if (aspect) return { lines: this._answer(this.subject, aspect) };
      /* No known aspect and no known plant: admit it, then carry on anyway. */
      const lines = [this._pick([
        'I have no idea what you just asked me.',
        'That went straight past me.',
        'No clue. Not in the atlas, not in my head.'
      ])];
      lines.push('Here is another thing about ' + plural(this.subject.name) + ' instead, because I am like this.');
      lines.push(cap(this._nextFact(this.subject)) + '.');
      return { lines: lines };
    }

    return {
      lines: [this._pick([
        'I do not have that one. I am an atlas of food plants, not a search engine.',
        'No idea what that is. Ask me about something you could eat.',
        'That is outside my remit, and my remit is plants you can put in a pan.'
      ]),
        'Try one of these: ' + K.names().slice(0, 8).join(', ') + '... or say "help" for the whole list.']
    };
  };

  Brain.prototype._detectAspect = function (text) {
    for (let i = 0; i < ASPECTS.length; i++) {
      if (has(text, ASPECTS[i].words)) return ASPECTS[i].id;
    }
    return null;
  };

  Brain.prototype.greeting = function () {
    return ['Hey. Ask me what I am.',
      'Or name a food plant — just the word — and I will turn into it, at its actual size. You can also reach in and pull at me. I am not as solid as I look.'];
  };

  NG.Brain = Brain;
})(window.NG = window.NG || {});

/* Produce Atlas — concepts it can show you.

   The atlas answers questions about things that exist. This is for ideas, and
   an idea is worth showing rather than describing: each step names a form the
   being takes and says one thing about it, so the explanation happens in the
   scene and the text is only the commentary.

   Steps run in order. `form` morphs the being ('self' returns it to its own
   shape); `phase` changes what it is made of; `wire` switches a wireframe
   overlay on or off; `gap` is the pause after the line, and `hold` waits on
   the scene instead of on a clock — which is what gives the change time to
   land before the next sentence arrives. */
(function (NG) {
  'use strict';

  const C = {};

  /* Forms that are not produce. The being takes these the same way it takes
     an apple — projected onto its own topology. */
  C.FORMS = {
    point: { kind: 'point', size: 0.055, color: [0.96, 0.97, 1.0] },
    line: { kind: 'box', hx: 0.024, hy: 1.0, hz: 0.024, color: [0.88, 0.93, 1.0] },
    square: { kind: 'box', hx: 0.85, hy: 0.85, hz: 0.024, color: [0.78, 0.88, 1.0] },
    cube: { kind: 'box', hx: 0.72, hy: 0.72, hz: 0.72, color: [0.68, 0.83, 1.0] },
    seed: { kind: 'point', size: 0.10, color: [0.95, 0.97, 1.0] },
    /* Slow: a melt that snaps is not a melt. */
    puddle: { kind: 'puddle', radius: 1.62, dome: 0.30, base: 0.085, morphDur: 1.8, color: [0.42, 0.62, 0.92] },
    /* Slower still, so the plume has time to rise before it opens out. */
    cloud: { kind: 'cloud', radius: 1.72, wobble: 0.28, morphDur: 2.1, color: [0.72, 0.82, 1.0] }
  };

  C.LESSONS = {
    /* Asked what it is, it does not describe itself. Describing yourself is
       what a chat box does, and the answer is always the same paragraph. It
       runs through all three states of matter instead and lets the claim at
       the end rest on something you have just watched happen. */
    identity: {
      match: ['what are you', 'who are you', 'what is this', 'what r u',
        'are you an ai', 'are you a bot', 'are you real', 'are you alive',
        'what am i looking at', 'introduce yourself', 'tell me about yourself',
        'what do you do', 'what are you here for', 'what are you for',
        'what is your purpose', 'wtf are you', 'what can you do'],
      steps: [
        { text: 'What am I. Easier to show you.', phase: 'poised', gap: 0.8 },

        /* One word per state, so the word lands and then the room does the
           talking. The hold means the silence after "Solid." is exactly as
           long as the fall, however long the fall turns out to be. */
        { text: 'Solid.', phase: 'solid', hold: 'land', gap: 1.7 },

        { text: 'Liquid.', form: 'puddle', phase: 'liquid', gap: 2.4 },

        { text: 'Gas.', form: 'cloud', phase: 'gas', gap: 2.6 },

        { text: 'So: I can be anything.', form: 'self', phase: 'free', gap: 0.9 },

        { text: 'And I am here for anything. Name something — anything I know — and watch what happens.' }
      ]
    },

    /* Asked specifically what it is made of, it does not answer either — it
       demonstrates, at length, at its own pace, and does not wait for you to
       catch up. */
    matter: {
      match: ['solid liquid or gas', 'solid liquid and gas', 'solid or liquid',
        'liquid or gas', 'liquid or a gas', 'are you solid', 'are you a solid',
        'are you a liquid', 'are you a gas', 'state of matter', 'states of matter',
        'what are you made of', 'what are you made out of'],
      steps: [
        { text: 'Solid, liquid or gas.', phase: 'poised', gap: 0.85 },

        { text: 'Hold on. Let me check.', phase: 'solid', hold: 'land', gap: 0.45 },

        /* It asks, and the gap is exactly long enough to make you start
           thinking of an answer. */
        { text: 'What do you think now?', gap: 1.7 },

        { text: 'No. Do not answer. I was not finished.',
          form: 'puddle', phase: 'liquid', gap: 0.25 },

        { text: 'This is a puddle of me. I have no idea how I am still talking.', gap: 1.9 },

        { text: 'And this—', form: 'cloud', phase: 'gas', gap: 0.2 },

        { text: '—is gas. Try grabbing me now. Go on. Try.', gap: 2.2 },

        { text: 'So: all three, obviously. I am whichever one is funnier at the time.',
          form: 'self', phase: 'free', gap: 0.6 },

        { text: 'Ask me something harder. I have been practising.' }
      ]
    },

    dimensions: {
      /* Deliberately no bare "dimension": "what are its dimensions" is a
         question about a specimen's size, not a request for a physics lesson. */
      match: ['fourth dimension', '4th dimension', 'forth dimension', ' 4d ', 'tesseract',
        'hypercube', 'higher dimension', 'other dimension', 'more dimensions',
        'dimensions look like', 'dimension look like', 'what is a dimension',
        'explain dimensions', 'the dimensions work'],
      steps: [
        { text: 'The fourth dimension. Right. I cannot show you one, but I can show you its shadow. Start from nothing and we will build up to it.', gap: 0.9 },

        { text: 'Zero dimensions. A point. It has a position and nothing else — no length, no width, no depth. There is nowhere to go inside it.',
          form: 'point', gap: 2.0 },

        { text: 'Drag that point along one direction and it sweeps out a line. One dimension. Now there is somewhere to go: forwards and backwards, and nothing else.',
          form: 'line', gap: 2.0 },

        { text: 'Drag the line sideways, at a right angle to itself, and you get a square. Two dimensions. Two directions to move in, and four corners where before there were two.',
          form: 'square', gap: 2.0 },

        { text: 'Drag the square at a right angle to both of those, and you get a cube. Three dimensions, eight corners. This is where you live.',
          form: 'cube', gap: 2.2 },

        { text: 'Now do it once more. Drag the cube in a direction at a right angle to all three at once.', gap: 1.3 },

        { text: 'You cannot picture that direction. Neither can I, and I am made of maths. But the thing it makes is real, and this is what its shadow looks like in your three dimensions.',
          form: 'seed', wire: true, gap: 2.6 },

        { text: 'A tesseract. Sixteen corners, thirty-two edges, eight cubic faces. What you are seeing is a 3-D shadow of a 4-D object, the way a cube casts a flat 2-D shadow on paper.',
          gap: 2.4 },

        { text: 'The inner cube is not smaller. It is the same size as the outer one — it only looks small because it is further away along the fourth direction. Your eye reads that distance as size, because that is all it has.',
          gap: 2.6 },

        { text: 'And watch it turn. Nothing is stretching, nothing is growing. That is one rigid object rotating through a direction you cannot point at, and the corners are trading places as it goes.',
          gap: 2.6 },

        { text: 'That is the honest answer: you never see a fourth dimension. You see what it does to the things you can see. Say "be yourself again" when you have had enough.' }
      ]
    }
  };

  /* Which routine, if any, a phrase is asking for.

     Longest match wins, not first. "What are you made of" contains "what are
     you", and the more specific reading is always the right one — relying on
     the order of the table instead would make adding a routine able to
     silently steal phrases from another. */
  C.find = function (text) {
    const t = ' ' + String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const ids = Object.keys(C.LESSONS);
    let best = null, bestLen = 0;
    for (let i = 0; i < ids.length; i++) {
      const l = C.LESSONS[ids[i]];
      for (let j = 0; j < l.match.length; j++) {
        const m = l.match[j];
        if (m.length > bestLen && t.indexOf(m) !== -1) { best = ids[i]; bestLen = m.length; }
      }
    }
    return best;
  };

  /* ---- tesseract ---------------------------------------------------------- */

  /* The 16 corners of a 4-cube, and the 32 edges joining corners that differ
     in exactly one coordinate. */
  C.TESSERACT = (function () {
    const verts = [];
    for (let i = 0; i < 16; i++) {
      verts.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1
      ]);
    }
    const edges = [];
    for (let a = 0; a < 16; a++) {
      for (let b = a + 1; b < 16; b++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) if (verts[a][k] !== verts[b][k]) diff++;
        if (diff === 1) edges.push([a, b]);
      }
    }
    return { verts: verts, edges: edges };
  })();

  /* Rotate in the xw and yw planes, then project 4-D to 3-D by perspective
     from the w axis: corners further along w land closer to the centre, which
     is exactly why the inner cube looks small. */
  C.projectTesseract = function (out, angleXW, angleYW, scale, distance) {
    const v = C.TESSERACT.verts;
    const ca = Math.cos(angleXW), sa = Math.sin(angleXW);
    const cb = Math.cos(angleYW), sb = Math.sin(angleYW);
    for (let i = 0; i < 16; i++) {
      const x0 = v[i][0], y0 = v[i][1], z0 = v[i][2], w0 = v[i][3];
      const x1 = x0 * ca - w0 * sa;
      const w1 = x0 * sa + w0 * ca;
      const y1 = y0 * cb - w1 * sb;
      const w2 = y0 * sb + w1 * cb;
      const k = distance / (distance - w2);
      const p = out[i] || (out[i] = [0, 0, 0]);
      p[0] = x1 * k * scale;
      p[1] = y1 * k * scale;
      p[2] = z0 * k * scale;
    }
    return out;
  };

  NG.C = C;
})(window.NG = window.NG || {});

/* ============================================================================
   QA-77 — the apparatus, as actual geometry.

   Everything before the rebuild was painted onto flat DOM: gradients standing
   in for form, blurred ellipses standing in for shadow. It fought back every
   time, because a drawing of a box is not a box. This is a real scene — meshes,
   physical materials, lights that cast, a camera you move.

   The design is the original one and not a reinterpretation of it: Atlas
   Electronics, monochrome throughout, an LCD reel window with 16x16 pixel
   sprites, the instrument strip under it, the OBSERVE bar, and the Public Luck
   Authority service panel across the belly. An intermediate version of this
   file went off into navy, brass and printed paper reel strips. It is not that
   machine. It is this one, built so you can walk round it.

   Units are metres.
   ========================================================================== */
(function () {
  "use strict";

  var T = THREE;
  var W = 0.66, H = 1.70, D = 0.62;      /* the cabinet, 26 x 67 x 24 inches */
  var TAU = Math.PI * 2;
  var FZ = D / 2;                        /* the front face */

  /* ---------------------------------------------------------------- stage -- */
  var canvas = document.getElementById("scene");
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  var MAXA = renderer.capabilities.getMaxAnisotropy();

  var scene = new T.Scene();
  scene.background = new T.Color(0x060607);
  scene.fog = new T.FogExp2(0x060607, 0.085);

  /* An environment. Physical materials are mostly reflection, and without
     something to reflect they come out as flat lambert no matter how many
     lights are added — which is exactly what the CSS version could never fix.
     Neutral grey, because nothing on this machine is allowed to be a colour. */
  (function () {
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    var x = c.getContext("2d");
    var sky = x.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0.00, "#2E3134");
    sky.addColorStop(0.44, "#16181A");
    sky.addColorStop(0.52, "#0C0D0E");
    sky.addColorStop(1.00, "#050506");
    x.fillStyle = sky; x.fillRect(0, 0, 1024, 512);
    function blob(cx, cy, r, col, a) {
      var g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
      x.globalAlpha = a; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
      x.globalAlpha = 1;
    }
    blob(300, 120, 215, "#F2F2F0", 1.0);      /* the key softbox */
    blob(770, 185, 165, "#C6CBD0", 0.75);     /* a second, behind right */
    blob(120, 300, 140, "#8A8F94", 0.35);
    blob(520, 470, 320, "#2A2C2E", 0.5);      /* floor bounce */
    var tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.colorSpace = T.SRGBColorSpace;
    var pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
  })();

  var camera = new T.PerspectiveCamera(32, 1, 0.012, 80);

  /* ------------------------------------------------------------ materials -- */
  /* Monochrome, all of it. Metalness stays low on the paint: every point of it
     scales the diffuse term straight down, and side-on the cabinet goes to an
     unreadable slab. The clearcoat, not the metalness, is what says sprayed. */
  var paint = new T.MeshPhysicalMaterial({
    color: 0x3A3D40, roughness: 0.40, metalness: 0.10,
    clearcoat: 0.55, clearcoatRoughness: 0.24
  });
  var paintMid = new T.MeshPhysicalMaterial({
    color: 0x45484B, roughness: 0.42, metalness: 0.10,
    clearcoat: 0.45, clearcoatRoughness: 0.28
  });
  var paintDark = new T.MeshPhysicalMaterial({
    color: 0x1C1E20, roughness: 0.52, metalness: 0.14,
    clearcoat: 0.35, clearcoatRoughness: 0.35
  });
  var cavity = new T.MeshStandardMaterial({
    color: 0x08090A, roughness: 0.94, metalness: 0.0
  });
  var steel = new T.MeshPhysicalMaterial({
    color: 0xB9BEC2, roughness: 0.22, metalness: 1.0
  });
  var steelDim = new T.MeshPhysicalMaterial({
    color: 0x7E8387, roughness: 0.34, metalness: 1.0
  });
  var keyCap = new T.MeshPhysicalMaterial({
    color: 0x25282B, roughness: 0.36, metalness: 0.10,
    clearcoat: 0.7, clearcoatRoughness: 0.18
  });
  var observeCap = new T.MeshPhysicalMaterial({     /* the one warm thing */
    color: 0xC9C2AC, roughness: 0.34, metalness: 0.06,
    clearcoat: 0.6, clearcoatRoughness: 0.22
  });

  /* ------------------------------------------------------------- geometry -- */
  function roundedPath(w, h, r, Ctor, ox, oy) {
    var s = new (Ctor || T.Shape)();
    var x = -w / 2 + (ox || 0), y = -h / 2 + (oy || 0);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);      s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);      s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);          s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function extrude(shape, d, bevel) {
    var g = new T.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, d - bevel * 2), bevelEnabled: bevel > 0,
      bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12
    });
    g.translate(0, 0, -(d - bevel * 2) / 2);
    return g;
  }
  /* ExtrudeGeometry's bevel grows OUTWARD from the profile: bevelSize is how far
     past the outline it reaches. Feed it the finished size and every part comes
     out 2*bevel too big, which puts the flank 12 mm from where anything mounted
     against it expects to find it. Shrink the profile first. */
  function slab(w, h, d, r, bevel, mat) {
    bevel = bevel === undefined ? 0.008 : bevel;
    var m = new T.Mesh(extrude(roundedPath(w - 2 * bevel, h - 2 * bevel,
      Math.max(0.002, (r || 0.014) - bevel)), d, bevel), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  /* A frame, with the same compensation — and a guard on it. The bevel eats
     into the border from BOTH sides: the outer edge shrinks by it and the hole
     grows by it. Give this a border thinner than 2*bevel and the hole comes out
     larger than the outline, the shape inverts, and it triangulates into a
     filled slab that renders as a black rectangle over whatever it framed. */
  function ring(ow, oh, iw, ih, orad, irad, d, bevel, mat) {
    var border = Math.min(ow - iw, oh - ih) / 2;
    bevel = Math.min(bevel, Math.max(0.0004, border * 0.4));
    var s = roundedPath(ow - 2 * bevel, oh - 2 * bevel, Math.max(0.002, orad - bevel));
    s.holes.push(roundedPath(iw + 2 * bevel, ih + 2 * bevel, irad + bevel, T.Path));
    var m = new T.Mesh(extrude(s, d, bevel), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function box(w, h, d, mat) {
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  /* Every moving part on the cabinet is one of these: a number that eases from
     0 to 1 and a function that decides what that means. Keys turn, toggles
     flip, the stamp falls, the cover lifts, the lever swings — all of it is the
     same three lines running once per frame. */
  var anims = [];
  function anim(rate, apply) {
    var a = { v: 0, target: 0, rate: rate, apply: apply };
    anims.push(a); apply(0);
    return a;
  }

  /* ------------------------------------------------------------ printing -- */
  var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  /* Everything that glows registers here, because the apparatus spends the
     first part of the game in pieces on the floor with no power in it. */
  var LIT = [], power = 0;
  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }
  /* A panel whose face is a canvas that can be redrawn. Everything on the front
     of this machine is a printed plate or a lit read-out, and several of them
     say something different once you have used it. */
  function livePanel(w, h, cw, ch, draw, glow) {
    var c = makeCanvas(cw, ch), ctx = c.getContext("2d");
    var tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = MAXA;
    var mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({
      map: tex, emissive: 0xFFFFFF, emissiveMap: tex,
      emissiveIntensity: glow === undefined ? 0.22 : glow,
      roughness: 0.48, metalness: 0
    }));
    LIT.push({ m: mesh.material, base: mesh.material.emissiveIntensity });
    mesh.redraw = function () { draw(ctx, cw, ch); tex.needsUpdate = true; };
    mesh.redraw();
    return mesh;
  }
  /* letter-spaced text, which is most of the typographic character of the
     original: everything is tracked out and upper case */
  function tracked(x, text, cx, cy, spacing, align) {
    var chars = String(text).split("");
    var total = 0, i;
    for (i = 0; i < chars.length; i++) total += x.measureText(chars[i]).width + spacing;
    total -= spacing;
    var px = align === "left" ? cx : align === "right" ? cx - total : cx - total / 2;
    x.textAlign = "left";
    for (i = 0; i < chars.length; i++) {
      x.fillText(chars[i], px, cy);
      px += x.measureText(chars[i]).width + spacing;
    }
    return total;
  }

  /* ------------------------------------------------------------- the room -- */
  var floor = new T.Mesh(new T.CircleGeometry(14, 64), new T.MeshPhysicalMaterial({
    color: 0x0C0D0F, roughness: 0.48, metalness: 0.08,
    clearcoat: 0.42, clearcoatRoughness: 0.42
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* --------------------------------------------------------- the cabinet -- */
  /* One upright box, not a body with a head balanced on it. The original is a
     single slab whose whole front is a stack of plates, and the seam where a
     separate head would meet it is the first thing that would give it away. */
  var machine = new T.Group();
  scene.add(machine);

  /* ------------------------------------------------------- the assemblies -- */
  /* The cabinet is built as ten separate assemblies rather than one heap of
     meshes, because the game begins with all ten of them lying on the floor.
     Everything goes in through ADD, which routes it to whichever assembly is
     open; endPart then moves the group's origin to the middle of what was
     built, so it can be laid down and stood up again without swinging around
     the machine's origin a metre away. */
  var PARTS = [], openPart = null;
  function ADD(o) { (openPart ? openPart.group : machine).add(o); return o; }
  /* find-or-create, because an assembly is not one contiguous run of code —
     the carcass picks up its flanks and its back long after the front of it */
  function beginPart(name, label) {
    for (var i = 0; i < PARTS.length; i++) {
      if (PARTS[i].name === name) { openPart = PARTS[i]; return openPart; }
    }
    var g = new T.Group();
    machine.add(g);
    openPart = { name: name, label: label || name, group: g };
    PARTS.push(openPart);
    return openPart;
  }
  function endPart() { openPart = null; }
  /* Once everything is built, move each group's origin to the middle of what
     it contains. Until that happens the children carry absolute coordinates
     and the group's origin is the machine's, a metre away, so laying a part
     down would swing it round the cabinet rather than turn it over. */
  function finalizeParts() {
    PARTS.forEach(function (p) {
      var bb = new T.Box3().setFromObject(p.group);
      var c = new T.Vector3(); bb.getCenter(c);
      p.group.children.forEach(function (ch) { ch.position.sub(c); });
      p.group.position.copy(c);
      p.fitPos = c.clone();
      p.fitQuat = p.group.quaternion.clone();
      p.local = bb.clone().translate(c.clone().negate());
      p.size = new T.Vector3(); p.local.getSize(p.size);
      p.fitted = true;
    });
  }

  beginPart("CARCASS", "THE CARCASS");
  var bodyH = H - 0.10;
  var body = slab(W, bodyH, D, 0.012, 0.008, paint);
  body.position.y = 0.10 + bodyH / 2;
  ADD(body);

  endPart();
  beginPart("PLINTH", "THE PLINTH");
  var plinth = slab(W * 0.97, 0.10, D * 0.96, 0.010, 0.005, paintDark);
  plinth.position.y = 0.05;
  ADD(plinth);
  endPart();
  beginPart("CARCASS");

  /* the polished corner posts, which is what catches the light on the original
     and reads as a machine with an edge rather than a rendered cuboid */
  [-1, 1].forEach(function (s) {
    var post = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, H - 0.02, 20, 1, false,
      -Math.PI * 0.10, Math.PI * 1.20), steel);
    post.position.set(s * (W / 2 - 0.014), H / 2, FZ - 0.014);
    post.rotation.y = s > 0 ? -Math.PI * 0.30 : Math.PI * 0.30;
    post.castShadow = true;
    ADD(post);
  });

  /* the top: a vent grille across it and a bright strip along the front edge */
  for (var tg = 0; tg < 11; tg++) {
    var slot = box(W * 0.74, 0.008, 0.009, cavity);
    slot.position.set(0, H - 0.003, FZ - 0.075 - tg * 0.026);
    ADD(slot);
  }
  var topLip = box(W * 0.99, 0.012, 0.014, steelDim);
  topLip.position.set(0, H - 0.008, FZ - 0.006);
  ADD(topLip);
  endPart();

  /* ------------------------------------------------------- the front face -- */
  /* Laid out from the top down in the proportions of the original: header
     plate, two state windows, the display, the instrument strip, the message
     line, the controls, the notice, the two mouths, the service panel. */
  function at(y) { return y; }
  var PW = W * 0.93;                        /* the width the plates run to */

  function plate(w, h, cy, cw, ch, draw, glow, frame) {
    var p = livePanel(w, h, cw, ch, draw, glow);
    p.position.set(0, cy, FZ + 0.0015);
    ADD(p);
    if (frame !== false) {
      var f = ring(w + 0.022, h + 0.022, w, h, 0.008, 0.003, 0.010, 0.003, steelDim);
      f.position.set(0, cy, FZ + 0.004);
      ADD(f);
    }
    return p;
  }

  /* ---- the header ---- */
  beginPart("HEADER", "THE HEADER PLATE");
  var headerY = 1.628, headerH = 0.082;
  var header = plate(PW, headerH, headerY, 1500, 240, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#EFEDE7"); g.addColorStop(1, "#DAD8D1");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "#15171A";
    x.textBaseline = "middle";
    x.font = "700 62px " + MONO;
    tracked(x, "ATLAS·ELECTRONICS", 44, h * 0.36, 3, "left");
    x.fillStyle = "#3C4045";
    x.font = "500 30px " + MONO;
    tracked(x, "QUANTUM DETERMINATION", w - 44, h * 0.30, 5, "right");
    tracked(x, "APPARATUS", w - 44, h * 0.60, 5, "right");
    x.font = "500 26px " + MONO;
    x.fillStyle = "#6A6F74";
    tracked(x, "QA-77", w - 44, 34, 4, "right");
    x.strokeStyle = "#9AA0A5"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(44, h - 34); x.lineTo(w - 44, h - 34); x.stroke();
  }, 0.34);

  /* ---- the two state windows ---- */
  /* The label lives in a closure variable, not on the mesh: livePanel draws
     once as it builds, so anything the draw reads off the returned object is
     still undefined the first time round. */
  function stateWindow(cx, w, cy, initial) {
    var text = initial;
    var p = livePanel(w, 0.040, 620, 88, function (x, cw, ch) {
      x.fillStyle = "#DFDDD6"; x.fillRect(0, 0, cw, ch);
      x.strokeStyle = "#8B9095"; x.lineWidth = 4;
      x.strokeRect(6, 6, cw - 12, ch - 12);
      x.fillStyle = "#1A1D20";
      x.textBaseline = "middle";
      x.font = "500 34px " + MONO;
      tracked(x, text, 26, ch / 2 + 1, 4, "left");
    }, 0.30);
    p.set = function (s) { text = s; p.redraw(); };
    p.position.set(cx, cy, FZ + 0.0015);
    ADD(p);
    return p;
  }
  var stateY = 1.532, swW = PW * 0.478;
  var swState = stateWindow(-(PW / 2 - swW / 2), swW, stateY, "STATE: SUPERPOSED");
  var swMatter = stateWindow((PW / 2 - swW / 2), swW, stateY, "NO MATTER PENDING");
  endPart();

  /* ============================ THE DISPLAY ================================ */
  /* An LCD, as it always was: a flat panel of pixels behind glass, not a set of
     mechanical drums. The drums were an invention of the rebuild. Every symbol
     is a 16 x 16 bitmap and every lit pixel is drawn as its own little square
     with a gap round it, which is the whole reason an LCD looks like an LCD. */
  var SPRITES = [
    { name: "CHERRY", bits: [
      "................",
      "..............##",
      "...........###..",
      ".........###....",
      ".......###......",
      ".....###...##...",
      "....##....####..",
      "...####..######.",
      "..######.######.",
      ".########.#####.",
      ".########.#####.",
      ".########.#####.",
      "..######...###..",
      "...####.........",
      "................",
      "................"] },
    { name: "GRAPE", bits: [
      "................",
      "................",
      "..........##....",
      ".........##.....",
      "..###.###.###...",
      "..###.###.###...",
      "...###.###......",
      "...###.###......",
      "....###.###.....",
      "....###.###.....",
      ".....###........",
      ".....###........",
      "................",
      "................",
      "................",
      "................"] },
    { name: "LEMON", bits: [
      "................",
      "................",
      "................",
      ".......##.......",
      "....########....",
      "..############..",
      ".##############.",
      ".##############.",
      ".##############.",
      "..############..",
      "....########....",
      "................",
      "................",
      "................",
      "................",
      "................"] },
    { name: "MELON", bits: [
      "................",
      "................",
      "......####......",
      "....########....",
      "...##########...",
      "..###.####.###..",
      ".###..####..###.",
      ".###..####..###.",
      ".###..####..###.",
      "..###.####.###..",
      "...##########...",
      "....########....",
      "......####......",
      "................",
      "................",
      "................"] },
    { name: "PLUM", bits: [
      "................",
      "............###.",
      "...........###..",
      ".....####..##...",
      "...########.....",
      "..##########....",
      ".############...",
      ".############...",
      ".############...",
      "..##########....",
      "...########.....",
      ".....####.......",
      "................",
      "................",
      "................",
      "................"] },
    { name: "PEAR", bits: [
      "................",
      ".......##.......",
      "......##........",
      "......####......",
      ".....######.....",
      "....########....",
      "...##########...",
      "..############..",
      "..############..",
      "..############..",
      "...##########...",
      "....########....",
      "................",
      "................",
      "................",
      "................"] },
    { name: "FIG", bits: [
      "................",
      ".......##.......",
      "......##........",
      "....######......",
      "...########.....",
      "..##########....",
      ".####....####...",
      ".###......###...",
      ".####....####...",
      "..##########....",
      "...########.....",
      ".....####.......",
      "................",
      "................",
      "................",
      "................"] }
  ];
  var NSYM = SPRITES.length;

  var LCD_ON = "#D3D7C5", LCD_OFF = "#454A3E", LCD_BG = "#4B5044";

  /* The panel's own metrics come first, because the size of a symbol follows
     from the size of a row and not the other way round. Fixed at 176 px the
     sprites sat at two thirds of their cell with a visible margin all round,
     which is not what a segment display looks like. */
  var lcdW = W * 0.86, lcdH = lcdW / 1.28;
  var lcdY = 1.252;
  var LCW = 1100, LCH = Math.round(LCW * lcdH / lcdW);
  var GUT = 70;                                     /* margin inside the glass */
  var colW = (LCW - GUT * 2) / 3;
  var gridTop = Math.round(GUT * 0.9);
  var rowH = (LCH - GUT * 1.5) / 3;
  var PIX = Math.max(4, Math.floor(rowH * 0.88 / 16));
  var CELL = PIX * 16;

  /* Each sprite is rendered once to its own little canvas and then blitted.
     Redrawing 256 rectangles per symbol per column per frame while three reels
     are running is the kind of thing that quietly costs you the frame rate. */
  var spriteCanvas = SPRITES.map(function (s) {
    var c = makeCanvas(CELL, CELL), x = c.getContext("2d");
    for (var r = 0; r < 16; r++) {
      for (var q = 0; q < 16; q++) {
        var on = s.bits[r].charAt(q) === "#";
        /* An unlit pixel is barely there. At 0.30 the whole 16 x 16 field read
           as a pale square sitting behind every symbol. */
        x.fillStyle = on ? LCD_ON : LCD_OFF;
        x.globalAlpha = on ? 1 : 0.13;
        x.fillRect(q * PIX, r * PIX, PIX - 1, PIX - 1);
      }
    }
    x.globalAlpha = 1;
    return c;
  });

  var reels = [
    { pos: 0, from: 0, to: 0, t: 1, dur: 1, phase: 2, stop: 0 },
    { pos: 0, from: 0, to: 0, t: 1, dur: 1, phase: 2, stop: 0 },
    { pos: 0, from: 0, to: 0, t: 1, dur: 1, phase: 2, stop: 0 }
  ];

  function drawLCD(x, w, h) {
    x.fillStyle = LCD_BG; x.fillRect(0, 0, w, h);
    /* the uneven backlight every panel of this kind has */
    var g = x.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.72);
    g.addColorStop(0, "rgba(226,230,214,.20)"); g.addColorStop(1, "rgba(0,0,0,.22)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);

    for (var c = 0; c < 3; c++) {
      var cx = GUT + c * colW;
      x.save();
      x.beginPath(); x.rect(cx, gridTop, colW, rowH * 3); x.clip();
      var pos = reels[c].pos;
      var base = Math.floor(pos), frac = pos - base;
      for (var k = -2; k <= 2; k++) {
        var idx = ((base + k) % NSYM + NSYM) % NSYM;
        var cy = gridTop + rowH * (1 + k - frac);
        x.drawImage(spriteCanvas[idx], cx + (colW - CELL) / 2,
                    cy + (rowH - CELL) / 2, CELL, CELL);
      }
      x.restore();
      if (c > 0) {                                  /* the column divider */
        x.strokeStyle = "rgba(24,28,20,.55)"; x.lineWidth = 3;
        x.beginPath(); x.moveTo(cx, gridTop); x.lineTo(cx, gridTop + rowH * 3); x.stroke();
      }
    }

    /* the payline: a hairline across the middle row with a marker each side */
    var py = gridTop + rowH * 1.5;
    x.strokeStyle = "rgba(226,230,214,.42)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(GUT - 12, py); x.lineTo(LCW - GUT + 12, py); x.stroke();
    x.fillStyle = "#D2D6C4";
    x.beginPath(); x.moveTo(GUT - 16, py - 13); x.lineTo(GUT - 2, py); x.lineTo(GUT - 16, py + 13); x.fill();
    x.beginPath(); x.moveTo(w - GUT + 16, py - 13); x.lineTo(w - GUT + 2, py); x.lineTo(w - GUT + 16, py + 13); x.fill();
    x.fillStyle = "rgba(210,214,196,.62)";
    x.font = "500 19px " + MONO; x.textBaseline = "middle";
    tracked(x, "PAYLINE", 8, py - 26, 2, "left");
  }

  beginPart("DISPLAY", "THE DISPLAY UNIT");
  var lcd = new T.Mesh(new T.PlaneGeometry(lcdW, lcdH), null);
  (function () {
    var c = makeCanvas(LCW, LCH), ctx = c.getContext("2d");
    var tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = MAXA;
    lcd.material = new T.MeshStandardMaterial({
      map: tex, emissive: 0xFFFFFF, emissiveMap: tex, emissiveIntensity: 0.42,
      roughness: 0.62, metalness: 0
    });
    lcd.refresh = function () { drawLCD(ctx, LCW, LCH); tex.needsUpdate = true; };
    lcd.refresh();
  })();
  lcd.position.set(0, lcdY, FZ + 0.001);
  ADD(lcd);

  /* the display is recessed: a dark surround, a steel bezel and a pane */
  var lcdWell = ring(lcdW + 0.052, lcdH + 0.052, lcdW, lcdH, 0.010, 0.005, 0.014, 0.004, paintDark);
  lcdWell.position.set(0, lcdY, FZ + 0.005);
  ADD(lcdWell);
  var lcdBezel = ring(lcdW + 0.062, lcdH + 0.062, lcdW + 0.040, lcdH + 0.040,
                      0.012, 0.008, 0.012, 0.004, steelDim);
  lcdBezel.position.set(0, lcdY, FZ + 0.008);
  ADD(lcdBezel);
  var pane = new T.Mesh(new T.PlaneGeometry(lcdW + 0.038, lcdH + 0.038),
    new T.MeshPhysicalMaterial({
      color: 0x9BA0A4, roughness: 0.035, metalness: 0.0,
      clearcoat: 1.0, clearcoatRoughness: 0.02,
      transparent: true, opacity: 0.075, depthWrite: false
    }));
  pane.position.set(0, lcdY, FZ + 0.011);
  ADD(pane);
  endPart();

  /* ---- the instrument strip ---- */
  var obsCount = 0, matchCount = 0, coherence = 1, t0 = 0;
  beginPart("INSTRUMENTS", "THE INSTRUMENT STRIP");
  var instrY = 0.952;
  var instr = plate(PW, 0.072, instrY, 1500, 190, function (x, w, h) {
    x.fillStyle = "#191B1D"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#8E948B";
    x.textBaseline = "middle";
    x.font = "500 24px " + MONO;
    tracked(x, "COHERENCE", 26, 46, 3, "left");
    /* the segmented bar: lit blocks fall away as you observe and creep back */
    var bx = 236, by = 30, bw = 27, bh = 32, n = 22;
    var lit = Math.round(coherence * n);
    for (var i = 0; i < n; i++) {
      var on = i < lit;
      x.fillStyle = on ? "#C6CBBC" : "#2E322D";
      x.fillRect(bx + i * (bw + 5), by, bw, bh);
    }
    x.fillStyle = "#A6ACA2";
    x.font = "500 26px " + MONO;
    tracked(x, "T+" + (t0 / 1000).toFixed(1) + "S", w - 26, 46, 3, "right");

    x.font = "500 22px " + MONO;
    var cells = [["OBS", pad(obsCount, 3)], ["MATCH", pad(matchCount, 3)],
                 ["LUCK", obsCount < 12 ? "- - -" : luckIndex()]];
    var px = 26;
    cells.forEach(function (cel) {
      x.fillStyle = "#70766D";
      px += tracked(x, cel[0], px, h - 46, 3, "left") + 14;
      x.fillStyle = "#0E100E";
      x.fillRect(px - 4, h - 66, 108, 40);
      x.fillStyle = "#C6CBBC";
      px += tracked(x, cel[1], px + 8, h - 46, 5, "left") + 46;
    });
    x.fillStyle = "#5C625A";
    tracked(x, "ENT   COH   READ AFTER", w - 26, h - 46, 3, "right");
  }, 0.34, false);
  function pad(n, k) { return String(Math.min(n, 999)).padStart(k, "0"); }
  function luckIndex() {
    /* the measured departure from what the machine expected, in sigma. Every
       reel is uniform over seven symbols, so a match is 1/49 per observation. */
    var p = 1 / (NSYM * NSYM), mu = obsCount * p;
    var sd = Math.sqrt(obsCount * p * (1 - p));
    var z = sd > 0 ? (matchCount - mu) / sd : 0;
    return (z >= 0 ? "+" : "−") + Math.abs(z).toFixed(2);
  }

  /* ---- the message line ---- */
  var msg = "READY. NO MATTER HAS BEEN PUT TO THE APPARATUS.";
  var msgLine = plate(PW, 0.032, 0.878, 1500, 76, function (x, w, h) {
    x.fillStyle = "#101112"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#8A9086";
    x.textBaseline = "middle"; x.font = "500 26px " + MONO;
    tracked(x, msg, 22, h / 2 + 1, 2, "left");
  }, 0.28, false);
  endPart();

  /* ---- the controls ---- */
  /* A band across the front, not a sloping deck. The original has no lever:
     the wide OBSERVE bar is the thing you press, and the three dark keys sit
     to the right of it. */
  beginPart("CONTROLS", "THE CONTROL BAND");
  var ctlY = 0.775;
  var ctlWell = box(PW, 0.108, 0.012, paintDark);
  ctlWell.position.set(0, ctlY, FZ - 0.002);
  ADD(ctlWell);

  function frontKey(cx, w, h, mat, label, ink) {
    var k = slab(w, h, 0.026, 0.008, 0.004, mat);
    k.position.set(cx, ctlY, FZ + 0.012);
    ADD(k);
    var lp = livePanel(w * 0.92, h * 0.5, 480, 130, function (x, cw, ch) {
      x.clearRect(0, 0, cw, ch);
      x.fillStyle = ink;
      x.textBaseline = "middle";
      x.font = "700 " + (label.length > 6 ? 44 : 56) + "px " + MONO;
      tracked(x, label, cw / 2, ch / 2 + 2, 6, "center");
    }, 0.16);
    lp.material.transparent = true;
    lp.position.set(cx, ctlY, FZ + 0.0255);
    ADD(lp);
    return k;
  }
  var observeKey = frontKey(-PW * 0.26, PW * 0.42, 0.062, observeCap, "OBSERVE", "#26241C");
  var burstKey  = frontKey( PW * 0.055, PW * 0.14, 0.048, keyCap, "BURST", "#C2C7CB");
  var resetKey  = frontKey( PW * 0.215, PW * 0.14, 0.048, keyCap, "RESET", "#C2C7CB");
  var fileKey   = frontKey( PW * 0.375, PW * 0.14, 0.048, keyCap, "FILE",  "#C2C7CB");

  /* the small legend above the OBSERVE bar, as on the original */
  var obsLegend = livePanel(PW * 0.42, 0.018, 620, 40, function (x, w, h) {
    x.clearRect(0, 0, w, h);
    x.fillStyle = "#767B80";
    x.textBaseline = "middle"; x.font = "500 22px " + MONO;
    tracked(x, "PRESS ONCE PER MATTER", w / 2, h / 2 + 1, 3, "center");
  }, 0.20);
  obsLegend.material.transparent = true;
  obsLegend.position.set(-PW * 0.26, ctlY + 0.044, FZ + 0.0035);
  ADD(obsLegend);

  /* the sound toggle and its tiny labels, far right of the band */
  var toggle = box(0.012, 0.028, 0.014, steelDim);
  toggle.position.set(PW * 0.468, ctlY + 0.008, FZ + 0.008);
  ADD(toggle);

  var ctlReveal = box(PW, 0.004, 0.010, paintDark);
  ctlReveal.position.set(0, ctlY - 0.078, FZ - 0.001);
  ADD(ctlReveal);
  endPart();

  /* ================== THE ATTENDANCE INTERLOCK ============================ */
  /* Seven steps to start a machine whose result means nothing, each of them a
     control you have to find and work, all of them in order, and the whole
     thing resets the instant the reels stop. The lever is real, three hundred
     grams of chrome, and it is not connected to anything. */
  var ILK = { key: false, decl: [false, false, false], stamped: false,
              docket: false, lever: false, cover: false };
  var STEP_NAME = [
    "TURN THE ATTENDANCE KEY", "MAKE THE THREE DECLARATIONS",
    "APPLY THE STAMP", "TAKE THE DOCKET", "PULL THE LEVER",
    "RAISE THE COVER", "PRESS OBSERVE"
  ];
  function stepNo() {
    if (!ILK.key) return 0;
    if (!ILK.decl[0] || !ILK.decl[1] || !ILK.decl[2]) return 1;
    if (!ILK.stamped) return 2;
    if (!ILK.docket) return 3;
    if (!ILK.lever) return 4;
    if (!ILK.cover) return 5;
    return 6;
  }

  beginPart("INTERLOCK", "THE INTERLOCK BAND");
  var ilkY = 0.648, ILK_HIT = [];
  var ilkPlate = plate(PW, 0.084, ilkY, 1600, 220, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#33363A"); g.addColorStop(1, "#26292C");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.textBaseline = "middle";
    /* The top third of this plate is where the controls physically stand, so
       nothing may be printed there — the first version put the title under the
       key switch and the two overlapped. */
    x.fillStyle = "#9AA0A6"; x.font = "500 21px " + MONO;
    var marks = [[0.10, "KEY"], [0.305, "I ATTEND"], [0.435, "UNPAID"],
                 [0.565, "AWARE"], [0.83, "STAMP"]];
    marks.forEach(function (m) { tracked(x, m[1], w * m[0], h * 0.63, 2, "center"); });
    x.strokeStyle = "rgba(150,156,162,.22)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(24, h * 0.775); x.lineTo(w - 24, h * 0.775); x.stroke();
    x.fillStyle = "#6E747A"; x.font = "500 20px " + MONO;
    tracked(x, "ATTENDANCE INTERLOCK · COMPLETE IN ORDER", 24, h * 0.90, 2, "left");
    x.fillStyle = "#8E949A";
    tracked(x, "FORM QA-77/B", w - 24, h * 0.90, 2, "right");
  }, 0.24, false);
  var ilkTop = ilkY + 0.014;

  /* ---- the attendance key ---- */
  var keyX = -PW * 0.40;
  var escutcheon = new T.Mesh(new T.CylinderGeometry(0.017, 0.017, 0.008, 20), steelDim);
  escutcheon.rotation.x = Math.PI / 2;
  escutcheon.position.set(keyX, ilkTop, FZ + 0.005);
  escutcheon.castShadow = true;
  ADD(escutcheon);
  var keyGroup = new T.Group();
  keyGroup.position.set(keyX, ilkTop, FZ + 0.010);
  var keyBit = box(0.007, 0.030, 0.008, steel);
  keyBit.position.y = 0.009;
  keyGroup.add(keyBit);
  var keyBow = new T.Mesh(new T.TorusGeometry(0.008, 0.0025, 8, 20), steel);
  keyBow.position.y = 0.028;
  keyGroup.add(keyBow);
  ADD(keyGroup);
  var keyAnim = anim(7, function (v) { keyGroup.rotation.z = -v * Math.PI / 2; });
  keyBit.userData.ilk = "key"; keyBow.userData.ilk = "key";
  escutcheon.userData.ilk = "key";
  ILK_HIT.push(keyBit, keyBow, escutcheon);

  /* ---- the three declarations ---- */
  var declAnims = [];
  [-PW * 0.195, -PW * 0.065, PW * 0.065].forEach(function (dx, i) {
    var base = new T.Mesh(new T.CylinderGeometry(0.009, 0.010, 0.008, 16), steelDim);
    base.rotation.x = Math.PI / 2;
    base.position.set(dx, ilkTop, FZ + 0.005);
    ADD(base);
    var g = new T.Group();
    g.position.set(dx, ilkTop, FZ + 0.008);
    var stick = new T.Mesh(new T.CylinderGeometry(0.0035, 0.0045, 0.028, 12), steel);
    stick.position.y = 0.014; stick.castShadow = true;
    g.add(stick);
    var tip = new T.Mesh(new T.SphereGeometry(0.006, 14, 10), steel);
    tip.position.y = 0.029;
    g.add(tip);
    ADD(g);
    /* forward-and-down for a declaration not yet made, back-and-up for one that
       has been. A toggle that only changed colour would not be a toggle. */
    declAnims.push(anim(9, function (v) { g.rotation.x = 0.70 - v * 1.20; }));
    stick.userData.ilk = "decl" + i; tip.userData.ilk = "decl" + i;
    base.userData.ilk = "decl" + i;
    ILK_HIT.push(stick, tip, base);
  });

  /* ---- the stamp press ---- */
  var stampX = PW * 0.34;
  var stampPost = box(0.014, 0.052, 0.016, steelDim);
  stampPost.position.set(stampX + 0.026, ilkY + 0.006, FZ + 0.014);
  ADD(stampPost);
  var stampPad = box(0.030, 0.007, 0.024, cavity);
  stampPad.position.set(stampX - 0.024, ilkY - 0.020, FZ + 0.016);
  ADD(stampPad);
  var stampArm = new T.Group();
  stampArm.position.set(stampX + 0.026, ilkY + 0.030, FZ + 0.018);
  var armBar = box(0.056, 0.008, 0.010, steel);
  armBar.position.x = -0.028; armBar.castShadow = true;
  stampArm.add(armBar);
  var armKnob = new T.Mesh(new T.SphereGeometry(0.010, 18, 12), steel);
  armKnob.position.x = -0.058; armKnob.castShadow = true;
  stampArm.add(armKnob);
  var stampHead = box(0.020, 0.016, 0.018, paintDark);
  stampHead.position.set(-0.050, -0.013, 0);
  stampArm.add(stampHead);
  ADD(stampArm);
  var stampAnim = anim(11, function (v) { stampArm.rotation.z = -0.44 * (1 - v); });
  [armBar, armKnob, stampHead].forEach(function (o) {
    o.userData.ilk = "stamp"; ILK_HIT.push(o);
  });

  /* ---- the docket ---- */
  /* It comes out of the record mouth, and it has to be taken. A machine that
     printed one and kept it would be a different kind of joke. */
  var docketNo = 0;
  var docket = livePanel(0.140, 0.076, 640, 350, function (x, w, h) {
    x.fillStyle = "#DAD6C8"; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(90,86,74,.18)"; x.fillRect(0, 0, w, 8);
    x.textBaseline = "middle"; x.fillStyle = "#23241F";
    x.font = "600 26px " + MONO;
    tracked(x, "PUBLIC LUCK AUTHORITY", w / 2, 44, 2, "center");
    x.font = "700 58px " + MONO;
    tracked(x, "No " + String(docketNo).padStart(4, "0"), w / 2, 118, 4, "center");
    x.strokeStyle = "#6C6A5E"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(40, 158); x.lineTo(w - 40, 158); x.stroke();
    x.fillStyle = "#3E3E36"; x.font = "500 24px " + MONO;
    tracked(x, "ONE (1) OBSERVATION", w / 2, 190, 2, "center");
    x.fillStyle = "#6C6A5E"; x.font = "500 19px " + MONO;
    tracked(x, "THIS DOCKET ENTITLES THE", w / 2, 232, 1, "center");
    tracked(x, "BEARER TO NOTHING", w / 2, 258, 1, "center");
    /* the stamp, once it has been applied */
    if (ILK.stamped) {
      x.save();
      x.translate(w * 0.5, 300); x.rotate(-0.14);
      x.strokeStyle = "rgba(52,54,46,.62)"; x.lineWidth = 4;
      x.strokeRect(-130, -24, 260, 48);
      x.fillStyle = "rgba(52,54,46,.72)"; x.font = "700 26px " + MONO;
      tracked(x, "ATTENDED", 0, 0, 4, "center");
      x.restore();
    }
  }, 0.24);
  docket.material.side = T.DoubleSide;
  docket.visible = false;
  ADD(docket);
  var docketX = -PW * 0.24, docketY = 0.478;
  /* Relative to where finalizeParts left it, not absolute: the docket lives
     inside an assembly whose origin moved to the middle of the interlock. */
  var docketHome = new T.Vector3();
  var docketAnim = anim(4.5, function (v) {
    docket.position.copy(docketHome);
    docket.position.y -= v * 0.030;
    docket.position.z += v * 0.062;
    docket.rotation.x = -v * 0.42;
  });
  docket.userData.ilk = "docket";
  ILK_HIT.push(docket);

  endPart();
  beginPart("CONTROLS");
  /* ---- the cover over the OBSERVE bar ---- */
  var coverHinge = new T.Group();
  coverHinge.position.set(-PW * 0.26, ctlY + 0.038, FZ + 0.032);
  var coverFlap = new T.Mesh(new T.PlaneGeometry(PW * 0.46, 0.076),
    new T.MeshPhysicalMaterial({
      color: 0x3A3E42, roughness: 0.10, metalness: 0.0,
      clearcoat: 1.0, clearcoatRoughness: 0.06,
      transparent: true, opacity: 0.42, side: T.DoubleSide
    }));
  coverFlap.position.y = -0.038;
  coverHinge.add(coverFlap);
  var coverRail = box(PW * 0.47, 0.008, 0.010, steelDim);
  coverRail.position.set(-PW * 0.26, ctlY + 0.042, FZ + 0.032);
  ADD(coverRail);
  ADD(coverHinge);
  var coverAnim = anim(6, function (v) { coverHinge.rotation.x = -v * 2.0; });
  coverFlap.userData.ilk = "cover";
  ILK_HIT.push(coverFlap);
  endPart();

  /* ---- the lever ---- */
  /* On the flank, where a fruit machine's lever belongs, and carrying a plate
     that says what it does. */
  beginPart("LEVER", "THE LEVER ASSEMBLY");
  var leverX = W / 2;
  var leverMount = slab(0.020, 0.110, 0.110, 0.014, 0.005, paintDark);
  leverMount.rotation.y = Math.PI / 2;
  leverMount.position.set(leverX + 0.008, 0.830, D * 0.28);
  ADD(leverMount);
  var leverBoss = new T.Mesh(new T.CylinderGeometry(0.028, 0.032, 0.030, 22), steelDim);
  leverBoss.rotation.z = Math.PI / 2;
  leverBoss.position.set(leverX + 0.028, 0.830, D * 0.28);
  leverBoss.castShadow = true;
  ADD(leverBoss);
  var leverArm = new T.Group();
  leverArm.position.set(leverX + 0.032, 0.830, D * 0.28);
  var leverShaft = new T.Mesh(new T.CylinderGeometry(0.008, 0.010, 0.200, 16), steel);
  leverShaft.position.y = 0.100; leverShaft.castShadow = true;
  leverArm.add(leverShaft);
  var leverBall = new T.Mesh(new T.SphereGeometry(0.026, 28, 20), steel);
  leverBall.position.y = 0.210; leverBall.castShadow = true;
  leverArm.add(leverBall);
  ADD(leverArm);
  var leverAnim = anim(8, function (v) { leverArm.rotation.x = v * 1.05; });
  leverShaft.userData.ilk = "lever"; leverBall.userData.ilk = "lever";
  ILK_HIT.push(leverShaft, leverBall);

  var leverPlate = livePanel(0.150, 0.030, 700, 140, function (x, w, h) {
    x.fillStyle = "#8E9296"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "#2C2F33"; x.lineWidth = 4; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = "#191C1F"; x.textBaseline = "middle";
    x.font = "500 26px " + MONO;
    tracked(x, "THIS LEVER IS NOT", w / 2, h * 0.36, 2, "center");
    tracked(x, "CONNECTED TO ANYTHING", w / 2, h * 0.68, 2, "center");
  }, 0.16);
  leverPlate.rotation.y = Math.PI / 2;
  leverPlate.position.set(leverX + 0.0015, 0.700, D * 0.28);
  ADD(leverPlate);
  endPart();

  /* ---- the notice rail ---- */
  beginPart("CARCASS");
  var notice = plate(PW, 0.038, 0.578, 1500, 90, function (x, w, h) {
    x.fillStyle = "#22252A"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#8A9096";
    x.textBaseline = "middle"; x.font = "500 26px " + MONO;
    tracked(x, "NO STAKE · NO PAYOUT · DETERMINES NOTHING ABOUT THE OPERATOR",
            24, h / 2 + 1, 2, "left");
    x.fillStyle = "#3A3E43"; x.fillRect(w - 150, 12, 128, h - 24);
    x.fillStyle = "#C3C8CD"; x.font = "500 24px " + MONO;
    tracked(x, "QA-77/B", w - 86, h / 2 + 1, 3, "center");
  }, 0.24, false);

  /* ---- the two mouths ---- */
  function mouth(cx, w, cy, label, above) {
    var recess = box(w, 0.030, 0.030, cavity);
    recess.position.set(cx, cy, FZ - 0.010);
    ADD(recess);
    var lipTop = box(w + 0.016, 0.008, 0.016, steelDim);
    lipTop.position.set(cx, cy + 0.019, FZ + 0.003);
    ADD(lipTop);
    var lipBot = box(w + 0.016, 0.008, 0.016, steelDim);
    lipBot.position.set(cx, cy - 0.019, FZ + 0.003);
    ADD(lipBot);
    var lab = livePanel(w, 0.017, 620, 38, function (x, cw, ch) {
      x.clearRect(0, 0, cw, ch);
      x.fillStyle = "#7E848A";
      x.textBaseline = "middle"; x.font = "500 22px " + MONO;
      tracked(x, label, 4, ch / 2 + 1, 3, "left");
    }, 0.20);
    lab.material.transparent = true;
    lab.position.set(cx, cy + (above ? 0.034 : -0.034), FZ + 0.0025);
    ADD(lab);
  }
  mouth(-PW * 0.24, PW * 0.42, 0.478, "DETERMINATION RECORD", true);
  mouth( PW * 0.26, PW * 0.38, 0.470, "CLAIM / RECORD TRAY", true);
  endPart();

  /* ---- the service panel across the belly ---- */
  beginPart("SERVICE", "THE SERVICE PANEL");
  var bellyY = 0.338, bellyH = 0.196;
  var belly = plate(PW, bellyH, bellyY, 1400, 450, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#3E4247"); g.addColorStop(0.55, "#484C51"); g.addColorStop(1, "#34383C");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    /* the seal, pressed rather than printed: only just there */
    x.save();
    x.strokeStyle = "rgba(190,196,202,.16)"; x.lineWidth = 3;
    x.beginPath(); x.arc(w / 2, h * 0.44, h * 0.40, 0, TAU); x.stroke();
    x.beginPath(); x.arc(w / 2, h * 0.44, h * 0.345, 0, TAU); x.stroke();
    for (var k = 0; k < 3; k++) {
      x.beginPath();
      x.arc(w / 2, h * 0.44, h * (0.10 + k * 0.075), -Math.PI * 0.78, Math.PI * 0.18);
      x.stroke();
    }
    x.restore();
    x.textBaseline = "middle";
    x.fillStyle = "#D3D8DD"; x.font = "600 40px " + MONO;
    tracked(x, "PUBLIC LUCK AUTHORITY", w / 2, h * 0.30, 9, "center");
    x.fillStyle = "#8E949A"; x.font = "500 26px " + MONO;
    tracked(x, "QA-77", w / 2, h * 0.44, 6, "center");
    tracked(x, "QUANTUM DETERMINATION APPARATUS", w / 2, h * 0.56, 5, "center");
    x.fillStyle = "#6E747A"; x.font = "500 24px " + MONO;
    tracked(x, "SERVICE ACCESS", w / 2, h * 0.69, 5, "center");
    /* the grille along the foot of the panel, printed rather than cut: as
       geometry it fell below the panel and off the bottom of the cabinet */
    x.fillStyle = "rgba(14,16,18,.72)";
    for (var g2 = 0; g2 < 6; g2++) x.fillRect(w * 0.26, h * 0.80 + g2 * 22, w * 0.48, 9);
  }, 0.26, false);
  var bellyFrame = ring(PW + 0.026, bellyH + 0.026, PW, bellyH, 0.010, 0.004, 0.012, 0.004, steelDim);
  bellyFrame.position.set(0, bellyY, FZ + 0.005);
  ADD(bellyFrame);

  var bellyLock = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 0.012, 18), steel);
  bellyLock.rotation.x = Math.PI / 2;
  bellyLock.position.set(-PW * 0.455, bellyY + bellyH * 0.11, FZ + 0.006);
  bellyLock.castShadow = true;
  ADD(bellyLock);
  endPart();
  beginPart("PLINTH");

  /* ============================ THE COIN TRAY ============================= */
  /* The apparatus dispenses one token per observation. It dispenses it whatever
     the reels did, because the reels are not what it is counting, and the token
     is stamped NO VALUE on both faces so there can be no confusion about it.
     A machine with NO STAKE · NO PAYOUT written across its front had better be
     able to hand you something worthless without anyone mistaking it. */
  beginPart("TRAY", "THE COIN TRAY");
  var trayFloorY = 0.118, trayZ = FZ + 0.046, trayW = W * 0.60, trayD = 0.092;
  var trayHoodY = 0.206;

  var trayFloor = box(trayW, 0.008, trayD, paintDark);
  trayFloor.position.set(0, trayFloorY - 0.004, trayZ);
  ADD(trayFloor);
  var trayLinerMat = new T.MeshStandardMaterial({
    color: 0x212427, roughness: 0.82, metalness: 0.0
  });
  var trayLiner = new T.Mesh(new T.PlaneGeometry(trayW, trayD), trayLinerMat);
  trayLiner.rotation.x = -Math.PI / 2;
  trayLiner.position.set(0, trayFloorY + 0.0005, trayZ);
  ADD(trayLiner);
  var trayLip = slab(trayW + 0.020, 0.030, 0.011, 0.006, 0.003, paintDark);
  trayLip.position.set(0, trayFloorY + 0.013, trayZ + trayD / 2 + 0.004);
  ADD(trayLip);
  [-1, 1].forEach(function (s2) {
    var cheek = box(0.011, 0.034, trayD + 0.010, paintDark);
    cheek.position.set(s2 * (trayW / 2 + 0.005), trayFloorY + 0.015, trayZ);
    ADD(cheek);
  });
  /* No hood over the tray. The first version had one 57 mm deep, and from any
     angle you would actually stand at — around nineteen degrees above a cup
     eighty-eight millimetres below it — its shadow covered the whole floor and
     every coin in it. A coin tray is an open cup for the same reason. What is
     left is the chute itself and a shallow lintel over it. */
  var chute = box(trayW * 0.34, 0.017, 0.012, cavity);
  chute.position.set(0, trayHoodY - 0.012, FZ + 0.007);
  ADD(chute);
  var chuteLintel = slab(trayW * 0.40, 0.010, 0.016, 0.004, 0.003, paintDark);
  chuteLintel.position.set(0, trayHoodY, FZ + 0.008);
  ADD(chuteLintel);

  /* A little light in the cup. Tiny, because it sits ten centimetres from what
     it lights and illuminance goes as the inverse square — the same arithmetic
     that once clipped the whole reel window to white. */
  var trayLight = new T.PointLight(0xE8ECF0, 0.016, 0.34, 2);
  trayLight.position.set(0, trayFloorY + 0.075, trayZ + 0.020);
  ADD(trayLight);

  /* Declared up here, not with the tokens: livePanel draws once as it builds,
     so anything its draw reads must already exist. */
  var tokensIssued = 0, issuedByClass = [0, 0, 0];
  var trayPlate = livePanel(trayW * 0.90, 0.024, 1200, 100, function (x, w, h) {
    x.fillStyle = "#24272A"; x.fillRect(0, 0, w, h);
    x.textBaseline = "middle"; x.font = "500 23px " + MONO;
    x.fillStyle = "#7E848A";
    tracked(x, "TOKENS ISSUED", 14, 30, 2, "left");
    x.fillStyle = "#0E1012"; x.fillRect(230, 12, 116, 36);
    x.fillStyle = "#C6CBD0";
    tracked(x, String(Math.min(tokensIssued, 999)).padStart(3, "0"), 288, 30, 5, "center");
    x.fillStyle = "#6E747A"; x.font = "500 21px " + MONO;
    tracked(x, "MIN " + issuedByClass[0] + "  COM " + issuedByClass[1]
             + "  PRI " + issuedByClass[2], w - 14, 30, 2, "right");
    x.strokeStyle = "rgba(140,146,152,.18)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(14, 56); x.lineTo(w - 14, 56); x.stroke();
    x.fillStyle = "#5E646A"; x.font = "500 20px " + MONO;
    tracked(x, "THE CLASSES ARE NOT DENOMINATIONS · ALL TOKENS ARE OF NO VALUE",
            w / 2, 78, 2, "center");
  }, 0.22);
  trayPlate.position.set(0, trayFloorY + 0.013, trayZ + trayD / 2 + 0.0105);
  ADD(trayPlate);
  endPart();

  /* ---- the tokens ---- */
  /* Three sizes, issued in strict rotation from the hopper because that is how
     the hopper is loaded. They are classes, not denominations — the plate on
     the lip says so, and it has to, because three sizes of coin is exactly what
     a denomination looks like. All three are struck NO VALUE. */
  var CLASSES = [
    { name: "MINOR",     r: 0.0105, t: 0.0018, seg: 32, tone: 0x8C9196, rings: 1 },
    { name: "COMMON",    r: 0.0145, t: 0.0024, seg: 44, tone: 0xA9AEB3, rings: 2 },
    { name: "PRINCIPAL", r: 0.0190, t: 0.0032, seg: 56, tone: 0xC4C9CE, rings: 3 }
  ];

  function mintFace(cls) {
    var c = makeCanvas(360, 360), x = c.getContext("2d");
    x.clearRect(0, 0, 360, 360);
    var g = x.createRadialGradient(130, 120, 12, 180, 180, 190);
    g.addColorStop(0, "#DCE0E4"); g.addColorStop(0.6, "#AFB4B9"); g.addColorStop(1, "#8C9196");
    x.beginPath(); x.arc(180, 180, 178, 0, TAU); x.fillStyle = g; x.fill();
    x.strokeStyle = "rgba(56,60,64,.55)";
    x.lineWidth = 6; x.beginPath(); x.arc(180, 180, 158, 0, TAU); x.stroke();
    if (cls.rings > 1) {
      x.lineWidth = 3; x.beginPath(); x.arc(180, 180, 146, 0, TAU); x.stroke();
    }
    if (cls.rings > 2) {                       /* the principal carries pips */
      x.fillStyle = "rgba(56,60,64,.5)";
      for (var k = 0; k < 28; k++) {
        var a = (k / 28) * TAU;
        x.beginPath();
        x.arc(180 + Math.cos(a) * 136, 180 + Math.sin(a) * 136, 4, 0, TAU);
        x.fill();
      }
    }
    x.fillStyle = "#2A2E32";
    x.textBaseline = "middle"; x.textAlign = "center";
    /* the authority's name set round the top of the rim, as a coin has it */
    var name = "PUBLIC LUCK AUTHORITY";
    x.save(); x.translate(180, 180);
    x.font = "600 22px " + MONO;
    for (var i = 0; i < name.length; i++) {
      var a2 = -Math.PI * 0.78 + (i / (name.length - 1)) * Math.PI * 1.56;
      x.save(); x.rotate(a2); x.translate(0, -122); x.rotate(Math.PI);
      x.fillText(name.charAt(i), 0, 0); x.restore();
    }
    x.restore();
    x.font = "700 56px " + MONO;
    x.fillText("NO", 180, 146);
    x.fillText("VALUE", 180, 204);
    x.font = "600 22px " + MONO;
    x.fillStyle = "#43474B";
    x.fillText(cls.name, 180, 258);
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = MAXA;
    return t;
  }

  CLASSES.forEach(function (cls) {
    var face = mintFace(cls);
    /* A cylinder's bottom cap carries the same UVs as its top but is seen from
       the other side, so the same texture on both comes out mirrored on the
       reverse — every coin that landed tails-up read ETULAV ON. Both faces of a
       real coin are struck the right way round, so the reverse gets a flipped
       copy rather than the same one. */
    var rev = face.clone();
    rev.needsUpdate = true;
    rev.wrapS = T.RepeatWrapping;
    rev.repeat.x = -1; rev.offset.x = 1;
    var matFace = new T.MeshPhysicalMaterial({
      map: face, color: cls.tone, roughness: 0.34, metalness: 0.85
    });
    var matRev = new T.MeshPhysicalMaterial({
      map: rev, color: cls.tone, roughness: 0.34, metalness: 0.85
    });
    var matEdge = new T.MeshPhysicalMaterial({
      color: cls.tone, roughness: 0.46, metalness: 0.9, flatShading: true
    });
    cls.geo = new T.CylinderGeometry(cls.r, cls.r, cls.t, cls.seg);
    cls.mats = [matEdge, matFace, matRev];
  });

  var MAX_IN_TRAY = 18;
  var tokens = [];
  var TOKEN_HIT = [];

  function dispenseToken() {
    /* strict rotation, because that is the order the hopper was loaded in and
       nothing else about the apparatus gets to decide it either */
    var ci = tokensIssued % CLASSES.length;
    var cls = CLASSES[ci];
    tokensIssued++; issuedByClass[ci]++;
    trayPlate.redraw();
    var m = new T.Mesh(cls.geo, cls.mats);
    m.userData.cls = cls;
    m.castShadow = true; m.receiveShadow = true;
    m.position.set((Math.random() - 0.5) * trayW * 0.30, trayHoodY - 0.022, FZ + 0.014);
    m.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
    m.userData.token = true;
    /* Gentle. At 0.35 m/s forward the coin crossed the whole tray during the
       fall and every one of them ended up jammed against the front lip. */
    m.userData.v = new T.Vector3((Math.random() - 0.5) * 0.26, -0.04,
                                 0.08 + Math.random() * 0.14);
    m.userData.spin = new T.Vector3((Math.random() - 0.5) * 22,
                                    (Math.random() - 0.5) * 14,
                                    (Math.random() - 0.5) * 22);
    m.userData.rest = false;
    m.userData.age = 0;
    ADD(m);
    tokens.push(m); TOKEN_HIT.push(m);
    /* the tray holds eighteen. After that the Authority takes one back, which
       is the only mechanism in the apparatus that removes anything. */
    var overflow = tokens.length > MAX_IN_TRAY;
    if (overflow) {
      var old = tokens.shift();
      TOKEN_HIT.splice(TOKEN_HIT.indexOf(old), 1);
      machine.remove(old);
      setTimeout(function () {
        if (!spinning) setMessage("PERIODIC AUDIT. ONE (1) TOKEN RECLAIMED.");
      }, 900);
    }
    return cls;
  }

  function surrenderTokens() {
    if (!tokens.length) {
      setMessage("THERE ARE NO TOKENS IN THE TRAY TO SURRENDER.");
      return;
    }
    var n = tokens.length, by = [0, 0, 0];
    tokens.forEach(function (m) {
      by[CLASSES.indexOf(m.userData.cls)]++;
      machine.remove(m);
    });
    tokens.length = 0; TOKEN_HIT.length = 0;
    setMessage("TOKENS SURRENDERED: " + n + " (" + by[0] + " MINOR, " + by[1]
               + " COMMON, " + by[2] + " PRINCIPAL). THE ISSUE RECORD IS UNCHANGED.");
  }

  /* Not a physics engine — a coin, a floor and three walls. Gravity, a bounce
     that keeps a third of the speed, and a tumble that stops when it lands. */
  var TOKEN_FLOOR = trayFloorY + 0.0006;
  function stepTokens(dt) {
    for (var i = 0; i < tokens.length; i++) {
      var m = tokens[i];
      if (m.userData.rest) continue;
      var v = m.userData.v, s2 = m.userData.spin;
      m.userData.age += dt;
      v.y -= 9.81 * dt;
      m.position.addScaledVector(v, dt);
      m.rotation.x += s2.x * dt; m.rotation.y += s2.y * dt; m.rotation.z += s2.z * dt;
      var cr = m.userData.cls.r;              /* the walls are per-coin now */
      var zMax = trayZ + trayD / 2 - cr, zMin = trayZ - trayD / 2 + cr;
      var xLim = trayW / 2 - cr;
      if (m.position.z > zMax) { m.position.z = zMax; v.z *= -0.35; }
      if (m.position.z < zMin) { m.position.z = zMin; v.z *= -0.35; }
      if (m.position.x > xLim) { m.position.x = xLim; v.x *= -0.35; }
      if (m.position.x < -xLim) { m.position.x = -xLim; v.x *= -0.35; }
      var floorY = TOKEN_FLOOR + m.userData.cls.t / 2;
      if (m.position.y <= floorY) {
        m.position.y = floorY;
        /* A bounce that keeps a third of its speed converges, but nothing in
           the arithmetic promises it converges soon — and on a slow frame the
           step is coarse enough to keep a coin skittering. Anything still in
           the air after a second and a half is put down. */
        if (Math.abs(v.y) < 0.34 || m.userData.age > 1.5) {
          /* down for good: lie flat, keep whatever facing it happened to land on */
          m.userData.rest = true;
          m.rotation.set(0, Math.random() * TAU, 0);
          m.position.y = floorY + (i % 3) * 0.0004;
        } else {
          v.y = -v.y * 0.34; v.x *= 0.55; v.z *= 0.55;
          s2.multiplyScalar(0.45);
        }
      }
    }
  }
  /* the grille across the plinth */
  for (var pg = 0; pg < 26; pg++) {
    var pslot = box(0.006, 0.030, 0.012, cavity);
    pslot.position.set(-W * 0.42 + pg * (W * 0.84 / 25), 0.055, D / 2 * 0.96 + 0.002);
    ADD(pslot);
  }
  endPart();

  /* --------------------------------------------------------- the flanks --- */
  beginPart("CARCASS");
  [-1, 1].forEach(function (s) {
    var fx = s * (W / 2 - 0.003);
    /* the recessed carry bracket, which is the one feature on the side of the
       original that exists for a person rather than for the machine */
    var bracket = ring(0.070, 0.230, 0.040, 0.180, 0.012, 0.008, 0.030, 0.006, paintDark);
    bracket.rotation.y = s * Math.PI / 2;
    bracket.position.set(s * (W / 2 + 0.011), 1.10, -D * 0.20);
    ADD(bracket);
    var bar = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.185, 14), steelDim);
    bar.position.set(s * (W / 2 + 0.016), 1.10, -D * 0.20);
    bar.castShadow = true;
    ADD(bar);

    for (var lv = 0; lv < 9; lv++) {
      var lo = box(0.012, 0.010, D * 0.34, cavity);
      lo.position.set(fx, 0.42 + lv * 0.026, -D * 0.16);
      ADD(lo);
    }
    /* the door edge, kept forward of the lever plate: at 0.34 it ran straight
       through the middle of it and broke the line of type */
    var vseam = box(0.010, H * 0.80, 0.005, paintDark);
    vseam.position.set(fx, H * 0.47, D * 0.42);
    ADD(vseam);
  });

  /* ----------------------------------------------------------- the back --- */
  var backZ = -D / 2;
  function onBack(w, h, d, cx, cy, mat) {
    var m = box(w, h, d, mat);
    m.position.set(cx, cy, backZ - d / 2 + 0.004);
    ADD(m);
    return m;
  }
  onBack(W * 0.90, 0.005, 0.010, 0, H * 0.90, paintDark);
  onBack(W * 0.90, 0.005, 0.010, 0, H * 0.10, paintDark);
  onBack(0.005, H * 0.80, 0.010, -W * 0.45, H * 0.50, paintDark);
  onBack(0.005, H * 0.80, 0.010,  W * 0.45, H * 0.50, paintDark);
  [0.20, 0.50, 0.80].forEach(function (f) {
    onBack(0.028, 0.050, 0.014, -W * 0.44, H * f, steelDim);
  });
  var latch = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.020, 18), steelDim);
  latch.rotation.x = Math.PI / 2;
  latch.position.set(W * 0.40, H * 0.50, backZ - 0.008);
  latch.castShadow = true;
  ADD(latch);
  for (var gv = 0; gv < 9; gv++) {
    onBack(W * 0.44, 0.010, 0.014, 0, H * 0.60 + gv * 0.024, cavity);
  }
  onBack(0.052, 0.046, 0.022, -W * 0.26, H * 0.22, paintDark);
  onBack(0.034, 0.034, 0.014, -W * 0.26, H * 0.22, cavity);
  onBack(0.022, 0.028, 0.018,  W * 0.20, H * 0.22, steelDim);

  var plateTex = (function () {
    var c = makeCanvas(760, 470), x = c.getContext("2d");
    x.fillStyle = "#9DA2A6"; x.fillRect(0, 0, 760, 470);
    x.strokeStyle = "#2A2E33"; x.lineWidth = 5; x.strokeRect(16, 16, 728, 438);
    x.fillStyle = "#15181B"; x.textBaseline = "middle";
    x.font = "700 44px " + MONO;
    tracked(x, "ATLAS·ELECTRONICS", 380, 62, 3, "center");
    x.font = "500 24px " + MONO;
    tracked(x, "PUBLIC LUCK AUTHORITY", 380, 106, 4, "center");
    x.beginPath(); x.moveTo(40, 138); x.lineTo(720, 138); x.lineWidth = 3; x.stroke();
    x.font = "500 24px " + MONO;
    [["MODEL", "QA-77/B"], ["SERIAL", "0000-0077"], ["SYMBOLS", "7 x 3"],
     ["SUPPLY", "230V 50Hz 0.4A"], ["MASS", "88 kg"]].forEach(function (r, i) {
      var y = 178 + i * 46;
      x.fillStyle = "#3A4046"; tracked(x, r[0], 46, y, 2, "left");
      x.fillStyle = "#14181B"; tracked(x, r[1], 714, y, 2, "right");
    });
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = MAXA;
    return t;
  })();
  var dataPlate = new T.Mesh(new T.PlaneGeometry(0.115, 0.071),
    new T.MeshStandardMaterial({ map: plateTex, roughness: 0.44, metalness: 0.5 }));
  dataPlate.rotation.y = Math.PI;
  dataPlate.position.set(W * 0.22, H * 0.40, backZ - 0.0015);
  ADD(dataPlate);
  endPart();

  finalizeParts();
  docketHome.copy(docket.position);
  [observeKey, burstKey, resetKey, fileKey].forEach(function (k) {
    k.userData.homeZ = k.position.z;
  });

  /* --------------------------------------------------------- the ground -- */
  /* The key is the only light that casts, and it throws the cabinet's shadow
     back and to the right, so the floor directly beneath stays lit by lights
     that cast nothing and the machine reads as hovering. */
  var contactTex = (function () {
    var c = makeCanvas(512, 512), x = c.getContext("2d");
    var g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0.00, "rgba(0,0,0,0.92)");
    g.addColorStop(0.40, "rgba(0,0,0,0.64)");
    g.addColorStop(0.72, "rgba(0,0,0,0.20)");
    g.addColorStop(1.00, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    return t;
  })();
  var contact = new T.Mesh(new T.PlaneGeometry(W * 2.2, D * 2.3),
    new T.MeshBasicMaterial({ map: contactTex, transparent: true,
                             opacity: 0, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, 0.003, 0);
  contact.renderOrder = -1;
  scene.add(contact);          /* not in the machine group: it would enlarge the
                                  bounding box the camera frames itself against */

  /* ------------------------------------------------------------- lights --- */
  scene.add(new T.HemisphereLight(0x484C50, 0x0A0B0C, 0.46));

  var key = new T.DirectionalLight(0xFFFCF6, 2.5);
  key.position.set(-2.5, 3.5, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
  key.shadow.camera.left = -2; key.shadow.camera.right = 2;
  key.shadow.camera.top = 3;   key.shadow.camera.bottom = -1;
  key.shadow.bias = -0.0012;
  key.shadow.radius = 3;
  scene.add(key);

  /* An object you turn all the way round has to be lit all the way round: with
     a front key alone the other three quarters are a silhouette with no
     surface in them at all. */
  var rim = new T.DirectionalLight(0xD8DEE4, 2.6);
  rim.position.set(3.4, 2.2, -2.6);
  scene.add(rim);
  var backFill = new T.DirectionalLight(0xAAB0B6, 1.05);
  backFill.position.set(-3.0, 1.7, -2.4);
  scene.add(backFill);
  var fill = new T.DirectionalLight(0xD4DAE0, 0.38);
  fill.position.set(2.2, 1.0, 2.4);
  scene.add(fill);
  [-1, 1].forEach(function (s) {
    var kick = new T.DirectionalLight(0xC6CBD0, 0.40);
    kick.position.set(s * 4.0, 1.5, 0.5);
    scene.add(kick);
  });

  /* A work light over the floor while the parts are still on it. Ten dark grey
     assemblies on a dark grey floor in a dark room are ten things you cannot
     tell apart, and the one that matters is the one you have to find. */
  var workLight = new T.DirectionalLight(0xE6EAEE, 1.5);
  workLight.position.set(-0.8, 4.0, 2.2);
  workLight.castShadow = true;
  workLight.shadow.mapSize.set(1024, 1024);
  workLight.shadow.camera.near = 0.5; workLight.shadow.camera.far = 10;
  workLight.shadow.camera.left = -2.4; workLight.shadow.camera.right = 2.4;
  workLight.shadow.camera.top = 2.4; workLight.shadow.camera.bottom = -2.4;
  workLight.shadow.bias = -0.0015;
  scene.add(workLight);

  /* ============================== behaviour ================================ */
  var hudLeft = document.getElementById("hudLeft");
  var hudRight = document.getElementById("hudRight");
  var spinning = false, pressed = null, pressT = 0;
  var result = [SPRITES[0].name, SPRITES[0].name, SPRITES[0].name];

  function idleHint() {
    return window.innerWidth < 560
      ? "Drag to look · tap to walk"
      : "Drag to look · WASD or tap the floor to walk · pinch to lean in";
  }
  function setMessage(s) { msg = s; msgLine.redraw(); }
  function setState(a, b) { swState.set(a); swMatter.set(b); }
  function showStep() {
    var n = stepNo();
    setState("STATE: SUPERPOSED", "STEP " + (n + 1) + " OF 7");
    hudRight.textContent = STEP_NAME[n];
  }

  /* ---- working the form ---- */
  /* Strictly in order. A form completed out of order is not a completed form,
     and the apparatus is very clear about that. */
  var OUT_OF_ORDER = [
    "OUT OF SEQUENCE. THE FORM MUST BE COMPLETED IN ORDER.",
    "THAT STEP COMES LATER. NOTHING HAS BEEN RECORDED.",
    "PREMATURE. THE APPARATUS HAS NOTED IT AND DISREGARDED IT."
  ];
  var ooo = 0;
  function refuse() {
    setMessage(OUT_OF_ORDER[ooo++ % OUT_OF_ORDER.length]);
    showStep();
  }

  function doStep(which) {
    if (spinning) return;
    var n = stepNo();
    if (which === "key") {
      if (n !== 0) return refuse();
      ILK.key = true; keyAnim.target = 1;
      setMessage("ATTENDANCE RECORDED. YOU ARE PRESENT AT T+"
                 + (t0 / 1000).toFixed(1) + "S.");
    } else if (which.indexOf("decl") === 0) {
      if (n !== 1) return refuse();
      var i = +which.charAt(4);
      if (ILK.decl[i]) { setMessage("ALREADY DECLARED. ONCE IS SUFFICIENT."); return; }
      ILK.decl[i] = true; declAnims[i].target = 1;
      setMessage(["DECLARED: I AM ATTENDING OF MY OWN ACCORD.",
                  "DECLARED: I AM NOT BEING PAID TO ATTEND.",
                  "DECLARED: I AM AWARE THAT NOTHING FOLLOWS FROM THIS."][i]);
    } else if (which === "stamp") {
      if (n !== 2) return refuse();
      ILK.stamped = true;
      stampAnim.target = 1;
      setTimeout(function () { stampAnim.target = 0; }, 260);
      docketNo++;
      docket.redraw();
      docket.visible = true;
      docketAnim.target = 1;
      setMessage("STAMP APPLIED. DOCKET No "
                 + String(docketNo).padStart(4, "0")
                 + " ISSUED. YOU ARE 1 OF 1 IN THE QUEUE.");
    } else if (which === "docket") {
      if (n !== 3) return refuse();
      ILK.docket = true;
      docketAnim.rate = 2.6; docketAnim.target = 1.9;
      setTimeout(function () { docket.visible = false; docketAnim.rate = 4.5; }, 900);
      setMessage("DOCKET TAKEN. RETAIN IT. IT ENTITLES YOU TO NOTHING.");
    } else if (which === "lever") {
      if (n !== 4) return refuse();
      ILK.lever = true;
      leverAnim.rate = 14; leverAnim.target = 1;
      setTimeout(function () { leverAnim.rate = 2.2; leverAnim.target = 0; }, 420);
      setMessage("LEVER PULLED. THE APPARATUS ACKNOWLEDGES THE GESTURE.");
    } else if (which === "cover") {
      if (n !== 5) return refuse();
      ILK.cover = true; coverAnim.target = 1;
      setMessage("COVER RAISED. PRESS OBSERVE. THIS IS THE PART THAT WORKS.");
    }
    if (stepNo() === 6 && which !== "cover") {
      setMessage("THE FORM IS COMPLETE. PRESS OBSERVE.");
    }
    showStep();
  }

  function resetInterlock(quiet) {
    ILK.key = false; ILK.decl = [false, false, false];
    ILK.stamped = false; ILK.docket = false;
    ILK.lever = false; ILK.cover = false;
    keyAnim.target = 0;
    declAnims.forEach(function (a) { a.target = 0; });
    coverAnim.target = 0;
    docketAnim.target = 0; docket.visible = false;
    if (!quiet) showStep();
  }

  /* the space bar works whichever control is next, which is the only mercy in
     the whole arrangement */
  function advance() {
    if (spinning) return;
    if (phase === "INTRO" || phase === "BREAK") return skipIntro();
    if (phase === "ASSEMBLY") {     /* the space bar lifts, then puts it on */
      if (carrying) tryPlace();
      else if (nextPart < schedule.length) tapPart(schedule[nextPart]);
      return;
    }
    if (phase !== "OPERATION") return;
    var n = stepNo();
    if (n === 0) return doStep("key");
    if (n === 1) return doStep("decl" + (ILK.decl[0] ? (ILK.decl[1] ? 2 : 1) : 0));
    if (n === 2) return doStep("stamp");
    if (n === 3) return doStep("docket");
    if (n === 4) return doStep("lever");
    if (n === 5) return doStep("cover");
    return observe();
  }

  function observe() {
    if (spinning || phase !== "OPERATION") return;
    if (stepNo() < 6) {
      setMessage("THE INTERLOCK IS NOT SATISFIED. " + STEP_NAME[stepNo()] + ".");
      showStep();
      return;
    }
    spinning = true;
    pressed = observeKey; pressT = 1;
    setState("STATE: COLLAPSING", "MATTER PENDING");
    setMessage("MATTER PUT TO THE APPARATUS. AWAITING DETERMINATION.");
    hudRight.textContent = "· · ·";
    coherence = 0.06;
    for (var i = 0; i < 3; i++) {
      var r = reels[i];
      r.stop = Math.floor(Math.random() * NSYM);
      var turns = 5 + i * 2 + Math.floor(Math.random() * 2);
      /* wind forward to the next occurrence of that symbol past the turns */
      var end = r.stop;
      while (end < r.pos + turns * NSYM) end += NSYM;
      r.from = r.pos; r.to = end;
      r.dur = 1.5 + i * 0.52; r.t = 0; r.phase = 0;
    }
  }
  function settle() {
    result = reels.map(function (r) { return SPRITES[r.stop].name; });
    obsCount++;
    if (result[0] === result[1] && result[1] === result[2]) {
      matchCount++;
      setMessage("THREE ALIKE. DETERMINED. RECORD PRINTED.");
      setState("STATE: DETERMINED", "NO MATTER PENDING");
    } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
      setMessage("TWO ALIKE. PROVISIONAL. RECORD PRINTED.");
      setState("STATE: PROVISIONAL", "NO MATTER PENDING");
    } else {
      setMessage("RECORD PRINTED. IT STAYS IN THE PRINTER UNTIL SOMEONE TAKES IT.");
      setState("STATE: SUPERPOSED", "NO MATTER PENDING");
    }
    hudLeft.textContent = idleHint();
    hudRight.textContent = result.join(" / ");
    window.QA77.result = result;
    if (obsCount === 1) {
      setTimeout(function () {
        say(result[0] === result[1] && result[1] === result[2]
          ? "...Oh."
          : "It determines nothing about the operator. It says so on the front.", 4.4);
      }, 1600);
    }
    /* One token, every time, regardless. The apparatus is careful to say so:
       a payout that depended on the result would be a payout. */
    setTimeout(function () {
      if (spinning) return;
      var cls = dispenseToken();
      setMessage("ONE (1) TOKEN DISPENSED · CLASS " + cls.name
                 + ". THE OUTCOME DID NOT AFFECT THIS. NOR DID ANYTHING ELSE.");
    }, 1100);
    /* and the whole ceremony is undone, every time, without being asked */
    resetInterlock(true);
    setTimeout(function () {
      if (spinning) return;
      setMessage("THE INTERLOCK HAS RESET. IT ALWAYS DOES.");
      showStep();
    }, 3400);
  }

  /* click, but only if the pointer did not travel — otherwise every orbit drag
     that happens to end on a key would also press it */
  var ray = new T.Raycaster(), ndc = new T.Vector2();
  var hitTargets = [observeKey, burstKey, resetKey, fileKey].concat(ILK_HIT);
  var trayTargets = [trayFloor, trayLiner, trayLip, trayPlate];
  function pick(e) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    /* rebuilt per click rather than cached: the tokens in the tray come and go */
    var hits = ray.intersectObjects(hitTargets.concat(trayTargets, TOKEN_HIT), false);
    return hits.length ? hits[0].object : null;
  }
  function press(obj) {
    if (phase !== "OPERATION") return;    /* nothing on it works until it is built */
    if (obj.userData && obj.userData.ilk) return doStep(obj.userData.ilk);
    if ((obj.userData && obj.userData.token) || trayTargets.indexOf(obj) >= 0) {
      return surrenderTokens();
    }
    if (obj === observeKey) {
      if (!ILK.cover) {                     /* the cover is in the way, literally */
        setMessage("THE COVER IS DOWN. " + STEP_NAME[stepNo()] + ".");
        showStep();
        return;
      }
      return observe();
    }
    pressed = obj; pressT = 1;
    if (obj === burstKey) setMessage("BURST REQUIRES A SECOND ATTENDANT. THERE IS ONE OF YOU.");
    if (obj === resetKey) {
      obsCount = 0; matchCount = 0;
      resetInterlock(true);
      setMessage("REGISTER CLEARED. THE SESSION CLOCK IS NOT CLEARED.");
      showStep();
    }
    if (obj === fileKey) {
      setMessage(ILK.docket ? "THE DOCKET IS ALREADY WITH YOU. FILING IS YOUR AFFAIR."
                            : "NO MATTER IS PENDING. NOTHING TO FILE.");
    }
  }

  /* ------------------------------------------------------------- camera --- */
  /* An orbit controller written out rather than imported: it is forty lines,
     and the examples bundle is another download this page cannot make. */
  /* Assembly starts looking down at the floor. Parts laid flat have almost no
     vertical extent and a couple of metres of horizontal, so a near-level
     camera spends the top half of the frame on empty room; tipping over turns
     that spread into something the frame can actually use. */
  var PITCH_BUILD = 0.62, PITCH_RUN = 0.15;
  var orbit = { yaw: -0.34, pitch: PITCH_BUILD, dist: 3.2, target: new T.Vector3(0, H * 0.5, 0) };
  var vYaw = 0, vPitch = 0, dragging = false, lastX = 0, lastY = 0, travel = 0;

  /* Frame the machine rather than sit at a fixed distance. A hard-coded number
     happens to fit a square window and crops everything else — a phone in
     portrait most of all, where the horizontal field is a third of the vertical
     one. This projects the eight corners of the bounding box and takes the
     distance at which the last of them fits. */
  var fitBox = new T.Box3(), fitCorners = [];
  for (var ci = 0; ci < 8; ci++) fitCorners.push(new T.Vector3());
  var wantDist = 0, wantTarget = new T.Vector3(), autoFrame = true;
  /* Recomputed when something moves rather than every frame: the floor starts
     covered in parts and empties as they go on, so the view that fits the work
     is a different view at every stage of it. */
  function retarget() {
    fitBox.setFromObject(machine);
    /* the middle of what is actually there, in all three axes. Pinned to
       x = z = 0 it framed the spot the cabinet will eventually stand on, and
       the parts — which are laid out in front of that spot — all ended up
       bunched into one corner of the screen. */
    fitBox.getCenter(wantTarget);
    for (var i = 0; i < 8; i++) {
      fitCorners[i].set(
        (i & 1 ? fitBox.max.x : fitBox.min.x) - wantTarget.x,
        (i & 2 ? fitBox.max.y : fitBox.min.y) - wantTarget.y,
        (i & 4 ? fitBox.max.z : fitBox.min.z) - wantTarget.z
      );
    }
    wantDist = fitDistance();
  }
  var _r = new T.Vector3(), _u = new T.Vector3(), _f = new T.Vector3();
  function fitDistance() {
    var cp = Math.cos(orbit.pitch), sp = Math.sin(orbit.pitch);
    _f.set(cp * Math.sin(orbit.yaw), sp, cp * Math.cos(orbit.yaw));
    _r.set(Math.cos(orbit.yaw), 0, -Math.sin(orbit.yaw));
    _u.crossVectors(_f, _r).normalize();
    var tv = Math.tan(camera.fov * Math.PI / 360);
    var th = tv * camera.aspect;
    var need = 0;
    for (var i = 0; i < 8; i++) {
      var p = fitCorners[i];
      var z = p.dot(_f);
      need = Math.max(need, z + Math.abs(p.dot(_r)) / th, z + Math.abs(p.dot(_u)) / tv);
    }
    return need * 1.06;
  }
  var simT = 0;      /* clamped simulation time, the clock every cue runs on */

  /* ============================ THE OPERATOR ============================== */
  /* A body with a head on it, not a camera on a rail. Through the fall the eye
     tracks the cabinet, because that is what you would be looking at; from the
     moment you hit the floor it is yours, and it starts face down. */
  var camMode = "TRACK";                   /* TRACK · GROUND · FP */
  var player = {
    pos: new T.Vector3(1.15, 0, 2.85),
    yaw: -0.42, pitch: 0, roll: 0,
    eye: 1.62, bob: 0, walk: null
  };
  var EYE_STAND = 1.62, EYE_FLOOR = 0.135;
  var WALK = 1.75, REACH = 2.2, KEEP_OUT = 0.66, ROAM = 6.5;
  var held = { w: 0, a: 0, s: 0, d: 0 };
  var riseT = 0, aimPitch = null;
  /* Where to look, eased. Standing at two metres from the wreck with your eye
     at 1.62, the floor in front of you is 0.6 radians down — the orbit view's
     0.2 puts every part below the bottom of the frame. */
  var LOOK_FLOOR = -0.48, LOOK_MACHINE = -0.08;
  function aim(p) { aimPitch = p; }

  function forward(out) { return out.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); }
  function strafe(out) { return out.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw)); }
  /* With rotation order YXZ the camera looks along (-sin yaw, 0, -cos yaw), so
     facing the origin from (x, z) is atan2(x, z) — not atan2(-x, -z), which
     turns you to look at the empty floor behind you. */
  function faceSite() {
    player.yaw = Math.atan2(player.pos.x, player.pos.z);
  }

  function applyCamera() {
    if (camMode === "TRACK") {
      var cp = Math.cos(orbit.pitch), sp = Math.sin(orbit.pitch);
      camera.position.set(
        orbit.target.x + orbit.dist * cp * Math.sin(orbit.yaw),
        orbit.target.y + orbit.dist * sp,
        orbit.target.z + orbit.dist * cp * Math.cos(orbit.yaw)
      );
      camera.lookAt(orbit.target);
    } else {
      camera.rotation.order = "YXZ";
      camera.position.set(player.pos.x, player.eye + player.bob, player.pos.z);
      camera.rotation.set(player.pitch, player.yaw, player.roll);
    }
    if (shake > 0.0002) {
      /* two frequencies rather than white noise: random per frame reads as a
         broken renderer, a beat reads as something hitting something */
      var t = simT;
      camera.position.x += (Math.sin(t * 47.3) + Math.sin(t * 29.1) * 0.6) * shake;
      camera.position.y += (Math.sin(t * 53.7) + Math.sin(t * 37.9) * 0.6) * shake;
      camera.position.z += (Math.sin(t * 41.1) + Math.sin(t * 23.3) * 0.6) * shake;
      if (camMode === "TRACK") camera.lookAt(orbit.target);
      camera.rotateZ(Math.sin(t * 31.7) * shake * 0.5);
    }
    /* Last, because the shake block re-aims at the target and would undo it.
       The look-at already tilts down by orbit.pitch, so the extra needed to
       reach vertical is what remains of a right angle. */
    if (glance > 0.001) camera.rotateX(-glance * (Math.PI / 2 - orbit.pitch));
  }

  /* leaning in, rather than moving: a first-person view has no dolly, and being
     able to read the panel from across the floor is worth more than one */
  function dolly(scale) {
    if (camMode === "TRACK") {
      autoFrame = false;
      var f = fitDistance();
      orbit.dist = Math.max(f * 0.06, Math.min(f * 8, orbit.dist * scale));
      return;
    }
    camera.fov = Math.max(22, Math.min(58, camera.fov * scale));
    camera.updateProjectionMatrix();
  }

  /* ---- where the floor is under a tap ---- */
  var _plane = new T.Plane(new T.Vector3(0, 1, 0), 0), _gp = new T.Vector3();
  function groundAt(e) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(_plane, _gp) ? _gp.clone() : null;
  }
  /* a spot you can stand in: outside the cabinet, inside the room */
  function standable(p) {
    var v = new T.Vector3(p.x, 0, p.z);
    var d = Math.hypot(v.x, v.z);
    if (d > ROAM) v.multiplyScalar(ROAM / d);
    d = Math.hypot(v.x, v.z);
    if (d < KEEP_OUT) {
      if (d < 1e-4) v.set(0, 0, KEEP_OUT);
      else v.multiplyScalar(KEEP_OUT / d);
    }
    return v;
  }
  function walkTo(point, onArrive) {
    player.walk = { to: standable(point), onArrive: onArrive || null };
  }
  /* stand a comfortable arm's length off a thing rather than on top of it */
  function approach(worldPos, gap, onArrive) {
    var away = new T.Vector3(player.pos.x - worldPos.x, 0, player.pos.z - worldPos.z);
    if (away.lengthSq() < 1e-6) away.set(0, 0, 1);
    away.normalize().multiplyScalar(gap);
    walkTo(new T.Vector3(worldPos.x + away.x, 0, worldPos.z + away.z), onArrive);
  }

  function stepPlayer(dt) {
    if (camMode !== "FP") return;
    var f = forward(new T.Vector3()), r = strafe(new T.Vector3());
    var mv = new T.Vector3();
    var ax = (held.d - held.a), az = (held.w - held.s);
    if (ax || az) {
      player.walk = null;                  /* the keys override a tap */
      mv.addScaledVector(f, az).addScaledVector(r, ax);
    } else if (player.walk) {
      mv.set(player.walk.to.x - player.pos.x, 0, player.walk.to.z - player.pos.z);
      if (mv.length() < 0.22) {
        var cb = player.walk.onArrive; player.walk = null;
        if (cb) cb();
        mv.set(0, 0, 0);
      }
    }
    var moving = mv.lengthSq() > 1e-6;
    if (moving) {
      mv.normalize().multiplyScalar(WALK * dt);
      var next = standable(new T.Vector3(player.pos.x + mv.x, 0, player.pos.z + mv.z));
      player.pos.set(next.x, 0, next.z);
      /* the head rides on the walk. Without it a first-person view slides */
      player.bobT = (player.bobT || 0) + dt * 8.6;
      player.bob = Math.sin(player.bobT) * 0.024;
      player.roll = Math.sin(player.bobT * 0.5) * 0.010;
    } else {
      player.bob += (0 - player.bob) * Math.min(1, 6 * dt);
      player.roll += (0 - player.roll) * Math.min(1, 6 * dt);
    }
  }

  /* ---- getting up ---- */
  function goToGround() {
    camMode = "GROUND";
    player.pos.set(1.15, 0, 2.85);
    faceSite();
    player.yaw -= 0.16;
    player.eye = EYE_FLOOR;
    player.pitch = 0.05;                   /* looking along the floor at it */
    player.roll = 1.12;                    /* and lying on one cheek */
    player.bob = 0;
  }
  function beginRise() {
    if (camMode !== "GROUND") return;
    camMode = "RISE"; riseT = 0;
  }
  function stepRise(dt) {
    riseT += dt;
    var k = Math.min(1, riseT / 2.9);
    var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    player.eye = EYE_FLOOR + (EYE_STAND - EYE_FLOOR) * e;
    player.roll = 1.12 * (1 - e);
    player.pitch = 0.05 + (LOOK_FLOOR - 0.05) * e;
    if (k >= 1) {
      camMode = "FP";
      player.eye = EYE_STAND; player.roll = 0; player.pitch = LOOK_FLOOR;
      hudLeft.textContent = "TEN PARTS. ONE SCHEDULE. WALK TO THE ONE THAT IS LIFTING.";
    }
  }

  /* Pointers are tracked by id rather than with a single dragging flag: a pinch
     is two of them, and on a touchscreen it is the only way to lean in. */
  var pointers = new Map(), pinchWas = 0;
  function pinchSpan() {
    var it = pointers.values(), a = it.next().value, b = it.next().value;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  canvas.addEventListener("pointerdown", function (e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true; travel = 0; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add("dragging"); canvas.setPointerCapture(e.pointerId);
    } else {
      dragging = false; vYaw = vPitch = 0;
      canvas.classList.remove("dragging");
      pinchWas = pinchSpan();
    }
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      var now = pinchSpan();
      if (pinchWas > 0 && now > 0) dolly(pinchWas / now);
      pinchWas = now;
      return;
    }
    if (!dragging) return;
    aimPitch = null;                       /* the viewer is looking for themselves */
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    travel += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX; lastY = e.clientY;
    vYaw = -dx * 0.0055; vPitch = -dy * 0.0045;
  });
  var lastTap = 0;
  function reframe() {
    if (camMode === "FP") {
      faceSite();
      aim(phase === "OPERATION" ? LOOK_MACHINE : LOOK_FLOOR);
      vYaw = vPitch = 0; return;
    }
    orbit.yaw = -0.34;
    orbit.pitch = phase === "OPERATION" ? PITCH_RUN : PITCH_BUILD;
    autoFrame = true;
    retarget();
    orbit.target.copy(wantTarget);
    orbit.dist = wantDist;
    vYaw = vPitch = 0;
  }

  function worldOf(o) { return o.getWorldPosition(new T.Vector3()); }
  function within(worldPos, r) {
    return Math.hypot(player.pos.x - worldPos.x, player.pos.z - worldPos.z) <= r;
  }

  function endDrag(e) {
    if (e) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchWas = 0;
    if (pointers.size > 0) return;
    var wasDrag = dragging, moved = travel;
    dragging = false; canvas.classList.remove("dragging");
    if (!wasDrag || moved >= 6 || !e) return;

    if (phase === "INTRO" || phase === "BREAK") { skipIntro(); lastTap = 0; return; }
    if (camMode === "GROUND") { beginRise(); lastTap = 0; return; }
    if (camMode !== "FP") return;

    if (phase === "ASSEMBLY" && carrying) {
      var other = pickPart(e);
      if (other && other !== carrying) { tapPart(other); lastTap = 0; return; }
      tryPlace(); lastTap = 0; return;
    }
    if (phase === "ASSEMBLY") {
      var part = pickPart(e);
      if (part) {
        /* fitted from wherever you are standing. Making you walk to each of
           the ten first turns a build into a walking simulator, and you have
           to be able to see the part to tap it anyway. */
        tryFitPart(part);
        lastTap = 0; return;
      }
    }
    var hit = pick(e);
    if (hit) {
      var hp = worldOf(hit);
      if (within(hp, REACH)) press(hit);
      else approach(hp, 1.15, function () { press(hit); });
      lastTap = 0; return;
    }
    /* nothing under it: walk there, and two taps turns you back to the machine */
    var g = groundAt(e);
    var now = simT;
    if (now - lastTap < 0.4) { reframe(); lastTap = 0; }
    else { lastTap = now; if (g) walkTo(g); }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    dolly(1 + e.deltaY * 0.0011);
  }, { passive: false });

  var KEYS = { KeyW: "w", ArrowUp: "w", KeyS: "s", ArrowDown: "s",
               KeyA: "a", ArrowLeft: "a", KeyD: "d", ArrowRight: "d" };
  window.addEventListener("keyup", function (e) {
    if (KEYS[e.code]) held[KEYS[e.code]] = 0;
  });

  window.addEventListener("keydown", function (e) {
    if (KEYS[e.code]) { held[KEYS[e.code]] = 1; e.preventDefault(); return; }
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (camMode === "GROUND") return beginRise();
      return advance();
    }
    if (e.code === "KeyF" || e.code === "Home") { e.preventDefault(); reframe(); }
  });

  /* ------------------------------------------------------------- resize --- */
  var framed = false;
  function resize() {
    /* the canvas's own box, not the window's: inside a webview or an iframe
       those are different rectangles and only one of them is the one on screen */
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    var before = framed ? fitDistance() : 0;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (phase !== "INTRO" && phase !== "BREAK") retarget();
    if (framed && !autoFrame) orbit.dist *= wantDist / (before || wantDist);
    else if (!framed) { orbit.target.copy(wantTarget); orbit.dist = wantDist; }
    framed = true;
    if (!spinning && phase === "OPERATION") hudLeft.textContent = idleHint();
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () { setTimeout(resize, 120); });
  /* and watch the element itself, because an embedded page can be resized
     without the window ever firing an event */
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();

  /* ======================== THE COMMISSIONING ============================== */
  /* The apparatus does not arrive. It arrives in ten pieces on the floor with
     a schedule, and the schedule is to be followed in order, and only once it
     is discharged does anything have power in it. */
  var ASSEMBLY = [
    ["PLINTH",      "THE PLINTH",            "PLINTH SET. THE APPARATUS NOW HAS A FLOOR."],
    ["CARCASS",     "THE CARCASS",           "CARCASS SEATED. 88 KG. IT WILL NOT BE MOVED AGAIN."],
    ["DISPLAY",     "THE DISPLAY UNIT",      "DISPLAY UNIT FITTED. IT SHOWS NOTHING YET."],
    ["HEADER",      "THE HEADER PLATE",      "HEADER PLATE FIXED. THE APPARATUS NOW HAS A NAME."],
    ["INSTRUMENTS", "THE INSTRUMENT STRIP",  "INSTRUMENT STRIP FITTED. THERE IS NOTHING TO MEASURE."],
    ["CONTROLS",    "THE CONTROL BAND",      "CONTROL BAND FITTED. THERE IS NOTHING TO CONTROL."],
    ["INTERLOCK",   "THE INTERLOCK BAND",    "INTERLOCK FITTED. IT IS NOT SATISFIED."],
    ["LEVER",       "THE LEVER ASSEMBLY",    "LEVER FITTED. IT IS NOT CONNECTED TO ANYTHING."],
    ["SERVICE",     "THE SERVICE PANEL",     "SERVICE PANEL FIXED. THE SEAL IS PRESSED, NOT PRINTED."],
    ["TRAY",        "THE COIN TRAY",         "COIN TRAY FITTED. THE APPARATUS IS COMPLETE."]
  ];
  var byName = {};
  PARTS.forEach(function (p) { byName[p.name] = p; });
  var schedule = ASSEMBLY.map(function (a) {
    var p = byName[a[0]];
    if (p) { p.label = a[1]; p.seated = a[2]; }
    return p;
  }).filter(Boolean);

  var phase = "ASSEMBLY";                 /* ASSEMBLY · COMMISSIONING · OPERATION */
  var nextPart = 0, commissionT = 0;
  var REFUSALS = [
    "THAT IS NOT THE NEXT ITEM ON THE SCHEDULE.",
    "SCHEDULE QA-77/A IS TO BE FOLLOWED IN ORDER.",
    "SET IT DOWN. IT IS NOT WANTED YET."
  ];
  var refuseN = 0;

  function assemblyHud(note) {
    if (note) hudLeft.textContent = note;
    hudRight.textContent = nextPart >= schedule.length
      ? "COMMISSIONING"
      : "FIT " + (nextPart + 1) + "/" + schedule.length + " · " + schedule[nextPart].label;
  }

  /* Laid out in front of the cabinet's site rather than flung about: a fitter
     sets the parts down where they can be reached, and a semicircle keeps them
     all inside one view instead of scattered behind you where the one that is
     next cannot be seen to be next. */
  var _fwd = new T.Vector3(), _hold = new T.Vector3();
  var _holdE = new T.Euler(), _holdQ = new T.Quaternion();
  var _c8 = [];
  for (var q8 = 0; q8 < 8; q8++) _c8.push(new T.Vector3());
  function layDown(p, i, n) {
    var a = -Math.PI * 0.44 + ((i + 0.5) / n) * Math.PI * 0.88;
    var rad = (p.size.y > 0.9 ? 1.20 : 0.78 + (i % 3) * 0.13);
    var q = new T.Quaternion().setFromEuler(new T.Euler(
      -Math.PI / 2 + (i % 2 ? 0.10 : -0.07),      /* face up, roughly */
      a + (p.size.y > 0.9 ? Math.PI / 2 : 0) + (i % 3 - 1) * 0.22,
      0, "YXZ"));
    /* drop it until it is resting on the floor rather than floating or sunk */
    var lo = p.local, minY = Infinity;
    for (var k = 0; k < 8; k++) {
      _c8[k].set(k & 1 ? lo.max.x : lo.min.x, k & 2 ? lo.max.y : lo.min.y,
                 k & 4 ? lo.max.z : lo.min.z).applyQuaternion(q);
      minY = Math.min(minY, _c8[k].y);
    }
    p.downQuat = q;
    p.downPos = new T.Vector3(Math.sin(a) * rad, 0.008 - minY, Math.cos(a) * rad);
    p.restY = p.downPos.y;
  }
  function planScatter() {
    schedule.forEach(function (p, i) { layDown(p, i, schedule.length); });
  }
  function scatterNow() {
    schedule.forEach(function (p) {
      p.group.position.copy(p.downPos);
      p.group.quaternion.copy(p.downQuat);
      p.fitted = false; p.anim = null;
    });
  }

  /* One animator for both directions: parts fly up onto the machine during
     assembly and off it when the machine lands, and the only difference is
     which pose is the destination and how high the arc is. */
  function moveTo(p, pos, quat, dur, arc, delay, onEnd) {
    p.anim = { t: -(delay || 0) / dur, dur: dur, arc: arc, onEnd: onEnd,
               p0: p.group.position.clone(), q0: p.group.quaternion.clone(),
               p1: pos, q1: quat };
  }
  function fitPart(p) {
    moveTo(p, p.fitPos, p.fitQuat, 1.0, 0.26, 0, onSeated);
  }
  function onSeated(p) {
    p.fitted = true;
    nextPart++;
    retarget();
    if (nextPart >= schedule.length) {
      phase = "COMMISSIONING"; commissionT = 0;
      assemblyHud("SCHEDULE DISCHARGED. APPLYING SUPPLY.");
    } else {
      assemblyHud(p.seated);
      if (PART_LINES[p.name]) say(PART_LINES[p.name], 4.0);
      carryHint();
    }
  }
  /* Picked up and carried, rather than teleported into place by a tap. It is
     the difference between clicking ten things off a list and clearing a floor:
     you lift a part, you walk it over, you put it on. */
  var carrying = null, PLACE_RANGE = 2.6;
  function holdRadius(p) {
    return Math.max(p.size.x, Math.max(p.size.y, p.size.z)) * 0.5;
  }
  function carryHint() {
    if (!carrying) return assemblyHud();
    var near = Math.hypot(player.pos.x, player.pos.z) <= PLACE_RANGE;
    hudRight.textContent = near
      ? "TAP TO FIT " + carrying.label
      : "CARRY " + carrying.label + " TO THE SITE";
  }
  function pickUp(p) {
    carrying = p;
    p.anim = null;
    if (LIFT_LINES[p.name]) say(LIFT_LINES[p.name], 3.8);
    carryHint();
  }
  function stepCarry(dt) {
    if (!carrying) return;
    var p = carrying, r = holdRadius(p);
    var f = forward(_fwd);
    /* far enough out and low enough down that you can still see where you are
       walking. Held close, the carcass is the entire top half of the screen. */
    _hold.set(player.pos.x, player.eye + player.bob, player.pos.z)
         .addScaledVector(f, 0.64 + r * 1.55);
    _hold.y -= 0.20 + r * 0.52;
    p.group.position.lerp(_hold, Math.min(1, 9 * dt));
    _holdE.set(-0.12, player.yaw, 0, "YXZ");
    _holdQ.setFromEuler(_holdE);
    p.group.quaternion.slerp(_holdQ, Math.min(1, 9 * dt));
  }
  function tryPlace() {
    if (!carrying) return;
    if (Math.hypot(player.pos.x, player.pos.z) > PLACE_RANGE) {
      walkTo(new T.Vector3(0, 0, 1.6), tryPlace);
      carryHint();
      return;
    }
    var p = carrying; carrying = null;
    fitPart(p);
  }
  function tapPart(p) {
    if (phase !== "ASSEMBLY" || p.fitted || p.anim) return;
    if (carrying) {
      if (p === carrying) return tryPlace();
      assemblyHud("ONE AT A TIME.");
      say("One at a time.", 2.0);
      return;
    }
    if (schedule[nextPart] !== p) {
      assemblyHud(REFUSALS[refuseN++ % REFUSALS.length]);
      return;
    }
    pickUp(p);
  }
  function tryFitPart(p) { tapPart(p); }
  /* the part wanted next lifts and settles on the spot, because a schedule you
     cannot read off the floor is a schedule you cannot follow */
  function bobNext(t) {
    for (var i = 0; i < schedule.length; i++) {
      var p = schedule[i];
      if (p.fitted || p.anim || p === carrying) continue;
      /* clearly off the floor, not a few millimetres of wobble: at the distance
         that fits ten parts in one frame a subtle cue is no cue at all */
      p.group.position.y = p.restY
        + (i === nextPart ? 0.055 + Math.sin(t * 2.6) * 0.022 : 0);
    }
  }
  function stepAssembly(dt) {
    for (var i = 0; i < schedule.length; i++) {
      var p = schedule[i], a = p.anim;
      if (!a) continue;
      a.t += dt / a.dur;
      if (a.t < 0) continue;                     /* still waiting its turn */
      var e = Math.min(1, a.t);
      var k = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
      p.group.position.lerpVectors(a.p0, a.p1, k);
      p.group.position.y += Math.sin(Math.PI * k) * a.arc;
      p.group.quaternion.slerpQuaternions(a.q0, a.q1, k);
      if (e >= 1) {
        p.group.position.copy(a.p1);
        p.group.quaternion.copy(a.q1);
        p.anim = null;
        if (a.onEnd) a.onEnd(p);
      }
    }
  }

  /* power comes up over a couple of seconds, and until it does the printed
     plates read as printing and the display reads as a dead panel */
  function applyPower() {
    for (var i = 0; i < LIT.length; i++) LIT[i].m.emissiveIntensity = LIT[i].base * power;
    lcd.material.color.setScalar(0.14 + power * 0.86);
    trayLight.intensity = 0.016 * power;
    /* it is the cabinet's own occlusion, and until the cabinet is standing it
       is a dark stain on an empty floor */
    contact.material.opacity = power;
  }
  function stepCommission(dt) {
    commissionT += dt;
    power = Math.min(1, commissionT / 2.2);
    applyPower();
    workLight.intensity = 1.5 * (1 - power);
    if (camMode === "TRACK") orbit.pitch += (PITCH_RUN - orbit.pitch) * Math.min(1, 1.4 * dt);
    if (commissionT > 2.6) {
      phase = "OPERATION";
      power = 1; applyPower();
      workLight.intensity = 0;
      autoFrame = true; retarget();
      setMessage("COMMISSIONED. FORM QA-77/A IS DISCHARGED. THE APPARATUS IS YOURS TO ATTEND.");
      say("All right. Same room, same floor. Let's see what it says about me.", 5.0);
      hudLeft.textContent = idleHint();
      showStep();
    }
  }

  /* picked recursively, unlike the fixed controls: a part is a whole assembly
     and the ray will land on whichever of its hundred meshes faces you */
  function pickPart(e) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    var loose = [];
    for (var i = 0; i < schedule.length; i++) {
      if (!schedule[i].fitted && !schedule[i].anim && schedule[i] !== carrying) {
        loose.push(schedule[i].group);
      }
    }
    var hits = ray.intersectObjects(loose, true);
    if (!hits.length) return null;
    var o = hits[0].object;
    while (o && loose.indexOf(o) < 0) o = o.parent;
    if (!o) return null;
    for (var j = 0; j < schedule.length; j++) if (schedule[j].group === o) return schedule[j];
    return null;
  }

  /* =============================== THE VOICE =============================== */
  /* Someone talked the operator into this. The apparatus states, on its own
     front, that it determines nothing about anybody — and that has never once
     stopped anybody attending it. Everything here is the operator's, in
     sentence case; everything the machine says is upper case in the corners. */
  var sayEl = document.getElementById("say");
  var sayUntil = 0, sayLast = "";
  function say(text, hold) {
    if (text === sayLast && sayUntil > 0) return;
    sayLast = text;
    sayEl.textContent = text;
    sayEl.classList.add("on");
    /* on the simulation clock, not the wall clock: they are the same thing on
       a machine keeping up and badly out of step on one that is not, and a
       subtitle that expires before its scene has played is worse than none */
    sayUntil = simT + (hold || 3.4);
  }
  function hush() { sayEl.classList.remove("on"); sayUntil = 0; sayLast = ""; }
  function stepVoice() {
    if (sayUntil && simT > sayUntil) {
      sayEl.classList.remove("on");
      sayUntil = 0;
    }
  }

  /* the fall, cued off the drop's own clock so it stays in step with the reels */
  /* Short lines, because there are only seven seconds of falling and a line
     you cannot finish reading before the next one lands is not a line. The
     long ones go after the crash, where there is time. */
  /* Cued against the reels: the first is down by 4.8, the second by 8.6, and
     the third crawls from 9.2 to the floor. He tells you what he needs while
     there is still time for it to happen. */
  var FALL_LINES = [
    [0.40,  "Forty years in the same room, he said.", 1.4],
    [2.90,  "...that is a long way down.", 2.0],
    [5.20,  "It's just floor. All the way down.", 1.6],
    [8.50,  "Never once wrong about anybody. That was the phrase he used.", 2.4],
    [11.80, "It's coming up fast.", 1.5],
    [15.10, "That's two the same.", 1.8],
    [16.40, "No — watch the reel, watch the reel —", 1.3],
    [17.70, "I need the third to match. Three alike is the only one that counts.", 2.2],
    [18.60, "Come on.", 0.9],
    [19.10, "Come on —", 0.5]
  ];
  var fallCue = 0;

  /* and afterwards, when there is nothing to do but read */
  var AFTER = [
    ["One stop short.", 2.4, 1100],
    ["Why did I let him talk me into pulling that lever.", 3.6, 4000],
    ["It isn't permitted to be right about anybody. It says so on the front.", 4.2, 8200]
  ];
  /* one on the way up, one on the way down. The build is the only stretch of
     this where there is time to say anything, so it is where the rest of it
     gets said. */
  var LIFT_LINES = {
    PLINTH:      "Start at the bottom. That's what he'd say.",
    CARCASS:     "God. It's the whole shell.",
    DISPLAY:     "Careful with this. Careful.",
    HEADER:      "Atlas Electronics. Somebody put their name on it.",
    INSTRUMENTS: "The coherence bar. He watched this like it meant something.",
    CONTROLS:    "Observe, burst, reset, file. Four keys and one of them works.",
    INTERLOCK:   "Seven steps before it will so much as look at you.",
    LEVER:       "And this. The famous lever.",
    SERVICE:     "Public Luck Authority. I never once met anybody from it.",
    TRAY:        "Where the tokens come out. Worth nothing, he said. He kept every one."
  };
  var PART_LINES = {
    PLINTH:      "Level. It has to be level or the reels drift.",
    CARCASS:     "The one before me got three alike. He never said what happened to them.",
    DISPLAY:     "It was showing something when it hit. I keep thinking about that.",
    HEADER:      "There. It has a name again.",
    INSTRUMENTS: "Nothing to measure yet.",
    CONTROLS:    "Nothing to control yet either.",
    INTERLOCK:   "Seven steps. He did all seven, every time, and told me it mattered.",
    LEVER:       "Not connected to anything. I checked. There's a plate.",
    SERVICE:     "The seal's pressed, not printed. So you can't argue with it.",
    TRAY:        "That's the last of it."
  };

  /* ------------------------------------------------------ the landing site -- */
  /* You cannot build suspense out of a fall toward nothing. At seventy-nine
     metres the floor is entirely inside the fog and looking down shows black,
     so the place you are going to hit is marked, and the mark does not fog:
     it starts as a coin at the bottom of the frame and ends up under you. */
  var siteTex = (function () {
    var c = makeCanvas(512, 512), x = c.getContext("2d");
    x.clearRect(0, 0, 512, 512);
    var g = x.createRadialGradient(256, 256, 20, 256, 256, 250);
    g.addColorStop(0.00, "rgba(196,204,212,.30)");
    g.addColorStop(0.55, "rgba(150,160,170,.10)");
    g.addColorStop(1.00, "rgba(0,0,0,0)");
    x.fillStyle = g; x.beginPath(); x.arc(256, 256, 250, 0, TAU); x.fill();
    x.strokeStyle = "rgba(206,214,222,.55)"; x.lineWidth = 5;
    x.beginPath(); x.arc(256, 256, 196, 0, TAU); x.stroke();
    x.lineWidth = 3; x.strokeStyle = "rgba(206,214,222,.32)";
    x.beginPath(); x.arc(256, 256, 124, 0, TAU); x.stroke();
    x.strokeStyle = "rgba(206,214,222,.45)"; x.lineWidth = 4;
    [[256, 44, 256, 108], [256, 404, 256, 468], [44, 256, 108, 256], [404, 256, 468, 256]]
      .forEach(function (l) {
        x.beginPath(); x.moveTo(l[0], l[1]); x.lineTo(l[2], l[3]); x.stroke();
      });
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = MAXA;
    return t;
  })();
  var siteMark = new T.Mesh(new T.PlaneGeometry(10.5, 10.5),
    new T.MeshBasicMaterial({ map: siteTex, transparent: true, depthWrite: false, fog: false }));
  siteMark.rotation.x = -Math.PI / 2;
  siteMark.position.y = 0.004;
  siteMark.visible = false;
  siteMark.renderOrder = -2;
  scene.add(siteMark);

  /* --------------------------------------------------- the fall effects --- */
  /* A camera that tracks a falling object perfectly shows no fall at all: the
     object sits dead still in frame and only the tumble moves. What sells it is
     everything the camera passes on the way down. These streaks hang still in
     the world and get recycled once they are above you, so falling past them is
     the actual motion rather than a simulation of one. */
  var FALLFX = new T.Group();
  FALLFX.visible = false;
  scene.add(FALLFX);

  var STREAKS = 620, streakSeed = [], streakPos = new Float32Array(STREAKS * 6);
  (function () {
    for (var i = 0; i < STREAKS; i++) {
      var a = Math.random() * TAU, r = 0.95 + Math.pow(Math.random(), 0.7) * 6.2;
      streakSeed.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0, k: 0.5 + Math.random() });
    }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(streakPos, 3));
    var m = new T.LineBasicMaterial({ color: 0xD2D8DE, transparent: true, opacity: 0.62 });
    var ls = new T.LineSegments(g, m);
    /* The bounding sphere is computed once, at construction, when every vertex
       is still at the origin — so the whole field gets frustum-culled the
       moment the camera is anywhere but on top of it, which is always. */
    ls.frustumCulled = false;
    FALLFX.add(ls);
  })();
  var streakGeo = FALLFX.children[0].geometry;
  function seedStreaks(camY) {
    for (var i = 0; i < STREAKS; i++) streakSeed[i].y = camY - 13 + Math.random() * 16;
  }
  function stepStreaks(camY, speed) {
    var len = 0.18 + speed * 0.20;
    for (var i = 0; i < STREAKS; i++) {
      var sd = streakSeed[i];
      if (sd.y > camY + 3.2) {
        var a = Math.random() * TAU, r = 0.95 + Math.pow(Math.random(), 0.7) * 6.2;
        sd.x = Math.cos(a) * r; sd.z = Math.sin(a) * r;
        sd.y = camY - 13 - Math.random() * 5;
      }
      var o = i * 6;
      streakPos[o] = sd.x; streakPos[o + 1] = sd.y; streakPos[o + 2] = sd.z;
      streakPos[o + 3] = sd.x; streakPos[o + 4] = sd.y + len * sd.k; streakPos[o + 5] = sd.z;
    }
    streakGeo.attributes.position.needsUpdate = true;
  }

  /* and the tokens it is shedding on the way down, tumbling alongside */
  var SPILL = [];
  (function () {
    for (var i = 0; i < 14; i++) {
      var cls = CLASSES[i % CLASSES.length];
      var m = new T.Mesh(cls.geo, cls.mats);
      m.userData.off = new T.Vector3(
        (Math.random() - 0.5) * 1.7, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.5);
      m.userData.drift = 0.04 + Math.random() * 0.14;
      m.userData.spin = new T.Vector3(
        (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 7);
      FALLFX.add(m);
      SPILL.push(m);
    }
  })();
  function stepSpill(dt, machY) {
    for (var i = 0; i < SPILL.length; i++) {
      var m = SPILL[i], u = m.userData;
      u.off.y += u.drift * dt;              /* it falls a little slower than the cabinet */
      m.position.set(u.off.x, machY + H * 0.5 + u.off.y, u.off.z);
      m.rotation.x += u.spin.x * dt; m.rotation.y += u.spin.y * dt; m.rotation.z += u.spin.z * dt;
    }
  }

  /* ============================== THE FALL ================================= */
  /* The apparatus has been in service somewhere else. It arrives mid-cycle,
     falling, with two reels already down on the same symbol and the third
     crawling toward it the way a reel does when the machine wants you to
     watch. It lands one stop short of the only result that would have meant
     anything, and it comes apart. That is where the parts on the floor come
     from, and it is the whole reason there is a schedule to follow. */
  /* Thirty metres, not seven. Under the old profile the cabinet arrived at
     about two metres a second, which is a heavy object being lowered rather
     than one that is falling. */
  /* Long. Seventy-nine metres and a quarter of a minute, because the drop has
     a script to get through and a script delivered at falling speed is a
     script nobody reads. It is skippable at any point. */
  /* A hundred and five metres and twenty seconds. The descent is planned round
     the glances rather than the other way about: he looks down, holds it, and
     is back on the machine before each reel comes in. */
  var FALL_H = 105.0, MATCH = 3;                 /* MELON, three alike */
  var T_STOP = [7.80, 14.30], T_CRAWL = 15.40, T_IMPACT = 19.50;
  var introT = 0, broke = false, shake = 0, flash = 0, fallSpeed = 0, glance = 0;
  /* Three looks down, each held straight at the floor and each shorter than the
     last: four seconds the first time, when there is nothing to do but take it
     in; two the second; under one the third, snatched, because by then the
     reels are coming in and he cannot spare the time. */
  var GLANCES = [
    { at: 1.80,  down: 0.80, hold: 4.00, up: 0.80 },
    { at: 11.00, down: 0.50, hold: 2.00, up: 0.50 },
    { at: 16.00, down: 0.30, hold: 0.90, up: 0.35 }
  ];
  function smooth(k) { return k * k * (3 - 2 * k); }
  function glanceAt(t) {
    for (var i = 0; i < GLANCES.length; i++) {
      var g = GLANCES[i], u = t - g.at;
      if (u < 0 || u > g.down + g.hold + g.up) continue;
      if (u < g.down) return smooth(u / g.down);
      if (u < g.down + g.hold) return 1;
      return 1 - smooth((u - g.down - g.hold) / g.up);
    }
    return 0;
  }

  function nextMatchAt(x) {
    var k = Math.ceil((x - MATCH) / NSYM);
    return MATCH + k * NSYM;
  }
  function startIntro() {
    planScatter();
    phase = "INTRO"; introT = 0; broke = false; shake = 0; flash = 0;
    fallCue = 0; hush(); glance = 0;
    siteMark.visible = true;
    /* The drop starts at a hundred and five metres and the far plane was at
       eighty, so the floor — and the mark on it — were clipped away entirely
       and every look down showed nothing but streaks. Nothing is near the eye
       during the fall, so the near plane can go out to pay for it. */
    camera.near = 0.4; camera.far = 320; camera.updateProjectionMatrix();
    scene.fog.density = 0.016;
    FALLFX.visible = true;
    seedStreaks(FALL_H);
    SPILL.forEach(function (m) { m.userData.off.y = (Math.random() - 0.5) * 2.4; });
    camera.fov = 32; camera.updateProjectionMatrix();
    power = 1; applyPower();
    contact.material.opacity = 0;
    workLight.intensity = 0;
    autoFrame = false;
    reels.forEach(function (r, i) {
      r.pos = i * 2.7; r.introTarget = null; r.introDone = false; r.crawl = null;
    });
    machine.position.set(0, FALL_H, 0);
    hudLeft.textContent = "Tap to skip";
    hudRight.textContent = "· · ·";
  }

  function stepIntroReels(dt, t) {
    for (var i = 0; i < 3; i++) {
      var r = reels[i];
      if (r.introDone) continue;
      if (i < 2) {
        if (t < T_STOP[i]) { r.pos += 11.5 * dt; continue; }
        if (!r.introTarget) {
          r.introTarget = nextMatchAt(r.pos + 1.2);
          r.introFrom = r.pos; r.introT = 0;
        }
        r.introT += dt / 0.55;
        var e = Math.min(1, r.introT);
        r.pos = r.introFrom + (r.introTarget - r.introFrom) * (1 - Math.pow(1 - e, 3));
        if (e >= 1) { r.pos = r.introTarget; r.introDone = true; }
      } else {
        if (t < T_CRAWL) { r.pos += 11.5 * dt; continue; }
        if (!r.crawl) {
          /* it will arrive a third of a symbol short of the match, which is
             near enough to see the melon entering the window and not near
             enough to count */
          r.crawl = { from: r.pos, to: nextMatchAt(r.pos + 2.1) - 0.34, t: 0 };
        }
        r.crawl.t += dt / (T_IMPACT - T_CRAWL);
        var k = Math.min(1, r.crawl.t);
        r.pos = r.crawl.from + (r.crawl.to - r.crawl.from) * (1 - Math.pow(1 - k, 2.8));
      }
    }
    lcd.refresh();
  }

  function breakApart() {
    broke = true;
    phase = "BREAK";
    machine.position.set(0, 0, 0);
    machine.rotation.set(0, 0, 0);
    power = 0; applyPower();
    workLight.intensity = 1.5;
    FALLFX.visible = false;
    siteMark.visible = false;
    scene.fog.density = 0.085;
    glance = 0;
    camera.near = 0.012; camera.far = 80; camera.updateProjectionMatrix();
    shake = 0.16; flash = 1;                 /* the hit */
    goToGround();                            /* you came down with it */
    hudLeft.textContent = "TAP TO GET UP";
    setTimeout(function () { beginRise(); }, 11500);
    camera.fov = 40; camera.updateProjectionMatrix();
    hudRight.textContent = "ONE STOP SHORT";
    hush();
    AFTER.forEach(function (L) {
      setTimeout(function () { if (phase !== "OPERATION") say(L[0], L[1]); }, L[2]);
    });
    var landed = 0;
    schedule.forEach(function (p, i) {
      moveTo(p, p.downPos, p.downQuat, 0.85 + (i % 4) * 0.09,
             0.34 + (i % 3) * 0.10, (i % 5) * 0.035,
             function (q) {
               q.fitted = false;
               if (++landed === schedule.length) {
                 phase = "ASSEMBLY";
                 if (camMode === "TRACK") { autoFrame = true; retarget(); }
                 hudLeft.textContent = camMode === "FP"
                   ? "TEN PARTS. ONE SCHEDULE. WALK TO THE ONE THAT IS LIFTING."
                   : "GET UP.";
                 assemblyHud();
               }
             });
    });
  }

  function stepIntro(dt) {
    introT += dt;
    var u = Math.min(1, introT / T_IMPACT);
    /* moving when we join it and accelerating from there, rather than starting
       from rest — a pure u-squared drop opens on a stationary object */
    var fall = 0.42 * u + 0.58 * u * u;
    var prevY = machine.position.y;
    machine.position.y = FALL_H * (1 - fall);
    fallSpeed = dt > 0 ? Math.abs(machine.position.y - prevY) / dt : 0;
    machine.rotation.y = 0.62 * (1 - u) + 0.9 * (1 - u) * (1 - u);
    machine.rotation.z = 0.26 * (1 - u) * Math.sin(introT * 2.6);
    machine.rotation.x = 0.20 * (1 - u) * Math.cos(introT * 2.1);
    /* the shadow tightening under it is most of what says how close it is */
    contact.material.opacity = 0.06 + 0.84 * u * u * u;
    var sp = 3.4 - 2.4 * u * u * u;
    contact.scale.set(sp, sp, sp);

    /* the viewer is falling too, and not quite keeping up: the cabinet pulls
       away through the middle of the drop and is caught again at the floor */
    var lag = Math.sin(u * Math.PI) * 0.95;
    orbit.target.set(0, machine.position.y + H * 0.52 + lag, 0);
    orbit.yaw = -0.66 + 0.34 * u + 0.10 * Math.sin(introT * 0.8);
    orbit.pitch = -0.05 + 0.42 * u * u;
    orbit.dist = 4.2 - 1.0 * u;

    /* wider as it accelerates, which reads as speed rather than as zoom */
    camera.fov = 32 + 15 * u * u;
    camera.updateProjectionMatrix();
    shake = 0.006 + 0.030 * u * u;

    glance = glanceAt(introT);
    /* the fog lifts as you come down, so the floor arrives out of the dark
       rather than being permanently hidden by it */
    scene.fog.density = 0.016 + 0.069 * u * u;
    var camY = orbit.target.y + orbit.dist * Math.sin(orbit.pitch);
    stepStreaks(camY, fallSpeed);
    stepSpill(dt, machine.position.y);

    while (fallCue < FALL_LINES.length && introT >= FALL_LINES[fallCue][0]) {
      say(FALL_LINES[fallCue][1], FALL_LINES[fallCue][2]);
      fallCue++;
    }
    stepIntroReels(dt, introT);
    if (introT >= T_IMPACT && !broke) breakApart();
  }

  function skipIntro() {
    if (phase !== "INTRO" && phase !== "BREAK") return;
    FALLFX.visible = false;
    siteMark.visible = false;
    scene.fog.density = 0.085;
    glance = 0;
    camera.near = 0.012; camera.far = 80; camera.updateProjectionMatrix();
    hush();
    setTimeout(function () { say(AFTER[1][0], AFTER[1][1]); }, 500);
    shake = 0; flash = 0;
    camera.fov = 32; camera.updateProjectionMatrix();
    machine.position.set(0, 0, 0); machine.rotation.set(0, 0, 0);
    contact.scale.set(1, 1, 1);
    power = 0; applyPower();
    workLight.intensity = 1.5;
    scatterNow();
    phase = "ASSEMBLY";
    camMode = "FP";
    player.pos.set(1.15, 0, 2.85); faceSite();
    player.eye = EYE_STAND; player.roll = 0; player.pitch = LOOK_FLOOR; player.bob = 0;
    autoFrame = false;
    hudLeft.textContent = "TEN PARTS. ONE SCHEDULE. TAP THE ONE THAT IS LIFTING.";
    assemblyHud();
  }

  /* --------------------------------------------------------------- loop --- */
  var clock = new T.Clock();
  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function stepReels(dt) {
    var busy = false, moved = false;
    for (var i = 0; i < 3; i++) {
      var r = reels[i];
      if (r.phase === 2) continue;
      busy = true; moved = true;
      r.t += dt / r.dur;
      if (r.phase === 0) {
        /* the run-down, over-travelling by a fraction of a symbol */
        if (r.t >= 1) { r.pos = r.to + 0.16; r.phase = 1; r.t = 0; r.dur = 0.30; }
        else r.pos = r.from + (r.to + 0.16 - r.from) * easeOutQuart(r.t);
      } else {
        /* and the snap back onto it, which is the click you can hear */
        if (r.t >= 1) { r.pos = r.to; r.phase = 2; }
        else r.pos = r.to + 0.16 * (1 - easeOutCubic(r.t));
      }
    }
    if (moved) lcd.refresh();
    if (spinning && !busy) { spinning = false; settle(); }
    return busy;
  }

  var instrAcc = 0;
  function frame() {
    var dt = Math.min(0.05, clock.getDelta());
    t0 += dt * 1000;

    if (camMode === "TRACK") {
      orbit.yaw += vYaw; orbit.pitch += vPitch;
      orbit.pitch = Math.max(-0.14, Math.min(0.88, orbit.pitch));
    } else if (camMode === "FP") {
      player.yaw += vYaw; player.pitch += vPitch;
      player.pitch = Math.max(-1.32, Math.min(1.02, player.pitch));
    }
    vYaw *= 0.90; vPitch *= 0.90;
    if (camMode === "RISE") stepRise(dt);
    if (aimPitch !== null && camMode === "FP") {
      player.pitch += (aimPitch - player.pitch) * Math.min(1, 2.6 * dt);
      if (Math.abs(aimPitch - player.pitch) < 0.004) { player.pitch = aimPitch; aimPitch = null; }
    }
    stepPlayer(dt);
    stepCarry(dt);
    applyCamera();

    simT += dt;
    stepVoice();
    if (phase === "INTRO") stepIntro(dt);
    else if (phase === "BREAK") {
      stepAssembly(dt);
      if (camMode === "TRACK") orbit.pitch += (PITCH_BUILD - orbit.pitch) * Math.min(1, 1.6 * dt);
      shake *= Math.pow(0.02, dt);              /* rings down over about a second */
      flash = Math.max(0, flash - dt * 3.2);
      camera.fov += (32 - camera.fov) * Math.min(1, 3 * dt);
      camera.updateProjectionMatrix();
    }
    else if (phase === "ASSEMBLY") { stepAssembly(dt); bobNext(clock.elapsedTime); }
    else if (phase === "COMMISSIONING") { stepAssembly(dt); stepCommission(dt); }
    renderer.toneMappingExposure = 1.02 + flash * 0.55;

    if (autoFrame && camMode === "TRACK") {
      orbit.dist += (wantDist - orbit.dist) * Math.min(1, 1.9 * dt);
      orbit.target.lerp(wantTarget, Math.min(1, 1.9 * dt));
    }

    stepReels(dt);
    stepTokens(dt);

    for (var ai = 0; ai < anims.length; ai++) {
      var a = anims[ai];
      if (Math.abs(a.target - a.v) > 1e-4) {
        a.v += (a.target - a.v) * Math.min(1, a.rate * dt);
        a.apply(a.v);
      }
    }

    /* coherence rebuilds after an observation and never quite reaches one */
    if (!spinning && coherence < 0.97) coherence = Math.min(0.97, coherence + dt * 0.115);

    /* the instrument strip is a canvas: redraw it a few times a second, not
       sixty, because the clock only shows tenths anyway */
    instrAcc += dt;
    if (instrAcc > 0.1) { instrAcc = 0; instr.redraw(); }

    /* a pressed key travels a couple of millimetres and comes back */
    if (pressed) {
      pressT = Math.max(0, pressT - dt * 3.4);
      pressed.position.z = pressed.userData.homeZ - pressT * 0.005;
      if (pressT === 0) pressed = null;
    }

    /* the panel is old and its backlight never quite settles */
    lcd.material.emissiveIntensity = power * (0.42
      + Math.sin(clock.elapsedTime * 13.7) * 0.012
      + Math.sin(clock.elapsedTime * 2.3) * 0.018);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* park the reels on a symbol rather than mid-scroll at load */
  reels.forEach(function (r, i) { r.stop = [0, 3, 5][i]; r.pos = r.stop; });
  lcd.refresh();
  result = reels.map(function (r) { return SPRITES[r.stop].name; });

  applyCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);

  startIntro();

  var load = document.getElementById("loading");
  load.classList.add("gone");
  setTimeout(function () { load.remove(); }, 700);

  window.QA77 = {
    scene: scene, camera: camera, orbit: orbit, renderer: renderer, T: T,
    reels: reels, sprites: SPRITES, symbols: NSYM,
    observe: observe, fit: fitDistance, result: result,
    advance: advance, step: stepNo, stepName: function () { return STEP_NAME[stepNo()]; },
    reframe: function () { reframe(); }, dolly: dolly,
    phase: function () { return phase; }, parts: PARTS, schedule: schedule,
    skipIntro: skipIntro, introTime: function () { return introT; },
    /* straight to a commissioned machine, skipping the fall and the build */
    jumpToOperation: function () {
      skipIntro();
      schedule.forEach(function (p) {
        p.anim = null;
        p.group.position.copy(p.fitPos);
        p.group.quaternion.copy(p.fitQuat);
        p.fitted = true;
      });
      nextPart = schedule.length;
      phase = "OPERATION";
      power = 1; applyPower();
      hush();
      camMode = "FP"; autoFrame = false;
      player.pos.set(0.10, 0, 1.35); faceSite();
      player.eye = EYE_STAND; player.roll = 0; player.pitch = LOOK_MACHINE; player.bob = 0;
      hudLeft.textContent = idleHint();
      showStep();
    },
    fallSpeed: function () { return fallSpeed; },
    camMode: function () { return camMode; }, player: player,
    rise: function () { beginRise(); },
    walkTo: function (x, z) { walkTo(new T.Vector3(x, 0, z)); },
    said: function () { return sayEl.classList.contains("on") ? sayEl.textContent : ""; },
    nextPart: function () { return nextPart; },
    fitNext: function () {
      if (carrying) tryPlace();
      else if (nextPart < schedule.length) tapPart(schedule[nextPart]);
    },
    carrying: function () { return carrying ? carrying.name : null; },
    place: function () { tryPlace(); },
    tryFit: function (name) { if (byName[name]) tryFitPart(byName[name]); },
    power: function () { return power; },
    interlock: ILK, doStep: doStep, message: function () { return msg; },
    tokens: tokens, dispense: dispenseToken, surrender: surrenderTokens,
    tokensIssued: function () { return tokensIssued; },
    classes: CLASSES, issuedByClass: function () { return issuedByClass.slice(); },
    tokensAtRest: function () { return tokens.filter(function (m) { return m.userData.rest; }).length; },
    spinning: function () { return spinning; },
    register: function () { return { obs: obsCount, match: matchCount,
                                     coherence: coherence, seconds: t0 / 1000 }; }
  };
})();

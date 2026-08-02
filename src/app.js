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

  var camera = new T.PerspectiveCamera(32, 1, 0.05, 60);

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

  /* ------------------------------------------------------------ printing -- */
  var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
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

  var bodyH = H - 0.10;
  var body = slab(W, bodyH, D, 0.012, 0.008, paint);
  body.position.y = 0.10 + bodyH / 2;
  machine.add(body);

  var plinth = slab(W * 0.97, 0.10, D * 0.96, 0.010, 0.005, paintDark);
  plinth.position.y = 0.05;
  machine.add(plinth);

  /* the polished corner posts, which is what catches the light on the original
     and reads as a machine with an edge rather than a rendered cuboid */
  [-1, 1].forEach(function (s) {
    var post = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, H - 0.02, 20, 1, false,
      -Math.PI * 0.10, Math.PI * 1.20), steel);
    post.position.set(s * (W / 2 - 0.014), H / 2, FZ - 0.014);
    post.rotation.y = s > 0 ? -Math.PI * 0.30 : Math.PI * 0.30;
    post.castShadow = true;
    machine.add(post);
  });

  /* the top: a vent grille across it and a bright strip along the front edge */
  for (var tg = 0; tg < 11; tg++) {
    var slot = box(W * 0.74, 0.008, 0.009, cavity);
    slot.position.set(0, H - 0.003, FZ - 0.075 - tg * 0.026);
    machine.add(slot);
  }
  var topLip = box(W * 0.99, 0.012, 0.014, steelDim);
  topLip.position.set(0, H - 0.008, FZ - 0.006);
  machine.add(topLip);

  /* ------------------------------------------------------- the front face -- */
  /* Laid out from the top down in the proportions of the original: header
     plate, two state windows, the display, the instrument strip, the message
     line, the controls, the notice, the two mouths, the service panel. */
  function at(y) { return y; }
  var PW = W * 0.93;                        /* the width the plates run to */

  function plate(w, h, cy, cw, ch, draw, glow, frame) {
    var p = livePanel(w, h, cw, ch, draw, glow);
    p.position.set(0, cy, FZ + 0.0015);
    machine.add(p);
    if (frame !== false) {
      var f = ring(w + 0.022, h + 0.022, w, h, 0.008, 0.003, 0.010, 0.003, steelDim);
      f.position.set(0, cy, FZ + 0.004);
      machine.add(f);
    }
    return p;
  }

  /* ---- the header ---- */
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
    machine.add(p);
    return p;
  }
  var stateY = 1.532, swW = PW * 0.478;
  var swState = stateWindow(-(PW / 2 - swW / 2), swW, stateY, "STATE: SUPERPOSED");
  var swMatter = stateWindow((PW / 2 - swW / 2), swW, stateY, "NO MATTER PENDING");

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
  machine.add(lcd);

  /* the display is recessed: a dark surround, a steel bezel and a pane */
  var lcdWell = ring(lcdW + 0.052, lcdH + 0.052, lcdW, lcdH, 0.010, 0.005, 0.014, 0.004, paintDark);
  lcdWell.position.set(0, lcdY, FZ + 0.005);
  machine.add(lcdWell);
  var lcdBezel = ring(lcdW + 0.062, lcdH + 0.062, lcdW + 0.040, lcdH + 0.040,
                      0.012, 0.008, 0.012, 0.004, steelDim);
  lcdBezel.position.set(0, lcdY, FZ + 0.008);
  machine.add(lcdBezel);
  var pane = new T.Mesh(new T.PlaneGeometry(lcdW + 0.038, lcdH + 0.038),
    new T.MeshPhysicalMaterial({
      color: 0x9BA0A4, roughness: 0.035, metalness: 0.0,
      clearcoat: 1.0, clearcoatRoughness: 0.02,
      transparent: true, opacity: 0.075, depthWrite: false
    }));
  pane.position.set(0, lcdY, FZ + 0.011);
  machine.add(pane);

  /* ---- the instrument strip ---- */
  var obsCount = 0, matchCount = 0, coherence = 1, t0 = 0;
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

  /* ---- the controls ---- */
  /* A band across the front, not a sloping deck. The original has no lever:
     the wide OBSERVE bar is the thing you press, and the three dark keys sit
     to the right of it. */
  var ctlY = 0.775;
  var ctlWell = box(PW, 0.108, 0.012, paintDark);
  ctlWell.position.set(0, ctlY, FZ - 0.002);
  machine.add(ctlWell);

  function frontKey(cx, w, h, mat, label, ink) {
    var k = slab(w, h, 0.026, 0.008, 0.004, mat);
    k.position.set(cx, ctlY, FZ + 0.012);
    machine.add(k);
    var lp = livePanel(w * 0.92, h * 0.5, 480, 130, function (x, cw, ch) {
      x.clearRect(0, 0, cw, ch);
      x.fillStyle = ink;
      x.textBaseline = "middle";
      x.font = "700 " + (label.length > 6 ? 44 : 56) + "px " + MONO;
      tracked(x, label, cw / 2, ch / 2 + 2, 6, "center");
    }, 0.16);
    lp.material.transparent = true;
    lp.position.set(cx, ctlY, FZ + 0.0255);
    machine.add(lp);
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
  machine.add(obsLegend);

  /* the sound toggle and its tiny labels, far right of the band */
  var toggle = box(0.012, 0.028, 0.014, steelDim);
  toggle.position.set(PW * 0.468, ctlY + 0.008, FZ + 0.008);
  machine.add(toggle);

  var ctlReveal = box(PW, 0.004, 0.010, paintDark);
  ctlReveal.position.set(0, ctlY - 0.078, FZ - 0.001);
  machine.add(ctlReveal);

  /* ---- the notice rail ---- */
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
    machine.add(recess);
    var lipTop = box(w + 0.016, 0.008, 0.016, steelDim);
    lipTop.position.set(cx, cy + 0.019, FZ + 0.003);
    machine.add(lipTop);
    var lipBot = box(w + 0.016, 0.008, 0.016, steelDim);
    lipBot.position.set(cx, cy - 0.019, FZ + 0.003);
    machine.add(lipBot);
    var lab = livePanel(w, 0.017, 620, 38, function (x, cw, ch) {
      x.clearRect(0, 0, cw, ch);
      x.fillStyle = "#7E848A";
      x.textBaseline = "middle"; x.font = "500 22px " + MONO;
      tracked(x, label, 4, ch / 2 + 1, 3, "left");
    }, 0.20);
    lab.material.transparent = true;
    lab.position.set(cx, cy + (above ? 0.034 : -0.034), FZ + 0.0025);
    machine.add(lab);
  }
  mouth(-PW * 0.24, PW * 0.42, 0.478, "DETERMINATION RECORD", true);
  mouth( PW * 0.26, PW * 0.38, 0.470, "CLAIM / RECORD TRAY", false);

  /* ---- the service panel across the belly ---- */
  var bellyY = 0.238, bellyH = 0.272;
  var belly = plate(PW, bellyH, bellyY, 1400, 640, function (x, w, h) {
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
  machine.add(bellyFrame);

  var bellyLock = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 0.012, 18), steel);
  bellyLock.rotation.x = Math.PI / 2;
  bellyLock.position.set(-PW * 0.455, bellyY + bellyH * 0.11, FZ + 0.006);
  bellyLock.castShadow = true;
  machine.add(bellyLock);

  /* the grille across the plinth */
  for (var pg = 0; pg < 26; pg++) {
    var pslot = box(0.006, 0.030, 0.012, cavity);
    pslot.position.set(-W * 0.42 + pg * (W * 0.84 / 25), 0.055, D / 2 * 0.96 + 0.002);
    machine.add(pslot);
  }

  /* --------------------------------------------------------- the flanks --- */
  [-1, 1].forEach(function (s) {
    var fx = s * (W / 2 - 0.003);
    /* the recessed carry bracket, which is the one feature on the side of the
       original that exists for a person rather than for the machine */
    var bracket = ring(0.070, 0.230, 0.040, 0.180, 0.012, 0.008, 0.030, 0.006, paintDark);
    bracket.rotation.y = s * Math.PI / 2;
    bracket.position.set(s * (W / 2 + 0.011), 0.98, -D * 0.06);
    machine.add(bracket);
    var bar = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.185, 14), steelDim);
    bar.position.set(s * (W / 2 + 0.016), 0.98, -D * 0.06);
    bar.castShadow = true;
    machine.add(bar);

    for (var lv = 0; lv < 12; lv++) {
      var lo = box(0.012, 0.010, D * 0.34, cavity);
      lo.position.set(fx, 0.42 + lv * 0.026, -D * 0.16);
      machine.add(lo);
    }
    var vseam = box(0.010, H * 0.80, 0.005, paintDark);
    vseam.position.set(fx, H * 0.47, D * 0.34);
    machine.add(vseam);
  });

  /* ----------------------------------------------------------- the back --- */
  var backZ = -D / 2;
  function onBack(w, h, d, cx, cy, mat) {
    var m = box(w, h, d, mat);
    m.position.set(cx, cy, backZ - d / 2 + 0.004);
    machine.add(m);
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
  machine.add(latch);
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
  machine.add(dataPlate);

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
    new T.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }));
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

  /* ============================== behaviour ================================ */
  var hudLeft = document.getElementById("hudLeft");
  var hudRight = document.getElementById("hudRight");
  var spinning = false, pressed = null, pressT = 0;
  var result = [SPRITES[0].name, SPRITES[0].name, SPRITES[0].name];

  function idleHint() {
    return window.innerWidth < 560
      ? "Drag · pinch · press OBSERVE"
      : "Drag to orbit · scroll to dolly · press OBSERVE";
  }
  function setMessage(s) { msg = s; msgLine.redraw(); }
  function setState(a, b) { swState.set(a); swMatter.set(b); }

  function observe() {
    if (spinning) return;
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
  }

  /* click, but only if the pointer did not travel — otherwise every orbit drag
     that happens to end on a key would also press it */
  var ray = new T.Raycaster(), ndc = new T.Vector2();
  var hitTargets = [observeKey, burstKey, resetKey, fileKey];
  function pick(e) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(hitTargets, false);
    return hits.length ? hits[0].object : null;
  }
  function press(obj) {
    if (obj === observeKey) return observe();
    pressed = obj; pressT = 1;
    if (obj === burstKey) setMessage("BURST IS DISABLED WHILE THE APPARATUS IS UNATTENDED.");
    if (obj === resetKey) {
      obsCount = 0; matchCount = 0;
      setMessage("REGISTER CLEARED. THE SESSION CLOCK IS NOT CLEARED.");
    }
    if (obj === fileKey) setMessage("NO MATTER IS PENDING. NOTHING TO FILE.");
  }

  /* ------------------------------------------------------------- camera --- */
  /* An orbit controller written out rather than imported: it is forty lines,
     and the examples bundle is another download this page cannot make. */
  var orbit = { yaw: -0.34, pitch: 0.14, dist: 3.2, target: new T.Vector3(0, H * 0.5, 0) };
  var vYaw = 0, vPitch = 0, dragging = false, lastX = 0, lastY = 0, travel = 0;

  /* Frame the machine rather than sit at a fixed distance. A hard-coded number
     happens to fit a square window and crops everything else — a phone in
     portrait most of all, where the horizontal field is a third of the vertical
     one. This projects the eight corners of the bounding box and takes the
     distance at which the last of them fits. */
  var fitBox = new T.Box3().setFromObject(machine);
  orbit.target.set(0, (fitBox.min.y + fitBox.max.y) / 2, 0);
  var fitCorners = [];
  for (var ci = 0; ci < 8; ci++) {
    fitCorners.push(new T.Vector3(
      ci & 1 ? fitBox.max.x : fitBox.min.x,
      ci & 2 ? fitBox.max.y : fitBox.min.y,
      ci & 4 ? fitBox.max.z : fitBox.min.z
    ).sub(orbit.target));
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
  function applyCamera() {
    var cp = Math.cos(orbit.pitch), sp = Math.sin(orbit.pitch);
    camera.position.set(
      orbit.target.x + orbit.dist * cp * Math.sin(orbit.yaw),
      orbit.target.y + orbit.dist * sp,
      orbit.target.z + orbit.dist * cp * Math.cos(orbit.yaw)
    );
    camera.lookAt(orbit.target);
  }
  function dolly(scale) {
    var f = fitDistance();
    orbit.dist = Math.max(f * 0.30, Math.min(f * 2.2, orbit.dist * scale));
  }

  /* Pointers are tracked by id rather than with a single dragging flag, because
     a wheel is not the only way to get closer: on a touchscreen there is none,
     and without a pinch the machine is stuck at whatever distance frames it. */
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
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    travel += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX; lastY = e.clientY;
    vYaw = -dx * 0.0055; vPitch = -dy * 0.0045;
  });
  function endDrag(e) {
    if (e) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchWas = 0;
    if (pointers.size > 0) return;
    if (dragging && travel < 6 && e) {
      var hit = pick(e);
      if (hit) press(hit);
    }
    dragging = false; canvas.classList.remove("dragging");
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    dolly(1 + e.deltaY * 0.0011);
  }, { passive: false });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); observe(); }
  });

  /* ------------------------------------------------------------- resize --- */
  var framed = false;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    var before = framed ? fitDistance() : 0;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var after = fitDistance();
    orbit.dist = framed ? orbit.dist * (after / before) : after;
    framed = true;
    if (!spinning) hudLeft.textContent = idleHint();
  }
  window.addEventListener("resize", resize);
  resize();

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

    orbit.yaw += vYaw; orbit.pitch += vPitch;
    vYaw *= 0.90; vPitch *= 0.90;
    orbit.pitch = Math.max(-0.14, Math.min(0.88, orbit.pitch));
    applyCamera();

    stepReels(dt);

    /* coherence rebuilds after an observation and never quite reaches one */
    if (!spinning && coherence < 0.97) coherence = Math.min(0.97, coherence + dt * 0.115);

    /* the instrument strip is a canvas: redraw it a few times a second, not
       sixty, because the clock only shows tenths anyway */
    instrAcc += dt;
    if (instrAcc > 0.1) { instrAcc = 0; instr.redraw(); }

    /* a pressed key travels a couple of millimetres and comes back */
    if (pressed) {
      pressT = Math.max(0, pressT - dt * 3.4);
      pressed.position.z = FZ + 0.012 - pressT * 0.005;
      if (pressT === 0) pressed = null;
    }

    /* the panel is old and its backlight never quite settles */
    lcd.material.emissiveIntensity = 0.42
      + Math.sin(clock.elapsedTime * 13.7) * 0.012
      + Math.sin(clock.elapsedTime * 2.3) * 0.018;

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

  hudLeft.textContent = idleHint();
  hudRight.textContent = result.join(" / ");

  var load = document.getElementById("loading");
  load.classList.add("gone");
  setTimeout(function () { load.remove(); }, 700);

  window.QA77 = {
    scene: scene, camera: camera, orbit: orbit, renderer: renderer, T: T,
    reels: reels, sprites: SPRITES, symbols: NSYM,
    observe: observe, fit: fitDistance, result: result,
    spinning: function () { return spinning; },
    register: function () { return { obs: obsCount, match: matchCount,
                                     coherence: coherence, seconds: t0 / 1000 }; }
  };
})();

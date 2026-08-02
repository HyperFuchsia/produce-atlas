/* ============================================================================
   QA-77 — the apparatus, as actual geometry.

   Everything before this was painted onto flat DOM: gradients standing in for
   form, blurred ellipses standing in for shadow. It fought back every time,
   because a drawing of a box is not a box. This is a real scene — meshes,
   physical materials, lights that cast, a camera you move — so the machine is
   right because it is genuinely three-dimensional, not because the shading was
   tuned until it nearly looked it.

   The reels in particular are the reason for the rebuild. A slot machine's
   reels are cylinders seen through a hole, and about a third of what makes one
   legible is the curvature: symbols compress toward the top and bottom of the
   window and only the middle row is square-on. That is not something you can
   fake with a scrolling list, which is what every previous attempt was.

   Units are metres. The reference cabinet is 74 x 30 x 26 inches.
   ========================================================================== */
(function () {
  "use strict";

  var T = THREE;
  var IN = 0.0254;                       /* one inch */
  var W = 30 * IN, H = 74 * IN, D = 26 * IN;
  var TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- stage -- */
  var canvas = document.getElementById("scene");
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  var scene = new T.Scene();
  scene.background = new T.Color(0x07080B);
  scene.fog = new T.FogExp2(0x07080B, 0.085);

  /* An environment. Physical materials are mostly reflection, and without
     something to reflect they come out as flat lambert no matter how many
     lights are added — which is exactly what the CSS version could never fix.
     This is a painted equirect: cool sky, a warm softbox high on the left, a
     dim floor bounce, run through PMREM so the roughness terms are right. */
  (function () {
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    var x = c.getContext("2d");
    var sky = x.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0.00, "#2A3550");
    sky.addColorStop(0.42, "#161C28");
    sky.addColorStop(0.52, "#0C0F14");
    sky.addColorStop(1.00, "#05060A");
    x.fillStyle = sky; x.fillRect(0, 0, 1024, 512);
    function blob(cx, cy, r, col, a) {
      var g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
      x.globalAlpha = a; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
      x.globalAlpha = 1;
    }
    blob(300, 120, 210, "#FFF4DE", 1.0);      /* the key softbox */
    blob(760, 190, 165, "#9FC0FF", 0.80);     /* cool source behind right */
    blob(120, 300, 140, "#7E93C8", 0.35);     /* a second, lower and left */
    blob(520, 470, 320, "#2C3348", 0.5);      /* floor bounce */
    var tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.colorSpace = T.SRGBColorSpace;
    var pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
  })();

  var camera = new T.PerspectiveCamera(34, 1, 0.05, 60);

  /* ------------------------------------------------------------ materials -- */
  /* Painted steel. Clearcoat is what makes it read as sprayed and lacquered
     rather than as raw plastic — it puts a second, tighter specular over the
     broad diffuse one. */
  var paint = new T.MeshPhysicalMaterial({
    color: 0x474D52, roughness: 0.36, metalness: 0.25,
    clearcoat: 0.62, clearcoatRoughness: 0.20
  });
  var paintDark = new T.MeshPhysicalMaterial({
    color: 0x1B1F22, roughness: 0.5, metalness: 0.2,
    clearcoat: 0.4, clearcoatRoughness: 0.35
  });
  var cavity = new T.MeshStandardMaterial({          /* inside the reel bay */
    color: 0x0B0D10, roughness: 0.92, metalness: 0.0
  });
  var chrome = new T.MeshPhysicalMaterial({
    color: 0xD6DCE2, roughness: 0.13, metalness: 1.0
  });
  var chromeDim = new T.MeshPhysicalMaterial({
    color: 0x8B9299, roughness: 0.3, metalness: 1.0
  });
  var brass = new T.MeshPhysicalMaterial({
    color: 0xC8AE72, roughness: 0.26, metalness: 0.9
  });
  var rubber = new T.MeshPhysicalMaterial({
    color: 0x121517, roughness: 0.85, metalness: 0.0
  });
  var rimMat = new T.MeshPhysicalMaterial({
    color: 0x23282D, roughness: 0.45, metalness: 0.6
  });

  /* ------------------------------------------------------------- geometry -- */
  /* A cabinet has no sharp edges anywhere — every one is broken by a radius,
     and that radius catching the light is most of what says "made object".
     Extruding a rounded rectangle with a bevel gives rounded verticals and a
     broken front edge in one geometry. */
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
      bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 14
    });
    g.translate(0, 0, -(d - bevel * 2) / 2);
    return g;
  }
  function slab(w, h, d, r, bevel, mat) {
    bevel = bevel === undefined ? 0.010 : bevel;
    var m = new T.Mesh(extrude(roundedPath(w, h, r || 0.02), d, bevel), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function box(w, h, d, mat) {
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  /* ------------------------------------------------------------- the room -- */
  var floorMat = new T.MeshPhysicalMaterial({
    color: 0x12151A, roughness: 0.24, metalness: 0.1,
    clearcoat: 1.0, clearcoatRoughness: 0.16
  });
  var floor = new T.Mesh(new T.CircleGeometry(14, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* --------------------------------------------------------- the cabinet -- */
  var machine = new T.Group();
  scene.add(machine);

  var bodyH = H * 0.60;
  var topH  = H * 0.34;

  /* the body: one tall slab, standing on the floor */
  var body = slab(W, bodyH, D, 0.030, 0.012, paint);
  body.position.y = bodyH / 2;
  machine.add(body);

  /* the kick plate the whole thing stands on */
  var plinth = slab(W * 0.94, 0.11, D * 0.9, 0.014, 0.006, paintDark);
  plinth.position.y = 0.055;
  machine.add(plinth);

  /* -------------------------------------------------------------- the head -- */
  /* Not a solid block with a picture on the front: an assembly with an actual
     rectangular hole in it, because the drums have to live somewhere and you
     have to be able to see into the bay past the edges of the opening. */
  var headW = W * 0.96, headD = D * 0.82;
  var headZF = -D * 0.06 + headD / 2;          /* front plane of the head */
  var headZB = headZF - headD;
  var headTopY = bodyH + topH;

  var STOPS = 11;
  var drumR = 0.155;
  var pitch = (TAU * drumR) / STOPS;           /* one symbol, along the arc */

  var winW = W * 0.78, winH = pitch * 3;       /* the window shows three rows */
  var winCY = bodyH + topH * 0.40;
  var winBot = winCY - winH / 2, winTop = winCY + winH / 2;

  /* The front is ONE piece with a hole in it, not four panels arranged around a
     gap. Built the other way the seams land on the face of the machine and the
     head reads as a stack of trays; built this way every joint in the carcass
     behind it is hidden by a single continuous rounded front. */
  var fasciaT = 0.055;
  var headCY = bodyH + topH / 2;
  var fasciaShape = roundedPath(headW, topH, 0.028);
  fasciaShape.holes.push(roundedPath(winW, winH, 0.010, T.Path, 0, winCY - headCY));
  var fascia = new T.Mesh(extrude(fasciaShape, fasciaT, 0.010), paint);
  fascia.position.set(0, headCY, headZF - fasciaT / 2);
  fascia.castShadow = true; fascia.receiveShadow = true;
  machine.add(fascia);

  /* the carcass behind it, which nobody ever sees the joints of */
  var carcZF = headZF - fasciaT, carcD = headD - fasciaT;
  var bayD = 0.40;                             /* how deep the drums sit */
  function carcass(w, h, d, cx, cy, cz, rounded) {
    var m = rounded ? slab(w, h, d, 0.026, 0.010, paint) : box(w, h, d, paint);
    m.position.set(cx, cy, cz);
    machine.add(m);
    return m;
  }
  carcass(headW, headTopY - winTop, carcD, 0, (headTopY + winTop) / 2, carcZF - carcD / 2, true);
  carcass(headW, winBot - bodyH, carcD, 0, (winBot + bodyH) / 2, carcZF - carcD / 2, true);
  var postW = (headW - winW) / 2;
  carcass(postW, winH, carcD, -(winW + postW) / 2, winCY, carcZF - carcD / 2, false);
  carcass(postW, winH, carcD,  (winW + postW) / 2, winCY, carcZF - carcD / 2, false);
  carcass(winW, winH, carcD - bayD, 0, winCY, carcZF - bayD - (carcD - bayD) / 2, false);

  /* line the bay so no painted steel shows behind the drums */
  var liner = new T.Mesh(new T.BoxGeometry(winW + 0.004, winH + 0.004, bayD), cavity);
  liner.geometry.scale(-1, -1, -1);            /* inside-out: we see its interior */
  liner.position.set(0, winCY, carcZF - bayD / 2);
  machine.add(liner);

  /* the control deck: a wedge sloping toward the player */
  var deckD = D * 0.46, deckH = 0.075, deckTilt = 0.42;
  var deck = slab(W * 0.99, deckD, deckH, 0.020, 0.008, paint);
  deck.rotation.x = -Math.PI / 2 + deckTilt;   /* a real 24 degree slope */
  deck.position.set(0, bodyH + 0.028, D * 0.30);
  machine.add(deck);

  /* --------------------------------------------------------- reel strips -- */
  /* The strip is drawn sideways. The drum's texture u runs around the
     circumference and its v runs along the axis, so on the front face canvas
     +x reads as up the screen and canvas +y reads as across to the right —
     hence the quarter turn before every glyph. Getting this wrong gives you
     symbols lying on their sides, which is how the first attempt looked. */
  var CELL_A = 192;                        /* px along the arc, per stop */
  var CELL_X = Math.round(CELL_A * 2.10);  /* px across the drum */

  var SYMBOLS = [
    { name: "RING",   ink: "#1E3F8C" },
    { name: "WEDGE",  ink: "#B87316" },
    { name: "BLOCK",  ink: "#8E1B24" },
    { name: "NULL",   ink: "#2A2E33" },
    { name: "WAVE",   ink: "#16706B" },
    { name: "STAR",   ink: "#5A2E86" },
    { name: "BAR",    ink: "#14171A" }
  ];

  function drawGlyph(x, kind, ink) {
    /* drawn into a CELL_X by CELL_A box, upright, centred */
    var cx = CELL_X / 2, cy = CELL_A / 2, s = CELL_A * 0.36;
    x.strokeStyle = ink; x.fillStyle = ink;
    x.lineWidth = CELL_A * 0.105; x.lineCap = "round"; x.lineJoin = "round";
    if (kind === 0) {                                   /* RING */
      x.beginPath(); x.arc(cx, cy, s, 0, TAU); x.stroke();
    } else if (kind === 1) {                            /* WEDGE */
      x.beginPath();
      x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.92, cy + s * 0.7);
      x.lineTo(cx - s * 0.92, cy + s * 0.7); x.closePath(); x.fill();
    } else if (kind === 2) {                            /* BLOCK */
      var r = s * 0.86;
      x.beginPath(); x.rect(cx - r, cy - r, r * 2, r * 2); x.fill();
    } else if (kind === 3) {                            /* NULL */
      x.beginPath(); x.arc(cx, cy, s, 0, TAU); x.stroke();
      x.beginPath();
      x.moveTo(cx - s * 0.72, cy + s * 0.72);
      x.lineTo(cx + s * 0.72, cy - s * 0.72); x.stroke();
    } else if (kind === 4) {                            /* WAVE */
      x.beginPath();
      x.moveTo(cx - s, cy);
      x.bezierCurveTo(cx - s * 0.5, cy - s * 0.95, cx - s * 0.1, cy + s * 0.95, cx + s * 0.35, cy);
      x.bezierCurveTo(cx + s * 0.6, cy - s * 0.5, cx + s * 0.8, cy - s * 0.35, cx + s, cy - s * 0.2);
      x.stroke();
    } else if (kind === 5) {                            /* STAR */
      x.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = (i / 6) * Math.PI;
        x.moveTo(cx - Math.cos(a) * s, cy - Math.sin(a) * s);
        x.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
      }
      x.stroke();
    } else {                                            /* BAR */
      x.fillRect(cx - s * 1.15, cy - s * 0.42, s * 2.3, s * 0.84);
      x.fillStyle = "#F3EFE2";
      x.fillRect(cx - s * 1.15, cy - s * 0.08, s * 2.3, s * 0.16);
    }
  }

  function stripTexture(order) {
    var c = document.createElement("canvas");
    c.width = CELL_A * STOPS; c.height = CELL_X;
    var x = c.getContext("2d");
    /* Not white. A reel strip is the brightest surface on the machine and the
       key light hits it square on, so paper at full value clips to a flat slab
       with no tone in it at all — which is what the window looked like. */
    x.fillStyle = "#D9D2BF"; x.fillRect(0, 0, c.width, c.height);
    /* the faint tone the paper of a real strip has, and its edge printing */
    var g = x.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, "rgba(120,110,90,.20)");
    g.addColorStop(0.14, "rgba(120,110,90,0)");
    g.addColorStop(0.86, "rgba(120,110,90,0)");
    g.addColorStop(1, "rgba(120,110,90,.20)");
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);

    for (var i = 0; i < STOPS; i++) {
      x.save();
      x.translate((i + 1) * CELL_A, 0);
      x.rotate(Math.PI / 2);                  /* now drawing upright on screen */
      /* the hairline between stops */
      x.strokeStyle = "rgba(60,55,45,.30)"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, 0.5); x.lineTo(CELL_X, 0.5); x.stroke();
      var sym = SYMBOLS[order[i]];
      drawGlyph(x, order[i], sym.ink);
      /* the stop number, printed small at the edge as they are on real strips */
      x.fillStyle = "rgba(60,55,45,.42)";
      x.font = "600 " + Math.round(CELL_A * 0.14) + "px ui-monospace, monospace";
      x.textAlign = "left"; x.textBaseline = "middle";
      x.fillText(String(i + 1).padStart(2, "0"), CELL_X * 0.075, CELL_A / 2);
      x.restore();
    }
    var tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.wrapS = T.RepeatWrapping;
    return tex;
  }

  /* Three different orders, so the drums are not obviously the same object
     three times over — which is exactly what you notice first if they are. */
  var ORDERS = [
    [0, 6, 2, 4, 1, 6, 3, 0, 5, 6, 2],
    [6, 1, 0, 3, 6, 5, 2, 6, 4, 1, 0],
    [2, 6, 4, 0, 6, 1, 5, 3, 6, 0, 4]
  ];

  /* ------------------------------------------------------------ the drums -- */
  var drumW = 0.186, drumGap = 0.010;
  var drums = [];
  for (var d0 = 0; d0 < 3; d0++) {
    var tex = stripTexture(ORDERS[d0]);
    var side = new T.MeshStandardMaterial({
      map: tex, emissive: 0xFFFFFF, emissiveMap: tex, emissiveIntensity: 0.05,
      roughness: 0.72, metalness: 0.0
    });
    var endMat = new T.MeshPhysicalMaterial({
      color: 0x1C2024, roughness: 0.42, metalness: 0.7
    });
    var g = new T.CylinderGeometry(drumR, drumR, drumW, 96, 1, false);
    g.rotateZ(Math.PI / 2);                    /* axis along X; spin is rotation.x */
    var m = new T.Mesh(g, [side, endMat, endMat]);
    m.castShadow = false; m.receiveShadow = true;
    m.position.set((d0 - 1) * (drumW + drumGap), winCY, carcZF - drumR - 0.012);
    machine.add(m);

    /* the rims that hold the strip on. Dark: in chrome they read as two big
       bright arcs floating in the window rather than as the edge of a drum. */
    for (var e = -1; e <= 1; e += 2) {
      var rim = new T.Mesh(new T.TorusGeometry(drumR + 0.001, 0.0035, 8, 64), rimMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.set(m.position.x + e * drumW / 2, m.position.y, m.position.z);
      machine.add(rim);
    }
    drums.push({ mesh: m, angle: 0, from: 0, to: 0, t: 1, dur: 1, phase: 2, stop: 0 });
  }
  /* the dividers between drums, which is how you read three reels as three */
  for (var dv = -1; dv <= 1; dv += 2) {
    var bar = box(0.009, winH, 0.030, paintDark);
    bar.position.set(dv * (drumW + drumGap) / 2, winCY, carcZF - 0.016);
    machine.add(bar);
  }

  /* --------------------------------------------------------- window glass -- */
  var bezelShape = roundedPath(winW + 0.050, winH + 0.050, 0.016);
  bezelShape.holes.push(roundedPath(winW, winH, 0.010, T.Path));
  var bezel = new T.Mesh(extrude(bezelShape, 0.026, 0.006), chromeDim);
  bezel.position.set(0, winCY, headZF + 0.006);
  bezel.castShadow = true;
  machine.add(bezel);

  /* Not a transmissive material: at this thickness refraction buys nothing and
     the haze it adds washes out the strips. What sells glass here is a single
     tight reflection of the environment, which a thin clearcoated pane gives. */
  var glass = new T.Mesh(new T.PlaneGeometry(winW, winH), new T.MeshPhysicalMaterial({
    color: 0x9FB4C6, roughness: 0.035, metalness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.02,
    transparent: true, opacity: 0.085, depthWrite: false
  }));
  glass.position.set(0, winCY, headZF + 0.004);
  machine.add(glass);

  /* the payline, printed on the glass at the middle row */
  var payline = new T.Mesh(new T.PlaneGeometry(winW * 0.99, 0.0022),
    new T.MeshStandardMaterial({ color: 0xC8402F, emissive: 0xC8402F,
      emissiveIntensity: 0.55, transparent: true, opacity: 0.8, depthWrite: false }));
  payline.position.set(0, winCY, headZF + 0.005);
  machine.add(payline);

  /* The bay's own light, behind the top of the opening and aimed in. These
     numbers look absurdly small next to the directional lights, and they are
     not: point lights fall off with the square of distance, and these sit four
     centimetres from the paper. At 0.30 the strips received thirty times the
     key's illuminance and the whole window clipped to a flat white slab. */
  var bayLightA = new T.PointLight(0xFFEFD4, 0.022, 0.9, 2);
  bayLightA.position.set(-0.13, winTop - 0.012, carcZF - 0.04);
  machine.add(bayLightA);
  var bayLightB = new T.PointLight(0xFFEFD4, 0.022, 0.9, 2);
  bayLightB.position.set(0.13, winTop - 0.012, carcZF - 0.04);
  machine.add(bayLightB);
  var bayFill = new T.PointLight(0xB9CCF0, 0.012, 0.8, 2);
  bayFill.position.set(0, winBot + 0.012, carcZF - 0.04);
  machine.add(bayFill);

  /* -------------------------------------------------------- printed panels -- */
  function textureFrom(w, h, paintFn) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    paintFn(c.getContext("2d"), w, h);
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function litPanel(w, h, tex, strength) {
    return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({
      map: tex, emissive: 0xFFFFFF, emissiveMap: tex, emissiveIntensity: strength,
      roughness: 0.35, metalness: 0
    }));
  }

  /* The marquee. Dark ground with pale lettering, not the reverse: a backlit
     sign that is mostly light surface has no headroom left before it clips, and
     the first version came out as a featureless white rectangle for exactly
     that reason. Ink on dark keeps the type legible at any exposure. */
  var marqueeTex = textureFrom(1600, 440, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#16203A"); g.addColorStop(0.5, "#1D2A48"); g.addColorStop(1, "#101728");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var glow = x.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.52);
    glow.addColorStop(0, "rgba(120,160,235,.30)"); glow.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = glow; x.fillRect(0, 0, w, h);
    x.strokeStyle = "#C8AE72"; x.lineWidth = 5;
    x.strokeRect(26, 26, w - 52, h - 52);
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "#F2ECDC";
    x.font = "700 156px ui-monospace, Menlo, monospace";
    x.fillText("QA·77", w / 2, h * 0.40);
    x.font = "500 42px ui-monospace, Menlo, monospace";
    x.fillStyle = "#9FB2D6";
    x.fillText("QUANTUM  DETERMINATION  APPARATUS", w / 2, h * 0.70);
    x.fillStyle = "#C8402F";
    x.fillRect(w * 0.38, h * 0.81, w * 0.24, 5);
  });
  var marqueeH = topH * 0.30, marqueeW = headW * 0.86;
  var marquee = litPanel(marqueeW, marqueeH, marqueeTex, 1.05);
  marquee.position.set(0, bodyH + topH * 0.80, headZF + 0.0015);
  machine.add(marquee);
  var mfShape = roundedPath(marqueeW + 0.034, marqueeH + 0.034, 0.014);
  mfShape.holes.push(roundedPath(marqueeW, marqueeH, 0.008, T.Path));
  var marqueeFrame = new T.Mesh(extrude(mfShape, 0.018, 0.005), chromeDim);
  marqueeFrame.position.set(0, marquee.position.y, headZF + 0.005);
  machine.add(marqueeFrame);
  var marqueeLight = new T.PointLight(0xBFD0F5, 0.055, 1.5, 2);
  marqueeLight.position.set(0, marquee.position.y, headZF + 0.18);
  machine.add(marqueeLight);

  /* the belly notice rail: the small print no one reads */
  var railTex = textureFrom(1600, 120, function (x, w, h) {
    x.fillStyle = "#DFD8C4"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#20242E";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "500 46px ui-monospace, Menlo, monospace";
    x.fillText("NO OUTCOME IS LUCK · EVERY OUTCOME IS MEASURED", w / 2, h / 2);
  });
  var rail = litPanel(W * 0.76, 0.052, railTex, 0.30);
  rail.position.set(0, bodyH * 0.47, D / 2 + 0.0015);
  machine.add(rail);

  /* the coin slot and the claim mouth */
  var trayMouth = box(W * 0.34, 0.030, 0.02, rubber);
  trayMouth.position.set(-W * 0.20, bodyH * 0.58, D / 2 + 0.004);
  machine.add(trayMouth);
  var claimMouth = box(W * 0.30, 0.055, 0.02, rubber);
  claimMouth.position.set(W * 0.22, bodyH * 0.58, D / 2 + 0.004);
  machine.add(claimMouth);

  /* --------------------------------------------------------- belly glass -- */
  /* The lower half of a real cabinet is not blank steel — it is a second lit
     panel, and leaving it blank is why the body kept reading as a filing
     cabinet with a slot machine balanced on top of it. */
  var bellyTex = textureFrom(1400, 680, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#141C30"); g.addColorStop(0.55, "#1A2440"); g.addColorStop(1, "#0D1322");
    x.fillStyle = g; x.fillRect(0, 0, w, h);

    /* the seal */
    var cx = w * 0.22, cy = h * 0.50, R = h * 0.34;
    x.strokeStyle = "#C8AE72"; x.lineWidth = 6;
    x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke();
    x.lineWidth = 3;
    x.beginPath(); x.arc(cx, cy, R * 0.86, 0, TAU); x.stroke();
    x.strokeStyle = "#8FA7D8"; x.lineWidth = 5;
    for (var k = 0; k < 3; k++) {                 /* three superposed arcs */
      x.beginPath();
      x.arc(cx, cy, R * (0.28 + k * 0.18), -Math.PI * 0.8, Math.PI * 0.2);
      x.stroke();
    }
    x.fillStyle = "#C8AE72";
    x.font = "600 26px ui-monospace, Menlo, monospace";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("BUREAU  OF", cx, cy + R * 0.52);
    x.fillText("DETERMINATION", cx, cy + R * 0.78);

    /* the schedule, which is the part that is not decoration */
    x.textAlign = "left";
    x.fillStyle = "#E6E0CE";
    x.font = "600 34px ui-monospace, Menlo, monospace";
    x.fillText("SCHEDULE OF DISPOSITIONS", w * 0.44, h * 0.16);
    x.strokeStyle = "rgba(200,174,114,.5)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(w * 0.44, h * 0.22); x.lineTo(w * 0.94, h * 0.22); x.stroke();
    var rows = [
      ["THREE ALIKE", "DETERMINED"], ["TWO ALIKE", "PROVISIONAL"],
      ["BAR · BAR · BAR", "REMANDED"], ["NULL PRESENT", "VOID"],
      ["NO MAJORITY", "UNRESOLVED"]
    ];
    x.font = "500 27px ui-monospace, Menlo, monospace";
    rows.forEach(function (r, i) {
      var y = h * (0.32 + i * 0.135);
      x.fillStyle = "#B6C2DA"; x.fillText(r[0], w * 0.44, y);
      x.fillStyle = "#DCD5C2"; x.textAlign = "right";
      x.fillText(r[1], w * 0.94, y); x.textAlign = "left";
      x.strokeStyle = "rgba(140,155,190,.18)";
      x.beginPath(); x.moveTo(w * 0.44, y + h * 0.055); x.lineTo(w * 0.94, y + h * 0.055); x.stroke();
    });
  });
  var bellyW = W * 0.80, bellyH = bodyH * 0.26, bellyY = bodyH * 0.28;
  var belly = litPanel(bellyW, bellyH, bellyTex, 0.55);
  belly.position.set(0, bellyY, D / 2 + 0.0015);
  machine.add(belly);
  var bfShape = roundedPath(bellyW + 0.034, bellyH + 0.034, 0.014);
  bfShape.holes.push(roundedPath(bellyW, bellyH, 0.008, T.Path));
  var bellyFrame = new T.Mesh(extrude(bfShape, 0.018, 0.005), chromeDim);
  bellyFrame.position.set(0, bellyY, D / 2 + 0.005);
  machine.add(bellyFrame);
  var bellyLight = new T.PointLight(0x9FB4E0, 0.045, 1.1, 2);
  bellyLight.position.set(0, bellyY, D / 2 + 0.22);
  machine.add(bellyLight);

  /* the coin tray, below it: a recess you can see into */
  var trayY = bodyH * 0.135;
  var tray = new T.Mesh(new T.BoxGeometry(W * 0.40, 0.075, 0.09), cavity);
  tray.geometry.scale(-1, -1, -1);
  tray.position.set(0, trayY, D / 2 - 0.045);
  machine.add(tray);
  var trayLip = box(W * 0.44, 0.014, 0.030, chromeDim);
  trayLip.position.set(0, trayY - 0.044, D / 2 + 0.010);
  machine.add(trayLip);

  /* the reveals that say this front is a door, not a face */
  function reveal(w, h, cx, cy) {
    var r = box(w, h, 0.012, paintDark);
    r.position.set(cx, cy, D / 2 - 0.003);
    machine.add(r);
  }
  reveal(W * 0.94, 0.005, 0, bodyH * 0.70);
  reveal(0.005, bodyH * 0.68, -W * 0.47, bodyH * 0.35);
  reveal(0.005, bodyH * 0.68,  W * 0.47, bodyH * 0.35);

  /* the service lock */
  var lock = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.012, 20), chrome);
  lock.rotation.x = Math.PI / 2;
  lock.position.set(W * 0.40, bodyH * 0.645, D / 2 + 0.005);
  lock.castShadow = true;
  machine.add(lock);
  var keyway = box(0.003, 0.016, 0.004, rubber);
  keyway.position.set(W * 0.40, bodyH * 0.645, D / 2 + 0.012);
  machine.add(keyway);

  /* the fasteners. A few screws are a surprising amount of "manufactured". */
  var screwGeo = new T.CylinderGeometry(0.0055, 0.0055, 0.004, 12);
  screwGeo.rotateX(Math.PI / 2);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
    var sc = new T.Mesh(screwGeo, chromeDim);
    sc.position.set(s[0] * W * 0.44, bodyH * 0.70 + s[1] * bodyH * 0.30, D / 2 + 0.005);
    machine.add(sc);
  });

  /* side louvres, so the flanks are not blank */
  for (var lv = 0; lv < 9; lv++) {
    for (var sgn = -1; sgn <= 1; sgn += 2) {
      var lo = box(0.016, 0.013, D * 0.46, paintDark);
      lo.position.set(sgn * (W / 2 - 0.005), bodyH * 0.50 + lv * 0.030, -D * 0.12);
      machine.add(lo);
    }
  }

  /* ------------------------------------------------------------ the keys -- */
  var deckDir = new T.Vector3(0, Math.cos(deckTilt), Math.sin(deckTilt));
  function onDeck(u, v, w, h, mat) {                        /* u across, v up-slope */
    var k = slab(w, h, 0.020, 0.006, 0.004, mat);
    var right = new T.Vector3(1, 0, 0);
    var up = new T.Vector3(0, Math.sin(deckTilt), -Math.cos(deckTilt));
    /* clear the deck's own half-thickness, or the key is buried inside it */
    k.position.copy(deck.position)
      .addScaledVector(right, u)
      .addScaledVector(up, v)
      .addScaledVector(deckDir, deckH / 2 + 0.011);
    k.quaternion.copy(deck.quaternion);
    machine.add(k);
    return k;
  }
  /* A key with nothing written on it is a lozenge. The legend is what makes the
     deck read as a control surface rather than as four tiles glued to a wedge. */
  function legend(u, v, w, h, text, ink, ground) {
    var tex = textureFrom(512, 128, function (x, cw, ch) {
      x.fillStyle = ground; x.fillRect(0, 0, cw, ch);
      x.fillStyle = ink;
      x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "600 " + (text.length > 8 ? 44 : 58) + "px ui-monospace, Menlo, monospace";
      x.fillText(text, cw / 2, ch / 2 + 3);
    });
    var p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({
      map: tex, emissive: 0xFFFFFF, emissiveMap: tex, emissiveIntensity: 0.10,
      roughness: 0.5, metalness: 0
    }));
    var up = new T.Vector3(0, Math.sin(deckTilt), -Math.cos(deckTilt));
    p.position.copy(deck.position)
      .addScaledVector(new T.Vector3(1, 0, 0), u)
      .addScaledVector(up, v)
      .addScaledVector(deckDir, deckH / 2 + 0.0015);
    p.quaternion.copy(deck.quaternion);
    machine.add(p);
    return p;
  }

  var keyCap = new T.MeshPhysicalMaterial({
    color: 0x2B3138, roughness: 0.32, metalness: 0.15,
    clearcoat: 0.8, clearcoatRoughness: 0.12
  });
  var observeKey = onDeck(-W * 0.30, 0, W * 0.26, 0.055, brass);
  onDeck(-W * 0.02, 0, W * 0.13, 0.045, keyCap);
  onDeck( W * 0.14, 0, W * 0.13, 0.045, keyCap);
  onDeck( W * 0.30, 0, W * 0.13, 0.045, keyCap);
  legend(-W * 0.30, -0.052, W * 0.26, 0.030, "OBSERVE", "#F0E9D6", "#3A3222");
  legend(-W * 0.02, -0.048, W * 0.13, 0.026, "HOLD I",   "#C6D2E2", "#1C2128");
  legend( W * 0.14, -0.048, W * 0.13, 0.026, "HOLD II",  "#C6D2E2", "#1C2128");
  legend( W * 0.30, -0.048, W * 0.13, 0.026, "HOLD III", "#C6D2E2", "#1C2128");

  /* ----------------------------------------------------------- the lever -- */
  var lever = new T.Group();
  var boss = new T.Mesh(new T.CylinderGeometry(0.045, 0.05, 0.09, 24), chrome);
  boss.rotation.z = Math.PI / 2;
  boss.castShadow = true;
  lever.add(boss);
  var shaft = new T.Mesh(new T.CylinderGeometry(0.011, 0.013, 0.30, 16), chrome);
  shaft.position.y = 0.15; shaft.castShadow = true;
  lever.add(shaft);
  var ball = new T.Mesh(new T.SphereGeometry(0.035, 32, 24),
    new T.MeshPhysicalMaterial({ color: 0x8E1B1B, roughness: 0.18, metalness: 0.1,
      clearcoat: 1, clearcoatRoughness: 0.05 }));
  ball.position.y = 0.31; ball.castShadow = true;
  lever.add(ball);
  lever.position.set(W / 2 + 0.075, bodyH - 0.04, D * 0.06);
  machine.add(lever);
  var leverTargets = [ball, shaft, boss, observeKey];

  /* ------------------------------------------------------------- lights --- */
  scene.add(new T.HemisphereLight(0x33405A, 0x0A0B0D, 0.32));

  var key = new T.DirectionalLight(0xFFF1DC, 2.4);
  key.position.set(-2.6, 3.4, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
  key.shadow.camera.left = -2; key.shadow.camera.right = 2;
  key.shadow.camera.top = 3;   key.shadow.camera.bottom = -1;
  key.shadow.bias = -0.0012;
  key.shadow.radius = 3;
  scene.add(key);

  var rim = new T.DirectionalLight(0x8FB4FF, 1.9);      /* cool, from behind right */
  rim.position.set(3.4, 2.2, -2.6);
  scene.add(rim);

  var fill = new T.DirectionalLight(0xBFD2FF, 0.30);
  fill.position.set(2.2, 1.0, 2.4);
  scene.add(fill);

  /* ---------------------------------------------------------- the spin ---- */
  /* Deriving where a stop lands rather than guessing it: the cylinder's texture
     coordinate u = 0 sits at +Z, and after the quarter turn that put the axis
     along X, spinning by rotation.x = a carries the point at u to the front
     when a = 2*pi*u. Stop i is centred at u = (i + 0.5)/STOPS, so its landing
     angle is exactly 2*pi*(i + 0.5)/STOPS, plus any number of whole turns. */
  function landingAngle(i) { return TAU * (i + 0.5) / STOPS; }

  var spinning = false, leverPull = 0, leverTarget = 0;
  var hudLeft = document.getElementById("hudLeft");
  var hudRight = document.getElementById("hudRight");

  function spin() {
    if (spinning) return;
    spinning = true;
    leverTarget = 1;
    hudLeft.textContent = "Observing";
    hudRight.textContent = "· · ·";
    for (var i = 0; i < 3; i++) {
      var dr = drums[i];
      dr.stop = Math.floor(Math.random() * STOPS);
      var turns = 7 + i * 2 + Math.floor(Math.random() * 2);
      var end = landingAngle(dr.stop);
      /* wind forward to the next occurrence of that angle past the turns */
      while (end < dr.angle + turns * TAU) end += TAU;
      dr.from = dr.angle;
      dr.to = end;
      dr.dur = 2.1 + i * 0.62;
      dr.t = 0;
      dr.phase = 0;
    }
  }
  function settleReport() {
    var names = drums.map(function (dr, i) { return SYMBOLS[ORDERS[i][dr.stop]].name; });
    hudLeft.textContent = "Drag to orbit · scroll to dolly · pull the lever";
    hudRight.textContent = names.join(" / ");
    window.QA77.result = names;
  }

  /* click, but only if the pointer did not travel — otherwise every orbit drag
     that happens to end on the lever would also fire it */
  var ray = new T.Raycaster(), ndc = new T.Vector2();
  function hitsLever(e) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(leverTargets, false).length > 0;
  }

  /* ------------------------------------------------------------- camera --- */
  /* An orbit controller written out rather than imported: it is forty lines,
     and the examples bundle is another download this page cannot make. */
  var orbit = { yaw: -0.30, pitch: 0.16, dist: 3.35, target: new T.Vector3(0, H * 0.46, 0) };
  var vYaw = 0, vPitch = 0, dragging = false, lastX = 0, lastY = 0, travel = 0;

  function applyCamera() {
    var cp = Math.cos(orbit.pitch), sp = Math.sin(orbit.pitch);
    camera.position.set(
      orbit.target.x + orbit.dist * cp * Math.sin(orbit.yaw),
      orbit.target.y + orbit.dist * sp,
      orbit.target.z + orbit.dist * cp * Math.cos(orbit.yaw)
    );
    camera.lookAt(orbit.target);
  }

  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; travel = 0; lastX = e.clientX; lastY = e.clientY;
    canvas.classList.add("dragging"); canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    travel += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX; lastY = e.clientY;
    vYaw = -dx * 0.0055; vPitch = -dy * 0.0045;
  });
  function endDrag(e) {
    if (dragging && travel < 6 && e && hitsLever(e)) spin();
    dragging = false; canvas.classList.remove("dragging");
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    orbit.dist = Math.max(1.5, Math.min(7, orbit.dist * (1 + e.deltaY * 0.0011)));
  }, { passive: false });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); spin(); }
  });

  /* ------------------------------------------------------------- resize --- */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* --------------------------------------------------------------- loop --- */
  var clock = new T.Clock();
  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function stepDrums(dt) {
    var busy = false;
    for (var i = 0; i < 3; i++) {
      var dr = drums[i];
      if (dr.phase === 2) continue;
      busy = true;
      dr.t += dt / dr.dur;
      if (dr.phase === 0) {
        /* the run-up and slow-down, over-travelling by a fraction of a stop */
        var over = TAU / STOPS * 0.14;
        if (dr.t >= 1) {
          dr.angle = dr.to + over;
          dr.phase = 1; dr.t = 0; dr.dur = 0.34;
        } else {
          dr.angle = dr.from + (dr.to + over - dr.from) * easeOutQuart(dr.t);
        }
      } else {
        /* and the snap back onto the stop, which is the sound you can hear */
        var o = TAU / STOPS * 0.14;
        if (dr.t >= 1) { dr.angle = dr.to; dr.phase = 2; }
        else dr.angle = dr.to + o * (1 - easeOutCubic(dr.t));
      }
      dr.mesh.rotation.x = dr.angle;
    }
    if (spinning && !busy) { spinning = false; leverTarget = 0; settleReport(); }
  }

  function frame() {
    var dt = Math.min(0.05, clock.getDelta());

    orbit.yaw += vYaw; orbit.pitch += vPitch;
    vYaw *= 0.90; vPitch *= 0.90;
    orbit.pitch = Math.max(-0.16, Math.min(0.92, orbit.pitch));
    applyCamera();

    stepDrums(dt);

    /* the lever falls fast under the hand and returns slowly on its spring */
    var rate = leverTarget > leverPull ? 9.0 : 2.4;
    leverPull += (leverTarget - leverPull) * Math.min(1, rate * dt);
    lever.rotation.x = leverPull * 0.95;

    /* the marquee tube is old and never quite settles */
    marquee.material.emissiveIntensity =
      1.35 + Math.sin(clock.elapsedTime * 17.3) * 0.02 + Math.sin(clock.elapsedTime * 3.1) * 0.03;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* park the drums on a stop rather than mid-symbol at load */
  drums.forEach(function (dr, i) {
    dr.stop = [3, 7, 1][i];
    dr.angle = landingAngle(dr.stop);
    dr.mesh.rotation.x = dr.angle;
  });

  applyCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);

  var load = document.getElementById("loading");
  load.classList.add("gone");
  setTimeout(function () { load.remove(); }, 700);

  window.QA77 = {
    scene: scene, camera: camera, orbit: orbit, renderer: renderer, T: T,
    drums: drums, symbols: SYMBOLS, orders: ORDERS, stops: STOPS,
    spin: spin, landingAngle: landingAngle,
    spinning: function () { return spinning; }
  };
  settleReport();
})();

/* ==========================================================================
   PRODUCE ATLAS — VECTOR GLOBE
   --------------------------------------------------------------------------
   Orthographic projection on a 2-D canvas, drawn stroke-only with additive
   bloom. No fills anywhere: a vector display has no fill primitive.

   Everything on the far hemisphere is culled rather than hidden, so paths
   break at the limb exactly as a plotter's pen would lift.
   ========================================================================== */

const RAD = Math.PI / 180;

const PHOSPHOR = {
  viridian: [34, 240, 126],
  amber:    [255, 158, 20],
  ice:      [92, 184, 245],
  xeno:     [255, 95, 210],
  alarm:    [255, 46, 31]
};

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function Globe(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');

  const state = {
    lambda: -30,          // rotation about the polar axis, degrees
    phi: 18,              // tilt of the viewing pole, degrees
    spin: 0.035,          // degrees per frame when idle
    autoSpin: true,
    radius: 0,
    cx: 0, cy: 0,
    dpr: 1,
    taxon: null,
    channel: 'viridian',
    showCentres: true,
    showRoutes: true,
    t: 0,
    dragging: false,
    lastX: 0, lastY: 0,
    stars: []
  };

  /* ---------------------------------------------------------------------
     Projection
     --------------------------------------------------------------------- */
  function project(lat, lng) {
    const p = lat * RAD;
    const l = (lng - state.lambda) * RAD;
    const p0 = state.phi * RAD;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    const x = Math.cos(p) * Math.sin(l);
    const y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l);
    return {
      x: state.cx + x * state.radius,
      y: state.cy - y * state.radius,
      v: cosc >= 0,
      depth: cosc              // 1 at the sub-viewer point, 0 at the limb
    };
  }

  /* Great-circle interpolation between two points on the sphere. Used for
     dispersal legs: a trade route is a path over a sphere, and drawing it
     as a straight screen line would be a lie about the geometry. */
  function greatCircle(a, b, segments = 48) {
    const toVec = ([lat, lng]) => {
      const p = lat * RAD, l = lng * RAD;
      return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
    };
    const v1 = toVec(a), v2 = toVec(b);
    const dot = Math.max(-1, Math.min(1, v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2]));
    const omega = Math.acos(dot);
    const out = [];
    if (omega < 1e-6) return [a, b];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
      const s2 = Math.sin(t * omega) / Math.sin(omega);
      const v = [v1[0]*s1 + v2[0]*s2, v1[1]*s1 + v2[1]*s2, v1[2]*s1 + v2[2]*s2];
      const len = Math.hypot(v[0], v[1], v[2]);
      out.push([
        Math.asin(v[2] / len) / RAD,
        Math.atan2(v[1], v[0]) / RAD
      ]);
    }
    return out;
  }

  /* ---------------------------------------------------------------------
     Drawing primitives
     --------------------------------------------------------------------- */
  function strokePath(points, colour, width, glow, dash) {
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    if (glow) { ctx.shadowColor = colour; ctx.shadowBlur = glow; }
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < points.length; i += 2) {
      const p = project(points[i + 1], points[i]);
      if (!p.v) { pen = false; continue; }          // pen up at the limb
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawLimb() {
    const c = PHOSPHOR.ice;
    ctx.save();
    ctx.strokeStyle = rgba(c, 0.55);
    ctx.lineWidth = 1;
    ctx.shadowColor = rgba(c, 0.9);
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(state.cx, state.cy, state.radius, 0, Math.PI * 2);
    ctx.stroke();

    /* Limb ticks every 30° — a bearing ring, the way a nav display marks
       one. Longer at the cardinals. */
    for (let a = 0; a < 360; a += 10) {
      const major = a % 30 === 0;
      const r0 = state.radius + 3;
      const r1 = state.radius + (major ? 9 : 5);
      const t = (a - 90) * RAD;
      ctx.beginPath();
      ctx.strokeStyle = rgba(c, major ? 0.5 : 0.22);
      ctx.shadowBlur = 0;
      ctx.moveTo(state.cx + Math.cos(t) * r0, state.cy + Math.sin(t) * r0);
      ctx.lineTo(state.cx + Math.cos(t) * r1, state.cy + Math.sin(t) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGraticule() {
    const c = PHOSPHOR.ice;
    /* Parallels every 15°, meridians every 15°. Equator and prime meridian
       are drawn brighter because they are the datum, not decoration. */
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts = [];
      for (let lng = -180; lng <= 180; lng += 4) pts.push(lng, lat);
      const datum = lat === 0;
      strokePath(pts, rgba(c, datum ? 0.34 : 0.16), 1, datum ? 6 : 0);
    }
    for (let lng = -180; lng < 180; lng += 15) {
      const pts = [];
      for (let lat = -88; lat <= 88; lat += 4) pts.push(lng, lat);
      const datum = lng === 0;
      strokePath(pts, rgba(c, datum ? 0.34 : 0.16), 1, datum ? 6 : 0);
    }
  }

  function drawCoasts() {
    const c = PHOSPHOR.ice;
    for (const key in COASTS) {
      const inland = INLAND.indexOf(key) !== -1;
      strokePath(COASTS[key], rgba(c, inland ? 0.38 : 0.92), 1, inland ? 0 : 6);
    }
  }

  /* Vavilov centres as bracketed boxes on the sphere surface. A rectangle
     in lat/lng is not a rectangle on screen, so it is drawn as a densified
     ring that curves with the globe. */
  function drawCentres(activeId) {
    if (!state.showCentres) return;
    for (const z of VAVILOV_CENTRES) {
      const [s, w, n, e] = z.bounds;
      const active = z.id === activeId;
      const c = PHOSPHOR[z.channel] || PHOSPHOR.ice;
      const pts = [];
      const step = Math.max(1.5, (e - w) / 12);
      for (let lng = w; lng <= e; lng += step) pts.push(lng, n);
      for (let lat = n; lat >= s; lat -= Math.max(1.5, (n - s) / 8)) pts.push(e, lat);
      for (let lng = e; lng >= w; lng -= step) pts.push(lng, s);
      for (let lat = s; lat <= n; lat += Math.max(1.5, (n - s) / 8)) pts.push(w, lat);
      pts.push(w, n);
      strokePath(pts, rgba(c, active ? 0.95 : 0.26), active ? 1.4 : 1,
                 active ? 12 : 0, active ? null : [3, 4]);

      /* Label the box at its north-west corner, not its centroid — the
         centroid is exactly where the origin reticle lands. Front
         hemisphere only, and only when the corner is far enough from the
         limb that the text is not foreshortened into the edge. */
      const corner = project(n, w);
      if (corner.v && corner.depth > 0.30) {
        ctx.save();
        ctx.font = '9px ui-monospace, Menlo, Consolas, monospace';
        ctx.fillStyle = rgba(c, active ? 0.95 : 0.38);
        ctx.textAlign = 'left';
        if (active) { ctx.shadowColor = rgba(c, 1); ctx.shadowBlur = 10; }
        ctx.fillText(z.id, corner.x + 3, corner.y - 4);
        ctx.restore();
      }
    }
  }

  /* The origin marker: a struck reticle, brightest thing on the globe. */
  function drawOrigin(taxon) {
    if (!taxon) return;
    const p = project(taxon.origin.lat, taxon.origin.lng);
    if (!p.v) return;
    const c = PHOSPHOR[state.channel];
    const pulse = 0.5 + 0.5 * Math.sin(state.t * 0.055);
    const r = 9 + pulse * 5;

    ctx.save();
    ctx.strokeStyle = rgba(c, 0.95);
    ctx.shadowColor = rgba(c, 1);
    ctx.shadowBlur = 16;
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.stroke();

    /* Four gapped ticks — a reticle, not a ring */
    const gap = r + 4, arm = 8;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(p.x + dx * gap, p.y + dy * gap);
      ctx.lineTo(p.x + dx * (gap + arm), p.y + dy * (gap + arm));
      ctx.stroke();
    });

    /* Leader line out to a callout. The elbow is thrown well clear of the
       marker so the label never lands on top of a Vavilov box or the
       reticle arms, and it flips to the left near the right limb. */
    const flip = p.x > state.cx + state.radius * 0.35 ? -1 : 1;
    const lx = p.x + flip * 54;
    const ly = p.y - 46;
    const runOut = 76;

    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + flip * (r + 3), p.y - (r + 3));
    ctx.lineTo(lx, ly);
    ctx.lineTo(lx + flip * runOut, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '9px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = flip > 0 ? 'left' : 'right';
    ctx.fillStyle = rgba(c, 1);
    ctx.fillText(taxon.id, lx + flip * 4, ly - 5);
    ctx.fillStyle = rgba(c, 0.62);
    ctx.fillText(fmtCoord(taxon.origin.lat, taxon.origin.lng), lx + flip * 4, ly + 11);
    ctx.restore();
  }

  /* Dispersal legs. Dashes march along each arc so direction is readable
     without an arrowhead — an arrowhead at this scale is two pixels. */
  function drawDispersal(taxon) {
    if (!taxon || !state.showRoutes) return;
    const c = PHOSPHOR.xeno;
    const origin = [taxon.origin.lat, taxon.origin.lng];

    taxon.dispersal.forEach((leg, i) => {
      const arc = greatCircle(origin, leg.to, 56);
      const flat = [];
      arc.forEach(([lat, lng]) => flat.push(lng, lat));

      ctx.save();
      ctx.setLineDash([5, 7]);
      ctx.lineDashOffset = -(state.t * 0.9 + i * 14) % 12;
      strokePathRaw(flat, rgba(c, 0.85), 1.1, 9);
      ctx.restore();

      const end = project(leg.to[0], leg.to[1]);
      if (end.v) {
        ctx.save();
        ctx.strokeStyle = rgba(c, 0.95);
        ctx.shadowColor = rgba(c, 1);
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1;
        /* terminus glyph: a small square, rotated 45° = arrival */
        ctx.translate(end.x, end.y);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-3, -3, 6, 6);
        ctx.restore();
      }
    });
  }

  /* strokePath variant that respects an already-configured dash on ctx */
  function strokePathRaw(points, colour, width, glow) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    if (glow) { ctx.shadowColor = colour; ctx.shadowBlur = glow; }
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < points.length; i += 2) {
      const p = project(points[i + 1], points[i]);
      if (!p.v) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function drawStars() {
    ctx.save();
    state.stars.forEach(s => {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(state.t * 0.01 * s.r + s.o));
      ctx.fillStyle = rgba(PHOSPHOR.ice, s.a * tw * 0.5);
      ctx.fillRect(s.x * canvas.clientWidth, s.y * canvas.clientHeight, 1, 1);
    });
    ctx.restore();
  }

  /* ---------------------------------------------------------------------
     Frame
     --------------------------------------------------------------------- */
  function render() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    state.cx = w / 2;
    state.cy = h / 2;
    state.radius = Math.min(w, h) * 0.40;

    drawStars();
    drawGraticule();
    drawCoasts();
    drawLimb();
    drawCentres(state.taxon ? state.taxon.centre : null);
    drawDispersal(state.taxon);
    drawOrigin(state.taxon);
  }

  function tick() {
    state.t += 1;
    if (state.autoSpin && !state.dragging) state.lambda += state.spin;
    if (state.lambda > 180) state.lambda -= 360;
    if (state.lambda < -180) state.lambda += 360;
    render();
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------------
     Sizing — the canvas backing store follows device pixel ratio so
     hairlines stay hairlines on a retina panel.
     --------------------------------------------------------------------- */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.dpr = dpr;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  /* ---------------------------------------------------------------------
     Interaction — drag to rotate. Pointer events cover mouse, pen, touch.
     --------------------------------------------------------------------- */
  canvas.addEventListener('pointerdown', e => {
    state.dragging = true;
    state.lastX = e.clientX; state.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', e => {
    if (!state.dragging) return;
    state.lambda += (e.clientX - state.lastX) * 0.32;
    state.phi = Math.max(-80, Math.min(80, state.phi + (e.clientY - state.lastY) * 0.26));
    state.lastX = e.clientX; state.lastY = e.clientY;
  });
  const release = e => {
    state.dragging = false;
    canvas.style.cursor = 'grab';
    if (e.pointerId != null && canvas.hasPointerCapture?.(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.style.cursor = 'grab';

  /* Seed the starfield once, in normalised coordinates so it survives
     resize without resampling. */
  for (let i = 0; i < 140; i++) {
    state.stars.push({
      x: Math.random(), y: Math.random(),
      a: 0.25 + Math.random() * 0.75,
      r: 0.5 + Math.random() * 2,
      o: Math.random() * 6.28
    });
  }

  new ResizeObserver(resize).observe(canvas);
  resize();
  requestAnimationFrame(tick);

  /* ---------------------------------------------------------------------
     Public interface
     --------------------------------------------------------------------- */
  return {
    /* Rotate the globe so a taxon's origin faces the viewer, then hold.
       The transit is animated because an instrument slews, it does not cut. */
    focus(taxon, channel) {
      state.taxon = taxon;
      state.channel = channel || 'viridian';
      const targetL = taxon.origin.lng;
      const targetP = Math.max(-55, Math.min(55, taxon.origin.lat));
      const fromL = state.lambda, fromP = state.phi;
      let dL = targetL - fromL;
      while (dL > 180) dL -= 360;
      while (dL < -180) dL += 360;
      const dP = targetP - fromP;
      const t0 = performance.now();
      const dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100;
      state.autoSpin = false;
      (function slew(now) {
        const k = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
        /* Stepped easing — a servo settling, not a spring */
        const e = 1 - Math.pow(1 - k, 3);
        state.lambda = fromL + dL * e;
        state.phi = fromP + dP * e;
        if (k < 1) requestAnimationFrame(slew);
        else setTimeout(() => { state.autoSpin = true; }, 2200);
      })(t0);
    },
    set(key, value) { state[key] = value; },
    get(key) { return state[key]; },
    state
  };
}

/* Coordinates in the form an instrument would print them. */
function fmtCoord(lat, lng) {
  const la = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${la} ${lo}`;
}

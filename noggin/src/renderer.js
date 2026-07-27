/* NOGGIN — WebGL2 renderer.

   Pipeline: shadow depth -> HDR scene (optionally multisampled, resolved) ->
   bloom prefilter + separable blur at half res -> tonemapped composite to the
   default framebuffer. The scene target is sized independently of the canvas
   so the app can trade internal resolution for frame time without touching the
   backing store, which is what keeps a 3840x2160 canvas inside a 120 Hz
   budget on hardware that cannot shade 8.3 Mpx natively. */
(function (NG) {
  'use strict';

  const S = NG.S;

  function compile(gl, type, src, label) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      console.error('[noggin] shader compile failed (' + label + ')\n' + log);
      throw new Error('Shader compile failed: ' + label + '\n' + log);
    }
    return sh;
  }

  function program(gl, vsSrc, fsSrc, label) {
    const p = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc, label + '.vert');
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc, label + '.frag');
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      throw new Error('Program link failed: ' + label + '\n' + log);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const u = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p: p, u: u };
  }

  function Renderer(canvas) {
    const attribs = {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      desynchronized: true,
      powerPreference: 'high-performance'
    };
    const gl = canvas.getContext('webgl2', attribs);
    if (!gl) throw new Error('WebGL2 is not available in this browser.');

    this.canvas = canvas;
    this.gl = gl;

    this.extFloat = gl.getExtension('EXT_color_buffer_float');
    this.extFloatBlend = gl.getExtension('EXT_float_blend');
    this.extTimer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.hdr = !!this.extFloat;

    this.maxSamples = gl.getParameter(gl.MAX_SAMPLES) || 0;
    this.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.maxRenderbuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    this.gpuName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

    this.prog = {
      surface: program(gl, S.surfaceVS, S.surfaceFS, 'surface'),
      depth: program(gl, S.depthVS, S.depthFS, 'depth'),
      bg: program(gl, S.fullscreenVS, S.bgFS, 'bg'),
      floor: program(gl, S.floorVS, S.floorFS, 'floor'),
      bright: program(gl, S.fullscreenVS, S.brightFS, 'bright'),
      blur: program(gl, S.fullscreenVS, S.blurFS, 'blur'),
      composite: program(gl, S.fullscreenVS, S.compositeFS, 'composite')
    };

    this.emptyVAO = gl.createVertexArray();

    this.renderW = 1;
    this.renderH = 1;
    this.samples = 0;
    this.shadowSize = 0;

    this.fb = { scene: null, ms: null, bloomA: null, bloomB: null, shadow: null };
    this.tex = { scene: null, bloomA: null, bloomB: null, shadow: null };
    this.rb = { sceneDepth: null, msColor: null, msDepth: null };

    this._buildFloor();

    this.timerQueries = [];
    this.timerIndex = 0;
    this.gpuTimeMs = 0;
    this._timerActive = false;
  }

  /* ---- static geometry ------------------------------------------------- */

  Renderer.prototype._buildFloor = function () {
    const gl = this.gl;
    const y = -3.35, e = 30;
    const verts = new Float32Array([
      -e, y, -e, e, y, -e, e, y, e,
      -e, y, -e, e, y, e, -e, y, e
    ]);
    this.floorVAO = gl.createVertexArray();
    gl.bindVertexArray(this.floorVAO);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  };



  /* ---- props (summoned objects) ------------------------------------------ */

  /* Props share the character's vertex layout so they go through the same
     surface shader, lighting and shadow pass. They never deform, so their
     buffers are static and `stretch` is a constant zero. */
  Renderer.prototype.createProp = function (mesh) {
    const gl = this.gl;
    const n = mesh.positions.length / 3;
    const dyn = new Float32Array(n * 7);
    const sta = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      dyn[i * 7] = mesh.positions[i * 3];
      dyn[i * 7 + 1] = mesh.positions[i * 3 + 1];
      dyn[i * 7 + 2] = mesh.positions[i * 3 + 2];
      dyn[i * 7 + 3] = mesh.normals[i * 3];
      dyn[i * 7 + 4] = mesh.normals[i * 3 + 1];
      dyn[i * 7 + 5] = mesh.normals[i * 3 + 2];
      dyn[i * 7 + 6] = 0;
      sta[i * 4] = mesh.colors[i * 3];
      sta[i * 4 + 1] = mesh.colors[i * 3 + 1];
      sta[i * 4 + 2] = mesh.colors[i * 3 + 2];
      sta[i * 4 + 3] = mesh.mats[i];
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, dyn, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(S.LOC.POS);
    gl.vertexAttribPointer(S.LOC.POS, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(S.LOC.NOR);
    gl.vertexAttribPointer(S.LOC.NOR, 3, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(S.LOC.STRETCH);
    gl.vertexAttribPointer(S.LOC.STRETCH, 1, gl.FLOAT, false, 28, 24);

    const cb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cb);
    gl.bufferData(gl.ARRAY_BUFFER, sta, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(S.LOC.COL);
    gl.vertexAttribPointer(S.LOC.COL, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(S.LOC.MAT);
    gl.vertexAttribPointer(S.LOC.MAT, 1, gl.FLOAT, false, 16, 12);

    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    return {
      vao: vao, count: mesh.indices.length, buffers: [vb, cb, ib],
      heightUnits: mesh.heightUnits, radiusUnits: mesh.radiusUnits, topUnits: mesh.topUnits
    };
  };

  Renderer.prototype.destroyProp = function (prop) {
    const gl = this.gl;
    if (!prop) return;
    gl.deleteVertexArray(prop.vao);
    prop.buffers.forEach(function (b) { gl.deleteBuffer(b); });
  };

  Renderer.prototype.drawProps = function (props, useProgram) {
    const gl = this.gl;
    if (!props || !props.length) return;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (!p.handle) continue;
      gl.uniformMatrix4fv(useProgram.u.uModel, false, p.matrix);
      gl.bindVertexArray(p.handle.vao);
      gl.drawElements(gl.TRIANGLES, p.handle.count, gl.UNSIGNED_INT, 0);
    }
  };

  /* ---- character mesh --------------------------------------------------- */

  Renderer.prototype.setMesh = function (mesh) {
    const gl = this.gl;

    /* Switching quality rebuilds the mesh; release the previous GPU objects
       so repeated preset changes do not leak buffers. */
    if (this.meshVAOs) {
      this.meshVAOs.forEach(function (v) { gl.deleteVertexArray(v); });
      this.dynBuffers.forEach(function (b) { gl.deleteBuffer(b); });
      gl.deleteBuffer(this.staticBuffer);
      gl.deleteBuffer(this.indexBuffer);
    }

    this.mesh = mesh;
    this.vertexCount = mesh.total;
    this.indexCount = mesh.indices.length;
    this.dyn = new Float32Array(mesh.total * 7);

    const staticData = new Float32Array(mesh.total * 4);
    for (let i = 0; i < mesh.total; i++) {
      staticData[i * 4] = mesh.colors[i * 3];
      staticData[i * 4 + 1] = mesh.colors[i * 3 + 1];
      staticData[i * 4 + 2] = mesh.colors[i * 3 + 2];
      staticData[i * 4 + 3] = mesh.mats[i];
    }
    this.staticBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, staticData, gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    /* Two interleaved streaming buffers, alternated per frame: writing the
       buffer the GPU is still reading from is the classic way to stall a
       driver, and at 120 Hz there is no slack to absorb that. */
    const ds = 7 * 4;
    this.dynBuffers = [];
    this.meshVAOs = [];
    for (let i = 0; i < 2; i++) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, this.dyn.byteLength, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(S.LOC.POS);
      gl.vertexAttribPointer(S.LOC.POS, 3, gl.FLOAT, false, ds, 0);
      gl.enableVertexAttribArray(S.LOC.NOR);
      gl.vertexAttribPointer(S.LOC.NOR, 3, gl.FLOAT, false, ds, 12);
      gl.enableVertexAttribArray(S.LOC.STRETCH);
      gl.vertexAttribPointer(S.LOC.STRETCH, 1, gl.FLOAT, false, ds, 24);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuffer);
      gl.enableVertexAttribArray(S.LOC.COL);
      gl.vertexAttribPointer(S.LOC.COL, 3, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(S.LOC.MAT);
      gl.vertexAttribPointer(S.LOC.MAT, 1, gl.FLOAT, false, 16, 12);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

      this.dynBuffers.push(buf);
      this.meshVAOs.push(vao);
    }
    this.dynIndex = 0;
    gl.bindVertexArray(null);
  };

  /* Interleave the solver output and stream it into the next buffer. */
  Renderer.prototype.updateDynamic = function (pos, nrm, stretch) {
    const gl = this.gl;
    const dyn = this.dyn;
    const n = this.vertexCount;
    for (let i = 0; i < n; i++) {
      const s = i * 7, p = i * 3;
      dyn[s] = pos[p];
      dyn[s + 1] = pos[p + 1];
      dyn[s + 2] = pos[p + 2];
      dyn[s + 3] = nrm[p];
      dyn[s + 4] = nrm[p + 1];
      dyn[s + 5] = nrm[p + 2];
      dyn[s + 6] = stretch[i];
    }
    this.dynIndex ^= 1;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynBuffers[this.dynIndex]);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dyn);
  };

  /* ---- render targets ---------------------------------------------------- */

  function makeTex(gl, w, h, internal, filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internal, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  Renderer.prototype._releaseTargets = function () {
    const gl = this.gl;
    ['scene', 'ms', 'bloomA', 'bloomB'].forEach(function (k) {
      if (this.fb[k]) { gl.deleteFramebuffer(this.fb[k]); this.fb[k] = null; }
    }, this);
    ['scene', 'bloomA', 'bloomB'].forEach(function (k) {
      if (this.tex[k]) { gl.deleteTexture(this.tex[k]); this.tex[k] = null; }
    }, this);
    ['sceneDepth', 'msColor', 'msDepth'].forEach(function (k) {
      if (this.rb[k]) { gl.deleteRenderbuffer(this.rb[k]); this.rb[k] = null; }
    }, this);
  };

  Renderer.prototype.setShadowSize = function (size) {
    const gl = this.gl;
    if (this.shadowSize === size) return;
    if (this.fb.shadow) { gl.deleteFramebuffer(this.fb.shadow); this.fb.shadow = null; }
    if (this.tex.shadow) { gl.deleteTexture(this.tex.shadow); this.tex.shadow = null; }
    this.shadowSize = size;

    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.tex.shadow = t;

    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    this.fb.shadow = f;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  /* Allocate the scene chain at `w` x `h`. Returns true when reallocation
     actually happened. */
  Renderer.prototype.setRenderSize = function (w, h, samples) {
    const gl = this.gl;
    w = Math.max(16, Math.min(w | 0, this.maxTexture));
    h = Math.max(16, Math.min(h | 0, this.maxTexture));
    samples = Math.min(samples | 0, this.maxSamples);
    if (w === this.renderW && h === this.renderH && samples === this.samples) return false;

    this._releaseTargets();
    this.renderW = w;
    this.renderH = h;
    this.samples = samples;

    const colorFmt = this.hdr ? gl.RGBA16F : gl.RGBA8;

    this.tex.scene = makeTex(gl, w, h, colorFmt, gl.LINEAR);
    this.fb.scene = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.scene);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex.scene, 0);
    if (samples === 0) {
      this.rb.sceneDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb.sceneDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rb.sceneDepth);
    }

    if (samples > 0) {
      this.rb.msColor = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb.msColor);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, colorFmt, w, h);
      this.rb.msDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb.msDepth);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      this.fb.ms = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.ms);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.rb.msColor);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rb.msDepth);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        /* Fall back to single-sampled rather than failing outright. */
        gl.deleteFramebuffer(this.fb.ms);
        this.fb.ms = null;
        this.samples = 0;
        this.rb.sceneDepth = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb.sceneDepth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.scene);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rb.sceneDepth);
      }
    }

    const bw = Math.max(8, w >> 1), bh = Math.max(8, h >> 1);
    this.bloomW = bw; this.bloomH = bh;
    this.tex.bloomA = makeTex(gl, bw, bh, colorFmt, gl.LINEAR);
    this.tex.bloomB = makeTex(gl, bw, bh, colorFmt, gl.LINEAR);
    this.fb.bloomA = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.bloomA);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex.bloomA, 0);
    this.fb.bloomB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.bloomB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex.bloomB, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  };

  /* ---- GPU timing --------------------------------------------------------- */

  Renderer.prototype.beginTimer = function () {
    const gl = this.gl, ext = this.extTimer;
    if (!ext) return;
    if (this.timerQueries.length < 4) {
      for (let i = this.timerQueries.length; i < 4; i++) {
        this.timerQueries.push({ q: gl.createQuery(), pending: false });
      }
    }
    const slot = this.timerQueries[this.timerIndex];
    if (slot.pending) return;
    gl.beginQuery(ext.TIME_ELAPSED_EXT, slot.q);
    slot.pending = true;
    this._timerActive = true;
  };

  Renderer.prototype.endTimer = function () {
    const gl = this.gl, ext = this.extTimer;
    if (!ext || !this._timerActive) return;
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    this._timerActive = false;
    this.timerIndex = (this.timerIndex + 1) % this.timerQueries.length;

    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    for (let i = 0; i < this.timerQueries.length; i++) {
      const slot = this.timerQueries[i];
      if (!slot.pending) continue;
      if (disjoint) { slot.pending = false; continue; }
      if (gl.getQueryParameter(slot.q, gl.QUERY_RESULT_AVAILABLE)) {
        const ns = gl.getQueryParameter(slot.q, gl.QUERY_RESULT);
        slot.pending = false;
        const ms = ns / 1e6;
        this.gpuTimeMs = this.gpuTimeMs ? this.gpuTimeMs * 0.85 + ms * 0.15 : ms;
      }
    }
  };

  /* ---- frame -------------------------------------------------------------- */

  Renderer.prototype.drawFullscreen = function () {
    const gl = this.gl;
    gl.bindVertexArray(this.emptyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  Renderer.prototype.renderShadow = function (state) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.shadow);
    gl.viewport(0, 0, this.shadowSize, this.shadowSize);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    const pr = this.prog.depth;
    gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uModel, false, state.model);
    gl.uniformMatrix4fv(pr.u.uLightVP, false, state.lightVP);
    gl.bindVertexArray(this.meshVAOs[this.dynIndex]);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    this.drawProps(state.props, pr);
  };

  Renderer.prototype.renderScene = function (state) {
    const gl = this.gl;
    const target = this.samples > 0 ? this.fb.ms : this.fb.scene;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, this.renderW, this.renderH);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* background */
    let pr = this.prog.bg;
    gl.useProgram(pr.p);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.uniform3fv(pr.u.uRayF, state.rayF);
    gl.uniform3fv(pr.u.uRayR, state.rayR);
    gl.uniform3fv(pr.u.uRayU, state.rayU);
    gl.uniform1f(pr.u.uTime, state.time);
    gl.uniform3fv(pr.u.uTopColor, state.sky.top);
    gl.uniform3fv(pr.u.uBotColor, state.sky.bottom);
    gl.uniform3fv(pr.u.uGlowColor, state.sky.glowColor);
    gl.uniform1f(pr.u.uGlow, state.sky.glow);
    this.drawFullscreen();

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    /* floor */
    if (state.showFloor) {
      pr = this.prog.floor;
      gl.useProgram(pr.p);
      gl.uniformMatrix4fv(pr.u.uViewProj, false, state.viewProj);
      gl.uniformMatrix4fv(pr.u.uLightVP, false, state.lightVP);
      gl.uniform3fv(pr.u.uEye, state.eye);
      gl.uniform3fv(pr.u.uGridColor, state.floor.grid);
      gl.uniform3fv(pr.u.uFloorColor, state.floor.base);
      gl.uniform1f(pr.u.uTime, state.time);
      gl.uniform3fv(pr.u.uPoolPos, state.poolPos);
      gl.uniform3fv(pr.u.uPoolColor, state.poolColor);
      gl.uniform2f(pr.u.uShadowTexel, 1 / this.shadowSize, 1 / this.shadowSize);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.shadow);
      gl.uniform1i(pr.u.uShadow, 0);
      gl.bindVertexArray(this.floorVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /* character */
    pr = this.prog.surface;
    gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uModel, false, state.model);
    gl.uniformMatrix4fv(pr.u.uViewProj, false, state.viewProj);
    gl.uniformMatrix4fv(pr.u.uLightVP, false, state.lightVP);
    gl.uniform3fv(pr.u.uEye, state.eye);
    const L = state.light;
    gl.uniform3fv(pr.u.uLightDir, L.dir);
    gl.uniform3fv(pr.u.uLightColor, L.color);
    gl.uniform3fv(pr.u.uFillDir, L.fillDir);
    gl.uniform3fv(pr.u.uFillColor, L.fillColor);
    gl.uniform3fv(pr.u.uAmbSky, L.ambSky);
    gl.uniform3fv(pr.u.uAmbGround, L.ambGround);
    gl.uniform3fv(pr.u.uRimColor, L.rim);
    gl.uniform3fv(pr.u.uSSSColor, L.sss);
    gl.uniform3fv(pr.u.uStretchTint, L.stretchTint);
    gl.uniform3fv(pr.u.uStretchGlow, L.stretchGlow);
    gl.uniform1f(pr.u.uTime, state.time);
    gl.uniform1f(pr.u.uHighlightAmount, state.highlight);
    gl.uniform3fv(pr.u.uFocusDir, state.focusDir);
    gl.uniform3fv(pr.u.uFocusColor, state.being.focus);
    gl.uniform3fv(pr.u.uCoreColor, state.being.core);
    gl.uniform1f(pr.u.uVoice, state.voice);
    gl.uniform1f(pr.u.uMorph, state.morph);
    gl.uniform3fv(pr.u.uFormColor, state.formColor);
    gl.uniform2f(pr.u.uShadowTexel, 1 / this.shadowSize, 1 / this.shadowSize);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.shadow);
    gl.uniform1i(pr.u.uShadow, 0);
    gl.bindVertexArray(this.meshVAOs[this.dynIndex]);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    this.drawProps(state.props, pr);
    this.drawProps(state.halos, pr);

    if (this.samples > 0) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fb.ms);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fb.scene);
      gl.blitFramebuffer(0, 0, this.renderW, this.renderH,
        0, 0, this.renderW, this.renderH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  };

  Renderer.prototype.renderPost = function (state) {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.BLEND);

    if (state.bloom > 0) {
      gl.viewport(0, 0, this.bloomW, this.bloomH);
      let pr = this.prog.bright;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.bloomA);
      gl.useProgram(pr.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.scene);
      gl.uniform1i(pr.u.uScene, 0);
      gl.uniform1f(pr.u.uThreshold, state.bloomThreshold);
      gl.uniform1f(pr.u.uKnee, 0.55);
      this.drawFullscreen();

      pr = this.prog.blur;
      gl.useProgram(pr.p);
      gl.uniform1i(pr.u.uSource, 0);
      for (let pass = 0; pass < state.bloomPasses; pass++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.bloomB);
        gl.bindTexture(gl.TEXTURE_2D, this.tex.bloomA);
        gl.uniform2f(pr.u.uDirection, 1 / this.bloomW, 0);
        this.drawFullscreen();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.bloomA);
        gl.bindTexture(gl.TEXTURE_2D, this.tex.bloomB);
        gl.uniform2f(pr.u.uDirection, 0, 1 / this.bloomH);
        this.drawFullscreen();
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const pr = this.prog.composite;
    gl.useProgram(pr.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.scene);
    gl.uniform1i(pr.u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, state.bloom > 0 ? this.tex.bloomA : this.tex.scene);
    gl.uniform1i(pr.u.uBloom, 1);
    gl.uniform1f(pr.u.uBloomIntensity, state.bloom);
    gl.uniform1f(pr.u.uExposure, state.exposure);
    gl.uniform1f(pr.u.uVignette, state.vignette);
    gl.uniform1f(pr.u.uAberration, state.aberration);
    gl.uniform1f(pr.u.uTime, state.time);
    this.drawFullscreen();
  };

  Renderer.prototype.render = function (state) {
    this.beginTimer();
    this.renderShadow(state);
    this.renderScene(state);
    this.renderPost(state);
    this.endTimer();
  };

  NG.Renderer = Renderer;
})(window.NG = window.NG || {});

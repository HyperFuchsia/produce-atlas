
  var W = 1920, H = 1080;
  var P = {};

  function readPalette(){
    var s = getComputedStyle(document.documentElement);
    P.paper  = s.getPropertyValue('--paper').trim();
    P.ink    = s.getPropertyValue('--stroke').trim();
    P.accent = s.getPropertyValue('--accent').trim();
    P.green  = s.getPropertyValue('--green').trim();
    P.dim    = s.getPropertyValue('--dim').trim();
  }
  readPalette();

  // ---------- drawing helpers ----------

  function bg(col){ g.fillStyle = col || P.paper; g.fillRect(0,0,W,H); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
  function ease(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
  function seg(t,a,b){ return clamp((t-a)/(b-a),0,1); }

  function line(x1,y1,x2,y2,col,w){
    g.strokeStyle=col||P.ink; g.lineWidth=w||4; g.lineCap='round';
    g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
  }
  function rect(x,y,w,h,col,fill){
    g.strokeStyle=col||P.ink; g.fillStyle=col||P.ink; g.lineWidth=4;
    if(fill) g.fillRect(x,y,w,h); else g.strokeRect(x,y,w,h);
  }
  function circle(x,y,r,col,fill,lw){
    g.strokeStyle=col||P.ink; g.fillStyle=col||P.ink; g.lineWidth=lw||4;
    g.beginPath(); g.arc(x,y,r,0,Math.PI*2);
    if(fill) g.fill(); else g.stroke();
  }
  // Type scale. The canvas is 1920 wide and displays at roughly 1140 CSS px,
  // so on-canvas type renders at about 0.59x. MIN is the smallest size that
  // still lands above 20 CSS px on screen; nothing is allowed below it.
  var TXT = { min:H*0.036, note:H*0.038, body:H*0.044, key:H*0.052, big:H*0.075, huge:H*0.105 };

  function label(txt,x,y,size,col,align){
    var sz = Math.max(size||TXT.body, TXT.min);
    g.fillStyle=col||P.ink; g.font='500 '+sz+'px ui-sans-serif,system-ui,sans-serif';
    g.textAlign=align||'center'; g.textBaseline='middle'; g.fillText(txt,x,y);
  }
  function serif(txt,x,y,size,col,align,sp){
    var sz = Math.max(size||TXT.big, TXT.min);
    g.fillStyle=col||P.ink; g.font=sz+'px Georgia,serif';
    g.textAlign=align||'center'; g.textBaseline='middle';
    if(sp){ g.letterSpacing = sp+'px'; }
    g.fillText(txt,x,y);
    g.letterSpacing='0px';
  }

  // The stick figure. Angles are radians from straight-down.
  function fig(x,y,h,o){
    o=o||{};
    var col=o.col||P.ink, lw=o.lw||Math.max(3,h*0.028);
    g.strokeStyle=col; g.fillStyle=col; g.lineWidth=lw; g.lineCap='round'; g.lineJoin='round';
    var hr=h*0.105, hipY=y-h*0.44, shY=y-h*0.74, dx=(o.lean||0)*h*0.14;
    var headY=shY-hr*1.5+(o.headDy||0);
    g.beginPath(); g.moveTo(x+dx,shY); g.lineTo(x,hipY); g.stroke();
    g.beginPath(); g.arc(x+dx+(o.headDx||0),headY,hr,0,Math.PI*2);
    if(o.fillHead) g.fill(); else g.stroke();
    var al=h*0.31;
    var aL=(o.armL===undefined?0.4:o.armL), aR=(o.armR===undefined?-0.4:o.armR);
    g.beginPath();
    g.moveTo(x+dx,shY); g.lineTo(x+dx+Math.sin(aL)*al, shY+Math.cos(aL)*al);
    g.moveTo(x+dx,shY); g.lineTo(x+dx+Math.sin(aR)*al, shY+Math.cos(aR)*al);
    g.stroke();
    var ll=h*0.45;
    var lL=(o.legL===undefined?0.2:o.legL), lR=(o.legR===undefined?-0.2:o.legR);
    g.beginPath();
    g.moveTo(x,hipY); g.lineTo(x+Math.sin(lL)*ll, hipY+Math.cos(lL)*ll);
    g.moveTo(x,hipY); g.lineTo(x+Math.sin(lR)*ll, hipY+Math.cos(lR)*ll);
    g.stroke();
  }
  function walker(x,y,h,ph,o){
    o=o||{}; var s=Math.sin(ph);
    // Limbs keep a permanent spread and swing around it. A true scissor gait
    // closes to a single vertical line at the passing phase, which on a stick
    // figure reads as a legless pole.
    o.legL = 0.13+0.38*s; o.legR = -0.13+0.38*s;
    if(o.armL===undefined){ o.armL = 0.46-0.26*s; o.armR = -0.46-0.26*s; }
    fig(x,y,h,o);
  }
  function ground(y,col){ line(0,y,W,y,col||P.dim,3); }

  
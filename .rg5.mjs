import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// boot -> fly -> land, with audio on the whole way
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:1 });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,80));});
await p.goto('http://localhost:8099/orbital/index.html',{waitUntil:'load'});
await p.waitForTimeout(700);
await p.click('#boot-power');
for(let i=0;i<40;i++){ await p.waitForTimeout(300); if(await p.evaluate(()=>boot.done)) break; }
await p.waitForTimeout(700);
console.log('post-boot   ', JSON.stringify(await p.evaluate(()=>({
  audio:snd.on, world:+snd.world.gain.value.toFixed(2),
  alt:document.getElementById('r-alt').textContent,
  canvasDrawn: (()=>{const c=document.getElementById('stage');
    const g=c.getContext('2d'); const d=g.getImageData(0,0,c.width,c.height).data;
    let lit=0; for(let i=3;i<d.length;i+=4000) if(d[i]>0) lit++; return lit>0;})()
}))));
await p.click('#k-auto');
let done=null;
for(let i=0;i<700;i++){ await p.waitForTimeout(200);
  if(await p.evaluate(()=>!!sim.landed)){done=true;break;} }
console.log('flight      ', done, await p.evaluate(()=>document.getElementById('rep-title').innerText+' '+document.getElementById('rep-big').innerText));
console.log('ERRORS      ', errs.length?errs.join('|'):'clean');
await p.close();

// viewport sweep, booted
for (const [w,h,tag] of [[844,390,'land'],[360,640,'small'],[1440,900,'desk']]) {
  const q = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
  const e2=[]; q.on('pageerror',e=>e2.push(e.message));
  await q.goto('http://localhost:8099/orbital/index.html',{waitUntil:'load'});
  await q.waitForTimeout(700);
  await q.click('#boot-power');
  await q.evaluate(()=>bootFinish());
  await q.waitForTimeout(1400);
  const fps = await q.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();
    (function f(){n++;if(performance.now()-t0<1800)requestAnimationFrame(f);else r(Math.round(n/((performance.now()-t0)/1000)));})();}));
  console.log(tag.padEnd(6),`${w}x${h}`.padEnd(9),'fps',String(fps).padEnd(4),
    'world',await q.evaluate(()=>+snd.world.gain.value.toFixed(2)),
    'overflowX',await q.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),
    e2.length?('ERR '+e2.join('|')):'clean');
  await q.close();
}
await b.close();

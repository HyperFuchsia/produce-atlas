import { renderPlant } from "./plant";

/**
 * Botanical backdrop behind the globe: a warm herbarium-study ground with a
 * few large, faint generative plant illustrations — the same botanical art as
 * the specimens — so the space around the Earth belongs to the same world.
 */
type Sprig = { x: number; y: number; size: number; rot: number; alpha: number; seed: string; category: string };

const SPRIGS: Sprig[] = [
  { x: 0.10, y: 0.24, size: 520, rot: -0.25, alpha: 0.075, seed: "bg-1", category: "vegetable" },
  { x: 0.90, y: 0.20, size: 440, rot: 0.3, alpha: 0.06, seed: "bg-2", category: "spice" },
  { x: 0.06, y: 0.82, size: 560, rot: 0.15, alpha: 0.06, seed: "bg-3", category: "cereal" },
  { x: 0.94, y: 0.80, size: 500, rot: -0.2, alpha: 0.07, seed: "bg-4", category: "fruit" },
  { x: 0.50, y: 1.06, size: 620, rot: 0, alpha: 0.05, seed: "bg-5", category: "legume" },
];

export function mountBackdrop(): void {
  const cv = document.createElement("canvas");
  cv.className = "backdrop";
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d")!;

  // pre-render each faint plant once (dpr 1) to composite repeatedly
  const cache = SPRIGS.map((s) => {
    const pc = document.createElement("canvas");
    renderPlant(pc, s.seed, { color: "#b9c2a0", category: s.category, ink: "#efe4c8", size: s.size, dpr: 1 });
    return pc;
  });

  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Deep botanical ground with a warm central lift behind the globe
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, "#22231b");
    base.addColorStop(0.55, "#171710");
    base.addColorStop(1, "#100f0a");
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, Math.max(W, H) * 0.5);
    glow.addColorStop(0, "rgba(120,124,78,0.14)");
    glow.addColorStop(1, "rgba(120,124,78,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // faint botanical sprigs framing the globe
    SPRIGS.forEach((s, i) => {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.translate(s.x * W, s.y * H);
      ctx.rotate(s.rot);
      ctx.drawImage(cache[i], -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    });

    // gentle vignette to seat the globe
    const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(8,8,5,0.55)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  };

  draw();
  let t: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(t);
    t = window.setTimeout(draw, 150);
  });
}

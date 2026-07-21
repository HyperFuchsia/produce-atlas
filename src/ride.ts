import type { JourneyChapter, EventType } from "./types";

const EVENT_LABEL: Record<EventType, string> = {
  ancestry: "Ancestral range",
  domestication: "Domestication",
  cultivation: "Cultivation",
  transfer: "Historical transfer",
  diversification: "Diversification",
  production: "Present-day production",
};

const prefersReduced = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface RideEls {
  caption: HTMLElement;
  capBody: HTMLElement;
  capClose: HTMLButtonElement;
  timeline: HTMLElement;
  play: HTMLButtonElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  pace: HTMLButtonElement;
}

export interface RideHooks {
  /** Update the map/globe surface to reveal chapters up to `index`. */
  onReveal: (index: number) => void;
  /** Fired after each seek (for URL sync etc.). */
  onSeek?: (index: number) => void;
}

/**
 * Surface-agnostic history-ride state machine: reveals chapters, updates the
 * closable caption and the chronology timeline, autoplays with easing. The
 * actual drawing is delegated to `hooks.onReveal` (globe or flat map).
 * Closing the caption never stops the ride.
 */
export class Ride {
  private i = 0;
  private playing = false;
  private pace = 1;
  private timer: number | null = null;
  private captionOpen = true;

  constructor(
    private ch: JourneyChapter[],
    private els: RideEls,
    private hooks: RideHooks,
  ) {
    this.buildTimeline();
    els.capClose.addEventListener("click", () => this.hideCaption());
    els.prev.addEventListener("click", () => { this.pause(); this.step(-1); });
    els.next.addEventListener("click", () => { this.pause(); this.step(1); });
    els.play.addEventListener("click", () => this.toggle());
    els.pace.addEventListener("click", () => this.cyclePace());
    els.timeline.addEventListener("click", (e) => {
      const dot = (e.target as HTMLElement).closest("[data-i]") as HTMLElement | null;
      if (dot) { this.pause(); this.seek(Number(dot.dataset.i)); }
    });
    this.seek(0, false);
  }

  private dwell(): number { return (prefersReduced() ? 1600 : 3000) / this.pace; }

  seek(index: number, notify = true): void {
    this.i = Math.max(0, Math.min(this.ch.length - 1, index));
    this.hooks.onReveal(this.i);
    this.renderCaption();
    this.updateTimeline();
    if (notify) this.hooks.onSeek?.(this.i);
  }
  step(d: number): void {
    const n = this.i + d;
    if (n < 0 || n > this.ch.length - 1) { this.pause(); return; }
    this.seek(n);
  }

  play(): void {
    if (this.playing) return;
    if (this.i >= this.ch.length - 1) this.seek(0);
    this.playing = true;
    this.els.play.textContent = "❚❚";
    this.els.play.setAttribute("aria-label", "Pause journey");
    this.schedule();
  }
  pause(): void {
    this.playing = false;
    this.els.play.textContent = "▶";
    this.els.play.setAttribute("aria-label", "Play journey");
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }
  toggle(): void { this.playing ? this.pause() : this.play(); }
  get isPlaying(): boolean { return this.playing; }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      if (!this.playing) return;
      if (this.i >= this.ch.length - 1) { this.pause(); return; }
      this.seek(this.i + 1);
      this.schedule();
    }, this.dwell());
  }

  private cyclePace(): void {
    this.pace = this.pace === 1 ? 1.75 : this.pace === 1.75 ? 0.6 : 1;
    this.els.pace.textContent = `${this.pace}×`;
    if (this.playing) this.schedule();
  }

  private hideCaption(): void { this.captionOpen = false; this.els.caption.hidden = true; }

  private renderCaption(): void {
    const c = this.ch[this.i];
    if (this.captionOpen) this.els.caption.hidden = false;
    const conf = c.confidence === "modeled" ? "modeled / uncertain" : "well-documented";
    const label = EVENT_LABEL[c.eventType];
    const mech =
      c.mechanism && c.mechanism.toLowerCase() !== label.toLowerCase()
        ? ` · ${esc(c.mechanism)}`
        : "";
    const modern = c.modernRef ? ` <span class="cap__modern">(${esc(c.modernRef)})</span>` : "";
    const precision = c.precision ? ` <span class="cap__prec">${esc(c.precision)}</span>` : "";
    this.els.capBody.innerHTML = `
      <div class="cap__top">
        <span class="cap__kind">${EVENT_LABEL[c.eventType]}${mech}</span>
        <span class="cap__n">${c.index + 1} / ${c.total}</span>
      </div>
      <div class="cap__title">${esc(c.title)}${modern}</div>
      <div class="cap__period">${esc(c.period)}${precision} · <span class="cap__conf" data-c="${c.confidence}">${conf}</span></div>
      <p class="cap__note">${esc(c.note)}</p>`;
  }

  private buildTimeline(): void {
    this.els.timeline.innerHTML = this.ch
      .map((c, i) => `<button class="tl__stop" data-i="${i}" title="${esc(c.title)}" aria-label="${esc(c.title)}"><span class="tl__dot" data-event="${c.eventType}"></span></button>`)
      .join("");
  }
  private updateTimeline(): void {
    this.els.timeline.querySelectorAll<HTMLElement>(".tl__stop").forEach((s) => {
      const i = Number(s.dataset.i);
      s.classList.toggle("is-active", i === this.i);
      s.classList.toggle("is-past", i < this.i);
    });
  }

  showCaption(): void { this.captionOpen = true; this.renderCaption(); }
  get index(): number { return this.i; }
  destroy(): void { this.pause(); }
}

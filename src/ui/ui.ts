import { audio } from '../engine/audio';
import { haptics } from '../engine/haptics';
import type { Profile, Settings } from '../engine/storage';
import {
  buySkin,
  buyTrail,
  buyUpgrade,
  currentSkin,
  currentTrail,
  skinLocked,
  upgradeCost,
  upgradeLevel,
  xpProgress,
} from '../game/meta';
import { viewMissions } from '../game/missions';
import { SKINS, TRAILS, UPGRADES } from '../game/tuning';
import type { RunStats, World } from '../game/world';
import type { MissionCompletion } from '../game/missions';
import type { RunSummary } from '../game/meta';

export type ScreenName =
  | 'boot'
  | 'title'
  | 'howto'
  | 'shop'
  | 'missions'
  | 'settings'
  | 'pause'
  | 'revive'
  | 'over'
  | 'hud';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`UI element missing: ${sel}`);
  return el;
};

const fmt = (n: number): string => Math.round(n).toLocaleString();

/**
 * All menus, HUD text and store screens. The canvas never draws UI chrome:
 * DOM text stays crisp at every DPR, works with VoiceOver, and costs nothing
 * per frame because it only mutates when a value actually changes.
 */
export class UI {
  onAction: (action: string, payload?: string) => void = () => {};
  private screens = new Map<ScreenName, HTMLElement>();
  private current: ScreenName = 'boot';
  private shopTab: 'upgrades' | 'skins' = 'upgrades';
  private lastHud = { score: -1, dist: -1, shards: -1, flow: -1, combo: -1, powers: '' };
  private profile: Profile | null = null;

  constructor() {
    for (const el of document.querySelectorAll<HTMLElement>('[data-screen]')) {
      this.screens.set(el.dataset.screen as ScreenName, el);
    }

    document.addEventListener('pointerdown', (e) => {
      const btn = (e.target as HTMLElement)?.closest<HTMLElement>('[data-action]');
      if (btn) e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLElement>('[data-action]');
      if (btn) {
        e.stopPropagation();
        audio.play('ui');
        haptics.fire('select');
        this.onAction(btn.dataset.action!, btn.dataset.payload);
        return;
      }
      const tab = target.closest<HTMLElement>('[data-tab]');
      if (tab) {
        this.shopTab = tab.dataset.tab as 'upgrades' | 'skins';
        for (const t of document.querySelectorAll('.tab')) t.classList.toggle('is-on', t === tab);
        if (this.profile) this.renderShop(this.profile);
        audio.play('ui');
      }
    });
  }

  bindProfile(p: Profile): void {
    this.profile = p;
  }

  show(name: ScreenName, keepHud = false): void {
    for (const [key, el] of this.screens) {
      if (key === 'hud') continue;
      el.hidden = key !== name;
    }
    const hud = this.screens.get('hud')!;
    hud.hidden = !(name === 'hud' || keepHud);
    this.current = name;
  }

  get screen(): ScreenName {
    return this.current;
  }

  // ------------------------------------------------------------------ title
  renderTitle(p: Profile, dailyText: string): void {
    $('#t-best').textContent = fmt(p.bestScore);
    $('#t-shards').textContent = fmt(p.shards);
    $('#t-level').textContent = String(p.level);
    $('#t-daily').textContent = dailyText;
    const done = viewMissions(p).some((m) => m.done);
    $('#missions-dot').hidden = !done;
  }

  // ------------------------------------------------------------------ hud
  updateHud(world: World): void {
    const s = world.stats;
    const score = Math.round(s.score);
    if (score !== this.lastHud.score) {
      $('#h-score').textContent = fmt(score);
      this.lastHud.score = score;
    }
    const dist = Math.round(s.distance);
    if (dist !== this.lastHud.dist) {
      $('#h-dist').textContent = `${fmt(dist)} m`;
      this.lastHud.dist = dist;
    }
    if (s.shards !== this.lastHud.shards) {
      $('#h-shards').textContent = fmt(s.shards);
      this.lastHud.shards = s.shards;
    }
    const flow = Math.round(world.flow * 100);
    if (flow !== this.lastHud.flow) {
      ($('#h-flow') as HTMLElement).style.width = `${flow}%`;
      this.lastHud.flow = flow;
    }
    const hudFlow = $('.hud-flow');
    hudFlow.classList.toggle('is-flowing', world.flowActive);

    if (s.combo !== this.lastHud.combo) {
      const el = $('#h-combo');
      el.hidden = s.combo <= 1;
      el.textContent = `x${s.combo}`;
      this.lastHud.combo = s.combo;
    }

    const powers: string[] = [];
    if (world.shields > 0) powers.push(`shield:${world.shields}:1`);
    if (world.magnetTimer > 0) powers.push(`magnet:🧲:${(world.magnetTimer / 12).toFixed(2)}`);
    if (world.overdriveTimer > 0) powers.push(`over:⚡:${(world.overdriveTimer / 7.5).toFixed(2)}`);
    const key = powers.join('|');
    if (key !== this.lastHud.powers) {
      const host = $('#h-powers');
      host.innerHTML = '';
      for (const raw of powers) {
        const [kind, label, pct] = raw.split(':');
        const el = document.createElement('div');
        el.className = 'power';
        el.style.setProperty('--p', `${Math.min(100, Number(pct) * 100)}%`);
        el.innerHTML =
          kind === 'shield' ? `<span>🛡</span><i class="power__n">${label}</i>` : `<span>${label}</span>`;
        host.appendChild(el);
      }
      this.lastHud.powers = key;
    }
  }

  resetHud(): void {
    this.lastHud = { score: -1, dist: -1, shards: -1, flow: -1, combo: -1, powers: '' };
    $('#h-toasts').innerHTML = '';
  }

  toast(text: string, color = '#45f5ff'): void {
    const host = $('#h-toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.color = color;
    el.textContent = text;
    host.appendChild(el);
    window.setTimeout(() => el.remove(), 950);
    while (host.childElementCount > 4) host.firstElementChild?.remove();
  }

  // ------------------------------------------------------------------ pause
  renderPause(world: World): void {
    $('#p-dist').textContent = `${fmt(world.stats.distance)} m`;
    $('#p-score').textContent = fmt(world.stats.score);
    $('#p-shards').textContent = fmt(world.stats.shards);
  }

  // ------------------------------------------------------------------ revive
  renderRevive(secondsLeft: number, total: number, cost: number, affordable: boolean): void {
    $('#revive-count').textContent = String(Math.ceil(secondsLeft));
    ($('.revive-ring') as HTMLElement).style.setProperty('--p', `${(secondsLeft / total) * 100}%`);
    $('#revive-cost').textContent = `✦ ${cost}`;
    const btn = document.querySelector<HTMLButtonElement>('[data-action="revive"]');
    if (btn) btn.disabled = !affordable;
  }

  // ------------------------------------------------------------------ over
  renderOver(summary: RunSummary, stats: RunStats, completed: MissionCompletion[], levelText: string): void {
    $('#o-score').textContent = fmt(summary.score);
    $('#o-kicker').textContent = summary.newBest ? 'NEW PERSONAL BEST' : 'RUN COMPLETE';
    $('#o-best').textContent = summary.newBest ? '' : `BEST ${fmt(Math.max(summary.score, this.profile?.bestScore ?? 0))}`;
    $('#o-dist').textContent = `${fmt(stats.distance)} m`;
    $('#o-shards').textContent = fmt(stats.shards);
    $('#o-combo').textContent = `x${stats.maxCombo}`;
    $('#o-vaults').textContent = fmt(stats.vaults + stats.shatters);

    const host = $('#o-missions');
    host.innerHTML = '';
    const line = (html: string) => {
      const el = document.createElement('div');
      el.className = 'line';
      el.innerHTML = html;
      host.appendChild(el);
    };
    line(`+<b>${summary.xp}</b> XP${levelText}`);
    for (const m of completed) line(`CONTRACT CLEARED — ${m.text} · +<b>${m.shards}</b> ✦`);
  }

  // ------------------------------------------------------------------ shop
  renderShop(p: Profile): void {
    this.profile = p;
    $('#shop-shards').textContent = fmt(p.shards);
    const host = $('#shop-list');
    host.innerHTML = '';

    if (this.shopTab === 'upgrades') {
      for (const def of UPGRADES) {
        const lvl = upgradeLevel(p, def.id);
        const cost = upgradeCost(p, def);
        const card = document.createElement('div');
        card.className = `card${lvl > 0 ? ' is-owned' : ''}`;
        const pips = Array.from({ length: def.maxLevel }, (_, i) => `<i class="pip${i < lvl ? ' is-on' : ''}"></i>`).join('');
        card.innerHTML = `
          <div class="card__body">
            <div class="card__title">${def.name}</div>
            <div class="card__desc">${def.desc(Math.min(lvl + 1, def.maxLevel))}</div>
            <div class="pips">${pips}</div>
          </div>`;
        const btn = document.createElement('button');
        btn.className = 'btn';
        if (cost === null) {
          btn.textContent = 'MAX';
          btn.disabled = true;
        } else {
          btn.textContent = `✦ ${cost}`;
          btn.disabled = p.shards < cost;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (buyUpgrade(p, def.id)) {
              audio.play('buy');
              haptics.fire('success');
              this.renderShop(p);
            } else {
              audio.play('deny');
            }
          });
        }
        card.appendChild(btn);
        host.appendChild(card);
      }
      return;
    }

    // ---- looks: skins then trails
    for (const skin of SKINS) {
      const owned = p.ownedSkins.includes(skin.id);
      const equipped = p.skin === skin.id;
      const lock = skinLocked(p, skin);
      const card = document.createElement('div');
      card.className = `card${owned ? ' is-owned' : ''}${equipped ? ' is-equipped' : ''}`;
      card.innerHTML = `
        <div class="card__swatch" style="background:linear-gradient(135deg, ${skin.palette.jacket}, ${skin.palette.accent})"></div>
        <div class="card__body">
          <div class="card__title">${skin.name}</div>
          <div class="card__desc">${lock ? `Locked — ${lock}` : skin.desc}</div>
        </div>`;
      const btn = document.createElement('button');
      btn.className = 'btn';
      if (equipped) {
        btn.textContent = 'WORN';
        btn.disabled = true;
      } else if (owned) {
        btn.textContent = 'WEAR';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          p.skin = skin.id;
          audio.play('ui');
          this.renderShop(p);
          this.onAction('cosmetic');
        });
      } else if (lock) {
        btn.textContent = '🔒';
        btn.disabled = true;
      } else {
        btn.textContent = `✦ ${skin.cost}`;
        btn.disabled = p.shards < skin.cost;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (buySkin(p, skin.id)) {
            audio.play('buy');
            haptics.fire('success');
            this.renderShop(p);
            this.onAction('cosmetic');
          } else audio.play('deny');
        });
      }
      card.appendChild(btn);
      host.appendChild(card);
    }

    for (const trail of TRAILS) {
      const owned = p.ownedTrails.includes(trail.id);
      const equipped = p.trail === trail.id;
      const card = document.createElement('div');
      card.className = `card${owned ? ' is-owned' : ''}${equipped ? ' is-equipped' : ''}`;
      card.innerHTML = `
        <div class="card__swatch" style="background:${trail.color}"></div>
        <div class="card__body">
          <div class="card__title">${trail.name}</div>
          <div class="card__desc">${trail.desc}</div>
        </div>`;
      const btn = document.createElement('button');
      btn.className = 'btn';
      if (equipped) {
        btn.textContent = 'ON';
        btn.disabled = true;
      } else if (owned) {
        btn.textContent = 'EQUIP';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          p.trail = trail.id;
          audio.play('ui');
          this.renderShop(p);
          this.onAction('cosmetic');
        });
      } else {
        btn.textContent = `✦ ${trail.cost}`;
        btn.disabled = p.shards < trail.cost;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (buyTrail(p, trail.id)) {
            audio.play('buy');
            haptics.fire('success');
            this.renderShop(p);
            this.onAction('cosmetic');
          } else audio.play('deny');
        });
      }
      card.appendChild(btn);
      host.appendChild(card);
    }
  }

  // ------------------------------------------------------------------ missions
  renderMissions(p: Profile): void {
    $('#mission-level').textContent = String(p.level);
    const xp = xpProgress(p);
    ($('#xpbar-fill') as HTMLElement).style.width = `${xp.pct * 100}%`;
    $('#xpbar-label').textContent = `${fmt(xp.have)} / ${fmt(xp.need)} XP`;

    const host = $('#mission-list');
    host.innerHTML = '';
    for (const m of viewMissions(p)) {
      const card = document.createElement('div');
      card.className = `card mission${m.done ? ' is-done' : ''}`;
      const pct = Math.min(100, (m.progress / m.target) * 100);
      card.innerHTML = `
        <div class="card__body">
          <div class="card__title">${m.text}</div>
          <div class="card__desc">${fmt(m.progress)} / ${fmt(m.target)} · +${m.shards} ✦ · +${m.xp} XP</div>
          <div class="mission__bar"><i style="width:${pct}%"></i></div>
        </div>`;
      host.appendChild(card);
    }
  }

  // ------------------------------------------------------------------ settings
  renderSettings(p: Profile, onChange: (key: keyof Settings, value: boolean | string) => void): void {
    const host = $('#settings-list');
    host.innerHTML = '';

    const toggle = (key: keyof Settings, label: string) => {
      const row = document.createElement('label');
      row.innerHTML = `<span>${label}</span>`;
      const btn = document.createElement('button');
      btn.className = 'switch';
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-checked', String(!!p.settings[key]));
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = !(p.settings[key] as boolean);
        (p.settings[key] as boolean) = next;
        btn.setAttribute('aria-checked', String(next));
        audio.play('ui');
        onChange(key, next);
      });
      row.appendChild(btn);
      host.appendChild(row);
    };

    toggle('music', 'Music');
    toggle('sfx', 'Sound effects');
    toggle('haptics', 'Haptics');
    toggle('screenShake', 'Screen shake');
    toggle('highContrast', 'High contrast');
    toggle('invertTouch', 'Swap tap zones');
    toggle('showFps', 'Show performance');

    const row = document.createElement('label');
    row.innerHTML = '<span>Graphics</span>';
    const sel = document.createElement('select');
    for (const opt of ['auto', 'high', 'low'] as const) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt.toUpperCase();
      o.selected = p.settings.quality === opt;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      p.settings.quality = sel.value as Settings['quality'];
      onChange('quality', sel.value);
    });
    row.appendChild(sel);
    host.appendChild(row);
  }

  /** Cosmetic preview used by the title screen attract loop. */
  previewSkin(p: Profile): { skin: ReturnType<typeof currentSkin>; trail: ReturnType<typeof currentTrail> } {
    return { skin: currentSkin(p), trail: currentTrail(p) };
  }

  setRotateHint(show: boolean): void {
    ($('#rotate-hint') as HTMLElement).hidden = !show;
  }
}

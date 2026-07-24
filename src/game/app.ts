import { audio } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { Input } from '../engine/input';
import { Loop } from '../engine/loop';
import { clamp } from '../engine/math';
import { Screen } from '../engine/screen';
import { flushProfile, loadProfile, saveProfile, wipeProfile, type Profile, type Settings } from '../engine/storage';
import { Renderer3D } from '../render3d/renderer3d';
import { UI } from '../ui/ui';
import { Autopilot } from './autopilot';
import { applyRunToMissions, refreshIfComplete, type MissionCompletion } from './missions';
import { bankRun, buildRunConfig, claimDaily, currentSkin, currentTrail, type RunSummary } from './meta';
import { RUN } from './tuning';
import { World } from './world';

type AppState = 'boot' | 'title' | 'playing' | 'paused' | 'revive' | 'over';

/**
 * Application shell: owns the loop, routes input to either the player or the
 * attract-mode bot, keeps the DOM UI in sync, and turns simulation events into
 * sound, light and haptics.
 */
export class App {
  private readonly screen: Screen;
  private readonly input: Input;
  private readonly world = new World();
  private readonly renderer: Renderer3D;
  private readonly ui = new UI();
  private readonly bot = new Autopilot();
  private readonly loop: Loop;

  private profile: Profile;
  private state: AppState = 'boot';
  private stateTime = 0;
  private reviveLeft = 0;
  private lastSummary: RunSummary | null = null;
  private lastCompletions: MissionCompletion[] = [];
  private quality: 'high' | 'low' = 'high';
  private perfSamples: number[] = [];
  private perfCooldown = 3;

  constructor(canvas: HTMLCanvasElement) {
    this.profile = loadProfile();
    this.screen = new Screen(canvas);
    this.renderer = new Renderer3D(this.screen);
    this.input = new Input(canvas);
    this.loop = new Loop(this.update, this.render);

    this.ui.bindProfile(this.profile);
    this.ui.onAction = this.onAction;
    this.applySettings();

    this.input.onPauseKey = () => {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    };
    this.input.onAnyPress = () => {
      audio.unlock();
      if (this.stateTime < 0.35) return;
      if (this.state === 'title') this.startRun();
      else if (this.state === 'over') this.startRun();
    };

    // Tapping the title art (not a button) also launches a run.
    document.addEventListener('pointerdown', (e) => {
      audio.unlock();
      if ((e.target as HTMLElement)?.closest('[data-action],[data-tab],button,select')) return;
      if (this.stateTime < 0.35) return;
      if (this.state === 'title' || this.state === 'over') this.startRun();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'playing') this.pause();
        audio.suspend();
      } else {
        audio.resume();
        this.loop.resync();
      }
    });

    window.addEventListener('pagehide', () => flushProfile(this.profile));
  }

  // ==========================================================================
  // lifecycle
  // ==========================================================================
  boot(): void {
    this.loop.start();
    // A beat on the boot screen so the first frame is never a blank canvas.
    window.setTimeout(() => this.goTitle(true), 380);
  }

  private goTitle(first = false): void {
    this.state = 'title';
    this.stateTime = 0;
    this.world.start({ ...buildRunConfig(this.profile, (Math.random() * 1e9) | 0), headstart: 0, startShields: 0 });
    this.bot.reset();
    this.renderer.reset();

    const daily = first ? claimDaily(this.profile) : { claimed: false, streak: this.profile.dailyStreak, reward: 0 };
    const dailyText = daily.claimed
      ? `DAILY BONUS +${daily.reward} ✦ · STREAK ${daily.streak}`
      : this.profile.totalRuns === 0
        ? 'TAP ANYWHERE TO RUN'
        : `RUNS ${this.profile.totalRuns} · ${Math.round(this.profile.totalDistance)} m LOGGED`;

    this.ui.renderTitle(this.profile, dailyText);
    this.ui.show('title');
    audio.stopMusic(0.6);
    saveProfile(this.profile);
  }

  private startRun(): void {
    audio.unlock();
    const seed = (Math.random() * 1e9) | 0;
    this.world.start(buildRunConfig(this.profile, seed));
    this.renderer.reset();
    this.ui.resetHud();
    this.ui.show('hud');
    this.state = 'playing';
    this.stateTime = 0;
    this.input.setEnabled(true);
    this.input.releaseAll();
    this.loop.resync();
    if (this.profile.settings.music) audio.startMusic();
    haptics.fire('medium');
  }

  private pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.stateTime = 0;
    this.ui.renderPause(this.world);
    this.ui.show('pause', true);
    this.input.setEnabled(false);
    audio.stopMusic(0.25);
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.stateTime = 0;
    this.ui.show('hud');
    this.input.setEnabled(true);
    this.input.releaseAll();
    this.loop.resync();
    if (this.profile.settings.music) audio.startMusic();
  }

  private finishRun(): void {
    this.world.end();
    this.input.setEnabled(false);
    audio.stopMusic(0.8);

    const stats = this.world.stats;
    const summary = bankRun(this.profile, stats);
    const completions = applyRunToMissions(this.profile, stats);
    const rolled = refreshIfComplete(this.profile);
    flushProfile(this.profile);

    this.lastSummary = summary;
    this.lastCompletions = completions;

    let levelText = '';
    if (summary.levelUps.length) {
      const last = summary.levelUps[summary.levelUps.length - 1];
      levelText = ` · <b>LEVEL ${last.level}</b> +${summary.levelUps.reduce((a, l) => a + l.reward, 0)} ✦`;
    }
    if (rolled) levelText += ' · NEW CONTRACTS';

    this.ui.renderOver(summary, stats, completions, levelText);
    this.ui.show('over');
    this.state = 'over';
    this.stateTime = 0;
    haptics.fire(summary.newBest ? 'success' : 'warning');
  }

  // ==========================================================================
  // actions from the UI
  // ==========================================================================
  private onAction = (action: string): void => {
    switch (action) {
      case 'play':
      case 'again':
        this.startRun();
        break;
      case 'resume':
        this.resume();
        break;
      case 'restart':
        this.startRun();
        break;
      case 'quit':
        if (this.state === 'paused' || this.state === 'playing') this.finishRunSilently();
        this.goTitle();
        break;
      case 'shop':
        this.ui.renderShop(this.profile);
        this.ui.show('shop');
        break;
      case 'missions':
        this.ui.renderMissions(this.profile);
        this.ui.show('missions');
        break;
      case 'settings':
        this.ui.renderSettings(this.profile, (key, value) => this.onSettingChange(key, value));
        this.ui.show('settings');
        break;
      case 'howto':
        this.profile.seenHowTo = true;
        this.ui.show('howto');
        break;
      case 'back':
        saveProfile(this.profile);
        if (this.state === 'over' && this.lastSummary) {
          this.ui.renderOver(this.lastSummary, this.world.stats, this.lastCompletions, '');
          this.ui.show('over');
        } else {
          this.ui.renderTitle(this.profile, `SHARDS ${Math.round(this.profile.shards)} ✦`);
          this.ui.show('title');
          this.state = 'title';
          this.stateTime = 0;
        }
        break;
      case 'revive':
        if (this.profile.shards >= RUN.reviveCost) {
          this.profile.shards -= RUN.reviveCost;
          saveProfile(this.profile);
          this.world.revive();
          this.state = 'playing';
          this.stateTime = 0;
          this.ui.show('hud');
          this.input.setEnabled(true);
          this.input.releaseAll();
          this.loop.resync();
          if (this.profile.settings.music) audio.startMusic();
          audio.play('power');
          haptics.fire('success');
        } else {
          audio.play('deny');
        }
        break;
      case 'giveup':
        this.finishRun();
        break;
      case 'reset':
        this.profile = wipeProfile();
        this.ui.bindProfile(this.profile);
        this.applySettings();
        this.ui.renderSettings(this.profile, (key, value) => this.onSettingChange(key, value));
        this.ui.toast('PROGRESS RESET', '#ff5b5b');
        break;
      case 'pause':
        this.pause();
        break;
      case 'cosmetic':
        saveProfile(this.profile);
        break;
      default:
        break;
    }
  };

  private finishRunSilently(): void {
    const stats = this.world.stats;
    if (stats.distance > 5) {
      bankRun(this.profile, stats);
      applyRunToMissions(this.profile, stats);
      refreshIfComplete(this.profile);
      flushProfile(this.profile);
    }
    this.world.end();
    this.input.setEnabled(false);
    audio.stopMusic(0.4);
  }

  private onSettingChange(key: keyof Settings, _value: boolean | string): void {
    this.applySettings();
    saveProfile(this.profile);
    if (key === 'music') {
      if (this.profile.settings.music && this.state === 'playing') audio.startMusic();
      else audio.stopMusic(0.3);
    }
  }

  private applySettings(): void {
    const s = this.profile.settings;
    audio.sfxEnabled = s.sfx;
    audio.musicEnabled = s.music;
    haptics.enabled = s.haptics;
    this.input.options.invert = s.invertTouch;
    if (s.quality === 'high') {
      this.quality = 'high';
      this.screen.setRenderScale(1);
    } else if (s.quality === 'low') {
      this.quality = 'low';
      this.screen.setRenderScale(0.75);
    }
  }

  // ==========================================================================
  // frame
  // ==========================================================================
  private update = (dt: number): void => {
    this.stateTime += dt;
    this.input.tick(performance.now());

    switch (this.state) {
      case 'title':
      case 'boot': {
        // Attract mode: the bot runs the Conduit behind the menu.
        const intent = this.bot.update(this.world, dt);
        this.world.step(
          dt,
          intent.wantJump,
          intent.wantDive,
          intent.holdJump,
          intent.holdDive,
          intent.wantLeft,
          intent.wantRight,
        );
        if (this.world.phase !== 'running' && this.world.phase !== 'dying') {
          this.world.start({ ...buildRunConfig(this.profile, (Math.random() * 1e9) | 0), headstart: 0, startShields: 0 });
          this.bot.reset();
        }
        break;
      }
      case 'playing': {
        if (this.forceBot) {
          const intent = this.bot.update(this.world, dt);
          this.world.step(
            dt,
            intent.wantJump,
            intent.wantDive,
            intent.holdJump,
            intent.holdDive,
            intent.wantLeft,
            intent.wantRight,
          );
          if (this.world.phase === 'revive') this.enterRevive();
          else if (this.world.phase === 'over') this.finishRun();
          break;
        }
        this.world.step(
          dt,
          this.input.consume('up'),
          this.input.consume('down'),
          this.input.isHeld('up'),
          this.input.isHeld('down'),
          this.input.consume('left'),
          this.input.consume('right'),
        );
        if (this.world.phase === 'revive') this.enterRevive();
        else if (this.world.phase === 'over') this.finishRun();
        break;
      }
      case 'revive': {
        this.world.step(dt, false, false, false, false);
        this.reviveLeft -= dt;
        this.ui.renderRevive(
          Math.max(0, this.reviveLeft),
          RUN.reviveWindow,
          RUN.reviveCost,
          this.profile.shards >= RUN.reviveCost,
        );
        if (this.reviveLeft <= 0) this.finishRun();
        break;
      }
      default:
        break;
    }

    this.drainEvents();

    const speedT = clamp((this.world.speed - RUN.startSpeed) / (RUN.maxSpeed - RUN.startSpeed), 0, 1);
    audio.setIntensity(this.state === 'playing' ? speedT : 0.1);
  };

  private enterRevive(): void {
    if (!this.world.canRevive) {
      this.finishRun();
      return;
    }
    this.state = 'revive';
    this.stateTime = 0;
    this.reviveLeft = RUN.reviveWindow;
    this.ui.show('revive', true);
    this.input.setEnabled(false);
    audio.stopMusic(0.4);
  }

  private drainEvents(): void {
    const evts = this.world.events;
    if (!evts.length) return;
    const silent = this.state === 'title' || this.state === 'boot';
    for (const e of evts) {
      this.renderer.onEvent(e, this.world);
      if (silent) continue;
      switch (e.type) {
        case 'jump':
          audio.play('jump');
          haptics.fire('light');
          break;
        case 'land':
          audio.play('land');
          if (e.hard) haptics.fire('medium');
          break;
        case 'slide':
          audio.play('slide');
          haptics.fire('light');
          break;
        case 'lane':
          audio.play('lane');
          haptics.fire('select');
          break;
        case 'wallMount':
          audio.play('wall');
          haptics.fire('heavy');
          break;
        case 'wallEnd':
          audio.play('wallOff');
          haptics.fire('medium');
          break;
        case 'dive':
          audio.play('dive');
          haptics.fire('medium');
          break;
        case 'vault':
          audio.play('vault');
          if (e.perfect) {
            audio.play('perfect');
            haptics.fire('success');
          } else haptics.fire('medium');
          break;
        case 'shatter':
        case 'smash':
          audio.play('shatter');
          haptics.fire('heavy');
          break;
        case 'shard':
          audio.play('shard', e.chain);
          break;
        case 'core':
          audio.play('core');
          haptics.fire('success');
          break;
        case 'power':
          audio.play('power');
          haptics.fire('success');
          break;
        case 'hit':
          audio.play('hit');
          haptics.fire('error');
          break;
        case 'shield':
          audio.play('shield');
          haptics.fire('warning');
          break;
        case 'flowStart':
          audio.play('flow');
          haptics.fire('success');
          break;
        case 'toast':
          this.ui.toast(e.text, e.color);
          break;
        default:
          break;
      }
    }
    evts.length = 0;
  }

  private render = (alpha: number, frameDt: number): void => {
    const looks = this.ui.previewSkin(this.profile);
    this.renderer.draw(this.world, alpha, frameDt, {
      skin: looks.skin ?? currentSkin(this.profile),
      trail: looks.trail ?? currentTrail(this.profile),
      quality: this.quality,
      screenShake: this.profile.settings.screenShake,
      highContrast: this.profile.settings.highContrast,
      showFps: this.profile.settings.showFps,
      fps: this.loop.stats.fps,
    });

    if (this.state === 'playing' || this.state === 'revive') this.ui.updateHud(this.world);
    this.governPerformance(frameDt);
  };

  /**
   * Quality governor.
   *
   * If the device can't hold a smooth frame we shed effects before resolution —
   * a runner that stutters lies to the player about when to jump.
   *
   * The window is deliberately short. An earlier version averaged 90 frames
   * before acting, which on the machines that actually need help (4 fps) meant
   * waiting twenty seconds for the first correction. It now reacts inside a
   * second, and a genuinely dire frame rate triggers an immediate drop.
   */
  private governPerformance(frameDt: number): void {
    if (this.profile.settings.quality !== 'auto') return;
    this.perfSamples.push(frameDt);
    if (this.perfSamples.length > 24) this.perfSamples.shift();
    this.perfCooldown -= frameDt;

    let sum = 0;
    for (const s of this.perfSamples) sum += s;
    const avgFps = this.perfSamples.length ? 1 / (sum / this.perfSamples.length) : 60;

    // Emergency: unplayable, act now regardless of the cooldown.
    if (this.perfSamples.length >= 8 && avgFps < 24) {
      this.quality = 'low';
      this.screen.setRenderScale(Math.max(0.5, this.screen.renderScale - 0.25));
      this.perfSamples.length = 0;
      this.perfCooldown = 1.5;
      return;
    }

    if (this.perfCooldown > 0 || this.perfSamples.length < 24) return;
    this.perfCooldown = 3;

    // Hysteresis matters: a single slow second should not strip the weather off
    // a machine that was coping fine.
    if (avgFps < 44 && this.quality === 'high') {
      this.quality = 'low';
    } else if (avgFps < 38) {
      this.screen.setRenderScale(Math.max(0.5, this.screen.renderScale - 0.15));
    } else if (avgFps > 56 && this.screen.renderScale < 1) {
      this.screen.setRenderScale(Math.min(1, this.screen.renderScale + 0.1));
    } else if (avgFps > 56 && this.quality === 'low') {
      this.quality = 'high';
    }
  }

  /** Drives the player with the attract bot — used only by the smoke test. */
  private forceBot = false;

  // Exposed for the automated smoke test.
  get debug() {
    return {
      world: this.world,
      state: () => this.state,
      profile: () => this.profile,
      fps: () => this.loop.stats.fps,
      startRun: () => this.startRun(),
      pause: () => this.pause(),
      resume: () => this.resume(),
      budget: () => this.renderer.budget,
      setBot: (v: boolean) => {
        this.forceBot = v;
        this.bot.reset();
      },
    };
  }
}

"""Procedural soundtrack for the duck -> trucker-duck short.

Everything is synthesised from scratch with numpy: footsteps, wind, the
transformation whoosh, a chrome-stack diesel idle, an air-horn, and a buzzy
cartoon-duck voice that speaks the closing line via formant resonators.
"""

import math
import wave

import numpy as np

SR = 48000


# --------------------------------------------------------------------------- #
# small dsp helpers
# --------------------------------------------------------------------------- #
def n_samples(dur):
    return int(round(dur * SR))


def t_axis(dur):
    return np.arange(n_samples(dur)) / SR


def rng(seed):
    return np.random.default_rng(seed)


def biquad(x, b, a):
    """Direct-form-I biquad. a = (1, a1, a2), b = (b0, b1, b2)."""
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    b0, b1, b2 = b
    _, a1, a2 = a
    for i in range(x.shape[0]):
        xi = x[i]
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        y[i] = yi
        x2, x1 = x1, xi
        y2, y1 = y1, yi
    return y


def lowpass(x, fc, q=0.707):
    w = 2 * math.pi * fc / SR
    cw, sw = math.cos(w), math.sin(w)
    alpha = sw / (2 * q)
    b0 = (1 - cw) / 2
    b1 = 1 - cw
    b2 = (1 - cw) / 2
    a0 = 1 + alpha
    a1 = -2 * cw
    a2 = 1 - alpha
    return biquad(x, (b0 / a0, b1 / a0, b2 / a0), (1.0, a1 / a0, a2 / a0))


def highpass(x, fc, q=0.707):
    w = 2 * math.pi * fc / SR
    cw, sw = math.cos(w), math.sin(w)
    alpha = sw / (2 * q)
    b0 = (1 + cw) / 2
    b1 = -(1 + cw)
    b2 = (1 + cw) / 2
    a0 = 1 + alpha
    a1 = -2 * cw
    a2 = 1 - alpha
    return biquad(x, (b0 / a0, b1 / a0, b2 / a0), (1.0, a1 / a0, a2 / a0))


def bandpass(x, fc, q=4.0):
    w = 2 * math.pi * fc / SR
    cw, sw = math.cos(w), math.sin(w)
    alpha = sw / (2 * q)
    b0, b1, b2 = alpha, 0.0, -alpha
    a0 = 1 + alpha
    a1 = -2 * cw
    a2 = 1 - alpha
    return biquad(x, (b0 / a0, b1 / a0, b2 / a0), (1.0, a1 / a0, a2 / a0))


def resonator(x, f0, bw):
    """Two-pole formant resonator (unity-ish peak gain)."""
    r = math.exp(-math.pi * bw / SR)
    w = 2 * math.pi * f0 / SR
    a1 = -2.0 * r * math.cos(w)
    a2 = r * r
    gain = (1 - r) * math.sqrt(1 - 2 * r * math.cos(2 * w) + r * r)
    return biquad(x, (gain, 0.0, 0.0), (1.0, a1, a2))


def env_ad(dur, attack, decay, curve=2.0):
    """Attack/decay envelope over `dur` seconds."""
    t = t_axis(dur)
    e = np.zeros_like(t)
    a = max(attack, 1e-4)
    up = t < a
    e[up] = t[up] / a
    dn = ~up
    if decay > 0:
        e[dn] = np.clip(1.0 - (t[dn] - a) / decay, 0.0, 1.0) ** curve
    return e


def saw(freq_hz, dur, phase0=0.0):
    """Band-limited-ish sawtooth from a phase ramp."""
    t = t_axis(dur)
    if np.isscalar(freq_hz):
        ph = 2 * math.pi * freq_hz * t + phase0
    else:
        ph = 2 * math.pi * np.cumsum(freq_hz) / SR + phase0
    return 2.0 * ((ph / (2 * math.pi)) % 1.0) - 1.0


def sine(freq_hz, dur, phase0=0.0):
    t = t_axis(dur)
    if np.isscalar(freq_hz):
        ph = 2 * math.pi * freq_hz * t + phase0
    else:
        ph = 2 * math.pi * np.cumsum(freq_hz) / SR + phase0
    return np.sin(ph)


def pulse_train(freq_hz, dur, width=0.06):
    """Glottal-ish pulse train; `freq_hz` may be an array (pitch contour)."""
    t = t_axis(dur)
    if np.isscalar(freq_hz):
        ph = (freq_hz * t) % 1.0
    else:
        ph = (np.cumsum(freq_hz) / SR) % 1.0
    p = np.where(ph < width, 1.0, 0.0)
    # tilt each pulse so it is not a raw click
    return p * (1.0 - ph / max(width, 1e-6)).clip(0.0, 1.0)


# --------------------------------------------------------------------------- #
# individual sound effects
# --------------------------------------------------------------------------- #
def sfx_footstep(seed, hard=1.0):
    dur = 0.13
    r = rng(seed)
    noise = r.standard_normal(n_samples(dur))
    body = bandpass(noise, 240 + 60 * r.random(), q=1.4) * 1.6
    grit = bandpass(noise, 2400 + 700 * r.random(), q=2.0) * 0.55
    e = env_ad(dur, 0.002, 0.11, curve=3.0)
    return (body + grit) * e * (0.5 + 0.5 * hard)


def sfx_wind(dur, seed=7):
    r = rng(seed)
    noise = r.standard_normal(n_samples(dur))
    low = lowpass(noise, 900) * 1.2
    air = bandpass(noise, 1800, q=0.8) * 0.6
    t = t_axis(dur)
    gust = 0.55 + 0.45 * (0.5 + 0.5 * np.sin(2 * math.pi * 0.37 * t + 1.1))
    return (low + air) * gust


def sfx_whoosh(dur, f_start, f_end, seed=11, q=2.2):
    """Noise swept through a bandpass - the classic transformation whoosh."""
    r = rng(seed)
    noise = r.standard_normal(n_samples(dur))
    # approximate a sweep by crossfading a handful of fixed bandpasses
    steps = 9
    out = np.zeros_like(noise)
    t = np.linspace(0.0, 1.0, noise.shape[0])
    for k in range(steps):
        c = k / (steps - 1)
        f = f_start * (f_end / f_start) ** c
        w = np.exp(-((t - c) ** 2) / (2 * (0.55 / steps) ** 2))
        out += bandpass(noise, f, q=q) * w
    return out * env_ad(dur, 0.18 * dur, 0.9 * dur, curve=1.4) * 2.2


def sfx_spin(dur, seed=13):
    """Rising whirr for the spin-up: stacked saws with an accelerating pitch."""
    t = t_axis(dur)
    k = (t / dur) ** 1.6
    f0 = 120 + 640 * k
    voice = 0.5 * saw(f0, dur) + 0.3 * saw(f0 * 1.5, dur) + 0.2 * sine(f0 * 3, dur)
    flutter = 0.75 + 0.25 * np.sin(2 * math.pi * (14 + 40 * k) * t)
    body = lowpass(voice * flutter, 3200)
    return body * env_ad(dur, 0.25 * dur, dur, curve=0.8) * 0.9


def sfx_flash(seed=17):
    """Bright impact for the reveal: a boom plus a shimmering tail."""
    dur = 1.1
    r = rng(seed)
    noise = r.standard_normal(n_samples(dur))
    boom_t = t_axis(dur)
    boom = np.sin(2 * math.pi * (150 * np.exp(-boom_t * 7.0) + 42) * boom_t)
    boom *= env_ad(dur, 0.004, 0.55, curve=2.4) * 0.9
    crack = highpass(noise, 2600) * env_ad(dur, 0.001, 0.16, curve=3.0) * 0.5
    shimmer = np.zeros(n_samples(dur))
    for k, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0, 2637.0)):
        seg = env_ad(dur, 0.004, 0.85 - 0.09 * k, curve=2.2)
        delay = n_samples(0.045 * k)
        v = sine(f, dur) * seg * (0.16 - 0.02 * k)
        shimmer += np.roll(v, delay) * (np.arange(v.shape[0]) >= delay)
    return boom + crack + shimmer


def sfx_air_brake(seed=19):
    dur = 0.55
    r = rng(seed)
    noise = r.standard_normal(n_samples(dur))
    hiss = bandpass(noise, 3400, q=0.9) * env_ad(dur, 0.01, 0.5, curve=2.2)
    thunk = lowpass(r.standard_normal(n_samples(dur)), 180)
    thunk *= env_ad(dur, 0.003, 0.09, curve=3.0)
    return hiss * 0.55 + thunk * 0.8


def sfx_diesel(dur, rpm=1.0, seed=23):
    """Chugging idle: a low firing pattern plus filtered turbo noise."""
    t = t_axis(dur)
    if np.isscalar(rpm):
        rpm = np.full_like(t, float(rpm))
    fire = 26.0 * rpm
    lump = pulse_train(fire, dur, width=0.34)
    lump = lowpass(lump - lump.mean(), 220) * 3.4
    rumble = 0.6 * saw(fire * 2.0, dur) + 0.35 * sine(fire, dur)
    rumble = lowpass(rumble, 420) * 0.7
    r = rng(seed)
    turbo = bandpass(r.standard_normal(n_samples(dur)), 1500 + 900 * rpm.mean(), q=1.1)
    turbo *= 0.16 * rpm
    return (lump + rumble + turbo) * 0.6


def sfx_air_horn(dur=1.05, seed=29):
    """Two chrome trumpets a fourth apart, with a bit of reed buzz."""
    out = np.zeros(n_samples(dur))
    for f, amp in ((233.1, 1.0), (311.1, 0.85), (466.2, 0.32), (622.2, 0.22)):
        v = 0.6 * saw(f, dur) + 0.4 * sine(f, dur)
        out += v * amp
    r = rng(seed)
    reed = bandpass(r.standard_normal(n_samples(dur)), 1900, q=1.6) * 0.12
    body = lowpass(out * 0.28 + reed, 4200)
    e = env_ad(dur, 0.02, dur * 0.95, curve=0.7)
    # slight pressure droop at the tail
    return body * e


def duck_voice(text_syllables, seed=31):
    """Buzzy cartoon-duck speech: pulse-train source through formant resonators.

    `text_syllables` is a list of dicts: dur, f0 contour, formants, kind.
    """
    parts = []
    r = rng(seed)
    for syl in text_syllables:
        dur = syl["dur"]
        t = t_axis(dur)
        k = t / dur
        f0a, f0b = syl["f0"]
        f0 = f0a + (f0b - f0a) * k
        f0 = f0 * (1.0 + 0.035 * np.sin(2 * math.pi * 6.5 * t))  # vibrato
        f0 = f0 * (1.0 + 0.02 * r.standard_normal(t.shape[0]).cumsum() / max(len(t), 1))
        src = pulse_train(f0, dur, width=0.055)
        src = src - src.mean()
        # breathy component keeps it from sounding like a pure buzz
        src = src + 0.06 * r.standard_normal(t.shape[0])

        voiced = np.zeros_like(src)
        for (f_a, f_b), bw, amp in syl["formants"]:
            f = f_a + (f_b - f_a) * k
            # resonators need a scalar centre: split the glide into 4 chunks
            chunks = 4
            acc = np.zeros_like(src)
            edges = np.linspace(0, src.shape[0], chunks + 1).astype(int)
            for c in range(chunks):
                lo, hi = edges[c], edges[c + 1]
                if hi <= lo:
                    continue
                fc = float(np.mean(f[lo:hi]))
                seg = resonator(src, fc, bw)
                w = np.zeros_like(src)
                w[lo:hi] = 1.0
                # short crossfade to avoid clicks between chunks
                xf = max(int(0.004 * SR), 1)
                if lo > 0:
                    w[lo : lo + xf] = np.linspace(0, 1, xf)
                if hi < src.shape[0]:
                    w[hi - xf : hi] *= np.linspace(1, 0, xf)
                acc += seg * w
            voiced += acc * amp

        # the duck rasp: gentle ring modulation + a nasal peak
        voiced *= 1.0 - 0.28 * (0.5 + 0.5 * np.sin(2 * math.pi * 58.0 * t))
        voiced += resonator(src, 1650.0, 260.0) * 0.28

        e = env_ad(dur, 0.022, dur * 0.92, curve=0.75)
        e *= np.clip(1.0 - np.maximum(0.0, k - 0.86) / 0.14, 0.0, 1.0)
        seg = voiced * e

        if syl.get("kind") == "plosive":
            burst = highpass(r.standard_normal(seg.shape[0]), 2200)
            burst *= env_ad(dur, 0.001, 0.05, curve=3.0) * 0.35
            seg = seg + burst
        if syl.get("kind") == "fric":
            burst = bandpass(r.standard_normal(seg.shape[0]), 5200, q=0.8)
            burst *= env_ad(dur, 0.006, 0.09, curve=2.0) * 0.3
            seg = seg + burst

        parts.append(seg)
        gap = syl.get("gap", 0.0)
        if gap > 0:
            parts.append(np.zeros(n_samples(gap)))

    out = np.concatenate(parts) if parts else np.zeros(0)
    return highpass(out, 170.0)


# --------------------------------------------------------------------------- #
# "I'll talk you later" - the single source of truth for the spoken line.
#
# Each entry carries what the synthesiser needs (dur, gap, f0 contour, formant
# targets, consonant kind) *and* what the animation needs (mouth shape, stress),
# so the beak is keyed to the audio that actually plays rather than to a
# guessed flap rate.  `mouth` is (open_at_start, open_at_end, roundedness).
# --------------------------------------------------------------------------- #
LINE_SYLLABLES = [
    # I'll  (aɪ -> l): jaw drops wide, then closes toward the lateral
    dict(text="I'll", dur=0.30, gap=0.015, kind="voiced", stress=1.0,
         f0=(258, 236), mouth=(0.92, 0.34, 0.10),
         formants=[((720, 430), 105, 1.00), ((1180, 940), 130, 0.62),
                   ((2500, 2450), 190, 0.20)]),
    # talk  (t + ɔ + k): plosive attack onto an open back vowel
    dict(text="talk", dur=0.28, gap=0.045, kind="plosive", stress=0.75,
         f0=(268, 226), mouth=(0.80, 0.62, 0.45),
         formants=[((600, 570), 100, 1.00), ((880, 840), 125, 0.55),
                   ((2560, 2500), 200, 0.18)]),
    # you   (j + u): tight and rounded
    dict(text="you", dur=0.20, gap=0.055, kind="voiced", stress=0.35,
         f0=(244, 224), mouth=(0.30, 0.24, 0.95),
         formants=[((330, 300), 90, 1.00), ((1900, 870), 120, 0.50),
                   ((2400, 2240), 190, 0.16)]),
    # la    (l + eɪ): opens into the diphthong
    dict(text="la", dur=0.24, gap=0.010, kind="voiced", stress=0.9,
         f0=(276, 268), mouth=(0.70, 0.80, 0.05),
         formants=[((520, 420), 95, 1.00), ((1800, 2300), 135, 0.66),
                   ((2600, 2900), 200, 0.22)]),
    # ter   (t + ɚ): trails off and closes
    dict(text="ter", dur=0.40, gap=0.0, kind="plosive", stress=0.45,
         f0=(250, 186), mouth=(0.52, 0.06, 0.30),
         formants=[((490, 470), 105, 1.00), ((1400, 1300), 140, 0.52),
                   ((1750, 1650), 200, 0.30)]),
]

LINE_LENGTH = sum(s["dur"] + s["gap"] for s in LINE_SYLLABLES)


def syllable_times():
    """[(start, end, syllable), ...] with starts relative to the line onset."""
    out, off = [], 0.0
    for s in LINE_SYLLABLES:
        out.append((off, off + s["dur"], s))
        off += s["dur"] + s["gap"]
    return out


def line_ill_talk_you_later():
    return duck_voice(LINE_SYLLABLES)


# --------------------------------------------------------------------------- #
# arrangement
# --------------------------------------------------------------------------- #
def _add(bed, sig, at, gain=1.0, pan=0.0):
    """Mix `sig` into the stereo bed at time `at` seconds, pan in [-1, 1]."""
    i = n_samples(at)
    if i < 0:
        sig = sig[-i:]
        i = 0
    end = min(bed.shape[0], i + sig.shape[0])
    if end <= i:
        return
    s = sig[: end - i] * gain
    left = math.sqrt(0.5 * (1.0 - pan))
    right = math.sqrt(0.5 * (1.0 + pan))
    bed[i:end, 0] += s * left
    bed[i:end, 1] += s * right


def build_soundtrack(timeline):
    """`timeline` carries the scene cue times from the renderer."""
    dur = timeline["total"]
    bed = np.zeros((n_samples(dur) + SR, 2), dtype=np.float64)

    t_spin = timeline["spin"]
    t_flash = timeline["flash"]
    t_truck = timeline["truck_in"]
    t_line = timeline["voice"]
    t_horn = timeline["horn"]
    t_exit = timeline["exit"]

    # --- running: wind bed + footsteps -----------------------------------
    _add(bed, sfx_wind(t_spin + 0.4) * 0.085, 0.0)
    for step_t, hard in timeline["footsteps"]:
        _add(bed, sfx_footstep(1000 + int(step_t * 997), hard),
             step_t, gain=0.5, pan=-0.12 + 0.24 * ((step_t * 7) % 1.0))

    # --- transformation ---------------------------------------------------
    spin_len = max(t_flash - t_spin, 0.2)
    _add(bed, sfx_spin(spin_len + 0.12), t_spin, gain=0.42)
    _add(bed, sfx_whoosh(spin_len + 0.25, 220, 5200, seed=41), t_spin - 0.05, gain=0.30)
    _add(bed, sfx_flash(), t_flash, gain=0.60)
    _add(bed, sfx_whoosh(0.7, 6000, 400, seed=43), t_flash + 0.04, gain=0.20)

    # --- truck arrives and idles -----------------------------------------
    idle_len = dur - t_truck + 0.5
    t_idle = t_axis(idle_len)
    rpm = 0.82 + 0.05 * np.sin(2 * math.pi * 0.7 * t_idle)
    ramp = np.clip(t_idle / 0.8, 0.0, 1.0)
    # throttle up for the drive-away
    k_exit = np.clip((t_idle - (t_exit - t_truck)) / 0.75, 0.0, 1.0)
    rpm = rpm * (1.0 + 1.05 * k_exit)
    engine = sfx_diesel(idle_len, rpm=rpm, seed=53) * ramp
    # fade the truck out as it leaves frame
    tail = np.clip(1.0 - (t_idle - (t_exit - t_truck) - 0.35) / 0.85, 0.0, 1.0)
    _add(bed, engine * tail, t_truck, gain=0.52, pan=0.10)
    _add(bed, sfx_air_brake(), t_truck + 0.62, gain=0.34, pan=0.18)

    # --- the line ---------------------------------------------------------
    voice = line_ill_talk_you_later()
    peak = float(np.max(np.abs(voice))) or 1.0
    _add(bed, voice / peak, t_line, gain=0.80, pan=-0.05)

    # --- sign-off ---------------------------------------------------------
    _add(bed, sfx_air_horn(0.95), t_horn, gain=0.34, pan=0.14)
    _add(bed, sfx_whoosh(1.0, 900, 180, seed=59), t_exit + 0.1, gain=0.20, pan=0.35)

    bed = bed[: n_samples(dur)]

    # master: gentle soft-clip, then head/tail fades
    bed = np.tanh(bed * 1.12) * 0.90
    fade_in = np.clip(np.arange(bed.shape[0]) / n_samples(0.12), 0, 1)[:, None]
    tail_n = n_samples(0.45)
    fade_out = np.ones((bed.shape[0], 1))
    fade_out[-tail_n:, 0] = np.linspace(1, 0, tail_n) ** 1.5
    bed = bed * fade_in * fade_out

    peak = float(np.max(np.abs(bed))) or 1.0
    return bed / peak * 0.94


def write_wav(path, stereo):
    data = np.clip(stereo, -1.0, 1.0)
    pcm = (data * 32767.0).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return path

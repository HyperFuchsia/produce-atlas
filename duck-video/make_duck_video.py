#!/usr/bin/env python3
"""Renders "Trucker Duck" - a hand-animated short, drawn frame by frame.

Beat sheet
    0.00 - 3.60s   a duck sprints flat-out down a highway, dust and speed lines
    3.60 - 4.35s   he winds up and spins into a blur
    4.35 - 4.75s   white blast
    4.75 - 5.55s   he lands as a trucker duck; a rig rolls in under him
    5.55 - 8.00s   he leans out of the window and says "I'll talk you later"
    8.00 - 9.00s   air-horn, and the rig pulls away

Everything is vector-drawn with Pillow at 2x supersampling, then encoded with
ffmpeg alongside a procedurally synthesised soundtrack (see duck_audio.py).

Usage
    python3 make_duck_video.py                 # render out/trucker-duck.mp4
    python3 make_duck_video.py stills 30 120   # dump single frames to inspect
"""

import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

import duck_audio

# --------------------------------------------------------------------------- #
# format
# --------------------------------------------------------------------------- #
W, H = 1280, 720
FPS = 30
SS = 2                      # supersampling factor
TOTAL = 9.0
N_FRAMES = int(round(TOTAL * FPS))

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "out")

# --------------------------------------------------------------------------- #
# timeline (seconds)
# --------------------------------------------------------------------------- #
T_SPIN = 3.60        # wind-up / spin begins
T_FLASH = 4.35       # white blast
T_REVEAL = 4.72      # trucker duck visible, dropping in
T_TRUCK_IN = 4.80    # rig starts sliding in from the right
T_SEAT = 5.42        # duck settles in at the wheel
T_BUBBLE = 5.62      # speech bubble pops
T_VOICE = 5.80       # line starts
T_TYPE_END = 7.05    # line finished typing
T_WAVE = 6.80        # wing wave begins
T_HORN = 8.00
T_EXIT = 8.15        # rig accelerates away

LINE = "I'll talk you later"

# --------------------------------------------------------------------------- #
# staging
# --------------------------------------------------------------------------- #
HORIZON = 400
GROUND = 636         # foot / wheel contact line
ROAD_TOP = 512
DUCK_X = 452         # where the running duck sits in frame
RIG_S = 1.75         # the rig is drawn large so the duck reads in the window
HERO_X = 762         # where the trucker duck lands (the cab covers him here)

# duck-in-the-cab placement: feet position, relative to the cab's left edge
SEAT_DX = 216.0
SEAT_Y = 447.0
SEAT_SCALE = 1.28

# --------------------------------------------------------------------------- #
# palette
# --------------------------------------------------------------------------- #
SKY_TOP = (34, 96, 158)
SKY_MID = (126, 189, 231)
SKY_LOW = (255, 214, 158)
SUN = (255, 246, 214)

HILL_FAR = (108, 141, 152)
HILL_NEAR = (86, 126, 96)
TREE_DARK = (52, 84, 62)
TREE_MID = (72, 110, 74)
FIELD = (139, 176, 106)
FIELD_DARK = (112, 148, 88)
GRASS = (124, 168, 92)

ASPHALT = (86, 88, 96)
ASPHALT_DK = (72, 74, 82)
ROAD_LINE = (236, 231, 214)
ROAD_EDGE = (206, 202, 188)

BODY = (255, 206, 59)
BODY_LT = (255, 231, 148)
BODY_SH = (232, 165, 30)
BODY_EDGE = (150, 96, 12)
BILL = (245, 138, 43)
BILL_DK = (206, 100, 16)
FOOT = (247, 150, 52)
FOOT_DK = (198, 104, 22)
EYE_W = (255, 255, 255)
EYE_D = (36, 33, 38)

CAP_RED = (212, 60, 54)
CAP_DK = (158, 38, 36)
CAP_MESH = (243, 240, 232)
SHADE = (34, 34, 42)
SHADE_LT = (94, 100, 112)
GOLD = (236, 190, 86)

FLANNEL_A = (218, 86, 76)
FLANNEL_B = (178, 54, 48)
FLANNEL_C = (146, 42, 40)

CAB_RED = (196, 52, 48)
CAB_DK = (146, 34, 34)
CAB_LT = (226, 96, 88)
CAB_STRIPE = (242, 234, 214)
CHROME = (208, 218, 226)
CHROME_DK = (146, 158, 170)
GLASS = (150, 196, 214)
GLASS_DK = (66, 86, 100)
TIRE = (38, 38, 44)
TIRE_LT = (58, 58, 66)
HUB = (198, 206, 214)

INK = (38, 34, 40)
WHITE = (255, 255, 255)

FONT_CANDIDATES = [
    "/mnt/skills/examples/canvas-design/canvas-fonts/Outfit-Bold.ttf",
    "/mnt/skills/examples/canvas-design/canvas-fonts/WorkSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


def load_font(px):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, px)
            except OSError:
                continue
    return ImageFont.load_default()


# --------------------------------------------------------------------------- #
# maths helpers
# --------------------------------------------------------------------------- #
def lerp(a, b, t):
    return a + (b - a) * t


def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else hi if v > hi else v


def smooth(a, b, t):
    """Smoothstep of t mapped from the range [a, b]."""
    if b == a:
        return 0.0 if t < a else 1.0
    u = clamp((t - a) / (b - a))
    return u * u * (3 - 2 * u)


def ease_out(u, p=3.0):
    return 1.0 - (1.0 - clamp(u)) ** p


def ease_in(u, p=3.0):
    return clamp(u) ** p


def mix(c1, c2, t):
    t = clamp(t)
    return tuple(int(round(lerp(c1[i], c2[i], t))) for i in range(3))


def shade(c, f):
    return tuple(int(round(clamp(c[i] * f, 0, 255))) for i in range(3))


def rgba(c, a):
    return (c[0], c[1], c[2], int(round(clamp(a, 0, 255))))


def rot_pt(x, y, cx, cy, deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    dx, dy = x - cx, y - cy
    return cx + dx * ca - dy * sa, cy + dx * sa + dy * ca


def rot_pts(pts, cx, cy, deg):
    return [rot_pt(x, y, cx, cy, deg) for x, y in pts]


def ellipse_pts(cx, cy, rx, ry, deg=0.0, n=56, arc=(0.0, 1.0)):
    out = []
    a0, a1 = arc
    for i in range(n + 1):
        u = a0 + (a1 - a0) * i / n
        a = 2 * math.pi * u
        out.append(rot_pt(cx + rx * math.cos(a), cy + ry * math.sin(a),
                          cx, cy, deg))
    return out


def star_pts(cx, cy, r_out, r_in, points=5, deg=0.0):
    out = []
    for i in range(points * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(deg - 90) + math.pi * i / points
        out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def blob(cx, cy, r, wobble, seed, n=30):
    """A softly irregular circle - used for dust and foliage."""
    rnd = np.random.default_rng(seed)
    ks = rnd.uniform(1.0 - wobble, 1.0 + wobble, n)
    ks = (ks + np.roll(ks, 1) + np.roll(ks, -1)) / 3.0     # smooth the noise
    return [(cx + r * ks[i] * math.cos(2 * math.pi * i / n),
             cy + r * ks[i] * math.sin(2 * math.pi * i / n)) for i in range(n)]


def ik_two_bone(hx, hy, fx, fy, l1, l2, bend=1.0):
    """Return the knee position for a 2-bone chain from hip to foot."""
    dx, dy = fx - hx, fy - hy
    d = math.hypot(dx, dy)
    reach = (l1 + l2) * 0.999
    if d > reach:
        dx, dy = dx * reach / d, dy * reach / d
        d = reach
    d = max(d, 1e-6)
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h2 = l1 * l1 - a * a
    h = math.sqrt(h2) if h2 > 0 else 0.0
    ux, uy = dx / d, dy / d
    return hx + a * ux + bend * h * -uy, hy + a * uy + bend * h * ux


# --------------------------------------------------------------------------- #
# drawing surface
#
# Logical 1280x720 coordinates, supersampled internally.  Pillow only blends
# RGBA ink when the target is RGB, so semi-transparent draws onto an RGBA
# layer are routed through a bbox-sized scratch and alpha-composited.
# --------------------------------------------------------------------------- #
class Canvas:
    def __init__(self, img):
        self.img = img
        self.direct = img.mode == "RGB"
        self.d = ImageDraw.Draw(img, "RGBA")

    @staticmethod
    def _opaque(fills):
        for f in fills:
            if f is not None and len(f) == 4 and f[3] < 255:
                return False
        return True

    def _run(self, fills, bbox, fn, pad=4):
        if self.direct or self._opaque(fills):
            fn(self.d, 0, 0)
            return
        x0 = max(int(math.floor(bbox[0])) - pad, 0)
        y0 = max(int(math.floor(bbox[1])) - pad, 0)
        x1 = min(int(math.ceil(bbox[2])) + pad, self.img.width)
        y1 = min(int(math.ceil(bbox[3])) + pad, self.img.height)
        if x1 <= x0 or y1 <= y0:
            return
        scratch = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
        fn(ImageDraw.Draw(scratch), x0, y0)
        self.img.alpha_composite(scratch, (x0, y0))

    @staticmethod
    def _bbox(pts, grow=0.0):
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return (min(xs) - grow, min(ys) - grow, max(xs) + grow, max(ys) + grow)

    def poly(self, pts, fill=None, outline=None, width=0):
        dev = [(x * SS, y * SS) for x, y in pts]
        w = int(round(width * SS)) or None

        def fn(dr, ox, oy):
            dr.polygon([(x - ox, y - oy) for x, y in dev], fill=fill,
                       outline=outline, width=w)
        self._run((fill, outline), self._bbox(dev, (w or 0) + 2), fn)

    def line(self, pts, fill, width=1, joint="curve"):
        dev = [(x * SS, y * SS) for x, y in pts]
        w = max(int(round(width * SS)), 1)

        def fn(dr, ox, oy):
            dr.line([(x - ox, y - oy) for x, y in dev], fill=fill, width=w,
                    joint=joint)
        self._run((fill,), self._bbox(dev, w + 2), fn)

    def ell(self, cx, cy, rx, ry, fill=None, outline=None, width=0, deg=0.0):
        self.poly(ellipse_pts(cx, cy, rx, ry, deg), fill=fill,
                  outline=outline, width=width)

    def circle(self, cx, cy, r, fill=None, outline=None, width=0):
        self.ell(cx, cy, r, r, fill=fill, outline=outline, width=width)

    def rect(self, x0, y0, x1, y1, fill=None, outline=None, width=0):
        box = [x0 * SS, y0 * SS, x1 * SS, y1 * SS]
        w = int(round(width * SS)) or None

        def fn(dr, ox, oy):
            dr.rectangle([box[0] - ox, box[1] - oy, box[2] - ox, box[3] - oy],
                         fill=fill, outline=outline, width=w)
        self._run((fill, outline), (box[0], box[1], box[2], box[3]), fn)

    def rrect(self, x0, y0, x1, y1, r, fill=None, outline=None, width=0):
        box = [x0 * SS, y0 * SS, x1 * SS, y1 * SS]
        w = int(round(width * SS)) or None

        def fn(dr, ox, oy):
            dr.rounded_rectangle(
                [box[0] - ox, box[1] - oy, box[2] - ox, box[3] - oy],
                radius=r * SS, fill=fill, outline=outline, width=w)
        self._run((fill, outline), (box[0], box[1], box[2], box[3]), fn)

    def text(self, xy, s, font, fill, anchor="la"):
        pos = (xy[0] * SS, xy[1] * SS)

        def fn(dr, ox, oy):
            dr.text((pos[0] - ox, pos[1] - oy), s, font=font, fill=fill,
                    anchor=anchor)
        bbox = self.d.textbbox(pos, s, font=font, anchor=anchor)
        self._run((fill,), bbox, fn, pad=8)


def new_layer(w, h):
    img = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    return img, Canvas(img)


def stamp(base, layer, x, y):
    """Composite an RGBA layer onto the RGB frame at logical (x, y)."""
    base.paste(layer, (int(round(x * SS)), int(round(y * SS))), layer)


# --------------------------------------------------------------------------- #
# background: pre-rendered parallax strips, scrolled per frame
# --------------------------------------------------------------------------- #
STRIP_W = 1280          # every strip tiles seamlessly at this width


def _wrap_draw(fn, x, *a, **kw):
    for off in (-STRIP_W, 0, STRIP_W):
        fn(x + off, *a, **kw)


def build_sky():
    """Vertical gradient plus a hazy low sun, built in numpy so it is smooth."""
    grad = np.zeros((H, 3))
    for y in range(H):
        u = y / max(HORIZON, 1)
        if u >= 1.0:
            grad[y] = SKY_LOW
        elif u < 0.62:
            grad[y] = [lerp(SKY_TOP[i], SKY_MID[i], smooth(0, 0.62, u))
                       for i in range(3)]
        else:
            grad[y] = [lerp(SKY_MID[i], SKY_LOW[i], smooth(0.62, 1.0, u))
                       for i in range(3)]
    arr = np.repeat(grad[:, None, :], W, axis=1)

    # smooth radial sun: no concentric banding
    sx, sy, core = 952.0, 322.0, 58.0
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2)
    glow = np.exp(-((r / 170.0) ** 2)) * 0.62
    disc = np.clip((core + 3.0 - r) / 6.0, 0.0, 1.0)
    k = np.clip(glow + disc, 0.0, 1.0)[:, :, None]
    arr = arr * (1 - k) + np.array(SUN) * k

    img = Image.fromarray(arr.astype(np.uint8), "RGB")
    return img.resize((W * SS, H * SS), Image.BILINEAR)


def build_clouds():
    """Each cloud is built opaque in its own tile, then faded as a whole, so
    the overlapping lobes never show seams."""
    img = Image.new("RGBA", (STRIP_W * SS, (HORIZON + 20) * SS), (0, 0, 0, 0))
    rnd = np.random.default_rng(4)
    for i in range(9):
        x = rnd.uniform(0, STRIP_W)
        y = rnd.uniform(56, 236)
        s = rnd.uniform(0.7, 1.55)
        alpha = rnd.uniform(240, 255)

        tw, th = 260, 130
        tile, tc = new_layer(tw, th)
        cx, cy = tw / 2, th * 0.62
        tc.ell(cx, cy + 14 * s, 80 * s, 17 * s, fill=WHITE + (255,))
        for dx, dy, r in ((-58, 8, 30), (-20, -7, 41), (24, 2, 34),
                          (58, 12, 22)):
            tc.circle(cx + dx * s, cy + dy * s, r * s, fill=WHITE + (255,))
        tc.ell(cx - 6 * s, cy + 21 * s, 60 * s, 8 * s,
               fill=rgba((236, 240, 250), 255))
        tile.putalpha(tile.getchannel("A").point(
            lambda v, a=alpha: int(v * a / 255)))

        for off in (-STRIP_W, 0, STRIP_W):
            img.paste(tile, (int((x + off - cx) * SS), int((y - cy) * SS)), tile)
    return img


def build_hills():
    img, c = new_layer(STRIP_W, H)
    base = HORIZON + 16
    for layer, (col, amp, y0) in enumerate((
            (HILL_FAR, 54, base - 10),
            (mix(HILL_FAR, HILL_NEAR, 0.55), 40, base + 8))):
        pts = []
        step = 20
        for x in range(-step, STRIP_W + step * 2, step):
            u = x / STRIP_W * 2 * math.pi
            y = y0 - amp * (0.55 + 0.45 * math.sin(u * (2 + layer) + layer * 1.7)) \
                - amp * 0.25 * math.sin(u * (5 + layer * 2) + 0.6)
            pts.append((x, y))
        pts += [(STRIP_W + step * 2, H), (-step, H)]
        c.poly(pts, fill=col + (255,))
    return img


def build_trees():
    """Fence posts, telephone poles and a scrubby tree line."""
    img, c = new_layer(STRIP_W, H)
    rnd = np.random.default_rng(23)
    band = HORIZON + 26
    c.rect(0, band, STRIP_W, band + 44, fill=FIELD_DARK + (255,))

    for i in range(16):
        x = rnd.uniform(0, STRIP_W)
        h = rnd.uniform(26, 54)
        w = rnd.uniform(20, 40)

        def tree(px, h=h, w=w, i=i):
            c.poly([(px - 3, band + 18), (px + 3, band + 18),
                    (px + 2, band - h * 0.25), (px - 2, band - h * 0.25)],
                   fill=(72, 58, 46, 255))
            for k, (dx, dy, r) in enumerate(((-w * 0.34, -h * 0.42, w * 0.40),
                                             (w * 0.30, -h * 0.36, w * 0.36),
                                             (0, -h * 0.72, w * 0.44))):
                c.poly(blob(px + dx, band + dy, r, 0.16, 900 + i * 7 + k),
                       fill=(TREE_MID if k == 2 else TREE_DARK) + (255,))
        _wrap_draw(tree, x)

    for k in range(5):
        def pole(px):
            c.rect(px - 3, band - 96, px + 3, band + 20, fill=(96, 78, 62, 255))
            c.rect(px - 22, band - 92, px + 22, band - 86, fill=(96, 78, 62, 255))
            c.line([(px - 22, band - 89), (px - 130, band - 78)],
                   fill=(58, 52, 52, 210), width=2)
            c.line([(px + 22, band - 89), (px + 130, band - 78)],
                   fill=(58, 52, 52, 210), width=2)
        _wrap_draw(pole, 130 + k * 256)
    return img


def build_field():
    img, c = new_layer(STRIP_W, H)
    top = HORIZON + 66
    c.rect(0, top, STRIP_W, ROAD_TOP + 4, fill=FIELD + (255,))
    rnd = np.random.default_rng(31)
    for i in range(120):
        x = rnd.uniform(0, STRIP_W)
        y = rnd.uniform(top + 6, ROAD_TOP - 2)
        s = rnd.uniform(3, 9) * (0.4 + (y - top) / 90)

        def tuft(px, y=y, s=s):
            c.poly([(px - s, y + s * 0.5), (px, y - s), (px + s, y + s * 0.5)],
                   fill=FIELD_DARK + (200,))
        _wrap_draw(tuft, x)
    c.rect(0, ROAD_TOP - 6, STRIP_W, ROAD_TOP + 3, fill=(150, 146, 128, 255))
    return img


def build_road():
    img, c = new_layer(STRIP_W, H)
    c.rect(0, ROAD_TOP, STRIP_W, H, fill=ASPHALT + (255,))
    for i in range(10):
        y0 = ROAD_TOP + (H - ROAD_TOP) * i / 10
        y1 = ROAD_TOP + (H - ROAD_TOP) * (i + 1) / 10
        c.rect(0, y0, STRIP_W, y1 + 1, fill=rgba(ASPHALT_DK, 10 + 12 * i))
    rnd = np.random.default_rng(43)
    for i in range(260):
        c.circle(rnd.uniform(0, STRIP_W), rnd.uniform(ROAD_TOP + 6, H),
                 rnd.uniform(1.2, 4.0),
                 fill=rgba(mix(ASPHALT, WHITE, 0.22), 34))
    c.rect(0, ROAD_TOP + 8, STRIP_W, ROAD_TOP + 13, fill=ROAD_EDGE + (235,))
    for k in range(8):                       # STRIP_W is a multiple of 160
        c.rrect(k * 160, GROUND + 44, k * 160 + 96, GROUND + 56, 6,
                fill=ROAD_LINE + (230,))
    return img


def build_verge():
    img, c = new_layer(STRIP_W, H)
    rnd = np.random.default_rng(57)
    top = H - 40
    c.rect(0, top + 14, STRIP_W, H, fill=shade(GRASS, 0.78) + (255,))
    for i in range(180):
        x = rnd.uniform(0, STRIP_W)
        s = rnd.uniform(10, 30)
        lean = rnd.uniform(-6, 6)

        def blade(px, s=s, lean=lean):
            c.poly([(px - 5, H), (px + lean, top + 24 - s), (px + 5, H)],
                   fill=GRASS + (255,))
        _wrap_draw(blade, x)
    return img


# --------------------------------------------------------------------------- #
# the duck
# --------------------------------------------------------------------------- #
# local units: origin at the ground between the feet, +y is up, +x is forward
HIP_Y = 76.0
L_THIGH = 40.0
L_SHIN = 40.0
BODY_C = (0.0, 106.0)
BODY_R = (56.0, 41.0)
NECK_BASE = (34.0, 126.0)
HEAD_C = (72.0, 162.0)
HEAD_R = 28.0
BILL_TIP = (128.0, 152.0)
CAP_TOP = 201.0          # crown height above the feet, for framing

DUCK_LAYER = (400, 380)
DUCK_ANCHOR = (150.0, 336.0)


class DuckPen:
    """Draws duck parts in local (x forward, y up) coordinates."""

    def __init__(self, canvas, anchor, scale, lean=0.0, bob=0.0):
        self.c = canvas
        self.ax, self.ay = anchor
        self.s = scale
        self.lean = lean
        self.bob = bob

    def to_px(self, x, y, torso=False):
        if torso:
            x, y = rot_pt(x, y, 0.0, HIP_Y, -self.lean)
            y += self.bob
        return self.ax + x * self.s, self.ay - y * self.s

    def pts(self, pts, torso=False):
        return [self.to_px(x, y, torso) for x, y in pts]

    def poly(self, pts, torso=False, width=0, **kw):
        self.c.poly(self.pts(pts, torso), width=width * self.s, **kw)

    def line(self, pts, torso=False, width=1, **kw):
        self.c.line(self.pts(pts, torso), width=width * self.s, **kw)

    def ell(self, cx, cy, rx, ry, deg=0.0, torso=False, width=0, **kw):
        self.c.poly(self.pts(ellipse_pts(cx, cy, rx, ry, deg), torso),
                    width=width * self.s, **kw)

    def circle(self, cx, cy, r, torso=False, **kw):
        self.ell(cx, cy, r, r, torso=torso, **kw)


def foot_path(phase, stride, lift):
    """Foot position (local coords) over one stride, phase in [0, 1)."""
    phase %= 1.0
    contact = 0.42
    if phase < contact:
        return stride * (0.5 - phase / contact), 0.0
    u = (phase - contact) / (1.0 - contact)
    return (-stride * 0.5 + stride * (u * u * (3 - 2 * u)),
            lift * math.sin(math.pi * u) ** 0.85)


def draw_leg(pen, phase, stride, lift, near, torso_hip):
    fx, fy = foot_path(phase, stride, lift)
    draw_leg_at(pen, fx, fy + 12.0, near, torso_hip)


def draw_leg_at(pen, fx, fy, near, torso_hip):
    """Draw one leg with the ankle placed at (fx, fy) in local coords."""
    hx, hy = torso_hip
    kx, ky = ik_two_bone(hx, hy, fx, fy, L_THIGH, L_SHIN, bend=-1.0)
    col = FOOT if near else shade(FOOT, 0.80)
    dk = FOOT_DK if near else shade(FOOT_DK, 0.82)
    w = 9.5 if near else 8.0

    # tapered thigh, then shin
    ang = math.atan2(ky - hy, kx - hx) + math.pi / 2
    n = (math.cos(ang), math.sin(ang))
    pen.poly([(hx + n[0] * w * 0.75, hy + n[1] * w * 0.75),
              (hx - n[0] * w * 0.75, hy - n[1] * w * 0.75),
              (kx - n[0] * w * 0.45, ky - n[1] * w * 0.45),
              (kx + n[0] * w * 0.45, ky + n[1] * w * 0.45)], fill=dk + (255,))
    pen.line([(kx, ky), (fx, fy)], fill=col + (255,), width=w * 0.72)
    pen.circle(kx, ky, w * 0.5, fill=dk + (255,))
    pen.circle(fx, fy, w * 0.36, fill=col + (255,))

    # webbed foot
    tilt = -22 if fy > 13.0 else 0
    pen.poly(rot_pts([(fx - 11, fy - 4), (fx + 10, fy - 7), (fx + 28, fy - 2),
                      (fx + 29, fy - 9), (fx + 7, fy - 13), (fx - 12, fy - 11)],
                     fx, fy - 6, tilt), fill=col + (255,),
             outline=rgba(BODY_EDGE, 150), width=1.4)
    pen.poly(rot_pts([(fx - 11, fy - 6), (fx + 28, fy - 4), (fx + 29, fy - 8),
                      (fx - 11, fy - 10)], fx, fy - 6, tilt), fill=dk + (190,))


def draw_wing(pen, cx, cy, deg, length=36.0, height=21.0, near=True,
              feathered=True):
    col = BODY_SH if near else shade(BODY_SH, 0.86)
    if feathered:
        for k in range(3):
            u = 0.32 + k * 0.24
            fx, fy = cx - length * (u - 0.1), cy - height * 0.1
            pen.poly(rot_pts([(fx, fy - 7), (fx - 17 - k * 4, fy - 3 - k * 3),
                              (fx - 16 - k * 4, fy + 5 - k * 2), (fx, fy + 5)],
                             cx, cy, -deg),
                     torso=True, fill=shade(col, 0.84) + (255,))
    pen.ell(cx, cy, length, height, deg=-deg, torso=True, fill=col + (255,),
            outline=rgba(BODY_EDGE, 190), width=1.6)
    pen.ell(cx - length * 0.10, cy + height * 0.20, length * 0.70,
            height * 0.56, deg=-deg, torso=True,
            fill=rgba(mix(BODY, BODY_SH, 0.30), 240))


def draw_head(pen, cap=False, shades=False, beak_open=0.0, head_deg=0.0):
    hx, hy = HEAD_C

    def hp(pts):
        return rot_pts(pts, hx, hy, head_deg)

    # neck
    pen.poly([(NECK_BASE[0] - 22, NECK_BASE[1] - 18),
              (NECK_BASE[0] + 8, NECK_BASE[1] - 14),
              (hx + 13, hy - 13), (hx - 17, hy - 5)],
             torso=True, fill=BODY + (255,))
    # head
    pen.circle(hx, hy, HEAD_R, torso=True, fill=BODY + (255,),
               outline=rgba(BODY_EDGE, 170), width=1.8)
    pen.ell(hx - 4, hy + 8, HEAD_R * 0.80, HEAD_R * 0.60, torso=True,
            fill=rgba(BODY_LT, 175))
    pen.ell(hx + 11, hy - 7, 16, 13, torso=True, fill=BODY + (255,))

    # bill
    lower = rot_pts(hp([(hx + 13, hy - 7), (hx + 42, hy - 9),
                        (hx + 44, hy - 15), (hx + 13, hy - 15)]),
                    hx + 13, hy - 8, -beak_open * 24)
    pen.poly(lower, torso=True, fill=BILL_DK + (255,))
    pen.poly(hp([(hx + 14, hy + 5), (hx + 44, hy + 3), (hx + 49, hy - 3),
                 (hx + 42, hy - 9), (hx + 13, hy - 8)]),
             torso=True, fill=BILL + (255,),
             outline=rgba(shade(BILL_DK, 0.85), 200), width=1.4)
    pen.poly(hp([(hx + 17, hy + 3), (hx + 42, hy + 1), (hx + 43, hy - 2),
                 (hx + 17, hy - 1)]), torso=True, fill=rgba(WHITE, 55))
    pen.circle(*hp([(hx + 25, hy + 1)])[0], 2.0, torso=True,
               fill=BILL_DK + (255,))

    # eye or shades
    ex, ey = hp([(hx + 5, hy + 11)])[0]
    if shades:
        pen.poly(hp([(hx - 15, hy + 17), (hx + 23, hy + 15),
                     (hx + 24, hy + 8), (hx - 14, hy + 10)]),
                 torso=True, fill=GOLD + (255,))
        for lx0, lx1 in ((-13, 5), (8, 22)):
            pen.poly(hp([(hx + lx0, hy + 15), (hx + lx1, hy + 14),
                         (hx + lx1 - 2, hy + 3), (hx + lx0 + 2, hy + 5)]),
                     torso=True, fill=SHADE + (255,))
            pen.poly(hp([(hx + lx0 + 2, hy + 14), (hx + lx0 + 7, hy + 13),
                         (hx + lx0 + 4, hy + 6), (hx + lx0 + 2, hy + 7)]),
                     torso=True, fill=rgba(SHADE_LT, 200))
    else:
        pen.circle(ex, ey, 9.5, torso=True, fill=EYE_W + (255,),
                   outline=rgba(BODY_EDGE, 150), width=1.4)
        pen.circle(ex + 2.4, ey + 0.6, 5.6, torso=True, fill=EYE_D + (255,))
        pen.circle(ex + 4.4, ey + 2.6, 2.0, torso=True, fill=WHITE + (255,))
        pen.line([(ex - 9, ey + 12), (ex + 8, ey + 11)], torso=True,
                 width=2.6, fill=rgba(BODY_EDGE, 220))

    if cap:
        # crown: mesh back panel, red front panel (arc 0..0.5 is the top half)
        pen.poly(hp(ellipse_pts(hx - 3, hy + 15, 29, 24, arc=(0.0, 0.5))),
                 torso=True, fill=CAP_MESH + (255,),
                 outline=rgba(shade(CAP_MESH, 0.70), 230), width=1.6)
        pen.poly(hp(ellipse_pts(hx + 6, hy + 15, 22, 24, arc=(0.0, 0.5)) +
                    [(hx + 6, hy + 15)]),
                 torso=True, fill=CAP_RED + (255,))
        pen.line(hp([(hx + 6, hy + 39), (hx + 6, hy + 15)]), torso=True,
                 width=1.8, fill=rgba(CAP_DK, 200))
        pen.poly(star_pts(*hp([(hx + 16, hy + 26)])[0], 7.0, 3.0, 5, 8),
                 torso=True, fill=GOLD + (255,))
        # brim, sitting over the shades
        pen.poly(hp([(hx + 6, hy + 22), (hx + 48, hy + 19),
                     (hx + 52, hy + 11), (hx + 6, hy + 13)]),
                 torso=True, fill=CAP_DK + (255,))
        pen.poly(hp([(hx + 6, hy + 21), (hx + 46, hy + 18),
                     (hx + 47, hy + 15), (hx + 6, hy + 17)]),
                 torso=True, fill=CAP_RED + (255,))


def plaid_patch(pitch):
    """Red/black flannel, tileable at 3 x pitch."""
    n = pitch * 3
    xs = np.arange(n)
    band = ((xs // pitch) % 2 == 0)
    thin = (xs % pitch) < max(pitch // 11, 1)
    bx, by = band[None, :], band[:, None]
    col = np.empty((n, n, 3))
    col[:] = FLANNEL_B
    col[np.broadcast_to(bx & by, (n, n))] = np.array(FLANNEL_A) * 1.10
    col[np.broadcast_to(bx ^ by, (n, n))] = FLANNEL_A
    col[np.broadcast_to(thin[None, :] | thin[:, None], (n, n))] = FLANNEL_C
    col = np.clip(col, 0, 255)
    out = np.dstack([col, np.full((n, n), 255.0)])
    return Image.fromarray(out.astype(np.uint8), "RGBA")


_PLAID = {}


def plaid_image(w, h):
    if (w, h) not in _PLAID:
        tile = plaid_patch(int(24 * SS))
        img = Image.new("RGBA", (w, h))
        for y in range(0, h, tile.height):
            for x in range(0, w, tile.width):
                img.paste(tile, (x, y))
        _PLAID[(w, h)] = img
    return _PLAID[(w, h)]


def draw_torso(pen, tail=True):
    bx, by = BODY_C
    rx, ry = BODY_R
    if tail:
        # a fan of three tail feathers, cocked up and back
        for k, (ang, ln) in enumerate(((16, 34), (30, 40), (46, 30))):
            a = math.radians(180 - ang)
            tipx = bx - rx + 8 + ln * math.cos(a)
            tipy = by + 6 + ln * math.sin(a) * -1
            pen.poly([(bx - rx + 10, by + 14), (tipx, tipy + 5),
                      (tipx - 3, tipy - 4), (bx - rx + 8, by - 2)],
                     torso=True,
                     fill=(BODY_SH if k == 1 else shade(BODY_SH, 0.88)) + (255,),
                     outline=rgba(BODY_EDGE, 150), width=1.3)
    pen.ell(bx, by, rx, ry, deg=-6, torso=True, fill=BODY + (255,),
            outline=rgba(BODY_EDGE, 175), width=2.0)
    pen.ell(bx + 8, by - 10, rx * 0.78, ry * 0.62, deg=-6, torso=True,
            fill=rgba(BODY_LT, 190))


def apply_flannel(layer, pen):
    """Clip a plaid pattern to the duck's torso."""
    bx, by = BODY_C
    rx, ry = BODY_R
    mask = Image.new("L", layer.size, 0)
    md = ImageDraw.Draw(mask)
    md.polygon([(x * SS, y * SS) for x, y in
                pen.pts(ellipse_pts(bx + 2, by - 5, rx * 0.96, ry * 0.93,
                                    deg=-6), True)], fill=232)
    md.polygon([(x * SS, y * SS) for x, y in
                pen.pts(ellipse_pts(NECK_BASE[0] + 4, NECK_BASE[1] - 4,
                                    24, 17), True)], fill=0)
    mask = ImageChops.multiply(mask, layer.getchannel("A"))
    layer.paste(plaid_image(*layer.size), (0, 0), mask)

    p = DuckPen(Canvas(layer), (pen.ax, pen.ay), pen.s, pen.lean, pen.bob)
    # collar, placket and buttons so it reads as a shirt
    p.poly([(NECK_BASE[0] - 18, NECK_BASE[1] - 2),
            (NECK_BASE[0] + 16, NECK_BASE[1] - 1),
            (NECK_BASE[0] + 7, NECK_BASE[1] - 23),
            (NECK_BASE[0] - 22, NECK_BASE[1] - 18)],
           torso=True, fill=FLANNEL_A + (255,))
    p.poly([(NECK_BASE[0] - 22, NECK_BASE[1] - 4),
            (NECK_BASE[0] - 2, NECK_BASE[1] - 2),
            (NECK_BASE[0] - 7, NECK_BASE[1] - 25),
            (NECK_BASE[0] - 27, NECK_BASE[1] - 20)],
           torso=True, fill=FLANNEL_B + (255,))
    p.line([(BODY_C[0] + 24, BODY_C[1] + 24), (BODY_C[0] + 31, BODY_C[1] - 20)],
           torso=True, width=2.6, fill=rgba(FLANNEL_C, 210))
    for k in range(3):
        p.circle(BODY_C[0] + 27 + k * 1.6, BODY_C[1] + 16 - k * 17, 2.3,
                 torso=True, fill=rgba(CAP_MESH, 235))
    return p


RUN_STRIDE, RUN_LIFT, RUN_SCALE = 78.0, 44.0, 1.26


def duck_run_layer(phase, lean=20.0):
    layer, c = new_layer(*DUCK_LAYER)
    bob = 6.0 * math.sin(4 * math.pi * phase) - 3.0
    pen = DuckPen(c, DUCK_ANCHOR, RUN_SCALE, lean=lean, bob=bob)
    hip = rot_pt(0.0, HIP_Y, 0.0, HIP_Y, -lean)
    hip = (hip[0], hip[1] + bob)
    flap = math.sin(4 * math.pi * phase + 1.0)

    draw_leg(pen, phase + 0.5, RUN_STRIDE, RUN_LIFT, False, hip)
    draw_wing(pen, BODY_C[0] - 4, BODY_C[1] + 4, deg=-36 + 18 * flap,
              length=40, height=22, near=False)
    draw_torso(pen)
    draw_head(pen, beak_open=0.36 + 0.24 * math.sin(4 * math.pi * phase),
              head_deg=-7 + 5 * math.sin(4 * math.pi * phase))
    draw_wing(pen, BODY_C[0] + 2, BODY_C[1] - 2, deg=-44 + 22 * flap,
              length=41, height=23, near=True)
    draw_leg(pen, phase, RUN_STRIDE, RUN_LIFT, True, hip)
    return layer, DUCK_ANCHOR


def duck_ball_layer():
    """The duck tucked into a ball, so the spin smear reads cleanly."""
    layer, c = new_layer(*DUCK_LAYER)
    pen = DuckPen(c, DUCK_ANCHOR, RUN_SCALE)
    hip = (0.0, HIP_Y)
    draw_leg_at(pen, 26.0, 62.0, False, hip)
    draw_wing(pen, BODY_C[0] - 4, BODY_C[1] + 2, deg=-72, length=38, near=False)
    draw_torso(pen)
    draw_head(pen, beak_open=0.85, head_deg=-30)
    draw_wing(pen, BODY_C[0], BODY_C[1], deg=-78, length=39, near=True)
    draw_leg_at(pen, 12.0, 74.0, True, hip)
    return layer, DUCK_ANCHOR


def duck_trucker_layer(pose="hero", wave=0.0, wheel_deg=0.0, beak=0.0,
                       lean=-3.0, scale=1.20):
    """Trucker duck: mesh cap, aviators, flannel. pose in {'hero','window'}."""
    layer, c = new_layer(*DUCK_LAYER)
    pen = DuckPen(c, DUCK_ANCHOR, scale, lean=lean)
    hip = rot_pt(0.0, HIP_Y, 0.0, HIP_Y, -lean)

    if pose == "hero":
        draw_leg(pen, 0.60, 34.0, 24.0, False, hip)
        draw_leg(pen, 0.08, 34.0, 0.0, True, hip)
    else:
        # seated: carry the shirt down past the door sill
        pen.poly([(-40, 30), (36, 30), (42, 112), (-44, 112)], torso=True,
                 fill=FLANNEL_B + (255,))
    draw_wing(pen, BODY_C[0] - 8, BODY_C[1] + 4, deg=-18, length=40, near=False)
    draw_torso(pen)
    pen = apply_flannel(layer, pen)
    draw_head(pen, cap=True, shades=True, beak_open=beak, head_deg=-2)

    if pose == "hero":
        wx, wy = 74.0, 98.0
        draw_wing(pen, BODY_C[0] + 22, BODY_C[1] - 4, deg=24, length=46,
                  height=19, near=True, feathered=False)
        pen.ell(wx, wy, 28, 28, torso=True, outline=rgba(SHADE, 255), width=6.5)
        pen.ell(wx, wy, 28, 28, torso=True, outline=rgba(CHROME_DK, 110),
                width=2.0)
        for k in range(3):
            a = math.radians(wheel_deg + k * 120)
            pen.line([(wx, wy), (wx + 24 * math.cos(a), wy + 24 * math.sin(a))],
                     torso=True, width=4.0, fill=rgba(SHADE, 255))
        pen.circle(wx, wy, 7.0, torso=True, fill=CHROME + (255,))
        # wingtip curled over the rim
        pen.ell(wx - 20, wy - 12, 13, 10, deg=-24, torso=True,
                fill=BODY_SH + (255,), outline=rgba(BODY_EDGE, 190), width=1.6)
    else:
        # a wing raised clear of the head, waving goodbye
        deg = 108 + 24 * math.sin(wave * 2 * math.pi)
        a = math.radians(deg)
        sx, sy = BODY_C[0] - 10, BODY_C[1] + 26
        pen.line([(sx, sy), (sx - 26 * math.cos(a), sy + 26 * math.sin(a))],
                 torso=True, width=15, fill=BODY + (255,))
        pen.circle(sx, sy, 8.5, torso=True, fill=BODY + (255,))
        draw_wing(pen, sx - 40 * math.cos(a), sy + 40 * math.sin(a), deg=deg,
                  length=29, height=13, near=True)
    return layer, DUCK_ANCHOR


# --------------------------------------------------------------------------- #
# the rig
# --------------------------------------------------------------------------- #
def wheel(c, cx, cy, r, spin_deg):
    c.circle(cx, cy, r, fill=TIRE + (255,))
    c.circle(cx, cy, r * 0.96, fill=TIRE_LT + (255,))
    c.circle(cx, cy, r * 0.85, fill=TIRE + (255,))
    c.circle(cx, cy, r * 0.55, fill=HUB + (255,))
    c.circle(cx, cy, r * 0.50, fill=shade(HUB, 0.86) + (255,))
    for k in range(6):
        a = math.radians(spin_deg + k * 60)
        c.circle(cx + r * 0.34 * math.cos(a), cy + r * 0.34 * math.sin(a),
                 r * 0.09, fill=shade(HUB, 0.58) + (255,))
    c.circle(cx, cy, r * 0.16, fill=CHROME + (255,))
    for k in range(8):
        a = math.radians(spin_deg * 0.6 + k * 45)
        c.line([(cx + r * 0.88 * math.cos(a), cy + r * 0.88 * math.sin(a)),
                (cx + r * 1.0 * math.cos(a), cy + r * 1.0 * math.sin(a))],
               fill=rgba(TIRE_LT, 220), width=r * 0.12)


def draw_rig_back(c, tx, spin, S=RIG_S, ground=GROUND):
    """Chassis, stacks, cab shell and the open window - behind the duck."""
    def X(x):
        return tx + x * S

    def Y(y):
        return ground - y * S

    def L(v):
        return v * S

    # ---- ground shadow ----------------------------------------------
    c.ell(X(150), Y(4), L(260), L(16), fill=rgba((32, 32, 40), 95))

    # ---- chassis + deck behind the cab ------------------------------
    c.rect(X(-76), Y(64), X(214), Y(46), fill=(58, 58, 66, 255))
    c.rect(X(-76), Y(78), X(26), Y(64), fill=CHROME_DK + (255,))
    c.rrect(X(-58), Y(94), X(6), Y(78), L(5),
            fill=shade(CHROME_DK, 0.82) + (255,))
    c.poly([(X(-74), Y(46)), (X(-46), Y(46)), (X(-50), Y(6)),
            (X(-78), Y(6))], fill=(44, 44, 50, 255))          # mud flap

    # ---- chrome stacks ----------------------------------------------
    for sx in (-26, -6):
        c.rrect(X(sx - 7), Y(300), X(sx + 7), Y(74), L(6), fill=CHROME + (255,))
        c.rrect(X(sx - 6), Y(298), X(sx - 1), Y(76), L(3),
                fill=shade(CHROME, 1.08) + (255,))
        c.rrect(X(sx - 9), Y(304), X(sx + 9), Y(288), L(5),
                fill=CHROME_DK + (255,))
        c.rrect(X(sx - 8), Y(150), X(sx + 8), Y(138), L(4),
                fill=CHROME_DK + (255,))

    # ---- cab shell ---------------------------------------------------
    c.poly([(X(20), Y(58)), (X(20), Y(262)), (X(32), Y(278)),
            (X(182), Y(278)), (X(198), Y(258)), (X(206), Y(200)),
            (X(214), Y(182)), (X(214), Y(58))], fill=CAB_RED + (255,))
    c.poly([(X(20), Y(262)), (X(32), Y(278)), (X(182), Y(278)),
            (X(198), Y(258)), (X(198), Y(252)), (X(20), Y(252))],
           fill=CAB_LT + (255,))
    c.rect(X(20), Y(266), X(198), Y(260), fill=CAB_DK + (255,))
    # sun visor + marker lights
    c.poly([(X(22), Y(288)), (X(202), Y(286)), (X(208), Y(268)),
            (X(22), Y(272))], fill=CAB_DK + (255,))
    c.rect(X(24), Y(274), X(206), Y(268), fill=CHROME_DK + (255,))
    for k in range(5):
        c.circle(X(46 + k * 36), Y(280), L(5.0), fill=GOLD + (255,))

    # ---- window opening: dark interior, seat -------------------------
    c.rrect(X(28), Y(262), X(184), Y(148), L(12), fill=GLASS_DK + (255,))
    c.rrect(X(33), Y(256), X(180), Y(152), L(9),
            fill=shade(GLASS_DK, 0.62) + (255,))
    c.poly([(X(40), Y(152)), (X(84), Y(152)), (X(86), Y(226)),
            (X(42), Y(212))], fill=(64, 46, 46, 255))
    c.poly([(X(43), Y(156)), (X(80), Y(156)), (X(81), Y(220)),
            (X(46), Y(208))], fill=(92, 66, 64, 255))
    c.rrect(X(46), Y(250), X(80), Y(226), L(7), fill=(64, 46, 46, 255))
    # windshield wrapping the corner
    c.poly([(X(184), Y(258)), (X(200), Y(252)), (X(208), Y(200)),
            (X(186), Y(200))], fill=GLASS + (255,))
    c.poly([(X(187), Y(252)), (X(195), Y(250)), (X(200), Y(206)),
            (X(189), Y(206))], fill=rgba(WHITE, 95))
    c.line([(X(181), Y(264)), (X(181), Y(146))], fill=CAB_DK + (255,),
           width=L(5))


def draw_rig_front(c, tx, spin, S=RIG_S, ground=GROUND, headlight=0.0):
    """Door skin, hood and running gear - in front of the duck."""
    def X(x):
        return tx + x * S

    def Y(y):
        return ground - y * S

    def L(v):
        return v * S

    R = 46.0
    # ---- door below the sill ----------------------------------------
    c.rrect(X(22), Y(150), X(178), Y(62), L(8), fill=CAB_DK + (255,))
    c.rrect(X(26), Y(146), X(174), Y(66), L(7), fill=CAB_RED + (255,))
    c.rrect(X(32), Y(138), X(168), Y(74), L(5), fill=CAB_LT + (255,))
    c.rrect(X(36), Y(134), X(164), Y(78), L(4), fill=CAB_RED + (255,))
    c.rect(X(28), Y(152), X(176), Y(142), fill=CHROME + (255,))
    c.rrect(X(128), Y(128), X(156), Y(119), L(4), fill=CHROME + (255,))
    c.poly(star_pts(X(76), Y(110), L(16), L(7.0), 5, 0), fill=GOLD + (255,))
    c.rect(X(42), Y(92), X(160), Y(87), fill=CAB_STRIPE + (255,))
    c.rect(X(42), Y(86), X(160), Y(84), fill=GOLD + (255,))
    # mirror on the A-pillar
    c.line([(X(184), Y(246)), (X(202), Y(238))], fill=CHROME_DK + (255,),
           width=L(4))
    c.rrect(X(196), Y(254), X(212), Y(210), L(4), fill=SHADE + (255,))
    c.rrect(X(198), Y(251), X(210), Y(213), L(3), fill=GLASS + (255,))

    # ---- hood / nose -------------------------------------------------
    c.poly([(X(214), Y(200)), (X(318), Y(196)), (X(340), Y(182)),
            (X(340), Y(58)), (X(214), Y(58))], fill=CAB_RED + (255,))
    c.poly([(X(214), Y(200)), (X(318), Y(196)), (X(338), Y(183)),
            (X(214), Y(186))], fill=CAB_LT + (255,))
    c.rect(X(214), Y(150), X(340), Y(134), fill=CHROME + (255,))
    c.rect(X(214), Y(134), X(340), Y(128), fill=CHROME_DK + (255,))
    c.rect(X(214), Y(92), X(336), Y(87), fill=CAB_STRIPE + (255,))
    c.rect(X(214), Y(86), X(336), Y(84), fill=GOLD + (255,))
    # grille + bumper
    c.rrect(X(336), Y(186), X(370), Y(68), L(8), fill=CHROME + (255,))
    for k in range(9):
        y = 74 + k * 12
        c.rect(X(341), Y(y + 8), X(365), Y(y + 3), fill=CHROME_DK + (255,))
    c.rrect(X(338), Y(184), X(368), Y(172), L(4),
            fill=shade(CHROME, 1.08) + (255,))
    c.rrect(X(324), Y(66), X(380), Y(32), L(7), fill=CHROME + (255,))
    c.rrect(X(328), Y(62), X(376), Y(48), L(5),
            fill=shade(CHROME, 1.08) + (255,))
    # headlight
    if headlight > 0.02:
        for k in range(4):
            c.circle(X(352), Y(104), L(14 + 5 * k),
                     fill=rgba((255, 250, 210), 26 * headlight))
    c.circle(X(352), Y(104), L(14), fill=CHROME + (255,))
    c.circle(X(352), Y(104), L(9.5),
             fill=mix((250, 246, 210), GOLD, 0.2 + 0.5 * headlight) + (255,))
    # fuel tank + steps
    c.rrect(X(140), Y(58), X(214), Y(18), L(20), fill=CHROME + (255,))
    c.rrect(X(146), Y(52), X(208), Y(38), L(7),
            fill=shade(CHROME, 1.09) + (255,))
    c.rrect(X(152), Y(98), X(216), Y(58), L(10), fill=CHROME_DK + (255,))
    c.rrect(X(156), Y(94), X(212), Y(62), L(8), fill=CHROME + (255,))
    # fenders + wheels
    c.poly(ellipse_pts(X(290), Y(R), L(66), L(58), arc=(0.5, 1.0)) +
           [(X(290) - L(66), Y(R))], fill=CAB_DK + (255,))
    wheel(c, X(290), Y(R), L(R), spin)
    wheel(c, X(88), Y(R), L(R), spin)
    c.poly(ellipse_pts(X(88), Y(R), L(62), L(54), arc=(0.54, 0.96)),
           fill=CAB_DK + (255,))


# --------------------------------------------------------------------------- #
# effects
# --------------------------------------------------------------------------- #
def speed_lines(c, t, speed, density=1.0, seed=101, y0=None, y1=None,
                alpha=95.0):
    rnd = np.random.default_rng(seed)
    y0 = ROAD_TOP - 150 if y0 is None else y0
    y1 = H - 8 if y1 is None else y1
    for i in range(int(46 * density)):
        y = rnd.uniform(y0, y1)
        life = rnd.uniform(0.16, 0.34)
        phase = ((t - rnd.uniform(0, 10.0)) % life) / life
        if phase > 1.0 or phase < 0.0:
            continue
        length = rnd.uniform(40, 200) * (0.4 + speed)
        x = lerp(W + 140, -260, phase)
        near = clamp((y - y0) / max(y1 - y0, 1))
        a = alpha * math.sin(math.pi * phase) ** 0.7 * min(speed, 1.4) * \
            lerp(0.45, 1.0, near)
        wl = lerp(1.4, 3.4, near)
        c.poly([(x, y), (x + length * 0.8, y - wl), (x + length, y),
                (x + length * 0.8, y + wl)],
               fill=rgba(mix(WHITE, (228, 238, 250), 0.5), a))


def dust_puff(c, x, y, age, life, size, seed):
    if age < 0 or age > life:
        return
    u = age / life
    r = size * (0.4 + 1.35 * ease_out(u, 2.0))
    a = 135 * (1.0 - u) ** 1.4
    px, py = x - 150 * u, y - 26 * u - 10 * u * u
    col = mix((234, 227, 210), (198, 190, 175), u)
    c.poly(blob(px, py, r, 0.14, seed), fill=rgba(col, a * 0.55))
    c.poly(blob(px + r * 0.34, py - r * 0.24, r * 0.66, 0.16, seed + 1),
           fill=rgba(mix(col, WHITE, 0.45), a * 0.7))
    c.circle(px - r * 0.30, py + r * 0.16, r * 0.42,
             fill=rgba(mix(col, WHITE, 0.2), a * 0.5))


def sparkle(c, x, y, r, a, deg=0.0, col=(255, 248, 214)):
    c.poly(star_pts(x, y, r, r * 0.28, 4, deg), fill=rgba(col, a))
    c.circle(x, y, r * 0.22, fill=rgba(WHITE, a))


def gear(c, x, y, r, deg, col=CHROME_DK):
    pts = []
    for i in range(32):
        a = 2 * math.pi * i / 32 + math.radians(deg)
        rr = r if (i % 4) in (0, 1) else r * 0.78
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    c.poly(pts, fill=rgba(col, 235))
    c.circle(x, y, r * 0.3, fill=rgba((70, 76, 84), 255))


def speech_bubble(c, x, y, text, font, reveal=1.0, pop=1.0, tail_to=(0, 0)):
    """Rounded bubble with a tail; `reveal` types the line out."""
    shown = text[: max(int(round(len(text) * reveal)), 0)]
    tw = c.d.textlength(text, font=font) / SS
    th = font.size / SS * 1.02
    s = lerp(0.42, 1.0, pop)
    bw = (tw + 68) * s
    bh = (th + 52) * s
    x0, y0, x1, y1 = x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2

    # short tail pointing at the bill, rather than a wire stretched to it
    tx, ty = tail_to
    ax = clamp(tx, x0 + bw * 0.58, x1 - bw * 0.10)
    vx, vy = tx - ax, ty - y1
    vlen = max(math.hypot(vx, vy), 1e-3)
    reach = min(vlen, 96.0) * s
    tipx, tipy = ax + vx / vlen * reach, y1 + vy / vlen * reach
    tail = [(ax - 26 * s, y1 - 8), (ax + 16 * s, y1 - 10), (tipx, tipy)]

    c.poly([(p[0] + 4, p[1] + 7) for p in tail], fill=rgba(INK, 45))
    c.rrect(x0 + 4, y0 + 7, x1 + 4, y1 + 7, 26 * s, fill=rgba(INK, 45))
    c.poly(tail, fill=WHITE + (255,), outline=INK + (255,), width=3.4)
    c.rrect(x0, y0, x1, y1, 26 * s, fill=WHITE + (255,), outline=INK + (255,),
            width=3.4)
    c.poly([(tail[0][0] + 3, tail[0][1] - 3), (tail[1][0] - 3, tail[1][1] - 3),
            (tail[1][0] - 3, tail[1][1] + 4), (tail[0][0] + 3, tail[0][1] + 4)],
           fill=WHITE + (255,))
    if pop > 0.9 and shown:
        c.text((x0 + 34 * s, y - th * 0.06), shown, font, INK + (255,),
               anchor="lm")
        if reveal < 1.0:
            cw = c.d.textlength(shown, font=font) / SS
            c.rrect(x0 + 34 * s + cw + 3, y - th * 0.42,
                    x0 + 34 * s + cw + 7, y + th * 0.42, 2,
                    fill=rgba(INK, 210 if (int(reveal * 40) % 2 == 0) else 50))


_VIGNETTE = None


def vignette():
    global _VIGNETTE
    if _VIGNETTE is None:
        yy, xx = np.mgrid[0:H, 0:W]
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 * 0.92 +
                    ((yy - H / 2) / (H / 2)) ** 2)
        arr = np.zeros((H, W, 4), dtype=np.uint8)
        arr[:, :, 3] = (np.clip((r - 0.72) / 0.75, 0, 1) ** 1.7 * 112) \
            .astype(np.uint8)
        _VIGNETTE = Image.fromarray(arr, "RGBA").resize((W * SS, H * SS),
                                                        Image.BILINEAR)
    return _VIGNETTE


# --------------------------------------------------------------------------- #
# motion: run cycle, camera speed, cues
# --------------------------------------------------------------------------- #
def speed_at(t):
    if t < T_SPIN:
        return lerp(0.86, 1.24, smooth(0.0, 2.8, t))
    if t < T_FLASH:
        return lerp(1.24, 0.18, smooth(T_SPIN, T_FLASH - 0.1, t))
    if t < T_TRUCK_IN:
        return lerp(0.18, 0.0, smooth(T_FLASH, T_TRUCK_IN, t))
    if t < T_EXIT:
        return lerp(0.0, 0.80, smooth(T_TRUCK_IN, T_TRUCK_IN + 0.9, t))
    return lerp(0.80, 2.5, ease_in(smooth(T_EXIT, T_EXIT + 0.85, t), 1.6))


def stride_freq(t):
    return lerp(3.9, 5.3, smooth(0.0, 2.8, t))


def build_motion():
    """Integrate scroll distance + stride phase; collect footstep cues."""
    sub = 8
    dt = 1.0 / (FPS * sub)
    dist = phase = t = 0.0
    scroll, phases, steps = [0.0], [0.0], []
    prev_a = prev_b = 0.0
    for i in range(N_FRAMES * sub):
        sp = speed_at(t)
        dist += sp * dt
        if t < T_SPIN:
            phase += stride_freq(t) * dt
        t += dt
        a, b = phase % 1.0, (phase + 0.5) % 1.0
        if t < T_SPIN + 0.05:
            for cur, prev in ((a, prev_a), (b, prev_b)):
                if cur < prev:                 # wrapped -> foot strike
                    steps.append((t, min(0.4 + sp * 0.6, 1.0)))
        prev_a, prev_b = a, b
        if (i + 1) % sub == 0:
            scroll.append(dist)
            phases.append(phase)
    return scroll, phases, steps


SCROLL, PHASES, STEPS = build_motion()


def build_puffs():
    puffs = [dict(t=st, x=DUCK_X - 18, y=GROUND + 6, life=0.60,
                  size=14 + 9 * hard, seed=500 + k * 3)
             for k, (st, hard) in enumerate(STEPS)]
    for k in range(9):
        puffs.append(dict(t=T_REVEAL + 0.30 + k * 0.012,
                          x=HERO_X + 20 - 20 * k, y=GROUND + 8,
                          life=0.85, size=24 + 3 * k, seed=800 + k * 5))
    rnd = np.random.default_rng(77)
    for k in range(20):
        puffs.append(dict(t=T_EXIT + 0.02 + k * 0.035,
                          x=620 - 22 * k + rnd.uniform(-26, 26),
                          y=GROUND + 6 + rnd.uniform(-10, 6),
                          life=0.95, size=22 + 2.4 * k + rnd.uniform(-5, 5),
                          seed=900 + k * 7))
    return puffs


PUFFS = build_puffs()


# --------------------------------------------------------------------------- #
# frame assembly
# --------------------------------------------------------------------------- #
BG = {}
FONT_LINE = None


def init_render():
    global FONT_LINE
    BG["sky"] = build_sky()
    BG["clouds"] = build_clouds()
    BG["hills"] = build_hills()
    BG["trees"] = build_trees()
    BG["field"] = build_field()
    BG["road"] = build_road()
    BG["verge"] = build_verge()
    FONT_LINE = load_font(int(40 * SS))
    os.makedirs(OUT_DIR, exist_ok=True)


def paste_strip(base, key, offset):
    img = BG[key]
    sw = STRIP_W * SS
    off = int(round(-offset * SS)) % sw
    for x in (off - sw, off, off + sw):
        base.paste(img, (int(x), 0), img)


def truck_x_at(t):
    """Left edge of the cab in screen coordinates."""
    if t < T_TRUCK_IN:
        return W + 520
    if t < T_SEAT:
        return lerp(W + 520, 588, ease_out(smooth(T_TRUCK_IN, T_SEAT, t), 2.4))
    if t < T_EXIT:
        u = smooth(T_SEAT, T_EXIT, t)
        return lerp(588, 566, u) + 4.0 * math.sin(t * 9.0) * (1 - u * 0.5)
    return 566 + 1560 * ease_in(smooth(T_EXIT, TOTAL, t), 2.1)


def render_frame(i):
    t = i / FPS
    base = BG["sky"].copy()
    c = Canvas(base)
    d = SCROLL[min(i, len(SCROLL) - 1)]
    phase = PHASES[min(i, len(PHASES) - 1)]
    sp = speed_at(t)

    paste_strip(base, "clouds", d * 26)
    paste_strip(base, "hills", d * 74)
    paste_strip(base, "trees", d * 250)
    paste_strip(base, "field", d * 520)
    paste_strip(base, "road", d * 1180)
    if sp > 0.25:
        speed_lines(c, t, sp * 0.9, density=clamp(sp / 1.2, 0.2, 1.0),
                    y1=ROAD_TOP + 60, alpha=80)

    # ---------------- running duck ------------------------------------
    if t < T_SPIN + 0.02:
        x = lerp(-220, DUCK_X, ease_out(smooth(0.0, 0.55, t), 2.2))
        for g, (dx, al) in enumerate(((38, 0.20), (74, 0.10))):
            gl, ga = duck_run_layer(phase - 0.045 * (g + 1) * sp)
            gl.putalpha(gl.getchannel("A").point(lambda v, al=al: int(v * al)))
            stamp(base, gl, x - dx - ga[0], GROUND - ga[1])
        c.ell(x + 6, GROUND + 10, 62, 11, fill=rgba((40, 40, 48), 95))
        layer, anch = duck_run_layer(phase, lean=lerp(12, 20, smooth(0, 2.4, t)))
        stamp(base, layer, x - anch[0], GROUND - anch[1])

    # ---------------- wind-up, spin, blast ---------------------------
    if T_SPIN <= t < T_FLASH + 0.06:
        u = smooth(T_SPIN, T_FLASH, t)
        spin_deg = -(u ** 2.0) * 2100.0
        crouch = math.sin(math.pi * clamp(u / 0.16)) if u < 0.16 else 0.0
        lift = 168 * math.sin(math.pi * clamp((u - 0.10) / 0.94) ** 0.82)
        scale = lerp(1.0, 0.66, ease_in(u, 1.5))
        cx, cy = DUCK_X, GROUND - lift + 14 * crouch

        ball, anch = duck_ball_layer()
        if scale != 1.0:
            ball = ball.resize((max(int(ball.width * scale), 8),
                                max(int(ball.height * scale), 8)),
                               Image.LANCZOS)
            anch = (anch[0] * scale, anch[1] * scale)
        body_y = cy - BODY_C[1] * RUN_SCALE * scale

        # glow behind the ball
        for k in range(5):
            c.circle(cx, body_y, lerp(52, 128, u) * (0.5 + 0.16 * k),
                     fill=rgba((255, 242, 200), 26 * (1 - k / 5) * (0.3 + u)))

        # rotational smear: several evenly-spaced copies, then blur
        copies = 1 if u < 0.14 else 5
        for k in range(copies):
            rot = ball.rotate(spin_deg + k * 360.0 / copies,
                              resample=Image.BICUBIC, expand=True)
            if u > 0.12:
                rot = rot.filter(ImageFilter.GaussianBlur(
                    (u - 0.12) * 11 * SS + 1))
            if k:
                rot.putalpha(rot.getchannel("A").point(
                    lambda v: int(v * 0.34)))
            ox = (rot.width - ball.width) / 2 / SS
            oy = (rot.height - ball.height) / 2 / SS
            stamp(base, rot, cx - anch[0] - ox, cy - anch[1] - oy)

        # energy ring + orbiting sparks, centred on his body
        ring_r = lerp(56, 210, ease_out(u, 1.7))
        c.ell(cx, body_y, ring_r, ring_r * 0.32,
              outline=rgba((255, 240, 190), 215 * (1 - u * 0.45)), width=6)
        c.ell(cx, body_y, ring_r * 0.66, ring_r * 0.21,
              outline=rgba(WHITE, 160 * (1 - u * 0.4)), width=3)
        for k in range(14):
            a = math.radians(spin_deg * 0.45 + k * 360 / 14)
            rr = ring_r * (0.55 + 0.45 * math.sin(k * 1.7 + u * 6))
            sparkle(c, cx + rr * math.cos(a), body_y + rr * 0.34 * math.sin(a),
                    lerp(4, 13, u) * (0.6 + 0.4 * math.sin(k * 2.1)),
                    215 * (0.35 + 0.65 * u), deg=spin_deg * 0.3)
        for k in range(3):
            a = spin_deg * 0.8 + k * 120
            gear(c, cx + (ring_r + 30) * math.cos(math.radians(a)) * 0.9,
                 body_y - 20 + ring_r * 0.36 * math.sin(math.radians(a)),
                 (19 + 7 * k) * (0.45 + 0.6 * u), -a * 2)

    # ---------------- trucker duck + rig -----------------------------
    tx = truck_x_at(t)
    bill_x = bill_y = None

    if T_REVEAL <= t < T_SEAT:
        u = smooth(T_REVEAL, T_SEAT, t)
        drop = lerp(-320, 0, ease_out(u, 2.6))
        bounce = 22 * math.sin(math.pi * clamp((u - 0.70) / 0.30)) if u > 0.70 else 0.0
        layer, anch = duck_trucker_layer(pose="hero", wheel_deg=t * 300,
                                         lean=lerp(-16, -3, u), beak=0.18)
        if u > 0.5:
            c.ell(HERO_X + 8, GROUND + 10, lerp(26, 68, u), 12,
                  fill=rgba((40, 40, 48), 95 * u))
        stamp(base, layer, HERO_X - anch[0], GROUND + drop - bounce - anch[1])
        if 0.70 < u < 1.0:
            k = (u - 0.70) / 0.30
            c.ell(HERO_X, GROUND + 6, lerp(20, 230, k), lerp(6, 36, k),
                  outline=rgba((250, 240, 214), 200 * (1 - k)), width=5)

    if t >= T_TRUCK_IN and tx < W + 620:
        spin = -d * 1180 / (46.0 * RIG_S) * 57.3
        draw_rig_back(c, tx, spin)

        if t >= T_SEAT - 0.14:
            settle = smooth(T_SEAT - 0.14, T_SEAT + 0.22, t)
            beak = 0.0
            if T_VOICE - 0.04 <= t <= T_VOICE + 1.56:
                beak = 0.26 + 0.34 * abs(math.sin((t - T_VOICE) * 15.5))
            wave = (t - T_WAVE) * 2.5 if t >= T_WAVE else 0.0
            layer, anch = duck_trucker_layer(pose="window", wave=wave,
                                             beak=beak, lean=-2.0,
                                             scale=SEAT_SCALE)
            layer = ImageOps.mirror(layer)
            lw = layer.width / SS
            m_anchor_x = lw - anch[0]
            px = tx + SEAT_DX - m_anchor_x
            py = SEAT_Y + lerp(34, 0, settle) - anch[1]
            stamp(base, layer, px, py)
            bill_x = px + lw - (DUCK_ANCHOR[0] + BILL_TIP[0] * SEAT_SCALE)
            bill_y = py + DUCK_ANCHOR[1] - BILL_TIP[1] * SEAT_SCALE

        draw_rig_front(c, tx, spin,
                       headlight=smooth(T_TRUCK_IN, T_TRUCK_IN + 0.5, t))

    # ---------------- foreground -------------------------------------
    for p in PUFFS:
        dust_puff(c, p["x"], p["y"], t - p["t"], p["life"], p["size"],
                  p["seed"])
    paste_strip(base, "verge", d * 1700)
    if sp > 0.25:
        speed_lines(c, t, sp, density=clamp(sp / 1.4, 0.2, 0.8), seed=202,
                    y0=H - 120, y1=H - 6, alpha=110)

    # ---------------- the line ---------------------------------------
    if t >= T_BUBBLE and bill_x is not None:
        pop = smooth(T_BUBBLE, T_BUBBLE + 0.26, t)
        pop = pop * (1.0 + 0.10 * math.sin(pop * math.pi * 2.2) * (1 - pop))
        reveal = clamp((t - T_VOICE) / max(T_TYPE_END - T_VOICE, 0.01))
        fade = 1.0 - smooth(T_HORN + 0.05, T_EXIT + 0.25, t)
        if fade > 0.02:
            bub, bc = new_layer(760, 300)
            by = 178 - 7 * math.sin(t * 2.1)
            speech_bubble(bc, 312 - 10, by - 60, LINE, FONT_LINE,
                          reveal=reveal, pop=pop,
                          tail_to=(bill_x - 10 - 10, bill_y - 60 - 4))
            if fade < 1.0:
                bub.putalpha(bub.getchannel("A").point(
                    lambda v: int(v * fade)))
            stamp(base, bub, 10, 60)

    # ---------------- grade ------------------------------------------
    vig = vignette()
    base.paste(vig, (0, 0), vig)

    flash = 0.0
    if T_FLASH - 0.22 <= t <= T_REVEAL + 0.42:
        if t < T_FLASH:
            flash = ease_in(smooth(T_FLASH - 0.22, T_FLASH, t), 2.0)
        elif t < T_FLASH + 0.10:
            flash = 1.0
        else:
            flash = 1.0 - ease_in(smooth(T_FLASH + 0.10, T_REVEAL + 0.42, t),
                                  1.2)
    if flash > 0.003:
        c.rect(0, 0, W, H, fill=rgba((255, 252, 242), 255 * clamp(flash)))
        for k in range(16):
            a = k * 360 / 16 + t * 40
            rr = lerp(120, 900, 1 - flash)
            sparkle(c, W * 0.42 + rr * math.cos(math.radians(a)),
                    H * 0.52 + rr * 0.6 * math.sin(math.radians(a)),
                    26 * flash + 6, 220 * flash, deg=a)

    if t < 0.35:
        c.rect(0, 0, W, H,
               fill=rgba((10, 10, 14), 255 * (1 - smooth(0.0, 0.35, t))))
    if t > TOTAL - 0.55:
        c.rect(0, 0, W, H,
               fill=rgba((10, 10, 14), 255 * smooth(TOTAL - 0.55, TOTAL, t)))

    return base.resize((W, H), Image.LANCZOS)


# --------------------------------------------------------------------------- #
# drivers
# --------------------------------------------------------------------------- #
def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def render_stills(frames):
    init_render()
    for i in frames:
        render_frame(i).save(os.path.join(OUT_DIR, "still_%03d.png" % i))
        print("wrote still_%03d.png  t=%.2f" % (i, i / FPS), flush=True)


def render_video(path):
    init_render()
    wav = os.path.join(OUT_DIR, "soundtrack.wav")
    print("synthesising audio ...", flush=True)
    duck_audio.write_wav(wav, duck_audio.build_soundtrack(dict(
        total=TOTAL, spin=T_SPIN, flash=T_FLASH, truck_in=T_TRUCK_IN,
        voice=T_VOICE, horn=T_HORN, exit=T_EXIT, footsteps=STEPS)))

    cmd = [ffmpeg_exe(), "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (W, H),
           "-r", str(FPS), "-i", "-", "-i", wav,
           "-c:v", "libx264", "-preset", "slow", "-crf", "19",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart",
           "-c:a", "aac", "-b:a", "192k", "-shortest", path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    print("rendering %d frames ..." % N_FRAMES, flush=True)
    for i in range(N_FRAMES):
        proc.stdin.write(render_frame(i).tobytes())
        if i % 20 == 0:
            print("  %3d/%d  t=%.2fs" % (i, N_FRAMES, i / FPS), flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ffmpeg failed")
    print("wrote", path)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stills":
        render_stills([int(a) for a in sys.argv[2:]] or
                      [20, 60, 115, 130, 140, 150, 170, 205, 250])
    else:
        render_video(os.path.join(OUT_DIR, "trucker-duck.mp4"))

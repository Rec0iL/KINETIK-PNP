"""Seitenhintergründe der themed PDFs (prozedural, 1024x1456 wie das Seitenbild der PDF-Vorlage)."""
import numpy as np
from PIL import Image, ImageFilter

W, H = 1024, 1456


def _noise(rng, amount, scale=1):
    n = rng.normal(0, amount, (H // scale + 1, W // scale + 1))
    if scale > 1:
        n = np.asarray(Image.fromarray(n.astype(np.float32)).resize((W, H), Image.BICUBIC))
    return n[:H, :W]


def _vignette(strength):
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    return 1 - strength * np.clip(r - 0.5, 0, 1) ** 1.6


def _save(a, path):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(path, "JPEG", quality=88)


def _base(hex_color):
    c = np.array([int(hex_color[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)
    return np.ones((H, W, 3), dtype=np.float32) * c


def make(theme, path):
    rng = np.random.default_rng(abs(hash(theme)) % 2**32)
    yy, xx = np.mgrid[0:H, 0:W]
    if theme == "sincity":
        a = _base("#000000")
        a += (_noise(rng, 3))[..., None]
        # Lichtband durch die Jalousie
        band = (((xx + yy * 0.6) % 260) < 36).astype(np.float32) * 9
        a += band[..., None]
        _save(a, path)
    elif theme == "wushu":
        a = _base("#e8dec6")
        a += (_noise(rng, 5) + _noise(rng, 7, 6))[..., None] * np.array([1, 0.95, 0.85])
        wash = np.asarray(Image.fromarray((rng.random((H // 64 + 1, W // 64 + 1)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(40))).astype(np.float32)
        a -= ((wash - 128) / 128 * 10)[..., None] * np.array([1, 1, 1.2])
        a *= _vignette(0.12)[..., None]
        _save(a, path)
    elif theme == "pixel":
        a = _base("#1a1c2c")
        chk = (((xx // 4) + (yy // 4)) % 2).astype(np.float32) * 5
        a += chk[..., None] * np.array([0.8, 0.9, 1.4])
        _save(a, path)
    elif theme == "manga":
        a = _base("#f1eee6")
        a += _noise(rng, 2)[..., None]
        # Rasterpunkte, die zur unteren linken Ecke dichter werden
        d = np.hypot(((xx % 10) - 5), ((yy % 10) - 5))
        fade = np.clip(1 - np.hypot(xx / W, (H - yy) / H) / 0.9, 0, 1)
        dots = (d < 1.2 + 1.8 * fade).astype(np.float32) * fade * 40
        a -= dots[..., None]
        _save(a, path)
    elif theme == "ukiyo":
        a = _base("#0e2135")
        a += _noise(rng, 2.5)[..., None]
        # Seigaiha: überlappende Halbkreisringe, nach oben ausgeblendet
        r = 38
        ys, xs = (yy % r), ((xx + (yy // r % 2) * r) % (2 * r))
        dist = np.hypot(xs - r, ys)
        rings = ((dist % 12) < 2) & (dist < r)
        fade = np.clip((yy - H * 0.45) / (H * 0.55), 0, 1)
        a += (rings * fade * 16)[..., None] * np.array([0.9, 0.9, 0.8])
        a *= _vignette(0.2)[..., None]
        _save(a, path)
    elif theme == "western":
        a = _base("#170f0a")
        a += _noise(rng, 6)[..., None] * np.array([1, 0.85, 0.6])
        a *= _vignette(0.45)[..., None]
        _save(a, path)
    elif theme == "akte":
        a = _base("#d9c8a0")
        a += (_noise(rng, 6) + _noise(rng, 6, 5))[..., None] * np.array([1, 0.92, 0.75])
        ring = np.abs(np.hypot(xx - W * 0.82, yy - H * 0.12) - 60) < 3
        a -= (np.asarray(Image.fromarray((ring * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255 * 30)[..., None] * np.array([0.4, 0.8, 1.3])
        a *= _vignette(0.2)[..., None]
        _save(a, path)
    elif theme == "terminal":
        a = _base("#030605")
        grid = (((xx % 48) < 1) | ((yy % 48) < 1)).astype(np.float32) * 9
        scan = ((yy % 3) == 0).astype(np.float32) * -2
        a += (grid + scan)[..., None] * np.array([0.3, 1, 0.7])
        a *= _vignette(0.4)[..., None]
        _save(a, path)
    elif theme == "hybrid":
        a = _base("#07061a")
        grid = (((xx % 56) < 1) | ((yy % 56) < 1)).astype(np.float32) * 10
        a += grid[..., None] * np.array([0.7, 0.55, 1.2])
        glow1 = np.exp(-(((xx - W * 0.85) / 380) ** 2 + ((yy - H * 0.08) / 330) ** 2)) * 38
        glow2 = np.exp(-(((xx - W * 0.1) / 360) ** 2 + ((yy - H * 0.92) / 340) ** 2)) * 30
        a += glow1[..., None] * np.array([1, 0.15, 0.85]) + glow2[..., None] * np.array([0.1, 0.9, 1])
        _save(a, path)
    else:
        raise ValueError(theme)

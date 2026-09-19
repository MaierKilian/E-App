"""Erzeugt die QR-Codes zur Landing Page im E-App-Design.

Aufruf:  python3 docs/assets/qr-generator.py
Braucht: pip install qrcode pillow

Die Formensprache stammt aus dem Logo (public/favicon.svg): drei schräge
Balken im Treppenmuster, runde Ecken, Marken-Grün auf Fast-Schwarz. Übersetzt
auf den Code heißt das: zusammenhängende Module verschmelzen zu Balken, die
Sucher-Quadrate sind runde Ringe, der Verlauf läuft im Neigungswinkel der
Logo-Balken, und in der Mitte steht die App-Kachel.

Fehlerkorrektur-Stufe H (bis 30 % wiederherstellbar) trägt zweierlei: die
freigestellte Mitte für das Logo (~7 % der Module) und das Abscannen einer
projizierten Folie aus Entfernung.
"""

import math
import os

import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

URL = "https://e-app-info.web.app/"
OUT = os.path.dirname(os.path.abspath(__file__)) + "/"

M = 40               # Pixel je Modul
BORDER = 4           # Ruhezone in Modulen (Norm: mindestens 4)
PILL = 0.86          # Dicke der Balken, Anteil eines Moduls
LOGO_MODULES = 9.0   # Kantenlänge des freigestellten Mittelfelds
TILE_RATIO = 0.82    # Kachel darin; der Rest bleibt Luft zum Code

# Theme-Farben aus src/index.css
BLACK = (0x18, 0x18, 0x1B)       # --primary (hell)
GREEN = (0x5A, 0x8A, 0x1B)       # --success / HTW-Grün
OFFWHITE = (0xFA, 0xFA, 0xFA)    # --fg (dunkel)
LIGHTGREEN = (0xA3, 0xD6, 0x5C)
MUTED_LIGHT = (0x71, 0x71, 0x7A)
BORDER_LIGHT = (0xE4, 0xE4, 0xE7)
MUTED_DARK = (0xA1, 0xA1, 0xAA)
BORDER_DARK = (0x2B, 0x2B, 0x30)
SURFACE_DARK = (0x1D, 0x1D, 0x21)

# Logo-Balken aus public/favicon.svg, viewBox 0 0 100 100
LOGO_BARS = [
    [(26.44, 39.36), (62.81, 18.08), (68.24, 20.51), (31.87, 41.79)],
    [(14.28, 63.38), (49.32, 43.16), (54.56, 45.47), (19.52, 65.69)],
    [(43.16, 69.53), (79.53, 47.72), (84.96, 50.21), (48.59, 72.02)],
]

FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf"
CARD_W = 1500


def qr_matrix():
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=M, border=BORDER)
    qr.add_data(URL)
    qr.make(fit=True)
    n = qr.modules_count
    # get_matrix() liefert die Ruhezone mit; wir zeichnen sie selbst.
    core = [row[BORDER:BORDER + n] for row in qr.get_matrix()[BORDER:BORDER + n]]
    return core, n, qr.version


def px(i):
    """Modul-Index -> Pixel-Koordinate der linken oberen Ecke."""
    return (i + BORDER) * M


def in_finder(r, c, n):
    """Modul im Sucher-Quadrat samt Trennzone (8x8)?"""
    return (r < 8 and c < 8) or (r < 8 and c >= n - 8) or (r >= n - 8 and c < 8)


def logo_box(n):
    start = (n - LOGO_MODULES) / 2
    return start, start + LOGO_MODULES


def in_logo(r, c, n):
    a, b = logo_box(n)
    return a <= r < b and a <= c < b


def draw_pills(d, matrix, n):
    """Waagerechte und senkrechte Läufe als Pillen zeichnen.

    Einzelne Module werden dadurch zu Kreisen, Läufe zu durchgehenden Balken –
    die Übersetzung der drei Logo-Balken ins Raster.
    """
    t = PILL * M
    off = (M - t) / 2

    def usable(r, c):
        return matrix[r][c] and not in_finder(r, c, n) and not in_logo(r, c, n)

    for r in range(n):
        c = 0
        while c < n:
            if usable(r, c):
                c0 = c
                while c + 1 < n and usable(r, c + 1):
                    c += 1
                d.rounded_rectangle(
                    [px(c0) + off, px(r) + off, px(c) + M - off, px(r) + M - off],
                    radius=t / 2, fill=255)
            c += 1

    for c in range(n):
        r = 0
        while r < n:
            if usable(r, c):
                r0 = r
                while r + 1 < n and usable(r + 1, c):
                    r += 1
                d.rounded_rectangle(
                    [px(c) + off, px(r0) + off, px(c) + M - off, px(r) + M - off],
                    radius=t / 2, fill=255)
            r += 1


def draw_finders(d, n):
    """Sucher-Quadrate als runde Ringe mit rundem Kern."""
    for (r, c) in [(0, 0), (0, n - 7), (n - 7, 0)]:
        x, y = px(c), px(r)
        d.rounded_rectangle([x, y, x + 7 * M, y + 7 * M], radius=2.1 * M, fill=255)
        d.rounded_rectangle([x + M, y + M, x + 6 * M, y + 6 * M],
                            radius=1.4 * M, fill=0)
        d.rounded_rectangle([x + 2 * M, y + 2 * M, x + 5 * M, y + 5 * M],
                            radius=1.1 * M, fill=255)


def gradient(size, c_from, c_to, angle_deg=30):
    """Linearer Verlauf im Neigungswinkel der Logo-Balken."""
    w, h = size
    img = Image.new("RGB", (w, h))
    pixels = img.load()
    a = math.radians(angle_deg)
    dx, dy = math.cos(a), math.sin(a)
    span = abs(w * dx) + abs(h * dy)
    for y in range(h):
        for x in range(w):
            t = min(1.0, max(0.0, (x * dx + y * dy) / span))
            pixels[x, y] = tuple(
                int(c_from[i] + (c_to[i] - c_from[i]) * t) for i in range(3))
    return img


def logo_tile(size, tile_color, bar_color):
    """App-Kachel: rundes Quadrat mit den drei Balken – wie favicon.svg.

    Als ganze Kachel statt nur der Balken, weil die Balken allein bei dieser
    Größe als drei Kratzer lesen, nicht als Marke.
    """
    ss = 4  # Supersampling gegen Treppchen an den schrägen Kanten
    n = size * ss
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = n / 100
    d.rounded_rectangle([0, 0, n, n], radius=22 * s, fill=tile_color)
    for bar in LOGO_BARS:
        d.polygon([(x * s, y * s) for (x, y) in bar], fill=bar_color)
    return img.resize((size, size), Image.LANCZOS)


def build(name, c_from, c_to, tile_color, bar_color, bg=None):
    matrix, n, version = qr_matrix()
    side = (n + 2 * BORDER) * M

    mask = Image.new("L", (side, side), 0)
    d = ImageDraw.Draw(mask)
    draw_pills(d, matrix, n)
    draw_finders(d, n)

    img = Image.new("RGBA", (side, side), bg if bg else (0, 0, 0, 0))
    img.paste(gradient((side, side), c_from, c_to).convert("RGBA"), (0, 0), mask)

    a, b = logo_box(n)
    box_px = (b - a) * M
    tsize = int(box_px * TILE_RATIO)
    tx = int(px(a) + (box_px - tsize) / 2)
    tile = logo_tile(tsize, tile_color, bar_color)
    img.paste(tile, (tx, tx), tile)

    img.save(OUT + name)
    print(f"{name}: {side}x{side}px, Version {version}, {n}x{n} Module")
    return OUT + name


def card(name, qr_path, surface, fg, muted, border, tile_bg, tile_bar, accent):
    """Fertige Karte für die Folie: Marke, Code, URL – nichts mehr dazuzusetzen."""
    qr_size = 1060
    qr = Image.open(qr_path).convert("RGBA").resize((qr_size, qr_size), Image.LANCZOS)

    pad, head_y, tile_px, qr_y = 90, 104, 128, 300
    url_y = qr_y + qr_size + 4
    hint_y = url_y + 88
    h = hint_y + 78 + pad

    img = Image.new("RGBA", (CARD_W, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([2, 2, CARD_W - 2, h - 2], radius=72,
                        fill=surface, outline=border, width=3)

    f_name = ImageFont.truetype(FONT % "Bold", 92)
    total = tile_px + 30 + d.textlength("E-App", font=f_name)
    x = (CARD_W - total) / 2
    tile = logo_tile(tile_px, tile_bg, tile_bar)
    img.paste(tile, (int(x), head_y), tile)
    d.text((x + tile_px + 30, head_y + tile_px / 2), "E-App",
           font=f_name, fill=fg, anchor="lm")

    d.text((CARD_W / 2, head_y + tile_px + 42), "Energieanalyse für zuhause",
           font=ImageFont.truetype(FONT % "Regular", 46), fill=muted, anchor="mm")

    img.paste(qr, (int((CARD_W - qr_size) / 2), qr_y), qr)

    d.text((CARD_W / 2, url_y), "e-app-info.web.app",
           font=ImageFont.truetype(FONT % "Bold", 56), fill=accent, anchor="mm")
    d.text((CARD_W / 2, hint_y), "Scannen und direkt ausprobieren",
           font=ImageFont.truetype(FONT % "Regular", 42), fill=muted, anchor="mm")

    img.save(OUT + name)
    print(f"{name}: {CARD_W}x{h}px")


if __name__ == "__main__":
    hell = build("eapp-qr-design.png", BLACK, GREEN,
                 BLACK + (255,), OFFWHITE + (255,))
    dunkel = build("eapp-qr-design-dunkel.png", OFFWHITE, LIGHTGREEN,
                   OFFWHITE + (255,), BLACK + (255,))
    build("eapp-qr-design-weiss-hintergrund.png", BLACK, GREEN,
          BLACK + (255,), OFFWHITE + (255,), bg=(255, 255, 255, 255))

    card("eapp-qr-karte.png", hell,
         surface=(0xFF, 0xFF, 0xFF, 255), fg=(0x09, 0x09, 0x0B),
         muted=MUTED_LIGHT, border=BORDER_LIGHT,
         tile_bg=BLACK + (255,), tile_bar=OFFWHITE + (255,), accent=GREEN)
    card("eapp-qr-karte-dunkel.png", dunkel,
         surface=SURFACE_DARK + (255,), fg=OFFWHITE,
         muted=MUTED_DARK, border=BORDER_DARK,
         tile_bg=OFFWHITE + (255,), tile_bar=BLACK + (255,), accent=LIGHTGREEN)

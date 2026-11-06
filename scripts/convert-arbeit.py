# Echte Arbeitsfotos (Google-Unternehmensprofil, Rechte beim Betrieb) -> assets/img/arbeit/<name>-<w>.{webp,avif,jpg} + Manifest-Eintrag "arbeit/<name>".
# Gleiche Qualität wie convert-new.py (WebP q90, AVIF q80, JPG q90 progressive). EXIF/GPS wird nicht übernommen (PIL schreibt ohne exif=).
# Aufruf (relativ zum Repo-Root): python scripts/convert-arbeit.py <Quellordner>
# Hochformat-Einzelfotos werden mittig-vertikal auf 4:5 beschnitten (Offset aus CROP), das echte Vorher/Nachher-Paar bleibt unbeschnitten.
import os, sys, json
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, "assets", "img", "arbeit")
MAN = os.path.join(ROOT, "assets", "img", "manifest.json")
# name -> (Quelldatei, Breiten, Fallback-JPG-Breite, Beschnitt 4:5 mit oberer Kante in Px der Quelle oder None)
JOBS = {
    "gbp-hecke-05-vorher":      ("gbp-hecke-05-vorher.jpg",  [480, 675], 675, None),
    "gbp-hecke-05-nachher":     ("gbp-hecke-05-nachher.jpg", [480, 675], 675, None),
    "gbp-hecke-06-einfahrt":    ("gbp-06.jpg",               [480, 768, 1024], 1024, 160),
    "gbp-hecke-08-kirschlorbeer": ("gbp-08.jpg",             [480, 768, 1024], 1024, 252),
}
manifest = json.load(open(MAN, encoding="utf-8"))
os.makedirs(DST, exist_ok=True)
def rs(im, w):
    return im if w >= im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
for name, (fn, widths, fb_w, top) in JOBS.items():
    im = Image.open(os.path.join(SRC, fn)).convert("RGB")
    if top is not None:
        h45 = round(im.width * 5 / 4)
        im = im.crop((0, top, im.width, top + h45))
    ow, oh = im.width, im.height
    out = []
    for w in widths:
        r = rs(im, w); out.append(r.width)
        r.save(os.path.join(DST, f"{name}-{r.width}.webp"), "WEBP", quality=90, method=6)
        r.save(os.path.join(DST, f"{name}-{r.width}.avif"), "AVIF", quality=80, speed=4)
    fb = rs(im, fb_w)
    fb.save(os.path.join(DST, f"{name}-{fb.width}.jpg"), "JPEG", quality=90, optimize=True, progressive=True)
    manifest[f"arbeit/{name}"] = {"w": ow, "h": oh, "widths": sorted(set(out)), "avif": True, "fb_ext": "jpg", "fb_w": fb.width}
    print(f"OK arbeit/{name:30} {ow}x{oh} widths={sorted(set(out))}")
json.dump(manifest, open(MAN, "w", encoding="utf-8"), ensure_ascii=False, indent=0)

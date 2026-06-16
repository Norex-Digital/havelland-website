# Bild-Pipeline Havelland: PNG -> AVIF/WebP + JPG-Fallback, responsive Breiten, SEO-Slugs.
# Liest Foto-Generierung/Bilder, schreibt assets/img/ + manifest.json. Einmaliger Build-Schritt; Outputs werden committet.
# Maler-Assets (Renovierung #12, d11) werden bewusst NICHT konvertiert (keine Malerarbeiten).
import os, json, sys
from PIL import Image

SRC = r"C:\Norex\norex-control-tower\Haus und Gartenservice Havelland\Foto Generierung\Bilder"
DST = r"C:\Norex\havelland-website\assets\img"
os.makedirs(DST, exist_ok=True)

# echte Service-Reihenfolge (= Bild-Nummern-Reihenfolge), aus services.json
import json as _j
SVC = [s["slug"] for s in _j.load(open(r"C:\Norex\havelland-website\data\services.json", encoding="utf-8"))["services"]]

SKIP = {"hubs/12-maler-hero", "details/12-maler-detail", "ratgeber/d11-maler-selbst-vs-profi"}  # Maler tabu

# Kategorie-Config: widths, ob AVIF, crop (WxH oder None), jpg-Fallback-Breite
HERO_W   = [480, 768, 1024, 1376]
DETAIL_W = [480, 800, 1200]
REGION_W = [414, 640, 1024]
RAT_W    = [480, 768, 1024]
PROZ_W   = [220, 440]
BG_W     = [1024, 1376]

def slug_for(rel):
    """rel = 'hubs/01-gartenpflege-hero' -> Ziel-Slug + Kategorie-Config."""
    folder, name = rel.split("/", 1)
    if folder == "hubs":
        n = int(name[:2]); return f"svc-{SVC[n-1]}-hero", HERO_W, True, None, 1024
    if folder == "details":
        n = int(name[:2]); return f"svc-{SVC[n-1]}-detail", DETAIL_W, True, None, 800
    if folder == "regional":
        # c1-brandenburg-gemeinde -> region-brandenburg-gemeinde
        return "region-" + name.split("-", 1)[1], REGION_W, True, None, 640
    if folder == "ratgeber":
        # d01-rasenpflege-kalender -> ratgeber-rasenpflege-kalender
        return "ratgeber-" + name.split("-", 1)[1], RAT_W, True, None, 768
    if folder == "prozess":
        # e1-anfrage -> prozess-anfrage
        return "prozess-" + name.split("-", 1)[1], PROZ_W, True, None, 440
    if folder == "marke":
        m = {
            "a1-homepage-hero": ("hero-home", HERO_W, True, None, 1024),
            "a2-hero-fruehjahr": ("hero-home-fruehjahr", HERO_W, True, None, 1024),
            "a3-hero-herbst": ("hero-home-herbst", HERO_W, True, None, 1024),
            "a4-hero-winter": ("hero-home-winter", HERO_W, True, None, 1024),
            "a5-og-default": ("og-default", [1200], False, (1200, 630), 1200),  # OG: PNG/WebP, kein AVIF (Social-Crawler)
            "a6-404": ("page-404", [480, 800], True, None, 800),
            "a7-danke": ("page-danke", [480, 800], True, None, 800),
            "a8-bg-blatt": ("bg-blatt", BG_W, True, None, 1024),
            "a9-bg-hecke": ("bg-hecke", BG_W, True, None, 1024),
            "a10-bg-fassade": ("bg-fassade", BG_W, True, None, 1024),
            "a11-region-havelland": ("region-havelland", HERO_W, True, None, 1024),
        }
        return m[name]
    raise ValueError(rel)

def resize_to(im, w, crop):
    if crop:
        cw, ch = crop
        # center-crop auf Ziel-Ratio, dann skalieren
        tr = cw / ch; sr = im.width / im.height
        if sr > tr:
            nw = int(im.height * tr); x = (im.width - nw)//2; im = im.crop((x, 0, x+nw, im.height))
        else:
            nh = int(im.width / tr); y = (im.height - nh)//2; im = im.crop((0, y, im.width, y+nh))
        return im.resize((cw, ch), Image.LANCZOS)
    if w >= im.width:
        return im
    h = round(im.height * w / im.width)
    return im.resize((w, h), Image.LANCZOS)

manifest = {}
count = {"avif":0,"webp":0,"jpg":0}
for folder in ["marke","hubs","details","regional","ratgeber","prozess"]:
    d = os.path.join(SRC, folder)
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".png"): continue
        rel = f"{folder}/{fn[:-4]}"
        if rel in SKIP:
            print("SKIP (Maler):", rel); continue
        slug, widths, do_avif, crop, fb_w = slug_for(rel)
        im = Image.open(os.path.join(d, fn)).convert("RGB")
        ow, oh = (crop if crop else (im.width, im.height))
        out_widths = []
        for w in widths:
            r = resize_to(im, w, crop)
            aw = r.width
            r.save(os.path.join(DST, f"{slug}-{aw}.webp"), "WEBP", quality=80, method=6); count["webp"]+=1
            if do_avif:
                r.save(os.path.join(DST, f"{slug}-{aw}.avif"), "AVIF", quality=52, speed=6); count["avif"]+=1
            out_widths.append(aw)
        # jpg/png Fallback @ fb_w
        fb = resize_to(im, fb_w, crop)
        fb_ext = "png" if slug == "og-default" else "jpg"
        if fb_ext == "jpg":
            fb.save(os.path.join(DST, f"{slug}-{fb.width}.jpg"), "JPEG", quality=82, optimize=True, progressive=True)
        else:
            fb.save(os.path.join(DST, f"{slug}-{fb.width}.png"), "PNG", optimize=True)
        count["jpg"]+=1
        manifest[slug] = {
            "w": ow, "h": oh, "widths": sorted(set(out_widths)),
            "avif": do_avif, "fb_ext": fb_ext, "fb_w": fb.width
        }
        print(f"OK {slug:32} {ow}x{oh} widths={sorted(set(out_widths))} avif={do_avif}")

json.dump(manifest, open(os.path.join(DST, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"\n=== Fertig: {len(manifest)} Slugs | {count['avif']} avif + {count['webp']} webp + {count['jpg']} fallback ===")

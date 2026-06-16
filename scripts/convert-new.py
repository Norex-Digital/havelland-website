# Konvertiert die neuen Bilder aus _src4k/<slug>.png in Web-Formate (gleiche Qualität wie Haupt-Pipeline)
# und merged sie ins bestehende assets/img/manifest.json. Web-Breiten (kein 4k-Ausliefern).
import os, json, glob
from PIL import Image

SRC = r"C:\Norex\havelland-website\_src4k"
DST = r"C:\Norex\havelland-website\assets\img"
MAN = os.path.join(DST, "manifest.json")

WIDTHS = [480, 768, 1024, 1376]   # 16:9 Hero/Band-Breiten (wie die anderen Heroes)
FB_W = 1024

manifest = json.load(open(MAN, encoding="utf-8"))
def rs(im, w):
    if w >= im.width: return im
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)

for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    slug = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert("RGB")
    ow, oh = im.width, im.height
    out = []
    for w in WIDTHS:
        r = rs(im, w); aw = r.width
        r.save(os.path.join(DST, f"{slug}-{aw}.webp"), "WEBP", quality=90, method=6)
        r.save(os.path.join(DST, f"{slug}-{aw}.avif"), "AVIF", quality=80, speed=4)
        out.append(aw)
    fb = rs(im, FB_W)
    fb.save(os.path.join(DST, f"{slug}-{fb.width}.jpg"), "JPEG", quality=90, optimize=True, progressive=True)
    manifest[slug] = {"w": ow, "h": oh, "widths": sorted(set(out)), "avif": True, "fb_ext": "jpg", "fb_w": fb.width}
    print(f"OK {slug:30} {ow}x{oh} -> widths {sorted(set(out))}")

json.dump(manifest, open(MAN, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"\nManifest: {len(manifest)} Slugs")

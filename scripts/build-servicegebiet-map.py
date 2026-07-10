#!/usr/bin/env python3
# Erzeugt das Havelland-Servicegebiet-Kartenbild reproduzierbar aus OpenStreetMap-Tiles
# (einmalig beim Build gestitcht -> selbst gehostet, 0 externe Requests/Tracking zur Laufzeit).
# Attribution "© OpenStreetMap-Mitwirkende" ist auf der Karte sichtbar (.svc-map-attr).
# OSM-Tile-Policy: einmaliges Stitchen ok — NICHT in Schleife/CI dauernd neu ziehen.
#
# Aufruf vom Repo-Root:  python scripts/build-servicegebiet-map.py
# Danach die ausgegebenen PINPCT in scripts/components.mjs (gebietskarte) abgleichen.
import math, json, urllib.request, io, os, sys
from PIL import Image

Z = 11
CLAT, CLNG = 52.55, 13.08     # Mitte des Havelland-Servicegebiets
W, H = 1200, 1200             # Mercator-Fenster (bestimmt Ausschnitt UND Pin-%)
WORLD = 256 * (2 ** Z)
UA = "HavellandSiteBuild/1.0 (servicegebiet map; contact hausgartenservicehvl@gmail.com)"
DST = r"C:\Norex\havelland-website\assets\img"
MANIFEST = os.path.join(DST, "manifest.json")

# Bediente Haupt-Orte mit echten Koordinaten (lat, lng)
ORTE = {
 "falkensee":(52.5606,13.0928),"brieselang":(52.5889,13.0033),"schoenwalde-glien":(52.6150,13.1400),
 "nauen":(52.6089,12.8735),"wustermark":(52.5478,12.9533),"ketzin":(52.4772,12.8447),
 "dallgow-doeberitz":(52.5384,13.0531),"kremmen":(52.7583,13.0250),"oberkraemer":(52.7000,13.1330),
 "leegebruch":(52.7333,13.1667),"oranienburg":(52.7550,13.2400),"lehnitz":(52.7370,13.2470),
 "velten":(52.6892,13.1783),"hennigsdorf":(52.6367,13.2050),"hohen-neuendorf":(52.6733,13.2833),
 "birkenwerder":(52.6867,13.2833),"glienicke-nordbahn":(52.6367,13.3200),"berlin-spandau":(52.5370,13.2007),
 "berlin-gatow":(52.4817,13.1836),"berlin-kladow":(52.4536,13.1447),"gross-glienicke":(52.4647,13.1083),
 "werder-havel":(52.3783,12.9339),"schwielowsee":(52.3333,12.9500),
}

def px(lng): return (lng + 180.0) / 360.0 * WORLD
def py(lat):
    r = math.radians(lat)
    return (1.0 - math.asinh(math.tan(r)) / math.pi) / 2.0 * WORLD

cx, cy = px(CLNG), py(CLAT)
left, top = cx - W / 2, cy - H / 2
tx0, tx1 = int(left // 256), int((cx + W / 2) // 256)
ty0, ty1 = int(top // 256), int((cy + H / 2) // 256)

canvas = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256), (233, 237, 240))
fails = 0
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        url = f"https://tile.openstreetmap.org/{Z}/{tx}/{ty}.png"
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=25).read()
            canvas.paste(Image.open(io.BytesIO(data)).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
        except Exception as e:
            fails += 1; print("TILE FAIL", tx, ty, e, file=sys.stderr)

ox, oy = int(left - tx0 * 256), int(top - ty0 * 256)
crop = canvas.crop((ox, oy, ox + W, oy + H))

# Responsive-Varianten schreiben (webp + jpg-Fallback), Slug servicegebiet-karte
WIDTHS = [640, 900, 1200]
for w in WIDTHS:
    r = crop.resize((w, w), Image.LANCZOS)
    r.save(os.path.join(DST, f"servicegebiet-karte-{w}.webp"), "WEBP", quality=88, method=6)
crop.resize((900, 900), Image.LANCZOS).save(os.path.join(DST, "servicegebiet-karte-900.jpg"),
                                            "JPEG", quality=88, optimize=True, progressive=True)

# Manifest-Eintrag ergänzen
manifest = json.load(open(MANIFEST, encoding="utf-8"))
manifest["servicegebiet-karte"] = {"w": 1200, "h": 1200, "widths": WIDTHS, "avif": False, "fb_ext": "jpg", "fb_w": 900}
json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=0)

pct = {s: [round((px(lng) - cx + W / 2) / W * 100, 1), round((py(lat) - cy + H / 2) / H * 100, 1)]
       for s, (lat, lng) in ORTE.items()}
print("TILE-FAILS:", fails)
print("PINPCT:", json.dumps(pct))

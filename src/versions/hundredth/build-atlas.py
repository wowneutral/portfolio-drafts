# Packs every draft thumbnail into atlas sheets for the hundredth draft, and reads each
# draft's name from its meta.ts. Safe to re-run: it uses whatever thumbnails exist now.
# Run from the app folder: python3 src/versions/hundredth/build-atlas.py
import json, os, re
from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
LAB = '/home/claude/lab/app'
OUT = os.path.join(APP, 'public', 'hundredth')
CW, CH, COLS = 320, 200, 12  # cell size and columns: 3840 wide sheets

def read_meta(path):
    t = open(path, encoding='utf-8').read()
    g = lambda k, pat: (re.search(k + r"\s*:\s*" + pat, t) or [None, None])[1]
    slug = g('slug', r"'([^']+)'")
    n = g(r'\bn', r'(\d+)')
    name = g('name', r"'((?:[^'\\]|\\.)*)'") or g('name', r'"([^"]+)"')
    return slug, int(n) if n else None, (name or '').replace("\\'", "'")

def collect(root, skip):
    items = []
    vers = os.path.join(root, 'src', 'versions')
    for d in sorted(os.listdir(vers)):
        meta, thumb = os.path.join(vers, d, 'meta.ts'), os.path.join(root, 'public', 'thumbs', d + '.jpg')
        if d in skip or not os.path.exists(meta) or not os.path.exists(thumb):
            continue
        try:
            slug, n, name = read_meta(meta)
        except Exception:
            continue
        if slug and n and name:
            items.append({'slug': slug, 'n': n, 'name': name, 'thumb': thumb})
    return sorted(items, key=lambda x: x['n'])

def pack(items, file):
    rows = (len(items) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * CW, max(1, rows) * CH), (238, 237, 233))
    for i, it in enumerate(items):
        im = Image.open(it['thumb']).convert('RGB')
        im = im.resize((CW, CH), Image.LANCZOS) if im.size != (CW, CH) else im
        sheet.paste(im, ((i % COLS) * CW, (i // COLS) * CH))
        it['cell'] = i
    sheet.save(os.path.join(OUT, file), 'WEBP', quality=80, method=6)
    return {'file': file, 'cols': COLS, 'rows': rows, 'w': sheet.width, 'h': sheet.height}

os.makedirs(OUT, exist_ok=True)
port = collect(APP, {'hundredth'})
skep = collect(LAB, set())
data = {
    'portfolio': {**pack(port, 'atlas-portfolio.webp'), 'items': [{k: v for k, v in x.items() if k != 'thumb'} for x in port]},
    'skeptical': {**pack(skep, 'atlas-skeptical.webp'), 'items': [{k: v for k, v in x.items() if k != 'thumb'} for x in skep]},
}
json.dump(data, open(os.path.join(OUT, 'drafts.json'), 'w'), ensure_ascii=False)
print(len(port), 'portfolio,', len(skep), 'skeptical')

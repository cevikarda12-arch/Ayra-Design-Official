"""Capacitor'un oluşturduğu Android projesine Ayra Design simgesi, açılış ekranı ve renklerini uygular.
Kullanım: python3 mobile/android-assets.py mobile/android
"""
import os
import re
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
android = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'android')
res = os.path.join(android, 'app', 'src', 'main', 'res')
icon = Image.open(os.path.join(ROOT, '..', 'build', 'icon.png')).convert('RGBA')
BG = (14, 13, 24, 255)

# klasik + yuvarlak simgeler
SIZES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for d, px in SIZES.items():
    folder = os.path.join(res, 'mipmap-' + d)
    os.makedirs(folder, exist_ok=True)
    img = icon.resize((px, px), Image.LANCZOS)
    img.save(os.path.join(folder, 'ic_launcher.png'))
    img.save(os.path.join(folder, 'ic_launcher_round.png'))
    # uyarlanabilir simge ön planı (108dp tuval, logo güvenli alanın içinde)
    fg_px = int(px * 108 / 48)
    fg = Image.new('RGBA', (fg_px, fg_px), (0, 0, 0, 0))
    inner = icon.resize((int(fg_px * 0.62), int(fg_px * 0.62)), Image.LANCZOS)
    fg.alpha_composite(inner, ((fg_px - inner.width) // 2, (fg_px - inner.height) // 2))
    fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))

# uyarlanabilir simge arka plan rengi
bg_xml = os.path.join(res, 'values', 'ic_launcher_background.xml')
os.makedirs(os.path.dirname(bg_xml), exist_ok=True)
with open(bg_xml, 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0E0D18</color>\n</resources>\n')

# açılış ekranı görselleri
for root, _, files in os.walk(res):
    for name in files:
        if name == 'splash.png':
            p = os.path.join(root, name)
            w, h = Image.open(p).size
            s = Image.new('RGBA', (w, h), BG)
            side = int(min(w, h) * 0.32)
            logo = icon.resize((side, side), Image.LANCZOS)
            s.alpha_composite(logo, ((w - side) // 2, (h - side) // 2))
            s.convert('RGB').save(p)

# durum çubuğu ve gezinme çubuğu koyu renk
styles = os.path.join(res, 'values', 'styles.xml')
if os.path.exists(styles):
    x = open(styles).read()
    extra = ('<item name="android:statusBarColor">#0B0C10</item>'
             '<item name="android:navigationBarColor">#0B0C10</item>'
             '<item name="android:windowLightStatusBar">false</item>')
    x = re.sub(r'(<style name="AppTheme.NoActionBar"[^>]*>)', r'\1' + extra, x)
    x = re.sub(r'(<style name="AppTheme.NoActionBarLaunch"[^>]*>)', r'\1' + extra, x)
    open(styles, 'w').write(x)

# düz HTTP (yerel ağ) bağlantılarına izin ver
manifest = os.path.join(android, 'app', 'src', 'main', 'AndroidManifest.xml')
m = open(manifest).read()
if 'usesCleartextTraffic' not in m:
    m = m.replace('<application', '<application android:usesCleartextTraffic="true"', 1)
open(manifest, 'w').write(m)
print('Android varlıkları uygulandı:', res)

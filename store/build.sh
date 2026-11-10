#!/bin/bash
# Builds the Marketplace graphics from real captures in screenshots/raw2 (kept out of git: full-window captures show an account photo).
# Sheet captures are taken at 200% Sheets zoom and sidebar captures with the browser tool's zoom, so every panel is scaled DOWN here and stays sharp.
# Output: store/screenshot-1..6.png (1280x800), icon-128/96/48/32.png, banner-220x140.png
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
shot() { # file width height html
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --user-data-dir="$TMP/profile" \
    --default-background-color=00000000 --window-size="$2,$3" --screenshot="$PWD/store/$1" "file://$4" >/dev/null 2>&1
}
RAW="$PWD/screenshots/raw2" OUT="$TMP" python3 - <<'PY'
import os
RAW, OUT = os.environ['RAW'], os.environ['OUT']
CSS = '''html,body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;background:linear-gradient(135deg,#f0fdfa,#e0f2fe);color:#0f172a}
h1{margin:0;padding:32px 40px 0;font-size:40px;line-height:1.1;letter-spacing:-.02em}
p.sub{margin:10px 40px 0;font-size:20px;color:#475569}
.card{position:absolute;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 12px 40px rgba(15,23,42,.16),0 0 0 1px rgba(15,23,42,.08)}
.card img{position:absolute;max-width:none}
.fade:after{content:"";position:absolute;left:0;right:0;bottom:0;height:64px;background:linear-gradient(to bottom,rgba(240,244,249,0),#f0f4f9 85%)}
.fadew:after{content:"";position:absolute;left:0;right:0;bottom:0;height:40px;background:linear-gradient(to bottom,rgba(255,255,255,0),#fff 90%)}
.say{position:absolute;left:40px;width:824px;box-sizing:border-box;border-radius:14px;background:#0f766e;color:#fff;padding:0 36px;display:flex;flex-direction:column;justify-content:center}
.stats{display:flex;gap:44px;align-items:baseline}
.stats div{font-size:22px;opacity:.95}.stats b{font-size:76px;line-height:1;letter-spacing:-.03em;margin-right:10px}
.say .line{font-size:23px;line-height:1.35;margin-top:16px}.say .big{font-size:44px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.say ul{margin:14px 0 0;padding:0;list-style:none;font-size:22px;line-height:1.5}.say li:before{content:"\\2713";margin-right:12px;color:#99f6e4;font-weight:700}
.pill{position:absolute;background:#f59e0b;color:#1c1917;font-size:21px;font-weight:600;padding:10px 16px;border-radius:10px;box-shadow:0 6px 18px rgba(15,23,42,.25)}
.pill:after{content:"";position:absolute;left:36px;bottom:-9px;border:10px solid transparent;border-top-color:#f59e0b;border-bottom:0}
.col{position:absolute;top:150px;width:584px;height:440px;box-sizing:border-box;border-radius:14px;background:#fff;padding:26px 30px;box-shadow:0 12px 40px rgba(15,23,42,.16),0 0 0 1px rgba(15,23,42,.08)}
.col h2{margin:0 0 6px;font-size:26px;letter-spacing:-.01em}.col .row{display:flex;gap:16px;align-items:flex-start;margin-top:30px;font-size:25px;line-height:1.3}
.col .row small{display:block;font-size:18px;color:#64748b;margin-top:4px}
.ic{flex:0 0 38px;height:38px;border-radius:19px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff}
.yes{background:#0f766e}.no{background:#94a3b8}
.foot{position:absolute;left:40px;right:40px;top:616px;height:152px;box-sizing:border-box;border-radius:14px;background:#0f766e;color:#fff;padding:0 34px;font-size:22px;line-height:1.4;display:flex;align-items:center}'''
TOP, H, GW = 140, 628, 824
def img(name, w, x0, y0): return f'<img src="file://{RAW}/{name}" style="width:{w:.1f}px;left:{-x0:.1f}px;top:{-y0:.1f}px">'
def page(n, h1, sub, body):
    open(f'{OUT}/s{n}.html', 'w').write(f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><h1>{h1}</h1><p class="sub">{sub}</p>{body}')
def side(name, y0=0):  # sidebar capture is 463 wide (441 of content); shown at 0.8 so it is a downscale
    return f'<div class="card fade" style="left:888px;top:{TOP}px;width:352px;height:{H}px">{img(name, 463*0.8, 0, y0*0.8)}</div>'
def duo(n, h1, sub, grid, cw, ch, sidebar, say, side_y0=0):  # grid crop starts at (0,108) in the 1288-wide capture
    sc = GW / cw; gh = ch * sc
    body = f'<div class="card" style="left:40px;top:{TOP}px;width:{GW}px;height:{gh:.1f}px">{img(grid, 1288*sc, 0, 111*sc)}</div>'
    body += f'<div class="say" style="top:{TOP+gh+20:.1f}px;height:{H-gh-20:.1f}px">{say}</div>' + side(sidebar, side_y0)
    page(n, h1, sub, body)
def stats(*pairs): return '<div class="stats">' + ''.join(f'<div><b>{a}</b>{b}</div>' for a, b in pairs) + '</div>'

duo(1, 'See every change before it touches your calendar', 'Preview lists what will be created, updated or deleted.',
    'grid-preview.jpg', 1056, 418, 'side-preview.png',
    stats((8, 'to create'), (0, 'to update'), (0, 'to delete')) + '<div class="line">Nothing happens until you press Sync. The row with no date is skipped, and Minutehand tells you.</div>')
sc = 1200 / 1372
page(2, 'Events land at the time you typed', 'Minutehand reads your times in your calendar&#39;s own time zone, and tells you which one.',
     f'<div class="card fadew" style="left:40px;top:{TOP}px;width:1200px;height:{H}px">{img("calendar.png", 1200, 0, 10)}</div>'
     f'<div class="pill" style="left:{40+441*sc-10:.0f}px;top:{TOP+625*sc-72:.0f}px">Typed 3:30 PM in the sheet. Lands at 3:30 PM.</div>')
duo(3, 'Edit a row. The event updates. No duplicates.', 'Minutehand remembers which row made which event, so syncing again is always safe.',
    'grid-update.jpg', 1056, 418, 'side-update.png',
    stats((1, 'updated'), (7, 'left alone'), (0, 'duplicates')) + '<div class="line">Row 3 moved from 2:00 PM to 3:30 PM. Sync again and only that event changes.</div>')
row = lambda cls, mark, text, small='': f'<div class="row"><div class="ic {cls}">{mark}</div><div>{text}' + (f'<small>{small}</small>' if small else '') + '</div></div>'
page(4, 'Asks for only what it uses', 'Check the Permissions tab on any calendar add-on before you install. Here is ours.',
     '<div class="col" style="left:40px"><h2>Minutehand can</h2>'
     + row('yes', '&#10003;', 'See and edit the one spreadsheet it is open in')
     + row('yes', '&#10003;', 'Create and change calendar events', 'It only touches the calendar you pick.')
     + row('yes', '&#10003;', 'See the list of your calendars', 'To fill the picker and read that calendar&#39;s time zone.') + '</div>'
     '<div class="col" style="left:656px"><h2>Minutehand cannot</h2>'
     + row('no', '&#10005;', 'See your other spreadsheets or Drive files')
     + row('no', '&#10005;', 'Delete or share your calendars')
     + row('no', '&#10005;', 'See your contacts, email address or profile') + '</div>'
     '<div class="foot"><div>It also asks to show its sidebar, to run the hourly sync if you switch that on, and to contact Stripe only to check a Pro subscription. Nothing you sync leaves Google.</div></div>')
duo(5, 'Import any date range, and keep it linked', 'Pull events into a sheet. Edit them there and the calendar follows.',
    'grid-import.jpg', 1166, 379, 'side-import.png',
    '<div class="big">8 events in, one click.</div><div class="line">Imported rows stay linked to their events, so a later edit in the sheet updates the calendar instead of making a copy.</div>')
duo(6, 'A free plan with nothing hidden', '50 event changes a month, on any dates. A run log you can open any time.',
    'grid-log.jpg', 1214, 315, 'side-plan.png',
    '<div class="big">41 of 50 free changes left.</div><ul><li>Counted in the sidebar, in plain sight</li><li>No account to create on anyone&#39;s website</li><li>Every run logged in a tab of your own sheet</li></ul>', side_y0=338)
PY
for n in 1 2 3 4 5 6; do shot "screenshot-$n.png" 1280 800 "$TMP/s$n.html"; done
for s in 128 96 48 32; do
  printf '<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:%spx;height:%spx}</style><img src="file://%s/store/icon.svg">' "$s" "$s" "$PWD" > "$TMP/i$s.html"
  shot "icon-$s.png" "$s" "$s" "$TMP/i$s.html"
done
cat > "$TMP/b.html" <<HTML
<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:220px;height:140px;overflow:hidden;background:#0f766e;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;color:#fff}
img{position:absolute;left:14px;top:22px;width:40px;height:40px;border-radius:9px;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
b{position:absolute;left:63px;top:28px;font-size:24px;letter-spacing:-.02em}
span{position:absolute;left:14px;top:82px;font-size:13.5px;line-height:1.35;opacity:.95}</style>
<img src="file://$PWD/store/icon.svg"><b>Minutehand</b><span>Sheets to Calendar sync.<br>Preview first. No duplicates.</span>
HTML
shot "banner-220x140.png" 220 140 "$TMP/b.html"
for f in store/*.png; do sips -g pixelWidth -g pixelHeight "$f" | tail -2 | tr '\n' ' '; echo " $f"; done

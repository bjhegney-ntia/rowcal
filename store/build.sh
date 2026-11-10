#!/bin/bash
# Builds the Marketplace graphics from raw captures (screenshots/raw, kept out of git because they show an account photo).
# Output: store/screenshot-N.png (1280x800), icon-128/96/48/32.png, banner-220x140.png
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
shot() { # file width height html
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --user-data-dir="$TMP/profile" \
    --default-background-color=00000000 --window-size="$2,$3" --screenshot="$PWD/store/$1" "file://$4" >/dev/null 2>&1
}
STYLE='html,body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;background:linear-gradient(135deg,#f0fdfa,#e0f2fe)}
h1{margin:0;padding:30px 40px 0;font-size:34px;letter-spacing:-.02em;color:#0f172a}
p{margin:6px 40px 0;font-size:18px;color:#475569}
.card{position:absolute;top:128px;height:640px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 12px 40px rgba(15,23,42,.18),0 0 0 1px rgba(15,23,42,.08)}
.card img{position:absolute;max-width:none}'
crop() { # left width srcfile srcwidth x0 y0 scale
  python3 -c "
l,w,f,sw,x0,y0,sc=$1,$2,'$3',$4,$5,$6,$7
print(f'<div class=\"card\" style=\"left:{l}px;width:{w}px\"><img src=\"file://$PWD/screenshots/raw/{f}\" style=\"width:{sw*sc}px;left:{-x0*sc}px;top:{-y0*sc}px\"></div>')"
}
page() { # n headline subline crops-html
  printf '<!doctype html><meta charset="utf-8"><style>%s</style><h1>%s</h1><p>%s</p>%s' "$STYLE" "$2" "$3" "$4" > "$TMP/s$1.html"
  shot "screenshot-$1.png" 1280 800 "$TMP/s$1.html"
}
# Two zoomed panels: the sheet (left) and the Rowcal sidebar (right). Store listings show these at about half size.
two() { # n file srcwidth sheetY sheetScale sidebarX sidebarW headline subline
  local sbscale; sbscale=$(python3 -c "print(322/$7)")
  page "$1" "$8" "$9" "$(crop 40 854 "$2" "$3" 0 "$4" "$5")$(crop 918 322 "$2" "$3" "$6" 58 "$sbscale")"
}
two 1 1-preview.jpg 1288 104 1.5 1022 266 "See every change before it touches your calendar" "Preview lists what will be created, updated or deleted. Nothing happens until you press Sync."
page 2 "Your rows, on your calendar, at the time you typed" "Rowcal reads times in your calendar&#39;s time zone, so nothing lands three hours off." "$(crop 40 1200 2-calendar.jpg 1119 0 0 1.0724)"
two 3 3-update.jpg 1288 104 1.5 1022 266 "Edit a row and the event updates. No duplicates." "Rowcal remembers which row made which event, so syncing again is always safe."
two 4 4-import.jpg 1325 108 1.4 1052 273 "Import any date range, and keep it linked" "Pull events into a sheet. Edit them there and the calendar follows."
two 5 5-log.jpg 1288 104 1.3 1022 266 "An honest free plan, and a log of every run" "50 event changes a month, counted in plain sight. No account to create, no hidden quota."
for s in 128 96 48 32; do
  printf '<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:%spx;height:%spx}</style><img src="file://%s/store/icon.svg">' "$s" "$s" "$PWD" > "$TMP/i$s.html"
  shot "icon-$s.png" "$s" "$s" "$TMP/i$s.html"
done
cat > "$TMP/b.html" <<HTML
<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:220px;height:140px;overflow:hidden;background:#0f766e;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;color:#fff}
img{position:absolute;left:16px;top:22px;width:44px;height:44px;border-radius:10px;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
b{position:absolute;left:70px;top:27px;font-size:28px;letter-spacing:-.02em}
span{position:absolute;left:16px;top:84px;font-size:13.5px;line-height:1.35;opacity:.95}</style>
<img src="file://$PWD/store/icon.svg"><b>Rowcal</b><span>Sheets to Calendar.<br>Preview first. No duplicates.</span>
HTML
shot "banner-220x140.png" 220 140 "$TMP/b.html"
for f in store/*.png; do sips -g pixelWidth -g pixelHeight "$f" | tail -2 | tr '\n' ' '; echo " $f"; done

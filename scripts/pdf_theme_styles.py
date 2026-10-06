"""Aussehen der themed PDFs: Farben, Schriften und Zusatz-CSS je Theme (landet in project.json unter theme.*).

Die Vorlage tools/rulebook-pdf/rpdf/theme.css kennt: --cyan = accent (Überschriften, Linien), --magenta = accent2 (Kapitelnummer,
Initial, Zitatstrich). Der Rest steckt in den Schlüsseln unten; was fehlt, bleibt beim dunklen Neon-Standard.
"""

OUTLINE = lambda c, w=2, s=0: (  # Konturschrift per Schatten (WeasyPrint kennt kein text-stroke)
    f"text-shadow:-{w}px -{w}px 0 {c},{w}px -{w}px 0 {c},-{w}px {w}px 0 {c},{w}px {w}px 0 {c}" + (f",{s}px {s}px 0 var(--magenta)" if s else "") + ";")

STYLES = {
    "sincity": {
        "colors": dict(bg="#000000", ink="#f2f2f2", accent="#ec1c24", accent2="#ffffff", ink_strong="#ffffff", em="#ffffff",
                       rule="rgba(255,255,255,0.35)", card="rgba(0,0,0,0.92)", stripe="rgba(255,255,255,.07)", scrim="0,0,0"),
        "fonts": dict(font_display="'Big Shoulders'", font_head="'Big Shoulders'", font_label="'Big Shoulders'", font_body="'Barlow'"),
        "font_size_pt": 9.6,
        "extra_css": """
.cover-title{ font-weight:900; letter-spacing:.02em; text-shadow:5px 5px 0 var(--cyan); }
.cover-sub, .chapter-sub{ font-weight:700; color:#fff; }
.opener h2, .appendix h2{ font-weight:900; text-shadow:3px 3px 0 var(--cyan); }
.sub-head h3, .appendix-body h3{ font-weight:900; font-size:15pt; color:#fff; border-bottom:3px solid var(--cyan); }
.cols h3, .cols h4, .cols h5, .cols h6{ font-weight:800; color:#fff; font-size:11.5pt; }
.sub-figure img, .side-figure img, .filler img{ border:2px solid #fff; }
table.rules-table{ border-top:3px solid #fff; }
table.rules-table th{ background:#fff; color:#000; font-weight:900; }
blockquote{ border-left:3px solid var(--cyan); color:#fff; }
code{ color:#fff; }
""",
    },
    "wushu": {
        "colors": dict(bg="#e8dec6", ink="#261f17", accent="#b9301d", accent2="#8a6416", ink_strong="#0e0a06", em="#261f17",
                       rule="rgba(38,31,23,0.22)", card="rgba(249,243,228,0.92)", stripe="rgba(70,45,10,.05)", scrim="232,222,198"),
        "fonts": dict(font_display="'Noto Serif SC'", font_head="'Noto Serif SC'", font_label="'Noto Serif SC'", font_body="'Noto Serif SC'"),
        "font_size_pt": 9.0,
        "extra_css": """
.cover-title{ font-weight:900; text-shadow:none; letter-spacing:.04em; }
.cover-kicker, .chapter-num{ letter-spacing:.3em; }
.opener h2, .appendix h2{ font-weight:900; font-size:36pt; text-transform:none; }
.chapter-sub, .cover-sub{ text-transform:none; letter-spacing:.06em; font-weight:700; }
.sub-head h3, .cols h3, .cols h4, .cols h5, .cols h6, .appendix-body h3{ text-transform:none; font-weight:700; letter-spacing:.02em; }
.sub-head h3{ font-size:13.5pt; border-bottom:1px solid var(--ink); }
.sub-head h3::before{ content:'\\25C6\\00A0'; color:var(--cyan); font-size:.7em; }
.sub-figure img, .side-figure img, .filler img{ border:1px solid var(--ink); padding:3px; background:#f6eedb; }
strong{ font-weight:700; }
table.rules-table th{ text-transform:none; letter-spacing:.02em; background:rgba(185,48,29,.1); }
table.rules-table{ border-top:2px solid var(--ink); }
""",
    },
    "pixel": {
        "colors": dict(bg="#1a1c2c", ink="#f4f4f4", accent="#ffcd75", accent2="#41a6f6", ink_strong="#ffffff", em="#94b0c2",
                       rule="rgba(148,176,194,0.45)", card="rgba(38,43,68,0.95)", stripe="rgba(255,255,255,.05)", scrim="26,28,44"),
        "fonts": dict(font_display="'Press Start 2P'", font_head="'Silkscreen'", font_label="'Silkscreen'", font_body="'VT323'"),
        "font_size_pt": 12.5,
        "extra_css": """
img{ image-rendering:pixelated; }
body{ line-height:1.15; }
.cover-title{ font-size:50pt !important; line-height:1; text-shadow:4px 4px 0 #3b5dc9; letter-spacing:0; }
.cover-sub{ font-size:11pt; letter-spacing:.08em; }
.cover-kicker{ font-size:8pt; letter-spacing:.2em; }
.opener h2{ font-size:19pt; line-height:1.25; text-shadow:3px 3px 0 #3b5dc9; letter-spacing:0; }
.appendix h2{ font-size:15pt; line-height:1.3; letter-spacing:0; }
.chapter-num{ font-size:7pt; letter-spacing:.15em; }
.chapter-sub{ font-size:8pt; letter-spacing:.05em; }
.dropcap{ font-size:30pt; line-height:1; }
.sub-head h3{ font-size:9pt; line-height:1.5; letter-spacing:.02em; border-bottom:3px solid var(--rule); }
.cols h3, .cols h4, .cols h5, .cols h6, .appendix-body h3{ font-size:7.5pt; letter-spacing:.02em; }
.sub-figure img, .side-figure img, .filler img{ border:4px solid #f4f4f4; }
table.rules-table{ font-size:11pt; line-height:1.1; border-top:4px solid #f4f4f4; }
table.rules-table th{ font-size:6.5pt; letter-spacing:.02em; background:var(--cyan); color:#1a1c2c; }
strong{ font-weight:400; color:var(--cyan); }
blockquote{ font-style:normal; }
code{ font-size:1em; }
""",
    },
    "manga": {
        "colors": dict(bg="#f1eee6", ink="#121216", accent="#15151c", accent2="#ffd400", ink_strong="#000000", em="#121216",
                       rule="rgba(0,0,0,0.3)", card="rgba(255,255,255,0.92)", stripe="rgba(0,0,0,.045)", scrim="241,238,230"),
        "fonts": dict(font_display="'Bangers'", font_head="'Barlow Condensed'", font_label="'Barlow Condensed'", font_body="'Barlow'"),
        "font_size_pt": 9.6,
        "extra_css": """
.cover-title{ color:#fff; letter-spacing:.05em; """ + OUTLINE("#000", 4, 8) + """ }
.cover-kicker{ background:#000; color:#fff; display:inline-block; padding:1mm 4mm; letter-spacing:.3em; }
.cover-sub{ color:#000; }
.chapter-num{ background:#000; color:#fff; display:inline-block; padding:.8mm 3mm; }
.opener h2, .appendix h2{ color:#fff; letter-spacing:.04em; """ + OUTLINE("#000", 3, 6) + """ }
.opener-label{ left:17mm; }
.chapter-sub{ color:#000; font-weight:700; }
.dropcap{ color:#000; text-shadow:2px 2px 0 var(--magenta); }
.sub-head h3, .appendix-body h3{ color:#000; font-weight:700; border-bottom:2px solid #000; background:linear-gradient(transparent 62%, #ffd400 62%, #ffd400 92%, transparent 92%); display:inline-block; padding-right:3mm; }
.cols h3, .cols h4, .cols h5, .cols h6{ color:#000; }
.sub-figure img, .side-figure img, .filler img{ border:2.5px solid #000; }
table.rules-table{ border-top:3px solid #000; }
table.rules-table th{ background:#000; color:#fff; }
blockquote{ border-left:4px solid #ffd400; color:#121216; }
code{ color:#000; }
""",
    },
    "ukiyo": {
        "colors": dict(bg="#0e2135", ink="#f3e9d2", accent="#ff7a5c", accent2="#e8c26a", ink_strong="#fffaec", em="#f3e9d2",
                       rule="rgba(243,233,210,0.25)", card="rgba(18,44,68,0.92)", stripe="rgba(243,233,210,.045)", scrim="14,33,53"),
        "fonts": dict(font_display="'Shippori Mincho'", font_head="'Shippori Mincho'", font_label="'Zen Kaku Gothic New'", font_body="'Zen Kaku Gothic New'"),
        "font_size_pt": 9.4,
        "extra_css": """
.cover-title{ font-weight:800; text-shadow:4px 4px 0 #c8372d; letter-spacing:.04em; }
.opener h2, .appendix h2{ font-weight:800; text-shadow:3px 3px 0 #c8372d; }
.chapter-num{ color:var(--magenta); }
.chapter-num::before{ content:'\\25C6\\00A0'; color:#c8372d; }
.sub-head h3, .cols h3, .cols h4, .cols h5, .cols h6, .appendix-body h3{ text-transform:none; font-weight:700; letter-spacing:.03em; }
.sub-head h3{ font-size:14pt; color:var(--magenta); border-bottom:1px solid var(--rule); }
.sub-head h3::before{ content:'\\25C6\\00A0'; color:#c8372d; font-size:.6em; vertical-align:.15em; }
.sub-figure img, .side-figure img, .filler img{ border:1px solid var(--magenta); padding:3px; background:#142f48; }
table.rules-table{ border-top:2px solid #c8372d; }
table.rules-table th{ background:rgba(232,194,106,.12); color:var(--magenta); text-transform:none; letter-spacing:.03em; }
""",
    },
    "western": {
        "colors": dict(bg="#170f0a", ink="#ecdcb9", accent="#dba94a", accent2="#d2603f", ink_strong="#fff3d6", em="#ecdcb9",
                       rule="rgba(219,169,74,0.28)", card="rgba(40,27,18,0.92)", stripe="rgba(255,220,160,.04)", scrim="23,15,10"),
        "fonts": dict(font_display="'Rye'", font_head="'Arvo'", font_label="'Arvo'", font_body="'Arvo'"),
        "font_size_pt": 8.8,
        "extra_css": """
.cover-title{ font-size:92pt !important; letter-spacing:.03em; color:#f2d38a; text-shadow:4px 4px 0 #000; }
.cover-sub, .chapter-sub{ font-weight:700; letter-spacing:.14em; }
.opener h2{ font-size:30pt; line-height:1.05; color:#f2d38a; text-shadow:3px 3px 0 #000; }
.appendix h2{ font-size:24pt; color:#f2d38a; }
.dropcap{ font-size:36pt; }
.sub-head h3, .appendix-body h3{ font-weight:700; border-bottom:3px double var(--rule); font-size:12.5pt; }
.sub-head h3::before{ content:'\\2605\\00A0'; color:var(--magenta); }
.cols h3, .cols h4, .cols h5, .cols h6{ font-weight:700; font-size:9.5pt; }
.sub-figure img, .side-figure img, .filler img{ border:2px solid #5d4217; padding:2px; background:#2a1c12; }
table.rules-table{ border-top:2px solid #b8862b; }
table.rules-table th{ background:#b8862b; color:#1d1206; font-weight:700; }
strong{ font-weight:700; }
""",
    },
    "akte": {
        "colors": dict(bg="#d9c8a0", ink="#1d1a14", accent="#b3202a", accent2="#24477a", ink_strong="#000000", em="#1d1a14",
                       rule="rgba(29,26,20,0.28)", card="rgba(241,231,201,0.92)", stripe="rgba(60,40,10,.05)", scrim="217,200,160"),
        "fonts": dict(font_display="'Special Elite'", font_head="'Courier Prime'", font_label="'Courier Prime'", font_body="'Courier Prime'"),
        "font_size_pt": 8.8,
        "extra_css": """
.cover-title{ font-size:84pt !important; color:#000; text-shadow:none; text-transform:uppercase; }
.cover-kicker{ background:#111; color:#efe4c4; display:inline-block; padding:1mm 4mm; }
.opener h2{ font-size:34pt; text-transform:uppercase; }
.appendix h2{ font-size:24pt; text-transform:uppercase; }
.sub-head h3, .appendix-body h3{ font-weight:700; border-bottom:1px solid #1d1a14; font-size:12pt; }
.sub-head h3::before{ content:'\\25A0\\00A0'; color:var(--cyan); font-size:.7em; }
.chapter-num{ background:#111; color:#efe4c4; display:inline-block; padding:.6mm 3mm; letter-spacing:.2em; }
.sub-figure img, .side-figure img, .filler img{ border:8px solid #fffdf4; border-bottom-width:18px; }
table.rules-table{ border-top:2px solid #111; }
table.rules-table th{ background:#111; color:#efe4c4; }
strong{ font-weight:700; }
""",
    },
    "terminal": {
        "colors": dict(bg="#030605", ink="#bfe9d6", accent="#29e0a0", accent2="#d7e24a", ink_strong="#e6fff4", em="#bfe9d6",
                       rule="rgba(41,224,160,0.28)", card="rgba(5,12,9,0.92)", stripe="rgba(41,224,160,.04)", scrim="3,6,5"),
        "fonts": dict(font_display="'VT323'", font_head="'Courier Prime'", font_label="'Courier Prime'", font_body="'Courier Prime'"),
        "font_size_pt": 8.8,
        "extra_css": """
.cover-title{ font-size:150pt !important; text-shadow:0 0 12px rgba(41,224,160,.6); letter-spacing:.06em; }
.opener h2{ font-size:58pt; line-height:.9; text-shadow:0 0 10px rgba(41,224,160,.5); }
.appendix h2{ font-size:36pt; }
.dropcap{ font-size:54pt; }
.sub-head h3, .appendix-body h3{ font-weight:700; border-bottom:1px dashed var(--cyan); }
.sub-head h3::before{ content:'## '; color:var(--magenta); }
.sub-figure img, .side-figure img, .filler img{ border:1px solid var(--cyan); }
table.rules-table{ border-top:1px dashed var(--cyan); }
table.rules-table th{ background:transparent; border-bottom:1px solid var(--cyan); }
strong{ font-weight:700; }
""",
    },
    "hybrid": {
        "colors": dict(bg="#07061a", ink="#e9e6ff", accent="#ff2bd6", accent2="#19e9ff", ink_strong="#ffffff", em="#e9e6ff",
                       rule="rgba(150,120,255,0.3)", card="rgba(14,11,42,0.92)", stripe="rgba(150,120,255,.05)", scrim="7,6,26"),
        "fonts": dict(font_display="'Tektur'", font_head="'Tektur'", font_label="'Tektur'", font_body="'Barlow'"),
        "font_size_pt": 9.6,
        "extra_css": """
.cover-title{ font-weight:900; font-size:100pt !important; text-shadow:4px 0 0 rgba(255,43,214,.8), -4px 0 0 rgba(25,233,255,.8); }
.opener h2{ font-weight:900; font-size:36pt; text-shadow:3px 0 0 rgba(255,43,214,.8), -3px 0 0 rgba(25,233,255,.8); }
.appendix h2{ font-weight:900; font-size:26pt; }
.sub-head h3{ font-weight:700; border-bottom:1px solid; border-image:linear-gradient(90deg,#ff2bd6,#19e9ff) 1; }
.sub-figure img, .side-figure img, .filler img{ border:1px solid #19e9ff; }
table.rules-table{ border-top:2px solid #19e9ff; }
table.rules-table th{ color:#19e9ff; background:rgba(25,233,255,.1); }
""",
    },
}

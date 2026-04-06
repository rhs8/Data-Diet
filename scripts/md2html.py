#!/usr/bin/env python3
"""Convert ../FINAL_REPORT.md to ../FINAL_REPORT_print.html (requires: pip install markdown)."""
import sys
from pathlib import Path

try:
    import markdown
except ImportError:
    print("Install: pip3 install markdown", file=sys.stderr)
    sys.exit(1)

root = Path(__file__).resolve().parent.parent
md_path = root / "FINAL_REPORT.md"
out_path = root / "FINAL_REPORT_print.html"
md = md_path.read_text(encoding="utf-8")
body = markdown.markdown(md, extensions=["tables", "nl2br"])
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Data & Diet — Final Report</title>
  <style>
    body {{ font-family: Georgia, 'Times New Roman', serif; max-width: 820px; margin: 48px auto; padding: 0 24px;
      line-height: 1.55; color: #111; font-size: 11pt; }}
    h1 {{ font-size: 1.75em; margin-top: 0; }}
    h2 {{ font-size: 1.35em; margin-top: 1.5em; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; }}
    h3 {{ font-size: 1.15em; margin-top: 1.2em; }}
    table {{ border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 10pt; }}
    th, td {{ border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }}
    th {{ background: #f5f5f5; }}
    hr {{ margin: 2em 0; border: none; border-top: 1px solid #ccc; }}
    code {{ font-family: ui-monospace, Menlo, monospace; font-size: 0.92em; }}
    a {{ color: #0b57d0; }}
    @media print {{ body {{ margin: 12mm; max-width: none; }} h2 {{ break-after: avoid; }} }}
  </style>
</head>
<body>
{body}
</body>
</html>"""
out_path.write_text(html, encoding="utf-8")
print("Wrote", out_path)

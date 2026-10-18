"""Keep generated Stitch click routers outside the canonical Track Hub."""
import re
import sys
from pathlib import Path

page = Path(sys.argv[1])
source = page.read_text(encoding="utf-8")
pattern = r"(document\.addEventListener\(\s*(['\"])click\2\s*,\s*function\s*\(\s*(\w+)\s*\)\s*\{)"


def protect(match):
    event = match.group(3)
    return match.group(1) + f"\n  if({event}.target.closest('#ph-remote-root')) return;\n"


updated, count = re.subn(pattern, protect, source)
if not count:
    raise SystemExit("No generated Track Hub click routers found; inspect assembly")
page.write_text(updated, encoding="utf-8")
print(f"Protected canonical Track Hub from {count} generated click routers")

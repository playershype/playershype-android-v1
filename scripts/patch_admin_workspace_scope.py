"""Match the Android Admin publisher workspace with the HypePredict editor.

HypePredict admin.html can carry a snapshot identifier and then persists
its library at hypepredict.cardLibrary.v1.snapshot.<id>. The separate Admin
home publisher previously read the unscoped storage, producing successful
GitHub commits with no new race data.
"""
from pathlib import Path
import argparse
import re

LEGACY = (
    "const STORAGE_KEY='hypepredict.cardLibrary.v1',"
    "TRACK_KEY='hypepredict.trackRegistry.v1',"
    "POST_KEY='hypepredict.postmortemHistory.v1',"
    "THEME_KEY='hypepredict.viewerTheme.v1';"
)
SCOPE = re.compile(r'<html\b[^>]*\bdata-snapshot-id=["\x27]([a-zA-Z0-9_-]{1,80})["\x27]', re.I)


def patch_admin_workspace_scope(admin_html: Path, publisher_js: Path, module_js: Path) -> str:
    admin = admin_html.read_text(encoding="utf-8")
    publisher = publisher_js.read_text(encoding="utf-8")
    module = module_js.read_text(encoding="utf-8")
    if "const STORAGE_SCOPE=SNAPSHOT_ID?" not in module:
        raise RuntimeError("Unexpected HypePredict Admin storage contract")
    match = SCOPE.search(admin)
    if not match:
        if "data-snapshot-id=" in admin:
            raise RuntimeError("Malformed HypePredict snapshot identifier")
        if LEGACY not in publisher:
            raise RuntimeError("Unexpected legacy publisher storage contract")
        return "unscoped"

    snapshot_id = match.group(1)
    suffix = f".snapshot.{snapshot_id}"
    target = (
        f"const STORAGE_KEY='hypepredict.cardLibrary.v1{suffix}',"
        f"TRACK_KEY='hypepredict.trackRegistry.v1{suffix}',"
        f"POST_KEY='hypepredict.postmortemHistory.v1{suffix}',"
        f"THEME_KEY='hypepredict.viewerTheme.v1{suffix}';"
    )
    if publisher.count(LEGACY) != 1:
        raise RuntimeError("Expected exactly one unscoped publication workspace definition")
    publisher_js.write_text(publisher.replace(LEGACY, target, 1), encoding="utf-8")
    return suffix


def main():
    p = argparse.ArgumentParser()
    p.add_argument("admin_html", type=Path)
    p.add_argument("publisher_js", type=Path)
    p.add_argument("module_js", type=Path)
    args = p.parse_args()
    print("Publisher storage aligned with HypePredict editor:",
          patch_admin_workspace_scope(args.admin_html, args.publisher_js, args.module_js))


if __name__ == "__main__":
    main()

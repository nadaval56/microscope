#!/usr/bin/env python3
"""Check that every image (gallery + timeline) has an allowed license and a complete credit.

The credits page itself is rendered client-side from data/images.json and data/timeline.json;
this script is the safety net. Exit code 1 if anything is missing or not allowed.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = ["name", "author", "source_url", "file_url", "credit_line", "modifications"]
FORBIDDEN = re.compile(r"\b(NC|ND)\b|non-?commercial|no ?deriv", re.I)


def check(label, lic, errors):
    if not lic:
        errors.append(f"{label}: no license block")
        return
    for k in REQUIRED:
        if not lic.get(k):
            errors.append(f"{label}: missing license.{k}")
    if FORBIDDEN.search(lic.get("name", "")):
        errors.append(f"{label}: forbidden license {lic['name']}")
    if lic.get("kind") not in (None, "pd", "by", "by-sa"):
        errors.append(f"{label}: unknown license kind {lic.get('kind')}")
    for k in ("source_url", "file_url"):
        if lic.get(k) and not lic[k].startswith("https://"):
            errors.append(f"{label}: {k} is not https")


def main():
    errors = []
    images = json.loads((ROOT / "data" / "images.json").read_text("utf-8"))
    for im in images:
        check(f"{im['id']} ({im.get('key')})", im.get("license"), errors)
        for w in im.get("widths", []):
            if not (ROOT / "img" / "micro" / f"{im['id']}-{w}.webp").exists():
                errors.append(f"{im['id']}: missing file img/micro/{im['id']}-{w}.webp")
    tl_path = ROOT / "data" / "timeline.json"
    timeline = json.loads(tl_path.read_text("utf-8")) if tl_path.exists() else []
    for ev in timeline:
        if ev.get("image"):
            check(f"timeline {ev['key']}", ev["image"].get("license"), errors)
    kinds = {}
    for im in images:
        k = im["license"].get("kind")
        kinds[k] = kinds.get(k, 0) + 1
    print(f"{len(images)} gallery images ({kinds}), {sum(1 for e in timeline if e.get('image'))} timeline images")
    if errors:
        print("\n".join(errors))
        return 1
    print("all credits complete, no NC/ND")
    return 0


if __name__ == "__main__":
    sys.exit(main())

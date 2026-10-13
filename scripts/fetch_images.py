#!/usr/bin/env python3
"""Image + data pipeline for the Microkosmos site.

Reads the content fragments in scripts/content/*.json (one array of image entries per
fragment, plus timeline.json and techniques.json), and for every Wikimedia Commons file:

  1. Reads the license, author and dimensions from the Commons file page.
  2. Rejects anything that is not Public Domain / CC0 / CC BY / CC BY-SA (prints why).
  3. Downloads a thumbnail and writes WebP variants (img/micro/<id>-<w>.webp).
  4. Writes data/images.json, data/timeline.json, data/techniques.json.

Image ids are neutral (m001, m002 ...), assigned once and kept in scripts/id_map.json, so
file names never reveal the answer to a quiz question.

Why not the Commons Action API (as the spec suggests)? From many shared hosts it answers
HTTP 429. The HTML file page carries the same machine-readable license template data
(licensetpl_*), and thumb.wikimedia.org serves standard thumbnail sizes, so we use those.

Usage:  python3 scripts/fetch_images.py [--only KEY ...] [--refresh]
"""
from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
import random
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "scripts" / "content"
CACHE = ROOT / "scripts" / ".cache"
ID_MAP = ROOT / "scripts" / "id_map.json"
REPORT = ROOT / "scripts" / "report.md"
CANDIDATES = ROOT / "scripts" / "candidates.yaml"
DATA = ROOT / "data"
IMG_MICRO = ROOT / "img" / "micro"
IMG_HISTORY = ROOT / "img" / "history"

UA = "MicrokosmosEduSite/0.1 (https://github.com/nadaval56/microscope; educational)"
THUMB_BUCKETS = [1280, 1920, 3840]  # standard Wikimedia thumbnail widths
MICRO_WIDTHS = [400, 1200, 1920]
HISTORY_WIDTHS = [400, 1200]
WEBP_QUALITY = 82
NON_GALLERY = {"timeline.json", "techniques.json"}

CATEGORY_ORDER = ["microbes", "protists", "human", "cells", "plants",
                  "tiny-animals", "crystals", "tech", "history"]


# --------------------------------------------------------------------------- http
def fetch(url: str, binary: bool = False, tries: int = 6):
    delay = 4.0
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                time.sleep(0.8)
                return data if binary else data.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            raise
        except urllib.error.URLError:
            if attempt < tries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            raise


def cached(name: str, url: str, binary: bool = False, refresh: bool = False, tries: int = 6):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / (hashlib.sha1(name.encode()).hexdigest() + (".bin" if binary else ".html"))
    if path.exists() and not refresh:
        return path.read_bytes() if binary else path.read_text("utf-8")
    data = fetch(url, binary=binary, tries=tries)
    if binary:
        path.write_bytes(data)
    else:
        path.write_text(data, "utf-8")
    return data


# ------------------------------------------------------------------------ license
ALLOWED = [
    (re.compile(r"^(public domain|pd\b|pd-|cc0|cc-zero|no restrictions)", re.I), "pd"),
    (re.compile(r"^cc[ -]by[ -]sa\b", re.I), "by-sa"),
    (re.compile(r"^cc[ -]by\b(?![ -](nc|nd))", re.I), "by"),
]
FORBIDDEN = re.compile(r"\b(nc|nd|non-?commercial|no ?deriv|fair use|all rights reserved)\b", re.I)


def classify_license(short: str) -> str | None:
    s = short.strip()
    if not s or FORBIDDEN.search(s):
        return None
    for rx, kind in ALLOWED:
        if rx.search(s):
            return kind
    return None


def strip_tags(s: str) -> str:
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S)
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def commons_page_info(title: str, refresh: bool = False) -> dict:
    name = title.removeprefix("File:").replace(" ", "_")
    url = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(name)
    page = cached("page:" + name, url, refresh=refresh)
    page_u = page.replace("&#95;", "_")

    shorts = [strip_tags(x) for x in re.findall(r'class="licensetpl_short"[^>]*>(.*?)</span>', page_u, re.S)]
    links = [strip_tags(x) for x in re.findall(r'class="licensetpl_link"[^>]*>(.*?)</span>', page_u, re.S)]
    licenses = []
    for i, s in enumerate(shorts):
        kind = classify_license(s)
        licenses.append({"name": s, "url": links[i] if i < len(links) else "", "kind": kind})

    author = ""
    m = re.search(r'id="fileinfotpl_aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', page_u, re.S)
    if m:
        author = strip_tags(m.group(1))
    author = re.sub(r"\s*\(talk\s*·?\s*contribs\)", "", author)
    # Creator templates add life dates, roles and links; keep the name part
    author = re.split(r"\s+(?:Description|Date of birth|Alternative names|Link back to Creator)", author)[0]
    author = re.sub(r"\s*\(\d{3,4}[–-]\d{3,4}\)", "", author).strip()[:160]

    desc = ""
    m = re.search(r'class="description[^"]*"[^>]*>(.*?)</div>', page_u, re.S)
    if m:
        desc = strip_tags(m.group(1))[:500]

    width = height = None
    m = re.search(r'class="fileInfo">\s*([\d,\.  ]+)\s*×\s*([\d,\.  ]+)\s*pixels', page_u)
    if not m:
        m = re.search(r"Original file.*?\(([\d,]+)\s*×\s*([\d,]+)\s*pixels", page_u, re.S)
    if m:
        width = int(re.sub(r"\D", "", m.group(1)))
        height = int(re.sub(r"\D", "", m.group(2)))

    return {"name": name, "page_url": url, "licenses": licenses, "author": author,
            "description": desc, "width": width, "height": height}


def pick_license(info: dict) -> dict | None:
    """Most permissive allowed license on the file (PD > BY > BY-SA)."""
    rank = {"pd": 0, "by": 1, "by-sa": 2}
    ok = [l for l in info["licenses"] if l["kind"]]
    if not ok:
        return None
    # A file that also carries a forbidden template is still fine if one allowed option exists
    # (dual licensing). It is never fine if the ONLY options are forbidden.
    return sorted(ok, key=lambda l: rank[l["kind"]])[0]


def upload_paths(name: str) -> tuple[str, str]:
    md5 = hashlib.md5(name.encode("utf-8")).hexdigest()
    quoted = urllib.parse.quote(name)
    file_url = f"https://upload.wikimedia.org/wikipedia/commons/{md5[0]}/{md5[:2]}/{quoted}"
    thumb_base = f"https://thumb.wikimedia.org/wikipedia/commons/thumb/{md5[0]}/{md5[:2]}/{quoted}"
    return file_url, thumb_base


def download_source(info: dict, max_needed: int, refresh: bool = False) -> Image.Image:
    name = info["name"]
    _, thumb_base = upload_paths(name)
    width = info["width"] or 1920
    bucket = next((b for b in THUMB_BUCKETS if b >= min(max_needed, width)), THUMB_BUCKETS[-1])
    if width and bucket > width:
        # Ask for the largest bucket not above the original; thumbs never upscale well.
        smaller = [b for b in THUMB_BUCKETS if b <= width]
        bucket = smaller[-1] if smaller else 960
    thumb_name = quote_thumb_name(name)
    file_url, _ = upload_paths(name)
    if width and width < max_needed and not name.lower().endswith((".tif", ".tiff", ".svg")):
        # Smaller than our largest variant: the original is the best source (no bucket fits).
        try:
            data = cached(f"orig:{name}", file_url, binary=True, refresh=refresh, tries=2)
            img = Image.open(io.BytesIO(data))
            img.load()
            return img
        except Exception:  # noqa: BLE001 — fall back to the thumbnail server
            pass
    url = f"{thumb_base}/{bucket}px-{thumb_name}"
    if name.lower().endswith((".tif", ".tiff")):
        url = f"{thumb_base}/lossless-page1-{bucket}px-{thumb_name}.png"
    elif name.lower().endswith(".svg"):
        url = f"{thumb_base}/{bucket}px-{thumb_name}.png"
    try:
        data = cached(f"img:{name}:{bucket}", url, binary=True, refresh=refresh)
    except urllib.error.HTTPError:
        if name.lower().endswith((".tif", ".tiff")):
            url = f"{thumb_base}/{bucket}px-{thumb_name}.jpg"
            data = cached(f"img:{name}:{bucket}:jpg", url, binary=True, refresh=refresh)
        else:
            raise
    img = Image.open(io.BytesIO(data))
    img.load()
    return img


def quote_thumb_name(name: str) -> str:
    return urllib.parse.quote(name)


def write_variants(img: Image.Image, out_dir: Path, stem: str, widths: list[int]) -> list[int]:
    out_dir.mkdir(parents=True, exist_ok=True)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (0, 0, 0))
        bg.paste(img, mask=img.split()[-1])
        img = bg
    made = []
    for w in widths:
        if w > img.width and made:
            continue
        target_w = min(w, img.width)
        h = round(img.height * target_w / img.width)
        im = img.resize((target_w, h), Image.LANCZOS) if target_w != img.width else img
        im.save(out_dir / f"{stem}-{w}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
        made.append(w)
    return made


# ---------------------------------------------------------------------------- ids
def load_id_map() -> dict:
    return json.loads(ID_MAP.read_text("utf-8")) if ID_MAP.exists() else {}


def assign_ids(keys: list[str], id_map: dict) -> dict:
    """Neutral ids in shuffled order so that id order never mirrors categories."""
    new = [k for k in keys if k not in id_map]
    used = {int(v[1:]) for v in id_map.values()}
    pool = [n for n in range(1, 400) if n not in used]
    rng = random.Random(1665)  # deterministic: Micrographia
    rng.shuffle(pool)
    for k, n in zip(sorted(new), pool):
        id_map[k] = f"m{n:03d}"
    return id_map


# ---------------------------------------------------------------------------- main
FEATURED = set(json.loads((ROOT / "scripts" / "featured.json").read_text("utf-8")))  # home-page hero rotation
AUTHOR_OVERRIDES = json.loads((ROOT / "scripts" / "author_overrides.json").read_text("utf-8"))


def clean_author(key: str, parsed: str, fallback: str = "") -> str:
    if key in AUTHOR_OVERRIDES:
        return AUTHOR_OVERRIDES[key]
    a = re.sub(r"\s*\(?\btalk\b\)?\s*", " ", parsed).strip(" ,·")
    a = re.sub(r"\s{2,}", " ", a)
    return a or fallback or "Unknown author"


def credit_line(author: str, lic: dict) -> str:
    who = author or "Unknown author"
    return f"{who}, {lic['name']}, via Wikimedia Commons"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="process only these keys")
    ap.add_argument("--refresh", action="store_true", help="ignore cache")
    ap.add_argument("--no-images", action="store_true", help="skip WebP generation")
    args = ap.parse_args()

    entries = []
    for f in sorted(CONTENT.glob("*.json")):
        if f.name in NON_GALLERY:
            continue
        for e in json.loads(f.read_text("utf-8")):
            e["_fragment"] = f.name
            entries.append(e)

    seen, dup = set(), []
    for e in entries:
        if e["key"] in seen:
            dup.append(e["key"])
        seen.add(e["key"])
    if dup:
        print("Duplicate keys:", dup)
        return 1

    id_map = assign_ids([e["key"] for e in entries], load_id_map())
    ID_MAP.write_text(json.dumps(id_map, indent=2, ensure_ascii=False) + "\n", "utf-8")

    old = {}
    if (DATA / "images.json").exists():
        old = {x["id"]: x for x in json.loads((DATA / "images.json").read_text("utf-8"))}

    accepted, rejected = [], []
    files_seen = {}
    for e in entries:
        key = e["key"]
        if args.only and key not in args.only:
            if id_map[key] in old:
                accepted.append(old[id_map[key]])
            continue
        title = e["commons_file"]
        if title in files_seen:
            rejected.append((key, title, f"same file as {files_seen[title]}"))
            continue
        files_seen[title] = key
        try:
            info = commons_page_info(title, refresh=args.refresh)
        except Exception as ex:  # noqa: BLE001
            rejected.append((key, title, f"page fetch failed: {ex}"))
            continue
        lic = pick_license(info)
        if not lic:
            names = ", ".join(l["name"] for l in info["licenses"]) or "no license template found"
            rejected.append((key, title, f"license not allowed: {names}"))
            continue
        iid = id_map[key]
        if not args.no_images:
            try:
                img = download_source(info, max(MICRO_WIDTHS), refresh=args.refresh)
                made = write_variants(img, IMG_MICRO, iid, MICRO_WIDTHS)
                w, h = img.size
            except Exception as ex:  # noqa: BLE001
                rejected.append((key, title, f"download failed: {ex}"))
                continue
        else:
            prev = old.get(iid, {})
            made, w, h = prev.get("widths", MICRO_WIDTHS), prev.get("width", 1200), prev.get("height", 900)
        file_url, _ = upload_paths(info["name"])
        info["author"] = clean_author(key, info["author"], (e.get("license_seen") or {}).get("author", ""))
        record = {
            "id": iid,
            "key": key,
            "title_he": e["title_he"],
            "title_en": e.get("title_en", ""),
            "category": e["category"],
            "tags": e.get("tags", []),
            "microscope": e["microscope"],
            "technique": e["technique"],
            "colorized": bool(e.get("colorized")),
            "magnification": e.get("magnification"),
            "scale": {
                "subject_size_m": e.get("scale", {}).get("subject_size_m"),
                "subject_size_label": e.get("scale", {}).get("subject_size_label"),
                "field_width_m": e.get("scale", {}).get("field_width_m"),
                "pixel_size_m": None,
                "comparison_he": e.get("scale", {}).get("comparison_he"),
            },
            "text": e.get("text", {}),
            "quiz": e.get("quiz", {}),
            "related": [],
            "_related_keys": e.get("related_keys", []),
            "pair_id": e.get("pair_id"),
            "featured": bool(e.get("featured")) or key in FEATURED,
            "width": w,
            "height": h,
            "widths": made,
            "license": {
                "name": lic["name"],
                "url": lic["url"],
                "kind": lic["kind"],
                "author": info["author"],
                "source_url": info["page_url"],
                "file_url": file_url,
                "credit_line": credit_line(info["author"], lic),
                "modifications": "Resized, converted to WebP",
            },
            # License verified automatically from the file page; content written and reviewed
            # by the build. Flip to false to hide an image from the public site.
            "verified": e.get("verified", True),
        }
        sw = record["scale"]["field_width_m"]
        if sw and w:
            record["scale"]["pixel_size_m"] = sw / w
        accepted.append(record)
        print(f"ok   {iid} {key:28s} {lic['name']}")

    # resolve related keys -> ids, plus same-category fallback
    by_key = {r["key"]: r for r in accepted}
    for r in accepted:
        rel = [by_key[k]["id"] for k in r.pop("_related_keys", []) if k in by_key and k != r["key"]]
        r["related"] = rel

    accepted.sort(key=lambda r: (CATEGORY_ORDER.index(r["category"]) if r["category"] in CATEGORY_ORDER else 99, r["id"]))
    DATA.mkdir(exist_ok=True)
    (DATA / "images.json").write_text(json.dumps(accepted, indent=1, ensure_ascii=False) + "\n", "utf-8")

    # ---------------- timeline + techniques
    tl_path = CONTENT / "timeline.json"
    if tl_path.exists():
        timeline = json.loads(tl_path.read_text("utf-8"))
        for ev in timeline:
            ev.pop("image", None)
            title = ev.get("commons_file")
            if not title:
                continue
            try:
                info = commons_page_info(title, refresh=args.refresh)
                lic = pick_license(info)
                if not lic:
                    print(f"timeline image rejected ({ev['key']}): {[l['name'] for l in info['licenses']]}")
                    continue
                stem = "h-" + ev["key"]
                if not args.no_images:
                    img = download_source(info, 1200, refresh=args.refresh)
                    made = write_variants(img, IMG_HISTORY, stem, HISTORY_WIDTHS)
                    w, h = img.size
                else:
                    made, w, h = HISTORY_WIDTHS, 1200, 900
                file_url, _ = upload_paths(info["name"])
                info["author"] = clean_author("timeline:" + ev["key"], info["author"])
                ev["image"] = {
                    "src": f"img/history/{stem}", "widths": made, "width": w, "height": h,
                    "alt_he": ev.get("image_alt_he") or ev["title_he"],
                    "license": {"name": lic["name"], "url": lic["url"], "author": info["author"],
                                "source_url": info["page_url"], "file_url": file_url,
                                "credit_line": credit_line(info["author"], lic),
                                "modifications": "Resized, converted to WebP"},
                }
                print(f"ok   timeline {ev['key']:24s} {lic['name']}")
            except Exception as ex:  # noqa: BLE001
                print(f"timeline image failed ({ev['key']}): {ex}")
        timeline.sort(key=lambda ev: ev["year"])
        (DATA / "timeline.json").write_text(json.dumps(timeline, indent=1, ensure_ascii=False) + "\n", "utf-8")
    tq_path = CONTENT / "techniques.json"
    if tq_path.exists():
        (DATA / "techniques.json").write_text(tq_path.read_text("utf-8"), "utf-8")

    # ---------------- report
    counts = {}
    for r in accepted:
        c = counts.setdefault(r["category"], {"light": 0, "electron": 0, "probe": 0, "illustration": 0})
        c[r["microscope"]] = c.get(r["microscope"], 0) + 1
    lines = ["# Image pipeline report", "",
             f"Accepted: **{len(accepted)}**  ·  Rejected: **{len(rejected)}**", "",
             "| category | light | electron | probe | illustration | total |", "|---|---|---|---|---|---|"]
    for cat in CATEGORY_ORDER:
        c = counts.get(cat, {})
        lines.append(f"| {cat} | {c.get('light',0)} | {c.get('electron',0)} | {c.get('probe',0)} | "
                     f"{c.get('illustration',0)} | {sum(c.values()) if c else 0} |")
    lines += ["", "## Rejected", ""]
    lines += [f"- `{k}` — {t} — {why}" for k, t, why in rejected] or ["(none)"]
    REPORT.write_text("\n".join(lines) + "\n", "utf-8")

    # candidates.yaml: the source list, regenerated so it always matches the content files
    y = ["# Generated by fetch_images.py from scripts/content/*.json — source list of all candidates.",
         "# status: accepted | rejected (reason)"]
    rej = {k: why for k, _, why in rejected}
    for e in entries:
        y.append(f"- key: {e['key']}")
        y.append(f"  id: {id_map[e['key']]}")
        y.append(f"  source: {json.dumps(e['commons_file'], ensure_ascii=False)}")
        y.append(f"  category: {e['category']}")
        y.append(f"  status: {json.dumps('rejected: ' + rej[e['key']] if e['key'] in rej else 'accepted', ensure_ascii=False)}")
    CANDIDATES.write_text("\n".join(y) + "\n", "utf-8")

    print(f"\naccepted {len(accepted)}, rejected {len(rejected)}")
    for k, t, why in rejected:
        print(f"  REJECTED {k}: {why}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

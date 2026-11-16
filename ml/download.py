"""Downloads and extracts the datasets listed in sources.py.

Usage (from ml/):  .venv\\Scripts\\python download.py            # every source
                   .venv\\Scripts\\python download.py rice_sethy  # just some

Files land in data/sources/<key>/files/ (archives) and are unpacked into
data/sources/<key>/extracted/. Mendeley files are checked against their
published SHA-256, and anything already downloaded intact is skipped, so the
script can be re-run after an interrupted download. Credits for every source are
written to reports/DATASETS.md.
"""

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from common import DATA_DIR, REPORTS_DIR
from sources import BY_KEY, SOURCES, Source

SOURCES_DIR = DATA_DIR / "sources"
API = "https://data.mendeley.com/public-api/datasets"
HEADERS = {"User-Agent": "AgroLens-dataset-fetch (CSE-311 student project)"}
ARCHIVES = (".zip", ".rar", ".7z")
# Windows' bsdtar reads RAR and 7z as well as zip.
BSDTAR = Path(r"C:\Windows\System32\tar.exe")


def get_json(url: str):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(url: str, target: Path, size: int | None = None, expected_sha: str | None = None) -> None:
    """Downloads to a temporary name, verifies, then renames; skips files already intact."""
    if target.exists() and (size is None or target.stat().st_size == size):
        if expected_sha is None or sha256(target) == expected_sha:
            return
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_name(target.name + ".part")
    for attempt in range(1, 5):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=120) as response, open(partial, "wb") as out:
                shutil.copyfileobj(response, out, 1 << 20)
            if size is not None and partial.stat().st_size != size:
                raise OSError(f"size {partial.stat().st_size} != {size}")
            if expected_sha and sha256(partial) != expected_sha:
                raise OSError("SHA-256 mismatch")
            partial.replace(target)
            return
        except OSError as error:
            if attempt == 4:
                raise
            print(f"    retry {attempt} for {target.name}: {error}", flush=True)
            time.sleep(5 * attempt)


def mendeley_files(source: Source) -> tuple[dict, list[tuple[str, dict]]]:
    """Returns the dataset metadata and the selected files as (relative path, file record)."""
    meta = get_json(f"{API}/{source.mendeley_id}")
    folders = {f["id"]: f for f in get_json(f"{API}/{source.mendeley_id}/folders/{meta['version']}")}

    def folder_path(folder_id: str | None) -> str:
        parts = []
        while folder_id and folder_id in folders:
            parts.append(folders[folder_id]["name"])
            folder_id = folders[folder_id].get("parent_id")
        return "/".join(reversed(parts))

    selected = []
    for record in meta["files"]:
        relative = "/".join(p for p in (folder_path(record.get("folder_id")), record["filename"]) if p)
        wanted = (
            (not source.files and not source.folders)
            or record["filename"] in source.files
            or any(relative.startswith(folder + "/") for folder in source.folders)
        )
        if wanted:
            selected.append((relative, record))
    if source.files:
        missing = set(source.files) - {record["filename"] for _, record in selected}
        if missing:
            raise SystemExit(f"{source.key}: files not found on Mendeley: {sorted(missing)}")
    return meta, selected


def download_mendeley(source: Source, root: Path) -> dict:
    meta, selected = mendeley_files(source)
    total = sum(record["size"] for _, record in selected)
    print(f"  {len(selected)} files, {total / 1e6:.0f} MB", flush=True)

    def one(item: tuple[str, dict]) -> None:
        relative, record = item
        details = record["content_details"]
        if not details.get("download_url"):
            raise OSError(f"Mendeley has no download link for {relative} (still processing?)")
        fetch(details["download_url"], root / "files" / relative, record["size"], details.get("sha256_hash"))

    workers = 8 if len(selected) > 20 else 2
    with ThreadPoolExecutor(workers) as pool:
        for done, _ in enumerate(pool.map(one, selected), start=1):
            if len(selected) > 20 and done % 500 == 0:
                print(f"    {done}/{len(selected)} files", flush=True)
    return {
        "name": meta["name"].strip(),
        "authors": [f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() for c in meta["contributors"]],
        "doi": meta["doi"]["id"],
        "url": f"https://data.mendeley.com/datasets/{source.mendeley_id}/{meta['version']}",
        "licence": meta["data_licence"]["short_name"],
        "published": meta.get("publish_date", "")[:10],
        "files": [relative for relative, _ in selected],
    }


def download_github(source: Source, root: Path) -> dict:
    repo = get_json(f"https://api.github.com/repos/{source.github}")
    branch = repo["default_branch"]
    url = f"https://codeload.github.com/{source.github}/zip/refs/heads/{branch}"
    fetch(url, root / "files" / f"{source.github.split('/')[1]}.zip")
    return {
        "name": repo["description"] or source.github,
        "authors": [repo["owner"]["login"]],
        "doi": "",
        "url": repo["html_url"],
        "licence": (repo.get("license") or {}).get("spdx_id", "?"),
        "published": repo.get("created_at", "")[:10],
        "files": [f"{source.github.split('/')[1]}.zip"],
    }


def unpack(archive: Path, target: Path) -> None:
    if target.exists():
        return
    print(f"  extracting {archive.name}", flush=True)
    partial = target.with_name(target.name + ".partial")
    shutil.rmtree(partial, ignore_errors=True)
    partial.mkdir(parents=True)
    if archive.suffix.lower() == ".zip":
        with zipfile.ZipFile(archive) as handle:
            handle.extractall(partial)
    else:
        subprocess.run([str(BSDTAR), "-xf", str(archive), "-C", str(partial)], check=True)
    partial.rename(target)


def extract(root: Path, only_nested: tuple[str, ...] = ()) -> None:
    """Unpacks archives under files/ into extracted/<archive name>/, then any archives inside those.

    Nested archives whose name says they hold augmented copies are left packed:
    we only train on original photos. A source can instead name exactly which
    nested archives to unpack (`only_nested`). Plain image downloads stay where they are.
    """
    extracted = root / "extracted"
    for archive in sorted((root / "files").rglob("*")):
        if archive.suffix.lower() in ARCHIVES:
            unpack(archive, extracted / archive.stem)
    for _ in range(3):  # archives inside archives, a few levels deep
        nested = [
            a for a in sorted(extracted.rglob("*"))
            if a.suffix.lower() in ARCHIVES and a.is_file() and ".partial" not in a.as_posix()
            and (a.name in only_nested if only_nested else "augment" not in a.name.lower())
            and not a.with_suffix("").exists()
        ]
        if not nested:
            break
        for archive in nested:
            unpack(archive, archive.with_suffix(""))


def write_credits() -> None:
    lines = [
        "# Image datasets used by AgroLens",
        "",
        "PlantVillage: Arun Pandian J and Geetharamani Gopal, \"Data for: Identification of Plant Leaf Diseases",
        "Using a 9-layer Deep Convolutional Neural Network\", Mendeley Data, DOI 10.17632/tywbtsjrjv.1, CC0 1.0.",
        "",
        "All sources below are used under their stated licence, with credit to the authors.",
        "Only original photos were used; augmented copies were left out.",
        "",
        "| Source | Crops | Dataset | Authors | Licence | Link |",
        "|---|---|---|---|---|---|",
    ]
    for source in SOURCES:
        info_path = SOURCES_DIR / source.key / "source.json"
        if not info_path.exists():
            continue
        info = json.loads(info_path.read_text(encoding="utf-8"))
        link = f"https://doi.org/{info['doi']}" if info["doi"] else info["url"]
        lines.append(
            f"| {source.key} | {', '.join(source.crops)} | {info['name']} | {', '.join(info['authors'])} "
            f"| {info['licence']} | {link} |"
        )
    REPORTS_DIR.mkdir(exist_ok=True)
    (REPORTS_DIR / "DATASETS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("keys", nargs="*", help="source keys from sources.py (default: all)")
    parser.add_argument("--extract-only", action="store_true", help="skip downloading; unpack what's there")
    args = parser.parse_args()
    unknown = [key for key in args.keys if key not in BY_KEY]
    if unknown:
        raise SystemExit(f"Unknown sources: {unknown}")

    failed = []
    for source in [BY_KEY[key] for key in args.keys] or SOURCES:
        root = SOURCES_DIR / source.key
        print(f"[{source.key}]", flush=True)
        try:
            if not args.extract_only:
                info = download_github(source, root) if source.github else download_mendeley(source, root)
                (root / "source.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
            if (root / "files").exists():
                extract(root, source.extra.get("nested", ()))
        except Exception as error:  # keep going; report at the end
            print(f"  FAILED: {error}", flush=True)
            failed.append(source.key)
    write_credits()
    print(f"Done. Failed: {failed or 'none'}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

"""Builds the combined training set: PlantVillage plus every source in sources.py.

Usage (from ml/):  .venv\\Scripts\\python prepare_combined.py
                   .venv\\Scripts\\python prepare_combined.py --check   # only list folders and labels

1. Names each photo's class with label_rules.py, from the folder it sits in. A
   folder with images that no rule covers stops the script, so nothing is
   included or dropped by accident.
2. Rotates each photo upright (EXIF, as the backend does) and shrinks it to at
   most 384 px on its longer side, into data/combined/. Training crops 224 px,
   and decoding 12-megapixel phone photos every epoch would starve the GPU.
3. Keeps one photo per duplicate group: identical photos, and copies that are
   only flipped or rotated by 90 degrees (every pair is compared by thumbnail
   correlation, on the GPU). Several sources ship such copies;
   letting them straddle train and test would inflate the scores, and counting
   them several times would overweight them. Groups whose copies carry
   different labels are dropped.
4. Splits 70/15/15 per source and class with seed 42. PlantVillage keeps the
   splits from prepare_data.py so its earlier results stay comparable, and
   PlantDoc keeps its authors' test set.
5. Drops classes with fewer than MIN_IMAGES photos, and lists thin ones, with
   fewer than THIN_IMAGES, whose test scores rest on a handful of photos.

Writes data/splits_combined/{train,val,test}.csv (path, label, source) and
reports/combined_dataset.json (photos per class and source).
"""

import argparse
import csv
import hashlib
import json
import random
import re
from collections import Counter, defaultdict
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

from common import DATA_DIR, NOT_A_LEAF, REPORTS_DIR, parse_label
from data import read_split, splits_dir
from label_rules import EXCLUDE_FILES, LABEL_RULES
from plantvillage import app_label
from sources import SOURCES

SEED = 42
FRACTIONS = {"train": 0.70, "val": 0.15, "test": 0.15}
MAX_SIDE_PX = 384
# Below this a class can't be learned or measured; 30-49 photos are kept but reported as thin.
MIN_IMAGES = 30
THIN_IMAGES = 50
# Correlation of normalised 32x32 thumbnails (best rotation or flip) from which two photos
# count as copies. In a sampled audit every pair above 0.985 was the same photo, pairs at
# 0.97-0.985 were mostly the same photo slightly shifted, and below 0.97 mostly different.
SAME_PHOTO_MIN_CORRELATION = 0.98
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
SOURCES_DIR = DATA_DIR / "sources"
COMBINED_DIR = DATA_DIR / "combined"
# PlantVillage classes for plants the app doesn't have.
NOT_APP_CROPS = {"blueberry", "raspberry"}


def source_images(key: str) -> dict[str, list[Path]]:
    """Image files per folder (relative, "/"-separated) in a source's downloads and extractions."""
    root = SOURCES_DIR / key
    excluded = EXCLUDE_FILES.get(key)
    by_folder: dict[str, list[Path]] = defaultdict(list)
    for base in (root / "files", root / "extracted"):
        if not base.exists():
            continue
        for path in base.rglob("*"):
            # macOS zips carry "__MACOSX/._name.jpg" metadata files that only look like images.
            junk = "__MACOSX" in path.parts or path.name.startswith("._")
            skipped = excluded is not None and excluded.search(path.name)
            if path.suffix.lower() in IMAGE_SUFFIXES and path.is_file() and not junk and not skipped:
                by_folder[path.parent.relative_to(base).as_posix()].append(path)
    return by_folder


def label_for(key: str, folder: str) -> tuple[bool, str | None]:
    """(matched, label) for a folder of a source; label None means skip."""
    for pattern, label in LABEL_RULES.get(key, []):
        if re.search(pattern, folder, flags=re.IGNORECASE):
            return True, label
    return False, None


def fingerprint(path: Path) -> np.ndarray:
    """32x32 greyscale version of a photo, for finding copies of it."""
    with Image.open(path) as saved:
        return np.asarray(saved.convert("L").resize((32, 32), Image.Resampling.BILINEAR), dtype=np.uint8)


def duplicate_groups(thumbs: list[np.ndarray], block: int = 2048) -> list[int]:
    """A group id per photo; copies of the same photo, even flipped or rotated, share one.

    Every photo is compared with every other, in all 8 orientations, by the
    correlation of their normalised 32x32 thumbnails (matrix products, on the
    GPU when there is one). Correlation, not pixel difference: cut-outs on black
    look alike pixel-wise whatever the leaf. A photo joins a group only if it
    matches the group's first photo directly, so chains of look-alikes can't
    merge into one huge group.

    An earlier 64-bit hash both matched different photos of plain leaves (72% of
    its "duplicates" in an audit) and missed rotated, re-saved copies.
    """
    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    n = len(thumbs)
    images = torch.tensor(np.stack(thumbs), dtype=torch.float32, device=device)

    def normalise(batch: torch.Tensor) -> torch.Tensor:
        flat = batch.reshape(len(batch), -1)
        flat = flat - flat.mean(1, keepdim=True)
        return flat / (flat.norm(dim=1, keepdim=True) + 1e-6)

    base = normalise(images)
    rotations = [torch.rot90(images, k, dims=(1, 2)) for k in range(4)]
    variants = [normalise(v) for v in rotations + [r.flip(2) for r in rotations]]

    leader = list(range(n))
    for start in range(0, n, block):
        best = None
        for variant in variants:
            correlation = variant[start : start + block] @ base.T
            best = correlation if best is None else torch.maximum(best, correlation)
        matches: dict[int, list[int]] = defaultdict(list)
        for a, b in torch.nonzero(best >= SAME_PHOTO_MIN_CORRELATION).tolist():
            if b < a + start:
                matches[a + start].append(b)
        for i in range(start, min(start + block, n)):
            leaders = [j for j in matches.get(i, []) if leader[j] == j]
            leader[i] = min(leaders) if leaders else i
    return leader


def shrink(task: tuple[str, str]) -> tuple[str, str, np.ndarray | None]:
    """Worker: upright, shrunk JPEG copy of one photo, plus its fingerprint (None if unreadable).

    Copies from an earlier run are reused; one that can't be read (say, cut off
    when a run was interrupted) is made again from the original.
    """
    source, target = task
    target_path = Path(target)
    if target_path.exists():
        try:
            return source, target, fingerprint(target_path)
        except (OSError, ValueError):
            target_path.unlink()
    try:
        with Image.open(source) as opened:
            opened.draft("RGB", (MAX_SIDE_PX * 2, MAX_SIDE_PX * 2))  # fast JPEG decode at reduced size
            image = ImageOps.exif_transpose(opened).convert("RGB")
        image.thumbnail((MAX_SIDE_PX, MAX_SIDE_PX), Image.Resampling.LANCZOS)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        partial = target_path.with_suffix(".part")
        image.save(partial, format="JPEG", quality=90)
        partial.replace(target_path)  # never leave a half-written copy under the real name
        # Fingerprint the saved copy, as for reused ones, so JPEG rounding can't split duplicates.
        return source, target, fingerprint(target_path)
    except (OSError, ValueError, Image.DecompressionBombError):
        return source, target, None


def collect(check_only: bool) -> list[tuple[Path, str, str, str | None]]:
    """(image, label, source, fixed split or None) for every photo the rules keep."""
    items, unmatched = [], []
    for source in SOURCES:
        folders = source_images(source.key)
        if not folders:
            print(f"[{source.key}] no images downloaded yet")
            continue
        for folder_name, paths in sorted(folders.items()):
            matched, label = label_for(source.key, folder_name)
            if not matched:
                unmatched.append(f"{source.key}: {folder_name} ({len(paths)} images)")
                continue
            if check_only:
                print(f"  {source.key:22} {len(paths):5d}  {folder_name}  ->  {label}")
            if label is None:
                continue
            parse_label(label)  # fails loudly on a malformed label
            # PlantDoc ships its own train/test split; keep its test set as ours.
            fixed = "test" if source.key == "plantdoc" and "/test/" in f"/{folder_name}/" else None
            items.extend((path, label, source.key, fixed) for path in paths)
    if unmatched:
        raise SystemExit("No label rule for these folders (add them to label_rules.py):\n  " + "\n  ".join(unmatched))
    return items


def split_groups(groups: list[list[int]], fractions: dict[str, float], rng: random.Random) -> dict[str, list[int]]:
    """Assigns whole duplicate groups to splits, aiming at each split's share of photos."""
    rng.shuffle(groups)
    total = sum(len(g) for g in groups)
    targets = {split: fraction * total for split, fraction in fractions.items()}
    parts: dict[str, list[int]] = {split: [] for split in fractions}
    for group in groups:
        # The split furthest below its target gets the next group.
        split = max(fractions, key=lambda s: (targets[s] - len(parts[s])) / max(targets[s], 1e-9))
        parts[split].extend(group)
    return parts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="only list folders and their labels")
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    items = collect(args.check)
    if args.check:
        return

    # 1-2. Shrunk copies and duplicate hashes.
    tasks = []
    for path, _, source, _ in items:
        name = hashlib.sha1(path.relative_to(SOURCES_DIR).as_posix().encode()).hexdigest()[:20]
        tasks.append((str(path), str(COMBINED_DIR / source / f"{name}.jpg")))
    print(f"Shrinking {len(tasks)} photos into {COMBINED_DIR} ...", flush=True)
    results = {}
    with Pool(args.workers) as pool:
        for done, (source_path, target, prints) in enumerate(pool.imap_unordered(shrink, tasks, chunksize=32), 1):
            results[source_path] = (target, prints)
            if done % 5000 == 0:
                print(f"  {done}/{len(tasks)}", flush=True)

    # 3. Duplicate groups, across all sources.
    records = []  # (relative path, label, source, fixed split, duplicate group)
    thumbs = []
    unreadable = Counter()
    for path, label, source, fixed in items:
        target, thumb = results[str(path)]
        if thumb is None:
            unreadable[source] += 1
            continue
        records.append([Path(target).relative_to(DATA_DIR).as_posix(), label, source, fixed, None])
        thumbs.append(thumb)
    print("Looking for copies of the same photo ...", flush=True)
    for record, group in zip(records, duplicate_groups(thumbs)):
        record[4] = group
    labels_per_group: dict[int, set[str]] = defaultdict(set)
    for _, label, _, _, group in records:
        labels_per_group[group].add(label)
    conflicting = {g for g, labels in labels_per_group.items() if len(labels) > 1}
    dropped_conflicts = sum(1 for r in records if r[4] in conflicting)
    records = [r for r in records if r[4] not in conflicting]

    # 4. Splits, per source and class, whole groups at a time.
    rng = random.Random(SEED)
    rows: dict[str, list[tuple[str, str, str]]] = {split: [] for split in FRACTIONS}
    by_class: dict[tuple[str, str], list[int]] = defaultdict(list)
    for index, (_, label, source, _, _) in enumerate(records):
        by_class[(source, label)].append(index)
    seen_groups: set[int] = set()
    duplicates_removed = 0
    for (source, label), indices in sorted(by_class.items()):
        # PlantDoc's own test photos first, so a copy of one never lands in training.
        indices = sorted(indices, key=lambda i: (records[i][3] != "test", records[i][0]))
        unique = []
        for i in indices:
            if records[i][4] in seen_groups:
                duplicates_removed += 1
                continue
            seen_groups.add(records[i][4])
            unique.append(i)
        fixed_test = [i for i in unique if records[i][3] == "test"]
        rows["test"].extend((records[i][0], label, source) for i in fixed_test)
        rest = [[i] for i in unique if records[i][3] != "test"]
        fractions = {"train": 0.85, "val": 0.15} if fixed_test else FRACTIONS
        for split, members in split_groups(rest, fractions, rng).items():
            rows[split].extend((records[i][0], label, source) for i in members)

    # PlantVillage keeps its earlier splits, under the app's class names.
    for split in FRACTIONS:
        for path, name in read_split(split, "plantvillage"):
            label = app_label(name)
            info = parse_label(label)
            if info.crop_id not in NOT_APP_CROPS:
                rows[split].append((path, label, "plantvillage"))

    # 5. Too-small classes.
    totals = Counter(label for split_rows in rows.values() for _, label, _ in split_rows)
    too_small = {label: n for label, n in totals.items() if n < MIN_IMAGES and label != NOT_A_LEAF}
    for split in rows:
        rows[split] = [row for row in rows[split] if row[1] not in too_small]

    out = splits_dir("combined")
    out.mkdir(parents=True, exist_ok=True)
    for split, split_rows in rows.items():
        with open(out / f"{split}.csv", "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["path", "label", "source"])
            writer.writerows(sorted(split_rows))

    per_class = defaultdict(lambda: {"train": 0, "val": 0, "test": 0})
    per_source = defaultdict(lambda: {"train": 0, "val": 0, "test": 0})
    for split, split_rows in rows.items():
        for _, label, source in split_rows:
            per_class[label][split] += 1
            per_source[source][split] += 1
    summary = {
        "classes": len(per_class),
        "crops": sorted({parse_label(label).crop_id for label in per_class if parse_label(label).crop_id}),
        "images": {split: len(split_rows) for split, split_rows in rows.items()},
        "duplicates_removed": duplicates_removed,
        "dropped_conflicting_duplicates": dropped_conflicts,
        "unreadable": dict(unreadable),
        "dropped_small_classes": too_small,
        "thin_classes": {label: n for label, n in totals.items() if MIN_IMAGES <= n < THIN_IMAGES},
        # Crops left without a healthy class: the model can't tell the farmer their plant looks fine.
        "crops_without_healthy": sorted(
            {parse_label(l).crop_id for l in per_class if parse_label(l).crop_id}
            - {parse_label(l).crop_id for l in per_class if parse_label(l).is_healthy}
        ),
        "per_source": dict(sorted(per_source.items())),
        "per_class": dict(sorted(per_class.items())),
    }
    REPORTS_DIR.mkdir(exist_ok=True)
    (REPORTS_DIR / "combined_dataset.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    for label, counts in sorted(per_class.items()):
        print(f"{label:55} {counts['train']:6} {counts['val']:6} {counts['test']:6}")
    print(json.dumps({k: summary[k] for k in list(summary)[:8]}, indent=2))


if __name__ == "__main__":
    main()

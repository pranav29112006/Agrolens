"""Extracts PlantVillage and writes reproducible 70/15/15 train/val/test splits.

Usage (from ml/):  .venv\\Scripts\\python prepare_data.py

Splits are stratified per class with a fixed seed, and stored as CSV lists of
image paths so images are never copied or duplicated.
"""

import argparse
import csv
import random
import re
import zipfile
from pathlib import Path

from common import DATA_DIR, NOT_A_LEAF, SPLITS_DIR
from plantvillage import PLANTVILLAGE_CLASSES

SEED = 42
FRACTIONS = {"train": 0.70, "val": 0.15, "test": 0.15}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def _key(name: str) -> str:
    """Normalises folder names across mirrors, e.g. "Corn___Common_rust" vs "Corn_(maize)___Common_rust_"."""
    name = name.lower().replace("(including_sour)", "").replace("(maize)", "")
    return re.sub(r"[^a-z0-9]", "", name)


CANONICAL = {_key(name): name for name in [*PLANTVILLAGE_CLASSES, NOT_A_LEAF]}


def find_class_dirs(root: Path) -> dict[str, Path]:
    found: dict[str, Path] = {}
    for directory in sorted(p for p in root.rglob("*") if p.is_dir()):
        label = CANONICAL.get(_key(directory.name))
        if label and label not in found and any(
            p.suffix.lower() in IMAGE_SUFFIXES for p in directory.iterdir()
        ):
            found[label] = directory
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, default=DATA_DIR / "raw" / "plantvillage.zip")
    parser.add_argument("--images", type=Path, default=DATA_DIR / "images")
    args = parser.parse_args()

    if not args.images.exists():
        print(f"Extracting {args.zip} ...")
        with zipfile.ZipFile(args.zip) as archive:
            archive.extractall(args.images)

    class_dirs = find_class_dirs(args.images)
    missing = sorted(set(CANONICAL.values()) - set(class_dirs))
    if missing:
        raise SystemExit(f"Classes not found in the dataset: {missing}")

    rng = random.Random(SEED)
    rows: dict[str, list[tuple[str, str]]] = {split: [] for split in FRACTIONS}
    print(f"{'class':55} {'train':>6} {'val':>6} {'test':>6}")
    for label in sorted(class_dirs):
        files = sorted(p for p in class_dirs[label].iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)
        rng.shuffle(files)
        n_train = round(len(files) * FRACTIONS["train"])
        n_val = round(len(files) * FRACTIONS["val"])
        parts = {
            "train": files[:n_train],
            "val": files[n_train : n_train + n_val],
            "test": files[n_train + n_val :],
        }
        for split, split_files in parts.items():
            rows[split].extend((p.relative_to(DATA_DIR).as_posix(), label) for p in split_files)
        print(f"{label:55} {len(parts['train']):6} {len(parts['val']):6} {len(parts['test']):6}")

    SPLITS_DIR.mkdir(parents=True, exist_ok=True)
    for split, split_rows in rows.items():
        with open(SPLITS_DIR / f"{split}.csv", "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["path", "label"])
            writer.writerows(split_rows)

    totals = {split: len(split_rows) for split, split_rows in rows.items()}
    print(f"\n{len(class_dirs)} classes, {sum(totals.values())} images: {totals}")


if __name__ == "__main__":
    main()

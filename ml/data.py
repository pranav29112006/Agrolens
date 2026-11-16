"""Datasets and image transforms."""

import csv
from pathlib import Path

import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms as T

from common import DATA_DIR, IMAGE_SIZE, MEAN, SPLITS_DIR, STD

# "plantvillage" (prepare_data.py) or "combined" (prepare_combined.py).
DATASETS = ("plantvillage", "combined")


def splits_dir(dataset: str) -> Path:
    return SPLITS_DIR if dataset == "plantvillage" else DATA_DIR / f"splits_{dataset}"


def read_rows(split: str, dataset: str = "plantvillage") -> list[dict[str, str]]:
    """Rows with path and label; combined splits also say which source each photo came from."""
    with open(splits_dir(dataset) / f"{split}.csv", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def read_split(split: str, dataset: str = "plantvillage") -> list[tuple[str, str]]:
    return [(row["path"], row["label"]) for row in read_rows(split, dataset)]


def class_names(dataset: str = "plantvillage") -> list[str]:
    """Sorted, like ImageFolder, so indices are stable and predictable."""
    return sorted({label for _, label in read_split("train", dataset)})


# PlantVillage photos are single leaves on plain backgrounds; farmers' photos are
# not. Crops, rotations, lighting changes and blur make the model less brittle.
TRAIN_TRANSFORM = T.Compose(
    [
        T.RandomResizedCrop(IMAGE_SIZE, scale=(0.6, 1.0)),
        T.RandomHorizontalFlip(),
        T.RandomVerticalFlip(),
        T.RandomRotation(20),
        T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05),
        T.RandomApply([T.GaussianBlur(kernel_size=5)], p=0.2),
        T.ToTensor(),
        T.Normalize(MEAN, STD),
    ]
)

# Exactly what the backend does: resize to 224×224, then normalise.
EVAL_TRANSFORM = T.Compose(
    [
        T.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        T.ToTensor(),
        T.Normalize(MEAN, STD),
    ]
)


class LeafDataset(Dataset):
    def __init__(self, split: str, classes: list[str], transform, dataset: str = "plantvillage"):
        index = {name: i for i, name in enumerate(classes)}
        self.samples = [(DATA_DIR / path, index[label]) for path, label in read_split(split, dataset)]
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, i: int) -> tuple[torch.Tensor, int]:
        path, target = self.samples[i]
        with Image.open(path) as image:
            return self.transform(image.convert("RGB")), target

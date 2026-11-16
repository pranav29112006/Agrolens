"""Fine-tunes an ImageNet-pretrained CNN on the PlantVillage or combined splits.

Usage (from ml/):  .venv\\Scripts\\python train.py --arch mobilenet_v3_large --epochs 10
                   .venv\\Scripts\\python train.py --data combined   # run "mobilenet_v3_large_combined"

Keeps the checkpoint with the best validation macro-F1 in runs/<run>/best.pt and
logs every epoch to runs/<run>/history.json.
"""

import argparse
import json
import time
from collections import Counter

import torch
from sklearn.metrics import accuracy_score, f1_score
from torch import nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from common import IMAGE_SIZE, MEAN, RUNS_DIR, STD
from data import DATASETS, EVAL_TRANSFORM, TRAIN_TRANSFORM, LeafDataset, class_names, read_split
from nets import ARCHITECTURES, build_model


def class_weights(classes: list[str], dataset: str, power: float = 1.0) -> torch.Tensor:
    """Inverse-frequency weights, so rare classes aren't drowned out by common ones.

    power 1 fully evens out class sizes; 0.5 (square root) is gentler, for data sets
    where the biggest class is a hundred times the smallest and full weights would
    overfit the smallest.
    """
    counts = Counter(label for _, label in read_split("train", dataset))
    total = sum(counts.values())
    return torch.tensor(
        [(total / (len(classes) * counts[name])) ** power for name in classes], dtype=torch.float32
    )


@torch.no_grad()
def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple[float, float]:
    model.eval()
    predictions, targets = [], []
    for images, labels in loader:
        with torch.autocast(device.type, enabled=device.type == "cuda"):
            logits = model(images.to(device, non_blocking=True))
        predictions.extend(logits.argmax(1).cpu().tolist())
        targets.extend(labels.tolist())
    return accuracy_score(targets, predictions), f1_score(targets, predictions, average="macro")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--arch", choices=ARCHITECTURES, default="mobilenet_v3_large")
    parser.add_argument("--data", choices=DATASETS, default="plantvillage")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--weight-power", type=float, default=1.0, help="1 = inverse frequency, 0.5 = its square root")
    parser.add_argument("--run", default=None, help="run name (defaults to the architecture, plus the data set)")
    args = parser.parse_args()

    torch.manual_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'}")

    classes = class_names(args.data)
    loaders = {
        split: DataLoader(
            LeafDataset(split, classes, TRAIN_TRANSFORM if split == "train" else EVAL_TRANSFORM, args.data),
            batch_size=args.batch_size,
            shuffle=split == "train",
            num_workers=args.workers,
            pin_memory=device.type == "cuda",
            persistent_workers=args.workers > 0,
        )
        for split in ("train", "val")
    }
    print(f"{len(classes)} classes, {len(loaders['train'].dataset)} train / {len(loaders['val'].dataset)} val images")

    model = build_model(args.arch, len(classes)).to(device)
    weights = class_weights(classes, args.data, args.weight_power)
    criterion = nn.CrossEntropyLoss(weight=weights.to(device), label_smoothing=0.1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=args.lr, total_steps=args.epochs * len(loaders["train"]), pct_start=0.15
    )
    scaler = torch.amp.GradScaler(enabled=device.type == "cuda")

    default_run = args.arch if args.data == "plantvillage" else f"{args.arch}_{args.data}"
    run_dir = RUNS_DIR / (args.run or default_run)
    run_dir.mkdir(parents=True, exist_ok=True)
    history, best_f1 = [], -1.0

    for epoch in range(1, args.epochs + 1):
        model.train()
        started, running_loss = time.time(), 0.0
        for images, labels in tqdm(loaders["train"], desc=f"epoch {epoch}/{args.epochs}", leave=False):
            images, labels = images.to(device, non_blocking=True), labels.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device.type, enabled=device.type == "cuda"):
                loss = criterion(model(images), labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()
            running_loss += loss.item() * images.size(0)

        val_acc, val_f1 = evaluate(model, loaders["val"], device)
        record = {
            "epoch": epoch,
            "train_loss": running_loss / len(loaders["train"].dataset),
            "val_accuracy": val_acc,
            "val_macro_f1": val_f1,
            "seconds": round(time.time() - started, 1),
        }
        history.append(record)
        print(
            f"epoch {epoch:2d}  loss {record['train_loss']:.4f}  val acc {val_acc:.4f}  "
            f"val F1 {val_f1:.4f}  ({record['seconds']}s)"
        )

        if val_f1 > best_f1:
            best_f1 = val_f1
            torch.save(
                {
                    "arch": args.arch,
                    "data": args.data,
                    "weight_power": args.weight_power,
                    "classes": classes,
                    "state_dict": model.state_dict(),
                    "epoch": epoch,
                    "val_accuracy": val_acc,
                    "val_macro_f1": val_f1,
                    "input_size": IMAGE_SIZE,
                    "mean": MEAN,
                    "std": STD,
                },
                run_dir / "best.pt",
            )

        (run_dir / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")

    print(f"Best val macro-F1 {best_f1:.4f}; checkpoint at {run_dir / 'best.pt'}")


if __name__ == "__main__":
    main()

"""Measures the trained model on the held-out test split.

Usage (from ml/):  .venv\\Scripts\\python evaluate.py --run mobilenet_v3_large

Two views of the same predictions:
  open        the model picks among every class
  crop_first  only the classes of the photo's crop compete (plus "no leaf"),
              which is how the app works: the farmer picks the crop first

Writes to reports/<run>/:
  metrics.json               accuracy, F1, calibration, confidence analysis, per-source
                             and per-crop results, top confusions
  classification_report.txt  per-class precision, recall, F1 (crop-first)
  confusion_matrix.png       row-normalised confusion matrix (crop-first)
"""

import argparse
import json
from collections import Counter, defaultdict

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from torch.utils.data import DataLoader

from common import REPORTS_DIR, RUNS_DIR, expected_calibration_error, load_temperature, parse_label
from data import EVAL_TRANSFORM, LeafDataset, read_rows
from nets import build_model
from plantvillage import app_label

# Same cut-off as the backend: below it the farmer is sent to an expert.
CONFIDENCE_THRESHOLD = 0.6


def short_name(label: str) -> str:
    info = parse_label(app_label(label))
    if not info.is_leaf:
        return "No leaf"
    return f"{info.crop_id.replace('_', ' ')}: {info.disease or 'healthy'}"


def crop_masks(classes: list[str]) -> tuple[np.ndarray, dict[str | None, np.ndarray]]:
    """Each class's crop, and for each crop which classes may compete (its own plus "no leaf")."""
    infos = [parse_label(app_label(name)) for name in classes]
    crops = np.array([info.crop_id for info in infos], dtype=object)
    not_leaf = np.array([not info.is_leaf for info in infos])
    masks = {crop: (crops == crop) | not_leaf for crop in set(crops) if crop is not None}
    masks[None] = np.ones(len(classes), dtype=bool)  # "no leaf" photos: nothing to restrict
    return crops, masks


def summarise(y_true: np.ndarray, probs: np.ndarray) -> dict:
    y_pred, confidence = probs.argmax(1), probs.max(1)
    confident = confidence >= CONFIDENCE_THRESHOLD
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "macro_f1": f1_score(y_true, y_pred, average="macro"),
        "weighted_f1": f1_score(y_true, y_pred, average="weighted"),
        "expected_calibration_error": expected_calibration_error(probs, y_true),
        # How often the app would say "consult an expert", and how right it is otherwise.
        "share_sent_to_expert": float(1 - confident.mean()),
        "accuracy_when_confident": float((y_pred[confident] == y_true[confident]).mean()) if confident.any() else None,
        "accuracy_when_unsure": float((y_pred[~confident] == y_true[~confident]).mean()) if (~confident).any() else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", default="mobilenet_v3_large")
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()

    checkpoint = torch.load(RUNS_DIR / args.run / "best.pt", map_location="cpu")
    classes: list[str] = checkpoint["classes"]
    dataset = checkpoint.get("data", "plantvillage")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(checkpoint["arch"], len(classes), pretrained=False)
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device).eval()

    loader = DataLoader(
        LeafDataset("test", classes, EVAL_TRANSFORM, dataset),
        batch_size=args.batch_size,
        num_workers=args.workers,
        pin_memory=device.type == "cuda",
    )
    temperature = load_temperature(args.run)
    all_logits, targets = [], []
    with torch.no_grad():
        for images, labels in loader:
            all_logits.append(model(images.to(device, non_blocking=True)).float().cpu() / temperature)
            targets.append(labels)
    logits = torch.cat(all_logits).double().numpy()
    y_true = torch.cat(targets).numpy()
    sources = np.array([row.get("source", dataset) for row in read_rows("test", dataset)])

    def softmax(values: np.ndarray) -> np.ndarray:
        exp = np.exp(values - values.max(1, keepdims=True))
        return exp / exp.sum(1, keepdims=True)

    # Confidence is reported the way the backend will report it: calibrated, and crop-first.
    crops, masks = crop_masks(classes)
    allowed = np.stack([masks[crops[t]] for t in y_true])
    probs_open = softmax(logits)
    probs = softmax(np.where(allowed, logits, -np.inf))
    y_pred = probs.argmax(1)

    def breakdown(groups: np.ndarray) -> dict:
        result = {}
        for group in sorted(set(groups), key=str):
            chosen = groups == group
            result[str(group)] = {
                "images": int(chosen.sum()),
                "accuracy": float((y_pred[chosen] == y_true[chosen]).mean()),
                "macro_f1": float(f1_score(y_true[chosen], y_pred[chosen], average="macro")),
            }
        return result

    errors = Counter((classes[t], classes[p]) for t, p in zip(y_true, y_pred) if t != p).most_common(15)
    metrics = {
        "run": args.run,
        "arch": checkpoint["arch"],
        "data": dataset,
        "test_images": int(len(y_true)),
        "classes": len(classes),
        "temperature": temperature,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "crop_first": summarise(y_true, probs),
        "open": summarise(y_true, probs_open),
        "by_source": breakdown(sources) if dataset != "plantvillage" else None,
        "by_crop": breakdown(np.array([crops[t] or "no_leaf" for t in y_true], dtype=object)),
        "top_confusions": [{"true": t, "predicted": p, "count": n} for (t, p), n in errors],
    }
    # Headline numbers at the top level too, for export.py and older readers.
    metrics.update({k: metrics["crop_first"][k] for k in ("accuracy", "macro_f1")})

    out_dir = REPORTS_DIR / args.run
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    report = classification_report(
        y_true, y_pred, labels=range(len(classes)), target_names=classes, digits=4, zero_division=0
    )
    (out_dir / "classification_report.txt").write_text(report, encoding="utf-8")

    matrix = confusion_matrix(y_true, y_pred, labels=range(len(classes)), normalize="true")
    names = [short_name(c) for c in classes]
    side = max(18, len(classes) * 0.28)
    fig, ax = plt.subplots(figsize=(side, side * 0.9))
    image = ax.imshow(matrix, cmap="Greens", vmin=0, vmax=1)
    ax.set_xticks(range(len(names)), names, rotation=90, fontsize=6 if len(names) > 60 else 7)
    ax.set_yticks(range(len(names)), names, fontsize=6 if len(names) > 60 else 7)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title(
        f"AgroLens {checkpoint['arch']} on the {dataset} test split, crop-first "
        f"(accuracy {metrics['accuracy']:.4f}, macro-F1 {metrics['macro_f1']:.4f})"
    )
    fig.colorbar(image, ax=ax, fraction=0.03)
    fig.tight_layout()
    fig.savefig(out_dir / "confusion_matrix.png", dpi=150)

    print(report)
    print(json.dumps({k: metrics[k] for k in ("crop_first", "open", "by_source")}, indent=2))
    print("Most frequent confusions:")
    for item in metrics["top_confusions"]:
        print(f"  {item['count']:3d}  {short_name(item['true'])}  ->  {short_name(item['predicted'])}")
    print(f"\nReports written to {out_dir}")


if __name__ == "__main__":
    main()

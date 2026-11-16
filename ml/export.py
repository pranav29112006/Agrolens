"""Exports the trained model to ONNX for the backend, then checks the backend agrees with PyTorch.

Usage (from ml/):  .venv\\Scripts\\python export.py --run mobilenet_v3_large

Writes backend/models/agrolens.onnx and backend/models/agrolens.json (labels,
preprocessing and the calibration temperature). The check runs the backend's own classifier, preprocessing
included, on test images and fails if any prediction differs from PyTorch's.
"""

import argparse
import json
import sys

import torch
from PIL import Image

from common import BACKEND_MODELS_DIR, DATA_DIR, ML_DIR, REPORTS_DIR, RUNS_DIR, load_temperature
from data import EVAL_TRANSFORM, read_split
from nets import build_model
from plantvillage import app_label


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", default="mobilenet_v3_large")
    parser.add_argument("--name", default="agrolens", help="file name in backend/models")
    parser.add_argument("--check", type=int, default=200, help="test images used for the parity check")
    args = parser.parse_args()

    checkpoint = torch.load(RUNS_DIR / args.run / "best.pt", map_location="cpu")
    classes: list[str] = checkpoint["classes"]
    model = build_model(checkpoint["arch"], len(classes), pretrained=False)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    BACKEND_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    onnx_path = BACKEND_MODELS_DIR / f"{args.name}.onnx"
    size = checkpoint["input_size"]
    torch.onnx.export(
        model,
        (torch.randn(1, 3, size, size),),
        onnx_path,
        input_names=["image"],
        output_names=["logits"],
        dynamo=True,
        external_data=False,
    )

    temperature = load_temperature(args.run)
    metrics_path = REPORTS_DIR / args.run / "metrics.json"
    test_metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else {}
    sidecar = {
        # Older checkpoints use PlantVillage folder names; the backend expects app class names.
        "labels": [app_label(name) for name in classes],
        "input_size": size,
        "mean": checkpoint["mean"],
        "std": checkpoint["std"],
        "temperature": temperature,
        "arch": checkpoint["arch"],
        "data": checkpoint.get("data", "plantvillage"),
        "run": args.run,
        "val_macro_f1": checkpoint["val_macro_f1"],
        "test_accuracy": test_metrics.get("accuracy"),
        "test_macro_f1": test_metrics.get("macro_f1"),
    }
    onnx_path.with_suffix(".json").write_text(json.dumps(sidecar, indent=2), encoding="utf-8")
    print(f"Exported {onnx_path} ({onnx_path.stat().st_size / 1e6:.1f} MB) and its sidecar JSON")

    # Parity check against the service exactly as it will run in production.
    sys.path.insert(0, str(ML_DIR.parent / "backend"))
    from app.vision.classifier import LeafClassifier

    served = LeafClassifier.load(onnx_path)
    rows = read_split("test", checkpoint.get("data", "plantvillage"))
    samples = rows[:: max(1, len(rows) // args.check)][: args.check]  # spread across all classes

    mismatches, largest_gap = [], 0.0
    for path, _ in samples:
        with Image.open(DATA_DIR / path) as opened:
            image = opened.convert("RGB")
        with torch.no_grad():
            probs = torch.softmax(model(EVAL_TRANSFORM(image).unsqueeze(0)) / temperature, dim=1)[0]
        expected = app_label(classes[int(probs.argmax())])
        got = served.predict(image, top_k=1)[0]
        largest_gap = max(largest_gap, abs(float(probs.max()) - got.confidence))
        if got.info.label != expected:
            mismatches.append((path, expected, got.info.label))

    print(
        f"Backend vs PyTorch on {len(samples)} test images: {len(samples) - len(mismatches)} agree, "
        f"largest confidence gap {largest_gap:.5f}"
    )
    if mismatches:
        for path, expected, got in mismatches[:10]:
            print(f"  MISMATCH {path}: PyTorch {expected}, backend {got}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()

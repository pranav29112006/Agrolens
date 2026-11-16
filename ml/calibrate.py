"""Calibrates the model's confidence with temperature scaling on the validation split.

Usage (from ml/):  .venv\\Scripts\\python calibrate.py --run mobilenet_v3_large

Label smoothing and class weighting make the network under-confident: it is almost
always right, but often reports well under 60%, which would send farmers to an
expert for no reason. Dividing the logits by one fitted temperature fixes the
confidence without changing any prediction. Writes runs/<run>/calibration.json,
which evaluate.py and export.py pick up.
"""

import argparse
import json

import torch
from torch.nn import functional as F
from torch.utils.data import DataLoader

from common import RUNS_DIR, expected_calibration_error
from data import EVAL_TRANSFORM, LeafDataset
from nets import build_model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", default="mobilenet_v3_large")
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()

    checkpoint = torch.load(RUNS_DIR / args.run / "best.pt", map_location="cpu")
    classes: list[str] = checkpoint["classes"]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(checkpoint["arch"], len(classes), pretrained=False)
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device).eval()

    loader = DataLoader(
        LeafDataset("val", classes, EVAL_TRANSFORM, checkpoint.get("data", "plantvillage")),
        batch_size=args.batch_size,
        num_workers=args.workers,
        pin_memory=device.type == "cuda",
    )
    all_logits, all_targets = [], []
    with torch.no_grad():
        for images, labels in loader:
            all_logits.append(model(images.to(device, non_blocking=True)).float().cpu())
            all_targets.append(labels)
    logits, targets = torch.cat(all_logits).double(), torch.cat(all_targets)

    # Fit log(T) so the temperature stays positive.
    log_t = torch.zeros(1, dtype=torch.float64, requires_grad=True)
    optimizer = torch.optim.LBFGS([log_t], lr=0.1, max_iter=200)

    def closure():
        optimizer.zero_grad()
        loss = F.cross_entropy(logits / log_t.exp(), targets)
        loss.backward()
        return loss

    optimizer.step(closure)
    temperature = float(log_t.detach().exp())

    def summary(t: float) -> dict:
        probs = torch.softmax(logits / t, dim=1)
        return {
            "nll": float(F.cross_entropy(logits / t, targets)),
            "ece": expected_calibration_error(probs.numpy(), targets.numpy()),
            "mean_confidence": float(probs.max(1).values.mean()),
            "share_below_0.6": float((probs.max(1).values < 0.6).double().mean()),
        }

    result = {
        "temperature": temperature,
        "fitted_on": f"val split ({len(targets)} images)",
        "val_accuracy": float((logits.argmax(1) == targets).double().mean()),
        "before": summary(1.0),
        "after": summary(temperature),
    }
    (RUNS_DIR / args.run / "calibration.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

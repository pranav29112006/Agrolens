"""Paths and settings shared by the training scripts."""

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np

ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
SPLITS_DIR = DATA_DIR / "splits"
RUNS_DIR = ML_DIR / "runs"
REPORTS_DIR = ML_DIR / "reports"
BACKEND_MODELS_DIR = ML_DIR.parent / "backend" / "models"

# Must match what the backend does before inference (resize, then ImageNet normalisation).
IMAGE_SIZE = 224
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


def _load_backend_labels():
    """The label scheme comes from the backend, which serves the model, so the two can't drift apart."""
    path = ML_DIR.parent / "backend" / "app" / "vision" / "labels.py"
    spec = importlib.util.spec_from_file_location("agrolens_labels", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


_labels = _load_backend_labels()
NOT_A_LEAF: str = _labels.NOT_A_LEAF
parse_label = _labels.parse_label


def load_temperature(run: str) -> float:
    """The confidence temperature fitted by calibrate.py, or 1.0 (no change) if it hasn't been run."""
    path = RUNS_DIR / run / "calibration.json"
    return json.loads(path.read_text(encoding="utf-8"))["temperature"] if path.exists() else 1.0


def expected_calibration_error(probs: np.ndarray, targets: np.ndarray, bins: int = 15) -> float:
    """Average gap between how confident the model is and how often it is right (0 is perfect)."""
    confidence, correct = probs.max(1), probs.argmax(1) == targets
    edges = np.linspace(0, 1, bins + 1)
    error = 0.0
    for low, high in zip(edges[:-1], edges[1:]):
        in_bin = (confidence > low) & (confidence <= high)
        if in_bin.any():
            error += in_bin.mean() * abs(correct[in_bin].mean() - confidence[in_bin].mean())
    return float(error)

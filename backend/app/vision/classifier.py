"""Stage 1: runs the exported CNN (ONNX) on a leaf photo.

Training happens in ../ml with PyTorch or Keras; both export to ONNX, so this
service only needs onnxruntime. The export writes a sidecar JSON next to the
model, e.g. models/agrolens.json:

    {"labels": ["apple___Apple_scab", ...], "input_size": 224,
     "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225], "temperature": 0.38}

The temperature (fitted by ml/calibrate.py) divides the logits before softmax so
the confidence we show matches how often the model is actually right.
"""

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from app.vision.labels import LabelInfo, parse_label

# ImageNet statistics, used by pretrained PyTorch backbones.
DEFAULT_MEAN = [0.485, 0.456, 0.406]
DEFAULT_STD = [0.229, 0.224, 0.225]


@dataclass(frozen=True)
class Prediction:
    info: LabelInfo
    confidence: float


class LeafClassifier:
    def __init__(self, model_path: Path, config: dict):
        import onnxruntime as ort

        self._session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        model_input = self._session.get_inputs()[0]
        self._input_name = model_input.name
        # Channels-first (PyTorch) or channels-last (Keras) input.
        self._channels_first = model_input.shape[1] == 3

        self.labels: list[str] = config["labels"]
        self._infos = [parse_label(label) for label in self.labels]
        # Crops the model can diagnose; the app asks the farmer for one of these first.
        self.crops: frozenset[str] = frozenset(info.crop_id for info in self._infos if info.crop_id)
        self._size: int = config.get("input_size", 224)
        self._mean = np.array(config.get("mean", DEFAULT_MEAN), dtype=np.float32)
        self._std = np.array(config.get("std", DEFAULT_STD), dtype=np.float32)
        self._temperature: float = config.get("temperature", 1.0)

    @classmethod
    def load(cls, model_path: Path) -> "LeafClassifier | None":
        """Returns None when no model has been exported yet, so the API can still start."""
        if not model_path.exists():
            return None
        sidecar = model_path.with_suffix(".json")
        if not sidecar.exists():
            raise FileNotFoundError(f"{sidecar} is missing; it lists the model's classes (see ml/export.py)")
        return cls(model_path, json.loads(sidecar.read_text(encoding="utf-8")))

    def _preprocess(self, image: Image.Image) -> np.ndarray:
        resized = image.convert("RGB").resize((self._size, self._size), Image.Resampling.BILINEAR)
        pixels = (np.asarray(resized, dtype=np.float32) / 255.0 - self._mean) / self._std
        if self._channels_first:
            pixels = pixels.transpose(2, 0, 1)
        return pixels[np.newaxis].astype(np.float32)

    def predict(self, image: Image.Image, top_k: int = 3, crop_id: str | None = None) -> list[Prediction]:
        """Most likely classes, best first.

        With crop_id (the crop the farmer picked), only that crop's classes and the
        no-leaf class compete, and confidences are renormalised over them.
        """
        if crop_id is not None and crop_id not in self.crops:
            raise ValueError(f"The model doesn't cover crop {crop_id!r}")

        (scores,) = self._session.run(None, {self._input_name: self._preprocess(image)})
        scores = scores[0].astype(np.float64)

        # Models may end in raw logits or in softmax already; work in log space either way.
        is_probability = np.all(scores >= 0) and abs(scores.sum() - 1) < 1e-3
        logits = np.log(np.clip(scores, 1e-12, None)) if is_probability else scores / self._temperature

        allowed = np.array([crop_id is None or info.crop_id == crop_id or not info.is_leaf for info in self._infos])
        logits = np.where(allowed, logits, -np.inf)
        exp = np.exp(logits - logits.max())
        probs = exp / exp.sum()

        best = [i for i in np.argsort(probs)[::-1][:top_k] if allowed[i]]
        return [Prediction(info=self._infos[i], confidence=float(probs[i])) for i in best]

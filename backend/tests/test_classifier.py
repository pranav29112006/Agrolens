"""Runs the real LeafClassifier on tiny.onnx, whose logits are fixed at [0, 2, 1, 3, 0.5]."""

import json
import math
import shutil
from pathlib import Path

import pytest
from PIL import Image

from app.vision.classifier import LeafClassifier

FIXTURES = Path(__file__).parent / "fixtures"
LEAF = Image.new("RGB", (300, 300), (40, 140, 60))


def softmax(values: list[float]) -> list[float]:
    exps = [math.exp(v) for v in values]
    return [e / sum(exps) for e in exps]


@pytest.fixture
def classifier() -> LeafClassifier:
    return LeafClassifier.load(FIXTURES / "tiny.onnx")


def test_lists_the_crops_it_covers(classifier):
    assert classifier.crops == {"potato", "tomato"}


def test_without_a_crop_every_class_competes(classifier):
    best = classifier.predict(LEAF, top_k=2)
    assert [p.info.label for p in best] == ["tomato___Late_blight", "potato___Early_blight"]
    assert best[0].confidence == pytest.approx(softmax([0, 2, 1, 3, 0.5])[3], abs=1e-5)


def test_picked_crop_limits_the_answer_to_its_diseases(classifier):
    best = classifier.predict(LEAF, top_k=5, crop_id="potato")
    # Only potato classes and "no leaf" are allowed, renormalised among themselves.
    assert [p.info.label for p in best] == ["potato___Early_blight", "potato___healthy", "Background_without_leaves"]
    assert best[0].confidence == pytest.approx(softmax([0, 2, 1])[1], abs=1e-5)
    assert sum(p.confidence for p in best) == pytest.approx(1, abs=1e-5)


def test_unknown_crop_is_an_error(classifier):
    with pytest.raises(ValueError):
        classifier.predict(LEAF, crop_id="onion")


def test_temperature_sharpens_confidence(tmp_path):
    shutil.copy(FIXTURES / "tiny.onnx", tmp_path / "tiny.onnx")
    config = json.loads((FIXTURES / "tiny.json").read_text()) | {"temperature": 0.5}
    (tmp_path / "tiny.json").write_text(json.dumps(config))

    best = LeafClassifier.load(tmp_path / "tiny.onnx").predict(LEAF, top_k=1)[0]
    assert best.confidence == pytest.approx(softmax([0, 4, 2, 6, 1])[3], abs=1e-5)


def test_missing_model_is_not_an_error(tmp_path):
    assert LeafClassifier.load(tmp_path / "absent.onnx") is None

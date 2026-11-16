"""Builds tiny.onnx: a stand-in model whose logits are fixed, for classifier tests.

Needs PyTorch, so run it with the ml/ environment (from the repo root):
    ml\\.venv\\Scripts\\python backend\\tests\\fixtures\\make_tiny_model.py
"""

import json
from pathlib import Path

import torch
from torch import nn

HERE = Path(__file__).resolve().parent
LABELS = [
    "Background_without_leaves",
    "potato___Early_blight",
    "potato___healthy",
    "tomato___Late_blight",
    "tomato___healthy",
]
LOGITS = [0.0, 2.0, 1.0, 3.0, 0.5]

model = nn.Sequential(nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(3, len(LABELS)))
with torch.no_grad():
    model[2].weight.zero_()
    model[2].bias.copy_(torch.tensor(LOGITS))
model.eval()

torch.onnx.export(
    model, (torch.zeros(1, 3, 224, 224),), HERE / "tiny.onnx",
    input_names=["image"], output_names=["logits"], dynamo=True, external_data=False,
)
(HERE / "tiny.json").write_text(json.dumps({"labels": LABELS, "input_size": 224}, indent=2), encoding="utf-8")
print("wrote", HERE / "tiny.onnx")

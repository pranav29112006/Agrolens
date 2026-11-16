"""Backbones: ImageNet-pretrained, with a new classification layer for our classes."""

from torch import nn
from torchvision import models

ARCHITECTURES = ("mobilenet_v3_large", "efficientnet_b0")


def build_model(arch: str, num_classes: int, pretrained: bool = True) -> nn.Module:
    if arch == "mobilenet_v3_large":
        weights = models.MobileNet_V3_Large_Weights.IMAGENET1K_V2 if pretrained else None
        model = models.mobilenet_v3_large(weights=weights)
    elif arch == "efficientnet_b0":
        weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        model = models.efficientnet_b0(weights=weights)
    else:
        raise ValueError(f"Unknown architecture {arch!r}; choose from {ARCHITECTURES}")

    # Both torchvision models end in a Linear layer inside `classifier`.
    last = model.classifier[-1]
    model.classifier[-1] = nn.Linear(last.in_features, num_classes)
    return model

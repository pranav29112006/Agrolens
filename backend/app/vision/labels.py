"""What the model's class names mean for the app.

Every class is "<crop_id>___<Condition>": crop_id is an id from
mobile/src/constants/crops.ts, and Condition is the English disease name with
underscores for spaces, or "healthy". For example "tomato___Late_blight" or
"rice___healthy". One extra class, NOT_A_LEAF, catches photos with no leaf in
them. The model's sidecar JSON lists the classes in training order, and ml/
builds them, so the two can't drift apart.
"""

import re
from dataclasses import dataclass

NOT_A_LEAF = "Background_without_leaves"
HEALTHY = "healthy"


@dataclass(frozen=True)
class LabelInfo:
    label: str  # the raw class name, e.g. "tomato___Late_blight"
    key: str  # stable slug for the knowledge base, e.g. "tomato_late_blight"
    crop_id: str | None
    disease: str | None  # human-readable English name; None when healthy
    is_healthy: bool
    is_leaf: bool = True


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def parse_label(label: str) -> LabelInfo:
    if label == NOT_A_LEAF:
        return LabelInfo(
            label=label, key=_slug(label), crop_id=None, disease=None, is_healthy=False, is_leaf=False
        )

    crop_id, separator, condition = label.partition("___")
    if not separator or not crop_id or not condition:
        raise ValueError(f"Class name must look like 'crop_id___Condition': {label!r}")
    is_healthy = condition == HEALTHY
    disease = None if is_healthy else re.sub(r"\s+", " ", condition.replace("_", " ")).strip()
    return LabelInfo(label=label, key=_slug(label), crop_id=crop_id, disease=disease, is_healthy=is_healthy)

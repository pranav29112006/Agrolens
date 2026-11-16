"""Cheap checks that stop obviously bad photos before they reach the CNN.

Farmers' phone photos are often dark, blown out or shaky; the model would still
return a confident-looking answer for them, so we ask for a retake instead.
"""

import numpy as np
from PIL import Image

MIN_SIDE_PX = 160
# Mean brightness on a 0-255 scale.
TOO_DARK = 45
TOO_BRIGHT = 225
# Variance of the Laplacian after shrinking to at most ANALYSIS_WIDTH; lower means blurrier.
# Tuned on the PlantVillage test split: photos under ~15 are visibly out of focus, while
# sharp but smooth leaves (citrus, corn) sit around 50, so 25 rejects 0.4% of them.
BLUR_THRESHOLD = 25.0
ANALYSIS_WIDTH = 512


def sharpness(gray: np.ndarray) -> float:
    """Variance of a 4-neighbour Laplacian: sharp edges give large values."""
    laplacian = (
        4 * gray[1:-1, 1:-1]
        - gray[:-2, 1:-1]
        - gray[2:, 1:-1]
        - gray[1:-1, :-2]
        - gray[1:-1, 2:]
    )
    return float(laplacian.var())


def check_quality(image: Image.Image) -> list[str]:
    """Returns problem codes the app can explain: too_small, too_dark, too_bright, blurry."""
    if min(image.size) < MIN_SIDE_PX:
        return ["too_small"]

    # Shrink big photos so the blur threshold means roughly the same for every photo, but
    # never enlarge small ones: upscaling itself blurs and rejected 21% of good 256 px leaves.
    width = min(image.width, ANALYSIS_WIDTH)
    height = max(1, round(image.height * width / image.width))
    gray = np.asarray(image.convert("L").resize((width, height)), dtype=np.float32)

    issues = []
    brightness = float(gray.mean())
    if brightness < TOO_DARK:
        issues.append("too_dark")
    elif brightness > TOO_BRIGHT:
        issues.append("too_bright")
    if sharpness(gray) < BLUR_THRESHOLD:
        issues.append("blurry")
    return issues

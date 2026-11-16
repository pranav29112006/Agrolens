import numpy as np
from PIL import Image

from app.vision.quality import check_quality


def solid(value: int, size: int = 400) -> Image.Image:
    return Image.new("RGB", (size, size), (value, value, value))


def textured(size: int = 400) -> Image.Image:
    pixels = np.random.default_rng(0).integers(60, 200, (size, size, 3), dtype=np.uint8)
    return Image.fromarray(pixels)


def test_detailed_photo_passes():
    assert check_quality(textured()) == []


def test_small_sharp_photo_is_not_enlarged_into_blur():
    # Crisp stripes on a 256 px photo, like PlantVillage's; enlarging to 512 px first scored it 5.
    columns = ((np.arange(256) // 16) % 2) * 20 + 110
    stripes = Image.fromarray(np.tile(columns, (256, 1)).astype(np.uint8)).convert("RGB")
    assert check_quality(stripes) == []


def test_flat_photo_is_blurry():
    assert check_quality(solid(128)) == ["blurry"]


def test_dark_and_bright_photos():
    assert "too_dark" in check_quality(solid(10))
    assert "too_bright" in check_quality(solid(250))


def test_tiny_photo():
    assert check_quality(textured(100)) == ["too_small"]

import pytest

from app.vision.labels import parse_label


def test_parses_disease_label():
    info = parse_label("tomato___Late_blight")
    assert info.crop_id == "tomato"
    assert info.disease == "Late blight"
    assert info.key == "tomato_late_blight"
    assert not info.is_healthy


def test_parses_healthy_label():
    info = parse_label("rice___healthy")
    assert info.crop_id == "rice"
    assert info.is_healthy and info.disease is None


def test_background_class_is_not_a_leaf():
    info = parse_label("Background_without_leaves")
    assert not info.is_leaf
    assert info.crop_id is None and info.disease is None


@pytest.mark.parametrize("bad", ["Tomato", "___Late_blight", "tomato___"])
def test_rejects_malformed_labels(bad):
    with pytest.raises(ValueError):
        parse_label(bad)

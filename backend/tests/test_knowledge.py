import json

import pytest

from app.advisory.advisor import advise
from app.advisory.knowledge import KnowledgeBase
from app.config import get_settings
from app.vision.labels import parse_label

GUIDANCE = {
    "cause": "Water mold",
    "symptoms": ["Dark blotches on leaves."],
    "treatment": ["Remove infected plants."],
    "prevention": ["Keep leaves dry."],
    "sources": [{"title": "A source", "url": "https://example.org/late-blight"}],
}


def write_kb(directory, crop: str, entries: dict) -> None:
    (directory / f"{crop}.json").write_text(json.dumps(entries), encoding="utf-8")


def test_missing_folder_is_an_empty_knowledge_base(tmp_path):
    assert KnowledgeBase.load(tmp_path / "nothing").labels == frozenset()


def test_entry_is_found_by_class_name(tmp_path):
    write_kb(tmp_path, "tomato", {"tomato___Late_blight": GUIDANCE})
    knowledge = KnowledgeBase.load(tmp_path)
    assert knowledge.get("tomato___Late_blight").treatment == ["Remove infected plants."]
    assert knowledge.get("tomato___Early_blight") is None


def test_entry_in_the_wrong_crop_file_is_rejected(tmp_path):
    write_kb(tmp_path, "potato", {"tomato___Late_blight": GUIDANCE})
    with pytest.raises(ValueError):
        KnowledgeBase.load(tmp_path)


def test_entry_without_a_source_is_rejected(tmp_path):
    write_kb(tmp_path, "tomato", {"tomato___Late_blight": {**GUIDANCE, "sources": []}})
    with pytest.raises(ValueError):
        KnowledgeBase.load(tmp_path)


def test_advice_for_each_kind_of_prediction(tmp_path):
    write_kb(tmp_path, "tomato", {"tomato___Late_blight": GUIDANCE})
    knowledge = KnowledgeBase.load(tmp_path)

    assert advise(parse_label("tomato___Late_blight"), False, knowledge) == ("consult_expert", None)
    assert advise(parse_label("tomato___healthy"), True, knowledge) == ("healthy", None)
    assert advise(parse_label("tomato___Target_spot"), True, knowledge) == ("pending", None)
    kind, guidance = advise(parse_label("tomato___Late_blight"), True, knowledge)
    assert kind == "treatment"
    assert guidance.cause == "Water mold"


def test_shipped_knowledge_base_matches_the_model():
    """Every entry in backend/kb must be a disease class the exported model can predict."""
    settings = get_settings()
    knowledge = KnowledgeBase.load(settings.kb_dir)
    assert knowledge.labels, "backend/kb has no entries"
    assert not any(parse_label(label).is_healthy for label in knowledge.labels)

    sidecar = settings.classifier_path.with_suffix(".json")
    if not sidecar.exists():
        pytest.skip("no exported model to compare against")
    model_labels = set(json.loads(sidecar.read_text(encoding="utf-8"))["labels"])
    assert knowledge.labels <= model_labels

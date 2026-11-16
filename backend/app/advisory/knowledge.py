"""The knowledge base Stage 2 answers from: one JSON file per crop in backend/kb.

Each file maps a model class name to what is known about that disease:

    {"tomato___Late_blight": {"cause": "...", "symptoms": ["..."], "treatment": ["..."],
                              "prevention": ["..."], "severity": "...",
                              "sources": [{"title": "...", "url": "..."}]}}

Entries are summaries of the published sources they list, not generated text,
so every entry must name at least one source. Keys are the model's own class
names, so a diagnosis finds its entry by exact lookup.
"""

import json
import re
from pathlib import Path

from pydantic import BaseModel, Field

from app.vision.labels import LabelInfo, parse_label

# Air this humid counts as the "damp" or "wet" weather the sources describe. They give
# no figure, so this is our own cut-off for the disease alerts, not a sourced one.
MOIST_HUMIDITY = 80


class Source(BaseModel):
    title: str
    url: str


class FavourableWeather(BaseModel):
    """Weather the sources say the disease develops best in; drives the disease alerts."""

    min_temp_c: float
    max_temp_c: float
    needs_moisture: bool = False

    def matches(self, temperature_c: float, humidity: float, is_raining: bool) -> bool:
        in_range = self.min_temp_c <= temperature_c <= self.max_temp_c
        return in_range and (not self.needs_moisture or is_raining or humidity >= MOIST_HUMIDITY)


class Guidance(BaseModel):
    # What causes the disease, e.g. "Fungus (Alternaria solani)".
    cause: str
    symptoms: list[str] = Field(min_length=1)
    # What to do for a crop that already has the disease.
    treatment: list[str] = Field(min_length=1)
    # How to keep it from coming back; empty when the sources give none.
    prevention: list[str] = []
    # How much damage to expect, when the sources say.
    severity: str | None = None
    sources: list[Source] = Field(min_length=1)
    # Left out of API responses: the app only needs the alert it leads to.
    weather: FavourableWeather | None = Field(default=None, exclude=True)

    def facts(self) -> dict:
        """What an LLM may reword: everything except where it came from."""
        return self.model_dump(exclude={"sources"})


class KnowledgeBase:
    def __init__(self, entries: dict[str, Guidance]):
        self._entries = entries

    @classmethod
    def load(cls, directory: Path) -> "KnowledgeBase":
        """Reads every crop file. A missing folder gives an empty knowledge base."""
        entries: dict[str, Guidance] = {}
        for path in sorted(directory.glob("*.json")):
            for label, entry in json.loads(path.read_text(encoding="utf-8")).items():
                # Catches an entry filed under the wrong crop or with a misspelt class name.
                if parse_label(label).crop_id != path.stem:
                    raise ValueError(f"{path.name}: {label!r} does not belong to crop {path.stem!r}")
                entries[label] = Guidance.model_validate(entry)
        return cls(entries)

    @property
    def labels(self) -> frozenset[str]:
        return frozenset(self._entries)

    def get(self, label: str) -> Guidance | None:
        return self._entries.get(label)

    def diseases(self, crop_id: str | None = None) -> list[LabelInfo]:
        """Every disease with an entry, optionally for one crop, in a stable order."""
        infos = [parse_label(label) for label in sorted(self._entries)]
        return [info for info in infos if crop_id is None or info.crop_id == crop_id]

    def tips(self, crop_id: str) -> list[str]:
        """How to keep a crop free of the diseases we know: their prevention steps, without repeats."""
        seen: set[str] = set()
        tips = []
        for info in self.diseases(crop_id):
            for step in self._entries[info.label].prevention:
                if step.lower() not in seen:
                    seen.add(step.lower())
                    tips.append(step)
        return tips

    def search(self, question: str, crop_ids: list[str], limit: int) -> list[LabelInfo]:
        """The entries most likely to answer a farmer's question.

        Entries for the farmer's own crops come first, then those sharing the most
        words with the question. The question may not be in English, so word overlap
        mostly catches crop, disease and chemical names; the crops do the rest.
        """
        words = set(re.findall(r"[a-z]{3,}", question.lower()))

        def score(info: LabelInfo) -> tuple[int, int]:
            entry = self._entries[info.label]
            text = f"{info.label} {json.dumps(entry.facts())}".lower()
            return (info.crop_id in crop_ids, sum(word in text for word in words))

        ranked = sorted(self.diseases(), key=score, reverse=True)
        return [info for info in ranked if any(score(info))][:limit]

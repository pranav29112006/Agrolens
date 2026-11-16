from pydantic import BaseModel, Field

from app.advisory.advisor import AdviceKind
from app.advisory.knowledge import Guidance, Source
from app.weather.spraying import SprayStatus


class SprayingOut(BaseModel):
    status: SprayStatus
    reasons: list[str]
    until: str | None


class WeatherOut(BaseModel):
    time: str
    temperature_c: float
    humidity: float
    wind_kmh: float
    weather_code: int
    is_day: bool
    spraying: SprayingOut


class PredictionOut(BaseModel):
    label: str
    key: str
    crop_id: str | None
    disease: str | None
    is_healthy: bool
    confidence: float


class AdviceOut(BaseModel):
    kind: AdviceKind
    # Only set when kind is "treatment".
    guidance: Guidance | None = None
    # Language the guidance is written in: the farmer's, or "en" when it couldn't be rewritten.
    language: str = "en"


class DiseaseOut(BaseModel):
    label: str
    crop_id: str | None
    disease: str | None


class TipsOut(BaseModel):
    tips: list[str]
    language: str


class QuestionIn(BaseModel):
    question: str = Field(min_length=2, max_length=500)
    language: str = "en"
    # Crop ids the farmer grows; their entries are retrieved first.
    crops: list[str] = Field(default=[], max_length=80)


class AnswerOut(BaseModel):
    answer: str
    sources: list[Source]


class DiagnosisOut(BaseModel):
    # None if the result couldn't be saved; the farmer still gets the answer.
    id: str | None
    image_path: str | None
    prediction: PredictionOut
    alternatives: list[PredictionOut]
    is_confident: bool
    advice: AdviceOut

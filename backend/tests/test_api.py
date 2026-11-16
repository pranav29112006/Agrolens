import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.advisory.assistant import Assistant
from app.advisory.gemini import Gemini
from app.advisory.writer import AdviceWriter
from app.main import app
from app.routes import library as library_route
from app.routes import weather as weather_route
from app.vision.classifier import Prediction
from app.vision.labels import parse_label


class FakeSupabase:
    def __init__(self):
        self.rows: list[dict] = []
        self.uploads: list[str] = []

    async def get_user(self, token):
        return {"id": "user-1", "email": "farmer@example.com"} if token == "good-token" else None

    async def upload_leaf_photo(self, token, path, data):
        self.uploads.append(path)

    async def insert_diagnosis(self, token, row):
        self.rows.append(row)
        return {**row, "id": "diagnosis-1"}


class FakeClassifier:
    crops = frozenset({"tomato", "potato"})

    def __init__(self, label: str, confidence: float):
        self._label, self._confidence = label, confidence
        self.asked_crop = None

    def predict(self, image, top_k=3, crop_id=None):
        self.asked_crop = crop_id
        return [
            Prediction(parse_label(self._label), self._confidence),
            Prediction(parse_label("tomato___healthy"), 1 - self._confidence),
        ]


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        app.state.supabase = FakeSupabase()
        app.state.classifier = None
        # Never call the real LLM from tests, even when backend/.env has a key.
        gemini = Gemini(app.state.http, api_key=None, models=[])
        app.state.writer = AdviceWriter(gemini)
        app.state.assistant = Assistant(gemini, app.state.knowledge)
        yield test_client


def leaf_photo() -> bytes:
    pixels = np.random.default_rng(1).integers(60, 200, (400, 400, 3), dtype=np.uint8)
    buffer = io.BytesIO()
    Image.fromarray(pixels).save(buffer, format="PNG")
    return buffer.getvalue()


def blurry_photo() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (400, 400), (120, 140, 110)).save(buffer, format="PNG")
    return buffer.getvalue()


def post_photo(client, data: bytes, token: str | None = "good-token", crop_id: str | None = None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    form = {"language": "hi"} | ({"crop_id": crop_id} if crop_id else {})
    return client.post(
        "/diagnose",
        files={"image": ("leaf.png", data, "image/png")},
        data=form,
        headers=headers,
    )


def test_health_reports_missing_model(client):
    assert client.get("/health").json() == {"status": "ok", "model_loaded": False, "crops": []}


def test_health_lists_supported_crops(client):
    app.state.classifier = FakeClassifier("tomato___Late_blight", 0.9)
    assert client.get("/health").json()["crops"] == ["potato", "tomato"]


def test_diagnose_requires_sign_in(client):
    assert post_photo(client, leaf_photo(), token=None).status_code == 401
    assert post_photo(client, leaf_photo(), token="bad-token").status_code == 401


def test_diagnose_rejects_blurry_photo(client):
    response = post_photo(client, blurry_photo())
    assert response.status_code == 422
    assert response.json()["detail"] == {"code": "poor_image", "issues": ["blurry"]}


def test_diagnose_without_model(client):
    assert post_photo(client, leaf_photo()).status_code == 503


def test_confident_diagnosis_is_saved(client):
    app.state.classifier = FakeClassifier("tomato___Late_blight", 0.93)
    response = post_photo(client, leaf_photo(), crop_id="tomato")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "diagnosis-1"
    assert body["prediction"]["crop_id"] == "tomato"
    assert body["prediction"]["disease"] == "Late blight"
    assert body["is_confident"] is True
    assert body["advice"]["kind"] == "treatment"
    assert body["advice"]["guidance"]["treatment"]
    assert body["advice"]["guidance"]["sources"][0]["url"].startswith("https://")

    assert app.state.classifier.asked_crop == "tomato"
    saved = app.state.supabase.rows[0]
    assert saved["user_id"] == "user-1"
    assert saved["language"] == "hi"
    assert saved["image_path"].startswith("user-1/")


def test_disease_without_a_knowledge_base_entry_is_pending(client):
    app.state.classifier = FakeClassifier("tomato___Not_written_yet", 0.93)
    body = post_photo(client, leaf_photo(), crop_id="tomato").json()
    assert body["advice"] == {"kind": "pending", "guidance": None, "language": "en"}


def test_photo_without_a_leaf_asks_for_retake(client):
    app.state.classifier = FakeClassifier("Background_without_leaves", 0.97)
    response = post_photo(client, leaf_photo())
    assert response.status_code == 422
    assert response.json()["detail"] == {"code": "poor_image", "issues": ["no_leaf"]}
    assert app.state.supabase.rows == []


def test_crop_the_model_does_not_cover_is_refused(client):
    app.state.classifier = FakeClassifier("tomato___Late_blight", 0.93)
    response = post_photo(client, leaf_photo(), crop_id="onion")
    assert response.status_code == 422
    assert response.json()["detail"] == {"code": "crop_not_supported"}
    assert app.state.classifier.asked_crop is None


def test_unsure_model_sends_farmer_to_expert(client):
    app.state.classifier = FakeClassifier("potato___Early_blight", 0.41)
    body = post_photo(client, leaf_photo()).json()
    assert body["is_confident"] is False
    assert body["advice"]["kind"] == "consult_expert"


SIGNED_IN = {"Authorization": "Bearer good-token"}


def test_library_lists_the_diseases_with_an_entry(client):
    diseases = client.get("/library").json()
    assert {"label": "tomato___Late_blight", "crop_id": "tomato", "disease": "Late blight"} in diseases
    assert all(entry["disease"] for entry in diseases)


def test_advice_for_a_past_scan_needs_sign_in(client):
    assert client.get("/advice", params={"label": "tomato___Late_blight"}).status_code == 401

    body = client.get("/advice", params={"label": "tomato___Late_blight", "language": "hi"}, headers=SIGNED_IN).json()
    assert body["kind"] == "treatment"
    # No LLM in tests, so the guidance comes back as written, in English.
    assert body["language"] == "en"
    assert "weather" not in body["guidance"]

    assert client.get("/advice", params={"label": "nonsense"}, headers=SIGNED_IN).status_code == 404


def test_tips_are_the_crops_prevention_steps(client):
    body = client.get("/tips", params={"crop_id": "tomato", "language": "hi"}, headers=SIGNED_IN).json()
    assert body["language"] == "en"
    assert len(body["tips"]) == len(set(body["tips"])) > 5
    assert client.get("/tips", params={"crop_id": "onion"}, headers=SIGNED_IN).json()["tips"] == []


def test_alerts_follow_the_weather(client, monkeypatch):
    current = {"temperature_2m": 18, "relative_humidity_2m": 90, "precipitation": 0}

    async def fake_fetch(http, latitude, longitude):
        return {"current": current}

    monkeypatch.setattr(library_route, "fetch_forecast", fake_fetch)
    params = {"lat": 9.59, "lon": 76.52, "crops": "tomato,rice"}

    # Cool and damp: late blight weather.
    assert [alert["label"] for alert in client.get("/alerts", params=params).json()] == ["tomato___Late_blight"]
    current["temperature_2m"] = 31
    assert client.get("/alerts", params=params).json() == []


def test_assistant_without_the_llm_is_unavailable(client):
    question = {"question": "How do I treat late blight?", "language": "en", "crops": ["tomato"]}
    assert client.post("/assistant", json=question).status_code == 401
    assert client.post("/assistant", json=question, headers=SIGNED_IN).status_code == 503


def test_weather_includes_spraying(client, monkeypatch):
    times = [f"2026-09-18T{h:02d}:00" for h in range(24)]
    forecast = {
        "current": {
            "time": "2026-09-18T09:15",
            "temperature_2m": 26.4,
            "relative_humidity_2m": 70,
            "precipitation": 0,
            "weather_code": 2,
            "wind_speed_10m": 9,
            "is_day": 1,
        },
        "hourly": {
            "time": times,
            "temperature_2m": [26] * 24,
            "relative_humidity_2m": [70] * 24,
            "precipitation_probability": [0] * 12 + [80] * 12,
            "precipitation": [0] * 24,
            "wind_speed_10m": [9] * 24,
        },
    }

    async def fake_fetch(http, latitude, longitude):
        return forecast

    monkeypatch.setattr(weather_route, "fetch_forecast", fake_fetch)
    body = client.get("/weather", params={"lat": 9.59, "lon": 76.52}).json()

    assert body["temperature_c"] == 26.4
    assert body["spraying"]["status"] == "good"
    # Rain from noon makes 10:00 and 11:00 "moderate" (rain within two hours).
    assert body["spraying"]["until"] == "2026-09-18T10:00"

import asyncio
import json

import httpx

from app.advisory.gemini import Gemini
from app.advisory.knowledge import Guidance
from app.advisory.writer import AdviceWriter

GUIDANCE = Guidance(
    cause="Fungus (Cercospora capsici)",
    symptoms=["Brown circular spots with grey centres."],
    treatment=["Spray twice, 10 to 15 days apart, with Mancozeb 0.25%."],
    prevention=["Use disease-free seed."],
    severity=None,
    sources=[{"title": "A source", "url": "https://example.org/leaf-spot"}],
)

HINDI = {
    "cause": "फफूंद (Cercospora capsici)",
    "symptoms": ["पत्तियों पर भूरे गोल धब्बे, बीच में स्लेटी।"],
    "treatment": ["Mancozeb 0.25% का छिड़काव 10 से 15 दिन के अंतर पर दो बार करें।"],
    "prevention": ["रोग-मुक्त बीज इस्तेमाल करें।"],
    "severity": "",
}


def write(handler, api_key: str | None = "test-key", language: str = "hi") -> tuple[Guidance | None, list[httpx.Request]]:
    requests: list[httpx.Request] = []

    def record(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return handler(request)

    async def run() -> Guidance | None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(record)) as http:
            writer = AdviceWriter(Gemini(http, api_key, ["test-model", "spare-model"]))
            first = await writer.write(
                "capsicum_chilli___Cercospora_leaf_spot",
                GUIDANCE,
                crop="capsicum chilli",
                disease="Cercospora leaf spot",
                language=language,
                grower_type="pots",
            )
            # A second farmer with the same disease, language and grower type.
            await writer.write(
                "capsicum_chilli___Cercospora_leaf_spot",
                GUIDANCE,
                crop="capsicum chilli",
                disease="Cercospora leaf spot",
                language=language,
                grower_type="pots",
            )
            return first

    return asyncio.run(run()), requests


def answer(payload: dict) -> httpx.Response:
    return httpx.Response(200, json={"steps": [{"type": "model_output", "content": [{"type": "text", "text": json.dumps(payload)}]}]})


def test_rewrites_guidance_in_the_farmers_language():
    written, requests = write(lambda request: answer(HINDI))

    assert written.treatment == HINDI["treatment"]
    assert written.severity is None
    # Sources come from the knowledge base, never from the model.
    assert written.sources == GUIDANCE.sources

    body = json.loads(requests[0].content)
    assert requests[0].headers["x-goog-api-key"] == "test-key"
    assert body["model"] == "test-model"
    assert "Hindi" in body["input"] and "Mancozeb 0.25%" in body["input"] and "pots" in body["input"]
    assert len(requests) == 1, "the second identical request should come from the cache"


def test_number_word_may_come_back_as_a_digit():
    as_digit = {**HINDI, "treatment": ["Mancozeb 0.25% का छिड़काव 10 से 15 दिन के अंतर पर 2 बार करें।"]}
    written, _ = write(lambda request: answer(as_digit))
    assert written.treatment == as_digit["treatment"]


def test_answer_with_an_invented_dose_is_discarded():
    drifted = {**HINDI, "treatment": ["Mancozeb 0.5% का छिड़काव हर 7 दिन पर करें।"]}
    written, _ = write(lambda request: answer(drifted))
    assert written is None


def test_busy_model_hands_over_to_the_next_one():
    def handler(request: httpx.Request) -> httpx.Response:
        busy = json.loads(request.content)["model"] == "test-model"
        return httpx.Response(503, json={"error": "high demand"}) if busy else answer(HINDI)

    written, requests = write(handler)
    assert written.treatment == HINDI["treatment"]
    assert [json.loads(request.content)["model"] for request in requests] == ["test-model", "spare-model"]


def test_api_failure_falls_back():
    written, requests = write(lambda request: httpx.Response(429, json={"error": "quota"}))
    assert written is None
    assert len(requests) == 4, "every model is tried, and a failure must not be cached"


def test_unreadable_answer_falls_back():
    written, _ = write(lambda request: httpx.Response(200, json={"steps": []}))
    assert written is None


def test_no_key_or_unknown_language_makes_no_request():
    assert write(lambda request: answer(HINDI), api_key=None) == (None, [])
    assert write(lambda request: answer(HINDI), language="xx") == (None, [])

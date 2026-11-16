import asyncio
import json

import httpx

from app.advisory.assistant import Answer, Assistant
from app.advisory.gemini import Gemini
from app.advisory.knowledge import KnowledgeBase
from app.config import get_settings

KNOWLEDGE = KnowledgeBase.load(get_settings().kb_dir)


def ask(reply: dict, question: str = "My chilli leaves have brown spots, what do I spray?") -> tuple[Answer | None, dict]:
    sent: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        sent.update(json.loads(request.content))
        return httpx.Response(200, json={"steps": [{"type": "model_output", "content": [{"type": "text", "text": json.dumps(reply)}]}]})

    async def run() -> Answer | None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            assistant = Assistant(Gemini(http, "test-key", ["test-model"]), KNOWLEDGE)
            return await assistant.ask(question, "hi", ["capsicum_chilli"])

    return asyncio.run(run()), sent


def test_answers_from_the_farmers_crop_entries():
    label = "capsicum_chilli___Cercospora_leaf_spot"
    answer, sent = ask({"answer": "Mancozeb 0.25% का छिड़काव 10 से 15 दिन के अंतर पर करें।", "used": [label, "made_up"]})

    assert answer.text.startswith("Mancozeb 0.25%")
    # Sources come from the entries the model says it used; ids it invents are ignored.
    assert [source.url for source in answer.sources] == [source.url for source in KNOWLEDGE.get(label).sources]
    # The farmer's crop is retrieved even though the question never names a disease.
    assert label in sent["input"] and "Hindi" in sent["input"]
    assert "rice___Blast" not in sent["input"]


def test_answer_with_an_invented_dose_is_dropped():
    answer, _ = ask({"answer": "Mancozeb 5% का छिड़काव करें।", "used": []})
    assert answer is None


def test_search_puts_the_farmers_crops_first():
    labels = [info.label for info in KNOWLEDGE.search("late blight", ["potato"], 3)]
    assert labels[0] == "potato___Late_blight"
    assert "tomato___Late_blight" in labels

"""The Assistant: answers a farmer's typed question from the knowledge base.

Retrieval picks the entries most likely to hold the answer; Gemini then answers
from those entries only, in the farmer's language. As with the diagnosis advice,
an answer containing a number that the entries (or the question) don't is dropped.
"""

import json
import logging
from dataclasses import dataclass

from app.advisory.gemini import LANGUAGES, Gemini, invented_numbers
from app.advisory.knowledge import KnowledgeBase, Source

logger = logging.getLogger(__name__)

# Enough to cover a farmer's crops without sending the whole knowledge base every time.
MAX_ENTRIES = 8

ANSWER_SCHEMA = {
    "type": "object",
    "properties": {
        "answer": {"type": "string"},
        "used": {"type": "array", "items": {"type": "string"}, "description": "ids of the FACTS entries used"},
    },
    "required": ["answer", "used"],
}

PROMPT = """You are AgroLens, an assistant that helps farmers with crop diseases. Answer the QUESTION in {language}.

Rules:
- Answer only from the FACTS. Do not add any treatment, chemical, dose or claim that is not in them.
- If the FACTS do not answer the QUESTION, say you don't have that information and suggest asking a local
  agriculture officer. Do not guess.
- Keep every chemical or product name, dose, percentage and number exactly as given, in Western digits (0-9).
- Use at most 6 short sentences, in simple everyday words.
- In "used", list the ids of the FACTS entries your answer came from (empty if none).

QUESTION:
{question}

FACTS:
{facts}"""


@dataclass(frozen=True)
class Answer:
    text: str
    sources: list[Source]


class Assistant:
    def __init__(self, gemini: Gemini, knowledge: KnowledgeBase):
        self._gemini = gemini
        self._knowledge = knowledge

    async def ask(self, question: str, language: str, crop_ids: list[str]) -> Answer | None:
        """None when the model isn't available or its answer couldn't be trusted."""
        if language not in LANGUAGES:
            language = "en"
        entries = {
            info.label: {"crop": info.crop_id, "disease": info.disease, **self._knowledge.get(info.label).facts()}
            for info in self._knowledge.search(question, crop_ids, MAX_ENTRIES)
        }
        facts = json.dumps(entries, ensure_ascii=False, indent=2)
        reply = await self._gemini.generate(
            PROMPT.format(language=LANGUAGES[language], question=question, facts=facts), ANSWER_SCHEMA
        )
        if not reply or not isinstance(reply.get("answer"), str) or not reply["answer"].strip():
            return None

        invented = invented_numbers(reply["answer"], f"{facts}\n{question}")
        if invented:
            logger.warning("Discarded an answer with numbers not in the knowledge base: %s", sorted(invented))
            return None

        sources: list[Source] = []
        for label in reply.get("used") or []:
            for source in self._knowledge.get(label).sources if label in entries else []:
                if source not in sources:
                    sources.append(source)
        return Answer(text=reply["answer"].strip(), sources=sources)

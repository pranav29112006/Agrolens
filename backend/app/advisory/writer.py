"""Stage 2, generation: an LLM rewrites the retrieved guidance for the farmer.

The knowledge base holds the facts (retrieval); Gemini turns them into short,
plain advice in the farmer's language, fitted to how they grow. It is told to
use only the retrieved facts, and its answer is thrown away if it contains a
number (a dose, a percentage, an interval) that the facts don't. Without an API
key, or when the call fails, the farmer gets the knowledge base text in English.
"""

import json
import logging

from app.advisory.gemini import LANGUAGES, Gemini, invented_numbers
from app.advisory.knowledge import Guidance

logger = logging.getLogger(__name__)

GROWERS = {
    "pots": "a few plants in pots",
    "home_garden": "a home garden",
    "fields": "fields, as a farmer",
}

_TEXT_LIST = {"type": "array", "items": {"type": "string"}}
GUIDANCE_SCHEMA = {
    "type": "object",
    "properties": {
        "cause": {"type": "string"},
        "symptoms": _TEXT_LIST,
        "treatment": _TEXT_LIST,
        "prevention": _TEXT_LIST,
        "severity": {"type": "string", "description": "Empty if the facts give none."},
    },
    "required": ["cause", "symptoms", "treatment", "prevention", "severity"],
}
TIPS_SCHEMA = {"type": "object", "properties": {"tips": _TEXT_LIST}, "required": ["tips"]}

GUIDANCE_PROMPT = """You write crop disease advice for a farmer. Rewrite the FACTS below in {language}.

Rules:
- Use only the FACTS. Do not add any treatment, chemical, dose, timing or claim that is not in them.
- Keep every chemical or product name, dose, percentage and number exactly as given, in Western digits (0-9).
- Use short sentences and simple everyday words a farmer with little schooling understands.
- The reader grows {crop} in {grower}. Put the steps that suit them first; leave out nothing.
- Keep the same sections. Leave "severity" empty if the FACTS have none.

Crop: {crop}
Disease: {disease}

FACTS:
{facts}"""

TIPS_PROMPT = """Translate these tips for keeping a {crop} crop free of disease into {language}.

Rules:
- Translate every tip, in the same order. Add nothing and leave nothing out.
- Keep every chemical or product name and number exactly as given, in Western digits (0-9).
- Use short sentences and simple everyday words a farmer with little schooling understands.

TIPS:
{tips}"""


class AdviceWriter:
    def __init__(self, gemini: Gemini):
        self._gemini = gemini
        # The same request always gives the same answer, so answers are kept:
        # the free tier allows only a limited number of calls a day.
        self._guidance: dict[tuple[str, str, str | None], Guidance] = {}
        self._tips: dict[tuple[str, str], list[str]] = {}

    async def write(
        self, label: str, guidance: Guidance, *, crop: str, disease: str, language: str, grower_type: str | None
    ) -> Guidance | None:
        """The guidance rewritten for this farmer, or None if it couldn't be done safely."""
        if language not in LANGUAGES:
            return None
        key = (label, language, grower_type)
        if key in self._guidance:
            return self._guidance[key]

        facts = json.dumps(guidance.facts(), ensure_ascii=False, indent=2)
        answer = await self._gemini.generate(
            GUIDANCE_PROMPT.format(
                language=LANGUAGES[language],
                crop=crop,
                disease=disease,
                grower=GROWERS.get(grower_type or "", GROWERS["fields"]),
                facts=facts,
            ),
            GUIDANCE_SCHEMA,
        )
        if answer is None:
            return None
        try:
            written = guidance.model_copy(
                update={
                    "cause": str(answer["cause"]),
                    "symptoms": [str(item) for item in answer["symptoms"]],
                    "treatment": [str(item) for item in answer["treatment"]],
                    "prevention": [str(item) for item in answer["prevention"]],
                    "severity": str(answer["severity"]) or None,
                }
            )
        except (KeyError, TypeError):
            logger.warning("Discarded advice that doesn't have the expected sections")
            return None

        invented = invented_numbers(json.dumps(written.facts(), ensure_ascii=False), facts)
        if invented:
            logger.warning("Discarded advice with numbers not in the knowledge base: %s", sorted(invented))
            return None
        self._guidance[key] = written
        return written

    async def translate_tips(self, crop: str, tips: list[str], language: str) -> list[str] | None:
        """The tips in the farmer's language, or None if they couldn't be translated safely."""
        if language not in LANGUAGES or language == "en" or not tips:
            return None
        key = (crop, language)
        if key in self._tips:
            return self._tips[key]

        source = json.dumps(tips, ensure_ascii=False, indent=2)
        answer = await self._gemini.generate(
            TIPS_PROMPT.format(crop=crop, language=LANGUAGES[language], tips=source), TIPS_SCHEMA
        )
        translated = answer.get("tips") if answer else None
        if not isinstance(translated, list) or len(translated) != len(tips):
            return None
        translated = [str(tip) for tip in translated]
        if invented_numbers(" ".join(translated), source):
            logger.warning("Discarded translated tips with numbers not in the knowledge base")
            return None
        self._tips[key] = translated
        return translated

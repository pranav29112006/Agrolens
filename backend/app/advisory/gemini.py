"""Calls to Gemini (Interactions API) that must answer with JSON."""

import json
import logging
import re

import httpx

logger = logging.getLogger(__name__)

API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
# The model can take a while; the farmer is already waiting.
TIMEOUT_SECONDS = 25
BUSY_STATUSES = {429, 503}

# The app's language codes (mobile/src/constants/languages.ts).
LANGUAGES = {
    "ar": "Arabic", "bn": "Bengali", "en": "English", "es": "Spanish", "fr": "French",
    "gu": "Gujarati", "hi": "Hindi", "id": "Indonesian", "kn": "Kannada", "ml": "Malayalam",
    "mr": "Marathi", "or": "Odia", "pa": "Punjabi", "pt": "Portuguese", "sw": "Swahili",
    "ta": "Tamil", "te": "Telugu", "ur": "Urdu", "vi": "Vietnamese",
}  # fmt: skip

# "Spray twice" may fairly come back as "2 times".
NUMBER_WORDS = {
    "once": "1", "one": "1", "twice": "2", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
}  # fmt: skip


def _numbers(text: str) -> set[str]:
    return set(re.findall(r"\d+(?:\.\d+)?", text))


def invented_numbers(answer: str, facts: str) -> set[str]:
    """Numbers in the model's answer (doses, percentages, intervals) that the facts don't contain."""
    words = re.findall(r"[a-z]+", facts.lower())
    allowed = _numbers(facts) | {NUMBER_WORDS[word] for word in words if word in NUMBER_WORDS}
    return _numbers(answer) - allowed


def _output_text(interaction: dict) -> str:
    """The model's text from an Interactions API response."""
    if isinstance(interaction.get("output_text"), str):
        return interaction["output_text"]
    blocks = [
        block
        for step in interaction.get("steps") or interaction.get("outputs") or []
        for block in (step.get("content") if isinstance(step.get("content"), list) else [step])
    ]
    return "".join(block["text"] for block in blocks if isinstance(block.get("text"), str))


class Gemini:
    def __init__(self, http: httpx.AsyncClient, api_key: str | None, models: list[str]):
        self._http = http
        self._api_key = api_key
        # Tried in order until one isn't busy.
        self._models = models

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    async def generate(self, prompt: str, schema: dict) -> dict | None:
        """The model's JSON answer, or None when it couldn't be had."""
        if not self.enabled:
            return None
        try:
            for model in self._models:
                response = await self._http.post(
                    API_URL,
                    headers={"x-goog-api-key": self._api_key},
                    json={
                        "model": model,
                        "input": prompt,
                        "response_format": {"type": "text", "mime_type": "application/json", "schema": schema},
                    },
                    timeout=TIMEOUT_SECONDS,
                )
                # On the free tier a model is often overloaded (503) or over its per-minute
                # quota (429); each model has its own quota, so the next one usually answers.
                if response.status_code not in BUSY_STATUSES:
                    break
                logger.info("%s is busy (%d), trying the next model", model, response.status_code)
            response.raise_for_status()
            return json.loads(_output_text(response.json()))
        except Exception:
            # Network errors, quota, a changed response shape and bad JSON alike:
            # callers fall back to text that doesn't need the model.
            logger.exception("Gemini request failed (%s)", ", ".join(self._models))
            return None

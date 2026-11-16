"""Stage 2: what to tell the farmer about a prediction.

An unsure model sends the farmer to an expert instead of guessing, a healthy
leaf needs no treatment, and a disease gets the knowledge base's guidance for
it. The guidance is passed on as written; rewording it in the farmer's language
with an LLM comes next.
"""

from typing import Literal

from app.advisory.knowledge import Guidance, KnowledgeBase
from app.vision.labels import LabelInfo

AdviceKind = Literal["consult_expert", "healthy", "treatment", "pending"]


def advise(info: LabelInfo, is_confident: bool, knowledge: KnowledgeBase) -> tuple[AdviceKind, Guidance | None]:
    if not is_confident:
        return "consult_expert", None
    if info.is_healthy:
        return "healthy", None
    guidance = knowledge.get(info.label)
    # "pending": the disease is recognised but nobody has written its entry yet.
    return ("treatment", guidance) if guidance else ("pending", None)

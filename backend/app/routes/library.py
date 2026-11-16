"""What the app shows from the knowledge base outside a diagnosis: the library, tips, alerts and the Assistant."""

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.advisory.advisor import advise
from app.auth import CurrentUser, current_user
from app.schemas import AdviceOut, AnswerOut, DiseaseOut, QuestionIn, TipsOut
from app.vision.labels import LabelInfo, parse_label
from app.weather.open_meteo import fetch_forecast

router = APIRouter()


def _disease(info: LabelInfo) -> DiseaseOut:
    return DiseaseOut(label=info.label, crop_id=info.crop_id, disease=info.disease)


async def write_advice(
    request: Request, info: LabelInfo, is_confident: bool, language: str, grower_type: str | None
) -> AdviceOut:
    """Stage 2 for one prediction: retrieve the guidance, then have it rewritten for the farmer."""
    kind, guidance = advise(info, is_confident, request.app.state.knowledge)
    if guidance is None:
        return AdviceOut(kind=kind)
    written = await request.app.state.writer.write(
        info.label,
        guidance,
        crop=(info.crop_id or "").replace("_", " "),
        disease=info.disease or "",
        language=language,
        grower_type=grower_type,
    )
    if written is None:
        return AdviceOut(kind=kind, guidance=guidance)
    return AdviceOut(kind=kind, guidance=written, language=language)


@router.get("/library", response_model=list[DiseaseOut])
def library(request: Request) -> list[DiseaseOut]:
    """Every disease the knowledge base covers."""
    return [_disease(info) for info in request.app.state.knowledge.diseases()]


@router.get("/advice", response_model=AdviceOut)
async def advice(
    request: Request,
    label: str,
    language: str = "en",
    grower_type: str | None = None,
    # Signed-in users only: each new answer costs a call to the LLM.
    user: CurrentUser = Depends(current_user),
) -> AdviceOut:
    """The guidance for a disease, as shown after a diagnosis; used for past scans and the library."""
    try:
        info = parse_label(label)
    except ValueError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown disease") from error
    return await write_advice(request, info, True, language, grower_type)


@router.get("/tips", response_model=TipsOut)
async def tips(
    request: Request,
    crop_id: str,
    language: str = "en",
    user: CurrentUser = Depends(current_user),
) -> TipsOut:
    """How to keep a crop free of the diseases the knowledge base covers."""
    english = request.app.state.knowledge.tips(crop_id)
    translated = await request.app.state.writer.translate_tips(crop_id.replace("_", " "), english, language)
    if translated is None:
        return TipsOut(tips=english, language="en")
    return TipsOut(tips=translated, language=language)


@router.get("/alerts", response_model=list[DiseaseOut])
async def alerts(
    request: Request,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    crops: str = Query("", description="Comma-separated crop ids the farmer grows"),
) -> list[DiseaseOut]:
    """Diseases of the farmer's crops that the current weather favours."""
    try:
        current = (await fetch_forecast(request.app.state.http, lat, lon))["current"]
    except httpx.HTTPError as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Weather service unavailable") from error

    knowledge = request.app.state.knowledge
    found = []
    for crop_id in filter(None, crops.split(",")):
        for info in knowledge.diseases(crop_id):
            weather = knowledge.get(info.label).weather
            if weather and weather.matches(
                current["temperature_2m"], current["relative_humidity_2m"], current["precipitation"] > 0
            ):
                found.append(_disease(info))
    return found


@router.post("/assistant", response_model=AnswerOut)
async def assistant(
    request: Request,
    question: QuestionIn,
    user: CurrentUser = Depends(current_user),
) -> AnswerOut:
    answer = await request.app.state.assistant.ask(question.question, question.language, question.crops)
    if answer is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Assistant not available")
    return AnswerOut(answer=answer.text, sources=answer.sources)

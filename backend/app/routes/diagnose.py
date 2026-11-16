import io
import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.auth import CurrentUser, current_user
from app.config import get_settings
from app.routes.library import write_advice
from app.schemas import DiagnosisOut, PredictionOut
from app.vision.classifier import LeafClassifier, Prediction
from app.vision.quality import check_quality

logger = logging.getLogger(__name__)
router = APIRouter()

# Stored photos are shrunk to save space; the model only needs 224 px anyway.
STORED_MAX_SIDE_PX = 1280


def _to_out(prediction: Prediction) -> PredictionOut:
    info = prediction.info
    return PredictionOut(
        label=info.label,
        key=info.key,
        crop_id=info.crop_id,
        disease=info.disease,
        is_healthy=info.is_healthy,
        confidence=round(prediction.confidence, 4),
    )


def _jpeg_for_storage(image: Image.Image) -> bytes:
    copy = image.copy()
    copy.thumbnail((STORED_MAX_SIDE_PX, STORED_MAX_SIDE_PX))
    buffer = io.BytesIO()
    copy.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


@router.post("/diagnose", response_model=DiagnosisOut)
async def diagnose(
    request: Request,
    image: UploadFile = File(...),
    # The crop the farmer picked; limits the answer to that crop's diseases.
    crop_id: str | None = Form(None),
    language: str = Form("en"),
    # pots, home_garden or fields; lets the advice fit how the farmer grows.
    grower_type: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    user: CurrentUser = Depends(current_user),
) -> DiagnosisOut:
    settings = get_settings()
    data = await image.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Photo is too large")

    try:
        # Phones store rotation in EXIF; apply it so the leaf is upright for the model.
        photo = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a readable image") from error

    issues = check_quality(photo)
    if issues:
        # The app asks for a retake and explains each issue in the farmer's language.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, {"code": "poor_image", "issues": issues})

    classifier: LeafClassifier | None = request.app.state.classifier
    if classifier is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Disease model not available yet")
    if crop_id is not None and crop_id not in classifier.crops:
        # Better to say so than to guess among another crop's diseases.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, {"code": "crop_not_supported"})

    predictions = classifier.predict(photo, crop_id=crop_id)
    best = predictions[0]
    if not best.info.is_leaf:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, {"code": "poor_image", "issues": ["no_leaf"]})

    is_confident = best.confidence >= settings.confidence_threshold
    advice = await write_advice(request, best.info, is_confident, language, grower_type)

    supabase = request.app.state.supabase
    image_path = f"{user.id}/{uuid.uuid4()}.jpg"
    diagnosis_id = None
    try:
        await supabase.upload_leaf_photo(user.token, image_path, _jpeg_for_storage(photo))
        row = await supabase.insert_diagnosis(
            user.token,
            {
                "user_id": user.id,
                "crop_id": best.info.crop_id,
                "image_path": image_path,
                "predicted_label": best.info.label,
                "confidence": best.confidence,
                "is_confident": is_confident,
                "advisory": advice.kind,
                "language": language,
                "latitude": latitude,
                "longitude": longitude,
            },
        )
        diagnosis_id = row["id"]
    except Exception:
        # Saving history is secondary: the farmer still gets the diagnosis.
        logger.exception("Could not save diagnosis for user %s", user.id)
        image_path = None

    return DiagnosisOut(
        id=diagnosis_id,
        image_path=image_path,
        prediction=_to_out(best),
        alternatives=[_to_out(p) for p in predictions[1:]],
        is_confident=is_confident,
        advice=advice,
    )

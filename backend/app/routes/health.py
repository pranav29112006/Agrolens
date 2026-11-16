from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
def health(request: Request) -> dict:
    classifier = request.app.state.classifier
    return {
        "status": "ok",
        "model_loaded": classifier is not None,
        # Crops the app can offer for diagnosis; the others show "not available yet".
        "crops": sorted(classifier.crops) if classifier is not None else [],
    }

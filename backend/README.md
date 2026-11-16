# AgroLens backend

FastAPI service behind the mobile app: leaf diagnosis (Stage 1 CNN + Stage 2 advisory) and local weather with spraying advice.

## Run

```bash
cd backend
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env        # then fill in the Supabase URL and anon key
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://127.0.0.1:8000/docs

Tests (offline; Supabase and the model are faked):

```bash
.venv\Scripts\python -m pytest
```

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Service status, whether the disease model is loaded, and the crop ids it can diagnose (`crops`) |
| GET | `/weather?lat=&lon=` | Current weather plus spraying conditions (`good` / `moderate` / `poor`, reason codes, and when that changes) from Open-Meteo |
| POST | `/diagnose` | Multipart `image` (+ `crop_id`, `language`, optional `grower_type`, `latitude`/`longitude`). Needs `Authorization: Bearer <Supabase access token>` |

| GET | `/library` | The diseases the knowledge base covers |
| GET | `/advice?label=&language=&grower_type=` | The guidance for one disease, as returned by `/diagnose`. Needs sign-in |
| GET | `/tips?crop_id=&language=` | A crop's prevention steps, translated when possible. Needs sign-in |
| GET | `/alerts?lat=&lon=&crops=` | Diseases of those crops that the current weather favours (only entries with a `weather` range in `kb/`) |
| POST | `/assistant` | JSON `question`, `language`, `crops`. Answers from the knowledge base entries retrieved for the question. Needs sign-in; `503` when the LLM is unavailable |

`/diagnose` steps:

1. **Photo check**: rejects blurry, dark, over-exposed or tiny photos with `422 {"code": "poor_image", "issues": [...]}` so the app can ask for a retake.
2. **Stage 1**: the CNN (`models/agrolens.onnx`) returns the top 3 classes with calibrated confidences. With `crop_id` (the crop the farmer picked), only that crop's classes compete; a crop the model doesn't cover gets `422 {"code": "crop_not_supported"}` instead of a guess. Until a model is exported this step returns `503`.
3. **Stage 2**: below the confidence threshold (0.6) the advice is `consult_expert`; healthy leaves get `healthy`. A disease with an entry in the knowledge base gets `treatment` plus its `guidance` (cause, symptoms, treatment, prevention, severity, sources); one without an entry yet gets `pending`.
4. **Save**: the photo goes to the `leaf-photos` bucket and a row to `diagnoses`, both written with the user's own token so row level security applies. A failed save doesn't block the answer.

Responses use codes (`poor_image`, `blurry`, `rain`, `wind_strong`, …) rather than sentences, so the app shows them in the farmer's language.

## Layout

- `app/main.py`: app setup; loads the model and HTTP client at startup.
- `app/routes/`: `health`, `weather`, `diagnose`.
- `app/vision/`: `quality.py` (photo checks), `classifier.py` (ONNX inference), `labels.py` (the class-name scheme, `<crop_id>___<Condition>`).
- `app/advisory/`: Stage 2, retrieval then generation. `advisor.py` decides the kind of advice, `knowledge.py` retrieves the disease's entry from the knowledge base, and `writer.py` has Gemini rewrite that entry in the farmer's language for how they grow (`grower_type`). The model may only use the retrieved facts; an answer containing a number that isn't in them is discarded. With no `GEMINI_API_KEY` in `.env`, or if the call fails, the entry is returned as written in English (`advice.language` says which).
- `kb/`: the knowledge base, one JSON file per crop (see below).
- `app/weather/`: Open-Meteo client and the spraying rules.
- `app/supabase.py`, `app/auth.py`: token check and writes on the user's behalf.

## The knowledge base

`kb/<crop_id>.json` maps a model class name to what is known about that disease:

```json
{
  "tomato___Late_blight": {
    "cause": "Water mold (Phytophthora infestans)",
    "symptoms": ["..."],
    "treatment": ["..."],
    "prevention": ["..."],
    "severity": "...",
    "sources": [{ "title": "...", "url": "https://..." }]
  }
}
```

- Keys must be the model's own class names (`models/agrolens.json`), filed under the right crop; the tests check both.
- Every entry needs at least one source. Entries summarise what the source says: do not add advice the source doesn't give.
- So far 7 crops are covered (tomato, potato, rice, maize, apple, chilli, wheat). The entries were drafted from the listed extension pages with an automated extraction step and have not yet been checked line by line against those pages, so review an entry before relying on it, especially chemical names and doses.
- Restart the server after editing; the files are read at startup.

## The model file

Training lives in `../ml` and exports two files into `models/`:

- `agrolens.onnx`: the network (channels-first or channels-last input both work).
- `agrolens.json`: `{"labels": [...], "input_size": 224, "mean": [...], "std": [...], "temperature": ...}`. The labels are required and must follow `<crop_id>___<Condition>` (plus `Background_without_leaves`); the temperature calibrates confidence (see `ml/calibrate.py`).

Model files are not committed (see `.gitignore`).

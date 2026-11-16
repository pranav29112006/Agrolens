# AgroLens model training (Stage 1)

Fine-tunes an ImageNet-pretrained CNN on leaf photos and exports it to ONNX for the backend. There are
two training sets:

- `plantvillage`: PlantVillage alone (14 plants, lab photos).
- `combined`: PlantVillage plus the datasets in `sources.py` (field and smartphone photos of 45 of the
  app's 68 crops). This one is served by the app.

Class names follow the backend's scheme, `<crop_id>___<Condition>` (for example `rice___Brown_spot`), so
the app can ask the farmer for the crop first and the model only chooses among that crop's diseases.

## Data

PlantVillage leaf images, as released on Mendeley Data by Arun Pandian J and Geetharamani Gopal
("Identification of Plant Leaf Diseases Using a 9-layer Deep Convolutional Neural Network",
DOI 10.17632/tywbtsjrjv.1, CC0 1.0), non-augmented version. It has 38 disease/healthy classes across
14 plants, plus a background class with no leaf in the photo, which the app uses to ask for a retake.

## Setup (Windows, NVIDIA GPU)

```bash
cd ml
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu130
.venv\Scripts\python -m pip install -r requirements.txt
```

## Pipeline

```bash
# 1. Download the dataset archive to data/raw/plantvillage.zip, then extract and split 70/15/15 (seed 42)
.venv\Scripts\python prepare_data.py

# 2. Train (keeps the best validation macro-F1 checkpoint in runs/<run>/best.pt)
.venv\Scripts\python train.py --arch mobilenet_v3_large --epochs 10

# 3. Calibrate confidence on the validation split (writes runs/<run>/calibration.json)
.venv\Scripts\python calibrate.py --run mobilenet_v3_large

# 4. Evaluate on the untouched test split (writes reports/<run>/)
.venv\Scripts\python evaluate.py --run mobilenet_v3_large

# 5. Export to ONNX for the backend (backend/models/agrolens.onnx + agrolens.json)
.venv\Scripts\python export.py --run mobilenet_v3_large
```

For the combined model, after steps 1 to 5 above have produced the PlantVillage splits:

```bash
.venv\Scripts\python download.py                  # ~32 GB from Mendeley Data and GitHub, SHA-256 checked
.venv\Scripts\python prepare_combined.py --check  # show every folder and the class it maps to
.venv\Scripts\python prepare_combined.py          # shrink photos, group duplicates, split
.venv\Scripts\python train.py --data combined --epochs 12 --weight-power 0.5
.venv\Scripts\python calibrate.py --run mobilenet_v3_large_combined
.venv\Scripts\python evaluate.py --run mobilenet_v3_large_combined
.venv\Scripts\python export.py --run mobilenet_v3_large_combined
```

The label scheme (`<crop_id>___<Condition>`) is parsed by `backend/app/vision/labels.py`, which the ML
scripts import, so the model and the service always agree.

## Files

- `prepare_data.py`: PlantVillage extraction and stratified splits, written as CSV lists (`data/splits/`).
- `plantvillage.py`: PlantVillage's folder names and the app class each becomes.
- `sources.py`: the other datasets, and which of their files (original photos only) are used.
- `download.py`: fetches them, checks each file's SHA-256, unpacks, and writes the credits to
  `reports/DATASETS.md` (every source is CC BY 4.0 and must be credited).
- `label_rules.py`: which app class each source folder maps to. A folder no rule covers stops the build.
- `prepare_combined.py`: shrinks photos to 384 px, keeps a photo and its flipped or rotated copies in the same
  split, splits 70/15/15 per source and class, and keeps PlantVillage's and PlantDoc's own test sets
  (`data/splits_combined/`, summary in `reports/combined_dataset.json`).
- `data.py`: dataset and transforms. Training uses crops, flips, rotation, colour jitter and blur. Evaluation resizes to 224×224 exactly like the backend.
- `nets.py`: MobileNetV3-Large or EfficientNet-B0 with a new classification layer.
- `train.py`: AdamW, one-cycle learning rate, class-weighted cross-entropy with label smoothing, mixed precision.
- `calibrate.py`: temperature scaling. Label smoothing leaves the network under-confident, so one fitted temperature rescales its logits; predictions don't change, only the confidence shown.
- `evaluate.py`: accuracy, macro and weighted F1, per-class report, confusion matrix, and how often the 0.6 confidence cut-off would send the farmer to an expert. Results are given crop-first (only the photo's crop's classes compete, as in the app) and open, and broken down by source and crop.
- `export.py`: ONNX export plus a check that the backend's own classifier gives the same answers as PyTorch.

`data/` and `runs/` are not committed. `reports/` is committed, since those are the results quoted in project reports.

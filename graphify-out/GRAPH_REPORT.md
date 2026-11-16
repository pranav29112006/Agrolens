# Graph Report - Agrolens  (2026-10-03)

## Corpus Check
- 122 files · ~104,395 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .onnx 1)

## Summary
- 722 nodes · 1503 edges · 40 communities (32 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.88)
- Token cost: 144,590 input · 0 output

## Community Hubs (Navigation)
- Mobile Onboarding Screens
- Home and Crop Selection UI
- Mobile Dependencies
- Architecture Docs
- Translations (i18n)
- API Startup and Supabase
- Backend API Tests
- Model Evaluation
- Dataset Downloader
- Expo App Config
- ONNX Leaf Classifier
- Combined Dataset Builder
- Auth and Advisory
- Training Data Loading
- Calibration and ML Paths
- Labels and Vision Stages
- Weather API
- Photo Quality Checks
- Combined Model Scores
- Spraying Rules
- Label Rules and Splits
- Combined Confusion Matrix
- PlantVillage Confusion Matrix
- TypeScript Config
- Calibration Internals
- Adaptive Icon Background
- Adaptive Icon Foreground
- Monochrome Icon Layer
- Placeholder App Icon
- Placeholder Favicon
- Placeholder Splash Icon
- Account-Owned Setup
- Mobile Agent Notes
- Backend Requirements
- ML Requirements

## God Nodes (most connected - your core abstractions)
1. `useStrings()` - 30 edges
2. `usePreferences()` - 26 edges
3. `Strings` - 23 edges
4. `colors` - 20 edges
5. `expo-router` - 19 edges
6. `react-native` - 19 edges
7. `@expo/vector-icons` - 17 edges
8. `react` - 17 edges
9. `parse_label()` - 16 edges
10. `react-native-safe-area-context` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Crop-first classification (only the crop's classes compete)` --semantically_similar_to--> `Stage 1 CNN inference (ONNX, top-3, crop-restricted)`  [INFERRED] [semantically similar]
  ml/README.md → backend/README.md
- `Save with user's own token so RLS applies` --semantically_similar_to--> `Only anon key in app; service_role on backend only`  [INFERRED] [semantically similar]
  backend/README.md → README.md
- `Background_without_leaves class` --semantically_similar_to--> `Photo quality check (poor_image 422)`  [INFERRED] [semantically similar]
  ml/reports/mobilenet_v3_large/classification_report.txt → backend/README.md
- `onnxruntime (ml dependency, export check)` --semantically_similar_to--> `onnxruntime (backend dependency)`  [INFERRED] [semantically similar]
  ml/requirements.txt → backend/requirements.txt
- `main()` --uses--> `LeafClassifier`  [INFERRED]
  ml/export.py → backend/app/vision/classifier.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **/diagnose request flow (quality check, Stage 1 CNN, Stage 2 advisory, save)** — backend_readme_diagnose_endpoint, backend_readme_photo_quality_check, backend_readme_stage1_cnn, backend_readme_stage2_advisory, backend_readme_leaf_photos_bucket [EXTRACTED 1.00]
- **Shared model contract between ml and backend (label scheme, model files, calibration)** — backend_readme_label_scheme, backend_readme_model_files, ml_readme_onnx_export, ml_readme_temperature_scaling, ml_readme_label_rules [INFERRED 0.85]
- **Training data sources feeding the combined dataset** — ml_readme_combined_dataset, ml_reports_datasets_plantvillage, ml_reports_datasets_plantdoc, ml_reports_datasets_mendeley_field_datasets [EXTRACTED 1.00]
- **MobileNetV3-Large PlantVillage evaluation result** — ml_reports_mobilenet_v3_large_confusion_matrix_mobilenet_v3_large, ml_reports_mobilenet_v3_large_confusion_matrix_plantvillage_test_split, ml_reports_mobilenet_v3_large_confusion_matrix_test_accuracy, ml_reports_mobilenet_v3_large_confusion_matrix_macro_f1 [EXTRACTED 1.00]
- **Evaluation Result: model run on 17477-sample split with accuracy, macro and weighted averages** — ml_reports_mobilenet_v3_large_combined_classification_report_model_run, ml_reports_mobilenet_v3_large_combined_classification_report_eval_split, ml_reports_mobilenet_v3_large_combined_classification_report_accuracy, ml_reports_mobilenet_v3_large_combined_classification_report_macro_avg, ml_reports_mobilenet_v3_large_combined_classification_report_weighted_avg [EXTRACTED 1.00]
- **Weakest-class cluster dragging macro F1 down (tea and papaya classes)** — ml_reports_mobilenet_v3_large_combined_classification_report_class_tea_grey_blight, ml_reports_mobilenet_v3_large_combined_classification_report_class_tea_algal_leaf_spot, ml_reports_mobilenet_v3_large_combined_classification_report_class_tea_red_leaf_spot, ml_reports_mobilenet_v3_large_combined_classification_report_class_papaya_healthy, ml_reports_mobilenet_v3_large_combined_classification_report_class_papaya_insect_damage, ml_reports_mobilenet_v3_large_combined_classification_report_macro_avg [INFERRED 0.85]

## Communities (40 total, 8 thin omitted)

### Community 0 - "Mobile Onboarding Screens"
Cohesion: 0.06
Nodes (78): ComingSoonScreen(), styles, CropsScreen(), GrowerTypeScreen(), IconName, OPTIONS, styles, Index() (+70 more)

### Community 1 - "Home and Crop Selection UI"
Cohesion: 0.05
Nodes (44): CropOption, CropTileProps, styles, CATEGORY_BY_CROP, CropsRowProps, HealCard(), HomeStrings, IconName (+36 more)

### Community 2 - "Mobile Dependencies"
Cohesion: 0.04
Nodes (45): dependencies, expo, expo-constants, expo-font, expo-linking, expo-location, expo-router, expo-status-bar (+37 more)

### Community 3 - "Architecture Docs"
Cohesion: 0.06
Nodes (45): AgroLens backend README, POST /diagnose, FastAPI backend service, GET /health, Label scheme <crop_id>___<Condition>, leaf-photos storage bucket and diagnoses table, Model files agrolens.onnx + agrolens.json, Open-Meteo weather API (+37 more)

### Community 4 - "Translations (i18n)"
Cohesion: 0.12
Nodes (21): translations, ar, bn, en, Strings, es, fr, gu (+13 more)

### Community 5 - "API Startup and Supabase"
Cohesion: 0.12
Nodes (18): get_settings(), Settings, lifespan(), AgroLens API: leaf diagnosis, treatment advice and local weather for the mobile…, health(), get, Request, Any (+10 more)

### Community 6 - "Backend API Tests"
Cohesion: 0.13
Nodes (18): blurry_photo(), client(), FakeClassifier, FakeSupabase, leaf_photo(), post_photo(), fixture, test_confident_diagnosis_is_saved() (+10 more)

### Community 7 - "Model Evaluation"
Cohesion: 0.13
Nodes (21): collections, matplotlib, matplotlib_pyplot, load_temperature(), The confidence temperature fitted by calibrate.py, or 1.0 (no change) if it…, Rows with path and label; combined splits also say which source each photo came…, read_rows(), crop_masks() (+13 more)

### Community 8 - "Dataset Downloader"
Cohesion: 0.14
Nodes (23): concurrent_futures, hashlib, download_github(), download_mendeley(), one(), extract(), fetch(), get_json() (+15 more)

### Community 9 - "Expo App Config"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, blockedPermissions, predictiveBackGestureEnabled, typedRoutes (+16 more)

### Community 10 - "ONNX Leaf Classifier"
Cohesion: 0.13
Nodes (17): LeafClassifier, Image, ndarray, Path, Returns None when no model has been exported yet, so the API can still start., Most likely classes, best first. With crop_id (the crop the farmer picked),…, classifier(), fixture (+9 more)

### Community 11 - "Combined Dataset Builder"
Cohesion: 0.13
Nodes (22): Path, splits_dir(), collect(), duplicate_groups(), fingerprint(), label_for(), main(), ndarray (+14 more)

### Community 12 - "Auth and Advisory"
Cohesion: 0.14
Nodes (20): AdviceKind, advise(), current_user(), CurrentUser, Request, Accepts the Supabase login token the app already has: `Authorization: Bearer…, diagnose(), _jpeg_for_storage() (+12 more)

### Community 13 - "Training Data Loading"
Cohesion: 0.11
Nodes (19): argparse, DataLoader, Dataset, device, class_names(), LeafDataset, Tensor, Sorted, like ImageFolder, so indices are stable and predictable. (+11 more)

### Community 14 - "Calibration and ML Paths"
Cohesion: 0.13
Nodes (17): Builds tiny.onnx: a stand-in model whose logits are fixed, for classifier…, importlib_util, json, Calibrates the model's confidence with temperature scaling on the validation…, _load_backend_labels(), Paths and settings shared by the training scripts., The label scheme comes from the backend, which serves the model, so the two…, Datasets and image transforms. (+9 more)

### Community 15 - "Labels and Vision Stages"
Cohesion: 0.20
Nodes (13): Stage 2: what to tell the farmer about a prediction. Knowledge-base retrieval…, Stage 1: runs the exported CNN (ONNX) on a leaf photo. Training happens in…, LabelInfo, parse_label(), What the model's class names mean for the app. Every class is…, _slug(), test_background_class_is_not_a_leaf(), test_parses_disease_label() (+5 more)

### Community 16 - "Weather API"
Cohesion: 0.21
Nodes (14): get, Request, weather(), SprayingOut, WeatherOut, current_hour_index(), fetch_forecast(), hourly_conditions() (+6 more)

### Community 17 - "Photo Quality Checks"
Cohesion: 0.21
Nodes (15): check_quality(), Image, ndarray, Cheap checks that stop obviously bad photos before they reach the CNN. Farmers'…, Variance of a 4-neighbour Laplacian: sharp edges give large values., Returns problem codes the app can explain: too_small, too_dark, too_bright,…, sharpness(), Image (+7 more)

### Community 18 - "Combined Model Scores"
Cohesion: 0.18
Nodes (15): MobileNetV3-Large Combined Classification Report, Overall Accuracy 0.9696 (support 17477), Class Background_without_leaves (f1 0.9884, support 172), Weak Class papaya___healthy (f1 0.4000, support 6), Weak Class papaya___Insect_damage (f1 0.4286, support 8), Weak Class rose___Botrytis_blight (f1 0.6351, support 79), Weak Class rose___Mosaic_virus (f1 0.6286, support 34), Weak Class tea___Algal_leaf_spot (f1 0.4314, support 23) (+7 more)

### Community 19 - "Spraying Rules"
Cohesion: 0.31
Nodes (12): assess_hour(), assess_spraying(), HourConditions, Is now a good time to spray? Rule-based, from the hourly forecast. Thresholds…, Assesses the hour at `now_index` and finds when that assessment stops holding., SprayAssessment, hour(), test_calm_dry_mild_day_is_good_all_day() (+4 more)

### Community 20 - "Label Rules and Splits"
Cohesion: 0.16
Nodes (12): csv, folder(), Which app class each source folder's photos belong to. For every source in…, Pattern for a folder called exactly `name`, at any depth., find_class_dirs(), _key(), main(), Path (+4 more)

### Community 21 - "Combined Confusion Matrix"
Cohesion: 0.26
Nodes (13): Accuracy 0.9696, Brinjal Class Confusion Block, Confusion Matrix Heatmap (MobileNetV3-Large, combined), Combined Test Split, Crop-First Evaluation Protocol, Cucumber Class Confusion Block, Macro-F1 0.9397, AgroLens mobilenet_v3_large Model Run (+5 more)

### Community 22 - "PlantVillage Confusion Matrix"
Cohesion: 0.20
Nodes (10): MobileNetV3-Large Confusion Matrix (PlantVillage test), Crop-first label scheme (crop: disease, 39 classes), Grape Esca vs Black rot confusion, Macro-F1 0.9979, Maize Gray leaf spot vs Northern leaf blight confusion, mobilenet_v3_large classifier, No leaf (background) class, PlantVillage test split (+2 more)

### Community 23 - "TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, expo/tsconfig.base

### Community 24 - "Calibration Internals"
Cohesion: 0.40
Nodes (5): main(), summary(), expected_calibration_error(), ndarray, Average gap between how confident the model is and how often it is right (0 is…

### Community 25 - "Adaptive Icon Background"
Cohesion: 0.67
Nodes (4): Android Adaptive Icon Background, Expo Default Template Icon Placeholder, Adaptive Icon Keyline Guide Grid, Light Blue Background Palette

### Community 26 - "Adaptive Icon Foreground"
Cohesion: 0.67
Nodes (4): Android Adaptive Icon Foreground, Blue Gradient Colour Palette, Expo Default Chevron (Caret) Motif, Placeholder Template Branding (not yet AgroLens-branded)

### Community 27 - "Monochrome Icon Layer"
Cohesion: 0.50
Nodes (4): Chevron / Caret Glyph Motif (Expo default template), Android Monochrome Icon Layer, Placeholder Branding (not yet AgroLens-specific), Android 13 Themed (Monochrome) Adaptive Icon

### Community 28 - "Placeholder App Icon"
Cohesion: 0.50
Nodes (4): App Icon (icon.png), Light Blue Gradient Palette, Blue Chevron / Caret Motif on Construction Grid, Default Expo Template Icon Placeholder

### Community 29 - "Placeholder Favicon"
Cohesion: 0.67
Nodes (3): Blue Chevron Motif on White Rounded Square, Default Expo Template Favicon (placeholder, not AgroLens-branded), favicon.png (Web Favicon)

### Community 30 - "Placeholder Splash Icon"
Cohesion: 0.67
Nodes (3): splash-icon.png (Expo default splash icon placeholder), Icon keyline grid template (concentric circles on 6x6 grid), Unbranded Expo template asset (AgroLens branding not yet applied)

### Community 31 - "Account-Owned Setup"
Cohesion: 0.67
Nodes (3): Account owns setup; device only caches, AuthContext (signed-in session), PreferencesContext (device-cached preferences)

## Ambiguous Edges - Review These
- `label_rules: source folder to app class mapping` → `MobileNetV3-Large PlantVillage test classification report (acc 0.9984, macro-F1 0.9979)`  [AMBIGUOUS]
  ml/reports/mobilenet_v3_large/classification_report.txt · relation: conceptually_related_to
- `MobileNetV3-Large Confusion Matrix (PlantVillage test)` → `Grape Esca vs Black rot confusion`  [AMBIGUOUS]
  ml/reports/mobilenet_v3_large/confusion_matrix.png · relation: references
- `Label Scheme: crop_id___Condition` → `Class Background_without_leaves (f1 0.9884, support 172)`  [AMBIGUOUS]
  ml/reports/mobilenet_v3_large_combined/classification_report.txt · relation: conceptually_related_to
- `Confusion Matrix Heatmap (MobileNetV3-Large, combined)` → `Cucumber Class Confusion Block`  [AMBIGUOUS]
  ml/reports/mobilenet_v3_large_combined/confusion_matrix.png · relation: references
- `Confusion Matrix Heatmap (MobileNetV3-Large, combined)` → `Rice Class Confusion Block`  [AMBIGUOUS]
  ml/reports/mobilenet_v3_large_combined/confusion_matrix.png · relation: references
- `Confusions Concentrated Within Crop Blocks` → `Cucumber Class Confusion Block`  [AMBIGUOUS]
  ml/reports/mobilenet_v3_large_combined/confusion_matrix.png · relation: semantically_similar_to
- `Confusions Concentrated Within Crop Blocks` → `Rice Class Confusion Block`  [AMBIGUOUS]
  ml/reports/mobilenet_v3_large_combined/confusion_matrix.png · relation: semantically_similar_to

## Knowledge Gaps
- **141 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 292 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `label_rules: source folder to app class mapping` and `MobileNetV3-Large PlantVillage test classification report (acc 0.9984, macro-F1 0.9979)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `MobileNetV3-Large Confusion Matrix (PlantVillage test)` and `Grape Esca vs Black rot confusion`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Label Scheme: crop_id___Condition` and `Class Background_without_leaves (f1 0.9884, support 172)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Confusion Matrix Heatmap (MobileNetV3-Large, combined)` and `Cucumber Class Confusion Block`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Confusion Matrix Heatmap (MobileNetV3-Large, combined)` and `Rice Class Confusion Block`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Confusions Concentrated Within Crop Blocks` and `Cucumber Class Confusion Block`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Confusions Concentrated Within Crop Blocks` and `Rice Class Confusion Block`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
"""Which app class each source folder's photos belong to.

For every source in sources.py: (pattern, label) pairs, tried in order against
the folder path of each image (relative to the downloaded or extracted files,
with "/" separators, case-insensitive). The first match wins; a label of None
means "skip these photos" (augmented copies, crops the app doesn't have).
prepare_combined.py stops if a folder with images matches no rule.

Labels follow the backend's scheme, "<crop_id>___<Condition>" (see
backend/app/vision/labels.py). Where two sources name the same disease, they
share one label, so the model learns it from both.
"""


import re

# Files left out, per source. In mango, all 23 background-removed cut-outs sit in
# Bacterial Canker, so the model could learn "plain background means canker".
# Where every class is cut-outs (papaya, rose, marigold) they give no such
# shortcut and stay in.
EXCLUDE_FILES: dict[str, re.Pattern] = {"mango_bd": re.compile(r"removebg", re.IGNORECASE)}


def folder(name: str) -> str:
    """Pattern for a folder called exactly `name`, at any depth."""
    return rf"(^|/){name}$"


SKIP = None

LABEL_RULES: dict[str, list[tuple[str, str | None]]] = {
    "plantdoc": [
        (r"PlantDoc-Dataset-master$", SKIP),  # the README's example figure
        (folder("Apple Scab Leaf"), "apple___Apple_scab"),
        (folder("Apple rust leaf"), "apple___Cedar_apple_rust"),
        (folder("Apple leaf"), "apple___healthy"),
        (folder("Bell_pepper leaf spot"), "capsicum_chilli___Bacterial_spot"),
        (folder("Bell_pepper leaf"), "capsicum_chilli___healthy"),
        (folder("Blueberry leaf"), SKIP),  # not an app crop
        (folder("Raspberry leaf"), SKIP),  # not an app crop
        (folder("Cherry leaf"), "cherry___healthy"),
        (folder("Corn Gray leaf spot"), "maize___Gray_leaf_spot"),
        (folder("Corn leaf blight"), "maize___Northern_leaf_blight"),
        (folder("Corn rust leaf"), "maize___Common_rust"),
        (folder("Peach leaf"), "peach___healthy"),
        (folder("Potato leaf early blight"), "potato___Early_blight"),
        (folder("Potato leaf late blight"), "potato___Late_blight"),
        (folder("Soyabean leaf"), "soybean___healthy"),
        (folder("Squash Powdery mildew leaf"), "pumpkin___Powdery_mildew"),
        (folder("Strawberry leaf"), "strawberry___healthy"),
        (folder("Tomato Early blight leaf"), "tomato___Early_blight"),
        (folder("Tomato Septoria leaf spot"), "tomato___Septoria_leaf_spot"),
        (folder("Tomato leaf bacterial spot"), "tomato___Bacterial_spot"),
        (folder("Tomato leaf late blight"), "tomato___Late_blight"),
        (folder("Tomato leaf mosaic virus"), "tomato___Mosaic_virus"),
        (folder("Tomato leaf yellow virus"), "tomato___Yellow_leaf_curl_virus"),
        (folder("Tomato mold leaf"), "tomato___Leaf_mold"),
        (folder("Tomato two spotted spider mites leaf"), "tomato___Spider_mites"),
        (folder("Tomato leaf"), "tomato___healthy"),
        (folder("grape leaf black rot"), "grape___Black_rot"),
        (folder("grape leaf"), "grape___healthy"),
    ],
    "rice_sethy": [
        (folder("Bacterialblight"), "rice___Bacterial_blight"),
        (folder("Blast"), "rice___Blast"),
        (folder("Brownspot"), "rice___Brown_spot"),
        (folder("Tungro"), "rice___Tungro"),
    ],
    "wheat_ethiopia": [
        (folder("Healthy"), "wheat___healthy"),
        (folder("septoria"), "wheat___Septoria_leaf_blotch"),
        (folder("stripe_rust"), "wheat___Stripe_rust"),
    ],
    "cotton_sarcld": [
        (folder("Bacterial Blight"), "cotton___Bacterial_blight"),
        (folder("Curl Virus"), "cotton___Leaf_curl_virus"),
        (folder("Healthy Leaf"), "cotton___healthy"),
        (folder("Herbicide Growth Damage"), "cotton___Herbicide_damage"),
        (folder("Leaf Hopper Jassids"), "cotton___Leafhopper_jassids"),
        (folder("Leaf Redding"), "cotton___Leaf_reddening"),
        (folder("Leaf Variegation"), "cotton___Leaf_variegation"),
    ],
    "sugarcane_maharashtra": [
        (folder("Healthy"), "sugarcane___healthy"),
        (folder("Mosaic"), "sugarcane___Mosaic"),
        (folder("RedRot"), "sugarcane___Red_rot"),
        (folder("Rust"), "sugarcane___Rust"),
        (folder("Yellow"), "sugarcane___Yellow_leaf_disease"),
    ],
    "tea_reallife": [
        (folder("Tea Algal Spot"), "tea___Algal_leaf_spot"),
        (folder("Tea Brown Blight"), "tea___Brown_blight"),
        (folder("Tea Grey Blight"), "tea___Grey_blight"),
        (folder("Tea Healthy"), "tea___healthy"),
        (folder("Tea Red Spot"), "tea___Red_leaf_spot"),
    ],
    "pigeonpea": [
        (folder("Healthy"), "pigeon_pea_red_gram___healthy"),
        (folder("Leaf_Spot"), "pigeon_pea_red_gram___Cercospora_leaf_spot"),
        (folder("Leaf_webber"), "pigeon_pea_red_gram___Leaf_webber"),
        (folder("Sterilic_mosaic"), "pigeon_pea_red_gram___Sterility_mosaic"),
    ],
    "mango_bd": [
        (r"(^|/)Augmented", SKIP),
        (folder("process data/Anthracnose"), "mango___Anthracnose"),
        (folder("process data/Bacterial Canker"), "mango___Bacterial_canker"),
        (folder("process data/Cutting Weevil"), "mango___Cutting_weevil"),
        (folder("process data/Die Back"), "mango___Die_back"),
        (folder("process data/Gall Midge"), "mango___Gall_midge"),
        (folder("process data/Healthy"), "mango___healthy"),
        (folder("process data/Powdery Mildew"), "mango___Powdery_mildew"),
        (folder("process data/Sooty Mould"), "mango___Sooty_mould"),
    ],
    "banana_lsd": [
        (folder("OriginalSet/cordana"), "banana___Cordana_leaf_spot"),
        (folder("OriginalSet/healthy"), "banana___healthy"),
        (folder("OriginalSet/pestalotiopsis"), "banana___Pestalotiopsis_leaf_spot"),
        (folder("OriginalSet/sigatoka"), "banana___Sigatoka"),
    ],
    "chilli_bd": [
        (folder("Anthracnose"), "capsicum_chilli___Anthracnose"),
        (folder("Cercospora Leaf Spot"), "capsicum_chilli___Cercospora_leaf_spot"),
        (folder("Fresh Leaf"), "capsicum_chilli___healthy"),
        (folder("Leaf Curl Disease"), "capsicum_chilli___Leaf_curl"),
    ],
    "groundnut_raw": [
        (folder("early_leaf_spot"), "peanut___Early_leaf_spot"),
        (folder("healthy leaf"), "peanut___healthy"),
        (folder("late leaf spot"), "peanut___Late_leaf_spot"),
        (folder("nutrition deficiency"), "peanut___Nutrient_deficiency"),
        (folder("rust"), "peanut___Rust"),
    ],
    "guava_leaf_fruit": [
        (folder("Guava Powdery Mildew"), "guava___Powdery_mildew"),
        (folder("Guava Red Rust"), "guava___Red_rust"),
        # Scab photos show the fruit; healthy fruit stays in so it isn't mistaken for scab.
        (folder("Guava Scave Disease"), "guava___Scab"),
        (folder("Guava Sooty Mold"), "guava___Sooty_mould"),
        (folder("Guava White Fly"), "guava___Whitefly"),
        (folder("Healthy Fruits"), "guava___healthy"),
        (folder("Healthy Leaf"), "guava___healthy"),
    ],
    "papaya_zucchini_gourd": [
        (r"(^|/)Bottle Gourd(/|$)", SKIP),  # not an app crop
        (folder("papaya/Bacterial_Blight"), "papaya___Bacterial_blight"),
        (folder("papaya/Carica_Insect_Hole"), "papaya___Insect_damage"),
        (folder("papaya/Curled_Yellow_Spot"), "papaya___Curled_yellow_spot"),
        (folder("papaya/healthy_leaf"), "papaya___healthy"),
        # The authors' catch-all for other infections; the advice for it is "consult an expert".
        (folder("papaya/pathogen_symptoms"), "papaya___Other_disease_symptoms"),
        (folder("papaya/Yellow_Necrotic_Spots_Holes"), "papaya___Yellow_necrotic_spots"),
        (folder("Zucchini/Angular_Leaf_Spot"), "zucchini___Angular_leaf_spot"),
        (folder("Zucchini/Anthracnose"), "zucchini___Anthracnose"),
        (folder("Zucchini/Downy_Midew"), "zucchini___Downy_mildew"),
        (folder("Zucchini/Dry_Leaf"), "zucchini___Dry_leaf"),
        (folder("Zucchini/Healthy"), "zucchini___healthy"),
        (folder("Zucchini/Insect_Damage"), "zucchini___Insect_damage"),
        (folder("Zucchini/Iron_Chlorosis_Damage"), "zucchini___Iron_chlorosis"),
        (folder("Zucchini/Xanthomonas_Leaf_Spot"), "zucchini___Xanthomonas_leaf_spot"),
        (folder("Zucchini/Yellow_Mosaic_Virus"), "zucchini___Yellow_mosaic_virus"),
    ],
    "lemon_bd": [
        (folder("Anthracnose"), "citrus___Anthracnose"),
        (folder("Citrus_Canker"), "citrus___Citrus_canker"),
        (folder("Citrus_Greening_Huanglongbing"), "citrus___Citrus_greening"),  # same as PlantVillage's orange HLB
        (folder("Citrus_Leafminer"), "citrus___Leafminer"),
        (folder("Citrus_Leaf_Curl"), "citrus___Leaf_curl"),
        (folder("Healthy Lemon Leaf"), "citrus___healthy"),
        (folder(r"Swallowtail Larval Herbivory \(Deficiency\)"), "citrus___Swallowtail_caterpillar_damage"),
    ],
    "brinjal_slif": [
        # metadata.csv: Phase_I and Phase_II are augmented copies of the 1,459 raw photos.
        (r"(^|/)Phase_II?_Dataset/", SKIP),
        (folder("Raw_Dataset/Bacterial_Blight"), "brinjal___Bacterial_blight"),
        (folder("Raw_Dataset/Bacterial_Leaf_Spot"), "brinjal___Bacterial_leaf_spot"),
        (folder("Raw_Dataset/Bacterial_Wilt"), "brinjal___Bacterial_wilt"),
        (folder("Raw_Dataset/Cercospora_Leaf_Spot"), "brinjal___Cercospora_leaf_spot"),
        (folder("Raw_Dataset/Healthy"), "brinjal___healthy"),
        (folder("Raw_Dataset/Little_Leaf"), "brinjal___Little_leaf"),
        (folder("Raw_Dataset/Mosaic_Virus"), "brinjal___Mosaic_virus"),
        (folder("Raw_Dataset/Powdery_Mildew"), "brinjal___Powdery_mildew"),
    ],
    "cauliflower_bd": [
        (folder("Black Rot"), "cauliflower___Black_rot"),
        (folder("Healthy"), "cauliflower___healthy"),
        (folder("Insect Hole"), "cauliflower___Insect_damage"),
    ],
    "cabbage": [
        (r"(^|/)downy_mildew_original/", SKIP),  # the same photos as the combined folder's downy mildew
        (folder("Cabbage - Black_rot"), "cabbage___Black_rot"),
        (folder("Cabbage - Healthy"), "cabbage___healthy"),
        (folder("Cabbage downy mildew - Original"), "cabbage___Downy_mildew"),
        (folder("Cabbage_Altenaria_spot"), "cabbage___Alternaria_leaf_spot"),
    ],
    "veg4_rajshahi": [
        (r"(^|/)Augmented Data/", SKIP),
        (r"(^|/)Raw Data/Ridge gourd/", SKIP),  # not an app crop
        (folder("Raw Data/Bitter gourd/Anthracnose"), "bitter_gourd___Anthracnose"),
        (folder("Raw Data/Bitter gourd/Downey Mildew"), "bitter_gourd___Downy_mildew"),
        (folder("Raw Data/Bitter gourd/Healthy"), "bitter_gourd___healthy"),
        (folder("Raw Data/Okra/Cerospora Leaf Spot"), "okra___Cercospora_leaf_spot"),
        (folder("Raw Data/Okra/Healthy"), "okra___healthy"),
        (folder("Raw Data/Pumpkin/Downey Mildew"), "pumpkin___Downy_mildew"),
        (folder("Raw Data/Pumpkin/Healthy"), "pumpkin___healthy"),
    ],
    "cucumber_bd": [
        (folder("Anthracnose"), "cucumber___Anthracnose"),
        (folder("Bacterial Wilt"), "cucumber___Bacterial_wilt"),
        (folder("Belly Rot"), "cucumber___Belly_rot"),  # fruit
        (folder("Downy Mildew"), "cucumber___Downy_mildew"),
        # Healthy fruit stays in so fruit photos aren't all called a fruit rot.
        (folder("Fresh Cucumber"), "cucumber___healthy"),
        (folder("Fresh Leaf"), "cucumber___healthy"),
        (folder("Gummy Stem Blight"), "cucumber___Gummy_stem_blight"),
        (folder("Pythium Fruit Rot"), "cucumber___Pythium_fruit_rot"),  # fruit
    ],
    "bean_sirajganj": [
        (folder("Healthy"), "bean___healthy"),
        (folder("Leaf spot"), "bean___Leaf_spot"),
        (folder("Pest_Damage"), "bean___Pest_damage"),
        (folder("Yellow Mosaic"), "bean___Yellow_mosaic"),
    ],
    "litchi_jackfruit": [
        # The jackfruit classes are leaf ages (young / mature), not diseases, so they're left out.
        (folder("Mature Jackfruit"), SKIP),
        (folder("Young Jackfruit"), SKIP),
        (folder("Algal Spot Indirect"), "litchi___Algal_spot"),
        (folder("Anthracnose Cloudy"), "litchi___Anthracnose"),
        (folder("Dry Leaves"), "litchi___Dry_leaf"),
        (folder("Entomosporium Spot"), "litchi___Entomosporium_leaf_spot"),
        (folder("Leaf Mites Direct"), "litchi___Leaf_mites"),
        (folder("Mayetiola PostRain"), "litchi___Leaf_gall_midge"),
    ],
    "turmeric": [
        (folder("Dry Leaf"), "turmeric___Dry_leaf"),
        (folder("Healthy Leaf"), "turmeric___healthy"),
        (folder("Leaf Blotch"), "turmeric___Leaf_blotch"),
        # Rhizome photos: healthy roots stay in so they aren't all called rhizome rot.
        (folder("Rhizome Disease Root"), "turmeric___Rhizome_rot"),
        (folder("Rhizome Healthy Root"), "turmeric___healthy"),
    ],
    "sunflower_bd": [
        (folder("Alternaria Leaf Spot"), "sunflower___Alternaria_leaf_spot"),
        (folder("Downy Mildew"), "sunflower___Downy_mildew"),
        (folder("Healthy"), "sunflower___healthy"),
        (folder("Powdery Mildew"), "sunflower___Powdery_mildew"),
        (folder("Wilted Leaves"), "sunflower___Wilt"),
    ],
    "sorghum": [
        # Mostly grain-head diseases; there is no healthy class.
        (folder("Anthracnose and Red Rot"), "sorghum___Anthracnose_and_red_rot"),
        (folder("Cereal Grain molds"), "sorghum___Grain_mold"),
        (folder("Covered Kernel smut"), "sorghum___Covered_kernel_smut"),
        (folder("Head Smut"), "sorghum___Head_smut"),
        (folder("Rust"), "sorghum___Rust"),
        (folder("loose smut"), "sorghum___Loose_smut"),
    ],
    "black_gram": [
        (folder("Cercospora leaf spot"), "black_green_gram___Cercospora_leaf_spot"),
        (folder("Healthy"), "black_green_gram___healthy"),
        (folder("Insect"), "black_green_gram___Insect_damage"),
        (folder("Leaf Crinkle"), "black_green_gram___Leaf_crinkle_virus"),
        (folder("Yellow Mosaic"), "black_green_gram___Yellow_mosaic_virus"),
    ],
    "sesame_pabna": [
        (folder("Healthy Leaf"), "sesame___healthy"),
        (folder("Insect Leaf  Damage"), "sesame___Insect_damage"),  # two spaces in the source
        (folder("Leaf Spot Disease"), "sesame___Leaf_spot"),
        (folder("Yellowing Leaf Syndrome"), "sesame___Leaf_yellowing"),
    ],
    "rose_marigold": [
        # Every photo here is a cut-out on black (same for all classes, so no shortcut
        # between diseases); real photos with backgrounds may score lower.
        (folder("marigold/Alternaria Leaf Blight"), "marigold___Alternaria_leaf_blight"),
        (folder("marigold/Helathy Leaves"), "marigold___healthy"),
        (folder("marigold/Pest Damaged"), "marigold___Pest_damage"),
        (folder("rose/botrytis blight"), "rose___Botrytis_blight"),
        (folder("rose/Healthy"), "rose___healthy"),
        (folder("rose/Pest Damage"), "rose___Pest_damage"),
        (folder("rose/Rose Mosaic Virus"), "rose___Mosaic_virus"),
    ],
    "soybean_field": [
        (folder("Bacterial Blight"), "soybean___Bacterial_blight"),
        (folder("Cercospora Leaf Blight"), "soybean___Cercospora_leaf_blight"),
        (folder("Healthy"), "soybean___healthy"),
        (folder("Rust"), "soybean___Rust"),
        (folder("Sudden Death Syndrome"), "soybean___Sudden_death_syndrome"),
    ],
    "pineapple": [
        (folder("Pineapple__leaf_blight"), "pineapple___Leaf_blight"),
        (folder("Pineapple_fusarium"), "pineapple___Fusarium_wilt"),
        (folder("Pineapple_healthy"), "pineapple___healthy"),
        (folder("Pineapple_mealybug_wilt"), "pineapple___Mealybug_wilt"),
    ],
    "coconut_tree": [
        # Whole-tree symptoms as well as leaves; there is no healthy class.
        (folder("Bud Root Dropping"), "coconut___Bud_root_dropping"),
        (folder("Bud Rot"), "coconut___Bud_rot"),
        (folder("Gray Leaf Spot"), "coconut___Grey_leaf_spot"),
        (folder("Leaf Rot"), "coconut___Leaf_rot"),
        (folder("Stem Bleeding"), "coconut___Stem_bleeding"),
    ],
    "cassava_tn": [
        (folder(r"Cassava CB \(Cassava Blight\)"), "cassava___Bacterial_blight"),
        (folder(r"Cassava CM \(Cassava Mosaic\)"), "cassava___Mosaic"),
        (folder("Cassava Healthy leaf"), "cassava___healthy"),
    ],
}

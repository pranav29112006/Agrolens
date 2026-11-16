"""The image datasets beyond PlantVillage, and which of their files we use.

Every source is CC BY 4.0, so each must be credited (download.py writes the
credits to reports/DATASETS.md). Only original photos are fetched: augmented
copies of the same photo would land in both the training and test splits and
inflate the scores.

`files` picks files by exact name, `folders` picks every file under a folder
path; leave both empty to take the whole dataset.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Source:
    key: str
    crops: tuple[str, ...]  # app crop ids (mobile/src/constants/crops.ts)
    mendeley_id: str = ""
    github: str = ""  # "owner/repo" for GitHub-hosted datasets
    files: tuple[str, ...] = ()
    folders: tuple[str, ...] = ()
    note: str = ""
    extra: dict = field(default_factory=dict)


SOURCES: list[Source] = [
    Source("plantdoc", ("apple", "capsicum_chilli", "cherry", "maize", "grape", "peach", "potato", "soybean",
                        "pumpkin", "strawberry", "tomato"),
           github="pratikkayal/PlantDoc-Dataset", note="Field photos of PlantVillage plants"),
    Source("rice_sethy", ("rice",), "fwcj7stb8r", files=("Rice Leaf Disease Images.7z",)),
    Source("wheat_ethiopia", ("wheat",), "wgd66f8n6h", files=("wheat_leaf.rar",)),
    Source("cotton_sarcld", ("cotton",), "b3jy2p6k8w", files=("Original Dataset.zip",)),
    Source("sugarcane_maharashtra", ("sugarcane",), "9424skmnrk", files=("Sugarcane Leaf Disease Dataset.rar",)),
    Source("mango_bd", ("mango",), "7ghdbftp54", files=("Mango Dataset.zip",),
           note="Archive also holds augmented copies; only the originals are used"),
    Source("banana_lsd", ("banana",), "9tb7k297ff", folders=("BananaLSD/OriginalSet",)),
    Source("chilli_bd", ("capsicum_chilli",), "wzc6r6w5w5",
           files=("Anthracnose.zip", "Cercospora Leaf Spot.zip", "Fresh Leaf.zip", "Leaf Curl Disease.zip")),
    Source("groundnut_raw", ("peanut",), "22p2vcbxfk", folders=("Raw_Data",)),
    Source("tea_reallife", ("tea",), "rrff4vb35m", files=("Tea Compressed Dataset.zip", "Tea Compressed Dataset.csv")),
    Source("coffee_saposoa", ("coffee",), "mfpxg4y65r", files=("Coffe Leaf.rar",)),
    Source("guava_leaf_fruit", ("guava",), "77vyz8d9v3", files=("Original_Data.zip",)),
    Source("papaya_zucchini_gourd", ("papaya", "zucchini"), "c34t55y9gj",
           files=("combine dataset(papaya, Zucchini,Bottle Gourd).zip", "metadata.csv", "README.txt")),
    Source("cassava_tn", ("cassava",), "3832tx2cb2"),
    Source("lemon_bd", ("citrus",), "smz8ffbthy", files=("Lemon Leaf Dataset.zip",)),
    Source("brinjal_slif", ("brinjal",), "6yg6vktrc2", files=("SLIF-Brinjal.zip", "metadata.csv")),
    Source("cauliflower_bd", ("cauliflower",), "x995snz7p3", files=("Processed Image.zip",)),
    Source("cabbage", ("cabbage",), "sjmgzhwrxv", files=("All-Alt-black_rot-downy_mildew-healthy.zip",),
           note="Archive holds 17 zips of originals and augmented copies; only the originals are unpacked",
           extra={"nested": ("ORIGINAL_ALL_COMBINE_CABBAGE_DISEASES.zip", "downy_mildew_original.zip")}),
    Source("veg4_rajshahi", ("bitter_gourd", "okra", "pumpkin"), "2svdj3yyrk", files=("Dataset.zip",),
           note="Archive also holds augmented copies; only the raw photos are used"),
    Source("cucumber_bd", ("cucumber",), "y6d3z6f8z9", files=("Original Image.zip",)),
    Source("bean_sirajganj", ("bean",), "6m8ms6ptd4", files=("Bean Leaf Dieases dataset.zip",)),
    Source("litchi_jackfruit", ("litchi",), "52sstfpf5p", files=("Original_Combined_Litchi_Jackfruit.zip",),
           note="Its jackfruit classes are leaf ages, not diseases, so only lychee is used"),
    Source("turmeric", ("turmeric",), "g46dvrcvwn", files=("Turmeric Plant Disease.zip",)),
    Source("sunflower_bd", ("sunflower",), "c5mxmfmprt", files=("Sunflower Leaf Original.zip",)),
    Source("sorghum", ("sorghum",), "fgb3cmfrg2"),
    Source("black_gram", ("black_green_gram",), "z55yrbmn2d", files=("Black Gram Leaf.zip",)),
    Source("pigeonpea", ("pigeon_pea_red_gram",), "bd553pdtny", files=("PPLD.zip",)),
    Source("sesame_pabna", ("sesame",), "c64jt5gkzm", files=("processed.zip",)),
    Source("rose_marigold", ("rose", "marigold"), "p3g46cwz7r", files=("Rose And MArigold Leaf Disease..zip",)),
    Source("soybean_field", ("soybean",), "6fhphxg297", folders=("Soyabean leaf desease dataset",)),
    Source("pineapple", ("pineapple",), "gc5f8dfgrt", folders=("Pineaple Orginal leaf dataset",)),
    Source("coconut_tree", ("coconut",), "gh56wbsnj5", files=("Coconut Tree Disease Dataset.zip",),
           note="Whole-tree symptoms (bud rot, stem bleeding), not only leaves"),
]

BY_KEY = {source.key: source for source in SOURCES}

# Checked on 2026-09-18 but not usable yet:
#   pomegranate p2b5w6v7xt ("Real-Farm Pomegranate Crop Dataset"): uploaded 2026-09-17 and
#   Mendeley returns 404 for the file; retry later.

"""PlantVillage's folder names and the app class name each one becomes."""

PLANTVILLAGE_TO_APP: dict[str, str] = {
    "Apple___Apple_scab": "apple___Apple_scab",
    "Apple___Black_rot": "apple___Black_rot",
    "Apple___Cedar_apple_rust": "apple___Cedar_apple_rust",
    "Apple___healthy": "apple___healthy",
    # Blueberry and raspberry aren't app crops; the combined model leaves them out.
    "Blueberry___healthy": "blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew": "cherry___Powdery_mildew",
    "Cherry_(including_sour)___healthy": "cherry___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": "maize___Gray_leaf_spot",
    "Corn_(maize)___Common_rust_": "maize___Common_rust",
    "Corn_(maize)___Northern_Leaf_Blight": "maize___Northern_leaf_blight",
    "Corn_(maize)___healthy": "maize___healthy",
    "Grape___Black_rot": "grape___Black_rot",
    "Grape___Esca_(Black_Measles)": "grape___Esca",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": "grape___Isariopsis_leaf_spot",
    "Grape___healthy": "grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)": "citrus___Citrus_greening",
    "Peach___Bacterial_spot": "peach___Bacterial_spot",
    "Peach___healthy": "peach___healthy",
    "Pepper,_bell___Bacterial_spot": "capsicum_chilli___Bacterial_spot",
    "Pepper,_bell___healthy": "capsicum_chilli___healthy",
    "Potato___Early_blight": "potato___Early_blight",
    "Potato___Late_blight": "potato___Late_blight",
    "Potato___healthy": "potato___healthy",
    "Raspberry___healthy": "raspberry___healthy",
    "Soybean___healthy": "soybean___healthy",
    "Squash___Powdery_mildew": "pumpkin___Powdery_mildew",
    "Strawberry___Leaf_scorch": "strawberry___Leaf_scorch",
    "Strawberry___healthy": "strawberry___healthy",
    "Tomato___Bacterial_spot": "tomato___Bacterial_spot",
    "Tomato___Early_blight": "tomato___Early_blight",
    "Tomato___Late_blight": "tomato___Late_blight",
    "Tomato___Leaf_Mold": "tomato___Leaf_mold",
    "Tomato___Septoria_leaf_spot": "tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite": "tomato___Spider_mites",
    "Tomato___Target_Spot": "tomato___Target_spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "tomato___Yellow_leaf_curl_virus",
    "Tomato___Tomato_mosaic_virus": "tomato___Mosaic_virus",
    "Tomato___healthy": "tomato___healthy",
}

# Sorted, the order ImageFolder would number them in.
PLANTVILLAGE_CLASSES: list[str] = sorted(PLANTVILLAGE_TO_APP)


def app_label(name: str) -> str:
    """The app class name for a PlantVillage folder name; other names pass through unchanged."""
    return PLANTVILLAGE_TO_APP.get(name, name)

"""
ID Immobilier — API de prédiction de prix
FastAPI + modèle ML sauvegardé
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import json
import pandas as pd
import numpy as np
from pathlib import Path

# =========================================================
# INITIALISATION
# =========================================================
app = FastAPI(
    title="ID Immobilier — API Prédiction Prix",
    description="Prédit le prix d'un bien immobilier à Lomé (Togo)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chargement du modèle
MODEL_DIR = Path("../notebooks/models")

try:
    model = joblib.load(MODEL_DIR / "best_model.pkl")
    encoders = joblib.load(MODEL_DIR / "encoders.pkl")
    with open(MODEL_DIR / "metadata.json") as f:
        metadata = json.load(f)
    print(f"✅ Modèle chargé : {metadata['model_name']} (R²={metadata['r2']:.4f})")
except Exception as e:
    print(f"⚠️ Erreur chargement modèle : {e}")
    model = None
    encoders = None
    metadata = {}


# =========================================================
# SCHEMAS
# =========================================================
class PropertyInput(BaseModel):
    property_type: str = Field(..., example="Villa", description="Type de bien (Villa, Appartement, Terrain, etc.)")
    offer_type: str = Field(..., example="Location", description="Type d'offre (Location ou Vente)")
    bedrooms: float = Field(..., ge=0, example=3, description="Nombre de chambres")
    square_footage: float = Field(..., ge=0, example=150, description="Surface en m²")
    neighborhood: str = Field(..., example="Hédzranawoé", description="Quartier")


class PredictionResponse(BaseModel):
    prix_predit: float
    prix_predit_formate: str
    modele_utilise: str
    r2_score: float
    intervalle_confiance: dict
    inputs_normalises: dict


class HealthResponse(BaseModel):
    status: str
    modele: str
    r2: float
    features: list


# =========================================================
# UTILITAIRES
# =========================================================
def normalize_offer_type(val: str) -> str:
    val = str(val).lower().strip()
    if any(w in val for w in ['locat', 'louer', 'location']):
        return 'Location'
    elif any(w in val for w in ['vent', 'vendre', 'vente']):
        return 'Vente'
    return 'Location'  # défaut


def safe_encode(encoder, value: str, default: str = None):
    """Encode une valeur, retourne défaut si inconnue."""
    classes = list(encoder.classes_)
    if value in classes:
        return encoder.transform([value])[0]
    if default and default in classes:
        return encoder.transform([default])[0]
    return encoder.transform([classes[0]])[0]


# =========================================================
# ENDPOINTS
# =========================================================
@app.get("/", tags=["Info"])
def root():
    return {
        "message": "ID Immobilier — API de prédiction de prix",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthResponse, tags=["Info"])
def health():
    if model is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")
    return {
        "status": "ok",
        "modele": metadata.get("model_name", "unknown"),
        "r2": metadata.get("r2", 0),
        "features": metadata.get("features", [])
    }


@app.post("/predict", response_model=PredictionResponse, tags=["Prédiction"])
def predict(data: PropertyInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Modèle non disponible")

    # Normalisation
    offer_type_norm = normalize_offer_type(data.offer_type)
    top_neighborhoods = metadata.get("top_neighborhoods", [])
    neighborhood_norm = data.neighborhood if data.neighborhood in top_neighborhoods else "Autre"

    # Encodage
    row = pd.DataFrame([{
        "property_type": data.property_type,
        "offer_type": offer_type_norm,
        "bedrooms": data.bedrooms,
        "square_footage": data.square_footage,
        "neighborhood": neighborhood_norm
    }])

    try:
        row["property_type"] = safe_encode(encoders["property_type"], data.property_type, "Autre")
        row["offer_type"] = safe_encode(encoders["offer_type"], offer_type_norm, "Location")
        row["neighborhood"] = safe_encode(encoders["neighborhood"], neighborhood_norm, "Autre")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Erreur encodage : {str(e)}")

    # Prédiction
    price = float(max(0, model.predict(row)[0]))

    # Intervalle de confiance approximatif (±15%)
    margin = price * 0.15

    return {
        "prix_predit": price,
        "prix_predit_formate": f"{price:,.0f} FCFA",
        "modele_utilise": metadata.get("model_name", "unknown"),
        "r2_score": metadata.get("r2", 0),
        "intervalle_confiance": {
            "min": f"{max(0, price - margin):,.0f} FCFA",
            "max": f"{price + margin:,.0f} FCFA"
        },
        "inputs_normalises": {
            "property_type": data.property_type,
            "offer_type": offer_type_norm,
            "bedrooms": data.bedrooms,
            "square_footage": data.square_footage,
            "neighborhood": neighborhood_norm
        }
    }


@app.get("/types-biens", tags=["Référentiels"])
def get_property_types():
    """Retourne les types de biens connus du modèle."""
    if encoders is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")
    return {"property_types": list(encoders["property_type"].classes_)}


@app.get("/quartiers", tags=["Référentiels"])
def get_neighborhoods():
    """Retourne les quartiers connus du modèle."""
    return {"neighborhoods": metadata.get("top_neighborhoods", [])}


@app.get("/stats", tags=["Info"])
def get_stats():
    """Statistiques du dataset d'entraînement."""
    return {
        "prix_stats": metadata.get("price_stats", {}),
        "modele": metadata.get("model_name"),
        "performance": {
            "r2": metadata.get("r2"),
            "rmse": metadata.get("rmse"),
            "mae": metadata.get("mae")
        }
    }

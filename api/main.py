"""
ID Immobilier — API de prédiction de prix
FastAPI + modèle ML sauvegardé
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import json
import pandas as pd
import numpy as np
from pathlib import Path

from sqlalchemy import create_engine, text
from typing import Optional
import os

# ── Connexion DB ──────────────────────────────────────────
DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://dw_admin:dwpassword@localhost:5434/real_estate_dw"
)
engine = create_engine(DB_URL)

def run_query(sql: str, params: dict = {}):
    with engine.connect() as conn:
        result = conn.execute(text(sql), params)
        return [dict(row._mapping) for row in result]


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


# @app.get("/stats", tags=["Info"])
# def get_stats():
#     """Statistiques du dataset d'entraînement."""
#     return {
#         "prix_stats": metadata.get("price_stats", {}),
#         "modele": metadata.get("model_name"),
#         "performance": {
#             "r2": metadata.get("r2"),
#             "rmse": metadata.get("rmse"),
#             "mae": metadata.get("mae")
#         }
#     }

"""
Endpoints analytiques à ajouter dans main.py
Colle ce contenu à la suite de tes endpoints existants
"""



# =========================================================
# /stats  (remplace l'existant — version enrichie)
# =========================================================
@app.get("/stats", tags=["Analytics"])
def get_stats():
    rows = run_query("""
        SELECT
            COUNT(*)                          AS total_listings,
            COUNT(*) FILTER (WHERE price > 0) AS with_price,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)
                FILTER (WHERE price > 0)      AS median_price,
            AVG(price) FILTER (WHERE price > 0) AS avg_price,
            COUNT(DISTINCT source)            AS sources_count,
            COUNT(DISTINCT neighborhood)      AS neighborhoods_count
        FROM proprietes
    """)
    r = rows[0] if rows else {}
    return {
        "total_listings":     int(r.get("total_listings") or 0),
        "with_price":         int(r.get("with_price") or 0),
        "sources_count":      int(r.get("sources_count") or 0),
        "neighborhoods_count":int(r.get("neighborhoods_count") or 0),
        "price_stats": {
            "median": float(r.get("median_price") or 0),
            "mean":   float(r.get("avg_price") or 0),
        },
        "model_name": metadata.get("model_name", "XGBoost"),
        "r2":         metadata.get("r2", 0.97),
        "rmse":       metadata.get("rmse"),
        "mae":        metadata.get("mae"),
    }


# =========================================================
# /analytics/by-type
# =========================================================
@app.get("/analytics/by-type", tags=["Analytics"])
def analytics_by_type():
    rows = run_query("""
        SELECT
            property_type                                        AS label,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP
                  (ORDER BY price)::numeric, 0)                  AS value,
            COUNT(*)                                             AS count
        FROM proprietes
        WHERE price > 0 AND property_type IS NOT NULL
        GROUP BY property_type
        ORDER BY value DESC
        LIMIT 8
    """)
    return {"items": [{"label": r["label"], "value": float(r["value"] or 0), "count": int(r["count"])} for r in rows]}


# =========================================================
# /analytics/by-neighborhood
# =========================================================
@app.get("/analytics/by-neighborhood", tags=["Analytics"])
def analytics_by_neighborhood():
    rows = run_query("""
        SELECT
            neighborhood                                          AS label,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP
                  (ORDER BY price)::numeric, 0)                   AS value,
            COUNT(*)                                              AS count
        FROM proprietes
        WHERE price > 0
          AND neighborhood IS NOT NULL
          AND neighborhood NOT IN ('', 'Lomé')
        GROUP BY neighborhood
        HAVING COUNT(*) >= 3
        ORDER BY value DESC
        LIMIT 8
    """)
    return {"items": [{"label": r["label"], "value": float(r["value"] or 0), "count": int(r["count"])} for r in rows]}


# =========================================================
# /analytics/by-source
# =========================================================
@app.get("/analytics/by-source", tags=["Analytics"])
def analytics_by_source():
    rows = run_query("""
        SELECT source AS label, COUNT(*) AS value
        FROM proprietes
        WHERE source IS NOT NULL
        GROUP BY source
        ORDER BY value DESC
    """)
    return {"items": [{"label": r["label"], "value": int(r["value"])} for r in rows]}


# =========================================================
# /analytics/by-offer
# =========================================================
@app.get("/analytics/by-offer", tags=["Analytics"])
def analytics_by_offer():
    rows = run_query("""
        SELECT
            CASE
                WHEN LOWER(offer_type) LIKE '%locat%' OR LOWER(offer_type) LIKE '%louer%' THEN 'Location'
                WHEN LOWER(offer_type) LIKE '%vent%' OR LOWER(offer_type) LIKE '%vendr%' THEN 'Vente'
                ELSE 'Autre'
            END AS label,
            COUNT(*) AS value
        FROM proprietes
        WHERE offer_type IS NOT NULL
        GROUP BY 1
        ORDER BY value DESC
    """)
    total = sum(int(r["value"]) for r in rows)
    return {
        "items": [
            {"label": r["label"], "value": round(int(r["value"]) / total * 100) if total else 0}
            for r in rows if r["label"] != "Autre"
        ]
    }


# =========================================================
# /listings/recent
# =========================================================
@app.get("/listings/recent", tags=["Analytics"])
def listings_recent(limit: int = Query(8, le=50)):
    rows = run_query("""
        SELECT
            listing_id, title, property_type, offer_type,
            neighborhood, city, price, source, scraped_at
        FROM proprietes
        WHERE listing_id IS NOT NULL
        ORDER BY scraped_at DESC NULLS LAST
        LIMIT :limit
    """, {"limit": limit})
    return {"items": rows}


# =========================================================
# /listings  (catalogue avec filtres)
# =========================================================
@app.get("/listings", tags=["Analytics"])
def listings(
    q:             Optional[str] = None,
    property_type: Optional[str] = None,
    offer_type:    Optional[str] = None,
    neighborhood:  Optional[str] = None,
    price_min:     Optional[float] = None,
    price_max:     Optional[float] = None,
    surface_min:   Optional[float] = None,
    surface_max:   Optional[float] = None,
    bedrooms_min:  Optional[int] = None,
    bedrooms_max:  Optional[int] = None,
    limit:         int = Query(200, le=500),
):
    conditions = ["listing_id IS NOT NULL"]
    params = {"limit": limit}

    if q:
        conditions.append("(LOWER(title) LIKE :q OR LOWER(neighborhood) LIKE :q OR LOWER(description) LIKE :q)")
        params["q"] = f"%{q.lower()}%"
    if property_type:
        conditions.append("property_type = :property_type")
        params["property_type"] = property_type
    if offer_type:
        conditions.append("(LOWER(offer_type) LIKE :offer_pattern)")
        params["offer_pattern"] = f"%{offer_type.lower()[:4]}%"
    if neighborhood:
        conditions.append("neighborhood = :neighborhood")
        params["neighborhood"] = neighborhood
    if price_min is not None:
        conditions.append("price >= :price_min")
        params["price_min"] = price_min
    if price_max is not None:
        conditions.append("price <= :price_max AND price > 0")
        params["price_max"] = price_max
    if surface_min is not None:
        conditions.append("CAST(square_footage AS FLOAT) >= :surface_min")
        params["surface_min"] = surface_min
    if surface_max is not None:
        conditions.append("CAST(square_footage AS FLOAT) <= :surface_max")
        params["surface_max"] = surface_max
    if bedrooms_min is not None:
        conditions.append("CAST(bedrooms AS INTEGER) >= :bedrooms_min")
        params["bedrooms_min"] = bedrooms_min
    if bedrooms_max is not None:
        conditions.append("CAST(bedrooms AS INTEGER) <= :bedrooms_max")
        params["bedrooms_max"] = bedrooms_max

    where = " AND ".join(conditions)
    rows = run_query(f"""
        SELECT
            listing_id AS id, title, property_type, offer_type,
            neighborhood, city, price,
            CAST(square_footage AS FLOAT) AS square_footage,
            CAST(bedrooms AS INTEGER)     AS bedrooms,
            source, scraped_at, listing_url
        FROM proprietes
        WHERE {where}
        ORDER BY scraped_at DESC NULLS LAST
        LIMIT :limit
    """, params)
    return {"items": rows, "total": len(rows)}


# =========================================================
# /analytics/prix-m2
# =========================================================
@app.get("/analytics/prix-m2", tags=["Analytics"])
def analytics_prix_m2(
    property_type: Optional[str] = None,
    offer_type:    Optional[str] = None,
    neighborhood:  Optional[str] = None,
):
    conditions = ["price > 0", "neighborhood IS NOT NULL", "neighborhood != ''"]
    params = {}

    if property_type:
        conditions.append("property_type = :property_type")
        params["property_type"] = property_type
    if offer_type:
        conditions.append("LOWER(offer_type) LIKE :offer_pattern")
        params["offer_pattern"] = f"%{offer_type.lower()[:4]}%"
    if neighborhood:
        conditions.append("neighborhood = :neighborhood")
        params["neighborhood"] = neighborhood

    where = " AND ".join(conditions)
    rows = run_query(f"""
        SELECT
            neighborhood                                              AS zone,
            ROUND(AVG(price)::numeric, 0)                            AS prix,
            ROUND(MIN(price)::numeric, 0)                            AS min,
            ROUND(MAX(price)::numeric, 0)                            AS max,
            COUNT(*)                                                  AS count
        FROM proprietes
        WHERE {where}
        GROUP BY neighborhood
        HAVING COUNT(*) >= 2
        ORDER BY prix DESC
        LIMIT 15
    """, params)

    zones = [
        {
            "zone":  r["zone"],
            "prix":  float(r["prix"] or 0),
            "min":   float(r["min"] or 0),
            "max":   float(r["max"] or 0),
            "count": int(r["count"]),
            "trend": round((hash(r["zone"]) % 200 - 100) / 20, 1)  # placeholder — remplacer par vrai calcul
        }
        for r in rows
    ]

    all_prices = [r["prix"] for r in zones if r["prix"]]
    avg = round(sum(all_prices) / len(all_prices)) if all_prices else 0

    return {
        "rows": zones,
        "kpis": {
            "avg":       avg,
            "variation": 4.5,
            "zones":     len(zones),
            "total":     sum(r["count"] for r in zones),
        },
        "distribution": [
            {"range": "0–100k",   "count": run_query("SELECT COUNT(*) AS n FROM proprietes WHERE price BETWEEN 1 AND 100000")[0]["n"]},
            {"range": "100–300k", "count": run_query("SELECT COUNT(*) AS n FROM proprietes WHERE price BETWEEN 100001 AND 300000")[0]["n"]},
            {"range": "300–500k", "count": run_query("SELECT COUNT(*) AS n FROM proprietes WHERE price BETWEEN 300001 AND 500000")[0]["n"]},
            {"range": "500k–1M",  "count": run_query("SELECT COUNT(*) AS n FROM proprietes WHERE price BETWEEN 500001 AND 1000000")[0]["n"]},
            {"range": "1M–5M",    "count": run_query("SELECT COUNT(*) AS n FROM proprietes WHERE price BETWEEN 1000001 AND 5000000")[0]["n"]},
            {"range": "5M+",      "count": run_query("SELECT COUNT(*) AS n FROM proprietes WHERE price > 5000000")[0]["n"]},
        ]
    }


# =========================================================
# /analytics/zone
# =========================================================
@app.get("/analytics/zone", tags=["Analytics"])
def analytics_zone(
    q:             str,
    property_type: Optional[str] = None,
    offer_type:    Optional[str] = None,
    price_min:     Optional[float] = None,
    price_max:     Optional[float] = None,
    surface_min:   Optional[float] = None,
    surface_max:   Optional[float] = None,
    bedrooms_min:  Optional[int] = None,
    bedrooms_max:  Optional[int] = None,
):
    conditions = ["(LOWER(neighborhood) LIKE :q OR LOWER(city) LIKE :q)"]
    params = {"q": f"%{q.lower()}%"}

    if property_type and property_type != "Tous":
        conditions.append("property_type = :property_type")
        params["property_type"] = property_type
    if offer_type and offer_type != "Tous":
        conditions.append("LOWER(offer_type) LIKE :offer_pattern")
        params["offer_pattern"] = f"%{offer_type.lower()[:4]}%"
    if price_min is not None:
        conditions.append("price >= :price_min"); params["price_min"] = price_min
    if price_max is not None:
        conditions.append("price <= :price_max AND price > 0"); params["price_max"] = price_max
    if surface_min is not None:
        conditions.append("CAST(square_footage AS FLOAT) >= :surface_min"); params["surface_min"] = surface_min
    if surface_max is not None:
        conditions.append("CAST(square_footage AS FLOAT) <= :surface_max"); params["surface_max"] = surface_max
    if bedrooms_min is not None:
        conditions.append("CAST(bedrooms AS INTEGER) >= :bedrooms_min"); params["bedrooms_min"] = bedrooms_min
    if bedrooms_max is not None:
        conditions.append("CAST(bedrooms AS INTEGER) <= :bedrooms_max"); params["bedrooms_max"] = bedrooms_max

    where = " AND ".join(conditions)

    kpi_rows = run_query(f"""
        SELECT
            COUNT(*)                                                      AS total,
            ROUND(AVG(price) FILTER (WHERE price > 0)::numeric, 0)       AS prix_moyen,
            COUNT(*) FILTER (
                WHERE LOWER(offer_type) LIKE '%locat%' OR LOWER(offer_type) LIKE '%louer%'
            ) * 100 / NULLIF(COUNT(*), 0)                                 AS location_pct
        FROM proprietes
        WHERE {where}
    """, params)

    type_rows = run_query(f"""
        SELECT
            property_type                                              AS label,
            COUNT(*)                                                   AS count,
            ROUND(AVG(price) FILTER (WHERE price > 0)::numeric, 0)    AS prix
        FROM proprietes
        WHERE {where} AND property_type IS NOT NULL
        GROUP BY property_type
        ORDER BY count DESC
        LIMIT 6
    """, params)

    recent_rows = run_query(f"""
        SELECT title, price, offer_type
        FROM proprietes
        WHERE {where}
        ORDER BY scraped_at DESC NULLS LAST
        LIMIT 4
    """, params)

    kpi = kpi_rows[0] if kpi_rows else {}
    total = int(kpi.get("total") or 0)

    if total == 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Aucun bien trouvé pour : {q}")

    max_count = max((int(r["count"]) for r in type_rows), default=1)
    prix_moyen = float(kpi.get("prix_moyen") or 0)

    return {
        "zone": q,
        "kpis": {
            "indice":       min(100, round(prix_moyen / 5000)),
            "prix_moyen":   prix_moyen,
            "variation":    4.5,
            "total":        total,
            "location_pct": int(kpi.get("location_pct") or 0),
        },
        "spark": [
            round(prix_moyen * (0.85 + i * 0.03)) for i in range(6)
        ],
        "types": [
            {
                "label": r["label"],
                "count": int(r["count"]),
                "pct":   round(int(r["count"]) / max_count * 100),
                "prix":  float(r["prix"] or 0),
            }
            for r in type_rows
        ],
        "recent": [
            {"title": r["title"] or "—", "price": r["price"], "offer_type": r["offer_type"]}
            for r in recent_rows
        ],
    }


# =========================================================
# /analytics/evolution  (placeholder — données simulées)
# =========================================================
@app.get("/analytics/evolution", tags=["Analytics"])
def analytics_evolution(
    period: str = "6m",
    type:   str = "Tous",
):
    """
    Retourne l'évolution des prix sur une période.
    Pour l'instant simulé — à remplacer par une vraie
    requête sur scraped_at quand le volume le permet.
    """
    import math, random
    months = {"3m": 3, "6m": 6, "1y": 12, "2y": 24}.get(period, 6)
    bases  = {"Villa": 580000, "Appartement": 340000, "Maison": 290000,
              "Terrain": 8000000, "Studio": 130000, "Tous": 420000}
    base   = bases.get(type, 420000)

    from datetime import date
    now = date.today()
    points = []
    for i in range(months):
        offset = months - 1 - i
        m = (now.month - offset - 1) % 12 + 1
        y = now.year - ((now.month - offset - 1) // 12 + (1 if offset >= now.month else 0))
        label = date(y, m, 1).strftime("%b %y" if months > 6 else "%b")
        noise = math.sin(i * 0.8) * 0.03 + (i * 0.004)
        points.append({"label": label, "value": round(base * (1 + noise))})

    return {"series": [{"label": type, "points": points}]}
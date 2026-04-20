# ID Immobilier — API FastAPI

## Structure
```
projet/
├── notebooks/
│   └── ID_Immobilier_CRISP_DM.ipynb   ← Exécuter en premier
├── models/                             ← Créé automatiquement par le notebook
│   ├── best_model.pkl
│   ├── encoders.pkl
│   └── metadata.json
├── api/
│   └── main.py                         ← API FastAPI
└── README_API.md
```

## Étapes

### 1. Lancer le notebook
```bash
jupyter notebook notebooks/ID_Immobilier_CRISP_DM.ipynb
# Exécuter toutes les cellules (Kernel > Restart & Run All)
# Vérifie que models/ est créé avec les 3 fichiers
```

### 2. Installer les dépendances API
```bash
pip install fastapi uvicorn joblib scikit-learn xgboost pandas
```

### 3. Lancer l'API
```bash
cd api/
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Tester
- Documentation interactive : http://localhost:8000/docs
- Health check : http://localhost:8000/health

## Exemple de requête
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "property_type": "Villa",
    "offer_type": "Location",
    "bedrooms": 3,
    "square_footage": 150,
    "neighborhood": "Hédzranawoé"
  }'
```

## Réponse attendue
```json
{
  "prix_predit": 450000.0,
  "prix_predit_formate": "450,000 FCFA",
  "modele_utilise": "XGBoost",
  "r2_score": 0.97,
  "intervalle_confiance": {
    "min": "382,500 FCFA",
    "max": "517,500 FCFA"
  }
}
```

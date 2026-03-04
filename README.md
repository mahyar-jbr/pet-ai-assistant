# Pet AI Assistant

A full-stack dog food recommendation app that helps owners find the best food for their dog. Create a pet profile and get personalized, scored matches from 84 premium products across Orijen, Acana, and Open Farm.

---

## Features

- **7-Step Guided Wizard** — Step-by-step pet profile creation with tooltips, examples, and common allergy chips
- **Scoring Algorithm** — 5-factor, 100-point scoring system: breed/kibble size, activity+goal, nutritional quality, ingredient quality, price value
- **Hard Filters** — Automatic allergen disqualification and kibble size incompatibility detection
- **Personalized Results** — Match reasons reference your dog by name and connect to their profile
- **Brand & Price Filters** — Filter recommendations by brand (multi-select) and price range
- **Side-by-Side Comparison** — Compare two foods with winner highlighting across all metrics
- **Favorites** — Save top picks with localStorage persistence
- **Allergy Safe Badges** — Visual confirmation that each recommended food passed allergen checks
- **Shop Buttons** — Direct links to buy each product from retailers
- **Responsive Design** — Works across desktop, tablet, and mobile

---

## Tech Stack

### Frontend
- **React 19** + **Vite 7** — Modern UI with fast HMR
- **React Router 7** — Client-side routing
- **Axios** — HTTP client for API calls
- **Custom CSS** — Blue/white palette, animations, skeleton loading

### Backend
- **FastAPI** — Async Python web framework
- **Motor** — Async MongoDB driver
- **Pydantic** — Request/response validation with field validators
- **Python logging** — Structured logging with request middleware

### Database
- **MongoDB** — `petai` database with `pets` and `products` collections
- Indexed on `life_stage`, `breed_size`, `format`, `brand`

### Data
- **84 products** across 3 premium brands (Orijen, Acana, Open Farm)
- Complete nutritional data: protein%, fat%, fiber%, omega-3/6, DHA, EPA
- Canadian pricing, official brand images

---

## Quick Start

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Import product data
python3 -c "
from import_products import import_to_mongodb
import csv
with open('product_data.csv') as f:
    rows = list(csv.DictReader(f))
import_to_mongodb(rows)
"

# Start server
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Use

1. Open `http://localhost:5173`
2. Walk through the 7-step wizard to create your dog's profile
3. Get personalized food recommendations
4. Filter by brand/price, compare foods side-by-side, save favorites

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (DB status + version) |
| POST | `/api/pets` | Create pet profile |
| GET | `/api/pets/{id}` | Get pet by ID |
| PUT | `/api/pets/{id}` | Update pet profile |
| DELETE | `/api/pets/{id}` | Delete pet |
| GET | `/api/products` | List products (filters: brand, life_stage, breed_size) |
| GET | `/api/recommendations/{pet_id}` | Get scored recommendations |

---

## Scoring Algorithm

100-point max, 5 weighted factors:

| Factor | Points | What It Measures |
|--------|--------|------------------|
| Breed/Kibble Size | 0-20 | Kibble size compatibility with dog's breed size |
| Activity + Goal | 0-40 | Protein/fat alignment with activity level and dietary goal |
| Nutritional Quality | 0-25 | Omega-3, DHA, grain-free bonus, fat balance |
| Ingredient Quality | 0-10 | Fresh/raw/whole meat in first 5 ingredients, protein diversity |
| Price Value | 0-5 | Percentile-based: cheaper relative to pool scores higher |

**Hard filters** eliminate products instantly:
- Contains any of the pet's allergens (exact match via set intersection)
- Kibble size incompatible with breed size

Only products scoring 50+ are returned, sorted by score descending.

---

## Project Structure

```
backend/
├── main.py                 # App, models, routes, scoring engine
├── import_products.py      # CSV → MongoDB import (upsert)
├── product_data.csv        # 84 products (source of truth)
├── .env.example            # Environment variable template
├── scrapers/               # Web scrapers (Orijen, PetValu)
└── utils/
    └── data_normalizer.py  # ProductNormalizer + ProductValidator

frontend/
├── src/
│   ├── pages/
│   │   ├── PetForm.jsx          # 7-step wizard form
│   │   └── Recommendations.jsx  # Results with filters, sort, comparison
│   ├── components/
│   │   ├── FoodCard.jsx         # Product card with score, reasons, shop button
│   │   ├── ComparisonTool.jsx   # Side-by-side comparison modal
│   │   └── AllergyPills.jsx     # Tag input for allergies
│   ├── api/petApi.js            # API client
│   └── utils/foodUtils.js       # Helpers
├── .env.production              # API URL for deployment
└── index.html                   # Meta tags, favicon, OG tags
```

---

## Environment Variables

### Backend (`backend/.env`)
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=petai
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (`frontend/.env.production`)
```
VITE_API_URL=https://your-api.up.railway.app
```

---

## License

All rights reserved © 2025 Mahyar JBR. Please do not copy, reuse, or distribute this code without permission.

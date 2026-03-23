# BowlWise

A full-stack dog food recommendation and tracking app. Create your dog's profile, get personalized scored recommendations from 150 products across 6 premium brands, then track your purchases, monitor bag depletion, and know exactly when to reorder.

**Live:** [bowlwise.app](https://bowlwise.app)

---

## Features

### Recommendation Engine
- **7-Step Guided Wizard** — Step-by-step pet profile creation with trust signals, visual cards, and common allergy chips
- **Scoring Algorithm** — 6-factor, 100-point scoring system validated against veterinary science (AAFCO, NRC, WSAVA)
  - Activity+goal (40pts), nutritional quality (25pts), life-stage nutrition (15pts), ingredient quality (10pts), breed/kibble size (5pts), price value (5pts)
- **Hard Filters** — Automatic allergen disqualification (set intersection) and kibble size incompatibility detection
- **Life-Stage Nutrition** — Puppy Ca:P ratio + DHA scoring, senior fiber + omega-3 scoring, adult formulation matching
- **Personalized Results** — Match reasons reference your dog by name and connect to their profile
- **Dynamic Product Pool** — Backend sends 40 scored products; frontend shows top 20 by default, filters reveal more
- **Popover Filters** — Filter by brand, protein source, grain-free, favorites, and price using popover dropdowns with counts
- **Favorites** — Heart foods to save them, filter by favorites across sessions (localStorage)
- **Product Detail Overlay** — DoorDash-style slide-up with 3 content zones (nutrition, ingredients, feeding calculator)
- **Feeding Calculator** — Personalized daily cups, cost/day, cost/month, and bag duration based on weight and activity
- **Side-by-Side Comparison** — Compare two foods with winner highlighting across all metrics
- **Allergy Safe Badges** — Visual confirmation that each recommended food passed allergen checks
- **Shop Buttons** — Direct links to buy from PetValu.ca

### User Accounts & Dashboard
- **Magic Link Auth** — Passwordless email login via Resend (no passwords to manage)
- **JWT Authentication** — 30-day tokens, Bearer header, protected routes
- **Pet Dashboard** — Profile card, active food with depletion tracking, purchase history, spending summary
- **Purchase Tracking** — "I Bought This" button, 2-step log modal, auto-depletion calculation
- **Depletion Countdown** — Color-coded progress bar (blue > amber > red), days remaining, estimated empty date
- **Personalized Greeting** — Time-of-day greeting with urgency prompts when food is running low
- **Reorder Links** — Direct retailer links when bag is running low
- **Edit & Delete Purchases** — Modify active purchase, delete from history with confirmation
- **Extend Bag** — "I Still Have Some" button adds 7 days when bag shows empty
- **Save Results Banner** — Inline card in food grid prompting anonymous users to create accounts
- **Account Management** — Email display, logout, delete account with confirmation
- **Unified Header** — Same nav on recommendations and dashboard when logged in
- **Page Transitions** — Smooth fade+slide animation between pages
- **Guest Mode Preserved** — Full functionality without login; accounts are opt-in

### Infrastructure
- **Error Boundary** — Catches React render errors, shows recovery UI
- **Vercel Analytics** — Anonymous usage tracking
- **Privacy Policy & Terms** — Legal pages at /privacy and /terms
- **SEO** — robots.txt, sitemap.xml, OG meta tags
- **CSP** — Content Security Policy meta tag
- **Responsive Design** — Mobile bottom sheets, responsive grids, touch-friendly targets

---

## Tech Stack

### Frontend
- **React 19** + **Vite 7** — Modern UI with fast HMR
- **React Router 7** — Client-side routing with protected routes
- **Axios** — HTTP client for API calls
- **jwt-decode** — JWT expiry checking on client side
- **@vercel/analytics** — Usage analytics
- **Custom CSS** — Blue/white design system, animations, skeleton loading, page transitions

### Backend
- **FastAPI** — Async Python web framework
- **Motor** — Async MongoDB driver
- **Pydantic** — Request/response validation with field validators
- **python-dotenv** — Environment variable management
- **Resend** — Magic link email delivery
- **PyJWT** — JWT token generation and validation
- **slowapi** — Rate limiting

### Database
- **MongoDB** — `petai` database with `pets`, `products`, `users`, and `purchases` collections
- Indexed on `life_stage`, `breed_size`, `format`, `brand`, `email` (unique), `magic_link_token`

### Data
- **150 products** across 6 brands (Orijen, Acana, Open Farm, Performatrin Ultra, Go! Solutions, Now Fresh)
- Complete nutritional data: protein%, fat%, fiber%, omega-3/6, DHA, EPA, Ca, P
- Canadian pricing (CAD), official brand images, all sourced from PetValu.ca

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
4. Filter by brand/price, compare foods side-by-side
5. Create an account to save results, track purchases, and monitor bag depletion

---

## Routes

| Path | Page | Auth | Description |
|------|------|------|-------------|
| `/` | PetForm | No (redirects to /dashboard if logged in) | 7-step pet profile wizard |
| `/recommendations` | Recommendations | No | Scored food results with filters |
| `/login` | LoginPage | No | Magic link email entry |
| `/auth/verify/:token` | MagicLinkVerify | No | Processes magic link from email |
| `/dashboard` | Dashboard | Yes | Pet profile, active food, purchases |
| `/dashboard/add-pet` | PetForm | Yes | Add pet to account |
| `/account` | AccountPage | Yes | Settings, logout, delete |
| `/privacy` | PrivacyPage | No | Privacy policy |
| `/terms` | TermsPage | No | Terms of service |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Root — confirms API is running |
| GET | `/health` | No | Health check (DB status + version) |
| POST | `/api/pets` | No | Create pet profile |
| GET | `/api/pets/{id}` | Session | Get pet by ID |
| PUT | `/api/pets/{id}` | Session | Update pet profile |
| DELETE | `/api/pets/{id}` | Session | Delete pet |
| POST | `/api/pets/{id}/claim` | JWT | Claim anonymous pet to account |
| POST | `/api/auth/magic-link` | No | Send magic link email |
| GET | `/api/auth/verify/{token}` | No | Verify magic link, return JWT |
| GET | `/api/auth/me` | JWT | Get current user + pets |
| DELETE | `/api/auth/me` | JWT | Delete account + pets + purchases |
| POST | `/api/purchases` | JWT | Log a purchase |
| GET | `/api/purchases` | JWT | Get purchases for a pet |
| PUT | `/api/purchases/{id}` | JWT | Update purchase (bag size, cups/day) |
| PATCH | `/api/purchases/{id}/extend` | JWT | Extend active purchase by 7 days |
| DELETE | `/api/purchases/{id}` | JWT | Delete purchase |
| GET | `/api/products` | No | List products (filters: brand, life_stage, breed_size) |
| GET | `/api/products/{id}` | No | Get single product by ID |
| GET | `/api/recommendations/{pet_id}` | No | Get scored recommendations (top 40, score >= 50) |

---

## Scoring Algorithm

100-point max, 6 weighted factors. Validated against veterinary nutrition science (AAFCO, NRC, WSAVA, Tufts).

| Factor | Points | What It Measures |
|--------|--------|------------------|
| Activity + Goal | 0-40 | Protein/fat/fiber alignment with activity level and dietary goal |
| Nutritional Quality | 0-25 | Omega-3, DHA, caloric density (3500-4200 kcal/kg optimal), fat balance |
| Life Stage Nutrition | 0-15 | Puppy: Ca:P ratio + DHA for growth. Senior: fiber + omega-3. Adult: formulation match |
| Ingredient Quality | 0-10 | Fresh/raw/whole meat in first 5 ingredients, protein diversity |
| Breed/Kibble Size | 0-5 | Kibble size compatibility with dog's breed size |
| Price Value | 0-5 | Percentile-based: cheaper relative to pool scores higher |

**Key decisions:**
- No grain-free bonus (FDA/DCM investigation)
- Protein thresholds calibrated for companion dogs, not working/sled dogs
- "Meal" and "by-product" not penalized (AAFCO-approved, vet-recommended)

**Hard filters** eliminate products instantly:
- Contains any of the pet's allergens (exact match via set intersection)
- Kibble size incompatible with breed size

Only products scoring 50+ are returned, sorted by score descending. Backend sends up to 40; frontend shows top 20 by default, with filters revealing more from the pool.

---

## Project Structure

```
backend/
├── main.py                 # App, models, routes, scoring engine, auth
├── import_products.py      # CSV → MongoDB import (upsert)
├── product_data.csv        # 150 products (source of truth)
├── .env.example            # Environment variable template
├── scrapers/               # Web scrapers (Orijen, PetValu)
└── utils/
    └── data_normalizer.py  # ProductNormalizer + ProductValidator

frontend/
├── src/
│   ├── App.jsx                     # Router with auth redirect + error boundary
│   ├── main.jsx                    # React mount + Vercel Analytics
│   ├── pages/
│   │   ├── PetForm.jsx             # 7-step wizard form
│   │   ├── Recommendations.jsx     # Results with filters, sort, comparison
│   │   ├── LoginPage.jsx           # Magic link email entry (3-state)
│   │   ├── MagicLinkVerify.jsx     # Token verification + redirect
│   │   ├── Dashboard.jsx           # Pet profile, active food, purchases
│   │   ├── AccountPage.jsx         # Settings, logout, delete account
│   │   ├── PrivacyPage.jsx         # Privacy policy
│   │   └── TermsPage.jsx          # Terms of service
│   ├── components/
│   │   ├── FoodCard.jsx            # Product card: 7-element surface
│   │   ├── ProductDetail.jsx       # Full-page detail overlay (DoorDash-style)
│   │   ├── ScoreRing.jsx           # SVG circular score gauge (animated)
│   │   ├── FilterBar.jsx           # Popover filter buttons with counts
│   │   ├── ComparisonTool.jsx      # Side-by-side comparison modal
│   │   ├── LogPurchaseModal.jsx    # 2-step purchase logging / editing
│   │   ├── SaveResultsBanner.jsx   # Inline signup prompt in food grid
│   │   ├── ProtectedRoute.jsx      # Auth guard for protected routes
│   │   └── ErrorBoundary.jsx       # React error boundary
│   ├── api/
│   │   └── petApi.js               # Axios client, all API calls, auth headers
│   ├── utils/
│   │   ├── auth.js                 # JWT token management (get/set/clear/check)
│   │   ├── foodUtils.js            # Tag parsing, formatting, comparison logic
│   │   └── feedingCalculator.js    # RER/MER formula, cups/day, cost, bag duration
│   └── styles/
│       ├── form.css                # Form page + CSS variables
│       ├── recommendation.css      # Results page, food cards, filters
│       ├── detail-overlay.css      # Product detail overlay zones
│       ├── dashboard.css           # Dashboard + purchase modal
│       └── login.css               # Login, account, legal pages
├── public/
│   ├── logo.png                    # App logo
│   ├── brands/                     # Brand logos (orijen, acana, open-farm, performatrin-ultra, go-solutions, now-fresh)
│   ├── robots.txt                  # SEO crawl rules
│   └── sitemap.xml                 # SEO sitemap
├── .env.production                 # API URL for deployment
├── vercel.json                     # SPA rewrites for Vercel
└── index.html                      # Meta tags, CSP, OG tags
```

---

## Environment Variables

### Backend (`backend/.env`)
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=petai
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
ENV=development
JWT_SECRET=your-secret-key          # REQUIRED in production — app crashes on startup if missing
RESEND_API_KEY=re_xxxxxxxxxxxx      # Resend API key for magic link emails
MAGIC_LINK_BASE_URL=http://localhost:5173  # Frontend URL used in magic link emails
SHEETS_CSV_URL=                            # Google Sheets CSV URL for product import (optional)
```
> **Production note:** `ENV=production` disables `/docs`, `/redoc`, and `/openapi.json`. The app will refuse to start if `ENV=production` and `JWT_SECRET` is not set.

### Frontend (`frontend/.env.production`)
```
VITE_API_URL=https://pet-ai-assistant-production.up.railway.app
```

---

## Security

### Authentication
- **Magic link auth** — passwordless email login via Resend (no passwords stored)
- **JWT tokens** — HS256, 30-day expiry, Bearer header on all protected endpoints
- **Production crash guard** — app refuses to start if `ENV=production` and `JWT_SECRET` is not set
- **Magic link tokens hashed** — SHA-256 hashed before storage in MongoDB (plaintext never persisted)
- **Session tokens** — UUID per pet for anonymous pet CRUD operations (`X-Session-Token` header)
- **Pet claiming** — anonymous pets linked to user accounts via session token during magic link verification

### API Security
- **Rate limiting** — slowapi: POST pets 5/min, PUT/DELETE 5/min, recommendations 20/min, magic link 3/min, global 60/min
- **CORS** — `ALLOWED_ORIGINS` env var, `allow_credentials=False`, explicit methods/headers
- **Security headers** — HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, X-XSS-Protection, Referrer-Policy
- **Input validation** — Pydantic models with field validators, enum enforcement, length limits
- **Brand filter sanitized** — `re.escape()` prevents regex injection
- **Owner-only authorization** — all purchase/pet endpoints verify the authenticated user owns the resource
- **Safe error handling** — stack traces logged server-side only, generic message returned to client

### Frontend Security
- **CSP meta tag** — restricts `script-src`, `style-src`, `connect-src`, `img-src`, `font-src`
- **Source maps disabled** — `sourcemap: false` in production builds
- **No `dangerouslySetInnerHTML`** — zero XSS vectors in React components
- **Error boundary** — catches render crashes, shows recovery UI

### Data Protection
- **IP addresses hashed** — SHA-256 truncated hash stored, not raw IPs
- **Log scrubbing** — emails truncated, tokens show last 4 chars only in logs
- **API docs disabled** — `/docs`, `/redoc`, `/openapi.json` all return 404 in production
- **Allergen defense-in-depth** — allergen_tags check + full ingredients text scan
- **Privacy Policy** at `/privacy` — covers data collected, third parties (Resend, Vercel, Atlas), deletion rights
- **Terms of Service** at `/terms` — includes "not veterinary advice" disclaimer

---

## Deployment

- **Frontend:** Vercel (automatic HTTPS + CDN)
- **Backend:** Railway (FastAPI + uvicorn)
- **Database:** MongoDB Atlas (free tier M0)

---

## License

All rights reserved © 2026 Mahyar JBR. Please do not copy, reuse, or distribute this code without permission.

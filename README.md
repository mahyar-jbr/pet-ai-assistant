# 🐾 Pet AI Assistant

**Pet AI Assistant** is a modern full-stack web application that helps dog owners build rich pet profiles and discover tailored food recommendations. Built with **React + Vite** frontend and **Python FastAPI** backend, connected to **MongoDB** for data persistence.

---

## ✨ Features

- 🐶 **Interactive Pet Profile Form** - Age group, breed size, activity level, dietary goals, and dynamic allergy pills
- 🧠 **Intelligent Recommendation Engine** - Advanced scoring algorithm with hard filters (allergies, kibble size, life stage)
- 💾 **Automatic State Management** - React hooks with localStorage fallback and automatic cleanup
- 📊 **Rich Food Cards** - Nutrition indicators, ingredient lists, and compatibility badges
- 🎨 **Modern UI** - Beautiful gradient designs with smooth animations
- ⚡ **Fast & Responsive** - Vite HMR for instant development feedback
- 🔄 **RESTful API** - Clean Python FastAPI backend with MongoDB integration

---

## 🗂️ Project Structure

```
Pet-AI-Assistant/
├── frontend/                 ← React + Vite application
│   ├── src/
│   │   ├── api/
│   │   │   └── petApi.js     ← API service layer (axios)
│   │   ├── components/
│   │   │   ├── AllergyPills.jsx    ← Reusable allergy component
│   │   │   └── FoodCard.jsx        ← Product card component
│   │   ├── pages/
│   │   │   ├── PetForm.jsx         ← Form page
│   │   │   └── Recommendations.jsx ← Recommendations page
│   │   ├── styles/
│   │   │   ├── form.css            ← Form styles
│   │   │   └── recommendation.css  ← Recommendation styles
│   │   ├── App.jsx           ← Main app with React Router
│   │   ├── App.css           ← Global app styles
│   │   └── main.jsx          ← Entry point
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  ← Python FastAPI backend
│   ├── scrapers/
│   │   ├── orijen_scraper.py      ← Orijen brand scraper
│   │   ├── petvalu_scraper.py     ← PetValu retailer scraper
│   │   └── scraper_pipeline.py    ← Scraping pipeline
│   ├── utils/
│   │   └── data_normalizer.py     ← Data normalization utilities
│   ├── data/                      ← Scraped product data (gitignored)
│   ├── main.py                    ← FastAPI app with endpoints
│   ├── import_products.py         ← Product import script
│   ├── test_scraper.py            ← Scraper testing utilities
│   ├── requirements.txt           ← Python dependencies
│   ├── .env.example               ← Environment variables template
│   └── .gitignore                 ← Backend-specific gitignore
│
├── archive/                  ← Old frontend (vanilla JS) & Java backend (gitignored)
└── README.md                 ← This file
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+) and npm
- **Python** (3.9+)
- **MongoDB** (local or Atlas)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example and fill in your MongoDB URL)
cp .env.example .env

# Import sample products
python import_products.py

# Start backend server (runs on http://localhost:8000)
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev
```

### 3. Open in Browser

1. Navigate to `http://localhost:5173/`
2. Create a pet profile with name, age, size, activity level, and dietary goals
3. Add allergies by typing and pressing Enter
4. Click "Show Food Recommendation" to see personalized results!

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **Vite** - Lightning-fast build tool with HMR
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API calls
- **CSS3** - Custom styles with gradients and animations

### Backend
- **Python 3.11** - Modern Python runtime
- **FastAPI** - High-performance async web framework
- **Motor** - Async MongoDB driver
- **Pydantic** - Data validation
- **python-dotenv** - Environment variable management
- **BeautifulSoup4 + lxml** - Web scraping for product data
- **Requests** - HTTP library for scraper

### Database
- **MongoDB** - NoSQL database (`petai`) for products and pet profiles

---

## 📡 API Endpoints

### Pets
- `POST /api/pets` - Create a new pet profile
- `GET /api/pets/{pet_id}` - Get pet by ID

### Recommendations
- `GET /api/recommendations/{pet_id}` - Get personalized food recommendations
  - Returns top 15 products scored above 50 points
  - Applies hard filters (allergies, kibble size, life stage)
  - Sorted by compatibility score

### Products
- `GET /api/products` - List all products (admin)
- `GET /api/products/{product_id}` - Get product by ID

---

## 🧠 Roadmap

### Phase 1: Frontend Modernization ✅ **COMPLETE**
- [x] Set up React + Vite project
- [x] Create reusable components (AllergyPills, FoodCard)
- [x] Migrate form and recommendations pages
- [x] Set up React Router and API layer
- [x] Maintain beautiful CSS styling

### Phase 2: Web Scraping ⚡ **IN PROGRESS**
- [x] Build Orijen brand scraper with BeautifulSoup4
- [x] Extract product data (ingredients, nutrition analysis, images, URLs)
- [x] Implement data normalization and validation
- [x] Fix scraper bugs (image extraction, calorie calculation, life stage detection)
- [x] Successfully scraped 11 Orijen products
- [ ] Add prices and bag sizes manually for Orijen products
- [ ] Build scrapers for other brands (Royal Canin, Hill's, Purina)
- [ ] Automate weekly scraping
- [ ] Expand database from 11 to 100+ products

### Phase 3: UX & Testing
- [ ] End-to-end testing with multiple pet profiles
- [ ] Validate recommendation algorithm
- [ ] Performance optimization (caching, lazy loading)
- [ ] Error handling and edge cases
- [ ] User testing with real pet owners

### Phase 4: AI Integration
- [ ] Chatbot for nutrition advice (LLM integration)
- [ ] Natural language product search
- [ ] Breed identification from photos (computer vision)
- [ ] Personalized feeding schedules
- [ ] Health predictions based on diet

### Phase 5: Production Deployment
- [ ] Cloud hosting (AWS/DigitalOcean)
- [ ] MongoDB Atlas (cloud database)
- [ ] User authentication
- [ ] SEO optimization
- [ ] Domain and SSL

---

## 🧪 Development

### Frontend Development
```bash
cd frontend
npm run dev     # Start dev server
npm run build   # Build for production
npm run preview # Preview production build
```

### Backend Development
```bash
cd backend
uvicorn main:app --reload --port 8000  # Start with auto-reload
python import_products.py              # Import sample data
python test_scraper.py                 # Test scraper functionality
```

### Web Scraping
```bash
cd backend
# Run Orijen scraper
python -c "from scrapers.orijen_scraper import OrijenScraper; scraper = OrijenScraper(); scraper.scrape_all_products()"
```

### Database Management
```bash
# Connect to MongoDB
mongosh

# Use database
use petai

# Query products
db.products.find()

# Query pets
db.pets.find()
```

---

## 📜 License

This project is not open source. All rights reserved © 2025 Mahyar JBR. Please do not copy, reuse, or distribute this code without permission.

# 🐾 Pet AI Assistant

**Pet AI Assistant** is a modern full-stack web application that helps dog owners build personalized pet profiles and discover tailored food recommendations.  
It’s built with a **React + Vite** frontend and a **FastAPI + MongoDB** backend, powered by custom **web scrapers** that collect real product data from multiple sources.

---

## ✨ Features

- 🐶 **Interactive Pet Profile Form** – Age group, breed size, activity level, dietary goals, and dynamic allergy pills  
- 🧠 **Intelligent Recommendation Engine** – Advanced scoring algorithm with hard filters (allergies, kibble size, life stage)  
- 💾 **Automatic State Management** – React hooks with localStorage fallback and automatic cleanup 
- 📊 **Rich Food Cards** – Nutrition indicators, ingredient lists, and compatibility badges  
- 🎨 **Modern UI** – Beautiful gradient designs with smooth animations  
- ⚡ **Fast & Responsive** – Vite HMR for instant development feedback  
- 🔄 **RESTful API** – Clean Python FastAPI backend with MongoDB integration  

---

## 🗂️ Project Structure

```
Pet-AI-Assistant/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── petApi.js             # Axios API configuration for backend calls
│   │   │
│   │   ├── components/               # Reusable UI components
│   │   │   ├── AllergyPills.jsx      # Allergy tag input and removal component
│   │   │   ├── ComparisonTool.jsx    # (New) Compare food items visually or by data
│   │   │   └── FoodCard.jsx          # Displays product details, nutrition info, and icons
│   │   │
│   │   ├── pages/
│   │   │   ├── PetForm.jsx           # Pet profile creation form
│   │   │   └── Recommendations.jsx   # Displays filtered and sorted food recommendations
│   │   │
│   │   ├── styles/
│   │   │   ├── form.css              # Styling for PetForm (inputs, layout, themes)
│   │   │   └── recommendation.css    # Styling for Recommendations page (cards, grids)
│   │   │
│   │   ├── utils/
│   │   │   └── foodUtils.js          # Helper functions for filtering and matching products
│   │   │
│   │   ├── App.jsx                   # Root component (sets up routes and page structure)
│   │   ├── App.css                   # Global UI styling (buttons, layout)
│   │   ├── index.css                 # General global styling (fonts, resets)
│   │   ├── main.jsx                  # React entry point (mounts App)
│   │   │
│   │   └── (React standard files)
│   │
│   ├── index.html                    # Root HTML template used by Vite
│   ├── package.json                  # Frontend dependencies and scripts
│   ├── package-lock.json             # Exact dependency lock file
│   ├── vite.config.js                # Vite build and dev configuration
│   ├── eslint.config.js              # ESLint config for React linting
│   └── .gitignore                    # Node/Vite ignores (node_modules, dist, etc.)
│
├── backend/
│   │
│   ├── scrapers/                 # Web scraping scripts
│   │   ├── __init__.py           # Makes 'scrapers' a Python package
│   │   ├── orijen_scraper.py     # Scraper for Orijen dog food brand
│   │   ├── petvalu_scraper.py    # Scraper for PetValu store products
│   │   └── scraper_pipeline.py   # Orchestrates and manages multiple scrapers
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   └── data_normalizer.py    # Cleans and formats scraped data (standardizes names, numbers)
│   │
│   ├── data/                     # Holds scraped product data (gitignored)
│   │
│   ├── main.py                   # FastAPI main server entry point, defines routes
│   ├── import_products.py        # Imports scraped data into MongoDB
│   ├── test_scraper.py           # Testing file for verifying scraper output
│   │
│   ├── requirements.txt          # Python dependencies (FastAPI, Motor, BeautifulSoup, etc.)
│   ├── .env.example              # Example environment file with MongoDB connection template
│   └── .gitignore                # Backend-specific ignores (venv, data files, etc.)
│
│
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

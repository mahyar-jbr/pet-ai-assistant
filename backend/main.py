"""
Pet AI Assistant - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId
import os

# ============================================
# FastAPI Application Setup
# ============================================

app = FastAPI(
    title="Pet AI Assistant API",
    description="Backend API for pet food recommendations",
    version="2.0.0"
)

# ============================================
# CORS Configuration
# ============================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Same as your Spring Boot @CrossOrigin(origins = "*")
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# MongoDB Connection
# ============================================

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "petai"

client = AsyncIOMotorClient(MONGODB_URL)
database = client[DATABASE_NAME]
pets_collection = database["pets"]
products_collection = database["products"]

# ============================================
# Pydantic Models (Request/Response Schemas)
# ============================================

class PetCreate(BaseModel):
    """Request model for creating a pet (matches your frontend data)"""
    name: str
    breedSize: str  # Frontend sends breedSize, not breed
    ageGroup: str
    activityLevel: str
    weightGoal: str
    allergies: Optional[List[str]] = []

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Buddy",
                "breedSize": "medium",
                "ageGroup": "adult",
                "activityLevel": "high",
                "weightGoal": "muscle-gain",
                "allergies": ["chicken", "wheat"]
            }
        }


class PetResponse(BaseModel):
    """Response model with MongoDB ID"""
    id: str
    name: str
    breedSize: str
    ageGroup: str
    activityLevel: str
    weightGoal: str
    allergies: List[str]
    breed: Optional[str] = Field(
        default=None,
        description="Deprecated legacy field - prefer breedSize"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "name": "Buddy",
                "breedSize": "medium",
                "breed": "medium",
                "ageGroup": "adult",
                "activityLevel": "high",
                "weightGoal": "muscle-gain",
                "allergies": ["chicken", "wheat"]
            }
        }


class ProductCreate(BaseModel):
    """Request model for creating a product"""
    id: str  # Unique product ID (e.g., "Orijen-Large-Breed-Adult")
    brand: str
    line: str
    format: str  # dry, wet, raw, etc.
    life_stage: str  # puppy, adult, senior, all
    breed_size: str  # small, medium, large, all
    primary_proteins: str  # Comma-separated protein sources
    grain_free: bool
    ingredients: str  # Full ingredient list
    allergen_tags: str  # Comma-separated allergens

    # Nutritional information (percentages)
    protein_pct: Optional[float] = None
    fat_pct: Optional[float] = None
    ash_pct: Optional[float] = None
    fiber_pct: Optional[float] = None
    moisture_pct: Optional[float] = None
    calcium_pct: Optional[float] = None
    phosphorus_pct: Optional[float] = None
    omega_6_fatty_acids: Optional[float] = None
    omega_3_fatty_acids: Optional[float] = None
    DHA: Optional[float] = None
    EPA: Optional[float] = None

    # Calories
    kcal_per_cup: Optional[int] = None
    kcal_per_kg: Optional[int] = None

    # Additional info
    kibble_size: Optional[str] = None
    tags: str  # Comma-separated tags
    size_kg: Optional[float] = None
    price: Optional[float] = None
    price_per_kg: Optional[float] = None
    retailer: Optional[str] = None
    image: Optional[str] = None
    source_url: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "Orijen-Large-Breed-Adult",
                "brand": "Orijen",
                "line": "Large Breed Adult Recipe",
                "format": "dry",
                "life_stage": "adult",
                "breed_size": "Large",
                "primary_proteins": "Chicken, Turkey, Salmon, Herring",
                "grain_free": True,
                "ingredients": "fresh chicken, fresh turkey...",
                "allergen_tags": "chicken, turkey, fish, eggs",
                "protein_pct": 38.0,
                "fat_pct": 15.0,
                "tags": "high-protein, adult, large, dry",
                "price": 122.99,
                "image": "https://example.com/image.png"
            }
        }


class ProductResponse(BaseModel):
    """Response model for products"""
    id: str
    brand: str
    line: str
    format: str
    life_stage: str
    breed_size: str
    primary_proteins: str
    grain_free: bool
    ingredients: str
    allergen_tags: str
    protein_pct: Optional[float] = None
    fat_pct: Optional[float] = None
    ash_pct: Optional[float] = None
    fiber_pct: Optional[float] = None
    moisture_pct: Optional[float] = None
    calcium_pct: Optional[float] = None
    phosphorus_pct: Optional[float] = None
    omega_6_fatty_acids: Optional[float] = None
    omega_3_fatty_acids: Optional[float] = None
    DHA: Optional[float] = None
    EPA: Optional[float] = None
    kcal_per_cup: Optional[int] = None
    kcal_per_kg: Optional[int] = None
    kibble_size: Optional[str] = None
    tags: str
    size_kg: Optional[float] = None
    price: Optional[float] = None
    price_per_kg: Optional[float] = None
    retailer: Optional[str] = None
    image: Optional[str] = None
    source_url: Optional[str] = None
    updated_at: Optional[str] = None


# ============================================
# Helper Functions
# ============================================

def pet_helper(pet) -> dict:
    """Convert MongoDB document to dictionary"""
    breed_size = pet.get("breedSize", pet.get("breed", ""))

    pet_data = {
        "id": str(pet["_id"]),
        "name": pet.get("name", ""),
        "breedSize": breed_size,
        "ageGroup": pet.get("ageGroup", ""),
        "activityLevel": pet.get("activityLevel", ""),
        "weightGoal": pet.get("weightGoal", ""),
        "allergies": pet.get("allergies", [])
    }

    # Include legacy field for backward compatibility
    if pet.get("breed") or breed_size:
        pet_data["breed"] = pet.get("breed", breed_size)

    return pet_data


# ============================================
# API Endpoints
# ============================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "Pet AI Assistant API is up and running!",
        "version": "2.0.0"
    }


@app.post("/api/pets", response_model=PetResponse, status_code=201)
async def create_pet(pet: PetCreate):
    """
    Create a new pet profile

    Equivalent to Spring Boot's:
    @PostMapping("/api/pets")
    public Pet savePet(@RequestBody Pet pet)
    """
    try:
        # Convert Pydantic model to dict for MongoDB
        pet_dict = pet.model_dump()

        # Insert into MongoDB
        result = await pets_collection.insert_one(pet_dict)

        # Retrieve the created pet with its ID
        created_pet = await pets_collection.find_one({"_id": result.inserted_id})

        if created_pet:
            return pet_helper(created_pet)
        else:
            raise HTTPException(status_code=500, detail="Failed to create pet")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating pet: {str(e)}")


@app.get("/api/pets", response_model=List[PetResponse])
async def get_all_pets():
    """
    Retrieve all pet profiles

    Equivalent to Spring Boot's:
    @GetMapping("/api/pets")
    public List<Pet> getAllPets()
    """
    try:
        pets = []
        async for pet in pets_collection.find():
            pets.append(pet_helper(pet))
        return pets

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving pets: {str(e)}")


@app.get("/api/pets/{pet_id}", response_model=PetResponse)
async def get_pet_by_id(pet_id: str):
    """
    Retrieve a specific pet by ID (bonus endpoint not in Java version)
    """
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(pet_id):
            raise HTTPException(status_code=400, detail="Invalid pet ID format")

        pet = await pets_collection.find_one({"_id": ObjectId(pet_id)})

        if pet:
            return pet_helper(pet)
        else:
            raise HTTPException(status_code=404, detail="Pet not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving pet: {str(e)}")


@app.put("/api/pets/{pet_id}", response_model=PetResponse)
async def update_pet(pet_id: str, pet: PetCreate):
    """
    Update an existing pet profile (bonus endpoint not in Java version)
    """
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(pet_id):
            raise HTTPException(status_code=400, detail="Invalid pet ID format")

        # Update the pet
        pet_dict = pet.model_dump()
        result = await pets_collection.update_one(
            {"_id": ObjectId(pet_id)},
            {"$set": pet_dict}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Pet not found")

        # Retrieve the updated pet
        updated_pet = await pets_collection.find_one({"_id": ObjectId(pet_id)})

        if updated_pet:
            return pet_helper(updated_pet)
        else:
            raise HTTPException(status_code=404, detail="Pet not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating pet: {str(e)}")


@app.delete("/api/pets/{pet_id}")
async def delete_pet(pet_id: str):
    """
    Delete a pet profile (bonus endpoint not in Java version)
    """
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(pet_id):
            raise HTTPException(status_code=400, detail="Invalid pet ID format")

        result = await pets_collection.delete_one({"_id": ObjectId(pet_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Pet not found")

        return {"message": "Pet deleted successfully", "id": pet_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting pet: {str(e)}")


# ============================================
# Product API Endpoints
# ============================================

def product_helper(product) -> dict:
    """Convert MongoDB product document to dictionary"""
    return {
        "id": str(product.get("_id", "")),
        "brand": product.get("brand", ""),
        "line": product.get("line", ""),
        "format": product.get("format", ""),
        "life_stage": product.get("life_stage", ""),
        "breed_size": product.get("breed_size", ""),
        "primary_proteins": product.get("primary_proteins", ""),
        "grain_free": product.get("grain_free", False),
        "ingredients": product.get("ingredients", ""),
        "allergen_tags": product.get("allergen_tags", ""),
        "protein_pct": product.get("protein_pct"),
        "fat_pct": product.get("fat_pct"),
        "ash_pct": product.get("ash_pct"),
        "fiber_pct": product.get("fiber_pct"),
        "moisture_pct": product.get("moisture_pct"),
        "calcium_pct": product.get("calcium_pct"),
        "phosphorus_pct": product.get("phosphorus_pct"),
        "omega_6_fatty_acids": product.get("omega_6_fatty_acids"),
        "omega_3_fatty_acids": product.get("omega_3_fatty_acids"),
        "DHA": product.get("DHA"),
        "EPA": product.get("EPA"),
        "kcal_per_cup": product.get("kcal_per_cup"),
        "kcal_per_kg": product.get("kcal_per_kg"),
        "kibble_size": product.get("kibble_size", ""),
        "tags": product.get("tags", ""),
        "size_kg": product.get("size_kg"),
        "price": product.get("price"),
        "price_per_kg": product.get("price_per_kg"),
        "retailer": product.get("retailer", ""),
        "image": product.get("image", ""),
        "source_url": product.get("source_url", ""),
        "updated_at": product.get("updated_at", "")
    }


@app.get("/api/products", response_model=List[ProductResponse])
async def get_all_products(
    life_stage: Optional[str] = None,
    breed_size: Optional[str] = None,
    grain_free: Optional[bool] = None,
    brand: Optional[str] = None,
    limit: Optional[int] = 100
):
    """
    Get all products with optional filtering

    Query Parameters:
    - life_stage: Filter by life stage (puppy, adult, senior)
    - breed_size: Filter by breed size (small, medium, large)
    - grain_free: Filter by grain-free status (true/false)
    - brand: Filter by brand name
    - limit: Maximum number of products to return (default: 100)
    """
    try:
        # Build filter query
        query = {}
        if life_stage:
            query["life_stage"] = life_stage.lower()
        if breed_size:
            query["breed_size"] = breed_size.lower()
        if grain_free is not None:
            query["grain_free"] = grain_free
        if brand:
            query["brand"] = {"$regex": brand, "$options": "i"}  # Case-insensitive search

        # Fetch products
        products = []
        async for product in products_collection.find(query).limit(limit):
            products.append(product_helper(product))

        return products

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving products: {str(e)}")


@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product_by_id(product_id: str):
    """
    Get a specific product by ID
    """
    try:
        product = await products_collection.find_one({"_id": product_id})

        if product:
            return product_helper(product)
        else:
            raise HTTPException(status_code=404, detail="Product not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving product: {str(e)}")


# ============================================
# Recommendation Engine
# ============================================

class RecommendationResponse(BaseModel):
    """Response model for recommendations with score"""
    product: ProductResponse
    score: float
    match_percentage: int
    reasons: List[str]


def calculate_breed_size_score(pet_breed_size: str, product_kibble_size: str) -> tuple[float, str]:
    """
    Calculate breed size compatibility score

    Rules:
    - Small breed: small (+20) or regular (+15) kibble
    - Medium breed: regular (+20) kibble only
    - Large breed: large (+20) or regular (+15) kibble
    """
    pet_size = pet_breed_size.lower()
    kibble = product_kibble_size.lower()

    if pet_size == "small":
        if kibble == "small":
            return 20.0, "Perfect kibble size for small breed"
        elif kibble == "regular":
            return 15.0, "Compatible kibble size"
        else:
            return 0.0, ""

    elif pet_size == "medium":
        if kibble == "regular":
            return 20.0, "Perfect kibble size for medium breed"
        else:
            return 0.0, ""

    elif pet_size == "large":
        if kibble == "large":
            return 20.0, "Perfect kibble size for large breed"
        elif kibble == "regular":
            return 15.0, "Compatible kibble size"
        else:
            return 0.0, ""

    return 10.0, ""  # Fallback


def calculate_activity_goal_score(
    activity_level: str,
    weight_goal: str,
    protein_pct: float,
    fat_pct: float,
    fiber_pct: float
) -> tuple[float, List[str]]:
    """
    Calculate score based on activity level and dietary goals
    Max: 40 points
    """
    score = 0.0
    reasons = []
    activity = activity_level.lower()
    goal = weight_goal.lower()

    # High Activity Dogs
    if activity == "high":
        if goal == "muscle-gain":
            # Need high protein AND high fat
            if protein_pct >= 38:
                score += 20
                reasons.append("Excellent protein for muscle building")
            elif protein_pct >= 35:
                score += 15
                reasons.append("Good protein for active dogs")

            if fat_pct >= 15:
                score += 20
                reasons.append("High energy from fat for active lifestyle")
            elif fat_pct >= 12:
                score += 10

        elif goal == "maintenance":
            # Need high protein, moderate fat
            if protein_pct >= 35:
                score += 20
                reasons.append("Great protein for active dogs")
            elif protein_pct >= 30:
                score += 15

            if 12 <= fat_pct <= 18:
                score += 20
                reasons.append("Balanced fat for maintenance")
            elif fat_pct >= 15:
                score += 15

        elif goal == "weight-loss":
            # High protein, lower fat
            if protein_pct >= 35:
                score += 20
                reasons.append("High protein helps maintain muscle during weight loss")

            if fat_pct < 12 and fiber_pct >= 5:
                score += 20
                reasons.append("Lower fat and good fiber for weight management")
            elif fat_pct < 15:
                score += 10

    # Medium Activity Dogs
    elif activity == "medium":
        if goal == "maintenance":
            if 30 <= protein_pct <= 38:
                score += 20
                reasons.append("Balanced protein for moderate activity")
            elif protein_pct >= 28:
                score += 15

            if 12 <= fat_pct <= 18:
                score += 20
                reasons.append("Balanced fat for maintenance")

        elif goal == "muscle-gain":
            if protein_pct >= 35:
                score += 20
                reasons.append("Good protein for muscle building")

            if fat_pct >= 15:
                score += 15
                reasons.append("Adequate fat for energy")

        elif goal == "weight-loss":
            if protein_pct >= 30:
                score += 15

            if fat_pct < 12:
                score += 20
                reasons.append("Lower fat supports weight loss")
            elif fat_pct < 15:
                score += 10

    # Low Activity Dogs
    elif activity == "low":
        if goal == "weight-loss":
            if protein_pct >= 28:
                score += 15
                reasons.append("Adequate protein for less active dogs")

            if fat_pct < 12 and fiber_pct >= 5:
                score += 25
                reasons.append("Perfect for weight loss - low fat, high fiber")
            elif fat_pct < 12:
                score += 15

        elif goal == "maintenance":
            if 28 <= protein_pct <= 35:
                score += 20
                reasons.append("Balanced nutrition for less active dogs")

            if 10 <= fat_pct <= 15:
                score += 20
                reasons.append("Moderate fat prevents weight gain")

        elif goal == "muscle-gain":
            # Less common for low activity, but still score
            if protein_pct >= 35:
                score += 15
            if fat_pct >= 12:
                score += 10

    return min(score, 40.0), reasons


def calculate_nutritional_quality_score(
    protein_pct: float,
    fat_pct: float,
    omega_3: Optional[float],
    dha: Optional[float],
    epa: Optional[float],
    grain_free: bool
) -> tuple[float, List[str]]:
    """
    Calculate nutritional quality score
    Max: 25 points
    """
    score = 0.0
    reasons = []

    # Protein quality (0-10 points)
    if protein_pct >= 38:
        score += 10
        reasons.append("Premium protein content")
    elif protein_pct >= 35:
        score += 8
        reasons.append("High protein content")
    elif protein_pct >= 30:
        score += 5

    # Omega-3/DHA/EPA for joints and brain (0-5 points)
    if omega_3 and omega_3 >= 0.8:
        score += 3
        reasons.append("Excellent Omega-3 for joints and coat")
    elif omega_3 and omega_3 >= 0.5:
        score += 2

    if dha and dha >= 0.3:
        score += 2
        reasons.append("Good DHA for brain health")
    elif dha and dha >= 0.2:
        score += 1

    # Grain-free (0-5 points)
    if grain_free:
        score += 5
        reasons.append("Grain-free formula")

    # Fat quality (0-5 points)
    if 12 <= fat_pct <= 18:
        score += 5
        reasons.append("Balanced fat content")
    elif 10 <= fat_pct <= 20:
        score += 3

    return min(score, 25.0), reasons


def calculate_ingredient_quality_score(ingredients: str, primary_proteins: str) -> tuple[float, List[str]]:
    """
    Calculate ingredient quality score
    Max: 10 points
    """
    score = 0.0
    reasons = []

    ingredients_lower = ingredients.lower()

    # Fresh meat first ingredient (0-5 points)
    first_ingredients = ingredients_lower.split(',')[0:3]
    fresh_keywords = ['fresh', 'raw', 'whole']
    if any(keyword in ing for ing in first_ingredients for keyword in fresh_keywords):
        score += 5
        reasons.append("Fresh meat as primary ingredient")

    # Multiple protein sources (0-3 points)
    protein_count = len([p.strip() for p in primary_proteins.split(',') if p.strip()])
    if protein_count >= 3:
        score += 3
        reasons.append(f"Diverse protein sources ({protein_count} types)")
    elif protein_count >= 2:
        score += 2

    # No controversial ingredients (0-2 points)
    controversial = ['by-product', 'meal', 'digest', 'artificial']
    if not any(word in ingredients_lower for word in controversial):
        score += 2
        reasons.append("No controversial ingredients")

    return min(score, 10.0), reasons


def score_product_for_pet(product: dict, pet_profile: dict) -> tuple[float, List[str]]:
    """
    Calculate overall compatibility score for a product given a pet profile
    Returns: (score, reasons)
    """
    total_score = 0.0
    all_reasons = []

    # Extract pet info
    pet_breed_size = pet_profile.get("breedSize", "medium")
    pet_activity = pet_profile.get("activityLevel", "medium")
    pet_goal = pet_profile.get("weightGoal", "maintenance")
    pet_allergies = [a.lower().strip() for a in pet_profile.get("allergies", [])]

    # Extract product info
    product_kibble = product.get("kibble_size", "regular")
    protein_pct = product.get("protein_pct") or 0
    fat_pct = product.get("fat_pct") or 0
    fiber_pct = product.get("fiber_pct") or 0
    omega_3 = product.get("omega_3_fatty_acids")
    dha = product.get("DHA")
    epa = product.get("EPA")
    grain_free = product.get("grain_free", False)
    ingredients = product.get("ingredients", "")
    primary_proteins = product.get("primary_proteins", "")
    allergen_tags = product.get("allergen_tags", "")

    # HARD FILTER: Allergy check (return 0 if allergies present)
    product_allergens = [a.lower().strip() for a in allergen_tags.split(',') if a.strip()]
    if any(allergy in product_allergens for allergy in pet_allergies):
        return 0.0, ["Contains allergens - NOT RECOMMENDED"]

    # HARD FILTER: Kibble size incompatibility check
    pet_size = pet_breed_size.lower()
    kibble = product_kibble.lower()

    # Small dogs cannot eat large kibble
    if pet_size == "small" and kibble == "large":
        return 0.0, ["Kibble too large for small breed"]

    # Large dogs should not eat small kibble (choking hazard, not satisfying)
    if pet_size == "large" and kibble == "small":
        return 0.0, ["Kibble too small for large breed"]

    # Medium dogs should avoid small and large kibble
    if pet_size == "medium" and kibble in ["small", "large"]:
        return 0.0, ["Kibble size not suitable for medium breed"]

    # 1. Breed Size Score (0-20 points)
    breed_score, breed_reason = calculate_breed_size_score(pet_breed_size, product_kibble)
    total_score += breed_score
    if breed_reason:
        all_reasons.append(breed_reason)

    # 2. Activity + Goal Score (0-40 points)
    activity_score, activity_reasons = calculate_activity_goal_score(
        pet_activity, pet_goal, protein_pct, fat_pct, fiber_pct
    )
    total_score += activity_score
    all_reasons.extend(activity_reasons)

    # 3. Nutritional Quality Score (0-25 points)
    nutrition_score, nutrition_reasons = calculate_nutritional_quality_score(
        protein_pct, fat_pct, omega_3, dha, epa, grain_free
    )
    total_score += nutrition_score
    all_reasons.extend(nutrition_reasons)

    # 4. Ingredient Quality Score (0-10 points)
    ingredient_score, ingredient_reasons = calculate_ingredient_quality_score(
        ingredients, primary_proteins
    )
    total_score += ingredient_score
    all_reasons.extend(ingredient_reasons)

    # 5. Price Value Score (0-5 points) - TODO: Future implementation
    # For now, give baseline points
    total_score += 5

    return total_score, all_reasons


@app.get("/api/recommendations/{pet_id}")
async def get_recommendations(pet_id: str):
    """
    Get personalized dog food recommendations for a specific pet

    Returns top 15 products scored above 50 points, sorted by compatibility
    """
    try:
        # 1. Get pet profile
        if not ObjectId.is_valid(pet_id):
            raise HTTPException(status_code=400, detail="Invalid pet ID format")

        pet = await pets_collection.find_one({"_id": ObjectId(pet_id)})
        if not pet:
            raise HTTPException(status_code=404, detail="Pet not found")

        pet_profile = {
            "ageGroup": pet.get("ageGroup", "adult"),
            "breedSize": pet.get("breedSize", "medium"),
            "activityLevel": pet.get("activityLevel", "medium"),
            "weightGoal": pet.get("weightGoal", "maintenance"),
            "allergies": pet.get("allergies", [])
        }

        # 2. Get all products with hard filters
        query = {
            "format": "dry",  # Only dry food for now
        }

        # Life stage filter: match exact OR "all life stages"
        pet_age = pet_profile["ageGroup"].lower()
        query["$or"] = [
            {"life_stage": pet_age},
            {"life_stage": "all"}
        ]

        all_products = []
        async for product in products_collection.find(query):
            all_products.append(product)

        if not all_products:
            return {
                "pet": pet_profile,
                "recommendations": [],
                "message": "No products found matching basic criteria"
            }

        # 3. Score each product
        scored_products = []
        for product in all_products:
            score, reasons = score_product_for_pet(product, pet_profile)

            # Only include products scoring 50+
            if score >= 50:
                scored_products.append({
                    "product": product_helper(product),
                    "score": round(score, 1),
                    "match_percentage": int(score),  # 0-100 scale
                    "reasons": reasons[:3]  # Top 3 reasons
                })

        # 4. Sort by score (highest first) and limit to top 15
        scored_products.sort(key=lambda x: x["score"], reverse=True)
        top_recommendations = scored_products[:15]

        return {
            "pet": pet_profile,
            "total_matches": len(scored_products),
            "recommendations": top_recommendations
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")


# ============================================
# Application Lifecycle Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print("🚀 Pet AI Assistant API starting up...")
    print(f"📊 Connected to MongoDB: {MONGODB_URL}")
    print(f"🗄️  Database: {DATABASE_NAME}")
    print("✅ Ready to accept requests!")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    print("👋 Shutting down Pet AI Assistant API...")
    client.close()
    print("✅ MongoDB connection closed")


# ============================================
# Run with: uvicorn main:app --reload --port 8080
# ============================================

"""
BowlWise — FastAPI Backend (Single-file Architecture)

All backend logic lives here: app setup, middleware, models, helpers,
authentication, CRUD endpoints, scoring engine, and recommendations.

Sections (in order):
  1. Imports & Environment
  2. Logging
  3. MongoDB Connection & Collections
  4. Auth Configuration (JWT, Magic Link, Resend)
  5. Application Lifespan (startup indexes, shutdown)
  6. FastAPI App, CORS, Middleware, Exception Handlers
  7. Pydantic Models (request/response schemas)
  8. Helper Functions (MongoDB doc → API response converters)
  9. JWT & Auth Utilities
  10. Magic Link Email
  11. Pet CRUD Endpoints
  12. Auth Endpoints (magic link, verify, profile, delete account)
  13. Pet Claim Endpoint
  14. Purchase Endpoints
  15. Product Endpoints (read-only)
  16. Scoring Engine (6-factor algorithm, max 100 pts)
  17. Recommendation Endpoint

Run:
  Dev:  uvicorn main:app --reload --port 8000
  Prod: uvicorn main:app --host 0.0.0.0 --port $PORT
"""

# ============================================
# Imports
# ============================================

from dotenv import load_dotenv                       # Load .env file before any os.getenv() calls
load_dotenv()

from fastapi import FastAPI, HTTPException, Header, Query, Request, Depends  # Web framework and HTTP error handling
from fastapi.middleware.cors import CORSMiddleware   # Allow cross-origin requests (frontend → backend)
from fastapi.responses import JSONResponse           # Custom error responses
from motor.motor_asyncio import AsyncIOMotorClient   # Async MongoDB driver (non-blocking DB calls)
from pydantic import BaseModel, EmailStr, Field, field_validator  # Data validation and schema definition
from typing import List, Optional                    # Type hints for better code clarity
from bson import ObjectId                            # MongoDB's unique ID type
from contextlib import asynccontextmanager           # For lifespan management
import os                                            # Access environment variables
import re                                            # Regex sanitization for query filters
import hashlib                                       # SHA-256 hashing for magic link tokens
import uuid                                          # Random UUIDs for pet public IDs and session tokens
import time                                          # For request duration tracking
from datetime import datetime, timedelta              # Timestamps and expiry calculations
import logging                                       # Structured logging
from slowapi import Limiter                          # Rate limiting
from slowapi.util import get_remote_address          # Get client IP for rate limiting
from slowapi.errors import RateLimitExceeded         # 429 error type
import jwt                                           # JWT token creation and verification
import resend                                        # Magic link email delivery

# ============================================
# Logging Configuration
# ============================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("petai")

# ============================================
# MongoDB Connection
# ============================================

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "petai")

client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
database = client[DATABASE_NAME]
pets_collection = database["pets"]
products_collection = database["products"]
users_collection = database["users"]
purchases_collection = database["purchases"]

# ============================================
# Auth Configuration
# ============================================

JWT_SECRET = os.getenv("JWT_SECRET")
if os.getenv("ENV") == "production" and not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set in production")
JWT_SECRET = JWT_SECRET or "dev-secret-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30
MAGIC_LINK_EXPIRY_MINUTES = 15
MAGIC_LINK_BASE_URL = os.getenv("MAGIC_LINK_BASE_URL", "http://localhost:5173")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# ============================================
# Application Lifespan (startup + shutdown)
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # --- Startup ---
    logger.info("BowlWise API starting up...")
    logger.info("MongoDB client initialized (database: %s)", DATABASE_NAME)

    # Create database indexes for query performance
    await products_collection.create_index([("format", 1), ("life_stage", 1)])
    await products_collection.create_index("brand")
    await products_collection.create_index("life_stage")
    await products_collection.create_index("breed_size")
    await pets_collection.create_index("public_id", unique=True)
    # Users collection indexes
    await users_collection.create_index("email", unique=True)
    await users_collection.create_index("magic_link_token")
    # Purchases collection indexes
    await purchases_collection.create_index([("user_id", 1), ("status", 1)])
    await purchases_collection.create_index([("user_id", 1), ("pet_id", 1), ("purchased_at", -1)])
    logger.info("Database indexes ensured")

    logger.info("Ready to accept requests!")
    yield

    # --- Shutdown ---
    logger.info("Shutting down BowlWise API...")
    client.close()
    logger.info("MongoDB connection closed")

# ============================================
# FastAPI Application Setup
# ============================================

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title="BowlWise API",
    description="Backend API for pet food recommendations",
    version="2.0.0",
    lifespan=lifespan,
    docs_url=None if os.getenv("ENV") == "production" else "/docs",
    redoc_url=None if os.getenv("ENV") == "production" else "/redoc",
    openapi_url=None if os.getenv("ENV") == "production" else "/openapi.json",
)
app.state.limiter = limiter

# ============================================
# CORS Configuration
# ============================================

# Read allowed origins from env (comma-separated), fallback to localhost for dev
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Session-Token"],
)

# ============================================
# Request Logging Middleware
# ============================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with method, path, status, and duration."""
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        "%s %s → %d (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

# ============================================
# Security Headers Middleware
# ============================================

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to every response."""
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ============================================
# Global Exception Handler
# ============================================

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Return 429 with clear JSON message when rate limit is hit."""
    return JSONResponse(status_code=429, content={"detail": f"Rate limit exceeded: {exc.detail}"})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions — log details server-side, return safe message to client."""
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ============================================
# Pydantic Models (Request/Response Schemas)
# ============================================


class PetCreate(BaseModel):
    """
    Schema for creating a new pet profile.
    Used when: POST /api/pets

    All fields except allergies are required.
    This model validates data BEFORE it reaches your endpoint code.
    """
    name: str = Field(..., min_length=1, max_length=50)
    breedSize: str
    ageGroup: str
    activityLevel: str
    weightGoal: str
    allergies: Optional[List[str]] = Field(default=[], max_length=20)
    screen_width: Optional[int] = None

    @field_validator("breedSize")
    @classmethod
    def validate_breed_size(cls, v):
        allowed = {"small", "medium", "large"}
        if v.lower() not in allowed:
            raise ValueError(f"breedSize must be one of: {', '.join(allowed)}")
        return v

    @field_validator("ageGroup")
    @classmethod
    def validate_age_group(cls, v):
        allowed = {"puppy", "adult", "senior"}
        if v.lower() not in allowed:
            raise ValueError(f"ageGroup must be one of: {', '.join(allowed)}")
        return v

    @field_validator("activityLevel")
    @classmethod
    def validate_activity_level(cls, v):
        allowed = {"low", "medium", "high"}
        if v.lower() not in allowed:
            raise ValueError(f"activityLevel must be one of: {', '.join(allowed)}")
        return v

    @field_validator("weightGoal")
    @classmethod
    def validate_weight_goal(cls, v):
        allowed = {"maintenance", "weight-loss", "muscle-gain"}
        if v.lower() not in allowed:
            raise ValueError(f"weightGoal must be one of: {', '.join(allowed)}")
        return v

    @field_validator("allergies")
    @classmethod
    def validate_allergies(cls, v):
        if v:
            for allergy in v:
                if len(allergy) > 50:
                    raise ValueError("Each allergy must be 50 characters or less")
        return v


class PetResponse(BaseModel):
    """
    Schema for returning pet data to the frontend.
    Used when: POST /api/pets response, GET /api/pets/{pet_id}

    - id: Random UUID public identifier (not MongoDB ObjectId)
    - session_token: Only returned on creation (POST), used for auth on PUT/DELETE/GET
    """
    id: str                                 # Random UUID public identifier
    name: str
    breedSize: str
    ageGroup: str
    activityLevel: str
    weightGoal: str
    allergies: List[str]
    session_token: Optional[str] = Field(
        default=None,
        description="Session token for authenticating pet operations (only returned on creation)"
    )


class MagicLinkRequest(BaseModel):
    """Schema for requesting a magic link email."""
    email: EmailStr


class PurchaseCreate(BaseModel):
    """Schema for logging a food purchase."""
    pet_id: str
    product_id: str
    bag_size_kg: Optional[float] = None   # Defaults to product.size_kg
    cups_per_day: float                   # Required, from feeding calculator
    cost: Optional[float] = None          # Defaults to product.price
    notes: Optional[str] = Field(None, max_length=200)
    match_score: Optional[float] = None   # Recommendation score from frontend


class PurchaseUpdate(BaseModel):
    """Schema for editing a purchase. Only provided fields are updated."""
    bag_size_kg: Optional[float] = None
    cups_per_day: Optional[float] = None


class PetClaim(BaseModel):
    """Schema for claiming an anonymous pet to a user account."""
    session_token: str


class ProductCreate(BaseModel):
    """
    Schema for creating/importing a dog food product.
    Used when: Importing products from scrapers or CSV

    Contains all nutritional information, pricing, and metadata.
    Optional fields use None as default for products with missing data.
    """
    # === Required Fields ===
    id: str                             # Unique product ID (e.g., "Orijen-Large-Breed-Adult")
    brand: str                          # Brand name (e.g., "Orijen", "Royal Canin")
    line: str                           # Product line name (e.g., "Large Breed Adult Recipe")
    format: str                         # "dry", "wet", or "raw"
    life_stage: str                     # "puppy", "adult", "senior", or "all"
    breed_size: str                     # "small", "medium", "large", or "all"
    primary_proteins: str               # Comma-separated (e.g., "Chicken, Turkey, Salmon")
    grain_free: bool                    # True if no grains in ingredients
    ingredients: str                    # Full ingredient list as text
    allergen_tags: str                  # Comma-separated allergens (e.g., "chicken, fish, eggs")
    tags: str                           # Comma-separated tags for filtering

    # === Nutritional Information (Guaranteed Analysis) ===
    # All percentages, all optional since not all products have complete data
    protein_pct: Optional[float] = None             # Crude protein %
    fat_pct: Optional[float] = None                 # Crude fat %
    ash_pct: Optional[float] = None                 # Ash content %
    fiber_pct: Optional[float] = None               # Crude fiber %
    moisture_pct: Optional[float] = None            # Moisture %
    calcium_pct: Optional[float] = None             # Calcium %
    phosphorus_pct: Optional[float] = None          # Phosphorus %
    omega_6_fatty_acids: Optional[float] = None     # Omega-6 %
    omega_3_fatty_acids: Optional[float] = None     # Omega-3 %
    DHA: Optional[float] = None                     # DHA % (brain health)
    EPA: Optional[float] = None                     # EPA % (joint health)

    # === Calorie Information ===
    kcal_per_cup: Optional[int] = None              # Calories per cup
    kcal_per_kg: Optional[int] = None               # Calories per kg

    # === Product Details ===
    kibble_size: Optional[str] = None               # "small", "regular", or "large"
    size_kg: Optional[float] = None                 # Package size in kg
    price: Optional[float] = None                   # Price in dollars
    price_per_kg: Optional[float] = None            # Calculated price per kg
    retailer: Optional[str] = None                  # Where to buy (e.g., "PetValu")
    image: Optional[str] = None                     # Product image URL
    source_url: Optional[str] = None                # Where data was scraped from
    updated_at: Optional[str] = None                # Last update timestamp


class ProductResponse(BaseModel):
    """
    Schema for returning product data to the frontend.
    Mirrors ProductCreate but used for API responses.
    """
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
# Helper Functions (MongoDB → API conversion)
# ============================================

# These functions convert MongoDB documents to API response format.
# Why needed:
#   1. MongoDB uses "_id" (ObjectId type) → API needs "id" (string)
#   2. MongoDB fields might be missing → API needs default values
#   3. Centralizes conversion logic in one place


def pet_helper(pet, include_token: bool = False) -> dict:
    """
    Convert a MongoDB pet document to API response format.

    MongoDB document:  {"_id": ObjectId("..."), "public_id": "uuid", "name": "Buddy", ...}
    API response:      {"id": "uuid", "name": "Buddy", ...}

    Args:
        pet: MongoDB document dict
        include_token: If True, include session_token in response (only on creation)
    """
    # Handle legacy field name: old data might use "breed" instead of "breedSize"
    breed_size = pet.get("breedSize", pet.get("breed", ""))

    pet_data = {
        "id": pet.get("public_id", str(pet["_id"])),  # Use public_id (UUID), fallback to ObjectId
        "name": pet.get("name", ""),
        "breedSize": breed_size,
        "ageGroup": pet.get("ageGroup", ""),
        "activityLevel": pet.get("activityLevel", ""),
        "weightGoal": pet.get("weightGoal", ""),
        "allergies": pet.get("allergies", [])
    }

    if include_token:
        pet_data["session_token"] = pet.get("session_token")

    return pet_data


def product_helper(product) -> dict:
    """
    Convert a MongoDB product document to API response format.

    Handles all product fields including nutritional data.
    - String fields: default to "" (empty string)
    - Number fields: default to None (will be null in JSON)
    - Boolean fields: default to False
    """
    return {
        # === Basic Info ===
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

        # === Nutritional Info (None if not available) ===
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

        # === Calorie Info ===
        "kcal_per_cup": product.get("kcal_per_cup"),
        "kcal_per_kg": product.get("kcal_per_kg"),

        # === Product Details ===
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


def user_helper(user_doc) -> dict:
    """Convert a MongoDB user document to API response format.
    Excludes internal fields: magic_link_token, magic_link_expiry, _id."""
    return {
        "id": str(user_doc["_id"]),
        "email": user_doc.get("email", ""),
        "email_verified": user_doc.get("email_verified", False),
        "name": user_doc.get("name"),
        "created_at": user_doc.get("created_at", "").isoformat() if user_doc.get("created_at") else None,
        "last_login_at": user_doc.get("last_login_at", "").isoformat() if user_doc.get("last_login_at") else None,
        "preferences": user_doc.get("preferences", {"notifications_enabled": True, "email_reminders": False}),
    }


def purchase_helper(purchase_doc) -> dict:
    """Convert a MongoDB purchase document to API response format.
    Includes calculated days_remaining field."""
    depletion = purchase_doc.get("estimated_depletion_at")
    days_remaining = max(0, (depletion - datetime.utcnow()).days) if depletion else None

    return {
        "id": str(purchase_doc["_id"]),
        "user_id": purchase_doc.get("user_id", ""),
        "pet_id": purchase_doc.get("pet_id", ""),
        "product_id": purchase_doc.get("product_id", ""),
        "product_snapshot": purchase_doc.get("product_snapshot", {}),
        "bag_size_kg": purchase_doc.get("bag_size_kg"),
        "cups_per_day": purchase_doc.get("cups_per_day"),
        "purchased_at": purchase_doc.get("purchased_at", "").isoformat() if purchase_doc.get("purchased_at") else None,
        "estimated_depletion_at": depletion.isoformat() if depletion else None,
        "days_remaining": days_remaining,
        "status": purchase_doc.get("status", "active"),
        "completed_at": purchase_doc.get("completed_at", "").isoformat() if purchase_doc.get("completed_at") else None,
        "cost": purchase_doc.get("cost"),
        "notes": purchase_doc.get("notes"),
        "match_score": purchase_doc.get("match_score"),
        "created_at": purchase_doc.get("created_at", "").isoformat() if purchase_doc.get("created_at") else None,
    }


def calculate_depletion(product: dict, bag_size_kg: float, cups_per_day: float, purchased_at: datetime) -> datetime:
    """Calculate estimated depletion date for a food bag.

    Formula:
      grams_per_cup = (kcal_per_cup / kcal_per_kg) * 1000
      total_cups_in_bag = (bag_size_kg * 1000) / grams_per_cup
      days_in_bag = total_cups_in_bag / cups_per_day
    """
    kcal_per_cup = product.get("kcal_per_cup") or 0
    kcal_per_kg = product.get("kcal_per_kg") or 0

    if kcal_per_cup <= 0 or kcal_per_kg <= 0 or cups_per_day <= 0:
        # Fallback: assume 30 days if calorie data is missing
        return purchased_at + timedelta(days=30)

    grams_per_cup = (kcal_per_cup / kcal_per_kg) * 1000
    total_cups_in_bag = (bag_size_kg * 1000) / grams_per_cup
    days_in_bag = total_cups_in_bag / cups_per_day
    return purchased_at + timedelta(days=days_in_bag)


# ============================================
# JWT Authentication
# ============================================

def create_jwt(user_id: str, email: str) -> str:
    """Create a JWT token with user_id, email, and 30-day expiry."""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    authorization: str = Header(..., description="Bearer JWT token")
) -> dict:
    """FastAPI dependency that validates JWT and returns user dict.
    Usage: user = Depends(get_current_user)"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]  # Strip "Bearer "
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await users_collection.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ============================================
# Magic Link Email
# ============================================

async def send_magic_link_email(email: str, token: str):
    """Send a magic link email using Resend. Token is the raw (unhashed) value."""
    verify_url = f"{MAGIC_LINK_BASE_URL}/auth/verify/{token}"
    logger.info("Magic link generated for %s...%s (token: ...%s)", email[:3], email.split('@')[1], token[-4:])

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a2e; margin-bottom: 24px;">Sign in to BowlWise</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.5;">Click the button below to sign in to your account:</p>
        <a href="{verify_url}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0;">Sign In</a>
        <p style="color: #888; font-size: 14px; margin-top: 32px;">This link expires in 15 minutes.</p>
        <p style="color: #888; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """

    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — magic link not sent (token: ...%s)", token[-4:])
        return

    try:
        resend.Emails.send({
            "from": "BowlWise <onboarding@resend.dev>",
            "to": [email],
            "subject": "Sign in to BowlWise",
            "html": html_body,
        })
        logger.info("Magic link email sent to %s...%s", email[:3], email.split('@')[1])
    except Exception as e:
        logger.error("Failed to send magic link email to %s...%s: %s", email[:3], email.split('@')[1], e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to send email")


# ============================================
# General Endpoints (root, health)
# ============================================


@app.get("/")
async def root():
    """Root endpoint — confirms API is running."""
    return {
        "status": "running",
        "message": "BowlWise API is up and running!",
        "version": "2.0.0"
    }


@app.get("/health")
@limiter.exempt
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    try:
        await client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "version": "2.0.0",
    }


# ============================================
# Pet CRUD Endpoints
# ============================================


@app.post("/api/pets", response_model=PetResponse, status_code=201)
@limiter.limit("5/minute")
async def create_pet(request: Request, pet: PetCreate):
    """
    Create a new pet profile.

    - Request body: PetCreate schema (validated automatically by FastAPI)
    - Returns: The created pet with public_id (UUID) and session_token
    - Status: 201 Created on success
    - The session_token must be saved by the client for future PUT/DELETE/GET operations
    """
    try:
        pet_dict = pet.model_dump()
        pet_dict["public_id"] = str(uuid.uuid4())
        pet_dict["session_token"] = str(uuid.uuid4())
        # Submission tracking metadata (internal analytics, not returned to frontend)
        pet_dict["created_at"] = datetime.utcnow()
        pet_dict["updated_at"] = datetime.utcnow()
        pet_dict["user_agent"] = request.headers.get("user-agent", "")
        raw_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "")
        raw_ip = raw_ip.split(",")[0].strip() if raw_ip else ""
        pet_dict["ip_hash"] = hashlib.sha256(raw_ip.encode()).hexdigest()[:16] if raw_ip else ""
        pet_dict["referrer"] = request.headers.get("referer", "")
        pet_dict["user_id"] = None       # Null for anonymous pets, set on claim
        pet_dict["claimed_at"] = None     # Set when pet is linked to a user account
        result = await pets_collection.insert_one(pet_dict)
        created_pet = await pets_collection.find_one({"_id": result.inserted_id})

        if created_pet:
            return pet_helper(created_pet, include_token=True)
        else:
            raise HTTPException(status_code=500, detail="Failed to create pet")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating pet: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create pet")


@app.get("/api/pets/{pet_id}", response_model=PetResponse)
async def get_pet_by_id(
    pet_id: str,
    x_session_token: str = Header(..., description="Session token from pet creation")
):
    """
    Retrieve a specific pet by public UUID.

    - Path parameter: pet_id (UUID string)
    - Header: X-Session-Token (required)
    - Returns: The pet if found and token matches
    - Status: 200 OK, 404 if not found, 403 if token mismatch
    """
    try:
        pet = await pets_collection.find_one({"public_id": pet_id})
        if not pet:
            raise HTTPException(status_code=404, detail="Pet not found")

        if pet.get("session_token") != x_session_token:
            raise HTTPException(status_code=403, detail="Forbidden")

        return pet_helper(pet)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving pet %s: %s", pet_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve pet")


@app.put("/api/pets/{pet_id}", response_model=PetResponse)
@limiter.limit("5/minute")
async def update_pet(
    request: Request,
    pet_id: str,
    pet: PetCreate,
    x_session_token: str = Header(..., description="Session token from pet creation")
):
    """
    Update an existing pet profile (full replacement).

    - Path parameter: pet_id (UUID string)
    - Header: X-Session-Token (required)
    - Request body: PetCreate schema with new data
    - Returns: The updated pet
    - Status: 200 OK, 404 if not found, 403 if token mismatch
    """
    try:
        existing_pet = await pets_collection.find_one({"public_id": pet_id})
        if not existing_pet:
            raise HTTPException(status_code=404, detail="Pet not found")

        if existing_pet.get("session_token") != x_session_token:
            raise HTTPException(status_code=403, detail="Forbidden")

        pet_dict = pet.model_dump()
        pet_dict["updated_at"] = datetime.utcnow()
        await pets_collection.update_one(
            {"public_id": pet_id},
            {"$set": pet_dict}
        )

        updated_pet = await pets_collection.find_one({"public_id": pet_id})
        if updated_pet:
            return pet_helper(updated_pet)
        else:
            raise HTTPException(status_code=404, detail="Pet not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating pet %s: %s", pet_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update pet")


@app.delete("/api/pets/{pet_id}")
@limiter.limit("5/minute")
async def delete_pet(
    request: Request,
    pet_id: str,
    x_session_token: str = Header(..., description="Session token from pet creation")
):
    """
    Delete a pet profile.

    - Path parameter: pet_id (UUID string)
    - Header: X-Session-Token (required)
    - Returns: Success message with deleted pet ID
    - Status: 200 OK, 404 if not found, 403 if token mismatch
    """
    try:
        existing_pet = await pets_collection.find_one({"public_id": pet_id})
        if not existing_pet:
            raise HTTPException(status_code=404, detail="Pet not found")

        if existing_pet.get("session_token") != x_session_token:
            raise HTTPException(status_code=403, detail="Forbidden")

        await pets_collection.delete_one({"public_id": pet_id})
        return {"message": "Pet deleted successfully", "id": pet_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting pet %s: %s", pet_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete pet")


# ============================================
# Auth Endpoints (Magic Link)
# ============================================


@app.post("/api/auth/magic-link")
@limiter.limit("3/minute")
async def request_magic_link(request: Request, body: MagicLinkRequest):
    """Send a magic link email. Creates user if email doesn't exist.
    Always responds with same message to avoid leaking account existence."""
    try:
        email = body.email.lower().strip()
        now = datetime.utcnow()
        raw_token = str(uuid.uuid4())
        hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()
        expiry = now + timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES)

        # Find or create user — store hashed token, send raw token in email
        user = await users_collection.find_one({"email": email})
        if user:
            await users_collection.update_one(
                {"email": email},
                {"$set": {
                    "magic_link_token": hashed_token,
                    "magic_link_expiry": expiry,
                    "updated_at": now,
                }}
            )
        else:
            await users_collection.insert_one({
                "email": email,
                "email_verified": False,
                "name": None,
                "created_at": now,
                "updated_at": now,
                "last_login_at": None,
                "auth_method": "magic_link",
                "magic_link_token": hashed_token,
                "magic_link_expiry": expiry,
                "preferences": {"notifications_enabled": True, "email_reminders": False},
            })

        await send_magic_link_email(email, raw_token)
        return {"message": "If this email is registered, you'll receive a sign-in link shortly."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in magic link request: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process request")


@app.get("/api/auth/verify/{token}")
@limiter.limit("10/minute")
async def verify_magic_link(
    request: Request,
    token: str,
    session_token: Optional[str] = Query(None, description="Session token to claim a pet during verification"),
):
    """Verify a magic link token. Returns JWT + user. Optionally claims a pet."""
    try:
        hashed_token = hashlib.sha256(token.encode()).hexdigest()
        user = await users_collection.find_one({"magic_link_token": hashed_token})

        if not user:
            # Idempotent grace window: token was already consumed but the same
            # token is retried within 60s (React StrictMode double-mount,
            # network retries, double-clicks). Look up by consumed_token field.
            recently_verified = await users_collection.find_one({
                "consumed_magic_token": hashed_token,
                "last_login_at": {"$gte": datetime.utcnow() - timedelta(seconds=60)},
            })
            if recently_verified:
                logger.info("Idempotent verify hit for user %s", str(recently_verified["_id"]))
                user_id = str(recently_verified["_id"])
                jwt_token = create_jwt(user_id, recently_verified["email"])
                return {
                    "access_token": jwt_token,
                    "user": user_helper(recently_verified),
                }
            raise HTTPException(status_code=400, detail="Invalid or expired link")

        # Check expiry
        expiry = user.get("magic_link_expiry")
        if not expiry or datetime.utcnow() > expiry:
            raise HTTPException(status_code=400, detail="Invalid or expired link")

        now = datetime.utcnow()
        user_id = str(user["_id"])

        # Update user: verify email, clear token, record consumed hash for idempotency
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "email_verified": True,
                "magic_link_token": None,
                "magic_link_expiry": None,
                "consumed_magic_token": hashed_token,
                "last_login_at": now,
                "updated_at": now,
            }}
        )

        # If session_token provided, claim the pet during verification
        if session_token:
            pet = await pets_collection.find_one({"session_token": session_token})
            if pet and not pet.get("user_id"):
                await pets_collection.update_one(
                    {"_id": pet["_id"]},
                    {"$set": {"user_id": user_id, "claimed_at": now}}
                )
                logger.info("Pet %s auto-claimed by user %s during verification", pet.get("public_id"), user_id)

        # Create JWT
        jwt_token = create_jwt(user_id, user["email"])

        # Re-fetch updated user
        updated_user = await users_collection.find_one({"_id": user["_id"]})

        return {
            "access_token": jwt_token,
            "user": user_helper(updated_user),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error verifying magic link: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to verify link")


@app.get("/api/auth/me")
async def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Get current user profile + their claimed pets."""
    try:
        user_id = str(user["_id"])

        # Fetch user's pets
        pets = []
        async for pet in pets_collection.find({"user_id": user_id}):
            pets.append(pet_helper(pet))

        return {
            "user": user_helper(user),
            "pets": pets,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching user profile: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch profile")


@app.delete("/api/auth/me")
@limiter.limit("5/minute")
async def delete_account(request: Request, user: dict = Depends(get_current_user)):
    """Delete the authenticated user's account, purchases, and pets. PIPEDA compliance."""
    try:
        user_id = str(user["_id"])

        # Delete all user's purchases
        del_purchases = await purchases_collection.delete_many({"user_id": user_id})
        # Delete all user's claimed pets
        del_pets = await pets_collection.delete_many({"user_id": user_id})
        # Delete the user document
        await users_collection.delete_one({"_id": user["_id"]})

        logger.info("Account deleted: user=%s, purchases=%d, pets=%d",
                     user_id, del_purchases.deleted_count, del_pets.deleted_count)

        return {"message": "Account deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting account for user %s: %s", str(user.get("_id")), e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete account")


# ============================================
# Pet Claim Endpoint
# ============================================


@app.post("/api/pets/{pet_id}/claim")
@limiter.limit("5/minute")
async def claim_pet(
    request: Request,
    pet_id: str,
    body: PetClaim,
    user: dict = Depends(get_current_user),
):
    """Claim an anonymous pet by verifying session_token. Links pet to authenticated user."""
    try:
        pet = await pets_collection.find_one({"public_id": pet_id})
        if not pet:
            raise HTTPException(status_code=404, detail="Pet not found")

        # Verify session token
        if pet.get("session_token") != body.session_token:
            raise HTTPException(status_code=403, detail="Invalid session token")

        # Check if already claimed by another user
        existing_owner = pet.get("user_id")
        user_id = str(user["_id"])
        if existing_owner and existing_owner != user_id:
            raise HTTPException(status_code=409, detail="Pet already claimed by another user")

        if existing_owner == user_id:
            return {"message": "Pet already claimed by you", "pet": pet_helper(pet)}

        # Claim the pet
        now = datetime.utcnow()
        await pets_collection.update_one(
            {"public_id": pet_id},
            {"$set": {"user_id": user_id, "claimed_at": now}}
        )

        updated_pet = await pets_collection.find_one({"public_id": pet_id})
        return {"message": "Pet claimed successfully", "pet": pet_helper(updated_pet)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error claiming pet %s: %s", pet_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to claim pet")


# ============================================
# Purchase Endpoints
# ============================================


@app.post("/api/purchases", status_code=201)
@limiter.limit("10/minute")
async def create_purchase(
    request: Request,
    body: PurchaseCreate,
    user: dict = Depends(get_current_user),
):
    """Log a food purchase. Auto-completes any active purchase for the same pet."""
    try:
        user_id = str(user["_id"])
        now = datetime.utcnow()

        # Verify pet belongs to user
        pet = await pets_collection.find_one({"public_id": body.pet_id})
        if not pet:
            raise HTTPException(status_code=404, detail="Pet not found")
        if pet.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Pet does not belong to you")

        # Look up product for snapshot + depletion calc
        product = await products_collection.find_one({"_id": body.product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Auto-complete any existing active purchase for this pet
        await purchases_collection.update_many(
            {"user_id": user_id, "pet_id": body.pet_id, "status": "active"},
            {"$set": {"status": "switched", "completed_at": now}}
        )

        # Build purchase document
        bag_size_kg = body.bag_size_kg or product.get("size_kg") or 0
        cost = body.cost if body.cost is not None else product.get("price")
        depletion_at = calculate_depletion(product, bag_size_kg, body.cups_per_day, now)

        purchase_doc = {
            "user_id": user_id,
            "pet_id": body.pet_id,
            "product_id": body.product_id,
            "product_snapshot": {
                "brand": product.get("brand", ""),
                "line": product.get("line", ""),
                "image": product.get("image", ""),
                "price": product.get("price"),
                "size_kg": product.get("size_kg"),
                "kcal_per_cup": product.get("kcal_per_cup"),
                "kcal_per_kg": product.get("kcal_per_kg"),
                "source_url": product.get("source_url", ""),
                "retailer": product.get("retailer", ""),
            },
            "bag_size_kg": bag_size_kg,
            "cups_per_day": body.cups_per_day,
            "purchased_at": now,
            "estimated_depletion_at": depletion_at,
            "status": "active",
            "completed_at": None,
            "cost": cost,
            "notes": body.notes,
            "match_score": body.match_score,
            "created_at": now,
        }

        result = await purchases_collection.insert_one(purchase_doc)
        created = await purchases_collection.find_one({"_id": result.inserted_id})
        return purchase_helper(created)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating purchase: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to log purchase")


@app.get("/api/purchases")
async def get_purchases(
    pet_id: str = Query(..., description="Pet public_id (required)"),
    status: Optional[str] = Query(None, description="Filter by status: active, completed, switched"),
    user: dict = Depends(get_current_user),
):
    """Get purchases for the current user, filtered by pet_id."""
    try:
        user_id = str(user["_id"])
        query = {"user_id": user_id, "pet_id": pet_id}
        if status:
            query["status"] = status

        purchases = []
        async for doc in purchases_collection.find(query).sort("purchased_at", -1):
            purchases.append(purchase_helper(doc))

        return {"purchases": purchases}

    except Exception as e:
        logger.error("Error fetching purchases: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch purchases")


@app.delete("/api/purchases/{purchase_id}")
@limiter.limit("5/minute")
async def delete_purchase(
    request: Request,
    purchase_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a purchase. Only the owner can delete."""
    try:
        purchase = await purchases_collection.find_one({"_id": ObjectId(purchase_id)})
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")

        if purchase.get("user_id") != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Forbidden")

        await purchases_collection.delete_one({"_id": ObjectId(purchase_id)})
        return {"message": "Purchase deleted successfully", "id": purchase_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting purchase %s: %s", purchase_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete purchase")


@app.put("/api/purchases/{purchase_id}")
@limiter.limit("5/minute")
async def update_purchase(
    request: Request,
    purchase_id: str,
    body: PurchaseUpdate,
    user: dict = Depends(get_current_user),
):
    """Edit a purchase's bag_size_kg and/or cups_per_day. Recalculates depletion."""
    try:
        purchase = await purchases_collection.find_one({"_id": ObjectId(purchase_id)})
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")

        if purchase.get("user_id") != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Forbidden")

        # Build update with only provided fields
        update_fields = {}
        bag_size_kg = purchase.get("bag_size_kg") or 0
        cups_per_day = purchase.get("cups_per_day") or 0

        if body.bag_size_kg is not None:
            update_fields["bag_size_kg"] = body.bag_size_kg
            bag_size_kg = body.bag_size_kg
        if body.cups_per_day is not None:
            update_fields["cups_per_day"] = body.cups_per_day
            cups_per_day = body.cups_per_day

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Recalculate depletion from original purchased_at
        snapshot = purchase.get("product_snapshot", {})
        purchased_at = purchase.get("purchased_at", datetime.utcnow())
        depletion_at = calculate_depletion(snapshot, bag_size_kg, cups_per_day, purchased_at)
        update_fields["estimated_depletion_at"] = depletion_at

        await purchases_collection.update_one(
            {"_id": ObjectId(purchase_id)},
            {"$set": update_fields}
        )

        updated = await purchases_collection.find_one({"_id": ObjectId(purchase_id)})
        return purchase_helper(updated)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating purchase %s: %s", purchase_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update purchase")


@app.patch("/api/purchases/{purchase_id}/extend")
@limiter.limit("5/minute")
async def extend_purchase(
    request: Request,
    purchase_id: str,
    user: dict = Depends(get_current_user),
):
    """Extend an active purchase's depletion date by 7 days."""
    try:
        purchase = await purchases_collection.find_one({"_id": ObjectId(purchase_id)})
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")

        if purchase.get("user_id") != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Forbidden")

        if purchase.get("status") != "active":
            raise HTTPException(status_code=400, detail="Can only extend active purchases")

        depletion = purchase.get("estimated_depletion_at")
        if not depletion:
            raise HTTPException(status_code=400, detail="No depletion date to extend")

        new_depletion = depletion + timedelta(days=7)
        await purchases_collection.update_one(
            {"_id": ObjectId(purchase_id)},
            {"$set": {"estimated_depletion_at": new_depletion}}
        )

        updated = await purchases_collection.find_one({"_id": ObjectId(purchase_id)})
        return purchase_helper(updated)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error extending purchase %s: %s", purchase_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to extend purchase")


# ============================================
# Product Endpoints (read-only)
# ============================================


@app.get("/api/products", response_model=List[ProductResponse])
async def get_all_products(
    life_stage: Optional[str] = None,
    breed_size: Optional[str] = None,
    grain_free: Optional[bool] = None,
    brand: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=200)
):
    """
    Get all products with optional filtering.

    Query Parameters (all optional):
    - life_stage: "puppy", "adult", "senior", or "all"
    - breed_size: "small", "medium", "large", or "all"
    - grain_free: true or false
    - brand: Brand name (case-insensitive partial match)
    - limit: Max products to return (default 100)

    Example: GET /api/products?life_stage=adult&grain_free=true&limit=10

    The query is built dynamically based on which parameters are provided.
    """
    try:
        # Build MongoDB query dynamically
        query = {}

        if life_stage:
            query["life_stage"] = life_stage.lower()

        if breed_size:
            query["breed_size"] = breed_size.lower()

        # Note: Must check 'is not None' for booleans (False is a valid filter!)
        if grain_free is not None:
            query["grain_free"] = grain_free

        if brand:
            # $regex with $options:"i" = case-insensitive partial match
            # "orijen" matches "Orijen", "ORIJEN", etc.
            query["brand"] = {"$regex": re.escape(brand), "$options": "i"}

        # Execute query with limit
        products = []
        async for product in products_collection.find(query).limit(limit):
            products.append(product_helper(product))

        return products

    except Exception as e:
        logger.error("Error retrieving products: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve products")


@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product_by_id(product_id: str):
    """
    Get a specific product by ID.

    - Path parameter: product_id (the product's unique string ID, NOT ObjectId)
    - Returns: The product if found
    - Status: 200 OK, 404 if not found

    Note: Product IDs are strings like "Orijen-Large-Breed-Adult", not ObjectIds.
    This is because products are imported with custom IDs, not auto-generated.
    """
    try:
        # Products use string IDs (not ObjectId), so query directly
        product = await products_collection.find_one({"_id": product_id})

        if product:
            return product_helper(product)
        else:
            raise HTTPException(status_code=404, detail="Product not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving product %s: %s", product_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve product")


# ============================================
# Recommendation Engine
# ============================================

# This is the "brain" of BowlWise - it matches products to pets.
#
# How it works:
#   1. Take a pet profile (size, activity, goals, allergies)
#   2. Score every product in the database (0-100 points)
#   3. Filter out products with score < 50
#   4. Return top 40 matches with explanations
#
# Scoring breakdown (100 points max):
#   - Activity + Diet Goal:     0-40 points (the most important factor)
#   - Nutritional Quality:      0-25 points
#   - Life Stage Nutrition:     0-15 points (age-specific needs)
#   - Ingredient Quality:       0-10 points
#   - Breed/Kibble Size:        0-5  points
#   - Price Value:              0-5  points (percentile-based)
#
# Hard Filters (instant disqualification):
#   - Product contains pet's allergens → score = 0
#   - Kibble size incompatible with dog size → score = 0


class RecommendationResponse(BaseModel):
    """
    Response model for a single product recommendation.

    Fields:
    - product: Full product details (ProductResponse)
    - score: Compatibility score from 0-100
    - match_percentage: Same as score, as integer for display
    - reasons: List of human-readable explanations personalized with pet name
    - allergy_safe: True if product passed allergen check (always True for returned products)
    """
    product: ProductResponse
    score: float
    match_percentage: int
    reasons: List[str]
    allergy_safe: bool


# ----------------------------------------------
# Scoring Function 1: Breed Size (0-5 points)
# ----------------------------------------------

def calculate_breed_size_score(pet_breed_size: str, product_kibble_size: str, name: str) -> tuple[float, str]:
    """
    Calculate breed size compatibility score.

    Matching kibble size to dog size ensures:
    - Small dogs can chew comfortably
    - Large dogs don't choke on tiny pieces
    - Medium dogs get appropriately sized kibble

    Scoring Table:
    ┌─────────────┬──────────────┬────────────────┬──────────────┐
    │ Dog Size    │ Small Kibble │ Regular Kibble │ Large Kibble │
    ├─────────────┼──────────────┼────────────────┼──────────────┤
    │ Small       │ 5 pts (best) │ 3 pts (ok)     │ 0 pts        │
    │ Medium      │ 0 pts        │ 5 pts (best)   │ 0 pts        │
    │ Large       │ 0 pts        │ 3 pts (ok)     │ 5 pts (best) │
    └─────────────┴──────────────┴────────────────┴──────────────┘

    Returns:
        tuple[float, str]: (score, reason_text)
    """
    pet_size = pet_breed_size.lower()
    kibble = product_kibble_size.lower()

    if pet_size == "small":
        if kibble == "small":
            return 5.0, f"Small kibble — perfect for {name}'s small breed"
        elif kibble == "regular":
            return 3.0, f"Regular kibble — compatible with {name}'s size"
        else:
            return 0.0, ""

    elif pet_size == "medium":
        if kibble == "regular":
            return 5.0, f"Regular kibble — perfect for {name}'s medium breed"
        else:
            return 0.0, ""

    elif pet_size == "large":
        if kibble == "large":
            return 5.0, f"Large kibble — perfect for {name}'s large breed"
        elif kibble == "regular":
            return 3.0, f"Regular kibble — compatible with {name}'s size"
        else:
            return 0.0, ""

    return 2.0, ""  # Fallback for unknown sizes


# ----------------------------------------------
# Scoring Function 2: Activity + Goal (0-40 points)
# ----------------------------------------------

def calculate_activity_goal_score(
    activity_level: str,
    weight_goal: str,
    protein_pct: float,
    fat_pct: float,
    fiber_pct: float,
    name: str
) -> tuple[float, List[str]]:
    """
    Calculate score based on activity level and dietary goals.

    This is the MOST IMPORTANT scoring function (40 points max).
    It matches nutritional content to the dog's lifestyle and goals.

    Activity Levels: high, medium, low
    Weight Goals: muscle-gain, maintenance, weight-loss

    General Rules (companion dog thresholds):
    - High activity + muscle-gain → Need HIGH protein (32%+) and HIGH fat (15%+)
    - High activity + maintenance → Need HIGH protein (30%+), MODERATE fat (12-18%)
    - Low activity + weight-loss → Need ADEQUATE protein, LOW fat (<12%), HIGH fiber (5%+)

    Returns:
        tuple[float, List[str]]: (score capped at 40, list of reasons)
    """
    score = 0.0
    reasons = []
    activity = activity_level.lower()
    goal = weight_goal.lower()

    # High Activity Dogs
    if activity == "high":
        if goal == "muscle-gain":
            # Need high protein AND high fat
            if protein_pct >= 32:
                score += 20
                reasons.append(f"High protein ({protein_pct}%) supports {name}'s muscle building goal")
            elif protein_pct >= 28:
                score += 15
                reasons.append(f"Good protein ({protein_pct}%) for {name}'s active lifestyle")

            if fat_pct >= 15:
                score += 20
                reasons.append(f"High fat ({fat_pct}%) fuels {name}'s active lifestyle")
            elif fat_pct >= 12:
                score += 10

        elif goal == "maintenance":
            # Need high protein, moderate fat
            if protein_pct >= 30:
                score += 20
                reasons.append(f"Great protein ({protein_pct}%) for {name}'s active lifestyle")
            elif protein_pct >= 26:
                score += 15

            if 12 <= fat_pct <= 18:
                score += 20
                reasons.append(f"Balanced fat ({fat_pct}%) supports {name}'s maintenance goal")
            elif fat_pct >= 15:
                score += 15

        elif goal == "weight-loss":
            # High protein, lower fat
            if protein_pct >= 30:
                score += 20
                reasons.append(f"High protein ({protein_pct}%) preserves {name}'s muscle during weight loss")

            if fat_pct < 12 and fiber_pct >= 5:
                score += 20
                reasons.append(f"Low fat ({fat_pct}%) + high fiber ({fiber_pct}%) supports {name}'s weight loss")
            elif fat_pct < 15:
                score += 10

    # Medium Activity Dogs
    elif activity == "medium":
        if goal == "maintenance":
            if 25 <= protein_pct <= 35:
                score += 20
                reasons.append(f"Balanced protein ({protein_pct}%) for {name}'s moderate activity")
            elif protein_pct >= 22:
                score += 15

            if 12 <= fat_pct <= 18:
                score += 20
                reasons.append(f"Balanced fat ({fat_pct}%) supports {name}'s maintenance goal")

        elif goal == "muscle-gain":
            if protein_pct >= 30:
                score += 20
                reasons.append(f"High protein ({protein_pct}%) supports {name}'s muscle building goal")

            if fat_pct >= 15:
                score += 15
                reasons.append(f"Good fat ({fat_pct}%) provides energy for {name}")

        elif goal == "weight-loss":
            if protein_pct >= 26:
                score += 15

            if fat_pct < 12:
                score += 20
                reasons.append(f"Low fat ({fat_pct}%) supports {name}'s weight loss goal")
            elif fat_pct < 15:
                score += 10

    # Low Activity Dogs
    elif activity == "low":
        if goal == "weight-loss":
            if protein_pct >= 25:
                score += 15
                reasons.append(f"Adequate protein ({protein_pct}%) for {name}'s lower activity level")

            if fat_pct < 12 and fiber_pct >= 5:
                score += 25
                reasons.append(f"Low fat ({fat_pct}%) + high fiber ({fiber_pct}%) — ideal for {name}'s weight loss")
            elif fat_pct < 12:
                score += 15

        elif goal == "maintenance":
            if 22 <= protein_pct <= 30:
                score += 20
                reasons.append(f"Balanced protein ({protein_pct}%) for {name}'s lower activity level")

            if 10 <= fat_pct <= 15:
                score += 20
                reasons.append(f"Moderate fat ({fat_pct}%) prevents weight gain for {name}")

        elif goal == "muscle-gain":
            # Less common for low activity, but still score
            if protein_pct >= 30:
                score += 15
            if fat_pct >= 12:
                score += 10

    # Cap at 40 points max (prevents overflow from multiple bonuses)
    return min(score, 40.0), reasons


# ----------------------------------------------
# Scoring Function 3: Nutritional Quality (0-25 points)
# ----------------------------------------------

def calculate_nutritional_quality_score(
    protein_pct: float,
    fat_pct: float,
    omega_3: Optional[float],
    dha: Optional[float],
    epa: Optional[float],
    kcal_per_kg: Optional[int],
    name: str = "your dog"
) -> tuple[float, List[str]]:
    """
    Calculate nutritional quality score based on premium ingredients.

    This rewards high-quality nutrition regardless of the dog's specific needs.

    Point Breakdown:
    - Protein quality:    0-10 pts (30%+ = 10, 27%+ = 8, 24%+ = 5)
    - Omega-3 content:    0-3 pts  (0.8%+ = 3, 0.5%+ = 2)
    - DHA content:        0-2 pts  (0.3%+ = 2, 0.2%+ = 1)
    - Caloric density:    0-5 pts  (3500-4200 = 5, 3000-4500 = 3)
    - Fat balance:        0-5 pts  (12-18% = 5, 10-20% = 3)

    Returns:
        tuple[float, List[str]]: (score capped at 25, list of reasons)
    """
    score = 0.0
    reasons = []

    # Protein quality (0-10 points) — companion dog thresholds
    if protein_pct >= 30:
        score += 10
        reasons.append(f"Premium protein content ({protein_pct}%) for {name}")
    elif protein_pct >= 27:
        score += 8
        reasons.append(f"High protein content ({protein_pct}%) for {name}")
    elif protein_pct >= 24:
        score += 5

    # Omega-3/DHA/EPA for joints and brain (0-5 points)
    if omega_3 and omega_3 >= 0.8:
        score += 3
        reasons.append(f"Excellent Omega-3 ({omega_3}%) for {name}'s joints and coat")
    elif omega_3 and omega_3 >= 0.5:
        score += 2

    if dha and dha >= 0.3:
        score += 2
        reasons.append(f"Good DHA for {name}'s brain health")
    elif dha and dha >= 0.2:
        score += 1

    # Caloric density (0-5 points) — replaces grain-free bonus
    if kcal_per_kg and 3500 <= kcal_per_kg <= 4200:
        score += 5
        reasons.append(f"Optimal caloric density for {name}")
    elif kcal_per_kg and 3000 <= kcal_per_kg <= 4500:
        score += 3

    # Fat quality (0-5 points)
    if 12 <= fat_pct <= 18:
        score += 5
        reasons.append(f"Balanced fat content ({fat_pct}%) for {name}")
    elif 10 <= fat_pct <= 20:
        score += 3

    # Cap at 25 points max
    return min(score, 25.0), reasons


# ----------------------------------------------
# Scoring Function 4: Ingredient Quality (0-10 points)
# ----------------------------------------------

def calculate_ingredient_quality_score(ingredients: str, primary_proteins: str, name: str = "your dog") -> tuple[float, List[str]]:
    """
    Calculate ingredient quality score based on ingredient list analysis.

    Checks for premium ingredient indicators:
    - Fresh/raw/whole meat in first 5:  0-5 pts (matches quality keyword + protein source)
    - Multiple proteins:                0-3 pts (3+ sources = 3, 2 sources = 2)
    - No controversial:                 0-2 pts (no "digest", "artificial")

    Args:
        ingredients: Comma-separated ingredient list string
        primary_proteins: Comma-separated protein sources string
        name: Pet's name for personalized reasons

    Returns:
        tuple[float, List[str]]: (score capped at 10, list of reasons)
    """
    score = 0.0
    reasons = []

    ingredients_lower = ingredients.lower()

    # Fresh/raw/whole meat in primary ingredients (0-5 points)
    # Only award points when a quality keyword appears alongside an actual protein source
    # e.g. "fresh chicken" scores, but "raw oats" or "whole wheat" does not
    first_ingredients = [ing.strip() for ing in ingredients_lower.split(',')[0:5]]
    quality_keywords = ['fresh', 'raw', 'whole', 'deboned']
    meat_indicators = [
        'chicken', 'turkey', 'duck', 'quail', 'pheasant',          # poultry
        'beef', 'bison', 'lamb', 'venison', 'pork', 'boar', 'goat',  # red meat
        'salmon', 'herring', 'mackerel', 'trout', 'cod', 'pollock',  # fish
        'whitefish', 'sardine', 'flounder', 'walleye', 'catfish',
        'liver', 'heart', 'kidney',                                    # organs
    ]
    has_quality_meat = any(
        any(kw in ing for kw in quality_keywords) and any(meat in ing for meat in meat_indicators)
        for ing in first_ingredients
    )
    if has_quality_meat:
        score += 5
        reasons.append(f"Fresh meat as primary ingredient for {name}")

    # Multiple protein sources (0-3 points)
    protein_count = len([p.strip() for p in primary_proteins.split(',') if p.strip()])
    if protein_count >= 3:
        score += 3
        reasons.append(f"Diverse protein sources ({protein_count} types) for {name}")
    elif protein_count >= 2:
        score += 2

    # No controversial ingredients (0-2 points)
    controversial = ['digest', 'artificial']
    if not any(word in ingredients_lower for word in controversial):
        score += 2
        reasons.append(f"No controversial ingredients — clean nutrition for {name}")

    # Cap at 10 points max
    return min(score, 10.0), reasons


# ----------------------------------------------
# Scoring Function 5: Life Stage Nutrition (0-15 points)
# ----------------------------------------------

def calculate_life_stage_score(
    life_stage: str,
    pet_age_group: str,
    calcium_pct: float,
    phosphorus_pct: float,
    dha: Optional[float],
    fiber_pct: float,
    omega_3: Optional[float],
    name: str = "your dog"
) -> tuple[float, List[str]]:
    """
    Calculate life stage nutrition score based on age-specific needs.

    Different life stages have distinct nutritional requirements:
    - Puppies need Ca:P ratio for bone growth + DHA for brain development
    - Seniors need fiber for digestion + Omega-3 for aging joints
    - Adults need balanced nutrients + life stage formulation match

    Point Breakdown by Life Stage:
    ┌──────────┬──────────────────────────────┬──────────┐
    │ Stage    │ Criteria                     │ Points   │
    ├──────────┼──────────────────────────────┼──────────┤
    │ Puppy    │ Life stage match             │ 0-3 pts  │
    │          │ Ca:P ratio (1.0-1.8 optimal) │ 0-5 pts  │
    │          │ DHA for brain development    │ 0-4 pts  │
    ├──────────┼──────────────────────────────┼──────────┤
    │ Senior   │ Life stage match             │ 0-3 pts  │
    │          │ Fiber for digestion          │ 0-5 pts  │
    │          │ Omega-3 for joints           │ 0-5 pts  │
    ├──────────┼──────────────────────────────┼──────────┤
    │ Adult    │ Life stage match             │ 0-5 pts  │
    │          │ Ca:P balance                 │ 0-5 pts  │
    │          │ Omega-3 general bonus        │ 0-3 pts  │
    └──────────┴──────────────────────────────┴──────────┘

    Returns:
        tuple[float, List[str]]: (score capped at 15, list of reasons)
    """
    score = 0.0
    reasons = []
    age = pet_age_group.lower()
    stage = life_stage.lower()

    # Calculate Ca:P ratio (guard against zero division)
    ca_p_ratio = calcium_pct / phosphorus_pct if phosphorus_pct and phosphorus_pct > 0 else 0

    if age == "puppy":
        # Life stage match
        if stage in ["puppy", "all"]:
            score += 3
            reasons.append(f"Formulated for {name}'s puppy life stage")

        # Ca:P ratio for growing bones (neutral 7/15 if data missing)
        if not calcium_pct or not phosphorus_pct:
            return 7.0, reasons if reasons else [f"Standard nutrition for {name}"]
        if 1.0 <= ca_p_ratio <= 1.8:
            score += 5
            reasons.append(f"Optimal calcium-phosphorus ratio for {name}'s growing bones")
        elif 0.8 <= ca_p_ratio <= 2.0:
            score += 3

        # DHA for brain and eye development
        if dha and dha >= 0.1:
            score += 4
            reasons.append(f"DHA ({dha}%) supports {name}'s brain and eye development")
        elif dha and dha >= 0.05:
            score += 2

    elif age == "senior":
        # Life stage match
        if stage in ["senior", "all"]:
            score += 3
            reasons.append(f"Formulated for {name}'s senior life stage")

        # Fiber for senior digestion
        if fiber_pct >= 5:
            score += 5
            reasons.append(f"High fiber ({fiber_pct}%) supports {name}'s senior digestion")
        elif fiber_pct >= 3.5:
            score += 3

        # Omega-3 for aging joints
        if omega_3 and omega_3 >= 0.8:
            score += 5
            reasons.append(f"Excellent Omega-3 ({omega_3}%) for {name}'s aging joints")
        elif omega_3 and omega_3 >= 0.5:
            score += 3

    elif age == "adult":
        # Life stage match
        if stage in ["adult", "all"]:
            score += 5
            reasons.append(f"Formulated for {name}'s adult life stage")

        # Balanced Ca:P (neutral 7/15 if data missing)
        if not calcium_pct or not phosphorus_pct:
            return 7.0, reasons if reasons else [f"Standard nutrition for {name}"]
        if 1.0 <= ca_p_ratio <= 2.0:
            score += 5

        # General nutrient bonus
        if omega_3 and omega_3 >= 0.3:
            score += 3

    # Cap at 15 points max
    return min(score, 15.0), reasons


# ----------------------------------------------
# Main Scoring Function: Orchestrates All Scores
# ----------------------------------------------

def score_product_for_pet(product: dict, pet_profile: dict, price_percentiles: dict = None) -> tuple[float, List[str]]:
    """
    Calculate overall compatibility score for a product given a pet profile.

    This is the main orchestrator that:
    1. Applies HARD FILTERS (allergies, kibble size) - returns 0 if failed
    2. Calls all 5 scoring functions
    3. Adds up total score (max 100 points)
    4. Returns score and list of reasons

    Score Breakdown (max 100):
    | Factor              | Points | Function                              |
    |---------------------|--------|---------------------------------------|
    | Activity + Diet Goal| 0-40   | calculate_activity_goal_score()       |
    | Nutritional Quality | 0-25   | calculate_nutritional_quality_score() |
    | Life Stage Nutrition| 0-15   | calculate_life_stage_score()          |
    | Ingredient Quality  | 0-10   | calculate_ingredient_quality_score()  |
    | Breed/Kibble Size   | 0-5    | calculate_breed_size_score()          |
    | Price Value         | 0-5    | Percentile-based in orchestrator      |

    Args:
        product: MongoDB product document (dict)
        pet_profile: Pet profile with keys: name, breedSize, ageGroup, activityLevel, weightGoal, allergies
        price_percentiles: Dict with keys "p25", "p50", "p75" for percentile-based price scoring

    Returns:
        tuple[float, List[str]]: (total_score 0-100, list of reason strings)
    """
    total_score = 0.0
    all_reasons = []

    # --- Extract pet info from profile ---
    name = pet_profile.get("name", "your dog")
    pet_breed_size = pet_profile.get("breedSize", "medium")
    pet_age_group = pet_profile.get("ageGroup", "adult")
    pet_activity = pet_profile.get("activityLevel", "medium")
    pet_goal = pet_profile.get("weightGoal", "maintenance")
    # Convert allergies to lowercase for case-insensitive matching
    pet_allergies = [a.lower().strip() for a in pet_profile.get("allergies", [])]

    # --- Extract product info from MongoDB document ---
    product_kibble = product.get("kibble_size", "regular")
    product_life_stage = product.get("life_stage", "all")
    protein_pct = product.get("protein_pct") or 0      # Use 0 if None
    fat_pct = product.get("fat_pct") or 0
    fiber_pct = product.get("fiber_pct") or 0
    calcium_pct = product.get("calcium_pct") or 0
    phosphorus_pct = product.get("phosphorus_pct") or 0
    omega_3 = product.get("omega_3_fatty_acids")       # Keep as None if missing
    dha = product.get("DHA")
    epa = product.get("EPA")
    kcal_per_kg = product.get("kcal_per_kg")
    ingredients = product.get("ingredients", "")
    primary_proteins = product.get("primary_proteins", "")
    allergen_tags = product.get("allergen_tags", "")
    price_per_kg = product.get("price_per_kg")

    # ==========================================
    # HARD FILTERS - Instant Disqualification
    # ==========================================
    # These return 0 immediately. A product with allergens is dangerous
    # no matter how good its nutrition is.

    # Hard Filter 1: Allergy check
    # Split allergen_tags string into set: "chicken,beef" → {"chicken", "beef"}
    # Uses set intersection for exact match — "fish" won't match "shellfish"
    product_allergens = {a.lower().strip() for a in allergen_tags.split(',') if a.strip()}
    pet_allergy_set = set(pet_allergies)
    if product_allergens & pet_allergy_set:
        return 0.0, ["Contains allergens - NOT RECOMMENDED"]

    # Hard Filter 2: Kibble size incompatibility
    pet_size = pet_breed_size.lower()
    kibble = product_kibble.lower()

    # Small dogs cannot eat large kibble (too hard to chew)
    if pet_size == "small" and kibble == "large":
        return 0.0, ["Kibble too large for small breed"]

    # Large dogs should not eat small kibble (choking hazard, not satisfying)
    if pet_size == "large" and kibble == "small":
        return 0.0, ["Kibble too small for large breed"]

    # Medium dogs need regular kibble
    if pet_size == "medium" and kibble in ["small", "large"]:
        return 0.0, ["Kibble size not suitable for medium breed"]

    # ==========================================
    # SOFT SCORING - Add points for good matches
    # ==========================================
    # Products that pass hard filters get scored on quality/fit.

    # Score 1: Activity + Weight Goal Match (0-40 points) - Most Important!
    activity_score, activity_reasons = calculate_activity_goal_score(
        pet_activity, pet_goal, protein_pct, fat_pct, fiber_pct, name
    )
    total_score += activity_score
    all_reasons.extend(activity_reasons)

    # Score 2: Nutritional Quality (0-25 points)
    nutrition_score, nutrition_reasons = calculate_nutritional_quality_score(
        protein_pct, fat_pct, omega_3, dha, epa, kcal_per_kg, name
    )
    total_score += nutrition_score
    all_reasons.extend(nutrition_reasons)

    # Score 3: Life Stage Nutrition (0-15 points)
    life_stage_score, life_stage_reasons = calculate_life_stage_score(
        product_life_stage, pet_age_group, calcium_pct, phosphorus_pct,
        dha, fiber_pct, omega_3, name
    )
    total_score += life_stage_score
    all_reasons.extend(life_stage_reasons)

    # Score 4: Ingredient Quality (0-10 points)
    ingredient_score, ingredient_reasons = calculate_ingredient_quality_score(
        ingredients, primary_proteins, name
    )
    total_score += ingredient_score
    all_reasons.extend(ingredient_reasons)

    # Score 5: Breed/Kibble Size Match (0-5 points)
    breed_score, breed_reason = calculate_breed_size_score(pet_breed_size, product_kibble, name)
    total_score += breed_score
    if breed_reason:
        all_reasons.append(breed_reason)

    # Score 6: Price Value (0-5 points) — percentile-based, 3-5 range
    price_score = 0.0
    if price_per_kg and price_per_kg > 0 and price_percentiles:
        if price_per_kg <= price_percentiles["p25"]:
            price_score = 5.0
            all_reasons.append(f"Excellent value for {name} — priced in bottom 25%")
        elif price_per_kg <= price_percentiles["p50"]:
            price_score = 4.0
            all_reasons.append(f"Good value for {name}")
        elif price_per_kg <= price_percentiles["p75"]:
            price_score = 3.5
        else:
            price_score = 3.0
    else:
        price_score = 4.0  # Neutral score when pricing info is missing

    total_score += price_score

    # Allergy-safe reason — when pet has allergies and product passed the check
    if pet_allergies:
        allergen_list = ", ".join(pet_allergies)
        all_reasons.append(f"Allergy safe — no {allergen_list} detected for {name}")

    return total_score, all_reasons


# ----------------------------------------------
# Recommendation API Endpoint
# ----------------------------------------------

@app.get("/api/recommendations/{pet_id}")
@limiter.limit("20/minute")
async def get_recommendations(request: Request, pet_id: str):
    """
    Get personalized dog food recommendations for a specific pet.

    This is the main endpoint that powers the recommendation feature!

    URL: GET /api/recommendations/507f1f77bcf86cd799439011

    Flow:
    1. Fetch pet profile from database
    2. Query products with hard filters (dry food, matching life stage)
    3. Score each product using score_product_for_pet()
    4. Filter to products with score >= 50
    5. Sort by score (highest first)
    6. Return top 40 recommendations (frontend displays 20, filters reveal more)

    Response:
    {
        "pet": { pet profile },
        "total_matches": 42,
        "recommendations": [
            { "product": {...}, "score": 87.5, "match_percentage": 87, "reasons": [...] },
            ...
        ]
    }
    """
    try:
        # Step 1: Fetch pet profile by public UUID
        pet = await pets_collection.find_one({"public_id": pet_id})
        if not pet:
            raise HTTPException(status_code=404, detail="Pet not found")

        # Build pet profile dict for scoring functions
        pet_profile = {
            "name": pet.get("name", "your dog"),
            "ageGroup": pet.get("ageGroup", "adult"),
            "breedSize": pet.get("breedSize", "medium"),
            "activityLevel": pet.get("activityLevel", "medium"),
            "weightGoal": pet.get("weightGoal", "maintenance"),
            "allergies": pet.get("allergies", [])
        }

        # Step 2: Query products with database-level hard filters
        # These filters run in MongoDB (fast) before we score in Python
        query = {
            "format": "dry",  # Only dry food (wet food not yet supported)
        }

        # Life stage must match pet's age OR be "all life stages"
        # MongoDB $or operator: matches if ANY condition is true
        pet_age = pet_profile["ageGroup"].lower()
        query["$or"] = [
            {"life_stage": pet_age},      # e.g., "puppy", "adult", "senior"
            {"life_stage": "all"}          # Products for all life stages
        ]

        # Fetch all matching products
        all_products = []
        async for product in products_collection.find(query):
            all_products.append(product)

        # Handle case where no products match basic criteria
        if not all_products:
            return {
                "pet": pet_profile,
                "recommendations": [],
                "message": "No products found matching basic criteria"
            }

        # Step 3: Compute price percentiles for percentile-based scoring
        prices = sorted([p.get("price_per_kg") for p in all_products
                         if p.get("price_per_kg") and p["price_per_kg"] > 0])
        if prices:
            price_percentiles = {
                "p25": prices[len(prices) // 4],
                "p50": prices[len(prices) // 2],
                "p75": prices[3 * len(prices) // 4],
            }
        else:
            price_percentiles = None

        # Step 4: Score each product using our scoring algorithm
        scored_products = []
        allergy_filtered = 0
        pet_allergies = [a.lower().strip() for a in pet_profile.get("allergies", [])]

        for product in all_products:
            # Secondary allergen safety net: scan raw ingredients text
            # Catches allergens missing from allergen_tags (data quality issue)
            if pet_allergies:
                ingredients_lower = product.get("ingredients", "").lower()
                allergen_tags_lower = product.get("allergen_tags", "").lower()
                found_allergen = None
                for allergen in pet_allergies:
                    if allergen in ingredients_lower:
                        found_allergen = allergen
                        if allergen not in allergen_tags_lower:
                            logger.warning(
                                "Data quality: '%s' found in ingredients but not in allergen_tags for product '%s'",
                                allergen, product.get("_id", "unknown")
                            )
                        break
                if found_allergen:
                    allergy_filtered += 1
                    continue

            score, reasons = score_product_for_pet(product, pet_profile, price_percentiles)

            # Only include products with score >= 50 (decent match)
            if score >= 50:
                scored_products.append({
                    "product": product_helper(product),
                    "score": round(score, 1),           # Round to 1 decimal
                    "match_percentage": int(score),      # Integer for display
                    "reasons": reasons[:3],              # Show top 3 reasons only
                    "allergy_safe": True,                # Always True — disqualified products get score 0
                })

        # Step 5: Sort by score (highest first) and limit to top 40
        # lambda x: x["score"] means "sort by the 'score' field"
        # reverse=True means descending order (highest first)
        scored_products.sort(key=lambda x: x["score"], reverse=True)
        top_recommendations = scored_products[:40]  # Send up to 40 (frontend displays 20, filters reveal more)

        return {
            "pet": pet_profile,
            "total_products": len(all_products),         # Total products before filtering
            "allergy_filtered": allergy_filtered,         # Products removed due to allergies
            "total_matches": len(scored_products),        # How many products scored 50+
            "recommendations": top_recommendations        # Top 40 products
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error generating recommendations for pet %s: %s", pet_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")



# End of main.py

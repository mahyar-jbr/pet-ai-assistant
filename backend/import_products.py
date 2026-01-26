"""
Pet AI Assistant - Product Import Script

This script imports dog food product data from a Google Sheet into MongoDB.
It's the data pipeline that populates your products collection.

Data Flow:
    Google Sheets (CSV) → This Script → MongoDB (products collection)

How to run:
    cd backend
    python import_products.py

When to run:
    - Initial setup (to populate the database)
    - When you update the Google Sheet with new products
    - Periodically to refresh product data

Note: This uses PyMongo (sync) instead of Motor (async) because it's a
one-time script, not a web server. No need for async complexity here.
"""

# ============================================
# Imports
# ============================================

import csv                          # Python's built-in CSV parser
import requests                     # HTTP library for fetching the Google Sheet
from pymongo import MongoClient     # Sync MongoDB driver (not Motor - this is a script)
from datetime import datetime       # For timestamping imports


# ============================================
# Configuration
# ============================================

# Google Sheets "Publish to Web" URL (File → Share → Publish to web → CSV)
# This makes spreadsheet accessible as a CSV file
GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGY9w6n0sjw341N8bHRAsczyRqP9MCim6QZuRX8sAs6YVkpg8x6rVMW6B7DvuX750HiClYKokdJgbr/pub?gid=107126253&single=true&output=csv"

# MongoDB connection settings
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "petai"
COLLECTION_NAME = "products"


# ============================================
# Parser Functions (CSV String → Python Types)
# ============================================

# CSV data is always strings. These functions safely convert to proper types.
# "Safely" means they won't crash on empty or invalid values.


def parse_float(value):
    """
    Convert CSV string to float. Returns None if empty/invalid.

    Examples: "38.5" → 38.5, "" → None, "N/A" → None
    """
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_int(value):
    """
    Convert CSV string to int. Returns None if empty/invalid.

    Note: Goes through float first to handle "123.0" from spreadsheets.
    Examples: "100" → 100, "100.0" → 100, "" → None
    """
    if value is None or value == '':
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def parse_bool(value):
    """
    Convert CSV string to boolean. Returns False if empty/invalid.

    Truthy values: "TRUE", "true", "1", "YES", "T"
    Everything else (including empty): False
    """
    if value is None or value == '':
        return False
    if isinstance(value, bool):
        return value
    value_str = str(value).upper()
    return value_str in ('TRUE', '1', 'YES', 'T')


# ============================================
# Data Transformation
# ============================================

def clean_row(row):
    """
    Transform a CSV row (dict of strings) into a MongoDB document.

    Key operations:
    - .strip() removes whitespace from strings
    - .lower() normalizes categories (dry/DRY/Dry → dry)
    - parse_* functions convert strings to proper types
    - _id is set to product ID (enables upsert without duplicates)
    """
    return {
        # --- Identity (using product ID as MongoDB _id for upserts) ---
        "_id": row.get('id', '').strip(),
        "brand": row.get('brand', '').strip(),
        "line": row.get('line', '').strip(),

        # --- Classification (normalized to lowercase) ---
        "format": row.get('format', '').strip().lower(),
        "life_stage": row.get('life_stage', '').strip().lower(),
        "breed_size": row.get('breed_size', '').strip().lower(),

        # --- Ingredients ---
        "primary_proteins": row.get('primary_proteins', '').strip(),
        "grain_free": parse_bool(row.get('grain_free')),
        "ingredients": row.get('ingredients', '').strip(),
        "allergen_tags": row.get('allergen_tags', '').strip(),

        # --- Nutritional Percentages ---
        "protein_pct": parse_float(row.get('protein_pct')),
        "fat_pct": parse_float(row.get('fat_pct')),
        "ash_pct": parse_float(row.get('ash_pct')),
        "fiber_pct": parse_float(row.get('fiber_pct')),
        "moisture_pct": parse_float(row.get('moisture_pct')),
        "calcium_pct": parse_float(row.get('calcium_pct')),
        "phosphorus_pct": parse_float(row.get('phosphorus_pct')),
        "omega_6_fatty_acids": parse_float(row.get('omega_6_fatty_acids')),
        "omega_3_fatty_acids": parse_float(row.get('omega_3_fatty_acids')),
        "DHA": parse_float(row.get('DHA')),
        "EPA": parse_float(row.get('EPA')),

        # --- Calorie Information ---
        "kcal_per_cup": parse_int(row.get('kcal_per_cup')),
        "kcal_per_kg": parse_int(row.get('kcal_per_kg')),

        # --- Product Details ---
        "kibble_size": row.get('kibble_size', '').strip(),
        "tags": row.get('tags', '').strip(),
        "size_kg": parse_float(row.get('size_kg')),
        "price": parse_float(row.get('price')),
        "price_per_kg": parse_float(row.get('price_per_kg')),
        "retailer": row.get('retailer', '').strip(),
        "image": row.get('image', '').strip(),
        "source_url": row.get('source_url', '').strip(),

        # --- Timestamps ---
        "updated_at": row.get('updated_at', '').strip(),
        "imported_at": datetime.utcnow().isoformat()
    }


# ============================================
# Step 1: Fetch Data from Google Sheets
# ============================================

def fetch_csv_data(url):
    """
    Download CSV from Google Sheets and parse into list of dicts.

    Returns: [{"id": "...", "brand": "...", ...}, ...] or [] on error
    """
    print(f"Fetching data from Google Sheets...")
    try:
        # HTTP GET request to download CSV
        response = requests.get(url, timeout=30)
        response.raise_for_status()  # Raise exception if not 200 OK

        # Parse CSV: split into lines, then parse with headers
        lines = response.text.splitlines()
        reader = csv.DictReader(lines)  # First row = column names
        rows = list(reader)

        print(f"Fetched {len(rows)} products from CSV")
        return rows

    except requests.exceptions.RequestException as e:
        print(f"Error fetching CSV: {e}")
        return []


# ============================================
# Step 2: Import to MongoDB
# ============================================

def import_to_mongodb(rows):
    """
    Clean CSV rows and insert/update them in MongoDB.

    Uses upsert pattern: if product exists (by _id), update it.
    If not, insert it. This prevents duplicates on re-runs.
    """
    if not rows:
        print("No data to import")
        return

    try:
        # Connect to MongoDB (sync client, not async Motor)
        print(f"Connecting to MongoDB: {MONGODB_URL}")
        client = MongoClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]

        # Clean and prepare documents
        print(f"Cleaning and preparing {len(rows)} products...")
        documents = []
        skipped = 0

        for row in rows:
            product_id = row.get('id', '').strip()
            if not product_id:
                skipped += 1  # Skip rows without ID
                continue

            doc = clean_row(row)
            documents.append(doc)

        if skipped > 0:
            print(f"Skipped {skipped} products without IDs")

        if not documents:
            print("No valid products to import")
            return

        # Import using upsert (update if exists, insert if new)
        print(f"Importing {len(documents)} products to MongoDB...")

        inserted_count = 0
        updated_count = 0

        for doc in documents:
            # replace_one with upsert=True: insert or update in one operation
            result = collection.replace_one(
                {"_id": doc["_id"]},  # Find by _id
                doc,                   # Replace with this document
                upsert=True            # Insert if not found
            )
            if result.upserted_id:
                inserted_count += 1
            elif result.modified_count > 0:
                updated_count += 1

        print(f"Import complete!")
        print(f"   - {inserted_count} new products inserted")
        print(f"   - {updated_count} existing products updated")
        print(f"   - Total products in database: {collection.count_documents({})}")

        # Show database statistics
        print(f"\nDatabase Statistics:")
        print(f"   - Brands: {len(collection.distinct('brand'))}")
        print(f"   - Formats: {collection.distinct('format')}")
        print(f"   - Life stages: {collection.distinct('life_stage')}")
        print(f"   - Breed sizes: {collection.distinct('breed_size')}")

        # Close connection
        client.close()
        print(f"\nAll done!")

    except Exception as e:
        print(f"Error importing to MongoDB: {e}")
        import traceback
        traceback.print_exc()


# ============================================
# Main Entry Point
# ============================================

def main():
    """
    Main function that orchestrates the import process.

    Steps:
    1. Fetch CSV data from Google Sheets
    2. Import cleaned data to MongoDB
    """
    print("=" * 60)
    print("Pet AI Assistant - Product Import Script")
    print("=" * 60)
    print()

    # Step 1: Fetch data from Google Sheets
    rows = fetch_csv_data(GOOGLE_SHEETS_CSV_URL)

    if not rows:
        print("\nImport failed: No data retrieved")
        return

    # Step 2: Import to MongoDB
    import_to_mongodb(rows)


# This runs only when you execute: python import_products.py
# It won't run if this file is imported as a module
if __name__ == "__main__":
    main()
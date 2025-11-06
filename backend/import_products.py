"""
CSV Product Import Script
Fetches dog food data from Google Sheets and imports to MongoDB
"""

import csv
import requests
from pymongo import MongoClient
from datetime import datetime

# Configuration
GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGY9w6n0sjw341N8bHRAsczyRqP9MCim6QZuRX8sAs6YVkpg8x6rVMW6B7DvuX750HiClYKokdJgbr/pub?gid=107126253&single=true&output=csv"
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "petai"
COLLECTION_NAME = "products"


def parse_float(value):
    """Safely parse float values"""
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_int(value):
    """Safely parse integer values"""
    if value is None or value == '':
        return None
    try:
        return int(float(value))  # Convert to float first in case of "123.0"
    except (ValueError, TypeError):
        return None


def parse_bool(value):
    """Safely parse boolean values"""
    if value is None or value == '':
        return False
    if isinstance(value, bool):
        return value
    value_str = str(value).upper()
    return value_str in ('TRUE', '1', 'YES', 'T')


def clean_row(row):
    """Clean and transform a CSV row into a product document"""
    return {
        "_id": row.get('id', '').strip(),  # Use product ID as MongoDB _id
        "brand": row.get('brand', '').strip(),
        "line": row.get('line', '').strip(),
        "format": row.get('format', '').strip().lower(),
        "life_stage": row.get('life_stage', '').strip().lower(),
        "breed_size": row.get('breed_size', '').strip().lower(),
        "primary_proteins": row.get('primary_proteins', '').strip(),
        "grain_free": parse_bool(row.get('grain_free')),
        "ingredients": row.get('ingredients', '').strip(),
        "allergen_tags": row.get('allergen_tags', '').strip(),

        # Nutritional information
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

        # Calories
        "kcal_per_cup": parse_int(row.get('kcal_per_cup')),
        "kcal_per_kg": parse_int(row.get('kcal_per_kg')),

        # Additional info
        "kibble_size": row.get('kibble_size', '').strip(),
        "tags": row.get('tags', '').strip(),
        "size_kg": parse_float(row.get('size_kg')),
        "price": parse_float(row.get('price')),
        "price_per_kg": parse_float(row.get('price_per_kg')),
        "retailer": row.get('retailer', '').strip(),
        "image": row.get('image', '').strip(),
        "source_url": row.get('source_url', '').strip(),
        "updated_at": row.get('updated_at', '').strip(),
        "imported_at": datetime.utcnow().isoformat()
    }


def fetch_csv_data(url):
    """Fetch CSV data from Google Sheets"""
    print(f"📥 Fetching data from Google Sheets...")
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Parse CSV
        lines = response.text.splitlines()
        reader = csv.DictReader(lines)
        rows = list(reader)

        print(f"✅ Fetched {len(rows)} products from CSV")
        return rows

    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching CSV: {e}")
        return []


def import_to_mongodb(rows):
    """Import products to MongoDB"""
    if not rows:
        print("❌ No data to import")
        return

    try:
        # Connect to MongoDB
        print(f"🔌 Connecting to MongoDB: {MONGODB_URL}")
        client = MongoClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]

        # Clean and prepare documents
        print(f"🧹 Cleaning and preparing {len(rows)} products...")
        documents = []
        skipped = 0

        for row in rows:
            product_id = row.get('id', '').strip()
            if not product_id:
                skipped += 1
                continue

            doc = clean_row(row)
            documents.append(doc)

        if skipped > 0:
            print(f"⚠️  Skipped {skipped} products without IDs")

        if not documents:
            print("❌ No valid products to import")
            return

        # Import to MongoDB (upsert to avoid duplicates)
        print(f"💾 Importing {len(documents)} products to MongoDB...")

        inserted_count = 0
        updated_count = 0

        for doc in documents:
            result = collection.replace_one(
                {"_id": doc["_id"]},
                doc,
                upsert=True
            )
            if result.upserted_id:
                inserted_count += 1
            elif result.modified_count > 0:
                updated_count += 1

        print(f"✅ Import complete!")
        print(f"   • {inserted_count} new products inserted")
        print(f"   • {updated_count} existing products updated")
        print(f"   • Total products in database: {collection.count_documents({})}")

        # Show some stats
        print(f"\n📊 Database Statistics:")
        print(f"   • Brands: {len(collection.distinct('brand'))}")
        print(f"   • Formats: {collection.distinct('format')}")
        print(f"   • Life stages: {collection.distinct('life_stage')}")
        print(f"   • Breed sizes: {collection.distinct('breed_size')}")

        # Close connection
        client.close()
        print(f"\n🎉 All done!")

    except Exception as e:
        print(f"❌ Error importing to MongoDB: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main execution"""
    print("=" * 60)
    print("🐕 Pet AI Assistant - Product Import Script")
    print("=" * 60)
    print()

    # Fetch data from Google Sheets
    rows = fetch_csv_data(GOOGLE_SHEETS_CSV_URL)

    if not rows:
        print("\n❌ Import failed: No data retrieved")
        return

    # Import to MongoDB
    import_to_mongodb(rows)


if __name__ == "__main__":
    main()
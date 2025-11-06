"""
Scraper Pipeline - Orchestrates scraping and data storage
"""

import sys
import os
from pathlib import Path
from typing import List, Dict
import json
from datetime import datetime

# Add parent directory to path to import from utils and scrapers
sys.path.append(str(Path(__file__).parent.parent))

from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

from scrapers.orijen_scraper import OrijenScraper
from utils.data_normalizer import ProductNormalizer, ProductValidator


class ScraperPipeline:
    """Pipeline for scraping and storing product data"""

    def __init__(self, mongo_uri: str = None, db_name: str = "pet_food_db"):
        """
        Initialize pipeline

        Args:
            mongo_uri: MongoDB connection string
            db_name: Database name
        """
        # Load environment variables
        load_dotenv()

        self.mongo_uri = mongo_uri or os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
        self.db_name = db_name

        # Connect to MongoDB
        self.client = MongoClient(self.mongo_uri)
        self.db = self.client[self.db_name]
        self.collection = self.db['products']

        # Initialize normalizer and validator
        self.normalizer = ProductNormalizer()
        self.validator = ProductValidator()

    def run_orijen_scraper(self, save_to_db: bool = True, save_to_file: bool = True):
        """
        Run Orijen scraper and process results

        Args:
            save_to_db: Whether to save to MongoDB
            save_to_file: Whether to save to JSON file
        """
        print("="*70)
        print("Starting Orijen Product Scraper Pipeline")
        print("="*70)

        # Initialize scraper
        scraper = OrijenScraper(delay=2.0)

        # Scrape products
        print("\nStep 1: Scraping products from Orijen website...")
        raw_products = scraper.scrape_all_products()
        print(f"✓ Scraped {len(raw_products)} raw products\n")

        # Normalize and validate
        print("Step 2: Normalizing and validating data...")
        normalized_products = []
        skipped = 0
        warnings_count = 0

        for raw_product in raw_products:
            # Normalize
            normalized = self.normalizer.normalize(raw_product)

            # Validate
            is_valid, warnings = self.validator.validate(normalized)

            if is_valid:
                normalized_products.append(normalized)
                if warnings:
                    warnings_count += len(warnings)
                    print(f"  ⚠ {normalized['name']}: {len(warnings)} warning(s)")
            else:
                skipped += 1
                print(f"  ✗ Skipped {normalized.get('name', 'Unknown')}: Invalid data")

        print(f"\n✓ Normalized {len(normalized_products)} products")
        print(f"  Skipped: {skipped}")
        print(f"  Warnings: {warnings_count}\n")

        # Save to file
        if save_to_file and normalized_products:
            print("Step 3: Saving to JSON file...")
            self._save_to_file(normalized_products)

        # Save to MongoDB
        if save_to_db and normalized_products:
            print("Step 4: Saving to MongoDB...")
            self._save_to_mongodb(normalized_products)

        print("\n" + "="*70)
        print("Pipeline completed successfully!")
        print("="*70)

        return normalized_products

    def _save_to_file(self, products: List[Dict]):
        """Save products to JSON file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"orijen_products_{timestamp}.json"
        filepath = Path(__file__).parent.parent / 'data' / filename

        # Ensure data directory exists
        filepath.parent.mkdir(exist_ok=True)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(products, f, indent=2, ensure_ascii=False)

        print(f"✓ Saved to {filepath}")

    def _save_to_mongodb(self, products: List[Dict]):
        """Save products to MongoDB with upsert (update or insert)"""
        operations = []

        for product in products:
            # Create unique identifier based on brand + name
            filter_query = {
                'brand': product['brand'],
                'name': product['name']
            }

            # Use upsert to update existing or insert new
            operation = UpdateOne(
                filter_query,
                {'$set': product},
                upsert=True
            )
            operations.append(operation)

        if operations:
            result = self.collection.bulk_write(operations)
            print(f"✓ MongoDB operations:")
            print(f"  Inserted: {result.upserted_count}")
            print(f"  Modified: {result.modified_count}")
            print(f"  Total: {len(operations)}")

    def get_stats(self):
        """Get statistics about stored products"""
        total = self.collection.count_documents({})
        by_brand = list(self.collection.aggregate([
            {'$group': {'_id': '$brand', 'count': {'$sum': 1}}}
        ]))

        print(f"\nDatabase Statistics:")
        print(f"  Total products: {total}")
        print(f"  By brand:")
        for item in by_brand:
            print(f"    - {item['_id']}: {item['count']}")

    def close(self):
        """Close MongoDB connection"""
        self.client.close()


if __name__ == '__main__':
    # Run the pipeline
    pipeline = ScraperPipeline()

    try:
        # Run Orijen scraper
        products = pipeline.run_orijen_scraper(
            save_to_db=True,
            save_to_file=True
        )

        # Show stats
        pipeline.get_stats()

        # Show sample product
        if products:
            print("\n" + "="*70)
            print("Sample Product:")
            print("="*70)
            print(json.dumps(products[0], indent=2))

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        pipeline.close()

"""
Test script for Orijen scraper
Tests scraping a single product without saving to database
"""

import sys
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).parent))

from scrapers.orijen_scraper import OrijenScraper
from utils.data_normalizer import ProductNormalizer, ProductValidator
import json


def test_single_product():
    """Test scraping a single Orijen product"""
    print("="*70)
    print("Testing Orijen Scraper - Single Product")
    print("="*70)

    # Initialize scraper
    scraper = OrijenScraper(delay=1.0)

    # Get product links
    print("\n1. Fetching product listing...")
    try:
        links = scraper._get_product_links()
        print(f"✓ Found {len(links)} product links")

        if not links:
            print("❌ No products found! Website structure may have changed.")
            return

        # Test first product
        test_url = links[0]
        print(f"\n2. Testing single product: {test_url}")

        raw_data = scraper._scrape_product_page(test_url)

        print("\n3. Raw scraped data:")
        print(json.dumps(raw_data, indent=2))

        # Normalize
        print("\n4. Normalizing data...")
        normalizer = ProductNormalizer()
        normalized = normalizer.normalize(raw_data)

        print("\n5. Normalized data:")
        print(json.dumps(normalized, indent=2, default=str))

        # Validate
        print("\n6. Validating data...")
        validator = ProductValidator()
        is_valid, warnings = validator.validate(normalized)

        print(f"\nValidation Result:")
        print(f"  Valid: {is_valid}")
        if warnings:
            print(f"  Warnings ({len(warnings)}):")
            for warning in warnings:
                print(f"    - {warning}")
        else:
            print("  No warnings!")

        print("\n" + "="*70)
        print("✓ Test completed successfully!")
        print("="*70)

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    test_single_product()

"""
Pet AI Assistant - Data Normalizer

This module transforms raw scraped product data into a standardized format
for MongoDB storage. It's used by web scrapers to ensure consistent data.

Data Flow:
    Web Scraper → ProductNormalizer → ProductValidator → MongoDB

Two main classes:
    1. ProductNormalizer: Cleans and standardizes scraped data
    2. ProductValidator: Checks data quality before saving

Usage:
    from utils.data_normalizer import ProductNormalizer, ProductValidator

    raw_data = scraper.get_product()
    normalized = ProductNormalizer.normalize(raw_data)
    is_valid, warnings = ProductValidator.validate(normalized)
"""

# ============================================
# Imports
# ============================================

from typing import Dict, List, Optional
import re   # Regular expressions for pattern matching


# ============================================
# ProductNormalizer Class
# ============================================

class ProductNormalizer:
    """
    Transforms raw scraped product data into standardized MongoDB format.

    All methods are @staticmethod - no instance needed.
    Call directly: ProductNormalizer.normalize(data)
    """

    @staticmethod
    def normalize(scraped_data: Dict) -> Dict:
        """
        Main entry point - normalize scraped product data to MongoDB schema.

        Args:
            scraped_data: Raw dict from web scraper (inconsistent formats)

        Returns:
            Clean dict ready for MongoDB insertion

        Example:
            Input:  {"brand": "ORIJEN", "form": "Dry Kibble", ...}
            Output: {"brand": "ORIJEN", "form": "dry", ...}
        """
        # --- Base Product Info ---
        product = {
            'brand': scraped_data.get('brand', ''),
            'name': scraped_data.get('name', ''),
            'line': scraped_data.get('line', ''),
            'form': ProductNormalizer._normalize_form(scraped_data.get('form', 'dry')),
            'url': scraped_data.get('url', ''),
            'image': scraped_data.get('image_url', ''),
            'source': scraped_data.get('source', 'unknown'),
            'last_updated': scraped_data.get('scraped_at', ''),
        }

        # Nutritional data
        product['protein_pct'] = scraped_data.get('protein_pct')
        product['fat_pct'] = scraped_data.get('fat_pct')
        product['fiber_pct'] = scraped_data.get('fiber_pct')
        product['moisture_pct'] = scraped_data.get('moisture_pct')
        product['ash_pct'] = scraped_data.get('ash_pct')
        product['calcium_pct'] = scraped_data.get('calcium_pct')
        product['phosphorus_pct'] = scraped_data.get('phosphorus_pct')
        product['omega3_pct'] = scraped_data.get('omega3_pct')
        product['omega6_pct'] = scraped_data.get('omega6_pct')

        # Ingredients
        product['ingredients'] = scraped_data.get('ingredients', '')

        # AAFCO statement
        product['aafco_statement'] = scraped_data.get('aafco_statement', '')

        # Feeding facts
        feeding_facts = scraped_data.get('feeding_facts', {})
        product['kcal_per_kg'] = feeding_facts.get('kcal_per_kg')
        product['kcal_per_cup'] = feeding_facts.get('kcal_per_cup')

        # Bag sizes and pricing
        bag_sizes = scraped_data.get('bag_sizes', [])
        product['available_sizes'] = ProductNormalizer._normalize_bag_sizes(bag_sizes)

        # Tags for filtering
        product['tags'] = ProductNormalizer._normalize_tags(scraped_data.get('tags', []))

        # Determine breed size compatibility
        product['size'] = ProductNormalizer._determine_breed_size(product)

        # Determine life stage
        product['stage'] = ProductNormalizer._determine_life_stage(product)

        return product

    # ------------------------------------------
    # Helper Methods (private, start with _)
    # ------------------------------------------

    @staticmethod
    def _normalize_form(form: str) -> str:
        """
        Standardize food form to: dry, wet, or raw.

        Examples: "Dry Kibble" → "dry", "Wet Can" → "wet"
        """
        form_lower = form.lower()
        if 'dry' in form_lower or 'kibble' in form_lower:
            return 'dry'
        elif 'wet' in form_lower or 'can' in form_lower:
            return 'wet'
        elif 'raw' in form_lower or 'freeze' in form_lower:
            return 'raw'
        return 'dry'

    @staticmethod
    def _normalize_bag_sizes(sizes: List[str]) -> List[Dict]:
        """
        Convert bag size strings to structured format.

        Example:
            Input: ["6kg", "25lb"]
            Output: [{"original": "6kg", "weight_lb": 13.2, "unit": "kg"}, ...]
        """
        normalized = []
        seen_weights = set()  # Track to avoid duplicates

        for size in sizes:
            # Regex extracts number and unit: "6kg" → ("6", "kg")
            match = re.match(r'(\d+(?:\.\d+)?)\s*(kg|lb)', size.lower())
            if match:
                value = float(match.group(1))
                unit = match.group(2)

                # Convert to pounds
                weight_lb = value if unit == 'lb' else value * 2.20462

                # Avoid duplicates (with small tolerance for rounding)
                if not any(abs(weight_lb - w) < 0.5 for w in seen_weights):
                    normalized.append({
                        'original': size,
                        'weight_lb': round(weight_lb, 1),
                        'unit': unit
                    })
                    seen_weights.add(weight_lb)

        return normalized

    @staticmethod
    def _normalize_tags(tags: List[str]) -> List[str]:
        """
        Clean tags: lowercase, strip whitespace, remove duplicates.

        Example: ["Puppy", " GRAIN-FREE "] → ["puppy", "grain-free"]
        """
        normalized = []
        for tag in tags:
            # Lowercase and remove extra spaces
            cleaned = tag.lower().strip()
            if cleaned and cleaned not in normalized:
                normalized.append(cleaned)
        return normalized

    @staticmethod
    def _determine_breed_size(product: Dict) -> List[str]:
        """
        Infer which dog sizes this product is suitable for.

        Logic:
            - "Small Breed" in name → ["small"]
            - "Large Breed" in name → ["large", "giant"]
            - Puppy formula → all sizes
            - Default → ["medium", "large"]
        """
        name = product.get('name', '').lower()
        tags = product.get('tags', [])

        sizes = []

        # Puppy formulas typically work for all sizes
        if 'puppy' in tags or 'puppy' in name:
            sizes = ['small', 'medium', 'large', 'giant']

        # Check for size-specific indicators
        elif 'small breed' in name or 'small-breed' in tags:
            sizes = ['small']
        elif 'large breed' in name or 'large-breed' in tags:
            sizes = ['large', 'giant']
        else:
            # Most adult formulas work for medium/large
            sizes = ['medium', 'large']

        # Fit & Trim works for all sizes
        if 'fit' in name and 'trim' in name:
            sizes = ['small', 'medium', 'large', 'giant']

        return sizes if sizes else ['medium', 'large']

    @staticmethod
    def _determine_life_stage(product: Dict) -> List[str]:
        """
        Infer which life stages this product is suitable for.

        Logic:
            - "Puppy" in name/tags → ["puppy"]
            - AAFCO "all life stages" → ["puppy", "adult", "senior"]
            - Default → ["adult"]
        """
        name = product.get('name', '').lower()
        tags = product.get('tags', [])
        aafco = product.get('aafco_statement', '').lower()

        stages = []

        # Check product name and tags
        if 'puppy' in tags or 'puppy' in name:
            stages.append('puppy')
        if 'senior' in tags or 'senior' in name:
            stages.append('senior')
        if 'adult' in tags or ('adult' in name and 'puppy' not in name):
            stages.append('adult')

        # Check AAFCO statement
        if 'all life stages' in aafco:
            stages = ['puppy', 'adult', 'senior']
        elif not stages:
            # Default to adult if no clear indicator
            stages = ['adult']

        return stages


# ============================================
# ProductValidator Class
# ============================================

class ProductValidator:
    """
    Validates product data quality before MongoDB insertion.

    Checks required fields, recommended fields, and reasonable value ranges.
    """

    REQUIRED_FIELDS = ['brand', 'name']  # Must have (invalid without)
    RECOMMENDED_FIELDS = ['protein_pct', 'fat_pct', 'ingredients']  # Should have

    @staticmethod
    def validate(product: Dict) -> tuple[bool, List[str]]:
        """
        Validate a product document.

        Returns:
            (is_valid, warnings) - is_valid=True if required fields present
        """
        warnings = []

        # Check required fields
        for field in ProductValidator.REQUIRED_FIELDS:
            if not product.get(field):
                warnings.append(f"Missing required field: {field}")

        # Check recommended fields
        for field in ProductValidator.RECOMMENDED_FIELDS:
            if not product.get(field):
                warnings.append(f"Missing recommended field: {field}")

        # Validate nutritional ranges
        protein = product.get('protein_pct')
        if protein is not None:
            if protein < 15 or protein > 50:
                warnings.append(f"Unusual protein percentage: {protein}%")

        fat = product.get('fat_pct')
        if fat is not None:
            if fat < 5 or fat > 30:
                warnings.append(f"Unusual fat percentage: {fat}%")

        # Product is valid if we have at least the required fields
        is_valid = all(product.get(field) for field in ProductValidator.REQUIRED_FIELDS)

        return is_valid, warnings


# ============================================
# Test Code (runs when executed directly)
# ============================================

if __name__ == '__main__':
    # Example usage with sample data
    sample_scraped = {
        'brand': 'Orijen',
        'name': 'Original Puppy',
        'form': 'dry',
        'protein_pct': 38,
        'fat_pct': 20,
        'fiber_pct': 5,
        'ingredients': 'Fresh chicken, turkey...',
        'tags': ['puppy', 'high-protein', 'grain-free'],
        'bag_sizes': ['6kg', '11.4kg', '25lb'],
        'feeding_facts': {'kcal_per_kg': 4000}
    }

    normalizer = ProductNormalizer()
    normalized = normalizer.normalize(sample_scraped)

    print("Normalized product:")
    import json
    print(json.dumps(normalized, indent=2))

    validator = ProductValidator()
    is_valid, warnings = validator.validate(normalized)
    print(f"\nValid: {is_valid}")
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")

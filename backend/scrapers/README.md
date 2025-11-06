# Pet Food Web Scrapers

This directory contains web scrapers for collecting dog food product data from various brand websites.

## Phase 2: Web Scraping & Data Expansion

**Objective:** Automate large-scale product data collection to expand from ~10 to 100+ products.

## Current Scrapers

### 1. Orijen Scraper (`orijen_scraper.py`) ✅

Scrapes dog food products from [orijenpetfoods.com](https://www.orijenpetfoods.com).

**Status:** Complete - Successfully scraped 11 Orijen products

**Features:**
- Scrapes all dog food products from the product listing
- Extracts detailed nutritional information (protein, fat, fiber, etc.)
- Collects ingredients lists and AAFCO statements
- Captures product images and URLs
- Generates appropriate tags for filtering
- Respectful scraping with delays between requests

**Data Collected:**
- Product name, brand, and line
- Guaranteed analysis (protein %, fat %, fiber %, etc.)
- Ingredients list
- Feeding facts (calories per kg/cup)
- Available bag sizes
- Product images
- AAFCO nutritional adequacy statement
- Tags (puppy, adult, grain-free, high-protein, etc.)

### 2. PetValu Scraper (`petvalu_scraper.py`) 🚧

Scrapes dog food products from [petvalu.ca](https://www.petvalu.ca).

**Status:** In Development - Framework complete, needs testing

**Features:**
- Scrapes dry dog food products from PetValu Canada
- Extracts product names, brands, and prices
- Captures product images and URLs
- Collects available sizes and prices per size
- Respectful scraping with configurable delays

**Data Collected:**
- Product name and brand
- Prices for different bag sizes
- Product images
- Product URLs
- Available sizes (kg/lb)

**Note:** This is a retailer scraper (focuses on prices) vs brand scraper (focuses on nutrition). Use in combination with brand scrapers for complete data.

## Usage

### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Run Individual Scraper

```python
from scrapers.orijen_scraper import OrijenScraper

scraper = OrijenScraper(delay=2.0)  # 2 second delay between requests
products = scraper.scrape_all_products()

print(f"Scraped {len(products)} products")
```

### Run Full Pipeline

The pipeline handles scraping, normalization, validation, and MongoDB storage:

```bash
cd backend
python scrapers/scraper_pipeline.py
```

This will:
1. Scrape all Orijen products
2. Normalize data to match MongoDB schema
3. Validate data quality
4. Save to MongoDB (upsert - updates existing or inserts new)
5. Save backup JSON file to `data/` directory
6. Display statistics

## Data Normalization

The `data_normalizer.py` utility transforms raw scraped data into a standardized format:

- Standardizes food forms (dry/wet/raw)
- Converts bag sizes to pounds
- Determines compatible breed sizes
- Identifies life stages (puppy/adult/senior)
- Normalizes tags
- Validates data quality

## Project Structure

```
backend/
├── scrapers/
│   ├── __init__.py
│   ├── orijen_scraper.py       # Orijen-specific scraper
│   ├── scraper_pipeline.py     # Orchestration pipeline
│   └── README.md               # This file
├── utils/
│   ├── __init__.py
│   └── data_normalizer.py      # Data transformation & validation
└── data/
    └── orijen_products_*.json  # Scraped data backups
```

## MongoDB Schema

Products are stored with the following structure:

```python
{
    "brand": str,               # Brand name
    "name": str,                # Product name
    "line": str,                # Product line
    "form": str,                # dry/wet/raw
    "url": str,                 # Product page URL
    "image": str,               # Image URL

    # Nutritional Info
    "protein_pct": float,
    "fat_pct": float,
    "fiber_pct": float,
    "moisture_pct": float,
    "ash_pct": float,
    "calcium_pct": float,
    "phosphorus_pct": float,
    "omega3_pct": float,
    "omega6_pct": float,

    # Other Info
    "ingredients": str,
    "aafco_statement": str,
    "kcal_per_kg": int,
    "kcal_per_cup": int,

    # Metadata
    "tags": [str],
    "size": [str],              # Compatible breed sizes
    "stage": [str],             # Life stages
    "available_sizes": [        # Available bag sizes
        {
            "original": str,
            "weight_lb": float,
            "unit": str
        }
    ],
    "source": str,              # Scraper version
    "last_updated": str         # ISO timestamp
}
```

## Adding New Brand Scrapers

To add a new brand:

1. Create `{brand}_scraper.py` in `scrapers/` directory
2. Follow the pattern from `orijen_scraper.py`:
   - Research website structure
   - Implement `scrape_all_products()` method
   - Extract all relevant fields
   - Add brand-specific tag logic
3. Update `scraper_pipeline.py` to include new brand
4. Test thoroughly before running on production database

## Best Practices

### Respectful Scraping

- Use delays between requests (2+ seconds)
- Set appropriate User-Agent headers
- Check `robots.txt` before scraping
- Monitor for rate limiting
- Cache results to avoid re-scraping

### Data Quality

- Validate all scraped data before storing
- Log warnings for unusual values
- Handle missing data gracefully
- Keep backups (JSON files)
- Version your scrapers (`source` field)

### Maintenance

- Monitor for website structure changes
- Update selectors when sites redesign
- Re-scrape periodically to keep data fresh
- Log errors for debugging

## Future Enhancements

- [ ] Add more brand scrapers (Acana, Blue Buffalo, etc.)
- [ ] Implement scheduling (cron jobs or APScheduler)
- [ ] Add price scraping from retailer sites
- [ ] Build monitoring dashboard for scrape health
- [ ] Add proxy rotation for large-scale scraping
- [ ] Implement incremental updates (only changed products)
- [ ] Add email alerts for scraping failures

## Troubleshooting

**Scraper fails with connection errors:**
- Check internet connection
- Verify website is accessible
- Check if you're being rate-limited (increase delay)

**No products found:**
- Website structure may have changed
- Check selectors in scraper code
- Verify URL is correct

**Data validation warnings:**
- Review extracted values for accuracy
- Update extraction regex patterns if needed
- Check source HTML for changes

**MongoDB connection fails:**
- Verify `.env` file has correct `MONGO_URI`
- Ensure MongoDB is running
- Check network connectivity

## License

This scraper is for educational and personal use. Always respect website Terms of Service and robots.txt files.

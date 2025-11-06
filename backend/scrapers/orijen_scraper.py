"""
Orijen Pet Food Scraper
Scrapes dog food products from orijenpetfoods.com
"""

import requests
from bs4 import BeautifulSoup
import re
import time
from typing import List, Dict, Optional
from datetime import datetime


class OrijenScraper:
    """Scraper for Orijen pet food products"""

    BASE_URL = "https://www.orijenpetfoods.com"
    LISTING_URL = f"{BASE_URL}/en-CA/dogs/dog-food"

    def __init__(self, delay: float = 1.0):
        """
        Initialize scraper

        Args:
            delay: Delay between requests in seconds (be respectful)
        """
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

    def scrape_all_products(self) -> List[Dict]:
        """
        Scrape all dog food products from Orijen

        Returns:
            List of product dictionaries
        """
        print(f"Fetching product listing from {self.LISTING_URL}...")
        product_links = self._get_product_links()
        print(f"Found {len(product_links)} products")

        products = []
        for i, link in enumerate(product_links, 1):
            print(f"Scraping product {i}/{len(product_links)}: {link}")
            try:
                product_data = self._scrape_product_page(link)
                if product_data:
                    products.append(product_data)
                time.sleep(self.delay)  # Be respectful
            except Exception as e:
                print(f"Error scraping {link}: {e}")
                continue

        print(f"Successfully scraped {len(products)} products")
        return products

    def _get_product_links(self) -> List[str]:
        """
        Get all product page links from the listing page

        Returns:
            List of product URLs
        """
        response = self.session.get(self.LISTING_URL)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Find all product links (adjust selector based on actual HTML structure)
        product_links = []

        # Look for links in product tiles/cards
        for link in soup.find_all('a', href=True):
            href = link['href']
            # Match pattern: /en-CA/dogs/dog-food/{product}/{id}.html
            if '/dogs/dog-food/' in href and href.endswith('.html'):
                full_url = f"{self.BASE_URL}{href}" if href.startswith('/') else href
                if full_url not in product_links:
                    product_links.append(full_url)

        return product_links

    def _scrape_product_page(self, url: str) -> Optional[Dict]:
        """
        Scrape a single product page

        Args:
            url: Product page URL

        Returns:
            Product data dictionary or None if failed
        """
        response = self.session.get(url)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        product_data = {
            'brand': 'Orijen',
            'url': url,
            'scraped_at': datetime.utcnow().isoformat(),
            'source': 'orijen_scraper_v1'
        }

        # Extract product name
        product_data['name'] = self._extract_product_name(soup)

        # Extract product line (from URL)
        product_data['line'] = self._extract_product_line(url)

        # Extract form (dry/wet)
        product_data['form'] = self._extract_form(soup)

        # Extract guaranteed analysis (nutritional info)
        analysis = self._extract_guaranteed_analysis(soup)
        product_data.update(analysis)

        # Extract ingredients
        product_data['ingredients'] = self._extract_ingredients(soup)

        # Extract feeding facts
        feeding_facts = self._extract_feeding_facts(soup)
        product_data['feeding_facts'] = feeding_facts

        # Extract bag sizes
        product_data['bag_sizes'] = self._extract_bag_sizes(soup)

        # Extract images
        product_data['image_url'] = self._extract_image(soup)

        # Extract AAFCO statement
        product_data['aafco_statement'] = self._extract_aafco_statement(soup)

        # Extract tags (grain-free, puppy, etc.)
        product_data['tags'] = self._extract_tags(soup, product_data)

        return product_data

    def _extract_product_name(self, soup: BeautifulSoup) -> str:
        """Extract product name"""
        # Try h1 tag first
        h1 = soup.find('h1')
        if h1:
            return h1.get_text(strip=True)

        # Try product title class
        title = soup.find(class_=re.compile(r'product.*title', re.I))
        if title:
            return title.get_text(strip=True)

        return "Unknown Product"

    def _extract_product_line(self, url: str) -> str:
        """Extract product line from URL"""
        # URL pattern: /dogs/dog-food/{line}/{id}.html
        match = re.search(r'/dog-food/([^/]+)/', url)
        if match:
            return match.group(1).replace('-', ' ').title()
        return ""

    def _extract_form(self, soup: BeautifulSoup) -> str:
        """Extract food form (dry/wet/raw)"""
        # Look for "Dry Dog Food" text
        text = soup.get_text().lower()
        if 'dry dog food' in text:
            return 'dry'
        elif 'wet dog food' in text or 'canned' in text:
            return 'wet'
        elif 'raw' in text or 'freeze-dried' in text:
            return 'raw'
        return 'dry'  # Default for Orijen

    def _extract_guaranteed_analysis(self, soup: BeautifulSoup) -> Dict:
        """Extract nutritional guaranteed analysis"""
        analysis = {}

        # Look for guaranteed analysis section
        # Common patterns: "Crude Protein", "Crude Fat", etc.
        text = soup.get_text()

        # Extract protein
        protein_match = re.search(r'crude\s+protein[:\s]+(\d+(?:\.\d+)?)\s*%', text, re.I)
        if protein_match:
            analysis['protein_pct'] = float(protein_match.group(1))

        # Extract fat (try multiple patterns)
        fat_patterns = [
            r'fat\s+content[:\s]+(\d+(?:\.\d+)?)\s*%',  # "Fat content 18%"
            r'crude\s+fat[:\s]+(\d+(?:\.\d+)?)\s*%',    # "Crude fat 18%"
            r'(?:crude\s+)?fat[:\s]+(\d+(?:\.\d+)?)\s*%'  # Generic "fat 18%"
        ]
        for pattern in fat_patterns:
            fat_match = re.search(pattern, text, re.I)
            if fat_match:
                analysis['fat_pct'] = float(fat_match.group(1))
                break

        # Extract fiber
        fiber_match = re.search(r'crude\s+fiber[:\s]+(\d+(?:\.\d+)?)\s*%', text, re.I)
        if fiber_match:
            analysis['fiber_pct'] = float(fiber_match.group(1))

        # Extract moisture
        moisture_match = re.search(r'moisture[:\s]+(\d+(?:\.\d+)?)\s*%', text, re.I)
        if moisture_match:
            analysis['moisture_pct'] = float(moisture_match.group(1))

        # Extract ash
        ash_match = re.search(r'crude\s+ash[:\s]+(\d+(?:\.\d+)?)\s*%', text, re.I)
        if ash_match:
            analysis['ash_pct'] = float(ash_match.group(1))

        # Extract calcium
        calcium_match = re.search(r'calcium[:\s]+(\d+(?:\.\d+)?)\s*%', text, re.I)
        if calcium_match:
            analysis['calcium_pct'] = float(calcium_match.group(1))

        # Extract phosphorus
        phosphorus_match = re.search(r'phosphorus[:\s]+(\d+(?:\.\d+)?)\s*%', text, re.I)
        if phosphorus_match:
            analysis['phosphorus_pct'] = float(phosphorus_match.group(1))

        # Extract omega-6
        omega6_match = re.search(r'omega[- ]6[:\s]+(\d+(?:\.\d+)?)\s*%', text, re.I)
        if omega6_match:
            analysis['omega6_pct'] = float(omega6_match.group(1))

        # Extract omega-3
        omega3_match = re.search(r'omega[- ]3[:\s]+(\d+(?:\.\d+)?)\s*%', text, re.I)
        if omega3_match:
            analysis['omega3_pct'] = float(omega3_match.group(1))

        return analysis

    def _extract_ingredients(self, soup: BeautifulSoup) -> str:
        """Extract ingredients list"""
        # Method 1: Look for "Composition" section (Orijen specific)
        composition_section = soup.find(string=re.compile(r'composition', re.I))
        if composition_section:
            parent = composition_section.find_parent()
            if parent:
                # Get next paragraph
                content = parent.find_next('p')
                if content:
                    ing_text = content.get_text(strip=True)
                    # Verify it looks like ingredients (has commas, parentheses, percentages)
                    if len(ing_text) < 2000 and ',' in ing_text and '(' in ing_text:
                        return ing_text

        # Method 2: Look for generic ingredients section
        ingredients_section = soup.find(string=re.compile(r'ingredients', re.I))
        if ingredients_section:
            parent = ingredients_section.find_parent()
            if parent:
                # Get next paragraph or list
                content = parent.find_next(['p', 'div'])
                if content:
                    ing_text = content.get_text(strip=True)
                    # Check length is reasonable (not entire page)
                    if len(ing_text) < 2000 and ',' in ing_text:
                        return ing_text

        return ""

    def _extract_feeding_facts(self, soup: BeautifulSoup) -> Dict:
        """Extract feeding facts (calories, etc.)"""
        facts = {}
        text = soup.get_text()

        # Extract metabolizable energy
        cal_match = re.search(r'(\d+)\s*kcal/kg', text, re.I)
        if cal_match:
            facts['kcal_per_kg'] = int(cal_match.group(1))

        # Extract calories per cup (more specific pattern to avoid matching kcal/kg)
        # Look for patterns like "450 kcal/cup" or "450 kcal per cup"
        cup_match = re.search(r'(\d+)\s*kcal[\s/]+(per\s+)?cup', text, re.I)
        if cup_match:
            facts['kcal_per_cup'] = int(cup_match.group(1))

        return facts

    def _extract_bag_sizes(self, soup: BeautifulSoup) -> List[str]:
        """Extract available bag sizes"""
        sizes = []
        text = soup.get_text()

        # Look for patterns like "6kg", "11.4kg", "25lb", etc.
        size_matches = re.findall(r'(\d+(?:\.\d+)?\s*(?:kg|lb))', text, re.I)
        for size in size_matches:
            cleaned = size.strip()
            if cleaned and cleaned not in sizes:
                sizes.append(cleaned)

        return sizes[:5]  # Limit to first 5 unique sizes

    def _extract_image(self, soup: BeautifulSoup) -> str:
        """Extract product image URL"""
        # Method 1: Look for product thumbnail/image with alt text
        product_imgs = soup.find_all('img', alt=re.compile(r'product (image|thumbnail)', re.I))
        if product_imgs:
            src = product_imgs[0].get('src', '')
            if src:
                if src.startswith('http'):
                    return src
                elif src.startswith('/'):
                    return f"{self.BASE_URL}{src}"

        # Method 2: Look for images from product catalog in demandware
        imgs = soup.find_all('img', src=re.compile(r'BFDW_PRD.*master-catalog', re.I))
        if imgs:
            src = imgs[0].get('src', '')
            if src:
                if src.startswith('http'):
                    return src
                elif src.startswith('/'):
                    return f"{self.BASE_URL}{src}"

        # Method 3: Look for any demandware images, excluding menu/generic images
        imgs = soup.find_all('img', src=re.compile(r'demandware', re.I))
        for img in imgs:
            src = img.get('src', '')
            # Skip icons, logos, menus, and generic images
            if any(skip in src.lower() for skip in ['icon', 'logo', 'arrow', 'flag', 'countryselector', 'menu', 'desktop-cans']):
                continue

            if src:
                if src.startswith('http'):
                    return src
                elif src.startswith('/'):
                    return f"{self.BASE_URL}{src}"

        # Method 4: Try og:image meta tag (less reliable for Orijen)
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            content = og_image['content']
            # Only use if not a generic menu image
            if 'desktop-cans' not in content.lower() and 'menu' not in content.lower():
                return content

        return ""

    def _extract_aafco_statement(self, soup: BeautifulSoup) -> str:
        """Extract AAFCO nutritional adequacy statement"""
        text = soup.get_text()

        # Look for AAFCO statement pattern
        aafco_match = re.search(
            r'(formulated to meet.*?(?:AAFCO|nutritional levels).*?(?:puppy|adult|senior|all life stages)[^.]*\.)',
            text,
            re.I | re.DOTALL
        )
        if aafco_match:
            return aafco_match.group(1).strip()

        return ""

    def _extract_tags(self, soup: BeautifulSoup, product_data: Dict) -> List[str]:
        """Extract product tags for filtering"""
        tags = []
        text = soup.get_text().lower()
        name = product_data.get('name', '').lower()

        # Life stage tags - DON'T add these here, they're determined by data normalizer
        # based on AAFCO statements and product descriptions, not just name matching

        # Special formulations
        if 'grain-free' in text or 'amazing grains' not in name:
            tags.append('grain-free')

        if 'fit' in name and 'trim' in name:
            tags.append('low-fat')
            tags.append('weight-management')

        if 'six fish' in name:
            tags.append('fish')
            tags.append('high-protein')

        if 'regional red' in name:
            tags.append('red-meat')
            tags.append('high-protein')

        # High protein (Orijen is typically high protein)
        protein = product_data.get('protein_pct', 0)
        if protein >= 38:
            tags.append('high-protein')

        # Other common tags
        if 'wholeprey' in text:
            tags.append('whole-prey')

        if 'freeze-dried' in text:
            tags.append('freeze-dried')

        return list(set(tags))  # Remove duplicates


if __name__ == '__main__':
    # Test the scraper
    scraper = OrijenScraper(delay=2.0)
    products = scraper.scrape_all_products()

    print(f"\n{'='*60}")
    print(f"Scraped {len(products)} products")
    print(f"{'='*60}\n")

    if products:
        print("Sample product:")
        import json
        print(json.dumps(products[0], indent=2))

"""
PetValu Scraper - Scrapes dog food products from petvalu.ca
"""

import requests
from bs4 import BeautifulSoup
import time
import re
from typing import List, Dict
from urllib.parse import urljoin


class PetValuScraper:
    """Scraper for PetValu.ca dog food products"""

    BASE_URL = "https://www.petvalu.ca"

    # Try different possible category URLs
    CATEGORY_URLS = [
        "https://www.petvalu.ca/dog/food/dry-food",
        "https://www.petvalu.ca/dogs/food/dry",
        "https://www.petvalu.ca/en/dogs/food",
    ]

    def __init__(self, delay: float = 2.0):
        """
        Initialize scraper

        Args:
            delay: Delay between requests in seconds (default 2.0)
        """
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })

    def scrape_all_products(self, limit: int = None) -> List[Dict]:
        """
        Scrape all dog food products from PetValu

        Args:
            limit: Maximum number of products to scrape (None for all)

        Returns:
            List of product dictionaries
        """
        print("="*70)
        print("Starting PetValu Scraper")
        print("="*70)

        # First, try to find a working category URL
        category_url = self._find_working_category_url()
        if not category_url:
            print("❌ Could not find working category URL")
            return []

        print(f"\n✓ Found working category URL: {category_url}")

        # Get product links
        product_links = self._get_product_links(category_url, limit=limit)

        if not product_links:
            print("❌ No product links found")
            return []

        print(f"✓ Found {len(product_links)} product links")

        # Scrape each product
        products = []
        for i, link in enumerate(product_links, 1):
            print(f"\nScraping product {i}/{len(product_links)}: {link}")

            try:
                product_data = self._scrape_product_page(link)
                if product_data:
                    products.append(product_data)
                    print(f"  ✓ Successfully scraped: {product_data.get('name', 'Unknown')}")
                else:
                    print(f"  ⚠ Failed to scrape product")

                # Be respectful - delay between requests
                if i < len(product_links):
                    time.sleep(self.delay)

            except Exception as e:
                print(f"  ❌ Error scraping product: {e}")
                continue

        print(f"\n{'='*70}")
        print(f"✓ Successfully scraped {len(products)} products")
        print("="*70)

        return products

    def _find_working_category_url(self) -> str:
        """Try different category URLs to find one that works"""
        for url in self.CATEGORY_URLS:
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    return url
            except Exception:
                continue
        return None

    def _get_product_links(self, category_url: str, limit: int = None) -> List[str]:
        """
        Get all product links from category page

        Args:
            category_url: URL of category page
            limit: Maximum number of links to return

        Returns:
            List of product URLs
        """
        try:
            response = self.session.get(category_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Try different selectors for product links
            product_links = []

            # Method 1: Look for links containing '/product/' or '/p/'
            for link in soup.find_all('a', href=True):
                href = link['href']
                if '/product/' in href or '/p/' in href:
                    full_url = urljoin(self.BASE_URL, href)
                    if full_url not in product_links:
                        product_links.append(full_url)

            # Method 2: Look for common product card classes
            if not product_links:
                for card in soup.find_all(['div', 'article'], class_=re.compile(r'product|item|card', re.I)):
                    link = card.find('a', href=True)
                    if link:
                        full_url = urljoin(self.BASE_URL, link['href'])
                        if full_url not in product_links:
                            product_links.append(full_url)

            # Apply limit if specified
            if limit:
                product_links = product_links[:limit]

            return product_links

        except Exception as e:
            print(f"Error getting product links: {e}")
            return []

    def _scrape_product_page(self, url: str) -> Dict:
        """
        Scrape a single product page

        Args:
            url: Product page URL

        Returns:
            Dictionary with product data
        """
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Extract product data
            product = {
                'brand': self._extract_brand(soup),
                'name': self._extract_name(soup),
                'line': self._extract_line(soup),
                'form': 'dry',  # Assume dry food for now
                'url': url,
                'image': self._extract_image(soup),
                'price': self._extract_price(soup),
                'size_kg': self._extract_size(soup),
                'available_sizes': self._extract_available_sizes(soup),
            }

            # Extract nutritional info
            nutrition = self._extract_nutritional_info(soup)
            product.update(nutrition)

            # Extract other details
            product['ingredients'] = self._extract_ingredients(soup)
            product['aafco_statement'] = self._extract_aafco(soup)

            # Generate tags
            product['tags'] = self._generate_tags(product, soup)

            return product

        except Exception as e:
            print(f"Error scraping product page: {e}")
            return None

    def _extract_brand(self, soup: BeautifulSoup) -> str:
        """Extract brand name"""
        # Try meta tags
        og_brand = soup.find('meta', property='product:brand')
        if og_brand and og_brand.get('content'):
            return og_brand['content']

        # Try common brand selectors
        brand_elem = soup.find(['span', 'div', 'p'], class_=re.compile(r'brand', re.I))
        if brand_elem:
            return brand_elem.get_text(strip=True)

        return ""

    def _extract_name(self, soup: BeautifulSoup) -> str:
        """Extract product name"""
        # Try h1 title
        h1 = soup.find('h1')
        if h1:
            return h1.get_text(strip=True)

        # Try meta title
        title = soup.find('title')
        if title:
            return title.get_text(strip=True).split('|')[0].strip()

        return ""

    def _extract_line(self, soup: BeautifulSoup) -> str:
        """Extract product line name"""
        name = self._extract_name(soup)
        brand = self._extract_brand(soup)

        # Remove brand from name to get line
        if brand and name.startswith(brand):
            return name[len(brand):].strip()

        return name

    def _extract_image(self, soup: BeautifulSoup) -> str:
        """Extract product image URL"""
        # Try og:image meta tag
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            return og_image['content']

        # Try product image class
        img = soup.find('img', class_=re.compile(r'product', re.I))
        if img and img.get('src'):
            return urljoin(self.BASE_URL, img['src'])

        # Try first img in product area
        product_area = soup.find(['div', 'section'], class_=re.compile(r'product', re.I))
        if product_area:
            img = product_area.find('img')
            if img and img.get('src'):
                return urljoin(self.BASE_URL, img['src'])

        return ""

    def _extract_price(self, soup: BeautifulSoup) -> float:
        """Extract product price"""
        # Try meta tags
        og_price = soup.find('meta', property='product:price:amount')
        if og_price and og_price.get('content'):
            try:
                return float(og_price['content'])
            except:
                pass

        # Try common price selectors
        price_elem = soup.find(['span', 'div'], class_=re.compile(r'price', re.I))
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            price_match = re.search(r'\$?([\d,]+\.?\d*)', price_text)
            if price_match:
                try:
                    return float(price_match.group(1).replace(',', ''))
                except:
                    pass

        return None

    def _extract_size(self, soup: BeautifulSoup) -> float:
        """Extract package size in kg"""
        text = soup.get_text()

        # Look for kg sizes
        kg_match = re.search(r'(\d+(?:\.\d+)?)\s*kg', text, re.I)
        if kg_match:
            try:
                return float(kg_match.group(1))
            except:
                pass

        # Look for lb sizes and convert to kg
        lb_match = re.search(r'(\d+(?:\.\d+)?)\s*lb', text, re.I)
        if lb_match:
            try:
                lb = float(lb_match.group(1))
                return round(lb * 0.453592, 2)  # Convert to kg
            except:
                pass

        return None

    def _extract_available_sizes(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract all available sizes"""
        sizes = []
        text = soup.get_text()

        # Find all kg and lb mentions
        size_matches = re.findall(r'(\d+(?:\.\d+)?)\s*(kg|lb)', text, re.I)

        seen = set()
        for value, unit in size_matches:
            size_str = f"{value}{unit.lower()}"
            if size_str not in seen:
                seen.add(size_str)
                try:
                    weight_lb = float(value) if unit.lower() == 'lb' else float(value) * 2.20462
                    sizes.append({
                        'original': size_str,
                        'weight_lb': round(weight_lb, 1),
                        'unit': unit.lower()
                    })
                except:
                    pass

        return sizes[:5]  # Limit to 5 sizes

    def _extract_nutritional_info(self, soup: BeautifulSoup) -> Dict:
        """Extract guaranteed analysis nutritional information"""
        nutrition = {}
        text = soup.get_text()

        # Extract common nutritional values
        patterns = {
            'protein_pct': r'(?:crude\s+)?protein[:\s]+(\d+(?:\.\d+)?)\s*%',
            'fat_pct': r'(?:crude\s+)?fat[:\s]+(\d+(?:\.\d+)?)\s*%',
            'fiber_pct': r'(?:crude\s+)?fiber[:\s]+(\d+(?:\.\d+)?)\s*%',
            'moisture_pct': r'moisture[:\s]+(\d+(?:\.\d+)?)\s*%',
            'ash_pct': r'(?:crude\s+)?ash[:\s]+(\d+(?:\.\d+)?)\s*%',
            'calcium_pct': r'calcium[:\s]+(\d+(?:\.\d+)?)\s*%',
            'phosphorus_pct': r'phosphorus[:\s]+(\d+(?:\.\d+)?)\s*%',
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    nutrition[key] = float(match.group(1))
                except:
                    nutrition[key] = None
            else:
                nutrition[key] = None

        # Extract calories
        cal_match = re.search(r'(\d+)\s*kcal/kg', text, re.I)
        if cal_match:
            nutrition['kcal_per_kg'] = int(cal_match.group(1))
        else:
            nutrition['kcal_per_kg'] = None

        cup_match = re.search(r'(\d+)\s*kcal.*cup', text, re.I)
        if cup_match:
            nutrition['kcal_per_cup'] = int(cup_match.group(1))
        else:
            nutrition['kcal_per_cup'] = None

        return nutrition

    def _extract_ingredients(self, soup: BeautifulSoup) -> str:
        """Extract ingredients list"""
        # Look for ingredients section
        ingredients_header = soup.find(text=re.compile(r'ingredients', re.I))
        if ingredients_header:
            parent = ingredients_header.find_parent()
            if parent:
                # Get next sibling or paragraph
                content = parent.find_next(['p', 'div', 'span'])
                if content:
                    text = content.get_text(strip=True)
                    # Clean up - ingredients should be comma-separated
                    if ',' in text and len(text) < 2000:  # Reasonable length
                        return text

        return ""

    def _extract_aafco(self, soup: BeautifulSoup) -> str:
        """Extract AAFCO nutritional adequacy statement"""
        text = soup.get_text()

        # Look for AAFCO statement
        aafco_match = re.search(r'(.*AAFCO.*(?:complete|balanced).*)', text, re.I)
        if aafco_match:
            return aafco_match.group(1).strip()[:500]  # Limit length

        return ""

    def _generate_tags(self, product: Dict, soup: BeautifulSoup) -> List[str]:
        """Generate tags based on product info"""
        tags = []

        name_lower = product.get('name', '').lower()
        text = soup.get_text().lower()

        # Life stage tags
        if any(word in name_lower or word in text for word in ['puppy', 'junior']):
            tags.append('puppy')
        if any(word in name_lower or word in text for word in ['senior', 'mature']):
            tags.append('senior')
        if 'adult' in name_lower or 'adult' in text:
            tags.append('adult')

        # Size tags
        if 'small breed' in name_lower or 'small breed' in text:
            tags.append('small-breed')
        if 'large breed' in name_lower or 'large breed' in text:
            tags.append('large-breed')

        # Special diets
        if 'grain free' in name_lower or 'grain-free' in name_lower:
            tags.append('grain-free')
        if any(word in name_lower for word in ['high protein', 'protein-rich']):
            tags.append('high-protein')
        if 'weight' in name_lower or 'light' in name_lower:
            tags.append('weight-management')

        return tags


if __name__ == '__main__':
    # Test the scraper
    scraper = PetValuScraper(delay=2.0)
    products = scraper.scrape_all_products(limit=3)  # Test with 3 products

    if products:
        print(f"\n✓ Scraped {len(products)} products")
        print("\nFirst product:")
        import json
        print(json.dumps(products[0], indent=2, default=str))
    else:
        print("\n❌ No products scraped")

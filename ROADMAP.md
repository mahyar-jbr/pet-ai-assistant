# Pet AI Assistant — Production Roadmap

> **Goal:** Build the platform for pet food decisions — recommendations, tracking, community, and ML-powered personalization.
> **Current Status:** Phase 18.5 complete. App live. Coding sprint Mar 16-22, marketing + launch Mar 23-29. Public launch target: March 30, 2026.
> **Last Updated:** 2026-03-22 (Phase 19 deployed. Brand expansion to 150 products. Final PO audit complete.)

## Product Vision

```
Tier 1: Recommendation Tool (rule-based scoring)          ← LIVE
Tier 2: Pet Dashboard + Purchase Tracking + User Accounts  ← DEPLOYED (Mar 18)
Tier 3: Brand Expansion + Polish + Public Launch           ← IN PROGRESS (Mar 22), launch Mar 30
Tier 4: iOS Native App (SwiftUI)                           ← April 2026 (port finalized web)
Tier 5: Community Platform (social media for pet food)     ← Summer 2026
Tier 6: Species + Format Expansion (cat, raw, treats)      ← Ongoing
Tier 7: ML-Powered Recommendations                         ← Fall 2026 (needs 500+ purchases)
```

### Sprint Schedule
```
Mar 16-17:  Code sprint — accounts, dashboard, tracking ✅ COMPLETE
Mar 18:     Phase 19 deployed to production ✅ COMPLETE
Mar 19-22:  Brand expansion (Go! + Now Fresh), PO audit fixes, UI polish ✅ IN PROGRESS
Mar 23-29:  Marketing week — domain, logo, launch prep, content, outreach
Mar 30:     PUBLIC LAUNCH DAY
April:      iOS app (SwiftUI) — port finalized web experience + native features
```

---

## PHASE 9: Data Population — DONE
- [x] Import pipeline working (import_products.py + local CSV)
- [x] 150 products imported — complete catalogs for 6 brands
  - Orijen: 13 products (premium, grain-free)
  - Acana: 25 products (premium, mixed grain)
  - Open Farm: 42 products (premium, ethically sourced)
  - Performatrin Ultra: 34 products (mid-tier, PetValu house brand)
  - Go! Solutions: 24 products (Canadian mid-tier, Petcurean)
  - Now Fresh: 12 products (grain-free, fresh ingredients, Petcurean)
- [x] All 32 CSV fields complete for every product (zero missing data)
- [x] All products sourced from PetValu.ca — live pricing, shop links, retailer field
- [x] Official brand CDN images (all verified working)
- [x] Performatrin Ultra kcal/kg verified: 5 official values confirmed, 29 estimated using brand-specific ×8.90 ratio (±75 kcal/kg max error)
- [x] Allergen tags normalized: `egg` (not `eggs`), `fish` added for herring oil products, consistent delimiters and Title Case
- [x] Ca:P and DHA backfill for Performatrin Ultra puppy/senior products (4 puppy + 2 senior now scoring correctly)

---

## PHASE 10: Scoring Algorithm & Testing — DONE
- [x] 6-factor scoring algorithm (100 points max)
- [x] Scoring tested across 5 pet profiles (all size/age/goal combos)
- [x] Hard filters verified: allergen disqualification, kibble size incompatibility
- [x] Edge cases: 5+ allergies, 10 allergies (empty state), all profile combos
- [x] Input validation: all invalid inputs rejected 422, no stack traces leaked
- [x] All 3 brands appearing in recommendations
- [x] Bug fix: Allergen matching → set intersection ("fish" ≠ "shellfish")
- [x] Bug fix: Price scoring → percentile-based (p25/p50/p75)
- [x] Bug fix: Ingredient quality → keyword + meat indicator in first 5 ingredients

---

## PHASE 11: Production Hardening — DONE
- [x] CORS: `["*"]` → `ALLOWED_ORIGINS` env var, `allow_credentials=False`, explicit methods/headers
- [x] Global exception handler: stack traces server-side only
- [x] Input validation: name 1-50 chars, enum validation, max 20 allergies (50 chars each)
- [x] Product query limit validation (`ge=1, le=200`), brand filter regex sanitized with `re.escape()`
- [x] MongoDB indexes: 4 single + 1 compound + unique `public_id` on pets
- [x] Logging: Python `logging` module + request middleware (method, path, status, duration)
- [x] `/health` endpoint with MongoDB ping
- [x] Startup DB check + graceful shutdown (lifespan context manager)
- [x] `.env.example` with all config options
- [x] Rate limiting via slowapi (60/min global, 20/min recommendations, 5/min pet creation, 5/min PUT/DELETE)
- [x] Session UUID auth: `public_id` + `session_token` (UUID) on pet creation, `X-Session-Token` header required for GET/PUT/DELETE
- [x] Removed `GET /api/pets` (list all) endpoint — no use case, security risk
- [x] Security headers middleware: HSTS, nosniff, X-Frame-Options DENY, XSS protection, Referrer-Policy
- [x] `/docs` and `/redoc` disabled when `ENV=production`
- [x] HTML stripping in data_normalizer.py for scraped text fields
- [x] Updated `requests` package to `>=2.32.0` (CVE-2024-35195)
- [x] Scraper pipeline database name reads from `DATABASE_NAME` env var (was hardcoded `pet_food_db`)
- [x] Import script reads `MONGODB_URL` and `SHEETS_CSV_URL` from env vars

---

## PHASE 12: Frontend Polish — DONE
- [x] Page title: "Pet AI Assistant"
- [x] Favicon: inline SVG dog paw (#0057ff)
- [x] Meta tags: description, Open Graph, Twitter card, theme-color
- [x] Loading skeleton: shimmer grid with profile placeholder
- [x] Error state: styled card with retry button + inline error banner (no alert())
- [x] Empty state: paw illustration + actionable suggestions
- [x] `.env.production` with `VITE_API_URL`
- [x] `petApi.js`: `import.meta.env.VITE_API_URL` with localhost fallback

---

## PHASE 13: UX Overhaul — DONE

### 13A: Multi-Step Form Wizard
- [x] 7-step guided wizard replacing single-page form
- [x] Step 1: Dog's name + trust signals + "How It Works" explainer
- [x] Step 2: Breed size with visual cards + weight ranges
- [x] Step 3: Age group with descriptions
- [x] Step 4: Activity level with real-world examples
- [x] Step 5: Dietary goal with plain-English explanations
- [x] Step 6: Allergy chips (8 common) + custom text input
- [x] Step 7: Review summary → submit
- [x] Progress bar, back buttons, auto-advance, smooth transitions
- [x] Dog's name in all step headings
- [x] Mobile responsive, localStorage edit mode preserved

### 13B: Trust Building
- [x] "How It Works" 3-step explainer on step 1
- [x] Trust signals: "Brand-independent", "Free", "Transparent scoring"

### 13C: Personalized Recommendations
- [x] Match reasons personalized with dog's name (backend)
- [x] `allergy_safe` field in API response
- [x] "Allergy Safe" green badge on cards
- [x] "[Name]'s Top Food Matches" heading
- [x] Sort explanation: "Sorted by best match for [name]"
- [x] "Dry food only" notice
- [x] "Compare" text label + pet name in comparison modal

### 13D: Action & Conversion
- [x] "Shop" button visible on every card (no expand needed)
- [x] Links to retailer product page via source_url
- [x] Styled as secondary button with hover animation

---

## PHASE 14: PO Audit & Review — DONE
- [x] PO Round 1: Full UX gap analysis + competitive intelligence report
- [x] 19 issues identified and fixed
- [x] PO Round 2: Complete re-audit of all changes — MVP APPROVED
- [x] Pre-deploy fixes: rate limiting, inline error banner, comparison personalization
- [x] PO Round 3: Quick review of card layout, protein filter, comparison redesign — Ship approved
- [x] PO Deep Research: Food card design, filter UX, comparison best practices, engagement features
- [x] All code pushed to GitHub

---

## PHASE 15: Human Testing & Final Polish — DONE

**Objective:** Real humans test the app. Fix issues found. Implement PO research recommendations.

### Human Testing — Round 1 Complete
- [x] Tested app end-to-end
- [x] Found: Food cards too packed, Shop button collapsing
- [x] Found: Protein filter pills too many, no ingredient search
- [x] Found: Comparison tool needs more work
- [x] Found: Open Farm images broken (45 fixed)
- [x] Initial fixes deployed: card spacing, protein filter, comparison redesign, images

### PO Deep Research — Complete
- [x] Food card research: Baymard Institute, Chewy, Farmer's Dog, NNG 3-second scan rule
- [x] Filter UX research: Chewy faceted lists, Amazon type-ahead, Baymard best practices
- [x] Comparison tool research: RTings, GSMArena, Versus.com, NerdWallet, Wirecutter
- [x] Engagement feature research: Feeding calculator selected (highest impact/effort ratio)

### Scoring Algorithm — Vet Science Audit — DONE
- [x] PO conducted veterinary science audit (AAFCO, NRC, WSAVA, Tufts references)
- [x] Removed grain-free +5 bonus (FDA/DCM investigation — actively harmful)
- [x] Lowered protein thresholds ~8% (sled-dog → companion dog levels)
- [x] Removed "meal" and "by-product" from controversial ingredients (AAFCO-approved)
- [x] Reduced kibble size scoring from 20 → 5 points (was 4x over-weighted)
- [x] Added NEW life-stage nutrition scoring (15 pts): puppy Ca:P + DHA, senior fiber + omega-3
- [x] Flattened price scoring to 3-5 range (was 2-5, over-influencing rankings)
- [x] Added caloric density scoring (3500-4200 kcal/kg optimal)
- [x] New score breakdown: Activity+Goal 40 + Nutritional Quality 25 + Life Stage 15 + Ingredient 10 + Kibble 5 + Price 5 = 100
- [x] Null-check safety net: missing Ca:P data (0 values) awards neutral 7/15 instead of 0/15 (puppy + adult branches)

### Final UX Improvements — DONE
- [x] **Food Card simplification** — reduced from 13 to 7 surface elements, progressive disclosure
  - Visible: image, brand eyebrow, title, score+allergy badge, 2 match reasons, price, Shop button
  - Click opens ProductDetail overlay (no in-place expansion)
- [x] **Product Detail Overlay** — DoorDash-style slide-up overlay replacing in-place card expansion
  - Hero section with ScoreRing, product image, brand, title, all match reasons
  - 3 monochromatic blue zones (nutrition, ingredients, calculator)
  - Prev/next navigation with arrow key support
  - Desktop: centered 720px panel; Mobile: full-screen overlay
  - Focus trap, scroll lock, URL state via `?product={id}`
  - New ProductDetail.jsx (~461 lines) + detail-overlay.css
- [x] **ScoreRing component** — shared SVG circular gauge (64px, animated, color-coded)
  - Used in ProductDetail and ComparisonTool
- [x] **Filter bar redesign** — popover filter buttons (Airbnb/ASOS pattern)
  - Single row of pill buttons: [Brand ▾] [Protein ▾] [Grain-Free] [Price ▾] [Sort ▾]
  - Popovers with checkboxes + counts, one open at a time
  - Active filter chips below with ✕ remove
  - Mobile: popovers become bottom sheets with slide-up animation
  - New FilterBar.jsx component (~180 lines)
- [x] **Feeding Calculator** — inside product detail overlay (Zone 3)
  - Formula: RER = 70 × (weight_kg ^ 0.75), MER = RER × activity × goal
  - Shows: cups/day, cups/meal, cost/day, cost/month, bag duration
  - Weight input inside calculator (no backend changes)
  - Vet disclaimer included
  - New feedingCalculator.js utility (~83 lines)
- [x] **Premium design upgrades** — monochromatic blue zones, IntersectionObserver bar animations, semantic tag colors
- [x] **Brand logo strip** — 48px brand logos below profile card on recommendations page
- [x] **Allergy filter count banner** — shows how many products were filtered out for allergen safety
- [x] **Dynamic price filter ranges** — quartile-based instead of hardcoded
- [x] **Dynamic Product Pool** — backend sends up to 40 products, frontend displays 20 by default; filters/sort reveal more from the hidden pool
- [x] **Start Over button** — in header + bottom CTA

### Pre-Launch Frontend Fixes — DONE
- [x] **Bug fixes (5):** localStorage crash guard (try-catch + removeItem), auto-advance timer leak (useRef + cleanup useEffect), feeding calculator weight validation (error state), product title derivation fix (regex from product ID), dead code removal (AllergyPills.jsx deleted, unused `reasonsForMatch()` removed)
- [x] **Accessibility fixes (4):** Touch targets ≥44px (quick-action buttons, filter buttons, remove-pill buttons, allergen chips), color contrast ≥4.5:1 (`--subtitle-color` #4a4a4a, placeholder #767676), ARIA roles corrected (`role="group"` on filter popovers), keyboard focus trap in ComparisonTool modal with focus return
- [x] **Performance optimizations (2):** FoodCard wrapped in `React.memo()`, Recommendations callbacks stabilized with `useCallback` (handleToggleCard, openCompareModal, closeCompareModal)
- [x] **Security fixes (4):** Session token stored in localStorage and sent as `X-Session-Token` header (getPet, updatePet, deletePet), `.env.production` updated with production URL, source maps disabled in production build, CSP meta tag added to `index.html`
- [x] **Logo placement:** Logo moved above progress bar (visible on all 7 wizard steps), sized 88px desktop / 64px mobile on form, 80px / 64px on recommendations page

### Human Testing — Round 2 (completed on production)
- [x] Tested overlay UX — smooth slide-up, prev/next navigation works
- [x] Tested popover filters — intuitive, scales well
- [x] Tested product detail zones — nutrition bars readable, calculator works
- [x] Tested scoring — results make sense with vet-validated thresholds
- [x] QA from vet perspective and customer perspective
- [x] Critical issues fixed before deploy

### Security Hardening (completed — Phases 15 + 19)
- [x] Session token auth (UUID per pet) on GET/PUT/DELETE pet endpoints
- [x] Security headers: HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, X-XSS-Protection, Referrer-Policy
- [x] CSP meta tag in frontend (restricts scripts, styles, connections) + Vercel Analytics whitelisted
- [x] Rate limiting: POST pets 5/min, PUT/DELETE 5/min, recommendations 20/min, magic link 3/min, global 60/min
- [x] Source maps disabled in production builds
- [x] Brand regex sanitized with `re.escape()`
- [x] `/docs`, `/redoc`, and `/openapi.json` disabled when `ENV=production`
- [x] HTML stripping on scraped data
- [x] CORS: `allow_credentials=False`, explicit methods/headers, PATCH added
- [x] Defense-in-depth allergen filtering: allergen_tags check + ingredient text scan
- [x] npm audit: 0 vulnerabilities (axios, react-router, rollup, etc. all updated)
- [x] JWT authentication with production crash guard (refuses to start without `JWT_SECRET`)
- [x] Magic link tokens SHA-256 hashed before storage (plaintext never persisted in DB)
- [x] IP addresses hashed (truncated SHA-256, field renamed `ip_address` → `ip_hash`)
- [x] Log scrubbing: emails truncated, tokens show last 4 chars only
- [x] Owner-only authorization on all purchase endpoints (user_id verified)
- [x] Privacy Policy + Terms of Service pages with legal consent links
- [x] Error boundary wrapping entire React app
- [x] Account deletion removes all user data (user + pets + purchases)

---

## PHASE 16: Deployment — DONE

**Objective:** Deploy to the internet. **Completed 2026-03-10.**

### Step 1: Database (MongoDB Atlas) — DONE
- [x] Create free-tier MongoDB Atlas cluster (M0)
- [x] Create database user with read/write access
- [x] Whitelist IPs — use Railway's static outbound IPs or your deployment platform's IP range. **NEVER use `0.0.0.0/0` in production** (allows all IPs). Use it only temporarily during initial setup, then restrict immediately
- [x] Get connection string
- [x] Import product_data.csv to Atlas
- [x] Verify products exist in Atlas (80 at initial deploy, 114 after PU expansion)

### Step 2: Backend (Railway) — DONE
- [x] Root directory set to `backend`
- [x] Configure start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [x] Set environment variables:
  - `MONGODB_URL` = Atlas connection string
  - `ALLOWED_ORIGINS` = `https://pet-ai-assistant-seven.vercel.app`
  - `DATABASE_NAME` = petai
  - `ENV` = production (disables `/docs`, `/redoc`, `/openapi.json`)
  - `JWT_SECRET` = random 64-char secret (REQUIRED — app crashes without it)
  - `RESEND_API_KEY` = Resend API key for magic link emails
  - `MAGIC_LINK_BASE_URL` = `https://pet-ai-assistant-seven.vercel.app`
- [x] Deploy
- [x] Verify `/health` returns healthy
- [x] Verify `/api/products` returns products (80 at initial deploy, 114 after PU expansion)

### Step 3: Frontend (Vercel) — DONE
- [x] Update `.env.production` with real `VITE_API_URL` (Railway URL, `https://`)
- [x] Verify CSP meta tag in `index.html` allows `connect-src` to the production API URL
- [x] Deploy to Vercel
- [x] SSL/HTTPS automatic via Vercel
- [ ] Configure custom domain (optional, post-launch)

### Step 4: Security Verification (POST-DEPLOY TODO)
- [ ] `GET /docs` returns 404 (not Swagger UI)
- [ ] `GET /redoc` returns 404
- [ ] `GET /openapi.json` returns 404
- [ ] Response headers include `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`
- [ ] Rate limiting works: 6th `POST` to `/api/pets` within 1 minute returns 429
- [ ] `PUT /api/pets/{id}` without `X-Session-Token` header returns 422 (missing required header)
- [ ] `PUT /api/pets/{id}` with wrong `X-Session-Token` returns 403
- [ ] `GET /api/auth/me` without Authorization header returns 422
- [ ] `GET /api/auth/me` with invalid JWT returns 401
- [ ] `ALLOWED_ORIGINS` uses `https://` URLs only
- [ ] `VITE_API_URL` in frontend uses `https://`
- [ ] `JWT_SECRET` is set on Railway (not the dev default)
- [ ] `RESEND_API_KEY` is set on Railway
- [ ] `MAGIC_LINK_BASE_URL` is set to Vercel URL (https://)
- [ ] MongoDB Atlas network access restricted to deployment platform IPs only (not `0.0.0.0/0`)
- [x] Remove `http://localhost:*` from CSP `connect-src` in `index.html`

### Step 5: End-to-End Verification — DONE
- [x] Update `ALLOWED_ORIGINS` to include Vercel domain
- [x] Test full flow: Vercel → Railway → Atlas
- [x] Create pet profile on production
- [x] Get recommendations on production
- [x] Test filters, sort, comparison on production
- [ ] Test on mobile (iOS Safari, Android Chrome) — deferred, planned for in-store tablet testing
- [ ] Share URL with 2-3 people for feedback

---

## PHASE 17: Launch & Monetization

**Objective:** Go live, get users, build presence.

### Launch (Week of Mar 23-29)
- [ ] Official public launch announcement
- [ ] Share live URL with broader audience
- [ ] Post on LinkedIn / portfolio
- [ ] Add to resume with live demo link
- [ ] README: add screenshot/demo GIF + live demo link
- [ ] Make GitHub repo private after coding week (Mar 22)

### Monetization — Affiliate Links (DEFERRED)
- [ ] Research which Canadian pet retailers have affiliate programs (PetValu, Chewy.ca, Amazon.ca)
- [ ] Apply to PetValu affiliate program (all products already link to PetValu.ca)
- [ ] Add affiliate tracking parameters to all "Shop" button URLs
- [ ] Track click-through rates
- **Note:** On hold — requires store partnership negotiations. Revisit when user base is larger. Long-term goal is to be a platform that services all retailers.

### Feedback Loop
- [ ] Collect user feedback from soft launch (managers, store owners, friends)
- [ ] Add feedback mechanism (form or email link)
- [ ] Prioritize next features from real user needs

---

## PHASE 18: Brand Expansion — IN PROGRESS

**Objective:** Grow product catalog. Target: 300+ products across 10 brands.

### Dog Dry Food Brands
| # | Brand | Products (est.) | Status | Notes |
|---|-------|----------------|--------|-------|
| 1 | Orijen | 13 | Live | Premium, grain-free |
| 2 | Acana | 25 | Live | Premium, mixed grain |
| 3 | Open Farm | 42 | Live | Ethically sourced |
| 4 | Performatrin Ultra | 34 | Live | PetValu house brand |
| 5 | Go! Solutions | 24 | Live | Canadian mid-tier, Petcurean. Full GA data, PetValu pricing |
| 6 | Now Fresh | 12 | Live | Grain-free, fresh ingredients, Petcurean. Full GA data |
| 7 | Royal Canin | ~40 | Next | #1 vet-recommended, breed-specific formulas |
| 8 | Hill's Science Diet | ~30 | Planned | Vet channel, strong trust signals |
| 9 | Stella & Chewy's | ~20 | Planned | Raw-coated kibble, premium |
| 10 | Purina Pro Plan | ~35 | Planned | Science-backed, widely available |

### For each brand:
- [ ] Research full dry food lineup
- [ ] Scrape/collect all 32 CSV fields
- [ ] Normalize data and import to product_data.csv
- [ ] Add brand logo to frontend
- [ ] Verify scoring algorithm works with new products
- [ ] Import to Atlas production
- [ ] Update product counts in documentation

---

## PHASE 19: User Accounts & Pet Dashboard — SPRINT (Mar 16-22)

**Objective:** Transform from a one-time tool into a persistent experience. Users own their profiles, track their food, and come back.

**Status:** DEPLOYED to production (Mar 18). PO audit + QA + security audit done. All P0-P2 issues fixed. UI overhauled. Final PO audit (Mar 22) — 12 additional fixes applied. 150 products live across 6 brands.

### 19A: User Accounts & Authentication — BUILT
- [x] Magic link auth (passwordless email login via Resend)
- [x] JWT tokens (30-day expiry, HS256, Bearer header)
- [x] `users` collection with indexes (email unique, magic_link_token)
- [x] Login page (`/login`) — 3-state: email input → sent confirmation → error
- [x] Magic link verification page (`/auth/verify/:token`)
- [x] `get_current_user()` JWT dependency for protected endpoints
- [x] Auth utility (`auth.js`) — get/set/clear token, isAuthenticated, getAuthHeader
- [x] ProtectedRoute wrapper component
- [x] Guest mode fully preserved — anonymous form + recommendations unchanged
- [x] Anonymous pet claiming via session_token on magic link verification
- [x] Magic link email tested — sends successfully (lands in spam with sandbox domain, need real domain for production)
- [x] Magic link verify idempotent — handles React StrictMode double-mount, retries within 60s
- [x] `load_dotenv()` added to main.py — `.env` file now auto-loaded on startup
- [x] Resend sandbox sender: `onboarding@resend.dev` (can only send to owner's email until domain verified)
- [ ] PO decision: Google OAuth + Apple Sign-In deferred to iOS launch (April)
- [ ] Multi-pet UI deferred to V2 (schema supports it)

### 19B: Pet Dashboard — BUILT
- [x] Dashboard page (`/dashboard`) — protected route
- [x] Pet profile card (name, breed size, age, activity, goal, allergies)
- [x] Active food card with product image, match score, bag size, price
- [x] Depletion progress bar with color coding (blue > amber > red)
- [x] Days remaining calculation + estimated empty date
- [x] Feeding stats: cups/day, cost/day, bag duration
- [x] Purchase history list with dates, products, sizes, costs
- [x] "switched" label on food changes
- [x] Spending summary (total, bags, avg/month)
- [x] Empty states for no purchases, no active food
- [x] Quick actions: View Recommendations, Reorder, Log New Purchase
- [x] Header navigation: Dashboard link, Account dropdown (when logged in)
- [x] "← Dashboard" back link on recommendations page (when logged in)
- [x] Root `/` redirects to `/dashboard` if authenticated
- [x] Mobile responsive layout
- [x] Unified header: same nav on both `/recommendations` and `/dashboard` when logged in
- [x] Pet profile card matches recommendations page layout (same avatar, info grid, brand strip)
- [x] Brand logo strip on dashboard (same as recommendations)
- [x] Page transitions: subtle fade+slide animation between all pages
- [x] Dashboard CSS rewritten to match app design system (gradient cards, blue borders, zone patterns)
- [x] Personalized greeting with time-of-day + urgency prompt when food runs low
- [x] "On this food for X days" tenure counter
- [x] Direct reorder link with retailer name (when source_url exists)
- [x] Match score badge on active food card (when available)
- [x] Click-to-toggle Account dropdown (replaced hover — works on mobile)
- [x] Scroll-to-top on page navigation (useLayoutEffect + post-load requestAnimationFrame)
- [x] "Start Over" navigates to `/?new=true` to bypass auth redirect
- [ ] Pet profile editing from dashboard — deferred to V2
- [ ] Multi-pet switcher UI — deferred to V2

### 19C: Purchase Tracking — BUILT
- [x] "I Bought This" button in ProductDetail overlay sticky footer
- [x] Log Purchase modal — 2-step: select product → confirm details
- [x] `purchases` collection with indexes
- [x] `product_snapshot` denormalized at purchase time
- [x] Depletion calculation: `grams_per_cup` → `total_cups` → `days_in_bag`
- [x] Depletion fallback: 30 days if calorie data missing
- [x] Auto-complete previous active purchase (status → "switched") on new purchase
- [x] API endpoints: POST/GET/PUT/PATCH/DELETE `/api/purchases` (+ extend endpoint)
- [x] PUT `/api/purchases/{id}` — edit bag_size_kg/cups_per_day, recalculates depletion
- [x] PATCH `/api/purchases/{id}/extend` — extend active purchase depletion by 7 days
- [x] `product_snapshot` includes `source_url` and `retailer`
- [x] `match_score` stored on purchase (optional, from frontend recommendation score)
- [x] Purchase history with dates and products on dashboard
- [x] Bag size defaults to product.size_kg, user-editable
- [x] Cups/day from feeding calculator, user-editable
- [x] Estimated bag duration + cost/day + cost/month shown before confirming
- [x] Smart cups/day default by breed size (small=0.75, medium=1.5, large=2.5)
- [x] Delete purchase from history (trash icon, custom confirmation modal, toast)
- [x] Edit active purchase (reopens modal with pre-filled values, calls PUT)
- [x] "I Still Have Some" extend button (+7 days when bag shows empty, calls PATCH)
- [x] API endpoints: PUT `/api/purchases/{id}`, PATCH `/api/purchases/{id}/extend`

### 19D: Reorder Reminders — PARTIAL
- [x] Depletion progress bar turns amber at 30%, red at 10%
- [ ] Explicit reorder alert banner (≤5 days) — deferred to V2
- [ ] Email reminders — deferred (need real domain + email service setup)
- [ ] Notification preferences — deferred to V2

### 19E: Cost Tracking — BUILT
- [x] Cost per day/month display on active food card
- [x] Spending summary on dashboard (total, bags, avg/month)
- [ ] Yearly spending projection — deferred to V2
- [ ] Spending history chart — deferred to V2

### 19F: Save Results & Conversion — BUILT
- [x] "Save Results" card in food grid (3rd position, anonymous users only)
- [x] Trigger: first overlay close OR scroll past 5th food card (removed 15s timer)
- [x] 30-day lockout after 3 dismissals (localStorage counter)
- [x] Card matches food card design (same dimensions, shadow, radius)
- [x] "I Bought This" triggers signup for anonymous, stores pending product ID in sessionStorage
- [x] After login, auto-opens LogPurchaseModal with the pending product pre-selected

### 19G: Account Management — BUILT
- [x] Account page (`/account`) — protected route
- [x] Email display (fixed: reads correct response path)
- [x] Log out (clears JWT + localStorage, redirects to `/`)
- [x] Delete account with confirmation modal + error handling
- [x] DELETE `/api/auth/me` endpoint — deletes user, pets, and purchases
- [x] "← Back to Dashboard" link on account page
- [ ] Export data — deferred to V2

### Integration Testing — DONE (Mar 17)
- [x] Magic link email sends (confirmed via Resend sandbox)
- [x] Full end-to-end flow: form → recommendations → signup → dashboard → log purchase — WORKING
- [x] CSP: `http://localhost:*` added back for local dev
- [x] `load_dotenv()` added — `.env` auto-loaded
- [x] Magic link verify: idempotent (handles double-mount, retries)
- [x] Pet claiming via session_token during verification — working
- [x] Purchase logging + dashboard refresh — working
- [x] Delete account — working
- [ ] Deploy Phase 19 to production (Railway + Vercel + Atlas)

### PO Audit (Mar 17) — 18 issues found, 17 fixed
- P0: DELETE `/api/auth/me` endpoint — FIXED
- P1: 5 issues (recommendations petId param, button classes, delete error handling, purchase intent preservation, empty pet recovery) — ALL FIXED
- P2: 7 issues (resend cooldown, verify success flash, dashboard bg, mobile grid, banner height, pet check, cups/day defaults) — ALL FIXED
- P3: 5 issues (welcome copy, edit button, bullet style, label a11y, redundant field) — DEFERRED to post-launch

### QA Report (Mar 17) — 7 bugs found
- B1: DELETE endpoint 405 — NOT A BUG (stale server)
- B2: Resend API key — NOT A BUG (missing env vars in QA environment)
- B3: Account shows "Unknown" — FIXED (response path mismatch)
- B4: Resend doesn't resend — FIXED (now calls API with 30s cooldown)
- B5: No purchase success toast — FIXED (green toast, 2.5s auto-dismiss)
- B6: Dead CSS class — cosmetic, deferred
- B7: Account back link alignment — minor, deferred

### UI Overhaul (Mar 17)
- Dashboard CSS completely rewritten to match app design system
- All cards use gradient + blue border + layered shadow (matching `.profile-card`)
- Zones use left-border accent pattern (matching `.detail-overlay-zone`)
- Buttons use gradient/outline patterns (matching `.submit-btn` / `.detail-buy-btn`)
- Unified header across recommendations + dashboard (when logged in)
- Pet profile card on dashboard matches recommendations page layout exactly
- Brand logo strip added to dashboard
- Page fade+slide transitions on all pages
- Login card matches form card (gradient, accent stripe, blue border)
- Product detail footer buttons: identical height via `align-items: stretch`
- `h1::before` emoji scoped to `.form-card` only (was global)

### 19H: Launch Prep — BUILT
- [x] PetForm text updated: "150+ foods from 6 premium brands"
- [x] OG image: absolute URL (https://pet-ai-assistant-seven.vercel.app/logo.png)
- [x] `.env.production`: VITE_API_URL set to production Railway URL
- [x] Feedback links: "Report an issue" mailto on Account + Dashboard
- [x] Vercel Analytics installed (`@vercel/analytics`) + CSP updated for script
- [x] ErrorBoundary component wrapping entire app
- [x] `robots.txt` + `sitemap.xml` created
- [x] Privacy Policy page (`/privacy`)
- [x] Terms of Service page (`/terms`)
- [x] Legal links on Login, Account, PetForm pages
- [x] Code cleanup: JSDoc on all components, dead CSS removed, prop defaults added, App.css deleted
- [x] `window.history.scrollRestoration = 'manual'` in App.jsx
- [x] npm audit: 0 vulnerabilities

### 19I: Pre-Launch Security Hardening — DONE
- [x] **C1: JWT_SECRET crash guard** — app refuses to start in production if `JWT_SECRET` not set (raises `RuntimeError`)
- [x] **C2: Magic link token hashing** — tokens SHA-256 hashed before storage. Raw token in email, hash in DB. Consumed token hash stored for idempotent verify
- [x] **H1: Log scrubbing** — emails truncated in logs (`jab...gmail.com`), tokens show last 4 chars only, no full magic link URLs logged
- [x] **H3: IP hashing** — pet creation stores `ip_hash` (truncated SHA-256), not raw IP address. Field renamed `ip_address` → `ip_hash`
- [x] **Code cleanup** — unused `asyncio` import removed, stale comments updated, module docstring rewritten with section index
- [x] **CORS** — `PATCH` added to `allow_methods` (needed for purchase extend endpoint)
- [x] `.env.example` updated with all env vars and descriptions
- [x] `python-dotenv` + `load_dotenv()` — `.env` auto-loaded before any `os.getenv()` calls

### Final PO Audit (Mar 22) — 12 fixes applied
- P0: Added Sign In link to form page header
- P0: Removed "+ Add Pet" button (multi-pet is V2, prevents invisible pet creation)
- P1: Added "Don't see your food? Browse all products →" link in Log Purchase modal
- P2: Renamed "Start Over" → "New Pet" for authenticated users
- P2: Login page "Welcome back" → "Sign in to your account"
- P2: Spending summary hidden until 2+ purchases
- P2: Removed redundant "Browse New Recommendations" bottom CTA
- P2: Mobile purchase history hides thumbnails (4-column grid)
- P3: Account dropdown added to Recommendations authenticated header
- P3: Pet card Edit button removed (V2 feature)
- P3: Account page shows "Member since" + pet/purchase count
- P3: Dropdown overflow verified (right-aligned)

### Known Issues (pre-launch)
- Magic link emails land in spam (Resend sandbox domain). Need real domain before launch.
- Resend sandbox can only send to owner's email — need verified domain for other users
- Some Open Farm products have incomplete `line` field (shows "Functional" instead of full product name) — Data tab fixing

### Remaining Security Items (post-launch)
- JWT 30-day expiry with no revocation mechanism (acceptable for MVP — DB user lookup catches deleted accounts)
- No token blocklist (if JWT stolen, valid until 30-day expiry; CSP mitigates XSS theft)
- Email addresses in logs (truncated but still present — consider removing post-launch)
- `purchase_helper` exposes internal `user_id` (ObjectId string) in API responses (not exploitable, cosmetic)
- No data export feature for PIPEDA Subject Access Requests (handle manually via email for now)
- No formal breach response plan (document post-launch)
- Privacy Policy states "encryption at rest" — M0 free tier does not have this; accurate for in-transit only

### Success metrics:
- Account creation rate: >30% of users who get recommendations
- Purchase log rate: >20% of account holders
- Reorder click-through: >15% of "running low" banner views (measurement pending — reorder banner is V2)
- 30-day return rate: >25% of account holders

---

## PHASE 20: Mobile Polish & Responsive (Mar 21-22)

**Objective:** Ensure the web app works flawlessly on phones. Most users will be on mobile.

- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Android Chrome
- [ ] Touch targets ≥44px audit
- [ ] Form wizard mobile flow (thumb-friendly navigation)
- [ ] Dashboard responsive layout
- [ ] Product detail overlay — full-screen mobile experience
- [ ] Filter bottom sheets (already built, verify on real devices)
- [ ] Performance audit (Lighthouse mobile score)
- [ ] Fix any issues found in real-device testing

---

## PHASE 21: Docker & Infrastructure

**Objective:** Containerize for cleaner deployment, easier scaling, and iOS backend readiness.

- [ ] Dockerfile for backend (FastAPI + uvicorn)
- [ ] docker-compose.yml (backend + MongoDB for local dev)
- [ ] Environment variable management (dev vs prod)
- [ ] Deploy containerized backend to Railway
- [ ] Health check integration
- [ ] CI/CD pipeline (GitHub Actions → build → test → deploy)
- [ ] Automated test suite (pytest for backend, basic endpoint tests)

---

## PHASE 22: iOS Native App (SwiftUI) — April 2026

**Objective:** Native iOS app for App Store presence, push notifications, and premium mobile experience.

**Why native over React Native/Flutter:** Best UX, Apple ecosystem integration (widgets, push, Health app), App Store credibility. Backend is already built — iOS is just a new frontend calling the same API.

**Sequence:** Web features finalized first (accounts, dashboard, tracking) → iOS ports the proven UX → adds native-only features on top. Every API endpoint already exists from the web sprint.

### 22A: Core App
- [ ] SwiftUI project setup
- [ ] Connect to existing FastAPI backend (same API, new client)
- [ ] Pet profile creation wizard (port from web)
- [ ] Recommendations view with scoring
- [ ] Product detail view
- [ ] Filter and sort
- [ ] Comparison tool

### 22B: Native-Only Features
- [ ] Push notifications: reorder reminders, price drops, new products
- [ ] Home screen widget: bag depletion countdown, daily feeding reminder
- [ ] Barcode scanner: scan food bag → log purchase in one tap
- [ ] Offline mode: cached recommendations, feeding calculator works without internet
- [ ] Apple Sign-In integration
- [ ] Haptic feedback on interactions

### 22C: App Store
- [ ] App Store listing: screenshots, description, keywords
- [ ] App icon and launch screen
- [ ] Privacy policy and terms
- [ ] TestFlight beta testing
- [ ] App Store submission and review

### Architecture:
```
iOS App (SwiftUI) ──→ FastAPI Backend ←── Web App (React)
                          ↓
                     MongoDB Atlas
```
Same backend serves both clients. No API duplication.

---

## PHASE 23: Community Platform — Social Media for Pet Food (Summer 2026)

**Objective:** Transform from a utility into a social platform. Users share experiences, discover what works for dogs like theirs, and build a community around pet nutrition.

**Vision:** Untappd meets Instagram meets Yelp, but for pet food. Built on real nutritional data, not just vibes.

### 23A: Public Pet Profiles
- [ ] Public profile pages: "Meet Max, 3yr Golden Retriever"
- [ ] Pet photo upload + avatar
- [ ] Current food + feeding routine displayed
- [ ] Health stats: weight history, activity level
- [ ] Privacy controls: public / friends-only / private

### 23B: Food Reviews & Ratings
- [ ] Star ratings on products (1-5) from real users
- [ ] Written reviews with structured fields (coat quality, energy, digestion, palatability)
- [ ] Before/after photos (e.g., "coat improved in 2 weeks")
- [ ] Review helpfulness voting
- [ ] Community score displayed alongside algorithm score
- [ ] "Verified purchase" badge (from purchase tracking data)

### 23C: Social Feed & Discovery
- [ ] Timeline feed: see what dogs similar to yours are eating
- [ ] Follow dogs with same breed/size/allergies/conditions
- [ ] Success stories: "Lost 5lbs in 3 months on Hill's weight management"
- [ ] Comments and discussion threads
- [ ] Trending: "Stella & Chewy's is trending among large breed puppies this month"
- [ ] Local: "Most popular food among dogs in Toronto"

### 23D: Community Rankings
- [ ] Food rankings by community votes (not just algorithm)
- [ ] "Top 10 foods rated by Golden Retriever owners"
- [ ] "Best food for puppies with chicken allergies" (crowd-sourced)
- [ ] Rankings by breed, size, age, condition
- [ ] "X people are feeding this to dogs like yours"

### 23E: Brand Pages
- [ ] Brand profiles with all their products
- [ ] Community sentiment: what people are saying
- [ ] New product announcements
- [ ] Recall alerts and safety notices
- [ ] Brand news feed on home page

### 23F: Similar Dogs Matching
- [ ] "Dogs like yours" — find dogs with same breed, size, age, allergies
- [ ] See what they eat, what worked, what didn't
- [ ] Collaborative filtering: "83% of large breed puppies on this app eat Orijen"
- [ ] Chat/message other owners (future)

### Success metrics:
- Review submission rate: >10% of users who purchase
- DAU/MAU ratio: >20% (daily active / monthly active)
- Content creation: >5 reviews/day at 1000 users
- User retention: 60-day return rate >40%

---

## PHASE 24: Species & Format Expansion (Ongoing)

**Objective:** Expand beyond dog dry food to become the complete pet food platform.

### 24A: Cat Food (Dry)
- [ ] Cat profile creation (breed, age, indoor/outdoor, weight, conditions)
- [ ] Cat-specific scoring algorithm:
  - Higher protein requirements than dogs
  - Taurine content (essential for cats, not dogs)
  - Moisture considerations (cats are prone to dehydration)
  - Different life stage thresholds (kitten vs adult vs senior)
  - AAFCO cat food nutrient profiles
- [ ] Cat brands: Royal Canin, Hill's, Purina, Orijen Cat, Acana Cat, etc.
- [ ] Separate product collection or species tag on products
- [ ] Species selector on form: "Dog" or "Cat" at step 1

### 24B: Raw Food (Dog + Cat)
- [ ] Raw food scoring factors:
  - Pathogen safety (HPP treated, testing protocols)
  - Handling/storage requirements
  - Complete vs supplemental formulas
  - Bone content (for raw meaty bones)
  - AAFCO complete and balanced verification
- [ ] Raw food brands: Stella & Chewy's, Primal, Big Country Raw, Iron Will Raw
- [ ] Storage and handling guidance in product detail
- [ ] Transition guide: kibble → raw

### 24C: Wet Food (Dog + Cat)
- [ ] Wet food scoring adjustments:
  - Moisture content normalization (dry matter basis comparison)
  - Different kcal/unit calculations (per can, not per cup)
  - Texture preferences (pâté, chunks, shreds)
- [ ] Mixed feeding calculator: kibble + wet food combinations
- [ ] Cost comparison: wet vs dry vs mixed

### 24D: Treats (Future)
- [ ] Treat scoring: supplemental nutrition, not complete diet
  - Calorie density (training treats vs chew treats)
  - Single-ingredient vs complex treats
  - Allergen safety
- [ ] Treat recommendations based on training goals, allergies, and preferences

### Target catalog:
| Category | Brands | Products (est.) |
|----------|--------|----------------|
| Dog dry | 10 | 300+ |
| Dog raw | 4-5 | 50+ |
| Dog wet | 5-6 | 100+ |
| Cat dry | 6-8 | 150+ |
| Cat raw | 3-4 | 30+ |
| Cat wet | 5-6 | 80+ |
| Treats | 5+ | 50+ |
| **Total** | **20+** | **750+** |

---

## PHASE 25: ML-Powered Recommendations (Fall 2026)

**Objective:** Replace rule-based scoring with machine learning that learns from real user behavior. The Netflix recommendation problem, but for pet food.

**Prerequisites:**
- ~500+ purchase records (behavioral signal)
- ~100+ "switched food" events (negative signal)
- Community ratings on 50+ products
- ~6 months of user data after launch

### 25A: Data Collection Layer
- [ ] Track all recommendation views (impressions)
- [ ] Track all product clicks (interest signal)
- [ ] Track all purchases (conversion signal)
- [ ] Track food switches (negative signal: old food failed)
- [ ] Track community ratings (satisfaction signal)
- [ ] Track reorder events (retention signal: dog keeps eating it)
- [ ] Data pipeline: MongoDB → training dataset

### 25B: ML Models

| Model | Input | Output | Purpose |
|-------|-------|--------|---------|
| Collaborative filtering | Pet profile + purchase history of similar dogs | Product rankings | "Dogs like yours bought X" |
| Hybrid model | Rule-based score + behavioral signals | Blended score | Combine nutrition science with real-world outcomes |
| Outcome prediction | Pet profile + product features | Stick probability | Predict which food a dog will keep eating (not just score highest) |
| Personalized ranking | All signals | Custom product order | Same 300+ products, different order for every dog |

### 25C: Training & Deployment
- [ ] Feature engineering: pet embeddings, product embeddings
- [ ] Model training pipeline (Python, scikit-learn / PyTorch)
- [ ] A/B testing framework: rule-based vs ML recommendations
- [ ] Model versioning and rollback
- [ ] Monitoring: recommendation quality metrics
- [ ] Cold-start fallback: new users get rule-based scoring until enough data exists

### 25D: ML-Powered Features
- [ ] "Dogs like yours love this" — collaborative filtering recommendations
- [ ] "Predicted to work for [name]" — outcome prediction score
- [ ] "Trending for Golden Retrievers" — breed-specific popularity
- [ ] Smart reorder timing — learn actual consumption rate per dog (not just formula)
- [ ] "You might also like" — cross-product recommendations

### What makes this defensible:
- **Proprietary dataset:** Pet profiles + purchase outcomes + community ratings = data no one else has
- **Network effects:** More users → better recommendations → more users
- **Cold-start advantage:** Rule-based scoring (already built) handles new users; ML kicks in for returning users

---

## PHASE 26: Home Page & Content Hub

**Objective:** Create a landing experience beyond the recommendation wizard. News, rankings, and discovery.

### Home Page (`/`)
- [ ] Hero section: value prop + CTA to create profile
- [ ] Latest brand news and product launches
- [ ] Community food rankings (top rated this week/month)
- [ ] Trending products by breed/size
- [ ] Recent reviews from the community
- [ ] "Dogs like yours are eating..." teaser (requires login)
- [ ] SEO-optimized content sections

### Blog / Content Pages
- [ ] Blog targeting high-volume searches:
  - "best dog food for large breed puppies"
  - "best grain-free dog food for allergies"
  - "dog food for weight loss senior dogs"
  - "best cat food for indoor cats"
- [ ] Each post drives traffic to recommendation tool
- [ ] Brand comparison articles (auto-generated from data)
- [ ] Recall alerts and safety news
- [ ] Nutrition education content

---

## PHASE 27: Advanced Features (2027+)

### Comparison Tool Upgrades
- [ ] Verdict banner: "Orijen wins 5 of 8 categories. Best for active dogs."
- [ ] Progress bars on numeric rows (winner in green, loser in gray)
- [ ] Collapsible sections with section-level winner counts
- [ ] "Show differences only" toggle
- [ ] Radar/spider chart for nutrition overlay

### Platform Features
- [ ] Share results (copy link, shareable URL)
- [ ] Vet-shareable PDF export
- [ ] "Why not 100%?" score breakdown indicator
- [ ] Price comparison across retailers
- [ ] Price alerts ("This food dropped 15% at PetValu")
- [ ] Scheduled scraper runs (cron) for price updates
- [ ] Ingredient synonym mapping ("chicken" catches "chicken meal", "chicken fat")
- [ ] Multi-retailer support (PetValu, Chewy.ca, Amazon.ca, pet store chains)

### AI Features
- [ ] AI-powered explanations: "Here's why this food scored 85 for [name]..." (Claude/OpenAI)
- [ ] Natural language search: "Show me grain-free food for my senior lab with a chicken allergy"
- [ ] AI nutritionist chat: ask questions about your dog's diet
- [ ] Auto-generated food transition plans

### Infrastructure
- [ ] CI/CD pipeline (GitHub Actions → build → test → deploy)
- [ ] Automated test suite (pytest + Playwright)
- [ ] Admin dashboard (user stats, product management, analytics)
- [ ] API rate tiers (free vs premium)
- [ ] Database scaling (Atlas M10+ when needed)

---

## Decision Log

| Decision | Choice | Reason |
|----------|--------|--------|
| Hosting (backend) | Railway or Render | Free tier, easy Python deploy, env vars |
| Hosting (frontend) | Vercel | Free, instant deploy, automatic HTTPS |
| Database | MongoDB Atlas | Free tier, managed, same driver as local |
| Auth (guest) | Session token (UUID per pet) | `X-Session-Token` header for pet CRUD. Works without account |
| Auth (accounts) | Magic link + JWT | Passwordless via Resend. SHA-256 hashed tokens. 30-day JWT. No passwords to breach |
| Token storage | SHA-256 hash in DB | Raw token in email, hash in DB. If MongoDB breached, tokens unusable |
| Docker | Skipped for MVP | Railway/Render handle builds directly |
| Brands (MVP) | Orijen, Acana, Open Farm | Premium, well-documented, CAD pricing |
| Form UX | Multi-step wizard | PO audit: builds trust, reduces abandonment |
| Monetization | Affiliate links first | Low effort, immediate revenue, no paywall |
| Price data | Largest bag, CAD, PetValu.ca | Consistent comparison, single retailer, Canadian market |
| QA approach | PO audit + PM API tests + human testing | Layered: automated → expert review → real users |
| Rate limiting | slowapi | PO flagged as mandatory pre-deploy |
| Card design | 7-element surface + progressive disclosure | PO research: Baymard 5-7 elements, NNG 3-second rule |
| Expanded card | 3 color-coded zones (nutrition/ingredients/calculator) | PO research: visual hierarchy, remove redundancy, zone identity |
| Filter UX | Popover filter buttons (Airbnb/ASOS pattern) | PO research: scales to 15+ options, ~48px vs ~250px, industry standard |
| Engagement feature | Feeding calculator | PO analysis: highest impact/effort ratio, 100% data ready |
| Scoring algorithm | 6-factor vet-validated (removed grain-free, added life stage) | PO vet science audit: AAFCO, NRC, WSAVA, Tufts references |
| Comparison upgrades | Post-launch | Current version works, upgrades are polish not blocking |
| Retailer | PetValu.ca (exclusive) | All 114 products available, live pricing via schema.org scraping |
| Product detail UX | DoorDash-style overlay | PO research: overlay better than in-place card expansion for mobile + engagement |
| Design system | Monochromatic blue zones | Premium feel, reduced visual noise vs multi-color zones |
| Deployment backend | Railway (~$5-7/mo) | Easy Python deploy, env vars, auto-scaling |
| Deployment frontend | Vercel (free) | Instant deploy, automatic HTTPS + CDN |
| In-store kiosk | Large display tablets in 3 pet stores | MVP launch channel — wifi required, landscape layout |
| Brand expansion | Dry food first, one brand at a time | Raw/treats have different scoring needs; dry food reuses existing algorithm |
| Next brands | Performatrin Ultra → Royal Canin → Purina Pro Plan → Hill's → Go! | PetValu house brand first, then vet-recommended mainstream brands |
| Purchase tracking | DEFER to post-launch (launch + 4 weeks) | Strong retention play but not a launch requirement. Feeding calculator already does the hard math |
| Purchase tracking auth | Session tokens for MVP, user accounts for V2 | No accounts blocker for basic tracking. Email reminders need accounts |
| Monetization priority | Affiliate links NOW, freemium at 200+ users | Zero-friction passive revenue. Subscription not worth it at <100 users |
| Ingredient filtering | Not building | PO research: 95%+ or <5% of products have any given ingredient — no useful filter sweet spot |
| Dynamic product pool | 40 backend / 20 frontend cap | Filters reveal hidden products instead of only shrinking the list. QA validated 8/8 scenarios |
| PU kcal/kg estimation | Brand-specific ×8.90 ratio | 5 official values confirmed match; 29 estimated with ±75 kcal/kg max error (vs ±150 with cross-brand average) |
| Team structure | 9 Claude Code tabs with strict role boundaries | PM, PO, Security, Backend, Frontend, Data, Marketing, Vet Test, Customer Test — no cross-boundary work |
| Form tracking | Store metadata in pets collection (not separate analytics table) | Simple, no new collections, queryable in Atlas. GA4 deferred as complement |
| Ca:P null-check | Neutral 7/15 for missing data | Products with unpublished Ca:P shouldn't be penalized to 0 — neutral is fairer than guessing |
| Affiliate links | DEFERRED | Requires store partnership work; revisit when user base is larger |
| iOS native | SwiftUI (not React Native/Flutter) | Best UX, Apple ecosystem (widgets, push, Health), App Store credibility |
| Community platform | Build after dashboard + iOS | Need user accounts + purchase data first; social features layer on top |
| ML recommendations | After 500+ purchases (~Fall 2026) | Rule-based scoring is the cold-start; ML needs behavioral data to improve on it |
| Species expansion | Cat first, then raw, then wet, then treats | Cat dry food reuses most of the existing architecture; raw/wet need new scoring factors |
| GitHub repo | Make private after coding week (Mar 22) | Protect codebase before public launch |
| Docker | Pre-iOS | Cleaner deployment, easier scaling, consistent dev/prod environments |
| iOS timing | April (after web launch) | Build web features first as prototype; iOS ports proven UX with all API endpoints already built. Avoids building twice |
| Auth method | Magic link (passwordless email) | Fastest to build, no password management, iOS-compatible, sidesteps Apple Sign-In requirement |
| Email service | Resend (free tier 100/day) | Simple API, sandbox for testing, real domain verification for production |
| Guest mode | Keep fully functional, no login wall | PO research: login wall kills conversion. Prompt account creation after value is shown |
| Account prompt timing | Overlay close + scroll past 5th card | PO research: action-based triggers convert 2-3x better than time-based. Replaced 15s timer |
| Dashboard layout | Single-page: pet card → active food → history → spending | PO research: MyFitnessPal daily-view pattern, most important info above fold |
| Dashboard background | #f5f7fa cool gray | PO research: dashboards should feel calmer than tool pages |
| Purchase auto-complete | New purchase auto-switches previous active | PO: asking "did you finish the old bag?" adds friction for zero value |
| Cups/day defaults | Breed-size-based (small=0.75, medium=1.5, large=2.5) | PO audit: hardcoded 2.5 was wrong for small dogs |
| Purchase intent preservation | sessionStorage bridge | PO audit: anonymous "I Bought This" lost context on signup redirect |
| Account deletion | Full cascade delete (user + pets + purchases) | PIPEDA compliance requirement |
| Pet profile editing | Deferred to Week 1 | Scope cut for sprint |
| Multi-pet V1 | Schema supports it, UI shows single pet | Scope cut for one-week sprint. Multi-pet UI deferred to V2 |

---

## PHASE 18.5: Form Submission Tracking — DONE

**Objective:** Track who fills out the form, from what device, and when.

- [x] Backend captures metadata on pet creation: `created_at`, `updated_at`, `user_agent`, `ip_hash` (SHA-256 truncated, not raw IP), `referrer`, `screen_width`
- [x] Backend updates `updated_at` on pet profile edits
- [x] Frontend sends `screen_width` (window.innerWidth) with pet creation payload
- [x] Tracking fields excluded from API responses (internal analytics only)
- [x] Null-check on IP (first IP from `x-forwarded-for` header, stored as `ip_hash`)
- [x] Verified on production Atlas — all fields populated correctly

**Query tracking data in Atlas:**
```
db.pets.find({}, { name: 1, created_at: 1, user_agent: 1, ip_hash: 1, referrer: 1, screen_width: 1 }).sort({ created_at: -1 })
```

**Planned (not yet implemented):**
- [ ] Google Analytics 4 or Plausible for traffic/funnel dashboard
- [ ] Admin dashboard to view tracking data without Atlas access

---

## Recent Changes (2026-03-22)

### Brand Expansion + Final Polish (Mar 19-22)
- **Go! Solutions added:** 24 dry food products — full GA data, PetValu pricing, Contentful CDN images
- **Now Fresh added:** 12 dry food products — grain-free, Petcurean brand, full data
- **150 total products** across 6 brands live in production Atlas
- **Real brand logos:** go-solutions.png + now-fresh.png from official CDN (replaced SVG placeholders)
- **Product title fix:** `line` field used as display title instead of deriving from `_id` (fixed "Solutions" prefix bug on Go! products)
- **Final PO audit:** 12 fixes — Sign In on form, removed +Add Pet, renamed Start Over→New Pet, neutral login copy, spending gate, removed redundant CTA, mobile grid, account dropdown, member-since stats
- **Scoring verified:** Go! + Now Fresh products score 77.5-97.0 range, allergen filtering confirmed working

### Launch Prep (Mar 18)
- **Dashboard features:** Personalized greeting, food tenure counter, reorder links, match score badge, delete/edit/extend purchases
- **Legal pages:** Privacy Policy (`/privacy`) and Terms of Service (`/terms`) with links on login, account, and form pages
- **Infrastructure:** ErrorBoundary, Vercel Analytics, robots.txt, sitemap.xml, CSP updated
- **Code cleanup:** JSDoc on all 20+ files, dead CSS removed, prop defaults, App.css deleted, inline styles moved to CSS
- **Bug fixes:** Start Over auth redirect bypass (`/?new=true`), Account dropdown click-to-toggle, legal page centering
- **Documentation:** README.md fully rewritten with all Phase 19 features, routes, file structure, API endpoints

### Previous Changes (2026-03-17)

### Phase 19: User Accounts & Pet Dashboard (code complete, audited, UI overhauled)
- **Magic link auth:** Passwordless login via Resend email service. JWT tokens (30-day, HS256). Login page, verification page, protected routes.
- **Dashboard page:** Pet card, active food with depletion progress bar (color-coded), purchase history, spending summary, empty states.
- **Purchase tracking:** "I Bought This" button in product detail, 2-step log purchase modal, auto-depletion calculation, auto-complete previous purchase on new buy.
- **Save Results banner:** Inline card in food grid (3rd position). Triggers on overlay close or scroll past 5th card. 30-day lockout after 3 dismissals.
- **Account page:** Email display, logout, delete account with confirmation.
- **15 new/modified files:** 10 new (auth.js, ProtectedRoute, LoginPage, MagicLinkVerify, Dashboard, AccountPage, LogPurchaseModal, SaveResultsBanner, login.css, dashboard.css) + 5 modified (petApi.js, App.jsx, ProductDetail.jsx, Recommendations.jsx, recommendation.css)
- **7 new routes:** `/login`, `/auth/verify/:token`, `/dashboard`, `/dashboard/add-pet`, `/account` + modified `/` and `/recommendations`
- **Guest mode preserved:** Anonymous form + recommendations work exactly as before.
- **Known issues:** Magic link lands in spam (sandbox domain — need real domain before launch).
- **PO audit (Mar 17):** 18 issues found — 1 P0, 5 P1, 7 P2, 5 P3. All P0-P2 fixed. P3 deferred.
- **QA report (Mar 17):** 7 bugs found — 5 fixed, 2 deferred (cosmetic).
- **UI overhaul (Mar 17):** Dashboard CSS completely rewritten. Unified header, matching pet cards, brand strip, page transitions, zone patterns. Login page fixed (centered title, correct button color). Product detail footer buttons aligned.
- **Backend fixes (Mar 17):** `load_dotenv()` added, magic link verify idempotent, `access_token` response key, DELETE `/api/auth/me` endpoint, consumed_magic_token pattern.

---

### Previous Changes (2026-03-12)

### Brand Expansion (Phase 18)
- **Performatrin Ultra added:** 34 dry food products (PetValu house brand)
- **114 total products** across 4 brands (was 80 across 3)
- **Data quality:** RSC artifacts cleaned, truncated ingredients fixed, kcal/kg verified (brand-specific ×8.90 ratio)
- **Scoring validated** across multiple pet profiles — PU scores 75-85 range (correct for mid-tier brand)

### Dynamic Product Pool
- **Backend:** Sends up to 40 scored products (was 20)
- **Frontend:** Displays max 20 by default; filters/sort reveal hidden products from the full pool
- **Bug fix:** Product detail overlay now searches full pool (stays open when filters change)
- **QA:** 8/8 test scenarios passed

### Form Submission Tracking (Phase 18.5)
- **Metadata captured on pet creation:** `created_at`, `updated_at`, `user_agent`, `ip_hash` (SHA-256 truncated), `referrer`, `screen_width`
- **Frontend sends** `screen_width` with pet profile payload
- **Tracking fields internal only** — not exposed in API responses
- **Verified on production Atlas** — all fields populated correctly

### Scoring Safety Net
- **Ca:P data backfill:** 4 PU puppy + 2 PU senior products now have calcium/phosphorus/DHA data
- **Null-check:** Missing Ca:P (value=0) awards neutral 7/15 instead of 0/15 in puppy and adult branches

### Security Fixes
- **npm audit fix:** Resolved 7 vulnerabilities (axios, react-router, rollup, minimatch, ajv, js-yaml)
- **CSP tightened:** Removed `http://localhost:*` from `connect-src` in production
- **OpenAPI disabled:** `/openapi.json` returns 404 in production (was accessible even with docs disabled)

### Deployment (Phase 16)
- **App is live:** Frontend on Vercel, backend on Railway, database on MongoDB Atlas
- **Live URL:** https://pet-ai-assistant-seven.vercel.app
- **CORS configured:** `ALLOWED_ORIGINS` set to Vercel domain
- **114 products** imported (80 at initial deploy + 34 Performatrin Ultra)

### Product Detail Overlay (Phase 15)
- **Replaced in-place card expansion** with DoorDash-style product detail overlay
- **New components:** ProductDetail.jsx (~461 lines), ScoreRing.jsx, detail-overlay.css
- **Premium design:** Monochromatic blue zones, IntersectionObserver bar animations, semantic tag colors
- **Navigation:** Prev/next arrows + keyboard arrow key support, URL state via `?product={id}`
- **Brand logo strip** (48px) below profile card on recommendations page
- **Allergy filter count banner** showing filtered-out products
- **Results increased** from 15 to 20 recommendations
- **FoodCard simplified** from ~501 lines to ~200 lines (click opens overlay instead of expanding)

### Security Hardening (Phase 15)
- **Session UUID auth:** public_id + session_token per pet, X-Session-Token header
- **Defense-in-depth allergen filtering:** allergen_tags check + ingredient text scan
- **Security headers, rate limiting, CSP, source maps disabled, docs disabled in prod**

### Data & Pipeline
- **PetValu migration:** All 80 products have PetValu.ca shop links, live pricing, `retailer: PetValu.ca`
- **Allergen tag safety fixes:** `eggs` → `egg`, `fish` added for herring oil, normalized delimiters/casing
- **Pipeline fixes:** env vars for import_products.py and scraper_pipeline.py, strip_html() in normalizer
- **Image fixes:** All 45 Open Farm images replaced with working Shopify CDN URLs

---

## Competitive Moat

What no one else in the market combines:
1. **Brand-agnostic** — brand tools only recommend their own products
2. **Transparent algorithm** — no other tool publishes its scoring methodology
3. **Personalized scoring** — review sites don't personalize to YOUR dog
4. **Side-by-side comparison** — unique cross-brand comparison tool
5. **Feeding calculator** — personalized daily feeding + cost estimates
6. **Free, no paywall** — competitors charge subscriptions for core features
7. **Purchase tracking + reorder** LIVE — Calculates actual days remaining from cups/day × bag size × calorie data. Chewy knows subscription frequency but not actual consumption rate
8. **Passwordless auth** — Magic link login, no password to manage. Lower friction than any competitor's signup
8. **Community data** (planned) — real outcomes from real dogs, not just nutritional labels
9. **ML personalization** (planned) — recommendations that improve with every purchase and rating
10. **Multi-species** (planned) — dog + cat + all food types in one platform
11. **iOS native** (planned) — push notifications, widgets, barcode scanning — not just a web wrapper
12. **Proprietary dataset** (growing) — pet profiles + purchases + ratings = data moat that compounds over time

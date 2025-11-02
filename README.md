# 🐾 Pet AI Assistant

**Pet AI Assistant** is a modern, front-end web app that helps dog owners build rich pet profiles and discover tailored food recommendations. The experience now includes a data-rich comparison workspace, interactive nutrition call-outs, and a focused iconography system that keeps the UI clear and approachable.

---

## ✨ Features

- 🐶 Guided pet profile form with age group, breed size, activity level, goal selection, and dynamic allergy pills
- 💾 Automatic state sync via `localStorage`, so profile data flows seamlessly into recommendations
- 📊 Food recommendation dashboard fed from a curated Google Sheet (via PapaParse) with responsive cards, ingredient call-outs, and nutrition badges
- ⚖️ Floating compare button that opens a full-width comparison modal with highlights, feeding information, and ingredient breakdowns
- 🎨 Refined visual system using accessible blues, contextual icons, and chip-based emphasis instead of alerts
- 🧩 Front-end architecture (HTML/CSS/JS) scoped and documented for eventual Spring Boot + MongoDB integration

---

## 🗂️ File Structure

```
Pet-AI-Assistant/
├── index.html                ← Profile form page
├── recommendation.html       ← Food recommendation page
├── css/
│   ├── form.css
│   └── recommendation.css
├── js/
│   ├── form.js               ← Handles profile form logic + POST hook
│   └── recommendation.js     ← Fetches data, renders cards, powers compare modal
├── images/
│   └── raw.PNG
├── dev-log.md                ← Daily progress journal
```

---

## 🚀 Quick Start

1. Clone or download the repository.
2. Open `index.html` in your browser to create a pet profile.
3. Submit the form to jump to `recommendation.html`, which automatically renders recommendations from the hosted Google Sheet.
4. Tap the floating compare icon to launch the side-by-side comparison dialog and explore nutrition differences.

> 🤖 **Note**  
> The compare experience, ingredient sections, and nutrition call-outs are entirely client-side—no build step required.

---

## 🧠 Roadmap

- Connect the form POST to the Spring Boot + MongoDB backend (`backend/demo`)
- Add filtering and sorting controls for activity level, caloric needs, and ingredients
- Allow exporting or sharing comparison results
- Introduce authentication and persistent profiles
- Deploy to Vercel / GitHub Pages with staged data fetches

---

## 🚧 Future Plans

- Connect to real food data (via API or local DB)
- Filter food based on ingredient rules
- Add weight and vet notes to the pet profile
- Create backend with persistent storage
- Deploy on Vercel or GitHub Pages

---

## 📜 License

This project is not open source. All rights reserved © 2025 Mahyar JBR. Please do not copy, reuse, or distribute this code without permission.

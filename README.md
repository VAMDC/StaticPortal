# VAMDC Static Portal

**Live demo: https://vamdc.github.io/StaticPortal/**

A client-only web application for querying atomic and molecular data across the federated VAMDC infrastructure. Runs entirely in the browser with no backend required.

## What is VAMDC?

[VAMDC](https://vamdc.org) (Virtual Atomic and Molecular Data Centre) provides unified access to ~40 distributed databases of atomic and molecular data. Each database exposes a TAP endpoint accepting VSS2 (VAMDC SQL Subset 2) queries and returning XSAMS-formatted XML.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (Client-Only)                  │
├─────────────────────────────────────────────────────────┤
│  Vue 3 SPA                                              │
│  ├── Query Forms (atoms, molecules, radiative, etc.)   │
│  ├── VSS2 Query Generator                               │
│  ├── Node Preview (parallel HEAD requests)              │
│  └── Consumer Integration (XSAMS processors)            │
├─────────────────────────────────────────────────────────┤
│  State: Pinia store + URL hash encoding                 │
│  Data:  Static JSON (nodes, consumers, elements)        │
└─────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
    VAMDC Nodes                    XSAMS Consumers
    (TAP endpoints)                (processors)
```

All VAMDC nodes support CORS, enabling direct browser-to-node communication without a proxy server.

## Design Choices

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Architecture | Client-only SPA | All VAMDC data is public; nodes support CORS; no server needed |
| Framework | Vue 3 + Composition API | Lightweight, modern reactivity, good TypeScript support |
| State | Pinia + URL hash | Shareable links without backend persistence |
| Build | Vite | Fast HMR, native ES modules, simple config |
| Styling | Plain CSS + CSS variables | No build complexity, easy theming |
| Testing | Vitest | Fast, Vite-native, Jest-compatible API |
| Registry | Static JSON + sync script | VAMDC registry uses SOAP/XML, not browser-friendly |
| Offline | PWA with service worker | Works without network after first load |

### Why Not the Original Portal?

The [existing VAMDC portal](https://portal.vamdc.eu) is a Java EE application (JBoss Seam 2.2, JSF 1.x, RichFaces) requiring a full application server. This static version:

- Deploys anywhere (GitHub Pages, S3, local file)
- Zero maintenance (no server, no database)
- Faster (no server round-trips for form interactions)
- Offline capable (PWA)

## Tech Stack

- **Vue 3** - Composition API, `<script setup>` syntax
- **Pinia** - State management
- **Vite** - Build tooling
- **Vitest** - Unit testing
- **vite-plugin-pwa** - Service worker generation

Production build: ~40KB gzipped

## Project Structure

```
src/
├── components/
│   ├── QueryBuilder.vue      # Main layout
│   ├── forms/                # Query type forms
│   │   ├── AtomsForm.vue
│   │   ├── MoleculesForm.vue
│   │   ├── RadiativeForm.vue
│   │   └── CollisionsForm.vue
│   ├── PreviewResults.vue    # Node availability display
│   ├── ConsumerSelect.vue    # XSAMS processor selection
│   └── NodeList.vue
├── composables/
│   ├── useVSS2.js           # Query generation & URL encoding
│   ├── useUnits.js          # Wavelength/frequency/energy conversion
│   └── useNodes.js          # Node HEAD requests
├── stores/
│   └── query.js             # Pinia store
├── data/
│   ├── nodes.json           # VAMDC node registry (auto-updated)
│   ├── consumers.json       # XSAMS processors (auto-updated)
│   └── elements.json        # Periodic table for autocomplete
└── styles/
    └── main.css
```

## Registry Sync

Node and consumer lists are fetched from the VAMDC registry via a sync script:

```bash
npm run update-registry
```

This runs automatically weekly via GitHub Actions, or manually. The script:
1. Queries the VAMDC SOAP registry for active nodes/consumers
2. Fetches `/capabilities` from each consumer to get service URLs
3. Prefers HTTPS where available
4. Writes `nodes.json` and `consumers.json`

## Development

```bash
npm install
npm run dev          # Dev server at localhost:5173
npm test             # Run tests
npm run build        # Production build to dist/
```

## Deployment

The `dist/` folder contains static files deployable anywhere:

- **GitHub Pages** - Push to `gh-pages` branch or configure Actions
- **Any static host** - Netlify, Vercel, S3, Apache, nginx
- **Local** - Open `dist/index.html` (requires a local server for full functionality)

## URL State

Query state is encoded in the URL hash, making queries shareable:

```
https://portal.example.com/#atoms/Fe/1-3
```

Decodes to: Iron (Fe) with ion charge between 1 and 3.

Browser back/forward navigation works as expected.

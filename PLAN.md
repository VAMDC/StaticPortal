# VAMDC Static Portal - Implementation Plan

A client-only Vue 3 application that runs entirely in the browser, helping researchers build queries for atomic/molecular data across federated VAMDC databases.

## Background

### What is VAMDC?

VAMDC (Virtual Atomic and Molecular Data Centre) is a federated infrastructure providing researchers access to atomic and molecular data across ~20+ distributed databases (nodes). Each node exposes a TAP (Table Access Protocol) endpoint that accepts VSS2 queries and returns XSAMS (XML) data.

### The Original Java Portal

The existing portal at https://portal.vamdc.eu is a Java EE application built with:
- JBoss Seam 2.2.2 + JSF 1.x + RichFaces
- Hibernate/JPA with MySQL backend
- Deployed on JBoss Application Server

Key features:
- **Query Builder**: Form-based interface for atoms, molecules, radiative transitions, collisions
- **Node Preview**: HEAD requests to check which nodes have matching data
- **Unit Conversion**: Wavelength ↔ frequency ↔ wavenumber ↔ energy
- **Query History**: Saved queries (requires user accounts)
- **Consumer Integration**: Pass results to external XSAMS processor services

### Why Migrate?

- **12+ year old stack** - Seam 2.x, JSF 1.x are obsolete
- **Heavy deployment** - Requires JBoss application server
- **All data is public** - No need for server-side persistence
- **CORS-enabled nodes** - Direct browser access is possible

## Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Framework | Vue 3 + Composition API | Modern, lightweight, good DX |
| Build | Vite | Fast, modern bundler |
| State | Pinia | Vue's official state manager |
| Styling | Plain CSS | Simple, no build complexity |
| Testing | Vitest + Vue Test Utils | Fast, Vite-native |
| Registry | Static JSON | SOAP registry not browser-friendly |
| Persistence | URL hash encoding | Shareable, no server needed |
| User accounts | None | Not needed for public data |

## VAMDC Protocol Overview

### VSS2 Query Language

SQL-like syntax for querying atomic/molecular data:

```sql
-- Atoms by symbol and ion charge
SELECT * WHERE AtomSymbol = 'Fe' AND AtomIonCharge >= 1 AND AtomIonCharge <= 3

-- Molecules by formula
SELECT * WHERE MoleculeStoichiometricFormula = 'H2O'

-- Radiative transitions by wavelength (in Angstroms)
SELECT * WHERE RadTransWavelength >= 4000 AND RadTransWavelength <= 7000
```

### Key Restrictables (Query Fields)

**Atoms:**
- `AtomSymbol` - Element symbol (e.g., "Fe", "H")
- `AtomNuclearCharge` - Atomic number (Z)
- `AtomMassNumber` - Mass number (A)
- `AtomIonCharge` - Ion charge (0 = neutral, 1 = +1, etc.)
- `AtomStateEnergy` - State energy in eV

**Molecules:**
- `MoleculeStoichiometricFormula` - e.g., "H2O", "CO2"
- `MoleculeChemicalName` - e.g., "water", "methane"
- `InChIKey` - Standard chemical identifier

**Radiative Transitions:**
- `RadTransWavelength` - Wavelength in Angstroms
- `RadTransFrequency` - Frequency in MHz
- `RadTransWavenumber` - Wavenumber in 1/cm
- `RadTransEnergy` - Energy in eV
- `RadTransProbabilityA` - Einstein A coefficient

### Node TAP Endpoints

Query URL format:
```
{nodeUrl}/sync?LANG=VSS2&FORMAT=XSAMS&QUERY={encodedQuery}
```

HEAD request returns availability + counts in headers:
- `VAMDC-COUNT-ATOMS`
- `VAMDC-COUNT-MOLECULES`
- `VAMDC-COUNT-STATES`
- `VAMDC-TRUNCATED` (percentage if results limited)

### Consumer Services

XSAMS processor services accept POST with `url=<xsams-download-url>` and redirect to results page.

Protocol:
1. POST `url=<data-url>` to consumer's `/service` endpoint
2. Consumer returns 302 redirect to cached result URL
3. Result page shows processed data (HTML, SVG, etc.)

## Known VAMDC Nodes

From vamdclib's local_registry.py (20 nodes):

| Node | ID | URL |
|------|----|-----|
| MeCaSDa | ivo://vamdc/dijon-methane-lines | http://vamdc.icb.cnrs.fr/mecasda-12.07/tap/ |
| CDMS | ivo://vamdc/cdms/vamdc-tap-dev | http://cdms.ph1.uni-koeln.de/cdms/tap/ |
| UMIST | ivo://vamdc/UDFA | http://star.pst.qub.ac.uk/sne/umist3/tap/ |
| VALD | ivo://vamdc/vald/uu/django | http://vald.astro.uu.se/atoms-12.07/tap/ |
| Chianti | ivo://vamdc/chianti/django | http://ag02.ast.cam.ac.uk/chianti-dev/tap/ |
| GhoSST | ivo://vamdc/ghosst | http://ghosst.osug.fr/vamdc/tap/ |
| ECaSDa | ivo://vamdc/reims-ethylene | http://vamdc.univ-reims.fr/ecasda-12.07/tap/ |
| S&MPO | ivo://vamdc/smpo-sample | http://vamdc.univ-reims.fr/smpo12/tap/ |
| HITRAN-UCL | ivo://vamdc/hitran | http://vamdc.mssl.ucl.ac.uk/node/hitran/tap/ |
| BASECOL | ivo://vamdc/basecol/vamdc-tap-dev | http://dev.vamdc.org/basecol/tapservice_12_07/TAP/ |
| KIDA | ivo://vamdc/KIDA/vamdc-tap-12.07 | http://dev.vamdc.org/kida/tapservice_12_07/TAP/ |
| JPL | ivo://vamdc/jpl/vamdc-tap-dev | http://cdms.ph1.uni-koeln.de/jpl/tap/ |
| TOPbase | ivo://vamdc/TOPbase/tap-xsams-12.07 | http://topbase.obspm.fr/12.07/vamdc/tap/ |
| TIPbase | ivo://vamdc/TIPbase/tap-xsams-12.07 | http://tipbase.obspm.fr/12.07/vamdc/tap/ |
| Stark-b | ivo://vamdc/stark-b/tap-xsams-12.07 | http://stark-b.obspm.fr/12.07/vamdc/tap/ |
| LASP | ivo://vamdc/OACatania/LASP1207 | http://dblasp.oact.inaf.it/node1207/OACT/tap/ |
| CDSD-296K | ivo://vamdc/cdsd-296-xsams1 | http://lts.iao.ru/node/cdsd-296-xsams1/tap/ |
| CDSD-1000K | ivo://vamdc/cdsd-1000-xsams1 | http://lts.iao.ru/node/cdsd-1000-xsams1/tap/ |
| CDSD-4000K | ivo://vamdc/cdsd-4000-xsams1 | http://lts.iao.ru/node/cdsd-4000-xsams1/tap/ |
| RADAM | ivo://vamdc/RADAM | http://193.55.130.154/tap/ |

## Known Consumer Services

From VAMDC/Processors repository:

| Processor | Output | Description |
|-----------|--------|-------------|
| xsams2sme | text/plain | Convert to SME format |
| linespec | image/svg+xml | Line spectrum visualization |
| atomicxsams2html | text/html | Atomic data as HTML table |
| molecularxsams2html | text/html | Molecular data as HTML table |
| collisions2html | text/html | Collision data as HTML table |
| specsynth | application/json | Spectra in JSON format |

Base URL: `https://xsams-processors.obspm.fr/`

## Unit Conversion

Physical constants (CODATA 2018):
- Speed of light: c = 299,792,458 m/s
- Planck constant: h = 6.62607015 × 10⁻³⁴ J·s
- Elementary charge: e = 1.602176634 × 10⁻¹⁹ C
- Rydberg energy: 13.605693 eV

Conversions (λ in meters, ν in Hz, k in 1/m, E in Joules):
- Wavelength ↔ Frequency: ν = c / λ
- Wavelength ↔ Wavenumber: k = 1 / λ
- Wavelength ↔ Energy: E = hc / λ
- Energy ↔ eV: E_eV = E / e

Common units:
- Wavelength: Å (10⁻¹⁰ m), nm (10⁻⁹ m), µm (10⁻⁶ m)
- Frequency: Hz, kHz, MHz, GHz, THz
- Wavenumber: 1/cm (100 1/m), kayser
- Energy: eV, Rydberg (13.6 eV), cm⁻¹ (as energy unit)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Vue 3 SPA (Static Files)                    │
├─────────────────────────────────────────────────────────────────┤
│  Views                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ QueryBuilder │  │ NodeExplorer │  │ ResultsView  │          │
│  │  - Forms     │  │  - Node list │  │  - Preview   │          │
│  │  - Preview   │  │  - Status    │  │  - Download  │          │
│  │  - Execute   │  │  - Caps      │  │  - Consumer  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  Composables                                                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │ useVSS2      │ │ useUnits     │ │ useNodes      │         │
│  │ - generate   │ │ - convert    │ │ - fetch caps  │         │
│  │ - parse URL  │ │ - format     │ │ - check avail │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│  State (Pinia)          │  Static Data                          │
│  - queryForms           │  - nodes.json (20 known nodes)       │
│  - activeNodes          │  - restrictables.json (dictionary)   │
│  - previewResults       │  - consumers.json (processor list)   │
└─────────────────────────────────────────────────────────────────┘
          │                        │                    │
          ▼                        ▼                    ▼
    ┌───────────┐          ┌───────────────┐     ┌────────────┐
    │ VAMDC     │  HEAD    │ Node TAP      │     │ Consumer   │
    │ Nodes     │←─────────│ /sync?QUERY=  │     │ Services   │
    │ /tap/caps │  GET     │ ...           │     │ /service   │
    └───────────┘          └───────────────┘     └────────────┘
```

## File Structure

```
StaticPortal/
├── index.html
├── vite.config.js
├── vitest.config.js
├── package.json
├── PLAN.md                    # This file
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── styles/
│   │   └── main.css
│   ├── stores/
│   │   └── query.js           # Pinia store
│   ├── composables/
│   │   ├── useVSS2.js         # Query generation
│   │   ├── useNodes.js        # Node interaction
│   │   └── useUnits.js        # Unit conversion
│   ├── components/
│   │   ├── QueryBuilder.vue   # Main query interface
│   │   ├── forms/
│   │   │   ├── AtomsForm.vue
│   │   │   ├── MoleculesForm.vue
│   │   │   └── RadiativeForm.vue
│   │   ├── NodeList.vue
│   │   ├── PreviewResults.vue
│   │   └── ConsumerSelect.vue
│   └── data/
│       ├── nodes.json         # Static node registry
│       ├── elements.json      # Periodic table
│       └── consumers.json     # Processor services
└── tests/
    ├── composables/
    │   ├── useVSS2.test.js
    │   └── useUnits.test.js
    └── components/
        └── AtomsForm.test.js
```

## Implementation Phases

### Phase 1: MVP (Atoms Form)
1. Initialize Vue 3 + Vite project
2. Create static data files
3. Implement `useVSS2` composable with tests
4. Build `AtomsForm` component
5. Add node preview (HEAD requests)
6. Basic styling

### Phase 2: URL State
1. Encode form state to URL hash
2. Decode URL hash on load
3. Browser back/forward support

### Phase 3: Additional Forms
1. `MoleculesForm` component
2. `RadiativeForm` with unit conversion
3. `useUnits` composable with tests

### Phase 4: Consumer Integration
1. `ConsumerSelect` component
2. Form-based POST submission
3. Open results in new tab

## URL State Format

Query state encoded in URL hash for sharing:

```
#atoms.symbol=Fe&atoms.ionCharge.min=1&atoms.ionCharge.max=3
```

Or compressed with base64 for complex queries:

```
#q=eyJhdG9tcyI6eyJzeW1ib2wiOiJGZSJ9fQ==
```

## Testing Strategy

### Unit Tests (Vitest)
- VSS2 query generation
- Unit conversion accuracy
- URL encoding/decoding round-trips

### Component Tests (Vue Test Utils)
- Form input handling
- Event emission
- Computed property reactivity

### Manual Integration Tests
1. Build query → Preview → Download XSAMS
2. Share URL → Load in new tab → Same query
3. Select consumer → POST → View results

## Deployment

Static files can be served from:
- GitHub Pages
- Any static file host (Netlify, Vercel, S3)
- Local file system (`file://` protocol)

Build:
```bash
npm run build   # Produces dist/ folder
```

## Future Enhancements

- [ ] Fetch node list from registry (if JSON endpoint added)
- [ ] Species autocomplete from node capabilities
- [ ] Collisions and Particles forms
- [ ] Environment form
- [ ] Export query as Python/pyVAMDC script
- [ ] Dark mode
- [ ] PWA for offline use

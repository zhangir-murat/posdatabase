# NYC POS Atlas

Standalone research application for OrangeTower Analytics LLC. The OrangeTower Analytics website and the existing Optical Lab are untouched.

## Stack and operation

React 19, TypeScript, Vite, Tailwind CSS, MapLibre GL JS, Recharts, Supabase PostgreSQL/PostGIS. OpenLayers provides an interactive canvas/vector fallback when WebGL initialization is unavailable. Source dependencies and pnpm lockfile are pinned. No paid API, domain, or subscription is required.

```sh
pnpm install
cp .env.example .env.local
# Supply your project URL and publishable key in .env.local.
pnpm dev
pnpm test
pnpm build
```

Use a Supabase **publishable** key. Never use a secret/service-role key in VITE_ variables. Local environment files are gitignored. Browser publishable keys are intentionally visible at runtime; RLS is the security boundary. Static deployments use `dist/`. The standalone deployment is https://nyc-pos-atlas.janj.chatgpt.site (private). The GitHub source repository is https://github.com/zhangir-murat/posdatabase. Sites maintains its separate deployment source repository; copying changes to GitHub does not configure automatic GitHub-to-Sites deployment.

## Dataset provenance

The initial 24 records in `src/data/demo.ts` are **entirely synthetic illustrative examples**. Business names, locations, dates, hardware and providers are not firsthand findings. They are bundled with the frontend, not inserted in the research database. No real merchant data was supplied with the brief. The research database starts empty. Exported illustrative rows have `is_demo=true` and filenames marked illustrative.

Select **My research**, create a researcher account, confirm the Supabase verification email, then return to the app and sign in. The verification link may redirect to Supabase's default localhost site URL after verification; return manually to the deployed Atlas. Set Authentication → URL Configuration → Site URL to the standalone Atlas deployment origin if maintaining the Supabase project yourself. The app uses email/password and does not depend on an OAuth redirect. Each signed-in researcher owns an isolated dataset. There is no shared organization dataset or team membership model in Phase 1.

## Phase 1 workflows

- Merchant atlas: pan, zoom, fit filtered coordinates, provider-colored points and MapLibre clustering; OpenLayers uses canvas points without clustering. Select a point or a listed merchant to inspect it.
- Shared filters: text, borough, category, POS software, neighborhood, confidence, inclusive date bounds. The same filtered records drive all views.
- Merchant database: sortable columns, pagination, record details and CSV export.
- Research analytics: provider counts/shares, verification coverage, categories, and neighborhood composition. Unknown POS is included in the denominator. All records, including unmapped ones, enter chart counts.
- Add merchant: authenticated, validated merchant + initial observation are saved atomically. Duplicate owner/name/address/ZIP combinations are rejected. Coordinates can be absent but must be paired when supplied.
- Update & add observation: updates merchant location/category metadata and appends a new POS observation. Previous observations are immutable through the client. The latest observation date wins, then creation timestamp and UUID. Historical merchant address changes are not versioned in Phase 1.

Each physical location is counted once, regardless of number of observations. There is currently one software provider per observation; multi-provider installations should use Other and explain details in notes until a future junction model is introduced.

## Database design and security

`supabase/migrations/` contains the applied migration.

- `merchants`: UUID, account owner, location/address, borough/neighborhood, category, nullable coordinate pair, generated geometry(Point,4326), GiST spatial index.
- `pos_providers`: controlled provider lookup.
- `pos_observations`: merchant + owner composite FK, software/hardware separately, verification status, date, method and notes. Latest-observation index.
- `merchant_current`: security-invoker view selecting the latest dated observation for each visible merchant.
- `save_merchant_observation(jsonb)`: security-invoker atomic RPC. Ownership is derived from auth.uid(), never payload ownership fields. Constraints are enforced in Postgres as well as the UI.
- `merchants_in_bbox(...)`: security-invoker viewport query over indexed WGS 84 geometry.

All eight public tables have RLS enabled. Anonymous users can read only the controlled provider lookup. Researcher tables enforce auth.uid() ownership. Privileges are explicit, and the current-state view respects underlying RLS. No public write policies, service keys, or security-definer functions are used. Schema deployment was followed by a clean Supabase security advisor result.

The current frontend pages records from the current-state view in batches of 1,000, then applies shared filters client-side. This supports the intended thousands of records. Viewport RPC and spatial indexes are provided for a later server-filtering migration if the dataset grows well beyond that. Concurrent user requests are isolated by RLS. No realtime subscription is included; use Refresh after updates from another device.

Location validation is a **NYC bounding envelope**, not a point-in-NYC/borough polygon check; an offshore or non-NYC point can still lie in the envelope. Address geocoding and exact borough-boundary validation are not implemented. Enter coordinates from verified field notes/maps. Validation also checks ZIP format, required merchant identity, observation dates and verified/unknown contradictions.

## Phase 2 infrastructure only

Tables are deployed, indexed, and protected but their client INSERT permissions are revoked until complete workflows and parent-ownership policies are implemented:

- `analysis_grids`, `grid_cells`: projected polygon cells, EPSG:26918 (UTM zone 18N meters), configurable 50–5,000 m cells. No grid generation or concentration calculation yet. Future metrics must distinguish surveyed merchant counts from actual merchant population density, and define coverage denominators and minimum sample sizes.
- `import_batches`, `import_rows`: staged payloads, row identity and validation errors. No CSV import UI/ingestion jobs.
- `observation_photos`: observation-linked object metadata. No bucket, photo upload or storage policy yet.
- A reusable validated form/data layer prepares for mobile collection, but no offline queue, camera capture or dedicated field collection workflow is implemented.
- Observation rows preserve history; a minimal read-only history is visible. Corrections/version management are future work.

## Tiles and attribution

The tile provider is **OpenFreeMap**, using the Positron style at https://tiles.openfreemap.org/styles/positron and its OpenMapTiles vector source. MapLibre renders it with WebGL. OpenLayers plus ol-mapbox-style render the same source with Canvas 2D when WebGL is unavailable; the fallback uses local Arial labels and avoids a font CDN.

The provider’s public instance requires no key or registration and advertises **no map-view or request quota**: https://openfreemap.org/. This is a community-funded, best-effort service, not a paid SLA. Attribution must retain **OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap**, with the source links. Source attribution is retained automatically by both renderers. OpenStreetMap data is ODbL-licensed; OpenMapTiles attribution/license requirements also apply. No offline pack, bulk-download or prefetch workflow is implemented. The quick-start guide describes separate limits for offline mobile downloads (not used by this app). See https://openfreemap.org/quick_start/ and the source project licenses.

Configure `VITE_MAP_STYLE_URL` and review style/source attribution when changing providers. Tiles are requested directly by visitors, exposing their IP and viewed map area to the provider. The first attempted OSM standard raster service returned blocked tiles in the QA environment and was replaced; it is not used by this application.

## Validation

`pnpm test` covers combined filters, inclusive date boundaries, unknown denominators, coordinate/confidence validation, unmapped records and safe CSV quoting/formula neutralization. `pnpm build` type-checks and creates the static app. Backend verification is in `supabase/tests/verification.sql`: rollback-only writes test atomicity, date ordering, history retention, duplicate constraints, coordinate constraints, cross-account RLS and viewport lookup. No test merchants or accounts remain after it runs.

Browser QA covers map rendering through the canvas fallback (the QA browser has WebGL disabled), filters, record drill-down, chart rendering and sign-in gating. MapLibre's WebGL path is compiled but cannot be visually exercised in that browser. Real account registration/email delivery requires a real user email; no fake permanent account is created for testing.

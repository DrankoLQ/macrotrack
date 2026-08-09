# MacroTrack

Seguimiento de macronutrientes (kcal, proteínas, hidratos, grasas, fibra) 100% local, sin servidor. PWA instalable en el iPhone.

## Stack

- **SvelteKit 5** (modo runes, SPA puro con `ssr = false` + adapter-static)
- **Dexie.js** sobre IndexedDB — la base de datos local que crece con cada escaneo
- **@zxing/library** — escáner de códigos de barras (EAN-13, EAN-8, UPC, CODE-128)
- **OpenFoodFacts API** — solo para resolver códigos nuevos; los resultados se cachean en la BD local
- Service worker nativo de SvelteKit para funcionar offline

## Comandos

```bash
npm run dev      # desarrollo
npm run check    # typecheck (svelte-check)
npm run build    # build → carpeta build/ (estática, hostear gratis)
npm run preview  # probar el build localmente
```

## Estructura

```
src/lib/db.ts                 # esquema Dexie: foods + entries
src/lib/seed.ts               # catálogo embebido (23 alimentos comunes; se añaden sin duplicar)
src/lib/openfoodfacts.ts      # cliente de la API pública (producto por código + búsqueda por nombre)
src/lib/stores.svelte.ts      # estado con runes: diario + objetivos
src/lib/components/           # MacroBar, FoodPicker
src/routes/+page.svelte       # diario: totales vs objetivos, añadir comida
src/routes/foods/+page.svelte # base de datos de alimentos (CRUD + búsqueda por nombre en OpenFoodFacts)
src/routes/scan/+page.svelte  # escáner + OpenFoodFacts + fallback manual
src/service-worker.ts         # precache del app shell + network-first
scripts/gen-icons.mjs         # regenera los iconos PNG
```

## Conceptos clave si vienes de React

- **Runes** (`stores.svelte.ts`): `$state(x)` ≈ `useState` pero con asignación directa
  (`x = 5` re-renderiza). `$derived(...)` ≈ `useMemo` automático. Sin hooks de efectos
  ni arrays de dependencias. En Svelte, `<input bind:value={x}>` es el dos-direcciones.
- **`{@render children()}`** en `+layout.svelte` ≈ `{children}` de React.
- **Props**: `let { prop } = $props()` en vez de `props: Props`.

## Flujo de escaneo

1. Escaneas un código → se busca primero en tu BD local (IndexedDB).
2. Si no existe → consulta a OpenFoodFacts (gratis, sin API key, ~15 req/min).
3. Si existe → se guarda en tu BD y puedes añadirlo al diario.
4. Si no existe en ningún sitio → formulario manual prefilled con el código.

Cada producto se consulta a la red **una sola vez**; después vive en tu dispositivo.

## Despliegue en Netlify (gratis)

El repo ya trae `netlify.toml` (build: `npm run build`, publish: `build/`, Node 22)
y `static/_redirects` (fallback SPA a `200.html`, también válido para Cloudflare Pages).

1. `git init && git add . && git commit -m "inicial"` y sube el repo a GitHub.
2. En [netlify.com](https://www.netlify.com) → **Add new site** → **Import an existing project** → conecta GitHub y elige el repo.
3. Netlify detecta la config automáticamente → **Deploy**. Tienes la app en `https://<nombre>.netlify.app` con HTTPS gratis.
4. Cada `git push` re-despliega solo.

Alternativa sin Git: arrastrar la carpeta `build/` en **Netlify Drop** (deploy inmediato, sin CI/CD).

## Instalación en iPhone

1. Despliega `build/` en cualquier hosting estático HTTPS (Cloudflare Pages, Netlify…).
2. Abre la URL en Safari → Compartir → **Añadir a pantalla de inicio**.
3. Recomendado: concede el permiso de cámara en Safari **antes** de instalar la PWA.

### Caveats de la cámara en iOS (conocidos)

- WebKit ha tenido regresiones históricas con `getUserMedia` en modo standalone
  (buggy en 17.4.1 y 18.1; estable en 18.7+). El código hace un "pre-warm" de la
  cámara como workaround documentado.
- No hay control de flash/linterna en Safari (ImageCapture no soportado).
- Si la cámara falla: usa el **código manual** (input debajo del vídeo).
- Si un escaneo falla o el producto no está, siempre hay entrada manual.

## Roadmap sugerido

- Export/import de datos (JSON/CSV) — importante: todo vive en el dispositivo
- Fotos de comidas, favoritos, comidas repetidas (recetas)
- Métricas semanales (promedios por macro)
- Si algún día quieres publicarla en el App Store: migrar a SwiftUI + SwiftData
  manteniendo el mismo esquema (los datos se exportan desde IndexedDB)

# MacroTrack 🥗

Seguimiento de calorías y macronutrientes **100% privado y sin servidor**: una PWA que se instala en el iPhone (o se abre en cualquier navegador) y guarda todos tus datos en tu propio dispositivo.

Sin cuentas, sin anuncios, sin sincronizar nada a la nube. Tus registros no salen de tu móvil.

<p align="center">
  <img src="https://github.com/user-attachments/assets/b0c803e2-739a-4146-9750-ecb4d796a123" alt="MacroTrack" width="480">
</p>

## Funciones

- **Diario por días** — registra alimentos por comidas (desayuno, comida, snack, cena) y ve al instante tus totales de kcal, proteínas, hidratos, grasas y fibra frente a tus objetivos.
- **Escáner de código de barras** — apunta con la cámara al producto y resuélvelo automáticamente contra OpenFoodFacts (base de datos pública y gratuita). Cada producto se consulta una sola vez; después vive en tu dispositivo y funciona **offline**.
- **Base de datos de alimentos** — catálogo inicial de 23 alimentos comunes; añade los tuyos a mano o buscando por nombre en OpenFoodFacts.
- **Objetivos calculados para ti** — tu perfil (altura, peso, edad, sexo, actividad, objetivo) calcula tus dianas con la fórmula de Harris-Benedict: perder grasa, recomposición, mantener o ganar músculo.
- **Registro de peso** — pesate y guarda tu peso diario (con hora); gráfica de tendencia de 30 días y últimos registros.
- **Stats semanales** — gráfica de calorías de los últimos 7 o 30 días con tu objetivo de referencia, y % de días que cumples cada objetivo.
- **Interfaz nativa iOS** — pestañas inferiores estilo nativo, tema oscuro, instalable con un toque y usable sin conexión.

## Instalación

**iPhone/iPad**: abre la URL de la app en Safari → botón Compartir → **Añadir a pantalla de inicio**. Se abre como una app más. Recomendado: concede el permiso de cámara en Safari antes de instalar.

**Cualquier otro dispositivo**: simplemente abre la URL. (Puedes añadirla a la pantalla de inicio de Android desde Chrome.)

> Nota: los datos son por origen y por navegador. Si usas la app en dos dispositivos, cada uno guarda lo suyo.

## Para desarrolladores

**Stack**: SvelteKit 5 (SPA + adapter-static) · Dexie.js/IndexedDB (base de datos local) · @zxing/library (escáner) · OpenFoodFacts API · service worker para offline.

```bash
npm install
npm run dev        # desarrollo local
npm run check      # typecheck
npm run build      # build estático → build/
npm run preview    # probar el build
npm run test       # tests unitarios
```

**Despliegue**: el repo trae `netlify.toml` listo (build + publish `build/` + fallback SPA). Conecta el repo a Netlify y cada `git push` re-despliega. Vale también para Cloudflare Pages (usa `static/_redirects`).

```
src/lib/db.ts               # esquema Dexie: foods, entries, weights
src/lib/seed.ts             # catálogo inicial de alimentos
src/lib/openfoodfacts.ts    # cliente de la API pública
src/lib/stores.svelte.ts    # estado global (diario, objetivos, perfil, peso)
src/lib/format.ts           # utilidades numéricas (coma decimal incluida)
src/routes/+page.svelte     # diario
src/routes/stats/+page.svelte   # gráficas y cumplimiento
src/routes/foods/+page.svelte   # base de datos de alimentos
src/routes/scan/+page.svelte    # escáner + alta manual
src/routes/perfil/+page.svelte  # perfil y peso
src/service-worker.ts       # precache y offline
```

**Privacidad por diseño**: ningún dato sale del dispositivo salvo las consultas opcionales a OpenFoodFacts para resolver códigos de barras.
# MacroTrack 🥗

Seguimiento de calorías y macronutrientes **100% privado y sin servidor**: una PWA que se instala en el iPhone (o se abre en cualquier navegador) y guarda todos tus datos en tu propio dispositivo.

Sin cuentas, sin anuncios, sin sincronizar nada a la nube. Tus registros no salen de tu móvil.

<p align="center">
  <img src="https://github.com/user-attachments/assets/1140c0fd-cd2f-4789-8436-aeea721b7bbf" alt="MacroTrack" width="480">
</p>

## Funciones

- **Diario por días** — registra alimentos por comidas (desayuno, comida, snack, cena) y ve al instante tus totales de kcal, proteínas, hidratos, grasas y fibra frente a tus objetivos.
- **Escáner de código de barras** — apunta con la cámara al producto y resuélvelo automáticamente contra OpenFoodFacts (base de datos pública y gratuita). Cada producto se consulta una sola vez; después vive en tu dispositivo y funciona **offline**.
- **Base de datos de alimentos** — catálogo inicial de 23 alimentos comunes; añade los tuyos a mano o buscando por nombre en OpenFoodFacts.
- **Objetivos calculados para ti** — tu perfil (altura, peso, edad, sexo, actividad, objetivo) calcula tus dianas con la fórmula de Harris-Benedict: perder grasa, recomposición, mantener o ganar músculo.
- **Registro de peso** — pesate y guarda tu peso diario (con hora); gráfica de tendencia de 30 días y últimos registros.
- **Días completos** — confirma explícitamente que has registrado todo el día, desde el diario o seleccionando varios días en Estadísticas. Puedes desmarcarlos; editar comidas mantiene la confirmación. Los días anteriores quedan sin confirmar hasta que los revises.
- **Resumen semanal** — de lunes a domingo, consulta medias y acumulados de calorías, grasas, hidratos, fibra y proteínas, con la cobertura visible (por ejemplo, 6 de 7 días completos). Solo cuentan los días completos y se comparan con el objetivo de esos mismos días: un día sin registrar no aporta margen ni cuenta como cero.
- **Detalle diario** — gráficas interactivas de la semana seleccionada o los últimos 30 días; toca una barra para ver su valor. Los registros parciales aparecen atenuados y quedan fuera del porcentaje de cumplimiento diario, que se muestra separado del balance semanal. Las comparaciones usan tus objetivos actuales.
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
src/lib/db.ts               # esquema Dexie: foods, entries, weights, completedDays
src/lib/seed.ts             # catálogo inicial de alimentos
src/lib/openfoodfacts.ts    # cliente de la API pública
src/lib/stores.svelte.ts    # estado global (diario, objetivos, perfil, peso)
src/lib/format.ts           # utilidades numéricas (coma decimal incluida)
src/lib/weekly.ts           # semanas naturales y balance de días completos
src/routes/+page.svelte     # diario
src/routes/stats/+page.svelte   # resumen semanal, confirmación por lotes y gráficas
src/routes/foods/+page.svelte   # base de datos de alimentos
src/routes/scan/+page.svelte    # escáner + alta manual
src/routes/perfil/+page.svelte  # perfil y peso
src/service-worker.ts       # precache y offline
```

**Privacidad por diseño**: ningún dato sale del dispositivo salvo las consultas opcionales a OpenFoodFacts para resolver códigos de barras.

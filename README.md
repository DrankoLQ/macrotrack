# MacroTrack 🥗

Seguimiento de calorías y macronutrientes **100% privado y sin servidor**: una PWA que se instala en el iPhone (o se abre en cualquier navegador) y guarda todos tus datos en tu propio dispositivo.

Sin cuentas, sin anuncios, sin sincronizar nada a la nube. Tus registros no salen de tu móvil.

<p align="center">
  <img src="https://github.com/user-attachments/assets/1140c0fd-cd2f-4789-8436-aeea721b7bbf" alt="MacroTrack" width="480">
</p>

## Funciones

- **Diario por días** — registra alimentos por comidas (desayuno, comida, snack, cena) y ve al instante tus totales de calorías, grasas, hidratos, fibra y proteínas frente a tus objetivos, con saturadas bajo grasas y azúcares totales bajo hidratos.
- **Escáner de código de barras** — apunta con la cámara al producto y resuélvelo automáticamente contra OpenFoodFacts (base de datos pública y gratuita). Cada producto se consulta una sola vez; después vive en tu dispositivo y funciona **offline**.
- **Base de datos de alimentos** — catálogo inicial de 23 alimentos comunes; añade los tuyos a mano o buscando por nombre en OpenFoodFacts.
- **Recetas** — en la pestaña Alimentos, combina alimentos de tu base de datos en una receta y ve sus macros. Cada receta es una ración: pon las cantidades de un solo plato. Cada ingrediente guarda sus macros, así que la receta no cambia si luego editas o borras el alimento. Desde el diario puedes añadir una receta entera como una sola comida (ajustando los gramos si ese día comiste más o menos) o crear una receta nueva sobre la marcha. **Compártelas con un QR**: el código lleva la receta entera dentro del enlace, así que el otro móvil solo tiene que escanearlo con la cámara y confirmar; no pasa por ningún servidor.
- **Objetivos calculados para ti** — tu perfil (altura, peso, edad, sexo, actividad, objetivo) calcula tus dianas con la fórmula de Harris-Benedict: perder grasa, recomposición, mantener o ganar músculo.
- **Registro de peso** — pesate y guarda tu peso diario (con hora); gráfica de tendencia de 30 días y últimos registros.
- **Días completos** — confirma explícitamente que has registrado todo el día, desde el diario o seleccionando varios días en Estadísticas. Puedes desmarcarlos; editar comidas mantiene la confirmación. Los días anteriores quedan sin confirmar hasta que los revises.
- **Resumen semanal** — de lunes a domingo, consulta medias y acumulados de calorías, grasas, hidratos, fibra y proteínas, con la cobertura visible (por ejemplo, 6 de 7 días completos). Solo cuentan los días completos y se comparan con el objetivo de esos mismos días: un día sin registrar no aporta margen ni cuenta como cero.
- **Detalle diario** — gráficas interactivas de la semana seleccionada o los últimos 30 días; toca una barra para ver su valor. Los registros parciales aparecen atenuados y quedan fuera del porcentaje de cumplimiento diario, que se muestra separado del balance semanal. Las comparaciones usan tus objetivos actuales.
- **Interfaz nativa iOS** — pestañas inferiores estilo nativo, tema oscuro, instalable con un toque y usable sin conexión.

### Saturadas y azúcares totales: cómo leerlos

- **Datos opcionales de etiqueta** — puedes introducirlos a mano o incorporarlos desde OpenFoodFacts; se conservan en recetas, porciones, snapshots del diario y QR. Un campo en blanco significa **desconocido**, no cero; `0` es un cero conocido. Saturadas son parte de grasas y azúcares parte de hidratos: no añaden calorías extra.
- **Sin datos completos** — si algún alimento de una comida o día desconoce un nutriente, su total queda incompleto, aunque los demás lo conozcan. Cada nutriente se evalúa por separado; una receta puede tener azúcares conocidos y saturadas desconocidas.
- **Máximo de saturadas** — se deriva de tus calorías objetivo actuales: `goals.kcal * 0.10 / 9`, el 10 % de la energía según la OMS convertido con 9 kcal/g. Es un máximo, **no una meta que alcanzar**. Se compara sin redondear y la igualdad está permitida; se muestra con un decimal (2000 kcal → 22,2 g).
- **Azúcares totales** — solo informativos, sin objetivo, barra de progreso ni cumplimiento. No equivalen a azúcares libres ni añadidos; no se les aplica el umbral de la OMS para azúcares libres.
- **Semana y últimos 30 días** — cada media usa solo días registrados, confirmados completos y con ese nutriente totalmente conocido. Su denominador y cobertura son independientes: entre tres días registrados completos, pueden contar dos para saturadas (2/3) y uno para azúcares (1/3). El cumplimiento de saturadas usa esos mismos días elegibles. Sin días elegibles no hay media; los días sin registrar o futuros son huecos, no ceros.
- **Sin relleno automático** — no se enriquecen el historial ni el catálogo inicial, ni se refrescan automáticamente los alimentos guardados. Los datos antiguos siguen siendo desconocidos hasta una edición explícita que aporte esos valores.

## Instalación

**iPhone/iPad**: abre la URL de la app en Safari → botón Compartir → **Añadir a pantalla de inicio**. Se abre como una app más. Recomendado: concede el permiso de cámara en Safari antes de instalar.

**Cualquier otro dispositivo**: simplemente abre la URL. (Puedes añadirla a la pantalla de inicio de Android desde Chrome.)

> Nota: los datos son por origen y por navegador. Si usas la app en dos dispositivos, cada uno guarda lo suyo.

## Para desarrolladores

**Stack**: Node 22 · SvelteKit 5 (SPA + adapter-static) · Dexie.js/IndexedDB (base de datos local) · @zxing/library (escáner) · OpenFoodFacts API · service worker para offline.

**Modelo y QR**: `saturatedFat?: number` y `sugars?: number` son opcionales en alimentos y snapshots de entradas/ingredientes: se guarda cero conocido o se omite el campo desconocido, nunca `null`. En alimentos usan la misma base que los demás nutrientes; en snapshots son gramos para la cantidad consumida. Los totales agregados usan `null` si el nutriente está incompleto. Los QR antiguos siguen siendo compatibles: posiciones 0–6 intactas y unidades en índice 7; los nuevos añaden saturadas/azúcares en 8/9. En el transporte, `null` reserva posiciones desconocidas (incluidas unidades ausentes); al importar se convierte en ausencia, conservando el cero conocido.

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
src/lib/db.ts               # esquema Dexie: foods, entries, weights, completedDays, recipes
src/lib/seed.ts             # catálogo inicial de alimentos
src/lib/openfoodfacts.ts    # cliente de la API pública
src/lib/stores.svelte.ts    # estado global (diario, objetivos, perfil, peso)
src/lib/format.ts           # utilidades numéricas (coma decimal incluida)
src/lib/macros.ts           # objetivos, consumo y máximo de saturadas
src/lib/weekly.ts           # semanas naturales, balance y cobertura por nutriente
src/lib/recipes.ts          # ingredientes y totales de recetas
src/lib/share.ts            # recetas compartidas dentro del enlace del QR
src/routes/+page.svelte     # diario
src/routes/stats/+page.svelte   # resumen semanal, confirmación por lotes y gráficas
src/routes/foods/+page.svelte   # pestañas Alimentos / Recetas (FoodList y RecipeList)
src/routes/scan/+page.svelte    # escáner + alta manual
src/routes/perfil/+page.svelte  # perfil y peso
src/service-worker.ts       # precache y offline
```

**Privacidad por diseño**: ningún dato sale del dispositivo salvo las consultas opcionales a OpenFoodFacts para resolver códigos de barras.

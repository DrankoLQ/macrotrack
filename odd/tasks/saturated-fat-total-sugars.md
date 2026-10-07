# Grasas saturadas y azúcares totales

## Objetivo y motivo

Registrar grasas saturadas y azúcares totales de etiqueta en todo MacroTrack, sin inventar datos históricos ni duplicar calorías. Comparar saturadas con el máximo OMS del 10 % de la energía; azúcares totales son informativos, no azúcares libres.

## Autoridad y documentos

- Especificación aprobada: `docs/superpowers/specs/2026-10-07-saturated-fat-total-sugars-design.md`.
- Plan aprobado: `docs/superpowers/plans/2026-10-07-saturated-fat-total-sugars.md`.
- Método elegido: subagentes secuenciales por tarea, un escritor, revisión de especificación/calidad y verificaciones antes de avanzar.
- Estado: T1 completada con commit `17197e980765aa71a9f6aaa49feb7a1c8db4b613`; T2 implementada y revisada/verificada independientemente PASS; commit local pendiente.
- Checkout inicial: `main`, base `49d833768f7f8f4c6d8a3e05fecdb4224766bc92`.
- Aislamiento/rama: `feat/saturated-fat-total-sugars` en este checkout, sin nuevo worktree por decisión explícita del usuario. Rama creada antes del código.
- Commits: autorizados explícitamente por el usuario por unidad verificada; mensajes según convención del repo. Push, PR y merge no autorizados.
- Entrega: cadena sobre rama de funcionalidad (`chain_strategy=feature-branch-chain`); forecast 1100–1600 líneas authored. Revisiones futuras en slices coherentes, sin publicación automática. El diseño/plan/seguimiento inicial acompañarán T1.
- Revisión nativa: switch global ON confirmado. ASSESS no disponible (`package-local-binary-missing`); INSPECT T1 bloqueado (`native-status-package-binary-missing`, lineage_created=false, mutation_performed=false). No authority/receipt ni aprobación nativa; no se cambió el switch. Ruta fallback de verificación independiente por riesgo no evaluable. Verificadores documentales PASS.

## Alcance e invariantes

- Campos opcionales `saturatedFat` y `sugars` en alimentos y snapshots; ausencia desconocida distinta de cero numérico.
- Totales agregados anulables e independientes; incompletitud impide evaluar cumplimiento de esa métrica.
- Máximo saturadas: `goals.kcal * 0.10 / 9`, sin redondeos intermedios, visualización a un decimal; igualdad permitida.
- Sin objetivo, barra de progreso ni cumplimiento para azúcares totales.
- No modificar fórmulas/objetivos originales ni versiones Dexie existentes; no migración innecesaria ni relleno histórico.
- Conservar comportamiento explícito de edición de gramos y snapshots; no reescritura masiva.
- Estadísticas con denominadores por nutriente y cobertura explícita; huecos no son ceros.
- QR antiguos compatibles; unidades siguen en índice 7, campos nuevos en 8/9.
- Orden original relativo y desglose subordinado; español, privacidad local-first, móvil/offline, sin nuevas dependencias ni peticiones.
- No incluir libres/añadidos, refresh automático de alimentos, enriquecimiento de semillas, densidades de líquidos ni refactors ajenos.

## Tareas estables

Cada tarea es delegada por múltiples archivos no triviales; verificación y revisión mediante subagentes separados cuando corresponda. Todos los comandos y evidencias de la implementación permanecen pendientes, no confundir con RED/GREEN previstos del plan.

- [x] T1 — Modelo opcional, aritmética de consumo y máximo de saturadas. Ruta: delegada; `db.ts`, `macros.ts`, `macros.test.ts`. RED/GREEN y review PASS; focal17/17, check0/0, suite57/57, Node22.22.2. Commit: `17197e980765aa71a9f6aaa49feb7a1c8db4b613`. Riesgo nativo no evaluable/review unavailable; fallback independiente PASS.
- [ ] T2 — EN CURSO: Parsing validado y adquisición OpenFoodFacts. Ruta: delegada; `nutrient-input.ts/test`, `openfoodfacts.ts/test`. Checks: RED/GREEN focal, blanco/cero/coma/inválido, campos normalizados sin doble conversión, regresión cliente sin red real. Commit: pendiente.
- [ ] T3 — Recetas, porciones, snapshots y edición de entradas. Ruta: delegada; `recipes.ts/test`, `entry-nutrients.ts/test`, `stores.svelte.ts`. Checks: RED/GREEN, completitud independiente, catálogo vs snapshot, eliminación de valores obsoletos y objetivos antiguos. Commit: pendiente.
- [ ] T4 — QR retrocompatible. Ruta: delegada; `share.ts/test`. Checks: RED/GREEN, formatos antiguos/nuevos, unidades, null/cero y precisión de transporte. Commit: pendiente.
- [ ] T5 — Semana, cobertura y geometría de gráficos. Ruta: delegada; `weekly.ts/test`, `chart.ts/test`. Checks: RED/GREEN, denominadores independientes, días parciales/futuros, sin objetivo azúcar, frontera del máximo. Commit: pendiente.
- [ ] T6 — Formularios, catálogo y recetas visibles. Ruta: delegada; `FoodForm.svelte`, `FoodList.svelte`, `scan/+page.svelte`, `RecipeForm.svelte`, `RecipeList.svelte`. Checks: pruebas puras y check; aceptación funcional móvil de blanco/cero/edición; sin runner de componentes, no RED UI ficticio. Commit: pendiente.
- [ ] T7 — Diario, perfil y estadísticas. Ruta: delegada; `SubNutrient.svelte`, `MacroChart.svelte`, rutas diario/perfil/stats. Checks: pruebas puras y check; aceptación de máximo, reactivo kcal, azúcar informativo, desconocidos/cobertura/huecos. Commit: pendiente.
- [ ] T8 — Regresión integrada, documentación y móvil/offline. Ruta: delegada; `README.md`, lectura del service worker. Checks: `npm run check`, `npm run test`, `npm run build`, verificaciones funcionales móvil/offline/QR y ausencia de nuevas peticiones. Commit: pendiente.

## Evidencia y progreso

- Exploración read-only completada; decisiones, especificación y plan aprobados por el usuario.
- Auto-revisión documental y verificaciones independientes de especificación/plan: PASS, sin defectos graves.
- OFF: esquema oficial `docs/api/ref/schemas/product_nutrition.yaml` describe `_100g` normalizado a gramos para nutrientes por peso; `_unit` es unidad introducida, no reconvertir. Puede ser por 100 ml para líquidos: limitación preexistente, no inferir densidad.
- Preparación completada: rama creada y decisiones de aislamiento/commits/entrega resueltas; writer single-threaded.
- Baseline observado por verificador: `npm run check` PASS (0 errores, 0 warnings), `npm run test` PASS (47/47). Node v24.20.0; proyecto especifica22, registrar diferencia y preferir22 local si disponible sin instalar. No build baseline. Ningún RED/GREEN de la nueva función observado aún.
- T1 escritor: 221 líneas authored (215 añadidas, 6 eliminadas), solo `db.ts`, `macros.ts`, `macros.test.ts`. RED observado17tests:7pass/10fail; dos corridas intermedias16/17 por fixtures incorrectos de objetivos/IEEE-754, corregidos fixtures sin cambiar fórmulas. GREEN y post-refactor17/17, `check`0errores/0warnings y suite57/57 con Node22.22.2 instalado (`PATH=/Users/danielluque/.nvm/versions/node/v22.22.2/bin:$PATH`). `git diff --check`PASS. Build no ejecutado, lógica pura. Verificador independiente: Spec compliance PASS y Code quality PASS sin hallazgos graves; repitió focal17/17, check0/0, suite57/57 y diff-check PASS con Node22.22.2. No marcar tarea completada antes del commit.
- T2 escritor: 161 authored incluyendo archivos nuevos, solo4superficies autorizadas. RED2fallos de archivo por módulo/export inexistentes; GREEN/post-refactor8/8, check0/0, suite65/65, diff-checkPASS con Node22.22.2. Sin consultas de red reales, mocks restaurados; semántica parseFloat existente conservada. ASSESS/INSPECT T2 bloqueados por binario local, sin lineage/mutación/aprobación; revisión independiente Spec/Quality/funcional PASS: focal8/8, check0/0, suite65/65, diff-checkPASS. Sin hallazgos graves. Build omitido unidad pura. Commit pendiente.
- T1 slice/commit: `49d833768f7f8f4c6d8a3e05fecdb4224766bc92..17197e980765aa71a9f6aaa49feb7a1c8db4b613`; 278 authored con seguimiento (221 implementación/pruebas). Running278 authored. ASSESS del commit no evaluable; outcome explícito unavailable, verificación independiente ya observada PASS, sin aprobación/authority nativa.
- Mirror Engram: copia completa bajo `odd/saturated-fat-total-sugars/tasks`; reconciliar ambas copias antes del primer write de fuente y al reanudar.

## Próximo paso

Ejecutar T2 con test-first, validar, revisar independientemente y crear su commit local después de checks verdes. Revisiones futuras: sliceT1 (modelo/cálculos), sliceT2 (adquisición), sliceT3 (snapshots), sliceT4 (QR), sliceT5 (estadísticas), sliceT6 (formularios), sliceT7 (UI), sliceT8 (aceptación/documentación); sin publicación. Artefactos de diseño/plan son documentación separada, todavía sin seguimiento Git; se preservan para ejecución y entrega final. Reconciliar archivos/copia Engram antes de writes. No pedir autorización entre tareas ya aprobadas; detenerse solo ante decisiones o bloqueos reales.

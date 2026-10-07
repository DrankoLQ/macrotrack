import { foodAtGrams, scaleTotals } from './macros.ts';
import type { NutrientValues } from './macros.ts';

/** Una edición explícita usa el catálogo actual; si ya no existe, escala el snapshot. */
export function entryNutrients(
	entry: NutrientValues & { grams: number },
	grams: number,
	food?: NutrientValues & { base: number }
): NutrientValues {
	return food ? foodAtGrams(food, grams) : scaleTotals(entry, grams, entry.grams);
}

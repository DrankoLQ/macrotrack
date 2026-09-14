import { foodAtGrams, sumTotals, type Totals } from './macros.ts';
import type { Food, MealType, Recipe, RecipeItem } from './db';
import { round } from './format.ts';

/** Copia las macros del alimento en la receta, igual que hacen las entradas del diario:
 *  así la receta sobrevive a que el alimento se edite o se borre del catálogo. */
export function recipeItem(food: Food, grams: number, units?: number): RecipeItem {
	return { foodId: food.id, name: food.name, grams, units, ...foodAtGrams(food, grams) };
}

export function recipeTotals(items: RecipeItem[]): Totals {
	return {
		kcal: sumTotals(items, 'kcal'),
		fat: sumTotals(items, 'fat'),
		carbs: sumTotals(items, 'carbs'),
		fiber: sumTotals(items, 'fiber'),
		protein: sumTotals(items, 'protein')
	};
}

export function recipeGrams(items: RecipeItem[]): number {
	return items.reduce((acc, item) => acc + item.grams, 0);
}

/** Gramos de una fracción de la receta: "he tomado 1 de 3 partes del gazpacho". */
export function portionGrams(items: RecipeItem[], part: number, parts: number): number {
	if (!(part > 0) || !(parts > 0)) return 0;
	return round(recipeGrams(items) * (part / parts));
}

/** Una receta sin momentos marcados vale para cualquier comida. */
export function matchesMeal(recipe: Pick<Recipe, 'mealTypes'>, mealType?: MealType): boolean {
	return !mealType || !recipe.mealTypes?.length || recipe.mealTypes.includes(mealType);
}

/** Las más añadidas al diario, primero la que más. Las que nunca se han usado no cuentan. */
export function mostUsed<T extends Pick<Recipe, 'uses'>>(recipes: T[], limit = 3): T[] {
	return recipes
		.filter((recipe) => (recipe.uses ?? 0) > 0)
		.sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0))
		.slice(0, limit);
}

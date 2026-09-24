import Dexie, { type EntityTable } from 'dexie';

export type FoodSource = 'builtin' | 'manual' | 'openfoodfacts';

export interface Food {
	id?: number;
	name: string;
	brand?: string;
	barcode?: string;
	unitSize?: number;
	base: number;
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
	source: FoodSource;
	imageUrl?: string;
	favorite?: boolean;
	createdAt: number;
}

export type MealType = 'desayuno' | 'comida' | 'cena' | 'snack' | 'merienda';

export const MEAL_TYPES: { key: MealType; label: string }[] = [
	{ key: 'desayuno', label: 'Desayuno' },
	{ key: 'comida', label: 'Comida' },
	{ key: 'merienda', label: 'Merienda' },
	{ key: 'snack', label: 'Snack' },
	{ key: 'cena', label: 'Cena' }
];

export function suggestMealType(now: Date = new Date()): MealType {
	const hour = now.getHours();
	if (hour >= 5 && hour < 11) return 'desayuno';
	if (hour >= 11 && hour < 16) return 'comida';
	if (hour >= 16 && hour < 19) return 'merienda';
	if (hour >= 19 && hour < 23) return 'cena';
	return 'snack';
}

export interface Entry {
	id?: number;
	date: string;
	foodId?: number;
	name: string;
	grams: number;
	units?: number;
	unitSize?: number;
	mealType?: MealType;
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
	createdAt: number;
}

export interface RecipeItem {
	foodId?: number;
	name: string;
	grams: number;
	units?: number;
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
}

export interface Recipe {
	id?: number;
	name: string;
	/** Momentos del día en los que toca esta receta; vacío = vale para cualquiera. */
	mealTypes?: MealType[];
	items: RecipeItem[];
	/** Veces que se ha añadido al diario; ordena las «más usadas» del selector. */
	uses?: number;
	createdAt: number;
}

export interface Weight {
	id?: number;
	date: string;
	weight: number;
	bodyFat?: number;
	createdAt: number;
}

export const db = new Dexie('macrotrack') as Dexie & {
	foods: EntityTable<Food, 'id'>;
	entries: EntityTable<Entry, 'id'>;
	weights: EntityTable<Weight, 'id'>;
	completedDays: EntityTable<{ date: string }, 'date'>;
	recipes: EntityTable<Recipe, 'id'>;
};

db.version(1).stores({
	foods: '++id, &barcode, name',
	entries: '++id, date, foodId'
});

db.version(2)
	.stores({
		foods: '++id, &barcode, name',
		entries: '++id, date, foodId, mealType'
	})
	.upgrade((tx) => tx.table('entries').toCollection().modify((entry: Entry) => {
		entry.mealType = 'comida';
	}));

db.version(3).stores({
	foods: '++id, &barcode, name',
	entries: '++id, date, foodId, mealType',
	weights: '++id, &date'
});

db.version(4).stores({
	foods: '++id, &barcode, name',
	entries: '++id, date, foodId, mealType',
	weights: '++id, &date',
	completedDays: 'date'
});

db.version(5).stores({
	foods: '++id, &barcode, name',
	entries: '++id, date, foodId, mealType',
	weights: '++id, &date',
	completedDays: 'date',
	recipes: '++id, name'
});

export async function setDaysComplete(dates: string[], complete: boolean) {
	await db.transaction('rw', db.completedDays, db.entries, async () => {
		if (!complete) {
			await db.completedDays.bulkDelete(dates);
			return;
		}
		const today = new Date().toLocaleDateString('en-CA');
		const entries = await db.entries.where('date').anyOf(dates).toArray();
		const withEntries = new Set(entries.map((entry) => entry.date));
		if (dates.some((date) => date > today || !withEntries.has(date))) {
			throw new Error('Solo puedes confirmar días con registros que no sean futuros.');
		}
		await db.completedDays.bulkPut(dates.map((date) => ({ date })));
	});
}

export async function deleteFood(id: number) {
	await db.transaction('rw', db.foods, db.entries, async () => {
		await db.entries
			.where('foodId')
			.equals(id)
			.modify((entry) => {
				delete entry.foodId;
			});
		await db.foods.delete(id);
	});
}

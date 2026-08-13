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

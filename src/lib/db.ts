import Dexie, { type EntityTable } from 'dexie';

export type FoodSource = 'builtin' | 'manual' | 'openfoodfacts';

export interface Food {
	id?: number;
	name: string;
	brand?: string;
	barcode?: string;
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

export type MealType = 'desayuno' | 'comida' | 'cena' | 'snack';

export const MEAL_TYPES: { key: MealType; label: string }[] = [
	{ key: 'desayuno', label: 'Desayuno' },
	{ key: 'comida', label: 'Comida' },
	{ key: 'cena', label: 'Cena' },
	{ key: 'snack', label: 'Snack' }
];

export interface Entry {
	id?: number;
	date: string;
	foodId?: number;
	name: string;
	grams: number;
	mealType?: MealType;
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
	createdAt: number;
}

export const db = new Dexie('macrotrack') as Dexie & {
	foods: EntityTable<Food, 'id'>;
	entries: EntityTable<Entry, 'id'>;
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

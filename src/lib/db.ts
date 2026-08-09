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

export interface Entry {
	id?: number;
	date: string;
	foodId?: number;
	name: string;
	grams: number;
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

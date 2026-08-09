import { db, type Food } from './db';

export const SEED_FOODS: Omit<Food, 'id' | 'createdAt'>[] = [
	{ name: 'Fresas', base: 100, kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, source: 'builtin' },
	{ name: 'Tomate', base: 100, kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, source: 'builtin' },
	{ name: 'Plátano', base: 100, kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, source: 'builtin' },
	{ name: 'Manzana', base: 100, kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, source: 'builtin' },
	{ name: 'Patata cocida', base: 100, kcal: 87, protein: 1.9, carbs: 20.1, fat: 0.1, fiber: 1.8, source: 'builtin' },
	{ name: 'Zanahoria', base: 100, kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, source: 'builtin' },
	{ name: 'Cebolla', base: 100, kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, source: 'builtin' },
	{ name: 'Aguacate', base: 100, kcal: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, source: 'builtin' },
	{ name: 'Arroz blanco cocido', base: 100, kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, source: 'builtin' },
	{ name: 'Pasta cocida', base: 100, kcal: 158, protein: 5.8, carbs: 30.9, fat: 0.9, fiber: 1.8, source: 'builtin' },
	{ name: 'Pan integral', base: 100, kcal: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, source: 'builtin' },
	{ name: 'Avena', base: 100, kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6, source: 'builtin' },
	{ name: 'Lentejas cocidas', base: 100, kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, source: 'builtin' },
	{ name: 'Pechuga de pollo', base: 100, kcal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, source: 'builtin' },
	{ name: 'Salmón', base: 100, kcal: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, source: 'builtin' },
	{ name: 'Atún en lata', base: 100, kcal: 132, protein: 28, carbs: 0, fat: 1, fiber: 0, source: 'builtin' },
	{ name: 'Huevo', base: 100, kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, fiber: 0, source: 'builtin' },
	{ name: 'Miel', base: 100, kcal: 304, protein: 0.3, carbs: 82.4, fat: 0, fiber: 0.2, source: 'builtin' },
	{ name: 'Leche entera', base: 100, kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, source: 'builtin' },
	{ name: 'Yogur natural', base: 100, kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, source: 'builtin' },
	{ name: 'Queso curado', base: 100, kcal: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, source: 'builtin' },
	{ name: 'Almendras', base: 100, kcal: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, source: 'builtin' },
	{ name: 'Aceite de oliva', base: 100, kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, source: 'builtin' }
];

export async function seedIfNeeded() {
	const existing = new Set((await db.foods.toArray()).map((food) => food.name.trim().toLowerCase()));
	const missing = SEED_FOODS.filter((food) => !existing.has(food.name.trim().toLowerCase()));
	if (missing.length === 0) return;
	const now = Date.now();
	await db.foods.bulkAdd(missing.map((food) => ({ ...food, createdAt: now })));
}

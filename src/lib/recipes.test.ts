import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipeItem, recipeTotals, recipeGrams, portionGrams, matchesMeal, mostUsed } from './recipes.ts';
import type { Food } from './db.ts';

const food = (over: Partial<Food>): Food => ({
	name: 'Alimento', base: 100, kcal: 100, protein: 10, carbs: 20, fat: 5, fiber: 2,
	source: 'manual', createdAt: 0, ...over
});

test('un ingrediente escala las macros del alimento a sus gramos', () => {
	const item = recipeItem(food({ id: 7, name: 'Arroz' }), 250);
	assert.equal(item.foodId, 7);
	assert.equal(item.name, 'Arroz');
	assert.equal(item.grams, 250);
	assert.deepEqual(
		{ kcal: item.kcal, fat: item.fat, carbs: item.carbs, fiber: item.fiber, protein: item.protein },
		{ kcal: 250, fat: 12.5, carbs: 50, fiber: 5, protein: 25 }
	);
});

test('los alimentos por unidades guardan las unidades y sus gramos', () => {
	const huevo = food({ id: 2, name: 'Huevo', unitSize: 60, base: 100, kcal: 155 });
	const item = recipeItem(huevo, 120, 2);
	assert.equal(item.units, 2);
	assert.equal(item.grams, 120);
	assert.equal(item.kcal, 186);
});

test('los totales de la receta suman sus ingredientes', () => {
	const items = [recipeItem(food({ id: 1 }), 100), recipeItem(food({ id: 2, kcal: 50, fat: 0 }), 200)];
	assert.deepEqual(recipeTotals(items), { kcal: 200, fat: 5, carbs: 60, fiber: 6, protein: 30 });
	assert.equal(recipeGrams(items), 300);
});

test('una receta vacía suma cero y no rompe', () => {
	assert.deepEqual(recipeTotals([]), { kcal: 0, fat: 0, carbs: 0, fiber: 0, protein: 0 });
	assert.equal(recipeGrams([]), 0);
});

test('portionGrams escala la receta a la parte comida', () => {
	const items = [recipeItem(food({ id: 1 }), 400), recipeItem(food({ id: 2 }), 200)];
	assert.equal(portionGrams(items, 1, 3), 200);
	assert.equal(portionGrams(items, 2, 3), 400);
	assert.equal(portionGrams(items, 1, 1), 600);
	assert.equal(portionGrams(items, 1, 0), 0);
});

test('el filtro por momento deja pasar las recetas sin momento marcado', () => {
	const gazpacho = { mealTypes: ['comida', 'cena'] as const };
	assert.equal(matchesMeal({ mealTypes: [...gazpacho.mealTypes] }, 'cena'), true);
	assert.equal(matchesMeal({ mealTypes: [...gazpacho.mealTypes] }, 'desayuno'), false);
	assert.equal(matchesMeal({ mealTypes: [] }, 'desayuno'), true);
	assert.equal(matchesMeal({}, 'desayuno'), true);
	assert.equal(matchesMeal({ mealTypes: ['cena'] }, undefined), true);
});

test('las más usadas van primero y las que nunca se usaron no salen', () => {
	const list: { uses?: number; n: string }[] = [{ uses: 2, n: 'b' }, { n: 'sin usar' }, { uses: 9, n: 'a' }, { uses: 1, n: 'c' }, { uses: 5, n: 'd' }];
	assert.deepEqual(mostUsed(list).map((r) => r.n), ['a', 'd', 'b']);
	assert.deepEqual(mostUsed(list, 1).map((r) => r.n), ['a']);
	assert.deepEqual(mostUsed([{ n: 'x' } as (typeof list)[number]]), []);
	assert.equal(list[0].n, 'b', 'no altera el array original');
});

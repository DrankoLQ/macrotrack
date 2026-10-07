import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryNutrients } from './entry-nutrients.ts';

const historical = { grams: 100, kcal: 100, fat: 5, carbs: 20, fiber: 2, protein: 10 };
const known = { ...historical, saturatedFat: 2, sugars: 3 };

test('sin catálogo escala el snapshot sin modificar la entrada', () => {
	assert.deepEqual(entryNutrients(known, 50), {
		kcal: 50, fat: 2.5, carbs: 10, fiber: 1, protein: 5, saturatedFat: 1, sugars: 1.5
	});
	assert.equal(known.grams, 100);
	assert.equal(known.saturatedFat, 2);
});

test('catálogo actual sustituye valores y pierde datos que ya no existen', () => {
	const catalog = { ...historical, base: 100, kcal: 200, sugars: 0 };
	const calculated = entryNutrients(known, 50, catalog);
	assert.equal(calculated.kcal, 100);
	assert.equal(calculated.sugars, 0);
	assert.equal(Object.hasOwn(calculated, 'saturatedFat'), false);
	assert.equal(known.saturatedFat, 2, 'el cálculo no reescribe la historia');
});

test('una edición explícita adquiere nuevos datos del catálogo', () => {
	const calculated = entryNutrients(historical, 200, { ...known, base: 100 });
	assert.equal(calculated.saturatedFat, 4);
	assert.equal(calculated.sugars, 6);
	assert.equal(Object.hasOwn(historical, 'sugars'), false);
});

test('snapshot histórico sigue desconocido sin catálogo', () => {
	const calculated = entryNutrients(historical, 200);
	assert.equal(calculated.kcal, 200);
	assert.equal(Object.hasOwn(calculated, 'saturatedFat'), false);
	assert.equal(Object.hasOwn(calculated, 'sugars'), false);
});

test('catálogo con saturadas cero y azúcar ausente conserva independencia', () => {
	const calculated = entryNutrients(known, 50, { ...historical, base: 100, saturatedFat: 0 });
	assert.equal(calculated.saturatedFat, 0);
	assert.equal(Object.hasOwn(calculated, 'sugars'), false);
});

test('gramos anteriores cero mantienen el factor cero y los desconocidos', () => {
	assert.deepEqual(entryNutrients({ ...known, grams: 0 }, 50), {
		kcal: 0, fat: 0, carbs: 0, fiber: 0, protein: 0, saturatedFat: 0, sugars: 0
	});
	const calculated = entryNutrients({ ...historical, grams: 0 }, 50);
	assert.equal(calculated.kcal, 0);
	assert.equal(Object.hasOwn(calculated, 'saturatedFat'), false);
	assert.equal(Object.hasOwn(calculated, 'sugars'), false);
});

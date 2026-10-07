import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRecipe, encodeRecipe, recipeShareUrl } from './share.ts';
import { recipeTotals } from './recipes.ts';
import type { RecipeItem } from './db.ts';

const RECIPE = {
	name: 'Guiso de garbanzos ñam',
	items: [
		{ name: 'Garbanzos', grams: 200, kcal: 328, protein: 17.2, carbs: 44.6, fat: 5.4, fiber: 12.8 },
		{ name: 'Huevo', grams: 120, kcal: 172, protein: 15, carbs: 1, fat: 12, fiber: 0, units: 2 }
	]
};

test('la receta sobrevive al viaje por el enlace', () => {
	const decoded = decodeRecipe(recipeShareUrl(RECIPE, 'https://macrotrack.app'));
	assert.equal(decoded?.name, RECIPE.name);
	assert.deepEqual(decoded?.items[0], { ...RECIPE.items[0], units: undefined });
	assert.equal(decoded?.items[1].units, 2);
});

test('cabe en un QR: menos de 2953 bytes', () => {
	const big = { name: 'Receta larga', items: Array.from({ length: 20 }, () => RECIPE.items[0]) };
	assert.ok(recipeShareUrl(big, 'https://macrotrack.app').length < 2953);
});

const fixture = (item: unknown[]) => btoa(JSON.stringify(['Prueba', [item]]));
const unpack = (data: string) => JSON.parse(atob(data.replace(/-/g, '+').replace(/_/g, '/')))[1][0];
const BASE = ['A', 100, 101, 5, 10, 4, 2];

test('acepta las posiciones antiguas y nuevas sin alterar las cantidades originales', () => {
	for (const [tail, expected] of [
		[[], {}],
		[[2], { units: 2 }],
		[[null], {}],
		[[null, null, null], {}],
		[[null, 0], { saturatedFat: 0 }],
		[[2, 1.25, 3.5], { units: 2, saturatedFat: 1.25, sugars: 3.5 }],
		[[null, null, 0], { sugars: 0 }]
	] as [unknown[], Partial<RecipeItem>][]) {
		const item = decodeRecipe(`https://macrotrack.app/foods#r=${fixture([...BASE, ...tail])}`)!.items[0];
		assert.deepEqual(item, {
			name: 'A', grams: 100, kcal: 101, protein: 5, carbs: 10, fat: 4, fiber: 2,
			units: undefined, ...expected
		});
		for (const key of ['saturatedFat', 'sugars'] as const) {
			assert.equal(Object.hasOwn(item, key), Object.hasOwn(expected, key));
		}
	}
});

test('el encoder conserva formato antiguo y reserva unidades antes de los nutrientes nuevos', () => {
	const encode = (extra: object) => encodeRecipe({ name: 'Prueba', items: [{ ...RECIPE.items[0], ...extra }] });
	const base = ['Garbanzos', 200, 328, 17.2, 44.6, 5.4, 12.8];
	assert.deepEqual(unpack(encode({})), base);
	assert.deepEqual(unpack(encode({ units: 2 })), [...base, 2]);
	assert.deepEqual(unpack(encode({ saturatedFat: null, sugars: undefined })), base);
	assert.deepEqual(unpack(encode({ saturatedFat: 0 })), [...base, null, 0, null]);
	assert.equal(decodeRecipe(encode({ saturatedFat: Number.MAX_VALUE }))!.items[0].saturatedFat, Number.MAX_VALUE);
	assert.deepEqual(unpack(encode({ sugars: 0 })), [...base, null, null, 0]);
	const encoded = encodeRecipe({ name: 'Prueba', items: [{
		name: 'A', grams: 100.126, kcal: 101.126, protein: 5.126, carbs: 10.126,
		fat: 4.126, fiber: 2.126, units: 2, saturatedFat: 1.234, sugars: 3.456
	}] });
	assert.deepEqual(unpack(encoded), ['A', 100.13, 101.13, 5.13, 10.13, 4.13, 2.13, 2, 1.23, 3.46]);
	assert.deepEqual(decodeRecipe(encoded)!.items[0], {
		name: 'A', grams: 100.13, kcal: 101.13, protein: 5.13, carbs: 10.13,
		fat: 4.13, fiber: 2.13, units: 2, saturatedFat: 1.23, sugars: 3.46
	});
});

test('rechaza nutrientes inválidos antes de que JSON convierta no finitos en null', () => {
	for (const key of ['saturatedFat', 'sugars']) {
		for (const value of [-1, '1', NaN, Infinity, -Infinity]) {
			assert.throws(() => encodeRecipe({
				name: 'Prueba', items: [{ ...RECIPE.items[0], [key]: value }]
			}), /Cantidad de nutriente inválida/);
		}
		for (const value of [-1, '1', true]) {
			const tail = key === 'saturatedFat' ? [null, value] : [null, null, value];
			assert.equal(decodeRecipe(fixture([...BASE, ...tail])), null);
		}
	}
	assert.equal(decodeRecipe(btoa('["X",[["A",100,101,5,10,4,2,null,1e999]]]')), null);
	assert.equal(decodeRecipe(btoa('["X",[["A",100,101,5,10,4,2,null,null,1e999]]]')), null);
	for (const units of [0, -1, '2']) {
		assert.equal(decodeRecipe(fixture([...BASE, units, 0, 0])), null);
	}
});

test('una receta incompleta sigue incompleta tras compartirla', () => {
	const recipe = { name: 'Parcial', items: [
		{ ...RECIPE.items[0], saturatedFat: 0, sugars: 1.25 },
		{ ...RECIPE.items[1], sugars: 2.5 }
	] };
	const decoded = decodeRecipe(encodeRecipe(recipe))!;
	assert.equal(Object.hasOwn(decoded.items[1], 'saturatedFat'), false);
	assert.deepEqual(recipeTotals(decoded.items), recipeTotals(recipe.items));
	assert.equal(recipeTotals(decoded.items).saturatedFat, null);
	assert.equal(recipeTotals(decoded.items).sugars, 3.75);
});

test('datos ajenos corruptos o inválidos no se importan', () => {
	assert.equal(decodeRecipe('no-es-base64!!'), null);
	assert.equal(decodeRecipe('https://macrotrack.app/foods#r=no-es-base64!!'), null);
	assert.equal(decodeRecipe(btoa('{json roto')), null);
	assert.equal(decodeRecipe(fixture(['A', 100])), null);
	assert.equal(decodeRecipe(encodeRecipe({ name: 'Excesiva', items: Array.from({ length: 51 }, () => RECIPE.items[0]) })), null);
	assert.equal(decodeRecipe(encodeRecipe({ name: '  ', items: RECIPE.items })), null);
	assert.equal(decodeRecipe(encodeRecipe({ name: 'Vacía', items: [] })), null);
	assert.equal(decodeRecipe(btoa('["X",[["Sal","mucha",1,1,1,1,1]]]')), null);
});

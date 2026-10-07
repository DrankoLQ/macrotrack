import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchProductByBarcode, offToFood, parseOffProduct } from './openfoodfacts.ts';

test('OFF ya normaliza gramos aunque la unidad introducida sea mg', () => {
	const product = parseOffProduct({ product_name: 'Prueba', brands: 'Marca', image_front_small_url: 'imagen', nutriments: {
		'energy-kcal_100g': 100, proteins_100g: 2, carbohydrates_100g: 10, fat_100g: 3, fiber_100g: 1,
		'saturated-fat_100g': 1.25, 'saturated-fat_unit': 'mg', sugars_100g: 0, sugars_unit: 'mg'
	} });
	assert.deepEqual(product, {
		name: 'Prueba', brand: 'Marca', imageUrl: 'imagen', kcal: 100, protein: 2, carbs: 10,
		fat: 3, fiber: 1, saturatedFat: 1.25, sugars: 0
	});
	const food = offToFood(product, '123');
	assert.equal(food.base, 100);
	assert.equal(food.saturatedFat, 1.25);
	assert.equal(food.sugars, 0);
	assert.equal(food.kcal, 100);
	assert.equal(food.barcode, '123');
	assert.equal(food.source, 'openfoodfacts');
});

test('cada nutriente nuevo omite valores inválidos y conserva cero independientemente', () => {
	for (const [key, field, otherKey, otherField] of [
		['saturated-fat_100g', 'saturatedFat', 'sugars_100g', 'sugars'],
		['sugars_100g', 'sugars', 'saturated-fat_100g', 'saturatedFat']
	] as const) {
		for (const value of [undefined, null, '1', -1, Infinity, -Infinity, NaN]) {
			const product = parseOffProduct({ nutriments: { [key]: value, [otherKey]: 0 } });
			assert.equal(Object.hasOwn(product, field), false);
			assert.equal(product[otherField], 0);
			const food = offToFood(product, '123');
			assert.equal(Object.hasOwn(food, field), false);
			assert.equal(food[otherField], 0);
		}
	}
});

test('no usa añadidos, libres, porciones, valores de entrada ni preparados como fallback', () => {
	const product = parseOffProduct({ nutriments: {
		'added-sugars_100g': 5, 'free-sugars_100g': 6, sugars_serving: 7, sugars_value: 8,
		sugars_prepared_100g: 9, 'saturated-fat_serving': 2, 'saturated-fat_value': 3,
		'saturated-fat_prepared_100g': 4
	} });
	for (const result of [product, offToFood(product, '123')]) {
		assert.equal(Object.hasOwn(result, 'saturatedFat'), false);
		assert.equal(Object.hasOwn(result, 'sugars'), false);
	}
});

test('los cinco campos antiguos siguen usando cero por ausencia o valor inválido', () => {
	for (const value of [undefined, null, '1', Infinity, NaN]) {
		const product = parseOffProduct({ nutriments: {
			'energy-kcal_100g': value, proteins_100g: value, carbohydrates_100g: value,
			fat_100g: value, fiber_100g: value
		} });
		for (const field of ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const) assert.equal(product[field], 0);
	}
	assert.equal(parseOffProduct({}).name, 'Producto sin nombre');
	assert.equal(parseOffProduct({ generic_name: 'Genérico', nutriments: null }).name, 'Genérico');
	assert.equal(parseOffProduct({ product_name: '', generic_name: 'Genérico' }).name, '');
	assert.equal(parseOffProduct({ nutriments: { fat_100g: -1 } }).fat, -1);
});

test('offToFood conserva los cinco campos y omite nutrientes nuevos desconocidos', () => {
	const food = offToFood({ name: 'Anterior', kcal: 120, fat: 4, carbs: 10, fiber: 2, protein: 6 }, '456');
	assert.deepEqual(food, {
		name: 'Anterior', brand: undefined, barcode: '456', base: 100,
		kcal: 120, fat: 4, carbs: 10, fiber: 2, protein: 6, source: 'openfoodfacts',
		imageUrl: undefined, createdAt: food.createdAt
	});
	assert.equal(Number.isFinite(food.createdAt), true);
});

test('cliente mantiene una única consulta, URL, cabecera y manejo de respuestas', async () => {
	const originalFetch = globalThis.fetch;
	const barcode = '0123456789012';
	const payload = { status: 1, product: { product_name: 'Prueba', nutriments: { 'saturated-fat_100g': 0, sugars_100g: 2 } } };
	try {
		for (const scenario of [
			{ ok: true, data: payload, expected: parseOffProduct(payload.product) },
			{ ok: false, data: payload, expected: null },
			{ ok: true, data: { status: 0, product: payload.product }, expected: null },
			{ ok: true, data: { status: 1 }, expected: null }
		]) {
			let calls = 0;
			let jsonCalls = 0;
			globalThis.fetch = async (url, options) => {
				calls++;
				assert.equal(url, `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
				assert.deepEqual(options, { headers: { 'X-User-Agent': 'macrotrack (pet project personal)' } });
				return { ok: scenario.ok, json: async () => { jsonCalls++; return scenario.data; } } as Response;
			};
			assert.deepEqual(await fetchProductByBarcode(barcode), scenario.expected);
			assert.equal(calls, 1);
			assert.equal(jsonCalls, scenario.ok ? 1 : 0);
		}
		let calls = 0;
		const error = new Error('Fallo de red');
		globalThis.fetch = async () => { calls++; throw error; };
		await assert.rejects(fetchProductByBarcode(barcode), (caught) => caught === error);
		assert.equal(calls, 1);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

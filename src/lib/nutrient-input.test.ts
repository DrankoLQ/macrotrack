import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOptionalNutrient } from './nutrient-input.ts';

test('blanco significa desconocido, cero es conocido y se acepta coma decimal', () => {
	for (const input of ['', '  ', '\t\n']) {
		assert.deepEqual(parseOptionalNutrient(input), { ok: true, value: undefined });
	}
	for (const [input, value] of [['0', 0], [' 0 ', 0], ['1,25', 1.25], ['2.5', 2.5], ['1.234,5', 1234.5]] as const) {
		assert.deepEqual(parseOptionalNutrient(input), { ok: true, value });
	}
});

test('rechaza negativos, infinitos, NaN y texto sin número', () => {
	for (const input of ['-1', '-0,1', 'Infinity', '-Infinity', 'NaN', 'abc']) {
		assert.deepEqual(parseOptionalNutrient(input), { ok: false }, input);
	}
});

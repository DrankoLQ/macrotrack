import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartBars, chartGoalY } from './chart.ts';

test('barra de valor 0 mantiene altura mínima', () => {
	const bars = chartBars([0, 100], 100, 'max');
	assert.equal(bars[0].h, 1.5);
	assert.equal(bars[1].h, 92.6);
});

test('un día desconocido deja un hueco, no una barra de consumo cero', () => {
	const bars = chartBars([100, null, 0], 100, 'min');
	assert.equal(bars[1].missing, true);
	assert.equal(bars[1].h, 0);
	assert.equal(bars[1].over, false);
	assert.equal(bars[2].missing, false);
	assert.equal(bars[2].h, 1.5);
	assert.equal(chartGoalY([100, null, 0], 100), 17.4);
});

test('over según dirección del objetivo', () => {
	const bars = chartBars([120, 80], 100, 'max');
	assert.equal(bars[0].over, true);
	assert.equal(bars[1].over, false);
	const min = chartBars([120, 80], 100, 'min');
	assert.equal(min[0].over, false);
	assert.equal(min[1].over, true);
});

test('línea de objetivo escala con el máximo del rango', () => {
	assert.equal(chartGoalY([100], 100), 17.4);
	assert.equal(chartGoalY([200], 100), 63.7);
	assert.equal(chartGoalY([50], 100), 17.4);
});

test('posiciones de barra suman dentro del ancho de vista', () => {
	const bars = chartBars([10, 20, 30], 30, 'max');
	for (const [i, b] of bars.entries()) {
		assert.ok(b.x >= 5 && b.x + b.w <= 305, `barra ${i} fuera de rango`);
	}
	assert.equal(bars[0].cx, 12.9);
});

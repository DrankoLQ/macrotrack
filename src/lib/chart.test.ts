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

test('sin objetivo el gráfico es informativo en ambas direcciones y conserva huecos y cero', () => {
	for (const direction of ['max', 'min'] as const) {
		const bars = chartBars([null, 0, 5], null, direction);
		assert.equal(bars[0].missing, true);
		assert.equal(bars[0].h, 0);
		assert.equal(bars[1].missing, false);
		assert.equal(bars[1].h, 1.5);
		assert.equal(bars[2].h, 92.6);
		assert.equal(bars[2].y, 17.4);
		assert.ok(bars.every((bar) => !bar.over));
		assert.equal(chartGoalY([null, 0, 5], null), null);
	}
});

test('sin objetivo ni valores positivos la escala sigue siendo finita', () => {
	assert.deepEqual(chartBars([null, 0], null, 'max').map(({ h, y, missing, over }) =>
		({ h, y, missing, over })), [
		{ h: 0, y: 110, missing: true, over: false },
		{ h: 1.5, y: 108.5, missing: false, over: false }
	]);
	assert.equal(chartGoalY([null, 0], null), null);
	assert.deepEqual(chartBars([], null, 'min'), []);
	assert.equal(chartGoalY([], null), null);
});

test('el gráfico compara con el máximo sin redondear aunque las alturas coincidan', () => {
	const limit = 2000 * 0.10 / 9;
	const bars = chartBars([limit, limit + 0.001], limit, 'max');
	assert.equal(bars[0].over, false);
	assert.equal(bars[1].over, true);
	assert.equal(bars[0].h, bars[1].h);
	assert.equal(chartGoalY([limit, limit + 0.001], limit), bars[0].y);
});

test('objetivo cero sigue siendo numérico, con línea y comparación max y min', () => {
	assert.deepEqual(chartBars([null, 0, 0.001], 0, 'max').map((bar) => bar.over), [false, false, true]);
	assert.deepEqual(chartBars([null, 0, 0.001], 0, 'min').map((bar) => bar.over), [false, false, false]);
	assert.equal(chartGoalY([null, 0, 0.001], 0), 110);
});

test('posiciones de barra suman dentro del ancho de vista', () => {
	const bars = chartBars([10, 20, 30], 30, 'max');
	for (const [i, b] of bars.entries()) {
		assert.ok(b.x >= 5 && b.x + b.w <= 305, `barra ${i} fuera de rango`);
	}
	assert.equal(bars[0].cx, 12.9);
});

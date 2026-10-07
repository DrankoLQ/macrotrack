import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shiftDate, weekDates, summarizeDays } from './weekly.ts';
import type { NutrientValues } from './macros.ts';

const goals = { kcal: 2200, fat: 73, carbs: 250, fiber: 30, protein: 140 };
const entry = (date: string, kcal: number, protein = 140) => ({
	date, kcal, protein, fat: 70, carbs: 200, fiber: 30
});
const dates = ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'];

test('la semana va de lunes a domingo, también entre meses y años', () => {
	assert.deepEqual(weekDates('2026-09-06'), dates);
	assert.deepEqual(weekDates('2026-08-31'), dates);
	assert.deepEqual(weekDates('2027-01-01'), [
		'2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'
	]);
});

test('desplazar fechas usa días naturales incluso al cambiar de hora', () => {
	assert.equal(shiftDate('2026-03-28', 2), '2026-03-30');
	assert.equal(shiftDate('2026-10-24', 2), '2026-10-26');
	assert.equal(shiftDate('2026-01-01', -1), '2025-12-31');
});

test('seis días completos comparan con seis objetivos, sin margen por el sábado ausente', () => {
	const complete = dates.filter((date) => date !== '2026-09-05');
	const result = summarizeDays(complete.map((date) => entry(date, 2150)), complete, dates, '2026-09-06', goals);
	assert.equal(result.completeCount, 6);
	assert.equal(result.metrics[0].average, 2150);
	assert.equal(result.metrics[0].total, 12900);
	assert.equal(result.metrics[0].target, 13200);
	assert.equal(result.days[5].status, 'empty');
	assert.equal(result.days[5].totals, null);
});

test('balance y cumplimiento diario son distintos; entradas parciales y ajenas quedan fuera', () => {
	const entries = [entry(dates[0], 2300, 100), entry(dates[1], 1000, 100), entry(dates[1], 1100, 80),
		entry(dates[2], 500), entry('2026-08-30', 9999)];
	const result = summarizeDays(entries, [dates[0], dates[1]], dates, '2026-09-06', goals);
	assert.equal(result.metrics[0].average, 2200);
	assert.equal(result.metrics[0].compliance, 50);
	assert.equal(result.metrics[0].withinGoal, true);
	const protein = result.metrics.find((metric) => metric.key === 'protein')!;
	assert.equal(protein.average, 140);
	assert.equal(protein.compliance, 50);
	assert.equal(protein.withinGoal, true);
	assert.equal(result.days[2].status, 'partial');
	assert.equal(result.days[2].totals?.kcal, 500);
});

test('histórico sin confirmar no genera medias ni cumplimiento cero', () => {
	const result = summarizeDays([entry(dates[0], 2000)], [], dates, '2026-09-06', goals);
	assert.equal(result.completeCount, 0);
	assert.equal(result.metrics[0].average, null);
	assert.equal(result.metrics[0].compliance, null);
	assert.equal(result.metrics[0].withinGoal, null);
	assert.equal(result.days[0].status, 'partial');
});

test('futuros y días sin entradas nunca cuentan, aunque exista una confirmación', () => {
	const result = summarizeDays([entry(dates[0], 0), entry(dates[6], 9000)], dates, dates, dates[0], goals);
	assert.equal(result.completeCount, 1);
	assert.equal(result.metrics[0].average, 0);
	assert.equal(result.days[1].status, 'future');
	assert.equal(result.days[6].totals, null);
	const empty = summarizeDays([], dates, dates, '2026-09-06', goals);
	assert.equal(empty.completeCount, 0);
	assert.equal(empty.days[0].totals, null);
});

test('cada nutriente tiene su denominador y conserva las cinco métricas originales', () => {
	const entries = [
		{ ...entry(dates[0], 2000), saturatedFat: 20, sugars: 5 },
		{ ...entry(dates[1], 2000), saturatedFat: 10 },
		entry(dates[2], 2000)
	];
	const result = summarizeDays(entries, dates.slice(0, 3), dates, dates[3], goals);
	assert.deepEqual(result.subMetrics, {
		saturatedFat: { average: 15, eligibleCount: 2, completeCount: 3,
			limit: goals.kcal * 0.10 / 9, compliance: 100, withinLimitCount: 2 },
		sugars: { average: 5, eligibleCount: 1, completeCount: 3 }
	});
	assert.equal(result.days[3].totals, null);
	assert.equal(result.days[4].totals, null);
	const old = summarizeDays(entries.map(({ date, kcal, fat, carbs, fiber, protein }) =>
		({ date, kcal, fat, carbs, fiber, protein })), dates.slice(0, 3), dates, dates[3], goals);
	assert.deepEqual(result.metrics, old.metrics);
	assert.deepEqual(result.metrics.map((metric) => metric.key), ['kcal', 'fat', 'carbs', 'fiber', 'protein']);
	assert.equal(result.completeCount, old.completeCount);
});

test('una entrada desconocida entre varias solo invalida su nutriente y permite completitud inversa', () => {
	const entries = [
		{ ...entry(dates[0], 100), saturatedFat: 1, sugars: 2 },
		{ ...entry(dates[0], 200), sugars: 3 },
		{ ...entry(dates[0], 300), saturatedFat: 4, sugars: 5 },
		{ ...entry(dates[1], 400), saturatedFat: 6 }
	];
	const result = summarizeDays(entries, dates.slice(0, 2), dates, dates[6], goals);
	assert.equal(result.days[0].totals?.kcal, 600);
	assert.equal(result.days[0].totals?.saturatedFat, null);
	assert.equal(result.days[0].totals?.sugars, 10);
	assert.equal(result.days[1].totals?.saturatedFat, 6);
	assert.equal(result.days[1].totals?.sugars, null);
	assert.equal(result.subMetrics.saturatedFat.average, 6);
	assert.equal(result.subMetrics.sugars.average, 10);
	assert.equal(result.subMetrics.saturatedFat.eligibleCount, 1);
	assert.equal(result.subMetrics.sugars.eligibleCount, 1);
	assert.equal(result.subMetrics.saturatedFat.completeCount, 2);
	assert.equal(result.subMetrics.sugars.completeCount, 2);
});

test('parciales conocidos conservan datos para el gráfico pero no medias; futuros y vacíos no cuentan', () => {
	const entries = [
		{ ...entry(dates[0], 0), saturatedFat: 0, sugars: 0 },
		{ ...entry(dates[1], 100), saturatedFat: 99, sugars: 88 },
		{ ...entry(dates[6], 9000), saturatedFat: 77, sugars: 66 }
	];
	const result = summarizeDays(entries, [dates[0], dates[2], dates[6]], dates, dates[3], goals);
	assert.deepEqual(result.days.map((day) => day.status),
		['complete', 'partial', 'empty', 'empty', 'future', 'future', 'future']);
	assert.equal(result.days[1].totals?.saturatedFat, 99);
	assert.equal(result.days[1].totals?.sugars, 88);
	assert.equal(result.days[2].totals, null);
	assert.equal(result.days[6].totals, null);
	assert.equal(result.completeCount, 1);
	assert.deepEqual(result.subMetrics, {
		saturatedFat: { average: 0, eligibleCount: 1, completeCount: 1,
			limit: goals.kcal * 0.10 / 9, compliance: 100, withinLimitCount: 1 },
		sugars: { average: 0, eligibleCount: 1, completeCount: 1 }
	});
});

test('sin elegibles la media y cumplimiento son nulos, no ceros ni objetivos de azúcar', () => {
	const cases: { entries: (NutrientValues & { date: string })[]; confirmed: string[]; count: number }[] = [
		{ entries: [entry(dates[0], 100)], confirmed: [dates[0]], count: 1 },
		{ entries: [{ ...entry(dates[0], 100), saturatedFat: 2, sugars: 3 }], confirmed: [], count: 0 },
		{ entries: [], confirmed: dates, count: 0 }
	];
	for (const { entries, confirmed, count } of cases) {
		const result = summarizeDays(entries, confirmed, dates, dates[6], goals);
		assert.deepEqual(result.subMetrics, {
			saturatedFat: { average: null, eligibleCount: 0, completeCount: count,
				limit: goals.kcal * 0.10 / 9, compliance: null, withinLimitCount: 0 },
			sugars: { average: null, eligibleCount: 0, completeCount: count }
		});
	}
});

test('saturadas compara igualdad y exceso con el máximo sin redondear y redondea solo el porcentaje', () => {
	const effectiveGoals = { ...goals, kcal: 2000 };
	const limit = effectiveGoals.kcal * 0.10 / 9;
	const entries = [limit, limit + 0.001, 0].map((saturatedFat, i) =>
		({ ...entry(dates[i], 100), saturatedFat }));
	const result = summarizeDays(entries, dates.slice(0, 3), dates, dates[6], effectiveGoals);
	assert.equal(result.subMetrics.saturatedFat.limit, limit);
	assert.equal(result.subMetrics.saturatedFat.average, (limit + (limit + 0.001)) / 3);
	assert.equal(result.subMetrics.saturatedFat.withinLimitCount, 2);
	assert.equal(result.subMetrics.saturatedFat.compliance, 67);
	assert.equal(result.subMetrics.sugars.eligibleCount, 0);
});

test('confirmar, editar y desmarcar cambia el balance sin inferir completitud por comidas', () => {
	const entries = [entry(dates[0], 2000)];
	assert.equal(summarizeDays(entries, [], dates, dates[6], goals).completeCount, 0);
	assert.equal(summarizeDays(entries, [dates[0]], dates, dates[6], goals).completeCount, 1);
	entries[0].kcal = 2400;
	const edited = summarizeDays(entries, [dates[0]], dates, dates[6], goals);
	assert.equal(edited.completeCount, 1);
	assert.equal(edited.metrics[0].average, 2400);
	assert.equal(summarizeDays(entries, [], dates, dates[6], goals).completeCount, 0);
});

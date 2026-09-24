import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shiftDate, weekDates, summarizeDays } from './weekly.ts';

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

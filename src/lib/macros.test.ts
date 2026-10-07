import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	foodAtGrams,
	scaleTotals,
	sumTotals,
	sumConsumption,
	snapshotTotals,
	saturatedFatLimit,
	computeGoals,
	computeGoalsBreakdown,
	MACROS
} from './macros.ts';
import { fold, fmt } from './format.ts';

const FOOD = { base: 100, kcal: 270, protein: 20, carbs: 25, fat: 10, fiber: 5 }; // 20*4+25*4+10*9 = 270

test('foodAtGrams escala linealmente', () => {
	const half = foodAtGrams(FOOD, 50);
	assert.equal(half.kcal, 135);
	assert.equal(half.protein, 10);
	assert.equal(half.carbs, 12.5);
	assert.equal(half.fat, 5);
	assert.equal(half.fiber, 2.5);
	const triple = foodAtGrams(FOOD, 300);
	assert.equal(triple.kcal, 810);
	assert.equal(triple.protein, 60);
});

test('foodAtGrams mantiene coherencia calórica (kcal ≈ 4p + 4c + 9f)', () => {
	const t = foodAtGrams(FOOD, 137);
	const calc = t.protein * 4 + t.carbs * 4 + t.fat * 9;
	assert.ok(Math.abs(t.kcal - calc) < 0.001, `kcal ${t.kcal} vs ${calc}`);
});

test('sumTotales agrega por clave', () => {
	const entries = [
		{ kcal: 100, protein: 10, carbs: 5, fat: 4, fiber: 1 },
		{ kcal: 270, protein: 20, carbs: 25, fat: 10, fiber: 5 },
		{ kcal: 50, protein: 5, carbs: 3, fat: 2, fiber: 0 }
	];
	assert.equal(sumTotals(entries, 'kcal'), 420);
	assert.equal(sumTotals(entries, 'protein'), 35);
	assert.equal(sumTotals(entries, 'carbs'), 33);
	assert.equal(sumTotals(entries, 'fat'), 16);
	assert.equal(sumTotals(entries, 'fiber'), 6);
});

test('sumTotals ignora claves ausentes', () => {
	assert.equal(sumTotals([{ kcal: 100 }, {}], 'protein'), 0);
	assert.equal(sumTotals([], 'kcal'), 0);
});

test('scaleTotals dobla gramos => dobla macros', () => {
	const scaled = scaleTotals(FOOD, 200, 100);
	assert.equal(scaled.kcal, 540);
	assert.equal(scaled.protein, 40);
	assert.equal(scaled.fat, 20);
});

test('scaleTotals con prevGrams 0 devuelve 0', () => {
	const scaled = scaleTotals(FOOD, 100, 0);
	assert.equal(scaled.kcal, 0);
	assert.equal(scaled.protein, 0);
});

test('cero conocido y ausencia sobreviven al escalado sin añadir propiedades desconocidas', () => {
	const half = foodAtGrams({ ...FOOD, saturatedFat: 0 }, 50);
	assert.deepEqual(half, {
		kcal: 135, protein: 10, carbs: 12.5, fat: 5, fiber: 2.5, saturatedFat: 0
	});
	assert.equal('sugars' in half, false);
	assert.deepEqual(scaleTotals(half, 100, 50), {
		kcal: 270, protein: 20, carbs: 25, fat: 10, fiber: 5, saturatedFat: 0
	});
	const sugarOnly = foodAtGrams({ ...FOOD, sugars: 0 }, 50);
	assert.equal(sugarOnly.sugars, 0);
	assert.equal('saturatedFat' in sugarOnly, false);
});

test('ambos subnutrientes se escalan sobre la base sin sumar calorías', () => {
	const enriched = { ...FOOD, base: 40, saturatedFat: 2, sugars: 7 };
	const scaled = foodAtGrams(enriched, 60);
	assert.deepEqual(scaled, {
		kcal: 405, protein: 30, carbs: 37.5, fat: 15, fiber: 7.5,
		saturatedFat: 3, sugars: 10.5
	});
	const { saturatedFat, sugars, ...old } = scaled;
	assert.deepEqual(old, foodAtGrams({ ...FOOD, base: 40 }, 60));
	assert.equal(saturatedFat, 3);
	assert.equal(sugars, 10.5);
	assert.deepEqual(scaleTotals(scaled, 20, 60), {
		kcal: 135, protein: 10, carbs: 12.5, fat: 5, fiber: 2.5,
		saturatedFat: 1, sugars: 3.5
	});
});

test('gramos cero y prevGrams cero conservan ausencia y el comportamiento anterior', () => {
	const zero = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugars: 0 };
	assert.deepEqual(foodAtGrams({ ...FOOD, sugars: 7 }, 0), zero);
	assert.deepEqual(scaleTotals({ ...FOOD, sugars: 7 }, 100, 0), zero);
	assert.deepEqual(scaleTotals({ ...FOOD, saturatedFat: 0 }, 100, 0), {
		kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, saturatedFat: 0
	});
});

test('sumConsumption suma conocidos y mantiene las cinco sumas anteriores', () => {
	const entries = [
		foodAtGrams({ ...FOOD, saturatedFat: 2, sugars: 7 }, 50),
		foodAtGrams({ ...FOOD, saturatedFat: 4, sugars: 3 }, 100)
	];
	const total = sumConsumption(entries);
	assert.deepEqual(total, {
		kcal: 405, protein: 30, carbs: 37.5, fat: 15, fiber: 7.5,
		saturatedFat: 5, sugars: 6.5
	});
	for (const { key } of MACROS) assert.equal(total[key], sumTotals(entries, key));
});

test('la incompletitud es independiente y no depende del orden de las entradas', () => {
	const known = { ...FOOD, saturatedFat: 2, sugars: 7 };
	for (const reverse of [false, true]) {
		const missingFat = [known, { ...FOOD, sugars: 3 }];
		const missingSugar = [known, { ...FOOD, saturatedFat: 4 }];
		if (reverse) {
			missingFat.reverse();
			missingSugar.reverse();
		}
		assert.equal(sumConsumption(missingFat).saturatedFat, null);
		assert.equal(sumConsumption(missingFat).sugars, 10);
		assert.equal(sumConsumption(missingSugar).saturatedFat, 6);
		assert.equal(sumConsumption(missingSugar).sugars, null);
	}
	const old = sumConsumption([FOOD]);
	assert.equal(old.saturatedFat, null);
	assert.equal(old.sugars, null);
});

test('cero conocido no se confunde con ausente en el agregado', () => {
	const knownZero = { ...FOOD, saturatedFat: 0, sugars: 0 };
	assert.equal(sumConsumption([knownZero, knownZero]).saturatedFat, 0);
	assert.equal(sumConsumption([knownZero, knownZero]).sugars, 0);
	assert.equal(sumConsumption([knownZero, FOOD]).saturatedFat, null);
	assert.equal(sumConsumption([knownZero, FOOD]).sugars, null);
});

test('el agregado vacío es cero aritmético, sin estado de confirmación de día', () => {
	assert.deepEqual(sumConsumption([]), {
		kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, saturatedFat: 0, sugars: 0
	});
});

test('snapshotTotals omite null pero conserva cero y las cinco métricas', () => {
	const old = { kcal: 270, protein: 20, carbs: 25, fat: 10, fiber: 5 };
	assert.deepEqual(snapshotTotals({ ...old, saturatedFat: null, sugars: 0 }), {
		...old, sugars: 0
	});
	assert.deepEqual(snapshotTotals({ ...old, saturatedFat: 0, sugars: null }), {
		...old, saturatedFat: 0
	});
	assert.deepEqual(snapshotTotals({ ...old, saturatedFat: null, sugars: null }), old);
	assert.deepEqual(snapshotTotals({ ...old, saturatedFat: 2, sugars: 7 }), {
		...old, saturatedFat: 2, sugars: 7
	});
});

test('un agregado de ingredientes incompleto se convierte y escala como porción de receta', () => {
	const ingredients = [
		foodAtGrams({ ...FOOD, saturatedFat: 2, sugars: 7 }, 50),
		foodAtGrams({ ...FOOD, sugars: 3 }, 100)
	];
	const total = sumConsumption(ingredients);
	const snapshot = snapshotTotals(total);
	assert.equal('saturatedFat' in snapshot, false);
	assert.equal(snapshot.sugars, 6.5);
	assert.deepEqual(foodAtGrams({ ...snapshot, base: 150 }, 75), {
		kcal: 202.5, protein: 15, carbs: 18.75, fat: 7.5, fiber: 3.75, sugars: 3.25
	});
	assert.deepEqual(scaleTotals(snapshot, 75, 150), foodAtGrams({ ...snapshot, base: 150 }, 75));
	assert.deepEqual(total, { ...snapshot, saturatedFat: null });
});

test('el máximo usa kcal antiguas o recalculadas y compara cantidades sin redondear', () => {
	const oldGoals = JSON.parse('{"kcal":2000,"fat":60,"carbs":250,"fiber":30,"protein":100}');
	const limit = saturatedFatLimit(oldGoals.kcal);
	assert.equal(limit, 2000 * 0.10 / 9);
	assert.equal(fmt(limit, 1), '22,2');
	const equal = sumConsumption([{ ...FOOD, saturatedFat: limit }]);
	const above = sumConsumption([{ ...FOOD, saturatedFat: limit + 0.001 }]);
	assert.equal(equal.saturatedFat! <= limit, true);
	assert.equal(above.saturatedFat! <= limit, false);
	assert.equal(fmt(above.saturatedFat!, 1), fmt(equal.saturatedFat!, 1));
	assert.equal(saturatedFatLimit(1800), 20);
	assert.equal(saturatedFatLimit(0), 0);
	const goals = computeGoals({
		height: 180, weight: 80, age: 30, sex: 'male', activity: 'moderate', goal: 'recomp'
	});
	assert.deepEqual(goals, { kcal: 2623, protein: 168, carbs: 326, fat: 72, fiber: 30 });
	assert.equal(saturatedFatLimit(goals.kcal), 2623 * 0.10 / 9);
	assert.deepEqual(MACROS.map(({ key }) => key), ['kcal', 'fat', 'carbs', 'fiber', 'protein']);
	assert.deepEqual(computeGoalsBreakdown({
		height: 165, weight: 60, age: 40, sex: 'female', activity: 'sedentary', goal: 'maintain'
	}), {
		tmb: 1340.8999999999999, tdee: 1609.0799999999997, activityFactor: 1.2, adjustment: 0,
		totals: { kcal: 1609, protein: 126, carbs: 155, fat: 54, fiber: 30 }
	});
});

test('fold ignora tildes y mayúsculas', () => {
	assert.equal(fold('Garbánzos Cocídos ÁÉÍÓÚÑ'), 'garbanzos cocidos aeioun');
	assert.equal(fold('Patata'), 'patata');
	assert.equal(fold('café con leche').includes('cafe'), true);
});
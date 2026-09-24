import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGoals, dayGoals } from './macros.ts';

test('computeGoals hombre moderado/recomp: TMB 1695.667 → 2378 kcal', () => {
	const g = computeGoals({ height: 175, weight: 70, age: 30, sex: 'male', activity: 'moderate', goal: 'recomp' });
	assert.equal(g.kcal, 2378);
	assert.equal(g.protein, 147); // 70 * 2.1
	assert.equal(g.fat, 63); // 70 * 0.9
	assert.equal(g.carbs, 306);
	assert.equal(g.fiber, 30);
	assert.ok(Math.abs(g.kcal - (g.protein * 4 + g.carbs * 4 + g.fat * 9)) <= 2, 'kcal coherente con macros');
});

test('computeGoals mujer sedentaria/mantener: TMB 1405.85 → 1687 kcal', () => {
	const g = computeGoals({ height: 165, weight: 60, age: 25, sex: 'female', activity: 'sedentary', goal: 'maintain' });
	assert.equal(g.kcal, 1687);
	assert.equal(g.protein, 126);
	assert.equal(g.fat, 54);
	assert.equal(g.carbs, 174);
});

test('computeGoals ajustes de objetivo: gain − lose = 650 kcal', () => {
	const base = { height: 180, weight: 80, age: 30, sex: 'male', activity: 'active' } as const;
	const gain = computeGoals({ ...base, goal: 'gain' });
	const lose = computeGoals({ ...base, goal: 'lose' });
	assert.equal(gain.kcal - lose.kcal, 650);
});

test('computeGoals actividad alta da más kcal que sedentaria', () => {
	const base = { height: 170, weight: 70, age: 30, sex: 'male', goal: 'maintain' } as const;
	const active = computeGoals({ ...base, activity: 'active' });
	const sedentary = computeGoals({ ...base, activity: 'sedentary' });
	assert.ok(active.kcal > sedentary.kcal);
});

test('computeGoals carbs nunca negativo', () => {
	const g = computeGoals({ height: 150, weight: 250, age: 90, sex: 'female', activity: 'sedentary', goal: 'lose' });
	assert.ok(g.carbs >= 0);
});
test('dayGoals: en déficit, reparto entreno/descanso del prompt (88,6 kg → 2490/1850)', () => {
	// TMB ≈ 1865 (175 cm, 44 años): entreno = TMB × 1,55 − 400, descanso = TMB × 1,2 − 400
	const p = { height: 175, weight: 88.6, age: 44, sex: 'male', activity: 'moderate', goal: 'lose' } as const;
	const training = computeGoals(p);
	const rest = dayGoals(training, p, false);
	assert.ok(Math.abs(training.kcal - 2490) <= 15, `entreno ${training.kcal}`);
	assert.ok(Math.abs(rest.kcal - 1850) <= 15, `descanso ${rest.kcal}`);
	assert.equal(training.protein, 186);
	assert.equal(training.fat, 80);
	assert.equal(rest.protein, 186);
	assert.equal(rest.fat, 53);
	assert.equal(rest.fiber, 30);
	assert.equal(dayGoals(training, p, true), training);
	assert.equal(dayGoals(training, { ...p, goal: 'maintain' }, false), training);
	assert.equal(dayGoals(training, { ...p, activity: 'sedentary' }, false), training);
	assert.equal(dayGoals(training, null, false), training);
});

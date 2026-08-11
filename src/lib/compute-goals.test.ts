import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGoals } from './macros.ts';

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
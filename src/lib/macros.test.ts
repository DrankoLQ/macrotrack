import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foodAtGrams, scaleTotals, sumTotals } from './macros.ts';
import { fold } from './format.ts';

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

test('fold ignora tildes y mayúsculas', () => {
	assert.equal(fold('Garbánzos Cocídos ÁÉÍÓÚÑ'), 'garbanzos cocidos aeioun');
	assert.equal(fold('Patata'), 'patata');
	assert.equal(fold('café con leche').includes('cafe'), true);
});
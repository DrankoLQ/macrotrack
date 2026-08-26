import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortFavoritesFirst } from './favorites.ts';

const food = (name: string, favorite?: boolean) => ({ id: 1, name, base: 100, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, source: 'manual' as const, createdAt: 0, favorite });

test('sortFavoritesFirst pone los favoritos primero', () => {
	const sorted = sortFavoritesFirst([food('A'), food('B', true), food('C')]);
	assert.deepEqual(
		sorted.map((f) => f.name),
		['B', 'A', 'C']
	);
});

test('sortFavoritesFirst conserva el orden relativo dentro de cada grupo', () => {
	const sorted = sortFavoritesFirst([
		food('C'),
		food('B', true),
		food('A'),
		food('D', true)
	]);
	assert.deepEqual(
		sorted.map((f) => f.name),
		['B', 'D', 'C', 'A']
	);
});

test('sortFavoritesFirst no muta la lista original', () => {
	const original = [food('A'), food('B', true)];
	const sorted = sortFavoritesFirst(original);
	assert.notEqual(sorted, original);
	assert.deepEqual(
		original.map((f) => f.name),
		['A', 'B']
	);
});

test('sortFavoritesFirst con lista sin favoritos devuelve copia igual', () => {
	const original = [food('B'), food('A')];
	const sorted = sortFavoritesFirst(original);
	assert.deepEqual(
		sorted.map((f) => f.name),
		['B', 'A']
	);
});

test('sortFavoritesFirst trata favorite undefined como no favorito', () => {
	const sorted = sortFavoritesFirst([{ ...food('A'), favorite: undefined }, food('B', true)]);
	assert.deepEqual(
		sorted.map((f) => f.name),
		['B', 'A']
	);
});

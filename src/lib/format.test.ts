import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toNumber } from './format.ts';

test('toNumber acepta coma y punto decimal', () => {
	assert.equal(toNumber('70,9'), 70.9);
	assert.equal(toNumber('70.9'), 70.9);
	assert.equal(toNumber('1.234,5'), 1234.5);
	assert.equal(toNumber(''), NaN);
	assert.equal(toNumber('abc'), NaN);
});
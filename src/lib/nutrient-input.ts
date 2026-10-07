import { toNumber } from './format.ts';

export type OptionalInput = { ok: true; value: number | undefined } | { ok: false };

export function parseOptionalNutrient(input: string): OptionalInput {
	if (input.trim() === '') return { ok: true, value: undefined };
	const value = toNumber(input);
	return Number.isFinite(value) && value >= 0 ? { ok: true, value } : { ok: false };
}

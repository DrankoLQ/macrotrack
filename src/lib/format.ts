export function round(value: number, digits = 1): number {
	return Math.round(value * 10 ** digits) / 10 ** digits;
}

export function fmt(value: number, digits = 1): string {
	return Number.isInteger(value) ? String(value) : String(round(value, digits));
}

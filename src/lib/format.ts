export function round(value: number, digits = 1): number {
	return Math.round(value * 10 ** digits) / 10 ** digits;
}

export function fmt(value: number, digits = 1): string {
	return Number.isInteger(value) ? String(value) : String(round(value, digits));
}

export function fold(s: string): string {
	return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function toNumber(value: string): number {
	const s = String(value).trim();
	const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
	const n = parseFloat(normalized);
	return Number.isNaN(n) ? NaN : n;
}

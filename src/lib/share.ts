import type { Recipe, RecipeItem } from './db';

/** Una receta viaja entera dentro del enlace (`/foods#r=…`): no hay servidor donde guardarla.
 *  Formato compacto por tamaño de QR: [nombre, g, kcal, prot, carbs, grasa, fibra, uds?, saturadas?, azúcares?].
 *  null reserva posiciones desconocidas; los snapshots omiten esos nutrientes. */
type Packed = [string, number, number, number, number, number, number, (number | null)?, (number | null)?, (number | null)?];

// ponytail: sin comprimir; 20 ingredientes ≈ 1,4 KB y el QR admite 2,9 KB.
// Si alguien encadena recetas gigantes, comprimir con CompressionStream('deflate-raw').
const MAX_ITEMS = 50;

const round = (n: number) => Math.round(n * 100) / 100;

function packNutrient(value: unknown): number | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		throw new Error('Cantidad de nutriente inválida');
	}
	// Evita desbordar al redondear números finitos muy grandes.
	return value > Number.MAX_VALUE / 100 ? value : round(value);
}

function toBase64Url(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): string {
	const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
	return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function encodeRecipe(recipe: Pick<Recipe, 'name' | 'items'>): string {
	const packed: (string | Packed[])[] = [
		recipe.name,
		recipe.items.map((i): Packed => {
			const base = [i.name, round(i.grams), round(i.kcal), round(i.protein), round(i.carbs), round(i.fat), round(i.fiber)] as const;
			const saturatedFat = packNutrient(i.saturatedFat);
			const sugars = packNutrient(i.sugars);
			if (saturatedFat === null && sugars === null) {
				return i.units !== undefined ? [...base, round(i.units)] : [...base];
			}
			return [...base, i.units === undefined ? null : round(i.units), saturatedFat, sugars];
		})
	];
	return toBase64Url(JSON.stringify(packed));
}

/** Acepta el enlace completo o solo el dato; devuelve null si no es una receta válida. */
export function decodeRecipe(input: string): Pick<Recipe, 'name' | 'items'> | null {
	const data = input.includes('r=') ? input.slice(input.lastIndexOf('r=') + 2) : input;
	try {
		const parsed = JSON.parse(fromBase64Url(data.trim()));
		if (!Array.isArray(parsed)) return null;
		const [name, items] = parsed;
		if (typeof name !== 'string' || !name.trim() || !Array.isArray(items)) return null;
		if (items.length === 0 || items.length > MAX_ITEMS) return null;
		const mapped: RecipeItem[] = [];
		for (const item of items) {
			if (!Array.isArray(item) || typeof item[0] !== 'string' || !item[0].trim()) return null;
			const [, grams, kcal, protein, carbs, fat, fiber, units, saturatedFat, sugars] = item;
			const numbers = [grams, kcal, protein, carbs, fat, fiber];
			if (numbers.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) return null;
			if (units != null && (typeof units !== 'number' || !Number.isFinite(units) || units <= 0)) return null;
			if ([saturatedFat, sugars].some((n) => n != null && (typeof n !== 'number' || !Number.isFinite(n) || n < 0))) return null;
			mapped.push({
				name: item[0].trim().slice(0, 120), grams, kcal, protein, carbs, fat, fiber,
				units: units ?? undefined,
				...(saturatedFat != null ? { saturatedFat } : {}),
				...(sugars != null ? { sugars } : {})
			});
		}
		return { name: name.trim().slice(0, 120), items: mapped };
	} catch {
		return null;
	}
}

export function recipeShareUrl(recipe: Pick<Recipe, 'name' | 'items'>, origin: string): string {
	return `${origin}/foods#r=${encodeRecipe(recipe)}`;
}

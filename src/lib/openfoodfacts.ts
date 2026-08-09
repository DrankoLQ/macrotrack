import type { Food } from './db';

export interface OffProduct {
	name: string;
	brand?: string;
	imageUrl?: string;
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
}

function toNumber(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function fetchProductByBarcode(barcode: string): Promise<OffProduct | null> {
	const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
		headers: { 'X-User-Agent': 'macrotrack (pet project personal)' }
	});
	if (!res.ok) return null;
	const data = await res.json();
	if (data.status !== 1 || !data.product) return null;
	const product = data.product;
	const nutriments = product.nutriments ?? {};
	return {
		name: product.product_name ?? product.generic_name ?? 'Producto sin nombre',
		brand: product.brands,
		imageUrl: product.image_front_small_url,
		kcal: toNumber(nutriments['energy-kcal_100g']),
		protein: toNumber(nutriments.proteins_100g),
		carbs: toNumber(nutriments.carbohydrates_100g),
		fat: toNumber(nutriments.fat_100g),
		fiber: toNumber(nutriments.fiber_100g)
	};
}

export interface OffSearchResult {
	barcode?: string;
	name: string;
	brand?: string;
	imageUrl?: string;
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
	hasNutriments: boolean;
}

export async function searchProducts(query: string): Promise<OffSearchResult[]> {
	const params = new URLSearchParams({
		search_terms: query,
		search_simple: '1',
		action: 'process',
		json: '1',
		page_size: '10',
		fields: 'code,product_name,brands,nutriments,image_front_small_url'
	});
	const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
		headers: { 'X-User-Agent': 'macrotrack (pet project personal)' }
	});
	if (!res.ok) {
		const hint = res.status === 429 || res.status === 503 ? ' (límite de peticiones, espera un minuto)' : '';
		throw new Error(`OpenFoodFacts respondió ${res.status}${hint}`);
	}
	const data = await res.json();
	if (!Array.isArray(data.products)) return [];
	return data.products
		.map((product: Record<string, unknown>) => {
			const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
			const name = String(product.product_name ?? '').trim();
			if (!name) return null;
			return {
				barcode: product.code ? String(product.code) : undefined,
				name,
				brand: product.brands ? String(product.brands) : undefined,
				imageUrl: product.image_front_small_url ? String(product.image_front_small_url) : undefined,
				kcal: toNumber(nutriments['energy-kcal_100g']),
				protein: toNumber(nutriments.proteins_100g),
				carbs: toNumber(nutriments.carbohydrates_100g),
				fat: toNumber(nutriments.fat_100g),
				fiber: toNumber(nutriments.fiber_100g),
				hasNutriments:
					toNumber(nutriments['energy-kcal_100g']) > 0 ||
					toNumber(nutriments.proteins_100g) > 0 ||
					toNumber(nutriments.carbohydrates_100g) > 0 ||
					toNumber(nutriments.fat_100g) > 0 ||
					toNumber(nutriments.fiber_100g) > 0
			};
		})
		.filter((product: OffSearchResult | null): product is OffSearchResult => product !== null);
}

export function offToFood(product: OffProduct, barcode: string): Omit<Food, 'id'> {
	return {
		name: product.name,
		brand: product.brand,
		barcode,
		base: 100,
		kcal: product.kcal,
		protein: product.protein,
		carbs: product.carbs,
		fat: product.fat,
		fiber: product.fiber,
		source: 'openfoodfacts',
		imageUrl: product.imageUrl,
		createdAt: Date.now()
	};
}

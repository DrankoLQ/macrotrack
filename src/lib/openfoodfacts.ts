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

const SEARCH_HOSTS = ['https://es.openfoodfacts.org', 'https://world.openfoodfacts.org'];

function searchUrl(host: string, query: string): string {
	const params = new URLSearchParams({
		search_terms: query,
		search_simple: '1',
		action: 'process',
		json: '1',
		page_size: '10',
		fields: 'code,product_name,brands,nutriments,image_front_small_url'
	});
	return `${host}/cgi/search.pl?${params}`;
}

function toSearchResult(product: Record<string, unknown>): OffSearchResult | null {
	const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
	const name = String(product.product_name ?? '').trim();
	if (!name) return null;
	const kcal = toNumber(nutriments['energy-kcal_100g']);
	const protein = toNumber(nutriments.proteins_100g);
	const carbs = toNumber(nutriments.carbohydrates_100g);
	const fat = toNumber(nutriments.fat_100g);
	const fiber = toNumber(nutriments.fiber_100g);
	return {
		barcode: product.code ? String(product.code) : undefined,
		name,
		brand: product.brands ? String(product.brands) : undefined,
		imageUrl: product.image_front_small_url ? String(product.image_front_small_url) : undefined,
		kcal,
		protein,
		carbs,
		fat,
		fiber,
		hasNutriments: kcal > 0 || protein > 0 || carbs > 0 || fat > 0 || fiber > 0
	};
}

export async function searchProducts(query: string): Promise<OffSearchResult[]> {
	const attempts = [...SEARCH_HOSTS, ...SEARCH_HOSTS];
	let lastError = '';
	for (const host of attempts) {
		try {
			const res = await fetch(searchUrl(host, query), {
				headers: { 'X-User-Agent': 'macrotrack (pet project personal)' }
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			if (!Array.isArray(data.products)) throw new Error('respuesta inesperada');
			return data.products
				.map((product: unknown) => toSearchResult(product as Record<string, unknown>))
				.filter((product: OffSearchResult | null): product is OffSearchResult => product !== null);
		} catch (error) {
			lastError = error instanceof Error ? error.message : 'Error de red';
		}
	}
	throw new Error(`No se pudo buscar en OpenFoodFacts (${lastError}). Inténtalo de nuevo en un momento.`);
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

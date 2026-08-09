export interface UsdaSearchResult {
	barcode?: string;
	name: string;
	brand?: string;
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
	hasNutriments: boolean;
	source: 'usda';
}

const ENERGY_KCAL = 1008;
const PROTEIN = 1003;
const CARBS = 1005;
const FAT = 1004;
const FIBER = 1079;

export async function searchUsda(query: string, apiKey: string): Promise<UsdaSearchResult[]> {
	const params = new URLSearchParams({
		api_key: apiKey,
		query,
		pageSize: '10',
		dataType: 'SR Legacy,Foundation,Branded',
		requireAllWords: 'true'
	});
	const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`, {
		headers: { 'X-User-Agent': 'macrotrack (pet project personal)' }
	});
	if (!res.ok) throw new Error(`USDA respondió ${res.status}`);
	const data = await res.json();
	if (!Array.isArray(data.foods)) throw new Error('respuesta inesperada de USDA');
	return data.foods
		.map((food: Record<string, unknown>) => {
			const byId: Record<number, number> = {};
			const items = (food.foodNutrients ?? []) as Array<Record<string, unknown>>;
			for (const item of items) {
				const nutrient = item.nutrient as Record<string, unknown> | undefined;
				const id = Number(nutrient?.id);
				if (Number.isFinite(id) && typeof item.amount === 'number') {
					byId[id] = item.amount;
				}
			}
			const name = String(food.description ?? '').trim();
			if (!name) return null;
			const kcal = byId[ENERGY_KCAL] ?? 0;
			const protein = byId[PROTEIN] ?? 0;
			const carbs = byId[CARBS] ?? 0;
			const fat = byId[FAT] ?? 0;
			const fiber = byId[FIBER] ?? 0;
			return {
				barcode: food.gtinUpc ? String(food.gtinUpc) : undefined,
				name,
				brand: food.brandOwner ? String(food.brandOwner) : undefined,
				kcal,
				protein,
				carbs,
				fat,
				fiber,
				hasNutriments: kcal > 0 || protein > 0 || carbs > 0 || fat > 0 || fiber > 0,
				source: 'usda' as const
			};
		})
		.filter((result: UsdaSearchResult | null): result is UsdaSearchResult => result !== null);
}

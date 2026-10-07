import type { ChartDirection } from './chart';

export interface Totals {
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
}

export type OptionalNutrients = { saturatedFat?: number; sugars?: number };

export type NutrientValues = Totals & OptionalNutrients;

export type ConsumptionTotals = Totals & {
	saturatedFat: number | null;
	sugars: number | null;
};

export type SubNutrientKey = 'saturatedFat' | 'sugars';

/** Orden canónico de visualización de macros en toda la app: Calorías, Grasas, Hidratos, Fibra, Proteína. */
export const MACROS = [
	{ key: 'kcal', label: 'Calorías', unit: 'kcal', direction: 'max' },
	{ key: 'fat', label: 'Grasas', unit: 'g', direction: 'max' },
	{ key: 'carbs', label: 'Hidratos', unit: 'g', direction: 'max' },
	{ key: 'fiber', label: 'Fibra', unit: 'g', direction: 'min' },
	{ key: 'protein', label: 'Proteínas', unit: 'g', direction: 'min' }
] as const satisfies readonly {
	key: keyof Totals;
	label: string;
	unit: string;
	direction: ChartDirection;
}[];

export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type Goal = 'lose' | 'recomp' | 'maintain' | 'gain';

export interface Profile {
	height: number;
	weight: number;
	age: number;
	sex: Sex;
	activity: ActivityLevel;
	goal: Goal;
}

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725
};

export const GOAL_ADJUSTMENTS: Record<Goal, number> = {
	lose: -400,
	recomp: -250,
	maintain: 0,
	gain: 250
};

export interface GoalsBreakdown {
	tmb: number;
	tdee: number;
	activityFactor: number;
	adjustment: number;
	totals: Totals;
}

export function computeGoalsBreakdown(p: Profile): GoalsBreakdown {
	const tmb =
		p.sex === 'male'
			? 88.362 + 13.397 * p.weight + 4.799 * p.height - 5.677 * p.age
			: 447.6 + 9.25 * p.weight + 3.1 * p.height - 4.33 * p.age;
	const activityFactor = ACTIVITY_FACTORS[p.activity];
	const adjustment = GOAL_ADJUSTMENTS[p.goal ?? 'recomp'];
	const kcal = Math.round(tmb * activityFactor + adjustment);
	const protein = Math.round(p.weight * 2.1);
	const fat = Math.round(p.weight * 0.9);
	const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
	return {
		tmb,
		tdee: tmb * activityFactor,
		activityFactor,
		adjustment,
		totals: { kcal, protein, carbs, fat, fiber: 30 }
	};
}

export function computeGoals(p: Profile): Totals {
	return computeGoalsBreakdown(p).totals;
}

function scaleOptionalNutrients(values: OptionalNutrients, factor: number): OptionalNutrients {
	return {
		...(values.saturatedFat === undefined ? {} : { saturatedFat: values.saturatedFat * factor }),
		...(values.sugars === undefined ? {} : { sugars: values.sugars * factor })
	};
}

export function foodAtGrams(food: NutrientValues & { base: number }, grams: number): NutrientValues {
	const factor = grams / food.base;
	return {
		kcal: food.kcal * factor,
		protein: food.protein * factor,
		carbs: food.carbs * factor,
		fat: food.fat * factor,
		fiber: food.fiber * factor,
		...scaleOptionalNutrients(food, factor)
	};
}

export function sumTotals(entries: Array<Partial<Totals>>, key: keyof Totals): number {
	return entries.reduce((acc, entry) => acc + (entry[key] ?? 0), 0);
}

export interface SubNutrientTotals {
	/** Suma de los registros con dato; `null` si ninguno lo tiene. */
	value: number | null;
	known: number;
	total: number;
}

/** Suma solo los registros con dato: si `known < total`, `value` es un mínimo (los desconocidos no son cero). */
export function sumSubNutrient(entries: NutrientValues[], key: SubNutrientKey): SubNutrientTotals {
	let value = 0;
	let known = 0;
	for (const entry of entries) {
		const amount = entry[key];
		if (amount !== undefined) {
			value += amount;
			known++;
		}
	}
	return { value: known > 0 ? value : null, known, total: entries.length };
}

function sumKnown(entries: NutrientValues[], key: SubNutrientKey): number | null {
	const { value, known, total } = sumSubNutrient(entries, key);
	return known === total ? (value ?? 0) : null;
}

export function sumConsumption(entries: NutrientValues[]): ConsumptionTotals {
	return {
		kcal: sumTotals(entries, 'kcal'),
		protein: sumTotals(entries, 'protein'),
		carbs: sumTotals(entries, 'carbs'),
		fat: sumTotals(entries, 'fat'),
		fiber: sumTotals(entries, 'fiber'),
		saturatedFat: sumKnown(entries, 'saturatedFat'),
		sugars: sumKnown(entries, 'sugars')
	};
}

export function snapshotTotals(totals: ConsumptionTotals): NutrientValues {
	const { saturatedFat, sugars, ...old } = totals;
	return {
		...old,
		...(saturatedFat === null ? {} : { saturatedFat }),
		...(sugars === null ? {} : { sugars })
	};
}

export function saturatedFatLimit(kcal: number): number {
	return kcal * 0.10 / 9;
}

export function scaleTotals(entry: NutrientValues, grams: number, prevGrams: number): NutrientValues {
	const factor = prevGrams > 0 ? grams / prevGrams : 0;
	return {
		kcal: entry.kcal * factor,
		protein: entry.protein * factor,
		carbs: entry.carbs * factor,
		fat: entry.fat * factor,
		fiber: entry.fiber * factor,
		...scaleOptionalNutrients(entry, factor)
	};
}
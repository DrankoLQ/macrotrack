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
	/** En déficit: % (0–100) que se recorta a cada macro respecto a la fórmula. Solo baja, nunca sube. */
	cuts?: MacroCuts;
}

export type MacroCuts = Partial<Record<'fat' | 'carbs' | 'protein', number>>;

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
	/** Objetivo de la fórmula, antes de los recortes personalizados. */
	base: Totals;
	totals: Totals;
}

/** Baja cada macro su % de recorte y resta sus kcal (4/9/4 kcal/g). Un recorte negativo cuenta como 0. */
export function applyCuts(t: Totals, cuts: MacroCuts = {}): Totals {
	const cut = (key: keyof MacroCuts) => Math.round(t[key] * (1 - Math.min(100, Math.max(0, cuts[key] ?? 0)) / 100));
	const fat = cut('fat');
	const carbs = cut('carbs');
	const protein = cut('protein');
	const kcal = t.kcal - (t.fat - fat) * 9 - (t.carbs - carbs) * 4 - (t.protein - protein) * 4;
	return { ...t, kcal, fat, carbs, protein };
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
	const base = { kcal, protein, carbs, fat, fiber: 30 };
	return {
		tmb,
		tdee: tmb * activityFactor,
		activityFactor,
		adjustment,
		base,
		totals: adjustment < 0 ? applyCuts(base, p.cuts) : base
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

function sumKnown(entries: NutrientValues[], key: SubNutrientKey): number | null {
	return entries.some((entry) => entry[key] === undefined)
		? null
		: entries.reduce((sum, entry) => sum + entry[key]!, 0);
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
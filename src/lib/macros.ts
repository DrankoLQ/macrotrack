import type { ChartDirection } from './chart';

export interface Totals {
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
}

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
	/** En déficit: el día de descanso cuenta como sedentario y la grasa baja a 0,6 g/kg. */
	rest: Totals | null;
}

function splitMacros(kcal: number, weight: number, fatPerKg: number): Totals {
	const protein = Math.round(weight * 2.1);
	const fat = Math.round(weight * fatPerKg);
	const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
	return { kcal, protein, carbs, fat, fiber: 30 };
}

export function computeGoalsBreakdown(p: Profile): GoalsBreakdown {
	const tmb =
		p.sex === 'male'
			? 88.362 + 13.397 * p.weight + 4.799 * p.height - 5.677 * p.age
			: 447.6 + 9.25 * p.weight + 3.1 * p.height - 4.33 * p.age;
	const activityFactor = ACTIVITY_FACTORS[p.activity];
	const adjustment = GOAL_ADJUSTMENTS[p.goal ?? 'recomp'];
	const kcal = Math.round(tmb * activityFactor + adjustment);
	const restKcal = Math.round(tmb * ACTIVITY_FACTORS.sedentary + adjustment);
	return {
		tmb,
		tdee: tmb * activityFactor,
		activityFactor,
		adjustment,
		totals: splitMacros(kcal, p.weight, 0.9),
		rest: adjustment < 0 && restKcal < kcal ? splitMacros(restKcal, p.weight, 0.6) : null
	};
}

export function computeGoals(p: Profile): Totals {
	return computeGoalsBreakdown(p).totals;
}

/** En déficit, el día de descanso (sin marcar como entreno) usa el objetivo de descanso del perfil. */
export function dayGoals(goals: Totals, profile: Profile | null, training: boolean): Totals {
	if (training || !profile) return goals;
	return computeGoalsBreakdown(profile).rest ?? goals;
}

export function foodAtGrams(food: Totals & { base: number }, grams: number): Totals {
	const factor = grams / food.base;
	return {
		kcal: food.kcal * factor,
		protein: food.protein * factor,
		carbs: food.carbs * factor,
		fat: food.fat * factor,
		fiber: food.fiber * factor
	};
}

export function sumTotals(entries: Array<Partial<Totals>>, key: keyof Totals): number {
	return entries.reduce((acc, entry) => acc + (entry[key] ?? 0), 0);
}

export function scaleTotals(entry: Totals, grams: number, prevGrams: number): Totals {
	const factor = prevGrams > 0 ? grams / prevGrams : 0;
	return {
		kcal: entry.kcal * factor,
		protein: entry.protein * factor,
		carbs: entry.carbs * factor,
		fat: entry.fat * factor,
		fiber: entry.fiber * factor
	};
}
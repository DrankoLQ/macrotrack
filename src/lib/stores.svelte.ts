import { db, suggestMealType, type Entry, type Food, type MealType } from './db';

const GOALS_KEY = 'macrotrack:goals';

export function today(): string {
	return new Date().toLocaleDateString('en-CA');
}

export const goals = $state({ kcal: 2200, protein: 140, carbs: 250, fat: 73, fiber: 30 });

export function loadGoals() {
	try {
		const raw = localStorage.getItem(GOALS_KEY);
		if (raw) Object.assign(goals, JSON.parse(raw));
	} catch {
		// valores por defecto
	}
}

export function saveGoals() {
	localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export interface Totals {
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
}

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

const PROFILE_KEY = 'macrotrack:profile';

export const profile = $state<{ value: Profile | null }>({ value: null });

export function loadProfile() {
	try {
		const raw = localStorage.getItem(PROFILE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed.height === 'number') profile.value = { goal: 'recomp', ...parsed };
		}
	} catch {
		// sin perfil guardado
	}
}

export function saveProfile(p: Profile) {
	profile.value = p;
	localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function computeGoals(p: Profile): Totals {
	const tmb =
		p.sex === 'male'
			? 88.362 + 13.397 * p.weight + 4.799 * p.height - 5.677 * p.age
			: 447.6 + 9.25 * p.weight + 3.1 * p.height - 4.33 * p.age;
	const kcal = Math.round(tmb * ACTIVITY_FACTORS[p.activity] + GOAL_ADJUSTMENTS[p.goal ?? 'recomp']);
	const protein = Math.round(p.weight * 2.1);
	const fat = Math.round(p.weight * 0.9);
	const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
	return { kcal, protein, carbs, fat, fiber: 30 };
}

function sum(entries: Entry[], key: keyof Totals): number {
	return entries.reduce((acc, entry) => acc + entry[key], 0);
}

export function foodAtGrams(food: Food, grams: number): Totals {
	const factor = grams / food.base;
	return {
		kcal: food.kcal * factor,
		protein: food.protein * factor,
		carbs: food.carbs * factor,
		fat: food.fat * factor,
		fiber: food.fiber * factor
	};
}

class DiaryStore {
	date = $state(today());
	entries = $state<Entry[]>([]);
	loading = $state(false);
	totals: Totals = $derived({
		kcal: sum(this.entries, 'kcal'),
		protein: sum(this.entries, 'protein'),
		carbs: sum(this.entries, 'carbs'),
		fat: sum(this.entries, 'fat'),
		fiber: sum(this.entries, 'fiber')
	});

	async load() {
		this.loading = true;
		this.entries = await db.entries.where('date').equals(this.date).sortBy('createdAt');
		this.loading = false;
	}

	async setDate(date: string) {
		this.date = date;
		await this.load();
	}

	async addFood(food: Food, grams: number, mealType: MealType = suggestMealType()) {
		const totals = foodAtGrams(food, grams);
		await db.entries.add({
			date: this.date,
			foodId: food.id,
			name: food.name,
			grams,
			mealType,
			...totals,
			createdAt: Date.now()
		});
		await this.load();
	}

	async updateEntry(id: number, patch: { grams?: number; mealType?: MealType }) {
		const entry = this.entries.find((entry) => entry.id === id);
		if (!entry) return;
		const grams = patch.grams ?? entry.grams;
		let data: Partial<Entry> = { grams, mealType: patch.mealType ?? entry.mealType };
		if (patch.grams !== undefined) {
			if (entry.foodId) {
				const food = await db.foods.get(entry.foodId);
				if (food) data = { ...data, ...foodAtGrams(food, grams) };
			} else {
				const factor = entry.grams > 0 ? grams / entry.grams : 0;
				data = { ...data, kcal: entry.kcal * factor, protein: entry.protein * factor, carbs: entry.carbs * factor, fat: entry.fat * factor, fiber: entry.fiber * factor };
			}
		}
		await db.entries.update(id, data);
		await this.load();
	}

	async remove(id: number) {
		await db.entries.delete(id);
		await this.load();
	}
}

export const diary = new DiaryStore();

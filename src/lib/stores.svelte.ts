import { db, suggestMealType, type Entry, type Food, type MealType, type Weight } from './db';
import {
	computeGoals,
	foodAtGrams,
	scaleTotals,
	sumTotals,
	type ActivityLevel,
	type Goal,
	type Profile,
	type Sex,
	type Totals
} from './macros';

export type { Totals, Sex, ActivityLevel, Goal, Profile } from './macros';
export { computeGoals, ACTIVITY_FACTORS, GOAL_ADJUSTMENTS } from './macros';

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

class DiaryStore {
	date = $state(today());
	entries = $state<Entry[]>([]);
	loading = $state(false);
	totals: Totals = $derived({
		kcal: sumTotals(this.entries, 'kcal'),
		protein: sumTotals(this.entries, 'protein'),
		carbs: sumTotals(this.entries, 'carbs'),
		fat: sumTotals(this.entries, 'fat'),
		fiber: sumTotals(this.entries, 'fiber')
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

	async addFood(
		food: Food,
		grams: number,
		mealType: MealType = suggestMealType(),
		units?: number
	) {
		const totals = foodAtGrams(food, grams);
		await db.entries.add({
			date: this.date,
			foodId: food.id,
			name: food.name,
			grams,
			units,
			unitSize: units !== undefined ? food.unitSize : undefined,
			mealType,
			...totals,
			createdAt: Date.now()
		});
		await this.load();
	}

	async updateEntry(id: number, patch: { grams?: number; units?: number; mealType?: MealType }) {
		const entry = this.entries.find((entry) => entry.id === id);
		if (!entry) return;
		const grams = patch.grams ?? entry.grams;
		let data: Partial<Entry> = { grams, mealType: patch.mealType ?? entry.mealType };
		if (patch.units !== undefined) data = { ...data, units: patch.units };
		if (patch.grams !== undefined) {
			if (entry.foodId) {
				const food = await db.foods.get(entry.foodId);
				if (food) data = { ...data, ...foodAtGrams(food, grams) };
			} else {
				data = { ...data, ...scaleTotals(entry, grams, entry.grams) };
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

class WeightStore {
	records = $state<Weight[]>([]);

	async load() {
		this.records = await db.weights.orderBy('date').toArray();
	}

	async save(date: string, weight: number, bodyFat?: number) {
		const existing = await db.weights.where('date').equals(date).first();
		await db.weights.put({ ...existing, date, weight, bodyFat, createdAt: Date.now() });
		await this.load();
	}

	async remove(id: number) {
		await db.weights.delete(id);
		await this.load();
	}
}

export const weights = new WeightStore();

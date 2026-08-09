import { db, type Entry, type Food } from './db';

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

	async addFood(food: Food, grams: number) {
		const totals = foodAtGrams(food, grams);
		await db.entries.add({
			date: this.date,
			foodId: food.id,
			name: food.name,
			grams,
			...totals,
			createdAt: Date.now()
		});
		await this.load();
	}

	async remove(id: number) {
		await db.entries.delete(id);
		await this.load();
	}
}

export const diary = new DiaryStore();

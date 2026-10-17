import { MACROS, sumConsumption, sumSubNutrient, saturatedFatLimit, type Totals, type NutrientValues,
	type ConsumptionTotals, type SubNutrientKey, type SubNutrientTotals } from './macros.ts';

export function shiftDate(date: string, days: number): string {
	const value = new Date(date + 'T12:00:00');
	value.setDate(value.getDate() + days);
	return value.toLocaleDateString('en-CA');
}

export function weekDates(date: string): string[] {
	const weekday = new Date(date + 'T12:00:00').getDay();
	const monday = shiftDate(date, -((weekday + 6) % 7));
	return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}

export type TrackingStatus = 'complete' | 'partial' | 'empty' | 'future';
export type TrackedDay = { date: string; status: TrackingStatus; totals: ConsumptionTotals | null };

export function summarizeDays(
	entries: (NutrientValues & { date: string })[],
	completeDates: string[],
	dates: string[],
	today: string,
	goals: Totals
) {
	const confirmed = new Set(completeDates);
	const grouped = new Map<string, (NutrientValues & { date: string })[]>();
	for (const entry of entries) {
		const group = grouped.get(entry.date) ?? [];
		group.push(entry);
		grouped.set(entry.date, group);
	}
	const days: TrackedDay[] = dates.map((date) => {
		if (date > today) return { date, status: 'future', totals: null };
		const entries = grouped.get(date);
		if (!entries?.length) return { date, status: 'empty', totals: null };
		const totals = sumConsumption(entries);
		return { date, status: confirmed.has(date) ? 'complete' : 'partial', totals };
	});
	const complete = days.filter((day) => day.status === 'complete');
	const metrics = MACROS.map((macro) => {
		const goal = goals[macro.key];
		const values = complete.map((day) => day.totals![macro.key]);
		const total = values.reduce((sum, value) => sum + value, 0);
		const target = goal * complete.length;
		const meetsGoal = (value: number, goal: number) => macro.direction === 'max' ? value <= goal : value >= goal;
		return {
			...macro, goal, total, target,
			average: complete.length ? total / complete.length : null,
			withinGoal: complete.length ? meetsGoal(total, target) : null,
			compliance: complete.length ? Math.round(values.filter((value) => meetsGoal(value, goal)).length / complete.length * 100) : null
		};
	});
	// Saturadas y azúcares promedian los días completos con algún dato; si al día le falta algún
	// registro, su suma es un mínimo (≥) y se expone junto a su cobertura de registros.
	const subNutrientValues = (key: SubNutrientKey) =>
		complete.map((day) => sumSubNutrient(grouped.get(day.date)!, key)).filter((summary) => summary.value !== null);
	const summarizeValues = (values: SubNutrientTotals[]) => ({
		average: values.length ? values.reduce((sum, summary) => sum + summary.value!, 0) / values.length : null,
		eligibleCount: values.length,
		completeCount: complete.length,
		known: values.reduce((sum, summary) => sum + summary.known, 0),
		total: values.reduce((sum, summary) => sum + summary.total, 0)
	});
	const saturatedFat = summarizeValues(subNutrientValues('saturatedFat'));
	const sugars = summarizeValues(subNutrientValues('sugars'));
	const limit = saturatedFatLimit(goals.kcal);
	// El máximo solo se evalúa con días de dato completo: una suma parcial no permite asegurarlo.
	const fullSaturatedFat = complete.map((day) => day.totals!.saturatedFat).filter((value) => value !== null);
	const withinLimitCount = fullSaturatedFat.filter((value) => value <= limit).length;
	const subMetrics = {
		saturatedFat: {
			...saturatedFat, limit, fullCount: fullSaturatedFat.length, withinLimitCount,
			compliance: fullSaturatedFat.length ? Math.round(withinLimitCount / fullSaturatedFat.length * 100) : null
		},
		sugars
	};
	return { days, completeCount: complete.length, metrics, subMetrics };
}

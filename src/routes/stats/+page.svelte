<script lang="ts">
	import { db } from '$lib/db';
	import { goals, today } from '$lib/stores.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import MacroChart from '$lib/components/MacroChart.svelte';
	import type { ChartDirection } from '$lib/chart';

	type DayTotals = { date: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number };
	type Series = {
		label: string;
		unit: string;
		direction: ChartDirection;
		goal: number;
		days: { date: string; value: number }[];
	};

	let range = $state<7 | 30>(7);
	let byDay = $state<DayTotals[]>([]);

	async function load(range: 7 | 30) {
		const to = today();
		const fromDate = new Date(to + 'T12:00:00');
		fromDate.setDate(fromDate.getDate() - (range - 1));
		const from = fromDate.toLocaleDateString('en-CA');
		const entries = await db.entries.where('date').between(from, to, true, false).toArray();
		const map = new Map<string, DayTotals>();
		for (const e of entries) {
			const day = map.get(e.date) ?? { date: e.date, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
			day.kcal += e.kcal;
			day.protein += e.protein;
			day.carbs += e.carbs;
			day.fat += e.fat;
			day.fiber += e.fiber;
			map.set(e.date, day);
		}
		byDay = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
	}

	$effect(() => {
		void load(range);
	});

	const series = $derived.by<Series[]>(() => [
		{
			label: 'Calorías por día',
			unit: 'kcal',
			direction: 'max',
			goal: goals.kcal,
			days: byDay.map((d) => ({ date: d.date, value: d.kcal }))
		},
		{
			label: 'Grasas por día',
			unit: 'g',
			direction: 'max',
			goal: goals.fat,
			days: byDay.map((d) => ({ date: d.date, value: d.fat }))
		},
		{
			label: 'Hidratos por día',
			unit: 'g',
			direction: 'max',
			goal: goals.carbs,
			days: byDay.map((d) => ({ date: d.date, value: d.carbs }))
		},
		{
			label: 'Fibra por día',
			unit: 'g',
			direction: 'min',
			goal: goals.fiber,
			days: byDay.map((d) => ({ date: d.date, value: d.fiber }))
		},
		{
			label: 'Proteínas por día',
			unit: 'g',
			direction: 'min',
			goal: goals.protein,
			days: byDay.map((d) => ({ date: d.date, value: d.protein }))
		}
	]);

	const compliance = $derived.by(() => {
		if (byDay.length === 0) return null;
		const pct = (n: number) => Math.round((n / byDay.length) * 100);
		return {
			kcal: pct(byDay.filter((d) => d.kcal <= goals.kcal).length),
			protein: pct(byDay.filter((d) => d.protein >= goals.protein).length),
			carbs: pct(byDay.filter((d) => d.carbs <= goals.carbs).length),
			fat: pct(byDay.filter((d) => d.fat <= goals.fat).length),
			fiber: pct(byDay.filter((d) => d.fiber >= goals.fiber).length)
		};
	});
</script>

{#if byDay.length === 0}
	<Card>
		<CardContent class="flex flex-col gap-3">
			<p class="text-sm text-muted-foreground">No hay registros en este rango todavía.</p>
		</CardContent>
	</Card>
{:else}
	{#each series as s, i}
		<Card>
			<CardContent class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<h2 class="text-base font-semibold">{s.label}</h2>
					{#if i === 0}
						<div class="flex gap-0.5 rounded-lg border border-border bg-card p-0.5">
							<Button
								variant="ghost"
								size="sm"
								class={range === 7 ? 'bg-secondary text-foreground' : ''}
								onclick={() => (range = 7)}
							>7 días</Button>
							<Button
								variant="ghost"
								size="sm"
								class={range === 30 ? 'bg-secondary text-foreground' : ''}
								onclick={() => (range = 30)}
							>30 días</Button>
						</div>
					{/if}
				</div>
				<MacroChart data={s.days} goal={s.goal} unit={s.unit} direction={s.direction} />
			</CardContent>
		</Card>
	{/each}
	{#if compliance}
		<Card>
			<CardContent class="flex flex-col gap-3">
				<h2 class="text-base font-semibold">Cumplimiento</h2>
				<p class="text-xs text-muted-foreground">
					% de días con registros que cumplen cada objetivo ({byDay.length} {byDay.length === 1 ? 'día' : 'días'}).
				</p>
				<div class="grid grid-cols-2 gap-2">
					<div class="rounded-lg bg-secondary p-3">
						<p class="text-xs text-muted-foreground">kcal ≤ objetivo</p>
						<p class="text-lg font-bold">{compliance.kcal}%</p>
					</div>
					<div class="rounded-lg bg-secondary p-3">
						<p class="text-xs text-muted-foreground">grasas ≤ objetivo</p>
						<p class="text-lg font-bold">{compliance.fat}%</p>
					</div>
					<div class="rounded-lg bg-secondary p-3">
						<p class="text-xs text-muted-foreground">hidratos ≤ objetivo</p>
						<p class="text-lg font-bold">{compliance.carbs}%</p>
					</div>
					<div class="rounded-lg bg-secondary p-3">
						<p class="text-xs text-muted-foreground">fibra ≥ objetivo</p>
						<p class="text-lg font-bold">{compliance.fiber}%</p>
					</div>
					<div class="rounded-lg bg-secondary p-3">
						<p class="text-xs text-muted-foreground">proteína ≥ objetivo</p>
						<p class="text-lg font-bold">{compliance.protein}%</p>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
{/if}
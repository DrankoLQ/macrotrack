<script lang="ts">
	import { db } from '$lib/db';
	import { goals, today } from '$lib/stores.svelte';
	import { fmt } from '$lib/format';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	type DayTotals = { date: string; kcal: number; protein: number; carbs: number; fat: number };

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
			const day = map.get(e.date) ?? { date: e.date, kcal: 0, protein: 0, carbs: 0, fat: 0 };
			day.kcal += e.kcal;
			day.protein += e.protein;
			day.carbs += e.carbs;
			day.fat += e.fat;
			map.set(e.date, day);
		}
		byDay = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
	}

	$effect(() => {
		void load(range);
	});

	const bars = $derived.by(() => {
		if (byDay.length === 0) return null;
		const maxKcal = Math.max(...byDay.map((d) => d.kcal));
		const scale = Math.max(goals.kcal, maxKcal) * 1.08;
		const bw = 300 / byDay.length;
		return byDay.map((d) => {
			const h = d.kcal === 0 ? 1.5 : Math.max((d.kcal / scale) * 100, 2);
			const x = 5 + byDay.indexOf(d) * bw;
			return {
				x: x.toFixed(1),
				w: (bw * 0.7).toFixed(1),
				y: (110 - h).toFixed(1),
				h: h.toFixed(1),
				over: d.kcal > goals.kcal,
				label: d.date
			};
		});
	});

	const goalLineY = $derived.by(() => {
		if (byDay.length === 0) return null;
		const maxKcal = Math.max(...byDay.map((d) => d.kcal));
		const scale = Math.max(goals.kcal, maxKcal) * 1.08;
		return (110 - (goals.kcal / scale) * 100).toFixed(1);
	});

	const compliance = $derived.by(() => {
		if (byDay.length === 0) return null;
		const pct = (n: number) => Math.round((n / byDay.length) * 100);
		return {
			kcal: pct(byDay.filter((d) => d.kcal <= goals.kcal).length),
			protein: pct(byDay.filter((d) => d.protein >= goals.protein).length),
			carbs: pct(byDay.filter((d) => d.carbs <= goals.carbs).length),
			fat: pct(byDay.filter((d) => d.fat <= goals.fat).length)
		};
	});

	function dayLabel(date: string) {
		return new Date(date + 'T12:00:00')
			.toLocaleDateString('es-ES', { weekday: 'short' })
			.replace(/\.$/, '');
	}
</script>

<Card>
	<CardContent class="flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<h2 class="text-base font-semibold">Calorías por día</h2>
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
		</div>
		{#if bars}
			<div class="flex items-end gap-1">
				<svg viewBox="0 0 310 120" class="w-full" aria-hidden="true">
					{#each bars as bar}
						<rect
							x={bar.x}
							y={bar.y}
							width={bar.w}
							height={bar.h}
							rx="2"
							class={bar.over ? 'fill-destructive' : 'fill-primary'}
						/>
					{/each}
					{#if goalLineY}
						<line
							x1="5"
							x2="305"
							y1={goalLineY}
							y2={goalLineY}
							stroke="var(--card-foreground)"
							stroke-width="1"
							stroke-dasharray="4 3"
							opacity="0.6"
						/>
					{/if}
				</svg>
			</div>
			{#if range === 7 || byDay.length <= 7}
				<div class="flex justify-between px-1 text-[10px] text-muted-foreground">
					{#each byDay as day}
						<span class="w-0 flex-1 text-center capitalize">{dayLabel(day.date)}</span>
					{/each}
				</div>
			{/if}
			<p class="text-xs text-muted-foreground">
				Objetivo {fmt(goals.kcal)} kcal · línea punteada
			</p>
		{:else}
			<p class="text-sm text-muted-foreground">No hay registros en este rango todavía.</p>
		{/if}
	</CardContent>
</Card>

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
					<p class="text-xs text-muted-foreground">proteína ≥ objetivo</p>
					<p class="text-lg font-bold">{compliance.protein}%</p>
				</div>
				<div class="rounded-lg bg-secondary p-3">
					<p class="text-xs text-muted-foreground">hidratos ≤ objetivo</p>
					<p class="text-lg font-bold">{compliance.carbs}%</p>
				</div>
				<div class="rounded-lg bg-secondary p-3">
					<p class="text-xs text-muted-foreground">grasas ≤ objetivo</p>
					<p class="text-lg font-bold">{compliance.fat}%</p>
				</div>
			</div>
		</CardContent>
	</Card>
{/if}
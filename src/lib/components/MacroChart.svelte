<script lang="ts">
	import { fmt } from '$lib/format';
	import { chartBars, chartGoalY, type ChartDirection } from '$lib/chart';

	type Day = { date: string; value: number };

	let {
		data,
		goal,
		unit,
		direction
	}: {
		data: Day[];
		goal: number;
		unit: string;
		direction: ChartDirection;
	} = $props();

	let selected = $state<number | null>(null);

	const bars = $derived.by(() => chartBars(data.map((d) => d.value), goal, direction));
	const goalY = $derived(chartGoalY(data.map((d) => d.value), goal));

	const tooltip = $derived.by(() => {
		if (selected === null) return null;
		const bar = bars[selected];
		if (!bar) return null;
		return {
			left: `${Math.min(Math.max(bar.cx, 12), 88)}%`,
			text: `${label(data[selected].date)} · ${fmt(data[selected].value)} ${unit}`
		};
	});

	$effect(() => {
		if (selected !== null && selected >= bars.length) selected = null;
	});

	function label(date: string) {
		return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
			weekday: 'short',
			day: 'numeric'
		});
	}

	function toggle(i: number) {
		selected = selected === i ? null : i;
	}
</script>

<div class="relative">
	<div class="h-6">
		{#if tooltip}
			<div
				class="absolute top-0 z-10 -translate-x-1/2 rounded-md bg-foreground px-2 py-0.5 text-xs font-semibold capitalize text-background shadow-sm"
				style="left: {tooltip.left}"
			>{tooltip.text}</div>
		{/if}
	</div>
	<svg viewBox="0 0 310 120" class="w-full" role="group" aria-label="Gráfica de barras por día">
		{#each bars as bar, i}
			<rect
				x={bar.x}
				y={bar.y}
				width={bar.w}
				height={bar.h}
				rx="2"
				role="button"
				tabindex="0"
				aria-label={`${label(data[i].date)}: ${fmt(data[i].value)} ${unit}`}
				class:fill-destructive={bar.over}
				class:fill-primary={!bar.over}
				class:stroke-foreground={selected === i}
				stroke-width={selected === i ? 1.5 : 0}
				onclick={() => toggle(i)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						toggle(i);
					}
				}}
			/>
		{/each}
		<line
			x1="5"
			x2="305"
			y1={goalY}
			y2={goalY}
			stroke="var(--card-foreground)"
			stroke-width="1"
			stroke-dasharray="4 3"
			opacity="0.6"
		/>
	</svg>
	{#if data.length <= 7}
		<div class="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground">
			{#each data as d}
				<span class="w-0 flex-1 text-center capitalize">{label(d.date)}</span>
			{/each}
		</div>
	{/if}
	<p class="mt-1 text-xs text-muted-foreground">
		Objetivo {fmt(goal)} {unit} · línea punteada
	</p>
</div>
<script lang="ts">
	import { fmt } from '$lib/format';
	import { chartBars, chartGoalY, type ChartDirection } from '$lib/chart';

	type Day = { date: string; value: number | null; complete?: boolean };

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
		if (!bar || bar.missing) return null;
		return {
			left: `${Math.min(Math.max(bar.cx, 12), 88)}%`,
			text: `${label(data[selected].date)} · ${fmt(data[selected].value!)} ${unit}${data[selected].complete === false ? ' · Parcial' : ''}`
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
			{#if bar.missing}
				<text x={bar.x + bar.w / 2} y="110" text-anchor="middle" class="fill-muted-foreground text-[10px]">
					<title>{label(data[i].date)} · Sin datos evaluables</title>—
				</text>
			{:else}
			<rect
				x={bar.x}
				y={bar.y}
				width={bar.w}
				height={bar.h}
				rx="2"
				role="button"
				tabindex="0"
				aria-label={`${label(data[i].date)}: ${fmt(data[i].value!)} ${unit}${data[i].complete === false ? ' · Parcial, excluido del balance' : ''}`}
				class:fill-destructive={data[i].complete !== false && bar.over}
				class:fill-primary={data[i].complete !== false && !bar.over}
				class:fill-muted-foreground={data[i].complete === false}
				opacity={data[i].complete === false ? 0.5 : 1}
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
			{/if}
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
		{#if data.some((day) => day.complete === false && day.value !== null)}
			<br />Barras atenuadas: registros parciales, excluidos del balance.
		{/if}
		{#if data.some((day) => day.value === null)}
			<br />— Sin datos evaluables, no equivale a consumo cero.
		{/if}
	</p>
</div>

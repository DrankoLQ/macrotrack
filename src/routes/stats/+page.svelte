<script lang="ts">
	import { onMount } from 'svelte';
	import { db, setDaysComplete, type Entry } from '$lib/db';
	import { goals, today } from '$lib/stores.svelte';
	import { shiftDate, weekDates, summarizeDays } from '$lib/weekly';
	import type { Totals } from '$lib/macros';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import MacroBar from '$lib/components/MacroBar.svelte';
	import MacroChart from '$lib/components/MacroChart.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import InfoIcon from '@lucide/svelte/icons/info';

	let weekStart = $state(weekDates(today())[0]);
	let currentDate = $state(today());
	let range = $state<'week' | 30>('week');
	let entries = $state<Entry[]>([]);
	let completeDates = $state<string[]>([]);
	let selected = $state<string[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let loadError = $state('');
	let saveError = $state('');
	let loadVersion = 0;
	let daysOpen = $state(false);
	let showHelper = $state(false);
	let chartMetric = $state<keyof Totals>('kcal');
	const dates = $derived(weekDates(weekStart));
	const currentWeek = $derived(weekStart === weekDates(currentDate)[0]);
	const summary = $derived(summarizeDays(entries, completeDates, dates, currentDate, goals));
	const chartDates = $derived(range === 'week' ? dates : Array.from({ length: 30 }, (_, i) => shiftDate(currentDate, i - 29)));
	const chartSummary = $derived(summarizeDays(entries, completeDates, chartDates, currentDate, goals));
	const chartMacro = $derived(
		chartSummary.metrics.find((metric) => metric.key === chartMetric) ?? chartSummary.metrics[0]
	);
	const statusLabels = { complete: 'Completo', partial: 'Parcial', empty: 'Sin registros', future: 'Futuro' };

	function refreshDate() {
		currentDate = today();
	}

	onMount(() => {
		const timer = window.setInterval(refreshDate, 60_000);
		return () => window.clearInterval(timer);
	});

	function dateLabel(date: string, weekday = false) {
		return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
			...(weekday ? { weekday: 'short' as const } : {}), day: 'numeric', month: 'short'
		});
	}

	async function load(start: string, chartRange: 'week' | 30, asOf = currentDate) {
		const version = ++loadVersion;
		loading = true;
		loadError = '';
		const from = chartRange === 30 && shiftDate(asOf, -29) < start ? shiftDate(asOf, -29) : start;
		const to = chartRange === 30 ? asOf : [shiftDate(start, 6), asOf].sort()[0];
		try {
			const [rows, completed] = await Promise.all([
				db.entries.where('date').between(from, to, true, true).toArray(),
				db.completedDays.where('date').between(from, to, true, true).toArray()
			]);
			if (version !== loadVersion) return;
			entries = rows;
			completeDates = completed.map((day) => day.date);
		} catch {
			if (version === loadVersion) loadError = 'No se pudieron cargar los registros. Inténtalo de nuevo.';
		} finally {
			if (version === loadVersion) loading = false;
		}
	}

	$effect(() => { void load(weekStart, range, currentDate); });

	function changeWeek(start: string) {
		weekStart = start;
		selected = [];
		saveError = '';
	}

	async function confirmSelected(complete: boolean) {
		saving = true;
		saveError = '';
		try {
			await setDaysComplete(selected, complete);
			selected = [];
			daysOpen = false;
			await load(weekStart, range);
		} catch {
			saveError = 'No se pudieron guardar los días seleccionados. Inténtalo de nuevo.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window onfocus={refreshDate} />
<svelte:document onvisibilitychange={refreshDate} />

<Card>
	<CardContent class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-base font-semibold">Resumen semanal</h2>
			<div class="flex items-center gap-1">
				<Button variant="outline" size="sm" disabled={currentWeek || loading || saving} onclick={() => changeWeek(weekDates(currentDate)[0])}>Esta semana</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Más información sobre el balance"
					aria-expanded={showHelper}
					onclick={() => (showHelper = !showHelper)}
				>
					<InfoIcon />
				</Button>
			</div>
		</div>
		<div class="flex items-center justify-between gap-2">
			<Button variant="outline" size="icon-sm" disabled={loading || saving} onclick={() => changeWeek(shiftDate(weekStart, -7))} aria-label="Semana anterior"><ChevronLeftIcon /></Button>
			<p class="text-center text-sm font-medium">{dateLabel(dates[0])} – {dateLabel(dates[6])} · {dates[6].slice(0, 4)}</p>
			<Button variant="outline" size="icon-sm" disabled={currentWeek || loading || saving} onclick={() => changeWeek(shiftDate(weekStart, 7))} aria-label="Semana siguiente"><ChevronRightIcon /></Button>
		</div>
		{#if loading}
			<p role="status" class="text-sm text-muted-foreground">Cargando registros…</p>
		{:else if loadError}
			<p role="alert" class="text-sm text-destructive">{loadError}</p>
			<Button variant="outline" onclick={() => load(weekStart, range)}>Reintentar</Button>
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p class="font-semibold">{summary.completeCount} de 7 días completos</p>
					<p class="text-sm text-muted-foreground">
						{currentWeek ? 'Balance provisional de los días completos.' : summary.completeCount === 7 ? 'Balance semanal completo.' : `Balance de los ${summary.completeCount} días completos.`}
					</p>
				</div>
				<Button variant="outline" size="sm" onclick={() => (daysOpen = true)}>Gestionar días</Button>
			</div>
			{#if showHelper}
				<p class="text-xs text-muted-foreground">
					Comparado con tus objetivos actuales. Los días no confirmados no aportan margen. Este balance describe solo los días completos, no estima lo que falta.
				</p>
			{/if}
			{#if summary.completeCount === 0}
				<p class="text-sm text-muted-foreground">No hay días completos confirmados. Marca con «Gestionar días» aquellos en los que registraste todas las comidas para ver su balance.</p>
			{:else}
				<div class="flex flex-col gap-3">
					{#each summary.metrics as metric}
						<MacroBar
							label={metric.label}
							value={metric.average!}
							goal={metric.goal}
							unit={`${metric.unit}/día`}
							direction={metric.direction}
						/>
					{/each}
				</div>
			{/if}
		{/if}
	</CardContent>
</Card>

{#if !loading && !loadError}
	<Card>
		<CardContent class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="text-base font-semibold">Detalle diario</h2>
				<div class="flex gap-0.5 rounded-lg border border-border bg-card p-0.5">
					<Button variant="ghost" size="sm" aria-pressed={range === 'week'} class={range === 'week' ? 'bg-secondary text-foreground' : ''} onclick={() => (range = 'week')}>Semana</Button>
					<Button variant="ghost" size="sm" aria-pressed={range === 30} class={range === 30 ? 'bg-secondary text-foreground' : ''} onclick={() => (range = 30)}>Últimos 30 días</Button>
				</div>
			</div>
			<div class="flex flex-wrap gap-1">
				{#each chartSummary.metrics as metric}
					<Button
						variant={chartMetric === metric.key ? 'secondary' : 'ghost'}
						size="sm"
						aria-pressed={chartMetric === metric.key}
						onclick={() => (chartMetric = metric.key)}
					>{metric.label}</Button>
				{/each}
			</div>
			{#if chartMacro}
				<MacroChart
					data={chartSummary.days.map((day) => ({ date: day.date, value: day.totals?.[chartMacro.key] ?? null, complete: day.status === 'complete' }))}
					goal={chartMacro.goal} unit={chartMacro.unit} direction={chartMacro.direction}
				/>
			{/if}
		</CardContent>
	</Card>

	{#if chartSummary.completeCount > 0}
		<Card>
			<CardContent class="flex flex-col gap-3">
				<h2 class="text-base font-semibold">Cumplimiento diario · {range === 'week' ? 'semana seleccionada' : 'últimos 30 días'}</h2>
				<p class="text-xs text-muted-foreground">Porcentaje de los {chartSummary.completeCount} días completos que cumplen cada objetivo. No equivale al balance del periodo: la media puede cumplir aunque algunos días no.</p>
				<div class="grid grid-cols-2 gap-2">
					{#each chartSummary.metrics as metric}
						<div class="rounded-lg bg-secondary p-3">
							<p class="text-xs text-muted-foreground">{metric.label} {metric.direction === 'max' ? '≤' : '≥'} objetivo</p>
							<p class="text-lg font-bold">{metric.compliance}%</p>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}
{/if}

<Dialog.Root bind:open={daysOpen}>
	<Dialog.Content class="max-h-[85dvh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Confirmar días</Dialog.Title>
			<Dialog.Description>
				Selecciona uno o varios días para marcarlos completos o desmarcarlos. Confirma solo si registraste todo lo que comiste.
			</Dialog.Description>
		</Dialog.Header>
		<fieldset class="flex flex-col gap-2" disabled={saving}>
			{#each summary.days as day}
				<label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 has-disabled:cursor-default has-disabled:opacity-50">
					<input type="checkbox" bind:group={selected} value={day.date} disabled={day.status === 'future' || day.status === 'empty'} class="size-4 accent-primary" />
					<span class="flex-1 text-sm capitalize">{dateLabel(day.date, true)}</span>
					<span class="text-xs text-muted-foreground">{statusLabels[day.status]}</span>
				</label>
			{/each}
		</fieldset>
		{#if saving}<p role="status" class="text-xs text-muted-foreground">Guardando confirmaciones…</p>{/if}
		{#if saveError}<p role="alert" class="text-sm text-destructive">{saveError}</p>{/if}
		<div class="flex flex-wrap gap-2">
			<Button size="sm" disabled={!selected.length || saving} onclick={() => confirmSelected(true)}>Marcar completos{selected.length ? ` (${selected.length})` : ''}</Button>
			<Button size="sm" variant="outline" disabled={!selected.length || saving} onclick={() => confirmSelected(false)}>Desmarcar</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

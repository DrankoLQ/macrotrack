<script lang="ts">
	import {
		computeGoalsBreakdown,
		goals,
		today,
		profile,
		weights,
		saveGoals,
		saveProfile,
		type ActivityLevel,
		type Goal,
		type Sex
	} from '$lib/stores.svelte';
	import { fmt, toNumber } from '$lib/format';
	import { type Weight } from '$lib/db';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Select as SelectPrimitive } from 'bits-ui';

	const SEX_OPTIONS: { key: Sex; label: string }[] = [
		{ key: 'male', label: 'Hombre' },
		{ key: 'female', label: 'Mujer' }
	];

	const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string }[] = [
		{ key: 'sedentary', label: 'Sedentario (poco ejercicio)' },
		{ key: 'light', label: 'Ligero (1–2 días/semana)' },
		{ key: 'moderate', label: 'Moderado (3–4 días/semana)' },
		{ key: 'active', label: 'Intenso (5+ días/semana)' }
	];

	const GOAL_OPTIONS: { key: Goal; label: string }[] = [
		{ key: 'lose', label: 'Perder grasa (−400 kcal)' },
		{ key: 'recomp', label: 'Recomposición (−250 kcal)' },
		{ key: 'maintain', label: 'Mantener (sin ajuste)' },
		{ key: 'gain', label: 'Ganar músculo (+250 kcal)' }
	];

	const GOAL_SHORT: Record<Goal, string> = {
		lose: 'Perder grasa',
		recomp: 'Recomposición',
		maintain: 'Mantener',
		gain: 'Ganar músculo'
	};

	const pform = $state({
		height: '',
		weight: '',
		age: '',
		sex: 'male' as Sex,
		activity: 'moderate' as ActivityLevel,
		goal: 'recomp' as Goal
	});

	$effect(() => {
		const p = profile.value;
		if (p && pform.height === '') {
			Object.assign(pform, {
				height: String(p.height),
				weight: String(p.weight),
				age: String(p.age),
				sex: p.sex,
				activity: p.activity,
				goal: p.goal
			});
		}
	});

	const profileBreakdown = $derived.by(() => {
		const height = toNumber(pform.height);
		const weight = toNumber(pform.weight);
		const age = toNumber(pform.age);
		if (!height || !weight || !age) return null;
		return computeGoalsBreakdown({ height, weight, age, sex: pform.sex, activity: pform.activity, goal: pform.goal });
	});

	const weightKg = $derived(toNumber(pform.weight));
	const profileTotals = $derived(profileBreakdown?.totals ?? null);

	$effect(() => {
		if (!profileTotals) return;
		Object.assign(goals, profileTotals);
		saveGoals();
		saveProfile({
			height: toNumber(pform.height),
			weight: toNumber(pform.weight),
			age: toNumber(pform.age),
			sex: pform.sex,
			activity: pform.activity,
			goal: pform.goal
		});
	});

	let weightInput = $state('');
	let bodyFatInput = $state('');
	let weightSaved = $state(false);

	const weightRange = $derived.by(() => {
		const todayMs = new Date(today() + 'T12:00:00').getTime();
		const DAY = 86_400_000;
		const slice = weights.records.filter(
			(r) => todayMs - new Date(r.date + 'T12:00:00').getTime() <= 29 * DAY
		);
		if (slice.length < 2) return null;
		const min = Math.min(...slice.map((r) => r.weight));
		const max = Math.max(...slice.map((r) => r.weight));
		const pad = Math.max((max - min) * 0.2, 0.2);
		const W = 258;
		const H = 96;
		const ms = (date: string) => new Date(date + 'T12:00:00').getTime();
		const minMs = Math.min(...slice.map((r) => ms(r.date)));
		const maxMs = Math.max(...slice.map((r) => ms(r.date)));
		const y = (w: number) => 106 - ((w - min + pad) / (max - min + pad * 2)) * H;
		const points = slice.map((r, i) => {
			const t =
				maxMs === minMs ? i / (slice.length - 1) : (ms(r.date) - minMs) / (maxMs - minMs);
			const x = 40 + (0.05 + t * 0.9) * W;
			return { x: x.toFixed(1), y: y(r.weight).toFixed(1) };
		});
		const info = slice.map((r, i) => ({
			...points[i],
			date: r.date,
			weight: r.weight,
			bodyFat: r.bodyFat
		}));
		const grid = [min, (min + max) / 2, max].map((w) => ({
			y: y(w).toFixed(1),
			label: fmt(w)
		}));
		const xLabels = [
			{ x: points[0].x, anchor: 'start', label: weightDateLabel(slice[0].date) },
			{ x: points.at(-1)!.x, anchor: 'end', label: weightDateLabel(slice.at(-1)!.date) }
		];
		const withFat = slice.filter((r) => r.bodyFat !== undefined);
		return {
			points: points.map((p) => p.x + ',' + p.y).join(' '),
			dots: points,
			info,
			grid,
			xLabels,
			delta: slice.at(-1)!.weight - slice[0].weight,
			fatDelta: withFat.length >= 2 ? withFat.at(-1)!.bodyFat! - withFat[0].bodyFat! : null
		};
	});

	const deltaLabel = $derived(
		weightRange ? (weightRange.delta > 0 ? '+' : '') + fmt(weightRange.delta) + ' kg' : null
	);

	const fatDeltaLabel = $derived(
		weightRange?.fatDelta == null
			? null
			: (weightRange.fatDelta > 0 ? '+' : '') + fmt(weightRange.fatDelta) + '% grasa'
	);

	const weightHistory = $derived([...weights.records].reverse());

	let selectedWeight = $state<number | null>(null);

	function tapWeightChart(e: PointerEvent) {
		const range = weightRange;
		if (!range) return;
		const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const scale = rect.width / 310;
		const x = (e.clientX - rect.left) / scale;
		const y = (e.clientY - rect.top) / scale;
		let best = -1;
		let bestD = 24 * 24;
		range.dots.forEach((d, i) => {
			const dx = Number(d.x) - x;
			const dy = Number(d.y) - y;
			const d2 = dx * dx + dy * dy;
			if (d2 < bestD) {
				bestD = d2;
				best = i;
			}
		});
		selectedWeight = best === selectedWeight ? null : best >= 0 ? best : null;
	}

	let confirmWeight = $state<Weight | null>(null);

	async function deleteWeight() {
		const record = confirmWeight;
		if (!record?.id) return;
		await weights.remove(record.id);
		const latest = weights.records.at(-1);
		if (weightInput === String(record.weight)) {
			weightInput = latest ? String(latest.weight) : '';
			bodyFatInput = latest?.bodyFat ? String(latest.bodyFat) : '';
		}
	}

function weightDateLabel(date: string) {
	return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function weightTimeLabel(record: { createdAt: number }) {
	return new Date(record.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

	async function saveWeight() {
		const w = toNumber(weightInput);
		if (!w || w <= 0) return;
		const fat = toNumber(bodyFatInput);
		await weights.save(today(), w, fat > 0 ? fat : undefined);
		weightSaved = true;
		setTimeout(() => (weightSaved = false), 2500);
	}

	weights.load().then(() => {
		const latest = weights.records.at(-1);
		if (latest) {
			weightInput = String(latest.weight);
			if (latest.bodyFat) bodyFatInput = String(latest.bodyFat);
		}
	});
</script>

<Card>
	<CardContent class="flex flex-col gap-2.5">
		<h2 class="text-base font-semibold">Perfil</h2>
		<div class="grid grid-cols-3 gap-2">
			<div>
				<Label class="mb-1 block">Altura (cm)</Label>
				<Input type="text" min="100" max="250" bind:value={pform.height} inputmode="numeric" />
			</div>
			<div>
				<Label class="mb-1 block">Peso (kg)</Label>
				<Input type="text" min="30" max="250" bind:value={pform.weight} inputmode="decimal" />
			</div>
			<div>
				<Label class="mb-1 block">Edad</Label>
				<Input type="text" min="10" max="120" bind:value={pform.age} inputmode="numeric" />
			</div>
		</div>
		<div>
			<Label class="mb-1 block">Sexo</Label>
			<Select.Root bind:value={pform.sex} items={SEX_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}>
				<Select.Trigger class="w-full">
					<SelectPrimitive.Value placeholder="Sexo" />
				</Select.Trigger>
				<Select.Content>
					{#each SEX_OPTIONS as option}
						<Select.Item value={option.key} label={option.label}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div>
			<Label class="mb-1 block">Nivel de actividad</Label>
			<Select.Root bind:value={pform.activity} items={ACTIVITY_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}>
				<Select.Trigger class="w-full">
					<SelectPrimitive.Value placeholder="Nivel de actividad" />
				</Select.Trigger>
				<Select.Content>
					{#each ACTIVITY_OPTIONS as option}
						<Select.Item value={option.key} label={option.label}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div>
			<Label class="mb-1 block">Objetivo</Label>
			<Select.Root bind:value={pform.goal} items={GOAL_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}>
				<Select.Trigger class="w-full">
					<SelectPrimitive.Value placeholder="Objetivo" />
				</Select.Trigger>
				<Select.Content>
					{#each GOAL_OPTIONS as option}
						<Select.Item value={option.key} label={option.label}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		{#if profileBreakdown}
			<div class="grid gap-1 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
				<p class="font-semibold text-foreground">
					Objetivos calculados: {fmt(profileBreakdown.totals.kcal)} kcal · G {fmt(profileBreakdown.totals.fat)} g · C {fmt(profileBreakdown.totals.carbs)} g · F {fmt(profileBreakdown.totals.fiber)} g · P {fmt(profileBreakdown.totals.protein)} g
				</p>
				<p>
					TMB (Harris-Benedict): {fmt(profileBreakdown.tmb)} kcal × {fmt(profileBreakdown.activityFactor, 3)} (actividad) = <span class="font-semibold text-foreground">{fmt(profileBreakdown.tdee)} kcal/día</span>
				</p>
				<p>
					Ajuste objetivo ({GOAL_SHORT[pform.goal]}): {profileBreakdown.adjustment > 0 ? '+' : ''}{fmt(profileBreakdown.adjustment)} kcal → <span class="font-semibold text-foreground">{fmt(profileBreakdown.totals.kcal)} kcal</span>
				</p>
				<p>
					Proteína: {fmt(weightKg)} kg × 2.1 = <span class="font-semibold text-foreground">{fmt(profileBreakdown.totals.protein)} g</span>
				</p>
				<p>
					Grasa: {fmt(weightKg)} kg × 0.9 = <span class="font-semibold text-foreground">{fmt(profileBreakdown.totals.fat)} g</span>
				</p>
				<p>
					Carbohidratos: ({fmt(profileBreakdown.totals.kcal)} − {fmt(profileBreakdown.totals.protein * 4)} − {fmt(profileBreakdown.totals.fat * 9)}) ÷ 4 = <span class="font-semibold text-foreground">{fmt(profileBreakdown.totals.carbs)} g</span>
				</p>
			</div>
		{:else}
			<p class="text-xs text-muted-foreground">Rellena altura, peso y edad para calcular tus objetivos (Harris-Benedict).</p>
		{/if}
	</CardContent>
</Card>

<Card>
	<CardContent class="flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<h2 class="text-base font-semibold">Peso</h2>
			{#if deltaLabel}
				<span class="text-xs text-muted-foreground"
					>30 días · <span class={weightRange!.delta <= 0 ? 'text-green-500' : 'text-red-500'}>{deltaLabel}</span>{#if fatDeltaLabel}
						· <span class={weightRange!.fatDelta! <= 0 ? 'text-green-500' : 'text-red-500'}>{fatDeltaLabel}</span>{/if}</span
				>
			{/if}
		</div>
		<div class="flex items-end gap-2">
			<div class="w-32">
				<Label class="mb-1 block">Peso actual (kg)</Label>
				<Input
					type="text"
					min="30"
					max="250"
					step="0.1"
					bind:value={weightInput}
					inputmode="decimal"
					placeholder={profile.value ? String(profile.value.weight) : ''}
				/>
			</div>
			<div class="w-28">
				<Label class="mb-1 block">% de grasa <span class="text-muted-foreground">(opcional)</span></Label>
				<Input
					type="text"
					min="1"
					max="70"
					step="0.1"
					bind:value={bodyFatInput}
					inputmode="decimal"
					placeholder="—"
				/>
			</div>
			<Button onclick={saveWeight} disabled={!weightInput.trim()}>
				{weightSaved ? 'Guardado ✓' : 'Guardar'}
			</Button>
		</div>
		{#if weightRange}
			<svg viewBox="0 0 310 120" class="w-full text-primary" role="img" aria-label="Gráfica de peso">
				<line x1="40" y1="106" x2="298" y2="106" stroke="currentColor" stroke-width="1" opacity="0.5" />
				<line x1="40" y1="10" x2="40" y2="106" stroke="currentColor" stroke-width="1" opacity="0.5" />
				{#each weightRange.grid as g}
					<line x1="40" y1={g.y} x2="298" y2={g.y} stroke="currentColor" stroke-width="1" opacity="0.15" />
					<text x="34" y={Number(g.y) + 3} font-size="8.5" text-anchor="end" fill="currentColor" opacity="0.6">{g.label}</text>
				{/each}
				{#each weightRange.xLabels as l}
					<text x={l.x} y="116" font-size="8.5" text-anchor={l.anchor} fill="currentColor" opacity="0.6">{l.label}</text>
				{/each}
				<polyline
					points={weightRange.points}
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				{#each weightRange.dots as dot, i}
					<circle cx={dot.x} cy={dot.y} r={selectedWeight === i ? 5 : 3} fill="currentColor" />
				{/each}
				{#if selectedWeight !== null && weightRange.info[selectedWeight]}
					{@const p = weightRange.info[selectedWeight]}
					{@const label = weightDateLabel(p.date) + ' · ' + fmt(p.weight) + ' kg' + (p.bodyFat ? ' · ' + fmt(p.bodyFat) + '% grasa' : '')}
					{@const py = Number(p.y)}
					{@const ty = py >= 34 ? py - 14 : py + 28}
					<g pointer-events="none">
						<rect x="0" y={ty - 11} width="310" height="22" fill="var(--background)" stroke="currentColor" stroke-width="1" rx="4" />
						<text x="155" y={ty + 3} font-size="8.5" text-anchor="middle" fill="currentColor">{label}</text>
					</g>
				{/if}
				<rect
					x="0"
					y="0"
					width="310"
					height="120"
					fill="transparent"
					role="button"
					tabindex="0"
					aria-label="Seleccionar punto de la gráfica de peso"
					onpointerdown={tapWeightChart}
					onkeydown={(e) => {
						if (!['Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
						e.preventDefault();
						if (!weightRange) return;
						const n = weightRange.dots.length;
						if (e.key === 'Enter' || e.key === ' ') selectedWeight = selectedWeight === null ? 0 : null;
						else selectedWeight = selectedWeight === null ? 0 : (selectedWeight + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
					}}
				/>
			</svg>
		{:else}
			<p class="text-sm text-muted-foreground">Registra tu peso un par de días para ver la tendencia.</p>
		{/if}
		{#if weightHistory.length > 0}
			<ul class="max-h-44 divide-y divide-border overflow-y-auto border-t border-border pt-1">
				{#each weightHistory as record}
					<li class="flex items-center justify-between gap-2 py-1.5 text-sm">
						<span class="text-muted-foreground capitalize">{weightDateLabel(record.date)} · {weightTimeLabel(record)}</span>
						<span class="flex items-center gap-2">
							<span class="font-semibold">{fmt(record.weight)} kg{#if record.bodyFat} · {fmt(record.bodyFat)}% grasa{/if}</span>
							<Button
								variant="ghost"
								size="icon-sm"
								class="text-destructive hover:text-destructive"
								onclick={() => (confirmWeight = record)}
								title="Eliminar"
								aria-label="Eliminar"
							>
								<Trash2Icon />
							</Button>
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted-foreground">Todavía no hay pesos registrados.</p>
		{/if}
	</CardContent>
</Card>

<ConfirmDialog
	open={confirmWeight !== null}
	title="Eliminar peso"
	message={'¿Eliminar el registro de ' + (confirmWeight ? fmt(confirmWeight.weight) + ' kg del ' + weightDateLabel(confirmWeight.date) : '') + '? Esta acción no se puede deshacer.'}
	onConfirm={deleteWeight}
	onClose={() => (confirmWeight = null)}
/>
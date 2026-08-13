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
		const points = slice.map((r) => {
			const age = (todayMs - new Date(r.date + 'T12:00:00').getTime()) / DAY;
			const x = 300 - age * 10;
			const y = 110 - ((r.weight - min + pad) / (max - min + pad * 2)) * 100;
			return { x: x.toFixed(1), y: y.toFixed(1) };
		});
		return {
			points: points.map((p) => p.x + ',' + p.y).join(' '),
			dots: points,
			delta: slice.at(-1)!.weight - slice[0].weight
		};
	});

	const deltaLabel = $derived(
		weightRange ? (weightRange.delta > 0 ? '+' : '') + fmt(weightRange.delta) + ' kg' : null
	);

	const weightHistory = $derived([...weights.records].reverse());

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
					Objetivos calculados: {fmt(profileBreakdown.totals.kcal)} kcal · P {fmt(profileBreakdown.totals.protein)} g · C {fmt(profileBreakdown.totals.carbs)} g · G {fmt(profileBreakdown.totals.fat)} g · F {fmt(profileBreakdown.totals.fiber)} g
				</p>
				<p>
					TMB (Harris-Benedict): {fmt(profileBreakdown.tmb)} kcal × {fmt(profileBreakdown.activityFactor, 3)} (actividad) = {fmt(profileBreakdown.tdee)} kcal/día
				</p>
				<p>
					Ajuste objetivo ({GOAL_SHORT[pform.goal]}): {profileBreakdown.adjustment > 0 ? '+' : ''}{fmt(profileBreakdown.adjustment)} kcal → {fmt(profileBreakdown.totals.kcal)} kcal
				</p>
				<p>
					Proteína: {fmt(weightKg)} kg × 2.1 = {fmt(profileBreakdown.totals.protein)} g · Grasa: {fmt(weightKg)} kg × 0.9 = {fmt(profileBreakdown.totals.fat)} g
				</p>
				<p>
					Carbohidratos: ({fmt(profileBreakdown.totals.kcal)} − {fmt(profileBreakdown.totals.protein * 4)} − {fmt(profileBreakdown.totals.fat * 9)}) ÷ 4 = {fmt(profileBreakdown.totals.carbs)} g
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
				<span class="text-xs text-muted-foreground">30 días · {deltaLabel}</span>
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
			<svg viewBox="0 0 310 120" class="w-full text-primary" aria-hidden="true">
				<polyline
					points={weightRange.points}
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				{#each weightRange.dots as dot}
					<circle cx={dot.x} cy={dot.y} r="3" fill="currentColor" />
				{/each}
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
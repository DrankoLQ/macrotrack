<script lang="ts">
	import { onMount } from 'svelte';
	import { diary, goals, today, profile, saveGoals, saveProfile } from '$lib/stores.svelte';
	import {
		computeGoals,
		type ActivityLevel,
		type Goal,
		type Sex
	} from '$lib/stores.svelte';
	import { fmt } from '$lib/format';
	import { MEAL_TYPES, type Entry, type MealType } from '$lib/db';
	import MacroBar from '$lib/components/MacroBar.svelte';
	import FoodPicker from '$lib/components/FoodPicker.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Select as SelectPrimitive } from 'bits-ui';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	const macros = [
		{ key: 'kcal', label: 'Calorías', unit: 'kcal' },
		{ key: 'protein', label: 'Proteínas', unit: 'g' },
		{ key: 'carbs', label: 'Hidratos', unit: 'g' },
		{ key: 'fat', label: 'Grasas', unit: 'g' },
		{ key: 'fiber', label: 'Fibra', unit: 'g' }
	] as const;

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

	const profileTotals = $derived.by(() => {
		const height = parseFloat(pform.height);
		const weight = parseFloat(pform.weight);
		const age = parseFloat(pform.age);
		if (!height || !weight || !age) return null;
		return computeGoals({ height, weight, age, sex: pform.sex, activity: pform.activity, goal: pform.goal });
	});

	$effect(() => {
		if (!profileTotals) return;
		Object.assign(goals, profileTotals);
		saveGoals();
		saveProfile({
			height: parseFloat(pform.height),
			weight: parseFloat(pform.weight),
			age: parseFloat(pform.age),
			sex: pform.sex,
			activity: pform.activity,
			goal: pform.goal
		});
	});

	const dateLabel = $derived(
		new Date(diary.date + 'T12:00:00').toLocaleDateString('es-ES', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		})
	);

	const groups = $derived.by(() =>
		MEAL_TYPES.map((type) => {
			const entries = diary.entries.filter((entry) => (entry.mealType ?? 'comida') === type.key);
			if (entries.length === 0) return null;
			return {
				...type,
				entries,
				totals: {
					kcal: entries.reduce((acc, e) => acc + e.kcal, 0),
					protein: entries.reduce((acc, e) => acc + e.protein, 0),
					carbs: entries.reduce((acc, e) => acc + e.carbs, 0),
					fat: entries.reduce((acc, e) => acc + e.fat, 0),
					fiber: entries.reduce((acc, e) => acc + e.fiber, 0)
				}
			};
		}).filter((group): group is NonNullable<typeof group> => group !== null)
	);

	let editingId = $state<number | null>(null);
	let editGrams = $state('100');
	let editUnits = $state('1');
	let editType = $state<MealType>('comida');
	let confirmEntry = $state<Entry | null>(null);

	function startEdit(entry: Entry) {
		editingId = entry.id!;
		editGrams = String(entry.grams);
		editUnits = String(entry.units ?? 1);
		editType = entry.mealType ?? 'comida';
	}

	async function saveEdit() {
		if (editingId === null) return;
		const entry = diary.entries.find((entry) => entry.id === editingId);
		if (!entry) return;
		const byUnit = entry.unitSize !== undefined;
		const grams = byUnit ? parseFloat(editUnits) * entry.unitSize! : parseFloat(editGrams);
		if (grams > 0)
			await diary.updateEntry(editingId, {
				grams,
				units: byUnit ? parseFloat(editUnits) : undefined,
				mealType: editType
			});
		editingId = null;
	}

	onMount(() => diary.load());

	function shift(days: number) {
		const date = new Date(diary.date + 'T12:00:00');
		date.setDate(date.getDate() + days);
		diary.setDate(date.toLocaleDateString('en-CA'));
	}
</script>

<Card>
	<CardContent class="flex items-center justify-between gap-2">
		<Button variant="outline" size="icon-sm" onclick={() => shift(-1)} aria-label="Día anterior">
			<ChevronLeftIcon />
		</Button>
		<span class="flex-1 text-center text-sm capitalize">{dateLabel}</span>
		<Button variant="outline" size="icon-sm" onclick={() => shift(1)} aria-label="Día siguiente">
			<ChevronRightIcon />
		</Button>
		<Button variant="outline" size="sm" onclick={() => diary.setDate(today())}>Hoy</Button>
	</CardContent>
</Card>

<Card>
	<CardContent>
		<h2 class="mb-3 text-base font-semibold">Totales</h2>
		<div class="flex flex-col gap-3">
			{#each macros as macro}
				<MacroBar
					label={macro.label}
					value={diary.totals[macro.key]}
					goal={goals[macro.key]}
					unit={macro.unit}
				/>
			{/each}
		</div>
		<details class="mt-3">
			<summary class="cursor-pointer text-xs font-medium text-muted-foreground select-none">Perfil</summary>
			<div class="mt-2 flex flex-col gap-2.5">
				<div class="grid grid-cols-3 gap-2">
					<div>
						<Label class="mb-1 block">Altura (cm)</Label>
						<Input type="number" min="100" max="250" bind:value={pform.height} inputmode="numeric" />
					</div>
					<div>
						<Label class="mb-1 block">Peso (kg)</Label>
						<Input type="number" min="30" max="250" bind:value={pform.weight} inputmode="decimal" />
					</div>
					<div>
						<Label class="mb-1 block">Edad</Label>
						<Input type="number" min="10" max="120" bind:value={pform.age} inputmode="numeric" />
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
				{#if profileTotals}
					<p class="text-xs text-muted-foreground">
						Objetivos calculados: {fmt(profileTotals.kcal)} kcal · P {fmt(profileTotals.protein)} · C {fmt(profileTotals.carbs)} · G {fmt(profileTotals.fat)} · F {fmt(profileTotals.fiber)}
					</p>
				{:else}
					<p class="text-xs text-muted-foreground">Rellena altura, peso y edad para calcular tus objetivos (Harris-Benedict).</p>
				{/if}
			</div>
		</details>
	</CardContent>
</Card>

<Card>
	<CardContent>
		<h2 class="mb-3 text-base font-semibold">Añadir</h2>
		<FoodPicker onAdd={(food, grams, mealType, units) => diary.addFood(food, grams, mealType, units)} />
	</CardContent>
</Card>

<Card>
	<CardContent>
		<h2 class="mb-3 text-base font-semibold">Comidas ({diary.entries.length})</h2>
		{#if diary.entries.length === 0}
			<p class="text-sm text-muted-foreground">Nada registrado todavía.</p>
		{:else}
			{#each groups as group}
				<div class="group">
					<div class="flex items-baseline justify-between gap-2 rounded-lg bg-secondary px-2.5 py-2">
						<strong class="text-sm">{group.label}</strong>
						<small class="text-xs text-muted-foreground">
							{fmt(group.totals.kcal)} kcal · P {fmt(group.totals.protein)} · C {fmt(group.totals.carbs)} · G {fmt(group.totals.fat)} · F {fmt(group.totals.fiber)}
						</small>
					</div>
					<ul>
						{#each group.entries as entry (entry.id)}
							<li class="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-b-0">
								{#if editingId === entry.id}
									<div class="flex w-full flex-wrap items-end gap-2">
										<div class="min-w-[90px] flex-1">
											<Label class="mb-1 block">{entry.unitSize !== undefined ? 'Unidades' : 'Gramos'}</Label>
											{#if entry.unitSize !== undefined}
												<Input type="number" min="0.1" bind:value={editUnits} inputmode="decimal" />
											{:else}
												<Input type="number" min="1" bind:value={editGrams} inputmode="decimal" />
											{/if}
										</div>
										<div class="min-w-[120px] flex-1">
											<Label class="mb-1 block">Tipo</Label>
											<Select.Root bind:value={editType}>
												<Select.Trigger class="w-full">
													<SelectPrimitive.Value placeholder="Tipo" />
												</Select.Trigger>
												<Select.Content>
													{#each MEAL_TYPES as type}
														<Select.Item value={type.key}>{type.label}</Select.Item>
													{/each}
												</Select.Content>
											</Select.Root>
										</div>
										<div class="flex gap-2">
											<Button size="sm" onclick={saveEdit}>Guardar</Button>
											<Button size="sm" variant="outline" onclick={() => (editingId = null)}>Cancelar</Button>
										</div>
									</div>
								{:else}
									<div class="flex min-w-0 flex-col gap-0.5">
										<strong class="text-sm">{entry.name}</strong>
										<small class="text-xs text-muted-foreground">
											{#if entry.units !== undefined}{fmt(entry.units)} ud · {/if}{fmt(entry.grams)} g · {fmt(entry.kcal)} kcal · P {fmt(entry.protein)} · C {fmt(entry.carbs)} · G {fmt(entry.fat)} · F {fmt(entry.fiber)}
										</small>
									</div>
									<div class="flex shrink-0 gap-1.5">
										<Button variant="ghost" size="icon-sm" onclick={() => startEdit(entry)} title="Editar" aria-label="Editar">
											<PencilIcon />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											class="text-destructive hover:text-destructive"
											onclick={() => (confirmEntry = entry)}
											title="Eliminar"
											aria-label="Eliminar"
										>
											<Trash2Icon />
										</Button>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		{/if}
	</CardContent>
</Card>

<ConfirmDialog
	open={confirmEntry !== null}
	title="Eliminar comida"
	message={'¿Eliminar «' + (confirmEntry?.name ?? '') + '» (' + (confirmEntry?.units !== undefined ? (confirmEntry?.units ?? '') + ' ud · ' : '') + (confirmEntry?.grams ?? '') + ' g) del diario? Esta acción no se puede deshacer.'}
	onConfirm={() => {
		if (confirmEntry?.id !== undefined) diary.remove(confirmEntry.id);
	}}
	onClose={() => (confirmEntry = null)}
/>

<style>
	.group + .group {
		margin-top: 14px;
	}
</style>
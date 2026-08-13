<script lang="ts">
	import { onMount } from 'svelte';
	import { diary, goals, today } from '$lib/stores.svelte';
	import { fmt, toNumber } from '$lib/format';
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
	import type { ChartDirection } from '$lib/chart';
	import type { Totals } from '$lib/macros';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	const macros: { key: keyof Totals; label: string; unit: string; direction: ChartDirection }[] = [
		{ key: 'kcal', label: 'Calorías', unit: 'kcal', direction: 'max' },
		{ key: 'protein', label: 'Proteínas', unit: 'g', direction: 'min' },
		{ key: 'carbs', label: 'Hidratos', unit: 'g', direction: 'max' },
		{ key: 'fat', label: 'Grasas', unit: 'g', direction: 'max' },
		{ key: 'fiber', label: 'Fibra', unit: 'g', direction: 'min' }
	];

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
		const grams = byUnit ? toNumber(editUnits) * entry.unitSize! : toNumber(editGrams);
		if (grams > 0)
			await diary.updateEntry(editingId, {
				grams,
				units: byUnit ? toNumber(editUnits) : undefined,
				mealType: editType
			});
		editingId = null;
	}

	onMount(() => {
		diary.load();
	});

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
					direction={macro.direction}
				/>
			{/each}
		</div>
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
												<Input type="text" min="0.1" bind:value={editUnits} inputmode="decimal" />
											{:else}
												<Input type="text" min="1" bind:value={editGrams} inputmode="decimal" />
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
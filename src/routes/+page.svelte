<script lang="ts">
	import { onMount } from 'svelte';
	import { dayGoals, diary, goals as baseGoals, profile, today } from '$lib/stores.svelte';
	import { fmt, toNumber } from '$lib/format';
	import { MEAL_TYPES, suggestMealType, type Entry, type Food, type MealType, type Recipe } from '$lib/db';
	import MacroBar from '$lib/components/MacroBar.svelte';
	import FoodPicker from '$lib/components/FoodPicker.svelte';
	import RecipePicker from '$lib/components/RecipePicker.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Progress } from '$lib/components/ui/progress';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils';
	import * as Select from '$lib/components/ui/select';
	import { DropdownMenu, Select as SelectPrimitive } from 'bits-ui';
	import { MACROS } from '$lib/macros';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import InfoIcon from '@lucide/svelte/icons/info';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';

	const dateLabel = $derived.by(() => {
		const label = new Date(diary.date + 'T12:00:00').toLocaleDateString('es-ES', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
		return label.charAt(0).toUpperCase() + label.slice(1);
	});

	const groups = $derived.by(() =>
		MEAL_TYPES.map((type) => {
			const entries = diary.entries.filter((entry) => (entry.mealType ?? 'comida') === type.key);
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
		})
	);

	const goals = $derived(dayGoals(baseGoals, profile.value, diary.training));
	const restGoals = $derived(dayGoals(baseGoals, profile.value, false));

	const kcalRemaining = $derived(goals.kcal - diary.totals.kcal);
	const kcalOver = $derived(kcalRemaining < 0);
	const kcalPct = $derived(goals.kcal > 0 ? Math.min(100, (diary.totals.kcal / goals.kcal) * 100) : 0);

	let editingId = $state<number | null>(null);
	let editGrams = $state('100');
	let editUnits = $state('1');
	let editType = $state<MealType>('comida');
	let confirmEntry = $state<Entry | null>(null);
	let savingCompletion = $state(false);
	let completionError = $state('');
	let showHelper = $state(false);
	let addOpen = $state(false);
	let addMealType = $state<MealType>(suggestMealType());
	let addFilterMealType = $state<MealType | undefined>(undefined);
	let addTab = $state<'alimento' | 'receta'>('alimento');
	let viewport = $state({ top: 0, height: 0 });

	// Con el teclado abierto iOS desplaza el viewport visual y descuadra el diálogo fijo.
	$effect(() => {
		if (!addOpen || typeof window === 'undefined' || !window.visualViewport) return;
		const vv = window.visualViewport;
		const update = () => {
			viewport = { top: vv.offsetTop, height: vv.height };
		};
		update();
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
		};
	});

	const dialogStyle = $derived(
		viewport.height > 0
			? `top: ${viewport.top + viewport.height / 2}px; max-height: ${viewport.height - 32}px;`
			: undefined
	);

	function openAdd(mealType?: MealType) {
		addMealType = mealType ?? suggestMealType();
		addFilterMealType = mealType;
		addTab = 'alimento';
		addOpen = true;
	}

	async function handleAdd(food: Food, grams: number, mealType: MealType, units?: number) {
		await diary.addFood(food, grams, mealType, units);
		addOpen = false;
	}

	async function handleAddRecipe(recipe: Recipe, mealType: MealType, grams: number) {
		await diary.addRecipe(recipe, mealType, grams);
		addOpen = false;
	}

	async function toggleComplete() {
		savingCompletion = true;
		completionError = '';
		try {
			await diary.setComplete(!diary.complete);
		} catch {
			completionError = 'No se pudo guardar la confirmación. Inténtalo de nuevo.';
		} finally {
			savingCompletion = false;
		}
	}

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
	<CardContent>
		<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-base font-semibold">Totales</h2>
			<div class="flex items-center gap-1">
				{#if diary.date !== today()}
					<Button variant="outline" size="sm" onclick={() => diary.setDate(today())}>Hoy</Button>
				{/if}
				<Button
					variant={diary.complete ? 'secondary' : 'outline'}
					size="sm"
					aria-pressed={diary.complete}
					disabled={diary.loading || savingCompletion || (!diary.complete && (!diary.entries.length || diary.date > today()))}
					onclick={toggleComplete}
				>{savingCompletion ? 'Guardando…' : diary.complete ? '✓ Día completo' : 'Marcar día completo'}</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Más información sobre el día completo"
					aria-expanded={showHelper}
					onclick={() => (showHelper = !showHelper)}
				>
					<InfoIcon />
				</Button>
			</div>
		</div>
		<div class="mb-4 flex items-center justify-between gap-2">
			<Button variant="outline" size="icon-sm" onclick={() => shift(-1)} aria-label="Día anterior">
				<ChevronLeftIcon />
			</Button>
			<label
				class="relative min-w-0 flex-1 cursor-pointer rounded-lg px-2 py-1 text-center text-sm font-medium hover:bg-muted has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring"
			>
				<span class="block truncate">{dateLabel}</span>
				<input
					type="date"
					class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					value={diary.date}
					aria-label="Elegir fecha"
					onchange={(event) => diary.setDate(event.currentTarget.value)}
				/>
			</label>
			<Button variant="outline" size="icon-sm" onclick={() => shift(1)} aria-label="Día siguiente">
				<ChevronRightIcon />
			</Button>
		</div>
		{#if showHelper}
			<p class="mb-4 text-xs text-muted-foreground">
				{diary.complete
					? 'Día confirmado. Puedes desmarcarlo si faltan comidas; editar registros mantiene la confirmación.'
					: 'Confirma cuando hayas registrado todo el día para incluirlo en el balance semanal.'}
			</p>
		{/if}
		{#if restGoals !== baseGoals}
			<label class="mb-4 flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="size-4 accent-primary"
					checked={diary.training}
					disabled={diary.loading}
					onchange={(event) => diary.setTraining(event.currentTarget.checked)}
				/>
				Día de entreno
				<span class="text-xs text-muted-foreground">({fmt(baseGoals.kcal)} kcal; descanso {fmt(restGoals.kcal)} kcal)</span>
			</label>
		{/if}
		{#if completionError}<p role="alert" class="mb-4 text-sm text-destructive">{completionError}</p>{/if}
		<p class="text-xs text-muted-foreground">{kcalOver ? 'Excedidas' : 'Restantes'}</p>
		<p class="text-3xl font-bold tabular-nums" class:text-destructive={kcalOver}>
			{fmt(kcalOver ? -kcalRemaining : kcalRemaining)}
			<span class="text-sm font-normal text-muted-foreground">kcal</span>
		</p>
		<p class="text-xs text-muted-foreground">{fmt(diary.totals.kcal)} de {fmt(goals.kcal)} kcal</p>
		<Progress
			value={kcalPct}
			class={cn('mt-2 h-2', kcalOver && '[&_[data-slot=progress-indicator]]:bg-destructive')}
		/>
		<div class="mt-4 flex flex-col gap-2.5">
			{#each MACROS.slice(1) as macro}
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

<!-- El margen deja sitio al FAB: sin él tapa el menú de la última comida -->
<Card class="mb-12">
	<CardContent>
		<h2 class="mb-3 text-base font-semibold">Comidas ({diary.entries.length})</h2>
		{#each groups as group}
			<div class="group">
				<div class="rounded-lg bg-secondary px-2.5 py-2">
					<div class="flex items-center justify-between gap-2">
						<strong class="text-sm">{group.label}</strong>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={`Añadir a ${group.label}`}
							onclick={() => openAdd(group.key)}
						>
							<PlusIcon />
						</Button>
					</div>
					{#if group.entries.length > 0}
						<small class="block text-xs text-muted-foreground">
							{fmt(group.totals.kcal)} kcal · G {fmt(group.totals.fat)} · C {fmt(group.totals.carbs)} · F {fmt(group.totals.fiber)} · P {fmt(group.totals.protein)}
						</small>
					{:else}
						<small class="block text-xs text-muted-foreground">Sin registros</small>
					{/if}
				</div>
				{#if group.entries.length > 0}
					<ul>
						{#each group.entries as entry (entry.id)}
							<li class="border-b border-border py-2.5 last:border-b-0">
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
									<div class="flex items-center gap-2">
										<div class="flex min-w-0 flex-1 flex-col gap-0.5">
											<div class="flex items-baseline justify-between gap-2">
												<strong class="min-w-0 truncate text-sm">{entry.name}</strong>
												<small class="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
													{#if entry.units !== undefined}{fmt(entry.units)} ud · {/if}{fmt(entry.grams)} g
												</small>
											</div>
											<small class="truncate text-xs text-muted-foreground">
												{fmt(entry.kcal)} kcal · G {fmt(entry.fat)} · C {fmt(entry.carbs)} · F {fmt(entry.fiber)} · P {fmt(entry.protein)}
											</small>
										</div>
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${entry.name}`} {...props}>
														<EllipsisVerticalIcon />
													</Button>
												{/snippet}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content class="z-50 min-w-36 rounded-lg bg-popover p-1 shadow-lg ring-1 ring-foreground/10">
												<DropdownMenu.Item
													class="flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
													onclick={() => startEdit(entry)}
												>
													<PencilIcon class="size-3.5" />
													Editar
												</DropdownMenu.Item>
												<DropdownMenu.Item
													class="flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-none data-[highlighted]:bg-muted"
													onclick={() => (confirmEntry = entry)}
												>
													<Trash2Icon class="size-3.5" />
													Eliminar
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</CardContent>
</Card>

<div class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40">
	<div class="mx-auto flex max-w-[640px] justify-end px-4">
		<Button class="pointer-events-auto size-12 rounded-full shadow-lg" aria-label="Añadir alimento" onclick={() => openAdd()}>
			<PlusIcon class="size-6" />
		</Button>
	</div>
</div>

<Dialog.Root bind:open={addOpen}>
	<Dialog.Content class="overflow-y-auto overscroll-contain" style={dialogStyle}>
		<Dialog.Header>
			<Dialog.Title>Añadir al diario</Dialog.Title>
		</Dialog.Header>
		<div class="flex gap-0.5 rounded-lg border border-border bg-card p-0.5">
			<Button
				variant="ghost"
				size="sm"
				class="flex-1 {addTab === 'alimento' ? 'bg-secondary text-foreground' : ''}"
				aria-pressed={addTab === 'alimento'}
				onclick={() => (addTab = 'alimento')}
			>Alimento</Button>
			<Button
				variant="ghost"
				size="sm"
				class="flex-1 {addTab === 'receta' ? 'bg-secondary text-foreground' : ''}"
				aria-pressed={addTab === 'receta'}
				onclick={() => (addTab = 'receta')}
			>Receta</Button>
		</div>
		{#if addTab === 'alimento'}
			<FoodPicker initialMealType={addMealType} onAdd={handleAdd} />
		{:else}
			<RecipePicker initialMealType={addFilterMealType} onAdd={handleAddRecipe} />
		{/if}
	</Dialog.Content>
</Dialog.Root>

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

<script lang="ts">
	import { MEAL_TYPES, type Food, type MealType, type Recipe, type RecipeItem } from '$lib/db';
	import { fmt, toNumber } from '$lib/format';
	import { parseOptionalNutrient } from '$lib/nutrient-input';
	import { MACROS } from '$lib/macros';
	import { recipeGrams, recipeItem, recipeTotals } from '$lib/recipes';
	import FoodPicker from './FoodPicker.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import XIcon from '@lucide/svelte/icons/x';

	let {
		initial,
		submitLabel = 'Guardar receta',
		onSave
	}: {
		initial?: Recipe;
		submitLabel?: string;
		onSave: (data: { name: string; mealTypes: MealType[]; items: RecipeItem[] }) => void;
	} = $props();

	// El padre recrea el formulario con {#key}, así que basta con el valor inicial.
	// svelte-ignore state_referenced_locally
	let name = $state(initial?.name ?? '');
	// svelte-ignore state_referenced_locally
	let mealTypes = $state<MealType[]>([...(initial?.mealTypes ?? [])]);
	// svelte-ignore state_referenced_locally
	let items = $state<RecipeItem[]>(initial?.items.map((item) => ({ ...item })) ?? []);
	/** Receta al vuelo: las macros del plato entero, sin pesar ingredientes. */
	let manual = $state(false);
	let portion = $state('100');
	let macros = $state({ kcal: '', fat: '', carbs: '', fiber: '', protein: '', saturatedFat: '', sugars: '' });

	const num = (value: string) => toNumber(value) || 0;

	function toggleMeal(key: MealType) {
		mealTypes = mealTypes.includes(key) ? mealTypes.filter((m) => m !== key) : [...mealTypes, key];
	}
	let error = $state('');

	const totals = $derived(recipeTotals(items));

	function addFood(food: Food, grams: number, _mealType: unknown, units?: number) {
		items = [...items, recipeItem(food, grams, units)];
		error = '';
	}

	function submit() {
		const trimmed = name.trim();
		if (!trimmed) {
			error = 'Ponle un nombre a la receta';
			return;
		}
		const grams = num(portion);
		if (manual && !(grams > 0)) {
			error = 'Pon cuánto pesa la ración';
			return;
		}
		if (!manual && items.length === 0) {
			error = 'Añade al menos un alimento';
			return;
		}
		const saturatedFat = parseOptionalNutrient(manual ? macros.saturatedFat : '');
		const sugars = parseOptionalNutrient(manual ? macros.sugars : '');
		if (!saturatedFat.ok || !sugars.ok) {
			error = 'Introduce cantidades finitas y no negativas, o deja el campo vacío';
			return;
		}
		error = '';
		const saved = manual
			? [{
					name: trimmed,
					grams,
					kcal: num(macros.kcal),
					fat: num(macros.fat),
					carbs: num(macros.carbs),
					fiber: num(macros.fiber),
					protein: num(macros.protein),
					...(saturatedFat.value === undefined ? {} : { saturatedFat: saturatedFat.value }),
					...(sugars.value === undefined ? {} : { sugars: sugars.value })
				}]
			: $state.snapshot(items);
		onSave({ name: trimmed, mealTypes: $state.snapshot(mealTypes), items: saved });
	}
</script>

{#snippet saturatedFatInput()}
	<div class="mt-2">
		<Label class="mb-1 block text-xs text-muted-foreground">Grasas saturadas / ración (g)</Label>
		<Input type="text" bind:value={macros.saturatedFat} inputmode="decimal" placeholder="Desconocido" />
	</div>
{/snippet}

{#snippet sugarsInput()}
	<div class="mt-2">
		<Label class="mb-1 block text-xs text-muted-foreground">Azúcares totales / ración (g)</Label>
		<Input type="text" bind:value={macros.sugars} inputmode="decimal" placeholder="Desconocido" />
	</div>
{/snippet}

<div class="flex flex-col gap-2.5">
	{#if error}<p class="text-sm text-destructive">{error}</p>{/if}
	<div>
		<Label class="mb-1 block">Nombre</Label>
		<Input bind:value={name} placeholder="Ej: Ensalada de garbanzos" />
		<p class="mt-1 text-xs text-muted-foreground">
			Una receta es una ración: pon las cantidades de un solo plato.
		</p>
	</div>
	<div>
		<Label class="mb-1 block">Momento del día</Label>
		<div class="flex flex-wrap gap-1">
			{#each MEAL_TYPES as type}
				<Button
					variant={mealTypes.includes(type.key) ? 'default' : 'outline'}
					size="sm"
					aria-pressed={mealTypes.includes(type.key)}
					onclick={() => toggleMeal(type.key)}
				>{type.label}</Button>
			{/each}
		</div>
		<p class="mt-1 text-xs text-muted-foreground">
			Opcional: si no marcas ninguno, la receta aparece en todas las comidas.
		</p>
	</div>
	<Button variant="outline" size="sm" onclick={() => (manual = !manual)}>
		{manual ? 'Componer con alimentos' : 'Meter macros a mano'}
	</Button>
	{#if manual}
		<div>
			<Label class="mb-1 block">Peso de la ración (g)</Label>
			<Input type="text" bind:value={portion} inputmode="decimal" />
			<p class="mt-1 text-xs text-muted-foreground">
				Si no lo sabes, deja 100: solo sirve para escalar porciones.
			</p>
		</div>
		<div class="grid grid-cols-2 gap-2">
			{#each MACROS as macro}
				<div>
					<Label class="mb-1 block">{macro.label} ({macro.unit})</Label>
					<Input type="text" bind:value={macros[macro.key]} inputmode="decimal" />
					{#if macro.key === 'fat'}
						{@render saturatedFatInput()}
					{:else if macro.key === 'carbs'}
						{@render sugarsInput()}
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<FoodPicker onAdd={addFood} showMealType={false} />
	{/if}
	{#if !manual && items.length > 0}
		<ul>
			{#each items as item, index (index)}
				<li class="flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0">
					<div class="flex min-w-0 flex-col gap-0.5">
						<strong class="text-sm">{item.name}</strong>
						<small class="text-xs text-muted-foreground">
							{#if item.units}{fmt(item.units)} ud · {/if}{fmt(item.grams)} g · {fmt(item.kcal, 0)} kcal
						</small>
					</div>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:text-destructive"
						onclick={() => (items = items.filter((_, i) => i !== index))}
						title="Quitar de la receta"
						aria-label="Quitar de la receta"
					>
						<XIcon />
					</Button>
				</li>
			{/each}
		</ul>
		<p class="text-sm">
			<strong>Ración</strong>
			<span class="text-muted-foreground">
				· {fmt(recipeGrams(items))} g · {fmt(totals.kcal, 0)} kcal · G {fmt(totals.fat)} · C {fmt(totals.carbs)} · F {fmt(totals.fiber)} · P {fmt(totals.protein)}
			</span>
		</p>
		<p class="pl-2 text-xs text-muted-foreground">Grasas saturadas: {totals.saturatedFat === null ? 'Sin datos completos' : `${fmt(totals.saturatedFat)} g`} / ración</p>
		<p class="pl-2 text-xs text-muted-foreground">Azúcares totales: {totals.sugars === null ? 'Sin datos completos' : `${fmt(totals.sugars)} g`} / ración</p>
	{/if}
	<Button onclick={submit}>{submitLabel}</Button>
</div>

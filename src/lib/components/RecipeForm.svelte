<script lang="ts">
	import { MEAL_TYPES, type Food, type MealType, type Recipe, type RecipeItem } from '$lib/db';
	import { fmt } from '$lib/format';
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
		if (items.length === 0) {
			error = 'Añade al menos un alimento';
			return;
		}
		onSave({ name: trimmed, mealTypes: $state.snapshot(mealTypes), items: $state.snapshot(items) });
	}
</script>

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
	<FoodPicker onAdd={addFood} showMealType={false} />
	{#if items.length > 0}
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
	{/if}
	<Button onclick={submit}>{submitLabel}</Button>
</div>

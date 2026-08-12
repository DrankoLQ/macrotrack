<script lang="ts">
	import { db, type Food, type MealType, MEAL_TYPES, suggestMealType } from '$lib/db';
	import { fmt } from '$lib/format';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Select as SelectPrimitive } from 'bits-ui';

	let { onAdd }: { onAdd: (food: Food, grams: number, mealType: MealType, units?: number) => void } = $props();

	let query = $state('');
	let foods: Food[] = $state([]);
	let selected: Food | null = $state(null);
	let grams = $state(100);
	let units = $state(1);
	let mealType = $state<MealType>(suggestMealType());

	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		return foods.filter((food) => food.name.toLowerCase().includes(q)).slice(0, 8);
	});

	$effect(() => {
		let cancelled = false;
		db.foods.toArray().then((all) => {
			if (!cancelled) foods = all;
		});
		return () => {
			cancelled = true;
		};
	});

	function pick(food: Food) {
		selected = food;
		query = '';
		mealType = suggestMealType();
	}

	function add() {
		if (!selected) return;
		const byUnit = selected.unitSize !== undefined;
		onAdd(selected, byUnit ? units * selected.unitSize! : grams, mealType, byUnit ? units : undefined);
		selected = null;
		grams = 100;
		units = 1;
		mealType = suggestMealType();
	}
</script>

<div class="flex flex-col gap-2">
	<Input type="search" placeholder="Buscar alimento…" bind:value={query} />
	{#if results.length > 0}
		<ul class="flex flex-col gap-1">
			{#each results as food (food.id)}
				<li>
					<Button variant="ghost" class="w-full justify-between font-normal" onclick={() => pick(food)}>
						<span class="truncate">
							{food.name}
							{#if food.brand}<span class="text-xs text-muted-foreground"> · {food.brand}</span>{/if}
						</span>
						<span class="shrink-0 text-xs text-muted-foreground">{fmt(food.kcal)} kcal / {food.base}g</span>
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if selected}
		<div class="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
			<div class="flex items-center justify-between gap-2">
				<strong class="truncate text-sm">
					{selected.name}
					{#if selected.brand}<span class="text-xs text-muted-foreground"> · {selected.brand}</span>{/if}
				</strong>
				{#if selected.unitSize}
				<small class="shrink-0 text-muted-foreground">1 ud = {fmt(selected.unitSize)} g</small>
			{:else}
				<small class="shrink-0 text-muted-foreground">{fmt(selected.kcal)} kcal / {selected.base}g</small>
			{/if}
			</div>
			<div class="flex items-end gap-2">
				<div class="min-w-0 flex-1">
					{#if selected.unitSize}
						<Label class="mb-1 block">Unidades</Label>
						<Input type="text" min="0.1" bind:value={units} inputmode="decimal" />
					{:else}
						<Label class="mb-1 block">Gramos</Label>
						<Input type="text" min="1" bind:value={grams} inputmode="decimal" />
					{/if}
				</div>
				<div class="min-w-0 flex-1">
					<Label class="mb-1 block">Tipo</Label>
					<Select.Root bind:value={mealType}>
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
				<Button onclick={add}>Añadir</Button>
			</div>
		</div>
	{/if}
</div>

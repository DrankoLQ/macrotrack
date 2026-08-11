<script lang="ts">
	import { onMount } from 'svelte';
	import { diary, goals, saveGoals, today } from '$lib/stores.svelte';
	import { fmt } from '$lib/format';
	import { MEAL_TYPES, type Entry, type MealType } from '$lib/db';
	import MacroBar from '$lib/components/MacroBar.svelte';
	import FoodPicker from '$lib/components/FoodPicker.svelte';

	const macros = [
		{ key: 'kcal', label: 'Calorías', unit: 'kcal' },
		{ key: 'protein', label: 'Proteínas', unit: 'g' },
		{ key: 'carbs', label: 'Hidratos', unit: 'g' },
		{ key: 'fat', label: 'Grasas', unit: 'g' },
		{ key: 'fiber', label: 'Fibra', unit: 'g' }
	] as const;

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
	let editType = $state<MealType>('comida');

	function startEdit(entry: Entry) {
		editingId = entry.id!;
		editGrams = String(entry.grams);
		editType = entry.mealType ?? 'comida';
	}

	async function saveEdit() {
		if (editingId === null) return;
		const grams = parseFloat(editGrams);
		if (grams > 0) await diary.updateEntry(editingId, { grams, mealType: editType });
		editingId = null;
	}

	onMount(() => diary.load());

	function shift(days: number) {
		const date = new Date(diary.date + 'T12:00:00');
		date.setDate(date.getDate() + days);
		diary.setDate(date.toLocaleDateString('en-CA'));
	}
</script>

<section class="card row date-row">
	<button class="secondary icon-btn" onclick={() => shift(-1)}>←</button>
	<span class="date">{dateLabel}</span>
	<button class="secondary icon-btn" onclick={() => shift(1)}>→</button>
	<button class="secondary" onclick={() => diary.setDate(today())}>Hoy</button>
</section>

<section class="card">
	<h2>Totales</h2>
	{#each macros as macro}
		<MacroBar
			label={macro.label}
			value={diary.totals[macro.key]}
			goal={goals[macro.key]}
			unit={macro.unit}
		/>
	{/each}
	<details>
		<summary>Objetivos</summary>
		<div class="grid goals">
			{#each macros as macro}
				<label>{macro.label}
					<input type="number" bind:value={goals[macro.key]} onchange={saveGoals} inputmode="decimal" />
				</label>
			{/each}
		</div>
	</details>
</section>

<section class="card">
	<h2>Añadir</h2>
	<FoodPicker onAdd={(food, grams, mealType) => diary.addFood(food, grams, mealType)} />
</section>

<section class="card">
	<h2>Comidas ({diary.entries.length})</h2>
	{#if diary.entries.length === 0}
		<p class="muted">Nada registrado todavía.</p>
	{:else}
		{#each groups as group}
			<div class="group">
				<div class="group-head">
					<strong>{group.label}</strong>
					<small class="muted">
						{fmt(group.totals.kcal)} kcal · P {fmt(group.totals.protein)} · C {fmt(group.totals.carbs)} · G {fmt(group.totals.fat)} · F {fmt(group.totals.fiber)}
					</small>
				</div>
				<ul>
					{#each group.entries as entry (entry.id)}
						<li class="entry">
							{#if editingId === entry.id}
								<div class="row edit-row">
									<label>Gramos<input type="number" min="1" bind:value={editGrams} inputmode="decimal" /></label>
									<label>Tipo
										<select bind:value={editType}>
											{#each MEAL_TYPES as type}
												<option value={type.key}>{type.label}</option>
											{/each}
										</select>
									</label>
									<div class="row">
										<button onclick={saveEdit}>Guardar</button>
										<button class="secondary" onclick={() => (editingId = null)}>Cancelar</button>
									</div>
								</div>
							{:else}
								<div class="entry-info">
									<strong>{entry.name}</strong>
									<small class="muted">
										{fmt(entry.grams)} g · {fmt(entry.kcal)} kcal · P {fmt(entry.protein)} · C {fmt(entry.carbs)} · G {fmt(entry.fat)} · F {fmt(entry.fiber)}
									</small>
								</div>
								<div class="row">
									<button class="secondary icon-btn" onclick={() => startEdit(entry)} title="Editar">✎</button>
									<button class="danger" onclick={() => diary.remove(entry.id!)}>✕</button>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{/if}
</section>

<style>
	.date-row {
		justify-content: space-between;
	}

	.date {
		flex: 1;
		text-align: center;
		text-transform: capitalize;
	}

	.goals {
		grid-template-columns: repeat(2, 1fr);
		margin-top: 8px;
	}

	.entry {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
	}

	.entry:last-child {
		border-bottom: none;
	}

	.group + .group {
		margin-top: 14px;
	}

	.group-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
		padding: 8px 10px;
		background: var(--panel-2);
		border-radius: 8px;
	}

	.edit-row {
		flex-wrap: wrap;
		width: 100%;
		align-items: flex-end;
	}

	.edit-row label {
		flex: 1;
		min-width: 90px;
	}

	select {
		font: inherit;
		background: var(--bg);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 10px;
		width: 100%;
	}

	.entry-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.grid {
		display: grid;
		gap: 8px;
	}

	summary {
		cursor: pointer;
		color: var(--muted);
		font-size: 0.85rem;
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { diary, goals, saveGoals, today } from '$lib/stores.svelte';
	import { fmt } from '$lib/format';
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
					<input type="number" bind:value={goals[macro.key]} onchange={saveGoals} />
				</label>
			{/each}
		</div>
	</details>
</section>

<section class="card">
	<h2>Añadir</h2>
	<FoodPicker onAdd={(food, grams) => diary.addFood(food, grams)} />
</section>

<section class="card">
	<h2>Comidas ({diary.entries.length})</h2>
	{#if diary.entries.length === 0}
		<p class="muted">Nada registrado todavía.</p>
	{:else}
		<ul>
			{#each diary.entries as entry (entry.id)}
				<li class="entry">
					<div class="entry-info">
						<strong>{entry.name}</strong>
						<small class="muted">
							{fmt(entry.grams)} g · {fmt(entry.kcal)} kcal · P {fmt(entry.protein)} · C {fmt(entry.carbs)} · G {fmt(entry.fat)} · F {fmt(entry.fiber)}
						</small>
					</div>
					<button class="danger" onclick={() => diary.remove(entry.id!)}>✕</button>
				</li>
			{/each}
		</ul>
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

<script lang="ts">
	import { db, type Food } from '$lib/db';
	import { fmt } from '$lib/format';

	let { onAdd }: { onAdd: (food: Food, grams: number) => void } = $props();

	let query = $state('');
	let foods: Food[] = $state([]);
	let selected: Food | null = $state(null);
	let grams = $state(100);

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
	}

	function add() {
		if (!selected) return;
		onAdd(selected, grams);
		selected = null;
		grams = 100;
	}
</script>

<div class="picker">
	<input type="search" placeholder="Buscar alimento…" bind:value={query} />
	{#if results.length > 0}
		<ul class="results">
			{#each results as food (food.id)}
				<li>
					<button class="row-btn" onclick={() => pick(food)}>
						<span>{food.name}</span>
						<small>{fmt(food.kcal)} kcal / {food.base}g</small>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if selected}
		<div class="card selected-card">
			<div class="row sel-head">
				<strong>{selected.name}</strong>
				<small class="muted">{fmt(selected.kcal)} kcal / {selected.base}g</small>
			</div>
			<div class="row">
				<label>Gramos<input type="number" min="1" bind:value={grams} /></label>
				<button onclick={add}>Añadir</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.row-btn {
		display: flex;
		justify-content: space-between;
		width: 100%;
		background: var(--bg);
		color: var(--text);
		font-weight: 400;
		padding: 10px 12px;
		text-align: left;
	}

	.row-btn small {
		color: var(--muted);
	}

	.selected-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.sel-head {
		justify-content: space-between;
	}
</style>

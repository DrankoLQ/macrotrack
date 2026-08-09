<script lang="ts">
	import { onMount } from 'svelte';
	import { db, type Food } from '$lib/db';
	import { fmt } from '$lib/format';

	let foods: Food[] = $state([]);
	let query = $state('');
	let showForm = $state(false);
	let saved = $state<string | null>(null);
	const form = $state({
		name: '',
		brand: '',
		barcode: '',
		kcal: '',
		protein: '',
		carbs: '',
		fat: '',
		fiber: ''
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return foods;
		return foods.filter(
			(food) => food.name.toLowerCase().includes(q) || (food.barcode ?? '').includes(q)
		);
	});

	onMount(async () => {
		foods = await db.foods.orderBy('name').toArray();
	});

	async function refresh() {
		foods = await db.foods.orderBy('name').toArray();
	}

	async function remove(food: Food) {
		if (food.id === undefined) return;
		await db.foods.delete(food.id);
		await refresh();
	}

	async function add() {
		const toNumber = (value: string) => parseFloat(value) || 0;
		const name = form.name.trim();
		if (!name) return;
		await db.foods.add({
			name,
			brand: form.brand.trim() || undefined,
			barcode: form.barcode.trim() || undefined,
			base: 100,
			kcal: toNumber(form.kcal),
			protein: toNumber(form.protein),
			carbs: toNumber(form.carbs),
			fat: toNumber(form.fat),
			fiber: toNumber(form.fiber),
			source: 'manual',
			createdAt: Date.now()
		});
		Object.assign(form, { name: '', brand: '', barcode: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
		showForm = false;
		saved = name;
		await refresh();
	}
</script>

<section class="card">
	<h2>Base de datos</h2>
	<div class="row">
		<input type="search" placeholder="Buscar por nombre o código…" bind:value={query} />
		<button class="secondary" onclick={() => (showForm = !showForm)}>
			{showForm ? 'Cancelar' : 'Nuevo alimento'}
		</button>
	</div>
	{#if saved}
		<p class="muted saved">«{saved}» guardado ✓</p>
	{/if}
	{#if showForm}
		<div class="form">
			<label>Nombre<input bind:value={form.name} placeholder="Ej: Garbanzos cocidos" /></label>
			<label>Marca<input bind:value={form.brand} placeholder="Opcional" /></label>
			<label>Código de barras<input bind:value={form.barcode} placeholder="Opcional" inputmode="numeric" /></label>
			<div class="grid">
				<label>kcal / 100g<input type="number" bind:value={form.kcal} /></label>
				<label>Proteína / 100g<input type="number" bind:value={form.protein} /></label>
				<label>Hidratos / 100g<input type="number" bind:value={form.carbs} /></label>
				<label>Grasas / 100g<input type="number" bind:value={form.fat} /></label>
				<label>Fibra / 100g<input type="number" bind:value={form.fiber} /></label>
			</div>
			<button onclick={add}>Guardar</button>
		</div>
	{/if}
	{#if filtered.length === 0}
		<p class="muted">Sin resultados.</p>
	{:else}
		<ul>
			{#each filtered as food (food.id)}
				<li class="food">
					<div class="food-info">
						<strong>{food.name}</strong>
						<small class="muted">
							{#if food.barcode}<span>{food.barcode} · </span>{/if}
							{fmt(food.kcal)} kcal · P {fmt(food.protein)} · C {fmt(food.carbs)} · G {fmt(food.fat)} · F {fmt(food.fiber)} / {food.base}g · {food.source}
						</small>
					</div>
					<button class="danger" onclick={() => remove(food)}>✕</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 12px 0;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
	}

	.food {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
	}

	.food:last-child {
		border-bottom: none;
	}

	.food-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.saved {
		margin: 8px 0 0;
	}
</style>

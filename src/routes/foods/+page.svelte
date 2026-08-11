<script lang="ts">
	import { onMount } from 'svelte';
	import { db, type Food } from '$lib/db';
	import { fmt } from '$lib/format';
	import { searchProducts, type OffSearchResult } from '$lib/openfoodfacts';
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let foods: Food[] = $state([]);
	let query = $state('');
	let showForm = $state(false);
	let saved = $state<string | null>(null);
	let editingId = $state<number | null>(null);
	let formError = $state('');
	let searchOff = $state(false);
	let offQuery = $state('');
	let offLoading = $state(false);
	let offError = $state('');
	let offResults = $state<OffSearchResult[]>([]);
	let savedOff = $state<Set<number>>(new Set());
	let confirmFood = $state<Food | null>(null);
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

	const existingBarcodes = $derived(
		new Set(foods.map((food) => food.barcode).filter((barcode): barcode is string => Boolean(barcode)))
	);

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

	async function save() {
		const toNumber = (value: string) => parseFloat(value) || 0;
		const name = form.name.trim();
		if (!name) return;
		const data = {
			name,
			brand: form.brand.trim() || undefined,
			barcode: form.barcode.trim() || undefined,
			base: 100,
			kcal: toNumber(form.kcal),
			protein: toNumber(form.protein),
			carbs: toNumber(form.carbs),
			fat: toNumber(form.fat),
			fiber: toNumber(form.fiber)
		};
		formError = '';
		try {
			if (editingId !== null) {
				await db.foods.update(editingId, data);
			} else {
				await db.foods.add({ ...data, source: 'manual', createdAt: Date.now() });
			}
		} catch {
			formError = 'Ya existe un alimento con ese código de barras';
			return;
		}
		Object.assign(form, { name: '', brand: '', barcode: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
		editingId = null;
		showForm = false;
		saved = name;
		await refresh();
	}

	function edit(food: Food) {
		editingId = food.id ?? null;
		Object.assign(form, {
			name: food.name,
			brand: food.brand ?? '',
			barcode: food.barcode ?? '',
			kcal: String(food.kcal),
			protein: String(food.protein),
			carbs: String(food.carbs),
			fat: String(food.fat),
			fiber: String(food.fiber)
		});
		formError = '';
		showForm = true;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function cancel() {
		editingId = null;
		formError = '';
		showForm = false;
	}

	async function search() {
		const q = offQuery.trim();
		if (!q) return;
		offLoading = true;
		offError = '';
		offResults = [];
		try {
			offResults = await searchProducts(q);
		} catch (error) {
			offError = error instanceof Error ? error.message : 'Error de red';
		} finally {
			offLoading = false;
		}
	}

	async function saveOffResult(result: OffSearchResult, index: number) {
		try {
			await db.foods.add({
				name: result.name,
				brand: result.brand,
				barcode: result.barcode,
				base: 100,
				kcal: result.kcal,
				protein: result.protein,
				carbs: result.carbs,
				fat: result.fat,
				fiber: result.fiber,
				source: 'openfoodfacts',
				createdAt: Date.now()
			});
			savedOff = new Set([...savedOff, index]);
			await refresh();
		} catch {
			offError = 'Ese producto ya está en tu base de datos';
		}
	}
</script>

<section class="card">
	<h2>Base de datos</h2>
	<div class="row">
		<input type="search" placeholder="Buscar por nombre o código…" bind:value={query} />
		{#if query}
			<button class="secondary icon-btn" onclick={() => (query = '')} title="Limpiar búsqueda">✕</button>
		{/if}
		<button class="secondary" onclick={() => (showForm ? cancel() : (showForm = true))}>
			{showForm ? 'Cancelar' : 'Nuevo alimento'}
		</button>
	</div>
	{#if saved}
		<p class="muted saved">«{saved}» guardado ✓</p>
	{/if}
	{#if showForm}
		<div class="form">
			<h3>{editingId !== null ? 'Editar alimento' : 'Nuevo alimento'}</h3>
			{#if formError}<p class="error">{formError}</p>{/if}
			<label>Nombre<input bind:value={form.name} placeholder="Ej: Garbanzos cocidos" /></label>
			<label>Marca<input bind:value={form.brand} placeholder="Opcional" /></label>
			<label>Código de barras<input bind:value={form.barcode} placeholder="Opcional" inputmode="numeric" /></label>
			<div class="grid">
				<label>kcal / 100g<input type="number" bind:value={form.kcal} inputmode="decimal" /></label>
				<label>Proteína / 100g<input type="number" bind:value={form.protein} inputmode="decimal" /></label>
				<label>Hidratos / 100g<input type="number" bind:value={form.carbs} inputmode="decimal" /></label>
				<label>Grasas / 100g<input type="number" bind:value={form.fat} inputmode="decimal" /></label>
				<label>Fibra / 100g<input type="number" bind:value={form.fiber} inputmode="decimal" /></label>
			</div>
			<button onclick={save}>{editingId !== null ? 'Guardar cambios' : 'Guardar'}</button>
		</div>
	{/if}
	<button class="secondary search-toggle" onclick={() => (searchOff = !searchOff)}>
		{searchOff ? 'Cerrar búsqueda' : 'Buscar alimentos por nombre (OpenFoodFacts)'}
	</button>
	{#if searchOff}
		<div class="form">
			<div class="row">
				<input bind:value={offQuery} placeholder="Ej: miel, patata, garbanzos…" />
				<button onclick={search} disabled={offLoading || !offQuery.trim()}>
					{offLoading ? 'Buscando…' : 'Buscar'}
				</button>
			</div>
			{#if offError}<p class="error">{offError}</p>{/if}
			{#if offResults.length > 0}
				<ul>
					{#each offResults as result, i (result.barcode ?? result.name + i)}
						<li class="food">
							<div class="food-info">
								<strong>{result.name}</strong>
								<small class="muted">
									{#if result.brand}<span>{result.brand} · </span>{/if}
									{#if result.barcode}<span>{result.barcode} · </span>{/if}
									{#if result.hasNutriments}
										{fmt(result.kcal)} kcal · P {fmt(result.protein)} · C {fmt(result.carbs)} · G {fmt(result.fat)} · F {fmt(result.fiber)} / 100g
									{:else}
										sin datos nutricionales
									{/if}
								</small>
							</div>
							{#if result.barcode && existingBarcodes.has(result.barcode)}
								<button class="secondary" disabled>En BD</button>
							{:else if savedOff.has(i)}
								<button class="secondary" disabled>Guardado ✓</button>
							{:else}
								<button onclick={() => saveOffResult(result, i)}>Guardar</button>
							{/if}
						</li>
					{/each}
				</ul>
			{:else if !offLoading}
				<p class="muted">Busca por nombre (ej: «miel», «patata») y guarda los que quieras en tu base de datos.</p>
			{/if}
		</div>
	{/if}
	{#if filtered.length === 0}
		<p class="muted">Sin resultados.</p>
	{:else}
		<ul>
			{#each filtered as food (food.id)}
				<li class="food">
					<div class="food-info">
						<strong>
							{food.name}
							{#if food.brand}<small class="muted"> · {food.brand}</small>{/if}
						</strong>
						<small class="muted">
							{#if food.barcode}<span>{food.barcode} · </span>{/if}
							{fmt(food.kcal)} kcal · P {fmt(food.protein)} · C {fmt(food.carbs)} · G {fmt(food.fat)} · F {fmt(food.fiber)} / {food.base}g · {food.source}
						</small>
					</div>
					<div class="food-actions">
						<button class="secondary icon-btn" onclick={() => edit(food)} title="Editar">✏️</button>
						<button class="danger" onclick={() => (confirmFood = food)}>✕</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
	<ConfirmDialog
		open={confirmFood !== null}
		title="Eliminar alimento"
		message={'¿Eliminar «' + (confirmFood?.name ?? '') + '» de tu base de datos? Esta acción no se puede deshacer.'}
		onConfirm={async () => {
			if (confirmFood) await remove(confirmFood);
		}}
		onClose={() => (confirmFood = null)}
	/>
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

	.food-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}

	.saved {
		margin: 8px 0 0;
	}

	.search-toggle {
		margin-top: 12px;
	}
</style>

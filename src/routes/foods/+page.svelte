<script lang="ts">
	import { onMount } from 'svelte';
	import { db, type Food } from '$lib/db';
	import { fmt } from '$lib/format';
	import { searchProducts, type OffSearchResult } from '$lib/openfoodfacts';
	import { searchUsda, type UsdaSearchResult } from '$lib/usda';

	type SearchResult = OffSearchResult | UsdaSearchResult;

	const USDA_KEY = 'macrotrack:usdaKey';

	let foods: Food[] = $state([]);
	let query = $state('');
	let showForm = $state(false);
	let saved = $state<string | null>(null);
	let searchOff = $state(false);
	let offQuery = $state('');
	let offLoading = $state(false);
	let offError = $state('');
	let offResults = $state<SearchResult[]>([]);
	let savedOff = $state<Set<number>>(new Set());
	let usdaKey = $state((typeof localStorage !== 'undefined' ? localStorage.getItem(USDA_KEY) : null) ?? '');
	let usdaKeyInput = $state('');
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

	async function search() {
		const q = offQuery.trim();
		if (!q) return;
		offLoading = true;
		offError = '';
		offResults = [];
		try {
			const results = await searchProducts(q);
			if (results.length > 0) {
				offResults = results;
			} else if (usdaKey) {
				offResults = await searchUsda(q, usdaKey);
			} else {
				offError = 'Sin resultados en OpenFoodFacts. Añade tu key gratuita de USDA (plan B) para buscar también ahí.';
			}
		} catch (error) {
			const offMsg = error instanceof Error ? error.message : 'Error de red';
			if (usdaKey) {
				try {
					offResults = await searchUsda(q, usdaKey);
				} catch (usdaError) {
					offError = `OpenFoodFacts: ${offMsg} · USDA: ${usdaError instanceof Error ? usdaError.message : 'error'}`;
				}
			} else {
				offError = `${offMsg} — Plan B: consigue tu key gratuita de USDA (abajo) para poder seguir buscando.`;
			}
		} finally {
			offLoading = false;
		}
	}

	function saveUsdaKey() {
		const key = usdaKeyInput.trim();
		localStorage.setItem(USDA_KEY, key);
		usdaKey = key;
		usdaKeyInput = '';
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
	<button class="secondary" onclick={() => (searchOff = !searchOff)}>
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
			{#if usdaKey}
				<p class="muted key-hint">Plan B (USDA) activo ✓ — si OpenFoodFacts falla, se busca en la base de datos oficial de EEUU.</p>
			{:else}
				<p class="muted key-hint">
					¿OpenFoodFacts no responde? Activa el plan B con una key gratuita de USDA:
					<a href="https://fdc.nal.usda.gov/api-key-signup.html" target="_blank" rel="noreferrer">consíguela aquí</a>.
				</p>
				<div class="row">
					<input bind:value={usdaKeyInput} placeholder="API key de USDA" />
					<button class="secondary" onclick={saveUsdaKey} disabled={!usdaKeyInput.trim()}>Guardar</button>
				</div>
			{/if}
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
										{fmt(result.kcal)} kcal · P {fmt(result.protein)} · C {fmt(result.carbs)} · G {fmt(result.fat)} · F {fmt(result.fiber)} / 100g · {result.source === 'usda' ? 'USDA' : 'OpenFoodFacts'}
									{:else}
										sin datos nutricionales · {result.source === 'usda' ? 'USDA' : 'OpenFoodFacts'}
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

	.key-hint {
		margin: 0;
	}

	a {
		color: var(--accent);
	}
</style>

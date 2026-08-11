<script lang="ts">
	import { onMount } from 'svelte';
	import { db, type Food } from '$lib/db';
	import { fmt } from '$lib/format';
	import { searchProducts, type OffSearchResult } from '$lib/openfoodfacts';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

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
		unitSize: '',
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
			unitSize: toNumber(form.unitSize) > 0 ? toNumber(form.unitSize) : undefined,
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
		Object.assign(form, { name: '', brand: '', barcode: '', unitSize: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
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
			unitSize: food.unitSize ? String(food.unitSize) : '',
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

<Card>
	<CardContent class="flex flex-col gap-3">
		<h2 class="text-base font-semibold">Base de datos</h2>
		<div class="flex gap-2">
			<div class="relative flex-1">
				<SearchIcon class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input type="search" class="pl-8" placeholder="Buscar por nombre o código…" bind:value={query} />
			</div>
			{#if query}
				<Button variant="ghost" size="icon-sm" onclick={() => (query = '')} title="Limpiar búsqueda" aria-label="Limpiar búsqueda">
					<XIcon />
				</Button>
			{/if}
			<Button variant="outline" size="sm" onclick={() => (showForm ? cancel() : (showForm = true))}>
				{showForm ? 'Cancelar' : 'Nuevo alimento'}
			</Button>
		</div>
		{#if saved}
			<p class="text-xs text-muted-foreground">«{saved}» guardado ✓</p>
		{/if}
		{#if showForm}
			<div class="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
				<h3 class="text-sm font-semibold">{editingId !== null ? 'Editar alimento' : 'Nuevo alimento'}</h3>
				{#if formError}<p class="text-sm text-destructive">{formError}</p>{/if}
				<div>
					<Label class="mb-1 block">Nombre</Label>
					<Input bind:value={form.name} placeholder="Ej: Garbanzos cocidos" />
				</div>
				<div>
					<Label class="mb-1 block">Marca</Label>
					<Input bind:value={form.brand} placeholder="Opcional" />
				</div>
				<div>
					<Label class="mb-1 block">Código de barras</Label>
					<Input bind:value={form.barcode} placeholder="Opcional" inputmode="numeric" />
				</div>
				<div>
					<Label class="mb-1 block">Gramos por unidad</Label>
					<Input type="number" min="0.1" bind:value={form.unitSize} placeholder="Opcional · ej: 66 helado, 330 lata" inputmode="decimal" />
				</div>
				<div class="grid grid-cols-2 gap-2">
					<div>
						<Label class="mb-1 block">kcal / 100g</Label>
						<Input type="number" bind:value={form.kcal} inputmode="decimal" />
					</div>
					<div>
						<Label class="mb-1 block">Proteína / 100g</Label>
						<Input type="number" bind:value={form.protein} inputmode="decimal" />
					</div>
					<div>
						<Label class="mb-1 block">Hidratos / 100g</Label>
						<Input type="number" bind:value={form.carbs} inputmode="decimal" />
					</div>
					<div>
						<Label class="mb-1 block">Grasas / 100g</Label>
						<Input type="number" bind:value={form.fat} inputmode="decimal" />
					</div>
					<div>
						<Label class="mb-1 block">Fibra / 100g</Label>
						<Input type="number" bind:value={form.fiber} inputmode="decimal" />
					</div>
				</div>
				<Button onclick={save}>{editingId !== null ? 'Guardar cambios' : 'Guardar'}</Button>
			</div>
		{/if}
		<Button variant="outline" onclick={() => (searchOff = !searchOff)}>
			{searchOff ? 'Cerrar búsqueda' : 'Buscar alimentos por nombre (OpenFoodFacts)'}
		</Button>
		{#if searchOff}
			<div class="flex flex-col gap-2">
				<div class="flex gap-2">
					<Input bind:value={offQuery} placeholder="Ej: miel, patata, garbanzos…" />
					<Button onclick={search} disabled={offLoading || !offQuery.trim()}>
						{offLoading ? 'Buscando…' : 'Buscar'}
					</Button>
				</div>
				{#if offError}<p class="text-sm text-destructive">{offError}</p>{/if}
				{#if offResults.length > 0}
					<ul>
						{#each offResults as result, i (result.barcode ?? result.name + i)}
							<li class="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-b-0">
								<div class="flex min-w-0 flex-col gap-0.5">
									<strong class="text-sm">{result.name}</strong>
									<small class="text-xs text-muted-foreground">
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
									<Button variant="outline" size="sm" disabled>En BD</Button>
								{:else if savedOff.has(i)}
									<Button variant="outline" size="sm" disabled>Guardado ✓</Button>
								{:else}
									<Button size="sm" onclick={() => saveOffResult(result, i)}>Guardar</Button>
								{/if}
							</li>
						{/each}
					</ul>
				{:else if !offLoading}
					<p class="text-sm text-muted-foreground">Busca por nombre (ej: «miel», «patata») y guarda los que quieras en tu base de datos.</p>
				{/if}
			</div>
		{/if}
		{#if filtered.length === 0}
			<p class="text-sm text-muted-foreground">Sin resultados.</p>
		{:else}
			<ul>
				{#each filtered as food (food.id)}
					<li class="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-b-0">
						<div class="flex min-w-0 flex-col gap-0.5">
							<strong class="text-sm">
								{food.name}
								{#if food.brand}<span class="text-xs text-muted-foreground"> · {food.brand}</span>{/if}
							</strong>
							<small class="text-xs text-muted-foreground">
								{#if food.barcode}<span>{food.barcode} · </span>{/if}
								{fmt(food.kcal)} kcal · P {fmt(food.protein)} · C {fmt(food.carbs)} · G {fmt(food.fat)} · F {fmt(food.fiber)} / {food.base}g{#if food.unitSize} · 1 ud = {fmt(food.unitSize)} g{/if}{#if food.source !== 'builtin'} · {food.source}{/if}
							</small>
						</div>
						<div class="flex shrink-0 gap-1.5">
							<Button variant="ghost" size="icon-sm" onclick={() => edit(food)} title="Editar" aria-label="Editar">
								<PencilIcon />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								class="text-destructive hover:text-destructive"
								onclick={() => (confirmFood = food)}
								title="Eliminar"
								aria-label="Eliminar"
							>
								<Trash2Icon />
							</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</CardContent>
</Card>

<ConfirmDialog
	open={confirmFood !== null}
	title="Eliminar alimento"
	message={'¿Eliminar «' + (confirmFood?.name ?? '') + '» de tu base de datos? Esta acción no se puede deshacer.'}
	onConfirm={async () => {
		if (confirmFood) await remove(confirmFood);
	}}
	onClose={() => (confirmFood = null)}
/>
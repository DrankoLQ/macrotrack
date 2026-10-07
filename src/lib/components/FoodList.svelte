<script lang="ts">
	import { onMount } from 'svelte';
	import { deleteFood, db, type Food } from '$lib/db';
	import { fmt, fold, toNumber } from '$lib/format';
	import { parseOptionalNutrient } from '$lib/nutrient-input';
	import { findFoodMatch } from '$lib/foodmatch';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { sortFavoritesFirst } from '$lib/favorites';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import SearchIcon from '@lucide/svelte/icons/search';
	import StarIcon from '@lucide/svelte/icons/star';
	import XIcon from '@lucide/svelte/icons/x';

	let foods: Food[] = $state([]);
	let query = $state('');
	let showForm = $state(false);
	let saved = $state<string | null>(null);
	let editingId = $state<number | null>(null);
	let formError = $state('');
	let confirmFood = $state<Food | null>(null);
	let usage = $state<Map<number, number>>(new Map());
	let duplicate = $state<Food | null>(null);
	let allowDuplicate = $state(false);
	const form = $state({
		name: '',
		brand: '',
		barcode: '',
		unitSize: '',
		kcal: '',
		protein: '',
		carbs: '',
		fat: '',
		fiber: '',
		saturatedFat: '',
		sugars: ''
	});

	const filtered = $derived.by(() => {
		const q = fold(query);
		const base = !q
			? foods
			: foods.filter(
					(food) => fold(food.name).includes(q) || (food.barcode ?? '').includes(q)
				);
		return sortFavoritesFirst(base);
	});

	onMount(() => {
		void refresh();
	});

	async function refresh() {
		const [rows, entries] = await Promise.all([db.foods.orderBy('name').toArray(), db.entries.toArray()]);
		const counts = new Map<number, number>();
		for (const entry of entries) {
			if (entry.foodId === undefined) continue;
			counts.set(entry.foodId, (counts.get(entry.foodId) ?? 0) + 1);
		}
		foods = rows;
		usage = counts;
	}

	function usageCount(food: Food): number {
		return food.id === undefined ? 0 : (usage.get(food.id) ?? 0);
	}

	function usedIn(food: Food): string {
		const count = usageCount(food);
		if (count === 0) return 'Sin usar';
		return count === 1 ? 'Usado en 1 comida' : `Usado en ${count} comidas`;
	}

	function deleteMessage(food: Food | null): string {
		if (!food) return '';
		const count = usageCount(food);
		if (count === 0) return `¿Eliminar «${food.name}» de tu base de datos? Esta acción no se puede deshacer.`;
		return `«${food.name}» se usa en ${count} ${count === 1 ? 'comida' : 'comidas'}. Tus comidas se conservarán; solo se elimina del catálogo.`;
	}

	async function remove(food: Food) {
		if (food.id === undefined) return;
		await deleteFood(food.id);
		await refresh();
	}

	async function toggleFavorite(food: Food) {
		if (food.id === undefined) return;
		await db.foods.update(food.id, { favorite: !food.favorite });
		await refresh();
	}

	async function save() {
		const name = form.name.trim();
		if (!name) return;
		const saturatedFat = parseOptionalNutrient(form.saturatedFat);
		const sugars = parseOptionalNutrient(form.sugars);
		if (!saturatedFat.ok || !sugars.ok) {
			formError = 'Introduce cantidades finitas y no negativas, o deja el campo vacío';
			return;
		}
		const data = {
			name,
			brand: form.brand.trim() || undefined,
			barcode: form.barcode.trim() || undefined,
			unitSize: toNumber(form.unitSize) > 0 ? toNumber(form.unitSize) : undefined,
			base: 100,
			kcal: toNumber(form.kcal) || 0,
			protein: toNumber(form.protein) || 0,
			carbs: toNumber(form.carbs) || 0,
			fat: toNumber(form.fat) || 0,
			fiber: toNumber(form.fiber) || 0,
			...(saturatedFat.value === undefined ? {} : { saturatedFat: saturatedFat.value }),
			...(sugars.value === undefined ? {} : { sugars: sugars.value })
		};
		formError = '';
		duplicate = null;
		if (editingId === null && !allowDuplicate) {
			const match = findFoodMatch(foods, name, form.brand.trim() || undefined);
			if (match) {
				duplicate = match;
				return;
			}
		}
		allowDuplicate = false;
		try {
			if (editingId !== null) {
				await db.foods.where('id').equals(editingId).modify((food) => {
					Object.assign(food, data);
					if (saturatedFat.value === undefined) delete food.saturatedFat;
					if (sugars.value === undefined) delete food.sugars;
				});
			} else {
				await db.foods.add({ ...data, source: 'manual', createdAt: Date.now() });
			}
		} catch {
			formError = 'Ya existe un alimento con ese código de barras';
			return;
		}
		Object.assign(form, { name: '', brand: '', barcode: '', unitSize: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', saturatedFat: '', sugars: '' });
		editingId = null;
		showForm = false;
		saved = name;
		await refresh();
	}

	function edit(food: Food) {
		editingId = food.id ?? null;
		duplicate = null;
		allowDuplicate = false;
		Object.assign(form, {
			name: food.name,
			brand: food.brand ?? '',
			barcode: food.barcode ?? '',
			unitSize: food.unitSize ? String(food.unitSize) : '',
			kcal: String(food.kcal),
			protein: String(food.protein),
			carbs: String(food.carbs),
			fat: String(food.fat),
			fiber: String(food.fiber),
			saturatedFat: food.saturatedFat === undefined ? '' : String(food.saturatedFat),
			sugars: food.sugars === undefined ? '' : String(food.sugars)
		});
		formError = '';
		showForm = true;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function cancel() {
		editingId = null;
		Object.assign(form, { name: '', brand: '', barcode: '', unitSize: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', saturatedFat: '', sugars: '' });
		formError = '';
		duplicate = null;
		allowDuplicate = false;
		showForm = false;
	}

	function editDuplicate() {
		if (duplicate) edit(duplicate);
	}

	function createAnyway() {
		allowDuplicate = true;
		void save();
	}

</script>

<Card>
	<CardContent class="flex flex-col gap-3">
		<div class="flex gap-2">
			<div class="relative flex-1">
				<SearchIcon class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input type="search" class="pl-8" placeholder="Buscar por nombre o código…" bind:value={query} />
			</div>
			{#if query}
				<Button variant="ghost" size="icon" onclick={() => (query = '')} title="Limpiar búsqueda" aria-label="Limpiar búsqueda">
					<XIcon />
				</Button>
			{/if}
			<Button variant="outline" onclick={() => (showForm ? cancel() : (showForm = true))}>
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
					<Input type="text" min="0.1" bind:value={form.unitSize} placeholder="Opcional · ej: 66 helado, 330 lata" inputmode="decimal" />
				</div>
				<div class="grid grid-cols-2 gap-2">
					<div>
						<Label class="mb-1 block">kcal / 100g</Label>
						<Input type="text" bind:value={form.kcal} inputmode="decimal" />
					</div>
					<div>
						<Label class="mb-1 block">Grasas / 100g</Label>
						<Input type="text" bind:value={form.fat} inputmode="decimal" />
						<div class="mt-2 pl-2">
							<Label class="mb-1 block text-xs text-muted-foreground">Grasas saturadas / 100g</Label>
							<Input type="text" bind:value={form.saturatedFat} inputmode="decimal" placeholder="Desconocido" />
						</div>
					</div>
					<div>
						<Label class="mb-1 block">Hidratos / 100g</Label>
						<Input type="text" bind:value={form.carbs} inputmode="decimal" />
						<div class="mt-2 pl-2">
							<Label class="mb-1 block text-xs text-muted-foreground">Azúcares totales / 100g</Label>
							<Input type="text" bind:value={form.sugars} inputmode="decimal" placeholder="Desconocido" />
						</div>
					</div>
					<div>
						<Label class="mb-1 block">Fibra / 100g</Label>
						<Input type="text" bind:value={form.fiber} inputmode="decimal" />
					</div>
					<div>
						<Label class="mb-1 block">Proteína / 100g</Label>
						<Input type="text" bind:value={form.protein} inputmode="decimal" />
					</div>
				</div>
				{#if duplicate}
					<div class="rounded-lg border border-border bg-secondary p-3 text-sm">
						<p>Ya existe «{duplicate.name}»{#if duplicate.brand} · {duplicate.brand}{/if}. {usedIn(duplicate)}.</p>
						<div class="mt-2 flex flex-wrap gap-2">
							<Button variant="outline" size="sm" onclick={editDuplicate}>Editar existente</Button>
							<Button size="sm" onclick={createAnyway}>Crear igualmente</Button>
						</div>
					</div>
				{/if}
				<Button onclick={save}>{editingId !== null ? 'Guardar cambios' : 'Guardar'}</Button>
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
								{fmt(food.kcal)} kcal · G {fmt(food.fat)} · C {fmt(food.carbs)} · F {fmt(food.fiber)} · P {fmt(food.protein)} / {food.base}g{#if food.unitSize} · 1 ud = {fmt(food.unitSize)} g{/if}{#if food.source !== 'builtin'} · {food.source}{/if}
							</small>
							{#if food.saturatedFat !== undefined}
								<small class="pl-2 text-xs text-muted-foreground">Grasas saturadas: {fmt(food.saturatedFat)} g / {food.base}g</small>
							{/if}
							{#if food.sugars !== undefined}
								<small class="pl-2 text-xs text-muted-foreground">Azúcares totales: {fmt(food.sugars)} g / {food.base}g</small>
							{/if}
							<small class="text-xs text-muted-foreground">{usedIn(food)}</small>
						</div>
						<div class="flex shrink-0 gap-1.5">
							<Button
								variant="ghost"
								size="icon-sm"
								class={food.favorite ? 'text-yellow-500 hover:text-yellow-500' : 'text-muted-foreground hover:text-foreground'}
								onclick={() => toggleFavorite(food)}
								title={food.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
								aria-label={food.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
							>
								<StarIcon fill={food.favorite ? 'currentColor' : 'none'} />
							</Button>
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
	message={deleteMessage(confirmFood)}
	onConfirm={async () => {
		if (confirmFood) await remove(confirmFood);
	}}
	onClose={() => (confirmFood = null)}
/>
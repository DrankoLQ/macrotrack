<script lang="ts">
	import { onMount } from 'svelte';
	import { db, MEAL_TYPES, type MealType, type Recipe, type RecipeItem } from '$lib/db';
	import { fmt } from '$lib/format';
	import { recipeGrams, recipeTotals } from '$lib/recipes';
	import { decodeRecipe, recipeShareUrl } from '$lib/share';
	import { BrowserQRCodeSvgWriter } from '@zxing/library';
	import RecipeForm from './RecipeForm.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Share2Icon from '@lucide/svelte/icons/share-2';

	let recipes = $state<Recipe[]>([]);
	let showForm = $state(false);
	let editing = $state<Recipe | null>(null);
	let saved = $state<string | null>(null);
	let confirmRecipe = $state<Recipe | null>(null);
	let detail = $state<Recipe | null>(null);
	let sharing = $state<Recipe | null>(null);
	let shareUrl = $state('');
	let copied = $state(false);
	let qrBox = $state<HTMLDivElement | null>(null);
	let importing = $state<{ name: string; items: RecipeItem[] } | null>(null);
	let importError = $state('');
	const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

	$effect(() => {
		if (!qrBox || !shareUrl) return;
		qrBox.replaceChildren(new BrowserQRCodeSvgWriter().write(shareUrl, 220, 220));
	});

	function share(recipe: Recipe) {
		detail = null;
		copied = false;
		sharing = recipe;
		shareUrl = recipeShareUrl(recipe, location.origin);
	}

	async function sendLink() {
		try {
			if (canShare) {
				await navigator.share({ title: sharing?.name, url: shareUrl });
				return;
			}
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
		} catch {
			// el usuario canceló o el navegador no deja copiar: el enlace sigue visible
		}
	}

	onMount(() => {
		void refresh();
		// Enlace compartido: /foods#r=<receta>
		if (!location.hash.startsWith('#r=')) return;
		importing = decodeRecipe(location.hash);
		if (!importing) importError = 'El enlace de receta no es válido o está incompleto.';
		history.replaceState(null, '', location.pathname);
	});

	async function refresh() {
		recipes = await db.recipes.orderBy('name').toArray();
	}

	function macroLine(recipe: { items: RecipeItem[] }): string {
		const t = recipeTotals(recipe.items);
		return `${fmt(t.kcal, 0)} kcal · G ${fmt(t.fat)} · C ${fmt(t.carbs)} · F ${fmt(t.fiber)} · P ${fmt(t.protein)}`;
	}

	function mealLine(recipe: Recipe): string {
		if (!recipe.mealTypes?.length) return 'Cualquier comida';
		return MEAL_TYPES.filter((t) => recipe.mealTypes?.includes(t.key)).map((t) => t.label).join(', ');
	}

	function newRecipe() {
		editing = null;
		showForm = true;
	}

	function edit(recipe: Recipe) {
		editing = recipe;
		showForm = true;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function cancel() {
		showForm = false;
		editing = null;
	}

	async function save(data: { name: string; mealTypes: MealType[]; items: RecipeItem[] }) {
		if (editing?.id !== undefined) {
			await db.recipes.update(editing.id, data);
		} else {
			await db.recipes.add({ ...data, createdAt: Date.now() });
		}
		cancel();
		saved = data.name;
		await refresh();
	}

	async function remove(recipe: Recipe) {
		if (recipe.id === undefined) return;
		await db.recipes.delete(recipe.id);
		await refresh();
	}
</script>

<Card>
	<CardContent class="flex flex-col gap-3">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-base font-semibold">Recetas <span class="text-xs font-normal text-muted-foreground">· macros por ración</span></h2>
			<Button variant="outline" onclick={() => (showForm ? cancel() : newRecipe())}>
				{showForm ? 'Cancelar' : 'Nueva receta'}
			</Button>
		</div>
		{#if importError}<p role="alert" class="text-sm text-destructive">{importError}</p>{/if}
		{#if saved && !showForm}
			<p class="text-xs text-muted-foreground">«{saved}» guardada ✓</p>
		{/if}

		{#if showForm}
			<div class="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
				<h3 class="text-sm font-semibold">{editing ? 'Editar receta' : 'Nueva receta'}</h3>
				{#key editing?.id ?? 'nueva'}
					<RecipeForm
						initial={editing ?? undefined}
						submitLabel={editing ? 'Guardar cambios' : 'Guardar receta'}
						onSave={save}
					/>
				{/key}
			</div>
		{/if}

		{#if recipes.length === 0}
			<p class="text-sm text-muted-foreground">
				Aún no tienes recetas. Crea una combinando alimentos de tu base de datos; cada receta es una ración.
			</p>
		{:else}
			<ul>
				{#each recipes as recipe (recipe.id)}
					<li class="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-b-0">
						<button
							type="button"
							class="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
							onclick={() => (detail = recipe)}
							title="Ver ingredientes"
						>
							<strong class="text-sm">{recipe.name}</strong>
							<small class="text-xs text-muted-foreground">{macroLine(recipe)}</small>
							<small class="text-xs text-muted-foreground">
								{mealLine(recipe)} · 1 ración · {recipe.items.length} {recipe.items.length === 1 ? 'alimento' : 'alimentos'} · {fmt(recipeGrams(recipe.items))} g · ver ingredientes
							</small>
						</button>
						<div class="flex shrink-0 gap-1.5">
							<Button variant="ghost" size="icon-sm" onclick={() => edit(recipe)} title="Editar" aria-label="Editar">
								<PencilIcon />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								class="text-destructive hover:text-destructive"
								onclick={() => (confirmRecipe = recipe)}
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

<Dialog.Root
	open={detail !== null}
	onOpenChange={(open) => {
		if (!open) detail = null;
	}}
>
	<Dialog.Content class="overflow-y-auto overscroll-contain">
		{#if detail}
			<Dialog.Header>
				<Dialog.Title>{detail.name}</Dialog.Title>
				<Dialog.Description>
					1 ración · {detail.items.length} {detail.items.length === 1 ? 'alimento' : 'alimentos'} · {fmt(recipeGrams(detail.items))} g
				</Dialog.Description>
			</Dialog.Header>
			<ul>
				{#each detail.items as item, index (index)}
					<li class="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0">
						<span class="min-w-0 flex-1 text-sm">{item.name}</span>
						<span class="shrink-0 text-xs text-muted-foreground">
							{#if item.units}{fmt(item.units)} ud · {/if}{fmt(item.grams)} g · {fmt(item.kcal, 0)} kcal
						</span>
					</li>
				{/each}
			</ul>
			<p class="text-sm">
				<strong>Ración</strong>
				<span class="text-muted-foreground"> · {macroLine(detail)}</span>
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={() => detail && share(detail)}>
					<Share2Icon />
					Compartir
				</Button>
				<Button
					variant="outline"
					onclick={() => {
						const recipe = detail;
						detail = null;
						if (recipe) edit(recipe);
					}}
				>Editar receta</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	open={confirmRecipe !== null}
	title="Eliminar receta"
	message={confirmRecipe ? `¿Eliminar «${confirmRecipe.name}»? Esta acción no se puede deshacer.` : ''}
	onConfirm={async () => {
		if (confirmRecipe) await remove(confirmRecipe);
	}}
	onClose={() => (confirmRecipe = null)}
/>

<Dialog.Root
	open={sharing !== null}
	onOpenChange={(open) => {
		if (!open) {
			sharing = null;
			shareUrl = '';
		}
	}}
>
	<Dialog.Content class="overflow-y-auto overscroll-contain">
		{#if sharing}
			<Dialog.Header>
				<Dialog.Title>Compartir «{sharing.name}»</Dialog.Title>
				<Dialog.Description>
					Escanea el código con la cámara del otro móvil: la receta viaja entera dentro del enlace, sin pasar por ningún servidor.
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex justify-center rounded-lg bg-white p-3">
				<div bind:this={qrBox}></div>
			</div>
			<Button variant="outline" onclick={sendLink}>
				{copied ? 'Enlace copiado ✓' : canShare ? 'Compartir enlace…' : 'Copiar enlace'}
			</Button>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	open={importing !== null}
	title="Importar receta"
	message={importing
		? `¿Guardar «${importing.name}» (${importing.items.length} ${importing.items.length === 1 ? 'alimento' : 'alimentos'} · ${fmt(recipeGrams(importing.items))} g) en tus recetas?`
		: ''}
	onConfirm={async () => {
		if (importing) await save({ name: importing.name, mealTypes: [], items: importing.items });
	}}
	onClose={() => (importing = null)}
/>

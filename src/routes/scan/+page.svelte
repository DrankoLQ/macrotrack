<script lang="ts">
	import { onDestroy } from 'svelte';
	import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
	import { db, type Food } from '$lib/db';
	import { diary } from '$lib/stores.svelte';
	import { fetchProductByBarcode, offToFood, type OffProduct } from '$lib/openfoodfacts';
	import { parseOptionalNutrient } from '$lib/nutrient-input';
	import { findFoodMatch } from '$lib/foodmatch';
	import { fmt, toNumber } from '$lib/format';
	import FoodForm from '$lib/components/FoodForm.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	type Status = 'idle' | 'starting' | 'scanning' | 'found' | 'notfound' | 'error';

	let reader: BrowserMultiFormatReader | null = null;

	let status = $state<Status>('idle');
	let code = $state('');
	let localFood: Food | null = $state(null);
	let offProduct: OffProduct | null = $state(null);
	let duplicateFood = $state<Food | null>(null);
	let allowDuplicate = $state(false);
	let grams = $state(100);
	let errorMsg = $state('');
	let added = $state<{ name: string; kind: 'catalog' | 'diary' } | null>(null);
	let manualCode = $state('');
	let editedError = $state('');
	let manualError = $state('');
	const edited = $state({ name: '', brand: '', unitSize: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', saturatedFat: '', sugars: '' });
	const manual = $state({ name: '', brand: '', unitSize: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', saturatedFat: '', sugars: '' });

	const hints = new Map();
	hints.set(DecodeHintType.POSSIBLE_FORMATS, [
		BarcodeFormat.EAN_13,
		BarcodeFormat.EAN_8,
		BarcodeFormat.UPC_A,
		BarcodeFormat.UPC_E,
		BarcodeFormat.CODE_128
	]);

	onDestroy(() => stopScanning());

	async function start() {
		status = 'starting';
		errorMsg = '';
		try {
			await navigator.mediaDevices.getUserMedia({ video: true });
			const videoEl = document.querySelector<HTMLVideoElement>('#scanner-video');
			if (!videoEl) throw new Error('Elemento de vídeo no encontrado');
			reader = new BrowserMultiFormatReader(hints, 150);
			await reader.decodeFromVideoDevice(null, videoEl, (result) => {
				if (result) handleCode(result.getText());
			});
			status = 'scanning';
		} catch (error) {
			status = 'error';
			errorMsg = error instanceof Error ? error.message : 'No se pudo acceder a la cámara';
		}
	}

	function stopScanning() {
		if (reader) {
			reader.reset();
			reader = null;
		}
		if (status === 'scanning' || status === 'starting') status = 'idle';
	}

	async function handleCode(raw: string) {
		const value = raw.trim();
		if (!value) return;
		code = value;
		editedError = '';
		manualError = '';
		added = null;
		stopScanning();
		localFood = (await db.foods.where('barcode').equals(value).first()) ?? null;
		if (localFood) {
			status = 'found';
			return;
		}
		offProduct = await fetchProductByBarcode(value);
		if (offProduct) {
			edited.name = offProduct.name;
			edited.brand = offProduct.brand ?? '';
			edited.unitSize = '';
			edited.kcal = fmt(offProduct.kcal);
			edited.protein = fmt(offProduct.protein);
			edited.carbs = fmt(offProduct.carbs);
			edited.fat = fmt(offProduct.fat);
			edited.fiber = fmt(offProduct.fiber);
			edited.saturatedFat = offProduct.saturatedFat === undefined ? '' : String(offProduct.saturatedFat);
			edited.sugars = offProduct.sugars === undefined ? '' : String(offProduct.sugars);
			status = 'found';
			return;
		}
		status = 'notfound';
		Object.assign(manual, { name: '', brand: '', unitSize: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', saturatedFat: '', sugars: '' });
	}

	async function saveFood(food: Omit<Food, 'id'>) {
		try {
			await db.foods.add(food);
		} catch {
			const existing = await db.foods.where('barcode').equals(code).first();
			if (!existing) throw new Error('No se pudo guardar el producto');
		}
		added = { name: food.name, kind: 'catalog' };
	}

	async function addFromOff() {
		if (!offProduct) return;
		const saturatedFat = parseOptionalNutrient(edited.saturatedFat);
		const sugars = parseOptionalNutrient(edited.sugars);
		if (!saturatedFat.ok || !sugars.ok) {
			editedError = 'Introduce cantidades finitas y no negativas, o deja el campo vacío';
			return;
		}
		editedError = '';
		const unitSize = toNumber(edited.unitSize);
		const food = {
			...offToFood(
				{
					name: edited.name.trim() || offProduct.name,
					brand: edited.brand.trim() || undefined,
					kcal: toNumber(edited.kcal) || 0,
					protein: toNumber(edited.protein) || 0,
					carbs: toNumber(edited.carbs) || 0,
					fat: toNumber(edited.fat) || 0,
					fiber: toNumber(edited.fiber) || 0,
					...(saturatedFat.value === undefined ? {} : { saturatedFat: saturatedFat.value }),
					...(sugars.value === undefined ? {} : { sugars: sugars.value }),
					imageUrl: offProduct.imageUrl
				},
				code
			),
			...(unitSize > 0 ? { unitSize } : {})
		};
		await saveFood(food);
		resetResult();
	}

	async function addFromLocal() {
		if (!localFood) return;
		await diary.addFood(localFood, grams);
		added = { name: localFood.name, kind: 'diary' };
		resetResult();
	}

	async function addManual() {
		const name = manual.name.trim();
		if (!name) return;
		const saturatedFat = parseOptionalNutrient(manual.saturatedFat);
		const sugars = parseOptionalNutrient(manual.sugars);
		if (!saturatedFat.ok || !sugars.ok) {
			manualError = 'Introduce cantidades finitas y no negativas, o deja el campo vacío';
			return;
		}
		manualError = '';
		const unitSize = toNumber(manual.unitSize);
		if (!allowDuplicate) {
			const match = findFoodMatch(await db.foods.toArray(), name, manual.brand.trim() || undefined);
			if (match) {
				duplicateFood = match;
				return;
			}
		}
		allowDuplicate = false;
		duplicateFood = null;
		await saveFood({
			name,
			barcode: code.trim() || undefined,
			brand: manual.brand.trim() || undefined,
			...(unitSize > 0 ? { unitSize } : {}),
			base: 100,
			kcal: toNumber(manual.kcal) || 0,
			protein: toNumber(manual.protein) || 0,
			carbs: toNumber(manual.carbs) || 0,
			fat: toNumber(manual.fat) || 0,
			fiber: toNumber(manual.fiber) || 0,
			...(saturatedFat.value === undefined ? {} : { saturatedFat: saturatedFat.value }),
			...(sugars.value === undefined ? {} : { sugars: sugars.value }),
			source: 'manual',
			createdAt: Date.now()
		});
		Object.assign(manual, { name: '', brand: '', unitSize: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', saturatedFat: '', sugars: '' });
		resetResult();
	}

	function createDuplicate() {
		allowDuplicate = true;
		void addManual();
	}

	function resetResult() {
		localFood = null;
		offProduct = null;
		editedError = '';
		Object.assign(edited, { name: '', brand: '', unitSize: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', saturatedFat: '', sugars: '' });
		status = 'idle';
	}
</script>

<Card>
	<CardContent class="flex flex-col gap-3">
		<h2 class="text-base font-semibold">Escanear código de barras</h2>
		{#if status === 'scanning' || status === 'starting'}
			<div class="mb-3 overflow-hidden rounded-xl bg-black">
				<video id="scanner-video" class="block h-80 w-full object-cover" playsinline muted></video>
			</div>
			<Button variant="outline" onclick={stopScanning}>Detener</Button>
		{:else}
			<Button onclick={start}>Iniciar cámara</Button>
		{/if}
		{#if status === 'error'}
			<p class="text-sm text-destructive">{errorMsg}. Prueba desde Safari o usa el código manual.</p>
		{/if}
		<div class="mt-3">
			<Label class="mb-1 block">Código manual</Label>
			<div class="flex gap-2">
				<Input bind:value={manualCode} placeholder="8412345678901" inputmode="numeric" />
				<Button variant="outline" onclick={() => handleCode(manualCode)}>Buscar</Button>
			</div>
		</div>
	</CardContent>
</Card>

{#if added}
	<Card>
		<CardContent class="flex flex-col gap-2">
			{#if added.kind === 'diary'}
				<p class="font-semibold">«{added.name}» añadido al diario ✓ <a class="text-primary underline-offset-4 hover:underline" href="/">Ir al diario</a></p>
			{:else}
				<p class="font-semibold">«{added.name}» guardado en tu base de datos ✓ <a class="text-primary underline-offset-4 hover:underline" href="/foods">Ver en alimentos</a></p>
			{/if}
			<Button variant="outline" onclick={() => (added = null)}>Escanear otro</Button>
		</CardContent>
	</Card>
{/if}

{#if localFood || offProduct}
	<Card>
		<CardContent class="flex flex-col gap-3">
			{#if offProduct}
				<p class="text-sm text-muted-foreground">Código {code} · datos editables por 100g</p>
				{#if offProduct.imageUrl}
					<img class="h-18 w-18 rounded-lg object-cover" src={offProduct.imageUrl} alt="" />
				{/if}
				<FoodForm values={edited} />
				{#if editedError}<p role="alert" class="text-sm text-destructive">{editedError}</p>{/if}
				<p class="pl-2 text-xs text-muted-foreground">OpenFoodFacts · Grasas saturadas: {offProduct.saturatedFat === undefined ? 'Sin datos completos' : `${fmt(offProduct.saturatedFat)} g`} / 100g</p>
				<p class="pl-2 text-xs text-muted-foreground">OpenFoodFacts · Azúcares totales: {offProduct.sugars === undefined ? 'Sin datos completos' : `${fmt(offProduct.sugars)} g`} / 100g</p>
				<div class="flex items-end gap-2">
					<div class="w-28">
						<Label class="mb-1 block">Gramos</Label>
						<Input type="text" min="1" bind:value={grams} inputmode="decimal" />
					</div>
					<Button onclick={addFromOff}>Guardar en base de datos</Button>
				</div>
				<Button variant="outline" onclick={resetResult}>Cancelar</Button>
			{:else if localFood}
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="text-base font-semibold">{localFood.name}</h2>
					<Badge variant="secondary">Ya en tu base de datos</Badge>
				</div>
				{#if localFood.brand}<p class="text-sm text-muted-foreground">{localFood.brand}</p>{/if}
				{#if localFood.imageUrl}
					<img class="h-18 w-18 rounded-lg object-cover" src={localFood.imageUrl} alt="" />
				{/if}
				<p class="text-sm text-muted-foreground">
					Código {code} · {fmt(localFood.kcal)} kcal · G {fmt(localFood.fat)} · C {fmt(localFood.carbs)} · F {fmt(localFood.fiber)} · P {fmt(localFood.protein)} / 100g
				</p>
				<p class="pl-2 text-xs text-muted-foreground">Grasas saturadas: {localFood.saturatedFat === undefined ? 'Sin datos completos' : `${fmt(localFood.saturatedFat)} g`} / {localFood.base}g</p>
				<p class="pl-2 text-xs text-muted-foreground">Azúcares totales: {localFood.sugars === undefined ? 'Sin datos completos' : `${fmt(localFood.sugars)} g`} / {localFood.base}g</p>
				<div class="flex items-end gap-2">
					<div class="w-28">
						<Label class="mb-1 block">Gramos</Label>
						<Input type="text" min="1" bind:value={grams} inputmode="decimal" />
					</div>
					<Button onclick={addFromLocal}>Añadir al diario</Button>
				</div>
				<Button variant="outline" onclick={resetResult}>Cancelar</Button>
			{/if}
		</CardContent>
	</Card>
{/if}

{#if status === 'notfound'}
	<Card>
		<CardContent>
			<p class="text-sm text-muted-foreground">El código {code} no está en tu base de datos ni en OpenFoodFacts.</p>
		</CardContent>
	</Card>
{/if}

<Card>
	<CardContent class="flex flex-col gap-3">
		<h2 class="text-base font-semibold">Añadir manualmente</h2>
		<p class="text-sm text-muted-foreground">Si el producto no tiene código de barras o no se encuentra, rellena los datos:</p>
		<FoodForm values={manual} placeholders />
		{#if manualError}<p role="alert" class="text-sm text-destructive">{manualError}</p>{/if}
		{#if duplicateFood}
			<div class="rounded-lg border border-border bg-secondary p-3 text-sm">
				<p>Ya existe «{duplicateFood.name}»{#if duplicateFood.brand} · {duplicateFood.brand}{/if} en tu base de datos.</p>
				<div class="mt-2 flex flex-wrap gap-2">
					<Button variant="outline" size="sm" href="/foods">Ver en alimentos</Button>
					<Button size="sm" onclick={createDuplicate}>Crear igualmente</Button>
				</div>
			</div>
		{/if}
		<Button onclick={addManual} disabled={!manual.name.trim()}>Guardar en base de datos</Button>
	</CardContent>
</Card>
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
	import { db, type Food } from '$lib/db';
	import { diary } from '$lib/stores.svelte';
	import { fetchProductByBarcode, offToFood, type OffProduct } from '$lib/openfoodfacts';
	import { fmt, toNumber } from '$lib/format';
	import FoodForm from '$lib/components/FoodForm.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	type Status = 'idle' | 'starting' | 'scanning' | 'found' | 'notfound' | 'error';

	let reader: BrowserMultiFormatReader | null = null;

	let status = $state<Status>('idle');
	let code = $state('');
	let localFood: Food | null = $state(null);
	let offProduct: OffProduct | null = $state(null);
	let grams = $state(100);
	let errorMsg = $state('');
	let added = $state<string | null>(null);
	let manualCode = $state('');
	const edited = $state({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
	const manual = $state({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });

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
			edited.kcal = fmt(offProduct.kcal);
			edited.protein = fmt(offProduct.protein);
			edited.carbs = fmt(offProduct.carbs);
			edited.fat = fmt(offProduct.fat);
			edited.fiber = fmt(offProduct.fiber);
			status = 'found';
			return;
		}
		status = 'notfound';
		Object.assign(manual, { name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
	}

	async function saveFood(food: Omit<Food, 'id'>) {
		try {
			await db.foods.add(food);
		} catch {
			const existing = await db.foods.where('barcode').equals(code).first();
			if (!existing) throw new Error('No se pudo guardar el producto');
		}
		added = food.name;
	}

	async function addFromOff() {
		if (!offProduct) return;
		const food = offToFood(
			{
				name: edited.name.trim() || offProduct.name,
				brand: edited.brand.trim() || undefined,
				kcal: toNumber(edited.kcal) || 0,
				protein: toNumber(edited.protein) || 0,
				carbs: toNumber(edited.carbs) || 0,
				fat: toNumber(edited.fat) || 0,
				fiber: toNumber(edited.fiber) || 0,
				imageUrl: offProduct.imageUrl
			},
			code
		);
		await saveFood(food);
		resetResult();
	}

	async function addFromLocal() {
		if (!localFood) return;
		await diary.addFood(localFood, grams);
		added = localFood.name;
		resetResult();
	}

	async function addManual() {
		const name = manual.name.trim();
		if (!name) return;
		await saveFood({
			name,
			barcode: code.trim() || undefined,
			brand: manual.brand.trim() || undefined,
			base: 100,
			kcal: toNumber(manual.kcal) || 0,
			protein: toNumber(manual.protein) || 0,
			carbs: toNumber(manual.carbs) || 0,
			fat: toNumber(manual.fat) || 0,
			fiber: toNumber(manual.fiber) || 0,
			source: 'manual',
			createdAt: Date.now()
		});
		Object.assign(manual, { name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
		resetResult();
	}

	function resetResult() {
		localFood = null;
		offProduct = null;
		Object.assign(edited, { name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
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
			<p class="font-semibold">«{added}» guardado en tu base de datos ✓ <a class="text-primary underline-offset-4 hover:underline" href="/">Ir al diario</a></p>
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
				<div class="flex items-end gap-2">
					<div class="w-28">
						<Label class="mb-1 block">Gramos</Label>
						<Input type="text" min="1" bind:value={grams} inputmode="decimal" />
					</div>
					<Button onclick={addFromOff}>Guardar en base de datos</Button>
				</div>
				<Button variant="outline" onclick={resetResult}>Cancelar</Button>
			{:else if localFood}
				<h2 class="text-base font-semibold">{localFood.name}</h2>
				{#if localFood.brand}<p class="text-sm text-muted-foreground">{localFood.brand}</p>{/if}
				{#if localFood.imageUrl}
					<img class="h-18 w-18 rounded-lg object-cover" src={localFood.imageUrl} alt="" />
				{/if}
				<p class="text-sm text-muted-foreground">
					Código {code} · {fmt(localFood.kcal)} kcal · G {fmt(localFood.fat)} · C {fmt(localFood.carbs)} · F {fmt(localFood.fiber)} · P {fmt(localFood.protein)} / 100g
				</p>
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
		<Button onclick={addManual} disabled={!manual.name.trim()}>Guardar en base de datos</Button>
	</CardContent>
</Card>
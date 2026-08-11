<script lang="ts">
	import { onDestroy } from 'svelte';
	import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
	import { db, type Food } from '$lib/db';
	import { diary } from '$lib/stores.svelte';
	import { fetchProductByBarcode, offToFood, type OffProduct } from '$lib/openfoodfacts';
	import { fmt } from '$lib/format';
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
	let editedName = $state('');
	let manualName = $state('');
	let manualBrand = $state('');
	const manual = $state({ kcal: '', protein: '', carbs: '', fat: '', fiber: '' });

	const hints = new Map();
	hints.set(DecodeHintType.POSSIBLE_FORMATS, [
		BarcodeFormat.EAN_13,
		BarcodeFormat.EAN_8,
		BarcodeFormat.UPC_A,
		BarcodeFormat.UPC_E,
		BarcodeFormat.CODE_128
	]);

	const display = $derived.by(() => {
		const food = localFood;
		if (food) {
			return {
				name: food.name,
				brand: food.brand,
				imageUrl: food.imageUrl,
				kcal: food.kcal,
				protein: food.protein,
				carbs: food.carbs,
				fat: food.fat,
				fiber: food.fiber
			};
		}
		const off = offProduct;
		if (off) {
			return {
				name: off.name,
				brand: off.brand,
				imageUrl: off.imageUrl,
				kcal: off.kcal,
				protein: off.protein,
				carbs: off.carbs,
				fat: off.fat,
				fiber: off.fiber
			};
		}
		return null;
	});

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
			editedName = offProduct.name;
			status = 'found';
			return;
		}
		status = 'notfound';
		manualName = '';
		manualBrand = '';
		Object.assign(manual, { kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
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
		const name = editedName.trim() || offProduct.name;
		const food = offToFood({ ...offProduct, name }, code);
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
		const name = manualName.trim();
		if (!name) return;
		const toNumber = (value: string) => parseFloat(value) || 0;
		await saveFood({
			name,
			barcode: code.trim() || undefined,
			brand: manualBrand.trim() || undefined,
			base: 100,
			kcal: toNumber(manual.kcal),
			protein: toNumber(manual.protein),
			carbs: toNumber(manual.carbs),
			fat: toNumber(manual.fat),
			fiber: toNumber(manual.fiber),
			source: 'manual',
			createdAt: Date.now()
		});
		manualName = '';
		manualBrand = '';
		Object.assign(manual, { kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
		resetResult();
	}

	function resetResult() {
		localFood = null;
		offProduct = null;
		editedName = '';
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

{#if display}
	<Card>
		<CardContent class="flex flex-col gap-3">
			{#if offProduct}
				<div>
					<Label class="mb-1 block">Nombre (editable)</Label>
					<Input bind:value={editedName} />
				</div>
			{:else}
				<h2 class="text-base font-semibold">{display.name}</h2>
			{/if}
			{#if display.brand}<p class="text-sm text-muted-foreground">{display.brand}</p>{/if}
			{#if display.imageUrl}
				<img class="h-18 w-18 rounded-lg object-cover" src={display.imageUrl} alt="" />
			{/if}
			<p class="text-sm text-muted-foreground">
				Código {code} · {fmt(display.kcal)} kcal · P {fmt(display.protein)} · C {fmt(display.carbs)} · G {fmt(display.fat)} · F {fmt(display.fiber)} / 100g
			</p>
			<div class="flex items-end gap-2">
				<div class="w-28">
					<Label class="mb-1 block">Gramos</Label>
					<Input type="number" min="1" bind:value={grams} inputmode="decimal" />
				</div>
				{#if localFood}
					<Button onclick={addFromLocal}>Añadir al diario</Button>
				{:else}
					<Button onclick={addFromOff}>Guardar en base de datos</Button>
				{/if}
			</div>
			<Button variant="outline" onclick={resetResult}>Cancelar</Button>
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
		<div>
			<Label class="mb-1 block">Nombre</Label>
			<Input bind:value={manualName} placeholder="Ej: Galletas de avena" />
		</div>
		<div>
			<Label class="mb-1 block">Marca</Label>
			<Input bind:value={manualBrand} placeholder="Ej: Hacendado" />
		</div>
		<div class="grid grid-cols-2 gap-2">
			<div>
				<Label class="mb-1 block">kcal / 100g</Label>
				<Input type="number" bind:value={manual.kcal} inputmode="decimal" />
			</div>
			<div>
				<Label class="mb-1 block">Proteína / 100g</Label>
				<Input type="number" bind:value={manual.protein} inputmode="decimal" />
			</div>
			<div>
				<Label class="mb-1 block">Hidratos / 100g</Label>
				<Input type="number" bind:value={manual.carbs} inputmode="decimal" />
			</div>
			<div>
				<Label class="mb-1 block">Grasas / 100g</Label>
				<Input type="number" bind:value={manual.fat} inputmode="decimal" />
			</div>
			<div>
				<Label class="mb-1 block">Fibra / 100g</Label>
				<Input type="number" bind:value={manual.fiber} inputmode="decimal" />
			</div>
		</div>
		<Button onclick={addManual} disabled={!manualName.trim()}>Guardar en base de datos</Button>
	</CardContent>
</Card>
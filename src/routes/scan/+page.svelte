<script lang="ts">
	import { onDestroy } from 'svelte';
	import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
	import { db, type Food } from '$lib/db';
	import { diary } from '$lib/stores.svelte';
	import { fetchProductByBarcode, offToFood, type OffProduct } from '$lib/openfoodfacts';
	import { fmt } from '$lib/format';

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
			barcode: code,
			base: 100,
			kcal: toNumber(manual.kcal),
			protein: toNumber(manual.protein),
			carbs: toNumber(manual.carbs),
			fat: toNumber(manual.fat),
			fiber: toNumber(manual.fiber),
			source: 'manual',
			createdAt: Date.now()
		});
		resetResult();
	}

	function resetResult() {
		localFood = null;
		offProduct = null;
		editedName = '';
		status = 'idle';
	}
</script>

<section class="card">
	<h2>Escanear código de barras</h2>
	{#if status === 'scanning' || status === 'starting'}
		<div class="video-wrap">
			<video id="scanner-video" playsinline muted></video>
		</div>
		<button class="secondary" onclick={stopScanning}>Detener</button>
	{:else}
		<button onclick={start}>Iniciar cámara</button>
	{/if}
	{#if status === 'error'}
		<p class="error">{errorMsg}. Prueba desde Safari o usa el código manual.</p>
	{/if}
	<div class="manual">
		<label>Código manual
			<div class="row">
				<input
					bind:value={manualCode}
					placeholder="8412345678901"
					inputmode="numeric"
				/>
				<button class="secondary" onclick={() => handleCode(manualCode)}>Buscar</button>
			</div>
		</label>
	</div>
</section>

{#if added}
	<section class="card">
		<p class="added">«{added}» guardado en tu base de datos ✓ <a href="/">Ir al diario</a></p>
		<button class="secondary" onclick={() => (added = null)}>Escanear otro</button>
	</section>
{/if}

{#if display}
	<section class="card">
		{#if offProduct}
			<label>Nombre (editable)<input bind:value={editedName} /></label>
		{:else}
			<h2>{display.name}</h2>
		{/if}
		{#if display.brand}<p class="muted">{display.brand}</p>{/if}
		{#if display.imageUrl}
			<img class="thumb" src={display.imageUrl} alt="" />
		{/if}
		<p class="muted">
			Código {code} · {fmt(display.kcal)} kcal · P {fmt(display.protein)} · C {fmt(display.carbs)} · G {fmt(display.fat)} · F {fmt(display.fiber)} / 100g
		</p>
		<div class="row">
			<label>Gramos<input type="number" min="1" bind:value={grams} /></label>
			{#if localFood}
				<button onclick={addFromLocal}>Añadir al diario</button>
			{:else}
				<button onclick={addFromOff}>Guardar en base de datos</button>
			{/if}
		</div>
		<button class="secondary" onclick={resetResult}>Cancelar</button>
	</section>
{/if}

{#if status === 'notfound'}
	<section class="card">
		<h2>No encontrado</h2>
		<p class="muted">El código {code} no está en tu base de datos ni en OpenFoodFacts. Añádelo manualmente:</p>
		<div class="manual-form">
			<label>Nombre<input bind:value={manualName} placeholder="Ej: Galletas de avena" /></label>
			<div class="grid">
				<label>kcal / 100g<input type="number" bind:value={manual.kcal} /></label>
				<label>Proteína / 100g<input type="number" bind:value={manual.protein} /></label>
				<label>Hidratos / 100g<input type="number" bind:value={manual.carbs} /></label>
				<label>Grasas / 100g<input type="number" bind:value={manual.fat} /></label>
				<label>Fibra / 100g<input type="number" bind:value={manual.fiber} /></label>
			</div>
			<button onclick={addManual} disabled={!manualName.trim()}>Guardar en base de datos</button>
		</div>
	</section>
{/if}

<style>
	.video-wrap {
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 12px;
		background: #000;
	}

	video {
		width: 100%;
		height: 320px;
		object-fit: cover;
		display: block;
	}

	.manual {
		margin-top: 12px;
	}

	.thumb {
		width: 72px;
		height: 72px;
		border-radius: 8px;
		object-fit: cover;
	}

	.added {
		font-weight: 600;
		margin: 0 0 8px;
	}

	a {
		color: var(--accent);
	}

	.manual-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 8px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
	}
</style>

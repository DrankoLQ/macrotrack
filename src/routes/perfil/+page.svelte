<script lang="ts">
	import {
		computeGoalsBreakdown,
		goals,
		today,
		profile,
		weights,
		saveGoals,
		saveProfile,
		type ActivityLevel,
		type Goal,
		type Sex
	} from '$lib/stores.svelte';
	import { fmt, toNumber } from '$lib/format';
	import { type Weight } from '$lib/db';
	import { MACROS } from '$lib/macros';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Select as SelectPrimitive } from 'bits-ui';

	const SEX_OPTIONS: { key: Sex; label: string }[] = [
		{ key: 'male', label: 'Hombre' },
		{ key: 'female', label: 'Mujer' }
	];

	const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string }[] = [
		{ key: 'sedentary', label: 'Sedentario (poco ejercicio)' },
		{ key: 'light', label: 'Ligero (1–2 días/semana)' },
		{ key: 'moderate', label: 'Moderado (3–4 días/semana)' },
		{ key: 'active', label: 'Intenso (5+ días/semana)' }
	];

	const ACTIVITY_SHORT: Record<ActivityLevel, string> = {
		sedentary: 'Sedentario',
		light: 'Ligero',
		moderate: 'Moderado',
		active: 'Intenso'
	};

	const GOAL_OPTIONS: { key: Goal; label: string }[] = [
		{ key: 'lose', label: 'Perder grasa (−400 kcal)' },
		{ key: 'recomp', label: 'Recomposición (−250 kcal)' },
		{ key: 'maintain', label: 'Mantener (sin ajuste)' },
		{ key: 'gain', label: 'Ganar músculo (+250 kcal)' }
	];

	const GOAL_SHORT: Record<Goal, string> = {
		lose: 'Perder grasa',
		recomp: 'Recomposición',
		maintain: 'Mantener',
		gain: 'Ganar músculo'
	};

	const pform = $state({
		height: '',
		weight: '',
		age: '',
		sex: 'male' as Sex,
		activity: 'moderate' as ActivityLevel,
		goal: 'recomp' as Goal
	});

	$effect(() => {
		const p = profile.value;
		if (p && pform.height === '') {
			Object.assign(pform, {
				height: String(p.height),
				weight: String(p.weight),
				age: String(p.age),
				sex: p.sex,
				activity: p.activity,
				goal: p.goal
			});
		}
	});

	// Los objetivos usan el último peso registrado; el del perfil es solo el respaldo sin registros.
	const latestWeight = $derived(weights.records.at(-1));
	const effectiveWeight = $derived(latestWeight?.weight ?? toNumber(pform.weight));

	const profileBreakdown = $derived.by(() => {
		const height = toNumber(pform.height);
		const weight = effectiveWeight;
		const age = toNumber(pform.age);
		if (!height || !weight || !age) return null;
		return computeGoalsBreakdown({ height, weight, age, sex: pform.sex, activity: pform.activity, goal: pform.goal });
	});

	const profileTotals = $derived(profileBreakdown?.totals ?? null);

	$effect(() => {
		if (!profileTotals) return;
		Object.assign(goals, profileTotals);
		saveGoals();
		saveProfile({
			height: toNumber(pform.height),
			weight: effectiveWeight,
			age: toNumber(pform.age),
			sex: pform.sex,
			activity: pform.activity,
			goal: pform.goal
		});
	});

	const profileSummary = $derived.by(() => {
		const parts: string[] = [];
		if (toNumber(pform.height) > 0) parts.push(`${fmt(toNumber(pform.height))} cm`);
		if (toNumber(pform.age) > 0) parts.push(`${fmt(toNumber(pform.age))} años`);
		parts.push(SEX_OPTIONS.find((option) => option.key === pform.sex)?.label ?? '');
		parts.push(ACTIVITY_SHORT[pform.activity]);
		parts.push(GOAL_SHORT[pform.goal]);
		return parts.filter(Boolean).join(' · ');
	});

	const weightSource = $derived.by(() => {
		if (latestWeight) return `Peso usado: ${fmt(latestWeight.weight)} kg (registro del ${weightDateLabel(latestWeight.date)})`;
		const manual = toNumber(pform.weight);
		return manual > 0 ? `Peso usado: ${fmt(manual)} kg (del perfil, sin registros de peso)` : null;
	});

	let weightInput = $state('');
	let bodyFatInput = $state('');
	let weightSaved = $state(false);

	const weightRange = $derived.by(() => {
		const todayMs = new Date(today() + 'T12:00:00').getTime();
		const DAY = 86_400_000;
		const slice = weights.records.filter(
			(r) => todayMs - new Date(r.date + 'T12:00:00').getTime() <= 29 * DAY
		);
		if (slice.length < 2) return null;
		const min = Math.min(...slice.map((r) => r.weight));
		const max = Math.max(...slice.map((r) => r.weight));
		const pad = Math.max((max - min) * 0.2, 0.2);
		const W = 258;
		const H = 96;
		const ms = (date: string) => new Date(date + 'T12:00:00').getTime();
		const minMs = Math.min(...slice.map((r) => ms(r.date)));
		const maxMs = Math.max(...slice.map((r) => ms(r.date)));
		const y = (w: number) => 106 - ((w - min + pad) / (max - min + pad * 2)) * H;
		const points = slice.map((r, i) => {
			const t =
				maxMs === minMs ? i / (slice.length - 1) : (ms(r.date) - minMs) / (maxMs - minMs);
			const x = 40 + (0.05 + t * 0.9) * W;
			return { x: x.toFixed(1), y: y(r.weight).toFixed(1) };
		});
		const info = slice.map((r, i) => ({
			...points[i],
			date: r.date,
			weight: r.weight,
			bodyFat: r.bodyFat
		}));
		const grid = [min, (min + max) / 2, max].map((w) => ({
			y: y(w).toFixed(1),
			label: fmt(w)
		}));
		const xLabels = [
			{ x: points[0].x, anchor: 'start', label: weightDateLabel(slice[0].date) },
			{ x: points.at(-1)!.x, anchor: 'end', label: weightDateLabel(slice.at(-1)!.date) }
		];
		const withFat = slice.filter((r) => r.bodyFat !== undefined);
		return {
			points: points.map((p) => p.x + ',' + p.y).join(' '),
			dots: points,
			info,
			grid,
			xLabels,
			delta: slice.at(-1)!.weight - slice[0].weight,
			fatDelta: withFat.length >= 2 ? withFat.at(-1)!.bodyFat! - withFat[0]!.bodyFat! : null
		};
	});

	const deltaLabel = $derived(
		weightRange ? (weightRange.delta > 0 ? '+' : '') + fmt(weightRange.delta) + ' kg' : null
	);

	const fatDeltaLabel = $derived(
		weightRange?.fatDelta == null
			? null
			: (weightRange.fatDelta > 0 ? '+' : '') + fmt(weightRange.fatDelta) + '% grasa'
	);

	// El color de la tendencia depende del objetivo: bajar es bueno al perder grasa, subir al ganar músculo.
	const weightDeltaClass = $derived.by(() => {
		if (!weightRange) return '';
		if (pform.goal === 'gain') return weightRange.delta >= 0 ? 'text-green-500' : 'text-red-500';
		if (pform.goal === 'lose') return weightRange.delta <= 0 ? 'text-green-500' : 'text-red-500';
		return 'text-muted-foreground';
	});

	const fatDeltaClass = $derived.by(() => {
		if (weightRange?.fatDelta == null) return '';
		if (weightRange.fatDelta <= 0) return 'text-green-500';
		return pform.goal === 'gain' ? 'text-muted-foreground' : 'text-red-500';
	});

	const weightHistory = $derived([...weights.records].reverse());

	let selectedWeight = $state<number | null>(null);
	let editingWeightId = $state<number | null>(null);
	let editWeightValue = $state('');
	let editBodyFatValue = $state('');

	function startWeightEdit(record: Weight) {
		editingWeightId = record.id!;
		editWeightValue = String(record.weight);
		editBodyFatValue = record.bodyFat ? String(record.bodyFat) : '';
	}

	async function saveWeightEdit(record: Weight) {
		const value = toNumber(editWeightValue);
		if (!value || value <= 0) return;
		const fat = toNumber(editBodyFatValue);
		await weights.save(record.date, value, fat > 0 ? fat : undefined);
		editingWeightId = null;
	}

	function tapWeightChart(e: PointerEvent) {
		const range = weightRange;
		if (!range) return;
		const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const scale = rect.width / 310;
		const x = (e.clientX - rect.left) / scale;
		const y = (e.clientY - rect.top) / scale;
		let best = -1;
		let bestD = 24 * 24;
		range.dots.forEach((d, i) => {
			const dx = Number(d.x) - x;
			const dy = Number(d.y) - y;
			const d2 = dx * dx + dy * dy;
			if (d2 < bestD) {
				bestD = d2;
				best = i;
			}
		});
		selectedWeight = best === selectedWeight ? null : best >= 0 ? best : null;
	}

	let confirmWeight = $state<Weight | null>(null);

	async function deleteWeight() {
		const record = confirmWeight;
		if (!record?.id) return;
		await weights.remove(record.id);
		const latest = weights.records.at(-1);
		if (weightInput === String(record.weight)) {
			weightInput = latest ? String(latest.weight) : '';
			bodyFatInput = latest?.bodyFat ? String(latest.bodyFat) : '';
		}
	}

	function weightDateLabel(date: string) {
		return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
	}

	function weightTimeLabel(record: { createdAt: number }) {
		return new Date(record.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
	}

	async function saveWeight() {
		const w = toNumber(weightInput);
		if (!w || w <= 0) return;
		const fat = toNumber(bodyFatInput);
		await weights.save(today(), w, fat > 0 ? fat : undefined);
		weightSaved = true;
		setTimeout(() => (weightSaved = false), 2500);
	}

	weights.load().then(() => {
		const latest = weights.records.at(-1);
		if (latest) {
			weightInput = String(latest.weight);
			if (latest.bodyFat) bodyFatInput = String(latest.bodyFat);
		}
	});
</script>

<Card>
	<CardContent class="flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<h2 class="text-base font-semibold">Peso</h2>
			{#if deltaLabel}
				<span class="text-xs text-muted-foreground"
					>30 días · <span class={weightDeltaClass}>{deltaLabel}</span>{#if fatDeltaLabel}
						· <span class={fatDeltaClass}>{fatDeltaLabel}</span>{/if}</span
				>
			{/if}
		</div>
		<form
			class="flex items-end gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				saveWeight();
			}}
		>
			<div class="w-32">
				<Label class="mb-1 block" for="weight-current">Peso actual (kg)</Label>
				<Input id="weight-current" type="text" bind:value={weightInput} inputmode="decimal" placeholder={profile.value ? String(profile.value.weight) : ''} />
			</div>
			<div class="w-28">
				<Label class="mb-1 block" for="weight-bodyfat">% de grasa <span class="text-muted-foreground">(opcional)</span></Label>
				<Input id="weight-bodyfat" type="text" bind:value={bodyFatInput} inputmode="decimal" placeholder="—" />
			</div>
			<Button type="submit" disabled={!weightInput.trim()}>
				{weightSaved ? 'Guardado ✓' : 'Guardar'}
			</Button>
		</form>
		{#if weightRange}
			<svg viewBox="0 0 310 120" class="w-full text-primary" role="img" aria-label="Gráfica de peso">
				<line x1="40" y1="106" x2="298" y2="106" stroke="currentColor" stroke-width="1" opacity="0.5" />
				<line x1="40" y1="10" x2="40" y2="106" stroke="currentColor" stroke-width="1" opacity="0.5" />
				{#each weightRange.grid as g}
					<line x1="40" y1={g.y} x2="298" y2={g.y} stroke="currentColor" stroke-width="1" opacity="0.15" />
					<text x="34" y={Number(g.y) + 3} font-size="8.5" text-anchor="end" fill="currentColor" opacity="0.6">{g.label}</text>
				{/each}
				{#each weightRange.xLabels as l}
					<text x={l.x} y="116" font-size="8.5" text-anchor={l.anchor} fill="currentColor" opacity="0.6">{l.label}</text>
				{/each}
				<polyline
					points={weightRange.points}
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				{#each weightRange.dots as dot, i}
					<circle cx={dot.x} cy={dot.y} r={selectedWeight === i ? 5 : 3} fill="currentColor" />
				{/each}
				{#if selectedWeight !== null && weightRange.info[selectedWeight]}
					{@const p = weightRange.info[selectedWeight]}
					{@const label = weightDateLabel(p.date) + ' · ' + fmt(p.weight) + ' kg' + (p.bodyFat ? ' · ' + fmt(p.bodyFat) + '% grasa' : '')}
					{@const py = Number(p.y)}
					{@const ty = py >= 34 ? py - 14 : py + 28}
					<g pointer-events="none">
						<rect x="0" y={ty - 11} width="310" height="22" fill="var(--background)" stroke="currentColor" stroke-width="1" rx="4" />
						<text x="155" y={ty + 3} font-size="8.5" text-anchor="middle" fill="currentColor">{label}</text>
					</g>
				{/if}
				<rect
					x="0"
					y="0"
					width="310"
					height="120"
					fill="transparent"
					role="button"
					tabindex="0"
					aria-label="Seleccionar punto de la gráfica de peso"
					onpointerdown={tapWeightChart}
					onkeydown={(e) => {
						if (!['Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
						e.preventDefault();
						if (!weightRange) return;
						const n = weightRange.dots.length;
						if (e.key === 'Enter' || e.key === ' ') selectedWeight = selectedWeight === null ? 0 : null;
						else selectedWeight = selectedWeight === null ? 0 : (selectedWeight + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
					}}
				/>
			</svg>
		{:else}
			<p class="text-sm text-muted-foreground">Registra tu peso un par de días para ver la tendencia.</p>
		{/if}
		{#if weightHistory.length > 0}
			<ul class="max-h-44 divide-y divide-border overflow-y-auto border-t border-border pt-1">
				{#each weightHistory as record (record.id)}
					<li class="py-1.5">
						{#if editingWeightId === record.id}
							<form
								class="flex items-end gap-2"
								onsubmit={(event) => {
									event.preventDefault();
									saveWeightEdit(record);
								}}
							>
								<div class="w-24">
									<Label class="mb-1 block" for={`edit-weight-${record.id}`}>Peso (kg)</Label>
									<Input id={`edit-weight-${record.id}`} type="text" bind:value={editWeightValue} inputmode="decimal" />
								</div>
								<div class="w-24">
									<Label class="mb-1 block" for={`edit-bodyfat-${record.id}`}>% grasa</Label>
									<Input id={`edit-bodyfat-${record.id}`} type="text" bind:value={editBodyFatValue} inputmode="decimal" placeholder="—" />
								</div>
								<div class="flex gap-2">
									<Button type="submit" size="sm">Guardar</Button>
									<Button type="button" size="sm" variant="outline" onclick={() => (editingWeightId = null)}>Cancelar</Button>
								</div>
							</form>
						{:else}
							<div class="flex items-center justify-between gap-2 text-sm">
								<button
									type="button"
									class="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
									aria-label={`Editar el registro del ${weightDateLabel(record.date)}`}
									onclick={() => startWeightEdit(record)}
								>
									<span class="text-muted-foreground capitalize">{weightDateLabel(record.date)} · {weightTimeLabel(record)}</span>
									<span class="font-semibold">{fmt(record.weight)} kg{#if record.bodyFat} · {fmt(record.bodyFat)}% grasa{/if}</span>
								</button>
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-destructive hover:text-destructive"
									onclick={() => (confirmWeight = record)}
									title="Eliminar"
									aria-label="Eliminar"
								>
									<Trash2Icon />
								</Button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted-foreground">Todavía no hay pesos registrados.</p>
		{/if}
	</CardContent>
</Card>

<Card>
	<CardContent class="flex flex-col gap-3">
		<h2 class="text-base font-semibold">Objetivos</h2>
		{#if profileBreakdown}
			{#if weightSource}<p class="text-xs text-muted-foreground">{weightSource}</p>{/if}
			<p class="text-3xl font-bold tabular-nums">
				{fmt(profileBreakdown.totals.kcal)}
				<span class="text-sm font-normal text-muted-foreground">kcal/día</span>
			</p>
			<div class="flex flex-col gap-1.5 text-sm">
				{#each MACROS.slice(1) as macro}
					<div class="flex items-baseline justify-between">
						<span class="text-muted-foreground">{macro.label}</span>
						<span class="font-semibold tabular-nums">{fmt(profileBreakdown.totals[macro.key])} {macro.unit}</span>
					</div>
				{/each}
			</div>
			<details class="text-xs text-muted-foreground">
				<summary class="cursor-pointer">¿Cómo se calcula?</summary>
				<div class="mt-2 grid gap-1">
					<p>
						TMB (Harris-Benedict): {fmt(profileBreakdown.tmb)} kcal × {fmt(profileBreakdown.activityFactor, 3)} (actividad) = <span class="font-semibold text-foreground">{fmt(profileBreakdown.tdee)} kcal/día</span>
					</p>
					<p>
						Ajuste objetivo ({GOAL_SHORT[pform.goal]}): {profileBreakdown.adjustment > 0 ? '+' : ''}{fmt(profileBreakdown.adjustment)} kcal → <span class="font-semibold text-foreground">{fmt(profileBreakdown.totals.kcal)} kcal</span>
					</p>
					<p>
						Proteína: {fmt(effectiveWeight)} kg × 2.1 = <span class="font-semibold text-foreground">{fmt(profileBreakdown.totals.protein)} g</span>
					</p>
					<p>
						Grasa: {fmt(effectiveWeight)} kg × 0.9 = <span class="font-semibold text-foreground">{fmt(profileBreakdown.totals.fat)} g</span>
					</p>
					<p>
						Carbohidratos: ({fmt(profileBreakdown.totals.kcal)} − {fmt(profileBreakdown.totals.protein * 4)} − {fmt(profileBreakdown.totals.fat * 9)}) ÷ 4 = <span class="font-semibold text-foreground">{fmt(profileBreakdown.totals.carbs)} g</span>
					</p>
					{#if profileBreakdown.rest}
						<p class="mt-1">
							Día de descanso (sin marcar como entreno): {fmt(profileBreakdown.tmb)} × 1,2 (sedentario) {fmt(profileBreakdown.adjustment)} = <span class="font-semibold text-foreground">{fmt(profileBreakdown.rest.kcal)} kcal</span>, grasa {fmt(effectiveWeight)} kg × 0.6 = {fmt(profileBreakdown.rest.fat)} g, hidratos {fmt(profileBreakdown.rest.carbs)} g
						</p>
					{/if}
				</div>
			</details>
		{:else}
			<p class="text-xs text-muted-foreground">Rellena altura, peso y edad para calcular tus objetivos (Harris-Benedict).</p>
		{/if}
	</CardContent>
</Card>

<Card>
	<CardContent>
		<details class="group">
			<summary class="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
				<div>
					<h2 class="text-base font-semibold">Datos personales</h2>
					<p class="text-xs text-muted-foreground">{profileSummary}</p>
				</div>
				<ChevronDownIcon class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
			</summary>
			<div class="mt-3 flex flex-col gap-2.5">
				<div class="grid grid-cols-2 gap-2">
					<div>
						<Label class="mb-1 block" for="profile-height">Altura (cm)</Label>
						<Input id="profile-height" type="text" bind:value={pform.height} inputmode="numeric" />
					</div>
					<div>
						<Label class="mb-1 block" for="profile-age">Edad</Label>
						<Input id="profile-age" type="text" bind:value={pform.age} inputmode="numeric" />
					</div>
				</div>
				{#if !latestWeight}
					<div>
						<Label class="mb-1 block" for="profile-weight">Peso (kg)</Label>
						<Input id="profile-weight" type="text" bind:value={pform.weight} inputmode="decimal" />
						<p class="mt-1 text-xs text-muted-foreground">Se usa para los objetivos mientras no tengas registros de peso.</p>
					</div>
				{/if}
				<div>
					<Label class="mb-1 block">Sexo</Label>
					<Select.Root bind:value={pform.sex} items={SEX_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}>
						<Select.Trigger class="w-full">
							<SelectPrimitive.Value placeholder="Sexo" />
						</Select.Trigger>
						<Select.Content>
							{#each SEX_OPTIONS as option}
								<Select.Item value={option.key} label={option.label}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div>
					<Label class="mb-1 block">Nivel de actividad</Label>
					<Select.Root bind:value={pform.activity} items={ACTIVITY_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}>
						<Select.Trigger class="w-full">
							<SelectPrimitive.Value placeholder="Nivel de actividad" />
						</Select.Trigger>
						<Select.Content>
							{#each ACTIVITY_OPTIONS as option}
								<Select.Item value={option.key} label={option.label}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div>
					<Label class="mb-1 block">Objetivo</Label>
					<Select.Root bind:value={pform.goal} items={GOAL_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}>
						<Select.Trigger class="w-full">
							<SelectPrimitive.Value placeholder="Objetivo" />
						</Select.Trigger>
						<Select.Content>
							{#each GOAL_OPTIONS as option}
								<Select.Item value={option.key} label={option.label}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</details>
	</CardContent>
</Card>

<ConfirmDialog
	open={confirmWeight !== null}
	title="Eliminar peso"
	message={'¿Eliminar el registro de ' + (confirmWeight ? fmt(confirmWeight.weight) + ' kg del ' + weightDateLabel(confirmWeight.date) : '') + '? Esta acción no se puede deshacer.'}
	onConfirm={deleteWeight}
	onClose={() => (confirmWeight = null)}
/>

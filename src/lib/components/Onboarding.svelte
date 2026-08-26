<script lang="ts">
	import {
		computeGoals,
		goals,
		saveGoals,
		saveProfile,
		type ActivityLevel,
		type Goal,
		type Sex
	} from '$lib/stores.svelte';
	import { fmt, toNumber } from '$lib/format';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Select as SelectPrimitive } from 'bits-ui';

	const SEX_LABELS: { key: Sex; label: string }[] = [
		{ key: 'male', label: 'Hombre' },
		{ key: 'female', label: 'Mujer' }
	];

	const ACTIVITY_LABELS: { key: ActivityLevel; label: string }[] = [
		{ key: 'sedentary', label: 'Sedentario (poco ejercicio)' },
		{ key: 'light', label: 'Ligero (1–2 días/semana)' },
		{ key: 'moderate', label: 'Moderado (3–4 días/semana)' },
		{ key: 'active', label: 'Intenso (5+ días/semana)' }
	];

	const GOAL_LABELS: { key: Goal; label: string; note: string }[] = [
		{ key: 'lose', label: 'Perder grasa', note: '−400 kcal' },
		{ key: 'recomp', label: 'Recomposición', note: '−250 kcal' },
		{ key: 'maintain', label: 'Mantener', note: 'sin ajuste' },
		{ key: 'gain', label: 'Ganar músculo', note: '+250 kcal' }
	];

	const form = $state({
		height: '',
		weight: '',
		age: '',
		sex: 'male' as Sex,
		activity: 'moderate' as ActivityLevel,
		goal: 'recomp' as Goal
	});

	const preview = $derived.by(() => {
		const height = toNumber(form.height);
		const weight = toNumber(form.weight);
		const age = toNumber(form.age);
		if (!height || !weight || !age) return null;
		return computeGoals({ height, weight, age, sex: form.sex, activity: form.activity, goal: form.goal });
	});

	function submit() {
		const height = toNumber(form.height);
		const weight = toNumber(form.weight);
		const age = toNumber(form.age);
		if (!height || !weight || !age) return;
		const data = { height, weight, age, sex: form.sex, activity: form.activity, goal: form.goal };
		Object.assign(goals, computeGoals(data));
		saveGoals();
		saveProfile(data);
	}
</script>

<div class="flex min-h-dvh items-center justify-center p-4">
	<Card class="w-full max-w-[440px]">
		<CardContent>
			<h1 class="text-xl font-bold">Bienvenido a MacroTrack</h1>
			<p class="mt-2 text-sm text-muted-foreground">Cuéntanos un poco sobre ti y calcularemos tus objetivos diarios.</p>
			<div class="mt-4 flex flex-col gap-3">
				<div class="grid grid-cols-3 gap-2">
					<div>
						<Label class="mb-1 block">Altura (cm)</Label>
						<Input type="text" min="100" max="250" bind:value={form.height} placeholder="Ej: 175" inputmode="numeric" />
					</div>
					<div>
						<Label class="mb-1 block">Peso (kg)</Label>
						<Input type="text" min="30" max="250" bind:value={form.weight} placeholder="Ej: 70" inputmode="decimal" />
					</div>
					<div>
						<Label class="mb-1 block">Edad</Label>
						<Input type="text" min="10" max="120" bind:value={form.age} placeholder="Ej: 30" inputmode="numeric" />
					</div>
				</div>
				<div>
					<Label class="mb-1 block">Sexo</Label>
					<Select.Root bind:value={form.sex} items={SEX_LABELS.map((o) => ({ value: o.key, label: o.label }))}>
						<Select.Trigger class="w-full">
							<SelectPrimitive.Value placeholder="Sexo" />
						</Select.Trigger>
						<Select.Content>
							{#each SEX_LABELS as option}
								<Select.Item value={option.key} label={option.label}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div>
					<Label class="mb-1 block">Nivel de actividad</Label>
					<Select.Root bind:value={form.activity} items={ACTIVITY_LABELS.map((o) => ({ value: o.key, label: o.label }))}>
						<Select.Trigger class="w-full">
							<SelectPrimitive.Value placeholder="Nivel de actividad" />
						</Select.Trigger>
						<Select.Content>
							{#each ACTIVITY_LABELS as option}
								<Select.Item value={option.key} label={option.label}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div>
					<Label class="mb-1 block">Objetivo</Label>
					<Select.Root bind:value={form.goal} items={GOAL_LABELS.map((o) => ({ value: o.key, label: o.label + ' (' + o.note + ')' }))}>
						<Select.Trigger class="w-full">
							<SelectPrimitive.Value placeholder="Objetivo" />
						</Select.Trigger>
						<Select.Content>
							{#each GOAL_LABELS as option}
								<Select.Item value={option.key} label={option.label + ' (' + option.note + ')'}>{option.label} ({option.note})</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				{#if preview}
					<div class="rounded-lg bg-secondary p-3">
						<strong class="text-sm">Objetivos diarios estimados</strong>
						<ul class="mt-2 flex flex-col gap-1 text-sm">
							<li class="flex justify-between"><span>Calorías</span><span>{fmt(preview.kcal)} kcal</span></li>
							<li class="flex justify-between"><span>Grasas</span><span>{fmt(preview.fat)} g</span></li>
							<li class="flex justify-between"><span>Hidratos</span><span>{fmt(preview.carbs)} g</span></li>
							<li class="flex justify-between"><span>Fibra</span><span>{fmt(preview.fiber)} g</span></li>
							<li class="flex justify-between"><span>Proteínas</span><span>{fmt(preview.protein)} g</span></li>
						</ul>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">Rellena altura, peso y edad para ver tu estimación (Harris-Benedict revisada).</p>
				{/if}
				<Button onclick={submit} disabled={!preview}>Calcular mis objetivos</Button>
			</div>
		</CardContent>
	</Card>
</div>

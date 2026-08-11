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
	import { fmt } from '$lib/format';

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
		const height = parseFloat(form.height);
		const weight = parseFloat(form.weight);
		const age = parseFloat(form.age);
		if (!height || !weight || !age) return null;
		return computeGoals({ height, weight, age, sex: form.sex, activity: form.activity, goal: form.goal });
	});

	function submit() {
		const height = parseFloat(form.height);
		const weight = parseFloat(form.weight);
		const age = parseFloat(form.age);
		if (!height || !weight || !age) return;
		const data = { height, weight, age, sex: form.sex, activity: form.activity, goal: form.goal };
		Object.assign(goals, computeGoals(data));
		saveGoals();
		saveProfile(data);
	}
</script>

<div class="onboarding">
	<div class="card panel">
		<h1>Bienvenido a MacroTrack</h1>
		<p class="muted intro">Cuéntanos un poco sobre ti y calcularemos tus objetivos diarios.</p>
		<div class="form">
			<div class="grid3">
				<label>Altura (cm)<input type="number" min="100" max="250" bind:value={form.height} placeholder="Ej: 175" /></label>
				<label>Peso (kg)<input type="number" min="30" max="250" bind:value={form.weight} placeholder="Ej: 70" /></label>
				<label>Edad<input type="number" min="10" max="120" bind:value={form.age} placeholder="Ej: 30" /></label>
			</div>
			<label>Sexo
				<select bind:value={form.sex}>
					{#each SEX_LABELS as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>Nivel de actividad
				<select bind:value={form.activity}>
					{#each ACTIVITY_LABELS as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>Objetivo
				<select bind:value={form.goal}>
					{#each GOAL_LABELS as option}
						<option value={option.key}>{option.label} ({option.note})</option>
					{/each}
				</select>
			</label>
			{#if preview}
				<div class="card preview">
					<strong>Objetivos diarios estimados</strong>
					<ul>
						<li><span>Calorías</span><span>{fmt(preview.kcal)} kcal</span></li>
						<li><span>Proteínas</span><span>{fmt(preview.protein)} g</span></li>
						<li><span>Hidratos</span><span>{fmt(preview.carbs)} g</span></li>
						<li><span>Grasas</span><span>{fmt(preview.fat)} g</span></li>
						<li><span>Fibra</span><span>{fmt(preview.fiber)} g</span></li>
					</ul>
				</div>
			{:else}
				<p class="muted">Rellena altura, peso y edad para ver tu estimación (Harris-Benedict revisada).</p>
			{/if}
			<button onclick={submit} disabled={!preview}>Calcular mis objetivos</button>
		</div>
	</div>
</div>

<style>
	.onboarding {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.panel {
		width: 100%;
		max-width: 440px;
	}

	.intro {
		margin: 8px 0 0;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 16px;
	}

	.grid3 {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	select {
		font: inherit;
		background: var(--bg);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 10px;
		width: 100%;
	}

	.preview {
		background: var(--panel-2);
	}

	.preview ul {
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.preview li {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
	}
</style>

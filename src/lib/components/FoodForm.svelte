<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	export interface FoodFormValues {
		name: string;
		brand: string;
		unitSize: string;
		kcal: string;
		protein: string;
		carbs: string;
		fat: string;
		fiber: string;
		saturatedFat: string;
		sugars: string;
	}

	let {
		values,
		placeholders = false
	}: {
		values: FoodFormValues;
		placeholders?: boolean;
	} = $props();
</script>

<div>
	<Label class="mb-1 block">Nombre</Label>
	<Input bind:value={values.name} placeholder={placeholders ? 'Ej: Galletas de avena' : undefined} />
</div>
<div>
	<Label class="mb-1 block">Marca</Label>
	<Input bind:value={values.brand} placeholder={placeholders ? 'Ej: Hacendado' : undefined} />
</div>
<div>
	<Label class="mb-1 block">Gramos por unidad</Label>
	<Input type="text" bind:value={values.unitSize} inputmode="decimal" placeholder="Opcional · ej: 66 helado, 330 lata" />
</div>
<div class="grid grid-cols-2 gap-2">
	<div>
		<Label class="mb-1 block">kcal / 100g</Label>
		<Input type="text" bind:value={values.kcal} inputmode="decimal" />
	</div>
	<div>
		<Label class="mb-1 block">Grasas / 100g</Label>
		<Input type="text" bind:value={values.fat} inputmode="decimal" />
		<div class="mt-2">
			<Label class="mb-1 block text-xs text-muted-foreground">Grasas saturadas / 100g</Label>
			<Input type="text" bind:value={values.saturatedFat} inputmode="decimal" placeholder="Desconocido" />
		</div>
	</div>
	<div>
		<Label class="mb-1 block">Hidratos / 100g</Label>
		<Input type="text" bind:value={values.carbs} inputmode="decimal" />
		<div class="mt-2">
			<Label class="mb-1 block text-xs text-muted-foreground">Azúcares totales / 100g</Label>
			<Input type="text" bind:value={values.sugars} inputmode="decimal" placeholder="Desconocido" />
		</div>
	</div>
	<div>
		<Label class="mb-1 block">Fibra / 100g</Label>
		<Input type="text" bind:value={values.fiber} inputmode="decimal" />
	</div>
	<div>
		<Label class="mb-1 block">Proteína / 100g</Label>
		<Input type="text" bind:value={values.protein} inputmode="decimal" />
	</div>
</div>

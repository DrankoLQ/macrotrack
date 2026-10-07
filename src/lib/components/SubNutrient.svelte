<script lang="ts">
	import { fmt } from '$lib/format';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';

	type Props = { kind: 'saturatedFat'; value: number | null; limit: number }
		| { kind: 'sugars'; value: number | null };

	let props: Props = $props();
	const excessive = $derived(props.kind === 'saturatedFat' && props.value !== null && props.value > props.limit);
	const percentage = $derived(props.kind === 'saturatedFat' && props.value !== null && props.limit > 0
		? Math.min(100, props.value / props.limit * 100) : 0);
</script>

<div class="ml-3 border-l border-border pl-2 text-xs text-muted-foreground">
	<p class:text-destructive={excessive}>
		{props.kind === 'saturatedFat' ? 'Grasas saturadas' : 'Azúcares totales'}:
		{#if props.value === null}
			Sin datos completos
		{:else}
			{fmt(props.value, 1)} g
		{/if}
		{#if props.kind === 'saturatedFat'}
			· Máximo {fmt(props.limit, 1)} g
			{#if excessive} · Máximo superado{/if}
		{/if}
	</p>
	{#if props.kind === 'saturatedFat' && props.value !== null}
		<Progress
			value={percentage}
			aria-label="Grasas saturadas respecto al máximo"
			aria-valuetext={`${fmt(props.value, 1)} g de un máximo de ${fmt(props.limit, 1)} g${excessive ? ', máximo superado' : ''}`}
			class={cn('mt-1 h-1', excessive && '[&_[data-slot=progress-indicator]]:bg-destructive')}
		/>
	{/if}
</div>

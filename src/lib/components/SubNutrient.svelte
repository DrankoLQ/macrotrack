<script lang="ts">
	import { fmt } from '$lib/format';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';

	type Base = { value: number | null; known?: number; total?: number };
	type Props = (Base & { kind: 'saturatedFat'; limit: number }) | (Base & { kind: 'sugars' });

	let props: Props = $props();
	const label = $derived(props.kind === 'saturatedFat' ? 'Grasas saturadas' : 'Azúcares totales');
	const hasCoverage = $derived(props.known !== undefined && props.total !== undefined);
	const known = $derived(props.known ?? 0);
	const total = $derived(props.total ?? 0);
	const partial = $derived(hasCoverage && props.value !== null && known < total);
	const excessive = $derived(props.kind === 'saturatedFat' && props.value !== null && props.value > props.limit);
	const percentage = $derived(props.kind === 'saturatedFat' && props.value !== null && props.limit > 0
		? Math.min(100, props.value / props.limit * 100) : 0);
</script>

<div class="ml-3 border-l border-border pl-2">
	{#if props.value === null}
		<p class="text-xs text-muted-foreground">
			{label}: sin datos{#if hasCoverage && total > 0} · 0/{total} registros con dato{/if}
		</p>
	{:else}
		<div class="flex items-baseline justify-between gap-2 text-sm">
			<span class="text-muted-foreground">{label}</span>
			<span class="flex items-baseline gap-1.5">
				<span class={cn('font-semibold tabular-nums', excessive && 'text-destructive')}>
					{partial ? '≥ ' : ''}{fmt(props.value, 1)}{#if props.kind === 'saturatedFat'}
						<span class="font-normal text-muted-foreground">/ {fmt(props.limit, 1)} g</span>
					{:else}
						<span class="font-normal text-muted-foreground">g</span>
					{/if}
				</span>
				{#if props.kind === 'saturatedFat' && excessive}
					<span class="text-xs font-medium tabular-nums text-destructive">máximo superado</span>
				{:else if props.kind === 'saturatedFat' && !partial}
					<span class="text-xs font-medium tabular-nums text-muted-foreground">margen {fmt(props.limit - props.value, 1)} g</span>
				{/if}
			</span>
		</div>
		{#if props.kind === 'saturatedFat'}
			<Progress
				value={percentage}
				aria-label="Grasas saturadas respecto al máximo"
				aria-valuetext={`${partial ? 'al menos ' : ''}${fmt(props.value, 1)} g de un máximo de ${fmt(props.limit, 1)} g${excessive ? ', máximo superado' : ''}`}
				class={cn('mt-1 h-1.5', excessive && '[&_[data-slot=progress-indicator]]:bg-destructive')}
			/>
		{/if}
		{#if partial}
			<p class="mt-1 text-xs text-muted-foreground">Parcial · {known}/{total} registros con dato</p>
		{/if}
	{/if}
</div>

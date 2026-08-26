<script lang="ts">
	import { fmt } from '$lib/format';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import type { ChartDirection } from '$lib/chart';

	let {
		label,
		value,
		goal,
		unit,
		direction = 'max'
	}: { label: string; value: number; goal: number; unit: string; direction?: ChartDirection } = $props();

	const pct = $derived(Math.min(100, (value / goal) * 100));
	const over = $derived(direction === 'min' ? value < goal : value > goal);
	const delta = $derived(value - goal);
	const deltaLabel = $derived(delta === 0 ? '0' : (delta > 0 ? '+' : '') + fmt(delta));
	const valueColor = $derived(over ? 'text-destructive' : 'text-primary');
	const deltaColor = $derived(delta === 0 ? 'text-muted-foreground' : over ? 'text-destructive' : 'text-primary');
</script>

<div class="space-y-1">
	<div class="flex items-baseline justify-between text-sm">
		<span class="text-muted-foreground">{label}</span>
		<span class="flex items-baseline gap-1.5">
			<span class={cn('font-semibold', valueColor)}>
				{fmt(value)} <span class="font-normal text-muted-foreground">/{fmt(goal)} {unit}</span>
			</span>
			<span class={cn('text-xs font-medium tabular-nums', deltaColor)} aria-label={`Diferencia ${deltaLabel} ${unit}`}>
				({deltaLabel} {unit})
			</span>
		</span>
	</div>
	<Progress
		value={pct}
		class={cn('h-1.5', over && '[&_[data-slot=progress-indicator]]:bg-destructive')}
	/>
</div>

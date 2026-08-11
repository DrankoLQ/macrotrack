<script lang="ts">
	import { fmt } from '$lib/format';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';

	let { label, value, goal, unit }: { label: string; value: number; goal: number; unit: string } = $props();

	const pct = $derived(Math.min(100, (value / goal) * 100));
	const over = $derived(value > goal);
</script>

<div class="space-y-1">
	<div class="flex items-baseline justify-between text-sm">
		<span class="text-muted-foreground">{label}</span>
		<span class={cn('font-semibold', over && 'text-destructive')}>
			{fmt(value)} <span class="font-normal text-muted-foreground">/{fmt(goal)} {unit}</span>
		</span>
	</div>
	<Progress
		value={pct}
		class={cn('h-1.5', over && '[&_[data-slot=progress-indicator]]:bg-destructive')}
	/>
</div>

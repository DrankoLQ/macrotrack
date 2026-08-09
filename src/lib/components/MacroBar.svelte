<script lang="ts">
	import { fmt } from '$lib/format';

	let { label, value, goal, unit }: { label: string; value: number; goal: number; unit: string } = $props();

	const pct = $derived(Math.min(100, (value / goal) * 100));
	const over = $derived(value > goal);
</script>

<div class="macro">
	<div class="head">
		<span class="label">{label}</span>
		<span class="value" class:over>{fmt(value)} <small>/{fmt(goal)} {unit}</small></span>
	</div>
	<div class="track">
		<div class="fill" class:over style:width="{pct}%"></div>
	</div>
</div>

<style>
	.macro {
		margin-bottom: 12px;
	}

	.head {
		display: flex;
		justify-content: space-between;
		margin-bottom: 4px;
	}

	.label {
		color: var(--muted);
		font-size: 0.85rem;
	}

	.value {
		font-weight: 600;
	}

	.value small {
		color: var(--muted);
		font-weight: 400;
	}

	.value.over {
		color: var(--danger);
	}

	.track {
		height: 6px;
		background: var(--panel-2);
		border-radius: 3px;
		overflow: hidden;
	}

	.fill {
		height: 100%;
		background: var(--accent);
		border-radius: 3px;
		transition: width 0.2s;
	}

	.fill.over {
		background: var(--danger);
	}
</style>

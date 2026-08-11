<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { seedIfNeeded } from '$lib/seed';
	import { loadGoals, loadProfile, profile } from '$lib/stores.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';

	let { children } = $props();

	let profileReady = $state(false);

	onMount(() => {
		seedIfNeeded();
		loadProfile();
		loadGoals();
		profileReady = true;
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js');
		}
	});
</script>

<svelte:head>
	<title>MacroTrack</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if profileReady && !profile.value}
	<Onboarding />
{:else}
	<div class="mx-auto flex max-w-[640px] flex-col gap-4 p-4">
		<header class="flex items-center justify-between">
			<strong class="text-lg font-bold">MacroTrack</strong>
			<nav class="flex gap-0.5 rounded-xl border border-border bg-card p-1">
				<a
					href="/"
					class:active={page.url.pathname === '/'}
					class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground"
				>Diario</a>
				<a
					href="/foods"
					class:active={page.url.pathname === '/foods'}
					class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground"
				>Alimentos</a>
				<a
					href="/scan"
					class:active={page.url.pathname === '/scan'}
					class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground"
				>Escanear</a>
			</nav>
		</header>
		<main class="flex flex-col gap-4">{@render children()}</main>
	</div>
{/if}

<style>
	nav a.active {
		background: var(--secondary);
		color: var(--foreground);
	}
</style>

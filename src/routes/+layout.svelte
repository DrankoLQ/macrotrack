<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { seedIfEmpty } from '$lib/seed';
	import { loadGoals } from '$lib/stores.svelte';

	let { children } = $props();

	onMount(() => {
		seedIfEmpty();
		loadGoals();
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js');
		}
	});
</script>

<svelte:head>
	<title>MacroTrack</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<header>
		<strong class="logo">MacroTrack</strong>
		<nav>
			<a href="/" class:active={page.url.pathname === '/'}>Diario</a>
			<a href="/foods" class:active={page.url.pathname === '/foods'}>Alimentos</a>
			<a href="/scan" class:active={page.url.pathname === '/scan'}>Escanear</a>
		</nav>
	</header>
	<main>{@render children()}</main>
</div>

<style>
	.shell {
		max-width: 640px;
		margin: 0 auto;
		padding: 16px;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.logo {
		font-size: 1.1rem;
	}

	nav {
		display: flex;
		gap: 4px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 4px;
	}

	nav a {
		color: var(--muted);
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 600;
		padding: 6px 10px;
		border-radius: 8px;
	}

	nav a.active {
		background: var(--panel-2);
		color: var(--text);
	}

	main {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
</style>

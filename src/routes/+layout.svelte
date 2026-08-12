<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { seedIfNeeded } from '$lib/seed';
	import { loadGoals, loadProfile, profile } from '$lib/stores.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import HomeIcon from '@lucide/svelte/icons/home';
	import UtensilsCrossedIcon from '@lucide/svelte/icons/utensils-crossed';
	import ScanBarcodeIcon from '@lucide/svelte/icons/scan-barcode';

	let { children } = $props();

	const tabs = [
		{ href: '/', label: 'Diario', Icon: HomeIcon, isActive: (path: string) => path === '/' },
		{ href: '/foods', label: 'Alimentos', Icon: UtensilsCrossedIcon, isActive: (path: string) => path === '/foods' },
		{ href: '/scan', label: 'Escanear', Icon: ScanBarcodeIcon, isActive: (path: string) => path === '/scan' }
	];

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
	<div class="mx-auto flex max-w-[640px] flex-col gap-4 p-4 pb-28">
		<header class="flex items-center justify-center pt-1">
			<strong class="text-lg font-bold">MacroTrack</strong>
		</header>
		<main class="flex flex-col gap-4">{@render children()}</main>
	</div>

	<nav class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl">
		<div class="mx-auto flex max-w-[640px] items-stretch pb-[env(safe-area-inset-bottom)]">
			{#each tabs as tab}
				<a
					href={tab.href}
					class:active={tab.isActive(page.url.pathname)}
					class="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground no-underline transition-colors hover:text-foreground"
				>
					<tab.Icon class="size-6" />
					<span class="text-[10px] leading-none">{tab.label}</span>
				</a>
			{/each}
		</div>
	</nav>
{/if}

<style>
	nav a.active {
		color: var(--primary);
	}

	nav a.active span {
		font-weight: 600;
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { seedIfNeeded } from '$lib/seed';
	import { loadGoals, loadProfile, profile } from '$lib/stores.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import HomeIcon from '@lucide/svelte/icons/home';
	import ChartLineIcon from '@lucide/svelte/icons/chart-line';
	import UtensilsCrossedIcon from '@lucide/svelte/icons/utensils-crossed';
	import ScanBarcodeIcon from '@lucide/svelte/icons/scan-barcode';
	import UserIcon from '@lucide/svelte/icons/user';

	let { children } = $props();

	const tabs = [
		{ href: '/', label: 'Diario', Icon: HomeIcon, isActive: (path: string) => path === '/' },
		{ href: '/stats', label: 'Estadísticas', Icon: ChartLineIcon, isActive: (path: string) => path === '/stats' },
		{ href: '/foods', label: 'Alimentos', Icon: UtensilsCrossedIcon, isActive: (path: string) => path === '/foods' },
		{ href: '/scan', label: 'Escanear', Icon: ScanBarcodeIcon, isActive: (path: string) => path === '/scan' },
		{ href: '/perfil', label: 'Perfil', Icon: UserIcon, isActive: (path: string) => path === '/perfil' }
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
		<div class="mx-auto flex max-w-[640px]">
			{#each tabs as tab (tab.href)}
				{@const active = tab.isActive(page.url.pathname)}
				<a
					href={tab.href}
					class:active={active}
					class="flex flex-1 touch-manipulation select-none flex-col items-center gap-1 pt-2 pb-[env(safe-area-inset-bottom)] text-muted-foreground no-underline transition-[color,transform] active:scale-95 hover:text-foreground"
				>
					<tab.Icon class="size-6 {active ? 'animate-in zoom-in-75 duration-300 motion-reduce:animate-none' : ''}" />
					<span class="text-[10px] leading-none">{tab.label}</span>
				</a>
			{/each}
		</div>
	</nav>
{/if}

<style>
	nav a {
		-webkit-tap-highlight-color: transparent;
	}

	nav a.active {
		color: var(--primary);
	}

	nav a.active span {
		font-weight: 600;
	}
</style>

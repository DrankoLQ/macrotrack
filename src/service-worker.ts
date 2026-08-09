/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `macrotrack-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;
	if (event.request.method !== 'GET') return;
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(cacheFirst(event.request));
		return;
	}
	event.respondWith(networkFirst(event.request));
});

async function cacheFirst(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;
	return fetch(request);
}

async function networkFirst(request: Request): Promise<Response> {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		if (cached) return cached;
		const fallback = await caches.match('/200.html');
		if (fallback) return fallback;
		return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
	}
}

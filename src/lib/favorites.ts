import type { Food } from './db';

/**
 * Devuelve una copia con los favoritos primero.
 * Orden estable: dentro de cada grupo se conserva el orden relativo (alfabético).
 */
export function sortFavoritesFirst<T extends Food>(foods: T[]): T[] {
	return [...foods].sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)));
}

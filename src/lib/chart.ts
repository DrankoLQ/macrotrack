export type ChartDirection = 'max' | 'min';

export function chartBars(values: (number | null)[], goal: number, direction: ChartDirection) {
	const scale = Math.max(goal, ...values.map((value) => value ?? 0), 1) * 1.08;
	const bw = 300 / values.length;
	return values.map((v, i) => {
		const h = v === null ? 0 : v === 0 ? 1.5 : Math.max((v / scale) * 100, 2);
		const x = 5 + i * bw;
		const w = bw * 0.7;
		return {
			x: +x.toFixed(1),
			w: +w.toFixed(1),
			y: +(110 - h).toFixed(1),
			h: +h.toFixed(1),
			cx: +(((x + w / 2) / 310) * 100).toFixed(1),
			missing: v === null,
			over: v !== null && (direction === 'max' ? v > goal : v < goal)
		};
	});
}

export function chartGoalY(values: (number | null)[], goal: number) {
	const scale = Math.max(goal, ...values.map((value) => value ?? 0), 1) * 1.08;
	return +(110 - (goal / scale) * 100).toFixed(1);
}

import { DemGrid, sampleElevation } from './dem';

const grid: DemGrid = {
	originLon: 19.0,
	originLat: 47.1,
	stepLon: 0.1,
	stepLat: 0.1,
	cols: 3,
	rows: 3,
	values: [100, 200, 300, 110, 210, 310, 120, 220, -32768],
	noData: -32768,
};

describe('sampleElevation', () => {
	it('returns the exact grid value at a grid node', () => {
		expect(sampleElevation(grid, 19.0, 47.1)).toBe(100);
	});

	it('interpolates bilinearly between nodes', () => {
		expect(sampleElevation(grid, 19.05, 47.1)).toBeCloseTo(150, 6);
	});

	it('returns null outside the grid', () => {
		expect(sampleElevation(grid, 18.9, 47.1)).toBeNull();
		expect(sampleElevation(grid, 19.0, 47.3)).toBeNull();
	});

	it('returns null when a surrounding node is noData (never 0)', () => {
		expect(sampleElevation(grid, 19.19, 46.91)).toBeNull();
	});
});

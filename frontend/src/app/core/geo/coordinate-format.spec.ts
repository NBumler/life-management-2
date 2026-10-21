import { formatDecimalCoordinates, formatDmsCoordinates } from './coordinate-format';

const HU = { north: 'É', south: 'D', east: 'K', west: 'Ny' };

describe('coordinate-format (backlog/106)', () => {
	it('decimal: five digits, latitude first', () => {
		expect(formatDecimalCoordinates(47.678505, 18.878893)).toBe('47.67851, 18.87889');
	});

	it('degrees-minutes-seconds with the hemispheres of the language', () => {
		expect(formatDmsCoordinates(47.678505, 18.878893, HU)).toBe('47°40′42.6″ É, 18°52′44.0″ K');
	});

	it('south and west are named, not signed', () => {
		expect(formatDmsCoordinates(-33.8568, -70.6483, HU)).toBe('33°51′24.5″ D, 70°38′53.9″ Ny');
	});

	it('a second rounding up to 60 carries into the next minute', () => {
		// 47° 0′ 59.99″
		expect(formatDmsCoordinates(47 + 59.99 / 3600, 19, HU)).toBe('47°1′0.0″ É, 19°0′0.0″ K');
	});
});

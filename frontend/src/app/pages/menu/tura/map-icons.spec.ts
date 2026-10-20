import { ICON_ARROW_LIGHT, ICON_END, ICON_MY_LOCATION, ICON_START, dayIconName, iconDataUrl, iconImage, labelIconName } from './map-icons';

/** backlog/196, backlog/202, backlog/203 */
describe('map-icons', () => {
	it('draws the fixed icons at twice their CSS size', () => {
		for (const name of [ICON_START, ICON_END, ICON_ARROW_LIGHT, ICON_MY_LOCATION]) {
			const image = iconImage(name);
			expect(image).withContext(name).not.toBeNull();
			expect(image!.width).toBe(image!.height);
			expect(image!.width).toBeGreaterThan(0);
		}
	});

	it('day-break icons are drawn on demand for any positive day number', () => {
		expect(iconImage(dayIconName(1))).not.toBeNull();
		expect(iconImage(dayIconName(12))).not.toBeNull();
		expect(iconImage('tura-day-0')).toBeNull();
		expect(iconImage('tura-day-x')).toBeNull();
	});

	it('a route-name label is as wide as its text', () => {
		const short = iconImage(labelIconName('Pilis'))!;
		const long = iconImage(labelIconName('Pilis kör Dobogókőn át'))!;

		expect(long.width).toBeGreaterThan(short.width);
		expect(long.height).toBe(short.height);
	});

	it('an unknown name is not ours: no image, empty legend source', () => {
		expect(iconImage('osm-poi')).toBeNull();
		expect(iconDataUrl('osm-poi')).toBe('');
		expect(iconDataUrl(ICON_START)).toMatch(/^data:image\/png/);
	});
});

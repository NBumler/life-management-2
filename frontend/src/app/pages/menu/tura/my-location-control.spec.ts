import { MyLocationControl, myLocationFeatureCollection } from './my-location-control';

/** backlog/215 */
describe('MyLocationControl', () => {
	it('is a labelled map button that calls back on tap', () => {
		const onClick = jasmine.createSpy('onClick');
		const control = new MyLocationControl('Saját helyzetem', onClick);
		const button = control.onAdd().querySelector('button')!;

		expect(button.getAttribute('aria-label')).toBe('Saját helyzetem');
		expect(button.getAttribute('title')).toBe('Saját helyzetem');
		button.click();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('cannot be tapped again while locating', () => {
		const control = new MyLocationControl('My location', () => undefined);
		const button = control.onAdd().querySelector('button')!;

		control.setBusy(true);
		expect(button.disabled).toBeTrue();
		expect(button.classList).toContain('locating');
		control.setBusy(false);
		expect(button.disabled).toBeFalse();
		expect(button.classList).not.toContain('locating');
	});
});

describe('myLocationFeatureCollection', () => {
	it('is one point, or empty before the first fix', () => {
		expect(myLocationFeatureCollection([19.04, 47.5]).features[0].geometry.coordinates).toEqual([19.04, 47.5]);
		expect(myLocationFeatureCollection(null).features).toEqual([]);
	});
});

import { TestBed } from '@angular/core/testing';

import { ElevationService } from './elevation.service';
import { GeoAssetService } from './geo-asset.service';
import { OpenMeteoElevationService } from './open-meteo-elevation.service';

describe('ElevationService', () => {
	let service: ElevationService;
	let dem: jasmine.SpyObj<GeoAssetService>;
	let openMeteo: jasmine.SpyObj<OpenMeteoElevationService>;
	const points = [
		[19.0, 47.0],
		[19.1, 47.1],
		[30.0, 40.0],
	];

	beforeEach(() => {
		dem = jasmine.createSpyObj('GeoAssetService', ['elevationAt']);
		openMeteo = jasmine.createSpyObj('OpenMeteoElevationService', ['fetchElevations']);
		TestBed.configureTestingModule({
			providers: [
				{ provide: GeoAssetService, useValue: dem },
				{ provide: OpenMeteoElevationService, useValue: openMeteo },
			],
		});
		service = TestBed.inject(ElevationService);
	});

	it('uses the on-device DEM and makes no external call when the package covers every point', async () => {
		dem.elevationAt.and.returnValues(Promise.resolve(100), Promise.resolve(150), Promise.resolve(200));

		const result = await service.fetchElevations(points);

		expect(result).toEqual([100, 150, 200]);
		expect(openMeteo.fetchElevations).not.toHaveBeenCalled();
	});

	it('asks Open-Meteo only for the points outside the package and keeps the original order', async () => {
		dem.elevationAt.and.returnValues(Promise.resolve(100), Promise.resolve(null), Promise.resolve(null));
		openMeteo.fetchElevations.and.resolveTo([151, 300]);

		const result = await service.fetchElevations(points);

		expect(openMeteo.fetchElevations).toHaveBeenCalledOnceWith([points[1], points[2]]);
		expect(result).toEqual([100, 151, 300]);
	});

	it('rejects when a point is uncovered and there is no internet (never a 0 m value)', async () => {
		dem.elevationAt.and.returnValues(Promise.resolve(100), Promise.resolve(null), Promise.resolve(null));
		openMeteo.fetchElevations.and.rejectWith(new Error('offline'));

		await expectAsync(service.fetchElevations(points)).toBeRejectedWithError('offline');
	});
});

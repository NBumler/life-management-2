import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GeoAssetService, GeoManifest } from './geo-asset.service';

const MANIFEST: GeoManifest = {
	version: 1,
	generatedAt: '2026-10-06T00:00:00Z',
	bbox: [19.0, 47.0, 20.0, 48.0],
	attribution: [],
	dem: [
		{
			file: 'dem/a.bin',
			originLon: 19.0,
			originLat: 47.1,
			stepLon: 0.1,
			stepLat: 0.1,
			cols: 3,
			rows: 3,
			noData: -32768,
			bytes: 18,
		},
	],
	bike: [{ file: 'bike/a.bin', bbox: [19.0, 47.0, 19.25, 47.25], ways: 0, points: 0, bytes: 12 }],
};

describe('GeoAssetService', () => {
	let service: GeoAssetService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		service = TestBed.inject(GeoAssetService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	function loadManifest(manifest: GeoManifest | null) {
		const pending = service.manifest();
		const req = http.expectOne('assets/geo/manifest.json');
		if (manifest === null) {
			req.flush('missing', { status: 404, statusText: 'Not Found' });
		} else {
			req.flush(manifest);
		}
		return pending;
	}

	it('reports no coverage and null elevation when the package is absent (never 0)', async () => {
		await loadManifest(null);

		expect(await service.covers(19.5, 47.5)).toBeFalse();
		expect(await service.elevationAt(19.5, 47.5)).toBeNull();
		expect(await service.bikeWaysIntersecting([19, 47, 20, 48])).toEqual([]);
	});

	it('answers coverage from the manifest bbox', async () => {
		await loadManifest(MANIFEST);

		expect(await service.covers(19.5, 47.5)).toBeTrue();
		expect(await service.covers(21.0, 47.5)).toBeFalse();
	});

	it('samples elevation from a lazily loaded DEM tile', async () => {
		await loadManifest(MANIFEST);

		const pending = service.elevationAt(19.05, 47.1);
		// A manifest már betöltve van, a DEM-csempe kérése a következő microtask-ban indul.
		await new Promise((resolve) => setTimeout(resolve));
		const req = http.expectOne('assets/geo/dem/a.bin');
		expect(req.request.responseType).toBe('arraybuffer');
		req.flush(new Int16Array([100, 200, 300, 110, 210, 310, 120, 220, 320]).buffer);

		expect(await pending).toBeCloseTo(150, 6);
	});

	it('returns null for a point outside every DEM tile', async () => {
		await loadManifest(MANIFEST);

		expect(await service.elevationAt(19.9, 47.9)).toBeNull();
	});
});

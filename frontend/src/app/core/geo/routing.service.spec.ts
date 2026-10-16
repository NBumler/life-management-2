import { TestBed } from '@angular/core/testing';

import { BIKE_COST_CLASS, BikeWay } from './bike-tile-codec';
import { GeoAssetService } from './geo-asset.service';
import { RoutingService } from './routing.service';

describe('RoutingService', () => {
  let service: RoutingService;
  let geo: jasmine.SpyObj<GeoAssetService>;
  const start: [number, number] = [19.0, 47.0];
  const goal: [number, number] = [19.01, 47.0];
  const detourVia: [number, number] = [19.005, 47.005];

  beforeEach(() => {
    geo = jasmine.createSpyObj('GeoAssetService', ['bikeWaysIntersecting']);
    TestBed.configureTestingModule({ providers: [{ provide: GeoAssetService, useValue: geo }] });
    service = TestBed.inject(RoutingService);
  });

  it('routes along the cheaper dedicated cycleway instead of the shorter main road', async () => {
    const ways: BikeWay[] = [
      { costClass: BIKE_COST_CLASS.MAIN_ROAD, coordinates: [start, goal] },
      { costClass: BIKE_COST_CLASS.CYCLEWAY, coordinates: [start, detourVia, goal] },
    ];
    geo.bikeWaysIntersecting.and.resolveTo({ tileFiles: ['bike/a.bin'], ways });

    const route = await service.route('BIKE', start, goal);

    expect(route).not.toBeNull();
    expect(route![0]).toEqual([19.0, 47.0]);
    expect(route![route!.length - 1]).toEqual([19.01, 47.0]);
    expect(route!.some(([lon, lat]) => Math.abs(lon - detourVia[0]) < 1e-9 && Math.abs(lat - detourVia[1]) < 1e-9)).toBeTrue();
  });

  it('searches the bbox around both points with a margin', async () => {
    geo.bikeWaysIntersecting.and.resolveTo({ tileFiles: [], ways: [] });

    await service.route('BIKE', start, goal);

    const bbox = geo.bikeWaysIntersecting.calls.mostRecent().args[0];
    expect(bbox[0]).toBeLessThan(start[0]);
    expect(bbox[2]).toBeGreaterThan(goal[0]);
  });

  it('returns null when the package has no bike ways there (never an estimate)', async () => {
    geo.bikeWaysIntersecting.and.resolveTo({ tileFiles: [], ways: [] });

    expect(await service.route('BIKE', start, goal)).toBeNull();
  });

  it('returns null when a point is too far from any bike way to be snapped', async () => {
    geo.bikeWaysIntersecting.and.resolveTo({
      tileFiles: ['bike/a.bin'],
      ways: [{ costClass: BIKE_COST_CLASS.QUIET_ROAD, coordinates: [start, goal] }],
    });

    expect(await service.route('BIKE', [19.0, 47.1], goal)).toBeNull();
  });

  it('returns null for a profile that is not implemented here', async () => {
    expect(await service.route('HIKE' as 'BIKE', start, goal)).toBeNull();
    expect(geo.bikeWaysIntersecting).not.toHaveBeenCalled();
  });

  it('reuses the graph it already built for the same tile set instead of rebuilding it', async () => {
    // Első hívás: ezekből az utakból épül a gráf (a kerülő kerékpárút olcsóbb a főútnál), és a
    // cache-be kerül a "bike/a.bin" kulcs alatt.
    geo.bikeWaysIntersecting.and.resolveTo({
      tileFiles: ['bike/a.bin'],
      ways: [
        { costClass: BIKE_COST_CLASS.MAIN_ROAD, coordinates: [start, goal] },
        { costClass: BIKE_COST_CLASS.CYCLEWAY, coordinates: [start, detourVia, goal] },
      ],
    });
    const firstRoute = await service.route('BIKE', start, goal);
    expect(firstRoute!.some(([lon, lat]) => Math.abs(lon - detourVia[0]) < 1e-9 && Math.abs(lat - detourVia[1]) < 1e-9)).toBeTrue();

    // Második hívás: ugyanaz a csempe-halmaz, de (szándékosan) más útlista — csak a drágább főút,
    // kerülő nélkül. Ha a service ténylegesen újraépítené ebből a gráfot, a kerülő eltűnne az
    // útvonalból. A cache-találat miatt mégis az első hívás gráfján (a kerülővel) keres.
    geo.bikeWaysIntersecting.and.resolveTo({
      tileFiles: ['bike/a.bin'],
      ways: [{ costClass: BIKE_COST_CLASS.MAIN_ROAD, coordinates: [start, goal] }],
    });
    const secondRoute = await service.route('BIKE', start, goal);

    expect(secondRoute).toEqual(firstRoute);
  });

  it('rebuilds the graph when the tile set differs', async () => {
    geo.bikeWaysIntersecting.and.resolveTo({
      tileFiles: ['bike/a.bin'],
      ways: [{ costClass: BIKE_COST_CLASS.QUIET_ROAD, coordinates: [start, goal] }],
    });
    await service.route('BIKE', start, goal);

    // Más csempe-halmaz, üres útlista: nincs cache-találat, a (valódi) üres gráfon nincs útvonal.
    geo.bikeWaysIntersecting.and.resolveTo({ tileFiles: ['bike/b.bin'], ways: [] });
    expect(await service.route('BIKE', start, goal)).toBeNull();
  });
});

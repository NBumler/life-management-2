import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { StoredTuraDraft, StoredTuraMapView, TuraLocalStateService } from './tura-local-state.service';

/** backlog/213, backlog/214 */
describe('TuraLocalStateService', () => {
  let service: TuraLocalStateService;

  const draft: StoredTuraDraft = {
    coordinates: [
      [19.0, 47.7],
      [19.01, 47.71],
      [19.02, 47.72],
    ],
    waypointIndexes: [0, 1, 2],
    name: 'Pilis kör',
    dayBreaks: [{ waypointIndex: 1, overnightName: 'Dobogókő' }],
  };
  const view: StoredTuraMapView = { center: [18.9, 47.7], zoom: 13.5, basemap: 'topo', hillshade: true };

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TuraLocalStateService);
    await service.clearDraft();
    await Preferences.remove({ key: 'lm2_tura_map_view' });
  });

  afterEach(async () => {
    await service.clearDraft();
    await Preferences.remove({ key: 'lm2_tura_map_view' });
  });

  it('a written draft reads back unchanged; clearDraft removes it', async () => {
    await service.writeDraft(draft);
    expect(await service.readDraft()).toEqual(draft);

    await service.clearDraft();
    expect(await service.readDraft()).toBeNull();
  });

  it('a corrupt or inconsistent draft reads as nothing stored', async () => {
    await Preferences.set({ key: 'lm2_tura_draft', value: '{not json' });
    expect(await service.readDraft()).toBeNull();

    await service.writeDraft({ ...draft, waypointIndexes: [0, 5] });
    expect(await service.readDraft()).toBeNull();
  });

  it('backlog/212 — the id of a saved route being edited round-trips; a non-string one reads as nothing stored', async () => {
    await service.writeDraft({ ...draft, routeId: 'route-1' });
    expect(await service.readDraft()).toEqual({ ...draft, routeId: 'route-1' });

    await Preferences.set({ key: 'lm2_tura_draft', value: JSON.stringify({ ...draft, routeId: 42 }) });
    expect(await service.readDraft()).toBeNull();
  });

  it('the map view round-trips; a malformed one reads as nothing stored', async () => {
    expect(await service.readMapView()).toBeNull();

    await service.writeMapView(view);
    expect(await service.readMapView()).toEqual(view);

    await Preferences.set({ key: 'lm2_tura_map_view', value: JSON.stringify({ center: [18.9], zoom: 'x' }) });
    expect(await service.readMapView()).toBeNull();
  });

  it('the layer toggles round-trip; a view stored before them still reads (backlog/199, backlog/202)', async () => {
    await service.writeMapView({ ...view, myRoutes: false, unmarkedTrails: false });
    expect(await service.readMapView()).toEqual({ ...view, myRoutes: false, unmarkedTrails: false });

    await Preferences.set({ key: 'lm2_tura_map_view', value: JSON.stringify(view) });
    expect(await service.readMapView()).toEqual(view);

    await Preferences.set({ key: 'lm2_tura_map_view', value: JSON.stringify({ ...view, myRoutes: 'no' }) });
    expect(await service.readMapView()).toBeNull();
  });
});

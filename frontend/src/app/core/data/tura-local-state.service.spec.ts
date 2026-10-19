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

  it('the map view round-trips; a malformed one reads as nothing stored', async () => {
    expect(await service.readMapView()).toBeNull();

    await service.writeMapView(view);
    expect(await service.readMapView()).toEqual(view);

    await Preferences.set({ key: 'lm2_tura_map_view', value: JSON.stringify({ center: [18.9], zoom: 'x' }) });
    expect(await service.readMapView()).toBeNull();
  });
});

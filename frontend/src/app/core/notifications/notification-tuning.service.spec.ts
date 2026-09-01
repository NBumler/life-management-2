import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { DEFAULT_TUNING, NotificationTuningService } from './notification-tuning.service';

describe('NotificationTuningService', () => {
  let service: NotificationTuningService;

  beforeEach(async () => {
    await Preferences.clear();
    TestBed.configureTestingModule({ providers: [NotificationTuningService] });
    service = TestBed.inject(NotificationTuningService);
  });

  it('starts at the spec defaults', () => {
    expect(service.tuning()).toEqual(DEFAULT_TUNING);
  });

  it('merges a partial edit and persists it', async () => {
    await service.set({ stepsLowThreshold: 3500 });
    expect(service.tuning().stepsLowThreshold).toBe(3500);
    expect(service.tuning().calorieStreakMarginKcal).toBe(DEFAULT_TUNING.calorieStreakMarginKcal);

    const stored = JSON.parse((await Preferences.get({ key: 'lm2_notifTuning' })).value!);
    expect(stored.stepsLowThreshold).toBe(3500);
  });

  it('clamps and rounds out-of-range / fractional values', async () => {
    await service.set({
      foodExpiringLeadDaysLong: 999,
      foodExpiringLeadDaysShort: 0,
      stepsLowThreshold: 2500.7,
      calorieStreakMarginKcal: -100,
    });
    expect(service.tuning()).toEqual({
      foodExpiringLeadDaysLong: 30,
      foodExpiringLeadDaysShort: 1,
      stepsLowThreshold: 2501,
      calorieStreakMarginKcal: 0,
    });
  });

  it('ignores a non-numeric field, keeping the previous value', async () => {
    await service.set({ stepsLowThreshold: Number.NaN });
    expect(service.tuning().stepsLowThreshold).toBe(DEFAULT_TUNING.stepsLowThreshold);
  });

  it('reset() goes back to defaults', async () => {
    await service.set({ stepsLowThreshold: 500 });
    await service.reset();
    expect(service.tuning()).toEqual(DEFAULT_TUNING);
  });

  it('init() reads a stored blob and clamps it; a corrupt blob keeps defaults', async () => {
    await Preferences.set({ key: 'lm2_notifTuning', value: JSON.stringify({ stepsLowThreshold: 99999 }) });
    await service.init();
    expect(service.tuning().stepsLowThreshold).toBe(20000);

    await Preferences.set({ key: 'lm2_notifTuning', value: '{not json' });
    await service.init();
    expect(service.tuning()).toEqual({ ...DEFAULT_TUNING, stepsLowThreshold: 20000 });
  });
});

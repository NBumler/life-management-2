import { Preferences } from '@capacitor/preferences';

import { NotificationSettingsService } from './notification-settings.service';
import { NOTIFICATION_TYPES } from './notification-types';

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;

  beforeEach(async () => {
    await Preferences.clear();
    service = new NotificationSettingsService();
  });

  it('defaults every type to enabled before init and when nothing is stored', async () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(service.isEnabled(type)).toBeTrue();
    }
    await service.init();
    for (const type of NOTIFICATION_TYPES) {
      expect(service.isEnabled(type)).toBeTrue();
    }
  });

  it('persists a switch and reloads it on the next init', async () => {
    await service.setEnabled('STEPS_LOW', false);
    expect(service.isEnabled('STEPS_LOW')).toBeFalse();

    const fresh = new NotificationSettingsService();
    await fresh.init();
    expect(fresh.isEnabled('STEPS_LOW')).toBeFalse();
    expect(fresh.isEnabled('EVENT_OCCURRENCE')).toBeTrue();
  });

  it('keeps defaults when the stored blob is corrupt', async () => {
    await Preferences.set({ key: 'lm2_notifications', value: '{not json' });
    await service.init();
    expect(service.isEnabled('CALORIE_STREAK')).toBeTrue();
  });

  it('ignores unknown keys in the stored blob', async () => {
    await Preferences.set({ key: 'lm2_notifications', value: JSON.stringify({ BOGUS: false, STEPS_LOW: false }) });
    await service.init();
    expect(service.isEnabled('STEPS_LOW')).toBeFalse();
  });
});

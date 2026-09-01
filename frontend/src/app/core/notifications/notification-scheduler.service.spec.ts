import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { BikeRideLogRepository } from '../data/bike-ride-log.repository';
import { CalendarEventRepository } from '../data/calendar-event.repository';
import { ClimbingSessionRepository } from '../data/climbing-session.repository';
import { DailyStepLogRepository } from '../data/daily-step-log.repository';
import { FoodRepository } from '../data/food.repository';
import { HouseholdTaskRepository } from '../data/household-task.repository';
import { MealRepository } from '../data/meal.repository';
import { ProfileRepository } from '../data/profile.repository';
import { RecipeRepository } from '../data/recipe.repository';
import { StoredFoodRepository } from '../data/stored-food.repository';
import { SwimLogRepository } from '../data/swim-log.repository';
import { WorkoutSessionRepository } from '../data/workout-session.repository';
import { FeatureFlagsService } from '../config/feature-flags.service';
import { LanguageService } from '../config/language.service';
import { addDaysIso, today } from '../../shared/local-date';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { LocalNotificationsGateway } from './local-notifications.gateway';
import { NotificationDedupeStore } from './notification-dedupe.store';
import { notificationNumericId } from './notification-ids';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationType } from './notification-types';

function repoStub(extra: Record<string, unknown> = {}): unknown {
  return { items: () => [], load: () => Promise.resolve(), ...extra };
}

describe('NotificationSchedulerService', () => {
  let gateway: jasmine.SpyObj<LocalNotificationsGateway>;
  let dedupeHas: jasmine.Spy;
  let dedupeRecord: jasmine.Spy;
  let settingsEnabled: Record<NotificationType, boolean>;
  let flagOn: (key: string) => boolean;

  let storedFoodItems: unknown[];
  let householdItems: unknown[];
  let eventItems: unknown[];

  function build(): NotificationSchedulerService {
    settingsEnabled = {
      FOOD_EXPIRING_DAILY: true,
      FOOD_SPOILED_ONCE: true,
      STEPS_LOW: true,
      CALORIE_STREAK: true,
      HOUSEHOLD_TASK_DUE: true,
      EVENT_OCCURRENCE: true,
    };
    flagOn = () => true;

    TestBed.configureTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: LocalNotificationsGateway, useValue: gateway },
        {
          provide: NotificationSettingsService,
          useValue: { enabled: signal(settingsEnabled), isEnabled: (t: NotificationType) => settingsEnabled[t] },
        },
        {
          provide: NotificationDedupeStore,
          useValue: {
            has: (dedupeHas = jasmine.createSpy('has').and.resolveTo(false)),
            record: (dedupeRecord = jasmine.createSpy('record').and.resolveTo()),
            prune: jasmine.createSpy('prune').and.resolveTo(),
          },
        },
        { provide: FeatureFlagsService, useValue: { isEnabled: (k: string) => flagOn(k) } },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
        { provide: LanguageService, useValue: { activeLanguage: () => 'hu' } },
        { provide: DataChangeNotifier, useValue: { tick: signal(0) } },
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } },
        { provide: StoredFoodRepository, useValue: repoStub({ items: () => storedFoodItems }) },
        { provide: FoodRepository, useValue: repoStub() },
        { provide: RecipeRepository, useValue: repoStub() },
        { provide: MealRepository, useValue: repoStub() },
        { provide: ProfileRepository, useValue: repoStub({ profile: () => null }) },
        { provide: DailyStepLogRepository, useValue: repoStub({ stepsForDay: () => 5000 }) },
        { provide: HouseholdTaskRepository, useValue: repoStub({ items: () => householdItems }) },
        { provide: CalendarEventRepository, useValue: repoStub({ items: () => eventItems }) },
        { provide: WorkoutSessionRepository, useValue: repoStub() },
        { provide: SwimLogRepository, useValue: repoStub() },
        { provide: BikeRideLogRepository, useValue: repoStub() },
        { provide: ClimbingSessionRepository, useValue: repoStub() },
      ],
    });
    return TestBed.inject(NotificationSchedulerService);
  }

  beforeEach(async () => {
    await Preferences.clear();
    storedFoodItems = [];
    householdItems = [];
    eventItems = [];

    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-09-01T10:00:00'));

    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    gateway = jasmine.createSpyObj('LocalNotificationsGateway', [
      'checkPermissions',
      'requestPermissions',
      'schedule',
      'cancelIds',
      'getPending',
      'createChannel',
      'addActionPerformedListener',
    ]);
    gateway.schedule.and.resolveTo();
    gateway.cancelIds.and.resolveTo();
    gateway.getPending.and.resolveTo({ notifications: [] } as never);
    gateway.createChannel.and.resolveTo();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('reevaluate is a no-op on a non-native platform', async () => {
    (Capacitor.isNativePlatform as jasmine.Spy).and.returnValue(false);
    const service = build();
    service.permission.set('granted');

    await service.reevaluate('test', true);

    expect(gateway.schedule).not.toHaveBeenCalled();
  });

  it('cancels everything and schedules nothing when permission is not granted', async () => {
    const service = build();
    await Preferences.set({
      key: 'lm2_notifScheduled',
      value: JSON.stringify({ '123': { type: 'STEPS_LOW', key: 'x', fireAt: '2026-09-02T20:00:00', lang: 'hu' } }),
    });
    service.permission.set('denied');
    eventItems = [allDayEvent(addDaysIso(today(), 5))];

    await service.reevaluate('test', false);

    expect(gateway.cancelIds).toHaveBeenCalledWith([123]);
    expect(gateway.schedule).not.toHaveBeenCalled();
    expect((await Preferences.get({ key: 'lm2_notifScheduled' })).value).toBe('{}');
  });

  it('schedules a future notification with schedule.at and records it in the registry', async () => {
    const service = build();
    service.permission.set('granted');
    eventItems = [allDayEvent(addDaysIso(today(), 5))];

    await service.reevaluate('test', false);

    expect(gateway.schedule).toHaveBeenCalledTimes(1);
    const arg = gateway.schedule.calls.mostRecent().args[0] as { notifications: { schedule?: { at: Date } }[] };
    expect(arg.notifications[0].schedule!.at instanceof Date).toBeTrue();
    const registry = JSON.parse((await Preferences.get({ key: 'lm2_notifScheduled' })).value!);
    expect(Object.values(registry)[0]).toEqual(jasmine.objectContaining({ type: 'EVENT_OCCURRENCE', lang: 'hu' }));
  });

  it('fires a past-due notification immediately (no schedule.at) and records dedupe', async () => {
    const service = build();
    service.permission.set('granted');
    householdItems = [{ id: 't1', name: 'Porszívózás', nextDue: today(), deleted: false }];

    await service.reevaluate('test', false);

    const arg = gateway.schedule.calls.mostRecent().args[0] as { notifications: { schedule?: unknown }[] };
    expect(arg.notifications[0].schedule).toBeUndefined();
    expect(dedupeRecord).toHaveBeenCalledWith('HOUSEHOLD_TASK_DUE', today(), today());
  });

  it('does not re-fire a past-due notification that is already in the dedupe log', async () => {
    const service = build();
    service.permission.set('granted');
    householdItems = [{ id: 't1', name: 'Porszívózás', nextDue: today(), deleted: false }];
    dedupeHas.and.resolveTo(true);

    await service.reevaluate('test', false);

    expect(gateway.schedule).not.toHaveBeenCalled();
  });

  it('cancels a registry entry that is no longer desired', async () => {
    const service = build();
    service.permission.set('granted');
    const staleId = 999999;
    await Preferences.set({
      key: 'lm2_notifScheduled',
      value: JSON.stringify({
        [staleId]: { type: 'EVENT_OCCURRENCE', key: 'ev-gone:2026-12-01', fireAt: '2026-12-01T09:00:00', lang: 'hu' },
      }),
    });

    await service.reevaluate('test', false);

    expect(gateway.cancelIds).toHaveBeenCalledWith([staleId]);
  });

  it('skips a type whose device-local switch is off', async () => {
    const service = build();
    service.permission.set('granted');
    settingsEnabled.EVENT_OCCURRENCE = false;
    eventItems = [allDayEvent(addDaysIso(today(), 5))];

    await service.reevaluate('test', false);

    expect(gateway.schedule).not.toHaveBeenCalled();
  });

  it('skips a type whose source feature flag is off', async () => {
    const service = build();
    service.permission.set('granted');
    flagOn = (key: string) => key !== 'feladatok.esemenyek';
    eventItems = [allDayEvent(addDaysIso(today(), 5))];

    await service.reevaluate('test', false);

    expect(gateway.schedule).not.toHaveBeenCalled();
  });

  it('cancels and reschedules a kept future entry when the UI language changed since it was baked', async () => {
    const service = build();
    service.permission.set('granted');
    const date = addDaysIso(today(), 5);
    eventItems = [allDayEvent(date)];
    const id = notificationNumericId('EVENT_OCCURRENCE', `ev-${date}:${date}`);
    await Preferences.set({
      key: 'lm2_notifScheduled',
      value: JSON.stringify({
        [id]: { type: 'EVENT_OCCURRENCE', key: `ev-${date}:${date}`, fireAt: `${date}T09:00:00`, lang: 'en' },
      }),
    });
    gateway.getPending.and.resolveTo({ notifications: [{ id }] } as never);

    await service.reevaluate('test', false);

    expect(gateway.cancelIds).toHaveBeenCalledWith([id]);
    expect(gateway.schedule).toHaveBeenCalledTimes(1);
    const registry = JSON.parse((await Preferences.get({ key: 'lm2_notifScheduled' })).value!);
    expect(registry[id].lang).toBe('hu');
  });

  it('reschedules a still-wanted future entry that the OS no longer has pending', async () => {
    const service = build();
    service.permission.set('granted');
    const date = addDaysIso(today(), 5);
    eventItems = [allDayEvent(date)];
    const id = notificationNumericId('EVENT_OCCURRENCE', `ev-${date}:${date}`);
    await Preferences.set({
      key: 'lm2_notifScheduled',
      value: JSON.stringify({
        [id]: { type: 'EVENT_OCCURRENCE', key: `ev-${date}:${date}`, fireAt: `${date}T09:00:00`, lang: 'hu' },
      }),
    });
    // getPending stays [] → the OS dropped the alarm.

    await service.reevaluate('test', false);

    expect(gateway.cancelIds).toHaveBeenCalledWith([id]);
    expect(gateway.schedule).toHaveBeenCalledTimes(1);
    const arg = gateway.schedule.calls.mostRecent().args[0] as { notifications: { schedule?: { at: Date } }[] };
    expect(arg.notifications[0].schedule!.at instanceof Date).toBeTrue();
  });

  it('re-fires a past-due entry the OS still has queued instead of assuming it was delivered', async () => {
    const service = build();
    service.permission.set('granted');
    householdItems = [{ id: 't1', name: 'Porszívózás', nextDue: today(), deleted: false }];
    const id = notificationNumericId('HOUSEHOLD_TASK_DUE', today());
    await Preferences.set({
      key: 'lm2_notifScheduled',
      value: JSON.stringify({
        [id]: { type: 'HOUSEHOLD_TASK_DUE', key: today(), fireAt: `${today()}T09:00:00`, lang: 'hu' },
      }),
    });
    gateway.getPending.and.resolveTo({ notifications: [{ id }] } as never);

    await service.reevaluate('test', false);

    expect(gateway.cancelIds).toHaveBeenCalledWith([id]);
    const arg = gateway.schedule.calls.mostRecent().args[0] as { notifications: { schedule?: unknown }[] };
    expect(arg.notifications[0].schedule).toBeUndefined();
    expect(dedupeRecord).toHaveBeenCalledWith('HOUSEHOLD_TASK_DUE', today(), today());
  });

  it('schedules inexact alarms (no exact-alarm permission needed)', async () => {
    const service = build();
    service.permission.set('granted');
    eventItems = [allDayEvent(addDaysIso(today(), 5))];

    await service.reevaluate('test', false);

    const arg = gateway.schedule.calls.mostRecent().args[0] as { notifications: { isExactNotification?: boolean }[] };
    expect(arg.notifications[0].isExactNotification).toBeFalse();
  });

  it('writes a background plan for the native worker, pre-rendered in the current language', async () => {
    const service = build();
    service.permission.set('granted');
    householdItems = [{ id: 't1', name: 'Porszívózás', nextDue: today(), deleted: false }];

    await service.reevaluate('test', false);

    const plan = JSON.parse((await Preferences.get({ key: 'lm2_notifBgPlan' })).value!);
    expect(plan.entries.length).toBeGreaterThan(0);
    const digest = plan.entries.find((e: { type: string }) => e.type === 'HOUSEHOLD_TASK_DUE');
    expect(digest.title).toBe('NOTIFICATIONS.HOUSEHOLD_TASK_DUE.TITLE');
    expect(typeof digest.fireAtEpochMs).toBe('number');
    // The stub TranslateService echoes the key, so assert the sentinel the worker substitutes on.
    expect(plan.stepsLow.stepsPlaceholder).toBe('__STEPS__');
  });

  it('clears the background plan when the feature is off / permission missing', async () => {
    const service = build();
    service.permission.set('denied');

    await service.reevaluate('test', false);

    const plan = JSON.parse((await Preferences.get({ key: 'lm2_notifBgPlan' })).value!);
    expect(plan.entries).toEqual([]);
    expect(plan.stepsLow).toBeNull();
  });

  it('folds the native worker dedupe ledger into the dedupe store and clears it', async () => {
    const service = build();
    service.permission.set('granted');
    await Preferences.set({
      key: 'lm2_notifBgDedupe',
      value: JSON.stringify([{ type: 'STEPS_LOW', key: today(), day: today() }]),
    });

    await service.reevaluate('test', false);

    expect(dedupeRecord).toHaveBeenCalledWith('STEPS_LOW', today(), today());
    expect((await Preferences.get({ key: 'lm2_notifBgDedupe' })).value).toBe('[]');
  });

  it('does not re-fire a past-due notification the native worker already recorded', async () => {
    const service = build();
    service.permission.set('granted');
    householdItems = [{ id: 't1', name: 'Porszívózás', nextDue: today(), deleted: false }];
    await Preferences.set({
      key: 'lm2_notifBgDedupe',
      value: JSON.stringify([{ type: 'HOUSEHOLD_TASK_DUE', key: today(), day: today() }]),
    });
    // After the merge the dedupe store must report this key as seen.
    dedupeHas.and.callFake((type: string, key: string) => Promise.resolve(type === 'HOUSEHOLD_TASK_DUE' && key === today()));

    await service.reevaluate('test', false);

    expect(gateway.schedule).not.toHaveBeenCalled();
  });

  it('syncPermission stays recoverable after a transient checkPermissions failure', async () => {
    const service = build();
    gateway.checkPermissions.and.rejectWith(new Error('plugin not ready'));

    await service.syncPermission();
    expect(service.permission()).toBe('unknown');

    gateway.checkPermissions.and.resolveTo({ display: 'granted' } as never);
    await service.syncPermission();
    expect(service.permission()).toBe('granted');
  });
});

function allDayEvent(date: string): unknown {
  return {
    id: `ev-${date}`,
    title: 'Nagy nap',
    location: null,
    notes: null,
    allDay: true,
    date,
    startTime: null,
    endTime: null,
    frequency: null,
    interval: 1,
    deleted: false,
  };
}

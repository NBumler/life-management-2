import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { CalendarEvent } from '../../../api/model/calendarEvent';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { EventListPage } from './event-list.page';
import { EventOccurrenceRow } from './event-sections';

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'Fogorvos',
    location: null,
    notes: null,
    allDay: false,
    date: '2026-06-01',
    startTime: '10:00',
    endTime: '11:00',
    frequency: null,
    interval: 1,
    deleted: false,
    ...overrides,
  };
}

describe('EventListPage', () => {
  let fixture: ComponentFixture<EventListPage>;
  let repository: jasmine.SpyObj<Pick<CalendarEventRepository, 'load'>> & { items: ReturnType<typeof signal<CalendarEvent[]>> };

  beforeEach(async () => {
    repository = jasmine.createSpyObj('CalendarEventRepository', ['load']) as never;
    repository.items = signal<CalendarEvent[]>([]);

    await TestBed.configureTestingModule({
      imports: [EventListPage],
      providers: [provideRouter([]), provideTranslateService(), { provide: CalendarEventRepository, useValue: repository }],
    }).compileComponents();

    fixture = TestBed.createComponent(EventListPage);
  });

  it('isEmpty() vs hasNoResults(): distinguishes no-events-at-all from a filtered-out search', () => {
    expect(fixture.componentInstance.isEmpty()).toBe(true);
    repository.items.set([event()]);
    fixture.componentInstance.query.set('teljesen-más');

    expect(fixture.componentInstance.isEmpty()).toBe(false);
    expect(fixture.componentInstance.hasNoResults()).toBe(true);
  });

  it('searches both title and location', () => {
    repository.items.set([event({ id: 'a', title: 'Fogorvos', location: 'Rendelő' })]);
    fixture.componentInstance.query.set('rendelő');

    const sections = fixture.componentInstance.sections();
    const allIds = [...sections.today, ...sections.upcoming, ...sections.past].map((r) => r.eventId);

    expect(allIds).toEqual(['a']);
  });

  function row(overrides: Partial<EventOccurrenceRow> = {}): EventOccurrenceRow {
    return {
      eventId: 'a',
      date: '2026-06-01',
      allDay: false,
      startTime: '10:00',
      endTime: '11:00',
      title: 'Fogorvos',
      location: null,
      recurring: false,
      frequency: null,
      ...overrides,
    };
  }

  it('timeLabel(): null for all-day, "start–end" for timed', () => {
    expect(fixture.componentInstance.timeLabel(row())).toBe('10:00–11:00');
    expect(fixture.componentInstance.timeLabel(row({ allDay: true, startTime: null, endTime: null }))).toBeNull();
  });

  it('rhythmLabelKey(): null for one-off events, the matching i18n key for a recurring frequency', () => {
    expect(fixture.componentInstance.rhythmLabelKey(row({ frequency: null }))).toBeNull();
    expect(fixture.componentInstance.rhythmLabelKey(row({ frequency: CalendarEvent.FrequencyEnum.Weekly }))).toBe(
      'TASKS.EVENTS.FREQUENCY_WEEKLY',
    );
  });
});

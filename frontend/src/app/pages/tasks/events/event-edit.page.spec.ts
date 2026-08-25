import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { CalendarEvent } from '../../../api/model/calendarEvent';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { EventEditPage } from './event-edit.page';

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

describe('EventEditPage', () => {
  let fixture: ComponentFixture<EventEditPage>;
  let repository: jasmine.SpyObj<Pick<CalendarEventRepository, 'load' | 'save' | 'remove'>> & {
    items: ReturnType<typeof signal<CalendarEvent[]>>;
  };

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('CalendarEventRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<CalendarEvent[]>([]);

    await TestBed.configureTestingModule({
      imports: [EventEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: CalendarEventRepository, useValue: repository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventEditPage);
  }

  it('create mode: defaults allDay to false and fills startTime/endTime', async () => {
    await createFixture('new');

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.eventId()).toBeNull();
    expect(fixture.componentInstance.form.controls.allDay.value).toBe(false);
    expect(fixture.componentInstance.form.controls.startTime.value).not.toBeNull();
    expect(fixture.componentInstance.form.controls.endTime.value).not.toBeNull();
  });

  it('edit mode: patches the form from the already-loaded repository item', async () => {
    await createFixture('e1');
    repository.items.set([event({ id: 'e1', title: 'Szemész', location: 'Klinika' })]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.eventId()).toBe('e1');
    expect(fixture.componentInstance.form.controls.title.value).toBe('Szemész');
    expect(fixture.componentInstance.form.controls.location.value).toBe('Klinika');
  });

  it('save(): rejects a timed event when endTime is not after startTime', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.patchValue({ title: 'Fogorvos', allDay: false, startTime: '11:00', endTime: '10:00' });

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
    expect(fixture.componentInstance.timeRangeError()).not.toBeNull();
  });

  it('save(): allDay clears startTime/endTime before persisting', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(event());
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance.form.patchValue({ title: 'Szülinap', allDay: true, date: '2026-07-01' });

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({ title: 'Szülinap', allDay: true, startTime: null, endTime: null }),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/tasks/events');
  });

  it('delete(): the confirmation handler removes the event via the repository', async () => {
    await createFixture('e1');
    repository.items.set([event({ id: 'e1' })]);
    await fixture.componentInstance.ngOnInit();
    repository.remove.and.resolveTo();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const alertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete();
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('e1');
  });
});

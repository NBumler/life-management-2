import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { SetOptions, SetOptionsPopoverComponent } from './set-options-popover.component';

describe('SetOptionsPopoverComponent (backlog/134, backlog/135)', () => {
  let fixture: ComponentFixture<SetOptionsPopoverComponent>;
  let component: SetOptionsPopoverComponent;
  let emitted: SetOptions[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetOptionsPopoverComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    emitted = [];
    fixture = TestBed.createComponent(SetOptionsPopoverComponent);
    component = fixture.componentInstance;
    component.initial = { setType: 'WORKING', side: 'LEFT', rpe: 8 };
    component.changed = (options) => emitted.push(options);
    component.ngOnInit();
  });

  it('starts from the current options of the set', () => {
    expect(component.setType()).toBe('WORKING');
    expect(component.sideValue()).toBe('LEFT');
    expect(component.rpe()).toBe(8);
  });

  it('reports every pick live with the full option set', () => {
    component.pickType('WARMUP');
    component.pickSide('BOTH');
    component.pickRpe(9.5);

    expect(emitted).toEqual([
      { setType: 'WARMUP', side: 'LEFT', rpe: 8 },
      { setType: 'WARMUP', side: null, rpe: 8 },
      { setType: 'WARMUP', side: null, rpe: 9.5 },
    ]);
  });

  it('clears the RPE with the dash button', () => {
    component.pickRpe(null);
    expect(emitted[0].rpe).toBeNull();
  });

  it('renders', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.rpe-grid ion-button').length).toBe(10);
  });
});

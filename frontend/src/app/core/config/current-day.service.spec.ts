import { TestBed } from '@angular/core/testing';

import { today } from '../../shared/local-date';
import { CurrentDayService } from './current-day.service';

describe('CurrentDayService (backlog/144)', () => {
  afterEach(() => jasmine.clock().uninstall());

  it('starts on the client calendar day', () => {
    expect(TestBed.inject(CurrentDayService).day()).toBe(today());
  });

  it('re-reads the day when the app comes back to the foreground', () => {
    const service = TestBed.inject(CurrentDayService);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2030, 0, 2, 0, 0, 30));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(service.day()).toBe('2030-01-02');
  });
});

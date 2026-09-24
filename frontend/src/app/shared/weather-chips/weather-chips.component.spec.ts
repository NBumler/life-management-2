import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { WeatherChipsComponent } from './weather-chips.component';

describe('WeatherChipsComponent (backlog/119)', () => {
  let fixture: ComponentFixture<WeatherChipsComponent>;
  let component: WeatherChipsComponent;
  let emitted: string[][];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherChipsComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
    fixture = TestBed.createComponent(WeatherChipsComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.valueChange.subscribe((tags) => emitted.push(tags));
    component.value = ['COLD'];
    fixture.detectChanges();
  });

  function chip(tag: string): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`.weather-chip[data-tag="${tag}"]`) as HTMLElement;
  }

  it('renders all 10 tags and marks the selected ones', () => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.weather-chip').length).toBe(10);
    expect(chip('COLD').getAttribute('aria-checked')).toBe('true');
    expect(chip('HOT').getAttribute('aria-checked')).toBe('false');
  });

  it('lets several (even contradicting) tags be on at once, and toggles one off again', () => {
    chip('HOT').click();
    chip('RAIN').click();
    fixture.detectChanges();
    expect(emitted[emitted.length - 1]).toEqual(['HOT', 'COLD', 'RAIN']);

    chip('COLD').click();
    expect(emitted[emitted.length - 1]).toEqual(['HOT', 'RAIN']);
  });
});

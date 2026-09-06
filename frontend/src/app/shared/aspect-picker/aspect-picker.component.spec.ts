import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideTranslateService } from '@ngx-translate/core';

import { Aspect } from '../aspect';
import { AspectPickerComponent } from './aspect-picker.component';

describe('AspectPickerComponent', () => {
  let fixture: ComponentFixture<AspectPickerComponent>;
  let component: AspectPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AspectPickerComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AspectPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function buttons(): HTMLButtonElement[] {
    return fixture.debugElement.queryAll(By.css('.aspect-picker__dir')).map((d) => d.nativeElement as HTMLButtonElement);
  }

  it('renders the eight compass directions as radios', () => {
    const radios = buttons();
    expect(radios.length).toBe(8);
    expect(radios.every((b) => b.getAttribute('role') === 'radio')).toBe(true);
  });

  it('writeValue() marks the matching direction aria-checked', () => {
    component.writeValue('SW');
    fixture.detectChanges();
    const checked = buttons().filter((b) => b.getAttribute('aria-checked') === 'true');
    expect(checked.length).toBe(1);
    expect(checked[0].textContent?.trim()).toBe('SHARED.ASPECT_PICKER.SHORT.SW');
  });

  it('clicking a direction emits it once through the CVA and the output', () => {
    const cva: (Aspect | null)[] = [];
    const out: (Aspect | null)[] = [];
    component.registerOnChange((v) => cva.push(v));
    component.valueChange.subscribe((v) => out.push(v));

    buttons()[2].click(); // ASPECTS[2] === 'E'

    expect(cva).toEqual(['E']);
    expect(out).toEqual(['E']);
  });

  it('clicking the selected direction again clears it to null', () => {
    const cva: (Aspect | null)[] = [];
    component.registerOnChange((v) => cva.push(v));

    buttons()[0].click(); // 'N'
    buttons()[0].click();

    expect(cva).toEqual(['N', null]);
  });

  it('setDisabledState(true) blocks selection', () => {
    const cva: (Aspect | null)[] = [];
    component.registerOnChange((v) => cva.push(v));
    component.setDisabledState(true);
    fixture.detectChanges();

    buttons()[1].click();

    expect(cva).toEqual([]);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { PartnerComboboxComponent } from './partner-combobox.component';

describe('PartnerComboboxComponent', () => {
  let fixture: ComponentFixture<PartnerComboboxComponent>;
  let component: PartnerComboboxComponent;
  let emitted: string[][];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerComboboxComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnerComboboxComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.partnersChange.subscribe((value) => emitted.push(value));
  });

  it('seeds the picked chips from the [partners] input', () => {
    component.partners = ['Anna', 'Béla'];
    expect(component.selected()).toEqual(['Anna', 'Béla']);
  });

  it('quickPicks: shows unpicked suggestions while the query is empty, capped at 6', () => {
    component.suggestions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    component.partners = ['B'];
    expect(component.quickPicks()).toEqual(['A', 'C', 'D', 'E', 'F', 'G']);
  });

  it('filteredSuggestions: accent-insensitive substring filter, excludes already-picked', () => {
    component.suggestions = ['Gábor', 'Gabriella', 'Zoltán'];
    component.partners = ['Gabriella'];
    component.onQuery('gab');
    expect(component.filteredSuggestions()).toEqual(['Gábor']);
  });

  it('add(): appends a trimmed name, clears the query, emits the new list', () => {
    component.partners = ['Anna'];
    component.onQuery('  Béla  ');
    component.add('  Béla  ');
    expect(component.selected()).toEqual(['Anna', 'Béla']);
    expect(component.query()).toBe('');
    expect(emitted[emitted.length - 1]).toEqual(['Anna', 'Béla']);
  });

  it('add(): ignores a case-insensitive duplicate', () => {
    component.partners = ['Anna'];
    component.add('anna');
    expect(component.selected()).toEqual(['Anna']);
    expect(emitted).toEqual([]);
  });

  it('addableNew(): null when the typed name already exists in the suggestions or the picks', () => {
    component.suggestions = ['Anna'];
    component.onQuery('anna');
    expect(component.addableNew()).toBeNull();
    component.onQuery('Cecil');
    expect(component.addableNew()).toBe('Cecil');
  });

  it('commitTyped(): a brand-new typed name is added verbatim, an existing fragment resolves to the top match', () => {
    component.suggestions = ['Gábor'];
    component.onQuery('gá');
    component.commitTyped();
    expect(component.selected()).toEqual(['Gábor']);

    component.onQuery('Ismeretlen');
    component.commitTyped();
    expect(component.selected()).toEqual(['Gábor', 'Ismeretlen']);
  });

  it('remove(): drops the name and emits', () => {
    component.partners = ['Anna', 'Béla'];
    component.remove('Anna');
    expect(component.selected()).toEqual(['Béla']);
    expect(emitted[emitted.length - 1]).toEqual(['Béla']);
  });
});

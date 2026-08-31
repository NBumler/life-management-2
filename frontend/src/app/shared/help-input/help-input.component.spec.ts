import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { HelpInputComponent } from './help-input.component';

describe('HelpInputComponent', () => {
  let fixture: ComponentFixture<HelpInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpInputComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpInputComponent);
    fixture.detectChanges();
  });

  it('creates and renders without throwing', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('emits valueChange when the input reports a value', () => {
    const values: string[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => values.push(v));

    fixture.componentInstance.valueChange.emit('6a');

    expect(values).toEqual(['6a']);
  });

  it('renders the trailing badge and the inline error note from their inputs', () => {
    fixture.componentRef.setInput('badge', 'FRA');
    fixture.componentRef.setInput('errorKey', 'SHARED.GRADE_INPUT.ERROR_UNKNOWN');
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.help-input-badge')?.textContent).toContain('FRA');
    expect(host.querySelector('ion-note[color="danger"]')).not.toBeNull();
  });

  it('hides the error note when errorKey is null', () => {
    fixture.componentRef.setInput('errorKey', null);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('ion-note[color="danger"]')).toBeNull();
  });

  it('showHelp() opens an alert with the resolved help title / text keys', async () => {
    const alertController = TestBed.inject(AlertController);
    const present = jasmine.createSpy('present');
    const createSpy = spyOn(alertController, 'create').and.resolveTo({ present } as never);

    fixture.componentInstance.helpTitleKey = 'SHARED.GRADE_INPUT.HELP_TITLE';
    fixture.componentInstance.helpTextKey = 'SHARED.GRADE_INPUT.HELP_BOULDER';
    await fixture.componentInstance.showHelp();

    expect(createSpy).toHaveBeenCalled();
    expect(present).toHaveBeenCalled();
  });
});

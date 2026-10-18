import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/standalone';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';

import { HelpButtonComponent } from './help-button.component';

describe('HelpButtonComponent', () => {
  let fixture: ComponentFixture<HelpButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpButtonComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpButtonComponent);
    fixture.detectChanges();
  });

  it('creates and renders a single clear button', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('ion-button').length).toBe(1);
  });

  it('showHelp() opens an alert with the resolved title / text keys', async () => {
    const alertController = TestBed.inject(AlertController);
    const present = jasmine.createSpy('present');
    const createSpy = spyOn(alertController, 'create').and.resolveTo({ present } as never);

    fixture.componentInstance.titleKey = 'WORKOUT.CLIMBING.ASCENT_STYLE.HELP_TITLE';
    fixture.componentInstance.textKey = 'WORKOUT.CLIMBING.ASCENT_STYLE.HELP_TEXT';
    await fixture.componentInstance.showHelp();

    expect(createSpy).toHaveBeenCalled();
    const arg = createSpy.calls.mostRecent().args[0] as { header: string; message: string };
    expect(arg.header).toBe('WORKOUT.CLIMBING.ASCENT_STYLE.HELP_TITLE');
    expect(arg.message).toBe('WORKOUT.CLIMBING.ASCENT_STYLE.HELP_TEXT');
    expect(present).toHaveBeenCalled();
  });

  it('showHelp() passes textParams to the body translation', async () => {
    const alertController = TestBed.inject(AlertController);
    const translate = TestBed.inject(TranslateService);
    spyOn(alertController, 'create').and.resolveTo({ present: jasmine.createSpy('present') } as never);
    const instant = spyOn(translate, 'instant').and.callThrough();

    fixture.componentInstance.textKey = 'WORKOUT.BIKE.LIVE.MODE_ESTIMATED_HELP_TEXT';
    fixture.componentInstance.textParams = { seconds: 20 };
    await fixture.componentInstance.showHelp();

    expect(instant).toHaveBeenCalledWith('WORKOUT.BIKE.LIVE.MODE_ESTIMATED_HELP_TEXT', { seconds: 20 });
  });
});

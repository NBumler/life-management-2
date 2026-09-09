import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { QuickActionsWidgetComponent } from './quick-actions-widget.component';

describe('QuickActionsWidgetComponent', () => {
  async function setup(isEnabled: (key: string) => boolean): Promise<ComponentFixture<QuickActionsWidgetComponent>> {
    await TestBed.configureTestingModule({
      imports: [QuickActionsWidgetComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: FeatureFlagsService, useValue: { isEnabled } },
      ],
    }).compileComponents();
    return TestBed.createComponent(QuickActionsWidgetComponent);
  }

  it('renders one button per enabled action', async () => {
    const fixture = await setup(() => true);
    fixture.detectChanges();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('ion-button');
    expect(buttons.length).toBe(fixture.componentInstance.actions.length);
    expect(fixture.componentInstance.actions.map((a) => a.key)).toEqual(['new-meal', 'new-climb']);
  });

  it('drops an action whose flag is off', async () => {
    const fixture = await setup((key) => key !== 'edzes.maszonaplo');
    fixture.detectChanges();

    expect(fixture.componentInstance.actions.map((a) => a.key)).toEqual(['new-meal']);
  });

  it('renders nothing when no action qualifies', async () => {
    const fixture = await setup(() => false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('ion-card')).toBeNull();
  });
});

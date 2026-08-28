import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { FeatureFlagKey, FeatureFlagsService } from '../../core/config/feature-flags.service';
import { WorkoutSegmentHeaderComponent } from './workout-segment-header.component';

describe('WorkoutSegmentHeaderComponent', () => {
  let fixture: ComponentFixture<WorkoutSegmentHeaderComponent>;

  async function createFixture(enabledFlags: readonly FeatureFlagKey[]): Promise<void> {
    const featureFlags = jasmine.createSpyObj<FeatureFlagsService>('FeatureFlagsService', ['isEnabled']);
    featureFlags.isEnabled.and.callFake((key: FeatureFlagKey) => enabledFlags.includes(key));

    await TestBed.configureTestingModule({
      imports: [WorkoutSegmentHeaderComponent],
      providers: [provideRouter([]), provideTranslateService(), { provide: FeatureFlagsService, useValue: featureFlags }],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutSegmentHeaderComponent);
    fixture.componentRef.setInput('current', 'log');
  }

  it('always shows the log segment (no flag of its own) and hides every flagged one when all are off', async () => {
    await createFixture([]);

    expect(fixture.componentInstance.visibleSections.map((s) => s.section)).toEqual(['log']);
  });

  it('reveals a flagged segment only when its flag is enabled', async () => {
    await createFixture(['edzes.hetiTerv', 'edzes.bicikli']);

    expect(fixture.componentInstance.visibleSections.map((s) => s.section)).toEqual(['log', 'weekly-plan', 'cycling']);
  });

  it('delegates a segment change to the router, ignoring the current section', async () => {
    await createFixture(['edzes.uszas']);
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance.switchSection('log');
    expect(spy).not.toHaveBeenCalled();

    fixture.componentInstance.switchSection('swimming');
    expect(spy).toHaveBeenCalledWith('/tabs/workout/swimming');
  });
});

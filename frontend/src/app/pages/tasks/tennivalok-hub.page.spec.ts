import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { FeatureFlagKey, FeatureFlagsService } from '../../core/config/feature-flags.service';
import { TennivalokHubPage } from './tennivalok-hub.page';

describe('TennivalokHubPage', () => {
  let fixture: ComponentFixture<TennivalokHubPage>;

  async function createFixture(enabledFlags: readonly FeatureFlagKey[]): Promise<void> {
    const featureFlags = jasmine.createSpyObj<FeatureFlagsService>('FeatureFlagsService', ['isEnabled']);
    featureFlags.isEnabled.and.callFake((key: FeatureFlagKey) => enabledFlags.includes(key));

    await TestBed.configureTestingModule({
      imports: [TennivalokHubPage],
      providers: [provideRouter([]), provideTranslateService(), { provide: FeatureFlagsService, useValue: featureFlags }],
    }).compileComponents();

    fixture = TestBed.createComponent(TennivalokHubPage);
  }

  it('reads all three optional tile flags at construction, independently', async () => {
    await createFixture(['feladatok.eletTervek', 'feladatok.esemenyek']);

    expect(fixture.componentInstance.eletTervekEnabled).toBe(true);
    expect(fixture.componentInstance.naptarEnabled).toBe(false);
    expect(fixture.componentInstance.esemenyekEnabled).toBe(true);
  });

  it('all three off leaves only the household tile (no flag of its own)', async () => {
    await createFixture([]);

    expect(fixture.componentInstance.eletTervekEnabled).toBe(false);
    expect(fixture.componentInstance.naptarEnabled).toBe(false);
    expect(fixture.componentInstance.esemenyekEnabled).toBe(false);
  });
});

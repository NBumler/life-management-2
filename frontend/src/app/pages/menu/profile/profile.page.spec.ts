import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { UserProfile } from '../../../api/model/userProfile';
import { WeightHistoryEntry } from '../../../api/model/weightHistoryEntry';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WeightHistoryRepository } from '../../../core/data/weight-history.repository';
import { ProfilePage } from './profile.page';

describe('ProfilePage — one-decimal weight validation (backlog/019)', () => {
  let profileRepository: jasmine.SpyObj<Pick<ProfileRepository, 'load' | 'save'>> & {
    profile: ReturnType<typeof signal<UserProfile | null>>;
  };
  let weightHistoryRepository: jasmine.SpyObj<Pick<WeightHistoryRepository, 'load' | 'add' | 'update' | 'remove'>> & {
    entries: ReturnType<typeof signal<WeightHistoryEntry[]>>;
  };

  async function createComponent(): Promise<ProfilePage> {
    profileRepository = jasmine.createSpyObj('ProfileRepository', ['load', 'save']) as never;
    profileRepository.load.and.resolveTo();
    profileRepository.save.and.resolveTo();
    profileRepository.profile = signal<UserProfile | null>(null);

    weightHistoryRepository = jasmine.createSpyObj('WeightHistoryRepository', ['load', 'add', 'update', 'remove']) as never;
    weightHistoryRepository.load.and.resolveTo();
    weightHistoryRepository.add.and.resolveTo();
    weightHistoryRepository.update.and.resolveTo();
    weightHistoryRepository.entries = signal<WeightHistoryEntry[]>([]);

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideTranslateService(),
        { provide: ProfileRepository, useValue: profileRepository },
        { provide: WeightHistoryRepository, useValue: weightHistoryRepository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProfilePage);
    await fixture.componentInstance.ngOnInit();
    return fixture.componentInstance;
  }

  it('flags a two-decimal currentWeightKg and blocks the save', async () => {
    const page = await createComponent();

    page.form.controls.currentWeightKg.setValue(72.45);

    expect(page.form.controls.currentWeightKg.errors?.['oneDecimalPlace']).toBeTrue();

    await page.save();
    expect(profileRepository.save).not.toHaveBeenCalled();
  });

  it('accepts a one-decimal currentWeightKg (including float-representation noise) and saves', async () => {
    const page = await createComponent();

    page.form.controls.currentWeightKg.setValue(72.4);
    expect(page.form.controls.currentWeightKg.errors).toBeNull();

    page.form.controls.currentWeightKg.setValue(80);
    expect(page.form.controls.currentWeightKg.errors).toBeNull();

    await page.save();
    expect(profileRepository.save).toHaveBeenCalled();
  });

  it('G-2: normalizes a comma-decimal string, so "70,25" is still flagged (not slipped through as NaN)', async () => {
    const page = await createComponent();

    page.form.controls.currentWeightKg.setValue('70,25' as unknown as number);
    expect(page.form.controls.currentWeightKg.errors?.['oneDecimalPlace']).toBeTrue();

    page.form.controls.currentWeightKg.setValue('70,5' as unknown as number);
    expect(page.form.controls.currentWeightKg.errors).toBeNull();
  });

  it('flags a two-decimal weight-history entry and blocks the entry save', async () => {
    const page = await createComponent();
    page.startAddEntry();

    page.entryForm.controls.weightKg.setValue(70.25);

    expect(page.entryForm.controls.weightKg.errors?.['oneDecimalPlace']).toBeTrue();

    await page.saveEntry();
    expect(weightHistoryRepository.add).not.toHaveBeenCalled();
  });

  it('lets a one-decimal weight-history entry through', async () => {
    const page = await createComponent();
    page.startAddEntry();

    page.entryForm.controls.recordedAt.setValue('2026-09-03T08:00');
    page.entryForm.controls.weightKg.setValue(70.2);

    expect(page.entryForm.controls.weightKg.errors).toBeNull();

    await page.saveEntry();
    expect(weightHistoryRepository.add).toHaveBeenCalled();
  });
});

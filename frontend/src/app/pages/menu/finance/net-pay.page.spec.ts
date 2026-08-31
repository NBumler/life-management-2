import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { UserProfile } from '../../../api/model/userProfile';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { NetPayPage } from './net-pay.page';

describe('NetPayPage', () => {
  let fixture: ComponentFixture<NetPayPage>;
  let component: NetPayPage;
  let profile: {
    load: jasmine.Spy<() => Promise<void>>;
    loaded: ReturnType<typeof signal<boolean>>;
    profile: ReturnType<typeof signal<UserProfile | null>>;
  };

  async function setup(): Promise<void> {
    profile = {
      load: jasmine.createSpy('profile.load').and.resolveTo(undefined),
      loaded: signal(false),
      profile: signal<UserProfile | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [NetPayPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ProfileRepository, useValue: profile },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NetPayPage);
    component = fixture.componentInstance;
  }

  it('loads the profile when it is not loaded yet', async () => {
    await setup();
    await component.ngOnInit();
    expect(profile.load).toHaveBeenCalledTimes(1);
  });

  it('skips the redundant load when a sibling screen already loaded the profile', async () => {
    await setup();
    profile.loaded.set(true);
    await component.ngOnInit();
    expect(profile.load).not.toHaveBeenCalled();
  });

  it('is not computable (renders "~") while gross salary is empty', async () => {
    await setup();
    await component.ngOnInit();
    expect(component.vm().computable).toBe(false);
    expect(component.vm().net).toBeNull();
  });
});

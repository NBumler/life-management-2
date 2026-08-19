import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { HealthService } from '../../api/api/health.service';
import { ProfileService } from '../../api/api/profile.service';
import { SyncService } from '../../api/api/sync.service';
import { AuthSessionService } from '../../core/session/auth-session.service';
import { LocalDatabaseService } from '../../core/storage/local-database.service';
import { OfflineQueueService } from '../../core/sync/offline-queue.service';
import { MenuPage } from './menu.page';

describe('MenuPage', () => {
  let fixture: ComponentFixture<MenuPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        provideHttpClient(),
        provideHttpClientTesting(),
        // MenuPage renders <app-sync-status-button>, whose real SyncEngineService pulls in this whole chain.
        { provide: AuthSessionService, useValue: jasmine.createSpyObj('AuthSessionService', ['logout'], { userId: () => null }) },
        { provide: HealthService, useValue: jasmine.createSpyObj('HealthService', ['getHealth']) },
        { provide: ProfileService, useValue: jasmine.createSpyObj('ProfileService', ['getProfile', 'getWeightHistoryEntry']) },
        { provide: SyncService, useValue: jasmine.createSpyObj('SyncService', ['getSyncChanges']) },
        { provide: LocalDatabaseService, useValue: jasmine.createSpyObj('LocalDatabaseService', ['query', 'run', 'executeTransaction']) },
        {
          provide: OfflineQueueService,
          useValue: { pendingCount: signal(0), errorCount: signal(0) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuPage);
  });

  it('creates and renders without throwing', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('exposes offlineCapable and the live pending count from OfflineQueueService', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.pendingCount()).toBe(0);
    expect(typeof fixture.componentInstance.offlineCapable).toBe('boolean');
  });
});

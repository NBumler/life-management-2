import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { HealthService } from '../../api/api/health.service';
import { ProfileService } from '../../api/api/profile.service';
import { SyncService } from '../../api/api/sync.service';
import { AuthSessionService } from '../../core/session/auth-session.service';
import { LocalDatabaseService } from '../../core/storage/local-database.service';
import { OfflineQueueService } from '../../core/sync/offline-queue.service';
import { SyncStatusButtonComponent } from './sync-status-button.component';

describe('SyncStatusButtonComponent', () => {
  let fixture: ComponentFixture<SyncStatusButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncStatusButtonComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: jasmine.createSpyObj('AuthSessionService', [], { userId: () => null }) },
        { provide: HealthService, useValue: jasmine.createSpyObj('HealthService', ['getHealth']) },
        { provide: ProfileService, useValue: jasmine.createSpyObj('ProfileService', ['getProfile', 'getWeightHistoryEntry']) },
        { provide: SyncService, useValue: jasmine.createSpyObj('SyncService', ['getSyncChanges']) },
        { provide: LocalDatabaseService, useValue: jasmine.createSpyObj('LocalDatabaseService', ['query', 'run', 'executeTransaction']) },
        { provide: OfflineQueueService, useValue: jasmine.createSpyObj('OfflineQueueService', [], { pendingCount: () => 0, errorCount: () => 0 }) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncStatusButtonComponent);
  });

  it('creates and renders without throwing', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('open(): navigates to the sync screen only when native-capable', () => {
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    fixture.componentInstance.open();

    // In the Karma/Chrome (web) test environment, Capacitor.isNativePlatform() is false.
    expect(navSpy).not.toHaveBeenCalled();
  });
});

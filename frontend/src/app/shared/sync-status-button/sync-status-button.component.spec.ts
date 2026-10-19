import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';

import hu from '../../../assets/i18n/hu.json';

import { HealthService } from '../../api/api/health.service';
import { ProfileService } from '../../api/api/profile.service';
import { SyncService } from '../../api/api/sync.service';
import { AuthSessionService } from '../../core/session/auth-session.service';
import { LocalDatabaseService } from '../../core/storage/local-database.service';
import { OfflineQueueService } from '../../core/sync/offline-queue.service';
import { SyncStatusButtonComponent, syncButtonLabel } from './sync-status-button.component';

describe('SyncStatusButtonComponent', () => {
  let fixture: ComponentFixture<SyncStatusButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncStatusButtonComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
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

  it('the button is labelled with its state in the active language (backlog/225)', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('hu', hu);
    translate.use('hu');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('ion-button') as HTMLElement;
    const expected = translate.instant(syncButtonLabel({ draining: false, errorCount: 0, pendingCount: 0, connectionState: fixture.componentInstance.connectionState() }).key);
    expect(button.getAttribute('aria-label')).toBe(expected);
    expect(button.getAttribute('title')).toBe(expected);
  });

  describe('syncButtonLabel (backlog/225)', () => {
    const idle = { draining: false, errorCount: 0, pendingCount: 0, connectionState: 'ONLINE' as const };

    it('follows the icon precedence: syncing, failed, pending, then the connection state', () => {
      expect(syncButtonLabel({ ...idle, draining: true, errorCount: 2, pendingCount: 3 })).toEqual({ key: 'SYNC.BUTTON.SYNCING' });
      expect(syncButtonLabel({ ...idle, errorCount: 2, pendingCount: 3 })).toEqual({ key: 'SYNC.BUTTON.ERRORS', params: { count: 2 } });
      expect(syncButtonLabel({ ...idle, pendingCount: 3 })).toEqual({ key: 'SYNC.BUTTON.PENDING', params: { count: 3 } });
      expect(syncButtonLabel(idle)).toEqual({ key: 'SYNC.BUTTON.ONLINE' });
      expect(syncButtonLabel({ ...idle, connectionState: 'FULL_OFFLINE' })).toEqual({ key: 'SYNC.BUTTON.FULL_OFFLINE' });
    });

    it('every state has a translation', () => {
      const button = (hu as { SYNC: { BUTTON: Record<string, string> } }).SYNC.BUTTON;
      for (const state of ['ONLINE', 'BACKEND_OFFLINE', 'FULL_OFFLINE', 'UNKNOWN']) {
        expect(button[state]).toBeTruthy();
      }
    });
  });
});

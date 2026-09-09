import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { HealthService } from '../../api/api/health.service';
import { SyncService } from '../../api/api/sync.service';
import { AuthSessionService } from '../../core/session/auth-session.service';
import { LocalDatabaseService } from '../../core/storage/local-database.service';
import { OfflineQueueService } from '../../core/sync/offline-queue.service';
import { HomePage } from './home.page';

// documentation/Features/Kezdőlap.md — the first bottom tab; minimal content = quick links to the
// other enabled tabs. Widgets/quick actions are backlog/095.
describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        provideHttpClient(),
        provideHttpClientTesting(),
        // HomePage renders <app-sync-status-button>, whose real SyncEngineService pulls in this chain.
        { provide: AuthSessionService, useValue: jasmine.createSpyObj('AuthSessionService', ['logout'], { userId: () => null }) },
        { provide: HealthService, useValue: jasmine.createSpyObj('HealthService', ['getHealth']) },
        { provide: SyncService, useValue: jasmine.createSpyObj('SyncService', ['getSyncChanges']) },
        { provide: LocalDatabaseService, useValue: jasmine.createSpyObj('LocalDatabaseService', ['query', 'run', 'executeTransaction']) },
        { provide: OfflineQueueService, useValue: { pendingCount: signal(0), errorCount: signal(0) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
  });

  it('creates and renders without throwing', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('lists the other enabled tabs as quick links, and never itself', () => {
    fixture.detectChanges();
    const keys = fixture.componentInstance.quickLinks.map((tab) => tab.key);
    expect(keys).not.toContain('home');
    // features.json ships tab.kaja / tab.edzes / tab.feladatok on, plus the always-on menu.
    expect(keys).toEqual(['food', 'workout', 'tasks', 'menu']);
  });

  it('renders one button item per quick link', () => {
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('ion-content ion-item[button]');
    expect(items.length).toBe(fixture.componentInstance.quickLinks.length);
  });
});

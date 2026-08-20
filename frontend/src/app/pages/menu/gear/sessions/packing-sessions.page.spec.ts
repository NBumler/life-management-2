import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { PackingSession } from '../../../../api/model/packingSession';
import { PackingTemplate } from '../../../../api/model/packingTemplate';
import { PackingSessionRepository } from '../../../../core/data/packing-session.repository';
import { PackingTemplateRepository } from '../../../../core/data/packing-template.repository';
import { PackingSessionsPage } from './packing-sessions.page';

function session(overrides: Partial<PackingSession> = {}): PackingSession {
  return { id: 's1', destination: null, sourceTemplateIds: [], deleted: false, ...overrides };
}

function template(overrides: Partial<PackingTemplate> = {}): PackingTemplate {
  return { id: 't1', name: 'Tél', notes: null, deleted: false, ...overrides };
}

describe('PackingSessionsPage', () => {
  let fixture: ComponentFixture<PackingSessionsPage>;
  let sessionRepository: Pick<PackingSessionRepository, 'load' | 'sessions'> & { sessions: ReturnType<typeof signal<PackingSession[]>> };
  let templateRepository: Pick<PackingTemplateRepository, 'load' | 'templates'> & { templates: ReturnType<typeof signal<PackingTemplate[]>> };

  beforeEach(async () => {
    sessionRepository = { load: jasmine.createSpy('load').and.resolveTo(), sessions: signal<PackingSession[]>([]) };
    templateRepository = { load: jasmine.createSpy('load').and.resolveTo(), templates: signal<PackingTemplate[]>([]) };

    await TestBed.configureTestingModule({
      imports: [PackingSessionsPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: PackingSessionRepository, useValue: sessionRepository },
        { provide: PackingTemplateRepository, useValue: templateRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PackingSessionsPage);
  });

  it('displayName(): uses the destination when one is set', () => {
    expect(fixture.componentInstance.displayName(session({ destination: 'Tátra' }))).toBe('Tátra');
  });

  it('documentation/Subfeatures/Pakolás.md "Lista soron cím": no destination falls back to the comma-joined source template names, not a generic placeholder', () => {
    templateRepository.templates.set([template({ id: 't1', name: 'Tél' }), template({ id: 't2', name: 'Mászás' })]);

    const name = fixture.componentInstance.displayName(session({ destination: null, sourceTemplateIds: ['t1', 't2'] }));

    expect(name).toBe('Tél, Mászás');
  });

  it('displayName(): ignores an unresolved (e.g. deleted) source template id but still joins the resolvable ones', () => {
    templateRepository.templates.set([template({ id: 't1', name: 'Tél' })]);

    const name = fixture.componentInstance.displayName(session({ destination: null, sourceTemplateIds: ['t1', 'deleted-id'] }));

    expect(name).toBe('Tél');
  });

  it('displayName(): falls back to the "unnamed" placeholder only when no source template name can be resolved', () => {
    const translate = TestBed.inject(TranslateService);

    const name = fixture.componentInstance.displayName(session({ destination: null, sourceTemplateIds: [] }));

    expect(name).toBe(translate.instant('GEAR.PACKING.UNNAMED_DESTINATION'));
  });
});

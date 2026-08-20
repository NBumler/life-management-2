import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { PackingTemplate } from '../../../../api/model/packingTemplate';
import { PackingTemplateRepository } from '../../../../core/data/packing-template.repository';
import { PackingTemplatesPage } from './packing-templates.page';

function template(overrides: Partial<PackingTemplate> = {}): PackingTemplate {
  return { id: 't1', name: 'Tél', notes: null, deleted: false, ...overrides };
}

describe('PackingTemplatesPage', () => {
  let fixture: ComponentFixture<PackingTemplatesPage>;
  let repository: jasmine.SpyObj<Pick<PackingTemplateRepository, 'load' | 'duplicate' | 'remove'>> & {
    templates: ReturnType<typeof signal<PackingTemplate[]>>;
  };

  beforeEach(async () => {
    repository = jasmine.createSpyObj('PackingTemplateRepository', ['load', 'duplicate', 'remove']) as never;
    repository.templates = signal<PackingTemplate[]>([]);

    await TestBed.configureTestingModule({
      imports: [PackingTemplatesPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: PackingTemplateRepository, useValue: repository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PackingTemplatesPage);
  });

  it('documentation/Architektúra/Szöveges keresés.md: an accent-exact match ranks ahead of a fold-only match', () => {
    repository.templates.set([template({ id: 'plain', name: 'Sor' }), template({ id: 'accented', name: 'Sör' })]);
    fixture.componentInstance.query.set('sör');

    expect(fixture.componentInstance.filteredTemplates().map((t) => t.id)).toEqual(['accented', 'plain']);
  });

  it('falls back to alphabetical order when the query has no accent (or is empty)', () => {
    repository.templates.set([template({ id: 'z', name: 'Zsák' }), template({ id: 'a', name: 'Alfa' })]);

    expect(fixture.componentInstance.filteredTemplates().map((t) => t.id)).toEqual(['a', 'z']);
  });
});

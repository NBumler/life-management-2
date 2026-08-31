import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { BoulderProblem } from '../../../../api/model/boulderProblem';
import { BoulderProblemRepository, BoulderProblemSaveInput } from '../../../../core/data/boulder-problem.repository';
import { BoulderProblemEditPage } from './boulder-problem-edit.page';

describe('BoulderProblemEditPage', () => {
  let fixture: ComponentFixture<BoulderProblemEditPage>;
  let component: BoulderProblemEditPage;
  let saveSpy: jasmine.Spy<(input: BoulderProblemSaveInput) => Promise<BoulderProblem>>;

  async function setup(problemIdParam = 'new', cragId = 'c1', sectorId = 's1'): Promise<void> {
    saveSpy = jasmine
      .createSpy('save')
      .and.resolveTo({ id: 'p1', sectorId, name: 'Kockakő', guidebookGrade: '7A', deleted: false });

    await TestBed.configureTestingModule({
      imports: [BoulderProblemEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: BoulderProblemRepository,
          useValue: { load: () => Promise.resolve(), items: signal<BoulderProblem[]>([]), save: saveSpy, remove: () => Promise.resolve() },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ cragId, sectorId, problemId: problemIdParam }) } },
        },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(BoulderProblemEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('reads the sector id from the route param', async () => {
    await setup('new', 'crag-1', 'sector-3');
    expect(component.sectorId()).toBe('sector-3');
  });

  it('save() forwards the trimmed name and verbatim grade, pinned to the sector', async () => {
    await setup();
    component.form.patchValue({ name: '  Kockakő  ', guidebookGrade: '  7A  ' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ sectorId: 's1', name: 'Kockakő', guidebookGrade: '7A' }),
    );
  });

  it('save() does nothing when the required name is missing', async () => {
    await setup();
    component.form.patchValue({ name: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BoulderProblemRepository, BoulderProblemSaveInput } from '../../../../core/data/boulder-problem.repository';

/**
 * documentation/Subfeatures/Outdoor boulder admin.md "Opcionális master" — the boulder-problem
 * editor. `guidebookGrade` is a raw string stored verbatim (parsed client-side, no matrix index).
 */
@Component({
  selector: 'app-boulder-problem-edit',
  templateUrl: 'boulder-problem-edit.page.html',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoulderProblemEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(BoulderProblemRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly problemId = signal<string | null>(null);
  readonly cragId = signal<string>('');
  readonly sectorId = signal<string>('');

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    guidebookGrade: this.fb.nonNullable.control('', [Validators.required]),
  });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    this.sectorId.set(this.route.snapshot.paramMap.get('sectorId') ?? '');
    this.cragId.set(this.route.snapshot.paramMap.get('cragId') ?? '');

    const idParam = this.route.snapshot.paramMap.get('problemId');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((p) => p.id === idParam && !p.deleted);
      if (existing === undefined) {
        await this.navigateBack();
        return;
      }
      this.problemId.set(idParam);
      this.form.reset({ name: existing.name, guidebookGrade: existing.guidebookGrade });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: BoulderProblemSaveInput = {
      id: this.problemId() ?? undefined,
      sectorId: this.sectorId(),
      name: v.name.trim(),
      guidebookGrade: v.guidebookGrade.trim(),
    };
    await this.repository.save(input);
    await this.navigateBack();
  }

  async delete(): Promise<void> {
    const id = this.problemId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.CLIMBING.PROBLEM.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.PROBLEM.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => {
            void this.repository.remove(id).then(() => this.navigateBack());
          },
        },
      ],
    });
    await alert.present();
  }

  private navigateBack(): Promise<boolean> {
    return this.router.navigateByUrl(`/tabs/workout/climbing/admin/crags/${this.cragId()}/sectors/${this.sectorId()}`);
  }
}

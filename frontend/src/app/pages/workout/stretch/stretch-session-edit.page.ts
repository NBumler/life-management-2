import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { StretchSession } from '../../../api/model/stretchSession';
import { StretchSessionItem } from '../../../api/model/stretchSessionItem';
import { StretchPlanRepository } from '../../../core/data/stretch-plan.repository';
import { StretchSessionRepository } from '../../../core/data/stretch-session.repository';
import { STRETCH_MAX_DURATION_MINUTES } from './stretch-metrics';

const LOG_ROUTE = '/tabs/workout/log';

interface ItemRow {
  item: StretchSessionItem;
  completed: WritableSignal<boolean>;
}

/**
 * documentation/Subfeatures/Nyújtás.md "Napló" (backlog/169) — route `log/stretch/:id`: a logged
 * stretching session edited after the fact (date, start, duration, notes, each stretch's done flag) or
 * deleted. The stretch list itself is what was done — it is not re-ordered or extended here.
 */
@Component({
  selector: 'app-stretch-session-edit',
  templateUrl: 'stretch-session-edit.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonInput,
    IonLabel,
    IonNote,
    IonTextarea,
    IonToggle,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StretchSessionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  // backlog/148: leave with navigateBack so this page is popped off the Ionic stack.
  private readonly navController = inject(NavController);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly repository = inject(StretchSessionRepository);
  private readonly planRepository = inject(StretchPlanRepository);

  readonly maxDuration = STRETCH_MAX_DURATION_MINUTES;
  private session: StretchSession | null = null;

  readonly date = signal('');
  readonly startTime = signal('');
  readonly durationMinutes = signal(1);
  readonly notes = signal('');
  readonly rows = signal<ItemRow[]>([]);
  readonly planName = signal<string | null>(null);

  readonly valid = computed(
    () => this.date() !== '' && this.durationMinutes() >= 1 && this.durationMinutes() <= STRETCH_MAX_DURATION_MINUTES,
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.planRepository.load()]);
    const id = this.route.snapshot.paramMap.get('id');
    const session = id === null ? undefined : this.repository.byId(id);
    if (session === undefined) {
      await this.navController.navigateBack(LOG_ROUTE);
      return;
    }
    this.session = session;
    this.date.set(session.date);
    this.startTime.set(session.startTime ?? '');
    this.durationMinutes.set(session.durationMinutes);
    this.notes.set(session.notes ?? '');
    this.planName.set(session.stretchPlanId ? (this.planRepository.byId(session.stretchPlanId)?.name ?? null) : null);
    this.rows.set(
      session.items
        .filter((item) => !item.deleted)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item) => ({ item, completed: signal(item.completed) })),
    );
  }

  setDuration(raw: unknown): void {
    const value = Math.round(Number(raw));
    this.durationMinutes.set(Number.isFinite(value) ? value : 0);
  }

  async save(): Promise<void> {
    const session = this.session;
    if (session === null || !this.valid()) {
      return;
    }
    await this.repository.save({
      id: session.id,
      date: this.date(),
      startTime: /^\d{2}:\d{2}$/.test(this.startTime()) ? this.startTime() : null,
      endTime: session.endTime ?? null,
      durationMinutes: this.durationMinutes(),
      stretchPlanId: session.stretchPlanId ?? null,
      workoutSessionId: session.workoutSessionId ?? null,
      notes: this.notes().trim() ? this.notes().trim() : null,
      items: this.rows().map((row) => ({
        id: row.item.id,
        stretchExerciseId: row.item.stretchExerciseId ?? null,
        stretchName: row.item.stretchName,
        stretchCategory: row.item.stretchCategory,
        orderIndex: row.item.orderIndex,
        holdSeconds: row.item.holdSeconds,
        perSide: row.item.perSide,
        repetitions: row.item.repetitions,
        completed: row.completed(),
      })),
    });
    await this.navController.navigateBack(LOG_ROUTE);
  }

  async delete(): Promise<void> {
    const session = this.session;
    if (session === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.STRETCH_SESSION.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.STRETCH_SESSION.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndLeave(session.id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndLeave(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.navController.navigateBack(LOG_ROUTE);
  }
}

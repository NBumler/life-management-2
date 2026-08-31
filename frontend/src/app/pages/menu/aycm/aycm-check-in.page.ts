import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AycmCheckInRepository } from '../../../core/data/aycm-check-in.repository';
import { AycmPartnerRepository } from '../../../core/data/aycm-partner.repository';
import { today } from '../../../shared/local-date';
import { displayLabel, matchPriceRule } from './aycm-price-rule';

const LIST_URL = '/tabs/menu/aycm';

function nowLocalTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * documentation/Subfeatures/AYCM Check-In.md — the single Check-In form (no list). Entry: today has
 * a live row → edit it; otherwise create today + now. `?date=YYYY-MM-DD` loads that day. Changing
 * the date switches to edit mode when that day already has a live row. The client runs
 * `matchPriceRule` on every partner/date/time change and assembles the snapshot; a gap (no band)
 * saves at 0 Ft with a yellow warning.
 */
@Component({
  selector: 'app-aycm-check-in',
  templateUrl: 'aycm-check-in.page.html',
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonText,
    IonSelect,
    IonSelectOption,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AycmCheckInPage implements OnInit, ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly checkInRepo = inject(AycmCheckInRepository);
  private readonly partnerRepo = inject(AycmPartnerRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly date = signal(today());
  readonly time = signal(nowLocalTime());
  readonly partnerId = signal<string | null>(null);
  readonly notes = signal('');
  readonly editingId = signal<string | null>(null);

  readonly livePartners = computed(() => this.partnerRepo.partners().filter((p) => !p.deleted));
  readonly hasNoPartners = computed(() => this.partnerRepo.loaded() && this.livePartners().length === 0);

  /** The at-most-one live rule covering the current partner/date/time, or null (gap → yellow, 0 Ft). */
  readonly matchedRule = computed(() => {
    const id = this.partnerId();
    if (!id) {
      return null;
    }
    return matchPriceRule(this.partnerRepo.rulesFor(id), this.date(), this.time());
  });

  readonly previewLabel = computed(() => {
    const rule = this.matchedRule();
    return rule ? displayLabel(rule) : '';
  });
  readonly previewListPrice = computed(() => this.matchedRule()?.listPriceHuf ?? 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.partnerRepo.loaded() ? Promise.resolve() : this.partnerRepo.load(),
      this.checkInRepo.loaded() ? Promise.resolve() : this.checkInRepo.load(),
    ]);
    const dateParam = this.route.snapshot.queryParamMap.get('date');
    await this.loadForDate(dateParam ?? this.resolveInitialDate());
  }

  ionViewWillEnter(): void {
    void this.ngOnInit();
  }

  private resolveInitialDate(): string {
    const todaysRow = this.checkInRepo.checkInForDate(today());
    return todaysRow ? todaysRow.checkInDate : today();
  }

  private async loadForDate(date: string): Promise<void> {
    this.date.set(date);
    const existing = this.checkInRepo.checkInForDate(date);
    if (existing) {
      this.editingId.set(existing.id);
      this.partnerId.set(existing.partnerId);
      this.time.set(existing.checkInTime);
      this.notes.set(existing.notes ?? '');
    } else {
      this.editingId.set(null);
      this.notes.set('');
      if (this.editingId() === null && this.partnerId() === null && this.livePartners().length === 1) {
        this.partnerId.set(this.livePartners()[0].id);
      }
    }
    await this.ensureRulesLoaded();
  }

  private async ensureRulesLoaded(): Promise<void> {
    const id = this.partnerId();
    if (id && this.partnerRepo.rulesFor(id).length === 0) {
      await this.partnerRepo.loadRules(id);
    }
  }

  async onDateChange(value: string): Promise<void> {
    if (value) {
      await this.loadForDate(value);
    }
  }

  async onPartnerChange(value: string): Promise<void> {
    this.partnerId.set(value);
    await this.ensureRulesLoaded();
  }

  now(): void {
    void this.loadForDate(today()).then(() => this.time.set(nowLocalTime()));
  }

  get isEdit(): boolean {
    return this.editingId() !== null;
  }

  get canSave(): boolean {
    return this.partnerId() !== null && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(this.time());
  }

  async save(): Promise<void> {
    const partnerId = this.partnerId();
    if (!partnerId || !this.canSave) {
      return;
    }
    // Guard against a stale editingId: if the target day already has a different live row, edit it.
    const existing = this.checkInRepo.checkInForDate(this.date());
    const targetId = this.editingId() ?? existing?.id;

    const rule = this.matchedRule();
    const partnerName = this.livePartners().find((p) => p.id === partnerId)?.name ?? '';
    const notes = this.notes().trim();
    await this.checkInRepo.save({
      id: targetId ?? undefined,
      checkInDate: this.date(),
      checkInTime: this.time(),
      partnerId,
      partnerName,
      ruleId: rule?.id ?? null,
      ruleLabel: rule ? displayLabel(rule) : '',
      listPriceHuf: rule?.listPriceHuf ?? 0,
      coPaymentHuf: rule?.coPaymentHuf ?? 0,
      visitValueHuf: rule?.listPriceHuf ?? 0,
      notes: notes.length > 0 ? notes : null,
    });
    await this.router.navigateByUrl(LIST_URL);
  }

  async delete(): Promise<void> {
    const id = this.editingId();
    if (id === null) {
      return;
    }
    const partnerName = this.livePartners().find((p) => p.id === this.partnerId())?.name ?? '';
    const alert = await this.alertController.create({
      header: this.translate.instant('AYCM.CHECK_IN.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('AYCM.CHECK_IN.DELETE_CONFIRM_MESSAGE', { date: this.date(), name: partnerName }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => void this.deleteAndBack(id),
        },
      ],
    });
    await alert.present();
  }

  private async deleteAndBack(id: string): Promise<void> {
    await this.checkInRepo.remove(id);
    await this.router.navigateByUrl(LIST_URL);
  }
}

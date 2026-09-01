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

import { AycmCheckIn } from '../../../api/model/aycmCheckIn';
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
  /** The live row currently being edited (its stored snapshot), or null for a fresh create. */
  readonly editingRow = signal<AycmCheckIn | null>(null);

  readonly livePartners = computed(() => this.partnerRepo.partners().filter((p) => !p.deleted));
  readonly hasNoPartners = computed(() => this.partnerRepo.loaded() && this.livePartners().length === 0);

  /** The currently selected partner is a live one (i.e. it appears in the picker). */
  readonly selectedPartnerLive = computed(() => this.livePartners().some((p) => p.id === this.partnerId()));

  /**
   * documentation/Subfeatures/AYCM Check-In.md: a Check-In whose partner was later deleted stays
   * readable / deletable and its notes editable, but partner + date + time are frozen and the stored
   * snapshot must survive untouched — no re-match against live-only data. True only while the stored
   * (deleted) partner is still selected; picking a live partner un-freezes and re-matches.
   */
  readonly snapshotFrozen = computed(() => {
    const row = this.editingRow();
    return row !== null && row.partnerId === this.partnerId() && !this.selectedPartnerLive();
  });

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
    // Reload unconditionally on every entry (Ionic keeps the page alive across tab switches, so
    // `ngOnInit` runs once): a partner / Check-In change from a background sync pull updates SQLite
    // but not the repository signals, and this screen must match against the current live rows.
    await Promise.all([this.partnerRepo.load(), this.checkInRepo.load()]);
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
      this.editingRow.set(existing);
      this.editingId.set(existing.id);
      this.partnerId.set(existing.partnerId);
      this.time.set(existing.checkInTime);
      this.notes.set(existing.notes ?? '');
    } else {
      this.editingRow.set(null);
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
    // Reload unconditionally (like the partner editor / list): a cached-but-stale rule list — e.g.
    // a price-rule change delivered by a background sync pull, which updates SQLite but not the
    // repository signal — would otherwise be matched against and produce a wrong 0 Ft snapshot.
    if (id && this.selectedPartnerLive()) {
      await this.partnerRepo.loadRules(id);
    }
  }

  async onDateChange(value: string): Promise<void> {
    // A frozen (deleted-partner) row's date is not editable — ignore stray change events.
    if (value && !this.snapshotFrozen()) {
      await this.loadForDate(value);
    }
  }

  async onPartnerChange(value: string): Promise<void> {
    this.partnerId.set(value);
    await this.ensureRulesLoaded();
  }

  now(): void {
    // Already editing today's row → just stamp the time; reloading would discard an in-progress
    // notes/partner edit. Only jump (and reload that day's row) when we're on a different date.
    if (this.date() === today()) {
      this.time.set(nowLocalTime());
      return;
    }
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

    // documentation/Subfeatures/AYCM Check-In.md: editing a Check-In whose partner was later deleted
    // may only touch `notes` — the historical snapshot (partnerName, rule, prices, date, time) is
    // preserved verbatim, never rebuilt from live-only data.
    const frozenRow = this.snapshotFrozen() ? this.editingRow() : null;
    if (frozenRow) {
      const frozenNotes = this.notes().trim();
      await this.checkInRepo.save({
        id: frozenRow.id,
        checkInDate: frozenRow.checkInDate,
        checkInTime: frozenRow.checkInTime,
        partnerId: frozenRow.partnerId,
        partnerName: frozenRow.partnerName,
        ruleId: frozenRow.ruleId ?? null,
        ruleLabel: frozenRow.ruleLabel,
        listPriceHuf: frozenRow.listPriceHuf,
        coPaymentHuf: frozenRow.coPaymentHuf,
        visitValueHuf: frozenRow.visitValueHuf,
        notes: frozenNotes.length > 0 ? frozenNotes : null,
      });
      await this.router.navigateByUrl(LIST_URL);
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

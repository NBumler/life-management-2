import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AycmPriceRule } from '../../../api/model/aycmPriceRule';
import { AycmPartnerNameConflictError, AycmPartnerRepository } from '../../../core/data/aycm-partner.repository';
import { displayLabel, minutesOfDay, rulesOverlap } from './aycm-price-rule';

const LIST_URL = '/tabs/menu/aycm/partners';

const DAY_KEYS = ['appliesMon', 'appliesTue', 'appliesWed', 'appliesThu', 'appliesFri', 'appliesSat', 'appliesSun'] as const;
type DayKey = (typeof DAY_KEYS)[number];

/**
 * documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — the partner create/edit form (route
 * param `id` is an existing partner's uuid or `new`). Name + notes on top; below, the partner's
 * price rules (add / edit / delete inline). A rule is a half-open [startTime, endTime) window on the
 * flagged weekdays; the "Nap vége" toggle forces endTime = 24:00. Overlap is checked client-side
 * (friendly message) before the save is enqueued; the server re-checks.
 */
@Component({
  selector: 'app-aycm-partner-edit',
  templateUrl: 'aycm-partner-edit.page.html',
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
    IonListHeader,
    IonItem,
    IonLabel,
    IonInput,
    IonNote,
    IonToggle,
    IonCheckbox,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AycmPartnerEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(AycmPartnerRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly dayKeys = DAY_KEYS;
  readonly partnerId = signal<string | null>(null);
  readonly nameError = signal<string | null>(null);
  readonly ruleError = signal<string | null>(null);
  readonly editingRuleId = signal<string | null | undefined>(undefined); // undefined = closed, null = new

  readonly partnerForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    notes: this.fb.nonNullable.control(''),
  });

  readonly ruleForm = this.fb.nonNullable.group({
    label: this.fb.nonNullable.control(''),
    appliesMon: this.fb.nonNullable.control(true),
    appliesTue: this.fb.nonNullable.control(true),
    appliesWed: this.fb.nonNullable.control(true),
    appliesThu: this.fb.nonNullable.control(true),
    appliesFri: this.fb.nonNullable.control(true),
    appliesSat: this.fb.nonNullable.control(false),
    appliesSun: this.fb.nonNullable.control(false),
    startTime: this.fb.nonNullable.control('08:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('12:00', [Validators.required]),
    endOfDay: this.fb.nonNullable.control(false),
    listPriceHuf: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    coPaymentHuf: this.fb.control<number | null>(0, [Validators.min(0)]),
  });

  readonly rules = computed(() =>
    [...this.repository.rulesFor(this.partnerId() ?? '')]
      .filter((r) => !r.deleted)
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || displayLabel(a).localeCompare(displayLabel(b))),
  );

  async ngOnInit(): Promise<void> {
    if (!this.repository.loaded()) {
      await this.repository.load();
    }
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.partners().find((p) => p.id === idParam && !p.deleted);
      if (existing === undefined) {
        await this.router.navigateByUrl(LIST_URL);
        return;
      }
      this.partnerId.set(idParam);
      this.partnerForm.reset({ name: existing.name, notes: existing.notes ?? '' });
      await this.repository.loadRules(idParam);
    }
  }

  get isEdit(): boolean {
    return this.partnerId() !== null;
  }

  ruleLabel(rule: AycmPriceRule): string {
    return displayLabel(rule);
  }

  async savePartner(): Promise<void> {
    this.nameError.set(null);
    if (this.partnerForm.invalid) {
      this.partnerForm.markAllAsTouched();
      return;
    }
    const value = this.partnerForm.getRawValue();
    const notes = value.notes.trim();
    try {
      const saved = await this.repository.savePartner({
        id: this.partnerId() ?? undefined,
        name: value.name,
        notes: notes.length > 0 ? notes : null,
      });
      if (!this.isEdit) {
        // Stay on the editor so the user can add price rules to the fresh partner.
        this.partnerId.set(saved.id);
        await this.router.navigate([LIST_URL, saved.id], { replaceUrl: true });
        return;
      }
      await this.router.navigateByUrl(LIST_URL);
    } catch (error) {
      if (error instanceof AycmPartnerNameConflictError) {
        this.nameError.set(this.translate.instant('AYCM.PARTNERS.NAME_TAKEN'));
        return;
      }
      throw error;
    }
  }

  async deletePartner(): Promise<void> {
    const id = this.partnerId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('AYCM.PARTNERS.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('AYCM.PARTNERS.DELETE_CONFIRM_MESSAGE', {
        name: this.partnerForm.getRawValue().name,
        count: this.rules().length,
      }),
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

  startNewRule(): void {
    this.ruleError.set(null);
    this.ruleForm.reset({
      label: '',
      appliesMon: true,
      appliesTue: true,
      appliesWed: true,
      appliesThu: true,
      appliesFri: true,
      appliesSat: false,
      appliesSun: false,
      startTime: '08:00',
      endTime: '12:00',
      endOfDay: false,
      listPriceHuf: null,
      coPaymentHuf: 0,
    });
    this.editingRuleId.set(null);
  }

  editRule(rule: AycmPriceRule): void {
    this.ruleError.set(null);
    this.ruleForm.reset({
      label: rule.label ?? '',
      appliesMon: rule.appliesMon,
      appliesTue: rule.appliesTue,
      appliesWed: rule.appliesWed,
      appliesThu: rule.appliesThu,
      appliesFri: rule.appliesFri,
      appliesSat: rule.appliesSat,
      appliesSun: rule.appliesSun,
      startTime: rule.startTime,
      endTime: rule.endTime === '24:00' ? '00:00' : rule.endTime,
      endOfDay: rule.endTime === '24:00',
      listPriceHuf: rule.listPriceHuf,
      coPaymentHuf: rule.coPaymentHuf,
    });
    this.editingRuleId.set(rule.id);
  }

  cancelRule(): void {
    this.editingRuleId.set(undefined);
    this.ruleError.set(null);
  }

  async saveRule(): Promise<void> {
    this.ruleError.set(null);
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return;
    }
    const v = this.ruleForm.getRawValue();
    const endTime = v.endOfDay ? '24:00' : v.endTime;
    const days = {} as Record<DayKey, boolean>;
    for (const k of DAY_KEYS) {
      days[k] = v[k];
    }

    if (!DAY_KEYS.some((k) => v[k])) {
      this.ruleError.set(this.translate.instant('AYCM.PARTNERS.RULE_ERROR_NO_DAY'));
      return;
    }
    const start = minutesOfDay(v.startTime);
    const end = minutesOfDay(endTime);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      this.ruleError.set(this.translate.instant('AYCM.PARTNERS.RULE_ERROR_TIME_ORDER'));
      return;
    }
    if (v.listPriceHuf === null || v.listPriceHuf < 0 || (v.coPaymentHuf ?? 0) < 0) {
      this.ruleError.set(this.translate.instant('AYCM.PARTNERS.RULE_ERROR_PRICE'));
      return;
    }
    const editingId = this.editingRuleId();
    const candidate = { ...days, startTime: v.startTime, endTime };
    const clash = this.rules().find((r) => r.id !== editingId && rulesOverlap(candidate, r));
    if (clash) {
      this.ruleError.set(
        this.translate.instant('AYCM.PARTNERS.RULE_ERROR_OVERLAP', { label: displayLabel(clash) }),
      );
      return;
    }

    await this.repository.saveRule({
      id: editingId ?? undefined,
      partnerId,
      label: v.label.trim().length > 0 ? v.label.trim() : null,
      appliesMon: v.appliesMon,
      appliesTue: v.appliesTue,
      appliesWed: v.appliesWed,
      appliesThu: v.appliesThu,
      appliesFri: v.appliesFri,
      appliesSat: v.appliesSat,
      appliesSun: v.appliesSun,
      startTime: v.startTime,
      endTime,
      listPriceHuf: v.listPriceHuf,
      coPaymentHuf: v.coPaymentHuf ?? 0,
    });
    this.editingRuleId.set(undefined);
  }

  async confirmDeleteRule(rule: AycmPriceRule): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('AYCM.PARTNERS.RULE_DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('AYCM.PARTNERS.RULE_DELETE_CONFIRM_MESSAGE', { label: displayLabel(rule) }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => void this.repository.deleteRule(rule.partnerId, rule.id),
        },
      ],
    });
    await alert.present();
  }

  private async deleteAndBack(id: string): Promise<void> {
    await this.repository.deletePartner(id);
    await this.router.navigateByUrl(LIST_URL);
  }
}

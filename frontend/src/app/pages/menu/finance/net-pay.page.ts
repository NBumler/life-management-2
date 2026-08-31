import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ProfileRepository } from '../../../core/data/profile.repository';
import { today } from '../../../shared/local-date';
import { computeNetPay } from '../../../shared/net-pay-calculator';

interface NetPayViewModel {
  computable: boolean;
  gross: number | null;
  tb: number | null;
  szja: number | null;
  net: number | null;
  under25ExemptionApplied: boolean;
}

/**
 * documentation/Subfeatures/Nettó fizetés kalkulátor.md — the read-only breakdown screen. Rows:
 * Bruttó (Profile value / "nincs megadva") / TB / SZJA (with an under-25 badge when the allowance
 * applies) / Nettó — each a number or `~` (only when gross is empty). Pure client, no gate.
 */
@Component({
  selector: 'app-net-pay',
  templateUrl: 'net-pay.page.html',
  styleUrl: 'net-pay.page.scss',
  imports: [
    RouterLink,
    DecimalPipe,
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
    IonNote,
    IonText,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetPayPage implements OnInit {
  private readonly profileRepository = inject(ProfileRepository);

  readonly vm = computed<NetPayViewModel>(() => {
    const profile = this.profileRepository.profile();
    const calc = computeNetPay(
      {
        grossMonthlySalaryHuf: profile?.grossMonthlySalaryHuf ?? null,
        birthDate: profile?.birthDate ?? null,
      },
      today(),
    );
    if (!calc.computable) {
      return { computable: false, gross: null, tb: null, szja: null, net: null, under25ExemptionApplied: false };
    }
    return {
      computable: true,
      gross: calc.gross,
      tb: calc.tb,
      szja: calc.szja,
      net: calc.net,
      under25ExemptionApplied: calc.under25ExemptionApplied,
    };
  });

  async ngOnInit(): Promise<void> {
    await this.profileRepository.load();
  }
}

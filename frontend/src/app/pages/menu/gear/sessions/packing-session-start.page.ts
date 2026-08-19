import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { PackingSessionRepository } from '../../../../core/data/packing-session.repository';
import { PackingTemplateRepository } from '../../../../core/data/packing-template.repository';

/** documentation/Subfeatures/Pakolás.md "Indítás": multi-select sablon(ok) (≥1, kötelező) + opcionális úticél. */
@Component({
  selector: 'app-packing-session-start',
  templateUrl: 'packing-session-start.page.html',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonIcon,
    IonButton,
    IonText,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackingSessionStartPage implements OnInit {
  private readonly templateRepository = inject(PackingTemplateRepository);
  private readonly sessionRepository = inject(PackingSessionRepository);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly templates = this.templateRepository.templates;
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly submitted = signal(false);
  readonly starting = signal(false);

  readonly form = this.fb.nonNullable.group({
    destination: this.fb.control<string | null>(null),
  });

  async ngOnInit(): Promise<void> {
    await this.templateRepository.load();
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggle(id: string): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async start(): Promise<void> {
    this.submitted.set(true);
    if (this.selectedIds().size === 0) {
      return;
    }
    this.starting.set(true);
    try {
      const destination = this.form.getRawValue().destination?.trim() || null;
      const saved = await this.sessionRepository.start(Array.from(this.selectedIds()), destination);
      await this.router.navigate(['/tabs/menu/gear/sessions', saved.id], { replaceUrl: true });
    } finally {
      this.starting.set(false);
    }
  }
}

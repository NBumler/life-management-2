import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { IonChip, IonIcon, IonInput, IonItem, IonLabel, IonList } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { compareRank, matchesSearch } from '../text-search';

const MAX_SUGGESTIONS = 8;
const MAX_QUICK_PICKS = 6;

/**
 * backlog/069 — reusable "climbing partners" combobox: chips for the picked names, a text input that
 * both filters the caller-supplied `suggestions` (previous partners, [[Szöveges keresés]] folding)
 * **and** lets you add a brand-new name ("+ Hozzáadás: …"). No repository injected and no `Partner`
 * entity — the caller derives `suggestions` from the local store and owns the resulting string list.
 */
@Component({
  selector: 'app-partner-combobox',
  templateUrl: 'partner-combobox.component.html',
  styleUrl: 'partner-combobox.component.css',
  imports: [IonChip, IonIcon, IonInput, IonItem, IonLabel, IonList, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerComboboxComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() suggestions: readonly string[] = [];

  @Input()
  set partners(value: readonly string[] | null | undefined) {
    this.selected.set([...(value ?? [])]);
  }

  @Output() readonly partnersChange = new EventEmitter<string[]>();

  readonly selected = signal<string[]>([]);
  readonly query = signal('');

  /** Suggestions not yet picked, matching the current query, best match first — capped for the dropdown. */
  readonly filteredSuggestions = computed(() => {
    const q = this.query();
    const chosen = new Set(this.selected().map((name) => name.toLowerCase()));
    return this.suggestions
      .filter((name) => !chosen.has(name.toLowerCase()) && matchesSearch(q, name))
      .sort((a, b) => compareRank(q, a, b) || a.localeCompare(b))
      .slice(0, MAX_SUGGESTIONS);
  });

  /** First few not-yet-picked suggestions, shown as tap-to-add chips while the input is empty. */
  readonly quickPicks = computed(() => {
    const chosen = new Set(this.selected().map((name) => name.toLowerCase()));
    return this.suggestions.filter((name) => !chosen.has(name.toLowerCase())).slice(0, MAX_QUICK_PICKS);
  });

  /** The trimmed query as an addable new value — null when blank or it already exists (case-insensitive). */
  readonly addableNew = computed(() => {
    const raw = this.query().trim();
    if (raw === '') {
      return null;
    }
    const lower = raw.toLowerCase();
    const exists =
      this.selected().some((name) => name.toLowerCase() === lower) ||
      this.suggestions.some((name) => name.toLowerCase() === lower);
    return exists ? null : raw;
  });

  onQuery(value: string | null | undefined): void {
    this.query.set(value ?? '');
  }

  add(name: string): void {
    const trimmed = name.trim();
    this.query.set('');
    if (trimmed === '') {
      return;
    }
    const lower = trimmed.toLowerCase();
    if (this.selected().some((existing) => existing.toLowerCase() === lower)) {
      return;
    }
    this.selected.update((list) => [...list, trimmed]);
    this.partnersChange.emit([...this.selected()]);
  }

  /** Enter in the input: a matching suggestion wins (the user is filtering toward it); with no match the typed text is added as a new name. */
  commitTyped(): void {
    const raw = this.query().trim();
    if (raw === '') {
      return;
    }
    this.add(this.filteredSuggestions()[0] ?? raw);
  }

  remove(name: string): void {
    this.selected.update((list) => list.filter((existing) => existing !== name));
    this.partnersChange.emit([...this.selected()]);
  }
}

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FoodRepository } from '../../../core/data/food.repository';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { matchesSearch } from '../../../shared/text-search';
import { navigateFoodSection } from '../food-sections';
import { CatalogRatioRow, RatioMetric, SortDirection, rankFoods, rankRecipes } from './catalog-ratios';

type CatalogKind = 'FOOD' | 'RECIPE';

/**
 * documentation/Subfeatures/Kaja statisztika.md — "Katalógus arányok", the only statisztika-típus
 * built this round (the architecture note's `statType` discriminator exists as a type/return shape
 * ready to grow, not a rendered single-option control — see the slice plan). Mirrors the other
 * food-tab pages' segment/search shape (recipe-list.page.ts).
 */
@Component({
  selector: 'app-kaja-stats',
  templateUrl: 'kaja-stats.page.html',
  styleUrls: ['kaja-stats.page.scss'],
  imports: [IonHeader, IonToolbar, IonSegment, IonSegmentButton, IonLabel, IonContent, IonSearchbar, IonList, IonItem, IonButton, IonIcon, TranslatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KajaStatsPage implements OnInit {
  private readonly segment = viewChild.required<IonSegment>('sectionSegment');

  private readonly foodRepository = inject(FoodRepository);
  private readonly recipeRepository = inject(RecipeRepository);
  private readonly router = inject(Router);

  readonly catalogKind = signal<CatalogKind>('FOOD');
  readonly metric = signal<RatioMetric>('PROTEIN_PER_KCAL');
  readonly direction = signal<SortDirection>('DESC');
  readonly query = signal('');

  /**
   * documentation/Subfeatures/Kaja statisztika.md "Rendezés és keresés": the ranking is
   * query-independent — search only narrows what's shown, it never re-ranks. Kept as its own computed
   * so a keystroke re-runs just the substring filter below, not the whole rank pipeline (which for
   * recipes is O(recipes × ingredients)).
   */
  readonly ranking = computed<CatalogRatioRow[]>(() =>
    this.catalogKind() === 'FOOD'
      ? rankFoods(this.foodRepository.items(), this.metric(), this.direction())
      : rankRecipes(this.recipeRepository.items(), this.foodRepository.items(), this.metric(), this.direction()),
  );

  readonly rows = computed<CatalogRatioRow[]>(() => {
    const query = this.query();
    return query === '' ? this.ranking() : this.ranking().filter((row) => matchesSearch(query, row.name));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.foodRepository.load(), this.recipeRepository.load()]);
  }

  /** documentation/Features/Kaja.md: no full segmented hub yet — see recipe-list.page.ts's ionViewWillEnter comment for why this re-assertion is needed on every (re-)entry. */
  ionViewWillEnter(): void {
    this.segment().value = 'stats';
  }

  switchSection(section: string): void {
    navigateFoodSection(this.router, section, 'stats');
  }

  toggleDirection(): void {
    this.direction.set(this.direction() === 'DESC' ? 'ASC' : 'DESC');
  }

  open(row: CatalogRatioRow): void {
    const segment = this.catalogKind() === 'FOOD' ? 'catalog' : 'recipe';
    void this.router.navigate(['/tabs/food', segment, row.id]);
  }
}

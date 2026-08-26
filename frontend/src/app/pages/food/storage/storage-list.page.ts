import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { StoredFood } from '../../../api/model/storedFood';
import { FoodRepository } from '../../../core/data/food.repository';
import { StoredFoodRepository } from '../../../core/data/stored-food.repository';
import { today } from '../../../shared/local-date';
import { matchesSearch } from '../../../shared/text-search';
import { afterOpeningDuration, computeOpenedExpiry } from './shelf-life';

type LocationFilter = 'ALL' | StoredFood.StorageLocationEnum;

interface StorageRow {
  item: StoredFood;
  food: Food;
}

/**
 * documentation/Subfeatures/Élelmiszer tárolás.md — készlet lista: hely szerinti szűrés, lejárat
 * szerinti rendezés (a repository már így adja vissza), romlott/felbontott jelzés, "Felbontva" akció.
 */
@Component({
  selector: 'app-storage-list',
  templateUrl: 'storage-list.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonBadge,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageListPage implements OnInit, ViewWillEnter {
  private readonly segment = viewChild.required<IonSegment>('sectionSegment');

  private readonly repository = inject(StoredFoodRepository);
  private readonly foodRepository = inject(FoodRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly StorageLocationEnum = StoredFood.StorageLocationEnum;
  readonly query = signal('');
  readonly locationFilter = signal<LocationFilter>('ALL');

  readonly rows = computed<StorageRow[]>(() => {
    const query = this.query();
    const location = this.locationFilter();
    const foods = this.foodRepository.items();
    return this.repository
      .items()
      .filter((item) => location === 'ALL' || item.storageLocation === location)
      .map((item) => ({ item, food: foods.find((food) => food.id === item.foodId) }))
      .filter((row): row is StorageRow => row.food !== undefined)
      .filter((row) => matchesSearch(query, row.food.name) || matchesSearch(query, row.food.brand ?? ''));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.foodRepository.load()]);
  }

  /**
   * Ionic's router outlet keeps this page's DOM (and its ion-segment) alive across visits instead
   * of recreating it, so the segment's `value="storage"` template attribute only applies once, on
   * first creation — re-entering after clicking away to Katalógus leaves it showing "Katalógus" as
   * checked. ionViewWillEnter fires on every (re-)entry, unlike ngOnInit, so re-assert it here.
   */
  ionViewWillEnter(): void {
    this.segment().value = 'storage';
  }

  isSpoiled(item: StoredFood): boolean {
    return item.expiresOn < today();
  }

  subtitle(row: StorageRow): string {
    return `${row.item.quantityAmount}${row.item.quantityUnit} · ${this.translate.instant('FOOD.STORAGE.EXPIRES_ON_SHORT', { date: row.item.expiresOn })}`;
  }

  /** documentation/Subfeatures/Élelmiszer tárolás.md "Felbontás": new expiry = min(today + after-opening duration, previous expiry). */
  async open(row: StorageRow): Promise<void> {
    const duration = afterOpeningDuration(row.food);
    const expiresOn = computeOpenedExpiry(row.item.expiresOn, today(), duration);
    await this.repository.save({ ...row.item, opened: true, openedAt: new Date().toISOString(), expiresOn });
  }

  edit(row: StorageRow): void {
    this.router.navigate(['/tabs/food/storage', row.item.id]);
  }

  addItem(): void {
    this.router.navigate(['/tabs/food/storage', 'new']);
  }

  /** documentation/Features/Kaja.md: no full segmented hub yet (see app.routes.ts) — this is the lightweight stand-in until Étkezés/Recept/Stat exist too. */
  switchSection(section: string): void {
    if (section === 'catalog') {
      void this.router.navigateByUrl('/tabs/food/catalog');
    }
  }

  async delete(row: StorageRow): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.STORAGE.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.STORAGE.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.repository.remove(row.item.id) },
      ],
    });
    await alert.present();
  }
}

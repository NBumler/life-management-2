import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
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
  ToastController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { FoodRepository } from '../../../core/data/food.repository';
import { compareRank, matchesSearch } from '../../../shared/text-search';
import { navigateFoodSection } from '../food-sections';
import { FoodBarcodeScannerService } from './food-barcode-scanner.service';
import { FoodPrefillService } from './food-prefill.service';
import { OpenFoodFactsService } from './open-food-facts.service';

/**
 * documentation/Subfeatures/Élelmiszerek.md: shared/global catalog list with search and soft
 * delete. Create/edit is a separate route (food-edit.page.ts) — unlike GearItem's inline-edit
 * pattern, Food's ~30-field form doesn't fit inside a list row.
 */
@Component({
  selector: 'app-food-list',
  templateUrl: 'food-list.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodListPage implements OnInit, ViewWillEnter {
  private readonly segment = viewChild.required<IonSegment>('sectionSegment');

  private readonly repository = inject(FoodRepository);
  private readonly alertController = inject(AlertController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly barcodeScanner = inject(FoodBarcodeScannerService);
  private readonly openFoodFacts = inject(OpenFoodFactsService);
  private readonly prefillService = inject(FoodPrefillService);

  readonly query = signal('');

  readonly filteredItems = computed(() => {
    const query = this.query();
    return this.repository
      .items()
      .filter((item) => matchesSearch(query, item.name))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  /**
   * Ionic's router outlet keeps this page's DOM (and its ion-segment) alive across visits instead
   * of recreating it, so the segment's `value="catalog"` template attribute only applies once, on
   * first creation — re-entering after clicking away to Tárolás leaves it showing "Tárolás" as
   * checked. ionViewWillEnter fires on every (re-)entry, unlike ngOnInit, so re-assert it here.
   */
  ionViewWillEnter(): void {
    this.segment().value = 'catalog';
  }

  async delete(item: Food): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.CATALOG.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE', { name: item.name }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.repository.remove(item.id) },
      ],
    });
    await alert.present();
  }

  edit(item: Food): void {
    void this.router.navigate(['/tabs/food/catalog', item.id]);
  }

  subtitle(item: Food): string {
    return [item.brand, item.store].filter((value): value is string => !!value).join(' · ');
  }

  /** documentation/Subfeatures/Élelmiszer hozzáadása.md: chooser for the three add channels. */
  async addFood(): Promise<void> {
    const sheet = await this.actionSheetController.create({
      header: this.translate.instant('FOOD.CATALOG.ADD'),
      buttons: [
        { text: this.translate.instant('FOOD.CATALOG.ADD_MANUAL'), handler: () => void this.router.navigate(['/tabs/food/catalog', 'new']) },
        { text: this.translate.instant('FOOD.CATALOG.ADD_BARCODE'), handler: () => void this.scanBarcode() },
        {
          text: this.translate.instant('FOOD.CATALOG.ADD_IMPORT'),
          handler: () => void this.router.navigateByUrl('/tabs/food/catalog/import'),
        },
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /** documentation/Features/Kaja.md: no full segmented hub yet (see app.routes.ts) — this is the lightweight stand-in until Stat exists too. */
  switchSection(section: string): void {
    navigateFoodSection(this.router, section, 'catalog');
  }

  /** documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md "Scan & Pre-fill". */
  async scanBarcode(): Promise<void> {
    const barcode = await this.barcodeScanner.scan();
    if (barcode === null) {
      return;
    }
    const mapped = await this.openFoodFacts.lookup(barcode);
    if (mapped === null) {
      this.prefillService.set({ barcode });
      const toast = await this.toastController.create({
        message: this.translate.instant('FOOD.FORM.BARCODE_SYNC_NO_HIT'),
        duration: 3000,
        color: 'warning',
      });
      await toast.present();
    } else {
      this.prefillService.set({ barcode, ...mapped });
    }
    await this.router.navigate(['/tabs/food/catalog', 'new']);
  }
}

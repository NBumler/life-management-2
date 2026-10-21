import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, output, signal } from '@angular/core';
import { AlertController, IonButton, IonIcon, IonInput } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { HikeRoute } from '../../../api/model/hikeRoute';
import { LanguageService } from '../../../core/config/language.service';
import { HikeNavigationService, hikeActiveElapsedMs } from '../../../core/data/hike-navigation.service';
import { TurnDirection } from '../../../core/geo/turn-instructions';
import { formatElapsed } from '../../workout/climbing/naplo/climbing-live-controller';
import { dateText, distanceText, durationText, elevationText } from './hike-text';

/** backlog/106 — a következő kanyar nyila: egy felfelé mutató nyíl, a kanyar irányába forgatva (fok, óramutató szerint). */
export const TURN_ARROW_ROTATION: Readonly<Record<TurnDirection, number>> = {
	SLIGHT_LEFT: -45,
	LEFT: -90,
	SHARP_LEFT: -135,
	SLIGHT_RIGHT: 45,
	RIGHT: 90,
	SHARP_RIGHT: 135,
	U_TURN: 180,
};

/** A kanyarig hátralévő táv ettől km-ben, alatta egész méterben. */
const TURN_DISTANCE_KM_FROM_METERS = 1000;

/**
 * backlog/106 — a futó túra-navigáció / -felvétel lebegő panelje a térkép alján (a mód-sáv és a tervező
 * kártya helyén): a következő kanyar nyíllal és távval, a letérés, a gyenge jel, az eltelt idő, a megtett
 * és a hátralévő táv, valamint a Szünet / Folytatás / Befejezés. Befejezés után ugyanitt az összegzés: a
 * felvétel neve, mentés az Útvonalaim közé vagy elvetés. Az állapot a `HikeNavigationService`-é.
 */
@Component({
	selector: 'app-hike-navigation-panel',
	templateUrl: 'hike-navigation-panel.component.html',
	styleUrl: 'hike-navigation-panel.component.scss',
	imports: [IonButton, IonIcon, IonInput, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HikeNavigationPanelComponent implements OnDestroy {
	protected readonly navigation = inject(HikeNavigationService);
	private readonly language = inject(LanguageService);
	private readonly alertController = inject(AlertController);
	private readonly translate = inject(TranslateService);

	/** A térkép követi-e a helyzetet; ha a felhasználó elhúzta, a panel „Követés” gombot mutat. */
	readonly following = input.required<boolean>();
	readonly recenter = output<void>();
	/** A vészhelyzet-lap (koordináta, „112 hívása”) — a page nyitja. */
	readonly sos = output<void>();
	readonly saved = output<HikeRoute>();

	protected readonly durationText = durationText;
	protected readonly arrowRotation = TURN_ARROW_ROTATION;
	protected readonly busy = signal(false);
	protected readonly name = signal('');
	private readonly nowMs = signal(Date.now());
	private readonly timer = setInterval(() => this.nowMs.set(Date.now()), 1000);

	protected readonly located = computed(() => this.navigation.progress()?.located ?? false);
	protected readonly elapsed = computed(() => {
		const draft = this.navigation.draft();
		return draft ? formatElapsed(hikeActiveElapsedMs(draft, this.nowMs())) : '';
	});
	/** Befejezés után: az összegzés (az idő ekkor már rögzített, ezért nem a percenkénti óra számolja). */
	protected readonly summary = computed(() => (this.navigation.finished() ? this.navigation.summary() : null));

	constructor() {
		effect(() => {
			const summary = this.summary();
			if (summary !== null && this.name() === '') {
				this.name.set(this.defaultName(summary.plannedName, summary.startedAtMs));
			}
		});
	}

	ngOnDestroy(): void {
		clearInterval(this.timer);
	}

	protected distance(meters: number | null | undefined): string {
		return distanceText(meters, this.language.activeLanguage());
	}

	protected turnDistance(meters: number): string {
		return meters >= TURN_DISTANCE_KM_FROM_METERS ? this.distance(meters) : elevationText(meters, this.language.activeLanguage());
	}

	protected async pause(): Promise<void> {
		await this.run(() => this.navigation.pause());
	}

	protected async resume(): Promise<void> {
		await this.run(() => this.navigation.resume());
	}

	protected async finish(): Promise<void> {
		const alert = await this.alertController.create({
			header: this.translate.instant('TURA.NAVIGATION.FINISH_CONFIRM_TITLE'),
			message: this.translate.instant('TURA.NAVIGATION.FINISH_CONFIRM_MESSAGE'),
			buttons: [
				{ text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
				{ text: this.translate.instant('TURA.NAVIGATION.FINISH'), handler: () => void this.run(() => this.navigation.finish()) },
			],
		});
		await alert.present();
	}

	protected async save(): Promise<void> {
		const name = this.name().trim();
		if (name === '') {
			return;
		}
		await this.run(async () => {
			const saved = await this.navigation.save(name);
			this.name.set('');
			if (saved !== null) {
				this.saved.emit(saved);
			}
		});
	}

	protected async discard(): Promise<void> {
		const alert = await this.alertController.create({
			header: this.translate.instant('TURA.NAVIGATION.DISCARD_CONFIRM_TITLE'),
			message: this.translate.instant('TURA.NAVIGATION.DISCARD_CONFIRM_MESSAGE'),
			buttons: [
				{ text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
				{ text: this.translate.instant('TURA.NAVIGATION.DISCARD'), role: 'destructive', handler: () => void this.close() },
			],
		});
		await alert.present();
	}

	/** Nincs mit menteni (kevesebb mint két pont), vagy elvetve. */
	protected async close(): Promise<void> {
		await this.run(() => this.navigation.clear());
		this.name.set('');
	}

	/** A tervezett útvonal neve, vagy „Túra”, és a nap: „Pilis kör – 2026. okt. 21.”. */
	private defaultName(plannedName: string | null, startedAtMs: number): string {
		const date = dateText(new Date(startedAtMs).toISOString(), this.language.activeLanguage());
		return `${plannedName ?? this.translate.instant('TURA.NAVIGATION.HIKE')} – ${date}`;
	}

	private async run(action: () => Promise<void>): Promise<void> {
		if (this.busy()) {
			return;
		}
		this.busy.set(true);
		try {
			await action();
		} finally {
			this.busy.set(false);
		}
	}
}

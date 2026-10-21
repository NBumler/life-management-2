import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ActiveLanguage, LanguageService } from '../../../core/config/language.service';
import { Hemispheres, formatDecimalCoordinates, formatDmsCoordinates } from '../../../core/geo/coordinate-format';
import { LocationTrackingService, TrackingFix } from '../../../core/geo/location-tracking.service';
import { TranslatedText } from './hike-text';

const HEMISPHERES: Readonly<Record<ActiveLanguage, Hemispheres>> = {
	hu: { north: 'É', south: 'D', east: 'K', west: 'Ny' },
	en: { north: 'N', south: 'S', east: 'E', west: 'W' },
};

type LocateState = 'locating' | 'denied' | 'not-found' | 'done';

/**
 * backlog/106 — vészhelyzet: az aktuális helyzet bemondható alakban (tizedes és fok-perc-másodperc),
 * a pontossága és a kora, valamint a „112 hívása” (`tel:112` — a tárcsázó nyílik meg a számmal; a
 * segélyhívás mobilhálózaton internet nélkül is megy). Teljesen eszközön, backend nélkül.
 *
 * Futó GPS-munkamenet (túra-navigáció, élő bicikli-edzés) alatt annak utolsó elfogadott pontja a helyzet,
 * és magától frissül; különben egyszeri helymeghatározás, kézi frissítéssel (mint a „Saját helyzetem”).
 */
@Component({
	selector: 'app-hike-sos',
	templateUrl: 'hike-sos.component.html',
	styleUrl: 'hike-sos.component.scss',
	imports: [IonButton, IonIcon, IonSpinner, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HikeSosComponent implements OnInit, OnDestroy {
	private readonly location = inject(LocationTrackingService);
	private readonly language = inject(LanguageService);
	private readonly translate = inject(TranslateService);

	protected readonly tracking = this.location.tracking;
	protected readonly state = signal<LocateState>('done');
	private readonly ownFix = signal<TrackingFix | null>(null);
	private readonly nowMs = signal(Date.now());
	private readonly timer = setInterval(() => this.nowMs.set(Date.now()), 1000);
	private abort: AbortController | null = null;

	protected readonly fix = computed(() => (this.tracking() ? this.location.lastFix() : this.ownFix()));
	protected readonly decimal = computed(() => {
		const fix = this.fix();
		return fix ? formatDecimalCoordinates(fix.lat, fix.lon) : '';
	});
	protected readonly dms = computed(() => {
		const fix = this.fix();
		return fix ? formatDmsCoordinates(fix.lat, fix.lon, HEMISPHERES[this.language.activeLanguage()]) : '';
	});
	protected readonly accuracyMeters = computed(() => Math.round(this.fix()?.accuracyMeters ?? 0));
	protected readonly age = computed<TranslatedText | null>(() => {
		const fix = this.fix();
		return fix ? fixAgeText(this.nowMs() - fix.timeMs) : null;
	});

	ngOnInit(): void {
		if (!this.tracking()) {
			void this.locate();
		}
	}

	ngOnDestroy(): void {
		clearInterval(this.timer);
		this.abort?.abort();
	}

	protected async locate(): Promise<void> {
		if (this.abort !== null || this.tracking()) {
			return;
		}
		this.abort = new AbortController();
		this.state.set('locating');
		try {
			const fix = await this.location.locateOnce(
				this.translate.instant('TURA.MY_LOCATION.NOTIFICATION_TITLE'),
				this.translate.instant('TURA.MY_LOCATION.NOTIFICATION_BODY'),
				undefined,
				this.abort.signal,
			);
			if (fix === 'denied' || fix === null) {
				// egy korábbi pont megmarad: a korával együtt még mindig a legjobb, amit be lehet mondani
				this.state.set(this.ownFix() !== null ? 'done' : fix === 'denied' ? 'denied' : 'not-found');
				return;
			}
			this.ownFix.set(fix);
			this.state.set('done');
		} finally {
			this.abort = null;
		}
	}
}

/** A pont kora: egy percig másodpercben, utána percben. */
export function fixAgeText(ageMs: number): TranslatedText {
	const seconds = Math.max(0, Math.round(ageMs / 1000));
	return seconds < 60 ? { key: 'TURA.SOS.AGE_SECONDS', params: { seconds } } : { key: 'TURA.SOS.AGE_MINUTES', params: { minutes: Math.floor(seconds / 60) } };
}

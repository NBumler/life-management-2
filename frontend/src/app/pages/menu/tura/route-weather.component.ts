import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { IonButton, IonChip, IonIcon, IonLabel, IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../../core/config/language.service';
import { WeatherHour, weatherCondition } from '../../../core/weather/weather-forecast';
import { ForecastResult, WeatherForecastService, gridKey } from '../../../core/weather/weather-forecast.service';
import { CONDITION_ICONS, dayHours, dayLabel, firstCurrentDay, forecastAgeText, localClock } from './weather-text';

const NUMBER_LOCALES = { hu: 'hu-HU', en: 'en-US' } as const;

/**
 * backlog/109 — az útvonal-kártya „Időjárás” szakasza: a kezdőpont (többnapos útnál a választott nap
 * kezdőpontja) előrejelzése a következő napokra, a kiválasztott nap órás sávjával. Internet nélkül az
 * utolsó ismert előrejelzés a korával; ha ilyen sincs, egy rövid magyarázat. A forrás (Open-Meteo, CC BY 4.0)
 * mindig látszik.
 */
@Component({
	selector: 'app-route-weather',
	templateUrl: 'route-weather.component.html',
	styleUrl: 'route-weather.component.scss',
	imports: [IonButton, IonChip, IonIcon, IonLabel, IonSpinner, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteWeatherComponent {
	private readonly weather = inject(WeatherForecastService);
	private readonly language = inject(LanguageService);

	/** A napok kezdőpontjai `[lon, lat]`-ként (`dayStartPoints`); egynapos útnál egy pont. */
	readonly places = input.required<readonly (readonly number[])[]>();

	protected readonly selectedPlace = signal(0);
	protected readonly selectedDay = signal<number | null>(null);
	protected readonly result = signal<ForecastResult | null>(null);
	protected readonly loading = signal(false);
	private readonly nowMs = signal(Date.now());
	private loadedKey: string | null = null;
	private requestId = 0;

	private readonly place = computed(() => {
		const places = this.places();
		return places[Math.min(this.selectedPlace(), places.length - 1)] ?? null;
	});

	protected readonly forecast = computed(() => this.result()?.forecast ?? null);
	/** Az elmúlt napok nélkül; a lap az első még tartó nappal nyílik. */
	protected readonly days = computed(() => {
		const forecast = this.forecast();
		if (!forecast) {
			return [];
		}
		const first = firstCurrentDay(forecast, this.nowMs());
		return forecast.days.slice(first).map((day, position) => ({ day, index: first + position }));
	});
	protected readonly dayIndex = computed(() => this.selectedDay() ?? this.days()[0]?.index ?? 0);
	protected readonly selectedDayValues = computed(() => this.forecast()?.days[this.dayIndex()] ?? null);
	protected readonly hours = computed(() => {
		const forecast = this.forecast();
		return forecast ? dayHours(forecast, this.dayIndex(), this.nowMs()) : [];
	});
	protected readonly age = computed(() => {
		const result = this.result();
		return result?.stale ? forecastAgeText(this.nowMs() - result.forecast.fetchedAtMs) : null;
	});

	constructor() {
		effect(() => {
			const place = this.place();
			untracked(() => {
				if (!place) {
					this.loadedKey = null;
					this.result.set(null);
					return;
				}
				const key = gridKey(place[1], place[0]);
				if (key !== this.loadedKey) {
					this.loadedKey = key;
					void this.load(place, false);
				}
			});
		});
	}

	protected selectPlace(index: number): void {
		this.selectedPlace.set(index);
	}

	protected refresh(): void {
		const place = this.place();
		if (place) {
			void this.load(place, true);
		}
	}

	private async load(place: readonly number[], force: boolean): Promise<void> {
		const requestId = ++this.requestId;
		this.loading.set(true);
		if (!force) {
			this.result.set(null);
			this.selectedDay.set(null);
		}
		const result = await this.weather.forecastFor(place[1], place[0], { force });
		if (requestId !== this.requestId) {
			return;
		}
		this.nowMs.set(Date.now());
		this.result.set(result ?? (force ? this.result() : null));
		this.loading.set(false);
	}

	protected icon(code: number | null): string {
		const condition = weatherCondition(code);
		return condition ? CONDITION_ICONS[condition] : 'cloud-outline';
	}

	protected conditionKey(code: number | null): string {
		return `TURA.WEATHER.CONDITION_${weatherCondition(code) ?? 'UNKNOWN'}`;
	}

	protected dayName(dateMs: number, position: number): string | null {
		return position === 0 && this.isToday(dateMs) ? null : dayLabel(dateMs, this.forecast()?.utcOffsetSeconds ?? 0, this.language.activeLanguage());
	}

	protected clock(ms: number | null): string {
		return ms === null ? '~' : localClock(ms, this.forecast()?.utcOffsetSeconds ?? 0);
	}

	protected degrees(value: number | null): string {
		return value === null ? '~' : `${Math.round(value)}°`;
	}

	protected percent(value: number | null): string {
		return value === null ? '~' : `${Math.round(value)}%`;
	}

	protected millimetres(value: number | null): string {
		return value === null ? '~' : `${new Intl.NumberFormat(NUMBER_LOCALES[this.language.activeLanguage()], { maximumFractionDigits: 1 }).format(value)} mm`;
	}

	protected kmh(value: number | null): string {
		return value === null ? '~' : `${Math.round(value)} km/h`;
	}

	protected trackHour(hour: WeatherHour): number {
		return hour.timeMs;
	}

	private isToday(dateMs: number): boolean {
		const now = this.nowMs();
		return dateMs <= now && now < dateMs + 24 * 60 * 60_000;
	}
}

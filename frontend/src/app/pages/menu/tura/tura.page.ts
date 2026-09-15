import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	computed,
	effect,
	inject,
	signal,
	viewChild,
} from '@angular/core';
import {
	AlertController,
	IonBackButton,
	IonBadge,
	IonButton,
	IonButtons,
	IonContent,
	IonFooter,
	IonHeader,
	IonIcon,
	IonInput,
	IonItem,
	IonLabel,
	IonList,
	IonModal,
	IonSelect,
	IonSelectOption,
	IonSpinner,
	IonTitle,
	IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import maplibregl from 'maplibre-gl';

import { HikeRoute } from '../../../api/model/hikeRoute';
import { HikeRouteDay } from '../../../api/model/hikeRouteDay';
import { RouteMetrics } from '../../../api/model/routeMetrics';
import { Bbox, TrailSegmentRepository } from '../../../core/data/trail-segment.repository';
import { HikeRouteRepository } from '../../../core/data/hike-route.repository';
import { RouteMetricsRepository } from '../../../core/data/route-metrics.repository';
import { RouteSuggestionRepository } from '../../../core/data/route-suggestion.repository';
import { elevationProfilePolylinePoints } from './elevation-profile-svg';
import { draftRouteToFeatureCollection, draftWaypointsToFeatureCollection, hikeRoutesToFeatureCollection } from './hike-routes-geojson';
import { trailSegmentSymbolColor } from './trail-segment-symbol-color';
import { trailSegmentsToFeatureCollection } from './trail-segments-geojson';

/** backlog/tura-utvonaltervezo/103-... 2.3 fázis — mennyit várunk az utolsó waypoint-változás után, mielőtt a metrikát újraszámoltatjuk. */
const METRICS_DEBOUNCE_MS = 500;
const PROFILE_CHART_WIDTH = 300;
const PROFILE_CHART_HEIGHT = 60;

const TRAIL_SEGMENTS_SOURCE_ID = 'trail-segments';
const TRAIL_SEGMENTS_LAYER_ID = 'trail-segments-layer';
const HIKE_ROUTES_SOURCE_ID = 'hike-routes';
const HIKE_ROUTES_LAYER_ID = 'hike-routes-layer';
const HIKE_ROUTE_DRAFT_SOURCE_ID = 'hike-route-draft';
const HIKE_ROUTE_DRAFT_LAYER_ID = 'hike-route-draft-layer';
const HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID = 'hike-route-draft-points';
const HIKE_ROUTE_DRAFT_POINTS_LAYER_ID = 'hike-route-draft-points-layer';
const AUTO_ROUTE_START_SOURCE_ID = 'hike-route-auto-start';
const AUTO_ROUTE_START_LAYER_ID = 'hike-route-auto-start-layer';

/** backlog/tura-utvonaltervezo/103-... 2.2 fázis — a rajzolás-térkép aktuális interakciós módja. */
type Mode = 'none' | 'manual' | 'auto';

// backlog/tura-utvonaltervezo/103-... 1. fázis: MapLibre GL JS + nyers OSM raster csempe mint
// alaptérkép (nem saját vektor-csempe szolgáltatás — ld. a ticket "térkép-alap technológia" nyitott
// kérdését). Egyszemélyes, személyes-célú használatra ez belefér az OSM tile usage policy-jába;
// nagyobb léptékű/publikált verzióhoz saját csempe-hosting kellene.
const BASE_STYLE: maplibregl.StyleSpecification = {
	version: 8,
	sources: {
		osm: {
			type: 'raster',
			tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
			tileSize: 256,
			attribution: '© OpenStreetMap contributors',
		},
	},
	layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// Magyarország nagyjábóli középpontja/zoomja (backlog/tura-utvonaltervezo/104-... — induláskor csak
// magyar adat).
const HUNGARY_CENTER: [number, number] = [19.5, 47.1];
const HUNGARY_ZOOM = 7;
const COUNTRY_CODE = 'HU';

/**
 * documentation/Architektúra/Frontend.md route-térkép (bővítve) — Menü → Túra.
 * backlog/tura-utvonaltervezo/103-... 1. fázis: alaptérkép + turistajelzés-réteg.
 * backlog/tura-utvonaltervezo/103-... 2.1 fázis: kézi útvonal-rajzolás + mentett útvonalak listája.
 */
@Component({
	selector: 'app-tura',
	templateUrl: 'tura.page.html',
	styleUrl: 'tura.page.scss',
	imports: [
		IonHeader,
		IonToolbar,
		IonTitle,
		IonButtons,
		IonBackButton,
		IonBadge,
		IonButton,
		IonIcon,
		IonInput,
		IonList,
		IonItem,
		IonLabel,
		IonModal,
		IonSelect,
		IonSelectOption,
		IonContent,
		IonFooter,
		IonSpinner,
		TranslatePipe,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuraPage implements AfterViewInit, OnDestroy {
	private readonly trailSegments = inject(TrailSegmentRepository);
	protected readonly hikeRoutes = inject(HikeRouteRepository);
	protected readonly routeSuggestion = inject(RouteSuggestionRepository);
	protected readonly routeMetrics = inject(RouteMetricsRepository);
	private readonly alertController = inject(AlertController);
	private readonly translate = inject(TranslateService);
	private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

	private map?: maplibregl.Map;
	private resizeObserver?: ResizeObserver;

	protected readonly mode = signal<Mode>('none');
	/** [lon, lat] waypoints picked so far, in click order (manual mode) or the generated path (auto mode). */
	protected readonly draft = signal<number[][]>([]);
	/** Auto mode: the first of the two picked points, waiting for the second click. */
	protected readonly autoStart = signal<number[] | null>(null);
	protected readonly routeName = signal('');
	protected readonly showRoutesPanel = signal(false);
	/**
	 * backlog/tura-utvonaltervezo/103-... 2.4 fázis — szakaszokra bontás/éjszakázó pontok. Csak a
	 * belső töréspontokat tárolja (az utolsó nap vége mindig implicit, a draft utolsó waypointja) —
	 * ld. buildDaysPayload, ami a mentendő HikeRouteDay listát építi belőle.
	 */
	protected readonly dayBreaks = signal<{ waypointIndex: number; overnightName: string }[]>([]);
	protected readonly showDaysPanel = signal(false);
	protected readonly dayCount = computed(() => this.dayBreaks().length + 1);
	protected readonly canAddDayBreak = computed(() => this.dayBreaks().length < Math.max(0, this.draft().length - 2));
	/** backlog/tura-utvonaltervezo/103-... 2.3 fázis — a draft() útvonalhoz tartozó, utoljára sikeresen kiszámolt metrika. */
	protected readonly metrics = signal<RouteMetrics | null>(null);
	protected readonly profilePoints = computed(() => {
		const metrics = this.metrics();
		return metrics ? elevationProfilePolylinePoints(metrics.profile, PROFILE_CHART_WIDTH, PROFILE_CHART_HEIGHT) : '';
	});

	private metricsRequestId = 0;
	private metricsDebounceHandle?: ReturnType<typeof setTimeout>;

	constructor() {
		effect(() => {
			const segments = this.trailSegments.segments();
			const source = this.map?.getSource(TRAIL_SEGMENTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(trailSegmentsToFeatureCollection(segments, trailSegmentSymbolColor));
		});
		effect(() => {
			const routes = this.hikeRoutes.items();
			const source = this.map?.getSource(HIKE_ROUTES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(hikeRoutesToFeatureCollection(routes));
		});
		effect(() => {
			const coordinates = this.draft();
			const lineSource = this.map?.getSource(HIKE_ROUTE_DRAFT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			lineSource?.setData(draftRouteToFeatureCollection(coordinates));
			const pointsSource = this.map?.getSource(HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			pointsSource?.setData(draftWaypointsToFeatureCollection(coordinates));
		});
		effect(() => {
			const start = this.autoStart();
			const source = this.map?.getSource(AUTO_ROUTE_START_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(draftWaypointsToFeatureCollection(start ? [start] : []));
		});
		effect(() => {
			// backlog/tura-utvonaltervezo/103-... 2.4 fázis — ha a draft zsugorodik (undo/clear), a most
			// már érvénytelen (a végponton túli vagy azzal egybeeső) töréspontokat el kell dobni.
			const length = this.draft().length;
			this.dayBreaks.update((breaks) => breaks.filter((day) => day.waypointIndex < length - 1));
		});
		effect(() => {
			const coordinates = this.draft();
			clearTimeout(this.metricsDebounceHandle);
			if (coordinates.length < 2) {
				this.metrics.set(null);
				return;
			}
			const requestId = ++this.metricsRequestId;
			this.metricsDebounceHandle = setTimeout(() => void this.refreshMetrics(coordinates, requestId), METRICS_DEBOUNCE_MS);
		});
	}

	ngAfterViewInit(): void {
		void this.hikeRoutes.load();

		const map = new maplibregl.Map({
			container: this.mapContainer().nativeElement,
			style: BASE_STYLE,
			center: HUNGARY_CENTER,
			zoom: HUNGARY_ZOOM,
		});
		map.addControl(new maplibregl.NavigationControl(), 'top-right');

		map.on('load', () => {
			map.addSource(TRAIL_SEGMENTS_SOURCE_ID, { type: 'geojson', data: trailSegmentsToFeatureCollection([], trailSegmentSymbolColor) });
			map.addLayer({
				id: TRAIL_SEGMENTS_LAYER_ID,
				type: 'line',
				source: TRAIL_SEGMENTS_SOURCE_ID,
				paint: { 'line-color': ['get', 'color'], 'line-width': 3 },
			});

			map.addSource(HIKE_ROUTES_SOURCE_ID, { type: 'geojson', data: hikeRoutesToFeatureCollection(this.hikeRoutes.items()) });
			map.addLayer({
				id: HIKE_ROUTES_LAYER_ID,
				type: 'line',
				source: HIKE_ROUTES_SOURCE_ID,
				paint: { 'line-color': '#1a73e8', 'line-width': 4 },
			});

			map.addSource(HIKE_ROUTE_DRAFT_SOURCE_ID, { type: 'geojson', data: draftRouteToFeatureCollection(this.draft()) });
			map.addLayer({
				id: HIKE_ROUTE_DRAFT_LAYER_ID,
				type: 'line',
				source: HIKE_ROUTE_DRAFT_SOURCE_ID,
				paint: { 'line-color': '#ff6f00', 'line-width': 3, 'line-dasharray': [2, 1] },
			});
			map.addSource(HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID, { type: 'geojson', data: draftWaypointsToFeatureCollection(this.draft()) });
			map.addLayer({
				id: HIKE_ROUTE_DRAFT_POINTS_LAYER_ID,
				type: 'circle',
				source: HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID,
				paint: { 'circle-color': '#ff6f00', 'circle-radius': 5, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 },
			});

			map.addSource(AUTO_ROUTE_START_SOURCE_ID, { type: 'geojson', data: draftWaypointsToFeatureCollection([]) });
			map.addLayer({
				id: AUTO_ROUTE_START_LAYER_ID,
				type: 'circle',
				source: AUTO_ROUTE_START_SOURCE_ID,
				paint: { 'circle-color': '#8e24aa', 'circle-radius': 6, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 },
			});

			void this.loadCurrentViewport(map);
		});
		map.on('moveend', () => void this.loadCurrentViewport(map));
		map.on('click', (event) => {
			const point = [event.lngLat.lng, event.lngLat.lat];
			if (this.mode() === 'manual') {
				this.draft.update((coordinates) => [...coordinates, point]);
			} else if (this.mode() === 'auto') {
				this.handleAutoModeClick(point);
			}
		});

		// MapLibre sizes its canvas from the container's dimensions at construction time. Inside an
		// Ionic page, ngAfterViewInit can fire mid page-transition (or before the flex/absolute layout
		// has settled), so the initial reading is sometimes a stale/small box — a ResizeObserver keeps
		// the canvas correct for that first layout pass and for any later container resize.
		this.resizeObserver = new ResizeObserver(() => map.resize());
		this.resizeObserver.observe(this.mapContainer().nativeElement);

		this.map = map;
	}

	ngOnDestroy(): void {
		clearTimeout(this.metricsDebounceHandle);
		this.resizeObserver?.disconnect();
		this.map?.remove();
	}

	protected toggleDrawMode(): void {
		this.mode.update((current) => (current === 'manual' ? 'none' : 'manual'));
		this.autoStart.set(null);
	}

	protected toggleAutoMode(): void {
		this.mode.update((current) => (current === 'auto' ? 'none' : 'auto'));
		this.autoStart.set(null);
	}

	protected undoLastWaypoint(): void {
		if (this.autoStart() !== null && this.draft().length === 0) {
			this.autoStart.set(null);
			return;
		}
		this.draft.update((coordinates) => coordinates.slice(0, -1));
	}

	protected clearDraft(): void {
		this.draft.set([]);
		this.routeName.set('');
		this.autoStart.set(null);
		this.dayBreaks.set([]);
	}

	protected toggleDaysPanel(): void {
		this.showDaysPanel.update((open) => !open);
	}

	/** A még nem használt belső waypoint-indexek (1..length-2), plusz a sor jelenlegi értéke — ez kerül az ion-select opciói közé. */
	protected availableWaypointIndexes(currentValue: number): number[] {
		const used = new Set(this.dayBreaks().map((day) => day.waypointIndex));
		used.delete(currentValue);
		const options: number[] = [];
		for (let index = 1; index < this.draft().length - 1; index++) {
			if (!used.has(index)) {
				options.push(index);
			}
		}
		return options;
	}

	protected addDayBreak(): void {
		const used = new Set(this.dayBreaks().map((day) => day.waypointIndex));
		for (let index = 1; index < this.draft().length - 1; index++) {
			if (!used.has(index)) {
				this.dayBreaks.update((breaks) => [...breaks, { waypointIndex: index, overnightName: '' }].sort((a, b) => a.waypointIndex - b.waypointIndex));
				return;
			}
		}
	}

	protected updateDayBreakIndex(position: number, waypointIndex: number): void {
		this.dayBreaks.update((breaks) => {
			const next = [...breaks];
			next[position] = { ...next[position], waypointIndex: Number(waypointIndex) };
			return next.sort((a, b) => a.waypointIndex - b.waypointIndex);
		});
	}

	protected updateDayBreakOvernightName(position: number, overnightName: string): void {
		this.dayBreaks.update((breaks) => {
			const next = [...breaks];
			next[position] = { ...next[position], overnightName };
			return next;
		});
	}

	protected removeDayBreak(position: number): void {
		this.dayBreaks.update((breaks) => breaks.filter((_, index) => index !== position));
	}

	private handleAutoModeClick(point: number[]): void {
		if (this.routeSuggestion.loading()) {
			return;
		}
		const start = this.autoStart();
		if (start === null) {
			this.autoStart.set(point);
			return;
		}
		void this.generateAutoRoute(start, point);
	}

	private async generateAutoRoute(start: number[], end: number[]): Promise<void> {
		const result = await this.routeSuggestion.suggest(COUNTRY_CODE, start, end);
		this.autoStart.set(null);
		if (!result.found) {
			this.mode.set('none');
			const alert = await this.alertController.create({
				header: this.translate.instant('TURA.ROUTE_NOT_FOUND_TITLE'),
				message: this.translate.instant('TURA.ROUTE_NOT_FOUND_MESSAGE'),
				buttons: [this.translate.instant('COMMON.OK')],
			});
			await alert.present();
			return;
		}
		this.draft.set(result.coordinates);
		this.mode.set('none');
	}

	protected async saveDraft(): Promise<void> {
		const name = this.routeName().trim();
		if (name === '' || this.draft().length < 2) {
			return;
		}
		const metrics = this.metrics();
		const days = await this.buildDaysPayload();
		await this.hikeRoutes.save({
			name,
			coordinates: this.draft(),
			distanceMeters: metrics?.distanceMeters,
			elevationGainMeters: metrics?.elevationGainMeters,
			elevationLossMeters: metrics?.elevationLossMeters,
			estimatedDurationMinutes: metrics?.estimatedDurationMinutes,
			elevationProfile: metrics?.profile,
			days,
		});
		this.draft.set([]);
		this.routeName.set('');
		this.dayBreaks.set([]);
		this.mode.set('none');
	}

	/**
	 * backlog/tura-utvonaltervezo/103-... 2.4 fázis — a belső töréspontokból (dayBreaks) építi fel a
	 * mentendő HikeRouteDay listát; minden napra külön meghívja az /api/tura/route-metrics-et a nap
	 * saját szakaszára (online, best-effort — hiba esetén az adott nap metrika nélkül marad, ugyanaz
	 * a minta, mint a route-szintű refreshMetrics-nél).
	 */
	private async buildDaysPayload(): Promise<HikeRouteDay[] | undefined> {
		const breaks = this.dayBreaks();
		if (breaks.length === 0) {
			return undefined;
		}
		const coordinates = this.draft();
		const boundaries = [...breaks.map((day) => day.waypointIndex), coordinates.length - 1];
		const days: HikeRouteDay[] = [];
		let start = 0;
		for (let i = 0; i < boundaries.length; i++) {
			const end = boundaries[i];
			const dayMetrics = await this.computeDaySegmentMetrics(coordinates.slice(start, end + 1));
			days.push({
				endWaypointIndex: end,
				overnightName: breaks[i]?.overnightName.trim() || null,
				distanceMeters: dayMetrics?.distanceMeters,
				elevationGainMeters: dayMetrics?.elevationGainMeters,
				elevationLossMeters: dayMetrics?.elevationLossMeters,
				estimatedDurationMinutes: dayMetrics?.estimatedDurationMinutes,
			});
			start = end;
		}
		return days;
	}

	private async computeDaySegmentMetrics(segment: number[][]): Promise<RouteMetrics | null> {
		if (segment.length < 2) {
			return null;
		}
		try {
			return await this.routeMetrics.compute(segment);
		} catch {
			return null;
		}
	}

	/** backlog/tura-utvonaltervezo/103-... 2.3 fázis — online, best-effort: hiba esetén a felhasználó metrika nélkül is menthet. */
	private async refreshMetrics(coordinates: number[][], requestId: number): Promise<void> {
		try {
			const result = await this.routeMetrics.compute(coordinates);
			if (requestId === this.metricsRequestId) {
				this.metrics.set(result);
			}
		} catch {
			if (requestId === this.metricsRequestId) {
				this.metrics.set(null);
			}
		}
	}

	protected formatDistance(meters: number): string {
		return `${(meters / 1000).toFixed(1)} km`;
	}

	protected formatDuration(minutes: number): string {
		const totalMinutes = Math.round(minutes);
		const hours = Math.floor(totalMinutes / 60);
		const mins = totalMinutes % 60;
		return hours > 0 ? `${hours} ó ${mins} p` : `${mins} p`;
	}

	protected formatElevation(meters: number): string {
		return `${Math.round(meters)} m`;
	}

	protected toggleRoutesPanel(): void {
		this.showRoutesPanel.update((open) => !open);
	}

	protected flyToRoute(route: HikeRoute): void {
		if (!this.map || route.coordinates.length === 0) {
			return;
		}
		const lons = route.coordinates.map((coordinate) => coordinate[0]);
		const lats = route.coordinates.map((coordinate) => coordinate[1]);
		this.map.fitBounds(
			[
				[Math.min(...lons), Math.min(...lats)],
				[Math.max(...lons), Math.max(...lats)],
			],
			{ padding: 40 },
		);
		this.showRoutesPanel.set(false);
	}

	protected async confirmDeleteRoute(route: HikeRoute): Promise<void> {
		const alert = await this.alertController.create({
			header: this.translate.instant('TURA.DELETE_ROUTE_CONFIRM_TITLE'),
			message: this.translate.instant('TURA.DELETE_ROUTE_CONFIRM_MESSAGE', { name: route.name }),
			buttons: [
				{ text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
				{ text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.hikeRoutes.remove(route.id) },
			],
		});
		await alert.present();
	}

	private async loadCurrentViewport(map: maplibregl.Map): Promise<void> {
		const bounds = map.getBounds();
		const bbox: Bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
		await this.trailSegments.loadBbox(COUNTRY_CODE, bbox);
	}
}

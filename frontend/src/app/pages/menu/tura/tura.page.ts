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
	IonToggle,
	IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Capacitor } from '@capacitor/core';
import maplibregl from 'maplibre-gl';

import { CuratedRoute } from '../../../api/model/curatedRoute';
import { CuratedRouteActivityType } from '../../../api/model/curatedRouteActivityType';
import { CuratedRouteDifficulty } from '../../../api/model/curatedRouteDifficulty';
import { HikeRoute } from '../../../api/model/hikeRoute';
import { HikeRouteDay } from '../../../api/model/hikeRouteDay';
import { RouteMetrics } from '../../../api/model/routeMetrics';
import { Bbox, TrailSegmentRepository } from '../../../core/data/trail-segment.repository';
import { CuratedRouteFilter, CuratedRouteRepository } from '../../../core/data/curated-route.repository';
import { HikeRouteRepository } from '../../../core/data/hike-route.repository';
import { RouteMetricsRepository } from '../../../core/data/route-metrics.repository';
import { RouteSuggestionRepository } from '../../../core/data/route-suggestion.repository';
import { elevationProfilePolylinePoints } from './elevation-profile-svg';
import { draftRouteToFeatureCollection, draftWaypointsToFeatureCollection, hikeRoutesToFeatureCollection } from './hike-routes-geojson';
import { OFFLINE_TILE_PROTOCOL, registerOfflineTileProtocol } from './offline-map-protocol';
import { OFFLINE_TILE_MAX_COUNT, OfflineRegion } from './offline-region.model';
import { OfflineRegionRepository } from './offline-region.repository';
import { trailSegmentSymbolColor } from './trail-segment-symbol-color';
import { trailSegmentsToFeatureCollection } from './trail-segments-geojson';

/** backlog/tura-utvonaltervezo/103-... 2.5 fázis — a katalógus-szűrő táv-tengelye előre definiált sávokként (nem szabad numerikus range-inputként). */
export type DistanceBucket = 'any' | 'short' | 'medium' | 'long';
const DISTANCE_BUCKET_MEDIUM_MIN = 10000;
const DISTANCE_BUCKET_LONG_MIN = 20000;

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
const CURATED_ROUTE_PREVIEW_SOURCE_ID = 'curated-route-preview';
const CURATED_ROUTE_PREVIEW_LAYER_ID = 'curated-route-preview-layer';

/** backlog/tura-utvonaltervezo/103-... 2.2 fázis — a rajzolás-térkép aktuális interakciós módja. */
type Mode = 'none' | 'manual' | 'auto';

/** backlog/tura-utvonaltervezo/107-... 3. fázis — az alternatív alaptérkép-rétegek közül a kiválasztott. */
type Basemap = 'osm' | 'topo' | 'satellite';
const BASEMAP_LAYER_IDS: Record<Basemap, string> = { osm: 'osm', topo: 'topo', satellite: 'satellite' };
const TERRAIN_SOURCE_ID = 'terrain-rgb';
const HILLSHADE_LAYER_ID = 'hillshade';

// backlog/tura-utvonaltervezo/103-... 1. fázis: MapLibre GL JS + nyers OSM raster csempe mint
// alaptérkép (nem saját vektor-csempe szolgáltatás — ld. a ticket "térkép-alap technológia" nyitott
// kérdését). Egyszemélyes, személyes-célú használatra ez belefér az OSM tile usage policy-jába;
// nagyobb léptékű/publikált verzióhoz saját csempe-hosting kellene.
// backlog/tura-utvonaltervezo/107-... 3. fázis: két további, ugyanígy kulcs nélküli, ingyenes nyers
// csempe-forrás — OpenTopoMap (topográfiai réteg) és Esri World Imagery (szatellit) —, valamint egy
// raster-dem forrás (AWS "elevation-tiles-prod", Terrarium-kódolás, Mapzen nyílt terrain-adatkészlete)
// a domborzat-árnyékoláshoz. A ticket "lejtő-réteg (szín szerinti meredekség-vizualizáció)" pontját ez
// a MapLibre natívan támogatott `hillshade` réteg-típusa fedi le (fény/árnyék alapú domborzat-
// kiemelés) — egy tényleges, önálló szín-skálás lejtőszög-réteghez saját, előre számolt lejtő-csempe
// kellene, amihez nincs ingyenes, kulcs nélküli publikus szolgáltatás; ez a technikai döntés a ticket
// "3D nézet nem kell" döntésével összhangban a legegyszerűbb, extra backend-munka nélküli megoldás.
// Mindhárom alaptérkép-réteg és a hillshade is a kezdeti style részeként létezik (nem
// map.setStyle()-lal cserélve), a láthatóság `visibility` layout-tulajdonsággal váltva — így a
// többi (turistajelzés, útvonalak stb.) forrás/réteg érintetlen marad váltáskor.
// backlog/tura-utvonaltervezo/105-... 4. fázis: az `osm` réteg csempe-URL-je a saját
// `tura-offline-tile://` MapLibre protokollra mutat (ld. offline-map-protocol.ts) — ez natív
// platformon a letöltött offline régiók Filesystem-cache-ét fűzi a hálózati kérés elé, hogy
// BACKEND_OFFLINE/FULL_OFFLINE alatt is renderelhető legyen a korábban letöltött terület. A
// topo/szatellit réteg (és a hillshade DEM) szándékosan online-only marad — a régiónkénti offline
// letöltés csak az alapértelmezett OSM-rétegre terjed ki, hogy a letöltés/tárhely-kezelés ne
// hármas komplexitású legyen (ld. `OfflineRegionRepository` dokumentációja).
const BASE_STYLE: maplibregl.StyleSpecification = {
	version: 8,
	sources: {
		osm: {
			type: 'raster',
			tiles: [`${OFFLINE_TILE_PROTOCOL}://osm/{z}/{x}/{y}`],
			tileSize: 256,
			attribution: '© OpenStreetMap contributors',
		},
		topo: {
			type: 'raster',
			tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
			tileSize: 256,
			attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)',
		},
		satellite: {
			type: 'raster',
			tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
			tileSize: 256,
			attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
		},
		[TERRAIN_SOURCE_ID]: {
			type: 'raster-dem',
			tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
			tileSize: 256,
			encoding: 'terrarium',
			maxzoom: 15,
		},
	},
	layers: [
		{ id: 'osm', type: 'raster', source: 'osm' },
		{ id: 'topo', type: 'raster', source: 'topo', layout: { visibility: 'none' } },
		{ id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' } },
		{ id: HILLSHADE_LAYER_ID, type: 'hillshade', source: TERRAIN_SOURCE_ID, layout: { visibility: 'none' }, paint: { 'hillshade-exaggeration': 0.5 } },
	],
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
		IonToggle,
		TranslatePipe,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuraPage implements AfterViewInit, OnDestroy {
	private readonly trailSegments = inject(TrailSegmentRepository);
	protected readonly hikeRoutes = inject(HikeRouteRepository);
	protected readonly curatedRoutes = inject(CuratedRouteRepository);
	protected readonly routeSuggestion = inject(RouteSuggestionRepository);
	protected readonly routeMetrics = inject(RouteMetricsRepository);
	protected readonly offlineRegions = inject(OfflineRegionRepository);
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
	/** backlog/tura-utvonaltervezo/103-... 2.5 fázis — ajánlott/kész túrák katalógusa, szűréssel. */
	protected readonly showCatalogPanel = signal(false);
	protected readonly catalogDifficulty = signal<CuratedRouteDifficulty | ''>('');
	protected readonly catalogActivityType = signal<CuratedRouteActivityType | ''>('');
	protected readonly catalogDistanceBucket = signal<DistanceBucket>('any');
	/** A térképen kiemelt katalógus-túra (ha a felhasználó rákattintott egy listaelemre) — null = nincs kiemelés. */
	protected readonly previewedCuratedRoute = signal<number[][] | null>(null);
	/** backlog/tura-utvonaltervezo/107-... 3. fázis — alaptérkép-váltó + domborzat-árnyékolás panel. */
	protected readonly showLayersPanel = signal(false);
	protected readonly activeBasemap = signal<Basemap>('osm');
	protected readonly showHillshade = signal(false);
	/** backlog/tura-utvonaltervezo/105-... 4. fázis — offline terület-letöltés panel; web buildben (nincs Filesystem-hozzáférés) a gomb el sem érhető. */
	protected readonly offlineCapable = Capacitor.isNativePlatform();
	protected readonly showOfflinePanel = signal(false);
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
			const preview = this.previewedCuratedRoute();
			const source = this.map?.getSource(CURATED_ROUTE_PREVIEW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(draftRouteToFeatureCollection(preview ?? []));
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
		registerOfflineTileProtocol();

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

			map.addSource(CURATED_ROUTE_PREVIEW_SOURCE_ID, { type: 'geojson', data: draftRouteToFeatureCollection([]) });
			map.addLayer({
				id: CURATED_ROUTE_PREVIEW_LAYER_ID,
				type: 'line',
				source: CURATED_ROUTE_PREVIEW_SOURCE_ID,
				// Ciánkék — a terepszínű (zöld) OSM alaptérképen jól elkülönül a többi réteg
				// (útvonalaim: kék, rajz-piszkozat: narancs, auto-mód kezdőpont: lila) színétől is.
				paint: { 'line-color': '#00bcd4', 'line-width': 5 },
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

	protected toggleCatalogPanel(): void {
		const opening = !this.showCatalogPanel();
		this.showCatalogPanel.set(opening);
		if (opening) {
			void this.reloadCatalog();
		}
	}

	protected setCatalogDifficulty(value: CuratedRouteDifficulty | ''): void {
		this.catalogDifficulty.set(value);
		void this.reloadCatalog();
	}

	protected setCatalogActivityType(value: CuratedRouteActivityType | ''): void {
		this.catalogActivityType.set(value);
		void this.reloadCatalog();
	}

	protected setCatalogDistanceBucket(value: DistanceBucket): void {
		this.catalogDistanceBucket.set(value);
		void this.reloadCatalog();
	}

	private async reloadCatalog(): Promise<void> {
		const filter: CuratedRouteFilter = {
			difficulty: this.catalogDifficulty() || undefined,
			activityType: this.catalogActivityType() || undefined,
			...this.distanceBucketToRange(this.catalogDistanceBucket()),
		};
		await this.curatedRoutes.load(filter);
	}

	private distanceBucketToRange(bucket: DistanceBucket): Pick<CuratedRouteFilter, 'minDistanceMeters' | 'maxDistanceMeters'> {
		switch (bucket) {
			case 'short':
				return { maxDistanceMeters: DISTANCE_BUCKET_MEDIUM_MIN };
			case 'medium':
				return { minDistanceMeters: DISTANCE_BUCKET_MEDIUM_MIN, maxDistanceMeters: DISTANCE_BUCKET_LONG_MIN };
			case 'long':
				return { minDistanceMeters: DISTANCE_BUCKET_LONG_MIN };
			default:
				return {};
		}
	}

	protected previewCuratedRoute(route: CuratedRoute): void {
		this.previewedCuratedRoute.set(route.coordinates);
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
		this.showCatalogPanel.set(false);
	}

	protected toggleLayersPanel(): void {
		this.showLayersPanel.update((open) => !open);
	}

	protected setBasemap(basemap: Basemap): void {
		this.activeBasemap.set(basemap);
		if (!this.map) {
			return;
		}
		for (const [id, layerId] of Object.entries(BASEMAP_LAYER_IDS)) {
			this.map.setLayoutProperty(layerId, 'visibility', id === basemap ? 'visible' : 'none');
		}
	}

	protected toggleHillshade(visible: boolean): void {
		this.showHillshade.set(visible);
		this.map?.setLayoutProperty(HILLSHADE_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
	}

	protected toggleOfflinePanel(): void {
		this.showOfflinePanel.update((open) => !open);
	}

	protected formatOfflineSize(bytes: number): string {
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * backlog/tura-utvonaltervezo/105-... 4. fázis — az aktuális térkép-viewport bbox-át tölti le
	 * offline használatra (ld. `OfflineRegionRepository` a "mekkora egy régió" döntésért). Előbb egy
	 * méret-becsléssel elutasítja a túl nagy (pl. ország-léptékű) területet, majd egy `AlertController`
	 * prompttal kér nevet a régiónak — ugyanaz a minta, mint a meglévő törlés-megerősítéseknél.
	 */
	protected async downloadCurrentRegion(): Promise<void> {
		if (!this.map) {
			return;
		}
		const bounds = this.map.getBounds();
		const bbox: Bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
		const tileCount = this.offlineRegions.estimateTileCount(bbox);
		if (tileCount === 0 || tileCount > OFFLINE_TILE_MAX_COUNT) {
			const alert = await this.alertController.create({
				header: this.translate.instant('TURA.OFFLINE.TOO_LARGE_TITLE'),
				message: this.translate.instant('TURA.OFFLINE.TOO_LARGE_MESSAGE'),
				buttons: [this.translate.instant('COMMON.OK')],
			});
			await alert.present();
			return;
		}

		const defaultName = this.translate.instant('TURA.OFFLINE.DEFAULT_NAME', { date: new Date().toLocaleDateString() });
		const alert = await this.alertController.create({
			header: this.translate.instant('TURA.OFFLINE.NAME_PROMPT_TITLE'),
			inputs: [{ name: 'name', type: 'text', value: defaultName, placeholder: defaultName }],
			buttons: [
				{ text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
				{
					text: this.translate.instant('TURA.OFFLINE.DOWNLOAD'),
					handler: (data: { name?: string }) => void this.offlineRegions.download(COUNTRY_CODE, bbox, data.name?.trim() || defaultName),
				},
			],
		});
		await alert.present();
	}

	protected async confirmDeleteOfflineRegion(region: OfflineRegion): Promise<void> {
		const alert = await this.alertController.create({
			header: this.translate.instant('TURA.OFFLINE.DELETE_CONFIRM_TITLE'),
			message: this.translate.instant('TURA.OFFLINE.DELETE_CONFIRM_MESSAGE', { name: region.name }),
			buttons: [
				{ text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
				{ text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.offlineRegions.remove(region.id) },
			],
		});
		await alert.present();
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

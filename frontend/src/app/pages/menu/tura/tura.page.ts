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
	IonHeader,
	IonIcon,
	IonInput,
	IonItem,
	IonLabel,
	IonList,
	IonModal,
	IonPopover,
	IonSelect,
	IonSelectOption,
	IonSpinner,
	IonTitle,
	IonToggle,
	IonToolbar,
	ToastController,
	ViewDidEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Capacitor } from '@capacitor/core';
import maplibregl from 'maplibre-gl';

import { CuratedRoute } from '../../../api/model/curatedRoute';
import { CuratedRouteActivityType } from '../../../api/model/curatedRouteActivityType';
import { CuratedRouteDifficulty } from '../../../api/model/curatedRouteDifficulty';
import { HikeRoute } from '../../../api/model/hikeRoute';
import { HikeRouteDay } from '../../../api/model/hikeRouteDay';
import { Bbox, TrailSegmentRepository } from '../../../core/data/trail-segment.repository';
import { CuratedRouteFilter, CuratedRouteRepository } from '../../../core/data/curated-route.repository';
import { HikeRouteRepository } from '../../../core/data/hike-route.repository';
import { RouteMetricsRepository } from '../../../core/data/route-metrics.repository';
import { RouteSuggestionRepository } from '../../../core/data/route-suggestion.repository';
import { StoredTuraMapView, TuraLocalStateService } from '../../../core/data/tura-local-state.service';
import { LanguageService } from '../../../core/config/language.service';
import { RouteDayMetrics, RouteMetricsResult } from '../../../core/geo/route-metrics';
import { polylineLengthMeters } from '../../../core/geo/geo-math';
import { ElevationProfilePoint } from '../../../api/model/elevationProfilePoint';
import { distancesAlongRoute } from './elevation-profile-svg';
import { ElevationProfileComponent } from './elevation-profile.component';
import { RouteDetailsComponent } from './route-details.component';
import { trailSymbolLabel } from './trail-symbol-text';
import { trailSegmentSymbolColor } from './trail-segment-symbol-color';
import {
	dayBreakIndexes,
	draftRouteToFeatureCollection,
	hikeRouteMarkersToFeatureCollection,
	hikeRoutesToFeatureCollection,
	routeMarkersToFeatureCollection,
} from './hike-routes-geojson';
import {
	ICON_ARROW_DARK,
	ICON_ARROW_LIGHT,
	PREVIEW_CASING_COLOR,
	PREVIEW_COLOR,
	ROUTE_CASING_COLOR,
	ROUTE_COLOR,
	registerTuraMapIcons,
} from './map-icons';
import { OFFLINE_TILE_PROTOCOL, registerOfflineTileProtocol } from './offline-map-protocol';
import { OFFLINE_TILE_MAX_COUNT, OfflineRegion } from '../../../core/data/offline-region.model';
import { OfflineRegionRepository } from '../../../core/data/offline-region.repository';
import { AutoRouteHintComponent, AutoRouteHintStep } from './auto-route-hint.component';
import { TuraLegendComponent } from './tura-legend.component';
import { dateText, daySummaryText, distanceText, durationText, elevationText, megabytesText } from './hike-text';
import { DayBreak, DraftDetails, RouteDraftEditor, interiorWaypointIndexes, routeDraftFromPath, withManualPoint, withPath } from './route-draft';
import { trailSegmentsToFeatureCollection } from './trail-segments-geojson';

/** backlog/tura-utvonaltervezo/103-... 2.5 fázis — a katalógus-szűrő táv-tengelye előre definiált sávokként (nem szabad numerikus range-inputként). */
export type DistanceBucket = 'any' | 'short' | 'medium' | 'long';
const DISTANCE_BUCKET_MEDIUM_MIN = 10000;
const DISTANCE_BUCKET_LONG_MIN = 20000;

/** backlog/tura-utvonaltervezo/103-... 2.3 fázis — mennyit várunk az utolsó waypoint-változás után, mielőtt a metrikát újraszámoltatjuk. */
const METRICS_DEBOUNCE_MS = 500;
/** backlog/213 — a név gépelése ne írjon minden betűnél a Preferences-be. */
const DRAFT_PERSIST_DEBOUNCE_MS = 500;
/** backlog/208, backlog/211 — meddig látszik a kuka / mentés utáni akciós toast. */
const ACTION_TOAST_DURATION_MS = 5000;
/** backlog/209 — a napi értékek újraszámolása a napváltó-szerkesztés után ennyivel. */
const DAY_METRICS_DEBOUNCE_MS = 400;
/**
 * backlog/212, backlog/218, backlog/209 — az útvonal-kártya félmagas lap; ezen a fokozaton a térkép
 * mellette kezelhető marad (a háttér csak a nagyobb fokozaton takar).
 */
const DETAILS_SHEET_BREAKPOINT = 0.45;
/** backlog/201 — egy ujjnyi tűrés (px) a vonalra koppintáshoz. */
const TAP_TOLERANCE_PX = 10;
/** backlog/201 — egy koppintásra legfeljebb ennyi egymásra futó turistaút jelenik meg a kártyán. */
const MAX_TAPPED_TRAILS = 4;

const TRAIL_SEGMENTS_SOURCE_ID = 'trail-segments';
const TRAIL_SEGMENTS_LAYER_ID = 'trail-segments-layer';
const TRAIL_SEGMENTS_CASING_LAYER_ID = 'trail-segments-casing-layer';
const TRAIL_SEGMENTS_UNMARKED_LAYER_ID = 'trail-segments-unmarked-layer';
const HIKE_ROUTES_SOURCE_ID = 'hike-routes';
const HIKE_ROUTES_LAYER_ID = 'hike-routes-layer';
const HIKE_ROUTES_CASING_LAYER_ID = 'hike-routes-casing-layer';
const HIKE_ROUTES_ARROWS_LAYER_ID = 'hike-routes-arrows-layer';
const HIKE_ROUTES_LABEL_LAYER_ID = 'hike-routes-label-layer';
const HIKE_ROUTE_MARKERS_SOURCE_ID = 'hike-route-markers';
const HIKE_ROUTE_MARKERS_LAYER_ID = 'hike-route-markers-layer';
const HIKE_ROUTE_DRAFT_SOURCE_ID = 'hike-route-draft';
const HIKE_ROUTE_DRAFT_LAYER_ID = 'hike-route-draft-layer';
const HIKE_ROUTE_DRAFT_CASING_LAYER_ID = 'hike-route-draft-casing-layer';
const HIKE_ROUTE_DRAFT_ARROWS_LAYER_ID = 'hike-route-draft-arrows-layer';
const HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID = 'hike-route-draft-points';
const HIKE_ROUTE_DRAFT_POINTS_LAYER_ID = 'hike-route-draft-points-layer';
const AUTO_ROUTE_START_SOURCE_ID = 'hike-route-auto-start';
const AUTO_ROUTE_START_LAYER_ID = 'hike-route-auto-start-layer';
const CURATED_ROUTE_PREVIEW_SOURCE_ID = 'curated-route-preview';
const CURATED_ROUTE_PREVIEW_LAYER_ID = 'curated-route-preview-layer';
const CURATED_ROUTE_PREVIEW_CASING_LAYER_ID = 'curated-route-preview-casing-layer';
const CURATED_ROUTE_PREVIEW_ARROWS_LAYER_ID = 'curated-route-preview-arrows-layer';
const CURATED_ROUTE_PREVIEW_MARKERS_SOURCE_ID = 'curated-route-preview-markers';
const CURATED_ROUTE_PREVIEW_MARKERS_LAYER_ID = 'curated-route-preview-markers-layer';
/** backlog/202 — a „Saját útvonalak” kapcsoló ezeket a rétegeket rejti el / mutatja. */
const MY_ROUTES_LAYER_IDS = [HIKE_ROUTES_CASING_LAYER_ID, HIKE_ROUTES_LAYER_ID, HIKE_ROUTES_ARROWS_LAYER_ID, HIKE_ROUTES_LABEL_LAYER_ID, HIKE_ROUTE_MARKERS_LAYER_ID];
/** backlog/202 — a mentett útvonalak neve ettől a zoomtól látszik a vonal mentén. */
const ROUTE_LABEL_MIN_ZOOM = 13;
/** backlog/203 — irány-nyilak távolsága a vonalon (px). */
const ARROW_SPACING_PX = 80;
const LINE_LAYOUT: maplibregl.LineLayerSpecification['layout'] = { 'line-join': 'round', 'line-cap': 'round' };

/** backlog/tura-utvonaltervezo/103-... 2.2 fázis — a rajzolás-térkép aktuális interakciós módja. */
type Mode = 'none' | 'manual' | 'auto';

/** backlog/212, backlog/218, backlog/209 — melyik útvonal kártyája látszik a félmagas lapon. */
type DetailsSheet = 'saved' | 'preview' | 'draft';

/** backlog/201 — egy koppintott turistaút a kártyán. */
interface TappedTrail {
	readonly label: string;
	readonly color: string;
	readonly routeName: string | null;
}

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
/**
 * backlog/180 — ez alatt a zoomszint alatt a turistaút-szakaszok sem töltődnek be, sem nem
 * rajzolódnak ki: ország-nézetben egy bbox több tízezer szakasz (20 MB, 27 s mérve), és a vonalak
 * amúgy is olvashatatlanul összefolynak. Emulátoron, a legsűrűbb Budapest–Pilis környéken mérve
 * (360 dp széles kép): 11-es zoomon 2–4 MB / 2–5 s kérésenként, 12-esen 0,6–1,4 MB / 0,8–1,5 s.
 */
const MIN_TRAIL_SEGMENT_ZOOM = 12;
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
		IonPopover,
		IonSelect,
		IonSelectOption,
		IonContent,
		IonSpinner,
		IonToggle,
		TranslatePipe,
		AutoRouteHintComponent,
		TuraLegendComponent,
		ElevationProfileComponent,
		RouteDetailsComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuraPage implements AfterViewInit, ViewDidEnter, OnDestroy {
	private readonly trailSegments = inject(TrailSegmentRepository);
	protected readonly hikeRoutes = inject(HikeRouteRepository);
	protected readonly curatedRoutes = inject(CuratedRouteRepository);
	protected readonly routeSuggestion = inject(RouteSuggestionRepository);
	protected readonly routeMetrics = inject(RouteMetricsRepository);
	protected readonly offlineRegions = inject(OfflineRegionRepository);
	private readonly alertController = inject(AlertController);
	private readonly toastController = inject(ToastController);
	private readonly translate = inject(TranslateService);
	private readonly localState = inject(TuraLocalStateService);
	private readonly language = inject(LanguageService);
	private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
	/** backlog/204 — a térkép fölött lebegő elemek: a `fitBounds` ezek alól húzza ki a vonalat. */
	private readonly mapActions = viewChild.required<ElementRef<HTMLDivElement>>('mapActions');
	private readonly mapBottom = viewChild.required<ElementRef<HTMLDivElement>>('mapBottom');

	private map?: maplibregl.Map;

	protected readonly durationText = durationText;
	protected readonly daySummaryText = daySummaryText;
	private resizeObserver?: ResizeObserver;

	protected readonly mode = signal<Mode>('none');
	/** backlog/190 — a rajz (teljes vonal + a felhasználó kijelölt pontjai) lépésenkénti visszavonással. */
	private readonly draftEditor = new RouteDraftEditor();
	/** [lon, lat] — the whole line: the clicked points (manual mode) and the generated paths (auto mode). */
	protected readonly draft = computed(() => this.draftEditor.draft().coordinates);
	/** Auto mode: the first of the two picked points, waiting for the second click. */
	protected readonly autoStart = signal<number[] | null>(null);
	protected readonly canUndo = computed(() => this.draftEditor.canUndo() || this.autoStart() !== null);
	/** backlog/206 — a Turistaúton mód tippje: kezdőpont, végpont, vagy a meglévő vonal folytatása. */
	protected readonly autoHintStep = computed<AutoRouteHintStep>(() => {
		if (this.autoStart() !== null) {
			return 'end';
		}
		return this.draft().length > 0 ? 'next' : 'start';
	});
	/** A napváltónak választható pontok: a felhasználó kijelölt pontjai a két végpont nélkül. */
	protected readonly interiorWaypoints = computed(() => interiorWaypointIndexes(this.draftEditor.draft()));
	protected readonly routeName = signal('');
	protected readonly showRoutesPanel = signal(false);
	/**
	 * backlog/tura-utvonaltervezo/103-... 2.4 fázis — szakaszokra bontás/éjszakázó pontok. Csak a
	 * belső töréspontokat tárolja (az utolsó nap vége mindig implicit, a draft utolsó waypointja) —
	 * ld. metricsForSave, ami a mentendő HikeRouteDay listát építi belőle.
	 */
	protected readonly dayBreaks = signal<DayBreak[]>([]);
	protected readonly dayCount = computed(() => this.dayBreaks().length + 1);
	protected readonly canAddDayBreak = computed(() => this.dayBreaks().length < this.interiorWaypoints().length);
	/** backlog/209 — ha nem adható hozzá napváltó, miért nem. */
	protected readonly addDayBreakBlockedKey = computed(() => (this.interiorWaypoints().length === 0 ? 'TURA.DAYS.NEED_WAYPOINT' : 'TURA.DAYS.ALL_USED'));
	/** backlog/209 — a piszkozat napi értékei a napváltók szerint (csak nyitott lapnál számolva). */
	protected readonly draftDays = signal<RouteDayMetrics[] | null>(null);
	/** backlog/219 — a piszkozat napváltóinak távolsága az indulástól, a profil jelölőihez. */
	protected readonly draftMarkerDistances = computed(() => distancesAlongRoute(this.draft(), this.dayBreaks().map((day) => day.waypointIndex)));
	/** backlog/212 — a szerkesztésre betöltött mentett útvonal id-je; `null` = új útvonal. */
	protected readonly editingRouteId = signal<string | null>(null);
	/** backlog/212, backlog/218, backlog/209 — a félmagas útvonal-kártya. */
	protected readonly detailsSheet = signal<DetailsSheet | null>(null);
	protected readonly detailsSheetBreakpoint = DETAILS_SHEET_BREAKPOINT;
	private readonly selectedRouteId = signal<string | null>(null);
	protected readonly selectedRoute = computed(() => this.hikeRoutes.items().find((route) => route.id === this.selectedRouteId()) ?? null);
	protected readonly selectedRouteMarkers = computed(() => routeDayMarkerDistances(this.selectedRoute()));
	/**
	 * backlog/212 — az Útvonalaim lista: a legújabb elöl. Új útvonal szinkron előtt is kap helyi dátumot
	 * (local-rows.ts), így dátum nélküli csak egy korábbi, még nem szinkronizált sor lehet — az a végére kerül.
	 */
	protected readonly sortedRoutes = computed(() => [...this.hikeRoutes.items()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')));
	/** backlog/201 — alapállapotban egy turistaútra koppintva: a jelzés neve és a túraútvonal neve. */
	protected readonly tappedTrails = signal<readonly TappedTrail[]>([]);
	/** backlog/tura-utvonaltervezo/103-... 2.5 fázis — ajánlott/kész túrák katalógusa, szűréssel. */
	protected readonly showCatalogPanel = signal(false);
	protected readonly catalogDifficulty = signal<CuratedRouteDifficulty | ''>('');
	protected readonly catalogActivityType = signal<CuratedRouteActivityType | ''>('');
	protected readonly catalogDistanceBucket = signal<DistanceBucket>('any');
	/** A térképen kiemelt katalógus-túra (ha a felhasználó rákattintott egy listaelemre) — null = nincs kiemelés. */
	protected readonly previewedCuratedRoute = signal<CuratedRoute | null>(null);
	/** backlog/218 — a katalógus nem hordoz magasságprofilt: a részletek megnyitásakor az eszköz számolja. */
	protected readonly previewProfile = signal<ElevationProfilePoint[] | null>(null);
	protected readonly previewProfileLoading = signal(false);
	protected readonly previewMarkers = computed(() => routeDayMarkerDistances(this.previewedCuratedRoute()));
	/** backlog/191 — melyik üres-állapot szöveg illik a katalógusra: a betöltés hibája, az üres katalógus vagy a szűrő. */
	protected readonly catalogEmptyKey = computed(() => {
		if (this.curatedRoutes.loadFailed()) {
			return 'TURA.CATALOG.OFFLINE';
		}
		const unfiltered = this.catalogDifficulty() === '' && this.catalogActivityType() === '' && this.catalogDistanceBucket() === 'any';
		return unfiltered ? 'TURA.CATALOG.EMPTY' : 'TURA.CATALOG.NO_RESULTS';
	});
	/** backlog/tura-utvonaltervezo/107-... 3. fázis — alaptérkép-váltó + domborzat-árnyékolás panel. */
	protected readonly showLayersPanel = signal(false);
	/** backlog/196 */
	protected readonly showLegend = signal(false);
	protected readonly activeBasemap = signal<Basemap>('osm');
	protected readonly showHillshade = signal(false);
	/** backlog/202 — a mentett útvonalak rétege kikapcsolható; a választás a térkép-nézettel együtt megmarad. */
	protected readonly showMyRoutes = signal(true);
	/** backlog/199 — a jelzés nélküli (`EGYEB`) utak halvány rétege kikapcsolható. */
	protected readonly showUnmarkedTrails = signal(true);
	/** backlog/200 — a 12-es zoom alatt a turistautak nem töltődnek be; ezt egy lebegő jelzés mondja meg. */
	protected readonly mapZoom = signal(HUNGARY_ZOOM);
	protected readonly trailsNeedZoom = computed(() => this.mapZoom() < MIN_TRAIL_SEGMENT_ZOOM);
	/** backlog/tura-utvonaltervezo/105-... 4. fázis — offline terület-letöltés panel; web buildben (nincs Filesystem-hozzáférés) a gomb el sem érhető. */
	protected readonly offlineCapable = Capacitor.isNativePlatform();
	protected readonly showOfflinePanel = signal(false);
	/** backlog/tura-utvonaltervezo/103-... 2.3 fázis — a draft() útvonalhoz tartozó, utoljára sikeresen kiszámolt metrika. */
	protected readonly metrics = signal<RouteMetricsResult | null>(null);
	/** backlog/204 — az alsó lebegő kártya: előnézet, a mód tippje, a piszkozat adatai — ha van mit mutatni. */
	protected readonly showCard = computed(
		() =>
			this.previewedCuratedRoute() !== null ||
			this.tappedTrails().length > 0 ||
			this.mode() !== 'none' ||
			this.metrics() !== null ||
			this.routeMetrics.loading() ||
			this.draft().length >= 2,
	);

	/** backlog/189 — az előnézet túrája, amíg a konténer átméreteződése még újraigazíthatja rá a nézetet. */
	private pendingPreviewFit: number[][] | null = null;
	private metricsRequestId = 0;
	private metricsDebounceHandle?: ReturnType<typeof setTimeout>;
	private dayMetricsRequestId = 0;
	private dayMetricsDebounceHandle?: ReturnType<typeof setTimeout>;
	private previewProfileRequestId = 0;
	/** backlog/213 — amíg a tárolt piszkozat be nem töltődött, az üres kezdőállapot nem írhatja felül. */
	private readonly draftRestored = signal(false);
	private draftPersistHandle?: ReturnType<typeof setTimeout>;
	private pendingDraftPersist: (() => void) | null = null;
	private actionToast?: HTMLIonToastElement;
	private destroyed = false;

	constructor() {
		effect(() => {
			const segments = this.trailSegments.segments();
			const source = this.map?.getSource(TRAIL_SEGMENTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(trailSegmentsToFeatureCollection(segments));
		});
		effect(() => {
			// backlog/212 — a szerkesztett útvonal régi vonala nem látszik a piszkozat alatt.
			const editing = this.editingRouteId();
			const routes = this.hikeRoutes.items().filter((route) => route.id !== editing);
			const source = this.map?.getSource(HIKE_ROUTES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(hikeRoutesToFeatureCollection(routes));
			const markers = this.map?.getSource(HIKE_ROUTE_MARKERS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			markers?.setData(hikeRouteMarkersToFeatureCollection(routes));
		});
		effect(() => {
			const draft = this.draftEditor.draft();
			const lineSource = this.map?.getSource(HIKE_ROUTE_DRAFT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			lineSource?.setData(draftRouteToFeatureCollection(draft.coordinates));
			const pointsSource = this.map?.getSource(HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			pointsSource?.setData(this.draftMarkers());
		});
		effect(() => {
			const start = this.autoStart();
			const source = this.map?.getSource(AUTO_ROUTE_START_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(routeMarkersToFeatureCollection(start ? [start] : []));
		});
		effect(() => {
			const preview = this.previewedCuratedRoute();
			const source = this.map?.getSource(CURATED_ROUTE_PREVIEW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(draftRouteToFeatureCollection(preview?.coordinates ?? []));
			const markers = this.map?.getSource(CURATED_ROUTE_PREVIEW_MARKERS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			markers?.setData(routeMarkersToFeatureCollection(preview?.coordinates ?? [], { dayEndIndexes: dayBreakIndexes(preview?.days) }));
		});
		effect(() => {
			// backlog/tura-utvonaltervezo/103-... 2.4 fázis — ha a draft változik (undo/clear), a most
			// már érvénytelen töréspontokat el kell dobni. backlog/190: napváltó csak kijelölt belső pont lehet.
			const interior = new Set(this.interiorWaypoints());
			this.dayBreaks.update((breaks) => breaks.filter((day) => interior.has(day.waypointIndex)));
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
		effect(() => {
			// backlog/209 — a nyitott piszkozat-lap napi értékei a napváltók minden változása után.
			const open = this.detailsSheet() === 'draft';
			const coordinates = this.draft();
			const breaks = this.dayBreaks();
			clearTimeout(this.dayMetricsDebounceHandle);
			const requestId = ++this.dayMetricsRequestId;
			if (!open || breaks.length === 0 || coordinates.length < 2) {
				this.draftDays.set(null);
				return;
			}
			const endIndexes = [...breaks.map((day) => day.waypointIndex), coordinates.length - 1];
			this.dayMetricsDebounceHandle = setTimeout(() => void this.refreshDayMetrics(coordinates, endIndexes, requestId), DAY_METRICS_DEBOUNCE_MS);
		});
		effect(() => {
			if (!this.draftRestored()) {
				return;
			}
			const draft = this.draftEditor.draft();
			const name = this.routeName();
			const dayBreaks = this.dayBreaks();
			const routeId = this.editingRouteId();
			clearTimeout(this.draftPersistHandle);
			this.pendingDraftPersist = () => {
				this.pendingDraftPersist = null;
				if (draft.coordinates.length === 0 && name.trim() === '') {
					void this.localState.clearDraft();
				} else {
					void this.localState.writeDraft({ coordinates: draft.coordinates, waypointIndexes: [...draft.waypointIndexes], name, dayBreaks, routeId });
				}
			};
			this.draftPersistHandle = setTimeout(() => this.pendingDraftPersist?.(), DRAFT_PERSIST_DEBOUNCE_MS);
		});
		void this.restoreDraft();
	}

	/** backlog/213 — a legutóbbi mentetlen piszkozat visszatöltése, ha közben még nem kezdett új rajzba a felhasználó. */
	private async restoreDraft(): Promise<void> {
		try {
			const stored = await this.localState.readDraft();
			if (stored !== null && !this.destroyed && this.draft().length === 0) {
				this.draftEditor.restore({ coordinates: stored.coordinates, waypointIndexes: stored.waypointIndexes });
				this.routeName.set(stored.name);
				this.dayBreaks.set(stored.dayBreaks);
				this.editingRouteId.set(stored.routeId ?? null);
			}
		} finally {
			this.draftRestored.set(true);
		}
	}

	ngAfterViewInit(): void {
		void this.hikeRoutes.load();
		registerOfflineTileProtocol();
		void this.initMap();
	}

	/** backlog/214 — a térkép ott nyílik, ahol legutóbb hagyták; első alkalommal az országnézeten. */
	private async initMap(): Promise<void> {
		const view = await this.localState.readMapView().catch(() => null);
		if (this.destroyed) {
			return;
		}
		if (view !== null) {
			if (view.basemap in BASEMAP_LAYER_IDS) {
				this.activeBasemap.set(view.basemap as Basemap);
			}
			this.showHillshade.set(view.hillshade);
			this.showMyRoutes.set(view.myRoutes ?? true);
			this.showUnmarkedTrails.set(view.unmarkedTrails ?? true);
		}

		const map = new maplibregl.Map({
			container: this.mapContainer().nativeElement,
			style: BASE_STYLE,
			center: view ? (view.center as [number, number]) : HUNGARY_CENTER,
			zoom: view?.zoom ?? HUNGARY_ZOOM,
		});
		map.addControl(new maplibregl.NavigationControl(), 'top-right');

		this.mapZoom.set(map.getZoom());
		map.on('zoomend', () => this.mapZoom.set(map.getZoom()));

		map.on('load', () => {
			registerTuraMapIcons(map);
			this.addTrailSegmentLayers(map);
			this.addHikeRouteLayers(map);
			this.addPreviewLayers(map);
			this.addDraftLayers(map);
			this.applyLayerVisibility(map);

			void this.loadCurrentViewport(map);
		});
		map.on('moveend', () => {
			void this.loadCurrentViewport(map);
			this.persistMapView();
		});
		map.on('click', (event) => {
			const point = [event.lngLat.lng, event.lngLat.lat];
			if (this.mode() === 'manual') {
				this.draftEditor.apply(withManualPoint(this.draftEditor.draft(), point));
			} else if (this.mode() === 'auto') {
				this.handleAutoModeClick(point);
			} else if (this.previewedCuratedRoute() === null) {
				this.handleMapTap(map, event.point);
			}
		});

		// MapLibre sizes its canvas from the container's dimensions at construction time. Inside an
		// Ionic page, ngAfterViewInit can fire mid page-transition (or before the flex/absolute layout
		// has settled), so the initial reading is sometimes a stale/small box — a ResizeObserver keeps
		// the canvas correct for that first layout pass and for any later container resize.
		this.resizeObserver = new ResizeObserver(() => {
			map.resize();
			if (this.pendingPreviewFit !== null && this.previewedCuratedRoute() !== null) {
				this.fitToCoordinates(this.pendingPreviewFit);
			}
		});
		// A felhasználó saját mozdítása után az előnézet-vágás már nem írja felül a nézetet.
		map.on('movestart', (event) => {
			if ('originalEvent' in event && event.originalEvent) {
				this.pendingPreviewFit = null;
			}
		});
		this.resizeObserver.observe(this.mapContainer().nativeElement);
		this.resizeObserver.observe(this.mapBottom().nativeElement);

		this.map = map;
	}

	/** backlog/192 — az oldal-átmenet végén a konténer már a végleges méretén van; a ResizeObserver erre nem mindig sül el. */
	ionViewDidEnter(): void {
		this.map?.resize();
	}

	ngOnDestroy(): void {
		this.destroyed = true;
		clearTimeout(this.metricsDebounceHandle);
		clearTimeout(this.dayMetricsDebounceHandle);
		// backlog/213 — az utolsó, még debounce-ban álló változás se vesszen el az elnavigáláskor.
		clearTimeout(this.draftPersistHandle);
		this.pendingDraftPersist?.();
		void this.actionToast?.dismiss();
		this.resizeObserver?.disconnect();
		this.map?.remove();
	}

	protected toggleDrawMode(): void {
		this.mode.update((current) => (current === 'manual' ? 'none' : 'manual'));
		this.autoStart.set(null);
		this.tappedTrails.set([]);
		this.hidePreviewWhenPlanning();
	}

	protected toggleAutoMode(): void {
		this.mode.update((current) => (current === 'auto' ? 'none' : 'auto'));
		this.autoStart.set(null);
		this.tappedTrails.set([]);
		this.hidePreviewWhenPlanning();
	}

	/**
	 * backlog/201 — alapállapotban egy koppintás: egy saját mentett útvonalon a kártyáját nyitja, egy
	 * turistaúton a jelzés és a túraútvonal nevét mutatja; üres helyen bezárja a turistaút-kártyát.
	 */
	private handleMapTap(map: maplibregl.Map, point: maplibregl.Point): void {
		const box: [maplibregl.PointLike, maplibregl.PointLike] = [
			[point.x - TAP_TOLERANCE_PX, point.y - TAP_TOLERANCE_PX],
			[point.x + TAP_TOLERANCE_PX, point.y + TAP_TOLERANCE_PX],
		];
		const routeLayers = this.showMyRoutes() ? [HIKE_ROUTES_LAYER_ID, HIKE_ROUTES_CASING_LAYER_ID] : [];
		const routeId = map.queryRenderedFeatures(box, { layers: routeLayers })[0]?.properties?.['routeId'] as string | undefined;
		const route = routeId === undefined ? undefined : this.hikeRoutes.items().find((candidate) => candidate.id === routeId);
		if (route !== undefined) {
			this.tappedTrails.set([]);
			this.openSavedRoute(route);
			return;
		}
		const layers = [TRAIL_SEGMENTS_LAYER_ID, TRAIL_SEGMENTS_CASING_LAYER_ID];
		if (this.showUnmarkedTrails()) {
			layers.push(TRAIL_SEGMENTS_UNMARKED_LAYER_ID);
		}
		const translate = (key: string, params?: Record<string, string>) => this.translate.instant(key, params) as string;
		const trails = new Map<string, TappedTrail>();
		for (const feature of map.queryRenderedFeatures(box, { layers })) {
			const symbol = String(feature.properties?.['symbol'] ?? '');
			const routeName = (feature.properties?.['routeName'] as string | null | undefined) || null;
			const key = `${symbol}|${routeName ?? ''}`;
			if (!trails.has(key) && trails.size < MAX_TAPPED_TRAILS) {
				trails.set(key, { label: trailSymbolLabel(symbol, translate), color: trailSegmentSymbolColor(symbol), routeName });
			}
		}
		this.tappedTrails.set([...trails.values()]);
	}

	/** backlog/189 — rajzolás / automatikus tervezés közben az ajánlott túra vonala csak zavarna. */
	private hidePreviewWhenPlanning(): void {
		if (this.mode() !== 'none') {
			this.previewedCuratedRoute.set(null);
		}
	}

	/** backlog/190 — egy lépés vissza: a félbehagyott automatikus kezdőpont, különben egy kézi pont vagy egy teljes szakasz. */
	protected undoLastStep(): void {
		if (this.autoStart() !== null) {
			this.autoStart.set(null);
			return;
		}
		const restored = this.draftEditor.undo();
		if (restored !== null) {
			// backlog/208, backlog/212 — a kuka vagy egy betöltés visszavonása: a vonallal együtt a név, a
			// napváltók és a szerkesztett útvonal is visszajön.
			this.applyDraftDetails(restored);
			void this.actionToast?.dismiss();
		} else if (this.draft().length === 0) {
			// Mindent visszavont: a név se maradjon ott egy már nem létező (pl. átvett) útvonalról.
			this.routeName.set('');
			this.editingRouteId.set(null);
		}
	}

	private currentDraftDetails(): DraftDetails {
		return { name: this.routeName(), dayBreaks: this.dayBreaks(), routeId: this.editingRouteId() };
	}

	private applyDraftDetails(details: DraftDetails): void {
		this.routeName.set(details.name);
		this.dayBreaks.set([...details.dayBreaks]);
		this.editingRouteId.set(details.routeId);
	}

	/** backlog/208 — a kuka egy visszavonható lépés; a toast „Visszavonás” gombja ugyanazt teszi, mint a visszavonás gomb. */
	protected clearDraft(): void {
		this.autoStart.set(null);
		if (this.draft().length === 0) {
			return;
		}
		this.draftEditor.clear(this.currentDraftDetails());
		this.applyDraftDetails({ name: '', dayBreaks: [], routeId: null });
		void this.showActionToast('TURA.CLEARED', 'TURA.UNDO', () => {
			if (this.draftEditor.lastStepIsClear()) {
				this.undoLastStep();
			}
		});
	}

	/** Rövid visszajelzés egy akciógombbal; egyszerre csak egy látszik (backlog/208, backlog/211). */
	private async showActionToast(messageKey: string, actionKey: string, action: () => void): Promise<void> {
		await this.actionToast?.dismiss();
		const toast = await this.toastController.create({
			message: this.translate.instant(messageKey),
			duration: ACTION_TOAST_DURATION_MS,
			// A fülsáv fölött, hogy a toast eltűnése után egy késve érkező koppintás ne egy fülre essen.
			positionAnchor: document.querySelector<HTMLElement>('ion-tab-bar') ?? undefined,
			buttons: [{ text: this.translate.instant(actionKey), handler: action }],
		});
		this.actionToast = toast;
		if (this.destroyed) {
			return;
		}
		await toast.present();
	}

	/** backlog/209 — a piszkozat kártyája: statisztika, profil és a napok szerkesztése, a térkép mellett. */
	protected openDraftDetails(): void {
		this.detailsSheet.set('draft');
	}

	/** backlog/212 — egy mentett útvonal kártyája; a térkép az útvonalra ugrik, a lap fölé. */
	protected openSavedRoute(route: HikeRoute): void {
		this.tappedTrails.set([]);
		this.selectedRouteId.set(route.id);
		this.detailsSheet.set('saved');
		this.showRoutesPanel.set(false);
		this.flyToRoute(route);
	}

	/** backlog/218 — az ajánlott túra kártyája: a katalógus értékei, és az eszközön számolt profil. */
	protected openPreviewDetails(): void {
		const route = this.previewedCuratedRoute();
		if (route === null) {
			return;
		}
		this.detailsSheet.set('preview');
		this.pendingPreviewFit = null;
		this.fitToCoordinates(route.coordinates);
		if (this.previewProfile() === null && !this.previewProfileLoading()) {
			void this.loadPreviewProfile(route);
		}
	}

	private async loadPreviewProfile(route: CuratedRoute): Promise<void> {
		const requestId = ++this.previewProfileRequestId;
		this.previewProfileLoading.set(true);
		try {
			const result = await this.routeMetrics.compute(route.coordinates);
			if (requestId === this.previewProfileRequestId) {
				this.previewProfile.set(result.profile);
			}
		} catch {
			// Nincs profil (pl. internet nélkül): a kártya ezt kiírja.
		} finally {
			if (requestId === this.previewProfileRequestId) {
				this.previewProfileLoading.set(false);
			}
		}
	}

	protected closeDetails(): void {
		this.detailsSheet.set(null);
		this.selectedRouteId.set(null);
	}

	/**
	 * backlog/212 — a mentett útvonal a piszkozatba kerül (egy visszavonható lépés); a mentés ugyanarra
	 * az id-re ír. A vonal kijelölt pontjai a két vég és a napváltók (a mentett útvonal a többit nem őrzi).
	 */
	protected editSavedRoute(route: HikeRoute): void {
		const breaks = (route.days ?? []).slice(0, -1).map((day) => ({ waypointIndex: day.endWaypointIndex, overnightName: day.overnightName ?? '' }));
		this.closeDetails();
		this.tappedTrails.set([]);
		this.mode.set('none');
		this.autoStart.set(null);
		this.previewedCuratedRoute.set(null);
		this.draftEditor.replace(routeDraftFromPath(route.coordinates, breaks.map((day) => day.waypointIndex)), this.currentDraftDetails());
		this.applyDraftDetails({ name: route.name, dayBreaks: breaks, routeId: route.id });
		this.flyToRoute(route);
	}

	protected async renameSavedRoute(route: HikeRoute): Promise<void> {
		const alert = await this.alertController.create({
			header: this.translate.instant('TURA.RENAME_TITLE'),
			inputs: [{ name: 'name', type: 'text', value: route.name, placeholder: this.translate.instant('TURA.ROUTE_NAME_PLACEHOLDER') }],
			buttons: [
				{ text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
				{
					text: this.translate.instant('COMMON.SAVE'),
					handler: (data: { name?: string }) => {
						const name = data.name?.trim() ?? '';
						if (name === '') {
							return false;
						}
						void this.hikeRoutes.rename(route, name);
						return true;
					},
				},
			],
		});
		await alert.present();
	}

	/** backlog/212 — a lista sora: táv, ↑ és a létrehozás dátuma (ha van). */
	protected routeSummary(route: HikeRoute): string {
		const parts = [this.formatDistance(route.distanceMeters), `↑${this.formatElevation(route.elevationGainMeters)}`];
		const date = this.routeDate(route);
		if (date !== null) {
			parts.push(date);
		}
		return parts.join(' · ');
	}

	protected routeDate(route: HikeRoute): string | null {
		return route.createdAt ? dateText(route.createdAt, this.language.activeLanguage()) : null;
	}

	/** A még nem használt kijelölt belső pontok (backlog/190), plusz a sor jelenlegi értéke — ez kerül az ion-select opciói közé. */
	protected availableWaypointIndexes(currentValue: number): number[] {
		const used = new Set(this.dayBreaks().map((day) => day.waypointIndex));
		used.delete(currentValue);
		return this.interiorWaypoints().filter((index) => !used.has(index));
	}

	/** A koordináta-index helyett a kijelölt pont sorszáma (1 = kezdőpont), ahogy a térképen látszik. */
	protected waypointNumber(index: number): number {
		return this.draftEditor.draft().waypointIndexes.indexOf(index) + 1;
	}

	/** backlog/209 — a pont helye az indulástól mérve, hogy a választóban kiderüljön, melyik pont az. */
	protected waypointDistance(index: number): string {
		return this.formatDistance(polylineLengthMeters(this.draft().slice(0, index + 1)));
	}

	protected addDayBreak(): void {
		const index = this.availableWaypointIndexes(-1)[0];
		if (index !== undefined) {
			this.dayBreaks.update((breaks) => [...breaks, { waypointIndex: index, overnightName: '' }].sort((a, b) => a.waypointIndex - b.waypointIndex));
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
		this.tappedTrails.set([]);
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
		this.previewedCuratedRoute.set(route);
		this.previewProfile.set(null);
		this.previewProfileLoading.set(false);
		this.previewProfileRequestId++;
		this.tappedTrails.set([]);
		this.showCatalogPanel.set(false);
		// backlog/189, backlog/206 — az előnézet és a tervezés kizárja egymást: egy koppintás ne a
		// piszkozatot folytassa, amíg az ajánlott túrát nézed.
		this.mode.set('none');
		this.autoStart.set(null);
		if (route.coordinates.length === 0) {
			return;
		}
		// backlog/189, backlog/204 — az előnézet-kártya a lebegő alsó sávba kerül, és csak a következő
		// renderelés után van meg a magassága. A ResizeObserver addig újraigazít, amíg a felhasználó meg nem
		// mozdítja a térképet (ld. ngAfterViewInit).
		this.pendingPreviewFit = route.coordinates;
		this.fitToCoordinates(route.coordinates);
	}

	private fitToCoordinates(coordinates: number[][]): void {
		if (!this.map) {
			return;
		}
		const lons = coordinates.map((coordinate) => coordinate[0]);
		const lats = coordinates.map((coordinate) => coordinate[1]);
		this.map.fitBounds(
			[
				[Math.min(...lons), Math.min(...lats)],
				[Math.max(...lons), Math.max(...lats)],
			],
			{ padding: this.fitPadding(), animate: false },
		);
	}

	/**
	 * backlog/204 — a vonal a lebegő gombok és az alsó kártya közötti szabad részre kerüljön; nyitott
	 * útvonal-kártyánál (backlog/212) a félmagas lap fölé.
	 */
	private fitPadding(): maplibregl.PaddingOptions {
		const container = this.mapContainer().nativeElement.getBoundingClientRect();
		const actions = this.mapActions().nativeElement.getBoundingClientRect();
		const margin = 24;
		const coveredFrom =
			this.detailsSheet() === null ? this.mapBottom().nativeElement.getBoundingClientRect().top : window.innerHeight * (1 - DETAILS_SHEET_BREAKPOINT);
		return {
			top: Math.max(margin, actions.bottom - container.top + margin / 2),
			bottom: Math.max(margin, container.bottom - coveredFrom + margin / 2),
			left: margin,
			right: margin,
		};
	}

	/** backlog/189 — a tipp-sáv „Előnézet bezárása” gombja. */
	protected closePreview(): void {
		this.previewedCuratedRoute.set(null);
		if (this.detailsSheet() === 'preview') {
			this.closeDetails();
		}
	}

	/**
	 * backlog/189 — az ajánlott túra a saját rajzom lesz (egy visszavonható lépés): a vonala, a neve (ha
	 * még nincs) és a napváltói. A napváltók koordináta-indexei kijelölt pontok lesznek, hogy a napok
	 * panelen választhatók maradjanak (backlog/190).
	 */
	protected adoptPreview(): void {
		const route = this.previewedCuratedRoute();
		if (route === null) {
			return;
		}
		const breaks = (route.days ?? []).slice(0, -1).map((day) => ({ waypointIndex: day.endWaypointIndex, overnightName: day.overnightName ?? '' }));
		this.mode.set('none');
		this.autoStart.set(null);
		// backlog/212 — egy csere-lépés: a visszavonása a korábbi rajz nevét és napváltóit is visszaadja.
		this.draftEditor.replace(routeDraftFromPath(route.coordinates, breaks.map((day) => day.waypointIndex)), this.currentDraftDetails());
		this.applyDraftDetails({ name: route.name, dayBreaks: breaks, routeId: null });
		this.closePreview();
	}

	protected toggleLayersPanel(): void {
		this.showLayersPanel.update((open) => !open);
	}

	protected setBasemap(basemap: Basemap): void {
		this.activeBasemap.set(basemap);
		if (this.map) {
			this.applyLayerVisibility(this.map);
		}
		this.persistMapView();
	}

	protected toggleHillshade(visible: boolean): void {
		this.showHillshade.set(visible);
		if (this.map) {
			this.applyLayerVisibility(this.map);
		}
		this.persistMapView();
	}

	/** backlog/202 */
	protected toggleMyRoutes(visible: boolean): void {
		this.showMyRoutes.set(visible);
		if (this.map) {
			this.applyLayerVisibility(this.map);
		}
		this.persistMapView();
	}

	/** backlog/199 */
	protected toggleUnmarkedTrails(visible: boolean): void {
		this.showUnmarkedTrails.set(visible);
		if (this.map) {
			this.applyLayerVisibility(this.map);
		}
		this.persistMapView();
	}

	/** A kiválasztott alaptérkép, a domborzat-árnyékolás és a kapcsolható rétegek láthatósága. */
	private applyLayerVisibility(map: maplibregl.Map): void {
		const visibility = (visible: boolean) => (visible ? 'visible' : 'none');
		const basemap = this.activeBasemap();
		for (const [id, layerId] of Object.entries(BASEMAP_LAYER_IDS)) {
			map.setLayoutProperty(layerId, 'visibility', visibility(id === basemap));
		}
		map.setLayoutProperty(HILLSHADE_LAYER_ID, 'visibility', visibility(this.showHillshade()));
		for (const layerId of MY_ROUTES_LAYER_IDS) {
			map.setLayoutProperty(layerId, 'visibility', visibility(this.showMyRoutes()));
		}
		map.setLayoutProperty(TRAIL_SEGMENTS_UNMARKED_LAYER_ID, 'visibility', visibility(this.showUnmarkedTrails()));
	}

	/**
	 * backlog/198, backlog/199 — a jelzett utak a jelzés színében, fehér kontúrral (a szatellitképen is
	 * látszanak); a jelzés nélküli utak alattuk, vékony, halvány szürke vonalként. A raszteres alaptérkép
	 * feliratai alá nem kerülhetnek (a felirat a csempe része), ezért a jelzés nélküli réteg félig átlátszó.
	 */
	private addTrailSegmentLayers(map: maplibregl.Map): void {
		map.addSource(TRAIL_SEGMENTS_SOURCE_ID, { type: 'geojson', data: trailSegmentsToFeatureCollection([]) });
		map.addLayer({
			id: TRAIL_SEGMENTS_UNMARKED_LAYER_ID,
			type: 'line',
			source: TRAIL_SEGMENTS_SOURCE_ID,
			minzoom: MIN_TRAIL_SEGMENT_ZOOM,
			filter: ['!', ['get', 'marked']],
			layout: LINE_LAYOUT,
			paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.6 },
		});
		map.addLayer({
			id: TRAIL_SEGMENTS_CASING_LAYER_ID,
			type: 'line',
			source: TRAIL_SEGMENTS_SOURCE_ID,
			minzoom: MIN_TRAIL_SEGMENT_ZOOM,
			filter: ['get', 'marked'],
			layout: LINE_LAYOUT,
			paint: { 'line-color': ['get', 'casing'], 'line-width': 5, 'line-opacity': 0.8 },
		});
		map.addLayer({
			id: TRAIL_SEGMENTS_LAYER_ID,
			type: 'line',
			source: TRAIL_SEGMENTS_SOURCE_ID,
			minzoom: MIN_TRAIL_SEGMENT_ZOOM,
			filter: ['get', 'marked'],
			layout: LINE_LAYOUT,
			paint: { 'line-color': ['get', 'color'], 'line-width': 3 },
		});
	}

	/**
	 * backlog/197, backlog/202, backlog/203 — a saját útvonal magenta, fehér kontúrral (egyik MTSZ
	 * jelzésszínnel sem téveszthető össze), irány-nyilakkal, indulás / cél / napváltó jelölővel, és
	 * közelről a nevével.
	 */
	private addHikeRouteLayers(map: maplibregl.Map): void {
		map.addSource(HIKE_ROUTES_SOURCE_ID, { type: 'geojson', data: hikeRoutesToFeatureCollection(this.hikeRoutes.items()) });
		map.addLayer({
			id: HIKE_ROUTES_CASING_LAYER_ID,
			type: 'line',
			source: HIKE_ROUTES_SOURCE_ID,
			layout: LINE_LAYOUT,
			paint: { 'line-color': ROUTE_CASING_COLOR, 'line-width': 8 },
		});
		map.addLayer({
			id: HIKE_ROUTES_LAYER_ID,
			type: 'line',
			source: HIKE_ROUTES_SOURCE_ID,
			layout: LINE_LAYOUT,
			paint: { 'line-color': ROUTE_COLOR, 'line-width': 5 },
		});
		map.addLayer(arrowLayer(HIKE_ROUTES_ARROWS_LAYER_ID, HIKE_ROUTES_SOURCE_ID, ICON_ARROW_LIGHT));
		map.addLayer({
			id: HIKE_ROUTES_LABEL_LAYER_ID,
			type: 'symbol',
			source: HIKE_ROUTES_SOURCE_ID,
			minzoom: ROUTE_LABEL_MIN_ZOOM,
			layout: {
				'symbol-placement': 'line',
				'symbol-spacing': 300,
				'icon-image': ['get', 'label'],
				'icon-rotation-alignment': 'map',
				'icon-keep-upright': true,
				'icon-offset': [0, -12],
			},
		});
		map.addSource(HIKE_ROUTE_MARKERS_SOURCE_ID, { type: 'geojson', data: hikeRouteMarkersToFeatureCollection(this.hikeRoutes.items()) });
		map.addLayer(markerLayer(HIKE_ROUTE_MARKERS_LAYER_ID, HIKE_ROUTE_MARKERS_SOURCE_ID));
	}

	/** backlog/197 — a katalógus-előnézet fekete kontúros fehér vonal: sem jelzés-, sem saját útvonal-színű. */
	private addPreviewLayers(map: maplibregl.Map): void {
		map.addSource(CURATED_ROUTE_PREVIEW_SOURCE_ID, { type: 'geojson', data: draftRouteToFeatureCollection([]) });
		map.addLayer({
			id: CURATED_ROUTE_PREVIEW_CASING_LAYER_ID,
			type: 'line',
			source: CURATED_ROUTE_PREVIEW_SOURCE_ID,
			layout: LINE_LAYOUT,
			paint: { 'line-color': PREVIEW_CASING_COLOR, 'line-width': 8 },
		});
		map.addLayer({
			id: CURATED_ROUTE_PREVIEW_LAYER_ID,
			type: 'line',
			source: CURATED_ROUTE_PREVIEW_SOURCE_ID,
			layout: LINE_LAYOUT,
			paint: { 'line-color': PREVIEW_COLOR, 'line-width': 4 },
		});
		map.addLayer(arrowLayer(CURATED_ROUTE_PREVIEW_ARROWS_LAYER_ID, CURATED_ROUTE_PREVIEW_SOURCE_ID, ICON_ARROW_DARK));
		map.addSource(CURATED_ROUTE_PREVIEW_MARKERS_SOURCE_ID, { type: 'geojson', data: routeMarkersToFeatureCollection([]) });
		map.addLayer(markerLayer(CURATED_ROUTE_PREVIEW_MARKERS_LAYER_ID, CURATED_ROUTE_PREVIEW_MARKERS_SOURCE_ID));
	}

	/** backlog/197 — a piszkozat a saját útvonal színe, szaggatottan; a pontjai a backlog/203 jelölői. */
	private addDraftLayers(map: maplibregl.Map): void {
		map.addSource(HIKE_ROUTE_DRAFT_SOURCE_ID, { type: 'geojson', data: draftRouteToFeatureCollection(this.draft()) });
		map.addLayer({
			id: HIKE_ROUTE_DRAFT_CASING_LAYER_ID,
			type: 'line',
			source: HIKE_ROUTE_DRAFT_SOURCE_ID,
			layout: LINE_LAYOUT,
			paint: { 'line-color': ROUTE_CASING_COLOR, 'line-width': 7 },
		});
		map.addLayer({
			id: HIKE_ROUTE_DRAFT_LAYER_ID,
			type: 'line',
			source: HIKE_ROUTE_DRAFT_SOURCE_ID,
			layout: { 'line-join': 'round' },
			paint: { 'line-color': ROUTE_COLOR, 'line-width': 4, 'line-dasharray': [2, 1.5] },
		});
		map.addLayer(arrowLayer(HIKE_ROUTE_DRAFT_ARROWS_LAYER_ID, HIKE_ROUTE_DRAFT_SOURCE_ID, ICON_ARROW_LIGHT));
		map.addSource(HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID, { type: 'geojson', data: this.draftMarkers() });
		map.addLayer(markerLayer(HIKE_ROUTE_DRAFT_POINTS_LAYER_ID, HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID));
		map.addSource(AUTO_ROUTE_START_SOURCE_ID, { type: 'geojson', data: routeMarkersToFeatureCollection([]) });
		map.addLayer(markerLayer(AUTO_ROUTE_START_LAYER_ID, AUTO_ROUTE_START_SOURCE_ID));
	}

	/** backlog/203 — a piszkozat jelölői: indulás, cél, napváltók és a többi kijelölt pont. */
	private draftMarkers(): GeoJSON.FeatureCollection<GeoJSON.Point> {
		const draft = this.draftEditor.draft();
		return routeMarkersToFeatureCollection(draft.coordinates, {
			dayEndIndexes: this.dayBreaks().map((day) => day.waypointIndex),
			waypointIndexes: draft.waypointIndexes,
		});
	}

	/** backlog/214 — a nézet minden mozdulat végén és alaptérkép-váltáskor eszközön megmarad. */
	private persistMapView(): void {
		if (!this.map) {
			return;
		}
		const center = this.map.getCenter();
		const view: StoredTuraMapView = {
			center: [center.lng, center.lat],
			zoom: this.map.getZoom(),
			basemap: this.activeBasemap(),
			hillshade: this.showHillshade(),
			myRoutes: this.showMyRoutes(),
			unmarkedTrails: this.showUnmarkedTrails(),
		};
		void this.localState.writeMapView(view);
	}

	protected toggleOfflinePanel(): void {
		this.showOfflinePanel.update((open) => !open);
	}

	protected formatOfflineSize(bytes: number): string {
		return megabytesText(bytes, this.language.activeLanguage());
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
		// backlog/206 — egy meglévő vonalat a vége folytat; üres rajznál az első koppintás a kezdőpont.
		const coordinates = this.draft();
		const start = coordinates.length > 0 ? coordinates[coordinates.length - 1] : this.autoStart();
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
			const alert = await this.alertController.create({
				header: this.translate.instant('TURA.ROUTE_NOT_FOUND_TITLE'),
				message: this.translate.instant('TURA.ROUTE_NOT_FOUND_MESSAGE'),
				buttons: [this.translate.instant('COMMON.OK')],
			});
			await alert.present();
			return;
		}
		// backlog/206 — a mód bekapcsolva marad: a következő koppintás innen tervez tovább.
		this.draftEditor.apply(withPath(this.draftEditor.draft(), result.coordinates));
	}

	protected async saveDraft(): Promise<void> {
		const name = this.routeName().trim();
		if (name === '' || this.draft().length < 2) {
			return;
		}
		const { metrics, days } = await this.metricsForSave();
		const saved = await this.hikeRoutes.save({
			// backlog/212 — egy szerkesztett mentett útvonal ugyanarra az id-re íródik.
			id: this.editingRouteId() ?? undefined,
			name,
			coordinates: this.draft(),
			distanceMeters: metrics?.distanceMeters,
			elevationGainMeters: metrics?.elevationGainMeters ?? undefined,
			elevationLossMeters: metrics?.elevationLossMeters ?? undefined,
			estimatedDurationMinutes: metrics?.estimatedDurationMinutes ?? undefined,
			elevationProfile: metrics?.profile ?? undefined,
			days,
		});
		this.draftEditor.reset();
		this.applyDraftDetails({ name: '', dayBreaks: [], routeId: null });
		this.mode.set('none');
		if (this.detailsSheet() === 'draft') {
			this.closeDetails();
		}
		// backlog/211, backlog/212 — a mentés látható visszajelzése; a „Megnyitás” az útvonal kártyáját nyitja.
		void this.showActionToast('TURA.SAVED', 'TURA.SAVED_OPEN', () => this.openSavedRoute(saved));
	}

	/**
	 * backlog/tura-utvonaltervezo/103-... 2.4 fázis — napra bontás nélkül a már kiszámolt route-metrika
	 * megy mentésre. Töréspontokkal (dayBreaks) a mentendő HikeRouteDay lista is felépül, és a route- és
	 * a napi metrika egyetlen magasság-mintasorból számolódik (backlog/188), így a napi ↑/↓ összege
	 * pontosan a teljes érték. backlog/151: eszközön — a táv mindig megvan, a magasság-függő mezők
	 * internet nélkül `null`.
	 */
	private async metricsForSave(): Promise<{ metrics: RouteMetricsResult | null; days: HikeRouteDay[] | undefined }> {
		const breaks = this.dayBreaks();
		if (breaks.length === 0) {
			return { metrics: this.metrics(), days: undefined };
		}
		const coordinates = this.draft();
		const endIndexes = [...breaks.map((day) => day.waypointIndex), coordinates.length - 1];
		const { route, days } = await this.routeMetrics.computeWithDays(coordinates, endIndexes);
		return {
			metrics: route,
			days: days.map((day, i) => ({
				endWaypointIndex: endIndexes[i],
				overnightName: breaks[i]?.overnightName.trim() || null,
				distanceMeters: day.distanceMeters,
				elevationGainMeters: day.elevationGainMeters,
				elevationLossMeters: day.elevationLossMeters,
				estimatedDurationMinutes: day.estimatedDurationMinutes,
			})),
		};
	}

	/** backlog/tura-utvonaltervezo/103-... 2.3 fázis; backlog/151 — eszközön számolva: a táv mindig megvan, a magasság-függő mezők internet nélkül `null` (`~`). */
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

	/** backlog/209 */
	private async refreshDayMetrics(coordinates: number[][], endIndexes: number[], requestId: number): Promise<void> {
		try {
			const { days } = await this.routeMetrics.computeWithDays(coordinates, endIndexes);
			if (requestId === this.dayMetricsRequestId) {
				this.draftDays.set(days);
			}
		} catch {
			if (requestId === this.dayMetricsRequestId) {
				this.draftDays.set(null);
			}
		}
	}

	/** backlog/151 — `null` = nem számolható (pl. internet nélkül nincs magassági adat) → `~`, soha nem `0` (Backend-offline first §14). */
	protected formatDistance(meters: number | null | undefined): string {
		return distanceText(meters, this.language.activeLanguage());
	}

	protected formatElevation(meters: number | null | undefined): string {
		return elevationText(meters, this.language.activeLanguage());
	}

	protected toggleRoutesPanel(): void {
		this.tappedTrails.set([]);
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
			{ padding: this.fitPadding() },
		);
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
		if (map.getZoom() < MIN_TRAIL_SEGMENT_ZOOM) {
			return;
		}
		const bounds = map.getBounds();
		const bbox: Bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
		await this.trailSegments.loadBbox(COUNTRY_CODE, bbox);
	}
}

/** backlog/203 — irány-nyilak a vonal mentén (a nyíl-kép a vonal irányába fordul). */
function arrowLayer(id: string, source: string, icon: string): maplibregl.SymbolLayerSpecification {
	return {
		id,
		type: 'symbol',
		source,
		layout: {
			'symbol-placement': 'line',
			'symbol-spacing': ARROW_SPACING_PX,
			'icon-image': icon,
			'icon-rotation-alignment': 'map',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
		},
	};
}

/** backlog/219 — egy mentett / ajánlott útvonal napváltóinak távolsága az indulástól (az utolsó nap vége a cél, nem jelölő). */
function routeDayMarkerDistances(route: { coordinates: number[][]; days?: HikeRouteDay[] | null } | null): number[] {
	const days = route?.days ?? [];
	if (route === null || days.length < 2) {
		return [];
	}
	return distancesAlongRoute(
		route.coordinates,
		days.slice(0, -1).map((day) => day.endWaypointIndex),
	);
}

/** backlog/203 — pont-jelölők: a feature `icon` / `sortKey` tulajdonságából. */
function markerLayer(id: string, source: string): maplibregl.SymbolLayerSpecification {
	return {
		id,
		type: 'symbol',
		source,
		layout: {
			'icon-image': ['get', 'icon'],
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'symbol-sort-key': ['get', 'sortKey'],
		},
	};
}

import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, signal, viewChild } from '@angular/core';
import {
	AlertController,
	IonBackButton,
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
	IonTitle,
	IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import maplibregl from 'maplibre-gl';

import { HikeRoute } from '../../../api/model/hikeRoute';
import { Bbox, TrailSegmentRepository } from '../../../core/data/trail-segment.repository';
import { HikeRouteRepository } from '../../../core/data/hike-route.repository';
import { draftRouteToFeatureCollection, draftWaypointsToFeatureCollection, hikeRoutesToFeatureCollection } from './hike-routes-geojson';
import { trailSegmentSymbolColor } from './trail-segment-symbol-color';
import { trailSegmentsToFeatureCollection } from './trail-segments-geojson';

const TRAIL_SEGMENTS_SOURCE_ID = 'trail-segments';
const TRAIL_SEGMENTS_LAYER_ID = 'trail-segments-layer';
const HIKE_ROUTES_SOURCE_ID = 'hike-routes';
const HIKE_ROUTES_LAYER_ID = 'hike-routes-layer';
const HIKE_ROUTE_DRAFT_SOURCE_ID = 'hike-route-draft';
const HIKE_ROUTE_DRAFT_LAYER_ID = 'hike-route-draft-layer';
const HIKE_ROUTE_DRAFT_POINTS_SOURCE_ID = 'hike-route-draft-points';
const HIKE_ROUTE_DRAFT_POINTS_LAYER_ID = 'hike-route-draft-points-layer';

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
		IonButton,
		IonIcon,
		IonInput,
		IonList,
		IonItem,
		IonLabel,
		IonModal,
		IonContent,
		TranslatePipe,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuraPage implements AfterViewInit, OnDestroy {
	private readonly trailSegments = inject(TrailSegmentRepository);
	protected readonly hikeRoutes = inject(HikeRouteRepository);
	private readonly alertController = inject(AlertController);
	private readonly translate = inject(TranslateService);
	private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

	private map?: maplibregl.Map;
	private resizeObserver?: ResizeObserver;

	protected readonly drawMode = signal(false);
	/** [lon, lat] waypoints picked so far, in click order. */
	protected readonly draft = signal<number[][]>([]);
	protected readonly routeName = signal('');
	protected readonly showRoutesPanel = signal(false);

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

			void this.loadCurrentViewport(map);
		});
		map.on('moveend', () => void this.loadCurrentViewport(map));
		map.on('click', (event) => {
			if (!this.drawMode()) {
				return;
			}
			this.draft.update((coordinates) => [...coordinates, [event.lngLat.lng, event.lngLat.lat]]);
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
		this.resizeObserver?.disconnect();
		this.map?.remove();
	}

	protected toggleDrawMode(): void {
		this.drawMode.update((active) => !active);
	}

	protected undoLastWaypoint(): void {
		this.draft.update((coordinates) => coordinates.slice(0, -1));
	}

	protected clearDraft(): void {
		this.draft.set([]);
		this.routeName.set('');
	}

	protected async saveDraft(): Promise<void> {
		const name = this.routeName().trim();
		if (name === '' || this.draft().length < 2) {
			return;
		}
		await this.hikeRoutes.save({ name, coordinates: this.draft() });
		this.draft.set([]);
		this.routeName.set('');
		this.drawMode.set(false);
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

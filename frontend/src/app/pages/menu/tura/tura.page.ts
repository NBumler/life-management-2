import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, viewChild } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import maplibregl from 'maplibre-gl';

import { Bbox, TrailSegmentRepository } from '../../../core/data/trail-segment.repository';
import { trailSegmentSymbolColor } from './trail-segment-symbol-color';
import { trailSegmentsToFeatureCollection } from './trail-segments-geojson';

const TRAIL_SEGMENTS_SOURCE_ID = 'trail-segments';
const TRAIL_SEGMENTS_LAYER_ID = 'trail-segments-layer';

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
 */
@Component({
	selector: 'app-tura',
	templateUrl: 'tura.page.html',
	styleUrl: 'tura.page.scss',
	imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuraPage implements AfterViewInit, OnDestroy {
	private readonly trailSegments = inject(TrailSegmentRepository);
	private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

	private map?: maplibregl.Map;
	private resizeObserver?: ResizeObserver;

	constructor() {
		effect(() => {
			const segments = this.trailSegments.segments();
			const source = this.map?.getSource(TRAIL_SEGMENTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
			source?.setData(trailSegmentsToFeatureCollection(segments, trailSegmentSymbolColor));
		});
	}

	ngAfterViewInit(): void {
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
			void this.loadCurrentViewport(map);
		});
		map.on('moveend', () => void this.loadCurrentViewport(map));

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

	private async loadCurrentViewport(map: maplibregl.Map): Promise<void> {
		const bounds = map.getBounds();
		const bbox: Bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
		await this.trailSegments.loadBbox(COUNTRY_CODE, bbox);
	}
}

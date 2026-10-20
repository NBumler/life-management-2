import maplibregl from 'maplibre-gl';

import { ICON_MY_LOCATION } from './map-icons';

const MY_LOCATION_SOURCE_ID = 'my-location';
const MY_LOCATION_LAYER_ID = 'my-location-layer';
/** A helyzetre ugráskor legalább ekkora zoom, hogy a turistautak (12-es zoomtól) látsszanak. */
export const MY_LOCATION_MIN_ZOOM = 14;

/**
 * backlog/215 — „Saját helyzetem” gomb a MapLibre +/− / iránytű vezérlő alatt, ugyanabban a
 * stílusban (ikon-gomb, `aria-label` + `title`, mint a zoom-gombok). A helymeghatározás a page-é;
 * ez csak a gombot és a kék pontot kezeli. Követés nincs: a pont az utolsó egyszeri helyzet.
 */
export class MyLocationControl implements maplibregl.IControl {
	private container?: HTMLDivElement;
	private button?: HTMLButtonElement;

	constructor(
		private label: string,
		private readonly onClick: () => void,
	) {}

	onAdd(): HTMLElement {
		const container = document.createElement('div');
		container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'tura-my-location';
		const icon = document.createElement('ion-icon');
		icon.setAttribute('name', 'locate-outline');
		icon.setAttribute('aria-hidden', 'true');
		button.appendChild(icon);
		button.addEventListener('click', () => this.onClick());
		container.appendChild(button);
		this.container = container;
		this.button = button;
		this.setLabel(this.label);
		return container;
	}

	onRemove(): void {
		this.container?.remove();
		this.container = undefined;
		this.button = undefined;
	}

	setLabel(label: string): void {
		this.label = label;
		this.button?.setAttribute('aria-label', label);
		this.button?.setAttribute('title', label);
	}

	/** Helymeghatározás közben a gomb lüktet és nem nyomható újra. */
	setBusy(busy: boolean): void {
		if (this.button) {
			this.button.disabled = busy;
			this.button.classList.toggle('locating', busy);
		}
	}
}

/** A kék pont rétege; minden más réteg fölött, hogy egy útvonal se takarja. */
export function addMyLocationLayer(map: maplibregl.Map): void {
	map.addSource(MY_LOCATION_SOURCE_ID, { type: 'geojson', data: myLocationFeatureCollection(null) });
	map.addLayer({
		id: MY_LOCATION_LAYER_ID,
		type: 'symbol',
		source: MY_LOCATION_SOURCE_ID,
		layout: { 'icon-image': ICON_MY_LOCATION, 'icon-allow-overlap': true, 'icon-ignore-placement': true },
	});
}

export function showMyLocation(map: maplibregl.Map, point: [number, number] | null): void {
	(map.getSource(MY_LOCATION_SOURCE_ID) as maplibregl.GeoJSONSource | undefined)?.setData(myLocationFeatureCollection(point));
}

export function myLocationFeatureCollection(point: [number, number] | null): GeoJSON.FeatureCollection<GeoJSON.Point> {
	return {
		type: 'FeatureCollection',
		features: point === null ? [] : [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: point } }],
	};
}

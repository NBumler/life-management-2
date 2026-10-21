import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonItem, IonLabel, IonList, IonListHeader, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ICON_ARROW_LIGHT, ICON_END, ICON_MY_LOCATION, ICON_START, ICON_WAYPOINT, PREVIEW_CASING_COLOR, PREVIEW_COLOR, ROUTE_CASING_COLOR, ROUTE_COLOR, TRACK_CASING_COLOR, TRACK_COLOR, dayIconName, iconDataUrl } from './map-icons';
import { MARKING_COLORS, UNMARKED_TRAIL_COLOR, trailSegmentCasingColor } from './trail-segment-symbol-color';

interface LineEntry {
	labelKey: string;
	color: string;
	casing: string;
	width: number;
	dashed?: boolean;
}

/**
 * backlog/196 — a túra térkép jelmagyarázata: minden vonal- és pontstílus, a térképpel azonos
 * színekkel és ikonokkal (map-icons.ts, trail-segment-symbol-color.ts). A Rétegek panel alján és
 * a „Közelíts rá” jelzés melletti „i” gombbal nyíló lapon jelenik meg.
 */
@Component({
	selector: 'app-tura-legend',
	templateUrl: 'tura-legend.component.html',
	styleUrls: ['tura-legend.component.scss'],
	imports: [IonList, IonListHeader, IonItem, IonLabel, IonNote, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuraLegendComponent {
	protected readonly markings: LineEntry[] = Object.entries(MARKING_COLORS).map(([name, color]) => ({
		labelKey: `TURA.LEGEND.MARKING.${name}`,
		color,
		casing: trailSegmentCasingColor(name),
		width: 3,
	}));

	protected readonly lines: LineEntry[] = [
		{ labelKey: 'TURA.LEGEND.UNMARKED', color: UNMARKED_TRAIL_COLOR, casing: 'transparent', width: 2 },
		{ labelKey: 'TURA.LEGEND.MY_ROUTE', color: ROUTE_COLOR, casing: ROUTE_CASING_COLOR, width: 5 },
		{ labelKey: 'TURA.LEGEND.DRAFT', color: ROUTE_COLOR, casing: ROUTE_CASING_COLOR, width: 4, dashed: true },
		{ labelKey: 'TURA.LEGEND.PREVIEW', color: PREVIEW_COLOR, casing: PREVIEW_CASING_COLOR, width: 4 },
		{ labelKey: 'TURA.LEGEND.TRACK', color: TRACK_COLOR, casing: TRACK_CASING_COLOR, width: 4 },
	];

	protected readonly points = [
		{ labelKey: 'TURA.LEGEND.START', src: iconDataUrl(ICON_START) },
		{ labelKey: 'TURA.LEGEND.END', src: iconDataUrl(ICON_END) },
		{ labelKey: 'TURA.LEGEND.DAY_BREAK', src: iconDataUrl(dayIconName(1)) },
		{ labelKey: 'TURA.LEGEND.WAYPOINT', src: iconDataUrl(ICON_WAYPOINT) },
		{ labelKey: 'TURA.LEGEND.MY_LOCATION', src: iconDataUrl(ICON_MY_LOCATION) },
	];

	protected readonly arrowSrc = iconDataUrl(ICON_ARROW_LIGHT);
	protected readonly routeColor = ROUTE_COLOR;
}

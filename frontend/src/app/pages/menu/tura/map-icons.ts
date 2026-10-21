import maplibregl from 'maplibre-gl';

/**
 * backlog/196, backlog/202, backlog/203 — a túra térkép pont-ikonjai, irány-nyilai és útvonal-feliratai.
 * Az alaptérkép-stílusnak nincs glyph-forrása (raszteres, kulcs nélküli csempék, offline is), ezért a
 * MapLibre `text-field` nem használható: minden jelölés canvasra rajzolt kép (`addImage`), a feliratok
 * is — így nincs új külső függőség, és offline is ugyanúgy látszik. A jelmagyarázat ugyanezeket a
 * képeket mutatja (`iconDataUrl`).
 */

/** A kép a képernyőn ennyiszeres felbontással készül, hogy élesen látszódjon. */
const PIXEL_RATIO = 2;

export const ROUTE_COLOR = '#d81b60';
export const ROUTE_CASING_COLOR = '#ffffff';
export const PREVIEW_COLOR = '#ffffff';
export const PREVIEW_CASING_COLOR = '#000000';
/** backlog/106 — a felvett nyomvonal narancs: nem MTSZ jelzésszín (a sárgától is elüt), és a magenta útvonalon is látszik. */
export const TRACK_COLOR = '#ef6c00';
export const TRACK_CASING_COLOR = '#ffffff';
const START_COLOR = '#2e7d32';
const DAY_COLOR = '#283593';
/** backlog/215 — a megszokott „itt vagy” kék, egyik turistajelzés kékjével sem azonos árnyalat. */
const MY_LOCATION_COLOR = '#1a73e8';

export const ICON_START = 'tura-start';
export const ICON_END = 'tura-end';
export const ICON_WAYPOINT = 'tura-waypoint';
export const ICON_ARROW_LIGHT = 'tura-arrow-light';
export const ICON_ARROW_DARK = 'tura-arrow-dark';
export const ICON_MY_LOCATION = 'tura-my-location';
const DAY_ICON_PREFIX = 'tura-day-';
const LABEL_ICON_PREFIX = 'tura-label:';

/** A napváltó ikonja: hold + a nap sorszáma (az N. nap vége). */
export function dayIconName(dayNumber: number): string {
	return `${DAY_ICON_PREFIX}${dayNumber}`;
}

/** Egy mentett útvonal nevének felirata a vonal mentén (backlog/202). */
export function labelIconName(text: string): string {
	return `${LABEL_ICON_PREFIX}${text}`;
}

type Draw = (ctx: CanvasRenderingContext2D, size: number) => void;

function canvas(width: number, height: number): CanvasRenderingContext2D {
	const element = document.createElement('canvas');
	element.width = width * PIXEL_RATIO;
	element.height = height * PIXEL_RATIO;
	const ctx = element.getContext('2d')!;
	ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
	return ctx;
}

function disc(ctx: CanvasRenderingContext2D, size: number, fill: string): void {
	ctx.beginPath();
	ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.lineWidth = 2;
	ctx.strokeStyle = '#ffffff';
	ctx.stroke();
}

const drawStart: Draw = (ctx, size) => {
	disc(ctx, size, START_COLOR);
	// „Indulás”: fehér lejátszás-háromszög — nyelvfüggetlen jel.
	ctx.beginPath();
	ctx.moveTo(size * 0.4, size * 0.3);
	ctx.lineTo(size * 0.72, size * 0.5);
	ctx.lineTo(size * 0.4, size * 0.7);
	ctx.closePath();
	ctx.fillStyle = '#ffffff';
	ctx.fill();
};

const drawEnd: Draw = (ctx, size) => {
	// „Cél”: sakktáblás korong — a célzászló nyelvfüggetlen jele.
	const radius = size / 2 - 2;
	ctx.save();
	ctx.beginPath();
	ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
	ctx.clip();
	const cells = 4;
	const cell = size / cells;
	for (let row = 0; row < cells; row++) {
		for (let col = 0; col < cells; col++) {
			ctx.fillStyle = (row + col) % 2 === 0 ? '#212121' : '#ffffff';
			ctx.fillRect(col * cell, row * cell, cell, cell);
		}
	}
	ctx.restore();
	ctx.beginPath();
	ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
	ctx.lineWidth = 2;
	ctx.strokeStyle = '#d32f2f';
	ctx.stroke();
};

const drawWaypoint: Draw = (ctx, size) => disc(ctx, size, ROUTE_COLOR);

const drawMyLocation: Draw = (ctx, size) => disc(ctx, size, MY_LOCATION_COLOR);

function drawArrow(color: string): Draw {
	return (ctx, size) => {
		// Jobbra mutató nyílhegy; a `symbol-placement: line` a vonal irányába forgatja.
		ctx.beginPath();
		ctx.moveTo(size * 0.3, size * 0.2);
		ctx.lineTo(size * 0.7, size * 0.5);
		ctx.lineTo(size * 0.3, size * 0.8);
		ctx.lineWidth = 2.5;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.strokeStyle = color;
		ctx.stroke();
	};
}

function drawDay(dayNumber: number): Draw {
	return (ctx, size) => {
		disc(ctx, size, DAY_COLOR);
		// Hold-sarló a bal felső negyedben, mellette a nap sorszáma.
		ctx.beginPath();
		ctx.arc(size * 0.36, size * 0.38, size * 0.16, 0, Math.PI * 2);
		ctx.fillStyle = '#ffeb3b';
		ctx.fill();
		ctx.beginPath();
		ctx.arc(size * 0.43, size * 0.32, size * 0.14, 0, Math.PI * 2);
		ctx.fillStyle = DAY_COLOR;
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		ctx.font = `bold ${Math.round(size * 0.42)}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(String(dayNumber), size * 0.62, size * 0.6);
	};
}

const ICON_SIZE = 26;
const ARROW_SIZE = 14;

const STATIC_ICONS: Readonly<Record<string, { size: number; draw: Draw }>> = {
	[ICON_START]: { size: ICON_SIZE, draw: drawStart },
	[ICON_END]: { size: ICON_SIZE, draw: drawEnd },
	[ICON_WAYPOINT]: { size: 14, draw: drawWaypoint },
	[ICON_MY_LOCATION]: { size: 20, draw: drawMyLocation },
	[ICON_ARROW_LIGHT]: { size: ARROW_SIZE, draw: drawArrow('#ffffff') },
	[ICON_ARROW_DARK]: { size: ARROW_SIZE, draw: drawArrow('#000000') },
};

function squareImage(size: number, draw: Draw): ImageData {
	const ctx = canvas(size, size);
	draw(ctx, size);
	return ctx.getImageData(0, 0, size * PIXEL_RATIO, size * PIXEL_RATIO);
}

/** Fehér kontúros, sötét felirat — az útvonal vonala mentén olvasható bármely alaptérképen. */
export function labelImage(text: string): ImageData {
	const fontSize = 13;
	const font = `600 ${fontSize}px sans-serif`;
	const measure = canvas(1, 1);
	measure.font = font;
	const width = Math.ceil(measure.measureText(text).width) + 8;
	const height = fontSize + 8;
	const ctx = canvas(width, height);
	ctx.font = font;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.lineJoin = 'round';
	ctx.lineWidth = 3;
	ctx.strokeStyle = '#ffffff';
	ctx.strokeText(text, width / 2, height / 2);
	ctx.fillStyle = '#880e4f';
	ctx.fillText(text, width / 2, height / 2);
	return ctx.getImageData(0, 0, width * PIXEL_RATIO, height * PIXEL_RATIO);
}

/** A névhez tartozó kép, vagy `null`, ha a név nem ehhez a modulhoz tartozik. */
export function iconImage(name: string): ImageData | null {
	const fixed = STATIC_ICONS[name];
	if (fixed) {
		return squareImage(fixed.size, fixed.draw);
	}
	if (name.startsWith(DAY_ICON_PREFIX)) {
		const dayNumber = Number(name.slice(DAY_ICON_PREFIX.length));
		return Number.isInteger(dayNumber) && dayNumber > 0 ? squareImage(ICON_SIZE, drawDay(dayNumber)) : null;
	}
	if (name.startsWith(LABEL_ICON_PREFIX)) {
		return labelImage(name.slice(LABEL_ICON_PREFIX.length));
	}
	return null;
}

/** A jelmagyarázat `<img>`-jéhez ugyanaz a kép, mint a térképen. */
export function iconDataUrl(name: string): string {
	const image = iconImage(name);
	if (image === null) {
		return '';
	}
	const ctx = canvas(image.width / PIXEL_RATIO, image.height / PIXEL_RATIO);
	ctx.putImageData(image, 0, 0);
	return ctx.canvas.toDataURL();
}

/**
 * A fix ikonok azonnal, a napváltó- és felirat-képek lustán, az első hivatkozáskor
 * (`styleimagemissing`) kerülnek a térképre.
 */
export function registerTuraMapIcons(map: maplibregl.Map): void {
	for (const name of Object.keys(STATIC_ICONS)) {
		if (!map.hasImage(name)) {
			map.addImage(name, iconImage(name)!, { pixelRatio: PIXEL_RATIO });
		}
	}
	map.on('styleimagemissing', (event: { id: string }) => {
		const image = iconImage(event.id);
		if (image !== null && !map.hasImage(event.id)) {
			map.addImage(event.id, image, { pixelRatio: PIXEL_RATIO });
		}
	});
}

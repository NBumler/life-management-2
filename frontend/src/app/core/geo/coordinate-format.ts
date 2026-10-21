/**
 * backlog/106 — a helyzet bemondható alakban (SOS): tizedes fokban és fok-perc-másodpercben.
 * A tizedes alak nyelvtől független („47.67851, 18.87889”: a diszpécser-rendszerek és a térképes
 * keresők ezt értik), a fok-perc-másodperc égtájai a nyelvé.
 */

/** Tizedesjegyek a tizedes alakban: 5 jegy ≈ 1 m, a GPS pontosságánál finomabb. */
const DECIMAL_DIGITS = 5;

export interface Hemispheres {
	north: string;
	south: string;
	east: string;
	west: string;
}

export function formatDecimalCoordinates(lat: number, lon: number): string {
	return `${lat.toFixed(DECIMAL_DIGITS)}, ${lon.toFixed(DECIMAL_DIGITS)}`;
}

/** „47°40′42.6″ É, 18°52′44.0″ K” — a másodperc egy tizedessel (≈ 3 m). */
export function formatDmsCoordinates(lat: number, lon: number, hemispheres: Hemispheres): string {
	return `${dms(lat)} ${lat < 0 ? hemispheres.south : hemispheres.north}, ${dms(lon)} ${lon < 0 ? hemispheres.west : hemispheres.east}`;
}

function dms(value: number): string {
	// tized-másodpercre kerekítve bontunk, így 59.96″ nem lesz „60.0″”, hanem a következő perc
	const tenths = Math.round(Math.abs(value) * 36000);
	const degrees = Math.floor(tenths / 36000);
	const minutes = Math.floor((tenths % 36000) / 600);
	const seconds = (tenths % 600) / 10;
	return `${degrees}°${minutes}′${seconds.toFixed(1)}″`;
}

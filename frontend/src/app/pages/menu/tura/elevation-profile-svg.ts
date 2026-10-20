import { ElevationProfilePoint } from '../../../api/model/elevationProfilePoint';
import { polylineLengthMeters } from '../../../core/geo/geo-math';

/**
 * backlog/tura-utvonaltervezo/103-... 2.3 fázis — a magassági profil mintapontjait egy fix
 * viewBox-méretű SVG `<polyline>` `points` attribútumává alakítja (nincs külön chart-könyvtár, egy
 * ilyen kis, statikus vonaldiagramhoz felesleges lenne).
 */
export function elevationProfilePolylinePoints(profile: readonly ElevationProfilePoint[], width: number, height: number): string {
	if (profile.length === 0) {
		return '';
	}
	const distances = profile.map((point) => point.distanceMeters);
	const elevations = profile.map((point) => point.elevationMeters);
	const minDistance = Math.min(...distances);
	const maxDistance = Math.max(...distances);
	const minElevation = Math.min(...elevations);
	const maxElevation = Math.max(...elevations);
	const distanceRange = maxDistance - minDistance || 1;
	const elevationRange = maxElevation - minElevation || 1;

	return profile
		.map((point) => {
			const x = ((point.distanceMeters - minDistance) / distanceRange) * width;
			const y = height - ((point.elevationMeters - minElevation) / elevationRange) * height;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(' ');
}

/** backlog/219 — a grafikon a feliratokkal: a magasság-sáv két vége, a teljes táv és a napváltók x-helye. */
export interface ElevationProfileChart {
	readonly points: string;
	readonly minElevationMeters: number;
	readonly maxElevationMeters: number;
	readonly totalDistanceMeters: number;
	/** A napváltók x-koordinátái a `width` széles sávban, növekvő sorrendben. */
	readonly markerXs: readonly number[];
}

export function elevationProfileChart(
	profile: readonly ElevationProfilePoint[],
	width: number,
	height: number,
	markerDistances: readonly number[] = [],
): ElevationProfileChart | null {
	if (profile.length === 0) {
		return null;
	}
	const distances = profile.map((point) => point.distanceMeters);
	const elevations = profile.map((point) => point.elevationMeters);
	const minDistance = Math.min(...distances);
	const distanceRange = Math.max(...distances) - minDistance || 1;
	return {
		points: elevationProfilePolylinePoints(profile, width, height),
		minElevationMeters: Math.min(...elevations),
		maxElevationMeters: Math.max(...elevations),
		totalDistanceMeters: Math.max(...distances),
		markerXs: markerDistances.map((distance) => Math.min(width, Math.max(0, ((distance - minDistance) / distanceRange) * width))),
	};
}

/** backlog/219 — a napváltó pontok távolsága az indulástól (a vonal mentén), a profil jelölőihez. */
export function distancesAlongRoute(coordinates: readonly (readonly number[])[], indexes: readonly number[]): number[] {
	return indexes.map((index) => polylineLengthMeters(coordinates.slice(0, index + 1)));
}

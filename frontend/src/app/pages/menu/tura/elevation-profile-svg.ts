import { ElevationProfilePoint } from '../../../api/model/elevationProfilePoint';

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

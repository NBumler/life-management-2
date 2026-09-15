package hu.bumler.lm2.tura;

/** Shared great-circle distance helper, used by {@link RouteSuggestionService} and {@link RouteMetricsService}. */
final class GeoUtils {

	private static final double EARTH_RADIUS_METERS = 6_371_000;

	private GeoUtils() {
	}

	static double haversineMeters(double lon1, double lat1, double lon2, double lat2) {
		double lat1Rad = Math.toRadians(lat1);
		double lat2Rad = Math.toRadians(lat2);
		double deltaLat = Math.toRadians(lat2 - lat1);
		double deltaLon = Math.toRadians(lon2 - lon1);
		double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
				+ Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return EARTH_RADIUS_METERS * c;
	}
}

package hu.bumler.lm2.tura;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import hu.bumler.lm2.common.exception.ValidationException;

/**
 * backlog/tura-utvonaltervezo/103-... 2.3 fázis — táv/idő/szintkülönbség-becslés egy útvonalhoz.
 * backlog/151 óta **csak az admin katalógus-upsert** ({@link CuratedRouteService}) használja, a
 * katalógus-sor denormalizált metrikáihoz; a felhasználói útvonalak metrikája a kliensen számolódik
 * (`frontend/.../core/geo/route-metrics.ts`, ugyanezekkel a konstansokkal — Backend-offline first §14). A táv a nyers waypointokból, a
 * magassági profil pedig egy egyenletesen elosztott mintasoron (ld. {@link #resample}) áll elő,
 * hogy egy sok pontból álló A*-útvonal se generáljon feleslegesen sok elevation API-hívást.
 */
@Service
class RouteMetricsService {

	/** Ennyi mintaponton kérjük le a magasságot az útvonal mentén, egyenletes távolság-elosztásban. */
	private static final int PROFILE_SAMPLE_COUNT = 50;

	/**
	 * A publikus elevation API mintavételezési zaja sík terepen is könnyen ingadozik pár méteren
	 * belül; e küszöb alatti lépéseket nem számítjuk bele a szintkülönbségbe, különben egy teljesen
	 * sík útvonal is jelentős (hamis) szintemelkedést/-csökkenést mutatna.
	 */
	private static final double ELEVATION_NOISE_THRESHOLD_METERS = 2.0;

	// Naismith-szabály: 12 perc/km haladási alapidő, plusz 1 perc minden 10 m szintemelkedésre
	// (azaz 600 m/óra emelkedési ütem) — a szokásos, könnyen ellenőrizhető gyalogos-időbecslés.
	private static final double MINUTES_PER_KILOMETER = 12.0;
	private static final double METERS_ASCENT_PER_MINUTE = 10.0;

	private final ElevationClient elevationClient;

	RouteMetricsService(ElevationClient elevationClient) {
		this.elevationClient = elevationClient;
	}

	/** A katalógus-sor denormalizált metrikái (a magassági profilt a katalógus nem tárolja). */
	record ComputedRouteMetrics(double distanceMeters, double elevationGainMeters, double elevationLossMeters,
			double estimatedDurationMinutes) {
	}

	ComputedRouteMetrics compute(List<double[]> coordinates) {
		if (coordinates == null || coordinates.size() < 2) {
			throw new ValidationException("Route needs at least 2 points", "coordinates");
		}

		double distanceMeters = totalDistance(coordinates);
		List<double[]> samples = resample(coordinates, distanceMeters);
		List<Double> elevations = elevationClient.fetchElevations(samples);

		double gain = 0;
		double loss = 0;
		double lastElevation = elevations.get(0);
		for (int i = 1; i < elevations.size(); i++) {
			double diff = elevations.get(i) - lastElevation;
			if (Math.abs(diff) >= ELEVATION_NOISE_THRESHOLD_METERS) {
				if (diff > 0) {
					gain += diff;
				} else {
					loss += -diff;
				}
				lastElevation = elevations.get(i);
			}
		}

		double durationMinutes = (distanceMeters / 1000.0) * MINUTES_PER_KILOMETER + gain / METERS_ASCENT_PER_MINUTE;

		return new ComputedRouteMetrics(distanceMeters, gain, loss, Math.round(durationMinutes));
	}

	private static double totalDistance(List<double[]> coordinates) {
		double distance = 0;
		for (int i = 1; i < coordinates.size(); i++) {
			double[] a = coordinates.get(i - 1);
			double[] b = coordinates.get(i);
			distance += GeoUtils.haversineMeters(a[0], a[1], b[0], b[1]);
		}
		return distance;
	}

	/**
	 * [lon, lat, distanceFromStartMeters] hármasok, a teljes úthosszon egyenletesen elosztva. A
	 * mintaszám mindig {@link #PROFILE_SAMPLE_COUNT} — szándékosan független a nyers waypointok
	 * számától, mert egy pár pontból álló, de hosszú kézi vonalnak ugyanúgy sűrű profil kell, mint
	 * egy sok csomópontos automatikusan generált útvonalnak.
	 */
	private static List<double[]> resample(List<double[]> coordinates, double totalDistanceMeters) {
		List<double[]> samples = new ArrayList<>(PROFILE_SAMPLE_COUNT);
		if (totalDistanceMeters == 0) {
			double[] point = coordinates.get(0);
			for (int i = 0; i < PROFILE_SAMPLE_COUNT; i++) {
				samples.add(new double[] { point[0], point[1], 0 });
			}
			return samples;
		}
		for (int i = 0; i < PROFILE_SAMPLE_COUNT; i++) {
			double targetDistance = totalDistanceMeters * i / (PROFILE_SAMPLE_COUNT - 1);
			samples.add(pointAtDistance(coordinates, targetDistance));
		}
		return samples;
	}

	private static double[] pointAtDistance(List<double[]> coordinates, double targetDistanceMeters) {
		double covered = 0;
		for (int i = 1; i < coordinates.size(); i++) {
			double[] a = coordinates.get(i - 1);
			double[] b = coordinates.get(i);
			double segmentLength = GeoUtils.haversineMeters(a[0], a[1], b[0], b[1]);
			if (covered + segmentLength >= targetDistanceMeters || i == coordinates.size() - 1) {
				double ratio = segmentLength == 0 ? 0 : Math.min(1, (targetDistanceMeters - covered) / segmentLength);
				double lon = a[0] + (b[0] - a[0]) * ratio;
				double lat = a[1] + (b[1] - a[1]) * ratio;
				return new double[] { lon, lat, targetDistanceMeters };
			}
			covered += segmentLength;
		}
		double[] last = coordinates.get(coordinates.size() - 1);
		return new double[] { last[0], last[1], targetDistanceMeters };
	}
}

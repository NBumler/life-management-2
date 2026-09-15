package hu.bumler.lm2.tura;

import java.util.List;

import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.RouteMetrics;
import hu.bumler.lm2.common.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

/**
 * backlog/tura-utvonaltervezo/103-... 2.3 fázis. Plain unit test (mirrors QuantityConverterTest
 * style — no Spring context, no Testcontainers): a szolgáltatás egyetlen külső függősége az
 * {@link ElevationClient}, amit itt egy kézzel írt stub helyettesít, hogy a teszt ne függjön a
 * valós Open-Meteo API-tól.
 */
class RouteMetricsServiceTest {

	@Test
	void computesDistanceAndFlatProfile_forATwoPointRouteWithNoElevationChange() {
		RouteMetricsService service = new RouteMetricsService(points -> points.stream().map(p -> 500.0).toList());

		// Kb. 1 fok szélességi kör Magyarország táján kb. 111 km — ez csak durva ellenőrzés a
		// haversine-számításra, nem pontos érték.
		RouteMetrics metrics = service.compute(List.of(new double[] { 19.0, 47.0 }, new double[] { 19.0, 47.01 }));

		assertThat(metrics.getDistanceMeters().doubleValue()).isCloseTo(1112.0, within(20.0));
		assertThat(metrics.getElevationGainMeters().doubleValue()).isZero();
		assertThat(metrics.getElevationLossMeters().doubleValue()).isZero();
		assertThat(metrics.getProfile()).isNotEmpty();
		assertThat(metrics.getProfile().get(0).getDistanceMeters().doubleValue()).isZero();
	}

	@Test
	void accumulatesGainAndLoss_ignoringDiffsBelowTheNoiseThreshold() {
		// A stub minden mintaponthoz felváltva 100 m és 105 m magasságot ad vissza (5 m-es lépések,
		// a zajszűrési küszöb (2 m) fölött), tehát minden második lépés szintemelkedés/-csökkenés.
		ElevationClient alternating = points -> {
			List<Double> elevations = new java.util.ArrayList<>();
			for (int i = 0; i < points.size(); i++) {
				elevations.add(i % 2 == 0 ? 100.0 : 105.0);
			}
			return elevations;
		};
		RouteMetricsService service = new RouteMetricsService(alternating);

		RouteMetrics metrics = service.compute(List.of(new double[] { 19.0, 47.0 }, new double[] { 19.0, 47.02 }));

		assertThat(metrics.getElevationGainMeters().doubleValue()).isGreaterThan(0);
		assertThat(metrics.getElevationLossMeters().doubleValue()).isGreaterThan(0);
		// Naismith: alap idő + emelkedési idő, mindkettő pozitív hozzájárulás.
		assertThat(metrics.getEstimatedDurationMinutes().doubleValue()).isGreaterThan(0);
	}

	@Test
	void ignoresNoise_whenElevationBarelyChangesBetweenSamples() {
		// 1 méteres véletlenszerű ingadozás a zajküszöb (2 m) alatt marad — sík útvonalként kezelendő.
		ElevationClient noisyFlat = points -> {
			List<Double> elevations = new java.util.ArrayList<>();
			for (int i = 0; i < points.size(); i++) {
				elevations.add(i % 2 == 0 ? 200.0 : 200.9);
			}
			return elevations;
		};
		RouteMetricsService service = new RouteMetricsService(noisyFlat);

		RouteMetrics metrics = service.compute(List.of(new double[] { 19.0, 47.0 }, new double[] { 19.0, 47.02 }));

		assertThat(metrics.getElevationGainMeters().doubleValue()).isZero();
		assertThat(metrics.getElevationLossMeters().doubleValue()).isZero();
	}

	@Test
	void rejectsFewerThanTwoPoints() {
		RouteMetricsService service = new RouteMetricsService(points -> List.of(0.0));

		assertThatThrownBy(() -> service.compute(List.of(new double[] { 19.0, 47.0 })))
				.isInstanceOf(ValidationException.class);
	}
}

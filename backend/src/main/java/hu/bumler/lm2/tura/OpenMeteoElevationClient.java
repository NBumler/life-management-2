package hu.bumler.lm2.tura;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import hu.bumler.lm2.common.exception.ElevationUnavailableException;

/**
 * backlog/tura-utvonaltervezo/103-... 2.3 fázis — magassági adat forrása: az Open-Meteo publikus,
 * ingyenes, kulcs nélküli elevation API-ja (https://open-meteo.com/en/docs/elevation-api). Online
 * módban ez egyszerű és elegendő; az offline DEM-alapú megoldás nyitott kérdés marad az offline
 * routing fázisra (ld. a terv "Mit nem döntünk el most" szakaszát).
 */
@Component
class OpenMeteoElevationClient implements ElevationClient {

	private static final String ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";

	/** A kérés URL-jének hossza korlátos; ennyi pontonként köteges lekérdezést indítunk. */
	private static final int BATCH_SIZE = 100;

	private final RestClient restClient = RestClient.create();

	@Override
	public List<Double> fetchElevations(List<double[]> points) {
		List<Double> elevations = new ArrayList<>(points.size());
		for (int start = 0; start < points.size(); start += BATCH_SIZE) {
			List<double[]> batch = points.subList(start, Math.min(start + BATCH_SIZE, points.size()));
			elevations.addAll(fetchBatch(batch));
		}
		return elevations;
	}

	private List<Double> fetchBatch(List<double[]> batch) {
		String latitudes = batch.stream().map(point -> String.valueOf(point[1])).collect(Collectors.joining(","));
		String longitudes = batch.stream().map(point -> String.valueOf(point[0])).collect(Collectors.joining(","));
		ElevationResponse response;
		try {
			response = restClient.get()
					.uri(ELEVATION_URL + "?latitude={lat}&longitude={lon}", latitudes, longitudes)
					.retrieve()
					.body(ElevationResponse.class);
		} catch (RestClientException ex) {
			throw new ElevationUnavailableException("Elevation lookup failed", ex);
		}
		if (response == null || response.elevation() == null || response.elevation().size() != batch.size()) {
			throw new ElevationUnavailableException("Unexpected elevation API response shape");
		}
		return response.elevation();
	}

	private record ElevationResponse(List<Double> elevation) {
	}
}

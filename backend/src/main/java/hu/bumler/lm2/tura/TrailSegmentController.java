package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.TuraApi;
import hu.bumler.lm2.api.model.RouteSuggestion;
import hu.bumler.lm2.api.model.TrailSegment;
import hu.bumler.lm2.api.model.TrailSegmentImportRequest;
import hu.bumler.lm2.api.model.TrailSegmentImportResponse;

/** backlog/tura-utvonaltervezo/103-... / 104-... — bbox lekérdezés + admin import + automatikus útvonal-javaslat, thin controller. */
@RestController
class TrailSegmentController implements TuraApi {

	private final TrailSegmentService service;
	private final RouteSuggestionService routeSuggestionService;

	TrailSegmentController(TrailSegmentService service, RouteSuggestionService routeSuggestionService) {
		this.service = service;
		this.routeSuggestionService = routeSuggestionService;
	}

	@Override
	public ResponseEntity<List<TrailSegment>> listTrailSegmentsInBbox(String country, BigDecimal minLon, BigDecimal minLat, BigDecimal maxLon,
			BigDecimal maxLat) {
		return ResponseEntity
				.ok(service.findInBbox(country, minLon.doubleValue(), minLat.doubleValue(), maxLon.doubleValue(), maxLat.doubleValue()));
	}

	@Override
	public ResponseEntity<TrailSegmentImportResponse> importTrailSegments(TrailSegmentImportRequest request) {
		int count = service.importSegments(request.getCountryCode(), request.getSegments());
		return ResponseEntity.ok(new TrailSegmentImportResponse(request.getCountryCode(), count));
	}

	@Override
	public ResponseEntity<RouteSuggestion> suggestRoute(String country, BigDecimal startLon, BigDecimal startLat, BigDecimal endLon,
			BigDecimal endLat) {
		return ResponseEntity.ok(routeSuggestionService.suggest(country, startLon.doubleValue(), startLat.doubleValue(),
				endLon.doubleValue(), endLat.doubleValue()));
	}
}

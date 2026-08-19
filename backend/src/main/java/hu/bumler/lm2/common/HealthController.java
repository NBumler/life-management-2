package hu.bumler.lm2.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.HealthApi;
import hu.bumler.lm2.api.model.HealthResponse;

/** documentation/Architektúra/Backend.md: publikus, DB-kör nélküli, konstans válasz. */
@RestController
class HealthController implements HealthApi {

	@Override
	public ResponseEntity<HealthResponse> getHealth() {
		return ResponseEntity.ok(new HealthResponse("UP"));
	}
}

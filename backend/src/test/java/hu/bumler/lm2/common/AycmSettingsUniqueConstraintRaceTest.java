package hu.bumler.lm2.common;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.ApiError;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Mirror of {@link ProfileUniqueConstraintRaceTest} for the AYCM settings singleton:
 * {@code idx_aycm_settings_user_id} (V28) enforces one row per user, and
 * {@code AycmSettingsService.upsert}'s {@code findByUserId} pre-check cannot stop two overlapping
 * first-write upserts (each with its own client-supplied id) from both attempting an INSERT. The
 * DB-level outcome is deterministic regardless of interleaving; what matters is that the resulting
 * {@link DataIntegrityViolationException} is mapped to a well-formed {@code 409 UNIQUE_VIOLATION}
 * by {@link GlobalExceptionHandler} rather than falling through to the generic {@code 500} — that
 * mapping (index name → {@code userId}) is what this test guards.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class AycmSettingsUniqueConstraintRaceTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	private final GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

	@Test
	void secondSettingsRow_forSameUser_violatesUniqueIndex_regardlessOfClientSuppliedId() {
		UUID userId = createUser();
		insertSettingsRow(UUID.randomUUID(), userId);

		assertThatThrownBy(() -> insertSettingsRow(UUID.randomUUID(), userId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void raceOutcome_isReportedAs409UniqueViolation_notAnUnmapped500() {
		UUID userId = createUser();
		insertSettingsRow(UUID.randomUUID(), userId);

		DataIntegrityViolationException raceOutcome = catchDataIntegrityViolation(
				() -> insertSettingsRow(UUID.randomUUID(), userId));

		ResponseEntity<ApiError> response = exceptionHandler.handleUniqueConstraint(raceOutcome);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		ApiError body = response.getBody();
		assertThat(body.getCode()).isEqualTo("UNIQUE_VIOLATION");
		assertThat(body.getField().orElse(null)).isEqualTo("userId");
	}

	private static DataIntegrityViolationException catchDataIntegrityViolation(Runnable action) {
		try {
			action.run();
		} catch (DataIntegrityViolationException e) {
			return e;
		}
		throw new AssertionError("Expected a DataIntegrityViolationException but none was thrown");
	}

	private void insertSettingsRow(UUID id, UUID userId) {
		jdbcTemplate.update("INSERT INTO aycm_settings (id, user_id) VALUES (?, ?)", id, userId);
	}

	private UUID createUser() {
		UUID userId = UUID.randomUUID();
		jdbcTemplate.update("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", userId,
				"aycm-race-" + userId.toString().substring(0, 8), "unused-hash");
		return userId;
	}
}

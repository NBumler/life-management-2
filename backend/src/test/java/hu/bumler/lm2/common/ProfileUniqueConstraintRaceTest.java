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
 * Covers the "eldöntendő apróság" from the review: {@code idx_user_profile_user_id} (V3
 * migration) enforces at most one live {@code user_profile} row per user. {@code
 * ProfileService.upsert} guards against this with a {@code findByUserId} pre-check before insert,
 * but two overlapping {@code upsert()} calls for the same user that both observe "no row yet"
 * before either commits would both attempt an INSERT — Postgres lets at most one win.
 *
 * <p>This test reproduces the DB-level outcome of that race with two plain, sequential JDBC
 * inserts rather than orchestrating two real overlapping transactions with thread
 * synchronization. That is a deliberate choice, not a shortcut: regardless of the exact
 * interleaving, at most one of the two inserts can ever commit — Postgres serializes concurrent
 * inserts into a unique index and fails the loser — so a genuine two-thread race test would only
 * exercise timing, not new behavior, while being inherently more flaky for no extra assurance.
 * What actually matters, and what a thread race could not demonstrate any better, is that the
 * resulting {@link DataIntegrityViolationException} is mapped to a well-formed {@code
 * 409 UNIQUE_VIOLATION} by {@link GlobalExceptionHandler} instead of falling through to the
 * generic {@code 500} fallback — that mapping is the actual fix this test guards.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class ProfileUniqueConstraintRaceTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	private final GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

	@Test
	void secondProfileRow_forSameUser_violatesUniqueIndex_regardlessOfClientSuppliedId() {
		UUID userId = createUser();
		insertProfileRow(UUID.randomUUID(), userId);

		// A second row for the same user, with a different (client-supplied) id — exactly what two
		// racing upsert() calls that both missed each other's uncommitted insert would produce.
		assertThatThrownBy(() -> insertProfileRow(UUID.randomUUID(), userId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void raceOutcome_isReportedAs409UniqueViolation_notAnUnmapped500() {
		UUID userId = createUser();
		insertProfileRow(UUID.randomUUID(), userId);

		DataIntegrityViolationException raceOutcome = catchDataIntegrityViolation(
				() -> insertProfileRow(UUID.randomUUID(), userId));

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

	private void insertProfileRow(UUID id, UUID userId) {
		jdbcTemplate.update("INSERT INTO user_profile (id, user_id) VALUES (?, ?)", id, userId);
	}

	private UUID createUser() {
		UUID userId = UUID.randomUUID();
		// username is varchar(32) — keep well under that with just a short random suffix.
		jdbcTemplate.update("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", userId,
				"race-" + userId.toString().substring(0, 8), "unused-hash");
		return userId;
	}
}

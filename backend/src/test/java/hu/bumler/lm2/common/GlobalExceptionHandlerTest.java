package hu.bumler.lm2.common;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import hu.bumler.lm2.api.model.ApiError;
import hu.bumler.lm2.common.exception.CursorTooOldException;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UnauthorizedException;
import hu.bumler.lm2.common.exception.UniqueViolationException;
import hu.bumler.lm2.common.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Every {@code @ExceptionHandler} method called directly — no Spring MVC needed
 * (spring-boot-conventions testing.md: plain unit test, no Spring context).
 */
class GlobalExceptionHandlerTest {

	private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

	@Test
	void handleNotFound_returns404WithNotFoundCode() {
		ResponseEntity<ApiError> response = handler.handleNotFound(new EntityNotFoundException("no such thing"));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(response.getBody().getCode()).isEqualTo("NOT_FOUND");
		assertThat(response.getBody().getMessage()).isEqualTo("no such thing");
	}

	@Test
	void handleDeleted_returns409WithEntityDeletedCode() {
		ResponseEntity<ApiError> response = handler.handleDeleted(new EntityDeletedException("already gone"));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(response.getBody().getCode()).isEqualTo("ENTITY_DELETED");
	}

	@Test
	void handleUniqueViolation_returns409WithFieldAndConflictingId() {
		UUID conflictingId = UUID.randomUUID();
		ResponseEntity<ApiError> response = handler
				.handleUniqueViolation(new UniqueViolationException("dup", "username", conflictingId));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		ApiError body = response.getBody();
		assertThat(body.getCode()).isEqualTo("UNIQUE_VIOLATION");
		assertThat(body.getField().orElse(null)).isEqualTo("username");
		assertThat(body.getConflictingId().orElse(null)).isEqualTo(conflictingId);
	}

	@Test
	void handleUniqueViolation_omitsConflictingId_whenNotSupplied() {
		ResponseEntity<ApiError> response = handler.handleUniqueViolation(new UniqueViolationException("dup", "username", null));

		assertThat(response.getBody().getConflictingId().isPresent()).isFalse();
	}

	@Test
	void handleCursorTooOld_returns410WithCursorTooOldCode() {
		ResponseEntity<ApiError> response = handler.handleCursorTooOld(new CursorTooOldException("stale"));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.GONE);
		assertThat(response.getBody().getCode()).isEqualTo("CURSOR_TOO_OLD");
	}

	@Test
	void handleUnauthorized_returns401WithUnauthorizedCode() {
		ResponseEntity<ApiError> response = handler.handleUnauthorized(new UnauthorizedException("nope"));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(response.getBody().getCode()).isEqualTo("UNAUTHORIZED");
	}

	@Test
	void handleValidation_domainException_returns400WithFieldFromException() {
		ResponseEntity<ApiError> response = handler
				.handleValidation(new ValidationException("kgPerWeek is required", "kgPerWeek"));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		ApiError body = response.getBody();
		assertThat(body.getCode()).isEqualTo("VALIDATION_ERROR");
		assertThat(body.getField().orElse(null)).isEqualTo("kgPerWeek");
	}

	@Test
	void handleValidation_beanValidation_extractsFirstFieldErrorFromBindingResult() {
		BindingResult bindingResult = mock(BindingResult.class);
		FieldError fieldError = new FieldError("userProfile", "heightCm", "must be between 100 and 250");
		when(bindingResult.getFieldError()).thenReturn(fieldError);
		MethodArgumentNotValidException ex = new MethodArgumentNotValidException(dummyMethodParameter(), bindingResult);

		ResponseEntity<ApiError> response = handler.handleValidation(ex);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		ApiError body = response.getBody();
		assertThat(body.getCode()).isEqualTo("VALIDATION_ERROR");
		assertThat(body.getMessage()).isEqualTo("must be between 100 and 250");
		assertThat(body.getField().orElse(null)).isEqualTo("heightCm");
	}

	@Test
	void handleValidation_beanValidation_fallsBackToGenericMessage_whenNoFieldErrorPresent() {
		BindingResult bindingResult = mock(BindingResult.class);
		when(bindingResult.getFieldError()).thenReturn(null);
		MethodArgumentNotValidException ex = new MethodArgumentNotValidException(dummyMethodParameter(), bindingResult);

		ResponseEntity<ApiError> response = handler.handleValidation(ex);

		ApiError body = response.getBody();
		assertThat(body.getMessage()).isEqualTo("Validation failed");
		assertThat(body.getField().isPresent()).isFalse();
	}

	/**
	 * A real {@link MethodParameter} (not a mock) — {@link MethodArgumentNotValidException}'s
	 * constructor calls {@code parameter.getExecutable()} while building its own default message,
	 * which NPEs against an unstubbed mock. Backing it with an actual reflected method sidesteps
	 * that without needing to stub Spring-internal plumbing that isn't under test here.
	 */
	private static MethodParameter dummyMethodParameter() {
		try {
			return new MethodParameter(GlobalExceptionHandlerTest.class.getDeclaredMethod("dummyTarget", String.class),
					0);
		} catch (NoSuchMethodException e) {
			throw new IllegalStateException(e);
		}
	}

	@SuppressWarnings("unused")
	private static void dummyTarget(String ignored) {
	}

	@Test
	void handleUnexpected_returns500_withoutLeakingExceptionMessage() {
		ResponseEntity<ApiError> response = handler
				.handleUnexpected(new RuntimeException("connection refused at db.internal:5432"));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
		ApiError body = response.getBody();
		assertThat(body.getCode()).isEqualTo("INTERNAL_ERROR");
		assertThat(body.getMessage()).isEqualTo("Unexpected error");
		assertThat(body.getMessage()).doesNotContain("db.internal");
	}

	@Test
	void handleUniqueConstraint_mapsKnownUsernameIndexTo409WithField() {
		DataIntegrityViolationException ex = postgresUniqueViolation("idx_users_username");

		ResponseEntity<ApiError> response = handler.handleUniqueConstraint(ex);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		ApiError body = response.getBody();
		assertThat(body.getCode()).isEqualTo("UNIQUE_VIOLATION");
		assertThat(body.getField().orElse(null)).isEqualTo("username");
	}

	@Test
	void handleUniqueConstraint_mapsUserProfileUserIdIndexTo409WithField() {
		// The one-profile-per-user invariant (V3 migration's idx_user_profile_user_id) — the
		// defensive mapping added alongside the ownership fix so a same-user upsert race
		// degrades to a client-actionable 409 instead of the unmapped 500 fallback.
		DataIntegrityViolationException ex = postgresUniqueViolation("idx_user_profile_user_id");

		ResponseEntity<ApiError> response = handler.handleUniqueConstraint(ex);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(response.getBody().getField().orElse(null)).isEqualTo("userId");
	}

	@Test
	void handleUniqueConstraint_fallsBackTo500_forUnmappedConstraintName() {
		DataIntegrityViolationException ex = postgresUniqueViolation("idx_some_future_unmapped_constraint");

		ResponseEntity<ApiError> response = handler.handleUniqueConstraint(ex);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
		assertThat(response.getBody().getCode()).isEqualTo("INTERNAL_ERROR");
	}

	@Test
	void handleUniqueConstraint_fallsBackTo500_whenCauseMessageHasNoConstraintMarker() {
		DataIntegrityViolationException ex = new DataIntegrityViolationException("insert failed",
				new RuntimeException("some unrelated driver error with no constraint name in it"));

		ResponseEntity<ApiError> response = handler.handleUniqueConstraint(ex);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
	}

	private static DataIntegrityViolationException postgresUniqueViolation(String constraintName) {
		// Mirrors org.postgresql.util.PSQLException's message shape closely enough for
		// extractConstraintName's substring search — GlobalExceptionHandler matches on message
		// text rather than a hard dependency on the postgresql-driver class.
		String message = "ERROR: duplicate key value violates unique constraint \"" + constraintName + "\"\n"
				+ "  Detail: Key already exists.";
		return new DataIntegrityViolationException("could not execute statement", new RuntimeException(message));
	}
}

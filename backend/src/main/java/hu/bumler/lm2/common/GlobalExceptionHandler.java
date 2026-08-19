package hu.bumler.lm2.common;

import java.util.Map;

import hu.bumler.lm2.api.model.ApiError;
import hu.bumler.lm2.common.exception.CursorTooOldException;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UnauthorizedException;
import hu.bumler.lm2.common.exception.UniqueViolationException;
import hu.bumler.lm2.common.exception.ValidationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * documentation/Architektúra/Backend.md "Hibakezelés": egy globális handler, stabil `code`
 * minden válaszon (a kliens ebből fordít — Nyelv választás.md), soha nincs stack trace a 500-nál.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	// documentation/Architektúra/Backend.md "Postgres 23505 (unique violation) elkapva → 409 +
	// UNIQUE_VIOLATION + a field; az index-név → mező leképezés a common csomagban egy helyen él."
	// Single source of truth for every DB-level unique index added across features; extend as
	// new named-uniqueness constraints (Névegyediség scopes) are introduced.
	private static final Map<String, String> UNIQUE_INDEX_TO_FIELD = Map.of(
			"idx_users_username", "username");

	@ExceptionHandler(DataIntegrityViolationException.class)
	ResponseEntity<ApiError> handleUniqueConstraint(DataIntegrityViolationException ex) {
		String constraintName = extractConstraintName(ex);
		String field = UNIQUE_INDEX_TO_FIELD.get(constraintName);
		if (field == null) {
			return ResponseEntity.internalServerError().body(new ApiError("INTERNAL_ERROR", "Unexpected error"));
		}
		return ResponseEntity.status(HttpStatus.CONFLICT)
				.body(new ApiError("UNIQUE_VIOLATION", "Value already in use").field(field));
	}

	private static String extractConstraintName(DataIntegrityViolationException ex) {
		Throwable cause = ex.getMostSpecificCause();
		// org.postgresql.util.PSQLException#getServerErrorMessage().getConstraint(), matched by
		// message rather than a hard dependency on the postgresql-driver class here.
		String message = cause.getMessage();
		int marker = message.indexOf("constraint \"");
		if (marker < 0) {
			return "";
		}
		int start = marker + "constraint \"".length();
		int end = message.indexOf('"', start);
		return end < 0 ? "" : message.substring(start, end);
	}

	@ExceptionHandler(EntityNotFoundException.class)
	ResponseEntity<ApiError> handleNotFound(EntityNotFoundException ex) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("NOT_FOUND", ex.getMessage()));
	}

	@ExceptionHandler(EntityDeletedException.class)
	ResponseEntity<ApiError> handleDeleted(EntityDeletedException ex) {
		return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("ENTITY_DELETED", ex.getMessage()));
	}

	@ExceptionHandler(UniqueViolationException.class)
	ResponseEntity<ApiError> handleUniqueViolation(UniqueViolationException ex) {
		ApiError body = new ApiError("UNIQUE_VIOLATION", ex.getMessage()).field(ex.getField());
		if (ex.getConflictingId() != null) {
			body = body.conflictingId(ex.getConflictingId());
		}
		return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
	}

	@ExceptionHandler(CursorTooOldException.class)
	ResponseEntity<ApiError> handleCursorTooOld(CursorTooOldException ex) {
		return ResponseEntity.status(HttpStatus.GONE).body(new ApiError("CURSOR_TOO_OLD", ex.getMessage()));
	}

	@ExceptionHandler(UnauthorizedException.class)
	ResponseEntity<ApiError> handleUnauthorized(UnauthorizedException ex) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("UNAUTHORIZED", ex.getMessage()));
	}

	@ExceptionHandler(ValidationException.class)
	ResponseEntity<ApiError> handleValidation(ValidationException ex) {
		return ResponseEntity.badRequest()
				.body(new ApiError("VALIDATION_ERROR", ex.getMessage()).field(ex.getField()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
		FieldError fieldError = ex.getBindingResult().getFieldError();
		String message = fieldError != null ? fieldError.getDefaultMessage() : "Validation failed";
		ApiError body = new ApiError("VALIDATION_ERROR", message != null ? message : "Validation failed");
		if (fieldError != null) {
			body = body.field(fieldError.getField());
		}
		return ResponseEntity.badRequest().body(body);
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ApiError> handleUnexpected(Exception ex) {
		return ResponseEntity.internalServerError().body(new ApiError("INTERNAL_ERROR", "Unexpected error"));
	}
}

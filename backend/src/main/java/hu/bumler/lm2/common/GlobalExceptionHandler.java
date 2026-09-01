package hu.bumler.lm2.common;

import java.util.Map;

import hu.bumler.lm2.api.model.ApiError;
import hu.bumler.lm2.common.exception.CursorTooOldException;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UnauthorizedException;
import hu.bumler.lm2.common.exception.UniqueViolationException;
import hu.bumler.lm2.common.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	// documentation/Architektúra/Backend.md "Postgres 23505 (unique violation) elkapva → 409 +
	// UNIQUE_VIOLATION + a field; az index-név → mező leképezés a common csomagban egy helyen él."
	// Single source of truth for every DB-level unique index added across features; extend as
	// new named-uniqueness constraints (Névegyediség scopes) are introduced.
	//
	// idx_user_profile_user_id (V3 migration) is not a Névegyediség scope, but it is a real
	// DB-enforced invariant (1 profile row per user) that ProfileService.upsert's findByUserId
	// pre-check cannot fully guard against: two overlapping upsert() calls for the same user that
	// both read "no row yet" before either commits will both attempt an INSERT, and Postgres lets
	// at most one of them win. Without this mapping that race would fall through to the generic
	// 500 fallback below instead of the client-actionable 409 the rest of the contract promises.
	// See ProfileUniqueConstraintRaceTest for the reasoning on why a real two-thread race isn't
	// simulated here (the DB-level outcome is deterministic regardless of interleaving).
	// idx_gear_item_user_id_name_normalized (V6 migration, documentation/Architektúra/Névegyediség.md
	// scope): a real Névegyediség uniqueness constraint. GearItemService.applyName pre-checks this
	// same scope before saving, so this mapping is only the safety net for a genuine multi-device
	// race — see the comment above for why the fallback (rather than 500) matters.
	// idx_household_room_user_id_name_normalized / idx_household_task_room_id_name_normalized
	// (V10 migration): same Névegyediség pattern — room name unique per user, task name unique per
	// room (not per user) — pre-checked in HouseholdRoomService / HouseholdTaskService.applyName.
	// idx_recipe_name_normalized (V14 migration): recipe name is, unlike Food, a real global
	// Névegyediség scope on its own — pre-checked in RecipeService.applyName.
	// idx_recipe_ingredient_recipe_food (V14 migration): "ugyanaz az élelmiszer kétszer... tiltott"
	// within one recipe — enforced purely at the DB level (no app-level pre-check), same reasoning
	// as idx_packing_template_item_template_gear above.
	private static final Map<String, String> UNIQUE_INDEX_TO_FIELD = Map.ofEntries(
			Map.entry("idx_users_username", "username"),
			Map.entry("idx_user_profile_user_id", "userId"),
			Map.entry("idx_gear_item_user_id_name_normalized", "name"),
			Map.entry("idx_packing_template_user_id_name_normalized", "name"),
			Map.entry("idx_packing_template_item_template_gear", "gearItemId"),
			Map.entry("idx_packing_session_item_session_gear", "gearItemId"),
			Map.entry("idx_household_room_user_id_name_normalized", "name"),
			Map.entry("idx_household_task_room_id_name_normalized", "name"),
			Map.entry("idx_recipe_name_normalized", "name"),
			Map.entry("idx_recipe_ingredient_recipe_food", "foodId"),
			// idx_aycm_partner_user_id_name_normalized (V26): AYCM venue name unique per user
			// (Névegyediség) — pre-checked in AycmPartnerService.applyFields.
			Map.entry("idx_aycm_partner_user_id_name_normalized", "name"),
			// idx_aycm_check_in_user_id_check_in_date (V27): at most one live Check-In per user per
			// calendar day — pre-checked in AycmCheckInService.applyFields.
			Map.entry("idx_aycm_check_in_user_id_check_in_date", "checkInDate"),
			// idx_aycm_settings_user_id (V28): the 1-settings-row-per-user singleton invariant, same
			// as idx_user_profile_user_id above — AycmSettingsService.upsert's findByUserId pre-check
			// cannot stop two overlapping first-write upserts from both attempting an INSERT.
			Map.entry("idx_aycm_settings_user_id", "userId"));

	@ExceptionHandler(DataIntegrityViolationException.class)
	ResponseEntity<ApiError> handleUniqueConstraint(DataIntegrityViolationException ex) {
		String constraintName = extractConstraintName(ex);
		String field = UNIQUE_INDEX_TO_FIELD.get(constraintName);
		if (field == null) {
			log.error("Unmapped unique constraint violation: constraint=\"{}\"", constraintName, ex);
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
		log.error("Unhandled exception", ex);
		return ResponseEntity.internalServerError().body(new ApiError("INTERNAL_ERROR", "Unexpected error"));
	}
}

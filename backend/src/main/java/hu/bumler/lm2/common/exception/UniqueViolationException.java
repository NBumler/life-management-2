package hu.bumler.lm2.common.exception;

import java.util.UUID;

public class UniqueViolationException extends RuntimeException {

	private final String field;
	private final UUID conflictingId;

	public UniqueViolationException(String message, String field, UUID conflictingId) {
		super(message);
		this.field = field;
		this.conflictingId = conflictingId;
	}

	public String getField() {
		return field;
	}

	public UUID getConflictingId() {
		return conflictingId;
	}
}

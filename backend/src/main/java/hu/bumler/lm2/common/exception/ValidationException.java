package hu.bumler.lm2.common.exception;

/** Cross-field business validation that plain bean-validation annotations can't express. */
public class ValidationException extends RuntimeException {

	private final String field;

	public ValidationException(String message, String field) {
		super(message);
		this.field = field;
	}

	public String getField() {
		return field;
	}
}

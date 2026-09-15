package hu.bumler.lm2.common.exception;

public class ElevationUnavailableException extends RuntimeException {

	public ElevationUnavailableException(String message) {
		super(message);
	}

	public ElevationUnavailableException(String message, Throwable cause) {
		super(message, cause);
	}
}

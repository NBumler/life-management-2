package hu.bumler.lm2.common.exception;

/** A bbox-alapú lekérdezés területe túl nagy (backlog/180) — 400 `BBOX_TOO_LARGE`. */
public class BboxTooLargeException extends RuntimeException {

	public BboxTooLargeException(String message) {
		super(message);
	}
}

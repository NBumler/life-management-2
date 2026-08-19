package hu.bumler.lm2.common.exception;

/** Bad credentials / invalid or expired refresh token — deliberately vague message (auth spec: don't reveal which). */
public class UnauthorizedException extends RuntimeException {

	public UnauthorizedException(String message) {
		super(message);
	}
}

package hu.bumler.lm2.workout;

import java.math.BigDecimal;

import hu.bumler.lm2.common.exception.ValidationException;

/**
 * Field rules shared by a template target set ({@code WorkoutPlanSet}) and a logged set
 * ({@code WorkoutSetEntry}) that the OpenAPI schema alone can't express.
 */
final class WorkoutSetRules {

	private static final BigDecimal TWO = BigDecimal.valueOf(2);

	private WorkoutSetRules() {
	}

	/**
	 * backlog/135 — RPE is 6–10 in 0.5 steps. The range is also in the spec (bean validation), the step
	 * isn't expressible there; the V49 CHECK would otherwise surface it as a 500.
	 */
	static BigDecimal validRpe(BigDecimal rpe) {
		if (rpe == null) {
			return null;
		}
		boolean inRange = rpe.compareTo(BigDecimal.valueOf(6)) >= 0 && rpe.compareTo(BigDecimal.TEN) <= 0;
		boolean halfStep = rpe.multiply(TWO).stripTrailingZeros().scale() <= 0;
		if (!inRange || !halfStep) {
			throw new ValidationException("rpe must be between 6 and 10 in 0.5 steps", "rpe");
		}
		return rpe;
	}
}

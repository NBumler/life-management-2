package hu.bumler.lm2.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * documentation/Architektúra/Mennyiség mező.md "Kanonikus egység és konverzió": canonical
 * base-unit conversion used only for equality comparison (e.g. the Food field-set duplicate check
 * in documentation/Architektúra/Névegyediség.md — {@code 1 l} = {@code 100 cl}). Never used for
 * date arithmetic (see the spec's warning about {@code hó}/{@code év} being fixed-day
 * approximations).
 *
 * The multiplier tables below are the same numbers as shared/fixtures/quantity-conversion.json —
 * that fixture is the parity SSOT; QuantityConverterTest asserts this table matches it exactly, and
 * the frontend's quantity.ts carries the identical table, checked the same way.
 */
public final class QuantityConverter {

	public enum Family {
		WEIGHT, VOLUME, PIECE, TIME
	}

	/**
	 * documentation/Architektúra/Mennyiség mező.md "Kanonikus egyenlőség": equality compares the
	 * canonical amounts scaled to this many decimal places (HALF_UP), so a fraction input's rounding
	 * ({@code 1/6 → 0.1667}) never yields a false "not equal". Mirrors the frontend's
	 * {@code EQUALITY_DECIMAL_SCALE} (quantity.ts) and the shared fixture's {@code equalityDecimalScale}.
	 */
	public static final int EQUALITY_DECIMAL_SCALE = 4;

	private static final Map<String, BigDecimal> WEIGHT_MULTIPLIERS = Map.of(
			"g", BigDecimal.valueOf(1),
			"dkg", BigDecimal.valueOf(10),
			"kg", BigDecimal.valueOf(1000));

	private static final Map<String, BigDecimal> VOLUME_MULTIPLIERS = Map.of(
			"ml", BigDecimal.valueOf(1),
			"cl", BigDecimal.valueOf(10),
			"dl", BigDecimal.valueOf(100),
			"l", BigDecimal.valueOf(1000));

	private static final Map<String, BigDecimal> PIECE_MULTIPLIERS = Map.of("cs", BigDecimal.valueOf(1));

	private static final Map<String, BigDecimal> DURATION_MULTIPLIERS = Map.of(
			"perc", BigDecimal.valueOf(1),
			"óra", BigDecimal.valueOf(60),
			"nap", BigDecimal.valueOf(1440),
			"hét", BigDecimal.valueOf(10080),
			"hó", BigDecimal.valueOf(43200),
			"év", BigDecimal.valueOf(525600));

	private QuantityConverter() {
	}

	/** {@code null} for a unit outside the fixed quantity unit set (cs, g, dkg, kg, l, dl, cl, ml). */
	public static Family quantityFamily(String unit) {
		if (PIECE_MULTIPLIERS.containsKey(unit)) {
			return Family.PIECE;
		}
		if (WEIGHT_MULTIPLIERS.containsKey(unit)) {
			return Family.WEIGHT;
		}
		if (VOLUME_MULTIPLIERS.containsKey(unit)) {
			return Family.VOLUME;
		}
		return null;
	}

	/** Canonical base-unit amount (grams / millilitres / cs) for a {@code quantity}-mode value, or {@code null} for an unknown unit. */
	public static BigDecimal canonicalQuantityAmount(BigDecimal amount, String unit) {
		Family family = quantityFamily(unit);
		if (family == null) {
			return null;
		}
		Map<String, BigDecimal> multipliers = switch (family) {
			case WEIGHT -> WEIGHT_MULTIPLIERS;
			case VOLUME -> VOLUME_MULTIPLIERS;
			case PIECE -> PIECE_MULTIPLIERS;
			case TIME -> throw new IllegalStateException("unreachable");
		};
		return amount.multiply(multipliers.get(unit));
	}

	/** Canonical base-unit amount (perc) for a {@code duration}-mode value, or {@code null} for an unknown unit. */
	public static BigDecimal canonicalDurationAmount(BigDecimal amount, String unit) {
		BigDecimal multiplier = DURATION_MULTIPLIERS.get(unit);
		return multiplier == null ? null : amount.multiply(multiplier);
	}

	/**
	 * Two {@code quantity}-mode values are equal only if their unit families match (weight / volume /
	 * piece never compare equal to each other, even with numerically equal {@code amount}) and their
	 * canonical amounts match exactly. Both {@code null} (no value) counts as equal.
	 */
	public static boolean quantitiesEqual(BigDecimal amountA, String unitA, BigDecimal amountB, String unitB) {
		if (amountA == null || unitA == null || amountB == null || unitB == null) {
			return amountA == null && unitA == null && amountB == null && unitB == null;
		}
		Family familyA = quantityFamily(unitA);
		Family familyB = quantityFamily(unitB);
		if (familyA == null || familyA != familyB) {
			return false;
		}
		return scaledEqual(canonicalQuantityAmount(amountA, unitA), canonicalQuantityAmount(amountB, unitB));
	}

	/** Canonical amounts are equal iff they match once scaled to {@link #EQUALITY_DECIMAL_SCALE} places (HALF_UP). */
	private static boolean scaledEqual(BigDecimal a, BigDecimal b) {
		return a.setScale(EQUALITY_DECIMAL_SCALE, RoundingMode.HALF_UP)
				.compareTo(b.setScale(EQUALITY_DECIMAL_SCALE, RoundingMode.HALF_UP)) == 0;
	}

	/** Same as {@link #quantitiesEqual}, for {@code duration}-mode values (single family, so no family check needed). */
	public static boolean durationsEqual(BigDecimal amountA, String unitA, BigDecimal amountB, String unitB) {
		if (amountA == null || unitA == null || amountB == null || unitB == null) {
			return amountA == null && unitA == null && amountB == null && unitB == null;
		}
		BigDecimal canonicalA = canonicalDurationAmount(amountA, unitA);
		BigDecimal canonicalB = canonicalDurationAmount(amountB, unitB);
		return canonicalA != null && canonicalB != null && scaledEqual(canonicalA, canonicalB);
	}

	static Map<String, BigDecimal> weightMultipliers() {
		return WEIGHT_MULTIPLIERS;
	}

	static Map<String, BigDecimal> volumeMultipliers() {
		return VOLUME_MULTIPLIERS;
	}

	static Map<String, BigDecimal> pieceMultipliers() {
		return PIECE_MULTIPLIERS;
	}

	static Map<String, BigDecimal> durationMultipliers() {
		return DURATION_MULTIPLIERS;
	}
}

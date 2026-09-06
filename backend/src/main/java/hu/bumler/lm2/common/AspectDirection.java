package hu.bumler.lm2.common;

/**
 * backlog/068 — the 8-wind compass "fekvés" (aspect) of a climbing sector / route / logged session.
 * Persisted as its {@link #name() token} (`N`..`NW`) in the plain-text {@code aspect} /
 * {@code default_aspect} columns; the OpenAPI schema and a DB CHECK pin the same eight values, and
 * {@code null} means "unknown / not given" (there is no {@code UNKNOWN} member).
 *
 * <p>Guidebooks give the aspect directly as a compass point, so the value normally <em>is</em> the
 * enum. {@link #fromDegrees(double)} exists for the other source — a phone-compass bearing — and its
 * binning is pinned bit-for-bit against the frontend ({@code frontend/src/app/shared/aspect.ts}) by
 * {@code shared/fixtures/aspect-degrees.json} (see {@code AspectDirectionTest}).
 */
public enum AspectDirection {

	N, NE, E, SE, S, SW, W, NW;

	private static final double WEDGE_DEGREES = 360.0 / 8;

	/** The cardinal degree this direction points at ({@code N} → 0, {@code NE} → 45, …). */
	public double centerDegrees() {
		return ordinal() * WEDGE_DEGREES;
	}

	/**
	 * Bin a compass bearing (degrees clockwise from North, any sign / magnitude) into one of the eight
	 * directions. The lower boundary of a wedge rounds <em>up</em> into it — exactly 22.5° is
	 * {@code NE}, not {@code N}.
	 */
	public static AspectDirection fromDegrees(double degrees) {
		double normalized = ((degrees % 360) + 360) % 360;
		int index = (int) Math.floor((normalized + WEDGE_DEGREES / 2) / WEDGE_DEGREES) % values().length;
		return values()[index];
	}

	/** Parse a stored token, tolerating null / blank / unknown as {@code null}. */
	public static AspectDirection fromTokenOrNull(String token) {
		if (token == null || token.isBlank()) {
			return null;
		}
		try {
			return valueOf(token.trim());
		} catch (IllegalArgumentException ex) {
			return null;
		}
	}
}

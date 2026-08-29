package hu.bumler.lm2.common;

import java.util.Locale;

/**
 * documentation/Subfeatures/Indoor boulder admin.md + documentation/Architektúra/Névegyediség.md —
 * canonical form of a CSS hex colour for the "unique among a gym's live colour bands" check: trim →
 * locale-independent lowercase → drop a leading {@code #} → expand a 3-digit short form to 6 digits →
 * re-prepend {@code #}. Pure and lenient like {@link NameNormalizer} / {@link BarcodeNormalizer};
 * shape validation (must be 3 or 6 hex digits) is done at the OpenAPI boundary, not here.
 *
 * Client parity is mandatory (an offline save must not "succeed" locally and then 409 at sync
 * time): both sides are tested against the single fixture list,
 * shared/fixtures/hex-color-normalization.json.
 */
public final class HexColorNormalizer {

	private HexColorNormalizer() {
	}

	public static String normalize(String input) {
		String s = input.trim().toLowerCase(Locale.ROOT);
		if (s.startsWith("#")) {
			s = s.substring(1);
		}
		if (s.length() == 3) {
			StringBuilder expanded = new StringBuilder(6);
			for (int i = 0; i < 3; i++) {
				expanded.append(s.charAt(i)).append(s.charAt(i));
			}
			s = expanded.toString();
		}
		return "#" + s;
	}
}

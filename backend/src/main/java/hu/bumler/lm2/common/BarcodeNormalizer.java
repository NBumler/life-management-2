package hu.bumler.lm2.common;

import java.util.regex.Pattern;

/**
 * documentation/Architektúra/Névegyediség.md "Mezőhalmaz-egyediség (Food)": barcode comparison for
 * the Food field-set duplicate check — trim, strip every non-digit character (hyphens, spaces),
 * keep leading zeros. Empty input normalizes to empty (not equal to a missing/null barcode unless
 * both are empty).
 *
 * Client parity is mandatory: both sides are tested against the single fixture list,
 * shared/fixtures/barcode-normalization.json.
 */
public final class BarcodeNormalizer {

	private static final Pattern NON_DIGIT = Pattern.compile("[^0-9]");

	private BarcodeNormalizer() {
	}

	public static String normalize(String input) {
		if (input == null) {
			return "";
		}
		return NON_DIGIT.matcher(input.trim()).replaceAll("");
	}
}

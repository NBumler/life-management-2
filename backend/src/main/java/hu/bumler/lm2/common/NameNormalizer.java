package hu.bumler.lm2.common;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * documentation/Architektúra/Névegyediség.md `normalizeName`: NFC → collapse every whitespace run
 * (including U+00A0) to a single regular space, trimming leading/trailing runs as a side effect →
 * locale-independent lowercase. Accents are intentionally kept (unlike search folding — see
 * hu.bumler.lm2.common.TextSearch, which must NOT reuse this for uniqueness checks).
 *
 * Client parity is mandatory (an offline save must not "succeed" locally and then 409 at sync
 * time): both sides are tested against the single fixture list, shared/fixtures/name-normalization.json.
 */
public final class NameNormalizer {

	private static final Pattern WHITESPACE_RUN = Pattern.compile("[\\s\\u00A0]+");

	private NameNormalizer() {
	}

	public static String normalize(String input) {
		String nfc = Normalizer.normalize(input, Normalizer.Form.NFC);
		String collapsed = WHITESPACE_RUN.matcher(nfc).replaceAll(" ").trim();
		return collapsed.toLowerCase(Locale.ROOT);
	}
}

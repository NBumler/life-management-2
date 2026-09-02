package hu.bumler.lm2.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * documentation/Architektúra/Mennyiség mező.md: the conversion table is a single common table run
 * on both sides, not a separate Java + TS constant list — so instead of per-case fixture rows (like
 * NameNormalizerTest), this test asserts QuantityConverter's hardcoded multiplier maps are exactly
 * the shared/fixtures/quantity-conversion.json table, then exercises the equality semantics built on
 * top of it. The frontend's quantity.spec.ts does the same structural assertion against the same file.
 */
class QuantityConverterTest {

	private static final Path FIXTURE_PATH = Path.of("..", "shared", "fixtures", "quantity-conversion.json");

	@Test
	void multiplierTablesMatchTheSharedFixtureExactly() throws IOException {
		ObjectMapper mapper = new ObjectMapper();
		JsonNode root = mapper.readTree(Files.readAllBytes(FIXTURE_PATH));

		assertThat(toMap(root.at("/quantity/weight/multipliers"))).isEqualTo(QuantityConverter.weightMultipliers());
		assertThat(toMap(root.at("/quantity/volume/multipliers"))).isEqualTo(QuantityConverter.volumeMultipliers());
		assertThat(toMap(root.at("/quantity/piece/multipliers"))).isEqualTo(QuantityConverter.pieceMultipliers());
		assertThat(toMap(root.at("/duration/time/multipliers"))).isEqualTo(QuantityConverter.durationMultipliers());
	}

	@Test
	void oneLiterEqualsOneHundredCentiliters() {
		assertThat(QuantityConverter.quantitiesEqual(BigDecimal.ONE, "l", BigDecimal.valueOf(100), "cl")).isTrue();
	}

	@Test
	void numericallyEqualAmountsInDifferentFamiliesAreNeverEqual() {
		// documentation/Architektúra/Mennyiség mező.md: "egy 3cs és egy 3g érték soha nem egyenlő".
		assertThat(QuantityConverter.quantitiesEqual(BigDecimal.valueOf(3), "cs", BigDecimal.valueOf(3), "g")).isFalse();
	}

	@Test
	void bothMissingCountsAsEqual() {
		assertThat(QuantityConverter.quantitiesEqual(null, null, null, null)).isTrue();
		assertThat(QuantityConverter.durationsEqual(null, null, null, null)).isTrue();
	}

	@Test
	void twoWeeksEqualsFourteenDays() {
		assertThat(QuantityConverter.durationsEqual(BigDecimal.valueOf(2), "hét", BigDecimal.valueOf(14), "nap")).isTrue();
	}

	private static Map<String, BigDecimal> toMap(JsonNode node) {
		Map<String, BigDecimal> result = new java.util.HashMap<>();
		node.fields().forEachRemaining(entry -> result.put(entry.getKey(), new BigDecimal(entry.getValue().asText())));
		return result;
	}
}

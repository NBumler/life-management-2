package hu.bumler.lm2.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Client/server parity fixture (documentation/Architektúra/Névegyediség.md "Megjegyzések"):
 * shared/fixtures/name-normalization.json is the single source of truth, read directly from the
 * repo root (not copied into test resources) so a new edge case only needs one new fixture row,
 * exercised by both this test and the frontend's nameNormalization.spec.ts.
 */
class NameNormalizerTest {

	private static final Path FIXTURE_PATH = Path.of("..", "shared", "fixtures", "name-normalization.json");

	@ParameterizedTest(name = "{0}")
	@MethodSource("fixtureCases")
	void normalizesPerFixture(String description, String input, String expected) {
		assertThat(NameNormalizer.normalize(input)).as(description).isEqualTo(expected);
	}

	@Test
	void distinguishesAccentedFromUnaccented() {
		// Névegyediség.md: unlike search, the accent is NOT folded for uniqueness.
		assertThat(NameNormalizer.normalize("Sör")).isNotEqualTo(NameNormalizer.normalize("Sor"));
	}

	static List<Object[]> fixtureCases() throws IOException {
		record FixtureCase(String description, String input, String expected) {
		}
		ObjectMapper mapper = new ObjectMapper();
		List<FixtureCase> cases = mapper.readValue(Files.readAllBytes(FIXTURE_PATH),
				mapper.getTypeFactory().constructCollectionType(List.class, FixtureCase.class));
		return cases.stream().map(c -> new Object[] { c.description(), c.input(), c.expected() }).toList();
	}
}

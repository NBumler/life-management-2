package hu.bumler.lm2.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * backlog/068 — parity check for the compass-degree → aspect binning against
 * {@code shared/fixtures/aspect-degrees.json}; the frontend's {@code aspect.spec.ts} reads the same
 * file. Adding an edge case means adding a fixture row, not a one-off assertion here.
 */
class AspectDirectionTest {

	private static final Path FIXTURE_PATH = Path.of("..", "shared", "fixtures", "aspect-degrees.json");

	@Test
	void degreeBinningMatchesTheSharedFixture() throws IOException {
		JsonNode root = new ObjectMapper().readTree(Files.readAllBytes(FIXTURE_PATH));

		for (JsonNode row : root.get("toAspect")) {
			double degrees = row.get("degrees").asDouble();
			AspectDirection expected = AspectDirection.valueOf(row.get("aspect").asText());
			assertThat(AspectDirection.fromDegrees(degrees))
					.as("%s° bins to %s", degrees, expected)
					.isEqualTo(expected);
		}
	}

	@Test
	void centerDegreesMatchTheSharedFixture() throws IOException {
		JsonNode root = new ObjectMapper().readTree(Files.readAllBytes(FIXTURE_PATH));

		for (JsonNode row : root.get("centerDegrees")) {
			AspectDirection direction = AspectDirection.valueOf(row.get("aspect").asText());
			assertThat(direction.centerDegrees()).isEqualTo(row.get("degrees").asDouble());
		}
	}

	@Test
	void everyDirectionRoundTripsThroughItsCenterDegree() {
		for (AspectDirection direction : AspectDirection.values()) {
			assertThat(AspectDirection.fromDegrees(direction.centerDegrees())).isEqualTo(direction);
		}
	}

	@Test
	void fromTokenToleratesNullBlankAndUnknown() {
		assertThat(AspectDirection.fromTokenOrNull(null)).isNull();
		assertThat(AspectDirection.fromTokenOrNull("  ")).isNull();
		assertThat(AspectDirection.fromTokenOrNull("north")).isNull();
		assertThat(AspectDirection.fromTokenOrNull(" NE ")).isEqualTo(AspectDirection.NE);
	}
}
